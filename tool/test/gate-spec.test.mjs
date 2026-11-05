// The gate's spec mode and spec-tested fast path (train-spec C', notes/train-spec-plan.md, "Ruling
// and interfaces"): a spec run judges exactly as the job's own gate; a land takes the fast path
// only on a verified green spec run of the same tree, records aside; the tranche cover follows it.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { gate, gateComment, jobMerge, specRefs } from '../lib/gate.mjs';
import { BOT, RECEIPT, block } from '../lib/github.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const SLUG = 'o/r';
const JOB = 5; // the job PR
const SPEC = 9; // the spec PR: train/head/5-1 into train/spec/5-1
const inertTest = "import test from 'node:test'; test('nothing', () => {});\n";
// A test of the change that leaves a mark each time it loads, so a test can tell a suite ran.
const markedTest = (mark, want = 2) => `import test from 'node:test'; import a from 'node:assert'; import { appendFileSync } from 'node:fs'; import { x } from '../../src/alpha/index.mjs';\nappendFileSync(${JSON.stringify(mark)}, 'ran\\n');\ntest('x is ${want}', () => a.equal(x, ${want}));\n`;
const rev = (root, r) => git(['rev-parse', r], { cwd: root });
const treeOf = (root, r) => rev(root, `${r}^{tree}`);
const mergeRow = (at) => JSON.stringify({ row: 'merge', pr: JOB, at }) + '\n';
const receipt = (sha, extra = {}) => ({ kind: 'receipt', module: 'alpha', attempt: 1, sha, commands: [{ cmd: 'node --test', exit: 0, suite: true }], exempt: {}, ...extra });

// The tranche at t0 with module alpha; job/alpha's change; the window's PR ahead (R(-1), the spec
// base); and R(0), the job merged onto it with its predicted merge row (the spec head).
function world({ jobFiles } = {}) {
  const mark = join(mkdtempSync(join(tmpdir(), 'p3-mark-')), 'ran');
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' } }),
    'src/alpha/index.mjs': 'export const x = 1;\n',
    'test/alpha/old.test.mjs': inertTest,
  });
  const t0 = rev(root, 'HEAD');
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const job = commit(root, jobFiles ? jobFiles(mark) : { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': markedTest(mark) }, 'job change');
  git(['checkout', '-q', '-b', 'train/spec/5-1', t0], { cwd: root });
  const specBase = commit(root, { 'notes/ahead.md': 'ahead in the window\n' }, 'ahead');
  git(['checkout', '-q', '-b', 'train/head/5-1'], { cwd: root });
  git(['merge', '-q', '--no-ff', '--no-edit', job], { cwd: root });
  const specHead = commit(root, { 'process/metrics/alpha.jsonl': mergeRow('2026-11-05T10:00:00Z') }, 'predicted merge row');
  return { root, mark, t0, job, specBase, specHead };
}

const jobPR = (w, over = {}) => ({ number: JOB, state: 'open', draft: false, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: 'job/alpha', sha: w.job, repo: { full_name: SLUG } }, ...over });
const specPR = (w, over = {}) => ({ number: SPEC, state: 'open', draft: true, user: { login: 'trainbot' }, base: { ref: 'train/spec/5-1' }, head: { ref: 'train/head/5-1', sha: w.specHead, repo: { full_name: SLUG } }, ...over });

