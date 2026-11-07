// p3 github hook (R17c; Bob, 6 Nov: ALL GitHub traffic monitored and limited, enforced, not by
// rule): a Claude Code PreToolUse hook. It reads the hook's JSON on stdin and decides:
//   mcp__github__*  the connector call is counted in the ledger and takes its turn exactly as a gh
//                   call would (the pause, the stop, the windows, at most a 15 min wait): a read
//                   1 point; a write (create, update, add, merge, comment, review, ...) one
//                   content-creating request, 5 points; one that moves a ref on GitHub (a merge, a
//                   file write, a branch) also a push against the ceiling. Refused: exit 2.
//   Bash            a raw `git push`, any `gh` command, or curl or wget to github.com is refused
//                   (exit 2), naming the tool's way instead; the tool's own commands
//                   (node .process/tool/p3.mjs, node tool/p3.mjs) pass, and everything else.
// Exit 2 blocks the call, with the reason on stderr for the session (Claude Code's hook contract).
// The settings that call it are Bob's (notes/r17c-settings.md).
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { kickRefresh, LEDGER_CACHE, peekShare, refreshDone, stateShare } from './ghshare.mjs';
import { commonDir, hookPacing, pacing, Paced, primaryState, reserve, TOOL, useShared } from './pace.mjs';
import { CONFIG_FILE, loadConfig, repoRoot } from './util.mjs';

// The connector's writes: each one content-creating request.
const WRITE = /^(create|update|add|delete|merge|push|fork|assign|label_write|issue_write|sub_issue_write|pull_request_review_write|request_copilot_review|resolve_review_thread|unresolve_review_thread|enable_pr_auto_merge|disable_pr_auto_merge|actions_run_trigger|actions_rerun|rerun|cancel|run_secret_scanning|submit|dismiss|star|unstar|mark)/;
// Those that also move a ref on GitHub: a push GitHub shows.
const MOVES_REF = new Set(['merge_pull_request', 'push_files', 'create_or_update_file', 'delete_file', 'create_branch', 'update_pull_request_branch']);
// The Bash check reads the command as the shell would, enough to find what runs (cold review of
// R17c: a regex was passed by subshells, `bash -c`, wrappers, absolute paths and aliases, and
// blocked commit messages that mention git push): heredoc bodies and comments dropped; words split
// with quotes kept inside their word; a segment ends at ; & | newline ( ) ` and $( ; leading
// assignments and wrappers (sudo, env, time, nohup, timeout N, xargs, nice, command, exec, !,
// then, do, else, if, while, until) skipped; `bash -c`, `sh -c` and `eval` read again inside.
const WRAPPERS = new Set(['sudo', 'env', 'time', 'nohup', 'timeout', 'xargs', 'nice', 'command', 'exec', '!', 'then', 'do', 'else', 'if', 'while', 'until', 'elif', 'stdbuf', 'unbuffer']);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);
const GIT_VALUED = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env']);
function words(cmd) {
  const text = String(cmd || '').replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(\n|$)/g, '\n');
  const segs = [];
  let seg = [];
  let w = null;
  const end = () => { if (w !== null) { seg.push(w); w = null; } };
  const brk = () => { end(); if (seg.length) segs.push(seg); seg = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'") { const j = text.indexOf("'", i + 1); w = (w || '') + text.slice(i + 1, j < 0 ? text.length : j); i = j < 0 ? text.length : j; continue; }
    if (c === '"') { let j = i + 1; let v = ''; while (j < text.length && text[j] !== '"') { if (text[j] === '\\' && j + 1 < text.length) { v += text[j + 1]; j += 2; } else v += text[j++]; } w = (w || '') + v; i = j; continue; }
    if (c === '\\' && i + 1 < text.length) { if (text[i + 1] === '\n') { i++; continue; } w = (w || '') + text[++i]; continue; }
    if (c === '#' && w === null) { while (i < text.length && text[i] !== '\n') i++; brk(); continue; }
    if (c === '$' && text[i + 1] === '(') { brk(); i++; continue; }
    if (';&|\n()`'.includes(c)) { brk(); continue; }
    if (/\s/.test(c)) { end(); continue; }
    w = (w || '') + c;
  }
  brk();
  return segs;
}
const base = (x) => String(x).replace(/^\\/, '').split('/').pop();
function segVerdict(seg, depth, tool) {
  let i = 0;
  while (i < seg.length && (/^\w+=/.test(seg[i]) || WRAPPERS.has(base(seg[i])) || (i > 0 && WRAPPERS.has(base(seg[i - 1])) && (/^-/.test(seg[i]) || /^\d+[smhd]?$/.test(seg[i]))))) i++;
  const cmd = base(seg[i] || '');
  const rest = seg.slice(i + 1);
  if (SHELLS.has(cmd)) { const k = rest.findIndex((x) => /^-\w*c\w*$/.test(x)); return k >= 0 && rest[k + 1] && depth < 4 ? bashVerdict(rest[k + 1], depth + 1, tool) : null; }
  if (cmd === 'eval') return depth < 4 ? bashVerdict(rest.join(' '), depth + 1, tool) : null;
  if (cmd === 'git') {
    let k = 0;
    while (k < rest.length && rest[k].startsWith('-')) {
      if (rest[k] === '-c' && /^alias\.[^=]+=.*\bpush\b/.test(rest[k + 1] || '')) return `a git alias for push goes around GitHub pacing (P27): push with \`${tool} github push <remote> <refspec>\``;
      k += GIT_VALUED.has(rest[k]) ? 2 : 1;
    }
    if (rest[k] === 'push' && !rest.slice(k + 1).some((x) => x === '--dry-run' || x === '-n')) return `a raw git push goes around GitHub pacing (P27): push with \`${tool} github push <remote> <refspec>\`, or through the tool command that pushes for you (job sync, layer publish, job complete)`;
    return null;
  }
  if (cmd === 'gh') return 'a raw gh command goes around GitHub pacing (P27): use the tool command that makes the call, or the GitHub connector (counted by this hook)';
  if ((cmd === 'curl' || cmd === 'wget') && rest.some((x) => /^(https?:\/\/)?([\w-]+\.)?github\.com(\/|:|$)/.test(x))) return 'curl or wget to github.com goes around GitHub pacing (P27): use the tool, or the GitHub connector';
  return null;
}
// tool: the tool's command in this clone (pace.mjs TOOL), named in the refusal.
export function bashVerdict(cmd, depth = 0, tool = TOOL) {
  for (const seg of words(cmd)) { const v = segVerdict(seg, depth, tool); if (v) return v; }
  return null;
}

