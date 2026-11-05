// The gate's spec mode and spec-tested fast path (train-spec C', notes/train-spec-plan.md, "Ruling
// and interfaces"; tranche-based spec PRs, the coordinator's ruling of 17:20): a spec run judges
// exactly as the job's own gate; a land takes the fast path only on a verified green spec run of
// the same tree, records aside, on a base the land's descends from with the same judge; the
// tranche cover follows it.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { diffNames, gate, gateComment, isAnc, jobMerge, specRefs } from '../lib/gate.mjs';
import { BOT, RECEIPT, block } from '../lib/github.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const SLUG = 'o/r';
const JOB = 5; // the job PR
const SPEC = 9; // the spec PR: train/head/5-1 into the tranche
const inertTest = "import test from 'node:test'; test('nothing', () => {});\n";
// A test of the change that leaves a mark each time it loads, so a test can tell a suite ran.
const markedTest = (mark, want = 2) => `import test from 'node:test'; import a from 'node:assert'; import { appendFileSync } from 'node:fs'; import { x } from '../../src/alpha/index.mjs';\nappendFileSync(${JSON.stringify(mark)}, 'ran\\n');\ntest('x is ${want}', () => a.equal(x, ${want}));\n`;
const rev = (root, r) => git(['rev-parse', r], { cwd: root });
const treeOf = (root, r) => rev(root, `${r}^{tree}`);
const mergeRow = (at) => JSON.stringify({ row: 'merge', pr: JOB, at }) + '\n';
// The product at t0: module alpha, and the base config that opens the window (merge_train_window
// > 1); spec mode and the fast path run only there.
const product = (config = { merge_train_window: 2 }) => ({
  ...(config ? { 'process/config.json': config } : {}),
  'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' } }),
  'src/alpha/index.mjs': 'export const x = 1;\n',
  'test/alpha/old.test.mjs': inertTest,
});
const receipt = (sha, extra = {}) => ({ kind: 'receipt', module: 'alpha', attempt: 1, sha, commands: [{ cmd: 'node --test', exit: 0, suite: true }], exempt: {}, ...extra });

// The tranche at t0 with module alpha; job/alpha's change; the PR ahead of it in the window
// (`aheadFiles`, none at window position 0); the spec head train/head/5-1: t0 + the ahead change +
// the job merged + its predicted merge row (R(0)), its PR into the tranche itself (base t0); and
// t1, the tranche once the PR ahead landed (t0 + the same change, its own commit).
function world({ jobFiles, config, aheadFiles = { 'notes/ahead.md': 'ahead in the window\n' } } = {}) {
  const mark = join(mkdtempSync(join(tmpdir(), 'p3-mark-')), 'ran');
  const root = makeRepo(product(config));
  const t0 = rev(root, 'HEAD');
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const job = commit(root, jobFiles ? jobFiles(mark) : { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': markedTest(mark) }, 'job change');
  const { ahead, specHead } = chain(root, t0, job, aheadFiles);
  git(['checkout', '-q', '--detach', t0], { cwd: root });
  const t1 = aheadFiles ? commit(root, aheadFiles, 'Merge job PR 4 (the PR ahead landed)') : t0;
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, mark, t0, t1, ahead, job, specHead };
}
// The train's prediction on `from`: the ahead change, then the job merged with its merge row.
function chain(root, from, job, aheadFiles, name = 'train/head/5-1') {
  git(['checkout', '-q', '--detach', from], { cwd: root });
  const ahead = aheadFiles ? commit(root, aheadFiles, 'ahead in the window (predicted)') : from;
  git(['checkout', '-q', '-B', name], { cwd: root });
  git(['merge', '-q', '--no-ff', '--no-edit', job], { cwd: root });
  const specHead = commit(root, { 'process/metrics/alpha.jsonl': mergeRow('2026-11-05T10:00:00Z') }, 'predicted merge row');
  return { ahead, specHead };
}

const jobPR = (w, over = {}) => ({ number: JOB, state: 'open', draft: false, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: 'job/alpha', sha: w.job, repo: { full_name: SLUG } }, ...over });
const specPR = (w, over = {}) => ({ number: SPEC, state: 'open', draft: true, user: { login: 'trainbot' }, base: { ref: 'tranche' }, head: { ref: 'train/head/5-1', sha: w.specHead, repo: { full_name: SLUG } }, ...over });

