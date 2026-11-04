// Base-red (build of 4 Nov, the copy's deadlock: capture-requests PR 182 red on plane.test
// failures the tranche itself has, store-assembly red on sweep tests that need PR 182): a test
// that fails at the base too is not a failure the pull request caused. When a suite fails on the
// PR's merged state, its failing test files run again at the base (the tranche tip the PR merges
// into) in a tree of their own, with the same install and build steps, within what is left of the
// suite timeout. A failure is tolerated only when a test of the same file and full name fails at
// the base too, as many times; a test passing at the base, or missing from a file the base run
// reported, is the PR's. A file the base run reported nothing from (it timed out, crashed, or
// never reached it) is no verdict either way: a refusal that names it and asks for a rerun (copy
// PR 290, 4 Nov: five tests a sibling module declares were called "pass or missing" because the
// base ran the sibling, which runs nothing, not the test file that imports it). The
// comparison is by identity, not by error: a base-red test that fails for a new reason is not
// told apart.
// Identity comes from fail-reporter.mjs, the runner's structured events written to a file of
// their own (runSuite's events), never from what the tests print. A suite command that is not
// the node test runner, or names its own reporter, cannot be read per test and tolerates nothing.
// The base tree is written from the base's blobs (cat-file, replace refs off), not checked out,
// so no filter or attribute the PR's code may have planted in .git applies to it. Residual: a
// process the PR's tests left running, or loose objects rewritten in place; and, for a sibling two
// test files import, one test failing in one importer here and in the other at the base (the id
// does not name the importer, the count matches; confirming review of PR 133).
import { chmodSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, dirname, join } from 'node:path';
import { install, runSuite, testFiles, testTreeFiles } from './suite.mjs';
import { buildGenerated } from './checks.mjs';
import { NO_TOKENS, exists, run, withTemp } from './util.mjs';

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

// The test files that reach f, a module a failing test's id names: f itself when it is one, else
// those importing it, directly or through other files under the test paths, by a specifier ending
// in its name (with or without its extension; a mention in prose does not count). Sorted.
const SCRIPT = /\.(c|m)?(j|t)sx?$/;
export function reachers(dir, entry, f) {
  const own = testFiles(dir, entry);
  if (own.includes(f)) return [f];
  const all = testTreeFiles(dir, entry).filter((p) => SCRIPT.test(p));
  const text = new Map();
  const read = (p) => { if (!text.has(p)) { try { text.set(p, readFileSync(join(dir, p), 'utf8')); } catch { text.set(p, ''); } } return text.get(p); };
  const seen = new Set([f]);
  const out = new Set();
  for (let next = [f]; next.length;) {
    const g = next.shift();
    const stem = basename(g).replace(SCRIPT, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const spec = new RegExp(`/${stem}(\\.(c|m)?(j|t)sx?)?['"\`]`);
    for (const p of all) {
      if (seen.has(p) || !spec.test(read(p))) continue;
      seen.add(p);
      if (own.includes(p)) out.add(p); else next.push(p);
    }
  }
  return [...out].sort();
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
  return withTemp('p3-base-red-', (tmp) => { const wt = join(tmp, 'base'); try {
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
    // A failing test's file is where its test() was called: a sibling module a test file imports
    // runs nothing alone, so the base runs the test files that reach it; they must be the same
    // here and at the base, or the base's count of a test's failures is over other runs of it.
    const runs = new Map(); // file -> the test files that reach it at the base
    const differ = new Map();
    for (const f of files) {
      const there = reachers(wt, entry, f);
      const here = reachers(root, entry, f);
      runs.set(f, there);
      if (there.join('\n') !== here.join('\n')) differ.set(f, `the test files reaching it differ, here ${here.join(', ') || 'none'}, at the base ${there.join(', ') || 'none'}`);
    }
    const toRun = [...new Set([...runs.values()].flat())].sort();
    const unreached = files.filter((f) => !runs.get(f).length);
    const s = toRun.length ? runSuite(wt, entry, toRun, { timeout: left(), events: join(tmp, 'failing.jsonl') }) : null;
    const evidence = s ? { base, cmd: s.cmd, exit: s.exit, seconds: s.seconds, tests: s.tests, ...(s.timedOut ? { timed_out: true } : {}) } : { base, cmd: null };
    if (s && !s.failing) return no(`the base's run of ${toRun.length} file(s) could not be read per test (exit ${s.exit})`, { run: evidence });
    const reported = new Set(s ? s.reported : []);
    const whole = new Set(s ? s.whole : []);
    const red = counted(s ? s.failing : []);
    const green = new Set(s ? s.passing.map(testId) : []);
    const why = (f) => !runs.get(f).length ? 'not a test file the suite runs, and no test file at the base imports it'
      : s.timedOut ? `the run timed out after ${Math.round(s.seconds)} s`
        : runs.get(f).some((t) => whole.has(t)) ? `${runs.get(f).filter((t) => whole.has(t)).join(', ')} failed as a whole there (a load failure or an early exit), exit ${s.exit}`
          : !reported.has(f) ? `no result from it, exit ${s.exit}${runs.get(f)[0] === f ? '' : ` running ${runs.get(f).join(', ')}`}` : null;
    const passes = [];
    const lacks = [];
    const fewer = [];
    const open = new Map();
    const unlike = new Set();
    for (const [id, n] of counted(failing)) {
      const f = id.slice(0, id.indexOf('::'));
      // Not even a matching count: at the base it may come from another file's run of the test.
      if (differ.has(f)) { unlike.add(f); continue; }
      if ((red.get(id) || 0) >= n) continue;
      const w = why(f);
      if (w) open.set(f, w);
      else (red.get(id) ? fewer : green.has(id) ? passes : lacks).push(id);
    }
    const at = base.slice(0, 10);
    log(`base-red: of ${failing.length} failing test(s), ${passes.length} pass at the base ${at}, ${lacks.length} are missing there, ${fewer.length} fail there fewer times, ${[...open.keys()].length} file(s) the base run did not complete${unreached.length ? `; ${unreached.length} reached by no test file` : ''}`);
    const parts = [];
    if (passes.length) parts.push(`${passes.length} failing test(s) pass at the base ${at}: ${passes.slice(0, 5).join('; ')}`);
    if (lacks.length) parts.push(`${lacks.length} failing test(s) are missing at the base ${at}, whose run reported their files: ${lacks.slice(0, 5).join('; ')}`);
    if (fewer.length) parts.push(`${fewer.length} failing test(s) fail fewer times at the base ${at} than here: ${fewer.slice(0, 5).join('; ')}`);
    if (open.size) parts.push(`the base run did not complete for ${[...open].slice(0, 5).map(([f, w]) => `${f} (${w})`).join(', ')}: no verdict on its tests; rerun`);
    if (unlike.size) parts.push(`no base-red verdict for ${[...unlike].slice(0, 5).map((f) => `${f} (${differ.get(f)})`).join(', ')}`);
    if (parts.length) return no(parts.join('; '), { run: evidence });
    return { ok: true, base_red: { base, tests: failing.map(testId), run: evidence } };
  } catch (e) {
    return no(`the base's tree could not be prepared: ${String(e.message).slice(0, 300)}`);
  } });
}
