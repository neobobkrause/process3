// The gate (GAT-1, GAT-2, GAT-5, GAT-6, JOB-12, ARC-5): run by CI on every pull request tip,
// never in a session. Ends in seconds when only record paths changed (row 15), on a draft, or
// when nothing but records changed since the last green run on the same tranche tip.
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { GATE, RECEIPT, addComment, block, comments, gateRuns, latestBlock, verifyRow } from './github.mjs';
import { LEDGER_DIR, checkLedger, entryFile } from './ledger.mjs';
import { metricsFile } from './metrics.mjs';
import { install, runSuite, suffixOf } from './suite.mjs';
import { NO_TOKENS, exists, git, isRecordPath, loadConfig, now, repoSlug, underPath } from './util.mjs';

const ghIO = { comments, addComment, verify: (slug, r, ctx) => verifyRow(slug, r, ctx) };
const MINUTE = 60000;
// The product's code runs in child processes without the workflow's token (runSuite, install).
export { NO_TOKENS };

function entriesAt(root, ref) {
  const r = git(['ls-tree', '--name-only', `${ref}:${LEDGER_DIR}`], { cwd: root, allowFail: true });
  if (r.code !== 0) return [];
  return r.stdout.split('\n').filter((n) => n.endsWith('.json')).map((n) => {
    const text = git(['show', `${ref}:${LEDGER_DIR}/${n}`], { cwd: root }); // a read failure is an error
    try { return JSON.parse(text); } catch { return null; } // unreadable JSON is checkLedger's finding
  }).filter(Boolean);
}

// No rename detection: a rename lists both the removed and the added path (confirming review
// of PR 14).
const diffNames = (root, a, b) => git(['diff', '--no-renames', '--name-only', '-z', a, b], { cwd: root }).split('\0').filter(Boolean);
const F = (check, file, message, line = 1) => ({ check, file, line, message });
const inModule = (e, f) => [...e.paths, ...e.tests].some((p) => underPath(f, p));
export const ownPaths = (e) => [...e.paths, ...e.tests, entryFile(e.id), metricsFile(e.id)];

