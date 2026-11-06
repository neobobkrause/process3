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

// Copy PR 632 (publication): `pixels_sha256: null` added to a fixture inside a test's body read as
// "added code that is not an object property": the climb went into the try block around it.
test('a key added to a fixture inside a test body is additive; an override or a key in a block is not', () => {
  const t = (x) => `test('R3', async () => {\n  try {\n    const old = { sha256: "t", capture_sha: null${x} };\n    assert.deepEqual(f(), [old]);\n  } finally {}\n});\n`;
  assert.deepEqual(classifyTestChange(t(''), t(', pixels_sha256: null'), ['R3']), { class: 'additive', why: 'added pixels_sha256' });
  assert.equal(cls(t(''), t(', sha256: "u"')), 'breaking', 'an override');
  const blk = "test('R3', () => {\n  if (x) {\n    run(1);\n  }\n});\n";
  assert.equal(cls(blk, blk.replace('run(1);', 'run(1);\n    q: 1,')), 'breaking', 'a label in a block is no property');
});

// Cold review of the fixture-root fix: inside a test's body only a fixture used solely as an
// assertion's expected value counts; an added value holds plain data only (no call, await, new or
// assignment); `const {` is destructuring.
test('a body fixture that is an input, a value with a call or an assignment, is breaking', () => {
  const body = (decl, use) => `test('R3', async () => {\n  try {\n    ${decl}\n    ${use}\n  } finally {}\n});\n`;
  const pair = (a, b, use) => cls(body(a, use), body(b, use));
  assert.equal(pair('const old = { a: 1 };', 'const old = { a: 1, b: null };', 'assert.deepEqual(f(), [old], "m");'), 'additive');
  assert.equal(pair('const input = { a: 1 };', 'const input = { a: 1, strict: true };', 'assert.deepEqual(f(input), 2);'), 'breaking', 'an input');
  assert.equal(pair('const out = { a: 1 };', 'const out = { a: 1, b: await g(2) };', 'assert.deepEqual(g(), out);'), 'breaking', 'await and a call');
  assert.equal(pair('const out = { a: 1 };', 'const out = { a: 1, c: assert.equal(f(), 3) };', 'assert.deepEqual(g(), out);'), 'breaking', 'an assertion in a value');
  assert.equal(pair('const out = { a: 1 };', 'const out = { a: 1, c: globalThis.mode = 2 };', 'assert.deepEqual(g(), out);'), 'breaking', 'an assignment');
  assert.equal(pair('const out = { a: 1 };', 'const out = { a: 1, c: new Date(0) };', 'assert.deepEqual(g(), out);'), 'breaking', 'a construction');
  assert.equal(cls('const exp = { a: 1 };\n', 'const exp = { a: 1, b: f() };\n'), 'breaking', 'a call at the top level too');
});
