// Generated files over max_file_bytes (the copy, 4 Nov: rows.mjs 5.2 MB, the agent-worker bundle
// 8.9 MB, the bio-plane bundle 29 MB). The record check refuses any commit that writes one, so no
// pull request can refresh it and layer close's "regenerated files differ" never cleared. The
// line: such a file is not committed; it is built at deploy and release; layer close regenerates
// and verifies it, comparing only the generated paths the tranche commits.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildGenerated, oversizeGenerated } from '../lib/checks.mjs';
import { DEPLOYS_FILE, deployDev } from '../lib/deploy.mjs';
import { layerChecks } from '../lib/layer.mjs';
import { releaseRun } from '../lib/release.mjs';
import { setupCheck } from '../lib/setup.mjs';
import { git, loadConfig, run } from '../lib/util.mjs';
import { entry, makeRepo, closeLayer } from './helpers.mjs';

const quiet = () => {};
const PASS = "import test from 'node:test';\ntest('ok', () => {});\n";
// gen.mjs writes both generated files: big.txt (never committed) and small.txt (committed).
const GEN = "import { mkdirSync, writeFileSync } from 'node:fs';\nmkdirSync('gen', { recursive: true });\nwriteFileSync('gen/big.txt', 'B'.repeat(4096));\nwriteFileSync('gen/small.txt', 'fresh\\n');\n";
const ROWS = [
  { paths: ['gen/big.txt'], regenerate: ['node', 'gen.mjs'], verify: ['node', '-e', "if (require('fs').statSync('gen/big.txt').size !== 4096) process.exit(1)"] },
  { paths: ['gen/small.txt'], regenerate: ['node', 'gen.mjs'], verify: ['node', '-e', 'process.exit(0)'] },
];
const done = (id) => ({ ...entry(id, { requirements: `build/requirements/${id}.md`, status: { state: 'COMPLETE' } }), tests: [`test/${id}/`] });
const product = (config = {}, files = {}) => ({
  'process/config.json': { generated: ROWS, max_file_bytes: 1024, ...config },
  'gen.mjs': GEN,
  'gen/small.txt': 'stale\n',
  'build/layers.md': '| layer | what | modules |\n|---|---|---|\n| 1 | first | a |\n| 2 | next | d |\n',
  'build/requirements/a.md': '- **R1** *(not yet met: x)* text\n',
  'build/requirements/d.md': '- **R1** *(not yet met: x)* text\n',
  'process/ledger/a.json': done('a'),
  'test/a/x.test.mjs': PASS,
  ...files,
});
function withOrigin(files) {
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  return { root, bare };
}
const io = { openPRs: () => [], checkRun: () => null, compare: () => null };

test('layer checks: a generated path the tranche does not commit is built and verified, never "differs"; a committed one still differs', () => {
  const { root } = withOrigin(product());
  const cfg = loadConfig(root);
  const out = [];
  const r = layerChecks(root, cfg, git(['rev-parse', 'HEAD'], { cwd: root }), [{ id: 'a' }], { timeout: 60000, log: (m) => out.push(m) });
  assert.deepEqual(r.findings, [], out.join('\n'));
  assert.deepEqual(r.changed, ['gen/small.txt'], 'only the committed path is compared');
  assert.deepEqual(r.built, ['gen/big.txt']);
  // A built file whose verify fails is a finding, even when .gitignore hides it from git.
  const bad = withOrigin(product({ generated: [{ ...ROWS[0], verify: ['node', '-e', 'process.exit(4)'] }] }, { '.gitignore': 'gen/big.txt\n' }));
  const f = layerChecks(bad.root, loadConfig(bad.root), git(['rev-parse', 'HEAD'], { cwd: bad.root }), [{ id: 'a' }], { timeout: 60000, log: quiet }).findings;
  assert.match(f.map((x) => `${x.check}: ${x.file}: ${x.message}`).join('\n'), /generated: gen\/big\.txt: .*failed \(exit 4\) after building/);
});

test('buildGenerated: only rows with a path the commit does not track are built; a failure is a finding', () => {
  const root = makeRepo(product());
  const ran = [];
  const exec = (c, a, o) => { ran.push([c, ...a].join(' ')); assert.ok(o.unset.includes('GITHUB_TOKEN')); return { code: 0, stdout: '', stderr: '', seconds: 0 }; };
  const b = buildGenerated(root, ROWS, { timeout: 60000, exec });
  assert.deepEqual(b.built, ['gen/big.txt']);
  assert.deepEqual(ran, ['node gen.mjs'], 'the committed row is not built');
  const f = buildGenerated(root, ROWS, { timeout: 60000, exec: () => ({ code: 2, stdout: '', stderr: 'boom', seconds: 0 }) });
  assert.match(f.findings[0].message, /node gen\.mjs failed \(exit 2\) building gen\/big\.txt: boom/);
});

