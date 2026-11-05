// The tranche into main (PR 89's report, 4 Nov): the gate runs only the suites of modules with a
// file its job merges did not gate; every other file names the job PR whose gate tested it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gate } from '../lib/gate.mjs';
import { BOT, GATE, block } from '../lib/github.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const MAIN_PR = 900;
const testOf = (id, v) => `import test from 'node:test'; import a from 'node:assert'; import { x } from '../../src/${id}/index.mjs';\ntest('x', () => a.equal(x, ${v}));\n`;

// main holds n modules; the tranche merges one job per module, as merge does: the job branch
// is the tranche plus the change, plus its merge row; the tranche merges it with --no-ff under
// "Merge job PR <n>". Each job's PR has a green gate row on that merged result, unless `red`.
function product(n, { red = [], unverified = [], uses = {}, over = {} } = {}) {
  const ids = Array.from({ length: n }, (_, i) => `m${i}`);
  const files = {};
  for (const id of ids) {
    files[`process/ledger/${id}.json`] = entry(id, { status: { state: 'WORKING' }, ...(uses[id] ? { uses: uses[id] } : {}), ...(over[id] || {}) });
    files[`src/${id}/index.mjs`] = 'export const x = 1;\n';
    files[`test/${id}/x.test.mjs`] = testOf(id, 1);
  }
  const root = makeRepo(files);
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: root });
  const prs = new Map();
  const comments = new Map();
  ids.forEach((id, i) => {
    const pr = i + 1;
    const onto = git(['rev-parse', 'HEAD'], { cwd: root });
    git(['checkout', '-q', '-b', `job/${id}`], { cwd: root });
    commit(root, { [`src/${id}/index.mjs`]: 'export const x = 2;\n', [`test/${id}/x.test.mjs`]: testOf(id, 2) });
    const tip = commit(root, { [`process/metrics/${id}.jsonl`]: JSON.stringify({ row: 'merge', pr }) + '\n' });
    git(['checkout', '-q', 'tranche'], { cwd: root });
    git(['merge', '-q', '--no-ff', `job/${id}`, '-m', `Merge job PR ${pr}`], { cwd: root });
    const m = git(['rev-parse', 'HEAD'], { cwd: root });
    prs.set(pr, { number: pr, merged: true, merge_commit_sha: m, base: { ref: 'tranche' }, head: { ref: `job/${id}`, sha: tip, repo: { full_name: 'o/r' } }, user: { login: 'civicsmith' } });
    const ok = !red.includes(id);
    const row = { sha: tip, base: onto, run_id: 100 + pr, trigger: 'code', scope: [id], suite: ok ? 'pass' : 'fail', ok, findings: ok ? 0 : 1, verified: !unverified.includes(id) };
    comments.set(pr, [{ id: pr, body: block(GATE, { runs: [row] }), user: { login: BOT } }]);
  });
  const io = {
    getPR: (s, n) => (n === MAIN_PR ? { draft: false, user: { login: 'neobobkrause' } } : prs.get(n)),
    prsFromBranch: (s, b) => [...prs.values()].filter((x) => x.head.ref === b),
    baseEverChanged: () => false,
    comments: (s, n) => comments.get(n) || [],
    addComment: () => ({}),
    verify: (s, r, ctx) => r.verified === true && prs.get(ctx.pr)?.head.sha === r.sha && ctx.baseRef === 'tranche',
  };
  return { root, base, ids, prs, comments, io };
}
const run = (p, over = {}) => gate(p.root, { base: p.base, head: git(['rev-parse', 'tranche'], { cwd: p.root }), branch: 'tranche', pr: MAIN_PR, slug: 'o/r', io: p.io, log: quiet, ...over });

test('a tranche into main with 40 modules, each through a gated job merge, runs no suite again and names each job PR', () => {
  const p = product(40);
  const t = Date.now();
  const r = run(p);
  assert.equal(r.findings.length, 0, JSON.stringify(r.findings));
  assert.deepEqual([r.run.trigger, r.run.scope, r.run.suite, r.run.uncovered], ['code', [], 'skipped', 0]);
  assert.equal(r.run.through.length, 40);
  assert.deepEqual(r.run.through.map((x) => [x.pr, x.id, x.files]), p.ids.map((id, i) => [i + 1, id, 2]));
  // Well inside the gate cap: the walk and the checks, no suite.
  assert.ok(Date.now() - t < 60000);
});

