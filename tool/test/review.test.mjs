import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RECEIPT, block } from '../lib/github.mjs';
import { requirementIds, reviewBrief } from '../lib/review.mjs';
import { makeRepo } from './helpers.mjs';

const quiet = () => {};
const io = (head, files, contents = {}) => ({
  slug: 'o/r',
  read: (_s, n) => ({ number: Number(n), title: 'T', base: { ref: 'tranche' }, head: { ref: head, sha: 'abc1234567890' } }),
  files: () => files,
  contents: (_s, path) => contents[path] ?? null,
  notes: () => [],
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
  assert.deepEqual(requirementIds('R1 does.\n* **R2** too\n1. GAT-5 x\n| GAT-6 | y |\n'), ['R1', 'R2', 'GAT-5', 'GAT-6']);
});

test('review brief lists each struck requirement with the test its receipt names, from the opener only', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  const receipt = block(RECEIPT, { tests: [{ req: 'R1', file: 'test/alpha/x.test.mjs', name: 'R1 x' }] });
  const base = io('job/alpha', ['src/alpha/a.mjs'], { 'process/ledger/alpha.json': { requirements: 'req/alpha.md' }, 'req/alpha.md': '- **R1** x\n' });
  const read = (_s, n) => ({ ...base.read(_s, n), user: { login: 'job' } });
  const text = reviewBrief(root, '7', { log: quiet, io: { ...base, read, notes: () => [{ body: receipt, user: { login: 'job' } }] } });
  assert.match(text, /- R1: `test\/alpha\/x.test.mjs` :: "R1 x"/);
  assert.match(text, /asserts that requirement at the module's interface/);
  const other = reviewBrief(root, '7', { log: quiet, io: { ...base, read, notes: () => [{ body: receipt, user: { login: 'someone' } }] } });
  assert.match(other, /No receipt is posted yet/);
});
