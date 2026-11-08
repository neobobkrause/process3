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
import { workflowShapes } from '../lib/workflows.mjs';
import { readFileSync } from 'node:fs';
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
        for pkg in app-plane pdf-worker${extra}; do echo $pkg; done
        echo done
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
    prs.set(n, { number: n, merged: true, merge_commit_sha: m, base: { ref: 'tranche' }, head: { ref: branch, sha: tip, repo: { full_name: 'o/r' } }, user: { login: 'acmewidget' } });
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
      comments: (s, n) => r.comments.get(n) || [],
      verify: (s, row, ctx) => row.verified === true && r.prs.get(ctx.pr)?.head.sha === row.sha && ctx.baseRef === 'tranche' && ctx.merged?.branch === r.prs.get(ctx.pr)?.head.ref,
      requiredChecks: () => rules,
      checkRuns: () => [{ status: 'completed', conclusion: 'success', started_at: '2026-11-04T06:00:00Z' }],
      repo: processRepo(r.root),
      lookup: (args) => (owned && args[1].split('/').pop() === owned
        ? { author: { login: DEFAULTS.approvals.owner }, committer: { login: 'web-flow' }, commit: { verification: { verified: true } } }
        : { author: { login: 'acmewidget' }, committer: { login: 'acmewidget' }, commit: { verification: { verified: false } } }),
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
  // A job merge whose gate was red.
  const job = product({ ledger: ['m0'], steps: [{ via: 'job', id: 'm0', red: true, files: { '.github/workflows/regression.yml': REGRESSION(' site') } }] });
  assert.throws(close(job).go, /rule 1: .*is PR 10's merge, but the newest gate run on its merged result/);
});