// GitHub as the gate and the cover read it. A row verifies (verifyRow's stand-in) only when it was
// posted as that PR's run (genuine "<pr>|<run_id>") and the context names that PR's base.
function makeIO(w, { receipts = [receipt(w.job)] } = {}) {
  const state = {
    prs: { [JOB]: jobPR(w), [SPEC]: specPR(w) },
    comments: { [JOB]: receipts.map((r, i) => ({ id: i + 1, body: block(RECEIPT, r), user: { login: 'civicsmith' } })), [SPEC]: [] },
    genuine: new Set(),
    verified: [],
    from: { 'job/alpha': [{ number: JOB, base: { ref: 'tranche' } }], 'train/head/5-1': [{ number: SPEC, base: { ref: 'train/spec/5-1' } }] },
    verifyOk: null,
  };
  const io = {
    getPR: (s, n) => state.prs[n] ?? null,
    comments: (s, n) => state.comments[n] || [],
    verify: (s, r, ctx) => {
      state.verified.push({ run_id: r.run_id, ctx });
      if (state.verifyOk) return state.verifyOk(r, ctx);
      return state.genuine.has(`${ctx.pr}|${r.run_id}`) && ctx.baseRef === state.prs[ctx.pr]?.base?.ref;
    },
    prsFromBranch: (s, b) => state.from[b] || [],
    baseEverChanged: () => false,
  };
  return { state, io };
}
const post = (state, n, row, { genuine = true } = {}) => {
  (state.comments[n] ||= []).push({ id: 100 + (state.comments[n]?.length || 0), body: gateComment(row), user: { login: BOT } });
  if (genuine) state.genuine.add(`${n}|${row.run_id}`);
};

// The spec PR's gate run: the checkout is the spec head (its base is the head's ancestor).
function specRun(w, x, over = {}) {
  git(['checkout', '-q', '--detach', w.specHead], { cwd: w.root });
  return gate(w.root, { base: w.specBase, head: w.specHead, branch: 'train/head/5-1', pr: SPEC, draft: true, slug: SLUG, io: x.io, log: quiet, ...over });
}
// A job PR's gate run on head, the checkout as given (GitHub's merge of head into base).
function jobRun(w, x, { base, head, checkout = head, ...over }) {
  git(['checkout', '-q', '--detach', checkout], { cwd: w.root });
  return gate(w.root, { base, head, branch: 'job/alpha', pr: JOB, slug: SLUG, io: x.io, log: quiet, ...over });
}
// L: the job merged onto `onto` with its merge row (written at land time), the trailer on its head.
function land(w, onto, { trailer = `Spec-Tested: ${SPEC}`, files = {} } = {}) {
  git(['checkout', '-q', '--detach', onto], { cwd: w.root });
  git(['merge', '-q', '--no-ff', '--no-edit', w.job], { cwd: w.root });
  return commit(w.root, { 'process/metrics/alpha.jsonl': mergeRow('2026-11-05T11:00:00Z'), ...files }, `merge row for PR ${JOB}${trailer ? `\n\n${trailer}` : ''}`);
}
const ran = (w) => existsSync(w.mark);
const forget = (w) => rmSync(w.mark, { force: true });

// A green spec run, posted to the spec PR as run 101; the mark cleared after it.
function greenSpec() {
  const w = world();
  const x = makeIO(w);
  const s = specRun(w, x);
  assert.deepEqual(s.findings, [], JSON.stringify(s.findings));
  s.run.run_id = 101;
  post(x.state, SPEC, s.run);
  forget(w);
  return { w, x, s };
}

test('specRefs: a matching spec/head pair gives { pr, seq }; anything else is null', () => {
  assert.deepEqual(specRefs('train/spec/5-1', 'train/head/5-1'), { pr: 5, seq: 1 });
  assert.deepEqual(specRefs('train/spec/123-40', 'train/head/123-40'), { pr: 123, seq: 40 });
  assert.deepEqual(specRefs('train/spec/7-0', 'train/head/7-0'), { pr: 7, seq: 0 });
  for (const [b, h] of [
    ['train/spec/5-1', 'train/head/6-1'], // another PR
    ['train/spec/5-1', 'train/head/5-2'], // another build
    ['train/head/5-1', 'train/spec/5-1'], // kinds swapped
    ['train/spec/5-1', 'train/spec/5-1'],
    ['train/head/5-1', 'train/head/5-1'],
    ['train/spec/05-1', 'train/head/05-1'], // leading zeros
    ['train/spec/5-01', 'train/head/5-01'],
    ['train/spec/5-00', 'train/head/5-00'],
    ['train/spec/0-1', 'train/head/0-1'], // PR 0
    ['train/spec/5-1', 'job/alpha'],
    ['tranche', 'train/head/5-1'],
    ['train/spec/5-1/x', 'train/head/5-1'],
    [undefined, 'train/head/5-1'],
    ['train/spec/5-1', null],
  ]) assert.equal(specRefs(b, h), null, `${b} / ${h}`);
});

