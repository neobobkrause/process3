// branches prune (Bob, 5 Nov ~18:02: "The leftover branches issue should be something we setup to
// run regularly rather than something I need to kick start over and over"): the scheduled cleanup
// of a product's leftover branches, run by the shim process-branch-prune.yml on the default
// branch, daily and on dispatch. It deletes nothing until Bob's approvals allow it.
//
// The approval gate (fails closed). The standing approvals say sessions "may never ... delete a
// branch". This command deletes only while the approvals block (process/config.json approvals:
// its file and heading) on the default branch's tip, as origin holds it, carries MARKER, the fixed
// phrase "the process's scheduled branch cleanup workflow" of Bob's sentence (APPROVAL), exactly;
// whitespace runs and curly apostrophes are read as one space and a straight apostrophe, nothing
// else is forgiven (not case). The phrase anywhere else in the file is no approval. Without it the run prints a notice, deletes nothing and writes
// nothing. --dry-run reads and prints all the same, approved or not, and writes nothing.
//
// What it deletes, each judged on a fresh fetch of every origin branch:
//   (a) in-tranche: a branch with no commit the tranche lacks (git rev-list --count
//       <tranche>..<branch> is 0, counted locally in a full clone: one compare call per branch
//       would spend most of the workflow token's 1000 requests an hour on the copy's 835 branches);
//   (b) train-head-closed: the merge train's train/head/<pr>-<seq> branch whose pull requests (from
//       this repository; at least one) are all closed, merged or not.
// What it never deletes (keep, checked before either rule):
//   protected: the default branch, main, the tranche (config's and "tranche"), process-state and the
//     config's state_branch;
//   open-pr: the head or the base of any open pull request;
//   recent: a branch whose tip, or (rule b) any commit the tranche lacks, has a committer or author
//     date in the last RECENT_HOURS, or that GitHub's activity log shows pushed or created then
//     (a branch cut from an old tranche tip a minute ago has no new commit, but is new);
//   ahead: any other branch with a commit the tranche lacks.
// Each delete is conditional on the tip it was judged at (git push --force-with-lease=<ref>:<sha>
// with an empty source: a delete, never a rewrite; a branch moved since is refused and kept), and
// what was deleted is read back from origin (ls-remote) afterwards, never assumed. One row per
// approved run, dry runs aside, appended to the state branch's branches/prune.jsonl: the counts,
// and every deleted branch's name, tip and rule (a deleted tip can be pushed back from its sha).
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { approvalsBlock } from './record.mjs';
import { writeState } from './state.mjs';
import { DEFAULTS, exists, fail, fetchRetry, gh, git, isShallow, loadConfig, now } from './util.mjs';

// Bob's sentence for the approvals block, as the coordinator relayed it (5 Nov 18:20). The gate
// matches MARKER, a fixed phrase of it; the keep rules below are the sentence's.
export const APPROVAL = 'One exception to the paragraph above: the process\'s scheduled branch cleanup workflow, running in those GitHub repositories, may delete branches whose commits are all in the tranche, and the merge train\'s train/head/* branches whose pull request is closed; never main, the tranche or the state branch, a branch with an open pull request, or one with a commit in the last 2 hours.';
export const MARKER = 'the process\'s scheduled branch cleanup workflow';
export const RECENT_HOURS = 2;
export const TRAIN_HEAD = 'train/head/';
export const PRUNE_FILE = 'branches/prune.jsonl';
export const DELETE_BATCH = 100;
const PUSH_TRIES = 3;

const norm = (t) => String(t).replace(/[‘’ʼ]/g, '\'').replace(/\s+/g, ' ').trim();
// Whether an approvals block carries the marker phrase (case as written).
export const approves = (block) => !!block && norm(block).includes(norm(MARKER));

const remote = (b) => `refs/remotes/origin/${b}`;
const isServerError = (s) => /(?:error|HTTP(?:\/[\d.]+)?(?: code)?)[: ]+5\d\d\b|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Time-?out|unexpected disconnect|RPC failed/i.test(s);

// The GitHub reads, each null when unreadable. read: gh's call, for the tests.
export function githubIO(read = (args) => gh(args, { allowFail: true })) {
  const pages = (path) => { const p = read(['api', '--paginate', '--slurp', path]); return Array.isArray(p) && p.every(Array.isArray) ? p.flat() : null; };
  return {
    defaultBranch: (slug) => read(['api', `repos/${slug}`])?.default_branch || null,
    pulls: (slug) => pages(`repos/${slug}/pulls?state=all&per_page=100`),
    activity: (slug) => pages(`repos/${slug}/activity?time_period=day&per_page=100`),
  };
}

