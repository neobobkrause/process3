// merge (GAT-8, INT-1): BOB brings a job's branch up to the tranche, writes the merge row, waits
// for the gate on that tip, and merges only a green, current tip. The merge is completion.
// merge runs with BOB's tool, not the pull request's, so it repeats the checks a pull request
// could switch off in its own copy of the gate workflow: ownership, and a checked receipt.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { ACTIONS_APP, checkRun, checkRuns, comments, gateRuns, getPR, latestReceipt, namedRequiredChecks, openFrom, requiredChecks, verifyRow, workflowRun } from './github.mjs';
import { checkLedger, entryFile, readLedgerTexts } from './ledger.mjs';
import { appendRow, metricsFile, readRows } from './metrics.mjs';
import { ownPaths } from './gate.mjs';
import { ownerAnswer, repoOwnerOf, webCommitByOwner } from './record.mjs';
import { TOOL_ROOT } from './job.mjs';
import { BASE_MOVED, CONFIG_FILE, DEFAULTS, Fail, RETRIES, fail, gh, git, loadConfig, now, repoSlug, underPath } from './util.mjs';

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const MINUTE = 60000;

// Waits for a completed gate run on the commit; a cancelled run (superseded by another event on
// the same tip) is waited past.
export function waitForGate(slug, sha, { minutes = 30, every = 15000, read = checkRun, log = console.log } = {}) {
  const until = Date.now() + minutes * MINUTE;
  for (;;) {
    const run = read(slug, sha, 'gate');
    if (run?.status === 'completed' && run.conclusion !== 'cancelled') return run;
    if (Date.now() > until) fail(`the gate on ${sha.slice(0, 10)} did not finish within ${minutes} min`);
    log(`waiting for the gate on ${sha.slice(0, 10)} (${run ? run.conclusion || run.status : 'not started'})`);
    sleep(every);
  }
}

