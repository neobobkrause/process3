// merge train (Bob, 5 Nov; notes/merge-train-trial.md on the coordinator's branch): the merger's
// one long-running act. It forms a batch of every merge-ready pull request into the tranche, each
// held to the per-PR checks merge holds (jobChecks, mergePlain's checks), builds one train/
// branch on the tranche with each member its own merge commit (a job's carrying its merge and cost
// rows, as merge writes them), gates it once through its own pull request, and lands it by
// GitHub's merge of that pull request. Why that route: a session may not push to the tranche, and
// the tranche's ruleset wants a pull request with a green gate; a member's head is then in the
// tranche, so GitHub shows its pull request merged, and process-record runs once on the push. A
// red batch is bisected by halves, each gated, the passing part landed, the culprit reported. Each
// batch writes one row on the state branch (metrics/train.jsonl), the trial's measures.
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { checkRun, checkRuns, comments, createPR, editPR, getPR, openPRs, requiredChecks, verifyRow } from './github.mjs';
import { branchModule, ledgerIds } from './ledger.mjs';
import { appendRow, metricsFile, readRows, rowsAt } from './metrics.mjs';
import { READY_NEXT } from './job.mjs';
import { GATE_WAIT_MINUTES, firstActs, jobChecks, jobCostOf, jobCostRow, mergePR, mergePlain, mergeRetry, noticeStep, processRepo, reviewMeasures, reviewRounds, triageLast, triageStep, waitForGate } from './merge.mjs';
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { Fail, fail, git, loadConfig, now, repoSlug, withTemp } from './util.mjs';

export const TRAIN_FILE = 'metrics/train.jsonl';
export const NOTES_FILE = 'metrics/train-notes.jsonl';
export const MERGER_FILE = 'metrics/merger.jsonl';
export const BASELINE = { median: 11.0, worst: 85 }; // green -> merged, minutes, 4-5 Nov
export const TRAIN_NO_REVIEW = 'merge train: no review recorded, and no review trigger fired';
const MIN = 60000;
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const mins = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / MIN * 10) / 10;
const median = (xs) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const append = (wt, path, row) => { mkdirSync(dirname(join(wt, path)), { recursive: true }); appendFileSync(join(wt, path), JSON.stringify(row) + '\n'); };

// merge train note <pr>: the review (and the job's cost) a member merges with, as merge's flags
// give them, recorded for the head the pull request has now. A review-triggered pull request
// joins the train only with a --reviewed note for its current head.
export function trainNote(root, n, opts = {}) {
  const { log = console.log } = opts;
  const io = { getPR, ...(opts.io || {}) };
  const rounds = reviewRounds(opts);
  const measures = reviewMeasures(opts);
  const cost = jobCostOf(opts.jobCostUsd);
  const cfg = loadConfig(root);
  const pr = io.getPR(opts.slug || repoSlug(root), n);
  if (pr.state !== 'open' || pr.base?.ref !== cfg.tranche) fail(`pull request ${n} is not open into ${cfg.tranche}`);
  const row = { at: now(), row: 'note', pr: Number(n), sha: pr.head.sha, reviewed: opts.reviewed || null, no_review: opts.noReview || null, rounds: rounds.rounds, decision: rounds.decision, ...measures, job_cost_usd: cost, job_session: opts.jobSession || null };
  writeState(root, cfg.state_branch, `merge train note for PR ${n}`, (wt) => append(wt, NOTES_FILE, row));
  log(`merge train note for PR ${n} at ${pr.head.sha.slice(0, 10)}: ${row.reviewed ? `reviewed (${row.rounds} round(s))` : `no review: ${row.no_review}`}`);
  return row;
}

