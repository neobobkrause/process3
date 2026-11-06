// Holds (Bob, 5 Nov: on 4 Nov the coordinator's "about 6 job sessions at most" kept BOB near 6 of
// 20 for about 6 hours and nothing in Process3 saw it). A hold on startable work is a row on the
// state branch, never words: `p3 hold <scope> --why --by --until`, ended by `p3 hold --end <id>` or
// its end. Scope: module:<id>, layer:<n> or slots:<n>. job start --ready starts to the cap less
// the live slot holds and starts no held module; status prints every hold first; the sweep alarms
// on idle capacity whatever holds there are. A hold lasts until the pull requests it names (--prs)
// have landed on the tranche, or its --until time, whichever comes first (Bob, 5 Nov: no forced
// renewal); no hold needs Bob (coordinator's correction, 5 Nov). report tranche lists hold-hours
// by setter and reason.
import { appendFileSync, mkdirSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { layerOf } from './metrics.mjs';
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { exists, fail, git, loadConfig, now } from './util.mjs';

// The pull requests landed on ref, by number, each with the time its merge was committed: the
// tranche's first-parent merges, as merge, merge --plain and GitHub title them. null when unread.
const LANDED = /^Merge (?:job PR |PR |pull request #)(\d+)\b/;
export function landedPRs(root, ref) {
  const r = git(['log', '--first-parent', '--format=%ct %s', ref], { cwd: root, allowFail: true });
  if (r.code !== 0) return null;
  const m = new Map();
  for (const l of r.stdout.split('\n')) {
    const x = l.match(/^(\d+) (.*)$/);
    const n = x && x[2].match(LANDED);
    if (n && !m.has(Number(n[1]))) m.set(Number(n[1]), Number(x[1]) * 1000);
  }
  return m;
}

export const HOLDS_FILE = 'holds/holds.jsonl';
const SHOWN_EXPIRED_H = 24; // an expired hold is printed as expired for a day
const SCOPE = /^(module|layer|slots):([A-Za-z0-9._/-]+)$/;
const min = (ms) => Math.round(ms / 6e4);

// Every hold row, with its end row folded in: live, expired or ended at t. landed: landedPRs, or
// null when unread; a hold naming pull requests then stays live (until its --until time).
// done: when its named pull requests had all landed (ms), else null.
export function holdsOf(rows, t = Date.now(), landed = null) {
  const ended = new Map(rows.filter((r) => r.row === 'end').map((r) => [r.id, r]));
  return rows.filter((r) => r.row === 'hold').map((h) => {
    const [, kind, value] = h.scope.match(SCOPE) || [];
    const left = h.until ? Date.parse(h.until) - t : Infinity;
    const prs = Array.isArray(h.prs) ? h.prs : [];
    const done = prs.length && landed && prs.every((n) => landed.has(n)) ? Math.max(...prs.map((n) => landed.get(n))) : null;
    const open = prs.filter((n) => !landed?.has(n));
    return { ...h, kind, value, ended: ended.get(h.id) || null, left, done, open, live: !ended.has(h.id) && left > 0 && !(done !== null && done <= t) };
  });
}

export function readHolds(root, sb, { offline = false, t = Date.now() } = {}) {
  if (!offline) fetchState(root, sb);
  const rows = jsonl(readState(root, sb, HOLDS_FILE));
  let landed = null;
  if (rows.some((r) => r.row === 'hold' && Array.isArray(r.prs) && r.prs.length)) {
    try { const tr = loadConfig(root).tranche; landed = landedPRs(root, `origin/${tr}`) || landedPRs(root, tr); } catch { landed = null; }
  }
  return holdsOf(rows, t, landed);
}

// The lines status prints first: each live hold, then each expired in the last day.
export function holdLines(holds) {
  const live = holds.filter((h) => h.live);
  const expired = holds.filter((h) => !h.live && !h.ended && t0(h) < SHOWN_EXPIRED_H * 36e5);
  if (!live.length && !expired.length) return ['holds: none'];
  return [`holds: ${live.length} live${expired.length ? `, ${expired.length} expired` : ''} (only a recorded hold holds startable work below the cap)`,
    ...live.map((h) => `- ${h.id} ${h.scope}, by ${h.by}${h.renews ? `, renewing ${h.renews}` : ''}, ${[h.open?.length ? `until PR ${h.open.join(', ')} land${h.open.length > 1 ? '' : 's'}` : '', Number.isFinite(h.left) ? `${min(h.left)} min to expiry` : ''].filter(Boolean).join(', or ')}: ${h.why}`),
    ...expired.map((h) => `- ${h.id} ${h.scope}, by ${h.by}: ${h.done !== null && h.done <= Date.now() + h.left ? 'its PRs landed' : 'expired'} ${min(t0(h))} min ago, holds nothing: ${h.why}`)];
}
// How long ago a hold that is not live stopped holding (ms): its PRs' land or its expiry, the first.
const t0 = (h) => Date.now() - Math.min(h.done ?? Infinity, Number.isFinite(h.left) ? Date.now() + h.left : Infinity);

export const slotsHeld = (holds) => holds.filter((h) => h.live && h.kind === 'slots').reduce((s, h) => s + Number(h.value), 0);
// The live hold on a startable module ({ id }), by its module or its layer (layers: layerOf's map).
export const heldBy = (holds, id, layers) => holds.find((h) => h.live && ((h.kind === 'module' && h.value === id) || (h.kind === 'layer' && layers.get(id) === Number(h.value)))) || null;
export const layersAt = (root, cfg, ref = `origin/${cfg.tranche}`) => layerOf(exists(root, ref, cfg.layers_file) ? git(['show', `${ref}:${cfg.layers_file}`], { cwd: root }) : null);

// p3 hold <scope> --why "..." --by <session> (--prs <n>[,<n>...] and/or --until <ISO time | <n>m | <n>h>);
// p3 hold --end <id> --by <session>.
export function hold(root, scope, { why, by, until, prs, end, log = console.log } = {}) {
  const cfg = loadConfig(root);
  const sb = cfg.state_branch;
  if (typeof by !== 'string' || !/^session_[A-Za-z0-9]+$/.test(by)) fail('--by <your session id (session_...)>');
  const t = Date.now();
  const holds = readHolds(root, sb, { t });
  if (end !== undefined) {
    const h = holds.find((x) => x.id === end);
    if (!h) fail(`no hold ${JSON.stringify(end)} on ${sb}:${HOLDS_FILE}`);
    if (!h.live) fail(`${h.id} holds nothing already (${h.ended ? 'ended' : h.done !== null && h.done <= t ? 'its PRs landed' : 'expired'})`);
    writeState(root, sb, `hold: end ${h.id}`, (dir) => { put(dir, { at: now(), row: 'end', id: h.id, by }); return {}; });
    log(`${h.id} ended: ${h.scope} holds nothing now; job start --ready starts what it held`);
    return { ended: h.id };
  }
  const m = String(scope ?? '').match(SCOPE);
  if (!m || (m[1] !== 'module' && !/^\d+$/.test(m[2])) || (m[1] === 'slots' && Number(m[2]) < 1)) fail(`hold <scope>: module:<id>, layer:<n> or slots:<n>, not ${JSON.stringify(scope)}`);
  if (typeof why !== 'string' || !why.trim()) fail('--why "<the reason, in words a reader can check>"');
  const nums = prs === undefined ? [] : String(prs).split(',').map((x) => x.trim());
  if (prs === true || nums.some((x) => !/^[1-9]\d*$/.test(x))) fail(`--prs <n>[,<n>...]: the pull requests the hold waits on, not ${JSON.stringify(prs)}`);
  if (until === undefined && !nums.length) fail('--prs <n>[,<n>...] (the pull requests whose land ends the hold) or --until <ISO time | <n>m | <n>h>, or both');
  let at = null;
  if (until !== undefined) {
    const rel = String(until).match(/^(\d+)([mh])$/);
    at = rel ? t + Number(rel[1]) * (rel[2] === 'h' ? 36e5 : 6e4) : Date.parse(String(until));
    if (!(at > t)) fail(`--until <a future time (ISO) or <n>m or <n>h>, not ${JSON.stringify(until)}`);
  }
  // A hold on a scope still held, or held until the last hour, renews it: the chain stays visible.
  const prev = holds.filter((h) => h.scope === m[0] && !h.ended && h.left > -36e5 && !(h.done !== null && h.done < t - 36e5)).at(-1);
  const row = { row: 'hold', scope: m[0], why: why.trim(), by, ...(at !== null ? { until: new Date(at).toISOString().replace(/\.\d+Z$/, 'Z') } : {}), ...(nums.length ? { prs: [...new Set(nums.map(Number))] } : {}), ...(prev ? { renews: prev.id } : {}) };
  const { id } = writeState(root, sb, `hold: ${m[0]}`, (dir) => {
    const f = join(dir, HOLDS_FILE);
    const n = existsSync(f) ? jsonl(readFileSync(f, 'utf8')).filter((r) => r.row === 'hold').length + 1 : 1;
    put(dir, { at: now(), id: `hold-${n}`, ...row });
    return { id: `hold-${n}` };
  });
  log(`${id}: ${m[0]} held until ${[row.prs ? `PR ${row.prs.join(', ')} land${row.prs.length > 1 ? '' : 's'}` : '', row.until ? `${row.until} (${min(at - t)} min)` : ''].filter(Boolean).join(' or ')}${prev ? `, renewing ${prev.id}` : ''}, by ${by}: ${row.why}. status prints it first; \`p3 hold --end ${id} --by <session>\` ends it`);
  return { id, ...row };
}

// Hold-hours in [from, to] by setter and reason (report tranche, beside cap use): each hold from its
// row to its end, its expiry, its named pull requests' land or `to`, whichever is first, overlapping
// renewals counted once; the most first. landed: landedPRs, or null (a PR hold then runs to `to`).
export function holdHours(rows, from, to, landed = null) {
  const [a, b] = [Date.parse(from) || -Infinity, Date.parse(to)];
  const by = new Map();
  for (const h of holdsOf(rows, b, landed)) {
    const span = [Math.max(a, Date.parse(h.at)), Math.min(b, h.until ? Date.parse(h.until) : Infinity, Date.parse(h.ended?.at) || Infinity, h.done ?? Infinity)];
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

// The holds a layer's open ends (coordinator, 6 Nov: holds recorded "until layer 6 closes", and a
// session's hold --end of one was refused as weakening security): each live hold whose scope is only
// modules of layer n (layer:<n>, or module:<id> of one of mods), with the end row hold --end
// writes, its why naming the open. A hold on any other module, layer or on slots stays.
export function endLayerHolds(root, sb, n, mods, { by, log = console.log, t = Date.now() } = {}) {
  const mine = new Set(mods);
  const ending = readHolds(root, sb, { t }).filter((h) => h.live && ((h.kind === 'layer' && Number(h.value) === n) || (h.kind === 'module' && mine.has(h.value))));
  if (!ending.length) return [];
  const why = `ended by layer open ${n}`;
  writeState(root, sb, `hold: end ${ending.map((h) => h.id).join(', ')} (layer open ${n})`, (dir) => {
    for (const h of ending) put(dir, { at: now(), row: 'end', id: h.id, by, why });
    return {};
  });
  for (const h of ending) log(`${h.id} ended: ${h.scope} holds nothing now (${why})`);
  return ending.map((h) => h.id);
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
