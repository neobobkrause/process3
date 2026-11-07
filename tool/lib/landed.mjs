// What the process recorded of a landed pull request, for when GitHub no longer serves it (the
// coordinator, 7 Nov: PRs opened by the suspended account read 404, are left out of GitHub's lists,
// and their comments with them; C13 and PR 735 credited such lands at the layer gate). Every reader
// of a job branch's landed pull requests, and of a landed one's receipt, reads them here: GitHub's
// answer where it serves it, else the state branch's land rows and the COMPLETE commit in git.
import { FLOW_DIR } from './layerbase.mjs';
import { rowsAt } from './metrics.mjs';
import { readState } from './state.mjs';
import { git } from './util.mjs';

// Every land row on the state branch (all layers), oldest first.
export function landRows(root, sb) {
  const r = git(['ls-tree', '-r', '--name-only', '-z', `refs/remotes/origin/${sb}`, '--', `${FLOW_DIR}/`], { cwd: root, allowFail: true });
  if (r.code !== 0) return [];
  return r.stdout.split('\0').filter((f) => /^layerflow\/\d+\/land\/[^/]+\.json$/.test(f))
    .flatMap((f) => { try { const x = JSON.parse(readState(root, sb, f)); return x?.row === 'land' ? [x] : []; } catch { return []; } })
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

const has = (root, sha) => !!sha && git(['cat-file', '-e', `${sha}^{commit}`], { cwd: root, allowFail: true }).code === 0;
const anc = (root, a, b) => git(['merge-base', '--is-ancestor', a, b], { cwd: root, allowFail: true }).code === 0;

// A job branch's pull requests: GitHub's list (prs, null when unread), with each land of module id
// whose head the branch holds (tip: the branch's commit) that GitHub left out, as a merged pull
// request marked hidden: { number, state: 'closed', merged_at, head: { sha }, merge_commit_sha, user:
// null, hidden: true }. GitHub unread stays unread (null): a land row never stands for the list.
export function landedFrom(root, sb, id, tip, prs) {
  if (!Array.isArray(prs)) return prs;
  const seen = new Set(prs.map((p) => p.number));
  const hidden = landRows(root, sb).filter((l) => l.module === id && !seen.has(l.pr) && has(root, l.head) && has(root, tip) && anc(root, l.head, tip))
    .map((l) => ({ number: l.pr, state: 'closed', merged_at: l.at, head: { sha: l.head }, merge_commit_sha: l.merge, user: null, hidden: true }));
  return [...prs, ...hidden];
}

// A landed pull request's receipt from git, for one whose comments GitHub no longer serves: the
// newest complete row of module id at its head, its sha the commit that wrote it (job complete's
// COMPLETE commit, "job complete <id> (attempt <n>)"). null when the head holds none.
export function receiptAt(root, id, head) {
  if (!has(root, head)) return null;
  const done = rowsAt(root, head, id).filter((r) => r.row === 'attempt' && r.event === 'complete' && r.receipt?.module === id).at(-1);
  if (!done) return null;
  const subject = `job complete ${id} (attempt ${done.receipt.attempt})`;
  const sha = git(['log', '-1', '--format=%H', '--fixed-strings', `--grep=${subject}`, head], { cwd: root, allowFail: true }).stdout.trim();
  if (!sha || git(['log', '-1', '--format=%s', sha], { cwd: root }) !== subject) return null;
  return { ...done.receipt, sha };
}