// One candidate: { ok: true, m } or { ok: false, why, sync }. Read-only; nothing waits here but
// GitHub's mergeable flag (waitMergeable, as merge reads it).
function candidate(root, ctx, p) {
  const { cfg, slug, io, log } = ctx;
  const n = p.number;
  const no = (why, sync = false) => ({ ok: false, why, sync });
  if (p.draft) return no('a draft');
  if (p.base?.ref !== cfg.tranche) return no(`into ${p.base?.ref}, not the tranche`);
  if (/^train\//.test(p.head?.ref || '')) return no('a train batch');
  if (p.head?.repo?.full_name && p.head.repo.full_name !== slug) return no(`from ${p.head.repo.full_name}`);
  const green = io.checkRun(slug, p.head.sha, 'gate');
  if (green?.status !== 'completed') return no(`its gate is ${green ? green.status : 'not started'}`);
  if (green.conclusion !== 'success') return no(`its gate is ${green.conclusion}`);
  const note = ctx.notes.filter((x) => x.pr === n && x.sha === p.head.sha).pop();
  const review = note ? { reviewed: note.reviewed || undefined, noReview: note.no_review || undefined, rounds: note.rounds || undefined, decision: note.decision || undefined, reviewMinutes: note.review_minutes ?? undefined, findings: note.findings ?? undefined, actedOn: note.findings_acted ?? undefined, ...(typeof note.review_usd === 'number' ? { reviewCostUsd: note.review_usd } : {}) } : { noReview: TRAIN_NO_REVIEW };
  const base = { n, head: p.head.sha, ref: p.head.ref, green_at: green.completed_at, review };
  try {
    const rounds = reviewRounds(review);
    const pr = io.getPR(slug, n);
    if (pr.head?.sha !== p.head.sha) return no('its head moved while it was read');
    const id = branchModule(pr.head.ref, ledgerIds(root, `origin/${cfg.tranche}`));
    if (id) {
      const c = jobChecks(root, n, pr, id, { cfg, slug, io, noReview: review.noReview, log, mergeableEvery: ctx.mergeableEvery });
      return { ok: true, m: { ...base, kind: 'job', id, c, rounds, measures: reviewMeasures(review), cost: jobCostOf(note?.job_cost_usd ?? undefined), session: note?.job_session || null } };
    }
    const r = mergePlain(root, n, { ...review, slug, io: ctx.plainIO, checkOnly: true, mergeableEvery: ctx.mergeableEvery, log });
    // A refresh is judged by a gate on the base as it is, a workflow change by a close against
    // GitHub's merge of its own pull request: both merge alone, with merge --plain.
    if (r.refreshed.length || r.workflows.length) return no(`it changes ${r.refreshed.length ? 'generated module files' : 'workflow files'}: merge it alone with merge --plain`);
    const red = r.states.filter(([, st]) => st !== 'success');
    if (red.length) return no(`required checks not green: ${red.map(([c, st]) => `${c} ${st}`).join(', ')}`);
    return { ok: true, m: { ...base, kind: 'plain', rounds } };
  } catch (e) {
    if (!(e instanceof Fail)) throw e;
    return no(e.message.split('\n')[0], /conflicts with|bring itself up to date/.test(e.message));
  }
}

// The ready members, oldest green first; refusals are read again only when the pull request's
// head, the tranche or its notes change. Each refusal is logged once per head.
export function scan(root, ctx, { skip = new Set() } = {}) {
  const { cfg, slug, io, log } = ctx;
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root });
  const tranche = git(['rev-parse', `origin/${cfg.tranche}`], { cwd: root });
  if (fetchState(root, cfg.state_branch, { fresh: true })) ctx.notes = jsonl(readState(root, cfg.state_branch, NOTES_FILE));
  const open = io.openPRs(slug, cfg.tranche);
  if (!open) fail(`could not read the pull requests into ${cfg.tranche}`);
  const ready = [];
  for (const p of open) {
    if (skip.has(p.number) || ctx.culprits.has(`${p.number}@${p.head?.sha}`)) continue;
    const key = `${p.number}@${p.head?.sha}@${tranche}@${ctx.notes.filter((x) => x.pr === p.number).length}`;
    if (ctx.refused.has(key)) continue;
    const c = candidate(root, ctx, p);
    if (c.ok) { ready.push(c.m); continue; }
    if (/^its gate is (queued|in_progress|waiting|pending|requested|not started)/.test(c.why)) continue; // read again next round
    ctx.refused.add(key);
    if (!/^(a draft|a train batch)$/.test(c.why)) log(`PR ${p.number} waits: ${c.why}`);
    if (c.sync) tell(ctx, p.number, p.head.ref, `PR ${p.number} conflicts with ${cfg.tranche}: bring the job up to date (job sync), then job complete again`);
  }
  return ready.sort((a, b) => String(a.green_at).localeCompare(String(b.green_at)));
}

