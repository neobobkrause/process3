// status (REC-3, minimal for Phase 1): every ledger entry with its state as the tranche and
// its job branch hold it, its pull request and gate, and the role's reading set with sizes.
import { staleLines, staleRecords } from './expire.mjs';
import { readFacts } from './ends.mjs';
import { prFiles, takeInLine, toTakeIn } from './carry.mjs';
import { layerMode } from './layerbase.mjs';
import { layerLines } from './layerflow.mjs';
import { aheadBy, checkRun, compare, comments as ghComments, gateRuns, openPRs } from './github.mjs';
import { LEDGER_DIR, jobBranch, readEntry, readLedgerTexts } from './ledger.mjs';
import { P3, READY_START, readingSet } from './job.mjs';
import { readAddress } from './roles.mjs';
import { REFRESH_AT, jobBranchAt, metricsFile, readRows, refusalCounts, rowsAt, rowsHere } from './metrics.mjs';
import { noticeLine, noticeRecords, notices, readModules } from './notice.mjs';
import { triageRows } from './triage.mjs';
import { addressFile, fetchState, handoffFile, jsonl, readState, toRoute, undelivered, withCoordinator, writeState } from './state.mjs';
import { readStuck, stuckLine } from './stuck.mjs';
import { openLine, openState } from './tranche.mjs';
import { deployOwed, roundClose, walkFindings, walkHold } from './deploy.mjs';
import { completionItems, openItems } from './completion.mjs';
import { laneSeatFor, lanes, markLaneHeld, openAsks, readSeats } from './lane.mjs';
import { census, censusLines, openLayers, preflight, preflightLines } from './census.mjs';
import { startable as starts } from './ready.mjs';
import { RESTARTS_FILE, leadInputs, openedAt } from './lead.mjs';
import { baseRedOwed } from './report.mjs';
import { heldBy, holdLines, layersAt, readAuto, readHolds, readOwed, startsOwedLine } from './hold.mjs';
import { readStarts, starterLines } from './auto.mjs';
import { FOUND_DIR, foundEntries, foundFile, noModuleFound, NO_MODULE } from './found.mjs';
import { OPEN_BY, UNMET, depth, exists, isShallow, fail, fileBytes, git, isFound, jobCap, loadConfig, overCap, repoSlug, unmetIds } from './util.mjs';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// A pull request quiet this long is idle: the sweep's "silent for two hours" (Foundations).
export const IDLE_HOURS = 2;
// A WORKING job whose branch tip is older than this is stalled (the sweep wakes BOB for it).
export const SILENT_HOURS = 2;

