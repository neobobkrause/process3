// Flow control (Bob, 5 Nov, Build Plan R10; as the coordinator's audit of PR 140 set it): the cap
// checked on a single start; starts owed a printed marker, never a refusal, feeding the idle alarm
// at 15 min; idle capacity judged on tool runs between sweeps; working against waiting sessions;
// the release path first in start order. And the fault injections, each found by the first tool run
// after it (CHECK_MIN, 5 minutes, within the 15 asked) and cleared.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { entry, makeRepo, openPassed, setJobCap } from './helpers.mjs';
import { OWED_FILE, bobAct, hold, owe, owes, paid, readOwed } from '../lib/hold.mjs';
import { capCheck, startable } from '../lib/ready.mjs';
import { fetchState, jsonl, readState, writeState } from '../lib/state.mjs';
import { flow, status } from '../lib/status.mjs';
import { CHECK_MIN, SWEEP_ROWS_FILE, beforeAct, idleCapacity, idleCheck, senderFor } from '../lib/sweep.mjs';
import { main } from '../p3.mjs';
import { git } from '../lib/util.mjs';

const SB = 'process-state';
const quiet = () => {};
const unmet = (n) => Array.from({ length: n }, (_, i) => `- **R${i + 1}** *(not yet met: x)* text`).join('\n') + '\n';
const ago = (min, t = Date.now()) => new Date(t - min * 6e4).toISOString();

