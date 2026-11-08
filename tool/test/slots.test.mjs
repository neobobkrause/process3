// PD-7 (coordinator, 7 Nov): a published job does not hold a job slot. The job cap counts jobs still
// working toward publish; a published job (its pull request into the layer ready) holds none while
// its gate is pending or green; when its newest gate run on its head is red it resumes and holds a
// slot again; the account's live sessions stay printed.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { capCheck, countedLines } from '../lib/cap.mjs';
import { gateRed, newestGate, publishedJobs, slotUse } from '../lib/slots.mjs';
import { writeState } from '../lib/state.mjs';
import { flow, liveJobIds } from '../lib/status.mjs';
import { SWEEP_ROWS_FILE, idleCheck, knownJobIds } from '../lib/sweep.mjs';
import { flowFile } from '../lib/layerbase.mjs';
import { writeRows } from '../lib/layerflow.mjs';
import { configOf, fail, git } from '../lib/util.mjs';
import { makeRepo, setJobCap } from './helpers.mjs';

const P3 = 'node .process/tool/p3.mjs';
const SB = 'process-state';
const run = (conclusion, status = 'completed') => ({ status, conclusion });
// An open layer: p1..p5 published (PR 101..105 ready), w working, s startable.
const view = (n = 5, over = {}) => ({
  kind: 'open', n: 11,
  states: [...Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, state: 'published', pr: 101 + i })), { id: 'w', state: 'working', pr: 200 }, { id: 's', state: 'not started' }],
  prs: [...Array.from({ length: n }, (_, i) => ({ number: 101 + i, draft: false, head: `h${i + 1}`, module: `p${i + 1}` })), { number: 200, draft: true, head: 'hw', module: 'w' }],
  startable: Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, cmd: `${P3} job start m${i} --sessions <file>` })),
  ready: false, ...over,
});
// p3's gate red; p4 running; p5 never run; the rest green.
const gates = { h3: run('failure'), h4: run(null, 'in_progress'), h5: null };
const gate = (pr) => (pr.head in gates ? gates[pr.head] : run('success'));
// A list_sessions result saved as JSON: one running job session per module named (C28: job start
// counts from it, never from a typed number).
const sessions = (ids) => {
  const file = join(mkdtempSync(join(tmpdir(), 'p3-sessions-')), 's.json');
  writeFileSync(file, JSON.stringify({ ccr: { data: ids.map((id) => ({ id: `session_${id}`, title: `job ${id}`, session_status: 'SESSION_STATUS_RUNNING' })) } }));
  return file;
};
const others = (n) => Array.from({ length: n }, (_, i) => `x${i + 1}`);
const twenty = () => sessions(['p1', 'p2', 'p3', 'p4', 'p5', 'w', ...others(14)]);

