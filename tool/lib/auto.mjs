// The starter (Bob, 5 Nov: "Why do you have to order BOB to start jobs? Why aren't they being
// started without you ordering it?"). Until now a start happened only when BOB decided in a turn
// to run job start --ready and then made the create_session calls it printed; the idle check
// recorded starts owed and alarmed, and started nothing (copy, 5 Nov 16:36: 4 of 20 job sessions,
// starts owed since 15:38).
//
// The holder is the MERGER. It is the one role always awake: it watches its train's output and
// makes, mechanically, the calls the train prints, and it has no judgment work for a start to wait
// behind (BOB restarts, orients, reviews and rules). ROOT's sweep already replaces a silent MERGER
// (its lease). `p3 auto start --session <the MERGER's id>` runs beside the train, in the
// background, from a second clone of its own (job start moves its checkout to the tranche's tip;
// the train's clone is the train's): a loop that, whenever starts are owed (a land, a job
// complete, a block, a layer close, a hold ended, an archive the sweep saw), a live hold has
// expired, or AUTO.every minutes have passed, asks the MERGER for list_sessions, runs job start
// --ready's pass itself, and prints one AUTO-START block of calls: archive_session for idle
// sessions of merged jobs the cap needs, create_session for each launch, and a message to BOB
// naming the pull requests to subscribe to. Nothing in it needs a judgment, and it refuses
// nothing a ready start needs: BOB keeps only held, blocked, unentered and over-cap work.
//
// The measure: minutes from the starts owed to each job session seen created (its created_at in
// list_sessions, or `auto done`), in metrics/starts.jsonl; status prints it (startsMeasure).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { AUTO, AUTO_FILE, STARTS_FILE, readAuto, readHolds, readOwed, starterLive } from './hold.mjs';
import { P3, toolPin } from './job.mjs';
import { startReady } from './ready.mjs';
import { readAddress } from './roles.mjs';
import { approvalsHash } from './start.mjs';
import { fetchState, jsonl, readState, send, writeState } from './state.mjs';
import { readSessions, sessionId } from './status.mjs';
import { openState } from './tranche.mjs';
import { Fail, fail, git, loadConfig, now } from './util.mjs';

export const AUTO_USAGE = 'auto start --session <the MERGER\'s session id> | auto done <pass> --created <module>=<session id>...';
// Exit codes of the inner loop (--here): the pin moved (the launcher re-anchors and runs it again),
// the approvals changed (the launcher stops: the MERGER tells ROOT).
export const EXIT = { pin: 3, approvals: 4 };
export const STARTER_MARK = 'p3-starter';
const SESSIONS_FILE = 'p3-auto-sessions.json';
const MIN = 6e4;
const sleepMs = (ms) => { if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };
const mins = (a, b) => Math.round((b - a) / MIN * 10) / 10;
const gitPath = (root, name) => resolve(root, git(['rev-parse', '--git-path', name], { cwd: root }));
const title = (x) => String(x?.title || '').trim();
const createdAt = (x) => Date.parse(x?.created_at || '') || null;

// Why a pass is due now, or null. Starts owed; a live hold that expired since the last pass; no
// pass for AUTO.every minutes (an archive BOB made, a gate gone green: nothing writes owed for
// them); never sooner than AUTO.gap after the last pass or an unanswered ask.
export function due({ owed, auto, holds = [], t = Date.now(), quietUntil = 0 }) {
  if (t < quietUntil) return null;
  const last = Date.parse(auto?.at) || 0;
  if (last && t - last < AUTO.gap * MIN) return null;
  if (owed?.since) return `starts owed since ${owed.since}`;
  const expired = holds.find((h) => !h.ended && Date.parse(h.until) > last && Date.parse(h.until) <= t);
  if (expired) return `${expired.id} (${expired.scope}) expired`;
  if (t - last >= AUTO.every * MIN) return last ? `no pass for ${Math.round((t - last) / MIN)} min` : 'the first pass';
  return null;
}

