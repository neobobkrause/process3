// Review triggers (Bob, 4 Nov, about 19:05): a security path changed, or a test deleted or
// loosened, makes a job's merge refuse --no-review; every merge row records what fired and what the
// review found. Run end to end: a real repository and origin, merge() and review brief as BOB runs them.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { merge, reviewMeasures, reviewRounds } from '../lib/merge.mjs';
import { readRows } from '../lib/metrics.mjs';
import { reviewBrief } from '../lib/review.mjs';
import { assertCounts, globRe, matchPath, reviewTriggers, triggerSummary } from '../lib/triggers.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, honestBranch, makeRepo } from './helpers.mjs';

const quiet = () => {};
const TEST_BASE = "import assert from 'node:assert/strict';\ntest('a', () => {\n  assert.equal(f(), 45);\n  assert.ok(g());\n});\n";

// A product whose tranche holds module alpha with a test and a security list; the job branch
// changes them as `job` says. config: the tranche's process/config.json.
function setup(job, config = { review_triggers: { security_paths: ['src/alpha/acts.mjs', 'src/gate/**'] } }) {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha'),
    'process/config.json': config,
    'src/alpha/a.mjs': 'export const f = () => 45;\n',
    'src/alpha/acts.mjs': 'export const ACTS = ["a", "b"];\n',
    'test/alpha/a.test.mjs': TEST_BASE,
    'test/alpha/b.test.mjs': TEST_BASE,
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  job(root);
  const head = commit(root, { 'process/metrics/alpha.jsonl': JSON.stringify({ row: 'attempt', event: 'complete', at: new Date().toISOString() }) + '\n' });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'other.txt': 'tranche moved on' });
  git(['push', '-q', 'origin', 'tranche', 'job/alpha', 'main'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, head };
}

function io(head) {
  const calls = { merged: null };
  return {
    calls,
    io: {
      getPR: () => ({ state: 'open', draft: false, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: 'job/alpha', sha: head } }),
      comments: () => [
        { id: 1, body: block(RECEIPT, { module: 'alpha', attempt: 1, sha: head }), user: { login: 'civicsmith' } },
        { id: 2, body: block(GATE, { runs: [{ sha: head, ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }] }), user: { login: BOT } },
      ],
      checkRun: () => ({ status: 'completed', conclusion: 'success', html_url: 'run' }),
      verify: (slug, r) => r.run_id === 11,
      ...honestBranch([1, 2, 3, 4, 5, 6, 7, 8]),
      mergePR: (slug, n, sha) => { calls.merged = sha; return { merged: true, sha: 'm'.repeat(40) }; },
    },
  };
}

const lastRow = (root) => {
  const tip = git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0];
  git(['checkout', '-q', tip], { cwd: root });
  const r = readRows(root, 'alpha').at(-1);
  git(['checkout', '-q', 'main'], { cwd: root });
  return r;
};
const del = (f) => (root) => git(['rm', '-q', f], { cwd: root });
const reviewed = { reviewed: 'fresh reviewer: 1 fix, applied', rounds: 2, reviewMinutes: '12', reviewCostUsd: '0.84', findings: '1', actedOn: '1' };

test('a job that deletes a test file (PR 174) is refused --no-review, and merges --reviewed with the trigger and measures in its row', () => {
  const { root, head } = setup(del('test/alpha/b.test.mjs'));
  const f = io(head);
  assert.throws(() => merge(root, 5, { slug: 'o/r', io: f.io, noReview: 'small change', log: quiet }),
    /pull request 5 fires the review trigger test \(test files deleted: test\/alpha\/b\.test\.mjs\): --no-review is refused .*review brief 5/);
  assert.equal(f.calls.merged, null, 'nothing merged');
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0], head, 'nothing pushed');
  const r = merge(root, 5, { slug: 'o/r', io: f.io, ...reviewed, log: quiet });
  assert.equal(r.merged, true);
  const row = lastRow(root);
  assert.deepEqual({ triggers: row.triggers, reviewed: row.reviewed, m: row.review_minutes, usd: row.review_usd, f: row.findings, a: row.findings_acted },
    { triggers: ['test'], reviewed: true, m: 12, usd: 0.84, f: 1, a: 1 });
});