// What the merger hands on: one line for BOB (and the job's session, by its latest start row).
function tell(ctx, n, ref, text) {
  const id = branchModule(ref);
  let session = null;
  if (id) { try { session = rowsAt(ctx.root, `origin/${ref}`, id).filter((r) => r.event === 'start').pop()?.session || null; } catch { session = null; } }
  ctx.log(`TELL ${id ? `job ${id}${session ? ` (session ${session})` : ''}` : 'BOB'}: ${text}`);
  ctx.told.push({ pr: n, to: id ? `job ${id}` : 'bob', session, text });
}

// One batch branch, train/<stamp>, on the tranche as origin has it: each member merged --no-ff
// in order, a job's merge commit carrying its cost and merge rows. A member that does not merge
// cleanly waits (and its job is told to sync when it conflicts with the tranche itself).
export function build(root, ctx, members, label) {
  const { cfg, log } = ctx;
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root });
  return withTemp('p3-train-', (tmp) => {
    const wt = join(tmp, 'b');
    git(['worktree', 'add', '-q', '--detach', wt, `origin/${cfg.tranche}`], { cwd: root });
    const base = git(['rev-parse', 'HEAD'], { cwd: wt });
    const landed = [];
    const waiting = [];
    for (const m of members) {
      if (git(['merge-base', '--is-ancestor', m.head, 'HEAD'], { cwd: wt, allowFail: true }).code === 0) { waiting.push({ pr: m.n, why: 'already in the tranche' }); continue; }
      if (git(['merge', '-q', '--no-ff', '--no-commit', m.head], { cwd: wt, allowFail: true }).code !== 0) {
        git(['merge', '--abort'], { cwd: wt, allowFail: true });
        const alone = git(['merge-tree', '--write-tree', base, m.head], { cwd: wt, allowFail: true }).code !== 0;
        waiting.push({ pr: m.n, why: alone ? `conflicts with ${cfg.tranche}` : 'conflicts with another member' });
        if (alone) tell(ctx, m.n, m.ref, `PR ${m.n} conflicts with ${cfg.tranche}: bring the job up to date (job sync), then job complete again`);
        else log(`PR ${m.n} conflicts with another member of ${label}; it waits for the next batch`);
        continue;
      }
      const review = m.review.reviewed || m.review.noReview;
      if (m.kind === 'job') {
        const rows = readRows(wt, m.id);
        // One merge row per pull request since its last receipt, as merge writes it.
        if (!rows.slice(rows.findLastIndex((r) => r.event === 'complete') + 1).some((r) => r.row === 'merge' && r.pr === m.n)) {
          const done = rows.filter((r) => r.event === 'complete').pop();
          jobCostRow(wt, m.id, rows, { cost: m.cost, session: m.session, attempt: m.c.receipt.attempt, log });
          appendRow(wt, m.id, {
            row: 'merge', pr: m.n, reviewed: !!m.review.reviewed, review, review_rounds: m.rounds.rounds, ...(m.rounds.decision ? { decision: m.rounds.decision } : {}),
            triggers: m.c.trig.fired, ...m.measures, minutes_from_complete: done ? Math.round((Date.now() - Date.parse(done.at)) / MIN) : null, train: label,
          });
          git(['add', '--', metricsFile(m.id)], { cwd: wt });
        }
      }
      const title = m.kind === 'job' ? `Merge job PR ${m.n}` : `Merge PR ${m.n}: ${m.ref} into ${cfg.tranche}`;
      git(['commit', '-q', '--no-edit', '-m', title, '-m', `${m.review.reviewed ? `Reviewed: ${m.review.reviewed}` : `No review: ${m.review.noReview}`}\nReview rounds: ${m.rounds.rounds}\nMerge train: ${label}`], { cwd: wt });
      landed.push({ ...m, merge: git(['rev-parse', 'HEAD'], { cwd: wt }) });
    }
    const tip = git(['rev-parse', 'HEAD'], { cwd: wt });
    if (landed.length) git(['push', '-q', 'origin', `HEAD:refs/heads/${label}`], { cwd: wt });
    return { base, tip, members: landed, waiting };
  }, { root });
}

