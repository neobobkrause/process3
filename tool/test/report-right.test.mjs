// The copy's figures measured 4 Nov 04:47 (pin d45822c, tranche opened 2026-11-03T23:23Z) that
// metrics report and report tranche gave wrong or missing. Each test below failed before its fix.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commit, makeRepo } from './helpers.mjs';
import { leadCell, leadTimes, restartBatches } from '../lib/lead.mjs';
import { overhead, refusalList, report as metricsReport } from '../lib/metrics.mjs';
import { trancheReport } from '../lib/report.mjs';
import { git, loadConfig } from '../lib/util.mjs';

const U = 'unmeasured';
const T0 = Date.parse('2026-11-01T00:00:00Z');
const t = (min) => new Date(T0 + min * 60000).toISOString();
const jl = (...rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
const start = (m, min, attempt) => ({ at: t(min), module: m, row: 'attempt', event: 'start', role: 'job', ...(attempt ? { attempt } : {}) });
const merge = (m, min, pr) => ({ at: t(min), module: m, row: 'merge', pr });
const grants = (min = 0) => [{ row: 'grant', tranche: 'tranche', at: t(min), outcome: 'ok' }];
const measured = (m, min, role, cost, session, more = {}) => ({ at: t(min), module: m, row: 'attempt', event: 'measured', role, session, cost_usd: cost, ...more });

// The copy's shape: layer 2 never closed, layers 3 and up opened by dependency.
const LAYERS = new Map([['base', 1], ['p2', 2], ['q2', 2], ['u3', 3], ['n3', 3], ['e3', 3], ['x3', 3]]);
const MODULES = [
  { id: 'p2', uses: [] }, { id: 'q2', uses: [] },
  { id: 'u3', uses: ['p2', 'q2'] }, // ready at q2's merge, the later
  { id: 'n3', uses: ['q2'] }, // q2's job open when n3 started
  { id: 'e3', uses: [] }, // uses nothing: ready at the opening
  // x3 has no uses entry: its layer's opening, which never came
];

test('1: open_by uses: a job is ready at the latest of the opening and its uses\' merges, not at its layer\'s opening', () => {
  const root = makeRepo();
  const cfg = loadConfig(root);
  const rows = [start('p2', 1), merge('p2', 20, 1), start('q2', 2), merge('q2', 30, 2), start('u3', 45), start('e3', 4), start('x3', 50), start('n3', 25)];
  const lt = leadTimes(root, cfg, { ref: 'HEAD', rows, layers: LAYERS, modules: MODULES, grants: grants(0), closed: [], now: t(100) });
  const by = Object.fromEntries(lt.jobs.map((j) => [j.module, j.ready_to_start]));
  assert.equal(by.u3.minutes, 15, "ready at q2's merge (30), started at 45");
  assert.equal(by.u3.waited_on, 'q2');
  assert.equal(by.u3.ready_by, 'uses');
  assert.equal(by.e3.minutes, 4, 'uses nothing: ready at the opening');
  assert.equal(by.x3, U, 'no uses entry: its layer\'s opening, here never read');
  // n3 started at 25, while q2's job (started at 2) was open: started before its uses merged; 0.
  assert.equal(by.n3.minutes, 0);
  assert.equal(by.n3.started_before, 'q2');
  assert.match(leadCell(by.n3), /started before q2 merged/);
  // A provider whose own job started only after the user's start is a reopen: the opening counts.
  const reopen = leadTimes(root, cfg, { ref: 'HEAD', rows: [start('u3', 5), start('q2', 10), merge('q2', 30, 2)], layers: LAYERS, modules: MODULES, grants: grants(0), closed: [], now: t(100) });
  assert.equal(reopen.jobs.find((j) => j.module === 'u3').ready_to_start.minutes, 5);
  // A provider merged before the tranche: the opening, the later.
  const older = leadTimes(root, cfg, { ref: 'HEAD', rows: [merge('q2', -50, 1), merge('p2', -40, 1), start('u3', 7)], layers: LAYERS, modules: MODULES, grants: grants(0), closed: [], now: t(100) });
  assert.equal(older.jobs[0].ready_to_start.minutes, 7);
  // Started before q2 merged, and again after: 0, not q2's merge to the second start.
  const twice = leadTimes(root, cfg, { ref: 'HEAD', rows: [start('q2', 1), start('n3', 5), merge('q2', 30, 2), start('n3', 60, 2)], layers: LAYERS, modules: MODULES, grants: grants(0), closed: [], now: t(100) });
  assert.equal(twice.jobs.find((j) => j.module === 'n3').ready_to_start.minutes, 0);
  assert.equal(twice.jobs.find((j) => j.module === 'n3').ready_to_start.started_before, 'q2');
  // open_by layer: the layer rule, as before: layer 2 never closed, so u3 is unmeasured.
  const byLayer = leadTimes(root, { ...cfg, open_by: 'layer' }, { ref: 'HEAD', rows, layers: LAYERS, modules: MODULES, grants: grants(0), closed: [], now: t(100) });
  assert.equal(byLayer.jobs.find((j) => j.module === 'u3').ready_to_start, U);
  // A provider unmerged and its job started first: the figure says so, and the summary counts it.
  const early = leadTimes(root, cfg, { ref: 'HEAD', rows: [start('q2', 1), start('n3', 5)], layers: LAYERS, modules: MODULES, grants: grants(0), closed: [], now: t(100) });
  assert.equal(early.jobs.find((j) => j.module === 'n3').ready_to_start, 'started before q2 (in its uses) merged; q2 not merged yet');
  assert.equal(early.summary.ready_to_start.started_before_uses, 1);
  // No job's figure in minutes (q2's uses name a module the layer map lacks): still counted.
  const none = leadTimes(root, cfg, { ref: 'HEAD', rows: [start('q2', 1), start('n3', 5)], layers: LAYERS, modules: [...MODULES.filter((m) => m.id !== 'q2'), { id: 'q2', uses: ['zz'] }], grants: grants(0), closed: [], now: t(100) });
  assert.deepEqual(none.summary.ready_to_start, { n: 0, median: U, worst: U, unmeasured: 1, started_before_uses: 1 });
});

test('1: a wait over its target names its cause where the record shows one: a sweep that found the live cap full', () => {
  const root = makeRepo();
  const cfg = loadConfig(root);
  const sweeps = [{ row: 'sweep', at: t(31), live: 24, live_cap: 24 }, { row: 'sweep', at: t(35), live: 3, live_cap: 24 }];
  const lt = leadTimes(root, cfg, { ref: 'HEAD', rows: [start('p2', 1), merge('p2', 20, 1), start('q2', 2), merge('q2', 30, 2), start('u3', 45)], layers: LAYERS, modules: MODULES, grants: grants(0), closed: [], sweeps, now: t(100) });
  const u3 = lt.jobs.find((j) => j.module === 'u3').ready_to_start;
  assert.equal(u3.cause, `live cap full (24 of 24 at ${t(31)})`);
  assert.match(leadCell(u3), /cause: live cap full/);
});

test('2: a refusal with no role is listed as role unknown by both commands, never dropped', () => {
  const rows = [
    measured('standards', 5, 'bob', 1, 's_bob', { refusals: [{ act: 'tool change', depth: '0' }] }),
    { at: t(6), row: 'refusal', id: '1', session: 's_who', act: 'push', depth: 1 },
    { at: t(6), row: 'refusal', id: '2', session: 's_bob', act: 'tool change', depth: 0 }, // the same refusal as a row: once
  ];
  const list = refusalList(rows, new Map([['s_bob', 'bob']]));
  assert.deepEqual(list.map((r) => [r.role, r.act]), [['role unknown', 'push'], ['bob', 'tool change']]);
  const one = refusalList([measured('m', 5, undefined, 1, undefined, { refusals: [{ act: 'x' }] })].map((r) => { delete r.role; return r; }));
  assert.equal(one[0].role, 'job', 'a measured row with no role is a job row');
  assert.equal(refusalList([{ at: t(1), row: 'refusal', act: 'y' }])[0].role, 'role unknown');
});

// A tranche whose tip holds the rows given, its job branches those given, opened at minute 0.
function repo(rows, jobBranches = {}) {
  const root = makeRepo({ 'build/layers.md': '| Layer | Modules |\n|---|---|\n| 1 | `a`, `b`, `old` |\n' });
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: root });
  const files = {};
  for (const r of rows) files[`process/metrics/${r.module || 'x'}.jsonl`] = (files[`process/metrics/${r.module || 'x'}.jsonl`] || '') + jl(r);
  commit(root, files, 'record');
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  const jobRefs = new Map();
  for (const [m, rs] of Object.entries(jobBranches)) {
    git(['checkout', '-q', '-b', `job/${m}`], { cwd: root });
    commit(root, { [`process/metrics/${m}.jsonl`]: [...rows.filter((r) => r.module === m), ...rs].map((r) => JSON.stringify(r)).join('\n') + '\n' }, `job ${m}`);
    git(['update-ref', `refs/remotes/origin/job/${m}`, 'HEAD'], { cwd: root });
    git(['checkout', '-q', 'tranche'], { cwd: root });
    jobRefs.set(m, `refs/remotes/origin/job/${m}`);
  }
  const jobRows = Object.entries(jobBranches).flatMap(([m]) => [...rows.filter((r) => r.module === m), ...jobBranches[m]]);
  return { root, jobRefs, jobRows };
}
const STATE = { 'metrics/tranche-open.jsonl': jl(...grants(0)) };
const tranche = (root, more = {}) => trancheReport(root, loadConfig(root), { now: t(300), stateRead: true, io: { state: (p) => STATE[p] ?? null, merged: () => null, comments: () => [] }, ...more });

