// Holds (the coordinator's design, 5 Nov 01:13, answering Bob's question why work was silently
// limited: on 4 Nov the coordinator's "about 6 job sessions at most" kept BOB near 6 of 20 for
// about 6 hours and nothing in Process3 saw it). A hold on startable work is a row on the
// state branch, never words: `p3 hold <scope> --why --by --until`, ended by `p3 hold --end <id>` or
// its end. Scope: module:<id>, layer:<n> or slots:<n>. job start counts the cap less the live slot holds
// (cap.mjs) and the idle check counts no held module; status prints every hold first; the sweep alarms
// on idle capacity whatever holds there are. A hold lasts until the pull requests it names (--prs)
// have landed on the tranche, or its --until time, whichever comes first (coordinator's check audit, 5 Nov
// 19:30: no forced renewal); no hold needs Bob (coordinator's correction, 5 Nov). report tranche lists hold-hours
// by setter and reason.
import { appendFileSync, mkdirSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { layerOf } from './metrics.mjs';
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { exists, fail, git, loadConfig, now } from './util.mjs';
import { LANDED, condText, firstMet, fromText, parseConditions, readFacts } from './ends.mjs';

// The pull requests landed on ref, by number, each with the time its merge was committed: the
// tranche's first-parent merges, as merge, merge --plain and GitHub title them. null when unread.
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

// A hold's conditions (R13, ends.mjs): its when list (every row written since carries one, empty
// or not), or, only on a row from before them, the one its words plainly give (fromText);
// { conds, from } or { unparsed }.
export function holdConds(h) {
  if (Array.isArray(h.when)) return { conds: h.when, from: h.when.length ? 'when' : null };
  const f = fromText(h.why);
  return f.conds ? { conds: f.conds, from: 'words' } : { conds: [], unparsed: f.unparsed };
}

// Every hold row, with its end row folded in: live, expired or ended at t. landed: landedPRs, or
// null when unread; a hold naming pull requests then stays live (until its --until time).
// done: when its named pull requests had all landed (ms), else null. facts (ends.mjs readFacts):
// a hold one of whose conditions is met holds nothing (met: { c, why }), and the tool writes its
// end row at its next write (expireHolds); without facts, conditions are not judged.
export function holdsOf(rows, t = Date.now(), landed = null, facts = null) {
  const ended = new Map(rows.filter((r) => r.row === 'end').map((r) => [r.id, r]));
  return rows.filter((r) => r.row === 'hold').map((h) => {
    const [, kind, value] = h.scope.match(SCOPE) || [];
    const left = h.until ? Date.parse(h.until) - t : Infinity;
    const prs = Array.isArray(h.prs) ? h.prs : [];
    const done = prs.length && landed && prs.every((n) => landed.has(n)) ? Math.max(...prs.map((n) => landed.get(n))) : null;
    const open = prs.filter((n) => !landed?.has(n));
    const c = holdConds(h);
    const met = facts && !ended.has(h.id) ? firstMet(c.conds, facts) : null;
    return { ...h, kind, value, ended: ended.get(h.id) || null, left, done, open, conds: c.conds, conds_from: c.from || null, unparsed: c.unparsed || null, met, live: !ended.has(h.id) && left > 0 && !(done !== null && done <= t) && !met };
  });
}

export function readHolds(root, sb, { offline = false, t = Date.now(), facts, listed = null } = {}) {
  if (!offline) fetchState(root, sb);
  const rows = jsonl(readState(root, sb, HOLDS_FILE));
  let landed = null;
  let cfg = null;
  try { cfg = loadConfig(root); } catch { cfg = null; }
  if (rows.some((r) => r.row === 'hold' && Array.isArray(r.prs) && r.prs.length)) {
    try { const tr = cfg.tranche; landed = landedPRs(root, `origin/${tr}`) || landedPRs(root, tr); } catch { landed = null; }
  }
  // Conditions are judged whenever a hold carries one and the facts can be read.
  let f = facts ?? null;
  if (f === null && facts === undefined && cfg && rows.some((r) => r.row === 'hold' && holdConds(r).conds.length)) {
    try { f = readFacts(root, cfg, { listed, t, landed: landed || undefined }); } catch { f = null; }
  }
  return holdsOf(rows, t, landed, f);
}

// The holds whose condition is met, ended by the tool (R13): an end row each, by process3, naming
// the condition, in one write. Run at the tool's writes (p3.mjs after an act, layer open, the
// sweep). No person's act and nothing judged by a permission check: the condition was recorded
// with the hold. Returns the ids ended.
export const BY_TOOL = 'process3';
export function expireHolds(root, sb, { facts, log = console.log, t = Date.now() } = {}) {
  const ending = readHolds(root, sb, { t, ...(facts !== undefined ? { facts } : {}) }).filter((h) => h.met && !h.ended && h.left > 0);
  if (!ending.length) return [];
  const { wrote } = writeState(root, sb, `hold: end ${ending.map((h) => h.id).join(', ')} (condition met)`, (dir) => {
    // Read again inside the write: one ended meanwhile is not ended twice, nor said ended here.
    const f = join(dir, HOLDS_FILE);
    const done = new Set((existsSync(f) ? jsonl(readFileSync(f, 'utf8')) : []).filter((r) => r.row === 'end').map((r) => r.id));
    const mine = ending.filter((h) => !done.has(h.id));
    for (const h of mine) put(dir, { at: now(), row: 'end', id: h.id, by: BY_TOOL, why: `condition met: ${h.met.why}`, condition: h.met.c, ...(h.conds_from === 'words' ? { read_from_words: true } : {}) });
    return { wrote: mine.map((h) => h.id) };
  });
  const ids = new Set(wrote || []);
  for (const h of ending.filter((x) => ids.has(x.id))) log(`${h.id} ended by the tool: ${h.scope} holds nothing now (${h.met.why}${h.conds_from === 'words' ? ', read from its words' : ''})`);
  return [...ids];
}

// The lines status prints first: each live hold, then each expired in the last day.
export function holdLines(holds) {
  const live = holds.filter((h) => h.live);
  // A hold whose condition is met holds nothing; the tool writes its end at its next write (R13).
  const met = holds.filter((h) => h.met && !h.ended && h.left > 0);
  const expired = holds.filter((h) => !h.live && !h.ended && !met.includes(h) && t0(h) < SHOWN_EXPIRED_H * 36e5);
  if (!live.length && !expired.length && !met.length) return ['holds: none'];
  return [`holds: ${live.length} live${met.length ? `, ${met.length} with its condition met` : ''}${expired.length ? `, ${expired.length} expired` : ''} (only a recorded hold holds startable work below the cap)`,
    ...met.map((h) => `- ${h.id} ${h.scope}, by ${h.by}: holds nothing, ${h.met.why}${h.conds_from === 'words' ? ' (read from its words)' : ''}; the tool ends it at its next write: ${h.why}`),
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
export function hold(root, scope, { why, by, until, prs, when, end, log = console.log } = {}) {
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
    log(`${h.id} ended: ${h.scope} holds nothing now; its jobs can start (layer jobs <n>)`);
    return { ended: h.id };
  }
  const m = String(scope ?? '').match(SCOPE);
  if (!m || (m[1] !== 'module' && !/^\d+$/.test(m[2])) || (m[1] === 'slots' && Number(m[2]) < 1)) fail(`hold <scope>: module:<id>, layer:<n> or slots:<n>, not ${JSON.stringify(scope)}`);
  if (typeof why !== 'string' || !why.trim()) fail('--why "<the reason, in words a reader can check>"');
  const nums = prs === undefined ? [] : String(prs).split(',').map((x) => x.trim());
  if (prs === true || nums.some((x) => !/^[1-9]\d*$/.test(x))) fail(`--prs <n>[,<n>...]: the pull requests the hold waits on, not ${JSON.stringify(prs)}`);
  // A hold carries an end the tool can check (R13): its pull requests, a condition (--when), or
  // an expiry time; words alone are refused. Words that plainly give a condition (until layer 6
  // closes) record it, said.
  let conds = [];
  if (when !== undefined) { try { conds = parseConditions(when === true ? '' : when); } catch (e) { fail(`--when ${e.message}`); } if (!conds.length) fail('--when <condition>[,<condition>...]: layer_closed:<n>, layer_open:<n>, pr_merged:<n>, module_complete:<id>, session_gone:<id>, at:<ISO time>'); }
  // Words are read only when nothing else ends the hold: a --prs or --until hold keeps the ends
  // it was given (a condition read from its words would end it sooner).
  const read = !conds.length && until === undefined && !nums.length ? fromText(why).conds || [] : [];
  if (until === undefined && !nums.length && !conds.length && !read.length) fail('--prs <n>[,<n>...] (the pull requests whose land ends the hold), --when <condition> (layer_closed:<n>, layer_open:<n>, pr_merged:<n>, module_complete:<id>, session_gone:<id>) or --until <ISO time | <n>m | <n>h>: an end the tool can check; words alone are refused');
  conds = conds.length ? conds : read;
  // A condition already met ends nothing later: refused, so a hold is never ended as it is made.
  if (conds.length) {
    let f = null;
    try { f = readFacts(root, cfg, { t }); } catch { f = null; }
    const met = f ? firstMet(conds, f) : null;
    if (met) fail(`the condition ${condText(met.c)} is met already (${met.why}): a hold on it would hold nothing; nothing recorded`);
  }
  let at = null;
  if (until !== undefined) {
    const rel = String(until).match(/^(\d+)([mh])$/);
    at = rel ? t + Number(rel[1]) * (rel[2] === 'h' ? 36e5 : 6e4) : Date.parse(String(until));
    if (!(at > t)) fail(`--until <a future time (ISO) or <n>m or <n>h>, not ${JSON.stringify(until)}`);
  }
  // A hold on a scope still held, or held until the last hour, renews it: the chain stays visible.
  const prev = holds.filter((h) => h.scope === m[0] && !h.ended && h.left > -36e5 && !(h.done !== null && h.done < t - 36e5)).at(-1);
  const row = { row: 'hold', scope: m[0], why: why.trim(), by, ...(at !== null ? { until: new Date(at).toISOString().replace(/\.\d+Z$/, 'Z') } : {}), ...(nums.length ? { prs: [...new Set(nums.map(Number))] } : {}), when: conds, ...(prev ? { renews: prev.id } : {}) };
  if (read.length) log(`its words give the condition ${read.map(condText).join(', ')}: recorded with it; the tool ends the hold when it holds`);
  const { id } = writeState(root, sb, `hold: ${m[0]}`, (dir) => {
    const f = join(dir, HOLDS_FILE);
    const n = existsSync(f) ? jsonl(readFileSync(f, 'utf8')).filter((r) => r.row === 'hold').length + 1 : 1;
    put(dir, { at: now(), id: `hold-${n}`, ...row });
    return { id: `hold-${n}` };
  });
  log(`${id}: ${m[0]} held until ${[row.prs ? `PR ${row.prs.join(', ')} land${row.prs.length > 1 ? '' : 's'}` : '', row.when ? row.when.map(condText).join(' or ') : '', row.until ? `${row.until} (${min(at - t)} min)` : ''].filter(Boolean).join(' or ')}${prev ? `, renewing ${prev.id}` : ''}, by ${by}: ${row.why}. status prints it first; \`p3 hold --end ${id} --by <session>\` ends it`);
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
// block, a hold ended, a triage recorded; the sweep for a job session archived). status and every
// act of BOB's print startsOwedLine first, exit unchanged; a module's own acts are paid when its job
// lands on its layer (paidFor, layer land; R10), the rest by paidUpTo. The starter and job start --ready are removed.
export const OWED_FILE = 'flow/owed.json';
export function owes(name, a) {
  if (['merge', 'job complete', 'block'].includes(name)) return `${name} ${a._[0] ?? ''}`.trim();
  // A hold ended frees what it held.
  if (name === 'hold' && a.end !== undefined && a.end !== true) return `hold ended ${a.end}`;
  return name === 'notice triage' && a.record !== undefined ? `triage recorded ${a._[0] ?? ''}`.trim() : null;
}
export const bobAct = (name, a) => (name === 'job start' ? true : name === 'send' ? a.from === 'bob'
  : ['merge', 'layer join', 'layer clear', 'layer open', 'layer land', 'layer merge', 'notice triage', 'notice withdraw', 'tranche open', 'tranche close', 'lane ask', 'handoff', 'hold', 'found', 'pin move', 'release dev', 'deploy dev', 'walk internal'].includes(name));
export function readOwed(root, sb) { try { return JSON.parse(readState(root, sb, OWED_FILE) || 'null'); } catch { return null; } }
export const startsOwedLine = (o) => `starts owed since ${o.since} (${o.acts.map((x) => x.act).slice(-3).join('; ')}): run status --role bob, then each \`job start\` its \`jobs to start\` lists (layer jobs <n>)`;
// In a state worktree: owe(act) keeps the first act's time; paidFor(ids) drops a module's own acts.
export function owe(dir, act) {
  const f = join(dir, OWED_FILE);
  let o = null;
  try { o = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; } catch { o = null; }
  mkdirSync(join(dir, 'flow'), { recursive: true });
  writeFileSync(f, JSON.stringify({ since: o?.since || now(), acts: [...(o?.acts || []).slice(-9), { at: now(), act }] }) + '\n');
}
// What BOB has acted on: a job start or a layer open pays the acts owed before it began; the
// sweep pays all when the open layer lists nothing to start, or no layer is left (cold review of
// PR 191: hold ended, triage recorded, merge and an archived session were never paid otherwise).
export function paidUpTo(dir, begun) {
  const f = join(dir, OWED_FILE);
  let o = null;
  try { o = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; } catch { o = null; }
  if (!o) return false;
  const later = (o.acts || []).filter((x) => Date.parse(x.at) > Date.parse(begun));
  if (later.length) writeFileSync(f, JSON.stringify({ since: later[0].at, acts: later }) + '\n');
  else rmSync(f, { force: true });
  return true;
}
export const paysOwed = (name) => ['job start', 'layer open'].includes(name);
// The layer flow (coordinator, 6 Nov 16:03: "starts owed since 05:29Z (network-notices, case-checker,
// case-inputs)" stood after their re-tests landed): job start --ready never runs there, so a module's
// own acts (its job complete, its block) are paid when its job or retest lands on the layer.
export function paidFor(dir, ids) {
  const f = join(dir, OWED_FILE);
  let o = null;
  try { o = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; } catch { o = null; }
  if (!o) return false;
  const mine = (x) => ids.some((id) => new RegExp(`^(job complete|block) ${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`).test(String(x.act)));
  const left = (o.acts || []).filter((x) => !mine(x));
  if (left.length === (o.acts || []).length) return false;
  if (left.length) writeFileSync(f, JSON.stringify({ since: left[0].at, acts: left }) + '\n');
  else rmSync(f, { force: true });
  return true;
}
