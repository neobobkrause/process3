// GitHub acts and reads, all through gh (platform rows 13, 14). Every remote act is recorded
// only from its result (REC-5): callers use the returned objects, never their own intent.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fail, gh, ghRun, git, isShallow, run, withTemp } from './util.mjs';
import { commonDir } from './pace.mjs';

export const GATE = 'p3:gate';
// A reviewed revert exemption on a job's pull request (AUD-1, JOB-12; gate.mjs revertExemption).
export const REVERT_EXEMPT = 'p3:revert-exempt';

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

// Every pull request, open, closed or merged, whose head is this repository's branch; null when
// unreadable. Pull requests cannot be deleted, so this is every PR a run on the branch could be.
export function prsFromBranch(slug, branch, { read = (args) => gh(args, { allowFail: true }) } = {}) {
  const owner = String(slug).split('/')[0];
  const pages = read(['api', '--paginate', '--slurp', `repos/${slug}/pulls?state=all&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=100`]);
  return Array.isArray(pages) ? pages.flat() : null;
}

export function createPR(slug, { head, base, title, body, draft = true }) {
  const pr = gh(['api', '-X', 'POST', `repos/${slug}/pulls`, '--input', '-'], {
    input: JSON.stringify({ head, base, title, body, draft }),
  });
  if (!pr?.number) fail('GitHub did not return a pull request');
  return pr;
}

// job start --take-in: a taken-in pull request moved to the tranche (PATCH base) and made a
// draft. GitHub's REST API has no way back to draft and GraphQL, which has, is not reachable from
// Claude Code sessions (copy, 4 Nov: site's attempt 2 stopped on it before its push); their proxy
// names a REST route for it, tried first. Anywhere else the GraphQL mutation is the route.
export function editPR(slug, n, fields) {
  const pr = gh(['api', '-X', 'PATCH', `repos/${slug}/pulls/${n}`, '--input', '-'], { input: JSON.stringify(fields) });
  if (!pr?.number) fail(`GitHub did not return pull request ${n} after the edit`);
  return pr;
}
export function toDraft(slug, pr, { call = (args) => ghRun(args), read = getPR } = {}) {
  const tried = [
    ['api', '-X', 'POST', `repos/${slug}/pulls/${pr.number}/ccr/convert_to_draft`],
    ['api', 'graphql', '-f', 'query=mutation($id: ID!) { convertPullRequestToDraft(input: {pullRequestId: $id}) { pullRequest { isDraft } } }', '-f', `id=${pr.node_id}`],
  ];
  const errors = [];
  for (const args of tried) {
    const r = call(args);
    if (r.code === 0) break;
    errors.push(`gh ${args.slice(0, 3).join(' ')}: ${(r.stderr || r.stdout || '').trim().split('\n')[0]}`);
  }
  if (errors.length === tried.length) fail(`could not make pull request ${pr.number} a draft: ${errors.join('; ')}`);
  const now = read(slug, pr.number);
  if (!now?.draft) fail(`pull request ${pr.number} is still not a draft`);
  return now;
}

