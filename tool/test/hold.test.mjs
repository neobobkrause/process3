// Holds and idle capacity (Bob, 5 Nov: a spoken "about 6 job sessions at most" held BOB near 6 of
// 20 for about 6 hours and nothing in Process3 saw it; cap use about 48% over a day).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeRepo, setJobCap } from './helpers.mjs';
import { HOLDS_FILE, hold, holdLines, holdsOf } from '../lib/hold.mjs';
import { capUse } from '../lib/metrics.mjs';
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
  // Over two hours, or more than a quarter of the cap (a layer counts its modules): Bob's alone.
  for (const [scope, until] of [['slots:2', '3h'], ['slots:6', '30m'], ['layer:2', '30m']]) {
    assert.throws(() => hold(root, scope, { why: 'x', by: S, until, log: quiet }), /refused: a hold .* only Bob can set: his own commit through GitHub's website/);
  }
  assert.throws(() => hold(root, 'slots:1', { why: 'x', by: 'bob', until: '10m', log: quiet }), /--by bob only with --word/);
  assert.throws(() => hold(root, 'room:1', { why: 'x', by: S, until: '10m' }), /module:<id>, layer:<n> or slots:<n>/);
  assert.throws(() => hold(root, 'slots:1', { why: 'x', by: S, until: ago(1) }), /a future time/);
  assert.throws(() => hold(root, 'slots:1', { why: 'x', by: 'me', until: '10m' }), /--by <your session id/);
});

test('hold: Bob\'s word is his own verified website commit whose message names the hold; his hold only expires', (t) => {
  setJobCap(t, 20);
  const root = withOrigin();
  const date = new Date(Date.now() + 6e4).toISOString(); // the word given just now
  const web = (message, login = 'neobobkrause') => () => ({ author: { login }, committer: { login: 'web-flow' }, commit: { message, committer: { date }, verification: { verified: true } } });
  const set = (scope, until, message, word = 'abc', login) => hold(root, scope, { why: 'budget', by: 'bob', until, word, io: { lookup: web(message, login) }, log: quiet });
  assert.throws(() => set('slots:10', '4h', 'hold slots:10 4h', 'abc', 'someone'), /abc is not \(author someone/);
  assert.throws(() => set('slots:10', '4h', 'hold slots:9 4h'), /message does not name it/);
  assert.throws(() => set('slots:6', '4h', 'hold slots:60 4h'), /message does not name it/); // the exact scope, not a prefix
  assert.throws(() => set('slots:10', '4h', 'hold slots:10'), /message does not name it/); // a time is part of his word
  assert.throws(() => set('slots:10', '5h', 'hold slots:10 4h.'), /--until is past the 4h his word gives/);
  const r = set('slots:10', '4h', 'hold slots:10 4h for the budget review', 'abc1234567890');
  assert.throws(() => set('slots:10', '1h', 'hold slots:10 4h for the budget review', 'abc1234567890'), /abc1234567890 already set a hold/);
  assert.equal(r.word, 'abc1234567890');
  assert.match(lines(root)[1], /^- hold-1 slots:10, by bob \(Bob's word abc1234567\)/);
  assert.throws(() => hold(root, undefined, { end: 'hold-1', by: S }), /Bob's hold; only Bob ends it/);
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

test('cap use: job session-hours over cap session-hours in the window, beside 85%, with the alarms', () => {
  const at = (h) => new Date(Date.parse('2026-11-04T00:00:00Z') + h * 36e5).toISOString();
  const rows = [
    { row: 'sweep', at: at(-1), live: 20, job_cap: 20 }, // before the window: holds from its start
    { row: 'sweep', at: at(1), live: 6, job_cap: 20, idle_capacity: { alarm: true, min: 50 } },
    { row: 'sweep', at: at(3), live: 10, live_cap: 20, idle_capacity: { alarm: true, min: 170 } },
    { row: 'sweep', at: at(4), job_cap: 20 }, // unmeasured live: skipped
  ];
  const u = capUse(rows, at(0), at(4));
  // 20x1 + 6x2 + 10x1 = 42 of 80.
  assert.deepEqual([u.job_session_h, u.cap_session_h, u.use, u.target, u.idle_alarms, u.idle_longest_min], [42, 80, 0.525, 0.85, 2, 170]);
  assert.equal(capUse([], at(0)).use, 'unmeasured');
});
