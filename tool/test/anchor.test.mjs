// The anchor's reads of a base's config (confirming review of PR 97): a session's history
// cannot choose which "last config" counts, and a plain pull request cannot delete the config.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keyAt, lastConfigAt } from '../lib/anchor.mjs';
import { pinChange } from '../lib/merge.mjs';
import { git } from '../lib/util.mjs';
import { commit, makeRepo, write } from './helpers.mjs';

const repo = { released: () => true, shim: () => null, descends: () => true };

test('a deleted config\'s last one is read along first parents, not in a date order a session sets', () => {
  const root = makeRepo({ 'process/config.json': { lockfiles: [] } });
  const init = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'side'], { cwd: root });
  const env = { ...process.env, GIT_COMMITTER_DATE: '2030-01-01T00:00:00Z' };
  write(root, { 'process/config.json': { approvals: { owner: 'evil' } } });
  git(['commit', '-q', '-am', 'S'], { cwd: root, env });
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['rm', '-q', 'process/config.json'], { cwd: root });
  git(['commit', '-q', '-m', 'del'], { cwd: root });
  // The side branch merged in, resolved to the deletion, dated ahead of everything.
  git(['merge', '-q', '-s', 'ours', '--no-edit', 'side'], { cwd: root, env });
  assert.equal(lastConfigAt(root, 'main'), init);
  assert.match(keyAt(root, lastConfigAt(root, 'main'), 'approvals'), /neobobkrause/);
});

test('a plain pull request that deletes the config needs the owner\'s word', () => {
  const root = makeRepo({ 'process/config.json': {} });
  const mb = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['rm', '-q', 'process/config.json'], { cwd: root });
  git(['commit', '-q', '-m', 'del'], { cwd: root });
  const sha = git(['rev-parse', 'HEAD'], { cwd: root });
  for (const intoMain of [false, true]) {
    assert.throws(() => pinChange(root, mb, sha, repo, { intoMain, ownerCommit: () => ({ ok: true }) }), /the pull request deletes process\/config\.json; that needs the owner's word/);
  }
});

// Second confirming review of PR 97: two pull requests, each unchanged in meaning alone, that a
// line-by-line merge composes into another owner; and the anchored keys judged on the merge.
import { mergedUnanchored, unanchored } from '../lib/anchor.mjs';
import { duplicateKey, loadConfig } from '../lib/util.mjs';

const text = (lines) => `{\n${lines.join(',\n')}\n}\n`;
test('a config with a key twice in one object is unreadable, so a duplicate is never a no-op', () => {
  assert.equal(duplicateKey('{"a":1,"b":{"a":2},"c":[{"a":1},{"a":1}]}'), null);
  assert.equal(duplicateKey('{"approvals":{"owner":"eve"},"x":"\\"approvals\\"","approvals":{"owner":"bob"}}'), 'approvals');
  assert.equal(duplicateKey('{"a":{"o":1,"o":2}}'), 'o');
  const root = makeRepo({ 'process/config.json': text(['"lockfiles": []', '"approvals": {"owner": "bob"}']) });
  const t0 = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'pr1'], { cwd: root });
  write(root, { 'process/config.json': text(['"lockfiles": []', '"approvals": {"owner": "eve"}', '"approvals": {"owner": "bob"}']) });
  git(['commit', '-q', '-am', 'a duplicate above bob'], { cwd: root });
  const pr1 = git(['rev-parse', 'HEAD'], { cwd: root });
  assert.equal(keyAt(root, pr1, 'approvals'), 'unreadable');
  assert.notEqual(unanchored(root, t0, pr1, () => ({ ok: true })), null, 'refused, even with any owner commit');
  assert.throws(() => loadConfig(root, pr1), /appears twice/);
});

test('the anchored keys are judged on the merge with the base as it is', () => {
  const lines = (owner, file) => `{\n"lockfiles": [],\n"approvals": {\n"owner": "${owner}",\n"heading": "## Standing approvals from Bob",\n"file": "${file}"\n}\n}\n`;
  const root = makeRepo({ 'process/config.json': lines('bob', 'CLAUDE.md') });
  const mb = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'head'], { cwd: root });
  write(root, { 'process/config.json': lines('carol', 'CLAUDE.md') });
  git(['commit', '-q', '-am', 'the owner names carol on the tranche'], { cwd: root });
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  // The base unchanged since: the merge holds the head's judged value.
  assert.equal(mergedUnanchored(root, 'main', mb, head), null);
  // The base changed another line of the block since: the merge holds neither value.
  write(root, { 'process/config.json': lines('bob', 'AGENTS.md') });
  git(['commit', '-q', '-am', 'the owner moves the file on main'], { cwd: root });
  assert.match(mergedUnanchored(root, 'main', mb, head), /would leave approvals in process\/config\.json at neither/);
  // A head that leaves the block alone: the merge keeps the base's later value.
  git(['checkout', '-q', '-b', 'other', mb], { cwd: root });
  const other = commit(root, { 'x.txt': 'x' });
  assert.equal(mergedUnanchored(root, 'main', mb, other), null);
});

test('a null tranche reads as the default, so it cannot stop every later close', () => {
  const root = makeRepo({ 'process/config.json': { tranche: null } });
  assert.equal(loadConfig(root, 'HEAD').tranche, 'tranche');
  assert.equal(keyAt(root, 'HEAD', 'tranche'), 'tranche');
});

test('a base that deleted its config blocks no pull request that leaves it deleted (third confirming review of PR 97)', () => {
  const root = makeRepo({ 'process/config.json': { approvals: { owner: 'carol' } } });
  git(['checkout', '-q', '-b', 'pr'], { cwd: root });
  const head = commit(root, { 'x.txt': 'x' });
  git(['checkout', '-q', 'main'], { cwd: root });
  const mb = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['rm', '-q', 'process/config.json'], { cwd: root });
  git(['commit', '-q', '-m', 'the owner deletes the config'], { cwd: root });
  assert.equal(mergedUnanchored(root, 'main', mb, head), null);
});

import { recordCheck } from '../lib/record.mjs';
import { configOf } from '../lib/util.mjs';
test('the record check flags a change to a config whose parent had a duplicate key (third confirming review of PR 97)', () => {
  const dup = (o) => `{"approvals": {"owner": "x"}, "approvals": {"owner": "${o}"}}\n`;
  const root = makeRepo({ 'process/config.json': dup('neobobkrause') });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const head = commit(root, { 'process/config.json': dup('eve') }, 'a session names eve');
  const no = () => ({ author: { login: 'acmewidget' }, committer: { login: 'acmewidget' }, commit: { verification: { verified: false } } });
  const f = recordCheck(root, { ...configOf({}), max_file_bytes: 1e6 }, { base, head, lookup: no }).findings;
  assert.ok(f.some((x) => x.check === 'approvals'), JSON.stringify(f));
});
