import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gate } from '../lib/gate.mjs';
import { GATE, RECEIPT, block, parseBlock } from '../lib/github.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const realTest = "import test from 'node:test'; import a from 'node:assert'; import { x } from '../../src/alpha/index.mjs';\ntest('x is 2', () => a.equal(x, 2));\n";
const inertTest = "import test from 'node:test'; test('nothing', () => {});\n";

// A product with module alpha on the tranche, and a job branch with a change.
function setup(files) {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' } }),
    'src/alpha/index.mjs': 'export const x = 1;\n',
    'test/alpha/old.test.mjs': inertTest,
  });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const head = commit(root, files);
  return { root, base, head };
}

function fakeIO(receipt) {
  const state = { comments: receipt ? [{ id: 1, body: block(RECEIPT, receipt) }] : [] };
  return {
    state,
    io: {
      comments: () => state.comments,
      addComment: (s, n, body) => { state.comments.push({ id: state.comments.length + 1, body }); return {}; },
      editComment: (s, id, body) => { state.comments.find((c) => c.id === id).body = body; return {}; },
    },
  };
}
const receiptFor = (sha, suiteExit = 0, extra = {}) => ({ kind: 'receipt', module: 'alpha', attempt: 1, sha, commands: [{ cmd: 'node --test', exit: suiteExit, suite: true }], exempt: {}, ...extra });
const run = (s, io, over = {}) => gate(s.root, { base: s.base, head: s.head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: io.io, log: quiet, ...over });

test('a real change with a real test passes, and the receipt agrees', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const io = fakeIO(receiptFor(null));
  io.state.comments[0].body = block(RECEIPT, receiptFor(s.head));
  const r = run(s, io);
  assert.deepEqual(r.findings, []);
  assert.deepEqual([r.run.trigger, r.run.suite, r.run.revert, r.run.receipt], ['code', 'pass', 'pass', 'agrees']);
  assert.equal(git(['diff', '--stat'], { cwd: s.root }), '', 'the revert check restores the tree');
  const g = parseBlock(io.state.comments.at(-1).body, GATE);
  assert.equal(g.runs.length, 1);
});

test('a test that passes with the change reverted is inert', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/y.test.mjs': inertTest });
  const io = fakeIO(receiptFor(s.head));
  const r = run(s, io);
  assert.equal(r.run.revert, 'fail');
  assert.deepEqual(r.findings.map((f) => f.check), ['revert']);
  const exempt = run(s, fakeIO(receiptFor(s.head, 0, { exempt: { revert: 'a refactor; behaviour unchanged' } })));
  assert.equal(exempt.run.revert, 'exempt');
  assert.deepEqual(exempt.findings, []);
});

test('a change with no test fails unless the receipt says why', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n' });
  assert.match(run(s, fakeIO(receiptFor(s.head))).findings[0].message, /adds or changes no test/);
});

test('a receipt claiming a green suite the gate finds red is refuted', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 3;\n', 'test/alpha/x.test.mjs': realTest });
  const r = run(s, fakeIO(receiptFor(s.head, 0)));
  assert.equal(r.run.suite, 'fail');
  assert.equal(r.run.receipt, 'disagrees');
  assert.deepEqual(r.findings.map((f) => f.check).sort(), ['receipt', 'suite']);
});

test('a ready job with no receipt is a finding; a draft runs only the fast checks', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  assert.ok(run(s, fakeIO()).findings.some((f) => f.check === 'receipt'));
  const d = run(s, fakeIO(), { draft: true });
  assert.deepEqual([d.run.trigger, d.run.suite, d.findings.length], ['draft', 'skipped', 0]);
});

test('files outside the module are not the job\'s to change', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest, 'src/beta/b.mjs': 'x' });
  assert.ok(run(s, fakeIO(receiptFor(s.head))).findings.some((f) => f.check === 'ownership' && f.file === 'src/beta/b.mjs'));
});

test('record-only changes end in seconds: a records PR, and records since the last green run', () => {
  const s = setup({ 'process/metrics/alpha.jsonl': '{}\n' });
  const r = run(s, fakeIO());
  assert.deepEqual([r.run.trigger, r.run.suite, r.findings.length], ['record', 'skipped', 0]);

  const c = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const io = fakeIO(receiptFor(c.head));
  assert.equal(run(c, io).run.trigger, 'code');
  const head2 = commit(c.root, { 'process/metrics/alpha.jsonl': '{"row":"merge"}\n' });
  const r2 = gate(c.root, { base: c.base, head: head2, branch: 'job/alpha', pr: 5, slug: 'o/r', io: io.io, log: quiet });
  assert.deepEqual([r2.run.trigger, r2.run.after, r2.findings.length], ['record-since-green', c.head, 0]);
  assert.equal(parseBlock(io.state.comments.find((x) => x.body.includes('p3:gate')).body, GATE).runs.length, 2);
});
