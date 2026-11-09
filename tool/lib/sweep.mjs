// The sweep and the watcher (SES-1, PLT-6, Foundations "Scheduled tasks around ROOT"). The tool
// cannot call Claude's session or task tools: sweep reads the record and prints what ROOT must do,
// in the Foundations' order, and writes the heartbeat; watch reads the heartbeat's age and ROOT's
// address and prints the watcher's decision. The session makes every call.
import { expireRecords, staleRecords } from './expire.mjs';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { P3, jobSender, wakeLine } from './job.mjs';
import { rowsAt } from './metrics.mjs';
import { readAddress, senderKnown, senderOf, wakeSteps } from './roles.mjs';
import { bobAddressed, bookkeep, fetchState, heldAct, heldWrites, jsonl, messages, messagesFile, onBookkeeping, readState, readStateWith, withCoordinator, writeState } from './state.mjs';
import { openPinMoves } from './pin.mjs';
import { bobAct, heldBy, layersAt, owe, paidUpTo, readOwed, slotsHeld, startsOwedLine } from './hold.mjs';
import { markLaneHeld } from './lane.mjs';
import { SILENT_HOURS, liveJobIds, laneDefects, permissionWaits, blockedJobs, capLine, holdLayers, flow, isArchived, layerState, nextWork, owedNotices, readSessions, refOf, sessionActs, sessionsCount, status } from './status.mjs';
import { Fail, Superseded, fail, git, jobCap, loadConfig, now, repoSlug } from './util.mjs';
import { flowRows, layerMergeLine, layerStartAct, needsSlot, readOpenLayer } from './layerflow.mjs';
import { roundLayerName } from './layerbase.mjs';
import { deploys, owedAt } from './deploy.mjs';
import { publishedJobs, slotNote, slotUse } from './slots.mjs';
import { openState } from './tranche.mjs';

export const HEARTBEAT_FILE = 'heartbeat.json';
// One row per sweep, appended next to the heartbeat (which each sweep overwrites): whether status
// listed acts for BOB (next work, or a job owed or blocked) and, if so, how long BOB had been quiet.
export const SWEEP_ROWS_FILE = 'metrics/sweep.jsonl';
export { SILENT_HOURS }; // BOB with no write, a WORKING job with no push
export const IDLE_HOURS = 1; // BOB with next work and no write: woken
export const WATCH_HOURS = 4; // the heartbeat's age at which the watcher takes over
export const FAR = 3; // "far over" a role's median: this many times it
const H = 36e5;
const hours = (ms) => Math.round(ms / H * 10) / 10;
const ct = (root, args) => Number(git(['log', '-1', '--format=%ct', ...args], { cwd: root, allowFail: true }).stdout.trim()) * 1000 || 0;
const median = (xs) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[(s.length - 1) >> 1] : null; };
const checkSession = (id, what = '--session') => (typeof id === 'string' && /^session_[A-Za-z0-9]+$/.test(id) ? id : fail(`${what} <this session's id> (session_...)`));

export function readHeartbeat(root, sb) {
  const t = readState(root, sb, HEARTBEAT_FILE);
  try { return t ? JSON.parse(t) : null; } catch { return null; }
}

// The prompt of ROOT's hourly sweep task, bound to ROOT's own session.
// approvals: the hash of the tranche tip's approvals when the task is made (tipApprovals).
export function sweepTask(session, tranche = 'tranche', approvals) {
  checkSession(session);
  const prompt = `Sweep. First run ${wakeSteps(tranche, approvals)}; if it says the approvals changed, tell Bob by push notification and take no further step. Then save list_sessions (every session of the last day, archived ones included) as JSON and run \`${P3} sweep --session ${session} --sessions <that file> --context <the percent of the window get_session on yourself shows>\` and do only what it prints, each act its own command. Create nothing else, merge nothing, edit no task but this one's prompt as your ROOT prompt allows, archive only what it prints.`;
  return { prompt, call: { name: 'sweep', cron_expression: '0 * * * *', prompt } };
}

// --attempt "<who>:<role>:<minutes>:<usd>", as the session record gives them: those far over
// the role's median from the measured rows on the tranche ("unmeasured" when no row has one).
function overMedian(root, ref, attempts) {
  const rows = rowsAt(root, ref).filter((r) => r.row === 'attempt' && r.event === 'measured');
  const out = [];
  for (const a of attempts) {
    const [who, role, min, usd] = String(a).split(':');
    if (!who || !role) fail(`--attempt "<who>:<role>:<minutes>:<usd>", not ${JSON.stringify(a)}`);
    const mine = rows.filter((r) => (r.role || 'job') === role);
    for (const [k, v, unit] of [['minutes', Number(min), 'min'], ['cost_usd', Number(usd), 'USD']]) {
      const m = median(mine.map((r) => Number(r[k])));
      if (m && Number.isFinite(v) && v > FAR * m) out.push(`${who}: ${v} ${unit}, over ${FAR}x the ${role} median ${m}`);
    }
  }
  return out;
}

