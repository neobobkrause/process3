#!/usr/bin/env node
// Process3 tool: one program, a fresh process per command, run from the pinned clone.
// Usage: node <clone>/tool/p3.mjs <command> [args]
// p3-capability: gate-no-post (the gate workflow greps for this line at the base's pin; a pin
// without it takes the legacy path; review of PR 13)
import { writeFileSync } from 'node:fs';
import { gate, postRow } from './lib/gate.mjs';
import { jobBlock, jobComplete, jobStart, jobTest } from './lib/job.mjs';
import { checkLedger } from './lib/ledger.mjs';
import { appendRow, bobMetricsFile, recordRefusal, report as metricsReport } from './lib/metrics.mjs';
import { merge, mergePlain } from './lib/merge.mjs';
import { setupCheck } from './lib/setup.mjs';
import { startCheck } from './lib/start.mjs';
import { checkRole, handoverBegin, handoverConfirm, readAddress, recordStart, startRole } from './lib/roles.mjs';
import { handoff, outcome, send } from './lib/state.mjs';
import { status } from './lib/status.mjs';
import { recordCheck, recordSince, repoOwnerOf, trustedRefs } from './lib/record.mjs';
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
  // status [--role job --module <id> | --role bob [--context <percent of the window used>]] [--offline]
  status: (a, root) => { status(root, { role: a.role, module: a.module, context: a.context, offline: !!a.offline }); return 0; },

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

  // job start <id> --coordinator <session> [--model <m>] [--reopen "<what>"]: BOB opens a job,
  // or, with --reopen, a new attempt on a COMPLETE module whose last attempt merged.
  'job start': (a, root) => { jobStart(root, one(a, 'module'), { coordinator: a.coordinator, model: a.model, reopen: a.reopen }); return 0; },

  // job complete <id> [--not-verified "..."]... [--exempt-revert "<why>"] [--no-suite]
  'job complete': (a, root) => (jobComplete(root, one(a, 'module'), {
    notVerified: list(a['not-verified']).filter((x) => x !== true), exemptRevert: a['exempt-revert'], noSuite: !!a['no-suite'],
  }).ok ? 0 : 1),

  // test <id>: the module's own suite, as the gate runs it.
  test: (a, root) => (jobTest(root, one(a, 'module')).ok ? 0 : 1),

  // block <id> --reason "<why>"
  block: (a, root) => (jobBlock(root, one(a, 'module'), { reason: a.reason }).ok ? 0 : 1),

  // metrics add <id> --attempt n --session s [--tokens n] [--cost-usd x] [--denials n]
  //   [--refusal "<act>|<depth>|<channel>"]... [--decline "<act>|<depth>"]... [--outcome o]
  // metrics refusal --session s --act "<act>" --depth n [--module <id>]: one refusal a session
  //   reported, in process/metrics/refusals.bob.jsonl; status prints REFRESH for a session at 10.
  // metrics report: the two health metrics and their figures, as JSON.
  metrics: (a, root) => {
    const sub = a._.shift();
    if (sub === 'add') {
      const id = one(a, 'module');
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
      console.log(JSON.stringify(metricsReport(root, repoSlug(root), a.branch || `origin/${cfg.tranche}`), null, 2));
      return 0;
    }
    fail('metrics add | metrics refusal | metrics report');
  },

  // merge <pr> (--reviewed "<what>" --rounds <n> | --no-review "<why>") [--decision "<why>"] [--minutes 30]: BOB merges a job.
  // merge <pr> --plain (--reviewed "<what>" --rounds <n> | --no-review "<why>") [--decision "<why>"]: any other pull request.
  // --rounds: 1 for the two fresh reviews, 2 with the fix pass and its re-review; more needs --decision (build I).
  merge: (a, root) => {
    const n = Number(one(a, 'pull request number'));
    const review = { reviewed: a.reviewed, noReview: a['no-review'], rounds: a.rounds, decision: a.decision };
    if (a.plain) return mergePlain(root, n, review).merged ? 0 : 1;
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

  // setup check: the product's setup, read-only, against setup/conditions.json; exit 1 when a
  // condition is missing. The eleventh command (setup audit, 2 Nov); job start runs it first.
  'setup check': (a, root) => (setupCheck(root, { slug: repoSlug(root) }).ok ? 0 : 1),

  // start check [--branch <the branch the session started from; default the tranche>]: a
  // session's first command. Fetches that branch, compares HEAD and the approvals block with its
  // tip, prints both SHAs; exit 1 when either differs (Foundations, "Every session checks its start").
  'start check': (a, root) => (startCheck(root, { branch: a.branch }).ok ? 0 : 1),

  // start root | start bob: the role's starting prompt and its create_session call.
  // start record <root|bob> <session id>: the address, written after the session was created.
  start: (a, root) => {
    if (a._[0] === 'record') { recordStart(root, a._[1], a._[2]); return 0; }
    startRole(root, a._[0]);
    return 0;
  },

  // address <root|bob>: the address as the state branch holds it now.
  address: (a, root) => {
    const role = checkRole(String(one(a, 'role (root or bob)')).toLowerCase());
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
    // While the base has no config, the owner is the repository's, as GitHub has it.
    const repoOwner = () => { try { return repoOwnerOf(repoSlug(root)); } catch { return null; } };
    const trusted = trustedRefs(root, cfg, { base, head, branch: a.branch });
    const { commits, findings, notices } = recordCheck(root, cfg, { base, head, branch: a.branch, ledgerBase, since: s.since, repoOwner, trusted });
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
