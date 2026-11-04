// The lead times' findings from the review of PR 70's last fix pass (b33cbd9): each scenario
// below hid an "over" or invented one before its fix.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commit, makeRepo, onState } from './helpers.mjs';
import { fetchJobs, leadTimes, median } from '../lib/lead.mjs';
import { trancheReport } from '../lib/report.mjs';
import { readState } from '../lib/state.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { main } from '../p3.mjs';

const U = 'unmeasured';
const pick = ({ minutes, target, mark }) => ({ minutes, target, ...(mark ? { mark } : {}) });
const T0 = Date.parse('2026-11-01T00:00:00Z');
const t = (min) => new Date(T0 + min * 60000).toISOString();
const at = (min, fn) => { const e = { ...process.env }; process.env.GIT_COMMITTER_DATE = process.env.GIT_AUTHOR_DATE = t(min); try { return fn(); } finally { process.env = e; } };
const E = (id, state, more = {}) => ({ [`process/ledger/${id}.json`]: { id, status: { state, ...(state === 'BLOCKED' ? { reason: 'x' } : {}) }, ...more } });
const start = (m, min, attempt) => ({ at: t(min), module: m, row: 'attempt', event: 'start', ...(attempt ? { attempt } : {}) });
const complete = (m, min, pr, attempt) => ({ at: t(min), module: m, row: 'attempt', event: 'complete', pr, ...(attempt ? { attempt } : {}) });
const merge = (m, min, pr) => ({ at: t(min), module: m, row: 'merge', pr });
const opened = (min = 0) => [{ row: 'grant', tranche: 'tranche', at: t(min), outcome: 'ok' }];

function withOrigin() {
  const root = at(-100000, () => makeRepo({ 'README.md': 'x', 'CLAUDE.md': 'Bob\'s approvals\n', 'process/config.json': { tranche: 'tranche' } }));
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  return { root, bare };
}

