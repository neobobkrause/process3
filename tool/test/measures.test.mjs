// The gate-row measures: ROOT's context per sweep (P2-G10), survival and cost per surviving pull
// request (P3-G5), and the stateless BOB wake (P3-A1, SES-16).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commit, makeRepo, onState } from './helpers.mjs';
import { statelessWake, survivalReport } from '../lib/measures.mjs';
import { WAKES_FILE, readRows, recordWake, report, rootContext, wakes } from '../lib/metrics.mjs';
import { recordStart, rootPrompt } from '../lib/roles.mjs';
import { readState } from '../lib/state.mjs';
import { SWEEP_ROWS_FILE, sweep, sweepTask } from '../lib/sweep.mjs';
import { git } from '../lib/util.mjs';

const quiet = () => {};
const R = 'session_root1';
const DAY = 86400000;
const HASH = 'a'.repeat(64);

function withOrigin(files = {}) {
  const root = makeRepo({ 'README.md': 'x', 'CLAUDE.md': 'Bob\'s approvals\n', 'process/config.json': { tranche: 'tranche' }, ...files });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  return root;
}

test('sweep --context: ROOT\'s context on the sweep row, and the estimate of sweeps left', () => {
  const root = withOrigin();
  recordStart(root, 'root', R, { log: quiet });
  for (const c of [10, '14%', 18]) sweep(root, { session: R, offline: true, context: c, log: quiet });
  sweep(root, { session: R, offline: true, log: quiet });
  const rows = readState(root, 'process-state', SWEEP_ROWS_FILE).trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(rows.map((r) => r.root_context), [10, 14, 18, 'unmeasured']);
  for (const bad of [true, 'lots', 140]) assert.throws(() => sweep(root, { session: R, offline: true, context: bad, log: quiet }), /--context/);
  const est = rootContext(rows, 60);
  assert.deepEqual(est.sweeps.map((s) => s.context), [10, 14, 18]);
  assert.equal(est.rise_per_sweep, 4);
  assert.equal(est.sweeps_left, 10); // (60 - 18) / 4, rounded down
  assert.equal(rootContext([{ at: 'x', row: 'sweep', session: R, root_context: 5 }]).sweeps_left, 'unmeasured');
  assert.equal(rootContext([]), 'unmeasured');
  // Only the addressed ROOT's sweeps: the last row's session.
  assert.equal(rootContext([...rows, { at: 'y', row: 'sweep', session: 'session_new', root_context: 3 }]).sweeps.length, 1);
  // The prompts ROOT runs the sweep from carry the flag.
  assert.match(sweepTask(R, 'tranche', HASH).prompt, /sweep --session session_root1 --sessions <[^>]+> --context </);
  assert.match(rootPrompt({ slug: 'o/r', approvals: HASH }), /sweep --session <your id> --sessions <file> --context <pct>/);
  const r = report(root, 'o/r', 'HEAD', { read: { comments: () => [], getPR: () => null }, sweepRows: rows, refreshAt: 60 });
  assert.equal(r.root_context.sweeps_left, 10);
});

// A job merged into the tranche the way the tool merges it: its branch, its merge row, a merge
// commit titled "Merge job PR <n>"; the row dated <age> days ago.
function mergeJob(root, id, pr, ageDays, files) {
  git(['checkout', '-q', '-b', `job/${id}`, 'tranche'], { cwd: root });
  commit(root, files, `${id} work`);
  const at = new Date(Date.now() - ageDays * DAY).toISOString();
  commit(root, { [`process/metrics/${id}.jsonl`]: [
    { at, module: id, row: 'attempt', event: 'start', attempt: 1 },
    { at, module: id, row: 'attempt', event: 'measured', role: 'job', attempt: 1, session: 'session_j', cost_usd: 3 },
    { at, module: id, row: 'merge', pr },
  ].map((x) => JSON.stringify(x)).join('\n') + '\n' }, `merge row for ${id} (PR ${pr})`);
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', `job/${id}`, '-m', `Merge job PR ${pr}`], { cwd: root });
  return git(['rev-parse', 'HEAD'], { cwd: root });
}

