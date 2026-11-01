#!/usr/bin/env node
// Process3 tool: one program, a fresh process per command, run from the pinned clone.
// Usage: node <clone>/tool/p3.mjs <command> [args]
import { writeFileSync } from 'node:fs';
import { checkLedger } from './lib/ledger.mjs';
import { recordCheck } from './lib/record.mjs';
import { Fail, fail, git, list, loadConfig, parseArgs, repoRoot } from './lib/util.mjs';

// Machine-readable findings (ARC-5): printed one per line and, with --out, written as JSON.
export function report(findings, out, extra = {}) {
  for (const f of findings) console.log(`${f.check}: ${f.file}:${f.line}: ${f.message}`);
  if (out) writeFileSync(out, JSON.stringify({ ...extra, findings }, null, 2) + '\n');
  console.log(findings.length ? `${findings.length} finding(s)` : 'ok');
  return findings.length ? 1 : 0;
}

const commands = {
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
    const { commits, findings, notices } = recordCheck(root, cfg, { base, head, branch: a.branch, ledgerBase });
    console.log(`checked ${commits} commit(s) after ${base.slice(0, 10)}`);
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
