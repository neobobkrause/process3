// The account-wide GitHub ledger (R17, R17b; pace.mjs useShared): one ledger per GitHub account,
// on a state branch, the one place every session of the account already reads and writes, so no
// new service and no new credential. On it:
//   github/pause.json        the pause every session obeys (written at once, never coalesced: the
//                            other sessions must stop calling before their next call);
//   github/resumed.jsonl     the coordinator's resumes;
//   github/use/<session>.jsonl  each session's calls a minute ({ session, minute, calls, points,
//                            content, pushes }), riding the command's own state push, else at
//                            most every 15 min and only when it holds what others must count
//                            (R17e, shareUsage); the ledger branch's own pushes are counted from
//                            its history (statePushes), never from these rows.
// Where (C40, the coordinator's ruling on BD-R2, 8 Nov: a session writes only to its own
// repository): the clone's own state branch (a clone with no product config, as process3's own,
// uses process-state), unless the product's process/config.json names another in pacing.ledger
// ("<owner>/<repo>"), read and written there, fetched into refs/p3/ledger/state. One account-wide
// count (R17b) is read, never written, across every ledger named: pacing.read_ledgers in the
// product's config, and for any clone --ledgers or P3_LEDGERS (comma-separated "<owner>/<repo>"),
// which github budget and github audit read (readLedgers, multiShare). No product is named here.
// Read once per READ_S for every check of the clone, writes included, and past it by the ledger's
// tip asked of GitHub (ls-remote), fetched only when it moved (R17e, C12); another session's use is up to one command or share_s late, which the target's margin
// covers. GitHub's own count stands in for the primary limit (pace.mjs primaryState).
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { bookkeep, fetchState, flushState, onBookkeeping, onFlushed, onReplayed, pendingWrites, readState, realPendingWrites, unbatched, writeState } from './state.mjs';
import { fail, git, PUSH_TRAILER, repoSlug, stateLockHeld, withStateLock, withTemp } from './util.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { commonDir, exempt, lastShared, nextPause, noteShare, pacing, PENDING_AT, settleShare, sharesOf, readLog, sessionId, usageRows, withoutWaiting } from './pace.mjs';

export const PAUSE_FILE = 'github/pause.json';
export const RESUMED_FILE = 'github/resumed.jsonl';
export const USE_DIR = 'github/use';
export const READ_S = 30;
export const LEDGER_REF = 'refs/p3/ledger/state';
export const LEDGER_BRANCH = 'process-state';
export const LEDGER_CACHE = 'p3-gh-ledger.json';
const REFRESHING = 'p3-gh-refreshing';
const safe = (s) => String(s || 'no-session').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);

// The ledger a clone writes: its config's pacing.ledger, else its own state branch (C40: never a
// ledger named by process3 itself, which names no product).
export function ledgerOf(root, cfg) {
  const name = cfg?.pacing?.ledger ?? null;
  if (!name) return { own: true };
  let slug = null;
  try { slug = repoSlug(root); } catch { slug = null; }
  if (slug && slug.toLowerCase() === String(name).toLowerCase()) return { own: true };
  return { own: false, name, url: `https://github.com/${name}.git` };
}

