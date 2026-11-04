// Build H, session safety: the start check, refusals per session, and retry on a moved base.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { mergeRetry, mergePlain, unreadable } from '../lib/merge.mjs';
import { REFRESH_AT, REFUSALS_FILE, appendRow, bobMetricsFile, recordRefusal, refusalCounts } from '../lib/metrics.mjs';
import { approvalsHash, loadedFile, startCheck, wakeCheck } from '../lib/start.mjs';
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

test('start check --wake: the tip\'s approvals against those recorded at the start, under .git', () => {
  const { root, bare } = withOrigin();
  const out = [];
  assert.equal(wakeCheck(root, { log: (m) => out.push(m) }).recorded, true, 'no record: says so and records');
  assert.match(out.at(-1), /no record/);
  assert.equal(startCheck(root, { log: quiet }).ok, true);
  assert.ok(existsSync(loadedFile(root)) && loadedFile(root).includes('.git'));
  assert.equal(git(['status', '--porcelain'], { cwd: root }), '', 'nothing in the tree');
  const other = clone(bare);
  commit(other, { 'more.txt': 'x' });
  git(['push', '-q', 'origin', 'tranche'], { cwd: other });
  assert.equal(wakeCheck(root, { log: quiet }).ok, true, 'a new tip with the same approvals');
  commit(other, { 'CLAUDE.md': APPROVALS.replace('may push', 'may push anywhere') });
  git(['push', '-q', 'origin', 'tranche'], { cwd: other });
  const w = [];
  assert.equal(wakeCheck(root, { log: (m) => w.push(m) }).ok, false);
  assert.equal(w.at(-1), 'approvals changed since this session started: it is replaced');
});

