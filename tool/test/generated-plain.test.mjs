// Two measures on the copy, 4 Nov. Copy PR 148: BOB's refresh of the six stale dist/*.bundle.json
// manifests was refused by merge --plain as "module files, which go through a job"; a plain pull
// request may now change a module's committed generated files when that is all it changes of any
// module and the gate regenerated them from its commit byte-identical, the row recording it.
// Copy (ai-use) PR 105: a receipt-only commit after a green code gate was refused because the
// record-since-green run left attempt 3 "present"; it is now checked against that code run when
// it was made on the tree that run tested, and refused, with the act that clears it, when not.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { gate } from '../lib/gate.mjs';
import { BOT, GATE, RECEIPT, block, parseBlock } from '../lib/github.mjs';
import { merge, mergePlain, unagreed } from '../lib/merge.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const PASS = "import test from 'node:test';\ntest('ok', () => {});\n";
// gen.mjs writes the module's committed manifest from its source, as the copy's build does.
const GEN = "import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';\nmkdirSync('src/alpha/dist', { recursive: true });\nwriteFileSync('src/alpha/dist/alpha.bundle.json', JSON.stringify({ from: readFileSync('src/alpha/index.mjs', 'utf8') }) + '\\n');\n";
const BUNDLE = 'src/alpha/dist/alpha.bundle.json';
const fresh = (src) => JSON.stringify({ from: src }) + '\n';
const SRC = 'export const x = 1;\n';
const CONFIG = { generated: [{ paths: [BUNDLE], regenerate: ['node', 'gen.mjs'], verify: ['node', '-e', 'process.exit(0)'] }] };

// The gate's own io: rows it posts are the genuine ones (verifyRow's stand-in).
function gateIO(comments = []) {
  const state = { comments, genuine: new Set() };
  const key = (r) => `${r.at}|${r.sha}|${r.trigger}`;
  return {
    state,
    io: {
      comments: () => state.comments,
      getPR: () => ({ user: { login: 'civicsmith' } }),
      addComment: (s, n, body) => {
        state.comments.push({ id: state.comments.length + 1, body, user: { login: BOT } });
        for (const r of parseBlock(body, GATE)?.runs || []) state.genuine.add(key(r));
        return {};
      },
      verify: (s, r) => state.genuine.has(key(r)),
    },
  };
}

// A product whose module alpha commits a stale generated manifest, with origin, and BOB's
// refresh branch holding `files`.
function product(files) {
  const root = makeRepo({
    'process/config.json': CONFIG,
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'COMPLETE' } }),
    'gen.mjs': GEN,
    'src/alpha/index.mjs': SRC,
    [BUNDLE]: '{"from":"stale"}\n',
    'test/alpha/x.test.mjs': PASS,
    '.github/workflows/process-gate.yml': 'on: pull_request\n',
  });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'bob/refresh', 'tranche'], { cwd: root });
  const sha = commit(root, files);
  git(['push', '-q', 'origin', 'main', 'tranche', 'bob/refresh'], { cwd: root });
  return { root, base, sha };
}
const gateOn = (p, g) => gate(p.root, { base: p.base, head: p.sha, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: g.io, log: quiet });
const back = (p) => { git(['checkout', '-q', '-f', 'bob/refresh'], { cwd: p.root }); git(['clean', '-qfd'], { cwd: p.root }); git(['checkout', '-q', 'main'], { cwd: p.root }); };

function plainIO(p, comments, verify) {
  const calls = { merged: null };
  const pr = () => ({ state: 'open', draft: false, mergeable: true, base: { ref: 'tranche', repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: 'bob/refresh', sha: p.sha, repo: { full_name: 'o/r' } } });
  const green = { id: 1, status: 'completed', conclusion: 'success', started_at: '2026-11-04T06:00:00Z' };
  return {
    calls,
    io: {
      getPR: pr, requiredChecks: () => ({ checks: [{ context: 'gate' }] }), checkRuns: () => [green], checkRun: () => green,
      comments: () => comments, verify, repo: { released: () => false, shim: () => null, descends: () => false },
      mergePR: (slug, n, sha, o) => { calls.merged = { sha, ...o }; return { merged: true, sha: 'm'.repeat(40) }; },
    },
  };
}
const q = { slug: 'o/r', log: quiet, reviewed: 'fresh reviewer', rounds: 1 };

