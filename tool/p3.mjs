#!/usr/bin/env node
// Process3 tool: one program, a fresh process per command, run from the pinned clone.
// Usage: node <clone>/tool/p3.mjs <command> [args]
import { writeFileSync } from 'node:fs';
import { jobBlock, jobComplete, jobStart } from './lib/job.mjs';
import { checkLedger } from './lib/ledger.mjs';
import { appendRow, report as metricsReport } from './lib/metrics.mjs';
import { status } from './lib/status.mjs';
import { recordCheck } from './lib/record.mjs';
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
  // status [--role job --module <id>] [--offline]
  status: (a, root) => { status(root, { role: a.role, module: a.module, offline: !!a.offline }); return 0; },

  // job start <id> --coordinator <session> [--model <m>]: BOB opens a job.
  'job start': (a, root) => { jobStart(root, one(a, 'module'), { coordinator: a.coordinator, model: a.model }); return 0; },

  // job complete <id> [--not-verified "..."]... [--exempt-revert "<why>"] [--no-suite]
  'job complete': (a, root) => (jobComplete(root, one(a, 'module'), {
    notVerified: list(a['not-verified']).filter((x) => x !== true), exemptRevert: a['exempt-revert'], noSuite: !!a['no-suite'],
  }).ok ? 0 : 1),

  // block <id> --reason "<why>"
  block: (a, root) => (jobBlock(root, one(a, 'module'), { reason: a.reason }).ok ? 0 : 1),

  // metrics add <id> --attempt n --session s [--tokens n] [--cost-usd x] [--denials n]
  //   [--refusal "<act>|<depth>|<channel>"]... [--decline "<act>|<depth>"]... [--outcome o]
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
      });
      console.log(JSON.stringify(row));
      return 0;
    }
    if (sub === 'report') {
      const cfg = loadConfig(root);
      console.log(JSON.stringify(metricsReport(root, repoSlug(root), a.branch || `origin/${cfg.tranche}`), null, 2));
      return 0;
    }
    fail('metrics add | metrics report');
  },

  // ledger check [--base <ref> --branch <name>]: schema; on a job branch, own status only.
  'ledger check': (a, root) => report(checkLedger(root, { base: a.base, branch: a.branch }), a.out),

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
    const { commits, findings, notices } = recordCheck(root, cfg, { base, head, branch: a.branch, ledgerBase });
    console.log(`checked ${commits} commit(s) after ${base.slice(0, 10)}`);
    for (const n of notices) console.log(`notice: ${n.file}: ${n.message}`);
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
