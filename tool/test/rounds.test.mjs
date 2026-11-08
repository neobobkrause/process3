// BD-R1 (Bob, 8 Nov): walks end rounds; a new round runs the plan's layers again, in order, for
// the modules the walk named flawed, skipping layers with none; rounds repeat until an internal walk
// is clean (rounds.mjs, C39). The completion layer the copy opened under PD-12 keeps working.
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { layersAt } from '../lib/layerbase.mjs';
import { flowRows, layerJobs, layerLines, layerOpen, layerReport, openLayer, writeRows } from '../lib/layerflow.mjs';
import { flawedModules, roundState } from '../lib/rounds.mjs';
import { fetchState, writeState } from '../lib/state.mjs';
import { configOf, git, loadConfig } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const SB = 'process-state';
const io = { slug: 'o/p', openPRs: () => [], comments: () => [] };
const req = (id) => `# ${id}\n\n## Public\n\n### Provides\n\n- ${id}()\n\n**R1** a requirement\n`;
const LAYERS = '| layer | name | modules |\n| --- | --- | --- |\n| 1 | One | a, b |\n| 2 | Two | c |\n| 3 | Three | d |\n';

// Three map layers, every module COMPLETE with no unmet mark: round 1's layers are behind.
function product(config = {}) {
  const files = { 'process/config.json': { merge_strategy: 'layer', ...config }, 'build/layers.md': LAYERS };
  for (const id of ['a', 'b', 'c', 'd']) {
    files[`process/ledger/${id}.json`] = entry(id, { status: { state: 'COMPLETE' } });
    files[`req/${id}.md`] = req(id);
    files[`src/${id}/index.mjs`] = `export const ${id} = 1;\n`;
    files[`test/${id}/t.test.mjs`] = "import test from 'node:test'; test('ok', () => {});\n";
  }
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'origin.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  return root;
}
const push = (root, files, msg = 'x') => { commit(root, files, msg); git(['push', '-q', 'origin', 'tranche'], { cwd: root }); git(['fetch', '-q', 'origin'], { cwd: root }); };
// A found mark on a module (PLN-3), as `found` enters it.
const mark = (id, n, finding, source = 'walk p3dev-r 0123456789') => ({ [`req/${id}.md`]: `${req(id)}- **F${n}** *(not yet met: ${source})* ${finding}\n` });
const at = (min) => new Date(Date.UTC(2026, 10, 8, 12, min)).toISOString();
// A round-close run's row (deploy dev), as the state branch holds it.
function walked(root, { min, failures = 0 }) {
  const row = { row: 'dev-deploy', tranche: 'tranche', slug: 'p3dev-r', commit: '0123456789abcdef', ok: !failures, ...(failures ? { stopped: 'walk' } : {}), walk: { failures }, internal_walk: { ok: !failures, failures }, at: at(min) };
  writeState(root, SB, 'deploy row', (w) => { mkdirSync(join(w, 'deploys'), { recursive: true }); appendFileSync(join(w, 'deploys', 'dev.jsonl'), JSON.stringify(row) + '\n'); });
  fetchState(root, SB, { fresh: true });
}
const merged = (root, n, min) => { writeRows(root, SB, `merged ${n}`, [[`layerflow/${n}/merged.json`, { row: 'merged', layer: n, commit: 'f'.repeat(40), at: at(min) }]]); fetchState(root, SB, { fresh: true }); };

// roundState alone: the layers, their rows and the flawed modules given.
const map = [{ n: 1, mods: ['a', 'b'] }, { n: 2, mods: ['c'] }, { n: 3, mods: ['d'] }];
const flowsOf = (rows) => (n) => rows[n] || {};
const state = (layers, rows, flawed, lastWalk) => roundState(null, configOf({}), null, { layers, flows: flowsOf(rows), lastWalk, flawed: new Map(Object.entries(flawed)) });
const F = (id, n = 1) => [{ id: `F${n}`, module: id, what: 'x' }];

test('roundState: round 1 ends at its walk; the walk\'s flawed modules open round 2 at their lowest map layer, skipping layers with none', () => {
  const rows = { 1: { merged: { at: at(1) } }, 2: { merged: { at: at(2) } }, 3: { merged: { at: at(3) } } };
  // Every layer of round 1 merged, no walk since: the walk ends it.
  assert.deepEqual(state(map, rows, { d: F('d') }, null), { state: 'walk', round: 1 });
  assert.deepEqual(state(map, rows, { d: F('d') }, { at: at(0), slug: 's', commit: 'c' }), { state: 'walk', round: 1 }, 'a walk before the last merge did not end it');
  // The walk after: d (map layer 3) flawed only: round 2's first layer is map layer 3's; 1 and 2 skipped.
  const s = state(map, rows, { d: F('d') }, { at: at(9), slug: 'p3dev-r', commit: '0123456789' });
  assert.equal(s.state, 'new');
  assert.deepEqual([s.round, s.next.n, s.next.of, s.next.mods], [2, 4, 3, 'd'.split(',')]);
  assert.equal(s.walk, 'p3dev-r 0123456789');
  // No flawed module after the walk: clean.
  assert.equal(state(map, rows, {}, { at: at(9), slug: 's', commit: 'c' }).state, 'clean');
});

