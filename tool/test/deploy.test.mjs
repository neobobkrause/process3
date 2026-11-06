// Build Plan Phase 2, the deploy and walk: development deployments only (Bob's word, 3 Nov).
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, truncateSync, utimesSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { DEPLOYS_FILE, checkSlug, deployConfig, deployDev, readReport, redact, walkFindings, walkInternal, walkSummary } from '../lib/deploy.mjs';
import { status } from '../lib/status.mjs';
import { trancheClose } from '../lib/tranche.mjs';
import { DEFAULTS, git, loadConfig, run } from '../lib/util.mjs';
import { commit, entry, makeRepo, onState, openPassed, closeLayer } from './helpers.mjs';

const quiet = () => {};
const GUARD = 'p3dev guard: passed';
const node = (code) => ['node', '-e', code];
const DEP = {
  slug_prefix: 'p3dev-',
  dry_run: [node(`console.log('checking'); console.log(${JSON.stringify(GUARD)})`), ['node', '-e', `console.log(${JSON.stringify(GUARD)})`, '{slug}']],
  // The secret is made at run time, so it is in no argv: a step marks it, then prints it.
  deploy: node("const v = 's3cr3t' + '-value'; console.log('::add-mask::' + v); console.log('token ' + v + ' set')"),
  walk: [node("console.error('walked; ' + 's3cr3t' + '-value')")],
  guard_line: GUARD,
};
const cfgWith = (deploy) => ({ ...DEFAULTS, deploy });

test('deploy config: the keys validated; each stage an argv or a list of argvs; the prefix begins with p3dev-', () => {
  const d = deployConfig(cfgWith(DEP));
  assert.equal(d.dry_run.length, 2);
  assert.equal(d.deploy.length, 1);
  assert.equal(d.timeout_minutes, 30);
  assert.throws(() => deployConfig(DEFAULTS), /no "deploy" block/);
  assert.throws(() => deployConfig(cfgWith({ ...DEP, publish: true })), /unknown keys: publish/);
  for (const p of ['prod-', 'P3DEV-', undefined, 'p3dev_x']) assert.throws(() => deployConfig(cfgWith({ ...DEP, slug_prefix: p })), /slug_prefix must begin with p3dev-/, String(p));
  assert.throws(() => deployConfig(cfgWith({ ...DEP, walk: 'node w.mjs' })), /deploy.walk must be an argv/);
  assert.throws(() => deployConfig(cfgWith({ ...DEP, deploy: [] })), /deploy.deploy must be an argv/);
  assert.throws(() => deployConfig(cfgWith({ ...DEP, guard_line: '' })), /guard_line/);
  assert.throws(() => deployConfig(cfgWith({ ...DEP, timeout_minutes: 0 })), /whole minutes/);
  assert.equal(checkSlug('p3dev-l2'), 'p3dev-l2');
  for (const s of ['l2', 'prod-p3dev-l2', 'p3dev-L2', 'p3dev-', 'p3dev-a b']) assert.throws(() => checkSlug(s), /slug/, s);
});

test('redact: a line ::add-mask::<v> is never printed, and v is printed as ***', () => {
  const masks = new Set();
  assert.equal(redact('a\n::add-mask::abc\nkey abc here', masks), 'a\nkey *** here');
  assert.equal(redact('later abc', masks), 'later ***');
});

