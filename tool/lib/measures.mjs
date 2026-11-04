// Measures for the Build Plan's gate rows that had none: the 14-day survival of merged job pull
// requests and their cost (P3-G5), and one BOB wake as a fresh stateless session (P3-A1, SES-16).
// Both read and print; neither writes the record.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { P3, rulebookLine } from './job.mjs';
import { METRICS_DIR, overhead, rowsAt } from './metrics.mjs';
import { readAddress, tipApprovals } from './roles.mjs';
import { status } from './status.mjs';
import { git, loadConfig, now } from './util.mjs';

const DAY = 86400000;
const out = (root, args) => { const r = git(args, { cwd: root, allowFail: true }); return r.code === 0 ? r.stdout.trim() : null; };

export const SURVIVAL_RULE = 'A merged job pull request stands on a branch when its merge commit (the tool\'s "Merge job PR <n>") is on that branch; no later commit there says "This reverts commit <its id>", as git revert writes; and, when the job added lines, git blame at the branch\'s tip still gives at least one line outside the record (process/metrics, process/ledger) to the job\'s own commits (the merge\'s second parent back to its first). A job that only removed lines stands on the first two alone. It survives when it stands on the tranche, and on main too once main holds its merge.';
export const SURVIVAL_COST_RULE = 'Cost per surviving PR: the cost recorded up to the cutoff (metrics rows dated no later than <days> before now: job, review, and BOB and ROOT rows as the overhead rule splits them, plus their unattributed part) over the pull requests merged by then that survive. Parts with no figure are named, never guessed.';

// The job's change: does it still stand on ref? Its record (metrics rows, ledger entry) is not its change.
const RECORD = [`${METRICS_DIR}/`, 'process/ledger/'];
function standsOn(root, m, ref) {
  if (out(root, ['merge-base', '--is-ancestor', m, ref]) === null) return 'its merge commit is not on it';
  const revert = out(root, ['log', '-1', '--format=%h', '-F', `--grep=This reverts commit ${m}`, `${m}..${ref}`]);
  if (revert) return `reverted by ${revert}`;
  const job = new Set((out(root, ['rev-list', `${m}^1..${m}^2`]) || '').split('\n').filter(Boolean));
  const added = (out(root, ['diff', '--no-renames', '--numstat', '-z', `${m}^1`, m]) || '').split('\0').filter(Boolean)
    .map((l) => l.split('\t')).filter(([a, , f]) => Number(a) > 0 && !RECORD.some((d) => f.startsWith(d))).map((c) => c[2]);
  if (!added.length) return null;
  for (const f of added) {
    const b = out(root, ['blame', '--porcelain', ref, '--', f]);
    if (b && b.split('\n').some((l) => /^[0-9a-f]{40} \d+ \d+/.test(l) && job.has(l.slice(0, 40)))) return null;
  }
  return 'every line it added is gone';
}

