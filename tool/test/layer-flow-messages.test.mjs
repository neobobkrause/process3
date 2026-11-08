// Messages in the shared layer branch's flow, the only flow since the merge train was removed (Bob,
// 6 Nov): no MERGER, no train, no job start --ready; each message says what is true here.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { layerLines, layerMergeLine, layerOpen, layerStartAct, openLayer, writeRows } from '../lib/layerflow.mjs';
import { flowFile } from '../lib/layerbase.mjs';
import { recordStart } from '../lib/roles.mjs';
import { laneModuleCheck, setupCheck, strategyCheck } from '../lib/setup.mjs';
import { fetchState, readState, writeState } from '../lib/state.mjs';
import { nextWork, status } from '../lib/status.mjs';
import { OWED_FILE, owe, owes, paidUpTo, paysOwed, readOwed } from '../lib/hold.mjs';
import { layerIdle, sweep } from '../lib/sweep.mjs';
import { configOf, git } from '../lib/util.mjs';
import { checkRow } from '../lib/gate.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const SB = 'process-state';
const R = 'session_root1';
const B = 'session_bob1';
const OLD = '2026-01-01T00:00:00Z';
const P3 = 'node .process/tool/p3.mjs';

function withOrigin(files) {
  const root = makeRepo({ 'README.md': 'x', ...files });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['branch', '-q', '--set-upstream-to', 'origin/tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  return root;
}

// A product in the layer flow: modules a, b in layer 1 (unmet marks), d in layer 2.
const LAYERS = '| layer | name | modules |\n| --- | --- | --- |\n| 1 | One | a, b |\n| 2 | Two | d |\n';
const REQ = '# x\n\n**R1** a requirement *(not yet met: T1)*\n';
function product({ complete = false } = {}) {
  const files = { 'process/config.json': { tranche: 'tranche', merge_strategy: 'layer' }, 'build/layers.md': LAYERS };
  for (const id of ['a', 'b', 'd']) {
    files[`process/ledger/${id}.json`] = entry(id, { requirements: `build/requirements/${id}.md`, ...(complete ? { status: { state: 'COMPLETE' } } : {}) });
    files[`build/requirements/${id}.md`] = REQ;
  }
  return withOrigin(files);
}
const openIO = { slug: 'o/p', openPRs: () => [] };

const view = (over = {}) => ({ kind: 'open', n: 3, states: [{ id: 'a', state: 'working' }, { id: 'b', state: 'not started' }], prs: [], startable: [{ id: 'b', cmd: `${P3} job start b --sessions <file>` }], ready: false, ...over });

test('layer flow helpers: the merge line only when every module is complete or deferred; the act owed', () => {
  assert.equal(layerMergeLine(view()), null);
  const done = view({ states: [{ id: 'a', state: 'complete' }, { id: 'b', state: 'deferred' }], startable: [], ready: true });
  assert.equal(layerMergeLine(done), `layer 3: complete 1, deferred 1, published 0, working 0, rescheduled 0, not started 0; merge when every module is complete or deferred (${P3} layer merge 3)`);
  // The act owed: start, merge, open the next; unread, status.
  assert.equal(layerStartAct(view()), `${P3} layer jobs 3, then each job start it lists`);
  assert.equal(layerStartAct(done), `${P3} layer merge 3`);
  assert.equal(layerStartAct({ kind: 'next', n: 4 }), `${P3} layer open 4`);
  assert.match(layerStartAct(null), /status --role bob/);
});

test('openLayer: the next layer before its open; once open, its startable jobs and no merge', () => {
  const root = product();
  const cfg = configOf({ tranche: 'tranche', merge_strategy: 'layer' });
  fetchState(root, SB, { fresh: true });
  assert.deepEqual(openLayer(root, cfg, { slug: 'o/p', io: openIO }), { kind: 'next', n: 1 });
  layerOpen(root, 1, { io: openIO, log: quiet });
  const v = openLayer(root, cfg, { slug: 'o/p', io: openIO });
  assert.equal(v.kind, 'open');
  assert.deepEqual(v.startable.map((x) => x.id), ['a', 'b']);
  assert.equal(v.ready, false);
  assert.equal(layerMergeLine(v), null);
  // The merge line is next work's in status: layerLines leaves it out with merge false.
  const ready = { ...v, startable: [], ready: true };
  assert.ok(layerLines(root, cfg, { view: ready }).some((l) => /can merge/.test(l)));
  assert.ok(!layerLines(root, cfg, { view: ready, merge: false }).some((l) => /can merge/.test(l)));
});

test('next work: no train-era "ready to close" line; the layer\'s merge line only when it holds', () => {
  const cfg = configOf({ tranche: 'tranche' });
  const ls = { ready: true, pending: true, cur: { n: 1, mods: [] }, layers: [], deferred: [], owed: [{ pr: 9, blocked: 'x' }] };
  const lines = (v) => { const out = []; nextWork(product(), cfg, [], null, { state: ls, view: v, log: (l) => out.push(l) }); return out; };
  const working = lines(view());
  assert.ok(!working.some((l) => /ready to close|merge when|layer close|job start --ready/.test(l)), working.join('\n'));
  const done = view({ states: [{ id: 'a', state: 'complete' }], startable: [], ready: true });
  assert.ok(lines(done).includes(layerMergeLine(done)));
  assert.ok(!lines(null).some((l) => /ready to close/.test(l)));
});

test('idle capacity: slots count against the open layer\'s startable jobs, never the train or a layer close', () => {
  const t = Date.parse('2026-11-06T12:00:00Z');
  const prev = { at: '2026-11-06T11:00:00Z', idle_capacity: { kind: 'work', since: '2026-11-06T11:00:00Z' } };
  const ic = layerIdle({ live: 2, cap: 6, holds: [], view: view({ startable: [{ id: 'b', cmd: 'x' }, { id: 'c', cmd: 'y' }] }), prev, t });
  assert.equal(ic.kind, 'work');
  assert.equal(ic.alarm, true);
  assert.equal(ic.startable, 2);
  assert.deepEqual(ic.reasons, [`2 x startable from ${P3} layer jobs 3, not started (start now: b, c; one listed after a provider in flight starts now with its plain job start, no --early: R10; only a recorded hold waits)`, '2 x no startable work: layer 3 lists no job to start']);
  assert.deepEqual(ic.fill, ['b', 'c']);
  assert.ok(!ic.reasons.some((r) => /ready to close|job start --ready|train/.test(r)));
  // A module hold on a startable job: named; a hold of another layer's module: nothing.
  const holds = [{ live: true, kind: 'module', value: 'b', id: 'h1', by: 'bob', why: 'waits' }, { live: true, kind: 'module', value: 'zz', id: 'h2', by: 'bob', why: 'other' }];
  // Every listed job working or held, nothing to merge: the layer's own wait, no idle.
  assert.equal(layerIdle({ live: 2, cap: 6, holds, view: view(), prev, t }), null);
  const h = layerIdle({ live: 1, cap: 6, holds, view: view({ startable: [{ id: 'b', cmd: 'x' }, { id: 'c', cmd: 'y' }] }), prev, t });
  assert.equal(h.startable, 1);
  assert.deepEqual(h.reasons, [`1 x startable from ${P3} layer jobs 3, not started (start now: c; one listed after a provider in flight starts now with its plain job start, no --early: R10; only a recorded hold waits)`, 'b: held by h1 (by bob): waits', '3 x no startable work: layer 3 lists no job to start']);
  // The layer can merge, or the next is not open: said as the empty slots' reason.
  assert.match(layerIdle({ live: 0, cap: 4, view: view({ startable: [], ready: true }), t }).reasons[0], /^4 x no startable work: layer 3 can merge \(.*layer merge 3\)$/);
  assert.match(layerIdle({ live: 0, cap: 4, view: { kind: 'next', n: 4 }, t }).reasons[0], /layer 4 is next and not open/);
  // Full: none.
  assert.equal(layerIdle({ live: 6, cap: 6, view: view(), t }), null);
});

// C25 (the coordinator, 7 Nov): on the copy's layer 11 IDLE CAPACITY ran 141 min while BOB held jobs
// listed "(after <provider>)" as waits. The alarm names the jobs that fill the empty slots, says an
// early start is BOB's now, and counts no additive retest (CI's, no job session) as a slot's work.
test('idle capacity (C25): the jobs that fill the empty slots are named, early ones included; a retest fills no slot', () => {
  const t = Date.parse('2026-11-07T18:37:00Z');
  const v = view({ startable: [{ id: 'a', cmd: `${P3} job start a --sessions <file>` }, { id: 'r', cmd: `${P3} layer retest r`, job: 'x', additive: true }, { id: 'b', cmd: `${P3} job start b --sessions <file>`, after: ['q'] }, { id: 'c', cmd: `${P3} job start c --sessions <file>`, after: ['q'] }] });
  const ic = layerIdle({ live: 4, cap: 6, view: v, t });
  assert.equal(ic.startable, 3, 'the retest is not counted');
  assert.deepEqual(ic.fill, ['a', 'b'], 'two empty slots: the first two in the list, the early b among them');
  assert.match(ic.reasons[0], /^2 x startable from .* layer jobs 3, not started \(start now: a, b; one listed after a provider in flight starts now with its plain job start, no --early: R10; only a recorded hold waits\)$/);
  // Only retests listed: no idle capacity (they need no session).
  assert.equal(layerIdle({ live: 4, cap: 6, view: view({ startable: [{ id: 'r', cmd: `${P3} layer retest r`, job: 'x', additive: true }] }), t }), null);
});

const run = (root, o = {}) => sweep(root, { session: R, offline: true, log: quiet, ...o });
function lapsedMerger(root) {
  writeState(root, SB, 'merger', (d) => {
    mkdirSync(join(d, 'addresses'), { recursive: true });
    writeFileSync(join(d, 'addresses/merger.json'), JSON.stringify({ session: 'session_merger1', at: OLD }));
    mkdirSync(join(d, 'merger'), { recursive: true });
    writeFileSync(join(d, 'merger/lease.json'), JSON.stringify({ session: 'session_merger1', token: 't', expires: OLD }));
  });
}

test('sweep: no MERGER is started or replaced, a stale merge_train key and an old MERGER address and lease on the state branch included', () => {
  const root = withOrigin({ 'process/config.json': { tranche: 'tranche', merge_train: true } });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  assert.ok(!run(root).todo.some((x) => /MERGER/.test(x)));
  lapsedMerger(root);
  const r = run(root);
  assert.ok(!r.todo.some((x) => /MERGER/.test(x)), r.todo.join('\n'));
  assert.ok(!r.found.some((x) => /MERGER/.test(x)), r.found.join('\n'));
});

test('sweep: a layer the train called ready to close is not said, and BOB is not told to run job start --ready', () => {
  const layers = '| layer | what | modules |\n|---|---|---|\n| 1 | first | a |\n| 2 | next | d |\n';
  const files = () => ({
    'process/config.json': { tranche: 'tranche' },
    'build/layers.md': layers,
    'build/requirements/a.md': '- **R1** *(not yet met: x)* y\n',
    'build/requirements/d.md': '- **R1** *(not yet met: x)* y\n',
    'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md', status: { state: 'COMPLETE' } }),
  });
  const root = withOrigin(files());
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  const s = run(root);
  assert.doesNotMatch(s.found.join('; '), /ready to close/);
  assert.ok(!s.todo.some((x) => /job start --ready/.test(x)), s.todo.join('\n'));
});

