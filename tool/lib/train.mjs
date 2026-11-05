// merge train (Bob, 5 Nov; design option F, notes/merge-train-trial.md): the MERGER's one
// long-running act, in its own session. A serial loop over merge(): every open job pull request into
// the tranche that is green on its head merges, in order.mjs's order (the release path, providers
// holding users, the shortest expected gate, any green over 45 min first) and after the providers
// it waits for (order.mjs providerHolds), through merge() itself, with
// its full re-gate of the merged result and every record as merge writes it. While one re-gate
// runs, the next pull request is prepared (merge's own checks, and a merge-tree onto the result
// being gated). One train runs: a lease on the state branch, renewed while it runs, checked again
// just before each land. The merger hands every exception to BOB (p3 send bob); it starts no job,
// triages nothing and rules on nothing. Each merge writes one row, the trial's measures.
import { appendFileSync, existsSync, mkdirSync, readFileSync, statfsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { checkRun, checkRunMany, checkRuns, checkRunsMany, comments, commentsMany, gateRuns, getPR, openPRs, verifyRow } from './github.mjs';
import { AGE_MIN, agedFromOf, exportsChangedAt, fullGateMinutes, holdLine, importsFromAt, median as med, orderQueue, providerHolds, usesGraph } from './order.mjs';
import { readModules } from './notice.mjs';
import { releaseModules } from './status.mjs';
import { branchModule, ledgerIds } from './ledger.mjs';
import { P3, READY_START, toolPin, wakeLine } from './job.mjs';
import { GATE_WAIT_MINUTES, firstActs, jobChecks, jobCostOf, merge, mergePR, mergePlain, reviewMeasures, reviewRounds } from './merge.mjs';
import { isJob } from './workflows.mjs';
import { fetchState, jsonl, readState, send, writeState } from './state.mjs';
import { approvalsHash } from './start.mjs';
import { createHash, randomBytes } from 'node:crypto';
import { Fail, fail, git, heartbeat, isShallow, loadConfig, now, repoSlug } from './util.mjs';
import { readAddress } from './roles.mjs';

// A stop the train must never write past or retry: a lost lease, changed approvals, the disk.
export class Stop extends Fail {}
const stop = (msg) => { throw new Stop(msg); };

export const TRAIN_FILE = 'metrics/train.jsonl'; // one row per merge the train tried
export const NOTES_FILE = 'metrics/train-notes.jsonl'; // a pull request's review and cost, per head
export const MERGER_FILE = 'metrics/merger.jsonl'; // lease takeovers, the merger's context
export const LEASE_FILE = 'merger/lease.json';
export const PLAIN_FILE = 'merger/plain.jsonl'; // plain pull requests queued for the train, and their withdrawals
export const TRAIN_USAGE = 'merge train --session <id> [--once] | merge train note <pr> ... | merge train beat --session <id> --context <pct> | merge train release --session <id> | merge train report';
export const LEASE = { renew: 5, expire: 15 }; // minutes
export const BASELINES = [
  { name: 'green -> merged, the simulation of 4-5 Nov (measure/merge-train-sim)', median: 8.7, p90: 33.7 },
  { name: 'complete -> merge row, the merge rows of 4-5 Nov', median: 11.0, worst: 85 },
];
// The disk budget (copy, 5 Nov ~02:00: BOB's eight merge loops died when the session's disk
// allowance filled). merge works in one worktree it removes when it ends (withTemp); before each
// merge the train needs this much free space, else it stops and says so, never mid-merge.
// The rows name the two measures apart (coordinator, 5 Nov): disk_free_mb, the free space before
// the merge, and disk_used_mb, what the merge left on disk (free before less free after). The
// rows before 5 Nov ~06:00 carried only the second, as disk_mb.
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
// It names the process as well (proc: pid, machine boot id, start time): a train killed without
// ending (coordinator, 5 Nov 07:18: 9 min lost) is retaken at once by a train of its own session
// on the same machine once that process is gone (no such pid, another start time, another boot);
// a live one is always refused, and an unread process waits for the lease time as before.
export function takeLease(root, cfg, session, token, { take = false, proc = procOf(process.pid), alive = procAlive } = {}) {
  return writeState(root, cfg.state_branch, `merger lease: ${session}`, (wt) => {
    const p = join(wt, LEASE_FILE);
    let cur = null;
    if (existsSync(p)) { try { cur = JSON.parse(readFileSync(p, 'utf8')); } catch { cur = null; } }
    const t = Date.now();
    const mine = cur?.session === session && cur?.token === token;
    const live = cur && Date.parse(cur.expires) > t;
    const runs = take && live && !mine && cur.session === session ? alive(cur.proc) : null;
    const dead = runs === false;
    if (!mine && live && !dead) (take ? fail : stop)(`the merge train's lease is held by ${cur.session}${cur.session === session ? ` (another train in this session${runs ? `, process ${cur.proc.pid}, still running` : ', its process not readable here, so it waits for the lease time'})` : ''} until ${cur.expires}: one train runs`);
    if (!take && !mine) stop(`the merger lost its lease (${cur ? `${cur.session} holds it` : 'none on the state branch'}): the train stops`);
    // A lease given back by merge train release is never renewed (review of PR 149): the train stops.
    if (!take && cur?.released) stop(`the merger lost its lease (released by merge train release at ${cur.released}): the train stops`);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify({ session, token, ...(proc ? { proc } : {}), at: now(), expires: new Date(t + LEASE.expire * MIN).toISOString().replace(/\.\d+Z$/, 'Z'), since: mine ? cur.since : now() }, null, 2) + '\n');
    if (take && cur && !mine) append(wt, MERGER_FILE, { at: now(), row: 'takeover', session, from: cur.session, expired: cur.expires, ...(dead ? { dead: cur.proc } : {}) });
    return { takeover: !!(take && cur && !mine), dead };
  });
}
// A process as /proc shows it: its pid, the machine's boot id, and its start time (clock ticks
// since boot, field 22 of stat), so a pid reused by another process reads as another. null: unread.
const BOOT = '/proc/sys/kernel/random/boot_id';
export function procOf(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const started = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
    return { pid, boot: readFileSync(BOOT, 'utf8').trim(), started };
  } catch { return null; }
}
// Whether the process a lease names still runs here: true, false (gone), or null (unknown: no
// process named, or this machine's /proc unread).
export function procAlive(p) {
  if (!p?.pid || !p.boot || !p.started) return null;
  let boot;
  try { boot = readFileSync(BOOT, 'utf8').trim(); } catch { return null; }
  if (boot !== p.boot) return false; // a session runs one machine at a time: that one is gone
  const now = procOf(p.pid);
  return !!now && now.started === p.started;
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
// merge train release --session <id>: a stopped train's lease given back at once by its own
// session, whatever process took it (account switch, 5 Nov: a stopped train's lease lapsed only
// after LEASE.expire minutes). Another session's lease is refused; none live, nothing is written.
export function releaseSessionLease(root, cfg, session, { log = console.log } = {}) {
  if (!/^session_[A-Za-z0-9]+$/.test(String(session))) fail('merge train release --session <your session id>: the session whose stopped train holds the lease');
  const read = (text) => { try { return JSON.parse(text || 'null'); } catch { return null; } };
  const check = (cur) => {
    if (!cur || !(Date.parse(cur.expires) > Date.now())) return false;
    if (cur.session !== session) fail(`the merge train's lease is ${cur.session}'s, to ${cur.expires}; only that session releases it; nothing was changed`);
    return true;
  };
  fetchState(root, cfg.state_branch, { fresh: true });
  if (!check(read(readState(root, cfg.state_branch, LEASE_FILE)))) { log(`no live lease of ${session}: nothing to release`); return { released: false }; }
  const { released } = writeState(root, cfg.state_branch, `merger lease released: ${session}`, (wt) => {
    const p = join(wt, LEASE_FILE);
    const cur = existsSync(p) ? read(readFileSync(p, 'utf8')) : null;
    if (!check(cur)) return { released: false };
    writeFileSync(p, JSON.stringify({ ...cur, expires: now(), released: now() }, null, 2) + '\n');
    append(wt, MERGER_FILE, { at: now(), row: 'release', session });
    return { released: true };
  });
  log(released ? `the merge train's lease of ${session} is released; a new train takes it at once` : `the lease of ${session} lapsed before the release: nothing to release`);
  return { released };
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

// The job pull requests green on their head and not held for a provider, in order.mjs's order. Read-only.
function ready(root, ctx, skip = new Set()) {
  const { cfg, slug, io } = ctx;
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root });
  const ids = ledgerIds(root, `origin/${cfg.tranche}`);
  const open = io.openPRs(slug, cfg.tranche);
  if (!open) fail(`could not read the pull requests into ${cfg.tranche}`);
  const out = [];
  const jobs = []; // every open job pull request into the tranche: drafts and gates running hold users too
  const look = [];
  for (const p of open) {
    if (p.base?.ref !== cfg.tranche || !branchModule(p.head?.ref, ids)) continue;
    if (p.base?.repo?.default_branch && p.base.repo.default_branch === cfg.tranche) continue; // never the default branch
    jobs.push({ n: p.number, id: branchModule(p.head.ref, ids), head: p.head.sha, ref: p.head.ref, draft: !!p.draft });
    if (skip.has(p.number) || p.draft) continue;
    look.push([p, jobs.at(-1)]);
  }
  // A green gate is read once per head and run (the loop reads every 15 s); any other state is read
  // again. Every gate not cached is read at once, then every green one's post job (5 Nov: read one
  // by one, they were most of a cold start's wait for its first pick).
  const green = (g) => g?.status === 'completed' && g.conclusion === 'success';
  const many = (shas, name) => { const u = [...new Set(shas)]; const m = new Map(); io.checkRunMany(slug, u.map((x) => [x, name])).forEach((x, i) => m.set(u[i], x)); return m; };
  const gates = many(look.map(([p]) => p.head.sha).filter((x) => !ctx.gates.has(x)), 'gate');
  const gateOf = (sha) => ctx.gates.get(sha) || gates.get(sha) || null;
  const posts = many(look.map(([p]) => p.head.sha).filter((x) => green(gateOf(x)) && !gateOf(x).post), 'post');
  for (const [p, job] of look) {
    const g = gateOf(p.head.sha);
    if (!green(g)) { ctx.gates.delete(p.head.sha); if (g?.status === 'completed') job.stuck = `its gate ended ${g.conclusion}`; continue; }
    // Its row is posted by the gate workflow's post job, after the gate: merge needs it.
    const post = g.post || posts.get(p.head.sha) || null;
    // The post job of this gate run: it starts only once the gate has ended.
    if (post?.status !== 'completed' || (post.started_at && g.completed_at && Date.parse(post.started_at) < Date.parse(g.completed_at))) continue;
    ctx.gates.set(p.head.sha, { ...g, post });
    const run = g.id ?? g.completed_at;
    if ((ctx.backoff.get(`${p.number}@${p.head.sha}`)?.until || 0) > Date.now()) { job.stuck = 'the train is backing off it'; continue; }
    // A head refused (and handed to BOB) waits for a new head or gate run, or a review note made since.
    const at = ctx.refused.get(`${p.number}@${p.head.sha}@${run}`);
    if (at && !ctx.notes.some((x) => x.row === 'note' && x.pr === p.number && x.sha === p.head.sha && x.by && x.by === ctx.bob && (x.reviewed || x.no_review) && x.at >= at)) { job.stuck = 'the train refused it on this head'; continue; }
    // ref: a user's head is fetched by it too (5 Nov: a cold clone fetched only providers' heads, so no user was held).
    out.push({ n: p.number, head: p.head.sha, ref: p.head.ref, run, id: branchModule(p.head.ref, ids), green_at: g.completed_at });
  }
  return order(root, ctx, out, jobs);
}

