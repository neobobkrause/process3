// Holds (Bob, 5 Nov: on 4 Nov the coordinator's "about 6 job sessions at most" kept BOB near 6 of
// 20 for about 6 hours and nothing in Process3 saw it). A hold on startable work is a row on the
// state branch, never words: `p3 hold <scope> --why --by --until`, ended by `p3 hold --end <id>` or
// its expiry. Scope: module:<id>, layer:<n> or slots:<n>. job start --ready starts to the cap less
// the live slot holds and starts no held module; status prints every hold first; the sweep alarms
// on idle capacity whatever holds there are. Every hold expires within HOLD_MAX_H hours and is
// renewed only by a new row with its reason, so a long hold is a visible chain; no hold needs Bob
// (coordinator's correction, 5 Nov). report tranche lists hold-hours by setter and reason.
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
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
  if (at - t > HOLD_MAX_H * 36e5 + 6e4) fail(`refused: a hold expires within ${HOLD_MAX_H} hours; to hold longer, set a new hold with its reason when this one nears its end`);
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
// row to its end, its expiry or `to`, whichever is first; the most first.
export function holdHours(rows, from, to) {
  const [a, b] = [Date.parse(from) || -Infinity, Date.parse(to)];
  const by = new Map();
  for (const h of holdsOf(rows, b)) {
    const d = Math.min(b, Date.parse(h.until), Date.parse(h.ended?.at) || Infinity) - Math.max(a, Date.parse(h.at));
    if (!(d > 0)) continue;
    const k = `${h.by}\0${h.why}`;
    const x = by.get(k) || { by: h.by, why: h.why, holds: 0, hours: 0 };
    by.set(k, { ...x, holds: x.holds + 1, hours: x.hours + d / 36e5 });
  }
  return [...by.values()].map((x) => ({ ...x, hours: Math.round(x.hours * 10) / 10 })).sort((x, y) => y.hours - x.hours);
}

const put = (dir, row) => { mkdirSync(join(dir, 'holds'), { recursive: true }); appendFileSync(join(dir, HOLDS_FILE), JSON.stringify(row) + '\n'); };
