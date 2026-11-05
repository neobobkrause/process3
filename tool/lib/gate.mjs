// The gate (GAT-1, GAT-2, GAT-5, GAT-6, JOB-12, ARC-5): run by CI on every pull request tip,
// never in a session. Ends in seconds when only record paths changed (row 15), on a draft, or
// when nothing but records changed since the last green run on the same tranche tip.
import { existsSync, lstatSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { GATE, addComment, block, comments, gateRuns, getPR, latestReceipt, verifyRow } from './github.mjs';
import { branchModule, checkLedger, entryFile, ledgerIds, readLedgerTexts, startBranch } from './ledger.mjs';
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
// The tranche tip a predicted tree was built on: the newest commit on `is`'s first-parent line
// that is an ancestor of `tested` (null within 200 commits: none).
export function builtOn(root, tested, is) {
  const line = git(['rev-list', '--first-parent', '--max-count=200', is], { cwd: root, allowFail: true }).stdout?.split('\n').filter(Boolean) || [];
  return line.find((c) => git(['merge-base', '--is-ancestor', c, tested], { cwd: root, allowFail: true }).code === 0) || null;
}
// A spec-tested tree plus a disjoint tranche move, minus a disjoint position that left the window
// ahead of it (window keep-disjoint, Bob and the coordinator, 5 Nov): the files where `head`
// differs from `tested` (the tree a spec run tested), skip() aside (records, lanes), split into
// `moved`, those `head` holds as `is` (the land's base) does and that either `tested` held as the
// tranche did at `was` (the spec's base, a tranche tip behind `is`) or at a tip since on its first-
// parent line (the tranche moved them on), or the tranche never changed while `tested` did (a
// change ahead of it in the window that never landed); and `off`, the rest. Entries compare mode
// and object. `dropped`: the second kind, only whole steps of the window's chain in `tested` ahead
// of the job (chainSteps: exactly a leaving position's change, cold review), never a file own(f)
// (the job's own module: no position ahead changes it). commits: the move's, first parent.
export function offSpec(root, { tested, head, was, is, skip, own = () => false }) {
  const differ = diffNames(root, tested, head).filter((f) => !skip(f));
  const after = differ.length && was && is && git(['merge-base', '--is-ancestor', was, is], { cwd: root, allowFail: true }).code === 0;
  const line = after ? [was, ...git(['rev-list', '--first-parent', `${was}..${is}`], { cwd: root }).split('\n').filter(Boolean)] : [];
  const kind = (f) => {
    const i = entryOf(root, is, f);
    if (entryOf(root, head, f) !== i) return null;
    const t = entryOf(root, tested, f);
    if (t !== i && line.some((c) => entryOf(root, c, f) === t)) return 'move';
    return entryOf(root, was, f) === i && !own(f) ? 'drop' : null;
  };
  const kinds = after ? new Map(differ.map((f) => [f, kind(f)])) : new Map();
  // A drop stands only as the whole change of a step ahead in the chain; any other is off.
  const drops = differ.filter((f) => kinds.get(f) === 'drop');
  if (drops.length) {
    const steps = chainSteps(root, tested, was)?.slice(1) || [];
    const whole = new Set(steps.map((x) => diffNames(root, x.from, x.to).filter((f) => !skip(f))).filter((fs) => fs.every((f) => drops.includes(f))).flat());
    for (const f of drops) if (!whole.has(f)) kinds.set(f, null);
  }
  const moved = differ.filter((f) => kinds.get(f));
  const commits = moved.some((f) => kinds.get(f) === 'move') ? line.slice(1) : [];
  return { off: differ.filter((f) => !kinds.get(f)), moved, dropped: moved.filter((f) => kinds.get(f) === 'drop'), commits };
}
// The window's chain in a spec head, from `tested` back to `was` (the tranche tip it was built
// on): each step { from: R(i-1), to: R(i) }, the job's first. A job's step is its merge-row commit
// over the merge of R(i-1) into its head (merge.mjs buildMerged); a plain one's the merge itself
// (train.mjs buildPlain): R(i-1) is the merge's second parent. null for any other shape.
function chainSteps(root, tested, was) {
  const parents = (c) => git(['rev-list', '--parents', '-n', '1', c], { cwd: root }).split(' ').slice(1);
  const steps = [];
  for (let c = tested; c !== was;) {
    if (steps.length > 64) return null;
    const p = parents(c);
    const m = p.length === 2 ? p : p.length === 1 ? parents(p[0]) : [];
    if (m.length !== 2 || !isAnc(root, was, m[1])) return null;
    steps.push({ from: m[1], to: c });
    c = m[1];
  }
  return steps;
}
// Whether a file is in job `id`'s module (its entry's paths and tests).
export const ownOf = (entries, id) => { const e = entries.find((x) => x.id === id); return (f) => !!e && [...(e.paths || []), ...(e.tests || [])].some((p) => underPath(f, p)); };
// A path's tree entry at a commit, mode and object ("" when absent).
const entryOf = (root, ref, f) => git(['ls-tree', ref, '--', f], { cwd: root, allowFail: true }).stdout?.split('\t')[0] || '';
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

  // A ready job's receipt is read for its presence only, never compared with a run (Bob, 5 Nov:
  // 17 reds, no catch), so records-only heads keep the record fast paths, a job's too.
  const jobReceipt = entry && !draft && receipt?.module === job ? receipt : null;

  // The land of a spec-tested job (merge, train-spec C'): its head is the merged result built on
  // the real tranche, whose tree is the one a green spec run tested, records aside. Asked for by
  // the head's Spec-Tested trailer, judged here (specTested); anything short of that runs as it
  // would have without it.
  const fast = windowOn && !spec && jobReceipt && !recordOnly && !sinceGreen ? specTested(root, cfg, { slug, io, pr, base, head, tree, job }) : null;
  if (fast && !fast.ok) log(`Spec-Tested is not taken: ${fast.why}; the gate runs as it would without it`);

  // The shared layer branch's merge (layerflow.mjs; Bob, 5 Nov: no test run at layer close): a pull
  // request from layer/<n> into the tranche, with the base's merge_strategy "layer", runs no suite;
  // each module it changes must be covered by its last land's verified green gate run, on a head
  // that held every interface change of its providers. Anything short is a finding, never a re-run.
  const layerPR = !spec && !job && layerMode(cfg) && layerOfBranch(branch) !== null && (live?.base?.ref ?? null) === cfg.tranche;
  if (!spec && recordOnly) runRow.trigger = 'record';
  else if (draft) runRow.trigger = 'draft';
  else if (layerPR) {
    runRow.trigger = 'layer';
    const lc = layerCover(root, cfg, { head, mb, branch, changed, entries, slug, io });
    runRow.layer = { n: layerOfBranch(branch), covered: lc.covered.map((c) => c.id), findings: lc.findings.length };
    for (const c of lc.covered) log(`${c.id}: covered by its land of PR ${c.pr} (${String(c.merge).slice(0, 10)}); no suite runs`);
    findings.push(...lc.findings);
  }
  else if (fast?.ok) {
    // The spec run's suite and revert stand for this tree; ownership, ledger, imports and the
    // receipt are judged on this pull request as usual.
    const r = fast.row;
    runRow.trigger = 'spec-tested';
    for (const k of ['suite', 'scope', 'tests', 'base_red', 'revert', 'inert', 'load_only']) if (r[k] !== undefined) runRow[k] = r[k];
    Object.assign(runRow, { spec_pr: fast.n, spec_run: r.run_id, spec_sha: r.sha });
    log(`spec-tested: spec PR ${fast.n}'s run ${r.run_id} tested this tree on ${String(r.sha).slice(0, 10)}, records aside${fast.move ? `, with ${fast.move.files.length - fast.move.dropped.length} file(s) of the disjoint tranche move ${String(fast.move.from).slice(0, 10)}..${String(base).slice(0, 10)} and ${fast.move.dropped.length} of a change ahead that left the window (${fast.move.dropped.slice(0, 5).join(', ') || 'none'})` : ''}: no suite runs`);
  }
  else if (sinceGreen) { runRow.trigger = 'record-since-green'; runRow.after = lastGreen.sha; }
  else {
    runRow.trigger = 'code';
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
    const onlyAt = (e, l = () => {}) => (branch !== cfg.tranche ? requirementsOnly(root, cfg, e, { changed, rows: gen.rows, log: l }) : null);
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
    prepared?.drop();
    if (scope.length) {
      runRow.suite = results.every((s) => s.exit === 0) ? 'pass' : results.every((s) => s.exit === 0 || s.baseRed) ? 'base-red' : 'fail';
      runRow.tests = results.map((s) => s.tests);
      runRow.suite_seconds = results.reduce((t, s) => t + s.seconds, 0);
    }
    // JOB-12, advisory (Bob, 5 Nov: 29 reds, the catches test quality, which the test review
    // trigger covers): the job's new or changed tests run with its change reverted, and those
    // that still pass are named in the row for the reviewer. Never a finding.
    if (entry && ['pass', 'base-red'].includes(runRow.suite)) {
      const tests = changed.filter((f) => entry.tests.some((t) => underPath(f, t)) && f.endsWith(suffixOf(entry)) && existsSync(join(root, f)));
      // The requirements file's struck marks are not code: reverting them proves nothing.
      const code = changed.filter((f) => !isRecordPath(cfg, f) && f !== entry.requirements && !entry.tests.some((t) => underPath(f, t)));
      // The receipt's revert exemption, for the reviewer: with one, the check is not run (build gate-speed).
      const exempt = receipt?.module === job ? receipt.exempt?.revert : undefined;
      if (!code.length) runRow.revert = 'no code changed';
      else if (!tests.length) runRow.revert = exempt ? 'exempt' : 'no test changed';
      else if (exempt) {
        runRow.revert = 'exempt';
        log(`the receipt exempts the revert check (${printable(exempt)}): not run`);
      } else {
        const t0 = Date.now();
        const r = revertCheck(root, entry, revertBase, code, tests, { timeout, tolerated: (runRow.base_red || []).flatMap((b) => b.tests) });
        log(`revert check: ${tests.length} test file(s) in ${Math.round((Date.now() - t0) / 1000)} s, ${r.alone} run alone`);
        runRow.revert = r.inert.length ? 'inert' : 'pass';
        runRow.inert = r.inert;
        // A test that fails only because a new file is gone cannot load: named apart.
        runRow.load_only = r.loadOnly;
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

  // The receipt: present and naming a commit on this branch. It is not compared with the run. A
  // records-only run reads it so merge can take that run's row, and finds nothing when there is none.
  if (job && !draft) {
    if (!receipt || receipt.module !== job) {
      runRow.receipt = 'none';
      if (runRow.trigger !== 'record') findings.push(F('receipt', entryFile(job), 'the pull request is ready but has no receipt (job complete posts it)'));
    } else {
      runRow.receipt_attempt = receipt.attempt;
      const onBranch = git(['merge-base', '--is-ancestor', receipt.sha, head], { cwd: root, allowFail: true }).code === 0;
      runRow.receipt = onBranch ? 'present' : 'wrong commit';
      if (!onBranch) findings.push(F('receipt', entryFile(job), `the receipt names ${String(receipt.sha).slice(0, 10)}, which is not on this branch`));
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
// and names the tree of its own commit (its spec base was the head's ancestor, so GitHub's merge
// was that commit's tree). This head differs from that commit only in record paths, with the same
// ledger entry and base config, and this run's checkout is this head's tree (the tranche is the
// head's ancestor: what lands is these bytes). Any doubt is a full run (coordinator's ruling,
// 5 Nov). { ok, n, row }, { ok: false, why }, or null when no trailer asks for it.
export function specTested(root, cfg, { slug, io, pr, base, head, tree, job }) {
  const no = (why) => ({ ok: false, why });
  const t = git(['log', '-1', '--format=%(trailers:key=Spec-Tested,valueonly)', head], { cwd: root }).split('\n').map((x) => x.trim()).filter(Boolean);
  if (!t.length) return null;
  if (t.length !== 1 || !/^[1-9]\d*$/.test(t[0])) return no(`the head's Spec-Tested trailer is not one pull request number (${printable(t.join(', '), 60)})`);
  const n = Number(t[0]);
  if (tree !== treeOf(root, head)) return no(`this run's checkout is not ${String(head).slice(0, 10)}'s tree: the tranche is not its ancestor`);
  const sp = io.getPR(slug, n);
  const refs = specRefs(sp?.base?.ref, sp?.head?.ref, cfg.tranche);
  if (!refs || refs.pr !== pr || sp.head?.repo?.full_name !== slug) return no(`PR ${n} is not a spec pull request of PR ${pr} in ${slug}`);
  // The tree and records comparison is the binding (Bob, 5 Nov): the row's artifact and the spec
  // head's pull requests are not read again here.
  const row = gateRuns(io.comments(slug, n) || [])
    .filter((r) => r.ok && r.trigger === 'code' && r.spec?.pr === pr)
    .reverse().find((r) => committed(root, r.sha) && typeof r.tree === 'string' && r.tree === treeOf(root, r.sha));
  if (!row) return no(`spec PR ${n} has no green code run of ${job} on its own commit's tree`);
  const at = String(row.sha).slice(0, 10);
  // Lane folders count as records here, as in record-since-green (lane.mjs; Bob, 5 Nov).
  const entries = entriesAt(root, head);
  // Or by a tranche move since the spec run's base, or a change ahead that left the window, sharing no file with it (offSpec).
  const { off, moved, dropped, commits } = offSpec(root, { tested: row.sha, head, was: row.base, is: base, skip: (f) => isRecordOrLane(cfg, f, entries, { self: job }), own: ownOf(entries, job) });
  if (off.length) return no(`the head differs from ${at}, which spec PR ${n}'s run ${row.run_id} tested, in ${off.length} file(s) outside the records: ${off.slice(0, 5).join(', ')}`);
  // Records, but read by the run: the job's entry names its suite; the base's config says how it runs.
  if (blobAt(root, row.sha, entryFile(job)) !== blobAt(root, head, entryFile(job))) return no(`${job}'s ledger entry differs from ${at}'s`);
  if (blobAt(root, row.base, CONFIG_FILE) !== blobAt(root, base, CONFIG_FILE)) return no(`the base's ${CONFIG_FILE} differs from the spec run's`);
  // The spec run's base was a tranche tip (its run is bound into the tranche, as a job PR's): it
  // must be this land's base or behind it, with the same judge, and a base-red suite stands only
  // on this very base or one that differs from it only as baseRedMoved allows.
  const baseOff = baseDiffers(root, cfg, row, base);
  if (baseOff) return no(`spec PR ${n}'s run was judged on base ${String(row.base).slice(0, 10)}, which ${baseOff}`);
  return { ok: true, n, row, ...(moved.length ? { move: { from: row.base, to: base, files: moved, dropped, commits } } : {}) };
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
    : row.trigger === 'spec-tested' ? specRan(root, cfg, { slug, io, n, row, head: p2, suiteRan, job: id })
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

// The spec run a spec-tested row names (row.spec_pr, spec_run, spec_sha; held in the row's own
// artifact, verifyRow): a spec pair for job PR n, from this repository, whose run of that id on
// that commit judged job PR n, ran its suite green, tested that commit's own tree, differs from
// the merged result only in records, on a base this land's stands on (baseDiffers). The tree and
// records comparison is the binding (Bob, 5 Nov): the spec run's artifact is not read again; the
// spec-tested row that names it is verified by the caller. null when not shown.
function specRan(root, cfg, { slug, io, n, row, head, suiteRan, job = null }) {
  const sp = Number.isSafeInteger(row.spec_pr) ? io.getPR(slug, row.spec_pr) : null;
  const refs = specRefs(sp?.base?.ref, sp?.head?.ref, cfg.tranche);
  if (!refs || refs.pr !== n || sp.head?.repo?.full_name !== slug) return null;
  const r = gateRuns(io.comments(slug, row.spec_pr) || []).find((x) => x.run_id === row.spec_run && x.sha === row.spec_sha);
  const entries = r ? entriesAt(root, head) : [];
  if (!r || !suiteRan(r) || r.spec?.pr !== n || !committed(root, r.sha) || r.tree !== treeOf(root, r.sha)
    || offSpec(root, { tested: r.sha, head, was: r.base, is: row.base, skip: (f) => isRecordOrLane(cfg, f, entries, { self: job }), own: ownOf(entries, job) }).off.length || baseDiffers(root, cfg, r, row.base)) return null;
  return r;
}

// Why a spec run (row) does not stand for a land on base `is`: its base, a tranche tip, is not
// `is` or behind it, or the judge differs (the pin, the config, the gate workflow), or its suite
// was base-red on a base this one differs from otherwise than baseRedMoved allows; null when it stands.
const GATE_FILE = '.github/workflows/process-gate.yml';
export const JUDGE_FILES = ['.process', CONFIG_FILE, GATE_FILE];
function baseDiffers(root, cfg, row, is) {
  const was = row?.base;
  if (!committed(root, was) || !committed(root, is)) return 'is not readable here';
  if (!isAnc(root, was, is)) return `is not ${String(is).slice(0, 10)}, this land's base, nor behind it`;
  const judge = JUDGE_FILES.filter((f) => blobAt(root, was, f) !== blobAt(root, is, f));
  if (judge.length) return `has another judge than ${String(is).slice(0, 10)}: ${judge.join(', ')}`;
  const moved = row.suite === 'base-red' && was !== is ? baseRedMoved(root, cfg, row, was, is) : [];
  if (moved.length) return `ran base-red, tolerated on that base, not on ${String(is).slice(0, 10)}, which differs from it in ${moved.length} file(s) the spec run neither ran with nor left as they were: ${moved.slice(0, 5).join(', ')}`;
  // GitHub takes a pull_request run's workflow file from its merge, i.e. from the spec head: it must
  // be the land base's too (the spec head is any writer's branch; review of the tranche-based spec).
  if (!committed(root, row.sha) || blobAt(root, row.sha, GATE_FILE) !== blobAt(root, is, GATE_FILE)) return `ran ${GATE_FILE} from its spec head ${String(row.sha).slice(0, 10)}, not ${String(is).slice(0, 10)}'s`;
  return null;
}

// A base-red spec run's tolerance carries from its base `was` to a land's base `is` (coordinator,
// 5 Nov; copy: spec 566 for PR 470, base-red on 85f411fd03, refused at its land on 808de5b52a, PR
// 364's land ahead of it, and its full gate found the same 15 tests red at the base) when each file
// between them, records aside, is as the spec run ran it, as its predicted base held it (the land
// ahead of it in the window: the spec head's merge built onto it, `row.sha^1^2`), or as at `was` in
// the tree it tested (a tranche move disjoint from it). The files that are none of these.
function baseRedMoved(root, cfg, row, was, is) {
  const r = git(['rev-parse', '--verify', '-q', `${row.sha}^1^2`], { cwd: root, allowFail: true });
  const predicted = r.code === 0 && isAnc(root, was, r.stdout.trim()) ? r.stdout.trim() : null;
  return diffNames(root, was, is).filter((f) => !isRecordPath(cfg, f)).filter((f) => {
    const t = blobAt(root, row.sha, f);
    const i = blobAt(root, is, f);
    return t !== i && t !== blobAt(root, was, f) && !(predicted && blobAt(root, predicted, f) === i);
  });
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