test('metrics survival: stands, reverted, every line undone, younger than the window, and on main', () => {
  const root = makeRepo({ 'README.md': 'x', 'process/config.json': { tranche: 'tranche' } });
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  mergeJob(root, 'a', 1, 20, { 'src/a.js': 'one\ntwo\n' });
  const b = mergeJob(root, 'b', 2, 20, { 'src/b.js': 'three\n' });
  mergeJob(root, 'c', 3, 20, { 'src/c.js': 'four\nfive\n' });
  mergeJob(root, 'd', 4, 2, { 'src/d.js': 'six\n' });
  git(['revert', '--no-edit', '-m', '1', b], { cwd: root });
  commit(root, { 'src/c.js': 'other\n' }, 'rewrite c'); // no revert, but every line c added is gone
  commit(root, { 'src/a.js': 'one\nchanged\n' }, 'touch a'); // one line of a's still stands
  git(['branch', '-f', 'main', 'tranche~1'], { cwd: root }); // main holds all but the last commit
  const s = survivalReport(root, { branch: 'tranche', main: 'main', days: 14 });
  const by = Object.fromEntries(s.prs.map((p) => [p.pr, p]));
  assert.equal(by[1].tranche, 'stands');
  assert.equal(by[1].main, 'stands');
  assert.equal(by[1].survived, true);
  assert.match(by[2].tranche, /^undone: reverted by /);
  assert.equal(by[2].survived, false);
  assert.equal(by[3].tranche, 'undone: every line it added is gone');
  assert.equal(by[4], undefined);
  assert.deepEqual([s.measured, s.surviving, s.pending_younger], [3, 1, 1]);
  // Cost: the rows up to the cutoff (three jobs at 3 USD each) over the one surviving PR.
  assert.equal(s.cost_usd, 9);
  assert.equal(s.cost_per_surviving_pr, 9);
  assert.ok(s.unmeasured_cost.includes('a gate'));
  assert.ok(s.unmeasured_cost.includes('BOB and ROOT (no priced row)'));
  assert.match(s.rule, /This reverts commit/);
  // A main that never got the merge says so; a window of 0 days measures the young one too.
  git(['branch', '-f', 'main', 'tranche~4'], { cwd: root }); // up to PR 3's merge
  const t = survivalReport(root, { branch: 'tranche', main: 'main', days: 0 });
  assert.equal(t.prs.find((p) => p.pr === 4).main, 'not merged there');
  assert.equal(t.pending_younger, 0);
  // A merge row whose merge commit the clone lacks is unmeasured, never counted as survived.
  commit(root, { 'process/metrics/e.jsonl': JSON.stringify({ at: new Date(Date.now() - 30 * DAY).toISOString(), module: 'e', row: 'merge', pr: 9 }) + '\n' }, 'row only');
  assert.equal(survivalReport(root, { branch: 'tranche', days: 14 }).prs.find((p) => p.pr === 9).survived, 'unmeasured');
});

