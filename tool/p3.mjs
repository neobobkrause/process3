#!/usr/bin/env node
// Process3 tool: one program, a fresh process per command, run from the pinned clone.
// Usage: node <clone>/tool/p3.mjs <command> [args]
// p3-capability: gate-no-post (products' older shims grep for this line at the pin; keep it until
// every product carries the shim without the legacy path; review B of PR 32)
import { writeFileSync } from 'node:fs';
import { gate, postRow } from './lib/gate.mjs';
import { layerClose } from './lib/layer.mjs';
import { jobBlock, jobComplete, jobStart, jobTest } from './lib/job.mjs';
import { checkLedger } from './lib/ledger.mjs';
import { appendRow, bobMetricsFile, recordRefusal, report as metricsReport } from './lib/metrics.mjs';
import { merge, mergePlain } from './lib/merge.mjs';
import { deepen, trancheReport } from './lib/report.mjs';
import { reviewBrief } from './lib/review.mjs';
import { setupCheck } from './lib/setup.mjs';
import { startCheck, wakeCheck } from './lib/start.mjs';
import { checkRole, handoverBegin, handoverConfirm, readAddress, recordStart, startRole, tipApprovals } from './lib/roles.mjs';
import { fetchState, handoff, jsonl, outcome, readState, send } from './lib/state.mjs';
import { status } from './lib/status.mjs';
import { SWEEP_ROWS_FILE, sweep, sweepTask, watch } from './lib/sweep.mjs';
import { recordCheck, recordSince } from './lib/record.mjs';
import { checkOpen, openLine, openState, recordOpen, trancheClose, trancheOpen } from './lib/tranche.mjs';
import { Fail, depth, fail, git, list, loadConfig, parseArgs, repoRoot, repoSlug } from './lib/util.mjs';

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
  // status [--role job --module <id> | --role bob [--context <percent of the window used>] [--live <n>]] [--offline]
  status: (a, root) => { status(root, { role: a.role, module: a.module, context: a.context, live: a.live, offline: !!a.offline }); return 0; },

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

  // job start <id> [--coordinator <session>; default the addressed BOB] [--model <m>] [--reopen "<what>" | --restart "<why>"] [--over-cap "<why>"]: BOB opens a job;
  // --over-cap, BOB's reason to start one whose requirement file is over requirements_cap (REQ-6);
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
    jobStart(root, one(a, 'module'), { coordinator: a.coordinator, model: a.model, reopen: a.reopen, restart: a.restart, overCap: a['over-cap'] });
    return 0;
  },

  // job complete <id> [--not-verified "..."]... [--test R<id>="<file>::<name>"]... [--exempt-revert "<why>"] [--no-suite]
  'job complete': (a, root) => (jobComplete(root, one(a, 'module'), {
    notVerified: list(a['not-verified']).filter((x) => x !== true), tests: list(a.test), exemptRevert: a['exempt-revert'], noSuite: !!a['no-suite'],
  }).ok ? 0 : 1),

  // layer close <n>: BOB closes the open layer once status says it is ready: the layer checks on
  // the tranche tip, then the close recorded on the state branch with the deferred marks.
  'layer close': (a, root) => (layerClose(root, one(a, 'layer number')).ok ? 0 : 1),

  // tranche open [--depth <BOB's depth, default 1>]: the grants check's acts, BOB's and a probe's.
  // tranche open --record "<act>|<depth>|ok|refused|declined"... --session <id> [--bob "<words>"]: each
  // outcome; an ok for an act that stopped the open needs Bob's words lifting the stop.
  // tranche open --check: open, pending or stopped; exit 0 only when open.
  'tranche open': (a, root) => {
    if (a.record !== undefined) { recordOpen(root, list(a.record), { session: a.session, depth: a.depth, bob: a.bob }); return 0; }
    if (a.check) return checkOpen(root, { depth: a.depth }).state === 'open' ? 0 : 1;
    return trancheOpen(root, { depth: a.depth }).state === 'stopped' ? 1 : 0;
  },

  // tranche close: refused unless every layer is closed or the plan says close; BOB's acts.
  // tranche close --record: once the tranche is on main, the close on the state branch.
  'tranche close': (a, root) => (trancheClose(root, { record: !!a.record, report: !!(commands['report tranche'] || commands.report) }).ok ? 0 : 1),

  // test <id>: the module's own suite, as the gate runs it.
  test: (a, root) => (jobTest(root, one(a, 'module')).ok ? 0 : 1),

  // block <id> --reason "<why>"
  block: (a, root) => (jobBlock(root, one(a, 'module'), { reason: a.reason }).ok ? 0 : 1),

  // metrics add <id> --attempt n --session s [--tokens n] [--cost-usd x] [--denials n]
  //   [--refusal "<act>|<depth>|<channel>"]... [--decline "<act>|<depth>"]... [--outcome o]
  // metrics refusal --session s --act "<act>" --depth n [--module <id>]: one refusal a session
  //   reported, in process/metrics/refusals.bob.jsonl; status prints REFRESH for a session at 10.
  // metrics report: the two health metrics and their figures, BOB's idle time per day and the
  //   process overhead share per job and per layer, as JSON.
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
      let sweepRows = [];
      try { if (fetchState(root, cfg.state_branch)) sweepRows = jsonl(readState(root, cfg.state_branch, SWEEP_ROWS_FILE)); } catch { sweepRows = []; } // unreadable: idle time unmeasured
      const layers = git(['show', `${branch}:${cfg.layers_file}`], { cwd: root, allowFail: true });
      console.log(JSON.stringify(metricsReport(root, repoSlug(root), branch, { sweepRows, layers: layers.code === 0 ? layers.stdout : null }), null, 2));
      return 0;
    }
    fail('metrics add | metrics refusal | metrics report');
  },

  // merge <pr> (--reviewed "<what>" --rounds <n> | --no-review "<why>") [--decision "<why>"] [--minutes 30]: BOB merges a job.
  // merge <pr> --plain (--reviewed "<what>" --rounds <n> | --no-review "<why>") [--decision "<why>"] [--minutes 20]: any other pull request.
  // --rounds: 1 for the two fresh reviews, 2 with the fix pass and its re-review; more needs --decision (build I).
  merge: (a, root) => {
    const n = Number(one(a, 'pull request number'));
    const review = { reviewed: a.reviewed, noReview: a['no-review'], rounds: a.rounds, decision: a.decision };
    if (a.plain) return mergePlain(root, n, { ...review, minutes: Number(a.minutes || 20) }).merged ? 0 : 1;
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
    git(['fetch', '-q', ...depth(root), 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`, '+refs/heads/main:refs/remotes/origin/main'], { cwd: root, allowFail: true });
    deepen(root, cfg.tranche);
    let stateRead = false;
    try { stateRead = fetchState(root, cfg.state_branch); } catch { stateRead = false; }
    const md = trancheReport(root, cfg, { slug, stateRead, io: { state: (p) => readState(root, cfg.state_branch, p) } });
    if (a.out && a.out !== true) writeFileSync(a.out, md + '\n');
    console.log(md);
    return 0;
  },

  // review brief <pr> [--scope "<text>"]: prints the fresh-context brief a reviewer subagent is
  // given, filled from the pull request (build N). Writes nothing.
  'review brief': (a, root) => { reviewBrief(root, a._[0], { scope: a.scope }); return 0; },

  // setup check: the product's setup, read-only, against setup/conditions.json; exit 1 when a
  // condition is missing. The eleventh command (setup audit, 2 Nov); job start runs it first.
  'setup check': (a, root) => (setupCheck(root, { slug: repoSlug(root) }).ok ? 0 : 1),

  // start check [--branch <the branch the session started from; default the tranche>]: a
  // session's first command. Fetches that branch, compares HEAD and the approvals block with its
  // tip, prints both SHAs; exit 1 when either differs (Foundations, "Every session checks its start").
  // It records the approvals it loaded under .git; start check --wake, at every later wake of
  // BOB, ROOT or the watcher, exits 1 when the tip's approvals differ from that record, or with
  // --approvals <hash> (from the starting or task prompt) from that hash.
  'start check': (a, root) => ((a.wake ? wakeCheck(root, { branch: a.branch, approvals: a.approvals }) : startCheck(root, { branch: a.branch })).ok ? 0 : 1),

  // start root | start bob | start watcher: the role's starting prompt (and create_session call).
  // start watcher --replace <the addressed watcher's id>: its replacement, by whoever starts ROOT.
  // start record <root|bob|watcher> <session id>: the address, written after the session was created.
  start: (a, root) => {
    if (a._[0] === 'record') { recordStart(root, a._[1], a._[2]); return 0; }
    startRole(root, a._[0], { replace: a.replace });
    return 0;
  },

  // sweep --session <id> [--live <n>] [--attempt "<who>:<role>:<minutes>:<usd>"]...: ROOT's
  // hourly routine; prints what ROOT must do and writes the heartbeat. sweep task --session <id>:
  // the hourly task's prompt and create_trigger call.
  sweep: (a, root) => {
    if (a._[0] === 'task') { const t = sweepTask(a.session, loadConfig(root).tranche, tipApprovals(root).approvals); console.log(t.prompt); console.log(`create_trigger, bound to this session:\n${JSON.stringify(t.call, null, 2)}`); return 0; }
    sweep(root, { session: a.session, live: a.live, attempts: list(a.attempt).filter((x) => x !== true) });
    return 0;
  },

  // watch --session <the watcher's id> [--full]: the watcher's daily decision.
  watch: (a, root) => { watch(root, { session: a.session, full: !!a.full }); return 0; },

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
    const { commits, findings, notices } = recordCheck(root, cfg, { base, head, branch: a.branch, ledgerBase, since: s.since });
    if (s.finding) findings.push(s.finding);
    console.log(`checked ${commits} commit(s) after ${base.slice(0, 10)}${s.since ? ` and after ${s.since.slice(0, 10)} (record_since, from the ${s.from})` : ''}`);
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
