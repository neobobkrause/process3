// merge (GAT-8, INT-1): BOB brings a job's branch up to the tranche, writes the merge row, waits
// for the gate on that tip, and merges only a green, current tip. The merge is completion.
// merge runs with BOB's tool, not the pull request's, so it repeats the checks a pull request
// could switch off in its own copy of the gate workflow: ownership, and a checked receipt.
import { basename, join } from 'node:path';
import { checkRun, checkRuns, comments, gateRuns, getPR, latestReceipt, requiredChecks, verifyRow } from './github.mjs';
import { branchModule, checkLedger, entryFile, ledgerIds } from './ledger.mjs';
import { appendRow, metricsFile, readRows, rowsAt } from './metrics.mjs';
import { diffNames, entriesAt, ownPaths } from './gate.mjs';
import { webCommitByOwner } from './record.mjs';
import { blobAt, isBootstrap, lastConfigAt, mergedUnanchored, pinAt, unanchored } from './anchor.mjs';
import { P3, READY_FIRST, READY_NEXT, TOOL_ROOT, bobWake, costDelta, jobCostCall, sessionForm, wakeLine } from './job.mjs';
import { mergedRange, noticeLine, notices, providerChange, recordAtMerge } from './notice.mjs';
import { triageAtMerge } from './triage.mjs';
import { foundOnly } from './found.mjs';
import { generatedRows, ignoreLines, isGenerated, refreshOthers, removedGenerated } from './checks.mjs';
import { closeWorkflows, isJob } from './workflows.mjs';
import { reviewTriggers } from './triggers.mjs';
import { BASE_MOVED, CONFIG_FILE, DEFAULTS, Fail, RETRIES, fail, gh, git, isShallow, loadConfig, now, repoSlug, underPath, withTemp } from './util.mjs';

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const MINUTE = 60000;
// Whether the job's metrics at rev hold a merge row for pull request n after its last receipt
// (complete row): the tip an earlier merge run pushed, or one that brought it up to the tranche.
const mergeRowSince = (rows, n) => rows.slice(rows.findLastIndex((r) => r.event === 'complete') + 1).some((r) => r.row === 'merge' && r.pr === n);

// The gate job's own cap (timeout-minutes in shims/process-gate.yml) and the default wait on it:
// the cap and a queue. merge waited 30 min and merge --plain 20 on a gate capped at 45, so a slow
// gate failed the merge while it still ran (defect sweep 4 Nov, #6 and #13).
export const GATE_CAP_MINUTES = 45;
export const GATE_WAIT_MINUTES = 60;
const RUNNING = ['queued', 'in_progress', 'waiting', 'pending', 'requested'];
// Past the wait, a run still in progress is waited on until its own cap has passed since it
// started (and a margin); nothing else is: not started, queued, or cancelled.
const stillRunning = (run, t) => run?.status === 'in_progress'
  && (Number.isFinite(Date.parse(run.started_at)) ? Date.parse(run.started_at) + (GATE_CAP_MINUTES + 5) * MINUTE > t : true);

// Waits for a completed gate run on the commit. A cancelled run (superseded by another event on
// the same tip) is waited past. Each round reads the pull request (`pr`): once its head is
// neither the commit nor `was` (the head before the push, which GitHub may show for a moment),
// the gate on the commit will never finish (the gate's concurrency group cancels it), so the wait
// stops at once. After `minutes`, it goes on only while a run is in progress, up to its cap.
export function waitForGate(slug, sha, { minutes = GATE_WAIT_MINUTES, every = 15000, read = checkRun, pr, was, log = console.log } = {}) {
  const until = Date.now() + minutes * MINUTE;
  let hard = null;
  for (;;) {
    const p = pr?.();
    if (p && p.state && p.state !== 'open') fail(`the pull request is ${p.merged ? 'merged' : p.state} while the gate on ${sha.slice(0, 10)} was awaited; run merge again`);
    const at = p?.head?.sha;
    if (at && at !== sha && at !== was) fail(`${p.head.ref || 'the branch'} moved to ${at.slice(0, 10)} while the gate on ${sha.slice(0, 10)} was awaited: that gate will not finish; run merge again`);
    const run = read(slug, sha, 'gate');
    if (run?.status === 'completed' && run.conclusion !== 'cancelled') return run;
    const t = Date.now();
    if (t >= until) {
      // A run in progress with no start time is waited on for one more cap at most.
      if (run?.status === 'in_progress' && hard === null) hard = t + GATE_CAP_MINUTES * MINUTE;
      if (!stillRunning(run, t) || (hard !== null && !Number.isFinite(Date.parse(run.started_at)) && t > hard)) {
        fail(`the gate on ${sha.slice(0, 10)} did not finish within ${minutes} min (${run ? run.conclusion || run.status : 'not started'})`);
      }
    }
    log(`waiting for the gate on ${sha.slice(0, 10)} (${run ? run.conclusion || run.status : 'not started'})${t > until ? '; past the wait, still in progress' : ''}`);
    sleep(every);
  }
}

// A pull request GitHub says cannot merge (mergeable false, or mergeable_state dirty: it
// conflicts with its base) is refused at once: GitHub starts no checks on it, so waiting on them
// waited 10+ minutes on "gate: not started" (copy PR 108, 4 Nov). Not yet computed (null), it is
// read again briefly, as checks are waited on; still unknown after `minutes`, it is refused.
// Returns the pull request as last read.
export function waitMergeable(slug, n, pr, { minutes = 2, every = 5000, read = getPR, log = console.log } = {}) {
  const until = Date.now() + minutes * MINUTE;
  for (;;) {
    if (pr.mergeable === false || pr.mergeable_state === 'dirty') fail(`pull request ${n} conflicts with ${pr.base?.ref}; nothing was merged`);
    if (pr.mergeable !== null) return pr;
    if (Date.now() > until) fail(`GitHub has not said whether pull request ${n} can merge after ${minutes} min; nothing was merged`);
    log(`waiting for GitHub to compute whether pull request ${n} can merge`);
    sleep(every);
    pr = read(slug, n);
  }
}

