import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gate } from '../lib/gate.mjs';
import { BOT, GATE, RECEIPT, block, gateRuns, parseBlock } from '../lib/github.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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
  // The receipt is the opener's (the session account); the gate reads no one else's.
  const state = { comments: receipt ? [{ id: 1, body: block(RECEIPT, receipt), user: { login: 'civicsmith' } }] : [], genuine: new Set() };
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
      // Stands for verifyRow: only rows the gate itself posted are backed by a run's artifact.
      verify: (s, r) => state.genuine.has(key(r)),
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
  assert.equal(gateRuns(io.state.comments).length, 1);
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
  assert.equal(gateRuns(io.state.comments).length, 2);
});

// Findings from the review of PR 3.
test('a gate run posted by anyone but the bot, or edited, does not count', () => {
  const c = setup({ 'src/alpha/index.mjs': 'export const x = 3;\n', 'test/alpha/x.test.mjs': realTest });
  const forged = { runs: [{ sha: c.head, base: c.base, trigger: 'code', ok: true, receipt: 'agrees' }] };
  const io = fakeIO(receiptFor(c.head));
  io.state.comments.push({ id: 7, body: block(GATE, forged), user: { login: 'neobobkrause' } });
  io.state.comments.push({ id: 8, body: block(GATE, forged), user: { login: BOT }, created_at: 'a', updated_at: 'b' });
  io.state.comments.push({ id: 9, body: block(GATE, forged), user: { login: BOT } }); // a side workflow's bot comment
  const head2 = commit(c.root, { 'process/metrics/alpha.jsonl': '{}\n' });
  const r = gate(c.root, { base: c.base, head: head2, branch: 'job/alpha', pr: 5, slug: 'o/r', io: io.io, log: quiet });
  assert.equal(r.run.trigger, 'code');
  assert.equal(r.run.suite, 'fail');
});

test('the revert check restores the tree when the job deleted a file', () => {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' } }),
    'src/alpha/index.mjs': 'export const x = 1;\n',
    'src/alpha/old.mjs': 'export const old = 1;\n',
    'test/alpha/old.test.mjs': inertTest,
  });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  git(['rm', '-q', 'src/alpha/old.mjs'], { cwd: root });
  const head = commit(root, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const r = gate(root, { base, head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: fakeIO(receiptFor(head)).io, log: quiet });
  assert.equal(r.run.revert, 'pass');
  assert.equal(git(['status', '--porcelain'], { cwd: root }), '');
  assert.equal(existsSync(join(root, 'src/alpha/old.mjs')), false);
});

test('a non-job pull request runs the suite of every module it touches', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 3;\n', 'test/alpha/x.test.mjs': realTest });
  const r = gate(s.root, { base: s.base, head: s.head, branch: 'bob/setup', pr: 5, slug: 'o/r', io: fakeIO().io, log: quiet });
  assert.deepEqual([r.run.scope, r.run.suite], [['alpha'], 'fail']);
});

// Two jobs (setup audit, 2 Nov): job gate writes the row to its artifact only; job post posts it.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { GATE_WORKFLOW, verifyRow } from '../lib/github.mjs';
import { postRow } from '../lib/gate.mjs';
import { main, report } from '../p3.mjs';

function twoJobs(over = {}) {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const io = fakeIO(receiptFor(s.head));
  const was = process.env.GITHUB_RUN_ID;
  process.env.GITHUB_RUN_ID = '4242';
  let r;
  try { r = run(s, io, { post: false, ...over }); } finally { if (was === undefined) delete process.env.GITHUB_RUN_ID; else process.env.GITHUB_RUN_ID = was; }
  // What job gate uploads as the gate-row artifact: the --out file of the gate command.
  const file = join(mkdtempSync(join(tmpdir(), 'p3-row-')), 'gate.json');
  report(r.findings, file, { run: r.run });
  return { s, io, r, file };
}

