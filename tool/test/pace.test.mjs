// GitHub limit conformance (R17; Bob, 6 Nov: "rather than limiting usage to a small fraction of
// github's stated limits, I'd suggest that the tooling limit usage to 80% or 90% of github's
// published limits"). The limits as data, the target, the account-wide windows, GitHub's refusals
// obeyed by every session, the budget report, the optional caps, and one state push per command.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { laneStart } from '../lib/lane.mjs';
import { budgetGate, classify, ghAfter, ghTurn, githubBudget, GITHUB_LIMITS, limitSignal, Paced, pacing, pacingProblem, pollMs, pushSeen, PACING_DEFAULTS, usageRows, useShared } from '../lib/pace.mjs';
import { PAUSE_FILE, shareUsage, stateShare } from '../lib/ghshare.mjs';
import { fetchState, flushState, pendingWrites, readState, stateBatch, stateIO, strandedWrites, writeState } from '../lib/state.mjs';
import { configOf, git, jobCap } from '../lib/util.mjs';
import { makeRepo } from './helpers.mjs';

const quiet = () => {};
// One test's environment (the log file, the session id), restored after it; the shared store reset.
function env(t, vars = {}) {
  const was = Object.fromEntries(Object.keys({ P3_GITHUB_LOG: 1, CLAUDE_CODE_SESSION_ID: 1, P3_JOB_CAP: 1, ...vars }).map((k) => [k, process.env[k]]));
  delete process.env.P3_JOB_CAP;
  Object.assign(process.env, vars);
  t.after(() => { useShared(null); for (const [k, v] of Object.entries(was)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } });
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
const logFile = () => join(mkdtempSync(join(tmpdir(), 'p3-pace-')), 'log.jsonl');
const P = { ...PACING_DEFAULTS, gh_interval_ms: 0 };
// A clock and a sleep that moves it.
function clock(start = Date.parse('2026-11-06T22:00:00Z')) {
  const c = { t: start, slept: [] };
  c.now = () => c.t;
  c.sleep = (ms) => { c.slept.push(ms); c.t += ms; };
  return c;
}

test('GitHub\'s published limits are data with their source and date; the target is 80 to 90% (default 85%); the caps are off by default', () => {
  assert.deepEqual(GITHUB_LIMITS, { source: 'https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api', read: '2026-11-06', primary_per_hour: 5000, actions_token_per_hour: 1000, concurrent: 100, rest_points_per_minute: 900, content_per_minute: 80, content_per_hour: 500, cpu_seconds_per_minute: 90 });
  const c = configOf({});
  assert.deepEqual([c.pacing.target, c.pacing.jobs, c.pacing.lanes], [0.85, null, null]);
  assert.equal(configOf({ pacing: { target: 0.9 } }).pacing.target, 0.9);
  assert.match(pacingProblem({ target: 0.95 }), /pacing\.target is between 0\.8 and 0\.9/);
  assert.match(pacingProblem({ target: 0.5 }), /pacing\.target is between 0\.8 and 0\.9/);
  assert.match(pacingProblem({ github_limits: { content_per_minute: 60 } }), /names its source and the date it was read/);
  assert.equal(pacingProblem({ github_limits: { content_per_minute: 60, source: 'x', read: '2027-01-01' } }), null);
  assert.match(pacingProblem({ github_limits: { content_per_day: 1, source: 'x', read: 'y' } }), /not one of GitHub's published limits/);
  assert.equal(configOf({ pacing: { github_limits: { content_per_minute: 60, source: 'x', read: 'y' } } }).pacing.github_limits.content_per_hour, 500, 'a limit not restated keeps GitHub\'s');
  assert.match(pacingProblem({ gh_interval_ms: 500 }), /gh_interval_ms is 1000 or more/);
  assert.throws(() => configOf({ pacing: { poll_first_s: 10 } }), /no wait on GitHub polls tighter than 30 s/);
  // The test stand-in is read under the test runner only, never in a session.
  assert.equal(pacing({ P3_GH_INTERVAL_MS: '0' }).gh_interval_ms, 1000);
  configOf({});
});

test('polls back off from 30 s to 5 min, never tighter than 30 s', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 9].map((k) => pollMs(k, P) / 1000), [30, 60, 120, 240, 300, 300, 300]);
  assert.equal(pollMs(1, { ...P, poll_first_s: 5 }), 30000);
});

