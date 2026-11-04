// A module's own suite (GAT-2): the entry's command over the entry's test files, nothing else.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, posix, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
// opts.events: a file the failing tests are written to by fail-reporter.mjs (base-red), beside
// the TAP the runner prints, when the command is the node test runner naming no reporter.
export const REPORTER = join(dirname(fileURLToPath(import.meta.url)), 'fail-reporter.mjs');
export const reportsEvents = (command) => /(^|\/)node$/.test(command[0]) && command.includes('--test') && !command.some((a) => a.startsWith('--test-reporter'));
export function runSuite(root, entry, files = testFiles(root, entry), opts = {}) {
  const cwd = join(root, entry.suite.cwd);
  const events = opts.events && reportsEvents(entry.suite.command)
    ? ['--test-reporter=tap', '--test-reporter-destination=stdout', `--test-reporter=${pathToFileURL(REPORTER).href}`, `--test-reporter-destination=${opts.events}`] : [];
  const own = entry.suite.command.slice(1);
  const at = own.indexOf('--test') + 1; // the reporter flags right after --test, before any pattern
  const args = [...own.slice(0, at), ...events, ...own.slice(at), ...files.map((f) => relative(cwd, join(root, f)))];
  const shown = [entry.suite.command[0], ...args.filter((a) => !events.includes(a))].join(' ');
  if (!files.length) return { cmd: shown, cwd: entry.suite.cwd, exit: 1, seconds: 0, tests: { total: 0, pass: 0, fail: 0 }, output: 'no test files' };
  // A suite run from inside another test run must not report to the outer runner.
  const r = run(entry.suite.command[0], args, { cwd, timeout: opts.timeout, unset: ['NODE_TEST_CONTEXT', ...NO_TOKENS] });
  const output = r.stdout + r.stderr;
  return { cmd: shown, cwd: entry.suite.cwd, exit: r.code, seconds: r.seconds, tests: counts(output), output, failing: events.length ? readFailing(opts.events, root) : null };
}

// fail-reporter.mjs's lines: [{ file, name }], file relative to root, name the enclosing names
// and the test's joined by " > " (a ">" inside a name escaped as "\>"), suites left out. null
// when the file is missing or a line cannot be read.
export function readFailing(file, root) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { return null; }
  const out = [];
  for (const l of text.split('\n').filter(Boolean)) {
    let e;
    try { e = JSON.parse(l); } catch { return null; }
    if (!e || !Array.isArray(e.path) || !e.path.length || !e.path.every((x) => typeof x === 'string')) return null;
    if (e.type === 'suite') continue;
    const f = typeof e.file === 'string' ? (isAbsolute(e.file) ? relative(root, e.file) : e.file).split('\\').join('/') : '(unknown)';
    out.push({ file: f, name: e.path.map((x) => x.replace(/\\/g, '\\\\').replace(/>/g, '\\>')).join(' > ') });
  }
  return out;
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
