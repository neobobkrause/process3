// merge (GAT-8, INT-1): BOB brings a job's branch up to the tranche, writes the merge row, waits
// for the gate on that tip, and merges only a green, current tip. The merge is completion.
// merge runs with BOB's tool, not the pull request's, so it repeats the checks a pull request
// could switch off in its own copy of the gate workflow: ownership, and a checked receipt.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RECEIPT, checkRun, comments, gateRuns, getPR, latestBlock, verifyRow } from './github.mjs';
import { checkLedger, entryFile } from './ledger.mjs';
import { appendRow, metricsFile, readRows } from './metrics.mjs';
import { ownPaths } from './gate.mjs';
import { fail, gh, git, loadConfig, now, repoSlug, underPath } from './util.mjs';

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
  const io = { getPR, comments, checkRun, mergePR, verify: (slug, r) => verifyRow(slug, r), ...(opts.io || {}) };
  if (!reviewed && !noReview) fail('say whether a fresh reviewer ran: --reviewed "<what>" or --no-review "<why>" (INT-2)');
  const cfg = loadConfig(root);
  const slug = opts.slug || repoSlug(root);
  const pr = io.getPR(slug, n);
  const id = pr.head?.ref?.match(/^job\/([a-z0-9-]+)$/)?.[1];
  if (pr.state !== 'open') fail(`pull request ${n} is ${pr.state}`);
  if (pr.draft) fail(`pull request ${n} is a draft: the job has not completed`);
  if (pr.base.ref !== cfg.tranche) fail(`pull request ${n} is into ${pr.base.ref}, not the tranche ${cfg.tranche}`);
  if (!id) fail(`pull request ${n} is not from a job branch`);

  // The newest receipt must have been checked, and agreed with, by a green gate run on the tip.
  const first = io.checkRun(slug, pr.head.sha, 'gate');
  if (first?.conclusion !== 'success') fail(`the gate is not green on ${pr.head.sha.slice(0, 10)} (${first ? first.conclusion || first.status : 'no run'})`);
  const all = io.comments(slug, n);
  const receipt = latestBlock(slug, n, RECEIPT, all)?.data;
  if (!receipt) fail(`pull request ${n} has no receipt`);
  // Each row names its Actions run; the row counts only when that run is the process gate on
  // this tip, green, and its own artifact holds the same row (verifyRow).
  const agreed = gateRuns(all).filter((r) => r.sha === pr.head.sha && r.ok && r.receipt === 'agrees' && r.receipt_attempt === receipt.attempt)
    .find((r) => io.verify(slug, r));
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
  const outside = git(['diff', '--name-only', '-z', mb, `origin/${branch}`], { cwd: root }).split('\0').filter(Boolean).filter((f) => !own.some((p) => underPath(f, p)));
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
    const r = io.mergePR(slug, n, tip);
    if (!r?.merged) fail(`GitHub did not merge pull request ${n}: ${r?.message || 'no result'}`);
    log(`merged pull request ${n} at ${r.sha} (${now()})`);
    return { merged: true, sha: r.sha, tip };
  } finally {
    git(['worktree', 'remove', '--force', wt], { cwd: root, allowFail: true });
    rmSync(wt, { recursive: true, force: true });
  }
}

// The merge itself, guarded by the tip the gate passed (a current tip only).
export function mergePR(slug, n, sha) {
  return gh(['api', '-X', 'PUT', `repos/${slug}/pulls/${n}/merge`, '--input', '-'], {
    input: JSON.stringify({ sha, merge_method: 'merge', commit_title: `Merge job PR ${n}` }),
  });
}
