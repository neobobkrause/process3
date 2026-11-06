// Work outside the open layer joins the NEXT layer to open, never the tranche directly (the
// coordinator's ruling, 6 Nov): layer join records it, layer open lists it, its job's base is that
// layer's branch, and the routes that printed refused starts print the join.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { jobStart } from '../lib/job.mjs';
import { jobCfg, flowFile } from '../lib/layerbase.mjs';
import { layerJoin, layerOpen, layerPlace, openLayer, writeRows } from '../lib/layerflow.mjs';
import { fetchState, readState } from '../lib/state.mjs';
import { bobStatus, noticeSlots, status } from '../lib/status.mjs';
import { noticeFile } from '../lib/notice.mjs';
import { triageFile } from '../lib/triage.mjs';
import { configOf, git } from '../lib/util.mjs';
import { commit, entry, makeRepo, openPassed } from './helpers.mjs';

const quiet = () => {};
const SB = 'process-state';
const LAYERS = '| layer | name | modules |\n| --- | --- | --- |\n| 1 | One | a |\n| 2 | Two | b |\n| 3 | Three | c |\n';
const req = (marks = "") => `# x\n\n- **R1** a requirement${marks}\n`;
const openIO = { slug: 'o/p', openPRs: () => [] };

// a (layer 1, merged, COMPLETE), b (layer 2, open), c (layer 3, not open).
function product({ aReq = req(), extra = {} } = {}) {
  const files = { 'process/config.json': { tranche: 'tranche' }, 'build/layers.md': LAYERS, ...extra };
  for (const id of ['a', 'b', 'c']) {
    files[`process/ledger/${id}.json`] = entry(id, { requirements: `build/requirements/${id}.md`, ...(id === 'a' ? { status: { state: 'COMPLETE' } } : {}) });
    files[`build/requirements/${id}.md`] = id === 'a' ? aReq : req(' *(not yet met: T1)*');
  }
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'src/a/x.txt': 'layer 1 merged' }, 'layer 1');
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const tip = git(['rev-parse', 'HEAD'], { cwd: root });
  const at = new Date().toISOString();
  writeRows(root, SB, 'layer 1 merged', [[flowFile(1, 'open'), { row: 'open', layer: 1, at }], [flowFile(1, 'merged'), { row: 'merged', layer: 1, commit: tip, at }]]);
  fetchState(root, SB, { fresh: true });
  layerOpen(root, 2, { io: openIO, log: quiet });
  return { root, bare, tip };
}
const cfgOf = () => configOf({ tranche: 'tranche' });

test('layerPlace: a module of a merged layer is behind and joins the layer after the open one; the open and later layers\' are not', () => {
  const { root } = product();
  assert.deepEqual(layerPlace(root, cfgOf(), 'a'), { own: 1, open: 2, cur: 2, target: 3, behind: true, joined: null });
  assert.equal(layerPlace(root, cfgOf(), 'b').behind, false);
  assert.equal(layerPlace(root, cfgOf(), 'c').behind, false);
  assert.equal(layerPlace(root, cfgOf(), 'zz').behind, true, 'no layer: behind');
});

