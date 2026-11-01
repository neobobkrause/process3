// The gate (GAT-1, GAT-2, GAT-5, GAT-6, JOB-12, ARC-5): run by CI on every pull request tip,
// never in a session. Ends in seconds when only record paths changed (row 15), on a draft, or
// when nothing but records changed since the last green run on the same tranche tip.
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { GATE, RECEIPT, addComment, block, comments, editComment, latestBlock } from './github.mjs';
import { checkLedger, entryFile } from './ledger.mjs';
import { metricsFile } from './metrics.mjs';
import { runSuite, suffixOf, testFiles } from './suite.mjs';
import { git, isRecordPath, loadConfig, now, repoSlug, run, underPath } from './util.mjs';

const ghIO = { comments, addComment, editComment };

function readEntryAt(root, ref, id) {
  const r = git(['show', `${ref}:${entryFile(id)}`], { cwd: root, allowFail: true });
  if (r.code !== 0) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

const diffNames = (root, a, b) => git(['diff', '--name-only', '-z', a, b], { cwd: root }).split('\0').filter(Boolean);
const F = (check, file, message, line = 1) => ({ check, file, line, message });

export function gate(root, opts) {
  const { base, head, branch, pr, draft = false, started = Date.now(), io = ghIO, log = console.log } = opts;
  const cfg = loadConfig(root, base); // the trusted side
  const slug = opts.slug || repoSlug(root);
  const mb = git(['merge-base', head, base], { cwd: root });
  const changed = diffNames(root, mb, head);
  const findings = [];
  const runRow = { sha: head, base, at: now(), trigger: null, suite: 'skipped', revert: 'skipped', receipt: 'not checked', receipt_attempt: null };
  const all = pr ? io.comments(slug, pr) : [];
  const prior = pr ? latestBlock(slug, pr, GATE, all) : null;
  const receipt = pr ? latestBlock(slug, pr, RECEIPT, all)?.data : null;

  const job = branch?.match(/^job\/([a-z0-9-]+)$/)?.[1];
  const entry = job ? readEntryAt(root, head, job) : null;
  if (job && !entry) findings.push(F('ledger', entryFile(job), `branch ${branch} has no ledger entry`));
  findings.push(...checkLedger(root, { ref: head, base: mb, branch }));

  // A job writes only its module's files and tests, and its own records (ARC-2).
  if (entry) {
    const own = [...entry.paths, ...entry.tests, entryFile(job), metricsFile(job)];
    for (const f of changed) if (!own.some((p) => underPath(f, p))) findings.push(F('ownership', f, `job ${job} may not change files outside its module`));
  }

  const recordOnly = changed.every((f) => isRecordPath(cfg, f));
  const lastGreen = (prior?.data?.runs || []).filter((r) => r.ok && r.trigger === 'code' && r.base === base).pop();
  const sinceGreen = lastGreen && git(['cat-file', '-e', `${lastGreen.sha}^{commit}`], { cwd: root, allowFail: true }).code === 0
    && diffNames(root, lastGreen.sha, head).every((f) => isRecordPath(cfg, f));

  if (recordOnly) runRow.trigger = 'record';
  else if (draft) runRow.trigger = 'draft';
  else if (sinceGreen) { runRow.trigger = 'record-since-green'; runRow.after = lastGreen.sha; }
  else {
    runRow.trigger = 'code';
    if (!entry) {
      runRow.scope = 'no module';
    } else {
      // GAT-5: every lock file installed where it sits.
      for (const lock of cfg.lockfiles) {
        const dir = join(root, dirname(lock));
        if (!existsSync(join(root, lock))) { findings.push(F('install', lock, 'lock file not found')); continue; }
        const r = run('npm', ['ci', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: dir });
        if (r.code !== 0) findings.push(F('install', lock, `npm ci failed: ${r.stderr.trim().split('\n').slice(-3).join(' ')}`));
      }
      const s = runSuite(root, entry);
      runRow.suite = s.exit === 0 ? 'pass' : 'fail';
      runRow.tests = s.tests;
      runRow.suite_seconds = s.seconds;
      if (s.exit !== 0) {
        findings.push(F('suite', entry.tests[0], `the module suite failed (exit ${s.exit}): ${JSON.stringify(s.tests)}`));
        log(s.output.split('\n').slice(-60).join('\n'));
      } else if (!s.tests.total) findings.push(F('suite', entry.tests[0], 'zero tests ran'));

      // JOB-12: the job's new or changed tests must fail with its change reverted.
      const exempt = receipt?.module === job ? receipt.exempt?.revert : undefined;
      const tests = changed.filter((f) => entry.tests.some((t) => underPath(f, t)) && f.endsWith(suffixOf(entry)) && existsSync(join(root, f)));
      const code = changed.filter((f) => !isRecordPath(cfg, f) && !entry.tests.some((t) => underPath(f, t)));
      if (runRow.suite === 'pass') {
        if (!tests.length) {
          runRow.revert = exempt ? 'exempt' : 'fail';
          if (!exempt) findings.push(F('revert', entry.tests[0], 'the job adds or changes no test; name why in the receipt (--exempt-revert)'));
        } else if (!code.length) {
          runRow.revert = 'no code changed';
        } else {
          const inert = revertCheck(root, entry, base, code, tests);
          runRow.revert = inert.length ? (exempt ? 'exempt' : 'fail') : 'pass';
          runRow.inert = inert;
          if (inert.length && !exempt) for (const t of inert) findings.push(F('revert', t, 'passes with the change reverted: the test does not test the change'));
        }
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
  runRow.minutes = Math.round(((Date.now() - started) / 60000) * 100) / 100;
  if (pr) writeGateComment(slug, pr, prior, runRow, io);
  return { run: runRow, findings, changed };
}

// Reverts the code files to the base, runs each test file alone, restores. Returns the test
// files that still pass. Runs in place: CI's checkout is disposable.
export function revertCheck(root, entry, base, code, tests) {
  const inert = [];
  try {
    for (const f of code) {
      if (git(['cat-file', '-e', `${base}:${f}`], { cwd: root, allowFail: true }).code === 0) git(['checkout', base, '--', f], { cwd: root });
      else rmSync(join(root, f), { force: true });
    }
    for (const t of tests) if (runSuite(root, entry, [t]).exit === 0) inert.push(t);
  } finally {
    git(['checkout', 'HEAD', '--', ...code], { cwd: root, allowFail: true });
  }
  return inert;
}

function writeGateComment(slug, pr, prior, runRow, io) {
  const runs = [...(prior?.data?.runs || []), runRow].slice(-50);
  const body = block(GATE, { runs }, `Gate runs for this pull request, newest last. The newest: ${runRow.ok ? 'green' : `red, ${runRow.findings} finding(s)`}, ${runRow.trigger}, ${runRow.minutes} min.`);
  if (prior?.comment?.id) io.editComment(slug, prior.comment.id, body);
  else io.addComment(slug, pr, body);
}
