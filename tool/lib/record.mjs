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
// token look the same. Injectable for tests. slug: the repository to ask about, when the
// caller knows it; else the one root's origin names.
export function webCommitByOwner(root, sha, owner, lookup = gh, slug) {
  if (!slug) { try { slug = repoSlug(root); } catch { slug = '(no origin)'; } }
  const c = lookup(['api', `repos/${slug}/commits/${sha}`], { allowFail: true });
  if (!c || typeof c !== 'object') return { ok: false, unread: true, why: 'could not read the commit from GitHub' };
  const ok = c.committer?.login === 'web-flow' && c.commit?.verification?.verified === true && c.author?.login === owner;
  return ok ? { ok } : {
    ok,
    why: `author ${c.author?.login ?? '?'}, committer ${c.committer?.login ?? '?'}, verified ${c.commit?.verification?.verified ?? '?'}`,
  };
}

// null only when the file is absent; a file that is there but cannot be read is an error.
const show = (root, rev, file) => (exists(root, rev, file) ? git(['show', `${rev}:${file}`], { cwd: root }) : null);

// The repository's owner, as GitHub has it (GET /repos/{repo}: owner.login): { login } or
// { login: null, why }. Onboarding sets approvals.owner to it, and while the base has no config
// it is the owner the checks judge by (review follow-ups, 2 Nov). A repository an organization
// owns has no person there whose website commit could count, so it gives no login.
export function ownerOfRepo(r) {
  if (!r || typeof r !== 'object' || !r.owner) return { login: null, why: "the repository's owner could not be read from GitHub" };
  const { login, type } = r.owner;
  if (typeof login !== 'string' || !login) return { login: null, why: "the repository's owner could not be read from GitHub" };
  if (type !== undefined && type !== 'User') return { login: null, why: `the repository is owned by the ${String(type).toLowerCase()} ${login}, not a person; approvals.owner must name the approving person, with Bob's word` };
  return { login };
}
export const repoOwnerOf = (slug, lookup = gh) => ownerOfRepo(slug ? lookup(['api', `repos/${slug}`], { allowFail: true }) : null);
// A repoOwner answer as callers give it: a login, null (unreadable), or { login, why }.
export const ownerAnswer = (v) => (typeof v === 'string' && v ? { login: v }
  : v && typeof v === 'object' && 'login' in v ? (v.login ? { login: v.login } : { login: null, why: v.why || "the repository's owner could not be read from GitHub" })
    : { login: null, why: "the repository's owner could not be read from GitHub" });

