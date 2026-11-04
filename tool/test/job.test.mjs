import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBlock, GATE, block } from '../lib/github.mjs';
import { jobBlock, jobComplete, jobSender, jobStart, jobTest, startText } from '../lib/job.mjs';
import { merge } from '../lib/merge.mjs';
import { status } from '../lib/status.mjs';
import { readEntry } from '../lib/ledger.mjs';
import { appendRow, idleByDay, layerOf, overhead, readRows, report } from '../lib/metrics.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo, write } from './helpers.mjs';

const quiet = () => {};
// The setup check reads GitHub; these products stand for one whose setup is complete.
const ready = () => ({ ok: true, missing: [] });
const passing = "import test from 'node:test'; test('ok', () => {});\n";
const failing = "import test from 'node:test'; import a from 'node:assert'; test('no', () => a.fail('x'));\n";

function product() {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha'),
    'req/alpha.md': '# alpha\n\nR1 does a thing.\n',
    'test/alpha/a.test.mjs': passing,
  });
  git(['branch', 'tranche'], { cwd: root });
  return root;
}

test('job start writes WORKING, an attempt row and a START with sizes, commands and the blocked exit', () => {
  const root = product();
  const { start, attempt } = jobStart(root, 'alpha', { coordinator: 'session_bob', push: false, log: quiet });
  assert.equal(attempt, 1);
  assert.match(start, /\| `req\/alpha.md` \| 26 \|/);
  assert.match(start, /session `session_bob`/);
  assert.match(start, /p3.mjs job complete alpha/);
  assert.match(start, /p3.mjs block alpha --reason/);
  assert.equal(git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root }), 'main', 'returns to the branch it started on');
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  assert.equal(readEntry(root, 'alpha').status.state, 'WORKING');
  assert.equal(readRows(root, 'alpha')[0].event, 'start');
});

test('job start refuses an entry that is not OPEN', () => {
  const root = product();
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', 'job/alpha'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['branch', '-D', 'job/alpha'], { cwd: root });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet }), /WORKING, not OPEN/);
});

test('job complete runs the checks and the suite, then sets COMPLETE and builds the receipt', () => {
  const root = product();
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  const r = jobComplete(root, 'alpha', { push: false, notVerified: ['the live site'], log: quiet });
  assert.equal(r.ok, true);
  assert.equal(readEntry(root, 'alpha').status.state, 'COMPLETE');
  const suite = r.receipt.commands.find((c) => c.suite);
  assert.deepEqual([suite.exit, suite.tests.total, suite.tests.pass], [0, 1, 1]);
  assert.deepEqual(r.receipt.not_verified, ['the live site']);
  assert.equal(r.receipt.sha, git(['rev-parse', 'HEAD'], { cwd: root }));
});

test('job complete refuses on a red suite and leaves the status alone', () => {
  const root = product();
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'test/alpha/b.test.mjs': failing });
  assert.equal(jobComplete(root, 'alpha', { push: false, log: quiet }).ok, false);
  assert.equal(readEntry(root, 'alpha').status.state, 'WORKING');
});

test('job complete refuses on another branch and on uncommitted work', () => {
  const root = product();
  assert.throws(() => jobComplete(root, 'alpha', { push: false, log: quiet }), /on branch job\/alpha/);
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  write(root, { 'src/alpha/x.mjs': 'export {};\n' });
  git(['add', '-A'], { cwd: root });
  assert.throws(() => jobComplete(root, 'alpha', { push: false, log: quiet }), /commit your work first/);
});

test('block sets BLOCKED with its reason', () => {
  const root = product();
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  assert.throws(() => jobBlock(root, 'alpha', { push: false, log: quiet }), /needs --reason/);
  jobBlock(root, 'alpha', { reason: 'R65 names an error code nobody chose', push: false, log: quiet });
  assert.deepEqual(readEntry(root, 'alpha').status.reason, 'R65 names an error code nobody chose');
});

test('a gate block round-trips through a comment body', () => {
  const body = block(GATE, { runs: [{ minutes: 1 }] }, 'Gate runs');
  assert.deepEqual(parseBlock(body, GATE), { runs: [{ minutes: 1 }] });
  assert.equal(parseBlock(body, 'p3:receipt'), null);
});

test('metrics report counts a refuted COMPLETE claim and gate minutes', () => {
  const root = makeRepo({ 'README.md': 'x' });
  appendRow(root, 'alpha', { row: 'attempt', event: 'complete', attempt: 1, pr: 7 });
  appendRow(root, 'alpha', { row: 'attempt', event: 'measured', attempt: 1, cost_usd: 2.5, tokens: 1000, denials: 2, refusals: [{ act: 'archive', depth: '2', channel: 'START' }] });
  appendRow(root, 'alpha', { row: 'merge', pr: 7 });
  const gate = block(GATE, { runs: [{ minutes: 2, receipt_attempt: 1, suite: 'fail' }, { minutes: 1.5, receipt_attempt: 1, suite: 'pass', revert: 'pass' }] });
  const read = { comments: () => [{ body: gate, user: { login: 'github-actions[bot]' } }], getPR: () => ({ merged_at: null }) };
  assert.equal(report(root, 'o/r', 'HEAD', { read }).complete_claims, 0, 'rows are read at the ref, not from the working tree');
  git(['add', '-A'], { cwd: root });
  git(['commit', '-q', '-m', 'rows'], { cwd: root });
  const r = report(root, 'o/r', 'HEAD', { read });
  assert.equal(r.complete_claims, 1);
  assert.equal(r.refuted, 1);
  assert.equal(r.false_done_rate, 1);
  assert.equal(r.gate_minutes, 3.5);
  assert.equal(r.cost_usd, 2.5);
  assert.equal(r.denials, 2);
  assert.match(r.cost_per_surviving_pr, /PR 7 not merged/);
});

// Findings from the review of PR 2.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

function withOrigin() {
  const root = product();
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'origin.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  return root;
}
import { join } from 'node:path';

function fakeGitHub() {
  const state = { comments: [], ready: 0, prs: 0, failReady: true, drafted: 0, readyAfterDraft: 0 };
  return {
    state,
    open: (slug, p) => { state.prs++; return { number: 9, html_url: 'pr', draft: true, ...p }; },
    find: () => null,
    gh: {
      findPR: () => ({ number: 9, draft: state.ready === 0 || state.drafted > state.readyAfterDraft, user: { login: 'civicsmith' } }),
      toDraft: () => { state.drafted++; state.readyAfterDraft = state.ready; return { draft: true }; },
      comments: () => state.comments,
      addComment: (s, n, body) => { state.comments.push({ body, html_url: `c${state.comments.length}`, user: { login: 'civicsmith' } }); return { html_url: 'c' }; },
      markReady: () => { if (state.failReady) { state.failReady = false; throw new Error('network'); } state.ready++; },
    },
  };
}

test('job start validates before branching and leaves no branch behind when it refuses', () => {
  const root = product();
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'process/ledger/alpha.json': entry('alpha', { status: { state: 'COMPLETE' } }) });
  git(['checkout', '-q', 'main'], { cwd: root });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet }), /COMPLETE, not OPEN/);
  assert.equal(git(['branch', '--list', 'job/alpha'], { cwd: root }), '');
});

test('job start restores a detached HEAD', () => {
  const root = product();
  const sha = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '--detach'], { cwd: root });
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  assert.equal(git(['rev-parse', 'HEAD'], { cwd: root }), sha);
});