// A product with origin: layer 1 of two, its module complete, the deploy block in its config, and
// the plan `close` (a partial close: the end of the tranche), unless the test gives another config.
const unmet = '- **R1** *(not yet met: x)* text\n';
const PASS = "import test from 'node:test';\ntest('ok', () => {});\n";
const done = (id) => ({ ...entry(id, { requirements: `build/requirements/${id}.md`, status: { state: 'COMPLETE' } }), tests: [`test/${id}/`] });
const product = (deploy = DEP, config = { plan: 'close' }) => ({
  'process/config.json': { deploy, ...config },
  'build/layers.md': '| layer | what | modules |\n|---|---|---|\n| 1 | first | a |\n| 2 | next | d |\n',
  'build/requirements/a.md': unmet,
  'build/requirements/d.md': unmet,
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
const io = { compare: () => null };
const repo = 'o/p';
const rows = (bare) => git(['show', `process-state:${DEPLOYS_FILE}`], { cwd: bare }).split('\n').map((l) => JSON.parse(l));

test('deploy dev at a round close: dry run, deploy, walk, one row; secrets never printed; then refused while that tip is deployed clean', () => {
  const { root, bare } = withOrigin(product());
  assert.equal(closeLayer(root, '1').ok, true);
  const tip = git(['rev-parse', 'origin/tranche'], { cwd: root });
  // A slug that is not a development deployment's.
  assert.throws(() => deployDev(root, { io, repo, slug: 'civicsmith', log: quiet }), /does not begin with p3dev-/);
  const out = [];
  const r = deployDev(root, { io, repo, log: (m) => out.push(m) });
  const text = out.join('\n');
  assert.equal(r.ok, true, text);
  assert.equal(r.row.slug, 'p3dev-l1', 'the layer that closed');
  assert.equal(r.row.layer, 1);
  assert.equal(r.row.commit, tip);
  assert.deepEqual(r.row.results.map((x) => [x.stage, x.exit]), [['dry_run', 0], ['dry_run', 0], ['deploy', 0], ['walk', 0]]);
  assert.ok(r.row.results.filter((x) => x.stage === 'dry_run').every((x) => x.guard === true));
  assert.match(r.row.results[1].name, /p3dev-l1$/, '{slug} substituted');
  assert.equal(typeof r.row.minutes, 'number');
  assert.doesNotMatch(text, /s3cr3t-value/);
  assert.match(text, /token \*\*\* set/);
  assert.match(text, /walked; \*\*\*/);
  assert.doesNotMatch(JSON.stringify(rows(bare)), /s3cr3t-value/);
  assert.deepEqual(rows(bare), [r.row]);
  assert.equal(r.row.internal_walk, undefined, 'no internal_walk configured: none runs, none recorded');
  assert.throws(() => deployDev(root, { io, repo, log: quiet }), /is deployed and walked clean \(p3dev-l1\); the next round's close makes the next one/);
  // A dirty tree; then a checkout that is not the tranche tip.
  writeFileSync(join(root, 'build/requirements/a.md'), 'changed\n');
  assert.throws(() => deployDev(root, { io, repo, log: quiet }), /uncommitted changes/);
  git(['checkout', '-q', '--', '.'], { cwd: root });
  commit(root, { 'x.txt': 'x\n' });
  assert.throws(() => deployDev(root, { io, repo, log: quiet }), /not the tranche tip/);
});

test('deploy dev: a walk that prints 1,600 lines keeps every line in its file; the log has the tail, the cut notice and the path; its reports go to the state branch, counted in the row', () => {
  const walk = node(`const fs = require('fs'); const v = 's3cr3t' + '-value'; console.log('::add-mask::' + v);
    const steps = []; const failures = [];
    for (let i = 1; i <= 1600; i++) { console.log('screen ' + i + ' finding ' + 'x'.repeat(20) + (i === 1 ? ' ' + v : '')); steps.push({ journey: 'j', label: 's' + i, ok: i % 100 !== 0 }); if (i % 100 === 0) failures.push({ kind: i === 100 ? 'http-500' : 'layout', detail: 'at ' + i + (i === 100 ? ' ' + v : '') }); }
    fs.mkdirSync('out/live', { recursive: true });
    fs.writeFileSync('out/live/report.json', JSON.stringify({ arm: 'live', steps, failures }, null, 1));
    fs.writeFileSync('out/live/report.txt', steps.map((x) => (x.ok ? 'ok   ' : 'FAIL ') + x.label).join('\\n') + '\\n');
    fs.writeFileSync('out/live/big.txt', 'z'.repeat(300 * 1024));`);
  const reports = ['out/live/report.json', 'out/live/report.txt', 'out/live/big.txt', 'out/live/none.txt'];
  const { root, bare } = withOrigin({ ...product({ ...DEP, walk, walk_reports: reports }), 'process/config.json': { deploy: { ...DEP, walk, walk_reports: reports }, max_file_bytes: 200 * 1024, plan: 'close' } });
  assert.equal(closeLayer(root, '1').ok, true);
  const logDir = mkdtempSync(join(tmpdir(), 'p3-steps-'));
  const out = [];
  const r = deployDev(root, { io: { ...io, logDir }, repo, log: (m) => out.push(m) });
  const text = out.join('\n');
  assert.equal(r.ok, true, text);
  const file = join(logDir, readdirSync(logDir).find((f) => /-walk\.log$/.test(f)));
  const whole = readFileSync(file, 'utf8');
  for (let i = 1; i <= 1600; i++) assert.match(whole, new RegExp(`^screen ${i} finding`, 'm'));
  assert.match(whole, /screen 1 finding x+ \*\*\*/);
  assert.doesNotMatch(whole, /s3cr3t-value/);
  assert.match(text, /screen 1600 finding/);
  assert.doesNotMatch(text, /^screen 1 finding/m);
  const cut = text.match(/\[(\d+) line\(s\) left out before this tail; the whole output is in (\S+)\]/);
  assert.ok(cut, text.slice(0, 2000));
  assert.equal(cut[2], file);
  assert.equal(Number(cut[1]), whole.slice(0, -20000).match(/\n/g).length, 'the whole lines not shown');
  assert.ok(text.includes(`full output: ${file}`));
  // The reports: kept whole on the state branch, the row's counts, masked values as ***.
  const w = rows(bare).at(-1).walk;
  assert.deepEqual({ ...w, reports: undefined }, { steps: 1600, steps_ok: 1584, failures: 16, by_kind: { 'http-500': 1, layout: 15 }, reports: undefined });
  const dir = w.reports[0].stored.replace(/\/report\.json$/, '');
  assert.match(dir, /^deploys\/p3dev-l1\/\d{4}-\d\d-\d\dT[\d-]+Z$/);
  assert.deepEqual(w.reports.map((x) => x.stored), [`${dir}/report.json`, `${dir}/report.txt`, 'not stored, 307200 bytes', 'not written by this walk']);
  assert.equal(git(['show', `process-state:${dir}/report.txt`], { cwd: bare }).split('\n').length, 1600);
  const stored = git(['show', `process-state:${dir}/report.json`], { cwd: bare });
  assert.equal(JSON.parse(stored).steps.length, 1600);
  assert.match(stored, /at 100 \*\*\*/);
  assert.doesNotMatch(stored, /s3cr3t-value/);
  assert.throws(() => git(['show', `process-state:${dir}/big.txt`], { cwd: bare }));
  assert.match(text, /walk: 1600 steps, 1584 ok, 16 failures/);
  assert.throws(() => deployConfig(cfgWith({ ...DEP, walk_reports: ['a/r.txt', 'b/r.txt'] })), /walk_reports/);
  assert.throws(() => deployConfig(cfgWith({ ...DEP, walk_reports: ['../r.txt'] })), /walk_reports/);
});

test('deploy dev: a dry-run step that does not print the guard line stops it before the deploy; the row records it and a later run may go', () => {
  const ran = [];
  const { root, bare } = withOrigin(product({ ...DEP, dry_run: [node(`console.log(${JSON.stringify(GUARD)})`), node("console.log('p3dev guard: passed?')")] }));
  assert.equal(closeLayer(root, '1').ok, true);
  const out = [];
  const exec = (c, a, o) => { ran.push(a.join(' ')); assert.ok(o.unset.includes('GITHUB_TOKEN')); return { code: 0, stdout: a[1].includes('?') ? 'p3dev guard: passed?\n' : `${GUARD}\n`, stderr: '', seconds: 0 }; };
  const r = deployDev(root, { io: { ...io, exec }, repo, log: (m) => out.push(m) });
  assert.equal(r.ok, false);
  assert.equal(r.row.stopped, 'dry_run');
  assert.equal(ran.length, 2, 'neither the deploy nor the walk ran');
  assert.match(out.join('\n'), /refused: the dry run did not pass the guard/);
  assert.equal(rows(bare).length, 1);
  // A failed run is recorded, so the layer is still owed: the next run goes.
  const again = deployDev(root, { io: { ...io, exec: (c, a) => ({ code: 0, stdout: `${GUARD}\n`, stderr: '', seconds: 0 }) }, repo, log: quiet });
  assert.equal(again.ok, true);
  // A failing deploy step stops before the walk.
  const { root: r2 } = withOrigin(product({ ...DEP, deploy: node('process.exit(4)') }));
  assert.equal(closeLayer(r2, '1').ok, true);
  const f = deployDev(r2, { io, repo, log: quiet });
  assert.equal(f.row.stopped, 'deploy');
  assert.deepEqual(f.row.results.map((x) => x.stage), ['dry_run', 'dry_run', 'deploy']);
});

// Bob, 4 Nov: the deploy and walk at a round close only, never between layers; it never holds
// job starts. The live shape: layer 4 closed, layers 5 to 11 open.
const LIVE = (config = {}) => {
  const mods = [4, 5, 6, 7, 8, 9, 10, 11];
  return {
    'process/config.json': { deploy: DEP, completion_file: 'build/round.md', ...config },
    'build/layers.md': `| layer | what | modules |\n|---|---|---|\n${mods.map((n) => `| ${n} | l${n} | m${n} |`).join('\n')}\n`,
    ...Object.fromEntries(mods.map((n) => [`build/requirements/m${n}.md`, unmet])),
    'build/round.md': '# Completion round\n',
    'process/ledger/m4.json': done('m4'),
    'test/m4/x.test.mjs': PASS,
  };
};
const see = (root) => { const out = []; const s = status(root, { role: 'bob', log: (m) => out.push(m), io: statusIO }); return { s, text: out.join('\n') }; };
const push = (root, files) => { commit(root, files); git(['push', '-q', 'origin', 'HEAD:tranche'], { cwd: root }); };
const opened = (root) => { openPassed(root); git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root }); };
const closeIO = { compare: () => null, status: { ...statusIO, prFiles: () => [] } };

test('deploy dev between layers: layer 4 closed, 5 to 11 open (the first round open): refused, status owes none and lists next work; plan close (the last round): owed beside next work', () => {
  const { root } = withOrigin(LIVE());
  opened(root);
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  push(root, { 'x.txt': 'the tranche past main\n' });
  assert.equal(closeLayer(root, '4').ok, true);
  git(['checkout', '-q', 'origin/tranche'], { cwd: root });
  assert.throws(() => deployDev(root, { io, repo, log: quiet }), /no development deployment now: a deploy and walk belong to a round close, never between layers \(the first round is open: layers 5, 6, 7, 8, 9, 10, 11 not closed\); it becomes due when the round closes/);
  const before = see(root);
  assert.equal(before.s.deploy, null);
  assert.doesNotMatch(before.text, /deploy and walk/);
  assert.match(before.text, /build\/requirements\/m5\.md: 1 \(layer 5\)/);
  // A partial close named by the plan: the end of the tranche. Owed, and next work still listed.
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['reset', '-q', '--hard', 'origin/tranche'], { cwd: root });
  push(root, { 'process/config.json': { deploy: DEP, completion_file: 'build/round.md', plan: 'close' } });
  const after = see(root);
  assert.match(after.text, /deploy and walk at the round close: node \.process\/tool\/p3\.mjs deploy dev \(the last round \(plan close\) closed, not yet deployed\); job starts do not wait for it/);
  assert.match(after.text, /build\/requirements\/m5\.md: 1 \(layer 5\)/, 'next work beside the deploy act');
  assert.ok(after.s.next.length);
  assert.throws(() => trancheClose(root, { slug: repo, io: closeIO, log: quiet }), /the last round's deploy and walk are owed before the tranche closes/);
  const r = deployDev(root, { io, repo, log: quiet });
  assert.equal(r.ok, true);
  assert.equal(r.row.slug, 'p3dev-l4');
  assert.doesNotMatch(see(root).text, /deploy and walk/);
});

test('a failed walk holds tranche close until its findings are recorded; a deploy row at the next round\'s close clears it', () => {
  const report = node(`const fs = require('fs'); fs.mkdirSync('out', { recursive: true }); const fixed = fs.existsSync('fixed'); fs.writeFileSync('out/report.json', JSON.stringify({ steps: [{ ok: true }, { ok: fixed }, { ok: fixed }], failures: fixed ? [] : [{ kind: 'http-500' }, { kind: 'layout' }] })); process.exit(fixed ? 0 : 1)`);
  const dep = { ...DEP, walk: report, walk_reports: ['out/report.json'] };
  const { root } = withOrigin({ ...LIVE({ plan: 'close', deploy: dep }), 'out/.gitignore': '*\n' });
  opened(root);
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  push(root, { 'x.txt': 'the tranche past main\n' });
  const f = deployDev(root, { io, repo, log: quiet });
  assert.equal(f.ok, false);
  assert.equal(f.row.stopped, 'walk');
  assert.equal(f.row.walk.failures, 2);
  const run = `p3dev-end ${f.row.commit.slice(0, 10)}`;
  const held = /tranche close waits: the latest deploy and walk \(p3dev-end \w{10}\) stopped at walk with 2 finding\(s\), 0 recorded/;
  assert.throws(() => trancheClose(root, { slug: repo, io: closeIO, log: quiet }), held);
  assert.match(see(root).text, held);
  assert.doesNotMatch(see(root).text, /deploy and walk: /, 'not owed again until its findings are worked');
  // One recorded: still held. Both (a found mark owed, and a known gap): the close goes on.
  push(root, { 'build/requirements/m5.md': `${unmet}- **F1** *(not yet met: walk ${run})* http-500 on /\n`, 'build/round.md': '- [ ] C-1 · m5 · F1\n' });
  assert.throws(() => trancheClose(root, { slug: repo, io: closeIO, log: quiet }), /2 finding\(s\), 1 recorded/);
  push(root, { 'build/round.md': `- [ ] C-1 · m5 · F1\n- [ ] C-2 · whole product · layout on ${run}; deferred: a known gap (Bob)\n` });
  assert.ok(trancheClose(root, { slug: repo, io: closeIO, log: quiet }).ok);
  assert.doesNotMatch(see(root).text, /deploy and walk: /, 'the round is open');
  // The completion round's job merges: F1 met, its item ticked. Held again until a fresh deploy.
  push(root, { 'build/requirements/m5.md': unmet, 'build/round.md': `- [x] C-1 · m5 · F1\n- [ ] C-2 · whole product · layout on ${run}; deferred: a known gap (Bob)\n`, fixed: 'x\n' });
  const owed = see(root).text;
  assert.match(owed, /deploy and walk at the round close: node \.process\/tool\/p3\.mjs deploy dev \(the last round \(plan close\) closed since \w+ was deployed\); job starts do not wait for it/);
  const g = deployDev(root, { io, repo, log: quiet });
  assert.equal(g.ok, true);
  assert.equal(g.row.walk.failures, 0);
  assert.doesNotMatch(see(root).text, /tranche close waits|deploy and walk: /);
  assert.ok(trancheClose(root, { slug: repo, io: closeIO, log: quiet }).ok);
  assert.throws(() => deployDev(root, { io, repo, log: quiet }), /deployed and walked clean/);

  // A clean walk owes none when the tip moves after it (review: main into the tranche at its close).
  push(root, { 'y.txt': 'a plain pull request\n' });
  assert.doesNotMatch(see(root).text, /deploy and walk at/);
  // A later run that fails, the same slug: the earlier run's known gap does not record its findings.
  git(['rm', '-q', 'fixed'], { cwd: root });
  push(root, {});
  assert.equal(deployDev(root, { io, repo, log: quiet }).ok, false);
  assert.throws(() => trancheClose(root, { slug: repo, io: closeIO, log: quiet }), /2 finding\(s\), 0 recorded/);
});

test('deploy dev: a deploy row of an earlier tranche, its commit on main, does not count (review of PR 59)', () => {
  const { root } = withOrigin(product());
  const old = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['push', '-q', 'origin', 'HEAD:refs/heads/main'], { cwd: root });
  git(['fetch', '-q', 'origin', '+refs/heads/main:refs/remotes/origin/main'], { cwd: root });
  onState(root, { [DEPLOYS_FILE]: JSON.stringify({ row: 'dev-deploy', tranche: 'tranche', slug: 'p3dev-l1', commit: old, layer: 1, ok: true }) + '\n' });
  git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
  commit(root, { 'y.txt': 'y\n' });
  git(['push', '-q', 'origin', 'HEAD:refs/heads/tranche'], { cwd: root });
  assert.equal(closeLayer(root, '1').ok, true);
  git(['checkout', '-q', 'origin/tranche'], { cwd: root });
  const r = deployDev(root, { io, repo, log: quiet });
  assert.equal(r.ok, true, 'the stale row on main does not make layer 1 deployed');
  assert.throws(() => deployDev(root, { io, repo, log: quiet }), /deployed and walked clean/);
});