test('2: report tranche lists the refusal metrics report lists, with its role, not "None recorded"', () => {
  const { root } = repo([start('a', 5), measured('a', 10, 'bob', 3, 's_bob', { refusals: [{ act: 'tool change', depth: '0' }] }), { at: t(-60), module: null, row: 'refusal', id: '9', session: 's_x', act: 'merge', depth: 1 }]);
  const md = tranche(root);
  assert.doesNotMatch(md, /None recorded/);
  assert.match(md, /Since the opening: 1\.[\s\S]*\| bob \| tool change \| 1 \|/);
  assert.match(md, /Before the opening: 1\.[\s\S]*\| role unknown \| merge \| 1 \|/, 'older than the tranche: listed apart, not dropped');
  const m = metricsReport(root, 'o/r', 'origin/tranche', { read: { comments: () => [], getPR: () => null }, cfg: loadConfig(root), lead: { grants: grants(0) } });
  assert.deepEqual(m.refusals.map((r) => [r.role, r.act]).sort(), [['bob', 'tool change'], ['role unknown', 'merge']]);
});

test('3: an overhead whose every part is unmeasured reads unmeasured, never $0.00; a job\'s own cost rows are its, whatever BOB rows name it', () => {
  const o = overhead([start('a', 5), start('b', 6)], new Map(), { opened: t(0) });
  assert.deepEqual(o.jobs.map((j) => [j.module, j.overhead_usd, j.share]), [['a', U, U], ['b', U, U]]);
  const { root } = repo([start('a', 5)]);
  const md = tranche(root);
  assert.match(md, /\| a \| 1 \| unmeasured \| unmeasured \| unmeasured \| unmeasured \| unmeasured \| unmeasured \| unmeasured \|/);
  assert.doesNotMatch(md, /\$0\.00/);
  // standards, 2 Nov: its job rows and BOB's rows both name it; its job cost is measured.
  const s = overhead([start('standards', 1), measured('standards', 9, 'job', 1.97, 's_j'), measured('standards', 9, 'bob', 4, 's_bob')]);
  const j = s.jobs.find((x) => x.module === 'standards');
  assert.equal(j.job_usd, 1.97);
  assert.equal(j.bob_usd, 4, 'BOB\'s row is overhead, split among the jobs active in its window');
  assert.equal(j.reviews_usd, U, 'a BOB row naming the module is not its review: counted once, as BOB\'s part');
  assert.equal(j.overhead_usd, 4);
});

