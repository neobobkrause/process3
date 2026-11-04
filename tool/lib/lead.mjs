// Lead times (Bob's urgency): how long work waits at each step, from rows the record already
// holds: start, complete (receipt) and merge rows, the pull request's gate rows, the ledger
// entry's history (BLOCKED) on the job branch and the tranche, the state branch's layer close,
// tranche open, restart and message rows. Only this tranche counts: attempts started at or after
// its opening, and BLOCKED time, stops and messages dated since. Every figure a row or the
// history is missing for reads "unmeasured"; each is set beside its target.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { entryFile } from './ledger.mjs';
import { readModules } from './notice.mjs';
import { messages } from './state.mjs';
import { DEFAULTS, git } from './util.mjs';

const U = 'unmeasured';
const MIN = 60000;
const out = (root, args) => { const r = git(args, { cwd: root, allowFail: true }); return r.code === 0 ? r.stdout : null; };
const mins = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / MIN * 10) / 10;
const byAt = (a, b) => a.at.localeCompare(b.at);
const first = (xs) => [...xs].sort(byAt)[0];
const later = (a, b) => (Date.parse(a) >= Date.parse(b) ? a : b);

// The state branch's restart rows: job start --restart records one per replacement session.
export const RESTARTS_FILE = 'metrics/restart.jsonl';

export const ATTEMPTS_RULE = "an attempt is a start row dated at or after the tranche's opening, at the tranche's tip or on its module's job branch (job/<module>, where an unmerged attempt's rows live); the same row in both counts once";
export const TARGETS = DEFAULTS.targets;
// Each figure and the target it is set beside (started to PR ready and blocked have none).
const TARGET_OF = { ready_to_start: 'start_minutes', start_to_pr_ready: null, green_to_merge: 'merge_minutes', blocked: null, replace: 'replace_minutes', report_wait: 'decision_minutes', close_to_next_start: 'start_minutes' };
export const LEAD_RULE = `Only this tranche counts: it opened at the first ok grant row of its open after its last tranche close, or with none since, of the open that close closed (none read: every figure unmeasured); its jobs are the modules with a start row since, at ref or on its job branch, each start row an attempt; BLOCKED time, stops and messages count from the opening. ready to start: from the job's ready time to its first start row since, 0 when its first start came before it (whatever later starts); its ready time, with open_by "uses" and a uses entry in the modules file, the latest of the tranche's opening and each module in its uses' merge (that module's last merge row at or before the job's first start, of this tranche or earlier; none by then and its own job started by then: its first merge after, so 0, or, unmerged, the job reads started before it merged; otherwise the opening; not in the layer map: unmeasured), and otherwise (open_by "layer", or no uses entry) its layer's opening (the close row of the layer below it in the layer map, of this tranche as status counts it: its commit not on main; for the lowest layer, the tranche's opening; unmeasured when that is); its cause, for a wait over its target where the record shows one: a sweep row between the ready time and the start that found the live cap full, else its ledger entry's state at the ready time when not OPEN; attempts: ${ATTEMPTS_RULE}; per attempt (the job shows its worst, naming it): start to PR ready, the start row to its complete row (the receipt: the next complete row before the next start); green to merge, the first gate row with ok true on the receipt's pull request at or after the receipt to its merge row (unmerged: to now, open; no such row yet: not green); blocked (no target): the minutes its ledger entry spent BLOCKED, from the job branch's first-parent history while the job is unmerged (from a start row to its merge row) and the tranche's otherwise, each from the commit that made it BLOCKED to the next that did not (to now while it still is); replace: from each stop (a BLOCKED commit, as blocked reads it, or the stop a restart row names: the job's last push) to the replacement's start (the first restart row since; or the entry leaving BLOCKED; to now while neither; a later restart row in the same BLOCKED from the restart before it); each replace figure names its stop's source (blocked: a BLOCKED commit; archived or idle: as the restart row records it; last push: how it stopped not recorded) and, when restarts were logged within a minute of each other, the batch it was restarted in (one act of restarting several jobs, each figure still its own job's); a block deferred at a layer close (its pull request closed unmerged) leaves blocked and replace; report wait: each message from the job (sender named as its module) to bob or root, to the first later message from that recipient naming it as <sender>-<n> (to now while none does); close to next start: each layer close row of this tranche to the first start row after it (to now while none). History not read, or cut before the opening in a shallow clone, reads unmeasured. A figure measured to now is marked open. Median (the mean of the two middles for an even count) over the figures not open; worst over all, open ones included and marked; the jobs unmeasured counted.`;

