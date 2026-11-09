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
  git(['config', 'core.logAllRefUpdates', 'always'], { cwd: bare });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  writeState(root, SB, 'seed', (dir) => { writeFileSync(join(dir, 'seed.txt'), 's\n'); return {}; });
  return { root, bare };
}
// Pushes, not commits: each push moves the state branch once in origin's reflog; the seed's first
// write counts as one too.
const pushes = (bare) => git(['reflog', 'show', '--format=%H', `refs/heads/${SB}`], { cwd: bare, allowFail: true }).stdout.split('\n').filter((l) => l.trim()).length;

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
  assert.equal(pushes(bare), before + 1, 'one push: the real write and the two records');
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.deepEqual(JSON.parse(readState(root, SB, OWED_FILE)).acts.map((a) => a.act), ['merge 7', 'merge 8']);
  assert.equal(readStateWith(root, SB, OWED_FILE), readState(root, SB, OWED_FILE), 'nothing left waiting');
});

test('an unbatched write (job start, replay) leaves the waiting records waiting; the next batched write carries them, once', () => {
  const { root, bare } = product();
  bookkeep(root, SB, 'starts owed: merge 9', 'owe', { path: OWED_FILE, act: 'merge 9', at: now() });
  const before = pushes(bare);
  writeState(root, SB, 'a write', (dir) => { writeFileSync(join(dir, 'w.txt'), 'w\n'); return {}; });
  assert.equal(pushes(bare), before + 1);
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.equal(readState(root, SB, OWED_FILE), null, 'not carried by an unbatched write');
  assert.deepEqual(readOwed(root, SB).acts.map((a) => a.act), ['merge 9'], 'still waiting, read in the clone');
  stateBatch(true);
  try { writeState(root, SB, 'b write', (dir) => { writeFileSync(join(dir, 'b.txt'), 'b\n'); return {}; }); flushState(); } finally { stateBatch(false); }
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.deepEqual(JSON.parse(readState(root, SB, OWED_FILE)).acts.map((a) => a.act), ['merge 9']);
});


test('a write kept for replay leaves the waiting records in the clone: the replay pushes the write alone, the next batched write the records, once each (cold reviews of C18)', () => {
  const { root, bare } = product();
  bookkeep(root, SB, 'starts owed: merge 11', 'owe', { path: OWED_FILE, act: 'merge 11', at: now() });
  stateIO.push = () => ({ code: 1, stderr: 'remote: refused for the test' });
  try { assert.throws(() => writeState(root, SB, 'a write', (dir) => { writeFileSync(join(dir, 'k.txt'), 'k\n'); return {}; }), /state replay/); } finally { delete stateIO.push; }
  assert.deepEqual(readOwed(root, SB).acts.map((a) => a.act), ['merge 11'], 'still waiting in the clone');
  stateReplay(root, SB, [], { log: () => {} });
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.equal(readState(root, SB, 'k.txt'), 'k\n', 'the kept write replayed');
  assert.equal(readState(root, SB, OWED_FILE), null, 'the replay carried no records');
  stateBatch(true);
  try { writeState(root, SB, 'later', (dir) => { writeFileSync(join(dir, 'l.txt'), 'l\n'); return {}; }); flushState(); } finally { stateBatch(false); }
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.deepEqual(JSON.parse(readState(root, SB, OWED_FILE)).acts.map((a) => a.act), ['merge 11'], 'once');
  assert.ok(bare);
});


test('a batched flush refused to the end keeps its own writes for replay and leaves the waiting records waiting, never in both', () => {
  const { root, bare } = product();
  bookkeep(root, SB, 'starts owed: merge 12', 'owe', { path: OWED_FILE, act: 'merge 12', at: now() });
  const before = pushes(bare);
  stateIO.push = () => ({ code: 1, stderr: 'remote: refused for the test' });
  stateBatch(true);
  try {
    writeState(root, SB, 'a real write', (dir) => { writeFileSync(join(dir, 'r.txt'), 'r\n'); return {}; });
    assert.throws(() => flushState(), /state replay/);
  } finally { stateBatch(false); delete stateIO.push; }
  assert.equal(pushes(bare), before);
  const kept = git(['for-each-ref', '--format=%(refname)', 'refs/p3/unpushed/'], { cwd: root }).split('\n').filter(Boolean);
  assert.equal(kept.length, 1, 'the real write kept, alone');
  assert.equal(git(['log', '-1', '--format=%s', kept[0]], { cwd: root }), 'a real write');
  assert.deepEqual(readOwed(root, SB).acts.map((a) => a.act), ['merge 12'], 'the record still waiting in the clone');
  stateReplay(root, SB, [], { log: () => {} });
  stateBatch(true);
  try { writeState(root, SB, 'next', (dir) => { writeFileSync(join(dir, 'n.txt'), 'n\n'); return {}; }); flushState(); } finally { stateBatch(false); }
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.deepEqual(JSON.parse(readState(root, SB, OWED_FILE)).acts.map((a) => a.act), ['merge 12'], 'pushed once');
});
