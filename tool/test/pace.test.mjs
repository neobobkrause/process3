// GitHub pacing (R17; coordinator, 6 Nov: the civicsmith account was suspended at 19:19Z, most
// likely for automated bulk activity; the copy pushed its state branch 1,387 times that day, 173 in
// its busiest hour). The caps, the gh pace and log, the poll backoff, the budget and one state push
// per command.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { laneStart } from '../lib/lane.mjs';
import { ghTurn, githubBudget, pacingProblem, pollMs, pushSeen, PACING_DEFAULTS } from '../lib/pace.mjs';
import { fetchState, flushState, pendingWrites, readState, stateBatch, stateIO, writeState } from '../lib/state.mjs';
import { flow } from '../lib/status.mjs';
import { configOf, git, jobCap } from '../lib/util.mjs';
import { makeRepo } from './helpers.mjs';

const quiet = () => {};
// The caps themselves: helpers.mjs's test stand-ins cleared for one test, restored after it.
function realCaps(t, env = {}) {
  const keys = ['P3_TEST_PACING_JOBS', 'P3_TEST_PACING_LANES', 'P3_JOB_CAP', 'P3_GITHUB_LOG', ...Object.keys(env)];
  const was = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  delete process.env.P3_TEST_PACING_JOBS;
  delete process.env.P3_TEST_PACING_LANES;
  delete process.env.P3_JOB_CAP;
  Object.assign(process.env, env);
  t.after(() => { for (const [k, v] of Object.entries(was)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } });
}
function withOrigin(files) {
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  return { root, bare };
}

test('pacing config: conservative defaults; a key outside pacing, a cap under 1 or a poll tighter than 30 s is refused', () => {
  assert.deepEqual(PACING_DEFAULTS, { jobs: 4, lanes: 1, gh_interval_ms: 2000, poll_first_s: 30, poll_most_s: 300 });
  assert.deepEqual(configOf({}).pacing, PACING_DEFAULTS);
  assert.equal(configOf({ pacing: { jobs: 6 } }).pacing.jobs, 6);
  assert.equal(pacingProblem({ jobs: 0 }), 'pacing.jobs is a whole number, 1 or more');
  assert.match(pacingProblem({ burst: 3 }), /pacing\.burst is not a pacing key/);
  assert.throws(() => configOf({ pacing: { poll_first_s: 10 } }), /pacing\.poll_first_s is 30 or more: no wait on GitHub polls tighter than 30 s/);
  assert.throws(() => configOf({ pacing: { poll_first_s: 60, poll_most_s: 40 } }), /poll_most_s is at least pacing\.poll_first_s/);
  configOf({});
});

test('polls back off from 30 s to 5 min, never tighter than 30 s', () => {
  const p = { ...PACING_DEFAULTS };
  assert.deepEqual([1, 2, 3, 4, 5, 6, 9].map((k) => pollMs(k, p) / 1000), [30, 60, 120, 240, 300, 300, 300]);
  assert.equal(pollMs(1, { ...p, poll_first_s: 5 }), 30000, 'the floor holds whatever the numbers');
});

test('the job cap is at most pacing.jobs; the account cap still binds below it; status queues the startable jobs past the free slots', (t) => {
  realCaps(t);
  assert.deepEqual([jobCap({}).cap, jobCap({}).from], [4, 'pacing.jobs in process/config.json']);
  assert.equal(jobCap({ pacing: { jobs: 10 } }, { P3_JOB_CAP: '6' }).cap, 6);
  assert.equal(jobCap({ pacing: { jobs: 10 } }, {}).cap, 10);
  // 3 live of 4: one slot free, 3 startable, 2 wait their turn.
  const f = flow(configOf({}), [], [], 3, null, [], { view: { kind: 'open', startable: ['a', 'b', 'c'] } });
  assert.equal(f.queued, 2);
  assert.match(f.line, /^flow: live 3\/4 \(pacing\.jobs in process\/config\.json\), startable 3, queued 2 \(each starts as a slot frees: GitHub pacing\)/);
  assert.equal(flow(configOf({}), [], [], 1, null, [], { view: { kind: 'open', startable: ['a'] } }).queued, undefined);
});