// The pending launches against the sessions listed: those whose job session is listed, created no
// earlier than a minute before the launch was printed, are created; the rest still pending.
export function reconcile(pending = [], listed = []) {
  const created = [];
  const still = [];
  for (const p of pending) {
    const s = listed.find((x) => title(x) === `job ${p.id}` && (createdAt(x) ?? Infinity) >= Date.parse(p.at) - MIN);
    if (s) created.push({ ...p, session: sessionId(s), created_at: new Date(createdAt(s) || Date.now()).toISOString().replace(/\.\d+Z$/, 'Z') });
    else still.push(p);
  }
  return { created, still };
}
const createdRow = (p, pass) => ({ at: p.created_at, row: 'created', pass: p.pass ?? pass, id: p.id, session: p.session, printed_at: p.at, ...(p.owed_since ? { owed_since: p.owed_since, min: mins(Date.parse(p.owed_since), Date.parse(p.created_at)) } : {}) });

// The block of calls the MERGER makes, in order; nothing in it is a judgment.
export function actsBlock({ pass, why, archive = [], launches = [], again = [], doneCmd }) {
  const L = [`AUTO-START pass ${pass} (${why}): make these calls now, in order, each its own call; none needs a judgment`];
  let k = 0;
  for (const a of archive) L.push(`${++k}. archive_session ${a.session} (job ${a.job}: merged; its idle session holds a slot)`);
  for (const l of [...again.map((x) => ({ ...x, again: true })), ...launches]) L.push(`${++k}. create_session for job ${l.id}${l.again ? ` (printed at ${l.at} and no session titled "job ${l.id}" is listed since: make it now)` : ''}:`, JSON.stringify(l.launch, null, 2));
  const made = [...again, ...launches];
  if (made.length) L.push(`then: ${doneCmd} ${pass} ${made.map((l) => `--created ${l.id}=<its new session id>`).join(' ')}`);
  return L;
}