test('setup check: the state branch\'s coordinator address is shown, the config\'s value flagged stale when it differs', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const conditions = [{ id: 'coordinator', what: 'the coordinator' }];
  const detail = (cfg, address) => setupCheck(root, { slug: 'o/r', conditions, io: { file: (f) => (f === 'process/config.json' ? JSON.stringify(cfg) : null), address: address === undefined ? null : () => address, pin: null, entries: [], api: () => null }, log: quiet }).results[0];
  assert.deepEqual(detail({ coordinator: 'session_old' }), { id: 'coordinator', what: 'the coordinator', state: 'set', detail: 'session_old' });
  assert.equal(detail({ coordinator: 'session_old' }, 'session_new').detail, "session_new (the state branch's address); process/config.json's coordinator session_old is stale");
  assert.equal(detail({ coordinator: 'session_new' }, 'session_new').detail, "session_new (the state branch's address, as process/config.json names)");
  assert.equal(detail({}, 'session_new').state, 'set');
  assert.equal(detail({}).state, 'missing');
});

test('setup check: a lane whose folder lies under a module\'s paths and names no module is warned; one naming it is not', () => {
  const entries = [{ id: 'ux-design', paths: ['docs/development/'] }, { id: 'other', paths: ['src/other'] }];
  const lane = (extra = {}) => ({ lanes: [{ name: 'ux', dir: 'docs/development/ux-substrate', ...extra }] });
  const out = [];
  const w = laneModuleCheck(lane(), entries, { log: (l) => out.push(l) });
  assert.equal(w.length, 1);
  assert.match(w[0], /^lane ux: its folder docs\/development\/ux-substrate lies under module ux-design's path docs\/development\/, and its row in process\/config\.json names no module: .*add "module": "ux-design"/);
  assert.match(out[0], /^warning: lane ux/);
  assert.deepEqual(laneModuleCheck(lane({ module: 'ux-design' }), entries, { log: quiet }), []);
  assert.match(laneModuleCheck(lane({ module: 'other' }), entries, { log: quiet })[0], /names module other/);
  assert.deepEqual(laneModuleCheck({ lanes: [{ name: 'x', dir: 'design/x' }] }, entries, { log: quiet }), []);
  assert.deepEqual(laneModuleCheck({}, entries, { log: quiet }), []);
  // Under a module's tests: no module setting helps; said so.
  assert.match(laneModuleCheck({ lanes: [{ name: 't', dir: 'test/x/lane', module: 'tx' }] }, [{ id: 'tx', paths: ['src/x'], tests: ['test/x'] }], { log: quiet })[0], /lies under module tx's tests test\/x: .*move the lane's folder/);
});

const IO = { slug: 'o/p', openPRs: () => [], checkRun: () => null, checkRuns: () => [], compare: () => null, prFiles: () => [], comments: () => [], pins: () => [] };
test('sweep online: BOB is woken to open the next layer, then to start the open layer\'s jobs; idle counted against them', () => {
  // Every entry COMPLETE with unmet marks (no job open): next work wakes BOB at once, as in the train.
  const root = product({ complete: true });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  const before = run(root, { offline: false, io: IO, live: 0 });
  const wake = before.todo.find((x) => /^wake BOB/.test(x)) || '';
  assert.match(wake, /with next work: run node \.process\/tool\/p3\.mjs layer open 1/, before.todo.join('\n'));
  assert.doesNotMatch(wake, /job start --ready/);
  layerOpen(root, 1, { io: openIO, log: quiet });
  const after = run(root, { offline: false, io: IO, live: 0 });
  const w2 = after.todo.find((x) => /^wake BOB/.test(x)) || '';
  assert.match(w2, /layer jobs 1, then each job start it lists/, after.todo.join('\n'));
  assert.ok(!after.todo.some((x) => /MERGER|job start --ready/.test(x)), after.todo.join('\n'));
  const rows = readState(root, SB, 'metrics/sweep.jsonl').trim().split('\n').map((l) => JSON.parse(l));
  const last = rows.at(-1);
  assert.equal(last.startable, 2);
  // b and a, then d early into layer 2 (no providers: R14).
  assert.equal(last.idle_capacity.startable, 3);
  assert.equal(last.idle_capacity.layer, 1);
});

test('no layer map: openLayer says so, status names it, and the sweep still wakes BOB for next work', () => {
  const root = withOrigin({ 'process/config.json': { tranche: 'tranche' }, 'build/requirements/a.md': REQ, 'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md', status: { state: 'COMPLETE' } }) });
  const cfg = configOf({ tranche: 'tranche' });
  fetchState(root, SB, { fresh: true });
  const v = openLayer(root, cfg, { slug: 'o/p', io: openIO });
  assert.deepEqual(v, { kind: 'none' });
  assert.match(layerLines(root, cfg, { view: v })[0], /no layer map .*jobs start on the tranche from next work/);
  assert.equal(layerStartAct(v), `${P3} status --role bob (the layer flow's next act)`);
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  const s = run(root, { offline: false, io: IO });
  assert.ok(s.todo.some((x) => /wake BOB .*idle .*with next work: run node \.process\/tool\/p3\.mjs status --role bob/.test(x)), s.todo.join('\n'));
});

