// The state branch (REC-1, transient): BOB's one-screen handoff (SES-3) and numbered messages
// (MSG-1, MSG-3, MSG-6). Each file has one writer (REC-2): handoff/<role>.md by that role,
// messages/<sender>.jsonl by that sender. The address file is build K's; send only reads it.
// The tool cannot call send_message: send records and prints, the session delivers.
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Fail, Superseded, fail, fetchRetry, git, now, pushRetry, withStateLock, withTemp } from './util.mjs';
import { commonDir } from './pace.mjs';

export const handoffFile = (role) => `handoff/${role}.md`;
export const messagesFile = (from) => `messages/${from}.jsonl`;
export const addressFile = (role) => `addresses/${role}.json`; // build K's; read only here
export const HANDOFF_MAX = { lines: 40, bytes: 4096, notes: 5 };
const NAME = /^[a-z][a-z0-9-]{0,39}$/;
export const roleName = (v, what) => (typeof v === 'string' && NAME.test(v) ? v : fail(`${what} must be a role name (lower case letters, digits and -), not ${JSON.stringify(v)}`));

const ref = (sb) => `refs/remotes/origin/${sb}`;

// Fetches the state branch; false when origin has none. A failed read is a failure, not "none".
// One fetch, no ls-remote (each round trip cost up to 26 s measured 3 Nov), at most once per
// command: readAddress, bobStatus and sweep in one run share it. writeState asks fresh, since it
// must build on the latest tip.
const fetched = new Map();
// Across the clone's p3 processes too (R17f, coordinator's C12 part 2: 275 fetches an hour, most
// of them the product's state branch, read by each command and each poll): a read that is not
// fresh takes the clone's copy when another process fetched it within STATE_READ_S and the clone's
// ref is still what that fetch left. A fresh read (every write, and what asks for one) always
// fetches. Not ls-remote first: a fetch that finds nothing new costs GitHub what ls-remote does
// (the ref advertisement), and one that finds something would cost two round trips.
export const STATE_READ_S = 30;
const stampOf = (root, sb) => join(commonDir(root), `p3-state-read-${sb.replace(/[^\w.-]/g, '_')}`);
const localTip = (root, sb) => git(['rev-parse', '-q', '--verify', `${ref(sb)}^{commit}`], { cwd: root, allowFail: true }).stdout.trim() || null;
function recentRead(root, sb) {
  try {
    const st = JSON.parse(readFileSync(stampOf(root, sb), 'utf8'));
    return Date.now() - st.at < STATE_READ_S * 1000 && st.at <= Date.now() && st.tip && st.tip === localTip(root, sb);
  } catch { return false; }
}
export function fetchState(root, sb, { fresh = false } = {}) {
  const key = `${root}\0${sb}`;
  if (!fresh && fetched.has(key)) return fetched.get(key);
  if (!fresh && !batch.pending.get(key)?.list.length && recentRead(root, sb)) { fetched.set(key, true); return true; }
  // Under the clone's state lock, a ref-lock clash retried (build train-robust: two p3 processes
  // in one clone failed "cannot lock ref" and the train refused a plain row, copy 5 Nov 12:36).
  // The stamp is the tip this fetch left, taken under the same lock: never a local write another
  // process made onto the ref after it (cold review of R17f). A branch gone from origin: no stamp.
  const r = withStateLock(root, () => {
    const f = fetchRetry(['fetch', '-q', 'origin', `+refs/heads/${sb}:${ref(sb)}`], { cwd: root });
    try { if (f.code === 0) writeFileSync(stampOf(root, sb), JSON.stringify({ at: Date.now(), tip: localTip(root, sb) })); else rmSync(stampOf(root, sb), { force: true }); } catch { /* a saving, not a gate */ }
    return f;
  });
  if (r.code !== 0 && !/couldn't find remote ref/i.test(r.stderr)) fail(`cannot read origin's ${sb}: ${r.stderr.trim()}`);
  fetched.set(key, r.code === 0);
  // A coalesced command's writes not yet pushed (R17): made again on the tip just read.
  if (r.code === 0 && batch.pending.get(key)?.list.length) withStateLock(root, () => rebuild(root, sb, batch.pending.get(key)));
  return r.code === 0;
}

// A file as the fetched state branch holds it, or null.
export function readState(root, sb, path) {
  const r = git(['show', `${ref(sb)}:${path}`], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout : null;
}

export const jsonl = (text) => (text || '').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });

// Changes the state branch in a worktree of its own (the caller's checkout never moves), commits
// and pushes with pushRetry: never forced. A branch origin lacks starts as an orphan commit.
// When the push is rejected because another writer moved the branch, the change is made again on
// the fresh tip, never merged (defect sweep 4 Nov, #12): so `change` must be a function of the
// worktree it is given and its own arguments only, and every caller's is. The writers, and what
// each one's change writes: send and send delivered|failed (messages/<from>.jsonl, appended, its
// number counted from the file), handoff (handoff/<role>.md), start record, handover confirm and
// the prompt refresh (addresses/<role>.json, each re-reading the address it may replace;
// handover confirm also appends metrics/handover.jsonl), job start --restart (metrics/restart.jsonl),
// sweep (heartbeat, and metrics/sweep.jsonl appended), lane ask (lanes/asks.jsonl, appended), notice
// recording, withdraw and triage (one file per row, added only when absent), layer close
// (layers/closed.jsonl), release record (releases/dev.jsonl), deploy dev (deploys/dev.jsonl), branches prune (branches/prune.jsonl, appended) and
// tranche open and close (metrics/tranche-open.jsonl, tranches/closed.jsonl, appended). A failure inside `change` pushes nothing.
// The whole write (fetch, change, commit, push, read-back) holds the clone's state lock (util.mjs
// withStateLock): a `change` makes no network call, so nothing but the state fetch and push is
// waited on under it.
export function writeState(root, sb, msg, change, opts = {}) {
  if (batch.on) return withStateLock(root, () => writeStateLocal(root, sb, msg, change));
  return withStateLock(root, () => writeStateNow(root, sb, msg, change, opts));
}
// A change that does not apply to the state branch as it stands now (a kept write's replay, or a
// change refused on a tip another writer moved): no other writer's failure, so a replay goes on past it.
export class NotApplied extends Fail {}

// Coalesced writes (R17, GitHub pacing; the copy pushed its state branch up to 173 times an hour,
// 6 Nov). While a command runs (p3.mjs main turns it on), writeState commits onto the clone's copy
// of the state branch, which readState reads, and pushes nothing; flushState pushes them all at
// once, at the command's end and before any wait on GitHub.
// - The flush never trusts the clone's ref (another p3 process in the clone may have fetched over
//   it, cold review of R17): under the state lock it fetches origin's tip and makes every pending
//   change again on it, in order, then pushes; refused because another writer moved the branch,
//   it makes them again on that tip (each change is a function of the tip, as writeState's own
//   retry already needs).
// - Each pending write is also kept at once under refs/p3/pending/<pid>/, its own commit, so a
//   command killed before its flush loses nothing: the next command in the clone moves a dead
//   process's pending writes to refs/p3/unpushed/, which `state replay` pushes. A flush refused to
//   the end moves its own there, never another writer's commit.
// - A later write in the command, or a fresh read, makes the pending changes again on the tip it
//   finds when the clone's ref no longer holds them.
const batch = { on: false, pending: new Map() };
export function stateBatch(on = true) { batch.on = !!on; }
// fn with writes pushed at once, whatever the command's batching (a pause every session must see).
export function unbatched(fn) { const was = batch.on; batch.on = false; try { return fn(); } finally { batch.on = was; } }
// fn() once the command's pending state writes are pushed (never, if they are not).
// Keyed by the clone and branch whose push it waits on (cold review of R17e); dropped if that push
// is refused (its writes are kept for replay).
const flushedFns = new Map();
export function onFlushed(root, sb, fn) { const k = `${root}\0${sb}`; flushedFns.set(k, [...(flushedFns.get(k) || []), fn]); }
// Pending writes that are not bookkeeping: what a usage share may ride (C18).
export const realPendingWrites = () => [...batch.pending.values()].reduce((n, x) => n + x.list.filter((w) => !w.book).length, 0);
export const pendingWrites = () => [...batch.pending.values()].reduce((n, x) => n + x.list.length, 0);
const tipOf = (root, sb) => git(['rev-parse', '-q', '--verify', `${ref(sb)}^{commit}`], { cwd: root, allowFail: true }).stdout.trim() || null;
const emptyStart = (root, sb) => git(['commit-tree', git(['hash-object', '-t', 'tree', '/dev/null'], { cwd: root }), '-m', `${sb}: the state branch`], { cwd: root });
const PENDING = `refs/p3/pending/${process.pid}/`;
const UNPUSHED = 'refs/p3/unpushed/';
// One change made and committed in wt. A change that refuses on the tip it now meets puts the
// worktree back: a Superseded refusal (its work done by another writer: the idle check's "another
// check landed first") is dropped with a logged line; any other refusal is returned as refused, for
// the caller to report, never kept for a replay that would refuse it too (the coordinator, 6 Nov: the
// idle check's refusal, met only at the flush on origin's newer tip, parked every write of the
// command in refs/p3/unpushed, four times; cold review: a reservation that lost must say so).
export const DROPPED = 'state write dropped on the state branch as it stands now';
function applyOne(wt, { msg, change }, log = (l) => console.error(l)) {
  let o;
  try { o = change(wt); } catch (e) {
    if (!(e instanceof Fail)) throw e;
    git(['reset', '-q', '--hard', 'HEAD'], { cwd: wt });
    git(['clean', '-qfd'], { cwd: wt });
    if (!(e instanceof Superseded)) return { refused: e.message };
    log(`note: ${DROPPED}: ${msg}: ${e.message}`);
    return { dropped: e.message };
  }
  git(['add', '-A'], { cwd: wt });
  git(['commit', '-q', '--allow-empty', '-m', msg], { cwd: wt });
  return { o };
}
// Each change made and committed in a worktree at start, in order; the clone's ref moved to the result.
function commitAll(root, sb, start, list, log = () => {}) {
  return withTemp('p3-state-', (tmp) => {
    const wt = join(tmp, 's');
    git(['worktree', 'add', '-q', '--detach', wt, start], { cwd: root });
    const made = list.map((x) => { const r = applyOne(wt, x, log); return { o: r.o || {}, dropped: r.dropped ?? r.refused, c: git(['rev-parse', 'HEAD'], { cwd: wt }) }; });
    const tip = git(['rev-parse', 'HEAD'], { cwd: wt });
    git(['update-ref', ref(sb), tip], { cwd: root });
    return { tip, made };
  }, { root });
}
// The pending changes made again on the clone's ref as it stands now (origin's tip, or empty).
function rebuild(root, sb, entry) {
  entry.base = tipOf(root, sb); // the tip it is built on: what a bookkeeping-only flush restores (cold review)
  const r = commitAll(root, sb, tipOf(root, sb) || emptyStart(root, sb), entry.list, (l) => console.error(l));
  for (const [i, m] of r.made.entries()) if (m.dropped !== undefined && !/^note: /.test(m.dropped)) console.error(`note: a pending state write refuses on the moved tip: ${entry.list[i].msg}: ${m.dropped}; the flush reports it`);
  entry.tip = r.tip;
  return r;
}
function writeStateLocal(root, sb, msg, change) {
  const key = `${root}\0${sb}`;
  const entry = batch.pending.get(key) || { root, sb, list: [], tip: null };
  if (!entry.list.length) { fetchState(root, sb); entry.base = tipOf(root, sb); }
  else if (tipOf(root, sb) !== entry.tip) rebuild(root, sb, entry); // the ref moved under this command
  const { tip, made } = commitAll(root, sb, tipOf(root, sb) || emptyStart(root, sb), [{ msg, change }]);
  // Refused on the clone's tip: as writeStateNow refuses, nothing kept or pending.
  if (made[0].dropped !== undefined) { git(['update-ref', ref(sb), tip], { cwd: root }); throw new Fail(made[0].dropped); }
  const n = entry.list.length;
  git(['update-ref', `${PENDING}${String(n).padStart(4, '0')}`, made[0].c], { cwd: root });
  entry.list.push({ msg, change });
  entry.tip = tip;
  batch.pending.set(key, entry);
  fetched.set(key, true);
  return { ...made[0].o, tip };
}
// The kept pending writes of p3 processes no longer running in this clone, moved to UNPUSHED
// for `state replay`; returns how many.
export function strandedWrites(root, { alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } } } = {}) {
  const refs = git(['for-each-ref', '--format=%(refname)', 'refs/p3/pending/'], { cwd: root, allowFail: true }).stdout.split('\n').filter(Boolean);
  let n = 0;
  for (const r of refs) {
    const pid = Number(r.split('/')[3]);
    if (pid === process.pid || alive(pid)) continue;
    const c = git(['rev-parse', r], { cwd: root });
    git(['update-ref', `${UNPUSHED}${Date.now()}-${pid}-${r.split('/').pop()}-${c.slice(0, 7)}`, c], { cwd: root });
    git(['update-ref', '-d', r], { cwd: root });
    n++;
  }
  return n;
}
const dropPending = (root) => { for (const r of git(['for-each-ref', '--format=%(refname)', PENDING], { cwd: root, allowFail: true }).stdout.split('\n').filter(Boolean)) git(['update-ref', '-d', r], { cwd: root }); };
// Pushes every pending write, one push per state branch. Refused to the end, or a change refusing
// on origin's tip, its own kept commits move to refs/p3/unpushed/ and the refusal names the replay.
// Returns the writes pushed.
// Bookkeeping (C18, 7 Nov: the account at its push ceiling, BOB's clone 10 of 26 pushes nothing
// but the tool's own records: idle-check rows, starts owed after a merge had pushed, paid after a
// job start): a record the tool keeps for itself never makes a push of its own. It rides the
// command's real write; with none, it waits in the clone (DEFERRED) and rides the next real write
// any p3 process of the clone makes. The clone's own reads see it meanwhile (readStateWith). A
// kind is applied by the function its module registers: fn(dir, payload), payload.path the file.
const appliers = new Map();
export function onBookkeeping(kind, fn) { appliers.set(kind, fn); }
const deferredFile = (root, sb) => join(commonDir(root), `p3-deferred-${sb.replace(/[^\w.-]/g, '_')}.jsonl`);
function deferredOps(root, sb) {
  try { return readFileSync(deferredFile(root, sb), 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { const o = JSON.parse(l); return appliers.has(o.kind) ? [o] : []; } catch { return []; } }); } catch { return []; }
}
// Appended under the lock; an idle-check row an hour old is dropped (a later check measures again),
// so a clone that only reads keeps a short file (cold review of C18).
function deferOps(root, sb, ops) {
  if (!ops.length) return;
  const f = deferredFile(root, sb);
  let old = [];
  try { old = readFileSync(f, 'utf8').split('\n').filter(Boolean); } catch { old = []; }
  const keep = old.filter((l) => { try { const o = JSON.parse(l); return !(o.kind === 'check' && Date.now() - Date.parse(o.payload?.row?.at) > 3600e3); } catch { return false; } });
  writeFileSync(f, [...keep, ...ops.map((o) => JSON.stringify(o))].join('\n') + '\n');
}
// The ops pushed: removed from the file, ops another process added meanwhile kept.
function dropDeferred(root, sb, ops) {
  const done = new Set(ops.map((o) => JSON.stringify(o)));
  try {
    const left = readFileSync(deferredFile(root, sb), 'utf8').split('\n').filter(Boolean).filter((l) => !done.has(l));
    if (left.length) writeFileSync(deferredFile(root, sb), left.join('\n') + '\n'); else rmSync(deferredFile(root, sb), { force: true });
  } catch { /* none */ }
}
// Waiting records pushed by a later write: what waited on them is told, as by a replay.
const pushedBooks = (root, ops) => { for (const o of ops) for (const fn of replayedFns) { try { fn(o.msg, root); } catch { /* a record only */ } } };
const asWrite = (o) => ({ msg: o.msg, change: (dir) => { appliers.get(o.kind)(dir, o.payload); return {}; }, book: o });
export function bookkeep(root, sb, msg, kind, payload) {
  if (!appliers.has(kind)) fail(`bookkeeping ${kind}: no applier registered`);
  const o = { kind, msg, payload };
  if (batch.on) { withStateLock(root, () => { writeStateLocal(root, sb, msg, asWrite(o).change); batch.pending.get(`${root}\0${sb}`).list.at(-1).book = o; }); return; }
  withStateLock(root, () => deferOps(root, sb, [o]));
}
// A state file as the clone knows it: the branch's, with the clone's bookkeeping not yet pushed.
export function readStateWith(root, sb, path) {
  const text = readState(root, sb, path);
  const ops = deferredOps(root, sb).filter((o) => o.payload?.path === path);
  if (!ops.length) return text;
  return withTemp('p3-state-', (tmp) => {
    mkdirSync(dirname(join(tmp, path)), { recursive: true });
    if (text !== null) writeFileSync(join(tmp, path), text);
    for (const o of ops) { try { appliers.get(o.kind)(tmp, o.payload); } catch { /* a record only */ } }
    return existsSync(join(tmp, path)) ? readFileSync(join(tmp, path), 'utf8') : null;
  }, { root });
}
export function flushState({ log = () => {} } = {}) {
  let n = 0;
  const lost = [];
  for (const [key, entry] of [...batch.pending]) {
    batch.pending.delete(key);
    if (!entry.list.length) continue;
    const { root, sb } = entry;
    // Bookkeeping alone: no push; it waits in the clone for a real write (C18).
    if (entry.list.every((x) => x.book)) {
      withStateLock(root, () => {
        deferOps(root, sb, entry.list.map((x) => x.book));
        // The clone's copy of the branch back to origin's as read: the records live in DEFERRED only.
        if (tipOf(root, sb) === entry.tip) git(['update-ref', ...(entry.base ? [ref(sb), entry.base] : ['-d', ref(sb)])], { cwd: root, allowFail: true });
      });
      dropPending(root);
      fetched.delete(key);
      flushedFns.delete(key); // settled when a later write pushes them (pushedBooks)
      continue;
    }
    // A real write: the clone's waiting bookkeeping rides it, read and dropped under the lock that
    // pushes it, so no other process of the clone pushes or loses the same records (cold review).
    const waiting = [];
    const list = [...entry.list];
    const refused = [];
    const dropped = [];
    const out = new Set(); // the indexes of the writes left out, never kept for a replay
    try {
      withStateLock(root, () => {
        const have = fetchRetry(['fetch', '-q', 'origin', `+refs/heads/${sb}:${ref(sb)}`], { cwd: root });
        if (have.code !== 0 && !/couldn't find remote ref/i.test(have.stderr)) fail(`cannot read origin's ${sb}: ${have.stderr.trim()}`);
        if (have.code !== 0) git(['update-ref', '-d', ref(sb)], { cwd: root, allowFail: true });
        waiting.push(...deferredOps(root, sb));
        list.push(...waiting.map(asWrite));
        withTemp('p3-state-', (tmp) => {
          const wt = join(tmp, 's');
          git(['worktree', 'add', '-q', '--detach', wt, tipOf(root, sb) || emptyStart(root, sb)], { cwd: root });
          // Each pending change made again on the tip met: a superseded one dropped and logged; one that
          // refuses there left out and reported once the others are pushed, never kept.
          const redo = () => { refused.length = 0; dropped.length = 0; out.clear(); for (const [i, x] of list.entries()) { const r = applyOne(wt, x, (l) => { log(l); console.error(l); }); if (r.refused !== undefined) refused.push(`${x.msg}: ${r.refused}`); if (r.dropped !== undefined) dropped.push(x.msg); if (r.o === undefined) out.add(i); } };
          redo();
          pushRetry(wt, sb, { redo, log, stamp: true, wait: stateIO.wait ?? 2000, ...(stateIO.push ? { push: () => stateIO.push(wt, sb) } : {}) });
        }, { root });
        if (waiting.length) dropDeferred(root, sb, waiting);
      });
    } catch (e) {
      flushedFns.delete(key);
      const all = git(['for-each-ref', '--format=%(refname)', PENDING], { cwd: root, allowFail: true }).stdout.split('\n').filter(Boolean);
      for (const r of all.filter((x) => out.has(Number(x.split('/').pop())))) git(['update-ref', '-d', r], { cwd: root });
      const kept = all.filter((x) => !out.has(Number(x.split('/').pop())));
      const t = Date.now();
      const names = kept.map((r) => { const name = `${UNPUSHED}${t}-${r.split('/').pop()}`; git(['update-ref', name, r], { cwd: root }); git(['update-ref', '-d', r], { cwd: root }); return name; });
      fetched.delete(key);
      if (e instanceof Fail) fail(`${e.message}. This command's ${kept.length} state write(s) are kept: replay them with \`node .process/tool/p3.mjs state replay\` (${names.join(', ')})`);
      throw e;
    }
    dropPending(root);
    if (waiting.length) pushedBooks(root, waiting);
    n += list.length - refused.length - dropped.length;
    try { fetchState(root, sb, { fresh: true }); } catch { fetched.delete(key); }
    lost.push(...refused);
    // What waited on this push (R17e: a usage share carried by it records when it went).
    for (const fn of flushedFns.get(key) || []) { try { fn(); } catch { /* a record only */ } }
    flushedFns.delete(key);
  }
  if (lost.length) fail(`${lost.length} state write(s) of this command refused on the state branch as it stands now, so not written (the command's other writes are pushed): ${lost.join('; ')}`);
  return n;
}