// One push of deletes, each with its lease; git's own result. push: for the tests.
const gitPush = (root, args) => git(['push', '--porcelain', ...args], { cwd: root, allowFail: true });

export function prune(root, { slug, dryRun = false, ref, run, io = githubIO(), push = gitPush, clock = Date.now, log = console.log } = {}) {
  if (!slug) fail('branches prune needs the repository (owner/name)');
  const def = io.defaultBranch(slug);
  if (!def) fail(`could not read ${slug}'s default branch from GitHub; nothing was deleted`);
  // Scheduled runs are on the default branch; a dispatch on another ref runs that ref's copy of
  // the shim, so the tool itself refuses to delete from one.
  if (ref && ref !== `refs/heads/${def}` && !dryRun) fail(`branches prune deletes only from a run on ${def}, not ${ref}; nothing was deleted`);

  if (isShallow(root)) fail('branches prune needs a full clone (fetch-depth 0): a shallow one counts commits wrongly; nothing was deleted');
  const f = fetchRetry(['fetch', '-q', '--prune', 'origin', '+refs/heads/*:refs/remotes/origin/*'], { cwd: root });
  if (f.code !== 0) fail(`could not fetch origin's branches: ${f.stderr.trim()}; nothing was deleted`);
  const base = remote(def);
  if (git(['rev-parse', '-q', '--verify', base], { cwd: root, allowFail: true }).code !== 0) fail(`origin has no ${def}; nothing was deleted`);
  const baseSha = git(['rev-parse', base], { cwd: root });
  const cfg = loadConfig(root, base);

  // The gate: Bob's sentence in the approvals block on the default branch's tip.
  const { file, heading } = cfg.approvals;
  const block = exists(root, base, file) ? approvalsBlock(git(['show', `${base}:${file}`], { cwd: root }), heading) : '';
  const approved = approves(block);
  if (!approved) {
    const why = `the approvals block (${file}, "${heading}") on ${def} at ${baseSha.slice(0, 10)} does not carry the branch cleanup approval ("${MARKER}"); nothing ${dryRun ? 'would be' : 'was'} deleted`;
    if (!dryRun) { log(`::notice::branches prune: ${why}`); return { ok: true, approved: false, dryRun, deleted: [], failed: [], kept: {}, candidates: [] }; }
    log(`branches prune (dry run): ${why}; the branches the rules would delete once approved follow`);
  }

  const tranche = cfg.tranche;
  if (git(['rev-parse', '-q', '--verify', remote(tranche)], { cwd: root, allowFail: true }).code !== 0) fail(`origin has no ${tranche}, the tranche ${def}'s config names; nothing was deleted`);
  const trancheSha = git(['rev-parse', remote(tranche)], { cwd: root });

  const pulls = io.pulls(slug);
  if (!pulls) fail(`could not read ${slug}'s pull requests; nothing was deleted`);
  const activity = io.activity(slug);
  if (!activity) fail(`could not read ${slug}'s activity log; nothing was deleted`);

  const cutoff = clock() - RECENT_HOURS * 3600 * 1000;
  const protectedNames = new Set([def, 'main', tranche, DEFAULTS.tranche, DEFAULTS.state_branch, cfg.state_branch]);
  const openRefs = new Set(pulls.filter((p) => p.state === 'open').flatMap((p) => [p.head?.ref, p.base?.ref]).filter(Boolean));
  const own = new Map();
  for (const p of pulls) {
    if (p.head?.repo?.full_name !== slug || !p.head?.ref) continue;
    if (!own.has(p.head.ref)) own.set(p.head.ref, []);
    own.get(p.head.ref).push(p);
  }
  const recentRefs = new Set(activity
    .filter((e) => /^refs\/heads\//.test(String(e?.ref)) && Date.parse(e.timestamp) >= cutoff)
    .map((e) => e.ref.slice('refs/heads/'.length)));

  const listed = git(['for-each-ref', '--format=%(refname)%00%(objectname)%00%(committerdate:unix)%00%(authordate:unix)', 'refs/remotes/origin/'], { cwd: root });
  const branches = listed.split('\n').filter(Boolean).map((l) => {
    const [r, sha, c, a] = l.split('\0');
    return { name: r.slice('refs/remotes/origin/'.length), sha, newest: Math.max(Number(c) || 0, Number(a) || 0) * 1000 };
  }).filter((b) => b.name !== 'HEAD');

  const kept = { protected: [], 'open-pr': [], recent: [], ahead: [] };
  const candidates = [];
  for (const b of branches) {
    if (protectedNames.has(b.name)) { kept.protected.push(b.name); continue; }
    if (openRefs.has(b.name)) { kept['open-pr'].push(b.name); continue; }
    if (b.newest >= cutoff || recentRefs.has(b.name)) { kept.recent.push(b.name); continue; }
    const n = git(['rev-list', '--count', `${remote(tranche)}..${remote(b.name)}`], { cwd: root, allowFail: true });
    if (n.code !== 0) fail(`could not count ${b.name}'s commits against ${tranche}: ${n.stderr.trim()}; nothing was deleted`);
    if (Number(n.stdout) === 0) { candidates.push({ name: b.name, sha: b.sha, why: 'in-tranche' }); continue; }
    const prs = own.get(b.name) || [];
    if (b.name.startsWith(TRAIN_HEAD) && prs.length && prs.every((p) => p.state === 'closed')) {
      const dates = git(['log', '--format=%ct %at', `${remote(tranche)}..${remote(b.name)}`], { cwd: root }).split(/\s+/).filter(Boolean).map(Number);
      if (Math.max(0, ...dates) * 1000 >= cutoff) { kept.recent.push(b.name); continue; }
      candidates.push({ name: b.name, sha: b.sha, why: 'train-head-closed' });
      continue;
    }
    kept.ahead.push(b.name);
  }

  const counts = Object.fromEntries(Object.entries(kept).map(([k, v]) => [k, v.length]));
  const label = dryRun ? 'would delete' : 'deleting';
  log(`branches prune${dryRun ? ' (dry run)' : ''}: ${branches.length} branches on origin; ${candidates.length} to delete (${candidates.filter((c) => c.why === 'in-tranche').length} in ${tranche}, ${candidates.filter((c) => c.why === 'train-head-closed').length} closed train heads); kept ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`);
  for (const c of candidates) log(`  ${label} ${c.name} at ${c.sha.slice(0, 10)} (${c.why})`);
  if (dryRun) return { ok: true, approved, dryRun, deleted: [], failed: [], kept: counts, candidates };

  // The deletes, each leased to the tip judged above, in batches; a server error retries the batch.
  for (let i = 0; i < candidates.length; i += DELETE_BATCH) {
    const batch = candidates.slice(i, i + DELETE_BATCH);
    const args = [...batch.map((c) => `--force-with-lease=refs/heads/${c.name}:${c.sha}`), 'origin', ...batch.map((c) => `:refs/heads/${c.name}`)];
    for (let t = 1; t <= PUSH_TRIES; t++) {
      const r = push(root, args);
      if (r.code === 0 || !isServerError(`${r.stderr}\n${r.stdout}`)) break;
      if (t < PUSH_TRIES) log(`the delete push hit a server error; trying again (${t + 1} of ${PUSH_TRIES})`);
    }
  }

  // What origin holds now: a candidate still there was not deleted (moved, protected or failed).
  let left = null;
  for (let t = 1; t <= PUSH_TRIES && left === null; t++) {
    const r = git(['ls-remote', '--heads', 'origin'], { cwd: root, allowFail: true });
    if (r.code === 0) left = new Set(r.stdout.split('\n').filter(Boolean).map((l) => l.split('\t')[1]?.slice('refs/heads/'.length)));
  }
  if (left === null) fail('could not read origin\'s branches back after the deletes; the run\'s row is not written');
  const deleted = candidates.filter((c) => !left.has(c.name));
  const failed = candidates.filter((c) => left.has(c.name)).map((c) => c.name);
  for (const n of failed) log(`  not deleted: ${n} (moved since it was judged, protected, or the push failed)`);
  log(`branches prune: ${deleted.length} deleted, ${failed.length} not deleted`);

  const row = {
    at: now(), row: 'prune', ...(run ? { run: String(run) } : {}), default_branch: def, at_sha: baseSha, tranche, tranche_sha: trancheSha,
    branches: branches.length, kept: counts, deleted: deleted.map(({ name, sha, why }) => ({ name, sha, why })), failed,
  };
  writeState(root, cfg.state_branch, `branches prune: ${deleted.length} deleted`, (wt) => {
    const p = join(wt, PRUNE_FILE);
    mkdirSync(dirname(p), { recursive: true });
    appendFileSync(p, JSON.stringify(row) + '\n');
  });
  log(`row written to ${cfg.state_branch}:${PRUNE_FILE}`);
  // A branch moved since it was judged is kept, rightly; only a run that deleted none of its
  // candidates is red (a token without contents: write, or a ruleset that refuses every delete).
  return { ok: !failed.length || deleted.length > 0, approved, dryRun, deleted, failed, kept: counts, candidates };
}