test('session caps are derived: no fixed job or lane cap unless pacing sets one', (t) => {
  env(t);
  assert.deepEqual([jobCap({}).cap, jobCap({}).from], [20, 'default']);
  assert.deepEqual([jobCap({ pacing: { jobs: 4 } }).cap, jobCap({ pacing: { jobs: 4 } }).from], [4, 'pacing.jobs in process/config.json']);
  assert.equal(jobCap({ pacing: { jobs: 10 } }, { P3_JOB_CAP: '6' }).cap, 6);
  const files = { 'process/config.json': { lanes: [{ name: 'ux', dir: 'design/ux' }, { name: 'pub', dir: 'design/pub' }] }, 'design/ux/README.md': 'x\n', 'design/pub/README.md': 'x\n' };
  const { root } = withOrigin(files);
  laneStart(root, 'ux', { slug: 'o/p', log: quiet });
  laneStart(root, 'pub', { slug: 'o/p', log: quiet });
  const one = withOrigin({ ...files, 'process/config.json': { ...files['process/config.json'], pacing: { lanes: 1 } } });
  laneStart(one.root, 'ux', { slug: 'o/p', log: quiet });
  assert.throws(() => laneStart(one.root, 'pub', { slug: 'o/p', log: quiet }), /the lane cap is full: 1 lane session\(s\) live \(lane ux pending\) of pacing\.lanes 1/);
});

test('each call is costed: REST points (a read 1, a write 5) and content-creating requests', () => {
  assert.deepEqual(classify(['api', 'repos/o/p/pulls/1']), { points: 1, content: false, actions: false, primary: true });
  assert.deepEqual(classify(['api', '-X', 'POST', 'repos/o/p/issues/1/comments', '-f', 'body=x']).points, 5);
  assert.equal(classify(['api', 'repos/o/p/issues/1/comments', '-f', 'body=x']).content, true, 'fields without a method are a POST');
  assert.equal(classify(['api', 'repos/o/p/pulls/1', '--method', 'GET', '-f', 'x=1']).content, false);
  assert.equal(classify(['api', 'graphql', '-f', 'query=mutation { x }']).content, true);
  assert.equal(classify(['api', 'graphql', '-f', 'query={ viewer { login } }']).content, false);
  assert.equal(classify(['api', 'rate_limit']).primary, false, 'rate_limit is free against the primary limit');
  for (const v of ['create', 'edit', 'merge', 'comment', 'review', 'ready']) assert.equal(classify(['pr', v, '1']).content, true, v);
  for (const v of ['view', 'list', 'checks', 'diff']) assert.equal(classify(['pr', v, '1']).content, false, v);
  assert.deepEqual([classify(['workflow', 'run', 'x.yml']).content, classify(['workflow', 'run', 'x.yml']).actions], [true, true]);
});

test('each window waits at the target, account-wide: this clone\'s log and the other sessions\' shared rows', (t) => {
  const f = logFile();
  env(t, { P3_GITHUB_LOG: f, CLAUDE_CODE_SESSION_ID: 'cse_me' });
  const root = makeRepo({ 'README.md': 'x\n' });
  const c = clock();
  // 85% of 80 content-creating requests a minute is 68: 40 by another session, 28 by this one.
  const minute = new Date(c.t - 30e3).toISOString().replace(/\.\d+Z$/, 'Z').replace(/:\d\dZ$/, ':00Z');
  useShared({ read: () => ({ pause: null, use: [{ session: 'cse_other', minute, calls: 40, points: 200, content: 40, pushes: 0 }] }), pause: () => {} });
  for (let i = 0; i < 28; i++) ghTurn(['pr', 'comment', '1', '-b', 'x'], root, { p: P, now: c.now, sleep: c.sleep });
  assert.deepEqual(c.slept, [], 'up to the target, no wait');
  ghTurn(['pr', 'view', '1'], root, { p: P, now: c.now, sleep: c.sleep });
  assert.deepEqual(c.slept, [], 'a read is not content-creating');
  ghTurn(['pr', 'comment', '1', '-b', 'x'], root, { p: P, now: c.now, sleep: c.sleep });
  assert.equal(c.slept.length, 1, 'the 69th waits for the window');
  assert.ok(c.slept[0] > 0 && c.slept[0] <= 61e3, String(c.slept[0]));
  // The primary limit, from GitHub's own count: at 85% of 5,000 it waits for the reset.
  const c2 = clock(c.t + 3700e3);
  const reset = c2.t + 300e3;
  ghTurn(['api', 'user'], root, { p: P, now: c2.now, sleep: c2.sleep, rateLimit: () => ({ limit: 5000, remaining: 740, reset }) });
  assert.deepEqual(c2.slept, [300e3]);
  // A wait longer than 15 minutes is refused, never slept through.
  const c3 = clock(c2.t + 120e3);
  assert.throws(() => ghTurn(['api', 'user'], makeRepo({ 'a.md': 'x\n' }), { p: P, now: c3.now, sleep: c3.sleep, rateLimit: () => ({ limit: 5000, remaining: 10, reset: c3.t + 3000e3 }) }), (e) => e instanceof Paced && /run this again then/.test(e.message));
});

