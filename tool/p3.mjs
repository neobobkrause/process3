#!/usr/bin/env node
// Process3 tool: one program, a fresh process per command, run from the pinned clone.
// Usage: node <clone>/tool/p3.mjs <command> [args]
// p3-capability: gate-no-post (products' older shims grep for this line at the pin; keep it until
// every product carries the shim without the legacy path; review B of PR 32)
import { expireRecords } from './lib/expire.mjs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gate, postRow } from './lib/gate.mjs';
import { pinCheck, pinMove } from './lib/pin.mjs';
import { nextRound, layerJobs, layerJoin, layerLand, layerMerge, layerOpen, layerPublish, layerReport, layerClear, layerRetest, layerStatus, layerSync } from './lib/layerflow.mjs';
import { layerMode, layersAt } from './lib/layerbase.mjs';
import { laneArtifact, laneAsk, laneEnd, laneStart } from './lib/lane.mjs';
import { jobBlock, jobComplete, jobStart, jobSync, jobTest, revertExempt } from './lib/job.mjs';
import { branchModule, checkLedger, homeRef, ledgerIds } from './lib/ledger.mjs';
import { appendRow, bobMetricsFile, recordRefusal, recordWake, report as metricsReport, stateRoles } from './lib/metrics.mjs';
import { statelessWake, survivalReport, wholeHistory } from './lib/measures.mjs';
import { leadInputs } from './lib/lead.mjs';
import { merge, mergePlain } from './lib/merge.mjs';
import { capCheck } from './lib/cap.mjs';
import { deployDev, deployRelease, walkInternal, walkRound } from './lib/deploy.mjs';
import { found } from './lib/found.mjs';
import { roundNext } from './lib/roundnext.mjs';
import { hold, OWED_FILE, owe, owes, paidUpTo, paysOwed } from './lib/hold.mjs';
import { checkVersion, releaseBody, releaseDev, releaseRun, releaseSign } from './lib/release.mjs';
import { leadFetch, trancheReport } from './lib/report.mjs';
import { reviewBrief } from './lib/review.mjs';
import { setupCheck } from './lib/setup.mjs';
import { prune } from './lib/branches.mjs';
import { compareRanges, loadRanges, measureSize, sizeLines } from './lib/size.mjs';
import { startCheck, wakeCheck, workdirLines } from './lib/start.mjs';
import { layoutMove } from './lib/layout.mjs';
import { checkRole, coordinatorOf, senderOf, handoverBegin, handoverConfirm, promptRefresh, readAddress, recordStart, startRole, tipApprovals, tipConfig } from './lib/roles.mjs';
import { bookkeep, fetchState, flushState, handoff, jsonl, outcome, pendingWrites, realPendingWrites, readState, send, stateBatch, strandedWrites, writeState, stateReplay } from './lib/state.mjs';
import { clearLocalPause, githubBudget, noteTurn, Paced, useShared } from './lib/pace.mjs';
import { multiShare, readLedgers, stateShare } from './lib/ghshare.mjs';
// The ledger written, read with every other ledger named (C40).
const accountShare = (root, cfg, flag) => {
  const sh = stateShare(root, cfg);
  return sh ? multiShare(sh, readLedgers(root, cfg, { flag }).map((n) => stateShare(root, cfg, { url: `https://github.com/${n}.git`, readOnly: true }))) : null;
};
import { auditRepos, githubAudit } from './lib/ghaudit.mjs';
import { hookLoadedLine, hookRun } from './lib/ghhook.mjs';
import { closedRows, noticeSlots, status } from './lib/status.mjs';
import { noticeTriage, recordTriage } from './lib/triage.mjs';
import { PROCESS_ROOT, triageAdd, triageChoose, triageClose, triageList } from './lib/register.mjs';
import { withdrawNotice } from './lib/notice.mjs';
import { getPR } from './lib/github.mjs';
import { SWEEP_ROWS_FILE, beforeAct, sweep, sweepTask, watch } from './lib/sweep.mjs';
import { recordCheck, recordSince, takenIn } from './lib/record.mjs';
import { switchIn, switchOut, switchQuiet } from './lib/switch.mjs';
import { checkOpen, openLine, openState, recordOpen, trancheClose, trancheOpen } from './lib/tranche.mjs';
import { CONFIG_FILE, Fail, fail, git, list, loadConfig, now, parseArgs, repoRoot, repoSlug } from './lib/util.mjs';

// Machine-readable findings (ARC-5): printed one per line and, with --out, written as JSON.
export function report(findings, out, extra = {}) {
  for (const f of findings) console.log(`${f.check}: ${f.file}:${f.line}: ${f.message}`);
  if (out) writeFileSync(out, JSON.stringify({ ...extra, findings }, null, 2) + '\n');
  console.log(findings.length ? `${findings.length} finding(s)` : 'ok');
  return findings.length ? 1 : 0;
}

