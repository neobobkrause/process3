// Foundations, Certification (MNT-10, SHM-3); Build Plan Phase 3: onboarding's size measurement
// against the certified ranges, and the release note's fields on the development release's draft.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { MARKER, releaseBody } from '../lib/release.mjs';
import { parseBlock } from '../lib/github.mjs';
import { setupCheck } from '../lib/setup.mjs';
import { FIGURES, NO_RANGE, RANGES, compareRanges, loadRanges, measureSize, platformRows, sizeLines } from '../lib/size.mjs';
import { DEFAULTS, git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const P3 = join(dirname(fileURLToPath(import.meta.url)), '..', 'p3.mjs');
const CFG = { modules_file: 'build/modules.json', lockfiles: ['package-lock.json', 'web/package-lock.json'], generated: [{ paths: ['gen/'], regenerate: ['x'], verify: ['y'] }] };
const product = () => makeRepo({
  'process/config.json': CFG,
  'build/modules.json': { modules: [{ id: 'a', paths: ['src/a/'] }, { id: 'b', paths: ['src/b/'] }, { id: 'c', paths: ['src/c/'] }] },
  'build/layers.md': '| layer | modules |\n|---|---|\n| 1 | a, b |\n| 2 | c |\n',
  'build/requirements/a.md': 'x'.repeat(100),
  'build/requirements/b.md': 'x'.repeat(300),
  'build/requirements/c.md': 'x'.repeat(80000),
  'build/requirements/notes.txt': 'not a requirement file',
  'process/ledger/a.json': entry('a'),
  'process/ledger/b.json': entry('b'),
});
const cfgOf = (extra = {}) => ({ ...DEFAULTS, ...CFG, ...extra });

test('size: modules, layers, requirement files against the cap, suites, lock files, generated rows, tracked files', () => {
  const root = product();
  const s = measureSize(root, cfgOf());
  assert.equal(s.commit, git(['rev-parse', 'HEAD'], { cwd: root }));
  assert.deepEqual(Object.keys(s.figures), FIGURES);
  assert.equal(s.figures.modules, 3);
  assert.equal(s.figures.layers, 2);
  assert.equal(s.figures.requirement_files, 3);
  assert.equal(s.figures.requirement_median_bytes, 300);
  assert.equal(s.figures.requirement_largest_bytes, 80000);
  assert.equal(s.requirements_cap, 70000);
  assert.equal(s.over_cap, 1);
  assert.equal(s.figures.module_suites, 2);
  assert.equal(s.figures.suite_seconds, null);
  assert.equal(s.figures.lock_files, 2);
  assert.equal(s.figures.generated_rows, 1);
  assert.equal(s.figures.tracked_files, 9);
  assert.ok(s.figures.tracked_bytes > 80400);
  assert.ok(s.notes.some((n) => /no recent gate row/.test(n)));
  const lines = sizeLines(s).join('\n');
  assert.match(lines, /requirement files 3: median 300 bytes, largest 80000 bytes; 1 over requirements_cap 70000/);
  assert.match(lines, /lock files 2, generated rows 1/);
  // Read from git at the ref: an uncommitted file is not measured, and an older ref is its own tree.
  writeFileSync(join(root, 'build/requirements/d.md'), 'x');
  assert.equal(measureSize(root, cfgOf()).figures.requirement_files, 3);
  const first = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'build/requirements/d.md': 'x' });
  assert.equal(measureSize(root, cfgOf()).figures.requirement_files, 4);
  assert.equal(measureSize(root, cfgOf(), { ref: first }).figures.requirement_files, 3);
  assert.throws(() => measureSize(root, cfgOf(), { ref: 'nope' }), /not a commit/);
});

test('size: unmeasured figures are named, never guessed', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const s = measureSize(root, { ...DEFAULTS });
  assert.equal(s.figures.modules, null);
  assert.equal(s.figures.layers, null);
  assert.equal(s.figures.requirement_files, 0);
  assert.equal(s.figures.requirement_median_bytes, null);
  assert.ok(s.notes.some((n) => /no modules_file/.test(n)));
  assert.ok(s.notes.some((n) => /build\/layers\.md is not at HEAD/.test(n)));
  const bad = makeRepo({ 'm.json': '{"x":1}' });
  assert.ok(measureSize(bad, { ...DEFAULTS, modules_file: 'm.json' }).notes.some((n) => /no "modules" list/.test(n)));
});

