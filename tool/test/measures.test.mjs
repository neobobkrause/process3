// The gate-row measures: ROOT's context per sweep (P2-G10), survival and cost per surviving pull
// request (P3-G5), and the stateless BOB wake (P3-A1, SES-16).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commit, makeRepo } from './helpers.mjs';
import { statelessWake, survivalReport } from '../lib/measures.mjs';
import { WAKES_FILE, readRows, recordWake, report, rootContext, wakes } from '../lib/metrics.mjs';
import { recordStart, rootPrompt } from '../lib/roles.mjs';
import { readState } from '../lib/state.mjs';
import { SWEEP_ROWS_FILE, sweep, sweepTask } from '../lib/sweep.mjs';
import { git } from '../lib/util.mjs';

const quiet = () => {};
const R = 'session_root1';
const DAY = 86400000;
const HASH = 'a'.repeat(64);

function withOrigin(files = {}) {
  const root = makeRepo({ 'README.md': 'x', 'CLAUDE.md': 'Bob\'s approvals\n', 'process/config.json': { tranche: 'tranche' }, ...files });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  return root;
}

test('sweep --context: ROOT\'s context on the sweep row, and the estimate of sweeps left', () => {
  const root = withOrigin();
  recordStart(root, 'root', R, { log: quiet });
  for (const c of [10, '14%', 18]) sweep(root, { session: R, offline: true, context: c, log: quiet });
  sweep(root, { session: R, offline: true, log: quiet });
  const rows = readState(root, 'process-state', SWEEP_ROWS_FILE).trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(rows.map((r) => r.root_context), [10, 14, 18, 'unmeasured']);
  for (const bad of [true, 'lots', 140]) assert.throws(() => sweep(root, { session: R, offline: true, context: bad, log: quiet }), /--context/);
  const est = rootContext(rows, 60);
  assert.deepEqual(est.sweeps.map((s) => s.context), [10, 14, 18]);
  assert.equal(est.rise_per_sweep, 4);
  assert.equal(est.sweeps_left, 10); // (60 - 18) / 4, rounded down
  assert.equal(rootContext([{ at: 'x', row: 'sweep', session: R, root_context: 5 }]).sweeps_left, 'unmeasured');
  assert.equal(rootContext([]), 'unmeasured');
  // Only the addressed ROOT's sweeps: the last row's session.
  assert.equal(rootContext([...rows, { at: 'y', row: 'sweep', session: 'session_new', root_context: 3 }]).sweeps.length, 1);
  // The prompts ROOT runs the sweep from carry the flag.
  assert.match(sweepTask(R, 'tranche', HASH).prompt, /sweep --session session_root1 --live <[^>]+> --context </);
  assert.match(rootPrompt({ slug: 'o/r', approvals: HASH }), /sweep --session <your id> --live <n> --context <pct>/);
  const r = report(root, 'o/r', 'HEAD', { read: { comments: () => [], getPR: () => null }, sweepRows: rows, refreshAt: 60 });
  assert.equal(r.root_context.sweeps_left, 10);
});

// A job merged into the tranche the way the tool merges it: its branch, its merge row, a merge
// commit titled "Merge job PR <n>"; the row dated <age> days ago.
function mergeJob(root, id, pr, ageDays, files) {
  git(['checkout', '-q', '-b', `job/${id}`, 'tranche'], { cwd: root });
  commit(root, files, `${id} work`);
  const at = new Date(Date.now() - ageDays * DAY).toISOString();
  commit(root, { [`process/metrics/${id}.jsonl`]: [
    { at, module: id, row: 'attempt', event: 'start', attempt: 1 },
    { at, module: id, row: 'attempt', event: 'measured', role: 'job', attempt: 1, session: 'session_j', cost_usd: 3 },
    { at, module: id, row: 'merge', pr },
  ].map((x) => JSON.stringify(x)).join('\n') + '\n' }, `merge row for ${id} (PR ${pr})`);
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', `job/${id}`, '-m', `Merge job PR ${pr}`], { cwd: root });
  return git(['rev-parse', 'HEAD'], { cwd: root });
}

