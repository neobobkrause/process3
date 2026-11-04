// Build gate-chromium (4 Nov): the gate job installs the Chromium the product's lock files pin,
// read from the merged checkout at run time, before the suite; CHROMIUM names it and the log
// names its version. The shim's two steps run here under bash with npx stubbed.
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { makeRepo } from './helpers.mjs';

const SHIM = readFileSync(join(import.meta.dirname, '..', '..', 'shims', 'process-gate.yml'), 'utf8');
const gateJob = SHIM.slice(SHIM.indexOf('\n  gate:\n'), SHIM.indexOf('\n  post:\n'));
const stepRun = (name) => {
  const step = gateJob.slice(gateJob.indexOf(`- name: ${name}\n`));
  const body = [];
  for (const l of step.slice(step.indexOf('run: |\n') + 7).split('\n')) { if (l.trim() && !l.startsWith('          ')) break; body.push(l.slice(10)); }
  return body.join('\n');
};
const lock = (pkgs) => JSON.stringify({ lockfileVersion: 3, packages: Object.fromEntries(Object.entries(pkgs).map(([k, v]) => [k, { version: v }])) });

function bash(script, cwd, env) {
  const tmp = mkdtempSync(join(tmpdir(), 'p3-browser-'));
  const f = join(tmp, 's.sh');
  writeFileSync(f, script);
  for (const k of ['GITHUB_OUTPUT', 'GITHUB_ENV']) writeFileSync(join(tmp, k), '');
  const r = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', f], { cwd, encoding: 'utf8', env: { ...process.env, RUNNER_TEMP: tmp, GITHUB_OUTPUT: join(tmp, 'GITHUB_OUTPUT'), GITHUB_ENV: join(tmp, 'GITHUB_ENV'), ...env } });
  return { ...r, out: readFileSync(join(tmp, 'GITHUB_OUTPUT'), 'utf8'), env: readFileSync(join(tmp, 'GITHUB_ENV'), 'utf8') };
}

// A stub npx: records its calls; `install` lays a chrome down under the build's location,
// `--dry-run` prints that location as playwright does.
function stubNpx(calls, { noChrome = false, failFirst = 0, failDry = false } = {}) {
  const bin = mkdtempSync(join(tmpdir(), 'p3-npx-'));
  const home = join(bin, 'ms-playwright');
  writeFileSync(join(bin, 'npx'), `#!/bin/bash
echo "\${PLAYWRIGHT_HOST_PLATFORM_OVERRIDE:-native} $*" >> ${calls}
v=\${2#playwright-core@}; loc=${home}/chromium-$v
if [ "$4" = "--dry-run" ]; then ${failDry ? 'echo "unknown option --dry-run" >&2; exit 1; ' : ''}printf 'browser: chromium version 141\\n  Install location:    %s\\n  Download url: x\\n\\nbrowser: ffmpeg\\n  Install location:    ${home}/ffmpeg-1011\\n\\nbrowser: chromium-headless-shell\\n  Install location:    ${home}/chromium_headless_shell-$v\\n' "$loc"; exit 0; fi
n=$(grep -cE -- ' install (--with-deps )?chromium$' ${calls}); if [ "$n" -le ${failFirst} ]; then exit 1; fi
mkdir -p "${home}/chromium_headless_shell-$v/chrome-linux"; printf x > "${home}/chromium_headless_shell-$v/chrome-linux/headless_shell"
${noChrome ? '' : `mkdir -p "$loc/chrome-linux"; printf '#!/bin/bash\\necho "Chromium 141.0.%s"\\n' "$v" > "$loc/chrome-linux/chrome"; chmod +x "$loc/chrome-linux/chrome"`}
`);
  chmodSync(join(bin, 'npx'), 0o755);
  return { PATH: `${bin}:${process.env.PATH}`, home };
}

