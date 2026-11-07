// merge (GAT-8, INT-1): BOB brings a job's branch up to the tranche, writes the merge row, waits
// for the gate on that tip, and merges only a green, current tip. The merge is completion.
// merge runs with BOB's tool, not the pull request's, so it repeats the checks a pull request
// could switch off in its own copy of the gate workflow: ownership, and a receipt checked by the gate against its own run (AUD-2).
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { RECEIPT, checkRun, checkRuns, compare, comments, gateRuns, getPR, latestBlock, latestReceipt, openPRs, requiredChecks, verifyRow } from './github.mjs';
import { branchModule, checkLedger, entryFile, jobBranch, ledgerIds, originJobs } from './ledger.mjs';
import { appendRow, bobMetricsFile, metricsFile, readRows, rowsAt } from './metrics.mjs';
import { PASS_BRANCH, addedRequirements, diffNames, entriesAt, ownPaths } from './gate.mjs';
import { webCommitByOwner } from './record.mjs';
import { blobAt, isBootstrap, lastConfigAt, mergedUnanchored, pinAt, unanchored } from './anchor.mjs';
import { P3, START_FIRST, START_NEXT, TOOL_ROOT, bobWake, costDelta, jobCostCall, sessionForm, toolPin, wakeLine } from './job.mjs';
import { mergedRange, noticeLine, notices, providerChange, recordAtMerge } from './notice.mjs';
import { triageAtMerge } from './triage.mjs';
import { flushState, pendingWrites, wakeOnce } from './state.mjs';
import { foundOnly } from './found.mjs';
import { generatedRows, ignoreLines, isGenerated, refreshOthers, removedGenerated } from './checks.mjs';
import { closeWorkflows, isJob } from './workflows.mjs';
import { flowFile, layerOfBranch } from './layerbase.mjs';
import { OUTSIDE, judgeWorkflow, refusal } from './workflow-limits.mjs';
import { reviewTriggers } from './triggers.mjs';
import { BASE_MOVED, CONFIG_FILE, DEFAULTS, Fail, RETRIES, SERVER_ERROR, fail, fetchJobRefs, gh, git, isRecordPath, isShallow, laneOnly, loadConfig, now, repoSlug, shallowCuts, underPath, withTemp } from './util.mjs';

import { pollMs } from './pace.mjs';
// Before a wait, the command's coalesced state writes are pushed (R17): others read them meanwhile.
const sleep = (ms) => { if (pendingWrites()) flushState(); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };
const MINUTE = 60000;
// Whether the job's metrics at rev hold a merge row for pull request n after its last receipt
// (complete row): the tip an earlier merge run pushed, or one that brought it up to the tranche.
const mergeRowSince = (rows, n) => rows.slice(rows.findLastIndex((r) => r.event === 'complete') + 1).some((r) => r.row === 'merge' && r.pr === n);

// The gate job's own cap (timeout-minutes in shims/process-gate.yml) and the default wait on it:
// the cap and a queue. merge waited 30 min and merge --plain 20 on a gate capped at 45, so a slow
// gate failed the merge while it still ran (defect sweep 4 Nov, #6 and #13).
// 90 since 5 Nov: the copy's slowest gates took 40-42 minutes and the old 45 cancelled them.
export const GATE_CAP_MINUTES = 90;
export const GATE_WAIT_MINUTES = 95;
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
// A GitHub read that failed for a reason that passes (build train-inflight, option 8A: copy PR
// 290, 5 Nov 13:15, one HTTP 503 ended a 38-minute gate wait): a 5xx, a rate limit, a timeout or a
// dropped connection. The waits read again with a growing pause instead of failing.
export const TRANSIENT = (msg) => SERVER_ERROR.test(String(msg)) || /rate limit|HTTP 429|\b429 Too Many|timed out|timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|connection reset|socket hang up|Bad Gateway|Service Unavailable|Gateway Time-?out|unexpected EOF|TLS handshake|context deadline exceeded|connection refused/i.test(String(msg));
// No GitHub read again sooner than 30 s (R17, pace.mjs).
export const TRANSIENT_WAIT = { first: 30000, most: 300000 };
// Runs f; a transient Fail is returned as { err } for the caller's loop to read again, anything
// else is thrown.
// The budget's own refusals (pace.mjs) and GitHub's rate-limit refusals are never read again here:
// every later call waits for GitHub's reset itself, and a stop must show at once (cold review of R17).
const BUDGET = /^GitHub budget:|GitHub refused gh .* with a rate limit/;
const guarded = (f) => { try { return { v: f() }; } catch (e) { if (e instanceof Fail && TRANSIENT(e.message) && !BUDGET.test(e.message)) return { err: e }; throw e; } };
// The pause before the k-th read again in a row (15 s, 30 s, 60 s, then every 2 min by default),
// and the end: past the wait and the gate's own cap after it, the last error stands.
function transientPause(e, k, { until, log, wait = TRANSIENT_WAIT }) {
  if (Date.now() > until + GATE_CAP_MINUTES * MINUTE) throw e;
  const ms = Math.min(wait.most, wait.first * 2 ** (k - 1));
  log(`GitHub read failed (${e.message.split('\n')[0].slice(0, 160)}); transient: read again in ${Math.round(ms / 1000)} s (${k} in a row), still waiting on the same run`);
  sleep(ms);
}
// every: a fixed pause (the tests); unset, polls back off from pacing.poll_first_s to poll_most_s (R17).
export function waitForGate(slug, sha, { minutes = GATE_WAIT_MINUTES, every = null, read = checkRun, pr, was, log = console.log, transient } = {}) {
  let polls = 0;
  const until = Date.now() + minutes * MINUTE;
  let hard = null;
  let k = 0;
  for (;;) {
    const g = guarded(() => [pr?.(), read(slug, sha, 'gate')]);
    if (g.err) { transientPause(g.err, ++k, { until, log, wait: transient }); continue; }
    k = 0;
    const [p, run] = g.v;
    if (p && p.state && p.state !== 'open') fail(`the pull request is ${p.merged ? 'merged' : p.state} while the gate on ${sha.slice(0, 10)} was awaited; run merge again`);
    const at = p?.head?.sha;
    if (at && at !== sha && at !== was) fail(`${p.head.ref || 'the branch'} moved to ${at.slice(0, 10)} while the gate on ${sha.slice(0, 10)} was awaited: that gate will not finish; run merge again`);
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
    sleep(every ?? pollMs(++polls));
  }
}

