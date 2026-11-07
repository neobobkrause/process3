import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { jobComplete, jobStart } from '../lib/job.mjs';
import { gate } from '../lib/gate.mjs';
import { branchModule, jobBranch, readEntry, startBranch } from '../lib/ledger.mjs';
import { regenerate } from '../lib/checks.mjs';
import { readRows } from '../lib/metrics.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const passing = "import test from 'node:test'; test('ok', () => {});\n";

function product(extra = {}) {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha'),
    'req/alpha.md': '# alpha\n\nR1 does a thing.\n',
    'test/alpha/a.test.mjs': passing,
    ...extra,
  });
  git(['branch', 'tranche'], { cwd: root });
  return root;
}

test('jobBranch, branchModule and startBranch: job/<id>, or the highest job/<id>-<n> that is not itself a module', () => {
  const ids = new Set(['alpha', 'alpha-3', 'beta']);
  assert.equal(jobBranch('alpha', ['job/alpha'], ids), 'job/alpha');
  assert.equal(jobBranch('alpha', ['job/alpha', 'job/alpha-2', 'job/alpha-3', 'job/beta-4'], ids), 'job/alpha-2');
  assert.equal(jobBranch('alpha', ['job/alpha', 'job/alpha-2', 'job/alpha-4'], ids), 'job/alpha-4');
  assert.equal(branchModule('job/alpha-2', ids), 'alpha');
  assert.equal(branchModule('job/alpha-3', ids), 'alpha-3', 'a module of that name keeps its branch');
  assert.equal(branchModule('job/alpha', ids), 'alpha');
  assert.equal(branchModule('main', ids), null);
  assert.equal(startBranch([{ row: 'attempt', event: 'start', branch: 'job/alpha-2' }, { row: 'attempt', event: 'start', branch: 'job/alpha' }], 'alpha'), 'job/alpha');
  // A row from before 5 Nov on job/<id> named no branch: still job/<id>.
  assert.equal(startBranch([{ row: 'attempt', event: 'start', branch: 'job/alpha-2' }, { row: 'attempt', event: 'start' }], 'alpha'), 'job/alpha');
  // Copy PR 454: attempt 4 moved to job/ai-accounts-2 (--fresh-branch); attempt 5's --again row, written before
  // every start row named its branch, named none: it continues the branch before it.
  assert.equal(startBranch([{ row: 'attempt', event: 'start', attempt: 4, branch: 'job/alpha-2', fresh: { from: 'job/alpha' } }, { row: 'attempt', event: 'start', attempt: 5, again: { pr: 454 } }], 'alpha'), 'job/alpha-2');
  assert.equal(startBranch([{ row: 'attempt', event: 'start' }], 'alpha'), 'job/alpha');
  assert.equal(startBranch([{ row: 'attempt', event: 'start' }, { row: 'attempt', event: 'start', branch: 'job/alpha-2' }], 'alpha'), 'job/alpha-2');
});

test('job start --fresh-branch cuts the next free job/<id>-<n> from the tranche, keeps the old branch, and names both and why in the start row', () => {
  const root = product({ 'process/ledger/alpha-2.json': entry('alpha-2'), 'req/alpha-2.md': '# a2\n', 'test/alpha-2/a.test.mjs': passing });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', fresh: 'x', push: false, log: quiet }), /no branch job\/alpha/);
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/big.bin': 'too big\n' });
  const old = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', fresh: true, push: false, log: quiet }), /--fresh-branch needs why/);
  const r = jobStart(root, 'alpha', { coordinator: 's', fresh: 'job/alpha holds a 7 MB file', push: false, log: quiet });
  assert.equal(r.attempt, 2);
  assert.match(r.start, /Your branch is `job\/alpha-3`/, 'alpha-2 is a module: its suffix is skipped');
  assert.match(r.start, /job\/alpha-3/);
  assert.equal(git(['rev-parse', 'job/alpha'], { cwd: root }), old, 'the old branch is left as it was');
  assert.equal(git(['merge-base', '--is-ancestor', old, 'job/alpha-3'], { cwd: root, allowFail: true }).code, 1, 'the new branch holds none of it');
  git(['checkout', '-q', 'job/alpha-3'], { cwd: root });
  assert.equal(readEntry(root, 'alpha').status.state, 'WORKING');
  const row = readRows(root, 'alpha').pop();
  assert.deepEqual([row.branch, row.fresh], ['job/alpha-3', { from: 'job/alpha', why: 'job/alpha holds a 7 MB file' }]);
  // job complete finds the job by the branch its latest start row names.
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  assert.equal(jobComplete(root, 'alpha', { push: false, log: quiet }).ok, true);
  git(['checkout', '-q', 'main'], { cwd: root });
  // A later fresh start reads the latest branch and takes the next free suffix after it.
  const r2 = jobStart(root, 'alpha', { coordinator: 's', fresh: 'again', push: false, log: quiet });
  assert.match(r2.start, /Your branch is `job\/alpha-4`/);
  assert.equal(r2.attempt, 3, 'the attempt follows the old branch\'s highest');
  git(['checkout', '-q', 'job/alpha-4'], { cwd: root });
  assert.equal(readRows(root, 'alpha').pop().fresh.from, 'job/alpha-3');
});

