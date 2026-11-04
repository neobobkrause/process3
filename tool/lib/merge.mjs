// merge (GAT-8, INT-1): BOB brings a job's branch up to the tranche, writes the merge row, waits
// for the gate on that tip, and merges only a green, current tip. The merge is completion.
// merge runs with BOB's tool, not the pull request's, so it repeats the checks a pull request
// could switch off in its own copy of the gate workflow: ownership, and a checked receipt.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { checkRun, checkRuns, comments, gateRuns, getPR, latestReceipt, requiredChecks, verifyRow } from './github.mjs';
import { checkLedger, entryFile, readLedgerTexts } from './ledger.mjs';
import { appendRow, metricsFile, readRows } from './metrics.mjs';
import { ownPaths } from './gate.mjs';
import { webCommitByOwner } from './record.mjs';
import { TOOL_ROOT, bobWake, wakeLine } from './job.mjs';
import { noticeLine, providerChange, recordAtMerge } from './notice.mjs';
import { jsonl } from './state.mjs';
import { foundOnly } from './found.mjs';
import { BASE_MOVED, CONFIG_FILE, DEFAULTS, Fail, RETRIES, fail, gh, git, isShallow, loadConfig, now, repoSlug, underPath } from './util.mjs';

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

// The review-round limit (build I, 3 Nov), held by merge: round 1 is the two fresh reviews, round
// 2 the one fix pass and its confirming re-review of the fix. A merge states its rounds and
// records them; a third round or more is refused unless the command names the decision that
// allowed it, which is recorded with them. A merge with no review has no rounds.
export const MAX_ROUNDS = 2;
export function reviewRounds({ reviewed, noReview, rounds, decision } = {}) {
  if (reviewed === true) fail('--reviewed needs what the reviews found');
  if (noReview === true) fail('--no-review needs why');
  if (!reviewed && !noReview) fail('say whether a fresh reviewer ran: --reviewed "<what>" or --no-review "<why>" (INT-2)');
  if (reviewed && noReview) fail('say one: --reviewed "<what>" or --no-review "<why>", not both');
  if (Array.isArray(decision) || Array.isArray(rounds)) fail('give --rounds and --decision once each');
  if (decision === true || (decision !== undefined && !String(decision).trim())) fail('--decision needs the recorded decision: who decided a further review round, and why');
  if (noReview) {
    if (rounds !== undefined && Number(rounds) !== 0) fail('--no-review has no review rounds; drop --rounds');
    return { rounds: 0, decision: decision ?? null };
  }
  const r = Number(rounds);
  if (rounds === undefined || rounds === true) fail(`say how many review rounds ran: --rounds <n> (1: the two fresh reviews; ${MAX_ROUNDS}: those, one fix pass and one confirming re-review of the fix)`);
  if (!Number.isInteger(r) || r < 1) fail(`--rounds must be a whole number of review rounds, 1 or more; not ${JSON.stringify(rounds)}`);
  if (r > MAX_ROUNDS && !decision) fail(`${r} review rounds: the limit is ${MAX_ROUNDS} (two reviews, one fix pass, one confirming re-review of the fix pass); a further round needs a recorded decision: --decision "<who decided, and why>"`);
  return { rounds: r, decision: decision ?? null };
}

export function merge(root, n, opts = {}) {
  const { reviewed, noReview, minutes = 30, log = console.log } = opts;
  const io = { getPR, comments, checkRun, mergePR, verify: (slug, r, ctx) => verifyRow(slug, r, ctx), ...(opts.io || {}) };
  const rounds = reviewRounds(opts);
  const cfg = loadConfig(root);
  const slug = opts.slug || repoSlug(root);
  const pr = io.getPR(slug, n);
  const id = pr.head?.ref?.match(/^job\/([a-z0-9-]+)$/)?.[1];
  // A job's pull request already merged: merge again only records its provider notices, the step
  // a failed state-branch write left undone (idempotent).
  if (id && pr.state === 'closed' && pr.merged && pr.merge_commit_sha) return noticesOnly(root, cfg, { id, n, pr, log });
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
  const baseEntry = JSON.parse(entryText.stdout);
  const own = ownPaths(baseEntry);
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
      row: 'merge', pr: n, reviewed: !!reviewed, review: reviewed || noReview, review_rounds: rounds.rounds, ...(rounds.decision ? { decision: rounds.decision } : {}),
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
    // The provider-change route: the notice this job leaves its users, and the notices its START
    // named, answered now that it merged. The merge stands if the write fails; the rows are printed.
    const notes = noticeStep(root, cfg, { id, n, mb, head: pr.head.sha, at: tip, entry: baseEntry, log });
    return { merged: true, sha: r.sha, tip, notices: notes };
  } finally {
    git(['worktree', 'remove', '--force', wt], { cwd: root, allowFail: true });
    rmSync(wt, { recursive: true, force: true });
  }
}