const commentsArgs = (slug, n) => ['api', '--paginate', '--slurp', `repos/${slug}/issues/${n}/comments?per_page=100`];
export function comments(slug, n) {
  const pages = gh(commentsArgs(slug, n));
  return Array.isArray(pages) ? pages.flat() : [];
}
// A pull request's comments kept in the clone (C18, 7 Nov: status --role bob re-read every PR merged
// since the tranche opened, ~260 requests a call, for gate rows that no longer change): served
// while ttlMs old, for every p3 process of the clone. The caller says how long: a merged PR's for
// hours, an open one's for seconds. A failed read is never kept.
// A read kept in the clone's git directory for ttlMs (ttl(value) may give a value its own), for
// every p3 process of the clone; a failed read (null, undefined) is never kept.
export function keptRead(root, key, ttl, read, { now = Date.now } = {}) {
  const dir = join(commonDir(root), 'p3-gh-cache');
  const f = join(dir, `${String(key).replace(/[^\w.-]/g, '_').slice(0, 180)}.json`);
  try { const c = JSON.parse(readFileSync(f, 'utf8')); if (c.at <= now() && now() - c.at < c.ttl) return c.value; } catch { /* not kept */ }
  const value = read();
  if (value !== null && value !== undefined) { try { mkdirSync(dir, { recursive: true }); writeFileSync(f, JSON.stringify({ at: now(), ttl: typeof ttl === 'function' ? ttl(value) : ttl, value })); } catch { /* a saving */ } }
  return value;
}
// GitHub's compare kept 5 min for a commit (a status run takes over 2), 30 s for a branch name
// (its tip moves: a job's ahead count, cold review of C18); a commit found on its base (ahead_by 0, base main) for a day: main
// never moves back (C18: status read every closed layer's commit against main on every call).
export const keptCompare = (root) => (slug, base, head) => keptRead(root, `compare-${slug}-${base}-${head}`, (c) => (base === 'main' && c?.ahead_by === 0 && /^[0-9a-f]{40}$/.test(String(head)) ? 24 * 3600e3 : /^[0-9a-f]{7,40}$/.test(String(head)) ? 300e3 : 30e3), () => compare(slug, base, head));
export const COMMENTS_MERGED_MS = 6 * 3600e3;
export const COMMENTS_OPEN_MS = 30e3;
export function cachedComments(root, slug, n, { ttlMs = COMMENTS_OPEN_MS, now = Date.now, read = comments } = {}) {
  const got = keptRead(root, `comments-${slug}-${Number(n)}`, ttlMs, () => { const c = read(slug, n); return Array.isArray(c) ? c : null; }, { now });
  return got;
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
// Whether GitHub serves a run: 'served', 'gone' (404: a run the suspended account triggered is hidden
// with its pull requests, copy run 42277392893, 7 Nov), or null for any other failure (unread: the
// caller fails closed).
// Gone only when GitHub itself answers 404 Not Found for the run while it serves the repository (not a
// proxy's or a host's error, not a token that cannot see the repository: cold review).
const notFound = (r) => /\(HTTP 404\)/.test(r.stderr || '') && /"message"\s*:\s*"Not Found"/.test(`${r.stdout || ''}${r.stderr || ''}`);
export function runState(slug, id, { run = ghRun } = {}) {
  const r = run(['api', `repos/${slug}/actions/runs/${id}`]);
  if (r.code === 0) return 'served';
  if (!notFound(r)) return null;
  return run(['api', `repos/${slug}`]).code === 0 ? 'gone' : null;
}
// Whether GitHub definitively says pull request n does not exist in slug (PD-18, notice withdraw):
// { missing: true, status } only when the pulls endpoint answers GitHub's own 404 Not Found, the
// repository itself is served (a wrong slug or a token that cannot see it 404s every PR), and the
// issues endpoint agrees: a 404 or 410 there (no such number), or an issue with no pull_request
// (the number is an issue, not a PR). Any other answer, a network error, a 5xx, a rate limit or a
// 403 included, is { missing: false, unread } and the caller fails closed; a served PR is { pr }.
export function prPresence(slug, n, { run = ghRun } = {}) {
  const pulls = run(['api', `repos/${slug}/pulls/${n}`]);
  if (pulls.code === 0) { try { return { missing: false, pr: JSON.parse(pulls.stdout) }; } catch { return { missing: false, unread: 'the pull request could not be parsed' }; } }
  const said = (r) => (r.stderr || r.stdout || '').trim().split('\n')[0].slice(0, 200);
  if (!notFound(pulls)) return { missing: false, unread: said(pulls) || `exit ${pulls.code}` };
  const repo = run(['api', `repos/${slug}`]);
  if (repo.code !== 0) return { missing: false, unread: `GitHub did not serve ${slug} itself: ${said(repo)}` };
  // The repository GitHub served is the one asked for (cold review of C48: a renamed or moved
  // repository answers for another name, and a 404 there says nothing of the slug's own PRs).
  let full = null;
  try { full = JSON.parse(repo.stdout)?.full_name; } catch { /* unread below */ }
  if (typeof full !== 'string' || full.toLowerCase() !== String(slug).toLowerCase()) return { missing: false, unread: `GitHub served ${full || 'an unreadable repository'} for ${slug}` };
  const issue = run(['api', `repos/${slug}/issues/${n}`]);
  if (issue.code === 0) {
    let body = null;
    try { body = JSON.parse(issue.stdout); } catch { return { missing: false, unread: `issue ${n} could not be parsed` }; }
    if (!body || typeof body !== 'object' || Number(body.number) !== Number(n)) return { missing: false, unread: `issue ${n} read as another number` };
    if (body.pull_request) return { missing: false, unread: `GitHub serves ${n} as a pull request on its issues endpoint but 404s its pulls endpoint` };
    return { missing: true, status: `404, ${n} is an issue` };
  }
  if (notFound(issue)) return { missing: true, status: '404' };
  if (/\(HTTP 410\)/.test(issue.stderr || '')) return { missing: true, status: '404, issue 410 Gone' };
  return { missing: false, unread: said(issue) || `exit ${issue.code}` };
}
export function runArtifactRow(slug, id) {
  return withTemp('p3-row-', (dir) => {
    try {
      if (gh(['run', 'download', String(id), '-R', slug, '-n', 'gate-row', '-D', dir], { allowFail: true }) === null && !existsSync(join(dir, 'gate.json'))) return null;
      return JSON.parse(readFileSync(join(dir, 'gate.json'), 'utf8')).run || null;
    } catch { return null; }
  });
}
// scope and after too: the tranche cover trusts a row for the module it ran and the run it stood on.
// refresh too: merge --plain trusts a row's regenerate comparison (copy PR 148).
// base_red too: the tranche cover and a spec-tested land read whether a suite was base-red.
// tree, spec and spec_* too: a spec-tested fast path and the tranche cover trust a spec row for the
// tree it tested and the job it judged, and a spec-tested row for the spec run it names (train-spec).
const SAME = ['sha', 'base', 'trigger', 'ok', 'attempt', 'suite', 'revert', 'scope', 'after', 'refresh', 'base_red', 'tree', 'spec', 'spec_pr', 'spec_run', 'spec_sha'];
export function verifyRow(slug, row, { pr, baseRef, merged }, io = { getRun, runArtifactRow }) {
  if (!row?.run_id) return false;
  const a = io.getRun(slug, row.run_id);
  if (!a || a.path !== GATE_WORKFLOW || a.head_sha !== row.sha || a.status !== 'completed') return false;
  // The run must be this pull request's own, into the tranche: not a second PR on the same
  // commit into a branch that carries a workflow of its own.
  // (Every pull request GitHub lists for the run must be into the tranche, in case it lists
  // all open PRs that share the head branch.)
  // Once the pull request merges, GitHub lists none on its runs (measured on the copy 4 Nov:
  // registers PR 86, run 41778833434; site PR 79, run 41779185745). A merged job PR's run is
  // bound instead by what GitHub keeps (merged, passed only by the tranche cover once it has read
  // the merged PR): the run was on the PR's branch, in this repository, and green; the caller
  // binds the row's commits to the PR's head and the tranche.
  // A merged PR's branch reused by a later PR (a reopen on the same job branch: the copy's PR 805,
  // landed, and 850, opened as a draft from job/queue-producers-2, 8 Nov): GitHub then lists the
  // later PR on the merged PR's runs, not the merged one (C32). Listing only PRs from the merged
  // PR's own branch into the same base, the run is bound as one listing none is.
  const prs = a.pull_requests || [];
  if (a.event !== 'pull_request') return false;
  const asMerged = () => !!merged && a.head_branch === merged.branch && a.head_repository?.full_name === slug && a.conclusion === 'success';
  const sameBranch = prs.length && !prs.some((p) => p.number === pr) && prs.every((p) => p.head?.ref === merged?.branch && p.base?.ref === baseRef);
  if (prs.length && !sameBranch ? !prs.some((p) => p.number === pr) || !prs.every((p) => p.base?.ref === baseRef) : !asMerged()) return false;
  if (row.ok && a.conclusion !== 'success') return false;
  const art = io.runArtifactRow(slug, row.run_id);
  return !!art && SAME.every((k) => JSON.stringify(art[k] ?? null) === JSON.stringify(row[k] ?? null));
}

// GitHub's REST API has no ready-for-review call, and `gh pr ready` uses GraphQL, which Claude
// Code sessions cannot reach (measured 1 Nov 2026, the first product job). Sessions reach it
// through their proxy's REST route; anywhere else, `gh pr ready` is the route. No other call in
// the tool uses GraphQL (toDraft above takes the same two routes).
export function markReady(slug, n, { call = (args) => ghRun(args), read = getPR } = {}) {
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
const checkRunArgs = (slug, sha, name) => ['api', `repos/${slug}/commits/${sha}/check-runs?check_name=${encodeURIComponent(name)}&per_page=20`];
const newestRun = (r) => (r?.check_runs || []).sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))[0] || null;
export function checkRun(slug, sha, name) {
  return newestRun(gh(checkRunArgs(slug, sha, name), { allowFail: true }));
}