// The review-round limit (build I, 3 Nov), held by merge: round 1 is the two fresh reviews, round
// 2 the one fix pass and its confirming re-review of the fix. A merge states its rounds and
// records them; a third round or more is refused unless the command names the decision that
// allowed it, which is recorded with them. A merge with no review has no rounds.
export const MAX_ROUNDS = 2;
export function reviewRounds({ reviewed, noReview, rounds, decision } = {}) {
  if (reviewed === true) fail('--reviewed needs what the reviews found');
  if (noReview === true || (noReview !== undefined && !String(noReview).trim())) fail('--no-review needs why');
  // Q38 is no source for skipping review (coordinator, 4 Nov): the reason is said in its own words.
  if (/\bQ[\s-]*38\b/i.test(String(noReview ?? ''))) fail('--no-review may not cite Q38: Q38 has no source; give the reason itself');
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

// What a job merge's review cost and found (Bob, 4 Nov, about 19:05: measure the review triggers
// for a day or two). --reviewed needs --review-minutes <n>, --findings <n> and --acted-on <n>
// (how many findings the fix pass acted on); --review-cost-usd <n> when read, else unmeasured.
// --no-review takes none of them.
export function reviewMeasures({ reviewed, reviewMinutes, reviewCostUsd, findings, actedOn } = {}) {
  const given = [['--review-minutes', reviewMinutes], ['--review-cost-usd', reviewCostUsd], ['--findings', findings], ['--acted-on', actedOn]].filter(([, v]) => v !== undefined);
  if (!reviewed) {
    if (given.length) fail(`--no-review ran no review: drop ${given.map(([k]) => k).join(', ')}`);
    return { review_minutes: null, review_usd: null, findings: null, findings_acted: null };
  }
  const whole = (k, v) => {
    const x = Number(v);
    if (v === undefined || v === true || !String(v).trim() || !Number.isInteger(x) || x < 0) fail(`--reviewed needs ${k} <n>, a whole number 0 or more${v === undefined ? '' : `; not ${JSON.stringify(v)}`}: the review's measures go in the merge row (Bob, 4 Nov)`);
    return x;
  };
  const minutes = Number(reviewMinutes);
  if (reviewMinutes === undefined || reviewMinutes === true || !String(reviewMinutes).trim() || !Number.isFinite(minutes) || minutes < 0) fail(`--reviewed needs --review-minutes <n>, the minutes the review and its fix pass added before the merge${reviewMinutes === undefined ? '' : `; not ${JSON.stringify(reviewMinutes)}`}`);
  const f = whole('--findings', findings);
  const a = whole('--acted-on', actedOn);
  if (a > f) fail(`--acted-on ${a} is more than --findings ${f}`);
  let usd = 'unmeasured';
  if (reviewCostUsd !== undefined) {
    usd = Number(reviewCostUsd);
    if (reviewCostUsd === true || !String(reviewCostUsd).trim() || !Number.isFinite(usd) || usd <= 0) fail(`--review-cost-usd <n>, above 0, or leave it out (unmeasured); not ${JSON.stringify(reviewCostUsd)}`);
  }
  return { review_minutes: minutes, review_usd: usd, findings: f, findings_acted: a };
}

export function merge(root, n, opts = {}) {
  const { reviewed, noReview, minutes = GATE_WAIT_MINUTES, log = console.log } = opts;
  const io = { getPR, comments, checkRun, mergePR, verify: (slug, r, ctx) => verifyRow(slug, r, ctx), ...(opts.io || {}) };
  const rounds = reviewRounds(opts);
  const measures = reviewMeasures(opts);
  // The job's cost, read by BOB from get_session on the job's session, idle by now (measured 4 Nov,
  // 11:49: mid-turn a session's own record has no usage). A value not read is refused before
  // anything runs; an omitted one records the cost unmeasured and never stops the merge.
  const jobCost = jobCostOf(opts.jobCostUsd);
  const cfg = loadConfig(root);
  const slug = opts.slug || repoSlug(root);
  const pr = io.getPR(slug, n);
  const id = branchModule(pr.head?.ref, ledgerIds(root, `origin/${cfg.tranche}`));
  // A job's pull request already merged: merge again only records its provider notices, the step
  // a failed state-branch write left undone (idempotent).
  if (id && pr.state === 'closed' && pr.merged && pr.merge_commit_sha) {
    // Its rows are on the tranche now, which no job merge writes to: a cost this late is not recorded.
    if (jobCost !== null) log(`pull request ${n} is already merged: --job-cost-usd ${jobCost} is not recorded (a job's cost is written only by the merge that lands it)`);
    return noticesOnly(root, cfg, { id, n, pr, slug, log, compare: io.compare });
  }
  if (pr.state !== 'open') fail(`pull request ${n} is ${pr.state}`);
  if (pr.draft) fail(`pull request ${n} is a draft: the job has not completed`);
  if (pr.base.ref !== cfg.tranche) fail(`pull request ${n} is into ${pr.base.ref}, not the tranche ${cfg.tranche}`);
  if (!id) fail(`pull request ${n} is not from a job branch; any other pull request merges with --plain`);
  waitMergeable(slug, n, pr, { every: opts.mergeableEvery, read: io.getPR, log });

  const branch = pr.head.ref;
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`, `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { cwd: root });
  if (git(['rev-parse', `origin/${branch}`], { cwd: root }) !== pr.head.sha) fail(`${branch} moved since the gate ran; run merge again`);
  // merge run again on the merge-row tip an earlier run pushed, whose gate outran that run's
  // wait: wait on that gate here, and (below) push no second merge row (defect sweep 4 Nov, #6).
  const rowTip = mergeRowSince(rowsAt(root, pr.head.sha, id), n);
  const watch = { minutes, read: io.checkRun, pr: () => io.getPR(slug, n), log, ...(opts.every !== undefined ? { every: opts.every } : {}) };
  // The newest receipt must have been checked, and agreed with, by a green gate run on the tip.
  let first = io.checkRun(slug, pr.head.sha, 'gate');
  if (rowTip && first?.status !== 'completed') first = waitForGate(slug, pr.head.sha, watch);
  if (first?.conclusion !== 'success') fail(`the gate is not green on ${pr.head.sha.slice(0, 10)} (${first ? first.conclusion || first.status : 'no run'})`);
  const all = io.comments(slug, n);
  const receipt = latestReceipt(all, pr.user?.login); // only the opener's (review of PR 13)
  if (!receipt) fail(`pull request ${n} has no receipt`);
  // Each row names its Actions run; the row counts only when that run is the process gate on
  // this tip, green, and its own artifact holds the same row (verifyRow).
  const agreed = gateRuns(all).filter((r) => r.sha === pr.head.sha && r.ok && r.receipt === 'agrees' && r.receipt_attempt === receipt.attempt)
    .find((r) => io.verify(slug, r, { pr: n, baseRef: cfg.tranche }));
  if (!agreed) fail(`no green process-gate run on ${pr.head.sha.slice(0, 10)} checked receipt attempt ${receipt.attempt} and agreed with it${unagreed(gateRuns(all), pr.head.sha, receipt.attempt)}`);

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
  const outside = diffNames(root, mb, `origin/${branch}`).filter((f) => !own.some((p) => underPath(f, p)));
  if (outside.length) fail(`${branch} changes files outside its module: ${outside.slice(0, 5).join(', ')}`);
  // The review triggers, from the job's own diff and the tranche's config (triggers.mjs).
  const trig = reviewTriggers(root, { base: mb, head: `origin/${branch}`, entry: baseEntry, cfg: loadConfig(root, `origin/${cfg.tranche}`) });
  if (trig.bad) log(`note: ${trig.bad}; no security path is read`);
  if (trig.fired.length && noReview) fail(`pull request ${n} fires the review trigger${trig.fired.length > 1 ? 's' : ''} ${trig.fired.join(' and ')} (${trig.why}): --no-review is refused (Bob, 4 Nov). Brief a fresh read-only reviewer with ${P3} review brief ${n}, which carries the hunks that fired it; one review and one fix pass; then merge ${n} --reviewed "<what it found>" --rounds <n> --review-minutes <n> --findings <n> --acted-on <n>`);
  if (trig.fired.length) log(`review trigger${trig.fired.length > 1 ? 's' : ''} ${trig.fired.join(' and ')}: ${trig.why}`);

  // Work in a worktree of its own, so the caller's checkout is never moved.
  return withTemp('p3-merge-', (tmp) => {
    const wt = join(tmp, id);
    git(['worktree', 'add', '-q', '--detach', wt, `origin/${branch}`], { cwd: root });
    if (git(['merge-base', '--is-ancestor', `origin/${cfg.tranche}`, 'HEAD'], { cwd: wt, allowFail: true }).code !== 0) {
      const m = git(['merge', '-q', '--no-ff', '--no-edit', `origin/${cfg.tranche}`, '-m', `Bring ${branch} up to ${cfg.tranche}`], { cwd: wt, allowFail: true });
      if (m.code !== 0) {
        git(['merge', '--abort'], { cwd: wt, allowFail: true });
        fail(`${branch} conflicts with ${cfg.tranche}; the job must bring itself up to date: ${P3} job sync ${id}, then job complete ${id} again`);
      }
    }
    // One merge row per pull request since its last receipt: a rerun that finds this PR's row
    // already on the branch writes none, and pushes only when the tranche moved since.
    const rows = readRows(wt, id);
    const hasRow = mergeRowSince(rows, n);
    let tip = git(['rev-parse', 'HEAD'], { cwd: wt });
    if (!hasRow) {
      const done = rows.filter((r) => r.event === 'complete').pop();
      // The job's cost first, so the merge row stays the branch's last.
      jobCostRow(wt, id, rows, { cost: jobCost, session: opts.jobSession, attempt: receipt.attempt, log });
      appendRow(wt, id, {
        row: 'merge', pr: n, reviewed: !!reviewed, review: reviewed || noReview, review_rounds: rounds.rounds, ...(rounds.decision ? { decision: rounds.decision } : {}),
        triggers: trig.fired, ...measures,
        // The base-red tests its green gate run tolerated (flow.mjs: base-red rising holds new starts).
        base_red: [agreed.base_red, agreed.smoke?.base_red].flat().filter(Boolean).reduce((k, b) => k + (Array.isArray(b.tests) ? b.tests.length : 0), 0),
        minutes_from_complete: done ? Math.round((Date.now() - Date.parse(done.at)) / MINUTE) : null,
      });
      git(['add', '--', metricsFile(id)], { cwd: wt });
      git(['commit', '-q', '-m', `merge row for ${id} (PR ${n})`, '--', metricsFile(id)], { cwd: wt });
      tip = git(['rev-parse', 'HEAD'], { cwd: wt });
    } else {
      log(`${branch} already holds the merge row for PR ${n}; no second row is written`);
      // A rerun that brings the cost an earlier run lacked (review of PR 106: it was dropped):
      // the priced row, committed and gated as the merged result, as a moved tranche is.
      if (jobCost !== null && jobCostRow(wt, id, rows, { cost: jobCost, session: opts.jobSession, attempt: receipt.attempt, log }) !== null) {
        git(['add', '--', metricsFile(id)], { cwd: wt });
        git(['commit', '-q', '-m', `job cost for ${id} (PR ${n})`, '--', metricsFile(id)], { cwd: wt });
        tip = git(['rev-parse', 'HEAD'], { cwd: wt });
      }
    }
    if (tip !== pr.head.sha) {
      git(['push', '-q', 'origin', `HEAD:refs/heads/${branch}`], { cwd: wt });
      log(`pushed ${tip.slice(0, 10)} to ${branch}; the gate runs on the merged result`);
    } else log(`${branch} is already the merged result at ${tip.slice(0, 10)}; nothing to push`);
    const run = tip === pr.head.sha ? first : waitForGate(slug, tip, { ...watch, was: pr.head.sha });
    if (run.conclusion !== 'success') fail(`the gate on the merged result is ${run.conclusion}: ${run.html_url}`);
    const loadOnly = gateRuns(all).flatMap((x) => x.load_only || []);
    if (loadOnly.length) log(`note for review: these tests failed only by not loading when reverted: ${[...new Set(loadOnly)].join(', ')}`);
    const r = mergeRetry(() => io.mergePR(slug, n, tip), {
      log, wait: opts.wait, reread: { read: () => io.getPR(slug, n), sha: tip },
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
    // Their lines are held until the first act is printed: BOB reads the output when it ends.
    const held = [];
    const hold = (l) => held.push(l);
    let notes;
    let triage;
    try {
      notes = noticeStep(root, cfg, { id, n, mb, head: pr.head.sha, at: tip, entry: baseEntry, log: hold });
      // The notice it raised, triaged here, not in BOB's later batch (triageAtMerge); a failure
      // leaves the notice owed as before, and status names its triage.
      triage = triageStep(root, cfg, notes, { ref: tip, log: hold });
    } catch (e) {
      // Never lost: an unexpected stop still prints the start of the ready jobs and what was held.
      log(READY_FIRST);
      for (const l of held) log(l);
      throw e;
    }
    // The first act, before any other line BOB must read (coordinator, 4 Nov): the triage the
    // merge's notice owes (case-catalogue:224 at 12:16 was triaged 9.6 min later), then the ready
    // jobs' start (a 25-minute ready-to-start wait was BOB's turn spent on other output first).
    for (const l of firstActs(triage)) log(l);
    for (const l of held) log(l);
    log(READY_NEXT);
    // The triage's outcome again as the last line: BOB read merge 199's output through tail -3
    // (copy, 4 Nov), which dropped the triage line and the push failure that stopped it.
    // A merge that left no notice to triage has said so above; READY_NEXT stays its last line.
    if (!String(triage?.why || '').startsWith('none to run')) log(triageLast(triage));
    return { merged: true, sha: r.sha, tip, notices: notes, triage, next: READY_NEXT };
  }, { root });
}

// --job-cost-usd: a figure above 0, or none (null). 0 is a figure not read: no job costs nothing.
export function jobCostOf(v) {
  if (v === undefined || v === null) return null;
  const c = Number(v);
  if (v === true || !Number.isFinite(c) || c <= 0) fail(`--job-cost-usd <the job's session cost: ${jobCostCall()}>; not ${JSON.stringify(v)}${c === 0 ? ' (no job costs nothing: 0 is a figure not read)' : ''}; nothing was run`);
  return c;
}

// The job's measured row at its merge, the row job complete --cost-usd writes (PR 105): session_usd
// the session's cost so far, cost_usd that less the same session's last priced row. The session
// is --job-session, else the one the job's last complete row names. With no figure, the row says
// unmeasured (so the report reads job_usd unmeasured, never low) and the call to read it is printed.
export function jobCostRow(wt, id, rows, { cost, session, attempt, log = console.log }) {
  const done = rows.filter((r) => r.event === 'complete').pop();
  const priced = (r) => r.event === 'measured' && (r.role || 'job') === 'job' && r.attempt === attempt && Number(r.cost_usd) > 0;
  // Else the session of this attempt's last measured row: queue's complete rows named none on the
  // copy (4 Nov), and its merge counted 4.04 whole, attempt 1's 3.25 again. Never an earlier
  // attempt's: a restart in a new session would have that session's figure taken off its own.
  const last = rows.filter((r) => r.event === 'measured' && (r.role || 'job') === 'job' && r.session && r.attempt === attempt).pop();
  const sid = sessionForm(typeof session === 'string' && session ? session : done?.session || last?.session || null);
  if (cost === null) {
    // Measured already, by a job complete --cost-usd for this attempt: nothing more to write.
    if (rows.some(priced)) return null;
    appendRow(wt, id, { row: 'attempt', event: 'measured', role: 'job', attempt, session: sid, session_usd: 'unmeasured', cost_usd: 'unmeasured' });
    log(`job ${id}'s cost: unmeasured. Read it with ${jobCostCall(sid)}, and pass it as --job-cost-usd <n>${sid ? '' : ' with --job-session <its id>'} if this merge is run again before it lands; the merge goes on`);
    return null;
  }
  if (rows.some(priced)) { log(`job ${id}'s attempt ${attempt} is priced already: --job-cost-usd ${cost} is not written again`); return null; }
  const { usd, prior } = costDelta(rows, sid, cost);
  appendRow(wt, id, { row: 'attempt', event: 'measured', role: 'job', attempt, session: sid, session_usd: cost, cost_usd: usd });
  if (usd === 'unmeasured') log(`job ${id}'s cost: unmeasured: --job-cost-usd ${cost} is not above session ${sid}'s last row (${prior}), so get_session's usage has not moved since; read it again with ${jobCostCall(sid)} once it has, and run this merge again with it before it lands; the merge goes on`);
  else log(`job ${id}'s cost: ${usd} USD${sid ? ` (session ${sid}, ${cost} so far)` : ' (no session named: the whole figure counted)'}`);
  return usd;
}

// Why the newest gate run on the tip did not agree with the receipt, and the act that clears it
// (copy PR 105, 4 Nov: a record-since-green run left a later attempt "present").
export function unagreed(runs, sha, attempt) {
  const r = runs.filter((x) => x.sha === sha).pop();
  if (!r || r.receipt_attempt !== attempt || !['present', 'unmeasured'].includes(r.receipt)) return '';
  const why = r.receipt === 'unmeasured' && r.receipt_unmeasured ? `: ${r.receipt_unmeasured}` : r.trigger === 'record-since-green' ? `: the gate on it ran no suite (only records changed since ${String(r.after || '').slice(0, 10) || 'its last green code run'}), and its pin did not check the receipt against that run` : ': the gate on it ran no suite';
  return `; its newest run left the receipt ${r.receipt}${why}. No run measured what attempt ${attempt} claims: push a code change so the gate runs the suite, or, once the product's pin checks a receipt against the last green code run, give the gate on ${sha.slice(0, 10)} a new event (edit the pull request; a re-run replays the old base and its pin)`;
}

// The provider-change route at a job's merge: the notice this job leaves its users, and the
// notices its START named, answered now that it merged. The merge stands if the write fails;
// merge <n> run again records them. A notice is left when the job changed a file of its module's
// own source (the tranche's entry, less tests, requirements, docs and records), requirement change
// or none, naming its export changes; a job that changed only those others leaves none, and the
// line says why.
// The notice the merge left, triaged at once (triageAtMerge): the one it recorded now, or, on a
// rerun that found it recorded already, the same notice. Never silent: a merge that leaves no
// notice says so, and a failure names the triage act; the merge stands either way.
export const triageLast = (t) => (t.error ? `notice triage at the merge FAILED (${t.error.split('\n')[0].slice(0, 160)}); next act: ${t.next}`
  : t.owed?.length ? `notice triage at the merge: ${t.owed.length} owe a worker's judgment; ${t.next}` : String(t.why || '').startsWith('none to run') ? `notice triage at the merge: ${t.why}` : `notice triage at the merge: ${t.why || `${t.rows?.length || 0} row(s) written`}, none owed`);
// The merge's first lines: with users owing a worker's judgment (or the triage failed), the
// notice's triage first, then the ready jobs' start; otherwise READY_FIRST alone.
export function firstActs(t) {
  const key = t?.key || String(t?.next || '').match(/notice triage (\S+)/)?.[1];
  if (!key || !(t.owed?.length || t.error)) return [READY_FIRST];
  const owe = t.error ? `its triage at the merge failed, ${t.owed?.length || 0} owed` : `${t.owed.length} user module${t.owed.length === 1 ? ' owes' : 's owe'} a worker's judgment: ${t.owed.join(', ')}`;
  return [`first: ${P3} notice triage ${key} (provider notice ${key}; ${owe}: a read-only worker judges them now, not in a later batch)`, READY_FIRST.replace(/^first: /, 'then: ')];
}
function triageStep(root, cfg, notes, { ref, log }) {
  // On a rerun, the notice as recorded (its users as stored), and none when it was withdrawn.
  let raised = (notes.rows || []).find((x) => x.row === 'notice') || null;
  if (!raised && notes.notice) {
    try { raised = notices(root, cfg.state_branch).find((x) => x.key === notes.notice.key) || null; } catch { raised = null; }
    if (!raised) { const why = `notice ${notes.notice.key} is not on ${cfg.state_branch} (withdrawn, or unread)`; log(`notice triage at the merge: none to run (${why})`); return { rows: [], owed: [], why: 'none to run: ' + why }; }
  }
  if (!raised) { const why = notes.error ? `the notices were not written: ${notes.error.split('\n')[0]}; run the merge again` : 'the merge left no provider notice'; log(`notice triage at the merge: none to run (${why})`); return { rows: [], owed: [], why: 'none to run: ' + why }; }
  try { return triageAtMerge(root, cfg, raised, { ref, log }); } catch (e) {
    log(`the merge stands; notice triage ${raised.key} at the merge failed (${e.message}); next act: ${P3} notice triage ${raised.key}`);
    return { rows: [], owed: raised.users || [], key: raised.key, error: e.message, next: `${P3} notice triage ${raised.key}` };
  }
}

function noticeStep(root, cfg, { id, n, mb, head, at, entry, log }) {
  const { notice, why, left } = entry ? providerChange(root, cfg, { provider: id, requirements: entry.requirements, base: mb, head, pr: n, usersAt: at, entry }) : { notice: null, why: null };
  if (why) log(`no provider notice: ${why}`);
  if (notice && left) log(`provider notice ${notice.key}: ${left}`);
  const answers = rowsAt(root, at, id).filter((x) => x.event === 'start').pop()?.notices || [];
  let notes = { rows: [] };
  try { notes = recordAtMerge(root, cfg, { notice, answers, user: id, pr: n }); } catch (e) {
    log(`the merge stands, but its provider notices were not written to ${cfg.state_branch} (${e.message}); run merge ${n} again to record them`);
    return { rows: [], error: e.message };
  }
  if (notice) notes = { ...notes, notice };
  for (const x of notes.rows) log(x.row === 'notice' ? `${noticeLine(x)} recorded for ${x.users.join(', ')}` : `provider notice ${x.key} answered by ${x.user}`);
  if (!notes.rows.length) log(`provider notices for PR ${n}: nothing to record`);
  return notes;
}

function noticesOnly(root, cfg, { id, n, pr, slug, log, compare: compareRead }) {
  const m = pr.merge_commit_sha;
  const { head: h, mb } = mergedRange(root, m, { slug, n, what: 'its provider notices cannot be read', ...(compareRead ? { read: compareRead } : {}) });
  const entryText = git(['show', `${mb}:${entryFile(id)}`], { cwd: root, allowFail: true });
  const entry = entryText.code === 0 ? JSON.parse(entryText.stdout) : null;
  log(`pull request ${n} is merged; recording only its provider notices`);
  const notices = noticeStep(root, cfg, { id, n, mb, head: h, at: m, entry, log });
  const triage = triageStep(root, cfg, notices, { ref: m, log });
  // A triage owed is the first act here too (no ready line: this run merged nothing).
  const first = firstActs(triage);
  if (first.length > 1) log(first[0]);
  if (!String(triage?.why || '').startsWith('none to run')) log(triageLast(triage));
  return { merged: true, sha: m, notices, triage };
}

// A merge GitHub refuses because its base moved ("Base branch was modified") fetches the base,
// confirms the pull request still has the head and base that were checked, and tries again, at
// most RETRIES times in all. Any other refusal stops at once. Never forced.
//
// A reply that cannot be read (measured 4 Nov: "gh api -X PUT failed: unexpected end of JSON
// input", the pull request left unmerged, and the same run again merged it): with `reread`
// ({ read, sha }), the pull request is read again. Merged with this head is success; open with the
// head unchanged tries the PUT once more; anything else stops. A refusal GitHub stated (a JSON
// body, which gh prints with its HTTP status) is not this case.
export const unreadable = (msg) => {
  const body = String(msg).replace(/^gh api -X PUT failed:\s*/, '').trim();
  if (!body) return true;
  if (/\(HTTP \d{3}\)/.test(body)) return false;
  try { JSON.parse(body); return false; } catch { return true; }
};

export function mergeRetry(call, { fetch = () => {}, check = () => {}, tries = RETRIES, wait = 3000, log = console.log, reread = null } = {}) {
  let again = false;
  for (let t = 1; ; t++) {
    let r;
    let why = null;
    let unread = null;
    try { r = call(); } catch (e) {
      if (!(e instanceof Fail)) throw e;
      if (BASE_MOVED.test(e.message)) why = e.message;
      else if (reread && unreadable(e.message)) unread = e.message;
      else throw e;
    }
    if (!why && !unread && reread && (r === null || r === undefined || typeof r !== 'object')) unread = `the reply was ${r == null ? 'empty' : 'not JSON'}`;
    if (unread) {
      const p = reread.read();
      if (p?.merged && p.head?.sha === reread.sha) {
        log(`GitHub's reply to the merge could not be read (${unread}); the pull request is merged at ${reread.sha.slice(0, 10)}`);
        return { merged: true, sha: p.merge_commit_sha, message: 'merged (read back after an unreadable reply)' };
      }
      if (!again && p?.state === 'open' && !p.merged && p.head?.sha === reread.sha) {
        again = true;
        log(`GitHub's reply to the merge could not be read (${unread}); the pull request is open with the same head, so the merge is tried once more`);
        // The same checks as a moved base: the base may have moved, or the PR been retargeted,
        // while the reply was lost (review of PR 102).
        fetch();
        check();
        t--;
        continue;
      }
      fail(`GitHub's reply to the merge could not be read (${unread}), and the pull request is ${p?.merged ? `merged at another head ${p.head?.sha?.slice(0, 10)}` : `${p?.state || 'unreadable'}${p?.head?.sha && p.head.sha !== reread.sha ? ` at another head ${p.head.sha.slice(0, 10)}` : ''}`}${again ? ' after one more try' : ''}; run merge again`);
    }
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
const WORKFLOWS = '.github/workflows/';

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


// A plain pull request may move the process pin only forward, to a released process3 commit
// (on its tranche or main) that descends from the base's pin: no unreleased pin, no downgrade.
// Changing an anchored key (anchor.mjs: process_repo, tranche, approvals) needs the owner's word
// (third confirming review of PR 14; review follow-ups, 2 Nov; the approvals too, review of
// PR 96: a tranche that changed approvals.owner would have named the owner the next close
// trusts), except that the tranche into main may carry the tranche's value when the commit on
// the tranche's first-parent history at which it took that value is the owner's own commit
// through GitHub's website (his direct edit, or his website merge of a pull request). The owner
// is the base's, never the head's; at the first close (bootstrap: a base with no Process3) the
// tool's default. Onboarding values are Bob's to confirm once (README, Onboarding).
// at: { intoMain, ownerCommit(sha) -> { ok }, baseRef: the base's tip }.
export function pinChange(root, mb, sha, repo, at = {}) {
  const was = pinAt(root, mb);
  const now = pinAt(root, sha);
  if (now !== was) {
    if (!now) fail(`the pull request removes the process pin; that needs the owner's word: bring it to Bob`);
    if (!repo.released(now)) fail(`the process pin ${now.slice(0, 10)} is not a commit on process3's tranche or main`);
    if (was && !repo.descends(was, now)) fail(`the process pin ${now.slice(0, 10)} does not descend from the base's pin ${was.slice(0, 10)}: no downgrade`);
  }
  // Deleting the config would make every anchored key read as its default: the owner's word (confirming review of PR 97).
  if (blobAt(root, mb, CONFIG_FILE) && !blobAt(root, sha, CONFIG_FILE)) fail(`the pull request deletes ${CONFIG_FILE}; that needs the owner's word: bring it to Bob`);
  const key = unanchored(root, mb, sha, at.intoMain ? at.ownerCommit : null, at.baseRef || mb);
  if (key) fail(`the pull request changes ${key} in ${CONFIG_FILE}; that needs the owner's word: bring it to Bob`);
  const why = at.baseRef ? mergedUnanchored(root, at.baseRef, mb, sha) : null;
  if (why) fail(`the pull request is refused: ${why}; that needs the owner's word: bring it to Bob`);
}

// A workflow that runs on pull_request runs the head's copy of its file, so a plain pull request
// could rewrite a workflow, or add a job named like a required check (confirming review of
// PR 14). A plain pull request may change a workflow file only to the process's own shim for
// it, byte for byte, at the released process pin its head sets; any other change needs the
// owner's word. The tranche into main (`close`, normal or bootstrap) is judged by workflows.mjs
// instead (Bob, 4 Nov: product workflow changes are not his to bring): a process shim must still
// be the pin's own (rule 4); any other workflow file passes rules 1 to 3 there.
export function workflowChanges(root, sha, changed, repo, close = null) {
  const files = changed.filter((f) => f.startsWith(WORKFLOWS));
  if (!files.length) return;
  const owner = (why) => fail(`the pull request changes ${files.join(', ')}: ${why}${close ? ' (rule 4)' : '. A workflow change needs the owner\'s word: bring it to Bob'}`);
  const pin = pinAt(root, sha);
  if (!pin) owner('there is no process pin to compare it with');
  if (!repo.released(pin)) owner(`the process pin ${pin.slice(0, 10)} is not a commit on process3's tranche or main`);
  const product = [];
  for (const f of files) {
    const blob = blobAt(root, sha, f);
    const shim = repo.shim(pin, basename(f));
    if (close && !shim && basename(f) !== 'process-gate.yml' && f.slice(WORKFLOWS.length) === basename(f)) { product.push(f); continue; }
    if (!blob || !shim || blob !== shim) owner(`${f} is not the process's own shim at ${pin.slice(0, 10)}`);
  }
  if (product.length) closeWorkflows(root, sha, product, close);
}

// The first close (bootstrap; coordinator, 4 Nov: the copy's main had no .process, no config and
// no process workflows, so its first tranche close had no base config to read the tranche's name
// and the owner from). A pull request into the default branch whose base holds neither the
// config nor a pin. Nothing in it is weaker than a normal close: the owner is the tool's own
// default (DEFAULTS, process3's reviewed code), never the head's; the head must be the tranche its
// own config names, and that config's tranche, approvals and process_repo count only when each is
// the default or took its value at that owner's commit through GitHub's website (pinChange, with
// bootstrap); the head's pin must be released (pinChange: a pin where the base has none is a
// change); a workflow may change only to the pin's own shim (workflowChanges); and the gate must
// be one of the base's required checks, green on the head (mergePlain). A base with a config but
// no pin, a pin but no config, or a config in its history it later deleted, is not a bootstrap:
// it is judged as any close is, by its last config (anchor.mjs isBootstrap, lastConfigAt).
export function bootstrapHead(root, sha, { base, head, log = () => {} }) {
  const no = `${base} has no Process3`;
  if (!blobAt(root, sha, CONFIG_FILE)) fail(`${no}, and the head has no ${CONFIG_FILE}: the first close is the tranche its own config names`);
  let t;
  try { t = loadConfig(root, sha).tranche; } catch (e) { fail(`${no}, and the head's ${CONFIG_FILE} cannot be read (${e.message})`); }
  if (typeof t !== 'string' || !t) fail(`${no}, and the head's ${CONFIG_FILE} names no tranche`);
  if (head !== t) fail(`only the tranche ${t} merges into ${base}, not ${head}`);
  if (!pinAt(root, sha)) fail(`${no}, and the head has no process pin: the first close brings a released one`);
  log(`${no}: the first close, of the tranche ${t} its own config names, held to the owner's website commit`);
}

// Waits while a required check on the head is queued, in progress or not yet started (it failed
// at once that way three times on 2 and 3 Nov), up to `minutes`; past that, only while a check
// is in progress, up to the gate's cap from its start (a gate that runs many suites can be slow:
// defect sweep 4 Nov, #13; the tranche into main now runs only the suites its job merges did not
// gate, gate.mjs trancheCover). Each round reads the pull request
// (`pr`): a head that moved off sha stops the wait at once. GitHub judges the result.
export function waitForChecks(slug, sha, names, { minutes = GATE_WAIT_MINUTES, every = 30000, read = checkRuns, pr, log = console.log } = {}) {
  const until = Date.now() + minutes * MINUTE;
  const extended = new Map();
  for (;;) {
    const p = pr?.();
    if (p && p.state && p.state !== 'open') fail(`the pull request is ${p.merged ? 'merged' : p.state} while its checks on ${sha.slice(0, 10)} were awaited; run merge again`);
    if (p?.head?.sha && p.head.sha !== sha) fail(`${p.head.ref || 'the head'} moved to ${p.head.sha.slice(0, 10)} while its checks on ${sha.slice(0, 10)} were awaited; run merge again`);
    const runs = names.map((name) => [name, read(slug, sha, name)?.[0]]);
    const states = runs.map(([name, r]) => [name, r ? (r.status === 'completed' ? r.conclusion : r.status) : 'not started']);
    const pending = states.filter(([, st]) => RUNNING.includes(st) || st === 'not started');
    if (!pending.length) return states;
    const t = Date.now();
    if (t >= until) {
      const going = runs.filter(([name]) => pending.some(([n]) => n === name)).every(([name, r]) => {
        if (r?.status !== 'in_progress') return false;
        if (Number.isFinite(Date.parse(r.started_at))) return stillRunning(r, t);
        if (!extended.has(name)) extended.set(name, t + GATE_CAP_MINUTES * MINUTE);
        return t <= extended.get(name);
      });
      if (!going) fail(`required checks still running on ${sha.slice(0, 10)} after ${minutes} min: ${pending.map(([n, st]) => `${n} ${st}`).join(', ')}`);
    }
    log(`waiting for ${pending.map(([n, st]) => `${n} (${st})`).join(', ')} on ${sha.slice(0, 10)}${t > until ? '; past the wait, still in progress' : ''}`);
    sleep(every);
  }
}

// The refresh's gate row (copy PR 148): a green process-gate run on the head, verified (its run's
// artifact holds the same row), whose regenerate left every generated module file the pull
// request changes byte-identical.
// The row must be on the base as it is now: the bytes were compared on the head merged with
// that base (review 1 of PR 95).
function refreshGate(slug, n, sha, files, { base, baseSha, untracked = [], io, log }) {
  if (io.checkRun(slug, sha, 'gate')?.conclusion !== 'success') fail(`pull request ${n} changes generated module files (${files.slice(0, 5).join(', ')}), and the gate on ${sha.slice(0, 10)} is not green`);
  const rows = gateRuns(io.comments(slug, n)).filter((r) => r.sha === sha);
  const ok = rows.filter((r) => r.ok && r.base === baseSha && r.refresh?.result === 'identical' && files.every((f) => r.refresh.files?.includes(f)) && untracked.every((f) => r.refresh.untracked?.includes(f))).find((r) => io.verify(slug, r, { pr: n, baseRef: base }));
  if (!ok) {
    const newest = rows.at(-1);
    const last = newest?.refresh;
    const moved = newest && newest.base !== baseSha ? `; ${base} moved since its newest run: give the gate a new event on the base as it is (push to ${sha.slice(0, 10)}'s branch, or edit the pull request); a re-run replays the old base` : '';
    fail(`pull request ${n} changes generated module files (${files.slice(0, 5).join(', ')}): no green process-gate run on ${sha.slice(0, 10)} against ${base} as it is regenerated them byte-identical${last ? ` (its newest run: ${last.result}${last.differ?.length ? `, ${last.differ.slice(0, 5).join(', ')} differ` : ''})` : ''}${moved}`);
  }
  log(`generated module files regenerated byte-identical by the gate on ${sha.slice(0, 10)}: ${files.join(', ')}`);
}

export function mergePlain(root, n, opts = {}) {
  const { reviewed, noReview, minutes = GATE_WAIT_MINUTES, log = console.log } = opts;
  const io = { getPR, requiredChecks, checkRuns, checkRun, comments, mergePR, verify: (slug, r, ctx) => verifyRow(slug, r, ctx), repo: processRepo(), ...(opts.io || {}) };
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
  // Before anything waits on checks: a conflicted pull request gets none (copy PR 108, 4 Nov).
  waitMergeable(slug, n, pr, { every: opts.mergeableEvery, read: io.getPR, log });

  // The base and head as GitHub has them, fetched so they are read here, not trusted.
  git(['fetch', '-q', 'origin', `+refs/heads/${base}:refs/remotes/origin/${base}`], { cwd: root });
  const baseRef = `origin/${base}`;
  // The owner and the tranche's name are read from the base's config, never from the change it
  // judges or the working tree.
  // A base that deleted its config is read by the last one it had (anchor.mjs lastConfigAt).
  let baseCfg = null;
  try { baseCfg = loadConfig(root, lastConfigAt(root, baseRef) || baseRef); } catch { baseCfg = null; }
  if (main && !baseCfg) fail(`${CONFIG_FILE} on ${base} cannot be read, so the tranche's name is unknown; only the tranche merges into ${base}`);
  const boot = main && isBootstrap(root, baseRef);
  if (main && !boot && head !== baseCfg.tranche) fail(`only the tranche ${baseCfg.tranche} merges into ${base}, not ${head}`);
  git(['fetch', '-q', 'origin', `+refs/heads/${head}:refs/remotes/origin/${head}`], { cwd: root });
  if (git(['rev-parse', `origin/${head}`], { cwd: root }) !== pr.head.sha) fail(`${head} moved since GitHub reported ${pr.head.sha.slice(0, 10)}; run merge again`);
  // The first close: the tranche named by the head's own config (held by pinChange below), with a pin.
  if (boot) bootstrapHead(root, pr.head.sha, { base, head, log });
  const mb = git(['merge-base', baseRef, pr.head.sha], { cwd: root });
  // No rename detection: a rename lists the path it removes as well as the one it adds.
  const changed = diffNames(root, mb, pr.head.sha);
  workflowChanges(root, pr.head.sha, changed, io.repo, main ? { mb, base, baseRef, tranche: head, slug, io, ownerCommit: (c) => (baseCfg?.approvals.owner ? webCommitByOwner(root, c, baseCfg.approvals.owner, io.lookup, slug) : { ok: false }) } : null);
  const owner = baseCfg?.approvals.owner;
  pinChange(root, mb, pr.head.sha, io.repo, {
    intoMain: main, baseRef, ownerCommit: (c) => (owner ? webCommitByOwner(root, c, owner, io.lookup, slug) : { ok: false }),
  });

  let refreshed = [];
  let untracked = [];
  let ignores = [];
  // Module code goes through a job (ARC-2): in a product, a plain merge may not touch any ledger
  // entry's paths or tests. The tranche itself (into main, or into a working branch) carries
  // only work that came through the gate. The tranche's name is the base's.
  if (!baseCfg || head !== baseCfg.tranche) {
    const entries = entriesAt(root, baseRef);
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
    // A second (copy PR 148, 4 Nov): a module's committed generated files, under the base
    // config's `generated` paths, merge plain when nothing else of any module changes and a green
    // gate run on the head regenerated them byte-identical (checked below, once the gate is done).
    const gen = baseCfg ? generatedRows(baseCfg).rows : [];
    // A third (build untrack-generated): removing a module's committed generated file, with only
    // lines added to a .gitignore for it; the gate's row must show it built, verified, and ignored.
    const removed = removedGenerated(root, gen, changed, pr.head.sha);
    ignores = removed.length ? ignoreLines(root, mb, pr.head.sha, changed, removed) : [];
    const hits = changed.flatMap((f) => entries.filter((e) => owned(f, e) && !found(f, e)).map((e) => ({ f, id: e.id })));
    const hit = hits.filter((h) => !isGenerated(gen, h.f) && !ignores.includes(h.f)).map((h) => `${h.f} (${h.id})`);
    if (hit.length) fail(`pull request ${n} changes module files, which go through a job: ${hit.slice(0, 5).join(', ')}${why.length ? `; a plain pull request may only add new unmet found marks to a requirement file (${why.slice(0, 3).join('; ')})` : ''}${hits.length > hit.length ? '; a plain pull request may change a module\'s generated files only, and only to their regenerated bytes' : ''}`);
    // The gate's row must have compared every generated file the refresh changes, owned or not
    // (review 3 of PR 95).
    refreshed = hits.length ? changed.filter((f) => isGenerated(gen, f)) : [];
    untracked = refreshed.length ? removed : [];
    const others = refreshed.length ? refreshOthers(baseCfg, gen, changed, entries, ignores) : [];
    if (others.length) fail(`pull request ${n} changes generated module files and ${others.slice(0, 5).join(', ')}: a refresh changes only generated files (and records), since any other file could be what writes them`);
  }

  const rules = io.requiredChecks(slug, base);
  if (!rules) fail(`could not read the checks ${base} requires`);
  const names = [...new Set(rules.checks.map((c) => c.context))];
  if (!names.length && (main || !baseCfg || base === baseCfg.tranche)) fail(`${base} requires no checks; its ruleset must require the gate before anything merges into it`);
  const states = waitForChecks(slug, pr.head.sha, names, { minutes, every: opts.every, read: io.checkRuns, pr: () => io.getPR(slug, n), log });
  log(names.length ? `required checks on ${pr.head.sha.slice(0, 10)}: ${states.map(([c, st]) => `${c} ${st}`).join(', ')}; GitHub's ruleset judges them` : `note: ${base} requires no checks`);
  if (refreshed.length) refreshGate(slug, n, pr.head.sha, refreshed, { base, baseSha: git(['rev-parse', baseRef], { cwd: root }), untracked, io, log });
  // The base must still be the one checked.
  const again = io.getPR(slug, n);
  if (again.base?.ref !== base) fail(`pull request ${n} was retargeted to ${again.base?.ref} while it was checked`);
  if (again.head?.sha !== pr.head.sha) fail(`pull request ${n} moved while it was checked; run merge again`);
  // Read the base again now, after the wait (it may have moved), from a fetch that must succeed:
  // a first close stands only while the base still has no Process3 (review 4 of PR 97), and the
  // anchored keys are judged on the merge with the base as it is (anchor.mjs mergedUnanchored).
  const baseHolds = () => {
    git(['fetch', '-q', 'origin', `+refs/heads/${base}:refs/remotes/origin/${base}`], { cwd: root });
    if (boot && !isBootstrap(root, baseRef)) fail(`${base} gained Process3 while pull request ${n} was checked as its first close; run merge again`);
    const why = mergedUnanchored(root, baseRef, git(['merge-base', baseRef, pr.head.sha], { cwd: root }), pr.head.sha);
    if (why) fail(`pull request ${n} is refused: ${why}; that needs the owner's word: bring it to Bob`);
  };
  baseHolds();
  // The first close stands on the gate itself, not only on GitHub's ruleset.
  if (boot && !states.some(([c, st]) => c === 'gate' && st === 'success')) fail(`${base} has no Process3, so its first close needs the gate, required by ${base}'s ruleset and green on ${pr.head.sha.slice(0, 10)}; ${names.length ? `its required checks: ${states.map(([c, st]) => `${c} ${st}`).join(', ')}` : `${base} requires no checks`}`);
  const r = mergeRetry(() => io.mergePR(slug, n, pr.head.sha, {
    title: `Merge PR ${n}: ${head} into ${base}`,
    message: [reviewed ? `Reviewed: ${reviewed}` : `No review: ${noReview}`, `Review rounds: ${rounds.rounds}`, ...(rounds.decision ? [`Decision: ${rounds.decision}`] : [])].join('\n'),
  }), {
    log, wait: opts.wait, reread: { read: () => io.getPR(slug, n), sha: pr.head.sha },
    fetch: () => git(['fetch', '-q', 'origin', `+refs/heads/${base}:refs/remotes/origin/${base}`], { cwd: root, allowFail: true }),
    check: () => {
      const p = io.getPR(slug, n);
      if (p.state !== 'open' || p.base?.ref !== base || p.head?.sha !== pr.head.sha) fail(`pull request ${n} changed while its base moved; run merge again`);
      baseHolds();
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
