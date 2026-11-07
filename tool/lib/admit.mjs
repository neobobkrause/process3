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
// Each part of a told line (split at &&, ;, ||, |), trimmed.
const parts = (cmd) => cmd.split(/\s*(?:&&|\|\||;|\|)\s*/).map((x) => x.trim()).filter(Boolean);
// The deny rule refusing cmd (any part of it), or null.
export function deniedBy(cmd, settings) {
  const deny = settings?.permissions?.deny || [];
  for (const c of parts(cmd)) for (const r of deny) if (ruleMatches(r, c)) return { part: c, rule: r };
  return null;
}
const TOLD = /^(?:git|gh|curl|rm|npm|npx)\s/;
// The commands told in a file's text: code spans, `${...}` read as X; error texts (`... failed`) left
// out. In a .mjs file only the escaped spans a printed string holds (\`...\`), what a session reads:
// a comment's spans name commands, they tell a session none. In a .md file, its plain spans.
export function toldIn(text, file) {
  const out = [];
  const lines = text.split('\n');
  const code = file.endsWith('.mjs');
  for (const [i, l] of lines.entries()) {
    const spans = code ? l.matchAll(/\\`((?:(?!\\`).)*?)\\`/g) : l.matchAll(/`([^`]+)`/g);
    for (const m of spans) {
      const raw = m[1].replace(/\$\{[^}]*\}/g, 'X').trim();
      if (!TOLD.test(raw) || / failed\b/.test(raw)) continue;
      out.push({ file, line: i + 1, cmd: raw });
    }
  }
  return out;
}
// Every told command of the process at root: its rulebooks, its CLAUDE lines and its tool.
export function toldCommands(root) {
  const files = [
    ...readdirSync(join(root, 'rulebooks')).filter((f) => f.endsWith('.md')).map((f) => `rulebooks/${f}`),
    'shims/CLAUDE.process.md',
    ...readdirSync(join(root, 'tool/lib')).filter((f) => f.endsWith('.mjs')).map((f) => `tool/lib/${f}`),
  ];
  return files.flatMap((f) => { try { return toldIn(readFileSync(join(root, f), 'utf8'), f); } catch { return []; } });
}
// The told commands the settings deny, each with where it is told and the rule.
export function admitCheck(settings, told) {
  return told.flatMap((t) => { const d = deniedBy(t.cmd, settings); return d ? [{ ...t, ...d }] : []; });
}
