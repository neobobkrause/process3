// The gate (GAT-1, GAT-2, GAT-5, GAT-6, JOB-12, ARC-5): run by CI on every pull request tip,
// never in a session. Ends in seconds when only record paths changed (row 15), on a draft, or
// when nothing but records changed since the last green run on the same tranche tip.
import { existsSync, lstatSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { GATE, addComment, block, comments, gateRuns, baseEverChanged, getPR, latestReceipt, prsFromBranch, unbound, verifyRow } from './github.mjs';
import { branchModule, checkLedger, entryFile, ledgerIds, readLedgerTexts, startBranch } from './ledger.mjs';
import { metricsFile, rowsAt } from './metrics.mjs';
import { install, runSuite, suffixOf } from './suite.mjs';
import { baseRed, testId } from './basered.mjs';
import { buildGenerated, committedGenerated, entryChecks, generatedRows, ignoredHere, ignoreLines, importFindings, isGenerated, refreshCheck, refreshOthers, regenerate, removedGenerated, verifyUntracked } from './checks.mjs';
import { webCommitByOwner } from './record.mjs';
import { isBootstrap, lastConfigAt, unanchored } from './anchor.mjs';
import { CONFIG_FILE, NO_TOKENS, configOf, exists, fail, gh, git, isRecordOrLane, isRecordPath, laneOnly, loadConfig, now, repoSlug, underPath, withTemp } from './util.mjs';

const ghIO = { comments, addComment, getPR, prsFromBranch, baseEverChanged, verify: (slug, r, ctx) => verifyRow(slug, r, ctx), lookup: (args, o) => gh(args, o) };
const MINUTE = 60000;
// The product's code runs in child processes without the workflow's token (runSuite, install).
export { NO_TOKENS };

// The ledger entries at ref; a read failure is an error, unreadable JSON is checkLedger's finding.
export const entriesAt = (root, ref) => Object.values(readLedgerTexts(root, ref)).flatMap((t) => { try { const e = JSON.parse(t); return e ? [e] : []; } catch { return []; } });

// No rename detection: a rename lists both the removed and the added path (confirming review
// of PR 14).
export const diffNames = (root, a, b, paths = []) => git(['diff', '--no-renames', '--name-only', '-z', a, b, '--', ...paths], { cwd: root }).split('\0').filter(Boolean);
// The tranche tip a predicted tree was built on: the newest commit on `is`'s first-parent line
// that is an ancestor of `tested` (null within 200 commits: none).
export function builtOn(root, tested, is) {
  const line = git(['rev-list', '--first-parent', '--max-count=200', is], { cwd: root, allowFail: true }).stdout?.split('\n').filter(Boolean) || [];
  return line.find((c) => git(['merge-base', '--is-ancestor', c, tested], { cwd: root, allowFail: true }).code === 0) || null;
}
// A spec-tested tree plus a disjoint tranche move (window keep-disjoint, Bob, 5 Nov): the files
// where `head` differs from `tested` (the tree a spec run tested), skip() aside (records, lanes),
// split into `moved`, those the tranche's move from `was` (the spec's base, a tranche tip) to `is`
// (the land's base, at or after it) accounts for: the move changed it, `tested` holds it as `was`
// did, and `head` holds it as `is` does; and `off`, the rest. commits: the move's, first parent.
export function offSpec(root, { tested, head, was, is, skip }) {
  const differ = diffNames(root, tested, head).filter((f) => !skip(f));
  const after = differ.length && was && is && git(['merge-base', '--is-ancestor', was, is], { cwd: root, allowFail: true }).code === 0;
  const moved = after ? differ.filter((f) => { const w = blobAt(root, was, f); const i = blobAt(root, is, f); return w !== i && blobAt(root, tested, f) === w && blobAt(root, head, f) === i; }) : [];
  const commits = moved.length ? git(['rev-list', '--first-parent', `${was}..${is}`], { cwd: root }).split('\n').filter(Boolean) : [];
  return { off: differ.filter((f) => !moved.includes(f)), moved, commits };
}
export const isAnc = (root, a, b) => typeof a === 'string' && /^[0-9a-f]{40}$/.test(a) && git(['merge-base', '--is-ancestor', a, b], { cwd: root, allowFail: true }).code === 0;
const F = (check, file, message, line = 1) => ({ check, file, line, message });
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
  // A spec head is never the tranche, so the bootstrap reads the event's branch either way.
  const { cfg, findings, bootstrap } = gateConfig(root, { base, head, branch: eventBranch, slug, io }); // the trusted side
  if (bootstrap) log(`the base has no Process3: the gate runs with the head's ${RUN_KEYS.join(', ')}, its anchored keys held`);
  const timeout = (cfg.suite_timeout_minutes || 20) * MINUTE;
  // In spec mode both are the job PR's own (below): the spec head holds the window ahead of it too.
  let mb = git(['merge-base', head, base], { cwd: root });
  let changed = diffNames(root, mb, head);
  let gatePassed = null; // the ids the gate's own suite run saw pass (the receipt check)
  // tree: what this run tests, the checkout (GitHub's merge of the head into the base) as it is
  // before anything runs. A spec-tested fast path stands on a row only for the tree it names.
  const tree = git(['rev-parse', 'HEAD^{tree}'], { cwd: root });
  const runRow = { sha: head, base, tree, at: now(), run_id: process.env.GITHUB_RUN_ID ? Number(process.env.GITHUB_RUN_ID) : null, trigger: null, suite: 'skipped', revert: 'skipped', receipt: 'not checked', receipt_attempt: null };
  // The pull request as it is now. Its draft state is read live, not from the event (the gate
  // race, measured on the copy 4 Nov, PRs 55, 61, 62, 63): job complete pushes, then marks
  // ready, so one head gets a synchronize run whose payload says draft and a ready_for_review
  // run, created in the same second; the concurrency group keeps one, and when the push's run
  // was kept it skipped the suite and the receipt, and a re-run replays the same payload. Read
  // live, whichever run is kept judges the pull request as it is. A failed read stops the run.
  const live = pr ? io.getPR(slug, pr) : null;
  let entries = entriesAt(root, head); // the job head's in spec mode (below), as its own gate reads them
  // Spec mode (train-spec C', tranche-based as the coordinator ruled at 17:20): a draft PR from
  // train/head/<n>-<seq> into the tranche itself (base ref read from the live PR, so the workflow
  // passes nothing new) tests job PR n's change merged onto the window ahead of it. Its base is the
  // tranche, so its judge (pin, config, gate code) is the tranche's, bound as a job PR's run is. It is judged exactly as job PR n's own gate would judge
  // it: n's branch, draft state and receipt (by n's opener), and no record fast path, since its
  // prior runs are another tree's. Only an open job PR into the tranche, from a job branch of this
  // repository, whose head is in the spec head, is judged so; anything else is red, and nothing
  // more runs (a spec that is not the job's change has nothing to test).
  // Only where the base's config opens the window (merge_train_window > 1); with the serial train
  // a spec-shaped pull request is judged as any other (cold review of train-spec, finding 2).
  const windowOn = (cfg.merge_train_window || 1) > 1;
  const spec = windowOn ? specRefs(live?.base?.ref, eventBranch, cfg.tranche) : null;
  let branch = eventBranch;
  let jpr = null;
  let jobHead = null;
  let specWhy = null;
  if (spec) {
    runRow.spec = { pr: spec.pr, seq: spec.seq };
    jpr = io.getPR(slug, spec.pr);
    const ref = jpr?.head?.ref;
    specWhy = !jpr ? 'could not be read'
      : jpr.state !== 'open' ? `is ${jpr.merged ? 'merged' : jpr.state || 'not open'}`
        : jpr.base?.ref !== cfg.tranche ? `is into ${jpr.base?.ref}, not the tranche ${cfg.tranche}`
          : jpr.head?.repo?.full_name !== slug ? `is not from a branch of ${slug}`
            : !branchModule(ref, new Set(entries.map((e) => e.id))) ? `is from ${ref}, not a job branch`
              : !isAnc(root, jpr.head?.sha, head) ? `has head ${String(jpr.head?.sha).slice(0, 10)}, which is not in the spec head ${String(head).slice(0, 10)}` : null;
    // A spec pull request is a draft for good: made ready, its green gate would stand as the required
    // check for content judged only as job n's change (confirming review of the tranche-based spec).
    if (specWhy) findings.push(F('spec', '(spec)', `spec run for job PR ${spec.pr} (${eventBranch}): job PR ${spec.pr} ${specWhy}, so this is not that job's change to test`));
    else if (live?.draft !== true) {
      specWhy = 'not a draft';
      findings.push(F('spec', '(spec)', `spec PR ${pr} (${eventBranch}) is not a draft: a spec pull request is never made ready, so its gate never stands as a required check for its content`));
    }
    else {
      branch = ref;
      // The job's own change, as its own gate judges it: what the job's head changed since it left
      // the tranche, not the jobs ahead of it that the spec head also holds.
      jobHead = jpr.head.sha;
      entries = entriesAt(root, jobHead);
      mb = git(['merge-base', jobHead, base], { cwd: root });
      changed = diffNames(root, mb, jobHead);
      log(`spec run: judged as job PR ${spec.pr} (${ref}, ${String(jobHead).slice(0, 10)}) merged onto the window ahead of it, on ${live.base.ref}`);
    }
  }
  // The commit the static checks read (ledger, start row, imports, generated): the job's own head
  // in spec mode, as its own gate read it; the suite runs on the checkout either way.
  const judged = jobHead || head;
  const draft = spec ? specWhy !== null || jpr.draft !== false : typeof live?.draft === 'boolean' ? live.draft : eventDraft;
  if (!spec && draft !== eventDraft) {
    // Kept in the row too, so a run the race touched is visible without its log (review 1 of PR 74).
    runRow.event_draft = eventDraft;
    log(`the pull request is ${draft ? 'a draft' : 'ready'} now; the event said ${eventDraft ? 'draft' : 'ready'}: the gate judges it as it is now`);
  }
  const all = !pr ? [] : spec ? (specWhy ? [] : io.comments(slug, spec.pr)) : io.comments(slug, pr);
  const prior = spec ? [] : gateRuns(all);
  // The receipt is read only from the pull request's opener (review of PR 13); in spec mode, the
  // job PR's.
  const receipt = pr ? latestReceipt(all, opts.opener ?? (spec ? jpr?.user?.login : live?.user?.login)) : null;

  const job = branchModule(branch, new Set(entries.map((e) => e.id)));
  const entry = job ? entries.find((e) => e.id === job) || null : null;
  if (job && !entry) findings.push(F('ledger', entryFile(job), `branch ${branch} has no ledger entry`));
  // The job's branch is the one its latest start row names (a --fresh-branch start's job/<id>-<n>).
  const named = entry && startBranch(rowsAt(root, judged, job), job);
  if (named && named !== branch) findings.push(F('ledger', metricsFile(job), `branch ${branch} is not job ${job}'s branch: its latest start row names ${named}`));
  findings.push(...checkLedger(root, { ref: judged, base: mb, branch }));

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
  // A lane's pull request (lane.mjs; Bob, 5 Nov): every file inside one lane's folder, records
  // aside, and not a job's nor the tranche's: the records-only path, no suite, no install or
  // build; the record checks above still run. A generated output is built, never committed.
  const lanePR = !job && branch !== cfg.tranche ? laneOnly(cfg, changed, entries) : null;
  if (lanePR) {
    runRow.lane = lanePR;
    for (const f of changed.filter((x) => isGenerated(gen.rows, x) && exists(root, head, x))) findings.push(F('generated', f, `${f} is a generated output; lane ${lanePR} does not commit it: it is built at layer close, deploy and release`));
  }
  const recordOnly = changed.every((f) => isRecordPath(cfg, f)) || !!lanePR;
  // The fast path stands on an earlier green run only when that run is verified (verifyRow) and
  // the branch's runs are bound to this pull request (unbound): read only when a row could stand.
  const greens = prior.filter((r) => r.ok && r.trigger === 'code' && r.base === base).reverse();
  const loose = greens.length ? unbound(slug, branch, pr, cfg.tranche, io) : null;
  if (loose) log(`no earlier green run stands for the records-only path: ${loose}`);
  const lastGreen = loose ? undefined : greens.find((r) => io.verify(slug, r, { pr, baseRef: cfg.tranche, branch }));
  const sinceGreen = lastGreen && git(['cat-file', '-e', `${lastGreen.sha}^{commit}`], { cwd: root, allowFail: true }).code === 0
    // A lane's folder counts as records here: a lane's land between a job's green run and its
    // merge does not send the job back through its suite (Bob, 5 Nov).
    && diffNames(root, lastGreen.sha, head).every((f) => isRecordOrLane(cfg, f, entries, { self: job }));

  // The base the job's change is reverted to: the first parent of GitHub's merge checkout,
  // the tranche as it was merged with, else the event's base.
  const parents = git(['rev-list', '--parents', '-n', '1', 'HEAD'], { cwd: root }).split(' ').slice(1);
  const revertBase = parents.length === 2 && parents[1] === head ? parents[0] : base;

  // A ready job's receipt must be agreed by a run on this head (merge). Records only, the fast
  // path stands only on a green code run that measured what the receipt claims (measuredBy);
  // with no such run the gate runs the suite here, so a records-only job pull request, or a
  // records-only head after a code run on another tree, can merge (copy PR 247, 4 Nov:
  // attempt 3 changed only its records, every run on it was "record", and merge refused it).
  // A plain pull request, or a job's with no receipt yet, keeps the record fast path.
  const jobReceipt = entry && !draft && receipt?.module === job ? receipt : null;
  const stands = jobReceipt && sinceGreen && git(['merge-base', '--is-ancestor', jobReceipt.sha, head], { cwd: root, allowFail: true }).code === 0
    ? measuredBy(root, cfg, jobReceipt, lastGreen, entries) : null;
  const receiptRun = !!jobReceipt && (recordOnly || sinceGreen) && !stands?.ok;

  // The land of a spec-tested job (merge, train-spec C'): its head is the merged result built on
  // the real tranche, whose tree is the one a green spec run tested, records aside. Asked for by
  // the head's Spec-Tested trailer, judged here (specTested); anything short of that runs as it
  // would have without it.
  const fast = windowOn && !spec && jobReceipt && !(sinceGreen && !receiptRun) ? specTested(root, cfg, { slug, io, pr, base, head, tree, receipt: jobReceipt, job }) : null;
  if (fast && !fast.ok) log(`Spec-Tested is not taken: ${fast.why}; the gate runs as it would without it`);

  if (!spec && recordOnly && !jobReceipt) runRow.trigger = 'record';
  else if (draft) runRow.trigger = 'draft';
  else if (fast?.ok) {
    // The spec run's suite, revert and receipt stand for this tree; ownership, ledger and
    // imports above were judged on this pull request as usual.
    const r = fast.row;
    runRow.trigger = 'spec-tested';
    for (const k of ['suite', 'scope', 'tests', 'base_red', 'revert', 'inert', 'load_only', 'smoke', 'receipt', 'receipt_attempt', 'receipt_passed']) if (r[k] !== undefined) runRow[k] = r[k];
    Object.assign(runRow, { spec_pr: fast.n, spec_run: r.run_id, spec_sha: r.sha });
    log(`spec-tested: spec PR ${fast.n}'s run ${r.run_id} tested this tree on ${String(r.sha).slice(0, 10)}, records aside${fast.move ? `, with the disjoint tranche move ${String(fast.move.from).slice(0, 10)}..${String(base).slice(0, 10)} (${fast.move.files.length} file(s))` : ''}: no suite runs`);
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
      const s = withEvents((events) => runSuite(root, e, undefined, { timeout, events }));
      results.push(s);
      if (s.exit !== 0) {
        // Base-red (basered.mjs): the failing tests run again at the tranche tip the PR merges
        // into; failures the base has too are not the PR's. Never for the tranche into main,
        // where every failure tolerated on the way is owed.
        // Its own budget, not what the suite left (copy, 4 Nov: plane's suite takes 19-20 of 20 min).
        const br = branch !== cfg.tranche && !/ETIMEDOUT/.test(s.output)
          ? baseRed(root, e, { base: revertBase, failing: s.failing, cfg, rows: gen.rows, timeout, ...(exec ? { exec } : {}), log })
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
    gatePassed = new Set(results.flatMap((s) => (s.passing || []).map(testId)));
    if (entry && cfg.smoke) {
      const sm = smoke(root, cfg, { entry, entries, base: revertBase, rows: gen.rows, exec, log });
      runRow.smoke = sm.row;
      findings.push(...sm.findings);
    }
    if (scope.length) {
      runRow.suite = results.every((s) => s.exit === 0) ? 'pass' : results.every((s) => s.exit === 0 || s.baseRed) ? 'base-red' : 'fail';
      runRow.tests = results.map((s) => s.tests);
      runRow.suite_seconds = results.reduce((t, s) => t + s.seconds, 0);
    }
    // JOB-12: the job's new or changed tests must fail with its change reverted.
    if (entry && ['pass', 'base-red'].includes(runRow.suite)) {
      const exempt = receipt?.module === job ? receipt.exempt?.revert : undefined;
      const tests = changed.filter((f) => entry.tests.some((t) => underPath(f, t)) && f.endsWith(suffixOf(entry)) && existsSync(join(root, f)));
      // The requirements file's struck marks are not code: reverting them proves nothing.
      const code = changed.filter((f) => !isRecordPath(cfg, f) && f !== entry.requirements && !entry.tests.some((t) => underPath(f, t)));
      // A records-only job pull request (receiptRun) changes no code and no test: nothing to revert.
      if (recordOnly) runRow.revert = 'no code changed';
      else if (!tests.length) {
        runRow.revert = exempt ? 'exempt' : 'fail';
        if (!exempt) findings.push(F('revert', entry.tests[0], 'the job adds or changes no test; name why in the receipt (--exempt-revert)'));
      } else if (!code.length) {
        runRow.revert = 'no code changed';
      } else {
        const r = revertCheck(root, entry, revertBase, code, tests, { timeout, tolerated: (runRow.base_red || []).flatMap((b) => b.tests) });
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
      const c = refreshCheck(root, plain, { ran: !!runRow.generated, failed: findings.some((f) => f.check === 'generated'), others: refreshOthers(cfg, gen.rows, changed, entriesAt(root, base), ignores), untracked });
      if (c.refresh) runRow.refresh = c.refresh;
      findings.push(...c.findings);
    }
  }
  // Only records changed since the green code run: its comparison stands for these same files.
  // Not when a generated file is among them (a generated path under a records path): its bytes
  // changed after that comparison (review 4 of PR 95).
  if (runRow.trigger === 'record-since-green' && plain?.length && lastGreen.refresh
    && !diffNames(root, lastGreen.sha, head).some((f) => isGenerated(gen.rows, f))) runRow.refresh = lastGreen.refresh;

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
      // Records only since the last green code run (copy PR 105, 4 Nov: a receipt-only commit after
      // a green code gate): the receipt is checked against that run when it was made on the tree
      // that run tested, so the claim is of the same tree, suite and results.
      const measured = onBranch && runRow.trigger === 'record-since-green' ? measuredBy(root, cfg, receipt, lastGreen) : null;
      const suite = measured?.ok ? lastGreen.suite : runRow.suite;
      if (measured?.ok) runRow.receipt_measured = lastGreen.sha;
      else if (measured) runRow.receipt_unmeasured = measured.why;
      const red = measured?.ok ? lastGreen.base_red : runRow.base_red;
      // The excused tests the gate's run saw pass (copy plane PR 175: three failed in the job's
      // container and passed on the runner); kept in the row for a records-only run after it.
      // spec-tested: the spec run's suite, base-red and kept passes (carried into this row) are
      // what this receipt is checked against, as a measured run's are.
      const carried = runRow.trigger === 'spec-tested';
      const passed = measured?.ok ? (Array.isArray(lastGreen.receipt_passed) ? lastGreen.receipt_passed : [])
        : carried ? (Array.isArray(runRow.receipt_passed) ? runRow.receipt_passed : [])
          : [...new Set(claimedRed(claimed))].filter((t) => gatePassed?.has(t));
      if (!measured?.ok && !carried && passed.length) runRow.receipt_passed = passed;
      runRow.receipt = !onBranch ? 'wrong commit'
        : measured && !measured.ok ? 'unmeasured'
          : suite === 'skipped' ? 'present' : receiptAgrees(claimed, suite, red, passed) ? 'agrees' : 'disagrees';
      const unexplained = [...new Set(claimedRed(claimed))].filter((t) => !redIds(red).includes(t) && !passed.includes(t));
      if (runRow.receipt === 'disagrees') findings.push(F('receipt', entryFile(job), `the receipt claims the suite ${claim === 'none' ? 'was not run' : claim === 'pass' ? 'passed' : claimedRed(claimed).length ? 'failed only on base-red tests' : 'failed'}; the gate's run${measured?.ok ? ` on ${String(lastGreen.sha).slice(0, 10)}` : ''} ${suite === 'pass' ? 'passed' : suite === 'base-red' ? `failed only on tests that fail at the base too${unexplained.length ? `, and the receipt excuses ${unexplained.length} that neither fail at the base nor passed in the gate's run: ${unexplained.join('; ')}` : `, these ${redIds(red).length}: ${redIds(red).join('; ')}`}` : 'failed'}`));
      if (runRow.receipt === 'unmeasured') log(`receipt attempt ${receipt.attempt} is not checked: ${measured.why}`);
    }
  }

  runRow.findings = findings.length;
  runRow.ok = findings.length === 0;
  runRow.minutes = Math.round(((Date.now() - started) / MINUTE) * 100) / 100;
  return { run: runRow, findings, changed };
}

