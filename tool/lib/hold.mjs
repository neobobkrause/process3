// Holds (Bob, 5 Nov: on 4 Nov the coordinator's "about 6 job sessions at most" kept BOB near 6 of
// 20 for about 6 hours and nothing in Process3 saw it). A hold on startable work is a row on the
// state branch, never words: `p3 hold <scope> --why --by --until`, ended by `p3 hold --end <id>` or
// its expiry. Scope: module:<id>, layer:<n> or slots:<n>. job start --ready starts to the cap less
// the live slot holds and starts no held module; status prints every hold first; the sweep alarms
// on idle capacity whatever holds there are. A hold over HOLD_MAX_H hours, or on more than a
// quarter of the cap, is Bob's alone: his word is his own commit through GitHub's website (the
// record the merge tool trusts for anchored keys, webCommitByOwner) whose message names the hold.
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { layerOf } from './metrics.mjs';
import { webCommitByOwner } from './record.mjs';
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { exists, fail, git, jobCap, loadConfig, now } from './util.mjs';

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
    ...live.map((h) => `- ${h.id} ${h.scope}, by ${h.by}${h.word ? ` (Bob's word ${h.word.slice(0, 10)})` : ''}, ${min(h.left)} min to expiry: ${h.why}`),
    ...expired.map((h) => `- ${h.id} ${h.scope}, by ${h.by}: expired ${min(-h.left)} min ago, holds nothing: ${h.why}`)];
}

export const slotsHeld = (holds) => holds.filter((h) => h.live && h.kind === 'slots').reduce((s, h) => s + Number(h.value), 0);
// The live hold on a startable module ({ id }), by its module or its layer (layers: layerOf's map).
export const heldBy = (holds, id, layers) => holds.find((h) => h.live && ((h.kind === 'module' && h.value === id) || (h.kind === 'layer' && layers.get(id) === Number(h.value)))) || null;
export const layersAt = (root, cfg, ref = `origin/${cfg.tranche}`) => layerOf(exists(root, ref, cfg.layers_file) ? git(['show', `${ref}:${cfg.layers_file}`], { cwd: root }) : null);

// p3 hold <scope> --why "..." --by <session|bob> --until <ISO time | <n>m | <n>h> [--word <sha>]; p3 hold --end <id> --by <session>.
export function hold(root, scope, { why, by, until, word, end, io = {}, log = console.log } = {}) {
  const cfg = loadConfig(root);
  const sb = cfg.state_branch;
  if (typeof by !== 'string' || !/^(session_[A-Za-z0-9]+|bob)$/.test(by)) fail('--by <your session id (session_...)>, or bob with --word <sha>');
  const t = Date.now();
  if (end !== undefined) {
    const h = readHolds(root, sb, { t }).find((x) => x.id === end);
    if (!h) fail(`no hold ${JSON.stringify(end)} on ${sb}:${HOLDS_FILE}`);
    if (!h.live) fail(`${h.id} holds nothing already (${h.ended ? 'ended' : 'expired'})`);
    if (h.word) fail(`${h.id} is Bob's hold; only Bob ends it, and it expires at ${h.until}`);
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
  const cap = jobCap(cfg).cap;
  const weight = m[1] === 'slots' ? Number(m[2]) : m[1] === 'module' ? 1 : [...layersAt(root, cfg).values()].filter((n) => n === Number(m[2])).length;
  const big = [at - t > HOLD_MAX_H * 36e5 && `longer than ${HOLD_MAX_H} hours`, weight > cap / 4 && `on ${weight} slots, more than a quarter of the cap ${cap}`].filter(Boolean);
  if (big.length) {
    const only = `refused: a hold ${big.join(' and ')} only Bob can set: his own commit through GitHub's website whose message says "hold ${m[0]} <n>h" (or <n>m), used once, then --by bob --word <its sha> with --until no later than that from his commit`;
    if (by !== 'bob' || typeof word !== 'string') fail(only);
    const w = webCommitByOwner(root, word, cfg.approvals.owner, io.lookup);
    if (!w.ok) fail(`${only}; ${word} is not (${w.why})`);
    // Bound to this scope exactly, a time from his commit, and one hold (review of PR 139).
    const d = String(w.message || '').match(new RegExp(`(?:^|\\s)hold ${m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (\\d+)([mh])(?:\\s|[.,;]|$)`));
    if (!d) fail(`${only}; ${word}'s message does not name it`);
    if (!(at <= Date.parse(w.date) + Number(d[1]) * (d[2] === 'h' ? 36e5 : 6e4))) fail(`${only}; --until is past the ${d[1]}${d[2]} his word gives from ${w.date}`);
    if (readHolds(root, sb, { t }).some((h) => h.word === word)) fail(`${only}; ${word} already set a hold`);
  } else if (by === 'bob') fail('--by bob only with --word <sha> for a hold only Bob can set; otherwise --by <your session id>');
  const row = { row: 'hold', scope: m[0], why: why.trim(), by, until: new Date(at).toISOString().replace(/\.\d+Z$/, 'Z'), ...(big.length ? { word } : {}) };
  const { id } = writeState(root, sb, `hold: ${m[0]}`, (dir) => {
    const f = join(dir, HOLDS_FILE);
    const n = existsSync(f) ? jsonl(readFileSync(f, 'utf8')).filter((r) => r.row === 'hold').length + 1 : 1;
    put(dir, { at: now(), id: `hold-${n}`, ...row });
    return { id: `hold-${n}` };
  });
  log(`${id}: ${m[0]} held until ${row.until} (${min(at - t)} min), by ${by}: ${row.why}. status prints it first; \`p3 hold --end ${id} --by <session>\` ends it`);
  return { id, ...row };
}

const put = (dir, row) => { mkdirSync(join(dir, 'holds'), { recursive: true }); appendFileSync(join(dir, HOLDS_FILE), JSON.stringify(row) + '\n'); };
