// The owner's limits on a workflow change (build workflow-limits, R1; Bob, 6 Nov: "yes to R1"):
// a plain pull request changing .github/workflows/* merges on a green gate when every changed or
// added workflow passes L1 to L5; process3 PR 188 and copy PR 625, both refused and merged by
// hand on 6 Nov, pass.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { lineOf, parseWorkflow, readWorkflow } from '../lib/wfyaml.mjs';
import { judgeWorkflow, matchesRequired } from '../lib/workflow-limits.mjs';
import { limitsLine, mergePlain, workflowChanges } from '../lib/merge.mjs';
import { closeWorkflows } from '../lib/workflows.mjs';
import { git } from '../lib/util.mjs';
import { commit, makeRepo } from './helpers.mjs';

const fx = (name) => readFileSync(join(import.meta.dirname, 'fixtures', 'workflow-limits', name), 'utf8');

// A small workflow with a required job `ci`, as process3's own is shaped.
const CI = `name: ci
on:
  pull_request:
    types: [opened, synchronize]
permissions:
  contents: read
jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: tests
        run: node --test 'tool/test/*.test.mjs'
      - name: record check
        env:
          GH_TOKEN: \${{ github.token }}
        run: |
          git worktree add -q base "$BASE"
          node tool/p3.mjs record-check --base "$BASE"
  other:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - run: echo hi
`;
const REQ = ['ci', 'record'];
const edit = (from, to, src = CI) => { assert.ok(src.includes(from), from); return src.replace(from, to); };
const judge = (head, base = CI, req = REQ) => judgeWorkflow('.github/workflows/ci.yml', base, head, req);
const ok = (r) => assert.equal(r.ok, true, JSON.stringify(r));
const no = (r, limit, re) => { assert.equal(r.ok, false, 'refused'); assert.equal(r.limit, limit, JSON.stringify(r)); if (re) assert.match(r.why, re); };

test('the reader reads plain workflow YAML, with lines, and refuses what it cannot read for sure', () => {
  const d = parseWorkflow(CI);
  assert.equal(d.jobs.ci.steps[1].with['node-version'], '22');
  assert.deepEqual(d.on.pull_request.types, ['opened', 'synchronize']);
  assert.equal(d.jobs.ci.steps[3].run, 'git worktree add -q base "$BASE"\nnode tool/p3.mjs record-check --base "$BASE"');
  assert.equal(lineOf(d.jobs, 'other'), 24);
  assert.equal(lineOf(d.jobs.ci.steps, 2), 16);
  // Comments, a key's sequence at its own indent, a multi-line flow list, quoted keys and values.
  const e = parseWorkflow('# top\non: # why\n  push:\n    paths: [\n      "a/**", # one\n      \'b\',\n    ]\njobs:\n  a:\n    steps:\n    - run: echo "x # not a comment"  # a comment\n    - { uses: "x@v1" }\n');
  assert.deepEqual(e.on.push.paths, ['a/**', 'b']);
  assert.equal(e.jobs.a.steps[0].run, 'echo "x');
  assert.equal(e.jobs.a.steps[1].uses, 'x@v1');
  for (const [src, re] of [
    ['a: &x 1\nb: *x\n', /indicator/],
    ['a: !!str 1\n', /indicator/],
    ['a: 1\na: 2\n', /given twice/],
    ['a:\n  <<: {}\n', /not a `key: value`|merge key/],
    ['? a\n: b\n', /top level|indicator/],
    ['a: 1\n---\nb: 2\n', /more than one document/],
    ['a:\n\tb: 1\n', /tab|cannot place|deeper/],
    ['a: one\n  two\n', /deeper than the value/],
    ['a: x: y\n', /": "/],
    ['a: "open\n', /does not end/],
    ['a:\n  - - x\n', /sequence inside/],
    ['a: [1, 2\n', /not closed/],
    ['a: 1\u2028b: 2\n', /line break/],
    ['- a\n', /top level is not a mapping/],
  ]) assert.match(readWorkflow(src).why || 'read', re, JSON.stringify(src));
  // Every workflow in the fixtures reads.
  for (const f of ['188-base-ci.yml', '188-head-ci.yml', '625-head-regression.yml', '625-head-container-images.yml', '625-head-deploy-test.yml', '625-head-release-sign.yml']) assert.equal(readWorkflow(fx(f)).why, undefined, f);
});

