// p3 github audit [--since <iso>] [--repo <owner/repo>]... [--login <login>] (R17c; Bob, 6 Nov:
// does ALL GitHub traffic go through, and get tracked by, the pacing mechanism?). GitHub's own
// evidence against the account's ledger (pace.mjs usage: the shared rows and this clone's log):
//   calls      GitHub's primary count (rate_limit, which covers its own hour to the reset) against
//              the ledger's REST calls in that hour; the gap is "outside the tool" (the connector's
//              reads, raw gh or curl): informational, since connector reads stay on GitHub's count.
//              The connector calls the session hook counted are shown beside it.
//   pushes     per repository: push-triggered workflow runs (one per branch and commit) against the
//              ledger's pushes to branches other than the state branch (merges and release tags the
//              tool made count as pushes: GitHub raises a push for each); the product's state
//              branch: its commits in the window (an upper bound: one coalesced push carries several)
//              against the ledger's state pushes. A push GitHub shows that the ledger lacks is
//              unexplained, named by branch, actor and the commit's Claude-Session trailer.
//   writes     per repository, the account's pull request, comment and review events (a review's
//              own inline comments count once with it) against the ledger's content-creating
//              requests to that repository.
// Not compared: the last share_s + 60 s (other sessions share their use every share_s), and
// anything older than the ledger's two hours. Exit 1 on an unexplained push or write gap.
// Repository-scoped endpoints only (sessions' proxies refuse users/* paths): the account's activity
// is every login but bots and the repository's owner, or the --login given. Paced like any gh call.
import { gh } from './util.mjs';
import { pacing, slugOf, usage } from './pace.mjs';

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
const sessionIn = (msg) => (String(msg || '').match(/Claude-Session:\s*\S*?(session_[A-Za-z0-9]+)/) || [])[1] || null;
const PR_ACTS = new Set(['opened', 'edited', 'closed', 'reopened', 'ready_for_review', 'converted_to_draft']);
const bot = (login) => /\[bot\]$/.test(String(login || ''));
export const LEDGER_HOURS = 2;

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

