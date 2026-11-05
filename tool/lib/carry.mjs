// Tranche carry (Build Plan Phase 3, SHM-4): a product converting mid-tranche has pull requests
// made before Process3. The open ones into the tranche (into main while no tranche exists) that
// no ledger entry owns are listed, each with the module whose paths own all its files or "no
// single module", for BOB to take in with `job start <id> --take-in <n>` or leave as a plain
// pull request. Read-only: nothing is closed or rewritten here.
import { entriesAt, ownPaths } from './gate.mjs';
import { rowsAt } from './metrics.mjs';
import { branchModule } from './ledger.mjs';
import { gh, git, underPath } from './util.mjs';

// The marker line a take-in START carries (job start --take-in); a job pull request whose body
// has it owns the pull request it names.
export const TAKEN = /Earlier work taken in: pull request #(\d+)/;

export const prFiles = (slug, n) => {
  const pages = gh(['api', '--paginate', '--slurp', `repos/${slug}/pulls/${n}/files?per_page=100`], { allowFail: true });
  return Array.isArray(pages) ? pages.flat().map((f) => f.filename) : null;
};

// The pull requests a take-in recorded: the start rows' take_in.pr on ref and on each job's
// branch as this clone has it, and the marker in open job pull requests' bodies.
function takenIn(root, ref, ids, prs) {
  const taken = new Set();
  const all = new Set(ids);
  const heads = git(['for-each-ref', '--format=%(refname:lstrip=3)', 'refs/remotes/origin/job/'], { cwd: root, allowFail: true }).stdout.split('\n').filter(Boolean);
  for (const id of ids) {
    for (const r of [ref, ...heads.filter((h) => branchModule(h, all) === id).map((h) => `refs/remotes/origin/${h}`)]) {
      for (const row of rowsAt(root, r, id)) if (row.take_in?.pr) taken.add(Number(row.take_in.pr));
    }
  }
  for (const p of prs) { const m = TAKEN.exec(p.body || ''); if (m && /^job\//.test(p.head?.ref || '')) taken.add(Number(m[1])); }
  return taken;
}

// The module that owns every file, or "no single module"; null files: not read.
export function owningModule(entries, files) {
  if (!files) return 'unknown (its files were not read)';
  const owners = entries.filter((e) => files.every((f) => ownPaths(e).some((p) => underPath(f, p))));
  return owners.length === 1 ? owners[0].id : 'no single module';
}

// prs: the open pull requests into the base (GitHub's list); ref: the base's ledger.
export function toTakeIn(root, { slug, ref, prs, files = prFiles }) {
  const entries = entriesAt(root, ref).filter((e) => e.id);
  const ids = new Set(entries.map((e) => e.id));
  const taken = takenIn(root, ref, [...ids], prs || []);
  return (prs || []).filter((p) => !ids.has(branchModule(p.head?.ref, ids)) && !taken.has(p.number)).map((p) => {
    let list = null;
    try { list = files(slug, p.number); } catch { list = null; }
    return { number: p.number, head: p.head?.ref, draft: !!p.draft, updated: p.updated_at || null, module: owningModule(entries, list) };
  });
}

export const takeInLine = (t, P3) => `#${t.number} ${t.head}${t.draft ? ' draft' : ''}: ${t.module === 'no single module' || t.module.startsWith('unknown') ? `${t.module}; leave it as a plain pull request, or BOB splits it` : `module ${t.module}; \`${P3} job start ${t.module} --live <n> --take-in ${t.number}\`, or leave it as a plain pull request`}`;
