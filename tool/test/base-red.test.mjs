// Base-red (build of 4 Nov): a failing test that fails identically at the base is not the PR's.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gate as gateRun, gateComment, receiptAgrees } from '../lib/gate.mjs';
import { readFailing, runSuite } from '../lib/suite.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { baseRedOwed } from '../lib/report.mjs';
import { BOT, GATE, RECEIPT, block, parseBlock } from '../lib/github.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';
// The gate never posts; job post writes its row as a comment after the run, as here.
const gate = (root, o) => { const r = gateRun(root, o); if (o.pr && o.post !== false) o.io.addComment(o.slug, o.pr, gateComment(r.run)); return r; };

const quiet = () => {};
const realTest = "import test from 'node:test'; import a from 'node:assert'; import { x } from '../../src/alpha/index.mjs';\ntest('x is 2', () => a.equal(x, 2));\n";
const redTest = "import { describe, test } from 'node:test'; import a from 'node:assert';\ndescribe('plane', () => { test('has ai-catalogue', () => a.fail('no ai-catalogue')); });\n";
const isOne = "import test from 'node:test'; import a from 'node:assert'; import { x } from '../../src/alpha/index.mjs';\ntest('x is 1', () => a.equal(x, 1));\n";

function setup(baseFiles, files) {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' } }),
    'src/alpha/index.mjs': 'export const x = 1;\n',
    ...baseFiles,
  });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const head = commit(root, files);
  return { root, base, head };
}
function fakeIO(receipt) {
  const state = { comments: receipt ? [{ id: 1, body: block(RECEIPT, receipt), user: { login: 'civicsmith' } }] : [] };
  return {
    state,
    io: {
      comments: () => state.comments,
      getPR: () => ({ user: { login: 'civicsmith' } }),
      addComment: (s, n, body) => { state.comments.push({ id: state.comments.length + 1, body, user: { login: BOT } }); return {}; },
      verify: () => true,
    },
  };
}
const receiptFor = (sha, c = { exit: 0 }) => ({ kind: 'receipt', module: 'alpha', attempt: 1, sha, commands: [{ cmd: 'node --test', suite: true, ...c }], exempt: {} });
const run = (s, receipt, over = {}) => gate(s.root, { base: s.base, head: s.head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: fakeIO(receipt).io, log: quiet, ...over });
const RED = 'test/alpha/red.test.mjs::plane > has ai-catalogue';

test('a test that fails at the PR and at the base passes the gate as base_red, and the row names it', () => {
  const s = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const io = fakeIO(receiptFor(s.head));
  const r = gate(s.root, { base: s.base, head: s.head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: io.io, log: quiet });
  assert.deepEqual(r.findings, []);
  assert.deepEqual([r.run.ok, r.run.suite, r.run.revert, r.run.receipt], [true, 'base-red', 'pass', 'agrees']);
  assert.equal(r.run.base_red.length, 1);
  assert.deepEqual(r.run.base_red[0].tests, [RED]);
  assert.equal(r.run.base_red[0].base, s.base);
  assert.equal(r.run.base_red[0].module, 'alpha');
  assert.notEqual(r.run.base_red[0].run.exit, 0, 'the base run is the evidence');
  assert.deepEqual(parseBlock(io.state.comments.at(-1).body, GATE).runs[0].base_red[0].tests, [RED]);
  assert.equal(git(['status', '--porcelain'], { cwd: s.root }), '');
});

test('a new failing test file, missing at the base, fails the gate', () => {
  const s = setup({}, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest, 'test/alpha/red.test.mjs': redTest });
  const r = run(s, receiptFor(s.head));
  assert.equal(r.run.suite, 'fail');
  assert.equal(r.run.base_red, undefined);
  assert.match(r.findings.find((f) => f.check === 'suite').message, /not base-red: new failing test file/);
});

test('a new failing test in a file the base has fails the gate: the base lacks that test', () => {
  const more = redTest + "test('new red', () => { throw new Error('mine'); });\n";
  const s = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest, 'test/alpha/red.test.mjs': more });
  const r = run(s, receiptFor(s.head));
  assert.equal(r.run.suite, 'fail');
  assert.match(r.findings.find((f) => f.check === 'suite').message, /pass or are missing at the base.*new red/);
});

