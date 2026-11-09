import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gate as gateRun, gateComment, revertExemption } from '../lib/gate.mjs';
import { merge } from '../lib/merge.mjs';
import { BOT, GATE, REVERT_EXEMPT, block, gateRuns, parseBlock } from '../lib/github.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { git, loadConfig } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';
// The gate never posts; job post writes its row as a comment after the run, as here.
const gate = (root, o) => { const r = gateRun(root, o); if (o.pr && o.post !== false) o.io.addComment(o.slug, o.pr, gateComment(r.run)); return r; };

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

function fakeIO() {
  const state = { comments: [], genuine: new Set() };
  const key = (r) => `${r.at}|${r.sha}|${r.trigger}`;
  return {
    state,
    io: {
      comments: () => state.comments,
      getPR: () => ({ user: { login: 'acmewidget' } }),
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
const run = (s, io, over = {}) => gate(s.root, { base: s.base, head: s.head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: io.io, log: quiet, ...over });

test('a real change with a real test passes', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const io = fakeIO();
  const r = run(s, io);
  assert.deepEqual(r.findings, []);
  assert.deepEqual([r.run.trigger, r.run.suite, r.run.revert, r.run.attempt], ['code', 'pass', 'pass', null]);
  assert.equal(git(['diff', '--stat'], { cwd: s.root }), '', 'the revert check restores the tree');
  assert.equal(gateRuns(io.state.comments).length, 1);
});

// AUD-1, JOB-12: an inert test fails the gate; only a reviewed exemption on the pull request
// exempts a refactor.
const exemptBlock = (sha, reviewer = 'session_reviewer', module = 'alpha') => ({ id: 99, body: block(REVERT_EXEMPT, { kind: 'revert-exempt', module, pr: 5, sha, reviewer, why: 'a refactor; behaviour unchanged' }), user: { login: 'acmewidget' } });
test('a test that passes with the change reverted is inert: a finding (AUD-1)', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/y.test.mjs': inertTest });
  const r = run(s, fakeIO());
  assert.deepEqual([r.run.revert, r.run.inert, r.run.ok], ['fail', ['test/alpha/y.test.mjs'], false]);
  assert.deepEqual(r.findings.map((f) => [f.check, f.file]), [['revert', 'test/alpha/y.test.mjs']]);
  assert.match(r.findings[0].message, /a refactor takes a reviewed exemption: p3 revert exempt/);
});

const COMPLETE = { 'process/metrics/alpha.jsonl': '{"row":"attempt","event":"complete","attempt":1,"session":"session_job"}\n' };
test('a reviewed exemption on the pull request exempts the revert check; the job\'s own, or one for other code, does not', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/y.test.mjs': inertTest, ...COMPLETE });
  const io = fakeIO();
  io.state.comments.push(exemptBlock(s.head));
  const r = run(s, io);
  assert.deepEqual([r.run.revert, r.run.revert_exempt, r.findings], ['exempt', { by: 'session_reviewer', sha: s.head }, []]);
  // Its reviewer is the job's own session (the newest complete row's): no exemption.
  const own = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/y.test.mjs': inertTest, ...COMPLETE });
  const io2 = fakeIO();
  io2.state.comments.push(exemptBlock(own.head, 'cse_job'));
  const said = [];
  const r2 = run(own, io2, { log: (m) => said.push(String(m)) });
  assert.equal(r2.run.revert, 'fail');
  assert.ok(said.some((m) => /a job never exempts itself/.test(m)), said.join('\n'));
  // Reviewed on an earlier commit, the code changed since: the check runs.
  const head2 = commit(s.root, { 'src/alpha/index.mjs': 'export const x = 3;\n' });
  const r3 = gate(s.root, { base: s.base, head: head2, branch: 'job/alpha', pr: 5, slug: 'o/r', io: fakeIO().io, log: quiet });
  assert.equal(r3.run.revert, 'fail');
  const io4 = fakeIO();
  io4.state.comments.push(exemptBlock(s.head));
  assert.equal(gate(s.root, { base: s.base, head: head2, branch: 'job/alpha', pr: 5, slug: 'o/r', io: io4.io, log: quiet }).run.revert, 'fail');
  // Records only since the reviewed commit: it stands.
  const head3 = commit(s.root, { 'process/metrics/alpha.jsonl': `${COMPLETE['process/metrics/alpha.jsonl']}{}\n` });
  const io5 = fakeIO();
  io5.state.comments.push(exemptBlock(head2));
  assert.equal(gate(s.root, { base: s.base, head: head3, branch: 'job/alpha', pr: 5, slug: 'o/r', io: io5.io, log: quiet }).run.revert, 'exempt');
});

