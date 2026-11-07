// Fewer reads of the state branch (R17f; coordinator's C12 part 2, 7 Nov: 275 fetches in an hour
// against 16 content-creating calls, most of them the product's state branch, read again by each
// command and each poll): every fetch is labelled with what it reads, in the log and the shares;
// a read that is not fresh takes the clone's copy when another p3 process fetched it within 30 s.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fetchKind, usage, usageRows } from '../lib/pace.mjs';
import { git } from '../lib/util.mjs';
import { makeRepo } from './helpers.mjs';

const LIB = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib');

test('each fetch says what it reads: the ledger, the state branch, or other; the counts are kept by kind', () => {
  assert.equal(fetchKind(['fetch', '-q', 'https://github.com/o/l.git', '+refs/heads/process-state:refs/p3/ledger/state']), 'ledger');
  assert.equal(fetchKind(['ls-remote', 'https://github.com/o/l.git', 'refs/heads/process-state']), 'ledger');
  assert.equal(fetchKind(['fetch', '-q', 'origin', '+refs/heads/process-state:refs/remotes/origin/process-state']), 'state');
  assert.equal(fetchKind(['fetch', '-q', 'origin', 'tranche']), 'other');
  const at = new Date().toISOString();
  const rows = [{ kind: 'fetch', at, of: 'state', session: 's' }, { kind: 'fetch', at, of: 'state', session: 's' }, { kind: 'fetch', at, of: 'ledger', session: 's' }, { kind: 'fetch', at, session: 's' }];
  const root = makeRepo({ 'README.md': 'x\n' });
  const shared = usageRows(root, { rows });
  assert.deepEqual(shared[0].fetches_by, { state: 2, ledger: 1, '?': 1 });
  const u = usage(root, { seconds: 60, rows: [], read: { at: Date.now(), use: shared } });
  assert.deepEqual([u.fetches, u.fetches_by], [4, { state: 2, ledger: 1, '?': 1 }]);
});

test('a read that is not fresh takes the clone\'s copy another process fetched within 30 s; a fresh one always fetches', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'HEAD:refs/heads/process-state'], { cwd: root });
  const log = join(mkdtempSync(join(tmpdir(), 'p3-log-')), 'log.jsonl');
  writeFileSync(log, '');
  // Each read its own p3 process, as each command and each poll is.
  const read = (fresh) => {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', `const { fetchState } = await import(${JSON.stringify(join(LIB, 'state.mjs'))}); console.log(fetchState(${JSON.stringify(root)}, 'process-state', { fresh: ${fresh} }));`], { encoding: 'utf8', env: { ...process.env, P3_GITHUB_LOG: log } });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), 'true');
  };
  const fetches = () => readFileSync(log, 'utf8').split('\n').filter((l) => l.includes('"kind":"fetch"')).length;
  read(false);
  assert.equal(fetches(), 1, 'the first read fetches');
  read(false);
  read(false);
  assert.equal(fetches(), 1, 'within 30 s, the next processes read the clone\'s copy');
  read(true);
  assert.equal(fetches(), 2, 'a fresh read fetches');
  // The window is 30 s from the last fetch.
  const stamp = join(root, '.git', 'p3-state-read-process-state');
  const st = JSON.parse(readFileSync(stamp, 'utf8'));
  writeFileSync(stamp, JSON.stringify({ ...st, at: Date.now() - 31e3 }));
  read(false);
  assert.equal(fetches(), 3, 'past 30 s, fetched');
  // The clone's ref moved by something other than that fetch: fetched.
  git(['update-ref', 'refs/remotes/origin/process-state', git(['commit-tree', '-m', 'x', 'HEAD^{tree}'], { cwd: root })], { cwd: root });
  read(false);
  assert.equal(fetches(), 4, 'the clone\'s ref is not what the fetch left: fetched');
});