// metrics survival [--days 14]: each merge row at least <days> old, on the tranche and on main.
export function survivalReport(root, { branch, main, days = 14, today = Date.now() } = {}) {
  const d = Number(days);
  const cutoff = today - d * DAY;
  // Merge rows read at each job merge in the branch's history, not at its tip alone: a revert of
  // the merge removes the job's metrics file with the rest of its change.
  const parse = (t) => t.split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
  const seen = new Map();
  for (const r of rowsAt(root, branch)) seen.set(JSON.stringify(r), r);
  const found = new Map();
  for (const l of (out(root, ['log', '--merges', '--format=%H %s', '-E', '--grep=^Merge job PR [0-9]+$', branch]) || '').split('\n').filter(Boolean)) {
    const [m, ...subject] = l.split(' ');
    const pr = Number(subject.at(-1));
    if (found.has(pr)) continue;
    const files = (out(root, ['diff', '--name-only', '-z', `${m}^1`, m, '--', METRICS_DIR]) || '').split('\0').filter((f) => f.endsWith('.jsonl'));
    const at = files.flatMap((f) => parse(out(root, ['show', `${m}:${f}`]) || ''));
    for (const r of at) seen.set(JSON.stringify(r), r);
    found.set(pr, { m, row: at.filter((r) => r.row === 'merge' && r.pr === pr).pop() });
  }
  const rows = [...seen.values()].filter((r) => typeof r.at === 'string');
  const merges = new Map(rows.filter((r) => r.row === 'merge' && r.module && r.pr).map((r) => [r.pr, r]));
  for (const [pr, f] of found) if (f.row?.module && !merges.has(pr)) merges.set(pr, f.row);
  const prs = [];
  let pending = 0;
  for (const [pr, r] of merges) {
    if (Date.parse(r.at) > cutoff) { pending++; continue; }
    const m = found.get(pr)?.m;
    if (!m) { prs.push({ module: r.module, pr, merged_at: r.at, survived: 'unmeasured', why: 'its merge commit is not in this clone\'s history' }); continue; }
    const t = standsOn(root, m, branch);
    const onMain = main && out(root, ['merge-base', '--is-ancestor', m, main]) !== null;
    const mm = onMain ? standsOn(root, m, main) : null;
    prs.push({ module: r.module, pr, merged_at: r.at, merge: m.slice(0, 10), tranche: t ? `undone: ${t}` : 'stands', main: onMain ? (mm ? `undone: ${mm}` : 'stands') : 'not merged there', survived: !t && !mm });
  }
  const surviving = prs.filter((p) => p.survived === true).length;
  const o = overhead(rows.filter((r) => Date.parse(r.at) <= cutoff));
  const num = (v) => (typeof v === 'number' ? v : 0);
  const cost = o.jobs.reduce((s, j) => s + num(j.job_usd) + j.overhead_usd, 0) + num(o.unattributed_usd);
  const unmeasured = [...new Set([...o.jobs.flatMap((j) => [...(typeof j.job_usd === 'number' ? [] : [`${j.module} job`]), ...j.unmeasured.map((u) => `${j.module} ${u}`)]), ...(o.unattributed_usd === 'unmeasured' ? ['BOB and ROOT (no priced row)'] : [])])];
  return {
    days: d, cutoff: new Date(cutoff).toISOString(), rule: SURVIVAL_RULE, cost_rule: SURVIVAL_COST_RULE,
    measured: prs.length, surviving, pending_younger: pending, prs,
    cost_usd: Math.round(cost * 1e4) / 1e4,
    cost_per_surviving_pr: surviving ? Math.round(cost / surviving * 1e4) / 1e4 : 'unmeasured: no surviving pull request',
    unmeasured_cost: unmeasured,
  };
}

// In a shallow clone the history survival reads is cut: fetch the tranche and main whole first.
export function wholeHistory(root, tranche) {
  for (const b of [tranche, 'main']) {
    const shallow = out(root, ['rev-parse', '--is-shallow-repository']) === 'true';
    git(['fetch', '-q', ...(shallow ? ['--unshallow'] : []), 'origin', `+refs/heads/${b}:refs/remotes/origin/${b}`], { cwd: root, allowFail: true });
  }
}

// bob wake --stateless: the create_session call of a fresh BOB for one wake, whose prompt is the
// reading set (reading_bob) and status --role bob as it reads now, with its size. Writes nothing.
export function statelessWake(root, { slug, live, context, offline = false, tip, log = console.log } = {}) {
  const cfg = loadConfig(root);
  const rev = tip || (offline ? out(root, ['rev-parse', 'HEAD']) : tipApprovals(root, cfg).tip);
  const lines = [];
  status(root, { role: 'bob', live, context, offline, log: (l) => lines.push(l) });
  const rootId = readAddress(root, { fetch: false }).root?.session || 'none addressed';
  const files = cfg.reading_bob.map((f) => { const p = join(root, f); return `## ${f}\n\n${existsSync(p) ? readFileSync(p, 'utf8').trimEnd() : '(missing)'}`; });
  const prompt = [
    '# BOB, one stateless wake', '',
    `You are BOB for ${slug} for this one wake: a fresh session that remembers no earlier wake. Your coordinator is ROOT, session \`${rootId}\`. Below are your reading set and \`${P3} status --role bob\` as it read at ${now()}. Act on it, each judged act its own command, leave in the record what the next wake needs, and end.`, '',
    rulebookLine('bob'), '', ...files.flatMap((f) => [f, '']), '## status --role bob', '', ...lines, '',
  ].join('\n');
  const model = cfg.roles?.bob?.model;
  const call = { title: 'BOB (stateless wake)', source_url: `https://github.com/${slug}`, source_revision: rev, ...(cfg.clone || {}), ...(model ? { model } : {}), prompt };
  const bytes = Buffer.byteLength(prompt);
  log(prompt);
  log(`prompt: ${bytes} bytes`);
  log(`create_session, printed only (nothing was written):\n${JSON.stringify(call, null, 2)}`);
  log(`after the wake ends: ${P3} metrics wake --session <its id> --tokens <n> --usd <x> --mode stateless`);
  return { prompt, call, bytes };
}
