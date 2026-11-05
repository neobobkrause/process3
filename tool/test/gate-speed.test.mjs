// Build gate-speed (5 Nov): the revert check in one concurrent run, base-red's tree prepared
// beside the head's install, and a change only to a requirements file running only the tests
// that read it, each with the verdicts it had before.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gate as gateRun, gateComment, requirementsOnly, revertCheck } from '../lib/gate.mjs';
import { baseRed, changedInTree, startBase } from '../lib/basered.mjs';
import { readResults, runSuite } from '../lib/suite.mjs';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const gate = (root, o) => { const r = gateRun(root, o); if (o.pr && o.post !== false) o.io.addComment(o.slug, o.pr, gateComment(r.run)); return r; };
const quiet = () => {};
const imp = (what) => `import test from 'node:test'; import a from 'node:assert'; import { x } from '../../src/alpha/index.mjs';\n${what}\n`;
const realTest = imp("test('x is 2', () => a.equal(x, 2));");
const inertTest = "import test from 'node:test'; test('nothing', () => {});\n";
const redTest = "import { describe, test } from 'node:test'; import a from 'node:assert';\ndescribe('plane', () => { test('has ai-catalogue', () => a.fail('no ai-catalogue')); });\n";

function setup(baseFiles, files, { alpha = {} } = {}) {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' }, ...alpha }),
    'src/alpha/index.mjs': 'export const x = 1;\n',
    'req/alpha.md': '# alpha\n\n- **R1** x is one\n',
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
const receiptFor = (sha, extra = {}) => ({ kind: 'receipt', module: 'alpha', attempt: 1, sha, commands: [{ cmd: 'node --test', exit: 0, suite: true }], exempt: {}, ...extra });
const run = (s, receipt, over = {}) => {
  const lines = [];
  const r = gate(s.root, { base: s.base, head: s.head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: fakeIO(receipt).io, log: (l) => lines.push(String(l)), ...over });
  return { ...r, lines };
};
const mine = () => readdirSync(tmpdir()).filter((n) => n.startsWith('p3-base-red-')).filter((n) => {
  try { return Number(readFileSync(join(tmpdir(), n, '.p3-owner'), 'utf8')) === process.pid; } catch { return false; }
});

// 1. The revert check.

test('the revert check: one run of every changed test file gives each the verdict it has run alone', () => {
  const files = {
    'src/alpha/index.mjs': 'export const x = 2;\n',
    'src/alpha/extra.mjs': 'export const y = 3;\n',
    'test/alpha/real.test.mjs': realTest,
    'test/alpha/inert.test.mjs': inertTest,
    'test/alpha/loads.test.mjs': "import test from 'node:test'; import { y } from '../../src/alpha/extra.mjs'; test('y', () => {});\n",
    // A test a sibling declares fails in the file that runs it.
    'test/alpha/sib.mjs': "import test from 'node:test'; import a from 'node:assert'; import { x } from '../../src/alpha/index.mjs';\nexport const declare = () => test('sib x is 2', () => a.equal(x, 2));\n",
    'test/alpha/via.test.mjs': "import { declare } from './sib.mjs'; declare();\n",
    'test/alpha/exits.test.mjs': imp("test('ok', () => {}); if (x !== 2) process.exitCode = 3;"),
  };
  const s = setup({}, files);
  const e = JSON.parse(readFileSync(join(s.root, 'process/ledger/alpha.json'), 'utf8'));
  const tests = Object.keys(files).filter((f) => f.endsWith('.test.mjs'));
  const code = ['src/alpha/index.mjs', 'src/alpha/extra.mjs'];
  const one = revertCheck(s.root, e, s.base, code, tests, { timeout: 60000 });
  assert.deepEqual(one, { inert: ['test/alpha/inert.test.mjs'], loadOnly: ['test/alpha/loads.test.mjs'], alone: 0 });
  // The same files, each alone (a command naming its own reporter is not read per file).
  const alone = revertCheck(s.root, { ...e, suite: { ...e.suite, command: ['node', '--test', '--test-reporter=tap'] } }, s.base, code, tests, { timeout: 60000 });
  assert.deepEqual(alone, { ...one, alone: tests.length });
  assert.equal(git(['status', '--porcelain'], { cwd: s.root }), '', 'the tree is restored');
});

test('the revert check: when a failing test of the run is tolerated, the failing files run alone, with the verdicts they had', () => {
  const s = setup({ 'test/alpha/red.test.mjs': redTest }, {
    'src/alpha/index.mjs': 'export const x = 2;\n',
    'test/alpha/red.test.mjs': redTest + imp("test('x is 2 too', () => a.equal(x, 2));").replace(/^import test.*\n/, "import { x } from '../../src/alpha/index.mjs';\n"),
    'test/alpha/real.test.mjs': realTest,
    'test/alpha/inert.test.mjs': inertTest,
  });
  const e = JSON.parse(readFileSync(join(s.root, 'process/ledger/alpha.json'), 'utf8'));
  const tests = ['test/alpha/red.test.mjs', 'test/alpha/real.test.mjs', 'test/alpha/inert.test.mjs'];
  const tolerated = ['test/alpha/red.test.mjs::plane > has ai-catalogue'];
  const r = revertCheck(s.root, e, s.base, ['src/alpha/index.mjs'], tests, { timeout: 60000, tolerated });
  // The tolerated test is declared in a changed file: every file runs alone at once, no run together.
  assert.deepEqual(r, { inert: ['test/alpha/inert.test.mjs'], loadOnly: [], alone: 3 });
  // Tolerated in a file not among them: the run together decides, as alone would.
  const away = revertCheck(s.root, e, s.base, ['src/alpha/index.mjs'], ['test/alpha/real.test.mjs', 'test/alpha/inert.test.mjs'], { timeout: 60000, tolerated });
  assert.deepEqual(away, { inert: ['test/alpha/inert.test.mjs'], loadOnly: [], alone: 0 });
  // Only the tolerated test fails in red.test.mjs: inert, as run alone.
  const t = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/red.test.mjs': `${redTest}// touched\n`, 'test/alpha/real.test.mjs': realTest });
  const q = revertCheck(t.root, e, t.base, ['src/alpha/index.mjs'], ['test/alpha/red.test.mjs', 'test/alpha/real.test.mjs'], { timeout: 60000, tolerated });
  assert.deepEqual(q, { inert: ['test/alpha/red.test.mjs'], loadOnly: [], alone: 2 });
});

test('the reporter: a done line per file the runner finished, a load line per file that could not load, in no test list', () => {
  const s = setup({}, {
    'test/alpha/a.test.mjs': inertTest,
    'test/alpha/b.test.mjs': "import test from 'node:test'; test('b', () => { throw new Error('b'); });\n",
    'test/alpha/c.test.mjs': "import './gone.mjs';\n",
  });
  const e = JSON.parse(readFileSync(join(s.root, 'process/ledger/alpha.json'), 'utf8'));
  const dir = makeRepo();
  const events = join(dir, 'ev.jsonl');
  const r = runSuite(s.root, e, ['test/alpha/a.test.mjs', 'test/alpha/b.test.mjs', 'test/alpha/c.test.mjs'], { timeout: 60000, events });
  assert.deepEqual(r.ran, { 'test/alpha/a.test.mjs': true, 'test/alpha/b.test.mjs': false, 'test/alpha/c.test.mjs': false });
  assert.deepEqual(r.load, ['test/alpha/c.test.mjs']);
  assert.deepEqual(r.failing.map((t) => t.name).sort(), ['b', 'test/alpha/c.test.mjs']);
  assert.deepEqual(r.passing.map((t) => t.name), ['nothing']);
  assert.deepEqual(r.reported.sort(), ['test/alpha/a.test.mjs', 'test/alpha/b.test.mjs', 'test/alpha/c.test.mjs']);
  assert.deepEqual(readResults(events, s.root).ran, r.ran);
});

test('a revert exemption skips the revert check: the row says exempt, the verdict is unchanged', () => {
  const s = setup({}, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest, 'test/alpha/y.test.mjs': inertTest });
  const plain = run(s, receiptFor(s.head));
  assert.deepEqual([plain.run.revert, plain.run.inert, plain.findings.map((f) => f.check)], ['fail', ['test/alpha/y.test.mjs'], ['revert']]);
  const r = run(s, receiptFor(s.head, { exempt: { revert: 'y is a fixture' } }));
  assert.deepEqual([r.run.revert, r.run.inert, r.findings], ['exempt', undefined, []]);
  assert.ok(r.lines.some((l) => /exempts the revert check \(y is a fixture\): not run/.test(l)), r.lines.join('\n'));
  assert.equal(git(['status', '--porcelain'], { cwd: s.root }), '');
});