// The tranche's opening, the one source every figure scoped to this tranche reads (lead times,
// the report's elapsed time, overhead, merges, refusals): the first ok grant row of its open
// (leadInputs picks the open). null when none is read.
export const openedAt = (grants, cfg) => (grants || []).filter((r) => r.row === 'grant' && r.tranche === cfg.tranche && r.outcome === 'ok' && typeof r.at === 'string').map((r) => r.at).sort()[0] || null;

// One row read twice (at ref and on its job branch) counts once. An attempt row is the same row
// when its module, event, attempt and time agree, whatever else it carries; any other row when
// it is identical.
export const rowKey = (r) => (r.row === 'attempt' ? JSON.stringify(['attempt', r.event, r.module, r.attempt ?? null, r.at, r.role || 'job', r.session ?? null]) : JSON.stringify(r));
export function distinctRows(rows) {
  const seen = new Set();
  return rows.filter((r) => { const k = rowKey(r); if (seen.has(k)) return false; seen.add(k); return true; });
}

// This tranche's rows: those at ref and on the job branches, each once, dated at or after the
// opening. With the opening unread, null.
export const trancheRows = (rows, jobRows, opened) => (opened ? distinctRows([...rows, ...jobRows]).filter((r) => typeof r.at === 'string' && Date.parse(r.at) >= Date.parse(opened)) : null);

// The attempts this tranche started, the one definition metrics report and report tranche
// share: each start row since the opening, at the tranche's tip or on its module's job branch,
// the same row in both once. module -> count.
export function attemptsStarted(rows) {
  const n = new Map();
  for (const r of rows) if (r.row === 'attempt' && r.event === 'start' && r.module) n.set(r.module, (n.get(r.module) || 0) + 1);
  return n;
}

// Restarts logged close together are one batch (one act of BOB's restarting several jobs): rows
// within BATCH_MS of the one before them. restart row -> { n, from, to } for batches of two or more.
export const BATCH_MS = 60000;
export function restartBatches(restarts) {
  const rs = (restarts || []).filter((r) => r.row === 'restart' && typeof r.at === 'string').sort(byAt);
  const out = new Map();
  let group = [];
  const flush = () => { if (group.length > 1) for (const r of group) out.set(r, { n: group.length, from: group[0].at, to: group.at(-1).at }); group = []; };
  for (const r of rs) {
    if (group.length && Date.parse(r.at) - Date.parse(group.at(-1).at) > BATCH_MS) flush();
    group.push(r);
  }
  flush();
  return out;
}
// A stop's source: blocked (a BLOCKED commit), archived or idle (as the restart row records it),
// or last push (the session stopped, how not recorded).
const stopSource = (r) => (r.stop ? r.stop : r.stopped_by === 'BLOCKED' || r.state === 'BLOCKED' ? 'blocked' : r.stopped_by || 'stopped');

// A message's wait for its answer: from S to R (bob or root), until R's first later message names S-n.
export function reportWaits(msgs, now) {
  const by = (f) => msgs.filter((m) => m.from === f);
  return msgs.filter((m) => ['bob', 'root'].includes(m.to) && m.from !== m.to && typeof m.at === 'string').map((m) => {
    const id = new RegExp(`(^|[^\\w-])${m.from}-${m.n}(?!\\d)`);
    const a = by(m.to).filter((b) => b.at >= m.at && id.test(b.text || '')).sort((x, y) => x.at.localeCompare(y.at))[0];
    return { from: m.from, n: m.n, to: m.to, minutes: mins(m.at, a ? a.at : now), ...(a ? {} : { open: true }) };
  });
}

