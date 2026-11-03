// Build I (3 Nov): the loop guard. Budget per attempt from the session record, flagged by
// status; the open check's row with the Claude Code version; the local record check at a
// shallow clone's edge.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jobComplete, jobStart } from '../lib/job.mjs';
import { OPEN_CHECK_FILE, appendRow, attemptBudget, bobMetricsFile, metricsFile, openCheckDue, readRows } from '../lib/metrics.mjs';
import { recordCheck } from '../lib/record.mjs';
import { claudeVersion, sessionFile, sessionRecord } from '../lib/session.mjs';
import { status } from '../lib/status.mjs';
import { DEFAULTS, git, loadConfig } from '../lib/util.mjs';
import { main } from '../p3.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const passing = "import test from 'node:test'; test('ok', () => {});\n";
const H = '## Standing approvals from Bob';
const claude = (words) => `${H}\n\n${words}\n\n## Other\n\nmore\n`;
const web = () => ({ committer: { login: 'web-flow' }, author: { login: 'neobobkrause' }, commit: { verification: { verified: true } } });
const session = () => ({ committer: { login: 'civicsmith' }, author: { login: 'civicsmith' }, commit: { verification: { verified: false } } });
const webFor = (...shas) => (args) => (shas.some((x) => args[1].endsWith(`/commits/${x}`)) ? web() : session());
const MIN = 60000;

// A session transcript as Claude Code writes it, in a home of its own.
function transcript(lines, id = 'sess-1') {
  const home = mkdtempSync(join(tmpdir(), 'p3-home-'));
  mkdirSync(join(home, '.claude', 'projects', '-work'), { recursive: true });
  writeFileSync(join(home, '.claude', 'projects', '-work', `${id}.jsonl`), lines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n') + '\n');
  return { home, env: { CLAUDE_CODE_SESSION_ID: id } };
}

test('budgets: one table in the tool\'s config, a role\'s figures overridable by the product', () => {
  assert.deepEqual(DEFAULTS.budgets.job, { minutes: 180, cost_usd: 40 });
  const root = makeRepo({ 'process/config.json': { budgets: { job: { minutes: 60 }, review: { cost_usd: 5 }, bad: 'x' } } });
  const b = loadConfig(root).budgets;
  assert.deepEqual(b.job, { minutes: 60, cost_usd: 40 });
  assert.deepEqual(b.review, { cost_usd: 5 });
  assert.equal(b.bad, undefined);
  assert.deepEqual(loadConfig(makeRepo({ 'README.md': 'x' })).budgets, DEFAULTS.budgets);
  assert.notEqual(loadConfig(makeRepo({ 'README.md': 'x' })).budgets.job, DEFAULTS.budgets.job, 'a copy: the defaults never change');
});

test('session record: elapsed and tokens from the transcript, each message once; cost only when stated; else unmeasured', () => {
  const t = transcript([
    { type: 'user', timestamp: '2026-11-03T10:00:00Z', version: '2.1.316' },
    { type: 'assistant', timestamp: '2026-11-03T10:05:00Z', message: { id: 'm1', usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100 } } },
    { type: 'assistant', timestamp: '2026-11-03T10:06:00Z', message: { id: 'm1', usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100 } } },
    'not json',
    { type: 'assistant', timestamp: '2026-11-03T10:47:00Z', message: { id: 'm2', usage: { input_tokens: 1, output_tokens: 2 } } },
  ]);
  const r = sessionRecord(t);
  assert.deepEqual(r, { session: 'sess-1', version: '2.1.316', started: '2026-11-03T10:00:00.000Z', last: '2026-11-03T10:47:00.000Z', minutes: 47, tokens: 118, cost_usd: 'unmeasured' });
  const c = transcript([{ timestamp: '2026-11-03T10:00:00Z', costUSD: 1.25 }, { timestamp: '2026-11-03T10:01:00Z', costUSD: 0.5 }]);
  assert.equal(sessionRecord(c).cost_usd, 1.75);
  assert.equal(sessionRecord(c).tokens, 'unmeasured');
  // No session id, an unsafe one, or no file: no record.
  assert.equal(sessionRecord({ env: {}, home: t.home }), null);
  assert.equal(sessionFile({ env: { CLAUDE_CODE_SESSION_ID: '../x' }, home: t.home }), null);
  assert.equal(sessionRecord({ env: { CLAUDE_CODE_SESSION_ID: 'other' }, home: t.home }), null);
});

