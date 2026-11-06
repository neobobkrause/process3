// Build Plan Phase 3: a layer ready to close, layer close, and the next layer (INT-4, ARC-4).
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { CLOSED_FILE, status } from '../lib/status.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo, openPassed } from './helpers.mjs';

const quiet = () => {};
const unmet = (n) => Array.from({ length: n }, (_, i) => `- **R${i + 1}** *(not yet met: x)* text`).join('\n') + '\n- **R99** met\n';
const LAYERS = '| layer | what | modules |\n|---|---|---|\n| 1 | first | a, b |\n| 2 | next | d |\n';
const done = (id) => entry(id, { requirements: `build/requirements/${id}.md`, status: { state: 'COMPLETE' } });
const base = {
  'build/layers.md': LAYERS,
  'build/requirements/a.md': unmet(2),
  'build/requirements/b.md': unmet(0),
  'build/requirements/d.md': unmet(1),
  'process/ledger/a.json': done('a'),
  'process/ledger/b.json': done('b'),
};

// The state branch, as origin's copy, holding the given closed rows.
function closedOn(root, rows) {
  git(['checkout', '-q', '--orphan', 's'], { cwd: root });
  git(['rm', '-rqf', '.'], { cwd: root });
  commit(root, { [CLOSED_FILE]: rows.map((r) => JSON.stringify({ row: 'closed', tranche: 'tranche', ...r })).join('\n') + '\n' });
  git(['update-ref', 'refs/remotes/origin/process-state', 'HEAD'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['branch', '-D', 's'], { cwd: root });
}

test('layer ready to close with marks left: no next work in it, and no train-era close line (layer merge closes a layer)', () => {
  const root = makeRepo(base);
  openPassed(root);
  const out = [];
  const r = status(root, { role: 'bob', offline: true, log: (m) => out.push(m) });
  assert.equal(r.layer.cur.n, 1);
  assert.equal(r.layer.ready, true);
  assert.deepEqual(r.next, []);
  assert.doesNotMatch(out.join('\n'), /ready to close|job start --ready|layer close/);
  assert.doesNotMatch(out.join('\n'), /next work/);
});

test('layer not ready while a module of it has an open job', () => {
  const root = makeRepo({ ...base, 'process/ledger/b.json': entry('b', { requirements: 'build/requirements/b.md' }) });
  const out = [];
  const r = status(root, { role: 'bob', offline: true, log: (m) => out.push(m) });
  assert.equal(r.layer.cur.n, 1);
  assert.equal(r.layer.ready, false);
  assert.doesNotMatch(out.join('\n'), /ready to close/);
});

test('a closed layer: the next layer is listed, its deferred marks shown and not listed as work', () => {
  const root = makeRepo(base);
  const tip = git(['rev-parse', 'HEAD'], { cwd: root });
  closedOn(root, [{ layer: 1, commit: tip, deferred: { a: ['R1', 'R2'] } }]);
  openPassed(root);
  const out = [];
  const r = status(root, { role: 'bob', offline: true, log: (m) => out.push(m) });
  assert.equal(r.layer.cur.n, 2);
  assert.deepEqual(r.next.map((x) => x.file), ['build/requirements/d.md']);
  assert.deepEqual(r.layer.deferred, [{ layer: 1, id: 'a', count: 2 }]);
  assert.match(out.join('\n'), /deferred at layer close \(not work\):\n- a \(layer 1\): 2\n/);
  assert.match(out.join('\n'), /next work, layer 2 .*\n- build\/requirements\/d\.md: 1 \(layer 2\)\nflow: live \?\/20 \(default\), startable 0, blocked 0$/);
  // A row whose commit is already on main (a tranche merged before) does not count.
  git(['update-ref', 'refs/remotes/origin/main', tip], { cwd: root });
  assert.equal(status(root, { role: 'bob', offline: true, log: quiet }).layer.cur.n, 1);
  // Online, GitHub's compare says whether it is on main (a shallow clone cannot): here it is not.
  git(['update-ref', '-d', 'refs/remotes/origin/main'], { cwd: root });
  git(['remote', 'add', 'origin', join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'p.git')], { cwd: root });
  const asked = [];
  const on = (ahead) => ({ openPRs: () => [], checkRun: () => null, compare: (s, b, h) => { asked.push([s, b, h]); return { ahead_by: ahead }; } });
  assert.equal(status(root, { role: 'bob', log: quiet, io: on(1) }).layer.cur.n, 2);
  assert.deepEqual(asked.at(-1).slice(1), ['main', tip]);
  assert.equal(status(root, { role: 'bob', log: quiet, io: on(0) }).layer.cur.n, 1);
});

