// The pass (P7, Bob's Keep and Drop, 3 Nov, kept shorter: "A no-judgment change across many
// modules is one mechanical pass by a worker in BOB's session while no job runs, with one full
// test run before it is committed."): merge --plain --pass lands a plain pull request that changes
// any modules' files while no live job holds them, on a green gate that ran each touched module's
// whole suite as a pass; its merge record names the pass. Its first use is the
// dist/ pass at the pause (BOB's survey, message 257 on the copy).
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { gate as gateRun, gateComment } from '../lib/gate.mjs';
import { BOT, GATE, block, parseBlock } from '../lib/github.mjs';
import { mergePlain, reviewRounds } from '../lib/merge.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const PASS = "import test from 'node:test';\ntest('ok', () => {});\n";
const GEN = "import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';\nmkdirSync('src/alpha/dist', { recursive: true });\nwriteFileSync('src/alpha/dist/alpha.bundle.json', JSON.stringify({ from: readFileSync('src/alpha/index.mjs', 'utf8') }) + '\\n');\n";
const BUNDLE = 'src/alpha/dist/alpha.bundle.json';
const fresh = (src) => JSON.stringify({ from: src }) + '\n';
const CONFIG = { generated: [{ paths: [BUNDLE], regenerate: ['node', 'gen.mjs'], verify: ['node', '-e', 'process.exit(0)'] }] };
const REQ = 'src/beta/REQ.md';

function gateIO(comments = []) {
  const state = { comments, genuine: new Set() };
  const key = (r) => `${r.at}|${r.sha}|${r.trigger}`;
  return {
    state,
    io: {
      comments: () => state.comments,
      getPR: () => ({ user: { login: 'acmewidget' }, base: { ref: 'tranche' } }),
      addComment: (s, n, body) => {
        state.comments.push({ id: state.comments.length + 1, body, user: { login: BOT } });
        for (const r of parseBlock(body, GATE)?.runs || []) state.genuine.add(key(r));
        return {};
      },
      verify: (s, r) => state.genuine.has(key(r)),
    },
  };
}

// Two modules, alpha (with a committed generated manifest) and beta (its requirements file in
// its paths), and BOB's pass branch holding `files`.
function product(files, { jobs = {}, branch = 'pass/dist' } = {}) {
  const root = makeRepo({
    'process/config.json': CONFIG,
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'COMPLETE' } }),
    'process/ledger/beta.json': entry('beta', { requirements: REQ, status: { state: 'COMPLETE' } }),
    'gen.mjs': GEN,
    'src/alpha/index.mjs': 'export const x = 1;\n',
    [BUNDLE]: fresh('export const x = 1;\n'),
    'src/beta/index.mjs': 'export const y = 1;\n',
    [REQ]: '# beta\n\n**R1** the first.\n',
    'test/alpha/x.test.mjs': PASS,
    'test/beta/y.test.mjs': `import test from 'node:test';\nimport { readFileSync } from 'node:fs';\ntest('reads', () => readFileSync('${REQ}'));\n`,
    '.github/workflows/process-gate.yml': 'on: pull_request\n',
  });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  // Job branches on origin, each with its entry's state.
  for (const [id, state] of Object.entries(jobs)) {
    git(['checkout', '-q', '-b', `job/${id}`, 'tranche'], { cwd: root });
    commit(root, { [`process/ledger/${id}.json`]: entry(id, { ...(id === 'beta' ? { requirements: REQ } : {}), status: { state } }), [`src/${id}/job.mjs`]: 'export {};\n' });
    git(['push', '-q', 'origin', `job/${id}`], { cwd: root });
  }
  git(['checkout', '-q', '-b', branch, 'tranche'], { cwd: root });
  const sha = commit(root, files);
  git(['push', '-q', 'origin', 'main', 'tranche', branch], { cwd: root });
  return { root, base, sha, branch };
}
const gateOn = (p, g) => gateRun(p.root, { base: p.base, head: p.sha, branch: p.branch, pr: 260, slug: 'o/r', io: g.io, log: quiet });
const posted = (p, g) => { const r = gateOn(p, g); g.io.addComment('o/r', 260, gateComment(r.run)); git(['checkout', '-q', '-f', p.branch], { cwd: p.root }); git(['clean', '-qfd'], { cwd: p.root }); git(['checkout', '-q', 'main'], { cwd: p.root }); return r; };

