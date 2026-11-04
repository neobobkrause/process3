// Record check (REC-10, your direction 1 Nov). Every commit in a range, merges included, is
// checked for files over the size limit, writes under transient paths, and changes to the
// approvals or to the settings under .claude/ that did not come from the owner's own commit
// through GitHub's website. The config it uses is read from the base, never from the change it
// judges.
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { checkLedger } from './ledger.mjs';
import { METRICS_DIR, metricsFile } from './metrics.mjs';
import { CONFIG_FILE, DEFAULTS, exists, gh, git, loadConfig, parseJSON, repoSlug, underPath } from './util.mjs';

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
const GITHUB_COMMITTER = 'noreply@github.com';

// The owner-set block (build J, 3 Nov): for each ref, one git log of the approvals file finds
// the commit that set the block its tip holds (the newest whose block is the tip's and no
// parent's). Of the refs whose setter is the owner's own website commit, the newest setter by
// committer date gives the block: { ref, sha, at, block }, or null when there is none. GitHub
// is asked only about commits GitHub committed (a website commit always is). In a shallow clone
// the setup check passes history (the file's log, "%H %ct %ce %P" lines, from GitHub) and need
// (fetches a commit it reads by its id), so no history is deepened.
export function ownerBlock(root, refs, file, heading, isOwner, { history, need } = {}) {
  const memo = new Map();
  const blockOf = (rev) => {
    if (!memo.has(rev)) { need?.(rev); memo.set(rev, approvalsBlock(show(root, rev, file), heading)); }
    return memo.get(rev);
  };
  let best = null;
  for (const ref of refs) {
    const r = history ? history(ref) : git(['log', '--format=%H %ct %ce %P', ref, '--', file], { cwd: root, allowFail: true });
    if (r.code !== 0) continue;
    const tip = blockOf(ref);
    for (const l of r.stdout.split('\n').filter(Boolean)) {
      const [sha, at, ce, ...parents] = l.split(' ');
      if (blockOf(sha) !== tip || parents.some((p) => blockOf(p) === tip)) continue;
      if (ce === GITHUB_COMMITTER && isOwner(sha)?.ok === true && (!best || Number(at) > best.at)) best = { ref, sha, at: Number(at), block: tip };
      break;
    }
  }
  return best;
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

// Take-in scope (the coordinator's rule, 4 Nov 2026, copy PR 86): a job started with
// `job start <id> --take-in` merged earlier work made before Process3 into the tranche; its
// commits before the take-in start commit are earlier work, already judged as a whole by the
// take-in (every file it changes against the tranche within the module's paths, else refused),
// and they may predate the process files and the approvals (copy, 4 Nov: ten such merges gave 70
// findings no job can clear without rewriting history). So the record check leaves out the
// commits reachable from the tip the start row records (take_in.tip); the take-in start commit
// and everything after it are judged as before, and the gate's ownership check still judges the
// net change. The row is the job's own, so the tip is used only when it is what a take-in
// writes: a full commit id; the first parent of a commit in the range that adds a start row
// naming it; and no commit it leaves out writes the job's metrics file, so no job start, and
// nothing made after one, can be hidden behind a later row. Otherwise it is a finding and
// nothing is left out. Only a row the range adds is judged so: one the base already holds was
// judged where it landed, and gives no finding while not honouring it leaves nothing of the range
// out (copy, 4 Nov, bundler and registers). Where it would, it is judged by the same checks as a
// row the range adds, and honoured only if a commit in the range is its take-in (in a whole
// history that commit cannot lie under the base: the tip and its history would lie there too).
// Not honouring a row never hides a commit. On a branch other than job/<id> every module's rows
// are read.
export function takenIn(root, { base, head = 'HEAD', id } = {}) {
  const out = { tips: [], findings: [] };
  // On job/<id>, that job's rows; on any other branch (the tranche, its pull request into main),
  // every module's, since the merge tool merges a job with its history (review 1 of PR 86).
  const ids = id !== undefined ? (/^[a-z0-9-]+$/.test(String(id)) ? [String(id)] : [])
    : git(['ls-tree', '-z', '--name-only', `${head}:${METRICS_DIR}`], { cwd: root, allowFail: true }).stdout.split('\0')
      .filter((n) => /^[a-z0-9-]+\.jsonl$/.test(n)).map((n) => n.slice(0, -'.jsonl'.length));
  const not = [...(base ? [`^${base}`] : [])];
  let range;
  const seen = new Set();
  for (const one of ids) {
    const file = metricsFile(one);
    const rowsAt = (rev) => (show(root, rev, file) || '').split('\n').flatMap((l) => { try { const r = JSON.parse(l); return r && typeof r === 'object' ? [r] : []; } catch { return []; } });
    const names = (rev, tip) => rowsAt(rev).some((r) => r.event === 'start' && r.take_in?.tip === tip);
    const claimed = [...new Set(rowsAt(head).filter((r) => r.event === 'start' && r.take_in && 'tip' in r.take_in).map((r) => r.take_in.tip))];
    for (const tip of claimed) {
      const bad = (why) => out.findings.push({ check: 'record', file, line: 1, message: `the take-in tip ${String(tip).slice(0, 10)} is not used to leave out earlier work: ${why}` });
      const full = typeof tip === 'string' && /^([0-9a-f]{40}|[0-9a-f]{64})$/.test(tip);
      const here = full && git(['rev-parse', '-q', '--verify', `${tip}^{commit}`], { cwd: root, allowFail: true }).code === 0;
      // A row the base already holds came with an earlier attempt, a merge of the tranche or a
      // job sync, and was judged where it landed (copy, 4 Nov: bundler's attempt 5 and registers
      // met attempt 1's rows, their take-in commits hundreds of commits below the base; the
      // session's clone was shallow, its base history cut above them, so the tip read as new and
      // its adder as missing from the range). Not honouring it leaves nothing out, so it gives no
      // finding, unless the tip's history holds commits of this range that it would leave out:
      // then it is judged below by the same checks as a row the range adds. Counted against the
      // head, so a shallow clone, whose base history is cut, does not count the tip's own history
      // as the range's.
      if (base && names(base, tip)) {
        if (!here) continue;
        const reach = (...extra) => Number(git(['rev-list', '--count', tip, ...not, ...extra], { cwd: root }));
        if (reach() === reach(`^${head}`)) continue;
      }
      if (!full) { bad('it is not a full commit id'); continue; }
      if (!here) { bad('no such commit here'); continue; }
      if (git(['rev-list', '--count', tip, ...not], { cwd: root }) === '0') continue; // already in the base: nothing to leave out
      range ||= git(['rev-list', '--parents', head, ...not], { cwd: root }).split('\n').filter(Boolean).map((l) => l.split(' '));
      if (!range.some(([c, first]) => first === tip && names(c, tip) && !names(tip, tip))) { bad('no commit in the range has it as its first parent and adds the start row naming it'); continue; }
      // Any module's metrics: every job start writes its own, so no job's work, this one's or
      // another's not yet on the base, is left out.
      const wrote = git(['log', '--full-history', '-m', '--format=%H', tip, ...not, '--', METRICS_DIR], { cwd: root }).split('\n').filter(Boolean);
      if (wrote.length) { bad(`commit ${wrote[0].slice(0, 10)}, which it would leave out, writes under ${METRICS_DIR}; only work from before Process3 is left out`); continue; }
      if (!seen.has(tip)) { seen.add(tip); out.tips.push(tip); }
    }
  }
  return out;
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

// The commits a shallow clone's history is cut at (empty in a full clone).
function shallowCuts(root) {
  const f = git(['rev-parse', '--git-path', 'shallow'], { cwd: root, allowFail: true }).stdout.trim();
  try { return new Set(readFileSync(resolve(root, f), 'utf8').split('\n').filter(Boolean)); } catch { return new Set(); }
}

// trusted: the refs whose owner-set block a commit may carry (ownerBlock), beside the base: by
// default origin/main and origin/<tranche>.
// takenIn: the take-in tips (takenIn's tips) whose history is left out.
export function recordCheck(root, cfg, { base, head = 'HEAD', branch, ledgerBase, lookup, since, takenIn: earlier = [], trusted } = {}) {
  const findings = [];
  const notices = [];
  const verified = new Map();
  const ownerName = cfg.approvals.owner;
  // record_since names the base or an ancestor of it: a full commit id only, never a ref or
  // a short id, whose meaning could change. With no base there is nothing to compare with.
  const onBase = (v) => typeof v === 'string' && /^([0-9a-f]{40}|[0-9a-f]{64})$/i.test(v) && Boolean(base)
    && git(['rev-parse', '-q', '--verify', `${v}^{commit}`], { cwd: root, allowFail: true }).code === 0
    && git(['merge-base', '--is-ancestor', v, base], { cwd: root, allowFail: true }).code === 0;
  const ownerCommit = (sha) => {
    if (!verified.has(sha)) verified.set(sha, webCommitByOwner(root, sha, ownerName, lookup));
    return verified.get(sha);
  };
  const { file: afile, heading } = cfg.approvals;
  const refs = [base, ...(trusted || ['origin/main', `origin/${cfg.tranche}`])].filter((x) => x && git(['rev-parse', '-q', '--verify', `${x}^{commit}`], { cwd: root, allowFail: true }).code === 0);
  const anc = (a, b) => git(['merge-base', '--is-ancestor', a, b], { cwd: root, allowFail: true }).code === 0;
  // A commit already on main or the tranche (a ref that does not hold the head) was judged when
  // it landed there; its block is not judged again (a release merge brought back from main).
  const landedOn = refs.filter((r) => r !== base && !anc(head, r));
  const landed = (sha) => landedOn.some((r) => anc(sha, r));
  let top;
  const ownerSet = () => (top === undefined ? (top = ownerBlock(root, refs, afile, heading, ownerCommit)) : top);
  const blocks = new Map();
  const blockOf = (rev) => {
    if (!blocks.has(rev)) blocks.set(rev, approvalsBlock(show(root, rev, afile), heading));
    return blocks.get(rev);
  };
  const range = [head, ...(base ? [`^${base}`] : []), ...(since ? [`^${since}`] : []), ...earlier.map((t) => `^${t}`)];
  const commits = git(['rev-list', ...range], { cwd: root }).split('\n').filter(Boolean);
  prefetch(root, range);
  const inRange = new Set(commits);
  const guarded = (f) => isOwnerSetting(f) || isInstructionFile(f) || f === afile || f === CONFIG_FILE || KEEP.includes(f);
  // Another parent's version was judged when the last commit that set it lies in the range.
  const judged = (p, f) => inRange.has(git(['log', '-1', '--format=%H', p, '--', f], { cwd: root }).trim());
  // A commit where this shallow clone's history is cut shows no parents: diffed as a root
  // commit, every file would read as its change, named for a commit that never made it (copy,
  // 4 Nov). It is not judged; the check says it could not read it.
  const cut = shallowCuts(root);
  for (const sha of commits) {
    const short = sha.slice(0, 10);
    if (cut.has(sha)) {
      findings.push({ check: 'record', file: '(commit)', line: 1, message: `commit ${short} could not be checked: this clone's history is cut there (shallow), so its own change cannot be read; deepen the clone (job complete does) and run again` });
      continue;
    }
    try {
      const parents = git(['rev-list', '--parents', '-n', '1', sha], { cwd: root }).split(' ').slice(1);
      const files = introduced(root, sha, parents, { guarded, judged, base });
      // The versions a merge's guarded file is compared with: the base's, and any parent's that
      // was judged inside the range.
      const parentsFor = (f) => (parents.length > 1 ? [...(base ? [base] : []), ...parents.filter((p) => judged(p, f))] : parents);
      const approvalsTouched = [];
      // The approvals block (build J): a commit whose block differs from a parent's, or from every
      // version already judged, changes it. It is accepted only when it is the owner's own website
      // commit, or leaves the block the owner last set on the tips of main or the tranche. So a
      // merge that puts back an older block, leaving it at the head, is refused.
      if (files.includes(afile) || parents.length > 1) {
        const now = blockOf(sha);
        const was = parents.length ? parentsFor(afile).map(blockOf) : [''];
        const changed = parents.length ? (!was.includes(now) || parents.some((p) => blockOf(p) !== now)) : now !== '';
        // A merge may also carry the block the owner had set as one of its parents saw it (an
        // earlier owner edit, since overtaken), when the head ends on the current one (review A).
        const carried = () => blockOf(head) === ownerSet()?.block && parents.some((p) => ownerBlock(root, [p], afile, heading, ownerCommit)?.block === now);
        if (changed && !landed(sha) && now !== ownerSet()?.block && !ownerCommit(sha).ok && !carried()) {
          const text = show(root, sha, afile) || '';
          const line = Math.max(1, text.split('\n').findIndex((l) => l.trim() === heading.trim()) + 1);
          const t = ownerSet();
          approvalsTouched.push({ file: afile, line, message: `commit ${short} changes the approvals but is not ${ownerName}'s own commit through GitHub's website (${ownerCommit(sha).why}), and its block is not the one ${ownerName} last set there on main, the tranche or the base${t ? ` (commit ${t.sha.slice(0, 10)})` : ''}` });
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
          // The approvals key (an absent owner is the default one) and record_since.
          const ap = (t2) => {
            try {
              const c = parseJSON(t2 || '{}');
              return { approvals: JSON.stringify({ ...DEFAULTS.approvals, ...(c.approvals || {}) }), since: c.record_since ?? null };
            } catch { return { approvals: 'unreadable', since: 'unreadable' }; }
          };
          const now = ap(show(root, sha, file));
          const was = parents.length ? parentsFor(file).map((p) => ap(show(root, p, file))) : [ap(null)];
          // The approvals must equal a version already judged; so must record_since, unless it
          // names the base or an ancestor of it, which hides nothing the change brings.
          // An unreadable version (a duplicate key) equals none, so it never hides a change.
          const same = (w) => w.approvals !== 'unreadable' && w.approvals === now.approvals && (JSON.stringify(w.since) === JSON.stringify(now.since) || onBase(now.since));
          if (!was.some(same)) approvalsTouched.push({ file, line: 1, what: 'the approvals or record_since' });
        }
      }
      for (const t2 of approvalsTouched) {
        if (t2.message) { findings.push({ check: 'approvals', file: t2.file, line: t2.line, message: t2.message }); continue; }
        const v = ownerCommit(sha);
        if (!v.ok) findings.push({ check: t2.check || 'approvals', file: t2.file, line: t2.line, message: `commit ${short} changes ${t2.what || 'the approvals'} but is not ${ownerName}'s own commit through GitHub's website (${v.why})` });
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
