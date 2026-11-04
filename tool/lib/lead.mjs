// Lead times (Bob's urgency): how long work waits at each step, from rows the record already
// holds: start, complete (receipt) and merge rows, the pull request's gate rows, the ledger
// entry's history (BLOCKED), the state branch's layer close, tranche open and message rows.
// Every figure a row is missing for reads "unmeasured"; each is set beside its target.
import { entryFile } from './ledger.mjs';
import { messages } from './state.mjs';
import { git } from './util.mjs';

const U = 'unmeasured';
const MIN = 60000;
const out = (root, args) => { const r = git(args, { cwd: root, allowFail: true }); return r.code === 0 ? r.stdout : null; };
const mins = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / MIN * 10) / 10;
const first = (xs) => xs.sort((a, b) => a.at.localeCompare(b.at))[0];

export const TARGETS = { start_minutes: 10, merge_minutes: 15, decision_minutes: 30, replace_minutes: 30 };
// Each figure and the target it is set beside (started to PR ready has none).
const TARGET_OF = { ready_to_start: 'start_minutes', start_to_pr_ready: null, green_to_merge: 'merge_minutes', blocked: 'replace_minutes', report_wait: 'decision_minutes', close_to_next_start: 'start_minutes' };
export const LEAD_RULE = 'ready to start: the job\'s layer opened (the close row of the layer below it in the layer map; for the lowest layer, the tranche open\'s last grant row) to its first start row since, 0 when it started before; start to PR ready: that start row to the next complete row (the receipt); green to merge: the first gate row with ok true on its pull request at or after that receipt to its merge row; blocked: the minutes its ledger entry on the tranche spent BLOCKED, from each commit that made it BLOCKED to the next that did not (to now while it still is); report wait: each message from the job (sender named as its module) to bob or root, to the first later message from that recipient naming it as <sender>-<n> (to now while none does); close to next start: each layer close row of this tranche to the first start row after it (to now while none). A figure measured to now is marked open. Median and worst are over the measured figures.';

// A message's wait for its answer: from S to R (bob or root), until R's first later message names S-n.
export function reportWaits(msgs, now) {
  const by = (f) => msgs.filter((m) => m.from === f);
  return msgs.filter((m) => ['bob', 'root'].includes(m.to) && m.from !== m.to && typeof m.at === 'string').map((m) => {
    const id = new RegExp(`(^|[^\\w-])${m.from}-${m.n}(?!\\d)`);
    const a = by(m.to).filter((b) => b.at >= m.at && id.test(b.text || '')).sort((x, y) => x.at.localeCompare(y.at))[0];
    return { from: m.from, n: m.n, to: m.to, minutes: mins(m.at, a ? a.at : now), ...(a ? {} : { open: true }) };
  });
}

// The minutes a ledger entry spent BLOCKED, from its history on ref (null when unread).
function blockedMinutes(root, ref, id, now) {
  const log = out(root, ['log', '--reverse', '--format=%H %cI', ref, '--', entryFile(id)]);
  if (log === null) return null;
  let since = null;
  let total = 0;
  for (const l of log.split('\n').filter(Boolean)) {
    const [sha, at] = l.split(' ');
    let state = null;
    try { state = JSON.parse(out(root, ['show', `${sha}:${entryFile(id)}`]) || 'null')?.status?.state; } catch { state = null; }
    if (state === 'BLOCKED' && since === null) since = at;
    else if (state !== 'BLOCKED' && since !== null) { total += mins(since, at); since = null; }
  }
  return since === null ? { minutes: Math.round(total * 10) / 10 } : { minutes: Math.round((total + mins(since, now)) * 10) / 10, open: true };
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[(s.length - 1) >> 1] : U; };
const fig = (cfg, key, v) => {
  if (v === U || v === null || v === undefined) return U;
  const o = typeof v === 'number' ? { minutes: v } : v;
  const t = TARGET_OF[key] ? cfg.targets?.[TARGET_OF[key]] : null;
  return { ...o, ...(Number.isFinite(t) ? { target: t, ...(o.minutes > t ? { mark: 'over' } : {}) } : {}) };
};