// The ledgers read beside the one written (C40): pacing.read_ledgers, and --ledgers or P3_LEDGERS
// (comma-separated), each "<owner>/<repo>"; the written one and duplicates left out. A malformed
// name is refused, never skipped.
const SLUG = /^[\w.-]+\/[\w.-]+$/;
export function readLedgers(root, cfg, { flag, env = process.env.P3_LEDGERS } = {}) {
  const split = (s, where) => (s === undefined || s === null || s === true ? [] : String(s).split(',').map((x) => x.trim()).filter(Boolean).map((x) => (SLUG.test(x) ? x : fail(`${where}: ${x} is not "<owner>/<repo>"`))));
  const listed = cfg?.pacing?.read_ledgers ?? [];
  if (!Array.isArray(listed)) fail('process/config.json pacing.read_ledgers is a list of "<owner>/<repo>"');
  const named = [...split(listed.join(','), 'pacing.read_ledgers'), ...split(flag, '--ledgers'), ...split(env, 'P3_LEDGERS')];
  const led = ledgerOf(root, cfg);
  let own = null;
  try { own = repoSlug(root).toLowerCase(); } catch { own = null; }
  const written = led.own ? own : String(led.name).toLowerCase();
  const seen = new Set(written ? [written] : []);
  return named.filter((x) => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

// One read across the ledger written and the others read (C40). Each ledger's pause is already its
// own net of its resumes (a resume removes it), so: the use rows of every ledger count; a stop in
// any ledger stands, as that ledger's whole pause record; else the pause that lasts longest. The
// resume time and the state-branch pushes stay the written ledger's own (pauseOf voids this clone's
// local record by the resume of the ledger it writes; a ledger read's state pushes are its own
// repository's, which audit and budget count under that repository, not this one).
export function multiShare(written, others) {
  if (!others.length) return written;
  const until = (p) => Date.parse(p?.until || 0) || 0;
  const binding = (a, b) => (!a ? b : !b ? a : a.stopped !== b.stopped ? (a.stopped ? a : b) : until(a) >= until(b) ? a : b);
  const read = (o) => {
    const w = written.read(o);
    const rs = others.map((s) => s.read(o)).filter(Boolean);
    if (!w) return w;
    return { ...w, pause: rs.reduce((p, r) => binding(p, r.pause || null), w.pause || null), use: [...(w.use || []), ...rs.flatMap((r) => r.use || [])], at: Math.min(w.at ?? Infinity, ...rs.map((r) => r.at ?? Infinity)) };
  };
  return { ...written, ledgers: [written.ledger, ...others.map((o) => o.ledger)], read };
}


// The store: this product's own state branch, or another repository's (url) fetched into LEDGER_REF.
function ownStore(root, sb) {
  return {
    fetch: () => { try { fetchState(root, sb, { fresh: true }); } catch { /* read what the clone has */ } },
    read: (path) => readState(root, sb, path),
    list: (dir) => git(['ls-tree', '--name-only', `refs/remotes/origin/${sb}`, `${dir}/`], { cwd: root, allowFail: true }).stdout.split('\n').filter(Boolean),
    write: (msg, change) => writeState(root, sb, msg, change),
    ref: `refs/remotes/origin/${sb}`,
    tip: () => git(['rev-parse', '-q', '--verify', `refs/remotes/origin/${sb}^{commit}`], { cwd: root, allowFail: true }).stdout.trim() || null,
    remoteTip: () => lsRemote(root, 'origin', sb),
  };
}
// The ledger branch's tip on GitHub, without fetching it (R17d): null when it cannot be read.
function lsRemote(root, where, branch) {
  const r = git(['ls-remote', where, `refs/heads/${branch}`], { cwd: root, allowFail: true, timeout: 30e3 });
  return r.code === 0 ? (r.stdout.split('\t')[0].trim() || 'none') : null;
}
// A ledger read only (C40) is fetched into a ref of its own (LEDGER_READ_REF), never LEDGER_REF,
// which holds the ledger written, and refuses every write.
export const LEDGER_READ_REF = 'refs/p3/ledger/read';
export const readKey = (key) => `${safe(key).slice(0, 40)}-${createHash('sha256').update(String(key)).digest('hex').slice(0, 12)}`;
export function remoteStore(root, url, { readOnly = false } = {}) {
  const REF = readOnly ? `${LEDGER_READ_REF}/${readKey(url)}` : LEDGER_REF;
  const fetch = () => git(['fetch', '-q', url, `+refs/heads/${LEDGER_BRANCH}:${REF}`], { cwd: root, allowFail: true });
  const tip = () => git(['rev-parse', '-q', '--verify', `${REF}^{commit}`], { cwd: root, allowFail: true }).stdout.trim() || null;
  return {
    fetch,
    ref: REF,
    tip,
    remoteTip: () => lsRemote(root, url, LEDGER_BRANCH),
    read: (path) => { const r = git(['show', `${REF}:${path}`], { cwd: root, allowFail: true }); return r.code === 0 ? r.stdout : null; },
    list: (dir) => git(['ls-tree', '--name-only', REF, `${dir}/`], { cwd: root, allowFail: true }).stdout.split('\n').filter(Boolean),
    // A change made on the ledger's tip and pushed, never forced; refused because the tip moved,
    // made again on the new one (each change is a function of the tip), four tries. A ledger read
    // only refuses it.
    write: readOnly ? () => fail(`the ledger ${url} is read only here (C40: a session writes only its own repository's)`) : (msg, change) => withStateLock(root, () => withTemp('p3-state-', (tmp) => {
      const wt = join(tmp, 'l');
      fetch();
      const start = tip() || git(['commit-tree', git(['hash-object', '-t', 'tree', '/dev/null'], { cwd: root }), '-m', `${LEDGER_BRANCH}: the state branch`], { cwd: root });
      git(['worktree', 'add', '-q', '--detach', wt, start], { cwd: root });
      let out;
      for (let k = 1; ; k++) {
        out = change(wt);
        git(['add', '-A'], { cwd: wt });
        git(['commit', '-q', '--allow-empty', '-m', msg, '-m', `${PUSH_TRAILER}: ${sessionId() || 'no-session'}`], { cwd: wt });
        const p = git(['push', '-q', url, `HEAD:refs/heads/${LEDGER_BRANCH}`], { cwd: wt, allowFail: true });
        if (p.code === 0) { fetch(); return out; }
        // Only a moved tip is tried again, after 2, 4, 8 s; any other refusal (auth, network) at once.
        if (!/non-fast-forward|fetch first|rejected|cannot lock ref/i.test(p.stderr) || k >= 4) fail(`the GitHub ledger at ${url} refused the write${k > 1 ? ` ${k} times` : ''}: ${p.stderr.trim().split('\n').pop()}`);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, (process.env.NODE_TEST_CONTEXT ? 10 : 1000) * 2 ** k);
        fetch();
        git(['reset', '-q', '--hard', tip() || start], { cwd: wt });
        git(['clean', '-q', '-fdx'], { cwd: wt });
      }
    }, { root })),
  };
}

// The ledger branch's own pushes since `since` (R17e, coordinator's C9/C10): each push marks the
// commit it pushes (util.mjs stampPush; the ledger's own writes here), so the branch's history is
// the count, the same for every clone that reads it. An unmarked commit not part of a marked push
// (one from before the mark, or a pin without it) counts one push per second of commit time (a
// coalesced push's commits are made together). Returns
// { repo, pushes: [[ms, session]], tip_at }, or null when unread.
const PUSH_SPAN_S = 10;
export function statePushes(root, ref, repo, since) {
  if (!repo) return null;
  const r = git(['log', `--since=${new Date(since).toISOString()}`, `--format=%ct%x1f%(trailers:key=${PUSH_TRAILER},valueonly,separator=%x2c)%x1e`, ref], { cwd: root, allowFail: true });
  if (r.code !== 0) return null;
  const pushes = [];
  const seconds = new Set();
  // Newest first. A push stamps only its last commit: an unmarked commit made within PUSH_SPAN_S
  // before the marked one above it, with nothing unmarked between, is that push's own.
  let anchor = null;
  for (const rec of r.stdout.split('\x1e')) {
    const [ct, who] = rec.trim().split('\x1f');
    if (!ct) continue;
    const at = Number(ct) * 1000;
    if (who && who.trim()) { pushes.push([at, who.trim().split(',')[0]]); anchor = at; continue; }
    if (anchor !== null && anchor - at <= PUSH_SPAN_S * 1000) continue;
    anchor = null;
    if (!seconds.has(at)) { seconds.add(at); pushes.push([at, null]); }
  }
  const tip = git(['log', '-1', '--format=%ct', ref], { cwd: root, allowFail: true });
  return { repo, pushes, tip_at: tip.code === 0 && tip.stdout.trim() ? Number(tip.stdout.trim()) * 1000 : 0 };
}

export function stateShare(root, cfg, { now = Date.now, url, readOnly = false } = {}) {
  const led = url ? { own: false, url } : ledgerOf(root, cfg);
  if (!led) return null;
  if (readOnly && led.own) fail('stateShare: a ledger read only is another repository\'s (url)');
  const store = led.own ? ownStore(root, cfg?.state_branch || LEDGER_BRANCH) : remoteStore(root, led.url, { readOnly });
  const key = led.own ? 'own' : led.url;
  let ledgerRepo = null;
  try { ledgerRepo = (led.own ? repoSlug(root) : led.name || String(led.url).replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '')).toLowerCase(); } catch { ledgerRepo = null; }
  let cache = null;
  const load = () => {
    // The read's time is taken before its fetch: what lands meanwhile is after it (cold review of R17e).
    const t0 = now();
    store.fetch();
    // The tip the reads are of: one moved under them (another p3 process of the clone fetched)
    // is not recorded, so the next refresh fetches again (cold review of R17d: else old contents
    // under the new tip would be renewed as current, a stop hidden).
    const tip0 = store.tip();
    let pause = null;
    try { pause = JSON.parse(store.read(PAUSE_FILE) || 'null'); } catch { pause = null; }
    const since = now() - 2 * 3600e3;
    const use = store.list(USE_DIR).flatMap((f) => (store.read(f) || '').split('\n').filter(Boolean).flatMap((l) => { try { const r = JSON.parse(l); return Date.parse(r.minute) > since ? [r] : []; } catch { return []; } }));
    const resumed = (store.read(RESUMED_FILE) || '').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l).at; } catch { return null; } }).filter(Boolean).pop() || null;
    cache = { at: t0, pause, use, resumed, state: statePushes(root, store.ref, ledgerRepo, since), ledger: key, tip: store.tip() === tip0 ? tip0 : null };
    try { writeFileSync(diskCache, JSON.stringify(cache)); } catch { /* best effort */ }
    return cache;
  };
  // Shared with this clone's other p3 processes (each hook call is one): a read within READ_S
  // fetches nothing (R17c, the hook's fast path). A fresh read (before a write) always fetches.
  // A ledger read only (C40: another repository's, for the account-wide count) caches apart, so the
  // hook's read of the written ledger never meets it.
  const diskCache = join(commonDir(root), readOnly ? `${LEDGER_CACHE}.${readKey(key)}` : LEDGER_CACHE);
  // Never a stop from disk (a resume elsewhere must show at once), nor another ledger's read.
  const fromDisk = () => { try { const c = JSON.parse(readFileSync(diskCache, 'utf8')); return c && now() - c.at < READ_S * 1000 && !c.pause?.stopped && c.ledger === key ? c : null; } catch { return null; } };
  // The ledger's tip asked of GitHub (ls-remote, no fetch); unmoved, the cache it was read into is
  // current again as it stands, a stop included; moved (or unknown), fetched and read again.
  const recheck = () => {
    const t = store.remoteTip();
    let c = cache && cache.tip ? cache : null;
    if (!c) { try { c = JSON.parse(readFileSync(diskCache, 'utf8')); } catch { c = null; } }
    if (t && c && c.tip && c.tip === t && c.ledger === key) {
      cache = { ...c, at: now() };
      try { writeFileSync(diskCache, JSON.stringify(cache)); } catch { /* best effort */ }
      return { c: cache, how: 'unmoved' };
    }
    return { c: load(), how: 'fetched' };
  };
  // The ledger's own writes go through whatever the account's state (exempt): a pause must be
  // written while paused, and a resume while stopped. Pushed at once, never coalesced.
  const now1 = (msg, change) => exempt(() => unbatched(() => store.write(msg, change)));
  return {
    ledger: led.own ? 'own' : led.url,
    // R17e (coordinator's C12: 266 fetches an hour, most of them this read): one read serves every
    // check of the clone's p3 processes within READ_S, writes included; past it, or fresh (after a
    // wait), the ledger's tip is asked of GitHub (ls-remote) and fetched only when it moved.
    read: ({ fresh = false } = {}) => {
      if (!fresh) { if (cache && now() - cache.at < READ_S * 1000) return cache; const d = fromDisk(); if (d) return (cache = d); }
      return recheck().c;
    },
    // The account's pause, decided against the record as it stands on the tip written to (a burst
    // of refusals across sessions lengthens one pause; a refusal after it ended stops the tool:
    // pace.mjs nextPause). Returns the pause written.
    pause: (rec, t = now()) => {
      let out = null;
      now1(`github: refused (${rec.why})`, (wt) => {
        mkdirSync(join(wt, 'github'), { recursive: true });
        let was = null;
        try { was = JSON.parse(readFileSync(join(wt, PAUSE_FILE), 'utf8')); } catch { was = null; }
        out = nextPause(was, rec, t);
        writeFileSync(join(wt, PAUSE_FILE), JSON.stringify(out, null, 2) + '\n');
        return {};
      });
      cache = null;
      try { writeFileSync(diskCache, 'null'); } catch { /* none */ }
      return out;
    },
    resume: (by) => {
      now1(`github: resumed by ${by}`, (wt) => {
        if (existsSync(join(wt, PAUSE_FILE))) rmSync(join(wt, PAUSE_FILE));
        mkdirSync(join(wt, 'github'), { recursive: true });
        appendFileSync(join(wt, RESUMED_FILE), JSON.stringify({ at: new Date(now()).toISOString(), by }) + '\n');
        return {};
      });
      cache = null;
      try { writeFileSync(diskCache, 'null'); } catch { /* none */ }
    },
    // The hook's background refresh (R17d): the ledger's tip asked of GitHub (ls-remote, no fetch);
    // unmoved, the disk cache is current again as it stands, a stop included; moved, fetched and
    // read again. Returns what it did.
    refresh: () => recheck().how,
    // The command's own state writes pushed before it waits on GitHub (others read them meanwhile).
    beforeWait: () => { if (pendingWrites()) flushState(); },
    // While a command runs (each reserve): riding its pending writes, else by shareUsage's rule; never inside a state write.
    share: () => (stateLockHeld(root) ? 0 : shareUsage(root, cfg, { now, store, pending: led.own ? realPendingWrites() : 0, ledgerRepo })),
    // At a command's end: with its own state push when it has one (pending), else by shareUsage's rule.
    shareNow: ({ pending = 0 } = {}) => (stateLockHeld(root) ? 0 : shareUsage(root, cfg, { now, store, pending: led.own ? pending : 0, atEnd: true, ledgerRepo })),
    // What this clone holds that no share carried (C47): said when a share at the end leaves a push behind.
    unshared: () => unshared(root, ledgerRepo),
  };
}

