// What a provider's test change means for its users (Bob, 6 Nov, R8 and its refinement "c"): a
// test naming a Public / Provides requirement is compared token by token, after what never counts
// is set aside (comments, formatting, test names, requirement-id labels, package imports).
//   none      nothing else changed;
//   additive  the only change adds keys or fields to object literals (an expected row gains
//             `pixels_sha256: null`), every existing token kept: a gate-only retest of each user;
//             A wholly new test file is additive (unless it replaces a deleted one: compared with it).
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

const TEST_CALL = new Set(['test', 'it', 'describe', 'suite']);
// What never counts set aside: package imports (a relative one may be a fixture: it stays) and test
// names (the first string of test(...) / it(...) / describe(...)), where requirement-id labels are.
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
    // A test's name: the first string of test(...), never of a method call such as re.test(...).
    if (/^["'`]/.test(t) && toks[i - 1] === '(' && TEST_CALL.has(toks[i - 2]) && toks[i - 3] !== '.') { out.push('""'); continue; }
    if (/^["'`]/.test(t) && toks[i - 1] === '(' && ['only', 'skip', 'todo'].includes(toks[i - 2]) && toks[i - 3] === '.' && TEST_CALL.has(toks[i - 4]) && toks[i - 5] !== '.') { out.push('""'); continue; }
    // A requirement id outside a test's name is a value (cold review of PR 193): never masked.
    out.push(t);
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

// Whether an inserted run, at position at in b, only adds properties to an expected object: one
// that is a fixture (`= {`, `= [{`, a value under one) or an expected argument of an assertion
// (assert.x(actual, {...}), .toEqual({...}); never the actual, never another call's argument);
// `, key: value` or `key: value,`, each value balanced, plain data (no ';', '=>' or function), each
// key new to that object, which holds no spread (cold review of PR 193: an override is a change).
const ASSERT_EXPECTED = (b, open) => {
  // b[open] is '(': the call before it.
  const name = b[open - 1];
  if (b[open - 2] === '.' && /^to[A-Z]/.test(name)) return 'all'; // expect(x).toEqual(<expected>)
  let k = open - 1;
  while (b[k - 1] === '.' && /^[\w$]+$/.test(b[k - 2] || '')) k -= 2;
  return b[k] === 'assert' && b[k - 1] !== '.' ? 'after-first' : null;
};
function addsProperties(b, run) {
  const stack = [];
  for (let k = 0; k < run.at; k++) { const t = b[k]; if ('([{'.includes(t)) stack.push(k); else if (')]}'.includes(t)) stack.pop(); }
  const obj = stack.at(-1);
  if (b[obj] !== '{') return false;
  // The chain of '{' and '[' it sits in, up to what holds it.
  let i = stack.length - 1;
  // A fixture (`const x = {` or `= [{`) is a root wherever it stands: inside a test's body the
  // climb stops there, never into the function or try block around it (copy PR 632, 6 Nov:
  // `pixels_sha256: null` added to a fixture in a test body read as "not an object property").
  const fixtureRoot = (k) => b[k - 1] === '=' && ['const', 'let', 'var'].includes(b[k - 3]);
  while (i > 0 && '{['.includes(b[stack[i - 1]]) && !fixtureRoot(stack[i])) {
    // inside a '{', the container must be a value (`key: {`), not a block
    if (b[stack[i - 1]] === '{' && b[stack[i] - 1] !== ':') return false;
    i--;
  }
  const root = stack[i];
  const before = b[root - 1];
  const holder = i > 0 ? stack[i - 1] : null;
  if (holder !== null && b[holder] === '(') {
    const how = ASSERT_EXPECTED(b, holder);
    if (!how) return false;
    if (how === 'after-first') {
      // Not the first argument (the actual): a ',' at depth one between '(' and the object.
      let d = 0;
      let comma = false;
      for (let k = holder + 1; k < root; k++) { if ('([{'.includes(b[k])) d++; else if (')]}'.includes(b[k])) d--; else if (d === 0 && b[k] === ',') comma = true; }
      if (!comma) return false;
    }
  } else if (!(before === '=' && ['const', 'let', 'var'].includes(b[root - 3]))) return false;
  if (b[obj - 1] === '=' && ['const', 'let', 'var'].includes(b[obj - 2])) return false; // destructuring
  // The object's own keys (depth one), the run left out, and whether it holds a spread.
  const own = new Set();
  let d = 0;
  for (let k = obj + 1; k < b.length; k++) {
    if (k >= run.at && k < run.at + run.toks.length) continue;
    const t = b[k];
    if ('([{'.includes(t)) d++;
    else if (')]}'.includes(t)) { if (d === 0) break; d--; } else if (d === 0 && t === '...') return false;
    else if (d === 0 && b[k + 1] === ':' && (b[k - 1] === '{' || b[k - 1] === ',' || k === obj + 1 || k === run.at + run.toks.length)) own.add(t.replace(/^["']|["']$/g, ''));
  }
  const t = run.toks;
  if (t.some((x) => x === ';' || x === '=>' || x === 'function' || x === '...')) return false;
  let k = 0;
  const lead = t[0] === ',';
  if (lead) k++;
  let props = 0;
  while (k < t.length) {
    if (!/^(?:[A-Za-z_$][\w$]*|["'][^"']*["']|\d+)$/.test(t[k]) || t[k + 1] !== ':') return false;
    const key = t[k].replace(/^["']|["']$/g, '');
    if (own.has(key)) return false;
    own.add(key);
    k += 2;
    let dd = 0;
    const start = k;
    while (k < t.length && !(dd === 0 && t[k] === ',')) { if ('([{'.includes(t[k])) dd++; else if (')]}'.includes(t[k])) { if (--dd < 0) return false; } k++; }
    if (dd !== 0 || k === start) return false;
    props++;
    if (k < t.length) k++; // its comma
    if (!lead && k === t.length && t[k - 1] !== ',' && b[run.at + t.length] !== '}') return false;
  }
  if (lead && t.at(-1) === ',') return false;
  return props > 0;
}

// { class: 'none' | 'additive' | 'breaking', why } for a test file from before to after (either
// may be null: added or removed). ids: the Provides requirement ids, whose labels do not count.
export function classifyTestChange(before, after, ids = []) {
  // A wholly new test file only adds assertions (coordinator, 6 Nov: copy PR 696's added
  // t53-layer.test.mjs was read as breaking). One that replaces a deleted file is compared with
  // that file by the caller (layerflow.mjs interfaceChange), never read here as new.
  if (before === null || before === undefined) return { class: 'additive', why: 'added: a new test file only adds assertions' };
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