test('claudeVersion: from claude --version, else the session record, else unmeasured', () => {
  assert.equal(claudeVersion({ exec: () => ({ code: 0, stdout: '2.1.316 (Claude Code)\n' }), record: () => null }), '2.1.316');
  assert.equal(claudeVersion({ exec: () => ({ code: 127, stdout: '' }), record: () => ({ version: '2.1.300' }) }), '2.1.300');
  assert.equal(claudeVersion({ exec: () => ({ code: 127, stdout: '' }), record: () => null }), 'unmeasured');
  assert.equal(claudeVersion({ exec: () => ({ code: 127, stdout: '' }), record: () => ({ version: 'unmeasured' }) }), 'unmeasured');
});

test('attemptBudget: elapsed from start to complete (or now), cost from BOB\'s figure, else the session record\'s, else unmeasured', () => {
  const t0 = Date.parse('2026-11-03T10:00:00Z');
  const start = (n, at = t0) => ({ row: 'attempt', event: 'start', role: 'job', attempt: n, at: new Date(at).toISOString() });
  const budgets = DEFAULTS.budgets;
  // Running, within budget, cost unmeasured.
  let b = attemptBudget([start(1)], budgets, { now: t0 + 30 * MIN });
  assert.deepEqual([b.attempt, b.minutes, b.cost_usd, b.done, b.over], [1, 30, 'unmeasured', false, []]);
  // Running past its time: flagged.
  b = attemptBudget([start(1)], budgets, { now: t0 + 200 * MIN });
  assert.deepEqual(b.over, ['200 min of 180']);
  // Complete: elapsed stops at the complete row; the session record's cost counts.
  const done = { row: 'attempt', event: 'complete', attempt: 1, at: new Date(t0 + 50 * MIN).toISOString(), cost_usd: 12 };
  b = attemptBudget([start(1), done], budgets, { now: t0 + 999 * MIN });
  assert.deepEqual([b.minutes, b.cost_usd, b.done, b.over], [50, 12, true, []]);
  // BOB's measured figure wins, and over budget is flagged.
  b = attemptBudget([start(1), done, { row: 'attempt', event: 'measured', attempt: 1, cost_usd: 41.5 }], budgets, { now: t0 });
  assert.deepEqual(b.over, ['$41.5 of $40']);
  // The latest attempt is the one judged; another role's budget applies to its own rows.
  b = attemptBudget([start(1), done, start(2, t0 + 60 * MIN)], budgets, { now: t0 + 70 * MIN });
  assert.deepEqual([b.attempt, b.minutes, b.done], [2, 10, false]);
  b = attemptBudget([{ ...start(1), role: 'coordinator' }], budgets, { now: t0 + 500 * MIN });
  assert.deepEqual(b.over, ['500 min of 480']);
  // A role with no budget, or a figure set to null, is never flagged.
  assert.deepEqual(attemptBudget([{ ...start(1), role: 'other' }], budgets, { now: t0 + 9999 * MIN }).over, []);
  assert.deepEqual(attemptBudget([start(1)], { job: { minutes: null, cost_usd: 40 } }, { now: t0 + 9999 * MIN }).over, []);
  assert.equal(attemptBudget([], budgets), null);
});

function product() {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha'),
    'req/alpha.md': '# alpha\n\nR1 does a thing.\n',
    'test/alpha/a.test.mjs': passing,
  });
  git(['branch', 'tranche'], { cwd: root });
  return root;
}

test('job complete records the attempt\'s elapsed time and the session record\'s figures, or unmeasured', () => {
  const root = product();
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  const rec = { session: 'sess-1', version: '2.1.316', minutes: 47, tokens: 118, cost_usd: 'unmeasured' };
  assert.equal(jobComplete(root, 'alpha', { push: false, log: quiet, session: () => rec }).ok, true);
  const row = readRows(root, 'alpha').find((r) => r.event === 'complete');
  assert.equal(typeof row.elapsed_minutes, 'number');
  assert.equal(row.cost_usd, 'unmeasured');
  assert.equal(row.tokens, 118);
  assert.deepEqual(row.session_record, { session: 'sess-1', version: '2.1.316', minutes: 47 });
  // No record readable: every figure unmeasured, never a guess.
  const r2 = product();
  jobStart(r2, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: r2 });
  commit(r2, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  assert.equal(jobComplete(r2, 'alpha', { push: false, log: quiet, session: () => null }).ok, true);
  const row2 = readRows(r2, 'alpha').find((r) => r.event === 'complete');
  assert.deepEqual([row2.cost_usd, row2.tokens, row2.session_record], ['unmeasured', 'unmeasured', 'unmeasured']);
});