// Gate a built batch through its own pull request into the tranche; the pre-scan for the next
// batch runs when this gate nears its expected end.
function gateBatch(root, ctx, b, label) {
  const { cfg, slug, io, log } = ctx;
  const tpr = io.createPR(slug, { head: label, base: cfg.tranche, draft: false, title: `Merge train: PRs ${b.members.map((m) => m.n).join(', ')}`, body: `The merge train's batch ${label}: ${b.members.map((m) => `#${m.n}`).join(', ')}, each its own merge commit on ${cfg.tranche} at ${b.base.slice(0, 10)}. Merged only by the merge train.` });
  const started = Date.now();
  const expect = ctx.expected() * MIN;
  const tick = (l) => {
    log(l);
    if (ctx.pre === null && ctx.pipeline && Date.now() - started >= expect - ctx.lead * MIN) {
      try { ctx.pre = scan(root, ctx, { skip: new Set(b.members.map((m) => m.n)) }); log(`next batch formed while this gate runs: ${ctx.pre.map((m) => m.n).join(', ') || 'none ready'}`); } catch (e) { if (!(e instanceof Fail)) throw e; log(`the next batch could not be formed yet: ${e.message}`); }
    }
  };
  let run;
  try { run = waitForGate(slug, b.tip, { minutes: ctx.minutes, every: ctx.every, read: io.checkRun, pr: () => io.getPR(slug, tpr.number), log: tick }); } catch (e) {
    if (!(e instanceof Fail)) throw e;
    run = { conclusion: 'error', html_url: null, error: e.message };
  }
  const g = { pr: tpr.number, prs: b.members.map((m) => m.n), start: run.started_at || new Date(started).toISOString(), end: run.completed_at || now(), conclusion: run.conclusion, url: run.html_url || null };
  g.minutes = mins(g.start, g.end);
  ctx.durations.push(g.minutes);
  return g;
}

// Lands a green batch: every member still open at the head it was checked at, the tranche still
// the batch's base; GitHub's merge of the train pull request pinned to the gated tip.
function landBatch(root, ctx, b, g) {
  const { cfg, slug, io, log } = ctx;
  const fetch = () => git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root, allowFail: true });
  const holds = () => {
    for (const m of b.members) {
      const p = io.getPR(slug, m.n);
      if (p.state !== 'open' || p.head?.sha !== m.head || p.base?.ref !== cfg.tranche) fail(`member PR ${m.n} changed while the batch was gated; the batch is formed again`);
    }
    const t = io.getPR(slug, g.pr);
    if (t.state !== 'open' || t.base?.ref !== cfg.tranche || t.head?.sha !== b.tip) fail(`train PR ${g.pr} changed while it was gated`);
    if (git(['merge-base', '--is-ancestor', `refs/remotes/origin/${cfg.tranche}`, b.tip], { cwd: root, allowFail: true }).code !== 0) fail(`${cfg.tranche} moved past the batch the gate checked; the batch is formed again`);
  };
  fetch();
  holds();
  const r = mergeRetry(() => io.mergePR(slug, g.pr, b.tip, { title: `Merge train PR ${g.pr}`, message: b.members.map((m) => `PR ${m.n} (${m.kind === 'job' ? m.id : m.ref})`).join('\n') }), {
    log, wait: ctx.wait, reread: { read: () => io.getPR(slug, g.pr), sha: b.tip }, fetch, check: holds,
  });
  if (!r?.merged) fail(`GitHub did not merge train PR ${g.pr}: ${r?.message || 'no result'}`);
  const at = now();
  log(`merged train PR ${g.pr} at ${r.sha} (${at}): ${b.members.map((m) => `PR ${m.n}`).join(', ')}`);
  fetch();
  return b.members.map((m) => {
    let state = 'unread';
    try { const p = io.getPR(slug, m.n); state = p.merged ? 'merged' : p.state; } catch { state = 'unread'; }
    if (state !== 'merged') log(`note: GitHub shows PR ${m.n} ${state} after its batch landed; its head ${m.head.slice(0, 10)} is in ${cfg.tranche}`);
    // The provider-change route, per job member, as merge runs it; the merge stands either way.
    let triage = null;
    if (m.kind === 'job') {
      try {
        const notes = noticeStep(root, cfg, { id: m.id, n: m.n, mb: m.c.mb, head: m.head, at: m.merge, entry: m.c.baseEntry, log });
        triage = triageStep(root, cfg, notes, { ref: m.merge, log });
        const first = firstActs(triage);
        if (first.length > 1) log(first[0]);
        if (!String(triage?.why || '').startsWith('none to run')) log(triageLast(triage));
      } catch (e) { if (!(e instanceof Fail)) throw e; log(`the merge of PR ${m.n} stands; its notices were not recorded (${e.message}): merge ${m.n} records them`); }
    }
    return { pr: m.n, at, waited_min: mins(m.green_at, at), merge: m.merge, github: state };
  });
}

