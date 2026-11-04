// open_by (process/config.json): next work opens by dependency ("uses", the default) or by layer.
// The fixture is the copy's shape, 4 Nov: layer 2 open, layer 3 modules whose providers are done.
import test from 'node:test';
import assert from 'node:assert/strict';
import { entry, makeRepo, openPassed } from './helpers.mjs';
import { layerState, nextWork, status } from '../lib/status.mjs';
import { setupCheck } from '../lib/setup.mjs';
import { git, loadConfig } from '../lib/util.mjs';

const quiet = () => {};
const unmet = (n) => Array.from({ length: n }, (_, i) => `- **R${i + 1}** *(not yet met: x)* text`).join('\n') + '\n- **R99** met\n';
const LAYERS = '| layer | what | modules |\n|---|---|---|\n| 1 | base | base |\n| 2 | open | p2, q2, busy |\n| 3 | users | u3, w3, x3, v3, z3, n3, e3 |\n| 4 | later | u4 |\n';
const MODULES = { modules: [
  { id: 'base', paths: ['src/base/'], uses: [] },
  { id: 'p2', paths: ['src/p2/'], uses: ['base'] },
  { id: 'q2', paths: ['src/q2/'], uses: ['base'] },
  { id: 'busy', paths: ['src/busy/'], uses: ['base'] },
  { id: 'u3', paths: ['src/u3/'], uses: ['q2', 'base'] }, // providers done: ready
  { id: 'w3', paths: ['src/w3/'], uses: ['p2'] }, // a provider with unmet marks: waits
  { id: 'v3', paths: ['src/v3/'], uses: ['busy'] }, // a provider with an open job: waits
  { id: 'z3', paths: ['src/z3/'], uses: ['ghost'] }, // a provider missing from the map: a gap
  { id: 'n3', paths: ['src/n3/'], uses: ['q2'] }, // ready, with more unmet than u3
  { id: 'e3', paths: ['src/e3/'], uses: [] }, // uses nothing: ready
  { id: 'u4', paths: ['src/u4/'], uses: ['u3'] }, // u3 has unmet marks: waits
  // x3 has no entry: it waits for its layer.
] };
const FILES = {
  'build/layers.md': LAYERS,
  'build/modules.json': MODULES,
  'build/requirements/base.md': unmet(0),
  'build/requirements/p2.md': unmet(3),
  'build/requirements/q2.md': unmet(0),
  'build/requirements/busy.md': unmet(0),
  'build/requirements/u3.md': unmet(2),
  'build/requirements/w3.md': unmet(1),
  'build/requirements/x3.md': unmet(1),
  'build/requirements/v3.md': unmet(1),
  'build/requirements/z3.md': unmet(1),
  'build/requirements/n3.md': unmet(4),
  'build/requirements/e3.md': unmet(5),
  'build/requirements/u4.md': unmet(1),
  'process/ledger/busy.json': entry('busy', { requirements: 'build/requirements/busy.md' }),
};
const repo = (config = {}, files = {}) => {
  const root = makeRepo({ ...FILES, 'process/config.json': { modules_file: 'build/modules.json', ...config }, ...files });
  openPassed(root);
  return root;
};

test('open_by uses (the default): past the open layer, each module whose providers are done is next work, after the open layer, with its layer', () => {
  const root = repo();
  const out = [];
  const r = status(root, { role: 'bob', offline: true, log: (m) => out.push(m) });
  assert.deepEqual(r.next.map((x) => x.file.replace('build/requirements/', '')), ['p2.md', 'u3.md', 'n3.md', 'e3.md']);
  const t = out.join('\n');
  assert.match(t, /next work, layer 2 .*\n- build\/requirements\/p2\.md: 3 \(layer 2\)\n- build\/requirements\/u3\.md: 2 \(layer 3\)\n- build\/requirements\/n3\.md: 4 \(layer 3\)\n- build\/requirements\/e3\.md: 5 \(layer 3\)$/m);
  // A module whose uses names a module missing from the map is not ready, and the gap is named.
  assert.match(t, /not ready, its uses not in build\/layers\.md: z3 \(layer 3\) uses ghost/);
  assert.doesNotMatch(t, /(w3|x3|v3|z3|u4)\.md: /);
});

test('open_by layer: the open layer only, as before', () => {
  const root = repo({ open_by: 'layer' });
  const out = [];
  const r = status(root, { role: 'bob', offline: true, log: (m) => out.push(m) });
  assert.deepEqual(r.next.map((x) => x.file), ['build/requirements/p2.md']);
  assert.doesNotMatch(out.join('\n'), /not ready, its uses/);
});

