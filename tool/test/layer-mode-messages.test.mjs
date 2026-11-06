// Messages under merge_strategy "layer" (the shared layer branch): no MERGER, no merge train, no
// job start --ready. Each message says what is true there, and the train's flow keeps its own.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { layerLead, layerLines, layerMergeLine, layerOpen, layerStartAct, openLayer, readOpenLayer } from '../lib/layerflow.mjs';
import { readyCount } from '../lib/ready.mjs';
import { recordStart } from '../lib/roles.mjs';
import { laneModuleCheck, setupCheck } from '../lib/setup.mjs';
import { READY_LEAD, fetchState, readState, send, writeState } from '../lib/state.mjs';
import { nextWork } from '../lib/status.mjs';
import { idleCapacity, layerIdle, sweep } from '../lib/sweep.mjs';
import { configOf, git } from '../lib/util.mjs';
import { entry, makeRepo } from './helpers.mjs';

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
function product(strategy = 'layer', { complete = false } = {}) {
  const files = { 'process/config.json': { tranche: 'tranche', merge_strategy: strategy }, 'build/layers.md': LAYERS };
  for (const id of ['a', 'b', 'd']) {
    files[`process/ledger/${id}.json`] = entry(id, { requirements: `build/requirements/${id}.md`, ...(complete ? { status: { state: 'COMPLETE' } } : {}) });
    files[`build/requirements/${id}.md`] = REQ;
  }
  return withOrigin(files);
}
const openIO = { slug: 'o/p', openPRs: () => [] };

const view = (over = {}) => ({ kind: 'open', n: 3, states: [{ id: 'a', state: 'working' }, { id: 'b', state: 'not started' }], prs: [], startable: [{ id: 'b', cmd: `${P3} job start b --live <n>` }], ready: false, ...over });

test('layer flow helpers: the lead names layer jobs, the merge line only when every module is complete or deferred', () => {
  assert.equal(layerLead(view()), `first: start layer 3's jobs (${P3} layer jobs 3): ${P3} job start b --live <n>. Then: `);
  assert.equal(layerLead(view({ startable: [] })), '');
  assert.equal(layerLead({ kind: 'next', n: 4 }), '');
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
  // send's lead reads the refs this clone has, no fetch: the same layer.
  assert.equal(layerLead(readOpenLayer(root, cfg, { fetch: false, io: openIO })), `first: start layer 1's jobs (${P3} layer jobs 1): ${P3} job start a --live <n>; ${P3} job start b --live <n>. Then: `);
  assert.equal(readyCount(root, { layer: (r, c) => readOpenLayer(r, c, { fetch: false, io: openIO }) }), layerLead(v));
  // The merge line is next work's in status: layerLines leaves it out with merge false.
  const ready = { ...v, startable: [], ready: true };
  assert.ok(layerLines(root, cfg, { view: ready }).some((l) => /can merge/.test(l)));
  assert.ok(!layerLines(root, cfg, { view: ready, merge: false }).some((l) => /can merge/.test(l)));
});

