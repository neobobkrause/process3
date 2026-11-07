// No test reads the machine's git configuration (C2, the coordinator, 7 Nov): every test file
// imports helpers.mjs, which cuts the global and system files off for the process and every git it
// starts, so a test that passes here passes in CI, which has neither.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import './helpers.mjs';
import { git } from '../lib/util.mjs';

const here = dirname(fileURLToPath(import.meta.url));

test('every test file imports helpers.mjs, so none reads the machine\'s git configuration', () => {
  // An import statement at a line's start, either quote; a commented-out one does not count.
  const imports = (t) => /^import\s+(?:[^'"\n]*\s+from\s+)?['"]\.\/helpers\.mjs['"]/m.test(t);
  const bare = readdirSync(here).filter((f) => f.endsWith('.test.mjs')).filter((f) => !imports(readFileSync(join(here, f), 'utf8')));
  assert.deepEqual(bare, []);
});

test('the global and system git configuration are cut off for the tests and the gits they start', () => {
  assert.equal(process.env.GIT_CONFIG_GLOBAL, '/dev/null');
  assert.equal(process.env.GIT_CONFIG_NOSYSTEM, '1');
  assert.equal(git(['config', '--global', '--list'], { cwd: here, allowFail: true }).stdout.trim(), '');
  assert.deepEqual(Object.keys(process.env).filter((k) => /^GIT_CONFIG_(COUNT|KEY_|VALUE_|PARAMETERS)|^GIT_(AUTHOR|COMMITTER)_/.test(k)), [], 'no configuration or identity from the environment');
});
