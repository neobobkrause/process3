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
import { Paced, reserve } from './pace.mjs';

// The connector's writes: each one content-creating request.
const WRITE = /^(create|update|add|delete|merge|push|fork|issue_write|sub_issue_write|pull_request_review_write|request_copilot_review|resolve_review_thread|unresolve_review_thread|enable_pr_auto_merge|disable_pr_auto_merge|actions_run_trigger|run_secret_scanning|submit)/;
// Those that also move a ref on GitHub: a push GitHub shows.
const MOVES_REF = new Set(['merge_pull_request', 'push_files', 'create_or_update_file', 'delete_file', 'create_branch', 'update_pull_request_branch']);
const P3_CMD = /^(node\s+)(\S*\/)?(\.process\/tool|tool)\/p3\.mjs(\s|$)/;

// Each simple command of a Bash line (split on ;, &&, ||, |, newlines), its leading variable
// assignments and `sudo`/`env`/`command` dropped.
function segments(cmd) {
  return String(cmd || '').split(/&&|\|\||;|\||\n/).map((s) => s.trim().replace(/^(\(|\{)\s*/, '').replace(/^((\w+=\S*|env|sudo|command|exec)\s+)+/, '')).filter(Boolean);
}
export function bashVerdict(cmd) {
  for (const seg of segments(cmd)) {
    if (P3_CMD.test(seg)) continue;
    if (/^git(\s+(-[cC]\s+\S+|--?[\w-]+(=\S+)?))*\s+push(\s|$)/.test(seg)) return 'a raw git push goes around GitHub pacing (P27): push with `node .process/tool/p3.mjs github push <remote> <refspec>` (in process3: `node tool/p3.mjs github push ...`), or through the tool command that pushes for you (job sync, layer publish, job complete)';
    if (/^gh(\s|$)/.test(seg) || /\$\(\s*gh\s|`\s*gh\s/.test(seg)) return 'a raw gh command goes around GitHub pacing (P27): use the tool command that makes the call, or the GitHub connector (counted by this hook)';
    if (/^(curl|wget)\s/.test(seg) && /(^|[\s'"/@.])(api\.)?github\.com\b/.test(seg)) return 'curl or wget to github.com goes around GitHub pacing (P27): use the tool, or the GitHub connector';
  }
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
      if (MOVES_REF.has(op)) reserve({ push: true, points: 0, content: 0, primary: false }, `connector ${op}`, cwd, { ...opts, kind: 'push', extra: { ...extra, via: 'connector' } });
      reserve({ points: write ? 5 : 1, content: write ? 1 : 0, primary: true }, `connector ${op}`, cwd, { ...opts, extra });
      return { ok: true, counted: write ? 'write' : 'read' };
    }
    if (name === 'Bash') { const why = bashVerdict(ti.command); return why ? { block: why } : { ok: true }; }
    return { ok: true };
  } catch (e) {
    if (e instanceof Paced) return { block: e.message };
    throw e;
  }
}