// park: false (a replay): a push given up leaves the write under the ref it is replayed from, never a
// second one (cold review: a replay's failed push kept each write twice).
function writeStateNow(root, sb, msg, change, { park = true } = {}) {
  const have = fetchState(root, sb, { fresh: true });
  const start = have ? ref(sb) : git(['commit-tree', git(['hash-object', '-t', 'tree', '/dev/null'], { cwd: root }), '-m', `${sb}: the state branch`], { cwd: root });
  return withTemp('p3-state-', (tmp) => {
    const wt = join(tmp, 's');
    git(['worktree', 'add', '-q', '--detach', wt, start], { cwd: root });
    let out;
    // Waiting bookkeeping rides a batched command's flush only, never this unbatched write: a write
    // kept for replay, or one refused on a moved tip, would carry or drop it (cold reviews of C18).
    const make = () => {
      out = change(wt);
      git(['add', '-A'], { cwd: wt });
      git(['commit', '-q', '--allow-empty', '-m', msg], { cwd: wt });
    };
    make();
    // 2s, 4s, 8s, 16s between tries (coordinator, 6 Nov: copy PR 678's publish lost its starts owed to
    // one "fatal error in commit_refs"). Given up, the commit is kept under refs/p3/unpushed/ and the
    // refusal names the command that replays it.
    let tip;
    // Made again on a tip another writer moved: a change that refuses there is dropped and logged,
    // never kept for a replay that would refuse it too.
    let lost = null;
    const again = () => { lost = null; const r = applyOne(wt, { msg, change }); if (r.o !== undefined) out = r.o; if (r.refused !== undefined) lost = r.refused; };
    try { tip = pushRetry(wt, sb, { redo: again, stamp: true, wait: stateIO.wait ?? 2000, ...(stateIO.push ? { push: () => stateIO.push(wt, sb) } : {}) }); } catch (e) {
      if (!(e instanceof Fail)) throw e;
      if (!park) throw e;
      const name = `refs/p3/unpushed/${Date.now()}-${git(['rev-parse', '--short', 'HEAD'], { cwd: wt })}`;
      git(['update-ref', name, 'HEAD'], { cwd: wt });
      fail(`${e.message}. The write is kept: replay it with \`node .process/tool/p3.mjs state replay ${name}\``);
    }
    try { fetchState(root, sb, { fresh: true }); } catch { fetched.delete(`${root}\0${sb}`); } // pushed: a failed read-back is not a failed write
    // Refused on the tip another writer moved to (a reservation that lost: a lane's seat, an
    // address): nothing written, never kept, said plainly.
    if (lost !== null) throw new NotApplied(`${msg}: refused on ${sb} as it stands now (another writer moved it first): ${lost}; nothing was written`);
    return { ...out, tip };
  }, { root });
}