test('roundState: a round passes the map in order; a mark found mid-round in a later map layer joins it, one in an earlier map layer waits for the next round', () => {
  const r2a = { n: 4, mods: ['b'], round: { n: 2, of: 1, mods: ['b'], items: F('b') } };
  const rows = { 1: { merged: { at: at(1) } }, 2: { merged: { at: at(2) } }, 3: { merged: { at: at(3) } }, 4: { open: { at: at(11) } } };
  const walk = { at: at(10), slug: 's', commit: 'c' };
  // Round 2's layer 4 open: the round is open on it.
  const open = state([...map, r2a], rows, { b: F('b'), d: F('d') }, walk);
  assert.deepEqual([open.state, open.round, open.layer.n], ['layer', 2, 4]);
  // Merged: d (map layer 3) is next in round 2; map layer 2 (no flawed module) skipped.
  rows[4] = { open: { at: at(11) }, merged: { at: at(12) } };
  const next = state([...map, r2a], rows, { d: F('d') }, walk);
  assert.deepEqual([next.state, next.round, next.next.n, next.next.of, next.next.mods], ['next', 2, 5, 3, ['d']]);
  // A mark found mid-round on c (map layer 2, after layer 1): it joins round 2's pass, before d.
  const join2 = state([...map, r2a], rows, { c: F('c'), d: F('d') }, walk);
  assert.deepEqual([join2.next.of, join2.next.mods], [2, ['c']]);
  // One on a (map layer 1, already passed): it waits; round 2 has nothing ahead, so its walk is next.
  assert.deepEqual(state([...map, r2a], rows, { a: F('a') }, walk), { state: 'walk', round: 2 });
  // The walk after round 2's last merge: a opens round 3 from map layer 1.
  const r3 = state([...map, r2a], rows, { a: F('a') }, { at: at(20), slug: 's', commit: 'c' });
  assert.deepEqual([r3.state, r3.round, r3.next.of, r3.next.mods], ['new', 3, 1, ['a']]);
});

