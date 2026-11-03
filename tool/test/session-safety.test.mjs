// Build H, session safety: the start check, refusals per session, and retry on a moved base.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { mergeRetry, mergePlain } from '../lib/merge.mjs';
import { REFRESH_AT, REFUSALS_FILE, appendRow, bobMetricsFile, recordRefusal, refusalCounts } from '../lib/metrics.mjs';
import { startCheck } from '../lib/start.mjs';
import { status } from '../lib/status.mjs';
import { Fail, git, pushRetry } from '../lib/util.mjs';
import { commit, makeRepo } from './helpers.mjs';

const APPROVALS = '# Product\n\n## Standing approvals from Bob\n\nSessions may push.\n\n## Other\n\nx\n';
const quiet = () => {};

function withOrigin(files = { 'CLAUDE.md': APPROVALS }) {
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  return { root, bare };
}

function clone(bare, branch = 'tranche') {
  const dir = join(mkdtempSync(join(tmpdir(), 'p3-clone-')), 'c');
  git(['clone', '-q', '-b', branch, bare, dir], { cwd: tmpdir() });
  git(['config', 'user.email', 'other@example.com'], { cwd: dir });
  git(['config', 'user.name', 'Other'], { cwd: dir });
  git(['config', 'commit.gpgsign', 'false'], { cwd: dir });
  return dir;
}

test('start check: HEAD at the tip with the same approvals passes and prints both SHAs', () => {
  const { root } = withOrigin();
  const out = [];
  const r = startCheck(root, { branch: 'tranche', log: (m) => out.push(m) });
  assert.equal(r.ok, true);
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  assert.ok(out.includes(`HEAD ${head}`));
  assert.ok(out.includes(`tranche ${head}`));
  // With no --branch, the tranche the config names (the default here).
  assert.equal(startCheck(root, { log: quiet }).ok, true);
});

test('start check: a stale checkout, a commit of its own, or changed approvals fail', () => {
  const { root, bare } = withOrigin();
  // The branch moved on origin after the session's checkout was made.
  const other = clone(bare);
  const moved = commit(other, { 'more.txt': 'x' });
  git(['push', '-q', 'origin', 'tranche'], { cwd: other });
  const out = [];
  const stale = startCheck(root, { branch: 'tranche', log: (m) => out.push(m) });
  assert.equal(stale.ok, false);
  assert.equal(stale.sameHead, false);
  assert.equal(stale.tip, moved);
  assert.ok(out.includes(`tranche ${moved}`));
  assert.match(out.at(-1), /FAILED/);
  // Up to date again, then a local commit of its own.
  git(['merge', '-q', '--ff-only', 'origin/tranche'], { cwd: root });
  assert.equal(startCheck(root, { branch: 'tranche', log: quiet }).ok, true);
  commit(root, { 'local.txt': 'x' });
  assert.equal(startCheck(root, { branch: 'tranche', log: quiet }).sameHead, false);
  git(['reset', '-q', '--hard', 'origin/tranche'], { cwd: root });
  // The approvals the session loaded from its checkout differ from the tip's.
  writeFileSync(join(root, 'CLAUDE.md'), APPROVALS.replace('may push', 'may push anywhere'));
  const r = startCheck(root, { branch: 'tranche', log: quiet });
  assert.deepEqual([r.ok, r.sameHead, r.sameApprovals], [false, true, false]);
  // A change outside the block is not a change to the approvals.
  writeFileSync(join(root, 'CLAUDE.md'), APPROVALS.replace('x\n', 'y\n'));
  assert.equal(startCheck(root, { branch: 'tranche', log: quiet }).ok, true);
});

test('start check: a branch it cannot fetch is not a confirmed start', () => {
  const { root } = withOrigin();
  assert.throws(() => startCheck(root, { branch: 'no-such-branch', log: quiet }), /could not fetch no-such-branch/);
  assert.throws(() => startCheck(root, { branch: true, log: quiet }), /--branch needs/);
});

test('refusals: recorded with act, depth and session; bad input refused', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const row = recordRefusal(root, { session: 'session_A', act: 'git push origin x', depth: '1' });
  assert.deepEqual([row.row, row.session, row.act, row.depth], ['refusal', 'session_A', 'git push origin x', 1]);
  const line = JSON.parse(readFileSync(join(root, REFUSALS_FILE), 'utf8').trim());
  assert.equal(line.session, 'session_A');
  assert.throws(() => recordRefusal(root, { act: 'x', depth: 0 }), /--session/);
  assert.throws(() => recordRefusal(root, { session: 's', depth: 0 }), /--act/);
  assert.throws(() => recordRefusal(root, { session: 's', act: 'x' }), /--depth/);
  assert.throws(() => recordRefusal(root, { session: 's', act: 'x', depth: 'deep' }), /--depth/);
});