// A pull request GitHub says cannot merge (mergeable false, or mergeable_state dirty: it
// conflicts with its base) is refused at once: GitHub starts no checks on it, so waiting on them
// waited 10+ minutes on "gate: not started" (copy PR 108, 4 Nov). Not yet computed (null), it is
// read again briefly, as checks are waited on; still unknown after `minutes`, it is refused.
// Returns the pull request as last read.
export function waitMergeable(slug, n, pr, { minutes = 3, every = null, read = getPR, log = console.log } = {}) {
  let polls = 0;
  const until = Date.now() + minutes * MINUTE;
  for (;;) {
    if (pr.mergeable === false || pr.mergeable_state === 'dirty') fail(`pull request ${n} conflicts with ${pr.base?.ref}; nothing was merged`);
    if (pr.mergeable !== null) return pr;
    if (Date.now() > until) fail(`GitHub has not said whether pull request ${n} can merge after ${minutes} min; nothing was merged`);
    log(`waiting for GitHub to compute whether pull request ${n} can merge`);
    sleep(every ?? pollMs(++polls));
    pr = read(slug, n);
  }
}

// The review-round limit (build I, 3 Nov), held by merge: round 1 is the two fresh reviews, round
// 2 the one fix pass and its confirming re-review of the fix. A merge states its rounds and
// records them; a third round or more is refused unless the command names the decision that
// allowed it, which is recorded with them. A merge with no review has no rounds.
export const MAX_ROUNDS = 2;
export function reviewRounds({ reviewed, noReview, rounds, decision, pass } = {}) {
  // A pass (P7) needs no judgment, so no review: its record is its own words.
  if (pass !== undefined) {
    if (pass === true || Array.isArray(pass) || !String(pass).trim()) fail('--pass needs what the pass changes and why, once');
    if (reviewed || noReview || rounds !== undefined || decision !== undefined) fail('--pass is its own record: drop --reviewed, --no-review, --rounds and --decision');
    return { rounds: 0, decision: null };
  }
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

// What a job merge's review cost and found (coordinator's log, 4 Nov 19:05, recorded as Bob's decision, not quoted: measure the review triggers
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

// The review workers' cost (review-trigger day-1 study, 5 Nov: all 7 reviewed merges read review_usd
// "unmeasured"), when no --review-cost-usd gives it: from --review-record <file>, the review
// session's get_session result saved as JSON (one, a list, or under data), its
// external_metadata.usage.cost_usd; else from the module's rows `metrics add <id> --role review`
// writes (process/metrics/<id>.bob.jsonl, in this checkout and on the tranche): those naming a
// --review-session, or, with none named, those since the job's attempt started (since). Returns
// { usd, from } or { usd: 'unmeasured', why }.
export const reviewSessions = (v) => [...new Set((Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]).flatMap((x) => String(x).split(',')).map((x) => sessionForm(x.trim())).filter(Boolean))];
export function reviewCostOf(root, cfg, id, { sessions = [], record, since = null } = {}) {
  const want = reviewSessions(sessions);
  if (record !== undefined && record !== null) {
    if (record === true || !String(record).trim()) fail('--review-record <file>: the review session\'s get_session result, saved as JSON');
    let j;
    try { j = JSON.parse(readFileSync(String(record), 'utf8')); } catch (e) { fail(`--review-record ${record}: not a readable JSON file (${e.message})`); }
    const list = (Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : [j]).filter((x) => x && typeof x === 'object');
    const mine = list.filter((x) => !want.length || want.includes(sessionForm(String(x.id || x.session_id || ''))));
    const costs = mine.map((x) => Number(x.external_metadata?.usage?.cost_usd)).filter((x) => Number.isFinite(x) && x > 0);
    if (!costs.length) fail(`--review-record ${record}: no session${want.length ? ` ${want.join(', ')}` : ''} in it with external_metadata.usage.cost_usd above 0`);
    return { usd: Math.round(costs.reduce((t, x) => t + x, 0) * 1e4) / 1e4, from: `review session record${mine.length > 1 ? 's' : ''} ${mine.map((x) => sessionForm(String(x.id || x.session_id || '?'))).join(', ')}` };
  }
  const file = bobMetricsFile(id);
  const parse = (t) => String(t || '').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
  const onTranche = git(['show', `refs/remotes/origin/${cfg.tranche}:${file}`], { cwd: root, allowFail: true });
  let here = [];
  try { here = readRows(root, id, file); } catch { here = []; }
  const seen = new Set();
  const rows = [...(onTranche.code === 0 ? parse(onTranche.stdout) : []), ...here].filter((r) => { const k = JSON.stringify(r); if (seen.has(k)) return false; seen.add(k); return true; });
  const review = rows.filter((r) => r.row === 'attempt' && r.event === 'measured' && r.role === 'review' && (r.module ?? id) === id && Number(r.cost_usd) > 0);
  const mine = want.length ? review.filter((r) => want.includes(sessionForm(r.session))) : since ? review.filter((r) => String(r.at) >= String(since)) : [];
  if (!mine.length) {
    const why = want.length ? `no \`metrics add ${id} --role review\` row priced for ${want.join(', ')}` : since ? `no \`metrics add ${id} --role review\` row priced since the attempt started (${since})` : 'the attempt\'s start was not read and no --review-session was named';
    return { usd: 'unmeasured', why };
  }
  // A session's rows are its cost so far (metrics add, as BOB records its own): its latest counts once.
  const bySession = [...new Map(mine.map((r, i) => [r.session || `#${i}`, r])).values()];
  return { usd: Math.round(bySession.reduce((t, r) => t + Number(r.cost_usd), 0) * 1e4) / 1e4, from: `${mine.length} --role review row${mine.length > 1 ? 's' : ''}${mine.some((r) => r.session) ? ` (${[...new Set(mine.map((r) => r.session).filter(Boolean))].join(', ')})` : ''}` };
}
// The start of the job's current attempt, from its rows at the head (null: none read).
export const attemptStart = (rows) => (rows || []).filter((r) => r.row === 'attempt' && r.event === 'start').pop()?.at || null;