// Review of the walk-report storage (4 Nov): reports are product-written, so untrusted.
test('readReport: only a regular file inside the checkout, written since the walk began, within max; its size known before it is read', () => {
  const root = mkdtempSync(join(tmpdir(), 'p3-rep-'));
  const outside = mkdtempSync(join(tmpdir(), 'p3-out-'));
  writeFileSync(join(outside, 'secret.txt'), 'credentials');
  mkdirSync(join(root, 'out'));
  writeFileSync(join(root, 'out/ok.txt'), 'fine');
  symlinkSync(join(outside, 'secret.txt'), join(root, 'out/link.txt'));
  symlinkSync(outside, join(root, 'dirlink'));
  symlinkSync('ok.txt', join(root, 'out/inner.txt'));
  mkdirSync(join(root, 'out/adir'));
  writeFileSync(join(root, 'out/big.txt'), '');
  truncateSync(join(root, 'out/big.txt'), 3 * 1024 * 1024 * 1024); // sparse: reading it whole would fail
  writeFileSync(join(root, 'out/old.txt'), 'old');
  utimesSync(join(root, 'out/old.txt'), 1, 1);
  const since = Date.now() - 60000;
  assert.deepEqual(readReport(root, 'out/ok.txt', since, 100), { raw: 'fine' });
  assert.deepEqual(readReport(root, 'out/inner.txt', since, 100), { raw: 'fine' });
  assert.match(readReport(root, 'out/link.txt', since, 100).stored, /outside the checkout/);
  assert.match(readReport(root, 'dirlink/secret.txt', since, 100).stored, /outside the checkout/);
  assert.match(readReport(root, 'out/adir', since, 100).stored, /not a regular file/);
  assert.equal(readReport(root, 'out/big.txt', since, 100).stored, `not stored, ${3 * 1024 * 1024 * 1024} bytes`);
  assert.equal(readReport(root, 'out/old.txt', since, 100).stored, 'not written by this walk');
  assert.equal(readReport(root, 'out/none.txt', since, 100).stored, 'not written by this walk');
  if (spawnSync('mkfifo', [join(root, 'out/fifo')]).status === 0) assert.match(readReport(root, 'out/fifo', since, 100).stored, /not a regular file/);
});

