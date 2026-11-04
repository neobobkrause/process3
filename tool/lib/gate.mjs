// The gate (GAT-1, GAT-2, GAT-5, GAT-6, JOB-12, ARC-5): run by CI on every pull request tip,
// never in a session. Ends in seconds when only record paths changed (row 15), on a draft, or
// when nothing but records changed since the last green run on the same tranche tip.
import { existsSync, lstatSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { GATE, addComment, block, comments, gateRuns, getPR, latestReceipt, verifyRow } from './github.mjs';
import { LEDGER_DIR, checkLedger, entryFile } from './ledger.mjs';
import { metricsFile } from './metrics.mjs';
import { install, runSuite, suffixOf } from './suite.mjs';
import { buildGenerated, committedGenerated, entryChecks, generatedRows, importFindings, regenerate } from './checks.mjs';
import { NO_TOKENS, exists, fail, git, isRecordPath, loadConfig, now, repoSlug, underPath } from './util.mjs';

const ghIO = { comments, addComment, getPR, verify: (slug, r, ctx) => verifyRow(slug, r, ctx) };
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
// A job strikes the marks it meets in its requirements file, so that file is its own too.
export const ownPaths = (e) => [...e.paths, ...e.tests, ...(e.requirements ? [e.requirements] : []), entryFile(e.id), metricsFile(e.id)];

// The comment for one gate run: the lead line and the row, as job post writes it.
export const gateComment = (r) => block(GATE, { runs: [r] }, `Gate run on \`${String(r.sha).slice(0, 10)}\`: ${r.ok ? 'green' : `red, ${r.findings} finding(s)`}, ${r.trigger}, ${r.minutes} min.`);

// post: false (--no-post) in the workflow's job gate, whose token can only read; job post writes
// the comment from the run's artifact (setup audit, 2 Nov).
export function gate(root, opts) {
  const { base, head, branch, pr, draft: eventDraft = false, started = Date.now(), post = true, io = ghIO, exec, log = console.log } = opts;
  const cfg = loadConfig(root, base); // the trusted side
  const timeout = (cfg.suite_timeout_minutes || 20) * MINUTE;
  const slug = opts.slug || repoSlug(root);
  const mb = git(['merge-base', head, base], { cwd: root });
  const changed = diffNames(root, mb, head);
  const findings = [];
  const runRow = { sha: head, base, at: now(), run_id: process.env.GITHUB_RUN_ID ? Number(process.env.GITHUB_RUN_ID) : null, trigger: null, suite: 'skipped', revert: 'skipped', receipt: 'not checked', receipt_attempt: null };
  const all = pr ? io.comments(slug, pr) : [];
  const prior = gateRuns(all);
  // The pull request as it is now. Its draft state is read live, not from the event (the gate
  // race, measured on the copy 4 Nov, PRs 55, 61, 62, 63): job complete pushes, then marks
  // ready, so one head gets a synchronize run whose payload says draft and a ready_for_review
  // run, created in the same second; the concurrency group keeps one, and when the push's run
  // was kept it skipped the suite and the receipt, and a re-run replays the same payload. Read
  // live, whichever run is kept judges the pull request as it is. A failed read stops the run.
  const live = pr ? io.getPR(slug, pr) : null;
  const draft = typeof live?.draft === 'boolean' ? live.draft : eventDraft;
  if (draft !== eventDraft) {
    // Kept in the row too, so a run the race touched is visible without its log (review 1 of PR 74).
    runRow.event_draft = eventDraft;
    log(`the pull request is ${draft ? 'a draft' : 'ready'} now; the event said ${eventDraft ? 'draft' : 'ready'}: the gate judges it as it is now`);
  }
  // The receipt is read only from the pull request's opener (review of PR 13).
  const receipt = pr ? latestReceipt(all, opts.opener ?? live?.user?.login) : null;

  const job = branch?.match(/^job\/([a-z0-9-]+)$/)?.[1];
  const entries = entriesAt(root, head);
  const entry = job ? entries.find((e) => e.id === job) || null : null;
  if (job && !entry) findings.push(F('ledger', entryFile(job), `branch ${branch} has no ledger entry`));
  findings.push(...checkLedger(root, { ref: head, base: mb, branch }));

  // A job writes only its module's files and tests, and its own records (ARC-2).
  if (entry) {
    for (const f of changed) if (!ownPaths(entry).some((p) => underPath(f, p))) findings.push(F('ownership', f, `job ${job} may not change files outside its module`));
  }
  // ARC-1: its imports are its own module or its declared uses. JOB-8: no generated artifact.
  const gen = generatedRows(cfg);
  findings.push(...gen.findings);
  if (entry) {
    const im = importFindings(root, cfg, { base, head, entry, changed });
    if (im.skipped) { runRow.imports = 'skipped'; log(im.skipped); } else runRow.imports = im.findings.length ? 'fail' : 'pass';
    findings.push(...im.findings, ...committedGenerated(root, gen.rows, { head, changed }));
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
    const inst = scope.length ? install(root, cfg.lockfiles, exec ? { exec } : {}).findings : [];
    findings.push(...inst);
    // Generated files the commit does not track are built before the checks and the suite, as
    // deploy and release build them (copy, 4 Nov: an untracked rows.mjs failed 41 of 113 tests).
    let builtRows = new Set();
    if (scope.length && !inst.length && gen.rows.length) {
      const b = buildGenerated(root, gen.rows, { timeout, log, ...(exec ? { exec } : {}) });
      runRow.built = b.built;
      builtRows = b.ran;
      findings.push(...b.findings);
    }
    // ARC-4: the entry's own checks, as job complete runs them.
    if (entry && !inst.length) findings.push(...entryChecks(root, entry, { timeout, log }));
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
      // The requirements file's struck marks are not code: reverting them proves nothing.
      const code = changed.filter((f) => !isRecordPath(cfg, f) && f !== entry.requirements && !entry.tests.some((t) => underPath(f, t)));
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
    // GAT-4: regenerate every generated row, verify those whose paths changed; nothing committed.
    if (scope.length && gen.rows.length) {
      const g = regenerate(root, gen.rows, { timeout, skip: builtRows });
      runRow.generated = g.ran;
      findings.push(...g.findings);
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
  if (pr && post) io.addComment(slug, pr, gateComment(runRow));
  return { run: runRow, findings, changed };
}

// A gate row, checked before job post writes it into a comment: the file was written after
// product code ran (review of PR 13). Only the fields job post prints are checked; merge trusts a
// row only when the run's own artifact holds the same row (verifyRow).
const HEX40 = /^[0-9a-f]{40}$/;
const ROW = {
  sha: (v) => HEX40.test(v),
  run_id: (v) => Number.isSafeInteger(v) && v > 0,
  trigger: (v) => ['record', 'draft', 'record-since-green', 'code'].includes(v),
  findings: (v) => Number.isSafeInteger(v) && v >= 0,
  ok: (v) => typeof v === 'boolean',
  minutes: (v) => Number.isFinite(v) && v >= 0,
};
// Text from the artifact that job post prints: no control characters or line breaks, so it
// cannot start a workflow command (confirming review of PR 13).
export const printable = (x, max = 120) => String(x).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ').slice(0, max);
export function checkRow(row) {
  const bad = Object.keys(ROW).filter((k) => !ROW[k](row[k])).map((k) => `${k} is ${k in row ? 'not a valid value' : 'missing'}`);
  if (!bad.length && row.ok !== (row.findings === 0)) bad.push('ok does not agree with findings');
  if (bad.length) fail(`the gate row is refused: ${bad.slice(0, 5).join('; ')}`);
  return row;
}

// Job post of the gate workflow (setup audit, 2 Nov): the one job with a write token. It runs
// no product code: only this tool, at the base's pin, over the gate.json job gate uploaded as
// the run's gate-row artifact. The comment holds that same row, so verifyRow, which compares
// the comment's row with the artifact, still trusts it. The row must be this run's and this
// head's, and a green row needs job gate to have ended green.
export const MAX_ROW_BYTES = 65536;
export function postRow(file, { pr, head, gateResult, slug, runId = process.env.GITHUB_RUN_ID, io = ghIO, log = console.log }) {
  if (!pr) fail('--post needs --pr <n>');
  let st;
  try { st = lstatSync(file); } catch { st = null; }
  if (!st) { log(`no ${file}: job gate wrote no row (cancelled or stopped early); nothing to post`); return { posted: false }; }
  if (!st.isFile()) fail(`${file} is not a regular file`);
  if (st.size > MAX_ROW_BYTES) fail(`${file} is ${st.size} bytes, over ${MAX_ROW_BYTES}`);
  let data;
  try { data = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { fail(`${file} is not JSON: ${printable(e.message)}`); }
  const raw = data?.run;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { log(`no gate row in ${file}${typeof data?.error === 'string' ? ` (the gate stopped: ${printable(data.error, 300)})` : ''}; nothing to post`); return { posted: false }; }
  const row = checkRow(raw);
  if (runId && String(row.run_id) !== String(runId)) fail(`the row names run ${row.run_id}, not this run ${runId}`);
  if (head && row.sha !== head) fail(`the row is for ${row.sha.slice(0, 10)}, not the head ${head.slice(0, 10)}`);
  if (row.ok && gateResult && gateResult !== 'success') fail(`the row says green, but job gate ended ${gateResult}`);
  const comment = io.addComment(slug, pr, gateComment(row));
  log(`posted the gate row for ${row.sha.slice(0, 10)} (${row.ok ? 'green' : 'red'})`);
  return { posted: true, comment, row };
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