export function merge(root, n, opts = {}) {
  const { reviewed, noReview, minutes = GATE_WAIT_MINUTES, log = console.log } = opts;
  const io = { getPR, comments, checkRun, mergePR, verify: (slug, r, ctx) => verifyRow(slug, r, ctx), ...(opts.io || {}) };
  const rounds = reviewRounds(opts);
  let measures = reviewMeasures(opts);
  if (!reviewed && (opts.reviewSession !== undefined || opts.reviewRecord !== undefined)) fail('--no-review ran no review: drop --review-session and --review-record');
  if (opts.reviewCostFrom && typeof measures.review_usd === 'number') measures = { ...measures, review_usd_from: String(opts.reviewCostFrom) };
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
  const { branch, watch, first, all, receipt, mb, baseEntry, trig } = jobChecks(root, n, pr, id, { cfg, slug, io, noReview, minutes, log, every: opts.every, mergeableEvery: opts.mergeableEvery, onGate: opts.onGate, transient: opts.transient });
  if (reviewed && measures.review_usd === 'unmeasured') {
    const c = reviewCostOf(root, cfg, id, { sessions: opts.reviewSession, record: opts.reviewRecord, since: attemptStart(rowsAt(root, pr.head.sha, id)) });
    measures = { ...measures, review_usd: c.usd, ...(c.from ? { review_usd_from: c.from } : { review_usd_why: c.why }) };
    log(c.from ? `review cost: ${c.usd} USD, from ${c.from}` : `review cost: unmeasured (${c.why}); record it before the merge with ${P3} metrics add ${id} --role review --session <the review session> --cost-usd <its get_session usage.cost_usd>, or pass --review-cost-usd <n>`);
  }

  // Work in a worktree of its own, so the caller's checkout is never moved.
  return withTemp('p3-merge-', (tmp) => {
    const wt = join(tmp, id);
    git(['worktree', 'add', '-q', '--detach', wt, `origin/${branch}`], { cwd: root });
    let { tip, rejudged } = buildMerged(wt, cfg, {
      n, id, branch, onto: `origin/${cfg.tranche}`, ontoName: cfg.tranche, conflictHint: `; the job must bring itself up to date: ${P3} job sync ${id}, then job complete ${id} again`,
      reviewed, noReview, rounds, measures, triggers: trig.fired, jobCost, jobSession: opts.jobSession, attempt: receipt.attempt, log,
    });
    if (tip !== pr.head.sha) {
      opts.onGate?.(tip);
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
      log(START_FIRST);
      for (const l of held) log(l);
      throw e;
    }
    // The first act, before any other line BOB must read (coordinator, 4 Nov): the triage the
    // merge's notice owes (case-catalogue:224 at 12:16 was triaged 9.6 min later), then the ready
    // jobs' start (a 25-minute ready-to-start wait was BOB's turn spent on other output first).
    for (const l of firstActs(triage)) log(l);
    for (const l of held) log(l);
    log(START_NEXT);
    // The triage's outcome again as the last line: BOB read merge 199's output through tail -3
    // (copy, 4 Nov), which dropped the triage line and the push failure that stopped it.
    // A merge that left no notice to triage has said so above; START_NEXT stays its last line.
    if (!String(triage?.why || '').startsWith('none to run')) log(triageLast(triage));
    return { merged: true, sha: r.sha, tip, notices: notes, triage, next: START_NEXT, ...(rejudged ? { rejudged } : {}) };
  }, { root });
}

// The job's merged result, built in worktree wt (detached at the job's head): onto merged in
// with --no-ff unless it is an ancestor already, then the merge row (and the job's cost row) as
// one commit. merge() and mergedResult() both build it here, so the result the train's spec gate
// tests (R(i)) and the one merge() lands (L) come from one code path and differ only in records
// (the row's minutes_from_complete, its time) and in whatever onto itself holds.
// One merge row per pull request since its last receipt: a rerun that finds this PR's row
// already on the branch writes none, and pushes only when the tranche moved since.
function buildMerged(wt, cfg, { n, id, branch, onto, ontoName = onto, conflictHint = '', reviewed, noReview, rounds, measures, triggers, jobCost = null, jobSession, attempt, log = console.log }) {
  const start = git(['rev-parse', 'HEAD'], { cwd: wt });
  let rejudged = null;
  if (git(['merge-base', '--is-ancestor', onto, 'HEAD'], { cwd: wt, allowFail: true }).code !== 0) {
    const m = git(['merge', '-q', '--no-ff', '--no-edit', onto, '-m', `Bring ${branch} up to ${ontoName}`], { cwd: wt, allowFail: true });
    if (m.code !== 0) {
      git(['merge', '--abort'], { cwd: wt, allowFail: true });
      fail(`${branch} conflicts with ${ontoName}${conflictHint}`);
    }
  }
  const rr = rounds && typeof rounds === 'object' ? rounds : { rounds: rounds ?? 0, decision: null };
  const rows = readRows(wt, id);
  const hasRow = mergeRowSince(rows, n);
  let tip = git(['rev-parse', 'HEAD'], { cwd: wt });
  if (!hasRow) {
    const done = rows.filter((r) => r.event === 'complete').pop();
    // The job's cost first, so the merge row stays the branch's last.
    jobCostRow(wt, id, rows, { cost: jobCost, session: jobSession, attempt, log });
    appendRow(wt, id, {
      row: 'merge', pr: n, reviewed: !!reviewed, review: reviewed || noReview, review_rounds: rr.rounds, ...(rr.decision ? { decision: rr.decision } : {}),
      triggers: triggers || [], ...(measures || {}), tool: toolPin(),
      minutes_from_complete: done ? Math.round((Date.now() - Date.parse(done.at)) / MINUTE) : null,
    });
    git(['add', '--', metricsFile(id)], { cwd: wt });
    git(['commit', '-q', '-m', `merge row for ${id} (PR ${n})`, '--', metricsFile(id)], { cwd: wt });
    tip = git(['rev-parse', 'HEAD'], { cwd: wt });
  } else {
    log(`${branch} already holds the merge row for PR ${n}; no second row is written`);
    // A rerun that brings the cost an earlier run lacked (review of PR 106: it was dropped):
    // the priced row, committed and gated as the merged result, as a moved tranche is.
    if (jobCost !== null && jobCostRow(wt, id, rows, { cost: jobCost, session: jobSession, attempt, log }) !== null) {
      git(['add', '--', metricsFile(id)], { cwd: wt });
      git(['commit', '-q', '-m', `job cost for ${id} (PR ${n})`, '--', metricsFile(id)], { cwd: wt });
      tip = git(['rev-parse', 'HEAD'], { cwd: wt });
    }
    // The triggers judged again here, at the land, with this tool (day-1 study, 5 Nov: copy PR 173's
    // row, prepared under the pin before the triggers, carried no triggers key). Record only: a row
    // that lacks them, or recorded others, gets a triggers row beside it (the report reads it over
    // the merge row) only when this land commits anyway; the head is never moved for it (a held
    // merged result would end its hold, a green tip would gate again): then the merge says it, and
    // returns it for the train's row.
    const was = rows.filter((r) => r.row === 'merge' && r.pr === n).pop();
    const had = rows.slice(rows.indexOf(was) + 1).filter((r) => r.row === 'triggers' && r.pr === n).pop()?.triggers ?? was?.triggers;
    const now_ = triggers || [];
    const same = Array.isArray(had) && had.length === now_.length && had.every((t) => now_.includes(t));
    if (triggers !== undefined && !same) {
      const why = Array.isArray(had) ? `the merge row recorded ${had.length ? had.join(' and ') : 'none'} when prepared (tool ${was?.tool || 'unknown'}); judged again at the land` : `the merge row was prepared under an older pin (tool ${was?.tool || 'unknown'}) that recorded no triggers; judged at the land`;
      rejudged = { triggers: now_, why, written: tip !== start };
      if (tip !== start) {
        appendRow(wt, id, { row: 'triggers', pr: n, triggers: now_, tool: toolPin(), why });
        git(['add', '--', metricsFile(id)], { cwd: wt });
        git(['commit', '-q', '-m', `review triggers for ${id} (PR ${n}), judged at the land`, '--', metricsFile(id)], { cwd: wt });
        tip = git(['rev-parse', 'HEAD'], { cwd: wt });
      }
      log(`PR ${n}'s merge row ${Array.isArray(had) ? `recorded triggers ${JSON.stringify(had)}` : 'recorded no triggers (prepared under an older pin)'}: ${JSON.stringify(now_)} judged at the land, ${tip !== start ? 'recorded beside it' : 'not written to the head (nothing else to commit; the head is not moved for a record)'}`);
    }
  }
  return { tip, hasRow, rejudged };
}