export function merge(root, n, opts = {}) {
  const { reviewed, noReview, minutes = 30, log = console.log } = opts;
  const io = { getPR, comments, checkRun, mergePR, verify: (slug, r, ctx) => verifyRow(slug, r, ctx), ...(opts.io || {}) };
  if (!reviewed && !noReview) fail('say whether a fresh reviewer ran: --reviewed "<what>" or --no-review "<why>" (INT-2)');
  const cfg = loadConfig(root);
  const slug = opts.slug || repoSlug(root);
  const pr = io.getPR(slug, n);
  const id = pr.head?.ref?.match(/^job\/([a-z0-9-]+)$/)?.[1];
  if (pr.state !== 'open') fail(`pull request ${n} is ${pr.state}`);
  if (pr.draft) fail(`pull request ${n} is a draft: the job has not completed`);
  if (pr.base.ref !== cfg.tranche) fail(`pull request ${n} is into ${pr.base.ref}, not the tranche ${cfg.tranche}`);
  if (!id) fail(`pull request ${n} is not from a job branch; any other pull request merges with --plain`);

  // The newest receipt must have been checked, and agreed with, by a green gate run on the tip.
  const first = io.checkRun(slug, pr.head.sha, 'gate');
  if (first?.conclusion !== 'success') fail(`the gate is not green on ${pr.head.sha.slice(0, 10)} (${first ? first.conclusion || first.status : 'no run'})`);
  const all = io.comments(slug, n);
  const receipt = latestReceipt(all, pr.user?.login); // only the opener's (review of PR 13)
  if (!receipt) fail(`pull request ${n} has no receipt`);
  // Each row names its Actions run; the row counts only when that run is the process gate on
  // this tip, green, and its own artifact holds the same row (verifyRow).
  const agreed = gateRuns(all).filter((r) => r.sha === pr.head.sha && r.ok && r.receipt === 'agrees' && r.receipt_attempt === receipt.attempt)
    .find((r) => io.verify(slug, r, { pr: n, baseRef: cfg.tranche }));
  if (!agreed) fail(`no green process-gate run on ${pr.head.sha.slice(0, 10)} checked receipt attempt ${receipt.attempt} and agreed with it`);

  const branch = `job/${id}`;
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`, `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { cwd: root });
  if (git(['rev-parse', `origin/${branch}`], { cwd: root }) !== pr.head.sha) fail(`${branch} moved since the gate ran; run merge again`);

  // ARC-2 and the ledger's job rule, held here by BOB's tool: the job changed only its own
  // module and records, and nothing in the ledger but its own status. The paths come from the
  // tranche's copy of the entry, never from the job's branch.
  const mb = git(['merge-base', `origin/${branch}`, `origin/${cfg.tranche}`], { cwd: root });
  const entryText = git(['show', `${mb}:${entryFile(id)}`], { cwd: root, allowFail: true });
  if (entryText.code !== 0) fail(`the tranche has no ledger entry for ${id}`);
  const own = ownPaths(JSON.parse(entryText.stdout));
  const ledger = checkLedger(root, { ref: `origin/${branch}`, base: mb, branch });
  if (ledger.length) fail(`ledger: ${ledger.map((f) => `${f.file}: ${f.message}`).join('; ')}`);
  // No rename detection, so a rename lists the path it removes too (confirming review of PR 14).
  const outside = git(['diff', '--no-renames', '--name-only', '-z', mb, `origin/${branch}`], { cwd: root }).split('\0').filter(Boolean).filter((f) => !own.some((p) => underPath(f, p)));
  if (outside.length) fail(`${branch} changes files outside its module: ${outside.slice(0, 5).join(', ')}`);

  // Work in a worktree of its own, so the caller's checkout is never moved.
  const wt = join(mkdtempSync(join(tmpdir(), 'p3-merge-')), id);
  git(['worktree', 'add', '-q', '--detach', wt, `origin/${branch}`], { cwd: root });
  try {
    if (git(['merge-base', '--is-ancestor', `origin/${cfg.tranche}`, 'HEAD'], { cwd: wt, allowFail: true }).code !== 0) {
      const m = git(['merge', '-q', '--no-ff', '--no-edit', `origin/${cfg.tranche}`, '-m', `Bring ${branch} up to ${cfg.tranche}`], { cwd: wt, allowFail: true });
      if (m.code !== 0) {
        git(['merge', '--abort'], { cwd: wt, allowFail: true });
        fail(`${branch} conflicts with ${cfg.tranche}; the job must bring itself up to date`);
      }
    }
    const done = readRows(wt, id).filter((r) => r.event === 'complete').pop();
    appendRow(wt, id, {
      row: 'merge', pr: n, reviewed: !!reviewed, review: reviewed || noReview,
      minutes_from_complete: done ? Math.round((Date.now() - Date.parse(done.at)) / MINUTE) : null,
    });
    git(['add', '--', metricsFile(id)], { cwd: wt });
    git(['commit', '-q', '-m', `merge row for ${id} (PR ${n})`, '--', metricsFile(id)], { cwd: wt });
    const tip = git(['rev-parse', 'HEAD'], { cwd: wt });
    git(['push', '-q', 'origin', `HEAD:refs/heads/${branch}`], { cwd: wt });
    log(`pushed ${tip.slice(0, 10)} to ${branch}; the gate runs on the merged result`);
    const run = waitForGate(slug, tip, { minutes, read: io.checkRun, log });
    if (run.conclusion !== 'success') fail(`the gate on the merged result is ${run.conclusion}: ${run.html_url}`);
    const loadOnly = gateRuns(all).flatMap((x) => x.load_only || []);
    if (loadOnly.length) log(`note for review: these tests failed only by not loading when reverted: ${[...new Set(loadOnly)].join(', ')}`);
    const r = mergeRetry(() => io.mergePR(slug, n, tip), {
      log, wait: opts.wait,
      fetch: () => git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root, allowFail: true }),
      check: () => {
        const p = io.getPR(slug, n);
        if (p.state !== 'open' || p.base?.ref !== cfg.tranche || p.head?.sha !== tip) fail(`pull request ${n} changed while its base moved; run merge again`);
        // The gate ran on the job merged with the tranche as it was: a tranche that moved past
        // that is a new merged result, which merge gates afresh when run again.
        if (git(['merge-base', '--is-ancestor', `refs/remotes/origin/${cfg.tranche}`, tip], { cwd: root, allowFail: true }).code !== 0) fail(`${cfg.tranche} moved past the merged result the gate checked; run merge again`);
      },
    });
    if (!r?.merged) fail(`GitHub did not merge pull request ${n}: ${r?.message || 'no result'}`);
    log(`merged pull request ${n} at ${r.sha} (${now()})`);
    return { merged: true, sha: r.sha, tip };
  } finally {
    git(['worktree', 'remove', '--force', wt], { cwd: root, allowFail: true });
    rmSync(wt, { recursive: true, force: true });
  }
}