test('PD-7: a published job holds no slot while its gate is pending or green; red, it resumes and holds one; unread, it holds one', () => {
  assert.equal(gateRed(run('failure')), true);
  assert.equal(gateRed(run('timed_out')), true);
  assert.equal(gateRed(run('cancelled')), true, 'cancelled and newest: nothing will finish it, the job re-runs it');
  assert.equal(gateRed(run('stale')), true);
  assert.equal(gateRed(run(null, 'in_progress')), false);
  assert.equal(gateRed(null), false, 'not yet run: waiting on its gate');
  const pub = publishedJobs(view(), { gate });
  assert.deepEqual(pub.map((p) => [p.id, p.red]), [['p1', false], ['p2', false], ['p3', true], ['p4', false], ['p5', false]]);
  assert.deepEqual(publishedJobs({ kind: 'next', n: 12 }, { gate }), [], 'no open layer: none');
  const u = slotUse(18, pub);
  assert.deepEqual([u.live, u.working, u.free, u.resumed], [18, 14, ['p1', 'p2', 'p4', 'p5'], ['p3']]);
  // With list_sessions: a published job with no live session subtracts nothing.
  const listed = [{ title: 'job p1', session_status: 'SESSION_STATUS_IDLE' }, { title: 'job p2 (restart)' }, { title: 'job p4', session_status: 'SESSION_STATUS_ARCHIVED' }, { title: 'job w' }];
  assert.deepEqual([...liveJobIds(listed)].sort(), ['p1', 'p2', 'w']);
  assert.deepEqual(slotUse(4, pub, { jobIds: liveJobIds(listed) }).free, ['p1', 'p2']);
  // A gate read that fails: the job holds a slot (the safe side), named. GitHub unreadable reads as
  // undefined (checkRuns null), not as "no run" (null): the default reader tells them apart.
  const unread = publishedJobs(view(2), { gate: () => { throw new Error('gh: 502'); } });
  assert.deepEqual([slotUse(5, unread).working, slotUse(5, unread).unread], [5, ['p1', 'p2']]);
  let reads = 0;
  assert.equal(newestGate('o/p', 'x1', { read: () => { reads++; return null; } }), undefined, 'unreadable');
  assert.equal(newestGate('o/p', 'x2', { read: () => [] }), null, 'no run yet');
  const viaDefault = publishedJobs(view(1), { gate: (pr) => newestGate('o/p', pr.head, { read: () => null }) });
  assert.deepEqual([viaDefault[0].unread, slotUse(3, viaDefault).working], [true, 3]);
  // A completed run on a head is read once per command; one still running is read again.
  newestGate('o/p', 'x3', { read: () => { reads++; return [run('success')]; } });
  newestGate('o/p', 'x3', { read: () => { reads++; return [run('failure')]; } });
  newestGate('o/p', 'x4', { read: () => { reads++; return [run(null, 'in_progress')]; } });
  newestGate('o/p', 'x4', { read: () => { reads++; return [run(null, 'in_progress')]; } });
  assert.equal(reads, 1 + 1 + 2);
  assert.equal(slotUse(undefined, pub).working, null, 'unmeasured: no count');
});

test('PD-7: job start counts the jobs working toward publish; a resumed job counts; the full message names both counts', (t) => {
  setJobCap(t, 20);
  const root = makeRepo({ 'README.md': 'x' });
  // 20 live of the cap 20, 4 published with a gate not red: 16 working, a start goes.
  const r = capCheck(root, { sessions: twenty(), io: { view: view(), gate, slug: 'o/p' } });
  assert.deepEqual([r.n, r.working, r.free, r.resumed], [20, 16, ['p1', 'p2', 'p4', 'p5'], ['p3']]);
  // Every published gate red: all resumed, the cap is full, and the message says how many live.
  assert.throws(() => capCheck(root, { sessions: twenty(), io: { view: view(), gate: () => run('failure'), slug: 'o/p' } }),
    /the job cap is full: 20 job sessions working of the cap 20 \(20 live; resumed on a red gate: p1, p2, p3, p4, p5\); nothing was started/);
  // The layer unread: every live session holds a slot, said.
  const said = [];
  assert.throws(() => capCheck(root, { sessions: twenty(), log: (l) => said.push(l), io: { readView: () => fail('GitHub unreadable'), slug: 'o/p' } }), /the job cap is full: 20 job sessions working of the cap 20 \(20 live\)/);
  assert.match(said.join('\n'), /the open layer was not read \(GitHub unreadable\): every live job session holds a slot/);
  assert.deepEqual(capCheck(root, { sessions: sessions(others(19)), io: { view: null, slug: 'o/p' } }).working, 19, 'no open layer: every live session holds a slot');
});

test('PD-7: the flow line counts working against the cap and keeps the live count; free slots and the queue follow working', (t) => {
  setJobCap(t, 20);
  const v = view(5, { startable: [{ id: 's', cmd: `${P3} job start s --sessions <file>` }, { id: 'u', cmd: `${P3} job start u --sessions <file>` }] });
  const use = slotUse(20, publishedJobs(v, { gate }));
  const f = flow(configOf({}), [], [], 20, null, [], { view: v, use });
  assert.match(f.line, /^flow: working 16\/20 \(P3_JOB_CAP; live 20, 4 published holding no slot \(PD-7\); resumed on a red gate: p3\), startable 2/);
  assert.ok(!f.queued, '4 slots free, 2 startable: none queued');
  // No published job: the line as before.
  assert.match(flow(configOf({}), [], [], 19, null, [], { view: v, use: slotUse(19, []) }).line, /^flow: live 19\/20 \(P3_JOB_CAP\)/);
});

