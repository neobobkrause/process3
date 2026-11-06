// One session per lane (Bob, 5 Nov 17:33): the lane's seat on the state branch, held by lane
// start, checked by job start, job start --ready and the starter (readySelection), and a defect
// line in status and the sweep when a lane has more than one live session.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { jobStart, startText } from '../lib/job.mjs';
import { LANE_SESSIONS_FILE, laneArtifact, laneAsk, laneEnd, laneOfModule, laneSeatFor, laneStart, markLaneHeld, readArtifacts, readSeats, seatsOf } from '../lib/lane.mjs';
import { readySelection, startable } from '../lib/ready.mjs';
import { laneDefects, sessionActs } from '../lib/status.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const S1 = 'session_lane1';
const S2 = 'session_lane2';

function withOrigin(files) {
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  return { root, bare };
}
const rowsOn = (bare) => git(['show', `process-state:${LANE_SESSIONS_FILE}`], { cwd: bare }).split('\n').filter(Boolean).map((l) => JSON.parse(l));

test('lane start holds one seat per lane: refused while one is live or pending, --record names it, --replace refreshes it, lane end frees it', () => {
  const { root, bare } = withOrigin({ 'process/config.json': { lanes: [{ name: 'ux', dir: 'design/ux' }] }, 'design/ux/README.md': 'x\n' });
  const out = [];
  const r = laneStart(root, 'ux', { slug: 'o/p', log: (m) => out.push(m) });
  assert.equal(r.call.title, 'lane ux');
  assert.equal(r.call.source_revision, 'tranche');
  assert.match(r.prompt, /You are the ux lane's one session in o\/p/);
  assert.match(r.prompt, /Design lanes, run under BOB, own their lane folders\. Within the product's principles you decide design and wording there \(Bob's CLAUDE\.md, 5 Nov\); a pull request that changes only files in your own lane's folder lands through the merge tool without a test suite run/);
  assert.match(r.prompt, /claude\.ai artifacts and documents, never repository files/);
  assert.match(r.prompt, /- none recorded yet/);
  assert.match(r.prompt, /`design\/ux\/` holds only what the product's build reads.*One changing only `design\/ux\/` takes the gate's records-only path/);
  assert.ok(Buffer.byteLength(r.prompt) <= 4096);
  assert.match(out.join('\n'), /then: .* lane start ux --record <the new session id>/);
  // The seat is written before the create_session call is printed: a second start is refused at once.
  assert.deepEqual(rowsOn(bare).map((x) => x.row), ['start']);
  assert.throws(() => laneStart(root, 'ux', { slug: 'o/p', log: quiet }), /lane ux's session pending since .* is live .*one session per lane at a time; .*--replace pending/);
  laneStart(root, 'ux', { record: S1, log: quiet });
  assert.equal(readSeats(root, loadConfig(root)).get('ux').session, S1);
  assert.throws(() => laneStart(root, 'ux', { record: S2, log: quiet }), /lane ux is session_lane1 .*one session per lane; nothing recorded/);
  assert.throws(() => laneStart(root, 'ux', { slug: 'o/p', log: quiet }), /session_lane1 is live/);
  assert.throws(() => laneStart(root, 'ux', { replace: S2, slug: 'o/p', log: quiet }), /--replace names lane ux's live session, session_lane1; not "session_lane2"/);
  // The refresh: the successor's seat replaces the old one, which BOB archives once it is idle.
  const rep = [];
  const r2 = laneStart(root, 'ux', { replace: S1, slug: 'o/p', log: (m) => rep.push(m) });
  assert.equal(r2.replaces, S1);
  assert.match(r2.prompt, /You replace `session_lane1`/);
  assert.match(rep.join('\n'), /archive_session session_lane1/);
  laneStart(root, 'ux', { record: S2, log: quiet });
  assert.equal(readSeats(root, loadConfig(root)).get('ux').session, S2);
  assert.throws(() => laneEnd(root, 'ux', { session: S1, why: 'done', log: quiet }), /--session names lane ux's live session, session_lane2/);
  assert.throws(() => laneEnd(root, 'ux', { session: S2, log: quiet }), /--why/);
  laneEnd(root, 'ux', { session: S2, why: 'backlog done', log: quiet });
  assert.equal(readSeats(root, loadConfig(root)).get('ux'), undefined);
  assert.throws(() => laneEnd(root, 'ux', { session: S2, why: 'again', log: quiet }), /no live session/);
  assert.equal(laneStart(root, 'ux', { slug: 'o/p', log: quiet }).replaces, null);
});

test('seatsOf: an end frees only the seat it names; a record fills only a pending seat', () => {
  const s = seatsOf([
    { row: 'start', lane: 'ux', at: 't1' }, { row: 'record', lane: 'ux', session: S1 }, { row: 'record', lane: 'ux', session: S2 },
    { row: 'start', lane: 'ai', at: 't2' }, { row: 'end', lane: 'ai', session: S1 },
  ]);
  assert.equal(s.get('ux').session, S1);
  assert.equal(s.get('ai').session, null);
  assert.equal(seatsOf([{ row: 'start', lane: 'ai', at: 't' }, { row: 'end', lane: 'ai', session: null }]).size, 0);
});

test('a lane with a module: the lane\'s session and the module\'s job are one seat; job start refuses beside the seat, lane start beside the job', () => {
  const { root } = withOrigin({ 'process/config.json': { lanes: [{ name: 'ux', dir: 'design/ux', module: 'alpha' }] }, 'process/ledger/alpha.json': entry('alpha'), 'req/alpha.md': '# alpha\n', 'design/ux/a.md': 'a\n' });
  assert.equal(laneOfModule(loadConfig(root), 'alpha').name, 'ux');
  assert.equal(laneOfModule(loadConfig(root), 'beta'), null);
  assert.equal(laneOfModule({ lanes: [{ dir: 'x' }] }, 'alpha'), null);
  // The module's job at work: it is the lane's one session, so lane start refuses.
  assert.throws(() => laneStart(root, 'ux', { slug: 'o/p', log: quiet, jobOpen: () => ({ branch: 'job/alpha', state: 'WORKING' }) }), /job alpha, lane ux's module, is WORKING on job\/alpha: it is the lane's one session now.*nothing was started/);
  const r = laneStart(root, 'ux', { slug: 'o/p', log: quiet, jobOpen: () => false });
  assert.match(r.prompt, /The marks of `alpha`, this lane's module, are your work; no job of it starts while you are live/);
  laneStart(root, 'ux', { record: S1, log: quiet });
  assert.match(laneSeatFor(root, loadConfig(root), 'alpha', { fetch: false }).why, /job alpha is lane ux's module, and lane ux's session session_lane1 is live/);
  assert.equal(laneSeatFor(root, loadConfig(root), 'beta', { fetch: false }), null);
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 'session_bob', push: false, log: quiet }), /job alpha is lane ux's module.*one session per lane.*nothing was started/);
  // A restart replaces the job's own session: one session still, so it is not refused here.
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 'session_bob', restart: 'gone', push: false, log: quiet }), (e) => !/lane ux/.test(e.message));
  laneEnd(root, 'ux', { session: S1, why: 'backlog done', log: quiet });
  assert.equal(laneSeatFor(root, loadConfig(root), 'alpha', { fetch: false }), null);
});

