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
import { baseEverChanged, checkRun, checkRunMany, checkRuns, checkRunsMany, comments, commentsMany, compare, createPR, editPR, gateRuns, getPR, openPRs, prsFromBranch, verifyRow } from './github.mjs';
import { AGE_MIN, agedFromOf, exportsChangedAt, fullGateMinutes, holdLine, importsFromAt, median as med, orderQueue, providerHolds, usesGraph } from './order.mjs';
import { readModules } from './notice.mjs';
import { CLOSED_FILE, releaseModules } from './status.mjs';
import { branchModule, ledgerIds, readLedgerTexts } from './ledger.mjs';
import { P3, READY_FIRST, READY_START, bobWake, toolPin } from './job.mjs';
import { owe, readAuto, starterLive } from './hold.mjs';
import { GATE_CAP_MINUTES, GATE_WAIT_MINUTES, attemptStart, deepenToBase, firstActs, jobChecks, jobCostOf, merge, mergePR, mergePlain, mergedResult, pinWake, printWake, reviewCostOf, reviewMeasures, reviewRounds, reviewSessions } from './merge.mjs';
import { diffNames } from './gate.mjs';
import { rowsAt } from './metrics.mjs';
import { TRAIN_NOTES, TRAIN_ROWS } from './stuck.mjs';
import { admit, chainEnd, firstRed, nextSeq, onHeadMoved, onLand, onRed, onTrancheMoved, restore, specHead, specState } from './window.mjs';
import { isJob } from './workflows.mjs';
import { fetchState, jsonl, readState, send, wakeOnce, writeState } from './state.mjs';
import { INFLIGHT_QUEUE_MIN, endHold, readHolds, startHold, unendedHold } from './inflight.mjs';
import { approvalsHash } from './start.mjs';
import { createHash, randomBytes } from 'node:crypto';
import { DEEP_MARK, Fail, SERVER_ERROR, fail, fetchJobRefs, git, heartbeat, isRecordPath, isShallow, loadConfig, markedDeep, now, repoSlug } from './util.mjs';
import { readAddress } from './roles.mjs';

// A stop the train must never write past or retry: a lost lease, changed approvals, the disk.
export class Stop extends Fail {}
const stop = (msg) => { throw new Stop(msg); };

