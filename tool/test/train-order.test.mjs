// The merge train's order and provider hold (order.mjs), as pure functions: the sort with aging,
// the precise provider edge, cycles, red providers, and a fixture shaped like the copy on 5 Nov
// 05:33 (45 open job PRs, a blanket `uses` hold held 41) where the train must not stall.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { agedFromOf, fullGateMinutes, holdLine, orderQueue, providerHolds, usesGraph } from '../lib/order.mjs';

const T0 = Date.parse('2026-11-05T06:00:00Z');
const at = (minAgo) => new Date(T0 - minAgo * 60000).toISOString();
const ns = (xs) => xs.map((x) => x.n);

test('order: the release path first, then providers holding users, then the shortest expected gate, then the oldest green', () => {
  const q = [
    { n: 1, green_at: at(10), gate_min: 3 },
    { n: 2, green_at: at(20), gate_min: 40 },
    { n: 3, green_at: at(5), gate_min: 9, release: true },
    { n: 4, green_at: at(30), gate_min: 1, release: true },
    { n: 5, green_at: at(1), gate_min: 30, holds: 2 },
    { n: 6, green_at: at(15), gate_min: 3 },
  ];
  assert.deepEqual(ns(orderQueue(q, { now: T0 })), [4, 3, 5, 6, 1, 2]);
});

test('order: unknown gate minutes count as the median of those known', () => {
  const q = [{ n: 1, green_at: at(1), gate_min: 2 }, { n: 2, green_at: at(2), gate_min: 10 }, { n: 3, green_at: at(3), gate_min: 20 }, { n: 4, green_at: at(4), gate_min: null }];
  // Median of 2, 10, 20 is 10: PR 4 ties PR 2 and is older.
  assert.deepEqual(ns(orderQueue(q, { now: T0 })), [1, 4, 2, 3]);
  // Nothing known: the oldest green first, as before.
  assert.deepEqual(ns(orderQueue(q.map((x) => ({ ...x, gate_min: null })), { now: T0 })), [4, 3, 2, 1]);
});

test('order: a pull request green over 45 min goes ahead of all the rest, oldest first, release path or not', () => {
  const q = [
    { n: 1, green_at: at(5), gate_min: 1, release: true },
    { n: 2, green_at: at(50), gate_min: 42 },
    { n: 3, green_at: at(70), gate_min: 40 },
    { n: 4, green_at: at(44), gate_min: 41 },
    { n: 5, green_at: at(2), gate_min: 2, holds: 3 },
  ];
  assert.deepEqual(ns(orderQueue(q, { now: T0 })), [3, 2, 1, 5, 4]);
  // A long gate is never starved: as small PRs keep arriving, plane ages past them.
  const plane = { n: 9, green_at: at(46), gate_min: 42 };
  const small = Array.from({ length: 8 }, (_, i) => ({ n: 20 + i, green_at: at(i), gate_min: 3 }));
  assert.equal(orderQueue([...small, plane], { now: T0 })[0].n, 9);
});

test('order: the time a pull request was held does not age it', () => {
  const q = [{ n: 1, green_at: at(60), gate_min: 40 }, { n: 2, green_at: at(10), gate_min: 3 }];
  const heldUntil = { 1: T0 - 5 * 60000 }; // held until 5 min ago
  const agedFrom = (c) => Math.max(Date.parse(c.green_at), heldUntil[c.n] || 0);
  assert.deepEqual(ns(orderQueue(q, { now: T0, agedFrom })), [2, 1]);
  assert.deepEqual(ns(orderQueue(q, { now: T0 })), [1, 2], 'unheld, it would have aged');
});

const job = (n, id, o = {}) => ({ n, id, head: `h${n}`, ...o });
const checks = ({ exports = () => true, imports = () => true, red = () => false } = {}) => ({ exportsChanged: exports, importsFrom: imports, red });

test('provider hold: a user waits for its open provider, a draft one too, and not for a red one', () => {
  const modules = [{ id: 'grammar', uses: [] }, { id: 'screens', uses: ['grammar'] }, { id: 'actions', uses: ['grammar'] }];
  const g = usesGraph(modules);
  const jobs = [job(396, 'grammar'), job(420, 'screens'), job(431, 'actions')];
  const cands = jobs.filter((j) => j.n !== 396);
  const h = providerHolds(cands, jobs, { ...g, ...checks() });
  assert.deepEqual([...h.keys()], [420, 431]);
  assert.deepEqual(h.get(420), [{ provider: 'grammar', pr: 396, draft: false }]);
  assert.match(holdLine(cands[0], h.get(420)), /^PR 420 \(screens\) held: it imports grammar, whose open PR 396 changes its exports; it goes once that provider merges$/);
  // The provider is a draft: it still holds.
  assert.equal(providerHolds(cands, [job(396, 'grammar', { draft: true }), ...cands], { ...g, ...checks() }).size, 2);
  // Red on its head: it holds nothing.
  assert.equal(providerHolds(cands, jobs, { ...g, ...checks({ red: (p) => p.n === 396 }) }).size, 0);
  // Merged (no open PR): nothing held.
  assert.equal(providerHolds(cands, cands, { ...g, ...checks() }).size, 0);
});

