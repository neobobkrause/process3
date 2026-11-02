// A module's own suite (GAT-2): the entry's command over the entry's test files, nothing else.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
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
export function runSuite(root, entry, files = testFiles(root, entry), opts = {}) {
  const cwd = join(root, entry.suite.cwd);
  const args = [...entry.suite.command.slice(1), ...files.map((f) => relative(cwd, join(root, f)))];
  const shown = [entry.suite.command[0], ...args].join(' ');
  if (!files.length) return { cmd: shown, cwd: entry.suite.cwd, exit: 1, seconds: 0, tests: { total: 0, pass: 0, fail: 0 }, output: 'no test files' };
  // A suite run from inside another test run must not report to the outer runner.
  const r = run(entry.suite.command[0], args, { cwd, timeout: opts.timeout, unset: ['NODE_TEST_CONTEXT', ...(opts.unset || [])] });
  const output = r.stdout + r.stderr;
  return { cmd: shown, cwd: entry.suite.cwd, exit: r.code, seconds: r.seconds, tests: counts(output), output };
}

// GAT-5: lock files installed where they sit, without the workflow's token. The gate installs
// every lock file on its fresh checkout; `test` installs its module's, when they are stale.
// The lock files a module needs: those whose directory holds one of its paths or tests, or
// sits under one.
export function moduleLocks(lockfiles, entry) {
  const own = [...entry.paths, ...entry.tests];
  return lockfiles.filter((lock) => {
    const d = dirname(lock);
    return d === '.' || own.some((p) => underPath(p, d) || underPath(d, p));
  });
}

// Stale: npm's own record of the install, node_modules/.package-lock.json, is missing or older
// than the lock file.
export function stale(root, lock) {
  const mark = join(root, dirname(lock), 'node_modules', '.package-lock.json');
  return !existsSync(mark) || statSync(mark).mtimeMs < statSync(join(root, lock)).mtimeMs;
}

export function install(root, lockfiles, { onlyStale = false, exec = run } = {}) {
  const findings = [];
  const ran = [];
  for (const lock of lockfiles) {
    const at = (message) => ({ check: 'install', file: lock, line: 1, message });
    if (!existsSync(join(root, lock))) { findings.push(at('lock file not found')); continue; }
    if (onlyStale && !stale(root, lock)) continue;
    ran.push(lock);
    const r = exec('npm', ['ci', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: join(root, dirname(lock)), unset: NO_TOKENS });
    if (r.code !== 0) findings.push(at(`npm ci failed: ${r.stderr.trim().split('\n').slice(-3).join(' ')}`));
  }
  return { findings, ran };
}
