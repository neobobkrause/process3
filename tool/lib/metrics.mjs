// Metrics (JOB-10, SES-11, SES-12): one file per module, process/metrics/<id>.jsonl, one row
// per event, appended by the tool, never by hand. Gate rows live in each pull request's gate
// comment (written by the gate workflow) and are read from GitHub.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { comments, gateRuns, getPR } from './github.mjs';
import { fail, git, now } from './util.mjs';

export const METRICS_DIR = 'process/metrics';
export const metricsFile = (id) => `${METRICS_DIR}/${id}.jsonl`;
// BOB's measured figures go in a file of their own, so each file keeps one writer (REC-2).
export const bobMetricsFile = (id) => `${METRICS_DIR}/${id}.bob.jsonl`;

export function readRows(root, id, file = metricsFile(id)) {
  const p = join(root, file);
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

export function allRows(root) {
  const dir = join(root, METRICS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith('.jsonl')).flatMap((n) => readRows(root, null, `${METRICS_DIR}/${n}`));
}

export function appendRow(root, id, row, file = metricsFile(id)) {
  mkdirSync(join(root, METRICS_DIR), { recursive: true });
  const full = { at: now(), module: id, ...row };
  appendFileSync(join(root, file), JSON.stringify(full) + '\n');
  return full;
}

// Refusals per session (Foundations, "Refusals are counted per session"): auto mode falls back
// to asking a person after 20 refusals in one session, so status prints REFRESH for a session at
// REFRESH_AT, long before. BOB records each refusal a session reports, with its act and depth,
// in a file of BOB's own, each row with an id of its own, so two alike stay two.
export const REFUSALS_FILE = `${METRICS_DIR}/refusals.bob.jsonl`;
export const REFRESH_AT = 10;

export function recordRefusal(root, { session, act, depth, module = null } = {}) {
  const text = (v) => typeof v === 'string' && v.trim();
  if (!text(session)) fail('a refusal needs --session <the session that was refused>');
  if (!text(act)) fail('a refusal needs --act "<the act that was refused>"');
  const d = Number(depth);
  if (depth === undefined || depth === true || !Number.isInteger(d) || d < 0) fail('a refusal needs --depth <n>, the session\'s depth (0 for a session a person started)');
  return appendRow(root, module, { row: 'refusal', id: randomUUID(), session: session.trim(), act: act.trim(), depth: d }, REFUSALS_FILE);
}

// The refusals counted per session: the refusal rows only. A measured attempt row's refusals
// (metrics add --refusal) stay that attempt's figure, so one refusal recorded both ways counts once.
export const refusalsOf = (rows) => rows.filter((r) => r.row === 'refusal' && r.session).map((r) => ({ session: r.session, act: r.act, depth: r.depth }));

export function refusalCounts(rows) {
  const counts = new Map();
  for (const r of refusalsOf(rows)) counts.set(r.session, (counts.get(r.session) || 0) + 1);
  return [...counts].map(([session, refusals]) => ({ session, refusals, refresh: refusals >= REFRESH_AT }))
    .sort((a, b) => b.refusals - a.refusals || a.session.localeCompare(b.session));
}

// Lines that are not JSON are skipped: status must still print with one bad line.
const parseLines = (text) => text.split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });

// Metrics rows in this checkout, for status.
export function rowsHere(root) {
  const dir = join(root, METRICS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith('.jsonl')).flatMap((n) => parseLines(readFileSync(join(dir, n), 'utf8')));
}

// Metrics rows as a commit holds them (the tranche's), for status.
export function rowsAt(root, ref) {
  const r = git(['ls-tree', '-r', '--name-only', '-z', ref, '--', METRICS_DIR], { cwd: root, allowFail: true });
  if (r.code !== 0) return [];
  return r.stdout.split('\0').filter((f) => f.endsWith('.jsonl')).flatMap((f) => {
    const t = git(['show', `${ref}:${f}`], { cwd: root, allowFail: true });
    return t.code === 0 ? parseLines(t.stdout) : [];
  });
}

export const nextAttempt = (root, id) => readRows(root, id).filter((r) => r.row === 'attempt' && r.event === 'start').length + 1;

const DAY = 86400000;

// Is a merged pull request still in place: its merge commit on the branch and never reverted?
export function survival(root, merge, branch, today = Date.now()) {
  if (!merge?.merge_sha) return { state: 'not merged' };
  const due = new Date(Date.parse(merge.merged_at) + 14 * DAY).toISOString().slice(0, 10);
  const on = git(['merge-base', '--is-ancestor', merge.merge_sha, branch], { cwd: root, allowFail: true }).code === 0;
  const reverts = git(['log', '--format=%H', `--grep=${merge.merge_sha}`, branch], { cwd: root, allowFail: true }).stdout.trim();
  if (!on || reverts) return { state: 'reverted', due };
  return { state: today >= Date.parse(merge.merged_at) + 14 * DAY ? 'survived' : 'pending', due };
}

