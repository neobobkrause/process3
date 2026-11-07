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
  assert.equal(git(['merge-base', '--is-ancestor', mb.stdout.trim(), 'origin/main'], { cwd: c, allowFail: true, deepen: true }).code, 0);  // Marked deep: the next fetch keeps the history it deepened to (cold review of C8).
  assert.equal(git(['config', '--get', 'p3.deep'], { cwd: c }), 'true');
});

test('a deepen whose fetch fails is said, never left to a merge base failing with no reason', () => {
  const c = shallowPair();
  git(['remote', 'set-url', 'origin', join(tmpdir(), 'p3-no-such-origin.git')], { cwd: c });
  assert.throws(() => git(['merge-base', 'origin/main', 'origin/layer/1'], { cwd: c, deepen: true }), /this clone is shallow and its history for a merge base of origin\/main origin\/layer\/1 could not be fetched \(git fetch: /);
});

test('a merge base of a commit the clone lacks is left to git\'s own answer, no deepening', () => {
  const c = shallowPair();
  const r = git(['merge-base', 'origin/main', '0123456789abcdef0123456789abcdef01234567'], { cwd: c, allowFail: true, deepen: true });
  assert.notEqual(r.code, 0);
  assert.equal(isShallow(c), true, 'still shallow');
});

// The modules whose merge bases do not ask, each for its reason; a single call elsewhere that does not
// ask carries a `// read: <reason>` comment on its line (cold review of C8: only the layer flow's
// writes deepen; a read must never pull a shallow clone's history).
const OWN = {
  'merge.mjs': 'deepens by its own measure: GitHub\'s compare, then once whole (deepenToBase)',
  'job.mjs': 'deepens by its own measure (deepenUntil, shallowBase)',
  'report.mjs': 'deepens by its own measure (report tranche)',
  'measures.mjs': 'fetches whole history first (--unshallow)',
  'record.mjs': 'deepens by its own measure (the record check)',
  'gate.mjs': 'runs in CI, on a checkout with the whole history',
  'p3.mjs': 'ledger check and record-check run in CI, on the whole history',
  'status.mjs': 'a read: "not yet on main" is the safe answer',
  'ends.mjs': 'a read: an unproven end keeps the record, the safe side',
  'metrics.mjs': 'a read of a merge already in the branch it reads',
  'anchor.mjs': 'a read: a commit not shown in the base is refused, the safe side',
  'found.mjs': 'a read (and offline): an unproven ancestor counts the branch as holding work',
  'notice.mjs': 'runs only in a clone that is not shallow',
  'review.mjs': 'a worker brief\'s read, in the worker\'s own full clone',
  'start.mjs': 'a read: an unproven ancestor is not movable, the safe side',
  'tranche.mjs': 'refuses a shallow clone before it',
  'triage.mjs': 'a read: an unproven ancestor is not settled, so the user stays owed',
  'util.mjs': 'the helper itself',
};
test('every merge-base in the tool asks util.git to deepen, or is a read named with its reason', () => {
  const lib = join(here, '..', 'lib');
  const loose = [];
  for (const f of [...readdirSync(lib).map((x) => join(lib, x)), join(here, '..', 'p3.mjs')].filter((x) => x.endsWith('.mjs') && !OWN[x.split('/').pop()])) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/git\(\s*\[\s*(?:'-C'\s*,[^,]+,\s*)?['"]merge-base['"]/g)) {
      const call = t.slice(m.index, t.indexOf('})', m.index) + 2);
      const line = t.slice(t.lastIndexOf('\n', m.index) + 1, t.indexOf('\n', m.index));
      if (!/deepen: true/.test(call) && !/\/\/ read: \S/.test(line)) loose.push(`${f.split('/').slice(-2).join('/')}:${t.slice(0, m.index).split('\n').length}`);
    }
  }
  assert.deepEqual(loose, []);
});

test('no tool code runs merge-base outside util.git', () => {
  const lib = join(here, '..', 'lib');
  const bad = [...readdirSync(lib).map((f) => join(lib, f)), join(here, '..', 'p3.mjs')].filter((f) => f.endsWith('.mjs'))
    .flatMap((f) => readFileSync(f, 'utf8').split('\n').map((l, i) => ({ f, i: i + 1, l })))
    .filter(({ l, f }) => /merge-base/.test(l) && /(run|spawnSync|execFileSync|spawn)\(\s*'git'/.test(l) && !f.endsWith('util.mjs'));
  assert.deepEqual(bad.map((x) => `${x.f}:${x.i}`), []);
});
