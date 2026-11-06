// What a provider's test change means for its users (Bob, 6 Nov, R8 and its refinement "c"): a
// test naming a Public / Provides requirement is compared token by token, after what never counts
// is set aside (comments, formatting, test names, requirement-id labels, package imports).
//   none      nothing else changed;
//   additive  the only change adds keys or fields to object literals (an expected row gains
//             `pixels_sha256: null`), every existing token kept: a gate-only retest of each user;
//   breaking  anything else (a changed or removed expected value or key, a new or changed call,
//             setup, a fixture, a relative import): a full reschedule. Conservative: a file that
//             cannot be read token by token, or a diff too large to align, is breaking.

// Tokens: strings, templates and regular expressions kept whole; comments dropped; null when a
// string, template, regular expression or comment does not close.
const PUNCT_BEFORE_REGEX = /[(,=:[!&|?{};+\-*%<>~^]$/;
const KEYWORDS_BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);
const WORD = /[A-Za-z_$][\w$]*|\d[\w.]*|=>|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\?\.|\.\.\.|\*\*|\+\+|--|[^\s]/y;
export function tokens(src) {
  const s = String(src ?? '');
  const out = [];
  const regexOk = () => { const p = out.at(-1); return p === undefined || PUNCT_BEFORE_REGEX.test(p) || KEYWORDS_BEFORE_REGEX.has(p); };
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && s[i + 1] === '/') { const j = s.indexOf('\n', i); i = j < 0 ? s.length : j; continue; }
    if (c === '/' && s[i + 1] === '*') { const j = s.indexOf('*/', i + 2); if (j < 0) return null; i = j + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      // A template's ${...} is kept inside its token: any change in it changes the token.
      while (j < s.length && s[j] !== c) { if (s[j] === '\\') j++; else if (c !== '`' && s[j] === '\n') return null; j++; }
      if (j >= s.length) return null;
      out.push(s.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (c === '/' && regexOk()) {
      let j = i + 1;
      let cls = false;
      while (j < s.length && (cls || s[j] !== '/')) { if (s[j] === '\n') return null; if (s[j] === '\\') j++; else if (s[j] === '[') cls = true; else if (s[j] === ']') cls = false; j++; }
      if (j >= s.length) return null;
      j++;
      while (j < s.length && /[a-z]/i.test(s[j])) j++;
      out.push(s.slice(i, j));
      i = j;
      continue;
    }
    WORD.lastIndex = i;
    const w = WORD.exec(s);
    out.push(w[0]);
    i += w[0].length;
  }
  return out;
}

const ID = /\bR\d+(?:\.\d+)*[a-z]?\b/g;
const TEST_CALL = new Set(['test', 'it', 'describe', 'suite']);
// What never counts set aside: package imports (a relative one may be a fixture: it stays), test
// names (the first string of test(...) / it(...) / describe(...)) and requirement-id labels.
function significant(toks, ids) {
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === 'import' && (i === 0 || toks[i - 1] === ';' || toks[i - 1] === '}') && toks[i + 1] !== '(') {
      // The statement runs to its module string (and its ';'): a package's is dropped.
      let k = i + 1;
      while (k < toks.length && k < i + 200 && !/^["']/.test(toks[k]) && toks[k] !== ';') k++;
      if (/^["']/.test(toks[k] || '') && !/^["']\.{1,2}\//.test(toks[k])) { i = toks[k + 1] === ';' ? k + 1 : k; continue; }
    }
    if (/^["'`]/.test(t) && toks[i - 1] === '(' && TEST_CALL.has(toks[i - 2])) { out.push('""'); continue; }
    if (/^["'`]/.test(t) && toks[i - 1] === '(' && toks[i - 2] && ['only', 'skip', 'todo'].includes(toks[i - 2]) && toks[i - 3] === '.' && TEST_CALL.has(toks[i - 4])) { out.push('""'); continue; }
    let x = t;
    for (const id of ids) x = x.split(id).join('R#');
    out.push(x.replace(ID, 'R#'));
  }
  return out;
}

// The tokens of b not in their longest common subsequence with a, as runs { at, toks } (at: index
// in b); deleted: whether a token of a is not in it. null when the middle is too large to align.
function diff(a, b) {
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let q = 0;
  while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
  const A = a.slice(p, a.length - q);
  const B = b.slice(p, b.length - q);
  if (A.length * B.length > 4e6) return null;
  const n = A.length;
  const m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const runs = [];
  let deleted = false;
  let i = 0;
  let j = 0;
  let cur = null;
  const close = () => { if (cur) runs.push(cur); cur = null; };
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) { close(); i++; j++; } else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { (cur ||= { at: p + j, toks: [] }).toks.push(B[j]); j++; } else { deleted = true; i++; }
  }
  close();
  return { runs, deleted };
}

// Whether an inserted run, at position at in b, only adds properties to an object literal:
// `, key: value` or `key: value,` (one or more), inside braces, each value balanced.
function addsProperties(b, run) {
  // The innermost open bracket before the run must be '{'.
  const stack = [];
  for (let k = 0; k < run.at; k++) { const t = b[k]; if ('([{'.includes(t)) stack.push(t); else if (')]}'.includes(t)) stack.pop(); }
  if (stack.at(-1) !== '{') return false;
  const t = run.toks;
  let k = 0;
  const lead = t[0] === ',';
  if (lead) k++;
  let props = 0;
  while (k < t.length) {
    if (!/^(?:[A-Za-z_$][\w$]*|["'][^"']*["']|\d+)$/.test(t[k]) || t[k + 1] !== ':') return false;
    k += 2;
    let d = 0;
    const start = k;
    while (k < t.length && !(d === 0 && t[k] === ',')) { if ('([{'.includes(t[k])) d++; else if (')]}'.includes(t[k])) { if (--d < 0) return false; } k++; }
    if (d !== 0 || k === start) return false;
    props++;
    if (k < t.length) k++; // its comma
    if (!lead && k === t.length && t[k - 1] !== ',') {
      // `key: value` with no comma of its own: the token after the run must close the object or be
      // the comma that was the previous last property's (inserted before an existing `}`).
      if (b[run.at + t.length] !== '}') return false;
    }
  }
  if (lead && t.at(-1) === ',') return false;
  return props > 0;
}

// { class: 'none' | 'additive' | 'breaking', why } for a test file from before to after (either
// may be null: added or removed). ids: the Provides requirement ids, whose labels do not count.
export function classifyTestChange(before, after, ids = []) {
  if (before === null || before === undefined) return { class: 'breaking', why: 'added' };
  if (after === null || after === undefined) return { class: 'breaking', why: 'removed' };
  const [ta, tb] = [tokens(before), tokens(after)];
  if (!ta || !tb) return { class: 'breaking', why: 'unparsed' };
  const [a, b] = [significant(ta, ids), significant(tb, ids)];
  if (a.join('\u0000') === b.join('\u0000')) return { class: 'none', why: 'names, comments, labels, imports or formatting only' };
  const d = diff(a, b);
  if (!d) return { class: 'breaking', why: 'too large to align' };
  if (d.deleted) return { class: 'breaking', why: 'an existing token changed or was removed' };
  const bad = d.runs.filter((r) => !addsProperties(b, r));
  if (bad.length) return { class: 'breaking', why: `added code that is not an object property: ${bad[0].toks.slice(0, 8).join(' ')}` };
  return { class: 'additive', why: `added ${d.runs.map((r) => r.toks.filter((x, k) => r.toks[k + 1] === ':').join(', ')).join('; ')}` };
}
// The earlier name: { changed, why }.
export const assertionChange = (before, after, ids = []) => { const c = classifyTestChange(before, after, ids); return { changed: c.class !== 'none', class: c.class, why: c.why }; };