// A spec pull request (train-spec C', tranche-based): head train/head/<n>-<seq>, base the tranche
// itself. { pr: n, seq }, in canonical decimal, or null.
export const SPEC_REF = /^train\/head\/(\d+)-(\d+)$/;
export function specRefs(baseRef, headRef, tranche) {
  const h = SPEC_REF.exec(typeof headRef === 'string' ? headRef : '');
  if (!h || typeof tranche !== 'string' || !tranche || baseRef !== tranche) return null;
  const pr = Number(h[1]);
  const seq = Number(h[2]);
  return pr > 0 && Number.isSafeInteger(pr) && Number.isSafeInteger(seq) && String(pr) === h[1] && String(seq) === h[2] ? { pr, seq } : null;
}
const treeOf = (root, sha) => git(['rev-parse', `${sha}^{tree}`], { cwd: root, allowFail: true }).stdout?.trim() || null;
const committed = (root, sha) => /^[0-9a-f]{40}$/.test(String(sha)) && git(['cat-file', '-e', `${sha}^{commit}`], { cwd: root, allowFail: true }).code === 0;
const blobAt = (root, ref, f) => { const r = git(['rev-parse', `${ref}:${f}`], { cwd: root, allowFail: true }); return r.code === 0 ? r.stdout.trim() : null; };