// Idle capacity (Bob, 5 Nov 01:24: Process3 must watch whether capacity is used; the coordinator's
// measurement: cap use about 48% over a day; a spoken "about 6 at most" held BOB
// near 6 of 20 for 6 hours and nothing alarmed). Live job sessions under the cap less the slots
// held, with the open layer's startable jobs for IDLE_MIN.work minutes, or no startable work while
// under half the cap and BOB owes the act that frees work, for IDLE_MIN.empty: an alarm, each
// empty slot with its reason. null when neither holds.
export const IDLE_MIN = { work: 15, empty: 30 };
// Since when an idle of this kind has run: the last judged row's, when it saw the same kind; else
// the latest it could have begun. Not carried: never before the last sweep (review of PR 139).
function idleSince(kind, { prev, freed, t }) {
  const p = prev?.idle_capacity;
  const since = Math.min(t, p?.kind === kind && Date.parse(p.since) ? Date.parse(p.since) : Math.max(freed || t, Date.parse(prev?.at) || 0));
  return { since, min: Math.floor((t - since) / 6e4) };
}
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
// The empty slots are counted against the open layer's startable jobs (`layer jobs <n>`: view,
// layerflow.mjs openLayer's read), less those a live hold names; other layers' holds say nothing here.
export function layerIdle({ live, cap, holds = [], view, layers = new Map(), prev, freed, t = Date.now() }) {
  const held = slotsHeld(holds);
  const open = view?.kind === 'open';
  // The open layer's own starts first, then its early starts into the next layer (R14): idle capacity.
  // An additive retest (`layer retest`) runs in CI with no job session: it fills no slot, so it is
  // no idle capacity's work (C25).
  const st = open ? [...view.startable, ...(view.early || [])].filter(needsSlot) : [];
  const inWork = st.map((j) => ({ j, h: heldBy(holds, j.id, layers) })).filter((x) => x.h);
  const go = st.filter((j) => !inWork.some((x) => x.j === j));
  const n = go.length;
  // No startable work is idle only when BOB has an act that frees work: the layer can merge, or
  // the next layer is not open. Every listed job working (or held) is the layer's own wait.
  const owedAct = (open && view.ready) || view?.kind === 'next';
  const kind = n > 0 && live < cap - held ? 'work' : n === 0 && owedAct && live < cap / 2 ? 'empty' : null;
  if (!kind) return null;
  const { since, min } = idleSince(kind, { prev, freed, t });
  const empty = Math.max(0, cap - held - live);
  const k = Math.min(n, empty);
  const why = [];
  // The layer's own starts first, then its early starts (R14), as the fill takes them.
  const own = go.filter((j) => !(view.early || []).includes(j)).length;
  // The jobs that fill the empty slots, named (C25: on the copy's layer 11 BOB read "(after X)" as
  // a wait and left slots empty 20-108 min; only a recorded hold waits, and a start before a
  // provider lands is an early start, R10): the first k, in the list's order.
  const fill = go.slice(0, k).map((j) => j.id);
  if (Math.min(k, own)) why.push(`${Math.min(k, own)} x startable from ${view.direct ? `${P3} direct jobs` : `${P3} layer jobs ${view.n}`}, not started (start now: ${fill.slice(0, Math.min(k, own)).join(', ')}; one listed after a provider in flight starts now with its plain job start, no --early: R10${go.slice(0, Math.min(k, own)).some((j) => j.join) ? '; one listed as a layer join joins first (PD-14)' : ''}; only a recorded hold waits)`);
  if (k > own) why.push(`${k - own} x early starts into layer ${view.early_next} listed by ${P3} layer jobs ${view.n}, not started (${fill.slice(own).join(', ')})`);
  for (const y of inWork.slice(0, empty - k)) why.push(`${y.j.id}: held by ${y.h.id} (by ${y.h.by}): ${y.h.why}`);
  const rest = empty - k - Math.min(inWork.length, empty - k);
  if (rest > 0) {
    const nm = view?.direct ? `the direct flow (round ${view.round})` : view?.round ? roundLayerName(view.round, view.of, view.n) : `layer ${view?.n}`;
    const where = open ? (view.ready ? `${nm} can merge (${P3} layer merge ${view.n})` : `${nm} lists no job to start`) : view?.kind === 'next' ? `${nm} is next and not open (${P3} ${view.round ? 'round next --apply' : `layer open ${view.n}`})` : 'no open layer';
    why.push(`${rest} x no startable work: ${where}`);
  }
  return { kind, since: iso(since), min, live, cap, held, startable: n, empty, alarm: min >= IDLE_MIN[kind], ...(open ? { layer: view.n } : {}), ...(fill.length ? { fill } : {}), reasons: why };
}
// The job starts recorded since a time (at or after it: a start in the measurement's second is not
// in its count): the start rows of the open layer and of the next (its early starts), each written
// once, after the job's push landed (job.mjs), so a refused start counts nothing (cold review of
// C25: the early rows are written at the cut, before a start can still be refused). A restart on a
// fresh branch replaces a session the measurement may already count: not a new one.
export function startsSince(root, sb, view, at) {
  const t = Date.parse(at);
  if (!view || !Number.isFinite(t)) return 0;
  const count = (n) => (n !== undefined && n !== null ? flowRows(root, sb, n).starts.filter((r) => Date.parse(r.at) >= t && !r.restart).length : 0);
  return count(view.n) + (view.early_next !== view.n ? count(view.early_next) : 0);
}
// The modules with a live job session as the record knows them (cold review of C26): the ones the
// measuring sweep row saw (job_ids, with list_sessions) and those started since. A row without
// job_ids (a sweep given --live alone) knows none: nothing is subtracted, the safe side for an alarm.
export function knownJobIds(root, sb, view, m) {
  if (!m || !Array.isArray(m.job_ids)) return new Set();
  const t = Date.parse(m.live_measured_at || m.at);
  const since = (n) => (n !== undefined && n !== null && Number.isFinite(t) ? flowRows(root, sb, n).starts.filter((r) => Date.parse(r.at) >= t).map((r) => r.module) : []);
  return new Set([...m.job_ids, ...(view ? [...since(view.n), ...(view.early_next !== view.n ? since(view.early_next) : [])] : [])]);
}
// Between sweeps (coordinator, 5 Nov: a scheduled task runs at most hourly, measured): every p3
// command any role runs, before its act, evaluates idle capacity when the last sweep row is
// CHECK_MIN old (read from the local ref first: no fetch while it is fresh), on the live count the
// last sweep measured within LIVE_MIN (none: no judgment, the cap being the
// account's), and records a 'check' row beside the sweep's, once per CHECK_MIN whatever sessions
// race (re-read in the worktree). Only the run whose row lands prints: on an alarm the wake of BOB
// (BOB itself: its act) and the line for the coordinator. Not in GitHub Actions, which cannot write
// the state branch. The hourly sweep stays the backstop.
export const CHECK_MIN = 5;
export const LIVE_MIN = 65;
const lastRow = (text) => jsonl(text).at(-1);
const fresh = (row, t) => t - (Date.parse(row?.at) || 0) < CHECK_MIN * 6e4;
// The row an idle continues from: the last that judged on a measured count (sweep or check).
export const judged = (rows) => [...rows].reverse().find((r) => ['sweep', 'check'].includes(r.row) && Number.isInteger(r.live));
onBookkeeping('check', (dir, { path, row }) => {
  const p = join(dir, path);
  if (fresh(lastRow(existsSync(p) ? readFileSync(p, 'utf8') : ''), Date.parse(row.at))) return;
  mkdirSync(dirname(p), { recursive: true });
  appendFileSync(p, JSON.stringify(row) + '\n');
});
export function idleCheck(root, cfg, { by, from = 'bob', t = Date.now(), read = status, readView = readOpenLayer, io, log = console.log } = {}) {
  const sb = cfg.state_branch;
  if (cfg.plan === 'pause' || cfg.plan === 'stop') return null;
  // The clone's own check not yet pushed counts (C18: its row rides the next real write).
  if (fresh(lastRow(readStateWith(root, sb, SWEEP_ROWS_FILE)), t) || !fetchState(root, sb)) return null;
  cfg = withCoordinator(root, cfg);
  const rows = jsonl(readStateWith(root, sb, SWEEP_ROWS_FILE));
  if (fresh(rows.at(-1), t)) return null;
  const m = [...rows].reverse().find((r) => r.row === 'sweep' && Number.isInteger(r.live));
  const measured = m && t - Date.parse(m.at) < LIVE_MIN * 6e4 ? m.live : null;
  let live = measured;
  let since = 0;
  let ic = null;
  let count = null;
  let unread = null;
  let view = null;
  let use = null;
  if (live !== null) {
    // The holds and the tranche open from the record, offline; the open layer's startable jobs from
    // one read of GitHub's pull requests into it. Unread: no count and no judgment, said in the row.
    const out = read(root, { role: 'bob', offline: true, ...(io ? { io } : {}), log: () => {} });
    if (out.open?.state === 'open') {
      try {
        view = readView(root, cfg, { io: io || {} });
        // The sweep's count, and every job started since it measured (C25: on the copy's layer 11
        // the checks from 16:18 to 16:50 judged 16 slots empty on the 15:53 sweep's live 4 while BOB
        // started about 20 jobs): an upper bound, so a slot a start filled is never called empty.
        // An end frees a slot only when the next sweep measures it: a landed job's session holds its
        // slot until it is archived (the cap counts unarchived sessions), so a land is no end. Accepted:
        // after a burst of starts, slots that ends free are seen at the next sweep, within the hour.
        since = startsSince(root, cfg.state_branch, view, m.live_measured_at || m.at);
        live = measured + since;
        const holds = out.holds || [];
        const layers = holds.some((h) => h.live && h.kind === 'layer') ? layersAt(root, cfg) : new Map();
        // PD-7: the published jobs whose gate is not red hold no slot (slots.mjs).
        use = slotUse(live, publishedJobs(view, { slug: io?.slug || repoSlug(root), ...(io?.gate ? { gate: io.gate } : {}) }), { jobIds: knownJobIds(root, sb, view, m) });
        ic = layerIdle({ live: use.working, cap: jobCap(cfg).cap, holds, view, layers, prev: judged(rows), freed: ct(root, [`origin/${cfg.tranche}`]), t });
        // One count, the idle check's: the jobs that take a slot, early starts included, less those held.
        count = ic ? ic.startable : view.kind === 'open' ? [...view.startable, ...(view.early || [])].filter(needsSlot).filter((j) => !heldBy(holds, j.id, layers)).length : 0;
      } catch (e) { if (!(e instanceof Fail)) throw e; unread = 'layer'; }
    }
  }
  const { reasons = [], ...rec } = ic || {};
  const row = { at: new Date(t).toISOString().replace(/\.\d+Z$/, 'Z'), row: 'check', by, live: live ?? 'unmeasured', ...(m ? { live_at: m.at } : {}), ...(since ? { live_measured: measured, started_since: since } : {}), ...(use && (use.free.length || use.resumed.length) ? { slots_working: use.working, published_free: use.free.length, ...(use.resumed.length ? { resumed: use.resumed } : {}) } : {}), job_cap: jobCap(cfg).cap, startable: count, ...(unread ? { unread } : {}), ...(ic ? { idle_capacity: rec } : {}) };
  // An ok row is bookkeeping (C18): it never pushes on its own; it rides the command's or the
  // clone's next real write, left out there if another session's row landed within CHECK_MIN. An
  // alarm is a real write, as before: only the session whose row lands prints it, wakes BOB and
  // tells the coordinator, never every session at once (cold review of C18).
  if (!ic?.alarm) { try { bookkeep(root, sb, 'idle check: ok', 'check', { path: SWEEP_ROWS_FILE, row }); } catch (e) { if (!(e instanceof Fail)) throw e; return null; } return row; }
  const LOST = new Superseded('another check landed first');
  try {
    writeState(root, sb, 'idle check: IDLE CAPACITY', (dir) => {
      const p = join(dir, SWEEP_ROWS_FILE);
      if (fresh(lastRow(existsSync(p) ? readFileSync(p, 'utf8') : ''), t)) throw LOST;
      mkdirSync(join(dir, 'metrics'), { recursive: true });
      appendFileSync(p, JSON.stringify(row) + '\n');
    });
  } catch (e) { if (!(e instanceof Fail)) throw e; return null; }
  if (ic?.alarm) {
    const line = `IDLE CAPACITY: ${ic.live} job sessions ${use && (use.free.length || use.resumed.length) ? `working toward publish (${live} live; ${slotNote(use)})` : 'live'}${since ? ` (${measured} measured at ${m.at}, ${since} started since)` : ''} of the cap ${ic.cap}${ic.held ? ` less ${ic.held} held` : ''}, ${ic.startable} startable, for ${ic.min} min; ${reasons.join('; ')}`;
    log(line);
    const act = layerStartAct(view);
    log(wakeLine(`${line}: run ${act}`, from) || `next act: ${act}`);
    log(`and tell the coordinator: ${cfg.coordinator ? `send_message to ${cfg.coordinator}` : 'no coordinator in process/config.json: tell Bob by push notification'} with "${line}"`);
  }
  return row;
}

