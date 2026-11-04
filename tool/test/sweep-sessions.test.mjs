// The session list kept clean (Bob, 4 Nov 15:50): sweep --sessions archives leftovers and passes
// on orphaned questions; never a role's session nor one of an open job.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeRepo } from './helpers.mjs';
import { recordStart } from '../lib/roles.mjs';
import { sweep } from '../lib/sweep.mjs';
import { sessionActs } from '../lib/status.mjs';
import { git } from '../lib/util.mjs';

const NOW = Date.parse('2026-11-04T15:50:00Z');
const at = (hhmm) => `2026-11-04T${hhmm}:00Z`;
const roles = { root: { session: 'session_ROOT' }, bob: { session: 'session_BOB' }, watcher: { session: 'session_WATCH' } };
const C = 'session_COORD';
const s = (id, title, updated, o = {}) => ({ id, title, status: 'idle', updated_at: at(updated), ...o });
const merged = (id) => ({ id, tranche: 'COMPLETE', pr: 'merged' });
const working = (id) => ({ id, tranche: 'WORKING', branch: 'WORKING', pr: '#9 draft' });
const acts = (list, o = {}) => sessionActs(list, { rows: [], roles, coordinator: C, now: NOW, ...o });

// The 17 unarchived sessions measured at 15:50, plus the two archived parents the leftovers name.
const ROWS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map(working).concat(['ai-catalogue', 'screens-action', 'store-request'].map(merged));
const FIXTURE = [
  s(C, 'coordinator', '15:40', { status: 'running' }),
  s('session_BOB', 'BOB', '15:45'),
  s('session_ROOT', 'ROOT', '15:00'),
  s('session_WATCH', 'watcher', '06:00'),
  s('session_b1', 'build sweep-sessions', '15:49', { status: 'running', parent: C }),
  s('session_b2', 'build gate-dependants', '15:30', { parent: C }),
  ...['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map((m, i) => s(`session_j${i}`, `job ${m}`, i < 3 ? '15:20' : '12:00', { parent: 'session_BOB', ...(i === 5 ? { status_category: 'need_input' } : {}) })),
  s('session_pin1', 'pin move 0123456789', '04:10', { parent: 'session_oldC', status_category: 'need_input' }),
  s('session_pin2', 'pin move abcdef0123', '04:10', { parent: 'session_oldC' }),
  s('session_ai', 'job ai-catalogue', '02:36', { parent: 'session_oldBOB', status_category: 'need_input' }),
  s('session_sa', 'job screens-action (restart)', '04:17', { parent: 'session_oldBOB', status_category: 'need_input' }),
  s('session_sr', 'job store-request', '13:00', { parent: 'session_BOB' }),
  s('session_oldBOB', 'BOB', '02:00', { status: 'archived' }),
  s('session_oldC', 'coordinator', '03:00', { status: 'archived' }),
];

test('the 15:50 list: exactly the 5 leftovers archived, nothing else; one line by kind', () => {
  const r = acts(FIXTURE, { rows: ROWS, pinOpen: false });
  assert.deepEqual(r.acts.map((a) => `${a.act} ${a.id}`).sort(), ['archive session_ai', 'archive session_pin1', 'archive session_pin2', 'archive session_sa', 'archive session_sr']);
  assert.equal(r.line, 'sessions: 17 live (roles 4, jobs 9, builds 2, other 2); leftovers 5');
});

test('never: a role session, a job still open, a pin move while one is open or unknown, a busy or recent session', () => {
  const old = 'session_old';
  const list = [s(old, 'old', '01:00', { status: 'archived' }),
    ...['session_ROOT', 'session_BOB', 'session_WATCH', C].map((id) => s(id, 'role', '01:00', { parent: old })),
    s('session_open', 'job m1', '01:00', { parent: old }),
    s('session_unlisted', 'job nowhere', '01:00'),
    s('session_pin', 'pin move 0123456789', '01:00'),
    s('session_busy', 'job done', '01:00', { status: 'running', parent: old }),
    s('session_new', 'job done', '15:00', { parent: old })];
  for (const pinOpen of [true, null]) assert.deepEqual(acts(list, { rows: [working('m1'), merged('done')], pinOpen }).acts, []);
  // A job reopened (WORKING on its branch, its draft open) is not done, though COMPLETE on the tranche.
  assert.deepEqual(acts([s('session_x', 'job r', '01:00')], { rows: [{ id: 'r', tranche: 'COMPLETE', branch: 'WORKING', pr: '#3 draft' }] }).acts, []);
});

test('archive: a deferred job; any idle session whose parent is archived and that is not asking', () => {
  const list = [s('session_old', 'x', '01:00', { status: 'archived' }), s('session_d', 'job d', '10:00'), s('session_o', 'something', '10:00', { parent: 'session_old' })];
  assert.deepEqual(acts(list, { rows: [{ id: 'd', tranche: 'BLOCKED', blocked: 'deferred' }] }).acts.map((a) => a.id), ['session_d', 'session_o']);
});

test('tell: an orphan asking, its work not done, goes to its live owner with its question', () => {
  const list = [s('session_old', 'x', '01:00', { status: 'archived' }),
    s('session_j', 'job m1', '10:00', { parent: 'session_old', status_category: 'need_input', summary: 'Which  route?' }),
    s('session_b', 'build y', '10:00', { parent: 'session_old', post_turn_summary: { status_category: 'need_input' } })];
  const r = acts(list, { rows: [working('m1')] });
  assert.deepEqual(r.acts.map((a) => [a.act, a.id, a.owner, a.question]), [
    ['tell', 'session_j', 'session_BOB', 'Which route?'],
    ['tell', 'session_b', C, '(read its last message with list_events)']]);
});

test('sweep --sessions: prints each act, the line in found, and counts live from the list', () => {
  const root = makeRepo({ 'README.md': 'x', 'process/config.json': { tranche: 'tranche', coordinator: C } });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  recordStart(root, 'root', 'session_ROOT', { log: () => {} });
  recordStart(root, 'bob', 'session_BOB', { log: () => {} });
  const file = join(root, '..', `sessions-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify({ data: [
    s('session_ROOT', 'ROOT', '01:00'), s('session_gone', 'x', '01:00', { status: 'archived' }),
    s('session_o', 'stray', '01:00', { updated_at: '2026-01-01T00:00:00Z', parent: 'session_gone' }),
    s('session_q', 'build z', '01:00', { updated_at: '2026-01-01T00:00:00Z', parent: 'session_gone', status_category: 'need_input', summary: 'merge now?' })] }));
  const out = [];
  const r = sweep(root, { session: 'session_ROOT', sessions: file, offline: true, log: (l) => out.push(l) });
  assert.ok(r.found.includes('live 3 of 24'));
  assert.ok(r.found.includes('sessions: 3 live (roles 1, jobs 0, builds 1, other 1); leftovers 2'));
  assert.ok(r.todo.some((t) => /^archive session_o: archive_session session_o/.test(t)));
  assert.ok(r.todo.some((t) => t.startsWith(`tell ${C} session_q asks: merge now? (send it to ${C}`)));
  assert.throws(() => sweep(root, { session: 'session_ROOT', sessions: true, offline: true, log: () => {} }), /--sessions <file>/);
});