// The order and the provider hold (order.mjs), with what each reads cached by head or tranche tip.
// Every read that fails holds nothing and orders as unknown: the train never stalls on a read.
function order(root, ctx, cands, jobs) {
  const { cfg, slug, io } = ctx;
  if (!cands.length) { ctx.held = []; return cands; }
  const at = `refs/remotes/origin/${cfg.tranche}`;
  const tip = git(['rev-parse', at], { cwd: root }).trim();
  const c = (ctx.order ||= { tip: null, modules: null, release: null, exp: new Map(), imp: new Map(), mins: new Map(), runs: new Set(), seen: new Map(), heldAt: new Map(), said: new Set() });
  const say = (l) => { if (!c.said.has(l)) { c.said.add(l); ctx.log(l); } };
  if (c.tip !== tip) {
    c.tip = tip;
    c.exp.clear(); c.imp.clear(); // both read the tranche: its ledger entries, its modules, the merge-base
    loadOrderCache(root, cfg, tip, c); // what an earlier train in this clone read at this tip
    try { c.modules = readModules(root, cfg, at); } catch (e) { c.modules = null; say(`the modules file is unread at ${tip.slice(0, 10)} (${e.message}): nothing is held for a provider`); }
    c.release = null;
  }
  const openIds = new Set(jobs.map((j) => j.id));
  const key = [...openIds].sort().join(',');
  if (!c.release || c.release.key !== key) {
    let set = new Set();
    try { set = releaseModules(root, cfg, at, openIds); } catch (e) { say(`the release path is unread at ${tip.slice(0, 10)} (${e.message}): no pull request is ordered by it`); }
    c.release = { key, set };
  }
  // (d) a provider red on its head; (b) and (c) from git, on heads fetched once.
  const reds = new Map();
  // A provider that cannot land on its head (marked in ready) counts as red: it holds nothing.
  // An unreadable gate read throws (providerHolds: no hold, said once); no run yet, or one running, holds.
  const red = (p) => {
    if (p.stuck) return true;
    if (!reds.has(p.head)) {
      const rs = io.checkRuns(slug, p.head, 'gate');
      if (!Array.isArray(rs)) throw new Error(`its gate on ${p.head.slice(0, 10)} is unread`);
      const g = rs[0];
      reds.set(p.head, g?.status === 'completed' && g.conclusion !== 'success');
    }
    return reds.get(p.head);
  };
  const have = (j) => {
    if (git(['cat-file', '-e', `${j.head}^{commit}`], { cwd: root, allowFail: true }).code === 0) return;
    git(['fetch', '-q', 'origin', `+refs/heads/${j.ref}:refs/remotes/origin/${j.ref}`], { cwd: root, allowFail: true });
    if (git(['cat-file', '-e', `${j.head}^{commit}`], { cwd: root, allowFail: true }).code !== 0) throw new Error(`${j.ref} at ${j.head.slice(0, 10)} is not fetched`);
  };
  const size = c.exp.size + c.imp.size;
  const exportsChanged = (p) => { if (!c.exp.has(p.head)) { have(p); c.exp.set(p.head, exportsChangedAt(root, cfg, at, p)); } return c.exp.get(p.head); };
  const importsFrom = (u, p) => { const k = `${u.head}>${p.id}`; if (!c.imp.has(k)) { have(u); c.imp.set(k, importsFromAt(root, cfg, at, c.modules, u, p)); } return c.imp.get(k); };
  const graph = usesGraph(c.modules);
  let holds = new Map();
  if (c.modules) {
    // Every head the hold may read and this clone lacks, in one fetch (one by one, each was a round trip).
    fetchHeads(root, holdHeads(cands, jobs, graph.usesOf));
    // The gate reads of every provider an edge holds on, at once: a first pass finds them (its git
    // reads are cached for the second), the second is the hold as before.
    const want = new Set();
    providerHolds(cands, jobs, { ...graph, red: (p) => { if (!p.stuck && !reds.has(p.head)) want.add(p.head); return false; }, exportsChanged, importsFrom, note: () => {} });
    const ws = [...want];
    io.checkRunsMany(slug, ws.map((x) => [x, 'gate'])).forEach((rs, i) => { if (Array.isArray(rs)) reds.set(ws[i], rs[0]?.status === 'completed' && rs[0].conclusion !== 'success'); });
    holds = providerHolds(cands, jobs, { ...graph, red, exportsChanged, importsFrom, note: say });
  }
  if (c.exp.size + c.imp.size !== size) saveOrderCache(root, cfg, tip, c);
  const now = Date.now();
  ctx.held = [];
  for (const u of cands) {
    const why = holds.get(u.n);
    const was = c.seen.get(u.n);
    if (why) {
      const l = holdLine(u, why);
      if (was !== l) ctx.log(l);
      c.seen.set(u.n, l);
      c.heldAt.set(u.n, now);
      ctx.held.push({ pr: u.n, module: u.id, providers: why.map((w) => ({ module: w.provider, pr: w.pr })) });
    } else if (was) { ctx.log(`PR ${u.n} (${u.id}) is no longer held: its providers merged, went red, or no longer change what it imports`); c.seen.delete(u.n); }
  }
  // Each module's full-gate minutes, from the gate rows on its pull requests (read once per head).
  const unread = cands.filter((u) => !c.runs.has(`${u.n}@${u.head}`));
  const read = io.commentsMany(slug, unread.map((u) => u.n));
  for (const [i, u] of unread.entries()) {
    let runs = [];
    try { if (read[i] === null) continue; runs = gateRuns(read[i] || []); } catch { continue; }
    c.runs.add(`${u.n}@${u.head}`);
    const m = c.mins.get(u.id) || new Map();
    for (const r of runs) for (const x of fullGateMinutes([r])) m.set(`${r.sha}@${r.at ?? r.run_id ?? ''}`, x);
    c.mins.set(u.id, m);
  }
  const named = new Set(Array.isArray(cfg.release_path) ? cfg.release_path : []);
  const free = cands.filter((u) => !holds.has(u.n)).map((u) => ({
    ...u,
    named: named.has(u.id),
    release: c.release.set.has(u.id),
    holds: ctx.held.filter((h) => h.providers.some((p) => p.pr === u.n)).length,
    gate_min: med([...(c.mins.get(u.id)?.values() || [])]),
  }));
  const agedFrom = agedFromOf(c.heldAt);
  const known = med([...c.mins.values()].map((m) => med([...m.values()])));
  return orderQueue(free, { now, agedFrom, known }).map((u) => ({ ...u, aged: now - agedFrom(u) > AGE_MIN * MIN }));
}