// status --role bob --sessions <file>: BOB's own list_sessions result, saved as JSON. Measured 3-4
// Nov: a stopped job was flagged only after two hours with nothing pushed. A job's session is
// matched by its title (\`job <id>\`, or \`job <id> (restart)\`); the latest one counts. Archived: gone.
// Idle, with no push for targets.replace_minutes: idle. No match: the two-hour rule stands.
// Only the fields list_sessions returns are read (measured 4 Nov 17:20, after a fixture of invented
// names passed while the tool counted 320 archived sessions live): id, title, session_status
// (SESSION_STATUS_ARCHIVED, _IDLE, _RUNNING, _PENDING), status_bucket, created_at, updated_at,
// parent_session_id, post_turn_summary.status_category. The list: bare, under data, or as the
// tool returns it raw, {"ccr":{"data":[...]}}.
export function readSessions(file, { root, offline = false } = {}) {
  let j;
  try { j = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { fail(`--sessions ${file}: not a readable JSON file (${e.message}); save your list_sessions result there`); }
  const list = [j, j?.data, j?.ccr?.data].find(Array.isArray);
  if (!list) fail(`--sessions ${file}: no list of sessions in it (a JSON list, or one under "data" or "ccr.data")`);
  const out = list.filter((x) => x && typeof x === 'object');
  // One page of a longer list (copy, 5 Nov 04:36: list_sessions' first page held 6 of 16 job
  // sessions, so 14 slots read empty with 4 free): every unarchived job session holds a slot,
  // every product's and a merged job's not yet archived too. Paging the whole account cost ~5 min
  // a wake (copy, 5 Nov: 1,843 sessions; 18:20, 22 pages back to 1 Aug), so a partial list, newest
  // first, stands when it reaches back as far as the record needs (sessionsBound):
  // - the record of the last read that stood (LIVE_OLDEST: its newest session and its unarchived
  //   job sessions): the page reaches back to that newest session, so every session made since is
  //   on it; each recorded live job session not on it is older than the page and is carried, still
  //   counted, never acted on (its state is that read's; a session is never unarchived, and one
  //   archived since is counted until a read reaches it, at the latest an hour on: sessionsBound);
  // - an older record (only the oldest job session live at a whole read): the page reaches past it;
  // - no record: the page reaches past the first start of every job the state branch records as
  //   possibly live (started, not merged; sessionCover).
  // A read that stands is recorded. Else it is refused, naming how far back to page.
  const partial = [j, j?.ccr].some((x) => x?.has_more === true);
  const more = `call it with limit 100, and again with after_id <last_id> while has_more, and save every page's sessions as one list; every unarchived job session holds a slot`;
  if (partial && !root) fail(`--sessions ${file}: list_sessions has more pages (has_more): ${more}`);
  if (!root) return out;
  const cfg = loadConfig(root);
  // Unread (no origin, no state branch): a whole list stands as ever; a partial one by the record's rule above.
  let was = null;
  try { if (!offline) fetchState(root, cfg.state_branch); was = JSON.parse(readState(root, cfg.state_branch, LIVE_OLDEST) || 'null'); } catch { was = null; }
  const made = out.map((x) => Date.parse(x.created_at || ''));
  const reach = made.some((t) => !Number.isFinite(t)) ? Infinity : Math.min(...made); // a session with no time: the page reaches back nowhere
  const rec = liveRecord(was);
  let carried = [];
  if (partial) {
    const to = (iso) => `call it with limit 100, and again with after_id <last_id> while has_more and the last page reaches back no further than ${iso}, and save every page's sessions as one list, newest first, with the last page's has_more`;
    // Newest first by creation is what makes a page's end a bound: a page in another order is no bound.
    if (made.some((t, i) => i > 0 && t > made[i - 1])) fail(`--sessions ${file}: list_sessions has more pages (has_more), and this page is not newest first by created_at, so how far back it reaches says nothing: ${more}`);
    if (rec) {
      if (!(reach <= Date.parse(rec.newest))) fail(`--sessions ${file}: list_sessions has more pages (has_more), and a session made since the last read that held every live job session (its newest created ${rec.newest}) could be on them: ${to(rec.newest)}`);
      // Only those older than the page: one the page reaches past and does not show is gone (never carried for ever).
      const on = new Set(out.map(sessionId));
      carried = rec.sessions.filter((x) => !on.has(x.id) && Date.parse(x.created_at || '') < reach).map((x) => ({ ...x, carried: true }));
    } else if (Number.isFinite(Date.parse(was?.oldest || ''))) {
      if (!(reach <= Date.parse(was.oldest))) fail(`--sessions ${file}: list_sessions has more pages (has_more), and a job session live at the last whole read (created ${was.oldest}) could be on them: ${to(was.oldest)}`);
    } else {
      const c = sessionCover(root, out, { offline });
      if (c.missing.length) { const first = c.missing.map((m) => m.first).sort()[0]; fail(`--sessions ${file}: list_sessions has more pages (has_more), and a recorded job session could be on them (${c.missing.map((m) => `job ${m.id}: ${m.count} session${m.count === 1 ? '' : 's'} started since ${m.first}`).slice(0, 5).join('; ')}${c.missing.length > 5 ? `; ${c.missing.length - 5} more` : ''}): ${to(first)}`); }
    }
  }
  const all = [...out, ...carried];
  // Every live job session is on this list now (or carried): recorded, with the newest session's
  // creation (a session made after the list was saved is newer: on the next read's first page).
  if (!offline && Number.isFinite(reach) && out.length) {
    const live = all.filter((x) => !isArchived(x) && isJobSession(x));
    const times = live.map((x) => Date.parse(x.created_at || ''));
    if (times.every(Number.isFinite)) {
      const newest = new Date(Math.max(...made, rec ? Date.parse(rec.newest) : -Infinity)).toISOString();
      const oldest = new Date(times.length ? Math.min(...times) : Date.parse(newest)).toISOString();
      const keep = (x) => Object.fromEntries(['id', 'title', 'session_status', 'status_bucket', 'created_at', 'updated_at', 'parent_session_id'].filter((k) => x[k] !== undefined).map((k) => [k, x[k]]));
      // seen: when a read last saw every recorded session (none carried), moved on only once half
      // stale, so a quiet account writes nothing a pass. whole: a read with every page stood since
      // the record began; a record begun from pages bounded by the recorded starts alone (no
      // record) is not, and sessionsBound asks once for every page an hour after (partial_since).
      const t = Date.now();
      const fresh = (x) => t - (Date.parse(x || '') || 0) < LIVE_DEEP_MIN * 6e4 / 2;
      const whole = !partial || !!rec?.whole || (!rec && Number.isFinite(Date.parse(was?.oldest || '')));
      const next = { oldest, newest, live: live.length, sessions: live.map(keep).sort((a, b) => String(a.id).localeCompare(String(b.id))), seen: carried.length ? (rec?.seen || null) : fresh(rec?.seen) ? rec.seen : new Date(t).toISOString(), whole, ...(whole ? {} : { partial_since: rec?.partial_since || new Date(t).toISOString() }) };
      const same = rec && JSON.stringify({ ...rec, at: undefined }) === JSON.stringify(next);
      if (!same) { try { writeState(root, cfg.state_branch, 'sessions: the live job sessions of the last read', (wt) => { mkdirSync(join(wt, dirname(LIVE_OLDEST)), { recursive: true }); writeFileSync(join(wt, LIVE_OLDEST), JSON.stringify({ ...next, at: new Date().toISOString() }) + '\n'); }); } catch { /* recorded at the next read that stands */ } }
    }
  }
  return all;
}
const isJobSession = (x) => /^job \S+( \(restart\))?$/.test(String(x.title || '').trim());
const liveRecord = (was) => (Array.isArray(was?.sessions) && Number.isFinite(Date.parse(was?.newest || '')) ? was : null);
// Carried sessions are read again (the page reaches back to the oldest) once this long has passed
// since a read last saw every one of them, so one archived since stops counting.
export const LIVE_DEEP_MIN = 60;
// How far back the next list_sessions read must page for readSessions to take it: an ISO time (page
// while has_more and the last page is newer), null (one page), or all (every page: a record begun
// with no read of every page, an hour on; another product's or a merged job's session older than
// the recorded starts is then counted within the hour). Past the record's newest session;
// and, once carried sessions have gone LIVE_DEEP_MIN unseen, past the oldest of them; with an older
// record, past its oldest live job session; with none, past the first start of every job the state
// branch records as possibly live.
export function sessionsBound(root, { offline = false, t = Date.now() } = {}) {
  const cfg = loadConfig(root);
  let was = null;
  try { if (!offline) fetchState(root, cfg.state_branch); was = JSON.parse(readState(root, cfg.state_branch, LIVE_OLDEST) || 'null'); } catch { was = null; }
  const rec = liveRecord(was);
  if (rec) {
    if (!rec.whole && !(t - (Date.parse(rec.partial_since || '') || 0) < LIVE_DEEP_MIN * 6e4)) return { until: null, all: true, why: 'no read of every page on record: one, an hour after the first bounded one' };
    const times = rec.sessions.map((x) => Date.parse(x.created_at || '')).filter(Number.isFinite);
    const stale = times.length && !(t - (Date.parse(rec.seen || '') || 0) < LIVE_DEEP_MIN * 6e4);
    const until = stale ? Math.min(Date.parse(rec.newest), ...times) : Date.parse(rec.newest);
    return { until: new Date(until).toISOString(), why: stale ? 'the oldest live job session recorded, unseen for an hour' : 'the newest session of the last read' };
  }
  if (Number.isFinite(Date.parse(was?.oldest || ''))) return { until: was.oldest, why: 'the oldest live job session of the last whole read' };
  let starts = [];
  try { starts = recordedStarts(root, { offline }); } catch { return { until: null, why: 'unread', unread: true }; }
  const first = starts.map((s) => s.first).sort()[0];
  return first ? { until: new Date(Date.parse(first)).toISOString(), why: 'the first start of the oldest open job' } : { until: null, why: 'no job session recorded live' };
}
// The creation time of the oldest job session (any product) live at the last read that held them all.
export const LIVE_OLDEST = 'metrics/live-sessions.json';
// The job sessions the record knows: for each job branch on origin (job/<id>, or a --fresh-branch
// start's job/<id>-<n>), its start rows the tranche has not merged (an open run; a merged job has
// none) and the state branch's restart rows since the first, its time and how many (each started one session). A partial
// list covers a job when its oldest session was created at or before that first start (newest
// first, so every later session is in it), or it lists that job's sessions as many times.
export const STARTS = (r) => r.row === 'attempt' && r.event === 'start';
export function recordedStarts(root, { offline = false } = {}) {
  const cfg = loadConfig(root);
  const tip = `refs/remotes/origin/${cfg.tranche}`;
  const at = git(['rev-parse', '-q', '--verify', tip], { cwd: root, allowFail: true }).code === 0 ? tip : 'HEAD';
  const ids = new Set(Object.keys(readLedgerTexts(root, at)).map((f) => f.slice(LEDGER_DIR.length + 1, -5)));
  let heads = null;
  if (!offline) {
    const ls = git(['ls-remote', '--heads', 'origin', 'refs/heads/job/*'], { cwd: root, allowFail: true });
    if (ls.code !== 0) fail('list_sessions has more pages (has_more) and origin\'s job branches could not be read to check it covers every recorded job session: save every page');
    const pairs = ls.stdout.split('\n').map((l) => l.trim().split('\t')).filter(([, r]) => r);
    heads = pairs.map(([, r]) => r.slice(11));
    const moved = pairs.filter(([sha, r]) => git(['rev-parse', '-q', '--verify', `refs/remotes/origin/${r.slice(11)}`], { cwd: root, allowFail: true }).stdout.trim() !== sha);
    if (moved.length) git(['fetch', '-q', ...depth(root), 'origin', ...moved.map(([, r]) => `+${r}:refs/remotes/origin/${r.slice(11)}`)], { cwd: root, allowFail: true });
  } else heads = git(['for-each-ref', '--format=%(refname:lstrip=3)', 'refs/remotes/origin/job/'], { cwd: root }).split('\n').filter(Boolean);
  // A --restart's session is recorded on the state branch (lead.mjs RESTARTS_FILE), not the job's branch.
  if (!offline) fetchState(root, cfg.state_branch);
  const restarts = jsonl(readState(root, cfg.state_branch, RESTARTS_FILE) || '');
  const out = [];
  for (const id of ids) {
    const jb = jobBranchAt(root, id, heads, ids);
    if (!heads.includes(jb)) continue;
    const merged = new Set(rowsAt(root, at, id).map((r) => JSON.stringify(r)));
    const run = rowsAt(root, `refs/remotes/origin/${jb}`, id).filter((r) => STARTS(r) && !merged.has(JSON.stringify(r)));
    if (!run.length) continue;
    const first = run.map((r) => r.at).sort()[0];
    const again = restarts.filter((r) => r.module === id && String(r.at) >= first);
    out.push({ id, first, count: run.length + again.length });
  }
  return out;
}
export function sessionCover(root, list, { offline = false, starts = recordedStarts(root, { offline }) } = {}) {
  const made = list.map((x) => Date.parse(x.created_at || ''));
  const oldest = made.some((t) => !Number.isFinite(t)) ? Infinity : Math.min(...made); // a session with no time: the page reaches back nowhere
  const titled = (id) => list.filter((x) => new RegExp(`^job ${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( \\(restart\\))?$`).test(String(x.title || '').trim())).length;
  const missing = starts.filter((s) => !(oldest <= Date.parse(s.first)) && titled(s.id) < s.count);
  return { starts, missing };
}
export const sessionId = (x) => x.id || '?';
const sessionTime = (x) => Date.parse(x.updated_at || '') || 0;
export function jobSession(sessions, id) {
  const title = new RegExp(`^job ${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( \\(restart\\))?$`);
  const mine = sessions.filter((x) => title.test(String(x.title || '').trim()));
  return mine.sort((a, b) => sessionTime(b) - sessionTime(a))[0] || null;
}
const lower = (v) => String(v || '').toLowerCase();
const state = (x) => lower(x.session_status).replace(/^session_status_/, '');
export const isArchived = (x) => state(x) === 'archived';
export const isIdle = (x) => state(x) === 'idle' || ['completed', 'failed', 'review_ready'].includes(lower(x.status_bucket));
// A job parked in the merge train (build train-robust, items 4 and 5; coordinator, 5 Nov): its pull
// request ready with a green gate on its head and nothing flagged, so the train merges it with no
// act of the job's. Its PR number, or null. Its idle session does no work: the cap and the idle
// alarm do not count it (parkedSessions). Next work read offline names such a module in the
// train from GitHub (sweep.mjs markInTrain).
export const inTrain = (r) => (r && r.ready && r.gate === 'success' && !r.flag && /^#\d+ ready$/.test(String(r.pr || '')) ? Number(String(r.pr).slice(1).split(' ')[0]) : null);
// The job sessions parked in the train: each such job's latest session, unarchived and idle (a
// session still running is working, whatever its pull request). [{ id, pr, session }].
export function parkedSessions(listed, rows) {
  const out = [];
  for (const r of rows || []) {
    const pr = inTrain(r);
    if (!pr || !listed) continue;
    const js = jobSession(listed, r.id);
    if (js && !js.carried && !isArchived(js) && isIdle(js)) out.push({ id: r.id, pr, session: sessionId(js) });
  }
  return out;
}
export const parkedLine = (p) => `${p.length} job session${p.length === 1 ? '' : 's'} parked in the train (ready, gate green, idle) not counted against the cap: ${p.map((x) => `${x.id} PR ${x.pr}`).join(', ')}`;
// A job's result recorded: COMPLETE (on the tranche, or on its branch, its pull request ready),
// no attempt reopened and nothing flagged. Its idle sessions can go (job start --ready, sweep).
// A status row's job branch: its ref when a --fresh-branch start moved it, else job/<id>.
export const refOf = (r) => r.ref || `job/${r.id}`;
const jobHeads = (h) => [...(h || [])].filter((x) => x.startsWith('refs/heads/job/')).map((x) => x.slice(11));
// A job open: its entry not COMPLETE, or a pull request open (a reopened COMPLETE module; copy, 5
// Nov: question-explorer, PR 346, was listed startable); an entry never started is none.
const jobOpen = (r) => !!r && !r.unstarted && (r.tranche !== 'COMPLETE' || !!r.pr?.startsWith('#'));
export const jobDone = (r) => (r.tranche === 'COMPLETE' || String(r.branch || '').startsWith('COMPLETE'))
  && !/^(WORKING|BLOCKED)/.test(String(r.branch || '')) && !/draft|unknown/.test(String(r.pr || '')) && !r.flag;

// The session list kept clean (Bob's ask, 4 Nov; the coordinator's count at 15:50: 5 of 17
// unarchived sessions were leftovers no one owned). From list_sessions (--sessions): each session not archived, by kind, and its act.
// Never a role's (ROOT, BOB, watcher, coordinator) nor one of a job still open. Idle over an
// hour and its work done (a job merged or deferred, a pin move with none open), or its parent
// archived: archive it. Asking (need_input) with its parent archived and its work not done: tell
// the live owner (BOB for a job, the coordinator otherwise). rows: status's; pinOpen: whether a
// pin move is open on the product (null: unknown, so no pin-move session is archived).
export const SESSION_IDLE_MIN = 60;
// The job sessions of a list_sessions result, as sessionActs classifies them: the count the job cap
// holds, the account's (list_sessions shows every product's sessions).
export const jobCount = (list) => sessionActs(list).kinds.jobs;
// With --sessions the file's job count is the count (it wins over --live, said when they differ).
export function sessionsCount(listed, live, log) {
  if (!listed) return live;
  const n = jobCount(listed);
  if (live !== undefined && Number(live) !== n) log(`--live ${live} ignored: --sessions counts ${n} job sessions`);
  return n;
}
// The cap in force, where it came from, and the account's live jobs and sessions when known.
export function capLine(cfg, live, listed) {
  const c = jobCap(cfg);
  const seen = listed ? `: ${live} job sessions live, ${listed.filter((x) => !isArchived(x)).length} sessions live in the account (every product, every role)` : live !== undefined ? `: ${live} job sessions live` : '';
  return { ...c, line: `${c.line}${seen}` };
}
export function sessionActs(list, { rows = [], roles = {}, coordinator = null, pinOpen = null, seats = null, now = Date.now() } = {}) {
  const byId = new Map(list.map((x) => [sessionId(x), x]));
  const roleIds = new Set([roles.root?.session, roles.bob?.session, roles.watcher?.session, coordinator].filter(Boolean));
  const kinds = { roles: 0, jobs: 0, builds: 0, other: 0 };
  const acts = [];
  for (const x of list.filter((s) => !isArchived(s))) {
    const id = sessionId(x);
    const title = String(x.title || '').trim();
    const job = title.match(/^job (\S+)( \(restart\))?$/)?.[1];
    // A lane's session (lane start, title `lane <name>`) is kept while idle, never a leftover (lane.mjs).
    const kind = roleIds.has(id) ? 'roles' : job ? 'jobs' : /^lane \S+$/.test(title) ? 'lanes' : /^build\b/i.test(title) ? 'builds' : 'other';
    kinds[kind] = (kinds[kind] || 0) + 1;
    // A carried session (readSessions: older than the pages read) is counted, never acted on: its state is a past read's.
    if (kind === 'roles' || x.carried) continue;
    // A lane session holding its lane's seat (or with the seats unread) is kept; one the seat no
    // longer names (ended or replaced) is a leftover once idle (lane.mjs).
    const seat = kind === 'lanes' ? seats?.get(title.slice(5)) : null;
    if (kind === 'lanes' && (!seats || (seat && (!seat.session || seat.session === id)))) continue;
    const r = job && rows.find((y) => y.id === job);
    // Merged, or deferred (BLOCKED, its pull request closed); a module status does not list is open.
    const open = job && !(r && (jobDone(r) || (r.tranche === 'BLOCKED' && r.blocked && !r.pr && !/^WORKING/.test(String(r.branch || '')))));
    const done = (job && !open) || (/^pin move\b/.test(title) && pinOpen === false) || kind === 'lanes';
    const parent = byId.get(x.parent_session_id);
    const orphan = !!parent && isArchived(parent);
    const asking = lower(x.post_turn_summary?.status_category) === 'need_input';
    // No time on the record: not known to be idle an hour.
    if (!(isIdle(x) || asking) || !sessionTime(x) || (now - sessionTime(x)) / 6e4 <= SESSION_IDLE_MIN) continue;
    if (done || (orphan && !asking && !open)) acts.push({ act: 'archive', id, title });
    else if (orphan && asking) acts.push({ act: 'tell', id, title, owner: (job ? roles.bob?.session : coordinator) || 'Bob by push notification', question: '(read its last message with list_events)' });
  }
  const line = `sessions: ${Object.values(kinds).reduce((a, b) => a + b, 0)} live (roles ${kinds.roles}, jobs ${kinds.jobs}${kinds.lanes ? `, lanes ${kinds.lanes}` : ''}, builds ${kinds.builds}, other ${kinds.other}); leftovers ${acts.length}`;
  return { kinds, acts, line };
}

// BOB's acts first (GAT-4, REC-3; measured 6 Nov: 8 job PRs sat ready with a red last gate for 2-6
// hours unseen, copy 569, 570, 493, 549 and 597, printed as "gate failure" under idle: around line
// 288 of about 700, no act named; extraction 432 COMPLETE with its PR a draft for 20 h): BOB's
// lines are held until the rows are read, then the count of acts is printed after the starts-owed
// marker and the plan, before any hold or list. A run that stops prints what it held.
export function status(root, opts = {}) {
  if (opts.role !== 'bob') return statusLines(root, opts);
  const log = opts.log || console.log;
  const held = [];
  let top = 0;
  let out = null;
  try {
    out = statusLines(root, { ...opts, log: (l) => held.push(l), top: () => { top = held.length; } });
  } finally {
    const acts = out ? (out.rows || []).filter((r) => actOf(r)) : null;
    let plan = null;
    try { plan = acts?.length ? loadConfig(root).plan : null; } catch { plan = null; }
    const wait = ['pause', 'stop'].includes(plan) ? `; plan ${plan}: they wait for the plan to resume` : '';
    for (const l of [...held.slice(0, top), ...(acts ? [actsCount(acts) + wait] : []), ...held.slice(top)]) log(l);
  }
  return out;
}

// A job PR BOB must act on now (display only): ready or COMPLETE with its last gate red or
// cancelled, or COMPLETE with its pull request still a draft. Its act, or null.
const RED = ['failure', 'timed_out', 'action_required', 'startup_failure'];
const CANCELLED = ['cancelled', 'stale'];
export function actOf(r) {
  if (!String(r.pr || '').startsWith('#') || r.tranche === 'BLOCKED' || r.flag === 'BLOCKED') return null;
  const complete = String(r.branch || '').startsWith('COMPLETE');
  if ((r.ready || complete) && RED.includes(r.gate)) return `gate ${r.gate}: restart it with the finding: ${P3} job start ${r.id} --restart "<the gate's finding>"`;
  if ((r.ready || complete) && CANCELLED.includes(r.gate)) return `gate ${r.gate}: re-gate it: re-run its gate run, or give it a new event (edit the pull request)`;
  // A gate still running on a COMPLETE draft is job complete between its push and its ready (cold review).
  if (complete && !r.ready && !['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(r.gate)) return `COMPLETE, its pull request still a draft: restart it so its job complete marks it ready: ${P3} job start ${r.id} --restart "COMPLETE, PR a draft"`;
  return null;
}
export const actsCount = (acts) => `acts now: ${acts.length}${acts.length ? ` (${acts.map((r) => r.id).slice(0, 8).join(', ')}): see red gates: act now` : ''}`;

function statusLines(root, { role, module, context, live, sessions: sessionsFile, listed: givenListed, offline = false, jobRefs = false, heads: givenHeads, log = console.log, io: given, top = () => {} } = {}) {
  const io = { openPRs, checkRun, compare, prFiles, ...given };
  let cfg = loadConfig(root);
  // Starts owed, the first line (hold.mjs): a marker, never a refusal.
  try {
    if (offline || fetchState(root, cfg.state_branch)) {
      const o = readOwed(root, cfg.state_branch);
      // The starter (auto.mjs): running or not, and the minutes from starts owed to started.
      const au = readAuto(root, cfg.state_branch);
      if (o) log(startsOwedLine(o, au));
      if (role === 'bob' && (au || readState(root, cfg.state_branch, addressFile('merger')) !== null)) for (const l of starterLines(au, readStarts(root, cfg.state_branch), o)) log(l);
    }
  } catch { /* the holds line says the state branch is unread */ }
  cfg = withCoordinator(root, cfg);
  if (sessionsFile === true) fail('--sessions <file>: your list_sessions result, saved as JSON');
  const listed = givenListed || (sessionsFile === undefined ? null : readSessions(sessionsFile, { root, offline }));
  live = sessionsCount(listed, live, log);
  const replaceMs = Number(cfg.targets?.replace_minutes ?? 30) * 6e4;
  if (!(replaceMs > 0)) fail(`targets.replace_minutes in process/config.json is a number of minutes, not ${JSON.stringify(cfg.targets?.replace_minutes)}`);
  const tranche = `origin/${cfg.tranche}`;
  const halt = role === 'bob' && (cfg.plan === 'pause' || cfg.plan === 'stop');
  if (halt) log(`plan ${cfg.plan}: take no new step`);
  // Every hold first, after a paused plan (coordinator's design, 5 Nov 01:13): a limit on starts is a recorded row, never words.
  let holds = [];
  top(); // BOB's count of acts, after the starts owed and the plan, before any hold (status)
  // The facts conditions are judged on, read once for the holds and the stale records (R13).
  let facts = null;
  try { facts = readFacts(root, cfg, { listed }); } catch { facts = null; }
  try { holds = readHolds(root, cfg.state_branch, { offline, listed, facts }); for (const l of holdLines(holds)) log(l); } catch (e) { log(`holds: unread (${e.message})`); }
  // Stale records (R13, expire.mjs): each whose condition holds or whose referent is gone, and
  // whether the tool ends it at its next write; the holds met are in the holds lines above.
  try { if (facts) for (const l of staleLines(staleRecords(root, cfg, { listed, facts, holds }).filter((x) => !(x.kind === 'hold' && x.auto)))) log(l); } catch (e) { log(`stale records: unread (${String(e.message).split('\n')[0].slice(0, 120)})`); }
  // One session per lane (lane.mjs): the seats the state branch records.
  let seats = null;
  try { seats = readSeats(root, cfg); } catch { seats = null; }
  if (live !== undefined && !(Number.isInteger(Number(live)) && Number(live) >= 0 && live !== true)) fail(`--live <n>, the account's job sessions list_sessions shows, not ${JSON.stringify(live)}`);
  if (role === 'bob') { const c = capLine(cfg, live, listed); if (c.note) log(c.note); log(c.line); }
  const haveRef = () => git(['rev-parse', '--verify', '-q', tranche], { cwd: root, allowFail: true }).code === 0;
  let prs = null;
  let slug = null;
  // The heads origin has, from the one ls-remote (null when offline or unread).
  // Offline, the caller's one ls-remote of job/* (readyCount) stands in: an OPEN entry with no
  // job branch on origin has no pull request either, so it is unstarted without GitHub read.
  let originHeads = offline && givenHeads ? new Set([...givenHeads].map((h) => `refs/heads/job/${h}`)) : null;
  // The refs fetched for the jobs (below): a wanted ref origin has and this clone could not read
  // leaves its row unknown, never merged nor startable (the idle check, 5 Nov: a clone without
  // origin's job refs counted 26 startable against job start --ready's 2).
  let wanted = null;
  let prHeads = new Set();
  const noticed = new Set();
  // jobRefs, with offline (the idle check between sweeps): GitHub's open pull requests read once and
  // the job refs fetched exactly as online, everything else read offline, so the idle count is
  // job start --ready's from the same read.
  if (!offline || jobRefs) {
    try { slug = repoSlug(root); prs = io.openPRs(slug, cfg.tranche); } catch { prs = null; }
    // The tranche and the branches job/<id> of the ledger's entries that are not COMPLETE, or
    // that have an open pull request (a reopen) or an unanswered notice: no other job/* ref is fetched (110 s measured
    // 3 Nov in a fresh depth-1 clone, carrying refs such as job/T11/agent-worker of no entry).
    // One ls-remote, then one fetch of only the refs that moved, --depth 1 in a shallow clone:
    // there a branch fetched in full pulls its whole history (90 s measured 3 Nov), and a --depth
    // fetch never finds "nothing to do" by itself (11 to 37 s for an up-to-date tranche, against 3 to 5).
    const known = haveRef() ? readLedgerTexts(root, tranche) : readLedgerTexts(root);
    const heads = new Set((prs || []).map((p) => p.head?.ref));
    prHeads = heads;
    // And, for BOB, job/<id> of each user module with an unanswered provider notice: a COMPLETE
    // user whose auto-reopened start was pushed before its pull request opened names the notice
    // on that branch only (the state branch is fetched here once; bobStatus reuses the fetch).
    if (role === 'bob') { try { if (offline || fetchState(root, cfg.state_branch)) for (const n of notices(root, cfg.state_branch)) for (const u of n.open) noticed.add(u); } catch { /* bobStatus reports it */ } }
    const ls = git(['ls-remote', '--heads', 'origin'], { cwd: root, allowFail: true });
    if (ls.code === 0) originHeads = new Set(ls.stdout.split('\n').map((l) => l.trim().split('\t')[1]).filter(Boolean));
    const kids = new Set(Object.keys(known).map((f) => f.slice(LEDGER_DIR.length + 1, -5)));
    wanted = new Set([`refs/heads/${cfg.tranche}`, ...Object.values(known).flatMap((t) => { try { const e = JSON.parse(t); const jb = e.id && jobBranch(e.id, jobHeads(originHeads), kids); return e.id && (e.status?.state !== 'COMPLETE' || heads.has(jb) || noticed.has(e.id)) ? [...new Set([`refs/heads/job/${e.id}`, `refs/heads/${jb}`])] : []; } catch { return []; } })]);
    const local = new Map(git(['for-each-ref', '--format=%(objectname) %(refname)', 'refs/remotes/origin/'], { cwd: root }).split('\n').filter(Boolean).map((l) => l.split(' ').reverse()));
    const moved = (ls.code === 0 ? ls.stdout.split('\n') : []).map((l) => l.trim().split('\t')).filter(([sha, r]) => r && wanted.has(r)
      && local.get(`refs/remotes/origin/${r.slice(11)}`) !== sha);
    if (moved.length) git(['fetch', '-q', ...depth(root), 'origin', ...moved.map(([, r]) => `+${r}:refs/remotes/origin/${r.slice(11)}`)], { cwd: root, allowFail: true });
  }
  const haveTranche = haveRef();
  const onTranche = haveTranche ? readLedgerTexts(root, tranche) : readLedgerTexts(root);
  const rows = [];
  const ids = new Set(Object.keys(onTranche).map((f) => f.slice(LEDGER_DIR.length + 1, -5)));
  // origin's job heads; with none read, the ones this clone has fetched.
  const jheads = originHeads ? jobHeads(originHeads) : git(['for-each-ref', '--format=%(refname:lstrip=3)', 'refs/remotes/origin/job/'], { cwd: root }).split('\n').filter(Boolean);
  for (const [file, text] of Object.entries(onTranche)) {
    let e;
    try { e = JSON.parse(text); } catch { rows.push({ id: file, state: 'UNREADABLE' }); continue; }
    // The job's branch (ledger.mjs jobBranch): job/<id>, or a --fresh-branch start's job/<id>-<n>.
    const jb = jobBranchAt(root, e.id, jheads, ids);
    const branch = `origin/${jb}`;
    const tipAge = () => Date.now() - (Number(git(['log', '-1', '--format=%ct', branch], { cwd: root, allowFail: true }).stdout.trim()) * 1000 || Date.now());
    const row = { id: e.id, tranche: e.status?.state, req: e.requirements, ...(jb !== `job/${e.id}` ? { ref: jb } : {}) };
    // BLOCKED with a recorded reason, on the tranche or its branch: the layer can close past it.
    if (e.status?.state === 'BLOCKED') Object.assign(row, { since: e.status.at, owner: e.status.owner }, e.status.reason ? { blocked: e.status.reason } : {});
    const haveBranch = git(['rev-parse', '--verify', '-q', branch], { cwd: root, allowFail: true }).code === 0;
    // Judged at the fetched tranche, on the branch this row reads (review: the wanted set was read
    // before the fetch, from the local tranche): a ref the row needs, on origin, not in this clone.
    if (!haveBranch && wanted && originHeads?.has(`refs/heads/${jb}`) && (e.status?.state !== 'COMPLETE' || prHeads.has(jb) || noticed.has(e.id))) row.unread = true;
    if (haveBranch) {
      const t = git(['show', `${branch}:${LEDGER_DIR}/${e.id}.json`], { cwd: root, allowFail: true });
      let s = {};
      try { s = t.code === 0 ? JSON.parse(t.stdout).status || {} : {}; } catch { s = {}; }
      const ahead = haveTranche ? aheadBy(root, { slug, base: cfg.tranche, head: jb, local: [tranche, branch], read: io.compare }) : null;
      row.ahead = ahead;
      // A job whose pull request merged (its entry COMPLETE on the tranche, every commit of its
      // branch on the tranche) is the tranche's: its branch, not fetched once COMPLETE, can hold
      // the status it had when last fetched, and raises no flag (ROOT, 4 Nov: sweep listed the
      // merged instance-setup and wizard-scripts as BLOCKED every hour from such a ref). Its
      // branch is still read (owedNotices: a merged attempt's start row names an unrecorded answer).
      const merged = ahead === 0 && e.status?.state === 'COMPLETE';
      row.branch = (s.state || 'no entry on its branch') + (s.reason ? ` (${s.reason})` : '');
      // ENF-6, JOB-9: a WORKING job with nothing pushed beyond its start commit for SILENT_HOURS (copy, 4 Nov: flagged 7 min after its start).
      if (!merged && s.state === 'WORKING' && ahead !== null && ahead <= 1 && tipAge() > SILENT_HOURS * 36e5) row.flag = 'WORKING, nothing pushed';
      if (!merged && s.state === 'BLOCKED') row.flag = 'BLOCKED';
      if (!merged && s.state) { row.blocked = s.state === 'BLOCKED' && s.reason ? s.reason : undefined; row.since = s.state === 'BLOCKED' ? s.at : undefined; row.owner = s.state === 'BLOCKED' ? s.owner : undefined; }
    }
    const pr = prs?.find((p) => p.head?.ref === jb);
    if (pr) {
      row.pr = `#${pr.number}${pr.draft ? ' draft' : ' ready'}`;
      row.updated = pr.updated_at || null;
      row.ready = !pr.draft;
      const run = io.checkRun(slug, pr.head.sha, 'gate');
      row.gate = run ? (run.conclusion || run.status) : 'none';
    } else if (row.unread) {
      row.pr = `unknown (${jb} unread)`;
    } else if (prs === null) {
      if (row.branch) row.pr = 'unknown (GitHub not read)';
      else if (e.status?.state === 'COMPLETE') row.pr = 'merged';
    } else if (row.ahead === 1 && row.branch?.startsWith('WORKING')) {
      row.flag = `an unfinished start (pushed, no pull request): run job start ${e.id} --live <n> again and it resumes`;
    } else if (row.ahead > 0 && !row.blocked) {
      // Commits on the branch the tranche lacks, and no open PR: an attempt closed unmerged.
      row.flag = 'commits on its branch and no open PR; a closed attempt is restarted by a Phase 2 command';
    } else if (e.status?.state === 'COMPLETE') row.pr = 'merged';
    // With BOB's list_sessions (--sessions): a WORKING job with its draft open whose session is
    // archived, or idle with no push for targets.replace_minutes. BOB restarts its session.
    const restart = `BOB's act: ${P3} job start ${e.id} --restart "<why>"`;
    const js = listed && row.branch?.startsWith('WORKING') && !row.ready && row.pr?.startsWith('#') && (!row.flag || row.flag === 'WORKING, nothing pushed') ? jobSession(listed, e.id) : null;
    if (js && isArchived(js)) row.flag = `job session gone (${sessionId(js)} archived); ${restart}`;
    else if (js && isIdle(js) && tipAge() > replaceMs) row.flag = `job idle ${Math.round(replaceMs / 6e4)}m (${sessionId(js)} ${state(js) === 'idle' ? 'idle' : lower(js.status_bucket)}, no push for ${Math.round(tipAge() / 6e4)}m); ${restart}`;
    // A WORKING job that pushed and then stopped (interrupted, or stopped by refusals): its pull
    // request not ready and its branch tip older than SILENT_HOURS. BOB restarts its session.
    // The fallback when BOB's sessions are not given, or none matches the job.
    if (!row.flag && !row.ready && row.ahead > 1 && row.branch?.startsWith('WORKING')) {
      const age = tipAge();
      if (age > SILENT_HOURS * 36e5) row.flag = `WORKING, no push for ${Math.round(age / 36e5 * 10) / 10}h; BOB's act: ${P3} job start ${e.id} --restart "<why>"`;
    }
    // OPEN on the tranche, origin read, and no job branch and no pull request: never started.
    if ((prs !== null || (offline && givenHeads)) && originHeads && !originHeads.has(`refs/heads/${jb}`) && e.status?.state === 'OPEN' && !row.branch && !row.pr?.startsWith('#') && !row.flag) row.unstarted = true;
    // A deferred module's pull request, GitHub unread: unknown, so the layer is held.
    if (prs === null && row.blocked && !row.pr) row.pr = 'unknown (GitHub not read)';
    rows.push(row);
  }
  log(`ledger on ${haveTranche ? tranche : 'the working tree'}: ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}${prs === null ? (offline ? '; offline, pull requests not read' : '; GitHub unreadable') : ''}`);
  for (const r of role === 'bob' ? [] : rows) {
    log(`- ${r.id}: ${r.tranche ?? r.state}${r.branch ? `; on its branch ${r.branch}, ${r.ahead} commit(s) ahead` : ''}${r.pr ? `; PR ${r.pr}` : ''}${r.gate ? `; gate ${r.gate}` : ''}${r.flag ? `; FLAG ${r.flag}` : ''}`);
  }
  let addr = {};
  try { addr = readAddress(root, { fetch: !offline }); } catch { addr = {}; }
  log(`addresses: ROOT ${addr.root ? `${addr.root.session} (${addr.root.at})` : 'none'}; BOB ${addr.bob ? `${addr.bob.session} (${addr.bob.at})` : 'none'}`);
  if (listed) log(sessionActs(listed, { rows, roles: addr, coordinator: cfg.coordinator, seats }).line);
  // Refusals per session, from the tranche's rows and this checkout's (a row BOB recorded but has
  // not merged yet counts at once); the same row in both counts once (each carries its own id).
  const seen = new Set();
  const metricRows = [...(haveTranche ? rowsAt(root, tranche) : []), ...rowsHere(root)].filter((r) => {
    const k = JSON.stringify(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const sessions = refusalCounts(metricRows);
  if (sessions.length) {
    log(`refusals by session (REFRESH at ${REFRESH_AT}; auto mode asks a person at 20):`);
    for (const s of sessions) log(`- ${s.session}: ${s.refusals}${s.refresh ? '; REFRESH: start a fresh session to replace it' : ''}`);
  }
  if (role === 'job' && module) {
    const set = readingSet(root, readEntry(root, module));
    log(`reading set for job ${module}: ${set.bytes} bytes`);
    for (const f of set.files) log(`  ${f.bytes}\t${f.file}`);
  }
  if (role === 'bob') {
    const out = { sessions, rows, holds, prs, heads: idsOn(originHeads), ...bobStatus(root, cfg, { rows, prs: offline ? null : prs, offline, context, log, slug, tranche: haveTranche ? tranche : 'HEAD', files: io.prFiles, holds, comments: slug && (io.comments || ((pr) => ghComments(slug, pr))) }), tranche: haveTranche ? tranche : 'HEAD' };
    const ref = haveTranche ? tranche : null;
    const closed = closedRows(root, cfg, { slug: offline ? null : slug, read: io.compare });
    out.layer = layerState(root, cfg, rows, ref, { closed });
    // No job work until the tranche open's grants check has passed (Build Plan Phase 3).
    out.open = openState(root, cfg);
    if (out.open.state !== 'open') log(openLine(out.open));
    out.notices = owedNotices(root, cfg, rows, log);
    // The deploy and walk at a round close only, never between layers (Bob, 4 Nov); it never
    // holds job starts: next work is listed beside it. Its unrecorded findings hold tranche close.
    out.deploy = null;
    // Not before the tranche open has passed (a tranche merged into main reads every row stale).
    if (cfg.deploy && !halt && out.open.state === 'open') {
      const at = { ref: ref || 'HEAD', tip: git(['rev-parse', ref || 'HEAD'], { cwd: root }) };
      const w = walkFindings(root, cfg, at.ref, { slug: offline ? null : slug, read: io.compare });
      // The plan as the tranche holds it, as deploy dev and tranche close read it.
      let plan = cfg.plan;
      try { if (ref) plan = loadConfig(root, ref).plan; } catch { plan = cfg.plan; }
      out.deploy = deployOwed(roundClose(root, cfg, { ls: out.layer, plan, closed, ref: at.ref, w }), w, at.tip);
      if (out.deploy !== null) log(`deploy and walk at the round close: ${P3} deploy dev (${out.deploy}); job starts do not wait for it`);
      const hold = walkHold(w);
      if (hold) log(`tranche close waits: ${hold}`);
    }
    // The cap counts job sessions doing work (item 5): a listed session parked in the train is not counted.
    out.parked = listed ? parkedSessions(listed, rows) : [];
    if (out.parked.length) { live = Number(live) - out.parked.length; log(parkedLine(out.parked)); }
    out.live = live;
    out.next = halt || out.open.state !== 'open' ? [] : nextWork(root, cfg, rows, ref, { live: live === undefined ? undefined : Number(live), log, state: out.layer, notices: out.notices });
    markLaneHeld(cfg, seats, out.next);
    out.seats = seats;
    out.lane_defects = laneDefects(cfg, seats, { rows, listed });
    for (const d of out.lane_defects) log(d);
    out.flow = flow(cfg, rows, out.next, live, listed, holds, { onOrigin: onOriginOf(out.heads) });
    log(out.flow.line);
    return out;
  }
  return { rows, sessions, prs, holds, seats, heads: idsOn(originHeads) };
}
// The modules whose job/<id> origin has (null when origin's heads were not read), and the test
// job start --ready's selection takes (ready.mjs startable onOrigin).
const idsOn = (h) => (h ? new Set(jobHeads(h).map((x) => x.slice(4))) : null);
export const onOriginOf = (heads) => (heads ? (id) => heads.has(id) : undefined);

const decisionMinutes = (cfg, t = Number(cfg.targets?.decision_minutes ?? 30)) => (t > 0 ? t : fail(`targets.decision_minutes in process/config.json is a number of minutes, not ${JSON.stringify(cfg.targets?.decision_minutes)}`));
// The jobs BLOCKED awaiting a ruling (not deferred: a recorded reason and its pull request closed),
// oldest first, each with its minutes since its block (its entry's status.at; unknown listed last).
// Past targets.decision_minutes its ruling is owed: Bob's when its reason names a requirement (Build
// Plan rule 9: the word or an R<id>), else the coordinator's (coordinator, 5 Nov: 44 job-hours BLOCKED in a day on the copy).
// A job whose module is under a live hold (hold.mjs, `hold module:<id>`) owes no ruling: the hold
// is the ruling's record (coordinator, 5 Nov: op-declarations, held to 11:27, relayed as owed every
// sweep). It is shown held, with the hold's reason and expiry; layers: a layer hold holds it too.
// The layer map a live layer hold needs (else none read); unread, a layer hold holds nothing here.
export function holdLayers(root, cfg, holds) {
  if (!(holds || []).some((h) => h.live && h.kind === 'layer')) return new Map();
  try { return layersAt(root, cfg); } catch { return new Map(); }
}
export function blockedJobs(cfg, rows, t = Date.now(), holds = [], layers = new Map()) {
  const target = decisionMinutes(cfg);
  return rows.filter((r) => (r.tranche === 'BLOCKED' || r.flag === 'BLOCKED') && !(r.blocked && !/^(#|unknown)/.test(r.pr || ''))).map((r) => {
    const min = Date.parse(r.since || '') ? Math.floor((t - Date.parse(r.since)) / 6e4) : null;
    // Bob's only for a requirement question by rule 9's test, what the product must do (audit of PR
    // 139): the owner `job block --owner` named, else a reason that opens with "requirement" or asks it.
    const bob = r.owner ? r.owner === 'bob' : /^requirement\b|what the product must do/i.test(r.blocked || '');
    const held = heldBy(holds || [], r.id, layers);
    const by = !held && min > target ? (bob ? 'Bob' : `the coordinator${cfg.coordinator ? ` (${cfg.coordinator})` : ''}`) : null;
    const since = `; blocked ${min === null ? 'since unknown' : `${min} min`}`;
    if (held) return { id: r.id, min, by, held, text: `${since}; held (${held.id} ${held.scope}, by ${held.by}) to ${held.until}: ${held.why}` };
    return { id: r.id, min, by, text: `${since}${by ? `; ruling owed by ${by}: ${r.blocked || 'no reason recorded'}` : ''}` };
  }).sort((a, b) => (b.min ?? -1) - (a.min ?? -1));
}
// One flow line (coordinator, 5 Nov: cap use about 48%): the account's job sessions against the cap,
// the work job start --ready would start (ready.mjs startable), and the jobs awaiting a ruling. The sweep records its numbers.
export function flow(cfg, rows, next, live, listed = null, holds = [], { onOrigin } = {}) {
  const [c, b, startable] = [jobCap(cfg), blockedJobs(cfg, rows, Date.now(), holds), starts(next, { onOrigin }).go.length];
  // Working against occupied (coordinator, 5 Nov): with list_sessions, each open job's live session
  // running or waiting (idle), and what a waiting one waits on where status knows it.
  const wait = [];
  let working = 0;
  // Every unarchived job session, as the cap counts them (review of 5cb2fab: the split left out
  // other products' sessions and older duplicates); what each waiting one waits on where known.
  for (const js of (listed || []).filter((x) => !isArchived(x))) {
    const id = String(js.title || '').trim().match(/^job (\S+)( \(restart\))?$/)?.[1];
    if (!id) continue;
    if (!isIdle(js)) { working++; continue; }
    const r = rows.find((y) => y.id === id);
    // A done job's idle session, or an older one beside its latest, holds a slot until archived.
    wait.push(`${id} ${!r ? 'not this product\'s' : jobSession(listed, id) !== js || !jobOpen(r) ? 'archive' : r.tranche === 'BLOCKED' || r.flag === 'BLOCKED' ? 'block' : r.ready && r.gate === 'success' ? 'merge' : r.ready ? 'gate' : 'BOB'}`);
  }
  const parked = listed ? parkedSessions(listed, rows).length : 0;
  const split = listed ? ` (working ${working}, waiting ${wait.length}${wait.length ? `: ${wait.join(', ')}` : ''}${parked ? `; ${parked} parked in the train, not counted` : ''})` : '';
  // Slots left free with files over the requirements cap: BOB's split acts, the work that would open them (coordinator, 5 Nov).
  const free = live === undefined || live === null ? 0 : c.cap - Number(live) - startable;
  const owed = free > 0 ? (next || []).filter((x) => x.over && x.file).map((x) => x.file) : [];
  const splits = owed.length ? `; ${free} slot${free === 1 ? '' : 's'} free: BOB's split acts would open them (split or consolidate: ${owed.join(', ')})` : '';
  return { startable, blocked: b.length, blocked_oldest_min: b[0]?.min ?? null, ...(listed ? { working, waiting: wait.length } : {}), ...(owed.length ? { splits_owed: owed } : {}), line: `flow: live ${live ?? '?'}/${c.cap} (${c.from})${split}, startable ${startable}, blocked ${b.length}${b.length ? ` (oldest ${b[0].min ?? '?'} min)` : ''}${splits}` };
}

// status --role bob: one screen. Open, idle, owed and blocked jobs with each pull request's last
// activity; merged as a count; other open pull requests into the tranche; undelivered messages;
// REFRESH from refusals and from context use; BOB's reading set with sizes.
export function bobStatus(root, cfg, { rows, prs, offline, context, log, slug = null, tranche = `origin/${cfg.tranche}`, files: prList, comments: readComments, holds = [] }) {
  const sb = cfg.state_branch;
  // Each pull request's comments read once per status (base-red and the suite budget share them).
  const seen = new Map();
  const comments = readComments && ((pr) => { if (!seen.has(pr)) seen.set(pr, readComments(pr)); return seen.get(pr); });
  const L = [];
  let haveState = false;
  if (!offline) { try { haveState = fetchState(root, sb); } catch (e) { L.push(`${sb}: ${e.message}`); } }
  else haveState = git(['rev-parse', '--verify', '-q', `refs/remotes/origin/${sb}`], { cwd: root, allowFail: true }).code === 0;
  const age = (t) => (t ? `${Math.round((Date.now() - Date.parse(t)) / 36e5 * 10) / 10}h ago` : 'unknown');
  const idle = (r) => r.flag?.startsWith('WORKING') || (r.updated && Date.now() - Date.parse(r.updated) > IDLE_HOURS * 36e5);
  const groups = { 'red gates: act now': [], blocked: [], owed: [], idle: [], open: [] };
  const merger = haveState && readState(root, sb, addressFile('merger')) !== null; // job merges are the MERGER's
  // A pull request stuck in the train (stuck.mjs): owed, with its reason, never "the train merges it".
  let bobAt = null;
  try { bobAt = JSON.parse(readState(root, sb, addressFile('bob')) || 'null')?.session || null; } catch { bobAt = null; }
  const stuck = merger && Array.isArray(prs) ? readStuck(root, sb, prs, bobAt) || new Map() : new Map();
  let merged = 0;
  // Each job awaiting a ruling with its age, oldest first; every other row in ledger order.
  const waits = new Map(blockedJobs(cfg, rows, Date.now(), holds, holdLayers(root, cfg, holds)).map((b, i) => [b.id, { ...b, i }]));
  for (const r of [...rows].sort((a, b) => (waits.get(a.id)?.i ?? 1e9) - (waits.get(b.id)?.i ?? 1e9))) {
    const line = `${r.id}: ${r.branch || r.tranche || r.state}${r.pr ? `; PR ${r.pr}, last activity ${age(r.updated)}` : ''}${r.gate ? `; gate ${r.gate}` : ''}${r.flag ? `; ${r.flag}` : ''}${waits.get(r.id)?.text ?? ''}`;
    if (r.tranche === 'BLOCKED' || r.flag === 'BLOCKED') groups.blocked.push(line);
    else if (actOf(r)) groups['red gates: act now'].push(`${line}; BOB's act: ${actOf(r)}`);
    else if (r.ready && r.gate === 'success' && merger && stuck.has(inTrain(r))) groups.owed.push(`${line}; ${stuckLine(stuck.get(inTrain(r)), r.id)}`);
    else if (r.ready && r.gate === 'success' && merger) groups.open.push(`${line}; the MERGER's train merges it`);
    else if (r.ready && r.gate === 'success') groups.owed.push(`${line}; merge owed, with --job-cost-usd (its session's get_session usage.cost_usd)`);
    else if (r.flag && !r.flag.startsWith('WORKING')) groups.owed.push(line);
    else if (r.pr === 'merged') merged++;
    else if (idle(r)) groups.idle.push(line);
    else if (r.pr || r.branch) groups.open.push(line);
    else merged += r.tranche === 'COMPLETE' ? 1 : 0;
  }
  // Bob, 4 Nov: every test tolerated as base-red on the tranche, at the top of owed work, oldest
  // first, with its module and its age since the first gate row that tolerated it. Report only.
  // Only status itself passes comments: one read per merged PR (job start --ready and measures
  // call bobStatus too, and need none of it).
  if (!offline && comments && haveState) {
    const red = baseRedAges(root, cfg, { tranche, comments, haveState });
    groups.owed.unshift(...(red === null ? ['base-red: unread (a merged PR\'s gate rows)']
      : red.map((o) => `base-red ${age(o.since)}: ${o.module} ${o.test} (PR ${o.pr})`)));
  }
  // Bob, 6 Nov (R2): a module whose gate suite took over 70% of suite_timeout_minutes, from
  // the newest gate row of its pull requests on this tranche, is one line among the acts.
  if (!offline && comments && haveState) groups['red gates: act now'].push(...(suiteBudget(root, cfg, { tranche, comments, rows }) ?? ['suite budget: unread (a pull request\'s gate rows)']));
  for (const [k, v] of Object.entries(groups)) if (v.length) L.push(`${k}:`, ...v.map((x) => `- ${x}`));
  L.push(`merged: ${merged}`);
  const jobs = new Set(rows.map(refOf));
  // Tranche carry (SHM-4): an open pull request no ledger entry owns stays under "to take in"
  // until a job takes it in or it is closed; one already taken in is listed as other.
  const carry = prs ? toTakeIn(root, { slug, ref: tranche, prs, files: prList }) : [];
  if (carry.length) L.push('to take in:', ...carry.map((t) => `- ${takeInLine(t, P3)}, last activity ${age(t.updated)}`));
  const listed = new Set(carry.map((t) => t.number));
  const other = (prs || []).filter((p) => !jobs.has(p.head?.ref) && !listed.has(p.number));
  if (other.length) L.push('other pull requests:', ...other.map((p) => `- #${p.number} ${p.head?.ref}${p.draft ? ' draft' : ''}, last activity ${age(p.updated_at)}`));
  const owedMsgs = haveState ? undelivered(root, sb) : [];
  if (owedMsgs.length) L.push('undelivered messages:', ...owedMsgs.map((m) => `- ${m.from}-${m.n} to ${m.to}: ${m.outcome || 'not recorded delivered'}`));
  const reports = haveState ? toRoute(root, sb) : [];
  if (reports.length) L.push('reports to route (until a later message from bob names its id):', ...reports.map((m) => `- ${m.from}-${m.n}: ${m.text.replace(/^first: .*? job start --ready --live <n> \(\d+ jobs? ready\)\. Then: /, '').slice(0, 100)}`));
  // The escalation chain (coordinator, 4 Nov): a report unanswered past targets.decision_minutes is listed, ahead of next work.
  const target = decisionMinutes(cfg);
  for (const m of reports) {
    const mins = Math.floor((Date.now() - Date.parse(m.at)) / 6e4);
    if (mins > target) L.push(`unanswered ${m.from}-${m.n} ${mins}m (target ${target})`);
  }
  const pct = context === undefined ? null : Number(String(context).replace(/%$/, ''));
  if (pct !== null && !Number.isFinite(pct)) fail(`--context takes the percent of the window used, a number, not ${JSON.stringify(context)}`);
  if (pct !== null) L.push(`context ${pct}% of the window${pct >= cfg.refresh_context ? `: REFRESH (threshold ${cfg.refresh_context}%)` : ` (REFRESH at ${cfg.refresh_context}%)`}`);
  // The shared layer branch (layerflow.mjs): the open layer and the jobs BOB starts from it.
  if (layerMode(cfg) && !offline && haveState && slug) { try { L.push(...layerLines(root, cfg, { slug })); } catch (e) { L.push(`layer flow: unread (${e.message})`); } }
  // The census and the preflight (R15, census.mjs; Bob, 6 Nov: anticipate the refusals): the gaps
  // of the open layer and the two after it, the rest counted, and the starts of the next layer
  // that job start would refuse, each with what BOB writes.
  if (!offline && cfg.modules_file) { try { L.push(...gapLines(root, cfg, { tranche, holds, haveState })); } catch (e) { L.push(`gaps: unread (${String(e.message).split('\n')[0].slice(0, 120)})`); } }
  const files = cfg.reading_bob.map((f) => ({ f, b: fileBytes(join(root, f)) }));
  const h = haveState ? readState(root, sb, handoffFile('bob')) : null;
  if (h !== null) files.push({ f: `${sb}:${handoffFile('bob')}`, b: Buffer.byteLength(h) });
  // Lane questions BOB passed and has not recorded a decision for (SES-14).
  const asked = haveState && Array.isArray(cfg.lanes) ? openAsks(root, cfg) : [];
  if (asked.length) L.push('open lane questions (record each decision with lane ask ... --record):', ...asked.map((a) => `- ${a.lane}: "${a.question.slice(0, 100)}", asked ${age(a.at)}`));
  L.push(`reading set for bob: ${files.reduce((s, x) => s + x.b, 0)} bytes; ${files.map((x) => `${x.f} ${x.b}`).join(', ')}`);
  for (const l of L) log(l);
  return { rows, undelivered: owedMsgs };
}

// The suite budget (build ci-budget, R2; Bob, "go R2"): each module whose newest gate row on this
// tranche's pull requests (its merges since the opening, and its open job pull request) took
// over SUITE_BUDGET of suite_timeout_minutes (20 when unset) for its own suite. Its seconds are the
// row's suite_by_module, or, from a row before that, suite_seconds when the run's scope was that
// module alone. One line per module, most over first; [] when none; null when a read failed.
export const SUITE_BUDGET = 0.7;
export function suiteBudget(root, cfg, { tranche, comments, rows = [] }) {
  const limit = Number(cfg.suite_timeout_minutes) > 0 ? Number(cfg.suite_timeout_minutes) : 20;
  const opened = openedAt(leadInputs(root, cfg.state_branch, (p) => readState(root, cfg.state_branch, p), cfg.tranche).grants, cfg);
  const prs = new Map();
  if (opened) for (const r of rowsAt(root, tranche)) if (r.row === 'merge' && Date.parse(r.at) >= Date.parse(opened) && r.pr && r.module) prs.set(Number(r.pr), r.module);
  // An open job pull request: status writes its pr as "#<n> ready" or "#<n> draft" (cold review).
  for (const r of rows) { const n = Number(String(r.pr || '').match(/^#(\d+)/)?.[1]); if (n) prs.set(n, r.id); }
  const newest = new Map();
  for (const [pr, module] of prs) {
    let got;
    try { got = comments(pr); } catch { return null; }
    if (got === null || got === undefined) return null;
    for (const row of gateRuns(got)) {
      const sec = Number.isFinite(row.suite_by_module?.[module]) ? row.suite_by_module[module]
        : !row.suite_by_module && Array.isArray(row.scope) && row.scope.length === 1 && row.scope[0] === module && Number.isFinite(row.suite_seconds) ? row.suite_seconds : null;
      // A run of only some of the module's tests (requirements-only) is not its suite's time.
      if (sec === null || !['pass', 'fail', 'base-red'].includes(row.suite) || (row.requirements_only || []).some((x) => x?.module === module)) continue;
      const was = newest.get(module);
      if (!was || String(row.at) > String(was.at)) newest.set(module, { at: row.at, sec, pr });
    }
  }
  return [...newest].map(([module, x]) => ({ module, ...x, min: x.sec / 60 })).filter((x) => x.min > SUITE_BUDGET * limit).sort((a, b) => b.min - a.min)
    .map((x) => `suite budget: ${x.module}'s gate suite took ${Math.round(x.min * 10) / 10} min, ${Math.round((x.min / limit) * 100)}% of suite_timeout_minutes ${limit} (over ${Math.round(SUITE_BUDGET * 100)}%; PR ${x.pr}, gate row ${x.at}): speed or split its suite before it times out`);
}

// The gaps block of status --role bob (R15): the census at the tranche for the open layer n and
// lookahead n+1 and n+2 (with no open layer, every gap), then layer n+1's preflight.
export function gapLines(root, cfg, { tranche = `origin/${cfg.tranche}`, holds = [], haveState = true } = {}) {
  const open = haveState ? openLayers(root, cfg, (p) => readState(root, cfg.state_branch, p)) : [];
  const c = census(root, cfg, { ref: tranche, open });
  if (c.skipped) return [];
  const n = open.length ? Math.min(...open) : null;
  const out = censusLines(c, { layers: n === null ? null : [n, n + 1, n + 2], tranche: cfg.tranche, label: n === null ? 'gaps' : `gaps (layer ${n} open; lookahead ${n + 1} and ${n + 2})` });
  if (n !== null && layersAt(root, cfg, tranche).size) {
    const seat = (id) => { try { return laneSeatFor(root, cfg, id, { fetch: false }); } catch { return null; } };
    out.push(...preflightLines(n + 1, preflight(root, cfg, n + 1, { ref: tranche, census: c, holds, heldBy, seat, layers: layersAt(root, cfg, tranche) })));
  }
  return out;
}

// The tranche's base-red tests (baseRedOwed over its merge rows since its opening), each once by
// module and test, at its oldest tolerating row; oldest first. null: unread; none before the opening.
export function baseRedAges(root, cfg, { tranche, comments, haveState }) {
  if (!haveState) return null;
  const opened = openedAt(leadInputs(root, cfg.state_branch, (p) => readState(root, cfg.state_branch, p), cfg.tranche).grants, cfg);
  if (!opened) return [];
  const merges = [...new Map(rowsAt(root, tranche).filter((r) => r.row === 'merge' && Date.parse(r.at) >= Date.parse(opened)).map((r) => [r.pr, r])).values()];
  const owed = baseRedOwed(merges, (pr) => gateRuns(comments(pr) || []));
  if (!owed) return null;
  const by = new Map();
  for (const o of owed) { const k = `${o.module}\0${o.test}`; if (!by.has(k) || String(o.since) < String(by.get(k).since)) by.set(k, o); }
  return [...by.values()].sort((a, b) => String(a.since).localeCompare(String(b.since)));
}

// A layer closed by `layer close` (INT-4): one row per close in layers/closed.jsonl on the state
// branch, BOB the one writer. A row counts for this tranche only: its tranche name, and its commit
// not yet on main (a row from a tranche already merged into main is stale). On main is GitHub's
// compare when online (a shallow clone's history, and a stale origin/main, cannot say; review of
// PR 48), else the local ancestry.
export const CLOSED_FILE = 'layers/closed.jsonl';
// Whether a commit is on main: GitHub's compare when online, else the local ancestry.
export function onMainOf(root, { slug = null, read = compare } = {}) {
  return (sha) => {
    const c = slug ? read(slug, 'main', sha) : null;
    if (Number.isInteger(c?.ahead_by)) return c.ahead_by === 0;
    return git(['merge-base', '--is-ancestor', sha, 'refs/remotes/origin/main'], { cwd: root, allowFail: true }).code === 0;
  };
}
export function closedRows(root, cfg, { slug = null, read = compare } = {}) {
  const onMain = onMainOf(root, { slug, read });
  return (readState(root, cfg.state_branch, CLOSED_FILE) || '').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } })
    .filter((r) => r.row === 'closed' && r.tranche === cfg.tranche && Number.isInteger(r.layer) && !onMain(String(r.commit)));
}

// The layers (Build Plan, Phase 3, INT-4): the layer map (layers_file), a table row whose first
// cell is a number is a layer, its last cell its modules. A layer is closed when recorded closed,
// or when none of its modules has unmet marks or an open job. The open layer is the lowest not
// closed. It is ready to close when no module of it has an open job and each has its job merged
// in this tranche (its entry COMPLETE, no open pull request, no flag) or no unmet marks, or is
// BLOCKED with a recorded reason and its pull request closed (deferred: a BLOCKED module with no
// reason holds the layer); the marks left then are deferred, never listed again as its next work.
// owed: the deferred modules whose pull request is still open, BOB's to close unmerged before the
// close (pending, when nothing else holds the layer). Null without a layer map.
export function layerState(root, cfg, rows, ref, { closed = closedRows(root, cfg) } = {}) {
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const read = (f) => (ref ? (exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null) : existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : null);
  const map = read(cfg.layers_file);
  if (map === null) return null;
  // Requirement marks (R) hold a layer; found marks (F, the route for work found elsewhere) never
  // do: they are work by open_by whatever the layer, and never deferred at a close.
  const ids = (f) => unmetIds(read(f));
  const marks = (f) => ids(f).filter((x) => !isFound(x));
  const found = (f, id) => [...ids(f), ...ids(foundFile(id))].filter(isFound);
  const recorded = new Set(closed.map((r) => r.layer));
  const layers = map.split('\n').map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .filter((c) => c.length > 1 && /^\d+$/.test(c[0]))
    .map((c) => ({ n: Number(c[0]), mods: c.at(-1).replace(/[`*]/g, '').split(',').map((m) => m.trim()).filter(Boolean).map((id) => {
      const file = `${dir}/${id}.md`;
      const row = rows.find((r) => r.id === id || r.req === file);
      const open = !!row && (row.tranche !== 'COMPLETE' || !!row.pr?.startsWith('#'));
      const merged = !!row && row.tranche === 'COMPLETE' && !open && !row.flag && !(row.ahead > 0) && !row.unread; // a restart's fresh start commit is unflagged
      const pr = row?.pr?.match(/^#(\d+)/)?.[1] ?? null;
      return { id, file, open, merged, blocked: row?.blocked || null, pr: pr && Number(pr), marks: marks(file), found: found(file, id), row };
    }) }))
    .sort((a, b) => a.n - b.n);
  // Work merged in this tranche: a COMPLETE entry whose ledger file differs from main's, or that
  // main lacks (origin/main unread counts as here). A layer that had such work closes only by
  // `layer close`, its checks and close row; one with none closes implicitly.
  const blob = (at, f) => {
    if (at) { const r = git(['rev-parse', '-q', '--verify', `${at}:${f}`], { cwd: root, allowFail: true }); return r.code === 0 ? r.stdout.trim() : null; }
    return existsSync(join(root, f)) ? git(['hash-object', f], { cwd: root }) : null;
  };
  const here = (m) => { const f = `${LEDGER_DIR}/${m.row.id}.json`; const b = blob(ref, f); return b === null || b !== blob('refs/remotes/origin/main', f); };
  // The R marks its last start reopened it for: its start row on the tranche (no history read, so a
  // shallow clone reads it too; review of PR 138).
  const left = (m) => String((ref ? rowsAt(root, ref, m.row.id) : readRows(root, m.row.id)).filter((r) => r.event === 'start').pop()?.reopen || '').match(/^meet the unmet requirement marks (R\d+(?:, R\d+)*)/)?.[1].split(', ') || [];
  for (const L of layers) {
    L.recorded = recorded.has(L.n);
    for (const m of L.mods) m.here = m.merged && here(m);
    L.worked = L.mods.some((m) => m.here);
    // Merged in this tranche after a reopen for these marks: unmet after its job, deferred at the
    // close, never reopened for them again this tranche (coordinator, 5 Nov: a reopen per start --ready).
    for (const m of L.mods) if (m.here && m.marks.length) { const l = left(m); if (m.marks.every((x) => l.includes(x))) m.after = m.marks; }
    L.closed = L.recorded || (!L.worked && L.mods.every((m) => !m.open && !m.marks.length));
  }
  const cur = layers.find((L) => !L.closed) || null;
  // A deferred module's pull request unread (offline) holds the layer as an open one does.
  const ok = (m) => (m.blocked ? !m.pr && !m.row.pr?.startsWith('unknown') : !m.open && (m.merged || !m.marks.length));
  const owed = (cur?.mods || []).filter((m) => m.blocked && m.pr);
  const ready = !!cur && cur.mods.every(ok);
  const pending = !!cur && !!owed.length && cur.mods.every((m) => ok(m) || owed.includes(m));
  const deferred = layers.filter((L) => recorded.has(L.n)).flatMap((L) => L.mods.filter((m) => m.marks.length).map((m) => ({ layer: L.n, id: m.id, count: m.marks.length })));
  return { layers, cur, ready, pending, owed, deferred };
}

// Provider notices (the provider-change route): per user module, each notice it has not answered,
// as the state branch holds them (bobStatus fetched it). Listed until the user has an open job
// whose START names the notice (its start row, on its job branch); answered when that job merges,
// or by notice triage judging the module not affected. Each notice carries the module's triage row
// (`triage`), null until `notice triage --record` judged it: until then the notice is listed once,
// as `triage owed`, and none of its modules is notice work (56 modules for one struck requirement
// on the copy, 4 Nov).
export function owedNotices(root, cfg, rows, log = console.log) {
  const { owed, untriaged, judged } = noticeSlots(root, cfg, rows);
  const users = Object.keys(owed).sort();
  if (users.length) log('provider notices (not layer work; triage first, then a job per affected module):');
  for (const [k, us] of Object.entries(untriaged)) log(`- triage owed: ${k} (${us.length} modules): ${P3} notice triage ${k}`);
  const rerun = `; its merged job named it, answer not recorded: run merge <that job's PR> again`;
  for (const [u, n] of judged) log(`- ${u}: ${noticeLine(n)}; affected: ${n.triage.evidence.slice(0, 80)}${n.rerun ? rerun : ''}`);
  for (const u of users) for (const n of owed[u].filter((x) => !x.triage && x.rerun)) log(`- ${u}: ${noticeLine(n)}${rerun}`);
  return owed;
}

// Every provider notice slot (one notice, one user module) the state branch holds, each with what
// closes it, from the one reader (notice.mjs noticeRecords) that triage, status, layer close and
// report tranche all read (coordinator, 4 Nov). A slot is closed when answered, or when its notice
// was withdrawn; an open slot is exactly one of:
// - `triage`: not yet triaged; its act `notice triage <key>`;
// - `affected`: triage judged it affected; notice work, its act `job start <module>`;
// - `job`: its module's open job named it in its START; that job's merge answers it;
// - `rerun`: its merged job named it and the answer was not recorded; `merge <that PR>` again.
// owed, untriaged and judged are what owedNotices prints and nextWork reads.
export function noticeSlots(root, cfg, rows) {
  let recs = [];
  let tri = new Map();
  try { recs = noticeRecords(root, cfg.state_branch); tri = triageRows(root, cfg.state_branch); } catch { recs = []; }
  const unrecorded = {};
  const isOpen = new Set();
  const cache = new Map();
  const named = (u) => {
    // The job branch decides, while its attempt is open: not COMPLETE on the tranche, an open pull
    // request, or commits the tranche lacks. A merged attempt's start row names a notice only when
    // its answer was not written (the merge stands if that write fails): the notice is still owed,
    // and merge <n> run again records it (confirming review of PR 54).
    if (cache.has(u)) return cache.get(u);
    const row = rows.find((x) => x.id === u);
    let out = [];
    if (row?.branch) {
      const t = git(['show', `origin/${refOf(row)}:${metricsFile(u)}`], { cwd: root, allowFail: true });
      const keys = t.code === 0 ? jsonl(t.stdout).filter((x) => x.event === 'start').pop()?.notices || [] : [];
      const open = row.tranche !== 'COMPLETE' || !!row.pr?.startsWith('#') || row.ahead > 0;
      if (!open) unrecorded[u] = keys;
      else { out = keys; isOpen.add(u); }
    }
    cache.set(u, out);
    return out;
  };
  const owed = {};
  const untriaged = {};
  const slots = [];
  const withdrawn = [];
  for (const n of recs) {
    if (n.withdrawn) { withdrawn.push({ key: n.key, at: n.withdrawn.at, by: n.withdrawn.by, why: n.withdrawn.why, closed: n.open.length }); continue; }
    const { withdrawn: _w, ...live } = n;
    for (const u of n.open) {
      const row = rows.find((x) => x.id === u);
      const prN = String(row?.pr ?? '').match(/#(\d+)/)?.[1] || null;
      if (named(u).includes(n.key)) { slots.push({ key: n.key, user: u, kind: 'job', act: prN ? `${P3} merge ${prN} (job ${u}'s pull request; its START names the notice, its merge answers it)` : `job ${u} names it in its START; its merge answers it` }); continue; }
      const triage = tri.get(`${n.key}\0${u}`) || null;
      const rerun = !!unrecorded[u]?.includes(n.key);
      (owed[u] ||= []).push({ ...live, triage, rerun });
      if (rerun) slots.push({ key: n.key, user: u, kind: 'rerun', act: `${P3} merge ${prN || `<job ${u}'s PR>`} (again: its answer was not recorded)` });
      else if (triage) slots.push({ key: n.key, user: u, kind: 'affected', act: isOpen.has(u) ? `${P3} job start ${u} --live <n>, once its open job merges (that job's START does not name this notice)` : `${P3} job start ${u} --live <n>` });
      else { (untriaged[n.key] ||= []).push(u); slots.push({ key: n.key, user: u, kind: 'triage', act: `${P3} notice triage ${n.key}` }); }
    }
  }
  const judged = Object.keys(owed).sort().flatMap((u) => owed[u].filter((n) => n.triage).map((n) => [u, n]));
  return { owed, untriaged, judged, slots, withdrawn };
}

// open_by (process/config.json): "uses", the default, opens past the open layer each module
// whose providers are all done; "layer", the open layer's modules only (the old behaviour).
export function openBy(cfg) {
  const v = cfg.open_by ?? 'uses';
  if (!OPEN_BY.includes(v)) fail(`open_by ${JSON.stringify(v)} in process/config.json is not one of ${OPEN_BY.map((x) => `"${x}"`).join(', ')}`);
  return v;
}

// Dependency opening (open_by "uses"): the modules of the layers past the open one that are
// ready. Ready: every module its `uses` (modules_file) names is in the layer map and done, with
// no unmet marks, no open job and no provider notice triage judged it affected by (noticeWork). A module with no
// `uses` entry waits for its layer. gaps: each module past the open layer whose `uses` names a
// module the layer map lacks: not ready. The open layer is unchanged.
// A module owes notice work when triage judged it affected by a notice (or its merged job named
// one whose answer was not recorded). A notice not yet triaged holds nothing: membership:77,
// untriaged, held 90+ modules on the copy (coordinator, 4 Nov); triage answers it, or judges the
// module affected, and then it holds the modules that use it.
const noticeWork = (owed, id) => !!owed[id]?.some((n) => n.triage || n.rerun);
// A provider done: in the layer map, no open job, no found marks, no notice work, and no unmet marks
// or only those deferred when its layer was recorded closed, unless it is BLOCKED (coordinator, 5
// Nov: deferred marks do not hold the layer, so they do not hold its users forever either).
// A provider's job busy beyond what its entry says (its open pull request is m.open): flagged (an
// unfinished start, commits and no pull request), or offline, GitHub unread, with commits its
// branch holds that the tranche lacks or none counted (a shallow clone's --depth 1 tranche counts
// a merged branch ahead, so there the row cannot say). A BLOCKED one, deferred or not, holds nothing.
const busy = (r, shallow = false) => !!r && !r.blocked && r.flag !== 'BLOCKED' && (!!r.flag || !!r.unread || (/^unknown/.test(r.pr || '') && !shallow && !(r.ahead === 0)));
const doneIn = (ls, owed, shallow = false) => {
  const where = new Map(ls.layers.flatMap((L) => L.mods.map((m) => [m.id, { ...m, closed: L.recorded }])));
  // Not done either: a provider whose branch holds commits the tranche lacks (reopened, its pull
  // request open whatever the row's pr says, stale or unknown offline), or flagged.
  return (id) => { const m = where.get(id); return !!m && !m.open && !busy(m.row, shallow) && !m.found.length && !noticeWork(owed, id) && (!m.marks.length || (m.closed && !m.blocked)); };
};
// The open layer's modules, and entries BOB wrote and no job started, wait for their providers
// too, with open_by "uses" (copy, 5 Nov: agent-steps, layer 6, was reopened at 01:13 while
// agent-model and agent-harness, its uses in the same layer, were open): each of mods ({ id, file })
// with a provider in the layer map not yet COMPLETE (it starts itself) or whose job is open or busy.
// Unmet marks, found marks, notice work and a BLOCKED provider hold nothing, so no layer stalls on a
// provider only a close defers.
export function waitsOnUses(root, cfg, ls, ref, mods) {
  const modules = openBy(cfg) === 'uses' && ls ? readModules(root, cfg, ref) : null;
  const out = new Map();
  if (!modules) return out;
  const where = new Map(ls.layers.flatMap((L) => L.mods.map((m) => [m.id, m])));
  const shallow = isShallow(root);
  const holds = (p) => { const m = where.get(p); return !!m && !m.blocked && (m.open || busy(m.row, shallow)); };
  // A provider that uses the module back, directly or through others, holds nothing: a uses cycle
  // would hold both for good (the copy, 5 Nov: agent-drafts and agent-worker, layer 6).
  const usesOf = new Map(modules.filter((x) => x?.id && Array.isArray(x.uses)).map((x) => [x.id, x.uses]));
  const reaches = (from, to, seen = new Set()) => from === to || (!seen.has(from) && (seen.add(from), (usesOf.get(from) || []).some((x) => reaches(x, to, seen))));
  for (const m of mods) {
    const u = usesOf.get(m.id);
    const not = Array.isArray(u) ? u.filter((p) => p !== m.id && holds(p) && !reaches(p, m.id)) : [];
    if (not.length) out.set(m.file, not);
  }
  return out;
}
export function readyByUses(root, cfg, ls, ref, owed = {}) {
  const modules = openBy(cfg) === 'uses' && ls?.cur ? readModules(root, cfg, ref) : null;
  if (!modules) return { ready: [], gaps: [] };
  const uses = new Map(modules.filter((m) => m?.id && Array.isArray(m.uses)).map((m) => [m.id, m.uses]));
  const where = new Map(ls.layers.flatMap((L) => L.mods.map((m) => [m.id, m])));
  const done = doneIn(ls, owed, isShallow(root));
  const ready = [];
  const gaps = [];
  for (const L of ls.layers.filter((x) => x.n >= ls.cur.n && !x.closed)) {
    for (const m of L.mods) {
      const u = uses.get(m.id);
      if (!u) continue;
      const missing = u.filter((p) => !where.has(p));
      if (missing.length && L.n > ls.cur.n) gaps.push({ id: m.id, layer: L.n, missing });
      if (L.n > ls.cur.n && !missing.length && !jobOpen(m.row) && !m.blocked && u.every(done)) ready.push({ ...m, layer: L.n });
    }
  }
  return { ready, gaps };
}

// Found work (the route for work found elsewhere, found.mjs): each module with unmet found marks
// and no open job, not BLOCKED, ready by open_by whatever its layer. "uses": every provider its
// `uses` names is in the layer map and done (as readyByUses has it), or, with no `uses` entry,
// its layer is open or closed; "layer": its layer is open or closed. A module the layer map
// lacks (a found-work entry, FOUND_DIR/<id>.md, of a module with no requirement file) is ready
// when its `uses` are done or it has none. Without a layer map nextWork lists every file.
export function readyFound(root, cfg, ls, ref, owed = {}, rows = []) {
  if (!ls) return [];
  const by = openBy(cfg);
  const modules = by === 'uses' ? readModules(root, cfg, ref) || [] : [];
  const uses = new Map(modules.filter((m) => m?.id && Array.isArray(m.uses)).map((m) => [m.id, m.uses]));
  const where = new Map(ls.layers.flatMap((L) => L.mods.map((m) => [m.id, { ...m, layer: L.n }])));
  const done = doneIn(ls, owed, isShallow(root));
  const reached = (n) => !ls.cur || n <= ls.cur.n;
  const read = (f) => (ref ? (exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null) : existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : null);
  const ready = [];
  for (const m of where.values()) {
    if (!m.found.length || jobOpen(m.row) || m.blocked) continue;
    const u = uses.get(m.id);
    // A module with no requirement file: its found-work entry is the file listed.
    if (u ? u.filter((p) => p !== m.id).every(done) : reached(m.layer)) ready.push(read(m.file) === null ? { ...m, file: foundFile(m.id), entry: true } : m);
  }
  // Modules outside the layer map with a found-work entry of their own.
  for (const id of foundEntries(root, ref).filter((x) => !where.has(x))) {
    const ids = unmetIds(read(foundFile(id))).filter(isFound);
    const row = rows.find((r) => r.id === id);
    const u = uses.get(id) || [];
    if (ids.length && !jobOpen(row) && !row?.blocked && u.filter((p) => p !== id).every(done)) ready.push({ id, file: foundFile(id), layer: null, found: ids, marks: [], entry: true });
  }
  return ready;
}

// Debt: a requirement file whose unmet marks are all base-red found marks.
export function isDebt(text) {
  const line = new RegExp(UNMET.source);
  const u = (text || '').split('\n').filter((l) => line.test(l));
  return u.length > 0 && u.every((l) => /not yet met:[^)]*base-red/i.test(l));
}

// The release path as readiness knows it (nextWork's x.release), for modules whose job is open
// (the merge train's order, coordinator 5 Nov): process/config.json's release_path, and the open
// layer's modules and modules with found marks, unless their file is debt. Read offline at ref:
// the ledger there, with `open` the modules that have an open job pull request.
export function releaseModules(root, cfg, ref, open = new Set()) {
  const rel = new Set(Array.isArray(cfg.release_path) ? cfg.release_path : []);
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const rows = [];
  for (const text of Object.values(readLedgerTexts(root, ref))) {
    let e;
    try { e = JSON.parse(text); } catch { continue; }
    if (!e?.id) continue;
    const st = e.status?.state;
    rows.push({ id: e.id, tranche: st, req: e.requirements || `${dir}/${e.id}.md`, ...(open.has(e.id) ? { pr: '#0 ready' } : st === 'COMPLETE' ? { pr: 'merged' } : {}), ...(st === 'BLOCKED' && e.status.reason ? { blocked: e.status.reason } : {}) });
  }
  let closed = [];
  try { closed = closedRows(root, cfg); } catch { closed = []; }
  const ls = layerState(root, cfg, rows, ref, { closed });
  if (!ls) return rel;
  const text = (f) => (exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root, allowFail: true }).stdout : '');
  const cur = new Set((ls.cur?.mods || []).map((m) => m.id));
  for (const L of ls.layers) for (const m of L.mods) if ((cur.has(m.id) || m.found.length) && !isDebt(text(m.file))) rel.add(m.id);
  return rel;
}

// Next work (Build Plan, Phase 2): the modules of the open layer whose requirement file has unmet
// marks and that have no open job, fewest unmet first; none once the layer is ready to close (BOB's
// act is then `layer close <n>`). With open_by "uses", after them the modules past the open layer
// that readyByUses finds ready, fewest unmet first, each line with its layer. The deferred marks of closed layers are listed, not as work.
// Without a layer map, every requirement file with unmet marks. With live (the job sessions BOB
// counts), at most the job cap (jobCap) less them are listed; the list returned is all of them.
// Notice work apart: a module triage judged affected by a provider notice, whatever its layer (a
// provider change is not layer work), under its own heading; a notice not yet triaged is BOB's act
// `notice triage`, and none of its modules is listed. A notice module of the open layer with unmet
// marks stays in the layer's list, its one job answering both.
export function nextWork(root, cfg, rows, ref, { live, log = console.log, state, notices: owed = {} } = {}) {
  // An entry written on the tranche and never started (OPEN, no job branch, no pull request) has
  // no open job: it is next work, which `job start --ready` starts (copy, 4 Nov: four such
  // entries were listed nowhere, so each waited for BOB to remember it).
  // status marks it (unstarted) only when it read origin's branches and GitHub's pull requests,
  // or, offline, when the caller passed origin's job/* heads (readyCount's one ls-remote).
  const open = rows.filter(jobOpen);
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const taken = new Set(open.flatMap((r) => [r.req, `${dir}/${r.id}.md`]));
  const read = (f) => (ref ? (exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null) : existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : null);
  const ls = state === undefined ? layerState(root, cfg, rows, ref) : state;
  let files;
  let layer = null;
  const layerOf = new Map();
  // The cap debt (every requirement file over the cap in the open layer and the layers after it,
  // marks or none: 20 such files with no marks went unreported on the copy, 4 Nov).
  let ahead = [];
  // Found work, ready by open_by (readyFound); without a layer map, every found-work entry.
  let foundReady = [];
  if (ls) {
    layer = ls.cur?.n ?? null;
    for (const L of ls.layers) for (const m of L.mods) if (!layerOf.has(m.file)) layerOf.set(m.file, L.n);
    files = ls.ready || ls.pending ? [] : (ls.cur?.mods || []).map((m) => m.file);
    const held = waitsOnUses(root, cfg, ls, ref, ls.cur?.mods || []);
    for (const [f, ps] of held) if (files.includes(f)) log(`waits for its providers: ${f} uses ${ps.join(', ')}, not done`);
    files = files.filter((f) => !held.has(f));
    const byUses = readyByUses(root, cfg, ls, ref, owed);
    files.push(...byUses.ready.map((m) => m.file));
    foundReady = readyFound(root, cfg, ls, ref, owed, rows);
    for (const m of foundReady) if (m.entry && m.layer !== null) layerOf.set(m.file, m.layer);
    for (const g of byUses.gaps) log(`not ready, its uses not in ${cfg.layers_file}: ${g.id} (layer ${g.layer}) uses ${g.missing.join(', ')}`);
    ahead = ls.cur ? ls.layers.filter((L) => L.n >= ls.cur.n).flatMap((L) => L.mods.map((m) => m.file)) : [];
    // A layer closed with no `layer close` row: said once per layer, never silent (copy, 4 Nov).
    for (const L of ls.layers.filter((x) => x.closed && !x.recorded)) log(`layer ${L.n} closed: no unmet marks`);
    if (ls.deferred.length) {
      log('deferred at layer close (not work):');
      for (const d of ls.deferred) log(`- ${d.id} (layer ${d.layer}): ${d.count}`);
    }
    if (ls.ready) log(`layer ${layer} ready to close: ${READY_START} closes it, then starts the next layer's jobs (or ${P3} layer close ${layer})`);
    if (ls.pending) {
      log(`layer ${layer} ready to close once BOB closes these unmerged (never deleting the branch):`);
      for (const m of ls.owed) log(`- close PR #${m.pr} unmerged: ${m.blocked}`);
      log(`then: ${P3} layer close ${layer}`);
    }
  } else if (ref) {
    const r = git(['ls-tree', '--name-only', `${ref}:${dir}`], { cwd: root, allowFail: true });
    files = (r.code === 0 ? r.stdout.split('\n') : []).filter((x) => x.endsWith('.md') && x !== 'README.md').map((n) => `${dir}/${n}`);
    ahead = [...files];
    files.push(...foundEntries(root, ref).map(foundFile));
  } else {
    files = (existsSync(join(root, dir)) ? readdirSync(join(root, dir)) : []).filter((x) => x.endsWith('.md') && x !== 'README.md').map((n) => `${dir}/${n}`);
    ahead = [...files];
    files.push(...foundEntries(root, null).map(foundFile));
  }
  // Read whole (git show without allowFail drops the last newline): the cap counts every byte.
  const whole = (f) => (ref ? (exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root, allowFail: true }).stdout : null) : read(f));
  // A user module triage judged affected: notice work, whatever its layer or marks.
  const affected = Object.entries(owed).map(([u, ns]) => [u, ns.filter((n) => n.triage && !n.rerun)]).filter(([, ns]) => ns.length);
  const byFile = new Map(affected.map(([u, ns]) => [rows.find((r) => r.id === u)?.req || `${dir}/${u}.md`, ns]));
  const inLayer = new Set(files);
  const texts = new Map();
  const textOf = (f) => (texts.has(f) ? texts.get(f) : (texts.set(f, whole(f)), texts.get(f)));
  const foundBy = new Set(foundReady.map((m) => m.file));
  const after = new Set((ls?.layers || []).flatMap((L) => L.mods.filter((m) => m.after).map((m) => m.file)));
  // A found-work entry's module is taken while its job is open (taken holds its requirement file).
  const entryTaken = (f) => f.startsWith(`${FOUND_DIR}/`) && open.some((r) => foundFile(r.id) === f);
  // An OPEN entry BOB wrote and no job started: BOB's choice, startable whatever its layer or
  // uses (copy, 4 Nov: publication and case-authoring, entries merged 11:44:06, layer 8 with the
  // open layer 4 and providers with unmet marks, were listed nowhere and started 23 min later).
  const inLayer0 = new Set((ls?.cur?.mods || []).map((m) => m.file)); // the open layer's: held by its own rule above
  const enteredRows = rows.filter((r) => r.unstarted && r.tranche === 'OPEN').map((r) => ({ id: r.id, file: r.req || `${dir}/${r.id}.md` }));
  const enteredHeld = waitsOnUses(root, cfg, ls, ref, enteredRows.filter((r) => !inLayer0.has(r.file)));
  for (const [f, ps] of enteredHeld) log(`waits for its providers: ${f} (entered) uses ${ps.join(', ')}, not done`);
  const entered = new Set(enteredRows.map((r) => r.file).filter((f) => !enteredHeld.has(f) && !(inLayer0.has(f) && !files.includes(f))));
  const all = [...new Set([...files, ...byFile.keys(), ...foundBy, ...entered])].filter((f) => !taken.has(f) && !entryTaken(f)).map((file) => {
    const text = textOf(file);
    const ids = unmetIds(text);
    const fids = ids.filter(isFound);
    const row = rows.find((r) => r.req === file || `${dir}/${r.id}.md` === file);
    return { file, count: ids.length, over: overCap(cfg, file, text), ...(row ? { module: row.id, entry_state: row.tranche, ...(row.pr?.startsWith('#') || row.ahead > 0 || row.flag ? { attempt_open: true } : {}), ...(row.unread ? { unknown: true } : {}) } : {}), ...(fids.length ? { found: fids } : {}), ...(inLayer.has(file) && ids.length > fids.length ? { [after.has(file) ? 'after' : 'marks']: ids.filter((i) => !isFound(i)) } : {}), ...(byFile.has(file) ? { notices: byFile.get(file).map((n) => n.key) } : {}) };
  }).filter((x) => (inLayer.has(x.file) && x.count) || x.notices || (foundBy.has(x.file) && x.found) || (entered.has(x.file) && x.entry_state === 'OPEN' && x.count > 0));
  // The open layer's modules first, then those opened by uses; fewest unmet first within each.
  const later = (x) => (layer !== null && layerOf.has(x.file) && layerOf.get(x.file) !== layer ? 1 : 0);
  all.sort((a, b) => later(a) - later(b) || a.count - b.count || a.file.localeCompare(b.file));
  // Over the cap: BOB's act is the split or consolidation, listed apart, never as startable work.
  const big = all.filter((x) => x.over);
  for (const x of big) log(x.over);
  const debt = [...new Set(ahead)].map((f) => ({ f, t: textOf(f) })).filter((x) => overCap(cfg, x.f, x.t));
  if (debt.length) log(`cap debt: ${debt.length} requirement file${debt.length === 1 ? '' : 's'} over the cap${layer === null ? '' : ` from layer ${layer} on`}, ${debt.reduce((s, x) => s + Buffer.byteLength(x.t), 0)} bytes; each is split or consolidated before its job`);
  const layerWork = (x) => inLayer.has(x.file) && x.count > 0;
  const list = all.filter((x) => !x.over && layerWork(x));
  const foundList = all.filter((x) => !x.over && !layerWork(x) && foundBy.has(x.file) && x.found);
  const noticeList = all.filter((x) => !x.over && !layerWork(x) && !foundList.includes(x) && x.notices);
  // Entered by BOB and outside the other lists: listed apart, after them.
  const enteredList = all.filter((x) => !x.over && !layerWork(x) && !foundList.includes(x) && !x.notices && entered.has(x.file));
  // The release path first (coordinator, 5 Nov): process/config.json's release_path modules, and
  // the open round's layer and found work; debt (a file whose unmet marks are all base-red found
  // marks) after it, in the slots release work leaves free (ready.mjs startable).
  const rel = new Set(Array.isArray(cfg.release_path) ? cfg.release_path : []);
  for (const x of all) {
    if (isDebt(textOf(x.file))) x.debt = true;
    if (rel.has(x.module) || ((list.includes(x) || foundList.includes(x)) && !x.debt)) x.release = true;
  }
  // Read only with a count: layer close and the sweep's check list next work with none (review).
  const cap = live === undefined ? null : jobCap(cfg).cap;
  const n = live === undefined ? Infinity : Math.max(0, cap - live);
  const shown = list.slice(0, n);
  const shownN = noticeList.slice(0, Math.max(0, n - shown.length));
  const shownF = foundList.slice(0, Math.max(0, n - shown.length - shownN.length));
  const shownE = enteredList.slice(0, Math.max(0, n - shown.length - shownN.length - shownF.length));
  const tag = (x) => `${x.found ? `; found ${x.found.join(', ')}` : ''}${x.notices ? `; provider notice ${x.notices.join(', ')}` : ''}${x.entry_state === 'OPEN' ? `; entry OPEN, never started: ${P3} job start --ready` : ''}${x.after ? `; unmet after its job: ${x.after.join(', ')} (layer close defers them)` : ''}`;
  // Modules of the layers after the open one with unmet marks and no ledger entry (build
  // train-robust, item 7: 14 on the copy, 5 Nov, skipped silently, so no one saw they could never
  // start): each named, with its count, until BOB writes its entry. On the returned list as noEntry,
  // never as work (the idle-capacity line names them apart).
  const asWork = new Set([...list, ...noticeList, ...foundList, ...enteredList].map((x) => x.file));
  const noEntry = ls?.cur ? ls.layers.filter((L) => L.n > ls.cur.n).flatMap((L) => L.mods.filter((m) => !m.row && !asWork.has(m.file) && m.marks.length + m.found.length > 0)
    .map((m) => ({ id: m.id, file: m.file, layer: L.n, count: m.marks.length + m.found.length }))) : [];
  if (noEntry.length) {
    log(`no ledger entry: cannot start (${noEntry.length} module${noEntry.length === 1 ? '' : 's'} after the open layer with unmet marks; BOB writes each entry, or no job ever starts it):`);
    for (const m of noEntry) log(`- ${m.id} (layer ${m.layer}): no ledger entry: cannot start; ${m.count} unmet mark${m.count === 1 ? '' : 's'}`);
  }
  const waits = (a, b) => (live === undefined ? `all ${a.length} listed` : `${b.length} listed (jobs ${live} of ${cap}), ${a.length - b.length} wait`);
  if (list.length) {
    log(`next work${layer === null ? '' : `, layer ${layer}`} (${open.length} jobs open; BOB chooses from these, unmet requirements each): ${live === undefined ? `${waits(list, shown)}; pass --sessions <file> (or --live <the account's job sessions>) to list at most the job cap less them` : waits(list, shown)}`);
    for (const x of shown) log(`- ${x.file}: ${x.count}${layerOf.has(x.file) ? ` (layer ${layerOf.get(x.file)})` : ''}${tag(x)}`);
  }
  if (noticeList.length) {
    log(`notice work (triage judged these affected; not layer work; each job adapts or confirms the code and adds its test): ${waits(noticeList, shownN)}`);
    for (const x of shownN) log(`- ${x.file}: ${x.count}; provider notice ${x.notices.join(', ')}`);
  }
  if (foundList.length) {
    log(`found work (work found elsewhere, ready by open_by ${openBy(cfg)}, whatever its layer; each job meets its found marks and adds its test): ${waits(foundList, shownF)}`);
    for (const x of shownF) log(`- ${x.file}: ${x.count}${layerOf.has(x.file) ? ` (layer ${layerOf.get(x.file)})` : ''}${tag(x)}${x.file.startsWith(`${FOUND_DIR}/`) ? `; no requirement file: BOB gives the module its requirement file and ledger entry, moving these marks there, before its job` : ''}`);
  }
  if (enteredList.length) {
    log(`entered, never started (BOB wrote the entry; ready whatever its layer or uses): ${waits(enteredList, shownE)}`);
    for (const x of shownE) log(`- ${x.file}: ${x.count}${layerOf.has(x.file) ? ` (layer ${layerOf.get(x.file)})` : ''}${tag(x)}`);
  }
  // Findings that name no module (found.mjs): BOB's act is to name one.
  const loose = noModuleFound(root, ref);
  if (loose.length) {
    log(`found, no module (${NO_MODULE}; BOB's act: name its module with \`${P3} found <module> "<finding>" --from "<source>"\`, deleting its line here in the same pull request):`);
    for (const f of loose) log(`- ${f.id} (${f.source}): ${f.finding.slice(0, 100)}`);
  }
  // Triage owed: BOB's act (owedNotices printed it), counted as work for BOB (sweep passes the notices).
  const triage = [...new Set(Object.values(owed).flat().filter((x) => !x.triage && !x.rerun).map((x) => x.key))].map((key) => ({ triage: key }));
  // The completion round (PLN-4): once every layer is closed, the completion file's open items.
  const round = ls && !ls.cur ? completionWork(root, cfg, rows, ref, log) : [];
  // The returned list holds all of them: a split owed is still work for BOB (sweep counts it).
  const out = [...list, ...noticeList, ...foundList, ...enteredList, ...big, ...triage, ...round, ...loose.map((f) => ({ file: NO_MODULE, found_no_module: f.id }))];
  Object.defineProperty(out, 'noEntry', { value: noEntry, enumerable: false }); // read by name only: the list compares as before
  return out;
}

// The completion file's open items, not deferred: a module item through job start as usual (its
// requirement lines written first), unless its job is open; a whole-product item is BOB's act.
export function completionWork(root, cfg, rows, ref, log = console.log) {
  const c = completionItems(root, cfg, ref);
  if (!c) return [];
  if (c.missing) { log(`completion round: ${c.file} is not on ${ref || 'the working tree'}`); return [{ file: c.file, missing: true }]; }
  const open = openItems(c);
  if (!open.length) { log(`completion round: every item of ${c.file} done or deferred; the tranche can close: ${P3} tranche close`); return []; }
  const job = (id) => rows.find((r) => r.id === id && jobOpen(r));
  log(`next work, the completion round (${c.file}, ${open.length} open; done: tick its line; deferred: "deferred: <reason>" on its line):`);
  for (const x of open) log(x.malformed ? `- ${c.file}:${x.line}: not an item line (\`- [ ] <id> · <module or whole product> · <what>\`); fix it: ${x.what.slice(0, 100)}` : `- ${x.id} · ${x.target}: ${x.whole ? "BOB's act" : job(x.target) ? 'its job is open' : `${P3} job start ${x.target} --live <n>`}${x.what ? ` · ${x.what.slice(0, 100)}` : ''}`);
  return open.map((x) => ({ file: c.file, item: x.id, target: x.target }));
}

// The lanes with more than one live session (status, sweep): the recorded seat, the lane module's
// open job (rows: status's ledger rows), and, with list_sessions, the sessions not archived titled
// `lane <name>` or `job <module>`; each a defect line.
// Open as sessionActs judges a job open: not merged, and not deferred (BLOCKED, its pull request closed).
const laneJobOpen = (r) => !!r && !jobDone(r) && !(r.tranche === 'BLOCKED' && r.blocked && !String(r.pr || '').startsWith('#') && !/^WORKING/.test(String(r.branch || ''))) && (/^(OPEN|WORKING|BLOCKED)/.test(String(r.branch || '')) || String(r.pr || '').startsWith('#'));
export function laneDefects(cfg, seats, { rows = [], listed = null } = {}) {
  const out = [];
  let all = [];
  try { all = Array.isArray(cfg.lanes) ? lanes(cfg) : []; } catch { all = []; }
  for (const l of all) {
    const holders = new Set();
    const s = seats?.get(l.name);
    if (s) holders.add(s.session || `lane ${l.name} (pending)`);
    if (l.module && laneJobOpen(rows.find((r) => r.id === l.module))) holders.add(`job ${l.module}`);
    // The listed sessions: each `lane <name>` not archived, and the module's latest job session
    // (jobSession; an older one beside it after a restart is the sweep's leftover, not a second).
    const live = (listed || []).filter((y) => !isArchived(y));
    for (const x of live.filter((y) => String(y.title || '').trim() === `lane ${l.name}`)) {
      if (s && !s.session) holders.delete(`lane ${l.name} (pending)`);
      holders.add(sessionId(x));
    }
    const js = l.module ? jobSession(live, l.module) : null;
    if (js) { holders.delete(`job ${l.module}`); holders.add(sessionId(js)); }
    if (holders.size > 1) out.push(`defect: lane ${l.name} has ${holders.size} live sessions (${[...holders].join(', ')}): one session per lane at a time; end or archive all but one (lane end ${l.name} frees the lane's seat${l.module ? `; job ${l.module} ends as it completes` : ''})`);
  }
  return out;
}