test('a module file not covered by a job PR still gets its suite run', () => {
  const p = product(3);
  // A direct commit on the tranche after m1's job merge (a plain PR or a conflict resolution).
  git(['checkout', '-q', 'tranche'], { cwd: p.root });
  commit(p.root, { 'src/m1/index.mjs': 'export const x = 3;\n' });
  const r = run(p);
  assert.deepEqual(r.run.scope, ['m1']);
  assert.equal(r.run.suite, 'fail', 'm1\'s suite ran on the tranche as it is, and caught x = 3');
  assert.deepEqual(r.run.through.map((x) => x.id), ['m0', 'm1', 'm2'], 'm1\'s test file is still the job\'s');
  assert.equal(r.run.uncovered, 1);
});

test('a job PR whose gate was red at merge, or whose row is not verified, does not count', () => {
  const p = product(3, { red: ['m0'], unverified: ['m2'] });
  const r = run(p);
  assert.deepEqual(r.run.scope, ['m0', 'm2']);
  assert.equal(r.run.suite, 'pass');
  assert.deepEqual(r.run.through.map((x) => x.id), ['m1']);
});

test('a newer red row on the merged result outweighs an older green one', () => {
  const p = product(2);
  const pr = p.prs.get(1);
  const red = { sha: pr.head.sha, base: p.base, run_id: 999, trigger: 'code', scope: ['m0'], suite: 'fail', ok: false, findings: 1, verified: true };
  p.comments.get(1).push({ id: 50, body: block(GATE, { runs: [red] }), user: { login: BOT } });
  assert.deepEqual(run(p).run.scope, ['m0']);
});

test('a job merge that is not the gated merged result, or a commit that only borrows the title, does not count', () => {
  // A merge whose tree differs from the job head it names (a resolution or an extra change).
  const p = product(2);
  git(['checkout', '-q', 'tranche'], { cwd: p.root });
  git(['checkout', '-q', '-b', 'job/m0-again'], { cwd: p.root });
  const head = commit(p.root, { 'process/metrics/m0.jsonl': '{"row":"merge","pr":1}\n{"row":"note"}\n' });
  git(['checkout', '-q', 'tranche'], { cwd: p.root });
  git(['merge', '-q', '--no-ff', '--no-commit', 'job/m0-again'], { cwd: p.root });
  commit(p.root, { 'src/m0/index.mjs': 'export const x = 2; // touched in the merge\n' }, 'Merge job PR 1');
  const r = run(p);
  assert.deepEqual(r.run.scope, ['m0']);
  assert.ok(head);

  // A plain commit titled as a job merge.
  const q = product(2);
  git(['checkout', '-q', 'tranche'], { cwd: q.root });
  commit(q.root, { 'src/m1/index.mjs': 'export const x = 2; // forged\n' }, 'Merge job PR 2');
  assert.deepEqual(run(q).run.scope, ['m1']);
});

// Review 1 of PR 92: a module's gate tested it with its providers as they were at its merge.
test('a module whose provider (at any depth) changed after its job merge runs again; one merged after its providers does not', () => {
  // Jobs merge in order m0..m4. m0 uses m2, merged after m0: m0 runs. m3 uses m1, and m4 uses m3:
  // each merged after its providers, so neither runs.
  const p = product(5, { uses: { m0: ['m2'], m3: ['m1'], m4: ['m3'] } });
  assert.deepEqual(run(p).run.scope, ['m0']);
  // A provider two steps down: m0 uses m1, m1 uses m3; m3 merged after m0 and m1.
  const q = product(4, { uses: { m0: ['m1'], m1: ['m3'] } });
  assert.deepEqual(run(q).run.scope, ['m0', 'm1']);
});

test('a file in two modules\' paths is not covered by one module\'s job', () => {
  // m1's paths also hold m0's source: m0's job merge does not cover src/m0/ for m1.
  const p = product(2, { over: { m1: { paths: ['src/m1/', 'src/m0/'] } } });
  assert.deepEqual(run(p).run.scope, ['m0', 'm1']);
});

// A control: only the tranche's own pull request is judged by its job merges.
test('a pull request from any branch but the tranche runs every module it touches', () => {
  const p = product(2);
  const r = run(p, { branch: 'bob/other' });
  assert.deepEqual(r.run.scope, ['m0', 'm1']);
  assert.equal(r.run.through, undefined);
});