// One pass. Returns null when none was due, else what it did.
export function autoPass(root, ctx) {
  const { cfg, log, session } = ctx;
  const sb = cfg.state_branch;
  const t = Date.now();
  if (!fetchState(root, sb, { fresh: true })) { log('the state branch is unread: the starter tries again'); return null; }
  const owed = readOwed(root, sb);
  const auto = readAuto(root, sb);
  let holds = [];
  try { holds = readHolds(root, sb, { offline: true, t }); } catch { holds = []; }
  // Another starter running (a replaced MERGER's, its pass recent): this one waits.
  if (auto?.session && auto.session !== session && starterLive(auto, t)) { log(`another starter, ${auto.session}'s, passed at ${auto.at}: this one waits for its pass to lapse (${AUTO.live} min)`); ctx.quietUntil = t + AUTO.gap * MIN; return null; }
  const why = due({ owed, auto, holds, t, quietUntil: ctx.quietUntil });
  if (!why) return null;
  // The tranche's tip: its approvals as at the start, its pin the one running.
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root });
  const tip = `refs/remotes/origin/${cfg.tranche}`;
  if (approvalsHash(root, tip) !== ctx.approvals) throw Object.assign(new Fail(`the approvals on ${cfg.tranche} changed since the starter started: it stops; tell ROOT`), { exit: EXIT.approvals });
  const pin = git(['ls-tree', tip, '--', '.process'], { cwd: root }).split(/\s+/)[2] || null;
  if (pin && pin !== ctx.pin()) throw Object.assign(new Fail(`the pin moved to ${pin.slice(0, 10)}: the starter re-anchors its clone and runs again`), { exit: EXIT.pin });
  const tcfg = loadConfig(root, tip);
  if (tcfg.plan === 'pause' || tcfg.plan === 'stop') { if (ctx.said !== tcfg.plan) log(`plan ${tcfg.plan}: the starter starts nothing`); ctx.said = tcfg.plan; ctx.quietUntil = t + AUTO.gap * MIN; return null; }
  const o = ctx.open(root, tcfg);
  if (o.state !== 'open') { if (ctx.said !== o.state) log(`tranche open: ${o.state}; the starter starts nothing until it passes`); ctx.said = o.state; ctx.quietUntil = t + AUTO.gap * MIN; return null; }
  ctx.said = null;
  // list_sessions, fresh: the cap's count and the launches' sessions.
  const file = ctx.sessionsFile;
  const asked = Date.now();
  log(`AUTO SESSIONS ${file}: ${why}. Call list_sessions now (limit 100, and again with after_id <last_id> while has_more) and save every page's sessions as one JSON list to ${file}; this pass waits ${AUTO.sessionsWait} min for it`);
  if (!ctx.waitFor(file, asked)) {
    log(`AUTO SESSIONS: nothing saved to ${file} within ${AUTO.sessionsWait} min; asked again in ${AUTO.gap} min`);
    ctx.quietUntil = Date.now() + AUTO.gap * MIN;
    return { asked: true, saved: false };
  }
  let listed;
  try { listed = readSessions(file, { root }); } catch (e) {
    if (!(e instanceof Fail)) throw e;
    log(`AUTO SESSIONS refused: ${e.message}`);
    ctx.quietUntil = Date.now() + AUTO.gap * MIN;
    return { asked: true, saved: true, refused: e.message };
  }
  const pass = (auto?.pass || 0) + 1;
  const { created, still } = reconcile(auto?.pending, listed);
  for (const c of created) log(`job ${c.id}: its session ${c.session} was created (${c.owed_since ? `${mins(Date.parse(c.owed_since), Date.parse(c.created_at))} min after its starts were owed` : 'no starts owed'})`);
  const again = still.filter((p) => t - Date.parse(p.at) >= AUTO.reprint * MIN);
  // Its launches and subscriptions are the block's (below), not printed twice.
  const narrative = (l) => { if (!/^(start the job session with create_session:|then subscribe to the job's pull request)/.test(l)) log(l); };
  const r = ctx.ready(root, { sessions: file, auto: true, owedSince: owed?.since || null, log: narrative });
  const launches = (r.started || []).filter((s) => s.launch).map((s) => ({ id: s.id, at: now(), pass, launch: s.launch, pr: s.subscribe?.pullNumber ?? null, ...(owed?.since ? { owed_since: owed.since } : {}) }));
  const archive = r.archive || [];
  const pending = [...still.map((p) => (again.includes(p) ? { ...p, at: now(), pass } : p)), ...launches];
  const row = { at: now(), row: 'pass', pass, session, why, owed_since: owed?.since || null, started: launches.map((x) => x.id), again: again.map((x) => x.id), archive: archive.map((x) => x.session), failed: (r.failed || []).map((x) => x.id), waiting: r.waiting || [], ...(r.refused ? { refused: r.refused } : {}) };
  try {
    writeState(root, sb, `starter: pass ${pass}, ${launches.length} started`, (wt) => {
      mkdirSync(join(wt, dirname(AUTO_FILE)), { recursive: true });
      writeFileSync(join(wt, AUTO_FILE), JSON.stringify({ session, at: row.at, pass, pending }, null, 2) + '\n');
      mkdirSync(join(wt, dirname(STARTS_FILE)), { recursive: true });
      appendRows(join(wt, STARTS_FILE), [...created.map((c) => createdRow(c, pass)), row]);
    });
  } catch (e) { if (!(e instanceof Fail)) throw e; log(`the starter's pass ${pass} was not recorded (${e.message.split('\n')[0]}); its calls below stand`); }
  if (launches.length || again.length || archive.length) for (const l of actsBlock({ pass, why, archive, launches, again, doneCmd: `${P3} auto done` })) log(l);
  // BOB keeps the pull requests' events (review, a red gate): one message naming them.
  const prs = launches.filter((x) => x.pr);
  if (prs.length) {
    const text = `the starter started ${prs.map((x) => `job ${x.id} (PR ${x.pr})`).join(', ')}: subscribe_pr_activity to each pull request`;
    try { ctx.send(root, sb, { from: 'merger', to: 'bob', text, log }); } catch (e) { if (!(e instanceof Fail)) throw e; log(`tell BOB: ${text}`); }
  }
  if (!launches.length && !again.length && !archive.length) log(`AUTO-START pass ${pass} (${why}): no call to make; ${r.waiting?.length ? `${r.waiting.length} wait for the cap` : 'nothing startable'}`);
  return { pass, row, launches, again, archive, created };
}
function appendRows(f, rows) {
  const prev = existsSync(f) ? readFileUtf8(f) : '';
  writeFileSync(f, prev + rows.map((x) => JSON.stringify(x) + '\n').join(''));
}
const readFileUtf8 = (f) => { try { return readFileSync(f, 'utf8'); } catch { return ''; } };

// The file the MERGER saves list_sessions to, saved after the ask (mtime), within AUTO.sessionsWait.
export const waitForFile = (file, asked, { wait = AUTO.sessionsWait * MIN, every = 5000 } = {}) => {
  const end = Date.now() + wait;
  for (;;) {
    try { if (statSync(file).mtimeMs >= asked - 1000) return true; } catch { /* not yet */ }
    if (Date.now() >= end) return false;
    sleepMs(every);
  }
};

// auto start --here: the loop, in the starter's own clone. Ends only on a moved pin or changed
// approvals (exit codes for the launcher); every other failure is said and the loop goes on.
export function autoLoop(root, opts = {}) {
  const { session, log = console.log, rounds = Infinity, idleEvery = 30000 } = opts;
  if (!/^session_[A-Za-z0-9]+$/.test(String(session))) fail(`usage: ${AUTO_USAGE}`);
  if (!opts.anyClone && !existsSync(gitPath(root, STARTER_MARK))) fail(`auto start --here runs only in the starter's own clone (made by auto start); this clone has no ${STARTER_MARK} mark, and the train's clone is the train's`);
  const cfg = loadConfig(root);
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root });
  const ctx = {
    cfg, log, session, quietUntil: 0, said: null,
    approvals: approvalsHash(root, `refs/remotes/origin/${cfg.tranche}`),
    pin: opts.pin || toolPin,
    sessionsFile: opts.sessionsFile || gitPath(root, SESSIONS_FILE),
    waitFor: opts.waitFor || ((f, at) => waitForFile(f, at)),
    ready: opts.ready || startReady,
    open: opts.open || ((r, c) => openState(r, c)),
    send: opts.send || send,
  };
  log(`the starter runs for ${session}: a pass when starts are owed, a hold expires, or every ${AUTO.every} min; each pass asks for list_sessions, then prints its calls as one AUTO-START block`);
  const out = [];
  for (let k = 0; k < rounds; k++) {
    try {
      const r = autoPass(root, ctx);
      if (r) out.push(r);
    } catch (e) {
      if (!(e instanceof Fail)) throw e;
      if (e.exit) { log(e.message); return { exit: e.exit, passes: out }; }
      log(`the starter's pass failed (${e.message.split('\n')[0]}); it tries again in ${AUTO.gap} min`);
      ctx.quietUntil = Date.now() + AUTO.gap * MIN;
    }
    if (k + 1 < rounds) sleepMs(idleEvery);
  }
  return { exit: 0, passes: out };
}

