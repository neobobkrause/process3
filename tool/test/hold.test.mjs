// Holds and idle capacity (Bob, 5 Nov: a spoken "about 6 job sessions at most" held BOB near 6 of
// 20 for about 6 hours and nothing in Process3 saw it; cap use about 48% over a day).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeRepo, setJobCap } from './helpers.mjs';
import { HOLDS_FILE, hold, holdHours, holdLines, holdsOf } from '../lib/hold.mjs';
import { flowFigures, unmetAtRef } from '../lib/metrics.mjs';
import { startReady } from '../lib/ready.mjs';
import { recordStart } from '../lib/roles.mjs';
import { readState, writeState } from '../lib/state.mjs';
import { status } from '../lib/status.mjs';
import { SWEEP_ROWS_FILE, idleCapacity, sweep } from '../lib/sweep.mjs';
import { git } from '../lib/util.mjs';

const quiet = () => {};
const SB = 'process-state';
const S = 'session_coord1';
const ago = (min) => new Date(Date.now() - min * 6e4).toISOString();

function withOrigin(files = {}) {
  const root = makeRepo({ 'README.md': 'x', 'process/config.json': { tranche: 'tranche', coordinator: 'session_coord1' }, 'build/layers.md': '| 1 | a, b |\n| 2 | c, d, e, f, g, h |\n', ...files });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  return root;
}
const lines = (root) => { const out = []; status(root, { offline: true, log: (l) => out.push(l) }); return out; };

test('hold: a row on the state branch, printed first by status with who, why and minutes left; ended by --end; refusals', (t) => {
  setJobCap(t, 20);
  const root = withOrigin();
  assert.deepEqual(lines(root).slice(0, 1), ['holds: none']);
  const r = hold(root, 'slots:3', { why: 'deploy rehearsal', by: S, until: '90m', log: quiet });
  assert.equal(r.id, 'hold-1');
  hold(root, 'module:a', { why: 'its provider is being split', by: S, until: '30m', log: quiet });
  const out = lines(root);
  assert.match(out[0], /^holds: 2 live/);
  assert.match(out[1], /^- hold-1 slots:3, by session_coord1, (89|90) min to expiry: deploy rehearsal$/);
  assert.match(out[2], /^- hold-2 module:a, by session_coord1, (29|30) min to expiry/);
  hold(root, undefined, { end: 'hold-1', by: S, log: quiet });
  assert.throws(() => hold(root, undefined, { end: 'hold-1', by: S, log: quiet }), /holds nothing already \(ended\)/);
  assert.match(lines(root)[0], /^holds: 1 live/);
  // Every hold expires within two hours, whoever sets it and however wide; no Bob path.
  assert.throws(() => hold(root, 'slots:2', { why: 'x', by: S, until: '3h', log: quiet }), /refused: a hold expires within 2 hours; to hold longer, set a new hold with its reason/);
  assert.throws(() => hold(root, 'slots:1', { why: 'x', by: 'bob', until: '10m', log: quiet }), /--by <your session id/);
  assert.equal(hold(root, 'layer:2', { why: 'wide is fine', by: S, until: '2h', log: quiet }).id, 'hold-3');
  assert.throws(() => hold(root, 'room:1', { why: 'x', by: S, until: '10m' }), /module:<id>, layer:<n> or slots:<n>/);
  assert.throws(() => hold(root, 'slots:1', { why: 'x', by: S, until: ago(1) }), /a future time/);
  assert.throws(() => hold(root, 'slots:1', { why: 'x', by: 'me', until: '10m' }), /--by <your session id/);
});