test('lane start refuses past pacing.lanes, naming the live lanes; a replace adds none; a raised cap lets the next start', (t) => {
  realCaps(t);
  const files = { 'process/config.json': { lanes: [{ name: 'ux', dir: 'design/ux' }, { name: 'pub', dir: 'design/pub' }] }, 'design/ux/README.md': 'x\n', 'design/pub/README.md': 'x\n' };
  const { root } = withOrigin(files);
  laneStart(root, 'ux', { slug: 'o/p', log: quiet });
  assert.throws(() => laneStart(root, 'pub', { slug: 'o/p', log: quiet }), /the lane cap is full: 1 lane session\(s\) live \(lane ux\) of pacing\.lanes 1 in process\/config\.json \(GitHub pacing\).*nothing was started/);
  laneStart(root, 'ux', { slug: 'o/p', replace: 'pending', log: quiet });
  const two = withOrigin({ ...files, 'process/config.json': { ...files['process/config.json'], pacing: { lanes: 2 } } });
  laneStart(two.root, 'ux', { slug: 'o/p', log: quiet });
  laneStart(two.root, 'pub', { slug: 'o/p', log: quiet });
});

test('each gh call waits for the clone\'s last one to be gh_interval_ms old, and every call, push and Actions dispatch is logged; github budget counts them per session', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'p3-pace-'));
  const logFile = join(dir, 'log.jsonl');
  realCaps(t, { P3_GITHUB_LOG: logFile, CLAUDE_CODE_SESSION_ID: 'cse_a' });
  const root = makeRepo({ 'README.md': 'x\n' });
  let clock = 1_000_000;
  const slept = [];
  const at = { p: { ...PACING_DEFAULTS }, now: () => clock, sleep: (ms) => { slept.push(ms); clock += ms; } };
  ghTurn(['api', 'repos/o/p/pulls/1'], root, at);
  clock += 500;
  ghTurn(['pr', 'view', '1'], root, at);
  assert.deepEqual(slept, [1500], 'the second call waits out the rest of the 2 s');
  clock += 5000;
  ghTurn(['workflow', 'run', 'deploy-test.yml', '-f', 'x=1'], root, at);
  assert.deepEqual(slept, [1500], 'no wait once the interval has passed');
  pushSeen(['push', '-q', 'origin', 'HEAD:refs/heads/job/a'], root);
  pushSeen(['push', '--dry-run', 'origin', 'HEAD'], root);
  process.env.CLAUDE_CODE_SESSION_ID = 'cse_b';
  ghTurn(['api', 'user'], root, { ...at, p: { ...PACING_DEFAULTS, gh_interval_ms: 0 } });
  const rows = readFileSync(logFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(rows.map((r) => [r.kind, r.session]), [['gh', 'cse_a'], ['gh', 'cse_a'], ['actions', 'cse_a'], ['push', 'cse_a'], ['gh', 'cse_b']]);
  // An old row is outside the window.
  writeFileSync(logFile, readFileSync(logFile, 'utf8') + JSON.stringify({ at: '2020-01-01T00:00:00Z', kind: 'gh', session: 'cse_a' }) + '\n');
  const out = [];
  const b = githubBudget(root, { hours: 1, log: (l) => out.push(l), p: { ...PACING_DEFAULTS } });
  assert.deepEqual([b.gh, b.push, b.actions], [3, 1, 1]);
  assert.match(out[0], /github budget, the last 1 h, this clone .*: 3 gh call\(s\), 1 push\(es\), 1 Actions dispatch\(es\); the pace: one gh call per 2 s per clone \(at most 1800 in 1 h\)/);
  assert.ok(out.includes('- cse_a: 2 gh, 1 push, 1 actions') && out.includes('- cse_b: 1 gh, 0 push, 0 actions'), out.join('\n'));
  assert.throws(() => githubBudget(root, { hours: 0, log: quiet }), /--hours/);
});

