// The sweep and the watcher (SES-1, PLT-6, Foundations "Scheduled tasks around ROOT"). The tool
// cannot call Claude's session or task tools: sweep reads the record and prints what ROOT must do,
// in the Foundations' order, and writes the heartbeat; watch reads the heartbeat's age and ROOT's
// address and prints the watcher's decision. The session makes every call.
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { P3, READY_START } from './job.mjs';
import { rowsAt } from './metrics.mjs';
import { readAddress, wakeSteps } from './roles.mjs';
import { fetchState, messages, messagesFile, readState, writeState } from './state.mjs';
import { openPinMoves } from './pin.mjs';
import { SILENT_HOURS, capLine, isArchived, layerState, nextWork, owedNotices, readSessions, refOf, sessionActs, sessionsCount, status } from './status.mjs';
import { Fail, fail, git, loadConfig, now, repoSlug } from './util.mjs';

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

export function sweep(root, { session, live, sessions: sessionsFile, context, attempts = [], offline = false, io, log = console.log } = {}) {
  checkSession(session);
  // ROOT's context (P2-G10): the share of its window ROOT's own session record shows (get_session on itself).
  const pct = context === undefined ? 'unmeasured' : Number(String(context).replace(/%$/, ''));
  if (context === true || (pct !== 'unmeasured' && !(Number.isFinite(pct) && pct >= 0 && pct <= 100))) fail(`--context <percent of the window your session record shows>, 0 to 100, not ${JSON.stringify(context)}`);
  const cfg = loadConfig(root);
  const sb = cfg.state_branch;
  if (!offline) fetchState(root, sb);
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
  const listed = sessionsFile === undefined ? null : readSessions(sessionsFile);
  live = sessionsCount(listed, live, log);
  let idle = { bob_acts: 'unmeasured', bob_quiet_h: null }; // no BOB, or a paused plan: not read
  // The account's job count and the cap go in the sweep row (live, job_cap, and with --sessions the
  // account's sessions, every product and role, so a platform limit would show): lead times names a full cap as a wait's cause.
  let liveRow = {};
  if (live !== undefined) {
    const n = Number(live);
    if (live === true || !Number.isInteger(n) || n < 0) fail(`--live <n>, the account's job sessions you count, not ${JSON.stringify(live)}`);
    const c = capLine(cfg, n, listed);
    const cap = c.cap;
    if (c.note) found.push(c.note);
    found.push(c.line);
    liveRow = { live: n, job_cap: cap, ...(listed ? { sessions: listed.filter((x) => !isArchived(x)).length } : {}) };
    if (n > cap) owed.push(`${n} job sessions, over the job cap of ${cap}: archive finished ones before starting more`);
  }
  const plan = cfg.plan;
  if (plan === 'pause' || plan === 'stop') {
    found.push(`plan ${plan}`, ...owed);
    owed.length = 0; // heartbeat only
  } else {
    const { rows, sessions } = status(root, { offline, log: () => {}, ...(io ? { io } : {}) });
    const tranche = `origin/${cfg.tranche}`;
    const t = Date.now();
    // Step 2: hand over BOB flagged REFRESH, or woken over two hours ago with no write to the
    // record (its address, the tranche's tip, its messages or handoff) since. A wake is a message
    // from root to bob; the first since BOB's last write is the one outstanding.
    const bob = addr.bob;
    if (!bob) { found.push('no BOB addressed'); todo.push(`start BOB: ${P3} start bob`); } else {
      const last = Math.max(Date.parse(bob.at) || 0, ct(root, [tranche]), ct(root, [`refs/remotes/origin/${sb}`, '--', 'messages/bob.jsonl', 'handoff/bob.md']));
      const refresh = sessions.some((s) => s.session === bob.session && s.refresh);
      const wake = Math.min(...messages(readState(root, sb, messagesFile('root'))).filter((m) => m.to === 'bob').map((m) => Date.parse(m.at)).filter((x) => x > last));
      // BOB's idle time: acts listed for it (next work, or a job owed or blocked) while it is quiet.
      // A layer ready to close, or one owed a close once BOB closes its deferred PRs, is BOB's act
      // too (coordinator, 4 Nov: nextWork lists nothing then, so a BOB that missed the wake slept).
      // A bad config value (open_by) is a finding; the sweep carries on to the heartbeat.
      let next = false;
      try {
        const ls = layerState(root, cfg, rows, tranche);
        if (ls?.ready || ls?.pending) found.push(`layer ${ls.cur.n} ${ls.ready ? 'ready to close' : 'owed a close'}`);
        next = !!(ls?.ready || ls?.pending) || nextWork(root, cfg, rows, tranche, { log: () => {}, state: ls, notices: owedNotices(root, cfg, rows, () => {}) }).length > 0;
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
        else if (next && (noJob || t - last > IDLE_HOURS * H)) owed.push(`BOB ${bob.session} idle ${hours(t - last)}h with next work: run ${READY_START}`);
      }
    }
    // Step 3: stalled or blocked jobs, and attempts far over their role's median.
    for (const r of rows) {
      if (r.flag === 'BLOCKED' || r.tranche === 'BLOCKED') owed.push(`${r.id}: BLOCKED`);
      else if (r.flag === 'WORKING, nothing pushed') {
        const age = t - ct(root, [`origin/${refOf(r)}`]);
        if (age > SILENT_HOURS * H) owed.push(`${r.id}: WORKING, nothing pushed for ${hours(age)}h`);
      } else if (r.flag?.startsWith('WORKING, no push for')) {
        owed.push(`${r.id}: WORKING, no push for ${hours(t - ct(root, [`origin/${refOf(r)}`]))}h`);
      }
    }
    owed.push(...overMedian(root, tranche, attempts));
    // The session list kept clean (Bob, 4 Nov): leftovers archived, orphaned questions passed on.
    if (listed) {
      let pinOpen = null;
      if (!offline && listed.some((x) => /^pin move\b/.test(String(x.title || '').trim()) && !isArchived(x))) { try { pinOpen = (io?.pins || openPinMoves)(repoSlug(root)).length > 0; } catch { pinOpen = null; } }
      const s = sessionActs(listed, { rows, roles: addr, coordinator: cfg.coordinator, pinOpen });
      found.push(s.line);
      for (const a of s.acts) todo.push(a.act === 'archive' ? `archive ${a.id}: archive_session ${a.id} ("${a.title}", idle, its work done or its parent archived)` : `tell ${a.owner} ${a.id} asks: ${a.question} (send it to ${a.owner}${a.owner.startsWith('session_') ? ' with send_message' : ''}, naming ${a.id} "${a.title}", whose parent is archived)`);
    }
  }
  if (owed.length) {
    found.push(...owed);
    const text = `Sweep: ${owed.join('; ')}.`;
    todo.push(`wake BOB with one message: ${P3} send bob ${JSON.stringify(text)} --from root, deliver it with send_message, then ${P3} send delivered <n> --from root`);
  }
  // Step 4: the heartbeat line.
  const beat = { at: now(), session, found: found.length ? found : ['nothing'], done: todo.length ? todo.map((x) => x.split(':')[0]) : ['heartbeat only'] };
  const { tip } = writeState(root, sb, `heartbeat: ${beat.found.join('; ').slice(0, 60)}`, (dir) => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, HEARTBEAT_FILE), JSON.stringify(beat) + '\n');
    mkdirSync(join(dir, 'metrics'), { recursive: true });
    appendFileSync(join(dir, SWEEP_ROWS_FILE), JSON.stringify({ at: beat.at, row: 'sweep', session, ...idle, root_context: pct, ...liveRow }) + '\n');
  });
  log(`found: ${beat.found.join('; ')}`);
  log(todo.length ? `do, each its own command:\n${todo.map((x, i) => `${i + 1}. ${x}`).join('\n')}` : 'nothing to do');
  log(`heartbeat written to ${sb}:${HEARTBEAT_FILE} at ${tip.slice(0, 10)}; then end the turn`);
  return { act: todo.length ? 'act' : 'heartbeat', found: beat.found, todo, tip };
}

// watch --session <the watcher's id> [--full | --escalated <minutes>]: take over as ROOT when ROOT
// is full (the session read ROOT's record and passes --full), when a message to ROOT has gone
// unanswered for targets.decision_minutes (--escalated, the escalation chain; Bob, 4 Nov), or
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
