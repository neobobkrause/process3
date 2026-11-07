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
  const bare = readdirSync(here).filter((f) => f.endsWith('.test.mjs')).filter((f) => !/from '\.\/helpers\.mjs'|import '\.\/helpers\.mjs'/.test(readFileSync(join(here, f), 'utf8')));
  assert.deepEqual(bare, []);
});

test('the global and system git configuration are cut off for the tests and the gits they start', () => {
  assert.equal(process.env.GIT_CONFIG_GLOBAL, '/dev/null');
  assert.equal(process.env.GIT_CONFIG_NOSYSTEM, '1');
  assert.equal(git(['config', '--global', '--list'], { cwd: here, allowFail: true }).stdout.trim(), '');
});