// A job branch off the tranche: commits at the minutes given, pushed, then back on the tranche.
function onJob(root, id, steps, { from = 'tranche' } = {}) {
  git(['checkout', '-q', '-B', `job/${id}`, from], { cwd: root });
  for (const [min, files] of steps) at(min, () => commit(root, files, `${id} at ${min}`));
  git(['push', '-q', '-f', 'origin', `job/${id}`], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
}
const mergeJob = (root, id, min) => at(min, () => git(['merge', '-q', '--no-ff', `job/${id}`, '-m', `Merge job/${id}`], { cwd: root }));

async function cli(root, argv, env = {}) {
  const cwd = process.cwd();
  const old = { log: console.log, err: console.error, env: { ...process.env } };
  const lines = [];
  console.log = (...x) => lines.push(x.join(' '));
  console.error = (...x) => lines.push(x.join(' '));
  Object.assign(process.env, env);
  try { process.chdir(root); const code = await main(argv); return { code, out: lines.join('\n') }; } finally { process.chdir(cwd); console.log = old.log; console.error = old.err; process.env = old.env; }
}

test('finding 1: only this tranche counts: an old module and its BLOCKED time and messages from before the opening are left out', () => {
  const { root } = withOrigin();
  const cfg = loadConfig(root);
  // old: days ago, 300 min BLOCKED on the tranche, green 120 min before its merge, a message never answered.
  at(-5000, () => commit(root, E('old', 'BLOCKED'), 'old blocked'));
  at(-4700, () => commit(root, E('old', 'COMPLETE'), 'old done'));
  // a: now, quick.
  onJob(root, 'a', [[2, E('a', 'WORKING')]]);
  mergeJob(root, 'a', 12);
  const rows = [start('old', -5100), complete('old', -4900, 3), merge('old', -4680, 3), start('a', 1), complete('a', 5, 4), merge('a', 12, 4)];
  const gates = { 3: [{ ok: true, at: t(-4800) }], 4: [{ ok: true, at: t(6) }] };
  const lt = leadTimes(root, cfg, {
    ref: 'HEAD', rows, grants: opened(0), closed: [], restarts: [], jobRefs: new Map([['old', 'HEAD'], ['a', 'refs/remotes/origin/job/a']]), now: t(20),
    msgs: [{ from: 'old', n: 1, to: 'bob', at: t(-4950), text: 'stuck' }], comments: (pr) => gates[pr],
  });
  assert.deepEqual(lt.jobs.map((j) => j.module), ['a'], 'old started before the opening');
  assert.equal(lt.summary.green_to_merge.worst_mark, undefined);
  assert.equal(lt.summary.green_to_merge.worst, 6);
  assert.equal(lt.summary.replace, U, 'no stop in this tranche');
  assert.equal(lt.summary.report_wait, U, 'no message in this tranche');
  assert.equal(lt.jobs[0].report_wait, 'none');
  assert.deepEqual(lt.jobs[0].blocked, { minutes: 0 });
  // A module BLOCKED from before the opening into it counts from the opening only.
  at(-60, () => commit(root, E('b', 'BLOCKED'), 'b blocked before'));
  at(30, () => commit(root, E('b', 'WORKING'), 'b again'));
  const b = leadTimes(root, cfg, { ref: 'HEAD', rows: [start('b', 40)], grants: opened(0), jobRefs: new Map([['b', 'HEAD']]), now: t(50) });
  assert.deepEqual(b.jobs[0].blocked, { minutes: 30 });
  // The opening not read: nothing can be scoped, so every figure is unmeasured, never all of history.
  const none = leadTimes(root, cfg, { ref: 'HEAD', rows, now: t(20), comments: (pr) => gates[pr] });
  assert.equal(none.opened, U);
  assert.equal(none.jobs, U);
  assert.equal(none.summary.green_to_merge, U);
});

test('finding 2: each attempt is measured, and the job shows its worst; ready unknown is unmeasured, never the oldest start', () => {
  const { root } = withOrigin();
  const cfg = loadConfig(root);
  const rows = [start('m', 0, 1), complete('m', 10, 5, 1), merge('m', 12, 5), start('m', 100, 2), complete('m', 110, 6, 2), merge('m', 270, 6)];
  const gates = { 5: [{ ok: true, at: t(11) }], 6: [{ ok: true, at: t(111) }] };
  const lt = leadTimes(root, cfg, { ref: 'HEAD', rows, layers: new Map([['m', 2], ['n', 1]]), grants: opened(0), closed: [], now: t(300), comments: (pr) => gates[pr] });
  const m = lt.jobs[0];
  assert.deepEqual(m.green_to_merge, { minutes: 159, target: 15, mark: 'over', attempt: 2 });
  assert.deepEqual(m.attempts.map((a) => a.green_to_merge.minutes), [1, 159]);
  assert.deepEqual(m.start_to_pr_ready, { minutes: 10, attempt: 1 });
  // Layer 1 not closed: m's layer has not opened, so ready to start is unmeasured.
  assert.equal(m.ready_to_start, U);
  assert.equal(lt.summary.green_to_merge.worst_mark, 'over');
});

test('finding 3: an open figure counts in the worst, marked open, and stays out of the median', () => {
  const { root } = withOrigin();
  const cfg = loadConfig(root);
  const lt = leadTimes(root, cfg, { ref: 'HEAD', rows: [start('j', 0), complete('j', 5, 8)], grants: opened(0), now: t(300), comments: () => [{ ok: true, at: t(10) }] });
  assert.deepEqual(lt.jobs[0].green_to_merge, { minutes: 290, open: true, note: 'not merged', target: 15, mark: 'over', attempt: 1 });
  assert.deepEqual(lt.summary.green_to_merge, { n: 0, open: 1, median: U, worst: 290, worst_open: true, target: 15, worst_mark: 'over' });
  // Not green yet: no figure, and no gate row read: unmeasured.
  assert.equal(leadTimes(root, cfg, { ref: 'HEAD', rows: [start('j', 0), complete('j', 5, 8)], grants: opened(0), now: t(300), comments: () => [{ ok: false, at: t(10) }] }).jobs[0].green_to_merge, 'not green');
  assert.equal(leadTimes(root, cfg, { ref: 'HEAD', rows: [start('j', 0), complete('j', 5, 8)], grants: opened(0), now: t(300), comments: () => null }).jobs[0].green_to_merge, U);
});

test('finding 4: a tranche commit to the entry does not end a BLOCKED still running on the job branch', () => {
  const { root } = withOrigin();
  const cfg = loadConfig(root);
  at(-10, () => commit(root, E('x', 'WORKING'), 'x working'));
  onJob(root, 'x', [[20, E('x', 'BLOCKED')]]);
  at(40, () => commit(root, E('x', 'WORKING', { checks: ['bob edited'] }), 'BOB edits x checks'));
  onJob(root, 'x', [[100, E('x', 'WORKING')]], { from: 'job/x' });
  mergeJob(root, 'x', 120);
  // After the merge the tranche's history governs: BLOCKED there from 150 to 170.
  at(150, () => commit(root, E('x', 'BLOCKED'), 'x blocked on tranche'));
  at(170, () => commit(root, E('x', 'COMPLETE'), 'x done'));
  const lt = leadTimes(root, cfg, { ref: 'HEAD', rows: [start('x', 0), complete('x', 110, 9), merge('x', 120, 9)], grants: opened(0), restarts: [], jobRefs: new Map([['x', 'refs/remotes/origin/job/x']]), now: t(200) });
  assert.deepEqual(lt.jobs[0].blocked, { minutes: 100 });
  assert.deepEqual(lt.jobs[0].replace.map((r) => [r.from, r.minutes]), [[t(20), 80], [t(150), 20]]);
});

test('finding 5: no job ref, a shallow clone and a stale ref read unmeasured or are fetched fresh, never 0 or open', async () => {
  const { root, bare } = withOrigin();
  const cfg = loadConfig(root);
  at(-10, () => commit(root, E('x', 'WORKING'), 'x working'));
  onJob(root, 'x', [[20, E('x', 'BLOCKED')], [60, E('x', 'WORKING')]]);
  mergeJob(root, 'x', 80);
  const rows = [start('x', 0), complete('x', 70, 9), merge('x', 80, 9)];
  at(81, () => commit(root, { 'process/metrics/x.jsonl': rows.map((r) => JSON.stringify(r)).join('\n') + '\n' }, 'rows'));
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  onState(root, { 'metrics/tranche-open.jsonl': JSON.stringify(opened(0)[0]) + '\n' });
  git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
  const base = { ref: 'HEAD', rows, grants: opened(0), restarts: [], now: t(100) };
  // No job ref (origin has none, or unread): unmeasured, not 0.
  assert.equal(leadTimes(root, cfg, { ...base, jobRefs: new Map([['x', null]]) }).jobs[0].blocked, U);
  assert.equal(leadTimes(root, cfg, base).jobs[0].blocked, U);
  assert.deepEqual(leadTimes(root, cfg, { ...base, jobRefs: new Map([['x', 'refs/remotes/origin/job/x']]) }).jobs[0].blocked, { minutes: 40 });
  // A stale ref: local origin/job/x still at the BLOCKED commit, origin's moved on. fetchJobs reads it fresh.
  git(['update-ref', 'refs/remotes/origin/job/x', 'job/x~1'], { cwd: root });
  assert.equal(leadTimes(root, cfg, { ...base, rows: [start('x', 0)], jobRefs: new Map([['x', 'refs/remotes/origin/job/x']]) }).jobs[0].blocked.open, true, 'the scenario: a stale ref keeps it open');
  const refs = fetchJobs(root, ['x', 'gone']);
  assert.deepEqual([...refs], [['gone', null], ['x', 'refs/remotes/origin/job/x']]);
  assert.deepEqual(leadTimes(root, cfg, { ...base, rows: [start('x', 0)], jobRefs: refs }).jobs[0].blocked, { minutes: 40 });
  // A local ref origin no longer has stands for nothing.
  git(['update-ref', 'refs/remotes/origin/job/gone', 'job/x~1'], { cwd: root });
  assert.equal(fetchJobs(root, ['gone']).get('gone'), null);
  // A shallow clone: the entry's history cut after the opening reads unmeasured, never 0 ...
  const clone = join(mkdtempSync(join(tmpdir(), 'p3-shallow-')), 'c');
  git(['clone', '-q', '--depth', '1', '--no-single-branch', '--branch', 'tranche', `file://${bare}`, clone], { cwd: root });
  git(['config', 'user.email', 'noreply@github.com'], { cwd: clone });
  git(['config', 'user.name', 'Test'], { cwd: clone });
  assert.equal(leadTimes(clone, cfg, { ...base, ref: 'origin/tranche', jobRefs: new Map([['x', 'refs/remotes/origin/job/x']]) }).jobs[0].blocked, U);
  // ... and metrics report and report tranche fetch the job branch and deepen, and measure it.
  const mr = await cli(clone, ['metrics', 'report'], { GITHUB_REPOSITORY: 'o/r' });
  assert.deepEqual(JSON.parse(mr.out).lead_times.jobs[0].blocked, { minutes: 40 });
  const rt = await cli(clone, ['report', 'tranche'], { GITHUB_REPOSITORY: 'o/r' });
  assert.match(rt.out, /\| x \| unmeasured \| 70 min \(attempt 1\) \| unmeasured \| 40 min \|/);
});

test('finding 7: blocked is informational; replace runs from the stop to the replacement, and a deferred block leaves both', () => {
  const { root } = withOrigin();
  const cfg = loadConfig(root);
  at(-10, () => commit(root, { ...E('y', 'WORKING'), ...E('z', 'WORKING'), ...E('w', 'WORKING') }, 'working'));
  // y: BLOCKED at 20, replaced at 35, the replacement works until 200 and unblocks.
  onJob(root, 'y', [[20, E('y', 'BLOCKED')], [200, E('y', 'WORKING')]]);
  // z: BLOCKED at 20, never replaced; its PR closed unmerged and deferred at layer 1's close at 100.
  onJob(root, 'z', [[20, E('z', 'BLOCKED')]]);
  // w: silent; replaced at 340 after its last push at 300.
  onJob(root, 'w', [[300, { 'src/w.js': 'x' }]]);
  const restarts = [
    { row: 'restart', tranche: 'tranche', module: 'y', at: t(35), why: 'blocked on a choice', stopped: t(20), stopped_by: 'BLOCKED' },
    { row: 'restart', tranche: 'tranche', module: 'w', at: t(340), why: 'quiet', stopped: t(300), stopped_by: 'last push' },
    { row: 'restart', tranche: 'older', module: 'w', at: t(10), why: 'another tranche', stopped: t(5), stopped_by: 'last push' },
  ];
  const jobRefs = new Map(['y', 'z', 'w'].map((m) => [m, `refs/remotes/origin/job/${m}`]));
  const rows = [start('y', 0), start('z', 0), start('w', 0)];
  const closed = [{ row: 'closed', tranche: 'tranche', layer: 1, at: t(100), deferred: { z: { reason: 'x', marks: ['R1'] } } }];
  const lt = leadTimes(root, cfg, { ref: 'HEAD', rows, grants: opened(0), restarts, closed, jobRefs, now: t(400) });
  const by = Object.fromEntries(lt.jobs.map((j) => [j.module, j]));
  assert.deepEqual(by.y.blocked, { minutes: 180 }, 'no target, no mark');
  assert.deepEqual(by.y.replace, [{ from: t(20), minutes: 15, stopped_by: 'BLOCKED', source: 'blocked', replaced: t(35), target: 30 }]);
  assert.deepEqual(by.z.blocked, { minutes: 0 }, 'the deferred block leaves the figures');
  assert.equal(by.z.replace, 'none');
  assert.equal(by.z.start_to_pr_ready, 'deferred');
  assert.deepEqual(by.w.replace, [{ from: t(300), minutes: 40, stopped_by: 'last push', source: 'last push', replaced: t(340), target: 30, mark: 'over' }]);
  assert.deepEqual(lt.summary.replace, { n: 2, median: 27.5, worst: 40, target: 30, worst_mark: 'over' });
  assert.equal(lt.summary.blocked.target, undefined);
  // Not deferred, z's block is open and over.
  const open = leadTimes(root, cfg, { ref: 'HEAD', rows, grants: opened(0), restarts, closed: [], jobRefs, now: t(400) });
  assert.deepEqual(open.jobs.find((j) => j.module === 'z').replace, [{ from: t(20), minutes: 380, stopped_by: 'BLOCKED', source: 'blocked', open: true, target: 30, mark: 'over' }]);
});

test('finding 8: the median of an even count, an undecided layer close, and the opening as the first ok grant', () => {
  assert.equal(median([10, 20]), 15);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([]), U);
  const { root } = withOrigin();
  const cfg = loadConfig(root);
  // Two ok grant checks after the last tranche close: the tranche opened at the first.
  const grants = [{ row: 'grant', tranche: 'tranche', at: t(50), outcome: 'ok' }, { row: 'grant', tranche: 'tranche', at: t(1), outcome: 'ok' }];
  const lt = leadTimes(root, cfg, { ref: 'HEAD', rows: [start('a', 5)], layers: new Map([['a', 1]]), grants, now: t(60) });
  assert.equal(lt.opened, t(1));
  assert.deepEqual(pick(lt.jobs[0].ready_to_start), { minutes: 4, target: 10 });
  // A layer close whose commit report tranche cannot place prints unmeasured, not "no layer closed".
  at(-5, () => commit(root, { 'build/layers.md': '| 1 | a |\n' }, 'layers'));
  at(6, () => commit(root, { 'process/metrics/a.jsonl': JSON.stringify(start('a', 5)) + '\n' }, 'rows'));
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  onState(root, {
    'metrics/tranche-open.jsonl': JSON.stringify(grants[1]) + '\n',
    'layers/closed.jsonl': JSON.stringify({ row: 'closed', tranche: 'tranche', layer: 1, at: t(30), commit: 'f'.repeat(40) }) + '\n',
  });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const md = trancheReport(root, cfg, { now: t(60), stateRead: true, io: { state: (p) => readState(root, 'process-state', p), merged: () => null, comments: () => [], compare: () => null } });
  assert.match(md, /- layer close to next job start: layer 1 unmeasured/);
});