// The heads the provider hold can read: each candidate with an open provider in its `uses`, and
// those providers' open pull requests.
function holdHeads(cands, jobs, usesOf) {
  const byId = new Map();
  for (const j of jobs) byId.set(j.id, [...(byId.get(j.id) || []), j]);
  const out = new Map();
  for (const u of cands) {
    const ps = (usesOf.get(u.id) || []).flatMap((id) => byId.get(id) || []).filter((p) => p.n !== u.n);
    if (!ps.length) continue;
    out.set(u.head, u);
    for (const p of ps) out.set(p.head, p);
  }
  return [...out.values()];
}
// The heads this clone lacks, fetched in one call; any it could not fetch is left to have(), one by one.
function fetchHeads(root, js) {
  const list = js.filter((j) => j.ref && /^[0-9a-f]{40}$/.test(String(j.head)));
  if (!list.length) return;
  const r = git(['cat-file', '--batch-check'], { cwd: root, allowFail: true, input: list.map((j) => `${j.head}^{commit}`).join('\n') + '\n' });
  const lines = r.stdout.split('\n');
  const miss = [...new Set(list.filter((j, i) => r.code !== 0 || /missing|ambiguous/.test(lines[i] || 'missing')).map((j) => j.ref))];
  if (miss.length) git(['fetch', '-q', 'origin', ...miss.map((ref) => `+refs/heads/${ref}:refs/remotes/origin/${ref}`)], { cwd: root, allowFail: true });
}
// The hold's git reads (export change by head, import by user head and provider), kept in the clone
// by tranche tip and config, so a restarted train at the same tip reads none of them again.
const ORDER_CACHE = 'p3-train-order.json';
// The tool's own commit is in the key: a fixed reader never reuses an older one's answers.
const cacheKey = (cfg, tip) => `${tip}:${toolPin()}:${createHash('sha256').update(JSON.stringify(cfg)).digest('hex').slice(0, 16)}`;
const cachePath = (root) => git(['rev-parse', '--absolute-git-dir'], { cwd: root }) + '/' + ORDER_CACHE;
function loadOrderCache(root, cfg, tip, c) {
  try {
    const x = JSON.parse(readFileSync(cachePath(root), 'utf8'));
    if (x?.key !== cacheKey(cfg, tip)) return;
    for (const [k, v] of Object.entries(x.exp || {})) if (typeof v === 'boolean') c.exp.set(k, v);
    for (const [k, v] of Object.entries(x.imp || {})) if (typeof v === 'boolean') c.imp.set(k, v);
  } catch { /* none, or unread: read again */ }
}
function saveOrderCache(root, cfg, tip, c) {
  if (isShallow(root)) return; // a cut history can read wrong without failing: never kept
  try { writeFileSync(cachePath(root), JSON.stringify({ key: cacheKey(cfg, tip), exp: Object.fromEntries(c.exp), imp: Object.fromEntries(c.imp) })); } catch { /* a cache only */ }
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
    if (ctx.pipeline && ctx.prepared === null && /^waiting for (the )?gate/.test(l)) prepare(root, ctx, c.n);
  };
  const free = ctx.diskFree(root);
  if (free < ctx.diskMin) stop(`STOP: ${free} MB free, under the merger's disk budget of ${ctx.diskMin} MB; nothing was started for PR ${c.n}. Delete what is not needed (old clones, caches), then run the train again`);
  const row = { at: now(), row: 'merge', session: ctx.session, pr: c.n, module: c.id, head: c.head, run: c.run, green_at: c.green_at, queue, idle_min: idle, prepared: !!prep, prep_min: prep?.prep_min ?? null, named: !!c.named, release: !!c.release, expected_gate_min: c.gate_min ?? null, aged: !!c.aged, holds: c.holds || 0, held: ctx.held || [], disk_free_mb: free };
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
  row.disk_used_mb = free - ctx.diskFree(root); // what this merge left on disk (the worktree is gone by now); not the free space, disk_free_mb
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

