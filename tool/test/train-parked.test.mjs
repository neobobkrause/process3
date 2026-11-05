// Jobs parked in the merge train (build train-robust, items 4 and 5; the coordinator, 5 Nov): the
// IDLE CAPACITY alarm listed modules whose open attempt is a ready pull request with a green gate,
// sitting in the train (interface-assets 443, question-explorer 346, agent-worker 364,
// answer-envelope 386, ai-catalogue 484), as "its attempt is open: status says what it needs"
// against an empty slot; and the cap and the alarm counted their idle sessions as live work
// (BOB archived them to free slots). They are named in the train with their PRs, and their idle
// sessions are not counted.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { entry, makeRepo, openPassed, setJobCap } from './helpers.mjs';
import { startReady, startable } from '../lib/ready.mjs';
import { writeState } from '../lib/state.mjs';
import { flow, inTrain, parkedSessions, status } from '../lib/status.mjs';
import { SWEEP_ROWS_FILE, idleCapacity, idleCheck, markInTrain, overCapOwed } from '../lib/sweep.mjs';
import { git, loadConfig } from '../lib/util.mjs';

const SB = 'process-state';
const quiet = () => {};
const unmet = (n) => Array.from({ length: n }, (_, i) => `- **R${i + 1}** *(not yet met: x)* text`).join('\n') + '\n';
const ago = (min) => new Date(Date.now() - min * 6e4).toISOString();