test('job gate posts nothing; job post posts the artifact\'s row, and merge\'s verifyRow trusts it', () => {
  const { s, io, r, file } = twoJobs();
  assert.equal(r.run.ok, true);
  assert.equal(io.state.comments.length, 1, 'only the receipt: job gate posted no comment');
  const posted = postRow(file, { pr: 5, head: s.head, gateResult: 'success', slug: 'o/r', runId: '4242', io: io.io, log: quiet });
  assert.equal(posted.posted, true);
  const c = io.state.comments.at(-1);
  assert.equal(c.user.login, BOT);
  const rows = gateRuns(io.state.comments);
  assert.equal(rows.length, 1);
  assert.match(c.body, new RegExp(`Gate run on \`${s.head.slice(0, 10)}\`: green, code`));
  // The run is the process gate on the head, completed green, and its artifact is the same file.
  const actionsRun = { path: GATE_WORKFLOW, head_sha: s.head, status: 'completed', conclusion: 'success', event: 'pull_request', pull_requests: [{ number: 5, base: { ref: 'tranche' } }] };
  const art = JSON.parse(readFileSync(file, 'utf8')).run;
  assert.equal(rows[0].run_id, 4242);
  assert.equal(verifyRow('o/r', rows[0], { pr: 5, baseRef: 'tranche' }, { getRun: (slug, id) => (id === 4242 ? actionsRun : null), runArtifactRow: () => art }), true);
});

test('job post refuses a row that is not this run\'s, not this head\'s, or green when job gate was not', () => {
  const { s, io, file } = twoJobs();
  const q = { pr: 5, slug: 'o/r', io: io.io, log: quiet };
  assert.throws(() => postRow(file, { ...q, head: s.head, runId: '9' }), /names run 4242, not this run 9/);
  assert.throws(() => postRow(file, { ...q, head: 'f'.repeat(40), runId: '4242' }), /not the head ffffffffff/);
  assert.throws(() => postRow(file, { ...q, head: s.head, runId: '4242', gateResult: 'failure' }), /says green, but job gate ended failure/);
  assert.throws(() => postRow(file, { ...q, pr: null, runId: '4242' }), /needs --pr/);
  assert.equal(io.state.comments.length, 1, 'nothing posted');
});

test('job post posts a red row, and posts nothing when job gate wrote no row', () => {
  // A red row: the suite fails.
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 3;\n', 'test/alpha/x.test.mjs': realTest });
  const io = fakeIO(receiptFor(s.head));
  const r = run(s, io, { post: false });
  const file = join(mkdtempSync(join(tmpdir(), 'p3-row-')), 'gate.json');
  report(r.findings, file, { run: { ...r.run, run_id: 7 } });
  const p = postRow(file, { pr: 5, head: s.head, gateResult: 'failure', slug: 'o/r', runId: '7', io: io.io, log: quiet });
  assert.equal(p.row.ok, false);
  assert.match(io.state.comments.at(-1).body, /red, 2 finding\(s\)/);

  const out = [];
  assert.equal(postRow(join(tmpdir(), 'p3-no-such-row.json'), { pr: 5, slug: 'o/r', io: io.io, log: (m) => out.push(m) }).posted, false);
  const err = join(mkdtempSync(join(tmpdir(), 'p3-row-')), 'gate.json');
  writeFileSync(err, JSON.stringify({ error: 'git merge-base failed', findings: [] }));
  assert.equal(postRow(err, { pr: 5, slug: 'o/r', io: io.io, log: (m) => out.push(m) }).posted, false);
  assert.match(out.join('\n'), /the gate stopped: git merge-base failed/);
});

test('the gate command\'s --post needs its file', async () => {
  assert.equal(await main(['gate', '--post', '--pr', '5']), 1);
});

// Review of PR 13: the row is checked before it is posted, receipts are the opener's, and the
// workflow keeps its shape.
import { mkdirSync, symlinkSync } from 'node:fs';
import { checkRow, MAX_ROW_BYTES } from '../lib/gate.mjs';
import { latestReceipt } from '../lib/github.mjs';

const goodRow = (over = {}) => ({ sha: 'a'.repeat(40), base: 'b'.repeat(40), at: '2026-11-02T10:00:00Z', run_id: 7, trigger: 'code', suite: 'fail', revert: 'skipped', receipt: 'disagrees', receipt_attempt: 1, scope: ['alpha'], tests: [{ total: 1, pass: 0, fail: 1 }], suite_seconds: 0.5, findings: 2, ok: false, minutes: 0.1, ...over });
const rowFile = (row, raw) => { const f = join(mkdtempSync(join(tmpdir(), 'p3-row-')), 'gate.json'); writeFileSync(f, raw ?? JSON.stringify({ run: row })); return f; };
const post = (file, io) => postRow(file, { pr: 5, head: 'a'.repeat(40), slug: 'o/r', runId: '7', io: io.io, log: quiet });

