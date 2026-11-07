// Throwaway git repositories for tests.
import fs, { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { git } from '../lib/util.mjs';
import { writeState } from '../lib/state.mjs';

// Every temporary directory a test process makes is removed when it exits (coordinator, 6 Nov: the
// suite left about 70,000 p3-* directories in a builder's /tmp, and filled its disk). fs.mkdtempSync
// is wrapped once, for every caller in the process (a test's own import of it, the fixtures', the
// tool's), and the directories it made under the temp directory go at exit. tempdirs.test.mjs holds it.
// GitHub pacing (R17, pace.mjs) is off in the tests unless a test sets it: no wait between gh
// stand-ins, no log written into the clones.
// No test reads the machine's git configuration (C2, the coordinator, 7 Nov: a test passed on a
// builder whose global config gave it an identity and failed in CI, which has none): the global and
// system files are cut off for the test process and every git it starts, as CI runs them. A repo a
// test makes sets what it needs (makeRepo: an identity, no signing). rulebooks.test holds every test
// file to importing this file.
process.env.GIT_CONFIG_GLOBAL = '/dev/null';
process.env.GIT_CONFIG_NOSYSTEM = '1';
process.env.P3_GH_INTERVAL_MS ??= '0';
process.env.P3_GITHUB_LOG ??= '0';
export const MADE = new Set();
if (!fs.mkdtempSync.p3Tracked) {
  const made = fs.mkdtempSync;
  const tracked = (prefix, ...rest) => { const d = made(prefix, ...rest); if (String(prefix).startsWith(tmpdir())) MADE.add(d); return d; };
  tracked.p3Tracked = true;
  fs.mkdtempSync = tracked;
  syncBuiltinESMExports();
  process.on('exit', () => { for (const d of MADE) { try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 2 }); } catch { /* gone, or busy: the guard test sees it */ } } });
}

export function makeRepo(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'p3-test-'));
  git(['init', '-q', '-b', 'main'], { cwd: root });
  // GitHub's committer address, as a website commit has it, so the approvals history asks the
  // test's lookup about every commit; a test that wants a local commit sets its own.
  git(['config', 'user.email', 'noreply@github.com'], { cwd: root });
  git(['config', 'user.name', 'Test'], { cwd: root });
  git(['config', 'commit.gpgsign', 'false'], { cwd: root });
  if (Object.keys(files).length) commit(root, files, 'initial');
  return root;
}

export function write(root, files) {
  for (const [p, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), typeof text === 'string' ? text : JSON.stringify(text, null, 2) + '\n');
  }
}

export function commit(root, files, msg = 'change') {
  write(root, files);
  git(['add', '-A'], { cwd: root });
  git(['commit', '-q', '-m', msg], { cwd: root });
  return git(['rev-parse', 'HEAD'], { cwd: root });
}

export const entry = (id, over = {}) => ({
  id,
  title: `Module ${id}`,
  layer: 5,
  paths: [`src/${id}/`],
  tests: [`test/${id}/`],
  requirements: `req/${id}.md`,
  suite: { cwd: '.', command: ['node', '--test'] },
  reading: [`req/${id}.md`],
  status: { state: 'OPEN' },
  ...over,
});

// origin's copy of the state branch (refs/remotes/origin/process-state), with these files added
// to what it holds; a .jsonl file is appended to.
export function onState(root, files) {
  const ref = 'refs/remotes/origin/process-state';
  const have = git(['rev-parse', '-q', '--verify', ref], { cwd: root, allowFail: true }).code === 0;
  const back = git(['rev-parse', 'HEAD'], { cwd: root });
  const branch = git(['symbolic-ref', '-q', '--short', 'HEAD'], { cwd: root, allowFail: true }).stdout.trim();
  if (have) git(['checkout', '-q', '-B', 'p3-state-test', ref], { cwd: root });
  else { git(['checkout', '-q', '--orphan', 'p3-state-test'], { cwd: root }); git(['rm', '-rqf', '.'], { cwd: root }); }
  const add = {};
  for (const [p, t] of Object.entries(files)) {
    const prev = have && p.endsWith('.jsonl') ? git(['show', `${ref}:${p}`], { cwd: root, allowFail: true }) : { code: 1 };
    add[p] = (prev.code === 0 ? prev.stdout : '') + t;
  }
  commit(root, add, 'state');
  git(['update-ref', ref, 'HEAD'], { cwd: root });
  git(['checkout', '-q', branch || back], { cwd: root });
  git(['branch', '-D', 'p3-state-test'], { cwd: root });
}