// Gate, then land or bisect by halves: each half gated on the tranche as it then is.
function runBatch(root, ctx, members, row, depth = 0) {
  const label = `train/${now().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-')}-${++ctx.seq}`;
  const b = build(root, ctx, members, label);
  row.waiting.push(...b.waiting);
  if (!b.members.length) return;
  if (depth === 0) row.tranche = b.base;
  const g = gateBatch(root, ctx, b, label);
  row.gates.push(g);
  if (g.conclusion === 'success') {
    try { row.merged.push(...landBatch(root, ctx, b, g)); return; } catch (e) {
      if (!(e instanceof Fail)) throw e;
      ctx.log(`batch ${label} not landed: ${e.message}`);
      row.waiting.push(...b.members.map((m) => ({ pr: m.n, why: e.message })));
      closeTrain(ctx, g.pr);
      return;
    }
  }
  closeTrain(ctx, g.pr);
  if (g.conclusion === 'error') { row.error = g.error || 'the gate did not finish'; return; }
  if (b.members.length === 1) {
    const m = b.members[0];
    ctx.culprits.add(`${m.n}@${m.head}`);
    row.culprits.push({ pr: m.n, head: m.head, run: g.url });
    tell(ctx, m.n, m.ref, `PR ${m.n} at ${m.head.slice(0, 10)} fails the gate merged with ${ctx.cfg.tranche} (merge train ${label}): ${g.url}. Fix it and job complete again; the train takes it at its next head`);
    return;
  }
  const half = Math.ceil(b.members.length / 2);
  ctx.log(`batch ${label} is red (${g.url}): bisecting ${b.members.length} members`);
  runBatch(root, ctx, b.members.slice(0, half), row, depth + 1);
  runBatch(root, ctx, b.members.slice(half), row, depth + 1);
}
const closeTrain = (ctx, n) => { try { ctx.io.editPR(ctx.slug, n, { state: 'closed' }); } catch (e) { if (!(e instanceof Fail)) throw e; ctx.log(`train PR ${n} not closed: ${e.message}`); } };

// One batch from the ready members: formed, gated (bisected if red), landed, and its row written.
export function batch(root, ctx, ready) {
  const row = { at: now(), row: 'batch', session: ctx.session, members: ready.map((m) => ({ pr: m.n, kind: m.kind, ...(m.id ? { module: m.id } : {}), head: m.head, green_at: m.green_at })), gates: [], merged: [], culprits: [], waiting: [] };
  ctx.told = [];
  try { runBatch(root, ctx, ready, row); } catch (e) {
    if (!(e instanceof Fail)) throw e;
    row.error = e.message;
    ctx.log(`the batch stopped: ${e.message}`);
  }
  if (row.merged.length) tell(ctx, null, '', `merged PR${row.merged.length > 1 ? 's' : ''} ${row.merged.map((x) => x.pr).join(', ')}: BOB's ${READY_NEXT}`);
  row.result = row.merged.length === row.members.length ? 'merged' : row.merged.length ? 'partial' : row.gates.length ? 'failed' : 'none';
  row.bisection_gates = Math.max(0, row.gates.length - 1);
  row.told = ctx.told;
  let tries = 0;
  writeState(root, ctx.cfg.state_branch, `merge train: ${row.result}, ${row.merged.length} of ${row.members.length}`, (wt) => { tries++; append(wt, TRAIN_FILE, { ...row, push_tries: tries }); });
  row.push_tries = tries;
  ctx.rows.push(row);
  ctx.log(`batch: ${row.result}; merged ${row.merged.map((x) => x.pr).join(', ') || 'none'}; ${row.gates.length} gate run(s)${row.culprits.length ? `; culprit ${row.culprits.map((c) => c.pr).join(', ')}` : ''}`);
  return row;
}

