// Record check (REC-10, your direction 1 Nov). Every commit in a range, merges included, is
// checked for files over the size limit, writes under transient paths, and changes to the
// approvals that did not come from the owner's own commit through GitHub's website. The
// config it uses is read from the base, never from the change it judges.
import { basename } from 'node:path';
import { checkLedger } from './ledger.mjs';
import { CONFIG_FILE, gh, git, repoSlug, underPath } from './util.mjs';

const HEADING = /^#{1,6}\s.*approv/i;
const APPROVAL_WORDS = /approv/i;

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

// Did this commit come from the owner through GitHub's website? GitHub signs web edits as
// web-flow; the author must be the owner. Not verifiable: API commits made with the owner's
// token look the same. Injectable for tests.
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

const show = (root, rev, file) => {
  const r = git(['show', `${rev}:${file}`], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout : null;
};
const blobOf = (root, rev, file) => {
  const r = git(['rev-parse', '-q', '--verify', `${rev}:${file}`], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout.trim() : null;
};

// Files a commit introduces: against its parent, or for a merge, the files whose content
// matches no parent (what the merge itself wrote). Paths read with -z, so any name is safe.
function introduced(root, sha, parents) {
  if (parents.length <= 1) {
    const out = git(['diff-tree', '-r', '-z', '--no-commit-id', '--name-only', '--no-renames', ...(parents.length ? [] : ['--root']), sha], { cwd: root });
    return out.split('\0').filter(Boolean);
  }
  const out = git(['diff-tree', '-r', '-z', '--no-commit-id', '--name-only', '--no-renames', parents[0], sha], { cwd: root });
  return out.split('\0').filter(Boolean).filter((f) => {
    const b = blobOf(root, sha, f);
    return !parents.some((p) => blobOf(root, p, f) === b);
  });
}

const isInstructionFile = (f) => ['CLAUDE.md', 'CLAUDE.local.md'].includes(basename(f)) || (f.startsWith('.claude/') && f.endsWith('.md'));
const PROTECTED = ['.github/workflows/', '.claude/settings.json', '.process', CONFIG_FILE, 'tool/', 'schema/'];
// Files the checks themselves stand on: removing one is a finding, not a notice.
const KEEP = ['tool/p3.mjs', '.process', '.github/workflows/ci.yml', '.github/workflows/record-pr.yml', '.github/workflows/process-gate.yml', '.github/workflows/process-record.yml'];

export function recordCheck(root, cfg, { base, head = 'HEAD', branch, ledgerBase, lookup } = {}) {
  const findings = [];
  const notices = [];
  const verified = new Map();
  const ownerCommit = (sha) => {
    if (!verified.has(sha)) verified.set(sha, webCommitByOwner(root, sha, cfg.approvals.owner, lookup));
    return verified.get(sha);
  };
  const range = base ? `${base}..${head}` : head;
  const commits = git(['rev-list', range], { cwd: root }).split('\n').filter(Boolean);
  const { file: afile, heading } = cfg.approvals;
  for (const sha of commits) {
    const short = sha.slice(0, 10);
    try {
      const parents = git(['rev-list', '--parents', '-n', '1', sha], { cwd: root }).split(' ').slice(1);
      const files = introduced(root, sha, parents);
      const approvalsTouched = [];
      for (const file of files) {
        const ls = git(['ls-tree', '-z', sha, '--', file], { cwd: root });
        if (PROTECTED.some((p) => underPath(file, p))) {
          notices.push({ check: 'protected', file, line: 1, message: `commit ${short} changes a protected path; it needs the fresh-context review (rule 5)` });
        }
        if (!ls) { // deleted
          if (KEEP.includes(file)) findings.push({ check: 'path', file, line: 1, message: `commit ${short} removes ${file}, which the checks stand on` });
          continue;
        }
        const [mode, , blob] = ls.split('\t')[0].split(' ');
        if (mode === '160000') continue; // a submodule pin has no blob
        const size = Number(git(['cat-file', '-s', blob], { cwd: root }));
        if (size > cfg.max_file_bytes) {
          findings.push({ check: 'size', file, line: 1, message: `commit ${short} writes ${size} bytes, over the ${cfg.max_file_bytes}-byte limit` });
        }
        const t = cfg.transient.find((p) => underPath(file, p));
        if (t) findings.push({ check: 'path', file, line: 1, message: `commit ${short} writes under transient path ${t}` });
        if (file === afile) {
          const text = show(root, sha, file) || '';
          const now = approvalsBlock(text, heading);
          const was = parents.length ? parents.map((p) => approvalsBlock(show(root, p, file), heading)) : [''];
          if (!was.includes(now)) approvalsTouched.push({ file, line: Math.max(1, text.split('\n').findIndex((l) => l.trim() === heading.trim()) + 1) });
        }
        if (isInstructionFile(file)) {
          const before = parents.length ? parents.map((p) => show(root, p, file) || '') : [''];
          const added = (show(root, sha, file) || '').split('\n').filter((l) => APPROVAL_WORDS.test(l) && !before.some((b) => b.split('\n').includes(l)));
          if (added.length && !approvalsTouched.some((t2) => t2.file === file)) approvalsTouched.push({ file, line: 1 });
        } else if (file === CONFIG_FILE) {
          const ap = (t2) => { try { return JSON.stringify(JSON.parse(t2 || '{}').approvals ?? null); } catch { return 'unreadable'; } };
          const now = ap(show(root, sha, file));
          const was = parents.length ? parents.map((p) => ap(show(root, p, file))) : [ap(null)];
          if (!was.includes(now)) approvalsTouched.push({ file, line: 1 });
        }
      }
      for (const t2 of approvalsTouched) {
        const v = ownerCommit(sha);
        if (!v.ok) findings.push({ check: 'approvals', file: t2.file, line: t2.line, message: `commit ${short} changes the approvals but is not ${cfg.approvals.owner}'s own commit through GitHub's website (${v.why})` });
      }
    } catch (e) {
      findings.push({ check: 'record', file: '(commit)', line: 1, message: `commit ${short} could not be checked: ${e.message}` });
    }
  }
  // At the head: one approvals heading only, and the ledger (with the job rule on a job branch).
  const headText = show(root, head, afile) || '';
  const headings = headText.split('\n').map((l, i) => [l, i + 1]).filter(([l]) => HEADING.test(l.trim()));
  if (headings.length > 1) {
    for (const [, line] of headings.slice(1)) findings.push({ check: 'approvals', file: afile, line, message: 'a second approvals heading; only one block may exist' });
  }
  findings.push(...checkLedger(root, { ref: head, base: ledgerBase, branch }));
  return { commits: commits.length, findings, notices };
}