// Plain pull requests through the train (build train-plain, 5 Nov; notes/train-plain-options.md,
// option A). Every land of the train moves the tranche, so a plain pull request merged from another
// session went stale before its gate ended (copy PR 338 twice; the ledger PR 465 held 7 starts).
// While a train holds a live lease, `merge <pr> --plain` into the tranche queues the pull request
// (a row on the state branch, with its review as given) and waits for the train's land or
// refusal, printing what mergePlain prints. The train takes queued plain pull requests before
// any job, oldest first, so none waits behind a release-path or aged job: it merges the tranche
// into the head (only a clean merge; a conflict goes to BOB), and lands it through mergePlain
// itself, every check run again on the head that lands. The head that lands must reach the head
// queued only through such merges of tranche commits, so the change reviewed is the change landed.
export function liveLease(root, cfg) {
  fetchState(root, cfg.state_branch, { fresh: true });
  let cur = null;
  try { cur = JSON.parse(readState(root, cfg.state_branch, LEASE_FILE) || 'null'); } catch { cur = null; }
  return cur && !cur.released && Date.parse(cur.expires) > Date.now() ? cur : null;
}
const plainEnds = (rows) => new Set(rows.filter((r) => r.row === 'plain' && ['merged', 'refused', 'withdrawn'].includes(r.result)).map((r) => r.queue));
// The branches the train may bring up to the tranche (cold review of PR 151): a plain pull
// request's own head in this repository, never main, the default branch, the tranche, the state
// branch or a job's branch. Any other goes to mergePlain as before, which judges it.
export const plainBranch = (cfg, slug, pr) => {
  const ref = String(pr.head?.ref || '');
  return !!ref && pr.head?.repo?.full_name === slug && !isJob(ref) && ![cfg.tranche, cfg.state_branch, 'main', pr.base?.repo?.default_branch].includes(ref);
};
// Before the train takes it, a queued row waits at most one job's whole gate wait (a job merge in
// flight is never cut short) beyond the caller's --minutes; the --minutes count from the take.
const takeBy = (minutes, wait = GATE_WAIT_MINUTES) => new Date(Date.now() + (minutes + wait) * MIN).toISOString();
// A waiting caller renews its row every PLAIN_RENEW minutes (a renew row); a taken row whose caller
// has not renewed it within one job gate's wait has lost its caller (killed, no withdrawal: review
// of PR 151) and ends, withdrawn, so it never holds the train again.
export const PLAIN_RENEW = 5; // minutes
export const plainSeen = (rows, id) => Math.max(...rows.filter((r) => r.id === id && (r.row === 'queue' || r.row === 'renew')).map((r) => Date.parse(r.at)).filter(Number.isFinite), -Infinity);
// Only a row whose caller renews (renews: true) can lose it: an older caller never renews, and its row ends as before.
const callerGone = (rows, id, t = Date.now()) => rows.some((r) => r.row === 'queue' && r.id === id && r.renews) && plainSeen(rows, id) + GATE_WAIT_MINUTES * MIN < t;

