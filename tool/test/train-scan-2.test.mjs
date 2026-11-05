// The merge train's cold start, measured on the copy (5 Nov, 10:50 restart: 619 s before the first
// pick; profiled read-only on the copy, one pass of ready/order took 422 s): the provider hold's
// export read (exports.mjs entryFiles) ran git grep over each provider's base and head tree, then
// git show once per file it found: 39,018 git processes, 329 s. Now a tree is read once, every
// file it needs in one git cat-file --batch, each file's imports kept by blob id; and an answer is
// kept by its merge base and head, so a new tranche tip reads none of them again. The answers are
// those of the read file by file.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { entryFiles, exportChanges, forgetReads } from '../lib/exports.mjs';
import { exportsChangedAt, forgetAnswers, importsFromAt } from '../lib/order.mjs';
import { entryFile } from '../lib/ledger.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

// Every git process the tool starts, counted by a git on PATH that logs and runs the real one.
function counting(f) {
  const real = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();
  const bin = mkdtempSync(join(tmpdir(), 'p3-gitlog-'));
  const log = join(bin, 'log');
  writeFileSync(log, '');
  writeFileSync(join(bin, 'git'), `#!/bin/sh\nprintf '%s\\n' "$*" >> '${log}'\nexec '${real}' "$@"\n`);
  chmodSync(join(bin, 'git'), 0o755);
  const was = process.env.PATH;
  process.env.PATH = `${bin}:${was}`;
  try { return { value: f(), calls: readFileSync(log, 'utf8').split('\n').filter(Boolean) }; } finally { process.env.PATH = was; }
}

const USERS = 60;
function providerRepo() {
  const files = {
    'prov/src/index.mjs': "export { f } from './core.mjs';\n",
    'prov/src/core.mjs': 'export function f(a) { return a; }\n',
  };
  // Users importing the provider, and files that name its directory without importing it.
  for (let i = 0; i < USERS; i++) files[`u${i}/a.mjs`] = `import { f } from '../prov/src/index.mjs';\nexport const g${i} = () => f(${i});\n`;
  for (let i = 0; i < 30; i++) files[`docs${i}/b.mjs`] = `// src is a word here, and nothing is imported\nexport const h${i} = ${i};\n`;
  const root = makeRepo(files);
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const head = commit(root, { 'prov/src/core.mjs': 'export function f(a, b) { return a + b; }\n' });
  return { root, base, head };
}
const opts = { isProviderSource: (f) => f.startsWith('prov/src/'), inProvider: (f) => f.startsWith('prov/'), providerPaths: ['prov/src/'] };

test('train scan 2: a provider\'s export change reads its trees in a few git processes, not one per importing file', () => {
  const { root, base, head } = providerRepo();
  forgetReads();
  const { value, calls } = counting(() => exportChanges(root, base, head, opts));
  assert.deepEqual(value, { removed: [], added: [], changed: [{ name: 'f', before: 'function(a)', after: 'function(a, b)' }] });
  // Before: git grep at each tree, then git show of each of the 60 importers at each: over 120.
  assert.ok(calls.length <= 12, `${calls.length} git processes for ${USERS} importers at two trees:\n${calls.join('\n')}`);
  assert.equal(calls.filter((c) => /\bshow\b/.test(c)).length, 0, 'no file is read by git show');
});

test('train scan 2: the entry files are those the grep and file-by-file read found (a file naming no provider word is no importer)', () => {
  // The provider is one file, so its word is "api.mjs": an import of '../prov/api' names it not,
  // and git grep -F never found that file; one of '../prov/api.mjs' does.
  const p = { isProviderSource: (f) => f === 'prov/api.mjs', inProvider: (f) => f.startsWith('prov/'), providerPaths: ['prov/api.mjs'] };
  const root = makeRepo({ 'prov/api.mjs': 'export function g(a) {}\n', 'u/a.mjs': "import { g } from '../prov/api';\n", 'u/c.txt': "import { g } from '../prov/api.mjs';\n" });
  forgetReads();
  assert.deepEqual(entryFiles(root, 'HEAD', p), [], 'no importer names the word, and no index file: none');
  commit(root, { 'u/b.mjs': "import { g } from '../prov/api.mjs';\n" });
  assert.deepEqual(entryFiles(root, 'HEAD', p), ['prov/api.mjs']);
  // The provider's own tests are not its users (review of PR 82), read from the kept imports too.
  const q = { isProviderSource: (f) => f.startsWith('prov/src/'), inProvider: (f) => f.startsWith('prov/'), providerPaths: ['prov/src/'] };
  const r2 = makeRepo({ 'prov/src/index.mjs': "export { f } from './internal.mjs';\n", 'prov/src/internal.mjs': 'export function f(a) {}\n', 'prov/test/a.test.mjs': "import { f } from '../src/internal.mjs';\n" });
  assert.deepEqual(entryFiles(r2, 'HEAD', q), ['prov/src/index.mjs']);
  commit(r2, { 'user/a.mjs': "import { f } from '../prov/src/internal.mjs';\n" });
  assert.deepEqual(entryFiles(r2, 'HEAD', q), ['prov/src/internal.mjs']);
});