// The commits this shallow clone's history is cut at (empty in a full clone).
function cuts(root) {
  if ((out(root, ['rev-parse', '--is-shallow-repository']) || '').trim() !== 'true') return null;
  const f = (out(root, ['rev-parse', '--git-path', 'shallow']) || '').trim();
  try { return new Set(readFileSync(resolve(root, f), 'utf8').split('\n').filter(Boolean)); } catch { return new Set(); }
}

// A ledger entry's states along ref's first-parent line, oldest first: [{ at, state }] (state
// null where the entry is absent). null when ref is unread, or when this clone's history of that
// line is cut after `from` (a shallow clone), so the state at `from` is not known.
export function entryHistory(root, ref, id, from = null) {
  if (!ref || out(root, ['rev-parse', '-q', '--verify', `${ref}^{commit}`]) === null) return null;
  const cut = cuts(root);
  if (cut && from) {
    const line = (out(root, ['rev-list', '--first-parent', '--format=%H %cI', '--no-commit-header', ref]) || '').trim().split('\n').filter(Boolean);
    const [sha, at] = (line.at(-1) || '').split(' ');
    if (!sha || (cut.has(sha) && Date.parse(at) > Date.parse(from))) return null;
  }
  const log = out(root, ['log', '--first-parent', '--reverse', '--format=%H %cI', ref, '--', entryFile(id)]);
  if (log === null) return null;
  return log.split('\n').filter(Boolean).map((l) => {
    const [sha, at] = l.split(' ');
    let state = null;
    try { state = JSON.parse(out(root, ['show', `${sha}:${entryFile(id)}`]) || 'null')?.status?.state ?? null; } catch { state = null; }
    return { at: new Date(at).toISOString(), state };
  });
}

const stateAt = (h, t) => { let s = null; for (const p of h) { if (Date.parse(p.at) <= Date.parse(t)) s = p.state; else break; } return s; };

// The intervals a job's entry was BLOCKED, [{ from, to }] (to null while it still is), from
// `opened` to now: at each moment the job branch's history while the job is unmerged (its latest
// start or merge row before then is a start), the tranche's otherwise. null when a history needed
// is unread or cut.
function blocks(root, { ref, jobRef, id, starts, merges, opened, now }) {
  const tr = entryHistory(root, ref, id, opened);
  const firstStart = starts[0]?.at;
  const jb = firstStart ? entryHistory(root, jobRef, id, firstStart) : [];
  if (tr === null || jb === null) return null;
  const events = [...starts.map((s) => ({ at: s.at, job: true })), ...merges.map((m) => ({ at: m.at, job: false }))].sort(byAt);
  const onJob = (t) => { let j = false; for (const e of events) { if (Date.parse(e.at) <= Date.parse(t)) j = e.job; else break; } return j; };
  const inSpan = (t) => Date.parse(t) > Date.parse(opened) && Date.parse(t) < Date.parse(now);
  const points = [...new Set([opened, ...[...tr, ...jb, ...events].map((p) => p.at).filter(inSpan)])].sort((a, b) => Date.parse(a) - Date.parse(b));
  const res = [];
  let since = null;
  for (const p of points) {
    const blocked = stateAt(onJob(p) ? jb : tr, p) === 'BLOCKED';
    if (blocked && since === null) since = p;
    else if (!blocked && since !== null) { res.push({ from: since, to: p }); since = null; }
  }
  if (since !== null) res.push({ from: since, to: null });
  return res;
}

