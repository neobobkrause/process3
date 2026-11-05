// Holds (Bob, 5 Nov: on 4 Nov the coordinator's "about 6 job sessions at most" kept BOB near 6 of
// 20 for about 6 hours and nothing in Process3 saw it). A hold on startable work is a row on the
// state branch, never words: `p3 hold <scope> --why --by --until`, ended by `p3 hold --end <id>` or
// its expiry. Scope: module:<id>, layer:<n> or slots:<n>. job start --ready starts to the cap less
// the live slot holds and starts no held module; status prints every hold first; the sweep alarms
// on idle capacity whatever holds there are. Every hold expires within HOLD_MAX_H hours and is
// renewed only by a new row with its reason, so a long hold is a visible chain; no hold needs Bob
// (coordinator's correction, 5 Nov). report tranche lists hold-hours by setter and reason.
import { appendFileSync, mkdirSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { layerOf } from './metrics.mjs';
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { exists, fail, git, loadConfig, now } from './util.mjs';

export const HOLDS_FILE = 'holds/holds.jsonl';
export const HOLD_MAX_H = 2;
const SHOWN_EXPIRED_H = 24; // an expired hold is printed as expired for a day
const SCOPE = /^(module|layer|slots):([A-Za-z0-9._/-]+)$/;
const min = (ms) => Math.round(ms / 6e4);

// Every hold row, with its end row folded in: live, expired or ended at t.
export function holdsOf(rows, t = Date.now()) {
  const ended = new Map(rows.filter((r) => r.row === 'end').map((r) => [r.id, r]));
  return rows.filter((r) => r.row === 'hold').map((h) => {
    const [, kind, value] = h.scope.match(SCOPE) || [];
    const left = Date.parse(h.until) - t;
    return { ...h, kind, value, ended: ended.get(h.id) || null, left, live: !ended.has(h.id) && left > 0 };
  });
}

export function readHolds(root, sb, { offline = false, t = Date.now() } = {}) {
  if (!offline) fetchState(root, sb);
  return holdsOf(jsonl(readState(root, sb, HOLDS_FILE)), t);
}

// The lines status prints first: each live hold, then each expired in the last day.
export function holdLines(holds) {
  const live = holds.filter((h) => h.live);
  const expired = holds.filter((h) => !h.live && !h.ended && -h.left < SHOWN_EXPIRED_H * 36e5);
  if (!live.length && !expired.length) return ['holds: none'];
  return [`holds: ${live.length} live${expired.length ? `, ${expired.length} expired` : ''} (only a recorded hold holds startable work below the cap)`,
    ...live.map((h) => `- ${h.id} ${h.scope}, by ${h.by}${h.renews ? `, renewing ${h.renews}` : ''}, ${min(h.left)} min to expiry: ${h.why}`),
    ...expired.map((h) => `- ${h.id} ${h.scope}, by ${h.by}: expired ${min(-h.left)} min ago, holds nothing: ${h.why}`)];
}

export const slotsHeld = (holds) => holds.filter((h) => h.live && h.kind === 'slots').reduce((s, h) => s + Number(h.value), 0);
// The live hold on a startable module ({ id }), by its module or its layer (layers: layerOf's map).
export const heldBy = (holds, id, layers) => holds.find((h) => h.live && ((h.kind === 'module' && h.value === id) || (h.kind === 'layer' && layers.get(id) === Number(h.value)))) || null;
export const layersAt = (root, cfg, ref = `origin/${cfg.tranche}`) => layerOf(exists(root, ref, cfg.layers_file) ? git(['show', `${ref}:${cfg.layers_file}`], { cwd: root }) : null);

// p3 hold <scope> --why "..." --by <session> --until <ISO time | <n>m | <n>h>; p3 hold --end <id> --by <session>.
export function hold(root, scope, { why, by, until, end, log = console.log } = {}) {
  const cfg = loadConfig(root);
  const sb = cfg.state_branch;
  if (typeof by !== 'string' || !/^session_[A-Za-z0-9]+$/.test(by)) fail('--by <your session id (session_...)>');
  const t = Date.now();
  const holds = readHolds(root, sb, { t });
  if (end !== undefined) {
    const h = holds.find((x) => x.id === end);
    if (!h) fail(`no hold ${JSON.stringify(end)} on ${sb}:${HOLDS_FILE}`);
    if (!h.live) fail(`${h.id} holds nothing already (${h.ended ? 'ended' : 'expired'})`);
    writeState(root, sb, `hold: end ${h.id}`, (dir) => { put(dir, { at: now(), row: 'end', id: h.id, by }); return {}; });
    log(`${h.id} ended: ${h.scope} holds nothing now; job start --ready starts what it held`);
    return { ended: h.id };
  }
  const m = String(scope ?? '').match(SCOPE);
  if (!m || (m[1] !== 'module' && !/^\d+$/.test(m[2])) || (m[1] === 'slots' && Number(m[2]) < 1)) fail(`hold <scope>: module:<id>, layer:<n> or slots:<n>, not ${JSON.stringify(scope)}`);
  if (typeof why !== 'string' || !why.trim()) fail('--why "<the reason, in words a reader can check>"');
  const rel = String(until ?? '').match(/^(\d+)([mh])$/);
  const at = rel ? t + Number(rel[1]) * (rel[2] === 'h' ? 36e5 : 6e4) : Date.parse(String(until));
  if (!(at > t)) fail(`--until <a future time (ISO) or <n>m or <n>h>, not ${JSON.stringify(until)}`);
  if (at - t > HOLD_MAX_H * 36e5) fail(`refused: a hold expires within ${HOLD_MAX_H} hours; to hold longer, set a new hold with its reason when this one nears its end`);
  // A hold on a scope still held, or held until the last hour, renews it: the chain stays visible.
  const prev = holds.filter((h) => h.scope === m[0] && !h.ended && h.left > -36e5).at(-1);
  const row = { row: 'hold', scope: m[0], why: why.trim(), by, until: new Date(at).toISOString().replace(/\.\d+Z$/, 'Z'), ...(prev ? { renews: prev.id } : {}) };
  const { id } = writeState(root, sb, `hold: ${m[0]}`, (dir) => {
    const f = join(dir, HOLDS_FILE);
    const n = existsSync(f) ? jsonl(readFileSync(f, 'utf8')).filter((r) => r.row === 'hold').length + 1 : 1;
    put(dir, { at: now(), id: `hold-${n}`, ...row });
    return { id: `hold-${n}` };
  });
  log(`${id}: ${m[0]} held until ${row.until} (${min(at - t)} min)${prev ? `, renewing ${prev.id}` : ''}, by ${by}: ${row.why}. status prints it first; \`p3 hold --end ${id} --by <session>\` ends it`);
  return { id, ...row };
}

// Hold-hours in [from, to] by setter and reason (report tranche, beside cap use): each hold from its
// row to its end, its expiry or `to`, whichever is first, overlapping renewals counted once; the most first.
export function holdHours(rows, from, to) {
  const [a, b] = [Date.parse(from) || -Infinity, Date.parse(to)];
  const by = new Map();
  for (const h of holdsOf(rows, b)) {
    const span = [Math.max(a, Date.parse(h.at)), Math.min(b, Date.parse(h.until), Date.parse(h.ended?.at) || Infinity)];
    if (!(span[1] > span[0])) continue;
    const k = `${h.by}\0${h.why}\0${h.scope}`;
    by.set(k, { by: h.by, why: h.why, spans: [...(by.get(k)?.spans || []), span] });
  }
  const union = (xs) => xs.sort((p, q) => p[0] - q[0]).reduce((o, [s0, e0]) => { const l = o.at(-1); if (l && s0 <= l[1]) l[1] = Math.max(l[1], e0); else o.push([s0, e0]); return o; }, []);
  const out = new Map();
  for (const x of by.values()) {
    const k = `${x.by}\0${x.why}`;
    const y = out.get(k) || { by: x.by, why: x.why, holds: 0, hours: 0 };
    out.set(k, { ...y, holds: y.holds + x.spans.length, hours: y.hours + union(x.spans).reduce((t, [s0, e0]) => t + (e0 - s0) / 36e5, 0) });
  }
  return [...out.values()].map((x) => ({ ...x, hours: Math.round(x.hours * 10) / 10 })).sort((x, y) => y.hours - x.hours);
}

const put = (dir, row) => { mkdirSync(join(dir, 'holds'), { recursive: true }); appendFileSync(join(dir, HOLDS_FILE), JSON.stringify(row) + '\n'); };

// Starts owed (coordinator, 5 Nov: a marker, never a refusal): every act that can make work
// startable or free a slot writes flow/owed.json (p3.mjs after the act: a merge, job complete,
// block, layer close, a triage recorded; the sweep for a job session archived). status and every
// act of BOB's print startsOwedLine first, exit unchanged; job start --ready clears the acts owed
// up to its own start. Owed OWED_ALARM_MIN or more counts as idle capacity (sweep.mjs).
export const OWED_FILE = 'flow/owed.json';
export const OWED_ALARM_MIN = 15;
export function owes(name, a) {
  if (['merge', 'job complete', 'block', 'layer close'].includes(name)) return `${name} ${a._[0] ?? ''}`.trim();
  // A hold ended frees what it held (an expiry is the starter's to see: auto.mjs).
  if (name === 'hold' && a.end !== undefined && a.end !== true) return `hold ended ${a.end}`;
  return name === 'notice triage' && a.record !== undefined ? `triage recorded ${a._[0] ?? ''}`.trim() : null;
}
export const bobAct = (name, a) => (name === 'job start' ? !a.ready : name === 'send' ? a.from === 'bob'
  : ['merge', 'layer close', 'notice triage', 'notice withdraw', 'tranche open', 'tranche close', 'lane ask', 'handoff', 'hold', 'found', 'pin move', 'release dev', 'deploy dev', 'walk internal'].includes(name));
export function readOwed(root, sb) { try { return JSON.parse(readState(root, sb, OWED_FILE) || 'null'); } catch { return null; } }
export const startsOwedLine = (o, auto = null) => `starts owed since ${o.since} (${o.acts.map((x) => x.act).slice(-3).join('; ')}): ${starterLive(auto) ? `the MERGER's starter (${auto.session}) makes them` : 'run job start --ready'}`;
// In a state worktree: owe(act) keeps the first act's time; paid(begun) drops the acts up to begun.
export function owe(dir, act) {
  const f = join(dir, OWED_FILE);
  let o = null;
  try { o = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; } catch { o = null; }
  mkdirSync(join(dir, 'flow'), { recursive: true });
  writeFileSync(f, JSON.stringify({ since: o?.since || now(), acts: [...(o?.acts || []).slice(-9), { at: now(), act }] }) + '\n');
}
export function paid(dir, begun) {
  const f = join(dir, OWED_FILE);
  let o = null;
  try { o = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; } catch { o = null; }
  const later = (o?.acts || []).filter((x) => Date.parse(x.at) > Date.parse(begun));
  if (later.length) writeFileSync(f, JSON.stringify({ since: later[0].at, acts: later }) + '\n');
  else rmSync(f, { force: true });
}

// The starter (auto.mjs; Bob, 5 Nov: "Why do you have to order BOB to start jobs?"): the MERGER's
// second background loop, which makes every ready start without a session's judgment. Its state:
// flow/auto.json { session, at (its last pass), pass, pending (launches printed, their sessions not
// yet seen) }; its measure: metrics/starts.jsonl, a 'pass' row per pass and a 'created' row per job
// session seen created, with the minutes from the starts owed to it.
export const AUTO_FILE = 'flow/auto.json';
export const STARTS_FILE = 'metrics/starts.jsonl';
// Minutes: a pass at least this often (an archive or a gate gone green writes no owed row); none
// sooner than gap after the last; a pass's list_sessions awaited this long; a launch not seen
// created this long is printed again; a starter with no pass this long is not running.
export const AUTO = { every: 10, gap: 3, sessionsWait: 10, reprint: 10, live: 25 };
export function readAuto(root, sb) { try { return JSON.parse(readState(root, sb, AUTO_FILE) || 'null'); } catch { return null; } }
export const starterLive = (a, t = Date.now()) => !!a?.session && t - Math.max(Date.parse(a.at) || 0, Date.parse(a.beat) || 0) < AUTO.live * 6e4;