test('job complete pushes before the receipt, and a rerun finishes without a second receipt', () => {
  const root = withOrigin();
  const f = fakeGitHub();
  jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  assert.throws(() => jobComplete(root, 'alpha', { gh: f.gh, log: quiet }), /network/);
  const tip = git(['rev-parse', 'HEAD'], { cwd: root });
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0], tip, 'pushed before the receipt');
  assert.equal(f.state.comments.length, 1);
  assert.equal(parseBlock(f.state.comments[0].body, 'p3:receipt').sha, tip);
  const said = [];
  const again = jobComplete(root, 'alpha', { gh: f.gh, log: (m) => said.push(m) });
  assert.equal(again.ok, true);
  // The job's report: the last line wakes BOB, from the job's own sender name.
  assert.match(said.at(-1), /^next act: wake BOB with `node \.process\/tool\/p3\.mjs send bob "job alpha complete, PR #\d+ ready: run status" --from job-alpha`, delivered with send_message to the address it prints$/);
  assert.equal(f.state.comments.length, 1, 'no second receipt');
  assert.equal(f.state.ready, 1);
  assert.equal(readRows(root, 'alpha').filter((r) => r.event === 'complete').length, 1);
});

test('block commits only its entry and can run again', () => {
  const root = product();
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  write(root, { 'src/alpha/wip.mjs': 'x' });
  git(['add', '-A'], { cwd: root });
  jobBlock(root, 'alpha', { reason: 'waiting on a name', push: false, log: quiet });
  assert.equal(git(['show', '--name-only', '--format=', 'HEAD'], { cwd: root }), 'process/ledger/alpha.json');
  jobBlock(root, 'alpha', { reason: 'waiting on a name', push: false, log: quiet });
});

test('block, pushed, ends with the wake of BOB from the job', () => {
  const root = withOrigin();
  const f = fakeGitHub();
  jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  const said = [];
  jobBlock(root, 'alpha', { reason: 'waiting on a name', log: (m) => said.push(m) });
  assert.equal(said.at(-1), `next act: wake BOB with \`node .process/tool/p3.mjs send bob "job alpha BLOCKED: run status" --from job-alpha\`, delivered with send_message to the address it prints`);
  assert.equal(jobSender('a'.repeat(50)).length, 40);
});

test('after a failed push, a rerun posts the saved receipt for the COMPLETE commit', () => {
  const root = withOrigin();
  const f = fakeGitHub();
  f.state.failReady = false;
  jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  git(['config', 'remote.origin.pushurl', '/nonexistent/origin.git'], { cwd: root });
  assert.throws(() => jobComplete(root, 'alpha', { gh: f.gh, log: quiet }), /run job complete again/);
  assert.equal(f.state.comments.length, 0);
  git(['config', '--unset', 'remote.origin.pushurl'], { cwd: root });
  assert.equal(jobComplete(root, 'alpha', { gh: f.gh, log: quiet }).ok, true);
  assert.equal(f.state.comments.length, 1);
  const r = parseBlock(f.state.comments[0].body, 'p3:receipt');
  assert.equal(r.sha, git(['rev-parse', 'HEAD'], { cwd: root }));
  assert.equal(r.commands.find((c) => c.suite).exit, 0);
});

// Copy PR 40, 4 Nov: a COMPLETE job's rerun with a new --exempt-revert was ignored, the saved
// receipt replayed, and the gate stayed red with no way to amend it but a restart.
function completed() {
  const root = withOrigin();
  const f = fakeGitHub();
  f.state.failReady = false;
  jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  jobComplete(root, 'alpha', { gh: f.gh, notVerified: ['the live site'], log: quiet });
  return { root, f };
}

test('a COMPLETE job rerun with --exempt-revert posts one amended receipt at the same commit', () => {
  const { root, f } = completed();
  const tip = git(['rev-parse', 'HEAD'], { cwd: root });
  assert.equal(f.state.comments.length, 1);
  jobComplete(root, 'alpha', { gh: f.gh, exemptRevert: 'filter-only test edits', log: quiet });
  assert.equal(f.state.comments.length, 2, 'the amended receipt is posted');
  assert.match(f.state.comments[1].body, /Amended receipt for job `alpha`/);
  const r = parseBlock(f.state.comments[1].body, 'p3:receipt');
  assert.equal(r.sha, tip, 'same commit');
  assert.equal(r.attempt, 1);
  assert.deepEqual(r.exempt, { revert: 'filter-only test edits' });
  assert.deepEqual(r.not_verified, ['the live site']);
  assert.deepEqual(r.amended.was, { exempt: {}, not_verified: ['the live site'] });
  assert.equal(r.commands.find((c) => c.suite).exit, 0, 'the commands are the saved run, not a new one');
  assert.equal(git(['rev-parse', 'HEAD'], { cwd: root }), tip, 'nothing committed');
  assert.equal(readRows(root, 'alpha').filter((x) => x.event === 'complete').length, 1);
  // The same claims again post nothing; a plain rerun posts nothing either.
  jobComplete(root, 'alpha', { gh: f.gh, exemptRevert: 'filter-only test edits', log: quiet });
  jobComplete(root, 'alpha', { gh: f.gh, log: quiet });
  assert.equal(f.state.comments.length, 2);
});

test('an amended receipt only adds not-verified lines, and a rerun naming no change posts nothing', () => {
  const { root, f } = completed();
  jobComplete(root, 'alpha', { gh: f.gh, notVerified: ['the live site'], log: quiet });
  assert.equal(f.state.comments.length, 1, 'a line already there is no change');
  jobComplete(root, 'alpha', { gh: f.gh, notVerified: ['the walker'], log: quiet });
  const r = parseBlock(f.state.comments[1].body, 'p3:receipt');
  assert.deepEqual(r.not_verified, ['the live site', 'the walker'], 'kept, never dropped');
  assert.deepEqual(r.exempt, {});
});

test('a second amendment keeps the first one\'s claims, in either order (review of PR 64)', () => {
  for (const order of [['nv', 'ex'], ['ex', 'nv']]) {
    const { root, f } = completed();
    for (const k of order) jobComplete(root, 'alpha', { gh: f.gh, ...(k === 'nv' ? { notVerified: ['the walker'] } : { exemptRevert: 'why' }), log: quiet });
    assert.equal(f.state.comments.length, 3, order.join(','));
    const r = parseBlock(f.state.comments[2].body, 'p3:receipt');
    assert.deepEqual(r.exempt, { revert: 'why' }, order.join(','));
    assert.deepEqual(r.not_verified, ['the live site', 'the walker'], order.join(','));
    assert.deepEqual(r.amended.was, order[0] === 'nv' ? { exempt: {}, not_verified: ['the live site', 'the walker'] } : { exempt: { revert: 'why' }, not_verified: ['the live site'] });
    // the same claims once more post nothing
    jobComplete(root, 'alpha', { gh: f.gh, exemptRevert: 'why', notVerified: ['the walker'], log: quiet });
    assert.equal(f.state.comments.length, 3);
  }
});

test('a COMPLETE job may amend with .process moved to a newer pin; a WORKING job may not', () => {
  const tool = makeRepo({ 'tool/x.mjs': 'export const v = 1;\n' });
  const sub = (root) => {
    git(['-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', tool, '.process'], { cwd: root });
    git(['commit', '-q', '-m', 'pin'], { cwd: root });
  };
  const bump = (root) => {
    commit(tool, { 'tool/x.mjs': `export const v = ${Date.now()};\n` });
    git(['-c', 'protocol.file.allow=always', 'fetch', '-q', 'origin'], { cwd: join(root, '.process') });
    git(['checkout', '-q', 'origin/HEAD'], { cwd: join(root, '.process') });
    assert.match(git(['status', '--porcelain', '--untracked-files=no'], { cwd: root }), /\.process/);
  };
  const w = withOrigin();
  git(['checkout', '-q', 'tranche'], { cwd: w });
  sub(w);
  git(['push', '-q', 'origin', 'tranche'], { cwd: w });
  git(['checkout', '-q', 'main'], { cwd: w });
  const g = fakeGitHub();
  g.state.failReady = false;
  jobStart(w, 'alpha', { coordinator: 's', setup: ready, open: g.open, find: g.find, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: w });
  git(['-c', 'protocol.file.allow=always', 'submodule', 'update', '-q', '--init'], { cwd: w });
  commit(w, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  bump(w);
  assert.throws(() => jobComplete(w, 'alpha', { gh: g.gh, log: quiet }), /commit your work first/, 'WORKING: a moved submodule is uncommitted work');
  git(['-c', 'protocol.file.allow=always', 'submodule', 'update', '-q'], { cwd: w });
  jobComplete(w, 'alpha', { gh: g.gh, log: quiet });
  bump(w);
  jobComplete(w, 'alpha', { gh: g.gh, exemptRevert: 'why', log: quiet });
  assert.equal(g.state.comments.length, 2);
  assert.equal(parseBlock(g.state.comments[1].body, 'p3:receipt').exempt.revert, 'why');
});

// Copy PR 79, 4 Nov: job site was COMPLETE, its gate went red, and it pushed fixes; job complete
// refused ("commits were added after it"), --reopen needs a merged PR and --restart WORKING.
// With the pull request open, a rerun after new commits completes a new attempt.
function redAndFixed() {
  const { root, f } = completed();
  const first = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['push', '-q', 'origin', 'HEAD:refs/heads/job/alpha'], { cwd: root });
  const fix = commit(root, { 'test/alpha/c.test.mjs': passing });
  return { root, f, first, fix };
}

