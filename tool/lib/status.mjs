// status (REC-3, minimal for Phase 1): every ledger entry with its state as the tranche and
// its job branch hold it, its pull request and gate, and the role's reading set with sizes.
import { checkRun, openPRs } from './github.mjs';
import { LEDGER_DIR, readEntry, readLedgerTexts } from './ledger.mjs';
import { readingSet } from './job.mjs';
import { git, loadConfig, repoSlug } from './util.mjs';

export function status(root, { role, module, offline = false, log = console.log } = {}) {
  const cfg = loadConfig(root);
  const tranche = `origin/${cfg.tranche}`;
  if (!offline) git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`, '+refs/heads/job/*:refs/remotes/origin/job/*'], { cwd: root, allowFail: true });
  const haveTranche = git(['rev-parse', '--verify', '-q', tranche], { cwd: root, allowFail: true }).code === 0;
  const onTranche = haveTranche ? readLedgerTexts(root, tranche) : readLedgerTexts(root);
  let prs = null;
  let slug = null;
  if (!offline) { try { slug = repoSlug(root); prs = openPRs(slug, cfg.tranche); } catch { prs = null; } }
  const rows = [];
  for (const [file, text] of Object.entries(onTranche)) {
    let e;
    try { e = JSON.parse(text); } catch { rows.push({ id: file, state: 'UNREADABLE' }); continue; }
    const branch = `origin/job/${e.id}`;
    const row = { id: e.id, tranche: e.status?.state };
    if (git(['rev-parse', '--verify', '-q', branch], { cwd: root, allowFail: true }).code === 0) {
      const t = git(['show', `${branch}:${LEDGER_DIR}/${e.id}.json`], { cwd: root, allowFail: true });
      let s = {};
      try { s = t.code === 0 ? JSON.parse(t.stdout).status || {} : {}; } catch { s = {}; }
      row.branch = (s.state || 'no entry on its branch') + (s.reason ? ` (${s.reason})` : '');
      const ahead = haveTranche ? Number(git(['rev-list', '--count', `${tranche}..${branch}`], { cwd: root })) : null;
      row.ahead = ahead;
      // ENF-6, JOB-9: a WORKING job with nothing pushed beyond its start commit.
      if (s.state === 'WORKING' && ahead !== null && ahead <= 1) row.flag = 'WORKING, nothing pushed';
      if (s.state === 'BLOCKED') row.flag = 'BLOCKED';
    }
    const pr = prs?.find((p) => p.head?.ref === `job/${e.id}`);
    if (pr) {
      row.pr = `#${pr.number}${pr.draft ? ' draft' : ' ready'}`;
      const run = checkRun(slug, pr.head.sha, 'gate');
      row.gate = run ? (run.conclusion || run.status) : 'none';
    } else if (row.ahead > 0 && prs) {
      // Commits on the branch the tranche lacks, and no open PR: an attempt closed unmerged.
      row.flag = 'commits on its branch and no open PR; a closed attempt is restarted by a Phase 2 command';
    } else if (e.status?.state === 'COMPLETE') row.pr = 'merged';
    rows.push(row);
  }
  log(`ledger on ${haveTranche ? tranche : 'the working tree'}: ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}${prs === null && !offline ? '; GitHub unreadable' : ''}`);
  for (const r of rows) {
    log(`- ${r.id}: ${r.tranche ?? r.state}${r.branch ? `; on its branch ${r.branch}, ${r.ahead} commit(s) ahead` : ''}${r.pr ? `; PR ${r.pr}` : ''}${r.gate ? `; gate ${r.gate}` : ''}${r.flag ? `; FLAG ${r.flag}` : ''}`);
  }
  if (role === 'job' && module) {
    const set = readingSet(root, readEntry(root, module));
    log(`reading set for job ${module}: ${set.bytes} bytes`);
    for (const f of set.files) log(`  ${f.bytes}\t${f.file}`);
  }
  return { rows };
}
