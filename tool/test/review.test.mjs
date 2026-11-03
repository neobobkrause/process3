import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requirementIds, reviewBrief } from '../lib/review.mjs';
import { makeRepo } from './helpers.mjs';

const quiet = () => {};
const io = (head, files, contents = {}) => ({
  slug: 'o/r',
  read: (_s, n) => ({ number: Number(n), title: 'T', base: { ref: 'tranche' }, head: { ref: head, sha: 'abc1234567890' } }),
  files: () => files,
  contents: (_s, path) => contents[path] ?? null,
});

test('review brief: a job pull request names its requirement ids, a plain one its scope, in order', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  const text = reviewBrief(root, '7', { log: quiet, io: io('job/alpha', ['src/alpha/a.mjs'], {
    'process/ledger/alpha.json': { requirements: 'req/alpha.md' },
    'req/alpha.md': '# alpha\n\n- ALP-1 does a thing.\nALP-2 another; not GAT-9 here.\n',
  }) });
  assert.match(text, /module `alpha`; requirements in `req\/alpha.md`: ALP-1, ALP-2\./);
  const order = ['## Priorities', '## You are read-only', '## Threat model', '## Scope', '## Owner-only files', '## Pins', '## Output', '## Rounds'];
  const at = order.map((h) => text.indexOf(h));
  assert.deepEqual([...at].sort((x, y) => x - y), at);
  assert.ok(at.every((i) => i >= 0));
  assert.match(text, /no second review/);
  const plain = reviewBrief(root, '8', { scope: 'the brief only', log: quiet, io: io('build/x', ['tool/lib/merge.mjs']) });
  assert.match(plain, /Scope: the brief only/);
  assert.doesNotMatch(plain, /A job, module/);
  assert.match(plain, /second review: this change touches tool\/lib\/merge\.mjs/);
  assert.deepEqual(requirementIds('R1 does.\n* **R2** too\n'), ['R1', 'R2']);
});
