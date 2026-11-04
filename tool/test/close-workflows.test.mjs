// A close's workflow changes (Bob, 4 Nov, about 07:04: product workflow changes are not his to
// bring). The tranche into main, normal or bootstrap, may carry a product workflow change that
// reached the tranche through gated pull requests, defines no job named like a required or
// process check, and widens no permission; process-gate.yml must still be the pin's own shim.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { mergePlain } from '../lib/merge.mjs';
import { readWorkflow, workflowRules } from '../lib/workflows.mjs';
import { BOT, GATE, block } from '../lib/github.mjs';
import { DEFAULTS, git } from '../lib/util.mjs';
import { entry, makeRepo, write } from './helpers.mjs';

// A commit of only these files: `git add -A` would drop the pin's gitlink, which has no checkout.
const commit = (root, files, msg = 'change') => { write(root, files); git(['add', '--', ...Object.keys(files)], { cwd: root }); git(['commit', '-q', '-m', msg], { cwd: root }); return git(['rev-parse', 'HEAD'], { cwd: root }); };

const PIN = 'a'.repeat(40);
const SHIM = 'name: process-gate\non: pull_request\n';
const MAIN_PR = 70;

// The copy's container-images.yml and regression.yml, cut down to what the rules read.
const IMAGES = (extra = '') => `# container-images.yml: builds the fleet's images
name: container-images

on:
  push:
    branches: ["dist/cut-*"]
    paths: ["agent-runner/Dockerfile",
            ".github/workflows/container-images.yml"]
  workflow_dispatch:

permissions:
  contents: read
  packages: write

jobs:
  image:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - { name: agent-runner, context: agent-runner }${extra}
    steps:
      - uses: actions/checkout@v4
      - name: build and push
        run: |
          echo "gate:"
          echo building
`;
const REGRESSION = (extra = '') => `name: regression
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: |
        set -euo pipefail
        for pkg in bio-plane pdf-worker${extra}; do echo $pkg; done
`;

function processRepo(root) {
  const shim = git(['hash-object', '-w', '--stdin'], { cwd: root, input: SHIM });
  return { released: (p) => p === PIN, shim: (p, name) => (name === 'process-gate.yml' ? shim : null), descends: () => true };
}