test('train scan 2: a new tranche tip whose merge base with a head is unchanged reads no surface again', () => {
  const cfg = { records: ['process/'], requirements_dir: 'req', modules_file: null };
  const modules = [{ id: 'prov', paths: ['src/prov/'], uses: [] }, { id: 'user', paths: ['src/user/'], uses: ['prov'] }];
  const root = makeRepo({
    [entryFile('prov')]: entry('prov'), [entryFile('user')]: entry('user'),
    'src/prov/index.mjs': 'export function f(a) {}\n',
    'src/user/a.mjs': "import { f } from '../prov/index.mjs';\n",
    'other/x.mjs': 'export const x = 1;\n',
  });
  const tip1 = git(['rev-parse', 'HEAD'], { cwd: root });
  const prov = commit(root, { 'src/prov/index.mjs': 'export function f(a, b) {}\n' }, 'provider');
  git(['checkout', '-q', '-b', 'u', tip1], { cwd: root });
  const user = commit(root, { 'src/user/a.mjs': "import { f } from '../prov/index.mjs';\nexport const y = f;\n" }, 'user');
  git(['checkout', '-q', '-b', 't', tip1], { cwd: root });
  forgetReads(); forgetAnswers();
  const P = { id: 'prov', head: prov };
  const U = { id: 'user', head: user };
  assert.equal(exportsChangedAt(root, cfg, 't', P), true);
  assert.equal(importsFromAt(root, cfg, 't', modules, U, P), true);
  // The tranche moves on by a commit neither branch has: their merge bases stay tip1.
  commit(root, { 'other/x.mjs': 'export const x = 2;\n' }, 'tip 2');
  const { value, calls } = counting(() => [exportsChangedAt(root, cfg, 't', P), importsFromAt(root, cfg, 't', modules, U, P)]);
  assert.deepEqual(value, [true, true]);
  // Each reads its ledger entry and merge base only.
  assert.deepEqual(calls.map((c) => c.split(' ').find((w) => !w.startsWith('-') && !w.includes('=')) ), ['show', 'merge-base', 'show', 'merge-base'], calls.join('\n'));
  // An entry that changed is read again: its answer is kept by the entry it read.
  commit(root, { [entryFile('prov')]: entry('prov', { paths: ['other/'] }) }, 'prov moves');
  assert.equal(exportsChangedAt(root, cfg, 't', P), false, 'its source is other/ now, which its head does not change');
});

test('train scan 2: a file git could not read is read again next time, never kept as empty (review)', () => {
  const p = { isProviderSource: (f) => f.startsWith('prov/'), inProvider: (f) => f.startsWith('prov/'), providerPaths: ['prov/'] };
  const root = makeRepo({ 'prov/index.mjs': "export * from './a.mjs';\n", 'prov/a.mjs': 'export const a = 1;\n', 'u/x.mjs': "import { a } from '../prov/a.mjs';\n" });
  const oid = git(['rev-parse', 'HEAD:u/x.mjs'], { cwd: root });
  const loose = join(git(['rev-parse', '--absolute-git-dir'], { cwd: root }), 'objects', oid.slice(0, 2), oid.slice(2));
  const bytes = readFileSync(loose);
  forgetReads();
  rmSync(loose);
  assert.deepEqual(entryFiles(root, 'HEAD', p), ['prov/index.mjs'], 'unread: no importer, as a failed git grep and git show read it');
  writeFileSync(loose, bytes);
  assert.deepEqual(entryFiles(root, 'HEAD', p), ['prov/a.mjs'], 'read again once it can be');
});
