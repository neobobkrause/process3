// A module's own suite (GAT-2): the entry's command over the entry's test files, nothing else.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, posix, relative } from 'node:path';
import { NO_TOKENS, run, underPath } from './util.mjs';

export const suffixOf = (entry) => entry.suite.test_suffix || '.test.mjs';

function walk(dir, out) {
  if (!existsSync(dir)) return out;
  if (statSync(dir).isFile()) { out.push(dir); return out; }
  for (const n of readdirSync(dir).sort()) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

// Test files under the entry's test paths, relative to the repository root.
export function testFiles(root, entry) {
  const suffix = suffixOf(entry);
  return entry.tests.flatMap((t) => walk(join(root, t), [])).filter((p) => p.endsWith(suffix)).map((p) => relative(root, p));
}

// Node's test runner prints "ℹ tests N" (spec) or "# tests N" (tap) at the end.
export function counts(text) {
  const get = (k) => { const m = text.match(new RegExp(`^(?:ℹ|#) ${k} (\\d+)`, 'm')); return m ? Number(m[1]) : null; };
  return { total: get('tests'), pass: get('pass'), fail: get('fail') };
}

// Runs the suite over the given files (default: all of the entry's). Files are root-relative.
// Product code never gets the GitHub or Actions tokens (NO_TOKENS); every other variable stays,
// since a module's tests may use them (Bob, 2 Nov: deploy tokens are a standard condition).
export function runSuite(root, entry, files = testFiles(root, entry), opts = {}) {
  const cwd = join(root, entry.suite.cwd);
  const args = [...entry.suite.command.slice(1), ...files.map((f) => relative(cwd, join(root, f)))];
  const shown = [entry.suite.command[0], ...args].join(' ');
  if (!files.length) return { cmd: shown, cwd: entry.suite.cwd, exit: 1, seconds: 0, tests: { total: 0, pass: 0, fail: 0 }, output: 'no test files' };
  // A suite run from inside another test run must not report to the outer runner.
  const r = run(entry.suite.command[0], args, { cwd, timeout: opts.timeout, unset: ['NODE_TEST_CONTEXT', ...NO_TOKENS] });
  const output = r.stdout + r.stderr;
  return { cmd: shown, cwd: entry.suite.cwd, exit: r.code, seconds: r.seconds, tests: counts(output), output };
}

// GAT-5: lock files installed where they sit, without the GitHub tokens. The gate
// installs every lock file on its fresh checkout; `test` and `job complete` install their
// module's, when they are stale.

// Paths compared as written in config and ledger: slashes, no leading ./, "." for the root
// (review of PR 11).
export const normPath = (p) => {
  const s = posix.normalize(String(p).replace(/\\/g, '/')).replace(/^(\.\/)+/, '').replace(/\/+$/, '');
  return s === '' || s === '.' ? '.' : s;
};

// The lock files a module needs: those whose directory holds one of its paths or tests, or
// sits under one.
export function moduleLocks(lockfiles, entry) {
  const own = [...entry.paths, ...entry.tests].map(normPath);
  return lockfiles.filter((lock) => {
    const d = posix.dirname(normPath(lock));
    return d === '.' || own.some((p) => p === '.' || underPath(p, d) || underPath(d, p));
  });
}

// Freshness (review of PR 11): a successful install leaves the lock file's hash in
// node_modules; the install is fresh while the hash matches. A lock with no dependencies has
// nothing to install.
export const MARK = '.p3-lock-hash';
const lockHash = (text) => createHash('sha256').update(text).digest('hex');
const markFile = (root, lock) => join(root, posix.dirname(normPath(lock)), 'node_modules', MARK);
function noDependencies(text) {
  try {
    const l = JSON.parse(text);
    const pk = l.packages ? Object.keys(l.packages).filter((k) => k !== '') : null;
    return pk ? pk.length === 0 : !l.dependencies || !Object.keys(l.dependencies).length;
  } catch { return false; }
}
// The lock file's place in the checkout, from its normalised path (confirming review of PR 11).
const lockAt = (root, lock) => join(root, normPath(lock));
export function stale(root, lock) {
  const text = readFileSync(lockAt(root, lock), 'utf8');
  if (noDependencies(text)) return false;
  const m = markFile(root, lock);
  return !existsSync(m) || readFileSync(m, 'utf8').trim() !== lockHash(text);
}

export function install(root, lockfiles, { onlyStale = false, exec = run } = {}) {
  const findings = [];
  const ran = [];
  for (const lock of lockfiles) {
    const at = (message) => ({ check: 'install', file: lock, line: 1, message });
    if (!existsSync(lockAt(root, lock))) { findings.push(at('lock file not found')); continue; }
    if (onlyStale && !stale(root, lock)) continue;
    ran.push(lock);
    const text = readFileSync(lockAt(root, lock), 'utf8');
    const r = exec('npm', ['ci', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: join(root, posix.dirname(normPath(lock))), unset: NO_TOKENS });
    if (r.code !== 0) { findings.push(at(`npm ci failed: ${r.stderr.trim().split('\n').slice(-3).join(' ')}`)); continue; }
    mkdirSync(join(markFile(root, lock), '..'), { recursive: true });
    writeFileSync(markFile(root, lock), lockHash(text) + '\n');
  }
  return { findings, ran };
}