// The median: the middle figure, or the mean of the two middles for an even count.
export const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return U;
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : Math.round((s[h - 1] + s[h]) / 2 * 10) / 10;
};
const fig = (cfg, key, v) => {
  if (v === U || v === null || v === undefined) return U;
  if (typeof v === 'string') return v;
  const o = typeof v === 'number' ? { minutes: v } : v;
  const t = TARGET_OF[key] ? cfg.targets?.[TARGET_OF[key]] : null;
  return { ...o, ...(Number.isFinite(t) ? { target: t, ...(o.minutes > t ? { mark: 'over' } : {}) } : {}) };
};
// A job's figure: its worst attempt's (open ones included), naming the attempt and any attempt
// unmeasured; with no attempt measured, unmeasured if any is, else the last attempt's word.
const worstOf = (per) => {
  const m = per.filter((p) => typeof p.f?.minutes === 'number');
  const un = per.filter((p) => p.f === U).map((p) => p.n);
  if (!m.length) return un.length ? U : per.at(-1).f;
  const w = m.reduce((a, b) => (b.f.minutes > a.f.minutes ? b : a));
  return { ...w.f, attempt: w.n, ...(un.length ? { unmeasured_attempts: un } : {}) };
};

// inputs: rows (metrics rows at ref), jobRows (each job branch's own rows, fetchJobs/leadFetch:
// a start or complete row lives on job/<id> until its merge; the same row twice counts once), layers (module -> layer), closed (this tranche's layer
// close rows, undecided ones marked undecided) / grants / restarts / msgs (state branch rows,
// null when unread), jobRefs (module -> its job branch ref fetched this run, null when origin has
// none; undefined when not read), comments(pr) (the pull request's gate runs; throws or null when
// unread), now.
export function leadTimes(root, cfg, { ref, rows, jobRows = [], layers = new Map(), closed = null, grants = null, restarts = null, msgs = null, sweeps = null, modules, jobRefs, comments = () => null, now = new Date().toISOString() } = {}) {
  const opened = openedAt(grants, cfg);
  const targets = { ...TARGETS, ...(cfg.targets || {}) };
  if (!opened) return { rule: LEAD_RULE, targets, opened: U, jobs: U, close_to_next_start: U, summary: Object.fromEntries(Object.keys(TARGET_OF).map((k) => [k, U])) };
  const since = (r) => typeof r.at === 'string' && Date.parse(r.at) >= Date.parse(opened);
  // Every merge row read, of this tranche or before: a provider's latest merge may predate it.
  const allMerges = distinctRows([...rows, ...jobRows]).filter((r) => r.row === 'merge' && typeof r.at === 'string');
  rows = trancheRows(rows, jobRows, opened);
  // open_by "uses": a module's providers, from the modules file at ref (absent: the layer rule).
  const byUses = (cfg.open_by ?? 'uses') === 'uses';
  if (modules === undefined) modules = byUses ? readModules(root, cfg, ref) : null;
  const usesOf = new Map((byUses && Array.isArray(modules) ? modules : []).filter((x) => x?.id && Array.isArray(x.uses)).map((x) => [x.id, x.uses.filter((p) => p !== x.id)]));
  const isStart = (r) => r.row === 'attempt' && r.event === 'start' && r.module;
  const mine = (closed || []).filter((r) => r.row === 'closed' && r.tranche === cfg.tranche && typeof r.at === 'string');
  const decided = mine.filter((r) => !r.undecided);
  const levels = [...new Set(layers.values())].sort((a, b) => a - b);
  const readyAt = (layer) => {
    if (layer === undefined) return null;
    const below = levels.filter((n) => n < layer).at(-1);
    if (below === undefined) return opened;
    return decided.filter((r) => r.layer === below).map((r) => r.at).sort()[0] || null;
  };
  // The closes that deferred a module BLOCKED (its pull request closed unmerged).
  const deferredAt = (m) => decided.filter((c) => c.deferred?.[m] && !Array.isArray(c.deferred[m]) && c.deferred[m].reason).map((c) => c.at).sort();
  // A module's ready time. open_by "uses", for a module with a `uses` entry: the latest of the
  // opening and each provider's merge (its last merge row at or before the module's first start,
  // this tranche's or earlier; with none by then, its first after, so the module started before
  // it was ready: 0; with no merge row at all, the opening). Otherwise its layer's opening
  // (readyAt). { at, by, waited_on }.
  const mergesOf = (p) => allMerges.filter((r) => r.module === p).map((r) => r.at).sort();
  const readyOf = (m, firstStart) => {
    const u = usesOf.get(m);
    if (!u) return { at: readyAt(layers.get(m)), by: 'layer' };
    let at = opened;
    let on = null;
    let early = null;
    for (const p of u) {
      if (layers.size && !layers.has(p)) return { at: null, by: 'uses', missing: p };
      const ms = mergesOf(p);
      const before = ms.filter((x) => !firstStart || Date.parse(x) <= Date.parse(firstStart)).at(-1);
      // No merge by the module's start: the provider was owed only if its own job had started by
      // then (the module started before it merged); a provider started later is a reopen.
      const owed = !before && firstStart && rows.some((r) => isStart(r) && r.module === p && Date.parse(r.at) <= Date.parse(firstStart));
      const t = before || (owed && ms.find((x) => Date.parse(x) > Date.parse(firstStart))) || opened;
      if (owed && !ms.some((x) => Date.parse(x) > Date.parse(firstStart))) early = p;
      if (Date.parse(t) > Date.parse(at)) { at = t; on = p; }
    }
    if (early) return { at: null, by: 'uses', early };
    return { at, by: 'uses', ...(on ? { waited_on: on } : {}) };
  };
  // What held a module past its ready time (a wait over its target), where the record shows it: a sweep at or after the
  // ready time and before its start that found the live cap full (live at or over live_cap), or
  // its ledger entry's state at the ready time (the tranche's history) when not OPEN.
  const causeOf = (m, ready, start) => {
    if (!ready || !start || Date.parse(start) <= Date.parse(ready)) return null;
    const full = (sweeps || []).filter((r) => r.row === 'sweep' && typeof r.at === 'string' && r.at >= ready && r.at < start && Number.isFinite(r.live) && Number.isFinite(r.live_cap) && r.live >= r.live_cap).sort(byAt)[0];
    if (full) return `live cap full (${full.live} of ${full.live_cap} at ${full.at})`;
    const h = ref ? entryHistory(root, ref, m, ready) : null;
    const st = h ? stateAt(h, ready) : null;
    if (st && st !== 'OPEN') return `its entry ${st} at the ready time`;
    return null;
  };
  const readComments = (pr) => { try { const a = comments(pr); return Array.isArray(a) ? a : null; } catch { return null; } };
  const mods = [...new Set(rows.filter(isStart).map((r) => r.module))].sort();
  const batches = restartBatches((restarts || []).filter((r) => r.tranche === cfg.tranche && since(r)));
  const batchOf = (r) => { const b = batches.get(r); return b ? { batch: { restarts: b.n, from: b.from, to: b.to } } : {}; };
  const jobs = mods.map((m) => {
    const own = rows.filter((r) => r.module === m);
    const starts = own.filter(isStart).sort(byAt);
    const merges = own.filter((r) => r.row === 'merge').sort(byAt);
    const deferrals = deferredAt(m);
    const rd = readyOf(m, starts[0]?.at);
    const ready = rd.at;
    const firstSince = ready && first(starts.filter((r) => r.at >= ready));
    const attempts = starts.map((s, i) => {
      const next = starts[i + 1]?.at;
      const n = typeof s.attempt === 'number' ? s.attempt : i + 1;
      const inWindow = (r) => r.at >= s.at && (!next || r.at < next);
      const complete = first(own.filter((r) => r.row === 'attempt' && r.event === 'complete' && inWindow(r) && (typeof r.attempt !== 'number' || typeof s.attempt !== 'number' || r.attempt === s.attempt)));
      const merge = complete && first(merges.filter((r) => r.pr === complete.pr && r.at >= complete.at));
      const deferred = !merge && deferrals.some((c) => c >= s.at && (!next || c < next));
      const ended = next || deferred;
      let ready_ = complete ? mins(s.at, complete.at) : deferred ? 'deferred' : next ? 'no receipt' : { minutes: mins(s.at, now), open: true };
      let green = U;
      if (!complete) green = deferred ? 'deferred' : 'no receipt';
      else {
        const runs = readComments(complete.pr);
        const g = runs && first(runs.filter((r) => r.ok === true && typeof r.at === 'string' && r.at >= complete.at && (!merge || r.at <= merge.at)));
        if (merge) green = g ? Math.max(0, mins(g.at, merge.at)) : U;
        else if (!runs) green = U;
        else if (ended) green = deferred ? 'deferred' : 'not merged';
        else green = g ? { minutes: mins(g.at, now), open: true, note: 'not merged' } : 'not green';
      }
      return { attempt: n, start: s.at, start_to_pr_ready: fig(cfg, 'start_to_pr_ready', ready_), green_to_merge: fig(cfg, 'green_to_merge', green) };
    });
    // BLOCKED, and the stops each replacement answered.
    const jobRef = jobRefs === undefined ? undefined : jobRefs.get?.(m);
    const bs = jobRef ? blocks(root, { ref, jobRef, id: m, starts, merges, opened, now }) : null;
    const kept = bs && bs.filter((b) => !deferrals.some((c) => Date.parse(c) >= Date.parse(b.from) && (b.to === null || Date.parse(c) < Date.parse(b.to))));
    const blocked = kept === null ? U : { minutes: Math.round(kept.reduce((s, b) => s + mins(b.from, b.to || now), 0) * 10) / 10, ...(kept.some((b) => b.to === null) ? { open: true } : {}) };
    let replace = U;
    if (kept !== null && restarts !== null) {
      const rs = restarts.filter((r) => r.row === 'restart' && r.module === m && r.tranche === cfg.tranche && typeof r.at === 'string' && since(r)).sort(byAt);
      const used = new Set();
      // Within one BLOCKED interval the first restart answers the stop; each later one (the first
      // replacement stopped too, or the command ran again) runs from the restart before it.
      const fs = kept.flatMap((b) => {
        const mine_ = rs.filter((x) => !used.has(x) && Date.parse(x.at) >= Date.parse(b.from) && (b.to === null || Date.parse(x.at) <= Date.parse(b.to)));
        mine_.forEach((x) => used.add(x));
        if (mine_.length) return mine_.map((r, i) => ({ ...(i ? { from: mine_[i - 1].at, minutes: mins(mine_[i - 1].at, r.at), stopped_by: 'restart', source: stopSource(r) } : { from: b.from, minutes: mins(b.from, r.at), stopped_by: 'BLOCKED', source: 'blocked' }), replaced: r.at, ...batchOf(r) }));
        return [b.to ? { from: b.from, minutes: mins(b.from, b.to), stopped_by: 'BLOCKED', source: 'blocked', resumed: b.to } : { from: b.from, minutes: mins(b.from, now), stopped_by: 'BLOCKED', source: 'blocked', open: true }];
      });
      for (const r of rs.filter((x) => !used.has(x))) {
        fs.push(typeof r.stopped === 'string' && Number.isFinite(Date.parse(r.stopped)) ? { from: later(r.stopped, opened), minutes: Math.max(0, mins(later(r.stopped, opened), r.at)), stopped_by: r.stopped_by || 'stopped', source: stopSource(r), replaced: r.at, ...batchOf(r) } : U);
      }
      replace = fs.length ? fs.sort((a, b) => String(a.from).localeCompare(String(b.from))).map((f) => fig(cfg, 'replace', f)) : 'none';
    }
    const waits = msgs ? reportWaits(msgs.filter(since), now).filter((w) => w.from === m) : null;
    return {
      module: m, layer: layers.get(m) ?? null,
      ready_to_start: (() => {
        if (rd.early) return `started before ${rd.early} (in its uses) merged; ${rd.early} not merged yet`;
        if (!ready) return U;
        // Its first start before the ready time: it started before it was ready, 0, whatever later starts.
        const before = starts[0] && Date.parse(starts[0].at) < Date.parse(ready);
        const f = fig(cfg, 'ready_to_start', firstSince && !before ? Math.max(0, mins(ready, firstSince.at)) : 0);
        // A cause is named for a wait over its target only.
        const cause = firstSince && !before && f.mark === 'over' && causeOf(m, ready, firstSince.at);
        const early = rd.waited_on && before;
        return { ...f, ready: ready, ready_by: rd.by, ...(rd.waited_on ? { [early ? 'started_before' : 'waited_on']: rd.waited_on } : {}), ...(cause ? { cause } : {}) };
      })(),
      start_to_pr_ready: worstOf(attempts.map((a) => ({ n: a.attempt, f: a.start_to_pr_ready }))),
      green_to_merge: worstOf(attempts.map((a) => ({ n: a.attempt, f: a.green_to_merge }))),
      blocked: fig(cfg, 'blocked', blocked),
      replace,
      report_wait: waits === null ? U : waits.length ? waits.map((w) => fig(cfg, 'report_wait', w)) : 'none',
      attempts,
    };
  });
  const starts = rows.filter(isStart);
  const closes = closed === null ? U : mine.filter(since).map((c) => {
    if (c.undecided) return { layer: c.layer, unmeasured: true };
    const s = first(starts.filter((r) => r.at > c.at));
    return { layer: c.layer, ...fig(cfg, 'close_to_next_start', s ? mins(c.at, s.at) : { minutes: mins(c.at, now), open: true }) };
  });
  const values = (key) => (key === 'close_to_next_start' ? (Array.isArray(closes) ? closes : []) : jobs.flatMap((j) => (Array.isArray(j[key]) ? j[key] : [j[key]]))).filter((x) => typeof x?.minutes === 'number');
  const summary = Object.fromEntries(Object.keys(TARGET_OF).map((k) => {
    const xs = values(k);
    const un = k === 'close_to_next_start' ? (Array.isArray(closes) ? closes.filter((c) => c.unmeasured).length : 0) : jobs.filter((j) => j[k] === U || (Array.isArray(j[k]) && j[k].includes(U))).length;
    const early = k === 'ready_to_start' ? jobs.filter((j) => typeof j[k] === 'string' && j[k].startsWith('started before')).length : 0;
    if (!xs.length) return [k, early ? { n: 0, median: U, worst: U, ...(un ? { unmeasured: un } : {}), started_before_uses: early } : U];
    const t = TARGET_OF[k] ? cfg.targets?.[TARGET_OF[k]] : null;
    const shut = xs.filter((x) => !x.open).map((x) => x.minutes);
    const md = median(shut);
    const w = xs.reduce((a, b) => (b.minutes > a.minutes ? b : a));
    return [k, { n: shut.length, ...(xs.length > shut.length ? { open: xs.length - shut.length } : {}), ...(un ? { unmeasured: un } : {}), ...(early ? { started_before_uses: early } : {}), median: md, worst: w.minutes, ...(w.open ? { worst_open: true } : {}), ...(Number.isFinite(t) ? { target: t, ...(typeof md === 'number' && md > t ? { median_mark: 'over' } : {}), ...(w.minutes > t ? { worst_mark: 'over' } : {}) } : {}) }];
  }));
  return { rule: LEAD_RULE, targets, opened, jobs, close_to_next_start: closes, summary };
}

