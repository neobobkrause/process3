// Merge train robustness (build train-robust, notes/train-robust-options.md; the coordinator's
// ruling, 5 Nov): on the copy a `send` run in the train's own clone clashed with the train on
// refs/remotes/origin/process-state ("cannot lock ref ... is at X but expected Y"): PR 502 was
// refused and queued again by hand (12:36), and PR 499's land went unrecorded, the train stopped
// and the caller printed no wake of BOB (12:21). Against a local bare origin and a fake GitHub.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { WAKES_FILE, fetchState, jsonl, readState, send, writeState } from '../lib/state.mjs';
import { PLAIN_FILE, TRAIN_FILE, plainViaTrain, releaseLease, takeLease, train } from '../lib/train.mjs';
import { PIN_WHAT, pinWake, printWake } from '../lib/merge.mjs';
import { wakeLine } from '../lib/job.mjs';
import { Fail, STATE_LOCK, fetchRetry, git, loadConfig, stateLockPath, withStateLock } from '../lib/util.mjs';
import { entry, makeRepo } from './helpers.mjs';

const S = 'session_merger1';
const OTHER = 'session_othertrain';
const SB = 'process-state';
const PIN = 'a'.repeat(40);
const quiet = () => {};
const UTIL = fileURLToPath(new URL('../lib/util.mjs', import.meta.url));

