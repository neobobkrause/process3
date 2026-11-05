// Flow control (Bob, 5 Nov, Build Plan R10): Process3 itself keeps the job cap used, safely and
// live; the urgency is the tool's, not a prompt's (copy, 5 Nov: latency targets met while cap use
// was about 48%). Three records on the state branch:
// - flow/owed.json, starts owed: written by every act that can make work startable or free a slot
//   (p3.mjs owes: a merge, job complete, block, layer close, a triage recorded; the sweep when it
//   prints sessions to archive). While it stands every other act of BOB's refuses (exit 2) until
//   job start --ready starts to the cap less holds, or records why each free slot stays empty.
// - metrics/flow.jsonl, flow samples: at most one per SAMPLE_MIN minutes, taken by whichever p3
//   command any role runs, and by every job start --ready (row 'ready'): live, cap, holds,
//   startable, each empty slot's reason, the alarms. A sample that finds startable work and an
//   empty slot with no reason writes starts owed itself, so a held-back start is caught in minutes.
// - flow/safety.json, the safety holds: tool-set, each citing its reading, gone when it clears.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { GATE_WORKFLOW } from './github.mjs';
import { rowsAt } from './metrics.mjs';
import { startable } from './ready.mjs';
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { blockedJobs, readSessions, sessionsCount, status } from './status.mjs';
import { exists, fail, gh, git, jobCap, now, unmetIds } from './util.mjs';

export const OWED_FILE = 'flow/owed.json';
export const SAFETY_FILE = 'flow/safety.json';
export const FLOW_FILE = 'metrics/flow.jsonl';
export const SAMPLE_MIN = 5;
// Queued process-gate runs at which new starts wait (measured on the copy, 5 Nov 00:10-01:25, 100
// gate runs: at most 8 at once, none queued, a job's runner wait 3 s at that peak).
export const GATE_QUEUE_MAX = 5;
// Base-red rising: each of the tranche's last BASE_RED_MERGES job merges tolerated base-red tests.
export const BASE_RED_MERGES = 3;
const put = (wt, p, text, add = false) => { mkdirSync(dirname(join(wt, p)), { recursive: true }); (add ? appendFileSync : writeFileSync)(join(wt, p), text); };
const read = (root, sb, p) => { try { return JSON.parse(readState(root, sb, p) || 'null'); } catch { return null; } };

// The acts that owe starts (the command as p3.mjs dispatched it, after it succeeded), and BOB's
// acts that starts owed holds back: all but job start --ready, status, hold and reading commands.
export function owes(name, a) {
  if (['merge', 'job complete', 'block', 'layer close'].includes(name)) return `${name} ${a._[0] ?? ''}`.trim();
  if (name === 'notice triage' && a.record !== undefined) return `triage recorded ${a._[0] ?? ''}`.trim();
  return null;
}
export function bobAct(name, a) {
  if (name === 'job start') return !a.ready;
  if (name === 'send') return a.from === 'bob';
  if (name === 'notice triage') return a.record !== undefined;
  return ['merge', 'layer close', 'notice withdraw', 'tranche close', 'lane ask', 'handoff', 'pin move', 'release dev', 'deploy dev', 'walk internal'].includes(name);
}
export const owedOf = (root, sb) => read(root, sb, OWED_FILE);
export const owedLine = (o) => `starts owed since ${o.since} (${(o.acts || []).map((x) => x.act).slice(-3).join('; ')}): run job start --ready first`;
// What status --role bob prints first: starts owed, and the dead ends of the last flow row.
export function flowFirst(root, sb) {
  const o = owedOf(root, sb);
  const last = jsonl(readState(root, sb, FLOW_FILE)).at(-1);
  const dead = [...new Set([...(last?.alarms || []), ...(last?.empty || [])].filter((x) => /^dead end /.test(x)))];
  return [...(o ? [owedLine(o)] : []), ...dead.map((x) => `${x} (a Process3 defect: tell the coordinator; ${last.row} row ${last.at})`)];
}
// Writes into a state worktree: the first act's time stands until job start --ready clears it.
export function owe(wt, act) {
  const f = join(wt, OWED_FILE);
  let o = null;
  try { o = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; } catch { o = null; }
  put(wt, OWED_FILE, JSON.stringify({ since: o?.since || now(), acts: [...(o?.acts || []).slice(-9), { at: now(), act }] }) + '\n');
}