// GitHub as the gate and the cover read it. A row verifies (verifyRow's stand-in) only when it was
// posted as that PR's run (genuine "<pr>|<run_id>") and the context names that PR's base.
function makeIO(w, { receipts = [receipt(w.job)] } = {}) {
  const state = {
    prs: { [JOB]: jobPR(w), [SPEC]: specPR(w) },
    comments: { [JOB]: receipts.map((r, i) => ({ id: i + 1, body: block(RECEIPT, r), user: { login: 'civicsmith' } })), [SPEC]: [] },
    genuine: new Set(),
    verified: [],
    from: { 'job/alpha': [{ number: JOB, base: { ref: 'tranche' } }], 'train/head/5-1': [{ number: SPEC, base: { ref: 'tranche' } }] },
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

// The spec PR's gate run, into the tranche at t0: the checkout is the spec head (t0 is its ancestor).
function specRun(w, x, { base = w.t0, head = w.specHead, ...over } = {}) {
  git(['checkout', '-q', '--detach', head], { cwd: w.root });
  return gate(w.root, { base, head, branch: 'train/head/5-1', pr: SPEC, draft: true, slug: SLUG, io: x.io, log: quiet, ...over });
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

// A green spec run (base t0), posted to the spec PR as run 101; the mark cleared after it; then the
// PR ahead lands, so the tranche is t1 and the land's base is t1.
function greenSpec(opts) {
  const w = world(opts);
  const x = makeIO(w);
  const s = specRun(w, x);
  assert.deepEqual(s.findings, [], JSON.stringify(s.findings));
  s.run.run_id = 101;
  post(x.state, SPEC, s.run);
  forget(w);
  git(['branch', '-f', 'tranche', w.t1], { cwd: w.root });
  return { w, x, s };
}

test('specRefs: a head train/head/<n>-<seq> into the tranche itself gives { pr, seq }; anything else is null', () => {
  assert.deepEqual(specRefs('tranche', 'train/head/5-1', 'tranche'), { pr: 5, seq: 1 });
  assert.deepEqual(specRefs('tranche-7', 'train/head/123-40', 'tranche-7'), { pr: 123, seq: 40 });
  assert.deepEqual(specRefs('tranche', 'train/head/7-0', 'tranche'), { pr: 7, seq: 0 });
  for (const [b, h, t] of [
    ['train/spec/5-1', 'train/head/5-1', 'tranche'], // the old shape: a spec base
    ['main', 'train/head/5-1', 'tranche'], // into another base
    ['tranche', 'train/head/5-1', 'tranche-7'],
    ['tranche', 'train/head/5-1', undefined], // no tranche named
    ['tranche', 'train/head/5-1', ''],
    [undefined, 'train/head/5-1', undefined],
    ['tranche', 'train/spec/5-1', 'tranche'], // not a head
    ['tranche', 'train/head/05-1', 'tranche'], // leading zeros
    ['tranche', 'train/head/5-01', 'tranche'],
    ['tranche', 'train/head/5-00', 'tranche'],
    ['tranche', 'train/head/0-1', 'tranche'], // PR 0
    ['tranche', 'train/head/5-1/x', 'tranche'],
    ['tranche', 'train/head/5', 'tranche'],
    ['tranche', 'job/alpha', 'tranche'],
    ['tranche', null, 'tranche'],
  ]) assert.equal(specRefs(b, h, t), null, `${b} / ${h} / ${t}`);
});

// The old shape (train/spec/x-y as the base) is no spec pair: a PR so built is judged as any
// non-job PR, its own base's judge; the trailer naming one asks for nothing (test below).
test('a train/head PR into train/spec/<n>-<seq> (the old shape) is not spec mode: judged as a non-job PR', () => {
  const w = world();
  const x = makeIO(w);
  x.state.prs[SPEC] = specPR(w, { base: { ref: 'train/spec/5-1' } });
  const d = specRun(w, x);
  assert.deepEqual([d.run.spec, d.run.trigger, d.run.suite, d.findings.length], [undefined, 'draft', 'skipped', 0]);
  assert.equal(ran(w), false);
  x.state.prs[SPEC] = specPR(w, { base: { ref: 'train/spec/5-1' }, draft: false });
  const r = specRun(w, x, { draft: false });
  assert.equal(r.run.spec, undefined);
  assert.deepEqual([r.run.trigger, r.run.scope, r.run.suite, r.run.revert, r.run.receipt], ['code', ['alpha'], 'pass', 'skipped', 'not checked']);
  assert.ok(!r.findings.some((f) => f.check === 'spec'));
  assert.ok(r.changed.includes('notes/ahead.md'), 'judged on its whole diff, not as the job');
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
  assert.deepEqual([r.run.sha, r.run.base], [w.specHead, w.t0]);
  assert.deepEqual([r.run.scope, r.run.suite, r.run.revert, r.run.receipt, r.run.receipt_attempt], [['alpha'], 'pass', 'pass', 'agrees', 1]);
  assert.ok(ran(w), 'the suite ran');
  assert.ok(said.some((m) => /spec run: judged as job PR 5 \(job\/alpha, [0-9a-f]{10}\)/.test(m)), said.join('\n'));
  // The job PR's own gate on its own head: the same verdict and the same change judged; its row
  // has no spec, its tree its checkout's.
  const own = jobRun(w, makeIO(w), { base: w.t0, head: w.job });
  assert.deepEqual([own.run.trigger, own.run.suite, own.run.receipt, own.run.ok, own.run.spec], ['code', 'pass', 'agrees', true, undefined]);
  assert.equal(own.run.tree, treeOf(w.root, w.job));
  assert.deepEqual(r.changed, own.changed);
  // The job PR as a draft: the spec run is a draft run too (the job's own gate would skip).
  const d = makeIO(w);
  d.state.prs[JOB] = jobPR(w, { draft: true });
  forget(w);
  const dr = specRun(w, d);
  assert.deepEqual([dr.run.trigger, dr.run.suite, dr.findings.length], ['draft', 'skipped', 0]);
  assert.equal(ran(w), false);
});

// The spec head holds the jobs ahead of this one too (their files are not this job's); spec mode
// judges ownership and the ledger on the job's own change, as its own gate does.
test('spec mode judges ownership on the job\'s own change: an ahead job\'s files are no finding, the job\'s own out-of-module file is', () => {
  const ahead = { 'process/ledger/beta.json': entry('beta', { status: { state: 'WORKING' } }), 'src/beta/b.mjs': 'export const b = 1;\n', 'test/beta/b.test.mjs': inertTest, 'process/metrics/beta.jsonl': '{"row":"merge","pr":4}\n' };
  const w = world({ aheadFiles: ahead });
  assert.ok(diffNames(w.root, w.t0, w.specHead).includes('src/beta/b.mjs'), 'the spec head holds the ahead job');
  const r = specRun(w, makeIO(w));
  assert.deepEqual(r.findings, [], JSON.stringify(r.findings));
  assert.deepEqual([r.run.trigger, r.run.scope, r.run.ok], ['code', ['alpha'], true]);
  assert.ok(!r.changed.some((f) => f.includes('beta')), r.changed.join(', '));

  const bad = world({ aheadFiles: ahead, jobFiles: (mark) => ({ 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': markedTest(mark), 'src/gamma/g.mjs': 'export const g = 1;\n' }) });
  const own = jobRun(bad, makeIO(bad), { base: bad.t0, head: bad.job });
  const spec = specRun(bad, makeIO(bad));
  const owned = (res) => res.findings.filter((f) => f.check === 'ownership').map((f) => f.file);
  assert.deepEqual(owned(spec), ['src/gamma/g.mjs']);
  assert.deepEqual(owned(spec), owned(own));
  assert.equal(spec.run.ok, false);
});

// Window position 0: the spec head is the job's head merged onto the tranche tip with its merge
// row: the same tree as the job's head, records aside. A green code run of the job PR on its head
// would give record-since-green; a spec run takes no prior run's fast path, even with a verify
// that lets every row through.
test('spec mode takes no prior run\'s fast path: the job PR\'s green run on the same tree, records aside, is not stood on', () => {
  const w = world({ aheadFiles: null });
  const x = makeIO(w);
  const own = jobRun(w, x, { base: w.t0, head: w.job });
  assert.deepEqual([own.run.trigger, own.run.ok], ['code', true]);
  own.run.run_id = 77;
  post(x.state, JOB, own.run);
  x.state.verifyOk = () => true;
  // The job PR's own next run on the spec head would stand on it: the fast path this is about.
  assert.equal(jobRun(w, x, { base: w.t0, head: w.specHead }).run.trigger, 'record-since-green');
  forget(w);
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

// The spec run's base t0 is an older tranche tip, behind the land's base t1, with the same judge.
test('spec-tested: the land on the tested tree, records aside, on a base the spec run\'s base is behind with the same judge, takes its suite and runs none', () => {
  const { w, x, s } = greenSpec();
  const L = land(w, w.t1);
  assert.notEqual(s.run.base, w.t1);
  assert.ok(isAnc(w.root, s.run.base, w.t1));
  const said = [];
  const r = jobRun(w, x, { base: w.t1, head: L, log: (m) => said.push(m) });
  assert.deepEqual(r.findings, [], JSON.stringify(r.findings));
  assert.equal(r.run.trigger, 'spec-tested', said.join('\n'));
  assert.deepEqual([r.run.spec_pr, r.run.spec_run, r.run.spec_sha], [SPEC, 101, w.specHead]);
  assert.deepEqual([r.run.suite, r.run.revert, r.run.receipt, r.run.receipt_attempt, r.run.ok], ['pass', 'pass', 'agrees', 1, true]);
  assert.deepEqual(r.run.scope, s.run.scope);
  assert.equal(r.run.tree, treeOf(w.root, L));
  assert.equal(r.run.spec, undefined);
  assert.equal(ran(w), false, 'no suite ran');
  assert.equal(r.run.suite_seconds, undefined);
  // The spec row was verified as the spec PR's run into the tranche.
  assert.ok(x.state.verified.some((v) => v.run_id === 101 && v.ctx.pr === SPEC && v.ctx.baseRef === 'tranche'));
});

// A base-red spec run stands only on its own base: at window position 0 the land's base is it.
test('spec-tested: a base-red spec run stands when its base is the land\'s base itself', () => {
  const { w, x, s } = greenSpec({ aheadFiles: null });
  x.state.comments[SPEC] = [];
  post(x.state, SPEC, { ...s.run, run_id: 108, suite: 'base-red', base_red: [{ module: 'alpha', tests: ['test/alpha/old.test.mjs::nothing'] }] });
  const said = [];
  const r = jobRun(w, x, { base: w.t0, head: land(w, w.t0), log: (m) => said.push(m) });
  assert.deepEqual([r.run.trigger, r.run.spec_run, r.run.suite, r.run.receipt, r.run.ok], ['spec-tested', 108, 'base-red', 'agrees', true], said.join('\n'));
  assert.equal(ran(w), false, 'no suite ran');
});

// Each refusal falls back to the trigger the run would have had: a code run, its suite run here.
function refused(name, arrange, opts) {
  test(`spec-tested refused, the suite runs: ${name}`, () => {
    const g = greenSpec(opts);
    const { base, head, checkout, why } = arrange(g);
    const said = [];
    const r = jobRun(g.w, g.x, { base, head, checkout, log: (m) => said.push(m) });
    assert.equal(r.run.trigger, 'code', said.join('\n'));
    assert.equal(r.run.spec_pr, undefined);
    assert.ok(ran(g.w), 'the suite ran');
    assert.ok(said.some((m) => /^Spec-Tested is not taken: /.test(m) && why.test(m)), `${why}\n${said.join('\n')}`);
  });
}
refused('the trailer names a spec PR of another job', ({ w, x }) => {
  x.state.prs[10] = specPR(w, { number: 10, head: { ref: 'train/head/6-1', sha: w.specHead, repo: { full_name: SLUG } } });
  return { base: w.t1, head: land(w, w.t1, { trailer: 'Spec-Tested: 10' }), why: /PR 10 is not a spec pull request of PR 5 in o\/r/ };
});
refused('the trailer names a PR of the old shape (into train/spec/5-1)', ({ w, x }) => {
  x.state.prs[11] = specPR(w, { number: 11, base: { ref: 'train/spec/5-1' } });
  x.state.comments[11] = x.state.comments[SPEC];
  return { base: w.t1, head: land(w, w.t1, { trailer: 'Spec-Tested: 11' }), why: /PR 11 is not a spec pull request of PR 5 in o\/r/ };
});
refused('the trailer names the job PR itself', ({ w }) => ({ base: w.t1, head: land(w, w.t1, { trailer: `Spec-Tested: ${JOB}` }), why: /PR 5 is not a spec pull request of PR 5/ }));
refused('the trailer names a spec PR from a fork', ({ w, x }) => {
  x.state.prs[SPEC] = specPR(w, { head: { ref: 'train/head/5-1', sha: w.specHead, repo: { full_name: 'fork/r' } } });
  return { base: w.t1, head: land(w, w.t1), why: /PR 9 is not a spec pull request of PR 5 in o\/r/ };
});
refused('the spec row does not verify', ({ w, x }) => {
  x.state.verifyOk = (r, ctx) => ctx.pr !== SPEC;
  return { base: w.t1, head: land(w, w.t1), why: /spec PR 9 has no verified green code run of alpha/ };
});
refused('the spec row\'s tree is not its own commit\'s tree', ({ w, x, s }) => {
  x.state.comments[SPEC] = [];
  post(x.state, SPEC, { ...s.run, run_id: 102, tree: treeOf(w.root, w.t0) });
  return { base: w.t1, head: land(w, w.t1), why: /spec PR 9 has no verified green code run of alpha, on its own commit's tree/ };
});
refused('the head differs from the spec\'s tested commit outside the records (the tranche moved otherwise)', ({ w }) => {
  git(['checkout', '-q', '--detach', w.t1], { cwd: w.root });
  const moved = commit(w.root, { 'notes/other.md': 'another PR landed\n' }, 'tranche moved');
  return { base: moved, head: land(w, moved), why: /the head differs from [0-9a-f]{10}, which spec PR 9's run 101 tested, in 1 file\(s\) outside the records: notes\/other\.md/ };
});
refused('the job\'s receipt attempt is not the one the spec run agreed', ({ w, x }) => {
  x.state.comments[JOB].push({ id: 60, body: block(RECEIPT, receipt(w.job, { attempt: 2 })), user: { login: 'civicsmith' } });
  return { base: w.t1, head: land(w, w.t1), why: /agreeing with receipt attempt 2/ };
});
refused('the job\'s ledger entry differs from the tested commit\'s', ({ w }) => ({
  base: w.t1,
  head: land(w, w.t1, { files: { 'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' }, suite: { cwd: '.', command: ['node', '--test', '--test-concurrency=1'] } }) } }),
  why: /alpha's ledger entry differs from [0-9a-f]{10}'s/,
}));
refused('the checkout is not the head\'s tree (the tranche is not its ancestor)', ({ w }) => {
  const L = land(w, w.t1);
  git(['checkout', '-q', '--detach', w.t1], { cwd: w.root });
  const moved = commit(w.root, { 'notes/other.md': 'another PR landed\n' }, 'tranche moved');
  git(['merge', '-q', '--no-ff', '--no-edit', L], { cwd: w.root }); // GitHub's merge checkout: parents [tranche, head]
  return { base: moved, head: L, checkout: rev(w.root, 'HEAD'), why: /this run's checkout is not [0-9a-f]{10}'s tree/ };
});

// The spec run's base binding (baseDiffers): a tranche tip the land's base descends from, with the
// same judge, and a base-red suite only on the land's base itself.
refused('the spec run\'s base is not behind the land\'s base', ({ w, x, s }) => {
  // The predicted ahead commit has t1's tree but is not in t1's history.
  x.state.comments[SPEC] = [];
  post(x.state, SPEC, { ...s.run, run_id: 103, base: w.ahead });
  return { base: w.t1, head: land(w, w.t1), why: /spec PR 9's run was judged on base [0-9a-f]{10}, which is not [0-9a-f]{10}, this land's base, nor behind it/ };
});
// The judge moved in the tranche after the spec run's base (t0 -> j), and the train built the spec
// head on j: the spec head and the land differ only in records, but the run's judge is not the land's.
function judgeMoved(change) {
  return ({ w, x }) => {
    git(['checkout', '-q', '--detach', w.t0], { cwd: w.root });
    change(w);
    const j = rev(w.root, 'HEAD');
    const { specHead } = chain(w.root, j, w.job, { 'notes/ahead.md': 'ahead in the window\n' }, 'train/head/5-2');
    git(['checkout', '-q', '--detach', j], { cwd: w.root });
    const t1 = commit(w.root, { 'notes/ahead.md': 'ahead in the window\n' }, 'Merge job PR 4');
    x.state.prs[SPEC] = specPR(w, { head: { ref: 'train/head/5-2', sha: specHead, repo: { full_name: SLUG } } });
    x.state.comments[SPEC] = [];
    const s2 = gate(w.root, { base: w.t0, head: specHead, branch: 'train/head/5-2', pr: SPEC, draft: true, slug: SLUG, io: x.io, log: quiet, ...(git(['checkout', '-q', '--detach', specHead], { cwd: w.root }), {}) });
    assert.deepEqual([s2.findings, s2.run.spec], [[], { pr: JOB, seq: 2 }]);
    s2.run.run_id = 110;
    post(x.state, SPEC, s2.run);
    forget(w);
    return { base: t1, head: land(w, t1) };
  };
}
refused('the gate pin (.process) differs between the spec run\'s base and the land\'s', (g) => ({
  // A vendored pin here (a directory); the cover test below moves it as a gitlink.
  ...judgeMoved((w) => commit(w.root, { '.process/tool/p3.mjs': '// the pin moved\n' }, 'the pin moved'))(g),
  why: /spec PR 9's run was judged on base [0-9a-f]{10}, which has another judge than [0-9a-f]{10}: \.process;/,
}));
refused('the gate workflow differs between the spec run\'s base and the land\'s', (g) => ({
  ...judgeMoved((w) => commit(w.root, { '.github/workflows/process-gate.yml': 'name: process gate\n' }, 'the gate workflow changed'))(g),
  why: /which has another judge than [0-9a-f]{10}: \.github\/workflows\/process-gate\.yml;/,
}));
refused('the spec run was base-red on an older tranche tip than the land\'s base', ({ w, x, s }) => {
  x.state.comments[SPEC] = [];
  post(x.state, SPEC, { ...s.run, run_id: 109, suite: 'base-red', base_red: [{ module: 'alpha', tests: ['test/alpha/old.test.mjs::nothing'] }] });
  return { base: w.t1, head: land(w, w.t1), why: /which ran base-red, tolerated on that base, not on [0-9a-f]{10}/ };
});

// The spec-tested land, its row posted on the job PR as run 201, and GitHub's merge of the job PR
// into the tranche (at t1): the merge commit c, whose tree is L's.
function covered() {
  const { w, x, s } = greenSpec();
  const L = land(w, w.t1);
  const r = jobRun(w, x, { base: w.t1, head: L });
  assert.equal(r.run.trigger, 'spec-tested');
  r.run.run_id = 201;
  post(x.state, JOB, r.run);
  git(['checkout', '-q', '-B', 'tranche', w.t1], { cwd: w.root });
  git(['merge', '-q', '--no-ff', '-m', `Merge job PR ${JOB}`, L], { cwd: w.root });
  const c = rev(w.root, 'HEAD');
  x.state.prs[JOB] = jobPR(w, { state: 'closed', merged: true, merge_commit_sha: c, head: { ref: 'job/alpha', sha: L, repo: { full_name: SLUG } } });
  // The merged job PR's runs bind by branch; the spec PR's by the PR while open, by its branch once closed.
  x.state.verifyOk = (row, ctx) => x.state.genuine.has(`${ctx.pr}|${row.run_id}`) && ctx.baseRef === 'tranche';
  return { w, x, s, r, c, cfg: loadConfig(w.root, c) };
}

test('the tranche cover follows a spec-tested row to its spec run, bound into the tranche, open or closed; refused when that run is missing or does not verify', () => {
  const { w, x, c, cfg } = covered();
  assert.deepEqual(jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io }), { ok: true, pr: JOB, id: 'alpha', own: jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io }).own });
  assert.ok(x.state.verified.some((v) => v.run_id === 101 && v.ctx.pr === SPEC && v.ctx.baseRef === 'tranche' && !v.ctx.merged));
  // The spec PR closed (its runs may list no PR): bound by its branch, every PR from it into the tranche.
  x.state.prs[SPEC] = specPR(w, { state: 'closed' });
  x.state.verified.length = 0;
  assert.equal(jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io }).ok, true);
  assert.ok(x.state.verified.some((v) => v.run_id === 101 && v.ctx.baseRef === 'tranche' && v.ctx.merged?.branch === 'train/head/5-1'));
  // Closed, with another PR from its branch into another base: no branch binding, the PR's own listing only.
  x.state.from['train/head/5-1'] = [{ number: SPEC, base: { ref: 'tranche' } }, { number: 12, base: { ref: 'main' } }];
  x.state.verified.length = 0;
  jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io });
  assert.ok(x.state.verified.some((v) => v.run_id === 101 && v.ctx.baseRef === 'tranche' && !v.ctx.merged));
  x.state.from['train/head/5-1'] = [{ number: SPEC, base: { ref: 'tranche' } }];
  x.state.prs[SPEC] = specPR(w);

  const refusal = /is PR 5's merge, but no verified green run of the alpha suite stands behind its merged result/;
  // The spec run is not verified.
  const ok = x.state.verifyOk;
  x.state.verifyOk = (row, ctx) => ctx.pr !== SPEC && ok(row, ctx);
  const nv = jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io });
  assert.equal(nv.ok, false);
  assert.match(nv.why, refusal);
  x.state.verifyOk = ok;
  // The spec run is not found: gone from the spec PR.
  const kept = x.state.comments[SPEC];
  x.state.comments[SPEC] = [];
  const nf = jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io });
  assert.equal(nf.ok, false);
  assert.match(nf.why, refusal);
  x.state.comments[SPEC] = kept;
  // The spec PR named is not a spec PR for this job, or is of the old shape.
  x.state.prs[SPEC] = specPR(w, { head: { ref: 'train/head/6-1', sha: w.specHead, repo: { full_name: SLUG } } });
  assert.match(jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io }).why, refusal);
  x.state.prs[SPEC] = specPR(w, { base: { ref: 'train/spec/5-1' } });
  assert.match(jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io }).why, refusal);
});