// The approvals block's history, read once per run (review follow-ups, 2 Nov). Every commit
// reachable from refs that touches the file and whose block differs from a parent's (or, with
// no parent, is not empty) set the block it holds: an edit, a merge that took one side (the
// owner's website merge of a pull request among them), or a removal, whose block is ''.
// newest(isOwner, within) is the newest of those by committer date (GitHub dates a website
// commit itself) that is the owner's own website commit, and, with within, an ancestor of that
// commit: { sha, block }; { unread: sha } when a newer one could not be read from GitHub, so
// an older one is never taken for the newest; null when there is none.
export function approvalsHistory(root, refs, file, heading) {
  const blobs = new Map();
  const texts = new Map();
  const prime = (revs) => {
    const want = [...new Set(revs)].filter((r) => !blobs.has(r));
    for (let i = 0; i < want.length; i += 2000) {
      const part = want.slice(i, i + 2000);
      const out = git(['cat-file', '--batch-check'], { cwd: root, allowFail: true, input: part.map((r) => `${r}:${file}`).join('\n') + '\n' }).stdout.split('\n');
      part.forEach((r, k) => { const m = (out[k] || '').match(/^([0-9a-f]{40,64}) blob /); blobs.set(r, m ? m[1] : ''); });
    }
  };
  const blockOf = (rev) => {
    prime([rev]);
    const b = blobs.get(rev);
    if (!b) return '';
    if (!texts.has(b)) texts.set(b, approvalsBlock(git(['cat-file', 'blob', b], { cwd: root }), heading));
    return texts.get(b);
  };
  let setters = null;
  const load = () => {
    if (setters) return setters;
    const live = [...new Set(refs.filter(Boolean))].filter((r) => git(['rev-parse', '-q', '--verify', `${r}^{commit}`], { cwd: root, allowFail: true }).code === 0);
    const rows = live.length ? git(['log', '--full-history', '--format=%H %ct %P', ...live, '--', file], { cwd: root, allowFail: true }).stdout
      .split('\n').filter(Boolean).map((l) => { const [sha, at, ...parents] = l.trim().split(' '); return { sha, at: Number(at), parents }; }) : [];
    prime(rows.flatMap((r) => [r.sha, ...r.parents]));
    setters = rows.filter((r) => { const now = blockOf(r.sha); return r.parents.length ? r.parents.some((p) => blockOf(p) !== now) : now !== ''; })
      .map((r) => ({ sha: r.sha, at: r.at, block: blockOf(r.sha) })).sort((a, b) => b.at - a.at);
    return setters;
  };
  const anc = new Map();
  const isAncestor = (a, b) => {
    const k = `${a} ${b}`;
    if (!anc.has(k)) anc.set(k, git(['merge-base', '--is-ancestor', a, b], { cwd: root, allowFail: true }).code === 0);
    return anc.get(k);
  };
  const newest = (isOwner, within) => {
    for (const st of load()) {
      if (within && (st.sha === within || !isAncestor(st.sha, within))) continue;
      const v = isOwner(st.sha);
      if (v?.ok === true) return { sha: st.sha, at: st.at, block: st.block };
      if (v?.unread) return { unread: st.sha };
    }
    return null;
  };
  // Did the owner set this block before top? Asked only to word a refusal.
  const ownerSetEarlier = (isOwner, top, block, within) => load().some((st) => st.at <= top.at && st.sha !== top.sha && st.block === block
    && (!within || isAncestor(st.sha, within)) && isOwner(st.sha)?.ok === true);
  return { blockOf, newest, ownerSetEarlier };
}

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
// website commit may set or change it (recordCheck), with one exception (Bob's word on
// question 16, 2 Nov 2026): any author may set it to the base's commit or an ancestor of it,
// since the base already leaves that history out and so it hides nothing the change brings
// (onboarding). On a later range whose base does not hold it, the commit that set it needs
// the owner's website commit again. It is used only while the base has no
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