test('process-gate.yml must still be the pin\'s own shim at a close (rule 4); plain pull requests into the tranche stay shim-only', () => {
  const r = product({ steps: [{ via: 'plain', files: { '.github/workflows/process-gate.yml': SHIM + '# edited\n' } }] });
  assert.throws(close(r).go, /process-gate\.yml is not the process's own shim at aaaaaaaaaa \(rule 4\)/);
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

test('coordinator, 4 Nov 08:13: a take-in tip does not mark a direct commit as earlier work', () => {
  // A direct post-setup commit D, then a job whose start row names D as its take-in tip.
  const r = product({ ledger: ['m0'], steps: [
    { via: 'direct', files: { '.github/workflows/regression.yml': REGRESSION(' site') } },
    { via: 'job', id: 'm0', files: (d) => ({ 'process/metrics/m0.jsonl': JSON.stringify({ event: 'start', take_in: { tip: d } }) + '\n' }) },
  ] });
  assert.throws(close(r).go, /regression\.yml: rule 1: it was changed by [0-9a-f]{10}, a direct commit on tranche/);
});

// The copy's two real diffs (the first product's main 0dea5a6e against tranche 3e095aa5).
const FIX = (n) => readFileSync(join(import.meta.dirname, 'fixtures', 'close-workflows', n), 'utf8');
const shape = (head, base) => workflowShapes(head, base);
const NONE = /rule 3: the hunk at base line \d+ .* fits no allowed shape/;

test('coordinator, 4 Nov 08:24: the copy\'s two real workflow diffs fit the allowed shapes', () => {
  assert.equal(shape(FIX('tranche-container-images.yml'), FIX('main-container-images.yml')), null, 'S2 paths, S3 a matrix row');
  assert.equal(shape(FIX('tranche-regression.yml'), FIX('main-regression.yml')), null, 'S1 inside run blocks, comments included');
  assert.equal(shape(FIX('main-regression.yml'), FIX('main-regression.yml')), null, 'no change');
});

test('coordinator, 4 Nov 08:24: every bypass of the four review rounds fits no shape', () => {
  const B = REGRESSION();
  const add = (after, lines) => B.replace(after, `${after}${lines}`);
  for (const head of [
    B + '  gate:\n    runs-on: x\n',
    B.replace('permissions:\n  contents: read\n', 'permissions:\n  contents: write\n'),
    B.replace('on:\n  workflow_dispatch:\n', 'on:\n  pull_request_target:\n'),
    B.replace('on:\n  workflow_dispatch:\n', 'on:\n- workflow_dispatch\n- "pull_request_\\x74arget"\n'),
    B.replace('jobs:\n', '"j\\x6fbs":\n  build:\n    permissions: write-all\njobs:\n'),
    add('    runs-on: ubuntu-latest\n', '    name: >-\n      gate\n'),
    add('    runs-on: ubuntu-latest\n', '    strategy:\n      matrix:\n        os: [ubuntu-latest]\n'),
    add('    runs-on: ubuntu-latest\n', '    !!str permissions: write-all\n'),
    add('    runs-on: ubuntu-latest\n', '    env:\n      X: "1\n    permissions: {}\n    zz: "\n'),
    '{on: push, permissions: write-all, jobs: {gate: {runs-on: ubuntu-latest}}}\n',
    add('    runs-on: ubuntu-latest\n', '    # c\x85    permissions: write-all\n'),
  ]) assert.match(shape(head, B) || '', /rule 3: /, head);
  // A new or removed workflow fits no shape.
  assert.match(shape(B, null), /rule 3: it is a new workflow/);
});

test('coordinator, 4 Nov 08:24: S1 holds only lines inside an existing run block', () => {
  const B = REGRESSION();
  const inside = (l) => B.replace('        set -euo pipefail\n', `        set -euo pipefail\n${l}`);
  assert.equal(shape(inside('        echo more\n'), B), null);
  assert.equal(shape(inside('          deeper: is still script\n'), B), null);
  assert.equal(shape(inside('\n'), B), null);
  // A line less deep than the block's first line would end it; one at the step's level is a key.
  assert.match(shape(inside('      permissions: write-all\n'), B) || '', NONE);
  assert.match(shape(inside('       x\n'), B) || '', NONE);
  // After the block's last line, or before its first, is outside it.
  assert.match(shape(B.replace('        echo done\n', '        echo done\n        echo after\n'), B) || '', NONE);
  assert.match(shape(B.replace('    - run: |\n', '    - run: |\n        echo first\n'), B) || '', NONE);
  // Not plain ASCII, or a tab.
  assert.match(shape(inside('        echo caf\u00e9\n'), B) || '', /outside printable ASCII/);
  assert.match(shape(inside('        \techo\n'), B) || '', NONE);
  // A run block with an explicit indentation indicator is not one S1 reads.
  const ind = B.replace('    - run: |\n', '    - run: |2\n');
  assert.match(shape(ind.replace('        set -euo pipefail\n', '        set -euo pipefail\n        x\n'), ind) || '', NONE);
});

test('coordinator, 4 Nov 08:24: S2 holds only quoted paths inside an existing multi-line paths list', () => {
  const B = IMAGES();
  const ins = (l) => B.replace('    paths: ["agent-runner/Dockerfile",\n', `    paths: ["agent-runner/Dockerfile",\n${l}`);
  assert.equal(shape(ins('            "reader/src/**",\n'), B), null);
  assert.equal(shape(ins('            "a/b", "c/*.json",\n'), B), null);
  for (const l of ['            "a: b",\n', '            "a{b}",\n', '            "a\\"b",\n', '            a/b,\n', '            "a/b"], other: [\n', '        "a/b",\n'])
    assert.match(shape(ins(l), B) || '', NONE, l);
  // Not into branches (it would widen where a write token runs), and not after the list.
  const br = B.replace('    branches: ["dist/cut-*"]\n', '    branches: ["dist/cut-*",\n               "x"]\n');
  assert.match(shape(br.replace('               "x"]\n', '               "main",\n               "x"]\n'), br) || '', NONE);
  assert.match(shape(B.replace('  workflow_dispatch:\n', '            "x",\n  workflow_dispatch:\n'), B) || '', NONE);
});

test('coordinator, 4 Nov 08:24: S3 holds only a matrix row with a sibling row\'s keys', () => {
  const B = IMAGES();
  const row = '          - { name: agent-runner, context: agent-runner }';
  const plus = (l) => B.replace(`${row}\n`, `${row}\n${l}`);
  assert.equal(shape(plus('          - { context: b, name: a }\n'), B), null);
  assert.match(shape(plus('          - { name: a, context: b, run: c }\n'), B) || '', NONE);
  assert.match(shape(plus('          - { name: a }\n'), B) || '', NONE);
  assert.match(shape(plus('          - { name: a, context: "b c" }\n'), B) || '', NONE);
  assert.match(shape(plus('          - { name: a, context: ${{ x }} }\n'), B) || '', NONE);
  assert.match(shape(plus('        - { name: a, context: b }\n'), B) || '', NONE);
  // A hunk that mixes a row with any other line.
  assert.match(shape(plus('          - { name: a, context: b }\n    permissions: write-all\n'), B) || '', NONE);
});

test('coordinator, 4 Nov 08:24: through mergePlain, a shape-breaking change refuses the close, naming the file and the hunk', () => {
  const r = product({ steps: [{ via: 'plain', files: { '.github/workflows/regression.yml': REGRESSION() + '  gate:\n    runs-on: x\n' } }] });
  assert.throws(close(r).go, /changes \.github\/workflows\/regression\.yml: rule 3: the hunk at base line \d+ .*fits no allowed shape/);
  const n = product({ steps: [{ via: 'plain', files: { '.github/workflows/new.yml': 'on: push\n' } }] });
  assert.throws(close(n).go, /new\.yml: rule 3: it is a new workflow/);
  // A pre-Process3 edit is judged by the shapes too.
  const pre = product({ pre: [{ '.github/workflows/regression.yml': REGRESSION() + '  gate:\n    runs-on: x\n' }] });
  assert.throws(close(pre, { owned: pre.setAt }).go, /regression\.yml: rule 3: .*fits no allowed shape/);
  const ok = product({ pre: [{ '.github/workflows/regression.yml': REGRESSION(' site') }] });
  assert.equal(close(ok, { owned: ok.setAt }).go().merged, true);
  assert.throws(close(ok).go, /regression\.yml: rule 1: it was changed by [0-9a-f]{10}, a direct commit on tranche/);
});

test('the rule 1 gate checks: a PR whose gate ran on its own process-gate.yml certifies nothing', () => {
  const fake = { '.github/workflows/process-gate.yml': 'name: fake\non: pull_request\n' };
  const p = product({ steps: [{ via: 'plain', files: { ...fake, '.github/workflows/regression.yml': REGRESSION(' site') } }, { via: 'plain', files: { '.github/workflows/process-gate.yml': SHIM } }] });
  assert.throws(close(p).go, /regression\.yml: rule 1: .*PR 10's merge, but [0-9a-f]{10}, which its gate ran on, does not hold the pin's own process-gate\.yml/);
  const j = product({ ledger: ['m0'], steps: [{ via: 'job', id: 'm0', files: { ...fake, '.github/workflows/regression.yml': REGRESSION(' site') } }, { via: 'plain', files: { '.github/workflows/process-gate.yml': SHIM } }] });
  assert.throws(close(j).go, /regression\.yml: rule 1: .*PR 10's merge, but [0-9a-f]{10}, which its gate ran on/);
});

test('plain text only: line breaks other than \\n, a BOM past the start, new non-ASCII lines are refused', () => {
  const B = REGRESSION();
  const inside = (l) => B.replace('        set -euo pipefail\n', `        set -euo pipefail\n${l}`);
  for (const [l, re] of [['        a\r\n', /U\+000D/], ['        a\u2028\n', /U\+2028/], ['        a\u2029\n', /U\+2029/], ['        a\x85\n', /U\+0085/], ['        \ufeffa\n', /byte-order mark/]])
    assert.match(shape(inside(l), B) || '', re, JSON.stringify(l));
  assert.equal(shape(`\ufeff${inside('        a\n')}`, B), null);
});