test('a COMPLETE job with fix commits after it completes attempt 2: checks, suite, start row, COMPLETE, receipt, draft then ready', () => {
  const { root, f, first, fix } = redAndFixed();
  const fixAt = new Date(git(['log', '-1', '--format=%cI', fix], { cwd: root })).toISOString().replace(/\.\d+Z$/, 'Z');
  assert.equal(f.state.ready, 1);
  const r = jobComplete(root, 'alpha', { gh: f.gh, exemptRevert: 'browser test skips in CI without Chromium', log: quiet });
  assert.equal(r.ok, true);
  assert.equal(r.receipt.attempt, 2);
  assert.equal(r.receipt.after, first, 'names the COMPLETE commit it follows');
  const tip = git(['rev-parse', 'HEAD'], { cwd: root });
  assert.equal(r.receipt.sha, tip);
  assert.notEqual(tip, fix, 'a new COMPLETE commit');
  assert.equal(git(['rev-parse', 'HEAD^'], { cwd: root }), fix);
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0], tip, 'pushed');
  const suite = r.receipt.commands.find((c) => c.suite);
  assert.deepEqual([suite.exit, suite.tests.total], [0, 2], 'the suite ran again, with the fix');
  assert.deepEqual(r.receipt.exempt, { revert: 'browser test skips in CI without Chromium' });
  assert.equal(readEntry(root, 'alpha').status.state, 'COMPLETE');
  const rows = readRows(root, 'alpha');
  assert.deepEqual(rows.map((x) => [x.event, x.attempt]), [['start', 1], ['complete', 1], ['start', 2], ['complete', 2]]);
  assert.equal(rows[2].at, fixAt, 'attempt 2 starts at its first commit');
  assert.deepEqual(rows[2].again, { after: first, pr: 9 });
  assert.equal(rows[3].receipt.attempt, 2);
  // Only its records (the entry is unchanged when both completes fall in the same second).
  const names = git(['show', '--name-only', '--format=', 'HEAD'], { cwd: root }).split('\n');
  assert.ok(names.includes('process/metrics/alpha.jsonl') && names.every((n) => ['process/ledger/alpha.json', 'process/metrics/alpha.jsonl'].includes(n)), names.join(', '));
  assert.equal(f.state.drafted, 1, 'made a draft before the push');
  assert.equal(f.state.ready, 2, 'ready again after the receipt');
  assert.equal(f.state.comments.length, 2);
  const posted = parseBlock(f.state.comments[1].body, 'p3:receipt');
  assert.equal(posted.attempt, 2);
  assert.match(f.state.comments[1].body, /\nReceipt for job `alpha`, attempt 2,/);
  // A plain rerun at the new COMPLETE commit posts nothing and starts no attempt 3.
  jobComplete(root, 'alpha', { gh: f.gh, log: quiet });
  assert.equal(f.state.comments.length, 2);
  assert.equal(readRows(root, 'alpha').length, 4);
});

test('attempt 2 after the job merges an older tranche commit starts at its own first-parent commit, after attempt 1 (review of PR 81)', () => {
  const { root, f } = completed();
  const done = readRows(root, 'alpha').at(-1).at;
  const env = { ...process.env };
  try {
    process.env.GIT_COMMITTER_DATE = process.env.GIT_AUTHOR_DATE = '2020-01-01T00:00:00Z';
    git(['checkout', '-q', 'tranche'], { cwd: root });
    commit(root, { 'other.txt': 'older tranche work' });
    git(['push', '-q', 'origin', 'tranche'], { cwd: root });
    git(['checkout', '-q', 'job/alpha'], { cwd: root });
  } finally { process.env = env; }
  git(['merge', '-q', '--no-ff', '--no-edit', 'tranche'], { cwd: root });
  const mergeAt = new Date(git(['log', '-1', '--format=%cI'], { cwd: root })).toISOString().replace(/\.\d+Z$/, 'Z');
  jobComplete(root, 'alpha', { gh: f.gh, log: quiet });
  const s2 = readRows(root, 'alpha').filter((x) => x.event === 'start')[1];
  assert.ok(s2.at >= done, `${s2.at} is not before attempt 1's complete ${done}`);
  assert.equal(s2.at, mergeAt < done ? done : mergeAt);
});

test('attempt 2 on a red suite writes nothing and leaves attempt 1 COMPLETE', () => {
  const { root, f } = completed();
  const before = commit(root, { 'test/alpha/b.test.mjs': failing });
  assert.equal(jobComplete(root, 'alpha', { gh: f.gh, log: quiet }).ok, false);
  assert.equal(git(['rev-parse', 'HEAD'], { cwd: root }), before);
  assert.equal(readRows(root, 'alpha').length, 2);
  assert.equal(f.state.comments.length, 1);
});

test('the same-commit amendment works on attempt 2 and keeps its attempt number', () => {
  const { root, f } = redAndFixed();
  jobComplete(root, 'alpha', { gh: f.gh, log: quiet });
  const tip = git(['rev-parse', 'HEAD'], { cwd: root });
  jobComplete(root, 'alpha', { gh: f.gh, exemptRevert: 'why', log: quiet });
  assert.equal(git(['rev-parse', 'HEAD'], { cwd: root }), tip, 'nothing committed');
  assert.equal(f.state.comments.length, 3);
  assert.match(f.state.comments[2].body, /\nAmended receipt for job `alpha`, attempt 2,/);
  const r = parseBlock(f.state.comments[2].body, 'p3:receipt');
  assert.deepEqual([r.attempt, r.sha, r.exempt.revert], [2, tip, 'why']);
  assert.equal(readRows(root, 'alpha').filter((x) => x.event === 'start').length, 2);
});

test('a COMPLETE job whose pull request merged is refused, and named --reopen', () => {
  const { root, f } = completed();
  commit(root, { 'src/alpha/index.mjs': 'export const x = 2;\n' });
  f.gh.findPR = () => null;
  assert.throws(() => jobComplete(root, 'alpha', { gh: f.gh, log: quiet }), /alpha is COMPLETE and job\/alpha has no open pull request; a new attempt on a merged module is job start alpha --reopen/);
  assert.equal(readRows(root, 'alpha').length, 2);
});

test('merge passes on a green gate run that checked attempt 2, and refuses one that checked attempt 1', () => {
  const { root, f } = redAndFixed();
  jobComplete(root, 'alpha', { gh: f.gh, exemptRevert: 'why', log: quiet });
  const tip = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const run = (attempt, id) => ({ id, body: block(GATE, { runs: [{ sha: tip, ok: true, receipt: 'agrees', receipt_attempt: attempt, run_id: id }] }), user: { login: 'github-actions[bot]' } });
  const mk = (gate) => ({
    getPR: () => ({ number: 9, state: 'open', draft: false, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: 'job/alpha', sha: tip } }),
    comments: () => [...f.state.comments, gate],
    checkRun: () => ({ status: 'completed', conclusion: 'success', html_url: 'run' }),
    verify: () => true,
    mergePR: () => ({ merged: true, sha: 'm'.repeat(40) }),
  });
  assert.throws(() => merge(root, 9, { slug: 'o/r', io: mk(run(1, 11)), reviewed: 'fresh worker', rounds: 1, log: quiet }), /checked receipt attempt 2/);
  const r = merge(root, 9, { slug: 'o/r', io: mk(run(2, 12)), reviewed: 'fresh worker', rounds: 1, log: quiet });
  assert.equal(r.merged, true);
});