// A merge GitHub refuses because its base moved ("Base branch was modified") fetches the base,
// confirms the pull request still has the head and base that were checked, and tries again, at
// most RETRIES times in all. Any other refusal stops at once. Never forced.
export function mergeRetry(call, { fetch = () => {}, check = () => {}, tries = RETRIES, wait = 3000, log = console.log } = {}) {
  for (let t = 1; ; t++) {
    let r;
    let why = null;
    try { r = call(); } catch (e) { if (!(e instanceof Fail) || !BASE_MOVED.test(e.message)) throw e; why = e.message; }
    if (!why && !(r && !r.merged && BASE_MOVED.test(r.message || ''))) return r;
    why = why || r.message;
    if (t >= tries) fail(`GitHub refused the merge ${tries} times because its base moved: ${why}`);
    log(`the base moved (${why.replace(/\s+/g, ' ').slice(0, 120)}); fetching and trying again (${t + 1} of ${tries})`);
    if (wait > 0) sleep(wait * t);
    fetch();
    check();
  }
}

// The merge itself, guarded by the tip the checks passed (a current tip only).
export function mergePR(slug, n, sha, { title = `Merge job PR ${n}`, message } = {}) {
  return gh(['api', '-X', 'PUT', `repos/${slug}/pulls/${n}/merge`, '--input', '-'], {
    input: JSON.stringify({ sha, merge_method: 'merge', commit_title: title, ...(message ? { commit_message: message } : {}) }),
  });
}