test('provider hold: a uses cycle holds nothing, neither way', () => {
  const g = usesGraph([{ id: 'drafts', uses: ['worker'] }, { id: 'worker', uses: ['harness'] }, { id: 'harness', uses: ['drafts'] }]);
  const jobs = [job(1, 'drafts'), job(2, 'worker'), job(3, 'harness')];
  assert.equal(providerHolds(jobs, jobs, { ...g, ...checks() }).size, 0);
});

test('provider hold: no export change, no import of the provider, or an unread check holds nothing, and the unread one is said', () => {
  const g = usesGraph([{ id: 'p', uses: [] }, { id: 'u', uses: ['p'] }]);
  const jobs = [job(1, 'p'), job(2, 'u')];
  const u = [jobs[1]];
  assert.equal(providerHolds(u, jobs, { ...g, ...checks({ exports: () => false }) }).size, 0);
  assert.equal(providerHolds(u, jobs, { ...g, ...checks({ imports: () => false }) }).size, 0);
  const notes = [];
  const h = providerHolds(u, jobs, { ...g, ...checks({ exports: () => { throw new Error('job/p at h1 is not fetched'); } }), note: (l) => notes.push(l) });
  assert.equal(h.size, 0);
  assert.match(notes[0], /^PR 2 \(u\) is not held for provider p \(PR 1\): job\/p at h1 is not fetched/);
});

test('provider hold: on a fixture like the copy at 05:33 (45 open job PRs, nearly all with an open provider in uses, few export dependencies) the train does not stall', () => {
  // 45 modules in a chain-heavy graph: each uses the five before it, so 44 of 45 have an open
  // provider in `uses` (a blanket hold would leave one PR to merge). Three providers change their
  // exports, and only four users import from one of them.
  const ids = Array.from({ length: 45 }, (_, i) => `m${i}`);
  const modules = ids.map((id, i) => ({ id, uses: ids.slice(Math.max(0, i - 5), i) }));
  const g = usesGraph(modules);
  const jobs = ids.map((id, i) => job(100 + i, id, { draft: i % 3 === 0 }));
  const cands = jobs.filter((j) => !j.draft);
  const blanket = cands.filter((u) => (g.usesOf.get(u.id) || []).some((p) => jobs.some((j) => j.id === p))).length;
  assert.ok(blanket >= cands.length - 1, `a blanket uses hold would hold ${blanket} of ${cands.length}`);
  const changesExports = new Set(['m3', 'm10', 'm20']);
  const imports = new Set(['m4>m3', 'm7>m3', 'm11>m10', 'm22>m20']);
  const h = providerHolds(cands, jobs, { ...g, ...checks({ exports: (p) => changesExports.has(p.id), imports: (u, p) => imports.has(`${u.id}>${p.id}`) }) });
  assert.deepEqual([...h.keys()].sort(), [104, 107, 111, 122]);
  const free = cands.filter((c) => !h.has(c.n));
  assert.equal(free.length, cands.length - 4, `${free.length} of ${cands.length} green PRs can merge now`);
  // Each held user's provider is open and free to merge, or a draft (BOB's): never a held PR.
  for (const why of h.values()) for (const w of why) assert.ok(!h.has(w.pr));
});

test('gate minutes: full gates only (code runs whose suite ran)', () => {
  assert.deepEqual(fullGateMinutes([
    { trigger: 'code', suite: 'pass', minutes: 4.2 },
    { trigger: 'code', suite: 'base-red', minutes: 41 },
    { trigger: 'code', suite: 'skipped', minutes: 1 },
    { trigger: 'record', suite: 'skipped', minutes: 0.9 },
    { trigger: 'draft', minutes: 1.1 },
  ]), [4.2, 41]);
});