test('PD-7: the idle check judges empty slots on the jobs working toward publish, and says the live count', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  const T0 = Math.ceil((Date.now() + 120e3) / 1000) * 1000;
  const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
  writeState(root, SB, 'sweep', (d) => { mkdirSync(join(d, 'metrics'), { recursive: true }); writeFileSync(join(d, SWEEP_ROWS_FILE), JSON.stringify({ at: iso(T0), row: 'sweep', live: 20, live_measured_at: iso(T0 - 60e3), job_cap: 20, job_ids: ['p1', 'p2', 'p3', 'p4', 'p5', 'w'] }) + '\n'); });
  const lines = [];
  const r = idleCheck(root, configOf({}), { by: 'test', t: T0 + 25 * 6e4, read: () => ({ open: { state: 'open' }, holds: [] }), readView: () => view(), io: { gate, slug: 'o/p' }, log: (l) => lines.push(String(l)) });
  // 20 live, 4 published holding none: 16 working, 4 empty slots, 30 startable: the alarm.
  assert.deepEqual([r.live, r.slots_working, r.published_free, r.resumed, r.idle_capacity.empty, r.idle_capacity.alarm], [20, 16, 4, ['p3'], 4, true]);
  assert.match(lines.join('\n'), /IDLE CAPACITY: 16 job sessions working toward publish \(20 live; 4 published holding no slot \(PD-7\); resumed on a red gate: p3\) of the cap 20/);
});

// Cold review of C26: a published job whose session the record does not know as live subtracts
// nothing from the idle check (no false alarm); a sweep given --live alone records no job ids.
test('PD-7: the idle check subtracts only published jobs the measuring sweep saw live (or started since)', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  const T0 = Math.ceil((Date.now() + 120e3) / 1000) * 1000;
  const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
  const sweepRow = (ids) => writeState(root, SB, 'sweep', (d) => { mkdirSync(join(d, 'metrics'), { recursive: true }); writeFileSync(join(d, SWEEP_ROWS_FILE), JSON.stringify({ at: iso(T0), row: 'sweep', live: 20, live_measured_at: iso(T0 - 60e3), job_cap: 20, ...(ids ? { job_ids: ids } : {}) }) + '\n'); });
  const check = () => idleCheck(root, configOf({}), { by: 'test', t: T0 + 25 * 6e4, read: () => ({ open: { state: 'open' }, holds: [] }), readView: () => view(), io: { gate, slug: 'o/p' }, log: () => {} });
  // p1 and p2's sessions were seen; p4 and p5's were not (archived): 2 subtracted.
  sweepRow(['p1', 'p2', 'w']);
  assert.equal(check().slots_working, 18);
  // --live alone: no ids known, nothing subtracted, no alarm on 20 of 20.
  sweepRow(null);
  const r = check();
  assert.deepEqual([r.slots_working, r.idle_capacity], [undefined, undefined]);
  // A published job started since the sweep is live.
  sweepRow([]);
  writeRows(root, SB, 'starts', [[flowFile(11, 'start', 'p4-x'), { row: 'start', layer: 11, module: 'p4', at: iso(T0 + 5 * 6e4) }]]);
  assert.deepEqual(knownJobIds(root, SB, view(), { at: iso(T0), live_measured_at: iso(T0 - 60e3), job_ids: [] }), new Set(['p4']));
});