// This clone's usage since it last shared, appended to its session's file in the ledger (R17e,
// coordinator's C9: bookkeeping is never the dominant traffic, so a share is never a push of its own
// but rides one):
// - with the command's own state push on the product's own state branch (pending writes: writeState
//   coalesces it), whenever there is new use;
// - else at most every SHARE_ALONE_S (or share_s if longer), and only when others must count what
//   it carries: a content-creating call, or a push other than a state branch's (the ledger branch's
//   own pushes are counted from its history, statePushes).
// Rows older than two hours are dropped from the file.
onBookkeeping('share', (dir, { path, rows, since }) => {
  mkdirSync(join(dir, USE_DIR), { recursive: true });
  let kept = [];
  try { kept = readFileSync(join(dir, path), 'utf8').split('\n').filter(Boolean).filter((l) => { try { return Date.parse(JSON.parse(l).minute) > since; } catch { return false; } }); } catch { kept = []; }
  writeFileSync(join(dir, path), [...kept, ...rows.map((r) => JSON.stringify(r))].join('\n') + '\n');
});
export const SHARE_ALONE_S = 900;
// A push the ledger's history does not count: any push but a state push of the ledger's own repository.
export const owedPush = (r, ledgerRepo) => r.kind === 'push' && !(r.state && (r.repo || null) === (ledgerRepo || null));
// This clone's logged rows no share has carried yet: { rows, pushes } (pushes: those owed, owedPush).
export function unshared(root, ledgerRepo = null) {
  const after = lastShared(root);
  const log = readLog(root).filter((r) => Date.parse(r.at) > after && ['gh', 'push', 'fetch'].includes(r.kind));
  return { rows: log.length, pushes: log.filter((r) => owedPush(r, ledgerRepo)).length };
}
// A share kept by a refused flush and pushed later by `state replay` is settled then (cold review
// of R17e: left pending, its rows counted from this clone's log and again from the ledger).
export const SHARE_SUBJECT = /^github: \d+ minute\(s\) of use \(rows to (\d+)\)/;
onReplayed((subject, root) => { const m = String(subject).match(SHARE_SUBJECT); if (m) settleShare(root, Number(m[1]), Date.now()); });
export function shareUsage(root, cfg, { force = false, now = Date.now, pending = 0, store, atEnd = false, ledgerRepo = null } = {}) {
  const shares = sharesOf(root);
  const after = lastShared(root);
  // The rows shared are those after the last share's last row, taken before the write: the
  // share's own push, logged during it, is shared next time (cold review of R17b).
  const log = readLog(root).filter((r) => Date.parse(r.at) > after && ['gh', 'push', 'fetch'].includes(r.kind));
  const rows = usageRows(root, { after, rows: log });
  if (!rows.length) return 0;
  if (!force) {
    // Riding the command's push: at its end, and at most once a minute while it runs (each share
    // during a command is a commit, though no push).
    // When the last share was made (a riding one's push may not be made yet: cold review of R17e).
    const lastAt = Math.max(0, ...shares.map((x) => x.made ?? (x.at === PENDING_AT ? 0 : x.at || 0)));
    // A push others must count is shared at the end of the command that made it, whatever the
    // 15 minutes (C47: a push left in a notes clone's log waited for a p3 command that never came,
    // and the audit found it unexplained). The share's own push is a state push of the ledger, so
    // this never shares again for its own sake.
    const pushAtEnd = atEnd && log.some((r) => owedPush(r, ledgerRepo));
    if (!pushAtEnd && now() - lastAt < (pending ? (atEnd ? 0 : 60) : Math.max(SHARE_ALONE_S, pacing().share_s)) * 1000) return 0;
    if (!pending && !log.some((r) => (r.kind === 'gh' && Number(r.content === true ? 1 : r.content) > 0) || owedPush(r, ledgerRepo))) return 0;
  }
  const last = Math.max(...log.map((r) => Date.parse(r.at)));
  const st = store || ownStore(root, cfg?.state_branch || LEDGER_BRANCH);
  const file = `${USE_DIR}/${safe(sessionId())}.jsonl`;
  // The share's push is gated like any push but never waits (coordinator's ruling on PR 206): where
  // the account is paused or stopped (GitHub's refusals) it is refused, nothing is recorded, and it is shared later.
  // A share whose own push is refused and kept for replay is recorded pending (cold review): not
  // sent again by the next share, and settled when state replay pushes it.
  // On the product's own state branch, with a real write pending, a share is bookkeeping (C18): it
  // rides that write. With none, the share-alone rule above stands (at most every SHARE_ALONE_S, only
  // for what others must count), a push of its own, so a clone that mostly reads still reaches the
  // ledger (cold review of C18: deferred, its use never reached the other clones).
  const msg = `github: ${rows.length} minute(s) of use (rows to ${last})`;
  if (st.ref !== LEDGER_REF && pending > 0) {
    bookkeep(root, cfg?.state_branch || LEDGER_BRANCH, msg, 'share', { path: file, rows, since: now() - 2 * 3600e3 });
    noteShare(root, last, PENDING_AT, now());
    if (pendingWrites()) onFlushed(root, cfg?.state_branch || LEDGER_BRANCH, () => settleShare(root, last, Date.now()));
    return rows.length;
  }
  try { withoutWaiting(() => st.write(msg, (wt) => {
    mkdirSync(join(wt, USE_DIR), { recursive: true });
    const since = now() - 2 * 3600e3;
    let kept = [];
    try { kept = readFileSync(join(wt, file), 'utf8').split('\n').filter(Boolean).filter((l) => { try { return Date.parse(JSON.parse(l).minute) > since; } catch { return false; } }); } catch { kept = []; }
    writeFileSync(join(wt, file), [...kept, ...rows.map((r) => JSON.stringify(r))].join('\n') + '\n');
    return {};
  })); } catch (e) { if (/state replay/.test(String(e?.message))) noteShare(root, last, PENDING_AT, now()); throw e; }
  // Pushed now (another repository's ledger, or unbatched), or with the command's push: until that
  // push is made the share is not in any read, and its rows count from this clone's log (usage).
  if (st.ref !== LEDGER_REF && pendingWrites()) { noteShare(root, last, PENDING_AT, now()); onFlushed(root, cfg?.state_branch || LEDGER_BRANCH, () => settleShare(root, last, Date.now())); } else noteShare(root, last, now());
  return rows.length;
}