// The copy, 4 Nov (registers PR 86, run 41778833434; site PR 79, run 41779185745): once a job PR
// merges, GitHub lists no pull request on its gate runs. The cover binds the run to the merged PR
// by what GitHub keeps: its branch, this repository, the event, green, the PR's head (or an earlier
// commit of it), a base on the tranche, and the run's own artifact holding the same row.
import { verifyRow } from '../lib/github.mjs';
function merged(n, edit = () => {}) {
  const p = product(n);
  const runs = new Map();
  const arts = new Map();
  for (const [pr, cs] of p.comments) {
    const row = gateRunsOf(cs)[0];
    delete row.verified;
    cs[0].body = block(GATE, { runs: [row] });
    runs.set(row.run_id, { path: '.github/workflows/process-gate.yml', head_sha: row.sha, status: 'completed', conclusion: 'success', event: 'pull_request', pull_requests: [], head_branch: p.prs.get(pr).head.ref, head_repository: { full_name: 'o/r' } });
    arts.set(row.run_id, { ...row, minutes: 1 });
  }
  const live = { getRun: (s, id) => runs.get(id) || null, runArtifactRow: (s, id) => arts.get(id) || null };
  p.io.verify = (s, r, ctx) => verifyRow(s, r, ctx, live);
  edit({ p, runs, arts });
  return p;
}
const gateRunsOf = (cs) => cs.flatMap((c) => JSON.parse(c.body.match(/\{[\s\S]*\}/)[0]).runs);

test('a merged job PR whose gate run lists no pull request is covered', () => {
  const r = run(merged(3));
  assert.equal(r.findings.length, 0, JSON.stringify(r.findings));
  assert.deepEqual(r.run.scope, []);
  assert.deepEqual(r.run.through.map((x) => x.pr), [1, 2, 3]);
});

test('a run on another branch, repository, event or commit, or not green, does not cover its module', () => {
  for (const [what, change] of [
    ['another branch', (x) => { x.head_branch = 'job/m2'; }],
    ['a fork', (x) => { x.head_repository = { full_name: 'fork/r' }; }],
    ['a push', (x) => { x.event = 'push'; }],
    ['another commit', (x) => { x.head_sha = 'f'.repeat(40); }],
    ['not green', (x) => { x.conclusion = 'failure'; }],
    ['another workflow', (x) => { x.path = '.github/workflows/mine.yml'; }],
  ]) {
    const p = merged(3, ({ runs }) => change(runs.get(102)));
    assert.deepEqual(run(p).run.scope, ['m1'], what);
  }
  // A run that still lists pull requests must list this one, into the tranche.
  const q = merged(2, ({ runs }) => { runs.get(102).pull_requests = [{ number: 7, base: { ref: 'tranche' } }]; });
  assert.deepEqual(run(q).run.scope, ['m1']);
});

// Review of PR 94: a second PR from job/m1 into a branch whose own workflow is a stub could upload
// any row in a green run on the branch. While any PR from the branch is into another base, or the
// list cannot be read, the branch binds nothing.
test('a job branch that ever had a pull request into another base, or whose pull requests cannot be read, covers nothing', () => {
  const p = merged(3);
  const list = p.io.prsFromBranch;
  p.io.prsFromBranch = (s, b) => (b === 'job/m1' ? [...list(s, b), { number: 77, base: { ref: 'evil' }, head: { ref: b } }] : list(s, b));
  assert.deepEqual(run(p).run.scope, ['m1']);
  // A second PR into the tranche itself (a restarted job) is not a reason to refuse.
  p.io.prsFromBranch = (s, b) => (b === 'job/m1' ? [...list(s, b), { number: 78, base: { ref: 'tranche' }, head: { ref: b } }] : list(s, b));
  assert.deepEqual(run(p).run.scope, []);
  p.io.prsFromBranch = (s, b) => (b === 'job/m2' ? null : list(s, b));
  assert.deepEqual(run(p).run.scope, ['m2']);
  p.io.prsFromBranch = (s, b) => (b === 'job/m0' ? [] : list(s, b));
  assert.deepEqual(run(p).run.scope, ['m0'], 'a list that lacks the merged PR itself');
});

// Confirming review of PR 94: the list shows a PR's base as it is now. A PR from job/m1 opened into
// a stub's branch and then retargeted to the tranche, or a merged PR that was, covers nothing; nor
// does a PR whose history cannot be read.
test('a job branch with a pull request whose base was ever changed, or whose history cannot be read, covers nothing', () => {
  const p = merged(3);
  const list = p.io.prsFromBranch;
  p.io.prsFromBranch = (s, b) => (b === 'job/m1' ? [...list(s, b), { number: 77, base: { ref: 'tranche' }, head: { ref: b } }] : list(s, b));
  p.io.baseEverChanged = (s, x) => x === 77;
  assert.deepEqual(run(p).run.scope, ['m1'], 'a second PR retargeted to the tranche');
  p.io.baseEverChanged = (s, x) => x === 3;
  assert.deepEqual(run(p).run.scope, ['m2'], 'the merged PR itself retargeted');
  p.io.baseEverChanged = (s, x) => (x === 1 ? null : false);
  assert.deepEqual(run(p).run.scope, ['m0'], 'an unread history');
  p.io.baseEverChanged = () => false;
  assert.deepEqual(run(p).run.scope, []);
});

