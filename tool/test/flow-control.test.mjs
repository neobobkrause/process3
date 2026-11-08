// Flow control (Bob, 5 Nov, Build Plan R10; as the coordinator's audit of PR 140 set it): the cap
// checked on a single start; working against waiting sessions; the release path tagged in next
// work; and a fault injection found by the next tool run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { entry, makeRepo, openPassed, setJobCap } from './helpers.mjs';
import { capCheck } from '../lib/cap.mjs';
import { hold } from '../lib/hold.mjs';
import { fetchState, jsonl, readState, writeState } from '../lib/state.mjs';
import { flow, status } from '../lib/status.mjs';
import { CHECK_MIN, SWEEP_ROWS_FILE, beforeAct, idleCheck, senderFor } from '../lib/sweep.mjs';
import { main } from '../p3.mjs';
import { git, loadConfig as loadCfg } from '../lib/util.mjs';

const SB = 'process-state';
const quiet = () => {};
// GitHub as the idle check reads it (once): no open pull requests.
const GH = { slug: 'o/r', openPRs: () => [], checkRun: () => null, comments: () => [], prFiles: () => [] };
const unmet = (n) => Array.from({ length: n }, (_, i) => `- **R${i + 1}** *(not yet met: x)* text`).join('\n') + '\n';
const ago = (min, t = Date.now()) => new Date(t - min * 6e4).toISOString();

