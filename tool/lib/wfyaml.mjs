// A strict reader of the plain YAML GitHub workflow files are written in (build workflow-limits,
// R1; Bob, 6 Nov: "yes to R1"). The tool has no dependencies, so this is not a YAML library: it
// reads one narrow subset and refuses everything else, so that what it reads is what GitHub runs
// or the file is refused (a refusal is the owner's word, never a guess). Read: block mappings and
// sequences (`- key: v` compact items too), plain and quoted one-line scalars, `|` and `>` block
// scalars, and flow `[...]` / `{...}` collections, which may span lines. Refused: anchors,
// aliases, tags, directives, more than one document, complex (`?`) keys, merge keys, a key twice,
// a tab in an indent, a plain scalar continued on the next line or holding `: `, a quoted scalar
// over more than one line, any line it cannot place. Every scalar is a string (no booleans or
// numbers: `on` stays `on`), and each mapping and sequence carries the 1-based line of each of
// its keys or items (lineOf).

const LINES = Symbol('lines');
const FOLDED = Symbol('folded');
export const lineOf = (node, key) => node?.[LINES]?.[key] ?? null;
// Whether a mapping's value at key was a folded (`>`) block scalar: its lines are kept raw here,
// where GitHub joins them, so a judge that reads lines must not read it (cold review of R1).
export const foldedAt = (node, key) => node?.[FOLDED]?.has(key) === true;
const mark = (node) => {
  Object.defineProperty(node, LINES, { value: Array.isArray(node) ? [] : {}, enumerable: false });
  if (!Array.isArray(node)) Object.defineProperty(node, FOLDED, { value: new Set(), enumerable: false });
  return node;
};

class YamlError extends Error {}
const no = (line, why) => { throw new YamlError(`line ${line}: ${why}`); };

const KEY = /^([A-Za-z0-9_][A-Za-z0-9_.\-/ ]*?|"[^"\\]*"|'[^']*')[ ]*:(?: +|$)/;