test('L1: no job added, removed or renamed whose name matches a required check', () => {
  ok(judge(edit('  other:\n', '  lint:\n    runs-on: x\n    permissions: {}\n    steps: [{ run: "true" }]\n  other:\n')));
  ok(judge(edit('  other:\n    runs-on', '  renamed:\n    runs-on')));
  no(judge(edit('  other:\n    runs-on', '  other:\n    name: ci\n    runs-on')), 'L1', /renames the job other \(other to ci\)/);
  no(judge(edit('  ci:\n    runs-on', '  ci:\n    name: tests\n    runs-on')), 'L1', /renames the job ci/);
  no(judge(edit('  ci:\n    runs-on', '  tests:\n    runs-on')), 'L1', /(removes|adds) the job/);
  no(judge(edit('  other:\n', '  record:\n    runs-on: x\n    steps: []\n  other:\n')), 'L1', /adds the job record/);
  // A matrix or a called workflow names its checks after the job; an expression could be any.
  assert.equal(matchesRequired(['gate'], ['gate (22)']), true);
  assert.equal(matchesRequired(['build'], ['ci / build']), true);
  assert.equal(matchesRequired(['${{ matrix.x }}'], ['ci']), true);
  assert.equal(matchesRequired(['cin'], ['ci']), false);
  // A new workflow whose job is named like a required check.
  no(judgeWorkflow('.github/workflows/fake.yml', null, 'on: push\npermissions: {}\njobs:\n  x:\n    name: record\n    runs-on: y\n', REQ), 'L1', /adds the job x/);
});