test('size: suite time only from a gate row at most two weeks old', () => {
  const root = product();
  const at = Date.parse('2026-11-04T00:00:00Z');
  const recent = { run: { suite_seconds: 412, at: '2026-11-01T00:00:00Z' } };
  assert.equal(measureSize(root, cfgOf(), { gateRow: recent, at }).figures.suite_seconds, 412);
  const old = measureSize(root, cfgOf(), { gateRow: { run: { suite_seconds: 9, at: '2026-10-01T00:00:00Z' } }, at });
  assert.equal(old.figures.suite_seconds, null);
  assert.ok(old.notes.some((n) => /older than 14 days/.test(n)));
  assert.ok(measureSize(root, cfgOf(), { gateRow: { run: { suite_seconds: 9, at: '2026-12-01T00:00:00Z' } }, at }).notes.some((n) => /dated in the future/.test(n)));
  assert.equal(measureSize(root, cfgOf(), { gateRow: { run: { suite: 'skipped', at: '2026-11-03T00:00:00Z' } }, at }).figures.suite_seconds, null);
});

test('ranges: empty today; no certified range yet, inside, or outside named per figure', () => {
  assert.deepEqual(JSON.parse(readFileSync(RANGES, 'utf8')), { releases: [] });
  assert.deepEqual(loadRanges(), []);
  assert.deepEqual(loadRanges('not json'), []);
  assert.deepEqual(loadRanges(null), []);
  assert.deepEqual(loadRanges('{"releases": [null, 3, {"release": "1"}]}'), [{ release: '1' }]);
  const figures = { modules: 40, requirement_largest_bytes: 140000, tracked_bytes: 5, suite_seconds: null };
  const none = compareRanges(figures, []);
  assert.equal(none.state, NO_RANGE);
  assert.deepEqual(none.lines, ['certified range: no certified range yet (informational)']);
  const releases = [
    { release: '1.0.0', product: { modules: 30, requirement_largest_bytes: 137301, tracked_bytes: 10 }, platform_rows: ['plt-old'] },
    { release: '1.1.0', product: { modules: 60, requirement_largest_bytes: 120000, tracked_bytes: 10 }, platform_rows: ['plt-2026-11-01', 'plt-cf-2026-11-02'] },
  ];
  const out = compareRanges(figures, releases);
  assert.equal(out.state, 'outside');
  assert.deepEqual(out.outside, [{ figure: 'requirement_largest_bytes', value: 140000, max: 137301 }]);
  assert.match(out.lines[0], /outside on requirement_largest_bytes 140000 > 137301/);
  assert.match(out.lines[1], /not compared: .*layers.*suite_seconds/);
  assert.equal(compareRanges({ ...figures, requirement_largest_bytes: 1 }, releases).state, 'inside');
  assert.deepEqual(platformRows(releases), ['plt-2026-11-01', 'plt-cf-2026-11-02']);
  assert.deepEqual(platformRows([]), []);
});

test('p3 size prints the figures and the range, and --out writes them as JSON', () => {
  const root = product();
  const out = join(mkdtempSync(join(tmpdir(), 'p3-size-')), 'size.json');
  const r = spawnSync('node', [P3, 'size', '--out', out], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /modules 3, layers 2/);
  assert.match(r.stdout, /certified range: no certified range yet \(informational\)/);
  const j = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(j.figures.module_suites, 2);
  assert.equal(j.range.state, NO_RANGE);
  assert.equal(spawnSync('node', [P3, 'size', '--at', 'nope'], { cwd: root, encoding: 'utf8' }).status, 1);
});