test('a 403 with Retry-After pauses every session until it passes, never a retry inside it; a second refusal within an hour stops the tool until the coordinator resumes it', (t) => {
  const f = logFile();
  env(t, { P3_GITHUB_LOG: f, CLAUDE_CODE_SESSION_ID: 'cse_a' });
  // Two sessions, two clones of one product, one origin.
  const { root: a, bare } = withOrigin({ 'process/config.json': {} });
  const b = join(mkdtempSync(join(tmpdir(), 'p3-clone-')), 'b');
  git(['clone', '-q', bare, b], { cwd: a });
  const cfg = configOf({});
  const c = clock();
  const sharedA = stateShare(a, cfg, { now: c.now });
  const sharedB = stateShare(b, cfg, { now: c.now });
  assert.deepEqual(limitSignal('gh: You have exceeded a secondary rate limit. (HTTP 403)\nRetry-After: 120'), { kind: 'secondary', retryAfter: 120, reset: null });
  assert.equal(limitSignal('HTTP 404: Not Found'), null);
  assert.equal(limitSignal('HTTP 403: Resource not accessible by integration'), null, 'a permission 403 is no rate limit');
  // Session A is refused.
  useShared(sharedA);
  const rec = ghAfter(['pr', 'comment'], { code: 1, stderr: 'gh: You have exceeded a secondary rate limit. (HTTP 403)\nRetry-After: 120' }, a, { now: c.now });
  assert.equal(rec.until, new Date(c.t + 120e3).toISOString().replace(/\.\d+Z$/, 'Z'));
  assert.equal(JSON.parse(git(['show', `process-state:${PAUSE_FILE}`], { cwd: bare })).stopped, false, 'written to origin at once');
  // Session B's next call waits the pause out before it calls; nothing sooner.
  process.env.CLAUDE_CODE_SESSION_ID = 'cse_b';
  useShared(sharedB);
  ghTurn(['pr', 'view', '1'], b, { p: P, now: c.now, sleep: c.sleep });
  assert.deepEqual(c.slept, [120e3]);
  assert.match(budgetGate(b, { p: P, now: c.t - 1 }) || '', /rate-limited this account until/);
  // A second refusal within the hour, by session B: every GitHub call stops.
  ghAfter(['api', 'repos/o/p'], { code: 1, stderr: 'HTTP 429: Too Many Requests' }, b, { now: c.now });
  process.env.CLAUDE_CODE_SESSION_ID = 'cse_a';
  useShared(stateShare(a, cfg, { now: c.now }));
  assert.throws(() => ghTurn(['pr', 'view', '1'], a, { p: P, now: c.now, sleep: c.sleep }), (e) => e instanceof Paced && /twice within an hour.*Tell the coordinator.*github resume/.test(e.message));
  assert.match(budgetGate(a, { p: P, now: c.t }) || '', /stopped until the coordinator runs github resume/);
  // The coordinator resumes it.
  stateShare(a, cfg, { now: c.now }).resume('session_coord');
  useShared(stateShare(b, cfg, { now: c.now }));
  ghTurn(['pr', 'view', '1'], b, { p: P, now: c.now, sleep: c.sleep });
  assert.equal(c.slept.length, 1);
});

