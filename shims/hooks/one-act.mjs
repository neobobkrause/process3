#!/usr/bin/env node
// The one-act hook (Foundations, "One act per command"): a PreToolUse hook on Bash. It reads the
// hook's JSON from stdin and refuses, with exit 2 and one line on stderr, a command that joins an
// outward act (git push; the tool's remote commands merge, job start and job complete; gh;
// wrangler deploy, delete, secret, r2 and containers) to anything else by &&, ||, ;, a pipe, &
// or a new line, or that runs one inside another command ($(...), backticks, a subshell,
// bash -c, eval). Everything else exits 0. It judges no text, records nothing and holds no
// turn: it only matches the command's shape. No dependencies; the product's settings file names
// it (README, "The one-act hook").
import { readFileSync } from 'node:fs';

export const MESSAGE = 'run this act as its own command';
const ACT_WORD = /(^|[\s;&|(`'"])(git\b[^\n]*\bpush\b|gh\s|wrangler\b|\S*p3(\.mjs)?\s+(merge|job\s+(start|complete))\b)/;

// Words that may stand before a command without changing what runs.
const WRAPPERS = new Set(['command', 'builtin', 'exec', 'nohup', 'time', 'sudo', 'nice', '!', '{', '(', 'then', 'do', 'else', 'if', 'elif', 'while', 'until']);
const CLOSERS = new Set(['}', ')', 'fi', 'done', 'esac']);
const WRANGLER_ACTS = new Set(['deploy', 'delete', 'secret', 'r2', 'containers']);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);
const base = (w) => w.replace(/^.*\//, '');
const isAssign = (w) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(w);

// Index of the ' that closes an ANSI-C string $'...' whose body starts at i; -1 when unbalanced.
function closeAnsi(s, i) {
  for (; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue; }
    if (s[i] === "'") return i;
  }
  return -1;
}

// A here-document's operator at i (<< or <<-, not <<<): its tag and the index of the operator's
// last character, or null.
function heredocAt(s, i) {
  if (s[i] !== '<' || s[i + 1] !== '<' || s[i + 2] === '<') return null;
  let k = i + 2;
  const strip = s[k] === '-';
  if (strip) k++;
  while (s[k] === ' ' || s[k] === '\t') k++;
  const m = s.slice(k).match(/^(['"]?)([^\s'";|&<>()]+)\1/);
  return m ? { tag: m[2], strip, end: k + m[0].length - 1 } : null;
}

// From a new line at i, the index of the new line that ends each pending here-document's body
// (or the end of the text).
function skipBodies(s, i, docs) {
  for (const h of docs) {
    let j = i + 1;
    for (;;) {
      const e = s.indexOf('\n', j);
      const line = s.slice(j, e < 0 ? s.length : e);
      if ((h.strip ? line.replace(/^\t+/, '') : line) === h.tag || e < 0) { i = e < 0 ? s.length : e; break; }
      j = e + 1;
    }
  }
  return i;
}

// Index just past the ) that closes an opening at i (the text at i is just past the opener),
// skipping quotes, here-document bodies and nested parentheses; -1 when unbalanced.
function closeParen(s, i) {
  let depth = 1;
  let docs = [];
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') { i++; continue; }
    if (c === '$' && s[i + 1] === "'") { const j = closeAnsi(s, i + 2); if (j < 0) return -1; i = j; continue; }
    if (c === "'") { const j = s.indexOf("'", i + 1); if (j < 0) return -1; i = j; continue; }
    if (c === '"') { const j = closeDouble(s, i + 1); if (j < 0) return -1; i = j; continue; }
    if (c === '`') { const j = s.indexOf('`', i + 1); if (j < 0) return -1; i = j; continue; }
    const h = heredocAt(s, i);
    if (h) { docs.push(h); i = h.end; continue; }
    if (c === '\n' && docs.length) { i = skipBodies(s, i, docs); docs = []; continue; }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i + 1;
  }
  return -1;
}
// Index of the " that closes a double-quoted string starting at i; -1 when unbalanced.
function closeDouble(s, i) {
  for (; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue; }
    if (s[i] === '"') return i;
    if (s[i] === '$' && s[i + 1] === '(') { const j = closeParen(s, i + 2); if (j < 0) return -1; i = j - 1; }
  }
  return -1;
}

// Splits a command line into its top-level simple commands (each a list of words, quotes
// removed) and the text of everything nested inside one ($(...), backticks, a subshell).
// Here-document bodies are skipped. Returns null for a line the shell would not parse.
export function parse(s) {
  const segments = [];
  const nested = [];
  let words = [];
  let word = null;
  let heredocs = [];
  const endWord = () => { if (word !== null) { words.push(word); word = null; } };
  const endSegment = () => { endWord(); if (words.length) segments.push(words); words = []; };
  const add = (t) => { word = (word ?? '') + t; };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const n = s[i + 1];
    if (c === '\\') {
      if (n === '\n') { i++; continue; } // a line continuation joins nothing
      add(n ?? ''); i++; continue;
    }
    if (c === '$' && n === "'") { const j = closeAnsi(s, i + 2); if (j < 0) return null; add(s.slice(i + 2, j)); i = j; continue; }
    if (c === "'") { const j = s.indexOf("'", i + 1); if (j < 0) return null; add(s.slice(i + 1, j)); i = j; continue; }
    if (c === '"') {
      const j = closeDouble(s, i + 1);
      if (j < 0) return null;
      const inner = s.slice(i + 1, j);
      collectNested(inner, nested);
      add(inner.replace(/\\(["\\$`])/g, '$1'));
      i = j; continue;
    }
    if (c === '`') { const j = s.indexOf('`', i + 1); if (j < 0) return null; nested.push(s.slice(i + 1, j)); add('`…`'); i = j; continue; }
    if (c === '$' && n === '(') {
      const j = closeParen(s, i + 2);
      if (j < 0) return null;
      if (s[i + 2] !== '(') nested.push(s.slice(i + 2, j - 1)); // $(( )) is arithmetic
      add('$(…)'); i = j - 1; continue;
    }
    if ((c === '<' || c === '>') && n === '(') { // process substitution
      const j = closeParen(s, i + 2);
      if (j < 0) return null;
      nested.push(s.slice(i + 2, j - 1)); add('<(…)'); i = j - 1; continue;
    }
    if (c === '(' && word === null) { // a subshell or a grouping
      const j = closeParen(s, i + 1);
      if (j < 0) return null;
      nested.push(s.slice(i + 1, j - 1)); add('(…)'); i = j - 1; continue;
    }
    if (c === '#' && word === null) { const j = s.indexOf('\n', i); i = (j < 0 ? s.length : j) - 1; continue; }
    const h = heredocAt(s, i); // a here-document: its body is not commands
    if (h) { heredocs.push(h); endWord(); i = h.end; continue; }
    if (c === '&' && (n === '>' || (word !== null && /[<>]$/.test(word)))) { add(c); continue; } // &> and >&
    if (c === '|' && word !== null && /[>]$/.test(word)) { add(c); continue; } // >|
    if (c === '\n') {
      endSegment();
      i = skipBodies(s, i, heredocs);
      heredocs = [];
      continue;
    }
    if (c === ';' || c === '&' || c === '|') {
      endSegment();
      if ((c === '&' || c === '|') && n === c) i++;
      else if (c === '|' && n === '&') i++;
      else if (c === ';' && n === ';') i++;
      continue;
    }
    if (c === ' ' || c === '\t') { endWord(); continue; }
    add(c);
  }
  endSegment();
  return { segments, nested };
}

