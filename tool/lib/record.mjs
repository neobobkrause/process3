// Record check (REC-10, your direction 1 Nov). Every commit in a range, merges included, is
// checked for files over the size limit, writes under transient paths, and changes to the
// approvals or to the settings under .claude/ that did not come from the owner's own commit
// through GitHub's website. The
// config it uses is read from the base, never from the change it judges.
import { basename } from 'node:path';
import { checkLedger } from './ledger.mjs';
import { CONFIG_FILE, exists, gh, git, loadConfig, repoSlug, underPath } from './util.mjs';

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

// null only when the file is absent; a file that is there but cannot be read is an error.
const show = (root, rev, file) => (exists(root, rev, file) ? git(['show', `${rev}:${file}`], { cwd: root }) : null);
// A path's tree entry at a commit, mode and object together, so a mode-only change counts.
const entryOf = (root, rev, file) => {
  const out = git(['ls-tree', '-z', rev, '--', file], { cwd: root });
  const hit = out.split('\0').find((l) => l.endsWith(`\t${file}`));
  return hit ? hit.split('\t')[0].replace(/ \w+ /, ' ') : null;
};

// Plain instruction files: CLAUDE.md and CLAUDE.local.md anywhere, and .claude/rules/**/*.md.
// Anything else in a .claude directory (any letter case, at any depth, or .claude itself as
// a link or a pin) and .mcp.json anywhere is the owner's: settings, hooks, agents, skills,
// commands, output styles, any file (confirming review of PR 16). Like the approvals, only
// the owner's own website commit may change them. A deny rule cannot stop an edit made
// through the shell; this check holds every route (Bob's standing rule: sessions never
// change permission settings).
// On process3 itself the required record check runs from main's copy of the tool
// (pull_request_target runs from the default branch), so these rules judge process3's own
// pull requests only once the tranche reaches main.
// CLAUDE.md and CLAUDE.local.md count as instruction files only outside any .claude directory
// or directly in one; inside .claude/agents, skills or any subdirectory they are the owner's
// (third confirming review of PR 16).
const isInstructionFile = (f) => {
  const segs = f.split('/');
  const name = ['CLAUDE.md', 'CLAUDE.local.md'].includes(segs.at(-1))
    && segs.every((x, i) => x.toLowerCase() !== '.claude' || i === segs.length - 2);
  return name || /(^|\/)\.claude\/rules\/(.+\/)?[^/]+\.md$/i.test(f);
};
const isOwnerSetting = (f) => !isInstructionFile(f)
  && (f.split('/').some((seg) => seg.toLowerCase() === '.claude') || basename(f).toLowerCase() === '.mcp.json');
const PROTECTED = ['.github/workflows/', '.process', CONFIG_FILE, 'tool/', 'schema/'];
// Files the checks themselves stand on: removing one is a finding, not a notice.
const KEEP = ['tool/p3.mjs', '.process', '.github/workflows/ci.yml', '.github/workflows/record-pr.yml', '.github/workflows/process-gate.yml', '.github/workflows/process-record.yml'];

// Files a commit introduces: against its parent, or, for a merge, what the merge itself
// wrote. An ordinary file in a merge is carried when it equals any parent's. A guarded file
// (the owner's settings, instruction files, the approvals file, the config, the files the
// checks stand on) is carried only when it equals its version at the start of the checked
// range (the base), or a parent's version that a commit inside the range set, and so was
// judged there; this holds for every parent, the first included, so a merge that keeps an
// old copy from either side is judged as its own change (confirming reviews of PR 16).
// Paths read with -z, so any name is safe.
function introduced(root, sha, parents, { guarded = () => false, judged = () => false, base } = {}) {
  const names = (args) => git(['diff-tree', '-r', '-z', '--no-commit-id', '--name-only', '--no-renames', ...args], { cwd: root }).split('\0').filter(Boolean);
  if (parents.length <= 1) return names([...(parents.length ? [] : ['--root']), sha]);
  const fromBase = base ? names([base, sha]).filter(guarded) : [];
  return [...new Set([...names([parents[0], sha]), ...fromBase])].filter((f) => {
    const e = entryOf(root, sha, f);
    if (!guarded(f)) return !parents.some((p) => entryOf(root, p, f) === e);
    if (e === (base ? entryOf(root, base, f) : null)) return false;
    return !parents.some((p) => entryOf(root, p, f) === e && judged(p, f));
  });
}

// record_since (decided by Bob, 2 Nov 2026): a product whose history predates Process3 names
// the last commit before the process arrived; that commit and everything before it are not
// checked. It is a key that weakens a check, so, like the approvals, only the owner's own
// website commit may set or change it (recordCheck). It is used only while the base has no
// config yet (before the tranche first reaches main): once the base has one, the base itself
// already leaves out the old history, so record_since is ignored and cannot be abused. And it
// must lie before every commit in the head's history that adds the config, so it can never
// hide a commit made under the process.
export function recordSince(root, { base, head = 'HEAD' } = {}) {
  const has = (ref) => exists(root, ref, CONFIG_FILE);
  if (base && has(base)) return { since: null };
  const since = loadConfig(root, head).record_since;
  if (!since) return { since: null };
  const bad = (why) => ({ since: null, finding: { check: 'config', file: CONFIG_FILE, line: 1, message: `record_since ${String(since).slice(0, 10)} is not used: ${why}` } });
  const r = git(['rev-parse', '-q', '--verify', `${since}^{commit}`], { cwd: root, allowFail: true });
  if (r.code !== 0) return bad('no such commit here');
  const sha = r.stdout.trim();
  const adders = git(['log', '--full-history', '--diff-filter=A', '--format=%H', head, '--', CONFIG_FILE], { cwd: root }).split('\n').filter(Boolean);
  if (!adders.length) return bad(`the head has no commit that adds ${CONFIG_FILE}`);
  const late = adders.find((a) => a === sha || git(['merge-base', '--is-ancestor', sha, a], { cwd: root, allowFail: true }).code !== 0);
  if (late) return bad(`it is not before ${late.slice(0, 10)}, a commit that adds the process config`);
  return { since: sha, from: 'head' };
}

