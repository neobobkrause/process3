// Base-red (build of 4 Nov, the copy's deadlock: capture-requests PR 182 red on plane.test
// failures the tranche itself has, store-assembly red on sweep tests that need PR 182): a test
// that fails identically at the base is not a failure the pull request caused. When a suite fails
// on the PR's merged state, its failing test files run again at the base (the tranche tip the PR
// merges into) in a worktree of their own, with the same install and build steps, within what is
// left of the suite timeout. A failure is tolerated only when the same test, by file and full
// name, fails at the base too; a test missing at the base, or passing there, is the PR's.
// Per-test identity is read from the node test runner's TAP output, the runner's default when
// its output is not a terminal; any other output cannot be read per test and tolerates nothing.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import { install, runSuite } from './suite.mjs';
import { buildGenerated } from './checks.mjs';
import { exists, git, run } from './util.mjs';

// More tolerated failures than this is not a base that is a little red: the row stays small.
export const MAX_BASE_RED = 50;
export const testId = (t) => `${t.file}::${t.name}`;

const unquote = (s) => {
  const m = s.match(/^'(.*)'$/);
  return m ? m[1].replace(/''/g, "'") : s;
};

// The failing tests in a TAP run: [{ file, name }], name the full name (enclosing suites and
// tests joined by " > "), file relative to root. Every `not ok` of type test counts (a parent
// whose subtest failed too: the runner counts it in `fail`); suites do not, nor TODO or SKIP.
// null when the output is not TAP, or when what it lists does not add up to the run's own
// fail and cancelled counts.
export function failingTests(output, root) {
  if (!/^TAP version \d+/m.test(output)) return null;
  const lines = output.split('\n');
  const stack = []; // names by depth
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^( *)(# Subtest: (.*)|(not ok|ok) \d+ - (.*))$/);
    if (!m) continue;
    const depth = Math.floor(m[1].length / 4);
    if (m[3] !== undefined) { stack.length = depth; stack[depth] = m[3]; continue; }
    if (m[4] !== 'not ok' || /\s#\s*(TODO|SKIP)\b/i.test(m[5])) continue;
    let type = null;
    let location = null;
    if ((lines[i + 1] || '').trim() === '---') {
      for (let j = i + 2; j < lines.length && lines[j].trim() !== '...'; j++) {
        const y = lines[j].match(/^\s*(type|location): (.*)$/);
        if (y && y[1] === 'type') type = unquote(y[2].trim());
        if (y && y[1] === 'location' && location === null) location = unquote(y[2].trim());
      }
    }
    if (type !== 'test' || !location) continue;
    const path = location.replace(/^file:\/\//, '').replace(/:\d+:\d+$/, '');
    const file = isAbsolute(path) ? relative(root, path).split('\\').join('/') : path;
    out.push({ file, name: [...stack.slice(0, depth), m[5]].join(' > ') });
  }
  const get = (k) => { const c = output.match(new RegExp(`^# ${k} (\\d+)`, 'm')); return c ? Number(c[1]) : null; };
  const fail = get('fail');
  if (fail === null || out.length !== fail + (get('cancelled') || 0)) return null;
  return out;
}

// Runs the PR's failing tests at the base and says which are tolerated. failing: from
// failingTests on the PR's run. cfg: the trusted config (its lock files and generated rows).
// Returns { ok, why?, base_red?: { base, tests, run } }: ok when every failing test fails at the
// base too. The base's run is the evidence the row keeps.
export function baseRed(root, entry, { base, failing, cfg, rows = [], timeout, exec = run, log = () => {} }) {
  const no = (why) => ({ ok: false, why });
  if (!base) return no('no base to compare with');
  if (!failing?.length) return no('the failing tests could not be read per test (TAP output from the node test runner)');
  if (failing.length > MAX_BASE_RED) return no(`${failing.length} tests fail, over the ${MAX_BASE_RED} a base-red run may tolerate`);
  const end = Date.now() + timeout;
  const left = () => Math.max(1000, end - Date.now());
  const files = [...new Set(failing.map((t) => t.file))];
  const missing = files.filter((f) => !exists(root, base, f));
  if (missing.length) return no(`new failing test file(s) not on the base: ${missing.slice(0, 5).join(', ')}`);
  const wt = join(mkdtempSync(join(tmpdir(), 'p3-base-red-')), 'base');
  git(['worktree', 'add', '-q', '--detach', wt, base], { cwd: root });
  try {
    const timed = (c, a, o) => exec(c, a, { ...o, timeout: left() });
    const inst = install(wt, cfg.lockfiles || [], { exec: timed });
    if (inst.findings.length) return no(`the base's install failed: ${inst.findings[0].message}`);
    if (rows.length) {
      const b = buildGenerated(wt, rows, { timeout: left(), exec });
      if (b.findings.length) return no(`the base's build failed: ${b.findings[0].message}`);
    }
    const s = runSuite(wt, entry, files, { timeout: left() });
    const atBase = failingTests(s.output, wt);
    const evidence = { base, cmd: s.cmd, exit: s.exit, seconds: s.seconds, tests: s.tests };
    if (!atBase) return { ...no(`the base's run of ${files.length} file(s) could not be read per test (exit ${s.exit})`), run: evidence };
    const red = new Set(atBase.map(testId));
    const own = failing.filter((t) => !red.has(testId(t)));
    log(`base-red: ${failing.length - own.length} of ${failing.length} failing test(s) fail at the base ${base.slice(0, 10)} too`);
    if (own.length) return { ...no(`${own.length} failing test(s) pass or are missing at the base ${base.slice(0, 10)}: ${own.slice(0, 5).map(testId).join('; ')}`), run: evidence };
    return { ok: true, base_red: { base, tests: failing.map(testId), run: evidence } };
  } finally {
    git(['worktree', 'remove', '--force', wt], { cwd: root, allowFail: true });
    rmSync(join(wt, '..'), { recursive: true, force: true });
  }
}