// merge <pr> --plain, the caller's side. Without a live lease, or for any pull request not into the
// tranche, it is mergePlain as before. pause: the wait between reads (a test runs the train in it).
export function plainViaTrain(root, n, opts = {}) {
  const { log = console.log, minutes = GATE_WAIT_MINUTES, every = 15000 } = opts;
  const cfg = loadConfig(root);
  const slug = opts.slug || repoSlug(root);
  const io = { getPR, ...(opts.io || {}) };
  const direct = () => mergePlain(root, n, opts);
  const pr = io.getPR(slug, n);
  if (pr.base?.ref !== cfg.tranche || pr.state !== 'open' || pr.draft || !plainBranch(cfg, slug, pr)) return direct(); // mergePlain merges or refuses it as before
  const lease = liveLease(root, cfg);
  if (!lease) return direct();
  const rounds = reviewRounds(opts); // a review not given is refused here, before anything is queued
  const id = randomBytes(6).toString('hex');
  const by = (process.env.CLAUDE_CODE_REMOTE_SESSION_ID || '').replace(/^cse_/, 'session_') || null;
  const q = { at: now(), row: 'queue', id, pr: Number(n), head: pr.head.sha, ref: pr.head.ref, by, reviewed: opts.reviewed || null, no_review: opts.noReview || null, rounds: rounds.rounds, decision: rounds.decision || null, as: opts.as ?? 'bob', take_by: takeBy(minutes, opts.queueMinutes), renews: true };
  writeState(root, cfg.state_branch, `merge train: PR ${n} queued (plain)`, (wt) => append(wt, PLAIN_FILE, q));
  log(`the merge train (${lease.session}) holds the tranche: PR ${n} is queued for it at ${q.head.slice(0, 10)}, before any job pull request; waiting for its land (up to ${minutes} min once the train takes it, and up to one job's gate wait more until then)`);
  const pause = opts.pause || (() => sleep(every));
  const withdraw = (why) => writeState(root, cfg.state_branch, `merge train: PR ${n} withdrawn (plain)`, (wt) => append(wt, PLAIN_FILE, { at: now(), row: 'withdraw', id, pr: Number(n), why }));
  const read = () => { fetchState(root, cfg.state_branch, { fresh: true }); return jsonl(readState(root, cfg.state_branch, TRAIN_FILE)).filter((r) => r.row === 'plain' && r.queue === id); };
  const ended = (rows) => rows.find((r) => ['merged', 'refused', 'withdrawn'].includes(r.result));
  const report = (end) => {
    if (end.result === 'merged') {
      log(`merged pull request ${n} at ${end.sha} (${end.merged_at})`);
      if (end.what) log(wakeLine(end.what, q.as));
      return { merged: true, sha: end.sha, checks: end.checks || [], wake: end.wake || null, what: end.what || null, train: true };
    }
    return null;
  };
  let said = null;
  let rows = [];
  let withdrawn = false;
  let renewed = Date.now();
  const renewEvery = (opts.renewMinutes ?? PLAIN_RENEW) * MIN;
  try {
    for (;;) {
      pause();
      if (Date.now() - renewed >= renewEvery) {
        // A renewal not pushed is tried again at the next read; the row lives a gate wait past the last one.
        try { writeState(root, cfg.state_branch, `merge train: PR ${n} renewed (plain)`, (wt) => append(wt, PLAIN_FILE, { at: now(), row: 'renew', id, pr: Number(n) })); renewed = Date.now(); } catch (e) { if (!(e instanceof Fail)) throw e; }
      }
      rows = read();
      const end = ended(rows);
      if (end?.result === 'merged') return report(end);
      if (end) fail(`the merge train did not merge pull request ${n}: ${end.why}`);
      const last = rows.at(-1);
      if (last && last.result !== 'taken' && last.at !== said) { said = last.at; log(`the train tries PR ${n} again later: ${last.why}`); }
      const taken = rows.find((r) => r.result === 'taken');
      const until = taken ? Date.parse(taken.at) + minutes * MIN : Date.parse(q.take_by);
      const gone = !liveLease(root, cfg);
      if (gone || Date.now() > until) {
        withdraw(gone ? 'the train stopped' : taken ? `not landed within ${minutes} min of its take` : 'not taken within one job gate wait and --minutes');
        withdrawn = true;
        // A land in flight as the withdrawal was written stands (beforeLand was already past):
        // while the train has it, wait for its own row, a bounded while; then read the pull request.
        const settle = Date.now() + 5 * MIN;
        while (taken && !gone && !ended(rows) && Date.now() < settle) { pause(); rows = read(); }
        const fin = ended(rows);
        if (fin?.result === 'merged') return report(fin);
        const p = io.getPR(slug, n);
        if (p.merged) { log(`merged pull request ${n} at ${p.merge_commit_sha} (by the train)`); return { merged: true, sha: p.merge_commit_sha, checks: [], wake: null, what: null, train: true }; }
        if (gone) { log(`the merge train no longer holds the tranche; PR ${n} is withdrawn from its queue and merged here`); return direct(); }
        fail(`the merge train did not land pull request ${n} ${taken ? `within ${minutes} min of taking it` : 'before its queue time ran out'}; it is withdrawn from the queue and nothing was merged; run merge again`);
      }
    }
  } catch (e) {
    // A caller that stops on an error leaves no row for the train to land unwatched.
    if (!withdrawn && !ended(rows)) { try { withdraw(`the caller stopped: ${String(e.message || e).split('\n')[0].slice(0, 160)}`); } catch { /* the row's take_by still ends it */ } }
    throw e;
  }
}

