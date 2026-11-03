// Build Plan Phase 3, the release row: development releases only (Bob's word, 3 Nov).
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { layerClose } from '../lib/layer.mjs';
import { MARKER, RELEASES_FILE, branchOf, checkVersion, defaultVersion, releaseBody, releaseConfig, releaseDev, releaseReady, releaseRun, releaseSign, tagOf, versionOf } from '../lib/release.mjs';
import { DEFAULTS, git } from '../lib/util.mjs';
import { commit, entry, makeRepo, write } from './helpers.mjs';

const quiet = () => {};
const SHIM = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'shims', 'process-dev-release.yml');
const REL = { checks: [['npm', 'test'], { name: 'system', argv: ['node', '--test'], timeout_minutes: 40 }], assemble: ['node', 'a.mjs'], out: 'release/' };
const cfgWith = (release, extra = {}) => ({ ...DEFAULTS, ...extra, release });

test('release config: the keys validated; checks take an argv or {name, argv, timeout_minutes}', () => {
  const r = releaseConfig(cfgWith({ ...REL, full_history: true }));
  assert.deepEqual(r.checks, [{ name: 'npm test', argv: ['npm', 'test'], timeout_minutes: 20 }, { name: 'system', argv: ['node', '--test'], timeout_minutes: 40 }]);
  assert.equal(r.out, 'release');
  assert.equal(r.full_history, true);
  assert.equal(r.sign_secret, null);
  assert.equal(releaseConfig(cfgWith(REL, { suite_timeout_minutes: 30 })).checks[0].timeout_minutes, 30);
  assert.equal(releaseConfig(cfgWith({ ...REL, sign_secret: 'P3_RELEASE_KEY' })).sign_secret, 'P3_RELEASE_KEY');
  assert.throws(() => releaseConfig(DEFAULTS), /no "release" block/);
  assert.throws(() => releaseConfig(cfgWith({ ...REL, publish: true })), /unknown keys: publish/);
  assert.throws(() => releaseConfig(cfgWith({ ...REL, checks: [] })), /non-empty list/);
  assert.throws(() => releaseConfig(cfgWith({ ...REL, checks: ['npm test'] })), /argv or/);
  assert.throws(() => releaseConfig(cfgWith({ ...REL, checks: [{ argv: ['x'], timeout_minutes: 0 }] })), /whole minutes/);
  assert.throws(() => releaseConfig(cfgWith({ ...REL, assemble: 'node a.mjs' })), /release.assemble must be a non-empty argv/);
  for (const out of ['/tmp/x', '../x', 'a/../../b', '', 'a b', '.', './', '/']) assert.throws(() => releaseConfig(cfgWith({ ...REL, out })), /release.out must be a relative directory/, out);
  assert.throws(() => releaseConfig(cfgWith({ ...REL, full_history: 'yes' })), /true or false/);
  for (const s of ['lower', 'GITHUB_TOKEN', 'A-B']) assert.throws(() => releaseConfig(cfgWith({ ...REL, sign_secret: s })), /must name a repository secret/, s);
});

test('version, branch and tag naming', () => {
  assert.equal(defaultVersion('1a2b3c4d5e6f', new Date('2026-11-03T23:30:00Z')), '20261103-1a2b3c4');
  assert.equal(branchOf('20261103-1a2b3c4'), 'p3dev-release/20261103-1a2b3c4');
  assert.equal(tagOf('0.4.0-dev.1'), 'p3dev-0.4.0-dev.1');
  assert.equal(versionOf('p3dev-release/0.4.0'), '0.4.0');
  assert.equal(versionOf('refs/heads/p3dev-release/0.4.0'), '0.4.0');
  assert.throws(() => versionOf('release/0.4.0'), /is not a p3dev-release\/<version> branch/);
  for (const v of ['', '-x', 'a/b', 'a..b', 'a b', 'x.lock', 'x.', 'a'.repeat(65), 'v$1']) assert.throws(() => checkVersion(v), /the version must be/, v);
  assert.throws(() => versionOf('p3dev-release/a/b'), /the version must be/);
});

test('the layer rule: every layer closed, or the open layer closed with nothing of the next in the tip', () => {
  const L = (n, closed, mods = []) => ({ n, closed, mods: mods.map(([id, open, merged]) => ({ id, open, merged })) });
  assert.match(releaseReady(null).why, /no layer map/);
  assert.deepEqual(releaseReady({ layers: [L(1, true)], cur: null }), { ok: true, why: 'every layer is closed' });
  const first = L(1, false, [['a', false, true]]);
  assert.match(releaseReady({ layers: [first], cur: first }).why, /layer 1 is open and no layer before it is closed/);
  const quiet2 = L(2, false, [['d', false, false]]);
  assert.equal(releaseReady({ layers: [L(1, true), quiet2], cur: quiet2 }).ok, true);
  const busy = L(2, false, [['d', true, false], ['e', false, true]]);
  const r = releaseReady({ layers: [L(1, true), busy], cur: busy });
  assert.equal(r.ok, false);
  assert.match(r.why, /layer 2 has work in the tip \(d open, e merged\); close it first/);
});