// --reopen (Bob's decision 1A, 2 Nov 2026).
function mergedOnce() {
  const root = withOrigin();
  const f = fakeGitHub();
  f.state.failReady = false;
  jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  jobComplete(root, 'alpha', { gh: f.gh, log: quiet });
  // BOB merges: the tranche takes the job's tip.
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '--no-edit', 'job/alpha'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, f }; // the local job/alpha from attempt 1 stays, as in BOB's own checkout
}

test('a COMPLETE module needs --reopen, and the refusal says so', () => {
  const { root, f } = mergedOnce();
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet }), /needs --reopen/);
});

test('--reopen starts attempt 2 from the tranche, with a fast-forward push and the task in the START', () => {
  const { root, f } = mergedOnce();
  const old = git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0];
  const r = jobStart(root, 'alpha', { coordinator: 's', setup: ready, reopen: 'strengthen the R1 test', open: f.open, find: f.find, log: quiet });
  assert.equal(r.attempt, 2);
  assert.match(r.start, /attempt 2/);
  assert.match(r.start, /What it must do: strengthen the R1 test/);
  const tip = git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0];
  assert.notEqual(tip, old);
  assert.equal(git(['merge-base', '--is-ancestor', old, tip], { cwd: root, allowFail: true }).code, 0, 'a fast-forward');
  const entry = JSON.parse(git(['show', `${tip}:process/ledger/alpha.json`], { cwd: root }));
  assert.equal(entry.status.state, 'WORKING');
  assert.match(entry.status.reason, /reopened: strengthen/);
  assert.equal(f.state.prs, 2, 'a new pull request');
});

test('--reopen is refused while the old attempt is unmerged or its PR is open, and for a module not COMPLETE', () => {
  const root = withOrigin();
  const f = fakeGitHub();
  jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet });
  // WORKING, not merged: an unfinished start resumes rather than reopening.
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', setup: ready, reopen: 'x', open: f.open, find: () => ({ number: 9 }), log: quiet }), /open pull request/);
  const fresh = product();
  assert.throws(() => jobStart(fresh, 'alpha', { coordinator: 's', reopen: 'x', push: false, log: quiet }), /--reopen is for a COMPLETE module/);
  const m = mergedOnce();
  assert.throws(() => jobStart(m.root, 'alpha', { coordinator: 's', setup: ready, reopen: 'x', open: m.f.open, find: () => ({ number: 9 }), log: quiet }), /reopen only after it merges/);
  assert.throws(() => jobStart(m.root, 'alpha', { coordinator: 's', setup: ready, reopen: true, open: m.f.open, find: m.f.find, log: quiet }), /needs what the new attempt must do/);
});

test('a reopen moves the local branch left by attempt 1, and a failed push puts it back', () => {
  const { root, f } = mergedOnce();
  const was = git(['rev-parse', 'job/alpha'], { cwd: root });
  git(['config', 'remote.origin.pushurl', '/nonexistent/repo.git'], { cwd: root });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', setup: ready, reopen: 'x', open: f.open, find: f.find, log: quiet }));
  assert.equal(git(['rev-parse', 'job/alpha'], { cwd: root }), was, 'back where it was, not deleted');
  git(['config', '--unset', 'remote.origin.pushurl'], { cwd: root });
  assert.equal(jobStart(root, 'alpha', { coordinator: 's', setup: ready, reopen: 'x', open: f.open, find: f.find, log: quiet }).attempt, 2);
});

test('a local job branch with work the tranche lacks is refused, not moved', () => {
  const { root, f } = mergedOnce();
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/more.mjs': 'export const y = 2;\n' });
  git(['checkout', '-q', 'main'], { cwd: root });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', setup: ready, reopen: 'x', open: f.open, find: f.find, log: quiet }), /commits the tranche does not have/);
});

test('a reopened start whose PR failed resumes with its task in the START', () => {
  const { root, f } = mergedOnce();
  let fails = true;
  const open = (slug, p) => { if (fails) { fails = false; throw new Error('network'); } return f.open(slug, p); };
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', setup: ready, reopen: 'strengthen the R1 test', open, find: f.find, log: quiet }), /network/);
  const notes = [];
  const r = jobStart(root, 'alpha', { coordinator: 's', setup: ready, open, find: f.find, log: (m) => notes.push(m) });
  assert.equal(r.resumed, true);
  assert.equal(r.attempt, 2);
  assert.match(r.start, /What it must do: strengthen the R1 test/);
  assert.match(r.pr.body, /What it must do: strengthen the R1 test/);
  const again = jobStart(mergedOnce().root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet, reopen: 'y' });
  assert.equal(again.attempt, 2);
});

test('a reopen never moves a branch another worktree has checked out', () => {
  const { root, f } = mergedOnce();
  const wt = join(mkdtempSync(join(tmpdir(), 'p3-wt-')), 'wt');
  git(['worktree', 'add', '-q', wt, 'job/alpha'], { cwd: root });
  const was = git(['rev-parse', 'job/alpha'], { cwd: root });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', setup: ready, reopen: 'x', open: f.open, find: f.find, log: quiet }), /checked out in a worktree/);
  assert.equal(git(['rev-parse', 'job/alpha'], { cwd: root }), was);
});

test('status: an unfinished start says to rerun job start; offline it does not claim merged', () => {
  const { root, f } = mergedOnce();
  let fails = true;
  const open = (slug, p) => { if (fails) { fails = false; throw new Error('network'); } return f.open(slug, p); };
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', setup: ready, reopen: 'x', open, find: f.find, log: quiet }), /network/);
  git(['remote', 'set-url', 'origin', git(['remote', 'get-url', 'origin'], { cwd: root })], { cwd: root });
  const out = [];
  status(root, { log: (m) => out.push(m), io: { openPRs: () => [], checkRun: () => null } });
  assert.match(out.join('\n'), /alpha: COMPLETE; on its branch WORKING \(reopened: x\), 1 commit\(s\) ahead; FLAG an unfinished start/);
  const off = [];
  status(root, { offline: true, log: (m) => off.push(m) });
  assert.match(off.join('\n'), /PR unknown \(GitHub not read\)/);
  assert.match(off.join('\n'), /offline, pull requests not read/);
});

// Build 1 (start loop): decision 14, the coordinator's subscription, and GAT-5 in `test`.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { MARK, install, moduleLocks } from '../lib/suite.mjs';
import { createHash } from 'node:crypto';

test('the START divides the labour: deploys and releases are the coordinator\'s, local wrangler runs the job\'s', () => {
  const root = product();
  const { start } = jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  const line = start.split('\n').find((l) => l.startsWith('Not yours'));
  assert.match(line, /^Not yours, and this line wins over any act above:/);
  assert.match(line, /deploying, releasing, release signing and acting on a live site \(the coordinator's; local wrangler and miniflare builds and tests are yours\)/);
  assert.doesNotMatch(start, /keys|secret|Cloudflare account/);
});

test('job start prints the subscription after the launch, on a fresh start and on a resume', () => {
  const root = withOrigin();
  const f = fakeGitHub();
  const out = [];
  const r = jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: (m) => out.push(m) });
  const slug = r.launch.source_url.replace('https://github.com/', '');
  const [owner, repo] = slug.split('/');
  assert.deepEqual(r.subscribe, { owner, repo, pullNumber: 9 });
  const at = (re) => out.findIndex((m) => re.test(m));
  assert.ok(at(/create_session/) >= 0 && at(/subscribe_pr_activity/) > at(/create_session/), out.join('\n---\n'));
  assert.match(out[at(/subscribe_pr_activity/)], /"pullNumber": 9/);

  // A resume: the branch is pushed, the PR never opened.
  const m = mergedOnce();
  let fails = true;
  const open = (s, p) => { if (fails) { fails = false; throw new Error('network'); } return m.f.open(s, p); };
  assert.throws(() => jobStart(m.root, 'alpha', { coordinator: 's', setup: ready, reopen: 'x', open, find: m.f.find, log: quiet }), /network/);
  const out2 = [];
  const r2 = jobStart(m.root, 'alpha', { coordinator: 's', setup: ready, open, find: m.f.find, log: (x) => out2.push(x) });
  assert.equal(r2.resumed, true);
  assert.equal(r2.subscribe.pullNumber, 9);
  assert.ok(out2.findIndex((x) => /subscribe_pr_activity/.test(x)) > out2.findIndex((x) => /create_session/.test(x)));
});

