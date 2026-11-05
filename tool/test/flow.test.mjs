// Flow control (Bob, 5 Nov, Build Plan R10): starts owed, empty-slot reasons, flow samples, safety
// holds, the single start's cap check; and the README's fault injections, each detected by the
// first flow sample after it (at most SAMPLE_MIN minutes of tool activity, within 15) and cleared.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commit, entry, makeRepo, openPassed, setJobCap } from './helpers.mjs';
import { FLOW_FILE, OWED_FILE, SAFETY_FILE, SAMPLE_MIN, baseRedRising, bobAct, capRoom, deadEnds, owe, owedOf, owes, safety, sample, slotReasons, usageReading } from '../lib/flow.mjs';
import { startReady } from '../lib/ready.mjs';
import { fetchState, jsonl, readState, writeState } from '../lib/state.mjs';
import { status } from '../lib/status.mjs';
import { main } from '../p3.mjs';
import { git, loadConfig } from '../lib/util.mjs';

const SB = 'process-state';
const unmet = (n) => Array.from({ length: n }, (_, i) => `- **R${i + 1}** *(not yet met: x)* text`).join('\n') + '\n';
const quiet = () => {};
const io = { queue: () => 0 };

// A product with a layer map, its tranche and state branch on a bare origin.
function product(files) {
  const root = makeRepo({
    'build/layers.md': '| Layer | Modules |\n|---|---|\n| 1 | `done` |\n| 2 | `a`, `b`, `c` |\n',
    'process/config.json': JSON.stringify({}),
    'build/requirements/done.md': '# done\n',
    'process/ledger/done.json': entry('done', { requirements: 'build/requirements/done.md', layer: 1, status: { state: 'COMPLETE' } }),
    ...files,
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', 'https://github.com/o/r'], { cwd: root });
  git(['config', `url.${bare}.insteadOf`, 'https://github.com/o/r'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  openPassed(root);
  git(['push', '-q', 'origin', `refs/remotes/origin/${SB}:refs/heads/${SB}`], { cwd: root });
  // Layer 1 closed by layer close, nothing deferred.
  writeState(root, SB, 'closed', (wt) => writeFileAt(wt, 'layers/closed.jsonl', JSON.stringify({ row: 'closed', tranche: 'tranche', layer: 1, commit: git(['rev-parse', 'HEAD'], { cwd: root }), deferred: [] }) + '\n'));
  return root;
}
const toTranche = (root, files, msg) => { commit(root, files, msg); git(['push', '-q', 'origin', 'HEAD:tranche'], { cwd: root }); git(['fetch', '-q', 'origin', 'tranche:refs/remotes/origin/tranche'], { cwd: root }); };
const flowRows = (root) => { fetchState(root, SB, { fresh: true }); return jsonl(readState(root, SB, FLOW_FILE)); };
// A clock moved on: the last flow row made older than SAMPLE_MIN, as the next command finds it.
const age = (root, min = SAMPLE_MIN + 1) => writeState(root, SB, 'aged', (wt) => {
  const rows = jsonl(readState(root, SB, FLOW_FILE)).map((r, i, all) => (i === all.length - 1 ? { ...r, at: new Date(Date.now() - min * 6e4).toISOString() } : r));
  writeFileSync(join(wt, FLOW_FILE), rows.map((r) => JSON.stringify(r) + '\n').join(''));
});
async function run(root, argv) {
  const cwd = process.cwd();
  const errs = [];
  const [e, l] = [console.error, console.log];
  console.error = (m) => errs.push(String(m));
  console.log = (m) => errs.push(String(m));
  try { process.chdir(root); return { code: await main(argv), out: errs.join('\n') }; } finally { process.chdir(cwd); console.error = e; console.log = l; }
}

test('starts owed: the acts that owe it, BOB\'s acts it holds back, the first act\'s time kept', () => {
  assert.equal(owes('merge', { _: ['12'] }), 'merge 12');
  assert.equal(owes('job complete', { _: ['a'] }), 'job complete a');
  assert.equal(owes('block', { _: ['a'] }), 'block a');
  assert.equal(owes('layer close', { _: ['3'] }), 'layer close 3');
  assert.equal(owes('notice triage', { _: ['p:1'], record: 'f' }), 'triage recorded p:1');
  assert.equal(owes('notice triage', { _: ['p:1'] }), null);
  assert.equal(owes('status', { _: [] }), null);
  assert.equal(bobAct('job start', { ready: true }), false);
  assert.equal(bobAct('job start', {}), true);
  for (const n of ['status', 'hold', 'address', 'sweep', 'job complete', 'tranche open']) assert.equal(bobAct(n, { _: [] }), false, n);
  for (const n of ['merge', 'layer close', 'handoff', 'tranche close']) assert.equal(bobAct(n, { _: [] }), true, n);
  assert.equal(bobAct('send', { from: 'bob' }), true);
  assert.equal(bobAct('send', { from: 'job-a' }), false);
  const wt = mkdtempSync(join(tmpdir(), 'p3-owed-'));
  owe(wt, 'merge 1');
  const first = JSON.parse(readFileSyncSafe(join(wt, OWED_FILE)));
  owe(wt, 'block a');
  const both = JSON.parse(readFileSyncSafe(join(wt, OWED_FILE)));
  assert.equal(both.since, first.since);
  assert.deepEqual(both.acts.map((x) => x.act), ['merge 1', 'block a']);
});
import { readFileSync } from 'node:fs';
const readFileSyncSafe = (p) => readFileSync(p, 'utf8');

test('every empty slot has one reason: a hold, a safety signal, a failed start, a dead end, else no work', () => {
  assert.deepEqual(slotReasons(4, { holds: [{ id: 'hold-1', slots: 2 }], dead: [{ id: 'm', why: 'x' }] }), ['hold hold-1', 'hold hold-1', 'dead end m: x', 'no work']);
  assert.deepEqual(slotReasons(3, { holds: [{ signal: 'usage', reading: 'r' }] }), ['safety usage', 'safety usage', 'safety usage']);
  assert.deepEqual(slotReasons(2, { failed: [{ id: 'q', why: 'setup' }] }), ['dead end q: its start failed: setup', 'no work']);
  assert.deepEqual(slotReasons(0, { dead: [{ id: 'm', why: 'x' }] }), []);
});

test('safety readings: usage other than allowed, the gate queue over its threshold, base-red at each of the last merges; a reading not taken keeps its hold', () => {
  const dir = mkdtempSync(join(tmpdir(), 'p3-usage-'));
  const f = join(dir, 's.json');
  writeFileSync(f, JSON.stringify({ data: [{ id: 'session_a', title: 'job a', rate_limit_info: { status: 'allowed_warning', resetsAt: 1 } }] }));
  assert.equal(usageReading(f).status, 'allowed_warning');
  // get_session's shape (this session's, 5 Nov): a warning holds half the free slots.
  writeFileSync(f, JSON.stringify({ ccr: { id: 'session_b', external_metadata: { rate_limit_info: { rateLimitType: 'seven_day', status: 'allowed_warning' } } } }));
  const w = safety(null, {}, { usage: usageReading(f), queue: 0, mergeRows: [] });
  assert.deepEqual([w[0].signal, w[0].half], ['usage', true]);
  assert.deepEqual(slotReasons(3, { holds: w }), ['safety usage', 'safety usage', 'no work']);
  writeFileSync(f, JSON.stringify([{ id: 'session_a' }]));
  assert.equal(usageReading(f), null);
  const h = safety(null, {}, { usage: { status: 'rejected', reading: 'rate_limit_info {"status":"rejected"}' }, queue: 9, mergeRows: [1, 2, 3].map((pr) => ({ row: 'merge', pr, at: `2026-11-05T0${pr}:00:00Z`, base_red: 1 })) });
  assert.deepEqual(h.map((x) => x.signal), ['usage', 'gate', 'base-red']);
  assert.match(h[1].reading, /9 process-gate runs queued, over 5/);
  assert.equal(baseRedRising([{ row: 'merge', pr: 1, at: '1', base_red: 1 }, { row: 'merge', pr: 2, at: '2', base_red: 0 }, { row: 'merge', pr: 3, at: '3', base_red: 2 }]), null);
  // Cleared by a new reading; kept while unread.
  assert.deepEqual(safety(null, {}, { usage: { status: 'allowed' }, queue: 0, mergeRows: [], prev: h }), []);
  assert.deepEqual(safety(null, {}, { prev: h }).map((x) => [x.signal, x.since]), h.map((x) => [x.signal, x.since]));
});

test('job start <id> checks the cap as job start --ready does: --live required, a full cap or a safety hold refuses', (t) => {
  setJobCap(t, 3);
  const root = product({});
  const cfg = loadConfig(root);
  assert.throws(() => capRoom(root, cfg, {}), /--live <n> \(or --sessions <file>\)/);
  assert.equal(capRoom(root, cfg, { live: '2' }).n, 2);
  assert.throws(() => capRoom(root, cfg, { live: '3' }), /the job cap is full: 3 job sessions live of 3; nothing was started/);
  writeState(root, SB, 'safety', (wt) => { git(['init', '-q'], { cwd: wt }); writeFileAt(wt, SAFETY_FILE, JSON.stringify([{ signal: 'gate', reading: '9 queued', by: 'tool' }])); });
  assert.throws(() => capRoom(root, cfg, { live: '0' }), /3 held \(gate: 9 queued\)/);
});
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const writeFileAt = (wt, p, t) => { mkdirSync(dirname(join(wt, p)), { recursive: true }); writeFileSync(join(wt, p), t); };

test('dead ends: unmet marks on a module behind the open layer, listed in no next work; not when deferred, BLOCKED or in a later layer', () => {
  const cfg = { requirements_dir: 'build/requirements' };
  const ls = { cur: { n: 2 }, layers: [{ n: 1, mods: [{ file: 'build/requirements/old.md' }, { file: 'build/requirements/def.md' }] }, { n: 3, mods: [{ file: 'build/requirements/later.md' }] }], deferred: [{ id: 'def' }] };
  const root = makeRepo({ 'build/requirements/old.md': unmet(2), 'build/requirements/def.md': unmet(1), 'build/requirements/later.md': unmet(1), 'build/requirements/blk.md': unmet(1) });
  const rows = ['old', 'def', 'later'].map((id) => ({ id, tranche: 'COMPLETE' })).concat([{ id: 'blk', tranche: 'BLOCKED' }]);
  const d = deadEnds(root, cfg, { rows, next: [], skip: [{ id: 'w', why: "entry WORKING: BOB's judgment" }, { id: 'x', why: 'no ledger entry: BOB writes it' }], ls, ref: 'HEAD' });
  assert.deepEqual(d.map((x) => x.id), ['old', 'w']);
  assert.match(d[0].why, /2 unmet marks, entry COMPLETE, layer 1 behind the open layer: listed in no next work/);
});

// Fault injection 1 (README, tests): a spoken limit. BOB is told "only 6" and starts no more; no
// hold is recorded. The first sample finds startable work and empty slots with no reason: starts
// owed is written, BOB's next act refuses (exit 2), and job start --ready clears it by starting.
test('fault injection: a spoken limit is detected by the next flow sample, holds BOB\'s acts, and job start --ready clears it', async (t) => {
  setJobCap(t, 4);
  const root = product({
    ...Object.fromEntries(['a', 'b', 'c'].flatMap((id) => [[`build/requirements/${id}.md`, unmet(1)], [`process/ledger/${id}.json`, entry(id, { requirements: `build/requirements/${id}.md`, layer: 2 })]])),
  });
  const cfg = loadConfig(root);
  const row = sample(root, cfg, { by: 'job complete', io, force: true });
  assert.equal(row.startable, 3);
  assert.match(row.alarms[0], /^idle capacity: 3 slots empty with 3 startable/);
  assert.ok(owedOf(root, SB), 'starts owed written by the sample');
  // Within SAMPLE_MIN no second sample; past it, the next command takes one.
  assert.equal(sample(root, cfg, { by: 'status', io }), null);
  const r = await run(root, ['handoff']);
  assert.equal(r.code, 2);
  assert.match(r.out, /p3 handoff: starts owed since \S+ \(idle capacity: 3 slots empty with 3 startable\): run job start --ready first/);
  // status leads with it.
  const s = [];
  status(root, { role: 'bob', offline: true, log: (l) => s.push(l) });
  assert.match(s[0], /^starts owed since/);
  // job start --ready: starts to the cap; the slot left empty has its reason; starts owed cleared.
  const out = [];
  const res = startReady(root, { live: 0, log: (l) => out.push(l), io: { ...io, slug: null }, read: (r, o) => status(r, { ...o, offline: true, heads: new Set() }), start: (rt, id) => { git(['push', '-q', 'origin', `HEAD:refs/heads/job/${id}`], { cwd: rt }); return { launch: { title: `job ${id}` } }; } });
  assert.deepEqual(res.started.map((x) => x.id), ["a", "b", "c"], out.join("\n"));
  assert.match(out.join('\n'), /empty slots 1: no work/);
  assert.equal(owedOf(root, SB), null);
  const ready = flowRows(root).at(-1);
  assert.deepEqual([ready.row, ready.started, ready.empty], ['ready', ['a', 'b', 'c'], ['no work']]);
  // The next sample, SAMPLE_MIN on: the three live, no alarm.
  age(root);
  const next = sample(root, cfg, { by: 'job complete', io });
  assert.equal(next.live, 3);
  assert.deepEqual(next.alarms, []);
  assert.equal(owedOf(root, SB), null);
});

// Fault injection 2: a dead end. A COMPLETE entry with unmet marks in no layer of the map: no next
// work lists it, so nothing would ever start it (in a closed layer its marks are deferred instead). The sample records it, status prints it first;
// meeting the marks (or reopening it) clears it at the next sample.
test('fault injection: a dead end is recorded by the next flow sample, printed first by status, and cleared', (t) => {
  setJobCap(t, 4);
  const root = product({ 'build/layers.md': '| Layer | Modules |\n|---|---|\n| 1 | `done` |\n| 2 | `a` |\n', 'build/requirements/a.md': unmet(1), 'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md', layer: 2, status: { state: 'BLOCKED', reason: 'needs a ruling', at: new Date().toISOString() } }) });
  toTranche(root, { 'build/requirements/stuck.md': unmet(2), 'process/ledger/stuck.json': entry('stuck', { requirements: 'build/requirements/stuck.md', layer: 1, status: { state: 'COMPLETE' } }) }, 'stuck');
  const cfg = loadConfig(root);
  const row = sample(root, cfg, { by: 'test', io, force: true });
  assert.ok(row.alarms.some((a) => /^dead end stuck: 2 unmet marks, entry COMPLETE, in no layer: listed in no next work/.test(a)), row.alarms.join('\n'));
  const s = [];
  status(root, { role: 'bob', offline: true, log: (l) => s.push(l) });
  assert.match(s.slice(0, 2).join('\n'), /dead end stuck: .*a Process3 defect/);
  toTranche(root, { 'build/requirements/stuck.md': '# met\n' }, 'stuck met');
  age(root);
  const after = sample(root, cfg, { by: 'test', io });
  assert.ok(!after.alarms.some((a) => /dead end/.test(a)), after.alarms.join('\n'));
});

// Fault injection 3: an unanswered BLOCKED job, past targets.decision_minutes. The sample records
// the ruling owed and by whom; a ruling (the entry no longer BLOCKED) clears it.
test('fault injection: an unanswered BLOCKED job is recorded by the next flow sample and cleared by its ruling', (t) => {
  setJobCap(t, 4);
  const at = new Date(Date.now() - 45 * 6e4).toISOString();
  const root = product({ 'build/requirements/a.md': unmet(1), 'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md', layer: 2, status: { state: 'BLOCKED', reason: 'which store?', at } }) });
  const cfg = loadConfig(root);
  const row = sample(root, cfg, { by: 'block', io, force: true });
  assert.ok(row.alarms.some((a) => /^ruling owed by the coordinator: job a BLOCKED 4\d min/.test(a)), row.alarms.join('\n'));
  toTranche(root, { 'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md', layer: 2, status: { state: 'OPEN' } }) }, 'ruled');
  age(root);
  const after = sample(root, cfg, { by: 'test', io });
  assert.ok(!after.alarms.some((a) => /ruling owed/.test(a)), after.alarms.join('\n'));
});
