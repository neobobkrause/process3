// Base-red (build of 4 Nov, the copy's deadlock: capture-requests PR 182 red on plane.test
// failures the tranche itself has, store-assembly red on sweep tests that need PR 182): a test
// that fails at the base too is not a failure the pull request caused. When a suite fails on the
// PR's merged state, its failing test files run again at the base (the tranche tip the PR merges
// into) in a tree of their own, with the same install and build steps, within what is left of the
// suite timeout. A failure is tolerated only when a test of the same file and full name fails at
// the base too, as many times; a test missing at the base, or passing there, is the PR's. The
// comparison is by identity, not by error: a base-red test that fails for a new reason is not
// told apart.
// Identity comes from fail-reporter.mjs, the runner's structured events written to a file of
// their own (runSuite's events), never from what the tests print. A suite command that is not
// the node test runner, or names its own reporter, cannot be read per test and tolerates nothing.
// The base tree is written from the base's blobs (cat-file, replace refs off), not checked out,
// so no filter or attribute the PR's code may have planted in .git applies to it. Residual: a
// process the PR's tests left running, or loose objects rewritten in place.
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { install, runSuite } from './suite.mjs';
import { buildGenerated } from './checks.mjs';
import { NO_TOKENS, exists, run } from './util.mjs';

// More tolerated failures than this is not a base that is a little red: the row stays small.
export const MAX_BASE_RED = 50;
export const testId = (t) => `${t.file}::${t.name}`;

const SAFE_GIT = ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null'];
const gitRaw = (root, args, input) => {
  const env = { ...process.env, GIT_NO_REPLACE_OBJECTS: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  for (const k of NO_TOKENS) delete env[k];
  const r = spawnSync('git', [...SAFE_GIT, ...args], { cwd: root, env, input, maxBuffer: 1024 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${args[0]} failed: ${String(r.stderr || r.error).trim().slice(0, 300)}`);
  return r.stdout;
};

// The commit's tree written to dir from its blobs: no checkout, so no smudge filter, attribute
// or hook applies. Submodules are left out, as a worktree would leave them unpopulated.
export function writeTree(root, sha, dir) {
  const items = gitRaw(root, ['ls-tree', '-r', '-z', '--full-tree', sha]).toString('utf8').split('\0').filter(Boolean).map((l) => {
    const [meta, path] = [l.slice(0, l.indexOf('\t')), l.slice(l.indexOf('\t') + 1)];
    const [mode, type, oid] = meta.split(' ');
    return { mode, type, oid, path };
  }).filter((x) => x.type === 'blob');
  if (!items.length) return;
  const out = gitRaw(root, ['cat-file', '--batch'], items.map((x) => x.oid).join('\n') + '\n');
  let at = 0;
  for (const x of items) {
    const nl = out.indexOf(10, at);
    const size = Number(out.subarray(at, nl).toString('utf8').split(' ')[2]);
    if (!Number.isSafeInteger(size)) throw new Error(`cat-file could not read ${x.path}`);
    const body = out.subarray(nl + 1, nl + 1 + size);
    at = nl + 1 + size + 1;
    const p = join(dir, x.path);
    mkdirSync(dirname(p), { recursive: true });
    if (x.mode === '120000') { symlinkSync(body.toString('utf8'), p); continue; }
    writeFileSync(p, body);
    if (x.mode === '100755') chmodSync(p, 0o755);
  }
}

const counted = (tests) => {
  const m = new Map();
  for (const t of tests) m.set(testId(t), (m.get(testId(t)) || 0) + 1);
  return m;
};

// Runs the PR's failing tests at the base and says which are tolerated. failing: runSuite's
// `failing` on the PR's run. cfg: the trusted config (its lock files). rows: the generated rows.
// Returns { ok, why?, base_red?: { base, tests, run } }; the base's run is the evidence.
export function baseRed(root, entry, { base, failing, cfg, rows = [], timeout, exec = run, log = () => {} }) {
  const no = (why, extra = {}) => ({ ok: false, why, ...extra });
  if (!base) return no('no base to compare with');
  if (!failing) return no('the failing tests could not be read per test (only the node test runner, naming no reporter of its own, is)');
  if (!failing.length) return no('the suite failed with no failing test to compare (a crash, a timeout or a load failure outside any test)');
  if (failing.length > MAX_BASE_RED) return no(`${failing.length} tests fail, over the ${MAX_BASE_RED} a base-red run may tolerate`);
  const files = [...new Set(failing.map((t) => t.file))];
  const missing = files.filter((f) => !exists(root, base, f));
  if (missing.length) return no(`new failing test file(s) not on the base: ${missing.slice(0, 5).join(', ')}`);
  const end = Date.now() + timeout;
  const left = () => Math.max(1000, end - Date.now());
  const tmp = mkdtempSync(join(tmpdir(), 'p3-base-red-'));
  const wt = join(tmp, 'base');
  try {
    mkdirSync(wt);
    writeTree(root, base, wt);
    // A repository of its own, one commit of the base's tree, so a test that reads git sees one
    // at the base as it does at the PR (a test failing at the base only for want of .git would
    // be tolerated). The base's id is kept in the message for anything that wants it.
    gitRaw(wt, ['init', '-q']);
    gitRaw(wt, ['add', '-A', '-f']);
    gitRaw(wt, ['-c', 'user.name=p3', '-c', 'user.email=p3@localhost', '-c', 'commit.gpgsign=false', 'commit', '-q', '--no-verify', '-m', `base ${base}`]);
    const timed = (c, a, o) => exec(c, a, { ...o, timeout: left() });
    const inst = install(wt, cfg.lockfiles || [], { exec: timed });
    if (inst.findings.length) return no(`the base's install failed: ${inst.findings[0].message}`);
    if (rows.length) {
      const b = buildGenerated(wt, rows, { timeout: left(), exec, log: (l) => log(`base ${base.slice(0, 10)}: ${l}`) });
      if (b.findings.length) return no(`the base's build failed: ${b.findings[0].message}`);
    }
    const s = runSuite(wt, entry, files, { timeout: left(), events: join(tmp, 'failing.jsonl') });
    const evidence = { base, cmd: s.cmd, exit: s.exit, seconds: s.seconds, tests: s.tests };
    if (!s.failing) return no(`the base's run of ${files.length} file(s) could not be read per test (exit ${s.exit})`, { run: evidence });
    const red = counted(s.failing);
    const own = [];
    for (const [id, n] of counted(failing)) if ((red.get(id) || 0) < n) own.push(id);
    log(`base-red: of ${failing.length} failing test(s), ${own.length} do not fail at the base ${base.slice(0, 10)}`);
    if (own.length) return no(`${own.length} failing test(s) pass or are missing at the base ${base.slice(0, 10)}: ${own.slice(0, 5).join('; ')}`, { run: evidence });
    return { ok: true, base_red: { base, tests: failing.map(testId), run: evidence } };
  } catch (e) {
    return no(`the base's tree could not be prepared: ${String(e.message).slice(0, 300)}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