export const TRAIN_FILE = TRAIN_ROWS; // one row per merge the train tried (metrics/train.jsonl)
export const NOTES_FILE = TRAIN_NOTES; // a pull request's review and cost, per head (metrics/train-notes.jsonl)
export const MERGER_FILE = 'metrics/merger.jsonl'; // lease takeovers, the merger's context
export const LEASE_FILE = 'merger/lease.json';
export const PLAIN_FILE = 'merger/plain.jsonl'; // plain pull requests queued for the train, and their withdrawals
export const WINDOW_FILE = 'metrics/train-window.jsonl'; // the window's spec builds, closes, lands and fallbacks (window.mjs)
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
// The time of each step of a pass (ready, order), kept on ctx.steps and said at the pass's end.
const timed = (ctx, name, f) => { const t = Date.now(); try { return f(); } finally { (ctx.steps ||= []).push([name, Date.now() - t]); } };
// The first pass, and any pass this slow, says its steps (a cold start's 10 min, 5 Nov, said nothing).
export const STEPS_SAID_MS = 5000;
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const mins = (a, b) => Math.round((b - a) / MIN * 10) / 10;
const append = (wt, path, row) => { mkdirSync(dirname(join(wt, path)), { recursive: true }); appendFileSync(join(wt, path), JSON.stringify(row) + '\n'); };
// A train row written after its merge was tried (build train-robust, option 2B: copy, 5 Nov 12:21,
// the row of PR 499's land failed to write, the Fail stopped the train, and the land went
// unrecorded). A row that cannot be written is kept and tried again at the top of every pass;
// the failure never stops the train. A Stop (a lost lease) still stops it.
function record(root, ctx, msg, row, onTry) {
  try {
    writeState(root, ctx.cfg.state_branch, msg, (wt) => { onTry?.(); append(wt, TRAIN_FILE, row); });
    return true;
  } catch (e) {
    if (!(e instanceof Fail) || e instanceof Stop) throw e;
    ctx.pending.push({ msg, row });
    ctx.log(`the train's row for PR ${row.pr} (${row.result}) was not written (${e.message.split('\n')[0]}); it is tried again at the next pass`);
    return false;
  }
}
function flushPending(root, ctx) {
  const left = [];
  for (const p of ctx.pending.splice(0)) {
    // A write reported failed may have landed (a 5xx push whose read-back failed too): a row already
    // there, the same row (its time, PR and result), is not written again (review of build train-robust).
    // A window row (p.file) waits here too, kept the same way.
    const same = (r) => r.at === p.row.at && r.pr === p.row.pr && r.result === p.row.result && r.row === p.row.row && r.event === p.row.event;
    const file = p.file || TRAIN_FILE;
    try { writeState(root, ctx.cfg.state_branch, p.msg, (wt) => { const f = join(wt, file); if (!jsonl(existsSync(f) ? readFileSync(f, 'utf8') : '').some(same)) append(wt, file, { ...p.row, late: now() }); }); ctx.log(`the train's row for PR ${p.row.pr} (${p.row.result ?? p.row.event}) is written, late`); } catch (e) {
      if (!(e instanceof Fail) || e instanceof Stop) throw e;
      left.push(p);
    }
  }
  ctx.pending.push(...left);
}
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
  let measures = review ? reviewMeasures(opts) : null;
  if (!opts.reviewed && (opts.reviewSession !== undefined || opts.reviewRecord !== undefined)) fail('--review-session and --review-record go with --reviewed');
  const sessions = reviewSessions(opts.reviewSession);
  // The review's cost read here, in BOB's checkout, where its `metrics add <id> --role review` rows are
  // (the MERGER's clone sees only those on the tranche), as merge reads it (merge.mjs reviewCostOf).
  if (opts.reviewed && measures.review_usd === 'unmeasured') {
    git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`, `+refs/heads/${pr.head.ref}:refs/remotes/origin/${pr.head.ref}`], { cwd: root, allowFail: true });
    let id = null;
    try { id = branchModule(pr.head.ref, ledgerIds(root, `origin/${cfg.tranche}`)); } catch { id = null; }
    const c = id ? reviewCostOf(root, cfg, id, { sessions, record: opts.reviewRecord, since: attemptStart(rowsAt(root, pr.head.sha, id)) }) : { usd: 'unmeasured', why: `${pr.head.ref} is not a job branch here` };
    measures = { ...measures, review_usd: c.usd, ...(c.from ? { review_usd_from: c.from } : { review_usd_why: c.why }) };
    log(c.from ? `review cost: ${c.usd} USD, from ${c.from}` : `review cost: unmeasured (${c.why})${sessions.length ? '; the MERGER reads the named sessions\' rows on the tranche again at the merge' : ''}`);
  }
  const row = { at: now(), row: 'note', by, pr: Number(n), sha: pr.head.sha, ...(review ? { reviewed: opts.reviewed || null, no_review: opts.noReview || null, rounds: rounds.rounds, decision: rounds.decision, ...measures, ...(sessions.length ? { review_sessions: sessions } : {}) } : {}), ...(cost !== null ? { job_cost_usd: cost, job_session: opts.jobSession || null } : {}), ...(pr.merged ? { merged: true } : {}) };
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
// A review of an earlier head carried to this one (review-trigger day-1 study, 5 Nov: copy PR 364,
// reviewed at 7cac421, sat about 13.5 h refused --no-review once its head moved to d3af394): BOB's
// newest --reviewed note for the pull request on another head counts for this head when the job's
// change is the same at both (sameChange); the merge still judges the triggers on this head, and
// its row names the head reviewed. Otherwise the head stays unreviewed and the reason is kept
// (moved), for the refusal sent to BOB; status and the idle alarm name it stuck (stuck.mjs).
// cache: a Map, so each pair of heads is compared once.
export function carriedNote(root, cfg, notes, n, sha, bob, cache = new Map()) {
  const own = noteFor(notes, n, sha, bob);
  if (own.review || !bob) return own;
  const earlier = notes.filter((x) => x.row === 'note' && x.pr === n && x.sha && x.sha !== sha && !x.merged && x.by === bob && x.reviewed).pop();
  if (!earlier) return own;
  const k = `${earlier.sha}>${sha}`;
  const s = cache.get(k) || sameChange(root, cfg, earlier.sha, sha);
  if (!s.unread) cache.set(k, s); // an unread head is compared again once fetched
  return s.same ? { ...own, review: { ...earlier, carried_from: earlier.sha } } : { ...own, moved: { from: earlier.sha, why: s.why } };
}
// Whether heads a and b carry the same change: each against its merge base with the tranche, the
// same files outside the records, and the same diff of them, line numbers and blob ids aside (a
// head that only brought the tranche in, or that the train itself pushed a merged result to).
// Context lines count: the tranche changing the lines beside the job's is a change to review.
export function sameChange(root, cfg, a, b) {
  const tranche = `refs/remotes/origin/${cfg.tranche}`;
  const side = (sha) => {
    if (git(['cat-file', '-e', `${sha}^{commit}`], { cwd: root, allowFail: true }).code !== 0) return null;
    const mb = git(['merge-base', sha, tranche], { cwd: root, allowFail: true });
    if (mb.code !== 0 || !mb.stdout.trim()) return null;
    const base = mb.stdout.trim();
    const files = diffNames(root, base, sha).filter((f) => !isRecordPath(cfg, f)).sort();
    const d = files.length ? git(['diff', '--no-renames', '--no-color', '--full-index', '-U3', base, sha, '--', ...files], { cwd: root }) : '';
    return { files, diff: String(d).split('\n').filter((l, i, a) => !l.startsWith('index ') || /^Binary files /.test(a[i + 1] || '')).map((l) => (l.startsWith('@@') ? l.replace(/^@@ [^@]* @@/, '@@') : l)).join('\n') };
  };
  let x;
  let y;
  try { x = side(a); y = side(b); } catch (e) { return { same: false, unread: true, why: `not compared (${String(e.message).split('\n')[0]})` }; }
  if (!x || !y) return { same: false, unread: true, why: `${!x ? a.slice(0, 10) : b.slice(0, 10)} or its merge base with ${cfg.tranche} is not readable here` };
  if (x.files.join('\n') !== y.files.join('\n')) return { same: false, why: `the files it changes differ (${[...y.files.filter((f) => !x.files.includes(f)), ...x.files.filter((f) => !y.files.includes(f))].slice(0, 5).join(', ')})` };
  if (x.diff !== y.diff) return { same: false, why: 'the job\'s change itself differs' };
  return { same: true };
}
// merge()'s options from the notes for this head; with no review, --no-review (merge refuses it
// when a trigger fires) and, with no cost, the job's cost unmeasured, priced later.
const reviewOf = ({ review: r, cost: c }) => ({
  ...(r ? { reviewed: r.reviewed || undefined, noReview: r.no_review || undefined, rounds: r.rounds || undefined, decision: r.decision || undefined, reviewMinutes: r.review_minutes ?? undefined, findings: r.findings ?? undefined, actedOn: r.findings_acted ?? undefined, ...(typeof r.review_usd === 'number' ? { reviewCostUsd: r.review_usd, ...(r.review_usd_from ? { reviewCostFrom: r.review_usd_from } : {}) } : r.review_sessions?.length ? { reviewSession: r.review_sessions } : {}), ...(r.carried_from ? { reviewedHead: r.carried_from } : {}) } : { noReview: TRAIN_NO_REVIEW }),
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
  timed(ctx, 'tranche fetch', () => git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root }));
  const ids = ledgerIds(root, `origin/${cfg.tranche}`);
  const open = timed(ctx, 'open pull requests', () => io.openPRs(slug, cfg.tranche));
  if (!open) fail(`could not read the pull requests into ${cfg.tranche}`);
  ctx.open = open; // the window reads its jobs' heads from this one read (windowPass)
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
  const gates = timed(ctx, 'gate reads', () => many(look.map(([p]) => p.head.sha).filter((x) => !ctx.gates.has(x)), 'gate'));
  const gateOf = (sha) => ctx.gates.get(sha) || gates.get(sha) || null;
  const posts = timed(ctx, 'post reads', () => many(look.map(([p]) => p.head.sha).filter((x) => green(gateOf(x)) && !gateOf(x).post), 'post'));
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
    // A refusal for want of a review re-enters once a review of an earlier head carries to this one (carriedNote).
    const key = `${p.number}@${p.head.sha}@${run}`;
    const at = ctx.refused.get(key);
    const carried = () => /review trigger/.test(ctx.refusedWhy?.get(key) || '') && !!ctx.noteFor({ n: p.number, head: p.head.sha }).review?.carried_from;
    if (at && !ctx.notes.some((x) => x.row === 'note' && x.pr === p.number && x.sha === p.head.sha && x.by && x.by === ctx.bob && (x.reviewed || x.no_review) && x.at >= at) && !carried()) { job.stuck = 'the train refused it on this head'; continue; }
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
    try { c.modules = timed(ctx, 'modules', () => readModules(root, cfg, at)); } catch (e) { c.modules = null; say(`the modules file is unread at ${tip.slice(0, 10)} (${e.message}): nothing is held for a provider`); }
    c.release = null;
  }
  const openIds = new Set(jobs.map((j) => j.id));
  try { c.release = timed(ctx, 'release path', () => releaseSet(root, cfg, at, openIds, { memo: c })); } catch (e) { say(`the release path is unread at ${tip.slice(0, 10)} (${e.message}): no pull request is ordered by it`); c.release = { key: null, set: new Set() }; }
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
    if (git(['cat-file', '-e', `${j.head}^{commit}`], { cwd: root, allowFail: true }).code !== 0) {
      fetchRefs(root, [j.ref]);
      if (git(['cat-file', '-e', `${j.head}^{commit}`], { cwd: root, allowFail: true }).code !== 0) throw new Error(`${j.ref} at ${j.head.slice(0, 10)} is not fetched`);
    }
    mendBase(root, ctx, at, j);
  };
  const size = c.exp.size + c.imp.size;
  const exportsChanged = (p) => { if (!c.exp.has(p.head)) { have(p); c.exp.set(p.head, exportsChangedAt(root, cfg, at, p)); } return c.exp.get(p.head); };
  const importsFrom = (u, p) => { const k = `${u.head}>${p.id}`; if (!c.imp.has(k)) { have(u); c.imp.set(k, importsFromAt(root, cfg, at, c.modules, u, p)); } return c.imp.get(k); };
  const graph = usesGraph(c.modules);
  let holds = new Map();
  if (c.modules) {
    // Every head the hold may read and this clone lacks, in one fetch (one by one, each was a round trip).
    timed(ctx, 'heads fetch', () => fetchHeads(root, holdHeads(cands, jobs, graph.usesOf)));
    // The gate reads of every provider an edge holds on, at once: a first pass finds them (its git
    // reads are cached for the second), the second is the hold as before.
    const want = new Set();
    timed(ctx, 'hold reads (exports, imports)', () => providerHolds(cands, jobs, { ...graph, red: (p) => { if (!p.stuck && !reds.has(p.head)) want.add(p.head); return false; }, exportsChanged, importsFrom, note: () => {} }));
    const ws = [...want];
    timed(ctx, 'provider gate reads', () => io.checkRunsMany(slug, ws.map((x) => [x, 'gate'])).forEach((rs, i) => { if (Array.isArray(rs)) reds.set(ws[i], rs[0]?.status === 'completed' && rs[0].conclusion !== 'success'); }));
    holds = timed(ctx, 'holds', () => providerHolds(cands, jobs, { ...graph, red, exportsChanged, importsFrom, note: say }));
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
  const read = timed(ctx, 'gate minutes', () => io.commentsMany(slug, unread.map((u) => u.n)));
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
  if (miss.length) fetchRefs(root, miss);
}
const MAIN = 'main';
const fetchRefs = (root, refs) => fetchJobRefs(root, refs, MAIN);
// A head's merge base with the tranche, in a shallow clone: read locally when the history holds it
// (a common ancestor the clone shows is a true one), else both sides deepened to the base GitHub's compare names (merge.mjs deepenToBase: never a cut,
// the whole history only when that fails). Once per head per tranche tip (its commit, not its name).
function mendBase(root, ctx, at, j) {
  if (!isShallow(root)) return;
  const k = `${git(['rev-parse', at], { cwd: root, allowFail: true }).stdout.trim()}@${j.head}`;
  const done = (ctx.mended ||= new Set());
  if (done.has(k)) return;
  done.add(k);
  if (git(['merge-base', at, j.head], { cwd: root, allowFail: true }).code === 0) return;
  try { deepenToBase(root, ctx.slug, ctx.cfg.tranche, j.ref, ctx.io.compare || compare); } catch (e) { if (!(e instanceof Fail)) throw e; ctx.log(`merge train: ${e.message.split(';')[0]}; its hold reads as not held`); }
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
  // A cut history can read wrong without failing: never kept, but in the train's own clone, its
  // history past main fetched and each head's merge base read or mended before any read (mendBase).
  if (isShallow(root) && !markedDeep(root)) return;
  try { writeFileSync(cachePath(root), JSON.stringify({ key: cacheKey(cfg, tip), exp: Object.fromEntries(c.exp), imp: Object.fromEntries(c.imp) })); } catch { /* a cache only */ }
}

// The release path's modules (status.mjs releaseModules), cached by the inputs it reads (build
// train-robust, item 6: 13.8 s of a warm pass on the copy, its largest step): the tranche's tree
// (ledger, layers, requirement and found files, config), the closed-layer rows on the state branch
// and origin's main (which of them still count), the config and the tool's own commit, and the
// open jobs whose entries are COMPLETE or BLOCKED on the tranche (for any other entry an open pull
// request changes nothing: layerState counts its job open already, and reads its PR only for a
// BLOCKED module, whether it is deferred). In memory and in the clone, so a pass on an unchanged
// tranche reads three refs, a restarted train at the same tip none of the files, and a moved
// tranche computes once. compute is for the tests. Returns { key, set, cached }.
const RELEASE_CACHE = 'p3-train-release.json';
export function releaseSet(root, cfg, at, openIds, { memo = {}, compute = releaseModules } = {}) {
  const tree = git(['rev-parse', `${at}^{tree}`], { cwd: root }).trim();
  if (memo.completeTree !== tree) {
    memo.complete = new Set(Object.values(readLedgerTexts(root, at)).flatMap((t) => { try { const e = JSON.parse(t); return e?.id && ['COMPLETE', 'BLOCKED'].includes(e.status?.state) ? [e.id] : []; } catch { return []; } }));
    memo.completeTree = tree;
  }
  const closed = readState(root, cfg.state_branch, CLOSED_FILE) || '';
  const main = git(['rev-parse', '-q', '--verify', 'refs/remotes/origin/main'], { cwd: root, allowFail: true }).stdout.trim();
  const reopened = [...openIds].filter((id) => memo.complete.has(id)).sort();
  const key = createHash('sha256').update(JSON.stringify([tree, closed, main, toolPin(), cfg, reopened])).digest('hex');
  if (memo.release?.key === key) return { ...memo.release, cached: true };
  const file = git(['rev-parse', '--absolute-git-dir'], { cwd: root }) + '/' + RELEASE_CACHE;
  try {
    const x = JSON.parse(readFileSync(file, 'utf8'));
    if (x?.key === key && Array.isArray(x.set)) return (memo.release = { key, set: new Set(x.set), cached: true });
  } catch { /* none, or unread: computed */ }
  const set = compute(root, cfg, at, openIds);
  memo.release = { key, set };
  if (!isShallow(root)) { try { writeFileSync(file, JSON.stringify({ key, set: [...set] })); } catch { /* a cache only */ } }
  return { key, set, cached: false };
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
  (ctx.refusedWhy ||= new Map()).set(key, why.split('\n')[0]);
  if (told) return;
  const first = why.split('\n')[0];
  let moved = null;
  try { moved = /review trigger/.test(first) ? ctx.noteFor(c).moved || null : null; } catch { moved = null; }
  const text = /review trigger/.test(first) ? `PR ${c.n} (job ${c.id}) fires a review trigger and has no review recorded for ${c.head.slice(0, 10)}${moved ? ` (BOB's review is of ${moved.from.slice(0, 10)}; it does not carry to this head: ${moved.why})` : ''}: review it (${P3} review brief ${c.n}), then ${P3} merge train note ${c.n} --reviewed "<what>" --rounds <n> --review-minutes <n> --findings <n> --acted-on <n>; the train merges it then`
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
    if (ctx.pipeline && !(ctx.k > 1) && ctx.prepared === null && /^waiting for (the )?gate/.test(l)) prepare(root, ctx, c.n); // the window gates the next ones already
  };
  const free = ctx.diskFree(root);
  if (free < ctx.diskMin) stop(`STOP: ${free} MB free, under the merger's disk budget of ${ctx.diskMin} MB; nothing was started for PR ${c.n}. Delete what is not needed (old clones, caches), then run the train again`);
  const row = { at: now(), row: 'merge', session: ctx.session, pr: c.n, module: c.id, head: c.head, run: c.run, green_at: c.green_at, queue, idle_min: idle, prepared: !!prep, prep_min: prep?.prep_min ?? null, named: !!c.named, release: !!c.release, expected_gate_min: c.gate_min ?? null, aged: !!c.aged, holds: c.holds || 0, held: ctx.held || [], disk_free_mb: free };
  let r = null;
  try {
    // A window's head lands on the spec it gated (merge.mjs: the trailer and the fast path only when
    // the land's tree is the tree the spec gate tested, records aside; else the full re-gate).
    r = (ctx.merge || merge)(root, c.n, { ...reviewOf(ctx.noteFor(c)), head: c.head, slug, io: ctx.io, minutes: ctx.minutes, every: ctx.every, wait: ctx.wait, transient: ctx.transient, log: tick, onGate: (tip) => { if (c.window && ctx.window?.[0]?.n === c.n) ctx.window[0].pushed = tip; hold(root, ctx, c, tip); }, ...(c.held ? { noPush: true } : {}), ...(c.spec ? { spec: c.spec } : {}), beforeLand: () => leaseHeld(root, cfg, ctx.session, ctx.token, ctx.approvals) });
    row.result = 'merged';
    if (r?.rejudged) row.triggers_rejudged = r.rejudged; // merge.mjs: triggers judged at the land over an older row
    row.merged_at = now();
    row.green_to_merged = mins(Date.parse(c.green_at), Date.now());
    row.queue_at_end = ctx.prepared?.depth ?? null;
    // The report's count of spec-tested lands against fallbacks (condition 4); null: not a window land.
    if (c.spec) { row.spec_pr = c.spec.pr; row.spec_fast = r?.spec?.fast === true; if (!row.spec_fast) row.spec_why = r?.spec?.why || 'merge gave no spec answer'; }
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
      if (b.tries >= RETRIES_TO_BOB) { refuse(root, ctx, c, `${row.why} (${b.tries} tries)`); row.to_bob = true; } else log(`PR ${c.n} is tried again in ${Math.round((b.until - Date.now()) / MIN)} min: ${row.why}`);
    }
  }
  row.minutes = mins(started, Date.now());
  row.disk_used_mb = free - ctx.diskFree(root); // what this merge left on disk (the worktree is gone by now); not the free space, disk_free_mb
  let tries = 0;
  // push_tries is set on the row only as it is written, so a row kept for a later pass is the same row.
  const out = { ...row };
  record(root, ctx, `merge train: PR ${c.n} ${row.result}`, out, () => { tries++; out.push_tries = tries; });
  row.push_tries = tries;
  // The hold ends with its cause once the gate's merge is over; a merge to try again keeps it.
  if (ctx.inflight?.pr === c.n) {
    const cause = r?.merged ? 'landed' : row.result === 'refused' ? `refused: ${row.why}` : row.to_bob ? `handed to BOB after ${RETRIES_TO_BOB} tries: ${row.why}` : HOLD_ENDS.test(row.why || '') ? row.why : null;
    if (cause) unhold(root, ctx, ctx.inflight, cause);
  }
  if (c.window) specDone(root, ctx, c, r, row);
  // BOB's acts after a merge (the triage the notice owes, the ready jobs' start), sent, not taken.
  if (r?.merged) {
    // The land owes starts (hold.mjs), as a merge command's does (copy, 5 Nov: the train's lands
    // wrote none, so only BOB's own reading of the message started the work they freed).
    try { writeState(root, cfg.state_branch, `starts owed: merge ${c.n}`, (wt) => owe(wt, `merge ${c.n}`)); } catch (e) { if (!(e instanceof Fail) || e instanceof Stop) throw e; log(`starts owed not recorded (${e.message.split('\n')[0]}); the starter's next timed pass reads the land`); }
    // With the starter running (auto.mjs), the starts are its: BOB is told only the triage owed.
    let auto = false;
    try { auto = starterLive(readAuto(root, cfg.state_branch)); } catch { auto = false; }
    const lines = firstActs(r.triage).filter((l) => !auto || l !== READY_FIRST && !/job start --ready/.test(l));
    const acts = lines.map((l) => l.replace(/^(first|then): /, '')).join('; then ');
    const text = auto ? `merged PR ${c.n} (job ${c.id})${acts ? `: ${acts}` : ''}; the MERGER's starter starts the work it freed` : `merged PR ${c.n} (job ${c.id}): ${acts || READY_START}`;
    try { send(root, cfg.state_branch, { from: 'merger', to: 'bob', text, log: ctx.log }); } catch (e) { if (!(e instanceof Fail)) throw e; log(`tell BOB: ${text}`); }
  }
  ctx.rows.push(row);
  return row;
}

