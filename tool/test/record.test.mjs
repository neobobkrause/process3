import assert from 'node:assert/strict';
import { test } from 'node:test';
import { approvalsBlock, recordCheck } from '../lib/record.mjs';
import { DEFAULTS, git } from '../lib/util.mjs';
import { commit, makeRepo } from './helpers.mjs';

const H = '## Standing approvals from Bob';
const claude = (words) => `${H}\n\n${words}\n\n## Other\n\nmore\n`;
const cfg = { ...DEFAULTS, max_file_bytes: 100, transient: ['tmp/'] };
const web = () => ({ committer: { login: 'web-flow' }, author: { login: 'neobobkrause' }, commit: { verification: { verified: true } } });
const session = () => ({ committer: { login: 'neobobkrause' }, author: { login: 'neobobkrause' }, commit: { verification: { verified: false } } });

test('the approvals block runs from its heading to the next heading', () => {
  assert.equal(approvalsBlock(claude('may push'), H), `${H}\n\nmay push`);
  assert.equal(approvalsBlock('# nothing here\n', H), '');
});

test('a file over the limit and a transient path are found per commit', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'big.bin': 'y'.repeat(101), 'tmp/state.json': '{}' });
  const { commits, findings } = recordCheck(root, cfg, { base, lookup: session });
  assert.equal(commits, 1);
  assert.deepEqual(findings.map((f) => f.check).sort(), ['path', 'size']);
});

test('the approvals block may change only by the owner through the website', () => {
  const root = makeRepo({ 'CLAUDE.md': claude('may push') });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'CLAUDE.md': claude('may push and merge to main') });
  assert.match(recordCheck(root, cfg, { base, lookup: session }).findings[0].message, /not neobobkrause's own commit/);
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: web }).findings, []);
});

test('edits outside the approvals block pass without a lookup', () => {
  const root = makeRepo({ 'CLAUDE.md': claude('may push') });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'CLAUDE.md': claude('may push').replace('more', 'other words') });
  const never = () => { throw new Error('looked up'); };
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: never }).findings, []);
});

test('removing the block is a change too', () => {
  const root = makeRepo({ 'CLAUDE.md': claude('may push') });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'CLAUDE.md': '# gone\n' });
  assert.equal(recordCheck(root, cfg, { base, lookup: session }).findings[0].check, 'approvals');
});