// The per-PR checks a job's merge holds before it brings the job in (merge): open, ready, into the tranche, from a job branch, mergeable, the branch where
// GitHub has it, a green gate on the head that checked and agreed with the opener's newest receipt, only the job's own files and ledger status, and the review triggers (refusing
// --no-review when one fires).
// A shallow clone (the MERGER's, 5 Nov: at clone_depth 1 every land failed at git merge-base): both
// sides deepened down to their merge base by GitHub's compare (its counts), and the clone
// unshallowed once when that does not give the base GitHub names; one that cannot is refused plainly.
// The history already there is never cut (--depth sets a ref's depth and shortens a history
// fetched deeper: the merge train's tranche, fetched past main, build/starter-fixes 5 Nov): the
// base GitHub names read locally returns at once; else each side deepens from the clone's cut
// (--deepen), by GitHub's count where its tip is the cut (a depth-1 clone: the depth --depth
// gave), else by doubling from one (a cut deep in the history: the commits just past it).
export function deepenToBase(root, slug, base, head, read = compare) {
  if (!isShallow(root)) return;
  const refs = [base, head].map((b) => `+refs/heads/${b}:refs/remotes/origin/${b}`);
  let c = null;
  try { c = read(slug, base, head); } catch { c = null; }
  const mb = () => git(['merge-base', `origin/${base}`, `origin/${head}`], { cwd: root, allowFail: true }).stdout.trim();
  const sha = c?.merge_base_commit?.sha;
  const ok = () => !!sha && mb() === sha;
  if (ok()) return;
  if (Number.isInteger(c?.ahead_by) && Number.isInteger(c?.behind_by)) {
    const deepen = (ref, n) => git(['fetch', '-q', `--deepen=${n}`, 'origin', ref], { cwd: root, allowFail: true }).code === 0;
    const tipCut = (b) => shallowCuts(root).has(git(['rev-parse', '-q', '--verify', `refs/remotes/origin/${b}^{commit}`], { cwd: root, allowFail: true }).stdout.trim());
    const side = (b, ref, count) => {
      if (tipCut(b)) return deepen(ref, Math.max(1, count)) && ok();
      for (let n = 1, got = 0; got < Math.max(1, count) && isShallow(root); got += n, n *= 2) if (deepen(ref, n) && ok()) return true;
      return ok();
    };
    if (side(head, refs[1], c.ahead_by) || side(base, refs[0], c.behind_by)) return;
  }
  if (ok()) return;
  const r = git(['fetch', '-q', '--unshallow', 'origin', ...refs], { cwd: root, allowFail: true });
  if (r.code !== 0 || !mb()) fail(`this clone is shallow and the history between ${head} and ${base} could not be read (${r.code !== 0 ? `git fetch --unshallow: ${r.stderr.trim().split('\n').pop()}` : 'no merge base after unshallowing'}); nothing was merged. Run it again, or start this session without clone_depth`);
}

