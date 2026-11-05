// merge train (Bob, 5 Nov; design option F, notes/merge-train-trial.md): the MERGER's one
// long-running act, in its own session. A serial loop over merge(): every open job pull request into
// the tranche that is green on its head merges, oldest green first, through merge() itself, with
// its full re-gate of the merged result and every record as merge writes it. While one re-gate
// runs, the next pull request is prepared (merge's own checks, and a merge-tree onto the result
// being gated). One train runs: a lease on the state branch, renewed while it runs, checked again
// just before each land. The merger hands every exception to BOB (p3 send bob); it starts no job,
// triages nothing and rules on nothing. Each merge writes one row, the trial's measures.
import { appendFileSync, existsSync, mkdirSync, readFileSync, statfsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { checkRun, comments, getPR, openPRs, verifyRow } from './github.mjs';
import { branchModule, ledgerIds } from './ledger.mjs';
import { P3, READY_START } from './job.mjs';
import { GATE_WAIT_MINUTES, firstActs, jobChecks, jobCostOf, merge, mergePR, reviewMeasures, reviewRounds } from './merge.mjs';
import { fetchState, jsonl, readState, send, writeState } from './state.mjs';
import { Fail, fail, git, loadConfig, now, repoSlug } from './util.mjs';

export const TRAIN_FILE = 'metrics/train.jsonl'; // one row per merge the train tried
export const NOTES_FILE = 'metrics/train-notes.jsonl'; // a pull request's review and cost, per head
export const MERGER_FILE = 'metrics/merger.jsonl'; // lease takeovers, the merger's context
export const LEASE_FILE = 'merger/lease.json';
export const LEASE = { renew: 5, expire: 15 }; // minutes
export const BASELINES = [
  { name: 'green -> merged, the simulation of 4-5 Nov (measure/merge-train-sim)', median: 8.7, p90: 33.7 },
  { name: 'complete -> merge row, the merge rows of 4-5 Nov', median: 11.0, worst: 85 },
];
// The disk budget (copy, 5 Nov ~02:00: BOB's eight merge loops died when the session's disk
// allowance filled). merge works in one worktree it removes when it ends (withTemp); before each
// merge the train needs this much free space, else it stops and says so, never mid-merge.
export const DISK_MIN_MB = 512;
export const diskFreeMb = (dir) => { const f = statfsSync(dir); return Math.floor(Number(f.bavail) * Number(f.bsize) / 1048576); };
export const TRAIN_NO_REVIEW = 'merge train: no review recorded, and no review trigger fired';
const MIN = 60000;
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const mins = (a, b) => Math.round((b - a) / MIN * 10) / 10;
const append = (wt, path, row) => { mkdirSync(dirname(join(wt, path)), { recursive: true }); appendFileSync(join(wt, path), JSON.stringify(row) + '\n'); };
const pick = (xs, q) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)] : null; };
const median = (xs) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };

// merge train note <pr>: the review (and the job's cost) a pull request merges with, as merge's
// flags give them, for the head it has now. A pull request that fires a review trigger merges
// only with a --reviewed note for its current head (merge refuses --no-review for it).
export function trainNote(root, n, opts = {}) {
  const { log = console.log } = opts;
  const io = { getPR, ...(opts.io || {}) };
  const cost = jobCostOf(opts.jobCostUsd);
  const cfg = loadConfig(root);
  const pr = io.getPR(opts.slug || repoSlug(root), n);
  if (pr.base?.ref !== cfg.tranche) fail(`pull request ${n} is not into ${cfg.tranche}`);
  // A merged job whose cost row was written unmeasured: its price, read later, as a row of its own.
  if (pr.merged) {
    if (cost === null || opts.reviewed || opts.noReview) fail(`pull request ${n} is merged: only its price is recorded now, --job-cost-usd <n> --job-session <id>`);
    const row = { at: now(), row: 'price', pr: Number(n), sha: pr.head.sha, job_cost_usd: cost, job_session: opts.jobSession || null };
    writeState(root, cfg.state_branch, `merge train price for PR ${n}`, (wt) => append(wt, NOTES_FILE, row));
    log(`price for merged PR ${n}: ${cost} USD recorded`);
    return row;
  }
  if (pr.state !== 'open') fail(`pull request ${n} is ${pr.state}`);
  const rounds = reviewRounds(opts);
  const measures = reviewMeasures(opts);
  const row = { at: now(), row: 'note', pr: Number(n), sha: pr.head.sha, reviewed: opts.reviewed || null, no_review: opts.noReview || null, rounds: rounds.rounds, decision: rounds.decision, ...measures, job_cost_usd: cost, job_session: opts.jobSession || null };
  writeState(root, cfg.state_branch, `merge train note for PR ${n}`, (wt) => append(wt, NOTES_FILE, row));
  log(`merge train note for PR ${n} at ${pr.head.sha.slice(0, 10)}: ${row.reviewed ? `reviewed, ${row.rounds} round(s)` : `no review: ${row.no_review}`}`);
  return row;
}
// merge()'s options from the newest note for this head; with none, --no-review (merge refuses it
// when a trigger fires) and the job's cost unmeasured, priced later.
const reviewOf = (note) => (note?.row === 'note' ? {
  reviewed: note.reviewed || undefined, noReview: note.no_review || undefined, rounds: note.rounds || undefined, decision: note.decision || undefined,
  reviewMinutes: note.review_minutes ?? undefined, findings: note.findings ?? undefined, actedOn: note.findings_acted ?? undefined,
  ...(typeof note.review_usd === 'number' ? { reviewCostUsd: note.review_usd } : {}), jobCostUsd: note.job_cost_usd ?? undefined, jobSession: note.job_session || undefined,
} : { noReview: TRAIN_NO_REVIEW });