// Strips a comment from a plain scalar's text: ` #` (or `#` at its start) begins one.
const plainCut = (s) => { const m = s.match(/(^|[ \t])#/); return (m ? s.slice(0, m.index) : s).trimEnd(); };

function quoted(s, line) {
  if (s[0] === "'") {
    let out = '';
    let i = 1;
    for (;;) {
      if (i >= s.length) no(line, 'a single-quoted scalar does not end on its line');
      if (s[i] === "'") { if (s[i + 1] === "'") { out += "'"; i += 2; continue; } i++; break; }
      out += s[i++];
    }
    return { value: out, rest: s.slice(i) };
  }
  const ESC = { '"': '"', '\\': '\\', '/': '/', n: '\n', t: '\t', r: '\r', '0': '\0', ' ': ' ' };
  let out = '';
  let i = 1;
  for (;;) {
    if (i >= s.length) no(line, 'a double-quoted scalar does not end on its line');
    const c = s[i];
    if (c === '"') { i++; break; }
    if (c === '\\') {
      const e = s[i + 1];
      if (!(e in ESC)) no(line, `the escape \\${e ?? ''} is not read`);
      out += ESC[e]; i += 2; continue;
    }
    out += c; i++;
  }
  return { value: out, rest: s.slice(i) };
}

// After a value: nothing, or a comment.
const tailOk = (rest, line) => { if (rest.trim() && !/^[ \t]+#/.test(rest)) no(line, `text after a value: ${rest.trim().slice(0, 40)}`); };

// A plain scalar, refusing what YAML would read otherwise.
function plain(s, line, flow = false) {
  if (!s) return null;
  if (/\n/.test(s)) no(line, `"${s.slice(0, 40)}" is a plain scalar over more than one line`);
  if (/^[&*!%@`|>?]/.test(s) || /^-(?:[ \t]|$)/.test(s)) no(line, `"${s.slice(0, 40)}" starts with an indicator this reader does not read`);
  if (/:[ \t]|:$/.test(s)) no(line, `"${s.slice(0, 40)}" holds ": ", which YAML does not allow in a plain scalar`);
  if (flow && /[[\]{},]/.test(s)) no(line, `"${s.slice(0, 40)}" holds a flow indicator`);
  if (s === '~' || s === 'null' || s === 'Null' || s === 'NULL') return null;
  return s;
}

// Flow collections: the text from the opening bracket on, possibly over several lines (joined
// with spaces, each line's comment cut).
function flowParse(text, line) {
  let i = 0;
  const ws = () => { while (i < text.length && /[ \t\n]/.test(text[i])) i++; };
  const scalar = () => {
    ws();
    if (text[i] === '"' || text[i] === "'") { const q = quoted(text.slice(i), line); i = text.length - q.rest.length; return q.value; }
    if (text[i] === '[' || text[i] === '{') return value();
    let j = i;
    while (j < text.length && !/[,\]}]/.test(text[j]) && !(text[j] === ':' && /[ \t\n,\]}]/.test(text[j + 1] ?? ' '))) j++;
    const s = text.slice(i, j).trim();
    i = j;
    return plain(s, line, true);
  };
  const value = () => {
    ws();
    const open = text[i];
    if (open === '[') {
      i++;
      const out = mark([]);
      for (;;) {
        ws();
        if (text[i] === ']') { i++; return out; }
        out.push(scalar());
        out[LINES].push(line);
        ws();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === ']') { i++; return out; }
        no(line, 'a flow sequence is not closed as this reader reads it');
      }
    }
    if (open === '{') {
      i++;
      const out = mark({});
      for (;;) {
        ws();
        if (text[i] === '}') { i++; return out; }
        const k = scalar();
        ws();
        if (typeof k !== 'string' || text[i] !== ':') no(line, 'a flow mapping entry is not `key: value`');
        i++;
        if (Object.hasOwn(out, k)) no(line, `the key ${k} is given twice`);
        ws();
        out[k] = text[i] === ',' || text[i] === '}' ? null : scalar();
        out[LINES][k] = line;
        ws();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === '}') { i++; return out; }
        no(line, 'a flow mapping is not closed as this reader reads it');
      }
    }
    no(line, 'not a flow collection');
  };
  const v = value();
  ws();
  if (i < text.length) no(line, `text after a flow collection: ${text.slice(i, i + 40)}`);
  return v;
}

// Cuts a comment from a flow line, minding quotes.
function flowCut(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) { if (q === "'" && s[i + 1] === "'") { i++; continue; } q = null; } else if (c === '\\' && q === '"') i++; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /[ \t]/.test(s[i - 1]))) return s.slice(0, i);
  }
  return s;
}
const depth = (s) => {
  let d = 0;
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) { if (q === "'" && s[i + 1] === "'") { i++; continue; } q = null; } else if (c === '\\' && q === '"') i++; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '[' || c === '{') d++;
    else if (c === ']' || c === '}') d--;
  }
  return d;
};

export function parseWorkflow(src) {
  if (typeof src !== 'string') throw new YamlError('no text');
  const raw = src.replace(/^\ufeff/, '').split('\n');
  if (raw.some((l) => /[\r\u0085\u2028\u2029\ufeff]/.test(l))) no(1, 'a line break other than \\n, or a byte-order mark');
  // Lines: { n (1-based), indent, text } for every line, blank and comment lines included (block
  // scalars read them raw).
  const L = raw.map((t, k) => ({ n: k + 1, t }));
  let start = 0;
  // A single leading `---` is allowed; any other document marker or directive is refused.
  const firstReal = L.findIndex((l) => !/^[ \t]*(#.*)?$/.test(l.t));
  if (firstReal >= 0 && /^---[ \t]*(#.*)?$/.test(L[firstReal].t)) start = firstReal + 1;
  for (let k = start; k < L.length; k++) if (/^(---|\.\.\.)([ \t]|$)/.test(L[k].t) || /^%/.test(L[k].t)) no(L[k].n, 'more than one document, or a directive');

  const isSkip = (l) => /^[ \t]*(#.*)?$/.test(l.t);
  const ind = (l) => {
    const m = l.t.match(/^( *)(\t?)/);
    if (m[2]) no(l.n, 'a tab in an indent');
    return m[1].length;
  };
  let i = start;
  const next = () => { while (i < L.length && isSkip(L[i])) i++; return i < L.length ? L[i] : null; };

  // A block scalar after `key: |` on line `l`, whose parent sits at indent `parent`.
  const blockScalar = (header, l, parent) => {
    const m = header.match(/^([|>])([1-9])?([-+])?([1-9])?(?:[ \t]+#.*)?$/);
    if (!m || (m[2] && m[4])) no(l.n, `the block scalar header "${header}" is not read`);
    const explicit = Number(m[2] || m[4] || 0);
    let k = i + 1;
    let n = explicit ? parent + explicit : -1;
    const body = [];
    for (; k < L.length; k++) {
      const t = L[k].t;
      if (/^ *$/.test(t)) { body.push(''); continue; }
      const d = t.match(/^ */)[0].length;
      if (n < 0) { if (d <= parent) break; n = d; }
      if (d < n) {
        if (d > parent) no(L[k].n, 'a line less indented than its block scalar but inside its key');
        break;
      }
      body.push(t.slice(n));
    }
    while (body.length && body.at(-1) === '') body.pop();
    i = k;
    // The raw lines, as one string: chomping and folding do not change what is compared here.
    return body.join('\n');
  };

  // A value on line l after the key or dash, at text `s`, whose node sits at indent `parent`.
  // Leaves i past what it read.
  const inlineValue = (s, l, parent) => {
    if (s === '' || /^#/.test(s)) {
      i++;
      const nx = next();
      if (!nx) return null;
      const d = ind(nx);
      if (d > parent) return node(d);
      // YAML lets a mapping's value be a sequence at the key's own indent.
      if (d === parent && /^-( |$)/.test(nx.t.slice(d))) return seq(d);
      return null;
    }
    if (s[0] === '|' || s[0] === '>') return blockScalar(s, l, parent);
    if (s[0] === '"' || s[0] === "'") {
      const q = quoted(s, l.n);
      tailOk(q.rest, l.n);
      i++;
      checkNoContinuation(parent);
      return q.value;
    }
    if (s[0] === '[' || s[0] === '{') {
      let text = flowCut(s);
      let d = depth(text);
      const first = l.n;
      while (d > 0) {
        i++;
        if (i >= L.length) no(first, 'a flow collection is not closed');
        // Inside its key, but for a closing bracket at the key's own indent.
        if (!isSkip(L[i]) && (ind(L[i]) < parent || (ind(L[i]) === parent && !/^ *[\]}]/.test(L[i].t)))) no(L[i].n, 'a flow collection\'s line is not inside its key');
        noTab(L[i]);
        const piece = flowCut(L[i].t);
        text += '\n' + piece;
        d += depth(piece);
      }
      i++;
      const v = flowParse(text, first);
      checkNoContinuation(parent);
      return v;
    }
    const v = plain(plainCut(s), l.n);
    i++;
    checkNoContinuation(parent);
    return v;
  };
  // A plain scalar continued on a deeper line is a multi-line scalar: refused.
  const checkNoContinuation = (parent) => {
    const nx = next();
    if (nx && ind(nx) > parent) no(nx.n, 'a line deeper than the value before it (a multi-line scalar, or a value this reader cannot place)');
  };

  // A mapping whose keys sit at indent d; `first` is a line already split off a `- ` item.
  // A tab outside a block scalar is refused: YAML 1.2 reads one as a separator, libyaml refuses
  // it, and this reader would keep it in a value (cold review of R1).
  const noTab = (l) => { if (/\t/.test(l.t)) no(l.n, 'a tab outside a block scalar'); };
  const map = (d, first = null) => {
    const out = mark({});
    let l = first;
    for (;;) {
      if (!l) {
        l = next();
        if (!l || ind(l) < d) return out;
        if (ind(l) > d) no(l.n, 'a line deeper than its mapping\'s keys');
      }
      noTab(l);
      const t = l === first ? first.rest : l.t.slice(d);
      if (/^-( |$)/.test(t)) {
        if (l === first) no(l.n, 'a sequence inside a sequence item');
        return out; // a sequence at the mapping's indent ends it (the caller judges it)
      }
      if (/^[?&*!|>%@`]/.test(t)) no(l.n, `"${t.slice(0, 40)}" starts with an indicator this reader does not read`);
      const m = t.match(KEY);
      if (!m) no(l.n, `"${t.slice(0, 60)}" is not a \`key: value\` line this reader reads`);
      let k = m[1];
      if (k[0] === '"' || k[0] === "'") k = quoted(k, l.n).value;
      if (k === '<<') no(l.n, 'a merge key');
      if (Object.hasOwn(out, k)) no(l.n, `the key ${k} is given twice`);
      out[LINES][k] = l.n;
      const v = t.slice(m[0].length).trim() === '' ? '' : t.slice(m[0].length).replace(/^[ ]+/, '');
      if (v[0] === '>') out[FOLDED].add(k);
      out[k] = inlineValue(v, l, d);
      l = null;
    }
  };

  // A sequence whose dashes sit at indent d; a line at d that is not a dash ends it (a sequence
  // that is a mapping's value at the key's own indent).
  const seq = (d) => {
    const out = mark([]);
    for (;;) {
      const l = next();
      if (!l || ind(l) < d) return out;
      if (ind(l) > d) no(l.n, 'a line deeper than its sequence\'s dashes');
      noTab(l);
      const t = l.t.slice(d);
      if (!/^-( |$)/.test(t)) return out;
      out[LINES].push(l.n);
      const rest = t.slice(1).replace(/^ +/, '');
      const col = d + (t.length - rest.length);
      if (rest === '' || /^#/.test(rest)) { out.push(inlineValue('', l, d)); continue; }
      if (/^-( |$)/.test(rest)) no(l.n, 'a sequence inside a sequence item');
      if (KEY.test(rest)) { out.push(map(col, { n: l.n, t: l.t, rest })); continue; }
      out.push(inlineValue(rest, l, d));
    }
  };

  const node = (d) => {
    const l = next();
    if (/^-( |$)/.test(l.t.slice(d))) return seq(d);
    return map(d);
  };

  try {
    const l = next();
    if (!l) throw new YamlError('the file is empty');
    if (ind(l) !== 0) no(l.n, 'the top level is indented');
    const t = l.t;
    if (/^-( |$)/.test(t) || !KEY.test(t)) no(l.n, 'the top level is not a mapping');
    const doc = map(0);
    const rest = next();
    if (rest) no(rest.n, 'a line this reader cannot place');
    return doc;
  } catch (e) {
    if (e instanceof YamlError) throw e;
    throw new YamlError(String(e.message));
  }
}

// { doc } or { why }.
export function readWorkflow(src) {
  try { return { doc: parseWorkflow(src) }; } catch (e) {
    if (e instanceof YamlError) return { why: e.message };
    throw e;
  }
}