test('the gate row of a layer pull request (trigger layer) passes the post check', () => {
  const row = { sha: 'a'.repeat(40), run_id: 1, trigger: 'layer', findings: 0, ok: true, minutes: 1 };
  assert.doesNotThrow(() => checkRow(row));
  assert.throws(() => checkRow({ ...row, trigger: 'spec-tested' }), /trigger/);
});

test('setup check names merge_strategy "train" as a blocker before a pin move, even from a checkout whose own config says it', () => {
  assert.equal(strategyCheck({}), null);
  assert.equal(strategyCheck({ merge_strategy: 'layer' }), null);
  assert.match(strategyCheck({ merge_strategy: 'train' }), /^BLOCKER before a pin move: .*"merge_strategy": "train".*plain pull request setting "merge_strategy": "layer"/);
  const root = makeRepo({ 'process/config.json': { tranche: 'tranche', merge_strategy: 'train' } });
  const out = [];
  const r = setupCheck(root, { slug: 'o/r', conditions: [], io: { file: (f) => (f === 'process/config.json' ? JSON.stringify({ merge_strategy: 'train' }) : null), address: null, pin: null, entries: [], api: () => null, openPRs: () => [], prFiles: () => [] }, log: (l) => out.push(l) });
  assert.match(r.strategy, /BLOCKER before a pin move/);
  assert.ok(out.some((l) => /^BLOCKER before a pin move/.test(l)), out.join('\n'));
});

