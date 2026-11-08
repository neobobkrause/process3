import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commit, entry, makeRepo, openPassed } from './helpers.mjs';
import { handoverConfirm, promptRefresh, readAddress, recordStart, rootPrompt, startRole } from '../lib/roles.mjs';
import { readState, writeState } from '../lib/state.mjs';
import { HEARTBEAT_FILE, SWEEP_ROWS_FILE, sweep, sweepTask, watch } from '../lib/sweep.mjs';
import { git } from '../lib/util.mjs';
import { status } from '../lib/status.mjs';

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
  assert.deepEqual(beat(root).found, ['job cap 20 (default): 3 job sessions live']);
  // The live count and cap go in the sweep row: lead times names a full cap as a wait's cause.
  const row = readState(root, 'process-state', SWEEP_ROWS_FILE).trim().split('\n').map((l) => JSON.parse(l)).at(-1);
  assert.deepEqual([row.live, row.job_cap], [3, 20]);
  assert.deepEqual(beat(root).done, ['heartbeat only']);
  const o = run(root, { live: 21 });
  assert.equal(o.todo.length, 1);
  assert.match(o.todo[0], /send bob "Sweep: 21 job sessions, over the job cap of 20.*--from root/);
  assert.throws(() => run(root, { live: 'many' }), /--live/);
});

test('sweep step 1: a paused plan is heartbeat only', () => {
  const root = withOrigin({ 'process/config.json': { tranche: 'tranche', plan: 'pause' } });
  recordStart(root, 'root', R, { log: quiet });
  const r = run(root, { live: 30 });
  assert.deepEqual([r.act, r.found], ['heartbeat', ['job cap 20 (default): 30 job sessions live', 'plan pause', '30 job sessions, over the job cap of 20: archive finished ones before starting more']]);
  assert.throws(() => run(root, { live: true }), /--live/);
});

const wakeAt = (root, at) => writeState(root, 'process-state', 'wake', (d) => { mkdirSync(join(d, 'messages'), { recursive: true }); writeFileSync(join(d, 'messages/root.jsonl'), JSON.stringify({ at, row: 'sent', n: 1, to: 'bob', text: 'Sweep: x.' }) + '\n'); });