function plainIO(p, comments, verify, over = {}) {
  const calls = { merged: null };
  const pr = () => ({ state: 'open', draft: false, mergeable: true, base: { ref: 'tranche', repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: p.branch, sha: p.sha, repo: { full_name: 'o/r' } } });
  const green = { id: 1, status: 'completed', conclusion: 'success', started_at: '2026-11-06T01:00:00Z' };
  return {
    calls,
    io: {
      getPR: pr, requiredChecks: () => ({ checks: [{ context: 'gate' }] }), checkRuns: () => [green], checkRun: () => green,
      comments: () => comments, verify, repo: { released: () => false, shim: () => null, descends: () => false },
      openPRs: () => [],
      mergePR: (slug, n, sha, o) => { calls.merged = { sha, ...o }; return { merged: true, sha: 'm'.repeat(40) }; },
      ...over,
    },
  };
}
const WHY = 'dist/ pass: untrack the bundles, build them before use (survey n=257)';
const q = { slug: 'o/r', log: quiet, pass: WHY };
const SRC2 = { 'src/alpha/index.mjs': 'export const x = 2;\n', [BUNDLE]: fresh('export const x = 2;\n'), 'src/beta/index.mjs': 'export const y = 2;\n' };

test('a pass across two modules: the gate runs both suites as a pass, and merge --plain --pass lands it, its record naming the pass', () => {
  const p = product(SRC2);
  const g = gateIO();
  const r = posted(p, g);
  assert.deepEqual(r.findings, []);
  assert.equal(r.run.pass, true);
  assert.equal(r.run.trigger, 'code');
  assert.deepEqual([...r.run.scope].sort(), ['alpha', 'beta']);
  // The generator and its output changed together: compared, not refused as "other files" (a pass).
  assert.equal(r.run.refresh.result, 'identical');
  // Without --pass, the same pull request is still a job's work.
  assert.throws(() => mergePlain(p.root, 260, { slug: 'o/r', log: quiet, reviewed: 'r', rounds: 1, io: plainIO(p, g.state.comments, g.io.verify).io }), /changes module files, which go through a job: .*from a pass\/<name> branch, merge --plain --pass "<what and why>" \(P7\)/);
  const f = plainIO(p, g.state.comments, g.io.verify);
  const out = mergePlain(p.root, 260, { ...q, io: f.io });
  assert.equal(out.merged, true);
  assert.deepEqual(out.modules.sort(), ['alpha', 'beta']);
  assert.match(f.calls.merged.message, new RegExp(`^Pass: ${WHY.replace(/[()/]/g, '\\$&')}\nReview rounds: 0$`));
});

test('a pass waits for no live job: an open job pull request, or a job branch WORKING, refuses it; a BLOCKED one alone does not', () => {
  const p = product(SRC2, { jobs: { alpha: 'WORKING', beta: 'BLOCKED' } });
  const g = gateIO();
  posted(p, g);
  assert.throws(() => mergePlain(p.root, 260, { ...q, io: plainIO(p, g.state.comments, g.io.verify).io }), /a pass runs while no job holds its modules \(P7\): alpha \(WORKING on job\/alpha\)$/);
  const open = plainIO(p, g.state.comments, g.io.verify, { openPRs: () => [{ number: 590, head: { ref: 'job/beta' } }] });
  assert.throws(() => mergePlain(p.root, 260, { ...q, io: open.io }), /alpha \(WORKING on job\/alpha\), beta \(job PR 590 is open\)/);
  assert.equal(open.calls.merged, null);
  // Unreadable: refused, not guessed.
  assert.throws(() => mergePlain(p.root, 260, { ...q, io: plainIO(p, g.state.comments, g.io.verify, { openPRs: () => null }).io }), /cannot be read, so whether a job holds alpha, beta is unknown/);
});

test('a COMPLETE job whose pull request merged holds nothing', () => {
  const p = product(SRC2, { jobs: { alpha: 'COMPLETE' } });
  const g = gateIO();
  posted(p, g);
  assert.equal(mergePlain(p.root, 260, { ...q, io: plainIO(p, g.state.comments, g.io.verify).io }).merged, true);
});

test('a pass lands only on the tranche, and is its own record', () => {
  const p = product(SRC2);
  const g = gateIO();
  posted(p, g);
  assert.throws(() => reviewRounds({ pass: WHY, reviewed: 'r', rounds: 1 }), /--pass is its own record/);
  assert.throws(() => reviewRounds({ pass: true }), /--pass needs what the pass changes and why/);
  assert.deepEqual(reviewRounds({ pass: WHY }), { rounds: 0, decision: null });
  const into = plainIO(p, g.state.comments, g.io.verify, { getPR: () => ({ state: 'open', draft: false, mergeable: true, base: { ref: 'work', repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: 'pass/dist', sha: p.sha, repo: { full_name: 'o/r' } } }) });
  git(['push', '-q', 'origin', 'tranche:work'], { cwd: p.root });
  assert.throws(() => mergePlain(p.root, 260, { ...q, io: into.io }), /is into work: a pass lands only on the tranche \(P7\)/);
});