test('spec mode judges the run as the job: green, code, its suite run on a draft, the receipt from the job PR by its opener, the tree recorded', () => {
  const w = world();
  const x = makeIO(w);
  // Receipts nobody may stand on: one on the spec PR by its own opener, one on the job PR by another.
  x.state.comments[SPEC].push({ id: 50, body: block(RECEIPT, receipt(w.job, { attempt: 3, commands: [{ cmd: 'node --test', exit: 1, suite: true }] })), user: { login: 'trainbot' } });
  x.state.comments[JOB].push({ id: 51, body: block(RECEIPT, receipt(w.job, { attempt: 7 })), user: { login: 'mallory' } });
  const said = [];
  const r = specRun(w, x, { log: (m) => said.push(m) });
  assert.deepEqual(r.findings, [], JSON.stringify(r.findings));
  assert.equal(r.run.ok, true);
  assert.equal(r.run.trigger, 'code', 'a draft spec PR does not skip the suite');
  assert.deepEqual(r.run.spec, { pr: JOB, seq: 1 });
  assert.equal(r.run.tree, treeOf(w.root, w.specHead));
  assert.equal(r.run.sha, w.specHead);
  assert.deepEqual([r.run.scope, r.run.suite, r.run.revert, r.run.receipt, r.run.receipt_attempt], [['alpha'], 'pass', 'pass', 'agrees', 1]);
  assert.ok(ran(w), 'the suite ran');
  assert.ok(said.some((m) => /spec run: judged as job PR 5 \(job\/alpha\)/.test(m)), said.join('\n'));
  // The job PR's own gate on its own head: the same verdict; its row has no spec, its tree its checkout's.
  const own = jobRun(w, makeIO(w), { base: w.t0, head: w.job });
  assert.deepEqual([own.run.trigger, own.run.suite, own.run.receipt, own.run.ok, own.run.spec], ['code', 'pass', 'agrees', true, undefined]);
  assert.equal(own.run.tree, treeOf(w.root, w.job));
  // The job PR as a draft: the spec run is a draft run too (the job's own gate would skip).
  const d = makeIO(w);
  d.state.prs[JOB] = jobPR(w, { draft: true });
  forget(w);
  const dr = specRun(w, d);
  assert.deepEqual([dr.run.trigger, dr.run.suite, dr.findings.length], ['draft', 'skipped', 0]);
  assert.equal(ran(w), false);
});

