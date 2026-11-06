// The account-wide GitHub ledger (R17, R17b; pace.mjs useShared): one ledger per GitHub account,
// on a state branch, the one place every session of the account already reads and writes, so no
// new service and no new credential. On it:
//   github/pause.json        the pause every session obeys (written at once, never coalesced: the
//                            other sessions must stop calling before their next call);
//   github/resumed.jsonl     the coordinator's resumes;
//   github/use/<session>.jsonl  each session's calls a minute ({ session, minute, calls, points,
//                            content, pushes }), appended with the command's one state push, and
//                            at least every pacing.share_s (300 s) while it acts on GitHub.
// Where (coordinator's ruling, 6 Nov): the product's state branch (neobobkrause/civicsmith-copy
// process-state). A product's clone uses its own; a clone with no state branch of its own (process3,
// process3-probes) names the ledger in pacing.ledger ("<owner>/<repo>"; process3's own in its root
// pacing.json) and reads and writes it there, fetched into refs/p3/ledger/state.
// Read fresh before every write to GitHub (a content-creating call, a push), and within READ_S
// otherwise; another session's use is up to one command or share_s late, which the target's margin
// covers. GitHub's own count stands in for the primary limit (pace.mjs primaryState).
import { join } from 'node:path';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { fetchState, flushState, pendingWrites, readState, unbatched, writeState } from './state.mjs';
import { fail, git, repoSlug, stateLockHeld, withStateLock, withTemp } from './util.mjs';
import { exempt, nextPause, pacing, readLog, sessionId, usageRows, withoutWaiting } from './pace.mjs';
import { PROCESS_ROOT } from './register.mjs';

export const PAUSE_FILE = 'github/pause.json';
export const RESUMED_FILE = 'github/resumed.jsonl';
export const USE_DIR = 'github/use';
export const READ_S = 30;
export const LEDGER_REF = 'refs/p3/ledger/state';
export const LEDGER_BRANCH = 'process-state';
const MARK = 'p3-gh-shared-to';
const safe = (s) => String(s || 'no-session').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);

// The ledger for a clone: its config's pacing.ledger, else the pinned process3's pacing.json (so
// every product and process3's own clones share one ledger without each naming it: cold review
// of R17b), else the clone's own pacing.json; null when none names one. A ledger that is this
// clone's own repository is its own state branch. The tests read process3's own only when given.
const ledgerIn = (dir) => { try { return JSON.parse(readFileSync(join(dir, 'pacing.json'), 'utf8')).ledger || null; } catch { return null; } };
export function ledgerOf(root, cfg, { processRoot = process.env.NODE_TEST_CONTEXT ? null : PROCESS_ROOT } = {}) {
  const name = cfg?.pacing?.ledger ?? (processRoot ? ledgerIn(processRoot) : null) ?? ledgerIn(root);
  if (!name) return cfg ? { own: true } : null;
  let slug = null;
  try { slug = repoSlug(root); } catch { slug = null; }
  if (slug && slug.toLowerCase() === String(name).toLowerCase()) return { own: true };
  return { own: false, name, url: `https://github.com/${name}.git` };
}