// A product: layer 1 closed by its marks, layer 2's three OPEN entries never started.
function product(files = {}) {
  const root = makeRepo({
    'build/layers.md': '| Layer | Modules |\n|---|---|\n| 1 | `done` |\n| 2 | `a`, `b`, `c` |\n',
    'process/config.json': JSON.stringify({ coordinator: 'session_coord1' }),
    'build/requirements/done.md': '# done\n',
    'process/ledger/done.json': entry('done', { requirements: 'build/requirements/done.md', layer: 1, status: { state: 'COMPLETE' } }),
    ...Object.fromEntries(['a', 'b', 'c'].flatMap((id) => [[`build/requirements/${id}.md`, unmet(1)], [`process/ledger/${id}.json`, entry(id, { requirements: `build/requirements/${id}.md`, layer: 2 })]])),
    ...files,
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  openPassed(root);
  git(['push', '-q', 'origin', `refs/remotes/origin/${SB}:refs/heads/${SB}`], { cwd: root });
  // Layer 1 closed by layer close, nothing deferred: layer 2 is the open layer.
  writeState(root, SB, 'closed', (d) => { mkdirSync(join(d, 'layers'), { recursive: true }); writeFileSync(join(d, 'layers/closed.jsonl'), JSON.stringify({ row: 'closed', tranche: 'tranche', layer: 1, commit: git(['rev-parse', 'HEAD'], { cwd: root }), deferred: [] }) + '\n'); });
  return root;
}
const sweepRows = (root) => { fetchState(root, SB, { fresh: true }); return jsonl(readState(root, SB, SWEEP_ROWS_FILE)); };
const addRow = (root, row) => writeState(root, SB, 'row', (dir) => { git(['-C', dir, 'status'], { allowFail: true }); writeFileSync(join(dir, SWEEP_ROWS_FILE), (readState(root, SB, SWEEP_ROWS_FILE) || '') + JSON.stringify(row) + '\n'); });

test('job start <id> checks the cap as job start --ready does: --live or --sessions required, the cap less slot holds', (t) => {
  setJobCap(t, 4);
  const root = product();
  assert.throws(() => capCheck(root, {}), /job start <id> --live <n> \(or --sessions <file>\)/);
  assert.equal(capCheck(root, { live: '3' }).n, 3);
  assert.throws(() => capCheck(root, { live: '4' }), /the job cap is full: 4 job sessions live of the cap 4; nothing was started/);
  hold(root, 'slots:1', { why: 'rehearsal', by: 'session_x1', until: '30m', log: quiet });
  assert.throws(() => capCheck(root, { live: '3' }), /3 job sessions live of the cap 4 less 1 held/);
});

test('start order: the release path first; debt (base-red found marks only) takes no slot while release work is startable', () => {
  const x = (id, tag = {}) => ({ file: `r/${id}.md`, count: 1, module: id, entry_state: 'OPEN', ...tag });
  const r = startable([x('d1', { debt: true }), x('n1'), x('l1', { release: true }), x('l2', { release: true })]);
  assert.deepEqual(r.go.map((j) => j.id), ['l1', 'l2', 'n1']);
  assert.match(r.skip.find((s) => s.id === 'd1').why, /^debt \(base-red found marks only\): no slot while release-path work is startable$/);
  assert.deepEqual(startable([x('d1', { debt: true }), x('n1')]).go.map((j) => j.id), ['n1', 'd1'], 'no release work: debt last, not held');
});

test('next work tags the release path (layer work, release_path) and debt (every unmet mark a base-red found mark)', () => {
  const root = product({
    'process/config.json': JSON.stringify({ release_path: ['solo'] }),
    'build/requirements/c.md': '- **F1** *(not yet met: base-red gate run 12)* x\n',
    'process/found/solo.md': '- **F1** *(not yet met: walk)* y\n',
  });
  const out = status(root, { role: 'bob', offline: true, heads: new Set(), log: quiet });
  const by = Object.fromEntries(out.next.filter((y) => y.module).map((y) => [y.module, [!!y.release, !!y.debt]]));
  assert.deepEqual([by.a, by.b, by.c], [[true, false], [true, false], [false, true]]);
  assert.deepEqual(startable(out.next).go.map((j) => j.id), ['a', 'b']);
});

test('starts owed: a marker the owing acts write and job start --ready pays up to its start; printed first, never a refusal', async () => {
  assert.equal(owes('merge', { _: ['12'] }), 'merge 12');
  assert.equal(owes('notice triage', { _: ['p:1'], record: 'f' }), 'triage recorded p:1');
  assert.equal(owes('status', { _: [] }), null);
  assert.deepEqual(['merge', 'handoff', 'layer close'].map((n) => bobAct(n, { _: [] })), [true, true, true]);
  assert.deepEqual([bobAct('job start', { ready: true }), bobAct('send', { from: 'job-a' }), bobAct('status', {}), bobAct('job complete', {})], [false, false, false, false]);
  const dir = mkdtempSync(join(tmpdir(), 'p3-owed-'));
  owe(dir, 'merge 1');
  const begun = new Date(Date.now() + 1000).toISOString();
  writeFileSync(join(dir, OWED_FILE), JSON.stringify({ since: ago(20), acts: [{ at: ago(20), act: 'merge 1' }, { at: new Date(Date.now() + 5000).toISOString(), act: 'block b' }] }));
  paid(dir, begun);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, OWED_FILE), 'utf8')).acts.map((x) => x.act), ['block b'], 'a later act stands');
  // In a product: status prints it first; a BOB act prints it first and keeps its own exit.
  const root = product();
  writeState(root, SB, 'owed', (d) => owe(d, 'merge 7'));
  const s = [];
  status(root, { role: 'bob', offline: true, log: (l) => s.push(l) });
  assert.match(s[0], /^starts owed since \S+ \(merge 7\): run job start --ready$/);
  const cwd = process.cwd();
  const said = [];
  const [l, e] = [console.log, console.error];
  console.log = (m) => said.push(String(m));
  console.error = (m) => said.push(String(m));
  let code;
  try { process.chdir(root); code = await main(['merge']); } finally { process.chdir(cwd); console.log = l; console.error = e; }
  assert.equal(code, 1, 'merge with no number fails as before: never refused');
  assert.match(said.join('\n'), /p3 merge: name the pull request number/);
  assert.ok(readOwed(root, SB), 'a failed act owes nothing and clears nothing');
});