test('walkSummary: any shape of report.json gives counts or nothing, never a throw; kinds printable, short and at most 50', () => {
  for (const t of ['x', 'null', '5', '{"steps":"x"}', '{"failures":5}', '{"failures":{}}', '{"failures":[null, 3, "a"]}']) assert.doesNotThrow(() => walkSummary(t), t);
  assert.deepEqual(walkSummary('{"failures":[null]}'), { steps: 0, steps_ok: 0, failures: 1, by_kind: { '(none)': 1 } });
  const s = walkSummary(JSON.stringify({ failures: [{ kind: 'constructor' }, { kind: '__proto__' }, { kind: 'a\n::error::x' }, { kind: 'k'.repeat(500) }] }));
  assert.equal(s.by_kind.constructor, 1);
  assert.equal(s.by_kind.__proto__, 1);
  assert.equal(s.by_kind['a : :error: :x'], 1);
  assert.equal(Object.keys(s.by_kind).find((k) => k.startsWith('k')).length, 80);
  const many = walkSummary(JSON.stringify({ failures: Array.from({ length: 200 }, (_, i) => ({ kind: `k${i}` })) }));
  assert.equal(Object.keys(many.by_kind).length, 51);
  assert.equal(many.by_kind['(other kinds)'], 150);
  for (const p of ['.', 'out/', 'out/./r.txt', 'a//b', '/abs', '.gitignore', 'out/.git', '']) assert.throws(() => deployConfig(cfgWith({ ...DEP, walk_reports: [p] })), /walk_reports/, p);
});