test('starts owed (kept for the layer flow, R10): an owing act writes it, status prints it first with the layer flow\'s act, never job start --ready', () => {
  const root = product();
  writeState(root, SB, 'owe', (d) => { owe(d, 'job complete a'); return {}; });
  fetchState(root, SB, { fresh: true });
  const out = [];
  status(root, { role: 'bob', offline: true, log: (l) => out.push(l) });
  assert.match(out[0], /^starts owed since \S+ \(job complete a\): run status --role bob, then each `job start` its `jobs to start` lists \(layer jobs <n>\)$/);
  assert.doesNotMatch(out.join('\n'), /job start --ready|starter/);
  assert.equal(owes('job complete', { _: ['a'] }), 'job complete a');
  assert.equal(owes('layer close', { _: ['1'] }), null);
});

test('starts owed are paid: a job start or layer open pays what was owed before it began; the sweep pays all when nothing is left to start (cold review of PR 191)', () => {
  assert.equal(paysOwed('job start'), true);
  assert.equal(paysOwed('layer open'), true);
  assert.equal(paysOwed('merge'), false);
  const dir = mkdtempSync(join(tmpdir(), 'p3-owed-'));
  owe(dir, 'hold ended h1');
  const begun = new Date(Date.now() + 1000).toISOString();
  assert.equal(paidUpTo(dir, begun), true);
  assert.equal(paidUpTo(dir, begun), false, 'nothing left');
  // The sweep: the open layer lists starts, so the owed stands; every layer merged, it is paid.
  const root = product({ complete: true });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  layerOpen(root, 1, { io: openIO, log: quiet });
  writeState(root, SB, 'owe', (d) => { owe(d, 'triage recorded x:1'); return {}; });
  run(root, { offline: false, io: IO, live: 0 });
  fetchState(root, SB, { fresh: true });
  assert.ok(readOwed(root, SB), 'starts listed: still owed');
  // The layers' merge on the tranche, not on main (an earlier tranche's rows are stale, not done).
  commit(root, { 'src/x.txt': 'layers merged' }, 'layers merged');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const tip = git(['rev-parse', 'origin/tranche'], { cwd: root });
  const at = new Date().toISOString();
  writeRows(root, SB, 'merged', [[flowFile(1, 'merged'), { row: 'merged', layer: 1, commit: tip, at }], [flowFile(2, 'open'), { row: 'open', layer: 2, at }], [flowFile(2, 'merged'), { row: 'merged', layer: 2, commit: tip, at }]]);
  run(root, { offline: false, io: IO, live: 0 });
  fetchState(root, SB, { fresh: true });
  assert.equal(readState(root, SB, OWED_FILE), null, 'every layer merged: paid');
});