// Review 1 of PR 76.
import { leadInputs } from '../lib/lead.mjs';

test('review 1: a job whose rows live only on its branch is measured; a closed tranche keeps its opening', async () => {
  const { root } = withOrigin();
  // u: started at 1 and BLOCKED at 5, its start row only on job/u (job start commits it there).
  at(-10, () => commit(root, E('u', 'WORKING'), 'u working'));
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  onJob(root, 'u', [[1, { 'process/metrics/u.jsonl': JSON.stringify(start('u', 1)) + '\n' }], [5, E('u', 'BLOCKED')]]);
  onState(root, { 'metrics/tranche-open.jsonl': JSON.stringify(opened(0)[0]) + '\n', 'metrics/restart.jsonl': '' });
  git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
  const lt = JSON.parse((await cli(root, ['metrics', 'report'], { GITHUB_REPOSITORY: 'o/r' })).out).lead_times;
  assert.deepEqual(lt.jobs.map((j) => j.module), ['u']);
  const u = lt.jobs[0];
  assert.equal(u.start_to_pr_ready.open, true);
  assert.equal(u.blocked.open, true);
  assert.equal(u.replace[0].open, true);
  assert.equal(u.replace[0].mark, 'over');
  // The tranche's close recorded, no grant since: the grants that close closed still open it.
  const rows = { 'metrics/tranche-open.jsonl': [{ row: 'grant', tranche: 'tranche', at: t(-500), outcome: 'ok' }, { row: 'grant', tranche: 'tranche', at: t(0), outcome: 'ok' }], 'tranches/closed.jsonl': [{ row: 'tranche-closed', tranche: 'tranche', at: t(-100) }, { row: 'tranche-closed', tranche: 'tranche', at: t(900) }] };
  const read = (p) => (rows[p] ? rows[p].map((r) => JSON.stringify(r)).join('\n') + '\n' : null);
  assert.deepEqual(leadInputs(root, 'process-state', read, 'tranche').grants.map((g) => g.at), [t(0)]);
  rows['metrics/tranche-open.jsonl'].push({ row: 'grant', tranche: 'tranche', at: t(1000), outcome: 'ok' });
  assert.deepEqual(leadInputs(root, 'process-state', read, 'tranche').grants.map((g) => g.at), [t(1000)], 'a new tranche opened: its own');
});