// C28 (the coordinator, 8 Nov): on the copy BOB's start script passed --live 20, a number it typed,
// and job start refused on the cap while 15 of 20 slots were empty (layer 11, 23:00-00:12Z). The
// count comes from list_sessions only; a bare --live is refused; a refusal lists what it counted.
test('C28: job start counts the cap from --sessions only; a typed --live is refused; a refusal lists the sessions counted', (t) => {
  setJobCap(t, 20);
  const root = makeRepo({ 'README.md': 'x\n' });
  const io = { view: view(), gate, slug: 'o/p' };
  assert.throws(() => capCheck(root, { live: '20', io }), /^Error: --live 20 is not taken: job start <id> --sessions <file>: your list_sessions result saved as JSON/);
  assert.throws(() => capCheck(root, { io }), /^Error: job start <id> --sessions <file>/);
  assert.throws(() => capCheck(root, { sessions: true, io }), /job start <id> --sessions <file>/);
  // The copy's case: 5 job sessions live, --live 20 typed beside them: counted 5, the start goes.
  const said = [];
  const r = capCheck(root, { live: '20', sessions: sessions(['p1', 'w', 'a', 'b', 'c']), io, log: (l) => said.push(l) });
  assert.deepEqual([r.n, r.working, r.free], [5, 4, ['p1']]);
  assert.match(said.join('\n'), /--live 20 ignored: the job sessions are counted from --sessions/);
  // A refusal on the cap names each session it counted and whether it holds a slot.
  setJobCap(t, 3);
  let msg = '';
  try { capCheck(root, { sessions: sessions(['p1', 'p3', 'w', 'a']), io }); } catch (e) { msg = e.message; }
  assert.match(msg, /the job cap is full: 3 job sessions working of the cap 3 \(4 live; 1 published holding no slot \(PD-7\); resumed on a red gate: p3\); nothing was started\. Counted from --sessions:/);
  assert.match(msg, /\n- session_p1 "job p1" SESSION_STATUS_RUNNING: published, holds no slot \(PD-7\)/);
  assert.match(msg, /\n- session_p3 "job p3" SESSION_STATUS_RUNNING: resumed on a red gate, holds a slot/);
  assert.match(msg, /\n- session_a "job a" SESSION_STATUS_RUNNING: holds a slot/);
});

// Cold review of C28: BOB lists sessions once a wake and runs each start line with the same file.
// Every job started since the list was read counts, so a burst stops at the cap; a refusal's lines
// mark one session per freed job, and name a carried one.
test('C28: starts recorded since the list was read count against the cap; one free mark per published job; carried named', (t) => {
  setJobCap(t, 4);
  const root = makeRepo({ 'README.md': 'x\n' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  const T = Date.parse('2026-11-07T23:00:00Z');
  const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
  const file = join(mkdtempSync(join(tmpdir(), 'p3-sessions-')), 's.json');
  writeFileSync(file, JSON.stringify([{ id: 'session_a', title: 'job a', session_status: 'SESSION_STATUS_RUNNING', created_at: iso(T - 60e3) }, { id: 'session_b', title: 'job b', session_status: 'SESSION_STATUS_RUNNING', created_at: iso(T) }]));
  const io = { view: { kind: 'open', n: 11, states: [], prs: [], startable: [] }, slug: 'o/p' };
  // A start before the list was read is in the list (or gone): not added.
  writeRows(root, SB, 'starts', [[flowFile(11, 'start', 'old'), { row: 'start', layer: 11, module: 'z', at: iso(T - 5 * 6e4) }]]);
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.deepEqual([capCheck(root, { sessions: file, io }).n, capCheck(root, { sessions: file, io }).since], [2, []]);
  // The burst: c and d started after the list was read (a restart on a fresh branch not counted).
  writeRows(root, SB, 'starts', [
    [flowFile(11, 'start', 'c'), { row: 'start', layer: 11, module: 'c', at: iso(T + 60e3) }],
    [flowFile(11, 'start', 'd'), { row: 'start', layer: 11, module: 'd', at: iso(T + 2 * 6e4) }],
    [flowFile(11, 'start', 'a-r'), { row: 'start', layer: 11, module: 'a', restart: true, at: iso(T + 3 * 6e4) }],
  ]);
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  let msg = '';
  try { capCheck(root, { sessions: file, io }); } catch (e) { msg = e.message; }
  assert.match(msg, /the job cap is full: 4 job sessions working of the cap 4 \(4 live: 2 listed, 2 started since\); nothing was started\. Counted from --sessions and the start rows since:/);
  assert.match(msg, /\n- \(no session listed yet\) job c: started since the list was read, holds a slot/);
  // countedLines: a job and its restart both live, the job published: one marked free; carried named.
  const lines = countedLines([{ id: 's1', title: 'job p1', updated_at: iso(T) }, { id: 's2', title: 'job p1 (restart)', updated_at: iso(T + 6e4) }, { id: 's3', title: 'job q', carried: true }], { free: ['p1'], resumed: [] });
  assert.deepEqual(lines.map((l) => l.replace(/^- (\S+).*: (.*)$/, '$1 $2')), ['s1 holds a slot', 's2 published, holds no slot (PD-7)', 's3 holds a slot']);
  assert.match(lines[2], /carried from the last read/);
});