test('the versions: the top-level playwright-core of each lock file the gate installs, sorted, none hand-written; nothing else', () => {
  const root = makeRepo({
    'site/package-lock.json': lock({ '': '0.0.0', 'node_modules/playwright-core': '1.56.1' }),
    'bio-plane/src/journey-check/package-lock.json': lock({ 'node_modules/playwright-core': '1.56.1', 'node_modules/x/node_modules/playwright-core': '1.9.0' }),
    'pre/package-lock.json': lock({ 'node_modules/playwright-core': '1.57.0-alpha-2025-10-01' }),
    'a/package-lock.json': lock({ 'node_modules/playwright': '2.0.0', 'node_modules/not-playwright-core': '3.0.0' }),
    'b/package-lock.json': lock({ 'node_modules/playwright-core': '1.2.3; rm -rf /' }),
    'c/package-lock.json': '{ not json',
    'fixture/package-lock.json': lock({ 'node_modules/playwright-core': '1.40.0' }),
  });
  const LOCKFILES = JSON.stringify(['site/package-lock.json', 'bio-plane/src/journey-check/package-lock.json', 'pre/package-lock.json', 'a/package-lock.json', 'b/package-lock.json', 'c/package-lock.json', 'missing/package-lock.json', '../x/package-lock.json']);
  const r = bash(stepRun("the browser the product's lock files pin"), root, { LOCKFILES });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.out, 'versions=1.56.1 1.57.0-alpha-2025-10-01\n', 'no nested or unlisted lock file, no bad version');
  assert.match(r.stdout, /::warning::browser: the lock files pin playwright-core 1\.56\.1 1\.57\.0-alpha-2025-10-01; CHROMIUM names the newest/);
  const one = bash(stepRun("the browser the product's lock files pin"), root, { LOCKFILES: JSON.stringify(['site/package-lock.json']) });
  assert.equal(one.out, 'versions=1.56.1\n');
  assert.doesNotMatch(one.stdout, /::warning::/);
  for (const LOCKFILES of ['[]', '', '"site/package-lock.json"', JSON.stringify(['a/package-lock.json'])]) {
    const n = bash(stepRun("the browser the product's lock files pin"), root, { LOCKFILES });
    assert.equal(n.status, 0, n.stderr);
    assert.equal(n.out, 'versions=\n', LOCKFILES);
    assert.match(n.stdout, /no playwright-core in the lock files the gate installs; none installed/);
  }
  // The pin step hands the config's lock files on.
  assert.match(gateJob, /echo "lockfiles=\$\(echo "\$cfg" \| jq -c '\.lockfiles \/\/ \[\]'\)" >> "\$GITHUB_OUTPUT"/);
  assert.match(gateJob, /LOCKFILES: \$\{\{ steps\.pin\.outputs\.lockfiles \}\}/);
});