test('setup check: the size against the pin\'s ranges.json is informational, never a missing condition', () => {
  const root = product();
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main:tranche'], { cwd: root });
  const log = [];
  const pin = { sha: 'p'.repeat(40), file: () => null, list: () => [] };
  const res = setupCheck(root, { slug: 'o/r', conditions: [], io: { api: () => null, pin, openPRs: () => [] }, log: (m) => log.push(m) });
  assert.equal(res.ok, true);
  assert.deepEqual(res.missing, []);
  assert.equal(res.size.figures.modules, 3);
  assert.equal(res.size.range.state, NO_RANGE);
  assert.ok(log.includes('certified range: no certified range yet (informational)'), log.join('\n'));
  const ranged = setupCheck(root, { slug: 'o/r', conditions: [], io: { api: () => null, pin, openPRs: () => [], ranges: [{ product: { modules: 2 } }] }, log: () => {} });
  assert.equal(ranged.ok, true);
  assert.deepEqual(ranged.size.range.outside, [{ figure: 'modules', value: 3, max: 2 }]);
});

test('release body: the release note\'s fields: pin, product sizes, checks, the pin\'s platform rows; development only', () => {
  const dir = mkdtempSync(join(tmpdir(), 'p3-body-'));
  const checks = join(dir, 'checks.json');
  writeFileSync(checks, JSON.stringify({ step: 'checks', checks: [{ name: 'a', exit: 0 }, { name: 'b', exit: 1 }] }));
  const size = join(dir, 'size.json');
  const s = measureSize(product(), cfgOf());
  writeFileSync(size, JSON.stringify({ ...s, range: { state: NO_RANGE } }));
  const pin = 'f'.repeat(40);
  const b = releaseBody(checks, { version: '1', commit: 'abc', pin, sizeFile: size });
  assert.match(b, /Development only/);
  assert.doesNotMatch(b, /certif/i);
  assert.match(b, new RegExp(`process pin: ${pin}`));
  assert.match(b, /product sizes: modules 3, layers 2, .*suite_seconds unmeasured/);
  assert.match(b, /checks: 1 of 2 passed/);
  assert.match(b, /platform rows the pin names: none yet/);
  const data = parseBlock(b, MARKER);
  assert.equal(data.pin, pin);
  assert.deepEqual(data.size.figures, s.figures);
  assert.equal(data.checks.length, 2);
  assert.deepEqual(data.platform_rows, []);
  const named = releaseBody(checks, { version: '1', commit: 'abc', pin, sizeFile: size, ranges: [{ platform_rows: ['plt-1'] }] });
  assert.match(named, /platform rows the pin names: plt-1/);
  assert.doesNotMatch(named, /certif/i);
  // Unread files say so; the body is still written, also from the error file a failed p3 size --out writes.
  const err = join(dir, 'err.json');
  writeFileSync(err, JSON.stringify({ error: 'x', findings: [] }));
  assert.match(releaseBody(checks, { version: '1', commit: 'abc', sizeFile: err }), /product sizes: unread/);
  const none = releaseBody('/nonexistent', { version: '1', commit: 'abc' });
  assert.match(none, /process pin: unread/);
  assert.match(none, /product sizes: unread/);
  assert.match(none, /checks: unread/);
});

test('the dev-release shim: size before any product code in job checks, uploaded with the checks; the body gets the pin and the size', () => {
  const shim = readFileSync(join(dirname(P3), '..', 'shims', 'process-dev-release.yml'), 'utf8');
  const checksJob = shim.slice(shim.indexOf('\n  checks:'), shim.indexOf('\n  assemble:'));
  assert.ok(checksJob.indexOf('p3.mjs" size --out "$RUNNER_TEMP/size.json"') > 0);
  assert.ok(checksJob.indexOf('size --out') < checksJob.indexOf('release run checks'));
  assert.match(checksJob, /\$\{\{ runner\.temp \}\}\/checks\.json\n\s+\$\{\{ runner\.temp \}\}\/size\.json/);
  const publish = shim.slice(shim.indexOf('\n  publish:'));
  assert.match(publish, /echo "pin=\$pin" >> "\$GITHUB_OUTPUT"/);
  assert.match(publish, /PIN: \$\{\{ steps\.cfg\.outputs\.pin \}\}/);
  assert.match(publish, /release body "\$RUNNER_TEMP\/checks\/checks\.json" --version "\$VERSION" --commit "\$GITHUB_SHA" --pin "\$PIN" --size "\$RUNNER_TEMP\/checks\/size\.json"/);
  assert.doesNotMatch(publish, /p3\.mjs" size/); // publish runs no product code and measures nothing
});