// The lease (one train at a time): taken when the train starts, refused under another session's
// live lease; an expired one is taken over (a row says so); renewed every LEASE.renew minutes;
// a renewal that finds another session's lease stops the train.
export function takeLease(root, cfg, session, { take = false } = {}) {
  return writeState(root, cfg.state_branch, `merger lease: ${session}`, (wt) => {
    const p = join(wt, LEASE_FILE);
    let cur = null;
    if (existsSync(p)) { try { cur = JSON.parse(readFileSync(p, 'utf8')); } catch { cur = null; } }
    const t = Date.now();
    const mine = cur?.session === session;
    if (!mine && cur && Date.parse(cur.expires) > t) fail(`the merge train's lease is held by ${cur.session} until ${cur.expires}: one train runs`);
    if (!take && !mine) fail(`the merger lost its lease (${cur ? `${cur.session} holds it` : 'none on the state branch'}): the train stops`);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify({ session, at: now(), expires: new Date(t + LEASE.expire * MIN).toISOString().replace(/\.\d+Z$/, 'Z'), since: mine && !take ? cur.since : now() }, null, 2) + '\n');
    if (take && cur && !mine) append(wt, MERGER_FILE, { at: now(), row: 'takeover', session, from: cur.session, expired: cur.expires });
    return { takeover: !!(take && cur && !mine) };
  });
}
// Before a land: the lease, read fresh from origin, is this session's and live.
export function leaseHeld(root, cfg, session) {
  fetchState(root, cfg.state_branch, { fresh: true });
  let cur = null;
  try { cur = JSON.parse(readState(root, cfg.state_branch, LEASE_FILE) || 'null'); } catch { cur = null; }
  if (cur?.session !== session || !(Date.parse(cur.expires) > Date.now())) fail(`the merger's lease is ${cur ? `${cur.session}'s, to ${cur.expires}` : 'gone'}: nothing is landed, the train stops`);
}

// The job pull requests green on their head, oldest green first. Read-only.
function ready(root, ctx, skip = new Set()) {
  const { cfg, slug, io } = ctx;
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root });
  const ids = ledgerIds(root, `origin/${cfg.tranche}`);
  const open = io.openPRs(slug, cfg.tranche);
  if (!open) fail(`could not read the pull requests into ${cfg.tranche}`);
  const out = [];
  for (const p of open) {
    if (skip.has(p.number) || p.draft || p.base?.ref !== cfg.tranche || !branchModule(p.head?.ref, ids)) continue;
    // A head refused (and handed to BOB) waits for a new head, or a note for it made since.
    const at = ctx.refused.get(`${p.number}@${p.head.sha}`);
    if (at && !ctx.notes.some((x) => x.row === 'note' && x.pr === p.number && x.sha === p.head.sha && x.at >= at)) continue;
    // A finished gate on a head is read once (the loop reads every 15 s).
    const g = ctx.gates.get(p.head.sha) || io.checkRun(slug, p.head.sha, 'gate');
    if (g?.status === 'completed') ctx.gates.set(p.head.sha, g);
    if (g?.status === 'completed' && g.conclusion === 'success') out.push({ n: p.number, head: p.head.sha, id: branchModule(p.head.ref, ids), green_at: g.completed_at });
  }
  return out.sort((a, b) => String(a.green_at).localeCompare(String(b.green_at)));
}