// repoOwner: a function giving the repository's owner as GitHub has it (repoOwnerOf: a login,
// null, or { login, why }). When given and the base has no config, it is the owner the check
// judges by, and the one value onboarding may give approvals.owner (review follow-ups, 2 Nov).
// trusted: the branches whose history an owner-set block must come from to count as the newest
// (the brief's "the tranche and main"): by default the base, origin/main and origin/<tranche>,
// so an owner's draft on a side branch never counts.
export function recordCheck(root, cfg, { base, head = 'HEAD', branch, ledgerBase, lookup, since, repoOwner, trusted } = {}) {
  const findings = [];
  const notices = [];
  const verified = new Map();
  const baseHasConfig = Boolean(base) && exists(root, base, CONFIG_FILE);
  let ghOwner;
  const githubOwner = () => (ghOwner === undefined ? (ghOwner = ownerAnswer(repoOwner ? repoOwner() : null)) : ghOwner);
  // While the base has no config, the owner is the repository's, read from GitHub.
  let ownerName = cfg.approvals.owner;
  let ownerWhy = null;
  if (!baseHasConfig && repoOwner) { ownerName = githubOwner().login; ownerWhy = githubOwner().why || null; }
  // record_since names the base or an ancestor of it: a full commit id only, never a ref or
  // a short id, whose meaning could change. With no base there is nothing to compare with.
  const onBase = (v) => typeof v === 'string' && /^([0-9a-f]{40}|[0-9a-f]{64})$/i.test(v) && Boolean(base)
    && git(['rev-parse', '-q', '--verify', `${v}^{commit}`], { cwd: root, allowFail: true }).code === 0
    && git(['merge-base', '--is-ancestor', v, base], { cwd: root, allowFail: true }).code === 0;
  const ownerCommit = (sha) => {
    if (!ownerName) return { ok: false, why: ownerWhy || "the repository's owner could not be read from GitHub" };
    if (!verified.has(sha)) verified.set(sha, webCommitByOwner(root, sha, ownerName, lookup));
    return verified.get(sha);
  };
  const { file: afile, heading } = cfg.approvals;
  const hist = approvalsHistory(root, trusted || [base, 'origin/main', `origin/${cfg.tranche}`], afile, heading);
  const blockOf = hist.blockOf;
  const range = [head, ...(base ? [`^${base}`] : []), ...(since ? [`^${since}`] : [])];
  const commits = git(['rev-list', ...range], { cwd: root }).split('\n').filter(Boolean);
  prefetch(root, range);
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
      // The approvals block (review follow-ups, 2 Nov): a commit whose block differs from a
      // parent's, or from every version already judged, changes it. Such a change is accepted
      // only when the block it leaves is the newest one the owner set through the website, among
      // its own ancestors on the tranche and main, or when it is itself the owner's own website
      // commit. So a merge that puts back an older owner-set block is refused, even when that
      // block is the base's or one parent's; so is one whose newest owner commit cannot be read.
      if (files.includes(afile) || all.length > 1) {
        const now = blockOf(sha);
        const mine = all.map(blockOf);
        const was = all.length ? parentsFor(afile).map(blockOf) : [''];
        const changed = all.length ? (!was.includes(now) || mine.some((b) => b !== now)) : now !== '';
        const top = changed ? hist.newest(ownerCommit, sha) : null;
        if (changed && !(top?.block === now && !top.unread) && !ownerCommit(sha).ok) {
          const text = show(root, sha, afile) || '';
          const line = Math.max(1, text.split('\n').findIndex((l) => l.trim() === heading.trim()) + 1);
          const who = ownerName ?? 'the repository owner';
          let message;
          if (top?.unread) message = `commit ${short} changes the approvals, and commit ${top.unread.slice(0, 10)} could not be read from GitHub, so the newest block ${who} set through GitHub's website cannot be told`;
          else if (top && hist.ownerSetEarlier(ownerCommit, top, now, sha)) message = `commit ${short} puts back an older approvals block; only the newest block ${who} set through GitHub's website (commit ${top.sha.slice(0, 10)}) may be carried, or a new website commit of ${who}'s`;
          else message = `commit ${short} changes the approvals but is not ${who}'s own commit through GitHub's website (${ownerCommit(sha).why})${top ? `, and its block is not the newest one ${who} set there (commit ${top.sha.slice(0, 10)})` : ''}`;
          approvalsTouched.push({ file: afile, line, message });
        }
      }
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
        if (isInstructionFile(file)) {
          const before = parents.length ? parentsFor(file).map((p) => show(root, p, file) || '') : [''];
          const added = (show(root, sha, file) || '').split('\n').filter((l) => APPROVAL_WORDS.test(l) && !before.some((b) => b.split('\n').includes(l)));
          if (added.length && !approvalsTouched.some((t2) => t2.file === file)) approvalsTouched.push({ file, line: 1 });
        } else if (file === CONFIG_FILE) {
          // approvals.owner apart from the rest of the approvals key, so onboarding may set it.
          const ap = (t2) => {
            try {
              const c = JSON.parse(t2 || '{}');
              const { owner = null, ...rest } = c.approvals ?? {};
              return { approvals: c.approvals === undefined || c.approvals === null ? '{}' : JSON.stringify(rest), owner, since: c.record_since ?? null };
            } catch { return { approvals: 'unreadable', owner: 'unreadable', since: 'unreadable' }; }
          };
          const now = ap(show(root, sha, file));
          const was = parents.length ? parentsFor(file).map((p) => ap(show(root, p, file))) : [ap(null)];
          // The approvals must equal a version already judged; so must record_since, unless it
          // names the base or an ancestor of it, which hides nothing the change brings. And so must
          // approvals.owner, except that while the base has no config (onboarding) it may be set to
          // the repository's owner as GitHub has it; after that only the owner's website commit
          // changes it (review follow-ups, 2 Nov).
          const onboardOwner = !baseHasConfig && typeof now.owner === 'string' && now.owner !== '' && now.owner === githubOwner().login;
          const same = (w) => w.approvals === now.approvals
            && (JSON.stringify(w.owner) === JSON.stringify(now.owner) || onboardOwner)
            && (JSON.stringify(w.since) === JSON.stringify(now.since) || onBase(now.since));
          if (!was.some(same)) approvalsTouched.push({ file, line: 1, what: 'the approvals or record_since' });
        }
      }
      for (const t2 of approvalsTouched) {
        if (t2.message) { findings.push({ check: 'approvals', file: t2.file, line: t2.line, message: t2.message }); continue; }
        const v = ownerCommit(sha);
        if (!v.ok) findings.push({ check: t2.check || 'approvals', file: t2.file, line: t2.line, message: `commit ${short} changes ${t2.what || 'the approvals'} but is not ${ownerName ?? "the repository owner"}'s own commit through GitHub's website (${v.why})` });
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
