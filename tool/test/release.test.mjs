// Build Plan Phase 3, the release row: development releases only (Bob's word, 3 Nov).
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, verify } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { layerClose } from '../lib/layer.mjs';
import { MARKER, RELEASES_FILE, checkVersion, defaultVersion, releaseBody, releaseConfig, releaseDev, releaseReady, releaseRun, releaseSign, tagOf } from '../lib/release.mjs';
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

test('version and tag naming', () => {
  assert.equal(defaultVersion('1a2b3c4d5e6f', new Date('2026-11-03T23:30:00Z')), '20261103-1a2b3c4');
  assert.equal(tagOf('0.4.0-dev.1'), 'p3dev-0.4.0-dev.1');
  for (const v of ['', '-x', 'a/b', 'a..b', 'a b', 'x.lock', 'x.', 'a'.repeat(65), 'v$1']) assert.throws(() => checkVersion(v), /the version must be/, v);
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
  assert.ok(text.includes(`1. \`gh workflow run process-dev-release.yml --repo o/p --ref tranche -f version=${r.version} -f commit=${tip}\``), text);
  assert.match(text, /2\. watch the run: https:\/\/github\.com\/o\/p\/actions\/workflows\/process-dev-release\.yml\?query=branch%3Atranche\n/);
  assert.match(text, /3\. `node \.process\/tool\/p3\.mjs release dev --record <that run's url>`/);
  assert.equal(releaseDev(root, { io, slug, version: '0.4.0-dev.1', log: quiet }).version, '0.4.0-dev.1');
  assert.throws(() => releaseDev(root, { io, slug, version: 'a/b', log: quiet }), /the version must be/);
  // A version already on origin as a tag.
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
    getRun: (s, id) => ({ id, path: '.github/workflows/process-dev-release.yml', status: 'completed', conclusion: 'success', event: 'workflow_dispatch', head_branch: 'tranche', display_title: 'p3dev-release 0.4.0', head_sha: sha, html_url: `https://github.com/o/p/actions/runs/${id}` }),
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
  // Only a dispatch on the tranche, titled with its version.
  assert.throws(() => releaseDev(root, { record: '79', io: { ...rio, getRun: (s, id) => ({ ...rio.getRun(s, id), event: 'push', head_branch: 'p3dev-release/0.4.0' }) }, slug, log: quiet }), /run 79 is a push on p3dev-release\/0\.4\.0, not a dispatch on tranche/);
  assert.throws(() => releaseDev(root, { record: '79', io: { ...rio, getRun: (s, id) => ({ ...rio.getRun(s, id), head_branch: 'job/x' }) }, slug, log: quiet }), /not a dispatch on tranche/);
  assert.throws(() => releaseDev(root, { record: '79', io: { ...rio, getRun: (s, id) => ({ ...rio.getRun(s, id), display_title: 'other' }) }, slug, log: quiet }), /titled "other", not p3dev-release <version>/);
  assert.throws(() => releaseDev(root, { record: '79', io: { ...rio, getRun: (s, id) => ({ ...rio.getRun(s, id), display_title: 'p3dev-release a/b' }) }, slug, log: quiet }), /the version must be/);
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

test('release run: a check that prints 1,600 lines keeps every line in its file; the log says how many were cut and where', () => {
  const long = { name: 'long', argv: ['node', '-e', "for (let i = 1; i <= 1600; i++) console.log('line ' + i + ' ' + 'y'.repeat(20))"] };
  const root = makeRepo({ 'process/config.json': { release: { checks: [long], assemble: ['node', '-e', '0'], out: 'rel' } } });
  const logDir = mkdtempSync(join(tmpdir(), 'p3-steps-'));
  const notes = [];
  let shown = '';
  const write = process.stdout.write;
  process.stdout.write = (t) => { shown += t; return true; };
  try { assert.equal(releaseRun(root, 'checks', { log: (m) => notes.push(m), logDir }).ok, true); } finally { process.stdout.write = write; }
  const file = join(logDir, '01-long.log');
  assert.equal(readFileSync(file, 'utf8').split('\n').filter((l) => l.startsWith('line ')).length, 1600);
  assert.ok(shown.length === 20000 && shown.endsWith('line 1600 yyyyyyyyyyyyyyyyyyyy\n'));
  const cut = notes.join('\n').match(/\[(\d+) line\(s\) left out before this tail; the whole output is in (\S+)\]/);
  assert.equal(cut[2], file);
  assert.equal(Number(cut[1]) + shown.split('\n').filter((l) => l).length, 1600, 'left out plus shown (the first perhaps in part) is every line');
  assert.ok(notes.includes(`full output: ${file}`));
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
test('the shim: parses; dispatch only, with version and commit; read-only checks and assemble; publish alone writes, in p3dev-release, and runs no product code', (t) => {
  const py = spawnSync('python3', ['-c', 'import sys,json,yaml; print(json.dumps(yaml.safe_load(open(sys.argv[1]))))', SHIM], { encoding: 'utf8' });
  if (py.status !== 0) { t.skip(`no YAML parser here: ${py.stderr.trim().split('\n').at(-1)}`); return; }
  const w = JSON.parse(py.stdout);
  const on = w.true ?? w.on; // PyYAML reads the key on as true
  assert.deepEqual(Object.keys(on), ['workflow_dispatch']);
  assert.deepEqual(Object.keys(on.workflow_dispatch.inputs), ['version', 'commit']);
  assert.ok(Object.values(on.workflow_dispatch.inputs).every((i) => i.required === true && i.type === 'string'));
  assert.equal(w['run-name'], 'p3dev-release ${{ inputs.version }}');
  assert.equal(w.jobs.publish.environment, 'p3dev-release');
  assert.equal(w.jobs.checks.environment, undefined);
  assert.equal(w.jobs.assemble.environment, undefined);
  // An input reaches a shell only through env, never spliced into a run.
  for (const job of Object.values(w.jobs)) for (const s of job.steps) assert.doesNotMatch(s.run || '', /\$\{\{\s*(inputs|github\.event)/, s.name);
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
  assert.doesNotMatch(pub, /merge-base --is-ancestor|GITHUB_REF_NAME|--branch/);
  assert.match(pub, /--draft --latest=false --verify-tag/);
  assert.doesNotMatch(pub, /gh release edit|--draft=false|--prerelease=false|make_latest=true/);
  assert.match(pub, /refs\/tags\/\$TAG/);
  // One archive of release.out with its paths kept, SHA256SUMS over it, signed there; no per-file assets.
  assert.match(pub, /-p3dev-\$VERSION\.tar\.gz/);
  assert.match(pub, /tar -C \\"\$RUNNER_TEMP\/release\\" [^"]*-czf \\"\$RUNNER_TEMP\/assets\/\$name\\" \./);
  assert.match(pub, /sha256sum \\"\$name\\" > SHA256SUMS/);
  assert.match(pub, /release sign \\"\$RUNNER_TEMP\/assets\\"/);
  assert.match(pub, /find \\"\$RUNNER_TEMP\/assets\\" -maxdepth 1 -type f/);
  assert.doesNotMatch(pub, /uniq -d|find \\"\$RUNNER_TEMP\/release\\"/);
  const sign = w.jobs.publish.steps.find((s) => /release sign/.test(s.run || ''));
  assert.equal(sign.if, "steps.cfg.outputs.sign != ''");
  // Each action is pinned by its full commit.
  for (const job of Object.values(w.jobs)) for (const s of job.steps) if (s.uses) assert.match(s.uses, /@[0-9a-f]{40}$/, s.uses);
});

// The shim's archive step, run as written: two files sharing a base name (the copy's two
// worker.json, 4 Nov) both reach one archive with their paths, and SHA256SUMS covers it.
test('the shim: the archive step keeps two same-named files under their paths, SHA256SUMS over the archive', (t) => {
  const py = spawnSync('python3', ['-c', 'import sys,json,yaml; print(json.dumps(yaml.safe_load(open(sys.argv[1]))))', SHIM], { encoding: 'utf8' });
  if (py.status !== 0) { t.skip('no YAML parser here'); return; }
  const step = JSON.parse(py.stdout).jobs.publish.steps.find((s) => s.name === 'the archive and SHA256SUMS');
  const tmp = mkdtempSync(join(tmpdir(), 'p3-arc-'));
  write(join(tmp, 'release'), { 'a/worker.json': 'one', 'b/worker.json': 'two', 'top.txt': 't' });
  const r = spawnSync('bash', ['-eo', 'pipefail', '-c', step.run], { encoding: 'utf8', env: { ...process.env, RUNNER_TEMP: tmp, GITHUB_REPOSITORY: 'o/prod', ...step.env, VERSION: '0.4.0' } });
  assert.equal(r.status, 0, r.stderr);
  const name = 'prod-p3dev-0.4.0.tar.gz';
  assert.deepEqual(readdirSync(join(tmp, 'assets')).sort(), ['SHA256SUMS', name]);
  const list = spawnSync('tar', ['-tzf', join(tmp, 'assets', name)], { encoding: 'utf8' }).stdout.split('\n').filter((l) => l && !l.endsWith('/')).sort();
  assert.deepEqual(list, ['./a/worker.json', './b/worker.json', './top.txt']);
  const hash = createHash('sha256').update(readFileSync(join(tmp, 'assets', name))).digest('hex');
  assert.equal(readFileSync(join(tmp, 'assets', 'SHA256SUMS'), 'utf8'), `${hash}  ${name}\n`);
  // Signing the assets gives the same SHA256SUMS and a signature over it.
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  assert.deepEqual(releaseSign(join(tmp, 'assets'), { key: privateKey.export({ type: 'pkcs8', format: 'pem' }), log: quiet }).files, [name]);
  const sums = readFileSync(join(tmp, 'assets', 'SHA256SUMS'));
  assert.equal(String(sums), `${hash}  ${name}\n`);
  assert.ok(verify(null, sums, publicKey, Buffer.from(readFileSync(join(tmp, 'assets', 'SHA256SUMS.sig'), 'utf8').trim(), 'base64')));
});

// The publish job's tranche step, run as written: the tranche is named by the default branch's
// config (gh api, stubbed), or is "tranche" when that has none; another ref, a dispatched commit
// whose config names another tranche, or a tip other than the judged commit is refused.
test('the shim: publish refuses a dispatch off the tranche, a commit naming another tranche, or a moved tip', (t) => {
  const py = spawnSync('python3', ['-c', 'import sys,json,yaml; print(json.dumps(yaml.safe_load(open(sys.argv[1]))))', SHIM], { encoding: 'utf8' });
  if (py.status !== 0) { t.skip('no YAML parser here'); return; }
  const step = JSON.parse(py.stdout).jobs.publish.steps.find((s) => s.name === 'the dispatch is on the tranche, at the judged tip');
  const tmp = mkdtempSync(join(tmpdir(), 'p3-disp-'));
  const repo = makeRepo({ 'process/config.json': { tranche: 'tr' } });
  const sha = git(['rev-parse', 'HEAD'], { cwd: repo });
  const other = commit(repo, { 'process/config.json': JSON.stringify({ tranche: 'p3dev-release/x' }) });
  // gh prints the error body to stdout on a 404, as the real one does.
  write(tmp, { 'bin/gh': '#!/bin/sh\nif [ "$MAIN_CFG" = 500 ]; then echo \'{"message":"Server Error","status":"500"}\'; exit 1; elif [ -n "$MAIN_CFG" ]; then printf %s "$MAIN_CFG"; else echo \'{"message":"Not Found","status":"404"}\'; exit 1; fi\n' });
  spawnSync('chmod', ['+x', join(tmp, 'bin/gh')]);
  const runStep = (env) => spawnSync('bash', ['-eo', 'pipefail', '-c', step.run], { cwd: repo, encoding: 'utf8', env: { ...process.env, PATH: `${join(tmp, 'bin')}:${process.env.PATH}`, GITHUB_REPOSITORY: 'o/p', DEFAULT: 'main', MAIN_CFG: '{"tranche":"tr"}', GITHUB_REF: 'refs/heads/tr', GITHUB_SHA: sha, COMMIT: sha, ...env } });
  assert.equal(runStep({}).status, 0, runStep({}).stderr);
  assert.match(runStep({ GITHUB_REF: 'refs/heads/p3dev-release/x' }).stdout, /not refs\/heads\/tr; a development release is cut only from the tranche/);
  // main has no config: the default name, so a tranche named tr is refused.
  assert.match(runStep({ MAIN_CFG: '' }).stdout, /not refs\/heads\/tranche/);
  // Any other failure to read it refuses, rather than fall back to the default name.
  const down = runStep({ MAIN_CFG: '500', GITHUB_REF: 'refs/heads/tranche' });
  assert.notEqual(down.status, 0);
  assert.match(down.stdout, /the default branch's config could not be read/);
  // The dispatched commit names its own branch as the tranche.
  const own = runStep({ GITHUB_REF: 'refs/heads/tr', GITHUB_SHA: other, COMMIT: other });
  assert.notEqual(own.status, 0);
  assert.match(own.stdout, /config names another tranche than main's \(tr\)/);
  assert.match(runStep({ COMMIT: other }).stdout, /not [0-9a-f]{40}, the tip p3 release dev judged/);
});
