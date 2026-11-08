// A job's push refuses a commit that adds a file over max_file_bytes, a generated path, or a path
// under a dist/ directory the tranche does not track (installer 3df99b92, 5 Nov; newgroup 606/609
// and agent-runner 3ee34e5, 6 Nov: each pushed, then cost a fresh branch).
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { refuseUnpushable, unpushable } from '../lib/pushcheck.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { commit, makeRepo } from './helpers.mjs';

const GEN = { max_file_bytes: 64, generated: [{ paths: ['src/alpha/rows.mjs'], regenerate: ['node', '-e', '0'], verify: ['node', '-e', '0'] }] };
function repo(files = {}) {
  const root = makeRepo({ 'process/config.json': GEN, 'src/alpha/index.mjs': 'export {};\n', 'web/dist/kept.json': '{}\n', ...files });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha', 'tranche'], { cwd: root });
  return root;
}
const refuse = (root) => () => refuseUnpushable(root, loadConfig(root), { branch: 'job/alpha' });

test('a commit adding a file over max_file_bytes is refused, naming it and how to drop it (installer 3df99b92)', () => {
  const root = repo();
  commit(root, { 'src/alpha/big.json': 'x'.repeat(100) });
  assert.throws(refuse(root), /nothing was pushed: commit \w+ adds src\/alpha\/big\.json \(100 bytes, over max_file_bytes \(64\)\)\. Drop them from the commits and rebuild before pushing: `git reset --soft HEAD~1`, `git reset -- src\/alpha\/big\.json`, then commit again; a pushed commit/);
});

test('a commit adding a generated path is refused, an older one named with its rebuild (newgroup 606/609)', () => {
  const root = repo();
  commit(root, { 'src/alpha/rows.mjs': 'export const rows = [];\n' });
  commit(root, { 'src/alpha/index.mjs': 'export const y = 1;\n' });
  assert.throws(refuse(root), /adds src\/alpha\/rows\.mjs \(a generated path \(config generated\).*`git reset --soft \w+~1`, `git reset -- src\/alpha\/rows\.mjs`, then commit again/);
});

test('a commit adding a file under dist/ is refused; a dist/ file the tranche tracks may change (agent-runner 3ee34e5)', () => {
  const root = repo();
  commit(root, { 'web/dist/kept.json': '{"a":1}\n' });
  assert.deepEqual(unpushable(root, loadConfig(root), { branch: 'job/alpha' }), []);
  commit(root, { 'agent-runner/dist/agent-runner.bundled.mjs': 'export {};\n' });
  assert.throws(refuse(root), /adds agent-runner\/dist\/agent-runner\.bundled\.mjs \(under a dist\/ directory: a build output, never committed\)/);
});

// Cold review of C3: one act clears every bad commit and file; a merge in the range is never flattened.
test('two bad commits: the reset goes before the oldest and unstages every bad file; a merge in the range points to a fresh branch', () => {
  const root = repo();
  commit(root, { 'src/alpha/rows.mjs': 'export const rows = [];\n' });
  commit(root, { 'src/alpha/big.json': 'x'.repeat(100) });
  let msg = '';
  try { refuse(root)(); } catch (e) { msg = e.message; }
  const oldest = git(['rev-parse', '--short=10', 'HEAD~1'], { cwd: root });
  assert.ok(msg.includes(`\`git reset --soft ${oldest}~1\`, \`git reset -- src/alpha/big.json\`, \`git reset -- src/alpha/rows.mjs\`, then commit again`), msg);
  // The tranche merged in after the bad commit: a reset would flatten it.
  const m = repo();
  commit(m, { 'src/alpha/rows.mjs': 'export const rows = [];\n' });
  git(['checkout', '-q', 'tranche'], { cwd: m });
  commit(m, { 'docs/x.md': 'x\n' });
  git(['push', '-q', 'origin', 'tranche'], { cwd: m });
  git(['fetch', '-q', 'origin'], { cwd: m });
  git(['checkout', '-q', 'job/alpha'], { cwd: m });
  git(['merge', '-q', '--no-ff', '--no-edit', 'origin/tranche'], { cwd: m });
  assert.throws(refuse(m), /include a merge, so a reset would flatten them: start the work again on a fresh branch \(`job start <id> --sessions <file> --fresh-branch "<why>"` for a job\), leaving out src\/alpha\/rows\.mjs/);
});
