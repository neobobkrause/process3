// The tool's own records never make a push of their own (C18; coordinator, 7 Nov: the account at
// its push ceiling, 10 of BOB's 26 pushes in an hour nothing but idle-check rows, starts owed after a
// merge had pushed, and paid after a job start): a record rides the command's real write; with none
// it waits in the clone and rides the next real write; the clone's reads see it meanwhile.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { OWED_FILE, readOwed } from '../lib/hold.mjs';
import { bookkeep, flushState, readState, readStateWith, stateBatch, stateIO, stateReplay, writeState } from '../lib/state.mjs';
import { git, now } from '../lib/util.mjs';
import { makeRepo } from './helpers.mjs';

const SB = 'process-state';
function product() {
  const root = makeRepo({ 'README.md': 'x\n' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  writeState(root, SB, 'seed', (dir) => { writeFileSync(join(dir, 'seed.txt'), 's\n'); return {}; });
  return { root, bare };
}
const pushes = (bare) => Number(git(['rev-list', '--count', `refs/heads/${SB}`], { cwd: bare }));

test('a command that writes only bookkeeping pushes nothing; its record waits in the clone, read there, and rides the next real write', () => {
  const { root, bare } = product();
  const before = pushes(bare);
  // A read command (status, layer jobs): its only write a starts-owed record.
  stateBatch(true);
  try { bookkeep(root, SB, 'starts owed: merge 7', 'owe', { path: OWED_FILE, act: 'merge 7', at: now() }); flushState(); } finally { stateBatch(false); }
  assert.equal(pushes(bare), before, 'no push of its own');
  assert.equal(readState(root, SB, OWED_FILE), null, 'not on the branch yet');
  assert.deepEqual(readOwed(root, SB).acts.map((a) => a.act), ['merge 7'], 'the clone reads it');
  // Unbatched (job start's paid): waits too.
  bookkeep(root, SB, 'starts owed: merge 8', 'owe', { path: OWED_FILE, act: 'merge 8', at: now() });
  assert.equal(pushes(bare), before);
  assert.deepEqual(readOwed(root, SB).acts.map((a) => a.act), ['merge 7', 'merge 8']);
  // The next real write carries both, in its one push.
  stateBatch(true);
  try { writeState(root, SB, 'layer join: x', (dir) => { writeFileSync(join(dir, 'join.txt'), 'x\n'); return {}; }); flushState(); } finally { stateBatch(false); }
  assert.equal(pushes(bare), before + 3, 'one push: the real write and the two records (three commits)');
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.deepEqual(JSON.parse(readState(root, SB, OWED_FILE)).acts.map((a) => a.act), ['merge 7', 'merge 8']);
  assert.equal(readStateWith(root, SB, OWED_FILE), readState(root, SB, OWED_FILE), 'nothing left waiting');
});

test('an unbatched real write carries the waiting records too', () => {
  const { root, bare } = product();
  bookkeep(root, SB, 'starts owed: merge 9', 'owe', { path: OWED_FILE, act: 'merge 9', at: now() });
  const before = Number(git(['rev-list', '--count', `refs/heads/${SB}`], { cwd: bare }));
  writeState(root, SB, 'a write', (dir) => { writeFileSync(join(dir, 'w.txt'), 'w\n'); return {}; });
  assert.equal(pushes(bare), before + 1, 'one commit, one push');
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.deepEqual(JSON.parse(readState(root, SB, OWED_FILE)).acts.map((a) => a.act), ['merge 9']);
});

test('a usage share rides a real write as bookkeeping; with none, the share-alone rule stands (a clone that only reads still reaches the ledger)', async () => {
  const { shareUsage } = await import('../lib/ghshare.mjs');
  const { realPendingWrites } = await import('../lib/state.mjs');
  const { reserve, sharesOf, PENDING_AT, PACING_DEFAULTS } = await import('../lib/pace.mjs');
  const { root, bare } = product();
  const was = process.env.P3_GITHUB_LOG;
  delete process.env.P3_GITHUB_LOG;
  try {
    const P = { ...PACING_DEFAULTS, gh_interval_ms: 0 };
    reserve({ points: 5, content: 1 }, 'gh pr comment', root, { p: P });
    // A command with a real write: the share rides it, one push.
    let before = pushes(bare);
    stateBatch(true);
    try {
      writeState(root, SB, 'layer join: y', (dir) => { writeFileSync(join(dir, 'y.txt'), 'y\n'); return {}; });
      assert.ok(shareUsage(root, { state_branch: SB }, { pending: realPendingWrites(), atEnd: true }) >= 1);
      assert.ok(sharesOf(root).some((x) => x.at === PENDING_AT), 'pending until its push');
      flushState();
    } finally { stateBatch(false); }
    assert.equal(pushes(bare), before + 2, 'one push: the write and the share');
    assert.ok(sharesOf(root).every((x) => x.at !== PENDING_AT), 'settled by its push');
    // A read command (no real write) with content to report, 16 min on: the share-alone rule pushes it.
    reserve({ points: 5, content: 1 }, 'gh pr comment', root, { p: P });
    before = pushes(bare);
    stateBatch(true);
    try { assert.ok(shareUsage(root, { state_branch: SB }, { pending: realPendingWrites(), atEnd: true, now: () => Date.now() + 16 * 60e3 }) >= 1); flushState(); } finally { stateBatch(false); }
    assert.equal(pushes(bare), before + 1, 'alone, as R17e allows');
    // Within 15 min of it, reads alone: nothing.
    reserve({ points: 1, content: 0 }, 'gh pr view', root, { p: P });
    before = pushes(bare);
    assert.equal(shareUsage(root, { state_branch: SB }, { pending: 0, atEnd: true, now: () => Date.now() + 17 * 60e3 }), 0);
    assert.equal(pushes(bare), before);
  } finally { if (was !== undefined) process.env.P3_GITHUB_LOG = was; }
});

test('a write kept for replay carries the waiting records once: they leave the file, and the replay settles them (cold review of C18)', () => {
  const { root, bare } = product();
  bookkeep(root, SB, 'starts owed: merge 11', 'owe', { path: OWED_FILE, act: 'merge 11', at: now() });
  stateIO.push = () => ({ code: 1, stderr: 'remote: refused for the test' });
  try { assert.throws(() => writeState(root, SB, 'a write', (dir) => { writeFileSync(join(dir, 'k.txt'), 'k\n'); return {}; }), /state replay/); } finally { delete stateIO.push; }
  assert.equal(readStateWith(root, SB, OWED_FILE), readState(root, SB, OWED_FILE), 'no longer waiting in the clone: the kept commit holds it');
  const kept = git(['for-each-ref', '--format=%(refname)', 'refs/p3/unpushed/'], { cwd: root }).split('\n').filter(Boolean);
  assert.equal(kept.length, 1);
  assert.match(git(['log', '-1', '--format=%B', kept[0]], { cwd: root }), /P3-Book: starts owed: merge 11/);
  stateReplay(root, SB, [], { log: () => {} });
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.deepEqual(JSON.parse(readState(root, SB, OWED_FILE)).acts.map((a) => a.act), ['merge 11'], 'once');
  // A later real write carries nothing more.
  writeState(root, SB, 'later', (dir) => { writeFileSync(join(dir, 'l.txt'), 'l\n'); return {}; });
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.deepEqual(JSON.parse(readState(root, SB, OWED_FILE)).acts.map((a) => a.act), ['merge 11'], 'still once');
  assert.ok(bare);
});