test('3: the total since the opening counts a BOB session begun before it from its last row before, not its whole running cost', () => {
  const { root } = repo([start('a', 5), measured('a', 6, 'job', 1, 's_a'), measured('bob', -10, 'bob', 5, 's_bob'), measured('bob', 20, 'bob', 8, 's_bob')]);
  const md = tranche(root);
  assert.match(md, /- total cost since the opening: \$4\.00/, '1 + (8 - 5)');
  assert.match(md, /\| a \| 1 \| \$1\.00 \| unmeasured \| \$3\.00 \|/, 'overhead splits the same 3');
});

test('4: overhead counts this tranche\'s attempts: started here (on the tip or a job branch), not older modules', () => {
  const rows = [start('old', -300), merge('old', -200, 3), measured('old', -200, 'job', 2, 's_o'), start('a', 5), merge('a', 40, 7)];
  const { root, jobRefs, jobRows } = repo(rows, { b: [start('b', 50)] });
  const o = overhead(rows, new Map(), { opened: t(0), jobRows });
  assert.deepEqual(o.jobs.map((j) => j.module), ['a', 'b'], 'old: no start since the opening; b: started, unmerged, on its job branch');
  assert.deepEqual(o.scope, { opened: t(0) });
  const md = tranche(root, { jobRefs, jobRows });
  assert.match(md, /\| b \| 1 \| unmeasured \|/);
  assert.doesNotMatch(md, /\| old \| 1 \| (unmeasured|\$)/);
  assert.match(md, /1 measured rows older than this tranche \(old\) left out/);
});