// Prepares the next pull request while PR `cur`'s re-gate runs: merge's own checks, and a
// merge-tree onto the result being gated, so it is pushed within seconds of the land. A refusal
// here is handed to BOB once per head, as a refusal at its merge would be.
function prepare(root, ctx, cur) {
  const t = Date.now();
  const list = ready(root, ctx, new Set([cur]));
  let next = null;
  for (const c of list) {
    try {
      const pr = ctx.io.getPR(ctx.slug, c.n);
      if (pr.head?.sha !== c.head) continue;
      jobChecks(root, c.n, pr, c.id, { cfg: ctx.cfg, slug: ctx.slug, io: ctx.io, noReview: reviewOf(ctx.noteFor(c)).noReview, log: () => {} });
      const tip = ctx.io.getPR(ctx.slug, cur).head?.sha;
      if (tip && git(['merge-tree', '--write-tree', tip, c.head], { cwd: root, allowFail: true }).code !== 0) { ctx.log(`PR ${c.n} would conflict with PR ${cur}'s merged result; it is judged again once ${cur} lands`); continue; }
      next = c;
      break;
    } catch (e) { if (!(e instanceof Fail)) throw e; refuse(root, ctx, c, e.message); }
  }
  ctx.prepared = { n: next?.n ?? null, depth: list.length, prep_min: mins(t, Date.now()) };
  ctx.log(`prepared ${next ? `PR ${next.n}` : 'none'} while PR ${cur}'s gate runs (queue ${list.length}, ${ctx.prepared.prep_min} min)`);
}

// An exception, handed to BOB once per pull request head: p3 send bob, delivered by the merger.
function refuse(root, ctx, c, why) {
  const key = `${c.n}@${c.head}`;
  const told = ctx.refused.has(key);
  ctx.refused.set(key, now());
  if (told) return;
  const first = why.split('\n')[0];
  const text = /review trigger/.test(first) ? `PR ${c.n} (job ${c.id}) fires a review trigger and has no review recorded for ${c.head.slice(0, 10)}: review it (${P3} review brief ${c.n}), then ${P3} merge train note ${c.n} --reviewed "<what>" --rounds <n> --review-minutes <n> --findings <n> --acted-on <n>; the train merges it then`
    : /conflicts with|bring itself up to date/.test(first) ? `PR ${c.n}: job ${c.id} must sync (${P3} job sync ${c.id}, then job complete ${c.id}): ${first}`
      : /gate on the merged result is/.test(first) ? `PR ${c.n} (job ${c.id}): its merged result is red; the job fixes it: ${first}`
        : `PR ${c.n} (job ${c.id}) was not merged by the train: ${first}`;
  ctx.log(`to BOB: ${text}`);
  try { send(root, ctx.cfg.state_branch, { from: 'merger', to: 'bob', text, log: ctx.log }); } catch (e) { if (!(e instanceof Fail)) throw e; ctx.log(`the message to BOB was not recorded (${e.message}); tell BOB: ${text}`); }
}

