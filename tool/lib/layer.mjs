// layer close <n> (Build Plan Phase 3, INT-4, ARC-4): BOB closes the open layer once it is ready.
// The layer checks run on the tranche tip in a worktree of their own: every lock file installed,
// then each module's entry `checks` and its suite, as the gate runs them, then each `generated`
// row's regenerate and verify. Green, the close is one row on the state branch (CLOSED_FILE):
// one push, no pull request, since BOB is its one writer and status already reads that branch.
// Regenerated files are not committed here: that is BOB's plain pull request, named in the output.
// A generated path the tranche does not track is built, not committed (deploy dev and release
// run build it): it is regenerated and verified, never compared (a file over max_file_bytes can
// never be refreshed by a pull request, so "differ" would never clear).
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { buildGenerated, committedPaths, entryChecks, generatedRows, regenerate } from './checks.mjs';
import { normPath } from './suite.mjs';
import { READY_NEXT, READY_START, wakeLine } from './job.mjs';
import { entryFile } from './ledger.mjs';
import { fetchState, writeState } from './state.mjs';
import { CLOSED_FILE, closedRows, layerState, nextWork, owedNotices, status } from './status.mjs';
import { install, runSuite } from './suite.mjs';
import { NO_TOKENS, depth, fail, git, loadConfig, now, repoSlug, run } from './util.mjs';

const MINUTE = 60000;

export function layerClose(root, n, { log = console.log, io, exec = run, as = 'bob' } = {}) {
  if (!/^\d+$/.test(String(n))) fail(`layer close <n>, the layer's number, not ${JSON.stringify(n)}`);
  const cfg = loadConfig(root);
  const tranche = `origin/${cfg.tranche}`;
  git(['fetch', '-q', ...depth(root), 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/${tranche}`], { cwd: root });
  const s = status(root, { log: () => {}, io });
  if (s.prs === null) fail('GitHub unreadable: open pull requests not known, so the layer cannot be closed');
  fetchState(root, cfg.state_branch, { fresh: true });
  const closed = closedRows(root, cfg, { slug: repoSlug(root), ...(io?.compare ? { read: io.compare } : {}) });
  const ls = layerState(root, cfg, s.rows, tranche, { closed });
  if (!ls) fail(`no layer map (${cfg.layers_file}) on ${tranche}`);
  if (ls.cur?.n !== Number(n)) fail(`layer ${n} is not the open layer; the open layer is ${ls.cur ? ls.cur.n : 'none'}`);
  if (!ls.ready) fail(`layer ${n} is not ready to close: ${ls.cur.mods.filter((m) => (m.blocked ? m.pr : m.open || (!m.merged && m.marks.length))).map((m) => `${m.id} ${m.blocked ? `is BLOCKED (${m.blocked}) with PR #${m.pr} still open: BOB closes it unmerged first, never deleting its branch` : m.open ? 'has an open job' : m.row?.flag ? `is flagged: ${m.row.flag}` : 'has no merged job and unmet marks'}`).join('; ')}`);
  const sha = git(['rev-parse', tranche], { cwd: root });
  const timeout = (cfg.suite_timeout_minutes || 20) * MINUTE;
  const wt = join(mkdtempSync(join(tmpdir(), 'p3-layer-')), 'w');
  git(['worktree', 'add', '-q', '--detach', wt, sha], { cwd: root });
  const findings = [];
  const suites = [];
  let changed = [];
  let built = [];
  try {
    findings.push(...install(wt, cfg.lockfiles, { exec }).findings);
    // Generated files the tranche does not track are built before the suites, as the gate builds
    // them (copy, 4 Nov: layer 2's close failed on an unbuilt rows.mjs, 37/37 and 33/33).
    const gen0 = generatedRows(cfg);
    if (!findings.length && gen0.rows.length) findings.push(...buildGenerated(wt, gen0.rows, { ref: sha, timeout, exec, log }).findings);
    for (const m of findings.length ? [] : ls.cur.mods) {
      if (m.blocked) { log(`${m.id}: deferred, BLOCKED (${m.blocked}); its work is not in the tranche, no suite to run`); continue; }
      if (!existsSync(join(wt, entryFile(m.id)))) { log(`${m.id}: no ledger entry, no suite to run`); continue; }
      const e = JSON.parse(readFileSync(join(wt, entryFile(m.id)), 'utf8'));
      findings.push(...entryChecks(wt, e, { timeout, exec, log }));
      const r = runSuite(wt, e, undefined, { timeout });
      suites.push({ module: e.id, exit: r.exit, tests: r.tests });
      if (r.exit !== 0) findings.push({ check: 'suite', file: e.tests[0], line: 1, message: `the ${e.id} suite failed (exit ${r.exit}): ${JSON.stringify(r.tests)}` });
      else if (!r.tests.total) findings.push({ check: 'suite', file: e.tests[0], line: 1, message: `zero tests ran in ${e.id}` });
      log(`${e.id}: suite exit ${r.exit}; tests ${JSON.stringify(r.tests)}`);
    }
    const gen = generatedRows(cfg);
    findings.push(...gen.findings);
    if (!findings.length && gen.rows.length) {
      const g = regenerate(wt, gen.rows, { timeout, exec });
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
  } finally {
    git(['worktree', 'remove', '--force', wt], { cwd: root, allowFail: true });
    rmSync(dirname(wt), { recursive: true, force: true });
  }
  if (findings.length) {
    for (const f of findings) log(`${f.check}: ${f.file}: ${f.message}`);
    log(`layer ${n} not closed: ${findings.length} finding(s) on ${sha.slice(0, 10)}; nothing recorded`);
    return { ok: false, findings };
  }
  // A module deferred BLOCKED is recorded with its reason: { reason, marks }; the rest, its marks.
  const deferred = Object.fromEntries(ls.cur.mods.filter((m) => m.marks.length || m.blocked).map((m) => [m.id, m.blocked ? { reason: m.blocked, marks: m.marks } : m.marks]));
  const row = { row: 'closed', layer: Number(n), tranche: cfg.tranche, commit: sha, at: now(), deferred, suites, generated_changed: changed };
  writeState(root, cfg.state_branch, `layer ${n} closed at ${cfg.tranche} ${sha.slice(0, 10)}`, (w) => {
    const p = join(w, CLOSED_FILE);
    const before = existsSync(p) ? readFileSync(p, 'utf8') : '';
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, before + JSON.stringify(row) + '\n');
    return {};
  });
  log(`layer ${n} closed at ${cfg.tranche} ${sha.slice(0, 10)}; deferred: ${Object.entries(deferred).map(([id, d]) => (Array.isArray(d) ? `${id} ${d.length}` : `${id} ${d.marks.length} (BLOCKED: ${d.reason})`)).join(', ') || 'none'}`);
  if (built.length) log(`generated, built and verified, not committed (deploy dev and release run build them): ${built.join(', ')}`);
  if (changed.length) log(`regenerated files differ from the tranche (${changed.join(', ')}): not committed here; commit them by BOB's plain pull request`);
  nextWork(root, cfg, s.rows, tranche, { log, notices: owedNotices(root, cfg, s.rows, () => {}), state: layerState(root, cfg, s.rows, tranche, { closed: [...closed, row] }) });
  // The close gives BOB its next layer's work and the deploy and walk: the wake is the last line.
  const wake = wakeLine(`layer ${n} closed: ${READY_START}, then status`, as);
  log(wake || READY_NEXT);
  return { ok: true, row, wake };
}

