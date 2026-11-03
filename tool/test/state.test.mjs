// Build L: status for BOB, the one-screen handoff and numbered messages on the state branch.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { addressFile, handoff, outcome, readState, send, undelivered } from '../lib/state.mjs';
import { status } from '../lib/status.mjs';
import { Fail, git } from '../lib/util.mjs';
import { commit, entry, makeRepo, write } from './helpers.mjs';
import { main } from '../p3.mjs';

const quiet = () => {};
const SB = 'process-state';

function withOrigin(files = { 'CLAUDE.md': '# Product\n' }) {
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['branch', '-q', '--set-upstream-to', 'origin/tranche'], { cwd: root });
  return { root, bare };
}

test('send: numbers per sender, pushes before printing, reads the address, records outcomes', () => {
  const { root, bare } = withOrigin();
  const out = [];
  const a = send(root, SB, { from: 'bob', to: 'job-x', text: 'go', log: (l) => out.push(l) });
  assert.equal(a.n, 1);
  assert.equal(a.address, null);
  assert.match(out.join('\n'), /MSG bob-1 to job-x: go[\s\S]*no address for job-x/);
  // Pushed: origin's state branch holds the message.
  assert.match(git(['show', `${SB}:messages/bob.jsonl`], { cwd: bare }), /"n":1/);
  // Another sender's counter is its own; an address written (by build K) is read at send time.
  const other = makeRepo();
  git(['remote', 'add', 'origin', bare], { cwd: other });
  git(['fetch', '-q', 'origin', SB], { cwd: other });
  git(['checkout', '-q', '-b', 's', 'FETCH_HEAD'], { cwd: other });
  commit(other, { [addressFile('job-x')]: { session: 'session_abc' } }, 'address');
  git(['push', '-q', 'origin', `HEAD:${SB}`], { cwd: other });
  assert.equal(send(root, SB, { from: 'root', to: 'job-x', text: 'one', log: quiet }).n, 1);
  const b = send(root, SB, { from: 'bob', to: 'job-x', text: 'two', log: quiet });
  assert.equal(b.n, 2);
  assert.equal(b.address, 'session_abc');
  assert.deepEqual(undelivered(root, SB).map((m) => `${m.from}-${m.n}`).sort(), ['bob-1', 'bob-2', 'root-1']);
  outcome(root, SB, { from: 'bob', n: 1, result: 'delivered', log: quiet });
  outcome(root, SB, { from: 'bob', n: 2, result: 'failed', log: quiet });
  assert.deepEqual(undelivered(root, SB).map((m) => `${m.from}-${m.n}:${m.outcome}`).sort(), ['bob-2:failed', 'root-1:null']);
  assert.throws(() => outcome(root, SB, { from: 'bob', n: 9, result: 'delivered', log: quiet }), /sent no message 9/);
  assert.throws(() => send(root, SB, { from: 'bob', to: '../x', text: 'y', log: quiet }), Fail);
  // Unpushed work stops the send: the record goes first.
  commit(root, { 'a.txt': 'x' });
  assert.throws(() => send(root, SB, { from: 'bob', to: 'job-x', text: 'z', log: quiet }), /not pushed/);
  git(['push', '-q'], { cwd: root });
  write(root, { 'CLAUDE.md': 'changed' });
  assert.throws(() => send(root, SB, { from: 'bob', to: 'job-x', text: 'z', log: quiet }), /uncommitted/);
  git(['checkout', '-q', 'CLAUDE.md'], { cwd: root });
  git(['checkout', '-q', '-b', 'local'], { cwd: root });
  assert.throws(() => send(root, SB, { from: 'bob', to: 'job-x', text: 'z', log: quiet }), /not on origin/);
  assert.throws(() => send(root, SB, { to: 'job-x', text: 'z', log: quiet }), /--from/);
});

