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
import { budgetGate, classify, ghAfter, ghTurn, usage, githubBudget, GITHUB_LIMITS, limitSignal, localPause, nextPause, Paced, pacing, pacingProblem, pollMs, primaryState, pushSeen, PACING_DEFAULTS, usageRows, useShared } from '../lib/pace.mjs';
import { PAUSE_FILE, shareUsage, stateShare } from '../lib/ghshare.mjs';
import { fetchState, flushState, pendingWrites, readState, stateBatch, stateIO, stateReplay, strandedWrites, writeState } from '../lib/state.mjs';
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
  assert.deepEqual(classify(['api', 'repos/o/p/pulls/1']), { points: 1, content: false, actions: false, primary: true, graphql: false });
  assert.equal(classify(['pr', 'view', '1']).graphql, true, 'gh pr commands are GraphQL requests');
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
  assert.throws(() => ghTurn(['api', 'user'], makeRepo({ 'a.md': 'x\n' }), { p: P, now: c3.now, sleep: c3.sleep, rateLimit: () => ({ limit: 5000, remaining: 10, reset: c3.t + 3000e3 }) }), (e) => e instanceof Paced && /acts on GitHub wait until .* then rerun .*; what this command did before the refusal stands/.test(e.message));
});

test('a 403 with Retry-After pauses every session until it passes, never a retry inside it; a second refusal within an hour stops the tool until the coordinator resumes it', (t) => {
  const f = logFile();
  env(t, { P3_GITHUB_LOG: f, CLAUDE_CODE_SESSION_ID: 'cse_a' });
  // Two sessions, two clones of one product, one origin.
  const { root: a, bare } = withOrigin({ 'process/config.json': {} });
  const b = join(mkdtempSync(join(tmpdir(), 'p3-clone-')), 'b');
  git(['clone', '-q', bare, b], { cwd: a });
  // A clone with a git identity, as every session's has: without one (CI has no global identity)
  // its state write fails, and its refusal stays in its own clone (ci of PR 205, node 22).
  git(['config', 'user.email', 'noreply@github.com'], { cwd: b });
  git(['config', 'user.name', 'Test'], { cwd: b });
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
  const second = ghAfter(['api', 'repos/o/p'], { code: 1, stderr: 'HTTP 429: Too Many Requests' }, b, { now: c.now });
  assert.deepEqual([second.unshared, second.stopped], [undefined, true], 'shared with the account, and a stop');
  process.env.CLAUDE_CODE_SESSION_ID = 'cse_a';
  useShared(stateShare(a, cfg, { now: c.now }));
  assert.throws(() => ghTurn(['pr', 'view', '1'], a, { p: P, now: c.now, sleep: c.sleep }), (e) => e instanceof Paced && /^GitHub budget: GitHub refused this account again within an hour of an earlier refusal.*Tell the coordinator.*github resume/.test(e.message));
  assert.match(budgetGate(a, { p: P, now: c.t }) || '', /stopped until the coordinator runs github resume/);
  // The coordinator resumes it.
  stateShare(a, cfg, { now: c.now }).resume('session_coord');
  useShared(stateShare(b, cfg, { now: c.now }));
  ghTurn(['pr', 'view', '1'], b, { p: P, now: c.now, sleep: c.sleep });
  assert.equal(c.slept.length, 1);
});