// inputs: rows (metrics rows at ref), layers (module -> layer), closed / grants / msgs (state
// branch rows, null when unread), comments(pr) (the pull request's gate runs' source, throws or
// null when unread), now.
export function leadTimes(root, cfg, { ref, rows, layers = new Map(), closed = null, grants = null, msgs = null, comments = () => null, now = new Date().toISOString() } = {}) {
  rows = rows.filter((r) => typeof r.at === 'string');
  const mine = (closed || []).filter((r) => r.row === 'closed' && r.tranche === cfg.tranche && typeof r.at === 'string');
  const opened = (grants || []).filter((r) => r.row === 'grant' && r.tranche === cfg.tranche && typeof r.at === 'string').map((r) => r.at).sort().at(-1) || null;
  const levels = [...new Set(layers.values())].sort((a, b) => a - b);
  const readyAt = (layer) => {
    if (layer === undefined) return null;
    const below = levels.filter((n) => n < layer).at(-1);
    if (below === undefined) return opened;
    return mine.filter((r) => r.layer === below).map((r) => r.at).sort()[0] || null;
  };
  const mods = [...new Set(rows.filter((r) => r.row === 'attempt' && r.event === 'start' && r.module).map((r) => r.module))].sort();
  const jobs = mods.map((m) => {
    const own = rows.filter((r) => r.module === m);
    const ready = readyAt(layers.get(m));
    const starts = own.filter((r) => r.row === 'attempt' && r.event === 'start');
    const start = (ready && first(starts.filter((r) => r.at >= ready))) || first([...starts]);
    const complete = first(own.filter((r) => r.row === 'attempt' && r.event === 'complete' && r.at >= start.at));
    const merge = complete && first(own.filter((r) => r.row === 'merge' && r.pr === complete.pr && r.at >= complete.at));
    let green = U;
    if (merge) {
      let all = null;
      try { all = comments(merge.pr); } catch { all = null; }
      const runs = Array.isArray(all) ? all : null;
      const g = runs && first(runs.filter((r) => r.ok === true && typeof r.at === 'string' && r.at >= complete.at && r.at <= merge.at));
      green = g ? Math.max(0, mins(g.at, merge.at)) : U;
    } else if (complete) green = { minutes: mins(complete.at, now), open: true, note: 'not merged' };
    const b = blockedMinutes(root, ref, m, now);
    const waits = msgs ? reportWaits(msgs, now).filter((w) => w.from === m) : null;
    return {
      module: m, layer: layers.get(m) ?? null,
      ready_to_start: fig(cfg, 'ready_to_start', ready ? Math.max(0, mins(ready, start.at)) : U),
      start_to_pr_ready: fig(cfg, 'start_to_pr_ready', complete ? mins(start.at, complete.at) : { minutes: mins(start.at, now), open: true }),
      green_to_merge: fig(cfg, 'green_to_merge', green),
      blocked: fig(cfg, 'blocked', b ?? U),
      report_wait: waits === null ? U : waits.length ? waits.map((w) => fig(cfg, 'report_wait', w)) : 'none',
    };
  });
  const starts = rows.filter((r) => r.row === 'attempt' && r.event === 'start');
  const closes = closed === null ? U : mine.map((c) => {
    const s = first(starts.filter((r) => r.at > c.at));
    return { layer: c.layer, ...fig(cfg, 'close_to_next_start', s ? mins(c.at, s.at) : { minutes: mins(c.at, now), open: true }) };
  });
  const values = (key) => {
    const v = key === 'close_to_next_start' ? (Array.isArray(closes) ? closes : []) : jobs.flatMap((j) => (Array.isArray(j[key]) ? j[key] : [j[key]]));
    return v.filter((x) => typeof x?.minutes === 'number' && !x.open).map((x) => x.minutes);
  };
  const summary = Object.fromEntries(Object.keys(TARGET_OF).map((k) => {
    const xs = values(k);
    if (!xs.length) return [k, U];
    const t = TARGET_OF[k] ? cfg.targets?.[TARGET_OF[k]] : null;
    const md = median(xs);
    const worst = Math.max(...xs);
    return [k, { n: xs.length, median: md, worst, ...(Number.isFinite(t) ? { target: t, ...(md > t ? { median_mark: 'over' } : {}), ...(worst > t ? { worst_mark: 'over' } : {}) } : {}) }];
  }));
  return { rule: LEAD_RULE, targets: { ...TARGETS, ...(cfg.targets || {}) }, jobs, close_to_next_start: closes, summary };
}

// The state branch's rows lead times read: layer closes, tranche open grants and every message
// (each with its sender, from its file's name). read(path) -> text or null; null when unread.
export function leadInputs(root, sb, read) {
  const j = (p) => { const t = read(p); return t === null ? null : t.split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }); };
  const ls = out(root, ['ls-tree', '--name-only', '-z', `refs/remotes/origin/${sb}:messages`]);
  const msgs = ls === null ? null : ls.split('\0').filter((f) => f.endsWith('.jsonl')).flatMap((f) => messages(read(`messages/${f}`) || '').map((m) => ({ from: f.slice(0, -6), ...m })));
  return { closed: j('layers/closed.jsonl'), grants: j('metrics/tranche-open.jsonl'), msgs };
}

// One line per figure for report tranche: "<minutes> min (target <t>[, over])", or unmeasured.
export const leadCell = (f) => {
  if (f === U || f === 'none') return f;
  if (Array.isArray(f)) return f.length ? f.map(leadCell).join('; ') : 'none';
  return `${f.minutes} min${f.open ? ' (open)' : ''}${f.target !== undefined ? ` (target ${f.target}${f.mark ? ', over' : ''})` : ''}`;
};
export const leadSummaryCell = (s) => (s === U ? U : `median ${s.median}${s.median_mark ? ' over' : ''}, worst ${s.worst}${s.worst_mark ? ' over' : ''}${s.target !== undefined ? ` (target ${s.target})` : ''}, n ${s.n}`);
