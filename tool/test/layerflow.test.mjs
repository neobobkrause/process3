// The shared layer branch (layerflow.mjs, layerbase.mjs; design note "Shared Layer Branch", Bob,
// 5 Nov): one test per rule the tool holds, on a local product with a bare origin.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, block } from '../lib/github.mjs';
import { jobStart, jobSync, startText } from '../lib/job.mjs';
import { startReady } from '../lib/ready.mjs';
import { bobPrompt } from '../lib/roles.mjs';
import { layerLines } from '../lib/layerflow.mjs';
import { flowFile, jobCfg, layerMap } from '../lib/layerbase.mjs';
import {
  flowRows, interfaceChange, layerCover, layerJobs, layerLand, layerMerge, layerOpen, layerPublish, layerReport,
  layerStatus, moduleStates, outstanding, providesText, resultChanges, startable, trialMeasures, writeRows,
} from '../lib/layerflow.mjs';
import { fetchState, readState } from '../lib/state.mjs';
import { configOf, git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const SB = 'process-state';
const req = (id, provides = `- ${id}() returns a thing`) => `# ${id} — requirements\n\n## Public\n\n### Purpose\n\n${id} does things.\n\n### Provides\n\n${provides}\n\n## Private\n\n### Uses\n\nnothing\n\n**R1** a requirement *(not yet met: T1)*\n`;
const modules = { modules: [{ id: 'a', uses: [] }, { id: 'b', uses: ['a'] }, { id: 'c', uses: [] }, { id: 'd', uses: ['a'] }] };
const layers = '# The layers\n\n| layer | name | modules |\n| --- | --- | --- |\n| 1 | One | a, b, c |\n| 2 | Two | d |\n';

// A product on the tranche with a bare origin: modules a, b (uses a), c in layer 1, d (uses a) in layer 2.
function product({ strategy = 'layer', over = {}, done = false } = {}) {
  const files = {
    'process/config.json': { merge_strategy: strategy, modules_file: 'build/modules.json' },
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
const landIO = (bare, prs, { gate = 'success', open = [] } = {}) => ({
  slug: 'o/p',
  getPR: (s, k) => prs[k],
  checkRun: () => ({ status: 'completed', conclusion: gate }),
  comments: () => [],
  openPRs: () => open,
  merge: (s, k, sha, title) => ghMerge(bare, prs[k].base.ref, sha, title),
});
const openIO = { slug: 'o/p', openPRs: () => [] };

test('config: merge_strategy defaults to the train and refuses anything but train or layer', () => {
  assert.equal(configOf({}).merge_strategy, 'train');
  assert.equal(configOf({ merge_strategy: 'layer' }).merge_strategy, 'layer');
  assert.throws(() => configOf({ merge_strategy: 'batch' }), /merge_strategy "batch" is not "train"/);
});

test('switch off: every layer command is refused and a job keeps the tranche as its base', () => {
  const { root } = product({ strategy: 'train' });
  assert.throws(() => layerOpen(root, 1, { io: openIO, log: quiet }), /merge_strategy is "train"/);
  git(['push', '-q', 'origin', 'tranche:layer/1'], { cwd: root });
  const cfg = jobCfg(root, configOf({ merge_strategy: 'train' }), 'a');
  assert.equal(cfg.tranche, 'tranche');
  assert.equal(cfg.layer, undefined);
});

test('layer map: the modules of each layer, from the layers table', () => {
  assert.deepEqual(layerMap(layers), [{ n: 1, mods: ['a', 'b', 'c'] }, { n: 2, mods: ['d'] }]);
});

test('layer open: cuts layer/<n> from the tranche tip, records the open, and lists every module that can start', () => {
  const { root } = product();
  const lines = [];
  const r = layerOpen(root, 1, { io: openIO, log: (l) => lines.push(l) });
  assert.equal(r.from, git(['rev-parse', 'origin/tranche'], { cwd: root }));
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/layer/1'], { cwd: root }).split('\t')[0], r.from);
  fetchState(root, SB, { fresh: true });
  assert.equal(JSON.parse(readState(root, SB, flowFile(1, 'open'))).from, r.from);
  assert.deepEqual(r.startable.map((x) => x.id), ['a', 'b', 'c']);
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

test('switch on: no job starts outside an open layer, and job start --ready starts nothing (the layer\'s list does)', () => {
  const { root } = product();
  git(['branch', 'layer/1', 'tranche'], { cwd: root });
  assert.throws(() => jobStart(root, 'd', { coordinator: 's', push: false, log: quiet }), /d's layer has no open branch/);
  assert.throws(() => startReady(root, { live: 0, log: quiet, setup: () => ({}) }), /jobs start from the open layer's list/);
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
  const p = (layer) => bobPrompt({ slug: 'o/p', rootId: 'r', approvals: 'a'.repeat(64), layer });
  assert.match(p(true), /jobs to start.*layer jobs <n>/);
  assert.doesNotMatch(p(true), /job start --ready/);
  assert.match(p(false), /job start --ready/);
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

test('interface signal: an export change or a Provides change counts; a change inside the module does not', () => {
  const { root } = product();
  const cfg = configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const inner = commit(root, { 'src/a/index.mjs': 'export function a(x) { const y = x; return y; }\n' }, 'inner');
  assert.equal(interfaceChange(root, cfg, 'a', base, inner).changed, false, 'implementation only');
  const exp = commit(root, { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\n' }, 'signature');
  const x = interfaceChange(root, cfg, 'a', inner, exp);
  assert.equal(x.changed, true);
  assert.deepEqual(x.exports.changed.map((c) => c.name), ['a']);
  const marks = commit(root, { 'req/a.md': req('a').replace(' *(not yet met: T1)*', '') }, 'mark struck');
  assert.equal(interfaceChange(root, cfg, 'a', exp, marks).changed, false, 'a struck mark outside Provides');
  const prov = commit(root, { 'req/a.md': req('a', '- a(x, y) returns their sum') }, 'provides');
  const p = interfaceChange(root, cfg, 'a', marks, prov);
  assert.equal(p.changed, true);
  assert.ok(p.provides);
});

test('interface signal: a changed provider test naming a Public / Provides requirement counts (a return shape the exports do not show); the trigger is named', () => {
  const { root } = product();
  const cfg = configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' });
  const base = commit(root, { 'req/a.md': req('a', '- **R2** `materials(x)` answers the list of materials'), 'test/a/r2.test.mjs': "import test from 'node:test'; test('R2 answers a list', () => {});\n", 'test/a/other.test.mjs': "import test from 'node:test'; test('R9 private', () => {});\n" }, 'R2 in Provides');
  // The answer's shape changes ({materials: [...]}); the exports and the Provides text do not.
  const shape = commit(root, { 'src/a/index.mjs': 'export function a(x) { return { materials: [x] }; }\n', 'test/a/r2.test.mjs': "import test from 'node:test'; test('R2 answers {materials: [...]}', () => {});\n" }, 'shape');
  const x = interfaceChange(root, cfg, 'a', base, shape);
  assert.equal(x.exports, null);
  assert.equal(x.provides, null);
  assert.deepEqual(x.provides_tests, ['test/a/r2.test.mjs']);
  assert.deepEqual(x.triggers, ['provides-test']);
  // A test of a requirement not in Provides changes nothing.
  const priv = commit(root, { 'test/a/other.test.mjs': "import test from 'node:test'; test('R9 private, again', () => {});\n" }, 'private test');
  assert.equal(interfaceChange(root, cfg, 'a', shape, priv).changed, false);
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
  const aHead = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\n' });
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
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\n' });
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
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\n' });
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
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x * y; }\n' });
  prs[3] = prOf(3, 'a', ha);
  await layerLand(root, 3, { io: landIO(bare, prs), log: quiet });
  const j = layerJobs(root, 1, { io: openIO, log: quiet });
  assert.deepEqual(j.startable.map((x) => x.id), ['b']);
  assert.match(j.startable[0].cmd, /--reopen "re-test against the new interface of a/);
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
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x - y; }\n' });
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

test('the gate: a ready job PR into a layer branch runs its suite even when it changes only records; into the tranche it keeps the record path', async () => {
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
  const tr = into('tranche');
  assert.deepEqual([tr.trigger, tr.suite], ['record', 'skipped']);
});

test('the gate\'s layer trigger: a user of the layer that never re-ran after its provider\'s interface change is a finding; a head whose newest run is red covers nothing', async () => {
  const { root, bare } = await opened();
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x * y + 1; }\n' });
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
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return [x, y]; }\n' });
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
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x % y; }\n' });
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
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x ** y; }\n' });
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
});
