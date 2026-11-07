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
import { chmodSync, closeSync, existsSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, readlinkSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { install, runSuite, testFiles, testTreeFiles } from './suite.mjs';
import { buildGenerated, regenerate, staleFiles } from './checks.mjs';
import { NO_TOKENS, exists, holdTemp, run, withTemp } from './util.mjs';

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
const blobs = (root, sha) => gitRaw(root, ['ls-tree', '-r', '-z', '--full-tree', sha]).toString('utf8').split('\0').filter(Boolean).map((l) => {
  const [meta, path] = [l.slice(0, l.indexOf('\t')), l.slice(l.indexOf('\t') + 1)];
  const [mode, type, oid] = meta.split(' ');
  return { mode, type, oid, path };
}).filter((x) => x.type === 'blob');
export function writeTree(root, sha, dir) {
  const items = blobs(root, sha);
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

// The first of the base's files in dir that is not the base's blob (its bytes, its link or its
// executable bit), or null: the tree prepared beside the head is checked before the base runs in
// it (confirming review of build gate-speed: the head's code runs while it exists). Git's own hash
// (sha1 of "blob <size>\0" and the bytes, or of the link's target), so no filter or attribute applies.
export function changedInTree(root, sha, dir) {
  const oid = (body) => createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
  for (const x of blobs(root, sha)) {
    const p = join(dir, x.path);
    try {
      const st = lstatSync(p);
      if (x.mode === '120000') { if (!st.isSymbolicLink() || oid(Buffer.from(readlinkSync(p))) !== x.oid) return x.path; continue; }
      if (!st.isFile() || oid(readFileSync(p)) !== x.oid || ((st.mode & 0o100) !== 0) !== (x.mode === '100755')) return x.path;
    } catch { return x.path; }
  }
  return null;
}

// The test files that reach f, a module a failing test's id names: f itself when it is one, else
// those importing it, directly or through other files under the test paths, by a specifier ending
// in its name (with or without its extension; a mention in prose does not count). Sorted.
export const SCRIPT = /\.(c|m)?(j|t)sx?$/;
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

// The base's tree in wt, ready to run: written from its blobs, made a repository of its own, its
// lock files installed and its generated rows built, within timeout. { ok: true }, or { ok: false,
// why } (a failed install or build, as baseRed refuses with it). Throws when the tree cannot be
// written. Run inline by baseRed, or in a process of its own beside the head's install (startBase).
export function prepareTree(root, base, wt, { lockfiles = [], rows = [], timeout, exec = run, log = () => {} }) {
  const end = Date.now() + timeout;
  const left = () => Math.max(1000, end - Date.now());
  mkdirSync(wt);
  writeTree(root, base, wt);
  // A repository of its own, one commit of the base's tree, so a test that reads git sees one
  // at the base as it does at the PR (a test failing at the base only for want of .git would
  // be tolerated). The base's id is kept in the message for anything that wants it.
  gitRaw(wt, ['init', '-q']);
  gitRaw(wt, ['add', '-A', '-f']);
  gitRaw(wt, ['-c', 'user.name=p3', '-c', 'user.email=p3@localhost', '-c', 'commit.gpgsign=false', 'commit', '-q', '--no-verify', '-m', `base ${base}`]);
  const timed = (c, a, o) => exec(c, a, { ...o, timeout: left() });
  const inst = install(wt, lockfiles, { exec: timed });
  if (inst.findings.length) return { ok: false, why: `the base's install failed: ${inst.findings[0].message}` };
  if (rows.length) {
    const b = buildGenerated(wt, rows, { timeout: left(), exec, log: (l) => log(`base ${base.slice(0, 10)}: ${l}`) });
    if (b.findings.length) return { ok: false, why: `the base's build failed: ${b.findings[0].message}` };
  }
  return { ok: true };
}

// Staleness the base had already (the coordinator, 6 Nov: tolerated as base-red is): the base's tree
// prepared as prepareTree does, its generated rows regenerated there, and the files given that are
// stale there too. Run only when the head's regenerate made a committed file stale (rare).
// { ok, files } or { ok: false, why }: unread, the head's findings stand.
export function staleAtBase(root, base, rows, files, { lockfiles = [], timeout, exec = run, log = () => {} }) {
  const end = Date.now() + timeout;
  const left = () => Math.max(1000, end - Date.now());
  return withTemp('p3-base-red-', (tmp) => {
    const wt = join(tmp, 'base');
    try {
      const p = prepareTree(root, base, wt, { lockfiles, rows, timeout: left(), exec, log });
      if (!p.ok) return { ok: false, why: p.why };
      const g = regenerate(wt, rows, { timeout: left(), exec, log: (l) => log(`base ${base.slice(0, 10)}: ${l}`) });
      const at = new Set(rows.flatMap((r) => staleFiles(wt, r)));
      // The same way: stale there, and the base's regenerate wrote the bytes the head's did (a
      // pull request that changes what the generator writes made it stale itself).
      const bytes = (d, f) => { try { return readFileSync(join(d, f)); } catch { return null; } };
      const same = (f) => { const a = bytes(wt, f); const b = bytes(root, f); return a === null ? b === null : b !== null && a.equals(b); };
      return { ok: true, files: files.filter((f) => at.has(f) && same(f)), failed: g.findings.length };
    } catch (e) {
      return { ok: false, why: `the base's tree could not be prepared: ${String(e.message).slice(0, 300)}` };
    }
  });
}

// The base's tree prepared off the critical path (build gate-speed, 5 Nov: base-red was 36 of 181
// train-minutes): the gate starts this before the head's install, and the install and build of
// the base run in a process of their own, at a lower priority, while the head's run; the base's
// run of the failing files (baseRed) waits for it only when the suite fails. Only the build phases
// overlap: the base's tests still run after the head's suite, alone on the runner (E1: more
// concurrency inside the 4-vCPU runner does not help). The tree is the first matching baseRed
// call's, then dropped; a later call (another module, or the smoke list after the suite's)
// prepares its own, as before. When the process ends without a verdict (it crashed or was killed)
// or its install or build failed, baseRed prepares the tree inline, with its own budget. drop(): the process stopped, the tree removed; also at exit.
// The head's install, build and tests run while the base's tree exists, so before the base runs
// in it, its files are checked against the base's blobs (changedInTree); one that differs, and a
// refused preparation, are prepared again inline. Residual, as for a process the PR's tests leave
// running and now without one: code of the PR can still write into the tree's node_modules or
// built files, or the verdict files, which are not checked; the tranche into main, which tolerates
// nothing, is the backstop for a base-red the PR made.
export const PREP = join(dirname(fileURLToPath(import.meta.url)), 'base-prep.mjs');
const nap = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
export function startBase(root, { base, cfg, rows = [], timeout, log = () => {} }) {
  const { dir, drop } = holdTemp('p3-base-red-');
  const wt = join(dir, 'base');
  const out = join(dir, 'result.json');
  const exitFile = join(dir, 'exit');
  const logFile = join(dir, 'prep.log');
  const argsFile = join(dir, 'prep.json');
  writeFileSync(argsFile, JSON.stringify({ root, base, wt, out, lockfiles: cfg.lockfiles || [], rows, timeout }));
  const env = { ...process.env };
  for (const k of [...NO_TOKENS, 'NODE_TEST_CONTEXT']) delete env[k];
  const fd = openSync(logFile, 'a');
  let child;
  try {
    // The shell writes the exit status even when node dies, so the wait never outlives it.
    child = spawn('/bin/sh', ['-c', '"$0" "$1" "$2"; echo $? > "$3"', process.execPath, PREP, argsFile, exitFile], { cwd: dir, stdio: ['ignore', fd, fd], env, detached: true });
    child.on('error', () => {});
    child.unref();
  } finally { closeSync(fd); }
  const started = Date.now();
  let done = false;
  // The wrapper still runs: spawned, and neither gone nor a zombie (never reaped while the gate
  // runs synchronously). Where /proc cannot be read, the wait's deadline bounds it.
  const alive = () => {
    if (!child?.pid) return false;
    try { process.kill(child.pid, 0); } catch (e) { return e.code === 'EPERM'; }
    try { return readFileSync(`/proc/${child.pid}/stat`, 'utf8').replace(/^.*\) /s, '')[0] !== 'Z'; } catch { return true; }
  };
  // The whole group, verdict or not: an install's or a build's descendants outlive a timeout's kill.
  // A member that is a zombie is gone: the killed shell stays one, never reaped while the gate runs
  // synchronously, and kill(-group, 0) still finds it (copy of ci, 5 Nov: every drop waited its
  // full 5 s, and the tool's tests passed the job's 10 minutes). Read from /proc where it can be.
  const group = () => {
    try { process.kill(-child.pid, 0); } catch (e) { return e.code === 'EPERM'; }
    let names;
    try { names = readdirSync('/proc'); } catch { return true; }
    return names.some((n) => {
      if (!/^\d+$/.test(n)) return false;
      try { const f = readFileSync(`/proc/${n}/stat`, 'utf8').replace(/^.*\) /s, '').split(' '); return Number(f[2]) === child.pid && f[0] !== 'Z'; } catch { return false; }
    });
  };
  const stop = () => {
    done = true;
    if (!child?.pid) return;
    try { process.kill(-child.pid, 'SIGKILL'); } catch { return; }
    for (const until = Date.now() + 5000; group() && Date.now() < until;) nap(50);
  };
  // Before the scratch directories' own exit hook removes the tree the install still writes to.
  process.prependOnceListener('exit', stop);
  log(`base-red: the base ${base.slice(0, 10)}'s tree is prepared beside the head's install`);
  return {
    base, wt, dir, used: false,
    // The prepared tree's verdict, waiting up to ms: { ok }, { ok: false, why }, or null when the
    // process ended without one (baseRed then prepares the tree inline).
    wait(ms) {
      const until = Date.now() + ms;
      while (!existsSync(exitFile) && Date.now() < until && alive()) nap(200);
      const ended = existsSync(exitFile);
      if (!ended && !alive()) { done = true; log('base-red: the background preparation is gone without a verdict: the tree is prepared here'); return null; }
      const text = (() => { try { return readFileSync(logFile, 'utf8'); } catch { return ''; } })();
      for (const l of text.split('\n').filter(Boolean).slice(-40)) log(l);
      if (!ended) { stop(); return { ok: false, timedOut: true, why: `the base's tree was not ready within ${Math.round((Date.now() - started) / 1000)} s` }; }
      done = true;
      try { const r = JSON.parse(readFileSync(out, 'utf8')); log(`base-red: the base's tree was prepared in the background (${Math.round((statSync(out).mtimeMs - started) / 1000)} s after the gate started it)`); return r; } catch {
        log(`base-red: the background preparation ended without a verdict (exit ${String(readFileSync(exitFile, 'utf8')).trim()}): the tree is prepared here`);
        return null;
      }
    },
    drop() {
      stop();
      process.removeListener('exit', stop);
      // A process not yet gone may still add a file while the tree is removed: once more, then leave it to the sweep.
      try { drop(); } catch { nap(500); try { drop(); } catch { /* the next withTemp sweeps it */ } }
    },
    // The process group killed as the OOM killer would, the exit status unwritten (tests).
    kill() { if (child?.pid) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } } },
  };
}

