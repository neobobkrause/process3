import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBlock, GATE, block } from '../lib/github.mjs';
import { jobBlock, jobComplete, jobStart } from '../lib/job.mjs';
import { status } from '../lib/status.mjs';
import { readEntry } from '../lib/ledger.mjs';
import { appendRow, readRows, report } from '../lib/metrics.mjs';
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
      findPR: () => ({ number: 9, draft: state.ready === 0, user: { login: 'civicsmith' } }),
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
import { jobTest } from '../lib/job.mjs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { MARK, install, moduleLocks } from '../lib/suite.mjs';
import { createHash } from 'node:crypto';

test('the START divides the labour: deploys and releases are the coordinator\'s, local wrangler runs the job\'s', () => {
  const root = product();
  const { start } = jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  const line = start.split('\n').find((l) => l.startsWith('Not yours'));
  assert.match(line, /^Not yours, and this line wins over any act listed above it:/);
  assert.match(line, /Deploying, releasing, release signing and acting on a live site are the coordinator's acts in a round, not the job's/);
  assert.match(line, /local builds and tests that use wrangler or miniflare are part of your work/);
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
  assert.deepEqual(lines, ['Give each judged act (a merge, a push, a session start) its own shell command, never chained with another (no `&&`, `;` or pipe joining it to anything else).']);
});
