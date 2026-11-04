import assert from 'node:assert/strict';
import { test } from 'node:test';
import { surfaceOf } from '../lib/exports.mjs';

const surface = (files, entry) => Object.fromEntries(surfaceOf((f) => files[f] ?? null, entry, (f) => f.startsWith('p/')));

// Review of PR 82: a class built in layers inherits the methods of a base in the same file,
// exported or not, declared before or after it, and through a re-export.
test('a class inherits the methods of a base in its own file, exported or not, before or after, and through export from', () => {
  assert.deepEqual(surface({ 'p/a.mjs': 'class Base { a(x) {} }\nexport class S extends Base { c() {} }\n' }, 'p/a.mjs'),
    { S: 'class', 'S.a': '(x)', 'S.c': '()' });
  assert.deepEqual(surface({ 'p/a.mjs': 'export class S extends Base { c() {} }\nexport class Base { a(x) {} }\n' }, 'p/a.mjs'),
    { S: 'class', 'S.a': '(x)', 'S.c': '()', Base: 'class', 'Base.a': '(x)' });
  assert.deepEqual(surface({ 'p/a.mjs': 'class Base { a(x) {} }\nclass S extends Base {}\nexport { S };\n' }, 'p/a.mjs'),
    { S: 'class', 'S.a': '(x)' });
  assert.deepEqual(surface({
    'p/index.mjs': "export { Q as AiAccounts } from './core.mjs';\n",
    'p/core.mjs': "import { Layer } from './layer.mjs';\nclass Core extends Layer { b() {} }\nexport class Q extends Core { c(y) {} }\n",
    'p/layer.mjs': 'export class Layer { keySet({ key = null } = {}) {} }\n',
  }, 'p/index.mjs'), { AiAccounts: 'class', 'AiAccounts.keySet': '({ key = null } = {})', 'AiAccounts.b': '()', 'AiAccounts.c': '(y)' });
  // Two classes extending each other: read once, no loop.
  assert.deepEqual(surface({ 'p/a.mjs': 'class A extends B { a() {} }\nclass B extends A { b() {} }\nexport { A };\n' }, 'p/a.mjs'),
    { A: 'class', 'A.a': '()', 'A.b': '()' });
});