test('open_by uses: a provider triage judged affected by a notice holds its users, an untriaged one does not; an open job on a ready module takes it off the list', () => {
  const root = repo();
  const cfg = loadConfig(root);
  const rows = status(root, { offline: true, log: quiet }).rows;
  const ls = layerState(root, cfg, rows, null, { closed: [] });
  const notice = { key: 'base:9', provider: 'base', ids: ['R1'], pr: 9 };
  const at = (owed) => nextWork(root, cfg, rows, null, { log: quiet, state: ls, notices: owed }).map((x) => x.file?.replace('build/requirements/', '') ?? x.triage);
  // Not yet triaged: q2 is no notice work yet (its triage is BOB's act), and holds nothing
  // (coordinator, 4 Nov: membership:77 untriaged held 90+ modules).
  assert.deepEqual(at({ q2: [{ ...notice, triage: null }] }), ['p2.md', 'u3.md', 'n3.md', 'e3.md', 'base:9']);
  // Judged affected: q2 is notice work, and u3 and n3 wait on it.
  assert.deepEqual(at({ q2: [{ ...notice, triage: { verdict: 'affected', evidence: 'x:1' } }] }), ['p2.md', 'e3.md', 'q2.md']);
  const busy = repo({}, { 'process/ledger/u3.json': entry('u3', { requirements: 'build/requirements/u3.md' }) });
  const r = status(busy, { role: 'bob', offline: true, log: quiet });
  assert.deepEqual(r.next.map((x) => x.file.replace('build/requirements/', '')), ['p2.md', 'n3.md', 'e3.md']);
});

test('open_by uses: without a modules file every module waits for its layer; layer close is unchanged', () => {
  const root = repo({ modules_file: null });
  assert.deepEqual(status(root, { role: 'bob', offline: true, log: quiet }).next.map((x) => x.file), ['build/requirements/p2.md']);
  const ls = status(repo(), { role: 'bob', offline: true, log: quiet }).layer;
  assert.equal(ls.cur.n, 2);
  assert.equal(ls.ready, false);
});

test('open_by: an unknown value is refused by status and named by setup check', () => {
  const root = repo({ open_by: 'whenever' });
  assert.throws(() => status(root, { role: 'bob', offline: true, log: quiet }), /open_by "whenever" in process\/config\.json is not one of "uses", "layer"/);
  const lines = [];
  const r = setupCheck(repo(), { slug: 'o/r', conditions: [], io: { api: () => null, openPRs: () => [], prFiles: () => [] }, log: (l) => lines.push(l) });
  assert.match(r.open_by, /^next work opens by: uses \(open_by\)/);
  assert.match(lines.join('\n'), /next work opens by: uses/);
  const old = setupCheck(repo({ open_by: 'layer' }), { slug: 'o/r', conditions: [], io: { api: () => null, openPRs: () => [], prFiles: () => [] }, log: quiet });
  assert.match(old.open_by, /^next work opens by: layer \(open_by\)/);
});

test('a layer with no unmet marks closes implicitly only when no job of it merged in this tranche; one with work owes layer close', () => {
  const done = { 'build/requirements/p2.md': unmet(0), 'process/ledger/busy.json': entry('busy', { requirements: 'build/requirements/busy.md', status: { state: 'COMPLETE' } }) };
  // busy's job merged in this tranche (its entry not on main): layer 2 is the open layer, ready to close.
  const worked = repo({}, done);
  const out = [];
  const r = status(worked, { role: 'bob', offline: true, log: (m) => out.push(m) });
  assert.equal(r.layer.cur.n, 2);
  assert.equal(r.layer.ready, true);
  assert.match(out.join('\n'), /layer 2 ready to close: .* layer close 2/);
  assert.doesNotMatch(out.join('\n'), /layer 2 closed: no unmet marks/);
  // The same layer with that job already on main: no work in this tranche, it closes with its one line.
  const quietLayer = repo({}, done);
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: quietLayer });
  const out2 = [];
  const q = status(quietLayer, { role: 'bob', offline: true, log: (m) => out2.push(m) });
  assert.equal(q.layer.cur.n, 3);
  assert.match(out2.join('\n'), /layer 2 closed: no unmet marks/);
  assert.doesNotMatch(out2.join('\n'), /layer 2 ready to close/);
});

test('open_by uses: a gap is named only past the open layer, where the module is not ready', () => {
  const mods = { modules: [...MODULES.modules.filter((m) => m.id !== 'p2'), { id: 'p2', paths: ['src/p2/'], uses: ['ghost'] }] };
  const out = [];
  const r = status(repo({}, { 'build/modules.json': mods }), { role: 'bob', offline: true, log: (m) => out.push(m) });
  assert.ok(r.next.some((x) => x.file === 'build/requirements/p2.md'), 'the open layer is unchanged');
  assert.doesNotMatch(out.join('\n'), /not ready, its uses not in build\/layers\.md: p2/);
  assert.match(out.join('\n'), /not ready, its uses not in build\/layers\.md: z3 \(layer 3\) uses ghost/);
});
