#!/usr/bin/env node
// Process3 tool: one program, a fresh process per command, run from the pinned clone.
// Usage: node <clone>/tool/p3.mjs <command> [args]
// p3-capability: gate-no-post (products' older shims grep for this line at the pin; keep it until
// every product carries the shim without the legacy path; review B of PR 32)
import { readFileSync, writeFileSync } from 'node:fs';
import { gate, postRow } from './lib/gate.mjs';
import { pinCheck, pinMove } from './lib/pin.mjs';
import { layerClose } from './lib/layer.mjs';
import { laneAsk } from './lib/lane.mjs';
import { jobBlock, jobComplete, jobStart, jobTest } from './lib/job.mjs';
import { checkLedger } from './lib/ledger.mjs';
import { appendRow, bobMetricsFile, recordRefusal, recordWake, report as metricsReport, stateRoles } from './lib/metrics.mjs';
import { statelessWake, survivalReport, wholeHistory } from './lib/measures.mjs';
import { leadInputs } from './lib/lead.mjs';
import { merge, mergePlain } from './lib/merge.mjs';
import { deployDev } from './lib/deploy.mjs';
import { found } from './lib/found.mjs';
import { releaseBody, releaseDev, releaseRun, releaseSign, versionOf } from './lib/release.mjs';
import { leadFetch, trancheReport } from './lib/report.mjs';
import { reviewBrief } from './lib/review.mjs';
import { setupCheck } from './lib/setup.mjs';
import { compareRanges, loadRanges, measureSize, sizeLines } from './lib/size.mjs';
import { startCheck, wakeCheck } from './lib/start.mjs';
import { checkRole, senderOf, handoverBegin, handoverConfirm, promptRefresh, readAddress, recordStart, startRole, tipApprovals } from './lib/roles.mjs';
import { fetchState, handoff, jsonl, outcome, readState, send } from './lib/state.mjs';
import { closedRows, status } from './lib/status.mjs';
import { noticeTriage, recordTriage } from './lib/triage.mjs';
import { withdrawNotice } from './lib/notice.mjs';
import { getPR } from './lib/github.mjs';
import { SWEEP_ROWS_FILE, sweep, sweepTask, watch } from './lib/sweep.mjs';
import { recordCheck, recordSince, takenIn } from './lib/record.mjs';
import { checkOpen, openLine, openState, recordOpen, trancheClose, trancheOpen } from './lib/tranche.mjs';
import { Fail, fail, git, list, loadConfig, parseArgs, repoRoot, repoSlug } from './lib/util.mjs';

// Machine-readable findings (ARC-5): printed one per line and, with --out, written as JSON.
export function report(findings, out, extra = {}) {
  for (const f of findings) console.log(`${f.check}: ${f.file}:${f.line}: ${f.message}`);
  if (out) writeFileSync(out, JSON.stringify({ ...extra, findings }, null, 2) + '\n');
  console.log(findings.length ? `${findings.length} finding(s)` : 'ok');
  return findings.length ? 1 : 0;
}