// Window position 0: the spec base is the tranche tip, and the spec head differs from the job's
// head (already brought up) only in the predicted merge row. A green code run of the job PR on its
// head, at that base, would give record-since-green; a spec run takes no prior run's fast path,
// even with a verify that lets every row through (verifyRow would refuse the job PR's run as the
// spec PR's; this holds without it).
test('spec mode takes no prior run\'s fast path: the job PR\'s green run on the same tree, records aside, is not stood on', () => {
  const mark = join(mkdtempSync(join(tmpdir(), 'p3-mark-')), 'ran');
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' } }),
    'src/alpha/index.mjs': 'export const x = 1;\n',
    'test/alpha/old.test.mjs': inertTest,
  });
  const t0 = rev(root, 'HEAD');
  git(['branch', 'tranche'], { cwd: root });
  git(['branch', 'train/spec/5-1'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const job = commit(root, { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': markedTest(mark) }, 'job change');
  git(['checkout', '-q', '-b', 'train/head/5-1'], { cwd: root });
  const specHead = commit(root, { 'process/metrics/alpha.jsonl': mergeRow('2026-11-05T10:00:00Z') }, 'predicted merge row');
  const w = { root, mark, t0, job, specBase: t0, specHead };
  const x = makeIO(w);
  const own = jobRun(w, x, { base: t0, head: job });
  assert.deepEqual([own.run.trigger, own.run.ok], ['code', true]);
  own.run.run_id = 77;
  post(x.state, JOB, own.run);
  x.state.verifyOk = () => true;
  // The job PR's own next run on specHead would stand on it: the fast path this is about.
  assert.equal(jobRun(w, x, { base: t0, head: specHead }).run.trigger, 'record-since-green');
  rmSync(mark, { force: true });
  const r = specRun(w, x);
  assert.deepEqual([r.run.trigger, r.run.suite, r.run.after, r.run.ok], ['code', 'pass', undefined, true]);
  assert.ok(ran(w), 'the suite ran');
});

// Ruling, condition 2: a job red in its own gate is red in spec mode, with the same finding.
test('a job red in its own gate is red in spec mode, the same finding: a failing suite, a file outside its module', () => {
  const key = (f) => `${f.check}|${f.file}|${f.message}`;
  const failing = world({ jobFiles: (mark) => ({ 'src/alpha/index.mjs': 'export const x = 3;\n', 'test/alpha/x.test.mjs': markedTest(mark) }) });
  const own = jobRun(failing, makeIO(failing), { base: failing.t0, head: failing.job });
  const spec = specRun(failing, makeIO(failing));
  assert.deepEqual(own.findings.map((f) => f.check).sort(), ['receipt', 'suite']);
  assert.deepEqual(spec.findings.map(key).sort(), own.findings.map(key).sort());
  assert.deepEqual([spec.run.ok, spec.run.suite, spec.run.receipt], [false, 'fail', 'disagrees']);

  const outside = world({ jobFiles: (mark) => ({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': markedTest(mark), 'src/beta/b.mjs': 'export const b = 1;\n' }) });
  const own2 = jobRun(outside, makeIO(outside), { base: outside.t0, head: outside.job });
  const spec2 = specRun(outside, makeIO(outside));
  assert.ok(own2.findings.some((f) => f.check === 'ownership' && f.file === 'src/beta/b.mjs'));
  assert.deepEqual(spec2.findings.map(key).sort(), own2.findings.map(key).sort());
  assert.equal(spec2.run.ok, false);
});

test('spec mode is red, with nothing run, when job PR n is not an open job PR into the tranche whose head is in the spec head', () => {
  const w = world();
  git(['checkout', '-q', '--detach', w.t0], { cwd: w.root });
  const elsewhere = commit(w.root, { 'src/alpha/index.mjs': 'export const x = 9;\n' }, 'not in the spec head');
  const cases = [
    [null, /job PR 5 could not be read/],
    [jobPR(w, { state: 'closed' }), /job PR 5 is closed/],
    [jobPR(w, { state: 'closed', merged: true }), /job PR 5 is merged/],
    [jobPR(w, { base: { ref: 'main' } }), /job PR 5 is into main, not the tranche tranche/],
    [jobPR(w, { head: { ref: 'job/alpha', sha: w.job, repo: { full_name: 'fork/r' } } }), /job PR 5 is not from a branch of o\/r/],
    [jobPR(w, { head: { ref: 'build/notes', sha: w.job, repo: { full_name: SLUG } } }), /job PR 5 is from build\/notes, not a job branch/],
    [jobPR(w, { head: { ref: 'job/alpha', sha: elsewhere, repo: { full_name: SLUG } } }), /job PR 5 has head [0-9a-f]{10}, which is not in the spec head/],
  ];
  for (const [pr, why] of cases) {
    const x = makeIO(w);
    x.state.prs[JOB] = pr;
    forget(w);
    const r = specRun(w, x);
    assert.equal(r.run.ok, false, String(why));
    assert.deepEqual(r.findings.map((f) => f.check), ['spec'], `${why}: ${JSON.stringify(r.findings)}`);
    assert.match(r.findings[0].message, why);
    assert.deepEqual([r.run.trigger, r.run.suite, r.run.spec], ['draft', 'skipped', { pr: JOB, seq: 1 }]);
    assert.equal(ran(w), false, `${why}: no suite`);
  }
});

test('spec-tested: the land on the tested tree, records aside, takes the spec run\'s suite and runs none', () => {
  const { w, x, s } = greenSpec();
  const L = land(w, w.specBase); // the PR ahead landed: the tranche is R(-1)
  const said = [];
  const r = jobRun(w, x, { base: w.specBase, head: L, log: (m) => said.push(m) });
  assert.deepEqual(r.findings, [], JSON.stringify(r.findings));
  assert.equal(r.run.trigger, 'spec-tested', said.join('\n'));
  assert.deepEqual([r.run.spec_pr, r.run.spec_run, r.run.spec_sha], [SPEC, 101, w.specHead]);
  assert.deepEqual([r.run.suite, r.run.revert, r.run.receipt, r.run.receipt_attempt, r.run.ok], ['pass', 'pass', 'agrees', 1, true]);
  assert.deepEqual(r.run.scope, s.run.scope);
  assert.equal(r.run.tree, treeOf(w.root, L));
  assert.equal(r.run.spec, undefined);
  assert.equal(ran(w), false, 'no suite ran');
  assert.equal(r.run.suite_seconds, undefined);
  // The spec row was verified as the spec PR's run into its spec base.
  assert.ok(x.state.verified.some((v) => v.run_id === 101 && v.ctx.pr === SPEC && v.ctx.baseRef === 'train/spec/5-1'));
});

// Each refusal falls back to the trigger the run would have had: a code run, its suite run here.
function refused(name, arrange) {
  test(`spec-tested refused, the suite runs: ${name}`, () => {
    const g = greenSpec();
    const { base, head, checkout, why } = arrange(g);
    const said = [];
    const r = jobRun(g.w, g.x, { base, head, checkout, log: (m) => said.push(m) });
    assert.equal(r.run.trigger, 'code', said.join('\n'));
    assert.equal(r.run.spec_pr, undefined);
    assert.ok(ran(g.w), 'the suite ran');
    assert.ok(said.some((m) => /^Spec-Tested is not taken: /.test(m) && why.test(m)), `${why}\n${said.join('\n')}`);
  });
}
refused('the trailer names a PR that is not a spec PR of this job', ({ w, x }) => {
  x.state.prs[10] = specPR(w, { number: 10, base: { ref: 'train/spec/6-1' }, head: { ref: 'train/head/6-1', sha: w.specHead, repo: { full_name: SLUG } } });
  return { base: w.specBase, head: land(w, w.specBase, { trailer: 'Spec-Tested: 10' }), why: /PR 10 is not a spec pull request of PR 5 in o\/r/ };
});
refused('the trailer names the job PR itself', ({ w }) => ({ base: w.specBase, head: land(w, w.specBase, { trailer: `Spec-Tested: ${JOB}` }), why: /PR 5 is not a spec pull request of PR 5/ }));
refused('the trailer names a spec PR from a fork', ({ w, x }) => {
  x.state.prs[SPEC] = specPR(w, { head: { ref: 'train/head/5-1', sha: w.specHead, repo: { full_name: 'fork/r' } } });
  return { base: w.specBase, head: land(w, w.specBase), why: /PR 9 is not a spec pull request of PR 5 in o\/r/ };
});
refused('the spec row does not verify', ({ w, x }) => {
  x.state.verifyOk = (r, ctx) => ctx.pr !== SPEC;
  return { base: w.specBase, head: land(w, w.specBase), why: /spec PR 9 has no verified green code run of alpha/ };
});
refused('the spec row\'s tree is not its own commit\'s tree', ({ w, x, s }) => {
  x.state.comments[SPEC] = [];
  post(x.state, SPEC, { ...s.run, run_id: 102, tree: treeOf(w.root, w.specBase) });
  return { base: w.specBase, head: land(w, w.specBase), why: /spec PR 9 has no verified green code run of alpha, on its own commit's tree/ };
});
refused('the head differs from the spec\'s tested commit outside the records (the tranche moved otherwise)', ({ w }) => {
  git(['checkout', '-q', '--detach', w.specBase], { cwd: w.root });
  const moved = commit(w.root, { 'notes/other.md': 'another PR landed\n' }, 'tranche moved');
  return { base: moved, head: land(w, moved), why: /the head differs from [0-9a-f]{10}, which spec PR 9's run 101 tested, in 1 file\(s\) outside the records: notes\/other\.md/ };
});
refused('the job\'s receipt attempt is not the one the spec run agreed', ({ w, x }) => {
  x.state.comments[JOB].push({ id: 60, body: block(RECEIPT, receipt(w.job, { attempt: 2 })), user: { login: 'civicsmith' } });
  return { base: w.specBase, head: land(w, w.specBase), why: /agreeing with receipt attempt 2/ };
});
refused('the job\'s ledger entry differs from the tested commit\'s', ({ w }) => ({
  base: w.specBase,
  head: land(w, w.specBase, { files: { 'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' }, suite: { cwd: '.', command: ['node', '--test', '--test-concurrency=1'] } }) } }),
  why: /alpha's ledger entry differs from [0-9a-f]{10}'s/,
}));
refused('the checkout is not the head\'s tree (the tranche is not its ancestor)', ({ w }) => {
  const L = land(w, w.specBase);
  git(['checkout', '-q', '--detach', w.specBase], { cwd: w.root });
  const moved = commit(w.root, { 'notes/other.md': 'another PR landed\n' }, 'tranche moved');
  git(['merge', '-q', '--no-ff', '--no-edit', L], { cwd: w.root }); // GitHub's merge checkout: parents [tranche, head]
  return { base: moved, head: L, checkout: rev(w.root, 'HEAD'), why: /this run's checkout is not [0-9a-f]{10}'s tree/ };
});

test('the tranche cover follows a spec-tested row to its spec run; refused when that run is missing or does not verify', () => {
  const { w, x } = greenSpec();
  const L = land(w, w.specBase);
  const r = jobRun(w, x, { base: w.specBase, head: L });
  assert.equal(r.run.trigger, 'spec-tested');
  r.run.run_id = 201;
  post(x.state, JOB, r.run);
  // GitHub's merge of the job PR into the tranche (at R(-1)): the merge commit's tree is L's.
  git(['checkout', '-q', '-B', 'tranche', w.specBase], { cwd: w.root });
  git(['merge', '-q', '--no-ff', '-m', `Merge job PR ${JOB}`, L], { cwd: w.root });
  const c = rev(w.root, 'HEAD');
  x.state.prs[JOB] = jobPR(w, { state: 'closed', merged: true, merge_commit_sha: c, head: { ref: 'job/alpha', sha: L, repo: { full_name: SLUG } } });
  const cfg = loadConfig(w.root, c);
  // The merged job PR's runs bind by branch; the spec PR's open runs by the PR.
  x.state.verifyOk = (row, ctx) => x.state.genuine.has(`${ctx.pr}|${row.run_id}`);
  assert.deepEqual(jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io }), { ok: true, pr: JOB, id: 'alpha', own: jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io }).own });
  assert.ok(x.state.verified.some((v) => v.run_id === 101 && v.ctx.pr === SPEC && v.ctx.baseRef === 'train/spec/5-1' && !v.ctx.merged));
  // The spec PR closed (its runs may list no PR): bound by its branch, every PR from it into the spec base.
  x.state.prs[SPEC] = specPR(w, { state: 'closed' });
  x.state.verified.length = 0;
  assert.equal(jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io }).ok, true);
  assert.ok(x.state.verified.some((v) => v.run_id === 101 && v.ctx.merged?.branch === 'train/head/5-1'));
  x.state.prs[SPEC] = specPR(w);

  const refusal = /is PR 5's merge, but no verified green run of the alpha suite stands behind its merged result/;
  // The spec run is not verified.
  x.state.verifyOk = (row, ctx) => ctx.pr !== SPEC && x.state.genuine.has(`${ctx.pr}|${row.run_id}`);
  const nv = jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io });
  assert.equal(nv.ok, false);
  assert.match(nv.why, refusal);
  // The spec run is not found: gone from the spec PR, or the row names another run.
  x.state.verifyOk = (row, ctx) => x.state.genuine.has(`${ctx.pr}|${row.run_id}`);
  const kept = x.state.comments[SPEC];
  x.state.comments[SPEC] = [];
  const nf = jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io });
  assert.equal(nf.ok, false);
  assert.match(nf.why, refusal);
  x.state.comments[SPEC] = kept;
  // The spec PR named is not a spec pair for this job.
  x.state.prs[SPEC] = specPR(w, { base: { ref: 'train/spec/6-1' }, head: { ref: 'train/head/6-1', sha: w.specHead, repo: { full_name: SLUG } } });
  assert.match(jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io }).why, refusal);
});