test('handoff: one screen from status, on the state branch, refused when too long', () => {
  const { root } = withOrigin({ 'CLAUDE.md': '# Product\n', 'process/ledger/a.json': entry('a', { status: { state: 'BLOCKED', reason: 'needs Bob' } }) });
  git(['push', '-q', 'origin', 'HEAD:tranche'], { cwd: root });
  send(root, SB, { from: 'bob', to: 'job-a', text: 'hi', log: quiet });
  const lines = [];
  const s = status(root, { role: 'bob', context: 72, log: (l) => lines.push(l), io: { openPRs: () => [], checkRun: () => null } });
  const text = lines.join('\n');
  assert.match(text, /blocked:\n- a: BLOCKED/);
  assert.match(text, /undelivered messages:\n- bob-1 to job-a/);
  assert.match(text, /context 72% of the window: REFRESH \(threshold 60%\)/);
  assert.match(text, /reading set for bob: \d+ bytes; CLAUDE.md 10/);
  const h = handoff(root, SB, { tranche: s.tranche, lines, notes: ['watch a'], log: quiet });
  git(['fetch', '-q', 'origin', SB], { cwd: root });
  assert.equal(readState(root, SB, 'handoff/bob.md'), h.text);
  const again = [];
  status(root, { role: 'bob', log: (l) => again.push(l), io: { openPRs: () => [], checkRun: () => null } });
  assert.match(again.join('\n'), /process-state:handoff\/bob.md \d+/);
  assert.throws(() => status(root, { role: 'bob', context: 'high', offline: true, log: quiet }), /a number/);
  assert.throws(() => handoff(root, SB, { tranche: s.tranche, lines: Array(50).fill('x'), log: quiet }), /one screen/);
  assert.throws(() => handoff(root, SB, { tranche: s.tranche, lines, notes: Array(6).fill('n'), log: quiet }), /at most 5/);
});

test('status --role bob: owed, idle and open, with last activity; merged as a count', () => {
  const { root } = withOrigin({
    'CLAUDE.md': '# Product\n',
    'process/ledger/r.json': entry('r', { status: { state: 'WORKING' } }),
    'process/ledger/q.json': entry('q', { status: { state: 'WORKING' } }),
    'process/ledger/m.json': entry('m', { status: { state: 'COMPLETE' } }),
  });
  git(['push', '-q', 'origin', 'HEAD:tranche'], { cwd: root });
  const old = new Date(Date.now() - 5 * 36e5).toISOString();
  const prs = [
    { number: 7, draft: false, head: { ref: 'job/r', sha: 'a' }, updated_at: new Date().toISOString() },
    { number: 8, draft: true, head: { ref: 'job/q', sha: 'b' }, updated_at: old },
    { number: 9, draft: false, head: { ref: 'build/x', sha: 'c' }, updated_at: old },
  ];
  const lines = [];
  status(root, { role: 'bob', offline: false, log: (l) => lines.push(l), io: { openPRs: () => prs, checkRun: (s, sha) => ({ conclusion: sha === 'a' ? 'success' : 'failure' }) } });
  const t = lines.join('\n');
  assert.match(t, /owed:\n- r: .*PR #7 ready, last activity 0h ago; gate success; merge owed/);
  assert.match(t, /idle:\n- q: .*PR #8 draft, last activity 5h ago/);
  assert.match(t, /merged: 1/);
  assert.match(t, /other pull requests:\n- #9 build\/x, last activity 5h ago/);
});

test('send: unquoted text is refused, not cut to its first word', async () => {
  const { root } = withOrigin();
  const cwd = process.cwd();
  const errs = [];
  const err = console.error;
  console.error = (m) => errs.push(m);
  try { process.chdir(root); assert.equal(await main(['send', 'job-x', 'merge', 'your', 'PR', '--from', 'bob']), 1); } finally { process.chdir(cwd); console.error = err; }
  assert.match(errs.join('\n'), /the text in quotes/);
});