test('the install: each pinned build with its system libraries, CHROMIUM names the newest, the log names the version', () => {
  const dir = mkdtempSync(join(tmpdir(), 'p3-calls-'));
  const calls = join(dir, 'calls');
  const s = stubNpx(calls);
  const r = bash(stepRun('install the browser'), dir, { PATH: s.PATH, VERSIONS: '1.9.0 1.56.1' });
  assert.equal(r.status, 0, r.stderr);
  const c = readFileSync(calls, 'utf8').trim().split('\n');
  assert.deepEqual(c.filter((l) => / install (--with-deps )?chromium$/.test(l)), ['native -y playwright-core@1.9.0 install --with-deps chromium', 'native -y playwright-core@1.56.1 install --with-deps chromium']);
  assert.equal(r.env, `CHROMIUM=${s.home}/chromium-1.56.1/chrome-linux/chrome\n`);
  assert.match(r.stdout, /::notice::browser: Chromium 141\.0\.1\.56\.1 for playwright-core 1\.56\.1 at /);
  assert.match(r.stdout, /::notice::browser: Chromium 141\.0\.1\.9\.0 for playwright-core 1\.9\.0 at /);
  assert.match(r.stdout, /browser: installed in \d+ s/);
  // An install that leaves no Chromium stops the gate rather than running the tests without one.
  const bad = bash(stepRun('install the browser'), dir, { PATH: stubNpx(join(dir, 'c2'), { noChrome: true }).PATH, VERSIONS: '1.56.1' });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stdout, /::error::browser: playwright-core 1\.56\.1 installed no Chromium/);
  assert.equal(bad.env, '');
  // A failed dry run is the same stop, with its line.
  const dry = bash(stepRun('install the browser'), dir, { PATH: stubNpx(join(dir, 'c5'), { failDry: true }).PATH, VERSIONS: '1.56.1' });
  assert.notEqual(dry.status, 0);
  assert.match(dry.stdout, /::error::browser: playwright-core 1\.56\.1 installed no Chromium under $/m);
  // A version that will not install for this OS (1.56.1 on Ubuntu 26.04): its ubuntu24.04-x64
  // build, without apt libraries, the dry run under the same override; two failures stop the gate.
  const c3 = join(dir, 'c3');
  const once = bash(stepRun('install the browser'), dir, { PATH: stubNpx(c3, { failFirst: 1 }).PATH, VERSIONS: '1.56.1' });
  assert.equal(once.status, 0, once.stderr);
  assert.deepEqual(readFileSync(c3, 'utf8').trim().split('\n'), ['native -y playwright-core@1.56.1 install --with-deps chromium', 'ubuntu24.04-x64 -y playwright-core@1.56.1 install chromium', 'ubuntu24.04-x64 -y playwright-core@1.56.1 install --dry-run chromium']);
  assert.match(once.stdout, /::warning::browser: playwright-core 1\.56\.1 did not install for .*; trying its ubuntu24\.04-x64 build without system libraries/);
  assert.match(once.stdout, /::notice::browser: Chromium 141\.0\.1\.56\.1 for playwright-core 1\.56\.1 at .* \(the ubuntu24\.04-x64 build\)/);
  assert.match(once.env, /^CHROMIUM=.*chromium-1\.56\.1\/chrome-linux\/chrome\n$/);
  // A binary that does not run (missing libraries) stops the gate too.
  const nr = stubNpx(join(dir, 'c6'));
  const broken = bash(stepRun('install the browser').replace('if ! ver=$("$exe" --version)', 'if ! ver=$(false)'), dir, { PATH: nr.PATH, VERSIONS: '1.56.1' });
  assert.notEqual(broken.status, 0);
  assert.match(broken.stdout, /::error::browser: .*chrome \(playwright-core 1\.56\.1\) does not run here/);
  const twice = bash(stepRun('install the browser'), dir, { PATH: stubNpx(join(dir, 'c4'), { failFirst: 2 }).PATH, VERSIONS: '1.56.1' });
  assert.notEqual(twice.status, 0);
  assert.match(twice.stdout, /::error::browser: playwright-core 1\.56\.1 could not install Chromium \(twice\)/);
  assert.equal(twice.env, '');
});

test('the browser steps sit after the record check and before the gate, cached by the versions read', () => {
  const at = (s) => gateJob.indexOf(s);
  assert.ok(at('record-check --base') < at("- name: the browser the product's lock files pin"));
  assert.ok(at('- name: install the browser') < at('- name: gate\n'));
  const KEY = /key: p3-chromium-\$\{\{ runner\.os \}\}-\$\{\{ steps\.browser\.outputs\.versions \}\}/;
  const restore = gateJob.slice(at('uses: actions/cache/restore@'), at('- name: install the browser'));
  assert.match(restore, /if: steps\.browser\.outputs\.versions != ''/);
  assert.match(restore, KEY);
  // Saved after the install and before the gate step (no product code has run), on a miss only;
  // no step saves after the gate.
  const save = gateJob.slice(at('uses: actions/cache/save@'), at('- name: gate\n'));
  assert.ok(at('- name: install the browser') < at('uses: actions/cache/save@') && save.length > 0);
  assert.match(save, /if: steps\.browser\.outputs\.versions != '' && steps\.browser-cache\.outputs\.cache-hit != 'true'/);
  assert.match(save, KEY);
  assert.doesNotMatch(gateJob, /uses: actions\/cache@/, 'not the combined action, whose save runs at the end of the job');
  const install = gateJob.slice(at('- name: install the browser'), at('- name: gate\n'));
  assert.match(install, /^ {8}if: steps\.browser\.outputs\.versions != ''$/m);
  assert.match(install, /^ {8}timeout-minutes: 10$/m, 'a bound of its own inside the 45-minute job');
});