// The spec-tested fast path: the head's commit message carries the trailer Spec-Tested: <s>, and
// spec PR s (a spec pair for this job PR, from this repository) holds a run that tested exactly
// this tree. The run is s's newest row that is green, ran the code path as this job (spec.pr),
// agreed with this job's current receipt attempt, names the tree of its own commit (its spec base
// was the head's ancestor, so GitHub's merge was that commit's tree), and verifies as s's run
// into its spec base. This head differs from that commit only in record paths, with the same
// ledger entry and base config, and this run's checkout is this head's tree (the tranche is the
// head's ancestor: what lands is these bytes). Any doubt is a full run (coordinator's ruling,
// 5 Nov). { ok, n, row }, { ok: false, why }, or null when no trailer asks for it.
export function specTested(root, cfg, { slug, io, pr, base, head, tree, receipt, job }) {
  const no = (why) => ({ ok: false, why });
  const t = git(['log', '-1', '--format=%(trailers:key=Spec-Tested,valueonly)', head], { cwd: root }).split('\n').map((x) => x.trim()).filter(Boolean);
  if (!t.length) return null;
  if (t.length !== 1 || !/^[1-9]\d*$/.test(t[0])) return no(`the head's Spec-Tested trailer is not one pull request number (${printable(t.join(', '), 60)})`);
  const n = Number(t[0]);
  if (tree !== treeOf(root, head)) return no(`this run's checkout is not ${String(head).slice(0, 10)}'s tree: the tranche is not its ancestor`);
  const sp = io.getPR(slug, n);
  const refs = specRefs(sp?.base?.ref, sp?.head?.ref, cfg.tranche);
  if (!refs || refs.pr !== pr || sp.head?.repo?.full_name !== slug) return no(`PR ${n} is not a spec pull request of PR ${pr} in ${slug}`);
  // Every pull request ever opened from the spec head is this one, into the tranche, never retargeted:
  // GitHub lists only open PRs on a run, so a closed second PR (or a retarget) into a branch with
  // another gate workflow could otherwise vouch for a run here (confirming review, finding 1).
  const ctx = { pr: n, baseRef: cfg.tranche, branch: sp.head.ref };
  const row = gateRuns(io.comments(slug, n) || [])
    .filter((r) => r.ok && r.trigger === 'code' && r.spec?.pr === pr && r.receipt === 'agrees' && r.receipt_attempt === receipt.attempt)
    .reverse().find((r) => committed(root, r.sha) && typeof r.tree === 'string' && r.tree === treeOf(root, r.sha) && io.verify(slug, r, ctx));
  if (!row) return no(`spec PR ${n} has no verified green code run of ${job}, on its own commit's tree, agreeing with receipt attempt ${receipt.attempt}`);
  // Read after the row (final review, L1): any pull request whose run made the row existed by now.
  const unbound = branchBound(slug, sp.head.ref, n, cfg.tranche, io);
  if (unbound) return no(`spec PR ${n}'s branch is not bound to it: ${unbound.replace(/^is PR \d+'s merge, but /, '')}`);
  const at = String(row.sha).slice(0, 10);
  // Lane folders count as records here, as in record-since-green (lane.mjs; Bob, 5 Nov).
  const entries = entriesAt(root, head);
  // Or by a tranche move since the spec run's base that shares no file with it (offSpec).
  const { off, moved, commits } = offSpec(root, { tested: row.sha, head, was: row.base, is: base, skip: (f) => isRecordOrLane(cfg, f, entries, { self: job }) });
  if (off.length) return no(`the head differs from ${at}, which spec PR ${n}'s run ${row.run_id} tested, in ${off.length} file(s) outside the records: ${off.slice(0, 5).join(', ')}`);
  // Records, but read by the run: the job's entry names its suite; the base's config says how it runs.
  if (blobAt(root, row.sha, entryFile(job)) !== blobAt(root, head, entryFile(job))) return no(`${job}'s ledger entry differs from ${at}'s`);
  if (blobAt(root, row.base, CONFIG_FILE) !== blobAt(root, base, CONFIG_FILE)) return no(`the base's ${CONFIG_FILE} differs from the spec run's`);
  // The spec run's base was a tranche tip (its run is bound into the tranche, as a job PR's): it
  // must be this land's base or behind it, with the same judge, and a base-red suite stands only
  // on this very base (a test failing at an older tip may have been fixed since).
  const baseOff = baseDiffers(root, row, base);
  if (baseOff) return no(`spec PR ${n}'s run was judged on base ${String(row.base).slice(0, 10)}, which ${baseOff}`);
  if (row.revert === 'exempt' && !receipt.exempt?.revert) return no(`spec PR ${n}'s run passed its revert check by an exemption this receipt does not claim`);
  const kept = Array.isArray(row.receipt_passed) ? row.receipt_passed : [];
  if (!receiptAgrees(receipt.commands?.find((c) => c.suite), row.suite, row.base_red, kept)) return no(`the receipt does not agree with spec PR ${n}'s run ${row.run_id}`);
  return { ok: true, n, row, ...(moved.length ? { move: { from: row.base, to: base, files: moved, commits } } : {}) };
}