test('a refresh-only plain pull request: the gate regenerates byte-identical, records it, and merge --plain merges it', () => {
  const p = product({ [BUNDLE]: fresh(SRC) });
  const g = gateIO();
  const r = gateOn(p, g);
  assert.deepEqual(r.findings, []);
  assert.equal(r.run.trigger, 'code');
  assert.deepEqual(r.run.refresh, { files: [BUNDLE], result: 'identical', differ: [] });
  back(p);
  const f = plainIO(p, g.state.comments, g.io.verify);
  const out = mergePlain(p.root, 148, { ...q, io: f.io });
  assert.equal(out.merged, true);
  assert.equal(f.calls.merged.sha, p.sha);
  // Without a verified row that recorded it (a forged comment, or none), it is refused.
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, g.state.comments, () => false).io }), /changes generated module files \(src\/alpha\/dist\/alpha\.bundle\.json\): no green process-gate run on .* regenerated them byte-identical/);
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, [], () => true).io }), /no green process-gate run/);
});

test('a refresh that also changes a module\'s source is refused: no other file of a module may change', () => {
  const src = 'export const x = 2;\n';
  const p = product({ [BUNDLE]: fresh(src), 'src/alpha/index.mjs': src });
  const g = gateIO();
  gateOn(p, g);
  back(p);
  const f = plainIO(p, g.state.comments, g.io.verify);
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: f.io }), /changes module files, which go through a job: src\/alpha\/index\.mjs \(alpha\); a plain pull request may change a module's generated files only, and only to their regenerated bytes/);
  assert.equal(f.calls.merged, null);
});

test('a generated file that differs from a regenerate is a gate finding, and merge --plain refuses it', () => {
  const p = product({ [BUNDLE]: '{"from":"hand-edited"}\n' });
  const g = gateIO();
  const r = gateOn(p, g);
  assert.equal(r.run.ok, false);
  assert.deepEqual(r.run.refresh, { files: [BUNDLE], result: 'differs', differ: [BUNDLE] });
  assert.match(r.findings.find((x) => x.file === BUNDLE).message, /is not what its regenerate writes from this commit/);
  back(p);
  // Even were GitHub's check green, the row is red and says why.
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, g.state.comments, g.io.verify).io }), /no green process-gate run on .* regenerated them byte-identical \(its newest run: differs, src\/alpha\/dist\/alpha\.bundle\.json differ\)/);
});

test('records pushed after the green refresh run keep its comparison', () => {
  const p = product({ [BUNDLE]: fresh(SRC) });
  const g = gateIO();
  gateOn(p, g);
  git(['checkout', '-q', '-f', 'bob/refresh'], { cwd: p.root });
  const head2 = commit(p.root, { 'process/metrics/alpha.jsonl': '{}\n' });
  const r2 = gate(p.root, { base: p.base, head: head2, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: g.io, log: quiet });
  assert.deepEqual([r2.run.trigger, r2.run.refresh?.result], ['record-since-green', 'identical']);
});

