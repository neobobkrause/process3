// A provider module's exported interface, as its users reach it (coordinator, 4 Nov: ai-accounts'
// T53 rewrite removed accountReferenceSet, groupKeySet and five more of its service's methods and
// changed accountUsesOf's argument with no requirement mark changed; ai-runs, answers, ai-use and
// question-explorer broke, each found only when its own job ran).
// The entry files are the provider's files another module imports, found as the gate's imports
// check finds an import (checks.mjs `specifiers`, relative specifiers resolved from the importing
// file); with none found, the provider's index files. The surface of a file is its exported names,
// each with its signature: a function's parameters, a class's public methods (its own and those it
// inherits from classes of the same module) as `Class.method(params)`, followed through
// `export ... from` and `export *` within the module. Static reading only: a changed answer shape
// is not seen, which triage reads.
import { posix } from 'node:path';
import { specifiers } from './checks.mjs';
import { git } from './util.mjs';

const CODE = /\.(m|c)?(j|t)sx?$/;
const EXTS = ['.mjs', '.js', '.cjs', '.ts', '.mts', '.jsx', '.tsx'];

// Comments out and string contents blanked, so braces and parentheses can be counted; lengths
// and line breaks kept.
export function blank(text) {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    const d = text[i + 1];
    if (c === '/' && d === '*') { const e = text.indexOf('*/', i + 2); const j = e < 0 ? n : e + 2; out += text.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue; }
    if (c === '/' && d === '/') { const e = text.indexOf('\n', i); const j = e < 0 ? n : e; out += ' '.repeat(j - i); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && text[j] !== c) { if (text[j] === '\\') j++; else if (c !== '`' && text[j] === '\n') break; j++; }
      out += c + text.slice(i + 1, j).replace(/[^\n]/g, ' ') + (j < n ? c : '');
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// The text between the bracket at i and its match.
function inside(b, i, open, close) {
  let depth = 0;
  for (let j = i; j < b.length; j++) {
    if (b[j] === open) depth++;
    else if (b[j] === close && --depth === 0) return { text: b.slice(i + 1, j), end: j };
  }
  return { text: b.slice(i + 1), end: b.length };
}
const sig = (raw, b, i) => {
  // Parameters from the original text (defaults kept), whitespace collapsed.
  const { end } = inside(b, i, '(', ')');
  return `(${raw.slice(i + 1, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ').trim()})`;
};

// A class body's public methods (not _ or #): name -> `(params)`, `static (params)`, `get`; a setter as `name=`.
function methods(raw, b, open) {
  const { end } = inside(b, open, '{', '}');
  const out = new Map();
  let depth = 0;
  const RE = /(?:^|[\s;}])((?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?\*?\s*)([A-Za-z$][\w$]*)\s*\(/y;
  for (let j = open + 1; j < end; j++) {
    const c = b[j];
    if (c === '{' || c === '(' || c === '[') { depth++; continue; }
    if (c === '}' || c === ')' || c === ']') { depth--; continue; }
    if (depth !== 0) continue;
    RE.lastIndex = j;
    const m = RE.exec(b);
    if (!m) continue;
    const name = m[2];
    const p = RE.lastIndex - 1;
    if (!/^[_#]/.test(name) && !['constructor', 'if', 'for', 'while', 'switch', 'catch', 'function', 'return'].includes(name)) {
      const kind = /\bstatic\b/.test(m[1]) ? 'static ' : '';
      const acc = (m[1].match(/\b(get|set)\s+$/) || [])[1];
      const key = acc === 'set' ? `${name}=` : name;
      out.set(key, `${kind}${acc || sig(raw, b, p)}`);
    }
    j = p - 1; // the parameter list is counted as a bracket next
  }
  return out;
}

// One file's exports, followed within the module: Map name -> signature, and `Class.method` keys.
export function surfaceOf(read, file, inModule, seen = new Set()) {
  if (seen.has(file)) return new Map();
  seen.add(file);
  const raw = read(file);
  if (raw === null) return new Map();
  const b = blank(raw);
  const out = new Map();
  const local = new Map(); // a declared name -> its signature, for `export { a }` and `extends`
  const imports = new Map(); // a local name -> { file, name } within the module
  const resolveIn = (spec) => resolveSpec(file, spec, (f) => inModule(f) && read(f) !== null);
  for (const m of raw.matchAll(/\bimport\s*\{([^}]*)\}\s*from\s*(['"])([^'"\n]+)\2/g)) {
    const to = resolveIn(m[3]);
    if (to) for (const part of m[1].split(',')) { const [a, as] = part.trim().split(/\s+as\s+/); if (a) imports.set((as || a).trim(), { file: to, name: a.trim() }); }
  }
  // A class's methods: its own over those of the class it extends, that class read from this
  // file (exported or not, declared before or after; review of PR 82) or from the module file it
  // is imported from.
  const visiting = new Set();
  const classSurface = (name, open, ext) => {
    const own = methods(raw, b, open);
    let inherited = new Map();
    if (ext && !visiting.has(name)) {
      visiting.add(name);
      const src = imports.get(ext);
      if (!src && local.get(ext)?.members) inherited = local.get(ext).members();
      else if (src) {
        const base = surfaceOf(read, src.file, inModule, new Set(seen));
        inherited = new Map([...base].filter(([k]) => k.startsWith(`${src.name}.`)).map(([k, v]) => [k.slice(src.name.length + 1), v]));
      }
      visiting.delete(name);
    }
    return new Map([...inherited, ...own]);
  };
  const declare = (name, value) => local.set(name, value);
  for (const m of b.matchAll(/\b(export\s+(?:default\s+)?)?(async\s+)?function\s*\*?\s*([A-Za-z$][\w$]*)\s*\(/g)) declare(m[3], { sig: `function${sig(raw, b, m.index + m[0].length - 1)}`, exported: !!m[1], at: m.index });
  for (const m of b.matchAll(/\b(export\s+(?:default\s+)?)?class\s+([A-Za-z$][\w$]*)\s*(?:extends\s+([A-Za-z$][\w$.]*))?\s*\{/g)) {
    declare(m[2], { sig: 'class', exported: !!m[1], at: m.index, members: () => classSurface(m[2], m.index + m[0].length - 1, m[3]) });
  }
  for (const m of b.matchAll(/\b(export\s+)?(?:const|let|var)\s+([A-Za-z$][\w$]*)\s*=\s*(async\s*)?(\(|[A-Za-z$][\w$]*\s*=>)?/g)) {
    if (local.has(m[2])) continue;
    const arrow = m[4] === '(' && /^\s*=>/.test(b.slice(inside(b, m.index + m[0].length - 1, '(', ')').end + 1));
    declare(m[2], { sig: arrow ? `function${sig(raw, b, m.index + m[0].length - 1)}` : m[4] && m[4] !== '(' ? `function(${m[4].replace(/\s*=>$/, '')})` : 'value', exported: !!m[1], at: m.index });
  }
  for (const m of b.matchAll(/\bexport\s+(?:const|let|var)\s*[{[]([^}\]]*)[}\]]/g)) for (const n of m[1].split(',').map((x) => x.split(':').pop().split('=')[0].trim()).filter(Boolean)) declare(n, { sig: 'value', exported: true });
  const put = (name, d) => {
    out.set(name, d.sig);
    if (d.members) for (const [k, v] of d.members()) out.set(`${name}.${k}`, v);
  };
  for (const [name, d] of local) if (d.exported) put(name, d);
  if (/\bexport\s+default\b/.test(b) && !out.has('default')) out.set('default', 'value');
  // export { a, b as c } [from './x'], export * [as ns] from './x'
  for (const m of raw.matchAll(/\bexport\s*\{([^}]*)\}\s*(?:from\s*(['"])([^'"\n]+)\2)?/g)) {
    const from = m[3] ? resolveIn(m[3]) : null;
    if (m[3] && !from) { for (const part of m[1].split(',')) { const [a, as] = part.trim().split(/\s+as\s+/); if (a) out.set((as || a).trim(), 'external'); } continue; }
    const there = from ? surfaceOf(read, from, inModule, seen) : null;
    for (const part of m[1].split(',')) {
      const [a, as] = part.trim().split(/\s+as\s+/).map((x) => x && x.trim());
      if (!a) continue;
      const name = as || a;
      if (there) {
        out.set(name, there.get(a) ?? 'value');
        for (const [k, v] of there) if (k.startsWith(`${a}.`)) out.set(`${name}.${k.slice(a.length + 1)}`, v);
      } else if (local.has(a)) put(name, local.get(a));
      else if (imports.has(a)) {
        const s = imports.get(a);
        const t = surfaceOf(read, s.file, inModule, new Set(seen));
        out.set(name, t.get(s.name) ?? 'value');
        for (const [k, v] of t) if (k.startsWith(`${s.name}.`)) out.set(`${name}.${k.slice(s.name.length + 1)}`, v);
      } else out.set(name, 'value');
    }
  }
  for (const m of raw.matchAll(/\bexport\s*\*\s*(?:as\s+([A-Za-z$][\w$]*)\s*)?from\s*(['"])([^'"\n]+)\2/g)) {
    const from = resolveIn(m[3]);
    if (m[1]) { out.set(m[1], 'namespace'); continue; }
    if (from) for (const [k, v] of surfaceOf(read, from, inModule, seen)) if (k !== 'default' && !out.has(k)) out.set(k, v);
  }
  return out;
}

// A relative specifier from a file, to a file `has` accepts: as written, with an extension, or its index.
const JOINS = new Map(); // `${from}\0${spec}` -> the path it names, kept (a tree's every import is resolved)
export function resolveSpec(from, spec, has) {
  if (!spec.startsWith('./') && !spec.startsWith('../')) return null;
  const k = `${from}\0${spec}`;
  let p = JOINS.get(k);
  if (p === undefined) { p = posix.normalize(posix.join(posix.dirname(from), spec)).replace(/\/$/, ''); keep(JOINS, SPECS_MAX, k, p); }
  if (has(p)) return p;
  for (const e of EXTS) if (has(p + e)) return p + e;
  for (const e of EXTS) if (has(`${p}/index${e}`)) return `${p}/index${e}`;
  return null;
}

// The reads below are by git object id, so what one read is kept for the process (merge train, 5 Nov:
// a cold start's hold ran git grep over 92 trees and git show of 39,018 files, one git process
// each, 364 s of its 422 s before the first pick; now a tree is one git ls-tree, and the files it
// needs one git cat-file --batch, only those not read before).
// A tree at ref: path -> { mode, type, oid }, trees and submodules included, in git's order.
export function treeAt(root, ref) {
  const out = new Map();
  for (const line of git(['ls-tree', '-r', '-t', '-z', ref], { cwd: root }).split('\0')) {
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const [mode, type, oid] = line.slice(0, tab).split(' ');
    out.set(line.slice(tab + 1), { mode, type, oid });
  }
  return out;
}
// Blob texts by object id, read in one git process; an id git cannot read is null (as a failed git show).
const TEXTS = new Map(); // oid -> text, the files a surface read, kept while under TEXT_MAX characters
const TEXT_MAX = 32 * 1024 * 1024;
let textChars = 0;
const keepText = (o, t) => {
  TEXTS.set(o, t);
  textChars += t.length;
  for (const [k, v] of TEXTS) { if (textChars <= TEXT_MAX) break; TEXTS.delete(k); textChars -= v.length; } // the oldest first
};
const keep = (map, max, k, v) => { map.set(k, v); if (map.size > max) map.delete(map.keys().next().value); };
export function blobTexts(root, oids, { cache = true } = {}) {
  const out = new Map();
  const want = [...new Set(oids)].filter((o) => { if (TEXTS.has(o)) { out.set(o, TEXTS.get(o)); return false; } return true; });
  if (!want.length) return out;
  const r = git(['cat-file', '--batch'], { cwd: root, allowFail: true, encoding: 'buffer', input: want.join('\n') + '\n' });
  const buf = Buffer.isBuffer(r.stdout) ? r.stdout : Buffer.alloc(0);
  let i = 0;
  for (const o of want) {
    const nl = buf.indexOf(10, i);
    if (nl < 0) { out.set(o, null); continue; }
    const head = buf.toString('latin1', i, nl).split(' ');
    if (head[1] !== 'blob') { out.set(o, null); i = nl + 1; continue; } // "<oid> missing", or not a blob
    const n = Number(head[2]);
    const text = buf.toString('utf8', nl + 1, nl + 1 + n);
    i = nl + 1 + n + 1;
    out.set(o, text);
    if (cache && text.length <= TEXT_MAX / 8) keepText(o, text);
  }
  return out;
}
// A code file's specifiers, by blob id (checks.mjs specifiers): the text itself is not kept. Read
// in parts, so a whole tree's code is never in memory at once.
const SPECS = new Map();
const SPECS_MAX = 200000;
const PART = 512;
function specsOf(root, oids) {
  const miss = [...new Set(oids)].filter((o) => !SPECS.has(o));
  for (let i = 0; i < miss.length; i += PART) {
    for (const [o, t] of blobTexts(root, miss.slice(i, i + PART), { cache: false })) keep(SPECS, SPECS_MAX, o, t === null ? [] : specifiers(t).map((x) => x.spec));
  }
  return (o) => SPECS.get(o) || [];
}
// Whether a blob's text has one of the words (git grep -F's test), by blob id and words.
const WORDS = new Map();
function hasWord(root, oids, words) {
  const k = (o) => `${o}\0${JSON.stringify(words)}`;
  const miss = [...new Set(oids)].filter((o) => !WORDS.has(k(o)));
  for (const [o, t] of blobTexts(root, miss, { cache: false })) keep(WORDS, SPECS_MAX, k(o), t !== null && words.some((w) => t.includes(w)));
  return (o) => WORDS.get(k(o)) === true;
}
// The files git grep reads in a tree: regular files (not links) ending in EXTS.
const isCodeBlob = (p, e) => e?.type === 'blob' && /^100/.test(e.mode) && EXTS.some((x) => p.endsWith(x));

// The provider's entry files at ref: its source files a file outside the module imports; else its index files.
// An importer inside the provider module (its source, its tests, anything under its paths) is not
// a user: the gate counts a module's tests as the module's own (checks.mjs ownerOf; review of PR 82).
export function entryFiles(root, ref, { isProviderSource, providerPaths, inProvider = isProviderSource }, at = {}) {
  const tree = at.tree || treeAt(root, ref);
  const all = [...tree].filter(([, e]) => e.type !== 'tree').map(([p]) => p);
  const set = new Set(all);
  const mine = all.filter((f) => CODE.test(f) && isProviderSource(f));
  if (!mine.length) return [];
  // Only files naming one of the provider's directories can import it (the words git grep -F
  // looked for): every code file's imports are read by blob id, and the words are read only in
  // the files whose imports reach the provider's source.
  const words = [...new Set(providerPaths.map((p) => p.replace(/\/$/, '').split('/').pop()).filter((w) => w && w !== '.'))];
  const found = new Set();
  if (words.length) {
    const files = [...tree].filter(([f, e]) => isCodeBlob(f, e) && CODE.test(f) && !inProvider(f));
    const specs = specsOf(root, files.map(([, e]) => e.oid));
    const reach = [];
    for (const [f, e] of files) {
      const to = specs(e.oid).map((spec) => resolveSpec(f, spec, (x) => set.has(x))).filter((x) => x && isProviderSource(x));
      if (to.length) reach.push([e.oid, to]);
    }
    const named = hasWord(root, reach.map(([o]) => o), words);
    for (const [o, to] of reach) if (named(o)) for (const x of to) found.add(x);
  }
  if (found.size) return [...found].sort();
  return mine.filter((f) => /(^|\/)index\.[^/]+$/.test(f)).sort();
}

// The surface of a provider at ref: the names every entry file exports, one map; where two entry
// files export one name, the later file in path order wins.
export function surfaceAt(root, ref, opts) {
  const tree = treeAt(root, ref);
  const files = entryFiles(root, ref, opts, { tree });
  // The provider's own code files, read at once: a surface follows its imports within the module.
  blobTexts(root, [...tree].filter(([p, e]) => e.type === 'blob' && CODE.test(p) && opts.isProviderSource(p)).map(([, e]) => e.oid));
  const cache = new Map();
  const plain = (f) => f && f !== '.' && !f.startsWith('/') && !f.startsWith('../') && !f.endsWith('/') && posix.normalize(f) === f;
  const read = (f) => {
    if (!cache.has(f)) {
      const e = tree.get(f);
      if (e?.type === 'blob') cache.set(f, blobTexts(root, [e.oid]).get(e.oid));
      else if (!e && plain(f)) cache.set(f, null); // not in the tree: git show would fail
      else { const r = git(['show', `${ref}:${f}`], { cwd: root, allowFail: true }); cache.set(f, r.code === 0 ? r.stdout : null); }
    }
    return cache.get(f);
  };
  const out = new Map();
  for (const f of files) for (const [k, v] of surfaceOf(read, f, opts.isProviderSource)) out.set(k, v);
  return { files, names: out };
}

// The export names added, removed or changed between base and head.
export function exportChanges(root, base, head, opts) {
  const a = surfaceAt(root, base, opts).names;
  const b = surfaceAt(root, head, opts).names;
  const removed = [...a.keys()].filter((k) => !b.has(k)).sort();
  const added = [...b.keys()].filter((k) => !a.has(k)).sort();
  const changed = [...a.keys()].filter((k) => b.has(k) && a.get(k) !== b.get(k)).sort().map((k) => ({ name: k, before: a.get(k), after: b.get(k) }));
  return { removed, added, changed };
}
// For tests: forget every read kept.
export function forgetReads() { TEXTS.clear(); SPECS.clear(); WORDS.clear(); JOINS.clear(); textChars = 0; }
export const anyExportChange = (x) => !!x && (x.removed.length || x.added.length || x.changed.length) > 0;
