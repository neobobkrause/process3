#!/usr/bin/env node
// Process3 tool: one program, a fresh process per command, run from the pinned clone.
// Usage: node <clone>/tool/p3.mjs <command> [args]
import { writeFileSync } from 'node:fs';
import { checkLedger } from './lib/ledger.mjs';
import { recordCheck } from './lib/record.mjs';
import { Fail, git, loadConfig, parseArgs, repoRoot } from './lib/util.mjs';

// Machine-readable findings (ARC-5): printed one per line and, with --out, written as JSON.
export function report(findings, out, extra = {}) {
  for (const f of findings) console.log(`${f.check}: ${f.file}:${f.line}: ${f.message}`);
  if (out) writeFileSync(out, JSON.stringify({ ...extra, findings }, null, 2) + '\n');
  console.log(findings.length ? `${findings.length} finding(s)` : 'ok');
  return findings.length ? 1 : 0;
}

const commands = {
  // ledger check [--base <ref> --branch <name>]: schema; on a job branch, own status only.
  'ledger check': (a, root) => report(checkLedger(root, { base: a.base, branch: a.branch }), a.out),

  // record-check [--base <sha>] [--head <sha>]: run by the record check workflow on every push.
  'record-check': (a, root) => {
    const cfg = loadConfig(root);
    let base = a.base;
    if (!base || /^0+$/.test(base)) {
      const onto = a.onto || `origin/${cfg.tranche}`;
      const r = git(['merge-base', a.head || 'HEAD', onto], { cwd: root, allowFail: true });
      base = r.code === 0 ? r.stdout.trim() : undefined;
    }
    const { commits, findings } = recordCheck(root, cfg, { base, head: a.head || 'HEAD' });
    console.log(`checked ${commits} commit(s)${base ? ` after ${base.slice(0, 10)}` : ''}`);
    return report(findings, a.out, { commits });
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
    if (e instanceof Fail) { console.error(`p3 ${name}: ${e.message}`); return 1; }
    throw e;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/p3.mjs')) {
  process.exitCode = await main(process.argv.slice(2));
}