// The queued plain pull requests the train has not ended, oldest first (a withdrawn one never
// lands: its land checks it again, beforeLand). Read-only.
function plainReady(root, ctx) {
  const rows = jsonl(readState(root, ctx.cfg.state_branch, PLAIN_FILE));
  const trains = jsonl(readState(root, ctx.cfg.state_branch, TRAIN_FILE));
  const ended = plainEnds(trains);
  const gone = new Set(rows.filter((r) => r.row === 'withdraw').map((r) => r.id));
  ctx.withdrawn = gone;
  const taken = new Set(trains.filter((r) => r.row === 'plain' && r.result === 'taken').map((r) => r.queue));
  // A row whose caller is gone (killed: no withdrawal) ends at its take_by before it is taken, and
  // and, taken or not, when its caller renews and has not within one job gate's wait (ctx.plainExpired).
  const late = (r) => !taken.has(r.id) && Date.parse(r.take_by) < Date.now();
  const open = rows.filter((r) => r.row === 'queue' && !ended.has(r.id) && !gone.has(r.id) && !late(r));
  ctx.plainExpired = open.filter((r) => callerGone(rows, r.id)); // taken or not: a renewing caller that stopped is gone
  // Its tries, and the wait before the next, are on its retry rows: a restarted train keeps them.
  const retries = (id) => trains.filter((x) => x.row === 'plain' && x.queue === id && x.result === 'retry');
  for (const r of open) { const t = retries(r.id); r.tries = t.length; r.retry_at = t.at(-1)?.retry_at || null; }
  return open.filter((r) => !ctx.plainExpired.includes(r) && !(r.retry_at && Date.parse(r.retry_at) > Date.now()))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}
// A taken row whose caller is gone, ended once with its own row (the caller, if it ever reads, is told).
function expirePlain(root, ctx) {
  for (const q of ctx.plainExpired || []) {
    const why = `its caller did not renew it within ${GATE_WAIT_MINUTES} min (one job gate's wait): withdrawn, nothing was landed`;
    writeState(root, ctx.cfg.state_branch, `merge train: PR ${q.pr} withdrawn (plain, caller gone)`, (wt) => append(wt, TRAIN_FILE, { at: now(), row: 'plain', session: ctx.session, queue: q.id, pr: q.pr, head: q.head, result: 'withdrawn', why, tries: q.tries || 0 }));
    ctx.log(`PR ${q.pr} (plain) ${why}`);
  }
  ctx.plainExpired = [];
}