// C25: between sweeps the check judged on the sweep's live count alone (the copy, 16:18-16:50: 16
// slots "empty" on the 15:53 sweep's live 4 while BOB started about 20 jobs). Every start recorded
// since the measurement counts: the open layer's start rows and the early starts into the next.
test('idle check (C25): starts recorded since the sweep measured count as live', async () => {
  const { startsSince } = await import('../lib/sweep.mjs');
  const root = makeRepo({ 'README.md': 'x\n' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  const start = (n, id, at) => [flowFile(n, 'start', `${id}-${Date.parse(at)}`), { row: 'start', layer: n, module: id, at }];
  writeRows(root, SB, 'starts', [
    start(11, 'old', '2026-11-07T15:40:00Z'),
    start(11, 'a', '2026-11-07T16:14:00Z'), start(11, 'b', '2026-11-07T16:20:00Z'),
    start(12, 'e', '2026-11-07T16:30:00Z'), start(12, 'f', '2026-11-07T15:00:00Z'),
    // A refused early start leaves an early row (written at the cut) and no start row: nothing.
    [flowFile(12, 'early', 'g-1'), { row: 'early', layer: 12, module: 'g', at: '2026-11-07T16:31:00Z' }],
    // A restart on a fresh branch replaces a session: not a new one.
    [flowFile(11, 'start', 'c-r'), { row: 'start', layer: 11, module: 'c', restart: true, at: '2026-11-07T16:40:00Z' }],
    // A start in the measurement's own second counts.
    start(11, 'same', '2026-11-07T15:53:46Z'),
  ]);
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  const v = { kind: 'open', n: 11, early_next: 12 };
  assert.equal(startsSince(root, SB, v, '2026-11-07T15:53:46Z'), 4, 'same, a, b and the early e; not the starts before, the refused early g or the restart c');
  assert.equal(startsSince(root, SB, { kind: 'open', n: 11 }, '2026-11-07T15:53:46Z'), 3);
  assert.equal(startsSince(root, SB, v, 'unread'), 0);
  // The idle judged on the sum: the sweep's 4 and 3 since leave 13 empty of 20, not 16.
  const ic = layerIdle({ live: 4 + 3, cap: 20, view: view({ startable: Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, cmd: `${P3} job start m${i} --sessions <file>` })) }), t: Date.parse('2026-11-07T16:18:37Z') });
  assert.equal(ic.empty, 13);
});