const one = (a, what) => a._[0] || fail(`name the ${what}`);
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

  // job start <id> [--coordinator <session>; default the addressed BOB] [--model <m>] [--reopen "<what>" | --restart "<why>" [--stop archived|idle] | --take-in <branch or PR>] [--over-cap "<why>"]: BOB opens a job;
  // --stop, with --restart, how the replaced session stopped (archived, or idle); a BLOCKED job's stop is its BLOCKED commit;
  // --over-cap, BOB's reason to start one whose requirement file is over requirements_cap (REQ-6);
  // --take-in, on work made before Process3, every file of it inside the module's paths;
  // --reopen, a new attempt on a COMPLETE module whose last attempt merged; --restart, a replacement session for an open job.
  // No job starts (a reopen included) until the tranche open's grants check has passed; a restart
  // continues a job already started.
  'job start': (a, root) => {
    if (a.restart === undefined) {
      const cfg = loadConfig(root);
      fetchState(root, cfg.state_branch, { fresh: true });
      const o = openState(root, cfg);
      if (o.state !== 'open') fail(`${openLine(o)}; nothing was started`);
    }
    if ([a.reopen, a.restart, a['take-in']].filter((v) => v !== undefined).length > 1) fail('job start takes one of --reopen, --restart and --take-in');
    if (a.stop !== undefined && a.restart === undefined) fail('--stop archived|idle goes with --restart: how the replaced session stopped');
    jobStart(root, one(a, 'module'), { coordinator: a.coordinator, model: a.model, reopen: a.reopen, restart: a.restart, stop: a.stop, takeIn: a['take-in'], overCap: a['over-cap'] });
    return 0;
  },

  // job complete <id> [--not-verified "..."]... [--test R<id>="<file>::<name>"]... [--exempt-revert "<why>"] [--no-suite]
  'job complete': (a, root) => (jobComplete(root, one(a, 'module'), {
    notVerified: list(a['not-verified']).filter((x) => x !== true), tests: list(a.test), exemptRevert: a['exempt-revert'], noSuite: !!a['no-suite'],
  }).ok ? 0 : 1),

  // layer close <n>: BOB closes the open layer once status says it is ready: the layer checks on
  // the tranche tip, then the close recorded on the state branch with the deferred marks.
  'layer close': (a, root) => (layerClose(root, one(a, 'layer number'), { as: senderOf(root, a.as) }).ok ? 0 : 1),

  // pin move <product slug> --report <session id> --why "<what it unblocks>" [--pin <sha>] [--tranche <name>]:
  // run in process3, the last act a process3 build prints when its fix unblocks a product: the pin
  // move as one short session's create_session call (pin default: process3's tranche tip).
  // Refused while a pin move (a pull request from a p3/pin-* head) is open on the product;
  // --supersedes <pr> closes that one as superseded (a comment and a close, its branch kept).
  'pin move': (a, root) => { pinMove(root, a._[0], { pin: a.pin, tranche: a.tranche, report: a.report, why: a.why, supersedes: a.supersedes }); return 0; },
  // pin check <product slug>: the pin-move session's check right before it pushes; exit 1 while a pin move is open.
  'pin check': (a) => { pinCheck(a._[0]); return 0; },

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

  // tranche close: refused unless every layer is closed and the completion file's items are done or
  // deferred (PLN-4), or the plan says close; BOB's acts.
  // tranche close --record: once the tranche is on main, the close on the state branch.
  'tranche close': (a, root) => (trancheClose(root, { record: !!a.record, report: !!(commands['report tranche'] || commands.report) }).ok ? 0 : 1),

  // found <module> "<finding>" [--from <source, e.g. walk p3dev-l1>] [--write] [--offline]: the route
  // for work found elsewhere. Prints BOB's plain pull request adding an unmet found mark
  // **F<n>** *(not yet met: <source>)* to the module's requirement file, or to its found-work
  // entry (process/found/<module>.md) where it has none; numbered per module. found "<finding>"
  // (no module): process/found/no-module.md, listed by status under `found, no module`.
  // --write also writes the line into the checkout. Writes nothing else.
  found: (a, root) => {
    if (a._.length < 1 || a._.length > 2) fail('found <module> "<finding>" [--from <source>], the finding in quotes; or found "<finding>" for one that names no module');
    const [mod, text] = a._.length === 2 ? a._ : [null, a._[0]];
    if (a.from === true) fail('--from <source>, e.g. --from "walk p3dev-l1"');
    found(root, mod, String(text), { from: a.from, write: !!a.write, offline: !!a.offline });
    return 0;
  },

  // test <id>: the module's own suite, as the gate runs it.
  test: (a, root) => (jobTest(root, one(a, 'module')).ok ? 0 : 1),

  // block <id> --reason "<why>"
  block: (a, root) => (jobBlock(root, one(a, 'module'), { reason: a.reason }).ok ? 0 : 1),

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

  // merge <pr> (--reviewed "<what>" --rounds <n> | --no-review "<why>") [--decision "<why>"] [--minutes 30]: BOB merges a job.
  // merge <pr> --plain (--reviewed "<what>" --rounds <n> | --no-review "<why>") [--decision "<why>"] [--minutes 20]: any other pull request.
  // --rounds: 1 for the two fresh reviews, 2 with the fix pass and its re-review; more needs --decision (build I).
  merge: (a, root) => {
    const n = Number(one(a, 'pull request number'));
    const review = { reviewed: a.reviewed, noReview: a['no-review'], rounds: a.rounds, decision: a.decision };
    if (a.plain) return mergePlain(root, n, { ...review, minutes: Number(a.minutes || 20), as: senderOf(root, a.as) }).merged ? 0 : 1;
    return merge(root, n, { ...review, minutes: Number(a.minutes || 30) }).merged ? 0 : 1;
  },

  // gate --base <sha> --head <sha> --branch <ref> --pr <n> --draft <true|false> [--started <epoch s>] [--no-post]
  // gate --post <gate.json> --pr <n> [--head <sha>] [--gate-result <result>]
  // Run only by the gate workflow, with the base's process pin: job gate runs the gate with
  // --no-post on a read-only token, and job post posts its row with --post (setup audit, 2 Nov).
  gate: (a, root) => {
    if (a.post !== undefined) {
      if (a.post === true) fail('--post needs the gate.json file');
      postRow(a.post, { pr: a.pr ? Number(a.pr) : null, head: a.head, gateResult: a['gate-result'], slug: repoSlug(root) });
      return 0;
    }
    const { run: r, findings } = gate(root, {
      base: a.base, head: a.head, branch: a.branch, pr: a.pr ? Number(a.pr) : null, post: !a['no-post'],
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
    const md = trancheReport(root, cfg, { slug, stateRead, deepened, jobRefs, jobRows, io: { state: (p) => readState(root, cfg.state_branch, p) } });
    if (a.out && a.out !== true) writeFileSync(a.out, md + '\n');
    console.log(md);
    return 0;
  },

  // release dev [--version <v>]: BOB's development release (development only; there is no public
  // release): refused unless the layers allow it, the checkout is the tranche tip and the config
  // has "release"; prints the push of p3dev-release/<v>, the run to watch and the record.
  // release dev --record <run url>: the run's row (version, commit, run, draft release, checks) on the state branch.
  'release dev': (a, root) => (releaseDev(root, { version: a.version === true ? fail('--version <v>') : a.version, record: a.record === true ? fail('--record <run url>') : a.record }).ok ? 0 : 1),
  // deploy dev [--slug <s>]: BOB's development deployment and walk after a layer close (development
  // only, the product's own Cloudflare account): dry run behind the guard line, deploy, walk, one row.
  'deploy dev': (a, root) => (deployDev(root, { slug: a.slug === true ? fail('--slug <s>') : a.slug }).ok ? 0 : 1),
  // release run checks|assemble [--out <results.json>]: the shim's read-only jobs (process-dev-release.yml).
  'release run': (a, root) => (releaseRun(root, one(a, 'step (checks or assemble)'), { out: a.out }).ok ? 0 : 1),
  // release version --branch <ref>: the version a p3dev-release/<v> branch names, printed (the shim's publish job).
  'release version': (a) => { console.log(versionOf(a.branch)); return 0; },
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
    if (!a.wake) return startCheck(root, { branch: a.branch, setup: true }).ok ? 0 : 1;
    if (!wakeCheck(root, { branch: a.branch, approvals: a.approvals }).ok) return 1;
    // A refresh that cannot run (the state push failed, no ROOT for BOB's prompt) never stops a
    // session whose approvals hold: it says so and the session acts by the prompt it has.
    try { promptRefresh(root, { session: typeof a.session === 'string' ? a.session : undefined }); } catch (e) { console.log(`prompt refresh: could not run (${e.message}); act by the prompt you have, and send your coordinator these words`); }
    return 0;
  },

  // start root | start bob | start watcher: the role's starting prompt (and create_session call).
  // start watcher --replace <the addressed watcher's id>: its replacement, by whoever starts ROOT.
  // start record <root|bob|watcher> <session id>: the address, written after the session was created.
  start: (a, root) => {
    if (a._[0] === 'record') { recordStart(root, a._[1], a._[2]); return 0; }
    startRole(root, a._[0], { replace: a.replace });
    return 0;
  },

  // sweep --session <id> [--live <n>] [--context <percent>] [--offline] [--attempt "<who>:<role>:<minutes>:<usd>"]...: ROOT's
  // hourly routine; prints what ROOT must do and writes the heartbeat. sweep task --session <id>:
  // the hourly task's prompt and create_trigger call.
  sweep: (a, root) => {
    if (a._[0] === 'task') { const t = sweepTask(a.session, loadConfig(root).tranche, tipApprovals(root).approvals); console.log(t.prompt); console.log(`create_trigger, bound to this session:\n${JSON.stringify(t.call, null, 2)}`); return 0; }
    sweep(root, { session: a.session, live: a.live, context: a.context, offline: !!a.offline, attempts: list(a.attempt).filter((x) => x !== true) });
    return 0;
  },

  // watch --session <the watcher's id> [--full | --escalated <minutes>]: the watcher's decision,
  // daily or at once on an escalation.
  watch: (a, root) => { watch(root, { session: a.session, full: !!a.full, escalated: a.escalated }); return 0; },

  // address <root|bob|watcher>: the address as the state branch holds it now.
  address: (a, root) => {
    const role = checkRole(String(one(a, 'role (root, bob or watcher)')).toLowerCase());
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

  // ledger check [--base <ref> --branch <name>]: schema; on a job branch, own status only.
  'ledger check': (a, root) => {
    const base = a.base ? git(['merge-base', 'HEAD', a.base], { cwd: root }) : undefined;
    return report(checkLedger(root, { base, branch: a.branch }), a.out);
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
    const job = String(a.branch || '').match(/^job\/(.+)$/);
    const t = takenIn(root, { base, head, id: job ? job[1] : undefined });
    const { commits, findings, notices } = recordCheck(root, cfg, { base, head, branch: a.branch, ledgerBase, since: s.since, takenIn: t.tips });
    if (s.finding) findings.push(s.finding);
    findings.push(...t.findings);
    console.log(`checked ${commits} commit(s) after ${base.slice(0, 10)}${s.since ? ` and after ${s.since.slice(0, 10)} (record_since, from the ${s.from})` : ''}${t.tips.length ? `, leaving out the earlier work taken in at ${t.tips.map((x) => x.slice(0, 10)).join(', ')}` : ''}`);
    // Annotations, so a notice shows on the pull request and not only in the log.
    const esc = (x, prop) => String(x).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
      .replace(prop ? /[:,]/g : /$^/, (c) => (c === ':' ? '%3A' : '%2C'));
    for (const n of notices) console.log(`::warning file=${esc(n.file, true)}::${esc(n.message)}`);
    return report(findings, a.out, { commits, base, notices });
  },
};

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
  try {
    return (await fn(a, repoRoot())) ?? 0;
  } catch (e) {
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