// p3.mjs main, before every command in a product: the idle check, the wake naming the act's
// sender (a job's job-<id>). Not before the sweep, which answers an idle itself.
export const JOB_ACTS = ['job complete', 'block', 'test', 'job sync'];
// A pin move's commands (pin.mjs's steps): the pin session's, never BOB's.
export const PIN_ACTS = ['setup check', 'pin check'];
export function senderFor(root, name, a) {
  if (JOB_ACTS.includes(name) && a._[0]) return jobSender(String(a._[0]));
  if (name === 'status' && a.role === 'job' && typeof a.module === 'string') return jobSender(a.module);
  if (name === 'send' && /^job-/.test(String(a.from))) return String(a.from);
  try { return senderOf(root, a.as); } catch { return 'bob'; }
}
export function beforeAct(root, cfg, name, a, { env = process.env, io, log = console.log, err = console.error } = {}) {
  // Starts owed first for BOB's acts (status prints its own): a marker, never a refusal. Not in a
  // product with no BOB addressed (C27: process3-probes' pin moves printed it), where no one owes them,
  // nor to another role acting with --as (a pin session's merge --as pin: not BOB's act; cold review).
  if (bobAct(name, a) && name !== 'status' && (a.as === undefined || a.as === 'bob')) { try { if (fetchState(root, cfg.state_branch)) { const o = readOwed(root, cfg.state_branch); if (o && bobAddressed(root, cfg.state_branch, { fetch: false }) !== false) log(startsOwedLine(o)); } } catch { /* a marker, never a refusal */ } }
  if (env.GITHUB_ACTIONS || name === 'sweep' || name === 'switch') return null;
  // BOB's commands alone (coordinator on C50, 9 Nov: "The idle check is BOB's alone"; before, any
  // sender but a job's, so a pin session's setup check ran it, taken for BOB by default, at the cost
  // of a status read of the whole open layer). A pin move's commands are never BOB's, and a sender
  // not known is not taken for BOB: the check is skipped. Skipping is safe: it prints a nudge and
  // writes its row, and gates nothing (idleCheck refuses no act; no command reads its answer).
  const from = senderFor(root, name, a);
  if (/^job-/.test(String(from))) return null;
  if (PIN_ACTS.includes(name) || a.as === 'pin') return null;
  if (senderKnown(root, a.as) !== 'bob') return null;
  try { return idleCheck(root, cfg, { by: name, from: 'bob', io, log }); } catch (e) { err(`idle check not run: ${e.message}`); return null; }
}

