// PD-7 (coordinator, 7 Nov): a published job does not hold a job slot. The job cap counts jobs still
// working toward publish; a published job (its pull request into the layer ready) holds none while
// its gate is pending or green; when its newest gate run on its head is red it resumes and holds a
// slot again; the account's live sessions stay printed.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { capCheck } from '../lib/cap.mjs';
import { gateRed, publishedJobs, slotUse } from '../lib/slots.mjs';
import { writeState } from '../lib/state.mjs';
import { flow, liveJobIds } from '../lib/status.mjs';
import { SWEEP_ROWS_FILE, idleCheck } from '../lib/sweep.mjs';
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
  startable: Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, cmd: `${P3} job start m${i} --live <n>` })),
  ready: false, ...over,
});
// p3's gate red; p4 running; p5 never run; the rest green.
const gates = { h3: run('failure'), h4: run(null, 'in_progress'), h5: null };
const gate = (pr) => (pr.head in gates ? gates[pr.head] : run('success'));

test('PD-7: a published job holds no slot while its gate is pending or green; red, it resumes and holds one; unread, it holds one', () => {
  assert.equal(gateRed(run('failure')), true);
  assert.equal(gateRed(run('timed_out')), true);
  assert.equal(gateRed(run('cancelled')), false, 'cancelled: superseded by a newer push, waiting on its gate');
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
  // A gate read that fails: the job holds a slot (the safe side).
  const unread = publishedJobs(view(2), { gate: () => { throw new Error('gh: 502'); } });
  assert.deepEqual(slotUse(5, unread).working, 5);
  assert.equal(slotUse(undefined, pub).working, null, 'unmeasured: no count');
});

test('PD-7: job start counts the jobs working toward publish; a resumed job counts; the full message names both counts', (t) => {
  setJobCap(t, 20);
  const root = makeRepo({ 'README.md': 'x' });
  // 20 live of the cap 20, 4 published with a gate not red: 16 working, a start goes.
  const r = capCheck(root, { live: '20', io: { view: view(), gate, slug: 'o/p' } });
  assert.deepEqual([r.n, r.working, r.free, r.resumed], [20, 16, ['p1', 'p2', 'p4', 'p5'], ['p3']]);
  // Every published gate red: all resumed, the cap is full, and the message says how many live.
  assert.throws(() => capCheck(root, { live: '20', io: { view: view(), gate: () => run('failure'), slug: 'o/p' } }),
    /the job cap is full: 20 job sessions working of the cap 20 \(20 live; resumed on a red gate: p1, p2, p3, p4, p5\); nothing was started/);
  // The layer unread: every live session holds a slot, said.
  const said = [];
  assert.throws(() => capCheck(root, { live: '20', log: (l) => said.push(l), io: { readView: () => fail('GitHub unreadable'), slug: 'o/p' } }), /the job cap is full: 20 job sessions working of the cap 20 \(20 live\)/);
  assert.match(said.join('\n'), /the open layer was not read \(GitHub unreadable\): every live job session holds a slot/);
  assert.deepEqual(capCheck(root, { live: '19', io: { view: null, slug: 'o/p' } }).working, 19, 'no open layer: every live session holds a slot');
});

test('PD-7: the flow line counts working against the cap and keeps the live count; free slots and the queue follow working', (t) => {
  setJobCap(t, 20);
  const v = view(5, { startable: [{ id: 's', cmd: `${P3} job start s --live <n>` }, { id: 'u', cmd: `${P3} job start u --live <n>` }] });
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
  writeState(root, SB, 'sweep', (d) => { mkdirSync(join(d, 'metrics'), { recursive: true }); writeFileSync(join(d, SWEEP_ROWS_FILE), JSON.stringify({ at: iso(T0), row: 'sweep', live: 20, live_measured_at: iso(T0 - 60e3), job_cap: 20 }) + '\n'); });
  const lines = [];
  const r = idleCheck(root, configOf({}), { by: 'test', t: T0 + 25 * 6e4, read: () => ({ open: { state: 'open' }, holds: [] }), readView: () => view(), io: { gate, slug: 'o/p' }, log: (l) => lines.push(String(l)) });
  // 20 live, 4 published holding none: 16 working, 4 empty slots, 30 startable: the alarm.
  assert.deepEqual([r.live, r.slots_working, r.published_free, r.resumed, r.idle_capacity.empty, r.idle_capacity.alarm], [20, 16, 4, ['p3'], 4, true]);
  assert.match(lines.join('\n'), /IDLE CAPACITY: 16 job sessions working toward publish \(20 live; 4 published holding no slot \(PD-7\); resumed on a red gate: p3\) of the cap 20/);
});