test('review 1: a second restart in one block runs from the first; the summary counts unmeasured jobs', () => {
  const { root } = withOrigin();
  const cfg = loadConfig(root);
  at(-10, () => commit(root, E('y', 'WORKING'), 'y working'));
  onJob(root, 'y', [[20, E('y', 'BLOCKED')], [200, E('y', 'WORKING')]]);
  const restarts = [35, 160].map((m) => ({ row: 'restart', tranche: 'tranche', module: 'y', at: t(m), why: 'x', stopped: t(20), stopped_by: 'BLOCKED' }));
  const lt = leadTimes(root, cfg, { ref: 'HEAD', rows: [start('y', 0), start('v', 0)], grants: opened(0), restarts, jobRefs: new Map([['y', 'refs/remotes/origin/job/y'], ['v', null]]), now: t(400) });
  assert.deepEqual(lt.jobs.find((j) => j.module === 'y').replace.map((r) => [r.from, r.minutes, r.stopped_by]), [[t(20), 15, 'BLOCKED'], [t(35), 125, 'restart']]);
  assert.equal(lt.summary.blocked.unmeasured, 1, 'v: no job branch');
  assert.equal(lt.summary.replace.unmeasured, 1);
});

// Copy, 4 Nov: report tranche printed "origin/tranche b46497aa7a", a merge hours old, with the tip
// df6b8cde: the fetch failed unseen and the old ref was read. A failed fetch now refuses.
test('report tranche and metrics report refuse when the tranche cannot be fetched, never reading a stale ref', async () => {
  const { root } = withOrigin();
  git(['remote', 'set-url', 'origin', join(tmpdir(), 'p3-no-such-origin.git')], { cwd: root });
  for (const argv of [['report', 'tranche'], ['metrics', 'report']]) {
    const r = await cli(root, argv, { GITHUB_REPOSITORY: 'o/r' });
    assert.notEqual(r.code, 0, argv.join(' '));
    assert.match(r.out, /git fetch .*tranche.* failed/, argv.join(' '));
    assert.doesNotMatch(r.out, /at origin\/tranche/);
  }
});
