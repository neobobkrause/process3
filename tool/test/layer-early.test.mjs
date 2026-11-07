// Early starts into the next layer (R14; Bob, 6 Nov ~18:55: "Why didn't the early starts launch
// before layer 8 closed?"): while layer n is open, a next-layer module whose providers have all
// landed or are COMPLETE starts early, on layer/<n+1> cut ahead from layer/<n>'s tip; it publishes
// once layer n+1 opens, which brings the branch up to the tranche; each is logged and its rework counted.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { jobStart } from '../lib/job.mjs';
import { flowFile, jobCfg } from '../lib/layerbase.mjs';
import { earlyCut, earlyRework, earlyUsers, flowRows, layerJobs, layerLines, layerOpen, layerPublish, layerStartAct, layerStatus, openLayer, writeRows } from '../lib/layerflow.mjs';
import { layerIdle } from '../lib/sweep.mjs';
import { fetchState } from '../lib/state.mjs';
import { configOf, git } from '../lib/util.mjs';
import { commit, entry } from './helpers.mjs';
import { makeRepo } from './helpers.mjs';

const quiet = () => {};
const SB = 'process-state';
const P3 = 'node .process/tool/p3.mjs';
const LAYERS = '| layer | name | modules |\n| --- | --- | --- |\n| 1 | One | a, b |\n| 2 | Two | c, d |\n';
const MODULES = { modules: [{ id: 'a', layer: 1, uses: [] }, { id: 'b', layer: 1, uses: [] }, { id: 'c', layer: 2, uses: ['a'] }, { id: 'd', layer: 2, uses: ['b'] }] };
const io = { slug: 'o/p', openPRs: () => [] };
const CFG = { tranche: 'tranche', modules_file: 'build/modules.json' };
const cfgOf = () => configOf(CFG);

// a COMPLETE (settled), b OPEN with an unmet mark (layer 1's own work), c and d OPEN in layer 2.
function product(modules = MODULES) {
  const files = { 'process/config.json': CFG, 'build/layers.md': LAYERS, 'build/modules.json': modules };
  for (const id of ['a', 'b', 'c', 'd']) {
    files[`process/ledger/${id}.json`] = entry(id, { layer: id < 'c' ? 1 : 2, ...(id === 'a' ? { status: { state: 'COMPLETE' } } : {}) });
    files[`req/${id}.md`] = `# ${id}\n\n- **R1** a requirement${id === 'a' ? '' : ' *(not yet met: T1)*'}\n`;
  }
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'src/x.txt': 'tranche work' }, 'tranche');
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  layerOpen(root, 1, { io, log: quiet });
  return { root, bare };
}