// The store: this product's own state branch, or another repository's (url) fetched into LEDGER_REF.
function ownStore(root, sb) {
  return {
    fetch: () => { try { fetchState(root, sb, { fresh: true }); } catch { /* read what the clone has */ } },
    read: (path) => readState(root, sb, path),
    list: (dir) => git(['ls-tree', '--name-only', `refs/remotes/origin/${sb}`, `${dir}/`], { cwd: root, allowFail: true }).stdout.split('\n').filter(Boolean),
    write: (msg, change) => writeState(root, sb, msg, change),
  };
}
export function remoteStore(root, url) {
  const fetch = () => git(['fetch', '-q', url, `+refs/heads/${LEDGER_BRANCH}:${LEDGER_REF}`], { cwd: root, allowFail: true });
  const tip = () => git(['rev-parse', '-q', '--verify', `${LEDGER_REF}^{commit}`], { cwd: root, allowFail: true }).stdout.trim() || null;
  return {
    fetch,
    read: (path) => { const r = git(['show', `${LEDGER_REF}:${path}`], { cwd: root, allowFail: true }); return r.code === 0 ? r.stdout : null; },
    list: (dir) => git(['ls-tree', '--name-only', LEDGER_REF, `${dir}/`], { cwd: root, allowFail: true }).stdout.split('\n').filter(Boolean),
    // A change made on the ledger's tip and pushed, never forced; refused because the tip moved,
    // made again on the new one (each change is a function of the tip), four tries.
    write: (msg, change) => withStateLock(root, () => withTemp('p3-state-', (tmp) => {
      const wt = join(tmp, 'l');
      fetch();
      const start = tip() || git(['commit-tree', git(['hash-object', '-t', 'tree', '/dev/null'], { cwd: root }), '-m', `${LEDGER_BRANCH}: the state branch`], { cwd: root });
      git(['worktree', 'add', '-q', '--detach', wt, start], { cwd: root });
      let out;
      for (let k = 1; ; k++) {
        out = change(wt);
        git(['add', '-A'], { cwd: wt });
        git(['commit', '-q', '--allow-empty', '-m', msg], { cwd: wt });
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

export function stateShare(root, cfg, { now = Date.now, url } = {}) {
  const led = url ? { own: false, url } : ledgerOf(root, cfg);
  if (!led) return null;
  const store = led.own ? ownStore(root, cfg.state_branch) : remoteStore(root, led.url);
  let cache = null;
  const load = () => {
    store.fetch();
    let pause = null;
    try { pause = JSON.parse(store.read(PAUSE_FILE) || 'null'); } catch { pause = null; }
    const since = now() - 2 * 3600e3;
    const use = store.list(USE_DIR).flatMap((f) => (store.read(f) || '').split('\n').filter(Boolean).flatMap((l) => { try { const r = JSON.parse(l); return Date.parse(r.minute) > since ? [r] : []; } catch { return []; } }));
    const resumed = (store.read(RESUMED_FILE) || '').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l).at; } catch { return null; } }).filter(Boolean).pop() || null;
    cache = { at: now(), pause, use, resumed };
    try { writeFileSync(diskCache, JSON.stringify(cache)); } catch { /* best effort */ }
    return cache;
  };
  // Shared with this clone's other p3 processes (each hook call is one): a read within READ_S
  // fetches nothing (R17c, the hook's fast path). A fresh read (before a write) always fetches.
  const diskCache = join(git(['rev-parse', '--git-common-dir'], { cwd: root, allowFail: true }).stdout.trim().replace(/^(?!\/)/, `${root}/`), 'p3-gh-ledger.json');
  const fromDisk = () => { try { const c = JSON.parse(readFileSync(diskCache, 'utf8')); return c && now() - c.at < READ_S * 1000 ? c : null; } catch { return null; } };
  // The ledger's own writes go through whatever the account's state (exempt): a pause must be
  // written while paused, and a resume while stopped. Pushed at once, never coalesced.
  const now1 = (msg, change) => exempt(() => unbatched(() => store.write(msg, change)));
  return {
    ledger: led.own ? 'own' : led.url,
    read: ({ fresh = false } = {}) => (!fresh && cache && now() - cache.at < READ_S * 1000 ? cache : (!fresh && (cache = fromDisk())) || load()),
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
    // The command's own state writes pushed before it waits on GitHub (others read them meanwhile).
    beforeWait: () => { if (pendingWrites()) flushState(); },
    // This clone's use shared at most every pacing.share_s; never inside a state write.
    share: () => (stateLockHeld(root) ? 0 : shareUsage(root, cfg, { now, store })),
    // At a command's end: with its own state push when it has one (pending), else by share_s.
    shareNow: ({ pending = 0 } = {}) => (stateLockHeld(root) ? 0 : shareUsage(root, cfg, { now, store, pending: led.own ? pending : 0 })),
  };
}

// This clone's usage since it last shared, appended to its session's file in the ledger: with the
// command's own push on the product's own state branch (writeState coalesces it), at once on another
// repository's; when the command writes state anyway, or the last share is pacing.share_s old. Rows
// older than two hours are dropped from the file.
export function shareUsage(root, cfg, { force = false, now = Date.now, pending = 0, store } = {}) {
  const dir = git(['rev-parse', '--git-common-dir'], { cwd: root, allowFail: true }).stdout.trim();
  const mark = dir ? join(dir.startsWith('/') ? dir : join(root, dir), MARK) : null;
  let after = 0;
  try { after = Number(readFileSync(mark, 'utf8')) || 0; } catch { after = 0; }
  if (!force && !pending && now() - after < pacing().share_s * 1000) return 0;
  // The mark is the last row shared, taken before the write: the share's own push, logged during
  // it, is shared next time (cold review of R17b).
  const log = readLog(root).filter((r) => Date.parse(r.at) > after && ['gh', 'push', 'fetch'].includes(r.kind));
  const rows = usageRows(root, { after, rows: log });
  if (!rows.length) return 0;
  const last = Math.max(...log.map((r) => Date.parse(r.at)));
  const st = store || ownStore(root, cfg.state_branch);
  const file = `${USE_DIR}/${safe(sessionId())}.jsonl`;
  // The share's push is gated like any push but never waits (coordinator's ruling on PR 206): where
  // the account is paused or at the ceiling it is refused, the mark stays, and it is shared later.
  withoutWaiting(() => st.write(`github: ${rows.length} minute(s) of use`, (wt) => {
    mkdirSync(join(wt, USE_DIR), { recursive: true });
    const since = now() - 2 * 3600e3;
    let kept = [];
    try { kept = readFileSync(join(wt, file), 'utf8').split('\n').filter(Boolean).filter((l) => { try { return Date.parse(JSON.parse(l).minute) > since; } catch { return false; } }); } catch { kept = []; }
    writeFileSync(join(wt, file), [...kept, ...rows.map((r) => JSON.stringify(r))].join('\n') + '\n');
    return {};
  }));
  try { writeFileSync(mark, String(last)); } catch { /* best effort */ }
  return rows.length;
}
