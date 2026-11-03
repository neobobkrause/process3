// The sweep and the watcher (SES-1, PLT-6, Foundations "Scheduled tasks around ROOT"). The tool
// cannot call Claude's session or task tools: sweep reads the record and prints what ROOT must do,
// in the Foundations' order, and writes the heartbeat; watch reads the heartbeat's age and ROOT's
// address and prints the watcher's decision. The session makes every call.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { P3 } from './job.mjs';
import { rowsAt } from './metrics.mjs';
import { readAddress } from './roles.mjs';
import { fetchState, readState, writeState } from './state.mjs';
import { status } from './status.mjs';
import { fail, git, loadConfig, now } from './util.mjs';

export const HEARTBEAT_FILE = 'heartbeat.json';
export const SILENT_HOURS = 2; // BOB with no write, a WORKING job with nothing pushed
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
export function sweepTask(session) {
  checkSession(session);
  const prompt = `Sweep. First run \`git fetch origin tranche\`, then \`git checkout -q --detach FETCH_HEAD\`, then \`git submodule update --init .process\` (a fresh container may hold an old checkout and has it empty). Then run \`${P3} sweep --session ${session} --live <the live sessions you count with list_sessions>\` and do only what it prints, each act its own command. Create nothing else, merge nothing, edit no task, archive nothing.`;
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

export function sweep(root, { session, live, attempts = [], offline = false, io, log = console.log } = {}) {
  checkSession(session);
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
  const cap = cfg.live_cap;
  if (live !== undefined) {
    const n = Number(live);
    if (live === true || !Number.isInteger(n) || n < 0) fail(`--live <n>, the live sessions you count, not ${JSON.stringify(live)}`);
    found.push(`live ${n} of ${cap}`);
    if (n > cap) owed.push(`${n} live sessions, over the cap of ${cap}: archive finished ones before starting more`);
  }
  const plan = cfg.plan;
  if (plan === 'pause' || plan === 'stop') {
    found.push(`plan ${plan}`, ...owed);
    owed.length = 0; // heartbeat only
  } else {
    const { rows, sessions } = status(root, { offline, log: () => {}, ...(io ? { io } : {}) });
    const tranche = `origin/${cfg.tranche}`;
    const t = Date.now();
    // Step 2: BOB flagged REFRESH, or no write to the record in over two hours.
    const bob = addr.bob;
    if (!bob) { found.push('no BOB addressed'); todo.push(`start BOB: ${P3} start bob`); } else {
      const last = Math.max(Date.parse(bob.at) || 0, ct(root, [tranche]), ct(root, [`refs/remotes/origin/${sb}`, '--', 'messages/bob.jsonl', 'handoff/bob.md']));
      const refresh = sessions.some((s) => s.session === bob.session && s.refresh);
      const quiet = t - last > SILENT_HOURS * H;
      if (refresh || quiet) {
        found.push(`BOB ${bob.session} ${refresh ? 'flagged REFRESH' : `silent ${hours(t - last)}h`}`);
        todo.push(`handover: ${P3} handover begin, and its steps`);
      }
    }
    // Step 3: stalled or blocked jobs, and attempts far over their role's median.
    for (const r of rows) {
      if (r.flag === 'BLOCKED' || r.tranche === 'BLOCKED') owed.push(`${r.id}: BLOCKED`);
      else if (r.flag === 'WORKING, nothing pushed') {
        const age = t - ct(root, [`origin/job/${r.id}`]);
        if (age > SILENT_HOURS * H) owed.push(`${r.id}: WORKING, nothing pushed for ${hours(age)}h`);
      }
    }
    owed.push(...overMedian(root, tranche, attempts));
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
  });
  log(`found: ${beat.found.join('; ')}`);
  log(todo.length ? `do, each its own command:\n${todo.map((x, i) => `${i + 1}. ${x}`).join('\n')}` : 'nothing to do');
  log(`heartbeat written to ${sb}:${HEARTBEAT_FILE} at ${tip.slice(0, 10)}; then end the turn`);
  return { act: todo.length ? 'act' : 'heartbeat', found: beat.found, todo, tip };
}

// watch --session <the watcher's id> [--full]: take over as ROOT when ROOT is full (the session
// read ROOT's record and passes --full) or its heartbeat is older than four hours; otherwise end.
export function watch(root, { session, full = false, offline = false, log = console.log } = {}) {
  checkSession(session);
  const sb = loadConfig(root).state_branch;
  if (!offline) fetchState(root, sb);
  const rootId = readAddress(root, { fetch: false }).root?.session;
  if (!rootId) { log('end: no ROOT is addressed; starting the first ROOT is Bob\'s'); return { act: 'end' }; }
  if (rootId === session) { log('end: you are ROOT; your sweep runs here'); return { act: 'end' }; }
  const hb = readHeartbeat(root, sb);
  const age = hb ? Date.now() - Date.parse(hb.at) : Infinity;
  if (!full && age <= WATCH_HOURS * H) { log(`end: ROOT ${rootId} swept ${hours(age)}h ago`); return { act: 'end', age }; }
  const why = full ? `ROOT ${rootId} is full` : hb ? `ROOT ${rootId}'s heartbeat is ${hours(age)}h old` : `ROOT ${rootId} has no heartbeat`;
  log(`take over: ${why}. Each its own command:
1. ${P3} start record root ${session}
2. ${P3} sweep task --session ${session}, then create_trigger bound to this session with what it prints
3. tell Bob by push notification: "${why}; watcher ${session} is now ROOT."
4. from now you are ROOT: ${P3} start root prints your acts`);
  return { act: 'take over', why };
}
