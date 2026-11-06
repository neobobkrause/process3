// p3 github audit [--since <iso>] [--repo <owner/repo>]... (R17c; Bob, 6 Nov: does ALL GitHub
// traffic go through, and get tracked by, the pacing mechanism?). GitHub's own evidence against the
// account's ledger (pace.mjs usage: the shared rows and this clone's log), one line per check:
//   calls   GitHub's primary count (rate_limit, which covers its own hour to the reset) against the
//           ledger's calls in that hour; the gap is "outside the tool": connector reads, raw gh or
//           curl. Informational: connector reads stay on the primary count by design.
//   pushes  per repository, the pushes GitHub shows (push-triggered workflow runs, one per branch
//           and commit) against the ledger's pushes to it; for the product, its state branch's
//           commits in the window as an upper bound (one coalesced push carries several). A push
//           GitHub shows and the ledger lacks is unexplained, named by branch, actor and the
//           commit's Claude-Session trailer where it has one.
//   writes  the repositories' events (pull requests, comments, reviews) by the account's own login
//           against the ledger's content-creating requests; refs created are shown beside pushes.
// Exits 1 on an unexplained push or write gap. Repository-scoped endpoints only (sessions' proxies
// refuse users/* paths), every call paced like any gh call. GitHub's events API lags (30 s to
// hours) and keeps the last 300 events: a quiet gap can be lag, said in the line.
import { gh } from './util.mjs';
import { slugOf, usage } from './pace.mjs';

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
const sessionIn = (msg) => (String(msg || '').match(/Claude-Session:\s*\S*?(session_[A-Za-z0-9]+)/) || [])[1] || null;
const WRITES = new Set(['PullRequestEvent', 'IssueCommentEvent', 'PullRequestReviewEvent', 'PullRequestReviewCommentEvent']);
const bot = (login) => /\[bot\]$/.test(String(login || ''));

// Up to `max` pages of a list endpoint; `pick` takes a page's items.
function pages(read, path, { max = 3, pick = (x) => x, stop = () => false } = {}) {
  const out = [];
  for (let n = 1; n <= max; n++) {
    const page = read(['api', `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${n}`]);
    const items = Array.isArray(pick(page)) ? pick(page) : [];
    out.push(...items);
    if (items.length < 100 || items.some(stop)) break;
  }
  return out;
}

