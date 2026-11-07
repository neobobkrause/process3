// Every merge base the tool reads is read on history that holds it (C8, the coordinator, 7 Nov:
// BOB's layer lands failed in a shallow checkout, where the train had deepened and the layer flow
// did not). util.git({ deepen: true }) deepens a shallow clone until the commits meet; every
// merge-base in the tool asks it, but those of the modules named below, each for its reason.
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { commit, makeRepo } from './helpers.mjs';
import { git, isShallow } from '../lib/util.mjs';

const here = dirname(fileURLToPath(import.meta.url));

function shallowPair() {
  const root = makeRepo({ 'a.txt': '0\n' });
  for (let i = 1; i <= 6; i++) commit(root, { 'a.txt': `${i}\n` }, `main ${i}`);
  git(['checkout', '-q', '-b', 'layer/1', 'HEAD~4'], { cwd: root });
  for (let i = 1; i <= 3; i++) commit(root, { 'b.txt': `${i}\n` }, `layer ${i}`);
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['clone', '-q', '--bare', root, bare], { cwd: root });
  const c = join(mkdtempSync(join(tmpdir(), 'p3-shallow-')), 'c');
  git(['clone', '-q', '--depth', '1', '--no-single-branch', `file://${bare}`, c], { cwd: root });
  return c;
}

test('a merge base asked in a shallow clone deepens it until the commits meet; is-ancestor answers on the history', () => {
  const c = shallowPair();
  assert.equal(isShallow(c), true);
  // A plain git (not the tool's) finds no base at depth 1.
  const plain = git(['rev-parse', 'origin/layer/1'], { cwd: c });
  assert.ok(plain);
  assert.notEqual(git(['merge-base', 'origin/main', 'origin/layer/1'], { cwd: c, allowFail: true }).code, 0, 'without deepen: no base');
  const mb = git(['merge-base', 'origin/main', 'origin/layer/1'], { cwd: c, allowFail: true, deepen: true });
  assert.equal(mb.code, 0, mb.stderr);
  assert.equal(git(['log', '-1', '--format=%s', mb.stdout.trim()], { cwd: c }), 'main 2');
  assert.equal(git(['merge-base', '--is-ancestor', mb.stdout.trim(), 'origin/main'], { cwd: c, allowFail: true, deepen: true }).code, 0);
});

test('a merge base of a commit the clone lacks is left to git\'s own answer, no deepening', () => {
  const c = shallowPair();
  const r = git(['merge-base', 'origin/main', '0123456789abcdef0123456789abcdef01234567'], { cwd: c, allowFail: true, deepen: true });
  assert.notEqual(r.code, 0);
  assert.equal(isShallow(c), true, 'still shallow');
});

// The modules that do not ask, each for its reason.
const OWN = {
  'merge.mjs': 'deepens by its own measure: GitHub\'s compare, then once whole (deepenToBase)',
  'job.mjs': 'deepens by its own measure (deepenUntil, shallowBase)',
  'report.mjs': 'deepens by its own measure (report tranche)',
  'measures.mjs': 'fetches whole history first (--unshallow)',
  'record.mjs': 'deepens by its own measure (the record check)',
  'gate.mjs': 'runs in CI, on a checkout with the whole history',
  'status.mjs': 'a read: "not yet on main" is the safe answer, and a status line never unshallows BOB\'s clone',
  'ends.mjs': 'a read: an unproven end keeps the record, the safe side',
  'metrics.mjs': 'a read of a merge already in the branch it reads',
  'util.mjs': 'the helper itself',
};
test('every merge-base in the tool asks util.git to deepen, or its module is named with its reason', () => {
  const lib = join(here, '..', 'lib');
  const loose = [...readdirSync(lib).map((f) => join(lib, f)), join(here, '..', 'p3.mjs')].filter((f) => f.endsWith('.mjs') && !OWN[f.split('/').pop()])
    .flatMap((f) => readFileSync(f, 'utf8').split('\n').map((l, i) => ({ f, i: i + 1, l })))
    .filter(({ l }) => /git\(\['merge-base'/.test(l) && !/deepen: true/.test(l));
  assert.deepEqual(loose.map((x) => `${x.f.split('/').slice(-2).join('/')}:${x.i}`), []);
});

test('no tool code runs merge-base outside util.git', () => {
  const lib = join(here, '..', 'lib');
  const bad = [...readdirSync(lib).map((f) => join(lib, f)), join(here, '..', 'p3.mjs')].filter((f) => f.endsWith('.mjs'))
    .flatMap((f) => readFileSync(f, 'utf8').split('\n').map((l, i) => ({ f, i: i + 1, l })))
    .filter(({ l, f }) => /merge-base/.test(l) && /(run|spawnSync|execFileSync|spawn)\(\s*'git'/.test(l) && !f.endsWith('util.mjs'));
  assert.deepEqual(bad.map((x) => `${x.f}:${x.i}`), []);
});