// The state branch's rows lead times read: every message (each with its sender, from its file's
// name), the restart rows, and this tranche's open, the grant rows after its last tranche close
// (tranche.mjs's rule). read(path) -> text or null; each null when unread. Layer closes come
// from the caller, filtered as status counts them (closedRows: this tranche, its commit not on main).
export function leadInputs(root, sb, read, tranche) {
  const j = (p) => { const t = read(p); return t === null ? null : t.split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }); };
  const ls = out(root, ['ls-tree', '--name-only', '-z', `refs/remotes/origin/${sb}:messages`]);
  const msgs = ls === null ? null : ls.split('\0').filter((f) => f.endsWith('.jsonl')).flatMap((f) => messages(read(`messages/${f}`) || '').map((m) => ({ from: f.slice(0, -6), ...m })));
  const g = j('metrics/tranche-open.jsonl');
  // The grants after the last tranche close; none since it, the tranche read is the one that
  // close closed: its grants between the close before it and that close.
  const closes = (j('tranches/closed.jsonl') || []).filter((r) => r.row === 'tranche-closed' && r.tranche === tranche).map((r) => String(r.at)).sort();
  let [lo, hi] = [closes.at(-1) || '', null];
  if (g && closes.length && !g.some((r) => String(r.at) > lo)) [lo, hi] = [closes.at(-2) || '', closes.at(-1)];
  // A state branch without the file has no restart yet: none, not unread.
  const ok = out(root, ['rev-parse', '-q', '--verify', `refs/remotes/origin/${sb}^{commit}`]) !== null;
  return { grants: g && g.filter((r) => String(r.at) > lo && (hi === null || String(r.at) <= hi)), msgs, restarts: j(RESTARTS_FILE) || (ok ? [] : null) };
}

