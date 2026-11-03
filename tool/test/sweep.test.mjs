import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commit, entry, makeRepo } from './helpers.mjs';
import { readAddress, recordStart, rootPrompt, startRole } from '../lib/roles.mjs';
import { readState, writeState } from '../lib/state.mjs';
import { HEARTBEAT_FILE, sweep, sweepTask, watch } from '../lib/sweep.mjs';
import { git } from '../lib/util.mjs';

const quiet = () => {};
const R = 'session_root1';
const B = 'session_bob1';
const W = 'session_watch1';
const OLD = '2026-01-01T00:00:00Z';

function withOrigin(files = {}, env = {}) {
  const old = { ...process.env };
  Object.assign(process.env, env);
  try {
    const root = makeRepo({ 'README.md': 'x', 'process/config.json': { tranche: 'tranche' }, ...files });
    git(['branch', 'tranche'], { cwd: root });
    const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
    git(['init', '-q', '--bare', bare], { cwd: root });
    git(['remote', 'add', 'origin', bare], { cwd: root });
    git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
    git(['checkout', '-q', 'tranche'], { cwd: root });
    git(['fetch', '-q', 'origin'], { cwd: root });
    return root;
  } finally { process.env = old; }
}
const run = (root, o = {}) => { const out = []; const r = sweep(root, { session: R, offline: true, log: (l) => out.push(l), ...o }); return { ...r, out: out.join('\n') }; };
const beat = (root) => JSON.parse(readState(root, 'process-state', HEARTBEAT_FILE));
const setBeat = (root, at) => writeState(root, 'process-state', 'hb', (d) => writeFileSync(join(d, HEARTBEAT_FILE), JSON.stringify({ at, session: R }) + '\n'));

test('sweep step 0: another ROOT is addressed, so it ends and writes nothing', () => {
  const root = withOrigin();
  recordStart(root, 'root', 'session_other', { log: quiet });
  const r = run(root);
  assert.equal(r.act, 'end');
  assert.match(r.out, /step 0.*session_other.*end the turn/);
  assert.equal(readState(root, 'process-state', HEARTBEAT_FILE), null);
  assert.throws(() => sweep(root, { session: 'x', offline: true, log: quiet }), /--session/);
});