// The receipt against the gate's suite. A base-red suite (basered.mjs) agrees with a receipt
// whose suite passed (the job's own run, on its branch, had none of the base's failures) or
// excused only tests the gate found failing at the base (copy PR 291: the runner's extra failures
// are tolerated on its own evidence) or saw pass itself (passed: copy plane PR 175, tests that
// failed in the job's container and passed on the runner; the environment differs either way).
// A test the gate saw failing is base-red there, or the suite is not base-red. Naming base-red
// tests agrees with a suite that passed.
const claimedRed = (c) => (Array.isArray(c?.base_red) ? c.base_red.filter((t) => typeof t === 'string' && /^[^:]+::./.test(t)) : []);
const redIds = (rows) => (Array.isArray(rows) ? rows.flatMap((r) => (Array.isArray(r?.tests) ? r.tests : [])) : []);
export function receiptAgrees(claimed, suite, red, passed = []) {
  const claim = claimed ? (claimed.exit === 0 ? 'pass' : claimedRed(claimed).length ? 'base-red' : 'fail') : 'none';
  if (claim === suite) return claim !== 'base-red' || claimedRed(claimed).every((t) => redIds(red).includes(t) || passed.includes(t));
  if (suite === 'base-red' && claim === 'pass') return true;
  return suite === 'pass' && claim === 'base-red';
}