function withOrigin(files) {
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  return { root, bare };
}
const io = { openPRs: () => [], checkRun: () => null, compare: () => null };
const PASS = "import test from 'node:test';\ntest('ok', () => {});\n";
const FAIL = "import test from 'node:test';\ntest('no', () => { throw new Error('x'); });\n";

// Measured 3 Nov on the copy: a layer-1 job BLOCKED by `job block` with a reason, its PR open.
const blocked = (reason) => ({ ...base, 'build/requirements/b.md': unmet(1), 'process/ledger/b.json': entry('b', { requirements: 'build/requirements/b.md', status: { state: 'BLOCKED', ...(reason ? { reason } : {}) } }) });
const prOpen = { openPRs: () => [{ number: 38, draft: false, head: { ref: 'job/b', sha: 'x' }, updated_at: '2026-11-03T00:00:00Z' }], checkRun: () => null, compare: () => null };

test('a module BLOCKED with no reason holds the layer, its PR closed or not', () => {
  const { root } = withOrigin(blocked(null));
  for (const io_ of [prOpen, io]) {
    const out = [];
    const r = status(root, { role: 'bob', log: (m) => out.push(m), io: io_ });
    assert.equal(r.layer.ready, false);
    assert.equal(r.layer.pending, false);
    assert.doesNotMatch(out.join('\n'), /ready to close/);
  }
});

test('BLOCKED with a reason on the job branch (as job block records it) defers the module', () => {
  const { root } = withOrigin({ ...blocked(null), 'process/ledger/b.json': entry('b', { requirements: 'build/requirements/b.md', status: { state: 'WORKING' } }) });
  git(['checkout', '-q', '-b', 'job/b', 'tranche'], { cwd: root });
  commit(root, { 'process/ledger/b.json': entry('b', { requirements: 'build/requirements/b.md', status: { state: 'BLOCKED', reason: 'why' } }) }, 'block b: why');
  git(['push', '-q', 'origin', 'job/b'], { cwd: root });
  const r = status(root, { role: 'bob', log: quiet, io: prOpen });
  assert.equal(r.layer.pending, true);
  assert.deepEqual(r.layer.owed.map((m) => [m.id, m.pr, m.blocked]), [['b', 38, 'why']]);
});

test('a deferred module: offline, its PR unread, the layer is held; its PR closed, no restart flag', () => {
  const { root } = withOrigin({ ...blocked(null), 'process/ledger/b.json': entry('b', { requirements: 'build/requirements/b.md', status: { state: 'WORKING' } }) });
  git(['checkout', '-q', '-b', 'job/b', 'tranche'], { cwd: root });
  commit(root, { 'process/ledger/b.json': entry('b', { requirements: 'build/requirements/b.md', status: { state: 'BLOCKED', reason: 'why' } }) }, 'block b: why');
  git(['push', '-q', 'origin', 'job/b'], { cwd: root });
  const tranche = makeRepo(blocked('why'));
  assert.equal(status(tranche, { role: 'bob', offline: true, log: quiet }).layer.ready, false);
  const r = status(root, { role: 'bob', log: quiet, io });
  assert.equal(r.layer.ready, true);
  assert.equal(r.rows.find((x) => x.id === 'b').flag, 'BLOCKED');
});