// One plain pull request (PR 1) into the tranche; pin: it moves the process pin. The head already
// holds the tranche, so the fake ruleset lets it merge as it is.
function setup({ pin = true, job = false } = {}) {
  const root = makeRepo({ 'README.md': 'x', ...(job ? { 'process/ledger/alpha.json': entry('alpha'), 'test/alpha/a.test.mjs': "import assert from 'node:assert';\nassert.equal(1, 1);\n" } : {}) });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'pin/move', 'tranche'], { cwd: root });
  // A gitlink with no checkout: committed from the index (commit's add -A would drop it).
  writeFileSync(join(root, 'notes.md'), 'the pin moves');
  git(['add', 'notes.md'], { cwd: root });
  if (pin) git(['update-index', '--add', '--cacheinfo', `160000,${PIN},.process`], { cwd: root });
  git(['commit', '-q', '-m', 'move the pin'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche', 'main', 'pin/move'], { cwd: root });
  writeState(root, SB, 'test: the state branch', (wt) => { mkdirSync(join(wt, 'merger'), { recursive: true }); writeFileSync(join(wt, 'merger', '.keep'), ''); });
  return root;
}

function github(root) {
  const sh = (args) => git(args, { cwd: root, allowFail: true });
  const tipOf = (ref) => sh(['ls-remote', 'origin', `refs/heads/${ref}`]).stdout.split('\t')[0];
  const st = { open: true, merged: false, merge: null };
  const calls = { merged: [] };
  const pr = () => ({ number: 1, state: st.open ? 'open' : 'closed', merged: st.merged, merge_commit_sha: st.merge, draft: false, mergeable: true, user: { login: 'civicsmith' }, base: { ref: 'tranche', repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: 'pin/move', sha: tipOf('pin/move'), repo: { full_name: 'o/r' } } });
  const gate = (sha) => ({ id: 1, status: 'completed', conclusion: 'success', html_url: `https://ci/${sha.slice(0, 7)}`, started_at: new Date().toISOString(), completed_at: new Date().toISOString() });
  const land = (sha) => {
    sh(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche']);
    if (sh(['merge-base', '--is-ancestor', 'refs/remotes/origin/tranche', sha]).code !== 0) throw new Fail('gh api -X PUT failed: Base branch was modified. Review and try the merge again.');
    const c = git(['commit-tree', `${sha}^{tree}`, '-p', 'refs/remotes/origin/tranche', '-p', sha, '-m', 'Merge PR 1'], { cwd: root });
    git(['push', '-q', 'origin', `${c}:refs/heads/tranche`], { cwd: root });
    Object.assign(st, { open: false, merged: true, merge: c });
    calls.merged.push(1);
    return { merged: true, sha: c };
  };
  const io = {
    openPRs: () => (st.open ? [pr()] : []),
    getPR: () => pr(),
    comments: () => [],
    verify: () => true,
    requiredChecks: () => ({ checks: [{ context: 'gate' }] }),
    repo: { released: () => true, shim: () => null, descends: () => true },
    checkRuns: (slug, sha) => [gate(sha)],
    checkRun: (slug, sha) => gate(sha),
    mergePR: (slug, n, sha) => land(sha),
  };
  return { io, calls, st, land, tipOf };
}
const rows = (root, f) => { fetchState(root, SB, { fresh: true }); return jsonl(readState(root, SB, f)); };
const otherTrain = (root) => { takeLease(root, loadConfig(root), OTHER, 'tok', { take: true, proc: null }); return () => releaseLease(root, loadConfig(root), OTHER, 'tok'); };
const queue = (root, o = {}) => writeState(root, SB, 'test: a queued pin move', (wt) => {
  mkdirSync(join(wt, 'merger'), { recursive: true });
  appendFileSync(join(wt, PLAIN_FILE), JSON.stringify({ at: new Date().toISOString(), row: 'queue', id: 'q1', pr: 1, head: git(['ls-remote', 'origin', 'refs/heads/pin/move'], { cwd: root }).split('\t')[0], ref: 'pin/move', as: 'pin', no_review: 'a pin move', rounds: 0, take_by: new Date(Date.now() + 3600e3).toISOString(), renews: true, ...o }) + '\n');
});
// A lock file another (live) process holds: this test's own parent, never this process's record.
const holdLock = (root) => writeFileSync(stateLockPath(root), JSON.stringify({ pid: process.ppid || 1, host: 'elsewhere', at: new Date().toISOString(), token: 'held' }));
const freeLock = (root) => rmSync(stateLockPath(root), { force: true });
const LOCK_CLASH = "cannot read origin's process-state: error: cannot lock ref 'refs/remotes/origin/process-state': is at ae959b7804cfc2e8227761ed8e2c2438e986d073 but expected 645e94ca7eda78ca760980eae9abb1bf39166452";

// 1A
test('fetchRetry runs a fetch that lost a ref-lock clash again, and returns any other failure at once', () => {
  let n = 0;
  const clash = { code: 1, stderr: "error: cannot lock ref 'refs/remotes/origin/process-state': is at ae959b78 but expected 645e94ca" };
  const r = fetchRetry([], {}, { wait: 1, run: () => (n++ < 2 ? clash : { code: 0, stderr: '' }) });
  assert.equal(r.code, 0);
  assert.equal(n, 3);
  n = 0;
  const other = fetchRetry([], {}, { wait: 1, run: () => { n++; return { code: 128, stderr: "fatal: couldn't find remote ref refs/heads/x" }; } });
  assert.equal(other.code, 128);
  assert.equal(n, 1, 'not a clash: not retried');
  n = 0;
  assert.equal(fetchRetry([], {}, { wait: 1, tries: 3, run: () => { n++; return clash; } }).code, 1);
  assert.equal(n, 3, 'bounded');
});

test('fetchState waits out another git process holding the state ref\'s lock, instead of failing "cannot lock ref"', () => {
  const root = setup({ pin: false });
  writeState(root, SB, 'test: move the state branch', (wt) => writeFileSync(join(wt, 'moved'), 'x'));
  // Our ref falls behind origin's, then another git process holds its lock for about a second.
  const behind = git(['rev-parse', `refs/remotes/origin/${SB}~1`], { cwd: root });
  git(['update-ref', `refs/remotes/origin/${SB}`, behind], { cwd: root });
  const lock = join(root, '.git', 'refs', 'remotes', 'origin', `${SB}.lock`);
  writeFileSync(lock, `${behind}\n`);
  const bare = git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root, allowFail: true });
  assert.notEqual(bare.code, 0, 'the clash as git reports it');
  const child = spawn('sh', ['-c', `sleep 1; rm -f '${lock}'`], { stdio: 'ignore' });
  assert.equal(fetchState(root, SB, { fresh: true }), true);
  child.kill();
  assert.equal(git(['rev-parse', `refs/remotes/origin/${SB}`], { cwd: root }), git(['ls-remote', 'origin', `refs/heads/${SB}`], { cwd: root }).split('\t')[0]);
});