test('start check --wake --approvals: a fresh container compares the tip with the hash its prompt carries, not a record', () => {
  const { root, bare } = withOrigin();
  const at = approvalsHash(root, git(['rev-parse', 'origin/tranche'], { cwd: root }));
  assert.match(at, /^[0-9a-f]{64}$/);
  const other = clone(bare);
  commit(other, { 'CLAUDE.md': APPROVALS.replace('may push', 'may push anywhere') });
  git(['push', '-q', 'origin', 'tranche'], { cwd: other });
  // A fresh container: no record under .git. Without --approvals it records the new tip's and passes.
  const fresh = clone(bare);
  const w = [];
  assert.equal(wakeCheck(fresh, { approvals: at, log: (m) => w.push(m) }).ok, false, 'the change since the prompt was made is caught');
  assert.equal(w.at(-1), 'approvals changed since this session started: it is replaced');
  assert.equal(existsSync(loadedFile(fresh)), false, 'nothing recorded');
  const now = approvalsHash(fresh, git(['rev-parse', 'origin/tranche'], { cwd: fresh }));
  assert.equal(wakeCheck(fresh, { approvals: now, log: quiet }).ok, true);
  assert.throws(() => wakeCheck(fresh, { approvals: 'abc', log: quiet }), /--approvals takes the 64-hex hash/);
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

const unread = () => { throw new Fail('gh api -X PUT failed: unexpected end of JSON input'); };
const H40 = 'a'.repeat(40);

test('mergeRetry: an unreadable reply reads the pull request back; merged with this head succeeds (4 Nov)', () => {
  let calls = 0;
  const r = mergeRetry(() => { calls++; return unread(); }, { wait: 0, log: quiet, reread: { read: () => ({ state: 'closed', merged: true, merge_commit_sha: 'm'.repeat(40), head: { sha: H40 } }), sha: H40 } });
  assert.deepEqual([r.merged, r.sha, calls], [true, 'm'.repeat(40), 1]);
  // An empty reply (gh exits 0 with nothing) is the same case.
  assert.equal(mergeRetry(() => null, { wait: 0, log: quiet, reread: { read: () => ({ state: 'closed', merged: true, merge_commit_sha: 'm', head: { sha: H40 } }), sha: H40 } }).merged, true);
});

test('mergeRetry: an unreadable reply with the pull request open at the same head tries the PUT once more, only once', () => {
  let calls = 0;
  const open = { read: () => ({ state: 'open', merged: false, head: { sha: H40 } }), sha: H40 };
  const r = mergeRetry(() => (++calls === 1 ? unread() : { merged: true, sha: 'm' }), { wait: 0, log: quiet, reread: open });
  assert.deepEqual([r.merged, calls], [true, 2]);
  calls = 0;
  assert.throws(() => mergeRetry(() => { calls++; return unread(); }, { wait: 0, log: quiet, reread: open }), /could not be read.*after one more try/);
  assert.equal(calls, 2);
  // A head that moved, or a merge at another head, stops at once.
  calls = 0;
  assert.throws(() => mergeRetry(() => { calls++; return unread(); }, { wait: 0, log: quiet, reread: { read: () => ({ state: 'open', head: { sha: 'b'.repeat(40) } }), sha: H40 } }), /at another head/);
  assert.throws(() => mergeRetry(unread, { wait: 0, log: quiet, reread: { read: () => ({ state: 'closed', merged: true, head: { sha: 'b'.repeat(40) } }), sha: H40 } }), /merged at another head/);
  assert.equal(calls, 1);
  // The once-more try runs the moved-base checks first: a base that moved meanwhile stops it.
  calls = 0;
  const seen = [];
  assert.throws(() => mergeRetry(() => { calls++; return unread(); }, { wait: 0, log: quiet, reread: open, fetch: () => seen.push('fetch'), check: () => { seen.push('check'); throw new Fail('main moved past the merged result the gate checked; run merge again'); } }), /moved past/);
  assert.deepEqual([calls, seen], [1, ['fetch', 'check']]);
  // A refusal GitHub stated is not unreadable; without reread the error stands as before.
  assert.equal(unreadable('gh api -X PUT failed: gh: Pull Request is not mergeable (HTTP 405)'), false);
  assert.equal(unreadable('gh api -X PUT failed: {"message":"x"}'), false);
  assert.equal(unreadable('gh api -X PUT failed: '), true);
  assert.throws(() => mergeRetry(unread, { wait: 0, log: quiet }), /unexpected end of JSON input/);
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
        requiredChecks: () => ({ checks: [{ context: 'gate' }] }),
        checkRuns: () => [{ id: 1, status: 'completed', conclusion: 'success', started_at: '2026-11-02T10:00:00Z' }],
        repo: { released: () => false, shim: () => null, descends: () => false },
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
  assert.match(logs[0], /moved on origin; fetching and trying again \(2 of 5\)/);
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
  // A non-fast-forward the local side already knows of is a moved ref too: it merges, and conflicts.
  git(['fetch', '-q', 'origin'], { cwd: root });
  assert.throws(() => pushRetry(root, 'tranche', { wait: 0, log: quiet }), /does not merge cleanly; nothing was pushed/);
});

// A push that fails the given ways first (calling before() each time, to move origin as another
// writer would), then pushes for real.
const flaky = (root, branch, failures, before = () => {}) => {
  let n = 0;
  return () => {
    if (n < failures.length) { before(n); return { code: 1, stderr: failures[n++] }; }
    n++;
    return git(['push', '-q', 'origin', `HEAD:refs/heads/${branch}`], { cwd: root, allowFail: true });
  };
};
const LOCK = (b) => `remote: error: cannot lock ref 'refs/heads/${b}': is at 41bd0831f370 but expected 61e852893eab\nTo origin\n ! [remote rejected] HEAD -> ${b} (failed to update ref)\nerror: failed to push some refs`;
const E500 = 'remote: Internal Server Error\nfatal: unable to access \'https://github.com/o/r/\': The requested URL returned error: 500';
const tipOf = (root, b) => git(['ls-remote', 'origin', `refs/heads/${b}`], { cwd: root }).split('\t')[0];

test('pushRetry: a cannot-lock-ref rejection redoes the change on the moved tip and pushes', () => {
  const { root, bare } = withOrigin({ 'README.md': 'x' });
  const other = clone(bare);
  const rows = () => readFileSync(join(root, 'log.jsonl'), 'utf8');
  const make = () => { writeFileSync(join(root, 'log.jsonl'), (existsSync(join(root, 'log.jsonl')) ? rows() : '') + 'ours\n'); git(['add', '-A'], { cwd: root }); git(['commit', '-q', '-m', 'ours'], { cwd: root }); };
  make();
  const push = flaky(root, 'tranche', [LOCK('tranche')], () => { commit(other, { 'log.jsonl': 'theirs\n' }); git(['push', '-q', 'origin', 'tranche'], { cwd: other }); });
  const logs = [];
  const tip = pushRetry(root, 'tranche', { wait: 0, log: (m) => logs.push(m), redo: make, push });
  assert.equal(tipOf(root, 'tranche'), tip);
  assert.equal(git(['show', `${tip}:log.jsonl`], { cwd: root }), 'theirs\nours', 'redone on their row, not merged');
  assert.match(logs[0], /tranche moved on origin; fetching and trying again \(2 of 5\)/);
});

test('pushRetry: a 500 then success pushes; a 500 whose push landed is not pushed twice', () => {
  const { root } = withOrigin({ 'README.md': 'x' });
  const ours = commit(root, { 'a.txt': 'a' });
  const logs = [];
  assert.equal(pushRetry(root, 'tranche', { wait: 0, log: (m) => logs.push(m), push: flaky(root, 'tranche', [E500, E500]) }), ours);
  assert.equal(tipOf(root, 'tranche'), ours);
  assert.match(logs[0], /server error; fetching and trying again \(2 of 5\)/);
  assert.equal(logs.length, 2);
  // The 500 came back but the push landed: the fetched tip holds HEAD, so nothing is redone.
  const landed = commit(root, { 'b.txt': 'b' });
  let redone = 0;
  const push = flaky(root, 'tranche', [E500], () => git(['push', '-q', 'origin', 'HEAD:refs/heads/tranche'], { cwd: root }));
  assert.equal(pushRetry(root, 'tranche', { wait: 0, log: quiet, push, redo: () => { redone++; } }), landed);
  assert.equal(redone, 0);
  // Landed, then another writer pushed on top: ours is returned, not theirs.
  const { root: r2, bare } = withOrigin({ 'README.md': 'x' });
  const other = clone(bare);
  const mine = commit(r2, { 'c.txt': 'c' });
  const p2 = flaky(r2, 'tranche', [E500], () => {
    git(['push', '-q', 'origin', 'HEAD:refs/heads/tranche'], { cwd: r2 });
    git(['pull', '-q', '--ff-only', 'origin', 'tranche'], { cwd: other });
    commit(other, { 'd.txt': 'd' });
    git(['push', '-q', 'origin', 'tranche'], { cwd: other });
  });
  assert.equal(pushRetry(r2, 'tranche', { wait: 0, log: quiet, push: p2, redo: () => { redone++; } }), mine);
  assert.notEqual(tipOf(r2, 'tranche'), mine);
  assert.equal(redone, 0);
  // A 500 on the last try whose push landed is reported as pushed, not refused.
  const last = commit(root, { 'e.txt': 'e' });
  const p3 = flaky(root, 'tranche', [E500, E500], (n) => { if (n === 1) git(['push', '-q', 'origin', 'HEAD:refs/heads/tranche'], { cwd: root }); });
  assert.equal(pushRetry(root, 'tranche', { wait: 0, log: quiet, tries: 2, push: p3 }), last);
});

test('pushRetry: the real wordings of a moved ref and a server error are retried', async () => {
  const { REF_MOVED, SERVER_ERROR } = await import('../lib/util.mjs');
  for (const w of [' ! [rejected]        HEAD -> process-state (non-fast-forward)', ' ! [rejected] HEAD -> x (fetch first)', LOCK('process-state'), ' ! [remote rejected] HEAD -> x (stale info)']) assert.match(w, REF_MOVED);
  for (const w of [' ! [remote rejected] b -> b (Internal Server Error)', 'error: RPC failed; HTTP 500 curl 22 The requested URL returned error: 500', 'fatal: unable to access: Received HTTP code 503 from proxy after CONNECT', E500]) assert.match(w, SERVER_ERROR);
  for (const w of ['remote: Permission to o/r.git denied', ' ! [remote rejected] HEAD -> x (protected branch hook declined)', 'fatal: port 5432 is busy']) {
    assert.doesNotMatch(w, REF_MOVED); assert.doesNotMatch(w, SERVER_ERROR);
  }
});

test('pushRetry: gives up after the last try with the remote\'s words; other failures stop at once', () => {
  const { root } = withOrigin({ 'README.md': 'x' });
  commit(root, { 'a.txt': 'a' });
  const before = tipOf(root, 'tranche');
  let calls = 0;
  const always = () => { calls++; return { code: 1, stderr: LOCK('tranche') }; };
  assert.throws(() => pushRetry(root, 'tranche', { wait: 0, log: quiet, push: always }), (e) => e instanceof Fail && /refused 5 times/.test(e.message) && /cannot lock ref 'refs\/heads\/tranche': is at 41bd0831f370 but expected 61e852893eab/.test(e.message));
  assert.equal(calls, 5);
  assert.throws(() => pushRetry(root, 'tranche', { wait: 0, log: quiet, tries: 3, push: () => ({ code: 1, stderr: E500 }) }), /refused 3 times \(the server kept failing\).*returned error: 500/s);
  calls = 0;
  assert.throws(() => pushRetry(root, 'tranche', { wait: 0, log: quiet, push: () => { calls++; return { code: 1, stderr: 'remote: Permission to o/r.git denied' }; } }), /the push of tranche failed: remote: Permission/);
  assert.equal(calls, 1);
  assert.equal(tipOf(root, 'tranche'), before);
});