// The in-flight hold (inflight.mjs; build train-inflight, option 8B). Opened when merge() has a
// merged result gating (pushed now, or found gating from an earlier run): until that gate's
// merge ends, each pass goes back to it first and nothing else lands. Ended with its cause: landed,
// refused (a red gate among them), or a failure that leaves nothing to wait on (HOLD_ENDS). A
// failure to try again (a GitHub error that outlasted the wait's own retries) keeps it.
const suiteMinutes = (cfg) => (Number(cfg.suite_timeout_minutes) > 0 ? Number(cfg.suite_timeout_minutes) : 0);
export const HOLD_MINUTES = (cfg) => Math.max(GATE_CAP_MINUTES, suiteMinutes(cfg)) + INFLIGHT_QUEUE_MIN;
const HOLD_ENDS = /is merged while|is closed while|moved to \S+ while the gate|moved past the merged result|did not finish within|would need a new one|the head the train chose|retargeted|the gate is not green on|is a draft|is into \S+, not/;
function hold(root, ctx, c, tip) {
  if (ctx.inflight?.pr === c.n && ctx.inflight.tip === tip) return;
  ctx.inflight = { pr: c.n, tip, module: c.id, until: new Date(Date.now() + HOLD_MINUTES(ctx.cfg) * MIN).toISOString() };
  try { startHold(root, ctx.cfg.state_branch, { pr: c.n, module: c.id, tip, session: ctx.session, minutes: HOLD_MINUTES(ctx.cfg) }); ctx.log(`PR ${c.n}'s merged result ${tip.slice(0, 10)} is gating: nothing else lands on ${ctx.cfg.tranche} until its merge ends`); } catch (e) { if (!(e instanceof Fail) || e instanceof Stop) throw e; ctx.log(`the hold for PR ${c.n} was not recorded (${e.message.split('\n')[0]}); this train holds it all the same`); }
}
function unhold(root, ctx, h, cause) {
  try { endHold(root, ctx.cfg.state_branch, { pr: h.pr, tip: h.tip, cause: String(cause).split('\n')[0].slice(0, 300), session: ctx.session }); } catch (e) { if (!(e instanceof Fail) || e instanceof Stop) throw e; ctx.log(`the end of PR ${h.pr}'s hold was not recorded (${e.message.split('\n')[0]}); its until ends it`); }
  ctx.log(`PR ${h.pr}'s hold at ${String(h.tip).slice(0, 10)} ended: ${String(cause).split('\n')[0]}`);
  ctx.inflight = null;
}
// A pass under a hold: the held PR again, or the hold ended. Returns true when the pass is spent
// (nothing else is taken this pass), false when the hold ended and the pass goes on as usual.
function heldPass(root, ctx, h, { idle }) {
  const { cfg, slug, io } = ctx;
  ctx.inflight = { pr: h.pr, tip: h.tip, module: h.module, until: h.until };
  // Never past its until, written or not (a dead train's hold).
  if (!(Date.parse(h.until) > Date.now())) { unhold(root, ctx, h, `its gate's cap passed (${h.until})`); return false; }
  let pr;
  try { pr = io.getPR(slug, h.pr); } catch (e) { if (!(e instanceof Fail) || e instanceof Stop) throw e; ctx.log(`PR ${h.pr} (held) unread this pass (${e.message.split('\n')[0]}): nothing else lands; read again next pass`); return true; }
  if (pr.merged) { unhold(root, ctx, h, `merged (${pr.merge_commit_sha || 'elsewhere'})`); return false; }
  if (pr.state !== 'open') { unhold(root, ctx, h, `pull request ${pr.state}`); return false; }
  if (pr.head?.sha !== h.tip) { unhold(root, ctx, h, `head moved to ${String(pr.head?.sha).slice(0, 10)}`); return false; }
  // Withdrawn (made a draft) or retargeted: nothing to wait on (cold review of build train-inflight).
  if (pr.draft) { unhold(root, ctx, h, 'withdrawn: made a draft'); return false; }
  if (pr.base?.ref !== cfg.tranche) { unhold(root, ctx, h, `retargeted to ${pr.base?.ref}`); return false; }
  // Its gate ended red (or cancelled): the hold ends with it.
  let g = null;
  try { g = io.checkRun(slug, h.tip, 'gate'); } catch { g = null; }
  if (g?.status === 'completed' && g.conclusion !== 'success') { unhold(root, ctx, h, `gate ${g.conclusion}${g.html_url ? `: ${g.html_url}` : ''}`); return false; }
  // The tip fetched with the tranche (a restarted train's clone may lack it): only a tip known and
  // not holding the tranche reads as "tranche moved"; one not readable keeps the hold.
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`, `+refs/heads/${pr.head.ref}:refs/remotes/origin/${pr.head.ref}`], { cwd: root, allowFail: true });
  const anc = git(['merge-base', '--is-ancestor', `refs/remotes/origin/${cfg.tranche}`, h.tip], { cwd: root, allowFail: true }).code;
  if (anc === 1) { unhold(root, ctx, h, 'tranche moved'); return false; }
  if (anc !== 0) { ctx.log(`PR ${h.pr}'s held tip ${String(h.tip).slice(0, 10)} is not readable in this clone this pass: the hold stands; read again next pass`); return true; }
  if ((ctx.backoff.get(`${h.pr}@${h.tip}`)?.until || 0) > Date.now()) return true; // tried again after its wait; nothing else meanwhile
  // The window's head, landing under its hold, still lands on its spec (and its rows say so).
  const w0 = ctx.window?.[0]?.n === h.pr ? ctx.window[0] : null;
  mergeOne(root, ctx, { n: h.pr, id: h.module || branchModule(pr.head.ref, ledgerIds(root, `origin/${cfg.tranche}`)), head: h.tip, ref: pr.head.ref, run: null, green_at: null, held: true, ...(w0 ? { window: true, ...(w0.spec_pr ? { spec: { pr: w0.spec_pr, sha: w0.result } } : {}) } : {}) }, { queue: 0, idle });
  return true;
}

