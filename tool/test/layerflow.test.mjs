// The shared layer branch (layerflow.mjs, layerbase.mjs; design note "Shared Layer Branch", Bob,
// 5 Nov): one test per rule the tool holds, on a local product with a bare origin.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block, parseBlock } from '../lib/github.mjs';
import { jobStart, jobSync, startText } from '../lib/job.mjs';
import { bobPrompt } from '../lib/roles.mjs';
import { layerLines } from '../lib/layerflow.mjs';
import { flowFile, jobCfg, layerMap } from '../lib/layerbase.mjs';
import {
  flowRows, interfaceChange, interfaceText, layerCover, layerJobs, layerLand, layerMerge, layerOpen, layerPublish, layerReport, layerRetest,
  layerStatus, layerSync, moduleStates, outstanding, providesText, resultChanges, startable, trialMeasures, writeRows, timeBudget, budgetLine,
} from '../lib/layerflow.mjs';
import { checkLedger } from '../lib/ledger.mjs';
import { fetchState, readState } from '../lib/state.mjs';
import { Fail, configOf, git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const SB = 'process-state';
const req = (id, provides = `- ${id}() returns a thing`) => `# ${id} — requirements\n\n## Public\n\n### Purpose\n\n${id} does things.\n\n### Provides\n\n${provides}\n\n## Private\n\n### Uses\n\nnothing\n\n**R1** a requirement *(not yet met: T1)*\n`;
const modules = { modules: [{ id: 'a', uses: [] }, { id: 'b', uses: ['a'] }, { id: 'c', uses: [] }, { id: 'd', uses: ['a'] }] };
const layers = '# The layers\n\n| layer | name | modules |\n| --- | --- | --- |\n| 1 | One | a, b, c |\n| 2 | Two | d |\n';

// A product on the tranche with a bare origin: modules a, b (uses a), c in layer 1, d (uses a) in layer 2.
function product({ strategy = 'layer', over = {}, done = false, config = {} } = {}) {
  const files = {
    'process/config.json': { merge_strategy: strategy, modules_file: 'build/modules.json', ...config },
    'build/layers.md': layers,
    'build/modules.json': modules,
  };
  for (const id of ['a', 'b', 'c', 'd']) {
    files[`process/ledger/${id}.json`] = entry(id, { layer: id === 'd' ? 2 : 1, ...(done ? { status: { state: 'COMPLETE' } } : {}), ...(over[id] || {}) });
    files[`req/${id}.md`] = done ? req(id).replace(' *(not yet met: T1)*', '') : req(id);
    files[`test/${id}/t.test.mjs`] = "import test from 'node:test'; test('ok', () => {});\n";
  }
  files['src/a/index.mjs'] = 'export function a(x) { return x; }\n';
  files['src/b/index.mjs'] = "import { a } from '../a/index.mjs';\nexport const b = () => a(1);\n";
  files['src/c/index.mjs'] = 'export const c = 1;\n';
  files['src/d/index.mjs'] = "import { a } from '../a/index.mjs';\nexport const d = () => a(2);\n";
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'origin.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  return { root, bare };
}

// A clone of origin for acts that are not the checkout's (GitHub's merges, another job's push).
function clone(bare) {
  const d = join(mkdtempSync(join(tmpdir(), 'p3-clone-')), 'c');
  git(['clone', '-q', bare, d], { cwd: tmpdir() });
  for (const [k, v] of [['user.email', 'noreply@github.com'], ['user.name', 'Test'], ['commit.gpgsign', 'false']]) git(['config', k, v], { cwd: d });
  return d;
}
// GitHub's merge of head into base: a merge commit titled as given, pushed; { sha, merged }.
function ghMerge(bare, base, head, title) {
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'w', `origin/${base}`], { cwd: d });
  git(['fetch', '-q', 'origin', head], { cwd: d });
  git(['merge', '-q', '--no-ff', '-m', title, head], { cwd: d });
  git(['push', '-q', 'origin', `w:${base}`], { cwd: d });
  return { sha: git(['rev-parse', 'HEAD'], { cwd: d }), merged: true };
}
// A job's work on job/<id> cut from layer/<n> (pushed), with its files; returns the head.
function jobWork(bare, id, files, { n = 1, from = `origin/layer/${n}` } = {}) {
  const d = clone(bare);
  git(['checkout', '-q', '-B', `job/${id}`, from], { cwd: d });
  const h = commit(d, files, `work on ${id}`);
  git(['push', '-q', '-f', 'origin', `job/${id}`], { cwd: d });
  return h;
}
const prOf = (n, id, head, extra = {}) => ({ number: n, state: 'open', draft: false, base: { ref: 'layer/1' }, head: { ref: `job/${id}`, sha: head }, ...extra });
const landIO = (bare, prs, { gate = 'success', open = [], comments = () => [] } = {}) => ({
  slug: 'o/p',
  getPR: (s, k) => prs[k],
  checkRun: () => ({ status: 'completed', conclusion: gate }),
  comments,
  openPRs: () => open,
  merge: (s, k, sha, title) => ghMerge(bare, prs[k].base.ref, sha, title),
  // An additive change's retests (layer retest) are their own tests'.
  retest: () => { throw new Error('no retest in this test'); },
});
const openIO = { slug: 'o/p', openPRs: () => [], comments: () => [] };

test('config: merge_strategy is "layer", the only flow: absent reads as layer; "train" or any other value is refused', () => {
  assert.equal(configOf({}).merge_strategy, 'layer');
  assert.equal(configOf({ merge_strategy: 'layer' }).merge_strategy, 'layer');
  assert.throws(() => configOf({ merge_strategy: 'train' }), /merge_strategy "train": the merge train was removed/);
  assert.throws(() => configOf({ merge_strategy: 'batch' }), /merge_strategy "batch": the merge train was removed/);
});

test('layer map: the modules of each layer, from the layers table', () => {
  assert.deepEqual(layerMap(layers), [{ n: 1, mods: ['a', 'b', 'c'] }, { n: 2, mods: ['d'] }]);
});