const one = (a, what) => a._[0] || fail(`name the ${what}`);
// A layer named by its number, or a round layer by --round <r> --plan-layer <m> (Bob, 9 Nov: a
// round layer reads as "round 2 · plan layer 11 (layer 13)"): the number of the round layer that
// passes over that plan layer in that round, opened already or the round's next to open.
export function layerArg(a, root) {
  const r = a.round;
  const m = a['plan-layer'];
  if (r === undefined && m === undefined) return one(a, 'layer number (or --round <r> --plan-layer <m>)');
  if (a._[0] !== undefined) fail('name the layer once: its number, or --round <r> --plan-layer <m>');
  if (!/^[1-9]\d*$/.test(String(r)) || !/^[1-9]\d*$/.test(String(m))) fail('--round <r> --plan-layer <m>: both, each a whole number from 1');
  const cfg = loadConfig(root);
  const tr = `refs/remotes/origin/${cfg.tranche}`;
  git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:${tr}`], { cwd: root, allowFail: true });
  fetchState(root, cfg.state_branch, { fresh: true });
  const layers = layersAt(root, cfg, tr);
  const at = layers.find((L) => L.round && L.round.n === Number(r) && L.round.of === Number(m));
  if (at) return at.n;
  if (Number(r) === 1) { const L = layers.find((x) => !x.round && !x.completion && x.n === Number(m)); if (L) return L.n; }
  let rs = null;
  try { rs = nextRound(root, cfg, layers, tr); } catch { rs = null; }
  if (rs?.next && rs.next.round === Number(r) && rs.next.of === Number(m)) return rs.next.n;
  return fail(`no layer is round ${r} · plan layer ${m} on ${cfg.tranche}${rs?.next ? `; the next to open is round ${rs.next.round} · plan layer ${rs.next.of} (layer ${rs.next.n})` : ''}`);
}
const num = (v) => (v === undefined || v === 'unmeasured' ? 'unmeasured' : Number(v));

const commands = {
  // status [--role job --module <id> | --role bob [--context <percent of the window used>] [--live <n>] [--sessions <list_sessions JSON file>]] [--offline]
  status: (a, root) => { status(root, { role: a.role, module: a.module, context: a.context, live: a.live, sessions: a.sessions, offline: !!a.offline }); return 0; },

  // handoff [--context <percent>] [--note "<prose line>"]...: BOB's one-screen handoff, written
  // from status --role bob to the state branch's handoff/bob.md and pushed (SES-3).
  handoff: (a, root) => {
    const lines = [];
    const s = status(root, { role: 'bob', context: a.context, log: (l) => lines.push(l) });
    handoff(root, loadConfig(root).state_branch, { role: 'bob', tranche: s.tranche, lines, notes: list(a.note).filter((x) => x !== true) });
    return 0;
  },

  // send <to-role> "<text>" --from <role>: the record first, then the numbered message and the
  // address read from git, for the session to deliver with send_message (MSG-1, MSG-3).
  // send delivered <n> | send failed <n> --from <role> [--reason "..."]: the outcome (MSG-6).
  send: (a, root) => {
    const sb = loadConfig(root).state_branch;
    if (a._.length !== 2) fail('send <to-role> "<text>" --from <role>, the text in quotes; or send delivered|failed <n> --from <role>');
    const [first, second] = a._;
    if (first === 'delivered' || first === 'failed') {
      outcome(root, sb, { from: a.from, n: Number(second), result: first, reason: typeof a.reason === 'string' ? a.reason : undefined });
    } else send(root, sb, { from: a.from, to: first, text: second });
    return 0;
  },

  // job start <id> --sessions <list_sessions JSON> (the job cap is counted from it; a bare --live <n> is refused, C28) [--coordinator <session>; default the addressed BOB] [--model <m>] [--reopen "<what>" | --restart "<why>" [--stop archived|idle] | --take-in <branch or PR>] [--over-cap "<why>"] [--early]: BOB opens a job (--early: a next-layer module the open layer lists early, R14);
  // --stop, with --restart, how the replaced session stopped (archived, or idle); a BLOCKED job's stop is its BLOCKED commit;
  // --over-cap, BOB's reason to start one whose requirement file is over requirements_cap (REQ-6);
  // --take-in, on work made before Process3, every file of it inside the module's paths;
  // --reopen, a new attempt on a COMPLETE module whose last attempt merged, or on the next job/<id>-<n> when the last attempt was abandoned (commits, no open pull request); --restart, a replacement session for an open job, a COMPLETE one with its pull request open included;
  // --fresh-branch "<why>", a new attempt on job/<id>-<n> cut from the tranche tip, when the job's branch cannot merge (the old branch is kept);
  //   alone, with --reopen "<what>" for a COMPLETE module, or with --restart "<why>" for an OPEN one; the start row records both.
  // No job starts (a reopen included) until the tranche open's grants check has passed; a restart
  // continues a job already started.
  'job start': (a, root) => {
    // A restart on a fresh branch is a new start: it waits on the grants check as any start does.
    if (a.restart === undefined || a['fresh-branch'] !== undefined) {
      const cfg = loadConfig(root);
      fetchState(root, cfg.state_branch, { fresh: true });
      const o = openState(root, cfg);
      if (o.state !== 'open') fail(`${openLine(o)}; nothing was started`);
    }
    // --fresh-branch goes with --reopen (a COMPLETE module) or --restart (an OPEN one), or alone.
    if ([a.reopen, a.restart, a['take-in']].filter((v) => v !== undefined).length > 1) fail('job start takes one of --reopen, --restart and --take-in');
    if (a['fresh-branch'] !== undefined && a['take-in'] !== undefined) fail('--fresh-branch goes alone, with --reopen or with --restart, not with --take-in');
    if (a.stop !== undefined && a.restart === undefined) fail('--stop archived|idle goes with --restart: how the replaced session stopped');
    if (a.early !== undefined && (a.restart !== undefined || a['take-in'] !== undefined || a['fresh-branch'] !== undefined)) fail('--early is a first start of a next-layer module: not with --restart, --take-in or --fresh-branch');
    if (a.restart === undefined) capCheck(root, { live: a.live, sessions: a.sessions, log: console.log });
    jobStart(root, one(a, 'module'), { coordinator: a.coordinator, model: a.model, reopen: a.reopen, restart: a.restart, stop: a.stop, takeIn: a['take-in'], fresh: a['fresh-branch'], overCap: a['over-cap'], early: !!a.early });
    return 0;
  },

  // job complete <id> [--not-verified "..."]... [--test R<id>="<file>::<name>"]... [--exempt-revert "<why>"] [--no-suite] [--session <id>] [--cost-usd <usd>] (the cost is BOB's at the merge)
  'job complete': (a, root) => (jobComplete(root, one(a, 'module'), {
    notVerified: list(a['not-verified']).filter((x) => x !== true), tests: list(a.test), exemptRevert: a['exempt-revert'], noSuite: !!a['no-suite'], costUsd: a['cost-usd'], session: a.session,
  }).ok ? 0 : 1),

  // revert exempt <pr> --why "<why>" --reviewer <session>: a reviewer's exemption from the gate's revert
  // check, for a refactor whose tests rightly pass before and after (AUD-1, JOB-12); never the job's own.
  'revert exempt': (a, root) => (revertExempt(root, one(a, 'pull request'), { why: a.why, reviewer: a.reviewer }).ok ? 0 : 1),

  // job sync <id>: the job brings its branch up to date: origin's job/<id> (BOB's pushes) and the
  // tranche merged in, both deepened from GitHub's compare in a shallow clone, then .process
  // updated to the branch's pin. From a clean checkout without job/<id>, it checks it out first.
  'job sync': (a, root) => (jobSync(root, one(a, 'module')).ok ? 0 : 1),

  // The shared layer branch (layerflow.mjs), the only flow:
  // Each of these names its layer by number, or a round layer by --round <r> --plan-layer <m>.
  // layer open <n>: cut layer/<n> from the tranche tip; lists the jobs that can start, which ROOT starts.
  // layer jobs <n>: the jobs that can start now (not started, or reopened by a reschedule).
  // layer status <n>: each module's state, and whether the layer can merge.
  // layer publish <id> [--every <s>] [--rounds <n>] [job complete's flags]: the job's publish onto its layer.
  // layer retest <id>: a rescheduled module with no work on the layer re-tested by CI on a ready PR, no job session.
  // layer land <pr>: the merge tool's land of a publish PR into its layer, on a green gate on its tip.
  // layer sync <n> [--no-wait]: the tranche into layer/<n> by a tool-made merge PR landed on a green gate (SLB-12: after a pin move).
  // layer merge <n> [--no-wait] [--defer-done "<why>"]: the layer into the tranche as one PR, once every module is complete or deferred.
  // layer report <n> [--tool-from <process3 sha>]: the trial's measures.
  'layer open': (a, root) => (layerOpen(root, layerArg(a, root), { by: senderOf(root, a.as) }).ok ? 0 : 1),
  'layer jobs': (a, root) => (layerJobs(root, layerArg(a, root)).ok ? 0 : 1),
  // layer join <id> --why "<the work>": a module whose layer is behind the open one joins the next
  // layer to open (the coordinator's ruling, 6 Nov): layer open lists it in that layer's jobs.
  'layer join': (a, root) => (layerJoin(root, String(one(a, 'module')), { why: a.why, by: senderOf(root, a.as) }).ok ? 0 : 1),
  'layer status': (a, root) => (layerStatus(root, layerArg(a, root)).ok ? 0 : 1),
  'layer publish': async (a, root) => {
    const pass = [...list(a['not-verified']).filter((x) => x !== true).flatMap((x) => ['--not-verified', x]), ...list(a.test).filter((x) => x !== true).flatMap((x) => ['--test', x]), ...(typeof a['exempt-revert'] === 'string' ? ['--exempt-revert', a['exempt-revert']] : [])];
    // Unset, the run's check of the layer branch waits pacing.poll_first_s (30 s), fixed (PD-6);
    // --every sets it, at 30 s or more.
    const every = a.every === undefined ? null : Number(a.every);
    if (every !== null && !(Number.isFinite(every) && every >= 30)) fail(`--every <seconds>, 30 or more (the poll cadence), not ${JSON.stringify(a.every)}`);
    return (await layerPublish(root, one(a, 'module'), { every: every === null ? null : every * 1000, ...(a.rounds ? { rounds: Number(a.rounds) } : {}), args: pass, session: typeof a.session === 'string' ? a.session : null })).ok ? 0 : 1;
  },
  'layer retest': (a, root) => (layerRetest(root, one(a, 'module'), { by: senderOf(root, a.as) }).ok ? 0 : 1),
  // layer clear <user> --provider <id> [--land <sha>] --why "<the ruling>": a false reschedule cleared for that user only (C11 c).
  'layer clear': (a, root) => (layerClear(root, one(a, 'user module'), { provider: a.provider, land: typeof a.land === 'string' ? a.land : undefined, why: a.why, by: senderOf(root, a.as) }).ok ? 0 : 1),
  'layer land': async (a, root) => ((await layerLand(root, one(a, 'pull request number'), { by: senderOf(root, a.as) })).ok ? 0 : 1),
  'layer sync': async (a, root) => ((await layerSync(root, layerArg(a, root), { wait: !a['no-wait'], by: senderOf(root, a.as) })).ok ? 0 : 1),
  'layer merge': async (a, root) => ((await layerMerge(root, layerArg(a, root), { wait: !a['no-wait'], by: senderOf(root, a.as), ...(a['defer-done'] !== undefined ? { deferDone: a['defer-done'] } : {}) })).ok ? 0 : 1),
  'layer report': (a, root) => (layerReport(root, layerArg(a, root), { toolFrom: typeof a['tool-from'] === 'string' ? a['tool-from'] : null }).ok ? 0 : 1),

  // pin move <product slug> --report <session id> --why "<what it unblocks>" --pin <sha> [--tranche <name>]:
  // run in process3, the last act a process3 build prints when its fix unblocks a product: the pin
  // move as one short session's create_session call; --pin is required, a process3 commit.
  // Refused while a pin move (a pull request from a p3/pin-* head) is open on the product;
  // --supersedes <pr> closes that one as superseded (a comment and a close, its branch kept).
  'pin move': (a, root) => { pinMove(root, a._[0], { pin: a.pin, rest: a._.slice(1), tranche: a.tranche, report: a.report, why: a.why, supersedes: a.supersedes }); return 0; },
  // pin check <product slug>: the pin-move session's check right before it pushes; exit 1 while a pin move is open.
  'pin check': (a) => { pinCheck(a._[0]); return 0; },

  // layout move [--apply] [--also <path>]... (C41): the product's process-only paths into process/.
  // Without --apply, the plan, nothing written; with it, git mv, the config keys rewritten, one commit.
  'layout move': (a, root) => { if (a._.length || (a.apply !== undefined && a.apply !== true)) fail('layout move [--apply] [--also <path>]...'); layoutMove(root, { apply: a.apply === true, also: a.also === true ? fail('--also <path>: name the path') : a.also }); return 0; },

  // notice triage <provider>:<pr>: BOB's act, one read-only worker (a subagent) per brief printed,
  // in parallel when the list is over one worker's share; writes nothing. --record <file> --worker
  // <id> --cost <cost>, once per worker: their lines to the state branch, only when every module
  // has one (a `not affected` with file:line evidence answers the notice for its module).
  'notice triage': (a, root) => {
    const key = one(a, 'notice, <provider>:<pr>');
    if (a.record !== undefined) recordTriage(root, key, { file: a.record, worker: a.worker, cost: a.cost, as: senderOf(root, a.as) });
    else noticeTriage(root, key);
    return 0;
  },

  // notice withdraw <provider>:<pr>: BOB's act, for a notice whose PR changed no file of the
  // provider's own source (read from its merge commit; refused otherwise). Status then drops it.
  'notice withdraw': (a, root) => {
    const key = one(a, 'notice, <provider>:<pr>');
    withdrawNotice(root, loadConfig(root), key, { getPR, slug: repoSlug(root), as: senderOf(root, a.as) });
    return 0;
  },

  // tranche open [--depth <BOB's depth, default 1>]: the grants check's acts, BOB's and a probe's.
  // tranche open --record "<act>|<depth>|ok|refused|declined"... --session <id> [--bob "<words>"]: each
  // outcome; an ok for an act that stopped the open needs Bob's words lifting the stop.
  // tranche open --check: open, pending or stopped; exit 0 only when open.
  'tranche open': (a, root) => {
    if (a.record !== undefined) { recordOpen(root, list(a.record), { session: a.session, depth: a.depth, bob: a.bob, as: senderOf(root, a.as) }); return 0; }
    if (a.check) return checkOpen(root, { depth: a.depth, as: senderOf(root, a.as) }).state === 'open' ? 0 : 1;
    return trancheOpen(root, { depth: a.depth }).state === 'stopped' ? 1 : 0;
  },

  // lane ask <name> "<question>" --context <file>...: the ask recorded open on the state branch and
  // BOB's act, a read-only worker's brief (SES-14). --record "<decision>" --worker <id> [--cost-usd <n>]: the decision.
  'lane ask': (a, root) => {
    if (a._.length !== 2) fail('lane ask <name> "<question>" --context <file>..., the question in quotes');
    laneAsk(root, a._[0], a._[1], { context: a.context, record: a.record, worker: a.worker, cost: a['cost-usd'] });
    return 0;
  },

  // lane start <name> [--replace <session>|pending] | --record <session>: the lane's one session
  // (lane.mjs): its seat written before the create_session call, refused while one is live.
  // lane end <name> --session <id>|pending --why "<why>": the seat freed.
  'lane start': (a, root) => {
    if (a._.length !== 1) fail('lane start <name>');
    const job = ['reopen', 'restart', 'stop', 'take-in', 'fresh-branch', 'over-cap', 'coordinator'].filter((k) => a[k] !== undefined);
    if (job.length) fail(`lane start takes no ${job.map((k) => `--${k}`).join(', ')}: those are job start's; a lane's session is its seat (lane start, --replace, lane end)`);
    laneStart(root, a._[0], { replace: a.replace, record: a.record, model: a.model });
    return 0;
  },
  // lane artifact <name> <link> [--title "<name>"] | --drop: a lane design document's link, recorded for its successor.
  'lane artifact': (a, root) => {
    if (a._.length !== 2) fail('lane artifact <name> <link> [--title "<name>"] [--drop]');
    laneArtifact(root, a._[0], a._[1], { title: a.title, drop: !!a.drop });
    return 0;
  },
  'lane end': (a, root) => {
    if (a._.length !== 1) fail('lane end <name> --session <id>|pending --why "<why>"');
    laneEnd(root, a._[0], { session: a.session, why: a.why });
    return 0;
  },

  // triage add | choose | close | list: the triage register (register.mjs, AUD-8), in process3 the
  // process's, in a product its triage lane's; add, choose and close commit it on the current branch,
  // to land by pull request.
  'triage add': (a, root) => {
    if (a._.length) fail('triage add takes no positional arguments: --kind, --problem, --evidence, and each --option with its --context');
    triageAdd(root, existsSync(join(root, CONFIG_FILE)) ? loadConfig(root) : null, a);
    return 0;
  },
  'triage choose': (a, root) => {
    if (a._.length !== 1) fail('triage choose <id> --response "<the chosen response>" --chosen-by "<the dated words that chose it>" [--end "<the condition that ends it>" --affects <roles>]');
    triageChoose(root, existsSync(join(root, CONFIG_FILE)) ? loadConfig(root) : null, a._[0], a);
    return 0;
  },
  'triage close': (a, root) => {
    if (a._.length !== 1) fail('triage close <id> --how "<how the end condition was met>"');
    triageClose(root, existsSync(join(root, CONFIG_FILE)) ? loadConfig(root) : null, a._[0], { how: a.how });
    return 0;
  },
  'triage list': (a, root) => { triageList(root, existsSync(join(root, CONFIG_FILE)) ? loadConfig(root) : null, { all: !!a.all }); return 0; },

  // tranche close: refused unless every layer is closed and the completion file's items are done or
  // deferred (PLN-4), or the plan says close; BOB's acts.
  // tranche close --record: once the tranche is on main, the close on the state branch.
  'tranche close': (a, root) => (trancheClose(root, { record: !!a.record, report: !!(commands['report tranche'] || commands.report) }).ok ? 0 : 1),

  // found <module> "<finding>" [--from <source, e.g. walk p3dev-l1>] [--write] [--offline]: the route
  // for work found elsewhere. Prints BOB's plain pull request adding an unmet found mark
  // **F<n>** *(not yet met: <source>)* to the module's requirement file, or to its found-work
  // entry (process/found/<module>.md) where it has none; numbered per module. found "<finding>"
  // (no module): process/found/no-module.md, listed by status under `found, no module`.
  // --write also writes the line into the checkout. Writes nothing else, but for a module whose test
  // pins its requirement ids, its layer not open under the layer flow: the finding is then recorded on
  // the state branch as owed to the module's next reopen (C44). --covers <n>: one flaw behind n of a
  // walk's findings, counted as n toward "each recorded".
  found: (a, root) => {
    if (a._.length < 1 || a._.length > 2) fail('found <module> "<finding>" [--from <source>], the finding in quotes; or found "<finding>" for one that names no module');
    const [mod, text] = a._.length === 2 ? a._ : [null, a._[0]];
    if (a.from === true) fail('--from <source>, e.g. --from "walk p3dev-l1"');
    if (a.covers === true) fail('--covers <n>: how many of the walk\'s findings this one stands for');
    found(root, mod, String(text), { from: a.from, covers: a.covers, write: !!a.write, offline: !!a.offline });
    return 0;
  },

  // round next [--apply] [--findings <file>] (C46): from the latest round walk, in one run: its findings
  // by module (one entry per distinct flaw, with its --covers count; a file of `<module>: <text>[, covers <n>]`
  // lines in place of the walk's own texts), each recorded as found records it (an owed reopen, or a
  // found mark in one plain pull request the merge tool merges), the PD-16 set-aside, the round's
  // lowest layer opened and its `job start` commands printed (BOB starts them). Also: a round's next
  // layer opened once one merges; the open layer's jobs; the round's walk owed; the release path
  // after a clean walk. A dry run unless --apply; run again after a partial run, it goes on.
  'round next': (a, root) => {
    if (a.findings === true) fail('--findings <file>: a file of `<module>: <text>` lines');
    if (a.apply !== undefined && a.apply !== true) fail('--apply takes no value');
    return roundNext(root, { apply: !!a.apply, findingsFile: a.findings, by: senderOf(root, a.as) }).ok ? 0 : 1;
  },

  // hold <module:<id>|layer:<n>|slots:<n>> --why "<reason>" --by <session> [--prs <n>[,<n>...]] [--until <ISO time|<n>m|<n>h>]; hold --end <id> --by <session>:
  // the only way to hold startable work below the job cap (coordinator's design, 5 Nov 01:13), a row on the state branch; it lasts until its named PRs land or its --until time.
  hold: (a, root) => { hold(root, a._[0], { why: a.why, by: a.by, until: a.until, prs: a.prs, ...(a.when !== undefined ? { when: a.when } : {}), ...(a.end !== undefined ? { end: a.end } : {}) }); return 0; },

  // test <id>: the module's own suite, as the gate runs it.
  test: (a, root) => (jobTest(root, one(a, 'module'), { session: typeof a.session === 'string' ? a.session : null }).ok ? 0 : 1),

  // block <id> --reason "<why>" [--owner bob|coordinator]: who owes its ruling; bob only for a requirement question, what the product must do (rule 9)
  block: (a, root) => (jobBlock(root, one(a, 'module'), { reason: a.reason, owner: a.owner }).ok ? 0 : 1),

  // metrics add <id> --attempt n --session s [--tokens n] [--cost-usd x] [--denials n]
  //   [--refusal "<act>|<depth>|<channel>"]... [--decline "<act>|<depth>"]... [--outcome o]
  // metrics refusal --session s --act "<act>" --depth n [--module <id>]: one refusal a session
  //   reported, in process/metrics/refusals.bob.jsonl; status prints REFRESH for a session at 10.
  // metrics report: the two health metrics and their figures, BOB's idle time per day and the
  //   process overhead share per job and per layer, ROOT's context per sweep, and the wakes, as JSON.
  // metrics survival [--days 14] [--branch <ref>] [--offline]: each merged job PR at least that old,
  //   whether its change stands on the tranche and on main, and the cost per surviving PR (P3-G5).
  // metrics wake --session s --tokens n --usd x --mode stateless|resident: one measured BOB wake.
  metrics: (a, root) => {
    const sub = a._.shift();
    if (sub === 'add') {
      const id = one(a, 'module');
      if (['bob', 'root'].includes(a.role) && (typeof a.session !== 'string' || !a.session)) fail(`--role ${a.role} needs --session <its session id>: its --cost-usd is that session's cost so far`);
      const split = (v, keys) => list(v).map((x) => Object.fromEntries(String(x).split('|').map((p, i) => [keys[i], p])));
      const row = appendRow(root, id, {
        row: 'attempt', event: 'measured', role: a.role || 'job', attempt: Number(a.attempt || 1), session: a.session || null,
        tokens: num(a.tokens), cost_usd: a['cost-usd'] === undefined ? 'unmeasured' : Number(a['cost-usd']),
        denials: Number(a.denials || 0), refusals: split(a.refusal, ['act', 'depth', 'channel']),
        declines: split(a.decline, ['act', 'depth']), outcome: a.outcome || null,
      }, bobMetricsFile(id));
      console.log(JSON.stringify(row));
      return 0;
    }
    if (sub === 'refusal') {
      const row = recordRefusal(root, { session: a.session, act: a.act, depth: a.depth, module: typeof a.module === 'string' ? a.module : null });
      console.log(JSON.stringify(row));
      return 0;
    }
    if (sub === 'report') {
      const cfg = loadConfig(root);
      const branch = a.branch || `origin/${cfg.tranche}`;
      const { jobRefs, jobRows } = leadFetch(root, cfg);
      let sweepRows = [];
      let lead = { jobRefs, jobRows };
      let roles = new Map();
      try { if (fetchState(root, cfg.state_branch)) { sweepRows = jsonl(readState(root, cfg.state_branch, SWEEP_ROWS_FILE)); roles = stateRoles((p) => readState(root, cfg.state_branch, p)); lead = { ...leadInputs(root, cfg.state_branch, (p) => readState(root, cfg.state_branch, p), cfg.tranche), closed: closedRows(root, cfg, { slug: repoSlug(root) }), jobRefs, jobRows }; } } catch { sweepRows = []; lead = { jobRefs, jobRows }; } // unreadable: idle time and the state's lead times unmeasured
      const layers = git(['show', `${branch}:${cfg.layers_file}`], { cwd: root, allowFail: true });
      console.log(JSON.stringify(metricsReport(root, repoSlug(root), branch, { sweepRows, layers: layers.code === 0 ? layers.stdout : null, refreshAt: cfg.refresh_context, cfg, lead, roles }), null, 2));
      return 0;
    }
    if (sub === 'survival') {
      const cfg = loadConfig(root);
      const days = a.days === undefined ? 14 : Number(a.days);
      if (a.days === true || !Number.isInteger(days) || days < 0) fail(`--days <n>, whole days, not ${JSON.stringify(a.days)}`);
      if (!a.offline) wholeHistory(root, cfg.tranche);
      const main = git(['rev-parse', '-q', '--verify', 'refs/remotes/origin/main'], { cwd: root, allowFail: true }).code === 0 ? 'origin/main' : null;
      console.log(JSON.stringify(survivalReport(root, { branch: a.branch || `origin/${cfg.tranche}`, main, days }), null, 2));
      return 0;
    }
    if (sub === 'wake') {
      console.log(JSON.stringify(recordWake(root, { session: a.session, tokens: a.tokens, usd: a.usd, mode: a.mode })));
      return 0;
    }
    fail('metrics add | metrics refusal | metrics report | metrics survival | metrics wake');
  },

  // bob wake --stateless [--live <n>] [--context <percent>] [--offline]: the create_session call of a
  //   fresh BOB for one wake, its prompt the reading set and status --role bob, with its size; writes nothing.
  'bob wake': (a, root) => {
    if (!a.stateless) fail('bob wake --stateless: the only form so far');
    statelessWake(root, { slug: repoSlug(root), live: a.live, context: a.context, offline: !!a.offline });
    return 0;
  },

  // merge <pr> (--reviewed "<what>" --rounds <n> --review-minutes <n> --findings <n> --acted-on <n> [--review-cost-usd <n> | --review-session <id>[,<id>] | --review-record <file>] | --no-review "<why>") [--decision "<why>"] [--minutes 95] [--job-cost-usd <n> [--job-session <id>]]: BOB merges a job.
  // With no --review-cost-usd, the review's cost is read from the review session's saved get_session result (--review-record), else the
  // module's `metrics add <id> --role review` rows (those of --review-session, or since the attempt started); none read: unmeasured, said why.
  // A job PR that fires a review trigger (a security path changed, a test deleted or loosened: triggers.mjs) merges only --reviewed.
  // merge <pr> --plain (--reviewed "<what>" --rounds <n> | --no-review "<why>") [--decision "<why>"] [--minutes 95]: any other pull request.
  // merge <pr> --plain --pass "<what and why>": a pass (P7) from a pass/<name> branch, a no-judgment change across modules while no job holds them, on a gate that ran their suites; no review, no receipt.
  // --rounds: 1 for the two fresh reviews, 2 with the fix pass and its re-review; more needs --decision (build I).
  merge: (a, root) => {
    const n = Number(one(a, 'pull request number'));
    const review = { reviewed: a.reviewed, noReview: a['no-review'], rounds: a.rounds, decision: a.decision };
    if (a.pass !== undefined && !a.plain) fail('--pass is a plain merge: merge <pr> --plain --pass "<what and why>"');
    if (a.plain) return mergePlain(root, n, { ...review, ...(a.pass !== undefined ? { pass: a.pass } : {}), ...(a.minutes ? { minutes: Number(a.minutes) } : {}), as: senderOf(root, a.as) }).merged ? 0 : 1;
    return merge(root, n, { ...review, ...(a.minutes ? { minutes: Number(a.minutes) } : {}), jobCostUsd: a['job-cost-usd'], jobSession: a['job-session'], reviewMinutes: a['review-minutes'], reviewCostUsd: a['review-cost-usd'], reviewSession: a['review-session'], reviewRecord: a['review-record'], findings: a.findings, actedOn: a['acted-on'] }).merged ? 0 : 1;
  },

  // gate --base <sha> --head <sha> --branch <ref> --pr <n> --draft <true|false> [--started <epoch s>]
  // gate --post <gate.json> --pr <n> [--head <sha>] [--gate-result <result>]
  // Run only by the gate workflow, with the base's process pin: job gate runs the gate on a
  // read-only token and never posts (the shim's --no-post is ignored), and job post posts its row
  // with --post (setup audit, 2 Nov).
  gate: (a, root) => {
    if (a.post !== undefined) {
      if (a.post === true) fail('--post needs the gate.json file');
      postRow(a.post, { pr: a.pr ? Number(a.pr) : null, head: a.head, gateResult: a['gate-result'], slug: repoSlug(root) });
      return 0;
    }
    const { run: r, findings } = gate(root, {
      base: a.base, head: a.head, branch: a.branch, pr: a.pr ? Number(a.pr) : null,
      draft: a.draft === 'true' || a.draft === true, started: a.started ? Number(a.started) * 1000 : Date.now(),
    });
    console.log(`gate: ${r.trigger}; suite ${r.suite}; revert ${r.revert}; receipt ${r.receipt}; ${r.minutes} min`);
    return report(findings, a.out, { run: r });
  },

  // report tranche [--out <file>]: the tranche report in Markdown, from the record alone (Phase 3,
  // PLN-6): elapsed time, work and deferrals per layer, cost and overhead share, refusals by role
  // and act, BOB's idle occurrences, the Phase 3 overhead comparisons; unmeasured where it lacks.
  'report tranche': (a, root) => {
    const cfg = loadConfig(root);
    let slug = null;
    try { slug = repoSlug(root); } catch { slug = null; }
    const { jobRefs, jobRows, deepened } = leadFetch(root, cfg);
    let stateRead = false;
    try { stateRead = fetchState(root, cfg.state_branch); } catch { stateRead = false; }
    // The open provider-notice slots, as status reads them (noticeSlots); unmeasured unread.
    let slots = null;
    if (stateRead) { try { slots = noticeSlots(root, cfg, status(root, { offline: true, log: () => {} }).rows); } catch { slots = null; } }
    const md = trancheReport(root, cfg, { slug, stateRead, deepened, jobRefs, jobRows, notices: slots, io: { state: (p) => readState(root, cfg.state_branch, p) } });
    if (a.out && a.out !== true) writeFileSync(a.out, md + '\n');
    console.log(md);
    return 0;
  },

  // release dev [--version <v>]: BOB's development release (development only; there is no public
  // release): refused until the current round has closed and been deployed and walked, its
  // findings recorded, and unless the checkout is the tranche tip and the config has "release";
  // prints the dispatch on the tranche, the run to watch and the record.
  // release dev --record <run url>: the run's row (version, commit, run, draft release, checks) on the state branch.
  'release dev': (a, root) => (releaseDev(root, { version: a.version === true ? fail('--version <v>') : a.version, record: a.record === true ? fail('--record <run url>') : a.record }).ok ? 0 : 1),
  // deploy dev [--slug <s>]: the round's walk where no internal walk is configured: BOB's development
  // deployment and walk at a round close (development only, the product's own Cloudflare account):
  // dry run behind the guard line, deploy, walk, one row. Refused where an internal walk is configured.
  'deploy dev': (a, root) => (deployDev(root, { slug: a.slug === true ? fail('--slug <s>') : a.slug }).ok ? 0 : 1),
  // deploy release <version>: the release deployment and its walk (BD-R1); no path installs a cut
  // release on a p3dev- deployment yet, so it names the act and the gap, and exits 1.
  'deploy release': (a, root) => (deployRelease(root, String(one(a, 'version'))).ok ? 0 : 1),
  // walk internal: the product's internal walk (deploy.internal_walk) alone, any time, no deploy; its reports on the state branch.
  'walk internal': (a, root) => (walkInternal(root).ok ? 0 : 1),
  // walk round [--slug <s>]: the round's walk where an internal walk is configured (BD-R1, C43): the
  // internal walk alone at a round's close, from the clean tranche tip, one round-walk row; no deploy.
  'walk round': (a, root) => (walkRound(root, { slug: a.slug === true ? fail('--slug <s>') : a.slug }).ok ? 0 : 1),
  // release run checks|assemble [--out <results.json>] [--log-dir <dir>]: the shim's read-only jobs
  // (process-dev-release.yml); --log-dir keeps each step's whole output where the job uploads it.
  'release run': (a, root) => {
    if (a.out === true || a['log-dir'] === true) fail('release run checks|assemble [--out <results.json>] [--log-dir <dir>]');
    return releaseRun(root, one(a, 'step (checks or assemble)'), { out: a.out, logDir: a['log-dir'] }).ok ? 0 : 1;
  },
  // release version <v>: the dispatched version, checked and printed (the shim's publish job).
  'release version': (a) => { console.log(checkVersion(String(one(a, 'version')))); return 0; },
  // release sign <dir>: SHA256SUMS and its Ed25519 signature, the PEM key in P3_SIGN_KEY (only when release.sign_secret is set).
  'release sign': (a) => { releaseSign(one(a, 'directory')); return 0; },
  // release body <checks.json> --version <v> --commit <sha> [--pin <sha>] [--size <size.json>]:
  // the draft release's body: the checks, the process pin, the product sizes and the pin's platform rows.
  'release body': (a) => { console.log(releaseBody(one(a, 'checks file'), { version: a.version, commit: a.commit, pin: a.pin, sizeFile: a.size })); return 0; },

  // review brief <pr> [--scope "<text>"]: prints the fresh-context brief a reviewer subagent is
  // given, filled from the pull request (build N). Writes nothing.
  'review brief': (a, root) => { reviewBrief(root, a._[0], { scope: a.scope }); return 0; },

  // setup check: the product's setup, read-only, against setup/conditions.json; exit 1 when a
  // condition is missing. The eleventh command (setup audit, 2 Nov); job start runs it first.
  // --at HEAD judges the checkout's own commit (its pin and files), not the tranche tip: a
  // pin-move pull request runs it before it merges. session-branch is skipped then.
  // branches prune [--dry-run] [--ref <the run's GITHUB_REF>] [--run <run id>]: the scheduled
  // cleanup (shims/process-branch-prune.yml, lib/branches.mjs). Deletes only while the approvals
  // block on the default branch carries Bob's sentence (branches.mjs APPROVAL); --dry-run prints
  // what the rules would delete and writes nothing.
  'branches prune': (a, root) => {
    if (a._.length || a.ref === true || a.run === true) fail('branches prune [--dry-run] [--ref <ref>] [--run <run id>]');
    return prune(root, { slug: repoSlug(root), dryRun: !!a['dry-run'], ref: a.ref, run: a.run }).ok ? 0 : 1;
  },

  'setup check': (a, root) => (setupCheck(root, { slug: repoSlug(root), at: a.at === true ? fail('--at <ref>, e.g. --at HEAD') : a.at }).ok ? 0 : 1),

  // size [--at <ref>] [--gate <gate.json>] [--out <size.json>]: the product as the process sees it
  // (modules, layers, requirement files, suites, lock files, generated rows, tracked files), read
  // from git at the ref (default HEAD), and against the pin's ranges.json. Writes nothing else.
  size: (a, root) => {
    if (a.at === true || a.gate === true || a.out === true) fail('size [--at <ref>] [--gate <gate.json>] [--out <size.json>]');
    let gateRow = null;
    if (a.gate) { try { gateRow = JSON.parse(readFileSync(a.gate, 'utf8')); } catch { fail(`--gate ${a.gate}: not a readable gate.json`); } }
    let s;
    try { s = measureSize(root, loadConfig(root, a.at), { ref: a.at || 'HEAD', gateRow }); } catch (e) { fail(e.message); }
    const c = compareRanges(s.figures, loadRanges());
    for (const l of [...sizeLines(s), ...c.lines]) console.log(l);
    if (a.out) writeFileSync(a.out, JSON.stringify({ ...s, range: { state: c.state, outside: c.outside } }, null, 2) + '\n');
    return 0;
  },

  // start check [--branch <the branch the session started from; default the tranche>]: a
  // session's first command. Fetches that branch, compares HEAD and the approvals block with its
  // tip, prints both SHAs; exit 1 when either differs (Foundations, "Every session checks its start").
  // It records the approvals it loaded under .git; start check --wake, at every later wake of
  // BOB, ROOT or the watcher, exits 1 when the tip's approvals differ from that record, or with
  // --approvals <hash> (from the starting or task prompt) from that hash.
  // With --wake, once the approvals hold, the calling role's prompt against the one it started
  // from: a changed prompt is printed once, with its pin, and recorded (prompt refresh).
  'start check': (a, root) => {
    // C34: a session whose GitHub hook did not load is told at its first check and every wake (PD-13).
    { let line = null; try { line = hookLoadedLine(); } catch { line = null; } if (line) console.log(line); }
    // C42: one repository per session (BD-R2; PD-13). Warnings, never a refusal.
    { let lines = []; try { lines = workdirLines(root); } catch { lines = []; } for (const l of lines) console.log(l); }
    // A role's first check re-anchors as job start does (coordinator, 5 Nov: ROOT, BOB and the
    // MERGER (since removed) failed theirs on every tranche merge landing between create_session and the check,
    // with the train merging every few minutes): a clean checkout the tip has moved past, with
    // the tip's approvals and pin, moves to the tip; anything else still fails.
    if (!a.wake) return startCheck(root, { branch: a.branch, setup: true, anchor: true }).ok ? 0 : 1;
    if (!wakeCheck(root, { branch: a.branch, approvals: a.approvals }).ok) return 1;
    // A refresh that cannot run (the state push failed, no ROOT for BOB's prompt) never stops a
    // session whose approvals hold: it says so and the session acts by the prompt it has.
    try { promptRefresh(root, { session: typeof a.session === 'string' ? a.session : undefined }); } catch (e) { console.log(`prompt refresh: could not run (${e.message}); act by the prompt you have, and send your coordinator these words`); }
    return 0;
  },

  // start root | start bob | start watcher: the role's starting prompt (and create_session call).
  // start watcher --replace <the addressed watcher's id>: its replacement, by whoever starts ROOT.
  // start coordinator --replace <its id> --branch <b> --handoff <path>: by ROOT, at the coordinator's ask.
  // start record <root|bob|watcher|coordinator> <session id>: the address, written after the session was created.
  start: (a, root) => {
    if (a._[0] === 'record') { recordStart(root, a._[1], a._[2]); return 0; }
    startRole(root, a._[0], { replace: a.replace, branch: a.branch, handoff: a.handoff });
    return 0;
  },

  // sweep --session <id> [--live <n>] [--sessions <list_sessions saved as JSON>] [--context <percent>] [--offline] [--attempt "<who>:<role>:<minutes>:<usd>"]...: ROOT's
  // hourly routine; prints what ROOT must do and writes the heartbeat. sweep task --session <id>:
  // the hourly task's prompt and create_trigger call.
  sweep: (a, root) => {
    if (a._[0] === 'task') { const t = sweepTask(a.session, loadConfig(root).tranche, tipApprovals(root).approvals); console.log(t.prompt); console.log(`create_trigger, bound to this session:\n${JSON.stringify(t.call, null, 2)}`); return 0; }
    sweep(root, { session: a.session, live: a.live, sessions: a.sessions, context: a.context, offline: !!a.offline, attempts: list(a.attempt).filter((x) => x !== true) });
    return 0;
  },

  // switch out --tasks <list_triggers JSON file> --sessions <list_sessions JSON file> --by <session>:
  //   on the old Claude account, the manifest (tasks, live jobs, addresses, unanswered messages) to
  //   the state branch's switch/manifest.json, and the stop acts in order. Writes nothing else.
  // switch in --sessions <list_sessions JSON file> --by <session> [--approvals <hash>]: the first act
  //   on the new account: the preflight (GitHub, the account, push, the approvals), refused on any
  //   failure, then switch/retired.json (the old account's sessions, R13's session_gone) and the
  //   restart's acts in order. Writes nothing else.
  //   --dry-run (R16): the manifest under switch/dry-run/, never switch/manifest.json, and nothing stopped.
  //   switch in --preflight --by <session>: every check, read-only, plus the session checks to run;
  //   from any session on either account, before anything stops.
  // switch quiet [--minutes 2]: exit 0 only when the tranche's tip has not moved for that long.
  // The runbook: rulebooks/account-switch.md.
  // github budget (R17): use against each of GitHub's published limits, per window, account-wide
  // (pace.mjs), the pause, and each session's calls. Writes nothing but this clone's shared use.
  // C40: the account-wide count read across the ledger written and every ledger named
  // (pacing.read_ledgers; --ledgers or P3_LEDGERS, comma-separated "<owner>/<repo>").
  'github budget': (a, root) => {
    const cfg = existsSync(join(root, CONFIG_FILE)) ? loadConfig(root) : null;
    const sh = accountShare(root, cfg, a.ledgers);
    if (sh) useShared(sh);
    githubBudget(root);
    return 0;
  },
  // github audit [--since <iso>] [--repo <owner/repo>]... (R17c): GitHub's own evidence of calls,
  // pushes and writes against the account's ledger; exit 1 on an unexplained push or write gap.
  'github audit': (a, root) => {
    const cfg = existsSync(join(root, CONFIG_FILE)) ? loadConfig(root) : null;
    let slug = null;
    try { slug = repoSlug(root); } catch { slug = null; }
    const processOrigin = git(['config', '--get', 'remote.origin.url'], { cwd: PROCESS_ROOT, allowFail: true }).stdout.trim();
    const others = readLedgers(root, cfg, { flag: a.ledgers });
    const repos = [...new Set([...auditRepos({ slug, cfg, processOrigin }), ...others, ...list(a.repo).filter((x) => typeof x === 'string')])];
    // Against the account's ledgers, never this clone's log alone (cold review of R17c): the one
    // written and every one named (C40).
    const sh = accountShare(root, cfg, a.ledgers);
    if (!sh) fail('github audit: no GitHub ledger here: nothing to audit against');
    useShared(sh);
    try { return githubAudit(root, { since: typeof a.since === 'string' ? a.since : undefined, repos, product: cfg ? slug : null, stateBranch: cfg?.state_branch, login: typeof a.login === 'string' ? a.login : null }).ok ? 0 : 1; } catch (e) { if (e instanceof Fail) throw e; fail(e.message); }
  },
  // github hook (R17c): the Claude Code PreToolUse hook; the hook's JSON on stdin. Exit 2 blocks the
  // call (a governor refusal, or a raw push, gh or curl to GitHub), with the reason on stderr.
  'github hook': (a, root) => {
    let input = null;
    try { input = JSON.parse(readFileSync(0, 'utf8') || 'null'); } catch { input = null; }
    // The same as tool/hook.mjs (R17d), which the settings call: this command stays for older ones.
    return hookRun(input, root);
  },
  // github push <git push arguments> (R17b, coordinator's ruling 6 Nov): every session pushes only
  // through this: it waits only for GitHub's own pause or stop (PD-6), and is logged and shared. Never a force or a delete (Bob's standing approvals).
  'github push': (a, root) => {
    if (Object.keys(a).some((k) => k !== '_' && !['set-upstream', 'quiet'].includes(k))) fail('github push <remote> <refspec>... [--set-upstream] [--quiet]: no other flag (never --force, --delete, --mirror or --all)');
    if (['set-upstream', 'quiet'].some((k) => a[k] !== undefined && a[k] !== true)) fail('github push <remote> <refspec>... --set-upstream --quiet: the flags take no value; put them after the refspecs');
    // An explicit refspec always (cold review of R17b): a bare remote pushes what the clone's config
    // says, which can mirror (delete) or force. No wildcard, no force, no delete, never main.
    const [remote, ...specs] = a._.map(String);
    if (!remote || !specs.length) fail('github push <remote> <refspec>...: name what to push (e.g. HEAD:refs/heads/<your branch>); a bare remote pushes whatever the clone\'s config says');
    if ([remote, ...specs].some((x) => /^[+:-]/.test(x))) fail('github push <remote> <refspec>...: a refspec never starts with + (a force) or : (a delete)');
    for (const x of specs) {
      if (x.includes('*')) fail(`github push: ${x}: no wildcard refspec; push one branch at a time`);
      const dst = (x.includes(':') ? x.split(':').pop() : x).replace(/^refs\/heads\//, '');
      if (!dst) fail(`github push: ${x}: no empty destination (a delete)`);
      if (dst === 'main') fail(`github push: ${x}: never to main; main moves only through the tranche's pull request (Bob's standing approvals)`);
    }
    for (const k of [`remote.${remote}.mirror`, `remote.${remote}.push`]) {
      const v = git(['config', '--get-all', k], { cwd: root, allowFail: true }).stdout.trim();
      if (v && !(k.endsWith('.mirror') && v === 'false')) fail(`github push: ${k} is set in this clone (${v.split('\n')[0]}): it can force or delete; unset it first`);
    }
    const r = git(['push', ...(a['set-upstream'] ? ['-u'] : []), ...(a.quiet ? ['-q'] : []), remote, ...specs], { cwd: root, allowFail: true });
    if (r.stdout.trim()) console.log(r.stdout.trim());
    if (r.stderr.trim()) console.error(r.stderr.trim());
    return r.code === 0 ? 0 : 1;
  },
  // github note --content <n> [--points <n>] [--what <text>] (R17b): a session records the
  // connector writes it is about to make (a PR created, edited or marked ready, a comment, a
  // review: each one content-creating request, 5 points), before making them; it waits or refuses
  // as a gh call would. Connector reads stay on GitHub's primary count, which sees them.
  'github note': (a, root) => {
    try { noteTurn(root, { content: a.content ?? 0, ...(a.points !== undefined ? { points: a.points } : {}), ...(typeof a.what === 'string' ? { what: a.what } : {}) }); } catch (e) { if (e instanceof Paced) fail(e.message); throw e; }
    console.log(`github: ${a.content ?? 0} connector write(s) recorded; make them now`);
    return 0;
  },
  // github resume --by <session> (R17): the coordinator clears a stop (two refusals within an
  // hour) once the account is in good standing; every session may call GitHub again.
  'github resume': (a, root) => {
    const by = typeof a.by === 'string' && /^session_[A-Za-z0-9]+$/.test(a.by) ? a.by : fail('github resume --by <the coordinator\'s session id>');
    const cfg = existsSync(join(root, CONFIG_FILE)) ? loadConfig(root) : null;
    const sh = stateShare(root, cfg) || fail('no GitHub ledger here');
    sh.resume(by);
    clearLocalPause(root);
    console.log(`github: resumed by ${by}; every session may call GitHub again, within the budget`);
    return 0;
  },

  switch: (a, root) => {
    const sub = a._[0];
    if (sub === 'out') return (switchOut(root, { tasks: a.tasks, sessions: a.sessions, by: a.by, dryRun: !!a['dry-run'] }), 0);
    if (sub === 'in') { const r = switchIn(root, { sessions: a.sessions, by: a.by, approvals: a.approvals, preflight: !!a.preflight }); return r.ok === false ? 1 : 0; }
    if (sub === 'quiet') return switchQuiet(root, { ...(a.minutes !== undefined ? { minutes: a.minutes } : {}) }).ok ? 0 : 1;
    fail('switch out --tasks <file> --sessions <file> --by <session> [--dry-run] | switch in --sessions <file> --by <session> [--approvals <hash>] | switch in --preflight --by <session> | switch quiet [--minutes <n>]');
  },

  // watch --session <the watcher's id> [--full | --escalated <minutes>]: the watcher's decision,
  // daily or at once on an escalation.
  watch: (a, root) => { watch(root, { session: a.session, full: !!a.full, escalated: a.escalated }); return 0; },

  // address <root|bob|watcher|coordinator>: the address as the state branch holds it now;
  // the coordinator's, else `coordinator` in process/config.json.
  address: (a, root) => {
    const asked = String(one(a, 'role (root, bob, watcher or coordinator)')).toLowerCase();
    if (asked === 'coordinator') {
      const addr = readAddress(root);
      const c = coordinatorOf(tipConfig(root), addr) || fail('no coordinator is addressed and process/config.json on the tranche names none');
      console.log(addr.coordinator?.session === c ? `${c} (since ${addr.coordinator.at})` : `${c} (from process/config.json on the tranche)`);
      return 0;
    }
    const role = checkRole(asked);
    const e = readAddress(root)[role];
    if (!e) fail(`no ${role} is addressed`);
    console.log(`${e.session} (since ${e.at})`);
    return 0;
  },

  // handover begin | handover confirm <new BOB id>: ROOT replaces BOB (SES-2).
  handover: (a, root) => {
    const sub = a._.shift();
    if (sub === 'begin') { handoverBegin(root); return 0; }
    if (sub === 'confirm') { handoverConfirm(root, a._[0]); return 0; }
    fail('handover begin | handover confirm <new BOB session id>');
  },

  // state replay [<ref>...]: the state writes kept when their push gave up (refs/p3/unpushed/*), made again.
  'state replay': (a, root) => { stateReplay(root, loadConfig(root).state_branch, a._.map(String)); return 0; },

  // ledger check [--base <ref> --branch <name> [--home <tranche ref>]]: schema; on a job branch, own
  // status only; with --home (the layer flow), its own entry may be added as the tranche holds it.
  'ledger check': (a, root) => {
    const base = a.base ? git(['merge-base', 'HEAD', a.base], { cwd: root }) : undefined;
    return report(checkLedger(root, { base, branch: a.branch, home: typeof a.home === 'string' ? a.home : undefined }), a.out);
  },

  // record-check --base <sha> --head <sha> [--branch <head branch>] [--onto <ref>]... [--out f]
  // Run by CI with the base's own tool. A missing or all-zero base (a new branch) becomes the
  // merge-base with the first --onto ref that exists (default: the tranche, then main).
  'record-check': (a, root) => {
    const head = a.head || 'HEAD';
    const onto = list(a.onto).length ? list(a.onto) : [`origin/${loadConfig(root).tranche}`, 'origin/main'];
    let base = a.base && !/^0+$/.test(a.base) ? a.base : null;
    if (!base) {
      for (const o of onto) {
        const r = git(['merge-base', head, o], { cwd: root, allowFail: true });
        if (r.code === 0) { base = r.stdout.trim(); break; }
      }
      if (!base) fail(`no base: none of ${onto.join(', ')} shares history with ${head}`);
    }
    const ledgerBase = git(['merge-base', head, base], { cwd: root });
    const cfg = loadConfig(root, base);
    const s = recordSince(root, { base, head });
    // A take-in's earlier work, before its start commit, is left out (takenIn): on job/<id> that
    // job's, on any other branch every module's.
    const job = branchModule(String(a.branch || ''), ledgerIds(root, head));
    const t = takenIn(root, { base, head, id: job || undefined });
    // In the layer flow, a job may carry its own entry from the tranche, the ledger's home.
    const home = job && layerMode(cfg) ? homeRef(root, cfg.tranche) : null;
    const { commits, findings, notices, size_waived } = recordCheck(root, cfg, { base, head, branch: a.branch, ledgerBase, since: s.since, takenIn: t.tips, home });
    if (s.finding) findings.push(s.finding);
    findings.push(...t.findings);
    console.log(`checked ${commits} commit(s) after ${base.slice(0, 10)}${s.since ? ` and after ${s.since.slice(0, 10)} (record_since, from the ${s.from})` : ''}${t.tips.length ? `, leaving out the earlier work taken in at ${t.tips.map((x) => x.slice(0, 10)).join(', ')}` : ''}`);
    // Annotations, so a notice shows on the pull request and not only in the log.
    const esc = (x, prop) => String(x).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
      .replace(prop ? /[:,]/g : /$^/, (c) => (c === ':' ? '%3A' : '%2C'));
    for (const n of notices) console.log(`::warning file=${esc(n.file, true)}::${esc(n.message)}`);
    return report(findings, a.out, { commits, base, notices, ...(size_waived.length ? { size_waived } : {}) });
  },
};

