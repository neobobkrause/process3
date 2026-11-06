// What a provider's test change means for its users (Bob, 6 Nov, R8 and "c"): none, additive or
// breaking. The cases of the R8 cold review (PR 193), each once read as "no change", are breaking.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyTestChange, tokens } from '../lib/testdiff.mjs';

const base = `import test from 'node:test';
import assert from 'node:assert/strict';
const input = 3;
const expected = { status: 200 };
test('R3 answers', () => { assert.deepEqual(f(input), expected); });
`;
const cls = (a, b) => classifyTestChange(a, b, ['R3']).class;

test('none: test names, id labels, comments, package imports and formatting', () => {
  assert.equal(cls(base, base.replace("'R3 answers'", "'R3.1 answers the list'")), 'none');
  assert.equal(cls(base, `// a note\n${base.replace(/; /g, ';\n  ')}`), 'none');
  assert.equal(cls(base, base.replace('node:assert/strict', 'node:assert')), 'none');
});

test('additive: keys or fields added to object literals, every existing token kept', () => {
  assert.equal(cls(base, base.replace('{ status: 200 }', '{ status: 200, pixels_sha256: null }')), 'additive');
  assert.equal(cls(base, base.replace('{ status: 200 }', '{ pixels_sha256: null, status: 200 }')), 'additive');
  assert.equal(cls(base, base.replace('{ status: 200 }', '{ status: 200, meta: { a: [1, 2] } }')), 'additive');
});

test('breaking: the review\'s cases, each a changed expectation', () => {
  const cases = {
    'a fixture declared after a ;': base.replace('status: 200', 'status: 404'),
    'a removed key': base.replace('{ status: 200 }', '{}'),
    'a fixture one step away': base.replace('const input = 3;', 'const ROWS = [1, 2]; const input = build(ROWS);'),
    'a helper call': `${base}function check(r, want) { assert.deepEqual(r, want); }\ncheck(f(), { a: 1 });\n`,
    'a reassignment': `${base}let want = 1; want = 2;\n`,
    'a template': base.replace('f(input)', 'f(`v${input}`)'),
    't.assert': base.replace('assert.deepEqual', 't.assert.deepEqual'),
    'a relative import (a fixture file)': base.replace("import assert from 'node:assert/strict';", "import assert from 'node:assert/strict';\nimport want from './v2.json';"),
    'a regular expression with an escaped /*': base.replace('f(input)', 'f(/x\\/*y/)'),
    'a new assertion': base.replace('expected); }', 'expected); assert.ok(1); }'),
  };
  const before = { ...cases, 'a reassignment': `${base}let want = 1; want = 1;\n`, 'a helper call': `${base}function check(r, want) { assert.deepEqual(r, want); }\ncheck(f(), { a: 2 });\n`, 'a regular expression with an escaped /*': base.replace('f(input)', 'f(/x\\/*z/)'), 'a template': base.replace('f(input)', 'f(`v${n}`)') };
  for (const [k, after] of Object.entries(cases)) {
    const from = ['a reassignment', 'a helper call', 'a regular expression with an escaped /*', 'a template'].includes(k) ? before[k] : base;
    assert.equal(cls(from, after), 'breaking', k);
  }
  assert.equal(cls(base, '/* unclosed'), 'breaking', 'unparsed counts as breaking');
  // A wholly new test file only adds assertions (copy PR 696, t53-layer.test.mjs).
  assert.deepEqual(classifyTestChange(null, base, ['R3']), { class: 'additive', why: 'added: a new test file only adds assertions' });
  assert.equal(cls(base, null), 'breaking', 'removed');
});

test('tokens: a regular expression is one token, a division is not', () => {
  assert.deepEqual(tokens('x = a / b / c; y = /a\\/*b/g;'), ['x', '=', 'a', '/', 'b', '/', 'c', ';', 'y', '=', '/a\\/*b/g', ';']);
});

// The final rule's cold review (PR 193): each of these read as none or additive.
test('breaking: an id in a value, a method named test, an override, a call\'s argument, a block, destructuring', () => {
  const pairs = [
    ["assert.deepEqual(f(), { code: 'R2' });", "assert.deepEqual(f(), { code: 'R3' });"],
    ["assert.ok(re.test('2024-01-01'));", "assert.ok(re.test('garbage'));"],
    ["const e = { status: 'ok' };", "const e = { status: 'ok', status: 'error' };"],
    ['const e = { ...base };', "const e = { ...base, status: 'error' };"],
    ['f(x, { strict: false });', "f(x, { strict: false, mode: 'v2' });"],
    ['t(() => { assert.equal(f(),1); });', 't(() => { x: 0; globalThis.MODE = 2; y: 1, assert.equal(f(),1); });'],
    ['const { a } = o;', 'const { a, b: a2 } = o;'],
    ['assert.deepEqual(f({ a: 1 }), { b: 2 });', 'assert.deepEqual(f({ a: 1, c: 3 }), { b: 2 });'],
  ];
  for (const [a, b] of pairs) assert.equal(cls(a, b), 'breaking', b);
});

test('additive: an assertion\'s expected object, an expect().toEqual, a fixture\'s rows or nested value', () => {
  const pairs = [
    ['assert.deepEqual(f(), { b: 2 });', 'assert.deepEqual(f(), { b: 2, c: 3 });'],
    ['expect(f()).toEqual({ b: 2 });', 'expect(f()).toEqual({ b: 2, c: null });'],
    ['const rows = [{ id: 1 }, { id: 2 }];', 'const rows = [{ id: 1, p: null }, { id: 2, p: null }];'],
    ['const e = { a: { b: 1 } };', 'const e = { a: { b: 1, c: 2 } };'],
  ];
  for (const [a, b] of pairs) assert.equal(cls(a, b), 'additive', b);
});
