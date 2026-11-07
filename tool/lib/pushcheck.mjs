// A job's push refuses, before anything is pushed, a commit that adds a file over max_file_bytes,
// or a generated path (config `generated`) or a path under any dist/ directory that the tranche
// does not already track. A pushed commit cannot be taken back without a force-push, which no
// session may do, so each such push cost a fresh branch (installer 3df99b92, 5 Nov; newgroup
// 606/609 and agent-runner 3ee34e5, 6 Nov).
import { generatedRows, isGenerated } from './checks.mjs';
import { fail, git } from './util.mjs';

const DIST = /(^|\/)dist\//;

// The commits a push of HEAD to `branch` sends, merges aside (a merge brings the tranche in, its
// files already on origin): those not on origin's branch or the tranche.
function outgoing(root, branch, tranche) {
  const not = [`refs/remotes/origin/${tranche}`, `refs/remotes/origin/${branch}`].filter((r) => git(['rev-parse', '-q', '--verify', r], { cwd: root, allowFail: true }).code === 0);
  const r = git(['rev-list', '--no-merges', 'HEAD', ...(not.length ? ['--not', ...not] : [])], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout.split('\n').filter(Boolean) : [];
}

// [{ commit, file, why }]: every file an outgoing commit adds (or, for size, grows) that may not be pushed.
export function unpushable(root, cfg, { branch, tranche = cfg.tranche }) {
  const rows = generatedRows(cfg).rows;
  const base = `refs/remotes/origin/${tranche}`;
  const tracked = (f) => git(['cat-file', '-e', `${base}:${f}`], { cwd: root, allowFail: true }).code === 0;
  const max = Number(cfg.max_file_bytes);
  const out = [];
  for (const c of outgoing(root, branch, tranche)) {
    const raw = git(['diff-tree', '--no-commit-id', '--no-renames', '-r', '--root', '--diff-filter=AM', c], { cwd: root });
    for (const line of raw.split('\n').filter(Boolean)) {
      const [meta, file] = line.split('\t');
      const [, , , blob, status] = meta.split(' ');
      if (/^0+$/.test(blob)) continue;
      const size = Number(git(['cat-file', '-s', blob], { cwd: root }));
      const was = status === 'M' && tracked(file) ? Number(git(['cat-file', '-s', `${base}:${file}`], { cwd: root })) : 0;
      if (Number.isFinite(max) && size > max && was <= max) out.push({ commit: c, file, why: `${size} bytes, over max_file_bytes (${max})` });
      else if (status === 'A' && !tracked(file) && isGenerated(rows, file)) out.push({ commit: c, file, why: 'a generated path (config generated): it is built, never committed' });
      else if (status === 'A' && !tracked(file) && DIST.test(file)) out.push({ commit: c, file, why: 'under a dist/ directory: a build output, never committed' });
    }
  }
  return out;
}

// Refuses the push, naming each file and the act that clears it.
export function refuseUnpushable(root, cfg, { branch }) {
  const bad = unpushable(root, cfg, { branch });
  if (!bad.length) return;
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  fail(`nothing was pushed: ${bad.slice(0, 5).map((b) => `commit ${b.commit.slice(0, 10)} adds ${b.file} (${b.why})`).join('; ')}. Drop it from the commit and rebuild the commit before pushing: ${bad[0].commit === head ? `\`git reset --soft HEAD~1\`, \`git reset -- ${bad[0].file}\`, then commit again` : `\`git reset --soft ${bad[0].commit.slice(0, 10)}~1\`, \`git reset -- ${bad[0].file}\`, then commit again`}; a pushed commit cannot be taken back without a force-push`);
}