// After an act that wrote and succeeded, the tool ends the records whose condition is met (R13,
// expire.mjs); a failure is said on stderr and never changes the act's result.
export function endsAfter(root, cfg, name, code, { expire = expireRecords, err = (m) => console.error(m) } = {}) {
  if (code !== 0 || !ENDS_AFTER.has(name)) return null;
  try { return expire(root, cfg); } catch (e) { err(`records whose condition is met were not ended: ${e.message}`); return null; }
}
// The acts after which the tool ends the records whose condition is met (R13).
export const ENDS_AFTER = new Set(['merge', 'hold', 'job start', 'job complete', 'block', 'layer open', 'layer land', 'layer merge', 'layer join', 'layer publish', 'round next', 'tranche open', 'tranche close', 'lane start', 'lane end', 'lane ask', 'notice triage']);
// The commands whose state writes push at once (R17): see main.
let endFlush = () => {};
let endHooked = false;
export const UNBATCHED = new Set(['job start', 'lane start', 'start', 'handover', 'state replay', 'round next']);
export async function main(argv) {
  const a = parseArgs(argv);
  const two = a._.slice(0, 2).join(' ');
  const name = commands[two] ? two : a._[0];
  const fn = commands[name];
  if (!fn) {
    console.log(`commands: ${Object.keys(commands).join(', ')}`);
    return name ? 2 : 0;
  }
  a._ = a._.slice(name.split(' ').length);
  let root = null;
  let cfg = null;
  let ledger = null;
  // One state push per command (R17, GitHub pacing): the writes are coalesced and pushed at its
  // end. Not the commands whose write reserves a session they then hand out (a seat, a start, a
  // handover) or that replay kept writes: theirs push at once, as before (cold review of R17).
  const batched = process.env.P3_STATE_BATCH !== '0' && !UNBATCHED.has(name);
  if (batched) stateBatch(true);
  let flushed = false;
  const flush = () => {
    if (flushed || !batched) return null;
    flushed = true;
    // This clone's GitHub use, shared with the command's push (R17, ghshare.mjs).
    // Not from the hook: a hook run shares nothing (cold review of R17c: it pushed from plain Bash calls).
    if (ledger && name !== 'github hook') { try { ledger.shareNow({ pending: realPendingWrites() }); } catch { /* the budget's record; never the act's failure */ } }
    stateBatch(false);
    try { flushState(); return null; } catch (e) { return e; }
  };
  // A command ended early still pushes what it wrote: at exit, and on SIGTERM, SIGHUP or SIGINT
  // (a timeout, or publish halting its run); a SIGKILL's writes stay kept for the next command.
  if (batched) {
    endFlush = () => { const e = flush(); if (e) console.error(`p3 ${name}: ${e.message}`); };
    if (!endHooked) {
      endHooked = true;
      process.on('exit', () => endFlush());
      for (const [sig, n] of [['SIGTERM', 15], ['SIGHUP', 1], ['SIGINT', 2]]) if (!process.listenerCount(sig)) process.once(sig, () => { endFlush(); process.exit(128 + n); });
    }
  }
  try {
    root = repoRoot();
    // A p3 command killed in this clone before its flush left its writes kept (state.mjs): moved
    // for replay, and said.
    if (name !== 'github hook') try { const k = strandedWrites(root); if (k) console.error(`note: ${k} state write(s) of a p3 command killed in this clone are kept: push them with \`node .process/tool/p3.mjs state replay\``); } catch { /* not a clone with state */ }
    // The idle check in a product only: process3 itself has no process/config.json.
    try { cfg = existsSync(join(root, CONFIG_FILE)) ? loadConfig(root) : null; } catch { cfg = null; }
    // The account-wide GitHub budget's shared store: the product's state branch (R17, ghshare.mjs).
    // Not in a workflow: its GITHUB_TOKEN has its own limit, so its refusals pause nobody else. A
    // clone with no product config (process3) writes its own (C40; pacing.ledger names another).
    if (!process.env.NODE_TEST_CONTEXT && process.env.GITHUB_ACTIONS !== 'true') { try { ledger = stateShare(root, cfg); useShared(ledger); } catch { ledger = null; } }
    if (cfg && !process.env.NODE_TEST_CONTEXT && name !== 'github hook') beforeAct(root, cfg, name, a);
    const begun = new Date().toISOString();
    const code = (await fn(a, root)) ?? 0;
    // BOB acted on the start list: the acts owed before this began are paid (hold.mjs).
    if (cfg && code === 0 && paysOwed(name)) { try { bookkeep(root, cfg.state_branch, `starts owed: paid by ${name}`, 'paid', { path: OWED_FILE, begun }); } catch (e) { console.error(`starts owed not updated: ${e.message}`); } }
    const act = cfg && code === 0 ? owes(name, a) : null;
    if (act) { try { bookkeep(root, cfg.state_branch, `starts owed: ${act}`, 'owe', { path: OWED_FILE, act, at: now() }); } catch (e) { console.error(`starts owed not recorded: ${e.message}`); } }
    // Records whose condition is met end at the tool's writes (R13, expire.mjs): after each act
    // that writes, the holds met end, recorded; never a refusal of the act. The sweep does the
    // same with the session list (lane seats).
    if (cfg && !process.env.NODE_TEST_CONTEXT) endsAfter(root, cfg, name, code);
    const lost = flush();
    if (lost) throw lost;
    return code;
  } catch (e) {
    // A refusal after writes: they are pushed, as they were before the writes were coalesced.
    const lost = flush();
    if (lost instanceof Fail) console.error(`p3 ${name}: ${lost.message}`);
    else if (lost) throw lost;
    if (e instanceof Fail) {
      console.error(`p3 ${name}: ${e.message}`);
      if (a.out) writeFileSync(a.out, JSON.stringify({ error: e.message, findings: [{ check: 'tool', file: '(tool)', line: 1, message: e.message }] }, null, 2) + '\n');
      return 1;
    }
    throw e;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/p3.mjs')) {
  process.exitCode = await main(process.argv.slice(2));
}