test('idle capacity: starts owed 15 min or more with startable work alarms at once; dead ends listed first', () => {
  const work = [{ file: 'r/a.md', count: 1, module: 'a', entry_state: 'OPEN' }, { file: 'r/w.md', count: 1, module: 'w', entry_state: 'WORKING' }];
  const t = Date.now();
  const base = { live: 2, cap: 6, holds: [], work, startable: 1, layers: new Map(), prev: { at: ago(1, t) }, t };
  assert.equal(idleCapacity(base).alarm, false);
  const ic = idleCapacity({ ...base, owed: { since: ago(16, t) } });
  assert.equal(ic.alarm, true);
  assert.equal(ic.owed_since, ago(16, t));
  assert.equal(idleCapacity({ ...base, owed: { since: ago(10, t) } }).alarm, false);
  assert.deepEqual(ic.dead, ["dead end w: entry WORKING: BOB's judgment"]);
  assert.deepEqual(ic.reasons.slice(0, 2), ["dead end w: entry WORKING: BOB's judgment", '1 x startable, not started']);
});

test('working against waiting: each open job\'s session running or idle, and what an idle one waits on', (t) => {
  setJobCap(t, 20);
  const rows = [
    { id: 'a', tranche: 'OPEN', branch: 'WORKING' }, { id: 'b', tranche: 'OPEN', branch: 'COMPLETE', ready: true, gate: 'pending' },
    { id: 'c', tranche: 'OPEN', branch: 'COMPLETE', ready: true, gate: 'success' }, { id: 'd', tranche: 'BLOCKED', branch: 'BLOCKED' }, { id: 'e', tranche: 'OPEN', branch: 'WORKING' },
  ];
  const s = (id, st) => ({ id: `session_${id}`, title: `job ${id}`, session_status: `SESSION_STATUS_${st}`, updated_at: ago(1) });
  const f = flow({ targets: {} }, rows, [], 5, [s('a', 'RUNNING'), s('b', 'IDLE'), s('c', 'IDLE'), s('d', 'IDLE'), s('e', 'IDLE')]);
  assert.deepEqual([f.working, f.waiting], [1, 4]);
  assert.match(f.line, /^flow: live 5\/20 \((default|P3_JOB_CAP)\) \(working 1, waiting 4: b gate, c merge, d block, e BOB\), startable 0/);
});