// The starter's clone, beside the one the command runs in: made once (a local clone, origin set to
// this clone's origin), then at each (re)start fetched, detached at the tranche's tip, and its pin
// filled. Marked, so the loop runs nowhere else.
export const starterDir = (root) => join(dirname(root), `${basename(root)}-starter`);
export function prepClone(root, dir, cfg, { log = console.log } = {}) {
  if (!existsSync(join(dir, '.git'))) {
    const url = git(['remote', 'get-url', 'origin'], { cwd: root });
    git(['clone', '-q', '--no-checkout', root, dir], { cwd: dirname(dir) });
    git(['remote', 'set-url', 'origin', url], { cwd: dir });
    log(`the starter's clone made at ${dir}`);
  }
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: dir });
  git(['checkout', '-q', '-f', '--detach', `refs/remotes/origin/${cfg.tranche}`], { cwd: dir });
  git(['submodule', 'update', '--init', '-q', '.process'], { cwd: dir });
  writeFileSync(gitPath(dir, STARTER_MARK), `${new Date().toISOString()}\n`);
  return dir;
}

// auto start --session <id>: the launcher the MERGER runs in the background. Only the addressed
// MERGER runs it. It prepares the starter's clone and runs the loop there with that clone's tool
// (the tranche's pin); when the pin moves, again, at the new pin. It ends only when the approvals
// changed (exit 4) or the loop failed outright.
export function autoStart(root, { session, log = console.log, address, prep = prepClone, run = spawnSync } = {}) {
  if (!/^session_[A-Za-z0-9]+$/.test(String(session))) fail(`usage: ${AUTO_USAGE}`);
  const cfg = loadConfig(root);
  const a = address || readAddress(root);
  if (a.merger?.session !== session) fail(`the starter is the addressed MERGER's (${a.merger?.session || 'none addressed'}), not ${session}'s; nothing was started`);
  const dir = starterDir(root);
  for (;;) {
    prep(root, dir, cfg, { log });
    const r = run(process.execPath, [join(dir, '.process', 'tool', 'p3.mjs'), 'auto', 'start', '--session', session, '--here'], { cwd: dir, stdio: 'inherit' });
    if (r.status === EXIT.pin) { log('the starter runs again at the new pin'); continue; }
    if (r.status === EXIT.approvals) log('the starter stopped: the approvals changed; tell ROOT, word for word');
    else log(`the starter ended (exit ${r.status ?? r.signal}); run auto start again`);
    return r.status ?? 1;
  }
}