test('a change with no test is no finding: the row says so', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n' });
  const r = run(s, fakeIO());
  assert.deepEqual([r.run.revert, r.findings], ['no test changed', []]);
});

// Cold review of build/audit-restores: the exemption binds the job's own code, so the tranche merged
// in (job sync, merge) keeps it; it fails closed with no job session; an edited block is never read,
// and a junk block does not hide a good one.
test('a reviewed exemption survives the tranche merged in, fails closed without the job\'s session, and skips edited or junk blocks', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/y.test.mjs': inertTest, ...COMPLETE });
  const cfg = loadConfig(s.root);
  const e = JSON.parse(readFileSync(join(s.root, 'process/ledger/alpha.json'), 'utf8'));
  const ctx = (head, jobSession = 'session_job') => ({ root: s.root, cfg, head, entry: e, job: 'alpha', jobSession });
  const merged = commit(s.root, { 'src/beta/b.mjs': 'export const b = 1;\n' }, 'Bring the tranche in');
  assert.equal(revertExemption([exemptBlock(s.head)], ctx(merged)).ok, true, 'another module\'s files do not void it');
  const testEdit = commit(s.root, { 'test/alpha/y.test.mjs': inertTest + '// edited after review\n' });
  assert.match(revertExemption([exemptBlock(s.head)], ctx(testEdit)).why, /in 1 file\(s\): test\/alpha\/y\.test\.mjs/, 'a test edited after review voids it');
  git(['reset', '-q', '--hard', merged], { cwd: s.root });
  const changed = commit(s.root, { 'src/alpha/index.mjs': 'export const x = 4;\n' });
  assert.match(revertExemption([exemptBlock(s.head)], ctx(changed)).why, /the job's code differs from .* in 1 file\(s\): src\/alpha\/index\.mjs/);
  assert.match(revertExemption([exemptBlock(s.head)], ctx(merged, null)).why, /records no session, so its reviewer cannot be told from the job/);
  const edited = { ...exemptBlock(s.head), created_at: '2026-11-06T00:00:00Z', updated_at: '2026-11-06T00:05:00Z' };
  assert.equal(revertExemption([edited], ctx(merged)), null);
  const junk = { id: 100, body: block(REVERT_EXEMPT, { module: 'alpha', sha: s.head, reviewer: '', why: '' }), user: { login: 'x' } };
  assert.equal(revertExemption([exemptBlock(s.head), junk], ctx(merged)).ok, true);
  assert.equal(revertExemption([junk], ctx(merged)).ok, false);
});

test('a ready job runs the suite; a draft runs only the fast checks', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  assert.deepEqual(run(s, fakeIO()).findings, []);
  const d = run(s, fakeIO(), { draft: true });
  assert.deepEqual([d.run.trigger, d.run.suite, d.findings.length], ['draft', 'skipped', 0]);
});

test('files outside the module are not the job\'s to change', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest, 'src/beta/b.mjs': 'x' });
  assert.ok(run(s, fakeIO()).findings.some((f) => f.check === 'ownership' && f.file === 'src/beta/b.mjs'));
});

test('record-only changes end in seconds: a records PR, and records since the last green run', () => {
  const s = setup({ 'process/metrics/alpha.jsonl': '{}\n' });
  const r = run(s, fakeIO());
  assert.deepEqual([r.run.trigger, r.run.suite, r.findings.length], ['record', 'skipped', 0]);

  const c = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const io = fakeIO();
  assert.equal(run(c, io).run.trigger, 'code');
  const head2 = commit(c.root, { 'process/metrics/alpha.jsonl': '{"row":"merge"}\n' });
  const r2 = gate(c.root, { base: c.base, head: head2, branch: 'job/alpha', pr: 5, slug: 'o/r', io: io.io, log: quiet });
  assert.deepEqual([r2.run.trigger, r2.run.after, r2.findings.length], ['record-since-green', c.head, 0]);
  assert.equal(gateRuns(io.state.comments).length, 2);
});