// The provider-change route at a job's merge: the notice this job leaves its users, and the
// notices its START named, answered now that it merged. The merge stands if the write fails;
// merge <n> run again records them. A notice is left when the job changed a file of its module's
// own source (the tranche's entry, less tests, requirements, docs and records), requirement change
// or none, naming its export changes; a job that changed only those others leaves none, and the
// line says why.
function noticeStep(root, cfg, { id, n, mb, head, at, entry, log }) {
  const { notice, why } = entry ? providerChange(root, cfg, { provider: id, requirements: entry.requirements, base: mb, head, pr: n, usersAt: at, entry }) : { notice: null, why: null };
  if (why) log(`no provider notice: ${why}`);
  const t = git(['show', `${at}:${metricsFile(id)}`], { cwd: root, allowFail: true });
  const answers = (t.code === 0 ? jsonl(t.stdout) : []).filter((x) => x.event === 'start').pop()?.notices || [];
  let notes = { rows: [] };
  try { notes = recordAtMerge(root, cfg, { notice, answers, user: id, pr: n }); } catch (e) {
    log(`the merge stands, but its provider notices were not written to ${cfg.state_branch} (${e.message}); run merge ${n} again to record them`);
    return { rows: [], error: e.message };
  }
  for (const x of notes.rows) log(x.row === 'notice' ? `${noticeLine(x)} recorded for ${x.users.join(', ')}` : `provider notice ${x.key} answered by ${x.user}`);
  if (!notes.rows.length) log(`provider notices for PR ${n}: nothing to record`);
  return notes;
}