test('sweep: nothing owed writes the heartbeat; over the live cap wakes BOB with one send', () => {
  const root = withOrigin();
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  const r = run(root, { live: 3 });
  assert.equal(r.act, 'heartbeat');
  assert.deepEqual(beat(root).found, ['live 3 of 24']);
  assert.deepEqual(beat(root).done, ['heartbeat only']);
  const o = run(root, { live: 25 });
  assert.equal(o.todo.length, 1);
  assert.match(o.todo[0], /send bob "Sweep: 25 live sessions, over the cap of 24.*--from root/);
  assert.throws(() => run(root, { live: 'many' }), /--live/);
});

test('sweep step 1: a paused plan is heartbeat only', () => {
  const root = withOrigin({ 'process/config.json': { tranche: 'tranche', plan: 'pause' } });
  recordStart(root, 'root', R, { log: quiet });
  const r = run(root, { live: 30 });
  assert.deepEqual([r.act, r.found], ['heartbeat', ['live 30 of 24', 'plan pause', '30 live sessions, over the cap of 24: archive finished ones before starting more']]);
  assert.throws(() => run(root, { live: true }), /--live/);
});

test('sweep step 2: no BOB, a silent BOB, a BOB flagged REFRESH', () => {
  const root = withOrigin({}, { GIT_COMMITTER_DATE: OLD, GIT_AUTHOR_DATE: OLD });
  recordStart(root, 'root', R, { log: quiet });
  assert.match(run(root).todo[0], /start bob/);
  writeState(root, 'process-state', 'old bob', (d) => writeFileSync(join(d, 'addresses/bob.json'), JSON.stringify({ session: B, at: OLD })));
  const s = run(root);
  assert.match(s.found.join(), /BOB session_bob1 silent/);
  assert.match(s.todo[0], /handover begin/);
  // Fresh tranche, but ten refusals for BOB: REFRESH.
  const rows = Array.from({ length: 10 }, (_, i) => JSON.stringify({ row: 'refusal', id: `r${i}`, session: B, act: 'a', depth: 1 })).join('\n') + '\n';
  commit(root, { 'process/metrics/refusals.bob.jsonl': rows });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin', 'tranche'], { cwd: root });
  assert.match(run(root).found.join(), /flagged REFRESH/);
});

test('sweep step 2: next work waiting and no job open is the same handover', () => {
  const root = withOrigin({ 'build/requirements/m.md': '- **R1** *(not yet met: x)* y\n' });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  const s = run(root);
  assert.match(s.found.join(), /BOB session_bob1 idle .*h with next work/);
  assert.match(s.todo[0], /handover begin/);
  commit(root, { 'process/ledger/m.json': entry('m', { requirements: 'build/requirements/m.md' }) });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin', 'tranche'], { cwd: root });
  assert.equal(run(root).act, 'heartbeat', 'a job is open and BOB wrote within the hour');
});

test('sweep step 3: a blocked job and an attempt far over its role\'s median', () => {
  const root = withOrigin({
    'process/ledger/m1.json': entry('m1', { status: { state: 'BLOCKED', reason: 'x' } }),
    'process/metrics/m1.bob.jsonl': ['2', '3', '2'].map((c) => JSON.stringify({ row: 'attempt', event: 'measured', role: 'job', cost_usd: Number(c), minutes: 30 })).join('\n') + '\n',
  });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  const r = run(root, { attempts: ['m2:job:200:7', 'm3:job:40:3'] });
  assert.match(r.found.join('|'), /m1: BLOCKED\|m2: 200 min, over 3x the job median 30\|m2: 7 USD, over 3x the job median 2$/);
  assert.equal(r.todo.length, 1);
  assert.throws(() => run(root, { attempts: ['nope'] }), /--attempt/);
});

test('watch: end while the heartbeat is fresh; take over when it is old, absent, or ROOT is full', () => {
  const root = withOrigin();
  const w = (o = {}) => { const out = []; return { ...watch(root, { session: W, offline: true, log: (l) => out.push(l), ...o }), out: out.join('\n') }; };
  assert.match(w().out, /no ROOT is addressed/);
  recordStart(root, 'root', R, { log: quiet });
  const none = w();
  assert.equal(none.act, 'take over');
  assert.match(none.out, new RegExp(`start record root ${W}[\\s\\S]*sweep task --session ${W}[\\s\\S]*push notification`));
  setBeat(root, new Date().toISOString());
  assert.equal(w().act, 'end');
  assert.equal(w({ full: true }).act, 'take over');
  setBeat(root, new Date(Date.now() - 5 * 36e5).toISOString());
  assert.match(w().why, /heartbeat is 5h old/);
  recordStart(root, 'root', W, { log: quiet });
  assert.match(w().out, /you are ROOT/);
});

test('start watcher, start record watcher, sweep task, and ROOT\'s prompt', () => {
  const root = withOrigin();
  const s = startRole(root, 'watcher', { slug: 'o/p', address: {}, log: quiet });
  for (const x of ['Priorities first', 'watch --session', 'start record root', 'sweep task', 'push notification']) assert.ok(s.prompt.includes(x), x);
  assert.doesNotMatch(s.prompt, /—/);
  assert.match(s.call.source_revision, /^[0-9a-f]{40}$/);
  assert.equal(s.call.source_revision, git(['rev-parse', 'origin/tranche'], { cwd: root }));
  assert.match(s.task.cron_expression, /^\d+ \d+ \* \* \*$/);
  recordStart(root, 'watcher', W, { log: quiet });
  assert.equal(readAddress(root).watcher.session, W);
  assert.throws(() => startRole(root, 'watcher', { slug: 'o/p', log: quiet }), /one per account/);
  const t = sweepTask(R);
  assert.ok(t.prompt.includes('`git fetch origin tranche`') && sweepTask(R, 'tr2').prompt.includes('`git fetch origin tr2`'));
  assert.match(t.prompt, new RegExp(`sweep --session ${R} --live`));
  assert.equal(t.call.cron_expression, '0 * * * *');
  const p = rootPrompt({ slug: 'o/p' });
  for (const x of ['sweep task --session', 'start watcher', 'start record watcher', 'persistent_session_id', 'sweep --session']) assert.ok(p.includes(x), x);
});