test('L2: no permissions widened, at the workflow or a job, and no block removed', () => {
  ok(judge(edit('permissions:\n  contents: read\n', 'permissions:\n  contents: read\n  checks: none\n')));
  ok(judge(edit('permissions:\n  contents: read\n', 'permissions: {}\n')));
  no(judge(edit('  contents: read\njobs', '  contents: write\njobs')), 'L2', /contents: write is wider than the base's read/);
  no(judge(edit('permissions:\n  contents: read\n', 'permissions:\n  contents: read\n  pull-requests: write\n')), 'L2', /pull-requests: write/);
  no(judge(edit('permissions:\n  contents: read\n', '')), 'L2', /removed, so it takes the default/);
  no(judge(edit('permissions:\n  contents: read\n', 'permissions: read-all\n')), 'L2', /read-all/);
  no(judge(edit('permissions:\n      contents: read\n', 'permissions: write-all\n')), 'L2', /job other: permissions write-all/);
  // A job that drops its own block falls to the workflow's: no wider here, so it passes.
  ok(judge(edit('    permissions:\n      contents: read\n', '')));
  // A new job grants what the workflow does, no more.
  no(judge(edit('  other:\n', '  lint:\n    runs-on: x\n    permissions:\n      issues: write\n    steps: []\n  other:\n')), 'L2', /job lint/);
  // A new workflow declares its permissions and writes nothing.
  ok(judgeWorkflow('.github/workflows/n.yml', null, 'on: push\npermissions:\n  contents: read\njobs:\n  a:\n    runs-on: x\n', REQ));
  no(judgeWorkflow('.github/workflows/n.yml', null, 'on: push\njobs:\n  a:\n    runs-on: x\n', REQ), 'L2', /must declare its permissions/);
  no(judgeWorkflow('.github/workflows/n.yml', null, 'on: push\npermissions:\n  contents: write\njobs:\n  a:\n    runs-on: x\n', REQ), 'L2', /grants write/);
  no(judge(edit('  contents: read\njobs', '  contents: maybe\njobs')), 'L2', /not read, write or none/);
});

test('L3: no pull_request_target or workflow_run trigger added', () => {
  ok(judge(edit('on:\n  pull_request:\n', 'on:\n  push:\n  pull_request:\n')));
  no(judge(edit('on:\n  pull_request:\n', 'on:\n  pull_request_target:\n  pull_request:\n')), 'L3', /pull_request_target/);
  no(judge(edit('on:\n  pull_request:\n    types: [opened, synchronize]\n', 'on: [pull_request, workflow_run]\n')), 'L3', /workflow_run/);
  no(judgeWorkflow('.github/workflows/n.yml', null, 'on: pull_request_target\npermissions: {}\njobs:\n  a:\n    runs-on: x\n', REQ), 'L3');
  // Kept where the base had it.
  const t = edit('on:\n  pull_request:\n', 'on:\n  pull_request_target:\n');
  ok(judge(edit('timeout-minutes: 10', 'timeout-minutes: 20', t), t));
});

test('L5: a required job keeps its steps, their conditions and every line its runs had', () => {
  // Allowed: a timeout, an action version, node-version, a step added, lines after a run's last.
  ok(judge(edit('timeout-minutes: 10', 'timeout-minutes: 20')));
  ok(judge(edit('actions/setup-node@v4\n        with:\n          node-version: 22', 'actions/setup-node@v5\n        with:\n          node-version: 26\n          cache: npm')));
  ok(judge(edit('      - name: tests\n', '      - name: lint\n        run: npm run lint\n      - name: tests\n')));
  ok(judge(edit('--base "$BASE"\n', '--base "$BASE"\n          echo done\n')));
  // Refused: a step removed, a run line dropped or changed, a line put before, a condition.
  no(judge(edit("      - name: tests\n        run: node --test 'tool/test/*.test.mjs'\n", '')), 'L5', /loses its step "tests"/);
  no(judge(edit("run: node --test 'tool/test/*.test.mjs'", "run: node --test 'tool/test/*.test.mjs' || true")), 'L5', /drops the line/);
  no(judge(edit('          git worktree add', '          set +e\n          git worktree add')), 'L5', /put into its run before its last line/);
  no(judge(edit("      - name: tests\n", "      - name: tests\n        if: false\n")), 'L5', /has its if added/);
  no(judge(edit("      - name: tests\n", "      - name: tests\n        continue-on-error: true\n")), 'L5', /continue-on-error added/);
  no(judge(edit('          GH_TOKEN: ${{ github.token }}\n', '          GH_TOKEN: ${{ github.token }}\n          SKIP: 1\n')), 'L5', /env changed/);
  no(judge(edit('      - uses: actions/checkout@v4\n', '      - uses: someone/checkout@v4\n')), 'L5', /loses its step/);
  // The job's own condition, needs, or its workflow's env.
  no(judge(edit('  ci:\n    runs-on', '  ci:\n    if: false\n    runs-on')), 'L5', /required job ci has its if added/);
  no(judge(edit('  ci:\n    runs-on', '  ci:\n    needs: other\n    runs-on')), 'L5', /needs added/);
  no(judge(edit('jobs:\n', 'env:\n  CI_SKIP: 1\njobs:\n')), 'L5', /workflow's env/);
  // A job that is not a required check may change freely (the other limits aside).
  ok(judge(edit('      - run: echo hi\n', '      - run: echo bye\n        if: false\n')));
  // Reordering the steps is a removal for this judge.
  no(judge(edit("      - name: tests\n        run: node --test 'tool/test/*.test.mjs'\n      - name: record check\n", "      - name: record check\n").replace("  other:\n", "      - name: tests\n        run: node --test 'tool/test/*.test.mjs'\n  other:\n")), 'L5', /loses its step "record check"/);
});

test('process3 PR 188 and copy PR 625 pass; a deleted workflow and an unread one are refused', () => {
  const r188 = judgeWorkflow('.github/workflows/ci.yml', fx('188-base-ci.yml'), fx('188-head-ci.yml'), ['ci', 'record']);
  ok(r188);
  assert.deepEqual(r188.required, ['ci']);
  for (const f of ['container-images', 'deploy-test', 'regression', 'release-sign']) {
    ok(judgeWorkflow(`.github/workflows/${f}.yml`, fx(`625-base-${f}.yml`), fx(`625-head-${f}.yml`), ['gate', 'record']));
    // Even were the release and regression jobs required checks, 625 only adds steps to them.
    if (f !== 'deploy-test') ok(judgeWorkflow(`.github/workflows/${f}.yml`, fx(`625-base-${f}.yml`), fx(`625-head-${f}.yml`), ['gate', 'regression', 'sign', 'image']));
  }
  no(judgeWorkflow('.github/workflows/ci.yml', CI, null, REQ), 'removal', /deletes a workflow/);
  no(judgeWorkflow('.github/workflows/ci.yml', CI, 'on: push\njobs: [a]\n', REQ), 'reading', /no jobs mapping/);
  no(judgeWorkflow('.github/workflows/ci.yml', CI, CI.replace('echo hi', 'echo h\u00e9'), REQ), 'reading', /outside printable ASCII/);
});

// merge --plain, end to end: a repository whose tranche holds CI; a head branch changes it.
function repo({ pin = false, files }) {
  const root = makeRepo({ 'README.md': 'x', '.github/workflows/ci.yml': CI, ...(pin ? { 'process/config.json': {} } : {}) });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-wl-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'build/w', 'tranche'], { cwd: root });
  for (const [p, t] of Object.entries(files)) if (t === null) { git(['rm', '-q', p], { cwd: root }); delete files[p]; }
  let sha = commit(root, files);
  if (pin) {
    git(['update-index', '--add', '--cacheinfo', `160000,${'a'.repeat(40)},.process`], { cwd: root });
    git(['commit', '-q', '-m', 'the pin'], { cwd: root });
    sha = git(['rev-parse', 'HEAD'], { cwd: root });
  }
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche', 'build/w'], { cwd: root });
  return { root, sha };
}
function io(r, { checks = REQ, repo: proc = { released: () => true, shim: () => null, descends: () => true } } = {}) {
  const calls = { merged: null, rules: 0 };
  const pr = () => ({ state: 'open', draft: false, base: { ref: 'tranche', repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: 'build/w', sha: r.sha, repo: { full_name: 'o/r' } } });
  return {
    calls,
    io: {
      getPR: pr,
      requiredChecks: () => { calls.rules++; return { checks: checks.map((context) => ({ context })) }; },
      checkRuns: () => [{ id: 1, status: 'completed', conclusion: 'success', started_at: '2026-11-06T10:00:00Z' }],
      repo: proc,
      mergePR: (slug, n, sha, o) => { calls.merged = { sha, ...o }; return { merged: true, sha: 'm'.repeat(40) }; },
    },
  };
}
const q = { slug: 'o/r', log: () => {}, noReview: 'a test' };