test('github budget: use against each published limit, per window, as a percentage, account-wide; usage rows shared with the command\'s push', (t) => {
  const f = logFile();
  env(t, { P3_GITHUB_LOG: f, CLAUDE_CODE_SESSION_ID: 'cse_me' });
  const { root, bare } = withOrigin({ 'process/config.json': {} });
  const c = clock(Date.now());
  for (let i = 0; i < 4; i++) ghTurn(['pr', 'comment', '1'], root, { p: P, now: c.now, sleep: c.sleep });
  ghTurn(['pr', 'view', '1'], root, { p: P, now: c.now, sleep: c.sleep });
  pushSeen(['push', '-q', 'origin', 'HEAD:refs/heads/job/a'], root);
  assert.deepEqual(usageRows(root).map((r) => [r.calls, r.points, r.content]).reduce((s, x) => s.map((v, i) => v + x[i]), [0, 0, 0]), [5, 21, 4]);
  const cfg = configOf({});
  assert.ok(shareUsage(root, cfg, { force: true }) >= 1);
  assert.match(git(['ls-tree', '--name-only', 'process-state', 'github/use/'], { cwd: bare }), /github\/use\/cse_me\.jsonl/);
  assert.equal(shareUsage(root, cfg, {}), 0, 'nothing new since');
  // Another session's shared rows count; this one's own come from its log, never twice.
  useShared({ read: () => ({ pause: null, use: [{ session: 'cse_other', minute: new Date(c.t).toISOString().replace(/\.\d+Z$/, 'Z'), calls: 10, points: 50, content: 10, pushes: 2 }, { session: 'cse_me', minute: new Date(c.t).toISOString(), calls: 5, points: 21, content: 4, pushes: 1 }] }), pause: () => {} });
  const out = [];
  const r = githubBudget(root, { now: c.t, log: (l) => out.push(l), p: P, rateLimit: () => ({ limit: 5000, remaining: 4000, reset: c.t + 1800e3 }) });
  // Every push this clone made is in its log (the fixture's, the share's state push, job/a's).
  const mine = readFileSync(f, 'utf8').split('\n').filter((l) => l.includes('"kind":"push"')).length;
  assert.ok(mine >= 2);
  assert.deepEqual([r.minute.content, r.hour.content, r.hour.pushes], [14, 14, 2 + mine]);
  const text = out.join('\n');
  assert.match(text, /the target is 85% of GitHub's published limits \(https:\/\/docs\.github\.com\/en\/rest\/using-the-rest-api\/rate-limits-for-the-rest-api, read 2026-11-06\)/);
  assert.match(text, /- primary, an hour: 1000\/5000 \(20%\)/);
  assert.match(text, /- REST points, the last minute: 71\/900 \(8%\)/);
  assert.match(text, /- content-creating requests, the last minute: 14\/80 \(18%\)/);
  assert.match(text, /- content-creating requests, the last hour: 14\/500 \(3%\)/);
  assert.match(text, /cse_other: 10 gh call\(s\), 10 content-creating, 2 push\(es\)/);
  assert.match(text, /no pause/);
  // A new session waits while the hour's content use is at target.
  useShared({ read: () => ({ pause: null, use: [{ session: 'cse_other', minute: new Date(c.t).toISOString(), calls: 430, points: 2150, content: 430, pushes: 0 }] }), pause: () => {} });
  assert.match(budgetGate(root, { p: P, now: c.t }) || '', /content-creating requests an hour used account-wide, the target 85%: a new session waits/);
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
  assert.equal(pushes, 1, 'the flush reads origin\'s tip first: one push for both writes');
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

test('coalesced writes survive another process resetting the clone\'s ref, a kill before the flush, and a refused flush keeps only its own', (t) => {
  const { root, bare } = withOrigin({ 'README.md': 'x\n' });
  const SB = 'process-state';
  writeState(root, SB, 'seed', (wt) => { writeFileSync(join(wt, 'seed.txt'), 's\n'); return {}; });
  stateIO.wait = 1;
  stateBatch(true);
  t.after(() => { stateBatch(false); stateIO.push = null; stateIO.wait = null; });
  const put = (f, v) => (wt) => { writeFileSync(join(wt, f), v); return {}; };
  // Another p3 process in this clone fetches over the ref (cold review of R17: the write was lost).
  writeState(root, SB, 'mine', put('mine.txt', 'm\n'));
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.equal(readState(root, SB, 'mine.txt'), null);
  writeState(root, SB, 'mine too', put('too.txt', 't\n'));
  assert.equal(readState(root, SB, 'mine.txt'), 'm\n', 'a later write makes the earlier one again');
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.equal(flushState(), 2);
  assert.deepEqual([git(['show', `${SB}:mine.txt`], { cwd: bare }), git(['show', `${SB}:too.txt`], { cwd: bare })], ['m', 't']);
  assert.equal(git(['for-each-ref', 'refs/p3/pending/'], { cwd: root }), '', 'pushed: nothing kept');
  // A command killed before its flush: its kept write is moved for replay by the next command.
  git(['update-ref', 'refs/p3/pending/999999/0000', git(['rev-parse', `refs/remotes/origin/${SB}`], { cwd: root })], { cwd: root });
  assert.equal(strandedWrites(root, { alive: () => false }), 1);
  assert.match(git(['for-each-ref', '--format=%(refname)', 'refs/p3/unpushed/'], { cwd: root }), /^refs\/p3\/unpushed\/\d+-999999-0000-[0-9a-f]{7}$/);
  git(['update-ref', '-d', git(['for-each-ref', '--format=%(refname)', 'refs/p3/unpushed/'], { cwd: root })], { cwd: root });
  // Refused to the end: only this command's own write is kept, never another writer's commit.
  stateIO.push = () => ({ code: 1, stdout: '', stderr: 'remote: fatal error in commit_refs' });
  writeState(root, SB, 'refused', put('r.txt', 'r\n'));
  assert.throws(() => flushState(), /This command's 1 state write\(s\) are kept: replay them with `node \.process\/tool\/p3\.mjs state replay`/);
  const kept = git(['for-each-ref', '--format=%(refname) %(subject)', 'refs/p3/unpushed/'], { cwd: root }).split('\n').filter(Boolean);
  assert.deepEqual(kept.map((l) => l.split(' ').slice(1).join(' ')), ['refused']);
});
