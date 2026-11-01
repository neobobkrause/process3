// Record check (REC-10, your direction 1 Nov): every commit in a range is checked for
// files over the size limit, writes under transient paths, and changes to the approvals
// block that did not come from the owner's own commit through GitHub's website.
import { checkLedger } from './ledger.mjs';
import { gh, git, repoSlug } from './util.mjs';

// The approvals block: from its heading to the next "## " heading or the end of the file.
export function approvalsBlock(text, heading) {
  if (!text) return '';
  const lines = text.split('\n');
  const i = lines.findIndex((l) => l.trim() === heading.trim());
  if (i < 0) return '';
  let j = i + 1;
  while (j < lines.length && !lines[j].startsWith('## ')) j++;
  return lines.slice(i, j).join('\n').trim();
}

const showFile = (root, rev, file) => {
  const r = git(['show', `${rev}:${file}`], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout : '';
};

// Did this commit come from the owner through GitHub's website? GitHub signs web edits as
// web-flow; the author must be the owner. Injectable for tests.
export function webCommitByOwner(root, sha, owner, lookup = gh) {
  let slug;
  try { slug = repoSlug(root); } catch { slug = '(no origin)'; }
  const c = lookup(['api', `repos/${slug}/commits/${sha}`], { allowFail: true });
  if (!c || typeof c !== 'object') return { ok: false, why: 'could not read the commit from GitHub' };
  const ok = c.committer?.login === 'web-flow' && c.commit?.verification?.verified === true && c.author?.login === owner;
  return ok ? { ok } : {
    ok,
    why: `author ${c.author?.login ?? '?'}, committer ${c.committer?.login ?? '?'}, verified ${c.commit?.verification?.verified ?? '?'}`,
  };
}

export function recordCheck(root, cfg, { base, head = 'HEAD', lookup } = {}) {
  const findings = [];
  const range = base ? `${base}..${head}` : head;
  const commits = git(['rev-list', '--no-merges', range], { cwd: root }).split('\n').filter(Boolean);
  for (const sha of commits) {
    const short = sha.slice(0, 10);
    const parents = git(['rev-list', '--parents', '-n', '1', sha], { cwd: root }).split(' ').slice(1);
    const parent = parents[0];
    const diff = git(['diff-tree', '-r', '--no-commit-id', '--name-status', '--no-renames', ...(parent ? [] : ['--root']), sha], { cwd: root });
    for (const line of diff.split('\n').filter(Boolean)) {
      const [st, file] = line.split('\t');
      if (st === 'D') continue;
      const size = Number(git(['cat-file', '-s', `${sha}:${file}`], { cwd: root }));
      if (size > cfg.max_file_bytes) {
        findings.push({ check: 'size', file, line: 1, message: `commit ${short} writes ${size} bytes, over the ${cfg.max_file_bytes}-byte limit` });
      }
      if (cfg.transient.some((t) => file.startsWith(t))) {
        findings.push({ check: 'path', file, line: 1, message: `commit ${short} writes under transient path ${cfg.transient.find((t) => file.startsWith(t))}` });
      }
    }
    const { file, heading, owner } = cfg.approvals;
    const now = approvalsBlock(showFile(root, sha, file), heading);
    const was = parent ? approvalsBlock(showFile(root, parent, file), heading) : '';
    if (now !== was) {
      const v = webCommitByOwner(root, sha, owner, lookup);
      if (!v.ok) findings.push({ check: 'approvals', file, line: 1, message: `commit ${short} changes the approvals block but is not ${owner}'s own commit through GitHub's website (${v.why})` });
    }
  }
  findings.push(...checkLedger(root, { ref: head === 'HEAD' ? undefined : head }));
  return { commits: commits.length, findings };
}