// A product whose module alpha needs lock files, and an exec that stands for npm ci.
const lock = (deps) => JSON.stringify({ lockfileVersion: 3, packages: { '': {}, ...(deps ? { 'node_modules/x': { version: '1.0.0' } } : {}) } }) + '\n';
function locked(lockfiles, files) {
  const root = product();
  commit(root, { 'process/config.json': { lockfiles }, ...files });
  const calls = [];
  const exec = (cmd, args, o) => { calls.push({ cmd: [cmd, ...args].join(' '), cwd: o.cwd.slice(root.length + 1) || '.', unset: o.unset }); return { code: 0, stdout: '', stderr: '' }; };
  return { root, calls, exec };
}

test('test installs the module\'s lock files, and only those', () => {
  const { root, calls, exec } = locked(['package-lock.json', 'test/package-lock.json', './src/alpha/sub/package-lock.json', 'other/package-lock.json', 'fresh/package-lock.json'],
    { 'package-lock.json': lock(true), 'test/package-lock.json': lock(true), 'src/alpha/sub/package-lock.json': lock(true), 'other/package-lock.json': lock(true) });
  const r = jobTest(root, 'alpha', { exec, log: quiet });
  assert.equal(r.ok, true);
  assert.deepEqual(calls.map((c) => c.cwd), ['.', 'test', 'src/alpha/sub']);
  assert.ok(calls.every((c) => /^npm ci /.test(c.cmd)));
  assert.equal(r.tests.pass, 1);
});

test('freshness is the lock file\'s hash left by a good install; a lock with no dependencies is fresh', () => {
  const { root, calls, exec } = locked(['test/package-lock.json', 'src/alpha/package-lock.json'], { 'test/package-lock.json': lock(true), 'src/alpha/package-lock.json': lock(false) });
  jobTest(root, 'alpha', { exec, log: quiet });
  assert.deepEqual(calls.map((c) => c.cwd), ['test'], 'no dependencies: nothing to install');
  assert.ok(existsSync(join(root, 'test/node_modules', MARK)));
  calls.length = 0;
  jobTest(root, 'alpha', { exec, log: quiet });
  assert.deepEqual(calls, [], 'the hash matches: fresh');
  writeFileSync(join(root, 'test/package-lock.json'), lock(true).replace('1.0.0', '1.0.1'));
  jobTest(root, 'alpha', { exec, log: quiet });
  assert.deepEqual(calls.map((c) => c.cwd), ['test'], 'the lock changed: installed again');
  // A failed install leaves no mark of the new lock, so the next run tries again.
  const newLock = lock(true).replace('1.0.0', '2.0.0');
  writeFileSync(join(root, 'test/package-lock.json'), newLock);
  const bad = jobTest(root, 'alpha', { exec: () => ({ code: 1, stdout: '', stderr: 'npm ERR! offline' }), log: quiet });
  assert.equal(bad.ok, false);
  assert.match(bad.install.findings[0].message, /npm ci failed: npm ERR! offline/);
  assert.notEqual(readFileSync(join(root, 'test/node_modules', MARK), 'utf8').trim(), createHash('sha256').update(newLock).digest('hex'));
  calls.length = 0;
  jobTest(root, 'alpha', { exec, log: quiet });
  assert.deepEqual(calls.map((c) => c.cwd), ['test']);
});

test('test stops, red, when a lock file it needs is missing', () => {
  const { root } = locked(['test/alpha/package-lock.json'], {});
  const out = [];
  const r = jobTest(root, 'alpha', { exec: () => { throw new Error('not run'); }, log: (m) => out.push(m) });
  assert.equal(r.ok, false);
  assert.match(out.join('\n'), /install: test\/alpha\/package-lock.json: lock file not found/);
});

test('moduleLocks matches paths however they are written', () => {
  const e = entry('alpha', { paths: ['./src/alpha/'], tests: ['test\\alpha'] });
  assert.deepEqual(moduleLocks(['./package-lock.json', 'src\\alpha\\pkg\\package-lock.json', './test//alpha/../alpha/package-lock.json', 'src/package-lock.json', 'src/beta/package-lock.json', 'src/alphabet/package-lock.json'], e),
    ['./package-lock.json', 'src\\alpha\\pkg\\package-lock.json', './test//alpha/../alpha/package-lock.json', 'src/package-lock.json']);
});

test('test, job complete and their installs run product code without the GitHub tokens, and with everything else', () => {
  const probe = "import test from 'node:test'; import a from 'node:assert';\n"
    + "test('env', () => { a.equal(process.env.GH_TOKEN, undefined); a.equal(process.env.GITHUB_TOKEN, undefined); a.equal(process.env.CLOUDFLARE_API_TOKEN, 'deploy'); });\n";
  const { root, calls, exec } = locked(['test/package-lock.json'], { 'test/package-lock.json': lock(true), 'test/alpha/env.test.mjs': probe });
  const keep = { CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN, GH_TOKEN: process.env.GH_TOKEN, GITHUB_TOKEN: process.env.GITHUB_TOKEN };
  Object.assign(process.env, { CLOUDFLARE_API_TOKEN: 'deploy', GH_TOKEN: 'secret', GITHUB_TOKEN: 'secret' });
  try {
    const t = jobTest(root, 'alpha', { exec, log: quiet });
    assert.equal(t.ok, true, t.output);
    assert.ok(calls[0].unset.includes('GH_TOKEN') && calls[0].unset.includes('GITHUB_TOKEN'));
    assert.ok(!calls[0].unset.includes('CLOUDFLARE_API_TOKEN'));
    // job complete: its install runs first, then its suite, both without the tokens.
    git(['branch', '-f', 'tranche', 'main'], { cwd: root });
    jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
    git(['checkout', '-q', 'job/alpha'], { cwd: root });
    writeFileSync(join(root, 'test/package-lock.json'), lock(true).replace('1.0.0', '3.0.0'));
    commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
    calls.length = 0;
    const c = jobComplete(root, 'alpha', { push: false, exec, log: quiet });
    assert.equal(c.ok, true);
    assert.deepEqual(calls.map((x) => x.cwd), ['test'], 'job complete installs the stale lock first');
    assert.deepEqual(c.receipt.commands.filter((x) => /npm ci|node --test/.test(x.cmd)).map((x) => [x.cmd.split(' ')[0], x.exit]), [['npm', 0], ['node', 0]]);
    assert.equal(c.receipt.commands.find((x) => x.suite).tests.pass, 2);
  } finally {
    for (const [k, v] of Object.entries(keep)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});

test('job start reprints the launch and the subscription when the pull request is already open', () => {
  const root = withOrigin();
  const f = fakeGitHub();
  const first = jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet });
  const out = [];
  const again = jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: () => first.pr, log: (m) => out.push(m) });
  assert.equal(again.resumed, true);
  assert.equal(f.state.prs, 1, 'no second pull request');
  assert.equal(again.pr.number, 9);
  assert.match(out.join('\n'), /Use this launch only when no job session is running for it: check your sessions first[\s\S]*create_session[\s\S]*already open[\s\S]*subscribe_pr_activity/);
  // A job with work on its branch is never launched twice.
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  git(['push', '-q', 'origin', 'job/alpha'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: () => first.pr, log: quiet }), /with an open pull request and is not an unfinished start \(WORKING, 2 commits\)/);
});