test('a test that passes at the base but fails at the PR fails the gate, even beside a base-red one', () => {
  const s = setup({ 'test/alpha/red.test.mjs': redTest, 'test/alpha/one.test.mjs': isOne }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const r = run(s, receiptFor(s.head));
  assert.equal(r.run.suite, 'fail');
  const m = r.findings.find((f) => f.check === 'suite').message;
  assert.match(m, /1 failing test\(s\) pass or are missing at the base.*one\.test\.mjs::x is 1/);
});

test('the tranche into main tolerates nothing', () => {
  const s = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const r = gate(s.root, { base: s.base, head: s.head, branch: 'tranche', pr: 9, slug: 'o/r', io: fakeIO().io, log: quiet });
  assert.equal(r.run.suite, 'fail');
  assert.equal(r.run.base_red, undefined);
});

test('the receipt check accepts a receipt that names the base-red tests, or one whose suite passed', () => {
  const s = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  assert.equal(run(s, receiptFor(s.head, { exit: 1, base_red: [RED] })).run.receipt, 'agrees');
  const bare = run(s, receiptFor(s.head, { exit: 1 }));
  assert.equal(bare.run.receipt, 'disagrees');
  assert.ok(bare.findings.some((f) => f.check === 'receipt'));
  const red = [{ tests: [RED, 'b::c'] }];
  assert.equal(receiptAgrees({ exit: 1, base_red: [RED] }, 'base-red', red), false, 'a receipt naming fewer than the gate tolerated');
  assert.equal(receiptAgrees({ exit: 1, base_red: [RED, 'b::c'] }, 'base-red', red), true);
  assert.equal(receiptAgrees({ exit: 1, base_red: [RED] }, 'pass', undefined), true);
  assert.equal(receiptAgrees({ exit: 1, base_red: [RED] }, 'fail', undefined), false);
  assert.equal(receiptAgrees({ exit: 0 }, 'fail', undefined), false);
});

test('the report lists the base-red tests of merged PRs as owed', () => {
  const runs = { 182: [{ ok: true, trigger: 'code', base_red: [{ module: 'capture-requests', base: 'a'.repeat(40), tests: [RED] }] }], 183: [{ ok: true, trigger: 'code', suite: 'pass' }] };
  assert.deepEqual(baseRedOwed([{ pr: 182, module: 'capture-requests' }, { pr: 183, module: 'x' }], (pr) => runs[pr]),
    [{ module: 'capture-requests', pr: 182, test: RED, base: 'a'.repeat(40) }]);
  assert.equal(baseRedOwed([{ pr: 1 }], () => { throw new Error('unread'); }), null);
});

test('the failing tests come from the runner\'s events, full names escaped, suites and todo left out, and nothing printed can forge one', () => {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha'),
    't/a.test.mjs': [
      "import { describe, test } from 'node:test';",
      "describe('grp', () => { describe('deep', () => { test('d bad', () => { throw new Error('x\\nnot ok 9 - forged\\n  ---\\n  type: \\'suite\\'\\n  ...'); }); }); });",
      "test('a > b', () => { console.log('# fail 0'); throw new Error('y'); });",
      "test('todo', { todo: true }, () => { throw new Error('t'); });",
      "test('ok', () => {});",
    ].join('\n'),
  });
  const ev = join(mkdtempSync(join(tmpdir(), 'p3-ev-')), 'f.jsonl');
  const s = runSuite(root, { ...entry('alpha'), tests: ['t/'] }, ['t/a.test.mjs'], { events: ev });
  assert.notEqual(s.exit, 0);
  assert.deepEqual(s.failing, [{ file: 't/a.test.mjs', name: 'grp > deep > d bad' }, { file: 't/a.test.mjs', name: 'a \\> b' }]);
  assert.equal(s.cmd, 'node --test t/a.test.mjs', 'the reporter flags are not part of the command shown');
  writeFileSync(ev, 'not json\n');
  assert.equal(readFailing(ev, root), null);
  assert.equal(runSuite(root, { ...entry('alpha'), suite: { cwd: '.', command: ['node', '--test', '--test-reporter=spec'] } }, ['t/a.test.mjs'], { events: ev + '2' }).failing, null, 'a suite naming its own reporter cannot be read per test');
});