test('a job that changes a listed security path (PR 95) is refused --no-review; a change to neither merges --no-review with triggers []', () => {
  const sec = setup((root) => commit(root, { 'src/alpha/acts.mjs': 'export const ACTS = ["a"];\n' }));
  assert.throws(() => merge(sec.root, 6, { slug: 'o/r', io: io(sec.head).io, noReview: 'x', log: quiet }), /fires the review trigger security \(security paths changed: src\/alpha\/acts\.mjs\)/);
  const plain = setup((root) => commit(root, { 'src/alpha/a.mjs': 'export const f = () => 46;\n', 'test/alpha/a.test.mjs': TEST_BASE.replace('45', '46') }));
  assert.equal(merge(plain.root, 7, { slug: 'o/r', io: io(plain.head).io, noReview: 'one constant and its test', log: quiet }).merged, true);
  const row = lastRow(plain.root);
  assert.deepEqual([row.triggers, row.reviewed, row.review_minutes, row.findings], [[], false, null, null]);
});

test('a test that existed at the base losing assertions fires; one changed in place or gaining them does not; a product with no security paths fires none for them', () => {
  const loose = setup((root) => commit(root, { 'test/alpha/a.test.mjs': TEST_BASE.replace('  assert.ok(g());\n', '') }));
  assert.throws(() => merge(loose.root, 8, { slug: 'o/r', io: io(loose.head).io, noReview: 'x', log: quiet }), /test\/alpha\/a\.test\.mjs: 1 hunk removing assertions and adding none/);
  const t = reviewTriggers(loose.root, { base: 'origin/tranche', head: 'origin/job/alpha', entry: entry('alpha'), cfg: {} });
  assert.deepEqual(t.fired, ['test']);
  assert.match(t.hunks, /^-  assert\.ok\(g\(\)\);$/m, 'the exact hunk that fired it');
  const none = setup((root) => commit(root, { 'src/alpha/acts.mjs': 'export const ACTS = [];\n', 'test/alpha/a.test.mjs': TEST_BASE.replace('45', '40') + "test('b', () => { expect(h()).toBe(1); });\n" }), {});
  const n = reviewTriggers(none.root, { base: 'origin/tranche', head: 'origin/job/alpha', entry: entry('alpha'), cfg: { review_triggers: {} } });
  assert.deepEqual([n.fired, n.security_set], [[], false]);
  // A hunk that replaces an assertion with another does not fire; an added skip does.
  const swap = setup((root) => commit(root, { 'test/alpha/a.test.mjs': TEST_BASE.replace('  assert.ok(g());\n', '  assert.equal(g(), true);\n') }));
  assert.deepEqual(reviewTriggers(swap.root, { base: 'origin/tranche', head: 'origin/job/alpha', entry: entry('alpha'), cfg: {} }).fired, []);
  const skip = setup((root) => commit(root, { 'test/alpha/a.test.mjs': TEST_BASE.replace("test('a'", "test.skip('a'") }));
  const k = reviewTriggers(skip.root, { base: 'origin/tranche', head: 'origin/job/alpha', entry: entry('alpha'), cfg: {} });
  assert.deepEqual([k.fired, k.why], [['test'], 'test/alpha/a.test.mjs: 1 skip added']);
});

test('a path git would quote (non-ASCII) still fires both triggers (review of PR 125)', () => {
  const { root } = setup((root) => { commit(root, { 'src/gate/café.mjs': 'x\n', 'test/alpha/é.test.mjs': TEST_BASE }); }, { review_triggers: { security_paths: ['src/gate/**'] } });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  git(['rm', '-q', 'test/alpha/é.test.mjs'], { cwd: root });
  commit(root, { 'src/gate/café.mjs': 'y\n' });
  const t = reviewTriggers(root, { base: 'HEAD~2', head: 'HEAD', entry: entry('alpha'), cfg: { review_triggers: { security_paths: ['src/gate/**'] } } });
  git(['checkout', '-q', 'main'], { cwd: root });
  assert.deepEqual([t.fired, t.security, t.deleted], [['security', 'test'], ['src/gate/café.mjs'], ['test/alpha/é.test.mjs']]);
});