// BOB's idle time, per UTC day, from the sweep rows (SWEEP_ROWS_FILE on the state branch): the
// sweeps that found acts listed for BOB, and the longest BOB had been quiet at one of them.
export function idleByDay(sweepRows) {
  const rows = sweepRows.filter((x) => x.row === 'sweep' && typeof x.at === 'string');
  if (!rows.length) return 'unmeasured';
  const days = new Map();
  for (const r of rows) {
    const day = r.at.slice(0, 10);
    const d = days.get(day) || { day, occurrences: 0, longest_quiet_h: 0, unmeasured_sweeps: 0 };
    if (r.bob_acts === true) { d.occurrences++; d.longest_quiet_h = Math.max(d.longest_quiet_h, Number(r.bob_quiet_h) || 0); }
    else if (r.bob_acts !== false) d.unmeasured_sweeps++; // no BOB addressed, or a paused plan
    days.set(day, d);
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}

// module -> layer, from the layer map (layers_file): table rows whose first cell is the layer's
// number and whose last cell lists its modules.
export function layerOf(map) {
  const out = new Map();
  for (const c of (map || '').split('\n').map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim()))) {
    if (c.length > 1 && /^\d+$/.test(c[0])) for (const m of c.at(-1).replace(/[`*]/g, '').split(',').map((x) => x.trim()).filter(Boolean)) out.set(m, Number(c[0]));
  }
  return out;
}

export const SHARE_RULE = "A job's overhead is the cost of its non-job rows (its reviews) plus an even split of each BOB or ROOT row's cost (the session's cost since that session's previous row) among the jobs with an attempt row since that role's previous row; its share is overhead over its own job cost plus overhead, and a layer's is the same summed over its jobs.";
const PROCESS = new Set(['bob', 'root']);
const usd = (x) => Math.round(x * 1e4) / 1e4;

// The process overhead share per job and per layer (Build Plan, Phase 2: measured, no target).
// A part with no row is "unmeasured"; a share is "unmeasured" when its job's own cost is, and
// otherwise counts the measured parts only, naming the rest. A BOB session that ends without a
// row loses its cost since its last row: the share then reads low, and the record cannot tell.
export function overhead(rows, layers = new Map()) {
  rows = rows.filter((r) => typeof r.at === 'string');
  const measured = rows.filter((r) => r.row === 'attempt' && r.event === 'measured');
  const role = (r) => r.role || 'job';
  const procMods = new Set(measured.filter((r) => PROCESS.has(role(r))).map((r) => r.module));
  const activity = rows.filter((r) => r.row === 'attempt' && r.module && !procMods.has(r.module) && !(r.event === 'measured' && role(r) !== 'job'));
  const mods = [...new Set(activity.map((r) => r.module))].sort();
  // A job active in a window no row of that role closes (after its last row, or ended by a row
  // with no cost) has that part unmeasured.
  const parts = new Map(mods.map((m) => [m, { bob: 0, root: 0, gap: new Set() }]));
  let unattributed = 0;
  for (const who of PROCESS) {
    const mine = measured.filter((r) => role(r) === who).sort((a, b) => a.at.localeCompare(b.at));
    let prevAt = '';
    const lastCost = new Map();
    const since = (from, to) => [...new Set(activity.filter((a) => a.at > from && (to === null || a.at <= to)).map((a) => a.module))];
    for (const r of mine) {
      const c = Number(r.cost_usd);
      const open = since(prevAt, r.at);
      if (Number.isFinite(c) && r.session) {
        const delta = Math.max(0, c - (lastCost.get(r.session) ?? 0));
        lastCost.set(r.session, c);
        if (open.length) for (const m of open) parts.get(m)[who] += delta / open.length;
        else unattributed += delta;
      } else for (const m of open) parts.get(m).gap.add(who);
      prevAt = r.at;
    }
    for (const m of since(prevAt, null)) parts.get(m).gap.add(who);
  }
  const has = (who) => measured.some((r) => role(r) === who && r.session && Number.isFinite(Number(r.cost_usd)));
  const sum = (rs) => (rs.length && rs.every((r) => Number.isFinite(Number(r.cost_usd))) ? rs.reduce((s, r) => s + Number(r.cost_usd), 0) : 'unmeasured');
  const jobs = mods.map((m) => {
    const own = measured.filter((r) => r.module === m);
    const job = sum(own.filter((r) => role(r) === 'job'));
    const reviews = sum(own.filter((r) => role(r) !== 'job'));
    const part = (who) => (has(who) && !parts.get(m).gap.has(who) ? usd(parts.get(m)[who]) : 'unmeasured');
    const p = { reviews_usd: reviews, bob_usd: part('bob'), root_usd: part('root'), gate_usd: 'unmeasured' };
    const over = Object.values(p).filter((v) => typeof v === 'number').reduce((s, v) => s + v, 0);
    const unmeasured = Object.keys(p).filter((k) => p[k] === 'unmeasured').map((k) => k.replace(/_usd$/, ''));
    return { module: m, layer: layers.get(m) ?? null, job_usd: typeof job === 'number' ? usd(job) : job, ...p, overhead_usd: usd(over), share: typeof job === 'number' && job + over > 0 ? usd(over / (job + over)) : 'unmeasured', unmeasured };
  });
  const byLayer = new Map();
  for (const j of jobs.filter((x) => x.layer !== null)) byLayer.set(j.layer, [...(byLayer.get(j.layer) || []), j]);
  const layerRows = [...byLayer].sort((a, b) => a[0] - b[0]).map(([layer, js]) => {
    const ok = js.every((j) => typeof j.share === 'number');
    const over = js.reduce((s, j) => s + j.overhead_usd, 0);
    const total = ok ? js.reduce((s, j) => s + j.job_usd, 0) + over : 0;
    return { layer, jobs: js.map((j) => j.module), overhead_usd: usd(over), share: ok && total > 0 ? usd(over / total) : 'unmeasured', unmeasured: [...new Set(js.flatMap((j) => (typeof j.share === 'number' ? j.unmeasured : [`${j.module} job`])))] };
  });
  return { rule: SHARE_RULE, jobs, layers: layerRows, unattributed_usd: has('bob') || has('root') ? usd(unattributed) : 'unmeasured' };
}

// The two health metrics and the figures that explain them, from rows and pull requests.
// sweepRows: the state branch's sweep rows; layers: the layer map's text (layers_file).
export function report(root, slug, branch, { read = { comments, getPR }, sweepRows = [], layers = null } = {}) {
  const rows = allRows(root);
  const completes = rows.filter((r) => r.row === 'attempt' && r.event === 'complete');
  const merges = rows.filter((r) => r.row === 'merge');
  const measured = rows.filter((r) => r.row === 'attempt' && r.event === 'measured');
  let refuted = 0;
  let gateMinutes = 0;
  const gates = [];
  for (const c of completes) {
    if (!c.pr) continue;
    let all = [];
    try { all = read.comments(slug, c.pr) || []; } catch { all = []; }
    const runs = gateRuns(all);
    gates.push({ pr: c.pr, runs: runs.length });
    gateMinutes += runs.reduce((s, r) => s + (r.minutes || 0), 0);
    // A COMPLETE claim is refuted when a gate run that checked that attempt's receipt failed
    // its suite or its revert check.
    if (runs.some((r) => r.receipt_attempt === c.attempt && (r.suite === 'fail' || r.revert === 'fail'))) refuted++;
  }
  const cost = measured.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
  const tokens = measured.some((r) => typeof r.tokens === 'number') ? measured.reduce((s, r) => s + (Number(r.tokens) || 0), 0) : 'unmeasured';
  const surv = merges.map((m) => {
    let pr = null;
    try { pr = read.getPR(slug, m.pr); } catch { pr = null; }
    const merged = pr?.merged_at ? { merge_sha: pr.merge_commit_sha, merged_at: pr.merged_at } : null;
    return { module: m.module, pr: m.pr, ...survival(root, merged, branch) };
  });
  const surviving = surv.filter((s) => s.state === 'survived').length;
  return {
    complete_claims: completes.length,
    refuted,
    false_done_rate: completes.length ? refuted / completes.length : null,
    cost_usd: cost,
    tokens,
    surviving_prs: surviving,
    cost_per_surviving_pr: surviving ? cost / surviving : `pending: ${surv.map((s) => `PR ${s.pr} ${s.state}${s.due ? ` (read on ${s.due})` : ''}`).join(', ') || 'no merges'}`,
    gate_minutes: Math.round(gateMinutes * 100) / 100,
    gates,
    denials: measured.reduce((s, r) => s + (Number(r.denials) || 0), 0),
    refusals: measured.flatMap((r) => r.refusals || []),
    refusals_by_session: refusalCounts(rows),
    declines: measured.flatMap((r) => r.declines || []),
    bob_idle_by_day: idleByDay(sweepRows),
    overhead: overhead(rows, layerOf(layers)),
  };
}