// Copy PR 247, 4 Nov: attempt 3 changed only process/ledger and process/metrics. A records-only
// job pull request takes the record fast path and merges on its green row.
test('a records-only job pull request takes the record path and merges', () => {
  const s = setup({ 'process/metrics/alpha.jsonl': '{"row":"attempt","event":"complete","attempt":3}\n' });
  const io = fakeIO();
  const r = run(s, io);
  assert.deepEqual([r.run.trigger, r.run.suite, r.run.attempt, r.run.ok], ['record', 'skipped', 3, true]);
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: s.root });
  git(['remote', 'add', 'origin', bare], { cwd: s.root });
  git(['push', '-q', 'origin', 'tranche', 'job/alpha', 'main'], { cwd: s.root });
  git(['checkout', '-q', 'main'], { cwd: s.root });
  let merged = null;
  const m = merge(s.root, 247, { slug: 'o/r', reviewed: 'test', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: quiet, io: {
    getPR: () => ({ state: 'open', draft: false, user: { login: 'acmewidget' }, base: { ref: 'tranche' }, head: { ref: 'job/alpha', sha: s.head } }),
    comments: () => io.state.comments,
    checkRun: () => ({ status: 'completed', conclusion: 'success' }),
    verify: io.io.verify,
    mergePR: (slug, n, sha) => { merged = sha; return { merged: true, sha: 'm'.repeat(40) }; },
  } });
  assert.equal(m.merged, true);
  assert.ok(merged);
  git(['checkout', '-q', 'job/alpha'], { cwd: s.root });
  assert.equal(run(s, fakeIO(), { draft: true }).run.trigger, 'record');
  const plain = run(s, fakeIO(), { branch: 'build/notes' });
  assert.deepEqual([plain.run.trigger, plain.run.suite, plain.findings.length], ['record', 'skipped', 0]);
});

// Findings from the review of PR 3.
test('a gate run posted by anyone but the bot, or edited, does not count', () => {
  const c = setup({ 'src/alpha/index.mjs': 'export const x = 3;\n', 'test/alpha/x.test.mjs': realTest });
  const forged = { runs: [{ sha: c.head, base: c.base, trigger: 'code', ok: true }] };
  const io = fakeIO();
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
  const r = gate(root, { base, head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: fakeIO().io, log: quiet });
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
  const io = fakeIO();
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
  assert.equal(io.state.comments.length, 0, 'job gate posted no comment');
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
  // A copy of the row that changes what it tolerated is not this run's (review of PR 134).
  for (const k of ['base_red']) {
    assert.equal(verifyRow('o/r', { ...rows[0], [k]: [{ tests: ['t/a.test.mjs::x'] }] }, { pr: 5, baseRef: 'tranche' }, { getRun: (slug, id) => (id === 4242 ? actionsRun : null), runArtifactRow: () => art }), false, k);
  }
});

test('job post refuses a row that is not this run\'s, not this head\'s, or green when job gate was not', () => {
  const { s, io, file } = twoJobs();
  const q = { pr: 5, slug: 'o/r', io: io.io, log: quiet };
  assert.throws(() => postRow(file, { ...q, head: s.head, runId: '9' }), /names run 4242, not this run 9/);
  assert.throws(() => postRow(file, { ...q, head: 'f'.repeat(40), runId: '4242' }), /not the head ffffffffff/);
  assert.throws(() => postRow(file, { ...q, head: s.head, runId: '4242', gateResult: 'failure' }), /says green, but job gate ended failure/);
  assert.throws(() => postRow(file, { ...q, pr: null, runId: '4242' }), /needs --pr/);
  assert.equal(io.state.comments.length, 0, 'nothing posted');
});

