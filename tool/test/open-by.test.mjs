// open_by (process/config.json): next work opens by dependency ("uses", the default) or by layer.
// The fixture is the copy's shape, 4 Nov: layer 2 open, layer 3 modules whose providers are done.
import test from 'node:test';
import assert from 'node:assert/strict';
import { entry, makeRepo, openPassed } from './helpers.mjs';
import { blockedJobs, flow, layerState, nextWork, status } from '../lib/status.mjs';
import { setupCheck } from '../lib/setup.mjs';
import { startable } from '../lib/ready.mjs';
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

// Coordinator, 5 Nov (copy at 53066d32): question-explorer (PR 346, draft) and agent-worker (PR 344)
// were listed startable while each had its job's pull request open on a COMPLETE entry.
test('a COMPLETE module with its job pull request open is listed in no list of next work', () => {
  const root = repo();
  const cfg = loadConfig(root);
  const base = status(root, { offline: true, log: quiet }).rows;
  const rows = [...base, { id: 'p2', tranche: 'COMPLETE', req: 'build/requirements/p2.md', pr: '#346 draft' }, { id: 'q2', tranche: 'COMPLETE', req: 'build/requirements/q2.md', pr: '#344 ready' }];
  const ls = layerState(root, cfg, rows, null, { closed: [] });
  const affected = { q2: [{ key: 'base:9', provider: 'base', ids: ['R1'], pr: 9, triage: { verdict: 'affected', evidence: 'x:1' } }] };
  const next = nextWork(root, cfg, rows, null, { log: quiet, state: ls, notices: affected }).map((x) => x.file?.replace('build/requirements/', ''));
  assert.ok(!next.includes('p2.md'), 'the open layer list');
  assert.ok(!next.includes('q2.md'), 'the notice list');
  // The found list (the copy's case): q2 with a found mark and its job pull request open.
  const found = repo({}, { 'build/requirements/q2.md': '- **F1** *(not yet met: x)* found\n' });
  const fr = [...status(found, { offline: true, log: quiet }).rows, { id: 'q2', tranche: 'COMPLETE', req: 'build/requirements/q2.md', pr: '#346 draft' }];
  const at = (rs) => nextWork(found, cfg, rs, null, { log: quiet, state: layerState(found, cfg, rs, null, { closed: [] }) }).map((x) => x.file);
  assert.ok(!at(fr).includes('build/requirements/q2.md'));
  assert.ok(at(fr.map((r) => (r.id === 'q2' ? { ...r, pr: 'merged' } : r))).includes('build/requirements/q2.md'), 'listed once its pull request is not open');
  // Without the open pull requests both are listed: the fixture reaches each list.
  const free = [...base, { id: 'p2', tranche: 'COMPLETE', req: 'build/requirements/p2.md', pr: 'merged' }, { id: 'q2', tranche: 'COMPLETE', req: 'build/requirements/q2.md', pr: 'merged' }];
  const items = nextWork(root, cfg, free, null, { log: quiet, state: layerState(root, cfg, free, null, { closed: [] }), notices: affected });
  const all = items.map((x) => x.file?.replace('build/requirements/', ''));
  assert.ok(all.includes('p2.md') && all.includes('q2.md'));
  // The COMPLETE p2 with unmet requirement marks is reopened to meet them, not left to BOB's judgment.
  assert.deepEqual(startable(items).go.find((g) => g.id === 'p2'), { id: 'p2', file: 'build/requirements/p2.md', reopen: 'meet the unmet requirement marks R1, R2, R3' });
});

test('open_by uses: a provider in a layer recorded closed is done despite its deferred marks, unless BLOCKED or its job is open', () => {
  const layers = LAYERS.replace('| 4 | later | u4 |', '| 4 | later | u4, d4 |');
  const root = repo({}, { 'build/layers.md': layers, 'build/modules.json': { modules: [...MODULES.modules, { id: 'd4', paths: ['src/d4/'], uses: ['p2'] }] }, 'build/requirements/d4.md': unmet(1) });
  const cfg = loadConfig(root);
  const rows = status(root, { offline: true, log: quiet }).rows;
  const at = (rs, closed) => nextWork(root, cfg, rs, null, { log: quiet, state: layerState(root, cfg, rs, null, { closed }) }).map((x) => x.file.replace('build/requirements/', ''));
  const closed = [{ row: 'closed', tranche: 'tranche', layer: 2 }];
  // Layer 2 open: p2's unmet marks hold d4.
  assert.ok(!at(rows, []).includes('d4.md'));
  // Layer 2 recorded closed: p2's marks are deferred and d4 is ready.
  assert.ok(at(rows, closed).includes('d4.md'));
  // Still held while p2 is BLOCKED, or its job is open.
  assert.ok(!at([...rows, { id: 'p2', tranche: 'COMPLETE', req: 'build/requirements/p2.md', blocked: 'why', flag: 'BLOCKED' }], closed).includes('d4.md'));
  assert.ok(!at([...rows, { id: 'p2', tranche: 'COMPLETE', req: 'build/requirements/p2.md', pr: '#7 draft' }], closed).includes('d4.md'));
});

test('status: the flow line, and each BLOCKED job with its age, oldest first, its ruling owed past decision_minutes and by whom', () => {
  const ago = (m) => new Date(Date.now() - m * 6e4).toISOString();
  const blocked = (reason, m) => ({ status: { state: 'BLOCKED', reason, at: ago(m) } });
  const root = repo({ coordinator: 'session_coord' }, {
    'process/ledger/x3.json': entry('x3', { requirements: 'build/requirements/x3.md', ...blocked('the test harness cannot reach the worker', 45) }),
    'process/ledger/w3.json': entry('w3', { requirements: 'build/requirements/w3.md', ...blocked('requirement R1 contradicts R2', 90) }),
    'process/ledger/v3.json': entry('v3', { requirements: 'build/requirements/v3.md', ...blocked('waiting on a fixture', 5) }),
  });
  const out = [];
  const r = status(root, { role: 'bob', offline: true, live: 3, log: (m) => out.push(m) });
  const t = out.join('\n');
  assert.match(t, /blocked:\n- w3: [^\n]*; blocked 9\d min; ruling owed by Bob: requirement R1 contradicts R2\n- x3: [^\n]*; blocked 4\d min; ruling owed by the coordinator \(session_coord\): the test harness cannot reach the worker\n- v3: [^\n]*; blocked \d min\n/);
  assert.match(t, /^flow: live 3\/20 \(default\), startable \d+, blocked 3 \(oldest 9\d min\)$/m);
  assert.deepEqual([r.flow.startable, r.flow.blocked], [startable(r.next).go.length, 3]);
  // Startable is what job start --ready would start: an open attempt, or a file with no entry, is not.
  assert.equal(flow({}, [], [{ file: 'r/a.md', count: 1, module: 'a', entry_state: 'OPEN', attempt_open: true }, { file: 'r/b.md', count: 1 }], 0).startable, 0);
  // Deferred (a reason, its pull request closed, on a reopened COMPLETE module too) awaits no ruling;
  // a reason naming a requirement id is Bob's.
  const old = ago(60);
  assert.deepEqual(blockedJobs({}, [{ id: 'd', tranche: 'COMPLETE', flag: 'BLOCKED', blocked: 'x', pr: 'merged', since: old }, { id: 'e', tranche: 'BLOCKED', blocked: 'R4 contradicts R7', pr: '#9 draft', since: old }]).map((b) => [b.id, b.by]), [['e', 'Bob']]);
});
