// Whether a provider's test changed what it asserts (Bob, 6 Nov, R8: only real interface changes
// reschedule). A test that names a Public / Provides requirement reschedules its provider's users
// only when an assertion changed: the arguments of an assert or expect call (expected value, shape,
// status or error), or a fixture an assertion names. Test names, comments, requirement-id labels,
// imports and formatting do not count, and neither does setup no assertion reads. Conservative:
// whatever cannot be told apart counts as a change.

// Code with comments removed and whitespace outside strings collapsed; strings kept as written.
// null when a string, template or comment does not close (unsure: a change).
export function normCode(src) {
  const s = String(src ?? '');
  let out = '';
  let space = false;
  const push = (t) => { if (space && out && /[\w$]$/.test(out) && /^[\w$]/.test(t)) out += ' '; space = false; out += t; };
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '/') { const j = s.indexOf('\n', i); i = j < 0 ? s.length : j; space = true; continue; }
    if (c === '/' && s[i + 1] === '*') { const j = s.indexOf('*/', i + 2); if (j < 0) return null; i = j + 2; space = true; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < s.length && s[j] !== c) { if (s[j] === '\\') j++; else if (c !== '`' && s[j] === '\n') return null; j++; }
      if (j >= s.length) return null;
      push(s.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (/\s/.test(c)) { space = true; i++; continue; }
    push(c);
    i++;
  }
  return out;
}

const ID = /\bR\d+(?:\.\d+)*[a-z]?\b/g;
// The normalized code with imports dropped, test names blanked and requirement ids labelled alike.
function body(n, ids) {
  let t = n.replace(/\bimport(?:[\w$\s{},*]*?from)?(["'])[^"'\n]*\1;?/g, '');
  t = t.replace(/\b(test|it|describe|suite)((?:\.(?:only|skip|todo))?)\((["'`])(?:\\.|(?!\3)[^\\])*\3/g, '$1$2(""');
  for (const id of ids) t = t.split(id).join('R#');
  return t.replace(ID, 'R#');
}
// The text between the bracket at i and its match, strings skipped; null when it does not close.
function group(t, i) {
  let d = 0;
  for (let j = i; j < t.length; j++) {
    const c = t[j];
    if (c === '"' || c === "'" || c === '`') { let k = j + 1; while (k < t.length && t[k] !== c) { if (t[k] === '\\') k++; k++; } j = k; continue; }
    if ('([{'.includes(c)) d++;
    else if (')]}'.includes(c) && --d === 0) return j;
  }
  return null;
}
// Every assert(...) / assert.x(...) / expect(...).chain(...) call, in order; null when unsure.
function assertions(t) {
  const out = [];
  const RE = /\b(assert(?:\.[\w$]+)*|expect)\(/g;
  for (let m; (m = RE.exec(t));) {
    if (/[\w$.]$/.test(t.slice(0, m.index))) continue;
    let end = group(t, m.index + m[0].length - 1);
    if (end === null) return null;
    // expect(x).not.toEqual(y): the chain is part of the assertion.
    for (let k; (k = /^\.[\w$]+(\()?/.exec(t.slice(end + 1)));) {
      if (!k[1]) { end += k[0].length; continue; }
      const e2 = group(t, end + k[0].length);
      if (e2 === null) return null;
      end = e2;
    }
    out.push(t.slice(m.index, end + 1));
    RE.lastIndex = end + 1;
  }
  return out;
}
const WORDS = new Set(['assert', 'expect', 'true', 'false', 'null', 'undefined', 'new', 'typeof', 'await', 'async', 'function', 'return', 'const', 'let', 'var', 'not', 'this']);
// The declaration statement of a name (const/let/var/function/class), or '' without one.
function decl(t, name) {
  const m = new RegExp(`(?:^|[^\\w$.])(?:const|let|var|function\\*?|class)\\s*${name.replace(/\$/g, '\\$')}(?![\\w$])`).exec(t);
  if (!m) return '';
  let d = 0;
  for (let j = m.index; j < t.length; j++) {
    const c = t[j];
    if (c === '"' || c === "'" || c === '`') { let k = j + 1; while (k < t.length && t[k] !== c) { if (t[k] === '\\') k++; k++; } j = k; continue; }
    if ('([{'.includes(c)) d++;
    else if (')]}'.includes(c)) { d--; if (d === 0 && c === '}' && /^(function|class)/.test(t.slice(m.index).replace(/^[^\w$]/, ''))) return t.slice(m.index, j + 1); }
    else if (d === 0 && c === ';') return t.slice(m.index, j + 1);
  }
  return t.slice(m.index);
}

// { changed, why }: whether the assertions of a test file changed from before to after (either
// may be null: added or removed). ids: the Provides requirement ids, labels not counted.
export function assertionChange(before, after, ids = []) {
  if (before === null || before === undefined || after === null || after === undefined) return { changed: true, why: before == null ? 'added' : 'removed' };
  const [na, nb] = [normCode(before), normCode(after)];
  if (na === null || nb === null) return { changed: true, why: 'unparsed' };
  const [a, b] = [body(na, ids), body(nb, ids)];
  if (a === b) return { changed: false, why: 'names, comments, labels, imports or formatting only' };
  const [xa, xb] = [assertions(a), assertions(b)];
  if (xa === null || xb === null) return { changed: true, why: 'unparsed' };
  if (xa.join('\n') !== xb.join('\n')) return { changed: true, why: 'assertions' };
  // The same assertions: a fixture any of them names changed?
  const names = [...new Set([...xa.join(' ').replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '').matchAll(/(?<![\w$.])[A-Za-z_$][\w$]*/g)].map((m) => m[0]))].filter((w) => !WORDS.has(w));
  const moved = names.filter((w) => decl(a, w) !== decl(b, w));
  if (moved.length) return { changed: true, why: `fixture ${moved.join(', ')}` };
  return { changed: false, why: 'setup only' };
}
