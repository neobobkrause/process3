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
import { outstanding } from '../lib/layerflow.mjs';

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
  assert.throws(() => git(['merge-base', 'origin/main', 'origin/layer/1'], { cwd: c, deepen: true }), /this clone is shallow and its history for a merge base of origin\/main origin\/layer\/1 lies past its cut; that history could not be fetched \(git fetch: /);
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
    for (const m of t.matchAll(/git\(\s*\[\s*(?:'-C'\s*,[^,]+,\s*)?['"]merge-base['"](?!\s*,\s*['"]--is-ancestor)/g)) {
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

// An is-ancestor never answers no from the cut alone (C8, the coordinator, 7 Nov: in a --depth 1 copy
// clone `layer status 9` read 8 modules as rescheduled; outstanding() asked whether each user's land
// holds its provider's land, and the provider's land lay behind the cut). util.git settles every
// is-ancestor in a shallow clone: its no stands only when exact, else the clone deepens until it is.
function landedPair() {
  const root = makeRepo({ 'p.txt': '0\n' });
  commit(root, { 'p.txt': '1\n' }, 'provider land');
  const P = git(['rev-parse', 'HEAD'], { cwd: root });
  for (let i = 1; i <= 5; i++) commit(root, { 'o.txt': `${i}\n` }, `other ${i}`);
  commit(root, { 'u.txt': '1\n' }, 'user land');
  const L = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'side', 'HEAD~3'], { cwd: root });
  commit(root, { 's.txt': '1\n' }, 'side');
  const S = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['clone', '-q', '--bare', root, bare], { cwd: root });
  const c = join(mkdtempSync(join(tmpdir(), 'p3-shallow-')), 'c');
  git(['clone', '-q', '--depth', '1', '--no-single-branch', `file://${bare}`, c], { cwd: root });
  return { c, P, L, S, bare };
}
const anc = (c) => (a, b) => git(['merge-base', '--is-ancestor', a, b], { cwd: c, allowFail: true }).code === 0;

test('in a --depth 1 clone, a provider land behind the cut is no reschedule outstanding: the clone deepens to answer', () => {
  const { c, P, L } = landedPair();
  assert.equal(git(['cat-file', '-e', `${P}^{commit}`], { cwd: c, allowFail: true }).code === 0, false, 'the provider land is behind the cut');
  const r = [{ user: 'u', provider: 'p', provider_land: P }];
  assert.deepEqual(outstanding(r, [{ module: 'u', head: L }], 'u', anc(c)), []);
  assert.equal(git(['config', '--get', 'p3.deep'], { cwd: c }), 'true');
});

test('in a shallow clone, an ancestor present but reached only past the cut answers yes', () => {
  const { c, P, L } = landedPair();
  git(['fetch', '-q', '--depth', '1', 'origin', P], { cwd: c });  // P present, as its own cut
  assert.equal(anc(c)(P, L), true);
});

test('in a shallow clone, a true no stays no once exact', () => {
  const { c, S, L } = landedPair();
  assert.equal(anc(c)(S, L), false);
  assert.equal(anc(c)(L, 'origin/side'), false);
});

test('in a shallow clone, an is-ancestor whose history cannot be fetched refuses, allowFail or not, never answering no', () => {
  const { c, P, L } = landedPair();
  git(['remote', 'set-url', 'origin', join(tmpdir(), 'p3-no-such-origin.git')], { cwd: c });
  assert.throws(() => anc(c)(P, L), /this clone is shallow and lacks [0-9a-f]{40}, which could not be fetched .*nothing was answered/);
});

test('an is-ancestor of a name the clone cannot resolve is left to git, no deepening', () => {
  const { c, L } = landedPair();
  assert.equal(anc(c)('refs/heads/no-such', L), false);
  assert.equal(anc(c)(L, 'refs/remotes/origin/no-such'), false);
  assert.equal(git(['config', '--get', 'p3.deep'], { cwd: c, allowFail: true }).code === 0, false, 'not deepened');
});

test('a full sha origin does not serve is fetched by itself, not by unshallowing: git\'s answer stands', () => {
  const { c, L } = landedPair();
  const r = git(['merge-base', '--is-ancestor', '0123456789abcdef0123456789abcdef01234567', L], { cwd: c, allowFail: true });
  assert.equal(r.code, 128, 'still absent: git\'s own answer');
  assert.equal(isShallow(c), true, 'not unshallowed');
});

test('an ancestor the clone holds but reaches only past the cut, with origin unreachable, refuses', () => {
  const { c, P, L } = landedPair();
  git(['fetch', '-q', '--depth', '1', 'origin', P], { cwd: c });
  git(['remote', 'set-url', 'origin', join(tmpdir(), 'p3-no-such-origin.git')], { cwd: c });
  assert.throws(() => anc(c)(P, L), /cannot tell whether .* holds .* without more history; that history could not be fetched/);
});

test('an origin itself shallow ends the deepening with a refusal, never a loop and never a no', { timeout: 60000 }, () => {
  const { S, L, bare } = landedPair();
  const tmp = mkdtempSync(join(tmpdir(), 'p3-shorigin-'));
  const src = join(tmp, 'src.git');  // origin holds each branch's last 2 commits: main's walk from L meets its cut
  git(['clone', '-q', '--bare', '--depth', '2', '--no-single-branch', `file://${bare}`, src], { cwd: tmp });
  const c = join(tmp, 'c');
  git(['clone', '-q', '--depth', '1', '--no-single-branch', `file://${src}`, c], { cwd: tmp });
  assert.throws(() => anc(c)(S, L), /cannot tell whether .* holds .* without more history: origin holds no more of it/);
});