test('the gate finds the job by its fresh branch, and refuses a branch its latest start row does not name', () => {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' } }), 'src/alpha/index.mjs': 'export const x = 1;\n' });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha-2'], { cwd: root });
  const row = (b) => `${JSON.stringify({ row: 'attempt', event: 'start', role: 'job', attempt: 2, ...(b ? { branch: b } : {}) })}\n`;
  const io = { comments: () => [], getPR: () => ({ user: { login: 'x' } }), addComment: () => ({}) };
  const run = (head, branch) => gate(root, { base, head, branch, slug: 'o/r', io, log: quiet, draft: true });
  const named = commit(root, { 'process/metrics/alpha.jsonl': row('job/alpha-2') });
  assert.deepEqual(run(named, 'job/alpha-2').findings.filter((f) => f.check === 'ledger'), []);
  const other = commit(root, { 'process/metrics/alpha.jsonl': row('job/alpha-2') + row(null) });
  assert.match(run(other, 'job/alpha-2').findings.find((f) => f.check === 'ledger')?.message || '', /not job alpha's branch: its latest start row names job\/alpha/);
});

test('a failed verify logs the last 40 lines of its stdout and stderr, and every regenerated row is logged', () => {
  const root = makeRepo({ 'gen/a.mjs': 'old\n', 'gen/b.mjs': 'same\n' });
  const out = Array.from({ length: 60 }, (_, i) => `out ${i}`).join('\n');
  // a's regenerate writes new bytes and its verify fails; b's leaves its file as it was.
  const exec = (cmd, args) => {
    if (cmd === 'regen') { if (args[0] === 'a') writeFileSync(join(root, 'gen/a.mjs'), 'new\n'); return { code: 0, stdout: '', stderr: '' }; }
    return { code: 1, stdout: out, stderr: 'AssertionError: expected 2\n    at x.test.mjs:3' };
  };
  const rows = ['a', 'b'].map((x) => ({ paths: [`gen/${x}.mjs`], regenerate: ['regen', x], verify: ['verify', x] }));
  const log = [];
  const g = regenerate(root, rows, { timeout: 60000, exec, log: (l) => log.push(l) });
  const text = log.join('\n');
  assert.equal(g.ran.length, 2);
  assert.match(text, /verify a failed \(exit 1\) after regenerating gen\/a\.mjs:\nstdout, failure lines and last 40 lines:\nout 20\n/);
  assert.doesNotMatch(text, /\nout 19\n/);
  assert.match(text, /stderr, failure lines and last 40 lines:\nAssertionError: expected 2\n {4}at x\.test\.mjs:3/);
  assert.match(text, /generated, regenerated: gen\/a\.mjs: changed, verify a: exit 1/);
  assert.match(text, /generated, regenerated: gen\/b\.mjs: unchanged/);
});

