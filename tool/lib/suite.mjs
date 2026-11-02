// A module's own suite (GAT-2): the entry's command over the entry's test files, nothing else.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { run } from './util.mjs';

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