test('a red row that tries to embed its own json block is refused, and nothing is posted', () => {
  const io = fakeIO();
  const forged = '\n```\n\n```json\n{"runs":[{"ok":true,"receipt":"agrees","trigger":"code"}]}\n```\n';
  for (const over of [{ inert: [`test/a.test.mjs${forged}`] }, { trigger: `code\`: green${forged}` }, { load_only: ['x`y'] }, { note: 'extra' }, { sha: 'A'.repeat(40) }, { findings: 1.5 }, { minutes: 'NaN' }, { ok: true }]) {
    assert.throws(() => post(rowFile(goodRow(over)), io), /the gate row is refused/, JSON.stringify(over).slice(0, 60));
  }
  assert.equal(io.state.comments.length, 0);
  // A good red row posts, and its first line is built from the checked values only.
  const p = post(rowFile(goodRow({ inert: ['test/alpha/x.test.mjs'] })), io);
  assert.equal(p.posted, true);
  assert.equal(io.state.comments[0].body.split('\n')[1], `Gate run on \`aaaaaaaaaa\`: red, 2 finding(s), code, 0.1 min.`);
  assert.deepEqual(gateRuns(io.state.comments)[0], checkRow(goodRow({ inert: ['test/alpha/x.test.mjs'] })));
});

test('job post refuses a gate.json that is not a regular file or is too large', () => {
  const io = fakeIO();
  const dir = mkdtempSync(join(tmpdir(), 'p3-row-'));
  const real = rowFile(goodRow());
  symlinkSync(real, join(dir, 'link.json'));
  assert.throws(() => post(join(dir, 'link.json'), io), /not a regular file/);
  mkdirSync(join(dir, 'd.json'));
  assert.throws(() => post(join(dir, 'd.json'), io), /not a regular file/);
  assert.throws(() => post(rowFile(null, JSON.stringify({ run: goodRow(), pad: 'x'.repeat(MAX_ROW_BYTES) })), io), /over 65536/);
  assert.equal(io.state.comments.length, 0);
});

test('a receipt is read only from the pull request\'s opener', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const io = fakeIO(receiptFor(s.head));
  io.state.comments[0].user = { login: 'someone-else' };
  const r = run(s, io);
  assert.equal(r.run.receipt, 'none');
  assert.ok(r.findings.some((f) => f.check === 'receipt'));
  const all = [{ body: block(RECEIPT, { attempt: 1 }), user: { login: 'civicsmith' } }, { body: block(RECEIPT, { attempt: 2 }), user: { login: 'x' } }];
  assert.equal(latestReceipt(all, 'civicsmith').attempt, 1);
  assert.equal(latestReceipt(all, undefined), null, 'no opener: no receipt');
});