// Fault injection 1: a spoken limit. BOB, told "only 1", measured 1 live at job start --ready,
// started nothing, recorded no hold; a merge since owes starts. The first command any role runs
// CHECK_MIN on records the idle; once the idle (or the starts owed) reaches 15 min the next check
// alarms and prints the wakes; job start --ready's starts clear it.
test('fault injection: a spoken limit is found by tool runs between sweeps and cleared by job start --ready', (t) => {
  setJobCap(t, 4);
  const root = product();
  const cfg = JSON.parse(readFileSync(join(root, 'process/config.json'), 'utf8'));
  const c = { ...cfg, state_branch: SB, tranche: 'tranche', plan: 'run', requirements_dir: 'build/requirements', layers_file: 'build/layers.md' };
  const t0 = Date.now();
  addRow(root, { at: ago(6, t0), row: 'ready', live: 1, job_cap: 4, started: [] });
  writeState(root, SB, 'owed', (d) => owe(d, 'merge 9'));
  const said = [];
  const first = idleCheck(root, c, { by: 'job complete', from: 'job-a', t: t0, log: (l) => said.push(l)});
  assert.equal(first.idle_capacity.kind, 'work');
  assert.equal(first.idle_capacity.alarm, false);
  assert.equal(idleCheck(root, c, { by: 'status', t: t0 + 60e3, log: quiet }), null, 'within CHECK_MIN no second check');
  // 16 minutes on: the starts owed is over 15 min old, the check alarms, BOB and the coordinator woken.
  const later = t0 + 16 * 6e4;
  addRow(root, { at: ago(30, later), row: 'ready', live: 1, job_cap: 4, started: [] });
  writeState(root, SB, 'owed old', (d) => writeFileSync(join(d, OWED_FILE), JSON.stringify({ since: ago(16, later), acts: [{ at: ago(16, later), act: 'merge 9' }] })));
  const out = [];
  const alarm = idleCheck(root, c, { by: 'job complete', from: 'job-a', t: later, log: (l) => out.push(l) });
  assert.equal(alarm.idle_capacity.alarm, true);
  assert.match(out.join('\n'), /^IDLE CAPACITY: 1 job sessions live of the cap 4, 3 startable, for \d+ min \(starts owed since \S+\); 3 x startable, not started/m);
  assert.match(out.join('\n'), /next act: wake BOB with `node \.process\/tool\/p3\.mjs send bob "IDLE CAPACITY.*job start --ready --live <n>: run status" --from job-a`/);
  assert.match(out.join('\n'), /tell the coordinator: send_message to session_coord1/);
  assert.equal(sweepRows(root).at(-1).row, 'check');
  // job start --ready filled the cap: measured 4 live; the next check finds nothing idle.
  addRow(root, { at: new Date(later + 6e4).toISOString(), row: 'ready', live: 4, job_cap: 4, started: ['a', 'b', 'c'] });
  writeState(root, SB, 'paid', (d) => paid(d, new Date(later + 6e5).toISOString()));
  const cleared = idleCheck(root, c, { by: 'status', t: later + (CHECK_MIN + 1) * 6e4, log: quiet });
  assert.equal(cleared.idle_capacity, undefined);
  // No measured live count (none within LIVE_MIN): no judgment.
  assert.equal(idleCheck(root, c, { by: 'status', t: later + 200 * 6e4, log: quiet }).live, 'unmeasured');
});

// Fault injection 2: a dead end, next work that job start --ready skips as BOB's judgment (an
// entry in a state no start takes; status itself no longer lists one, so the read injects it). The
// first check lists it first and prints it for the coordinator; gone, the next check has none.
test('fault injection: a dead end is listed first by the next tool run and sent to the coordinator; cleared when gone', (t) => {
  setJobCap(t, 6);
  const root = product();
  const c = { coordinator: 'session_coord1', state_branch: SB, tranche: 'tranche', plan: 'run', requirements_dir: 'build/requirements', layers_file: 'build/layers.md', targets: {} };
  const t0 = Date.now();
  addRow(root, { at: ago(6, t0), row: 'ready', live: 1, job_cap: 6, started: [] });
  const stuck = { file: 'build/requirements/z.md', count: 2, module: 'z', entry_state: 'DEFERRED' };
  const read = (extra) => (r, o) => { const x = status(r, o); return { ...x, next: [...x.next, ...extra] }; };
  const out = [];
  const row = idleCheck(root, c, { by: 'test', t: t0, read: read([stuck]), log: (l) => out.push(l) });
  assert.deepEqual(row.idle_capacity.dead, ["dead end z: entry DEFERRED: BOB's judgment"]);
  assert.match(out.join('\n'), /^dead ends \(a Process3 defect\), to the coordinator: dead end z: entry DEFERRED: BOB's judgment$/m);
  const after = idleCheck(root, c, { by: 'test', t: t0 + (CHECK_MIN + 1) * 6e4, read: read([]), log: quiet });
  assert.equal(after.idle_capacity.dead, undefined);
});

// Fault injection 3: an unanswered BLOCKED job: its idle session is counted waiting on its block in
// the flow line (and the sweep's ruling owed stands as before); ruled, it waits no more.
test('fault injection: an unanswered BLOCKED job shows as a session waiting on its block, and no more once ruled', (t) => {
  setJobCap(t, 6);
  const s = { id: 'session_q', title: 'job q', session_status: 'SESSION_STATUS_IDLE', updated_at: ago(40) };
  const blocked = flow({ targets: { decision_minutes: 30 } }, [{ id: 'q', tranche: 'BLOCKED', since: ago(40) }], [], 1, [s]);
  assert.match(blocked.line, /waiting 1: q block\), startable 0, blocked 1 \(oldest 40 min\)/);
  const ruled = flow({ targets: { decision_minutes: 30 } }, [{ id: 'q', tranche: 'OPEN', branch: 'WORKING' }], [], 1, [{ ...s, session_status: 'SESSION_STATUS_RUNNING' }]);
  assert.match(ruled.line, /working 1, waiting 0\), startable 0, blocked 0/);
});

