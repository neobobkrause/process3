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
import { approvalsHash } from './start.mjs';
import { randomBytes } from 'node:crypto';
import { Fail, fail, git, loadConfig, now, repoSlug } from './util.mjs';
import { readAddress } from './roles.mjs';

// A stop the train must never write past or retry: a lost lease, changed approvals, the disk.
export class Stop extends Fail {}
const stop = (msg) => { throw new Stop(msg); };

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
export const RETRIES_TO_BOB = 5;
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
  const review = opts.reviewed !== undefined || opts.noReview !== undefined;
  if (!review && cost === null) fail('merge train note <pr>: its review (--reviewed ... | --no-review "<why>"), its job cost (--job-cost-usd <n> [--job-session <id>]), or both');
  const by = opts.session || (process.env.CLAUDE_CODE_REMOTE_SESSION_ID || '').replace(/^cse_/, 'session_') || null;
  const cfg = loadConfig(root);
  const pr = io.getPR(opts.slug || repoSlug(root), n);
  if (pr.base?.ref !== cfg.tranche) fail(`pull request ${n} is not into ${cfg.tranche}`);
  if (pr.merged && review) fail(`pull request ${n} is merged: only its job cost is recorded now`);
  if (!pr.merged && pr.state !== 'open') fail(`pull request ${n} is ${pr.state}`);
  if (review) {
    let bob = null;
    try { bob = readAddress(root).bob?.session || null; } catch { bob = null; }
    if (!bob || by !== bob) fail(`a review note is BOB's to record (the addressed BOB is ${bob || 'none'}, this session ${by || 'unknown'}); a cost may be recorded by anyone`);
  }
  const rounds = review ? reviewRounds(opts) : null;
  const row = { at: now(), row: 'note', by, pr: Number(n), sha: pr.head.sha, ...(review ? { reviewed: opts.reviewed || null, no_review: opts.noReview || null, rounds: rounds.rounds, decision: rounds.decision, ...reviewMeasures(opts) } : {}), ...(cost !== null ? { job_cost_usd: cost, job_session: opts.jobSession || null } : {}), ...(pr.merged ? { merged: true } : {}) };
  writeState(root, cfg.state_branch, `merge train note for PR ${n}`, (wt) => append(wt, NOTES_FILE, row));
  log(`merge train note for PR ${n} at ${pr.head.sha.slice(0, 10)}: ${review ? (row.reviewed ? `reviewed, ${row.rounds} round(s)` : `no review: ${row.no_review}`) : ''}${review && cost !== null ? '; ' : ''}${cost !== null ? `job cost ${cost} USD` : ''}`);
  return row;
}
// A note's review counts only when BOB, as addressed now, wrote it (the merger and a job may
// record only a cost): the newest such note for the head gives the review, the newest cost note
// the cost, each apart, so a cost note never overrides a review.
export function noteFor(notes, n, sha, bob) {
  const mine = notes.filter((x) => x.row === 'note' && x.pr === n && x.sha === sha && !x.merged);
  return { review: (bob ? mine.filter((x) => x.by === bob && (x.reviewed || x.no_review)).pop() : null) || null, cost: mine.filter((x) => x.job_cost_usd != null).pop() || null };
}
// merge()'s options from the notes for this head; with no review, --no-review (merge refuses it
// when a trigger fires) and, with no cost, the job's cost unmeasured, priced later.
const reviewOf = ({ review: r, cost: c }) => ({
  ...(r ? { reviewed: r.reviewed || undefined, noReview: r.no_review || undefined, rounds: r.rounds || undefined, decision: r.decision || undefined, reviewMinutes: r.review_minutes ?? undefined, findings: r.findings ?? undefined, actedOn: r.findings_acted ?? undefined, ...(typeof r.review_usd === 'number' ? { reviewCostUsd: r.review_usd } : {}) } : { noReview: TRAIN_NO_REVIEW }),
  ...(c ? { jobCostUsd: c.job_cost_usd, jobSession: c.job_session || undefined } : {}),
});