test('job start of a merged layer\'s module is refused naming layer join; layer join records it once for the next layer; the open layer\'s module is refused a join', () => {
  const { root } = product();
  assert.throws(() => jobStart(root, 'a', { coordinator: 's', push: false, reopen: 'meet F1', log: quiet }), /a's layer has no open branch .*layer join a --why/);
  const out = [];
  assert.deepEqual(layerJoin(root, 'a', { why: 'provider notice x:1', log: (l) => out.push(l) }), { ok: true, layer: 3, recorded: true });
  assert.match(out[0], /^a joins layer 3: provider notice x:1; it starts from node \.process\/tool\/p3\.mjs layer jobs 3 once layer 3 opens/);
  fetchState(root, SB, { fresh: true });
  const row = JSON.parse(readState(root, SB, flowFile(3, 'join', 'a')));
  assert.deepEqual([row.row, row.layer, row.module, row.from, row.why], ['join', 3, 'a', 1, 'provider notice x:1']);
  assert.equal(layerJoin(root, 'a', { why: 'again', log: quiet }).recorded, false, 'once');
  assert.throws(() => layerJoin(root, 'b', { why: 'x', log: quiet }), /b is in layer 2, the open layer: it starts from .*layer jobs 2; nothing recorded/);
  assert.throws(() => layerJoin(root, 'a', { log: quiet }), /--why/);
});

test('the joined layer, once open, lists the joined module\'s start (a reopen for a COMPLETE one) and is its job\'s base', () => {
  const { root, tip } = product();
  layerJoin(root, 'a', { why: 'found marks F1', log: quiet });
  const at = new Date().toISOString();
  writeRows(root, SB, 'layer 2 merged', [[flowFile(2, 'merged'), { row: 'merged', layer: 2, commit: tip, at }]]);
  const out = [];
  const o = layerOpen(root, 3, { io: openIO, log: (l) => out.push(l) });
  assert.deepEqual(o.startable.map((x) => x.id).sort(), ['a', 'c']);
  assert.equal(o.startable.find((x) => x.id === 'a').cmd, 'node .process/tool/p3.mjs job start a --live <n> --reopen "found marks F1"');
  const c = jobCfg(root, cfgOf(), 'a');
  assert.deepEqual([c.tranche, c.layer.n, c.layer.joined], ['layer/3', 3, true]);
  assert.equal(jobCfg(root, cfgOf(), 'b').tranche, 'tranche', 'its own layer merged, no join: no base');
});

test('status: a train-era job PR into the tranche is named with close and restart in its layer; a merged layer\'s is told to join', () => {
  const { root } = product();
  const cfg = cfgOf();
  const lines = (id) => { const L = []; bobStatus(root, cfg, { rows: [{ id, tranche: 'OPEN', branch: 'WORKING', pr: '#7 draft' }], prs: [{ number: 7, head: { ref: `job/${id}` }, base: { ref: 'tranche' } }], offline: true, log: (l) => L.push(l) }); return L.join('\n'); };
  assert.match(lines('b'), /owed:\n- b: .*train-era job PR #7 into tranche: close it unmerged \(never deleting its branch\) and restart in layer 2 \(node \.process\/tool\/p3\.mjs layer jobs 2 once it opens\)/);
  assert.match(lines('a'), /train-era job PR #7 into tranche: close it unmerged .* and restart in layer 3 \(node \.process\/tool\/p3\.mjs layer join a --why/);
  const none = []; bobStatus(root, cfg, { rows: [{ id: 'b', tranche: 'OPEN', branch: 'WORKING', pr: '#8 draft' }], prs: [{ number: 8, head: { ref: 'job/b' }, base: { ref: 'layer/2' } }], offline: true, log: (l) => none.push(l) });
  assert.doesNotMatch(none.join('\n'), /train-era/, 'a PR into the layer is not the train\'s');
});

test('next work: found work on a merged layer\'s module names its join, never a start on the tranche', () => {
  const { root } = product({ aReq: req() + '- **F1** *(not yet met: walk)* found\n' });
  openPassed(root);
  const out = [];
  status(root, { role: 'bob', offline: true, log: (l) => out.push(l) });
  const t = out.join('\n');
  assert.match(t, /build\/requirements\/a\.md: 1.*; joins layer 3: node \.process\/tool\/p3\.mjs layer join a --why "found marks F1"/, t);
});

test('a notice-affected user in a merged layer: its act is the join, never a job start', () => {
  const { root } = product();
  const at = new Date().toISOString();
  writeRows(root, SB, 'notice', [
    [noticeFile('c:9'), { row: 'notice', at, key: 'c:9', provider: 'c', ids: ['R1'], pr: 9, users: ['a', 'b'] }],
    [triageFile('a', 'c:9'), { row: 'triage', key: 'c:9', user: 'a', verdict: 'affected', evidence: 'src/a/x.mjs:1 uses it' }],
    [triageFile('b', 'c:9'), { row: 'triage', key: 'c:9', user: 'b', verdict: 'affected', evidence: 'src/b/x.mjs:1 uses it' }],
  ]);
  fetchState(root, SB, { fresh: true });
  const rows = status(root, { offline: true, log: quiet }).rows;
  const slots = noticeSlots(root, cfgOf(), rows).slots;
  assert.equal(slots.find((x) => x.user === 'a').act, 'node .process/tool/p3.mjs layer join a --why "provider notice c:9" (it joins layer 3, and starts from node .process/tool/p3.mjs layer jobs 3 once that layer opens)');
  assert.match(slots.find((x) => x.user === 'b').act, /^node \.process\/tool\/p3\.mjs job start b --live <n>/, 'the open layer\'s user: as before');
});

test('open_by uses: a later layer\'s module ready by its uses is owed to its layer, not listed as next work', () => {
  const { root } = product({ extra: { 'process/config.json': { tranche: 'tranche', modules_file: 'process/modules.json' }, 'process/modules.json': { modules: [{ id: 'a', uses: [] }, { id: 'b', uses: [] }, { id: 'c', uses: ['a'] }] } } });
  openPassed(root);
  const out = [];
  // Origin's job heads read (none): the OPEN entries are unstarted, not open jobs.
  const r = status(root, { role: 'bob', offline: true, heads: new Set(), log: (l) => out.push(l) });
  const t = out.join('\n');
  assert.match(t, /owed to their own layers .*:\n- build\/requirements\/c\.md: 1 \(layer 3\): owed to layer 3/, t);
  assert.doesNotMatch(t, /next work[^\n]*\n(- [^\n]*\n)*- build\/requirements\/c\.md: 1 \(layer 3\)(?!: owed)/);
  assert.equal(r.next.find((x) => x.file === 'build/requirements/c.md').owed_layer, 3, 'kept, marked owed');
});

test('joined already: layerPlace names the joined layer, not behind, before and after it opens; a second join records nothing (cold review of PR 191)', () => {
  const { root, tip } = product();
  layerJoin(root, 'a', { why: 'found marks F1', log: quiet });
  fetchState(root, SB, { fresh: true });
  assert.deepEqual(layerPlace(root, cfgOf(), 'a'), { own: 1, open: 2, cur: 2, target: 3, behind: false, joined: 3 });
  const out = [];
  assert.deepEqual(layerJoin(root, 'a', { why: 'again', log: (l) => out.push(l) }), { ok: true, layer: 3, recorded: false });
  assert.match(out[0], /a joined layer 3 already/);
  writeRows(root, SB, 'layer 2 merged', [[flowFile(2, 'merged'), { row: 'merged', layer: 2, commit: tip, at: new Date().toISOString() }]]);
  layerOpen(root, 3, { io: openIO, log: quiet });
  fetchState(root, SB, { fresh: true });
  const p = layerPlace(root, cfgOf(), 'a');
  assert.deepEqual([p.open, p.joined, p.behind, p.target], [3, 3, false, 3], 'never pointed past the layer it joined');
});

test('a layer whose own modules are all complete is not passed over once a module joined it (cold review of PR 191)', () => {
  const done = { 'process/ledger/c.json': entry('c', { requirements: 'build/requirements/c.md', status: { state: 'COMPLETE' } }), 'build/requirements/c.md': req() };
  const { root, tip } = product({ extra: done });
  layerJoin(root, 'a', { why: 'notice x:1', log: quiet });
  writeRows(root, SB, 'layer 2 merged', [[flowFile(2, 'merged'), { row: 'merged', layer: 2, commit: tip, at: new Date().toISOString() }]]);
  fetchState(root, SB, { fresh: true });
  assert.deepEqual(openLayer(root, cfgOf(), { slug: 'o/p', io: openIO }), { kind: 'next', n: 3 });
});

test('layer join with every layer merged says so (cold review of PR 191)', () => {
  const { root, tip } = product();
  const at = new Date().toISOString();
  writeRows(root, SB, 'layers merged', [[flowFile(2, 'merged'), { row: 'merged', layer: 2, commit: tip, at }], [flowFile(3, 'open'), { row: 'open', layer: 3, at }], [flowFile(3, 'merged'), { row: 'merged', layer: 3, commit: tip, at }]]);
  fetchState(root, SB, { fresh: true });
  assert.throws(() => layerJoin(root, 'a', { why: 'x', log: quiet }), /every layer in .* has merged or closed: a has no layer to join/);
});
