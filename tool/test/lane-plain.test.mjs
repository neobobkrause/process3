// A lane's own pull request merges plain (Bob's standing approvals, 5 Nov: "A pull request that
// changes only files in its own lane's folder lands through the merge tool without a test suite
// run"). Copy PR 620, 6 Nov 05:15: merge --plain refused it as module files of ux-design.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { mergePlain } from '../lib/merge.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const DIR = 'docs/development/ux-substrate';
function product(files) {
  const root = makeRepo({
    'process/config.json': { lanes: [{ name: 'ux', dir: DIR, module: 'ux-design' }] },
    'process/ledger/ux-design.json': entry('ux-design', { paths: [`${DIR}/`], tests: ['test/ux-design/'], status: { state: 'COMPLETE' } }),
    [`${DIR}/words.json`]: '{}\n',
    'test/ux-design/w.test.mjs': "import test from 'node:test';\ntest('ok', () => {});\n",
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'lane/ux', 'tranche'], { cwd: root });
  const sha = commit(root, files);
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche', 'lane/ux'], { cwd: root });
  const calls = { merged: null };
  const green = { id: 1, status: 'completed', conclusion: 'success', started_at: '2026-11-06T05:00:00Z' };
  const io = {
    getPR: () => ({ state: 'open', draft: false, mergeable: true, base: { ref: 'tranche', repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: 'lane/ux', sha, repo: { full_name: 'o/r' } } }),
    requiredChecks: () => ({ checks: [{ context: 'gate' }] }), checkRuns: () => [green], checkRun: () => green, comments: () => [],
    repo: { released: () => false, shim: () => null, descends: () => false },
    mergePR: (slug, n, s, o) => { calls.merged = { sha: s, ...o }; return { merged: true, sha: 'm'.repeat(40) }; },
  };
  return { root, io, calls, sha };
}
const q = { slug: 'o/r', log: () => {}, noReview: 'a lane change' };

test('a plain pull request changing only its lane\'s folder merges, though the lane\'s module owns the folder (copy PR 620)', () => {
  const p = product({ [`${DIR}/words.json`]: '{"a":1}\n', [`${DIR}/new/screen.md`]: '# s\n', 'process/metrics/ux-design.jsonl': '{}\n' });
  assert.equal(mergePlain(p.root, 620, { ...q, io: p.io }).merged, true);
  assert.equal(p.calls.merged.sha, p.sha);
});

test('a lane pull request that also changes the module\'s tests still goes through a job', () => {
  const t = product({ [`${DIR}/words.json`]: '{"a":1}\n', 'test/ux-design/w.test.mjs': "import test from 'node:test';\ntest('x', () => {});\n" });
  assert.throws(() => mergePlain(t.root, 620, { ...q, io: t.io }), /changes module files, which go through a job: .*test\/ux-design\/w\.test\.mjs \(ux-design\)/);
  assert.equal(t.calls.merged, null);
});