export function gate(root, opts) {
  const { base, head, branch, pr, draft = false, started = Date.now(), io = ghIO, exec, log = console.log } = opts;
  const cfg = loadConfig(root, base); // the trusted side
  const timeout = (cfg.suite_timeout_minutes || 20) * MINUTE;
  const slug = opts.slug || repoSlug(root);
  const mb = git(['merge-base', head, base], { cwd: root });
  const changed = diffNames(root, mb, head);
  const findings = [];
  const runRow = { sha: head, base, at: now(), run_id: process.env.GITHUB_RUN_ID ? Number(process.env.GITHUB_RUN_ID) : null, trigger: null, suite: 'skipped', revert: 'skipped', receipt: 'not checked', receipt_attempt: null };
  const all = pr ? io.comments(slug, pr) : [];
  const prior = gateRuns(all);
  const receipt = pr ? latestBlock(slug, pr, RECEIPT, all)?.data : null;

  const job = branch?.match(/^job\/([a-z0-9-]+)$/)?.[1];
  const entries = entriesAt(root, head);
  const entry = job ? entries.find((e) => e.id === job) || null : null;
  if (job && !entry) findings.push(F('ledger', entryFile(job), `branch ${branch} has no ledger entry`));
  findings.push(...checkLedger(root, { ref: head, base: mb, branch }));

  // A job writes only its module's files and tests, and its own records (ARC-2).
  if (entry) {
    for (const f of changed) if (!ownPaths(entry).some((p) => underPath(f, p))) findings.push(F('ownership', f, `job ${job} may not change files outside its module`));
  }

  const recordOnly = changed.every((f) => isRecordPath(cfg, f));
  // The fast path stands on an earlier green run only when that run is verified (verifyRow).
  const lastGreen = prior.filter((r) => r.ok && r.trigger === 'code' && r.base === base).reverse().find((r) => io.verify(slug, r, { pr, baseRef: cfg.tranche }));
  const sinceGreen = lastGreen && git(['cat-file', '-e', `${lastGreen.sha}^{commit}`], { cwd: root, allowFail: true }).code === 0
    && diffNames(root, lastGreen.sha, head).every((f) => isRecordPath(cfg, f));

  // The base the job's change is reverted to: the first parent of GitHub's merge checkout,
  // the tranche as it was merged with, else the event's base.
  const parents = git(['rev-list', '--parents', '-n', '1', 'HEAD'], { cwd: root }).split(' ').slice(1);
  const revertBase = parents.length === 2 && parents[1] === head ? parents[0] : base;

  if (recordOnly) runRow.trigger = 'record';
  else if (draft) runRow.trigger = 'draft';
  else if (sinceGreen) { runRow.trigger = 'record-since-green'; runRow.after = lastGreen.sha; }
  else {
    runRow.trigger = 'code';
    // A job's PR runs its module; any other PR runs every module whose files it touches.
    const scope = entry ? [entry] : entries.filter((e) => changed.some((f) => inModule(e, f)));
    runRow.scope = scope.map((e) => e.id);
    // GAT-5: every lock file, installed where it sits.
    if (scope.length) findings.push(...install(root, cfg.lockfiles, exec ? { exec } : {}).findings);
    const results = [];
    for (const e of scope) {
      const s = runSuite(root, e, undefined, { timeout });
      results.push(s);
      if (s.exit !== 0) {
        findings.push(F('suite', e.tests[0], `the ${e.id} suite failed (exit ${s.exit}${/ETIMEDOUT/.test(s.output) ? ', timed out' : ''}): ${JSON.stringify(s.tests)}`));
        log(s.output.split('\n').slice(-60).join('\n'));
      } else if (!s.tests.total) findings.push(F('suite', e.tests[0], `zero tests ran in ${e.id}`));
    }
    if (scope.length) {
      runRow.suite = results.every((s) => s.exit === 0) ? 'pass' : 'fail';
      runRow.tests = results.map((s) => s.tests);
      runRow.suite_seconds = results.reduce((t, s) => t + s.seconds, 0);
    }
    // JOB-12: the job's new or changed tests must fail with its change reverted.
    if (entry && runRow.suite === 'pass') {
      const exempt = receipt?.module === job ? receipt.exempt?.revert : undefined;
      const tests = changed.filter((f) => entry.tests.some((t) => underPath(f, t)) && f.endsWith(suffixOf(entry)) && existsSync(join(root, f)));
      const code = changed.filter((f) => !isRecordPath(cfg, f) && !entry.tests.some((t) => underPath(f, t)));
      if (!tests.length) {
        runRow.revert = exempt ? 'exempt' : 'fail';
        if (!exempt) findings.push(F('revert', entry.tests[0], 'the job adds or changes no test; name why in the receipt (--exempt-revert)'));
      } else if (!code.length) {
        runRow.revert = 'no code changed';
      } else {
        const r = revertCheck(root, entry, revertBase, code, tests, { timeout });
        runRow.revert = r.inert.length ? (exempt ? 'exempt' : 'fail') : 'pass';
        runRow.inert = r.inert;
        // A test that fails only because a new file is gone cannot load; it is not proof the
        // test checks behaviour. Counted for review, not failed.
        runRow.load_only = r.loadOnly;
        if (r.inert.length && !exempt) for (const t of r.inert) findings.push(F('revert', t, 'passes with the change reverted: the test does not test the change'));
      }
    }
  }

  // The receipt against this run: present, naming a commit on this branch, agreeing on the suite.
  if (job && !draft && runRow.trigger !== 'record') {
    if (!receipt || receipt.module !== job) {
      runRow.receipt = 'none';
      findings.push(F('receipt', entryFile(job), 'the pull request is ready but has no receipt (job complete posts it)'));
    } else {
      runRow.receipt_attempt = receipt.attempt;
      const onBranch = git(['merge-base', '--is-ancestor', receipt.sha, head], { cwd: root, allowFail: true }).code === 0;
      const claimed = receipt.commands?.find((c) => c.suite);
      const claim = claimed ? (claimed.exit === 0 ? 'pass' : 'fail') : 'none';
      if (!onBranch) findings.push(F('receipt', entryFile(job), `the receipt names ${String(receipt.sha).slice(0, 10)}, which is not on this branch`));
      runRow.receipt = !onBranch ? 'wrong commit'
        : runRow.suite === 'skipped' ? 'present' : claim === runRow.suite ? 'agrees' : 'disagrees';
      if (runRow.receipt === 'disagrees') findings.push(F('receipt', entryFile(job), `the receipt claims the suite ${claim === 'none' ? 'was not run' : claim === 'pass' ? 'passed' : 'failed'}; the gate's run ${runRow.suite === 'pass' ? 'passed' : 'failed'}`));
    }
  }

  runRow.findings = findings.length;
  runRow.ok = findings.length === 0;
  runRow.minutes = Math.round(((Date.now() - started) / MINUTE) * 100) / 100;
  // One new comment per run: the bot never edits, so an edited gate comment is not counted.
  if (pr) io.addComment(slug, pr, block(GATE, { runs: [runRow] }, `Gate run on \`${head.slice(0, 10)}\`: ${runRow.ok ? 'green' : `red, ${runRow.findings} finding(s)`}, ${runRow.trigger}, ${runRow.minutes} min.`));
  return { run: runRow, findings, changed };
}

const LOAD_ERROR = /ERR_MODULE_NOT_FOUND|Cannot find module|does not provide an export named/;

// Reverts the code files to the base, runs each test file alone, restores each file to HEAD
// (removing any HEAD does not have). Returns the test files that still pass, and those that
// failed only because something could not load. Runs in place: CI's checkout is disposable.
export function revertCheck(root, entry, base, code, tests, { timeout } = {}) {
  const inert = [];
  const loadOnly = [];
  try {
    for (const f of code) {
      if (exists(root, base, f)) git(['checkout', base, '--', f], { cwd: root });
      else rmSync(join(root, f), { force: true, recursive: true });
    }
    for (const t of tests) {
      const r = runSuite(root, entry, [t], { timeout });
      if (r.exit === 0) inert.push(t);
      else if (LOAD_ERROR.test(r.output)) loadOnly.push(t);
    }
  } finally {
    for (const f of code) {
      git(['reset', '-q', 'HEAD', '--', f], { cwd: root, allowFail: true });
      if (exists(root, 'HEAD', f)) git(['checkout', 'HEAD', '--', f], { cwd: root });
      else rmSync(join(root, f), { force: true, recursive: true });
    }
  }
  return { inert, loadOnly };
}