test('flow line (C25): startable counts the jobs that take a slot, as the idle check does; retests apart', async () => {
  const { flow } = await import('../lib/status.mjs');
  const v = view({ startable: [{ id: 'a', cmd: `${P3} job start a --sessions <file>` }, { id: 'r', cmd: `${P3} layer retest r`, job: 'x', additive: true }] });
  const f = flow(configOf({}), [], [], 19, null, [], { view: v });
  assert.equal(f.startable, 1);
  assert.match(f.line, /startable 1 \(and 1 retest, no job session\)/);
  assert.ok(!/GitHub pacing/.test(f.line));
  assert.ok(!f.queued, 'one slot free, one job: none queued');
});

// Cold review of C25: the check itself, end to end on a state branch: the sweep's measured live,
// the starts since, the alarm while slots stay empty, none once starts fill them, and an old
// measurement judged as unmeasured.
test('idle check (C25): live is the sweep\'s count and the starts since; the alarm ends when starts fill the slots', async () => {
  const { idleCheck, SWEEP_ROWS_FILE } = await import('../lib/sweep.mjs');
  const root = makeRepo({ 'README.md': 'x\n' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  // After the tranche's last commit (the idle can begin no earlier: idleSince's freed), whole seconds.
  const T0 = Math.ceil((Date.now() + 120e3) / 1000) * 1000;
  const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
  writeState(root, SB, 'sweep', (d) => { mkdirSync(join(d, 'metrics'), { recursive: true }); writeFileSync(join(d, SWEEP_ROWS_FILE), JSON.stringify({ at: iso(T0), row: 'sweep', live: 4, live_measured_at: iso(T0 - 60e3), job_cap: 20 }) + '\n'); });
  const starts = (ids, at) => writeRows(root, SB, 'starts', ids.map((id) => [flowFile(11, 'start', `${id}-${at}`), { row: 'start', layer: 11, module: id, at: iso(at) }]));
  starts(['a', 'b', 'c'], T0 + 5 * 6e4);
  const jobs = Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, cmd: `${P3} job start m${i} --sessions <file>` }));
  const opts = (t, lines = []) => ({ by: 'test', t, read: () => ({ open: { state: 'open' }, holds: [] }), readView: () => view({ n: 11, startable: jobs }), log: (l) => lines.push(String(l)) });
  const cfg = configOf({});
  const lines = [];
  const r1 = idleCheck(root, cfg, opts(T0 + 25 * 6e4, lines));
  assert.deepEqual([r1.live, r1.live_measured, r1.started_since, r1.startable, r1.idle_capacity.empty, r1.idle_capacity.alarm], [7, 4, 3, 30, 13, true]);
  assert.match(lines.join('\n'), new RegExp(`IDLE CAPACITY: 7 job sessions live \\(4 measured at ${iso(T0)}, 3 started since\\) of the cap 20`));
  // Starts fill every slot: no idle, no alarm.
  starts(Array.from({ length: 13 }, (_, i) => `f${i}`), T0 + 27 * 6e4);
  const r2 = idleCheck(root, cfg, opts(T0 + 31 * 6e4));
  assert.deepEqual([r2.live, r2.started_since, r2.idle_capacity], [20, 16, undefined]);
  // A measurement past LIVE_MIN: unmeasured, no judgment.
  const r3 = idleCheck(root, cfg, opts(T0 + 70 * 6e4));
  assert.equal(r3.live, 'unmeasured');
});