// Whether the last green code run measured what a receipt claims: the receipt was made on a
// commit whose files, records aside, are that run's (the same tree, so the same suite and
// results), that run ran the job's suite, and a revert exemption that run relied on is still
// claimed. { ok } or { ok: false, why }.
function measuredBy(root, cfg, receipt, green, entries = []) {
  const job = receipt.module;
  if (!(Array.isArray(green.scope) && green.scope.includes(job)) || !['pass', 'fail', 'base-red'].includes(green.suite)) return { ok: false, why: `the last green code run, on ${String(green.sha).slice(0, 10)}, did not run the ${job} suite` };
  const same = git(['cat-file', '-e', `${receipt.sha}^{commit}`], { cwd: root, allowFail: true }).code === 0
    && diffNames(root, green.sha, receipt.sha).every((f) => isRecordOrLane(cfg, f, entries, { self: job }));
  if (!same) return { ok: false, why: `it names ${String(receipt.sha).slice(0, 10)}, whose code is not what the last green code run, on ${String(green.sha).slice(0, 10)}, tested` };
  if (green.revert === 'exempt' && !receipt.exempt?.revert) return { ok: false, why: `the last green code run, on ${String(green.sha).slice(0, 10)}, passed its revert check by an exemption this receipt does not claim` };
  // The row keeps only the passes an earlier receipt excused: a test this one excuses that the row
  // neither found base-red nor kept as passing is measured by running the suite (review of PR 134).
  const kept = Array.isArray(green.receipt_passed) ? green.receipt_passed : [];
  const unknown = [...new Set(claimedRed(receipt.commands?.find((c) => c.suite)))].filter((t) => !redIds(green.base_red).includes(t) && !kept.includes(t));
  if (unknown.length) return { ok: false, why: `it excuses ${unknown.length} test(s) the last green code run, on ${String(green.sha).slice(0, 10)}, neither found base-red nor kept as passing: ${unknown.slice(0, 5).join('; ')}` };
  return { ok: true };
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

// The merged PR's runs list no pull request (verifyRow), so a run is bound to it by its branch.
// That holds only while every pull request ever opened from the branch is into the tranche: a PR
// from the branch into another base runs that base's workflow file, which could upload any row
// (review of PR 94). Pull requests cannot be deleted, so the list is complete; unread, no binding.
// The list shows each PR's base as it is now; one retargeted to the tranche may have run another
// base's workflow first (confirming review of PR 94). Any base change, or an unread history,
// refuses. Returns why the branch does not bind, or null. Used by the job merges' cover and by
// a close's workflow changes (workflows.mjs).
// The same check binds an open PR's rows too (github.mjs unbound): GitHub lists only open PRs on
// a run, so a closed second PR's run lists only this one.
export function branchBound(slug, branch, n, tranche, io) {
  const why = unbound(slug, branch, n, tranche, io);
  return why && `is PR ${n}'s merge, but ${why}`;
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
  const why = branchBound(slug, branch, n, cfg.tranche, io);
  if (why) return no(why);
  const runs = gateRuns(io.comments(slug, n));
  // The row is bound to the PR here: its run was on job/<id> (verifyRow); its commit is the PR's
  // head or an earlier commit of it; its base was the tranche, at or before the merge's.
  const ctx = { pr: n, baseRef: cfg.tranche, merged: { branch } };
  const bound = (r) => isAnc(root, r.sha, p2) && isAnc(root, r.base, p1) && io.verify(slug, r, ctx);
  // A base-red run (basered.mjs) does not cover: the tranche runs that suite again, tolerating nothing.
  const suiteRan = (r) => r?.ok && r.trigger === 'code' && r.suite === 'pass' && Array.isArray(r.scope) && r.scope.includes(id);
  const row = runs.filter((r) => r.sha === p2).pop();
  if (!row || !row.ok || !bound(row)) return no(`is PR ${n}'s merge, but the newest gate run on its merged result ${p2.slice(0, 10)} is ${row ? (row.ok ? 'not bound to the PR or not verified' : 'red') : 'missing'}`);
  const tested = row.trigger === 'record-since-green'
    ? runs.filter((r) => r.sha === row.after).reverse().find((r) => suiteRan(r) && bound(r))
    : row.trigger === 'spec-tested' ? specRan(root, cfg, { slug, io, n, row, head: p2, suiteRan, job: id })
      : suiteRan(row) ? row : null;
  if (!tested) return no(`is PR ${n}'s merge, but no verified green run of the ${id} suite stands behind its merged result`);
  const e = git(['show', `${p1}:${entryFile(id)}`], { cwd: root, allowFail: true });
  if (e.code !== 0) return no(`is PR ${n}'s merge, but the tranche had no ledger entry for ${id}`);
  return { ok: true, pr: n, id, own: ownPaths(JSON.parse(e.stdout)) };
}

// The spec run a spec-tested row names (row.spec_pr, spec_run, spec_sha; held in the row's own
// artifact, verifyRow): a spec pair for job PR n, from this repository, whose run of that id on
// that commit judged job PR n, ran its suite green, tested that commit's own tree, differs from
// the merged result only in records, and verifies as the spec PR's run into its spec base. Once
// the spec PR is closed GitHub may list no pull request on its runs, as on a merged one's
// (verifyRow): the run is then bound by its branch, as a merged job PR's is, when every PR from
// the spec head was into the tranche, never retargeted (branchBound). null when not shown.
function specRan(root, cfg, { slug, io, n, row, head, suiteRan, job = null }) {
  const sp = Number.isSafeInteger(row.spec_pr) ? io.getPR(slug, row.spec_pr) : null;
  const refs = specRefs(sp?.base?.ref, sp?.head?.ref, cfg.tranche);
  if (!refs || refs.pr !== n || sp.head?.repo?.full_name !== slug) return null;
  // Bound whether open or closed (confirming review, finding 1): every PR from the spec head is this one, into the tranche.
  const ctx = sp.state === 'open' ? { pr: row.spec_pr, baseRef: cfg.tranche, branch: sp.head.ref } : { pr: row.spec_pr, baseRef: cfg.tranche, merged: { branch: sp.head.ref }, branch: sp.head.ref };
  const r = gateRuns(io.comments(slug, row.spec_pr) || []).find((x) => x.run_id === row.spec_run && x.sha === row.spec_sha);
  const entries = r ? entriesAt(root, head) : [];
  if (!r || !suiteRan(r) || r.spec?.pr !== n || !committed(root, r.sha) || r.tree !== treeOf(root, r.sha)
    || offSpec(root, { tested: r.sha, head, was: r.base, is: row.base, skip: (f) => isRecordOrLane(cfg, f, entries, { self: job }) }).off.length || baseDiffers(root, r, row.base) || !io.verify(slug, r, ctx)) return null;
  // Read after the row (final review, L1).
  if (branchBound(slug, sp.head.ref, row.spec_pr, cfg.tranche, io)) return null;
  return r;
}

// Why a spec run (row) does not stand for a land on base `is`: its base, a tranche tip, is not
// `is` or behind it, or the judge differs (the pin, the config, the gate workflow), or its suite
// was base-red on another base; null when it stands.
const GATE_FILE = '.github/workflows/process-gate.yml';
export const JUDGE_FILES = ['.process', CONFIG_FILE, GATE_FILE];
function baseDiffers(root, row, is) {
  const was = row?.base;
  if (!committed(root, was) || !committed(root, is)) return 'is not readable here';
  if (!isAnc(root, was, is)) return `is not ${String(is).slice(0, 10)}, this land's base, nor behind it`;
  const judge = JUDGE_FILES.filter((f) => blobAt(root, was, f) !== blobAt(root, is, f));
  if (judge.length) return `has another judge than ${String(is).slice(0, 10)}: ${judge.join(', ')}`;
  if (row.suite === 'base-red' && was !== is) return `ran base-red, tolerated on that base, not on ${String(is).slice(0, 10)}`;
  // GitHub takes a pull_request run's workflow file from its merge, i.e. from the spec head: it must
  // be the land base's too (the spec head is any writer's branch; review of the tranche-based spec).
  if (!committed(root, row.sha) || blobAt(root, row.sha, GATE_FILE) !== blobAt(root, is, GATE_FILE)) return `ran ${GATE_FILE} from its spec head ${String(row.sha).slice(0, 10)}, not ${String(is).slice(0, 10)}'s`;
  return null;
}

// A gate row, checked before job post writes it into a comment: the file was written after
// product code ran (review of PR 13). Only the fields job post prints are checked; merge trusts a
// row only when the run's own artifact holds the same row (verifyRow).
const HEX40 = /^[0-9a-f]{40}$/;
const ROW = {
  sha: (v) => HEX40.test(v),
  run_id: (v) => Number.isSafeInteger(v) && v > 0,
  trigger: (v) => ['record', 'draft', 'record-since-green', 'code', 'spec-tested'].includes(v),
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
// The product's smoke list (`smoke` in the config, read at the base): a few tests of other
// modules every job PR's gate runs beside the job's own suite, the cheap catch for a break
// across modules (Bob, 4 Nov: users' suites in a job gate cost +7.6 min median and caught none
// of 20 refuted claims). Each file runs by the module whose tests hold it, within `seconds` in
// all (default 120); a file under the job's own test paths is the suite's. A test red at the base too is reported in the row, not a finding, as the
// suite's base-red is; the receipt claims only the job's own suite.
export function smoke(root, cfg, { entry, entries, base, rows, exec, log = () => {} }) {
  const { files, seconds = 120 } = cfg.smoke;
  if (!Array.isArray(files) || files.some((f) => typeof f !== 'string') || !(seconds > 0)) {
    return { row: { result: 'fail' }, findings: [F('config', CONFIG_FILE, 'smoke must be {"files": [test files], "seconds": <cap, default 120>}')] };
  }
  const findings = [];
  const groups = new Map();
  for (const f of files.filter((x) => !entry.tests.some((t) => underPath(x, t)))) {
    const e = entries.find((m) => m.tests.some((t) => underPath(f, t)) && f.endsWith(suffixOf(m)));
    if (!e || !existsSync(join(root, f))) { findings.push(F('smoke', f, `smoke file ${f} is ${e ? 'missing' : 'not a test of any module'}`)); continue; }
    groups.set(e, [...(groups.get(e) || []), f]);
  }
  let end = Date.now() + seconds * 1000;
  const row = { files: 0, seconds: 0, base_red: [] };
  const left = [...groups];
  while (left.length) {
    if (Date.now() >= end) { findings.push(F('smoke', left[0][1][0], `the ${seconds} s smoke cap is spent; not run: ${left.flatMap((g) => g[1]).join(', ')}`)); break; }
    const [e, fs] = left.shift();
    const s = withEvents((events) => runSuite(root, e, fs, { timeout: end - Date.now(), events }));
    row.files += fs.length;
    row.seconds += s.seconds;
    if (s.exit === 0) { if (!s.tests.total) findings.push(F('smoke', fs[0], `zero smoke tests ran in ${fs.join(', ')}`)); continue; }
    const out = /ETIMEDOUT/.test(s.output);
    // Base-red has its own budget, the suite's (suite_timeout_minutes; PR 117), and its time is not
    // the cap's (copy, 4 Nov: the base build of bundles.mjs timed out in about half the runs
    // within the 120 s smoke cap, which the base install, build and run shared).
    const t0 = Date.now();
    const br = out ? null : baseRed(root, e, { base, failing: s.failing, cfg, rows, timeout: (cfg.suite_timeout_minutes || 20) * MINUTE, ...(exec ? { exec } : {}), log });
    end += Date.now() - t0;
    if (br?.ok) {
      row.base_red.push({ module: e.id, ...br.base_red });
      log(`smoke: ${br.base_red.tests.length} failing test(s) of ${e.id} fail at the base ${String(base).slice(0, 10)} too: reported, not blocking:\n${br.base_red.tests.map((t) => `  ${t}`).join('\n')}`);
      continue;
    }
    findings.push(F('smoke', fs[0], `smoke tests of ${e.id} failed (exit ${s.exit}${out ? `, over the ${seconds} s cap` : ''}): ${JSON.stringify(s.tests)}${br ? `; not base-red: ${br.why}` : ''}`));
    log(s.output.split('\n').slice(-60).join('\n'));
  }
  row.result = findings.length ? 'fail' : row.base_red.length ? 'base-red' : 'pass';
  if (!row.base_red.length) delete row.base_red;
  return { row, findings };
}

const withEvents = (fn) => withTemp('p3-failing-', (d) => fn(join(d, 'failing.jsonl')));

const LOAD_ERROR = /ERR_MODULE_NOT_FOUND|Cannot find module|does not provide an export named/;

// Reverts the code files to the base, runs each test file alone, restores each file to HEAD
// (removing any HEAD does not have). Returns the test files that still pass, and those that
// failed only because something could not load. Runs in place: CI's checkout is disposable.
// tolerated: the base-red test ids (basered.mjs). A file that runs one fails at the revert whatever
// the job's own tests do, so it counts as not inert only when a test other than those fails. Any
// file may run one, since a test is keyed by the module declaring it, a sibling the file imports
// (review of PR 133), so every file's failures are read per test when anything is tolerated;
// when its failures cannot be read per test, it proves nothing and counts as inert (review of
// PR 101).
export function revertCheck(root, entry, base, code, tests, { timeout, tolerated = [] } = {}) {
  const inert = [];
  const loadOnly = [];
  try {
    for (const f of code) {
      if (exists(root, base, f)) git(['checkout', base, '--', f], { cwd: root });
      else rmSync(join(root, f), { force: true, recursive: true });
    }
    for (const t of tests) {
      const holds = tolerated.length > 0;
      const r = holds ? withEvents((events) => runSuite(root, entry, [t], { timeout, events })) : runSuite(root, entry, [t], { timeout });
      if (r.exit === 0 || (holds && (!r.failing || r.failing.every((x) => tolerated.includes(testId(x)))))) inert.push(t);
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