test('a burst of refusals across sessions lengthens one pause, never stops the tool; a pause the state branch refuses is still obeyed by its clone', (t) => {
  const f = logFile();
  env(t, { P3_GITHUB_LOG: f, CLAUDE_CODE_SESSION_ID: 'cse_a' });
  const t0 = Date.parse('2026-11-06T22:00:00Z');
  const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
  const first = nextPause(null, { at: iso(t0), until: iso(t0 + 60e3), why: 'x' }, t0);
  // B's call was in flight: refused 5 s later, while A's pause runs.
  const burst = nextPause(first, { at: iso(t0 + 5e3), until: iso(t0 + 125e3), why: 'y' }, t0 + 5e3);
  assert.deepEqual([burst.stopped, burst.at, burst.until, burst.also], [false, iso(t0), iso(t0 + 125e3), 1]);
  // After the pause ended, within the hour: a second refusal stops the tool.
  assert.equal(nextPause(burst, { at: iso(t0 + 600e3), until: iso(t0 + 660e3), why: 'z' }, t0 + 600e3).stopped, true);
  // Past the hour: a fresh first refusal.
  assert.equal(nextPause(burst, { at: iso(t0 + 4000e3), until: iso(t0 + 4060e3), why: 'z' }, t0 + 4000e3).stopped, false);
  // The shared store refuses the write: the refused clone obeys its own record anyway.
  const root = makeRepo({ 'README.md': 'x\n' });
  useShared({ read: () => ({ pause: null, use: [] }), pause: () => { throw new Error('the push of process-state failed: HTTP 403'); } });
  const c = clock(t0);
  const r = ghAfter(['pr', 'comment'], { code: 1, stderr: 'HTTP 403: You have exceeded a secondary rate limit' }, root, { now: c.now });
  assert.match(r.unshared, /HTTP 403/);
  assert.equal(localPause(root).until, iso(t0 + 60e3), 'at least one minute, as GitHub\'s docs say');
  ghTurn(['pr', 'view', '1'], root, { p: P, now: c.now, sleep: c.sleep });
  assert.deepEqual(c.slept, [60e3]);
  // A refusal is read from gh's stderr only: a check named "rate limit" in stdout is no refusal.
  assert.equal(ghAfter(['pr', 'checks'], { code: 1, stdout: 'rate limit test\tfail', stderr: 'some checks failed' }, root, { now: c.now }), null);
});