// The tranche open's grants check passed: every act ok, BOB at depth 1, the probe at 2.
export function openPassed(root, { tranche = 'tranche', outcome = {} } = {}) {
  const at = new Date().toISOString();
  const bob = ['push', 'pr-open', 'pr-comment', 'pr-merge', 'session-start', 'session-archive', 'task-create', 'task-delete'];
  const rows = [...bob.map((act) => [act, 1]), ...bob.slice(0, 4).map((act) => [act, 2])]
    .map(([act, depth]) => ({ row: 'grant', at, tranche, act, depth, outcome: outcome[`${act}|${depth}`] || 'ok', session: depth === 1 ? 'bob' : 'probe' }));
  onState(root, { 'metrics/tranche-open.jsonl': rows.map((r) => JSON.stringify(r) + '\n').join('') });
}

// The job cap is the account's P3_JOB_CAP (jobCap): set for one test, restored after it.
export function setJobCap(t, n) {
  const was = process.env.P3_JOB_CAP;
  if (n === undefined) delete process.env.P3_JOB_CAP; else process.env.P3_JOB_CAP = String(n);
  t.after(() => { if (was === undefined) delete process.env.P3_JOB_CAP; else process.env.P3_JOB_CAP = was; });
}

// A process3 triage register fixture (register.mjs): the prompts read it in place of this
// checkout's own, so the live register's entries never decide a test. Returns its root.
export function processRegisterFixture(open) {
  const dir = mkdtempSync(join(tmpdir(), 'p3-process-'));
  mkdirSync(join(dir, 'triage'), { recursive: true });
  writeFileSync(join(dir, 'triage', 'register.json'), JSON.stringify({ open }, null, 2) + '\n');
  process.env.P3_PROCESS_ROOT = dir;
  return dir;
}
// A chosen short-term response (AUD-8), as the prompts print it.
export const SEED_ENTRY = { id: 'P1', kind: 'short-term', problem: 'Process3 fixes and product job pull requests contend for the merge train.', evidence: 'test fixture', options: [{ option: 'process3 fixes that raise merge throughput go ahead of product job pull requests.', context: 'test fixture' }], response: 'process3 fixes that raise merge throughput go ahead of product job pull requests.', chosen_by: 'Bob, 5 Nov: "yes"', chosen_at: '2026-11-05', end_condition: 'for 2 hours no position is re-gated.', affects: ['bob', 'coordinator'], owner: 'the process-triage lane', state: 'response chosen' };

// A layer recorded closed on the state branch (layers/closed.jsonl), as layer merge records it,
// at the tranche tip on origin: the fixture step the removed train-era `layer close` once was.
export function closeLayer(root, n, { tranche = 'tranche', sb = 'process-state', deferred = {} } = {}) {
  git(['fetch', '-q', 'origin', `+refs/heads/${tranche}:refs/remotes/origin/${tranche}`], { cwd: root });
  const commitSha = git(['rev-parse', `refs/remotes/origin/${tranche}`], { cwd: root });
  const row = { row: 'closed', layer: Number(n), tranche, commit: commitSha, at: new Date().toISOString(), deferred, suites: [], generated_changed: [] };
  writeState(root, sb, `layer ${n} closed (test)`, (w) => {
    mkdirSync(join(w, 'layers'), { recursive: true });
    const p = join(w, 'layers', 'closed.jsonl');
    writeFileSync(p, (existsSync(p) ? readFileSync(p, 'utf8') : '') + JSON.stringify(row) + '\n');
    return {};
  });
  return { ok: true, row };
}