// The hook's decision for one tool call: { block: reason } or { ok }.
export function hookDecision(input, cwd, opts = {}) {
  const name = String(input?.tool_name || '');
  const ti = input?.tool_input || {};
  try {
    if (name.startsWith('mcp__github__')) {
      const op = name.slice('mcp__github__'.length);
      const write = WRITE.test(op);
      const repo = ti.owner && ti.repo ? `${ti.owner}/${ti.repo}`.toLowerCase() : null;
      const extra = { connector: true, ...(repo ? { repo } : {}) };
      // The call's own cost first, then a ref it moves: a refused push then leaves only the call counted.
      hookPacing(() => {
        reserve({ points: write ? 5 : 1, content: write ? 1 : 0, primary: true }, `connector ${op}`, cwd, { ...opts, extra });
        if (MOVES_REF.has(op)) reserve({ push: true, points: 0, content: 0, primary: false }, `connector ${op}`, cwd, { ...opts, kind: 'push', extra: { ...extra, via: 'connector' } });
      });
      return { ok: true, counted: write ? 'write' : 'read' };
    }
    if (name === 'Bash') { const why = bashVerdict(ti.command); return why ? { block: why } : { ok: true }; }
    return { ok: true };
  } catch (e) {
    if (e instanceof Paced) return { block: e.message };
    throw e;
  }
}

// The hook as Claude Code runs it (R17d, tool/hook.mjs; `p3 github hook` runs the same): the
// Bash check and other tools touch no git and no ledger; a connector read takes the read path
// (ghshare peekShare: the cached pause and stop, GitHub's cached primary count, no fetch, no
// network, no per-clone floor: under 300 ms); a connector write reads the ledger fresh and takes
// the full path, waits included. Returns the exit code: 0 allows, 2 blocks (reason on stderr).
const CONNECTOR = 'mcp__github__';
export function hookRun(input, cwd, { err = (m) => console.error(m), share, kick = process.env.NODE_TEST_CONTEXT ? () => false : kickRefresh, opts = {} } = {}) {
  if (!input) { err('p3 github hook: no hook JSON on stdin'); return 2; }
  const name = String(input.tool_name || '');
  let d;
  if (!name.startsWith(CONNECTOR)) d = hookDecision(input, cwd, opts);
  else {
    const root = repoRoot(cwd);
    let cfg = null;
    try { cfg = existsSync(join(root, CONFIG_FILE)) ? loadConfig(root) : null; } catch { cfg = null; }
    const write = WRITE.test(name.slice(CONNECTOR.length));
    const was = process.env.NODE_TEST_CONTEXT || process.env.GITHUB_ACTIONS === 'true';
    useShared(share !== undefined ? share : write ? (was ? null : stateShare(root, cfg)) : peekShare(root, { kick }));
    try {
      d = hookDecision(input, root, write ? opts : { p: { ...pacing(), gh_interval_ms: 0 }, rateLimit: () => undefined, ...opts });
    } finally { useShared(null); }
  }
  if (d.block) { err(`GitHub pacing (P27): ${d.block}`); return 2; }
  return 0;
}
// The background refresh the read path starts (tool/hook.mjs --refresh): the ledger's tip asked of
// GitHub, fetched only when it moved; GitHub's primary count when a minute old. Never fails loudly.
export function hookRefresh(cwd) {
  // A stalled transfer gives up (cold review of R17d: a hung fetch held the clone's state lock).
  process.env.GIT_HTTP_LOW_SPEED_LIMIT ||= '1000';
  process.env.GIT_HTTP_LOW_SPEED_TIME ||= '20';
  try {
    const root = repoRoot(cwd);
    let cfg = null;
    try { cfg = existsSync(join(root, CONFIG_FILE)) ? loadConfig(root) : null; } catch { cfg = null; }
    const sh = stateShare(root, cfg);
    if (sh) sh.refresh();
    else writeFileSync(join(commonDir(root), LEDGER_CACHE), JSON.stringify({ at: Date.now(), pause: null, use: [], ledger: null }));
    primaryState(root);
  } catch { /* the next read starts another */ } finally { refreshDone(cwd); }
}