test('release path for open jobs: release_path, the open layer, found work; not debt, not a later layer', async () => {
  const { makeRepo, entry } = await import('./helpers.mjs');
  const { releaseModules } = await import('../lib/status.mjs');
  const { git, loadConfig } = await import('../lib/util.mjs');
  const st = (id, s) => ({ ...entry(id), requirements: `build/requirements/${id}.md`, status: { state: s } });
  const root = makeRepo({
    'process/config.json': { release_path: ['later2'] },
    'build/layers.md': '| layer | modules |\n|---|---|\n| 1 | done1 |\n| 2 | open1, open2, debt1 |\n| 3 | later1, later2, found1 |\n',
    'build/requirements/done1.md': '- **R1** met\n',
    'build/requirements/open1.md': '- **R1** *(not yet met: x)* text\n',
    'build/requirements/open2.md': '- **R1** met\n',
    'build/requirements/debt1.md': '- **F1** *(not yet met: base-red G41)* load test\n',
    'build/requirements/later1.md': '- **R1** *(not yet met: x)* text\n',
    'build/requirements/later2.md': '- **R1** *(not yet met: x)* text\n',
    'build/requirements/found1.md': '- **F2** *(not yet met: walk p3dev-l1)* http-500\n',
    ...Object.fromEntries([['done1', 'COMPLETE'], ['open1', 'WORKING'], ['open2', 'COMPLETE'], ['debt1', 'WORKING'], ['later1', 'OPEN'], ['later2', 'OPEN'], ['found1', 'COMPLETE']].map(([id, s]) => [`process/ledger/${id}.json`, st(id, s)])),
  });
  // Layer 1's work merged in an earlier tranche (main has it): closed with no close row.
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: root });
  const rel = releaseModules(root, loadConfig(root), 'HEAD', new Set(['open1', 'open2', 'debt1', 'later1', 'later2', 'found1']));
  assert.deepEqual([...rel].sort(), ['found1', 'later2', 'open1', 'open2']);
});

// Review round 1 (5 Nov): the fixes, each with the test that failed before it.
test('order: an unknown gate counts as the median over every module known, given by the train, not over this queue', () => {
  const q = [{ n: 1, green_at: at(1), gate_min: 2 }, { n: 2, green_at: at(2), gate_min: 4 }, { n: 3, green_at: at(3), gate_min: null }];
  // Over the queue the median is 3 (PR 3 between 1 and 2); over every module known it is 30.
  assert.deepEqual(ns(orderQueue(q, { now: T0, known: 30 })), [1, 2, 3]);
});

test('order: a pull request whose green time is unread is never aged ahead of the rest', () => {
  const q = [{ n: 1, green_at: at(5), gate_min: 1 }, { n: 2, green_at: null, gate_min: 9 }, { n: 3, green_at: 'not a time', gate_min: 8 }];
  assert.deepEqual(ns(orderQueue(q, { now: T0, agedFrom: agedFromOf(new Map()) })), [1, 3, 2]);
  // Held time still counts against age, and a PR held once is aged from that hold.
  const held = new Map([[1, T0 - 10 * 60000]]);
  assert.equal(agedFromOf(held)({ n: 1, green_at: at(90) }), T0 - 10 * 60000);
});

test('provider hold: every open pull request of a provider module counts, not only the last listed', () => {
  const { usesOf, reaches } = usesGraph([{ id: 'alpha', uses: [] }, { id: 'beta', uses: ['alpha'] }]);
  const jobs = [{ n: 2, id: 'alpha', head: 'h2' }, { n: 3, id: 'alpha', head: 'h3' }, { n: 1, id: 'beta', head: 'h1' }];
  const h = providerHolds([{ n: 1, id: 'beta', head: 'h1' }], jobs, { usesOf, reaches, red: () => false, exportsChanged: (p) => p.n === 2, importsFrom: () => true });
  assert.deepEqual(h.get(1), [{ provider: 'alpha', pr: 2, draft: false }]);
});

// Coordinator, 5 Nov 11:20: on the copy the derived release set was 50 modules, so release first
// ordered almost nothing and control-plane (named in release_path) sat behind them.
test('order: a module named in release_path goes ahead of the derived release set, aged or holding users or not', () => {
  const q = [
    { n: 1, green_at: at(5), gate_min: 1, release: true, holds: 4 },
    { n: 2, green_at: at(90), gate_min: 2, release: true },
    { n: 290, green_at: at(10), gate_min: 30, release: true, named: true },
    { n: 3, green_at: at(80), gate_min: 1 },
  ];
  assert.deepEqual(ns(orderQueue(q, { now: T0 })), [290, 2, 3, 1]);
  // Within the named tier the order is as before: aged first, then holds, then the shorter gate.
  const t = [
    { n: 7, green_at: at(5), gate_min: 9, named: true, release: true },
    { n: 8, green_at: at(60), gate_min: 40, named: true, release: true },
    { n: 9, green_at: at(1), gate_min: 3, named: true, release: true, holds: 1 },
  ];
  assert.deepEqual(ns(orderQueue(t, { now: T0 })), [8, 9, 7]);
});