test('layer open (R15): a census gap in the layer refuses the open, naming the fix; nothing is cut', () => {
  const { root } = product();
  // c's entry names a requirements file the tranche does not hold, and e is in no layer-map line.
  commit(root, { 'process/ledger/c.json': entry('c', { layer: 1, requirements: 'req/gone.md' }), 'build/modules.json': { modules: [...modules.modules, { id: 'e', layer: 1, uses: [] }] } });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  assert.throws(() => layerOpen(root, 1, { io: openIO, log: quiet }), (e) => /layer 1 has 4 gap\(s\) on tranche; land the fixes first, then open the layer; nothing was opened/.test(e.message)
    && /- c \(layer 1\), entry-requirements: its entry names req\/gone\.md/.test(e.message) && /- e \(layer 1\), not-in-layer-map: name e on its layer's line/.test(e.message));
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/layer/1'], { cwd: root }), '', 'nothing cut');
});

test('layer open (PD-4): a COMPLETE module off the layer map is a finding it prints, never a stop', () => {
  const { root } = product();
  commit(root, { 'process/ledger/f.json': entry('f', { layer: 1, status: { state: 'COMPLETE' } }), 'req/f.md': '# f\n', 'build/modules.json': { modules: [...modules.modules, { id: 'f', layer: 1, uses: [] }] } });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const lines = [];
  layerOpen(root, 1, { io: openIO, log: (l) => lines.push(String(l)) });
  assert.ok(lines.some((l) => /^finding: layer 1's module\(s\) f are on no line of build\/layers\.md; BOB names them there \(PD-4: this stops nothing\)/.test(l)), lines.join('\n'));
  assert.notEqual(git(['ls-remote', 'origin', 'refs/heads/layer/1'], { cwd: root }), '', 'the layer is cut');
});

test('layer open: cuts layer/<n> from the tranche tip, records the open, and lists every module that can start', () => {
  const { root } = product();
  const lines = [];
  const r = layerOpen(root, 1, { io: openIO, log: (l) => lines.push(l) });
  assert.equal(r.from, git(['rev-parse', 'origin/tranche'], { cwd: root }));
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/layer/1'], { cwd: root }).split('\t')[0], r.from);
  fetchState(root, SB, { fresh: true });
  assert.equal(JSON.parse(readState(root, SB, flowFile(1, 'open'))).from, r.from);
  // b uses a, which has not landed: listed after the rest (R10).
  assert.deepEqual(r.startable.map((x) => [x.id, x.after || null]), [['a', null], ['c', null], ['b', ['a']]]);
  assert.ok(lines.some((l) => /BOB starts them; no other session creates a job/.test(l)));
  // Again: nothing cut twice, the open kept.
  assert.equal(layerOpen(root, 1, { io: openIO, log: quiet }).from, r.from);
  // The next layer waits for this one's merge.
  assert.throws(() => layerOpen(root, 2, { io: openIO, log: quiet }), /layer 1 is open on layer\/1 and has not merged/);
});

test('job branches: with the switch on, job start cuts job/<id> from layer/<n> and job sync merges the layer, not the tranche', () => {
  const { root } = product();
  git(['branch', 'layer/1', 'tranche'], { cwd: root });
  const cfg = jobCfg(root, configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' }), 'a', { push: false });
  assert.equal(cfg.tranche, 'layer/1');
  assert.deepEqual(cfg.layer, { n: 1, tranche: 'tranche' });
  // A module of a layer with no branch keeps the tranche.
  assert.equal(jobCfg(root, configOf({ merge_strategy: 'layer' }), 'd', { push: false }).tranche, 'tranche');
  // The layer moves past the tranche (another module's land); the job is cut from the layer.
  git(['checkout', '-q', 'layer/1'], { cwd: root });
  const landed = commit(root, { 'src/c/index.mjs': 'export const c = 2;\n' }, 'c landed');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  jobStart(root, 'a', { coordinator: 's', push: false, log: quiet });
  assert.equal(git(['merge-base', '--is-ancestor', landed, 'job/a'], { cwd: root, allowFail: true }).code, 0, 'job/a is cut from layer/1');
  git(['checkout', '-q', 'job/a'], { cwd: root });
  commit(root, { 'src/a/index.mjs': 'export function a(x) { return x + 1; }\n' }, 'work');
  git(['checkout', '-q', 'layer/1'], { cwd: root });
  const later = commit(root, { 'src/c/index.mjs': 'export const c = 3;\n' }, 'c again');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const trancheOnly = commit(root, { 'notes.txt': 'tranche only\n' }, 'tranche moves');
  git(['checkout', '-q', 'job/a'], { cwd: root });
  const s = jobSync(root, 'a', { push: false, log: quiet });
  assert.deepEqual(s.merged, ['layer/1']);
  assert.equal(git(['merge-base', '--is-ancestor', later, 'HEAD'], { cwd: root, allowFail: true }).code, 0);
  assert.notEqual(git(['merge-base', '--is-ancestor', trancheOnly, 'HEAD'], { cwd: root, allowFail: true }).code, 0, 'the tranche is not merged into a layer job');
});

test('no job starts outside an open layer (the layer\'s list starts them)', () => {
  const { root } = product();
  git(['branch', 'layer/1', 'tranche'], { cwd: root });
  assert.throws(() => jobStart(root, 'd', { coordinator: 's', push: false, log: quiet }), /d's layer has no open branch/);
});

test('a layer job\'s START names layer publish and the halt on a reschedule; a tranche job\'s keeps job complete', () => {
  const args = { entry: entry('a'), slug: 'o/p', branch: 'job/a', coordinator: 's', bob: 'b', attempt: 1, reading: { files: [], bytes: 0 } };
  const lay = startText({ ...args, tranche: 'layer/1' });
  assert.match(lay, /layer publish a/);
  assert.match(lay, /stop any test run at once/);
  assert.doesNotMatch(lay, /job complete a --not-verified/);
  assert.match(startText({ ...args, tranche: 'tranche' }), /job complete a --not-verified/);
});

test('BOB starts the layer\'s jobs: status --role bob lists them, and BOB\'s prompt names them in place of job start --ready', async () => {
  const { root } = product();
  const cfg = configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' });
  fetchState(root, SB, { fresh: true });
  assert.deepEqual(layerLines(root, cfg, { slug: 'o/p', io: openIO }), ['layer flow: layer 1 is next and not open: `node .process/tool/p3.mjs layer open 1`']);
  layerOpen(root, 1, { io: openIO, log: quiet });
  const lines = layerLines(root, cfg, { slug: 'o/p', io: openIO });
  assert.match(lines[0], /layer 1 open on layer\/1; .*not started 3/);
  assert.ok(lines.includes('- node .process/tool/p3.mjs job start a --live <n>'));
  assert.ok(lines.some((l) => /yours to start, BOB/.test(l)));
  const p = bobPrompt({ slug: 'o/p', rootId: 'r', approvals: 'a'.repeat(64) });
  assert.match(p, /jobs to start.*layer jobs <n>/);
  assert.doesNotMatch(p, /job start --ready/);
});

test('take-in is refused in the layer flow', () => {
  const { root } = product();
  git(['branch', 'layer/1', 'tranche'], { cwd: root });
  assert.throws(() => jobStart(root, 'a', { coordinator: 's', push: false, takeIn: 'old', log: quiet }), /job start --take-in is not part of the layer flow/);
});

test('Public / Provides: the section under ## Public, unmet marks and spacing left out; null without one', () => {
  assert.equal(providesText(req('a', '- a(x)   returns x\n- b() *(not yet met: T4)*')), '- a(x) returns x\n- b()');
  assert.equal(providesText('# x\n\n## Private\n\n### Provides\n\n- hidden\n'), null);
  assert.equal(providesText(req('a', '- a(x)')), providesText(req('a', '-  a(x)  ')));
});

test('interface signal (R8): an export added, removed or of another kind counts; a parameter change, a Provides rewording or an inner change does not, though the old rule fired', () => {
  const { root } = product();
  const cfg = configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const inner = commit(root, { 'src/a/index.mjs': 'export function a(x) { const y = x; return y; }\n' }, 'inner');
  assert.equal(interfaceChange(root, cfg, 'a', base, inner).changed, false, 'implementation only');
  const sig = commit(root, { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\n' }, 'signature');
  const s1 = interfaceChange(root, cfg, 'a', inner, sig);
  assert.deepEqual([s1.changed, s1.triggers, s1.triggers_old], [false, [], ['exports']], 'a parameter change is recorded, not a trigger');
  assert.match(interfaceText(s1), /changed the parameters of a function\(x\) -> function\(x, y\) \(not a trigger\)/);
  const added = commit(root, { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\nexport const a2 = 1;\n' }, 'added');
  const s2 = interfaceChange(root, cfg, 'a', sig, added);
  assert.deepEqual([s2.changed, s2.triggers], [true, ['exports']]);
  assert.deepEqual(s2.class, 'additive');
  assert.match(interfaceText(s2), /^added a2; additive: each user is retested by its gate alone$/);
  const kind = commit(root, { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\nexport function a2() { return 1; }\n' }, 'kind');
  const k = interfaceChange(root, cfg, 'a', added, kind);
  assert.match(interfaceText(k), /changed the kind of a2 value -> function\(\).*breaking/);
  const gone = commit(root, { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\n' }, 'removed');
  const g = interfaceChange(root, cfg, 'a', kind, gone);
  assert.deepEqual([g.exports.removed, g.class], [['a2'], 'breaking']);
  const marks = commit(root, { 'req/a.md': req('a').replace(' *(not yet met: T1)*', '') }, 'mark struck');
  assert.equal(interfaceChange(root, cfg, 'a', gone, marks).changed, false, 'a struck mark outside Provides');
  const prov = commit(root, { 'req/a.md': req('a', '- a(x, y) returns their sum') }, 'provides');
  const p = interfaceChange(root, cfg, 'a', marks, prov);
  assert.deepEqual([p.changed, p.triggers_old], [false, ['provides-text']], 'a Provides rewording is a notice, not a reschedule');
  assert.ok(p.provides);
});

test('interface signal (R8): a provider test naming a Provides requirement counts only when what it asserts changes; its name or id label alone does not', () => {
  const { root } = product();
  const cfg = configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' });
  const t = (name, want) => `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { a } from '../../src/a/index.mjs';\ntest('${name}', () => { assert.deepEqual(a(1), ${want}); });\n`;
  const base = commit(root, { 'req/a.md': req('a', '- **R2** `a(x)` answers the list of materials\n- **R3** more'), 'test/a/r2.test.mjs': t('R2 answers a list', '[1]'), 'test/a/other.test.mjs': "import test from 'node:test'; test('R9 private', () => {});\n" }, 'R2 in Provides');
  // Only its name and id label change: no trigger, though the old rule fired.
  const label = commit(root, { 'test/a/r2.test.mjs': `// the list\n${t('R3 answers the list of materials', '[1]')}` }, 'label');
  const l = interfaceChange(root, cfg, 'a', base, label);
  assert.deepEqual([l.changed, l.triggers_old], [false, ['provides-test']]);
  // The answer's shape changes ({materials: [...]}): the expected value changes, the exports do not.
  const shape = commit(root, { 'src/a/index.mjs': 'export function a(x) { return { materials: [x] }; }\n', 'test/a/r2.test.mjs': t('R2 answers {materials: [...]}', '{ materials: [1] }') }, 'shape');
  const x = interfaceChange(root, cfg, 'a', label, shape);
  assert.equal(x.exports, null);
  assert.equal(x.provides, null);
  assert.deepEqual(x.provides_tests, ['test/a/r2.test.mjs']);
  assert.deepEqual(x.triggers, ['provides-test']);
  assert.match(interfaceText(x), /r2\.test\.mjs: breaking/);
  // A test of a requirement not in Provides changes nothing.
  const priv = commit(root, { 'test/a/other.test.mjs': "import test from 'node:test'; test('R9 private, again', () => {});\n" }, 'private test');
  assert.equal(interfaceChange(root, cfg, 'a', shape, priv).changed, false);
});

test('interface signal (R8): a new test file naming a Provides requirement is additive; one replacing a deleted file is compared with it (copy PR 696)', () => {
  const { root } = product();
  const cfg = configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' });
  const t = (name, want) => `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { a } from '../../src/a/index.mjs';\ntest('${name}', () => { assert.deepEqual(a(1), ${want}); });\n`;
  const base = commit(root, { 'req/a.md': req('a', '- **R2** `a(x)` answers the list of materials\n- **R3** more'), 'test/a/r2.test.mjs': t('R2 answers a list', '[1]') }, 'R2 in Provides');
  const added = commit(root, { 'test/a/t53-layer.test.mjs': t('R2 per layer', '[1]') }, 'a new test file');
  const x = interfaceChange(root, cfg, 'a', base, added);
  assert.deepEqual(x.provides_test_changes.map((c) => [c.file, c.class]), [['test/a/t53-layer.test.mjs', 'additive']]);
  assert.equal(x.class, 'additive');
  // A new file replacing a deleted one (a rename) is compared with it: its changed answer is breaking.
  git(['rm', '-q', 'test/a/r2.test.mjs'], { cwd: root });
  const moved = commit(root, { 'test/a/r2-list.test.mjs': t('R2 answers a list', '{ materials: [1] }') }, 'renamed and changed');
  const y = interfaceChange(root, cfg, 'a', added, moved);
  assert.deepEqual(y.provides_test_changes.map((c) => [c.file, c.class]), [['test/a/r2-list.test.mjs', 'breaking'], ['test/a/r2.test.mjs', 'none']]);
  assert.match(y.provides_test_changes[0].why, /^replaces test\/a\/r2\.test\.mjs: /);
  assert.equal(y.class, 'breaking');  // A Provides requirement renamed (R2 to R5), its test deleted and a new one added: the deleted test
  // is examined by the ids before, so the change is breaking, never additive (cold review of R8).
  git(['rm', '-q', 'test/a/r2-list.test.mjs'], { cwd: root });
  const renamed = commit(root, { 'req/a.md': req('a', '- **R5** `a(x)` answers the materials\n- **R3** more'), 'test/a/r5.test.mjs': t('R5 answers', '{ materials: [1] }') }, 'R2 renamed R5');
  const z = interfaceChange(root, cfg, 'a', moved, renamed);
  assert.deepEqual(z.provides_test_changes.map((c) => [c.file, c.class]), [['test/a/r2-list.test.mjs', 'breaking'], ['test/a/r5.test.mjs', 'additive']]);
  assert.equal(z.class, 'breaking');  // The coordinator's ruling (6 Nov): a new file naming an existing Provides requirement while the
  // provider's source changed may assert a changed answer ({materials: [...]}, exports unchanged):
  // breaking. One naming only a requirement new in this land stays additive.
  const shape = commit(root, { 'src/a/index.mjs': 'export function a(x) { return { materials: [x] }; }\n', 'test/a/r5-shape.test.mjs': t('R5 answers {materials}', '{ materials: [1] }') }, 'shape, a new test');
  const w = interfaceChange(root, cfg, 'a', renamed, shape);
  assert.equal(w.exports, null, 'exports unchanged');
  assert.deepEqual(w.provides_test_changes.map((c) => [c.file, c.class]), [['test/a/r5-shape.test.mjs', 'breaking']]);
  assert.match(w.provides_test_changes[0].why, /^added, naming R5 \(Provides before this land\) while a's source changed: it may assert a changed answer$/);
  assert.equal(w.class, 'breaking');
  const fresh = commit(root, { 'req/a.md': req('a', '- **R5** `a(x)` answers the materials\n- **R3** more\n- **R7** `a2()` is new'), 'src/a/index.mjs': 'export function a(x) { return { materials: [x] }; }\nexport const a2 = () => 1;\n', 'test/a/r7.test.mjs': t('R7 answers', '1') }, 'a new requirement, its new test');
  const v = interfaceChange(root, cfg, 'a', shape, fresh);
  assert.deepEqual(v.provides_test_changes.map((c) => [c.file, c.class]), [['test/a/r7.test.mjs', 'additive']]);
  assert.equal(v.class, 'additive');
});

test('module states: rescheduled until a land holds the provider\'s land; deferred when BLOCKED; complete after a land', () => {
  const anc = (a, b) => b === 'h2' && a === 'L1';
  const entries = new Map([['a', { status: { state: 'WORKING' } }], ['b', { status: { state: 'COMPLETE' } }], ['c', { status: { state: 'BLOCKED', reason: 'q' } }], ['e', { status: { state: 'OPEN' } }]]);
  const marks = new Map([['e', ['R1']]]);
  const lands = [{ module: 'a', head: 'h0', pr: 1 }, { module: 'b', head: 'h1', pr: 2 }];
  const reschedules = [{ user: 'b', provider: 'a', provider_land: 'L1', key: 'b<-a' }];
  let s = moduleStates({ mods: ['a', 'b', 'c', 'e'], entries, marks, prs: [], lands, reschedules, anc });
  assert.deepEqual(s.map((x) => x.state), ['complete', 'rescheduled', 'deferred', 'not started']);
  assert.deepEqual(startable(s).map((x) => [x.id, /--reopen "re-test against the new interface of a/.test(x.cmd)]), [['b', true], ['e', false]]);
  // b publishes on a tip holding a's land, and lands: the reschedule is answered.
  s = moduleStates({ mods: ['b'], entries, marks, prs: [], lands: [...lands, { module: 'b', head: 'h2', pr: 3 }], reschedules, anc });
  assert.equal(s[0].state, 'complete');
  assert.deepEqual(outstanding(reschedules, [{ module: 'b', head: 'h2' }], 'b', anc), []);
  // A job open on the module: working (a draft) or published (ready).
  s = moduleStates({ mods: ['a', 'e'], entries, marks, prs: [{ module: 'a', number: 7, draft: false }, { module: 'e', number: 8, draft: true }], lands, reschedules: [], anc });
  assert.deepEqual(s.map((x) => x.state), ['published', 'working']);
});

async function opened() {
  const p = product();
  layerOpen(p.root, 1, { io: openIO, log: quiet });
  return p;
}

test('publish: refused when the job branch touches a file outside its module (ARC-2)', async () => {
  const { root, bare } = await opened();
  jobWork(bare, 'b', { 'src/b/index.mjs': "import { a } from '../a/index.mjs';\nexport const b = () => a(3);\n", 'src/c/index.mjs': 'export const c = 9;\n' });
  git(['fetch', '-q', 'origin'], { cwd: root });
  git(['checkout', '-q', '-B', 'job/b', 'origin/job/b'], { cwd: root });
  let ran = false;
  await assert.rejects(layerPublish(root, 'b', { sync: async () => ({ ok: true }), complete: () => { ran = true; return { done: Promise.resolve({ code: 0 }), kill() {} }; }, log: quiet }), /touches files outside b \(ARC-2\): src\/c\/index.mjs/);
  assert.equal(ran, false, 'nothing ran');
});

test('publish: a red run does not publish; a green one is recorded with the layer tip it ran on', async () => {
  const { root, bare } = await opened();
  jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 2;\n' });
  git(['fetch', '-q', 'origin'], { cwd: root });
  git(['checkout', '-q', '-B', 'job/c', 'origin/job/c'], { cwd: root });
  const tip = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  const red = await layerPublish(root, 'c', { sync: async () => ({ ok: true }), complete: () => ({ done: Promise.resolve({ code: 1 }), kill() {} }), log: quiet });
  assert.equal(red.ok, false);
  const green = await layerPublish(root, 'c', { sync: async () => ({ ok: true }), complete: () => ({ done: Promise.resolve({ code: 0 }), kill() {} }), log: quiet });
  assert.equal(green.ok, true);
  fetchState(root, SB, { fresh: true });
  const runs = flowRows(root, SB, 1).runs;
  assert.deepEqual(runs.map((r) => r.result).sort(), ['fail', 'pass']);
  assert.ok(runs.every((r) => r.tested_on === tip));
});

test('halt and restart: a reschedule mid-run kills the run at once, records the minutes lost, and the next round runs on the new tip', async () => {
  const { root, bare } = await opened();
  jobWork(bare, 'b', { 'src/b/index.mjs': "import { a } from '../a/index.mjs';\nexport const b = () => a(4);\n" });
  git(['fetch', '-q', 'origin'], { cwd: root });
  git(['checkout', '-q', '-B', 'job/b', 'origin/job/b'], { cwd: root });
  // a lands on the layer while b's first run goes; the land's reschedule names b.
  const aHead = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\nexport const a2 = 1;\n' });
  let killed = 0;
  let round = 0;
  const tips = [];
  const res = await layerPublish(root, 'b', {
    every: 20,
    sync: async () => { git(['fetch', '-q', 'origin'], { cwd: root }); if (round > 0) git(['merge', '-q', '--no-edit', 'origin/layer/1'], { cwd: root }); return { ok: true }; },
    complete: () => {
      round++;
      tips.push(git(['rev-parse', 'origin/layer/1'], { cwd: root }));
      if (round === 1) {
        let end;
        const done = new Promise((r) => { end = r; });
        const land = ghMerge(bare, 'layer/1', aHead, 'Merge layer PR 5');
        const w = clone(bare);
        writeRows(w, SB, 'reschedule', [[flowFile(1, 'reschedule', 'b-a-x'), { row: 'reschedule', layer: 1, user: 'b', provider: 'a', provider_land: land.sha, at: new Date().toISOString(), key: 'b<-a' }]]);
        return { done, kill: () => { killed++; end({ code: 143 }); } };
      }
      return { done: Promise.resolve({ code: 0 }), kill() {} };
    },
    log: quiet,
  });
  assert.equal(killed, 1, 'the first run was killed');
  assert.equal(res.ok, true);
  assert.equal(res.round, 2);
  assert.notEqual(tips[0], tips[1], 'the second round ran on the new layer tip');
  fetchState(root, SB, { fresh: true });
  const runs = flowRows(root, SB, 1).runs;
  const halted = runs.find((r) => r.result === 'halted');
  assert.ok(halted && halted.minutes_lost >= 0 && halted.by.includes('b<-a'));
  assert.equal(runs.find((r) => r.result === 'pass').round, 2);
});

test('land: refused on a gate that is not green, and on a file outside the module', async () => {
  const { root, bare } = await opened();
  const h = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 2;\n' });
  await assert.rejects(layerLand(root, 3, { io: landIO(bare, { 3: prOf(3, 'c', h) }, { gate: 'failure' }), log: quiet }), /gate on .* is completed failure/);
  const h2 = jobWork(bare, 'c', { 'src/a/index.mjs': 'export const z = 1;\n' });
  await assert.rejects(layerLand(root, 4, { io: landIO(bare, { 4: prOf(4, 'c', h2) }), log: quiet }), /changes files outside c \(ARC-2\): src\/a\/index.mjs/);
});

test('land: no combined re-test; an interface change reschedules users in the layer and leaves a notice for later layers', async () => {
  const { root, bare } = await opened();
  // c lands first; a's PR is behind the layer tip and lands anyway (disjoint files).
  const hc = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 2;\n' });
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\nexport const a2 = 1;\n' });
  const prs = { 1: prOf(1, 'c', hc), 2: prOf(2, 'a', ha) };
  const lines = [];
  const rc = await layerLand(root, 1, { io: landIO(bare, prs), log: quiet });
  assert.equal(rc.land.interface.changed, false);
  assert.deepEqual(rc.land.users_rescheduled, []);
  const ra = await layerLand(root, 2, { io: landIO(bare, prs, { open: [{ number: 9, head: { ref: 'job/b' } }] }), log: (l) => lines.push(l) });
  assert.equal(ra.land.interface.changed, true);
  assert.deepEqual(ra.land.users_rescheduled, ['b']);
  assert.deepEqual(ra.land.users_noticed, ['d']);
  assert.ok(lines.some((l) => /BOB delivers to job b's session \(PR 9\), with send_message priority now: .*Halt any test run now/.test(l)));
  fetchState(root, SB, { fresh: true });
  const rows = flowRows(root, SB, 1);
  assert.equal(rows.reschedules.length, 1);
  assert.equal(rows.reschedules[0].provider_land, ra.land.merge);
  assert.deepEqual(rows.reschedules[0].triggers, ['exports']);
  const notice = JSON.parse(readState(root, SB, 'notices/a-2.json'));
  assert.deepEqual(notice.users, ['d']);
});

test('land: a run that started before a provider\'s newest interface change never counts', async () => {
  const { root, bare } = await opened();
  const hb = jobWork(bare, 'b', { 'src/b/index.mjs': "import { a } from '../a/index.mjs';\nexport const b = () => a(5);\n" });
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\nexport const a2 = 1;\n' });
  const prs = { 1: prOf(1, 'a', ha), 2: prOf(2, 'b', hb) };
  await layerLand(root, 1, { io: landIO(bare, prs), log: quiet });
  await assert.rejects(layerLand(root, 2, { io: landIO(bare, prs), log: quiet }), /started before a's interface change .* it never counts/);
  // b brings itself up to the layer tip and publishes again: its land counts and answers the reschedule.
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'job/b', 'origin/job/b'], { cwd: d });
  git(['merge', '-q', '--no-edit', 'origin/layer/1'], { cwd: d });
  git(['push', '-q', 'origin', 'job/b'], { cwd: d });
  const hb2 = git(['rev-parse', 'HEAD'], { cwd: d });
  prs[3] = prOf(3, 'b', hb2);
  await layerLand(root, 3, { io: landIO(bare, prs), log: quiet });
  const st = layerStatus(root, 1, { io: openIO, log: quiet }).states;
  assert.equal(st.find((s) => s.id === 'b').state, 'complete');
});

test('jobs and merge: a rescheduled module whose PR landed is listed to reopen; the layer merges only when every module is complete or deferred', async () => {
  const { root, bare } = await opened();
  const hb = jobWork(bare, 'b', { 'src/b/index.mjs': "import { a } from '../a/index.mjs';\nexport const b = () => a(6);\n" });
  const hc = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 2;\n' });
  const prs = { 1: prOf(1, 'b', hb), 2: prOf(2, 'c', hc) };
  await layerLand(root, 1, { io: landIO(bare, prs), log: quiet });
  await layerLand(root, 2, { io: landIO(bare, prs), log: quiet });
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export class a { constructor(x, y) { this.v = x * y; } }\n' });
  prs[3] = prOf(3, 'a', ha);
  await layerLand(root, 3, { io: landIO(bare, prs), log: quiet });
  const j = layerJobs(root, 1, { io: openIO, log: quiet });
  assert.deepEqual(j.startable.map((x) => x.id), ['b']);
  // b is OPEN (it never ran): a plain start, never --reopen (coordinator, 6 Nov 16:03).
  assert.equal(j.startable[0].cmd, 'node .process/tool/p3.mjs job start b --live <n>');
  const mio = (extra = {}) => ({ slug: 'o/p', openPRs: () => [], findPR: () => null, createPR: (s, p) => ({ number: 50, ...p, base: { ref: p.base } }), checkRun: () => ({ status: 'completed', conclusion: 'success' }), merge: (s, k, sha, title) => ghMerge(bare, 'tranche', sha, title), ...extra });
  await assert.rejects(layerMerge(root, 1, { io: mio(), wait: false, log: quiet }), /b is rescheduled/);
  // b's job re-runs on the new tip and lands; now the layer merges, with no test run.
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'job/b', 'origin/job/b'], { cwd: d });
  git(['merge', '-q', '--no-edit', 'origin/layer/1'], { cwd: d });
  git(['push', '-q', 'origin', 'job/b'], { cwd: d });
  prs[4] = prOf(4, 'b', git(['rev-parse', 'HEAD'], { cwd: d }));
  await layerLand(root, 4, { io: landIO(bare, prs), log: quiet });
  // An open publish PR holds the merge.
  await assert.rejects(layerMerge(root, 1, { io: mio({ openPRs: () => [{ number: 60, draft: true, head: { ref: 'job/c' } }] }), wait: false, log: quiet }), /c is working/);
  const m = await layerMerge(root, 1, { io: mio(), wait: false, log: quiet });
  assert.equal(m.ok, true);
  fetchState(root, SB, { fresh: true });
  assert.equal(JSON.parse(readState(root, SB, flowFile(1, 'merged'))).layer, 1);
  const closed = readState(root, SB, 'layers/closed.jsonl').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(closed.map((r) => [r.layer, r.by, r.suites.length]), [[1, 'layer merge', 0]]);
  git(['fetch', '-q', 'origin'], { cwd: root });
  assert.equal(git(['merge-base', '--is-ancestor', 'origin/layer/1', 'origin/tranche'], { cwd: root, allowFail: true }).code, 0);
  // Now layer 2 opens; a merged layer no longer bases its modules' jobs.
  assert.equal(layerOpen(root, 2, { io: openIO, log: quiet }).ok, true);
  assert.equal(jobCfg(root, configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' }), 'a').tranche, 'tranche');
  // The trial's measures.
  const rep = layerReport(root, 1, { log: quiet }).measures;
  assert.equal(rep.lands, 4);
  assert.equal(rep.reschedules, 1);
  assert.equal(typeof rep.hours_open_to_merged, 'number');
});

// The time budget (R9): the land records the PR's gate runs as state rows (the gate's own token
// only reads), and layer report sums each module's starts, wall, local test, gate and work minutes.
test('time budget: a land writes its gate runs as rows; layer report sums them with the test and publish runs', async () => {
  const { root, bare } = await opened();
  const hc = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 3;\n' });
  const prs = { 1: prOf(1, 'c', hc) };
  const gateRows = [
    { sha: hc, run_id: 71, at: '2026-11-06T10:00:00Z', trigger: 'record', suite: 'skipped', ok: true, minutes: 0.5 },
    { sha: hc, run_id: 72, at: '2026-11-06T10:10:00Z', trigger: 'code', suite: 'pass', ok: true, minutes: 6, scope: ['c'], suite_seconds: 240, suite_by_module: { c: 240 } },
    // GitHub's re-run of run 72 keeps its run id: its own row, not lost to the first.
    { sha: hc, run_id: 72, run_attempt: 2, at: '2026-11-06T10:20:00Z', trigger: 'code', suite: 'pass', ok: true, minutes: 5, scope: ['c'], suite_seconds: 180, suite_by_module: { c: 180 } },
  ];
  const comments = () => [{ user: { login: BOT }, body: block(GATE, { runs: gateRows }) }];
  await layerLand(root, 1, { io: landIO(bare, prs, { comments }), log: quiet });
  fetchState(root, SB, { fresh: true });
  const rows = flowRows(root, SB, 1);
  assert.deepEqual(rows.gates.map((g) => [g.module, g.pr, g.run_id, g.run_attempt, g.minutes, g.suite_minutes, g.record_only]), [['c', 1, 71, null, 0.5, null, true], ['c', 1, 72, null, 6, 4, false], ['c', 1, 72, 2, 5, 3, false]]);
  // A p3 test run and a publish run of c, after the opening.
  const open = rows.open.at;
  const later = (m) => new Date(Date.parse(open) + m * 60000).toISOString();
  writeRows(root, SB, 'rows', [
    [flowFile(1, 'test', 'c-1'), { row: 'test', layer: 1, module: 'c', session: 'session_x', started: later(1), ended: later(3), at: later(3), minutes: 2, result: 'pass' }],
    [flowFile(1, 'run', 'c-1'), { row: 'run', layer: 1, module: 'c', round: 1, started: later(4), ended: later(7), at: later(7), minutes: 3, result: 'pass' }],
  ]);
  const rep = layerReport(root, 1, { log: quiet }).measures.time_budget;
  const c = rep.per_module.find((x) => x.id === 'c');
  // The publish run runs no suite (job complete; the gate runs it): apart from the tests.
  assert.deepEqual([c.test_runs, c.local_test_minutes, c.publish_runs, c.publish_minutes, c.gate_runs, c.gate_minutes, c.gate_suite_minutes, c.gate_record_only_minutes], [1, 2, 1, 3, 3, 11.5, 7, 0.5]);
  assert.equal(rep.total.gate_minutes, 11.5);
});

test('time budget: wall from each start to its complete, work is wall minus local tests, null when unknown', () => {
  const at = (m) => new Date(Date.UTC(2026, 10, 6, 10, m)).toISOString();
  const attempts = {
    a: [
      { row: 'attempt', event: 'start', attempt: 1, at: at(0) }, { row: 'attempt', event: 'complete', attempt: 1, at: at(30) },
      { row: 'attempt', event: 'start', attempt: 2, at: at(40) }, { row: 'attempt', event: 'complete', attempt: 2, at: at(50) },
      { row: 'attempt', event: 'start', attempt: 0, at: '2026-11-05T00:00:00Z' }, // before the opening
    ],
    b: [{ row: 'attempt', event: 'start', attempt: 1, at: at(5) }], // still open: wall unknown
  };
  // a's tests: one inside its first attempt (counted against its wall), one after its last
  // complete (a gate-red fix: no wall here, so not subtracted from work).
  const tests = [{ module: 'a', minutes: 4, started: at(16), ended: at(20), at: at(20) }, { module: 'a', minutes: 2, started: at(55), ended: at(57), at: at(57) }, { module: 'b', minutes: 3, started: at(6), ended: at(9), at: at(9) }];
  const runs = [{ module: 'a', minutes: 6, at: at(29) }];
  const gates = [{ module: 'a', minutes: 7, suite_minutes: 5, record_only: false }, { module: 'a', minutes: 1, suite_minutes: null, record_only: true }, { module: 'a', minutes: null, suite_minutes: null, record_only: false }];
  const b = timeBudget(['b', 'a'], { attempts, tests, runs, gates, since: '2026-11-06T09:00:00Z' });
  assert.deepEqual(b.per_module.map((x) => [x.id, x.starts, x.open_attempts, x.wall_minutes, x.local_test_minutes, x.tests_in_wall_minutes, x.publish_minutes, x.gate_minutes, x.gate_unknown_runs, x.gate_suite_minutes, x.gate_record_only_minutes, x.work_minutes]), [
    ['a', 2, 0, 40, 6, 4, 6, 8, 1, 5, 1, 36],
    ['b', 1, 1, null, 3, 0, 0, 0, 0, 0, 0, null],
  ]);
  assert.deepEqual(b.total, { starts: 3, wall_minutes: 40, wall_unknown_modules: 1, local_test_minutes: 9, publish_minutes: 6, gate_minutes: 8, gate_unknown_runs: 1, gate_suite_minutes: 5, gate_record_only_minutes: 1, work_minutes: 36, test_share: 0.1, test_per_work: 0.11 });
  assert.equal(budgetLine(b), 'time budget: 3 start(s); wall 40 min (1 module(s) unknown); local tests 9 min; publish runs 6 min; gate 8 min on landed PRs (suites 5, record-only 1, 1 run(s) of unknown length); work 36 min; tests 10% of wall, 0.11 per minute of work');
  // Nothing known: nulls, never a guess.
  const none = timeBudget(['b'], { attempts: { b: attempts.b } });
  assert.deepEqual([none.total.wall_minutes, none.total.work_minutes, none.total.test_share, none.total.test_per_work], [null, null, null, null]);
});

test('layer merge refuses a committed generated file stale on the layer, naming the file and its regenerate (the coordinator, 6 Nov: order.mjs)', async () => {
  const { root, bare } = product({ done: true, config: { generated: [{ paths: ['gen/order.mjs'], regenerate: ['node', '-e', "require('fs').writeFileSync('gen/order.mjs','new\\n')"], verify: ['node', '-e', '0'] }] } });
  commit(root, { 'gen/order.mjs': 'old\n' }, 'a committed generated file, stale');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  layerOpen(root, 1, { io: openIO, log: quiet });
  const mio = { slug: 'o/p', openPRs: () => [], findPR: () => null, createPR: () => assert.fail('no PR on a stale file'), checkRun: () => ({ status: 'completed', conclusion: 'success' }), merge: (s, k, sha, title) => ghMerge(bare, 'tranche', sha, title) };
  const lines = [];
  await assert.rejects(layerMerge(root, 1, { io: mio, wait: false, log: (l) => lines.push(l) }), /layer 1 cannot merge: the layer checks found 1 finding/);
  assert.ok(lines.some((l) => /^generated: gen\/order\.mjs: gen\/order\.mjs is stale on layer\/1 \S+: run node -e .* and commit it \(a plain pull request into layer\/1\), then .*layer merge 1 again$/.test(l)), lines.join('\n'));
});

test('layer merge runs the layer checks but no module suite: a red entry check refuses the merge; green, it merges and still no suite ran', async () => {
  const marker = join(mkdtempSync(join(tmpdir(), 'p3-mark-')), 'suite-ran');
  const suite = { cwd: '.', command: ['node', '-e', `require('fs').writeFileSync(${JSON.stringify(marker)}, '1')`, '--test'] };
  const flag = join(mkdtempSync(join(tmpdir(), 'p3-flag-')), 'red');
  const check = ['node', '-e', `process.exit(require('fs').existsSync(${JSON.stringify(flag)}) ? 3 : 0)`];
  const { root, bare } = product({ done: true, over: { a: { suite }, b: { suite }, c: { suite, checks: [check] } } });
  layerOpen(root, 1, { io: openIO, log: quiet });
  const { writeFileSync, existsSync } = await import('node:fs');
  writeFileSync(flag, '1');
  const mio = { slug: 'o/p', openPRs: () => [], findPR: () => null, createPR: (s, p) => ({ number: 70, ...p, base: { ref: p.base } }), checkRun: () => ({ status: 'completed', conclusion: 'success' }), merge: (s, k, sha, title) => ghMerge(bare, 'tranche', sha, title) };
  let opened = 0;
  await assert.rejects(layerMerge(root, 1, { io: { ...mio, createPR: (...a) => { opened++; return mio.createPR(...a); } }, wait: false, log: quiet }), /the layer checks found 1 finding\(s\).*no module suite ran/);
  assert.equal(opened, 0, 'no PR opened on a red layer check');
  assert.equal(existsSync(marker), false, 'no module suite ran');
  const { rmSync } = await import('node:fs');
  rmSync(flag);
  assert.equal((await layerMerge(root, 1, { io: mio, wait: false, log: quiet })).ok, true);
  assert.equal(existsSync(marker), false, 'no module suite ran at the merge either');
});

test('the gate\'s layer trigger: each module covered by a verified green land; a provider\'s later interface change is a finding, nothing re-runs', async () => {
  const { root, bare } = await opened();
  const hc = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 2;\n' });
  const hb = jobWork(bare, 'b', { 'src/b/index.mjs': "import { a } from '../a/index.mjs';\nexport const b = () => a(7);\n" });
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x - y; }\nexport const a2 = 1;\n' });
  const prs = { 1: prOf(1, 'c', hc), 2: prOf(2, 'b', hb), 3: prOf(3, 'a', ha) };
  const mergedAs = {};
  const io0 = landIO(bare, prs);
  const io = { ...io0, merge: (s, k, sha, t) => { const r = io0.merge(s, k, sha, t); mergedAs[k] = r.sha; return r; } };
  await layerLand(root, 1, { io, log: quiet });
  await layerLand(root, 2, { io, log: quiet });
  await layerLand(root, 3, { io, log: quiet });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const head = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  const mb = git(['merge-base', head, 'origin/tranche'], { cwd: root });
  const changed = git(['diff', '--name-only', mb, head], { cwd: root }).split('\n').filter(Boolean);
  const entries = ['a', 'b', 'c', 'd'].map((id) => JSON.parse(git(['show', `${head}:process/ledger/${id}.json`], { cwd: root })));
  const merged = Object.fromEntries(Object.entries(prs).map(([k, p]) => [k, { ...p, merged: true, merge_commit_sha: mergedAs[k] }]));
  const gio = { getPR: (s, k) => merged[k], verify: () => true };
  const runsOf = (k) => [{ sha: prs[k].head.sha, ok: true, trigger: 'code', suite: 'pass', scope: [prs[k].head.ref.slice(4)] }];
  const cfg = configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' });
  // The gate rows are read through io.comments, as the gate's job post writes them.
  const cover = (over = {}) => layerCover(root, cfg, { head, mb, branch: 'layer/1', changed, entries, slug: 'o/p', io: { ...gio, ...over } });
  const withRows = { comments: (s, k) => [{ user: { login: BOT }, body: block(GATE, { runs: runsOf(k) }, 'gate') }] };
  const r = cover(withRows);
  // b's run did not hold a's interface change (a landed after it): a finding; a and c covered.
  assert.deepEqual(r.covered.map((x) => x.id).sort(), ['a', 'c']);
  assert.equal(r.findings.length, 1);
  assert.match(r.findings[0].message, /b's last green run .* did not hold the interface change of a/);
  // With no verified gate run, a land covers nothing.
  const none = cover({ ...withRows, verify: () => false });
  assert.equal(none.covered.length, 0);
  assert.ok(none.findings.every((f) => f.check === 'layer'));
});

// C13 (the coordinator, 7 Nov): PR 696, opened by the suspended account, reads 404; layer 9's merge
// gate failed on it. A landed PR GitHub no longer serves is judged from the state branch's land row
// for that merge and its gate run's own artifact, recorded pr_unreadable; one with no land row fails closed.
test('the layer gate: a landed PR that reads 404 is covered from its land row and its gate run artifact; with no land row, not covered', async () => {
  const { root, bare } = await opened();
  const hc = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 2;\n' });
  const prs = { 1: prOf(1, 'c', hc) };
  const run = { sha: hc, ok: true, trigger: 'code', suite: 'pass', scope: ['c'], run_id: 77, run_attempt: 1, at: '2026-11-07T01:00:00Z' };
  await layerLand(root, 1, { io: landIO(bare, prs, { comments: () => [{ user: { login: BOT }, body: block(GATE, { runs: [run] }, 'gate') }] }), log: quiet });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const head = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  const mb = git(['merge-base', head, 'origin/tranche'], { cwd: root });
  const changed = git(['diff', '--name-only', mb, head], { cwd: root }).split('\n').filter(Boolean);
  const entries = ['a', 'b', 'c', 'd'].map((id) => JSON.parse(git(['show', `${head}:process/ledger/${id}.json`], { cwd: root })));
  const cfg = configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' });
  const gone = () => { throw new Fail('gh api repos/o/p/pulls/1 failed: gh: Not Found (HTTP 404)'); };
  const seen = [];
  const io = { getPR: gone, comments: gone, runState: () => 'served', runArtifactRow: (s, id) => (id === 77 ? run : null), verify: (s, r, ctx) => { seen.push(ctx); return r.run_id === 77; } };
  const r = layerCover(root, cfg, { head, mb, branch: 'layer/1', changed, entries, slug: 'o/p', io });
  const c = r.covered.find((x) => x.id === 'c');
  assert.ok(c, JSON.stringify(r));
  assert.match(c.pr_unreadable, /HTTP 404/);
  assert.equal(seen[0].merged.branch, 'job/c', 'the run is bound to the module\'s job branch');
  // Not a 404: fails closed, as before.
  assert.throws(() => layerCover(root, cfg, { head, mb, branch: 'layer/1', changed, entries, slug: 'o/p', io: { ...io, getPR: () => { throw new Fail('gh api failed: HTTP 502'); } } }), /HTTP 502/);
  // An artifact that is another run's: not covered (cold review of C13).
  const other = layerCover(root, cfg, { head, mb, branch: 'layer/1', changed, entries, slug: 'o/p', io: { ...io, runArtifactRow: () => ({ ...run, run_id: 78 }) } });
  assert.ok(!other.covered.some((x) => x.id === 'c'));
  // No verified run: not covered, said why.
  const r2 = layerCover(root, cfg, { head, mb, branch: 'layer/1', changed, entries, slug: 'o/p', io: { ...io, verify: () => false } });
  assert.ok(!r2.covered.some((x) => x.id === 'c'));
  assert.ok(r2.findings.some((f) => /c changed with no land|GitHub does not serve the PR/.test(f.message)), JSON.stringify(r2.findings));
});

// Copy PR 735 (the coordinator, 7 Nov): with C13, action-records (PR 696) and actions (PR 715) were
// still not credited. 696's gate run was the suspended account's, hidden with its PR (404); 715's run
// was base-red, which the land takes as green and the cover did not; and 715's attempt ran on
// job/actions-2, which the state's start row names and the ledger before the land did not. A land
// the process recorded credits its commits from the land row and the merge's parents, its run
// verified when GitHub serves it, else its recorded gate row; a read that fails, or a record red or
// missing, is refused.
test('the layer gate: a hidden PR whose run is hidden too stands on its land and gate rows; a base-red run is green; the job branch is the state start row\'s', async () => {
  const { root, bare } = await opened();
  const hc = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 2;\n' });
  const prs = { 1: prOf(1, 'c', hc) };
  const run = { sha: hc, ok: true, trigger: 'code', suite: 'base-red', scope: ['c'], run_id: 77, run_attempt: 1, at: '2026-11-07T01:00:00Z' };
  await layerLand(root, 1, { io: landIO(bare, prs, { comments: () => [{ user: { login: BOT }, body: block(GATE, { runs: [run] }, 'gate') }] }), log: quiet });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const head = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  const mb = git(['merge-base', head, 'origin/tranche'], { cwd: root });
  const changed = git(['diff', '--name-only', mb, head], { cwd: root }).split('\n').filter(Boolean);
  const entries = ['a', 'b', 'c', 'd'].map((id) => JSON.parse(git(['show', `${head}:process/ledger/${id}.json`], { cwd: root })));
  const cfg = configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' });
  const gone = () => { throw new Fail('gh api repos/o/p/pulls/1 failed: gh: Not Found (HTTP 404)'); };
  const seen = [];
  const base = { getPR: gone, comments: gone, runArtifactRow: (s, id) => (id === 77 ? run : null), verify: (s, r, ctx) => { seen.push(ctx); return true; } };
  const cover = (io) => layerCover(root, cfg, { head, mb, branch: 'layer/1', changed, entries, slug: 'o/p', io: { ...base, ...io } });
  // Served: its artifact verified; base-red is green, as the land took it.
  const served = cover({ runState: () => 'served' });
  assert.ok(served.covered.some((x) => x.id === 'c'), JSON.stringify(served.findings));
  // Hidden with the PR: credited from the land's gate row, said so; the artifact is never asked.
  const hidden = cover({ runState: () => 'gone', runArtifactRow: () => { throw new Error('not asked'); } });
  const c = hidden.covered.find((x) => x.id === 'c');
  assert.ok(c, JSON.stringify(hidden.findings));
  assert.match(c.run_unreadable, /run 77: GitHub does not serve it; the land's gate row, base-red/);
  // A run that could not be read at all (not a 404): refused, said why.
  const unread = cover({ runState: () => null });
  assert.ok(!unread.covered.some((x) => x.id === 'c'));
  assert.ok(unread.findings.some((f) => /c changed with no land/.test(f.message)), JSON.stringify(unread.findings));
  // A red recorded run, hidden: refused.
  writeRows(root, SB, 'a red rerun', [[flowFile(1, 'gate', 'c-1-78-1'), { row: 'gate', layer: 1, module: 'c', pr: 1, sha: hc, run_id: 78, run_attempt: 1, at: '2026-11-07T02:00:00Z', trigger: 'code', suite: 'fail', ok: false }]]);
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  const red = cover({ runState: () => 'gone' });
  assert.ok(!red.covered.some((x) => x.id === 'c'), 'the newest recorded run is red');
  // The job branch: the state's start row before the land, over the ledger's.
  writeRows(root, SB, 'start', [[flowFile(1, 'start', 'c-2-1'), { row: 'start', layer: 1, module: 'c', attempt: 2, branch: 'job/c-2', at: '2000-01-01T00:00:00Z' }]]);
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  seen.length = 0;
  cover({ runState: () => 'served', runArtifactRow: (s, id) => ({ ...run, run_id: id }) });
  assert.equal(seen.at(-1)?.merged.branch, 'job/c-2');
});

test('trial measures: a reschedule that changed its user\'s result is counted, and halted minutes are summed', () => {
  const runs = [
    { module: 'b', result: 'pass', started: '2026-11-05T10:00:00Z', ended: '2026-11-05T10:10:00Z', tested_on: 't0' },
    { module: 'b', result: 'halted', started: '2026-11-05T10:20:00Z', ended: '2026-11-05T10:25:00Z', minutes_lost: 5, tested_on: 't0' },
    { module: 'b', result: 'fail', started: '2026-11-05T10:30:00Z', ended: '2026-11-05T10:40:00Z', tested_on: 't1' },
    { module: 'e', result: 'pass', started: '2026-11-05T10:00:00Z', ended: '2026-11-05T10:05:00Z', tested_on: 't0' },
    { module: 'e', result: 'pass', started: '2026-11-05T10:30:00Z', ended: '2026-11-05T10:35:00Z', tested_on: 't1' },
  ];
  const reschedules = [
    { user: 'b', provider: 'a', provider_land: 'L', at: '2026-11-05T10:22:00Z', key: 'b<-a' },
    { user: 'e', provider: 'a', provider_land: 'L', at: '2026-11-05T10:22:00Z', key: 'e<-a' },
    { user: 'f', provider: 'a', provider_land: 'L', at: '2026-11-05T10:22:00Z', key: 'f<-a' },
  ];
  const anc = (a, b) => b === 't1';
  const c = resultChanges(reschedules, runs, anc);
  assert.deepEqual([c.changed, c.unchanged, c.unknown], [1, 1, 1]);
  const m = trialMeasures({ open: { at: '2026-11-05T09:00:00Z' }, merged: { at: '2026-11-05T12:00:00Z' }, runs, lands: [{ module: 'b', gate_runs: 2, interface: { changed: false } }], reschedules }, { anc });
  assert.equal(m.hours_open_to_merged, 3);
  assert.equal(m.halted_runs, 1);
  assert.equal(m.minutes_lost_to_halts, 5);
  assert.equal(m.gate_runs, 2);
});

test('the gate: a ready job PR into a layer branch runs its suite even when it changes only records; into the tranche it does so only to check a receipt', async () => {
  const { gate } = await import('../lib/gate.mjs');
  const { RECEIPT } = await import('../lib/github.mjs');
  const root = makeRepo({
    'process/config.json': { merge_strategy: 'layer' },
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' } }),
    'src/alpha/index.mjs': 'export const x = 1;\n',
    'test/alpha/old.test.mjs': "import test from 'node:test'; test('nothing', () => {});\n",
  });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const head = commit(root, { 'process/metrics/alpha.jsonl': '{"row":"attempt","event":"complete","attempt":2}\n' }, 'records only');
  const receipt = { kind: 'receipt', module: 'alpha', attempt: 2, sha: head, commands: [], exempt: {} };
  const io = (baseRef) => ({ comments: () => [{ id: 1, body: block(RECEIPT, receipt), user: { login: 'civicsmith' } }], getPR: () => ({ user: { login: 'civicsmith' }, draft: false, base: { ref: baseRef } }), addComment: () => ({}), verify: () => false });
  const into = (baseRef) => gate(root, { base, head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: io(baseRef), log: quiet }).run;
  const lay = into('layer/1');
  assert.deepEqual([lay.trigger, lay.suite], ['code', 'pass']);
  // Into the tranche: with a receipt and no green code run that measured it, the suite runs to check
  // it (AUD-2, JOB-7); with no receipt yet it keeps the record path.
  const tr = into('tranche');
  assert.deepEqual([tr.trigger, tr.suite, tr.receipt], ['code', 'pass', 'agrees']);
  const bare = gate(root, { base, head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: { ...io('tranche'), comments: () => [] }, log: quiet }).run;
  assert.deepEqual([bare.trigger, bare.suite], ['record', 'skipped']);
});

test('the gate\'s layer trigger: a user of the layer that never re-ran after its provider\'s interface change is a finding; a head whose newest run is red covers nothing', async () => {
  const { root, bare } = await opened();
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x * y + 1; }\nexport const a2 = 1;\n' });
  const prs = { 1: prOf(1, 'a', ha) };
  let mergedAs = null;
  const io0 = landIO(bare, prs);
  await layerLand(root, 1, { io: { ...io0, merge: (s, k, sha, t) => { const r = io0.merge(s, k, sha, t); mergedAs = r.sha; return r; } }, log: quiet });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const head = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  const mb = git(['merge-base', head, 'origin/tranche'], { cwd: root });
  const changed = git(['diff', '--name-only', mb, head], { cwd: root }).split('\n').filter(Boolean);
  const entries = ['a', 'b', 'c', 'd'].map((id) => JSON.parse(git(['show', `${head}:process/ledger/${id}.json`], { cwd: root })));
  const cfg = configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' });
  const rows = (list) => ({ comments: () => [{ user: { login: BOT }, body: block(GATE, { runs: list }, 'gate') }] });
  const green = { sha: ha, ok: true, trigger: 'code', suite: 'pass', scope: ['a'] };
  const io = { getPR: () => ({ ...prs[1], merged: true, merge_commit_sha: mergedAs }), verify: () => true };
  const r = layerCover(root, cfg, { head, mb, branch: 'layer/1', changed, entries, slug: 'o/p', io: { ...io, ...rows([green]) } });
  assert.deepEqual(r.covered.map((x) => x.id), ['a']);
  assert.ok(r.findings.some((f) => /^b's work \(no land on the layer\) did not hold the interface change of a/.test(f.message)), 'b, unchanged, never re-ran against a');
  const red = layerCover(root, cfg, { head, mb, branch: 'layer/1', changed, entries, slug: 'o/p', io: { ...io, ...rows([green, { ...green, ok: false, suite: 'fail' }]) } });
  assert.ok(red.findings.some((f) => /a changed with no land/.test(f.message)), 'the newest run, red, is what counts');
});

test('land: a merge GitHub made whose land was never recorded is recorded on a second run, reschedules included', async () => {
  const { root, bare } = await opened();
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return [x, y]; }\nexport const a2 = 1;\n' });
  const m = ghMerge(bare, 'layer/1', ha, 'Merge layer PR 8');
  const io = landIO(bare, { 8: prOf(8, 'a', ha, { state: 'closed', merged: true, merge_commit_sha: m.sha }) });
  const r = await layerLand(root, 8, { io: { ...io, merge: () => assert.fail('no second merge') }, log: quiet });
  assert.equal(r.land.merge, m.sha);
  assert.deepEqual(r.land.users_rescheduled, ['b']);
  await assert.rejects(layerLand(root, 8, { io, log: quiet }), /merged and its land is recorded/);
});

test('layer open mid-tranche: a layer the train closed is not opened again, an earlier open layer refuses, and a module\'s job PR still open into the tranche refuses', async () => {
  const { root } = product();
  // Layer 1 closed by the train's layer close.
  const { writeState } = await import('../lib/state.mjs');
  const { mkdirSync, writeFileSync } = await import('node:fs');
  writeState(root, SB, 'layer 1 closed', (w) => { mkdirSync(join(w, 'layers'), { recursive: true }); writeFileSync(join(w, 'layers/closed.jsonl'), JSON.stringify({ row: 'closed', layer: 1, tranche: 'tranche' }) + '\n'); return {}; });
  await assert.rejects(async () => layerOpen(root, 1, { io: openIO, log: quiet }), /layer 1 is closed already/);
  await assert.rejects(async () => layerOpen(root, 2, { io: { ...openIO, openPRs: () => [{ number: 4, head: { ref: 'job/d' } }] }, log: quiet }), /job PRs open into tranche: #4 \(job\/d\)/);
  assert.equal(layerOpen(root, 2, { io: openIO, log: quiet }).ok, true);
  const lines = layerLines(root, configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' }), { slug: 'o/p', io: openIO });
  assert.match(lines[0], /layer 2 open on layer\/2/);
  // In a product where layer 1 is neither closed nor done, layer 2 does not open.
  const p2 = product();
  await assert.rejects(async () => layerOpen(p2.root, 2, { io: openIO, log: quiet }), /layer 1 is not closed/);
});

test('the gate: a job PR into a layer branch that changes only its requirements file runs the whole suite, never the narrowed one', async () => {
  const { gate } = await import('../lib/gate.mjs');
  const { RECEIPT } = await import('../lib/github.mjs');
  const root = makeRepo({
    'process/config.json': { merge_strategy: 'layer' },
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' } }),
    'req/alpha.md': '# alpha\n\n**R1** a thing *(not yet met: T1)*\n',
    'src/alpha/index.mjs': 'export const x = 1;\n',
    'test/alpha/old.test.mjs': "import test from 'node:test'; test('nothing', () => {});\n",
  });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const head = commit(root, { 'req/alpha.md': '# alpha\n\n**R1** a thing\n' }, 'mark struck');
  const receipt = { kind: 'receipt', module: 'alpha', attempt: 1, sha: head, commands: [], exempt: {} };
  const io = (baseRef) => ({ comments: () => [{ id: 1, body: block(RECEIPT, receipt), user: { login: 'civicsmith' } }], getPR: () => ({ user: { login: 'civicsmith' }, draft: false, base: { ref: baseRef } }), addComment: () => ({}), verify: () => false });
  const into = (baseRef) => gate(root, { base, head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: io(baseRef), log: quiet }).run;
  const lay = into('layer/1');
  assert.deepEqual([lay.trigger, lay.suite, lay.requirements_only], ['code', 'pass', undefined]);
  assert.ok(into('working').requirements_only, 'into any other branch the run is narrowed, as before');
});

test('the gate\'s layer trigger: a BLOCKED user is deferred, not a finding; a records-since-green newest row stands on the run it names', async () => {
  const { root, bare } = await opened();
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x % y; }\nexport const a2 = 1;\n' });
  const prs = { 1: prOf(1, 'a', ha) };
  let mergedAs = null;
  const io0 = landIO(bare, prs);
  await layerLand(root, 1, { io: { ...io0, merge: (s, k, sha, t) => { const r = io0.merge(s, k, sha, t); mergedAs = r.sha; return r; } }, log: quiet });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const head = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  const mb = git(['merge-base', head, 'origin/tranche'], { cwd: root });
  const changed = git(['diff', '--name-only', mb, head], { cwd: root }).split('\n').filter(Boolean);
  const entries = ['a', 'b', 'c', 'd'].map((id) => JSON.parse(git(['show', `${head}:process/ledger/${id}.json`], { cwd: root })));
  entries.find((e) => e.id === 'b').status = { state: 'BLOCKED', reason: 'a question' };
  const cfg = configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' });
  const green = { sha: ha, ok: true, trigger: 'code', suite: 'pass', scope: ['a'] };
  const since = { sha: ha, ok: true, trigger: 'record-since-green', after: ha };
  const io = { getPR: () => ({ ...prs[1], merged: true, merge_commit_sha: mergedAs }), verify: () => true, comments: () => [{ user: { login: BOT }, body: block(GATE, { runs: [green, since] }, 'gate') }] };
  const r = layerCover(root, cfg, { head, mb, branch: 'layer/1', changed, entries, slug: 'o/p', io });
  assert.deepEqual(r.covered.map((x) => x.id), ['a']);
  assert.deepEqual(r.findings, []);
});

test('closed layers are this tranche\'s only: a close row of another tranche, or one whose commit is on main, does not count', async () => {
  const { root } = product();
  const { closedLayers } = await import('../lib/layerflow.mjs');
  const { writeState } = await import('../lib/state.mjs');
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const onMain = git(['rev-parse', 'origin/main'], { cwd: root });
  const here = commit(root, { 'x.txt': 'x\n' }, 'tranche moves');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  const rows = [{ row: 'closed', layer: 1, tranche: 'tranche', commit: onMain }, { row: 'closed', layer: 2, tranche: 'other' }, { row: 'closed', layer: 3, tranche: 'tranche', commit: here }];
  writeState(root, SB, 'closes', (w) => { mkdirSync(join(w, 'layers'), { recursive: true }); writeFileSync(join(w, 'layers/closed.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n'); return {}; });
  assert.deepEqual([...closedLayers(root, SB, configOf({}))], [3]);
});

test('a BLOCKED module whose code is on the layer is judged as any: a provider\'s later interface change is still a finding', async () => {
  const { root, bare } = await opened();
  const hb = jobWork(bare, 'b', { 'src/b/index.mjs': "import { a } from '../a/index.mjs';\nexport const b = () => a(8);\n" });
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x ** y; }\nexport const a2 = 1;\n' });
  const prs = { 1: prOf(1, 'b', hb), 2: prOf(2, 'a', ha) };
  const mergedAs = {};
  const io0 = landIO(bare, prs);
  const io = { ...io0, merge: (s, k, sha, t) => { const r = io0.merge(s, k, sha, t); mergedAs[k] = r.sha; return r; } };
  await layerLand(root, 1, { io, log: quiet });
  await layerLand(root, 2, { io, log: quiet });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const head = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  const mb = git(['merge-base', head, 'origin/tranche'], { cwd: root });
  const changed = git(['diff', '--name-only', mb, head], { cwd: root }).split('\n').filter(Boolean);
  const entries = ['a', 'b', 'c', 'd'].map((id) => JSON.parse(git(['show', `${head}:process/ledger/${id}.json`], { cwd: root })));
  entries.find((e) => e.id === 'b').status = { state: 'BLOCKED', reason: 'set instead of re-running' };
  const runs = (k) => [{ sha: prs[k].head.sha, ok: true, trigger: 'code', suite: 'pass', scope: [prs[k].head.ref.slice(4)] }];
  const cio = { getPR: (s, k) => ({ ...prs[k], merged: true, merge_commit_sha: mergedAs[k] }), verify: () => true, comments: (s, k) => [{ user: { login: BOT }, body: block(GATE, { runs: runs(k) }, 'gate') }] };
  const r = layerCover(root, configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' }), { head, mb, branch: 'layer/1', changed, entries, slug: 'o/p', io: cio });
  assert.ok(r.findings.some((f) => /b's last green run .* did not hold the interface change of a/.test(f.message)));
});

test('an earlier tranche\'s flow rows (their merge on main) count for nothing: that layer is not reopened, and a later one does not open on them', async () => {
  const { root } = product();
  const onMain = git(['rev-parse', 'origin/main'], { cwd: root });
  writeRows(root, SB, 'an earlier tranche', [[flowFile(1, 'open'), { row: 'open', layer: 1, at: '2026-10-01T00:00:00Z' }], [flowFile(1, 'merged'), { row: 'merged', layer: 1, commit: onMain, at: '2026-10-02T00:00:00Z' }]]);
  await assert.rejects(async () => layerOpen(root, 1, { io: openIO, log: quiet }), /an earlier tranche's .* not built/);
  await assert.rejects(async () => layerOpen(root, 2, { io: openIO, log: quiet }), /layer 1 is not closed/);
  fetchState(root, SB, { fresh: true });
  assert.match(layerLines(root, configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' }), { slug: 'o/p', io: openIO })[0], /earlier tranche's/);
  // Closed in this tranche by the train, the stale layer is passed over: status shows layer 2.
  const { writeState } = await import('../lib/state.mjs');
  const { mkdirSync, writeFileSync } = await import('node:fs');
  writeState(root, SB, 'layer 1 closed', (w) => { mkdirSync(join(w, 'layers'), { recursive: true }); writeFileSync(join(w, 'layers/closed.jsonl'), JSON.stringify({ row: 'closed', layer: 1, tranche: 'tranche' }) + '\n'); return {}; });
  assert.match(layerLines(root, configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' }), { slug: 'o/p', io: openIO })[0], /layer 2 is next and not open/);
});

test('layer merge (SLB-7): a generated verify failure naming a module of a later layer is printed for it and does not refuse; one naming a module of the closing layer refuses', async () => {
  for (const [who, refused] of [['d', false], ['c', true]]) {
    const generated = [{ paths: ['gen/words.json'], regenerate: ['node', '-e', "require('fs').mkdirSync('gen',{recursive:true});require('fs').writeFileSync('gen/words.json','[]')"], verify: ['node', '-e', `console.error('missing word row for ${who}');process.exit(1)`] }];
    const { root, bare } = product({ done: true, config: { generated } });
    layerOpen(root, 1, { io: openIO, log: quiet });
    const mio = { slug: 'o/p', openPRs: () => [], findPR: () => null, createPR: (s, p) => ({ number: 71, ...p, base: { ref: p.base } }), checkRun: () => ({ status: 'completed', conclusion: 'success' }), merge: (s, k, sha, title) => ghMerge(bare, 'tranche', sha, title) };
    const lines = [];
    const go = layerMerge(root, 1, { io: mio, wait: false, log: (l) => lines.push(l) });
    if (refused) await assert.rejects(go, /the layer checks found 1 finding/);
    else {
      assert.equal((await go).ok, true);
      assert.ok(lines.some((l) => /^not this layer's: gen\/words.json: .*missing word row for d.*found mark on d/.test(l)), lines.join('\n'));
    }
  }
});

// Copy, 6 Nov: layer/8 was cut from the tranche at 2ec3f0be; PR 638 then added OPEN entries for
// four of its modules to the tranche, and job start read only the layer branch.
// e is a module of layer 1 whose entry lands on the tranche after layer/1 is cut.
function lateEntry({ local = false } = {}) {
  const p = product();
  const { root } = p;
  commit(root, { 'build/layers.md': layers.replace('| 1 | One | a, b, c |', '| 1 | One | a, b, c, e |') }, 'e joins layer 1');
  if (local) git(['branch', 'layer/1', 'tranche'], { cwd: root });
  else git(['push', '-q', 'origin', 'tranche', 'tranche:layer/1'], { cwd: root });
  commit(root, { 'process/ledger/e.json': entry('e', { layer: 1 }), 'req/e.md': req('e'), 'test/e/t.test.mjs': "import test from 'node:test'; test('ok', () => {});\n" }, 'Merge PR 638');
  if (!local) git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  return p;
}

test('layer open refuses, before it cuts the branch, when a module of the layer has no ledger entry on the tranche, naming each', () => {
  const { root } = product();
  commit(root, { 'build/layers.md': layers.replace('| 1 | One | a, b, c |', '| 1 | One | a, b, c, e, f |') }, 'e and f join layer 1');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  assert.throws(() => layerOpen(root, 1, { io: openIO, log: quiet }), /layer 1's module\(s\) have no ledger entry on tranche: process\/ledger\/e\.json, process\/ledger\/f\.json; land their entries first.*nothing was opened/);
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/layer/1'], { cwd: root }), '', 'no layer/1 cut');
  fetchState(root, SB, { fresh: true });
  assert.equal(readState(root, SB, flowFile(1, 'open')), null, 'no open row');
});

test('a module whose entry is only on the tranche: layer jobs lists it as startable, and job start reads the entry there, says so, and carries it onto the job branch', () => {
  const { root } = lateEntry({ local: true });
  const lines = [];
  jobStart(root, 'e', { coordinator: 's', push: false, log: (l) => lines.push(l) });
  assert.ok(lines.some((l) => /layer\/1 has no ledger entry process\/ledger\/e\.json; it is read from tranche, the ledger's home, and the start commit carries it onto job\/e/.test(l)), lines.join('\n'));
  const carried = JSON.parse(git(['show', 'job/e:process/ledger/e.json'], { cwd: root }));
  assert.equal(carried.status.state, 'WORKING');
  assert.deepEqual({ ...carried, status: null }, { ...JSON.parse(git(['show', 'tranche:process/ledger/e.json'], { cwd: root })), status: null });
  assert.equal(git(['rev-list', '--count', 'layer/1..job/e'], { cwd: root }), '1', 'one start commit on the layer');
  assert.equal(git(['show', 'job/e:req/e.md'], { cwd: root }), git(['show', 'tranche:req/e.md'], { cwd: root }), 'its requirements file carried with it');
  assert.ok(lines.some((l) => l === 'req/e.md is carried from tranche with it'));
  // The job rule: the job adds only its own entry, as the tranche holds it, the status aside.
  const base = git(['merge-base', 'layer/1', 'job/e'], { cwd: root });
  assert.deepEqual(checkLedger(root, { ref: 'job/e', base, branch: 'job/e', home: 'tranche' }), []);
  assert.match(checkLedger(root, { ref: 'job/e', base, branch: 'job/e' })[0].message, /a job may not add a ledger entry/);
  // An entry that differs from the tranche's beyond its status is still refused.
  git(['checkout', '-q', 'job/e'], { cwd: root });
  const e = JSON.parse(git(['show', 'HEAD:process/ledger/e.json'], { cwd: root }));
  commit(root, { 'process/ledger/e.json': { ...e, paths: ['src/'] } }, 'widen');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  assert.match(checkLedger(root, { ref: 'job/e', base, branch: 'job/e', home: 'tranche' })[0].message, /a job may not add a ledger entry \(its own is added only as tranche holds it/);
});

test('layer jobs and status read a module\'s entry from the tranche when the layer branch has none', () => {
  const { root } = lateEntry();
  const r = layerJobs(root, 1, { io: openIO, log: quiet });
  const e = r.states.find((s) => s.id === 'e');
  assert.deepEqual([e.state, e.why], ['not started', 'OPEN, unmet R1']);
  assert.ok(r.startable.some((x) => x.id === 'e'));
});

test('layer open ends each live hold on only its modules, as hold --end records it; a hold on another layer\'s module, another layer or slots stays', async () => {
  const { hold, readHolds, HOLDS_FILE } = await import('../lib/hold.mjs');
  const { root } = product();
  const S = 'session_coord1';
  const ids = {};
  for (const scope of ['module:a', 'layer:1', 'module:d', 'layer:2', 'slots:2']) ids[scope] = hold(root, scope, { why: `until layer 1 opens (${scope})`, by: S, until: '10h', log: quiet }).id;
  const lines = [];
  const r = layerOpen(root, 1, { io: openIO, log: (l) => lines.push(l), by: S });
  assert.deepEqual(r.ended.sort(), [ids['module:a'], ids['layer:1']].sort());
  fetchState(root, SB, { fresh: true });
  const ends = readState(root, SB, HOLDS_FILE).split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((x) => x.row === 'end');
  assert.deepEqual(ends.map((x) => [x.id, x.by, x.why]).sort(), [[ids['module:a'], S, 'ended by layer open 1'], [ids['layer:1'], S, 'ended by layer open 1']].sort());
  const live = readHolds(root, SB).filter((h) => h.live).map((h) => h.scope).sort();
  assert.deepEqual(live, ['layer:2', 'module:d', 'slots:2']);
  assert.ok(lines.some((l) => l === `${ids['module:a']} ended: module:a holds nothing now (ended by layer open 1)`));
  // Again: nothing ended twice.
  assert.deepEqual(layerOpen(root, 1, { io: openIO, log: quiet }).ended, []);
});

test('the gate: a job PR into a layer branch may add its own entry as the tranche holds it, the status aside; into the tranche, or changed beyond the status, it may not', async () => {
  const { gate } = await import('../lib/gate.mjs');
  const root = makeRepo({ 'process/config.json': { merge_strategy: 'layer' }, 'process/ledger/alpha.json': entry('alpha'), 'src/alpha/index.mjs': 'export const x = 1;\n' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'process/ledger/beta.json': entry('beta') }, 'Merge PR 638');
  git(['checkout', '-q', '-b', 'job/beta', base], { cwd: root });
  const head = commit(root, { 'process/ledger/beta.json': entry('beta', { status: { state: 'WORKING' } }) }, 'job start beta (attempt 1)');
  const io = (baseRef) => ({ comments: () => [], getPR: () => ({ user: { login: 'civicsmith' }, draft: true, base: { ref: baseRef } }), addComment: () => ({}), verify: () => false });
  const ledger = (baseRef, h = head) => gate(root, { base, head: h, branch: 'job/beta', pr: 5, slug: 'o/r', io: io(baseRef), log: quiet }).findings.filter((f) => f.check === 'ledger').map((f) => f.message);
  assert.deepEqual(ledger('layer/1'), []);
  assert.deepEqual(ledger('tranche'), ['a job may not add a ledger entry']);
  const wide = commit(root, { 'process/ledger/beta.json': entry('beta', { status: { state: 'WORKING' }, paths: ['src/'] }) }, 'widen');
  assert.match(ledger('layer/1', wide)[0], /a job may not add a ledger entry \(its own is added only as refs\/heads\/tranche holds it/);
});

// Copy, 6 Nov: corpus-export committed BLOCKED (rows owed to layer 11) on its job branch, not on
// layer/8, so it showed as working and its draft PR held the layer merge.
test('a module BLOCKED at its open job PR\'s head is deferred, and that PR no longer holds the layer merge; a WORKING head still does', async () => {
  const { root, bare } = product({ done: true });
  layerOpen(root, 1, { io: openIO, log: quiet });
  const blocked = jobWork(bare, 'c', { 'process/ledger/c.json': entry('c', { layer: 1, status: { state: 'BLOCKED', reason: 'rows owed to layer 2' } }) });
  const pr = (head) => [{ number: 61, draft: true, head: { ref: 'job/c', sha: head } }];
  const st = layerStatus(root, 1, { io: { ...openIO, openPRs: () => pr(blocked) }, log: quiet });
  const c = st.states.find((s) => s.id === 'c');
  assert.deepEqual([c.state, c.why], ['deferred', "BLOCKED: rows owed to layer 2 (on PR 61's head)"]);
  assert.equal(st.ready, true);
  // A head that reads WORKING holds the merge as before.
  const working = jobWork(bare, 'b', { 'process/ledger/b.json': entry('b', { layer: 1, status: { state: 'WORKING' } }) });
  const held = layerStatus(root, 1, { io: { ...openIO, openPRs: () => [{ number: 62, draft: true, head: { ref: 'job/b', sha: working } }] }, log: quiet });
  assert.deepEqual([held.states.find((s) => s.id === 'b').state, held.ready], ['working', false]);
  const mio = { slug: 'o/p', openPRs: () => pr(blocked), comments: () => [], findPR: () => null, createPR: (s, p) => ({ number: 80, ...p, base: { ref: p.base } }), checkRun: () => ({ status: 'completed', conclusion: 'success' }), merge: (s, k, sha, title) => ghMerge(bare, 'tranche', sha, title) };
  const m = await layerMerge(root, 1, { io: mio, wait: false, log: quiet });
  assert.equal(m.ok, true);
  assert.deepEqual(m.closed.deferred.c.reason, "BLOCKED: rows owed to layer 2 (on PR 61's head)");
});

test('a module whose entry only the tranche holds has its job PR named: it shows as working', () => {
  const { root, bare } = lateEntry();
  const h = jobWork(bare, 'e', { 'process/ledger/e.json': entry('e', { layer: 1, status: { state: 'WORKING' } }) });
  const r = layerJobs(root, 1, { io: { ...openIO, openPRs: () => [{ number: 63, draft: true, head: { ref: 'job/e', sha: h } }] }, log: quiet });
  assert.deepEqual(r.states.find((s) => s.id === 'e').state, 'working');
  assert.ok(!r.startable.some((x) => x.id === 'e'));
  // A fresh branch of it (job/e-2) is named for e too.
  const f = layerJobs(root, 1, { io: { ...openIO, openPRs: () => [{ number: 64, draft: true, head: { ref: 'job/e-2', sha: h } }] }, log: quiet });
  assert.deepEqual(f.states.find((s) => s.id === 'e').pr, 64);
});

// Cold review of PR 190: the carried entry and requirements are added on both sides after the cut
// (OPEN on the tranche, the job's on the layer), an add/add conflict GitHub cannot merge.
test('layer merge: a carried entry\'s add/add conflict with the tranche is merged into the layer, keeping the layer\'s; any other conflict refuses', async () => {
  const { carriedSync, readLayer: rl } = await import('../lib/layerflow.mjs');
  const { root, bare } = lateEntry();
  const cfg = configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json', requirements_dir: 'req/' });
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'l', 'origin/layer/1'], { cwd: d });
  commit(d, { 'process/ledger/e.json': entry('e', { layer: 1, status: { state: 'COMPLETE' } }), 'req/e.md': req('e').replace(' *(not yet met: T1)*', '') }, 'Merge layer PR 9');
  git(['push', '-q', 'origin', 'l:layer/1'], { cwd: d });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const L = rl(root, cfg, 1, { io: openIO, slug: 'o/p' });
  const lines = [];
  const sha = carriedSync(root, cfg, 1, L, (l) => lines.push(l));
  assert.ok(sha);
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/layer/1'], { cwd: root }).split('\t')[0], sha);
  assert.equal(JSON.parse(git(['show', `${sha}:process/ledger/e.json`], { cwd: root })).status.state, 'COMPLETE', 'the layer\'s kept');
  assert.equal(git(['merge-base', '--is-ancestor', 'origin/tranche', sha], { cwd: root, allowFail: true }).code, 0);
  assert.match(lines[0], /tranche merged in at .*the layer's version kept of process\/ledger\/e\.json, req\/e\.md/);
  // Clean now: nothing more to merge.
  git(['fetch', '-q', 'origin'], { cwd: root });
  assert.equal(carriedSync(root, cfg, 1, rl(root, cfg, 1, { io: openIO, slug: 'o/p' }), quiet), null);
  // A conflict in any other file refuses, naming it; nothing pushed.
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'src/c/index.mjs': 'export const c = 7;\n' }, 'tranche edits c');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  const d2 = clone(bare);
  git(['checkout', '-q', '-B', 'l', 'origin/layer/1'], { cwd: d2 });
  commit(d2, { 'src/c/index.mjs': 'export const c = 8;\n' }, 'Merge layer PR 10');
  git(['push', '-q', 'origin', 'l:layer/1'], { cwd: d2 });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const tip = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  assert.throws(() => carriedSync(root, cfg, 1, rl(root, cfg, 1, { io: openIO, slug: 'o/p' }), quiet), /layer\/1 and tranche conflict in src\/c\/index\.mjs.*nothing was opened/);
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/layer/1'], { cwd: root }).split('\t')[0], tip);
});

// Coordinator, 6 Nov (R7): a provider's land rescheduled 12 users, most COMPLETE before the layer
// opened with no code on it, each re-test a whole job session. The gate's trust stays with CI.
test('layer retest: a rescheduled module with no work on the layer gets a records-only ready PR carrying its last receipt; its land clears the reschedule, and the report counts it', async () => {
  const { root, bare } = product({ done: true });
  layerOpen(root, 1, { io: openIO, log: quiet });
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\nexport const a2 = 1;\n' });
  const prs = { 1: prOf(1, 'a', ha) };
  // The land's own retest is left to this test (a stub that opens nothing and refuses nothing).
  await layerLand(root, 1, { io: { ...landIO(bare, prs), retest: () => ({ pr: null }) }, log: quiet });
  const jl = [];
  const j = layerJobs(root, 1, { io: openIO, log: (l) => jl.push(l) });
  assert.deepEqual(j.states.find((s) => s.id === 'b').state, 'rescheduled');
  // a's change is additive (an added export): the retest is b's way, the job its fallback.
  assert.equal(j.startable.find((x) => x.id === 'b').cmd, 'node .process/tool/p3.mjs layer retest b');
  assert.ok(jl.some((l) => /additive change: a red retest falls back to .*job start b/.test(l)));
  const first = git(['rev-list', '--max-parents=0', 'origin/tranche'], { cwd: root });
  const receipt = { kind: 'receipt', module: 'b', attempt: 1, sha: first, commands: [], exempt: {} };
  const made = [];
  const posted = [];
  const io = {
    slug: 'o/p', openPRs: () => [],
    prsFromBranch: () => [{ number: 40, state: 'closed', merged_at: '2026-11-05T00:00:00Z', user: { login: 'civicsmith' } }],
    comments: (s, k) => (k === 40 ? [{ id: 1, body: block(RECEIPT, receipt), user: { login: 'civicsmith' } }] : []),
    createPR: (s, p) => { made.push(p); return { number: 41 + made.length - 1, ...p }; },
    addComment: (s, k, body) => { posted.push([k, body]); return { id: 2 }; },
    markReady: (s, k) => { posted.push([k, 'ready']); },
    jobHeads: () => new Set(git(['ls-remote', '--heads', 'origin', 'refs/heads/job/*'], { cwd: root }).split('\n').filter(Boolean).map((l) => l.split('\t')[1].replace('refs/heads/', ''))),
  };
  assert.throws(() => layerRetest(root, 'b', { io: { ...io, prsFromBranch: () => [] }, log: quiet }), /no receipt of b on a merged pull request from job\/b that layer\/1 holds: a job re-tests it/);
  assert.equal(made.length, 0);
  const lines = [];
  const r = layerRetest(root, 'b', { io, log: (l) => lines.push(l) });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const tip = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  assert.equal(git(['rev-parse', 'origin/job/b'], { cwd: root }), r.head);
  assert.equal(git(['rev-parse', `${r.head}^`], { cwd: root }), tip, 'one commit on the layer tip');
  assert.deepEqual(git(['diff', '--name-only', tip, r.head], { cwd: root }), 'process/metrics/b.jsonl', 'records only');
  assert.deepEqual([made[0].head, made[0].base, made[0].draft], ['job/b', 'layer/1', true]);
  assert.equal(posted[0][0], 41);
  assert.equal(parseBlock(posted[0][1], RECEIPT).sha, first, 'its last receipt carried');
  assert.deepEqual(posted[1], [41, 'ready'], 'marked ready only after the receipt is on it');
  // Red, say: PR 41 is closed; a second retest takes the layer into job/b by a merge, no rewrite.
  const closed = { number: 41, state: 'closed', merged_at: null, user: { login: 'civicsmith' } };
  const io2 = { ...io, prsFromBranch: () => [closed, ...io.prsFromBranch()] };
  const r2 = layerRetest(root, 'b', { io: io2, log: quiet });
  git(['fetch', '-q', 'origin'], { cwd: root });
  assert.equal(git(['merge-base', '--is-ancestor', r.head, r2.head], { cwd: root, allowFail: true }).code, 0, 'a fast-forward of job/b');
  assert.deepEqual(git(['diff', '--name-only', tip, r2.head], { cwd: root }), 'process/metrics/b.jsonl', 'records only');
  // A job branch of b holding work the layer lacks refuses (a fresh start whose PR never opened).
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'job/b-2', 'origin/layer/1'], { cwd: d });
  commit(d, { 'src/b/index.mjs': 'export const b = 2;\n' }, 'job start b (attempt 2)');
  git(['push', '-q', 'origin', 'job/b-2'], { cwd: d });
  assert.throws(() => layerRetest(root, 'b', { io: { ...io2, prsFromBranch: () => [closed, { ...closed, number: 42 }, ...io.prsFromBranch()] }, log: quiet }), /origin's job\/b-2 at .* has work layer\/1 lacks: a job re-tests it/);
  git(['push', '-q', 'origin', ':job/b-2'], { cwd: d });
  prs[41] = prOf(41, 'b', r2.head);
  assert.ok(lines.some((l) => /PR 41 from job\/b, ready; the gate runs its whole suite. Green: .*layer land 41/.test(l)));
  // CI's gate is green on its head: the merge tool lands it, and b is complete.
  const land = await layerLand(root, 41, { io: landIO(bare, prs), log: quiet });
  assert.equal(land.land.retest, true);
  assert.equal(layerJobs(root, 1, { io: openIO, log: quiet }).states.find((s) => s.id === 'b').state, 'complete');
  const m = layerReport(root, 1, { log: quiet }).measures;
  assert.deepEqual([m.retests, m.retest_lands], [2, 1]);
  // Not rescheduled now: refused.
  assert.throws(() => layerRetest(root, 'b', { io, log: quiet }), /b is complete: layer retest is for a rescheduled module/);
});

test('layer retest: a module whose own work landed on the layer is retested; one with work the layer lacks is refused, naming the job start', async () => {
  const { root, bare } = product({ done: true });
  layerOpen(root, 1, { io: openIO, log: quiet });
  const hc = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 3;\n' });
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x) { return x; }\nexport const a2 = 1;\n' });
  const prs = { 1: prOf(1, 'c', hc), 2: prOf(2, 'a', ha) };
  for (const k of [1, 2]) await layerLand(root, k, { io: landIO(bare, prs), log: quiet });
  // Its land's retest was refused (the stub): layer jobs now leads with b's job.
  assert.match(layerJobs(root, 1, { io: openIO, log: quiet }).startable.find((x) => x.id === 'b').cmd, /job start b/);
  // b's job branch holds work the layer lacks (pushed, never landed).
  jobWork(bare, 'b', { 'src/b/index.mjs': "import { a } from '../a/index.mjs';\nexport const b = () => a(5);\n" });
  const io = { slug: 'o/p', openPRs: () => [], prsFromBranch: () => [], comments: () => [], createPR: () => assert.fail('no PR'), addComment: () => assert.fail('no comment') };
  assert.throws(() => layerRetest(root, 'b', { io, log: quiet }), /origin's job\/b at .* has work layer\/1 lacks: a job re-tests it: .*job start b --live <n> --reopen "re-test against the new interface of a"/);
  assert.throws(() => layerRetest(root, 'c', { io, log: quiet }), /c is complete/);
});

// Bob, 6 Nov (R8): publication's land in layer 8 rescheduled 12 users, most COMPLETE.
test('land (R8): a reworded Provides text reschedules no one and leaves a notice for the users; an added export retests them; the report counts both rules', async () => {
  const { root, bare } = product({ done: true });
  layerOpen(root, 1, { io: openIO, log: quiet });
  const h1 = jobWork(bare, 'a', { 'req/a.md': req('a', '- a(x) returns x, unchanged').replace(' *(not yet met: T1)*', '') });
  const prs = { 1: prOf(1, 'a', h1) };
  const lines = [];
  const r1 = await layerLand(root, 1, { io: landIO(bare, prs), log: (l) => lines.push(l) });
  assert.deepEqual([r1.land.users_rescheduled, r1.land.users_rescheduled_old_rule, r1.land.users_noticed], [[], ['b'], ['b', 'd']]);
  assert.ok(lines.some((l) => /provider notice a:1 for 2 user\(s\), its Public \/ Provides text changed \(no reschedule\): b, d/.test(l)));
  fetchState(root, SB, { fresh: true });
  assert.deepEqual(JSON.parse(readState(root, SB, 'notices/a-1.json')).users, ['b', 'd']);
  assert.equal(layerJobs(root, 1, { io: openIO, log: quiet }).states.find((s) => s.id === 'b').state, 'complete');
  // An added export (additive): b is retested by its gate alone, not rescheduled for a job.
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'job/a', 'origin/layer/1'], { cwd: d });
  const h2 = commit(d, { 'src/a/index.mjs': 'export function a(x) { return x; }\nexport const a2 = 1;\n' }, 'a2');
  git(['push', '-q', '-f', 'origin', 'job/a'], { cwd: d });
  prs[2] = prOf(2, 'a', h2);
  const opened = [];
  const r2 = await layerLand(root, 2, { io: { ...landIO(bare, prs), retest: (r, u) => { opened.push(u); return { pr: { number: 70 } }; } }, log: quiet });
  assert.deepEqual([r2.land.users_rescheduled, r2.land.interface.triggers, r2.land.interface.class], [['b'], ['exports'], 'additive']);
  assert.deepEqual([opened, r2.retests], [['b'], [{ user: 'b', pr: 70 }]]);
  const m = layerReport(root, 1, { log: quiet }).measures;
  // The stub opened no retest row for b, so b's re-test is still counted as a job: 1 avoided (the Provides land's).
  assert.deepEqual([m.reschedules, m.retests_owed, m.reschedules_old_rule, m.reschedules_avoided, m.lands_additive, m.lands_breaking], [0, 1, 2, 1, 1, 0]);
  assert.deepEqual([m.triggers_old_rule['provides-text'], m.triggers_new_rule['provides-text'], m.triggers_new_rule.exports], [1, 0, 1]);
  assert.equal(typeof m.reschedule_changed_result.unknown, 'number', 'reschedule_changed_result still counts');
  assert.equal(m.reschedule_changed_result.rows.length, 1);
});

test('land (R8): exports that cannot be read refuse the land, naming what could not be read; nothing is merged', async () => {
  const { root, bare } = product({ done: true });
  layerOpen(root, 1, { io: openIO, log: quiet });
  const h = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x) { return x + 1; }\n' });
  let merged = 0;
  const io = { ...landIO(bare, { 1: prOf(1, 'a', h) }), merge: () => { merged++; return {}; }, interfaceChange: () => ({ unread: 'git show failed for src/a/index.mjs' }) };
  await assert.rejects(layerLand(root, 1, { io, log: quiet }), /refused: a's exports could not be read at .* \(git show failed for src\/a\/index\.mjs\); the job fixes what cannot be read and publishes again; nothing was merged/);
  assert.equal(merged, 0);
});

test('layer retest refuses a rescheduled module with unmet requirement marks: a job meets them', async () => {
  const { root, bare } = product();
  layerOpen(root, 1, { io: openIO, log: quiet });
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x) { return x; }\nexport const a2 = 1;\n' });
  await layerLand(root, 1, { io: landIO(bare, { 1: prOf(1, 'a', ha) }), log: quiet });
  const j = layerJobs(root, 1, { io: openIO, log: quiet });
  assert.equal(j.states.find((s) => s.id === 'b').state, 'rescheduled');
  assert.equal(j.startable.find((x) => x.id === 'b').retest, undefined, 'not offered');
  assert.throws(() => layerRetest(root, 'b', { io: { slug: 'o/p', openPRs: () => [] }, log: quiet }), /b has unmet requirement marks \(R1\): a job meets them: .*job start b --live <n> --reopen "meet the unmet requirement marks R1/);
});

// Bob's refinement "c" (6 Nov), on the copy's layer 8: publication 632 added the export
// Publication.renderingsByPixels, and the expected rows of g47t-miniflare and g47t-registry gained
// `pixels_sha256: null`. It rescheduled 12 users; 8 re-ran as job sessions and none changed a result.
test('publication 632: an added export and expected rows that only gain a key are additive, so each user gets a gate-only retest; a changed expected value is breaking', async () => {
  const pub = "export class Publication {\n  renderings(id) { return []; }\n}\n";
  const rows = (extra) => `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { Publication } from '../../src/a/index.mjs';\nconst expected = [\n  { id: 'p1', status: 'published', pages: 3${extra} },\n  { id: 'p2', status: 'draft', pages: 1${extra} },\n];\ntest('R2 the registry lists the renderings', () => {\n  assert.deepEqual(new Publication().renderings('x'), expected);\n});\n`;
  const { root, bare } = product({ done: true, over: {} });
  const d0 = clone(bare);
  git(['checkout', '-q', '-B', 't', 'origin/tranche'], { cwd: d0 });
  commit(d0, { 'src/a/index.mjs': pub, 'req/a.md': req('a', '- **R2** the registry lists the renderings').replace(' *(not yet met: T1)*', ''), 'test/a/g47t-registry.test.mjs': rows(''), 'test/a/g47t-miniflare.test.mjs': rows('').replace('registry lists', 'miniflare lists') }, 'publication before 632');
  git(['push', '-q', 'origin', 't:tranche'], { cwd: d0 });
  git(['fetch', '-q', 'origin'], { cwd: root });
  layerOpen(root, 1, { io: openIO, log: quiet });
  const h = jobWork(bare, 'a', {
    'src/a/index.mjs': "export class Publication {\n  renderings(id) { return []; }\n  renderingsByPixels(sha) { return []; }\n}\n",
    'test/a/g47t-registry.test.mjs': rows(', pixels_sha256: null'),
    'test/a/g47t-miniflare.test.mjs': rows(', pixels_sha256: null').replace('registry lists', 'miniflare lists'),
  });
  const prs = { 632: prOf(632, 'a', h) };
  const opened = [];
  const r = await layerLand(root, 632, { io: { ...landIO(bare, prs), retest: (x, u) => { opened.push(u); return { pr: { number: 700 + opened.length } }; } }, log: quiet });
  const ic = r.land.interface;
  assert.equal(ic.class, 'additive');
  assert.deepEqual(ic.exports.added, ['Publication.renderingsByPixels']);
  assert.deepEqual(ic.provides_test_changes.map((x) => [x.file, x.class, x.why]), [['test/a/g47t-miniflare.test.mjs', 'additive', 'added pixels_sha256; pixels_sha256'], ['test/a/g47t-registry.test.mjs', 'additive', 'added pixels_sha256; pixels_sha256']]);
  assert.deepEqual(opened, ['b'], 'each user in the layer retested by its gate alone');
  fetchState(root, SB, { fresh: true });
  assert.deepEqual(flowRows(root, SB, 1).reschedules.map((x) => [x.user, x.class]), [['b', 'additive']]);
  assert.equal(layerJobs(root, 1, { io: openIO, log: quiet }).startable.find((x) => x.id === 'b').cmd, 'node .process/tool/p3.mjs layer retest b');
  // A changed expected value is breaking: a job each, no retest opened.
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'job/a', 'origin/layer/1'], { cwd: d });
  const h2 = commit(d, { 'test/a/g47t-registry.test.mjs': rows(', pixels_sha256: null').replace("status: 'draft'", "status: 'withdrawn'") }, 'a value');
  git(['push', '-q', '-f', 'origin', 'job/a'], { cwd: d });
  prs[633] = prOf(633, 'a', h2);
  const r2 = await layerLand(root, 633, { io: { ...landIO(bare, prs), retest: () => assert.fail('no retest for a breaking change') }, log: quiet });
  assert.deepEqual([r2.land.interface.class, r2.land.users_rescheduled], ['breaking', ['b']]);
});

test('layer retest refuses a module owed a job for a breaking change, even when an additive one followed (the retest\'s land would clear both)', async () => {
  const { root, bare } = product({ done: true });
  layerOpen(root, 1, { io: openIO, log: quiet });
  const h1 = jobWork(bare, 'a', { 'src/a/index.mjs': 'export class a { constructor(x) { this.v = x; } }\n' });
  const prs = { 1: prOf(1, 'a', h1) };
  await layerLand(root, 1, { io: landIO(bare, prs), log: quiet });
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'job/a', 'origin/layer/1'], { cwd: d });
  const h2 = commit(d, { 'src/a/index.mjs': 'export class a { constructor(x) { this.v = x; } }\nexport const a2 = 1;\n' }, 'additive');
  git(['push', '-q', '-f', 'origin', 'job/a'], { cwd: d });
  prs[2] = prOf(2, 'a', h2);
  const lines = [];
  const r = await layerLand(root, 2, { io: { ...landIO(bare, prs), retest: undefined }, log: (l) => lines.push(l) });
  assert.equal(r.land.interface.class, 'additive');
  assert.match(r.retests[0].refused, /b owes a job for a's breaking change/);
  fetchState(root, SB, { fresh: true });
  assert.equal(flowRows(root, SB, 1).retest_refusals.length, 1, 'the refusal is kept');
  assert.match(layerJobs(root, 1, { io: openIO, log: quiet }).startable.find((x) => x.id === 'b').cmd, /job start b/);
});

// R10 (Bob, 6 Nov ~15:35): a layer's jobs earliest in the total order first, so an interface
// change is found before its users start or test.
test('layer jobs (R10): startable in the layer\'s total order, a module whose in-layer provider has not landed after the rest, marked "after"; status follows it', async () => {
  const { root, bare } = product();
  // b uses a; e uses b: the order a, c, b, e (map order a, b, c, e).
  commit(root, { 'build/layers.md': layers.replace('| 1 | One | a, b, c |', '| 1 | One | e, b, a, c |'), 'build/modules.json': { modules: [...modules.modules, { id: 'e', uses: ['b'] }] }, 'process/ledger/e.json': entry('e', { layer: 1 }), 'req/e.md': req('e') }, 'e joins layer 1');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  const lines = [];
  const o = layerOpen(root, 1, { io: openIO, log: (l) => lines.push(l) });
  assert.deepEqual(o.startable.map((x) => [x.id, x.after || null]), [['a', null], ['c', null], ['b', ['a']], ['e', ['b']]]);
  assert.ok(lines.some((l) => /job start b --live <n>\s+\(after a\)/.test(l)));
  const j = layerJobs(root, 1, { io: openIO, log: quiet });
  assert.deepEqual(j.states.map((s) => s.id), ['a', 'c', 'b', 'e'], 'layer status reads in the same order');
  const st = layerLines(root, configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' }), { slug: 'o/p', io: openIO });
  const at = st.findIndex((l) => /^jobs to start/.test(l));
  assert.deepEqual(st.slice(at + 1, at + 5).map((l) => l.match(/job start (\w)/)[1]), ['a', 'c', 'b', 'e']);
  assert.match(st[at + 3], /\(after a\)$/);
  // a lands: b is ready now, e still after b.
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x) { return x + 1; }\n' });
  await layerLand(root, 1, { io: landIO(bare, { 1: prOf(1, 'a', ha) }), log: quiet });
  const k = layerJobs(root, 1, { io: openIO, log: quiet });
  assert.deepEqual(k.startable.map((x) => [x.id, x.after || null]), [['c', null], ['b', null], ['e', ['b']]]);
});

test('job start (R10): a start while an in-layer provider has not landed is early, in its start row; layer report counts early starts', () => {
  const { root } = product();
  git(['branch', 'layer/1', 'tranche'], { cwd: root });
  const lines = [];
  jobStart(root, 'b', { coordinator: 's', push: false, log: (l) => lines.push(l) });
  const row = JSON.parse(git(['show', 'job/b:process/metrics/b.jsonl'], { cwd: root }).trim().split('\n').pop());
  assert.deepEqual([row.event, row.layer, row.early], ['start', 1, ['a']]);
  assert.ok(lines.some((l) => /note: an early start: a has not landed on layer\/1/.test(l)));
  jobStart(root, 'a', { coordinator: 's', push: false, log: quiet });
  assert.deepEqual(JSON.parse(git(['show', 'job/a:process/metrics/a.jsonl'], { cwd: root }).trim().split('\n').pop()).early, []);
  writeRows(root, SB, 'starts', [[flowFile(1, 'start', 'b-1'), { row: 'start', layer: 1, module: 'b', attempt: 1, early: ['a'], at: '2026-11-06T15:40:00Z' }], [flowFile(1, 'start', 'a-1'), { row: 'start', layer: 1, module: 'a', attempt: 1, early: [], at: '2026-11-06T15:41:00Z' }]]);
  const m = layerReport(root, 1, { log: quiet }).measures;
  assert.deepEqual([m.starts, m.early_starts], [2, 1]);
});

test('total order: providers first, the map order kept otherwise, a cycle after', async () => {
  const { totalOrder, layerProviders } = await import('../lib/layerflow.mjs');
  const prov = layerProviders(['e', 'b', 'a', 'c', 'x', 'y'], [{ id: 'b', uses: ['a', 'z'] }, { id: 'e', uses: ['b'] }, { id: 'x', uses: ['y'] }, { id: 'y', uses: ['x'] }], new Map());
  assert.deepEqual(prov.get('b'), ['a'], 'a provider outside the layer is not in it');
  assert.deepEqual(totalOrder(['e', 'b', 'a', 'c', 'x', 'y'], prov), ['a', 'c', 'b', 'e', 'x', 'y']);
});

// Coordinator, 6 Nov 16:03: the merge tool still said "starts owed since 05:29Z (network-notices,
// case-checker, case-inputs)" after their re-tests landed.
test('layer land pays the starts owed by its module (its job complete or block); others stay', async () => {
  const { owe, readOwed } = await import('../lib/hold.mjs');
  const { writeState } = await import('../lib/state.mjs');
  const { root, bare } = product({ done: true });
  layerOpen(root, 1, { io: openIO, log: quiet });
  writeState(root, SB, 'owed', (dir) => { owe(dir, 'job complete c'); owe(dir, 'job complete b'); owe(dir, 'block c'); return {}; });
  const hc = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 4;\n' });
  await layerLand(root, 1, { io: landIO(bare, { 1: prOf(1, 'c', hc) }), log: quiet });
  fetchState(root, SB, { fresh: true });
  assert.deepEqual(readOwed(root, SB).acts.map((x) => x.act), ['job complete b']);
});

test('R10 (cold review): a COMPLETE provider with unmet marks has not landed (it is about to be reopened); a provider BLOCKED on its job branch has (deferred), for job start as for layer jobs', () => {
  const { root, bare } = product({ over: { a: { status: { state: 'COMPLETE' } } } });
  layerOpen(root, 1, { io: openIO, log: quiet });
  // a is COMPLETE with R1 unmet: b waits on it.
  assert.deepEqual(layerJobs(root, 1, { io: openIO, log: quiet }).startable.find((x) => x.id === 'b').after, ['a']);
  // a's job commits BLOCKED on its branch: job start of b is not early.
  jobWork(bare, 'a', { 'process/ledger/a.json': entry('a', { layer: 1, status: { state: 'BLOCKED', reason: 'owed to layer 2' } }) });
  git(['fetch', '-q', 'origin'], { cwd: root });
  git(['branch', '-f', 'layer/1', 'origin/layer/1'], { cwd: root });
  const lines = [];
  jobStart(root, 'b', { coordinator: 's', push: false, log: (l) => lines.push(l) });
  assert.deepEqual(JSON.parse(git(['show', 'job/b:process/metrics/b.jsonl'], { cwd: root }).trim().split('\n').pop()).early, []);
  assert.ok(!lines.some((l) => /early start/.test(l)));
});

// R11 (copy, 6 Nov): layer/8 was cut at a tranche pinned at 4a85f26; the pin moved to 0635b64 on the
// tranche, and layer/8's gate, run with the base's own tool, still refused R4's carried entries.
// SLB-12 (Bob, 6 Nov): a pin move while a layer is open is followed by layer sync before any job lands.
// An empty .process stands for the submodule, so `git add -A` keeps the pointer.
const setPin = (dir, sha, msg) => { mkdirSync(join(dir, '.process'), { recursive: true }); git(['update-index', '--add', '--cacheinfo', `160000,${sha},.process`], { cwd: dir }); git(['commit', '-q', '-m', msg], { cwd: dir }); return git(['rev-parse', 'HEAD'], { cwd: dir }); };
const syncIO = (bare, made) => ({
  slug: 'o/p', openPRs: () => [], findPR: () => null,
  createPR: (s, p) => { made.push(p); return { number: 90 + made.length, ...p }; },
  // Every pull request ever opened from a branch: the ones made here.
  prsFromBranch: (s, b) => made.filter((p) => p.head === b),
  waitForGate: () => ({ status: 'completed', conclusion: 'success' }),
  merge: (s, k, sha, title) => ghMerge(bare, 'layer/1', sha, title),
});
test('layer sync (R11, SLB-12): a pin moved on the tranche while the layer is open leads layer jobs and status, holds the merge, and layer sync lands the tranche by a gated PR, the pin and shims the tranche\'s, a ledger entry the layer\'s', async () => {
  const { root, bare } = product({ done: true });
  const p1 = git(['rev-parse', 'HEAD'], { cwd: root });
  setPin(root, p1, 'pin 1');
  commit(root, { '.github/workflows/process-gate.yml': 'name: gate v1\n' }, 'shim 1');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  layerOpen(root, 1, { io: openIO, log: quiet });
  // On the layer: e's entry carried by its job and landed (COMPLETE), and c's land.
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'l', 'origin/layer/1'], { cwd: d });
  commit(d, { 'process/ledger/e.json': entry('e', { layer: 1, status: { state: 'COMPLETE' } }) }, 'Merge layer PR 5');
  git(['push', '-q', 'origin', 'l:layer/1'], { cwd: d });
  const hc = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 5;\n' });
  await layerLand(root, 6, { io: landIO(bare, { 6: prOf(6, 'c', hc) }), log: quiet });
  // The tranche: the pin moves, the shim with it, and e's OPEN entry lands (PR 638).
  git(['fetch', '-q', 'origin'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--ff-only', 'origin/tranche'], { cwd: root });
  commit(root, { 'process/ledger/e.json': entry('e', { layer: 1 }) }, 'Merge PR 638');
  const p2 = git(['rev-parse', 'HEAD'], { cwd: root });
  setPin(root, p2, 'pin move 2');
  commit(root, { '.github/workflows/process-gate.yml': 'name: gate v2\n' }, 'shim 2');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  // A land after the pin move.
  const d2 = clone(bare);
  git(['checkout', '-q', '-B', 'job/c', 'origin/layer/1'], { cwd: d2 });
  const hc2 = commit(d2, { 'src/c/index.mjs': 'export const c = 6;\n' }, 'c again');
  git(['push', '-q', '-f', 'origin', 'job/c'], { cwd: d2 });
  await layerLand(root, 7, { io: landIO(bare, { 7: prOf(7, 'c', hc2) }), log: quiet });
  const lines = [];
  const j = layerJobs(root, 1, { io: openIO, log: (l) => lines.push(l) });
  assert.match(j.sync.line, /^run node \.process\/tool\/p3\.mjs layer sync 1 first: layer\/1's process pin .* differs from tranche's .*\(SLB-12\)$/);
  assert.equal(lines[0], j.sync.line, 'layer jobs leads with it');
  const st = layerLines(root, configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' }), { slug: 'o/p', io: openIO });
  assert.equal(st[0], j.sync.line, 'status leads with it');
  const mio = { slug: 'o/p', openPRs: () => [], findPR: () => null, createPR: () => assert.fail('no layer PR'), checkRun: () => ({ status: 'completed', conclusion: 'success' }) };
  await assert.rejects(layerMerge(root, 1, { io: mio, wait: false, log: quiet }), /layer 1 cannot merge: layer\/1's process pin .* differs .*a job landed after that pin move .*run .*layer sync 1 first/);
  // layer sync: one gated PR, landed by the merge tool.
  const made = [];
  const r = await layerSync(root, 1, { io: syncIO(bare, made), log: quiet });
  assert.equal(r.synced, true);
  assert.deepEqual([made[0].base, made[0].draft, made[0].head], ['layer/1', false, `layer-sync/1-${git(['rev-parse', 'origin/tranche'], { cwd: root }).slice(0, 10)}`]);
  git(['fetch', '-q', 'origin'], { cwd: root });
  const tip = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  assert.equal(git(['merge-base', '--is-ancestor', 'origin/tranche', tip], { cwd: root, allowFail: true }).code, 0, 'the layer holds the tranche');
  assert.equal(git(['ls-tree', tip, '--', '.process'], { cwd: root }).split(/\s+/)[2], p2, 'the tranche\'s pin');
  assert.equal(git(['show', `${tip}:.github/workflows/process-gate.yml`], { cwd: root }), 'name: gate v2', 'the tranche\'s shim');
  assert.equal(JSON.parse(git(['show', `${tip}:process/ledger/e.json`], { cwd: root })).status.state, 'COMPLETE', 'the layer\'s entry');
  assert.deepEqual(r.row.resolved, ['process/ledger/e.json']);
  fetchState(root, SB, { fresh: true });
  assert.equal(flowRows(root, SB, 1).syncs.length, 1, 'a layer event');
  assert.equal(layerJobs(root, 1, { io: openIO, log: quiet }).sync, null, 'in sync now');
  assert.equal((await layerSync(root, 1, { io: syncIO(bare, made), log: quiet })).synced, false, 'nothing to do again');
});

test('layer sync (R11) refuses a conflict outside .process, the shims and ledger entries, naming it; nothing is opened. layer merge goes on when the pin moved after the last land', async () => {
  const { root, bare } = product({ done: true });
  setPin(root, git(['rev-parse', 'HEAD'], { cwd: root }), 'pin 1');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  layerOpen(root, 1, { io: openIO, log: quiet });
  const hc = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 5;\n' });
  await layerLand(root, 6, { io: landIO(bare, { 6: prOf(6, 'c', hc) }), log: quiet });
  git(['fetch', '-q', 'origin'], { cwd: root });
  await new Promise((r) => setTimeout(r, 1100)); // the pin move is dated after the land
  commit(root, { 'src/c/index.mjs': 'export const c = 9;\n' }, 'a plain PR on c');
  const p = git(['rev-parse', 'HEAD'], { cwd: root });
  setPin(root, p, 'pin move');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  const made = [];
  await assert.rejects(layerSync(root, 1, { io: syncIO(bare, made), log: quiet }), /layer sync 1 refused: layer\/1 and tranche conflict in src\/c\/index\.mjs; only \.process, the process's shims and ledger entries are resolved by the tool; nothing was opened/);
  assert.equal(made.length, 0);
  // The pin moved after the layer's last land: the merge is not held (a note says so).
  const lines = [];
  const mio = { slug: 'o/p', openPRs: () => [], findPR: () => null, createPR: (s, q) => ({ number: 99, ...q, base: { ref: q.base } }), checkRun: () => ({ status: 'completed', conclusion: 'success' }), merge: (s, k, sha, title) => ghMerge(bare, 'tranche', sha, title) };
  await layerMerge(root, 1, { io: mio, wait: false, log: (l) => lines.push(l) }).catch((e) => assert.doesNotMatch(e.message, /layer sync/));
  assert.ok(lines.some((l) => /note: layer\/1's process pin .* differs .*the pin moved after the layer's last land, so the merge goes on/.test(l)));
});

// Cold review of PR 198 (layer sync).
test('layer sync (cold review): two pin moves, the first unsynced before a land, hold the merge; a closed attempt takes a new branch; an older sync PR open, or a head that is not the tool\'s merge, refuses; a lost row is recorded', async () => {
  const { root, bare } = product({ done: true });
  setPin(root, git(['rev-parse', 'HEAD'], { cwd: root }), 'pin 1');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  layerOpen(root, 1, { io: openIO, log: quiet });
  setPin(root, git(['rev-parse', 'HEAD'], { cwd: root }), 'pin 2');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  await new Promise((r) => setTimeout(r, 1100));
  const hc = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 5;\n' });
  await layerLand(root, 6, { io: landIO(bare, { 6: prOf(6, 'c', hc) }), log: quiet });
  await new Promise((r) => setTimeout(r, 1100));
  git(['fetch', '-q', 'origin'], { cwd: root });
  setPin(root, git(['rev-parse', 'HEAD'], { cwd: root }), 'pin 3');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  const mio = { slug: 'o/p', openPRs: () => [], findPR: () => null, createPR: () => assert.fail('no layer PR'), checkRun: () => ({ status: 'completed', conclusion: 'success' }) };
  await assert.rejects(layerMerge(root, 1, { io: mio, wait: false, log: quiet }), /a job landed after that pin move/, 'pin 2 came before the land, unsynced');
  // A first attempt, then closed (red, say): the next takes a new branch name.
  const made = [];
  const io = syncIO(bare, made);
  await layerSync(root, 1, { io, wait: false, log: quiet });
  await layerSync(root, 1, { io, wait: false, log: quiet });
  const stem = `layer-sync/1-${git(['rev-parse', 'origin/tranche'], { cwd: root }).slice(0, 10)}`;
  assert.deepEqual(made.map((p) => p.head), [stem, `${stem}-2`]);
  // An older sync PR still open into the layer refuses.
  await assert.rejects(layerSync(root, 1, { io: { ...io, openPRs: () => [{ number: 50, head: { ref: 'layer-sync/1-0000000000', sha: 'x' } }] }, log: quiet }), /an older sync PR is open into layer\/1: #50/);
  // An open sync PR whose head is not the tool's merge (a push to its branch) is never landed.
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'w', `origin/${stem}-2`], { cwd: d });
  const forged = commit(d, { 'src/c/index.mjs': 'export const c = 666;\n' }, 'a push to the sync branch');
  git(['push', '-q', 'origin', `w:${stem}-2`], { cwd: d });
  git(['fetch', '-q', 'origin'], { cwd: root });
  await assert.rejects(layerSync(root, 1, { io: { ...io, openPRs: () => [{ number: 92, head: { ref: `${stem}-2`, sha: forged } }] }, log: quiet }), /sync PR 92's head .* is not the tool's merge .*nothing was landed/);
  // Landed by GitHub, its row lost: the next run records it.
  const ok = git(['rev-parse', `origin/${stem}`], { cwd: root });
  ghMerge(bare, 'layer/1', ok, 'Merge layer sync PR 91');
  git(['fetch', '-q', 'origin'], { cwd: root });
  assert.equal((await layerSync(root, 1, { io, log: quiet })).synced, false);
  fetchState(root, SB, { fresh: true });
  assert.deepEqual(flowRows(root, SB, 1).syncs.map((r) => [r.pr, r.recovered]), [[91, true]]);
});

test('the gate\'s layer trigger after a layer sync: the sync\'s merge is not a stray change to a module\'s file', async () => {
  const { root, bare } = product({ done: true });
  commit(root, { 'src/c/more.mjs': 'export const one = 1;\n// 2\n// 3\n// 4\nexport const five = 5;\n' }, 'more');
  setPin(root, git(['rev-parse', 'HEAD'], { cwd: root }), 'pin 1');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  layerOpen(root, 1, { io: openIO, log: quiet });
  const hc = jobWork(bare, 'c', { 'src/c/more.mjs': 'export const one = 11;\n// 2\n// 3\n// 4\nexport const five = 5;\n' });
  const prs = { 6: prOf(6, 'c', hc) };
  const mergedAs = {};
  const io0 = landIO(bare, prs);
  await layerLand(root, 6, { io: { ...io0, merge: (s, k, sha, t) => { const r = io0.merge(s, k, sha, t); mergedAs[k] = r.sha; return r; } }, log: quiet });
  git(['fetch', '-q', 'origin'], { cwd: root });
  commit(root, { 'src/c/more.mjs': 'export const one = 1;\n// 2\n// 3\n// 4\nexport const five = 55;\n' }, 'a plain PR on c, another line');
  setPin(root, git(['rev-parse', 'HEAD'], { cwd: root }), 'pin 2');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  await layerSync(root, 1, { io: syncIO(bare, []), log: quiet });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const head = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  const mb = git(['merge-base', head, 'origin/tranche'], { cwd: root });
  const changed = git(['diff', '--name-only', mb, head], { cwd: root }).split('\n').filter(Boolean);
  assert.deepEqual(changed, ['src/c/more.mjs']);
  const entries = ['a', 'b', 'c', 'd'].map((id) => JSON.parse(git(['show', `${head}:process/ledger/${id}.json`], { cwd: root })));
  const merged = { 6: { ...prs[6], merged: true, merge_commit_sha: mergedAs[6] } };
  const cfg = configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' });
  const r = layerCover(root, cfg, { head, mb, branch: 'layer/1', changed, entries, slug: 'o/p', io: { getPR: (s, k) => merged[k], verify: () => true, comments: () => [{ user: { login: BOT }, body: block(GATE, { runs: [{ sha: hc, ok: true, trigger: 'code', suite: 'pass', scope: ['c'] }] }, 'gate') }] } });
  assert.deepEqual(r.findings, []);
  assert.deepEqual(r.covered.map((x) => x.id), ['c']);
});

// Coordinator, 6 Nov 16:13: layer 8's job PRs 658-661 were red only on the old tool's ledger finding,
// their sessions archived. After the layer syncs, layer sync brings it into each open job branch.
test('layer sync (layer 8): each open job PR branch takes the synced layer when the merge brings only the pointer, shims, ledger entries and records; a BLOCKED one, or one the merge would bring code into, is left alone', async () => {
  const { root, bare } = product({ done: true });
  commit(root, { 'build/layers.md': layers.replace('| 1 | One | a, b, c |', '| 1 | One | a, b, c, e |'), 'req/e.md': req('e'), '.github/workflows/process-gate.yml': 'name: gate v1\n' }, 'e joins layer 1');
  setPin(root, git(['rev-parse', 'HEAD'], { cwd: root }), 'pin 1');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  // Opened before e's entry landed (as layer/8 was): open by hand, as the refusal now forbids it.
  git(['push', '-q', 'origin', 'tranche:layer/1'], { cwd: root });
  writeRows(root, SB, 'open', [[flowFile(1, 'open'), { row: 'open', layer: 1, branch: 'layer/1', tranche: 'tranche', from: git(['rev-parse', 'tranche'], { cwd: root }), at: new Date().toISOString(), by: 'bob' }]]);
  // job/a, cut now; then c's code lands on the layer; then job/e (carrying e's entry) and job/b (BLOCKED).
  jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x) { return x + 2; }\n' });
  const hc = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 3;\n' });
  await layerLand(root, 6, { io: landIO(bare, { 6: prOf(6, 'c', hc) }), log: quiet });
  const he = jobWork(bare, 'e', { 'process/ledger/e.json': entry('e', { layer: 1, status: { state: 'WORKING' } }), 'src/e/index.mjs': 'export const e = 1;\n', 'process/metrics/e.jsonl': '{"row":"attempt","event":"start","attempt":1}\n' });
  jobWork(bare, 'b', { 'process/ledger/b.json': entry('b', { layer: 1, status: { state: 'BLOCKED', reason: 'owed to layer 2' } }) });
  // The tranche: e's OPEN entry (PR 638), the pin moved, the shim with it.
  git(['fetch', '-q', 'origin'], { cwd: root });
  // PR 638's entry has a field the job's carried copy lacks (a later edit of the tranche's).
  commit(root, { 'process/ledger/e.json': entry('e', { layer: 1, paths: ['src/e/', 'lib/e/'] }) }, 'Merge PR 638');
  setPin(root, git(['rev-parse', 'HEAD'], { cwd: root }), 'pin move 2');
  commit(root, { '.github/workflows/process-gate.yml': 'name: gate v2\n' }, 'shim 2');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  const open = [658, 660, 661].map((k, i) => ({ number: k, draft: false, head: { ref: ['job/e', 'job/b', 'job/a'][i], sha: null } }));
  // A fork's PR naming a job branch is never pushed to.
  open.push({ number: 662, draft: false, head: { ref: 'job/c', sha: null, repo: { full_name: 'someone/fork' } } });
  const lines = [];
  const r = await layerSync(root, 1, { io: { ...syncIO(bare, []), openPRs: (s, base) => (base === 'layer/1' ? open : []) }, log: (l) => lines.push(l) });
  assert.equal(r.synced, true);
  assert.deepEqual(r.jobs.merged.map((x) => [x.branch, x.changed.sort()]), [['job/e', ['.github/workflows/process-gate.yml', '.process', 'process/ledger/e.json']]]);
  assert.deepEqual(r.jobs.left.map((x) => [x.branch, x.why.split(' (')[0]]), [['job/b', 'BLOCKED'], ['job/a', 'the layer brings other changes']]);
  git(['fetch', '-q', 'origin'], { cwd: root });
  const tip = git(['rev-parse', 'origin/layer/1'], { cwd: root });
  const eh = git(['rev-parse', 'origin/job/e'], { cwd: root });
  assert.equal(git(['merge-base', '--is-ancestor', tip, eh], { cwd: root, allowFail: true }).code, 0, 'job/e holds the synced layer');
  assert.equal(git(['merge-base', '--is-ancestor', he, eh], { cwd: root, allowFail: true }).code, 0, 'a fast-forward of job/e');
  const merged = JSON.parse(git(['show', `${eh}:process/ledger/e.json`], { cwd: root }));
  assert.deepEqual([merged.status.state, merged.paths], ['WORKING', ['src/e/', 'lib/e/']], 'the layer\'s entry, the job\'s status');
  // The ledger rule, as the gate reads it now: e's entry is in the base, only its status differs.
  assert.deepEqual(checkLedger(root, { ref: eh, base: git(['merge-base', eh, tip], { cwd: root }), branch: 'job/e' }), []);
  assert.ok(lines.some((l) => /job\/e \(PR 658\) took layer\/1 .*its gate re-runs with the new tool/.test(l)));
  // Run again: nothing more to do.
  const again = await layerSync(root, 1, { io: { ...syncIO(bare, []), openPRs: (s, base) => (base === 'layer/1' ? open : []) }, log: quiet });
  assert.deepEqual([again.synced, again.jobs.merged.length], [false, 0]);
});

// Coordinator, 6 Nov 17:28: layer status said "layer 8 can merge" while four BLOCKED jobs had their
// work done and owed only a publish (R4b counts them deferred); a merge would drop finished work.
test('a module deferred at its PR head with a green suite there is deferred with work done: layer status says restart to publish, and layer merge refuses unless --defer-done "<why>"', async () => {
  const { root, bare } = product({ done: true });
  layerOpen(root, 1, { io: openIO, log: quiet });
  const h = jobWork(bare, 'c', { 'src/c/index.mjs': 'export const c = 7;\n', 'process/ledger/c.json': entry('c', { layer: 1, status: { state: 'BLOCKED', reason: 'gate red on the ledger finding only' } }) });
  const pr = [{ number: 658, draft: false, head: { ref: 'job/c', sha: h } }];
  // A whole-suite green run on its head, then a later red row of another kind: still work done.
  const comments = (s, k) => (k === 658 ? [{ user: { login: BOT }, body: block(GATE, { runs: [{ sha: h, ok: false, trigger: 'code', suite: 'pass', scope: ['c'], findings: 1 }] }, 'gate') }, { user: { login: BOT }, body: block(GATE, { runs: [{ sha: h, ok: false, trigger: 'record', suite: 'skipped' }] }, 'gate') }] : []);
  const lines = [];
  const st = layerStatus(root, 1, { io: { ...openIO, openPRs: () => pr, comments }, log: (l) => lines.push(l) });
  assert.deepEqual(st.deferred_done, ['c']);
  assert.ok(lines.some((l) => /^1 deferred with work done \(suite green, BLOCKED only on a process finding\): restart to publish/.test(l)));
  assert.ok(lines.some((l) => /job start c --live <n> --restart ".*"\s+\(PR 658\)/.test(l)));
  const mio = { slug: 'o/p', openPRs: () => pr, comments, findPR: () => null, createPR: (s, p) => ({ number: 80, ...p, base: { ref: p.base } }), checkRun: () => ({ status: 'completed', conclusion: 'success' }), merge: (s, k, sha, title) => ghMerge(bare, 'tranche', sha, title) };
  await assert.rejects(layerMerge(root, 1, { io: mio, wait: false, log: quiet }), /layer 1 cannot merge: c \(PR 658\) is deferred with work done .*restart it to publish .*or merge with --defer-done "<why>"/);
  await assert.rejects(layerMerge(root, 1, { io: mio, wait: false, log: quiet, deferDone: true }), /--defer-done needs why/);
  // GitHub unreadable: counted as work done until read, the merge held.
  await assert.rejects(layerMerge(root, 1, { io: { ...mio, comments: () => { throw new Error('gh: 502'); } }, wait: false, log: quiet }), /c \(PR 658\) is deferred with work done/);
  // A green row narrowed to requirements tests is not the whole suite.
  const narrow = (s, k) => (k === 658 ? [{ user: { login: BOT }, body: block(GATE, { runs: [{ sha: h, ok: true, trigger: 'code', suite: 'pass', scope: ['c'], requirements_only: [{ module: 'c' }] }] }, 'gate') }] : []);
  assert.deepEqual(layerStatus(root, 1, { io: { ...openIO, openPRs: () => pr, comments: narrow }, log: quiet }).deferred_done, []);
  const m = await layerMerge(root, 1, { io: mio, wait: false, log: quiet, deferDone: 'c waits for layer 2 by Bob\'s word' });
  assert.deepEqual(m.merged.deferred_done, { modules: ['c'], why: 'c waits for layer 2 by Bob\'s word' });
  // A suite that failed on its head is no work done: deferred as before, the merge not held for it.
  const red = (s, k) => (k === 658 ? [{ user: { login: BOT }, body: block(GATE, { runs: [{ sha: h, ok: false, trigger: 'code', suite: 'fail' }] }, 'gate') }] : []);
  const p2 = product({ done: true });
  layerOpen(p2.root, 1, { io: openIO, log: quiet });
  const h2 = jobWork(p2.bare, 'c', { 'process/ledger/c.json': entry('c', { layer: 1, status: { state: 'BLOCKED', reason: 'x' } }) });
  assert.deepEqual(layerStatus(p2.root, 1, { io: { ...openIO, openPRs: () => [{ number: 658, draft: true, head: { ref: 'job/c', sha: h2 } }], comments: red }, log: quiet }).deferred_done, []);
});

test('layer sync names a job BLOCKED only on the ledger-carry finding it just cleared, with its --restart line', async () => {
  const { root, bare } = product({ done: true });
  commit(root, { 'build/layers.md': layers.replace('| 1 | One | a, b, c |', '| 1 | One | a, b, c, e |'), 'req/e.md': req('e') }, 'e joins layer 1');
  setPin(root, git(['rev-parse', 'HEAD'], { cwd: root }), 'pin 1');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche:layer/1'], { cwd: root });
  writeRows(root, SB, 'open', [[flowFile(1, 'open'), { row: 'open', layer: 1, branch: 'layer/1', tranche: 'tranche', from: git(['rev-parse', 'tranche'], { cwd: root }), at: new Date().toISOString(), by: 'bob' }]]);
  jobWork(bare, 'e', { 'process/ledger/e.json': entry('e', { layer: 1, status: { state: 'BLOCKED', reason: 'the gate refuses my carried entry' } }), 'src/e/index.mjs': 'export const e = 1;\n' });
  git(['fetch', '-q', 'origin'], { cwd: root });
  commit(root, { 'process/ledger/e.json': entry('e', { layer: 1 }) }, 'Merge PR 638');
  setPin(root, git(['rev-parse', 'HEAD'], { cwd: root }), 'pin move 2');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  const open = [{ number: 658, draft: true, head: { ref: 'job/e', sha: null } }];
  const r = await layerSync(root, 1, { io: { ...syncIO(bare, []), openPRs: (s, base) => (base === 'layer/1' ? open : []) }, log: quiet });
  assert.equal(r.jobs.left.length, 1);
  assert.match(r.jobs.left[0].why, /^BLOCKED only on the ledger-carry finding this sync cleared \(process\/ledger\/e\.json is on layer\/1 now\): restart it to publish: .*job start e --live <n> --restart "/);
});

test('land: a user joined to this layer (R12) is rescheduled with the layer\'s own, not noticed as a later layer\'s (cold review of PR 191)', async () => {
  const { root, bare } = await opened();
  writeRows(root, SB, 'd joins layer 1', [[flowFile(1, 'join', 'd'), { row: 'join', layer: 1, module: 'd', from: 2, why: 'test', at: new Date().toISOString(), by: 'bob' }]]);
  fetchState(root, SB, { fresh: true });
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\nexport const a2 = 1;\n' });
  const ra = await layerLand(root, 2, { io: landIO(bare, { 2: prOf(2, 'a', ha) }), log: quiet });
  assert.equal(ra.land.interface.changed, true);
  assert.deepEqual([...ra.land.users_rescheduled].sort(), ['b', 'd']);
  assert.deepEqual(ra.land.users_noticed, []);
});

// Coordinator, 6 Nov 17:45: after layer sync, every restarted job hit a job sync conflict on its own
// entry (BLOCKED on the branch, OPEN on the layer) and resolved it by hand, keeping its status.
test('job sync joins a conflict on the job\'s own entry: the layer\'s entry, the job\'s status; a fixed field both sides changed is refused', () => {
  const { root } = lateEntry({ local: true });
  jobStart(root, 'e', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/e'], { cwd: root });
  commit(root, { 'process/ledger/e.json': entry('e', { layer: 1, status: { state: 'BLOCKED', reason: 'the gate refuses my carried entry' } }) }, 'job block e');
  // The layer takes e's entry (layer sync), OPEN, with a path the job's copy lacks.
  git(['checkout', '-q', 'layer/1'], { cwd: root });
  commit(root, { 'process/ledger/e.json': entry('e', { layer: 1, paths: ['src/e/', 'lib/e/'] }) }, 'Merge layer sync PR 666');
  git(['checkout', '-q', 'job/e'], { cwd: root });
  const lines = [];
  const r = jobSync(root, 'e', { push: false, log: (l) => lines.push(l) });
  assert.deepEqual(r.merged, ['layer/1']);
  const e = JSON.parse(git(['show', 'HEAD:process/ledger/e.json'], { cwd: root }));
  assert.deepEqual([e.status.state, e.paths], ['BLOCKED', ['src/e/', 'lib/e/']]);
  assert.ok(lines.some((l) => /process\/ledger\/e\.json: layer\/1's entry, with e's own status \(BLOCKED\); the branch's own paths not kept/.test(l)), lines.join('\n'));
  assert.equal(git(['status', '--porcelain'], { cwd: root }), '', 'merged and committed');
  // Both sides change the same fixed field, differently: refused, the merge left for the job.
  commit(root, { 'process/ledger/e.json': { ...e, paths: ['src/e/'], status: { state: 'WORKING' } } }, 'job narrows its paths');
  git(['checkout', '-q', 'layer/1'], { cwd: root });
  commit(root, { 'process/ledger/e.json': entry('e', { layer: 1, paths: ['src/e/', 'lib/e/', 'more/e/'], status: { state: 'OPEN', reason: 'r' } }) }, 'the layer widens them');
  git(['checkout', '-q', 'job/e'], { cwd: root });
  const l2 = [];
  assert.throws(() => jobSync(root, 'e', { push: false, log: (l) => l2.push(l) }), /layer\/1 does not merge cleanly: process\/ledger\/e\.json/);
  assert.ok(l2.some((l) => /both sides changed paths; resolve it by hand/.test(l)));
  git(['merge', '--abort'], { cwd: root });
});