// The hook's read path (R17d; coordinator, 7 Nov: under 300 ms p95, never a ledger fetch on a
// read): the account's pause, stop and use as the clone's disk cache holds them, at any age, a stop
// included; when the cache is READ_S old or missing, a background refresh is started (one at a
// time per clone) and the read goes on at once. A read can so pass a pause or stop written in the
// last READ_S plus the refresh's few seconds; a write reads it through stateShare (a cache within READ_S, else ls-remote).
// key: the ledger this clone reads now ('own', its URL, or null for none): a cache of another
// (the config changed) is no cache (cold review of R17d).
export function peekShare(cwd, { now = Date.now, kick = kickRefresh, key } = {}) {
  let c = null;
  try { c = JSON.parse(readFileSync(join(commonDir(cwd), LEDGER_CACHE), 'utf8')); } catch { c = null; }
  if (c && key !== undefined && (c.ledger ?? null) !== key) c = null;
  if (!c || !(now() - c.at < READ_S * 1000)) { try { kick(cwd, { now }); } catch { /* the next read tries again */ } }
  const s = c ? { pause: c.pause || null, use: c.use || [], resumed: c.resumed || null, at: c.at, state: c.state || null } : { pause: null, use: [] };
  return { read: () => s };
}
const HOOK_ENTRY = join(fileURLToPath(new URL('..', import.meta.url)), 'hook.mjs');
// One refresh at a time per clone: a marker file, taken by its creation; one older than a minute
// (a refresh killed) is taken over.
export function kickRefresh(cwd, { now = Date.now, entry = HOOK_ENTRY } = {}) {
  const f = join(commonDir(cwd), REFRESHING);
  try { writeFileSync(f, String(now()), { flag: 'wx' }); } catch {
    let at = 0;
    try { at = Number(readFileSync(f, 'utf8')) || 0; } catch { at = 0; }
    if (now() - at < 60e3) return false;
    writeFileSync(f, String(now()));
  }
  // Its marker named, so a refresh taken over does not clear its successor's (cold review of R17d).
  const child = spawn(process.execPath, [entry, '--refresh'], { cwd, detached: true, stdio: 'ignore', env: { ...process.env, P3_REFRESH_MARK: readFileSync(f, 'utf8') } });
  child.on('error', () => { /* not started: the next read tries again */ });
  child.unref();
  return true;
}
export function refreshDone(cwd, mark = process.env.P3_REFRESH_MARK) {
  const f = join(commonDir(cwd), REFRESHING);
  try { if (mark === undefined || readFileSync(f, 'utf8') === mark) rmSync(f, { force: true }); } catch { /* none */ }
}