test('hold: a longer hold is a visible chain of renewals, each with its reason; report tranche counts hold-hours by setter and reason', (t) => {
  setJobCap(t, 20);
  const root = withOrigin();
  hold(root, 'slots:4', { why: 'gate queue full', by: S, until: '2h', log: quiet });
  const r = hold(root, 'slots:4', { why: 'gate queue still full', by: S, until: '2h', log: quiet });
  assert.equal(r.renews, 'hold-1');
  assert.match(lines(root)[2], /^- hold-2 slots:4, by session_coord1, renewing hold-1, (119|120) min to expiry: gate queue still full$/);
  assert.equal(hold(root, 'module:a', { why: 'x', by: S, until: '10m', log: quiet }).renews, undefined);
  const at = (h) => new Date(Date.parse('2026-11-04T00:00:00Z') + h * 36e5).toISOString();
  const rows = [
    { at: at(0), row: 'hold', id: 'hold-1', scope: 'slots:4', why: 'gate queue full', by: S, until: at(2) },
    { at: at(2), row: 'hold', id: 'hold-2', scope: 'slots:4', why: 'gate queue full', by: S, until: at(4), renews: 'hold-1' },
    { at: at(3), row: 'end', id: 'hold-2', by: S },
    { at: at(5), row: 'hold', id: 'hold-3', scope: 'module:a', why: 'split', by: 'session_x1', until: at(7) },
    // A renewal set before the hold it renews ends: the overlap counts once (5.5 to 6, not twice).
    { at: at(5.5), row: 'hold', id: 'hold-4', scope: 'module:a', why: 'split', by: 'session_x1', until: at(7.5), renews: 'hold-3' },
  ];
  assert.deepEqual(holdHours(rows, at(1), at(6)), [{ by: S, why: 'gate queue full', holds: 2, hours: 2 }, { by: 'session_x1', why: 'split', holds: 2, hours: 1 }]);
});

test('holds: an expired hold holds nothing and is printed as expired', () => {
  const hs = holdsOf([
    { row: 'hold', id: 'hold-1', scope: 'slots:14', why: 'about 6 at most', by: S, until: ago(30) },
    { row: 'hold', id: 'hold-2', scope: 'layer:2', why: 'y', by: S, until: ago(-20) },
  ]);
  assert.deepEqual(hs.map((h) => h.live), [false, true]);
  const l = holdLines(hs);
  assert.match(l[0], /^holds: 1 live, 1 expired/);
  assert.match(l[2], /^- hold-1 slots:14, by session_coord1: expired (29|30) min ago, holds nothing: about 6 at most$/);
});

test('job start --ready: starts to the cap less the live slot holds, and no held module or layer', (t) => {
  setJobCap(t, 6);
  const root = withOrigin();
  const next = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ file: `r/${id}.md`, count: 1, module: id, entry_state: 'OPEN' }));
  const holds = holdsOf([
    { row: 'hold', id: 'hold-1', scope: 'slots:2', why: 'w', by: S, until: ago(-30) },
    { row: 'hold', id: 'hold-2', scope: 'module:a', why: 'split first', by: S, until: ago(-30) },
    { row: 'hold', id: 'hold-3', scope: 'layer:2', why: 'v', by: S, until: ago(-30) },
    { row: 'hold', id: 'hold-4', scope: 'slots:3', why: 'expired', by: S, until: ago(5) },
  ]);
  const out = [];
  const r = startReady(root, { live: 1, remote: new Set(), log: (l) => out.push(l), read: () => ({ next, holds }), start: () => ({ launch: {} }) });
  // Cap 6 less 2 held less 1 live: 3 slots; a held, c..e in layer 2 held: only b starts.
  assert.deepEqual(r.started.map((x) => x.id), ['b']);
  assert.ok(out.includes('2 slots held by recorded holds (status lists them)'));
  assert.ok(out.some((l) => /^not started: a: held by hold-2 \(module:a, by session_coord1, until .*\): split first$/.test(l)));
  assert.ok(out.some((l) => /^not started: c: held by hold-3 \(layer:2/.test(l)));
});