test('metrics survival: stands, reverted, every line undone, younger than the window, and on main', () => {
  const root = makeRepo({ 'README.md': 'x', 'process/config.json': { tranche: 'tranche' } });
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  mergeJob(root, 'a', 1, 20, { 'src/a.js': 'one\ntwo\n' });
  const b = mergeJob(root, 'b', 2, 20, { 'src/b.js': 'three\n' });
  mergeJob(root, 'c', 3, 20, { 'src/c.js': 'four\nfive\n' });
  mergeJob(root, 'd', 4, 2, { 'src/d.js': 'six\n' });
  git(['revert', '--no-edit', '-m', '1', b], { cwd: root });
  commit(root, { 'src/c.js': 'other\n' }, 'rewrite c'); // no revert, but every line c added is gone
  commit(root, { 'src/a.js': 'one\nchanged\n' }, 'touch a'); // one line of a's still stands
  git(['branch', '-f', 'main', 'tranche~1'], { cwd: root }); // main holds all but the last commit
  const s = survivalReport(root, { branch: 'tranche', main: 'main', days: 14 });
  const by = Object.fromEntries(s.prs.map((p) => [p.pr, p]));
  assert.equal(by[1].tranche, 'stands');
  assert.equal(by[1].main, 'stands');
  assert.equal(by[1].survived, true);
  assert.match(by[2].tranche, /^undone: reverted by /);
  assert.equal(by[2].survived, false);
  assert.equal(by[3].tranche, 'undone: every line it added is gone');
  assert.equal(by[4], undefined);
  assert.deepEqual([s.measured, s.surviving, s.pending_younger], [3, 1, 1]);
  // Cost: the rows up to the cutoff (three jobs at 3 USD each) over the one surviving PR.
  assert.equal(s.cost_usd, 9);
  assert.equal(s.cost_per_surviving_pr, 9);
  assert.ok(s.unmeasured_cost.includes('a gate'));
  assert.ok(s.unmeasured_cost.includes('BOB and ROOT (no priced row)'));
  assert.match(s.rule, /This reverts commit/);
  // A main that never got the merge says so; a window of 0 days measures the young one too.
  git(['branch', '-f', 'main', 'tranche~4'], { cwd: root }); // up to PR 3's merge
  const t = survivalReport(root, { branch: 'tranche', main: 'main', days: 0 });
  assert.equal(t.prs.find((p) => p.pr === 4).main, 'not merged there');
  assert.equal(t.pending_younger, 0);
  // A merge row whose merge commit the clone lacks is unmeasured, never counted as survived.
  commit(root, { 'process/metrics/e.jsonl': JSON.stringify({ at: new Date(Date.now() - 30 * DAY).toISOString(), module: 'e', row: 'merge', pr: 9 }) + '\n' }, 'row only');
  assert.equal(survivalReport(root, { branch: 'tranche', days: 14 }).prs.find((p) => p.pr === 9).survived, 'unmeasured');
});

test('bob wake --stateless prints the fresh BOB\'s call and its size, writing nothing; metrics wake records one wake', () => {
  const root = withOrigin();
  recordStart(root, 'root', R, { log: quiet });
  const before = git(['rev-parse', 'refs/remotes/origin/process-state'], { cwd: root });
  const out = [];
  const w = statelessWake(root, { slug: 'o/r', offline: true, live: 1, log: (l) => out.push(l) });
  assert.match(w.prompt, /^# BOB, one stateless wake/);
  assert.match(w.prompt, /## CLAUDE\.md\n\nBob's approvals/);
  assert.match(w.prompt, /## status --role bob\n\n[\s\S]*reading set for bob: \d+ bytes/);
  assert.match(w.prompt, /ROOT, session `session_root1`/);
  assert.equal(w.bytes, Buffer.byteLength(w.prompt));
  assert.equal(w.call.prompt, w.prompt);
  assert.equal(w.call.source_url, 'https://github.com/o/r');
  assert.equal(w.call.clone_depth, 1);
  assert.ok(out.includes(`prompt: ${w.bytes} bytes`));
  assert.equal(git(['rev-parse', 'refs/remotes/origin/process-state'], { cwd: root }), before);
  assert.equal(git(['status', '--porcelain'], { cwd: root }), '');
  recordWake(root, { session: 'session_s1', tokens: '1200', usd: '0.4', mode: 'stateless' });
  recordWake(root, { session: 'session_b1', tokens: 9000, usd: 2, mode: 'resident' });
  const rows = readRows(root, null, WAKES_FILE);
  assert.deepEqual(rows.map((r) => [r.row, r.mode, r.tokens, r.cost_usd]), [['wake', 'stateless', 1200, 0.4], ['wake', 'resident', 9000, 2]]);
  const cmp = wakes(rows);
  assert.equal(cmp.stateless.mean_tokens, 1200);
  assert.equal(cmp.resident.mean_usd, 2);
  assert.equal(wakes([]).stateless, 'unmeasured');
  assert.equal(report(root, 'o/r', 'HEAD', { read: { comments: () => [], getPR: () => null } }).wakes.resident.wakes, 1);
  for (const bad of [{ mode: 'warm' }, { tokens: 'many' }, { usd: true }, { session: 'bob' }]) {
    assert.throws(() => recordWake(root, { session: 'session_s1', tokens: 1, usd: 1, mode: 'stateless', ...bad }), /a wake needs/);
  }
});