// One pull request through merge(), with the lease checked before the land, and its row.
function mergeOne(root, ctx, c, { queue, idle }) {
  const { cfg, slug, log } = ctx;
  const started = Date.now();
  const prep = ctx.prepared?.n === c.n ? ctx.prepared : null;
  ctx.prepared = null;
  let renewed = Date.now();
  const tick = (l) => {
    log(l);
    if (Date.now() - renewed >= LEASE.renew * MIN) { takeLease(root, cfg, ctx.session); renewed = Date.now(); ctx.renewed = renewed; }
    if (ctx.pipeline && ctx.prepared === null && /^waiting for the gate/.test(l)) prepare(root, ctx, c.n);
  };
  const free = ctx.diskFree(root);
  if (free < ctx.diskMin) fail(`STOP: ${free} MB free, under the merger's disk budget of ${ctx.diskMin} MB; nothing was started for PR ${c.n}. Delete what is not needed (old clones, caches), then run the train again`);
  const row = { at: now(), row: 'merge', session: ctx.session, pr: c.n, module: c.id, head: c.head, green_at: c.green_at, queue, idle_min: idle, prepared: !!prep, prep_min: prep?.prep_min ?? null };
  let r = null;
  try {
    r = merge(root, c.n, { ...reviewOf(ctx.noteFor(c)), slug, io: ctx.io, minutes: ctx.minutes, every: ctx.every, wait: ctx.wait, log: tick, beforeLand: () => leaseHeld(root, cfg, ctx.session) });
    row.result = 'merged';
    row.merged_at = now();
    row.green_to_merged = mins(Date.parse(c.green_at), Date.now());
    row.queue_at_end = ctx.prepared?.depth ?? null;
  } catch (e) {
    if (!(e instanceof Fail)) throw e;
    if (/lease/.test(e.message)) throw e; // stop on loss: never land without it
    row.result = 'refused';
    row.why = e.message.split('\n')[0].slice(0, 300);
    refuse(root, ctx, c, e.message);
  }
  row.minutes = mins(started, Date.now());
  row.disk_mb = free - ctx.diskFree(root); // what this merge left on disk (the worktree is gone by now)
  let tries = 0;
  writeState(root, cfg.state_branch, `merge train: PR ${c.n} ${row.result}`, (wt) => { tries++; append(wt, TRAIN_FILE, { ...row, push_tries: tries }); });
  row.push_tries = tries;
  // BOB's acts after a merge (the triage the notice owes, the ready jobs' start), sent, not taken.
  if (r?.merged) {
    const acts = firstActs(r.triage).map((l) => l.replace(/^(first|then): /, '')).join('; then ');
    try { send(root, cfg.state_branch, { from: 'merger', to: 'bob', text: `merged PR ${c.n} (job ${c.id}): ${acts || READY_START}`, log: ctx.log }); } catch (e) { if (!(e instanceof Fail)) throw e; log(`tell BOB: merged PR ${c.n}: ${acts}`); }
  }
  ctx.rows.push(row);
  return row;
}

// merge train [--once] --session <id>: the loop; --once merges at most one pull request.
export function train(root, opts = {}) {
  const { once = false, log = console.log, idleEvery = 15000 } = opts;
  const cfg = loadConfig(root);
  const slug = opts.slug || repoSlug(root);
  const session = opts.session || (process.env.CLAUDE_CODE_REMOTE_SESSION_ID || '').replace(/^cse_/, 'session_') || null;
  if (!/^session_[A-Za-z0-9]+$/.test(String(session))) fail('merge train --session <your session id>: the lease is held by a session');
  if (!cfg.tranche || cfg.tranche === 'main') fail(`the tranche is ${JSON.stringify(cfg.tranche)}: the merge train never merges into main`);
  const io = { getPR, comments, checkRun, mergePR, openPRs, verify: (s, r, c) => verifyRow(s, r, c), ...(opts.io || {}) };
  const ctx = { cfg, slug, io, log, session, minutes: opts.minutes || GATE_WAIT_MINUTES, every: opts.every, wait: opts.wait, pipeline: opts.pipeline ?? !once, diskFree: opts.diskFree || diskFreeMb, diskMin: opts.diskMinMb ?? DISK_MIN_MB, refused: new Map(), rows: [], gates: new Map(), prepared: null, notes: [] };
  ctx.noteFor = (c) => ctx.notes.filter((x) => x.row === 'note' && x.pr === c.n && x.sha === c.head).pop() || null;
  const { takeover } = takeLease(root, cfg, session, { take: true });
  // Heads refused by an earlier train wait as this one's would (a restart re-sends nothing).
  try { if (fetchState(root, cfg.state_branch, { fresh: true })) for (const x of jsonl(readState(root, cfg.state_branch, TRAIN_FILE))) if (x.result === 'refused' && x.head) ctx.refused.set(`${x.pr}@${x.head}`, x.at); } catch { /* unread: tried again */ }
  log(`merge train: lease held by ${session}${takeover ? ' (taken over from an expired lease)' : ''}`);
  let idleFrom = Date.now();
  let hour = Math.floor(Date.now() / 36e5);
  ctx.renewed = Date.now();
  for (;;) {
    if (Date.now() - ctx.renewed >= LEASE.renew * MIN) { takeLease(root, cfg, session); ctx.renewed = Date.now(); }
    if (fetchState(root, cfg.state_branch, { fresh: true })) ctx.notes = jsonl(readState(root, cfg.state_branch, NOTES_FILE));
    const list = ready(root, ctx);
    const first = list.find((c) => c.n === ctx.prepared?.n) || list[0];
    if (first) {
      mergeOne(root, ctx, first, { queue: list.length, idle: mins(idleFrom, Date.now()) });
      idleFrom = Date.now();
    } else ctx.prepared = null;
    if (once) return { rows: ctx.rows };
    if (Math.floor(Date.now() / 36e5) !== hour) { hour = Math.floor(Date.now() / 36e5); log(`hourly: record your context: ${P3} merge train beat --session ${session} --context <percent>`); }
    if (!first) sleep(idleEvery);
  }
}