export function githubAudit(root, { since, repos = [], product = null, stateBranch = 'process-state', login = null, now = Date.now(), io = {}, log = console.log, p = pacing() } = {}) {
  const read = io.gh || ((args) => gh(args, { cwd: root, allowFail: true }));
  const start = since === undefined ? now - 3600e3 : Date.parse(since);
  if (!Number.isFinite(start) || start >= now) throw new Error(`--since <iso time>: a time before now, not ${JSON.stringify(since)}`);
  if (start < now - LEDGER_HOURS * 3600e3) throw new Error(`--since ${iso(start)}: the ledger keeps ${LEDGER_HOURS} hours of every session's use; audit from ${iso(now - LEDGER_HOURS * 3600e3)} or later`);
  // Other sessions' last minutes are not shared yet: GitHub's evidence and the ledger both end here.
  const until = Math.max(start + 60e3, now - (p.share_s + 60) * 1000);
  const ledger = usage(root, { t: until, seconds: (until - start) / 1000 });
  const ours = (login0, repo) => !bot(login0) && (login ? login0 === login : String(login0 || '').toLowerCase() !== String(repo).split('/')[0]);
  const inWindow = (t) => { const ms = Date.parse(t); return ms >= start && ms < until; };
  const L = [];
  let unexplained = false;

  // Calls: GitHub's primary count covers the hour that ends at its reset.
  const rl = read(['api', 'rate_limit']);
  const core = rl?.resources?.core;
  if (core) {
    const from = core.reset * 1000 - 3600e3;
    const lc = usage(root, { t: now, seconds: Math.max(1, (now - from) / 1000) });
    const used = core.limit - core.remaining;
    const rest = lc.calls - lc.free - lc.graphql - lc.connector;
    L.push(`calls, primary: GitHub ${used} of ${core.limit} used since ${iso(from)} vs ledger ${rest} REST call(s): ${used - rest >= 0 ? `${used - rest} outside the tool (the connector's reads, raw gh or curl)` : `the ledger ${rest - used} over (counted before GitHub's reset)`}`);
    L.push(`calls, connector: ${lc.connector} counted by the session hook in that hour (on GitHub's primary or GraphQL count, as the connector makes them)`);
    const g = rl.resources.graphql;
    if (g) L.push(`calls, GraphQL: GitHub ${g.limit - g.remaining} of ${g.limit} used vs ledger ${lc.graphql} (gh's pr and issue commands)`);
  } else L.push('calls: rate_limit not answered; GitHub\'s count unread');

  // Pushes, per repository; the ledger's pushes logged with no repository cover gaps first.
  let pool = ledger.pushes_by['?'] || 0;
  const named = [];
  const audited = [...new Set([...repos.map((r) => r.toLowerCase()), ...Object.keys(ledger.pushes_by).map((k) => k.replace(/#state$/, '')).filter((r) => r !== '?')].filter((r) => slugOf(r)))];
  let pushGap = 0;
  for (const repo of audited) {
    const runs = pages(read, `repos/${repo}/actions/runs?event=push&created=>=${iso(start)}`, { pick: (x) => x?.workflow_runs });
    const seen = new Map();
    for (const r of runs) {
      if (!inWindow(r.created_at) || !ours(r.actor?.login, repo) || r.head_branch === stateBranch) continue;
      const k = `${r.head_branch}@${r.head_sha}`;
      if (!seen.has(k)) seen.set(k, { branch: r.head_branch, sha: String(r.head_sha || '').slice(0, 7), actor: r.actor?.login || '?', session: sessionIn(r.head_commit?.message) });
    }
    const lr = ledger.pushes_by[repo] || 0;
    let gap = Math.max(0, seen.size - lr);
    const covered = Math.min(gap, pool);
    pool -= covered;
    gap -= covered;
    if (gap) { pushGap += gap; named.push(...[...seen.values()].slice(-gap)); }
    L.push(`pushes, ${repo}: GitHub ${seen.size} (push-triggered runs, one per branch and commit${seen.size ? `: ${[...new Set([...seen.values()].map((x) => x.branch))].slice(0, 5).join(', ')}` : ''}) vs ledger ${lr}${covered ? `, ${covered} covered by pushes logged with no repository` : ''}${gap ? `: ${gap} GitHub shows that the ledger lacks` : ''}`);
    if (repo === String(product || '').toLowerCase()) {
      const commits = pages(read, `repos/${repo}/commits?sha=${encodeURIComponent(stateBranch)}&since=${iso(start)}`).filter((c) => inWindow(c.commit?.committer?.date));
      const ls = ledger.pushes_by[`${repo}#state`] || 0;
      // At least one push carried the commits; the ledger can hold no more pushes than commits.
      let sgap = commits.length && !ls ? 1 : 0;
      if (sgap && pool) { pool--; sgap = 0; }
      if (sgap) { pushGap += 1; named.push({ branch: stateBranch, sha: String(commits[0].sha || '').slice(0, 7), actor: commits[0].author?.login || '?', session: sessionIn(commits[0].commit?.message) }); }
      L.push(`pushes, ${repo} ${stateBranch}: ${commits.length} commit(s) in the window (pushes ≤ commits: one coalesced push carries several) vs ledger ${ls} state push(es)${sgap ? ': at least 1 the ledger lacks' : ''}`);
    }
  }
  if (pushGap) {
    unexplained = true;
    L.push(`UNEXPLAINED pushes: ${pushGap}: ${named.slice(0, 10).map((x) => `${x.branch}@${x.sha} by ${x.actor}${x.session ? ` (${x.session})` : ''}`).join('; ')}`);
  }

  // Writes, per repository; content logged with no repository covers gaps first.
  let cpool = ledger.content_by['?'] || 0;
  let created = 0;
  let wGap = 0;
  const who = [];
  for (const repo of audited) {
    const ev = pages(read, `repos/${repo}/events`, { stop: (e) => Date.parse(e.created_at) < start }).filter((e) => inWindow(e.created_at) && ours(e.actor?.login, repo));
    const reviews = new Set(ev.filter((e) => e.type === 'PullRequestReviewEvent').map((e) => e.payload?.review?.id).filter(Boolean));
    const writes = ev.filter((e) => (e.type === 'PullRequestEvent' && PR_ACTS.has(e.payload?.action))
      || (e.type === 'IssueCommentEvent' && e.payload?.action !== 'deleted')
      || e.type === 'PullRequestReviewEvent'
      || (e.type === 'PullRequestReviewCommentEvent' && !reviews.has(e.payload?.comment?.pull_request_review_id)));
    created += ev.filter((e) => e.type === 'CreateEvent').length;
    const lw = ledger.content_by[repo] || 0;
    let gap = Math.max(0, writes.length - lw);
    const covered = Math.min(gap, cpool);
    cpool -= covered;
    gap -= covered;
    if (gap) { wGap += gap; who.push(...writes.slice(0, gap).map((e) => `${repo} ${e.type.replace(/Event$/, '')}${e.payload?.action ? ` ${e.payload.action}` : ''}${e.payload?.pull_request?.number || e.payload?.issue?.number ? ` #${e.payload.pull_request?.number || e.payload.issue?.number}` : ''} by ${e.actor?.login}`)); }
    L.push(`writes, ${repo}: GitHub ${writes.length} (pull requests, comments, reviews) vs ledger ${lw}${covered ? `, ${covered} covered by writes logged with no repository` : ''}${gap ? `: ${gap} unexplained` : ''}`);
  }
  if (wGap) { unexplained = true; L.push(`UNEXPLAINED writes: ${who.slice(0, 10).join('; ')}`); }
  L.push(`refs created: ${created} (CreateEvent: a branch or tag, each by a push) vs ledger ${ledger.pushes} push(es) in the window; GitHub's events can lag up to hours`);

  log(`github audit ${iso(start)} to ${iso(until)} (the last ${Math.round((now - until) / 60e3)} min left out: not yet shared by every session)${login ? `, as ${login}` : ', every login but bots and each repository\'s owner'}: ${audited.join(', ') || 'no repository'}`);
  for (const l of L) log(`- ${l}`);
  log(unexplained ? 'audit: an unexplained push or write gap: some GitHub traffic went around the tool; find its session and route it through the tool, github push or github note' : 'audit: every push and write GitHub shows is in the ledger');
  return { ok: !unexplained, ledger, lines: L };
}

// The repositories audited by default: this clone's own and process3's (from the config's
// process_repo, else the pinned process3's origin); the ledger adds every one it names a push to.
export function auditRepos({ slug, cfg, processOrigin } = {}) {
  return [...new Set([slugOf(slug || ''), slugOf(cfg?.process_repo || '') || slugOf(processOrigin || '')].filter(Boolean))];
}
