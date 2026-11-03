import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRepo, entry } from './helpers.mjs';
import { status } from '../lib/status.mjs';

const unmet = (n) => Array.from({ length: n }, (_, i) => `- **R${i + 1}** *(not yet met: x)* text`).join('\n') + '\n- **R99** met\n';

test('status --role bob lists next work: unmet requirement files with no open job, fewest first', () => {
  const root = makeRepo({
    'build/requirements/README.md': unmet(1),
    'build/requirements/big.md': unmet(5),
    'build/requirements/small.md': unmet(2),
    'build/requirements/done.md': unmet(0),
    'build/requirements/busy.md': unmet(1),
    'process/ledger/busy.json': entry('busy', { requirements: 'build/requirements/busy.md' }),
  });
  const out = [];
  const r = status(root, { role: 'bob', offline: true, log: (m) => out.push(m) });
  assert.deepEqual(r.next.map((x) => [x.file, x.count]), [['build/requirements/small.md', 2], ['build/requirements/big.md', 5]]);
  assert.match(out.join('\n'), /next work \(1 of 2 jobs open; BOB chooses from these/);
  const full = makeRepo({
    'process/config.json': { jobs_at_once: 1 },
    'build/requirements/small.md': unmet(2),
    'process/ledger/busy.json': entry('busy'),
  });
  const quiet = [];
  assert.deepEqual(status(full, { role: 'bob', offline: true, log: (m) => quiet.push(m) }).next, []);
  assert.doesNotMatch(quiet.join('\n'), /next work/);
});
