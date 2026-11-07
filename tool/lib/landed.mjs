// What the process recorded of a landed pull request, for when GitHub no longer serves it (the
// coordinator, 7 Nov: PRs opened by the suspended account read 404, are left out of GitHub's lists,
// and their comments with them; C13 and PR 735 credited such lands at the layer gate). Every reader
// of a job branch's landed pull requests reads them here: GitHub's answer where it serves it, with
// the state branch's land rows for those it no longer lists.
import { FLOW_DIR } from './layerbase.mjs';
import { startBranch } from './ledger.mjs';
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
// The job branch a land came from: its row's own (written since 7 Nov), else the start branch its head's
// ledger names (the job branch's own record at the land's head). Never another branch's land of the
// module that this one holds by a sync or a cut (cold review).
const branchOf = (root, l) => l.branch || (has(root, l.head) ? startBranch(rowsAt(root, l.head, l.module), l.module) : null);

// A job branch's pull requests: GitHub's list (prs, null when unread), with each land of module id
// from that branch whose head tip holds (the branch, or the layer it landed in once the branch is
// gone) that GitHub left out, as a merged pull request marked hidden: { number, state: 'closed',
// merged_at, head: { sha }, merge_commit_sha, user: null, hidden: true }. GitHub unread stays
// unread (null): a land row never stands for the list.
export function landedFrom(root, sb, id, branch, tip, prs) {
  if (!Array.isArray(prs)) return prs;
  const seen = new Set(prs.map((p) => p.number));
  const hidden = landRows(root, sb).filter((l) => l.module === id && !seen.has(l.pr) && has(root, l.head) && has(root, tip) && anc(root, l.head, tip) && branchOf(root, l) === branch)
    .map((l) => ({ number: l.pr, state: 'closed', merged_at: l.at, head: { sha: l.head }, merge_commit_sha: l.merge, user: null, hidden: true }));
  return [...prs, ...hidden];
}