// The checks a branch's rulesets require (merge --plain), by name; null when the rules cannot
// be read. Read from the rulesets, not classic branch protection.
export function requiredChecks(slug, branch, { read = (args) => gh(args, { allowFail: true }) } = {}) {
  const path = branch.split('/').map(encodeURIComponent).join('/');
  const rules = read(['api', `repos/${slug}/rules/branches/${path}?per_page=100`]);
  if (!Array.isArray(rules)) return null;
  const checks = rules.filter((r) => r.type === 'required_status_checks').flatMap((r) => r.parameters?.required_status_checks || []);
  return { checks: checks.map((c) => ({ context: c.context })) };
}

// Every check run of that name on a commit, newest first; null when unreadable.
const checkRunsArgs = (slug, sha, name) => ['api', `repos/${slug}/commits/${sha}/check-runs?check_name=${encodeURIComponent(name)}&filter=all&per_page=100`];
const allRuns = (r) => (!r || !Array.isArray(r.check_runs) ? null : [...r.check_runs].sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)) || (b.id || 0) - (a.id || 0)));
export function checkRuns(slug, sha, name, { read = (args) => gh(args, { allowFail: true }) } = {}) {
  return allRuns(read(checkRunsArgs(slug, sha, name)));
}

// GitHub's comparison of two refs or commits: ahead_by, behind_by, merge_base_commit; null when
// unreadable.
const refPath = (r) => String(r).split('/').map(encodeURIComponent).join('/');
export const compare = (slug, base, head) => gh(['api', `repos/${slug}/compare/${refPath(base)}...${refPath(head)}?per_page=1`], { allowFail: true });

// Commits on head that base lacks. In a shallow clone the local count is wrong (both histories
// are cut), so GitHub's compare answers when a slug is given (online); a full clone, offline, or
// a failed call counts locally with rev-list local[0]..local[1]. null when neither can.
export function aheadBy(root, { slug, base, head, local, read = compare }) {
  if (slug && isShallow(root)) {
    const c = read(slug, base, head);
    if (Number.isInteger(c?.ahead_by)) return c.ahead_by;
  }
  const r = git(['rev-list', '--count', `${local[0]}..${local[1]}`], { cwd: root, allowFail: true });
  return r.code === 0 ? Number(r.stdout.trim()) : null;
}
