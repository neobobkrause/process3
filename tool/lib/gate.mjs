// The gate (GAT-1, GAT-2, GAT-5, GAT-6, JOB-12, ARC-5): run by CI on every pull request tip,
// never in a session. Ends in seconds when only record paths changed (row 15), on a draft, or
// when nothing but records changed since the last green run on the same tranche tip.
import { existsSync, lstatSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { GATE, REVERT_EXEMPT, addComment, block, comments, gateRuns, getPR, latestReceipt, parseBlock, verifyRow } from './github.mjs';
import { branchModule, checkLedger, entryFile, homeRef, ledgerIds, readLedgerTexts, startBranch } from './ledger.mjs';
import { metricsFile, rowsAt } from './metrics.mjs';
import { install, normPath, reportsEvents, runSuite, suffixOf, testFiles, testTreeFiles } from './suite.mjs';
import { LOAD } from './fail-reporter.mjs';
import { SCRIPT, baseRed, reachers, startBase, testId } from './basered.mjs';
import { layerMode, layerOfBranch } from './layerbase.mjs';
import { layerCover } from './layerflow.mjs';
import { buildGenerated, committedGenerated, entryChecks, generatedRows, ignoredHere, ignoreLines, importFindings, isGenerated, refreshCheck, refreshOthers, regenerate, removedGenerated, verifyUntracked } from './checks.mjs';
import { webCommitByOwner } from './record.mjs';
import { isBootstrap, lastConfigAt, unanchored } from './anchor.mjs';
import { CONFIG_FILE, NO_TOKENS, configOf, exists, fail, gh, git, isRecordOrLane, isRecordPath, laneOnly, loadConfig, now, repoSlug, underPath, withTemp } from './util.mjs';

const ghIO = { comments, addComment, getPR, verify: (slug, r, ctx) => verifyRow(slug, r, ctx), lookup: (args, o) => gh(args, o) };
const MINUTE = 60000;
// The product's code runs in child processes without the workflow's token (runSuite, install).
export { NO_TOKENS };

// The ledger entries at ref; a read failure is an error, unreadable JSON is checkLedger's finding.
export const entriesAt = (root, ref) => Object.values(readLedgerTexts(root, ref)).flatMap((t) => { try { const e = JSON.parse(t); return e ? [e] : []; } catch { return []; } });

// No rename detection: a rename lists both the removed and the added path (confirming review
// of PR 14).
export const diffNames = (root, a, b, paths = []) => git(['diff', '--no-renames', '--name-only', '-z', a, b, '--', ...paths], { cwd: root }).split('\0').filter(Boolean);
export const isAnc = (root, a, b) => typeof a === 'string' && /^[0-9a-f]{40}$/.test(a) && git(['merge-base', '--is-ancestor', a, b], { cwd: root, allowFail: true }).code === 0;
const F = (check, file, message, line = 1) => ({ check, file, line, message });
export const PASS_BRANCH = /^pass\/[A-Za-z0-9._-]+$/;
const inModule = (e, f) => [...e.paths, ...e.tests].some((p) => underPath(f, p));
// A job strikes the marks it meets in its requirements file, so that file is its own too.
export const ownPaths = (e) => [...e.paths, ...e.tests, ...(e.requirements ? [e.requirements] : []), entryFile(e.id), metricsFile(e.id)];

// The comment for one gate run: the lead line and the row, as job post writes it.
export const gateComment = (r) => block(GATE, { runs: [r] }, `Gate run on \`${String(r.sha).slice(0, 10)}\`: ${r.ok ? 'green' : `red, ${r.findings} finding(s)`}, ${r.trigger}, ${r.minutes} min.`);

// The config the gate runs with: the base's, the trusted side. At the first close (bootstrap: a
// base with no Process3, anchor.mjs) the base has none, so the defaults would install no lock
// file and build no generated row: a false red for every module the tranche cover leaves to its
// suite (review of PR 96). Then only, for the tranche its own config names, the head's RUN_KEYS
// are taken over the defaults, once its tranche, approvals and process_repo each are the default
// or took their value at the default owner's website commit, as merge --plain holds the first
// close (anchor.mjs unanchored). Safe because these say only how the suite runs, never what is
// trusted: the suite, its tests, the lock files it installs and the generators it runs are the
// head's code whatever the config says, so a head config can make the gate install or build
// more, never pass a test that fails; the records (the fast paths), the owner and the receipt
// stay the defaults'. The tranche is anchored, so the cover may read it. A head config that fails
// the anchor is a finding, and the gate runs with the defaults.
export const RUN_KEYS = ['tranche', 'lockfiles', 'generated', 'suite_timeout_minutes'];
export function gateConfig(root, { base, head, branch, slug, io = ghIO }) {
  // A base that deleted its config is read by its last one, as merge reads it (review 5 of PR 97).
  const cfg = loadConfig(root, lastConfigAt(root, base) || base);
  if (!isBootstrap(root, base) || !exists(root, head, CONFIG_FILE)) return { cfg, findings: [] };
  let raw;
  try { loadConfig(root, head); raw = JSON.parse(git(['show', `${head}:${CONFIG_FILE}`], { cwd: root })); } catch (e) {
    return { cfg, findings: [F('config', CONFIG_FILE, `the base has no Process3, and the head's ${CONFIG_FILE} cannot be read (${e.message}); the gate runs with the defaults`)] };
  }
  if (branch !== (raw.tranche ?? cfg.tranche)) return { cfg, findings: [] };
  const key = unanchored(root, base, head, (c) => webCommitByOwner(root, c, cfg.approvals.owner, io.lookup || gh, slug));
  if (key) return { cfg, findings: [F('config', CONFIG_FILE, `the base has no Process3, and the head changes ${key} without the owner's website commit; the gate runs with the defaults`)] };
  // Checked again over the defaults' records, which the head's run keys may overlap (review 2 of PR 97).
  try { return { cfg: configOf(Object.fromEntries(RUN_KEYS.filter((k) => raw[k] !== undefined).map((k) => [k, raw[k]])), `the head's ${CONFIG_FILE}`), findings: [], bootstrap: true }; } catch (e) {
    return { cfg, findings: [F('config', CONFIG_FILE, `the base has no Process3, and the head's run keys cannot be used (${e.message}); the gate runs with the defaults`)] };
  }
}

// The gate never posts: its token can only read, and job post writes the comment from the run's
// artifact (setup audit, 2 Nov).
export function gate(root, opts) {
  const { base, head, branch: eventBranch, pr, draft: eventDraft = false, started = Date.now(), io = ghIO, exec, log = console.log } = opts;
  const slug = opts.slug || repoSlug(root);
  const { cfg, findings, bootstrap } = gateConfig(root, { base, head, branch: eventBranch, slug, io }); // the trusted side
  if (bootstrap) log(`the base has no Process3: the gate runs with the head's ${RUN_KEYS.join(', ')}, its anchored keys held`);
  const timeout = (cfg.suite_timeout_minutes || 20) * MINUTE;
  const mb = git(['merge-base', head, base], { cwd: root });
  const changed = diffNames(root, mb, head);
  let gatePassed = null; // what the gate's own suite run saw pass, by file (the receipt check, AUD-2/JOB-7)
  // tree: what this run tests, the checkout (GitHub's merge of the head into the base) as it is
  // before anything runs.
  const tree = git(['rev-parse', 'HEAD^{tree}'], { cwd: root });
  const runRow = { sha: head, base, tree, at: now(), run_id: process.env.GITHUB_RUN_ID ? Number(process.env.GITHUB_RUN_ID) : null, trigger: null, suite: 'skipped', revert: 'skipped', receipt: 'not checked', receipt_attempt: null };
  // The pull request as it is now. Its draft state is read live, not from the event (the gate
  // race, measured on the copy 4 Nov, PRs 55, 61, 62, 63): job complete pushes, then marks
  // ready, so one head gets a synchronize run whose payload says draft and a ready_for_review
  // run, created in the same second; the concurrency group keeps one, and when the push's run
  // was kept it skipped the suite and the receipt, and a re-run replays the same payload. Read
  // live, whichever run is kept judges the pull request as it is. A failed read stops the run.
  const live = pr ? io.getPR(slug, pr) : null;
  const entries = entriesAt(root, head);
  const branch = eventBranch;
  // The commit the static checks read (ledger, start row, imports, generated).
  const judged = head;
  const draft = typeof live?.draft === 'boolean' ? live.draft : eventDraft;
  if (draft !== eventDraft) {
    // Kept in the row too, so a run the race touched is visible without its log (review 1 of PR 74).
    runRow.event_draft = eventDraft;
    log(`the pull request is ${draft ? 'a draft' : 'ready'} now; the event said ${eventDraft ? 'draft' : 'ready'}: the gate judges it as it is now`);
  }
  const all = !pr ? [] : io.comments(slug, pr);
  const prior = gateRuns(all);
  // The receipt is read only from the pull request's opener (review of PR 13).
  const receipt = pr ? latestReceipt(all, opts.opener ?? live?.user?.login) : null;

  const job = branchModule(branch, new Set(entries.map((e) => e.id)));
  const entry = job ? entries.find((e) => e.id === job) || null : null;
  if (job && !entry) findings.push(F('ledger', entryFile(job), `branch ${branch} has no ledger entry`));
  // The job's branch is the one its latest start row names (a --fresh-branch start's job/<id>-<n>).
  const named = entry && startBranch(rowsAt(root, judged, job), job);
  if (named && named !== branch) findings.push(F('ledger', metricsFile(job), `branch ${branch} is not job ${job}'s branch: its latest start row names ${named}`));
  // A job PR into a layer branch may carry its own entry from the tranche, the ledger's home.
  const home = job && layerMode(cfg) && layerOfBranch(live?.base?.ref) !== null ? homeRef(root, cfg.tranche) : null;
  findings.push(...checkLedger(root, { ref: judged, base: mb, branch, home }));

  // A job writes only its module's files and tests, and its own records (ARC-2).
  if (entry) {
    for (const f of changed) if (!ownPaths(entry).some((p) => underPath(f, p))) findings.push(F('ownership', f, `job ${job} may not change files outside its module`));
  }
  // ARC-1: its imports are its own module or its declared uses. JOB-8: no generated artifact.
  const gen = generatedRows(cfg);
  findings.push(...gen.findings);
  if (entry) {
    const im = importFindings(root, cfg, { base, head: judged, entry, changed });
    if (im.skipped) { runRow.imports = 'skipped'; log(im.skipped); } else runRow.imports = im.findings.length ? 'fail' : 'pass';
    findings.push(...im.findings, ...committedGenerated(root, gen.rows, { head: judged, changed }));
  }

  // A plain pull request (not the tranche's own) that changes a generated file a module owns is a
  // refresh: every generated file it changes is removed, regenerated and compared, the ones no
  // module owns too, since a generator may read them (review 3 of PR 95). A plain pull request
  // that changes only generated files no module owns merges as any file does, unchecked here.
  const genChanged = !job && branch !== cfg.tranche ? changed.filter((f) => isGenerated(gen.rows, f)) : [];
  const plain = !job && branch !== cfg.tranche ? (genChanged.some((f) => entries.some((e) => inModule(e, f))) ? genChanged : []) : null;
  // Untracking (build untrack-generated): a removed generated file the head's .gitignore ignores
  // is built and verified, not compared; the .gitignore lines added for it are not other files.
  const untracked = plain?.length ? removedGenerated(root, gen.rows, plain, head).filter((f) => ignoredHere(root, f)) : [];
  const ignores = untracked.length ? ignoreLines(root, mb, head, changed, untracked) : [];
  // A pass (P7, Bob's Keep and Drop, 3 Nov: a no-judgment change across many modules is one
  // mechanical pass while no job runs, with one full test run), from a pass/<name> branch, which
  // only merge --plain --pass lands: each module it touches runs its whole suite, and its refresh
  // may change other files.
  const passPR = !job && PASS_BRANCH.test(branch || '');
  if (passPR) runRow.pass = true;
  // A lane's pull request (lane.mjs; Bob, 5 Nov): every file inside one lane's folder, records
  // aside, and not a job's nor the tranche's: the records-only path, no suite, no install or
  // build; the record checks above still run. A generated output is built, never committed.
  const lanePR = !job && branch !== cfg.tranche ? laneOnly(cfg, changed, entries) : null;
  if (lanePR) {
    runRow.lane = lanePR;
    for (const f of changed.filter((x) => isGenerated(gen.rows, x) && exists(root, head, x))) findings.push(F('generated', f, `${f} is a generated output; lane ${lanePR} does not commit it: it is built at layer close, deploy and release`));
  }
  // A ready job PR into a layer branch (layerflow.mjs) runs its suite even when it changes only
  // records: a rescheduled user re-publishes with no code change, and its run on the new layer tip,
  // against its provider's new version, is the evidence the layer's merge reads (cold review 1).
  const layerJob = !!job && layerMode(cfg) && layerOfBranch(live?.base?.ref) !== null;
  const recordOnly = !(layerJob && !draft) && (changed.every((f) => isRecordPath(cfg, f)) || !!lanePR);
  // The fast path stands on an earlier green run only when that run is verified (verifyRow).
  const lastGreen = prior.filter((r) => r.ok && r.trigger === 'code' && r.base === base).reverse().find((r) => io.verify(slug, r, { pr, baseRef: cfg.tranche }));
  const sinceGreen = lastGreen && git(['cat-file', '-e', `${lastGreen.sha}^{commit}`], { cwd: root, allowFail: true }).code === 0
    // A lane's folder counts as records here: a lane's land between a job's green run and its
    // merge does not send the job back through its suite (Bob, 5 Nov).
    && diffNames(root, lastGreen.sha, head).every((f) => isRecordOrLane(cfg, f, entries, { self: job }));

  // The base the job's change is reverted to: the first parent of GitHub's merge checkout,
  // the tranche as it was merged with, else the event's base.
  const parents = git(['rev-list', '--parents', '-n', '1', 'HEAD'], { cwd: root }).split(' ').slice(1);
  const revertBase = parents.length === 2 && parents[1] === head ? parents[0] : base;

  // A ready job's receipt is checked against CI's own run of its tests (AUD-2, JOB-7, SES-12).
  // Records only, the fast path stands only on a green code run that measured what the receipt
  // claims (measuredBy); with no such run the gate runs the suite here, so a records-only job pull
  // request, or a records-only head after a code run on another tree, is still checked. A plain
  // pull request, or a job's with no receipt yet, keeps the record fast path.
  const jobReceipt = entry && !draft && receipt?.module === job ? receipt : null;
  const stands = jobReceipt && sinceGreen && git(['merge-base', '--is-ancestor', jobReceipt.sha, head], { cwd: root, allowFail: true }).code === 0
    ? measuredBy(root, cfg, jobReceipt, lastGreen, entries) : null;
  const receiptRun = !!jobReceipt && (recordOnly || sinceGreen) && !stands?.ok;
  // The revert exemption (AUD-1, JOB-12): only a reviewed one recorded on the pull request, never
  // the receipt's own words (a receipt never exempts itself).
  const exemption = entry && !draft ? revertExemption(all, { root, cfg, head: judged, entry, job, jobSession: completeSession(rowsAt(root, judged, job)) }) : null;

  // The shared layer branch's merge (layerflow.mjs; Bob, 5 Nov: no test run at layer close): a pull
  // request from layer/<n> into the tranche, with the base's merge_strategy "layer", runs no suite;
  // each module it changes must be covered by its last land's verified green gate run, on a head
  // that held every interface change of its providers. Anything short is a finding, never a re-run.
  const layerPR = !job && layerMode(cfg) && layerOfBranch(branch) !== null && (live?.base?.ref ?? null) === cfg.tranche;
  if (recordOnly && !jobReceipt) runRow.trigger = 'record';
  else if (draft) runRow.trigger = 'draft';
  else if (layerPR) {
    runRow.trigger = 'layer';
    const lc = layerCover(root, cfg, { head, mb, branch, changed, entries, slug, io });
    runRow.layer = { n: layerOfBranch(branch), covered: lc.covered.map((c) => c.id), findings: lc.findings.length };
    for (const c of lc.covered) log(`${c.id}: covered by its land of PR ${c.pr} (${String(c.merge).slice(0, 10)}); no suite runs`);
    findings.push(...lc.findings);
  }
  else if (sinceGreen && !receiptRun) { runRow.trigger = 'record-since-green'; runRow.after = lastGreen.sha; }
  else {
    runRow.trigger = 'code';
    if (receiptRun) log(`only records changed${sinceGreen ? ` since ${String(lastGreen.sha).slice(0, 10)}` : ''}, but no green code run measured receipt attempt ${jobReceipt.attempt}${stands ? ` (${stands.why})` : ''}: the gate runs the ${job} suite to check it`);
    // A job's PR runs its module; any other PR runs every module whose files it touches. The
    // tranche (into main) runs only the modules with a file its job merges did not gate.
    let touched = changed;
    if (!entry && branch && branch === cfg.tranche) {
      const c = trancheCover(root, cfg, { head, mb, changed, entries, slug, io, log });
      touched = c.uncovered;
      runRow.through = c.through;
      runRow.uncovered = c.uncovered.length;
    }
    const scope = entry ? [entry] : entries.filter((e) => touched.some((f) => inModule(e, f)));
    runRow.scope = scope.map((e) => e.id);
    // Base-red's tree (basered.mjs startBase): its install and build beside the head's, ready if
    // the suite fails. Not for the tranche into main, which tolerates nothing, nor with a stand-in
    // exec (the tests'), which a process of its own cannot use.
    // A change only to a module's requirements file runs only the tests that read it: read here
    // to know whether a suite runs at all, and again once the generated files are built.
    // Not for a job PR into a layer branch: its land must carry a run of the whole suite, which
    // the layer's merge reads (confirming review N1).
    const onlyAt = (e, l = () => {}) => (branch !== cfg.tranche && !layerJob && !passPR ? requirementsOnly(root, cfg, e, { changed, rows: gen.rows, log: l }) : null);
    // Only a suite whose failures can be read per test can be base-red.
    const mayBaseRed = scope.some((e) => reportsEvents(e.suite.command) && (onlyAt(e) === null || onlyAt(e).length));
    const prepared = mayBaseRed && branch !== cfg.tranche && !exec && opts.prepareBase !== false
      ? startBase(root, { base: revertBase, cfg, rows: gen.rows, timeout, log }) : null;
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
    const tolerated = [];
    for (const e of scope) {
      const only = onlyAt(e, log);
      if (only && !only.length) { (runRow.requirements_only ||= []).push({ module: e.id, files: [] }); results.push({ exit: 0, seconds: 0, tests: { total: 0, pass: 0, fail: 0 }, passing: [], output: '' }); continue; }
      if (only) (runRow.requirements_only ||= []).push({ module: e.id, files: only });
      const s = withEvents((events) => runSuite(root, e, only || undefined, { timeout, events }));
      results.push(s);
      if (s.exit !== 0) {
        // Base-red (basered.mjs): the failing tests run again at the tranche tip the PR merges
        // into; failures the base has too are not the PR's. Never for the tranche into main,
        // where every failure tolerated on the way is owed.
        // Its own budget, not what the suite left (copy, 4 Nov: plane's suite takes 19-20 of 20 min).
        const br = branch !== cfg.tranche && !/ETIMEDOUT/.test(s.output)
          ? baseRed(root, e, { base: revertBase, failing: s.failing, cfg, rows: gen.rows, timeout, ...(exec ? { exec } : {}), log, prepared })
          : null;
        if (br?.ok) {
          s.baseRed = true;
          tolerated.push({ module: e.id, ...br.base_red });
          log(`the ${e.id} suite failed (exit ${s.exit}), but each of its ${br.base_red.tests.length} failing test(s) fails at the base ${String(revertBase).slice(0, 10)} too: tolerated as base-red, owed at the layer close and the tranche into main:\n${br.base_red.tests.map((t) => `  ${t}`).join('\n')}`);
          continue;
        }
        findings.push(F('suite', e.tests[0], `the ${e.id} suite failed (exit ${s.exit}${/ETIMEDOUT/.test(s.output) ? ', timed out' : ''}): ${JSON.stringify(s.tests)}${br ? `; not base-red: ${br.why}` : ''}`));
        log(s.output.split('\n').slice(-60).join('\n'));
      } else if (!s.tests.total) findings.push(F('suite', e.tests[0], `zero tests ran in ${e.id}`));
    }
    if (tolerated.length) runRow.base_red = tolerated;
    gatePassed = passedByFile(results);
    prepared?.drop();
    if (scope.length) {
      runRow.suite = results.every((s) => s.exit === 0) ? 'pass' : results.every((s) => s.exit === 0 || s.baseRed) ? 'base-red' : 'fail';
      runRow.tests = results.map((s) => s.tests);
      runRow.suite_seconds = results.reduce((t, s) => t + s.seconds, 0);
    }
    // AUD-1, JOB-12: the job's new or changed tests must fail with its change reverted. A test
    // that still passes (inert) fails the gate. A refactor whose tests rightly pass before and
    // after takes a reviewed exemption recorded on its pull request (revertExemption); the
    // receipt's own --exempt-revert is the job's request for one, never the exemption itself.
    if (entry && ['pass', 'base-red'].includes(runRow.suite)) {
      const tests = changed.filter((f) => entry.tests.some((t) => underPath(f, t)) && f.endsWith(suffixOf(entry)) && existsSync(join(root, f)));
      // The requirements file's struck marks are not code: reverting them proves nothing.
      const code = changed.filter((f) => !isRecordPath(cfg, f) && f !== entry.requirements && !entry.tests.some((t) => underPath(f, t)));
      if (!code.length) runRow.revert = 'no code changed';
      else if (!tests.length) runRow.revert = 'no test changed';
      else if (exemption?.ok) {
        // The reviewed exemption decides the verdict whatever the run would find: not run (build gate-speed).
        runRow.revert = 'exempt';
        runRow.revert_exempt = { by: exemption.by, sha: exemption.sha };
        log(`the revert check is exempt by ${printable(exemption.by, 60)}'s reviewed exemption on ${String(exemption.sha).slice(0, 10)} (${printable(exemption.why)}): not run`);
      } else {
        if (exemption) log(`the revert exemption on this pull request does not stand: ${exemption.why}`);
        const t0 = Date.now();
        const r = revertCheck(root, entry, revertBase, code, tests, { timeout, tolerated: (runRow.base_red || []).flatMap((b) => b.tests) });
        log(`revert check: ${tests.length} test file(s) in ${Math.round((Date.now() - t0) / 1000)} s, ${r.alone} run alone`);
        runRow.revert = r.inert.length ? 'fail' : 'pass';
        runRow.inert = r.inert;
        // A test that fails only because a new file is gone cannot load; it is not proof the
        // test checks behaviour. Counted for review, not failed.
        runRow.load_only = r.loadOnly;
        const asked = receipt?.module === job ? receipt.exempt?.revert : undefined;
        for (const t of r.inert) findings.push(F('revert', t, `passes with the change reverted: the test does not test the change (AUD-1, JOB-12)${asked ? `; the receipt asks for an exemption (${printable(asked)}), which stands only as a reviewed one on the pull request: ${P3_EXEMPT}` : ''}`));
      }
    }
    // GAT-4: regenerate every generated row, verify those whose paths changed; nothing committed.
    if (scope.length && gen.rows.length) {
      // A refreshed file is removed first, so a clean status after the regenerate means the
      // regenerate wrote those bytes, not that it left the commit's own (review 1 of PR 95).
      if (plain?.length) for (const f of plain) rmSync(join(root, f), { force: true });
      // A row built before the suite runs again when it writes a refreshed file just removed.
      const g = regenerate(root, gen.rows, { timeout, log, skip: plain?.length ? new Set([...builtRows].filter((r) => !plain.some((f) => isGenerated([r], f)))) : builtRows });
      runRow.generated = g.ran;
      findings.push(...g.findings);
    }
    // A plain pull request may change a module's committed generated files only to what this
    // regenerate wrote from its commit (copy PR 148); the row records the comparison, and merge
    // --plain reads it.
    if (plain) {
      if (untracked.length && runRow.generated) findings.push(...verifyUntracked(root, gen.rows, untracked, { timeout, log, ...(exec ? { exec } : {}) }));
      const c = refreshCheck(root, plain, { ran: !!runRow.generated, failed: findings.some((f) => f.check === 'generated'), others: passPR ? [] : refreshOthers(cfg, gen.rows, changed, entriesAt(root, base), ignores), untracked });
      if (c.refresh) runRow.refresh = c.refresh;
      findings.push(...c.findings);
    }
  }
  // Only records changed since the green code run: its comparison stands for these same files.
  // Not when a generated file is among them (a generated path under a records path): its bytes
  // changed after that comparison (review 4 of PR 95).
  if (runRow.trigger === 'record-since-green' && plain?.length && lastGreen.refresh
    && !diffNames(root, lastGreen.sha, head).some((f) => isGenerated(gen.rows, f))) runRow.refresh = lastGreen.refresh;

  // The receipt against CI's own run of its tests (AUD-2, JOB-7): present, naming a commit on this
  // branch, agreeing on the suite and on each test it names. A disagreement is a finding and
  // refutes the COMPLETE claim (metrics.mjs refutes, SES-12).
  if (job && !draft && runRow.trigger !== 'record') {
    if (!receipt || receipt.module !== job) {
      runRow.receipt = 'none';
      findings.push(F('receipt', entryFile(job), 'the pull request is ready but has no receipt (job complete posts it)'));
    } else {
      runRow.receipt_attempt = receipt.attempt;
      const onBranch = git(['merge-base', '--is-ancestor', receipt.sha, head], { cwd: root, allowFail: true }).code === 0;
      const claimed = receipt.commands?.find((c) => c.suite);
      if (!onBranch) findings.push(F('receipt', entryFile(job), `the receipt names ${String(receipt.sha).slice(0, 10)}, which is not on this branch`));
      // Records only since the last green code run (copy PR 105, 4 Nov: a receipt-only commit after
      // a green code gate): the receipt is checked against that run when it was made on the tree
      // that run tested, so the claim is of the same tree, suite and results.
      const measured = onBranch && runRow.trigger === 'record-since-green' ? measuredBy(root, cfg, receipt, lastGreen, entries) : null;
      const suite = measured?.ok ? lastGreen.suite : runRow.suite;
      if (measured?.ok) runRow.receipt_measured = lastGreen.sha;
      else if (measured) runRow.receipt_unmeasured = measured.why;
      const red = measured?.ok ? lastGreen.base_red : runRow.base_red;
      // The excused tests the gate's run saw pass (copy plane PR 175: three failed in the job's
      // container and passed on the runner); kept in the row for a records-only run after it.
      const passed = measured?.ok ? (Array.isArray(lastGreen.receipt_passed) ? lastGreen.receipt_passed : [])
        : [...new Set(claimedRed(claimed))].filter((t) => gatePassed?.ids.has(t));
      if (!measured?.ok && passed.length) runRow.receipt_passed = passed;
      // The tests the receipt names for its struck marks, against what CI's run saw: one that ran
      // and failed there disagrees (namedVerdict). A measured run kept those it did not refute.
      const named = namedTests(receipt);
      const confirmed = measured?.ok ? (Array.isArray(lastGreen.receipt_tests) ? lastGreen.receipt_tests : []) : null;
      const unpassed = confirmed ? named.filter((t) => !confirmed.includes(t)) : named.filter((t) => namedVerdict(gatePassed, t, redIds(runRow.base_red)) === 'fail');
      // Kept for a records-only run after this one: the named tests this run did not refute.
      if (!confirmed && named.length) runRow.receipt_tests = named.filter((t) => !unpassed.includes(t));
      runRow.receipt = !onBranch ? 'wrong commit'
        : measured && !measured.ok ? 'unmeasured'
          : suite === 'skipped' ? 'present' : receiptAgrees(claimed, suite, red, passed) && !unpassed.length ? 'agrees' : 'disagrees';
      const unexplained = [...new Set(claimedRed(claimed))].filter((t) => !redIds(red).includes(t) && !passed.includes(t));
      if (runRow.receipt === 'disagrees') {
        const what = !receiptAgrees(claimed, suite, red, passed)
          ? `the receipt claims the suite ${claimText(claimed)}; the gate's run${measured?.ok ? ` on ${String(lastGreen.sha).slice(0, 10)}` : ''} ${suite === 'pass' ? 'passed' : suite === 'base-red' ? `failed only on tests that fail at the base too${unexplained.length ? `, and the receipt excuses ${unexplained.length} that neither fail at the base nor passed in the gate's run: ${unexplained.join('; ')}` : `, these ${redIds(red).length}: ${redIds(red).join('; ')}`}` : 'failed'}`
          : `the receipt names ${unpassed.length} test(s) for its marks that did not pass in the gate's run: ${unpassed.slice(0, 5).join('; ')}`;
        findings.push(F('receipt', entryFile(job), `${what} (AUD-2, JOB-7: a disagreement refutes the COMPLETE claim, SES-12)`));
      }
      if (runRow.receipt === 'unmeasured') log(`receipt attempt ${receipt.attempt} is not checked: ${measured.why}`);
    }
  }

  runRow.findings = findings.length;
  runRow.ok = findings.length === 0;
  runRow.minutes = Math.round(((Date.now() - started) / MINUTE) * 100) / 100;
  return { run: runRow, findings, changed };
}

const committed = (root, sha) => /^[0-9a-f]{40}$/.test(String(sha)) && git(['cat-file', '-e', `${sha}^{commit}`], { cwd: root, allowFail: true }).code === 0;
// The receipt against the gate's suite (AUD-2, JOB-7). A receipt with no suite command (job
// complete runs no suite in the session: AUD-7, PLT-4, JOB-5) claims the suite passes in CI. A
// base-red suite (basered.mjs) agrees with a receipt whose suite passed or excused only tests the
// gate found failing at the base (copy PR 291) or saw pass itself (copy plane PR 175). A test the
// gate saw failing is base-red there, or the suite is not base-red. A receipt never exempts
// itself: what it excuses counts only as the gate's own run bears it out.
const claimedRed = (c) => (Array.isArray(c?.base_red) ? c.base_red.filter((t) => typeof t === 'string' && /^[^:]+::./.test(t)) : []);
const redIds = (rows) => (Array.isArray(rows) ? rows.flatMap((r) => (Array.isArray(r?.tests) ? r.tests : [])) : []);
const claimOf = (c) => (!c || c.exit === 0 ? 'pass' : claimedRed(c).length ? 'base-red' : 'fail');
const claimText = (c) => ({ pass: c ? 'passed' : 'passes (no suite run in the session)', 'base-red': 'failed only on base-red tests', fail: 'failed' })[claimOf(c)];
export function receiptAgrees(claimed, suite, red, passed = []) {
  const claim = claimOf(claimed);
  if (claim === suite) return claim !== 'base-red' || claimedRed(claimed).every((t) => redIds(red).includes(t) || passed.includes(t));
  if (suite === 'base-red' && claim === 'pass') return true;
  return suite === 'pass' && claim === 'base-red';
}

// The tests a receipt names for its struck marks, as "<file>::<name>".
export const namedTests = (receipt) => [...new Set((Array.isArray(receipt?.tests) ? receipt.tests : [])
  .filter((t) => typeof t?.file === 'string' && typeof t?.name === 'string' && t.name).map((t) => `${t.file}::${t.name}`))];

// What the gate's suite run saw, by file: the passing ids (receipt_passed) and each file's passing
// and failing names (namedVerdict). Null when no run's results could be read per test.
export function passedByFile(results) {
  const ids = new Set();
  const byFile = new Map();
  let read = false;
  for (const s of results) {
    if (!Array.isArray(s.passing) || !Array.isArray(s.failing)) continue;
    read = true;
    for (const [list, k] of [[s.passing, 'pass'], [s.failing, 'fail']]) {
      for (const t of list) {
        if (k === 'pass') ids.add(testId(t));
        if (!byFile.has(t.file)) byFile.set(t.file, { pass: [], fail: [] });
        byFile.get(t.file)[k].push(t.name);
      }
    }
    for (const f of s.whole || []) { if (!byFile.has(f)) byFile.set(f, { pass: [], fail: [] }); byFile.get(f).whole = true; }
  }
  return read ? { ids, byFile } : null;
}

// A named test against the gate's run: 'fail' when its file ran and the test (by its name, or its
// name under describes) failed, or the file failed as a whole and is not tolerated as base-red;
// 'pass' when it passed; null when the run says nothing of it (its file did not run, or no test
// has the name: job complete checks only that the file contains it). Only 'fail' disagrees.
const escName = (x) => x.replace(/\\/g, '\\\\').replace(/>/g, '\\>');
export function namedVerdict(g, t, tolerated = []) {
  const at = t.indexOf('::');
  const file = t.slice(0, at);
  const f = g?.byFile.get(file);
  if (!f) return null;
  const name = t.slice(at + 2);
  // The test itself, or one nested under describes: never a longer name that holds it.
  const holds = (x) => [name, escName(name)].some((n) => x === n || x.endsWith(` > ${n}`));
  // A failure tolerated as base-red is not the named test's (another describe's test of that name).
  const failed = f.fail.some((x) => holds(x) && !tolerated.includes(`${file}::${x}`));
  if (failed) return 'fail';
  if (f.pass.some(holds)) return 'pass';
  // A file that failed as a whole ran none of its tests; tolerated as base-red, the run says nothing of them.
  return f.whole && !tolerated.some((x) => String(x).startsWith(`${file}::`)) ? 'fail' : null;
}

// Whether the last green code run measured what a receipt claims: the receipt was made on a
// commit whose files, records aside, are that run's (the same tree, so the same suite and
// results) or that run checked this same attempt, it ran the job's suite and agreed with a receipt, and it neither refuted nor
// left unread a test this receipt names or excuses. { ok } or { ok: false, why }.
export function measuredBy(root, cfg, receipt, green, entries = []) {
  const job = receipt.module;
  const at = String(green.sha).slice(0, 10);
  if (!(Array.isArray(green.scope) && green.scope.includes(job)) || !['pass', 'fail', 'base-red'].includes(green.suite)) return { ok: false, why: `the last green code run, on ${at}, did not run the ${job} suite` };
  if (green.receipt !== 'agrees') return { ok: false, why: `the last green code run, on ${at}, checked no receipt` };
  // That run checked this very attempt (its claims are the same whatever amends it), or this
  // receipt was made on the tree that run tested, records aside. Without the first, a receipt
  // older than the head's code would send every records-only head through the suite (cold review).
  const checked = Number.isInteger(receipt.attempt) && green.receipt_attempt === receipt.attempt;
  const same = checked || (git(['cat-file', '-e', `${receipt.sha}^{commit}`], { cwd: root, allowFail: true }).code === 0
    && diffNames(root, green.sha, receipt.sha).every((f) => isRecordOrLane(cfg, f, entries, { self: job })));
  if (!same) return { ok: false, why: `it names ${String(receipt.sha).slice(0, 10)}, whose code is not what the last green code run, on ${at}, tested` };
  const kept = Array.isArray(green.receipt_passed) ? green.receipt_passed : [];
  const unknown = [...new Set(claimedRed(receipt.commands?.find((c) => c.suite)))].filter((t) => !redIds(green.base_red).includes(t) && !kept.includes(t));
  if (unknown.length) return { ok: false, why: `it excuses ${unknown.length} test(s) the last green code run, on ${at}, neither found base-red nor kept as passing: ${unknown.slice(0, 5).join('; ')}` };
  const seen = Array.isArray(green.receipt_tests) ? green.receipt_tests : [];
  const unseen = namedTests(receipt).filter((t) => !seen.includes(t));
  if (unseen.length) return { ok: false, why: `it names ${unseen.length} test(s) the last green code run, on ${at}, did not check: ${unseen.slice(0, 5).join('; ')}` };
  return { ok: true };
}

// The reviewed revert exemption (AUD-1, JOB-12): a refactor whose tests rightly pass before and
// after the change. Recorded on the pull request by `revert exempt` (job.mjs), a p3:revert-exempt
// block naming its reviewer, its reason and the head it reviewed. It stands when its reviewer is
// not the job's own session (a receipt, or the job, never exempts itself) and the job's own files
// (its module's paths and tests, records and requirements aside) are as the reviewed commit had
// them, so the code reviewed is the code tested. The newest block that stands wins; withdrawing
// one means deleting its comment. The reviewer and the job's session are the sessions' own words
// (the complete row, written on the job's branch): the gate cannot prove who posted a block.
// { ok, by, sha, why }, { ok: false, why }, or null when none is recorded.
export const P3_EXEMPT = 'p3 revert exempt <pr> --why "<why>" --reviewer <session>, by a reviewer that is not the job';
export const completeSession = (rows) => (rows || []).filter((r) => r.row === 'attempt' && r.event === 'complete').pop()?.session || null;
export function revertExemption(all, { root, cfg, head, entry, job, jobSession = null }) {
  // Never an edited comment (its block could be pointed at another commit), as gateRuns reads rows.
  const blocks = (all || []).filter((c) => !c.updated_at || c.updated_at === c.created_at)
    .map((c) => parseBlock(c.body, REVERT_EXEMPT)).filter(Boolean).reverse();
  if (!blocks.length) return null;
  const sf = (x) => String(x).trim().replace(/^cse_/, 'session_');
  const own = entry ? ownPaths(entry) : [];
  const judge = (x) => {
    const no = (why) => ({ ok: false, why });
    const by = typeof x.reviewer === 'string' ? x.reviewer.trim() : '';
    if (!by || typeof x.why !== 'string' || !x.why.trim()) return no('it names no reviewer or no reason');
    if (x.module !== job) return no(`it is for ${printable(x.module, 40)}, not ${job}`);
    // Fails closed: with no job session recorded, a reviewer cannot be told from the job.
    if (!jobSession) return no(`${job}'s complete row records no session, so its reviewer cannot be told from the job (job complete --session <id>)`);
    if (sf(by) === sf(jobSession)) return no(`its reviewer ${printable(by, 60)} is the job's own session: a job never exempts itself`);
    if (!committed(root, x.sha)) return no(`it names ${printable(x.sha, 40)}, which is no commit here`);
    // The job's own code as reviewed: the tranche merged in since (job sync, merge) changes other modules' files only.
    const off = diffNames(root, x.sha, head).filter((f) => own.some((p) => underPath(f, p)) && !isRecordPath(cfg, f) && f !== entry.requirements);
    if (off.length) return no(`the job's code differs from ${String(x.sha).slice(0, 10)}, the commit reviewed, in ${off.length} file(s): ${off.slice(0, 5).join(', ')}`);
    return { ok: true, by, sha: x.sha, why: x.why };
  };
  // The newest block that stands; else why the newest does not.
  const verdicts = blocks.map(judge);
  return verdicts.find((v) => v.ok) || verdicts[0];
}

// The tranche into main (PR 89's report, 4 Nov): one gate job running every changed module's
// suite would pass its cap on a tranche of 30+ modules, so main could never merge. Every
// module file the tranche changes was last changed, on the tranche's first-parent history, by
// some commit. When that commit is a job's merge whose gate was green on the merged result, the
// file's state was tested there, and its suite is not run again: the gate names the job PR. Any
// other file (a plain pull request, a direct commit, a conflict resolved bringing main in, a
// merge that is not shown to be the gated result) falls back to its module's full suite.
// A job merge counts when: it is GitHub's merge of the pull request its title names ("Merge job
// PR <n>", as merge writes it), into the tranche, from job/<id>, whose head is the merge's second
// parent; the merge's tree is that head's tree and its first parent is in that head (merge
// brought the job up to the tranche, so nothing else came in); the head holds the merge row for
// <n>; the newest gate row on that head is green, verified (verifyRow, bound to the merged PR by
// its branch, head and base, since GitHub drops a merged PR from its runs), and ran the module's
// suite green (trigger code, or record-since-green after such a run); and the file is the
// job's own (ownPaths, from the tranche's entry before the merge) and no other module's. A covered
// module still runs when a module it uses changed on the tranche after its merge.
export const MERGE_TITLE = /^Merge job PR (\d+)$/;
export function trancheCover(root, cfg, { head, mb, changed, entries, slug, io, log = () => {} }) {
  const need = changed.filter((f) => !isRecordOrLane(cfg, f, entries) && entries.some((e) => inModule(e, f)));
  const last = new Map();
  const chain = need.length ? git(['rev-list', '--first-parent', head, '--not', mb], { cwd: root }).split('\n').filter(Boolean) : [];
  if (need.length) {
    const left = new Set(need);
    for (const c of chain) {
      if (!left.size) break;
      const p = git(['rev-list', '--parents', '-n', '1', c], { cwd: root }).split(' ').slice(1);
      if (!p.length) continue;
      for (const f of diffNames(root, p[0], c)) if (left.delete(f)) last.set(f, c);
    }
  }
  const judged = new Map();
  const judge = (c) => {
    if (!judged.has(c)) {
      let v;
      try { v = jobMerge(root, cfg, c, { slug, io }); } catch (e) { v = { ok: false, why: `could not be read (${printable(e.message, 200)})` }; }
      judged.set(c, v);
    }
    return judged.get(c);
  };
  // Each file's verdict: the job merge that gated it, or why its module's suite runs. A file
  // that lies in more than one module's paths is covered only when it is the job's own and no
  // other module's (review 1 of PR 92).
  const age = new Map(chain.map((c, i) => [c, i])); // 0 is the tranche's tip: smaller is newer
  const verdict = new Map();
  for (const f of need) {
    const c = last.get(f);
    const v = c ? judge(c) : { ok: false, why: 'no commit on the tranche changes it' };
    const others = entries.filter((e) => inModule(e, f) && e.id !== v.id).map((e) => e.id);
    verdict.set(f, v.ok && v.own.some((p) => underPath(f, p)) && !others.length ? { c, v }
      : { c, why: v.ok ? `is PR ${v.pr}'s merge, but the file is ${others.length ? `also ${others.join(', ')}'s` : `not ${v.id}'s own`}` : v.why });
  }
  // A module's gate at its job merge tested it with its providers as they were then. A provider
  // (in its uses, at any depth) whose files changed on the tranche after that merge was not
  // tested with it, so the module's suite runs (review 1 of PR 92: m1 uses m0; m0's job, merged
  // after m1's, broke m1, and the gate skipped m1).
  const byId = new Map(entries.map((e) => [e.id, e]));
  const filesOf = (id) => need.filter((f) => inModule(byId.get(id), f));
  const newest = (fs) => Math.min(...fs.map((f) => age.get(last.get(f)) ?? Infinity));
  const providers = (id, seen = new Set()) => {
    for (const u of byId.get(id)?.uses || []) if (u !== id && !seen.has(u) && byId.has(u)) { seen.add(u); providers(u, seen); }
    return seen;
  };
  for (const e of entries) {
    const fs = filesOf(e.id);
    if (!fs.length || !fs.every((f) => verdict.get(f).v)) continue;
    const tested = newest(fs);
    const moved = [...providers(e.id)].filter((u) => newest(filesOf(u)) < tested);
    if (moved.length) for (const f of fs) verdict.set(f, { c: last.get(f), why: `is a job merge, but ${moved.join(', ')}, which ${e.id} uses, changed after it` });
  }
  const uncovered = [];
  const through = new Map();
  for (const f of need) {
    const { c, v, why } = verdict.get(f);
    if (v) {
      log(`${f}: gated at its job's merge, PR ${v.pr} (${v.id}), merge ${c.slice(0, 10)}`);
      const t = through.get(v.pr) || { pr: v.pr, id: v.id, merge: c, files: 0 };
      t.files++;
      through.set(v.pr, t);
    } else {
      uncovered.push(f);
      log(`${f}: its suite runs: its last change on the tranche${c ? `, ${c.slice(0, 10)},` : ''} ${why}`);
    }
  }
  return { uncovered, through: [...through.values()].sort((a, b) => a.pr - b.pr) };
}

export function jobMerge(root, cfg, c, { slug, io }) {
  const no = (why) => ({ ok: false, why });
  const n = Number(git(['log', '-1', '--format=%s', c], { cwd: root }).match(MERGE_TITLE)?.[1]);
  if (!n) return no('is not a job merge');
  const p = git(['rev-list', '--parents', '-n', '1', c], { cwd: root }).split(' ').slice(1);
  if (p.length !== 2) return no(`names PR ${n} but is not a merge of two parents`);
  const [p1, p2] = p;
  if (git(['rev-parse', `${c}^{tree}`], { cwd: root }) !== git(['rev-parse', `${p2}^{tree}`], { cwd: root })
    || git(['merge-base', '--is-ancestor', p1, p2], { cwd: root, allowFail: true }).code !== 0) return no(`is PR ${n}'s merge, but not of a head brought up to the tranche`);
  const pr = io.getPR(slug, n);
  const id = branchModule(pr?.head?.ref, ledgerIds(root, p1));
  if (!pr?.merged || pr.merge_commit_sha !== c || pr.base?.ref !== cfg.tranche || !id || pr.head.sha !== p2 || pr.head.repo?.full_name !== slug) return no(`is not GitHub's merge of job PR ${n} into ${cfg.tranche}`);
  if (!rowsAt(root, p2, id).some((r) => r.row === 'merge' && r.pr === n)) return no(`is PR ${n}'s merge, but its head holds no merge row for it`);
  const branch = pr.head.ref;
  const runs = gateRuns(io.comments(slug, n));
  // The row is bound to the PR here: its run was on job/<id> (verifyRow); its commit is the PR's
  // head or an earlier commit of it; its base was the tranche, at or before the merge's.
  const ctx = { pr: n, baseRef: cfg.tranche, merged: { branch } };
  const bound = (r) => isAnc(root, r.sha, p2) && isAnc(root, r.base, p1) && io.verify(slug, r, ctx);
  // A base-red run (basered.mjs) does not cover: the tranche runs that suite again, tolerating nothing.
  // Nor does a run narrowed to the tests that read a requirements file (requirementsOnly): the
  // tranche runs that suite whole once (review of build gate-speed).
  const suiteRan = (r) => r?.ok && r.trigger === 'code' && r.suite === 'pass' && Array.isArray(r.scope) && r.scope.includes(id) && !(Array.isArray(r.requirements_only) && r.requirements_only.some((x) => x?.module === id));
  const row = runs.filter((r) => r.sha === p2).pop();
  if (!row || !row.ok || !bound(row)) return no(`is PR ${n}'s merge, but the newest gate run on its merged result ${p2.slice(0, 10)} is ${row ? (row.ok ? 'not bound to the PR or not verified' : 'red') : 'missing'}`);
  const tested = row.trigger === 'record-since-green'
    ? runs.filter((r) => r.sha === row.after).reverse().find((r) => suiteRan(r) && bound(r))
    : suiteRan(row) ? row : null;
  if (!tested) return no(`is PR ${n}'s merge, but no verified green run of the ${id} suite stands behind its merged result`);
  const e = git(['show', `${p1}:${entryFile(id)}`], { cwd: root, allowFail: true });
  if (e.code !== 0) return no(`is PR ${n}'s merge, but the tranche had no ledger entry for ${id}`);
  return { ok: true, pr: n, id, own: ownPaths(JSON.parse(e.stdout)) };
}

// A change only to a module's requirements file (build gate-speed, 5 Nov: copy PR 516 changed
// journey-check.md alone and ran journey-check's 57-minute suite). A requirements file is Markdown:
// nothing imports it, so it changes a test's result only by being read as text, and code that
// reads it names it: by its file name (journey-check.md), or by its directory's (requirements),
// from which a path to it is built. When the only files a pull request changes, records aside, are
// this module's requirements file (not for the tranche into main),
// the suite runs only its test files that reach, by import through the test paths (reachers), a
// script under its test paths whose code names either: the requirement-id tests. Code is the text
// but for comments that start a line. The whole suite runs instead when other code the suite runs
// names the file's own name: a file of the module's own paths (Markdown and the requirements file
// aside), a file the suite command preloads (--import, --require), a generator of the generated
// rows, or a script anywhere in the repository (records aside), since the module's tests run that
// code too and any of them could read it through it; or when a data file of its tests (a fixture)
// names either name. None reaching it: no test can see the change, and the suite is not run (a pass of
// none). The row names the narrowed modules (requirements_only), and such a run does not cover the
// module at the tranche into main (jobMerge): its whole suite runs there once, the backstop for
// a reader this misses. Returns the root-relative test files to run, [] for none, or null for the
// whole suite.
// Only for a Markdown requirements file. Residual, for the tranche's whole run: code outside the
// tests that builds the path from the directory or the ledger's field, code that reaches the file
// without naming it (a walk of the whole tree that reads every file), or a comment-like line inside
// a multi-line string.
const LINE_COMMENTS = (text) => {
  const out = [];
  let block = false;
  for (const l of text.split('\n')) {
    let x = l;
    if (block) { const k = x.indexOf('*/'); if (k < 0) continue; x = x.slice(k + 2); block = false; }
    const t = x.trimStart();
    if (t.startsWith('//')) continue;
    if (t.startsWith('/*')) { const k = t.indexOf('*/', 2); if (k < 0) { block = true; continue; } x = t.slice(k + 2); }
    out.push(x);
  }
  return out.join('\n');
};
export function requirementsOnly(root, cfg, e, { changed, rows = [], log = () => {} }) {
  if (!e.requirements) return null;
  const req = normPath(e.requirements);
  if (!req.endsWith('.md')) return null;
  const own = changed.filter((f) => !isRecordPath(cfg, f));
  if (!own.length || !own.every((f) => normPath(f) === req)) return null;
  const name = basename(req);
  const dir = dirname(req) === '.' ? null : basename(dirname(req));
  const read = (f) => { try { const t = readFileSync(join(root, f), 'utf8'); return t.includes('\0') ? '' : t; } catch { return ''; } };
  const tokens = [name, ...(dir !== null ? [dir] : [])];
  const names = (f, text = read(f), ts = tokens) => { const c = SCRIPT.test(f) ? LINE_COMMENTS(text) : text; return ts.some((t) => c.includes(t)); };
  // Code beside the tests is read for the file's own name: its directory's is prose all over a
  // product's code (copy, 5 Nov: a words generator's messages say "requirements"), and a path it
  // builds from the directory is the residual the tranche's whole run is for.
  const named = (f) => names(f, read(f), [name]);
  const whole = (why) => { log(`${e.id}: only its requirements file ${req} changed, but ${why}: the whole suite runs`); return null; };
  const tree = new Set(testTreeFiles(root, e));
  const code = e.paths.flatMap((p) => listFiles(root, p)).filter((f) => f !== req && !f.endsWith('.md') && !tree.has(f));
  const hit = code.find(named);
  if (hit) return whole(`${hit}, of the module's own paths, names ${name}`);
  const cwd = e.suite?.cwd || '.';
  const cmd = e.suite?.command || [];
  const pre = cmd.flatMap((a, i) => (['--import', '--require', '-r'].includes(cmd[i - 1]) ? [a] : /^--(import|require)=/.test(a) ? [a.slice(a.indexOf('=') + 1)] : []))
    .map((a) => normPath(join(cwd, a))).filter((f) => existsSync(join(root, f)));
  const gens = rows.flatMap((r) => r.regenerate || []).filter((a) => SCRIPT.test(a)).map((a) => normPath(a)).filter((f) => existsSync(join(root, f)));
  const other = [...pre, ...gens].find(named);
  if (other) return whole(`${other}, which the suite preloads or a generator runs, names ${name}`);
  const elsewhere = git(['grep', '-l', '-z', '-F', '-e', name, '--', '.'], { cwd: root, allowFail: true }).stdout.split('\0').filter(Boolean)
    .filter((f) => SCRIPT.test(f) && !tree.has(f) && !isRecordPath(cfg, f) && !f.split('/').includes('node_modules') && named(f));
  if (elsewhere.length) return whole(`${elsewhere.slice(0, 3).join(', ')}, outside its tests, names ${name}`);
  // A data file of the tests naming it (a fixture listing paths): which test reads that is not known.
  const data = [...tree].find((f) => !SCRIPT.test(f) && !f.endsWith('.md') && !f.split('/').includes('node_modules') && names(f));
  if (data) return whole(`${data}, a file of its tests that is not a script, names ${tokens.join(' or ')}`);
  const readers = [...tree].filter((f) => SCRIPT.test(f) && names(f));
  const files = [...new Set(readers.flatMap((f) => reachers(root, e, f)))].sort();
  log(`${e.id}: only its requirements file ${req} changed: ${files.length ? `the suite runs the ${files.length} test file(s) that read it (${readers.join(', ')}${files.join(',') === readers.join(',') ? '' : `, reached from ${files.join(', ')}`})` : `no test reads it (none of its tests names ${tokens.join(' or ')}): the suite is not run`}`);
  return files;
}
// Every file under p, tracked or built, node_modules and .git left out, a symlinked file read
// through (not a symlinked directory: no cycle); root-relative.
const listFiles = (root, p, out = []) => {
  const at = join(root, p);
  let st;
  try { st = lstatSync(at); } catch { return out; }
  if (st.isSymbolicLink()) { try { if (statSync(at).isFile()) out.push(normPath(p)); } catch { /* dangling */ } return out; }
  if (st.isFile()) out.push(normPath(p));
  else if (st.isDirectory()) for (const n of readdirSync(at).sort()) if (n !== 'node_modules' && n !== '.git') listFiles(root, join(p, n), out);
  return out;
};

// A gate row, checked before job post writes it into a comment: the file was written after
// product code ran (review of PR 13). Only the fields job post prints are checked; merge trusts a
// row only when the run's own artifact holds the same row (verifyRow).
const HEX40 = /^[0-9a-f]{40}$/;
const ROW = {
  sha: (v) => HEX40.test(v),
  run_id: (v) => Number.isSafeInteger(v) && v > 0,
  trigger: (v) => ['record', 'draft', 'record-since-green', 'code', 'layer'].includes(v),
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

// A fresh file for fail-reporter.mjs's lines, outside the checkout, removed once read (withTemp).
const withEvents = (fn) => withTemp('p3-failing-', (d) => fn(join(d, 'failing.jsonl')));

// Reverts the code files to the base, runs the test files, restores each file to HEAD (removing
// any HEAD does not have). Returns the test files that still pass, and those that failed only
// because something could not load. Runs in place: CI's checkout is disposable.
// tolerated: the base-red test ids (basered.mjs). A file that runs one fails at the revert whatever
// the job's own tests do, so it counts as not inert only when a test other than those fails. Any
// file may run one, since a test is keyed by the module declaring it, a sibling the file imports
// (review of PR 133), so every file's failures are read per test when anything is tolerated;
// when its failures cannot be read per test, it proves nothing and counts as inert (review of
// PR 101).
// One run (build gate-speed, 5 Nov: journey-check's revert check ran its files one process each,
// in turn, 21 min): the files run together in one suite run, as the suite runs them, and each
// file's verdict is the runner's own for it (fail-reporter.mjs's done line), which is its exit
// code run alone: passed is inert. A file that failed is not inert when no failing test of the
// run is a tolerated one (a file's failures alone are among the run's, so none is tolerated,
// and a file that failed reports a failure: a test, or itself as a whole); its load failure is
// the reporter's load line. Run alone, as before, each file this cannot decide: when a failing
// test of the run is tolerated (a failure is not tied to the file that ran it; when a tolerated test
// is declared in a changed file or a module it may import, there is no run together), when the run has
// no verdict for the file (a timeout, a crash) or none at all (a command that is not the node
// test runner, or names its own reporter). Residual: files that pass or fail only for running
// beside each other, as the suite runs them too.
export function revertCheck(root, entry, base, code, tests, { timeout, tolerated = [] } = {}) {
  const inert = new Set();
  const loadOnly = new Set();
  const holds = tolerated.length > 0;
  const tol = new Set(tolerated);
  const alone = [];
  try {
    for (const f of code) {
      if (exists(root, base, f)) git(['checkout', base, '--', f], { cwd: root });
      else rmSync(join(root, f), { force: true, recursive: true });
    }
    // A tolerated test declared in one of these files, or in a module they import (not a test file
    // of the suite), would send the failing files alone after the run: then they go alone at once.
    const suite = holds ? new Set(testFiles(root, entry)) : null;
    const tolHere = holds && tolerated.some((id) => { const f = id.slice(0, id.indexOf('::')); return tests.includes(f) || !suite.has(f); });
    const r = tests.length > 1 && !tolHere && reportsEvents(entry.suite.command) ? withEvents((events) => runSuite(root, entry, tests, { timeout, events })) : null;
    const together = r?.ran && r.failing ? r : null;
    const anyTolerated = !!together && together.failing.some((x) => tol.has(testId(x)));
    for (const t of tests) {
      const v = together ? together.ran[t] : undefined;
      if (v === true) inert.add(t);
      else if (v === false && !anyTolerated) { if (together.load.includes(t)) loadOnly.add(t); }
      else alone.push(t);
    }
    for (const t of alone) {
      const one = holds ? withEvents((events) => runSuite(root, entry, [t], { timeout, events })) : runSuite(root, entry, [t], { timeout });
      if (one.exit === 0 || (holds && (!one.failing || one.failing.every((x) => tol.has(testId(x)))))) inert.add(t);
      else if (LOAD.test(one.output)) loadOnly.add(t);
    }
  } finally {
    for (const f of code) {
      git(['reset', '-q', 'HEAD', '--', f], { cwd: root, allowFail: true });
      if (exists(root, 'HEAD', f)) git(['checkout', 'HEAD', '--', f], { cwd: root });
      else rmSync(join(root, f), { force: true, recursive: true });
    }
  }
  return { inert: tests.filter((t) => inert.has(t)), loadOnly: tests.filter((t) => loadOnly.has(t)), alone: alone.length };
}