test('a plain row whose state read lost a ref-lock clash is tried again, not refused, and BOB is not told', () => {
  const root = setup({ pin: false });
  const g = github(root);
  let n = 0;
  const get = g.io.getPR;
  g.io.getPR = (...a) => { if (n++ === 0) throw new Fail(LOCK_CLASH); return get(...a); };
  queue(root, { as: 'bob' });
  train(root, { once: true, session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, log: quiet });
  const mine = rows(root, TRAIN_FILE).filter((x) => x.row === 'plain' && x.result !== 'taken');
  assert.equal(mine.length, 1);
  assert.equal(mine[0].result, 'retry', mine[0].why);
  assert.deepEqual(rows(root, 'messages/merger.jsonl'), [], 'no refusal sent to BOB');
});

// 3A
test('the state lock: a stale one (its process gone) is broken; a live one is waited on, then reported, never skipped', () => {
  const root = setup({ pin: false });
  const p = stateLockPath(root);
  const dead = spawnSync('true').pid;
  writeFileSync(p, JSON.stringify({ pid: dead, host: 'h', at: new Date().toISOString(), token: 'x' }));
  assert.equal(withStateLock(root, () => 7, { host: 'h', alive: () => false }), 7);
  assert.equal(existsSync(p), false, 'released after use');
  const was = STATE_LOCK.wait;
  STATE_LOCK.wait = 1;
  try {
    holdLock(root);
    let ran = false;
    const t0 = Date.now();
    assert.throws(() => withStateLock(root, () => { ran = true; }), /the state lock .* is held by process \d+ on elsewhere since .*waited 1 s; nothing was read or written/);
    assert.equal(ran, false);
    assert.ok(Date.now() - t0 >= 900, 'waited');
    assert.throws(() => writeState(root, SB, 'test', () => {}), /the state lock/, 'every state write holds it');
    assert.throws(() => fetchState(root, SB, { fresh: true }), /the state lock/, 'every state fetch holds it');
  } finally { STATE_LOCK.wait = was; freeLock(root); }
  // Re-entrant in one process: a write's own fetch does not wait on itself.
  assert.equal(withStateLock(root, () => withStateLock(root, () => fetchState(root, SB, { fresh: true }))), true);
});

test('send in a clone where another p3 process holds the state lock waits its turn and lands; nothing races', () => {
  const root = setup({ pin: false });
  const script = join(mkdtempSync(join(tmpdir(), 'p3-lockholder-')), 'hold.mjs');
  const flag = `${script}.held`;
  writeFileSync(script, `import { withStateLock } from ${JSON.stringify(UTIL)};\nimport { writeFileSync } from 'node:fs';\nwithStateLock(${JSON.stringify(root)}, () => { writeFileSync(${JSON.stringify(flag)}, '1'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500); });\n`);
  const child = spawn(process.execPath, [script], { stdio: 'ignore' });
  const until = Date.now() + 10000;
  while (!existsSync(flag) && Date.now() < until) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
  assert.ok(existsSync(flag), 'the other process holds the lock');
  const t0 = Date.now();
  const r = send(root, SB, { from: 'merger', to: 'bob', text: 'hello', log: quiet });
  assert.ok(Date.now() - t0 >= 500, 'waited for the holder');
  assert.equal(r.n, 1);
  assert.equal(rows(root, 'messages/merger.jsonl').length, 1);
  child.kill();
});

// 2B
test('a train whose row write fails after a land keeps going, and writes the row at its next pass; the land is not taken again', () => {
  const root = setup({ pin: false });
  const g = github(root);
  g.io.mergePR = (slug, k, sha) => { const r = g.land(sha); holdLock(root); return r; };
  queue(root, { as: 'bob' });
  const was = STATE_LOCK.wait;
  STATE_LOCK.wait = 1;
  const lines = [];
  try {
    train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, idleEvery: 0, rounds: 2, log: (l) => { lines.push(l); if (/was not written .*tried again at the next pass/.test(l)) freeLock(root); } });
  } finally { STATE_LOCK.wait = was; freeLock(root); }
  assert.deepEqual(g.calls.merged, [1]);
  assert.ok(lines.some((l) => /the train's row for PR 1 \(merged\) was not written/.test(l)));
  const ends = rows(root, TRAIN_FILE).filter((x) => x.row === 'plain' && x.result === 'merged');
  assert.equal(ends.length, 1, 'one merged row, the kept one: no "elsewhere" row for the same land');
  assert.ok(ends[0].late && !ends[0].elsewhere);
});

