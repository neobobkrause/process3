// Metrics (JOB-10, SES-11, SES-12): one file per module, process/metrics/<id>.jsonl, one row
// per event, appended by the tool, never by hand. Gate rows live in each pull request's gate
// comment (written by the gate workflow) and are read from GitHub.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { comments, gateRuns, getPR } from './github.mjs';
import { git, now } from './util.mjs';

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

// The two health metrics and the figures that explain them, from rows and pull requests.
export function report(root, slug, branch, { read = { comments, getPR } } = {}) {
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
    declines: measured.flatMap((r) => r.declines || []),
  };
}

// The loop guard (build I, 3 Nov): an attempt's elapsed time and cost against its role's budget.
// rows: the module's rows (its own file and BOB's), in any order. Elapsed runs from the attempt's
// start row to its complete row, or to the moment it was blocked (blockedAt), or to now while it
// runs. Cost is BOB's latest measured figure for the attempt in the same role, else the one the
// job's complete row read from its session record, else 'unmeasured'. merged: a merge row
// follows the attempt's complete row. Returns null when the rows hold no attempt.
export function attemptBudget(rows, budgets, { now: at = Date.now(), attempt, blockedAt } = {}) {
  const starts = rows.filter((r) => r.row === 'attempt' && r.event === 'start');
  if (!starts.length) return null;
  const n = attempt ?? Math.max(...starts.map((r) => Number(r.attempt) || 1));
  const start = starts.filter((r) => (Number(r.attempt) || 1) === n).pop();
  const of = (ev) => rows.filter((r) => r.row === 'attempt' && r.event === ev && (Number(r.attempt) || 1) === n);
  const complete = of('complete').pop();
  const role = start.role || 'job';
  const t0 = Date.parse(start.at);
  const blocked = !complete && Number.isFinite(Date.parse(blockedAt)) ? Date.parse(blockedAt) : null;
  const t1 = complete ? Date.parse(complete.at) : blocked ?? at;
  const minutes = Number.isFinite(t0) && Number.isFinite(t1) ? Math.max(0, Math.round((t1 - t0) / 60000)) : 'unmeasured';
  const num = (c) => typeof c === 'number' && Number.isFinite(c);
  const measured = of('measured').filter((r) => (r.role || 'job') === role && num(r.cost_usd)).sort((x, y) => String(x.at).localeCompare(String(y.at)));
  const costs = [measured.at(-1)?.cost_usd, complete?.cost_usd];
  const cost = costs.find(num) ?? 'unmeasured';
  const merged = Boolean(complete) && rows.some((r) => r.row === 'merge' && Date.parse(r.at) >= Date.parse(complete.at));
  const budget = budgets?.[role] || null;
  const over = [];
  if (budget && typeof budget.minutes === 'number' && typeof minutes === 'number' && minutes > budget.minutes) over.push(`${minutes} min of ${budget.minutes}`);
  if (budget && typeof budget.cost_usd === 'number' && typeof cost === 'number' && cost > budget.cost_usd) over.push(`$${cost} of $${budget.cost_usd}`);
  return { attempt: n, role, minutes, cost_usd: cost, done: Boolean(complete), blocked: blocked !== null, merged, budget, over };
}

// The open check (Build Plan, tranche open): one row per run in a file of BOB's own, with the
// Claude Code version it ran on, so a new version makes it due again.
export const OPEN_CHECK_FILE = `${METRICS_DIR}/open-check.bob.jsonl`;
export function openCheckDue(rows, version) {
  const last = rows.filter((r) => r.row === 'open-check').pop() || null;
  if (!last) return { due: true, why: 'no open check is recorded', last };
  if (!version || version === 'unmeasured') return { due: true, why: 'the Claude Code version here could not be read', last };
  if (last.claude_code !== version) return { due: true, why: `the last open check ran on Claude Code ${last.claude_code}, and this is ${version}`, last };
  if (last.outcome !== 'pass') return { due: true, why: `the last open check, on Claude Code ${version}, did not pass (${last.outcome ?? 'no outcome'})`, last };
  return { due: false, why: `the last open check passed on Claude Code ${version}`, last };
}