test('BD-R1 on the flow: the walk\'s found marks open round 2 past the map; its layer lists only the flawed modules with their marks; no completion layer opens', () => {
  const root = product({ completion_file: 'build/round.md' });
  push(root, { 'build/round.md': '- [ ] CR-1 · b · a completion item left open\n' }, 'an open completion item');
  // Round 1's layers are behind (every module COMPLETE): no walk yet, so no layer past the map opens,
  // and a completion layer is not opened for the open item (BD-R1 retires the path).
  const cfg = loadConfig(root);
  fetchState(root, SB, { fresh: true });
  assert.equal(openLayer(root, cfg, { slug: 'o/p', io }).kind, 'done');
  assert.throws(() => layerOpen(root, 4, { io, log: quiet }), /every layer of round 1 has merged: its walk ends it \(the round-close run\): no round layer opens before that walk \(BD-R1\); nothing was opened/);
  assert.equal(git(['ls-remote', '--heads', 'origin', 'layer/4'], { cwd: root }), '', 'no branch cut');
  // The walk fails; its findings are not recorded yet: round 2 waits on them.
  walked(root, { min: 30, failures: 2 });
  push(root, mark('d', 1, 'the d door 500s'));
  assert.throws(() => layerOpen(root, 4, { io, log: quiet }), /round 2 opens from its walk's findings once each is recorded: the latest deploy and walk \(p3dev-r 0123456789\) stopped at walk with 4 finding\(s\), 1 recorded/);
  // Status names the wait, not an open that refuses (cold review of C39).
  const held = openLayer(root, loadConfig(root), { slug: 'o/p', io });
  assert.deepEqual([held.kind, held.round, held.rounds], ['done', 2, 'held']);
  assert.match(layerLines(root, loadConfig(root), { slug: 'o/p', io, view: held }).join('\n'), /layer flow: round 2 opens from the walk's findings once each is recorded: the latest deploy and walk \(p3dev-r 0123456789\) stopped at walk with 4 finding\(s\), 1 recorded/);
  push(root, { ...mark('d', 1, 'the d door 500s'), 'req/c.md': `${req('c')}- **F1** *(not yet met: internal walk p3dev-r 0123456789)* c\n- **F2** *(not yet met: internal walk p3dev-r 0123456789)* c\n- **F3** *(not yet met: walk p3dev-r 0123456789)* c\n` });
  const v = openLayer(root, loadConfig(root), { slug: 'o/p', io });
  assert.deepEqual([v.kind, v.n, v.round, v.of, v.mods], ['next', 4, 2, 2, ['c']]);
  assert.match(layerLines(root, loadConfig(root), { slug: 'o/p', io, view: v }).join('\n'), /layer flow: layer 4 \(round 2, map layer 2, from the walk p3dev-r 0123456789; c\) is next and not open: `node \.process\/tool\/p3\.mjs layer open 4`/);
  const said = [];
  const o = layerOpen(root, 4, { io, log: (l) => said.push(String(l)) });
  assert.equal(o.ok, true);
  assert.equal(o.round, 2);
  assert.match(said.join('\n'), /layer 4 is round 2's pass over map layer 2 \(round 2 opens from the walk p3dev-r 0123456789\): 1 flawed module\(s\) \(c F1, F2, F3\); map layer 1 skipped, no flawed module/);
  assert.match(said.join('\n'), /layer 4 \(round 2, map layer 2\): 1 module\(s\)/);
  // The open row carries the round; the map is not edited.
  assert.deepEqual(flowRows(root, SB, 4).open.round, { n: 2, of: 2, mods: ['c'], items: [{ id: 'F1', module: 'c', what: 'c (internal walk p3dev-r 0123456789)' }, { id: 'F2', module: 'c', what: 'c (internal walk p3dev-r 0123456789)' }, { id: 'F3', module: 'c', what: 'c (walk p3dev-r 0123456789)' }], walk: 'p3dev-r 0123456789' });
  assert.deepEqual(layersAt(root, loadConfig(root), 'origin/tranche').map((L) => [L.n, L.mods.join(',')]), [[1, 'a,b'], [2, 'c'], [3, 'd'], [4, 'c']]);
  // layer jobs names the round, and starts only c, a reopen with its found marks.
  const out = [];
  const j = layerJobs(root, 4, { io, log: (l) => out.push(String(l)) });
  assert.equal(j.round, 2);
  assert.deepEqual(j.startable.map((x) => x.cmd), ['node .process/tool/p3.mjs job start c --sessions <file> --reopen "F1: c (internal walk p3dev-r 0123456789); F2: c (internal walk p3dev-r 0123456789); F3: c (walk p3dev-r 0123456789)"']);
  assert.match(out[0], /^layer 4 \(round 2, map layer 2\): 1 job\(s\) can start/);
  const open = openLayer(root, loadConfig(root), { slug: 'o/p', io });
  assert.deepEqual([open.kind, open.n, open.round, open.of], ['open', 4, 2, 2]);
  assert.match(layerLines(root, loadConfig(root), { slug: 'o/p', io, view: open }).join('\n'), /layer flow: layer 4 \(round 2, map layer 2\) open on layer\/4/);
  // layer report names the round and the map layer it passed over.
  const rep = [];
  const r = layerReport(root, 4, { log: (l) => rep.push(String(l)) });
  assert.deepEqual([r.measures.round, r.measures.of], [2, 2]);
  assert.match(rep[0], /^layer 4 \(round 2, map layer 2\): /);
  // Once it merges, d (map layer 3) is round 2's next: layer 5.
  merged(root, 4, 40);
  push(root, { 'req/c.md': req('c') }, 'c met');
  const n5 = openLayer(root, loadConfig(root), { slug: 'o/p', io });
  assert.deepEqual([n5.kind, n5.n, n5.round, n5.of, n5.mods], ['next', 5, 2, 3, ['d']]);
});

test('flawedModules: unmet found marks in a module\'s requirement file, not a BLOCKED module\'s, nor a met one', () => {
  const root = product();
  push(root, { ...mark('a', 1, 'x'), ...mark('b', 2, 'y'), 'process/ledger/b.json': entry('b', { status: { state: 'BLOCKED', reason: 'r' } }), 'req/c.md': `${req('c')}- ~~**F1**~~ met\n` });
  const f = flawedModules(root, loadConfig(root), 'origin/tranche');
  assert.deepEqual([...f.keys()], ['a']);
  assert.deepEqual(f.get('a'), [{ id: 'F1', module: 'a', what: 'x (walk p3dev-r 0123456789)' }]);
});