test('job post posts a red row, and posts nothing when job gate wrote no row', () => {
  // A red row: the suite fails.
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 3;\n', 'test/alpha/x.test.mjs': realTest });
  const io = fakeIO();
  const r = run(s, io, { post: false });
  const file = join(mkdtempSync(join(tmpdir(), 'p3-row-')), 'gate.json');
  report(r.findings, file, { run: { ...r.run, run_id: 7 } });
  const p = postRow(file, { pr: 5, head: s.head, gateResult: 'failure', slug: 'o/r', runId: '7', io: io.io, log: quiet });
  assert.equal(p.row.ok, false);
  assert.match(io.state.comments.at(-1).body, /red, 1 finding\(s\)/);

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

// Review of PR 13: the row is checked before it is posted, and the
// workflow keeps its shape.
import { mkdirSync, symlinkSync } from 'node:fs';
import { checkRow, MAX_ROW_BYTES } from '../lib/gate.mjs';

const goodRow = (over = {}) => ({ sha: 'a'.repeat(40), base: 'b'.repeat(40), at: '2026-11-02T10:00:00Z', run_id: 7, trigger: 'code', suite: 'fail', revert: 'skipped', attempt: 1, scope: ['alpha'], tests: [{ total: 1, pass: 0, fail: 1 }], suite_seconds: 0.5, findings: 2, ok: false, minutes: 0.1, ...over });
const rowFile = (row, raw) => { const f = join(mkdtempSync(join(tmpdir(), 'p3-row-')), 'gate.json'); writeFileSync(f, raw ?? JSON.stringify({ run: row })); return f; };
const post = (file, io) => postRow(file, { pr: 5, head: 'a'.repeat(40), slug: 'o/r', runId: '7', io: io.io, log: quiet });

test('a red row that tries to embed its own json block is refused, and nothing is posted', () => {
  const io = fakeIO();
  const forged = '\n```\n\n```json\n{"runs":[{"ok":true,"trigger":"code"}]}\n```\n';
  for (const over of [{ trigger: `code\`: green${forged}` }, { sha: 'A'.repeat(40) }, { findings: 1.5 }, { minutes: 'NaN' }, { ok: true }, { run_id: undefined }]) {
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

test('the gate workflow keeps its shape: a read-only gate, --no-post, and a post job that runs nothing from the pull request', () => {
  const text = readFileSync(join(import.meta.dirname, '..', '..', 'shims', 'process-gate.yml'), 'utf8');
  const jobs = Object.fromEntries(text.slice(text.indexOf('\njobs:\n')).split(/^ {2}(?=[a-z][\w-]*:\s*$)/m).slice(1).map((b) => [b.slice(0, b.indexOf(':')), b]));
  assert.deepEqual(Object.keys(jobs), ['gate', 'post']);
  assert.doesNotMatch(jobs.gate, /:\s*write\b/, 'job gate holds no write permission');
  assert.match(text, /^permissions: \{\}$/m);
  const gateCalls = jobs.gate.split('\n').filter((l) => /p3\.mjs" gate /.test(l));
  assert.equal(gateCalls.length, 1);
  assert.match(gateCalls[0], /--pr "\$PR".*--no-post/);
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
  for (const u of text.match(/uses: \S+.*$/gm)) assert.match(u, /^uses: actions\/[\w-]+(\/[\w-]+)?@[0-9a-f]{40} # v\d+\.\d+\.\d+$/, u);
  // Products' older shims grep the pinned tool for this line (review B of PR 32).
  assert.match(readFileSync(join(import.meta.dirname, '..', 'p3.mjs'), 'utf8'), /^\/\/ p3-capability: gate-no-post/m);
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
  const r = gate(root, { base, head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: fakeIO().io, exec, log: quiet });
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
  assert.throws(() => postRow(rowFile({ ...goodRow(), trigger: `code${evil}` }), { pr: 5, slug: 'o/r', runId: '7', io: io.io, log }), (e) => !/[\n\r\u0007]/.test(e.message) && /trigger is not a valid value/.test(e.message));
  postRow(rowFile(null, JSON.stringify({ error: `stopped${evil}` })), { pr: 5, slug: 'o/r', io: io.io, log });
  assert.ok(out.length && out.every((l) => !/[\n\r\u0007]/.test(l)), JSON.stringify(out));
  assert.throws(() => postRow(rowFile(null, `{"x":${evil}`), { pr: 5, slug: 'o/r', io: io.io, log }), (e) => /is not JSON/.test(e.message) && !/[\n\r\u0007]/.test(e.message));
  assert.equal(io.state.comments.length, 0);
});

test('a job that changes only its requirements file\'s marks has no ownership finding', () => {
  const s = setup({ 'req/alpha.md': '- **R1** met\n' });
  const r = run(s, fakeIO(), { draft: true });
  assert.ok(!r.findings.some((f) => f.check === 'ownership'), JSON.stringify(r.findings));
});

test('a job that adds a test for a mark its module already meets and strikes it changes no code', () => {
  const metTest = "import test from 'node:test'; import a from 'node:assert'; import { x } from '../../src/alpha/index.mjs';\ntest('x is 1', () => a.equal(x, 1));\n";
  const s = setup({ 'test/alpha/x.test.mjs': metTest, 'req/alpha.md': '- **R1** met\n' });
  const r = run(s, fakeIO());
  assert.equal(r.run.revert, 'no code changed');
  assert.deepEqual(r.findings, []);
});

// The gate race (copy PRs 55, 61, 62, 63, 4 Nov): job complete pushes, then marks ready. The
// push's synchronize run carries draft: true in its payload, the ready_for_review run draft:
// false; both are created in the same second and the concurrency group keeps one of them,
// either one. The gate reads the pull request's draft state live, so whichever run is kept
// gives the one full run on the head: the suite.
test('the gate race: whichever of the push\'s run and the ready run is kept judges the pull request as it is now', () => {
  const s = setup({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const live = (draft) => { const io = fakeIO(); io.io.getPR = () => ({ draft, user: { login: 'acmewidget' } }); return io; };
  for (const eventDraft of [true, false]) {
    const io = live(false);
    const out = [];
    const r = run(s, io, { draft: eventDraft, log: (m) => out.push(String(m)) });
    assert.deepEqual([r.run.trigger, r.run.suite, r.run.attempt, r.run.ok], ['code', 'pass', null, true], `event draft ${eventDraft}`);
    assert.equal(out.some((l) => /the event said draft/.test(l)), eventDraft);
    assert.equal(r.run.event_draft, eventDraft ? true : undefined);
    assert.equal(gateRuns(io.state.comments).length, 1, 'one row per kept run');
  }
  // Converted back to draft after the event: the live state wins the other way too.
  const d = run(s, live(true), { draft: false });
  assert.deepEqual([d.run.trigger, d.run.suite, d.run.attempt], ['draft', 'skipped', null]);
  // A failed read stops the run: it never falls back to the event's stale state.
  const broken = fakeIO();
  broken.io.getPR = () => { throw new Error('HTTP 502'); };
  assert.throws(() => run(s, broken, { draft: true }), /HTTP 502/);
  assert.equal(broken.state.comments.length, 0, 'no row posted');
});

// Copy, 4 Nov: PR 80 untracked rows.mjs (built, not committed); the gate regenerated it only after
// the suite, so every suite importing it failed with ENOENT (41 of 113, bundler run 41767864311).
test('the gate builds untracked generated files before the suite that imports them', () => {
  const gen = "import { mkdirSync, writeFileSync } from 'node:fs';\nmkdirSync('gen', { recursive: true });\nwriteFileSync('gen/rows.mjs', 'export const rows = 3;\\n');\n";
  const uses = "import test from 'node:test'; import a from 'node:assert'; import { rows } from '../../gen/rows.mjs'; import { x } from '../../src/alpha/index.mjs';\ntest('rows and x', () => { a.equal(rows, 3); a.equal(x, 2); });\n";
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' } }),
    'process/config.json': JSON.stringify({ generated: [{ paths: ['gen/rows.mjs'], regenerate: ['node', 'gen.mjs'], verify: ['node', '-e', 'process.exit(0)'] }] }),
    'gen.mjs': gen,
    '.gitignore': 'gen/rows.mjs\n',
    'src/alpha/index.mjs': 'export const x = 1;\n',
    'test/alpha/old.test.mjs': inertTest,
  });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const head = commit(root, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/rows.test.mjs': uses });
  assert.equal(existsSync(join(root, 'gen/rows.mjs')), false, 'not committed, not built yet');
  const io = fakeIO();
  const r = gate(root, { base, head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: io.io, log: quiet });
  assert.equal(r.run.suite, 'pass', JSON.stringify(r.findings));
  assert.deepEqual(r.run.built, ['gen/rows.mjs']);
  assert.equal(git(['status', '--porcelain'], { cwd: root }), '', 'the built file is ignored, nothing to commit');
});

// Review of PR 80: a failed build is red once (not twice), the later GAT-4 step does not rebuild a
// row this run built, and a job may not remove a committed generated file.
function genProduct(genScript, extra = {}) {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' } }),
    'process/config.json': JSON.stringify({ generated: [{ paths: ['gen/rows.mjs'], regenerate: ['node', 'gen.mjs'], verify: ['node', '-e', 'process.exit(0)'] }] }),
    'gen.mjs': genScript,
    '.gitignore': 'gen/rows.mjs\n',
    'src/alpha/index.mjs': 'export const x = 1;\n',
    'test/alpha/old.test.mjs': inertTest,
    ...extra,
  });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  return { root, base };
}
const ioFor = () => fakeIO();

test('a failed generated build is one finding, and no row is regenerated twice in a run', () => {
  const counting = "import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';\nappendFileSync('runs.log', 'x');\nmkdirSync('gen', { recursive: true });\nwriteFileSync('gen/rows.mjs', 'export const rows = 3;\\n');\n";
  const ok = genProduct(counting, { '.gitignore': 'gen/rows.mjs\nruns.log\n' });
  const h1 = commit(ok.root, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const r1 = gate(ok.root, { base: ok.base, head: h1, branch: 'job/alpha', pr: 5, slug: 'o/r', io: ioFor().io, log: quiet });
  assert.equal(r1.run.suite, 'pass');
  assert.equal(readFileSync(join(ok.root, 'runs.log'), 'utf8'), 'x', 'built once, not again by GAT-4');

  const bad = genProduct("process.exit(1);\n");
  const h2 = commit(bad.root, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const r2 = gate(bad.root, { base: bad.base, head: h2, branch: 'job/alpha', pr: 5, slug: 'o/r', io: ioFor().io, log: quiet });
  const gens = r2.findings.filter((f) => f.check === 'generated');
  assert.equal(gens.length, 1, JSON.stringify(gens));
  assert.match(gens[0].message, /failed \(exit 1\) building gen\/rows\.mjs/);
});

test('a job may not remove a committed generated file', () => {
  const s = genProduct("process.exit(0);\n", { '.gitignore': '', 'gen/rows.mjs': 'export const rows = 3;\n' });
  git(['rm', '-q', 'gen/rows.mjs'], { cwd: s.root });
  const head = commit(s.root, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const r = gate(s.root, { base: s.base, head, branch: 'job/alpha', pr: 5, slug: 'o/r', io: ioFor().io, log: quiet });
  assert.ok(r.findings.some((f) => f.check === 'generated' && /a job does not remove it/.test(f.message)), JSON.stringify(r.findings));
});

// C32 (copy, 8 Nov): a merged land's job branch reused by a later PR (the reopen PR 850, a draft
// from job/queue-producers-2, after PR 805 landed from it): GitHub lists the later PR on the
// merged PR's runs. A run listing only PRs from the merged PR's own branch into the same base is
// bound as a merged PR's run is; any other listing is refused.
test('C32: verifyRow binds a merged PR\'s run that GitHub lists under a later PR from the same branch', () => {
  const sha = 'a'.repeat(40);
  const row = { run_id: 7, sha, base: 'b'.repeat(40), trigger: 'code', ok: true, suite: 'pass', scope: ['q'] };
  const run = (prs, over = {}) => ({ path: GATE_WORKFLOW, head_sha: sha, status: 'completed', conclusion: 'success', event: 'pull_request', head_branch: 'job/q-2', head_repository: { full_name: 'o/r' }, pull_requests: prs, ...over });
  const io = (r) => ({ getRun: () => r, runArtifactRow: () => ({ ...row }) });
  const merged = { pr: 805, baseRef: 'layer/11', merged: { branch: 'job/q-2' } };
  const later = { number: 850, head: { ref: 'job/q-2' }, base: { ref: 'layer/11' } };
  assert.equal(verifyRow('o/r', row, merged, io(run([later]))), true, 'the reopen from the same branch is listed: bound');
  assert.equal(verifyRow('o/r', row, merged, io(run([]))), true, 'none listed: bound as before');
  assert.equal(verifyRow('o/r', row, merged, io(run([{ ...later, head: { ref: 'job/other' } }]))), false, 'a PR from another branch is listed');
  assert.equal(verifyRow('o/r', row, merged, io(run([{ ...later, base: { ref: 'tranche' } }]))), false, 'into another base');
  assert.equal(verifyRow('o/r', row, merged, io(run([later], { conclusion: 'failure' }))), false, 'the run did not pass');
  assert.equal(verifyRow('o/r', row, { pr: 805, baseRef: 'layer/11' }, io(run([later]))), false, 'not read as a merged PR: the listing must name it');
});