test('layer jobs lists a next-layer module whose providers are settled as an early start, and names why another is not', () => {
  const { root } = product();
  const out = [];
  const r = layerJobs(root, 1, { io, log: (l) => out.push(l) });
  assert.equal(r.early_next, 2);
  assert.deepEqual(r.early.map((x) => [x.id, x.cmd]), [['c', `${P3} job start c --live <n> --early`]]);
  assert.ok(out.some((l) => /^early starts into layer 2, on idle capacity only, after layer 1's own/.test(l)), out.join('\n'));
  assert.ok(out.some((l) => /^not early \(layer 2\): d \(b is not started in layer 1\)$/.test(l)), out.join('\n'));
  // status's lines and the act owed carry them; idle capacity counts them after the layer's own.
  const v = openLayer(root, cfgOf(), { slug: 'o/p', io });
  assert.deepEqual(v.early.map((x) => x.id), ['c']);
  const lines = layerLines(root, cfgOf(), { view: v });
  assert.ok(lines.some((l) => l === `- ${P3} job start c --live <n> --early`), lines.join('\n'));
  assert.equal(layerStartAct({ ...v, startable: [] }), `${P3} layer jobs 1, then each early start it lists (layer 2)`);
  const ic = layerIdle({ live: 0, cap: 4, view: v, t: Date.now() });
  assert.equal(ic.startable, 2, 'b, then c early');
  assert.deepEqual(ic.reasons.slice(0, 2), [`1 x startable from ${P3} layer jobs 1, not started (start now: b; one listed after a provider in flight starts now with its plain job start, no --early: R10; only a recorded hold waits)`, `1 x early starts into layer 2 listed by ${P3} layer jobs 1, not started (c)`]);
});

// C16 (the copy, 7 Nov: 49 modules built before the ledger held every user back from an early
// start, the reason reading "without a ledger entry"): the provider and the act are named.
test('a provider with no ledger entry: not early, naming the missing entry and the census that writes it', () => {
  const { root } = product({ modules: [...MODULES.modules.map((m) => (m.id === 'c' ? { ...m, uses: ['a', 'legacy'] } : m)), { id: 'legacy', layer: 0, uses: [] }] });
  const out = [];
  const r = layerJobs(root, 1, { io, log: (l) => out.push(l) });
  assert.deepEqual(r.early.map((x) => x.id), []);
  assert.ok(out.some((l) => l.startsWith(`not early (layer 2): c (legacy has no ledger entry (process/ledger/legacy.json): it is settled once BOB lands one (the census in \`${P3} status --role bob\` lists the module and its fix))`)), out.join('\n'));
});

test('job start --early: layer/2 cut ahead from layer/1\'s tip, the early row recorded; the job\'s base is layer/2; once only; an unsettled module refused', () => {
  const { root } = product();
  const lines = [];
  const r = earlyCut(root, cfgOf(), 'c', { io, log: (l) => lines.push(l) });
  const l1 = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  assert.deepEqual([r.layer, r.from, r.base], [2, 1, l1]);
  assert.equal(git(['rev-parse', 'origin/layer/2'], { cwd: root }), l1);
  assert.ok(lines.some((l) => /layer\/2 cut ahead to layer\/1 \S+ for early starts \(layer 2 is not open\)/.test(l)), lines.join('\n'));
  const rows = flowRows(root, SB, 2);
  assert.equal(rows.open, null, 'not opened');
  assert.deepEqual(rows.earlies.map((x) => [x.module, x.from, x.base, x.providers]), [['c', 1, l1, ['a']]]);
  const c = jobCfg(root, cfgOf(), 'c');
  assert.deepEqual([c.tranche, c.layer.n], ['layer/2', 2]);
  // A start that failed before its job branch reached origin is listed again; once pushed, refused.
  assert.deepEqual(layerJobs(root, 1, { io, log: quiet }).early.map((x) => x.id), ['c']);
  git(['push', '-q', 'origin', 'origin/layer/2:refs/heads/job/c'], { cwd: root });
  assert.deepEqual(layerJobs(root, 1, { io, log: quiet }).early.map((x) => x.id), []);
  assert.throws(() => earlyCut(root, cfgOf(), 'c', { io, log: quiet }), /c cannot start early into layer 2: it started early already; an early start that did not finish resumes with .*job start c once layer 2 opens/);
  assert.throws(() => earlyCut(root, cfgOf(), 'd', { io, log: quiet }), /d cannot start early into layer 2: b is not started in layer 1; .*layer jobs 1 lists the early starts; nothing was started/);
  assert.throws(() => earlyCut(root, cfgOf(), 'a', { io, log: quiet }), /a cannot start early/);
  // A later early start moves layer/2 forward to layer/1's new tip (a fast-forward).
  git(['checkout', '-q', '-B', 'w', 'origin/layer/1'], { cwd: root });
  commit(root, { 'src/a/more.txt': 'a landed again' }, 'land');
  git(['push', '-q', 'origin', 'w:layer/1'], { cwd: root });
  commit(root, { 'process/ledger/b.json': entry('b', { layer: 1, status: { state: 'COMPLETE' } }), 'req/b.md': '# b\n\n- **R1** a requirement\n' }, 'b complete');
  git(['push', '-q', 'origin', 'w:layer/1'], { cwd: root });
  const r2 = earlyCut(root, cfgOf(), 'd', { io, log: quiet });
  assert.equal(git(['rev-parse', 'origin/layer/2'], { cwd: root }), git(['rev-parse', 'origin/layer/1'], { cwd: root }));
  assert.equal(r2.layer, 2);
});

test('a start on the branch cut ahead without --early is refused; publish waits for the open', async () => {
  const { root } = product();
  earlyCut(root, cfgOf(), 'c', { io, log: quiet });
  git(['branch', '-f', 'layer/2', 'origin/layer/2'], { cwd: root });
  assert.throws(() => jobStart(root, 'd', { coordinator: 's', push: false, log: quiet }), /layer 2 is not open \(layer\/2 was cut ahead from layer 1 for early starts\): d starts early with --early while .*layer jobs 1 lists it/);
  await assert.rejects(layerPublish(root, 'c', { push: false, sync: async () => ({ ok: true }), complete: () => assert.fail('no run'), log: quiet }), /c: layer 2 is not open: layer\/2 was cut ahead from layer 1 for early starts .*; an early start publishes once it opens/);
  // layer jobs and layer status of the layer cut ahead say it is not open, never list its starts.
  assert.throws(() => layerJobs(root, 2, { io, log: quiet }), /^Error: layer 2 is not open: layer\/2 was cut ahead|layer 2 is not open: layer\/2 was cut ahead/);
  assert.throws(() => layerStatus(root, 2, { io, log: quiet }), /layer 2 is not open: layer\/2 was cut ahead from layer 1 for early starts/);
});

test('layer open of a layer cut ahead brings its branch up to the tranche (a fast-forward), then opens it', () => {
  const { root } = product();
  // Layer 1 moves on (a land), c starts early from that tip, and layer 1 merges into the tranche.
  git(['checkout', '-q', '-B', 'w', 'origin/layer/1'], { cwd: root });
  commit(root, { 'src/a/landed.txt': 'a land' }, 'land a');
  git(['push', '-q', 'origin', 'w:layer/1'], { cwd: root });
  earlyCut(root, cfgOf(), 'c', { io, log: quiet });
  git(['checkout', '-q', '-B', 'tranche', 'origin/tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '--no-edit', 'origin/layer/1'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const tip = git(['rev-parse', 'origin/tranche'], { cwd: root });
  writeRows(root, SB, 'layer 1 merged', [[flowFile(1, 'merged'), { row: 'merged', layer: 1, commit: tip, at: new Date().toISOString() }]]);
  fetchState(root, SB, { fresh: true });
  // Layer 1 merged, layer 2 not open yet: still refused (cold review of R14: the guards stopped at
  // layer 1's merge, and a plain start took the cut-ahead tip).
  git(['branch', '-f', 'layer/2', 'origin/layer/2'], { cwd: root });
  assert.throws(() => jobStart(root, 'd', { coordinator: 's', push: false, log: quiet }), /layer 2 is not open \(layer\/2 was cut ahead from layer 1 for early starts\)/);
  assert.throws(() => layerStatus(root, 2, { io, log: quiet }), /layer 2 is not open: layer\/2 was cut ahead from layer 1/);
  const lines = [];
  // c's draft pull request into layer/2 (opened by its early start).
  const c0 = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  const io2 = { ...io, openPRs: (slug, base) => (base === 'layer/2' ? [{ number: 7, draft: true, head: { ref: 'job/c', sha: c0 } }] : []) };
  const o = layerOpen(root, 2, { io: io2, log: (l) => lines.push(l) });
  assert.equal(git(['rev-parse', 'origin/layer/2'], { cwd: root }), tip);
  assert.equal(o.from, tip);
  assert.ok(lines.some((l) => /layer\/2, cut ahead for early starts at \S+, brought up to tranche/.test(l)), lines.join('\n'));
  assert.ok(flowRows(root, SB, 2).open);
  // c started early: working, not listed to start again; d is.
  assert.deepEqual(o.startable.map((x) => x.id), ['d']);
  // With no pull request into the layer (its start did not finish, or its PR closed): job start resumes it.
  const o2 = layerJobs(root, 2, { io, log: quiet });
  assert.deepEqual(o2.startable.map((x) => x.id), ['c', 'd']);
  assert.match(o2.states.find((x) => x.id === 'c').why, /started early while layer 1 was open; no pull request into the layer: job start resumes it/);
});

test('layer open refuses a branch cut ahead that the tranche does not hold (the layer before it not merged into it)', () => {
  const { root } = product();
  const tip = git(['rev-parse', 'origin/tranche'], { cwd: root });
  // layer/1 moves on, c starts early from it, and a merged row names a tranche without it.
  git(['checkout', '-q', '-B', 'w', 'origin/layer/1'], { cwd: root });
  commit(root, { 'src/a/z.txt': 'z' }, 'more');
  git(['push', '-q', 'origin', 'w:layer/1'], { cwd: root });
  earlyCut(root, cfgOf(), 'c', { io, log: quiet });
  writeRows(root, SB, 'layer 1 merged', [[flowFile(1, 'merged'), { row: 'merged', layer: 1, commit: tip, at: new Date().toISOString() }]]);
  fetchState(root, SB, { fresh: true });
  assert.throws(() => layerOpen(root, 2, { io, log: quiet }), /layer\/2 was cut ahead for early starts at \S+, and the tranche tranche does not hold it/);
});

test('the rework of early starts: a reschedule, a retest, a provider notice after the start; the rate', () => {
  const at = '2026-11-06T10:00:00Z';
  const rows = { earlies: ['c', 'd', 'e', 'f', 'f'].map((m) => ({ row: 'early', module: m, from: 1, at })), reschedules: [{ user: 'c', at: '2026-11-06T10:30:00Z' }], retests: [{ module: 'd', at: '2026-11-06T10:30:00Z' }, { module: 'e', at: '2026-11-06T09:00:00Z' }] };
  // f's notice came before its start, and a withdrawn notice never counts; f's two rows count once.
  const r = earlyRework(rows, [{ users: ['e'], at: '2026-11-06T11:00:00Z' }, { users: ['f'], at: '2026-11-06T09:00:00Z' }, { users: ['f'], at: '2026-11-06T12:00:00Z', withdrawn: true }]);
  assert.deepEqual(r.each.map((x) => x.rework), ['reschedule', 'retest', 'notice', null]);
  assert.deepEqual([r.early, r.rework, r.rate], [4, 3, 75]);
  assert.deepEqual(earlyRework({ earlies: [], reschedules: [], retests: [] }), { early: 0, rework: 0, rate: null, each: [] });
});

// Cold review of R14: a provider in layer 1 that lands again with an interface change after c started
// early into layer 2 reschedules c there (layerLand), never only a notice c's own land would answer.
test('a provider\'s later interface change reschedules a user that started early into the next layer, while that layer is not open', () => {
  const { root } = product();
  const home = (u) => (u < 'c' ? 1 : 2);
  assert.deepEqual([...earlyUsers(root, SB, 1, ['c', 'd'], home)], [], 'no early start yet');
  earlyCut(root, cfgOf(), 'c', { io, log: quiet });
  assert.deepEqual([...earlyUsers(root, SB, 1, ['c', 'd'], home)], [['c', 2]]);
  // Once layer 2 opens, its own land and reschedule rows govern: not this path.
  writeRows(root, SB, 'layer 2 open', [[flowFile(2, 'open'), { row: 'open', layer: 2, at: new Date().toISOString() }]]);
  fetchState(root, SB, { fresh: true });
  assert.deepEqual([...earlyUsers(root, SB, 1, ['c', 'd'], home)], []);
});