// The job branches of the modules given (all origin holds when none are), fetched now from origin, so a stale ref never stands in
// for one: module -> its ref, or null when origin has no such branch; undefined when origin is
// unread. In a shallow clone each is fetched --shallow-exclude=<main> (its commits main lacks),
// before report.mjs's deepen() mends the tranche's history beneath them.
export function fetchJobs(root, mods = null, main = 'main') {
  if (mods && !mods.length) return new Map();
  const ls = out(root, ['ls-remote', 'origin', 'refs/heads/job/*']);
  if (ls === null) return undefined;
  const there = new Set(ls.split('\n').map((l) => l.split('\t')[1]).filter(Boolean));
  mods ||= [...there].map((r) => r.slice('refs/heads/job/'.length)).sort();
  const shallow = (out(root, ['rev-parse', '--is-shallow-repository']) || '').trim() === 'true';
  const map = new Map();
  const spec = (m) => `+refs/heads/job/${m}:refs/remotes/origin/job/${m}`;
  const fetch = (ms) => out(root, ['fetch', '-q', ...(shallow ? [`--shallow-exclude=${main}`] : []), 'origin', ...ms.map(spec)]) !== null;
  const have = mods.filter((m) => there.has(`refs/heads/job/${m}`));
  for (const m of mods) if (!have.includes(m)) map.set(m, null);
  if (have.length && fetch(have)) for (const m of have) map.set(m, `refs/remotes/origin/job/${m}`);
  else for (const m of have) if (fetch([m])) map.set(m, `refs/remotes/origin/job/${m}`); // unfetched: left out, unmeasured
  return map;
}