// merge --plain: every pull request BOB merges that is not a job's (pin moves, metrics rows,
// config). Bob denies the connector's merge tool, `gh pr merge` and `gh api .../merge` to
// every session (2 Nov), so this is the one route for them. GitHub's rulesets also hold
// main and the tranche, but the tool does not rely on them alone (review of PR 14).
// Into the tranche or a working branch, or the tranche into main; every check the base's
// rulesets require green on the head; a merge commit pinned to that head. It writes no merge
// row and pushes nothing. Without a process/config.json (process3 itself) the defaults hold.
const isJob = (ref) => /^job\//i.test(ref);
const WORKFLOWS = '.github/workflows/';
const blobAt = (root, rev, path) => {
  const r = git(['rev-parse', '-q', '--verify', `${rev}:${path}`], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout.trim() : null;
};

// process3's own address: the one the shims fall back to when a product names none
// (shims/process-gate.yml, shims/process-record.yml); a test holds them equal.
export const PROCESS3 = 'https://github.com/neobobkrause/process3';

// process3 as the tool's own clone holds it: whether a pin is released (a commit on its
// tranche or main), the blob of a shim at that pin, and process3's own address.
export function processRepo(dir = TOOL_ROOT) {
  let fetched = false;
  const fetch = () => {
    if (!fetched) git(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche', '+refs/heads/main:refs/remotes/origin/main'], { cwd: dir, allowFail: true });
    fetched = true;
  };
  return {
    released: (pin) => { fetch(); return ['origin/tranche', 'origin/main'].some((r) => git(['merge-base', '--is-ancestor', pin, r], { cwd: dir, allowFail: true }).code === 0); },
    shim: (pin, name) => blobAt(dir, pin, `shims/${name}`),
    descends: (from, to) => { fetch(); return git(['merge-base', '--is-ancestor', from, to], { cwd: dir, allowFail: true }).code === 0; },
    address: () => PROCESS3,
  };
}

const pinAt = (root, rev) => git(['ls-tree', rev, '--', '.process'], { cwd: root }).match(/^160000 commit ([0-9a-f]{40})\t/)?.[1] || null;
// A config key at a commit: null when the file is absent, 'unreadable' when it is not JSON. The
// tranche's name counts as its default when the config does not name it.
const configAt = (root, rev) => {
  const r = git(['show', `${rev}:${CONFIG_FILE}`], { cwd: root, allowFail: true });
  if (r.code !== 0) return null;
  try { const c = JSON.parse(r.stdout); return c && typeof c === 'object' && !Array.isArray(c) ? c : 'unreadable'; } catch { return 'unreadable'; }
};
const keyAt = (root, rev, key) => {
  const c = configAt(root, rev);
  if (c === 'unreadable') return 'unreadable';
  const v = c?.[key] ?? null;
  return key === 'tranche' && v === null ? DEFAULTS.tranche : v;
};
const processRepoOf = (root, rev) => keyAt(root, rev, 'process_repo');

const hasConfig = (root, rev) => git(['cat-file', '-e', `${rev}:${CONFIG_FILE}`], { cwd: root, allowFail: true }).code === 0;
// The commit on rev's first-parent history at which a config key took the value it has at rev:
// the newest first-parent commit whose first parent holds another value (or that has none).
export function keySetAt(root, rev, key) {
  const value = keyAt(root, rev, key);
  // Only a commit that changes the file against its first parent can change the value.
  const touched = git(['log', '--first-parent', '--full-history', '--format=%H', rev, '--', CONFIG_FILE], { cwd: root }).split('\n').filter(Boolean);
  for (const c of touched) {
    if (keyAt(root, c, key) !== value) return null; // cannot happen on a first-parent line
    if (keyAt(root, `${c}^1`, key) !== value) return c;
  }
  return null;
}
export const processRepoSetAt = (root, rev) => keySetAt(root, rev, 'process_repo');

// The keys that say where the process comes from and which branch is the tranche. A changed
// "tranche" would move the module-file and required-checks guards to another branch (review
// follow-ups, 2 Nov), so it takes the same owner's-word rule as process_repo. Each says which
// value onboarding (no process config on the base) may set: for "tranche", only the name of the
// branch being onboarded, so the guards never move to a branch nobody onboarded.
const GUARDED_KEYS = {
  process_repo: (value, repo) => { const own = repo.address?.(); return Boolean(own) && value === own; },
  tranche: (value, repo, onboarded) => typeof onboarded === 'string' && onboarded !== '' && value === onboarded,
};

// A plain pull request may move the process pin only forward, to a released process3 commit
// (on its tranche or main) that descends from the base's pin: no unreleased pin, no downgrade.
// Changing where the process comes from (process_repo), or which branch is the tranche
// ("tranche"), needs the owner's word (third confirming review of PR 14; review follow-ups,
// 2 Nov), with three exceptions where the tool already holds that word (build 22, 2 Nov):
// - the tranche into main may carry the tranche's value when the commit on the tranche's
//   first-parent history at which it took that value is the owner's own commit through
//   GitHub's website (his direct edit, or his website merge of a pull request);
// - the tranche into main may also carry the value when main has no process config at all
//   (neither at the merge base nor at main's tip) and the tranche's value is one onboarding may
//   set: process3's own address for process_repo, whoever merged it into the tranche (with no
//   config on main, the tranche's name is the default one), and for "tranche" the name of the
//   tranche being merged;
// - at onboarding, a pull request into the tranche may set either to such a value when the base
//   has no process config at all ("tranche": the name of the branch it goes into).
// The tranche into main carries the rest of the tranche's config as it is, approvals.owner
// included: pinChange does not judge it. The record check, a required check on main, is what
// stops a carried config from changing approvals.owner: it accepts that change only from the
// owner's own website commit (or, while main has no config, set to the repository's owner).
// at: { intoMain, intoTranche, baseRef, base, head, ownerCommit(sha) -> { ok } }; base and head
// are the branch names.
export function pinChange(root, mb, sha, repo, at = {}) {
  const was = pinAt(root, mb);
  const now = pinAt(root, sha);
  if (now !== was) {
    if (!now) fail(`the pull request removes the process pin; that needs the owner's word: bring it to Bob`);
    if (!repo.released(now)) fail(`the process pin ${now.slice(0, 10)} is not a commit on process3's tranche or main`);
    if (was && !repo.descends(was, now)) fail(`the process pin ${now.slice(0, 10)} does not descend from the base's pin ${was.slice(0, 10)}: no downgrade`);
  }
  for (const [key, onboardValue] of Object.entries(GUARDED_KEYS)) {
    const value = keyAt(root, sha, key);
    if (value === keyAt(root, mb, key)) continue;
    const usable = typeof value === 'string' && value !== 'unreadable';
    // The tranche into main: only these keys are judged here. The rest of the carried config,
    // approvals.owner included, is the record check's: a required check on main, it refuses a
    // change to approvals.owner that is not the owner's own website commit.
    if (usable && at.intoMain && at.ownerCommit) {
      const c = keySetAt(root, sha, key);
      if (c && at.ownerCommit(c)?.ok === true) continue;
    }
    if (usable && at.intoMain && at.baseRef && !hasConfig(root, mb) && !hasConfig(root, at.baseRef) && onboardValue(value, repo, at.head)) continue;
    if (usable && at.intoTranche && !hasConfig(root, mb) && (!at.baseRef || !hasConfig(root, at.baseRef)) && onboardValue(value, repo, at.base)) continue;
    fail(`the pull request changes ${key} in ${CONFIG_FILE}; that needs the owner's word: bring it to Bob`);
  }
}

// Onboarding (a pull request into the tranche, no process config on the base, one on the head)
// sets approvals.owner to the repository's owner as GitHub has it, so a product owned by
// someone other than the default owner reads its approvals rightly (review follow-ups, 2 Nov).
// Nothing is asked of the owner for it. Afterwards the record check lets only the owner's own
// website commit change it.
// readOwner() -> { login } or { login: null, why } (ownerAnswer). me: the login the tool acts
// as; a repository the sessions' own account owns would hand them the approvals (second
// re-review of PR 26), so it is refused.
export function onboardingOwner(root, mb, sha, baseRef, readOwner, readMe = () => null) {
  if (hasConfig(root, mb) || hasConfig(root, baseRef) || !hasConfig(root, sha)) return;
  const c = configAt(root, sha);
  if (c === 'unreadable') fail(`${CONFIG_FILE} on the pull request is not a JSON object`);
  const { login: owner, why, organization } = readOwner();
  if (!owner) fail(`onboarding sets approvals.owner in ${CONFIG_FILE} to the repository's owner, and ${why}`);
  const named = c.approvals?.owner;
  // Read only here, and refused when unreadable (third re-review of PR 26).
  const me = readMe();
  if (!me) fail(`onboarding needs the account the sessions act as, to tell it from the repository's owner, and it could not be read from GitHub (gh api user)`);
  if (owner === me) fail(`the repository's owner, ${owner}, is the account the sessions act as, so it cannot hold the approvals; approvals.owner needs Bob's word`);
  const whom = organization ? `the default owner, ${owner}, since the organization ${organization} owns the repository` : `the repository's owner, ${owner}, as GitHub has it`;
  if (named !== owner) fail(`onboarding sets approvals.owner in ${CONFIG_FILE} to ${whom}; the pull request ${named === undefined ? 'does not set it' : `sets ${JSON.stringify(named)}`}`);
}

// A workflow that runs on pull_request runs the head's copy of its file, so a plain pull request
// could rewrite a workflow, or add a job named like a required check (confirming review of
// PR 14). A plain pull request may change a workflow file only to the process's own shim for
// it, byte for byte, at the released process pin its head sets; any other change needs the
// owner's word. Returns the approved files and their blobs.
export function workflowChanges(root, sha, changed, repo) {
  const files = changed.filter((f) => f.startsWith(WORKFLOWS));
  if (!files.length) return new Map();
  const owner = (why) => fail(`the pull request changes ${files.join(', ')}: ${why}. A workflow change needs the owner's word: bring it to Bob`);
  const pin = git(['ls-tree', sha, '--', '.process'], { cwd: root }).match(/^160000 commit ([0-9a-f]{40})\t/)?.[1];
  if (!pin) owner('there is no process pin to compare it with');
  if (!repo.released(pin)) owner(`the process pin ${pin.slice(0, 10)} is not a commit on process3's tranche or main`);
  const approved = new Map();
  for (const f of files) {
    const blob = blobAt(root, sha, f);
    const shim = repo.shim(pin, basename(f));
    if (!blob || !shim || blob !== shim) owner(`${f} is not the process's own shim at ${pin.slice(0, 10)}`);
    approved.set(f, blob);
  }
  return approved;
}

// A required check is green only by a check run from the app its rule names. An Actions run
// counts only when the copy of its workflow that ran is trusted: the base's own copy
// (pull_request_target), or a file whose blob at the head equals the base's, or a shim change
// approved above. Among the runs that qualify, the newest decides.
export function checkGreen(root, slug, baseRef, sha, check, io, approved = new Map()) {
  const runs = io.checkRuns(slug, sha, check.context);
  if (!runs) return `${check.context}: could not be read`;
  let why = 'no check run';
  for (const run of runs) {
    // A rule that names no app is held to GitHub Actions (third confirming review of PR 14).
    const app = check.app ?? ACTIONS_APP;
    if (run.app?.id !== app) { why = `no run from app ${app}`; continue; }
    if (run.app?.id === ACTIONS_APP) {
      const w = io.workflowRun(slug, run);
      if (!w) { why = 'its workflow run could not be read'; continue; }
      const head = blobAt(root, sha, w.path);
      const trusted = w.event === 'pull_request_target' || (head && (head === blobAt(root, baseRef, w.path) || head === approved.get(w.path)));
      if (!trusted) { why = `its workflow ${w.path} is the pull request's own copy, not the base's`; continue; }
    }
    const state = run.status === 'completed' ? run.conclusion : run.status;
    return state === 'success' ? null : `${check.context}: ${state}`;
  }
  return `${check.context}: ${why}`;
}

export function mergePlain(root, n, opts = {}) {
  const { reviewed, noReview, log = console.log } = opts;
  const io = { getPR, requiredChecks, checkRuns, workflowRun, openFrom, mergePR, repo: processRepo(), repoOwner: (s2) => repoOwnerOf(s2), me: () => gh(['api', 'user'], { allowFail: true })?.login || null, namedChecks: (s2, b) => namedRequiredChecks(s2, b), ...(opts.io || {}) };
  if (!reviewed && !noReview) fail('say whether a fresh reviewer ran: --reviewed "<what>" or --no-review "<why>" (INT-2)');
  const slug = opts.slug || repoSlug(root);
  const pr = io.getPR(slug, n);
  if (pr.state !== 'open') fail(`pull request ${n} is ${pr.state}`);
  if (pr.draft) fail(`pull request ${n} is a draft`);
  const base = pr.base.ref;
  const head = pr.head.ref;
  if (!pr.head.repo?.full_name || pr.head.repo.full_name !== slug) fail(`pull request ${n} comes from ${pr.head.repo?.full_name || 'a repository that no longer exists'}, not ${slug}`);
  if (isJob(head)) fail(`pull request ${n} is a job's (${head}); merge it without --plain`);
  if (isJob(base)) fail(`pull request ${n} is into ${base}, a job's branch`);
  const main = base === 'main' || base === pr.base.repo?.default_branch;

  // The base and head as GitHub has them, fetched so they are read here, not trusted.
  git(['fetch', '-q', 'origin', `+refs/heads/${base}:refs/remotes/origin/${base}`], { cwd: root });
  const baseRef = `origin/${base}`;
  // The owner and the tranche's name are read from the base's config, never from the change
  // it judges or the working tree; an unreadable base config grants no exception.
  let baseCfg = null;
  try { baseCfg = loadConfig(root, baseRef); } catch { baseCfg = null; }
  if (main && !baseCfg) fail(`${CONFIG_FILE} on ${base} cannot be read, so the tranche's name is unknown; only the tranche merges into ${base}`);
  // Refused before anything is fetched, unless main has no config yet (below).
  const mainNamed = main && hasConfig(root, baseRef);
  if (mainNamed && head !== baseCfg.tranche) fail(`only the tranche ${baseCfg.tranche} merges into ${base}, not ${head}`);
  if (main && !mainNamed && head !== baseCfg.tranche && git(['ls-remote', '--exit-code', '--heads', 'origin', `refs/heads/${head}`], { cwd: root, allowFail: true }).code !== 0) fail(`only the tranche ${baseCfg.tranche} merges into ${base}, not ${head}`);
  git(['fetch', '-q', 'origin', `+refs/heads/${head}:refs/remotes/origin/${head}`], { cwd: root });
  if (git(['rev-parse', `origin/${head}`], { cwd: root }) !== pr.head.sha) fail(`${head} moved since GitHub reported ${pr.head.sha.slice(0, 10)}; run merge again`);
  // The tranche's name: the base's config's. While main has no config, a tranche onboarded under
  // another name names itself in its own config (reviews of PR 26), and that name holds for the
  // tranche into main.
  const headCfg = configAt(root, pr.head.sha);
  const named = headCfg && headCfg !== 'unreadable' && typeof headCfg.tranche === 'string' ? headCfg.tranche : null;
  const trancheName = main && !hasConfig(root, baseRef) && !isJob(head) && named === head ? head : baseCfg?.tranche;
  if (main && head !== trancheName) fail(`only the tranche ${trancheName} merges into ${base}, not ${head}`);
  const mb = git(['merge-base', baseRef, pr.head.sha], { cwd: root });
  // No rename detection: a rename lists the path it removes as well as the one it adds.
  const changed = git(['diff', '--no-renames', '--name-only', '-z', mb, pr.head.sha], { cwd: root }).split('\0').filter(Boolean);
  const approved = workflowChanges(root, pr.head.sha, changed, io.repo);
  // While the base has no config, the owner is the repository's, as GitHub has it.
  let ghOwner;
  const githubOwner = () => (ghOwner === undefined ? (ghOwner = ownerAnswer(io.repoOwner(slug))) : ghOwner);
  const owner = () => (hasConfig(root, baseRef) ? baseCfg.approvals.owner : githubOwner().login);
  // Onboarding a tranche of another name (reviews of PR 26): the base has no process config
  // (at the merge base or its tip), is not main or a job's branch, and the head's config names
  // exactly this base as the tranche. It is then the tranche for every guard below.
  const onboardingNamed = !main && !isJob(base) && !hasConfig(root, mb) && !hasConfig(root, baseRef) && named === base;
  const intoTranche = (Boolean(baseCfg) && base === baseCfg.tranche) || onboardingNamed;
  pinChange(root, mb, pr.head.sha, io.repo, {
    intoMain: main && Boolean(baseCfg) && head === trancheName, intoTranche, baseRef, base, head,
    ownerCommit: (c) => (owner() ? webCommitByOwner(root, c, owner(), io.lookup, slug) : { ok: false }),
  });
  if (intoTranche) onboardingOwner(root, mb, pr.head.sha, baseRef, githubOwner, io.me);
  // A tranche of another name into main while main has no config (second re-review of PR 26):
  // only a branch whose own rules require checks, as the owner's ruleset gives the tranche
  // (Step 11); any branch a session made has none, so it cannot pass itself off as the tranche.
  // The ruleset must name the branch itself, not every branch or a pattern (third re-review).
  if (main && trancheName === head && head !== baseCfg.tranche) {
    if (!io.namedChecks(slug, head)) fail(`${head} names itself the tranche, but no ruleset requiring checks names it; only the tranche the owner's ruleset holds merges into ${base}`);
  }
  // Another open pull request from the same head would share its check runs.
  const same = io.openFrom(slug, head);
  if (!same) fail(`could not read the open pull requests from ${head}`);
  const others = same.filter((x) => x.number !== n).map((x) => `#${x.number}`);
  if (others.length) fail(`${head} is also the head of ${others.join(', ')}; merge only when one pull request is open from it`);

  const rules = io.requiredChecks(slug, base);
  if (!rules) fail(`could not read the checks ${base} requires`);
  if (!rules.checks.length && (main || !baseCfg || intoTranche)) fail(`${base} requires no checks; its ruleset must require the gate before anything merges into it`);
  if (rules.strict && git(['merge-base', '--is-ancestor', baseRef, pr.head.sha], { cwd: root, allowFail: true }).code !== 0) fail(`${base} requires an up-to-date head, and ${head} does not contain ${base}'s tip`);
  const red = rules.checks.map((c) => checkGreen(root, slug, baseRef, pr.head.sha, c, io, approved)).filter(Boolean);
  if (red.length) fail(`not every required check is green on ${pr.head.sha.slice(0, 10)}: ${red.join('; ')}`);
  const names = rules.checks.map((c) => c.context);
  log(names.length ? `required checks green on ${pr.head.sha.slice(0, 10)}: ${names.join(', ')}` : `note: ${base} requires no checks`);

  // Module code goes through a job (ARC-2): in a product, a plain merge may not touch any ledger
  // entry's paths or tests. The tranche itself (into main, or into a working branch) carries
  // only work that came through the gate. The tranche's name is the base's, as above.
  if (!baseCfg || head !== trancheName) {
    const entries = Object.values(readLedgerTexts(root, baseRef)).map((t) => { try { return JSON.parse(t); } catch { return null; } }).filter(Boolean);
    const hit = changed.flatMap((f) => entries.filter((e) => [...(e.paths || []), ...(e.tests || [])].some((p) => underPath(f, p))).map((e) => `${f} (${e.id})`));
    if (hit.length) fail(`pull request ${n} changes module files, which go through a job: ${hit.slice(0, 5).join(', ')}`);
  }
  // The base must still be the one checked.
  const again = io.getPR(slug, n);
  if (again.base?.ref !== base) fail(`pull request ${n} was retargeted to ${again.base?.ref} while it was checked`);
  if (again.head?.sha !== pr.head.sha) fail(`pull request ${n} moved while it was checked; run merge again`);
  const r = mergeRetry(() => io.mergePR(slug, n, pr.head.sha, {
    title: `Merge PR ${n}: ${head} into ${base}`,
    message: reviewed ? `Reviewed: ${reviewed}` : `No review: ${noReview}`,
  }), {
    log, wait: opts.wait,
    fetch: () => git(['fetch', '-q', 'origin', `+refs/heads/${base}:refs/remotes/origin/${base}`], { cwd: root, allowFail: true }),
    check: () => {
      const p = io.getPR(slug, n);
      if (p.state !== 'open' || p.base?.ref !== base || p.head?.sha !== pr.head.sha) fail(`pull request ${n} changed while its base moved; run merge again`);
      // A base that requires an up-to-date head: the head must still contain the moved tip.
      if (rules.strict && git(['merge-base', '--is-ancestor', `refs/remotes/origin/${base}`, pr.head.sha], { cwd: root, allowFail: true }).code !== 0) fail(`${base} moved and requires an up-to-date head; run merge again`);
    },
  });
  if (!r?.merged) fail(`GitHub did not merge pull request ${n}: ${r?.message || 'no result'}`);
  log(`merged pull request ${n} at ${r.sha} (${now()})`);
  return { merged: true, sha: r.sha, checks: names };
}