export function sweep(root, { session, live, sessions: sessionsFile, context, attempts = [], offline = false, io, log = console.log } = {}) {
  checkSession(session);
  // ROOT's context (P2-G10): the share of its window ROOT's own session record shows (get_session on itself).
  const pct = context === undefined ? 'unmeasured' : Number(String(context).replace(/%$/, ''));
  if (context === true || (pct !== 'unmeasured' && !(Number.isFinite(pct) && pct >= 0 && pct <= 100))) fail(`--context <percent of the window your session record shows>, 0 to 100, not ${JSON.stringify(context)}`);
  let cfg = loadConfig(root);
  const sb = cfg.state_branch;
  if (!offline) fetchState(root, sb);
  cfg = withCoordinator(root, cfg);
  const addr = readAddress(root, { fetch: false });
  if (addr.root?.session !== session) {
    log(`step 0: the ROOT address is ${addr.root?.session || 'none'}, not this session: end the turn and do nothing else.`);
    return { act: 'end' };
  }
  const found = [];
  const todo = [];
  const owed = [];
  // --sessions <file>: list_sessions saved; the job count is read from it when --live is not given.
  if (sessionsFile === true) fail('--sessions <file>: your list_sessions result, saved as JSON');
  const listed = sessionsFile === undefined ? null : readSessions(sessionsFile, { root, offline });
  live = sessionsCount(listed, live, log);
  let idle = { bob_acts: 'unmeasured', bob_quiet_h: null };
  let archived = false; // no BOB, or a paused plan: not read
  // The account's job count and the cap go in the sweep row (live, job_cap, and with --sessions the
  // account's sessions, every product and role, so a platform limit would show): lead times names a full cap as a wait's cause.
  let liveRow = {};
  let overCap = null;
  if (live !== undefined) {
    const n = Number(live);
    if (live === true || !Number.isInteger(n) || n < 0) fail(`--live <n>, the account's job sessions you count, not ${JSON.stringify(live)}`);
    const c = capLine(cfg, n, listed);
    const cap = c.cap;
    if (c.note) found.push(c.note);
    found.push(c.line);
    // With list_sessions, the modules whose job sessions it saw: the idle check and job start --sessions
    // subtract only a published job with a live session (cold review of C26).
    liveRow = { live: n, live_measured_at: now(), job_cap: cap, ...(listed ? { sessions: listed.filter((x) => !isArchived(x)).length, job_ids: [...liveJobIds(listed)].sort() } : {}) };
    // Over the cap: judged on the jobs working toward publish once the open layer is read below (PD-7:
    // published jobs keep their sessions), on every live one when it is not.
    if (n > cap) { overCap = { n, cap, at: owed.length }; owed.push(`${n} job sessions, over the job cap of ${cap}: archive finished ones before starting more`); }
  }
  const plan = cfg.plan;
  let nothingToStart = false;
  if (plan === 'pause' || plan === 'stop') {
    found.push(`plan ${plan}`, ...owed);
    owed.length = 0; // heartbeat only
  } else {
    const { rows, sessions, holds = [], seats = new Map() } = status(root, { offline, log: () => {}, ...(io ? { io } : {}) });
    const tranche = `origin/${cfg.tranche}`;
    const t = Date.now();
    // Step 2: hand over BOB flagged REFRESH, or woken over two hours ago with no write to the
    // record (its address, the tranche's tip, its messages or handoff) since. A wake is a message
    // from root to bob; the first since BOB's last write is the one outstanding.
    const bob = addr.bob;
    let startAct = layerStartAct(null);
    if (!bob) { found.push('no BOB addressed'); todo.push(`start BOB: ${P3} start bob`); } else {
      const last = Math.max(Date.parse(bob.at) || 0, ct(root, [tranche]), ct(root, [`refs/remotes/origin/${sb}`, '--', 'messages/bob.jsonl', 'handoff/bob.md']));
      const refresh = sessions.some((s) => s.session === bob.session && s.refresh);
      const wake = Math.min(...messages(readState(root, sb, messagesFile('root'))).filter((m) => m.to === 'bob').map((m) => Date.parse(m.at)).filter((x) => x > last));
      // BOB's idle time: acts listed for it (next work, or a job owed or blocked) while it is quiet.
      // A layer ready to close, or one owed a close once BOB closes its deferred PRs, is BOB's act
      // too (coordinator, 4 Nov: nextWork lists nothing then, so a BOB that missed the wake slept).
      // A bad config value (open_by) is a finding; the sweep carries on to the heartbeat.
      let next = false;
      // The open layer read once: its startable jobs, its merge, or the next layer to open are BOB's acts.
      let view = null;
      if (!offline) { try { view = readOpenLayer(root, cfg, { io: io || {} }); } catch (e) { if (!(e instanceof Fail)) throw e; found.push(`layer flow: unread (${e.message})`); } }
      startAct = layerStartAct(view);
      // Nothing to start (the open layer lists none, or every layer merged): the starts owed are paid.
      nothingToStart = (view?.kind === 'open' && !view.startable.length) || view?.kind === 'done';
      try {
        const ls = layerState(root, cfg, rows, tranche);
        const mergeLine = layerMergeLine(view);
        if (mergeLine) found.push(mergeLine);
        // The round-close run owed and not run (the act that closed the round could not run it), or,
        // after a clean internal walk, the release path (BD-R1): BOB's first act, and the sweep wakes
        // BOB for it (Bob, 7 Nov: required, tool-started).
        // Unread, it is a finding, and next work is still read (cold review of C23).
        if (deploys(cfg)) {
          try {
            if (openState(root, cfg).state === 'open') {
              const o = owedAt(root, cfg, { ls, ref: tranche });
              if (o.owed) owed.push(`the round-close run is owed (${o.owed}): ${o.act}, first`);
              // A named gap BOB cannot act on is reported, not a wake each sweep: the coordinator brings it to Bob.
              else if (o.release) (o.release.gap ? found : owed).push(`the release path is next (${o.release.why}): ${o.release.act}, first`);
            }
          } catch (e) { if (!(e instanceof Fail)) throw e; found.push(`round-close run: unread (${String(e.message).split('\n')[0].slice(0, 120)})`); }
        }
        const work = nextWork(root, cfg, rows, tranche, { log: () => {}, state: ls, notices: owedNotices(root, cfg, rows, () => {}) });
        markLaneHeld(cfg, seats, work);
        // Layer mode: the open layer's jobs or merge, or the next layer to open; unread (offline),
        // unmet work still wakes BOB, its act then status's.
        // With the layer read: its jobs, its merge or the next layer's open; every layer merged, no
        // layer map, or unread: next work (found, notice and entered work) is BOB's act.
        next = view && ['open', 'next'].includes(view.kind) ? (view.kind === 'open' && (view.startable.length > 0 || view.ready || view.early?.length > 0)) || view.kind === 'next' : work.some((x) => !x.after && !x.owed_layer); // unmet after its job, or owed to a later layer: no act
        // The flow's numbers in the sweep row (coordinator, 5 Nov): starvation and ruling waits measured.
        // PD-7: the open layer's published jobs hold no slot unless their gate went red (slots.mjs).
        const use = slotUse(liveRow.live, view && !offline && liveRow.live !== undefined ? publishedJobs(view, { slug: io?.slug || repoSlug(root), ...(io?.gate ? { gate: io.gate } : {}) }) : [], { jobIds: listed ? liveJobIds(listed) : null });
        // The over-cap line, judged again on the jobs working toward publish (PD-7), in its place.
        if (overCap && (use.free.length || use.resumed.length || use.unread.length)) {
          if (use.working > overCap.cap) owed[overCap.at] = `${use.working} job sessions working toward publish, over the job cap of ${overCap.cap} (${overCap.n} live; ${slotNote(use)}): archive finished ones before starting more`;
          else owed.splice(overCap.at, 1);
        }
        const f = flow(cfg, rows, work, liveRow.live, listed, holds, { view, use });
        if (use.free.length || use.resumed.length) liveRow = { ...liveRow, slots_working: use.working, published_free: use.free.length, ...(use.resumed.length ? { resumed: use.resumed } : {}) };
        liveRow = { ...liveRow, startable: f.startable, blocked: f.blocked, blocked_oldest_min: f.blocked_oldest_min, ...(listed ? { working: f.working, waiting: f.waiting } : {}) };
        if (liveRow.live !== undefined) {
          // Since when: the last sweep's, when it saw the same idle; else the latest the record shows
          // it could have begun, the tranche's tip or a job session's archive.
          const freed = Math.max(ct(root, [tranche]), ...(listed || []).filter((x) => isArchived(x) && /^job \S+/.test(String(x.title || '').trim())).map((x) => Date.parse(x.updated_at) || 0));
          const ic = view ? layerIdle({ live: use.working, cap: jobCap(cfg).cap, holds, view, layers: holds.some((h) => h.live && h.kind === 'layer') ? layersAt(root, cfg) : new Map(), prev: judged(jsonl(readState(root, sb, SWEEP_ROWS_FILE))), freed, t }) : null;
          if (ic) {
            const { reasons, ...rec } = ic;
            liveRow.idle_capacity = rec;
            if (ic.alarm) {
              const line = `IDLE CAPACITY: ${ic.live} job sessions ${use.free.length || use.resumed.length ? `working toward publish (${liveRow.live} live; ${slotNote(use)})` : 'live'}${listed ? ` (sessions running ${f.working}, waiting ${f.waiting})` : ''} of the cap ${ic.cap}${ic.held ? ` less ${ic.held} held` : ''}, ${ic.startable} startable, for ${ic.min} min; ${ic.empty} empty slot${ic.empty === 1 ? '' : 's'}: ${reasons.join('; ')}`;
              found.push(line);
              owed.push(`IDLE CAPACITY, ${ic.empty} slots empty, ${ic.startable} startable: run ${startAct} first; only a recorded hold (p3 hold) keeps a slot empty`);
              todo.push(`IDLE CAPACITY to the coordinator: ${cfg.coordinator ? `send_message to ${cfg.coordinator}` : 'no coordinator in process/config.json: tell Bob by push notification'} with "${line}"`);
            }
          }
        }
      } catch (e) {
        if (!(e instanceof Fail)) throw e;
        found.push(`config: ${e.message}`);
      }
      const acts = next || rows.some((r) => r.tranche === 'BLOCKED' || (r.ready && r.gate === 'success') || (r.flag && !r.flag.startsWith('WORKING')));
      idle = { bob_acts: acts, bob_quiet_h: acts ? hours(t - last) : null };
      if (refresh || t - wake > SILENT_HOURS * H) {
        found.push(`BOB ${bob.session} ${refresh ? 'flagged REFRESH' : `silent ${hours(t - last)}h, ${hours(t - wake)}h after a wake`}`);
        todo.push(`handover: ${P3} handover begin, and its steps`);
      } else if (!Number.isFinite(wake)) {
        // Step 3 for BOB: silent over two hours, or next work while no job is open or after an hour with no write: wake it.
        const noJob = !rows.some((r) => r.tranche !== 'COMPLETE');
        if (t - last > SILENT_HOURS * H) owed.push(`BOB ${bob.session} silent ${hours(t - last)}h`);
        else if (next && (noJob || t - last > IDLE_HOURS * H)) owed.push(`BOB ${bob.session} idle ${hours(t - last)}h with next work: run ${startAct}`);
      }
    }
    // Step 3: stalled or blocked jobs, and attempts far over their role's median.
    // Past targets.decision_minutes a ruling is owed: a technical one reaches the coordinator from ROOT.
    let waits = new Map();
    try { waits = new Map(blockedJobs(cfg, rows, t, holds, holdLayers(root, cfg, holds)).map((b) => [b.id, b])); } catch (e) { if (!(e instanceof Fail)) throw e; found.push(`config: ${e.message}`); }
    for (const b of waits.values()) if (b.by && b.by !== 'Bob') todo.push(`ruling owed: send_message to ${b.by}: job ${b.id}${b.text}`);
    for (const r of rows) {
      // Under a live hold: shown held, never owed (the hold is the ruling's record).
      if (r.flag === 'BLOCKED' || r.tranche === 'BLOCKED') (waits.get(r.id)?.held ? found : owed).push(`${r.id}: BLOCKED${waits.get(r.id)?.text ?? ''}`);
      else if (r.flag === 'WORKING, nothing pushed') {
        const age = t - ct(root, [`origin/${refOf(r)}`]);
        if (age > SILENT_HOURS * H) owed.push(`${r.id}: WORKING, nothing pushed for ${hours(age)}h`);
      } else if (r.flag?.startsWith('WORKING, no push for')) {
        owed.push(`${r.id}: WORKING, no push for ${hours(t - ct(root, [`origin/${refOf(r)}`]))}h`);
      }
    }
    owed.push(...overMedian(root, tranche, attempts));
    // One session per lane (lane.mjs): a lane with more than one live session is a defect.
    found.push(...laneDefects(cfg, seats, { rows, listed }));
    // The session list kept clean (Bob, 4 Nov): leftovers archived, orphaned questions passed on.
    if (listed) {
      let pinOpen = null;
      if (!offline && listed.some((x) => /^pin move\b/.test(String(x.title || '').trim()) && !isArchived(x))) { try { pinOpen = (io?.pins || openPinMoves)(repoSlug(root)).length > 0; } catch { pinOpen = null; } }
      const s = sessionActs(listed, { rows, roles: addr, coordinator: cfg.coordinator, pinOpen, seats });
      found.push(s.line);
      // A process session waiting on a permission prompt (C15): named, with its act.
      for (const w of permissionWaits(listed, { roles: addr, coordinator: cfg.coordinator, seats, jobs: new Set(rows.map((r) => r.id)) })) todo.push(w.line);
      // A job session archived since the last sweep freed a slot: starts owed (hold.mjs).
      const since = Date.parse(jsonl(readState(root, sb, SWEEP_ROWS_FILE)).filter((r) => r.row === 'sweep').at(-1)?.at) || 0;
      archived = listed.some((x) => isArchived(x) && /^job \S+/.test(String(x.title || '').trim()) && Date.parse(x.updated_at) > since);
      for (const a of s.acts) todo.push(a.act === 'archive' ? `archive ${a.id}: archive_session ${a.id} ("${a.title}", idle, its work done or its parent archived)` : `tell ${a.owner} ${a.id} asks: ${a.question} (send it to ${a.owner}${a.owner.startsWith('session_') ? ' with send_message' : ''}, naming ${a.id} "${a.title}", whose parent is archived)`);
    }
  }
  // Stale records (R13, expire.mjs): the tool ends those it can (holds whose condition is met,
  // lane seats whose session is archived, read from list_sessions here); the rest are found, each
  // with what ends it. Nothing for a person to type.
  if (cfg) {
    try {
      const ended = expireRecords(root, cfg, { listed, log: () => {} });
      if (ended.holds.length) found.push(`holds ended by the tool (condition met): ${ended.holds.join(', ')}`);
      if (ended.seats.length) found.push(`lane seats ended by the tool (session archived): ${ended.seats.join(', ')}`);
      const left = staleRecords(root, cfg, { listed }).filter((x) => !x.auto);
      for (const x of left) found.push(`stale ${x.kind} ${x.id}: ${x.why}`);
    } catch (e) { found.push(`stale records: unread (${String(e.message).split('\n')[0].slice(0, 120)})`); }
  }
  if (owed.length) {
    found.push(...owed);
    const text = `Sweep: ${owed.join('; ')}.`;
    todo.push(`wake BOB with one message: ${P3} send bob ${JSON.stringify(text)} --from root, deliver it with send_message, then ${P3} send delivered <n> --from root`);
  }
  // Step 4: the heartbeat line.
  // Held state writes are an act of the sweep's (R17c, item F).
  { const h = heldWrites(root); if (h.length) todo.push(heldAct(h)); }
  const beat = { at: now(), session, found: found.length ? found : ['nothing'], done: todo.length ? todo.map((x) => x.split(':')[0]) : ['heartbeat only'] };
  const { tip } = writeState(root, sb, `heartbeat: ${beat.found.join('; ').slice(0, 60)}`, (dir) => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, HEARTBEAT_FILE), JSON.stringify(beat) + '\n');
    mkdirSync(join(dir, 'metrics'), { recursive: true });
    appendFileSync(join(dir, SWEEP_ROWS_FILE), JSON.stringify({ at: beat.at, row: 'sweep', session, ...idle, root_context: pct, ...liveRow }) + '\n');
    if (archived) owe(dir, 'a job session archived');
    if (nothingToStart) paidUpTo(dir, beat.at);
  });
  log(`found: ${beat.found.join('; ')}`);
  log(todo.length ? `do, each its own command:\n${todo.map((x, i) => `${i + 1}. ${x}`).join('\n')}` : 'nothing to do');
  log(`heartbeat written to ${sb}:${HEARTBEAT_FILE} at ${tip.slice(0, 10)}; then end the turn`);
  return { act: todo.length ? 'act' : 'heartbeat', found: beat.found, todo, tip };
}

