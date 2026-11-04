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
    git(['checkout', '-q', '-b', `job/${id}`], { cwd: root });
    commit(root, { [`src/${id}/index.mjs`]: 'export const x = 2;\n', [`test/${id}/x.test.mjs`]: testOf(id, 2) });
    const tip = commit(root, { [`process/metrics/${id}.jsonl`]: JSON.stringify({ row: 'merge', pr }) + '\n' });
    git(['checkout', '-q', 'tranche'], { cwd: root });
    git(['merge', '-q', '--no-ff', `job/${id}`, '-m', `Merge job PR ${pr}`], { cwd: root });
    const m = git(['rev-parse', 'HEAD'], { cwd: root });
    prs.set(pr, { number: pr, merged: true, merge_commit_sha: m, base: { ref: 'tranche' }, head: { ref: `job/${id}`, sha: tip }, user: { login: 'civicsmith' } });
    const ok = !red.includes(id);
    const row = { sha: tip, base: 'b'.repeat(40), run_id: 100 + pr, trigger: 'code', scope: [id], suite: ok ? 'pass' : 'fail', ok, findings: ok ? 0 : 1, verified: !unverified.includes(id) };
    comments.set(pr, [{ id: pr, body: block(GATE, { runs: [row] }), user: { login: BOT } }]);
  });
  const io = {
    getPR: (s, n) => (n === MAIN_PR ? { draft: false, user: { login: 'neobobkrause' } } : prs.get(n)),
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
  // Well inside the 45 min cap: the walk and the checks, no suite.
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
  const red = { sha: pr.head.sha, base: 'c'.repeat(40), run_id: 999, trigger: 'code', scope: ['m0'], suite: 'fail', ok: false, findings: 1, verified: true };
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