// Confirming review of PR 11.
test('job complete installs the module\'s stale lock files before its checks, with or without --no-suite', () => {
  const marker = "import { existsSync } from 'node:fs'; if (!existsSync('test/node_modules/.p3-lock-hash')) process.exit(3);\n";
  for (const noSuite of [false, true]) {
    const { root, calls, exec } = locked(['test/package-lock.json'], { 'test/package-lock.json': lock(true), 'check.mjs': marker });
    git(['checkout', '-q', 'tranche'], { cwd: root });
    git(['checkout', '-q', 'main'], { cwd: root });
    git(['branch', '-f', 'tranche', 'main'], { cwd: root });
    // The module's own check needs the install's mark.
    const e = JSON.parse(readFileSync(join(root, 'process/ledger/alpha.json'), 'utf8'));
    e.checks = [['node', 'check.mjs']];
    commit(root, { 'process/ledger/alpha.json': JSON.stringify(e, null, 2) + '\n' });
    git(['branch', '-f', 'tranche', 'main'], { cwd: root });
    jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
    git(['checkout', '-q', 'job/alpha'], { cwd: root });
    commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
    const c = jobComplete(root, 'alpha', { push: false, noSuite, exec, log: quiet });
    assert.equal(c.ok, true, JSON.stringify(c.commands));
    assert.deepEqual(calls.map((x) => x.cwd), ['test'], `installed (noSuite ${noSuite})`);
    const names = c.receipt.commands.map((x) => x.cmd);
    assert.ok(names.indexOf('npm ci (test/package-lock.json)') < names.indexOf('node check.mjs'), names.join(' | '));
  }
});

test('install reads and checks the lock file at its normalised path', () => {
  const root = makeRepo({ 'test/package-lock.json': lock(true) });
  const calls = [];
  const exec = (cmd, args, o) => { calls.push(o.cwd.slice(root.length + 1)); return { code: 0, stdout: '', stderr: '' }; };
  const r = install(root, ['.\\test\\package-lock.json'], { onlyStale: true, exec });
  assert.deepEqual(r.findings, []);
  assert.deepEqual(calls, ['test']);
  assert.deepEqual(install(root, ['.\\test\\package-lock.json'], { onlyStale: true, exec }).ran, [], 'fresh by its mark');
});

// Review follow-ups, 2 Nov: measured, the only refused merge into main was chained with an
// unrelated script; the START says each judged act is its own shell command.
test('the START says each judged act is its own shell command, never chained with another', () => {
  const root = product();
  const { start } = jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  const lines = start.split('\n').filter((l) => /judged act/.test(l));
  assert.deepEqual(lines, ['Give each judged act (a push, a session start) its own shell command: no `&&`, `||`, `;`, pipe or second line joins it to anything.']);
});

