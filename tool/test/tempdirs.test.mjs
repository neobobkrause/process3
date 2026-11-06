// No test leaves a temporary directory behind (coordinator, 6 Nov: the suite left about 70,000
// p3-* directories in a builder's /tmp and filled its disk; deleting them by hand was refused).
// helpers.mjs removes every directory a test process made at its exit; this holds it: test files
// run in a child with TMPDIR an empty directory, which must be empty again when they end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import './helpers.mjs';

const here = dirname(fileURLToPath(import.meta.url));

test('every test file that makes temporary directories loads the helpers, which remove them', () => {
  const missing = readdirSync(here).filter((f) => f.endsWith('.mjs') && f !== 'helpers.mjs').filter((f) => {
    const t = readFileSync(join(here, f), 'utf8');
    return /mkdtempSync|makeRepo\(/.test(t) && !/from '\.\/helpers\.mjs'|import '\.\/helpers\.mjs'|import\('\.\/helpers\.mjs'\)/.test(t) && !/from '\.\/[\w-]+-fixture\.mjs'/.test(t);
  });
  assert.deepEqual(missing, []);
});

test('a test run leaves no directory in the temp directory', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'p3-guard-'));
  try {
    // Files that make repositories, origins, clones, state worktrees and fixtures' temp dirs.
    const files = ['hold.test.mjs', 'census.test.mjs', 'self-ending.test.mjs', 'merge.test.mjs'].map((f) => join(here, f));
    const r = spawnSync(process.execPath, ['--test', ...files], { env: { ...process.env, TMPDIR: tmp, NODE_TEST_CONTEXT: undefined }, encoding: 'utf8', timeout: 240000 });
    assert.equal(r.status, 0, (r.stdout || '').split('\n').filter((l) => /^not ok|# fail/.test(l)).join('\n') || r.stderr);
    const left = readdirSync(tmp);
    assert.deepEqual(left, [], `left behind: ${left.slice(0, 10).join(', ')}${left.length > 10 ? ` and ${left.length - 10} more` : ''}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