test('merge --plain lands a workflow change within the limits and records the limits it checked', () => {
  // process3 itself: no pin, no shims, L4 does not apply.
  const r = repo({ files: { '.github/workflows/ci.yml': edit('timeout-minutes: 10', 'timeout-minutes: 20') } });
  const f = io(r);
  const out = mergePlain(r.root, 7, { ...q, io: f.io });
  assert.equal(out.merged, true);
  assert.deepEqual(out.workflows, [{ file: '.github/workflows/ci.yml', limits: ['L1', 'L2', 'L3', 'L5'] }]);
  assert.equal(f.calls.merged.message, 'No review: a test\nReview rounds: 0\nWorkflow limits: ci.yml L1 L2 L3 L5');
  assert.equal(f.calls.rules, 1, 'the required checks are read once');
  // Outside a limit: refused with the limit, the line and the owner's word; nothing merged.
  const w = repo({ files: { '.github/workflows/ci.yml': edit('  contents: read\njobs', '  contents: write\njobs') } });
  const g = io(w);
  assert.throws(() => mergePlain(w.root, 7, { ...q, io: g.io }), /changes \.github\/workflows\/ci\.yml: L2 \(line 5\): the workflow's permissions contents: write is wider than the base's read; a workflow change outside the owner's limits needs the owner's word: bring it to Bob/);
  assert.equal(g.calls.merged, null);
  const t = repo({ files: { '.github/workflows/new.yml': 'on: pull_request_target\npermissions: {}\njobs:\n  a:\n    runs-on: x\n' } });
  assert.throws(() => mergePlain(t.root, 7, { ...q, io: io(t).io }), /new\.yml: L3 \(line 1\): it adds the pull_request_target trigger; a workflow change outside/);
  const d = repo({ files: { '.github/workflows/ci.yml': null } });
  assert.throws(() => mergePlain(d.root, 7, { ...q, io: io(d).io }), /ci\.yml: removal: it deletes a workflow; a workflow change outside/);
});