export function githubAudit(root, { since, repos = [], product = null, stateBranch = 'process-state', login, now = Date.now(), io = {}, log = console.log } = {}) {
  const read = io.gh || ((args) => gh(args, { cwd: root, allowFail: true }));
  const start = since === undefined ? now - 3600e3 : Date.parse(since);
  if (!Number.isFinite(start) || start >= now) throw new Error(`--since <iso time>: a time before now, not ${JSON.stringify(since)}`);
  const ledger = usage(root, { t: now, seconds: (now - start) / 1000 });
  const me = login === undefined ? (read(['api', 'user'])?.login || null) : login;
  const L = [];
  let unexplained = false;

  // Calls: GitHub's primary count covers the hour that ends at its reset.
  const rl = read(['api', 'rate_limit']);
  const core = rl?.resources?.core;
  if (core) {
    const from = core.reset * 1000 - 3600e3;
    const lc = usage(root, { t: now, seconds: Math.max(1, (now - from) / 1000) });
    const used = core.limit - core.remaining;
    const mine = lc.calls - lc.free;
    L.push(`calls, primary: GitHub ${used} of ${core.limit} used since ${iso(from)} vs ledger ${mine}: ${used - mine >= 0 ? `${used - mine} outside the tool (connector reads, raw gh or curl)` : `the ledger ${mine - used} over (calls GitHub counts under GraphQL, or before the reset)`}`);
    const g = rl.resources.graphql;
    if (g) L.push(`calls, GraphQL: GitHub ${g.limit - g.remaining} of ${g.limit} used (gh's pr and issue commands and the connector's GraphQL); the ledger counts these within its calls`);
  } else L.push('calls: rate_limit not answered; GitHub\'s count unread');

  // Pushes, per repository.
  const unattributed = ledger.pushes_by['?'] || 0;
  let over = 0;
  const named = [];
  const audited = [...new Set([...repos, ...Object.keys(ledger.pushes_by).filter((r) => r !== '?')].filter(Boolean))];
  for (const repo of audited) {
    const runs = pages(read, `repos/${repo}/actions/runs?event=push&created=>=${iso(start)}`, { pick: (p) => p?.workflow_runs });
    const seen = new Map();
    for (const r of runs) {
      if (Date.parse(r.created_at) < start) continue;
      if (me && r.actor?.login && r.actor.login !== me) continue;
      const k = `${r.head_branch}@${r.head_sha}`;
      if (!seen.has(k)) seen.set(k, { branch: r.head_branch, sha: String(r.head_sha || '').slice(0, 7), actor: r.actor?.login || '?', session: sessionIn(r.head_commit?.message) });
    }
    const gh0 = seen.size;
    const lr = ledger.pushes_by[repo] || 0;
    const gap = Math.max(0, gh0 - lr);
    over += gap;
    if (gap) named.push(...[...seen.values()].slice(-gap));
    L.push(`pushes, ${repo}: GitHub ${gh0} (push-triggered runs, one per branch and commit${gh0 ? `: ${[...new Set([...seen.values()].map((x) => x.branch))].slice(0, 5).join(', ')}` : ''}) vs ledger ${lr}${gap ? `: ${gap} GitHub shows that the ledger lacks` : ''}`);
    if (repo === product) {
      const commits = pages(read, `repos/${repo}/commits?sha=${encodeURIComponent(stateBranch)}&since=${iso(start)}`).filter((c) => Date.parse(c.commit?.committer?.date) >= start);
      L.push(`pushes, ${repo} ${stateBranch}: ${commits.length} commit(s) in the window, an upper bound (one coalesced push carries several); no workflow runs on it, so GitHub shows no push count`);
    }
  }
  const pushGap = Math.max(0, over - unattributed);
  if (pushGap) {
    unexplained = true;
    L.push(`UNEXPLAINED pushes: ${pushGap} (${over} GitHub shows the ledger lacks${unattributed ? `, less ${unattributed} ledger push(es) logged before pushes named their repository` : ''}): ${named.slice(0, 10).map((x) => `${x.branch}@${x.sha} by ${x.actor}${x.session ? ` (${x.session})` : ''}`).join('; ')}`);
  } else if (over) L.push(`pushes: the ${over} GitHub shows beyond the named ledger are covered by ${unattributed} ledger push(es) logged before pushes named their repository`);

  // Writes: the account's own pull requests, comments and reviews.
  let writes = 0;
  let created = 0;
  const who = [];
  for (const repo of audited) {
    const ev = pages(read, `repos/${repo}/events`, { stop: (e) => Date.parse(e.created_at) < start }).filter((e) => Date.parse(e.created_at) >= start && !bot(e.actor?.login) && (!me || e.actor?.login === me));
    for (const e of ev) {
      if (WRITES.has(e.type)) { writes++; who.push(`${repo} ${e.type.replace(/Event$/, '')}${e.payload?.action ? ` ${e.payload.action}` : ''}${e.payload?.pull_request?.number || e.payload?.issue?.number ? ` #${e.payload.pull_request?.number || e.payload.issue?.number}` : ''}`); }
      if (e.type === 'CreateEvent') created++;
    }
  }
  const wGap = Math.max(0, writes - ledger.content);
  L.push(`writes: GitHub ${writes} (pull requests, comments, reviews${me ? ` by ${me}` : ', any human login'}) vs ledger ${ledger.content} content-creating${wGap ? `: ${wGap} unexplained` : ''}; GitHub's events can lag up to hours`);
  if (wGap) { unexplained = true; L.push(`UNEXPLAINED writes: ${who.slice(-wGap).slice(0, 10).join('; ')}`); }
  L.push(`refs created: ${created} (CreateEvent: a branch or tag, each by a push) vs ledger ${ledger.pushes} push(es) in the window`);

  log(`github audit since ${iso(start)}${me ? `, as ${me}` : ''}: ${audited.join(', ') || 'no repository'}`);
  for (const l of L) log(`- ${l}`);
  log(unexplained ? 'audit: an unexplained push or write gap: some GitHub traffic went around the tool; find its session and route it through github push or github note' : 'audit: every push and write GitHub shows is in the ledger');
  return { ok: !unexplained, ledger, lines: L };
}

// The repositories audited by default: this clone's own and process3's (from the config's
// process_repo, else the pinned process3's origin); the ledger adds every one it names a push to.
export function auditRepos({ slug, cfg, processOrigin } = {}) {
  return [...new Set([slug, slugOf(cfg?.process_repo || '') || slugOf(processOrigin || '')].filter(Boolean))];
}