test('refusals: counted per session from the refusal rows only; REFRESH at 10', () => {
  const rows = [
    ...Array.from({ length: REFRESH_AT }, (_, i) => ({ row: 'refusal', id: `a${i}`, session: 'A', act: 'merge', depth: 0 })),
    // The same refusal also listed on BOB's measured row is not counted again.
    { row: 'attempt', event: 'measured', session: 'B', refusals: [{ act: 'push', depth: '1', channel: 'claude.md' }] },
    ...Array.from({ length: REFRESH_AT - 1 }, (_, i) => ({ row: 'refusal', id: `b${i}`, session: 'B', act: 'gh', depth: 1 })),
  ];
  assert.deepEqual(refusalCounts(rows), [
    { session: 'A', refusals: REFRESH_AT, refresh: true },
    { session: 'B', refusals: REFRESH_AT - 1, refresh: false },
  ]);
});

test('status prints REFRESH for a session with 10 refusals, from the tranche and this checkout, each row once', () => {
  const { root } = withOrigin({ 'README.md': 'x' });
  for (let i = 0; i < 6; i++) recordRefusal(root, { session: 'session_C', act: `act ${i}`, depth: 0 });
  recordRefusal(root, { session: 'session_D', act: 'gh', depth: 2 });
  commit(root, {}, 'refusal rows');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  // Four more recorded here and not yet on the tranche, two of them alike in the same second;
  // a measured row listing one of them again; a line that is not JSON.
  recordRefusal(root, { session: 'session_C', act: 'act 6', depth: 0 });
  recordRefusal(root, { session: 'session_C', act: 'act 7', depth: 0 });
  recordRefusal(root, { session: 'session_C', act: 'same', depth: 0 });
  recordRefusal(root, { session: 'session_C', act: 'same', depth: 0 });
  appendRow(root, 'alpha', { row: 'attempt', event: 'measured', session: 'session_C', refusals: [{ act: 'same', depth: '0', channel: 'claude.md' }] }, bobMetricsFile('alpha'));
  writeFileSync(join(root, REFUSALS_FILE), readFileSync(join(root, REFUSALS_FILE), 'utf8') + '<<<<<<< conflict\n');
  const out = [];
  const r = status(root, { offline: true, log: (m) => out.push(m) });
  assert.deepEqual(r.sessions.map((s) => [s.session, s.refusals, s.refresh]), [['session_C', 10, true], ['session_D', 1, false]]);
  assert.ok(out.some((l) => /^- session_C: 10; REFRESH/.test(l)), out.join('\n'));
  assert.ok(out.some((l) => l === '- session_D: 1'));
});

const moved = () => { throw new Fail('gh api -X PUT failed: gh: Base branch was modified. Review and try the merge again. (HTTP 405)'); };

test('mergeRetry: a moved base is fetched and tried again, at most 3 times in all', () => {
  let calls = 0;
  const seen = [];
  const r = mergeRetry(() => (++calls < 3 ? moved() : { merged: true, sha: 'm' }), { wait: 0, log: quiet, fetch: () => seen.push('fetch'), check: () => seen.push('check') });
  assert.deepEqual([r.merged, calls], [true, 3]);
  assert.deepEqual(seen, ['fetch', 'check', 'fetch', 'check']);
  // A refusal returned rather than thrown counts the same.
  let n = 0;
  assert.equal(mergeRetry(() => (++n === 1 ? { merged: false, message: 'Base branch was modified' } : { merged: true }), { wait: 0, log: quiet }).merged, true);
  // Three moved bases stop it.
  calls = 0;
  assert.throws(() => mergeRetry(() => { calls++; return moved(); }, { wait: 0, log: quiet }), /refused the merge 3 times/);
  assert.equal(calls, 3);
});

test('mergeRetry: any other refusal stops at once, and a changed pull request stops the retry', () => {
  let calls = 0;
  assert.throws(() => mergeRetry(() => { calls++; throw new Fail('gh api -X PUT failed: Head branch was modified (HTTP 409)'); }, { wait: 0, log: quiet }), /Head branch was modified/);
  assert.equal(calls, 1);
  assert.equal(mergeRetry(() => ({ merged: false, message: 'Pull Request is not mergeable' }), { wait: 0, log: quiet }).merged, false);
  calls = 0;
  assert.throws(() => mergeRetry(() => { calls++; return moved(); }, { wait: 0, log: quiet, check: () => { throw new Fail('pull request 4 changed while its base moved; run merge again'); } }), /changed while its base moved/);
  assert.equal(calls, 1);
});

