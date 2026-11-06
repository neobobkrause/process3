// Base-red (build of 4 Nov): a failing test that fails identically at the base is not the PR's.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gate as gateRun, gateComment } from '../lib/gate.mjs';
import { readFailing, runSuite } from '../lib/suite.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { baseRedOwed } from '../lib/report.mjs';
import { baseRed, reachers } from '../lib/basered.mjs';
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
  assert.match(r.findings.find((f) => f.check === 'suite').message, /1 failing test\(s\) are missing at the base [0-9a-f]{10}, whose run reported their files: test\/alpha\/red\.test\.mjs::new red/);
});

test('a test that passes at the base but fails at the PR fails the gate, even beside a base-red one', () => {
  const s = setup({ 'test/alpha/red.test.mjs': redTest, 'test/alpha/one.test.mjs': isOne }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const r = run(s, receiptFor(s.head));
  assert.equal(r.run.suite, 'fail');
  const m = r.findings.find((f) => f.check === 'suite').message;
  assert.match(m, /1 failing test\(s\) pass at the base [0-9a-f]{10}: test\/alpha\/one\.test\.mjs::x is 1$/);
});

test('the tranche into main tolerates nothing', () => {
  const s = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const r = gate(s.root, { base: s.base, head: s.head, branch: 'tranche', pr: 9, slug: 'o/r', io: fakeIO().io, log: quiet });
  assert.equal(r.run.suite, 'fail');
  assert.equal(r.run.base_red, undefined);
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

test('the revert check fails a new inert test placed beside a base-red one (AUD-1)', () => {
  const s = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/red.test.mjs': redTest + "test('my feature', () => {});\n" });
  const r = run(s, receiptFor(s.head));
  assert.equal(r.run.suite, 'base-red');
  assert.deepEqual([r.run.revert, r.run.inert, r.findings.map((f) => [f.check, f.file])], ['fail', ['test/alpha/red.test.mjs'], [['revert', 'test/alpha/red.test.mjs']]]);
  // A real test beside the red one still proves the change.
  const t = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/red.test.mjs': redTest.replace("import a from 'node:assert';", "import a from 'node:assert'; import { x } from '../../src/alpha/index.mjs';") + "test('x is 2', () => a.equal(x, 2));\n" });
  assert.deepEqual([run(t, receiptFor(t.head)).run.revert], ['pass']);
});

test('a second failing test under a base-red name is the PR\'s', () => {
  const twice = redTest + "describe('plane', () => { test('has ai-catalogue', () => { throw new Error('mine'); }); });\n";
  const s = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest, 'test/alpha/red.test.mjs': twice });
  const r = run(s, receiptFor(s.head));
  assert.equal(r.run.suite, 'fail');
  assert.match(r.findings.find((f) => f.check === 'suite').message, /1 failing test\(s\) fail fewer times at the base [0-9a-f]{10} than here: test\/alpha\/red\.test\.mjs::plane > has ai-catalogue/);
});

test('a filter or replace ref the PR planted in .git does not reach the base\'s tree', () => {
  const s = setup({ 'test/alpha/one.test.mjs': isOne }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  // As the PR's tests could: a smudge filter that breaks every file it checks out.
  git(['config', 'filter.evil.smudge', 'echo broken'], { cwd: s.root });
  writeFileSync(join(s.root, '.git/info/attributes'), '* filter=evil\n');
  const r = run(s, receiptFor(s.head));
  assert.equal(r.run.suite, 'fail', 'one.test.mjs passes at the base, so its failure is the PR\'s');
  assert.match(r.findings.find((f) => f.check === 'suite').message, /pass at the base.*x is 1/);
});

// Copy, 4 Nov: plane's suite took 19-20 of its 20 minutes, and base-red got only what was left.
test('the gate gives the base-red run the whole suite_timeout_minutes, not what the suite left', () => {
  const slow = "import { describe, test } from 'node:test'; import a from 'node:assert';\ndescribe('plane', () => { test('has ai-catalogue', async () => { await new Promise((r) => setTimeout(r, 5000)); a.fail('no ai-catalogue'); }); });\n";
  const s = setup({ 'test/alpha/red.test.mjs': slow, 'process/config.json': { suite_timeout_minutes: 0.15 } }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const r = run(s, receiptFor(s.head, { exit: 1, base_red: [RED] }));
  assert.deepEqual(r.findings, [], 'a 5 s base run fits its own 9 s, not the 4 s the suite left');
  assert.equal(r.run.suite, 'base-red');
});

const change = { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest };

// Copy PR 290 (4 Nov): t51-round9-seam.test.mjs imports r9-seam-limits.mjs and the like, whose
// sections declare the tests; the runner names those tests by the sibling's path. The base ran the
// sibling alone, which runs nothing, and called five tests red at the base too "pass or missing".
const sib = (msg) => `import { describe, test } from 'node:test'; import a from 'node:assert'; import { ms } from '../../src/alpha/wait.mjs';\nexport const sections = () => describe('§14a', () => { test('a PDF over the ceiling is stated', async () => { await new Promise((r) => setTimeout(r, ms)); a.fail('${msg}'); }); });\n`;
const seam = "import { describe } from 'node:test'; import { sections } from './r9-seam-limits.mjs';\nsections();\ndescribe('wrapped', () => { sections(); });\n";
const SEAM = ['test/alpha/r9-seam-limits.mjs::§14a > a PDF over the ceiling is stated', 'test/alpha/r9-seam-limits.mjs::wrapped > §14a > a PDF over the ceiling is stated'];
const fast = { 'src/alpha/wait.mjs': 'export const ms = 0;\n' };

test('a sibling module\'s tests red at the base too are base-red: the base runs the test file that imports it', () => {
  const s = setup({ ...fast, 'test/alpha/r9-seam-limits.mjs': sib('no statement'), 'test/alpha/t51-seam.test.mjs': seam }, change);
  const r = run(s, receiptFor(s.head));
  assert.deepEqual(r.findings, []);
  assert.equal(r.run.suite, 'base-red');
  assert.deepEqual(r.run.base_red[0].tests, SEAM, 'keyed by the sibling, the enclosing describe of the test file named');
  assert.match(r.run.base_red[0].run.cmd, /t51-seam\.test\.mjs$/);
});

test('a sibling module\'s test that passes at the base is said to pass there, by its own path', () => {
  const ok = "import { describe, test } from 'node:test'; import a from 'node:assert'; import { x } from '../../src/alpha/index.mjs';\nexport const sections = () => describe('§14a', () => { test('a PDF over the ceiling is stated', () => a.equal(x, 1)); });\n";
  const s = setup({ 'test/alpha/r9-seam-limits.mjs': ok, 'test/alpha/t51-seam.test.mjs': seam }, change);
  const m = run(s, receiptFor(s.head)).findings.find((f) => f.check === 'suite').message;
  assert.match(m, /not base-red: 2 failing test\(s\) pass at the base [0-9a-f]{10}: test\/alpha\/r9-seam-limits\.mjs::§14a > a PDF/);
  assert.doesNotMatch(m, /missing|did not complete/);
});

test('a base run that times out is no verdict: it names the file and asks for a rerun', () => {
  // 15 s for each side's install and run: the head fails at once, the base sleeps 30 s.
  const s = setup({ 'src/alpha/wait.mjs': 'export const ms = 30000;\n', 'test/alpha/r9-seam-limits.mjs': sib('no statement'), 'test/alpha/t51-seam.test.mjs': seam, 'process/config.json': { suite_timeout_minutes: 0.25 } },
    { ...change, ...fast });
  const r = run(s, receiptFor(s.head));
  const m = r.findings.find((f) => f.check === 'suite').message;
  assert.match(m, /not base-red: the base run did not complete for test\/alpha\/r9-seam-limits\.mjs \(the run timed out after \d+ s\): no verdict on its tests; rerun$/);
  assert.doesNotMatch(m, /pass at|missing at/);
});

test('a test file that fails to load at the base is no verdict on its tests; nor is a sibling no test file names', () => {
  const red = "import test from 'node:test';\ntest('t', () => { throw new Error('red'); });\n";
  const s = setup({ 'test/alpha/l.test.mjs': "import './gone.mjs';\n" + red, 'test/alpha/lone.mjs': '' }, { ...change, 'test/alpha/l.test.mjs': red });
  const m = run(s, receiptFor(s.head)).findings.find((f) => f.check === 'suite').message;
  assert.match(m, /the base run did not complete for test\/alpha\/l\.test\.mjs \(test\/alpha\/l\.test\.mjs failed as a whole there \(a load failure or an early exit\), exit 1\): no verdict/);
  // A failing test keyed by a file the base has but no test file names (moved importers).
  const e = { ...entry('alpha'), suite: { cwd: '.', command: ['node', '--test'] }, tests: ['test/alpha/'] };
  const br = baseRed(s.root, e, { base: s.base, failing: [{ file: 'test/alpha/lone.mjs', name: 'x' }], cfg: {}, log: quiet });
  assert.equal(br.ok, false);
  assert.match(br.why, /^the base run did not complete for test\/alpha\/lone\.mjs \(not a test file the suite runs, and no test file at the base imports it\): no verdict on its tests; rerun$/);
});

test('the events: passes are recorded and kept out of failing; a file that failed as a whole is marked', () => {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), 'p/t/a.test.mjs': "import test from 'node:test';\ntest('ok', () => {});\ntest('bad', () => { throw new Error('x'); });\n", 'p/t/b.test.mjs': "import './nope.mjs';\n" });
  for (const cwd of ['.', 'p']) {
    const ev = join(mkdtempSync(join(tmpdir(), 'p3-ev-')), 'f.jsonl');
    const s = runSuite(root, { ...entry('alpha'), tests: ['p/t/'], suite: { cwd, command: ['node', '--test'] } }, ['p/t/a.test.mjs', 'p/t/b.test.mjs'], { events: ev });
    assert.deepEqual(s.passing, [{ file: 'p/t/a.test.mjs', name: 'ok' }], `cwd ${cwd}`);
    assert.deepEqual(s.failing.map((t) => t.name).sort(), ['bad', cwd === '.' ? 'p/t/b.test.mjs' : 't/b.test.mjs']);
    assert.deepEqual([s.reported.sort(), s.whole, s.timedOut], [['p/t/a.test.mjs', 'p/t/b.test.mjs'], ['p/t/b.test.mjs'], false], `cwd ${cwd}: the whole-file result is marked from a suite cwd below the root too`);
    assert.deepEqual(readFailing(ev, root), s.failing);
  }
});