// 2. Base-red's tree, prepared beside the head's install.

test('base-red: the base tree prepared in the background gives the verdict the inline one gives, and is removed', () => {
  const s = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const bg = run(s, receiptFor(s.head));
  const inline = run(s, receiptFor(s.head), { prepareBase: false });
  for (const r of [bg, inline]) assert.deepEqual([r.run.ok, r.run.suite, r.run.revert, r.run.receipt, r.run.base_red[0].tests], [true, 'base-red', 'pass', 'agrees', ['test/alpha/red.test.mjs::plane > has ai-catalogue']]);
  assert.ok(bg.lines.some((l) => /prepared in the background/.test(l)), bg.lines.join('\n'));
  assert.ok(!inline.lines.some((l) => /prepared (in the background|beside)/.test(l)));
  assert.deepEqual(mine(), [], 'no base tree is left');
  // A failing test that passes at the base is the PR's either way.
  const t = setup({ 'test/alpha/one.test.mjs': imp("test('x is 1', () => a.equal(x, 1));") }, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  for (const over of [{}, { prepareBase: false }]) assert.match(run(t, receiptFor(t.head), over).findings.find((f) => f.check === 'suite').message, /1 failing test\(s\) pass at the base/);
});

test('base-red: a green suite stops the background preparation and leaves no tree', () => {
  const s = setup({}, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const r = run(s, receiptFor(s.head));
  assert.equal(r.run.suite, 'pass');
  assert.ok(r.lines.some((l) => /prepared beside the head's install/.test(l)));
  assert.deepEqual(mine(), []);
});

test('base-red: the prepared tree serves one call; the next, and one whose preparation ended without a verdict, prepare their own', () => {
  const s = setup({ 'test/alpha/red.test.mjs': redTest }, { 'src/alpha/index.mjs': 'export const x = 2;\n' });
  const e = JSON.parse(readFileSync(join(s.root, 'process/ledger/alpha.json'), 'utf8'));
  const cfg = loadConfig(s.root);
  const failing = [{ file: 'test/alpha/red.test.mjs', name: 'plane > has ai-catalogue' }];
  const lines = [];
  const prepared = startBase(s.root, { base: s.base, cfg, timeout: 60000, log: (l) => lines.push(l) });
  assert.ok(existsSync(prepared.dir));
  const first = baseRed(s.root, e, { base: s.base, failing, cfg, timeout: 60000, prepared, log: (l) => lines.push(l) });
  assert.equal(first.ok, true, first.why);
  assert.equal(prepared.used, true);
  assert.equal(existsSync(prepared.dir), false, 'dropped once used');
  assert.ok(lines.some((l) => /prepared in the background/.test(l)), lines.join('\n'));
  assert.equal(baseRed(s.root, e, { base: s.base, failing, cfg, timeout: 60000, prepared }).ok, true, 'inline');
  // A preparation for another base is not used.
  const other = startBase(s.root, { base: s.head, cfg, timeout: 60000 });
  assert.equal(baseRed(s.root, e, { base: s.base, failing, cfg, timeout: 60000, prepared: other }).ok, true);
  assert.equal(other.used, false);
  other.drop();
  // Ended without a verdict (crashed, killed): prepared inline.
  let dropped = 0;
  const crashed = { base: s.base, used: false, wait: () => null, drop: () => { dropped++; } };
  assert.equal(baseRed(s.root, e, { base: s.base, failing, cfg, timeout: 60000, prepared: crashed }).ok, true);
  assert.equal(dropped, 1);
  // A failed preparation beside the head is prepared again here, with base-red's own budget.
  const refused = { base: s.base, used: false, wait: () => ({ ok: false, why: "the base's build failed: killed" }), drop: () => {} };
  const again = [];
  assert.equal(baseRed(s.root, e, { base: s.base, failing, cfg, timeout: 60000, prepared: refused, log: (l) => again.push(l) }).ok, true);
  assert.ok(again.some((l) => /the background preparation refused \(the base's build failed: killed\): the tree is prepared here/.test(l)));
  // A base that cannot be written is refused, inline or not.
  const bad = startBase(s.root, { base: 'f'.repeat(40), cfg, timeout: 60000 });
  const r = baseRed(s.root, e, { base: 'f'.repeat(40), failing: [{ file: 'src/alpha/index.mjs', name: 'x' }], cfg, timeout: 60000, prepared: bad });
  assert.match(r.why, /^(the base's tree could not be prepared|new failing test file)/);
  bad.drop();
  assert.deepEqual(mine(), []);
});

test('base-red: a base file changed in the tree prepared beside the head is caught, and the tree prepared again', () => {
  const s = setup({ 'test/alpha/red.test.mjs': redTest, 'bin/run.sh': '#!/bin/sh\n' }, { 'src/alpha/index.mjs': 'export const x = 2;\n' });
  git(['update-index', '--chmod=+x', 'bin/run.sh'], { cwd: s.root });
  const e = JSON.parse(readFileSync(join(s.root, 'process/ledger/alpha.json'), 'utf8'));
  const cfg = loadConfig(s.root);
  const failing = [{ file: 'test/alpha/red.test.mjs', name: 'plane > has ai-catalogue' }];
  const p = startBase(s.root, { base: s.base, cfg, timeout: 60000 });
  // Ready, then written into by code of the PR: the failing test made to fail there.
  for (const t0 = Date.now(); !existsSync(join(p.dir, 'exit')) && Date.now() - t0 < 30000;) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  assert.equal(changedInTree(s.root, s.base, p.wt), null);
  writeFileSync(join(p.wt, 'src/alpha/index.mjs'), 'export const x = 9;\n');
  assert.equal(changedInTree(s.root, s.base, p.wt), 'src/alpha/index.mjs');
  const lines = [];
  assert.equal(baseRed(s.root, e, { base: s.base, failing, cfg, timeout: 60000, prepared: p, log: (l) => lines.push(l) }).ok, true);
  assert.ok(lines.some((l) => /src\/alpha\/index\.mjs in the base's tree prepared beside the head is not the base's: the tree is prepared here/.test(l)), lines.join('\n'));
  assert.equal(existsSync(p.dir), false);
});

test('base-red: dropping a preparation kills its whole process group, verdict or not', () => {
  const s = setup({}, { 'src/alpha/index.mjs': 'export const x = 2;\n' });
  // A build that leaves a descendant behind, as an install's lifecycle script may.
  const rows = [{ paths: ['gen/x.txt'], regenerate: ['sh', '-c', 'sleep 30 >/dev/null 2>&1 & exit 0'], verify: ['true'] }];
  const p = startBase(s.root, { base: s.base, cfg: loadConfig(s.root), rows, timeout: 60000 });
  assert.equal(p.wait(30000).ok, true);
  const pgid = Number(readFileSync(`/proc/${process.pid}/stat`, 'utf8').split(' ')[4]);
  const members = () => readdirSync('/proc').filter((n) => /^\d+$/.test(n)).filter((n) => { try { const f = readFileSync(`/proc/${n}/stat`, 'utf8').replace(/^.*\) /s, '').split(' '); return f[0] !== 'Z' && Number(f[2]) !== pgid && readFileSync(`/proc/${n}/cmdline`, 'utf8').startsWith('sleep\u000030'); } catch { return false; } });
  assert.ok(members().length >= 1, 'the descendant outlives the verdict');
  p.drop();
  assert.deepEqual(members(), []);
});

test('base-red: a preparation whose process is gone without a verdict is not waited for', () => {
  const s = setup({}, { 'src/alpha/index.mjs': 'export const x = 2;\n' });
  const rows = [{ paths: ['gen/slow.txt'], regenerate: ['node', '-e', 'setTimeout(() => {}, 20000)'], verify: ['true'] }];
  const p = startBase(s.root, { base: s.base, cfg: loadConfig(s.root), rows, timeout: 60000 });
  // The whole group killed, the shell's exit status unwritten (an OOM kill).
  p.kill();
  const t0 = Date.now();
  assert.equal(p.wait(30000), null);
  assert.ok(Date.now() - t0 < 10000, `${Date.now() - t0} ms`);
  p.drop();
});

test('base-red: a preparation not ready within the wait is stopped and refused with why', () => {
  const s = setup({}, { 'src/alpha/index.mjs': 'export const x = 2;\n' });
  const cfg = loadConfig(s.root);
  // A generated row whose build sleeps: the background process is still building.
  const rows = [{ paths: ['gen/slow.txt'], regenerate: ['node', '-e', 'setTimeout(() => {}, 20000)'], verify: ['true'] }];
  const p = startBase(s.root, { base: s.base, cfg, rows, timeout: 60000 });
  const t0 = Date.now();
  const v = p.wait(1500);
  assert.ok(Date.now() - t0 < 10000);
  assert.match(v.why, /^the base's tree was not ready within \d+ s$/);
  p.drop();
  assert.equal(existsSync(p.dir), false);
});

// 3. A change only to the requirements file.

const IDS = "import test from 'node:test'; import a from 'node:assert'; import { readFileSync } from 'node:fs';\ntest('R1 is listed', () => a.match(readFileSync('req/alpha.md', 'utf8'), /\\*\\*R1\\*\\*/));\n";
const RED_ELSEWHERE = "import test from 'node:test'; test('unrelated red', () => { throw new Error('never run on a text-only change'); });\n";
const reqOnly = (baseFiles = {}, alpha = {}) => setup({
  'test/alpha/ids.test.mjs': IDS,
  'test/alpha/helper.mjs': "import { readFileSync } from 'node:fs';\nexport const text = () => readFileSync(['req', 'alpha' + '.m' + 'd'].join('/') /* requirements */, 'utf8');\n",
  'test/alpha/uses-helper.test.mjs': "import test from 'node:test'; import a from 'node:assert'; import { text } from './helper.mjs';\ntest('R1 via helper', () => a.ok(text().includes('R1')));\n",
  'test/alpha/other.test.mjs': RED_ELSEWHERE,
  ...baseFiles,
}, { 'req/alpha.md': '# alpha\n\n- **R1** x is one, reworded\n' }, { alpha: { paths: ['src/alpha/', 'req/alpha.md'], ...alpha } });
const exempt = (s) => receiptFor(s.head, { exempt: { revert: 'requirements text only' } });

test('a change only to the requirements file runs only the tests that read it: those naming it, and those importing a helper that names its directory', () => {
  const s = reqOnly();
  const r = run(s, exempt(s));
  assert.deepEqual(r.findings, []);
  assert.deepEqual([r.run.suite, r.run.tests], ['pass', [{ total: 2, pass: 2, fail: 0 }]]);
  assert.deepEqual(r.run.requirements_only, [{ module: 'alpha', files: ['test/alpha/ids.test.mjs', 'test/alpha/uses-helper.test.mjs'] }]);
  assert.ok(r.lines.some((l) => l === 'alpha: only its requirements file req/alpha.md changed: the suite runs the 2 test file(s) that read it (test/alpha/helper.mjs, test/alpha/ids.test.mjs, reached from test/alpha/ids.test.mjs, test/alpha/uses-helper.test.mjs)'), r.lines.join('\n'));
  // The tranche into main runs every suite whole.
  const cfg = loadConfig(s.root);
  const e = JSON.parse(readFileSync(join(s.root, 'process/ledger/alpha.json'), 'utf8'));
  assert.deepEqual(requirementsOnly(s.root, cfg, e, { changed: ['req/alpha.md', 'process/metrics/alpha.jsonl'] }), ['test/alpha/ids.test.mjs', 'test/alpha/uses-helper.test.mjs']);
  assert.equal(requirementsOnly(s.root, cfg, e, { changed: ['req/alpha.md', 'src/alpha/index.mjs'] }), null, 'another file changed');
  assert.equal(requirementsOnly(s.root, cfg, { ...e, requirements: undefined }, { changed: ['req/alpha.md'] }), null);
});

test('no test reading the requirements file: the suite is not run, and passes with none', () => {
  const s = setup({ 'test/alpha/other.test.mjs': RED_ELSEWHERE }, { 'req/alpha.md': '# alpha\n\n- **R1** x is one, reworded\n' }, { alpha: { paths: ['src/alpha/', 'req/alpha.md'] } });
  const r = run(s, exempt(s));
  assert.deepEqual(r.findings, []);
  assert.deepEqual([r.run.suite, r.run.tests, r.run.receipt, r.run.requirements_only], ['pass', [{ total: 0, pass: 0, fail: 0 }], 'agrees', [{ module: 'alpha', files: [] }]]);
  assert.ok(!r.lines.some((l) => /prepared beside/.test(l)), 'no suite runs: no base tree is prepared');
  assert.ok(r.lines.some((l) => /no test reads it \(none of its tests names alpha\.md or req\): the suite is not run/.test(l)), r.lines.join('\n'));
});

test('the whole suite runs when code beside the tests may read the requirements file', () => {
  const cases = [
    ['its source names it', { 'src/alpha/doc.mjs': "export const doc = 'req/alpha.md';\n" }, {}, /src\/alpha\/doc\.mjs, of the module's own paths/],
    ['its preload names it', { 'test/hook.mjs': "globalThis.where = 'alpha.md';\n" }, { suite: { cwd: '.', command: ['node', '--import', './test/hook.mjs', '--test'] } }, /test\/hook\.mjs, which the suite preloads/],
    ['a fixture of its tests names its directory', { 'test/alpha/paths.json': '["req"]\n' }, {}, /test\/alpha\/paths\.json, a file of its tests that is not a script/],
    ['a script elsewhere names it', { 'tools/check.mjs': "export const f = 'alpha.md';\n" }, {}, /tools\/check\.mjs, outside its tests, names alpha\.md/],
  ];
  for (const [what, files, alpha, why] of cases) {
    const s = reqOnly(files, alpha);
    const r = run(s, exempt(s));
    // All three files run; the red one, red at the base too, is base-red.
    assert.deepEqual([r.run.suite, r.run.tests[0].total], ['base-red', 3], what);
    assert.ok(r.lines.some((l) => why.test(l) && /the whole suite runs/.test(l)), `${what}: ${r.lines.join('\n')}`);
  }
  // Beside the tests, only the file's own name counts: its directory's word is prose there.
  const w = reqOnly({ 'src/alpha/words.mjs': "export const msg = 'its req read x, not in words.json';\n" });
  assert.deepEqual(run(w, exempt(w)).run.tests, [{ total: 2, pass: 2, fail: 0 }]);
  // Named only in a comment that starts a line: not a reader.
  const c = reqOnly({ 'src/alpha/doc.mjs': '/* alpha: its requirements are\n * req/alpha.md */\n// see req/alpha.md\nexport const y = 1;\n' });
  assert.deepEqual(run(c, exempt(c)).run.tests, [{ total: 2, pass: 2, fail: 0 }]);
  // A plain pull request changing only the file is narrowed too.
  const p = reqOnly();
  git(['checkout', '-q', '-b', 'fix-words', p.head], { cwd: p.root });
  const plain = run(p, null, { branch: 'fix-words' });
  assert.deepEqual([plain.run.scope, plain.run.suite, plain.run.tests], [['alpha'], 'pass', [{ total: 2, pass: 2, fail: 0 }]]);
});
