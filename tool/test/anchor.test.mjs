// The anchor's reads of a base's config (confirming review of PR 97): a session's history
// cannot choose which "last config" counts, and a plain pull request cannot delete the config.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keyAt, lastConfigAt } from '../lib/anchor.mjs';
import { pinChange } from '../lib/merge.mjs';
import { git } from '../lib/util.mjs';
import { makeRepo, write } from './helpers.mjs';

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