test('before each command: starts owed printed first for BOB\'s acts; the idle check\'s wake names the job that ran it; nothing in GitHub Actions', (t) => {
  setJobCap(t, 4);
  const root = product();
  const c = { coordinator: 'session_coord1', state_branch: SB, tranche: 'tranche', plan: 'run', requirements_dir: 'build/requirements', layers_file: 'build/layers.md', targets: {} };
  addRow(root, { at: ago(10), row: 'ready', live: 1, job_cap: 4, started: [] });
  writeState(root, SB, 'owed', (d) => { mkdirSync(join(d, 'flow'), { recursive: true }); writeFileSync(join(d, OWED_FILE), JSON.stringify({ since: ago(16), acts: [{ at: ago(16), act: 'merge 9' }] })); });
  assert.equal(beforeAct(root, c, 'job complete', { _: ['a'] }, { env: { GITHUB_ACTIONS: 'true' }, log: quiet }), null);
  const out = [];
  beforeAct(root, c, 'merge', { _: ['5'] }, { env: { GITHUB_ACTIONS: 'true' }, log: (l) => out.push(l) });
  assert.match(out[0], /^starts owed since/);
  const said = [];
  const row = beforeAct(root, c, 'job complete', { _: ['a'] }, { env: {}, log: (l) => said.push(l) });
  assert.equal(row.idle_capacity.alarm, true);
  assert.match(said.join('\n'), /next act: wake BOB with `node \.process\/tool\/p3\.mjs send bob "IDLE CAPACITY.*" --from job-a`/);
  // Another session within CHECK_MIN: no second row, no second wake.
  const again = [];
  assert.equal(beforeAct(root, c, 'block', { _: ['b'] }, { env: {}, log: (l) => again.push(l) }), null);
  assert.deepEqual(again, []);
  // A race: this clone's state branch is stale (its last row old), origin's has a fresh row; the
  // re-read in the worktree finds it, and nothing is pushed or printed.
  const t1 = Date.now() + (CHECK_MIN + 1) * 6e4;
  const tip = git(['rev-parse', `refs/remotes/origin/${SB}`], { cwd: root });
  addRow(root, { at: new Date(t1 - 6e4).toISOString(), row: 'check', live: 1, job_cap: 4 });
  const pushed = git(['rev-parse', `refs/remotes/origin/${SB}`], { cwd: root });
  git(['update-ref', `refs/remotes/origin/${SB}`, tip], { cwd: root });
  const raced = [];
  assert.equal(idleCheck(root, c, { by: 'block', from: 'job-b', t: t1, log: (l) => raced.push(l) }), null);
  assert.deepEqual(raced, []);
  fetchState(root, SB, { fresh: true });
  assert.equal(git(['rev-parse', `refs/remotes/origin/${SB}`], { cwd: root }), pushed, 'no commit pushed by the loser');
  // A job's own status and send name it as the sender; job start --ready and the sweep check nothing.
  assert.equal(senderFor(root, 'status', { role: 'job', module: 'q' }), 'job-q');
  assert.equal(senderFor(root, 'send', { from: 'job-q' }), 'job-q');
  assert.equal(beforeAct(root, c, 'job start', { _: [], ready: true }, { env: {}, log: quiet }), null);
});