test('L4: in a product, a shim stays the pin\'s own byte for byte; other workflows pass by the limits', () => {
  const shim = 'name: process-gate\non: pull_request\n';
  const shimBlob = (root) => git(['hash-object', '--stdin'], { cwd: root, input: shim });
  // The product's own workflow changes within the limits; the shim is untouched.
  const r = repo({ pin: true, files: { '.github/workflows/ci.yml': edit('timeout-minutes: 10', 'timeout-minutes: 20') } });
  const proc = { released: () => true, descends: () => true, shim: (pin, name) => (name === 'process-gate.yml' ? shimBlob(r.root) : null) };
  assert.deepEqual(workflowChanges(r.root, r.sha, ['.github/workflows/ci.yml'], proc, null, { mb: git(['rev-parse', 'tranche'], { cwd: r.root }), required: () => REQ }), [{ file: '.github/workflows/ci.yml', limits: ['L1', 'L2', 'L3', 'L5'] }]);
  // The shim changed: refused as L4, whatever the limits would say.
  const s = repo({ pin: true, files: { '.github/workflows/process-gate.yml': shim + '# mine\n' } });
  const sp = { ...proc, shim: (pin, name) => (name === 'process-gate.yml' ? shimBlob(s.root) : null) };
  assert.throws(() => workflowChanges(s.root, s.sha, ['.github/workflows/process-gate.yml'], sp, null, { required: () => REQ }), /L4: \.github\/workflows\/process-gate\.yml is not the process's own shim.*owner's word/);
  // Equal to the pin's shim: L4 holds.
  const e = repo({ pin: true, files: { '.github/workflows/process-gate.yml': shim } });
  const ep = { ...proc, shim: (pin, name) => (name === 'process-gate.yml' ? shimBlob(e.root) : null) };
  assert.deepEqual(workflowChanges(e.root, e.sha, ['.github/workflows/process-gate.yml'], ep, null, { required: () => REQ }), [{ file: '.github/workflows/process-gate.yml', limits: ['L4'] }]);
  assert.equal(limitsLine([{ file: '.github/workflows/process-gate.yml', limits: ['L4'] }, { file: '.github/workflows/README.md', limits: [], note: 'not a workflow' }]), 'Workflow limits: process-gate.yml L4; README.md not a workflow');
});

test('a close carries a workflow change within the owner\'s limits when its shapes do not fit', () => {
  // Rule 1 is held elsewhere (close-workflows.test.mjs); here the second judge: shapes, else limits.
  const root = makeRepo({ '.github/workflows/ci.yml': CI });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const head = commit(root, { '.github/workflows/ci.yml': edit('timeout-minutes: 10', 'timeout-minutes: 20') });
  const at = { mb: base, baseRef: base, tranche: 'tranche', slug: 'o/r', io: { repo: {} } };
  const pass = { ...at, limits: (f, src, baseSrc) => judgeWorkflow(f, baseSrc, src, REQ) };
  // Rule 1 needs gated merges: stub it by a chain with nothing after the base (the file is earlier work).
  const judged = closeWorkflows(root, head, ['.github/workflows/ci.yml'], { ...pass, mb: head });
  assert.deepEqual(judged, [{ file: '.github/workflows/ci.yml', limits: ['rule 1', 'L1', 'L2', 'L3', 'L5'] }]);
  const bad = commit(root, { '.github/workflows/ci.yml': edit('  contents: read\njobs', '  contents: write\njobs') });
  assert.throws(() => closeWorkflows(root, bad, ['.github/workflows/ci.yml'], { ...pass, baseRef: head, mb: bad }), /fits no allowed shape.*nor is it within the owner's limits \(L2, line 5/);
  assert.throws(() => closeWorkflows(root, bad, ['.github/workflows/ci.yml'], { ...at, baseRef: head, mb: bad }), /fits no allowed shape.*allowed shapes or within the owner's limits$/);
});