test('a failed verify keeps its failure lines in the log and names the first in its finding', () => {
  const root = makeRepo({ 'gen/a.mjs': 'old\n' });
  const out = ['TAP version 13', 'not ok 1 - bundles match program.mjs', ...Array.from({ length: 50 }, (_, i) => `# line ${i}`)].join('\n');
  const exec = (cmd) => (cmd === 'regen' ? (writeFileSync(join(root, 'gen/a.mjs'), 'new\n'), { code: 0, stdout: '', stderr: '' }) : { code: 1, stdout: out, stderr: '' });
  const log = [];
  const g = regenerate(root, [{ paths: ['gen/a.mjs'], regenerate: ['regen'], verify: ['verify'] }], { timeout: 60000, exec, log: (l) => log.push(l) });
  assert.match(log.join('\n'), /lines:\nnot ok 1 - bundles match program\.mjs\n# line 10\n/);
  assert.equal(g.findings[0].message, 'verify failed (exit 1) after regenerating: not ok 1 - bundles match program.mjs');
});

test('a committed generated file its regenerate changes is stale at the commit: a finding naming it and the command; a built one is not (copy, 6 Nov: order.mjs)', () => {
  const root = makeRepo({ 'gen/order.mjs': 'old\n', 'gen/same.mjs': 'same\n', '.gitignore': '/built/\n' });
  const exec = (cmd, args) => {
    if (cmd === 'regen' && args[0] === 'order') writeFileSync(join(root, 'gen/order.mjs'), 'new\n');
    if (cmd === 'regen' && args[0] === 'built') { mkdirSync(join(root, 'built'), { recursive: true }); writeFileSync(join(root, 'built/b.mjs'), 'b\n'); }
    return { code: 0, stdout: '', stderr: '' };
  };
  const row = (x, p) => ({ paths: [p], regenerate: ['regen', x], verify: ['verify', x] });
  const rows = [row('order', 'gen/order.mjs'), row('same', 'gen/same.mjs'), row('built', 'built/')];
  const g = regenerate(root, rows, { timeout: 60000, exec, stale: true });
  assert.deepEqual(g.findings.map((f) => [f.file, f.message]), [['gen/order.mjs', 'gen/order.mjs is stale at this commit: run regen order and commit it in this PR']]);
  assert.deepEqual(g.ran.map((r) => r.stale || null), [['gen/order.mjs'], null, null]);
  // A file another check names (a plain pull request's refreshed file, refreshCheck's) is not named stale too.
  git(['checkout', '-q', '--', 'gen/order.mjs'], { cwd: root });
  assert.deepEqual(regenerate(root, rows, { timeout: 60000, exec, stale: true, judged: ['gen/order.mjs'] }).findings, []);
  // A job's pull request (no stale option: a job may not commit a generated file, JOB-8) records it
  // on its row and in the log, owed by a plain refresh after it lands; no finding.
  git(['checkout', '-q', '--', 'gen/order.mjs'], { cwd: root });
  const log = [];
  const j = regenerate(root, rows, { timeout: 60000, exec, log: (l) => log.push(l) });
  assert.deepEqual([j.findings, j.ran[0].stale], [[], ['gen/order.mjs']]);
  assert.ok(log.includes('generated, stale: gen/order.mjs differs from this commit after regen order'), log.join('\n'));
  // An untracked file a suite left in a committed directory is not stale.
  git(['checkout', '-q', '--', 'gen/order.mjs'], { cwd: root });
  writeFileSync(join(root, 'gen/scratch.tmp'), 'x\n');
  assert.deepEqual(regenerate(root, [row('same', 'gen/')], { timeout: 60000, exec, stale: true }).findings, []);
});

test('regenerate runs in config order: a built row after a regenerated row is built again from its output', () => {
  const root = makeRepo({ 'gen/program.mjs': 'p1\n' });
  const order = [];
  const exec = (cmd, args) => { order.push(args[0]); return { code: 0, stdout: '', stderr: '' }; };
  const row = (x) => ({ paths: [`gen/${x}`], regenerate: ['regen', x], verify: ['verify', x] });
  const [early, program, bundle] = [row('early'), row('program'), row('bundle')];
  regenerate(root, [early, program, bundle], { timeout: 60000, exec, skip: new Set([early, bundle]) });
  assert.deepEqual(order.slice(0, 2), ['program', 'bundle'], 'the built row before every regenerated row is not built twice; the one after is');
});

test('a job/<id>-<n> its own start row does not name is not the job\'s branch, an unread ledger counts none, and a fresh start not yet opened is not cut again', () => {
  assert.equal(jobBranch('api', ['job/api', 'job/api-2'], new Set()), 'job/api', 'no ids read: no <id>-<n> counts');
  assert.equal(branchModule('job/api-2', new Set()), 'api-2');
  const root = product();
  git(['branch', 'job/alpha-2', 'main'], { cwd: root }); // work made before Process3, no start row
  const r = jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  assert.match(r.start, /Your branch is `job\/alpha`/);
  const f = jobStart(root, 'alpha', { coordinator: 's', fresh: 'stuck', push: false, log: quiet });
  assert.match(f.start, /Your branch is `job\/alpha-3`/);
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', fresh: 'again', push: false, log: quiet }), /job\/alpha-3 is a fresh start not yet opened; run job start alpha --live <n> without --fresh-branch/);
});