// Layer 1 closed; layer 2's a, b and c have unmet marks; a's pull request is in the train.
function product(files = {}, layers = '') {
  const root = makeRepo({
    'build/layers.md': '| Layer | Modules |\n|---|---|\n| 1 | `done` |\n| 2 | `a`, `b`, `c` |\n' + layers,
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
  writeState(root, SB, 'closed', (d) => { mkdirSync(join(d, 'layers'), { recursive: true }); writeFileSync(join(d, 'layers/closed.jsonl'), JSON.stringify({ row: 'closed', tranche: 'tranche', layer: 1, commit: git(['rev-parse', 'HEAD'], { cwd: root }), deferred: [] }) + '\n'); });
  return root;
}
const ROWS = [
  { id: 'done', tranche: 'COMPLETE', req: 'build/requirements/done.md', pr: 'merged' },
  { id: 'a', tranche: 'OPEN', req: 'build/requirements/a.md', branch: 'COMPLETE', ahead: 3, pr: '#443 ready', ready: true, gate: 'success' },
  { id: 'b', tranche: 'OPEN', req: 'build/requirements/b.md' },
  { id: 'c', tranche: 'OPEN', req: 'build/requirements/c.md', branch: 'COMPLETE', ahead: 2, pr: '#9 ready', ready: true, gate: 'pending' },
];
const sess = (id, st, title = `job ${id}`) => ({ id: `session_${id}`, title, session_status: `SESSION_STATUS_${st}`, updated_at: ago(1) });

// As the idle check reads them, offline (copy, 5 Nov): a reopened module, its entry COMPLETE on
// the tranche, commits on its branch, its pull request not read.
const OFFLINE = [
  { id: 'a', tranche: 'COMPLETE', req: 'build/requirements/a.md', branch: 'COMPLETE', ahead: 3, pr: 'unknown (GitHub not read)' },
  { id: 'c', tranche: 'COMPLETE', req: 'build/requirements/c.md', branch: 'COMPLETE', ahead: 2, pr: 'unknown (GitHub not read)' },
];
const NEXT = [
  { file: 'build/requirements/a.md', count: 1, module: 'a', entry_state: 'COMPLETE', attempt_open: true, marks: ['R1'] },
  { file: 'build/requirements/b.md', count: 1, module: 'b', entry_state: 'OPEN', marks: ['R1'] },
  { file: 'build/requirements/c.md', count: 1, module: 'c', entry_state: 'COMPLETE', attempt_open: true, marks: ['R1'] },
];
const gh = () => ({
  slug: 'o/r',
  openPRs: () => [
    { number: 443, draft: false, head: { ref: 'job/a', sha: 'a1' }, base: { ref: 'tranche' } },
    { number: 9, draft: false, head: { ref: 'job/c', sha: 'c1' }, base: { ref: 'tranche' } },
  ],
  checkRun: (slug, sha) => ({ conclusion: sha === 'a1' ? 'success' : null, status: sha === 'a1' ? 'completed' : 'in_progress' }),
});

test('item 4: a module whose attempt is a ready pull request with a green gate is "in the train (PR n)", not startable and not a reason a slot is empty', (t) => {
  assert.equal(inTrain(ROWS[1]), 443);
  assert.equal(inTrain(ROWS[3]), null, 'gate not green: not in the train');
  assert.equal(inTrain({ ...ROWS[1], flag: 'BLOCKED' }), null, 'flagged: not in the train');
  assert.equal(inTrain({ ...ROWS[1], pr: '#443 draft', ready: false }), null);
  const next = NEXT.map((x) => ({ ...x }));
  assert.equal(markInTrain(null, { tranche: 'tranche' }, next, OFFLINE, { io: gh() }), 1);
  assert.deepEqual(next.map((x) => x.in_train), [443, undefined, undefined]);
  const flagged = NEXT.map((x) => ({ ...x }));
  assert.equal(markInTrain(null, { tranche: 'tranche' }, flagged, OFFLINE.map((r) => ({ ...r, flag: 'BLOCKED' })), { io: gh() }), 0, 'a flagged attempt is not the train\'s');
  const s = startable(next);
  assert.deepEqual(s.go.map((x) => x.id), ['b']);
  assert.deepEqual(s.skip.map((x) => [x.id, x.why]), [['a', 'in the train (PR 443)'], ['c', 'its attempt is open: status says what it needs']]);
  const ic = idleCapacity({ live: 6, cap: 10, holds: [], work: next, startable: 1, layers: new Map(), freed: Date.now() - 60 * 6e4 });
  assert.deepEqual(ic.reasons, ['1 x startable, not started', 'c: its attempt is open: status says what it needs', '2 x no startable work', 'in the train, not startable: a PR 443']);
  assert.deepEqual(ic.in_train, [{ id: 'a', pr: 443 }]);
  // The idle check itself, as the copy's ran (offline status, a measured live count).
  setJobCap(t, 10);
  const root = product();
  const cfg = { ...loadConfig(root), plan: 'run' };
  writeState(root, SB, 'row', (d) => { mkdirSync(join(d, 'metrics'), { recursive: true }); writeFileSync(join(d, SWEEP_ROWS_FILE), JSON.stringify({ at: ago(30), row: 'ready', live: 6, job_cap: 10, started: [] }) + '\n'); });
  const out = [];
  idleCheck(root, cfg, { by: 'send', t: Date.now() + 20 * 6e4, io: gh(), read: () => ({ open: { state: 'open' }, rows: OFFLINE, next: NEXT.map((x) => ({ ...x })), holds: [] }), log: (l) => out.push(l) });
  const line = out.find((l) => /^IDLE CAPACITY/.test(l));
  assert.ok(line, out.join('\n'));
  assert.match(line, /in the train, not startable: a PR 443$/);
  assert.doesNotMatch(line, /a: its attempt is open/);
});

test('item 5: the cap and the alarm count job sessions doing work: an idle session parked in the train is not counted; a running one is', (t) => {
  const listed = [sess('a', 'IDLE'), sess('b', 'RUNNING'), sess('c', 'IDLE')];
  assert.deepEqual(parkedSessions(listed, ROWS), [{ id: 'a', pr: 443, session: 'session_a' }]);
  assert.deepEqual(parkedSessions([sess('a', 'RUNNING')], ROWS), [], 'running: working');
  assert.deepEqual(parkedSessions([sess('a', 'ARCHIVED')], ROWS), [], 'archived: not live at all');
  setJobCap(t, 20);
  assert.match(flow({}, ROWS, [], 2, listed).line, /\(working 1, waiting 2: a merge, c gate; 1 parked in the train, not counted\)/);
  // job start --ready: cap 3, three job sessions listed, one parked: one slot to start b in.
  setJobCap(t, 3);
  const root = product();
  const file = join(mkdtempSync(join(tmpdir(), 'p3-sessions-')), 's.json');
  writeFileSync(file, JSON.stringify({ data: listed }));
  const next = [{ file: 'build/requirements/b.md', count: 1, module: 'b', entry_state: 'OPEN' }];
  const lines = [];
  const started = [];
  startReady(root, { sessions: file, remote: new Set(), read: () => ({ next, rows: ROWS }), start: (_, id) => { started.push(id); return {}; }, setup: () => ({ ok: true, missing: [] }), fetch: () => {}, log: (l) => lines.push(l) });
  assert.deepEqual(started, ['b']);
  assert.ok(lines.includes('1 job session parked in the train (ready, gate green, idle) not counted against the cap: a PR 443'));
});

test('review: the sweep\'s over-cap owed line is judged on working sessions: gone when they fit, else naming them', () => {
  const line = '7 job sessions, over the job cap of 6: archive finished ones before starting more';
  assert.deepEqual(overCapOwed([line, 'x'], 5, 2, 6), ['x']);
  assert.deepEqual(overCapOwed([line], 7, 1, 6), ['7 working job sessions (1 more parked in the train), over the job cap of 6: archive finished ones before starting more']);
  assert.deepEqual(overCapOwed(['x'], 9, 1, 6), ['x']);
});

test('item 7: a module after the open layer with unmet marks and no ledger entry is named "no ledger entry: cannot start" with its count, in status and the idle-capacity line', () => {
  const root = product({
    'build/requirements/x.md': unmet(2),
    'build/requirements/y.md': unmet(1),
    'process/ledger/y.json': entry('y', { requirements: 'build/requirements/y.md', layer: 3 }),
    'build/requirements/z.md': '# z\n',
  }, '| 3 | `x`, `y`, `z` |\n');
  const lines = [];
  const out = status(root, { role: 'bob', offline: true, heads: new Set(), log: (l) => lines.push(l) });
  assert.ok(lines.includes('- x (layer 3): no ledger entry: cannot start; 2 unmet marks'), lines.join('\n'));
  assert.ok(!lines.some((l) => /^- [yz] \(layer 3\): no ledger entry/.test(l)), 'y has its entry; z has no unmet marks');
  assert.deepEqual(out.next.noEntry, [{ id: 'x', file: 'build/requirements/x.md', layer: 3, count: 2 }]);
  assert.ok(!out.next.some((w) => w.file === 'build/requirements/x.md'), 'never listed as work');
  const ic = idleCapacity({ live: 1, cap: 10, holds: [], work: out.next, startable: 3, layers: new Map(), freed: Date.now() - 60 * 6e4 });
  assert.ok(ic.reasons.includes('no ledger entry, cannot start: x (2 unmet)'), ic.reasons.join(' | '));
  assert.deepEqual(ic.no_entry, [{ id: 'x', count: 2 }]);
});
