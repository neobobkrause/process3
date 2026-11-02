// GitHub acts and reads, all through gh (platform rows 13, 14). Every remote act is recorded
// only from its result (REC-5): callers use the returned objects, never their own intent.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fail, gh, run } from './util.mjs';

export const RECEIPT = 'p3:receipt';
export const GATE = 'p3:gate';

// A machine-readable comment: an HTML marker and one fenced JSON block.
export const block = (marker, data, lead = '') =>
  `<!-- ${marker} -->\n${lead}${lead ? '\n\n' : ''}\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;

export function parseBlock(body, marker) {
  if (!body || !body.includes(`<!-- ${marker} -->`)) return null;
  const m = body.match(/```json\n([\s\S]*?)\n```/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

export function findPR(slug, head, { state = 'open' } = {}) {
  const owner = slug.split('/')[0];
  const prs = gh(['api', `repos/${slug}/pulls?state=${state}&head=${owner}:${encodeURIComponent(head)}&per_page=10`]) || [];
  return prs[0] || null;
}

export const getPR = (slug, n) => gh(['api', `repos/${slug}/pulls/${n}`]);

export function openPRs(slug, base) {
  const pages = gh(['api', '--paginate', '--slurp', `repos/${slug}/pulls?state=open&base=${encodeURIComponent(base)}&per_page=100`], { allowFail: true });
  return Array.isArray(pages) ? pages.flat() : null;
}

export function createPR(slug, { head, base, title, body, draft = true }) {
  const pr = gh(['api', '-X', 'POST', `repos/${slug}/pulls`, '--input', '-'], {
    input: JSON.stringify({ head, base, title, body, draft }),
  });
  if (!pr?.number) fail('GitHub did not return a pull request');
  return pr;
}

export function comments(slug, n) {
  const pages = gh(['api', '--paginate', '--slurp', `repos/${slug}/issues/${n}/comments?per_page=100`]);
  return Array.isArray(pages) ? pages.flat() : [];
}

export function addComment(slug, n, body) {
  const c = gh(['api', '-X', 'POST', `repos/${slug}/issues/${n}/comments`, '--input', '-'], { input: JSON.stringify({ body }) });
  if (!c?.id) fail('GitHub did not return the comment');
  return c;
}

export function editComment(slug, id, body) {
  return gh(['api', '-X', 'PATCH', `repos/${slug}/issues/comments/${id}`, '--input', '-'], { input: JSON.stringify({ body }) });
}

// The newest comment carrying a marker, with its parsed block. With `from`, only comments
// written by that account count.
export function latestBlock(slug, n, marker, all = comments(slug, n), { from } = {}) {
  for (const c of [...all].reverse()) {
    if (from !== undefined && (!from || c.user?.login !== from)) continue;
    const data = parseBlock(c.body, marker);
    if (data) return { comment: c, data };
  }
  return null;
}

// The newest receipt, only from the account that opened the pull request: the job's own
// session account. Anyone else's p3:receipt comment is not read (review of PR 13).
export const latestReceipt = (all, opener) => latestBlock(null, null, RECEIPT, all, { from: opener || null })?.data || null;

// Gate runs, each its own comment written by GitHub Actions and never edited since. A session
// can post a comment that looks like one, or (as the owner) edit one, so only the bot's
// unedited comments count.
export const BOT = 'github-actions[bot]';
export function gateRuns(all) {
  return all
    .filter((c) => c.user?.login === BOT && (!c.updated_at || c.updated_at === c.created_at))
    .flatMap((c) => parseBlock(c.body, GATE)?.runs || []);
}

// A gate row is trusted only when its Actions run is the process gate on the row's commit,
// finished green or red as the row says, and the run's own artifact holds the same row: a
// side workflow can post a bot comment, but it cannot upload into another workflow's run.
export const GATE_WORKFLOW = '.github/workflows/process-gate.yml';
export const getRun = (slug, id) => gh(['api', `repos/${slug}/actions/runs/${id}`], { allowFail: true });
export function runArtifactRow(slug, id) {
  const dir = mkdtempSync(join(tmpdir(), 'p3-row-'));
  try {
    if (gh(['run', 'download', String(id), '-R', slug, '-n', 'gate-row', '-D', dir], { allowFail: true }) === null && !existsSync(join(dir, 'gate.json'))) return null;
    return JSON.parse(readFileSync(join(dir, 'gate.json'), 'utf8')).run || null;
  } catch { return null; } finally { rmSync(dir, { recursive: true, force: true }); }
}
const SAME = ['sha', 'base', 'trigger', 'ok', 'receipt', 'receipt_attempt', 'suite', 'revert'];
export function verifyRow(slug, row, { pr, baseRef }, io = { getRun, runArtifactRow }) {
  if (!row?.run_id) return false;
  const a = io.getRun(slug, row.run_id);
  if (!a || a.path !== GATE_WORKFLOW || a.head_sha !== row.sha || a.status !== 'completed') return false;
  // The run must be this pull request's own, into the tranche: not a second PR on the same
  // commit into a branch that carries a workflow of its own.
  // (Every pull request GitHub lists for the run must be into the tranche, in case it lists
  // all open PRs that share the head branch.)
  const prs = a.pull_requests || [];
  if (a.event !== 'pull_request' || !prs.some((p) => p.number === pr) || !prs.every((p) => p.base?.ref === baseRef)) return false;
  if (row.ok && a.conclusion !== 'success') return false;
  const art = io.runArtifactRow(slug, row.run_id);
  return !!art && SAME.every((k) => JSON.stringify(art[k] ?? null) === JSON.stringify(row[k] ?? null));
}

// GitHub's REST API has no ready-for-review call, and `gh pr ready` uses GraphQL, which Claude
// Code sessions cannot reach (measured 1 Nov 2026, the first product job). Sessions reach it
// through their proxy's REST route; anywhere else, `gh pr ready` is the route.
export function markReady(slug, n, { call = (args) => run('gh', args), read = getPR } = {}) {
  const tried = [['api', '-X', 'POST', `repos/${slug}/pulls/${n}/ccr/ready_for_review`], ['pr', 'ready', String(n), '-R', slug]];
  const errors = [];
  for (const args of tried) {
    const r = call(args);
    if (r.code === 0) break;
    errors.push(`gh ${args.slice(0, 3).join(' ')}: ${(r.stderr || r.stdout || '').trim().split('\n')[0]}`);
  }
  if (errors.length === tried.length) fail(`could not mark pull request ${n} ready: ${errors.join('; ')}`);
  const pr = read(slug, n);
  if (pr.draft) fail(`pull request ${n} is still a draft`);
  return pr;
}

// Conclusion of the newest check run named `name` on a commit, or null when none.
export function checkRun(slug, sha, name) {
  const r = gh(['api', `repos/${slug}/commits/${sha}/check-runs?check_name=${encodeURIComponent(name)}&per_page=20`], { allowFail: true });
  const runs = (r?.check_runs || []).sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)));
  return runs[0] || null;
}