test('the revert check reads every file per test when a sibling\'s tests are tolerated: a new inert test beside them fails', () => {
  const s = setup({ ...fast, 'test/alpha/r9-seam-limits.mjs': sib('no statement'), 'test/alpha/t51-seam.test.mjs': seam },
    { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/t51-seam.test.mjs': seam + "import test from 'node:test';\ntest('my feature', () => {});\n" });
  const r = run(s, receiptFor(s.head));
  assert.deepEqual([r.run.suite, r.run.revert, r.run.inert, r.findings.map((f) => f.check)], ['base-red', 'fail', ['test/alpha/t51-seam.test.mjs'], ['revert']]);
});

test('a sibling reached by other test files here than at the base has no base-red verdict, even with a matching count', () => {
  // At the base B runs the red section and A a green one; the PR empties B (drops its import) and breaks A's.
  const two = "import { describe, test } from 'node:test'; import a from 'node:assert'; import { x } from '../../src/alpha/index.mjs';\nexport const sections = (red) => describe('§14a', () => { test('a PDF over the ceiling is stated', () => { if (red) a.fail('red'); a.equal(x, 1); }); });\n";
  const s = setup({ 'test/alpha/r9-seam-limits.mjs': two, 'test/alpha/a.test.mjs': "import { sections } from './r9-seam-limits.mjs';\nsections(false);\n", 'test/alpha/b.test.mjs': "import { sections } from './r9-seam-limits.mjs';\nsections(true);\n" },
    { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/b.test.mjs': null });
  const m = run(s, receiptFor(s.head)).findings.find((f) => f.check === 'suite').message;
  assert.match(m, /no base-red verdict for test\/alpha\/r9-seam-limits\.mjs \(the test files reaching it differ, here test\/alpha\/a\.test\.mjs, at the base test\/alpha\/a\.test\.mjs, test\/alpha\/b\.test\.mjs\)$/);
});

test('the test files reaching a sibling: through a helper, with or without its extension; prose does not count', () => {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha'),
    'test/alpha/sib.mjs': '', 'test/alpha/kit.mjs': "export * from './sib';\n",
    'test/alpha/a.test.mjs': "import './kit.mjs';\n", 'test/alpha/b.test.mjs': '// like sib.mjs, but not imported\n', 'test/alpha/c.test.mjs': "import '../alpha/sib.mjs';\n",
  });
  const e = { ...entry('alpha'), tests: ['test/alpha/'] };
  assert.deepEqual(reachers(root, e, 'test/alpha/sib.mjs'), ['test/alpha/a.test.mjs', 'test/alpha/c.test.mjs']);
  assert.deepEqual(reachers(root, e, 'test/alpha/b.test.mjs'), ['test/alpha/b.test.mjs']);
});