test('idle capacity: work startable under the cap less holds for 15 min, or none under half the cap for 30 min; each empty slot has its reason', () => {
  const work = [
    { file: 'r/a.md', count: 1, module: 'a', entry_state: 'OPEN' },
    { file: 'r/b.md', count: 1, module: 'b', entry_state: 'OPEN' },
    { file: 'r/c.md', count: 1 },
  ];
  const holds = holdsOf([{ row: 'hold', id: 'hold-1', scope: 'module:b', why: 'split', by: S, until: ago(-30) }, { row: 'hold', id: 'hold-2', scope: 'slots:4', why: 'w', by: S, until: ago(-30) }]);
  const t = Date.now();
  const base = { live: 6, cap: 20, holds, work, startable: 2, layers: new Map(), t }; // flow's count: a and b
  const fresh = idleCapacity({ ...base, freed: t - 5 * 6e4 });
  assert.deepEqual([fresh.kind, fresh.min, fresh.alarm, fresh.held, fresh.startable, fresh.empty], ['work', 5, false, 4, 1, 10]);
  assert.deepEqual(fresh.reasons, ['1 x startable, not started', 'r/c.md: no ledger entry: BOB writes it, then job start --ready starts it', 'b: held by hold-1 (by session_coord1): split', '7 x no startable work']);
  // The last sweep saw the same idle: its since carries.
  const carried = idleCapacity({ ...base, freed: t, prev: { at: new Date(t - 9 * 6e4).toISOString(), idle_capacity: { kind: 'work', since: new Date(t - 20 * 6e4).toISOString() } } });
  assert.deepEqual([carried.min, carried.alarm], [20, true]);
  // Not carried: never before the last sweep, which saw none (an old tranche tip proves nothing).
  assert.equal(idleCapacity({ ...base, freed: t - 300 * 6e4, prev: { at: new Date(t - 10 * 6e4).toISOString() } }).min, 10);
  // At the cap less holds: no idle.
  assert.equal(idleCapacity({ ...base, live: 16, freed: t - 60 * 6e4 }), null);
  // Nothing startable: idle only under half the cap, and only after 30 min.
  const none = { ...base, holds: [], work: [], startable: 0 };
  assert.equal(idleCapacity({ ...none, live: 10, freed: t - 60 * 6e4 }), null);
  const empty = idleCapacity({ ...none, live: 6, freed: t - 25 * 6e4 });
  assert.deepEqual([empty.kind, empty.alarm, empty.reasons], ['empty', false, ['14 x no startable work']]);
  assert.equal(idleCapacity({ ...none, live: 6, freed: t - 31 * 6e4 }).alarm, true);
});