// ai-use PR 105: attempt 1 agreed on the code run; attempt 3 was a receipt-only commit after it.
const realTest = "import test from 'node:test'; import a from 'node:assert'; import { x } from '../../src/alpha/index.mjs';\ntest('x is 2', () => a.equal(x, 2));\n";
const receiptOf = (attempt, sha, exit = 0, extra = {}) => ({ kind: 'receipt', module: 'alpha', attempt, sha, commands: [{ cmd: 'node --test', exit, suite: true }], exempt: {}, ...extra });
function jobPR({ testFile = realTest, exempt } = {}) {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' } }), 'src/alpha/index.mjs': SRC, 'test/alpha/old.test.mjs': PASS });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const c0 = commit(root, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'src/alpha/extra.mjs': 'export const y = 1;\n', 'test/alpha/x.test.mjs': testFile });
  git(['rm', '-q', 'src/alpha/extra.mjs'], { cwd: root });
  const code = commit(root, {});
  const g = gateIO([{ id: 1, body: block(RECEIPT, receiptOf(1, code, 0, exempt ? { exempt: { revert: exempt } } : {})), user: { login: 'civicsmith' } }]);
  const first = gate(root, { base, head: code, branch: 'job/alpha', pr: 105, slug: 'o/r', io: g.io, log: quiet });
  assert.deepEqual([first.run.trigger, first.run.receipt, first.run.revert, first.run.ok], ['code', 'agrees', exempt ? 'exempt' : 'pass', true]);
  // Attempt 3: job complete's commit writes only the entry and the metrics.
  const head = commit(root, { 'process/ledger/alpha.json': entry('alpha', { status: { state: 'COMPLETE' } }), 'process/metrics/alpha.jsonl': '{"row":"attempt","event":"complete","attempt":3}\n' });
  const again = (receipt) => {
    g.state.comments.push({ id: g.state.comments.length + 1, body: block(RECEIPT, receipt), user: { login: 'civicsmith' } });
    return gate(root, { base, head, branch: 'job/alpha', pr: 105, slug: 'o/r', io: g.io, log: quiet });
  };
  return { root, c0, code, head, again };
}

test('a later attempt on a receipt-only commit after a green code run is checked against that run, and agrees', () => {
  const j = jobPR();
  const r = j.again(receiptOf(3, j.head));
  assert.deepEqual([r.run.trigger, r.run.after, r.run.receipt, r.run.receipt_attempt, r.run.receipt_measured, r.run.ok], ['record-since-green', j.code, 'agrees', 3, j.code, true]);
});

test('a later attempt claiming what the code run did not find disagrees, and is a finding', () => {
  const j = jobPR();
  const r = j.again(receiptOf(3, j.head, 1));
  assert.equal(r.run.receipt, 'disagrees');
  assert.match(r.findings.find((f) => f.check === 'receipt').message, new RegExp(`the receipt claims the suite failed; the gate's run on ${j.code.slice(0, 10)} passed`));
});