// A product with origin: layer 1 of two, its modules complete, the release block in its config.
const unmet = (n) => Array.from({ length: n }, (_, i) => `- **R${i + 1}** *(not yet met: x)* text`).join('\n') + '\n- **R99** met\n';
const PASS = "import test from 'node:test';\ntest('ok', () => {});\n";
const done = (id) => ({ ...entry(id, { requirements: `build/requirements/${id}.md`, status: { state: 'COMPLETE' } }), tests: [`test/${id}/`] });
const product = (release = REL) => ({
  'process/config.json': { release },
  'build/layers.md': '| layer | what | modules |\n|---|---|---|\n| 1 | first | a |\n| 2 | next | d |\n',
  'build/requirements/a.md': unmet(1),
  'build/requirements/d.md': unmet(1),
  'process/ledger/a.json': done('a'),
  'test/a/x.test.mjs': PASS,
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
const statusIO = { openPRs: () => [], checkRun: () => null, compare: () => null };
const io = { status: statusIO, compare: () => null, remoteRefs: () => '' };
const slug = 'o/p';

test('release dev: refused before a layer is closed, off the tranche tip, on a dirty tree, without a release block, on a taken version; then BOB\'s acts', () => {
  const { root } = withOrigin(product());
  assert.throws(() => releaseDev(root, { io, slug, log: quiet }), /no development release now: layer 1 is open and no layer before it is closed/);
  assert.equal(layerClose(root, '1', { io: statusIO, log: quiet }).ok, true);
  const tip = git(['rev-parse', 'origin/tranche'], { cwd: root });
  const out = [];
  const r = releaseDev(root, { io, slug, log: (m) => out.push(m) });
  assert.equal(r.ok, true);
  assert.equal(r.commit, tip);
  const day = git(['log', '-1', '--format=%cI', tip], { cwd: root });
  assert.equal(r.version, defaultVersion(tip, new Date(day)));
  // GitHub unreadable: open pull requests unknown, so refused.
  assert.throws(() => releaseDev(root, { io: { ...io, status: { ...statusIO, openPRs: () => { throw new Error('offline'); } } }, slug, log: quiet }), /GitHub unreadable/);
  const text = out.join('\n');
  assert.match(text, /development only, never published/);
  assert.match(text, new RegExp(`1\\. \`git push origin ${tip}:refs/heads/p3dev-release/${r.version}\``));
  assert.match(text, /2\. watch the run: https:\/\/github\.com\/o\/p\/actions\/workflows\/process-dev-release\.yml\?query=branch%3Ap3dev-release%2F/);
  assert.match(text, /3\. `node \.process\/tool\/p3\.mjs release dev --record <that run's url>`/);
  assert.equal(releaseDev(root, { io, slug, version: '0.4.0-dev.1', log: quiet }).version, '0.4.0-dev.1');
  assert.throws(() => releaseDev(root, { io, slug, version: 'a/b', log: quiet }), /the version must be/);
  // A version already on origin, as a branch or a tag.
  assert.throws(() => releaseDev(root, { io: { ...io, remoteRefs: () => `${tip}\trefs/tags/p3dev-0.4.0\n` }, slug, version: '0.4.0', log: quiet }), /version 0\.4\.0 is taken on origin \(refs\/tags\/p3dev-0\.4\.0\)/);
  // A dirty tree; then a checkout that is not the tranche tip.
  writeFileSync(join(root, 'build/requirements/a.md'), 'changed\n');
  assert.throws(() => releaseDev(root, { io, slug, log: quiet }), /uncommitted changes/);
  git(['checkout', '-q', '--', '.'], { cwd: root });
  commit(root, { 'x.txt': 'x\n' });
  assert.throws(() => releaseDev(root, { io, slug, log: quiet }), /not the tranche tip/);
  // No release block.
  const bare2 = withOrigin({ ...product(), 'process/config.json': {} });
  assert.throws(() => releaseDev(bare2.root, { io, slug, log: quiet }), /no "release" block/);
});

test('release dev --record: one row per run on the state branch, with the draft release and the checks; a second record refused', () => {
  const { root, bare } = withOrigin(product());
  const sha = git(['rev-parse', 'HEAD'], { cwd: root });
  const body = releaseBody('/nonexistent', { version: '0.4.0', commit: sha }).replace('"checks": null', '"checks": [{"name": "npm test", "exit": 0, "seconds": 9}]');
  const rio = {
    getRun: (s, id) => ({ id, path: '.github/workflows/process-dev-release.yml', status: 'completed', conclusion: 'success', head_branch: 'p3dev-release/0.4.0', head_sha: sha, html_url: `https://github.com/o/p/actions/runs/${id}` }),
    jobs: () => [{ name: 'checks', conclusion: 'success' }, { name: 'assemble', conclusion: 'success' }, { name: 'publish', conclusion: 'success' }],
    releases: () => [{ tag_name: 'p3dev-0.4.0', draft: true, html_url: 'https://github.com/o/p/releases/tag/untagged-1', body, assets: [{ name: 'a.tgz' }] }],
  };
  const out = [];
  const r = releaseDev(root, { record: 'https://github.com/o/p/actions/runs/77', io: rio, slug, log: (m) => out.push(m) });
  const row = JSON.parse(git(['show', `process-state:${RELEASES_FILE}`], { cwd: bare }));
  assert.deepEqual(row, r.row);
  assert.equal(row.version, '0.4.0');
  assert.equal(row.commit, sha);
  assert.equal(row.run, 77);
  assert.equal(row.conclusion, 'success');
  assert.deepEqual(row.release, { url: 'https://github.com/o/p/releases/tag/untagged-1', draft: true, assets: ['a.tgz'] });
  assert.deepEqual(row.checks, [{ name: 'npm test', exit: 0, seconds: 9 }]);
  assert.equal(row.jobs.length, 3);
  assert.match(out.join('\n'), /recorded development release 0\.4\.0 .*: success; draft release https/);
  assert.throws(() => releaseDev(root, { record: 'https://github.com/o/p/actions/runs/77', io: rio, slug, log: quiet }), /run 77 is already recorded/);
  // A failed run is recorded too, with no release; another workflow's run or an unfinished one is refused.
  const failed = releaseDev(root, { record: '78', io: { ...rio, getRun: (s, id) => ({ ...rio.getRun(s, id), conclusion: 'failure' }) }, slug, log: quiet });
  assert.equal(failed.row.release, null);
  assert.throws(() => releaseDev(root, { record: '79', io: { ...rio, getRun: (s, id) => ({ ...rio.getRun(s, id), path: '.github/workflows/x.yml' }) }, slug, log: quiet }), /not \.github\/workflows\/process-dev-release\.yml/);
  assert.throws(() => releaseDev(root, { record: '79', io: { ...rio, getRun: (s, id) => ({ ...rio.getRun(s, id), status: 'in_progress' }) }, slug, log: quiet }), /has not finished/);
  assert.throws(() => releaseDev(root, { record: '79', io: { ...rio, releases: () => [] }, slug, log: quiet }), /no release has the tag p3dev-0\.4\.0/);
  assert.throws(() => releaseDev(root, { record: 'not-a-run', io: rio, slug, log: quiet }), /--record <run url>/);
});

test('release run: each check within its timeout, results written; the assemble must write release.out', () => {
  const ok = ['node', '-e', 'process.exit(0)'];
  const root = makeRepo({ 'process/config.json': { release: { checks: [ok, { name: 'bad', argv: ['node', '-e', 'process.exit(3)'] }], assemble: ['node', '-e', "require('fs').mkdirSync('rel/sub',{recursive:true});require('fs').writeFileSync('rel/sub/a.txt','x')"], out: 'rel' } } });
  const out = join(root, '..', 'checks.json');
  const r = releaseRun(root, 'checks', { out, log: quiet });
  assert.equal(r.ok, false);
  assert.deepEqual(r.results.map((x) => [x.name, x.exit]), [['node -e process.exit(0)', 0], ['bad', 3]]);
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')).checks.map((x) => x.exit), [0, 3]);
  // The GitHub tokens never reach the product's commands.
  const seen = [];
  releaseRun(root, 'checks', { log: quiet, exec: (c, a, o) => { seen.push(o.unset); return { code: 0, stdout: '', stderr: '', seconds: 0 }; } });
  assert.ok(seen.every((u) => u.includes('GITHUB_TOKEN') && u.includes('GH_TOKEN')));
  assert.equal(releaseRun(root, 'assemble', { log: quiet }).ok, true);
  assert.ok(existsSync(join(root, 'rel/sub/a.txt')));
  const empty = makeRepo({ 'process/config.json': { release: { checks: [ok], assemble: ok, out: 'rel' } } });
  const e = releaseRun(empty, 'assemble', { log: quiet });
  assert.equal(e.ok, false);
  assert.match(e.results.at(-1).message, /the assemble wrote no files to rel/);
  assert.throws(() => releaseRun(empty, 'publish', { log: quiet }), /release run checks \| release run assemble/);
});

test('release sign: SHA256SUMS and an Ed25519 signature that verifies; no key, or another kind, refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'p3-rel-'));
  write(dir, { 'a.tgz': 'aaa', 'sub/b.json': 'bbb' });
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const key = privateKey.export({ type: 'pkcs8', format: 'pem' });
  assert.deepEqual(releaseSign(dir, { key, log: quiet }).files, ['a.tgz', 'sub/b.json']);
  const sums = readFileSync(join(dir, 'SHA256SUMS'));
  assert.match(String(sums), /^[0-9a-f]{64} {2}a\.tgz\n[0-9a-f]{64} {2}sub\/b\.json\n$/);
  assert.ok(verify(null, sums, publicKey, Buffer.from(readFileSync(join(dir, 'SHA256SUMS.sig'), 'utf8').trim(), 'base64')));
  // Signing again covers the same files, not the earlier sums.
  assert.deepEqual(releaseSign(dir, { key, log: quiet }).files, ['a.tgz', 'sub/b.json']);
  assert.throws(() => releaseSign(dir, { key: '', log: quiet }), /P3_SIGN_KEY is empty/);
  assert.throws(() => releaseSign(dir, { key: 'nope', log: quiet }), /not a PEM private key/);
  const rsa = generateKeyPairSync('rsa', { modulusLength: 1024 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
  assert.throws(() => releaseSign(dir, { key: rsa, log: quiet }), /a rsa key, not Ed25519/);
});

test('release body: the checks in a block --record reads back', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'p3-rel-')), 'c.json');
  writeFileSync(f, JSON.stringify({ step: 'checks', checks: [{ name: 'x', exit: 0 }] }));
  const b = releaseBody(f, { version: '1', commit: 'abc' });
  assert.match(b, new RegExp(`<!-- ${MARKER} -->\\nDevelopment release 1 at abc\\. Development only`));
  assert.match(b, /"name": "x"/);
  assert.throws(() => releaseBody(f, { version: 'a/b', commit: 'abc' }), /the version must be/);
});