// Command substitutions inside double quotes run too.
function collectNested(inner, nested) {
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '\\') { i++; continue; }
    if (inner[i] === '`') { const j = inner.indexOf('`', i + 1); if (j < 0) return; nested.push(inner.slice(i + 1, j)); i = j; continue; }
    if (inner[i] === '$' && inner[i + 1] === '(') {
      const j = closeParen(inner, i + 2);
      if (j < 0) return;
      if (inner[i + 2] !== '(') nested.push(inner.slice(i + 2, j - 1));
      i = j - 1;
    }
  }
}

// The words that name what runs: assignments, wrappers and their options dropped.
function head(words) {
  let w = words.slice();
  for (;;) {
    while (w.length && (isAssign(w[0]) || WRAPPERS.has(w[0]))) w.shift();
    if (!w.length) return w;
    const b = base(w[0]);
    if (b === 'env') { w.shift(); while (w.length && (w[0].startsWith('-') || isAssign(w[0]))) { if (['-u', '-C', '-S'].includes(w[0])) w.shift(); w.shift(); } continue; }
    if (b === 'timeout') { w.shift(); while (w.length && w[0].startsWith('-')) w.shift(); w.shift(); continue; }
    if (b === 'sudo' || b === 'nice' || b === 'nohup' || b === 'time') { w.shift(); while (w.length && w[0].startsWith('-')) w.shift(); continue; }
    if (b === 'xargs') { w.shift(); while (w.length && w[0].startsWith('-')) w.shift(); continue; }
    return w;
  }
}

const positional = (w, valued = []) => {
  const out = [];
  for (let i = 0; i < w.length; i++) {
    if (w[i] === '--') { out.push(...w.slice(i + 1)); break; }
    if (w[i].startsWith('-')) { if (valued.includes(w[i])) i++; continue; }
    out.push(w[i]);
  }
  return out;
};

// Whether one simple command (its words) is an outward act. Returns the act's name or null.
// A word cut at its first redirection (push>log is push; >log and 2>&1 are nothing).
const unredirect = (words) => words.map((x) => x.replace(/^(\d*|&)[<>].*$/, '').replace(/[<>].*$/, '')).filter(Boolean);