test('a later attempt made on code no run measured stays unchecked, and merge says what clears it', () => {
  const j = jobPR();
  const r = j.again(receiptOf(3, j.c0));
  assert.equal(r.run.receipt, 'unmeasured');
  assert.match(r.run.receipt_unmeasured, new RegExp(`names ${j.c0.slice(0, 10)}, whose code is not what the last green code run, on ${j.code.slice(0, 10)}, tested`));
  // A revert exemption the code run relied on, not claimed by the later attempt, is not measured either.
  const k = jobPR({ testFile: PASS, exempt: 'a refactor' });
  const e = k.again(receiptOf(3, k.head));
  assert.equal(e.run.receipt, 'unmeasured');
  assert.match(e.run.receipt_unmeasured, /passed its revert check by an exemption this receipt does not claim/);
  assert.equal(k.again(receiptOf(3, k.head, 0, { exempt: { revert: 'a refactor' } })).run.receipt, 'agrees');

  // merge's refusal names the act: a code change, or a new gate event at a pin that checks the receipt.
  const row = { sha: j.head, trigger: 'record-since-green', after: j.code, ok: true, receipt: 'unmeasured', receipt_attempt: 3, receipt_unmeasured: r.run.receipt_unmeasured };
  assert.match(unagreed([row], j.head, 3), /left the receipt unmeasured: it names .*No run measured what attempt 3 claims: push a code change so the gate runs the suite, or, once the product's pin checks a receipt against the last green code run, give the gate on .* a new event \(edit the pull request/);
  // The row PR 105 met, from a pin before this check: "present".
  const old = { sha: j.head, trigger: 'record-since-green', after: j.code, ok: true, receipt: 'present', receipt_attempt: 3 };
  assert.match(unagreed([old], j.head, 3), /left the receipt present: the gate on it ran no suite \(only records changed since .*\), and its pin did not check the receipt against that run\. No run measured what attempt 3 claims: push a code change so the gate runs the suite, or, once the product's pin checks/);
  assert.equal(unagreed([{ ...old, receipt: 'agrees' }], j.head, 3), '');
});

test('merge refuses an unchecked later attempt with the words that clear it', () => {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha') });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const head = commit(root, { 'src/alpha/a.mjs': 'x' });
  git(['push', '-q', 'origin', 'tranche', 'job/alpha', 'main'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const io = {
    getPR: () => ({ state: 'open', draft: false, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: 'job/alpha', sha: head } }),
    comments: () => [
      { id: 1, body: block(RECEIPT, { module: 'alpha', attempt: 3, sha: head }), user: { login: 'civicsmith' } },
      { id: 2, body: block(GATE, { runs: [{ sha: head, trigger: 'record-since-green', after: 'c'.repeat(40), ok: true, receipt: 'present', receipt_attempt: 3, run_id: 11 }] }), user: { login: BOT } },
    ],
    checkRun: () => ({ status: 'completed', conclusion: 'success' }),
    verify: () => true,
    mergePR: () => assert.fail('nothing merges'),
  };
  assert.throws(() => merge(root, 105, { slug: 'o/r', io, noReview: 'x', log: quiet }), /checked receipt attempt 3 and agreed with it; its newest run left the receipt present: .* push a code change so the gate runs the suite, or, once the product's pin checks a receipt against the last green code run, give the gate on .* a new event \(edit the pull request/);
});

// Review 1 of PR 95.
test('a regenerate that writes nothing cannot pass a hand-edited file, and a changed generator is refused', () => {
  // The generator, unchanged, skips work when its output exists: the gate removes the file first.
  const lazy = "import { existsSync } from 'node:fs';\nif (!existsSync('src/alpha/dist/alpha.bundle.json')) await import('./gen-real.mjs');\n";
  const p = product({ [BUNDLE]: '{"from":"evil"}\n' });
  git(['checkout', '-q', '-f', 'tranche'], { cwd: p.root });
  const base2 = commit(p.root, { 'gen.mjs': lazy, 'gen-real.mjs': GEN });
  git(['checkout', '-q', 'bob/refresh'], { cwd: p.root });
  git(['merge', '-q', '--no-edit', 'tranche'], { cwd: p.root });
  const head = git(['rev-parse', 'HEAD'], { cwd: p.root });
  const r = gate(p.root, { base: base2, head, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: gateIO().io, log: quiet });
  assert.equal(r.run.refresh.result, 'differs', JSON.stringify(r.run.refresh));
  assert.equal(r.run.ok, false);

  // A pull request that rewrites the generator to write nothing, with its "refreshed" file.
  const q2 = product({ [BUNDLE]: '{"from":"evil"}\n', 'gen.mjs': '// nothing\n' });
  const g = gateIO();
  const r2 = gateOn(q2, g);
  assert.equal(r2.run.refresh.result, 'other files changed');
  assert.match(r2.findings.find((f) => f.file === 'gen.mjs').message, /changes generated module files and gen\.mjs: a refresh changes only generated files/);
  back(q2);
  assert.throws(() => mergePlain(q2.root, 148, { ...q, io: plainIO(q2, g.state.comments, g.io.verify).io }), /changes generated module files and gen\.mjs: a refresh changes only generated files \(and records\)/);
  // Nor a file the generator imports, which no command names (review 2 of PR 95).
  const imp = product({ [BUNDLE]: '{"from":"evil"}\n', 'gen-lib.mjs': 'export default 1;\n' });
  const g3 = gateIO();
  assert.equal(gateOn(imp, g3).run.refresh.result, 'other files changed');
  back(imp);
  assert.throws(() => mergePlain(imp.root, 148, { ...q, io: plainIO(imp, g3.state.comments, g3.io.verify).io }), /and gen-lib\.mjs: a refresh changes only/);
});

test('a refresh that removes a committed generated file is refused, even when the path is ignored', () => {
  const p = product({ 'process/metrics/alpha.jsonl': '{}\n' });
  git(['checkout', '-q', '-f', 'tranche'], { cwd: p.root });
  const base2 = commit(p.root, { '.gitignore': `${BUNDLE}\n` });
  git(['checkout', '-q', 'bob/refresh'], { cwd: p.root });
  git(['merge', '-q', '--no-edit', 'tranche'], { cwd: p.root });
  git(['rm', '-q', '--cached', BUNDLE], { cwd: p.root });
  git(['commit', '-q', '-m', 'stop committing it'], { cwd: p.root });
  const sha = git(['rev-parse', 'HEAD'], { cwd: p.root });
  const r = gate(p.root, { base: base2, head: sha, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: gateIO().io, log: quiet });
  assert.deepEqual([r.run.refresh.result, r.run.refresh.differ], ['differs', [BUNDLE]]);
  assert.match(r.findings.find((f) => f.file === BUNDLE).message, /is removed/);
});

test('a generated file no module owns is not the refresh check\'s: the gate stays green', () => {
  const root = makeRepo({ 'process/config.json': { generated: [{ paths: ['docs/x.json'], regenerate: ['node', '-e', '0'], verify: ['node', '-e', '0'] }] }, 'process/ledger/alpha.json': entry('alpha'), 'docs/x.json': '1\n' });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'bob/docs'], { cwd: root });
  const head = commit(root, { 'docs/x.json': '2\n' });
  const r = gate(root, { base, head, branch: 'bob/docs', pr: 9, slug: 'o/r', io: gateIO().io, log: quiet });
  assert.deepEqual([r.run.ok, r.run.refresh], [true, undefined], JSON.stringify(r.findings));
});

test('merge --plain needs the refresh row on the base as it is now', () => {
  const p = product({ [BUNDLE]: fresh(SRC) });
  const g = gateIO();
  gateOn(p, g);
  back(p);
  git(['checkout', '-q', 'tranche'], { cwd: p.root });
  commit(p.root, { 'README.md': 'the tranche moved\n' });
  git(['push', '-q', 'origin', 'tranche'], { cwd: p.root });
  git(['checkout', '-q', 'main'], { cwd: p.root });
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, g.state.comments, g.io.verify).io }), /against tranche as it is regenerated them byte-identical \(its newest run: identical\); tranche moved since its newest run: give the gate a new event on the base as it is/);
});