// The cover stands on the spec run only when its base is the spec-tested row's base or behind it,
// with the same judge (baseDiffers).
test('the tranche cover refuses a spec run whose base is not behind the spec-tested row\'s base, or has another judge', () => {
  const { w, x, s, r, c, cfg } = covered();
  const cover = (specRun, base) => {
    x.state.comments[SPEC] = [];
    post(x.state, SPEC, { ...s.run, run_id: specRun, base });
    x.state.comments[JOB] = x.state.comments[JOB].filter((m) => m.user.login !== BOT);
    post(x.state, JOB, { ...r.run, run_id: specRun + 100, spec_run: specRun });
    return jobMerge(w.root, cfg, c, { slug: SLUG, io: x.io });
  };
  const refusal = /is PR 5's merge, but no verified green run of the alpha suite stands behind its merged result/;
  // Control: the spec run on t0 (behind t1, the row's base), posted the same way, covers; so does one on t1.
  assert.equal(cover(105, w.t0).ok, true);
  assert.equal(cover(106, w.t1).ok, true);
  // On the predicted ahead commit, not in t1's history: no cover.
  assert.match(cover(107, w.ahead).why, refusal);
  // Behind t1 but with another pin: no cover.
  git(['checkout', '-q', '--detach', w.t0], { cwd: w.root });
  git(['update-index', '--add', '--cacheinfo', `160000,${w.t0},.process`], { cwd: w.root });
  git(['commit', '-q', '-m', 'another pin'], { cwd: w.root });
  assert.match(cover(108, rev(w.root, 'HEAD')).why, refusal);
});