// Build train-robust, item 6 (coordinator, 5 Nov: 13.8 s of a warm pass on the copy, its largest
// step): the release set cached by the inputs it reads gives the set computed afresh, for every
// open set and after the tranche moves, and computes only when an input changed.
test('release path cache: the cached set is the uncached one for every open set; an unchanged tranche computes nothing, a moved one once', async () => {
  const { makeRepo, entry, commit } = await import('./helpers.mjs');
  const { releaseModules } = await import('../lib/status.mjs');
  const { releaseSet } = await import('../lib/train.mjs');
  const { git, loadConfig } = await import('../lib/util.mjs');
  const st = (id, s, o = {}) => ({ ...entry(id), requirements: `build/requirements/${id}.md`, status: { state: s, ...o } });
  const root = makeRepo({
    'process/config.json': { release_path: ['later2'] },
    'build/layers.md': '| layer | modules |\n|---|---|\n| 1 | done1 |\n| 2 | open2 |\n| 3 | later1, later2, found1, blk1 |\n',
    'build/requirements/done1.md': '- **R1** met\n',
    'build/requirements/open2.md': '- **R1** met\n',
    'build/requirements/blk1.md': '- **R1** met\n',
    'build/requirements/later1.md': '- **R1** *(not yet met: x)* text\n',
    'build/requirements/later2.md': '- **R1** *(not yet met: x)* text\n',
    'build/requirements/found1.md': '- **F2** *(not yet met: walk p3dev-l1)* http-500\n',
    ...Object.fromEntries([['done1', 'COMPLETE'], ['open2', 'COMPLETE'], ['later1', 'OPEN'], ['later2', 'OPEN'], ['found1', 'COMPLETE']].map(([id, s]) => [`process/ledger/${id}.json`, st(id, s)])),
    'process/ledger/blk1.json': st('blk1', 'BLOCKED', { reason: 'needs a ruling' }),
  });
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD~0'], { cwd: root });
  commit(root, { 'notes/x.md': 'after main' });
  const cfg = loadConfig(root);
  const ids = ['open2', 'blk1', 'found1', 'done1'];
  const memo = {};
  let computed = 0;
  const compute = (...a) => { computed++; return releaseModules(...a); };
  const sets = new Set();
  for (let m = 0; m < 2 ** ids.length; m++) {
    const open = new Set(ids.filter((_, i) => m & (1 << i)));
    const fresh = [...releaseModules(root, cfg, 'HEAD', open)].sort();
    assert.deepEqual([...releaseSet(root, cfg, 'HEAD', open, { memo, compute }).set].sort(), fresh, `open ${[...open].join(',')}`);
    sets.add(fresh.join(','));
    // An open job on an OPEN entry (later1) changes no input the set reads: no computation.
    const k = computed;
    const more = releaseSet(root, cfg, 'HEAD', new Set([...open, 'later1']), { memo, compute });
    assert.equal(more.cached, true, `open ${[...open].join(',')} + later1`);
    assert.equal(computed, k);
    assert.deepEqual([...more.set].sort(), [...releaseModules(root, cfg, 'HEAD', new Set([...open, 'later1']))].sort());
  }
  assert.ok(sets.size > 1, 'the open set changes the answer: the comparison is not vacuous');
  const open = new Set(['later1']);
  releaseSet(root, cfg, 'HEAD', open, { memo, compute }); // the last pass read another open set
  const before = computed;
  const hit = releaseSet(root, cfg, 'HEAD', open, { memo, compute });
  assert.equal(hit.cached, true);
  assert.equal(computed, before, 'an unchanged tranche: nothing computed');
  // A restarted train at the same tip: from the clone's cache.
  assert.equal(releaseSet(root, cfg, 'HEAD', open, { memo: {}, compute }).cached, true);
  assert.equal(computed, before);
  // The tranche moves (later1 met): computed once, and the same as uncached.
  commit(root, { 'build/requirements/later1.md': '- **R1** met\n' });
  const moved = releaseSet(root, cfg, 'HEAD', open, { memo, compute });
  assert.equal(moved.cached, false);
  assert.deepEqual([...moved.set].sort(), [...releaseModules(root, cfg, 'HEAD', open)].sort());
  assert.equal(releaseSet(root, cfg, 'HEAD', open, { memo, compute }).cached, true);
  assert.equal(computed, before + 1);
});