// 2A
test('a pin move landed by a train that stopped before its row: the caller prints the wake from git, once, and records it', () => {
  const root = setup();
  const g = github(root);
  const stopOther = otherTrain(root);
  const lines = [];
  // The land happens, then the train is gone with no row written (copy PR 499, 12:21).
  const pause = () => { if (!g.st.merged) { g.land(g.tipOf('pin/move')); stopOther(); } };
  const r = plainViaTrain(root, 1, { slug: 'o/r', io: g.io, noReview: 'a pin move', as: 'pin', log: (l) => lines.push(l), minutes: 5, pause });
  assert.equal(r.merged, true);
  assert.ok(lines.some((l) => /^merged pull request 1 at \w+ \(by the train\)$/.test(l)));
  const what = PIN_WHAT(PIN);
  assert.equal(r.what, what);
  assert.equal(lines.filter((l) => l === wakeLine(what, 'pin')).length, 1, 'the wake, printed');
  const w = rows(root, WAKES_FILE);
  assert.deepEqual(w.map((x) => [x.row, x.sha, x.by]), [['wake', r.sha, 'caller'], ['printed', r.sha, 'caller']]);
});

test('a later pass that finds the pin move merged records its wake in the row, once; the caller prints it once; a second sighting is not printed again', () => {
  const root = setup();
  const g = github(root);
  queue(root);
  const { sha } = g.land(g.tipOf('pin/move')); // landed by an earlier train whose row was lost
  train(root, { once: true, session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, log: quiet });
  const end = rows(root, TRAIN_FILE).find((x) => x.row === 'plain' && x.result === 'merged');
  assert.ok(end.elsewhere);
  assert.equal(end.what, PIN_WHAT(PIN));
  assert.equal(end.wake, wakeLine(PIN_WHAT(PIN), 'pin').match(/`(.*)`/)[1]);
  assert.deepEqual(rows(root, WAKES_FILE).map((x) => [x.row, x.by]), [['wake', 'train']]);
  // Its caller prints it; a second run that reaches the same merge commit says it was given.
  const a = [];
  const b = [];
  printWake(root, SB, { pr: 1, sha, what: end.what, wake: end.wake, as: 'pin', by: 'caller', log: (l) => a.push(l) });
  printWake(root, SB, { pr: 1, sha, what: end.what, wake: end.wake, as: 'pin', by: 'caller', log: (l) => b.push(l) });
  assert.deepEqual(a, [wakeLine(end.what, 'pin')]);
  assert.match(b[0], /^the wake of BOB for PR 1 \(merge \w+\) was already given by caller at .*: not given again$/);
  assert.deepEqual(rows(root, WAKES_FILE).map((x) => [x.row, x.by]), [['wake', 'train'], ['printed', 'caller']]);
});

test('a pin move the train lands is printed once, by its caller: the train\'s own log carries no wake line for the MERGER to send again', () => {
  const root = setup();
  const g = github(root);
  const stopOther = otherTrain(root);
  const lines = [];
  const trainLines = [];
  let pauses = 0;
  const r = plainViaTrain(root, 1, { slug: 'o/r', io: g.io, noReview: 'a pin move', as: 'pin', log: (l) => lines.push(l), minutes: 5, pause: () => { if (pauses++ === 0) { stopOther(); train(root, { once: true, session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, log: (l) => trainLines.push(l) }); } } });
  assert.equal(r.merged, true);
  const line = wakeLine(PIN_WHAT(PIN), 'pin');
  assert.equal(lines.filter((l) => l === line).length, 1);
  assert.equal(trainLines.filter((l) => /next act: wake BOB/.test(l)).length, 0);
  assert.ok(trainLines.some((l) => /PR 1 moved the pin: the wake of BOB is its caller's to give/.test(l)));
  assert.deepEqual(rows(root, WAKES_FILE).map((x) => [x.row, x.by]), [['wake', 'train'], ['printed', 'caller']]);
});

test('pinWake: none for BOB or an unmoved pin; an unreadable merge commit still wakes, said so', () => {
  const root = setup({ pin: false });
  const g = github(root);
  const { sha } = g.land(g.tipOf('pin/move'));
  assert.deepEqual(pinWake(root, 'tranche', sha, 'pin'), { what: null, wake: null });
  assert.deepEqual(pinWake(root, 'tranche', sha, 'bob'), { what: null, wake: null });
  const u = pinWake(root, 'tranche', 'b'.repeat(40), 'pin');
  assert.equal(u.unread, true);
  assert.match(u.what, /the pin may have moved \(merge b{10} could not be read\)/);
  assert.ok(u.wake);
});