test('status flags an attempt over budget, shows a live attempt\'s figures, and says when the open check is due', () => {
  const root = product();
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  // The start row is dated, so elapsed time is measured from a known moment.
  const t0 = Date.parse('2026-11-03T10:00:00Z');
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  const rows = readFileSync(join(root, metricsFile('alpha')), 'utf8').replace(/"at":"[^"]+"/, `"at":"${new Date(t0).toISOString()}"`);
  writeFileSync(join(root, metricsFile('alpha')), rows);
  git(['commit', '-q', '-am', 'date the start'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  // status reads origin/tranche and origin/job/*: a bare origin holding both.
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'tranche', 'job/alpha', 'main'], { cwd: root });
  const run = (now, version) => { const out = []; const r = status(root, { log: (m) => out.push(m), io: { openPRs: () => [], checkRun: () => null }, now, version }); return { text: out.join('\n'), r }; };
  let s = run(t0 + 60 * MIN, '2.1.316');
  assert.match(s.text, /alpha: OPEN; on its branch WORKING, 2 commit\(s\) ahead.*; budget: attempt 1, 60 min, cost unmeasured/);
  assert.doesNotMatch(s.text, /over budget/);
  s = run(t0 + 240 * MIN, '2.1.316');
  assert.match(s.text, /FLAG .*over budget: attempt 1, 240 min of 180 \(job budget\)/);
  assert.match(s.text, /open check: DUE; no open check is recorded/);
  // An open check that passed on this version is current; a new version makes it due again.
  git(['checkout', '-q', 'tranche'], { cwd: root });
  appendRow(root, 'open-check', { row: 'open-check', claude_code: '2.1.316', outcome: 'pass' }, OPEN_CHECK_FILE);
  git(['add', '-A'], { cwd: root });
  git(['commit', '-q', '-m', 'open check'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  assert.match(run(t0, '2.1.316').text, /open check: current; the last open check passed on Claude Code 2\.1\.316/);
  assert.match(run(t0, '2.1.320').text, /open check: DUE; the last open check ran on Claude Code 2\.1\.316, and this is 2\.1\.320/);
  assert.equal(run(t0, '2.1.320').r.openCheck.due, true);
  // BOB's measured cost on the tranche counts too.
  git(['checkout', '-q', 'tranche'], { cwd: root });
  appendRow(root, 'alpha', { row: 'attempt', event: 'measured', attempt: 1, cost_usd: 55 }, bobMetricsFile('alpha'));
  git(['add', '-A'], { cwd: root });
  git(['commit', '-q', '-m', 'measured'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  assert.match(run(t0 + 10 * MIN, '2.1.316').text, /over budget: attempt 1, \$55 of \$40.*cost \$55/);
});

test('openCheckDue: none, an unread version, a changed version, a stopped run are due; a pass on this version is not', () => {
  const pass = { row: 'open-check', claude_code: '2.1.316', outcome: 'pass' };
  assert.equal(openCheckDue([], '2.1.316').due, true);
  assert.equal(openCheckDue([pass], 'unmeasured').due, true);
  assert.equal(openCheckDue([pass], '2.1.317').due, true);
  assert.equal(openCheckDue([pass, { ...pass, outcome: 'stopped' }], '2.1.316').due, true);
  assert.equal(openCheckDue([pass], '2.1.316').due, false);
});

test('metrics open-check writes BOB\'s row with the Claude Code version; a refusal cannot be a pass', async () => {
  const root = makeRepo({ 'README.md': 'x' });
  const cwd = process.cwd();
  process.chdir(root);
  const log = console.log;
  console.log = () => {};
  try {
    assert.equal(await main(['metrics', 'open-check', '--outcome', 'pass', '--session', 's1', '--claude-code', '2.1.316']), 0);
    assert.equal(await main(['metrics', 'open-check', '--outcome', 'pass', '--refusal', 'merge|1|judge', '--claude-code', '2.1.316']), 1);
    assert.equal(await main(['metrics', 'open-check', '--outcome', 'maybe']), 1);
    assert.equal(await main(['metrics', 'open-check', '--outcome', 'stopped', '--decline', 'merge|2', '--claude-code', '2.1.316']), 0);
  } finally {
    console.log = log;
    process.chdir(cwd);
  }
  const rows = readFileSync(join(root, OPEN_CHECK_FILE), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(rows.map((r) => [r.row, r.claude_code, r.outcome, r.session]), [['open-check', '2.1.316', 'pass', 's1'], ['open-check', '2.1.316', 'stopped', null]]);
  assert.deepEqual(rows[1].declines, [{ act: 'merge', depth: '2' }]);
});

// A product with an owner-set block deep in the tranche's history, cloned shallow.
function shallowWorld() {
  const up = makeRepo({ 'README.md': 'x', 'CLAUDE.md': claude('may push') });
  const o1 = git(['rev-parse', 'HEAD'], { cwd: up });
  for (let i = 0; i < 3; i++) commit(up, { [`f${i}.txt`]: String(i) }, `filler ${i}`);
  const dir = join(mkdtempSync(join(tmpdir(), 'p3-shallow-')), 'c');
  git(['clone', '-q', '--depth', '1', `file://${up}`, dir], { cwd: up });
  git(['config', 'user.email', 'session@example.com'], { cwd: dir });
  git(['config', 'user.name', 'Session'], { cwd: dir });
  git(['config', 'commit.gpgsign', 'false'], { cwd: dir });
  const base = git(['rev-parse', 'HEAD'], { cwd: dir });
  return { up, dir, o1, base };
}
const isShallow = (dir) => git(['rev-parse', '--is-shallow-repository'], { cwd: dir }) === 'true';

test('record check at a shallow clone\'s edge: deepened when it can be, so the judgement is the full one', () => {
  const w = shallowWorld();
  commit(w.dir, { 'CLAUDE.md': claude('may push and merge') }, 'a session widens the approvals');
  assert.equal(isShallow(w.dir), true);
  const r = recordCheck(w.dir, DEFAULTS, { base: w.base, lookup: webFor(w.o1), trusted: ['origin/main'] });
  assert.equal(isShallow(w.dir), false, 'deepened');
  assert.deepEqual(r.unverified, []);
  assert.match(r.findings.map((f) => f.message).join('\n'), /changes the approvals but is not neobobkrause's own commit/);
});

test('record check at a shallow clone\'s edge it cannot deepen: reported as not verified, never passed; job complete carries it', () => {
  const w = shallowWorld();
  git(['remote', 'set-url', 'origin', join(w.up, 'gone')], { cwd: w.dir });
  commit(w.dir, { 'CLAUDE.md': claude('may push and merge') }, 'a session widens the approvals');
  const r = recordCheck(w.dir, DEFAULTS, { base: w.base, lookup: webFor(w.o1), trusted: ['origin/main'] });
  assert.equal(isShallow(w.dir), true);
  assert.equal(r.unverified.length, 1);
  assert.match(r.unverified[0], new RegExp(`did not verify commit \\w+'s approvals: this clone is shallow at ${w.base.slice(0, 10)} and could not be deepened`));
  // The approvals untouched: the history is not needed, so nothing is fetched or unverified.
  const q = shallowWorld();
  commit(q.dir, { 'other.txt': 'y' });
  const r2 = recordCheck(q.dir, DEFAULTS, { base: q.base, lookup: webFor(q.o1), trusted: ['origin/main'] });
  assert.deepEqual([r2.findings, r2.unverified, isShallow(q.dir)], [[], [], true]);
  // The command CI runs fails closed on it.
  const cwd = process.cwd();
  process.chdir(w.dir);
  const log = console.log;
  const out = [];
  console.log = (m) => out.push(String(m));
  let code;
  try { code = main(['record-check', '--base', w.base, '--head', 'HEAD', '--onto', 'origin/main']); } finally { console.log = log; process.chdir(cwd); }
  return Promise.resolve(code).then((c) => {
    assert.equal(c, 1);
    assert.match(out.join('\n'), /shallow: \(clone\):1: the record check did not verify/);
  });
});

test('job complete puts a shallow edge it could not deepen into the receipt\'s not_verified', () => {
  const up = makeRepo({
    'process/ledger/alpha.json': entry('alpha'), 'req/alpha.md': '# alpha\n', 'test/alpha/a.test.mjs': passing,
    'process/config.json': {}, 'CLAUDE.md': claude('may push'),
  });
  const o1 = git(['rev-parse', 'HEAD'], { cwd: up });
  for (let i = 0; i < 3; i++) commit(up, { [`f${i}.txt`]: String(i) }, `filler ${i}`);
  git(['branch', 'tranche'], { cwd: up });
  const dir = join(mkdtempSync(join(tmpdir(), 'p3-shallow-')), 'c');
  git(['clone', '-q', '--depth', '1', '--no-single-branch', `file://${up}`, dir], { cwd: up });
  git(['config', 'user.email', 'session@example.com'], { cwd: dir });
  git(['config', 'user.name', 'Session'], { cwd: dir });
  git(['branch', 'tranche', 'origin/tranche'], { cwd: dir });
  jobStart(dir, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: dir });
  git(['remote', 'set-url', 'origin', join(up, 'gone')], { cwd: dir });
  commit(dir, { 'CLAUDE.md': claude('may push and merge') }, 'touches the approvals');
  const r = jobComplete(dir, 'alpha', { push: false, log: quiet, session: () => null, lookup: webFor(o1) });
  assert.equal(r.ok, true, 'not judged here: the gate\'s full clone judges it');
  assert.equal(r.receipt.not_verified.length, 1);
  assert.match(r.receipt.not_verified[0], /the record check did not verify .*shallow .*could not be deepened/);
});