// merge train beat --session <id> --context <pct>: the merger's context, hourly.
export function trainBeat(root, { session, context, log = console.log } = {}) {
  const pct = Number(String(context ?? '').replace(/%$/, ''));
  if (!/^session_[A-Za-z0-9]+$/.test(String(session)) || context === undefined || context === true || !(pct >= 0 && pct <= 100)) fail('merge train beat --session <your id> --context <percent of the window get_session shows>');
  writeState(root, loadConfig(root).state_branch, 'merger context', (wt) => append(wt, MERGER_FILE, { at: now(), row: 'context', session, context: pct }));
  log(`merger context ${pct}% recorded`);
}

// The trial's measures from the train's rows and the merger's, beside both baselines, each named.
export function trainSummary(rows = [], merger = []) {
  const m = rows.filter((r) => r.row === 'merge');
  const ok = m.filter((r) => r.result === 'merged');
  const g = ok.map((r) => r.green_to_merged);
  const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : 'unmeasured');
  const depth = {};
  for (const r of ok) if (Number.isFinite(r.queue_at_end)) depth[r.queue_at_end] = (depth[r.queue_at_end] || 0) + 1;
  const ctxRows = merger.filter((r) => r.row === 'context');
  const span = ctxRows.length > 1 ? (Date.parse(ctxRows.at(-1).at) - Date.parse(ctxRows[0].at)) / 36e5 : 0;
  return {
    baselines: BASELINES,
    merged: ok.length,
    refused: m.length - ok.length,
    green_to_merged: { median: r1(median(g)), p90: r1(pick(g, 0.9)), worst: g.length ? r1(Math.max(...g)) : 'unmeasured' },
    prep_minutes_median: r1(median(m.map((r) => r.prep_min))),
    prepared_share: ok.length ? r1(ok.filter((r) => r.prepared).length / ok.length * 100) : 'unmeasured',
    queue_at_merge_end: depth,
    idle_gaps_min: { total: r1(m.reduce((s, r) => s + (r.idle_min || 0), 0)), worst: m.length ? r1(Math.max(...m.map((r) => r.idle_min || 0))) : 'unmeasured' },
    disk_mb_per_merge: { median: r1(median(m.map((r) => r.disk_mb))), worst: m.some((r) => Number.isFinite(r.disk_mb)) ? r1(Math.max(...m.map((r) => r.disk_mb).filter(Number.isFinite))) : 'unmeasured' },
    lease_takeovers: merger.filter((r) => r.row === 'takeover').length,
    push_tries: { max: m.length ? Math.max(...m.map((r) => r.push_tries || 1)) : 'unmeasured', over_one: m.filter((r) => (r.push_tries || 1) > 1).length },
    merger_context_per_hour: span > 0 ? r1((ctxRows.at(-1).context - ctxRows[0].context) / span) : 'unmeasured',
  };
}
export const trainLines = (s) => [
  `Merge train: ${s.merged} merged, ${s.refused} handed to BOB; green -> merged median ${s.green_to_merged.median} min, p90 ${s.green_to_merged.p90}, worst ${s.green_to_merged.worst}. Baselines: ${s.baselines.map((b) => `${b.name}: median ${b.median}${b.p90 ? `, p90 ${b.p90}` : ''}${b.worst ? `, worst ${b.worst}` : ''}`).join('; ')}.`,
  `Prepared while the previous gate ran: ${s.prepared_share}% (prep median ${s.prep_minutes_median} min); queue depth as each merge neared its end ${JSON.stringify(s.queue_at_merge_end)}; idle gaps ${s.idle_gaps_min.total} min (worst ${s.idle_gaps_min.worst}); disk per merge median ${s.disk_mb_per_merge.median} MB (worst ${s.disk_mb_per_merge.worst}); lease takeovers ${s.lease_takeovers}; state-branch tries max ${s.push_tries.max}, ${s.push_tries.over_one} over one; merger context ${s.merger_context_per_hour}%/h.`,
];