test('review brief for a triggered job carries the trigger and its exact hunks, read from the clone', () => {
  const { root } = setup((root) => commit(root, { 'src/alpha/acts.mjs': 'export const ACTS = ["a"];\n' }));
  const pr = { number: 9, title: 'alpha', base: { ref: 'tranche' }, head: { ref: 'job/alpha', sha: 'h'.repeat(40) }, user: { login: 'job' } };
  const text = reviewBrief(root, '9', { log: quiet, io: { slug: 'o/r', read: () => pr, files: () => ['src/alpha/acts.mjs'], contents: (s, p) => (p.endsWith('.json') ? entry('alpha') : '- **R1** x\n'), notes: () => [], tracked: () => false } });
  assert.match(text, /## Review triggers\nFired: security\. security paths changed: src\/alpha\/acts\.mjs\./);
  assert.match(text, /```diff\n[\s\S]*-export const ACTS = \["a", "b"\];\n\+export const ACTS = \["a"\];[\s\S]*```/);
});

test('--no-review may not cite Q38 and needs a reason; --reviewed needs its measures, --no-review takes none', () => {
  assert.throws(() => reviewRounds({ noReview: 'Q38' }), /may not cite Q38: Q38 has no source/);
  assert.throws(() => reviewRounds({ noReview: 'per q38, product PRs' }), /Q38/);
  assert.throws(() => reviewRounds({ noReview: '  ' }), /--no-review needs why/);
  assert.deepEqual(reviewRounds({ noReview: 'a docs-only change' }), { rounds: 0, decision: null });
  assert.throws(() => reviewMeasures({ reviewed: 'x', findings: 0, actedOn: 0 }), /--review-minutes/);
  assert.throws(() => reviewMeasures({ reviewed: 'x', reviewMinutes: 3, actedOn: 0 }), /--findings <n>/);
  assert.throws(() => reviewMeasures({ reviewed: 'x', reviewMinutes: 3, findings: 1, actedOn: 2 }), /more than --findings/);
  assert.throws(() => reviewMeasures({ reviewed: 'x', reviewMinutes: 3, findings: 1, actedOn: 0, reviewCostUsd: '0' }), /above 0/);
  assert.deepEqual(reviewMeasures({ reviewed: 'x', reviewMinutes: '3', findings: '2', actedOn: '0' }), { review_minutes: 3, review_usd: 'unmeasured', findings: 2, findings_acted: 0 });
  assert.throws(() => reviewMeasures({ noReview: 'x', findings: 0 }), /drop --findings/);
  // An empty value is not 0 (review of PR 125).
  assert.throws(() => reviewMeasures({ reviewed: 'x', reviewMinutes: '', findings: 0, actedOn: 0 }), /--review-minutes/);
  assert.throws(() => reviewMeasures({ reviewed: 'x', reviewMinutes: 3, findings: ' ', actedOn: 0 }), /--findings <n>/);
  assert.throws(() => reviewRounds({ noReview: 'Q-38' }), /Q38/);
});

test('globs and assertion counts: ** any depth, * one name, a bare path a file or directory; comments are not assertions', () => {
  assert.equal(globRe('src/a'), null);
  assert.ok(matchPath('src/gate/x/y.mjs', 'src/gate/**') && matchPath('src/gate/y.mjs', 'src/**/y.mjs') && matchPath('src/a/b.mjs', 'src/a/'));
  assert.ok(!matchPath('src/gatex/y.mjs', 'src/gate/**') && !matchPath('src/a/b/c.mjs', 'src/a/*.mjs') && matchPath('src/a/c.mjs', './src/a/*.mjs'));
  assert.deepEqual(assertCounts('--- a/x\n+++ b/x\n@@ -1 +1 @@\n-  assert.equal(a, 1);\n-  // assert.ok(x)\n+  t.equal(a, 1);\n+  expect(b).toBe(2);\n@@ -9 +9 @@\n-  t.ok(c)\n+  it.only(\'x\', f)\n'), { removed: 2, added: 2, skips: 1, bare: 1 });
});

test('the report line: merged, triggered by kind and share, reviews, findings, minutes and cost', () => {
  const s = triggerSummary([
    { pr: 1, triggers: ['test'], reviewed: true, review_minutes: 10, review_usd: 0.5, findings: 2, findings_acted: 1 },
    { pr: 2, triggers: ['security', 'test'], reviewed: true, review_minutes: 20, review_usd: 'unmeasured', findings: 0, findings_acted: 0 },
    { pr: 3, triggers: [], reviewed: false },
    { pr: 4, triggers: [], reviewed: false },
    { pr: 5, reviewed: false },
  ]);
  assert.equal(s.line, 'review triggers: 5 job PRs merged (1 before triggers were recorded); triggered 2 of 4 (50%): security 1, test 2; reviews run 2; findings per review 1; findings acted on 1; added minutes to merge median 15, worst 20; review cost $0.50 (1 unmeasured)');
  assert.match(triggerSummary([]).line, /0 job PRs merged; triggered 0 of 0: .*median unmeasured, worst unmeasured; review cost unmeasured$/);
});