test('a --paginate call logs one request a page; a failing rate_limit read is not repeated within the minute; GraphQL calls check GraphQL\'s own budget', (t) => {
  const f = logFile();
  env(t, { P3_GITHUB_LOG: f, CLAUDE_CODE_SESSION_ID: 'cse_a' });
  const root = makeRepo({ 'README.md': 'x\n' });
  ghAfter(['api', '--paginate', 'repos/o/p/pulls?state=all&per_page=100'], { code: 0, stdout: JSON.stringify(Array.from({ length: 250 }, (_, i) => i)) }, root);
  ghAfter(['api', '--paginate', '--slurp', 'repos/o/p/pulls/1/files?per_page=100'], { code: 0, stdout: JSON.stringify([[1], [2], [3], [4]]) }, root);
  const pages = readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).map((r) => r.points);
  assert.deepEqual(pages, [2, 3]);
  let reads = 0;
  const failing = () => { reads++; return null; };
  const t0 = Date.parse('2026-11-06T22:00:00Z');
  assert.equal(primaryState(root, { t: t0, read: failing }), null);
  assert.equal(primaryState(root, { t: t0 + 30e3, read: failing }), null);
  assert.equal(reads, 1, 'remembered for the minute');
  // REST has room; GraphQL is at 90%: a gh pr command waits for GraphQL's reset, a REST call does not.
  const c = clock(t0 + 120e3);
  const [coreReset, gqlReset] = [c.t + 600e3, c.t + 300e3];
  const rl = () => (c.t < gqlReset ? { limit: 5000, remaining: 4000, reset: coreReset, graphql: { limit: 5000, remaining: 500, reset: gqlReset } } : { limit: 5000, remaining: 4000, reset: coreReset, graphql: { limit: 5000, remaining: 5000, reset: gqlReset + 3600e3 } });
  ghTurn(['api', 'repos/o/p'], root, { p: P, now: c.now, sleep: c.sleep, rateLimit: rl });
  assert.deepEqual(c.slept, []);
  ghTurn(['pr', 'view', '1'], root, { p: P, now: c.now, sleep: c.sleep, rateLimit: rl });
  assert.deepEqual(c.slept, [300e3]);
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
  // Another session's shared rows count; this clone's own come from its log, never twice.
  // R17e: the read holds this clone's share (its at after the share's), so the log adds nothing.
  const readAt = Date.now();
  const sharedPushes = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.kind === 'push' && Date.parse(r.at) <= lastShared(root)).length;
  useShared({ read: () => ({ at: readAt, pause: null, use: [{ session: 'cse_other', minute: new Date(c.t).toISOString().replace(/\.\d+Z$/, 'Z'), calls: 10, points: 50, content: 10, pushes: 2 }, { session: 'cse_me', clone: cloneId(root), minute: new Date(c.t).toISOString(), calls: 5, points: 21, content: 4, pushes: sharedPushes }] }), pause: () => {} });
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
  assert.match(text, /- pushes, the last hour: \d+\/120 \(\d+%\) of the process's own ceiling \(PD-3; GitHub publishes none/);
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

// R17b (coordinator's rulings, 6 Nov): pushes and connector writes in the ledger, one ledger per
// account (process3's clones use the product's), and the process's own push ceiling (PD-3).
import { cloneId, exempt, lastShared, noteShare, noteTurn, pushTurn } from '../lib/pace.mjs';
import { ledgerOf, USE_DIR } from '../lib/ghshare.mjs';

test('every push waits for the account\'s push ceiling (PD-3, 120 an hour), the tool\'s own included', (t) => {
  const f = logFile();
  env(t, { P3_GITHUB_LOG: f, CLAUDE_CODE_SESSION_ID: 'cse_me' });
  assert.equal(configOf({}).pacing.pushes_per_hour, 120);
  assert.match(pacingProblem({ pushes_per_hour: 0 }), /pushes_per_hour is a whole number, 1 or more/);
  const root = makeRepo({ 'README.md': 'x\n' });
  const c = clock();
  // 119 pushes by another session 50 minutes ago: the hour's window frees them within 15 minutes.
  const minute = new Date(c.t - 3000e3).toISOString().replace(/\.\d+Z$/, 'Z');
  useShared({ read: () => ({ pause: null, use: [{ session: 'cse_other', minute, calls: 0, points: 0, content: 0, pushes: 119 }] }), pause: () => null });
  pushTurn(['push', '-q', 'origin', 'HEAD:refs/heads/job/a'], root, { p: P, now: c.now, sleep: c.sleep });
  assert.deepEqual(c.slept, [], 'the 120th fits');
  pushTurn(['push', '-q', 'origin', 'HEAD:refs/heads/job/a'], root, { p: P, now: c.now, sleep: c.sleep });
  assert.equal(c.slept.length, 1, 'the 121st waits for the hour\'s window');
  assert.ok(c.slept[0] > 0 && c.slept[0] <= 11 * 60e3, String(c.slept[0]));
  assert.equal(pushTurn(['push', '--dry-run', 'origin', 'HEAD'], root, { p: P, now: c.now, sleep: c.sleep }), null, 'a dry run is no push');
  // A stopped account: the tool's own push (git()) is refused with the budget's words...
  useShared({ read: () => ({ pause: { at: '2026-11-06T21:00:00Z', until: '2026-11-06T21:01:00Z', why: 'secondary rate limit', stopped: true }, use: [] }), pause: () => null });
  assert.throws(() => git(['push', '-q', 'origin', 'HEAD:refs/heads/x'], { cwd: root }), /GitHub budget: GitHub refused this account again/);
  // ...and only the ledger's own writes (exempt) pass, logged.
  const before = readFileSync(f, 'utf8').split('\n').filter((l) => l.includes('"kind":"push"')).length;
  exempt(() => pushTurn(['push', '-q', 'origin', 'HEAD:refs/heads/process-state'], root, { p: P, now: c.now, sleep: c.sleep }));
  assert.equal(readFileSync(f, 'utf8').split('\n').filter((l) => l.includes('"kind":"push"')).length, before + 1);
});

test('at the push ceiling a state write is held and kept for replay, never dropped; the ledger\'s pause write passes (coordinator, PR 206)', (t) => {
  const f = logFile();
  env(t, { P3_GITHUB_LOG: f, CLAUDE_CODE_SESSION_ID: 'cse_me' });
  const { root, bare } = withOrigin({ 'process/config.json': {} });
  const cfg = configOf({});
  writeState(root, 'process-state', 'seed', (wt) => { writeFileSync(join(wt, 'seed.txt'), 's\n'); return {}; });
  // 120 pushes by another session in the last minute: the window frees none within 15 minutes.
  const full = { pause: null, use: [{ session: 'cse_other', clone: 'elsewhere', minute: new Date(Date.now() - 30e3).toISOString(), calls: 0, points: 0, content: 0, pushes: 120 }] };
  const real = stateShare(root, cfg);
  useShared({ read: () => full, pause: real.pause, resume: real.resume });
  assert.throws(() => writeState(root, 'process-state', 'held', (wt) => { writeFileSync(join(wt, 'held.txt'), 'h\n'); return {}; }),
    /\d+ of the 120 pushes an hour.*the ceiling \(120\).*The write is kept: replay it with `node \.process\/tool\/p3\.mjs state replay refs\/p3\/unpushed\//s);
  assert.equal(git(['show', 'process-state:held.txt'], { cwd: bare, allowFail: true }).code, 128, 'not pushed');
  const kept = git(['for-each-ref', '--format=%(refname)', 'refs/p3/unpushed/'], { cwd: root }).split('\n').filter(Boolean);
  assert.equal(kept.length, 1);
  assert.equal(git(['show', `${kept[0]}:held.txt`], { cwd: root }), 'h', 'the write survives');
  // A coalesced command's writes the same: kept, named for replay.
  stateBatch(true);
  t.after(() => stateBatch(false));
  writeState(root, 'process-state', 'coalesced', (wt) => { writeFileSync(join(wt, 'c.txt'), 'c\n'); return {}; });
  assert.throws(() => flushState(), /This command's 1 state write\(s\) are kept: replay them/);
  stateBatch(false);
  assert.equal(git(['for-each-ref', '--format=%(subject)', 'refs/p3/unpushed/'], { cwd: root }).split('\n').filter(Boolean).sort().join(','), 'coalesced,held');
  // The ledger's own pause write goes through at the ceiling.
  const rec = ghAfter(['pr', 'comment'], { code: 1, stderr: 'HTTP 403: You have exceeded a secondary rate limit' }, root);
  assert.equal(rec.unshared, undefined);
  assert.equal(JSON.parse(git(['show', `process-state:${PAUSE_FILE}`], { cwd: bare })).stopped, false);
  // Once there is room, the kept writes replay.
  useShared(null);
  stateReplay(root, 'process-state', [], { log: () => {} });
  assert.equal(git(['show', 'process-state:held.txt'], { cwd: bare }), 'h');
  assert.equal(git(['show', 'process-state:c.txt'], { cwd: bare }), 'c');
});

test('github note: a session\'s connector writes are reserved and logged before it makes them, waiting at the content target', (t) => {
  const f = logFile();
  env(t, { P3_GITHUB_LOG: f, CLAUDE_CODE_SESSION_ID: 'cse_me' });
  const root = makeRepo({ 'README.md': 'x\n' });
  const c = clock();
  useShared(null);
  noteTurn(root, { content: 3, what: 'PR create, comment, ready' }, { p: P, now: c.now, sleep: c.sleep });
  const row = JSON.parse(readFileSync(f, 'utf8').trim().split('\n').pop());
  assert.deepEqual([row.kind, row.content, row.points, row.note, row.what], ['gh', 3, 15, true, 'note: PR create, comment, ready']);
  assert.throws(() => noteTurn(root, { content: -1 }, { p: P, now: c.now, sleep: c.sleep }), /github note --content <n>/);
  // 85% of 80 a minute is 68: 3 noted, 65 more fit, the next waits.
  noteTurn(root, { content: 65 }, { p: P, now: c.now, sleep: c.sleep });
  assert.deepEqual(c.slept, []);
  noteTurn(root, { content: 1 }, { p: P, now: c.now, sleep: c.sleep });
  assert.equal(c.slept.length, 1);
});

test('one ledger per account: a process3 clone reads and writes the product\'s state branch; its pause and use are every session\'s', (t) => {
  const f = logFile();
  env(t, { P3_GITHUB_LOG: f, CLAUDE_CODE_SESSION_ID: 'cse_p3' });
  // The product, with its state branch on its origin; process3's clone names it in pacing.json.
  const { root: product, bare } = withOrigin({ 'process/config.json': {} });
  writeState(product, 'process-state', 'seed', (wt) => { writeFileSync(join(wt, 'seed.txt'), 's\n'); return {}; });
  const p3 = makeRepo({ 'pacing.json': JSON.stringify({ ledger: 'neobobkrause/civicsmith-copy' }) });
  assert.deepEqual(ledgerOf(p3, null), { own: false, name: 'neobobkrause/civicsmith-copy', url: 'https://github.com/neobobkrause/civicsmith-copy.git' });
  assert.deepEqual(ledgerOf(product, configOf({})), { own: true });
  // A product whose config names none takes the pinned process3's (cold review of R17b: probes'
  // config named none and would have kept a ledger of its own).
  const pinned = makeRepo({ 'pacing.json': JSON.stringify({ ledger: 'neobobkrause/civicsmith-copy' }) });
  assert.equal(ledgerOf(product, configOf({}), { processRoot: pinned }).url, 'https://github.com/neobobkrause/civicsmith-copy.git');
  assert.equal(ledgerOf(product, configOf({ pacing: { ledger: 'o/elsewhere' } }), { processRoot: pinned }).name, 'o/elsewhere', 'the config\'s own wins');
  assert.equal(ledgerOf(makeRepo({ 'a.md': 'x\n' }), null), null, 'no config and no pacing.json: no ledger');
  assert.match(pacingProblem({ ledger: 'not a repo' }), /pacing\.ledger is "<owner>\/<repo>"/);
  const c = clock(Date.now());
  const p3Share = stateShare(p3, null, { now: c.now, url: bare });
  // The process3 session is refused: the pause goes onto the product's ledger.
  useShared(p3Share);
  ghAfter(['pr', 'comment'], { code: 1, stderr: 'HTTP 403: You have exceeded a secondary rate limit\nRetry-After: 90' }, p3, { now: c.now });
  assert.equal(JSON.parse(git(['show', `process-state:${PAUSE_FILE}`], { cwd: bare })).session, 'cse_p3');
  // A product session sees it before its next call.
  process.env.CLAUDE_CODE_SESSION_ID = 'cse_product';
  useShared(stateShare(product, configOf({}), { now: c.now }));
  ghTurn(['pr', 'view', '1'], product, { p: P, now: c.now, sleep: c.sleep });
  assert.ok(c.slept.length === 1 && c.slept[0] > 89e3 && c.slept[0] <= 90e3, String(c.slept)); // the pause is kept to the second
  // The process3 clone's use is shared onto the product's ledger.
  process.env.CLAUDE_CODE_SESSION_ID = 'cse_p3';
  ghTurn(['api', 'repos/o/p'], p3, { p: P, now: c.now, sleep: c.sleep });
  // The share is gated and never waits: refused while the account is paused, shared after.
  assert.throws(() => stateShare(p3, null, { now: () => c.t + 400e3, url: bare }).shareNow(), /GitHub budget: GitHub rate-limited this account.*not now; tried again later/);
  stateShare(product, configOf({})).resume('session_coord');
  assert.ok(stateShare(p3, null, { now: () => c.t + 400e3, url: bare }).shareNow() >= 1, 'shared once share_s has passed and the pause is lifted');
  assert.match(git(['ls-tree', '--name-only', 'process-state', `${USE_DIR}/`], { cwd: bare }), /github\/use\/cse_p3\.jsonl/);
});

test('p3 github push refuses a force or a delete; pushes as given otherwise', async (t) => {
  env(t);
  const { root, bare } = withOrigin({ 'README.md': 'x\n' });
  const { main } = await import('../p3.mjs');
  const cwd = process.cwd();
  const [log, err] = [console.log, console.error];
  const errs = [];
  console.log = () => {};
  console.error = (m) => errs.push(String(m));
  try {
    process.chdir(root);
    assert.equal(await main(['github', 'push', 'origin', '+HEAD:refs/heads/main']), 1);
    assert.equal(await main(['github', 'push', 'origin', ':refs/heads/tranche']), 1);
    assert.equal(await main(['github', 'push', 'origin', 'HEAD:refs/heads/x', '--force']), 1);
    assert.equal(await main(['github', 'push', 'origin', 'HEAD:refs/heads/side', '--quiet']), 0);
  } finally { process.chdir(cwd); console.log = log; console.error = err; }
  assert.ok(errs.some((e) => /a refspec never starts with \+ \(a force\) or : \(a delete\)/.test(e)), errs.join('\n'));
  assert.ok(errs.some((e) => /never --force, --delete, --mirror or --all/.test(e)));
  assert.equal(git(['rev-parse', 'side'], { cwd: bare }), git(['rev-parse', 'HEAD'], { cwd: root }));
  assert.equal(git(['rev-parse', 'tranche'], { cwd: bare }).length, 40, 'nothing deleted');
});

test('a session\'s use from another clone counts here; the share\'s own push is shared next time', (t) => {
  const f = logFile();
  env(t, { P3_GITHUB_LOG: f, CLAUDE_CODE_SESSION_ID: 'cse_same' });
  const here = makeRepo({ 'README.md': 'x\n' });
  const elsewhere = makeRepo({ 'README.md': 'y\n' });
  const t0 = Date.now();
  const minute = new Date(t0).toISOString();
  // The same session's 30 content-creating requests, made from its other clone.
  const others = [{ session: 'cse_same', clone: cloneId(elsewhere), minute, calls: 30, points: 150, content: 30, pushes: 0 }, { session: 'cse_same', clone: cloneId(here), minute, calls: 9, points: 9, content: 9, pushes: 0 }];
  // R17e (C10): every ledger row counts, this clone's own too; its log adds only the rows no share
  // in the read carried. Here its 9 were shared (at t0 - 500) before the read (at t0): 39, not 48.
  const mine = Array.from({ length: 9 }, () => ({ kind: 'gh', at: new Date(t0 - 1000).toISOString(), points: 1, content: 1 }));
  noteShare(here, t0 - 1000, t0 - 500);
  assert.equal(usage(here, { t: t0, seconds: 60, rows: mine, read: { use: others, at: t0 } }).content, 39, 'each row once');
  // A read from before the share lacks them: they count from the log.
  assert.equal(usage(here, { t: t0, seconds: 60, rows: mine, read: { use: others.slice(0, 1), at: t0 - 600 } }).content, 39);
  // The share: its own push (logged during the write) is in the next share.
  const { root, bare } = withOrigin({ 'process/config.json': {} });
  writeFileSync(f, '');
  ghTurn(['pr', 'comment', '1'], root, { p: P });
  const cfg = configOf({});
  assert.ok(shareUsage(root, cfg, { force: true }) >= 1);
  const pushed = readFileSync(f, 'utf8').split('\n').filter((l) => l.includes('"kind":"push"')).length;
  assert.ok(pushed >= 1, 'the share pushed, logged');
  assert.ok(shareUsage(root, cfg, { force: true }) >= 1, 'that push is shared next time');
  const rows = git(['show', `process-state:${USE_DIR}/cse_same.jsonl`], { cwd: bare }).split('\n').map((l) => JSON.parse(l));
  assert.ok(rows.reduce((n, r) => n + r.pushes, 0) >= 1);
});

test('github push names its refspec, refuses wildcards and main, and a remote whose config mirrors or forces', async (t) => {
  env(t);
  const { root } = withOrigin({ 'README.md': 'x\n' });
  const { main } = await import('../p3.mjs');
  const cwd = process.cwd();
  const [log, err] = [console.log, console.error];
  const errs = [];
  console.log = () => {};
  console.error = (m) => errs.push(String(m));
  try {
    process.chdir(root);
    assert.equal(await main(['github', 'push', 'origin']), 1);
    assert.equal(await main(['github', 'push', 'origin', 'refs/heads/*:refs/heads/*']), 1);
    assert.equal(await main(['github', 'push', 'origin', 'HEAD:main']), 1);
    assert.equal(await main(['github', 'push', '--quiet', 'origin', 'HEAD:refs/heads/q']), 1);
    git(['config', 'remote.origin.mirror', 'true'], { cwd: root });
    assert.equal(await main(['github', 'push', 'origin', 'HEAD:refs/heads/m']), 1);
  } finally { process.chdir(cwd); console.log = log; console.error = err; }
  const text = errs.join('\n');
  for (const re of [/name what to push/, /no wildcard refspec/, /never to main/, /the flags take no value; put them after the refspecs/, /remote\.origin\.mirror is set in this clone \(true\): it can force or delete/]) assert.match(text, re);
});