function noticesOnly(root, cfg, { id, n, pr, log }) {
  const m = pr.merge_commit_sha;
  git(['fetch', '-q', ...(git(['rev-parse', '--is-shallow-repository'], { cwd: root }) === 'true' ? ['--depth=50'] : []), 'origin', m], { cwd: root });
  const head = git(['rev-parse', `${m}^2`], { cwd: root, allowFail: true });
  if (head.code !== 0) fail(`pull request ${n} merged at ${m.slice(0, 10)}, which is not a merge commit; its provider notices cannot be read`);
  const mb = git(['merge-base', `${m}^1`, head.stdout.trim()], { cwd: root });
  const entryText = git(['show', `${mb}:${entryFile(id)}`], { cwd: root, allowFail: true });
  const entry = entryText.code === 0 ? JSON.parse(entryText.stdout) : null;
  log(`pull request ${n} is merged; recording only its provider notices`);
  return { merged: true, sha: m, notices: noticeStep(root, cfg, { id, n, mb, head: head.stdout.trim(), at: m, entry, log }) };
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
// every session (2 Nov), so this is the one route for them. Into the tranche or a working
// branch, or the tranche into main; a merge commit pinned to the head. GitHub's rulesets judge
// the required checks (build J); the tool waits while any is queued or running. It writes no
// merge row and pushes nothing. Without a process/config.json (process3 itself) the defaults hold.
const isJob = (ref) => /^job\//i.test(ref);
const WORKFLOWS = '.github/workflows/';
const blobAt = (root, rev, path) => {
  const r = git(['rev-parse', '-q', '--verify', `${rev}:${path}`], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout.trim() : null;
};

// process3 as the tool's own clone holds it: whether a pin is released (a commit on its
// tranche or main), and the blob of a shim at that pin. A shallow clone is made whole first:
// ancestry read across a shallow cut is false, which refused a forward pin move as a downgrade
// (copy PR 53, 4 Nov). process3's history is small.
export function processRepo(dir = TOOL_ROOT) {
  let fetched = false;
  const fetch = () => {
    if (!fetched) git(['fetch', '-q', ...(isShallow(dir) ? ['--unshallow'] : []), 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche', '+refs/heads/main:refs/remotes/origin/main'], { cwd: dir, allowFail: true });
    fetched = true;
  };
  return {
    released: (pin) => { fetch(); return ['origin/tranche', 'origin/main'].some((r) => git(['merge-base', '--is-ancestor', pin, r], { cwd: dir, allowFail: true }).code === 0); },
    shim: (pin, name) => blobAt(dir, pin, `shims/${name}`),
    descends: (from, to) => { fetch(); return git(['merge-base', '--is-ancestor', from, to], { cwd: dir, allowFail: true }).code === 0; },
  };
}

const pinAt = (root, rev) => git(['ls-tree', rev, '--', '.process'], { cwd: root }).match(/^160000 commit ([0-9a-f]{40})\t/)?.[1] || null;
// A config key at a commit: 'unreadable' when the file is not a JSON object. The tranche's name
// counts as its default when the config does not name it.
const keyAt = (root, rev, key) => {
  const r = git(['show', `${rev}:${CONFIG_FILE}`], { cwd: root, allowFail: true });
  let c = null;
  if (r.code === 0) { try { c = JSON.parse(r.stdout); } catch { return 'unreadable'; } if (!c || typeof c !== 'object' || Array.isArray(c)) return 'unreadable'; }
  const v = c?.[key] ?? null;
  return key === 'tranche' && v === null ? DEFAULTS.tranche : v;
};

// The commit on rev's first-parent history at which a config key took the value it has at rev:
// the newest first-parent commit whose first parent holds another value (or that has none).
export function keySetAt(root, rev, key) {
  const value = keyAt(root, rev, key);
  // Only a commit that changes the file against its first parent can change the value.
  const touched = git(['log', '--first-parent', '--full-history', '--format=%H', rev, '--', CONFIG_FILE], { cwd: root }).split('\n').filter(Boolean);
  for (const c of touched) if (keyAt(root, `${c}^1`, key) !== value) return c;
  return null;
}
export const processRepoSetAt = (root, rev) => keySetAt(root, rev, 'process_repo');

// A plain pull request may move the process pin only forward, to a released process3 commit
// (on its tranche or main) that descends from the base's pin: no unreleased pin, no downgrade.
// Changing where the process comes from (process_repo), or which branch is the tranche
// ("tranche"), needs the owner's word (third confirming review of PR 14; review follow-ups,
// 2 Nov), except that the tranche into main may carry the tranche's value when the commit on
// the tranche's first-parent history at which it took that value is the owner's own commit
// through GitHub's website (his direct edit, or his website merge of a pull request). Onboarding
// values are Bob's to confirm once (README, Onboarding).
// at: { intoMain, ownerCommit(sha) -> { ok } }.
export function pinChange(root, mb, sha, repo, at = {}) {
  const was = pinAt(root, mb);
  const now = pinAt(root, sha);
  if (now !== was) {
    if (!now) fail(`the pull request removes the process pin; that needs the owner's word: bring it to Bob`);
    if (!repo.released(now)) fail(`the process pin ${now.slice(0, 10)} is not a commit on process3's tranche or main`);
    if (was && !repo.descends(was, now)) fail(`the process pin ${now.slice(0, 10)} does not descend from the base's pin ${was.slice(0, 10)}: no downgrade`);
  }
  for (const key of ['process_repo', 'tranche']) {
    const value = keyAt(root, sha, key);
    if (value === keyAt(root, mb, key)) continue;
    if (at.intoMain && at.ownerCommit && typeof value === 'string' && value !== 'unreadable') {
      const c = keySetAt(root, sha, key);
      if (c && at.ownerCommit(c)?.ok === true) continue;
    }
    fail(`the pull request changes ${key} in ${CONFIG_FILE}; that needs the owner's word: bring it to Bob`);
  }
}

// A workflow that runs on pull_request runs the head's copy of its file, so a plain pull request
// could rewrite a workflow, or add a job named like a required check (confirming review of
// PR 14). A plain pull request may change a workflow file only to the process's own shim for
// it, byte for byte, at the released process pin its head sets; any other change needs the
// owner's word.
export function workflowChanges(root, sha, changed, repo) {
  const files = changed.filter((f) => f.startsWith(WORKFLOWS));
  if (!files.length) return;
  const owner = (why) => fail(`the pull request changes ${files.join(', ')}: ${why}. A workflow change needs the owner's word: bring it to Bob`);
  const pin = pinAt(root, sha);
  if (!pin) owner('there is no process pin to compare it with');
  if (!repo.released(pin)) owner(`the process pin ${pin.slice(0, 10)} is not a commit on process3's tranche or main`);
  for (const f of files) {
    const blob = blobAt(root, sha, f);
    const shim = repo.shim(pin, basename(f));
    if (!blob || !shim || blob !== shim) owner(`${f} is not the process's own shim at ${pin.slice(0, 10)}`);
  }
}

// Waits while a required check on the head is queued, in progress or not yet started (it failed
// at once that way three times on 2 and 3 Nov), up to `minutes`. GitHub judges the result.
export function waitForChecks(slug, sha, names, { minutes = 20, every = 30000, read = checkRuns, log = console.log } = {}) {
  const until = Date.now() + minutes * MINUTE;
  for (;;) {
    const states = names.map((name) => { const r = read(slug, sha, name)?.[0]; return [name, r ? (r.status === 'completed' ? r.conclusion : r.status) : 'not started']; });
    const pending = states.filter(([, st]) => ['queued', 'in_progress', 'waiting', 'pending', 'requested', 'not started'].includes(st));
    if (!pending.length) return states;
    if (Date.now() > until) fail(`required checks still running on ${sha.slice(0, 10)} after ${minutes} min: ${pending.map(([n, st]) => `${n} ${st}`).join(', ')}`);
    log(`waiting for ${pending.map(([n, st]) => `${n} (${st})`).join(', ')} on ${sha.slice(0, 10)}`);
    sleep(every);
  }
}

export function mergePlain(root, n, opts = {}) {
  const { reviewed, noReview, minutes = 20, log = console.log } = opts;
  const io = { getPR, requiredChecks, checkRuns, mergePR, repo: processRepo(), ...(opts.io || {}) };
  const rounds = reviewRounds(opts);
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
  // The owner and the tranche's name are read from the base's config, never from the change it
  // judges or the working tree.
  let baseCfg = null;
  try { baseCfg = loadConfig(root, baseRef); } catch { baseCfg = null; }
  if (main && !baseCfg) fail(`${CONFIG_FILE} on ${base} cannot be read, so the tranche's name is unknown; only the tranche merges into ${base}`);
  if (main && head !== baseCfg.tranche) fail(`only the tranche ${baseCfg.tranche} merges into ${base}, not ${head}`);
  git(['fetch', '-q', 'origin', `+refs/heads/${head}:refs/remotes/origin/${head}`], { cwd: root });
  if (git(['rev-parse', `origin/${head}`], { cwd: root }) !== pr.head.sha) fail(`${head} moved since GitHub reported ${pr.head.sha.slice(0, 10)}; run merge again`);
  const mb = git(['merge-base', baseRef, pr.head.sha], { cwd: root });
  // No rename detection: a rename lists the path it removes as well as the one it adds.
  const changed = git(['diff', '--no-renames', '--name-only', '-z', mb, pr.head.sha], { cwd: root }).split('\0').filter(Boolean);
  workflowChanges(root, pr.head.sha, changed, io.repo);
  const owner = baseCfg?.approvals.owner;
  pinChange(root, mb, pr.head.sha, io.repo, {
    intoMain: main, ownerCommit: (c) => (owner ? webCommitByOwner(root, c, owner, io.lookup, slug) : { ok: false }),
  });

  // Module code goes through a job (ARC-2): in a product, a plain merge may not touch any ledger
  // entry's paths or tests. The tranche itself (into main, or into a working branch) carries
  // only work that came through the gate. The tranche's name is the base's.
  if (!baseCfg || head !== baseCfg.tranche) {
    const entries = Object.values(readLedgerTexts(root, baseRef)).map((t) => { try { return JSON.parse(t); } catch { return null; } }).filter(Boolean);
    // One exception (the route for work found elsewhere, coordinator, 4 Nov): a change to a
    // module's requirement file that only adds new unmet found marks, `**F<n>** *(not yet met:
    // <source>)*` lines, nothing removed or changed, merges plain. Any other change still goes through a job.
    const why = [];
    const owned = (f, e) => [...(e.paths || []), ...(e.tests || [])].some((p) => underPath(f, p));
    const found = (f, e) => {
      if (!e.requirements || f !== String(e.requirements).replace(/^\.\//, '')) return false;
      const diff = git(['diff', '--no-renames', '-U0', mb, pr.head.sha, '--', f], { cwd: root });
      const before = git(['show', `${mb}:${f}`], { cwd: root, allowFail: true });
      const r = foundOnly(diff, before.code === 0 ? before.stdout : '');
      if (!r.ok) why.push(`${f}: ${r.why}`);
      return r.ok;
    };
    const hit = changed.flatMap((f) => entries.filter((e) => owned(f, e) && !found(f, e)).map((e) => `${f} (${e.id})`));
    if (hit.length) fail(`pull request ${n} changes module files, which go through a job: ${hit.slice(0, 5).join(', ')}${why.length ? `; a plain pull request may only add new unmet found marks to a requirement file (${why.slice(0, 3).join('; ')})` : ''}`);
  }

  const rules = io.requiredChecks(slug, base);
  if (!rules) fail(`could not read the checks ${base} requires`);
  const names = [...new Set(rules.checks.map((c) => c.context))];
  if (!names.length && (main || !baseCfg || base === baseCfg.tranche)) fail(`${base} requires no checks; its ruleset must require the gate before anything merges into it`);
  const states = waitForChecks(slug, pr.head.sha, names, { minutes, every: opts.every, read: io.checkRuns, log });
  log(names.length ? `required checks on ${pr.head.sha.slice(0, 10)}: ${states.map(([c, st]) => `${c} ${st}`).join(', ')}; GitHub's ruleset judges them` : `note: ${base} requires no checks`);
  // The base must still be the one checked.
  const again = io.getPR(slug, n);
  if (again.base?.ref !== base) fail(`pull request ${n} was retargeted to ${again.base?.ref} while it was checked`);
  if (again.head?.sha !== pr.head.sha) fail(`pull request ${n} moved while it was checked; run merge again`);
  const r = mergeRetry(() => io.mergePR(slug, n, pr.head.sha, {
    title: `Merge PR ${n}: ${head} into ${base}`,
    message: [reviewed ? `Reviewed: ${reviewed}` : `No review: ${noReview}`, `Review rounds: ${rounds.rounds}`, ...(rounds.decision ? [`Decision: ${rounds.decision}`] : [])].join('\n'),
  }), {
    log, wait: opts.wait,
    fetch: () => git(['fetch', '-q', 'origin', `+refs/heads/${base}:refs/remotes/origin/${base}`], { cwd: root, allowFail: true }),
    check: () => {
      const p = io.getPR(slug, n);
      if (p.state !== 'open' || p.base?.ref !== base || p.head?.sha !== pr.head.sha) fail(`pull request ${n} changed while its base moved; run merge again`);
    },
  });
  if (!r?.merged) fail(`GitHub did not merge pull request ${n}: ${r?.message || 'no result'}`);
  log(`merged pull request ${n} at ${r.sha} (${now()})`);
  // A pin move into the tranche (never into a working branch) gives BOB new acts (tranche open):
  // the wake, from the role that ran the merge (--as; BOB itself, the default, is awake).
  const pin = pinAt(root, pr.head.sha);
  const as = opts.as ?? 'bob';
  const moved = base === (baseCfg?.tranche || DEFAULTS.tranche) && pin && pin !== pinAt(root, mb);
  const what = `pin moved to ${pin}: run your wake steps (start check --wake prints a changed prompt), then status`;
  const wake = moved && as !== 'bob' ? bobWake(what, as) : null;
  if (wake) log(wakeLine(what, as));
  return { merged: true, sha: r.sha, checks: names, wake };
}