// watch --session <the watcher's id> [--full | --escalated <minutes>]: take over as ROOT when ROOT
// is full (the session read ROOT's record and passes --full), when a message to ROOT has gone
// unanswered for targets.decision_minutes (--escalated, the escalation chain; coordinator, 4 Nov), or
// when its heartbeat is older than four hours; otherwise end.
export function watch(root, { session, full = false, escalated, offline = false, log = console.log } = {}) {
  checkSession(session);
  const cfg = loadConfig(root);
  const sb = cfg.state_branch;
  let late = null, wait = null;
  if (escalated !== undefined) {
    wait = Number(cfg.targets.decision_minutes);
    if (!Number.isFinite(wait) || wait <= 0) fail(`targets.decision_minutes ${JSON.stringify(cfg.targets.decision_minutes)} in process/config.json is not a positive number`);
    const m = Number(escalated);
    if (escalated === true || escalated === '' || !Number.isFinite(m) || m < 0) fail(`--escalated takes the minutes the message to ROOT has gone unanswered; not ${JSON.stringify(escalated)}`);
    late = m;
  }
  if (!offline) fetchState(root, sb);
  const rootId = readAddress(root, { fetch: false }).root?.session;
  if (!rootId) { log(`end: no ROOT is addressed; starting the first ROOT is Bob's${late !== null ? '; tell Bob by push notification, with the escalation' : ''}`); return { act: 'end' }; }
  if (rootId === session) { log('end: you are ROOT; your sweep runs here'); return { act: 'end' }; }
  const hb = readHeartbeat(root, sb);
  const age = hb ? Date.now() - Date.parse(hb.at) : Infinity;
  const due = late !== null && late >= wait;
  // An escalation not yet due never holds back a takeover that is due anyway (full, or a stale heartbeat).
  if (late !== null && !due && !full && age <= WATCH_HOURS * H) { log(`end: the escalation is ${late} of ${wait} minutes old; ROOT keeps it until then, then run watch again`); return { act: 'end', age }; }
  if (!full && !due && age <= WATCH_HOURS * H) { log(`end: ROOT ${rootId} swept ${hours(age)}h ago`); return { act: 'end', age }; }
  const why = full ? `ROOT ${rootId} is full` : due ? `ROOT ${rootId} left a message unanswered ${late} min, past ${wait}` : hb ? `ROOT ${rootId}'s heartbeat is ${hours(age)}h old` : `ROOT ${rootId} has no heartbeat`;
  log(`take over: ${why}. Each its own command:
1. ${P3} start record root ${session}
2. ${P3} sweep task --session ${session}, then create_trigger bound to this session with what it prints
3. tell Bob by push notification: "${why}; watcher ${session} is now ROOT."
4. from now you are ROOT: ${P3} start root prints your acts`);
  return { act: 'take over', why };
}