test('the gate workflow keeps its shape: a read-only gate, --no-post, and a post job that runs nothing from the pull request', () => {
  const text = readFileSync(join(import.meta.dirname, '..', '..', 'shims', 'process-gate.yml'), 'utf8');
  const jobs = Object.fromEntries(text.slice(text.indexOf('\njobs:\n')).split(/^ {2}(?=[a-z][\w-]*:\s*$)/m).slice(1).map((b) => [b.slice(0, b.indexOf(':')), b]));
  assert.deepEqual(Object.keys(jobs), ['gate', 'post']);
  assert.doesNotMatch(jobs.gate, /:\s*write\b/, 'job gate holds no write permission');
  assert.match(text, /^permissions: \{\}$/m);
  const gateCalls = jobs.gate.split('\n').filter((l) => /p3\.mjs" gate /.test(l));
  assert.equal(gateCalls.length, 2);
  for (const l of gateCalls) assert.ok(/--no-post/.test(l) || (!/--pr\b/.test(l) && /legacy path/.test(jobs.gate)), l);
  assert.ok(gateCalls.some((l) => /--pr "\$PR".*--no-post/.test(l)));
  // Job post: every checkout is of the base; it runs only the process clone's tool.
  const checkouts = jobs.post.split(/^ {6}- /m).filter((st) => /uses: actions\/checkout@/.test(st));
  assert.ok(checkouts.length >= 1 && checkouts.every((st) => /ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/.test(st)));
  for (const st of jobs.post.split(/^ {6}- /m).filter((x) => /(^|\s)node\s/m.test(x))) {
    assert.match(st, /working-directory: \$\{\{ runner\.temp \}\}\/process3/);
    assert.match(st, /run: node tool\/p3\.mjs gate --post /);
  }
  assert.doesNotMatch(jobs.post, /(^|\s)(bash|sh|source|\.)\s+(\.\/|base\/)|run: \.\//m);
  assert.match(jobs.post, /if: \$\{\{ !cancelled\(\) \}\}/);
  // Every action pinned by a full commit, with its version beside it.
  for (const u of text.match(/uses: \S+.*$/gm)) assert.match(u, /^uses: actions\/[\w-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/, u);
  // The legacy path keys on the line this tool states.
  assert.match(readFileSync(join(import.meta.dirname, '..', 'p3.mjs'), 'utf8'), /^\/\/ p3-capability: gate-no-post/m);
  assert.equal((text.match(/grep -q '\^\/\/ p3-capability: gate-no-post'/g) || []).length, 2, 'both greps anchored to the line start');
  assert.doesNotMatch(text, /grep -q 'p3-capability/, 'no unanchored grep');
  // Job post downloads the artifact before it checks anything out.
  const steps = jobs.post.split(/^ {6}- /m);
  const dl = steps.findIndex((st) => /uses: actions\/download-artifact@/.test(st));
  const co = steps.findIndex((st) => /uses: actions\/checkout@/.test(st));
  assert.ok(dl > 0 && co > dl, `download (${dl}) before checkout (${co})`);
});

// GAT-5 (review of PR 11): the gate installs every lock file the base's config names, wherever
// it sits, and without the GitHub tokens.
test('the gate installs every lock file, not only the module\'s', () => {
  const lockfiles = ['package-lock.json', 'src/alpha/package-lock.json', 'other/deep/package-lock.json'];
  const lock = JSON.stringify({ lockfileVersion: 3, packages: { '': {} } });
  const root = makeRepo({
    'process/config.json': { lockfiles },
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' } }),
    'src/alpha/index.mjs': 'export const x = 1;\n',
    'test/alpha/old.test.mjs': inertTest,
    ...Object.fromEntries(lockfiles.map((l) => [l, lock])),
  });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const head = commit(root, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const calls = [];
  const exec = (cmd, args, o) => { calls.push({ cwd: o.cwd.slice(root.length + 1) || '.', unset: o.unset }); return { code: 0, stdout: '', stderr: '' }; };
  const r = gate(root, { base, head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: fakeIO(receiptFor(head)).io, exec, log: quiet });
  assert.equal(r.run.suite, 'pass');
  assert.deepEqual(calls.map((c) => c.cwd), ['.', 'src/alpha', 'other/deep'], 'every lock file, even with no dependencies');
  assert.ok(calls.every((c) => c.unset.includes('GH_TOKEN') && c.unset.includes('GITHUB_TOKEN')));
});

// Confirming review of PR 13: text from the artifact is printed without line breaks or
// control characters, so it cannot emit a workflow command.
test('job post prints artifact text without line breaks or control characters', () => {
  const io = fakeIO();
  const out = [];
  const log = (m) => out.push(m);
  const evil = '\n::error file=x::pwned\r\u0007';
  assert.throws(() => postRow(rowFile({ ...goodRow(), [`k${evil}`]: 1 }), { pr: 5, slug: 'o/r', runId: '7', io: io.io, log }), (e) => !/[\n\r\u0007]/.test(e.message) && /is not a gate row field/.test(e.message));
  postRow(rowFile(null, JSON.stringify({ error: `stopped${evil}` })), { pr: 5, slug: 'o/r', io: io.io, log });
  assert.ok(out.length && out.every((l) => !/[\n\r\u0007]/.test(l)), JSON.stringify(out));
  assert.throws(() => postRow(rowFile(null, `{"x":${evil}`), { pr: 5, slug: 'o/r', io: io.io, log }), (e) => /is not JSON/.test(e.message) && !/[\n\r\u0007]/.test(e.message));
  assert.equal(io.state.comments.length, 0);
});