test('bob wake --stateless prints the fresh BOB\'s call and its size, writing nothing; metrics wake records one wake', () => {
  const root = withOrigin();
  recordStart(root, 'root', R, { log: quiet });
  const before = git(['rev-parse', 'refs/remotes/origin/process-state'], { cwd: root });
  const out = [];
  const w = statelessWake(root, { slug: 'o/r', offline: true, live: 1, log: (l) => out.push(l) });
  assert.match(w.prompt, /^# BOB, one stateless wake/);
  assert.match(w.prompt, /## CLAUDE\.md\n\nBob's approvals/);
  assert.match(w.prompt, /## status --role bob\n\n[\s\S]*reading set for bob: \d+ bytes/);
  assert.match(w.prompt, /ROOT, session `session_root1`/);
  assert.equal(w.bytes, Buffer.byteLength(w.prompt));
  assert.equal(w.call.prompt, w.prompt);
  assert.equal(w.call.source_url, 'https://github.com/o/r');
  assert.equal(w.call.clone_depth, 1);
  assert.ok(out.includes(`prompt: ${w.bytes} bytes`));
  assert.equal(git(['rev-parse', 'refs/remotes/origin/process-state'], { cwd: root }), before);
  assert.equal(git(['status', '--porcelain'], { cwd: root }), '');
  recordWake(root, { session: 'session_s1', tokens: '1200', usd: '0.4', mode: 'stateless' });
  recordWake(root, { session: 'session_b1', tokens: 9000, usd: 2, mode: 'resident' });
  const rows = readRows(root, null, WAKES_FILE);
  assert.deepEqual(rows.map((r) => [r.row, r.mode, r.tokens, r.cost_usd]), [['wake', 'stateless', 1200, 0.4], ['wake', 'resident', 9000, 2]]);
  const cmp = wakes(rows);
  assert.equal(cmp.stateless.mean_tokens, 1200);
  assert.equal(cmp.resident.mean_usd, 2);
  assert.equal(wakes([]).stateless, 'unmeasured');
  git(['add', '-A'], { cwd: root });
  git(['commit', '-q', '-m', 'wake rows'], { cwd: root });
  assert.equal(report(root, 'o/r', 'HEAD', { read: { comments: () => [], getPR: () => null } }).wakes.resident.wakes, 1);
  for (const bad of [{ mode: 'warm' }, { tokens: 'many' }, { usd: true }, { session: 'bob' }]) {
    assert.throws(() => recordWake(root, { session: 'session_s1', tokens: 1, usd: 1, mode: 'stateless', ...bad }), /a wake needs/);
  }
});

// Findings from the review of PR 70: the command line, a shallow clone, and the lead times.
import { main } from '../p3.mjs';
import { leadTimes, reportWaits } from '../lib/lead.mjs';
import { trancheReport } from '../lib/report.mjs';
import { loadConfig } from '../lib/util.mjs';
const pick = ({ minutes, target, mark }) => ({ minutes, target, ...(mark ? { mark } : {}) });

async function cli(root, argv, env = {}) {
  const cwd = process.cwd();
  const old = { log: console.log, err: console.error, env: { ...process.env } };
  const lines = [];
  console.log = (...x) => lines.push(x.join(' '));
  console.error = (...x) => lines.push(x.join(' '));
  Object.assign(process.env, env);
  try { process.chdir(root); const code = await main(argv); return { code, out: lines.join('\n') }; } finally { process.chdir(cwd); console.log = old.log; console.error = old.err; process.env = old.env; }
}

test('the command line: sweep --context, metrics wake, metrics survival and bob wake --stateless', async () => {
  const root = withOrigin();
  recordStart(root, 'root', R, { log: quiet });
  assert.equal((await cli(root, ['sweep', '--session', R, '--live', '1', '--context', '33', '--offline'])).code, 0);
  assert.equal(JSON.parse(readState(root, 'process-state', SWEEP_ROWS_FILE).trim().split('\n').at(-1)).root_context, 33);
  const w = await cli(root, ['metrics', 'wake', '--session', 'session_s1', '--tokens', '10', '--usd', '0.5', '--mode', 'stateless']);
  assert.equal(w.code, 0);
  assert.deepEqual(['session', 'tokens', 'cost_usd', 'mode'].map((k) => JSON.parse(w.out)[k]), ['session_s1', 10, 0.5, 'stateless']);
  assert.equal((await cli(root, ['metrics', 'wake', '--session', 'session_s1', '--tokens', '10', '--mode', 'stateless'])).code, 1);
  const s = await cli(root, ['metrics', 'survival']);
  assert.equal(s.code, 0);
  assert.equal(JSON.parse(s.out).days, 14);
  assert.equal(JSON.parse((await cli(root, ['metrics', 'survival', '--days', '3', '--offline'])).out).days, 3);
  assert.match((await cli(root, ['metrics', 'survival', '--days', 'soon'])).out, /--days <n>/);
  const b = await cli(root, ['bob', 'wake', '--stateless', '--offline', '--live', '1'], { GITHUB_REPOSITORY: 'o/r' });
  assert.equal(b.code, 0);
  assert.match(b.out, /prompt: \d+ bytes[\s\S]*"source_url": "https:\/\/github.com\/o\/r"/);
  assert.equal((await cli(root, ['bob', 'wake'], { GITHUB_REPOSITORY: 'o/r' })).code, 1);
});

test('metrics survival in a shallow clone: unmeasured offline, measured once it fetches the history whole', async () => {
  const src = makeRepo({ 'README.md': 'x', 'process/config.json': { tranche: 'tranche' } });
  git(['branch', 'tranche'], { cwd: src });
  git(['checkout', '-q', 'tranche'], { cwd: src });
  mergeJob(src, 'a', 1, 20, { 'src/a.js': 'one\n' });
  commit(src, { 'later.txt': 'x' }, 'later');
  git(['branch', '-f', 'main', 'tranche'], { cwd: src });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: src });
  git(['push', '-q', bare, 'main', 'tranche'], { cwd: src });
  const clone = join(mkdtempSync(join(tmpdir(), 'p3-shallow-')), 'c');
  git(['clone', '-q', '--depth', '2', '--branch', 'tranche', `file://${bare}`, clone], { cwd: src }); // the merge commit, its parents cut
  const off = JSON.parse((await cli(clone, ['metrics', 'survival', '--offline'])).out);
  assert.deepEqual(off.prs.map((p) => [p.pr, p.survived]), [[1, 'unmeasured']]);
  assert.match(off.prs[0].why, /shallow/);
  const on = JSON.parse((await cli(clone, ['metrics', 'survival'])).out);
  assert.deepEqual(on.prs.map((p) => [p.pr, p.tranche, p.main, p.survived]), [[1, 'stands', 'stands', true]]);
});

test('lead times: each figure from its rows, beside its target, over marked, unmeasured where a row is missing', async () => {
  const root = withOrigin();
  const t = (min) => new Date(Date.parse('2026-11-01T00:00:00Z') + min * 60000).toISOString();
  const at = (min, fn) => { const e = { ...process.env }; process.env.GIT_COMMITTER_DATE = process.env.GIT_AUTHOR_DATE = t(min); try { fn(); } finally { process.env = e; } };
  at(0, () => commit(root, { 'process/ledger/a.json': { id: 'a', status: { state: 'WORKING' } } }, 'a working'));
  at(40, () => commit(root, { 'process/ledger/a.json': { id: 'a', status: { state: 'BLOCKED', reason: 'x' } } }, 'a blocked'));
  at(85, () => commit(root, { 'process/ledger/a.json': { id: 'a', status: { state: 'WORKING' } } }, 'a again'));
  const rows = [
    { at: t(5), module: 'a', row: 'attempt', event: 'start' }, { at: t(100), module: 'a', row: 'attempt', event: 'complete', pr: 7 },
    { at: t(130), module: 'a', row: 'merge', pr: 7 }, { at: t(70), module: 'b', row: 'attempt', event: 'start' },
    { at: t(120), module: 'c', row: 'attempt', event: 'start' },
  ];
  // c is BLOCKED on its own job branch (job block commits there), not merged: open, counted to now.
  const back = git(['rev-parse', 'HEAD'], { cwd: root });
  at(150, () => commit(root, { 'process/ledger/c.json': { id: 'c', status: { state: 'BLOCKED', reason: 'x' } } }, 'c blocked'));
  git(['update-ref', 'refs/remotes/origin/job/c', 'HEAD'], { cwd: root });
  git(['reset', '-q', '--hard', back], { cwd: root });
  const cfg = loadConfig(root);
  const lt = leadTimes(root, cfg, {
    ref: 'HEAD', rows, layers: new Map([['a', 1], ['b', 2]]), now: t(200), restarts: [],
    jobRefs: new Map([['a', 'HEAD'], ['b', 'HEAD'], ['c', 'refs/remotes/origin/job/c']]),
    grants: [{ row: 'grant', tranche: 'tranche', at: t(1), outcome: 'ok' }, { row: 'grant', tranche: 'tranche', at: t(3), outcome: 'refused' }], closed: [{ row: 'closed', tranche: 'tranche', layer: 1, at: t(50) }],
    msgs: [{ from: 'a', n: 1, to: 'bob', at: t(10), text: 'report' }, { from: 'bob', n: 1, to: 'a', at: t(50), text: 'a-1: done' }, { from: 'a', n: 2, to: 'bob', at: t(150), text: 'again' }],
    comments: () => [{ ok: false, at: t(105) }, { ok: true, at: t(110) }],
  });
  const a = lt.jobs.find((j) => j.module === 'a');
  const b = lt.jobs.find((j) => j.module === 'b');
  assert.deepEqual(pick(a.ready_to_start), { minutes: 4, target: 10 });
  assert.deepEqual(a.start_to_pr_ready, { minutes: 95, attempt: 1 });
  assert.deepEqual(a.green_to_merge, { minutes: 20, target: 15, mark: 'over', attempt: 1 });
  assert.deepEqual(a.blocked, { minutes: 45 }, 'blocked has no target: replace has');
  assert.deepEqual(a.replace, [{ from: t(40), minutes: 45, stopped_by: 'BLOCKED', source: 'blocked', resumed: t(85), target: 30, mark: 'over' }]);
  assert.deepEqual(a.report_wait, [{ from: 'a', n: 1, to: 'bob', minutes: 40, target: 30, mark: 'over' }, { from: 'a', n: 2, to: 'bob', minutes: 50, open: true, target: 30, mark: 'over' }]);
  assert.deepEqual(pick(b.ready_to_start), { minutes: 20, target: 10, mark: 'over' });
  assert.deepEqual(lt.jobs.find((j) => j.module === 'c').blocked, { minutes: 50, open: true });
  assert.deepEqual(lt.close_to_next_start, [{ layer: 1, minutes: 20, target: 10, mark: 'over' }]);
  assert.equal(a.ready_to_start.minutes, 4, 'from the last ok grant row, not the refused one');
  assert.deepEqual(lt.summary.green_to_merge, { n: 1, median: 20, worst: 20, target: 15, median_mark: 'over', worst_mark: 'over' });
  assert.equal(lt.summary.report_wait.n, 1, 'an open wait is not in the median');
  assert.equal(lt.targets.merge_minutes, 15);
  // Rows missing: the opening read, but no layer close, message or gate row, nor a job branch.
  const none = leadTimes(root, cfg, { ref: 'HEAD', rows, layers: new Map([['a', 2], ['b', 1]]), grants: [{ row: 'grant', tranche: 'tranche', at: t(1), outcome: 'ok' }], comments: () => { throw new Error('offline'); } });
  assert.equal(none.jobs[0].ready_to_start, 'unmeasured');
  assert.equal(none.jobs[0].green_to_merge, 'unmeasured');
  assert.equal(none.jobs[0].report_wait, 'unmeasured');
  assert.equal(none.jobs[0].blocked, 'unmeasured');
  assert.equal(none.jobs[0].replace, 'unmeasured');
  assert.equal(none.close_to_next_start, 'unmeasured');
  // process/config.json's targets: a partial one keeps the other defaults.
  commit(root, { 'process/config.json': { tranche: 'tranche', targets: { merge_minutes: 45 } } }, 'targets');
  assert.deepEqual(loadConfig(root).targets, { start_minutes: 10, merge_minutes: 45, decision_minutes: 30, replace_minutes: 30 });
  commit(root, { 'process/config.json': { tranche: 'tranche' } }, 'targets back');
  // A target from process/config.json replaces its default.
  assert.equal(leadTimes(root, { ...cfg, targets: { ...cfg.targets, merge_minutes: 30 } }, { ref: 'HEAD', rows, grants: [{ row: 'grant', tranche: 'tranche', at: t(1), outcome: 'ok' }], comments: () => [{ ok: true, at: t(110) }] }).jobs[0].green_to_merge.mark, undefined);
  assert.equal(reportWaits([{ from: 'bob', n: 3, to: 'root', at: t(0) }, { from: 'root', n: 1, to: 'bob', at: t(5), text: 'bob-3 ok' }], t(9))[0].minutes, 5);
  // Both reports print them.
  commit(root, { 'process/metrics/a.jsonl': rows.map((r) => JSON.stringify(r)).join('\n') + '\n' }, 'rows');
  git(['push', '-q', 'origin', 'HEAD:tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const md = trancheReport(root, cfg, { now: t(200), io: { merged: () => null, comments: () => [], compare: () => null } });
  assert.match(md, /## Lead times[\s\S]*Per job: unmeasured \(the tranche's opening not read\)/);
  assert.match(md, /- green to merge: unmeasured/);
  // With the state branch read, each report measures from its rows: this tranche's open and a layer close.
  const sha = git(['rev-parse', 'HEAD'], { cwd: root });
  onState(root, {
    'metrics/tranche-open.jsonl': JSON.stringify({ row: 'grant', tranche: 'tranche', at: t(1), outcome: 'ok', act: 'push', depth: 1 }) + '\n',
    'layers/closed.jsonl': JSON.stringify({ row: 'closed', tranche: 'tranche', layer: 1, at: t(50), commit: sha }) + '\n',
  });
  commit(root, { 'build/layers.md': '| 1 | a |\n| 2 | b |\n' }, 'layers');
  git(['push', '-q', 'origin', 'HEAD:tranche'], { cwd: root });
  git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const md2 = trancheReport(root, cfg, { now: t(200), stateRead: true, io: { state: (p) => readState(root, 'process-state', p), merged: () => null, comments: () => [], compare: () => null } });
  assert.match(md2, /\| a \| 4 min \(target 10\) \|/);
  assert.match(md2, /layer close to next job start: layer 1 20 min \(target 10, over\)/);
  const mr = await cli(root, ['metrics', 'report'], { GITHUB_REPOSITORY: 'o/r' });
  const lead = JSON.parse(mr.out).lead_times;
  assert.deepEqual(pick(lead.jobs.find((j) => j.module === 'a').ready_to_start), { minutes: 4, target: 10 });
  assert.deepEqual(lead.close_to_next_start, [{ layer: 1, minutes: 20, target: 10, mark: 'over' }]);
});