// With the serial train (merge_train_window 1, or not set) there is no spec mode and no fast path:
// a spec-shaped pull request is judged as any other, and a Spec-Tested trailer asks for nothing.
test('with the window closed, a spec-shaped PR is judged as a non-job PR and a Spec-Tested trailer is ignored', () => {
  for (const config of [{ merge_train_window: 1 }, {}, null]) {
    const at = JSON.stringify(config);
    const w = world({ config });
    const x = makeIO(w);
    const d = specRun(w, x);
    assert.deepEqual([d.run.spec, d.run.trigger, d.run.suite], [undefined, 'draft', 'skipped'], at);
    assert.equal(ran(w), false, at);
    x.state.prs[SPEC] = specPR(w, { draft: false });
    const r = specRun(w, x, { draft: false });
    assert.equal(r.run.spec, undefined, at);
    assert.deepEqual([r.run.trigger, r.run.scope, r.run.suite, r.run.revert, r.run.receipt], ['code', ['alpha'], 'pass', 'skipped', 'not checked'], at);
    assert.ok(!r.findings.some((f) => f.check === 'spec'), at);
    assert.ok(ran(w), `${at}: the suite ran`);
  }
  // A green spec run under an open window; then the tranche closes the window (a records-only
  // change) and the land asks for the fast path: not even considered.
  const { w, x } = greenSpec();
  git(['checkout', '-q', '--detach', w.t1], { cwd: w.root });
  const serial = commit(w.root, { 'process/config.json': { merge_train_window: 1 } }, 'serial train');
  const L = land(w, serial);
  const said = [];
  const r = jobRun(w, x, { base: serial, head: L, log: (m) => said.push(m) });
  assert.deepEqual([r.run.trigger, r.run.spec_pr, r.run.suite, r.run.receipt], ['code', undefined, 'pass', 'agrees']);
  assert.ok(ran(w), 'the suite ran');
  assert.ok(!said.some((m) => /Spec-Tested|spec-tested/.test(m)), said.join('\n'));
});