// State writes held in this clone (refs/p3/unpushed/: a push refused to the end, by the GitHub
// budget among others), each { ref, subject }; status and ROOT's sweep print them as an act so they
// never sit unnoticed (R17c, item F).
export function heldWrites(root) {
  const r = git(['for-each-ref', '--format=%(refname)%09%(subject)', 'refs/p3/unpushed/'], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout.split('\n').filter(Boolean).map((l) => { const [ref, ...s] = l.split('\t'); return { ref, subject: s.join('\t') }; }) : [];
}
export const heldAct = (held) => `\`node .process/tool/p3.mjs state replay\` (${held.length} state write(s) held in this clone since a refused push: ${held.slice(0, 3).map((h) => h.subject).join('; ')}${held.length > 3 ? '; ...' : ''})`;

// For the tests: a stand-in for the state push.
export const stateIO = { push: null, wait: null };

// The kept commit c's change made on the worktree's tip: a file it appended to gets the same lines
// appended (unless the tip holds them already), a file it added is added (the same bytes there
// already: nothing), a file it removed is removed; anything else is picked with git's three-way
// merge (the coordinator, 6 Nov: a kept append to a jsonl another writer had appended to since
// "does not apply" under a plain cherry-pick).
// The state branch's line logs, declared once (the coordinator, 7 Nov: a kept github/use share
// refused at replay, "changed there in a way its change cannot be merged into", where only metrics/
// was re-appended): files of whole rows, each with its time (at, or minute), that no reader counts
// an id from or reserves by; a reader that takes the last row takes the newest, so a kept write's
// rows are merged into whatever another writer appended since in time order (cold review: appended
// at the end, an older deploy or tranche-open row read as the latest). Any other file
// (STATE_ORDERED) goes through git's three-way merge, which refuses when another writer appended too.
export const STATE_LOGS = [
  { match: (f) => /^metrics\/[^/]+\.jsonl$/.test(f), why: 'measurement rows (sweeps, refusals, wakes, restarts, tranche opens), each read as a set or by its newest time' },
  { match: (f) => /^github\/use\/[^/]+\.jsonl$/.test(f), why: "a session's minutes of GitHub use, read as a set by minute; a refused share is marked pending, never sent again, so shares never overlap" },
  { match: (f) => f === 'deploys/dev.jsonl', why: 'development deploy records, the newest by time last' },
];
// The jsonl files the state branch holds that are not line logs, each with why (state-logs.test holds
// every jsonl the tool writes to one list or the other).
export const STATE_ORDERED = {
  'holds/holds.jsonl': "a hold's id (hold-<n>) is counted from the file",
  'messages/': "a message's number (n:k) is counted from the file",
  'lanes/asks.jsonl': "a lane's ask is numbered from the file",
  'lanes/sessions.jsonl': "a lane's seat is reserved by its rows, in order",
  'lanes/artifacts.jsonl': 'a drop after a record: read in order',
  'github/resumed.jsonl': 'its last line is the resume',
  'releases/dev.jsonl': 'a run is recorded once (a reservation)',
  'layers/closed.jsonl': 'a layer is closed once',
  'tranches/closed.jsonl': 'a tranche is closed once',
  'branches/prune.jsonl': 'a prune run is recorded once, read in order',
  'merger/wakes.jsonl': 'read in order',
};
export const stateLog = (f) => STATE_LOGS.some((x) => x.match(f));
// A line log made again on a newer tip: the rows the kept commit added (after less before, counted, so
// a row repeated on purpose is kept) less those the tip added since (counted), merged with the tip's rows by their
// time, stably; when a row has no time, the kept rows after the tip's (as metrics/ was before).
const lines = (t) => t.split('\n').filter(Boolean);
const less = (a, b) => { const n = new Map(); for (const l of b) n.set(l, (n.get(l) || 0) + 1); return a.filter((l) => { const k = n.get(l) || 0; if (k) { n.set(l, k - 1); return false; } return true; }); };
const timeOf = (l) => { try { const r = JSON.parse(l); const t = Date.parse(r?.at ?? r?.minute); return Number.isFinite(t) ? t : null; } catch { return null; } };
export function logUnion(tip, before, after) {
  const have = lines(tip);
  // What the kept commit added, less what the tip added since the same base (a replay already made).
  const add = less(less(lines(after), lines(before)), less(have, lines(before)));
  if (!add.length) return tip;
  const all = [...have.map((l, i) => ({ l, i, t: timeOf(l) })), ...add.map((l, j) => ({ l, i: have.length + j, t: timeOf(l) }))];
  if (all.some((x) => x.t === null)) return `${[...have, ...add].join('\n')}\n`;
  return `${all.sort((a, b) => a.t - b.t || a.i - b.i).map((x) => x.l).join('\n')}\n`;
}
function reapply(root, wt, c, r, sb) {
  const parent = git(['rev-parse', '-q', '--verify', `${c}^`], { cwd: root, allowFail: true }).stdout.trim() || null;
  const raw = (rev, f) => { const x = git(['cat-file', 'blob', `${rev}:${f}`], { cwd: root, allowFail: true }); return x.code === 0 ? x.stdout : null; };
  const files = git(['diff-tree', '--no-commit-id', '--name-status', '-r', '--root', '-z', c], { cwd: root }).split('\0').filter(Boolean);
  const other = [];
  for (let i = 0; i < files.length; i += 2) {
    const [st, f] = [files[i], files[i + 1]];
    const p = join(wt, f);
    const now = existsSync(p) ? readFileSync(p, 'utf8') : null;
    const before = parent ? raw(parent, f) : null;
    const after = raw(c, f);
    if (st === 'D') { if (now === null) continue; if (now === before) rmSync(p, { force: true }); else other.push(f); continue; }
    // A line log (stateLog): each line the kept commit added that the tip lacks, appended; what it
    // took away was its writer's trim (github/use keeps its last 2 h), never replayed.
    if (stateLog(f)) {
      const merged = logUnion(now ?? '', before ?? '', after ?? '');
      if (merged !== (now ?? '')) put(wt, f, merged);
      continue;
    }
    if (before === null) {
      if (now === null) put(wt, f, after);
      else if (now !== after) other.push(f);
      continue;
    }
    if (now === after) continue;
    // Any other change: git's three-way merge of this file (the kept commit's parent as the base).
    const m = withTemp('p3-state-', (tmp) => {
      const [o, b, t] = ['ours', 'base', 'theirs'].map((k) => join(tmp, k));
      writeFileSync(o, now ?? ''); writeFileSync(b, before); writeFileSync(t, after);
      const x = git(['merge-file', '-p', o, b, t], { cwd: root, allowFail: true });
      return x.code === 0 ? x.stdout : null;
    }, { root });
    if (m === null) other.push(f);
    else put(wt, f, m);
  }
  if (other.length) throw new NotApplied(`${r} does not apply to ${sb} as it stands now (${other.join(', ')} changed there in a way its change cannot be merged into); it is kept`);
}

// p3 state replay [<ref>...]: each kept write (refs/p3/unpushed/*, all when none is named) made again
// on the state branch's fresh tip (its own commit picked onto it) and pushed; its ref then dropped.
// fn(subject, root) after each kept write replay pushes (R17e: a usage share it carried is settled).
const replayedFns = [];
// A layer-flow event row: layerflow/<n>/<kind>/<name>.json (layerbase.mjs flowFile).
const EVENT_ROW = /^layerflow\/\d+\/[^/]+\/[^/]+\.json$/;
export function onReplayed(fn) { if (!replayedFns.includes(fn)) replayedFns.push(fn); }
// Each ref on its own, never a queue (the coordinator, 7 Nov: on the copy an old kept pacing write
// that no longer applied stopped the replay, and `layer merge 9`'s two newer kept writes never
// replayed): one that does not apply is said and stays kept, the rest replay, and the command then
// fails naming only the ones kept.
export function stateReplay(root, sb, refs = [], { log = console.log } = {}) {
  const all = refs.length ? refs : git(['for-each-ref', '--format=%(refname)', 'refs/p3/unpushed/'], { cwd: root }).split('\n').filter(Boolean);
  if (!all.length) { log('no kept state writes to replay'); return []; }
  const done = [];
  const kept = [];
  // A command's kept writes share a time prefix (<ms>-<n>), each made on the one before: one that does
  // not apply keeps the later ones of its command with it, never landing them without it (cold review).
  const cmd = (r) => r.split('/').pop().split('-')[0];
  const held = new Set();
  const keptLine = () => (kept.length ? `${kept.length} kept state write(s) did not replay and stay kept: ${kept.map((k) => `${k.r}: ${k.why}`).join('; ')}` : '');
  const summary = () => `${keptLine()}${done.length ? ` (the other ${done.length} replayed)` : ''}`;
  for (const [i, r] of all.entries()) {
    if (held.has(cmd(r))) { const why = `kept with its command's earlier write, which does not apply`; log(`kept ${r}: ${why}`); kept.push({ r, why }); continue; }
    // Any failure but a write that does not apply (a push refused to the end, the pacing stop, a lock,
    // a fetch): the replay stops there, every ref from there on left as it was (cold review: carried on,
    // each later push failed too, and each failed write was kept twice).
    const stop = (e) => fail([`the replay stopped at ${r}, which stays kept: ${e.message}`, all.length - i - 1 ? `${all.length - i - 1} later ref(s) not tried, kept` : '', done.length ? `${done.length} replayed before it` : '', keptLine()].filter(Boolean).join('. '));
    try {
      const c = git(['rev-parse', '-q', '--verify', `${r}^{commit}`], { cwd: root, allowFail: true }).stdout.trim() || fail(`no kept write ${r}`);
      const msg = git(['log', '-1', '--format=%s', c], { cwd: root });
      // A kept write a rerun has since made itself (cold review of R17d: layer sync's rerun records
      // the sync row its refused push held): it only adds files, and each is on the tip already with
      // the same content, or is a layer-flow event row (one file per event: the same path is the same
      // event, recorded again with its own time). It is dropped, said, never picked into a conflict
      // that holds it forever. An append-only file (messages, usage, metrics) another write created
      // since is never this: its content differs, and it is picked as before (cold review).
      const changes = git(['diff-tree', '--no-commit-id', '-r', '--name-status', '--root', c], { cwd: root }).split('\n').filter(Boolean).map((l) => l.split('\t'));
      const have = fetchState(root, sb, { fresh: true });
      const blob = (rev, p) => git(['rev-parse', '-q', '--verify', `${rev}:${p}`], { cwd: root, allowFail: true }).stdout.trim() || null;
      const same = ([st, p]) => { if (st !== 'A') return false; const t = blob(ref(sb), p); return !!t && (t === blob(c, p) || EVENT_ROW.test(p)); };
      if (have && changes.length && changes.every(same)) {
        git(['update-ref', '-d', r], { cwd: root });
        log(`dropped ${r} (${msg}): ${changes.map(([, p]) => p).join(', ')} on ${sb} already, written by a rerun`);
        for (const fn of replayedFns) { try { fn(msg, root); } catch { /* a record only */ } }
        done.push(r);
        continue;
      }
      // The kept commit's own change, as a function of the fresh worktree: picked onto it.
      // Pushed at once, never coalesced: the kept ref goes only once its write is on origin.
      // An idle check's row is a measurement of its window: a kept one is stale once another check
      // has run, so it is dropped, never replayed (the next check measures again).
      if (/^idle check: /.test(msg)) {
        git(['update-ref', '-d', r], { cwd: root });
        log(`dropped ${r} (${msg}): an idle check's row is stale once kept; the next check measures again`);
        done.push(r);
        continue;
      }
      // Batching off for this write only, restored whatever it meets (the idle check above no longer
      // leaves it off).
      const was = batch.on;
      batch.on = false;
      try { writeState(root, sb, msg, (wt) => { reapply(root, wt, c, r, sb); return {}; }, { park: false }); } catch (e) {
        if (!(e instanceof NotApplied)) throw e;
        log(`kept ${r} (${msg}): ${e.message}`);
        kept.push({ r, why: e.message });
        held.add(cmd(r));
        continue;
      } finally { batch.on = was; }
      git(['update-ref', '-d', r], { cwd: root });
      log(`replayed ${r} (${msg})`);
      for (const fn of replayedFns) { try { fn(msg, root); } catch { /* a record only */ } }
      done.push(r);
    } catch (e) { if (e instanceof Fail) stop(e); throw e; }
  }
  if (kept.length) fail(summary());
  return done;
}

const put = (wt, path, text, append = false) => {
  mkdirSync(dirname(join(wt, path)), { recursive: true });
  (append ? appendFileSync : writeFileSync)(join(wt, path), text);
};

// The one-screen handoff: pointers from git and the given status lines, and at most a few prose
// lines. The size test measures the notes: refused, nothing written, only when the header and the
// notes, with one status line, are over one screen. The status lines are capped by the screen
// rule: those that fit, then one line pointing at status --role bob for the rest (a 140-line
// status refused every handoff, at any note length, on the copy, 4 Nov).
export const morePointer = (k) => `(${k} more status line${k === 1 ? '' : 's'}: status --role bob lists them all)`;
export function handoff(root, sb, { role = 'bob', tranche, lines, notes = [], log = console.log }) {
  roleName(role, 'the role');
  const tip = git(['log', '-1', '--format=%H %s', tranche], { cwd: root });
  if (notes.length > HANDOFF_MAX.notes) fail(`at most ${HANDOFF_MAX.notes} notes`);
  const head = [`# Handoff for ${role}, ${now()}`, `tranche ${tip}`, ''];
  const tail = notes.length ? ['', 'notes:', ...notes.map((n) => `- ${String(n).replace(/\s+/g, ' ').trim()}`)] : [];
  const join_ = (body) => [...head, ...body, ...tail].join('\n') + '\n';
  const size = (t) => ({ count: t.split('\n').length - 1, bytes: Buffer.byteLength(t) });
  const fits = (t) => { const z = size(t); return z.count <= HANDOFF_MAX.lines && z.bytes <= HANDOFF_MAX.bytes; };
  if (!fits(join_(lines.length ? [morePointer(lines.length)] : []))) {
    const n = size(tail.join('\n') + (tail.length ? '\n' : ''));
    fail(`the notes are ${n.count} lines, ${n.bytes} bytes; with the handoff's header and one status line they are over one screen (${HANDOFF_MAX.lines} lines and ${HANDOFF_MAX.bytes} bytes): shorten the notes`);
  }
  let k = lines.length;
  const body = (j) => (j < lines.length ? [...lines.slice(0, j), morePointer(lines.length - j)] : lines);
  while (k > 0 && !fits(join_(body(k)))) k--;
  const text = join_(body(k));
  const w = writeState(root, sb, `handoff for ${role}`, (wt) => put(wt, handoffFile(role), text));
  log(text);
  if (k < lines.length) log(`status capped by the screen rule: ${k} of ${lines.length} status lines in the handoff, the rest named by its pointer line`);
  log(`handoff written to ${sb}:${handoffFile(role)} at ${w.tip.slice(0, 10)}`);
  return { text, tip: w.tip, shown: k, of: lines.length };
}

// Messages, per sender: sent rows { n, to, text } and outcome rows { n, outcome }.
export function messages(text) {
  const sent = new Map();
  for (const r of jsonl(text)) {
    if (r.row === 'sent') sent.set(r.n, { ...r, outcome: null });
    else if (r.row === 'outcome' && sent.has(r.n)) sent.get(r.n).outcome = r.outcome;
  }
  return [...sent.values()];
}

// Every sent message not recorded delivered, from every sender, as the fetched branch holds them.
export function undelivered(root, sb) {
  const r = git(['ls-tree', '--name-only', '-z', `${ref(sb)}:messages`], { cwd: root, allowFail: true });
  if (r.code !== 0) return [];
  return r.stdout.split('\0').filter((f) => f.endsWith('.jsonl')).flatMap((f) =>
    messages(readState(root, sb, `messages/${f}`)).filter((m) => m.outcome !== 'delivered').map((m) => ({ from: f.slice(0, -6), ...m })));
}

// Reports to route (P9, PLN-3): messages to bob from a job sender (any sender but root, bob and
// the watcher) until a later message from bob names its id (<from>-<n>) in its text.
export function toRoute(root, sb) {
  const r = git(['ls-tree', '--name-only', '-z', `${ref(sb)}:messages`], { cwd: root, allowFail: true });
  if (r.code !== 0) return [];
  const all = r.stdout.split('\0').filter((f) => f.endsWith('.jsonl')).flatMap((f) => messages(readState(root, sb, `messages/${f}`)).map((m) => ({ from: f.slice(0, -6), ...m })));
  const bob = all.filter((m) => m.from === 'bob');
  // A wake (its text ends ": run status" or, the pin move's, ", then status", as job.mjs's bobWake writes it) asks BOB to run status: nothing to route.
  return all.filter((m) => m.to === 'bob' && !['root', 'bob', 'watcher'].includes(m.from) && !/(: run|, then) status$/.test(String(m.text))).filter((m) => {
    const id = new RegExp(`(^|[^\\w-])${m.from}-${m.n}(?!\\d)`);
    return !bob.some((b) => b.at >= m.at && id.test(b.text));
  });
}

// The config with `coordinator` resolved (Bob, 5 Nov 16:33: ROOT refreshes the coordinator): ROOT's
// addresses/coordinator.json on the state branch as last fetched, else process/config.json's.
// roles.mjs coordinatorOf is the same rule over an address read already.
export const withCoordinator = (root, cfg) => {
  let c = null;
  try { c = address(root, cfg.state_branch, 'coordinator'); } catch { c = null; }
  return c ? { ...cfg, coordinator: c } : cfg;
};

// The address read from git at this moment: the session id, or null.
export function address(root, sb, role) {
  const t = readState(root, sb, addressFile(role));
  if (t === null) return null;
  try { const a = JSON.parse(t); return (typeof a === 'string' ? a : a?.session || a?.id) || null; } catch { return t.trim() || null; }
}

// The record first: no uncommitted change to a tracked file, and no commit the branch's upstream
// (or, without one, origin's branch of the same name) lacks. A detached HEAD has no record of its own.
// .process is left out: after a merge of the tranche that moved the pin it reads as changed until
// the submodule is updated, and a job never commits it (defect sweep 4 Nov, #2; the gate catches
// a committed pin change), so a BLOCKED job can still wake BOB.
function unpushed(root) {
  if (git(['status', '--porcelain', '--untracked-files=no', '--ignore-submodules=all'], { cwd: root })) fail('this checkout has uncommitted changes; commit and push the record first, then send');
  const name = git(['symbolic-ref', '-q', '--short', 'HEAD'], { cwd: root, allowFail: true }).stdout.trim();
  if (!name) return;
  git(['fetch', '-q', 'origin', `+refs/heads/${name}:refs/remotes/origin/${name}`], { cwd: root, allowFail: true });
  let up = git(['rev-list', '--count', '@{upstream}..HEAD'], { cwd: root, allowFail: true });
  if (up.code !== 0) up = git(['rev-list', '--count', `refs/remotes/origin/${name}..HEAD`], { cwd: root, allowFail: true });
  if (up.code !== 0) fail(`${name} is not on origin; push the record first, then send`);
  if (Number(up.stdout) > 0) fail(`${name} has ${Number(up.stdout)} commit(s) not pushed; push the record first, then send`);
}

// send: the record first (the caller's work pushed, then the numbered message pushed), then the
// message and the address, read from git after that push, for the session to deliver.
export function send(root, sb, { from, to, text, log = console.log }) {
  roleName(from, '--from');
  roleName(to, 'the role sent to');
  if (typeof text !== 'string' || !text.trim()) fail('send <to-role> "<text>"');
  unpushed(root);
  const { n } = writeState(root, sb, `message from ${from} to ${to}`, (wt) => {
    const file = join(wt, messagesFile(from));
    const k = messages(existsSync(file) ? readFileSync(file, 'utf8') : '').reduce((m, x) => Math.max(m, x.n), 0) + 1;
    put(wt, messagesFile(from), JSON.stringify({ at: now(), row: 'sent', n: k, to, text: text.trim() }) + '\n', true);
    return { n: k };
  });
  const at = address(root, sb, to);
  const body = `MSG ${from}-${n} to ${to}: ${text.trim()}\n(numbered; a number already seen is a duplicate, ignore it)`;
  log(body);
  log(at ? `address of ${to}: ${at}` : `no address for ${to} on ${sb}`);
  log(`deliver it with send_message, then: send delivered ${n} --from ${from} (or send failed ${n} --from ${from})`);
  return { n, body, address: at };
}

// send delivered <n> | send failed <n>: the outcome, recorded only for a message that was sent.
export function outcome(root, sb, { from, n, result, reason, log = console.log }) {
  roleName(from, '--from');
  if (!Number.isInteger(n) || n < 1) fail(`send ${result} <n>: the message's number`);
  writeState(root, sb, `message ${from}-${n} ${result}`, (wt) => {
    const file = join(wt, messagesFile(from));
    if (!messages(existsSync(file) ? readFileSync(file, 'utf8') : '').some((m) => m.n === n)) fail(`${from} sent no message ${n}`);
    put(wt, messagesFile(from), JSON.stringify({ at: now(), row: 'outcome', n, outcome: result, ...(reason ? { reason } : {}) }) + '\n', true);
  });
  log(`message ${from}-${n} recorded ${result}`);
}

// A pin move's wake, recorded and printed once per merge commit (build train-robust; the
// coordinator's ruling, 5 Nov: the train's row, a later pass's "merged elsewhere" row and the
// waiting caller can each reach the same land). merger/wakes.jsonl holds at most one 'wake' row
// (the record: who saw it first) and one 'printed' row (who printed it) per merge commit.
// print: whether this run would print it. Returns { recorded, print, printed }: recorded and
// print true for the run whose row landed; a record that cannot be written returns both true
// (null on recorded) so the wake is printed rather than lost.
export const WAKES_FILE = 'merger/wakes.jsonl';
export function wakeOnce(root, sb, { pr, sha, what, wake, by, print = false }) {
  const SAME = new Error('nothing new'); // nothing to write: no commit, no push
  let seen = null;
  try {
    return writeState(root, sb, `pin wake for PR ${pr}: ${by}${print ? ', printed' : ''}`, (wt) => {
      const file = join(wt, WAKES_FILE);
      const rows = jsonl(existsSync(file) ? readFileSync(file, 'utf8') : '').filter((r) => r.sha === sha);
      const had = rows.find((r) => r.row === 'wake');
      const printed = rows.find((r) => r.row === 'printed');
      const add = [];
      if (!had) add.push({ at: now(), row: 'wake', pr, sha, what, wake, by });
      if (print && !printed) add.push({ at: now(), row: 'printed', pr, sha, by });
      seen = { recorded: !had, print: print && !printed, printed: printed || null };
      if (!add.length) throw SAME;
      put(wt, WAKES_FILE, add.map((r) => JSON.stringify(r)).join('\n') + '\n', true);
      return seen;
    });
  } catch (e) {
    if (e === SAME) return seen;
    if (!(e instanceof Fail)) throw e;
    return { recorded: null, print, printed: null, error: e.message };
  }
}