test('(a) send bob: in layer mode the lead is the open layer\'s layer jobs lines, or nothing; the train\'s lead is unchanged', () => {
  const root = product();
  recordStart(root, 'bob', B, { log: quiet });
  // The train: a count leads with job start --ready.
  const t = send(root, SB, { from: 'root', to: 'bob', text: 'go', ready: () => 2, log: quiet });
  assert.match(t.body, /^MSG root-\d+ to bob: first: node \.process\/tool\/p3\.mjs job start --ready --live <n> \(2 jobs ready\)\. Then: go/);
  assert.equal(READY_LEAD(1), `first: ${P3} job start --ready --live <n> (1 job ready). Then: `);
  // The layer: readyCount gives the lead itself.
  const lead = readyCount(root, { layer: () => view() });
  assert.equal(lead, layerLead(view()));
  const l = send(root, SB, { from: 'root', to: 'bob', text: 'go', ready: () => lead, log: quiet });
  assert.match(l.body, /to bob: first: start layer 3's jobs \(node \.process\/tool\/p3\.mjs layer jobs 3\): .*job start b --live <n>\. Then: go/);
  assert.doesNotMatch(l.body, /job start --ready/);
  // None listed: nothing leads.
  const none = send(root, SB, { from: 'root', to: 'bob', text: 'go', ready: () => readyCount(root, { layer: () => view({ startable: [] }) }), log: quiet });
  assert.match(none.body, /to bob: go\n/);
  // A text already led is not led twice.
  const again = send(root, SB, { from: 'root', to: 'bob', text: lead + 'go', ready: () => lead, log: quiet });
  assert.equal(again.body.split('first:').length, 2);
});

test('(b) next work: in layer mode no "ready to close" line; the layer\'s merge line only when it holds; the train keeps its line', () => {
  const cfgOf = (s) => configOf({ tranche: 'tranche', merge_strategy: s });
  const ls = { ready: true, pending: false, cur: { n: 1, mods: [] }, layers: [], deferred: [], owed: [] };
  const lines = (s, v) => { const out = []; nextWork(product(s), cfgOf(s), [], null, { state: ls, view: v, log: (l) => out.push(l) }); return out; };
  assert.ok(lines('train').some((l) => /^layer 1 ready to close: .*job start --ready/.test(l)));
  const working = lines('layer', view());
  assert.ok(!working.some((l) => /ready to close|merge when/.test(l)), working.join('\n'));
  const done = view({ states: [{ id: 'a', state: 'complete' }], startable: [], ready: true });
  assert.ok(lines('layer', done).includes(layerMergeLine(done)));
  assert.ok(!lines('layer', null).some((l) => /ready to close/.test(l)));
});

test('(c) idle capacity: in layer mode slots count against the open layer\'s startable jobs, never the train or a layer close', () => {
  const t = Date.parse('2026-11-06T12:00:00Z');
  const prev = { at: '2026-11-06T11:00:00Z', idle_capacity: { kind: 'work', since: '2026-11-06T11:00:00Z' } };
  const ic = layerIdle({ live: 2, cap: 6, holds: [], view: view({ startable: [{ id: 'b', cmd: 'x' }, { id: 'c', cmd: 'y' }] }), prev, t });
  assert.equal(ic.kind, 'work');
  assert.equal(ic.alarm, true);
  assert.equal(ic.startable, 2);
  assert.deepEqual(ic.reasons, [`2 x startable from ${P3} layer jobs 3, not started`, '2 x no startable work: layer 3 lists no job to start']);
  assert.ok(!ic.reasons.some((r) => /ready to close|job start --ready|train/.test(r)));
  // A module hold on a startable job: named; a hold of another layer's module: nothing.
  const holds = [{ live: true, kind: 'module', value: 'b', id: 'h1', by: 'bob', why: 'waits' }, { live: true, kind: 'module', value: 'zz', id: 'h2', by: 'bob', why: 'other' }];
  // Every listed job working or held, nothing to merge: the layer's own wait, no idle.
  assert.equal(layerIdle({ live: 2, cap: 6, holds, view: view(), prev, t }), null);
  const h = layerIdle({ live: 1, cap: 6, holds, view: view({ startable: [{ id: 'b', cmd: 'x' }, { id: 'c', cmd: 'y' }] }), prev, t });
  assert.equal(h.startable, 1);
  assert.deepEqual(h.reasons, [`1 x startable from ${P3} layer jobs 3, not started`, 'b: held by h1 (by bob): waits', '3 x no startable work: layer 3 lists no job to start']);
  // The layer can merge, or the next is not open: said as the empty slots' reason.
  assert.match(layerIdle({ live: 0, cap: 4, view: view({ startable: [], ready: true }), t }).reasons[0], /^4 x no startable work: layer 3 can merge \(.*layer merge 3\)$/);
  assert.match(layerIdle({ live: 0, cap: 4, view: { kind: 'next', n: 4 }, t }).reasons[0], /layer 4 is next and not open/);
  // Full: none.
  assert.equal(layerIdle({ live: 6, cap: 6, view: view(), t }), null);
  // The train's own idle keeps its close line.
  const tr = idleCapacity({ live: 0, cap: 4, holds: [], work: [], closable: 2, t });
  assert.match(tr.reasons[0], /^layer 2 ready to close: job start --ready closes it/);
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

test('(c) sweep: in layer mode no MERGER is replaced or started; the train still replaces a lapsed one', () => {
  for (const s of ['layer', 'train']) {
    const root = withOrigin({ 'process/config.json': { tranche: 'tranche', merge_train: true, merge_strategy: s } });
    recordStart(root, 'root', R, { log: quiet });
    recordStart(root, 'bob', B, { log: quiet });
    const first = run(root);
    assert.equal(first.todo.some((x) => /start the MERGER/.test(x)), s === 'train', `${s}: ${first.todo.join('\n')}`);
    lapsedMerger(root);
    const r = run(root);
    assert.equal(r.todo.some((x) => /replace the MERGER/.test(x)), s === 'train', `${s}: ${r.todo.join('\n')}`);
    assert.equal(r.found.some((x) => /MERGER/.test(x)), s === 'train');
  }
});

test('(c) sweep: in layer mode a layer the train calls ready to close is not said, and BOB is not told to run job start --ready', () => {
  const layers = '| layer | what | modules |\n|---|---|---|\n| 1 | first | a |\n| 2 | next | d |\n';
  const files = (s) => ({
    'process/config.json': { tranche: 'tranche', merge_strategy: s },
    'build/layers.md': layers,
    'build/requirements/a.md': '- **R1** *(not yet met: x)* y\n',
    'build/requirements/d.md': '- **R1** *(not yet met: x)* y\n',
    'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md', status: { state: 'COMPLETE' } }),
  });
  const root = withOrigin(files('layer'));
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  const s = run(root);
  assert.doesNotMatch(s.found.join('; '), /ready to close/);
  assert.ok(!s.todo.some((x) => /job start --ready/.test(x)), s.todo.join('\n'));
  const tr = withOrigin(files('train'));
  recordStart(tr, 'root', R, { log: quiet });
  recordStart(tr, 'bob', B, { log: quiet });
  assert.match(run(tr).found.join('; '), /layer 1 ready to close/);
});

test('(d) setup check: the state branch\'s coordinator address is shown, the config\'s value flagged stale when it differs', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const conditions = [{ id: 'coordinator', what: 'the coordinator' }];
  const detail = (cfg, address) => setupCheck(root, { slug: 'o/r', conditions, io: { file: (f) => (f === 'process/config.json' ? JSON.stringify(cfg) : null), address: address === undefined ? null : () => address, pin: null, entries: [], api: () => null }, log: quiet }).results[0];
  assert.deepEqual(detail({ coordinator: 'session_old' }), { id: 'coordinator', what: 'the coordinator', state: 'set', detail: 'session_old' });
  assert.equal(detail({ coordinator: 'session_old' }, 'session_new').detail, "session_new (the state branch's address); process/config.json's coordinator session_old is stale");
  assert.equal(detail({ coordinator: 'session_new' }, 'session_new').detail, "session_new (the state branch's address, as process/config.json names)");
  assert.equal(detail({}, 'session_new').state, 'set');
  assert.equal(detail({}).state, 'missing');
});

test('(e) setup check: a lane whose folder lies under a module\'s paths and names no module is warned; one naming it is not', () => {
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
test('(c) sweep online, layer mode: BOB is woken to open the next layer, then to start the open layer\'s jobs; idle counted against them', () => {
  // Every entry COMPLETE with unmet marks (no job open): next work wakes BOB at once, as in the train.
  const root = product('layer', { complete: true });
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
  assert.equal(last.idle_capacity.startable, 2);
  assert.equal(last.idle_capacity.layer, 1);
});