// The head the train lands: the queued head, or it with the tranche merged in (cleanly, by the
// train). A head that moved by anything else is refused: the review was of the queued head.
const parentsOf = (root, c) => git(['rev-list', '--parents', '-n', '1', c], { cwd: root }).trim().split(' ').slice(1);
const ancestor = (root, a, b) => git(['merge-base', '--is-ancestor', a, b], { cwd: root, allowFail: true }).code === 0;
const cleanTree = (root, a, b) => { const r = git(['merge-tree', '--write-tree', a, b], { cwd: root, allowFail: true }); return r.code === 0 ? r.stdout.trim().split('\n')[0] : null; };
export function plainHead(root, cfg, queued, sha) {
  const at = `refs/remotes/origin/${cfg.tranche}`;
  for (let c = sha; c !== queued;) {
    const p = parentsOf(root, c);
    if (p.length !== 2 || !ancestor(root, p[1], at) || cleanTree(root, p[0], p[1]) !== git(['rev-parse', `${c}^{tree}`], { cwd: root }).trim()) return false;
    c = p[0];
  }
  return true;
}
function syncPlain(root, ctx, q) {
  const { cfg, slug, io } = ctx;
  const pr = io.getPR(slug, q.pr);
  if (pr.state !== 'open') fail(`pull request ${q.pr} is ${pr.merged ? 'merged' : pr.state}`);
  if (pr.base?.ref !== cfg.tranche) fail(`pull request ${q.pr} was retargeted to ${pr.base?.ref}`);
  if (!plainBranch(cfg, slug, pr)) fail(`pull request ${q.pr}'s head ${pr.head?.repo?.full_name || '?'}:${pr.head?.ref} is not a plain branch of ${slug} the train may bring up to date; merge it with merge --plain when no train runs`);
  const ref = pr.head.ref;
  const at = `refs/remotes/origin/${cfg.tranche}`;
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:${at}`, `+refs/heads/${ref}:refs/remotes/origin/${ref}`], { cwd: root });
  if (git(['rev-parse', `refs/remotes/origin/${ref}`], { cwd: root }).trim() !== pr.head.sha) fail(`${ref} moved since GitHub reported ${pr.head.sha.slice(0, 10)}`);
  if (!plainHead(root, cfg, q.head, pr.head.sha)) fail(`${ref} is at ${pr.head.sha.slice(0, 10)}, not the head queued (${q.head.slice(0, 10)}) with only the tranche merged in: queue it again with its review (merge ${q.pr} --plain ...)`);
  if (ancestor(root, at, pr.head.sha)) return pr.head.sha;
  const tree = cleanTree(root, pr.head.sha, at);
  if (!tree) fail(`${ref} conflicts with ${cfg.tranche}: bring it up to date by hand, then queue it again`);
  const m = git(['commit-tree', tree, '-p', pr.head.sha, '-p', at, '-m', `Bring ${ref} up to ${cfg.tranche} (merge train, for PR ${q.pr})`], { cwd: root }).trim();
  const push = git(['push', '-q', 'origin', `${m}:refs/heads/${ref}`], { cwd: root, allowFail: true });
  if (push.code !== 0) fail(`${ref} was not pushed (${push.stderr.trim().split('\n').pop()}): it moved since GitHub reported ${pr.head.sha.slice(0, 10)}`);
  ctx.log(`brought ${ref} up to ${cfg.tranche} at ${m.slice(0, 10)} for PR ${q.pr}; its checks run on that head`);
  // GitHub shows the new head within seconds; mergePlain reads it.
  const until = Date.now() + 2 * MIN;
  while (io.getPR(slug, q.pr).head?.sha !== m) { if (Date.now() > until) fail(`GitHub does not show ${m.slice(0, 10)} as the head of pull request ${q.pr} after 2 min`); sleep(ctx.every ?? 5000); }
  return m;
}
// What a plain merge is tried again for (GitHub slow or a moved base), else refused and sent to BOB.
const PLAIN_AGAIN = /moved since GitHub reported|moved while|moved past|changed while its base moved|still running on|has not said whether|could not read|could not be read|was not pushed|does not show|not up to date|base moved/i;
function plainOne(root, ctx, q, { queue, idle }) {
  const { cfg, slug, log } = ctx;
  const started = Date.now();
  const tick = (l) => {
    log(l);
    ctx.renew();
    if (ctx.pipeline && ctx.prepared === null && /^waiting for (the )?gate/.test(l)) prepare(root, ctx, q.pr);
  };
  const free = ctx.diskFree(root);
  if (free < ctx.diskMin) stop(`STOP: ${free} MB free, under the merger's disk budget of ${ctx.diskMin} MB; nothing was started for PR ${q.pr}. Delete what is not needed (old clones, caches), then run the train again`);
  const row = { at: now(), row: 'plain', session: ctx.session, queue: q.id, pr: q.pr, head: q.head, queued_at: q.at, waited_min: mins(Date.parse(q.at), Date.now()), jobs_ready: queue, idle_min: idle, disk_free_mb: free };
  try {
    if (!ctx.plainTaken.has(q.id)) {
      writeState(root, cfg.state_branch, `merge train: PR ${q.pr} taken (plain)`, (wt) => append(wt, TRAIN_FILE, { at: now(), row: 'plain', session: ctx.session, queue: q.id, pr: q.pr, result: 'taken' }));
      ctx.plainTaken.add(q.id);
    }
    const p = ctx.io.getPR(slug, q.pr);
    if (p.merged) { Object.assign(row, { result: 'merged', sha: p.merge_commit_sha, merged_at: now(), elsewhere: true }); }
    else {
      const head = syncPlain(root, ctx, q);
      const withdrawn = () => {
        fetchState(root, cfg.state_branch, { fresh: true });
        const pr = jsonl(readState(root, cfg.state_branch, PLAIN_FILE));
        if (pr.some((r) => r.row === 'withdraw' && r.id === q.id)) fail(`pull request ${q.pr} was withdrawn from the queue by its caller; nothing was landed`);
        if (callerGone(pr, q.id)) fail(`pull request ${q.pr} was withdrawn from the queue: its caller did not renew it within ${GATE_WAIT_MINUTES} min; nothing was landed`);
      };
      const r = mergePlain(root, q.pr, { reviewed: q.reviewed || undefined, noReview: q.no_review || undefined, rounds: q.rounds, decision: q.decision || undefined, as: q.as, head, slug, io: ctx.io, minutes: ctx.minutes, every: ctx.every, wait: ctx.wait, log: tick, beforeLand: () => { leaseHeld(root, cfg, ctx.session, ctx.token, ctx.approvals); withdrawn(); } });
      Object.assign(row, { result: 'merged', sha: r.sha, landed: head, merged_at: now(), checks: r.checks, wake: r.wake || null, what: r.what || null });
    }
  } catch (e) {
    if (!(e instanceof Fail) || e instanceof Stop) throw e;
    const why = e.message.split('\n')[0].slice(0, 300);
    const b = { tries: (q.tries || 0) + 1 }; // the retry rows' count, kept across restarts
    if (/withdrawn from the queue/.test(why)) row.result = 'withdrawn';
    else if (PLAIN_AGAIN.test(why) && b.tries < RETRIES_TO_BOB) {
      row.result = 'retry';
      b.until = Date.now() + Math.min(8, 2 ** (b.tries - 1)) * MIN;
      row.retry_at = new Date(b.until).toISOString();
      log(`PR ${q.pr} (plain) is tried again in ${Math.round((b.until - Date.now()) / MIN)} min: ${why}`);
    } else {
      row.result = 'refused';
      const text = `PR ${q.pr} (plain, queued${q.by ? ` by ${q.by}` : ''}) was not merged by the train: ${why}${b.tries > 1 ? ` (${b.tries} tries)` : ''}`;
      log(`to BOB: ${text}`);
      try { send(root, cfg.state_branch, { from: 'merger', to: 'bob', text, log }); } catch (x) { if (!(x instanceof Fail)) throw x; log(`the message to BOB was not recorded (${x.message}); tell BOB: ${text}`); }
    }
    row.why = why;
    row.tries = b.tries;
  }
  row.minutes = mins(started, Date.now());
  writeState(root, cfg.state_branch, `merge train: PR ${q.pr} ${row.result} (plain)`, (wt) => append(wt, TRAIN_FILE, row));
  if (row.result === 'merged') log(`merged PR ${q.pr} (plain) at ${String(row.sha).slice(0, 10)}, queued ${row.waited_min} min before it was taken`);
  ctx.rows.push(row);
  return row;
}