// The safety readings (R10 item 4), each a hold of the free slots while it reads unsafe; no other
// reason may hold a slot. usage: rate_limit_info as list_sessions or get_session return it (any
// status but allowed bounds new starts: allowed_warning to half the free slots, measured 5 Nov on a
// seven-day window, any other to none); gate: queued process-gate runs; base-red: merge rows.
export function usageReading(file) {
  if (!file || file === true) return null;
  let j;
  try { j = JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
  // get_session: { ccr: { external_metadata: { rate_limit_info } } }; list_sessions: each session's.
  const list = [j, j?.data, j?.ccr?.data].find(Array.isArray) || [];
  const infos = [j, j?.ccr, ...list].flatMap((x) => [x?.rate_limit_info, x?.external_metadata?.rate_limit_info]).filter((x) => x && typeof x === 'object' && x.status);
  if (!infos.length) return null;
  const worst = infos.find((x) => x.status !== 'allowed') || infos[0];
  return { status: String(worst.status), reading: `rate_limit_info ${JSON.stringify(worst)}` };
}
export function gateQueue(slug, { read: r = (args) => gh(args, { allowFail: true }) } = {}) {
  const j = slug ? r(['api', `repos/${slug}/actions/workflows/${GATE_WORKFLOW.split('/').pop()}/runs?status=queued&per_page=1`]) : null;
  return Number.isInteger(j?.total_count) ? j.total_count : undefined; // unread: the last hold stands
}
export function baseRedRising(mergeRows) {
  const last = mergeRows.filter((r) => r.row === 'merge' && Number.isInteger(r.base_red)).sort((a, b) => String(a.at).localeCompare(String(b.at))).slice(-BASE_RED_MERGES);
  return last.length === BASE_RED_MERGES && last.every((r) => r.base_red > 0) ? last.map((r) => `PR ${r.pr}: ${r.base_red}`).join(', ') : null;
}
// The readings, and the holds they make; a reading not taken (undefined) keeps its last hold.
export function safety(root, cfg, { usage, queue, mergeRows, prev = [] } = {}) {
  const keep = (signal) => prev.filter((h) => h.signal === signal);
  const out = [
    ...(usage === undefined ? keep('usage') : usage && usage.status !== 'allowed' ? [{ signal: 'usage', reading: usage.reading, ...(usage.status === 'allowed_warning' ? { half: true } : {}) }] : []),
    ...(queue === undefined ? keep('gate') : queue > GATE_QUEUE_MAX ? [{ signal: 'gate', reading: `${queue} process-gate runs queued, over ${GATE_QUEUE_MAX}` }] : []),
  ];
  const red = mergeRows === undefined ? null : baseRedRising(mergeRows);
  if (mergeRows === undefined) out.push(...keep('base-red'));
  else if (red) out.push({ signal: 'base-red', reading: `base-red tolerated at each of the last ${BASE_RED_MERGES} merges (${red})` });
  return out.map((h) => ({ ...h, by: 'tool', since: prev.find((p) => p.signal === h.signal)?.since || h.since || now() }));
}
export const safetyOf = (root, sb) => read(root, sb, SAFETY_FILE) || [];

// Unmet work that nothing will ever start (R10 item 2; a Process3 defect): a module with unmet
// marks, no job open, not BLOCKED, not over the cap (its split is BOB's act), in no later layer,
// not deferred at a close and listed in no next work; and next work job start --ready skips as
// BOB's judgment. ls: status's layerState.
export function deadEnds(root, cfg, { rows, next, skip, ls, ref }) {
  const listed = new Set((next || []).map((x) => x.file).filter(Boolean));
  const deferred = new Set((ls?.deferred || []).map((d) => d.id));
  const layerOf = new Map((ls?.layers || []).flatMap((L) => L.mods.map((m) => [m.file, L.n])));
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const out = [];
  for (const r of rows) {
    const file = r.req || `${dir}/${r.id}.md`;
    // No layer map: every requirement file with marks is next work.
    if (!ls || listed.has(file) || deferred.has(r.id) || r.tranche === 'BLOCKED' || r.flag || r.pr?.startsWith('#') || /^(WORKING|BLOCKED)/.test(r.branch || '')) continue;
    if (ls.cur && layerOf.has(file) && layerOf.get(file) >= ls.cur.n) continue;
    const text = ref && exists(root, ref, file) ? git(['show', `${ref}:${file}`], { cwd: root, allowFail: true }).stdout : null;
    const n = text ? unmetIds(text).length : 0;
    if (n) out.push({ id: r.id, why: `${n} unmet mark${n === 1 ? '' : 's'}, entry ${r.tranche}, ${layerOf.has(file) ? `layer ${layerOf.get(file)} behind the open layer` : 'in no layer'}: listed in no next work` });
  }
  for (const s of skip || []) if (/BOB's judgment$/.test(s.why) && !/entry BLOCKED/.test(s.why)) out.push({ id: s.id || s.file, why: s.why });
  return out;
}

// Each empty slot's reason, one per slot: a hold, a safety signal, a start that failed, a dead
// end, else no work.
export function slotReasons(empty, { holds = [], failed = [], dead = [], free = empty }) {
  const out = [];
  for (const h of holds.filter((x) => !x.signal)) for (let i = 0; i < (h.slots || 1) && out.length < empty; i++) out.push(`hold ${h.id}`);
  const sig = holds.find((x) => x.signal && !x.half) || holds.find((x) => x.signal);
  for (let i = safetyHeld(holds, free); i > 0 && out.length < empty; i--) out.push(`safety ${sig.signal}`);
  for (const d of [...failed.map((f) => ({ id: f.id, why: `its start failed: ${f.why}` })), ...dead]) if (out.length < empty) out.push(`dead end ${d.id}: ${d.why}`);
  while (out.length < empty) out.push('no work');
  return out;
}

// The slots holds take: Bob's recorded holds (each its slots) and, while a safety hold stands, all.
const safetyHeld = (holds, free) => (holds.some((h) => h.signal && !h.half) ? free : holds.some((h) => h.signal) ? Math.ceil(free / 2) : 0);
export const heldSlots = (holds, free) => Math.min(free, safetyHeld(holds, free) + holds.reduce((s, h) => s + (h.signal ? 0 : h.slots || 1), 0));

// job start <id>: the cap checked as job start --ready checks it (a restart replaces a session, unchecked).
export function capRoom(root, cfg, { live, sessions }) {
  if (sessions === true) fail('--sessions <file>: your list_sessions result, saved as JSON');
  const listed = sessions === undefined ? null : readSessions(sessions);
  const n = listed ? sessionsCount(listed, live, () => {}) : Number(live);
  if ((live === undefined && !listed) || live === true || !Number.isInteger(n) || n < 0) fail('job start <id> --live <n> (or --sessions <file>): the account\'s job sessions, so the cap holds as it does for job start --ready');
  const cap = jobCap(cfg).cap;
  const u = usageReading(sessions);
  let holds = [];
  try { if (fetchState(root, cfg.state_branch)) holds = safetyOf(root, cfg.state_branch); } catch { holds = []; }
  holds = [...holds.filter((h) => !h.signal), ...safety(root, cfg, { usage: u || undefined, prev: holds })];
  const held = heldSlots(holds, Math.max(0, cap - n));
  if (n + held >= cap) fail(`the job cap is full: ${n} job sessions live of ${cap}${held ? `, ${held} held (${holds.map((h) => `${h.signal}: ${h.reading}`).join('; ')})` : ''}; nothing was started`);
  return { n, cap, held };
}

// The flow sample: at most one per SAMPLE_MIN minutes unless forced. Offline status (no GitHub
// read), origin's job heads, the gate queue, the tranche's merge rows. live: the job sessions last
// measured (a 'ready' row or the sweep's, within 30 min) or, above that, the product's WORKING jobs.
export function sample(root, cfg, { by, force = false, slug, io = {}, log = () => {} } = {}) {
  const sb = cfg.state_branch;
  if (!fetchState(root, sb) && !force) return null;
  const rows0 = jsonl(readState(root, sb, FLOW_FILE));
  const last = rows0.at(-1);
  if (!force && last && Date.now() - Date.parse(last.at) < SAMPLE_MIN * 6e4) return null;
  if (cfg.plan === 'pause' || cfg.plan === 'stop') return null;
  const r = git(['ls-remote', '--heads', 'origin', 'refs/heads/job/*'], { cwd: root, allowFail: true });
  const heads = new Set(r.stdout.split('\n').map((l) => l.split('\t')[1]?.replace(/^refs\/heads\/job\//, '')).filter(Boolean));
  const out = (io.status || status)(root, { role: 'bob', offline: true, ...(r.code === 0 ? { heads } : {}), log: () => {} });
  if (out.open?.state !== 'open') return null;
  const { go, skip } = startable(out.next, { onOrigin: (id) => heads.has(id) });
  const lastReady = [...rows0].reverse().find((x) => x.row === 'ready');
  const failedIds = new Set((lastReady?.failed || []));
  const ready = go.filter((x) => !failedIds.has(x.id));
  const sweeps = jsonl(readState(root, sb, 'metrics/sweep.jsonl'));
  // A ready row's live: those it counted and those it started.
  const measured = [lastReady, sweeps.at(-1)].filter((x) => x && Number.isInteger(x.live) && Date.now() - Date.parse(x.at) < 30 * 6e4).map((x) => x.live + (x.started?.length || 0));
  const working = out.rows.filter((x) => String(x.branch || '').startsWith('WORKING')).length;
  const live = Math.max(working, ...measured);
  const cap = jobCap(cfg).cap;
  const ref = out.tranche === 'HEAD' ? null : out.tranche;
  const holds = safety(root, cfg, { queue: (io.queue || gateQueue)(slug), mergeRows: ref ? rowsAt(root, ref) : [], prev: safetyOf(root, sb) });
  const free = Math.max(0, cap - live);
  const held = heldSlots(holds, free);
  const dead = deadEnds(root, cfg, { rows: out.rows, next: out.next, skip, ls: out.layer, ref });
  const idle = Math.min(ready.length, free - held);
  const alarms = [
    ...(idle > 0 ? [`idle capacity: ${idle} slot${idle === 1 ? '' : 's'} empty with ${ready.length} startable`] : []),
    ...dead.map((d) => `dead end ${d.id}: ${d.why}`),
    ...blockedJobs(cfg, out.rows).filter((b) => b.by).map((b) => `ruling owed by ${b.by}: job ${b.id} BLOCKED ${b.min} min`),
  ];
  const row = { at: now(), row: 'flow', by: by || null, live, cap, holds: holds.map((h) => h.signal), startable: ready.length, empty: slotReasons(Math.max(0, free - Math.max(0, idle)), { holds, dead, free }), alarms };
  writeState(root, sb, `flow sample: ${alarms[0] || 'no alarm'}`.slice(0, 72), (wt) => {
    put(wt, FLOW_FILE, JSON.stringify(row) + '\n', true);
    put(wt, SAFETY_FILE, JSON.stringify(holds) + '\n');
    if (idle > 0) owe(wt, alarms[0]);
  });
  for (const a of alarms) log(`flow alarm: ${a}`);
  return row;
}

// job start --ready's record: the starts, each free slot's reason, the holds; starts owed cleared
// (kept only when it named idle sessions to archive: the slots they hold are BOB's to free).
export function recordReady(root, cfg, { live, cap, started, failed, empty, holds, keep = false, usage }) {
  const sb = cfg.state_branch;
  const row = { at: now(), row: 'ready', live, cap, holds: holds.map((h) => h.signal || h.id), started: started.map((x) => x.id), failed: failed.map((x) => x.id), empty, ...(usage ? { usage: usage.status } : {}) };
  return writeState(root, sb, `job start --ready: ${started.length} started, ${empty.length} empty`, (wt) => {
    put(wt, FLOW_FILE, JSON.stringify(row) + '\n', true);
    put(wt, SAFETY_FILE, JSON.stringify(holds.filter((h) => h.signal)) + '\n');
    if (!keep) rmSync(join(wt, OWED_FILE), { force: true });
  });
}

// The commands no sample is taken for: those run inside GitHub Actions, and those that read only.
const NO_SAMPLE = new Set(['gate', 'record-check', 'release run', 'release version', 'release sign', 'release body', 'size', 'address']);
export const sampled = (name, env = process.env) => !NO_SAMPLE.has(name) && !env.GITHUB_ACTIONS && !env.NODE_TEST_CONTEXT && env.P3_FLOW_SAMPLE !== '0';