// auto done <pass> --created <module>=<session id>...: the MERGER's record of the sessions it
// created from a pass's block; the measure's end, sooner than the next pass's list_sessions.
export function autoDone(root, pass, created, { log = console.log } = {}) {
  const k = Number(pass);
  if (!Number.isInteger(k) || k < 1) fail(`usage: ${AUTO_USAGE}`);
  const pairs = [].concat(created ?? []).map((x) => String(x).match(/^([A-Za-z0-9._/-]+)=(session_[A-Za-z0-9]+)$/) || fail(`--created <module>=<session id>, not ${JSON.stringify(x)}`));
  if (!pairs.length) fail(`usage: ${AUTO_USAGE}`);
  const cfg = loadConfig(root);
  const out = writeState(root, cfg.state_branch, `starter: pass ${k} created`, (wt) => {
    const f = join(wt, AUTO_FILE);
    let a = null;
    try { a = JSON.parse(readFileUtf8(f) || 'null'); } catch { a = null; }
    const pending = a?.pending || [];
    const done = [];
    const unknown = [];
    for (const [, id, s] of pairs) {
      const p = pending.find((x) => x.id === id);
      if (!p) { unknown.push(id); continue; }
      done.push({ ...p, session: s, created_at: now() });
    }
    if (!done.length) return { done, unknown };
    writeFileSync(f, JSON.stringify({ ...a, pending: pending.filter((x) => !done.some((d) => d.id === x.id)) }, null, 2) + '\n');
    mkdirSync(join(wt, dirname(STARTS_FILE)), { recursive: true });
    appendRows(join(wt, STARTS_FILE), done.map((d) => createdRow(d, k)));
    return { done, unknown };
  });
  for (const d of out.done || []) log(`job ${d.id}: session ${d.session} recorded created${d.owed_since ? `, ${mins(Date.parse(d.owed_since), Date.parse(d.created_at))} min after its starts were owed` : ''}`);
  for (const id of out.unknown || []) log(`job ${id}: not pending (already seen created, or not printed by the starter): nothing recorded`);
  return out;
}

// The measure status prints: minutes from starts owed to each job session created, the last day.
export function startsMeasure(rows = [], t = Date.now()) {
  const day = rows.filter((r) => r.row === 'created' && typeof r.min === 'number' && t - Date.parse(r.at) <= 864e5);
  const xs = day.map((r) => r.min).sort((a, b) => a - b);
  const med = xs.length ? (xs.length % 2 ? xs[xs.length >> 1] : (xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2) : null;
  const p90 = xs.length ? xs[Math.min(xs.length - 1, Math.ceil(0.9 * xs.length) - 1)] : null;
  return { n: xs.length, median: med, p90, last: day.at(-1)?.min ?? null, last_at: day.at(-1)?.at ?? null };
}
export function starterLines(auto, rows, owed, t = Date.now()) {
  const m = startsMeasure(rows, t);
  const live = starterLive(auto, t);
  const fig = m.n ? `owed to started: median ${m.median} min, p90 ${m.p90} min, last ${m.last} min (${m.n} starts in 24 h)` : 'owed to started: no start measured in 24 h';
  const state = live ? `running (${auto.session}, last pass ${auto.pass} at ${auto.at}${auto.pending?.length ? `; ${auto.pending.length} launch${auto.pending.length === 1 ? '' : 'es'} not yet seen created: ${auto.pending.map((p) => p.id).join(', ')}` : ''})`
    : `NOT RUNNING${auto?.at ? ` (last pass ${auto.at})` : ''}: BOB runs ${P3} job start --ready until the MERGER runs ${P3} auto start`;
  const now2 = owed?.since ? `; starts owed now for ${Math.round((t - Date.parse(owed.since)) / MIN)} min` : '';
  return [`starter: ${state}; ${fig}${now2}`];
}
export const readStarts = (root, sb) => jsonl(readState(root, sb, STARTS_FILE));
