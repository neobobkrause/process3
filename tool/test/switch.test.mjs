// Account switch (notes/account-switch-review.md, 5 Nov): switch out's manifest on the state
// branch, switch in's preflight and its restart in order, switch quiet, and the train's lease release.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commit, entry, makeRepo } from './helpers.mjs';
import { recordStart } from '../lib/roles.mjs';
import { approvalsHash } from '../lib/start.mjs';
import { fetchState, readState, writeState } from '../lib/state.mjs';
import { MANIFEST_FILE, readTasks, switchIn, switchOut, switchQuiet } from '../lib/switch.mjs';
import { LEASE_FILE, MERGER_FILE, releaseSessionLease, takeLease } from '../lib/train.mjs';
import { git, loadConfig } from '../lib/util.mjs';

const quiet = () => {};
const COORD = 'session_coordold';
const NEW = 'session_coordnew';
const ID = { root: 'session_rootold', bob: 'session_bobold', merger: 'session_mergerold', watcher: 'session_watcherold' };
const APPROVALS = '# CLAUDE\n\n## Standing approvals from Bob\n\nSessions may push.\n';

function product() {
  const root = makeRepo({
    'CLAUDE.md': APPROVALS,
    'process/config.json': { tranche: 'tranche', coordinator: COORD, release_path: ['delta'] },
    'process/ledger/alpha.json': entry('alpha'),
    'process/ledger/beta.json': entry('beta'),
    'process/ledger/delta.json': entry('delta'),
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  for (const [r, id] of Object.entries(ID)) recordStart(root, r, id, { log: quiet });
  // Two messages: one delivered (answered), one sent to BOB and never delivered.
  writeState(root, 'process-state', 'messages', (wt) => {
    mkdirSync(join(wt, 'messages'), { recursive: true });
    writeFileSync(join(wt, 'messages', 'root.jsonl'), [
      { at: '2026-11-05T05:40:00Z', row: 'sent', n: 1, to: 'bob', text: 'run status' },
      { at: '2026-11-05T05:40:05Z', row: 'outcome', n: 1, outcome: 'delivered' },
      { at: '2026-11-05T05:43:00Z', row: 'sent', n: 2, to: 'bob', text: 'notice triage 413 first' },
    ].map((r) => JSON.stringify(r) + '\n').join(''));
  });
  return root;
}

const files = (root, { tasks, sessions }) => {
  const dir = mkdtempSync(join(tmpdir(), 'p3-switch-'));
  const t = join(dir, 'tasks.json');
  const s = join(dir, 'sessions.json');
  writeFileSync(t, JSON.stringify(tasks));
  writeFileSync(s, JSON.stringify(sessions));
  return { t, s };
};

const TASKS = { triggers: [
  { id: 'trig_sweep', name: 'sweep', cron_expression: '14 * * * *', enabled: true, persistent_session_id: ID.root, prompt: `Sweep. sweep --session ${ID.root}` },
  { id: 'trig_flow', name: 'hourly flow', cron_expression: '0 * * * *', enabled: true, persistent_session_id: COORD, prompt: `Flow: message BOB ${ID.bob}` },
  { id: 'trig_report', name: 'train report', run_once_at: '2099-11-06T04:50:00Z', enabled: true, persistent_session_id: 'session_someoneelse', prompt: 'merge train report' },
  { id: 'trig_off', name: 'old probe', cron_expression: '0 0 31 12 *', enabled: false, persistent_session_id: COORD, prompt: 'Reply OK' },
] };
const SESSIONS = { data: [
  { id: 'session_jobalpha', title: 'job alpha', session_status: 'running', updated_at: '2026-11-05T05:40:00Z' },
  { id: 'session_jobalpha0', title: 'job alpha', session_status: 'idle', updated_at: '2026-11-05T01:00:00Z' },
  { id: 'session_jobdelta', title: 'job delta', session_status: 'running', updated_at: '2026-11-05T05:41:00Z' },
  { id: 'session_jobbeta', title: 'job beta', session_status: 'archived', updated_at: '2026-11-05T05:00:00Z' },
  { id: 'session_jobgamma', title: 'job gamma (restart)', session_status: 'idle', updated_at: '2026-11-05T05:00:00Z' },
  { id: ID.bob, title: 'BOB', session_status: 'running' },
] };
const ROWS = [
  { id: 'alpha', tranche: 'OPEN', branch: 'WORKING', pr: '#445 draft' },
  { id: 'beta', tranche: 'OPEN', branch: 'WORKING', pr: '#444 draft' },
  { id: 'delta', tranche: 'OPEN', branch: 'BLOCKED (a question)', pr: '#290 ready' },
];
const read = () => ({ rows: ROWS });
const account = (perm = { push: true, admin: false }, login = 'civicsmith') => (p) => (p === 'user' ? (login ? { login } : null) : /^repos\//.test(p) ? { permissions: perm } : null);
const okIO = { api: account(), push: () => ({ code: 0, stdout: '', stderr: '' }) };

test('switch out writes the manifest, and only it, and prints the stop acts in order', () => {
  const root = product();
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  const { t, s } = files(root, { tasks: TASKS, sessions: SESSIONS });
  const out = [];
  const before = git(['rev-parse', 'origin/process-state'], { cwd: root });
  const r = switchOut(root, { tasks: t, sessions: s, by: COORD, read, log: (l) => out.push(l) });
  // One commit on the state branch, holding the manifest alone.
  assert.equal(git(['rev-list', '--count', `${before}..origin/process-state`], { cwd: root }), '1');
  assert.equal(git(['diff', '--name-only', before, 'origin/process-state'], { cwd: root }), MANIFEST_FILE);
  assert.equal(git(['rev-parse', 'HEAD'], { cwd: root }), head);
  fetchState(root, 'process-state', { fresh: true });
  const m = JSON.parse(readState(root, 'process-state', MANIFEST_FILE));
  assert.deepEqual(m, r.manifest, 'round trip');
  assert.equal(m.by, COORD);
  assert.equal(m.approvals, approvalsHash(root, 'origin/tranche'));
  assert.deepEqual(Object.fromEntries(Object.entries(m.addresses).map(([k, v]) => [k, v.session])), ID);
  // Enabled tasks only, each with its role.
  assert.deepEqual(m.tasks.map((x) => [x.id, x.role]), [['trig_sweep', 'root'], ['trig_flow', 'coordinator'], ['trig_report', 'unknown']]);
  assert.equal(m.tasks[2].run_once_at, '2099-11-06T04:50:00Z');
  // Live jobs: unarchived, newest session per module, with status's branch, PR and state.
  assert.deepEqual(m.jobs.map((j) => [j.module, j.session, j.branch, j.pr, j.state]), [
    ['delta', 'session_jobdelta', 'job/delta', '#290 ready', 'BLOCKED (a question)'],
    ['alpha', 'session_jobalpha', 'job/alpha', '#445 draft', 'WORKING'],
    ['gamma', 'session_jobgamma', 'job/gamma', null, 'not in the ledger'],
  ]);
  assert.deepEqual(m.messages.map((x) => `${x.from}-${x.n}`), ['root-2']);
  const text = out.join('\n');
  const at = (re) => { const i = out.findIndex((l) => re.test(l)); assert.ok(i >= 0, String(re)); return i; };
  assert.ok(at(/^1\. MERGER session_mergerold.*merge train release --session session_mergerold/) < at(/^2\. Each live job.*push your work in progress/));
  assert.ok(at(/^2\./) < at(/^3\. Switch off each task with update_trigger enabled false/));
  assert.match(text, /- job alpha: session_jobalpha \(job\/alpha, PR #445 draft\)/);
  assert.match(text, /- trig_flow hourly flow \(coordinator\)/);
  assert.doesNotMatch(text, /trig_off/);
  assert.doesNotMatch(text, /—/);
});

test('switch out refuses a task list with more pages, and needs --by, --tasks and --sessions', () => {
  const root = product();
  const { t, s } = files(root, { tasks: { triggers: [], next_cursor: 'abc' }, sessions: SESSIONS });
  assert.throws(() => readTasks(t), /more pages/);
  assert.throws(() => switchOut(root, { tasks: t, sessions: s, by: 'me', read, log: quiet }), /--by <session>/);
  assert.throws(() => switchOut(root, { sessions: s, by: COORD, read, log: quiet }), /--tasks <file>/);
  assert.throws(() => switchOut(root, { tasks: t, by: COORD, read, log: quiet }), /--sessions <file>/);
});

test('switch in, preflight held: the restart\'s acts (a) to (g) in order, tasks bound to the new roles, jobs release first', () => {
  const root = product();
  const { t, s } = files(root, { tasks: TASKS, sessions: SESSIONS });
  switchOut(root, { tasks: t, sessions: s, by: COORD, read, log: quiet });
  const out = [];
  switchIn(root, { sessions: s, by: NEW, slug: 'o/p', io: okIO, log: (l) => out.push(l) });
  const text = out.join('\n');
  for (const l of ['- ok: GitHub connected, acting as civicsmith', '- ok: account: civicsmith: push true, admin false', '- ok: push reachable on origin (o/p), dry run']) assert.ok(out.includes(l), l);
  assert.match(text, /- ok: approvals at tranche's tip are those switch out recorded/);
  const steps = ['(a)', '(b)', '(c)', '(d)', '(e)', '(f)', '(g)'].map((k) => out.findIndex((l) => l.startsWith(k)));
  assert.ok(steps.every((i, k) => i >= 0 && (k === 0 || i > steps[k - 1])), `in order: ${steps}`);
  assert.match(text, /\(a\) The coordinator records its id: .*"coordinator": "session_coordnew"/);
  assert.match(text, /\(b\) .*switch quiet/);
  assert.match(text, /handover begin` \(old BOB session_bobold\)/);
  assert.match(text, /start merger --replace session_mergerold/);
  assert.match(text, /start watcher --replace session_watcherold/);
  // The coordinator's task, from this session; the old ids in its prompt named as the new role's.
  const flow = out.find((l) => l.includes('hourly flow'));
  const call = JSON.parse(flow.slice(flow.indexOf('{')));
  assert.deepEqual([call.name, call.cron_expression, call.persistent_session_id], ['hourly flow', '0 * * * *', undefined]);
  assert.equal(call.prompt, 'Flow: message BOB <the new bob id: node .process/tool/p3.mjs address bob>');
  assert.match(text, /sweep \(root\): made by ROOT from its own prompt/);
  assert.match(out.find((l) => l.includes('train report')), /"persistent_session_id":"<unknown: it was bound to session_someoneelse; the coordinator decides>"/);
  assert.match(text, /job start alpha --restart "account switch: its session session_jobalpha was on the old Claude account" --stop idle/);
  assert.match(text, /gamma: not in the ledger: nothing to restart/);
  const [d, a] = ['job start delta --restart', 'job start alpha --restart'].map((k) => out.findIndex((l) => l.includes(k)));
  assert.ok(d >= 0 && d < a, 'the release path first');
  assert.match(out[d], /\(release path\)$/);
  assert.match(text, /\(f\) BOB: `node .process\/tool\/p3.mjs job start --ready --sessions/);
  assert.match(text, /- root-2 to bob: "MSG root-2 to bob: notice triage 413 first"/);
});

test('switch in refuses on each failed preflight check, naming who fixes it, and starts nothing', () => {
  const root = product();
  const { t, s } = files(root, { tasks: TASKS, sessions: SESSIONS });
  // No manifest yet.
  assert.throws(() => switchIn(root, { sessions: s, by: NEW, slug: 'o/p', io: okIO, log: quiet }), /no switch\/manifest\.json on process-state: the old account runs switch out first/);
  switchOut(root, { tasks: t, sessions: s, by: COORD, read, log: quiet });
  const run = (io, opts = {}) => { const out = []; let err = null; try { switchIn(root, { sessions: s, by: NEW, slug: 'o/p', io, log: (l) => out.push(l), ...opts }); } catch (e) { err = e; } return { out: out.join('\n'), err }; };
  // GitHub unconnected.
  let r = run({ ...okIO, api: account(undefined, null) });
  assert.match(r.err.message, /switch in refused: 2 preflight check\(s\) failed; nothing was started/);
  assert.match(r.out, /FAILED: GitHub is not connected on this Claude account.*Fixes it: Bob: connect GitHub on this Claude account/);
  assert.doesNotMatch(r.out, /^\(a\)/m);
  // Connected as the owner and admin.
  r = run({ ...okIO, api: account({ push: true, admin: true }, 'neobobkrause') });
  assert.match(r.err.message, /1 preflight check/);
  assert.match(r.out, /FAILED: account: neobobkrause: push true, admin true \(push true, admin false needed\)\. Fixes it: Bob: .*non-admin collaborator/);
  // Push not reachable.
  r = run({ ...okIO, push: () => ({ code: 128, stdout: '', stderr: 'remote: Permission denied\nfatal: unable to access' }) });
  assert.match(r.out, /FAILED: push not reachable on origin \(o\/p\): fatal: unable to access\. Fixes it: Bob: install the Claude GitHub App on o\/p/);
  // The approvals changed on the tranche since switch out.
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'CLAUDE.md': APPROVALS + 'The new account too.\n' });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  const tip = approvalsHash(root, 'tranche');
  r = run(okIO);
  assert.match(r.out, new RegExp(`FAILED: approvals at tranche's tip \\(${tip.slice(0, 12)}\\) are not those switch out recorded.*--approvals ${tip}`));
  assert.ok(r.err);
  // On Bob's word, the tip's hash given: it goes on.
  r = run(okIO, { approvals: tip });
  assert.equal(r.err, null);
  assert.match(r.out, /- ok: approvals at tranche's tip are the hash given by --approvals/);
  assert.throws(() => switchIn(root, { sessions: s, by: NEW, slug: 'o/p', approvals: 'abc', io: okIO, log: quiet }), /64-hex/);
});

test('switch quiet exits 0 only once the tranche tip has not moved for two minutes', () => {
  const root = product();
  const ct = Number(git(['log', '-1', '--format=%ct', 'origin/tranche'], { cwd: root }));
  const out = [];
  const no = switchQuiet(root, { t: (ct + 30) * 1000, log: (l) => out.push(l) });
  assert.equal(no.ok, false);
  assert.match(out[0], /NOT QUIET, tranche \w{10} moved 30 s ago; run it again in 90 s/);
  assert.equal(switchQuiet(root, { t: (ct + 120) * 1000, log: quiet }).ok, true);
  assert.equal(switchQuiet(root, { minutes: 5, t: (ct + 200) * 1000, log: quiet }).ok, false);
  assert.throws(() => switchQuiet(root, { minutes: 'x', log: quiet }), /--minutes/);
});

test('merge train release: the session\'s own lease given back at once; another session\'s refused', () => {
  const root = product();
  const cfg = loadConfig(root);
  const lease = () => { fetchState(root, cfg.state_branch, { fresh: true }); return JSON.parse(readState(root, cfg.state_branch, LEASE_FILE)); };
  assert.deepEqual(releaseSessionLease(root, cfg, ID.merger, { log: quiet }), { released: false });
  takeLease(root, cfg, ID.merger, 'tok-killed', { take: true });
  assert.throws(() => releaseSessionLease(root, cfg, 'session_other', { log: quiet }), /lease is session_mergerold's.*nothing was changed/);
  assert.ok(Date.parse(lease().expires) > Date.now());
  assert.deepEqual(releaseSessionLease(root, cfg, ID.merger, { log: quiet }), { released: true });
  assert.ok(Date.parse(lease().expires) <= Date.now());
  assert.ok(lease().released);
  assert.match(readState(root, cfg.state_branch, MERGER_FILE), /"row":"release","session":"session_mergerold"/);
  // A new train takes it at once, not after LEASE.expire.
  assert.deepEqual(takeLease(root, cfg, 'session_mergernew', 'tok-new', { take: true }).takeover, true);
  assert.throws(() => releaseSessionLease(root, cfg, 'nope', { log: quiet }), /--session/);
});
