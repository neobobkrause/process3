// State writes racing other writers on the state branch (the coordinator, 6 Nov, four times since
// R17's coalesced flush): the idle check's "another check landed first", met only at the flush on
// origin's newer tip, parked every write of the command in refs/p3/unpushed (a pin session's first
// setup check, 3 writes; a job's `p3 test`, 3; BOB's `github push`, 1), and `state replay` then
// refused a kept append to a jsonl another writer had appended to. A change that refuses on the tip
// it meets is dropped with a logged line; the others land; the replay re-applies appends.
import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { flushState, readState, stateBatch, stateIO, stateReplay, unbatched, writeState } from '../lib/state.mjs';
import { Fail, Superseded, git } from '../lib/util.mjs';
import { makeRepo } from './helpers.mjs';

const SB = 'process-state';
const ROWS = 'metrics/sweep.jsonl';
function withOrigin() {
  const root = makeRepo({ 'README.md': 'x\n' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  // Another session's clone of the same origin.
  const other = join(mkdtempSync(join(tmpdir(), 'p3-other-')), 'c');
  git(['clone', '-q', bare, other], { cwd: root });
  git(['config', 'user.email', 'o@x'], { cwd: other });
  git(['config', 'user.name', 'o'], { cwd: other });
  return { root, other };
}
const append = (row) => (wt) => { mkdirSync(join(wt, 'metrics'), { recursive: true }); appendFileSync(join(wt, ROWS), JSON.stringify(row) + '\n'); return {}; };
// The idle check's change: refused when a check row landed on the tip it meets.
const LOST = new Superseded('another check landed first');
const idleCheck = (row) => (wt) => {
  const p = join(wt, ROWS);
  if (existsSync(p) && readFileSync(p, 'utf8').includes('"row":"check"')) throw LOST;
  return append(row)(wt);
};
const unpushed = (root) => git(['for-each-ref', '--format=%(refname)', 'refs/p3/unpushed/'], { cwd: root });
function quietly(fn) {
  const errs = [];
  const orig = console.error;
  console.error = (l) => errs.push(String(l));
  try { return { r: fn(), errs }; } finally { console.error = orig; }
}

for (const [shape, writes] of [['a pin session\'s first setup check', 2], ['a job after p3 test', 2], ['BOB\'s github push', 0]]) {
  test(`${shape}: the idle check loses to another session's check at the flush; it is dropped and logged, the command's other writes land, nothing is parked`, () => {
    const { root, other } = withOrigin();
    writeState(root, SB, 'seed', append({ row: 'seed' }));
    stateBatch(true);
    try {
      writeState(root, SB, 'idle check: ok', idleCheck({ row: 'check', by: 'me' }));
      for (let i = 0; i < writes; i++) writeState(root, SB, `write ${i}`, (wt) => { writeFileSync(join(wt, `w${i}.txt`), `${i}\n`); return {}; });
      // Meanwhile another session's check lands on origin (its own process: pushed at once).
      unbatched(() => writeState(other, SB, 'idle check: other', append({ row: 'check', by: 'other' })));
      const { r, errs } = quietly(() => flushState());
      assert.equal(r, writes, "the dropped write is not counted as pushed");
      assert.ok(errs.some((l) => /^note: state write dropped on the state branch as it stands now: idle check: ok: another check landed first$/.test(l)), errs.join('\n'));
    } finally { stateBatch(false); }
    git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
    const rows = readState(root, SB, ROWS).trim().split('\n').map((l) => JSON.parse(l));
    assert.deepEqual(rows.map((x) => x.by || x.row), ['seed', 'other'], 'one check, the other session\'s');
    for (let i = 0; i < writes; i++) assert.equal(readState(root, SB, `w${i}.txt`), `${i}\n`);
    assert.equal(unpushed(root), '', 'nothing parked');
  });
}

test('an unbatched write whose change refuses on the tip another writer moved to is dropped, not kept for a replay', () => {
  const { root, other } = withOrigin();
  writeState(root, SB, 'seed', append({ row: 'seed' }));
  let n = 0;
  const real = (wt, sb) => git(['push', '-q', 'origin', `HEAD:refs/heads/${sb}`], { cwd: wt, allowFail: true });
  stateIO.wait = 1;
  // The first push loses the race: the other session's check lands just before it.
  stateIO.push = (wt, sb) => { if (++n === 1) { stateIO.push = null; writeState(other, SB, 'idle check: other', append({ row: 'check', by: 'other' })); stateIO.push = real; } return real(wt, sb); };
  try {
    const { errs } = quietly(() => writeState(root, SB, 'idle check: ok', idleCheck({ row: 'check', by: 'me' })));
    assert.ok(errs.some((l) => /state write dropped .*idle check: ok: another check landed first/.test(l)), errs.join('\n'));
  } finally { stateIO.push = null; stateIO.wait = null; }
  assert.equal(unpushed(root), '');
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.equal(readState(root, SB, ROWS).trim().split('\n').length, 2);
});

test('state replay re-applies a kept append onto a tip another writer appended to, and drops a kept idle check with a logged line', () => {
  const { root, other } = withOrigin();
  writeState(root, SB, 'seed', append({ row: 'seed' }));
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  // Two kept writes made on the old tip: an append (a test row) and an idle check.
  const keep = (msg, change) => {
    const wt = join(mkdtempSync(join(tmpdir(), 'p3-keep-')), 'w');
    git(['worktree', 'add', '-q', '--detach', wt, `refs/remotes/origin/${SB}`], { cwd: root });
    change(wt);
    git(['add', '-A'], { cwd: wt });
    git(['-c', 'user.name=t', '-c', 'user.email=t@x', 'commit', '-q', '-m', msg], { cwd: wt });
    const name = `refs/p3/unpushed/${Date.now()}-${msg.replace(/\W+/g, '-')}`;
    git(['update-ref', name, 'HEAD'], { cwd: wt });
    git(['worktree', 'remove', '--force', wt], { cwd: root });
    return name;
  };
  const a = keep('test row: case-import', append({ row: 'test', module: 'case-import' }));
  const b = keep('idle check: ok', append({ row: 'check', by: 'me' }));
  // Another writer appends to the same file meanwhile.
  writeState(other, SB, 'idle check: other', append({ row: 'check', by: 'other' }));
  const lines = [];
  const done = stateReplay(root, SB, [], { log: (l) => lines.push(l) });
  assert.deepEqual(done.sort(), [a, b].sort());
  assert.ok(lines.some((l) => l.startsWith(`dropped ${b} (idle check: ok): an idle check's row is stale once kept`)), lines.join('\n'));
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  const rows = readState(root, SB, ROWS).trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(rows.map((x) => x.by || x.module || x.row), ['seed', 'other', 'case-import']);
  assert.equal(unpushed(root), '');
  // Replayed twice (a rerun): the append is there already, written once.
  assert.deepEqual(stateReplay(root, SB, [], { log: () => {} }), []);
});

// Cold review: only a superseded write is dropped; any other refusal met on a newer tip is said
// plainly, nothing written and nothing kept (a reservation that lost: a lane's seat, an address).
test('a reservation that loses the race refuses plainly: nothing written, nothing kept', () => {
  const { root, other } = withOrigin();
  writeState(root, SB, 'seed', append({ row: 'seed' }));
  const seat = (who) => (wt) => {
    const p = join(wt, 'lanes/ux.json');
    if (existsSync(p)) throw new Fail(`lane ux is held by ${JSON.parse(readFileSync(p, 'utf8')).who}`);
    mkdirSync(join(wt, 'lanes'), { recursive: true });
    writeFileSync(p, JSON.stringify({ who }));
    return {};
  };
  const real = (wt, sb) => git(['push', '-q', 'origin', `HEAD:refs/heads/${sb}`], { cwd: wt, allowFail: true });
  let n = 0;
  stateIO.wait = 1;
  stateIO.push = (wt, sb) => { if (++n === 1) { stateIO.push = null; writeState(other, SB, 'lane start ux', seat('other')); stateIO.push = (w, b) => real(w, b); } return real(wt, sb); };
  try {
    assert.throws(() => writeState(root, SB, 'lane start ux', seat('me')), /lane start ux: refused on process-state as it stands now \(another writer moved it first\): lane ux is held by other; nothing was written/);
  } finally { stateIO.push = null; stateIO.wait = null; }
  assert.equal(unpushed(root), '');
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.equal(JSON.parse(readState(root, SB, 'lanes/ux.json')).who, 'other');
});

test('at the flush, a write that refuses on the newer tip (not superseded) is reported, the others pushed, nothing parked', () => {
  const { root, other } = withOrigin();
  writeState(root, SB, 'seed', append({ row: 'seed' }));
  const end = (wt) => { if (existsSync(join(wt, 'ended.txt'))) throw new Fail('the lane ended already'); writeFileSync(join(wt, 'ended.txt'), 'me\n'); return {}; };
  stateBatch(true);
  let err = null;
  try {
    writeState(root, SB, 'lane end ux', end);
    writeState(root, SB, 'a note', (wt) => { writeFileSync(join(wt, 'note.txt'), 'n\n'); return {}; });
    unbatched(() => writeState(other, SB, 'lane end ux (other)', end));
    try { quietly(() => flushState()); } catch (e) { err = e; }
  } finally { stateBatch(false); }
  assert.match(err?.message || '', /^1 state write\(s\) of this command refused on the state branch as it stands now, so not written \(the command's other writes are pushed\): lane end ux: the lane ended already$/);
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.equal(readState(root, SB, 'note.txt'), 'n\n');
  assert.equal(unpushed(root), '');
});

test('state replay keeps a write whose append another writer raced outside the measurement rows (an id counted from the file)', () => {
  const { root, other } = withOrigin();
  writeState(root, SB, 'seed', (wt) => { writeFileSync(join(wt, 'holds.jsonl'), '{"id":"hold-1"}\n'); return {}; });
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  const wt = join(mkdtempSync(join(tmpdir(), 'p3-keep-')), 'w');
  git(['worktree', 'add', '-q', '--detach', wt, `refs/remotes/origin/${SB}`], { cwd: root });
  appendFileSync(join(wt, 'holds.jsonl'), '{"id":"hold-2","by":"me"}\n');
  git(['add', '-A'], { cwd: wt });
  git(['-c', 'user.name=t', '-c', 'user.email=t@x', 'commit', '-q', '-m', 'hold'], { cwd: wt });
  const name = `refs/p3/unpushed/${Date.now()}-hold`;
  git(['update-ref', name, 'HEAD'], { cwd: wt });
  writeState(other, SB, 'hold (other)', (w) => { appendFileSync(join(w, 'holds.jsonl'), '{"id":"hold-2","by":"other"}\n'); return {}; });
  assert.throws(() => stateReplay(root, SB, [name], { log: () => {} }), /does not apply to process-state as it stands now \(holds\.jsonl changed there in a way its change cannot be merged into\); it is kept/);
  assert.equal(unpushed(root), name, 'kept');
});