// The lease (one train at a time): taken when the train starts, refused under another session's
// live lease; an expired one is taken over (a row says so); renewed every LEASE.renew minutes;
// a renewal that finds another session's lease stops the train.
// The lease names the session and this process (a token), so a second train in the same session is refused too.
export function takeLease(root, cfg, session, token, { take = false } = {}) {
  return writeState(root, cfg.state_branch, `merger lease: ${session}`, (wt) => {
    const p = join(wt, LEASE_FILE);
    let cur = null;
    if (existsSync(p)) { try { cur = JSON.parse(readFileSync(p, 'utf8')); } catch { cur = null; } }
    const t = Date.now();
    const mine = cur?.session === session && cur?.token === token;
    if (!mine && cur && Date.parse(cur.expires) > t) (take ? fail : stop)(`the merge train's lease is held by ${cur.session}${cur.session === session ? ' (another train in this session)' : ''} until ${cur.expires}: one train runs`);
    if (!take && !mine) stop(`the merger lost its lease (${cur ? `${cur.session} holds it` : 'none on the state branch'}): the train stops`);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify({ session, token, at: now(), expires: new Date(t + LEASE.expire * MIN).toISOString().replace(/\.\d+Z$/, 'Z'), since: mine ? cur.since : now() }, null, 2) + '\n');
    if (take && cur && !mine) append(wt, MERGER_FILE, { at: now(), row: 'takeover', session, from: cur.session, expired: cur.expires });
    return { takeover: !!(take && cur && !mine) };
  });
}
// A train that ends gives its lease back (a killed one's lapses within LEASE.expire minutes).
export function releaseLease(root, cfg, session, token) {
  writeState(root, cfg.state_branch, `merger lease released: ${session}`, (wt) => {
    const p = join(wt, LEASE_FILE);
    let cur = null;
    if (existsSync(p)) { try { cur = JSON.parse(readFileSync(p, 'utf8')); } catch { cur = null; } }
    if (cur?.session === session && cur?.token === token) writeFileSync(p, JSON.stringify({ ...cur, expires: now(), released: now() }, null, 2) + '\n');
  });
}
// Before a land: the lease, read fresh from origin, is this train's and live; the tranche's
// approvals are those the train started under (Bob's word, changed, stops it).
export function leaseHeld(root, cfg, session, token, approvals) {
  fetchState(root, cfg.state_branch, { fresh: true });
  let cur = null;
  try { cur = JSON.parse(readState(root, cfg.state_branch, LEASE_FILE) || 'null'); } catch { cur = null; }
  if (cur?.session !== session || cur?.token !== token || !(Date.parse(cur.expires) > Date.now())) stop(`the merger's lease is ${cur ? `${cur.session}'s, to ${cur.expires}` : 'gone'}: nothing is landed, the train stops`);
  if (approvals) git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root });
  if (approvals && approvalsHash(root, `refs/remotes/origin/${cfg.tranche}`) !== approvals) stop(`the approvals on ${cfg.tranche} changed since the train started: nothing is landed, the train stops; tell ROOT`);
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
    if (p.base?.repo?.default_branch && p.base.repo.default_branch === cfg.tranche) continue; // never the default branch
    // A green gate is read once per head and run (the loop reads every 15 s); any other state is read again.
    const g = ctx.gates.get(p.head.sha) || io.checkRun(slug, p.head.sha, 'gate');
    if (!(g?.status === 'completed' && g.conclusion === 'success')) { ctx.gates.delete(p.head.sha); continue; }
    // Its row is posted by the gate workflow's post job, after the gate: merge needs it.
    const post = g.post || io.checkRun(slug, p.head.sha, 'post');
    // The post job of this gate run: it starts only once the gate has ended.
    if (post?.status !== 'completed' || (post.started_at && g.completed_at && Date.parse(post.started_at) < Date.parse(g.completed_at))) continue;
    ctx.gates.set(p.head.sha, { ...g, post });
    const run = g.id ?? g.completed_at;
    if ((ctx.backoff.get(`${p.number}@${p.head.sha}`)?.until || 0) > Date.now()) continue;
    // A head refused (and handed to BOB) waits for a new head or gate run, or a review note made since.
    const at = ctx.refused.get(`${p.number}@${p.head.sha}@${run}`);
    if (at && !ctx.notes.some((x) => x.row === 'note' && x.pr === p.number && x.sha === p.head.sha && x.by && x.by === ctx.bob && (x.reviewed || x.no_review) && x.at >= at)) continue;
    out.push({ n: p.number, head: p.head.sha, run, id: branchModule(p.head.ref, ids), green_at: g.completed_at });
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
      ctx.renew();
      const tip = ctx.io.getPR(ctx.slug, cur).head?.sha;
      if (tip && git(['merge-tree', '--write-tree', tip, c.head], { cwd: root, allowFail: true }).code !== 0) { ctx.log(`PR ${c.n} would conflict with PR ${cur}'s merged result; it is judged again once ${cur} lands`); continue; }
      next = c;
      break;
    } catch (e) { if (!(e instanceof Fail) || e instanceof Stop) throw e; if (lasting(e.message)) refuse(root, ctx, c, e.message); }
  }
  ctx.prepared = { n: next?.n ?? null, depth: list.length, prep_min: mins(t, Date.now()) };
  ctx.log(`prepared ${next ? `PR ${next.n}` : 'none'} while PR ${cur}'s gate runs (queue ${list.length}, ${ctx.prepared.prep_min} min)`);
}