test('a row whose fields do not match the PR, the module or its artifact does not cover it', () => {
  const swap = (p, pr, f) => {
    const cs = p.comments.get(pr);
    const row = f(gateRunsOf(cs)[0]);
    cs[0].body = block(GATE, { runs: [row] });
  };
  // A base that is not on the tranche (another branch's commit).
  // The run's artifact agrees: only the base's place in history refuses it.
  const p = merged(3, ({ p, arts }) => {
    git(['checkout', '-q', '-b', 'side', p.base], { cwd: p.root });
    const off = commit(p.root, { 'side.txt': 'x' });
    git(['checkout', '-q', 'tranche'], { cwd: p.root });
    swap(p, 2, (r) => ({ ...r, base: off }));
    arts.get(102).base = off;
  });
  assert.deepEqual(run(p).run.scope, ['m1'], 'base off the tranche');
  // The artifact ran another module than the comment claims.
  const q = merged(3, ({ arts }) => { arts.get(102).scope = ['m0']; });
  assert.deepEqual(run(q).run.scope, ['m1'], 'scope differs from the artifact');
});

test('a merged PR whose newest row stands on an earlier green run of the PR is covered only when that run is the PR\'s', () => {
  const build = (afterOf) => merged(2, ({ p, runs, arts }) => {
    const head = p.prs.get(2).head.sha;
    const earlier = afterOf(p, head);
    const code = { sha: earlier, base: gateRunsOf(p.comments.get(2))[0].base, run_id: 300, trigger: 'code', scope: ['m1'], suite: 'pass', ok: true, findings: 0 };
    const rec = { ...gateRunsOf(p.comments.get(2))[0], run_id: 301, trigger: 'record-since-green', after: earlier, scope: undefined, suite: 'skipped' };
    delete rec.scope;
    p.comments.set(2, [{ id: 1, body: block(GATE, { runs: [code] }), user: { login: BOT } }, { id: 2, body: block(GATE, { runs: [rec] }), user: { login: BOT } }]);
    for (const r of [code, rec]) {
      runs.set(r.run_id, { ...runs.get(102), head_sha: r.sha });
      arts.set(r.run_id, { ...r });
    }
  });
  assert.deepEqual(run(build((p, head) => git(['rev-parse', `${head}^`], { cwd: p.root }))).run.scope, [], 'the job\'s own earlier commit');
  assert.deepEqual(run(build((p) => {
    git(['checkout', '-q', '-b', 'elsewhere', p.base], { cwd: p.root });
    const c = commit(p.root, { 'src/m1/index.mjs': 'export const x = 2;\n' });
    git(['checkout', '-q', 'tranche'], { cwd: p.root });
    return c;
  })).run.scope, ['m1'], 'a commit not on the PR');
});

test('an expired gate-row artifact makes that module run its suite', () => {
  const p = merged(3, ({ arts }) => { arts.delete(103); });
  const r = run(p);
  assert.deepEqual(r.run.scope, ['m2']);
  assert.equal(r.run.suite, 'pass');
  assert.deepEqual(r.run.through.map((x) => x.pr), [1, 2]);
});