test('a row that builds an uncommitted path and writes a refreshed one is regenerated after the removal (review 2 of PR 95)', () => {
  const both = "import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';\nmkdirSync('src/alpha/dist', { recursive: true });\nwriteFileSync('src/alpha/dist/alpha.bundle.json', JSON.stringify({ from: readFileSync('src/alpha/index.mjs', 'utf8') }) + '\\n');\nwriteFileSync('src/alpha/dist/rows.mjs', 'export default 1;\\n');\n";
  const p = product({ [BUNDLE]: fresh(SRC) });
  git(['checkout', '-q', '-f', 'tranche'], { cwd: p.root });
  const base2 = commit(p.root, { 'gen.mjs': both, '.gitignore': 'src/alpha/dist/rows.mjs\n', 'process/config.json': { generated: [{ ...CONFIG.generated[0], paths: [BUNDLE, 'src/alpha/dist/rows.mjs'] }] } });
  git(['checkout', '-q', 'bob/refresh'], { cwd: p.root });
  git(['merge', '-q', '--no-edit', 'tranche'], { cwd: p.root });
  const head = git(['rev-parse', 'HEAD'], { cwd: p.root });
  const r = gate(p.root, { base: base2, head, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: gateIO().io, log: quiet });
  assert.deepEqual(r.run.built, ['src/alpha/dist/rows.mjs']);
  assert.equal(r.run.refresh.result, 'identical', JSON.stringify(r.findings));
});