export function jobChecks(root, n, pr, id, { cfg, slug, io, noReview, minutes = GATE_WAIT_MINUTES, log = console.log, every, mergeableEvery, onGate, transient }) {
  if (pr.state !== 'open') fail(`pull request ${n} is ${pr.state}`);
  if (pr.draft) fail(`pull request ${n} is a draft: the job has not completed`);
  if (pr.base.ref !== cfg.tranche) fail(`pull request ${n} is into ${pr.base.ref}, not the tranche ${cfg.tranche}`);
  if (!id) fail(`pull request ${n} is not from a job branch; any other pull request merges with --plain`);
  waitMergeable(slug, n, pr, { every: mergeableEvery, read: io.getPR, log });

  const branch = pr.head.ref;
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`], { cwd: root });
  // The job's head: in a shallow clone its commits main lacks only (util.mjs fetchJobRefs), else as ever.
  if (!isShallow(root) || !fetchJobRefs(root, [branch])) git(['fetch', '-q', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { cwd: root });
  if (git(['rev-parse', `origin/${branch}`], { cwd: root }) !== pr.head.sha) fail(`${branch} moved since the gate ran; run merge again`);
  deepenToBase(root, slug, cfg.tranche, branch, io.compare);
  if (git(['rev-parse', `origin/${branch}`], { cwd: root }) !== pr.head.sha) fail(`${branch} moved since the gate ran; run merge again`);
  // merge run again on the merge-row tip an earlier run pushed, whose gate outran that run's
  // wait: wait on that gate here, and (below) push no second merge row (defect sweep 4 Nov, #6).
  const rowTip = mergeRowSince(rowsAt(root, pr.head.sha, id), n);
  const watch = { minutes, read: io.checkRun, pr: () => io.getPR(slug, n), log, ...(every !== undefined ? { every } : {}), ...(transient ? { transient } : {}) };
  // The newest receipt must have been checked, and agreed with, by a green gate run on the tip (AUD-2, JOB-7).
  let first = io.checkRun(slug, pr.head.sha, 'gate');
  // The merged result an earlier run pushed is gating: wait on it.
  if (rowTip && first?.status !== 'completed') { onGate?.(pr.head.sha); first = waitForGate(slug, pr.head.sha, watch); }
  if (first?.conclusion !== 'success') fail(`the gate is not green on ${pr.head.sha.slice(0, 10)} (${first ? first.conclusion || first.status : 'no run'})`);
  const all = io.comments(slug, n);
  const receipt = latestReceipt(all, pr.user?.login); // only the opener's (review of PR 13)
  if (!receipt) fail(`pull request ${n} has no receipt`);
  // Each row names its Actions run; the row counts only when that run is the process gate on
  // this tip, green, and its own artifact holds the same row (verifyRow).
  // The receipt is checked against CI's own run of its tests (gate.mjs receiptAgrees): only a
  // row that says 'agrees' stands; an earlier pin's 'present' or an 'unmeasured' does not.
  const agreed = gateRuns(all).filter((r) => r.sha === pr.head.sha && r.ok && r.receipt === 'agrees' && r.receipt_attempt === receipt.attempt)
    .find((r) => io.verify(slug, r, { pr: n, baseRef: cfg.tranche }));
  if (!agreed) fail(`no green process-gate run on ${pr.head.sha.slice(0, 10)} checked receipt attempt ${receipt.attempt} and agreed with it${unread(gateRuns(all), pr.head.sha, receipt.attempt)}`);

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
  if (trig.fired.length && noReview) fail(`pull request ${n} fires the review trigger${trig.fired.length > 1 ? 's' : ''} ${trig.fired.join(' and ')} (${trig.why}): --no-review is refused (review triggers, 4 Nov 19:05). Brief a fresh read-only reviewer with ${P3} review brief ${n}, which carries the hunks that fired it; one review and one fix pass; then merge ${n} --reviewed "<what it found>" --rounds <n> --review-minutes <n> --findings <n> --acted-on <n>`);
  if (trig.fired.length) log(`review trigger${trig.fired.length > 1 ? 's' : ''} ${trig.fired.join(' and ')}: ${trig.why}`);

  return { branch, watch, first, all, receipt, mb, baseEntry, trig };
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

// The act that clears a receipt no green run on the tip has checked and agreed with: an amended
// receipt posts no commit, and a row from an earlier pin read it without checking it (AUD-2), so
// the gate on the tip needs a new event.
export function unread(runs, sha, attempt) {
  const r = runs.filter((x) => x.sha === sha).pop();
  if (!r || !r.ok || (r.receipt_attempt === attempt && r.receipt === 'agrees')) return '';
  if (r.receipt_attempt === attempt) return `; its newest run left the receipt ${r.receipt}${r.receipt_unmeasured ? `: ${r.receipt_unmeasured}` : ''}, not checked against CI's run of its tests: give the gate on ${sha.slice(0, 10)} a new event (edit the pull request)`;
  return `; its newest run read ${r.receipt_attempt == null ? 'no receipt' : `attempt ${r.receipt_attempt}`}: give the gate on ${sha.slice(0, 10)} a new event (edit the pull request)`;
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
// notice's triage first, then the ready jobs' start; otherwise START_FIRST alone.
export function firstActs(t) {
  const key = t?.key || String(t?.next || '').match(/notice triage (\S+)/)?.[1];
  if (!key || !(t.owed?.length || t.error)) return [START_FIRST];
  const owe = t.error ? `its triage at the merge failed, ${t.owed?.length || 0} owed` : `${t.owed.length} user module${t.owed.length === 1 ? ' owes' : 's owe'} a worker's judgment: ${t.owed.join(', ')}`;
  return [`first: ${P3} notice triage ${key} (provider notice ${key}; ${owe}: a read-only worker judges them now, not in a later batch)`, START_FIRST.replace(/^first: /, 'then: ')];
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
// body, which gh prints with its HTTP status) is not this case. Nor is a refusal of the budget's
// or of GitHub's rate limit (R17d): the merge was never made, and the reply is no unread one; read
// as one, the PUT was sent again at once into the same refusal, and the stop named an unread
// reply, not the refusal and its rerun.
export const unreadable = (msg) => {
  if (BUDGET.test(String(msg))) return false;
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
// PR 14). Bob's standing approvals (CLAUDE.md, 4 Nov) and his word of 6 Nov (R1) bound what a
// plain pull request may do there instead of refusing every change (process3 PR 188 and copy
// PR 625 were refused and merged by hand, 6 Nov): L4, a process shim (process-gate.yml, and any
// file named like a shim the pin ships) equals the pin's own shim, byte for byte, at the released
// pin its head sets; every other workflow file changed or added passes L1, L2, L3 and L5
// (workflow-limits.mjs), judged from its copy at the merge base to the head's against the base
// branch's required checks. A deleted workflow, or one outside a limit, needs the owner's word.
// In process3 itself (a plain pull request into a base with no pin and no config in its
// history, and no pin at the head or the merge base) there are no shims, so L4 does not apply. The tranche into main (`close`, normal or
// bootstrap) is judged by workflows.mjs (Bob, 4 Nov: product workflow changes are not his to
// bring): a shim must still be the pin's own (rule 4); any other workflow file passes rule 1 and
// either rules 2 and 3 there or these limits. Returns what was judged, for the merge's message:
// [{ file, limits }].
// at: { mb, required: () => the base's required check names, process3 }.
export function workflowChanges(root, sha, changed, repo, close = null, at = {}) {
  const files = changed.filter((f) => f.startsWith(WORKFLOWS));
  if (!files.length) return [];
  const owner = (why, list = files) => fail(`the pull request changes ${list.join(', ')}: ${why}${close ? ' (rule 4)' : '. A workflow change needs the owner\'s word: bring it to Bob'}`);
  const pin = pinAt(root, sha);
  const own = !close && !pin && at.process3 === true && !(at.mb && pinAt(root, at.mb));
  if (!pin && !own) owner('there is no process pin to compare it with');
  if (pin && !repo.released(pin)) owner(`the process pin ${pin.slice(0, 10)} is not a commit on process3's tranche or main`);
  const product = [];
  const judged = [];
  let required = null;
  const req = () => (required ??= at.required ? at.required() : []);
  const limits = (f) => {
    if (!/\.ya?ml$/.test(f)) return { ok: true, limits: [], note: 'not a workflow (GitHub runs only .yml and .yaml)' };
    return judgeWorkflow(f, at.mb ? textAt(root, at.mb, f) : null, textAt(root, sha, f), req());
  };
  for (const f of files) {
    if (pin) {
      const blob = blobAt(root, sha, f);
      const shim = repo.shim(pin, basename(f));
      if (shim || basename(f) === 'process-gate.yml') {
        if (!blob || !shim || blob !== shim) owner(`L4: ${f} is not the process's own shim at ${pin.slice(0, 10)}`);
        judged.push({ file: f, limits: ['L4'] });
        continue;
      }
    }
    if (close) {
      if (f.slice(WORKFLOWS.length) === basename(f)) product.push(f);
      else owner(`${f} is not the process's own shim at ${pin.slice(0, 10)}`);
      continue;
    }
    const r = limits(f);
    if (!r.ok) fail(`the pull request changes ${refusal(f, r)}; ${OUTSIDE}`);
    judged.push({ file: f, limits: r.limits, ...(r.note ? { note: r.note } : {}) });
  }
  if (product.length) judged.push(...closeWorkflows(root, sha, product, { ...close, limits: (f, src, baseSrc) => judgeWorkflow(f, baseSrc, src, req()) }));
  return judged;
}
const textAt = (root, rev, path) => {
  const r = git(['show', `${rev}:${path}`], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout : null;
};
// The merge message's line for what workflowChanges judged.
export const limitsLine = (judged) => (judged.length ? `Workflow limits: ${judged.map((j) => `${j.file.slice(WORKFLOWS.length)} ${j.limits.length ? j.limits.join(' ') : j.note || 'none'}`).join('; ')}` : null);

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
export function waitForChecks(slug, sha, names, { minutes = GATE_WAIT_MINUTES, every = null, read = checkRuns, pr, log = console.log, transient } = {}) {
  let polls = 0;
  const until = Date.now() + minutes * MINUTE;
  const extended = new Map();
  let k = 0;
  for (;;) {
    const g = guarded(() => [pr?.(), names.map((name) => [name, read(slug, sha, name)?.[0]])]);
    if (g.err) { transientPause(g.err, ++k, { until, log, wait: transient }); continue; }
    k = 0;
    const [p, runs] = g.v;
    if (p && p.state && p.state !== 'open') fail(`the pull request is ${p.merged ? 'merged' : p.state} while its checks on ${sha.slice(0, 10)} were awaited; run merge again`);
    if (p?.head?.sha && p.head.sha !== sha) fail(`${p.head.ref || 'the head'} moved to ${p.head.sha.slice(0, 10)} while its checks on ${sha.slice(0, 10)} were awaited; run merge again`);
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
    sleep(every ?? pollMs(++polls));
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

// A pass's gate row (P7: one full test run before it is committed): a green, verified process-gate
// run on the head against the base as it is, judged as a pass, that ran the whole suite of every
// module the pass touches (no requirements-only run); records pushed after it keep it.
function passGate(slug, n, sha, ids, { base, baseSha, io, log }) {
  if (io.checkRun(slug, sha, 'gate')?.conclusion !== 'success') fail(`pull request ${n} is a pass, and the gate on ${sha.slice(0, 10)} is not green`);
  const rows = gateRuns(io.comments(slug, n));
  const full = (r) => r.ok && r.pass === true && r.trigger === 'code' && ['pass', 'base-red'].includes(r.suite) && r.base === baseSha
    && ids.every((id) => r.scope?.includes(id)) && !(r.requirements_only || []).some((x) => ids.includes(x?.module));
  const ok = rows.filter((r) => r.sha === sha).reverse().find((r) => {
    const run = r.trigger === 'record-since-green' && r.ok && r.base === baseSha ? rows.find((x) => x.sha === r.after && full(x)) : r;
    return run && full(run) && io.verify(slug, r, { pr: n, baseRef: base }) && (run === r || io.verify(slug, run, { pr: n, baseRef: base }));
  });
  if (!ok) fail(`pull request ${n} is a pass: no green process-gate run on ${sha.slice(0, 10)} against ${base} as it is ran the whole suites of ${ids.join(', ')} as a pass (P7); give the gate a new event on the base as it is (push, or edit the pull request)`);
  log(`pass: the gate on ${sha.slice(0, 10)} ran the suites of ${ids.join(', ')}`);
}

// The live jobs of a pass's modules (P7: while no job runs): an open job pull request into the
// tranche, an entry WORKING on the tranche, or a job branch whose entry is WORKING or OPEN (a
// COMPLETE job whose pull request merged holds nothing). Unreadable: refused, not guessed.
export function liveJobs(root, ids, { slug, tranche, entries, io }) {
  const heads = io.jobHeads(root);
  const prs = io.openPRs(slug, tranche);
  if (!heads || !Array.isArray(prs)) fail(`the job branches or the open pull requests into ${tranche} cannot be read, so whether a job holds ${ids.join(', ')} is unknown; run merge again`);
  const all = new Set(entries.map((e) => e.id));
  const live = [];
  for (const id of ids) {
    const p = prs.find((x) => branchModule(x.head?.ref, all) === id);
    if (p) { live.push(`${id} (job PR ${p.number} is open)`); continue; }
    if (entries.find((e) => e.id === id)?.status?.state === 'WORKING') { live.push(`${id} (WORKING on ${tranche})`); continue; }
    const b = jobBranch(id, heads, all);
    if (!heads.has(b)) continue;
    // A failed fetch would read a stale tracking ref: unread (cold review).
    const fetched = git(['fetch', '-q', 'origin', `+refs/heads/${b}:refs/remotes/origin/${b}`], { cwd: root, allowFail: true }).code === 0;
    const t = fetched ? git(['show', `refs/remotes/origin/${b}:${entryFile(id)}`], { cwd: root, allowFail: true }) : null;
    let st = null;
    try { st = t?.code === 0 ? JSON.parse(t.stdout).status?.state || null : null; } catch { st = null; }
    if (!st || st === 'WORKING' || st === 'OPEN') live.push(`${id} (${st || 'an unread entry'} on ${b})`);
  }
  return live;
}

export function mergePlain(root, n, opts = {}) {
  const { reviewed, noReview, pass, minutes = GATE_WAIT_MINUTES, log = console.log } = opts;
  const io = { getPR, requiredChecks, checkRuns, checkRun, comments, mergePR, openPRs, jobHeads: originJobs, verify: (slug, r, ctx) => verifyRow(slug, r, ctx), repo: processRepo(), ...(opts.io || {}) };
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
  // A layer branch cut ahead for early starts (R14) takes nothing before its open: its open is a
  // fast-forward to the tranche (cold review of R14).
  const lk = layerOfBranch(base);
  if (lk !== null) {
    const sb = loadConfig(root).state_branch;
    git(['fetch', '-q', 'origin', `+refs/heads/${sb}:refs/remotes/origin/${sb}`], { cwd: root, allowFail: true });
    if (git(['cat-file', '-e', `refs/remotes/origin/${sb}:${flowFile(lk, 'open')}`], { cwd: root, allowFail: true }).code !== 0) fail(`pull request ${n} is into ${base}, and layer ${lk} is not open (cut ahead for early starts, or never opened): nothing merges into it before ${P3} layer open ${lk}`);
  }
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
  deepenToBase(root, slug, base, head, io.compare);
  if (git(['rev-parse', `origin/${head}`], { cwd: root }) !== pr.head.sha) fail(`${head} moved since GitHub reported ${pr.head.sha.slice(0, 10)}; run merge again`);
  const mb = git(['merge-base', baseRef, pr.head.sha], { cwd: root });
  // No rename detection: a rename lists the path it removes as well as the one it adds.
  const changed = diffNames(root, mb, pr.head.sha);
  // The base's required checks, read once, for the workflow limits and the wait below.
  let rules;
  const readRules = () => {
    if (rules === undefined) rules = io.requiredChecks(slug, base);
    if (!rules) fail(`could not read the checks ${base} requires`);
    return rules;
  };
  // process3 itself: a base with no pin and no config in its history, not a first close into main.
  const process3 = !main && isBootstrap(root, baseRef);
  const workflows = workflowChanges(root, pr.head.sha, changed, io.repo, main ? { mb, base, baseRef, tranche: head, slug, io, ownerCommit: (c) => (baseCfg?.approvals.owner ? webCommitByOwner(root, c, baseCfg.approvals.owner, io.lookup, slug) : { ok: false }) } : null, {
    mb, process3, required: () => [...new Set(readRules().checks.map((c) => c.context))],
  });
  if (workflows.length) log(`workflow changes within the owner's limits: ${limitsLine(workflows).replace(/^Workflow limits: /, '')}`);
  const owner = baseCfg?.approvals.owner;
  pinChange(root, mb, pr.head.sha, io.repo, {
    intoMain: main, baseRef, ownerCommit: (c) => (owner ? webCommitByOwner(root, c, owner, io.lookup, slug) : { ok: false }),
  });

  let refreshed = [];
  let untracked = [];
  let ignores = [];
  let passIds = null;
  let noLiveJobs = () => {};
  if (pass !== undefined && (!baseCfg || base !== baseCfg.tranche)) fail(`pull request ${n} is into ${base}: a pass lands only on the tranche (P7)`);
  if (pass !== undefined && !PASS_BRANCH.test(head)) fail(`pull request ${n} is from ${head}: a pass comes from a pass/<name> branch, which the gate runs as a pass (P7)`);
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
    // The fourth route, a pass (P7, Bob's Keep and Drop, 3 Nov): "A no-judgment change across many
    // modules is one mechanical pass by a worker in BOB's session while no job runs, with one full
    // test run before it is committed." Any module's files, while no live job holds them, on a
    // green gate that ran every touched module's whole suite (checked below), with no receipt.
    if (pass !== undefined) {
      passIds = entries.filter((e) => changed.some((f) => owned(f, e))).map((e) => e.id);
      if (!passIds.length) fail(`pull request ${n} changes no module's files: it is no pass; merge it without --pass`);
      noLiveJobs = () => {
        const live = liveJobs(root, passIds, { slug, tranche: base, entries, io });
        if (live.length) fail(`pull request ${n} is a pass, and a pass runs while no job holds its modules (P7): ${live.slice(0, 5).join(', ')}`);
      };
      noLiveJobs();
      if (latestBlock(null, null, RECEIPT, io.comments(slug, n))) fail(`pull request ${n} carries a receipt: a pass has none; a job's work merges without --plain`);
    }
    // A lane's pull request (Bob's standing approvals, 5 Nov: "A pull request that changes only
    // files in its own lane's folder lands through the merge tool without a test suite run"):
    // every file in one lane's folder, records aside, as the gate judges it (util.mjs laneOnly;
    // copy PR 620, 6 Nov 05:15, refused as module files of ux-design). Not a module's tests.
    const lane = baseCfg ? laneOnly(baseCfg, changed, entries) : null;
    if (lane) log(`pull request ${n} changes only lane ${lane}'s folder (records aside): it lands as a lane's change`);
    const hits = pass !== undefined || lane ? [] : changed.flatMap((f) => entries.filter((e) => owned(f, e) && !found(f, e)).map((e) => ({ f, id: e.id })));
    const hit = hits.filter((h) => !isGenerated(gen, h.f) && !ignores.includes(h.f)).map((h) => `${h.f} (${h.id})`);
    if (hit.length) fail(`pull request ${n} changes module files, which go through a job: ${hit.slice(0, 5).join(', ')}${why.length ? `; a plain pull request may only add new unmet found marks to a requirement file (${why.slice(0, 3).join('; ')})` : ''}${hits.length > hit.length ? '; a plain pull request may change a module\'s generated files only, and only to their regenerated bytes' : ''}; a no-judgment change while no job runs is a pass: from a pass/<name> branch, merge --plain --pass "<what and why>" (P7)`);
    // The gate's row must have compared every generated file the refresh changes, owned or not
    // (review 3 of PR 95).
    // A pass's changed generated module files are compared as a refresh's are, its other files aside.
    const genOwned = passIds && changed.some((f) => isGenerated(gen, f) && entries.some((e) => owned(f, e)));
    refreshed = hits.length || genOwned ? changed.filter((f) => isGenerated(gen, f)) : [];
    untracked = refreshed.length ? removed : [];
    const others = refreshed.length && !passIds ? refreshOthers(baseCfg, gen, changed, entries, ignores, { also: addedRequirements(root, baseCfg, { from: mb, to: pr.head.sha, before: entries }) }) : [];
    if (others.length) fail(`pull request ${n} changes generated module files and ${others.slice(0, 5).join(', ')}: a refresh may go beside only records, the modules file, the layers file and process/config.json; any other file could be what writes them`);
  }

  const names = [...new Set(readRules().checks.map((c) => c.context))];
  if (!names.length && (main || !baseCfg || base === baseCfg.tranche)) fail(`${base} requires no checks; its ruleset must require the gate before anything merges into it`);
  const states = waitForChecks(slug, pr.head.sha, names, { minutes, every: opts.every, read: io.checkRuns, pr: () => io.getPR(slug, n), log, ...(opts.transient ? { transient: opts.transient } : {}) });
  log(names.length ? `required checks on ${pr.head.sha.slice(0, 10)}: ${states.map(([c, st]) => `${c} ${st}`).join(', ')}; GitHub's ruleset judges them` : `note: ${base} requires no checks`);
  if (refreshed.length) refreshGate(slug, n, pr.head.sha, refreshed, { base, baseSha: git(['rev-parse', baseRef], { cwd: root }), untracked, io, log });
  if (passIds) passGate(slug, n, pr.head.sha, passIds, { base, baseSha: git(['rev-parse', baseRef], { cwd: root }), io, log });
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
  // A job started on a pass's module while its gate was awaited: no pass lands over it (cold review).
  noLiveJobs();
  const r = mergeRetry(() => io.mergePR(slug, n, pr.head.sha, {
    title: `Merge PR ${n}: ${head} into ${base}`,
    message: [pass !== undefined ? `Pass: ${pass}` : reviewed ? `Reviewed: ${reviewed}` : `No review: ${noReview}`, `Review rounds: ${rounds.rounds}`, ...(rounds.decision ? [`Decision: ${rounds.decision}`] : []), ...(limitsLine(workflows) ? [limitsLine(workflows)] : [])].join('\n'),
  }), {
    log, wait: opts.wait, reread: { read: () => io.getPR(slug, n), sha: pr.head.sha },
    fetch: () => git(['fetch', '-q', 'origin', `+refs/heads/${base}:refs/remotes/origin/${base}`], { cwd: root, allowFail: true }),
    check: () => {
      const p = io.getPR(slug, n);
      if (p.state !== 'open' || p.base?.ref !== base || p.head?.sha !== pr.head.sha) fail(`pull request ${n} changed while its base moved; run merge again`);
      baseHolds();
      noLiveJobs();
    },
  });
  if (!r?.merged) fail(`GitHub did not merge pull request ${n}: ${r?.message || 'no result'}`);
  log(`merged pull request ${n} at ${r.sha} (${now()})`);
  // A pin move into the tranche (never into a working branch) gives BOB new acts (tranche open):
  // the wake, from the role that ran the merge (--as; BOB itself, the default, is awake).
  const pin = pinAt(root, pr.head.sha);
  const as = opts.as ?? 'bob';
  const moved = base === (baseCfg?.tranche || DEFAULTS.tranche) && pin && pin !== pinAt(root, mb);
  const what = PIN_WHAT(pin);
  const wake = moved && as !== 'bob' ? bobWake(what, as) : null;
  // Printed once per merge commit (state.mjs wakeOnce).
  if (wake) printWake(root, baseCfg?.state_branch || DEFAULTS.state_branch, { pr: n, sha: r.sha, what, wake, as, by: 'merge', log });
  return { merged: true, sha: r.sha, checks: names, wake, what: wake ? what : null, ...(passIds ? { pass, modules: passIds } : {}), ...(workflows.length ? { workflows } : {}) };
}

// A pin move's wake for BOB (build train-robust, option 2A): the same words wherever the move is
// seen, computed from git when no record carries them (a train that stopped after its land, a
// pull request found merged by a later pass): the pin at the merge commit against the pin at its
// first parent, the base as it was (the tool merges with merge commits only). A merge commit that
// cannot be read gives the wake anyway, said so: an extra wake costs BOB one status, a missing
// one stalls the tranche. { what, wake } (both null when the pin did not move or as is bob).
export const PIN_WHAT = (pin) => `pin moved to ${pin}: run your wake steps (start check --wake prints a changed prompt), then status`;
export function pinWake(root, base, sha, as = 'bob') {
  if (as === 'bob' || !sha) return { what: null, wake: null };
  git(['fetch', '-q', 'origin', `+refs/heads/${base}:refs/remotes/origin/${base}`], { cwd: root, allowFail: true });
  if (git(['cat-file', '-e', `${sha}^{commit}`], { cwd: root, allowFail: true }).code !== 0) git(['fetch', '-q', 'origin', sha], { cwd: root, allowFail: true });
  let pin;
  let was;
  try { pin = pinAt(root, sha); was = pinAt(root, `${sha}^1`); } catch {
    const what = `the pin may have moved (merge ${String(sha).slice(0, 10)} could not be read): run your wake steps (start check --wake prints a changed prompt), then status`;
    return { what, wake: bobWake(what, as), unread: true };
  }
  if (!pin || pin === was) return { what: null, wake: null };
  const what = PIN_WHAT(pin);
  return { what, wake: bobWake(what, as) };
}
// Prints a wake once per merge commit, across every session that sees the merge (the
// coordinator's ruling, 5 Nov): the first to record it prints it; a later one says it was given.
// A record that cannot be written prints it anyway.
export function printWake(root, sb, { pr, sha, what, wake, as, by, log = console.log }) {
  const w = wakeOnce(root, sb, { pr, sha, what, wake, by, print: true });
  if (w.print) log(wakeLine(what, as));
  else log(`the wake of BOB for PR ${pr} (merge ${String(sha).slice(0, 10)}) was already given by ${w.printed?.by || 'another run'} at ${w.printed?.at || '?'}: not given again`);
  return w;
}