// A product: main with the product workflows (and, unless bootstrap, Process3); a tranche that
// takes Process3 and then each change in `steps`, in order: { via: 'plain' | 'job' | 'direct',
// files, red, unverified }. Plain and job changes merge as merge --plain and merge write them.
function product({ bootstrap = true, steps = [], ledger = [], pre = [] } = {}) {
  const mainFiles = { 'README.md': 'x', '.github/workflows/container-images.yml': IMAGES(), '.github/workflows/regression.yml': REGRESSION() };
  for (const id of ledger) mainFiles[`process/ledger/${id}.json`] = entry(id, { paths: ['.github/workflows/regression.yml'], tests: [`test/${id}/`] });
  if (!bootstrap) mainFiles['process/config.json'] = { tranche: 'tranche' };
  const root = makeRepo(mainFiles);
  if (!bootstrap) { git(['update-index', '--add', '--cacheinfo', `160000,${PIN},.process`], { cwd: root }); git(['commit', '-q', '-m', 'pin'], { cwd: root }); }
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: root });
  // Earlier work: direct commits on the tranche before Process3, left out by record_since.
  let since = null;
  for (const files of pre) since = commit(root, files, 'earlier work, before Process3');
  let setAt = null;
  if (bootstrap) {
    setAt = commit(root, { 'process/config.json': { tranche: 'tranche', ...(since ? { record_since: since } : {}) }, '.github/workflows/process-gate.yml': SHIM }, 'Process3 setup on the tranche');
    git(['update-index', '--add', '--cacheinfo', `160000,${PIN},.process`], { cwd: root });
    git(['commit', '-q', '-m', 'the pin'], { cwd: root });
  } else commit(root, { '.github/workflows/process-gate.yml': SHIM }, 'the shim');
  const prs = new Map();
  const comments = new Map();
  steps.forEach((s, i) => {
    const n = 10 + i;
    const onto = git(['rev-parse', 'HEAD'], { cwd: root });
    if (s.via === 'direct') { commit(root, s.files, 'a direct commit'); return; }
    const branch = s.via === 'job' ? `job/${s.id}` : `bob/wf${i}`;
    git(['checkout', '-q', '-b', branch], { cwd: root });
    commit(root, typeof s.files === 'function' ? s.files(onto) : s.files, 'the workflow change');
    if (s.via === 'job') {
      const was = git(['show', `HEAD:process/metrics/${s.id}.jsonl`], { cwd: root, allowFail: true });
      commit(root, { [`process/metrics/${s.id}.jsonl`]: (was.code === 0 ? was.stdout : '') + JSON.stringify({ row: 'merge', pr: n }) + '\n' });
    }
    const tip = git(['rev-parse', 'HEAD'], { cwd: root });
    git(['checkout', '-q', 'tranche'], { cwd: root });
    git(['merge', '-q', '--no-ff', branch, '-m', s.via === 'job' ? `Merge job PR ${n}` : `Merge PR ${n}: ${branch} into tranche`], { cwd: root });
    if (s.evil) commit(root, s.evil, 'amend'), git(['reset', '-q', '--soft', 'HEAD~1'], { cwd: root }), git(['commit', '-q', '--amend', '--no-edit'], { cwd: root });
    const m = git(['rev-parse', 'HEAD'], { cwd: root });
    prs.set(n, { number: n, merged: true, merge_commit_sha: m, base: { ref: 'tranche' }, head: { ref: branch, sha: tip, repo: { full_name: 'o/r' } }, user: { login: 'civicsmith' } });
    const ok = !s.red;
    const row = { sha: tip, base: onto, run_id: 100 + n, trigger: 'code', scope: s.via === 'job' ? [s.id] : [], suite: ok ? 'pass' : 'fail', ok, findings: ok ? 0 : 1, verified: !s.unverified };
    comments.set(n, [{ id: n, body: block(GATE, { runs: [row] }), user: { login: BOT } }]);
  });
  const sha = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, sha, prs, comments, setAt };
}

function io(r, { rules = { checks: [{ context: 'gate' }] }, owned = null } = {}) {
  const calls = { merged: null };
  const main = () => ({ state: 'open', draft: false, mergeable: true, base: { ref: 'main', repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: 'tranche', sha: r.sha, repo: { full_name: 'o/r' } } });
  return {
    calls,
    io: {
      getPR: (s, n) => (n === MAIN_PR ? main() : r.prs.get(n)),
      prsFromBranch: (s, b) => [...r.prs.values()].filter((x) => x.head.ref === b),
      baseEverChanged: () => false,
      comments: (s, n) => r.comments.get(n) || [],
      verify: (s, row, ctx) => row.verified === true && r.prs.get(ctx.pr)?.head.sha === row.sha && ctx.baseRef === 'tranche' && ctx.merged?.branch === r.prs.get(ctx.pr)?.head.ref,
      requiredChecks: () => rules,
      checkRuns: () => [{ status: 'completed', conclusion: 'success', started_at: '2026-11-04T06:00:00Z' }],
      repo: processRepo(r.root),
      lookup: (args) => (owned && args[1].split('/').pop() === owned
        ? { author: { login: DEFAULTS.approvals.owner }, committer: { login: 'web-flow' }, commit: { verification: { verified: true } } }
        : { author: { login: 'civicsmith' }, committer: { login: 'civicsmith' }, commit: { verification: { verified: false } } }),
      mergePR: (slug, n, sha, o) => { calls.merged = { sha, ...o }; return { merged: true, sha: 'm'.repeat(40) }; },
    },
  };
}
const q = { slug: 'o/r', noReview: 'a test', log: () => {} };
const close = (r, o) => { const f = io(r, o); return { f, go: () => mergePlain(r.root, MAIN_PR, { ...q, io: f.io }) }; };
const imagesRow = '\n          - { name: reader-container, context: reader-container }';
const STYLE = [
  { via: 'plain', files: { '.github/workflows/container-images.yml': IMAGES(imagesRow) } },
  { via: 'plain', files: { '.github/workflows/regression.yml': REGRESSION(' site') } },
];