// merge train [--once]: the loop. Refused in a session other than the addressed merger, so two
// trains never run at once. --once forms and lands one batch (tests, a manual run).
export function train(root, opts = {}) {
  const { once = false, log = console.log, every = 15000, idleEvery = 15000, beatMinutes = 10 } = opts;
  const cfg = loadConfig(root);
  const slug = opts.slug || repoSlug(root);
  const io = { getPR, comments, checkRun, mergePR, openPRs, createPR, editPR, verify: (s, r, c) => verifyRow(s, r, c), ...(opts.io || {}) };
  if (!cfg.tranche || cfg.tranche === 'main') fail(`the tranche is ${JSON.stringify(cfg.tranche)}: the merge train never merges into main`);
  if (opts.merger && opts.session && opts.merger !== opts.session) fail(`the merger is ${opts.merger}, not this session: one train runs, in the merger's session`);
  let past = [];
  try { if (fetchState(root, cfg.state_branch)) past = jsonl(readState(root, cfg.state_branch, TRAIN_FILE)); } catch { past = []; }
  const ctx = {
    root, cfg, slug, io, log, session: opts.session || null, minutes: opts.minutes || GATE_WAIT_MINUTES, every, wait: opts.wait, lead: opts.lead ?? 1, pipeline: !once, mergeableEvery: opts.mergeableEvery,
    plainIO: { getPR: io.getPR, requiredChecks, checkRuns, checkRun: io.checkRun, comments: io.comments, verify: io.verify, repo: processRepo(), ...(opts.plainIO || {}) },
    notes: [], refused: new Set(), told: [], rows: [], seq: 0, pre: null,
    culprits: new Set(past.flatMap((r) => (r.culprits || []).map((c) => `${c.pr}@${c.head}`))),
    durations: past.flatMap((r) => (r.gates || []).map((g) => g.minutes)).filter(Number.isFinite).slice(-10),
  };
  ctx.expected = () => median(ctx.durations.slice(-10)) ?? 20;
  let beat = 0;
  let busy = 0;
  for (;;) {
    const ready = ctx.pre ?? scan(root, ctx);
    ctx.pre = null;
    if (ready.length) {
      const t = Date.now();
      batch(root, ctx, ready);
      busy += Date.now() - t;
    }
    if (once) return { rows: ctx.rows };
    // The merger's heartbeat and its idle time (no batch in flight), every beatMinutes.
    if (Date.now() - beat >= beatMinutes * MIN) {
      const span = beat ? Date.now() - beat : 0;
      const row = { at: now(), row: 'beat', session: ctx.session, idle_min: Math.round(Math.max(0, span - busy) / MIN * 10) / 10, span_min: Math.round(span / MIN * 10) / 10, batches: ctx.rows.length };
      try { writeState(root, cfg.state_branch, 'merger heartbeat', (wt) => append(wt, MERGER_FILE, row)); } catch (e) { if (!(e instanceof Fail)) throw e; log(`STOP RULE: the merger's heartbeat was not written (${e.message})`); throw e; }
      if (Math.floor(Date.now() / 3600000) !== Math.floor((beat || 0) / 3600000)) log(`hourly: record your context: merge train beat --session ${ctx.session || '<your id>'} --context <percent>`);
      beat = Date.now();
      busy = 0;
    }
    if (!ready.length) sleep(idleEvery);
  }
}

// merge train beat --session <id> --context <pct>: the merger's context, hourly.
export function trainBeat(root, { session, context, log = console.log } = {}) {
  const pct = Number(String(context ?? '').replace(/%$/, ''));
  if (!/^session_[A-Za-z0-9]+$/.test(String(session)) || context === undefined || context === true || !(pct >= 0 && pct <= 100)) fail('merge train beat --session <your id> --context <percent of the window get_session shows>');
  const cfg = loadConfig(root);
  writeState(root, cfg.state_branch, 'merger context', (wt) => append(wt, MERGER_FILE, { at: now(), row: 'context', session, context: pct }));
  log(`merger context ${pct}% recorded`);
}

