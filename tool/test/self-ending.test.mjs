// Self-ending records (R13; Bob, 6 Nov: "fix it in the tool, not just for this case, but fix
// process3 to anticipate and address these kinds of situations"). The case: holds hold-19 to
// hold-22, "until layer 6 closes … ends when the coordinator says", held on after layer 6 closed,
// and ending them by hand was refused as weakening security. Recorded state carries a checkable
// end condition; the tool ends it when the condition holds; stale state is found and cleared by
// the process, not by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { commit, entry, makeRepo } from './helpers.mjs';
import { checkCondition, condText, firstMet, fromText, parseCondition, parseConditions, readFacts } from '../lib/ends.mjs';
import { BY_TOOL, HOLDS_FILE, expireHolds, hold, holdLines, readHolds } from '../lib/hold.mjs';
import { expireRecords, staleLines, staleRecords } from '../lib/expire.mjs';
import { LANE_SESSIONS_FILE, LANES_FILE, readSeats } from '../lib/lane.mjs';
import { fetchState, jsonl, readState, writeState } from '../lib/state.mjs';
import { status } from '../lib/status.mjs';
import { sweep } from '../lib/sweep.mjs';
import { recordStart } from '../lib/roles.mjs';
import { git, loadConfig } from '../lib/util.mjs';

const quiet = () => {};
const SB = 'process-state';
const later = (h) => new Date(Date.now() + h * 36e5).toISOString().replace(/\.\d+Z$/, 'Z');

// The live rows of 6 Nov (copy's process-state, holds/holds.jsonl), times moved to tomorrow.
const W18 = 'coordinator 6 Nov 00:10: until layer 6 closes start only layer 6 work; after it product work pauses for the layer-branch pin; ends when the coordinator says';
const W19 = 'coordinator 6 Nov 00:10: until layer 6 closes start only layer 6 work (public-read F1 job waits for the new pin); ends when the coordinator says';
const W20 = 'coordinator 6 Nov 00:10: until layer 6 closes start only layer 6 work; ends when the coordinator says';
const W23 = "coordinator ruling (bob-25x, 6 Nov): ai-catalogue F4 goes after the pause in layer 11's round with op-declarations, store-assembly and signin-door";
const BY = 'session_018Bhceddtp3HAmB1Z9LtX2s';
const holdRows = () => [
  { at: '2026-11-06T00:15:30Z', id: 'hold-18', row: 'hold', scope: 'layer:7', why: W18, by: BY, until: later(20) },
  { at: '2026-11-06T00:15:45Z', id: 'hold-19', row: 'hold', scope: 'layer:8', why: W19, by: BY, until: later(20) },
  { at: '2026-11-06T00:15:50Z', id: 'hold-20', row: 'hold', scope: 'layer:9', why: W20, by: BY, until: later(20) },
  { at: '2026-11-06T00:15:56Z', id: 'hold-21', row: 'hold', scope: 'layer:10', why: W20, by: BY, until: later(20) },
  { at: '2026-11-06T00:16:04Z', id: 'hold-22', row: 'hold', scope: 'layer:11', why: W20, by: BY, until: later(20) },
  { at: '2026-11-06T03:08:07Z', id: 'hold-23', row: 'hold', scope: 'module:ai-catalogue', why: W23, by: BY, until: later(21) },
];

