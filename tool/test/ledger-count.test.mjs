// The account-wide count (R17e; coordinator's C9 and C10, 7 Nov): every clone that reads one ledger
// computes the same budget (each cloud container is hostname "vm" with the same paths, so the name
// alone made every session's copy clone one clone, and each dropped the others' rows); the ledger
// branch's own pushes are counted from its history, each push marking its commit (a source no
// share can drift); and a usage share is never a push of its own unless it must be (bookkeeping is
// never the dominant traffic).
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { remoteStore, shareUsage, statePushes, stateShare } from '../lib/ghshare.mjs';
import { cloneId, commonDir, PACING_DEFAULTS, readLog, reserve, usage, useShared } from '../lib/pace.mjs';
import { git, PUSH_TRAILER } from '../lib/util.mjs';
import { makeRepo } from './helpers.mjs';

const P = { ...PACING_DEFAULTS, gh_interval_ms: 0 };
const URL = 'https://github.com/o/ledger.git';
function env(t) {
  const was = { log: process.env.P3_GITHUB_LOG, s: process.env.CLAUDE_CODE_SESSION_ID };
  // Each clone its own log, in its git directory, as in a session.
  delete process.env.P3_GITHUB_LOG;
  t.after(() => { useShared(null); for (const [k, v] of [['P3_GITHUB_LOG', was.log], ['CLAUDE_CODE_SESSION_ID', was.s]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } });
}
// A ledger on a bare repository that the clones reach by its GitHub name (url.insteadOf), so the
// repository each push names is the ledger's.
function ledger() {
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-ledger-')), 'l.git');
  git(['init', '-q', '--bare', bare], { cwd: tmpdir() });
  const clone = () => { const r = makeRepo({ 'README.md': 'x\n' }); git(['config', `url.${bare}.insteadOf`, URL], { cwd: r }); return r; };
  return { bare, clone };
}
const as = (session, fn) => { process.env.CLAUDE_CODE_SESSION_ID = session; return fn(); };
const content = (root, n) => { for (let i = 0; i < n; i++) reserve({ points: 5, content: 1 }, 'gh pr comment', root, { p: P }); };

test('two clones, one ledger: the same budget; each push of the ledger branch counted once, from its history', (t) => {
  env(t);
  const { clone } = ledger();
  const a = clone();
  const b = clone();
  assert.notEqual(cloneId(a), cloneId(b));
  assert.ok(existsSync(join(commonDir(a), 'p3-clone-id')), 'a random id kept in the clone');
  as('cse_a', () => { content(a, 5); shareUsage(a, null, { force: true, store: remoteStore(a, URL) }); });
  as('cse_b', () => { content(b, 3); shareUsage(b, null, { force: true, store: remoteStore(b, URL) }); });
  // Each clone also made a push of its own that no share carried yet.
  as('cse_a', () => reserve({ push: true, points: 0, content: 0 }, 'push job/a', a, { p: P, kind: 'push', extra: { repo: 'o/product' } }));
  const view = (root) => { const sh = stateShare(root, null, { url: URL }); const s = sh.read({ fresh: true }); return { s, u: usage(root, { seconds: 3600, read: s }) }; };
  const A = view(a);
  const B = view(b);
  assert.equal(A.u.content, 8);
  assert.equal(B.u.content, 8, 'the other clone sees the same content count');
  // The ledger's two share pushes, from its history, each stamped by the session that made it.
  assert.deepEqual(A.s.state.pushes.map(([, who]) => who).sort(), ['cse_a', 'cse_b']);
  assert.equal(A.u.pushes_by['o/ledger#state'], 2);
  assert.equal(B.u.pushes_by['o/ledger#state'], 2);
  // a's own unshared push counts in a; b sees it once a shares it.
  assert.equal(A.u.pushes, 3);
  assert.equal(B.u.pushes, 2);
  as('cse_a', () => shareUsage(a, null, { force: true, store: remoteStore(a, URL) }));
  const A2 = view(a);
  const B2 = view(b);
  assert.equal(A2.u.pushes, B2.u.pushes, `the same pushes in both clones: ${A2.u.pushes} vs ${B2.u.pushes}`);
  assert.equal(A2.u.pushes, 4, 'three ledger pushes and job/a, each once');
  assert.equal(A2.u.content, B2.u.content);
});

test('a ledger commit from before the mark counts one push per second of commit time; a stamped one, one push each', () => {
  const r = makeRepo({});
  const at = (s, msg) => { git(['commit', '-q', '--allow-empty', '-m', msg], { cwd: r, env: { GIT_COMMITTER_DATE: `${s} +0000`, GIT_AUTHOR_DATE: `${s} +0000` } }); };
  const t0 = Math.floor(Date.now() / 1000) - 100;
  // One coalesced push from before R17e: three commits in one second.
  at(t0, 'a'); at(t0, 'b'); at(t0, 'c');
  at(t0 + 5, 'legacy share');
  // Two marked pushes; the first carried an unmarked commit made with it (its push marks its last).
  at(t0 + 28, 'carried');
  at(t0 + 30, `x\n\n${PUSH_TRAILER}: cse_1`);
  at(t0 + 30, `y\n\n${PUSH_TRAILER}: cse_2`);
  const st = statePushes(r, 'HEAD', 'o/l', (t0 - 10) * 1000);
  assert.deepEqual(st.pushes.map(([ms, who]) => [ms / 1000 - t0, who]).sort((p, q) => p[0] - q[0] || String(p[1]).localeCompare(String(q[1]))), [[0, null], [5, null], [30, 'cse_1'], [30, 'cse_2']]);
  assert.equal(st.tip_at, (t0 + 30) * 1000);
});

test('a share is no push of its own: it rides the command\'s push; alone, at most every 15 min and only with content or a push to report', (t) => {
  env(t);
  const { clone, bare } = ledger();
  const a = clone();
  const store = remoteStore(a, URL);
  const pushes = () => Number(git(['rev-list', '--count', 'refs/heads/process-state'], { cwd: bare, allowFail: true }).stdout.trim() || 0);
  let off = 0;
  const now = () => Date.now() + off;
  as('cse_a', () => {
    content(a, 1);
    assert.ok(shareUsage(a, null, { force: true, store, now }) >= 1);
    const n0 = pushes();
    // Reads only (no content, no push), 16 min on: not shared alone.
    reserve({ points: 1, content: 0 }, 'gh pr view', a, { p: P });
    off = 16 * 60e3;
    assert.equal(shareUsage(a, null, { store, now }), 0, 'reads alone are no reason to push');
    // Content, 5 min after the last share: not yet.
    content(a, 1);
    off = 0;
    assert.equal(shareUsage(a, null, { store, now: () => Date.now() + 5 * 60e3 }), 0, 'at most every 15 min');
    assert.equal(pushes(), n0);
    // 16 min on, with content: shared, one push.
    off = 16 * 60e3;
    assert.ok(shareUsage(a, null, { store, now }) >= 1);
    assert.equal(pushes(), n0 + 1);
    // Riding the command's push (pending), at its end: shared whatever it holds, at once.
    reserve({ points: 1, content: 0 }, 'gh pr view', a, { p: P });
    assert.ok(shareUsage(a, null, { store, now, pending: 1, atEnd: true }) >= 1);
  });
});

test('the ledger read is cheap (C12): within 30 s nothing is asked of GitHub; past it, ls-remote, and a fetch only when the ledger moved', (t) => {
  env(t);
  const { clone, bare } = ledger();
  const a = clone();
  const b = clone();
  as('cse_b', () => { content(b, 1); shareUsage(b, null, { force: true, store: remoteStore(b, URL) }); });
  let off = 0;
  const sh = stateShare(a, null, { url: URL, now: () => Date.now() + off });
  const seen = () => readLog(a).filter((r) => r.kind === 'fetch').map((r) => r.what.split(' ')[0]);
  sh.read({ fresh: true });
  assert.deepEqual(seen(), ['ls-remote', 'fetch'], 'first read: asked, then fetched');
  for (let i = 0; i < 5; i++) sh.read();
  // A second process of the clone reads the disk cache.
  stateShare(a, null, { url: URL, now: () => Date.now() + off }).read();
  assert.equal(seen().length, 2, 'within READ_S: no network');
  off = 31e3;
  sh.read();
  assert.deepEqual(seen().slice(2), ['ls-remote'], 'past it, unmoved: no fetch');
  as('cse_b', () => { content(b, 1); shareUsage(b, null, { force: true, store: remoteStore(b, URL) }); });
  off = 62e3;
  const s = sh.read();
  assert.deepEqual(seen().slice(3), ['ls-remote', 'fetch'], 'moved: fetched');
  assert.equal(usage(a, { seconds: 3600, read: s }).content, 2);
  assert.ok(bare);
});