// JOB-6: recovery by replacement.
test('--restart prints a replacement START from the branch and the PR, from the tranche tip, and records one restart row, nothing else', () => {
  const root = withOrigin();
  const f = fakeGitHub();
  jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' }, 'half the work');
  git(['push', '-q', 'origin', 'job/alpha'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const refs = () => git(['ls-remote', 'origin'], { cwd: root }).split('\n').filter((l) => !l.endsWith('refs/heads/process-state')).join('\n');
  const before = refs();
  const pushed = new Date(git(['log', '-1', '--format=%cI', 'origin/job/alpha'], { cwd: root })).toISOString();
  const pr = { number: 9, html_url: 'https://x/pull/9', user: { login: 'job' } };
  const r = jobStart(root, 'alpha', { coordinator: 's', restart: 'its session stopped answering after 40 minutes', find: () => pr, notes: () => [], log: quiet });
  assert.equal(refs(), before, 'no branch, no push but the state branch');
  // One row on the state branch, for lead times' replace: the time, the why, and the stop (its last push).
  git(['fetch', '-q', 'origin', '+refs/heads/process-state:refs/remotes/origin/process-state'], { cwd: root });
  const rows = git(['show', 'origin/process-state:metrics/restart.jsonl'], { cwd: root }).trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(rows.length, 1);
  assert.deepEqual({ ...rows[0], at: typeof rows[0].at }, { row: 'restart', at: 'string', tranche: 'tranche', module: 'alpha', why: 'its session stopped answering after 40 minutes', pr: 9, state: 'WORKING', stopped: pushed, stopped_by: 'last push' });
  assert.deepEqual(r.row, rows[0]);
  assert.equal(f.state.prs, 1, 'no new pull request');
  assert.match(r.start, /attempt 1, replacement session/);
  assert.match(r.start, /BOB saw: its session stopped answering after 40 minutes/);
  assert.match(r.start, /pull request https:\/\/x\/pull\/9 as it is \(last commit `[0-9a-f]+ half the work`; receipt none posted \(WORKING\)\)/);
  assert.match(r.start, /refused is never rerouted/);
  assert.match(r.start, /1\. `git fetch --depth 1 origin job\/alpha:refs\/remotes\/origin\/job\/alpha`/);
  assert.match(r.start, /2\. `git checkout -q -b job\/alpha origin\/job\/alpha`/);
  assert.match(r.start, /\| `req\/alpha.md` \| \d+ \|/);
  assert.equal(r.launch.source_revision, git(['rev-parse', 'origin/tranche'], { cwd: root }), 'the tranche tip commit');
  assert.deepEqual(r.subscribe.pullNumber, 9);
  // --stop: how the replaced session stopped, in the row (lead times' replace names its source).
  const again = jobStart(root, 'alpha', { coordinator: 's', restart: 'archived by mistake', stop: 'archived', find: () => pr, notes: () => [], log: quiet });
  assert.equal(again.row.stop, 'archived');
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', restart: 'x', stop: 'gone', find: () => pr, notes: () => [], log: quiet }), /--stop archived\|idle/);
});

test('--restart is refused for a COMPLETE module, without a branch or PR, and without a why', () => {
  const root = withOrigin();
  const pr = () => ({ number: 9 });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', restart: 'x', find: pr, notes: () => [], log: quiet }), /no branch job\/alpha/);
  const f = fakeGitHub();
  jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', restart: 'x', find: () => null, notes: () => [], log: quiet }), /no open pull request/);
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', restart: true, find: pr, notes: () => [], log: quiet }), /--restart needs why/);
  const m = mergedOnce();
  assert.throws(() => jobStart(m.root, 'alpha', { coordinator: 's', restart: 'x', find: pr, notes: () => [], log: quiet }), /COMPLETE; a new attempt on a merged module is --reopen/);
});

// P7: the receipt names the test for each mark the job struck.
test('job complete names a test for each struck mark, and refuses before marking when one is missing or wrong', () => {
  const root = product();
  commit(root, { 'req/alpha.md': '# alpha\n\n- **R1** *(not yet met: no x)* does x.\n- **R2** *(not yet met: no y)* does y.\n- **R3** done.\n' });
  git(['branch', '-f', 'tranche', 'main'], { cwd: root });
  const { start } = jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  assert.match(start, /--test R<id>="<test file>::<test name>"/);
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, {
    'req/alpha.md': '# alpha\n\n- **R1** does x.\n- **R2** *(not yet met: no y)* does y.\n- **R3** done.\n',
    'test/alpha/x.test.mjs': "import test from 'node:test'; test('R1 x at the interface', () => {});\n",
    'src/alpha/x.mjs': "export const x = 1;\n",
  });
  const tip = git(['rev-parse', 'HEAD'], { cwd: root });
  const run = (tests) => jobComplete(root, 'alpha', { push: false, tests, log: quiet });
  assert.throws(() => run([]), /struck R1 with no --test/);
  assert.throws(() => run(['R1=src/alpha/x.mjs::x']), /not in the module's tests/);
  assert.throws(() => run(['R1=test/alpha/x.test.mjs::R1 y']), /does not contain "R1 y"/);
  assert.throws(() => run(['R1=test/alpha/x.test.mjs::R1 x', 'R2=test/alpha/x.test.mjs::R1 x']), /no mark for R2 that this branch struck/);
  assert.throws(() => run(['R1 test/alpha/x.test.mjs']), /write it as R<id>=/);
  assert.equal(git(['rev-parse', 'HEAD'], { cwd: root }), tip, 'nothing committed');
  assert.equal(readEntry(root, 'alpha').status.state, 'WORKING');
  const r = run(['R1=test/alpha/x.test.mjs::R1 x at the interface']);
  assert.equal(r.ok, true);
  assert.deepEqual(r.receipt.tests, [{ req: 'R1', file: 'test/alpha/x.test.mjs', name: 'R1 x at the interface' }]);
});

test('metrics report: BOB\'s idle time per day, and the overhead share per job and per layer', () => {
  const idle = idleByDay([
    { at: '2026-11-01T01:00:00Z', row: 'sweep', bob_acts: true, bob_quiet_h: 0.5 },
    { at: '2026-11-01T02:00:00Z', row: 'sweep', bob_acts: true, bob_quiet_h: 1.5 },
    { at: '2026-11-01T03:00:00Z', row: 'sweep', bob_acts: false, bob_quiet_h: null },
    { at: '2026-11-02T01:00:00Z', row: 'sweep', bob_acts: 'unmeasured', bob_quiet_h: null },
    { at: '2026-11-02T02:00:00Z', row: 'sweep', bob_acts: true, bob_quiet_h: 3 },
  ]);
  assert.deepEqual(idle, [{ day: '2026-11-01', occurrences: 2, longest_quiet_h: 1.5, unmeasured_sweeps: 0 }, { day: '2026-11-02', occurrences: 1, longest_quiet_h: 3, unmeasured_sweeps: 1 }]);
  assert.equal(idleByDay([]), 'unmeasured');
  const at = (h) => `2026-11-01T${String(h).padStart(2, '0')}:00:00Z`;
  const m = (module, h, role, cost, session = 's') => ({ at: at(h), module, row: 'attempt', event: 'measured', role, session, cost_usd: cost });
  const rows = [
    { at: at(1), module: 'a', row: 'attempt', event: 'start' },
    { at: at(1), module: 'b', row: 'attempt', event: 'start' },
    m('a', 2, 'job', 6), m('a', 2, 'review', 1), m('b', 2, 'job', 'unmeasured'),
    m('bob', 3, 'bob', 4, 'session_bob'), // 4 split over a and b
    { at: at(4), module: 'c', row: 'attempt', event: 'start' }, m('c', 5, 'job', 3),
    m('bob', 6, 'bob', 7, 'session_bob'), // cumulative: 3 more, all to c
    m('bob', 7, 'bob', 2, 'session_bob2'), // a new BOB, nothing open since: unattributed
  ];
  const o = overhead(rows, layerOf('| Layer | Modules |\n|---|---|\n| 1 | `a`, `b` |\n| 2 | c |\n'));
  const job = (id) => o.jobs.find((j) => j.module === id);
  assert.deepEqual([job('a').job_usd, job('a').reviews_usd, job('a').bob_usd, job('a').root_usd, job('a').share], [6, 1, 2, 'unmeasured', 0.3333]);
  assert.deepEqual(job('a').unmeasured, ['root', 'gate']);
  assert.deepEqual([job('b').job_usd, job('b').reviews_usd, job('b').bob_usd, job('b').share], ['unmeasured', 'unmeasured', 2, 'unmeasured']);
  assert.deepEqual([job('c').bob_usd, job('c').share, job('c').layer], [3, 0.5, 2]);
  assert.deepEqual(o.layers.map((l) => [l.layer, l.share]), [[1, 'unmeasured'], [2, 0.5]]);
  assert.ok(o.layers[0].unmeasured.includes('b job'));
  assert.equal(o.unattributed_usd, 2);
  assert.equal(o.jobs.some((j) => j.module === 'bob'), false);
  assert.match(o.rule, /even split/);
  assert.equal(overhead([m('a', 2, 'job', 6)]).jobs[0].bob_usd, 'unmeasured');
  // A job active after BOB's last row, or in a window a costless row ends, has BOB's part unmeasured.
  const later = overhead([...rows, { at: at(8), module: 'd', row: 'attempt', event: 'start' }, m('d', 9, 'job', 2)]);
  assert.deepEqual([later.jobs.find((j) => j.module === 'd').bob_usd, later.jobs.find((j) => j.module === 'd').unmeasured], ['unmeasured', ['reviews', 'bob', 'root', 'gate']]);
  const costless = overhead([m('e', 1, 'job', 2), m('bob', 2, 'bob', 'unmeasured', 'session_bob'), m('bob', 3, 'bob', 1, 'session_bob')]);
  assert.equal(costless.jobs[0].bob_usd, 'unmeasured');
  const spans = overhead([m('f', 1, 'job', 2), m('bob', 2, 'bob', 1, 'session_bob'), m('g', 3, 'job', 2), m('bob', 4, 'bob', 'unmeasured', 'session_bob'), m('h', 5, 'job', 2), m('bob', 6, 'bob', 3, 'session_bob')]);
  assert.deepEqual(spans.jobs.map((j) => [j.module, j.bob_usd]), [['f', 1], ['g', 'unmeasured'], ['h', 'unmeasured']]);
  assert.equal(spans.unattributed_usd, 2);
  assert.deepEqual(overhead([{ module: 'x', row: 'attempt', event: 'start' }]).jobs, []);
});

test('job start over requirements_cap prints the split owed and starts only with --over-cap (REQ-6)', () => {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha'),
    'process/config.json': { requirements_cap: 20 },
    'req/alpha.md': '# alpha\n\nR1 does a thing.\n',
    'test/alpha/a.test.mjs': passing,
  });
  git(['branch', 'tranche'], { cwd: root });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet }), /split or consolidate before its job: req\/alpha.md 26 over 20; nothing was started.*--over-cap/);
  assert.equal(git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root }), 'main');
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', push: false, overCap: true, log: quiet }), /--over-cap needs why/);
  const out = [];
  const { start } = jobStart(root, 'alpha', { coordinator: 's', push: false, overCap: 'one reading still', log: (m) => out.push(m) });
  assert.match(out.join('\n'), /req\/alpha.md 26 over 20; starting over the cap: one reading still/);
  assert.match(start, /Requirement file `req\/alpha.md`: 26 bytes against the cap of 20, over it\./);
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  assert.equal(readRows(root, 'alpha')[0].over_cap, 'one reading still');
});

test('job start under the cap shows the requirement file against it', () => {
  const root = product();
  const { start } = jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  assert.match(start, /Requirement file `req\/alpha.md`: 26 bytes against the cap of 70000\.$/m);
});

test('job start: a cap on unmet marks, or a cap written as a string, is the same trigger', () => {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha'),
    'process/config.json': { requirements_cap: '70000', requirements_cap_marks: 1 },
    'req/alpha.md': '- **R1** *(not yet met: x)* a\n- **R2** *(not yet met: x)* b\n',
    'test/alpha/a.test.mjs': passing,
  });
  git(['branch', 'tranche'], { cwd: root });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet }), /req\/alpha.md 2 unmet marks over 1; nothing was started/);
  const { start } = jobStart(root, 'alpha', { coordinator: 's', push: false, overCap: 'two marks, one reading', log: quiet });
  assert.match(start, /Requirement file `req\/alpha.md`: \d+ bytes against the cap of 70000, over it\./);
});

test('the START names the job\'s rulebook (TXT-5)', () => {
  const root = product();
  const { start } = jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  assert.ok(start.includes('`.process/rulebooks/job.md`'));
  assert.ok(!/rulebooks\/(bob|root|watcher|worker)\.md/.test(start));
});