// The trial's measures, from the batch rows (and the merger's rows), beside the baseline.
export function trainSummary(rows = [], merger = []) {
  const batches = rows.filter((r) => r.row === 'batch');
  const merged = batches.flatMap((r) => r.merged || []);
  const waits = merged.map((m) => m.waited_min);
  const gates = batches.flatMap((r) => r.gates || []);
  const gateMin = gates.reduce((s, g) => s + (Number(g.minutes) || 0), 0);
  const sizes = {};
  for (const r of batches) sizes[r.members.length] = (sizes[r.members.length] || 0) + 1;
  const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : 'unmeasured');
  // A good member delayed by a culprit: its wait past the end of its batch's first gate.
  const delayed = batches.filter((r) => r.culprits?.length && r.gates?.length).flatMap((r) => (r.merged || []).map((m) => mins(r.gates[0].end, m.at)));
  const beats = merger.filter((r) => r.row === 'beat' && r.span_min > 0);
  const span = beats.reduce((s, r) => s + r.span_min, 0);
  const ctxRows = merger.filter((r) => r.row === 'context');
  const ctxRise = ctxRows.length > 1 ? (ctxRows.at(-1).context - ctxRows[0].context) / Math.max(1e-9, (Date.parse(ctxRows.at(-1).at) - Date.parse(ctxRows[0].at)) / 36e5) : null;
  return {
    baseline: BASELINE,
    batches: batches.length,
    merged_prs: merged.length,
    green_to_merged_median: r1(median(waits)),
    green_to_merged_worst: waits.length ? r1(Math.max(...waits)) : 'unmeasured',
    batch_sizes: sizes,
    gate_runs: gates.length,
    gate_minutes: r1(gateMin),
    gate_runs_per_merged_pr: merged.length ? r1(gates.length / merged.length) : 'unmeasured',
    gate_minutes_per_merged_pr: merged.length ? r1(gateMin / merged.length) : 'unmeasured',
    failed_batches: batches.filter((r) => r.result !== 'merged').length,
    bisection_gates: batches.reduce((s, r) => s + (r.bisection_gates || 0), 0),
    culprits: batches.reduce((s, r) => s + (r.culprits?.length || 0), 0),
    delayed_by_culprit_min: delayed.length ? { median: r1(median(delayed)), worst: r1(Math.max(...delayed)) } : 'none',
    push_tries: { max: batches.length ? Math.max(...batches.map((r) => r.push_tries || 1)) : 'unmeasured', over_one: batches.filter((r) => (r.push_tries || 1) > 1).length },
    merger_idle_share: span ? r1(beats.reduce((s, r) => s + r.idle_min, 0) / span * 100) : 'unmeasured',
    merger_context_per_hour: ctxRise === null ? 'unmeasured' : r1(ctxRise),
  };
}

export function trainLines(s) {
  return [`Merge train (baseline green -> merged median ${s.baseline.median} min, worst ${s.baseline.worst}): ${s.batches} batches, ${s.merged_prs} PRs merged; green -> merged median ${s.green_to_merged_median} min, worst ${s.green_to_merged_worst}.`,
    `Batch sizes ${JSON.stringify(s.batch_sizes)}; ${s.gate_runs} gate runs, ${s.gate_minutes} gate-minutes (${s.gate_runs_per_merged_pr} runs, ${s.gate_minutes_per_merged_pr} min per merged PR); ${s.failed_batches} batches not wholly merged, ${s.bisection_gates} bisection gates, ${s.culprits} culprits; good PRs delayed by a culprit: ${typeof s.delayed_by_culprit_min === 'object' ? `median ${s.delayed_by_culprit_min.median} min, worst ${s.delayed_by_culprit_min.worst}` : s.delayed_by_culprit_min}; state-branch push tries max ${s.push_tries.max}, ${s.push_tries.over_one} over one; merger idle ${s.merger_idle_share}%, context ${s.merger_context_per_hour}%/h.`];
}
