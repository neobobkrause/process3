// Every command a START, an act line or a rulebook tells a session to run is admitted by the
// product's .claude/settings.json (C3, the coordinator, 7 Nov): a told command its deny list refuses
// leaves the session stuck at a refusal no one sees until it reports. Read here: the commands the
// tool and its rulebooks print, in code spans (`git ...`, `gh ...`, `curl ...`, `rm ...`, `npm ...`),
// each `${...}` read as a placeholder; and Claude Code's permission rules, `Bash(<pattern>)`, `*`
// any text, a trailing ` *` also the bare command, `:*` a prefix.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
export function ruleMatches(rule, cmd) {
  const m = /^Bash\((.*)\)$/s.exec(String(rule || ''));
  if (!m) return false;
  const p = m[1];
  if (p.endsWith(':*')) { const pre = p.slice(0, -2); return cmd === pre || cmd.startsWith(`${pre} `); }
  if (p.endsWith(' *') && cmd === p.slice(0, -2)) return true;
  return new RegExp(`^${p.split('*').map(esc).join('.*')}$`, 's').test(cmd);
}
// Each part of a told line (split at &&, ;, ||, |), trimmed, a subshell's parentheses and the
// leading VAR=value assignments taken off (cold review: `(cd x && git push origin main)` and
// `GIT_DIR=x git rebase` were missed); `sh -c '<line>'` judged as its line.
const parts = (cmd) => cmd.replace(/\b(?:ba)?sh\s+-c\s+(['"])(.*?)\1/g, '$2').split(/\s*(?:&&|\|\||;|\|)\s*/)
  .map((x) => x.trim().replace(/^\(+\s*|\s*\)+$/g, '').replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, '').trim()).filter(Boolean);
// The deny rule refusing cmd (any part of it), or null.
export function deniedBy(cmd, settings) {
  const deny = settings?.permissions?.deny || [];
  for (const c of new Set([cmd.trim(), ...parts(cmd)])) for (const r of deny) if (ruleMatches(r, c)) return { part: c, rule: r };
  return null;
}
const TOLD = /^(?:git|gh|curl|rm|npm|npx)\s/;
// A span tells a command when any of its parts does (`cd x && git rebase main`).
const tells = (raw) => parts(raw).some((p) => TOLD.test(p));
// The commands told in a file's text: code spans, `${...}` read as X; error texts (`... failed`) left
// out. In a .mjs file only the escaped spans a printed string holds (\`...\`), what a session reads:
// a comment's spans name commands, they tell a session none. In a .md file, its plain spans.
export function toldIn(text, file) {
  const out = [];
  const lines = text.split('\n');
  const code = file.endsWith('.mjs');
  for (const [i, l] of lines.entries()) {
    // In a .mjs file also the spans a plain-quoted string holds ('... `git ...` ...'), never on a comment line.
    const quoted = code && !/^\s*(\/\/|\*)/.test(l) ? [...l.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)].flatMap((q) => [...(q[1] ?? q[2]).matchAll(/`([^`]+)`/g)]) : [];
    const spans = code ? [...l.matchAll(/\\`((?:(?!\\`).)*?)\\`/g), ...quoted] : l.matchAll(/`([^`]+)`/g);
    for (const m of spans) {
      const raw = m[1].replace(/\$\{[^}]*\}/g, 'X').trim();
      if (!tells(raw) || / failed\b/.test(raw)) continue;
      out.push({ file, line: i + 1, cmd: raw });
    }
  }
  return out;
}
// Every told command of the process at root: its rulebooks, its CLAUDE lines and its tool.
const corpus = (root) => [
  ...readdirSync(join(root, 'rulebooks')).filter((f) => f.endsWith('.md')).map((f) => `rulebooks/${f}`),
  'shims/CLAUDE.process.md',
  'tool/p3.mjs',
  ...readdirSync(join(root, 'tool/lib'), { recursive: true }).map(String).filter((f) => f.endsWith('.mjs')).map((f) => `tool/lib/${f}`),
];
export function toldCommands(root) {
  return corpus(root).flatMap((f) => { try { return toldIn(readFileSync(join(root, f), 'utf8'), f); } catch { return []; } });
}
// The told commands the settings deny, each with where it is told and the rule.
export function admitCheck(settings, told) {
  return told.flatMap((t) => { const d = deniedBy(t.cmd, settings); return d ? [{ ...t, ...d }] : []; });
}

// ---- told tools (C15, the coordinator, 7 Nov) ------------------------------------------------
// A tool other than Bash the process tells a session to use, that would stop on a permission prompt
// in the session's mode, leaves an unattended session waiting on no one (investigation lane
// session_018BhcecAwJP5DnnQjPq4JTZ, "Waiting on permission: Artifact" from ~00:31Z 7 Nov: lanes are
// told their design documents are claude.ai artifacts). The process tells tools by what they make
// or by their names; each wording below maps to the tool.
const REMOTE = ['send_message', 'create_session', 'archive_session', 'interrupt_session', 'get_session', 'list_sessions', 'list_events', 'subscribe_pr_activity', 'unsubscribe_pr_activity', 'create_trigger', 'delete_trigger', 'update_trigger', 'list_triggers', 'get_trigger', 'send_later'];
// Not mapped: the docs connector ("the docs connector", "claude.ai ... documents"), whose tools are
// mcp__<id>__* with an id per account, so no rule in a product's settings can be read for it here.
export const TOOL_WORDS = [
  { said: /\bclaude\.ai artifacts?\b/gi, tool: () => 'Artifact' },
  { said: new RegExp(`\\b(${REMOTE.join('|')})\\b`, 'g'), tool: (m) => `mcp__claude-code-remote__${m[1]}` },
  { said: /\bGitHub connector's `?([a-z][a-z0-9_]*)`?/g, tool: (m) => `mcp__github__${m[1]}` },
  { said: /\b(?:the Agent tool|subagents?)\b/gi, tool: () => 'Agent' },
  { said: /\bpush notifications?\b/gi, tool: () => 'PushNotification' },
];
// The tools that ask a person even in auto mode, each with its evidence; a told one needs an allow
// rule. What the check guarantees (cold review): no deny rule refuses a told tool, and every tool
// named here is allowed. That any other tool runs unasked is an assumption, not a proof (auto mode's
// classifier can still ask): a prompt an unattended session meets is added here with its evidence,
// and the suite then holds every product's settings to it.
export const PROMPTS_IN_AUTO = {
  Artifact: 'asks a person even in auto mode (C15: an investigation lane waited on "permission: Artifact" from ~00:31Z 7 Nov)',
};
// Claude Code's rule for a tool other than Bash: its exact name; an MCP server's name (mcp__<server>)
// or mcp__<server>__* for every tool of that server.
export function toolRuleMatches(rule, tool) {
  const r = String(rule || '');
  if (r === tool) return true;
  if (r.startsWith('mcp__') && r.split('__').length === 2) return tool.startsWith(`${r}__`);
  return r.startsWith('mcp__') && r.endsWith('__*') && tool.startsWith(r.slice(0, -1));
}
// Why a told tool would not run unattended under these settings: { why: 'denied', rule } or
// { why: 'prompts', evidence }; null when it runs.
export function toolStops(tool, settings) {
  const p = settings?.permissions || {};
  const d = (p.deny || []).find((r) => toolRuleMatches(r, tool));
  if (d) return { why: 'denied', rule: d };
  if (PROMPTS_IN_AUTO[tool] && !(p.allow || []).some((r) => toolRuleMatches(r, tool))) return { why: 'prompts', evidence: PROMPTS_IN_AUTO[tool] };
  return null;
}
// The tools a file's text tells a session to use: any line but a comment (in a .mjs file a printed
// string may span lines or nest templates, so the whole line is read: cold review; a name in code
// that tells no one is harmless unless denied, and then it is worth a look).
export function toolsIn(text, file) {
  const out = [];
  const code = file.endsWith('.mjs');
  for (const [i, l] of text.split('\n').entries()) {
    if (code && /^\s*(\/\/|\*|\/\*)/.test(l)) continue;
    const said = code ? l.replace(/\s\/\/ .*$/, '') : l;
    const seen = new Set();
    for (const w of TOOL_WORDS) for (const m of said.matchAll(w.said)) { const t = w.tool(m); if (!seen.has(t)) { seen.add(t); out.push({ file, line: i + 1, tool: t }); } }
  }
  return out;
}
// This module names the tools it reads for; it tells a session none.
export function toldTools(root) {
  return corpus(root).filter((f) => f !== 'tool/lib/admit.mjs').flatMap((f) => { try { return toolsIn(readFileSync(join(root, f), 'utf8'), f); } catch { return []; } });
}
// The told tools that would stop under these settings, each with where it is told and why.
export function admitTools(settings, told) {
  return told.flatMap((t) => { const s = toolStops(t.tool, settings); return s ? [{ ...t, ...s }] : []; });
}