// The window (merge_train_window > 1; window.mjs, notes/train-spec-plan.md, option C'). Up to k
// green job pull requests gate at once, each on its predicted merged result R(i) behind those ahead,
// on a spec pair of fresh branches and a draft spec pull request between them. Position 0 lands
// through merge() as the serial train lands, with its spec: the fast path only when its land is the
// tree the spec gate tested, records aside; anything else is the full re-gate. Nothing is ever
// force-pushed or deleted: spec branches are new refs, spec pull requests are closed, not deleted.
const s10 = (x) => String(x ?? '').slice(0, 10);
// A spec gate red that did not judge the job (no row, a crash, a timeout) is rebuilt this many times for one head; the next is refused, at the head of the window.
export const SPEC_REBUILDS = 3;
// The window's rows, written at the end of a pass in one state write (kept and tried again on failure).
function windowRow(ctx, ev) {
  const row = { at: now(), row: 'spec', session: ctx.session, ...ev };
  ctx.windowRows.push(row);
  (ctx.windowOut ||= []).push(row);
}
function flushWindow(root, ctx) {
  const rows = (ctx.windowOut || []).splice(0);
  if (!rows.length) return;
  try {
    writeState(root, ctx.cfg.state_branch, `merge train: window ${rows.map((r) => `${r.event} ${r.pr}-${r.seq}`).join(', ')}`, (wt) => { for (const r of rows) append(wt, WINDOW_FILE, r); });
  } catch (e) {
    if (!(e instanceof Fail) || e instanceof Stop) throw e;
    for (const r of rows) ctx.pending.push({ msg: `merge train: window ${r.event} ${r.pr}-${r.seq}`, row: r, file: WINDOW_FILE });
    ctx.log(`the window's rows (${rows.length}) were not written (${e.message.split('\n')[0]}); they are tried again at the next pass`);
  }
}
// Closes each position's spec pull request (never deletes a branch) and says why in a row.
function closeSpecs(ctx, ps, event = 'close') {
  for (const p of ps) {
    ctx.causes.set(p.n, p.cause);
    if (p.spec_pr && !p.closed) {
      try { ctx.io.editPR(ctx.slug, p.spec_pr, { state: 'closed' }); } catch (e) {
        if (!(e instanceof Fail) || e instanceof Stop) throw e;
        // Tried again at the top of each pass (cold review: an open spec gate is runner time spent on nothing).
        ctx.log(`spec PR ${p.spec_pr} was not closed (${e.message.split('\n')[0]}); tried again next pass`);
        (ctx.unclosed ||= []).push({ ...p, event });
        continue;
      }
    }
    if (p.spec_pr) windowRow(ctx, { event, pr: p.n, seq: p.seq, position: p.position, spec_pr: p.spec_pr, base: p.base, head: p.result, cause: p.cause });
    ctx.log(`window: PR ${p.n}${p.spec_pr ? ` (spec PR ${p.spec_pr})` : ''} leaves the window: ${p.cause}`);
  }
}
// The seqs already taken on the remote for PR n's spec pairs: a name is never reused.
function takenSeqs(root, n) {
  // train/spec/* too: spec bases the first build pushed are never reused either.
  const r = git(['ls-remote', 'origin', `refs/heads/train/spec/${n}-*`, `refs/heads/train/head/${n}-*`], { cwd: root, allowFail: true });
  if (r.code !== 0) fail(`could not read the spec branches of PR ${n} on origin`);
  return r.stdout.split('\n').map((l) => /refs\/heads\/train\/(?:spec|head)\/\d+-(\d+)$/.exec(l.trim())?.[1]).filter(Boolean).map(Number);
}
// R(i) for c onto `onto` (merge's own build, never pushed): the per-PR checks first, as merge holds them.
export function buildResult(root, ctx, c, onto) {
  const { cfg, slug, io } = ctx;
  const pr = io.getPR(slug, c.n);
  if (pr.head?.sha !== c.head) fail(`pull request ${c.n} moved to ${s10(pr.head?.sha)} from ${s10(c.head)}, the head the train chose`);
  const note = reviewOf(ctx.noteFor(c));
  const rounds = reviewRounds(note);
  const measures = { ...reviewMeasures(note), ...(note.reviewedHead ? { reviewed_head: note.reviewedHead } : {}) };
  const { branch, receipt, trig } = jobChecks(root, c.n, pr, c.id, { cfg, slug, io, noReview: note.noReview, log: () => {} });
  return mergedResult(root, cfg, { n: c.n, id: c.id, branch, head: c.head, onto, ontoName: s10(onto), reviewed: note.reviewed, noReview: note.noReview, rounds, measures, triggers: trig.fired, attempt: receipt.attempt, log: () => {} });
}
// Pushes the spec head as a new ref and opens its draft spec pull request into the tranche itself
// (the coordinator's ruling, 17:20): the run's base, and so its judge, is the tranche's.
function openSpec(root, ctx, p) {
  const base = ctx.cfg.tranche;
  const head = specHead(p.n, p.seq);
  let err = '';
  for (let t = 0; t < 4; t++) {
    const r = git(['push', '-q', 'origin', `${p.result}:refs/heads/${head}`], { cwd: root, allowFail: true });
    if (r.code === 0) { err = ''; break; }
    err = (r.stderr || r.stdout || '').trim().split('\n').pop();
    if (!SERVER_ERROR.test(err)) break;
    sleep(2000 * 2 ** t);
  }
  if (err) fail(`the spec head ${head} was not pushed: ${err}`);
  const sp = ctx.io.createPR(ctx.slug, { head, base, draft: true, title: `train spec: PR ${p.n} at position ${p.position} (${p.seq})`, body: `The merge train's speculative gate for PR #${p.n}: its head ${p.head} merged onto ${p.base} (${p.position ? 'the window ahead of it' : 'the tranche tip'}). Never merged; closed by the train. ${p.cause}` });
  return sp.number;
}
function admitWindow(root, ctx, w, list, tip) {
  const { cfg } = ctx;
  const ends = () => chainEnd(w, tip);
  const queue = list.filter((c) => !ctx.buildFailed.has(`${c.n}@${c.head}@${ends()}`));
  for (const c of admit(w, queue, ctx.k, { causes: ctx.causes })) {
    if (w.length >= ctx.k) break;
    // Red once behind others: only at the head of the window, on the tranche tip itself.
    if (w.length && ctx.solo.has(`${c.n}@${c.head}`)) continue;
    const onto = ends();
    const position = w.length;
    let res;
    try { res = ctx.build(root, ctx, c, onto); } catch (e) {
      if (!(e instanceof Fail) || e instanceof Stop) throw e;
      const why = e.message.split('\n')[0];
      // On the tip, a lasting refusal is the job's, as merge would refuse it; behind others it waits for them.
      if (position === 0 && onto === tip && lasting(why)) { refuse(root, ctx, c, e.message); record(root, ctx, `merge train: PR ${c.n} refused`, { at: now(), row: 'merge', session: ctx.session, pr: c.n, module: c.id, head: c.head, result: 'refused', why: why.slice(0, 300), window: true }); }
      else ctx.log(`window: PR ${c.n} not built onto ${s10(onto)} this pass: ${why}`);
      ctx.buildFailed.add(`${c.n}@${c.head}@${onto}`);
      continue;
    }
    // The cause as admitted, with the position it really takes (a build skipped ahead of it moves it).
    const cause = c.cause.replace(/^admitted at position \d+ (behind PR [\d, ]+|on the tranche tip)/, position ? `admitted at position ${position} behind PR ${w.map((x) => x.n).join(', ')}` : 'admitted at position 0 on the tranche tip');
    const p = { ...c, cause, position, base: onto, result: res.sha, tree: res.tree, state: 'gating', built_at: Date.now() };
    if (res.sha === c.head) {
      // The job already holds its merged result on the tip: its own gate is the test, no spec.
      if (position !== 0 || onto !== tip) { ctx.log(`window: PR ${c.n}'s head already holds ${s10(onto)}, which is not the tip: not admitted`); ctx.buildFailed.add(`${c.n}@${c.head}@${onto}`); continue; }
      w.push({ ...p, spec_pr: null, seq: null, state: 'green', cause: `${cause}; its head is its merged result on the tip` });
      ctx.log(`window: PR ${c.n} at position 0 is its own merged result: it lands on its own gate`);
      continue;
    }
    try {
      p.seq = nextSeq(ctx.windowRows, c.n, takenSeqs(root, c.n));
      p.spec_pr = openSpec(root, ctx, p);
    } catch (e) {
      if (!(e instanceof Fail) || e instanceof Stop) throw e;
      ctx.log(`window: PR ${c.n}'s spec not opened this pass: ${e.message.split('\n')[0]}`);
      break;
    }
    windowRow(ctx, { event: 'build', pr: c.n, seq: p.seq, position, spec_pr: p.spec_pr, base: onto, head: p.result, module: c.id, job_head: c.head, ref: c.ref, run: c.run, green_at: c.green_at, cause });
    ctx.log(`window: PR ${c.n} at position ${position}: spec PR ${p.spec_pr} gates ${s10(p.result)} on ${s10(onto)}`);
    w.push(p);
  }
}
// One pass of the window: reconcile with the tranche and the jobs' heads, read the spec gates,
// act on a red, land position 0 when green, fill the window. true when a land was tried.
function windowPass(root, ctx, { idle }) {
  const { cfg, slug, io, log } = ctx;
  let list = ready(root, ctx);
  ctx.onQueue?.(list);
  const tip = git(['rev-parse', `refs/remotes/origin/${cfg.tranche}`], { cwd: root });
  let w = ctx.window;
  try {
    if (ctx.unclosed?.length) for (const { event, ...p } of ctx.unclosed.splice(0)) closeSpecs(ctx, [p], event);
    const moved = onTrancheMoved(w, tip);
    if (moved.close.length) { closeSpecs(ctx, moved.close); w = moved.keep; }
    // The jobs' heads, from ready()'s one read of the open pull requests.
    for (let i = 0; i < w.length; i++) {
      const p = w[i];
      const o = (ctx.open || []).find((x) => x.number === p.n);
      const why = !o ? 'is closed or merged' : o.head?.sha !== p.head && o.head?.sha !== p.pushed ? `head moved to ${s10(o.head?.sha)}` : o.draft ? 'was made a draft' : o.base?.ref !== cfg.tranche ? `was retargeted to ${o.base?.ref}` : null;
      if (why) { const r = onHeadMoved(w, p.n, why); closeSpecs(ctx, r.close); w = r.keep; break; }
    }
    // The spec gates, and each green one's post job (its row is what the fast path reads).
    const look = w.filter((p) => p.spec_pr && p.state === 'gating');
    if (look.length) {
      const gates = io.checkRunMany(slug, look.map((p) => [p.result, 'gate']));
      const posts = io.checkRunMany(slug, look.map((p) => [p.result, 'post']));
      look.forEach((p, j) => {
        const g = gates[j];
        const s = specState(g);
        if (s === 'red' && g.conclusion === 'cancelled') { p.state = 'cancelled'; p.url = g.html_url; return; }
        const post = posts[j];
        // The Actions run of this check run (its row's run_id), from the check run's own links; a
        // check run's id is not the run's (confirming review).
        const m = /\/actions\/runs\/(\d+)/.exec(`${g?.details_url || ''} ${g?.html_url || ''}`);
        p.run_id = m ? Number(m[1]) : null;
        // Green or red, the run's row must be posted: the fast path reads a green one, and a red is
        // the job's only when its row shows the job was judged (below).
        if (s !== 'gating' && (post?.status !== 'completed' || (post.started_at && g.completed_at && Date.parse(post.started_at) < Date.parse(g.completed_at)))) return;
        p.state = s;
        p.url = g?.html_url;
      });
    }
    // A spec gate that never reports (no run, a lost run, a post job that never ends) is closed past
    // the hold's cap, as a red that did not judge the job: rebuilt up to SPEC_REBUILDS times, then
    // refused (confirming review: the window must never wait on it for ever).
    for (const p of w) {
      if (p.state !== 'gating' || !p.spec_pr || !(Date.now() - (p.built_at ?? Date.now()) > HOLD_MINUTES(cfg) * MIN)) continue;
      const k = `${p.n}@${p.head}`;
      if ((ctx.rebuilt.get(k) || 0) < SPEC_REBUILDS) {
        ctx.rebuilt.set(k, (ctx.rebuilt.get(k) || 0) + 1);
        const r = onHeadMoved(w, p.n, `spec gate did not report within ${HOLD_MINUTES(cfg)} min`);
        closeSpecs(ctx, r.close);
        w = r.keep;
      } else { p.state = 'red'; p.notJudged = `no report within ${HOLD_MINUTES(cfg)} min, after ${SPEC_REBUILDS} rebuilds`; p.timedOut = true; }
      break;
    }
    const gone = w.findIndex((p) => p.state === 'cancelled');
    if (gone >= 0) { const r = onHeadMoved(w, w[gone].n, `spec gate cancelled (${w[gone].url || 'no run'})`); closeSpecs(ctx, r.close); w = r.keep; }
    // A red is the job's only when the spec run judged the job (its row's trigger is code) and the job
    // PR is as admitted now; a spec run that could not judge it (the job PR moved, closed or unread
    // while it ran: a spec finding, no suite) is closed and rebuilt, never refused.
    let red = firstRed(w);
    if (red >= 0) {
      const p = w[red];
      let judged = null;
      if (p.timedOut) judged = 'it never reported';
      else try {
        // The row of this check run, verified as the spec PR's own (cold review: never another run's).
        const row = gateRuns(io.comments(slug, p.spec_pr) || []).filter((x) => x.sha === p.result && p.run_id != null && x.run_id === p.run_id).pop();
        const o = io.getPR(slug, p.n);
        const same = o?.state === 'open' && !o.draft && o.base?.ref === cfg.tranche && (o.head?.sha === p.head || o.head?.sha === p.pushed);
        judged = !row ? 'no row' : !io.verify(slug, row, { pr: p.spec_pr, baseRef: cfg.tranche, branch: specHead(p.n, p.seq) }) ? 'its row does not verify' : row.trigger !== 'code' ? `its run did not judge the job (${row.trigger})` : !same ? 'the job PR changed since' : true;
      } catch (e) { if (!(e instanceof Fail) || e instanceof Stop) throw e; judged = `unread: ${e.message.split('\n')[0]}`; }
      // A red that is not the job's is rebuilt, up to SPEC_REBUILDS times for one head; then it is
      // refused as the serial train refuses a gate that ends so (cold review: a gate that times out
      // every time would cycle for ever).
      const k = `${p.n}@${p.head}`;
      if (judged !== true && (ctx.rebuilt.get(k) || 0) < SPEC_REBUILDS) {
        ctx.rebuilt.set(k, (ctx.rebuilt.get(k) || 0) + 1);
        const r = onHeadMoved(w, p.n, `spec gate red, not the job's: ${judged}`);
        closeSpecs(ctx, r.close);
        w = r.keep;
        red = -1;
      } else if (judged !== true) p.notJudged ||= `${judged}, after ${SPEC_REBUILDS} rebuilds`;
      if (red >= 0 && red > 0) {
        // Red behind others that have not landed (cold review: a green spec is not a land): never
        // refused on a base that may not come to be; it is judged again at the head of the window.
        ctx.solo.add(k);
        const r = onHeadMoved(w, p.n, `spec gate red behind PR ${w.slice(0, red).map((x) => x.n).join(', ')}: judged again at the head of the window`);
        closeSpecs(ctx, r.close);
        w = r.keep;
        red = -1;
      }
    }
    if (red >= 0) {
      const { refuse: p, close, keep } = onRed(w, red);
      const why = `the gate on the merged result is failure${p.notJudged ? ` with no judgment of the job (${p.notJudged})` : ''} (spec PR ${p.spec_pr}, ${s10(p.result)} on ${red ? `PR ${w.slice(0, red).map((x) => x.n).join(', ')} ahead` : 'the tranche tip'}): ${p.url || 'no run'}`;
      refuse(root, ctx, p, why);
      list = list.filter((c) => c.n !== p.n); // read before the refusal: not admitted again this pass
      record(root, ctx, `merge train: PR ${p.n} refused`, { at: now(), row: 'merge', session: ctx.session, pr: p.n, module: p.id, head: p.head, run: p.run, green_at: p.green_at, result: 'refused', why: why.slice(0, 300), spec_pr: p.spec_pr, window: true });
      closeSpecs(ctx, [{ ...p, cause: `red: ${why}` }, ...close]);
      w = keep;
    }
    ctx.window = w;
    if (w[0]?.state === 'green') {
      const p = w[0];
      mergeOne(root, ctx, { ...p, window: true, head: p.pushed ?? p.head, spec: p.spec_pr ? { pr: p.spec_pr, sha: p.result } : null }, { queue: list.length, idle });
      return true;
    }
    admitWindow(root, ctx, w, list, tip);
    ctx.window = w;
    return false;
  } finally {
    flushWindow(root, ctx);
  }
}
// After a window position's merge: landed, it leaves and the chain starts at the land; a fallback
// land (its tree was not the spec's) closes those behind, whose chain no longer holds; refused,
// every spec (all hold it) closes; to try again, the window stands.
function specDone(root, ctx, c, r, row) {
  const w = ctx.window;
  if (w[0]?.n !== c.n) return;
  const p = w[0];
  if (r?.merged) {
    const fast = r.spec?.fast === true || !p.spec_pr; // its own merged result, landed on its own gate: the chain holds
    if (p.spec_pr) windowRow(ctx, { event: fast ? 'land' : 'fallback', pr: p.n, seq: p.seq, position: 0, spec_pr: p.spec_pr, base: p.base, head: p.result, landed: r.sha, cause: fast ? 'landed on its spec' : `landed by the full re-gate: ${r.spec?.why || 'no spec answer'}` });
    if (p.spec_pr) closeSpecs(ctx, [{ ...p, cause: 'landed' }], 'closed');
    const { keep } = onLand(w, r.sha);
    if (!fast && keep.length) { closeSpecs(ctx, keep.map((x) => ({ ...x, cause: `PR ${p.n} landed by its full re-gate, not on its spec` }))); ctx.window = []; } else ctx.window = keep;
  } else if (row.result === 'refused' || row.to_bob) {
    closeSpecs(ctx, w.map((x, i) => ({ ...x, cause: i ? `refused ahead: PR ${p.n}` : `refused: ${row.why}` })));
    ctx.window = [];
  }
  flushWindow(root, ctx);
}
// A restarted train's window, from its rows and the spec pull requests still open.
function restoreWindow(root, ctx) {
  const { cfg, slug, io, log } = ctx;
  try { ctx.windowRows = jsonl(readState(root, cfg.state_branch, WINDOW_FILE) || ''); } catch { ctx.windowRows = []; }
  const tip = git(['rev-parse', `refs/remotes/origin/${cfg.tranche}`], { cwd: root });
  const ended = new Set(ctx.windowRows.filter((r) => r.row === 'spec' && r.event !== 'build').map((r) => `${r.pr}-${r.seq}`));
  const live = ctx.windowRows.filter((r) => r.row === 'spec' && r.event === 'build' && !ended.has(`${r.pr}-${r.seq}`));
  const open = live.filter((r) => { try { return io.getPR(slug, r.spec_pr)?.state === 'open'; } catch (e) { if (!(e instanceof Fail) || e instanceof Stop) throw e; return true; } }).map((r) => r.spec_pr);
  const { window, close } = restore(ctx.windowRows, open, tip);
  // The predicted results, which a fresh clone lacks (cold review): the window builds onto them.
  if (window.length) git(['fetch', '-q', 'origin', ...window.map((p) => `+refs/heads/${specHead(p.n, p.seq)}:refs/remotes/origin/${specHead(p.n, p.seq)}`)], { cwd: root, allowFail: true });
  closeSpecs(ctx, close);
  ctx.window = window.map((p) => ({ ...p, built_at: Date.now() })); // a restart's clock starts again
  log(`window: restarted with ${window.length} position(s)${window.length ? ` (PR ${window.map((p) => p.n).join(', ')})` : ''}${close.length ? `; ${close.length} spec(s) closed` : ''}`);
  flushWindow(root, ctx);
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
  // The pin move's wake, printed once per merge commit (state.mjs wakeOnce): from the train's row,
  // or, where no row carries it (a train that stopped after its land, an older row), from git
  // (merge.mjs pinWake; build train-robust, option 2A: copy PR 499, 5 Nov 12:21, woke no one).
  const wakeOf = (sha, end) => (end?.what ? { what: end.what, wake: end.wake || bobWake(end.what, q.as) } : pinWake(root, cfg.tranche, sha, q.as));
  const landed = (sha, end, line) => {
    log(line);
    const w = wakeOf(sha, end);
    if (w.what) printWake(root, cfg.state_branch, { pr: Number(n), sha, what: w.what, wake: w.wake, as: q.as, by: 'caller', log });
    return { merged: true, sha, checks: end?.checks || [], wake: w.wake || null, what: w.what || null, train: true };
  };
  const report = (end) => (end.result === 'merged' ? landed(end.sha, end, `merged pull request ${n} at ${end.sha} (${end.merged_at})`) : null);
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
        if (p.merged) return landed(p.merge_commit_sha, null, `merged pull request ${n} at ${p.merge_commit_sha} (by the train)`);
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
  const ended = plainEnds([...trains, ...(ctx.pending || []).map((p) => p.row)]);
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
// A clash on the state branch in this clone (cannot read origin's state branch, a ref-lock
// failure, the state lock held past its wait) is tried again too (build train-robust, option 1A:
// copy, 5 Nov 12:36, PR 502 refused for "cannot lock ref" and queued again by hand).
const PLAIN_AGAIN = /moved since GitHub reported|moved while|moved past|changed while its base moved|still running on|has not said whether|could not read|could not be read|was not pushed|does not show|not up to date|base moved|cannot read origin's|cannot lock ref|unable to update local ref|the state lock|was refused \d+ times/i;
function plainOne(root, ctx, q, { queue, idle }) {
  const { cfg, slug, log } = ctx;
  const started = Date.now();
  const tick = (l) => {
    log(l);
    ctx.renew();
    if (ctx.pipeline && !(ctx.k > 1) && ctx.prepared === null && /^waiting for (the )?gate/.test(l)) prepare(root, ctx, q.pr);
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
    if (p.merged) {
      // Landed before this pass (a train that stopped after its land, or by hand): the wake from
      // git (build train-robust, option 2A), recorded once per merge commit; its caller prints it.
      const w = pinWake(root, cfg.tranche, p.merge_commit_sha, q.as ?? 'bob');
      Object.assign(row, { result: 'merged', sha: p.merge_commit_sha, merged_at: now(), elsewhere: true, wake: w.wake, what: w.what });
    }
    else {
      const head = syncPlain(root, ctx, q);
      const withdrawn = () => {
        fetchState(root, cfg.state_branch, { fresh: true });
        const pr = jsonl(readState(root, cfg.state_branch, PLAIN_FILE));
        if (pr.some((r) => r.row === 'withdraw' && r.id === q.id)) fail(`pull request ${q.pr} was withdrawn from the queue by its caller; nothing was landed`);
        if (callerGone(pr, q.id)) fail(`pull request ${q.pr} was withdrawn from the queue: its caller did not renew it within ${GATE_WAIT_MINUTES} min; nothing was landed`);
      };
      const r = mergePlain(root, q.pr, { quietWake: true, reviewed: q.reviewed || undefined, noReview: q.no_review || undefined, rounds: q.rounds, decision: q.decision || undefined, as: q.as, head, slug, io: ctx.io, minutes: ctx.minutes, every: ctx.every, wait: ctx.wait, log: tick, beforeLand: () => { leaseHeld(root, cfg, ctx.session, ctx.token, ctx.approvals); withdrawn(); } });
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
  // The wake's record, once per merge commit, before the row (a row kept for later still has it recorded).
  if (row.result === 'merged' && row.wake) {
    try { wakeOnce(root, cfg.state_branch, { pr: q.pr, sha: row.sha, what: row.what, wake: row.wake, by: 'train' }); } catch (e) { if (!(e instanceof Fail) || e instanceof Stop) throw e; }
    log(`PR ${q.pr} moved the pin: the wake of BOB is its caller's to give (${q.by || 'its queue row'}), printed once`);
  }
  record(root, ctx, `merge train: PR ${q.pr} ${row.result} (plain)`, row);
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
  const io = { getPR, comments, checkRun, checkRuns, mergePR, openPRs, createPR, editPR, prsFromBranch, baseEverChanged, verify: (s, r, c) => verifyRow(s, r, c), ...(opts.io || {}) };
  // The batched reads: GitHub's at once, or, where a caller gives its own single read, that one in turn.
  const given = opts.io || {};
  if (!given.checkRunMany) io.checkRunMany = given.checkRun ? (s, pairs) => pairs.map(([sha, name]) => io.checkRun(s, sha, name)) : checkRunMany;
  if (!given.checkRunsMany) io.checkRunsMany = given.checkRuns ? (s, pairs) => pairs.map(([sha, name]) => io.checkRuns(s, sha, name)) : checkRunsMany;
  if (!given.commentsMany) io.commentsMany = given.comments ? (s, ns) => ns.map((n) => { try { return io.comments(s, n) || []; } catch { return null; } }) : commentsMany;
  const ctx = { cfg, slug, io, log, session, minutes: opts.minutes || GATE_WAIT_MINUTES, every: opts.every, wait: opts.wait, pipeline: opts.pipeline ?? !once, diskFree: opts.diskFree || diskFreeMb, diskMin: opts.diskMinMb ?? DISK_MIN_MB, refused: new Map(), refusedWhy: new Map(), backoff: new Map(), plainTaken: new Set(), pending: [], inflight: null, transient: opts.transient, bob: undefined, rows: [], gates: new Map(), prepared: null, notes: [] };
  ctx.token = randomBytes(8).toString('hex');
  // The window (window.mjs), only past 1: merge and the merged-result build are given by a test.
  Object.assign(ctx, { k: cfg.merge_train_window || 1, merge: opts.merge || merge, build: opts.build || buildResult, window: [], windowRows: [], causes: new Map(), seqs: new Map(), buildFailed: new Set(), rebuilt: new Map(), solo: new Set() });
  ctx.onQueue = opts.onQueue; // a test reads the queue each round
  const carry = new Map();
  ctx.noteFor = (c) => carriedNote(root, cfg, ctx.notes, c.n, c.head, ctx.bob, carry);
  const { takeover, dead } = takeLease(root, cfg, session, ctx.token, { take: true });
  ctx.renewed = Date.now();
  ctx.renew = () => { if (Date.now() - ctx.renewed >= LEASE.renew * MIN) { takeLease(root, cfg, session, ctx.token); ctx.renewed = Date.now(); } };
  // Renewed under every command the train runs, not only at its lines (util.mjs heartbeat). A lost
  // lease stops the train there; a renewal that could not be pushed is tried at the next command.
  const off = heartbeat(() => { try { ctx.renew(); } catch (e) { if (e instanceof Stop || !(e instanceof Fail)) throw e; ctx.renewed = Date.now() - Math.max(0, LEASE.renew * MIN - 30000); } }); // a failed push: tried again in 30 s
  // Heads refused by an earlier train wait as this one's would (a restart re-sends nothing).
  try { if (fetchState(root, cfg.state_branch, { fresh: true })) for (const x of jsonl(readState(root, cfg.state_branch, TRAIN_FILE))) if (x.result === 'refused' && x.head) { ctx.refused.set(`${x.pr}@${x.head}@${x.run}`, x.at); ctx.refusedWhy.set(`${x.pr}@${x.head}@${x.run}`, String(x.why || '')); } } catch { /* unread: tried again */ }
  log(`merge train: lease held by ${session}${dead ? ' (taken over from this session\'s train that is no longer running)' : takeover ? ' (taken over from an expired lease)' : ''}`);
  try {
    // A shallow clone cuts the history the provider hold reads (git merge-base of the tranche and a
    // provider's head fails, and the hold reads "not held" for every provider: 5 Nov 07:04, the
    // MERGER's session clone; create_session gives a shallow clone with or without clone_depth).
    // The tranche's own history past main is fetched once, here, after the lease and before the
    // loop; the whole history is not (copy, 5 Nov 18:08: --unshallow took ~400 s of a 458 s
    // lease-to-pick; measured here, 303 s against 58 s past main). That fetch stops at each merge
    // of main into the tranche (both its parents cut; report.mjs deepen mends those, measured on
    // the copy at 11 s for no head more read): a head still without its merge base, cut from main
    // or from below such a merge, is deepened to the one GitHub's compare names when the hold
    // first reads it (mendBase).
    if (isShallow(root)) {
      // Marked first: no --depth 1 fetch in this clone (util.mjs depth) cuts what is fetched now.
      git(['config', DEEP_MARK, 'true'], { cwd: root, allowFail: true });
      const t0 = Date.now();
      const u = git(['fetch', '-q', `--shallow-exclude=${MAIN}`, 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root, allowFail: true });
      log(u.code === 0 ? `merge train: this clone is shallow; ${cfg.tranche}'s history past ${MAIN} fetched in ${Date.now() - t0} ms` : `merge train: this clone is shallow and ${cfg.tranche}'s history past ${MAIN} was not fetched (${u.stderr.trim().split('\n').pop()}); each head's merge base is read from GitHub's compare as the hold needs it`);
    }
    git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root });
    ctx.approvals = approvalsHash(root, `refs/remotes/origin/${cfg.tranche}`);
    if (ctx.k > 1) restoreWindow(root, ctx);
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
  let passes = 0;
  for (;;) {
    const t0 = Date.now();
    ctx.steps = [];
    // The state branch at the top of a pass: a clash or a held state lock that outlasts its tries
    // waits for the next pass, never stopping the train (review of build train-robust); a Stop (a
    // lost lease) still stops it.
    try {
      ctx.renew();
      if (ctx.pending.length) flushPending(root, ctx);
      timed(ctx, 'state', () => { if (fetchState(root, cfg.state_branch, { fresh: true })) ctx.notes = jsonl(readState(root, cfg.state_branch, NOTES_FILE)); });
    } catch (e) {
      if (!(e instanceof Fail) || e instanceof Stop) throw e;
      log(`the state branch is unread this pass (${e.message.split('\n')[0]}): the train tries again at the next pass`);
      if (once || --rounds <= 0) return { rows: ctx.rows };
      sleep(idleEvery);
      continue;
    }
    // BOB as addressed now (a handover moves it): only its review notes count.
    let bob = null;
    try { bob = readAddress(root, { fetch: false }).bob?.session || null; } catch { bob = null; }
    if (bob !== ctx.bob) log(bob ? `review notes count from BOB ${bob}` : 'no BOB addressed: no review note counts');
    ctx.bob = bob;
    // A merged result gating under a hold goes before everything (inflight.mjs).
    const h = unendedHold(readHolds(root, cfg.state_branch)) || ctx.inflight; // this train's, when its row was not written
    if (h && heldPass(root, ctx, h, { idle: mins(idleFrom, Date.now()) })) {
      idleFrom = Date.now();
      if (once || --rounds <= 0) return { rows: ctx.rows };
      if (ctx.inflight) sleep(idleEvery);
      continue;
    }
    // A queued plain pull request goes before every job (its caller waits): oldest first.
    const plain = timed(ctx, 'plain', () => plainReady(root, ctx));
    expirePlain(root, ctx);
    // Past a window of 1, the window's pass picks (windowPass): ready() runs inside it.
    const win = ctx.k > 1;
    const list = plain.length || win ? [] : ready(root, ctx);
    const ms = Date.now() - t0;
    if (passes++ === 0 || ms >= STEPS_SAID_MS) {
      for (const [name, t] of ctx.steps) log(`train step ${name}: ${t} ms`);
      log(`train pass: ${ms} ms to the pick (${list.length} ready${plain.length ? `, ${plain.length} plain` : ''})`);
    }
    const first = list.find((c) => c.n === ctx.prepared?.n) || list[0];
    if (!win) ctx.onQueue?.(list);
    let landed = false;
    if (plain.length) {
      plainOne(root, ctx, plain[0], { queue: plain.length, idle: mins(idleFrom, Date.now()) });
      idleFrom = Date.now();
    } else if (win) {
      if ((landed = windowPass(root, ctx, { idle: mins(idleFrom, Date.now()) }))) idleFrom = Date.now();
    } else if (first) {
      mergeOne(root, ctx, first, { queue: list.length, idle: mins(idleFrom, Date.now()) });
      idleFrom = Date.now();
    } else ctx.prepared = null;
    if (once || --rounds <= 0) return { rows: ctx.rows }; // rounds: a bounded run, for tests
    if (Math.floor(Date.now() / 36e5) !== hour) { hour = Math.floor(Date.now() / 36e5); log(`hourly: record your context: ${P3} merge train beat --session ${session} --context <percent>`); }
    if (!first && !plain.length && !landed) sleep(idleEvery);
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
    // The window's lands (condition 4): on their spec (the fast path) against the full re-gate.
    spec_lands: { fast: ok.filter((r) => r.spec_fast === true).length, fallback: ok.filter((r) => r.spec_fast === false).length },
  };
}
export const trainLines = (s) => [
  `Merge train: ${s.merged} merged, ${s.refused} handed to BOB, ${s.retried} tries again later; green -> merged median ${s.green_to_merged.median} min, p90 ${s.green_to_merged.p90}, worst ${s.green_to_merged.worst}. Baselines: ${s.baselines.map((b) => `${b.name}: median ${b.median}${b.p90 ? `, p90 ${b.p90}` : ''}${b.worst ? `, worst ${b.worst}` : ''}`).join('; ')}.`,
  `Prepared while the previous gate ran: ${s.prepared_share}% (prep median ${s.prep_minutes_median} min); queue depth as each merge neared its end ${JSON.stringify(s.queue_at_merge_end)}; idle gaps ${s.idle_gaps_min.total} min (worst ${s.idle_gaps_min.worst}); disk used per merge median ${s.disk_mb_per_merge.median} MB (worst ${s.disk_mb_per_merge.worst}), least free before a merge ${s.disk_free_mb_least} MB; ${s.held_for_providers} PR(s) held for a provider; lease takeovers ${s.lease_takeovers}; state-branch tries max ${s.push_tries.max}, ${s.push_tries.over_one} over one; merger context ${s.merger_context_per_hour}%/h.`,
  ...(s.spec_lands && s.spec_lands.fast + s.spec_lands.fallback ? [`Window lands: ${s.spec_lands.fast} on their spec gate, ${s.spec_lands.fallback} by the full re-gate.`] : []),
];
