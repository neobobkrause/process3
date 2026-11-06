// The layer checks (layer merge, layerflow.mjs; Build Plan INT-4, ARC-4), run on a commit in a
// worktree of their own: every lock file installed, the generated rows built, each module's entry
// checks and (withSuites) its suite, then each generated row's regenerate and verify. A generated
// path the tranche does not track is built, not committed (deploy dev and release run build it):
// it is regenerated and verified, never compared (a file over max_file_bytes can never be
// refreshed by a pull request, so "differ" would never clear).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildGenerated, committedPaths, entryChecks, generatedRows, regenerate } from './checks.mjs';
import { normPath } from './suite.mjs';
import { entryFile } from './ledger.mjs';
import { install } from './suite.mjs';
import { NO_TOKENS, fail, git, run, withTemp } from './util.mjs';

// The layer checks on a commit, in a worktree of its own (layer merge, without the module suites:
// Bob, 5 Nov, INT-4): every lock file installed, the generated rows built, each module's entry
// checks, then each generated row's regenerate and verify. { findings, changed, built }.
export function layerChecks(root, cfg, sha, mods, { timeout, exec = run, log = console.log } = {}) {
  const findings = [];
  let changed = [];
  let built = [];
  withTemp('p3-layer-', (tmp) => {
    const wt = join(tmp, 'w');
    git(['worktree', 'add', '-q', '--detach', wt, sha], { cwd: root });
    findings.push(...install(wt, cfg.lockfiles, { exec }).findings);
    // Generated files the tranche does not track are built first, as the gate builds them (copy,
    // 4 Nov: layer 2's close failed on an unbuilt rows.mjs, 37/37 and 33/33).
    const gen0 = generatedRows(cfg);
    if (!findings.length && gen0.rows.length) findings.push(...buildGenerated(wt, gen0.rows, { ref: sha, timeout, exec, log }).findings);
    for (const m of findings.length ? [] : mods) {
      if (m.blocked) { log(`${m.id}: deferred, BLOCKED (${m.blocked}); its work is not in the tranche`); continue; }
      if (!existsSync(join(wt, entryFile(m.id)))) { log(`${m.id}: no ledger entry`); continue; }
      const e = JSON.parse(readFileSync(join(wt, entryFile(m.id)), 'utf8'));
      findings.push(...entryChecks(wt, e, { timeout, exec, log }));
    }
    const gen = generatedRows(cfg);
    findings.push(...gen.findings);
    if (!findings.length && gen.rows.length) {
      const g = regenerate(wt, gen.rows, { timeout, exec, log });
      findings.push(...g.findings);
      // Only committed paths can differ from the tranche; the rest are built.
      for (const r of g.ran.filter((x) => x.changed)) {
        const mine = committedPaths(wt, sha, r);
        changed.push(...mine.filter((p) => git(['status', '--porcelain', '-z', '--untracked-files=all', '--', normPath(p)], { cwd: wt }) !== ''));
      }
      built = gen.rows.flatMap((r) => { const c = new Set(committedPaths(wt, sha, r)); return r.paths.filter((p) => !c.has(p)); });
      // A built row is verified even when git shows no change (its paths ignored by .gitignore).
      for (const [i, r] of gen.rows.entries()) {
        if (g.ran[i]?.verify !== null || !r.paths.some((p) => built.includes(p))) continue;
        const v = exec(r.verify[0], r.verify.slice(1), { cwd: wt, timeout, unset: NO_TOKENS });
        if (v.code !== 0) findings.push({ check: 'generated', file: r.paths[0], line: 1, message: `${r.verify.join(' ')} failed (exit ${v.code}) after building: ${(v.stdout + v.stderr).trim().split('\n').slice(-5).join(' ')}` });
      }
    }
  }, { root });
  return { findings, changed, built };
}