test('sweep step 2: no BOB; a silent BOB is woken, then handed over two hours after the wake; REFRESH', () => {
  const root = withOrigin({}, { GIT_COMMITTER_DATE: OLD, GIT_AUTHOR_DATE: OLD });
  recordStart(root, 'root', R, { log: quiet });
  assert.match(run(root).todo[0], /start bob/);
  writeState(root, 'process-state', 'old bob', (d) => writeFileSync(join(d, 'addresses/bob.json'), JSON.stringify({ session: B, at: OLD })));
  const s = run(root);
  assert.match(s.found.join(), /BOB session_bob1 silent/);
  assert.equal(s.todo.length, 1);
  assert.match(s.todo[0], /wake BOB with one message: .*send bob "Sweep: BOB session_bob1 silent/);
  // A wake within two hours is outstanding: nothing more for BOB.
  wakeAt(root, new Date(Date.now() - 36e5).toISOString());
  assert.equal(run(root).act, 'heartbeat');
  // Woken over two hours ago and nothing written since: the handover.
  wakeAt(root, new Date(Date.now() - 3 * 36e5).toISOString());
  const h = run(root);
  assert.match(h.found.join(), /BOB session_bob1 silent .*h, 3h after a wake/);
  assert.match(h.todo[0], /handover begin/);
  // Fresh tranche, but ten refusals for BOB: REFRESH.
  const rows = Array.from({ length: 10 }, (_, i) => JSON.stringify({ row: 'refusal', id: `r${i}`, session: B, act: 'a', depth: 1 })).join('\n') + '\n';
  commit(root, { 'process/metrics/refusals.bob.jsonl': rows });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin', 'tranche'], { cwd: root });
  assert.match(run(root).found.join(), /flagged REFRESH/);
});

test('sweep step 2: an idle BOB with next work and no job open is woken, not handed over', () => {
  const root = withOrigin({ 'build/requirements/m.md': '- **R1** *(not yet met: x)* y\n' });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  const s = run(root);
  assert.equal(s.todo.length, 1);
  assert.match(s.todo[0], /send bob "Sweep: BOB session_bob1 idle 0h with next work: run node \.process\/tool\/p3\.mjs status --role bob \(the layer flow's next act\)\."/);
  assert.match(beat(root).found.join(), /BOB session_bob1 idle 0h with next work/);
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
  assert.match(r.found.join('|'), /m1: BLOCKED; blocked since unknown\|m2: 200 min, over 3x the job median 30\|m2: 7 USD, over 3x the job median 2$/);
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

// The escalation chain (Bob, 4 Nov): a message to ROOT unanswered for targets.decision_minutes
// makes the watcher take over at once, even while ROOT's heartbeat is fresh; not before.
test('watch --escalated: takes over once the message is decision_minutes old, fresh heartbeat or not; ends before', () => {
  const root = withOrigin();
  const w = (o = {}) => { const out = []; return { ...watch(root, { session: W, offline: true, log: (l) => out.push(l), ...o }), out: out.join('\n') }; };
  assert.match(w({ escalated: '45' }).out, /no ROOT is addressed.*tell Bob by push notification, with the escalation/);
  recordStart(root, 'root', R, { log: quiet });
  setBeat(root, new Date().toISOString());
  assert.equal(w().act, 'end');
  const early = w({ escalated: '29' });
  assert.equal(early.act, 'end');
  assert.match(early.out, /29 of 30 minutes old; ROOT keeps it/);
  const due = w({ escalated: '30' });
  assert.equal(due.act, 'take over');
  assert.match(due.why, new RegExp(`ROOT ${R} left a message unanswered 30 min, past 30`));
  assert.match(due.out, new RegExp(`start record root ${W}`));
  setBeat(root, new Date(Date.now() - 5 * 36e5).toISOString());
  assert.match(w({ escalated: '10' }).why, /heartbeat is 5h old/, 'an early escalation never holds back a due takeover');
  assert.equal(w({ escalated: '10', full: true }).act, 'take over');
  setBeat(root, new Date().toISOString());
  assert.throws(() => w({ escalated: true }), /--escalated takes the minutes/);
  assert.throws(() => w({ escalated: 'soon' }), /--escalated takes the minutes/);
  commit(root, { 'process/config.json': { tranche: 'tranche', targets: { decision_minutes: 10 } } }, 'ten minutes');
  assert.equal(w({ escalated: '12' }).act, 'take over');
  commit(root, { 'process/config.json': { tranche: 'tranche', targets: { decision_minutes: 0 } } }, 'none');
  assert.throws(() => w({ escalated: '12' }), /decision_minutes 0 .* not a positive number/);
  assert.equal(w().act, 'end', 'a bad decision_minutes never blocks the daily watch');
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
  assert.throws(() => startRole(root, 'watcher', { slug: 'o/p', replace: 'session_other', log: quiet }), /--replace names the addressed watcher, session_watch1/);
  const out = [];
  startRole(root, 'watcher', { slug: 'o/p', replace: W, log: (l) => out.push(l) });
  assert.match(out.at(-1), new RegExp(`delete the old watcher ${W}'s daily task.*after the new one's is created`));
  recordStart(root, 'watcher', 'session_watch2', { log: quiet });
  assert.equal(readAddress(root).watcher.session, 'session_watch2');
  // A watcher that took over as ROOT is still the addressed watcher: replaced only by --replace.
  assert.throws(() => startRole(root, 'watcher', { slug: 'o/p', address: { root: { session: 'session_watch2' }, watcher: { session: 'session_watch2', at: 'x' } }, log: quiet }), /one per account/);
  const t = sweepTask(R, 'tranche', 'b'.repeat(64));
  assert.ok(t.prompt.includes('`git fetch origin tranche`') && sweepTask(R, 'tr2', 'b'.repeat(64)).prompt.includes('`git fetch origin tr2`'));
  assert.throws(() => sweepTask(R), /needs the hash/);
  assert.match(t.prompt, /start check --wake --approvals b{64}`; if it says the approvals changed, tell Bob by push notification and take no further step/);
  assert.match(t.prompt, new RegExp(`sweep --session ${R} --sessions`));
  assert.equal(t.call.cron_expression, '0 * * * *');
  const p = rootPrompt({ slug: 'o/p', approvals: 'b'.repeat(64) });
  for (const x of ['sweep task --session', 'start watcher', 'start record watcher', 'persistent_session_id', 'sweep --session']) assert.ok(p.includes(x), x);
  // ROOT's one task edit (4 Nov: a pin changed what sweep task prints, and only the owning
  // session may edit its task): its own sweep task's prompt, to what sweep task prints, nothing else.
  assert.ok(p.includes('your hourly sweep task is the prompt `node .process/tool/p3.mjs sweep task --session <your id>` prints: if list_triggers shows none bound to you, create it (create_trigger, no persistent_session_id); if its prompt differs, update_trigger only its prompt, to that; never fire it'));
  assert.ok(p.includes("edit no task but your sweep task's prompt") && !p.includes('edit no task,'));
  assert.ok(t.prompt.includes("edit no task but this one's prompt as your ROOT prompt allows"));
  assert.ok(Buffer.byteLength(p) <= 4096, `${Buffer.byteLength(p)} bytes`);
});

test('sweep step 3: a WORKING job that pushed and then stopped past SILENT_HOURS wakes BOB; one that pushed lately does not', () => {
  const root = withOrigin({
    'process/ledger/stale.json': entry('stale', { status: { state: 'WORKING' } }),
    'process/ledger/fresh.json': entry('fresh', { status: { state: 'WORKING' } }),
  });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  for (const [id, at] of [['stale', new Date(Date.now() - 3 * 36e5).toISOString()], ['fresh', new Date().toISOString()]]) {
    git(['checkout', '-q', '-b', `job/${id}`, 'origin/tranche'], { cwd: root });
    commit(root, { [`src/${id}/a.js`]: '1' }, 'start');
    process.env.GIT_COMMITTER_DATE = at;
    try { commit(root, { [`src/${id}/a.js`]: '2' }, 'work in progress'); } finally { delete process.env.GIT_COMMITTER_DATE; }
    git(['push', '-q', 'origin', `job/${id}`], { cwd: root });
    git(['checkout', '-q', 'tranche'], { cwd: root });
  }
  git(['fetch', '-q', 'origin'], { cwd: root });
  const r = run(root);
  assert.ok(r.found.includes('stale: WORKING, no push for 3h'), r.found.join('|'));
  assert.ok(!r.found.some((f) => f.startsWith('fresh')), r.found.join('|'));
  assert.equal(r.todo.length, 1);
  assert.match(r.todo[0], /stale: WORKING, no push for 3h/);
});

test('sweep row: BOB\'s idle time is recorded when status lists acts for it, and not otherwise', () => {
  const root = withOrigin({ 'process/ledger/m1.json': entry('m1', { status: { state: 'BLOCKED', reason: 'x' } }) });
  recordStart(root, 'root', R, { log: quiet });
  run(root);
  recordStart(root, 'bob', B, { log: quiet });
  run(root);
  const rows = readState(root, 'process-state', SWEEP_ROWS_FILE).trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(rows.map((r) => [r.row, r.session, r.bob_acts]), [['sweep', R, 'unmeasured'], ['sweep', R, true]]);
  assert.equal(typeof rows[1].bob_quiet_h, 'number');
  const quietRoot = withOrigin();
  recordStart(quietRoot, 'root', R, { log: quiet });
  recordStart(quietRoot, 'bob', B, { log: quiet });
  run(quietRoot);
  const q = JSON.parse(readState(quietRoot, 'process-state', SWEEP_ROWS_FILE));
  assert.deepEqual([q.bob_acts, q.bob_quiet_h], [false, null]);
});

// Review of PR 68: a triage owed is an act for BOB, so the sweep counts it.
test('sweep row: an untriaged provider notice alone is an act for BOB', () => {
  const root = withOrigin();
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  writeState(root, 'process-state', 'notice', (wt) => {
    mkdirSync(join(wt, 'notices'), { recursive: true });
    writeFileSync(join(wt, 'notices/p-7.json'), JSON.stringify({ row: 'notice', key: 'p:7', provider: 'p', ids: ['R1'], pr: 7, users: ['u1'] }) + '\n');
    return {};
  });
  run(root);
  assert.equal(JSON.parse(readState(root, 'process-state', SWEEP_ROWS_FILE)).bob_acts, true);
});

// Coordinator, 4 Nov (from PR 69's report): a layer ready to close lists no next work, so the
// sweep, the backstop, missed it; and a bad open_by made nextWork throw inside the sweep.
test('sweep: a layer the train called ready to close says nothing offline; a bad open_by is a finding and the heartbeat is still written', () => {
  const layers = '| layer | what | modules |\n|---|---|---|\n| 1 | first | a |\n| 2 | next | d |\n';
  const root = withOrigin({
    'build/layers.md': layers,
    'build/requirements/a.md': '- **R1** *(not yet met: x)* y\n',
    'build/requirements/d.md': '- **R1** *(not yet met: x)* y\n',
    'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md', status: { state: 'COMPLETE' } }),
  });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  const s = run(root);
  // Offline the open layer is unread: no train-era close line, and no wake for it (layer merge is read online).
  assert.doesNotMatch(s.found.join('; '), /ready to close/);
  assert.equal(s.todo.length, 0, s.todo.join('\n'));

  const bad = withOrigin({ 'process/config.json': { tranche: 'tranche', open_by: 'bogus' }, 'build/layers.md': layers, 'build/requirements/a.md': '- **R1** *(not yet met: x)* y\n', 'build/requirements/d.md': '- **R1** *(not yet met: x)* y\n' });
  recordStart(bad, 'root', R, { log: quiet });
  recordStart(bad, 'bob', B, { log: quiet });
  const b = run(bad);
  assert.match(b.found.join('; '), /config: open_by "bogus" in process\/config\.json is not one of/);
  assert.match(beat(bad).found.join('; '), /config: open_by "bogus"/);
});

// Prompt refresh (measured 4 Nov 00:05: a ROOT ran on its starting prompt after the pin moved).
test('start check --wake prompt refresh: an old prompt hash at a new pin prints the new prompt once, then records it', () => {
  const root = withOrigin();
  const out = [];
  const pr = (o = {}) => { out.length = 0; return promptRefresh(root, { pin: 'f'.repeat(40), log: (...l) => out.push(l.join(' ')), ...o }); };
  recordStart(root, 'root', R, { log: quiet });
  assert.match(readAddress(root).root.prompt.hash, /^[0-9a-f]{64}$/, 'start record stores the prompt hash');
  assert.equal(pr({ session: R }).act, 'same');
  // An old prompt: the hash this pin's prompt no longer has.
  const sb = 'process-state';
  writeState(root, sb, 'old prompt', (d) => writeFileSync(join(d, 'addresses/root.json'), JSON.stringify({ session: R, at: OLD, prompt: { hash: '0'.repeat(64) } }) + '\n'));
  const r = pr({ session: R });
  assert.equal(r.act, 'changed');
  const text = out.join('\n');
  assert.match(text, new RegExp(`^prompt changed at ${'f'.repeat(40)}: read the new prompt below and act by it`));
  assert.ok(text.includes('# ROOT\n') && text.includes('## Acts you may take'), 'the new prompt itself');
  assert.ok(Buffer.byteLength(r.prompt) <= 4096, 'within its cap');
  assert.match(text, /fresh ROOT: send the coordinator one message asking for ROOT's handover/);
  assert.equal(readAddress(root).root.at, OLD, 'the address keeps its time');
  assert.equal(pr({ session: R }).act, 'same', 'delivered once');
  // A ROOT started before prompt records: its first wake delivers the prompt.
  writeState(root, sb, 'no record', (d) => writeFileSync(join(d, 'addresses/root.json'), JSON.stringify({ session: R, at: OLD }) + '\n'));
  const old = process.env.CLAUDE_CODE_REMOTE_SESSION_ID;
  process.env.CLAUDE_CODE_REMOTE_SESSION_ID = R.replace(/^session_/, 'cse_');
  try { assert.equal(pr().act, 'changed', 'the session found from the container'); } finally { if (old === undefined) delete process.env.CLAUDE_CODE_REMOTE_SESSION_ID; else process.env.CLAUDE_CODE_REMOTE_SESSION_ID = old; }
  // BOB by handover keeps its old BOB in the prompt it compares; a job holds no address.
  recordStart(root, 'bob', B, { log: quiet });
  handoverConfirm(root, 'session_bob2', { log: quiet });
  assert.equal(readAddress(root).bob.prompt.old_bob, B);
  assert.equal(pr({ session: 'session_bob2' }).act, 'same');
  writeState(root, sb, 'old bob prompt', (d) => writeFileSync(join(d, 'addresses/bob.json'), JSON.stringify({ session: 'session_bob2', at: OLD, prompt: { hash: '1'.repeat(64), old_bob: B } }) + '\n'));
  const b = pr({ session: 'session_bob2' });
  assert.ok(b.prompt.includes(`You replace BOB \`${B}\``));
  assert.match(out.join('\n'), /fresh BOB: send ROOT one message asking for your handover \(`handover begin`\)/);
  assert.equal(pr({ session: 'session_job1' }).act, 'none');
  // A watcher that takes over as ROOT still runs on the watcher's prompt: its first wake as ROOT delivers ROOT's.
  recordStart(root, 'watcher', W, { log: quiet });
  recordStart(root, 'root', W, { log: quiet });
  assert.equal(readAddress(root).root.prompt, undefined, 'no prompt record on a takeover');
  const t = pr({ session: W });
  assert.equal(t.role, 'root');
  assert.equal(t.act, 'changed');
  assert.ok(t.prompt.startsWith('# ROOT'));
  assert.equal(pr({ session: W }).act, 'same');
});

test('sweep: a merged job\'s branch, BLOCKED when last fetched, is not listed BLOCKED (ROOT, 4 Nov)', () => {
  // job/m was BLOCKED, then its job went on and merged: the tranche holds every commit of the
  // branch and its entry is COMPLETE. A COMPLETE entry's branch is not fetched again, so the local
  // ref still shows the BLOCKED tip; instance-setup and wizard-scripts were listed so every hour.
  const root = withOrigin({ 'process/ledger/m.json': entry('m', { status: { state: 'WORKING' } }) });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  git(['checkout', '-q', '-b', 'job/m'], { cwd: root });
  commit(root, { 'process/ledger/m.json': entry('m', { status: { state: 'BLOCKED', reason: 'waits on x' } }) });
  git(['push', '-q', 'origin', 'job/m'], { cwd: root });
  git(['fetch', '-q', 'origin', 'job/m'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  // Before it merges, the branch's BLOCKED is listed.
  assert.match(run(root).found.join('|'), /m: BLOCKED/);
  git(['merge', '-q', '--no-ff', '-m', 'Merge job PR 9', 'job/m'], { cwd: root });
  commit(root, { 'process/ledger/m.json': entry('m', { status: { state: 'COMPLETE' } }) });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const r = run(root);
  assert.doesNotMatch(r.found.join('|'), /m: BLOCKED/);
  // Its branch is still read (owedNotices reads a merged attempt's start row through it): no flag, no blocked.
  const row = status(root, { offline: true, log: quiet }).rows.find((x) => x.id === 'm');
  assert.deepEqual([row.branch, row.ahead, row.flag, row.blocked], ['BLOCKED (waits on x)', 0, undefined, undefined]);
  // A branch with work the tranche lacks still raises its flag, COMPLETE entry or not.
  git(['checkout', '-q', 'job/m'], { cwd: root });
  commit(root, { 'm.txt': 'a reopened attempt' });
  git(['push', '-q', 'origin', 'job/m'], { cwd: root });
  git(['fetch', '-q', 'origin', 'job/m'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  assert.match(run(root).found.join('|'), /m: BLOCKED/);
});

// C37 (copy, 8 Nov): inquiry landed COMPLETE on layer 12 (PR 1028, job/inquiry-2), and ROOT's sweep
// still listed it BLOCKED from job/inquiry, PR 617's R31 block of 6 Nov, closed unmerged. A module
// COMPLETE on the tranche with no open PR has no job ref fetched, and a layer land never puts the
// branch in the tranche: a job branch whose tip is older than the module's newest land is stale.
test('sweep: a job branch BLOCKED before the module\'s later layer land is stale, not listed BLOCKED (C37)', () => {
  const root = withOrigin({ 'process/ledger/m.json': entry('m', { status: { state: 'COMPLETE' } }) });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  git(['checkout', '-q', '-b', 'job/m'], { cwd: root });
  commit(root, { 'process/ledger/m.json': entry('m', { status: { state: 'BLOCKED', reason: 'R31 waits on an element' } }), 'm.txt': 'an attempt closed unmerged' });
  git(['push', '-q', 'origin', 'job/m'], { cwd: root });
  git(['fetch', '-q', 'origin', 'job/m'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  // No land yet: the branch's BLOCKED is listed, as before.
  assert.match(run(root).found.join('|'), /m: BLOCKED/);
  // A later attempt lands m on layer 12 (its row on the state branch, newer than job/m's tip).
  const later = new Date(Date.now() + 120e3).toISOString().replace(/\.\d+Z$/, 'Z');
  writeState(root, 'process-state', 'land m', (d) => { mkdirSync(join(d, 'layerflow/12/land'), { recursive: true }); writeFileSync(join(d, 'layerflow/12/land/m-1028-abc.json'), JSON.stringify({ row: 'land', layer: 12, module: 'm', pr: 1028, branch: 'job/m-2', at: later }) + '\n'); });
  const r = run(root);
  assert.doesNotMatch(r.out, /m: BLOCKED/);
  const row = status(root, { offline: true, log: quiet }).rows.find((x) => x.id === 'm');
  assert.deepEqual([row.flag, row.blocked, row.stale?.pr, row.pr], [undefined, undefined, 1028, 'unknown (GitHub not read)'], 'offline: its PR is unknown, a newer one may be open');
  assert.match(row.branch, /^stale: BLOCKED on job\/m as this clone has it, older than m's land \(PR 1028 on layer 12 at /);
  // A branch with work after the land is its own attempt again: listed.
  writeState(root, 'process-state', 'land m earlier', (d) => { writeFileSync(join(d, 'layerflow/12/land/m-1028-abc.json'), JSON.stringify({ row: 'land', layer: 12, module: 'm', pr: 1028, branch: 'job/m-2', at: '2026-01-01T00:00:00Z' }) + '\n'); writeFileSync(join(d, 'layerflow/12/land/m-grammar-1029-def.json'), JSON.stringify({ row: 'land', layer: 12, module: 'm-grammar', pr: 1029, at: later }) + '\n'); });
  assert.match(run(root).found.join('|'), /m: BLOCKED/, 'a land before the branch tip, or another module\'s, is not m\'s supersession');
  // A land recorded late (its row's `at` after the branch tip) whose merge commit is older than the
  // tip: the merge's time decides (cold review of C37: a new attempt is not hidden by a late record).
  const old = git(['rev-parse', 'tranche~0'], { cwd: root });
  git(['checkout', '-q', 'job/m'], { cwd: root });
  commit(root, { 'm2.txt': 'a new attempt after the merge' });
  git(['push', '-q', 'origin', 'job/m'], { cwd: root });
  git(['fetch', '-q', 'origin', '+refs/heads/job/m:refs/remotes/origin/job/m'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  writeState(root, 'process-state', 'land m late', (d) => { writeFileSync(join(d, 'layerflow/12/land/m-1028-abc.json'), JSON.stringify({ row: 'land', layer: 12, module: 'm', pr: 1028, merge: old, at: later }) + '\n'); });
  assert.match(run(root).found.join('|'), /m: BLOCKED/, 'the merge commit is older than the branch tip');
});

// C37, the root (coordinator, 8 Nov): read the newest attempt's branch. inquiry's attempt 6 ran on
// job/inquiry-2 and completed after attempt 5's block on job/inquiry; a clone that never fetched
// job/inquiry-2 (no job ref is fetched for a module COMPLETE on the tranche with no open PR) read
// job/inquiry's block. A job/<id>-<n> on origin is the newest attempt's, fetched or not.
test('status: a module\'s -2 branch that completed after the first branch\'s block is read, fetched or not (C37)', () => {
  const root = withOrigin({ 'process/ledger/m.json': entry('m', { status: { state: 'COMPLETE' } }) });
  git(['checkout', '-q', '-b', 'job/m'], { cwd: root });
  commit(root, { 'process/ledger/m.json': entry('m', { status: { state: 'BLOCKED', reason: 'R31 waits on an element' } }), 'process/metrics/m.jsonl': JSON.stringify({ row: 'attempt', event: 'start', module: 'm', attempt: 5, branch: 'job/m' }) + '\n' });
  git(['push', '-q', 'origin', 'job/m'], { cwd: root });
  git(['fetch', '-q', 'origin', '+refs/heads/job/m:refs/remotes/origin/job/m'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  // Attempt 6, from another clone, on job/m-2: its start row names it, and it completes.
  const other = mkdtempSync(join(tmpdir(), 'p3-c37-'));
  git(['clone', '-q', git(['remote', 'get-url', 'origin'], { cwd: root }), other]);
  git(['config', 'user.email', 't@example.com'], { cwd: other });
  git(['config', 'user.name', 't'], { cwd: other });
  git(['checkout', '-q', '-b', 'job/m-2', 'origin/tranche'], { cwd: other });
  commit(other, { 'process/metrics/m.jsonl': JSON.stringify({ row: 'attempt', event: 'start', module: 'm', attempt: 6, branch: 'job/m-2' }) + '\n', 'process/ledger/m.json': entry('m', { status: { state: 'COMPLETE' } }), 'm.txt': 'attempt 6' });
  git(['push', '-q', 'origin', 'job/m-2'], { cwd: other });
  const io = { openPRs: () => [], checkRun: () => null, compare: () => null };
  const row = status(root, { log: quiet, io }).rows.find((x) => x.id === 'm');
  assert.equal(row.ref, 'job/m-2', 'the newest attempt\'s branch');
  assert.notEqual(row.flag, 'BLOCKED');
  assert.equal(row.blocked, undefined);
});

// Coordinator, 5 Nov: starvation and ruling waits measured in the sweep row, and a technical ruling
// owed past targets.decision_minutes reaches the coordinator from ROOT.
test('sweep: the row records startable and blocked work; a ruling owed past decision_minutes goes to the coordinator', () => {
  const at = new Date(Date.now() - 45 * 6e4).toISOString();
  const root = withOrigin({
    'process/config.json': { tranche: 'tranche', coordinator: 'session_coord' },
    'process/ledger/m1.json': entry('m1', { status: { state: 'BLOCKED', reason: 'the fixture server will not start', at } }),
  });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  const r = run(root, { live: 2 });
  const row = readState(root, 'process-state', SWEEP_ROWS_FILE).trim().split('\n').map((l) => JSON.parse(l)).at(-1);
  assert.equal(row.blocked, 1);
  assert.ok(row.blocked_oldest_min >= 45 && row.blocked_oldest_min < 50);
  assert.equal(typeof row.startable, 'number');
  assert.ok(r.todo.some((x) => /^ruling owed: send_message to the coordinator \(session_coord\): job m1; blocked 4\d min; ruling owed by the coordinator \(session_coord\): the fixture server will not start$/.test(x)));
  assert.match(r.found.join('|'), /m1: BLOCKED; blocked 4\d min; ruling owed by the coordinator/);
  // A bad targets.decision_minutes is a finding; the sweep still writes its heartbeat.
  const bad = withOrigin({ 'process/config.json': { tranche: 'tranche', targets: { decision_minutes: 0 } }, 'process/ledger/m1.json': entry('m1', { status: { state: 'BLOCKED', reason: 'x', at } }) });
  recordStart(bad, 'root', R, { log: quiet });
  recordStart(bad, 'bob', B, { log: quiet });
  assert.match(run(bad).found.join('|'), /config: targets\.decision_minutes/);
  assert.ok(readState(bad, 'process-state', HEARTBEAT_FILE));
});

// Coordinator, 5 Nov: op-declarations, BLOCKED and held to 11:27 on the coordinator's ruling, was
// relayed as a ruling owed at every sweep. A live hold on its module is the ruling's record.
test('sweep and status: a BLOCKED job under a live module hold is shown held, with the hold\'s reason and expiry, and owes no ruling', async () => {
  const { hold } = await import('../lib/hold.mjs');
  const { blockedJobs } = await import('../lib/status.mjs');
  const at = new Date(Date.now() - 60 * 6e4).toISOString();
  const root = withOrigin({ 'process/ledger/m1.json': entry('m1', { status: { state: 'BLOCKED', reason: 'the worker binding is missing', at } }) });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  const owedFirst = run(root);
  assert.ok(owedFirst.todo.some((x) => /^ruling owed: send_message to the coordinator: job m1; blocked 60 min/.test(x)), owedFirst.todo.join('\n'));
  const h = hold(root, 'module:m1', { why: 'the coordinator ruled: wait for the binding PR', by: 'session_coord1', until: '90m', log: quiet });
  const r = run(root);
  assert.ok(!r.todo.some((x) => /ruling owed/.test(x)), r.todo.join('\n'));
  assert.ok(r.found.some((x) => x === `m1: BLOCKED; blocked 60 min; held (${h.id} module:m1, by session_coord1) to ${h.until}: the coordinator ruled: wait for the binding PR`), r.found.join('\n'));
  // Status's blocked group shows it held; an expired or ended hold holds nothing.
  const out = [];
  status(root, { role: 'bob', offline: true, log: (m) => out.push(m) });
  assert.match(out.join('\n'), new RegExp(`blocked:\\n- m1: [^\\n]*; blocked 60 min; held \\(${h.id} module:m1`));
  const rows = [{ id: 'm1', tranche: 'BLOCKED', blocked: 'x', pr: '#9 draft', since: at }];
  assert.equal(blockedJobs({}, rows, Date.now(), [{ ...h, kind: 'module', value: 'm1', live: false }])[0].by, 'the coordinator');
});

test('sweep: a live layer hold on a BLOCKED job\'s layer holds it as a module hold does', async () => {
  const { hold } = await import('../lib/hold.mjs');
  const at = new Date(Date.now() - 60 * 6e4).toISOString();
  const root = withOrigin({ 'build/layers.md': '| layer | modules |\n|---|---|\n| 2 | m1 |\n', 'process/ledger/m1.json': entry('m1', { layer: 2, status: { state: 'BLOCKED', reason: 'the worker binding is missing', at } }) });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  const h = hold(root, 'layer:2', { why: 'layer 2 waits for the binding', by: 'session_coord1', until: '90m', log: quiet });
  const r = run(root);
  assert.ok(!r.todo.some((x) => /ruling owed/.test(x)), r.todo.join('\n'));
  assert.ok(r.found.some((x) => x.startsWith(`m1: BLOCKED; blocked 60 min; held (${h.id} layer:2, by session_coord1)`)), r.found.join('\n'));
});

// Bob, 7 Nov: the round-close run is tool-started; owed and not run (the act that closed the round
// could not run it), the sweep wakes BOB for it, first.
const opened = (root) => { openPassed(root); git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root }); };
test('sweep: a round-close run owed and not run wakes BOB for it; none owed while the round is open', () => {
  const D = { slug_prefix: 'p3dev-', dry_run: ['true'], deploy: ['true'], walk: ['true'], guard_line: 'ok' };
  const root = withOrigin({ 'process/config.json': { tranche: 'tranche', deploy: D, plan: 'close' } });
  opened(root);
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B, { log: quiet });
  const s = run(root);
  assert.match(s.todo.join('\n'), /wake BOB with one message: .*send bob "Sweep: the round-close run is owed \(the last round \(plan close\) closed, not yet deployed\): node \S+ deploy dev, from a clean checkout of the tranche tip, first/);
  const open = withOrigin({ 'process/config.json': { tranche: 'tranche', deploy: D }, 'build/layers.md': '| layer | what | modules |\n|---|---|---|\n| 1 | first | m |\n', 'build/requirements/m.md': '- **R1** *(not yet met: x)* y\n' });
  opened(open);
  recordStart(open, 'root', R, { log: quiet });
  recordStart(open, 'bob', B, { log: quiet });
  assert.doesNotMatch(run(open).todo.join('\n'), /round-close run/);
});