export function actOf(words) {
  let w = head(unredirect(words));
  if (!w.length) return null;
  let b = base(w[0]);
  // Package runners that start wrangler.
  if (['npx', 'bunx', 'pnpx'].includes(b) || (['pnpm', 'yarn', 'npm', 'bun'].includes(b))) {
    const p = positional(w.slice(1), ['-p', '--package']);
    const k = ['exec', 'dlx', 'x', 'run'].includes(p[0]) ? 1 : 0;
    // wrangler's own words, options included, as they follow it.
    const at = p[k] && /^wrangler(@|$)/.test(base(p[k])) ? w.indexOf(p[k], 1) : -1;
    if (at > 0) { w = w.slice(at); b = 'wrangler'; }
  }
  if (b === 'git') {
    const p = positional(w.slice(1), ['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);
    return p[0] === 'push' ? 'git push' : null;
  }
  if (b === 'gh') return 'gh';
  if (b === 'wrangler' || /^wrangler@/.test(b)) {
    const p = positional(w.slice(1), ['-c', '--config', '-e', '--env', '--cwd']);
    if (WRANGLER_ACTS.has(p[0])) return `wrangler ${p[0]}`;
    if (['versions', 'pages', 'deployments'].includes(p[0]) && WRANGLER_ACTS.has(p[1])) return `wrangler ${p[0]} ${p[1]}`;
    return null;
  }
  // The tool: node [options] <...>/p3.mjs <command>, or a p3 on the path.
  let rest = null;
  if (b === 'node' || b === 'nodejs') {
    const i = w.findIndex((x, k) => k > 0 && !x.startsWith('-'));
    if (i > 0 && base(w[i]) === 'p3.mjs') rest = w.slice(i + 1);
  } else if (b === 'p3' || b === 'p3.mjs') rest = w.slice(1);
  if (rest) {
    const p = positional(rest);
    if (p[0] === 'merge') return 'p3 merge';
    if (p[0] === 'job' && (p[1] === 'start' || p[1] === 'complete')) return `p3 job ${p[1]}`;
    return null;
  }
  // A shell or eval given a command string runs that string.
  return null;
}

// The command strings a simple command hands to a shell (bash -c "...", eval ...).
function innerScripts(words) {
  const w = head(words);
  if (!w.length) return [];
  const b = base(w[0]);
  if (b === 'eval') return [w.slice(1).join(' ')];
  if (SHELLS.has(b)) {
    const i = w.findIndex((x, k) => k > 0 && /^-[a-zA-Z]*c[a-zA-Z]*$/.test(x));
    if (i > 0 && w[i + 1] !== undefined) return [w[i + 1]];
  }
  return [];
}

// The verdict for a whole command line: null when it may run, else the act it joined.
export function judge(command, depth = 0) {
  if (typeof command !== 'string' || depth > 8) return null;
  const p = parse(command);
  // A line this parser cannot read: refused when it names an act and could join it to
  // anything; the shell refuses a line that is truly broken anyway.
  if (!p) return ACT_WORD.test(command) && /[;&|\n]|\$\(|`/.test(command) ? 'an act in a line the hook cannot read' : null;
  const segments = p.segments.filter((w) => { const u = unredirect(w); return u.length && !u.every((x) => CLOSERS.has(x)); });
  const acts = [];
  let inner = [...p.nested];
  for (const w of segments) {
    const a = actOf(w);
    if (a) acts.push(a);
    inner = inner.concat(innerScripts(w));
  }
  // An act anywhere inside another command (a substitution, a subshell, a shell string) is
  // joined to that command.
  for (const t of inner) {
    const n = judge(t, depth + 1);
    if (n) return n;
    const q = parse(t);
    const nestedAct = q && q.segments.map(actOf).find(Boolean);
    if (nestedAct) {
      // A subshell or shell string that is the whole command and holds only the act is the act alone.
      const whole = segments.length === 1 && q.segments.length === 1 && !q.nested.length
        && (/^\(…\)$/.test(unredirect(segments[0]).join(' ')) || innerScripts(segments[0]).length === 1);
      if (!whole) return nestedAct;
    }
  }
  if (acts.length && segments.length > 1) return acts[0];
  return null;
}

export function hook(input) {
  let data;
  try { data = JSON.parse(input); } catch { return 0; }
  if (data?.tool_name !== undefined && data.tool_name !== 'Bash') return 0;
  return judge(data?.tool_input?.command) ? 2 : 0;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/one-act.mjs')) {
  let input = '';
  try { input = readFileSync(0, 'utf8'); } catch { input = ''; }
  const code = hook(input);
  if (code) process.stderr.write(`${MESSAGE}\n`);
  process.exitCode = code;
}