test('deploy dev: a mask declared in a later report, or held JSON-escaped, is *** in every stored report; a failed state write leaves the row and reports beside the step files', () => {
  const walk = node(`const fs = require('fs'); const v = 'q"t' + 'ok'; fs.mkdirSync('out', { recursive: true });
    fs.writeFileSync('out/a.txt', 'first ' + 'late' + 'secret\\n');
    fs.writeFileSync('out/b.json', JSON.stringify({ v, steps: [], failures: [] }));
    fs.writeFileSync('out/c.txt', '::add-mask::' + 'late' + 'secret\\n');
    console.log('::add-mask::' + v);`);
  const reports = ['out/a.txt', 'out/b.json', 'out/c.txt'];
  const { root, bare } = withOrigin({ ...product({ ...DEP, walk, walk_reports: reports }) });
  assert.equal(closeLayer(root, '1').ok, true);
  writeFileSync(join(bare, 'hooks', 'pre-receive'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const logDir = mkdtempSync(join(tmpdir(), 'p3-steps-'));
  const out = [];
  assert.throws(() => deployDev(root, { io: { ...io, logDir }, repo, log: (m) => out.push(m) }));
  assert.match(out.join('\n'), /the state branch was not written \(the deployment itself succeeded\); the row and the walk's reports are in /);
  const a = readFileSync(join(logDir, 'report-a.txt'), 'utf8');
  const b = readFileSync(join(logDir, 'report-b.json'), 'utf8');
  assert.equal(a, 'first ***\n');
  assert.doesNotMatch(b, /latesecret|tok/);
  assert.equal(JSON.parse(readFileSync(join(logDir, 'row.json'), 'utf8')).walk.reports.length, 3);
});

test('no per-layer deploy wording left in the README, the tool, its prompts or the rulebooks (Bob, 4 Nov)', () => {
  const top = join(import.meta.dirname, '..', '..');
  const files = ['README.md', 'tool/p3.mjs', ...readdirSync(join(top, 'tool/lib')).map((f) => `tool/lib/${f}`), ...readdirSync(join(top, 'rulebooks')).map((f) => `rulebooks/${f}`)];
  const PER_LAYER = /after a layer close|after each layer|per[- ]layer deploy|deploy (and walk )?(after|between) layers|layer \S+ closed, not yet deployed|close row and deploy and walk|deploy and walk stays owed only after a recorded close|no layer has closed since the last recorded deploy/i;
  for (const f of files) {
    const hits = readFileSync(join(top, f), 'utf8').split('\n').filter((l) => PER_LAYER.test(l));
    assert.deepEqual(hits, [], f);
  }
});

test('rounds: every layer closed is the first round\'s close; the walk\'s findings make the completion round, open until each is done, then its close owes the next deploy', () => {
  const report = node(`const fs = require('fs'); const fixed = fs.existsSync('fixed'); fs.mkdirSync('out', { recursive: true }); fs.writeFileSync('out/report.json', JSON.stringify({ steps: [], failures: fixed ? [] : [{ kind: 'http-500' }] })); process.exit(fixed ? 0 : 1)`);
  const { root } = withOrigin({
    'process/config.json': { deploy: { ...DEP, walk: report, walk_reports: ['out/report.json'] }, completion_file: 'build/round.md' },
    'build/layers.md': '| layer | what | modules |\n|---|---|---|\n| 1 | first | a |\n',
    'build/requirements/a.md': 'all met\n', 'build/round.md': '# Completion round\n', 'out/.gitignore': '*\n',
  });
  opened(root);
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  push(root, { 'x.txt': 'the tranche past main\n' });
  assert.match(see(root).text, /deploy and walk at the round close: .* \(the first round closed, not yet deployed\); job starts do not wait for it/);
  assert.equal(deployDev(root, { io, repo, log: quiet }).ok, false);
  const first = git(['rev-parse', 'origin/tranche'], { cwd: root }).slice(0, 10);
  push(root, { 'build/requirements/a.md': `all met\n- **F1** *(not yet met: walk p3dev-l1 ${first})* http-500\n`, 'build/round.md': '- [ ] C-1 · a · F1\n' });
  assert.throws(() => deployDev(root, { io, repo, log: quiet }), /never between layers \(the completion round is open: C-1 open in build\/round\.md; 1 found mark\(s\) of p3dev-l1 unmet\)/);
  assert.doesNotMatch(see(root).text, /deploy and walk at/);
  push(root, { 'build/requirements/a.md': 'all met\n', 'build/round.md': '- [x] C-1 · a · F1\n', fixed: 'x\n' });
  assert.match(see(root).text, /deploy and walk at the round close: .* \(the completion round closed since \w+ was deployed\)/);
  assert.equal(deployDev(root, { io, repo, log: quiet }).ok, true);
  assert.ok(trancheClose(root, { slug: repo, io: closeIO, log: quiet }).ok);
});

// The internal walk (Bob, 4 Nov; K4111, K4162, K4781): journey-check's local arm, its report the
// live report's shape; 7 steps, one failure of kind step; it sees no Cloudflare secret.
const LOCAL = node(`const fs = require('fs'); fs.mkdirSync('out/local', { recursive: true });
  const steps = [1, 2, 3, 4, 5, 6, 7].map((i) => ({ journey: 'j', label: 's' + i, ok: i !== 4 }));
  fs.writeFileSync('out/local/report.json', JSON.stringify({ arm: 'local', steps, failures: [{ journey: 'j', step: 's4', kind: 'step', detail: 'cf ' + (process.env.CLOUDFLARE_API_TOKEN || 'none') + ' gh ' + (process.env.GH_TOKEN || 'none') }] }));
  fs.writeFileSync('out/local/report.txt', steps.map((x) => (x.ok ? 'ok ' : 'FAIL ') + x.label).join('\\n'));
  process.exit(1)`);
const IW = { run: LOCAL, reports: ['out/local/report.json', 'out/local/report.txt'] };

test('internal walk config: optional; run an argv or argvs, timeout_minutes default 30, reports file paths', () => {
  assert.equal(deployConfig(cfgWith(DEP)).internal_walk, null);
  assert.deepEqual(deployConfig(cfgWith({ ...DEP, internal_walk: IW })).internal_walk, { run: [LOCAL], timeout_minutes: 30, reports: IW.reports });
  assert.throws(() => deployConfig(cfgWith({ ...DEP, internal_walk: { ...IW, gate: true } })), /internal_walk must be an object/);
  assert.throws(() => deployConfig(cfgWith({ ...DEP, internal_walk: { reports: [] } })), /internal_walk.run must be an argv/);
  assert.throws(() => deployConfig(cfgWith({ ...DEP, internal_walk: { ...IW, timeout_minutes: 0 } })), /whole minutes/);
  assert.throws(() => deployConfig(cfgWith({ ...DEP, internal_walk: { ...IW, reports: ['../x'] } })), /internal_walk.reports must be a list/);
});

test('deploy dev with an internal walk: it runs first, without the tokens or Cloudflare secrets; one failure does not stop the deploy; the row carries it; its findings count for tranche close', () => {
  const dep = { ...DEP, internal_walk: IW };
  const { root, bare } = withOrigin({ ...product(dep), 'process/config.json': { deploy: dep, plan: 'close', environment: ['P3_DEPLOY_SECRET'] }, 'out/.gitignore': '*\n' });
  assert.equal(closeLayer(root, '1').ok, true);
  const seen = [];
  const exec = (c, a, o) => { seen.push(o.unset); return run(c, a, o); };
  const env = { CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN, GH_TOKEN: process.env.GH_TOKEN };
  process.env.CLOUDFLARE_API_TOKEN = 'cf-secret'; process.env.GH_TOKEN = 'gh-secret';
  const out = [];
  let r;
  try { r = deployDev(root, { io: { ...io, exec }, repo, log: (m) => out.push(m) }); } finally { for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  const text = out.join('\n');
  assert.equal(r.ok, true, text);
  assert.deepEqual(r.row.results.map((x) => x.stage), ['internal_walk', 'dry_run', 'dry_run', 'deploy', 'walk'], 'before the dry run and the deploy');
  const iw = r.row.internal_walk;
  assert.equal(iw.steps, 7);
  assert.equal(iw.steps_ok, 6);
  assert.equal(iw.failures, 1);
  assert.deepEqual(iw.by_kind, { step: 1 });
  assert.equal(iw.ok, false);
  assert.equal(iw.exit, 1);
  assert.equal(typeof iw.seconds, 'number');
  assert.equal(iw.reports.length, 2);
  assert.match(iw.reports[0].stored, /^deploys\/p3dev-l1\/[^/]+\/internal\/report\.json$/);
  const stored = JSON.parse(git(['show', `process-state:${iw.reports[0].stored}`], { cwd: bare }));
  assert.equal(stored.failures[0].detail, 'cf none gh none', 'no Cloudflare secret and no GitHub token in its environment');
  assert.ok(seen[0].includes('P3_DEPLOY_SECRET') && seen[0].includes('CLOUDFLARE_API_TOKEN'), 'the config\'s environment names unset too');
  assert.deepEqual(rows(bare), [r.row]);
  const run10 = `p3dev-l1 ${r.row.commit.slice(0, 10)}`;
  assert.match(text, new RegExp(`--from "internal walk ${run10}"`));
  // Its finding is owed a record, as a live walk's is; a found mark naming it records it.
  const cfg = loadConfig(root);
  assert.deepEqual([walkFindings(root, cfg, 'origin/tranche').failing, walkFindings(root, cfg, 'origin/tranche').recorded], [1, 0]);
  commit(root, { 'build/requirements/d.md': `${unmet}- **F1** *(not yet met: internal walk ${run10})* step s4\n` });
  assert.equal(walkFindings(root, cfg, 'HEAD').recorded, 1);
});

test('deploy dev: an internal walk that times out is recorded as such, and the deploy still runs', () => {
  const dep = { ...DEP, internal_walk: { ...IW, timeout_minutes: 1 } };
  const { root } = withOrigin(product(dep));
  assert.equal(closeLayer(root, '1').ok, true);
  const exec = (c, a, o) => (a.some((x) => x.includes("arm: 'local'")) ? { code: 1, stdout: '', stderr: 'killed', seconds: 60, timedOut: true } : run(c, a, o));
  const r = deployDev(root, { io: { ...io, exec }, repo, log: quiet });
  assert.equal(r.ok, true);
  assert.deepEqual(r.row.results.map((x) => x.stage), ['internal_walk', 'dry_run', 'dry_run', 'deploy', 'walk']);
  assert.equal(r.row.results[0].timed_out, true);
  assert.equal(r.row.internal_walk.timed_out, true);
  assert.equal(r.row.internal_walk.ok, false);
  assert.deepEqual(r.row.internal_walk.reports.map((x) => x.stored), ['not written by this walk', 'not written by this walk']);
});

test('walk internal: the internal walk alone, any time; its reports under walks/internal/ on the state branch, no deploy row', () => {
  const dep = { ...DEP, internal_walk: IW };
  const { root, bare } = withOrigin({ ...product(dep), 'out/.gitignore': '*\n' });
  assert.throws(() => walkInternal(makeRepo({ 'process/config.json': { deploy: DEP } }), { log: quiet }), /internal_walk is not set/);
  const out = [];
  const r = walkInternal(root, { log: (m) => out.push(m) });
  assert.equal(r.ok, false);
  assert.equal(r.internal_walk.failures, 1);
  assert.match(r.internal_walk.reports[1].stored, /^walks\/internal\/\w{10}-[^/]+\/report\.txt$/);
  assert.match(git(['show', `process-state:${r.internal_walk.reports[1].stored}`], { cwd: bare }), /FAIL s4/);
  assert.equal(git(['show', `process-state:${DEPLOYS_FILE}`], { cwd: bare, allowFail: true }).code, 128, 'no deploy row');
  assert.match(out.join('\n'), /--from "internal walk \w{10}"/);
});
