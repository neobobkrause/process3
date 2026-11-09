// A landed pull request GitHub no longer serves (the suspended account's: hidden from its lists, its
// comments with it) is read from what the process recorded: the state branch's land rows and the
// job branch's own ledger (the coordinator, 7 Nov: the remaining landed-PR readers after C13 and PR 735).
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { flowFile } from '../lib/layerbase.mjs';
import { writeRows } from '../lib/layerflow.mjs';
import { landedFrom, landRows } from '../lib/landed.mjs';
import { appendRow, metricsFile } from '../lib/metrics.mjs';
import { git } from '../lib/util.mjs';
import { commit, makeRepo } from './helpers.mjs';

const SB = 'process-state';
function landed() {
  const root = makeRepo({ 'README.md': 'x\n' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'job/c'], { cwd: root });
  commit(root, { 'src/c.mjs': 'export const c = 1;\n' }, 'work');
  // job complete: the complete row in the COMPLETE commit.
  appendRow(root, 'c', { row: 'attempt', event: 'complete', role: 'job', attempt: 2, pr: 696 });
  git(['add', '--', metricsFile('c')], { cwd: root });
  git(['commit', '-q', '-m', 'job complete c (attempt 2)'], { cwd: root });
  const done = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'notes.txt': 'after\n' }, 'a record after');
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['push', '-q', 'origin', 'job/c'], { cwd: root });
  writeRows(root, SB, 'land', [[flowFile(9, 'land', 'c-696-x'), { row: 'land', layer: 9, module: 'c', pr: 696, head, before: 'b', merge: 'm', at: '2026-11-06T19:15:09Z' }]]);
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  return { root, done, head };
}

test('a job branch\'s pull requests: GitHub\'s list, with each land of that branch GitHub no longer lists, marked hidden; unread stays unread', () => {
  const { root, head } = landed();
  assert.equal(landRows(root, SB).length, 1);
  const shown = [{ number: 650, state: 'closed', merged_at: '2026-11-05T00:00:00Z', head: { sha: 'x' } }];
  const all = landedFrom(root, SB, 'c', 'job/c', 'origin/job/c', shown);
  assert.deepEqual(all.map((p) => [p.number, !!p.hidden]), [[650, false], [696, true]]);
  assert.equal(all[1].head.sha, head);
  assert.equal(landedFrom(root, SB, 'c', 'job/c', 'origin/job/c', null), null, 'GitHub unread: never a land row instead');
  assert.deepEqual(landedFrom(root, SB, 'c', 'job/c', 'origin/job/c', [{ number: 696, state: 'closed', merged_at: 'y' }]).map((p) => p.number), [696], 'listed by GitHub: not added twice');
  assert.deepEqual(landedFrom(root, SB, 'd', 'job/c', 'origin/job/c', []), [], 'another module\'s land');
  // The branch deleted once landed: any commit that holds the land's head (the layer tip) stands for it.
  git(['branch', 'layer-tip', 'origin/job/c'], { cwd: root });
  assert.deepEqual(landedFrom(root, SB, 'c', 'job/c', 'layer-tip', []).map((p) => p.number), [696]);
});

// Cold review: a sibling branch of the module (job/c-2, cut from or synced with work that holds job/c's
// land) never takes job/c's land for its own.
test('a land of another job branch of the module is not this branch\'s, by the land row\'s branch or its head\'s start row', () => {
  const { root } = landed();
  git(['checkout', '-q', '-b', 'job/c-2', 'origin/job/c'], { cwd: root });
  appendRow(root, 'c', { row: 'attempt', event: 'start', role: 'job', attempt: 3, branch: 'job/c-2' });
  git(['add', '-A'], { cwd: root });
  git(['commit', '-q', '-m', 'job start c (attempt 3)'], { cwd: root });
  assert.deepEqual(landedFrom(root, SB, 'c', 'job/c-2', 'job/c-2', []), [], 'job/c\'s land, held by job/c-2');
  // A row that names its branch is read by it.
  const h2 = git(['rev-parse', 'HEAD'], { cwd: root });
  writeRows(root, SB, 'land', [[flowFile(9, 'land', 'c-701-y'), { row: 'land', layer: 9, module: 'c', pr: 701, branch: 'job/c-2', head: h2, before: 'b', merge: 'm2', at: '2026-11-07T01:00:00Z' }]]);
  git(['fetch', '-q', 'origin', `+refs/heads/${SB}:refs/remotes/origin/${SB}`], { cwd: root });
  assert.deepEqual(landedFrom(root, SB, 'c', 'job/c-2', 'job/c-2', []).map((p) => p.number), [701]);
});

// Every read of a branch's pull request history goes through landedFrom, so a land GitHub hides is
// still a land; one that does not is named with why.
test('every call of prsFromBranch (or a stand-in for it) goes through landedFrom, or is named with its reason', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const { dirname: dn } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dn(fileURLToPath(import.meta.url));
  const lib = join(here, '..', 'lib');
  const NAMED = { 'layerflow.mjs:const prs = x.prsFromBranch(slug, branch);': 'a sync/<n> branch\'s PRs, opened by the tool: no land rows; an empty list only resumes the tool\'s own merge' };
  const files = [...readdirSync(lib).filter((x) => x.endsWith('.mjs') && x !== 'github.mjs').map((f) => [f, join(lib, f)]), ['p3.mjs', join(here, '..', 'p3.mjs')]];
  const loose = [];
  for (const [f, p] of files) {
    readFileSync(p, 'utf8').split('\n').forEach((l) => {
      // A call: prsFromBranch( or x.prsFromBranch( or a parameter standing for it (prs = prsFromBranch) called as prs(.
      if (!/\bprsFromBranch\(|\bprs\(/.test(l) || /^\s*\/\//.test(l) || /landedFrom\(/.test(l)) return;
      if (!NAMED[`${f}:${l.trim()}`]) loose.push(`${f}: ${l.trim()}`);
    });
  }
  assert.deepEqual(loose, []);
});
