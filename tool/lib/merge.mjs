// merge (GAT-8, INT-1): BOB brings a job's branch up to the tranche, writes the merge row, waits
// for the gate on that tip, and merges only a green, current tip. The merge is completion.
import { GATE, checkRun, comments, getPR, latestBlock } from './github.mjs';
import { appendRow, metricsFile, readRows } from './metrics.mjs';
import { fail, gh, git, loadConfig, now, repoSlug } from './util.mjs';

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const MINUTE = 60000;

export function waitForGate(slug, sha, { minutes = 30, every = 15000, read = checkRun, log = console.log } = {}) {
  const until = Date.now() + minutes * MINUTE;
  for (;;) {
    const run = read(slug, sha, 'gate');
    if (run?.status === 'completed') return run;
    if (Date.now() > until) fail(`the gate on ${sha.slice(0, 10)} did not finish within ${minutes} min`);
    log(`waiting for the gate on ${sha.slice(0, 10)} (${run ? run.status : 'not started'})`);
    sleep(every);
  }
}

export function merge(root, n, opts = {}) {
  const { reviewed, noReview, minutes = 30, log = console.log } = opts;
  const io = { getPR, comments, checkRun, mergePR, ...(opts.io || {}) };
  if (!reviewed && !noReview) fail('say whether a fresh reviewer ran: --reviewed "<what>" or --no-review "<why>" (INT-2)');
  const cfg = loadConfig(root);
  const slug = opts.slug || repoSlug(root);
  const pr = io.getPR(slug, n);
  const id = pr.head?.ref?.match(/^job\/([a-z0-9-]+)$/)?.[1];
  if (pr.state !== 'open') fail(`pull request ${n} is ${pr.state}`);
  if (pr.draft) fail(`pull request ${n} is a draft: the job has not completed`);
  if (pr.base.ref !== cfg.tranche) fail(`pull request ${n} is into ${pr.base.ref}, not the tranche ${cfg.tranche}`);
  if (!id) fail(`pull request ${n} is not from a job branch`);

  // The receipt must have been checked against a green gate run on the job's own tip.
  const first = io.checkRun(slug, pr.head.sha, 'gate');
  if (first?.conclusion !== 'success') fail(`the gate is not green on ${pr.head.sha.slice(0, 10)} (${first ? first.conclusion || first.status : 'no run'})`);
  const runs = latestBlock(slug, n, GATE, io.comments(slug, n))?.data?.runs || [];
  const checked = runs.filter((r) => r.sha === pr.head.sha && r.ok).pop();
  if (!checked || checked.receipt !== 'agrees') fail(`no green gate run on ${pr.head.sha.slice(0, 10)} checked the receipt (${checked ? checked.receipt : 'no run recorded'})`);

  const branch = `job/${id}`;
  const back = git(['symbolic-ref', '-q', '--short', 'HEAD'], { cwd: root, allowFail: true }).stdout.trim() || git(['rev-parse', 'HEAD'], { cwd: root });
  if (git(['status', '--porcelain', '--untracked-files=no'], { cwd: root })) fail('the working tree has changes; commit or stash them first');
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`, `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { cwd: root });
  git(['checkout', '-q', '-B', `p3-merge/${id}`, `origin/${branch}`], { cwd: root });
  try {
    if (git(['rev-parse', 'HEAD'], { cwd: root }) !== pr.head.sha) fail(`${branch} moved since the gate ran; run merge again`);
    // Bring it up to the tranche (a merge commit: the job's history is never rewritten).
    if (git(['merge-base', '--is-ancestor', `origin/${cfg.tranche}`, 'HEAD'], { cwd: root, allowFail: true }).code !== 0) {
      const m = git(['merge', '-q', '--no-ff', '--no-edit', `origin/${cfg.tranche}`, '-m', `Bring ${branch} up to ${cfg.tranche}`], { cwd: root, allowFail: true });
      if (m.code !== 0) {
        git(['merge', '--abort'], { cwd: root, allowFail: true });
        fail(`${branch} conflicts with ${cfg.tranche}; the job must bring itself up to date`);
      }
    }
    const done = readRows(root, id).filter((r) => r.event === 'complete').pop();
    appendRow(root, id, {
      row: 'merge', pr: n, reviewed: !!reviewed, review: reviewed || noReview,
      minutes_from_complete: done ? Math.round((Date.now() - Date.parse(done.at)) / MINUTE) : null,
    });
    git(['add', '--', metricsFile(id)], { cwd: root });
    git(['commit', '-q', '-m', `merge row for ${id} (PR ${n})`, '--', metricsFile(id)], { cwd: root });
    const tip = git(['rev-parse', 'HEAD'], { cwd: root });
    git(['push', '-q', 'origin', `HEAD:refs/heads/${branch}`], { cwd: root });
    log(`pushed ${tip.slice(0, 10)} to ${branch}; the gate runs on the merged result`);
    const run = waitForGate(slug, tip, { minutes, read: io.checkRun, log });
    if (run.conclusion !== 'success') fail(`the gate on the merged result is ${run.conclusion}: ${run.html_url}`);
    const r = io.mergePR(slug, n, tip);
    if (!r?.merged) fail(`GitHub did not merge pull request ${n}: ${r?.message || 'no result'}`);
    log(`merged pull request ${n} at ${r.sha} (${now()})`);
    return { merged: true, sha: r.sha, tip };
  } finally {
    git(['checkout', '-q', back], { cwd: root, allowFail: true });
    git(['branch', '-q', '-D', `p3-merge/${id}`], { cwd: root, allowFail: true });
  }
}

// The merge itself, guarded by the tip the gate passed (a current tip only).
export function mergePR(slug, n, sha) {
  return gh(['api', '-X', 'PUT', `repos/${slug}/pulls/${n}/merge`, '--input', '-'], {
    input: JSON.stringify({ sha, merge_method: 'merge', commit_title: `Merge job PR ${n}` }),
  });
}