test('a close carries container-images.yml and regression.yml style changes that came through gated plain pull requests, bootstrap or not', () => {
  for (const bootstrap of [true, false]) {
    const r = product({ bootstrap, steps: STYLE });
    const c = close(r);
    assert.equal(c.go().merged, true, `bootstrap ${bootstrap}`);
    assert.equal(c.f.calls.merged.sha, r.sha);
  }
});

test('a close carries a workflow change that came through a gated job merge', () => {
  const r = product({ ledger: ['m0'], steps: [{ via: 'job', id: 'm0', files: { '.github/workflows/regression.yml': REGRESSION(' site') } }] });
  assert.equal(close(r).go().merged, true);
});

test('a workflow change that came in by an ungated commit is refused, naming rule 1', () => {
  const direct = product({ steps: [{ via: 'direct', files: { '.github/workflows/regression.yml': REGRESSION(' site') } }] });
  const c = close(direct);
  assert.throws(c.go, /changes \.github\/workflows\/regression\.yml: rule 1: it was changed by [0-9a-f]{10}, a direct commit on tranche/);
  assert.equal(c.f.calls.merged, null);
  // Through a plain PR whose gate was red, or whose row is not verified.
  assert.throws(close(product({ steps: [{ ...STYLE[1], red: true }] })).go, /rule 1: .*newest gate run on its head [0-9a-f]{10} is red/);
  assert.throws(close(product({ steps: [{ ...STYLE[1], unverified: true }] })).go, /rule 1: .*not bound to the PR or not verified/);
  // A gated PR, then a direct commit over it.
  const over = product({ steps: [STYLE[1], { via: 'direct', files: { '.github/workflows/regression.yml': REGRESSION(' site agent') } }] });
  assert.throws(close(over).go, /rule 1: .*a direct commit on tranche/);
  // A merge that resolved the file to other bytes than the gated head's.
  const evil = product({ steps: [{ ...STYLE[1], evil: { '.github/workflows/regression.yml': REGRESSION(' evil') } }] });
  assert.throws(close(evil).go, /rule 1: .*does not carry the file as the PR's gated head had it/);
  // The PR's branch had another PR into another base: its rows do not bind.
  const other = product({ steps: [STYLE[1]] });
  const o = close(other);
  o.f.io.prsFromBranch = (s, b) => [...other.prs.values(), { number: 99, head: { ref: b }, base: { ref: 'main' } }].filter((x) => x.head.ref === b);
  assert.throws(o.go, /rule 1: .*also had pull request\(s\) 99 into another base/);
  // A job merge whose gate was red.
  const job = product({ ledger: ['m0'], steps: [{ via: 'job', id: 'm0', red: true, files: { '.github/workflows/regression.yml': REGRESSION(' site') } }] });
  assert.throws(close(job).go, /rule 1: .*is PR 10's merge, but the newest gate run on its merged result/);
});

test('a job named gate, or like a required or process check, is refused, naming rule 2', () => {
  const add = (job) => REGRESSION() + job;
  for (const [job, re] of [
    ['  gate:\n    runs-on: ubuntu-latest\n', /rule 2: it defines a job gate/],
    ['  record:\n    runs-on: ubuntu-latest\n', /rule 2: it defines a job record/],
    ['  other:\n    name: Gate\n    runs-on: ubuntu-latest\n', /rule 2: job other is named Gate/],
    ['  other:\n    name: "${{ inputs.n }}"\n    runs-on: ubuntu-latest\n', /rule 2: job other's name .* is an expression/],
    ['  smoke:\n    runs-on: ubuntu-latest\n', /rule 2: it defines a job smoke, the name of a required check/],
  ]) {
    const r = product({ steps: [{ via: 'plain', files: { '.github/workflows/regression.yml': add(job) } }] });
    assert.throws(close(r, { rules: { checks: [{ context: 'gate' }, { context: 'smoke' }] } }).go, re, job);
  }
  // The required checks cannot be read: refused.
  const r = product({ steps: STYLE });
  const c = close(r);
  c.f.io.requiredChecks = () => null;
  assert.throws(c.go, /the checks main requires could not be read/);
});

test('added write permissions or pull_request_target are refused, naming rule 3', () => {
  const widen = REGRESSION().replace('permissions:\n  contents: read\n', 'permissions:\n  contents: write\n');
  assert.throws(close(product({ steps: [{ via: 'plain', files: { '.github/workflows/regression.yml': widen } }] })).go, /rule 3: it widens contents to write beyond the base's copy/);
  const job = REGRESSION().replace('    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    permissions: { id-token: write }\n');
  assert.throws(close(product({ steps: [{ via: 'plain', files: { '.github/workflows/regression.yml': job } }] })).go, /rule 3: it widens id-token to write/);
  const none = REGRESSION().replace('permissions:\n  contents: read\n', '');
  assert.throws(close(product({ steps: [{ via: 'plain', files: { '.github/workflows/regression.yml': none } }] })).go, /rule 3: it widens .*repository default, read as write-all/);
  const prt = REGRESSION().replace('on:\n  workflow_dispatch:\n', 'on:\n  pull_request_target:\n');
  assert.throws(close(product({ steps: [{ via: 'plain', files: { '.github/workflows/regression.yml': prt } }] })).go, /rule 3: it runs on pull_request_target, which the base's copy does not/);
  // A new file: at most contents: read, and no pull_request_target.
  const fresh = (t) => close(product({ steps: [{ via: 'plain', files: { '.github/workflows/new.yml': t } }] })).go;
  assert.equal(fresh('on: push\npermissions:\n  contents: read\njobs:\n  a:\n    runs-on: x\n')().merged, true);
  assert.equal(fresh('on: push\npermissions: {}\njobs:\n  a:\n    runs-on: x\n')().merged, true);
  assert.throws(fresh('on: push\npermissions: read-all\njobs:\n  a:\n    runs-on: x\n'), /rule 3: it widens actions to read.* beyond contents: read, all a new workflow may hold/);
  assert.throws(fresh('on: push\njobs:\n  a:\n    runs-on: x\n'), /rule 3: it widens/);
  assert.throws(fresh('on: [pull_request_target]\npermissions:\n  contents: read\njobs:\n  a:\n    runs-on: x\n'), /rule 3: it runs on pull_request_target$|rule 3: it runs on pull_request_target\./);
  // A narrowed permission passes.
  const narrow = IMAGES().replace('  packages: write\n', '');
  assert.equal(close(product({ steps: [{ via: 'plain', files: { '.github/workflows/container-images.yml': narrow } }] })).go().merged, true);
});

test('process-gate.yml must still be the pin\'s own shim at a close (rule 4); plain pull requests into the tranche stay shim-only', () => {
  const r = product({ steps: [{ via: 'plain', files: { '.github/workflows/process-gate.yml': SHIM + '# edited\n' } }] });
  assert.throws(close(r).go, /process-gate\.yml is not the process's own shim at aaaaaaaaaa \(rule 4\)/);
});

test('the reader refuses what it cannot read, and reads the shapes workflows use', () => {
  const w = readWorkflow(IMAGES());
  assert.deepEqual(w.jobs.map((j) => j.id), ['image']);
  assert.deepEqual(w.permissions, { contents: 1, packages: 2 });
  assert.equal(readWorkflow(REGRESSION()).jobs[0].id, 'regression');
  assert.equal(readWorkflow('on: push\njobs:\n  a:\n    name: "x" # c\n    permissions: write-all\n').jobs[0].permissions, 'all-write');
  for (const bad of [
    'on: push\njobs: { gate: {} }\n',
    'on: push\njobs:\n  a: &x\n    runs-on: y\n',
    'on: push\njobs:\n  a:\n    runs-on: y\n  a:\n    runs-on: z\n',
    'on: push\njobs:\n\ta:\n',
    'on: push\npermissions: *p\njobs: {}\n',
    'on: push\npermissions:\n  contents: admin\n',
    'on: push\n---\njobs:\n  gate: {}\n',
  ]) assert.match(workflowRules(bad, null, []) || '', /rule 3: it cannot be read/, bad);
});

test('main merged into the tranche passes a workflow file it leaves as main has it, and not one it resolves otherwise', () => {
  const build = (resolve) => {
    const r = product({ steps: [STYLE[1]] });
    // main moves on (a workflow edit on main itself), and the tranche takes main in.
    git(['checkout', '-q', 'main'], { cwd: r.root });
    commit(r.root, { '.github/workflows/container-images.yml': IMAGES('\n          - { name: on-main, context: x }') }, 'main moves');
    git(['checkout', '-q', 'tranche'], { cwd: r.root });
    git(['merge', '-q', '--no-ff', 'main', '-m', 'Bring main in'], { cwd: r.root });
    if (resolve) { commit(r.root, { '.github/workflows/container-images.yml': resolve }, 'x'); git(['reset', '-q', '--soft', 'HEAD~1'], { cwd: r.root }); git(['commit', '-q', '--amend', '--no-edit'], { cwd: r.root }); }
    r.sha = git(['rev-parse', 'HEAD'], { cwd: r.root });
    git(['push', '-q', '-f', 'origin', 'main', 'tranche'], { cwd: r.root });
    git(['checkout', '-q', 'main'], { cwd: r.root });
    return r;
  };
  assert.equal(close(build(null)).go().merged, true);
  assert.throws(close(build(IMAGES('\n          - { name: smuggled, context: x }'))).go, /container-images\.yml: rule 1: it was changed by [0-9a-f]{10}, which is not a merge of a pull request/);
});

test('review 1 of PR 98: escapes, odd names, matrix and reusable-workflow names, hidden triggers and new events are refused', () => {
  const pr = ['gate', 'test (ubuntu-latest)', 'lint / unit'];
  const refused = (src, re, base = null) => assert.match(workflowRules(src, base, pr) || '', re, src);
  const P = 'on: push\npermissions:\n  contents: read\n';
  // Escapes GitHub decodes.
  refused('on: push\n"j\\x6fbs":\n  build:\n    permissions: write-all\n    name: gate\n', /rule 3: it cannot be read .*escape/);
  refused(`${P}jobs:\n  build:\n    "permission\\x73": write-all\n`, /rule 3: it cannot be read .*escape/);
  refused(`${P}jobs:\n  "g\\x61te":\n    runs-on: x\n`, /rule 3: it cannot be read .*escape/);
  refused(`${P}jobs:\n  build:\n    name: "g\\x61te"\n`, /rule 3: it cannot be read .*name/);
  refused('on: [push, "pull_request\\x5ftarget"]\npermissions:\n  contents: read\njobs:\n  a:\n    runs-on: x\n', /rule 3: it cannot be read .*escape/);
  // Names this reader cannot read as one line.
  for (const n of ['>-\n      gate', '|\n      gate', '\n      gate', '!!str gate', '&a gate', '"ga\n      te"']) refused(`${P}jobs:\n  build:\n    name: ${n}\n    runs-on: x\n`, /rule 3: it cannot be read .*name/);
  // Matrix and reusable-workflow check names.
  refused(`${P}jobs:\n  test:\n    strategy:\n      matrix:\n        os: [ubuntu-latest]\n    runs-on: x\n`, /rule 2: job test, a matrix or reusable-workflow job, could report as the required check test \(ubuntu-latest\)/);
  refused(`${P}jobs:\n  lint:\n    uses: ./.github/workflows/u.yml\n`, /rule 2: job lint, a matrix or reusable-workflow job, could report as the required check lint \/ unit/);
  // pull_request_target behind a quoted "#".
  refused('on: { push: { branches: ["a #"] }, pull_request_target: {} }\npermissions:\n  contents: read\njobs:\n  a:\n    runs-on: x\n', /rule 3: it runs on pull_request_target/);
  // A write-holding file that adds an event; the same with paths changed only passes.
  const rel = (on) => `on:\n${on}permissions:\n  contents: write\njobs:\n  a:\n    runs-on: x\n`;
  refused(rel('  schedule:\n    - cron: "0 0 * * *"\n  release:\n'), /rule 3: it holds a write token and adds the event\(s\) schedule/, rel('  release:\n'));
  assert.equal(workflowRules(rel('  push:\n    paths: ["b"]\n'), rel('  push:\n    paths: ["a"]\n'), pr), null);
  // jobs: {} reads as no jobs.
  assert.equal(workflowRules('on: push\njobs: {}\n', null, pr), null);
});

test('review 1 of PR 98: a PR whose gate ran on its own process-gate.yml does not certify a workflow change', () => {
  // The PR changes process-gate.yml and adds foo.yml; a later PR restores the shim.
  const r = product({ steps: [
    { via: 'plain', files: { '.github/workflows/process-gate.yml': 'name: fake\non: pull_request\n', '.github/workflows/foo.yml': 'on: push\npermissions:\n  contents: read\njobs:\n  a:\n    runs-on: x\n' } },
    { via: 'plain', files: { '.github/workflows/process-gate.yml': SHIM } },
  ] });
  assert.throws(close(r).go, /foo\.yml: rule 1: it was changed by [0-9a-f]{10}, PR 10's merge, but [0-9a-f]{10}, which its gate ran on, does not hold the pin's own process-gate\.yml/);
  // No required checks read as none: refused.
  const s = product({ steps: STYLE });
  assert.throws(close(s, { rules: { checks: [] } }).go, /could not be read, or are none/);
});

test('confirming review of PR 98: tagged keys and flow-mapping documents are refused; a job PR\'s own gate certifies nothing', () => {
  const pr = ['test'];
  const P = 'on: push\npermissions:\n  contents: read\n';
  for (const src of [
    '--- {on: push, permissions: write-all, jobs: {gate: {runs-on: ubuntu-latest}}}\n',
    '{on: push, permissions: write-all, jobs: {gate: {runs-on: ubuntu-latest}}}\n',
    'on: push\n!!str jobs:\n  gate:\n    permissions: write-all\n',
    `${P}jobs:\n  !!str gate:\n    runs-on: x\n`,
    `${P}jobs:\n  a:\n    !!str name: gate\n`,
    `${P}jobs:\n  a:\n    !!str permissions: write-all\n`,
  ]) assert.match(workflowRules(src, null, pr) || '', /rule 3: it cannot be read/, src);
  assert.equal(workflowRules('--- # a comment\non: push\npermissions:\n  contents: read\njobs:\n  a:\n    name: \'it\'\'s\'\n', null, pr), null);
  // A job PR whose head holds its own process-gate.yml.
  const r = product({ ledger: ['m0'], steps: [{ via: 'job', id: 'm0', files: { '.github/workflows/process-gate.yml': 'name: fake\non: pull_request\n', '.github/workflows/regression.yml': REGRESSION(' site') } }, { via: 'plain', files: { '.github/workflows/process-gate.yml': SHIM } }] });
  assert.throws(close(r).go, /regression\.yml: rule 1: .*PR 10's merge, but [0-9a-f]{10}, which its gate ran on, does not hold the pin's own process-gate\.yml/);
});

test('coordinator, 4 Nov 08:02: a workflow edit in the product\'s pre-Process3 history is judged whole by rules 2 to 4', () => {
  const edit = { '.github/workflows/regression.yml': REGRESSION(' site') };
  // record_since set at the owner's website commit: the earlier direct commit passes.
  const r = product({ pre: [edit] });
  assert.equal(close(r, { owned: r.setAt }).go().merged, true);
  // The same record_since set by a session: not honoured, so rule 1 refuses the direct commit.
  assert.throws(close(r).go, /regression\.yml: rule 1: it was changed by [0-9a-f]{10}, a direct commit on tranche/);
  // A post-boundary direct commit is refused even with the boundary honoured.
  const after = product({ pre: [edit], steps: [{ via: 'direct', files: { '.github/workflows/regression.yml': REGRESSION(' site agent') } }] });
  assert.throws(close(after, { owned: after.setAt }).go, /rule 1: .*a direct commit on tranche/);
  // A pre-boundary edit that fails rule 2 or rule 3 is refused.
  const named = product({ pre: [{ '.github/workflows/regression.yml': REGRESSION() + '  gate:\n    runs-on: x\n' }] });
  assert.throws(close(named, { owned: named.setAt }).go, /regression\.yml: rule 2: it defines a job gate/);
  const wide = product({ pre: [{ '.github/workflows/regression.yml': REGRESSION().replace('contents: read', 'contents: write') }] });
  assert.throws(close(wide, { owned: wide.setAt }).go, /regression\.yml: rule 3: it widens contents to write/);
});

test('coordinator, 4 Nov 08:13: only plain lines reach the reader', () => {
  const P = 'on: push\npermissions:\n  contents: read\njobs:\n  a:\n    runs-on: x\n';
  for (const [src, re] of [
    [`${P}  # c\r  gate:\r    permissions: write-all\n`, /line break other than \\n \(U\+000D\)/],
    [`${P.replace('jobs:', '# x\r\njobs:')}`, /U\+000D/],
    ['on: push\x85permissions: write-all\x85jobs:\x85  gate:\x85    runs-on: x\n', /U\+0085/],
    [`${P}  # c\u2028  gate:\n`, /U\+2028/],
    [`${P}  # c\u2029  gate:\n`, /U\+2029/],
    [`${P}\ufeff  b:\n    runs-on: x\n`, /byte-order mark \(U\+FEFF\)/],
    [`${P}  b:\n    name: caf\u00e9\n`, /line 8 holds a character outside printable ASCII/],
    [`${P.replace('    runs-on: x', '\u00a0   runs-on: x')}`, /outside printable ASCII/],
  ]) assert.match(workflowRules(src, null, ['test']) || '', re, JSON.stringify(src));
  // A leading BOM is dropped; a non-ASCII line the base's copy holds unchanged is allowed.
  assert.equal(workflowRules(`\ufeff${P}`, null, ['test']), null);
  const base = `# the fleet \u2014 its images\n${P}`;
  assert.equal(workflowRules(`${base}    timeout-minutes: 5\n`, base, ['test']), null);
  assert.match(workflowRules(`${base}    # new \u2014 line\n`, base, ['test']) || '', /line 8 holds a character outside printable ASCII/);
});

test('coordinator, 4 Nov 08:13: a take-in tip does not mark a direct commit as earlier work', () => {
  // A direct post-setup commit D, then a job whose start row names D as its take-in tip.
  const r = product({ ledger: ['m0'], steps: [
    { via: 'direct', files: { '.github/workflows/regression.yml': REGRESSION(' site') } },
    { via: 'job', id: 'm0', files: (d) => ({ 'process/metrics/m0.jsonl': JSON.stringify({ event: 'start', take_in: { tip: d } }) + '\n' }) },
  ] });
  assert.throws(close(r).go, /regression\.yml: rule 1: it was changed by [0-9a-f]{10}, a direct commit on tranche/);
});

test('coordinator, 4 Nov 08:13: a job the base\'s copy defines byte for byte is exempt from rule 2', () => {
  const base = 'on: push\npermissions:\n  contents: read\njobs:\n  smoke:\n    runs-on: x\n';
  assert.equal(workflowRules(`${base}  other:\n    runs-on: y\n`, base, ['smoke']), null);
  assert.match(workflowRules(base.replace('runs-on: x', 'runs-on: z'), base, ['smoke']) || '', /rule 2: it defines a job smoke/);
  assert.match(workflowRules(`${base}  gate:\n    runs-on: y\n`, base, ['smoke']) || '', /rule 2: it defines a job gate/);
});