test('merge --plain retries a moved base and merges the same head; a head that moved meanwhile stops it', () => {
  const root = makeRepo({ 'README.md': 'x', '.github/workflows/ci.yml': 'on: pull_request\n' });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'bob/pin', 'tranche'], { cwd: root });
  const sha = commit(root, { 'pin.txt': 'moved' });
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche', 'bob/pin'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const make = (headAfter) => {
    const calls = { tries: 0, merged: null, reads: 0 };
    return {
      calls,
      io: {
        getPR: () => { calls.reads++; return { state: 'open', draft: false, base: { ref: 'tranche', repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: 'bob/pin', sha: calls.tries > 0 && headAfter ? headAfter : sha, repo: { full_name: 'o/r' } } }; },
        requiredChecks: () => ({ checks: [{ context: 'gate', app: 15368 }], strict: false }),
        checkRuns: () => [{ id: 1, app: { id: 15368 }, status: 'completed', conclusion: 'success', started_at: '2026-11-02T10:00:00Z', check_suite: { id: 7 } }],
        workflowRun: () => ({ path: '.github/workflows/ci.yml', event: 'pull_request' }),
        repo: { released: () => false, shim: () => null, descends: () => false },
        openFrom: () => [], repoOwner: () => 'neobobkrause', me: () => 'civicsmith', namedChecks: () => true,
        mergePR: (slug, n, s) => { calls.tries++; if (calls.tries === 1) moved(); calls.merged = s; return { merged: true, sha: 'm'.repeat(40) }; },
      },
    };
  };
  const ok = make();
  const out = mergePlain(root, 4, { slug: 'o/r', log: quiet, wait: 0, io: ok.io, reviewed: 'two fresh reviews', rounds: 1 });
  assert.deepEqual([out.merged, ok.calls.tries, ok.calls.merged], [true, 2, sha]);
  const bad = make('f'.repeat(40));
  assert.throws(() => mergePlain(root, 4, { slug: 'o/r', log: quiet, wait: 0, io: bad.io, reviewed: 'two fresh reviews', rounds: 1 }), /changed while its base moved/);
  assert.equal(bad.calls.tries, 1);
});

test('pushRetry: a fetch-first rejection fetches, merges (never forced) and pushes again', () => {
  const { root, bare } = withOrigin({ 'README.md': 'x' });
  const other = clone(bare);
  const theirs = commit(other, { 'theirs.txt': 'x' });
  git(['push', '-q', 'origin', 'tranche'], { cwd: other });
  const ours = commit(root, { 'ours.txt': 'y' });
  const logs = [];
  const tip = pushRetry(root, 'tranche', { wait: 0, log: (m) => logs.push(m) });
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/tranche'], { cwd: root }).split('\t')[0], tip);
  for (const c of [theirs, ours]) assert.equal(git(['merge-base', '--is-ancestor', c, tip], { cwd: root, allowFail: true }).code, 0, 'both sides kept');
  assert.equal(logs.length, 1);
  assert.match(logs[0], /moved on origin; fetching and trying again \(2 of 3\)/);
});

test('pushRetry: a conflict stops it with nothing pushed; another rejection stops at once', () => {
  const { root, bare } = withOrigin({ 'README.md': 'x' });
  const other = clone(bare);
  const theirs = commit(other, { 'README.md': 'theirs' });
  git(['push', '-q', 'origin', 'tranche'], { cwd: other });
  const ours = commit(root, { 'README.md': 'ours' });
  assert.throws(() => pushRetry(root, 'tranche', { wait: 0, log: quiet }), /does not merge cleanly; nothing was pushed/);
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/tranche'], { cwd: root }).split('\t')[0], theirs);
  assert.equal(git(['rev-parse', 'HEAD'], { cwd: root }), ours, 'the merge was aborted');
  assert.equal(git(['status', '--porcelain'], { cwd: root }), '');
  // A rejection that is not fetch-first (a non-fast-forward the local side already knows of).
  git(['fetch', '-q', 'origin'], { cwd: root });
  assert.throws(() => pushRetry(root, 'tranche', { wait: 0, log: quiet }), /the push of tranche failed/);
});