// merge train [--once] --session <id>: the loop; --once merges at most one pull request.
export function train(root, opts = {}) {
  const { once = false, log = console.log, idleEvery = 15000 } = opts;
  const cfg = loadConfig(root);
  const slug = opts.slug || repoSlug(root);
  // The lease is taken only on an explicit --session (BOB ran it bare to read its usage, 5 Nov 03:21,
  // and the container's own id started a train): never the environment's.
  const session = opts.session;
  if (!/^session_[A-Za-z0-9]+$/.test(String(session))) fail(`usage: ${TRAIN_USAGE}; the train takes a lease, so --session <your session id> is required and nothing was started`);
  if (!cfg.tranche || cfg.tranche === 'main') fail(`the tranche is ${JSON.stringify(cfg.tranche)}: the merge train never merges into main`);
  const io = { getPR, comments, checkRun, checkRuns, mergePR, openPRs, verify: (s, r, c) => verifyRow(s, r, c), ...(opts.io || {}) };
  // The batched reads: GitHub's at once, or, where a caller gives its own single read, that one in turn.
  const given = opts.io || {};
  if (!given.checkRunMany) io.checkRunMany = given.checkRun ? (s, pairs) => pairs.map(([sha, name]) => io.checkRun(s, sha, name)) : checkRunMany;
  if (!given.checkRunsMany) io.checkRunsMany = given.checkRuns ? (s, pairs) => pairs.map(([sha, name]) => io.checkRuns(s, sha, name)) : checkRunsMany;
  if (!given.commentsMany) io.commentsMany = given.comments ? (s, ns) => ns.map((n) => { try { return io.comments(s, n) || []; } catch { return null; } }) : commentsMany;
  const ctx = { cfg, slug, io, log, session, minutes: opts.minutes || GATE_WAIT_MINUTES, every: opts.every, wait: opts.wait, pipeline: opts.pipeline ?? !once, diskFree: opts.diskFree || diskFreeMb, diskMin: opts.diskMinMb ?? DISK_MIN_MB, refused: new Map(), backoff: new Map(), plainTaken: new Set(), bob: undefined, rows: [], gates: new Map(), prepared: null, notes: [] };
  ctx.token = randomBytes(8).toString('hex');
  ctx.onQueue = opts.onQueue; // a test reads the queue each round
  ctx.noteFor = (c) => noteFor(ctx.notes, c.n, c.head, ctx.bob);
  const { takeover, dead } = takeLease(root, cfg, session, ctx.token, { take: true });
  ctx.renewed = Date.now();
  ctx.renew = () => { if (Date.now() - ctx.renewed >= LEASE.renew * MIN) { takeLease(root, cfg, session, ctx.token); ctx.renewed = Date.now(); } };
  // Renewed under every command the train runs, not only at its lines (util.mjs heartbeat). A lost
  // lease stops the train there; a renewal that could not be pushed is tried at the next command.
  const off = heartbeat(() => { try { ctx.renew(); } catch (e) { if (e instanceof Stop || !(e instanceof Fail)) throw e; ctx.renewed = Date.now() - Math.max(0, LEASE.renew * MIN - 30000); } }); // a failed push: tried again in 30 s
  // Heads refused by an earlier train wait as this one's would (a restart re-sends nothing).
  try { if (fetchState(root, cfg.state_branch, { fresh: true })) for (const x of jsonl(readState(root, cfg.state_branch, TRAIN_FILE))) if (x.result === 'refused' && x.head) ctx.refused.set(`${x.pr}@${x.head}@${x.run}`, x.at); } catch { /* unread: tried again */ }
  log(`merge train: lease held by ${session}${dead ? ' (taken over from this session\'s train that is no longer running)' : takeover ? ' (taken over from an expired lease)' : ''}`);
  try {
    // A shallow clone cuts the history the provider hold reads (git merge-base of the tranche and a
    // provider's head fails, and the hold reads "not held" for every provider: 5 Nov 07:04, the
    // MERGER's session clone). Unshallow it once, here, after the lease and before the loop.
    if (isShallow(root)) {
      const u = git(['fetch', '-q', '--unshallow', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root, allowFail: true });
      log(u.code === 0 ? 'merge train: this clone was shallow; unshallowed once' : `merge train: this clone is shallow and could not be unshallowed (${u.stderr.trim().split('\n').pop()}); provider holds read as not held`);
    }
    git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root });
    ctx.approvals = approvalsHash(root, `refs/remotes/origin/${cfg.tranche}`);
    return loop(root, ctx, { once, idleEvery, rounds: opts.rounds });
  } catch (e) {
    ctx.lost = e instanceof Stop && /lease/.test(e.message);
    throw e;
  } finally {
    off();
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
    // A queued plain pull request goes before every job (its caller waits): oldest first.
    const plain = plainReady(root, ctx);
    expirePlain(root, ctx);
    const list = plain.length ? [] : ready(root, ctx);
    const first = list.find((c) => c.n === ctx.prepared?.n) || list[0];
    ctx.onQueue?.(list);
    if (plain.length) {
      plainOne(root, ctx, plain[0], { queue: plain.length, idle: mins(idleFrom, Date.now()) });
      idleFrom = Date.now();
    } else if (first) {
      mergeOne(root, ctx, first, { queue: list.length, idle: mins(idleFrom, Date.now()) });
      idleFrom = Date.now();
    } else ctx.prepared = null;
    if (once || --rounds <= 0) return { rows: ctx.rows }; // rounds: a bounded run, for tests
    if (Math.floor(Date.now() / 36e5) !== hour) { hour = Math.floor(Date.now() / 36e5); log(`hourly: record your context: ${P3} merge train beat --session ${session} --context <percent>`); }
    if (!first && !plain.length) sleep(idleEvery);
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
const used = (r) => r.disk_used_mb ?? r.disk_mb; // disk_mb: the rows before 5 Nov ~06:00, the same measure
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
    disk_mb_per_merge: { median: r1(median(m.map(used))), worst: m.some((r) => Number.isFinite(used(r))) ? r1(Math.max(...m.map(used).filter(Number.isFinite))) : 'unmeasured' },
    disk_free_mb_least: m.some((r) => Number.isFinite(r.disk_free_mb)) ? Math.min(...m.map((r) => r.disk_free_mb).filter(Number.isFinite)) : 'unmeasured',
    held_for_providers: new Set(m.flatMap((r) => (r.held || []).map((h) => h.pr))).size,
    lease_takeovers: merger.filter((r) => r.row === 'takeover').length,
    push_tries: { max: m.length ? Math.max(...m.map((r) => r.push_tries || 1)) : 'unmeasured', over_one: m.filter((r) => (r.push_tries || 1) > 1).length },
    merger_context_per_hour: span > 0 ? r1((ctxRows.at(-1).context - ctxRows[0].context) / span) : 'unmeasured',
  };
}
export const trainLines = (s) => [
  `Merge train: ${s.merged} merged, ${s.refused} handed to BOB, ${s.retried} tries again later; green -> merged median ${s.green_to_merged.median} min, p90 ${s.green_to_merged.p90}, worst ${s.green_to_merged.worst}. Baselines: ${s.baselines.map((b) => `${b.name}: median ${b.median}${b.p90 ? `, p90 ${b.p90}` : ''}${b.worst ? `, worst ${b.worst}` : ''}`).join('; ')}.`,
  `Prepared while the previous gate ran: ${s.prepared_share}% (prep median ${s.prep_minutes_median} min); queue depth as each merge neared its end ${JSON.stringify(s.queue_at_merge_end)}; idle gaps ${s.idle_gaps_min.total} min (worst ${s.idle_gaps_min.worst}); disk used per merge median ${s.disk_mb_per_merge.median} MB (worst ${s.disk_mb_per_merge.worst}), least free before a merge ${s.disk_free_mb_least} MB; ${s.held_for_providers} PR(s) held for a provider; lease takeovers ${s.lease_takeovers}; state-branch tries max ${s.push_tries.max}, ${s.push_tries.over_one} over one; merger context ${s.merger_context_per_hour}%/h.`,
];