test('the revert check is not passed by a new test placed beside a base-red one', () => {
  const s = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/red.test.mjs': redTest + "test('my feature', () => {});\n" });
  const r = run(s, receiptFor(s.head));
  assert.equal(r.run.suite, 'base-red');
  assert.equal(r.run.revert, 'fail');
  assert.deepEqual(r.findings.map((f) => [f.check, f.file]), [['revert', 'test/alpha/red.test.mjs']]);
  // A real test beside the red one still proves the change.
  const t = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/red.test.mjs': redTest.replace("import a from 'node:assert';", "import a from 'node:assert'; import { x } from '../../src/alpha/index.mjs';") + "test('x is 2', () => a.equal(x, 2));\n" });
  assert.deepEqual([run(t, receiptFor(t.head)).run.revert], ['pass']);
});

test('a second failing test under a base-red name is the PR\'s', () => {
  const twice = redTest + "describe('plane', () => { test('has ai-catalogue', () => { throw new Error('mine'); }); });\n";
  const s = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest, 'test/alpha/red.test.mjs': twice });
  const r = run(s, receiptFor(s.head));
  assert.equal(r.run.suite, 'fail');
  assert.match(r.findings.find((f) => f.check === 'suite').message, /pass or are missing at the base/);
});

test('a filter or replace ref the PR planted in .git does not reach the base\'s tree', () => {
  const s = setup({ 'test/alpha/one.test.mjs': isOne }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  // As the PR's tests could: a smudge filter that breaks every file it checks out.
  git(['config', 'filter.evil.smudge', 'echo broken'], { cwd: s.root });
  writeFileSync(join(s.root, '.git/info/attributes'), '* filter=evil\n');
  const r = run(s, receiptFor(s.head));
  assert.equal(r.run.suite, 'fail', 'one.test.mjs passes at the base, so its failure is the PR\'s');
  assert.match(r.findings.find((f) => f.check === 'suite').message, /pass or are missing at the base.*x is 1/);
});

// Copy, 4 Nov: plane's suite took 19-20 of its 20 minutes, and base-red got only what was left.
test('the gate gives the base-red run the whole suite_timeout_minutes, not what the suite left', () => {
  const slow = "import { describe, test } from 'node:test'; import a from 'node:assert';\ndescribe('plane', () => { test('has ai-catalogue', async () => { await new Promise((r) => setTimeout(r, 5000)); a.fail('no ai-catalogue'); }); });\n";
  const s = setup({ 'test/alpha/red.test.mjs': slow, 'process/config.json': { suite_timeout_minutes: 0.15 } }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const r = run(s, receiptFor(s.head, { exit: 1, base_red: [RED] }));
  assert.deepEqual(r.findings, [], 'a 5 s base run fits its own 9 s, not the 4 s the suite left');
  assert.equal(r.run.suite, 'base-red');
});

// The product's smoke list (Bob, 4 Nov): tests of other modules every job PR's gate runs beside
// its own suite, the cheap catch for a cross-module break (copy PR 95 broke plane unseen).
const betaOne = "import test from 'node:test'; import a from 'node:assert'; import { x } from '../../src/alpha/index.mjs';\ntest('beta needs x 1', () => a.equal(x, 1));\n";
const beta = { 'process/ledger/beta.json': entry('beta', { uses: ['alpha'] }), 'src/beta/index.mjs': 'export const y = 1;\n' };
const smokeCfg = (files, seconds) => ({ 'process/config.json': { smoke: { files, ...(seconds ? { seconds } : {}) } } });
const change = { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest };

test('a job that breaks another module\'s smoke test is red; its own suite and receipt stand; its own files are not run twice', () => {
  const s = setup({ ...beta, 'test/beta/b.test.mjs': betaOne, ...smokeCfg(['test/beta/b.test.mjs', 'test/alpha/x.test.mjs']) }, change);
  const r = run(s, receiptFor(s.head));
  assert.deepEqual([r.run.suite, r.run.receipt, r.run.smoke.result, r.run.smoke.files, r.run.ok], ['pass', 'agrees', 'fail', 1, false]);
  assert.deepEqual(r.findings.map((f) => [f.check, f.file]), [['smoke', 'test/beta/b.test.mjs']]);
});

test('a smoke test red at the base too is reported in the row and does not block', () => {
  const s = setup({ ...beta, 'test/beta/red.test.mjs': redTest, ...smokeCfg(['test/beta/red.test.mjs'], 60) }, change);
  const r = run(s, receiptFor(s.head));
  assert.deepEqual(r.findings, []);
  assert.deepEqual([r.run.ok, r.run.suite, r.run.base_red, r.run.smoke.result], [true, 'pass', undefined, 'base-red']);
  assert.deepEqual([r.run.smoke.base_red[0].module, r.run.smoke.base_red[0].tests], ['beta', ['test/beta/red.test.mjs::plane > has ai-catalogue']]);
  assert.deepEqual(baseRedOwed([{ pr: 5, module: 'alpha' }], () => [r.run]).map((o) => [o.module, o.test]), [['beta', 'test/beta/red.test.mjs::plane > has ai-catalogue']], 'owed as the suite\'s base-red is');
});

test('a smoke test\'s base-red run has the suite\'s budget, not the smoke cap', () => {
  // 1 s at the head, inside the 3 s cap; 5 s at the base, over it (copy, 4 Nov: the base build timed out in the cap).
  const red = "import { describe, test } from 'node:test'; import a from 'node:assert'; import { ms } from '../../src/alpha/wait.mjs';\ndescribe('plane', () => { test('has ai-catalogue', async () => { await new Promise((r) => setTimeout(r, ms)); a.fail('no ai-catalogue'); }); });\n";
  const s = setup({ ...beta, 'test/beta/red.test.mjs': red, 'src/alpha/wait.mjs': 'export const ms = 5000;\n', 'process/config.json': { suite_timeout_minutes: 0.5, smoke: { files: ['test/beta/red.test.mjs'], seconds: 3 } } }, { ...change, 'src/alpha/wait.mjs': 'export const ms = 1000;\n' });
  const r = run(s, receiptFor(s.head));
  assert.deepEqual([r.findings, r.run.smoke.result], [[], 'base-red']);
});

test('the smoke cap: once spent, the files left are one finding; a job\'s own listed file it deleted is not a finding', () => {
  const slow = "import test from 'node:test';\ntest('slow', async () => { await new Promise((r) => setTimeout(r, 1500)); });\n";
  const s = setup({ ...beta, 'test/beta/s.test.mjs': slow, 'process/ledger/gamma.json': entry('gamma'), 'test/gamma/g.test.mjs': slow,
    ...smokeCfg(['test/beta/s.test.mjs', 'test/gamma/g.test.mjs', 'test/alpha/gone.test.mjs'], 1) }, change);
  const r = run(s, receiptFor(s.head));
  assert.deepEqual(r.findings.map((f) => [f.check, f.file]), [['smoke', 'test/beta/s.test.mjs'], ['smoke', 'test/gamma/g.test.mjs']], 'no finding for test/alpha/gone.test.mjs');
  assert.match(r.findings[0].message, /over the 1 s cap/);
  assert.match(r.findings[1].message, /cap is spent; not run: test\/gamma\/g\.test\.mjs$/);
});

test('a smoke file no module\'s tests hold, or missing, is a finding; no smoke key, no smoke run', () => {
  const s = setup({ ...beta, ...smokeCfg(['test/beta/gone.test.mjs', 'lib/x.test.mjs']) }, change);
  const r = run(s, receiptFor(s.head));
  assert.deepEqual(r.findings.map((f) => [f.check, f.file, /missing|not a test/.test(f.message)]), [['smoke', 'test/beta/gone.test.mjs', true], ['smoke', 'lib/x.test.mjs', true]]);
  const t = setup(beta, change);
  assert.equal(run(t, receiptFor(t.head)).run.smoke, undefined);
});