test('5: job merges count distinct pull requests since the opening; gate runs per merged job with them', () => {
  const rows = [start('old', -300), merge('old', -200, 3), start('a', 5), merge('a', 40, 60), merge('a', 47, 60), start('b', 6), merge('b', 50, 61)];
  const { root } = repo(rows);
  const md = tranche(root);
  assert.match(md, /job merges recorded: 2 distinct pull requests since the opening \(3 merge rows\); older than this tranche, left out: #3/);
  assert.match(md, /\| a \| [^|]+ \| #60 \|/);
});

test('5: gate runs per merged job: one per distinct pull request, not per merge row', async () => {
  const { BOT, GATE, block } = await import('../lib/github.mjs');
  const gate = (n) => [{ user: { login: BOT }, created_at: 'x', updated_at: 'x', body: block(GATE, { runs: Array.from({ length: n }, () => ({ suite: 'pass' })) }) }];
  const rows = [start('a', 5), merge('a', 40, 60), merge('a', 47, 60), start('b', 6), merge('b', 50, 61), merge('old', -200, 3)];
  const { root } = repo(rows);
  const md = tranche(root, { io: { state: (p) => STATE[p] ?? null, merged: () => null, comments: (pr) => gate(pr === 60 ? 3 : 1) } });
  assert.match(md, /- gate runs per merged job: 2 \(4 runs over 2 distinct pull requests merged since the opening\)/);
});

test('6: the opening has one source: elapsed time reads the grant row lead times reads', () => {
  const { root } = repo([start('a', 5)]);
  const md = tranche(root);
  assert.match(md, new RegExp(`- opened: ${t(0).replace(/\./g, '\\.')} \\(the first ok grant row`));
  assert.match(md, new RegExp(`- tranche opened: ${t(0).replace(/\./g, '\\.')}`));
  assert.match(md, /- elapsed: 5 h/);
});

test('7: attempts started: one definition, the tip\'s start rows and the job branch\'s, each once', () => {
  const tip = [start('bundler', 5, 1), start('bundler', 60, 2)];
  // The same start row on the job branch with another field: still one attempt.
  const { root, jobRefs, jobRows } = repo(tip, { bundler: [{ ...start('bundler', 60, 2), reopen: 'x' }, start('bundler', 120, 3), start('bundler', 200, 4)] });
  const md = tranche(root, { jobRefs, jobRows });
  assert.match(md, /\| bundler \| 4 \| unmeasured \|/);
  const lt = leadTimes(root, loadConfig(root), { ref: 'origin/tranche', rows: tip, jobRows, grants: grants(0), now: t(300) });
  assert.equal(lt.jobs[0].attempts.length, 4, 'lead times count the same attempts');
  assert.match(md, /Attempts: an attempt is a start row dated at or after the tranche's opening/);
});

test('8: replace names its stop\'s source, and restarts logged within a minute read as one batch, each figure still its own', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const cfg = loadConfig(root);
  const r = (m, min, stoppedMin, more = {}) => ({ row: 'restart', tranche: 'tranche', module: m, at: t(min), stopped: t(stoppedMin), stopped_by: 'BLOCKED', state: 'BLOCKED', ...more });
  // Five restarts in 28 s, as at 04:06 on 4 Nov, and one alone.
  const restarts = [r('a', 100, 71), r('b', 100.1, 70.5), r('c', 100.25, 70.9), r('d', 100.4, 71.8), r('e', 100.45, 72), r('f', 200, 190, { state: 'WORKING', stopped_by: 'last push', stop: 'idle' })];
  assert.equal(restartBatches(restarts).size, 5);
  const rows = ['a', 'b', 'c', 'd', 'e', 'f'].map((m) => start(m, 1));
  const lt2 = leadTimes(root, cfg, { ref: 'HEAD', rows, grants: grants(0), restarts, jobRefs: new Map(rows.map((x) => [x.module, 'HEAD'])), now: t(300) });
  const by = Object.fromEntries(lt2.jobs.map((j) => [j.module, j.replace]));
  assert.equal(by.a[0].minutes, 29);
  assert.equal(by.a[0].source, 'blocked');
  assert.deepEqual(by.a[0].batch, { restarts: 5, from: t(100), to: t(100.45) });
  assert.match(leadCell(by.a), /\(stop: blocked\) \(batch of 5 restarts /);
  assert.equal(by.f[0].source, 'idle');
  assert.equal(by.f[0].batch, undefined);
  assert.equal(by.f[0].minutes, 10);
  assert.equal(lt2.jobs.length, 6);
});
