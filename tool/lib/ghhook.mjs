// p3 github hook (R17c; Bob, 6 Nov: ALL GitHub traffic monitored and limited, enforced, not by
// rule): a Claude Code PreToolUse hook. It reads the hook's JSON on stdin and decides:
//   mcp__github__*  the connector call is counted in the ledger and takes its turn exactly as a gh
//                   call would (the pause, the stop, the windows, at most a 15 min wait): a read
//                   1 point; a write (create, update, add, merge, comment, review, ...) one
//                   content-creating request, 5 points; one that moves a ref on GitHub (a merge, a
//                   file write, a branch) also logged as a push (never held: PD-6). Refused: exit 2.
//   Bash            a raw `git push`, any `gh` command, or curl or wget to github.com is refused
//                   (exit 2), naming the tool's way instead; the tool's own commands
//                   (node .process/tool/p3.mjs, node tool/p3.mjs) pass, and everything else.
// Exit 2 blocks the call, with the reason on stderr for the session (Claude Code's hook contract).
// The settings that call it are Bob's (notes/r17c-settings.md).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentRow, kickRefresh, LEDGER_CACHE, lastShareAt, ledgerOf, peekShare, refreshDone, stateShare } from './ghshare.mjs';
import { commonDir, hookPacing, lastShared, pacing, Paced, primaryState, readLog, reserve, TOOL, useShared } from './pace.mjs';
import { CONFIG_FILE, SHARE_DEFERRED, foregroundIn, loadConfig, repoRoot } from './util.mjs';

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
// network, no per-clone floor: under 300 ms); a connector write reads the ledger through stateShare (within READ_S, else ls-remote) and takes
// the full path, waits included. Returns the exit code: 0 allows, 2 blocks (reason on stderr).
const CONNECTOR = 'mcp__github__';
const ledgerKey = (root, cfg) => { try { const l = ledgerOf(root, cfg); return l ? (l.own ? 'own' : l.url) : null; } catch { return undefined; } };
// C34 (the coordinator, 8 Nov): a session whose project root has no settings with this hook (a
// container rooted at /home/user, an old branch's checkout) loads none, and its connector calls go
// unledgered. Each run Claude Code makes (its input names the session; one piped by hand under
// PD-13 does not) leaves a stamp per session, so `start check`, itself a Bash call the hook sees,
// can tell this session that its hook is not loaded.
// A fixed place, not the process's TMPDIR, which a sandboxed Bash and the hook may see differently
// (cold review of C34); the OS's temporary directory only where /tmp is not one.
export const hookSeenDir = () => process.env.P3_HOOK_SEEN_DIR || (process.platform === 'win32' ? join(tmpdir(), 'p3-hook-seen') : '/tmp/p3-hook-seen');
const stampName = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
export function stampHook(input) {
  const id = input?.session_id;
  if (typeof id !== 'string' || !id) return;
  // The hook input's session id and, beside it, the session id in the hook process's environment
  // (the one a Bash call's `start check` reads), in case the two forms differ.
  const ids = [...new Set([id, process.env.CLAUDE_CODE_SESSION_ID].filter(Boolean))];
  try { mkdirSync(hookSeenDir(), { recursive: true }); for (const x of ids) writeFileSync(join(hookSeenDir(), stampName(x)), new Date().toISOString()); } catch { /* a sign, never the call's failure */ }
}
// Whether Claude Code has run this hook for the session: true, false, or null when unknown (no id).
export function hookSeen(id = process.env.CLAUDE_CODE_SESSION_ID) {
  if (!id) return null;
  // No directory: no hook has stamped here (not loaded). Any other read error: unknown, never an alarm.
  try { return readdirSync(hookSeenDir()).includes(stampName(id)); } catch (e) { return e?.code === 'ENOENT' ? false : null; }
}
// start check's line when the hook is not loaded for this session (PD-13's by-hand rule); null when it is, or unknown.
export function hookLoadedLine(id = process.env.CLAUDE_CODE_SESSION_ID) {
  if (hookSeen(id) !== false) return null;
  return 'GitHub pacing hook: NOT LOADED in this session (no call of this session has gone through it: the project root Claude Code started in has no .claude/settings.json naming tool/hook.mjs or .process/tool/hook.mjs, as a container rooted at /home/user or an older branch\'s checkout has; or the loaded hook is a pin from before C34, which does not record itself). Its GitHub connector calls may not be in the ledger. Until a session starts with it loaded (PD-13): before each GitHub connector call, pipe its JSON to the hook from a process3 checkout at the tranche, `echo \'{"tool_name":"mcp__github__<tool>","tool_input":{...}}\' | node tool/hook.mjs`, and do not make the call if it exits 2.';
}
export function hookRun(input, cwd, { err = (m) => console.error(m), share, kick = process.env.NODE_TEST_CONTEXT ? () => false : kickRefresh, later = process.env.NODE_TEST_CONTEXT ? () => false : kickShare, opts = {} } = {}) {
  if (!input) { err('p3 github hook: no hook JSON on stdin'); return 2; }
  stampHook(input);
  const name = String(input.tool_name || '');
  let d;
  if (!name.startsWith(CONNECTOR)) d = hookDecision(input, cwd, opts);
  else {
    const root = repoRoot(cwd);
    let cfg = null;
    try { cfg = existsSync(join(root, CONFIG_FILE)) ? loadConfig(root) : null; } catch { cfg = null; }
    const write = WRITE.test(name.slice(CONNECTOR.length));
    const was = process.env.NODE_TEST_CONTEXT || process.env.GITHUB_ACTIONS === 'true';
    const sh = share !== undefined ? share : write ? (was ? null : stateShare(root, cfg)) : peekShare(root, { kick, key: ledgerKey(root, cfg) });
    useShared(sh);
    try {
      d = hookDecision(input, root, write ? opts : { p: { ...pacing(), gh_interval_ms: 0 }, rateLimit: () => undefined, ...opts });
    } finally { useShared(null); }
    // C52: the write's row reaches the ledger without a later p3 command (a detached share). Never
    // a read's, never from a workflow, never the call's failure.
    if (write && !d.block && process.env.GITHUB_ACTIONS !== 'true') hookShare(root, sh, { err, later });
  }
  if (d.block) { err(`GitHub pacing (P27): ${d.block}`); return 2; }
  return 0;
}
// C52 (9 Nov: PR 290's opening stayed in its clone's log, unexplained, until a p3 command ran by
// hand): after a content-creating connector call, its row is shared without a later p3 command, by
// one detached share per clone (tool/hook.mjs --share). It waits until HOOK_SHARE_S after the
// clone's last share and carries every row logged meanwhile, so a burst of writes (a review's
// comments) is one ledger push per HOOK_SHARE_S, not one each; the hook itself never shares, and so
// never waits on the state lock or a push (C52 cold review). Only a connector write starts one
// (never a read, a Bash call, or the share's own push, which is no content-creating call), so it
// cannot loop. A failure is tried once more, then kept as one line that the next connector write
// says on stderr; never the call's failure: the hook returns 0 regardless.
// P3_HOOK_SHARE_S: shorter in a fixture only.
export const HOOK_SHARE_S = Number(process.env.P3_HOOK_SHARE_S) > 0 ? Number(process.env.P3_HOOK_SHARE_S) : 30;
const SHARING = 'p3-gh-sharing';
const SHARE_ERR = 'p3-gh-share.err';
const oneLine = (e) => String(e?.message ?? e).split('\n')[0];
// This clone's content-creating rows no share has carried, logged after `since` (ms).
const unsharedContent = (root, since = 0) => { const after = Math.max(lastShared(root), since); return readLog(root).filter((r) => Date.parse(r.at) > after && contentRow(r)).length; };
export function hookShare(root, sh, { err = (m) => console.error(m), later = kickShare } = {}) {
  try {
    const f = join(commonDir(root), SHARE_ERR);
    if (existsSync(f)) { const m = readFileSync(f, 'utf8').trim(); rmSync(f, { force: true }); if (m) err(m); }
  } catch { /* a sign, never the call's failure */ }
  if (!sh) return false;
  try {
    // Shared already (the call's own reserve shares by the 15-minute rule): nothing to start.
    if (!unsharedContent(root)) return false;
    return later(root);
  } catch (e) {
    try { err(`github: the share of this connector call's row not started (${oneLine(e)}); the next connector write or p3 command in this clone shares it`); } catch { /* never the call's failure */ }
    return false;
  }
}
const HOOK_ENTRY = fileURLToPath(new URL('../hook.mjs', import.meta.url));
// One detached share at a time per clone: the marker taken by its creation; one older than
// 4 * HOOK_SHARE_S (a share killed) removed and taken by creation again, so two takers never both
// win (C52 cold review). A spawn that fails lets go of its marker.
export function kickShare(cwd, { now = Date.now, entry = HOOK_ENTRY, tries = 0 } = {}) {
  const f = join(commonDir(cwd), SHARING);
  const mark = `${now()} ${process.pid} ${Math.random().toString(36).slice(2)}`;
  try { writeFileSync(f, mark, { flag: 'wx' }); } catch {
    let at = 0;
    try { at = Number(readFileSync(f, 'utf8').split(' ')[0]) || 0; } catch { at = 0; }
    if (now() - at < 4 * HOOK_SHARE_S * 1000) return false;
    rmSync(f, { force: true });
    try { writeFileSync(f, mark, { flag: 'wx' }); } catch { return false; }
  }
  const letGo = () => { try { if (readFileSync(f, 'utf8') === mark) rmSync(f, { force: true }); } catch { /* none */ } };
  let child;
  try { child = spawn(process.execPath, [entry, '--share'], { cwd, detached: true, stdio: 'ignore', env: { ...process.env, P3_SHARE_MARK: mark, P3_SHARE_TRY: String(tries) } }); } catch (e) { letGo(); throw e; }
  child.on('error', letGo);
  child.unref();
  return true;
}
// The detached share (tool/hook.mjs --share): waits until HOOK_SHARE_S after the clone's last
// share, shares, and lets go of the marker. Then, without a failure, it starts one more only for a
// content-creating row logged after it began and still unshared (a write whose start met the
// marker); a failure is tried once more by a new share, then kept, one line, for the next
// connector write to say. Bounded: only a new write, or the one retry, starts another.
const sleepMs = (ms) => { if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };
// C53: no git while a foreground p3 command runs in the clone (util.mjs foregroundIn), nor when it
// cannot be told: the share defers, writing SHARE_DEFERRED, and that command's end share (or the
// next one's) carries the rows (p3.mjs flush). A deferral is no failure: nothing is tried again here.
// The git it does run never writes the shallow file: no automatic gc or maintenance (their prune
// rewrites it), so a command that starts while this share runs is not refused by it.
export const NO_AUTO_GC = { GIT_CONFIG_COUNT: '2', GIT_CONFIG_KEY_0: 'gc.auto', GIT_CONFIG_VALUE_0: '0', GIT_CONFIG_KEY_1: 'maintenance.auto', GIT_CONFIG_VALUE_1: 'false' };
export function hookShareLater(cwd, { now = Date.now, sleep = sleepMs, mark = process.env.P3_SHARE_MARK, tries = Number(process.env.P3_SHARE_TRY) || 0, again = kickShare, share = stateShare, foreground = foregroundIn } = {}) {
  const began = now();
  let root = cwd;
  let failed = null;
  let deferred = null;
  try {
    root = repoRoot(cwd);
    let cfg = null;
    try { cfg = existsSync(join(root, CONFIG_FILE)) ? loadConfig(root) : null; } catch { cfg = null; }
    sleep(Math.min(HOOK_SHARE_S * 1000, lastShareAt(root) + HOOK_SHARE_S * 1000 - now()));
    let fg = 'unknown';
    try { fg = foreground(root); } catch { fg = 'unknown'; }
    if (fg !== 'none') {
      deferred = fg;
      writeFileSync(join(commonDir(root), SHARE_DEFERRED), `${new Date(now()).toISOString()} ${fg}\n`);
    } else {
      // A stalled transfer gives up, as the background refresh's does (hookRefresh).
      Object.assign(process.env, NO_AUTO_GC);
      process.env.GIT_HTTP_LOW_SPEED_LIMIT ||= '1000';
      process.env.GIT_HTTP_LOW_SPEED_TIME ||= '20';
      const sh = share(root, cfg);
      if (sh) sh.shareContent();
    }
  } catch (e) { failed = e; } finally {
    const f = join(commonDir(root), SHARING);
    try { if (mark === undefined || readFileSync(f, 'utf8') === mark) rmSync(f, { force: true }); } catch { /* none */ }
  }
  if (deferred && !failed) return false;
  try {
    if (failed && tries < 1) return (again(root, { now, tries: tries + 1 }), false);
    if (failed) { writeFileSync(join(commonDir(root), SHARE_ERR), `github: a connector write's row not shared (${oneLine(failed)}); the next connector write or p3 command in this clone shares it\n`); return false; }
    if (unsharedContent(root, began)) again(root, { now });
  } catch { /* the next write or p3 command shares */ }
  return !failed;
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
