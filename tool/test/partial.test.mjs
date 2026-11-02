// A blobless (partial) clone, as the product shims check out (Bob's decision 3A, 2 Nov 2026):
// "absent" is told from "could not fetch", and a failed fetch is red, never a pass.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { recordCheck } from '../lib/record.mjs';
import { DEFAULTS, exists, git, loadConfig } from '../lib/util.mjs';
import { commit, makeRepo } from './helpers.mjs';

function partialClone() {
  const src = makeRepo({ 'README.md': 'x', 'process/config.json': { max_file_bytes: 100 } });
  const base = git(['rev-parse', 'HEAD'], { cwd: src });
  commit(src, { 'big.bin': 'y'.repeat(120), 'process/config.json': { max_file_bytes: 100, transient: ['tmp/'] } });
  git(['config', 'uploadpack.allowFilter', 'true'], { cwd: src });
  git(['config', 'uploadpack.allowAnySHA1InWant', 'true'], { cwd: src });
  const dir = join(mkdtempSync(join(tmpdir(), 'p3-partial-')), 'clone');
  git(['clone', '-q', '--no-checkout', '--filter=blob:none', `file://${src}`, dir], { cwd: src });
  return { dir, base, head: git(['rev-parse', 'HEAD'], { cwd: dir }) };
}

test('exists reads the tree alone, so it needs no fetch', () => {
  const { dir, head } = partialClone();
  git(['remote', 'set-url', 'origin', 'file:///nonexistent/repo.git'], { cwd: dir });
  assert.equal(exists(dir, head, 'process/config.json'), true);
  assert.equal(exists(dir, head, 'nope.txt'), false);
});

test('with the remote gone, reading a config that exists fails instead of falling back to defaults', () => {
  const { dir, head } = partialClone();
  git(['remote', 'set-url', 'origin', 'file:///nonexistent/repo.git'], { cwd: dir });
  assert.throws(() => loadConfig(dir, head), /failed/);
});

test('the record check fetches its range in one request and finds what a full clone finds', () => {
  const { dir, base, head } = partialClone();
  const cfg = loadConfig(dir, base);
  const { findings } = recordCheck(dir, cfg, { base, head, lookup: () => ({}) });
  assert.deepEqual(findings.map((f) => f.file), ['big.bin']);
});

test('with the remote gone, the record check reports the commit it could not read', () => {
  const { dir, base, head } = partialClone();
  git(['remote', 'set-url', 'origin', 'file:///nonexistent/repo.git'], { cwd: dir });
  const { findings } = recordCheck(dir, { ...DEFAULTS, max_file_bytes: 100 }, { base, head, lookup: () => ({}) });
  assert.ok(findings.some((f) => /could not be checked/.test(f.message)));
});