test('a pass needs its gate row: one that did not run every touched module\'s whole suite as a pass is refused', () => {
  const p = product({ 'test/alpha/x.test.mjs': PASS.replace('ok', 'still ok'), 'src/beta/index.mjs': 'export const y = 2;\n' });
  const g = gateIO();
  const r = posted(p, g);
  // Forged or narrowed rows: not verified, or not the pass's whole scope.
  assert.throws(() => mergePlain(p.root, 260, { ...q, io: plainIO(p, g.state.comments, () => false).io }), /is a pass: no green process-gate run on .* ran the whole suites of alpha, beta as a pass \(P7\)/);
  const narrow = { ...r.run, scope: ['alpha'] };
  const io = gateIO();
  io.io.addComment('o/r', 260, gateComment(narrow));
  assert.throws(() => mergePlain(p.root, 260, { ...q, io: plainIO(p, io.state.comments, io.io.verify).io }), /ran the whole suites of alpha, beta as a pass/);
});

test('a pass that changes only a requirements file runs the module\'s whole suite, not only its readers', () => {
  const p = product({ [REQ]: '# beta\n\n**R1** the first, reworded.\n' });
  const g = gateIO();
  const r = posted(p, g);
  assert.equal(r.run.pass, true);
  assert.deepEqual(r.run.scope, ['beta']);
  assert.equal(r.run.requirements_only, undefined);
  assert.equal(mergePlain(p.root, 260, { ...q, io: plainIO(p, g.state.comments, g.io.verify).io }).merged, true);
  // The same change from any other branch is no pass: narrowed to the tests that read the file,
  // as before, and merge --plain --pass refuses it.
  const f = product({ [REQ]: '# beta\n\n**R1** the first, reworded.\n' }, { branch: 'bob/words' });
  const g2 = gateIO();
  const r2 = posted(f, g2);
  assert.equal(r2.run.pass, undefined);
  assert.deepEqual(r2.run.requirements_only, [{ module: 'beta', files: ['test/beta/y.test.mjs'] }]);
  assert.throws(() => mergePlain(f.root, 260, { ...q, io: plainIO(f, g2.state.comments, g2.io.verify).io }), /is from bob\/words: a pass comes from a pass\/<name> branch, which the gate runs as a pass \(P7\)/);
});

test('a job that starts while the pass\'s gate is awaited stops the pass before it lands; one WORKING on the tranche holds it too', () => {
  const p = product(SRC2);
  const g = gateIO();
  posted(p, g);
  let reads = 0;
  const late = plainIO(p, g.state.comments, g.io.verify, { openPRs: () => (++reads > 1 ? [{ number: 601, head: { ref: 'job/alpha' } }] : []) });
  assert.throws(() => mergePlain(p.root, 260, { ...q, io: late.io }), /no job holds its modules \(P7\): alpha \(job PR 601 is open\)/);
  assert.equal(late.calls.merged, null);
  const w = product(SRC2);
  git(['checkout', '-q', 'tranche'], { cwd: w.root });
  commit(w.root, { 'process/ledger/beta.json': entry('beta', { requirements: REQ, status: { state: 'WORKING' } }) });
  git(['push', '-q', 'origin', 'tranche'], { cwd: w.root });
  git(['checkout', '-q', 'main'], { cwd: w.root });
  assert.throws(() => mergePlain(w.root, 260, { ...q, io: plainIO(w, [], () => true).io }), /beta \(WORKING on tranche\)/);
});

test('a pass\'s gate row must be on the base as it is and must not be narrowed to a requirements file\'s readers', () => {
  const p = product({ 'test/alpha/x.test.mjs': PASS.replace('ok', 'still ok'), 'src/beta/index.mjs': 'export const y = 2;\n' });
  const g = gateIO();
  const r = posted(p, g);
  for (const bad of [{ base: 'f'.repeat(40) }, { requirements_only: [{ module: 'beta', files: [] }] }, { pass: undefined }]) {
    const io = gateIO();
    io.io.addComment('o/r', 260, gateComment({ ...r.run, ...bad }));
    assert.throws(() => mergePlain(p.root, 260, { ...q, io: plainIO(p, io.state.comments, io.io.verify).io }), /ran the whole suites of alpha, beta as a pass/, JSON.stringify(bad));
  }
});