// Runs the PR's failing tests at the base and says which are tolerated. failing: runSuite's
// `failing` on the PR's run. cfg: the trusted config (its lock files). rows: the generated rows.
// prepared: startBase's handle, used when it is for this base and not used yet.
// Returns { ok, why?, base_red?: { base, tests, run } }; the base's run is the evidence.
export function baseRed(root, entry, { base, failing, cfg, rows = [], timeout, exec = run, log = () => {}, prepared = null }) {
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
  const opts = { lockfiles: cfg.lockfiles || [], rows, exec, log };
  if (prepared && !prepared.used && prepared.base === base) {
    prepared.used = true;
    try {
      const p = prepared.wait(left());
      const altered = p?.ok ? changedInTree(root, base, prepared.wt) : null;
      if (p?.ok && !altered) return compareAt(root, entry, prepared.wt, prepared.dir, { base, failing, files, left, log });
      if (altered) log(`base-red: ${altered} in the base's tree prepared beside the head is not the base's: the tree is prepared here`);
      // Prepared beside the head, at a lower priority, on a deadline from the gate's start: a
      // failed install or build there may be the head's load or time, not the base's. Prepared
      // again here with base-red's own budget (review of build gate-speed).
      if (p?.timedOut) return no(p.why);
      if (p && !p.ok) log(`base-red: the background preparation refused (${p.why}): the tree is prepared here`);
    } catch (e) {
      return no(`the base's tree could not be prepared: ${String(e.message).slice(0, 300)}`);
    } finally { prepared.drop(); }
  }
  return withTemp('p3-base-red-', (tmp) => { const wt = join(tmp, 'base'); try {
    const p = prepareTree(root, base, wt, { ...opts, timeout: left() });
    if (!p.ok) return no(p.why);
    return compareAt(root, entry, wt, tmp, { base, failing, files, left, log });
  } catch (e) {
    return no(`the base's tree could not be prepared: ${String(e.message).slice(0, 300)}`);
  } });
}

// The base's run of the failing files in the prepared tree wt, and the verdict.
function compareAt(root, entry, wt, tmp, { base, failing, files, left, log }) {
  const no = (why, extra = {}) => ({ ok: false, why, ...extra });
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
}
