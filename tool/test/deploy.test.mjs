// Build Plan Phase 2, the deploy and walk: development deployments only (Bob's word, 3 Nov).
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, truncateSync, utimesSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { DEPLOYS_FILE, ROUND_ACT, ROUND_WALK_ACT, checkSlug, deployConfig, deployDev, deploys, owedAt, readReport, redact, roundCloseRun, walkFindings, walkInternal, walkRound, walkSummary } from '../lib/deploy.mjs';
import { status } from '../lib/status.mjs';
import { flushState, stateBatch, writeState } from '../lib/state.mjs';
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
const rows = (bare, kind = 'dev-deploy') => git(['show', `process-state:${DEPLOYS_FILE}`], { cwd: bare }).split('\n').map((l) => JSON.parse(l)).filter((r) => r.row === kind);

test('deploy dev at a round close: dry run, deploy, walk, one row; secrets never printed; then refused while that tip is deployed clean', () => {
  const { root, bare } = withOrigin(product());
  assert.equal(closeLayer(root, '1').ok, true);
  const tip = git(['rev-parse', 'origin/tranche'], { cwd: root });
  // A slug that is not a development deployment's.
  assert.throws(() => deployDev(root, { io, repo, slug: 'acmewidget', log: quiet }), /does not begin with p3dev-/);
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
  assert.throws(() => deployDev(root, { io, repo, log: quiet }), /no development deployment now: a round's walk belongs to its close, never between layers \(the first round is open: layers 5, 6, 7, 8, 9, 10, 11 not closed\); it becomes due when the round closes/);
  const before = see(root);
  assert.equal(before.s.deploy, null);
  assert.doesNotMatch(before.text, /round-close run is owed/);
  assert.match(before.text, /build\/requirements\/m5\.md: 1 \(layer 5\)/);
  // A partial close named by the plan: the end of the tranche. Owed, and next work still listed.
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['reset', '-q', '--hard', 'origin/tranche'], { cwd: root });
  push(root, { 'process/config.json': { deploy: DEP, completion_file: 'build/round.md', plan: 'close' } });
  const after = see(root);
  assert.match(after.text, /FIRST: the round-close run is owed \(the last round \(plan close\) closed, not yet deployed\): node \.process\/tool\/p3\.mjs deploy dev, from a clean checkout of the tranche tip \(the deploy and its walk\); job starts do not wait for it/);
  assert.match(after.text, /build\/requirements\/m5\.md: 1 \(layer 5\)/, 'next work beside the deploy act');
  assert.ok(after.s.next.length);
  assert.throws(() => trancheClose(root, { slug: repo, io: closeIO, log: quiet }), /the last round's walk is owed before the tranche closes: node \S+ deploy dev, from a clean checkout of the tranche tip \(the deploy and its walk\)/);
  const r = deployDev(root, { io, repo, log: quiet });
  assert.equal(r.ok, true);
  assert.equal(r.row.slug, 'p3dev-l4');
  assert.doesNotMatch(see(root).text, /round-close run is owed/);
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
  assert.doesNotMatch(see(root).text, /round-close run is owed/, 'not owed again until its findings are worked');
  // One recorded: still held. Both (a found mark owed, and a known gap): the close goes on.
  push(root, { 'build/requirements/m5.md': `${unmet}- **F1** *(not yet met: walk ${run})* http-500 on /\n`, 'build/round.md': '- [ ] C-1 · m5 · F1\n' });
  assert.throws(() => trancheClose(root, { slug: repo, io: closeIO, log: quiet }), /2 finding\(s\), 1 recorded/);
  push(root, { 'build/round.md': `- [ ] C-1 · m5 · F1\n- [ ] C-2 · whole product · layout on ${run}; deferred: a known gap (Bob)\n` });
  assert.ok(trancheClose(root, { slug: repo, io: closeIO, log: quiet }).ok);
  assert.doesNotMatch(see(root).text, /round-close run is owed/, 'the round is open');
  // The completion round's job merges: F1 met, its item ticked. Held again until a fresh deploy.
  push(root, { 'build/requirements/m5.md': unmet, 'build/round.md': `- [x] C-1 · m5 · F1\n- [ ] C-2 · whole product · layout on ${run}; deferred: a known gap (Bob)\n`, fixed: 'x\n' });
  const owed = see(root).text;
  assert.match(owed, /FIRST: the round-close run is owed \(the last round \(plan close\) closed since \w+ was deployed\): node \.process\/tool\/p3\.mjs deploy dev, from a clean checkout of the tranche tip \(the deploy and its walk\); job starts do not wait for it/);
  const g = deployDev(root, { io, repo, log: quiet });
  assert.equal(g.ok, true);
  assert.equal(g.row.walk.failures, 0);
  assert.doesNotMatch(see(root).text, /tranche close waits|round-close run is owed/);
  assert.ok(trancheClose(root, { slug: repo, io: closeIO, log: quiet }).ok);
  assert.throws(() => deployDev(root, { io, repo, log: quiet }), /deployed and walked clean/);

  // A clean walk owes none when the tip moves after it (review: main into the tranche at its close).
  push(root, { 'y.txt': 'a plain pull request\n' });
  assert.doesNotMatch(see(root).text, /round-close run is owed/);
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
  // BD-R5: the journeys the walker marks AI-assisted, from steps or journeys.
  assert.deepEqual(walkSummary(JSON.stringify({ steps: [{ journey: 'assist', ai: true, ok: true }, { journey: 'plain', ok: true }], journeys: [{ name: 'draft', ai: true }], failures: [] })).ai_journeys, ['assist', 'draft']);
  assert.equal(walkSummary(JSON.stringify({ steps: [{ journey: 'plain' }] })).ai_journeys, undefined);
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

// C43 (Bob, 8 Nov): "the internal walk would be the last step of a round, but the live walk would
// only run once a round completed without any flaws identified in the internal walk". No text left
// says a round's close runs the internal walk, then the deploy and its walk.
test('no wording left that a round close runs the internal walk, then the deploy and its live walk (C43)', () => {
  const top = join(import.meta.dirname, '..', '..');
  const files = ['README.md', 'tool/p3.mjs', ...['tool/lib', 'rulebooks', 'governing'].flatMap((d) => readdirSync(join(top, d)).filter((f) => /\.(mjs|md)$/.test(f)).map((f) => `${d}/${f}`))];
  const OLD = /internal walk, then the deploy and its walk|before the dry run|internal walk first, then the dry run|close, internal walk, `?deploy dev`?, live walk/i;
  for (const f of files) assert.deepEqual(readFileSync(join(top, f), 'utf8').split('\n').filter((l) => OLD.test(l)), [], f);
});

// BD-R1 (Bob, 8 Nov): a walk ends the round; its findings, as found marks, open the next round
// over the map's layers; that round's close owes the next deploy and walk.
test('rounds: every layer closed is the first round\'s close; the walk\'s findings open round 2, its layer past the map; once it merges, round 2 closes and owes the next deploy', () => {
  const report = node(`const fs = require('fs'); const fixed = fs.existsSync('fixed'); fs.mkdirSync('out', { recursive: true }); fs.writeFileSync('out/report.json', JSON.stringify({ steps: [], failures: fixed ? [] : [{ kind: 'http-500' }] })); process.exit(fixed ? 0 : 1)`);
  const { root } = withOrigin({
    'process/config.json': { deploy: { ...DEP, walk: report, walk_reports: ['out/report.json'] } },
    'build/layers.md': '| layer | what | modules |\n|---|---|---|\n| 1 | first | a |\n',
    'build/requirements/a.md': 'all met\n', 'process/ledger/a.json': done('a'), 'test/a/x.test.mjs': PASS, 'out/.gitignore': '*\n',
  });
  opened(root);
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  push(root, { 'x.txt': 'the tranche past main\n' });
  assert.match(see(root).text, /FIRST: the round-close run is owed \(the first round closed, not yet deployed\): .* deploy dev, .*; job starts do not wait for it/);
  assert.equal(deployDev(root, { io, repo, log: quiet }).ok, false);
  const first = git(['rev-parse', 'origin/tranche'], { cwd: root }).slice(0, 10);
  push(root, { 'build/requirements/a.md': `all met\n- **F1** *(not yet met: walk p3dev-l1 ${first})* http-500\n` });
  assert.throws(() => deployDev(root, { io, repo, log: quiet }), new RegExp(`never between layers \\(the walk p3dev-l1 ${first} ended round 1; round 2 opens from its findings: layer 2 \\(round 2, map layer 1\\) for a`));
  assert.doesNotMatch(see(root).text, /round-close run is owed/);
  assert.throws(() => trancheClose(root, { slug: repo, io: closeIO, log: quiet }), /tranche close waits: the walk p3dev-l1 \w+ ended round 1; round 2 opens from its findings/);
  // Round 2's layer opens, and merges with a's fix: round 2 closed, its walk owed.
  const state = (files) => { onState(root, files); git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root }); };
  state({ 'layerflow/2/open.json': JSON.stringify({ row: 'open', layer: 2, tranche: 'tranche', at: new Date().toISOString(), round: { n: 2, of: 1, mods: ['a'], items: [] } }) });
  assert.throws(() => deployDev(root, { io, repo, log: quiet }), /round 2 is open: layer 2 \(round 2, map layer 1\) has not merged/);
  push(root, { 'build/requirements/a.md': 'all met\n', fixed: 'x\n' });
  state({ 'layerflow/2/merged.json': JSON.stringify({ row: 'merged', layer: 2, at: new Date().toISOString() }) });
  assert.match(see(root).text, /FIRST: the round-close run is owed \(round 2 closed since \w+ was deployed\)/);
  assert.equal(deployDev(root, { io, repo, log: quiet }).ok, true);
  assert.ok(trancheClose(root, { slug: repo, io: closeIO, log: quiet }).ok);
});

// BD-R1 (Bob, 8 Nov): "until an internal walk doesn't find flaws, the release deployment happens,
// and the walk of the release also doesn't identify flaws. When the release walk is clean, the
// installer is updated for that release, then the [product's] website is updated": tranche close
// refuses in that order, then names the two updates, each on Bob's approval, a gap where no
// workflow runs one.
test('tranche close (BD-R1): refused until a clean internal walk, then a release, then a clean release walk; then the installer update, then the site update, before the merges', () => {
  const inner = node(`const fs = require('fs'); fs.mkdirSync('out/local', { recursive: true }); const ok = fs.existsSync('fixed'); fs.writeFileSync('out/local/report.json', JSON.stringify({ steps: [{ ok }], failures: ok ? [] : [{ kind: 'step' }] })); process.exit(ok ? 0 : 1)`);
  const dep = { ...DEP, internal_walk: { run: inner, reports: ['out/local/report.json'] } };
  const REL = { checks: [['true']], assemble: ['true'], out: 'out/rel' };
  const { root } = withOrigin({
    'process/config.json': { deploy: dep, release: REL },
    'build/layers.md': '| layer | what | modules |\n|---|---|---|\n| 1 | first | a |\n',
    'build/requirements/a.md': 'all met\n', 'process/ledger/a.json': done('a'), 'test/a/x.test.mjs': PASS, 'out/.gitignore': '*\n',
  });
  opened(root);
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  push(root, { 'x.txt': 'the tranche past main\n' });
  const state = (files) => { onState(root, files); git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root }); };
  const close = () => trancheClose(root, { slug: repo, io: closeIO, log: quiet });
  // 1. The internal walk found a flaw, recorded against a: the next round is owed, not the close.
  const r1 = walkRound(root, { io, repo, log: quiet });
  assert.equal(r1.row.internal_walk.ok, false);
  assert.equal(r1.row.row, 'round-walk');
  push(root, { 'build/requirements/a.md': `all met\n- **F1** *(not yet met: internal walk ${r1.row.slug} ${r1.row.commit.slice(0, 10)})* step\n` });
  assert.throws(close, /tranche close waits: the walk internal-\S+ \w{10} ended round 1; round 2 opens from its findings: layer 2 \(round 2, map layer 1\) for a/);
  // a fixed and walked again: a clean internal walk. 2. no release yet.
  push(root, { fixed: 'x\n', 'build/requirements/a.md': 'all met\n' });
  const r2 = walkRound(root, { io, repo, log: quiet });
  assert.equal(r2.row.internal_walk.ok, true);
  assert.throws(close, /tranche close waits: no development release since the clean internal walk internal-\S+ \w{10}: node \S+ release dev, then the release deployment and its walk \(BD-R1\)/);
  // A release cut before that walk does not count; one after it does: 3. its walk owed, no path (gap).
  const later = new Date(Date.parse(r2.row.at) + 1000).toISOString();
  state({ 'releases/dev.jsonl': `${JSON.stringify({ row: 'dev-release', tranche: 'tranche', version: 'v0', conclusion: 'success', commit: r2.row.commit, at: '2000-01-01T00:00:00Z' })}\n` });
  assert.throws(close, /no development release since the clean internal walk/);
  state({ 'releases/dev.jsonl': `${JSON.stringify({ row: 'dev-release', tranche: 'tranche', version: 'v1', conclusion: 'success', commit: r2.row.commit, at: later })}\n` });
  assert.throws(close, /tranche close waits: the release deployment of v1 and its walk are owed: node \S+ deploy release v1; GAP: no path yet installs the cut, signed release onto a p3dev- deployment/);
  // The release walk found a flaw: refused; clean: the close goes on.
  state({ 'deploys/release.jsonl': `${JSON.stringify({ row: 'release-walk', tranche: 'tranche', version: 'v1', commit: r2.row.commit, ok: false, failures: 2, at: later })}\n` });
  assert.throws(close, /tranche close waits: the walk of release v1 found 2 flaw\(s\); recorded as found marks, they open the next round \(BD-R1\)/);
  // BD-R5: clean with no AI account: the non-AI journeys only; the end acts wait for a clean walk with AI on.
  state({ 'deploys/release.jsonl': `${JSON.stringify({ row: 'release-walk', tranche: 'tranche', version: 'v1', commit: r2.row.commit, ok: true, failures: 0, ai: false, not_walked: ['assistant'], at: later })}\n` });
  assert.throws(close, /tranche close waits: the walk of release v1 is clean on the non-AI journeys only \(no AI account configured; not walked: assistant\); the installer and site updates wait until a release walk with AI on is clean too/);
  state({ 'deploys/release.jsonl': `${JSON.stringify({ row: 'release-walk', tranche: 'tranche', version: 'v1', commit: r2.row.commit, ok: true, failures: 0, ai: true, at: later })}\n` });
  const c = close();
  assert.equal(c.ok, true);
  assert.equal(c.release, 'v1');
  // 4 then 5: the installer update, then the site update, each on Bob's approval; no workflow: gaps.
  assert.match(c.steps[0], /^the installer update for release v1, on Bob's approval: GAP, no workflow runs it yet \(process\/config\.json installer_update names none\)/);
  assert.match(c.steps[1], /^the product website's update to refer to the new install of v1, on Bob's approval: GAP, no workflow runs it yet \(process\/config\.json site_update names none\)/);
  assert.match(c.steps.slice(2).join('\n'), /create_pull_request .*"head":"tranche","base":"main"/, 'the merges after them');
  assert.deepEqual(c.gaps.map((g) => g.split(':')[0]), ['installer_update', 'site_update']);
  // Named workflows: dispatched through the protected environment, in order.
  push(root, { 'process/config.json': { deploy: dep, release: REL, installer_update: { workflow: 'installer-update.yml' }, site_update: { workflow: 'site-update.yml' } } });
  const named = close();
  assert.match(named.steps[0], /installer update for release v1, on Bob's approval: .*workflow_id installer-update\.yml.*inputs \{"version":"v1"\}; it waits in the protected environment that names Bob as required reviewer/);
  assert.match(named.steps[1], /the product website's update .*workflow_id site-update\.yml/);
  assert.deepEqual(named.gaps, []);
  // A finding that names no module: no round can place it; the close waits on BOB naming one.
  push(root, { 'process/found/no-module.md': '# no module\n\n- **F1** *(not yet met: walk p3dev-x 0123456789)* somewhere\n' });
  assert.throws(close, /tranche close waits: F1 in the found file of no module: BOB names its module/);
  push(root, { 'process/found/no-module.md': '# no module\n' });
  assert.ok(close().ok);
  // A round's layer merged after the clean walk: its fixes are unwalked; the close waits on its walk.
  state({ 'layerflow/2/open.json': JSON.stringify({ row: 'open', layer: 2, tranche: 'tranche', at: later, round: { n: 2, of: 1, mods: ['a'], items: [] } }), 'layerflow/2/merged.json': JSON.stringify({ row: 'merged', layer: 2, at: new Date(Date.parse(r2.row.at) + 5000).toISOString() }) });
  assert.throws(close, /tranche close waits: every layer of round 2 has merged: its walk ends it \(the round-close run\)/);
  // The next run's internal walk, required, did not run: not clean, whatever comes after it.
  state({ 'deploys/dev.jsonl': `${JSON.stringify({ row: 'dev-deploy', tranche: 'tranche', slug: 'p3dev-z', commit: 'c'.repeat(40), ok: true, walk: { failures: 0 }, at: new Date(Date.parse(r2.row.at) + 9000).toISOString() })}\n` });
  assert.throws(close, /tranche close waits: the latest internal walk \(p3dev-z cccccccccc\) is not clean \(it did not run\); its findings open the next round, and the rounds repeat until one is clean \(BD-R1\)/);
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

// C43 (BD-R1, Bob, 8 Nov: "the internal walk would be the last step of a round, but the live walk
// would only run once a round completed without any flaws identified in the internal walk"): with an
// internal walk configured, the round's walk is that walk alone; deploy dev is refused.
test('walk round with an internal walk: the walk alone, without the tokens or Cloudflare secrets; no dry run, deploy or live walk; one round-walk row; its findings count for tranche close; deploy dev refused', () => {
  const dep = { ...DEP, internal_walk: IW };
  const { root, bare } = withOrigin({ ...product(dep), 'process/config.json': { deploy: dep, plan: 'close', environment: ['P3_DEPLOY_SECRET'] }, 'out/.gitignore': '*\n' });
  assert.equal(closeLayer(root, '1').ok, true);
  assert.throws(() => deployDev(root, { io, repo, log: quiet }), /no development deployment now: with an internal walk configured, a round ends at its internal walk alone \(`node \S+ walk round`.*`node \S+ release dev`, then `node \S+ deploy release <version>` \(BD-R1, Bob, 8 Nov\)/);
  const seen = [];
  const exec = (c, a, o) => { seen.push(o.unset); return run(c, a, o); };
  const env = { CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN, GH_TOKEN: process.env.GH_TOKEN };
  process.env.CLOUDFLARE_API_TOKEN = 'cf-secret'; process.env.GH_TOKEN = 'gh-secret';
  const out = [];
  let r;
  try { r = walkRound(root, { io: { ...io, exec }, repo, log: (m) => out.push(m) }); } finally { for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  const text = out.join('\n');
  assert.equal(r.ok, false, 'a finding: not clean');
  assert.equal(r.row.ok, true, 'the walk ran');
  assert.equal(r.row.slug, 'internal-l1');
  assert.deepEqual(r.row.results.map((x) => x.stage), ['internal_walk'], 'no dry run, no deploy, no live walk');
  const iw = r.row.internal_walk;
  assert.deepEqual([iw.steps, iw.steps_ok, iw.failures, iw.ok, iw.exit], [7, 6, 1, false, 1]);
  assert.deepEqual(iw.by_kind, { step: 1 });
  assert.equal(typeof iw.seconds, 'number');
  assert.match(iw.reports[0].stored, /^walks\/round\/internal-l1\/[^/]+\/report\.json$/);
  const stored = JSON.parse(git(['show', `process-state:${iw.reports[0].stored}`], { cwd: bare }));
  assert.equal(stored.failures[0].detail, 'cf none gh none', 'no Cloudflare secret and no GitHub token in its environment');
  assert.ok(seen[0].includes('P3_DEPLOY_SECRET') && seen[0].includes('CLOUDFLARE_API_TOKEN'), 'the config\'s environment names unset too');
  assert.deepEqual(rows(bare, 'round-walk'), [r.row]);
  assert.deepEqual(rows(bare), [], 'no deploy row');
  const run10 = `internal-l1 ${r.row.commit.slice(0, 10)}`;
  assert.match(text, new RegExp(`--from "internal walk ${run10}"`));
  assert.match(text, /no deploy and no live walk until a round's internal walk is clean/);
  // Its finding is owed a record; a found mark naming it records it.
  const cfg = loadConfig(root);
  assert.deepEqual([walkFindings(root, cfg, 'origin/tranche').failing, walkFindings(root, cfg, 'origin/tranche').recorded], [1, 0]);
  commit(root, { 'build/requirements/d.md': `${unmet}- **F1** *(not yet met: internal walk ${run10})* step s4\n` });
  assert.equal(walkFindings(root, cfg, 'HEAD').recorded, 1);
  // Refused between layers, as deploy dev is.
  const { root: open } = withOrigin({ ...product(dep, {}), 'out/.gitignore': '*\n' });
  assert.throws(() => walkRound(open, { io, repo, log: quiet }), /no round walk now: a round's walk belongs to its close, never between layers \(the first round is open: layer[s]? .*not closed\)/);
});

// C43, Bob, 8 Nov: as many walkers as is reasonable, within Cloudflare's limits (walkcfg.mjs).
test('walk concurrency reaches each walk stage: the internal walk the runner\'s count, the live walk its capped count and browser-start rate, as env and {concurrency}', () => {
  const seen = [];
  const exec = (c, a, o) => { seen.push({ a, env: o.env }); return run(c, a, o); };
  const dep = { ...DEP, internal_walk: { run: ['node', '-e', 'process.exit(0)', '{concurrency}'], reports: [] } };
  const { root } = withOrigin({ ...product(dep), 'process/config.json': { deploy: dep, plan: 'close', walk: { internal_concurrency: 6 } } });
  assert.equal(closeLayer(root, '1').ok, true);
  const out = [];
  walkRound(root, { io: { ...io, exec }, repo, log: (m) => out.push(m) });
  const iw = seen.find((x) => x.a.includes('process.exit(0)'));
  assert.deepEqual(iw.env, { P3_WALK_CONCURRENCY: '6' });
  assert.equal(iw.a.at(-1), '6', '{concurrency} substituted');
  assert.match(out.join('\n'), /internal walk: 6 at once/);
  // No internal walk: deploy dev's live walk, held to Workers Free's cap though the config asks for more.
  seen.length = 0;
  const { root: r2 } = withOrigin({ ...product(), 'process/config.json': { deploy: DEP, plan: 'close', walk: { live_concurrency: 9 } } });
  assert.equal(closeLayer(r2, '1').ok, true);
  const said = [];
  deployDev(r2, { io: { ...io, exec }, repo, log: (m) => said.push(m) });
  const walk = seen.at(-1);
  assert.deepEqual(walk.env, { P3_WALK_CONCURRENCY: '2', P3_WALK_BROWSER_STARTS_PER_MINUTE: '2', P3_WALK_AI: '0' });
  assert.ok(seen.slice(0, -1).every((x) => x.env === undefined), 'the dry run and the deploy get none');
  assert.match(said.join('\n'), /live walk: 2 at once .*held to the cap/);
  assert.throws(() => deployConfig({ ...cfgWith(DEP), walk: { live_concurrency: -1 } }), /walk.live_concurrency must be a whole number/);
});

test('walk round: an internal walk that times out is recorded as such; a failed build runs no walk and counts one finding', () => {
  const dep = { ...DEP, internal_walk: { ...IW, timeout_minutes: 1 } };
  const { root } = withOrigin(product(dep));
  assert.equal(closeLayer(root, '1').ok, true);
  const exec = (c, a, o) => (a.some((x) => x.includes("arm: 'local'")) ? { code: 1, stdout: '', stderr: 'killed', seconds: 60, timedOut: true } : run(c, a, o));
  const r = walkRound(root, { io: { ...io, exec }, repo, log: quiet });
  assert.equal(r.ok, false);
  assert.deepEqual(r.row.results.map((x) => x.stage), ['internal_walk']);
  assert.equal(r.row.results[0].timed_out, true);
  assert.equal(r.row.internal_walk.timed_out, true);
  assert.equal(r.row.internal_walk.ok, false);
  assert.deepEqual(r.row.internal_walk.reports.map((x) => x.stored), ['not written by this walk', 'not written by this walk']);
  assert.equal(walkFindings(root, loadConfig(root), 'origin/tranche').failing, 1);
  // A failed build: no internal walk runs; the row stops at build and counts one finding.
  const { root: r2 } = withOrigin({ ...product(dep), 'process/config.json': { deploy: dep, plan: 'close', lockfiles: ['nope/package-lock.json'] } });
  assert.equal(closeLayer(r2, '1').ok, true);
  const b = walkRound(r2, { io, repo, log: quiet });
  assert.deepEqual([b.ok, b.row.ok, b.row.stopped, b.row.internal_walk], [false, false, 'build', undefined]);
  assert.equal(walkFindings(r2, loadConfig(r2), 'origin/tranche').failing, 1);
});

// Cold review of C43: under the rounds, a product with no internal walk keeps deploy dev's rule: a run
// that did not complete, its finding deferred as a known gap, is owed again once the tip moves; the
// release path is not next until a run completes clean.
test('no internal walk, under the rounds: a deploy that stopped, its finding a known gap, is owed again when the tip moves, not the release', () => {
  const dep = { ...DEP, deploy: node("process.exit(require('fs').existsSync('fixed') ? 0 : 4)") };
  const { root } = withOrigin({
    'process/config.json': { deploy: dep, completion_file: 'build/round.md', release: { checks: [['true']], assemble: ['true'], out: 'out/rel' } },
    'build/layers.md': '| layer | what | modules |\n|---|---|---|\n| 1 | first | a |\n',
    'build/requirements/a.md': 'all met\n', 'process/ledger/a.json': done('a'), 'test/a/x.test.mjs': PASS, 'build/round.md': '# round\n',
  });
  opened(root);
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  push(root, { 'x.txt': 'the tranche past main\n' });
  git(['checkout', '-q', '--detach', 'origin/tranche'], { cwd: root });
  const f = deployDev(root, { io, repo, log: quiet });
  assert.equal(f.row.stopped, 'deploy');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['reset', '-q', '--hard', 'origin/tranche'], { cwd: root });
  push(root, { 'build/round.md': `# round\n- [ ] C-1 · whole product · wrangler on ${f.row.slug} ${f.row.commit.slice(0, 10)}; deferred: a known gap (Bob)\n` });
  const v = see(root);
  assert.match(v.text, /FIRST: the round-close run is owed \(the first round closed since \w{10} was deployed\): node \S+ deploy dev/);
  assert.equal(v.s.release, null);
  assert.doesNotMatch(v.text, /release path is next/);
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

// Bob, 7 Nov: the internal walk is "Required, tool-started", at "Round close only" (his 4 Nov rule
// stands). The act that closes a round starts the run itself, from a scratch worktree at the
// tranche tip; between layers it runs nothing; when it cannot run, it is the one next act. With an
// internal walk configured, the run is that walk alone (C43, BD-R1).
test('round-close run: nothing between layers; at the round close it runs the internal walk alone from the tranche tip and is then not owed; when it cannot run, the one next act', () => {
  const ILOCAL = node("require('fs').mkdirSync('out', { recursive: true }); require('fs').writeFileSync('out/inner.json', JSON.stringify({ steps: [{ ok: true }], failures: [] }))");
  const dep = { ...DEP, internal_walk: { run: ILOCAL, reports: ['out/inner.json'] } };
  const { root, bare } = withOrigin({ ...LIVE({ deploy: dep }), 'out/.gitignore': '*\n' });
  opened(root);
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  push(root, { 'x.txt': 'the tranche past main\n' });
  assert.equal(closeLayer(root, '4').ok, true);
  const rio = { repo, compare: () => null, status: statusIO, deploy: io };
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  // Between layers: no walk, no deploy, nothing owed.
  let called = 0;
  const stub = { walkRound: () => { called++; return { ok: true }; }, deployDev: () => { called++; return { ok: true }; } };
  const out = [];
  const open = roundCloseRun(root, { log: (m) => out.push(m), io: { ...rio, ...stub }, by: 'layer merge 4' });
  assert.deepEqual([open.ran, open.owed, called], [false, null, 0]);
  assert.match(out.join('\n'), /no internal walk now: the round is open \(the first round is open: layers 5, 6, 7, 8, 9, 10, 11 not closed\)/);
  // The round closes (plan close): the run starts itself, at the tip: the internal walk alone.
  push(root, { 'process/config.json': { deploy: dep, completion_file: 'build/round.md', plan: 'close' } });
  const tip = git(['rev-parse', 'origin/tranche'], { cwd: root });
  git(['checkout', '-q', '--detach', head], { cwd: root });
  writeFileSync(join(root, 'scratch.txt'), 'the merging session\'s own checkout, untouched\n');
  const said = [];
  const r = roundCloseRun(root, { log: (m) => said.push(m), io: rio, by: 'merge 7' });
  assert.equal(r.ran, true);
  assert.equal(r.ok, true);
  assert.match(said.join('\n'), /the last round \(plan close\) closed, not yet walked: merge 7 starts the round-close run now \(Bob, 7 Nov: required, tool-started\): the internal walk only; no deploy and no live walk until a round's internal walk is clean/);
  const row = rows(bare, 'round-walk').at(-1);
  assert.equal(row.commit, tip);
  assert.deepEqual(row.results.map((x) => x.stage), ['internal_walk']);
  assert.equal(row.internal_walk.ok, true);
  assert.deepEqual(rows(bare), [], 'no deploy row: no deploy and no live walk');
  assert.equal(git(['rev-parse', 'HEAD'], { cwd: root }), head, 'the checkout stays where it was');
  assert.equal(readFileSync(join(root, 'scratch.txt'), 'utf8'), 'the merging session\'s own checkout, untouched\n');
  assert.equal(git(['worktree', 'list', '--porcelain'], { cwd: root }).split('\n').filter((l) => l.startsWith('worktree ')).length, 1, 'the scratch worktree removed');
  // Run and clean: not owed, nothing runs again.
  const again = roundCloseRun(root, { log: quiet, io: { ...rio, ...stub } });
  assert.deepEqual([again.ran, again.owed, called], [false, null, 0]);
  // Cannot run here: the one next act, still owed.
  const { root: r2 } = withOrigin({ ...LIVE({ deploy: dep, plan: 'close' }), 'out/.gitignore': '*\n' });
  opened(r2);
  git(['push', '-q', 'origin', 'main'], { cwd: r2 });
  push(r2, { 'x.txt': 'past main\n' });
  const told = [];
  const no = roundCloseRun(r2, { log: (m) => told.push(m), io: { ...rio, walkRound: () => { throw new (class extends Error {})('out of disk'); } } });
  assert.equal(no.ran, false);
  assert.equal(no.act, ROUND_WALK_ACT);
  assert.match(no.owed, /the last round \(plan close\) closed, not yet walked/);
  assert.match(told.join('\n'), /the round-close run did not run here \(out of disk\); it is owed \(the last round \(plan close\) closed, not yet walked\): the one next act is node \S+ walk round, from a clean checkout of the tranche tip; status puts it first and ROOT's sweep wakes BOB for it/);
  assert.match(see(r2).text, /^FIRST: the round-close run is owed \(the last round \(plan close\) closed, not yet walked\): node \S+ walk round, from a clean checkout of the tranche tip \(the internal walk only; no deploy and no live walk until a round's internal walk is clean, then the release deployment and its walk \(BD-R1\)\)/m);
  assert.equal(owedAt(r2, loadConfig(r2), { ls: null, ref: 'origin/tranche' }).owed, 'the last round (plan close) closed, not yet walked');
  // Without an internal walk (none set, or Bob's exemption): deploy dev, as before.
  const { root: r3 } = withOrigin({ ...LIVE({ plan: 'close' }), 'out/.gitignore': '*\n' });
  opened(r3);
  git(['push', '-q', 'origin', 'main'], { cwd: r3 });
  push(r3, { 'x.txt': 'past main\n' });
  const b = roundCloseRun(r3, { log: quiet, io: { ...rio, deployDev: () => { throw new (class extends Error {})('wrangler: not authenticated'); } } });
  assert.equal(b.act, ROUND_ACT);
  assert.match(b.owed, /the last round \(plan close\) closed, not yet deployed/);
});

// C43 (BD-R1, Bob, 8 Nov): "This successive set of rounds continues until an internal walk doesn't
// find flaws, the release deployment happens, and the walk of the release also doesn't identify
// flaws." A round whose internal walk finds flaws closes with no deploy and no live walk, and the next
// round opens on its marks; a clean internal walk makes the release path the next act; nothing else
// owes a live walk.
test('rounds with an internal walk: flaws close the round with no deploy or live walk, the next round opens on its marks; a clean walk makes the release path the one next act; no live walk owed elsewhere', () => {
  const inner = node(`const fs = require('fs'); fs.mkdirSync('out/local', { recursive: true }); const ok = fs.existsSync('fixed'); fs.writeFileSync('out/local/report.json', JSON.stringify({ steps: [{ ok }], failures: ok ? [] : [{ kind: 'step' }] })); process.exit(ok ? 0 : 1)`);
  const dep = { ...DEP, internal_walk: { run: inner, reports: ['out/local/report.json'] } };
  const REL = { checks: [['true']], assemble: ['true'], out: 'out/rel' };
  const { root, bare } = withOrigin({
    'process/config.json': { deploy: dep, release: REL },
    'build/layers.md': '| layer | what | modules |\n|---|---|---|\n| 1 | first | a |\n',
    'build/requirements/a.md': 'all met\n', 'process/ledger/a.json': done('a'), 'test/a/x.test.mjs': PASS, 'out/.gitignore': '*\n',
  });
  opened(root);
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  push(root, { 'x.txt': 'the tranche past main\n' });
  const state = (files) => { onState(root, files); git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root }); };
  const rio = { repo, compare: () => null, status: statusIO, deploy: io };
  const noLive = () => assert.throws(() => { git(['checkout', '-q', '--detach', 'origin/tranche'], { cwd: root }); deployDev(root, { io, repo, log: quiet }); }, /no development deployment now: with an internal walk configured/);
  // Round 1 closed: the internal walk is owed, as walk round.
  let v = see(root);
  assert.match(v.text, /FIRST: the round-close run is owed \(the first round closed, not yet walked\): node \S+ walk round/);
  assert.equal(v.s.release, null);
  noLive();
  // The round-close run: the internal walk alone, with a flaw. No deploy, no live walk.
  const r1 = roundCloseRun(root, { log: quiet, io: rio, by: 'layer merge 1' });
  assert.deepEqual([r1.ran, r1.ok], [true, false]);
  assert.deepEqual(rows(bare), [], 'no deploy row');
  const w1 = rows(bare, 'round-walk').at(-1);
  assert.deepEqual([w1.slug, w1.internal_walk.failures], ['internal-l1', 1]);
  v = see(root);
  assert.doesNotMatch(v.text, /round-close run is owed|release path is next/);
  assert.match(v.text, /tranche close waits: the latest internal walk \(internal-l1 \w{10}\) walked with 1 finding\(s\), 0 recorded/);
  noLive();
  // Its finding recorded against a: round 2 opens on a's marks; nothing owed, no live walk.
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['reset', '-q', '--hard', 'origin/tranche'], { cwd: root });
  push(root, { 'build/requirements/a.md': `all met\n- **F1** *(not yet met: internal walk internal-l1 ${w1.commit.slice(0, 10)})* step\n` });
  v = see(root);
  assert.doesNotMatch(v.text, /round-close run is owed|release path is next/);
  assert.equal(v.s.deploy, null);
  assert.match(v.text, /layer flow: layer 2 \(round 2, map layer 1, from the walk internal-l1 \w{10}; a\) is next and not open/);
  assert.throws(() => trancheClose(root, { slug: repo, io: closeIO, log: quiet }), /tranche close waits: the walk internal-l1 \w{10} ended round 1; round 2 opens from its findings: layer 2 \(round 2, map layer 1\) for a/);
  noLive();
  // Round 2's layer opens and merges with a's fix: its internal walk is owed, and only that.
  state({ 'layerflow/2/open.json': JSON.stringify({ row: 'open', layer: 2, tranche: 'tranche', at: new Date().toISOString(), round: { n: 2, of: 1, mods: ['a'], items: [] } }) });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['reset', '-q', '--hard', 'origin/tranche'], { cwd: root });
  push(root, { 'build/requirements/a.md': 'all met\n', fixed: 'x\n' });
  state({ 'layerflow/2/merged.json': JSON.stringify({ row: 'merged', layer: 2, at: new Date().toISOString() }) });
  v = see(root);
  assert.match(v.text, /FIRST: the round-close run is owed \(round 2 closed since \w{10} was walked\): node \S+ walk round/);
  noLive();
  const r2 = roundCloseRun(root, { log: quiet, io: rio, by: 'layer merge 2' });
  assert.deepEqual([r2.ran, r2.ok], [true, true]);
  assert.deepEqual(rows(bare), [], 'still no deploy row');
  const w2 = rows(bare, 'round-walk').at(-1);
  assert.equal(w2.slug, 'internal-l2');
  // Clean: the release path is the one next act; no further walk is owed, and none runs.
  v = see(root);
  assert.doesNotMatch(v.text, /round-close run is owed/);
  assert.match(v.text, new RegExp(`FIRST: the release path is next \\(round 2's internal walk internal-l2 ${w2.commit.slice(0, 10)} is clean, and no release is cut since\\): node \\S+ release dev, from a clean checkout of the tranche tip \\(the cut, signed release\\), then node \\S+ deploy release <version>, its release deployment and live walk \\(BD-R1\\)`));
  const said = [];
  const again = roundCloseRun(root, { log: (m) => said.push(m), io: rio });
  assert.equal(again.ran, false);
  assert.match(again.release.act, /release dev/);
  assert.match(said.join('\n'), /the one next act is the release path/);
  noLive();
  // The release cut after it: its deployment and live walk are next, a named gap today.
  const later = new Date(Date.parse(w2.at) + 1000).toISOString();
  state({ 'releases/dev.jsonl': `${JSON.stringify({ row: 'dev-release', tranche: 'tranche', version: 'v1', conclusion: 'success', commit: w2.commit, at: later })}\n` });
  v = see(root);
  assert.equal(v.s.release.gap, true);
  assert.match(v.text, /FIRST: the release path is next \(release v1 is cut since the clean internal walk internal-l2 \w{10}\): node \S+ deploy release v1, its release deployment and live walk \(BD-R1\); GAP: no path yet installs the cut, signed release artifact onto a p3dev- deployment/);
  // Its walk recorded: nothing more owed here (tranche close reads it).
  state({ 'deploys/release.jsonl': `${JSON.stringify({ row: 'release-walk', tranche: 'tranche', version: 'v1', commit: w2.commit, ok: true, failures: 0, ai: false, at: later })}\n` });
  // BD-R5: clean with AI off: the AI-assisted journeys are Bob's next, reported as a gap.
  v = see(root);
  assert.equal(v.s.release.gap, true);
  assert.match(v.text, /FIRST: the release path is next \(release v1's walk is clean on the non-AI journeys \(no AI account configured, BD-R5\)\): Bob configures the AI account; then walk.ai is set true/);
  assert.throws(() => trancheClose(root, { slug: repo, io: closeIO, log: quiet }), /clean on the non-AI journeys only/);
  state({ 'deploys/release.jsonl': `${JSON.stringify({ row: 'release-walk', tranche: 'tranche', version: 'v1', commit: w2.commit, ok: true, failures: 0, ai: true, at: later })}\n` });
  v = see(root);
  assert.equal(v.s.release, null);
  assert.doesNotMatch(v.text, /round-close run is owed|release path is next/);
  assert.ok(trancheClose(root, { slug: repo, io: closeIO, log: quiet }).ok);
});

// Cold review of C23: the merge commands hold their state writes until they end. The round-close
// run pushes them first (the last layer's close row, read back from origin by the run), and pushes
// its own as made, while its worktree exists: the row reaches origin.
test('round-close run inside a batched command: the held close row is pushed first and the run\'s row reaches origin', () => {
  const { root, bare } = withOrigin({ ...product(DEP, {}), 'build/requirements/d.md': 'all met\n' });
  opened(root);
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  push(root, { 'x.txt': 'the tranche past main\n' });
  assert.equal(closeLayer(root, '1').ok, true);
  const tip = git(['rev-parse', 'origin/tranche'], { cwd: root });
  let r;
  stateBatch(true);
  try {
    closeLayer(root, '2');
    r = roundCloseRun(root, { log: quiet, io: { repo, compare: () => null, status: statusIO, deploy: io }, by: 'layer merge 2' });
    flushState();
  } finally { stateBatch(false); }
  assert.deepEqual([r.ran, r.ok], [true, true]);
  assert.deepEqual(rows(bare).map((x) => [x.commit, x.layer, x.ok]), [[tip, 2, true]]);
  assert.match(git(['show', 'process-state:layers/closed.jsonl'], { cwd: bare }), /"layer":2/);
  assert.equal(git(['worktree', 'list', '--porcelain'], { cwd: root }).split('\n').filter((l) => l.startsWith('worktree ')).length, 1);
});

// A run started and not recorded owes nothing more while it may be going: no second run from the
// tool, a refusal by hand, and status says so (cold review of C23).
test('a run started and not recorded: the round-close run and deploy dev hold off, status says it is running', () => {
  const { root } = withOrigin(product());
  opened(root);
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  push(root, { 'x.txt': 'the tranche past main\n' });
  const tip = git(['rev-parse', 'origin/tranche'], { cwd: root });
  writeState(root, 'process-state', 'started (test)', (w) => { mkdirSync(join(w, 'deploys'), { recursive: true }); writeFileSync(join(w, DEPLOYS_FILE), JSON.stringify({ row: 'dev-deploy-start', tranche: 'tranche', slug: 'p3dev-l1', commit: tip, session: 'session_other', at: new Date().toISOString() }) + '\n'); });
  let called = 0;
  const r = roundCloseRun(root, { log: quiet, io: { repo, compare: () => null, status: statusIO, deployDev: () => { called++; return { ok: true }; } } });
  assert.deepEqual([r.ran, r.owed, r.running.session, called], [false, null, 'session_other', 0]);
  git(['checkout', '-q', 'origin/tranche'], { cwd: root });
  assert.throws(() => deployDev(root, { io, repo, log: quiet }), /session_other started one at \w{10} \(p3dev-l1\) at .*, not yet recorded: it is running, or was cut short/);
  const t = see(root).text;
  assert.match(t, /the round-close run at \w{10} \(p3dev-l1\) was started by session_other at .*, not yet recorded: running, or cut short/);
  assert.doesNotMatch(t, /FIRST: the round-close run is owed/);
});

// Bob's exemption (or an internal walk alone) on a product with no deployment configures no
// deploy: nothing owed, nothing run, tranche close not held (cold review of C23).
test('the exemption alone configures no deploy: no run, nothing owed', () => {
  const ex = { internal_walk: { none: 'no product to walk', by: 'Bob, 7 Nov' } };
  assert.equal(deploys({ deploy: ex }), false);
  assert.equal(deploys({ deploy: { internal_walk: { run: ['true'] } } }), false);
  assert.equal(deploys({ deploy: DEP }), true);
  const { root } = withOrigin(product(ex));
  opened(root);
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  push(root, { 'x.txt': 'the tranche past main\n' });
  let called = 0;
  const r = roundCloseRun(root, { log: quiet, io: { repo, compare: () => null, status: statusIO, deployDev: () => { called++; return { ok: true }; } } });
  assert.deepEqual([r.ran, r.owed, called], [false, null, 0]);
  assert.doesNotMatch(see(root).text, /round-close run/);
});