test('coalesced state writes: read at once in the command, pushed once at its end, made again on a tip another writer moved', (t) => {
  const { root, bare } = withOrigin({ 'README.md': 'x\n' });
  const SB = 'process-state';
  writeState(root, SB, 'seed', (wt) => { writeFileSync(join(wt, 'seed.txt'), 's\n'); return {}; });
  let pushes = 0;
  const real = (wt, sb) => { pushes++; return git(['push', '-q', 'origin', `HEAD:refs/heads/${sb}`], { cwd: wt, allowFail: true }); };
  stateIO.push = real;
  stateIO.wait = 1;
  stateBatch(true);
  t.after(() => { stateBatch(false); stateIO.push = null; stateIO.wait = null; });
  const add = (f, v) => (wt) => { writeFileSync(join(wt, f), `${(() => { try { return readFileSync(join(wt, f), 'utf8'); } catch { return ''; } })()}${v}\n`); return { f }; };
  const r = writeState(root, SB, 'one', add('a.txt', '1'));
  assert.equal(r.f, 'a.txt');
  writeState(root, SB, 'two', add('a.txt', '2'));
  assert.equal(readState(root, SB, 'a.txt'), '1\n2\n', 'the command reads its own writes');
  assert.equal(pushes, 0);
  assert.equal(pendingWrites(), 2);
  assert.equal(git(['show', `${SB}:a.txt`], { cwd: bare, allowFail: true }).code, 128, 'origin has none yet');
  // Another writer moves origin meanwhile.
  const other = join(mkdtempSync(join(tmpdir(), 'p3-other-')), 'c');
  git(['clone', '-q', '--branch', SB, bare, other], { cwd: root });
  writeFileSync(join(other, 'b.txt'), 'theirs\n');
  git(['add', '-A'], { cwd: other });
  git(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'theirs'], { cwd: other });
  git(['push', '-q', 'origin', SB], { cwd: other });
  assert.equal(flushState(), 2);
  assert.equal(pushes, 2, 'one refused (origin moved), then one push for both writes');
  assert.equal(git(['show', `${SB}:a.txt`], { cwd: bare }), '1\n2');
  assert.equal(git(['show', `${SB}:b.txt`], { cwd: bare }), 'theirs');
  assert.deepEqual(git(['log', '--format=%s', '-3', SB], { cwd: bare }).split('\n'), ['two', 'one', 'theirs']);
  assert.equal(pendingWrites(), 0);
  // A fresh read mid-command makes the pending writes again on origin's tip.
  writeState(root, SB, 'three', add('a.txt', '3'));
  git(['-c', 'user.name=t', '-c', 'user.email=t@t', 'pull', '-q', 'origin', SB], { cwd: other });
  writeFileSync(join(other, 'c.txt'), 'c\n');
  git(['add', '-A'], { cwd: other });
  git(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'theirs again'], { cwd: other });
  git(['push', '-q', 'origin', SB], { cwd: other });
  fetchState(root, SB, { fresh: true });
  assert.deepEqual([readState(root, SB, 'a.txt'), readState(root, SB, 'c.txt')], ['1\n2\n3\n', 'c\n'], 'origin\'s new tip, with the pending write made again on it');
  writeState(root, SB, 'four', add('c.txt', 'mine'));
  assert.equal(readState(root, SB, 'a.txt'), '1\n2\n3\n');
  flushState();
  assert.equal(git(['show', `${SB}:c.txt`], { cwd: bare }), 'c\nmine');
  assert.equal(git(['show', `${SB}:a.txt`], { cwd: bare }), '1\n2\n3');
});

test('a command run through p3 pushes its state writes once, at its end, and leaves writes unbatched after it', async (t) => {
  const { root, bare } = withOrigin({ 'CLAUDE.md': '# Product\n' });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const { main } = await import('../p3.mjs');
  let pushes = 0;
  stateIO.push = (wt, sb) => { pushes++; return git(['push', '-q', 'origin', `HEAD:refs/heads/${sb}`], { cwd: wt, allowFail: true }); };
  t.after(() => { stateIO.push = null; });
  const cwd = process.cwd();
  const log = console.log;
  console.log = () => {};
  try { process.chdir(root); assert.equal(await main(['send', 'job-x', 'merge your PR', '--from', 'bob']), 0); } finally { process.chdir(cwd); console.log = log; }
  assert.equal(pushes, 1);
  assert.match(git(['log', '--format=%s', '-1', 'process-state'], { cwd: bare }), /bob/);
  assert.equal(pendingWrites(), 0);
  writeState(root, 'process-state', 'after', (wt) => { writeFileSync(join(wt, 'after.txt'), 'x\n'); return {}; });
  assert.equal(pushes, 2, 'outside a command a write pushes at once');
});