// The gate race: finish's order is push, confirm it landed, receipt, then ready. The gate reads
// the draft state live (gate.test), so the push's run, if it is the one kept, judges the
// pull request ready; the receipt is posted before either run can read it.
test('job complete marks ready last: after the push landed and the receipt is posted', () => {
  const root = withOrigin();
  const f = fakeGitHub();
  f.state.failReady = false;
  const seen = [];
  const remote = () => git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0];
  f.gh.addComment = ((add) => (...a) => { seen.push(['receipt', remote()]); return add(...a); })(f.gh.addComment);
  f.gh.markReady = () => { seen.push(['ready', remote(), f.state.comments.length]); f.state.ready++; };
  jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  jobComplete(root, 'alpha', { gh: f.gh, log: quiet });
  const tip = git(['rev-parse', 'HEAD'], { cwd: root });
  assert.deepEqual(seen, [['receipt', tip], ['ready', tip, 1]]);
});

test('a mark with a parenthetical between its id and "(not yet met" is struck like any other, and needs its --test', () => {
  const root = product();
  // The copy's own shape (local-facts R23 and R25, 4 Nov), nested parentheses and all.
  commit(root, { 'req/alpha.md': '# alpha\n\n- **R1** (T53; N1257; DEC-151 (2); row 15; amends R10, R12) *(not yet met: T53; per C3)* **Does x.** Test: x.\n- **R2** (T53; `jurisdictions` R41) *(not yet met: T53; PLATFORM)* does y.\n' });
  git(['branch', '-f', 'tranche', 'main'], { cwd: root });
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, {
    'req/alpha.md': '# alpha\n\n- **R1** (T53; N1257; DEC-151 (2); row 15; amends R10, R12) **Does x.** Test: x.\n- **R2** (T53; `jurisdictions` R41) *(not yet met: T53; PLATFORM)* does y.\n',
    'test/alpha/x.test.mjs': "import test from 'node:test'; test('R1 x', () => {});\n",
    'src/alpha/x.mjs': 'export const x = 1;\n',
  });
  const run = (tests) => jobComplete(root, 'alpha', { push: false, tests, log: quiet });
  assert.throws(() => run([]), /struck R1 with no --test/);
  assert.throws(() => run(['R2=test/alpha/x.test.mjs::R1 x']), /no mark for R2 that this branch struck \(struck: R1\)/);
  assert.deepEqual(run(['R1=test/alpha/x.test.mjs::R1 x']).receipt.tests, [{ req: 'R1', file: 'test/alpha/x.test.mjs', name: 'R1 x' }]);
});

// Bob, 4 Nov: urgency in process3's initial release. A job's question to BOB waits at most
// decision_minutes, then goes once more to BOB and to ROOT; and the wake's send is the job's act
// (review of PR 72: "push to job/<id> only" forbade the state branch it writes).
test('the START: the escalation to ROOT after decision_minutes, its limits, and the wake as the job\'s act', () => {
  const e = entry('alpha', { title: 'Member sign-in and session handling', paths: ['src/alpha/', 'src/shared/alpha-client.mjs', 'worker/alpha/'], tests: ['test/alpha/', 'test/e2e/alpha.spec.mjs'] });
  const t = startText({ entry: e, slug: 'neobobkrause/civicsmith-copy', branch: 'job/alpha', tranche: 'tranche', coordinator: 'session_01RAN5ek9qx8mduYhfE77Ldc', bob: true, attempt: 1, reading: { files: [{ file: 'req/alpha.md', bytes: 100 }, { file: 'docs/alpha.md', bytes: 100 }], bytes: 200 }, rootId: 'session_01RAN5ek9qx8mduYhfE77Ldd', decisionMinutes: 30 });
  // The chain's last automatic step is the watcher, with the minutes unanswered (coordinator, 4 Nov).
  assert.ok(t.includes('No answer from BOB in 30 min: send it once more, then to ROOT `session_01RAN5ek9qx8mduYhfE77Ldd`, then the watcher, with the minutes, by send_message (`node .process/tool/p3.mjs address <role>`).'));
  assert.ok(t.includes('If reversible and in your module, act on your recommendation and note why in your PR; never a merge, a push off your branch, or what is not yours.'));
  assert.ok(t.includes('- the wake that job complete or block prints, and its send_message'));
  assert.ok(t.includes("pushing to any other branch yourself (the wake's send writes the state branch)"));
  assert.ok(Buffer.byteLength(t) <= 4096, `START ${Buffer.byteLength(t)} bytes`);
  const own = startText({ entry: { ...e, acts: ['only these'] }, slug: 'o/r', branch: 'job/alpha', tranche: 'tranche', coordinator: 's', attempt: 1, reading: { files: [], bytes: 0 } });
  assert.ok(own.includes('No answer from BOB in 30 min: send it once more, then to ROOT, then the watcher, with the minutes'), 'none addressed: address reads them');
  assert.ok(own.includes('- the wake that job complete or block prints'), 'an entry with its own acts keeps the wake');
});

test('a mark at the end of a requirement line, after its bold title, is struck like any other, and needs its --test', () => {
  const root = product();
  // The copy's acquisition R127 shape (the coordinator's ruling under P17, 4 Nov).
  commit(root, { 'req/alpha.md': '# alpha\n\n- **R1** (T53; N1259; K4403 (2)) **Reads in slices.** Control: no resume. *(not yet met: T53)*\n- **R2** (T53) **Does y.** *(not yet met: T53)*\n  (T53; R1: a continuation line) *(not yet met: T53)*\n' });
  git(['branch', '-f', 'tranche', 'main'], { cwd: root });
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, {
    // R1's mark struck; the continuation line's words are prose and stay as they were.
    'req/alpha.md': '# alpha\n\n- **R1** (T53; N1259; K4403 (2)) **Reads in slices.** Control: no resume.\n- **R2** (T53) **Does y.** *(not yet met: T53)*\n  (T53; R1: a continuation line) *(not yet met: T53)*\n',
    'test/alpha/x.test.mjs': "import test from 'node:test'; test('R1 slices', () => {});\n",
    'src/alpha/x.mjs': 'export const x = 1;\n',
  });
  const run = (tests) => jobComplete(root, 'alpha', { push: false, tests, log: quiet });
  assert.throws(() => run([]), /struck R1 with no --test/);
  assert.throws(() => run(['R2=test/alpha/x.test.mjs::R1 slices']), /no mark for R2 that this branch struck \(struck: R1\)/);
  assert.deepEqual(run(['R1=test/alpha/x.test.mjs::R1 slices']).receipt.tests, [{ req: 'R1', file: 'test/alpha/x.test.mjs', name: 'R1 slices' }]);
});

// Copy, 4 Nov: with rows.mjs untracked, job test and job complete must build it as the gate does.
import { existsSync as existsGen } from 'node:fs';
test('job test and job complete build untracked generated files before the suite', () => {
  const gen = "import { mkdirSync, writeFileSync } from 'node:fs';\nmkdirSync('gen', { recursive: true });\nwriteFileSync('gen/rows.mjs', 'export const rows = 3;\\n');\n";
  const uses = "import test from 'node:test'; import a from 'node:assert'; import { rows } from '../../gen/rows.mjs';\ntest('rows', () => a.equal(rows, 3));\n";
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha'),
    'process/config.json': JSON.stringify({ generated: [{ paths: ['gen/rows.mjs'], regenerate: ['node', 'gen.mjs'], verify: ['node', '-e', 'process.exit(0)'] }] }),
    'gen.mjs': gen,
    '.gitignore': 'gen/rows.mjs\n',
    'req/alpha.md': '# alpha\n\nR1 does a thing.\n',
    'test/alpha/a.test.mjs': uses,
  });
  git(['branch', 'tranche'], { cwd: root });
  assert.equal(jobTest(root, 'alpha', { log: quiet }).ok, true);
  git(['clean', '-qfdX'], { cwd: root });
  assert.equal(existsGen(join(root, 'gen/rows.mjs')), false);
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  git(['clean', '-qfdX'], { cwd: root });
  const c = jobComplete(root, 'alpha', { push: false, log: quiet });
  assert.equal(c.ok, true, JSON.stringify(c.commands));
  assert.ok(c.receipt.commands.some((x) => /^build generated \(gen\/rows\.mjs\)$/.test(x.cmd) && x.exit === 0));
});
