#!/usr/bin/env node
// The GitHub pacing hook's own entry (R17d): Claude Code's PreToolUse hook runs this, not p3.mjs,
// so a call pays for the hook's modules only (lib/ghhook.mjs hookRun), not the whole tool's
// (about 150 ms). `node tool/hook.mjs` reads the hook's JSON on stdin; exit 0 allows, 2 blocks.
// `--refresh` is the read path's background refresh of the ledger cache (ghshare.mjs peekShare);
// `--share` the detached share of connector writes' rows (C52, ghhook.mjs hookShareLater).
import { readFileSync } from 'node:fs';
import { hookRefresh, hookRun, hookShareLater } from './lib/ghhook.mjs';

if (process.argv[2] === '--refresh') {
  hookRefresh(process.cwd());
} else if (process.argv[2] === '--share') {
  // C52: the detached share a connector write starts (lib/ghhook.mjs hookShareLater).
  hookShareLater(process.cwd());
} else {
  let input = null;
  try { input = JSON.parse(readFileSync(0, 'utf8') || 'null'); } catch { input = null; }
  let code = 2;
  try { code = hookRun(input, process.cwd()); } catch (e) { console.error(`p3 github hook: ${e.message}`); code = 2; }
  process.exitCode = code;
}