// One line per figure for report tranche: "<minutes> min (target <t>[, over])", or unmeasured.
export const leadCell = (f) => {
  if (typeof f === 'string') return f;
  if (Array.isArray(f)) return f.length ? f.map(leadCell).join('; ') : 'none';
  if (!f || f.unmeasured || typeof f.minutes !== 'number') return U;
  return `${f.minutes} min${f.open ? ' (open)' : ''}${f.attempt !== undefined ? ` (attempt ${f.attempt}${f.unmeasured_attempts ? `; attempt ${f.unmeasured_attempts.join(', ')} ${U}` : ''})` : ''}${f.target !== undefined ? ` (target ${f.target}${f.mark ? ', over' : ''})` : ''}${f.waited_on ? ` (ready at ${f.waited_on}'s merge)` : ''}${f.started_before ? ` (started before ${f.started_before} merged)` : ''}${f.cause ? ` (cause: ${f.cause})` : ''}${f.source ? ` (stop: ${f.source})` : ''}${f.batch ? ` (batch of ${f.batch.restarts} restarts ${f.batch.from}..${f.batch.to})` : ''}`;
};
export const leadSummaryCell = (s) => (s === U ? U : `median ${s.median}${s.median_mark ? ' over' : ''}, worst ${s.worst}${s.worst_open ? ' (open)' : ''}${s.worst_mark ? ' over' : ''}${s.target !== undefined ? ` (target ${s.target})` : ''}, n ${s.n}${s.open ? ` and ${s.open} open` : ''}${s.unmeasured ? `; ${s.unmeasured} ${U}` : ''}${s.started_before_uses ? `; ${s.started_before_uses} started before a module in their uses merged` : ''}`);