// An exception, handed to BOB once per pull request head: p3 send bob, delivered by the merger.
// A refusal that lasts until the job or BOB acts; anything else (GitHub slow or unread, a gate
// row not yet there, a moved tranche) is tried again on the next round, and BOB is not told.
const LASTING = /review trigger|conflicts with|bring itself up to date|outside its module|^ledger:|has no ledger entry|gate on the merged result is|not from a job branch|no receipt|checked receipt attempt|disagrees/;
export const lasting = (why) => LASTING.test(String(why).split('\n')[0]);
function refuse(root, ctx, c, why) {
  const key = `${c.n}@${c.head}@${c.run}`;
  ctx.gates.delete(c.head); // the gate is read again: a re-run makes a new key
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
  const tick = (l) => {
    log(l);
    ctx.renew();
    if (ctx.pipeline && ctx.prepared === null && /^waiting for the gate/.test(l)) prepare(root, ctx, c.n);
  };
  const free = ctx.diskFree(root);
  if (free < ctx.diskMin) stop(`STOP: ${free} MB free, under the merger's disk budget of ${ctx.diskMin} MB; nothing was started for PR ${c.n}. Delete what is not needed (old clones, caches), then run the train again`);
  const row = { at: now(), row: 'merge', session: ctx.session, pr: c.n, module: c.id, head: c.head, run: c.run, green_at: c.green_at, queue, idle_min: idle, prepared: !!prep, prep_min: prep?.prep_min ?? null };
  let r = null;
  try {
    r = merge(root, c.n, { ...reviewOf(ctx.noteFor(c)), head: c.head, slug, io: ctx.io, minutes: ctx.minutes, every: ctx.every, wait: ctx.wait, log: tick, beforeLand: () => leaseHeld(root, cfg, ctx.session, ctx.token, ctx.approvals) });
    row.result = 'merged';
    row.merged_at = now();
    row.green_to_merged = mins(Date.parse(c.green_at), Date.now());
    row.queue_at_end = ctx.prepared?.depth ?? null;
  } catch (e) {
    if (!(e instanceof Fail) || e instanceof Stop) throw e; // a lost lease, changed approvals: never land past it
    row.result = lasting(e.message) ? 'refused' : 'retry';
    row.why = e.message.split('\n')[0].slice(0, 300);
    if (row.result === 'refused') refuse(root, ctx, c, e.message);
    else {
      // Tried again with a growing wait (1, 2, 4, 8 min); the fifth time it goes to BOB.
      const k = `${c.n}@${c.head}`;
      const b = { tries: (ctx.backoff.get(k)?.tries || 0) + 1 };
      b.until = Date.now() + Math.min(8, 2 ** (b.tries - 1)) * MIN;
      ctx.backoff.set(k, b);
      ctx.gates.delete(c.head);
      if (b.tries >= RETRIES_TO_BOB) refuse(root, ctx, c, `${row.why} (${b.tries} tries)`); else log(`PR ${c.n} is tried again in ${Math.round((b.until - Date.now()) / MIN)} min: ${row.why}`);
    }
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
  const ctx = { cfg, slug, io, log, session, minutes: opts.minutes || GATE_WAIT_MINUTES, every: opts.every, wait: opts.wait, pipeline: opts.pipeline ?? !once, diskFree: opts.diskFree || diskFreeMb, diskMin: opts.diskMinMb ?? DISK_MIN_MB, refused: new Map(), backoff: new Map(), bob: undefined, rows: [], gates: new Map(), prepared: null, notes: [] };
  ctx.token = randomBytes(8).toString('hex');
  ctx.noteFor = (c) => noteFor(ctx.notes, c.n, c.head, ctx.bob);
  const { takeover } = takeLease(root, cfg, session, ctx.token, { take: true });
  ctx.renewed = Date.now();
  ctx.renew = () => { if (Date.now() - ctx.renewed >= LEASE.renew * MIN) { takeLease(root, cfg, session, ctx.token); ctx.renewed = Date.now(); } };
  // Heads refused by an earlier train wait as this one's would (a restart re-sends nothing).
  try { if (fetchState(root, cfg.state_branch, { fresh: true })) for (const x of jsonl(readState(root, cfg.state_branch, TRAIN_FILE))) if (x.result === 'refused' && x.head) ctx.refused.set(`${x.pr}@${x.head}@${x.run}`, x.at); } catch { /* unread: tried again */ }
  log(`merge train: lease held by ${session}${takeover ? ' (taken over from an expired lease)' : ''}`);
  try {
    git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root });
    ctx.approvals = approvalsHash(root, `refs/remotes/origin/${cfg.tranche}`);
    return loop(root, ctx, { once, idleEvery, rounds: opts.rounds });
  } catch (e) {
    ctx.lost = e instanceof Stop && /lease/.test(e.message);
    throw e;
  } finally {
    if (!ctx.lost) { try { releaseLease(root, cfg, session, ctx.token); } catch (e) { log(`the lease was not released (${e.message}); it lapses within ${LEASE.expire} min`); } }
  }
}
function loop(root, ctx, { once, idleEvery, rounds = Infinity }) {
  const { cfg, log, session } = ctx;
  let idleFrom = Date.now();
  let hour = Math.floor(Date.now() / 36e5);
  for (;;) {
    ctx.renew();
    if (fetchState(root, cfg.state_branch, { fresh: true })) ctx.notes = jsonl(readState(root, cfg.state_branch, NOTES_FILE));
    // BOB as addressed now (a handover moves it): only its review notes count.
    let bob = null;
    try { bob = readAddress(root, { fetch: false }).bob?.session || null; } catch { bob = null; }
    if (bob !== ctx.bob) log(bob ? `review notes count from BOB ${bob}` : 'no BOB addressed: no review note counts');
    ctx.bob = bob;
    const list = ready(root, ctx);
    const first = list.find((c) => c.n === ctx.prepared?.n) || list[0];
    if (first) {
      mergeOne(root, ctx, first, { queue: list.length, idle: mins(idleFrom, Date.now()) });
      idleFrom = Date.now();
    } else ctx.prepared = null;
    if (once || --rounds <= 0) return { rows: ctx.rows }; // rounds: a bounded run, for tests
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
    refused: m.filter((r) => r.result === 'refused').length,
    retried: m.filter((r) => r.result === 'retry').length,
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
  `Merge train: ${s.merged} merged, ${s.refused} handed to BOB, ${s.retried} tries again later; green -> merged median ${s.green_to_merged.median} min, p90 ${s.green_to_merged.p90}, worst ${s.green_to_merged.worst}. Baselines: ${s.baselines.map((b) => `${b.name}: median ${b.median}${b.p90 ? `, p90 ${b.p90}` : ''}${b.worst ? `, worst ${b.worst}` : ''}`).join('; ')}.`,
  `Prepared while the previous gate ran: ${s.prepared_share}% (prep median ${s.prep_minutes_median} min); queue depth as each merge neared its end ${JSON.stringify(s.queue_at_merge_end)}; idle gaps ${s.idle_gaps_min.total} min (worst ${s.idle_gaps_min.worst}); disk per merge median ${s.disk_mb_per_merge.median} MB (worst ${s.disk_mb_per_merge.worst}); lease takeovers ${s.lease_takeovers}; state-branch tries max ${s.push_tries.max}, ${s.push_tries.over_one} over one; merger context ${s.merger_context_per_hour}%/h.`,
];
