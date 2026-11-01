import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBlock, GATE, block } from '../lib/github.mjs';
import { jobBlock, jobComplete, jobStart } from '../lib/job.mjs';
import { readEntry } from '../lib/ledger.mjs';
import { appendRow, readRows, report } from '../lib/metrics.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo, write } from './helpers.mjs';

const quiet = () => {};
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
  const read = { comments: () => [{ body: gate }], getPR: () => ({ merged_at: null }) };
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
  const state = { comments: [], ready: 0, prs: 0, failReady: true };
  return {
    state,
    open: (slug, p) => { state.prs++; return { number: 9, html_url: 'pr', draft: true, ...p }; },
    find: () => null,
    gh: {
      findPR: () => ({ number: 9, draft: state.ready === 0 }),
      comments: () => state.comments,
      addComment: (s, n, body) => { state.comments.push({ body, html_url: `c${state.comments.length}` }); return { html_url: 'c' }; },
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
  jobStart(root, 'alpha', { coordinator: 's', open: f.open, find: f.find, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  assert.throws(() => jobComplete(root, 'alpha', { gh: f.gh, log: quiet }), /network/);
  const tip = git(['rev-parse', 'HEAD'], { cwd: root });
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0], tip, 'pushed before the receipt');
  assert.equal(f.state.comments.length, 1);
  assert.equal(parseBlock(f.state.comments[0].body, 'p3:receipt').sha, tip);
  const again = jobComplete(root, 'alpha', { gh: f.gh, log: quiet });
  assert.equal(again.ok, true);
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

test('after a failed push, a rerun posts the saved receipt for the COMPLETE commit', () => {
  const root = withOrigin();
  const f = fakeGitHub();
  f.state.failReady = false;
  jobStart(root, 'alpha', { coordinator: 's', open: f.open, find: f.find, log: quiet });
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