// The tranche into main (build/main-gate-2): the gate workflow's pin step, run as the workflow
// runs it. The tranche's pin judges only when process3's own main or tranche shows it descends
// from main's; anything else keeps the base's pin.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const SHIM = readFileSync(join(import.meta.dirname, '..', '..', 'shims', 'process-gate.yml'), 'utf8');
const pinStep = () => {
  const gateJob = SHIM.slice(SHIM.indexOf('\n  gate:\n'), SHIM.indexOf('\n  post:\n'));
  const step = gateJob.slice(gateJob.indexOf("- name: the base's process pin"));
  const lines = step.slice(step.indexOf('run: |\n') + 7).split('\n');
  const body = [];
  for (const l of lines) { if (l.trim() && !l.startsWith('          ')) break; body.push(l.slice(10)); }
  return body.join('\n');
};
function pinWorld() {
  // process3: main at a; tranche at b (after a); a side branch at s (after b), never merged.
  const proc = makeRepo({ 'tool/p3.mjs': '1' });
  const a = git(['rev-parse', 'HEAD'], { cwd: proc });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: proc });
  const b = commit(proc, { 'tool/p3.mjs': '2' });
  git(['checkout', '-q', '-b', 'side'], { cwd: proc });
  const s = commit(proc, { 'tool/p3.mjs': 'weak' });
  git(['checkout', '-q', '-b', 'other', a], { cwd: proc });
  const o = commit(proc, { 'tool/p3.mjs': 'other' });
  git(['checkout', '-q', 'main'], { cwd: proc });
  // The product: main pins a; the tranche pins whatever the case says.
  const prod = makeRepo({ 'process/config.json': JSON.stringify({ tranche: 'tranche', process_repo: `file://${proc}` }) });
  const pinTo = (sha) => { git(['update-index', '--add', '--cacheinfo', `160000,${sha},.process`], { cwd: prod }); git(['commit', '-q', '-m', `pin ${sha.slice(0, 7)}`], { cwd: prod }); return git(['rev-parse', 'HEAD'], { cwd: prod }); };
  const base = pinTo(a);
  const head = (sha) => { git(['checkout', '-q', '-B', 'tranche', base], { cwd: prod }); return pinTo(sha); };
  return { proc, prod, a, b, s, o, base, head };
}
function judgedBy(w, headSha, env = {}) {
  const tmp = mkdtempSync(join(tmpdir(), 'p3-pin-'));
  const out = join(tmp, 'out');
  writeFileSync(out, '');
  const script = join(tmp, 'pin.sh');
  writeFileSync(script, pinStep());
  execFileSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', script], { cwd: w.prod, stdio: 'pipe', env: { ...process.env, RUNNER_TEMP: tmp, GITHUB_OUTPUT: out, BASE: w.base, HEAD_SHA: headSha, HEAD_REF: 'tranche', BASE_REF: 'main', DEFAULT_BRANCH: 'main', SAME_REPO: 'true', ...env } });
  return git(['rev-parse', 'HEAD'], { cwd: join(tmp, 'process3') });
}

test('the tranche into main is judged by the tranche\'s pin only when process3\'s main or tranche shows it descends from main\'s', () => {
  const w = pinWorld();
  const later = w.head(w.b);
  assert.equal(judgedBy(w, later), w.b, 'a later pin on process3\'s tranche');
  for (const [what, env] of [
    ['another branch into main', { HEAD_REF: 'bob/x' }],
    ['the tranche into another base', { BASE_REF: 'release', DEFAULT_BRANCH: 'main' }],
    ['a fork', { SAME_REPO: 'false' }],
  ]) assert.equal(judgedBy(w, later, env), w.a, what);
  assert.equal(judgedBy(w, w.head(w.s)), w.a, 'a descendant only on a process3 side branch');
  // A pin on process3's main only (the tranche was deleted or moved on elsewhere).
  git(['checkout', '-q', 'main'], { cwd: w.proc });
  git(['merge', '-q', '--ff-only', 'side'], { cwd: w.proc });
  git(['branch', '-q', '-f', 'tranche', w.a], { cwd: w.proc });
  assert.equal(judgedBy(w, w.head(w.s)), w.s, 'a descendant on process3\'s main');
  assert.equal(judgedBy(w, w.head(w.o)), w.a, 'a pin on another line, not after main\'s');
  assert.equal(judgedBy(w, w.head('e'.repeat(40))), w.a, 'a pin process3 does not have');
  // An older pin than main's: main pins b; the tranche, cut before, still pins a.
  const v = pinWorld();
  const older = v.head(v.s); // any commit: then the tranche goes back to pinning a
  git(['checkout', '-q', '-B', 'tranche', older], { cwd: v.prod });
  git(['update-index', '--add', '--cacheinfo', `160000,${v.a},.process`], { cwd: v.prod });
  git(['commit', '-q', '-m', 'back to a'], { cwd: v.prod });
  const tip = git(['rev-parse', 'HEAD'], { cwd: v.prod });
  git(['checkout', '-q', '-B', 'main', v.base], { cwd: v.prod });
  git(['update-index', '--add', '--cacheinfo', `160000,${v.b},.process`], { cwd: v.prod });
  git(['commit', '-q', '-m', 'main at b'], { cwd: v.prod });
  v.base = git(['rev-parse', 'HEAD'], { cwd: v.prod });
  assert.equal(judgedBy(v, tip), v.b, 'an older pin never judges');
});
