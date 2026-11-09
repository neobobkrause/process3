// C47 (9 Nov): a push made with `p3 github push` reaches the shared ledger before the command
// exits, whatever the 15-minute rule for a share alone. A push to start/coordinator-4nov at 00:53Z
// stayed in its clone's log (the share deferred, and no later p3 command came), and `github audit`
// found it unexplained.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { shareUsage, stateShare, unshared, USE_DIR } from '../lib/ghshare.mjs';
import * as pace from '../lib/pace.mjs';
import { PACING_DEFAULTS, pushTurn, useShared } from '../lib/pace.mjs';
import { shareAtEnd } from '../p3.mjs';
import { git } from '../lib/util.mjs';
import { commit, makeRepo } from './helpers.mjs';

const P3 = join(dirname(fileURLToPath(import.meta.url)), '..', 'p3.mjs');
const P = { ...PACING_DEFAULTS, gh_interval_ms: 0 };
const URL = 'https://github.com/o/p.git';

// A clone with no process/config.json (its own ledger, C40), whose origin is reached by its GitHub
// name (url.insteadOf), so its pushes and the ledger name the same repository.
function clone(t) {
  const root = makeRepo({ 'README.md': 'x\n' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['config', `url.${bare}.insteadOf`, URL], { cwd: root });
  git(['remote', 'add', 'origin', URL], { cwd: root });
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  const was = { log: process.env.P3_GITHUB_LOG, s: process.env.CLAUDE_CODE_SESSION_ID };
  delete process.env.P3_GITHUB_LOG;
  t.after(() => { useShared(null); for (const [k, v] of [['P3_GITHUB_LOG', was.log], ['CLAUDE_CODE_SESSION_ID', was.s]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } });
  return { root, bare };
}
const ledgerRows = (bare, session) => (git(['show', `process-state:${USE_DIR}/${session}.jsonl`], { cwd: bare, allowFail: true }).stdout || '').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const pushesTo = (rows, repo) => rows.reduce((n, r) => n + (r.pushes_by?.[repo] || 0), 0);

test('a second push within 15 minutes of a share is shared at the command\'s end', (t) => {
  const { root, bare } = clone(t);
  process.env.CLAUDE_CODE_SESSION_ID = 'cse_c47';
  const sh = stateShare(root, null);
  assert.equal(sh.ledger, 'own');
  const at = Date.now();
  pushTurn(['push', 'origin', 'HEAD:refs/heads/build/a'], root, { p: P });
  assert.ok(shareUsage(root, null, { now: () => at, atEnd: true, ledgerRepo: 'o/p' }) >= 1, 'the first push, shared');
  // One minute on, a second push: the last share is under 15 minutes old.
  pushTurn(['push', 'origin', 'HEAD:refs/heads/build/b'], root, { p: P });
  assert.ok(shareUsage(root, null, { now: () => at + 60e3, atEnd: true, ledgerRepo: 'o/p' }) >= 1, 'the second push, shared at once');
  assert.equal(pushesTo(ledgerRows(bare, 'cse_c47'), 'o/p'), 2);
  assert.equal(unshared(root, 'o/p').pushes, 0, 'no push left in the clone\'s log');
  // During a command (not at its end) the 15-minute rule stands; reads alone at the end are not shared.
  pushTurn(['push', 'origin', 'HEAD:refs/heads/build/c'], root, { p: P });
  assert.equal(shareUsage(root, null, { now: () => at + 120e3, ledgerRepo: 'o/p' }), 0, 'mid-command: the 15 minutes');
  assert.ok(shareUsage(root, null, { now: () => at + 120e3, atEnd: true, ledgerRepo: 'o/p' }) >= 1);
  // The share's own push is the ledger's state push: the next end shares nothing for it.
  assert.equal(unshared(root, 'o/p').pushes, 0);
  assert.ok(unshared(root, 'o/p').rows >= 1, 'the share\'s own push, logged');
  assert.equal(shareUsage(root, null, { now: () => at + 180e3, atEnd: true, ledgerRepo: 'o/p' }), 0, 'no share for the share\'s own push');
  // A state push of another repository (a product's, its ledger elsewhere) keeps the 15 minutes:
  // a ledger elsewhere is not pushed once more per command (cold review of C47).
  const { logEvent } = pace;
  logEvent('push', 'origin HEAD:process-state', root, { repo: 'o/other', state: true });
  assert.equal(unshared(root, 'o/p').pushes, 0);
  assert.equal(shareUsage(root, null, { now: () => at + 240e3, atEnd: true, ledgerRepo: 'o/p' }), 0, 'a state push waits for the 15 minutes');
  assert.ok(shareUsage(root, null, { now: () => at + 20 * 60e3, atEnd: true, ledgerRepo: 'o/p' }) >= 1, 'and is shared after them');
});

test('a share at the end that fails or leaves a push behind says so on stderr, one line, and never fails the command', (t) => {
  const err = [];
  const was = console.error;
  console.error = (m) => err.push(String(m));
  t.after(() => { console.error = was; });
  shareAtEnd({ shareNow: () => { throw new Error('GitHub budget: paused\nmore'); }, unshared: () => ({ rows: 3, pushes: 1 }) }, 0);
  shareAtEnd({ shareNow: () => 0, unshared: () => ({ rows: 2, pushes: 1 }) }, 0);
  shareAtEnd({ shareNow: () => 0, unshared: () => ({ rows: 1, pushes: 0 }) }, 0);
  shareAtEnd({ shareNow: () => { throw new Error('x'); }, unshared: () => { throw new Error('y'); } }, 0);
  assert.deepEqual(err, [
    'github: 3 row(s) not shared (GitHub budget: paused); the next p3 command in this clone shares them',
    'github: 2 row(s) not shared (1 push(es) not shared at the command\'s end); the next p3 command in this clone shares them',
    'github: this clone\'s use not shared (x); the next p3 command in this clone shares them',
  ]);
});

// PD-17: the path rehearsed end to end, as a session runs it.
test('end to end: two `p3 github push` in a clone with no process/config.json; the ledger holds both', (t) => {
  const { root, bare } = clone(t);
  const env = { ...process.env, CLAUDE_CODE_SESSION_ID: 'cse_c47e2e', HOME: mkdtempSync(join(tmpdir(), 'p3-home-')) };
  // As a session runs it: not under the test runner, nor in a workflow (which shares nothing).
  delete env.NODE_TEST_CONTEXT;
  delete env.GITHUB_ACTIONS;
  delete env.P3_GITHUB_LOG;
  const push = (b) => {
    commit(root, { [`${b}.md`]: `${b}\n` }, b);
    const r = spawnSync(process.execPath, [P3, 'github', 'push', 'origin', `HEAD:refs/heads/${b}`], { cwd: root, env, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stderr, /not shared/, r.stderr);
  };
  push('build/one');
  push('build/two');
  assert.equal(pushesTo(ledgerRows(bare, 'cse_c47e2e'), 'o/p'), 2, JSON.stringify(ledgerRows(bare, 'cse_c47e2e')));
});