// A product: layer 1 closed by its marks, layer 2's three OPEN entries never started.
function product(files = {}) {
  const root = makeRepo({
    'build/layers.md': '| Layer | Modules |\n|---|---|\n| 1 | `done` |\n| 2 | `a`, `b`, `c` |\n',
    'process/config.json': JSON.stringify({ coordinator: 'session_coord1' }),
    'build/requirements/done.md': '# done\n',
    'process/ledger/done.json': entry('done', { requirements: 'build/requirements/done.md', layer: 1, status: { state: 'COMPLETE' } }),
    ...Object.fromEntries(['a', 'b', 'c'].flatMap((id) => [[`build/requirements/${id}.md`, unmet(1)], [`process/ledger/${id}.json`, entry(id, { requirements: `build/requirements/${id}.md`, layer: 2 })]])),
    ...files,
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  openPassed(root);
  git(['push', '-q', 'origin', `refs/remotes/origin/${SB}:refs/heads/${SB}`], { cwd: root });
  // Layer 1 closed by layer close, nothing deferred: layer 2 is the open layer.
  writeState(root, SB, 'closed', (d) => { mkdirSync(join(d, 'layers'), { recursive: true }); writeFileSync(join(d, 'layers/closed.jsonl'), JSON.stringify({ row: 'closed', tranche: 'tranche', layer: 1, commit: git(['rev-parse', 'HEAD'], { cwd: root }), deferred: [] }) + '\n'); });
  return root;
}
const sweepRows = (root) => { fetchState(root, SB, { fresh: true }); return jsonl(readState(root, SB, SWEEP_ROWS_FILE)); };
const addRow = (root, row) => writeState(root, SB, 'row', (dir) => { git(['-C', dir, 'status'], { allowFail: true }); writeFileSync(join(dir, SWEEP_ROWS_FILE), (readState(root, SB, SWEEP_ROWS_FILE) || '') + JSON.stringify(row) + '\n'); });

test('job start <id> checks the cap: --sessions required (C28: never a typed --live), the cap less slot holds', (t) => {
  setJobCap(t, 4);
  const root = product();
  const listed = (n) => { const f = join(mkdtempSync(join(tmpdir(), 'p3-sessions-')), 's.json'); writeFileSync(f, JSON.stringify(Array.from({ length: n }, (_, i) => ({ id: `session_j${i}`, title: `job j${i}`, session_status: 'SESSION_STATUS_RUNNING' })))); return f; };
  assert.throws(() => capCheck(root, {}), /job start <id> --sessions <file>/);
  assert.throws(() => capCheck(root, { live: '3' }), /--live 3 is not taken/);
  assert.equal(capCheck(root, { sessions: listed(3) }).n, 3);
  assert.throws(() => capCheck(root, { sessions: listed(4) }), /the job cap is full: 4 job sessions working of the cap 4 \(4 live\); nothing was started/);
  hold(root, 'slots:1', { why: 'rehearsal', by: 'session_x1', until: '30m', log: quiet });
  assert.throws(() => capCheck(root, { sessions: listed(3) }), /3 job sessions working of the cap 4 less 1 held \(3 live\)/);
});

test('flow: with slots free, the requirement files over the cap are named as BOB\'s split acts that would open them', (t) => {
  setJobCap(t, 20);
  const over = { file: 'r/big.md', count: 9, over: 'split or consolidate before its job: r/big.md 90000 over 70000' };
  const one = { file: 'r/a.md', count: 1, module: 'a', entry_state: 'OPEN' };
  const view = { kind: 'open', n: 2, startable: [{ id: 'a' }] };
  const f = flow({}, [], [one, over], 6, null, [], { view });
  assert.deepEqual(f.splits_owed, ['r/big.md']);
  assert.match(f.line, /startable 1, blocked 0; \d+ slots free: BOB's split acts would open them \(split or consolidate: r\/big\.md\)$/);
  const full = flow({}, [], [one, over], 19, null, [], { view });
  assert.equal(full.splits_owed, undefined, 'no free slot: no split line');
  assert.doesNotMatch(full.line, /split/);
});

test('flow: working and waiting add up to every unarchived job session the cap counts: another product\'s, and an older one beside its latest', () => {
  const s = (id, title, st, at) => ({ id, title, session_status: st, updated_at: at });
  const listed = [s('s1', 'job a', 'running', '2026-11-05T04:00:00Z'), s('s2', 'job a (restart)', 'idle', '2026-11-05T04:10:00Z'), s('s3', 'job zz', 'idle', '2026-11-05T04:00:00Z'), s('s4', 'job b', 'idle', '2026-11-05T04:00:00Z'), s('s5', 'job c', 'archived', '2026-11-05T04:00:00Z'), s('s6', 'BOB', 'running', '2026-11-05T04:00:00Z')];
  const rows = [{ id: 'a', tranche: 'OPEN', branch: 'WORKING' }, { id: 'b', tranche: 'COMPLETE', pr: 'merged' }];
  const f = flow({}, rows, [], 4, listed);
  assert.equal(f.working + f.waiting, 4);
  assert.match(f.line, /\(working 1, waiting 3: a BOB, zz not this product's, b archive\)/);
});

test('next work tags the release path (layer work, release_path) and debt (every unmet mark a base-red found mark)', () => {
  const root = product({
    'process/config.json': JSON.stringify({ release_path: ['solo'] }),
    'build/requirements/c.md': '- **F1** *(not yet met: base-red gate run 12)* x\n',
    'process/found/solo.md': '- **F1** *(not yet met: walk)* y\n',
  });
  const out = status(root, { role: 'bob', offline: true, heads: new Set(), log: quiet });
  const by = Object.fromEntries(out.next.filter((y) => y.module).map((y) => [y.module, [!!y.release, !!y.debt]]));
  assert.deepEqual([by.a, by.b, by.c], [[true, false], [true, false], [false, true]]);
});

test('working against waiting: each open job\'s session running or idle, and what an idle one waits on', (t) => {
  setJobCap(t, 20);
  const rows = [
    { id: 'a', tranche: 'OPEN', branch: 'WORKING' }, { id: 'b', tranche: 'OPEN', branch: 'COMPLETE', ready: true, gate: 'pending' },
    { id: 'c', tranche: 'OPEN', branch: 'COMPLETE', ready: true, gate: 'success' }, { id: 'd', tranche: 'BLOCKED', branch: 'BLOCKED' }, { id: 'e', tranche: 'OPEN', branch: 'WORKING' },
  ];
  const s = (id, st) => ({ id: `session_${id}`, title: `job ${id}`, session_status: `SESSION_STATUS_${st}`, updated_at: ago(1) });
  const f = flow({ targets: {} }, rows, [], 5, [s('a', 'RUNNING'), s('b', 'IDLE'), s('c', 'IDLE'), s('d', 'IDLE'), s('e', 'IDLE')]);
  assert.deepEqual([f.working, f.waiting], [1, 4]);
  assert.match(f.line, /^flow: live 5\/20 \((default|P3_JOB_CAP)\) \(working 1, waiting 4: b gate, c merge, d block, e BOB\), startable 0/);
});

// Fault injection 3: an unanswered BLOCKED job: its idle session is counted waiting on its block in
// the flow line (and the sweep's ruling owed stands as before); ruled, it waits no more.
test('fault injection: an unanswered BLOCKED job shows as a session waiting on its block, and no more once ruled', (t) => {
  setJobCap(t, 6);
  const s = { id: 'session_q', title: 'job q', session_status: 'SESSION_STATUS_IDLE', updated_at: ago(40) };
  const blocked = flow({ targets: { decision_minutes: 30 } }, [{ id: 'q', tranche: 'BLOCKED', since: ago(40) }], [], 1, [s]);
  assert.match(blocked.line, /waiting 1: q block\), startable 0, blocked 1 \(oldest 40 min\)/);
  const ruled = flow({ targets: { decision_minutes: 30 } }, [{ id: 'q', tranche: 'OPEN', branch: 'WORKING' }], [], 1, [{ ...s, session_status: 'SESSION_STATUS_RUNNING' }]);
  assert.match(ruled.line, /working 1, waiting 0\), startable 0, blocked 0/);
});