// The shim, parsed as YAML (PyYAML, when this machine has it), and its tokens per job.
test('the shim: parses; push to p3dev-release/** only; read-only checks and assemble; publish alone writes and runs no product code', (t) => {
  const py = spawnSync('python3', ['-c', 'import sys,json,yaml; print(json.dumps(yaml.safe_load(open(sys.argv[1]))))', SHIM], { encoding: 'utf8' });
  if (py.status !== 0) { t.skip(`no YAML parser here: ${py.stderr.trim().split('\n').at(-1)}`); return; }
  const w = JSON.parse(py.stdout);
  assert.deepEqual(w.true ?? w.on, { push: { branches: ['p3dev-release/**'] } }); // PyYAML reads the key on as true
  assert.deepEqual(w.permissions, {});
  assert.deepEqual(Object.keys(w.jobs), ['checks', 'assemble', 'publish']);
  assert.deepEqual(w.jobs.checks.permissions, { contents: 'read' });
  assert.deepEqual(w.jobs.assemble.permissions, { contents: 'read' });
  assert.deepEqual(w.jobs.publish.permissions, { contents: 'write' });
  assert.deepEqual(w.jobs.publish.needs, ['checks', 'assemble']);
  const text = (job) => JSON.stringify(w.jobs[job].steps);
  for (const job of ['checks', 'assemble']) {
    assert.doesNotMatch(text(job), /github\.token|secrets/, `${job} holds no token or secret`);
    assert.ok(w.jobs[job].steps.filter((s) => String(s.uses).startsWith('actions/checkout')).every((s) => s.with['persist-credentials'] === false));
  }
  assert.match(text('checks'), /release run checks/);
  assert.match(text('assemble'), /release run assemble/);
  // Publish: no product code (no release run, no npm), no persisted credentials, the tranche check, a draft never latest.
  const pub = text('publish');
  assert.doesNotMatch(pub, /release run|npm /);
  assert.ok(w.jobs.publish.steps.filter((s) => String(s.uses).startsWith('actions/checkout')).every((s) => s.with['persist-credentials'] === false));
  assert.match(pub, /merge-base --is-ancestor/);
  assert.match(pub, /--draft --latest=false --verify-tag/);
  assert.doesNotMatch(pub, /gh release edit|--draft=false|--prerelease=false|make_latest=true/);
  assert.match(pub, /refs\/tags\/\$TAG/);
  // Each action is pinned by its full commit.
  for (const job of Object.values(w.jobs)) for (const s of job.steps) if (s.uses) assert.match(s.uses, /@[0-9a-f]{40}$/, s.uses);
});