test('sweep: IDLE CAPACITY wakes BOB with the start and tells the coordinator the reason; the sweep row records it', (t) => {
  setJobCap(t, 20);
  const root = withOrigin();
  recordStart(root, 'root', 'session_root1', { log: quiet });
  recordStart(root, 'bob', 'session_bob1', { log: quiet });
  const run = () => sweep(root, { session: 'session_root1', live: 2, offline: true, log: quiet });
  const rows = () => readState(root, SB, SWEEP_ROWS_FILE).trim().split('\n').map((l) => JSON.parse(l));
  let r = run();
  assert.deepEqual([rows()[0].idle_capacity.kind, rows()[0].idle_capacity.alarm], ['empty', false]); // the tranche tip is fresh
  assert.ok(!r.found.some((x) => /IDLE CAPACITY/.test(x)));
  writeState(root, SB, 'older', (d) => writeFileSync(join(d, SWEEP_ROWS_FILE), JSON.stringify({ at: ago(40), row: 'sweep', live: 2, job_cap: 20, idle_capacity: { kind: 'empty', since: ago(40) } }) + '\n'));
  r = run();
  const ic = rows().at(-1).idle_capacity;
  assert.deepEqual([ic.kind, ic.alarm, ic.live, ic.cap, ic.empty], ['empty', true, 2, 20, 18]);
  assert.ok(ic.min >= 40);
  assert.ok(r.found.some((x) => /^IDLE CAPACITY: 2 job sessions live of the cap 20, 0 startable, for 4\d min; 18 empty slots: 18 x no startable work$/.test(x)));
  assert.ok(r.todo.some((x) => /^IDLE CAPACITY to the coordinator: send_message to session_coord1 with "IDLE CAPACITY: /.test(x)));
  assert.ok(r.todo.some((x) => /^wake BOB with one message: .*IDLE CAPACITY, 18 slots empty, 0 startable: run node \S+ job start --ready/.test(x)));
  assert.equal(readState(root, SB, HOLDS_FILE), null);
});

test('flow: velocity reads the tranche\'s first-parent commits, never a job branch\'s own commit merged later', () => {
  const root = makeRepo({ 'README.md': 'x', 'build/requirements/a.md': '- **R1** *(not yet met: x)* one\n- **R2** *(not yet met: x)* two\n' });
  const env = (d) => ({ env: { GIT_COMMITTER_DATE: d, GIT_AUTHOR_DATE: d }, cwd: root });
  git(['commit', '-q', '--amend', '--no-edit'], env('2026-11-04T09:00:00Z'));
  git(['checkout', '-q', '-b', 'job/a'], { cwd: root });
  writeFileSync(join(root, 'build/requirements/a.md'), '- **R1** one\n- **R2** two\n');
  git(['commit', '-q', '-am', 'meet R1 R2'], env('2026-11-04T10:00:00Z'));
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['merge', '-q', '--no-ff', '-m', 'merge', 'job/a'], env('2026-11-04T12:00:00Z'));
  const u = unmetAtRef(root, { requirements_dir: 'build/requirements' }, 'main');
  assert.deepEqual([u('2026-11-04T11:00:00Z'), u('2026-11-04T12:30:00Z'), u('2026-11-04T08:00:00Z')], [2, 0, null]);
});

test('flow: cap use beside velocity, efficiency and quality, whole and by concurrency bucket', () => {
  const at = (h) => new Date(Date.parse('2026-11-04T00:00:00Z') + h * 36e5).toISOString();
  const sweeps = [
    { row: 'sweep', at: at(-1), live: 20, job_cap: 20 }, // before the window: holds from its start
    { row: 'sweep', at: at(1), live: 6, job_cap: 20, idle_capacity: { alarm: true, min: 50 } },
    { row: 'sweep', at: at(3), live: 10, live_cap: 20, idle_capacity: { alarm: true, min: 170 } },
    { row: 'sweep', at: at(4), job_cap: 20 }, // unmeasured live: skipped
    { row: 'check', at: at(3.1), live: 10, job_cap: 20, idle_capacity: { alarm: true, min: 176 } }, // a tool-run check in the same stretch
  ];
  sweeps[2].idle_capacity.since = sweeps[4].idle_capacity.since = at(0.2);
  // Unmet marks at each hour: 30 at 0, 20 at 1, 18 at 3, 14 at 4 (a split adding met marks changes none).
  const unmet = { 0: 30, 1: 20, 3: 18, 4: 14 };
  const unmetAt = (iso) => unmet[(Date.parse(iso) - Date.parse(at(0))) / 36e5] ?? null;
  const rows = [
    { row: 'merge', pr: 1, at: at(0.5) }, { row: 'merge', pr: 1, at: at(0.6) }, { row: 'merge', pr: 2, at: at(2) }, { row: 'merge', pr: 3, at: at(3.5) },
    { row: 'attempt', event: 'complete', attempt: 1, pr: 2, at: at(1.5) }, { row: 'attempt', event: 'complete', attempt: 1, pr: 3, at: at(3.2) },
    { row: 'attempt', event: 'start', reopen: 'meet the unmet requirement marks R1, R4 and the found marks F2', at: at(2.5) },
  ];
  const gates = (pr) => (pr === 2 ? [{ receipt_attempt: 1, suite: 'fail' }, { receipt_attempt: 1, suite: 'pass' }] : [{ receipt_attempt: 1, suite: 'pass' }]);
  const f = flowFigures({ sweeps, rows, unmetAt, gates, syncs: 6, reverts: 1, from: at(0), to: at(4) });
  // 20x1 + 6x2 + 10x1 = 42 of 80 job session-hours; 16 marks net over 4 h; 3 merges over 42 h.
  assert.deepEqual([f.cap_use, f.velocity_per_h, f.merges_per_job_session_h, f.hours], [0.53, 4, 0.07, 4]);
  assert.deepEqual([f.gate_runs_per_pr, f.syncs_per_pr, f.false_done_share, f.reopened_marks, f.reverts, f.idle_alarms], [1.33, 2, 0.5, 3, 1, 2]);
  assert.match(f.cancels_per_pr, /^unmeasured/);
  // Every figure with a time, by bucket: 6-10 holds hours 1 to 4, 16-20 hour 0 to 1.
  assert.deepEqual(f.buckets, [
    { live: '6-10', hours: 3, cap_use: 0.37, velocity_per_h: 2, merges_per_job_session_h: 0.09, gate_runs_per_pr: 1.5, false_done_share: 0.5, reopened_marks: 3 },
    { live: '16-20', hours: 1, cap_use: 1, velocity_per_h: 10, merges_per_job_session_h: 0.05, gate_runs_per_pr: 1, false_done_share: 'unmeasured', reopened_marks: 0 },
  ]);
  assert.equal(flowFigures({ from: at(0), to: at(4) }).cap_use, 'unmeasured');
  assert.equal(flowFigures({ sweeps, from: at(0), to: at(4) }).velocity_per_h, 'unmeasured');
});