// In a partial clone, fetch every file the range needs in one request rather than one at a
// time as each is read. Best effort: a file still missing is fetched, or fails, when read.
function prefetch(root, range) {
  if (git(['config', '--get', 'remote.origin.promisor'], { cwd: root, allowFail: true }).stdout.trim() !== 'true') return;
  const missing = git(['rev-list', '--objects', '--missing=print', ...range], { cwd: root, allowFail: true }).stdout
    .split('\n').filter((l) => l.startsWith('?')).map((l) => l.slice(1));
  if (!missing.length) return;
  git(['-c', 'fetch.negotiationAlgorithm=noop', 'fetch', '-q', '--no-tags', '--no-write-fetch-head', '--recurse-submodules=no', '--filter=blob:none', '--stdin', 'origin'],
    { cwd: root, allowFail: true, input: missing.join('\n') + '\n' });
}

export function recordCheck(root, cfg, { base, head = 'HEAD', branch, ledgerBase, lookup, since } = {}) {
  const findings = [];
  const notices = [];
  const verified = new Map();
  const ownerCommit = (sha) => {
    if (!verified.has(sha)) verified.set(sha, webCommitByOwner(root, sha, cfg.approvals.owner, lookup));
    return verified.get(sha);
  };
  const range = [head, ...(base ? [`^${base}`] : []), ...(since ? [`^${since}`] : [])];
  const commits = git(['rev-list', ...range], { cwd: root }).split('\n').filter(Boolean);
  prefetch(root, range);
  const { file: afile, heading } = cfg.approvals;
  const inRange = new Set(commits);
  const guarded = (f) => isOwnerSetting(f) || isInstructionFile(f) || f === afile || f === CONFIG_FILE || KEEP.includes(f);
  // Another parent's version was judged when the last commit that set it lies in the range.
  const judged = (p, f) => inRange.has(git(['log', '-1', '--format=%H', p, '--', f], { cwd: root }).trim());
  for (const sha of commits) {
    const short = sha.slice(0, 10);
    try {
      const all = git(['rev-list', '--parents', '-n', '1', sha], { cwd: root }).split(' ').slice(1);
      const files = introduced(root, sha, all, { guarded, judged, base });
      // The versions a merge's guarded file is compared with: the base's, and any parent's that
      // was judged inside the range.
      const parentsFor = (f) => (all.length > 1 ? [...(base ? [base] : []), ...all.filter((p) => judged(p, f))] : all);
      const parents = all;
      const approvalsTouched = [];
      for (const file of files) {
        const ls = git(['ls-tree', '-z', sha, '--', file], { cwd: root });
        if (PROTECTED.some((p) => underPath(file, p))) {
          notices.push({ check: 'protected', file, line: 1, message: `commit ${short} changes a protected path; it needs the fresh-context review (rule 5)` });
        }
        if (isOwnerSetting(file)) approvalsTouched.push({ file, line: 1, check: 'settings', what: `${file}, which is the owner's setting,` });
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
          const was = parents.length ? parentsFor(file).map((p) => approvalsBlock(show(root, p, file), heading)) : [''];
          if (!was.includes(now)) approvalsTouched.push({ file, line: Math.max(1, text.split('\n').findIndex((l) => l.trim() === heading.trim()) + 1) });
        }
        if (isInstructionFile(file)) {
          const before = parents.length ? parentsFor(file).map((p) => show(root, p, file) || '') : [''];
          const added = (show(root, sha, file) || '').split('\n').filter((l) => APPROVAL_WORDS.test(l) && !before.some((b) => b.split('\n').includes(l)));
          if (added.length && !approvalsTouched.some((t2) => t2.file === file)) approvalsTouched.push({ file, line: 1 });
        } else if (file === CONFIG_FILE) {
          const ap = (t2) => { try { const c = JSON.parse(t2 || '{}'); return JSON.stringify([c.approvals ?? null, c.record_since ?? null]); } catch { return 'unreadable'; } };
          const now = ap(show(root, sha, file));
          const was = parents.length ? parentsFor(file).map((p) => ap(show(root, p, file))) : [ap(null)];
          if (!was.includes(now)) approvalsTouched.push({ file, line: 1, what: 'the approvals or record_since' });
        }
      }
      for (const t2 of approvalsTouched) {
        const v = ownerCommit(sha);
        if (!v.ok) findings.push({ check: t2.check || 'approvals', file: t2.file, line: t2.line, message: `commit ${short} changes ${t2.what || 'the approvals'} but is not ${cfg.approvals.owner}'s own commit through GitHub's website (${v.why})` });
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