// A product with a tranche, an origin and a state branch holding files.
function product(state = {}, { ledger = {}, config = {} } = {}) {
  const root = makeRepo({ 'README.md': 'x', 'process/config.json': { tranche: 'tranche', ...config }, 'build/layers.md': '| 6 | a |\n| 7 | b |\n| 8 | c |\n', ...ledger });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-ends-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  if (Object.keys(state).length) writeState(root, SB, 'seed', (dir) => { for (const [p, t] of Object.entries(state)) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), t); } return {}; });
  return root;
}
const jl = (rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
const closed = (...ns) => jl(ns.map((n) => ({ row: 'closed', layer: n, tranche: 'tranche', commit: 'c'.repeat(40), at: '2026-11-06T05:53:29Z' })));

test('conditions: the forms --when takes, refused otherwise; a list ends on any one met', () => {
  assert.deepEqual(parseCondition('layer_closed:6'), { layer_closed: 6 });
  assert.deepEqual(parseConditions('pr_merged:12, module_complete:store-jobs,session_gone:session_abc1,at:2026-11-07T00:00:00Z'), [{ pr_merged: 12 }, { module_complete: 'store-jobs' }, { session_gone: 'session_abc1' }, { at: '2026-11-07T00:00:00Z' }]);
  for (const bad of ['layer_closed:six', 'until layer 6 closes', 'pr_merged:0', 'session_gone:bob', 'at:tomorrow', 'opened:3']) assert.throws(() => parseCondition(bad), /is not a condition/, bad);
  assert.equal(condText({ layer_open: 8 }), 'layer_open:8');
  const f = { t: Date.parse('2026-11-06T12:00:00Z'), layerClosed: (n) => n <= 6, layerOpen: (n) => n <= 8, prMerged: (n) => (n === 5 ? true : n === 6 ? false : null), moduleComplete: (id) => id === 'a', sessionGone: () => null };
  assert.equal(checkCondition({ layer_closed: 6 }, f).met, true);
  assert.equal(checkCondition({ layer_closed: 7 }, f).met, false);
  assert.equal(checkCondition({ layer_open: 8 }, f).met, true);
  assert.equal(checkCondition({ pr_merged: 6 }, f).met, false);
  assert.equal(checkCondition({ pr_merged: 7 }, f).met, null, 'unread: unknown, never met');
  assert.equal(checkCondition({ module_complete: 'a' }, f).met, true);
  assert.match(checkCondition({ session_gone: 'session_x' }, f).why, /unknown \(no session list read\)/);
  assert.equal(checkCondition({ at: '2026-11-06T11:00:00Z' }, f).met, true);
  assert.equal(checkCondition({ at: '2026-11-06T13:00:00Z' }, f).met, false);
  assert.equal(firstMet([{ layer_closed: 7 }, { pr_merged: 5 }], f).c.pr_merged, 5);
  assert.equal(firstMet([{ layer_closed: 7 }, { pr_merged: 7 }], f), null);
});

test('the migration: plain words give a condition; words that say something follows are refused, by id', () => {
  assert.deepEqual(fromText(W19).conds, [{ layer_closed: 6 }]);
  assert.deepEqual(fromText(W20).conds, [{ layer_closed: 6 }]);
  assert.deepEqual(fromText('until layer 9 opens').conds, [{ layer_open: 9 }]);
  assert.match(fromText(W18).unparsed, /something follows the condition \("after it"\)/, 'hold-18: product work pauses after layer 6 closes');
  assert.match(fromText(W23).unparsed, /no "until layer <n> closes"/);
  assert.match(fromText('until layer 6 closes, or until layer 7 closes').unparsed, /more than one condition/);
});

test('facts: closed and merged layers, open layers, landed PRs, complete modules, archived sessions', () => {
  const root = product({ 'layers/closed.jsonl': closed(6) + jl([{ row: 'closed', layer: 9, tranche: 'other' }]), 'layerflow/7/merged.json': '{}\n', 'layerflow/8/open.json': '{}\n' }, {
    ledger: { 'process/ledger/a.json': entry('a', { status: { state: 'COMPLETE' } }), 'process/ledger/b.json': entry('b') },
  });
  git(['checkout', '-q', '-b', 'side'], { cwd: root });
  commit(root, { 'x.txt': '1' });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '-m', 'Merge PR 41: side into tranche', 'side'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  fetchState(root, SB);
  const f = readFacts(root, loadConfig(root), { listed: [{ id: 'session_gone1', session_status: 'SESSION_STATUS_ARCHIVED' }, { id: 'session_live1', session_status: 'idle' }] });
  assert.deepEqual([6, 7, 8, 9].map((n) => f.layerClosed(n)), [true, true, false, false], 'another tranche\'s close is not this one\'s');
  assert.deepEqual([7, 8, 9].map((n) => f.layerOpen(n)), [false, true, false]);
  assert.deepEqual([41, 42].map((n) => f.prMerged(n)), [true, false]);
  assert.deepEqual(['a', 'b', 'zz'].map((id) => f.moduleComplete(id)), [true, false, false]);
  assert.deepEqual(['session_gone1', 'session_live1', 'session_unlisted'].map((id) => f.sessionGone(id)), [true, false, null], 'a session the list does not hold is unknown, never gone');
  assert.equal(readFacts(root, loadConfig(root)).sessionGone('session_gone1'), null, 'no list: unknown');
});

test('the case: layer 6 closed ends hold-19 to hold-22 by the tool, recorded with the condition; hold-18 and hold-23 stay and are reported', () => {
  const root = product({ [HOLDS_FILE]: jl(holdRows()), 'layers/closed.jsonl': closed(6) });
  const cfg = loadConfig(root);
  fetchState(root, SB);
  const before = readHolds(root, SB);
  assert.deepEqual(before.filter((h) => h.live).map((h) => h.id), ['hold-18', 'hold-23'], 'met holds hold nothing at once, before any write');
  assert.ok(holdLines(before).some((l) => /^- hold-19 layer:8, .*holds nothing, layer_closed:6 met \(read from its words\); the tool ends it at its next write/.test(l)));
  const stale = staleRecords(root, cfg);
  assert.deepEqual(stale.filter((x) => x.auto).map((x) => x.id), ['hold-19', 'hold-20', 'hold-21', 'hold-22']);
  assert.match(stale.find((x) => x.id === 'hold-18').why, /its words name an end the tool cannot check \(its words say something follows the condition \("after it"\)\); it holds until 20/);
  const said = [];
  assert.deepEqual(expireRecords(root, cfg, { log: (l) => said.push(l) }).holds, ['hold-19', 'hold-20', 'hold-21', 'hold-22']);
  assert.match(said[0], /^hold-19 ended by the tool: layer:8 holds nothing now \(layer_closed:6 met, read from its words\)$/);
  fetchState(root, SB, { fresh: true });
  const ends = jsonl(readState(root, SB, HOLDS_FILE)).filter((r) => r.row === 'end');
  assert.deepEqual(ends.map((r) => [r.id, r.by, r.condition.layer_closed, r.read_from_words]), [['hold-19', BY_TOOL, 6, true], ['hold-20', BY_TOOL, 6, true], ['hold-21', BY_TOOL, 6, true], ['hold-22', BY_TOOL, 6, true]]);
  assert.match(ends[0].why, /^condition met: layer_closed:6 met$/);
  // Once: a second pass ends nothing and writes nothing.
  const tip = git(['rev-parse', `refs/remotes/origin/${SB}`], { cwd: root });
  assert.deepEqual(expireRecords(root, cfg, { log: quiet }).holds, []);
  fetchState(root, SB, { fresh: true });
  assert.equal(git(['rev-parse', `refs/remotes/origin/${SB}`], { cwd: root }), tip);
  // status prints no command for a person to type; hold-18 is reported with what ends it.
  const out = [];
  status(root, { offline: true, log: (l) => out.push(l) });
  assert.ok(out.some((l) => /^- hold hold-18: layer:7: its words name an end the tool cannot check/.test(l)));
  assert.ok(!out.some((l) => /hold --end/.test(l)), 'no hold --end for a person to type');
  // Not before its layer closes.
  const open = product({ [HOLDS_FILE]: jl(holdRows()), 'layers/closed.jsonl': closed(5) });
  assert.deepEqual(expireRecords(open, loadConfig(open), { log: quiet }).holds, []);
});

test('hold --when: the condition is recorded and ends the hold; words alone are refused; plain words record their condition', () => {
  const root = product({ 'layers/closed.jsonl': closed(5) });
  const S = 'session_coord1';
  const h = hold(root, 'module:b', { why: 'waits for the layer', by: S, when: 'layer_closed:6,pr_merged:77', log: quiet });
  assert.deepEqual(h.when, [{ layer_closed: 6 }, { pr_merged: 77 }]);
  assert.throws(() => hold(root, 'module:c', { why: 'until the coordinator says', by: S, log: quiet }), /an end the tool can check; words alone are refused/);
  assert.throws(() => hold(root, 'module:c', { why: 'x', by: S, when: 'when it is done', log: quiet }), /--when "when it is done" is not a condition/);
  const said = [];
  const w = hold(root, 'layer:8', { why: 'until layer 6 closes', by: S, log: (l) => said.push(l) });
  assert.deepEqual(w.when, [{ layer_closed: 6 }]);
  assert.match(said[0], /its words give the condition layer_closed:6: recorded with it/);
  const cfg = loadConfig(root);
  assert.deepEqual(expireRecords(root, cfg, { log: quiet }).holds, [], 'layer 6 not closed yet');
  writeState(root, SB, 'close 6', (dir) => { appendFileSync(join(dir, 'layers/closed.jsonl'), closed(6)); return {}; });
  assert.deepEqual(expireHolds(root, SB, { log: quiet }), ['hold-1', 'hold-2']);
  fetchState(root, SB, { fresh: true });
  assert.deepEqual(readHolds(root, SB).map((h) => [h.id, h.live, h.ended?.by]), [['hold-1', false, BY_TOOL], ['hold-2', false, BY_TOOL]]);
  // A hold ended by hand meanwhile is not ended twice.
  hold(root, 'module:d', { why: 'x', by: S, when: 'module_complete:d', log: quiet });
  hold(root, 'hold-3', { by: S, end: 'hold-3', log: quiet });
  assert.deepEqual(expireHolds(root, SB, { log: quiet }), []);
});

test('lane seats whose session is archived end at the sweep\'s list; asks of a removed lane, archived addresses and coordinator are reported', () => {
  const lanes = [{ name: 'ux', dir: 'docs/ux' }];
  const root = product({
    [LANE_SESSIONS_FILE]: jl([{ row: 'start', at: '2026-11-06T12:36:55Z', lane: 'ux' }, { row: 'record', at: '2026-11-06T12:37:22Z', lane: 'ux', session: 'session_ux1' }]),
    [LANES_FILE]: jl([{ row: 'ask', at: '2026-11-06T10:00:00Z', tranche: 'tranche', lane: 'old', question: 'which colour?' }]),
    'addresses/bob.json': JSON.stringify({ role: 'bob', session: 'session_bob1' }),
    'addresses/root.json': JSON.stringify({ role: 'root', session: 'session_root1' }),
  }, { config: { lanes, coordinator: 'session_coord9' } });
  const cfg = loadConfig(root);
  fetchState(root, SB);
  const listed = [
    { id: 'session_ux1', session_status: 'SESSION_STATUS_ARCHIVED' }, { id: 'session_bob1', session_status: 'SESSION_STATUS_ARCHIVED' },
    { id: 'session_root1', session_status: 'SESSION_STATUS_IDLE' }, { id: 'session_coord9', session_status: 'SESSION_STATUS_ARCHIVED' },
  ];
  const stale = staleRecords(root, cfg, { listed });
  assert.deepEqual(stale.map((x) => [x.kind, x.id, x.auto]), [['lane seat', 'ux', true], ['lane ask', 'old: which colour?', false], ['address', 'bob', false], ['config', 'coordinator', false]]);
  assert.match(staleLines(stale)[0], /^stale records: 4 \(1 the tool ends at its next write\)$/);
  // Without the list: nothing said of sessions, and no seat ended.
  assert.deepEqual(staleRecords(root, cfg).map((x) => x.kind), ['lane ask']);
  assert.deepEqual(expireRecords(root, cfg, { log: quiet }).seats, []);
  // A seat whose session the list does not hold stays (a short list is no proof).
  assert.deepEqual(expireRecords(root, cfg, { listed: [{ id: 'session_other', session_status: 'SESSION_STATUS_ARCHIVED' }], log: quiet }).seats, []);
  assert.deepEqual(expireRecords(root, cfg, { listed, log: quiet }).seats, ['ux']);
  fetchState(root, SB, { fresh: true });
  assert.equal(readSeats(root, cfg).size, 0);
  const end = jsonl(readState(root, SB, LANE_SESSIONS_FILE)).at(-1);
  assert.deepEqual([end.row, end.lane, end.session, end.by], ['end', 'ux', 'session_ux1', BY_TOOL]);
});

test('ROOT\'s sweep ends what the tool can and finds the rest, with nothing for a person to type', () => {
  const root = product({ [HOLDS_FILE]: jl(holdRows()), 'layers/closed.jsonl': closed(6), [LANE_SESSIONS_FILE]: jl([{ row: 'start', at: '2026-11-06T12:36:55Z', lane: 'ux' }, { row: 'record', at: '2026-11-06T12:37:22Z', lane: 'ux', session: 'session_ux1' }]) }, { config: { lanes: [{ name: 'ux', dir: 'docs/ux' }] } });
  recordStart(root, 'root', 'session_root1', { log: quiet });
  const file = join(mkdtempSync(join(tmpdir(), 'p3-sess-')), 'sessions.json');
  writeFileSync(file, JSON.stringify([{ id: 'session_root1', title: 'ROOT', session_status: 'SESSION_STATUS_RUNNING', updated_at: new Date().toISOString() }, { id: 'session_ux1', title: 'lane ux', session_status: 'SESSION_STATUS_ARCHIVED', updated_at: '2026-11-06T13:00:00Z' }]));
  const out = [];
  const r = sweep(root, { session: 'session_root1', sessions: file, offline: true, log: (l) => out.push(l) });
  assert.ok(r.found.includes('holds ended by the tool (condition met): hold-19, hold-20, hold-21, hold-22'), r.found.join('\n'));
  assert.ok(r.found.includes('lane seats ended by the tool (session archived): ux'));
  assert.ok(r.found.some((x) => /^stale hold hold-18: layer:7: its words name an end the tool cannot check/.test(x)));
  assert.ok(!r.todo.some((x) => /hold --end|lane end/.test(x)), 'nothing for a person to type');
  fetchState(root, SB, { fresh: true });
  assert.deepEqual(readHolds(root, SB).filter((h) => h.ended?.by === BY_TOOL).map((h) => h.id), ['hold-19', 'hold-20', 'hold-21', 'hold-22']);
});