test('setup check: a committed generated file over max_file_bytes is product work, named with BOB\'s act', () => {
  const root = makeRepo(product({}, { 'gen/big.txt': 'B'.repeat(4096) }));
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  const lines = [];
  const r = setupCheck(root, { slug: 'o/r', conditions: [], io: { api: () => null, openPRs: () => [], prFiles: () => [] }, log: (l) => lines.push(l) });
  assert.deepEqual(r.generated.over, [{ file: 'gen/big.txt', bytes: 4096 }]);
  assert.match(lines.join('\n'), /product work: 1 committed generated file over max_file_bytes \(1024\); no pull request can refresh one:\n- gen\/big\.txt: 4096 bytes; BOB's act: stop committing it .* build it in release\.assemble and the deploy/);
  assert.deepEqual(oversizeGenerated(root, ROWS, 'HEAD', 1 << 20), []);
  const fine = makeRepo(product());
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: fine });
  const l2 = [];
  assert.deepEqual(setupCheck(fine, { slug: 'o/r', conditions: [], io: { api: () => null, openPRs: () => [], prFiles: () => [] }, log: (l) => l2.push(l) }).generated.over, []);
  assert.doesNotMatch(l2.join('\n'), /product work/);
});

test('deploy dev and release run build the uncommitted generated files before their own steps', () => {
  const GUARD = 'p3dev guard: passed';
  const node = (code) => ['node', '-e', code];
  const deploy = { slug_prefix: 'p3dev-', dry_run: node(`console.log(${JSON.stringify(GUARD)})`), deploy: node("if (!require('fs').existsSync('gen/big.txt')) process.exit(5)"), walk: node('0'), guard_line: GUARD };
  const { root, bare } = withOrigin(product({ deploy, plan: 'close' }));
  assert.equal(closeLayer(root, '1').ok, true);
  git(['clean', '-qfd', 'gen'], { cwd: root });
  const out = [];
  const r = deployDev(root, { io: { compare: () => null }, repo: 'o/p', log: (m) => out.push(m) });
  assert.equal(r.ok, true, out.join('\n'));
  assert.deepEqual(r.row.results.map((x) => [x.stage, x.exit]), [['build', 0], ['dry_run', 0], ['deploy', 0], ['walk', 0]]);
  assert.ok(JSON.parse(git(['show', `process-state:${DEPLOYS_FILE}`], { cwd: bare })).ok);
  assert.match(out.join('\n'), /findings of the walk, if any, enter by the route for work found elsewhere: `node \.process\/tool\/p3\.mjs found <module> "<finding>" --from "walk p3dev-l1 \w{10}"`/);
  // The release's checks job, on its own checkout, builds them too.
  const rel = makeRepo(product({ release: { checks: [node("if (!require('fs').existsSync('gen/big.txt')) process.exit(6)")], assemble: node('0'), out: 'rel' } }));
  const c = releaseRun(rel, 'checks', { log: quiet });
  assert.equal(c.ok, true, JSON.stringify(c.results));
  assert.deepEqual(c.results.map((x) => [x.name, x.exit]), [['build generated gen/big.txt', 0], ["node -e if (!require('fs').existsSync('gen/big.txt')) process.exit(6)", 0]]);
  assert.ok(existsSync(join(rel, 'gen/big.txt')));
  assert.equal(readFileSync(join(rel, 'gen/big.txt'), 'utf8').length, 4096);
});

test('deploy dev installs the lock files before it builds the generated files (copy, 4 Nov: esbuild not found on a fresh checkout)', () => {
  const GUARD = 'p3dev guard: passed';
  const node = (code) => ['node', '-e', code];
  const deploy = { slug_prefix: 'p3dev-', dry_run: node(`console.log(${JSON.stringify(GUARD)})`), deploy: node('0'), walk: node('0'), guard_line: GUARD };
  // The build needs the installed package, as bundles.mjs needs esbuild.
  const needs = "if (!require('fs').existsSync('dep/node_modules/esbuild')) { console.error('Cannot find package esbuild'); process.exit(7) }";
  const rows = [{ ...ROWS[0], regenerate: ['sh', '-c', `node -e "${needs}" && node gen.mjs`] }];
  const lock = JSON.stringify({ name: 'dep', lockfileVersion: 3, packages: { '': {}, 'node_modules/esbuild': { version: '0.0.0' } } });
  const calls = [];
  // npm ci stands in: it installs the package where it runs; everything else runs for real.
  const exec = (cmd, args, o) => {
    calls.push(cmd);
    if (cmd !== 'npm') return run(cmd, args, o);
    mkdirSync(join(o.cwd, 'node_modules/esbuild'), { recursive: true });
    return { code: 0, stdout: '', stderr: '', seconds: 0 };
  };
  const { root } = withOrigin(product({ deploy, plan: 'close', generated: rows, lockfiles: ['dep/package-lock.json'] }, { 'dep/package.json': '{"name":"dep"}', 'dep/package-lock.json': lock }));
  assert.equal(closeLayer(root, '1').ok, true);
  git(['clean', '-qfdx', 'gen', 'dep'], { cwd: root });
  calls.length = 0;
  const out = [];
  const r = deployDev(root, { io: { compare: () => null, exec }, repo: 'o/p', log: (m) => out.push(m) });
  assert.equal(r.ok, true, out.join('\n'));
  assert.equal(calls[0], 'npm', `installed first: ${calls.join(', ')}`);
  assert.deepEqual(r.row.results.map((x) => [x.stage, x.exit]), [['build', 0], ['dry_run', 0], ['deploy', 0], ['walk', 0]]);
});