// C27: a product with no BOB addressed (process3-probes) prints no starts owed before a BOB act
// (the merge tool's own line); with a BOB addressed, as before.
test('starts owed (C27): not printed where no BOB is addressed', async () => {
  const { beforeAct } = await import('../lib/sweep.mjs');
  const { addressFile } = await import('../lib/state.mjs');
  const root = makeRepo({ 'README.md': 'x\n' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  writeState(root, SB, 'owed', (d) => { owe(d, 'job complete a', '2026-11-05T23:56:53Z'); });
  const run = () => { const out = []; beforeAct(root, configOf({}), 'merge', { _: [] }, { env: { GITHUB_ACTIONS: '1' }, log: (l) => out.push(String(l)) }); return out; };
  assert.deepEqual(run(), [], 'no BOB addressed: no line');
  writeState(root, SB, 'bob', (d) => { mkdirSync(join(d, 'addresses'), { recursive: true }); writeFileSync(join(d, addressFile('bob')), '{"session":"s"}\n'); });
  assert.match(run()[0] || '', /^starts owed since 2026-11-05T23:56:53Z \(job complete a\)/);
  // Another role's merge (a pin session's --as pin): not BOB's act, no line.
  const out = [];
  beforeAct(root, configOf({}), 'merge', { _: [], as: 'pin' }, { env: { GITHUB_ACTIONS: '1' }, log: (l) => out.push(String(l)) });
  assert.deepEqual(out, []);
});