test('lane artifact records a lane\'s design documents\' links for its successor: the START and the ask brief list them', () => {
  const { root } = withOrigin({ 'process/config.json': { lanes: [{ name: 'ux', dir: 'design/ux' }] }, 'design/ux/README.md': 'x\n' });
  assert.throws(() => laneArtifact(root, 'ux', 'not a link', { log: quiet }), /the document's https link/);
  laneArtifact(root, 'ux', 'https://claude.ai/artifact/AAA', { title: 'Design doc', log: quiet });
  laneArtifact(root, 'ux', 'https://claude.ai/artifact/BBB', { log: quiet });
  laneArtifact(root, 'ux', 'https://claude.ai/artifact/BBB', { drop: true, log: quiet });
  assert.throws(() => laneArtifact(root, 'ux', 'https://claude.ai/artifact/CCC', { drop: true, log: quiet }), /records no/);
  assert.deepEqual(readArtifacts(root, loadConfig(root), 'ux').map((a) => [a.title, a.url]), [['Design doc', 'https://claude.ai/artifact/AAA']]);
  assert.match(laneStart(root, 'ux', { slug: 'o/p', log: quiet }).prompt, /- Design doc: https:\/\/claude\.ai\/artifact\/AAA/);
  laneEnd(root, 'ux', { session: 'pending', why: 'test', log: quiet });
  assert.match(laneAsk(root, 'ux', 'which?', { log: quiet }).brief, /The lane's design documents .*\n- Design doc: https:\/\/claude\.ai\/artifact\/AAA/);
});

test('job start --ready and the starter skip a lane\'s module while its lane\'s seat is held (readySelection)', () => {
  const cfg = { lanes: [{ name: 'ux', dir: 'd', module: 'ux-design' }, { name: 'ai', dir: 'e' }] };
  const next = [{ file: 'req/ux-design.md', module: 'ux-design', entry_state: 'COMPLETE', marks: ['R1'] }, { file: 'req/plane.md', module: 'plane', entry_state: 'OPEN' }];
  assert.deepEqual(startable(structuredClone(next)).go.map((x) => x.id), ['ux-design', 'plane']);
  const held = markLaneHeld(cfg, new Map([['ux', { lane: 'ux', at: 't', session: S1 }]]), structuredClone(next));
  const sel = readySelection(held, {});
  assert.deepEqual(sel.go.map((x) => x.id), ['plane']);
  assert.match(sel.skip.find((x) => x.id === 'ux-design').why, /lane ux's session session_lane1 is live: its work is the lane's, one session per lane/);
  // A seat on another lane holds nothing here.
  assert.equal(readySelection(markLaneHeld(cfg, new Map([['ai', { lane: 'ai', at: 't', session: S2 }]]), structuredClone(next)), {}).go.length, 2);
});

test('status and the sweep: a lane with more than one live session is a defect line', () => {
  const cfg = { lanes: [{ name: 'ux', dir: 'd', module: 'ux-design' }, { name: 'ai', dir: 'e' }] };
  const seat = (session) => new Map([['ai', { lane: 'ai', at: 't', session }]]);
  const listed = (xs) => xs.map(([id, title, st = 'idle']) => ({ id, title, session_status: st }));
  assert.deepEqual(laneDefects(cfg, seat(S1), { listed: listed([[S1, 'lane ai']]) }), []);
  assert.deepEqual(laneDefects(cfg, seat(null), { listed: listed([[S1, 'lane ai']]) }), []);
  assert.deepEqual(laneDefects(cfg, seat(S2), { listed: listed([[S1, 'lane ai', 'archived']]) }), []);
  assert.match(laneDefects(cfg, seat(S2), { listed: listed([[S1, 'lane ai']]) })[0], /^defect: lane ai has 2 live sessions \(session_lane2, session_lane1\): one session per lane at a time; end or archive all but one \(lane end ai frees the lane's seat\)$/);
  // The lane's module job open beside a hand-started lane session (copy, 5 Nov 17:16).
  const rows = [{ id: 'ux-design', tranche: 'COMPLETE', branch: 'WORKING (job/ux-design)', pr: '#515' }];
  const d = laneDefects(cfg, new Map([['ux', { lane: 'ux', at: 't', session: S1 }]]), { rows });
  assert.match(d[0], /lane ux has 2 live sessions \(session_lane1, job ux-design\).*lane end ux frees the lane's seat; job ux-design ends as it completes/);
  assert.deepEqual(laneDefects(cfg, new Map(), { rows, listed: listed([['session_j', 'job ux-design']]) }), []);
  // After a restart the module's latest job session is the lane's; the older one is the sweep's leftover.
  assert.deepEqual(laneDefects(cfg, new Map(), { rows, listed: listed([['session_j', 'job ux-design'], ['session_k', 'job ux-design (restart)']]) }), []);
  assert.match(laneDefects(cfg, new Map(), { rows, listed: listed([['session_j', 'job ux-design'], [S1, 'lane ux']]) })[0], /lane ux has 2 live sessions \(session_lane1, session_j\)/);
  // A deferred job (BLOCKED with a reason, its pull request closed) holds no session.
  assert.deepEqual(laneDefects(cfg, new Map([['ux', { lane: 'ux', at: 't', session: S1 }]]), { rows: [{ id: 'ux-design', tranche: 'BLOCKED', blocked: 'r', branch: 'BLOCKED (job/ux-design)', pr: 'closed' }] }), []);
  assert.deepEqual(laneDefects({ lanes: [{ dir: 'x' }] }, new Map(), {}), []);
  assert.deepEqual(laneDefects(cfg, new Map(), { rows: [{ id: 'ux-design', tranche: 'COMPLETE', pr: 'merged' }] }), []);
});

test('a lane session is its own kind in the session list, kept while it holds the seat, a leftover once ended or replaced', () => {
  const old = '2026-11-01T00:00:00Z';
  const s = sessionActs([{ id: S1, title: 'lane ux', session_status: 'idle', updated_at: old }, { id: S2, title: 'other thing', session_status: 'idle', updated_at: old, parent_session_id: 'session_gone' }, { id: 'session_gone', title: 'x', session_status: 'archived' }]);
  assert.equal(s.kinds.lanes, 1);
  assert.deepEqual(s.acts.map((a) => a.id), [S2]);
  // With the seats read: the seat's session is kept; one the seat no longer names is a leftover.
  const list = [{ id: S1, title: 'lane ux', session_status: 'idle', updated_at: old }];
  assert.deepEqual(sessionActs(list, { seats: new Map([['ux', { session: S1 }]]) }).acts, []);
  assert.deepEqual(sessionActs(list, { seats: new Map([['ux', { session: null }]]) }).acts, []);
  assert.deepEqual(sessionActs(list, { seats: new Map([['ux', { session: S2 }]]) }).acts.map((a) => [a.act, a.id]), [['archive', S1]]);
  assert.deepEqual(sessionActs(list, { seats: new Map() }).acts.map((a) => a.id), [S1]);
  assert.match(s.line, /jobs 0, lanes 1, builds 0/);
  assert.doesNotMatch(sessionActs([]).line, /lanes/);
});

test('lane ask while the lane\'s session is live: the question goes to that session, not to a worker', () => {
  const { root } = withOrigin({ 'process/config.json': { lanes: [{ name: 'ux', dir: 'design/ux' }] }, 'design/ux/README.md': 'x\n' });
  const a = [];
  laneAsk(root, 'ux', 'which words?', { log: (m) => a.push(m) });
  assert.match(a.join('\n'), /start one read-only worker/);
  laneStart(root, 'ux', { slug: 'o/p', log: quiet });
  laneStart(root, 'ux', { record: S1, log: quiet });
  const b = [];
  laneAsk(root, 'ux', 'which words?', { log: (m) => b.push(m) });
  assert.match(b.join('\n'), /lane ux has its one session live, so it decides: send_message to the lane's session session_lane1/);
  assert.doesNotMatch(b.join('\n'), /read-only worker \(a subagent/);
});

test('a lane module\'s START says the job is the lane\'s one session', () => {
  const base = { entry: entry('ux-design'), slug: 'o/p', branch: 'job/ux-design', tranche: 'tranche', coordinator: 'session_bob', bob: true, attempt: 1, reading: { files: [], bytes: 0 } };
  assert.doesNotMatch(startText(base), /lane's one session/);
  assert.match(startText({ ...base, lane: { name: 'ux', dir: 'd', artifacts: [{ url: 'https://claude.ai/artifact/AAA', title: 'Doc' }] } }), /The lane's design documents \(claude\.ai; read what your work needs\): Doc https:\/\/claude\.ai\/artifact\/AAA\./);
  assert.match(startText({ ...base, lane: { name: 'ux', dir: 'docs/development/ux-substrate' } }), /You are also the ux lane's one session \(Bob, 5 Nov\): within the product's principles you decide design and wording in `docs\/development\/ux-substrate\/`/);
});

test('lane config: a folder the gate would not count is refused; a paused plan starts no lane session; lane start takes no job start option', async () => {
  const { lanes } = await import('../lib/lane.mjs');
  for (const dir of ['.', 'process/ux', '../x', '.github/x']) assert.throws(() => lanes({ lanes: [{ name: 'ux', dir }] }), /cannot be a lane folder/, dir);
  assert.deepEqual(lanes({ lanes: [{ name: 'ux', dir: './design/ux/' }] }), [{ name: 'ux', dir: 'design/ux', module: null, kind: 'design', repo: 'product' }]);
  const { root } = withOrigin({ 'process/config.json': { plan: 'pause', lanes: [{ name: 'ux', dir: 'design/ux' }] }, 'design/ux/README.md': 'x\n' });
  assert.throws(() => laneStart(root, 'ux', { slug: 'o/p', log: quiet }), /plan pause: take no new step; no lane session was started/);
  const { main } = await import('../p3.mjs');
  const err = [];
  const was = console.error;
  console.error = (m) => err.push(String(m));
  const cwd = process.cwd();
  process.chdir(root);
  let code;
  try { code = await main(['lane', 'start', 'ux', '--restart', 'stuck']); } finally { console.error = was; process.chdir(cwd); }
  assert.equal(code, 1);
  assert.match(err.join('\n'), /lane start takes no --restart: those are job start's/);
});
