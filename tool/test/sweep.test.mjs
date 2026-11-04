import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commit, entry, makeRepo } from './helpers.mjs';
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
  assert.deepEqual(beat(root).found, ['jobs 3 of 20']);
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
  assert.deepEqual([r.act, r.found], ['heartbeat', ['jobs 30 of 20', 'plan pause', '30 job sessions, over the job cap of 20: archive finished ones before starting more']]);
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
  assert.match(s.todo[0], /send bob "Sweep: BOB session_bob1 idle 0h with next work: run node \.process\/tool\/p3\.mjs job start --ready --live <n>\."/);
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
test('sweep: a layer ready to close is BOB\'s act; a bad open_by is a finding and the heartbeat is still written', () => {
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
  assert.match(s.found.join('; '), /layer 1 ready to close/);
  assert.equal(s.todo.length, 1);
  assert.match(s.todo[0], /send bob "Sweep: BOB session_bob1 idle 0h with next work: run node \.process\/tool\/p3\.mjs job start --ready --live <n>\."/);

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
