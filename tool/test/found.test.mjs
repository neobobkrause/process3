// The route for work found elsewhere (found <module>, 4 Nov): the p3dev-l1 walk's findings were
// held in BOB's handoff "until the owning layer opens". A found mark is next work as soon as its
// module is ready by open_by, whatever its layer; one that names no module waits for BOB to name one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { entry, makeRepo, openPassed } from './helpers.mjs';
import { NO_MODULE, addFound, found, foundMarks, nextFound } from '../lib/found.mjs';
import { markedIds } from '../lib/job.mjs';
import { trancheReport } from '../lib/report.mjs';
import { status } from '../lib/status.mjs';
import { git, loadConfig, overCap, requirementMarks } from '../lib/util.mjs';

const quiet = () => {};
const unmet = (n) => Array.from({ length: n }, (_, i) => `- **R${i + 1}** *(not yet met: x)* text`).join('\n') + '\n- **R99** met\n';
const F = (n, src = 'walk p3dev-l1', what = 'founder sign-in answers HTTP 200 without a session') => `- **F${n}** *(not yet met: ${src})* ${what}\n`;
const LAYERS = '| layer | what | modules |\n|---|---|---|\n| 1 | base | base |\n| 2 | open | p2, q2 |\n| 3 | users | u3, x3 |\n| 4 | later | u4, f4 |\n';
const MODULES = { modules: [
  { id: 'base', paths: ['src/base/'], uses: [] },
  { id: 'p2', paths: ['src/p2/'], uses: ['base'] },
  { id: 'q2', paths: ['src/q2/'], uses: ['base'] },
  { id: 'u3', paths: ['src/u3/'], uses: ['q2'] },
  { id: 'u4', paths: ['src/u4/'], uses: ['p2'] }, // p2 has unmet marks: its found work waits
  { id: 'f4', paths: ['src/f4/'], uses: ['base'] }, // base done but for found work: see below
  { id: 'reader', paths: ['src/reader/'], uses: [] }, // no requirement file, not in the layer map
  // x3 has no entry: it waits for its layer.
] };
const FILES = {
  'build/layers.md': LAYERS,
  'build/modules.json': MODULES,
  'build/requirements/base.md': unmet(0),
  'build/requirements/p2.md': unmet(2),
  'build/requirements/q2.md': unmet(0),
  'build/requirements/u3.md': unmet(1),
  'build/requirements/x3.md': unmet(0) + F(1),
  'build/requirements/u4.md': unmet(0) + F(1),
  'build/requirements/f4.md': unmet(0) + F(1, 'deploy p3dev-l1', 'ROLLOUT NOT CONFIRMED on agent-runner'),
};
const repo = (config = {}, files = {}) => {
  const root = makeRepo({ ...FILES, 'process/config.json': { modules_file: 'build/modules.json', ...config }, ...files });
  openPassed(root);
  return root;
};

test('found: BOB\'s plain-PR act adds an unmet found mark to the module\'s requirement file, numbered per module', () => {
  const root = repo({}, { 'build/requirements/q2.md': `${unmet(0)}- **F1** struck: met by PR 9\n${F(2)}` });
  const out = [];
  const r = found(root, 'q2', '  founder sign-in\n answers HTTP 200 without a session ', { from: 'walk p3dev-l1', offline: true, log: (l) => out.push(l) });
  assert.equal(r.mark, 'F3', 'one past the highest F, met or not');
  assert.equal(r.file, 'build/requirements/q2.md');
  assert.equal(r.line, '- **F3** *(not yet met: walk p3dev-l1)* founder sign-in answers HTTP 200 without a session');
  const t = out.join('\n');
  assert.match(t, /found work for q2: F3 in build\/requirements\/q2\.md, the module's requirement file/);
  assert.match(t, /BOB's act, a plain pull request into tranche:\n1\. git switch -c found\/q2-f3 tranche/);
  assert.match(t, /\n {3}- \*\*F3\*\* \*\(not yet met: walk p3dev-l1\)\* founder sign-in/);
  assert.match(t, /merge <that pull request> --plain --no-review "work found elsewhere: one found mark, no code"/);
  // Numbered per module: another module starts at F1.
  assert.equal(found(root, 'base', 'x', { offline: true, log: quiet }).mark, 'F1');
  // --write appends the one line and changes nothing else (the diff merge --plain accepts); the next is F4.
  const before = readFileSync(join(root, 'build/requirements/q2.md'), 'utf8');
  found(root, 'q2', 'second finding', { from: 'walk p3dev-l1', write: true, offline: true, log: quiet });
  const text = readFileSync(join(root, 'build/requirements/q2.md'), 'utf8');
  assert.equal(text, `${before}- **F3** *(not yet met: walk p3dev-l1)* second finding\n`);
  assert.equal(found(root, 'q2', 'third', { offline: true, log: quiet }).mark, 'F4');
  assert.equal(found(root, 'q2', 'third', { offline: true, log: quiet }).line, '- **F4** *(not yet met: found)* third', 'default source');
});

test('found: with origin, two findings for one module before the first merges get two numbers: the checkout\'s copy and found/<module>-f<n> branches count', () => {
  const root = repo();
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  // Printed, then written and pushed on its branch (BOB's steps 1 to 3): the next is F2.
  const one = found(root, 'q2', 'one', { log: quiet });
  assert.equal(one.mark, 'F1');
  const back = git(['symbolic-ref', '-q', '--short', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', one.branch, 'tranche'], { cwd: root });
  found(root, 'q2', 'one', { write: true, log: quiet });
  git(['commit', '-qam', 'found: q2 F1'], { cwd: root });
  git(['push', '-q', 'origin', one.branch], { cwd: root });
  git(['checkout', '-q', back], { cwd: root });
  git(['branch', '-q', '-D', one.branch], { cwd: root });
  assert.equal(found(root, 'q2', 'two', { log: quiet }).mark, 'F2');
  // Written in the checkout (--write), not yet pushed: the next counts it too.
  assert.equal(found(root, 'q2', 'two', { write: true, log: quiet }).mark, 'F2');
  const third = found(root, 'q2', 'three', { write: true, log: quiet });
  assert.equal(third.mark, 'F3');
  assert.equal((readFileSync(join(root, 'build/requirements/q2.md'), 'utf8').match(/\*\*F2\*\*/g) || []).length, 1);
  // Another module's branches do not count.
  assert.equal(found(root, 'base', 'x', { log: quiet }).mark, 'F1');
});

test('found: a module with no requirement file gets a found-work entry; one that names no module goes to no-module; unknown modules and marks in the text are refused', () => {
  const root = repo();
  const out = [];
  const r = found(root, 'reader', 'ROLLOUT NOT CONFIRMED on reader-container', { from: 'deploy p3dev-l1', offline: true, log: (l) => out.push(l) });
  assert.equal(r.file, 'process/found/reader.md');
  assert.equal(r.mark, 'F1');
  assert.match(out.join('\n'), /its found-work entry, since the module has no requirement file \(build\/requirements\/reader\.md\)/);
  const n = found(root, null, 'LOGIN_FAILED: founder sign-in answers HTTP 200 without a session', { from: 'walk p3dev-l1', offline: true, log: quiet });
  assert.equal(n.file, NO_MODULE);
  assert.equal(n.branch, 'found/no-module-f1');
  assert.throws(() => found(root, 'nobody', 'x', { offline: true, log: quiet }), /nobody is not a module on the working tree .*found "<finding>" --from <source>/);
  assert.throws(() => found(root, 'q2', 'see **R2** *(not yet met', { offline: true, log: quiet }), /must not hold a mark/);
  assert.throws(() => found(root, 'q2', 'x', { from: 'walk (l1)', offline: true, log: quiet }), /parentheses/);
  assert.throws(() => found(root, 'q2', ' ', { offline: true, log: quiet }), /the finding must be text/);
});

test('found marks: parsed as unmet marks by the job and the cap, read back with their source', () => {
  const t = `${unmet(1)}${F(2)}- **F1** met\n`;
  assert.deepEqual(markedIds(t), ['R1', 'F2']);
  // The shared parser (util's requirementMarks) reads found marks, a parenthetical before the mark included.
  assert.deepEqual(requirementMarks('- **F4** (walk p3dev-l1) *(not yet met: walk)* x\n- **F3** met\n'), { all: ['F4', 'F3'], unmet: ['F4'] });
  assert.equal(nextFound(t), 3);
  assert.deepEqual(foundMarks(t), [{ id: 'F2', source: 'walk p3dev-l1', finding: 'founder sign-in answers HTTP 200 without a session' }]);
  assert.match(overCap({ requirements_cap: null, requirements_cap_marks: 1 }, 'f.md', t) || '', /2 unmet marks/);
  assert.equal(addFound(null, '- **F1** x', 'Found work for r'), '# Found work for r\n\n- **F1** x\n');
  assert.equal(addFound('# a\n', '- **F1** x', 't'), '# a\n- **F1** x\n');
  assert.throws(() => addFound('# a', '- **F1** x', 't'), /does not end in a newline/);
});

test('status: found work is next work as soon as its module is ready by open_by uses, whatever its layer, marked found; it never reopens or holds a layer', () => {
  // base (layer 1, closed with no unmet requirement marks) gets a walk finding; layer 2 is open.
  const root = repo({}, {
    'build/requirements/base.md': unmet(0) + F(1),
    'process/found/reader.md': `# Found work for reader\n\n## Found work\n\n${F(1, 'deploy p3dev-l1', 'ROLLOUT NOT CONFIRMED on reader-container')}`,
    [NO_MODULE]: `# Found work that names no module\n\n## Found work\n\n${F(1, 'walk p3dev-l1', 'LOGIN_FAILED')}`,
  });
  const out = [];
  const r = status(root, { role: 'bob', offline: true, log: (m) => out.push(m) });
  assert.equal(r.layer.cur.n, 2, 'a found mark does not reopen a closed layer');
  const t = out.join('\n');
  assert.match(t, /next work, layer 2 .*\n- build\/requirements\/p2\.md: 2 \(layer 2\)\n/);
  // u3 (layer 3) is ready by its uses: owed to its layer, never started early (the coordinator's ruling, 6 Nov).
  assert.match(t, /owed to their own layers [^\n]*:\n- build\/requirements\/u3\.md: 1 \(layer 3\): owed to layer 3\n/);
  assert.match(t, /found work \(work found elsewhere, ready by open_by uses, whatever its layer;[^\n]*: all 2 listed\n/);
  assert.match(t, /\n- build\/requirements\/base\.md: 1 \(layer 1\); found F1\n/);
  assert.match(t, /- process\/found\/reader\.md: 1; found F1; no requirement file: BOB gives the module its requirement file and ledger entry/);
  // base has found work, so f4 (uses base) waits; u4 (uses p2, unmet) waits; x3 (no uses) waits for layer 3.
  assert.doesNotMatch(t, /(f4|u4|x3)\.md: /);
  assert.match(t, /found, no module \(process\/found\/no-module\.md; BOB's act: name its module with `node \.process\/tool\/p3\.mjs found <module> "<finding>" --from "<source>"`, deleting its line here in the same pull request\):\n- F1 \(walk p3dev-l1\): LOGIN_FAILED/);
  assert.ok(r.next.some((x) => x.found_no_module === 'F1'), 'BOB\'s act is counted as work');
  assert.deepEqual(r.next.filter((x) => x.found).map((x) => x.file).sort(), ['build/requirements/base.md', 'process/found/reader.md']);
  // base's found work done: f4 (layer 4) is ready by its uses: owed to layer 4, its found mark named.
  const later = repo({}, { 'process/found/reader.md': '# r\n' });
  const o2 = [];
  const r2 = status(later, { role: 'bob', offline: true, log: (m) => o2.push(m) });
  assert.match(o2.join('\n'), /- build\/requirements\/f4\.md: 1 \(layer 4\): owed to layer 4; found F1\n?/);
  assert.equal(r2.layer.cur.n, 2);
  // The open layer closes past found work: q2 with only a found mark does not hold layer 2's close.
  const q = repo({}, { 'build/requirements/p2.md': unmet(0), 'build/requirements/q2.md': unmet(0) + F(1) });
  const r3 = status(q, { role: 'bob', offline: true, log: quiet });
  assert.equal(r3.layer.cur.n, 3, 'layer 2 had no requirement marks: closed, its found work still listed');
  assert.ok(r3.next.some((x) => x.file === 'build/requirements/q2.md' && x.found), 'q2 listed as found work');
});

test('status: open_by layer lists found work of the open and closed layers only; an open job takes it off the list', () => {
  const root = repo({ open_by: 'layer' }, { 'build/requirements/base.md': unmet(0) + F(1) });
  const next = status(root, { role: 'bob', offline: true, log: quiet }).next;
  assert.deepEqual(next.filter((x) => x.found).map((x) => x.file), ['build/requirements/base.md']);
  const busy = repo({}, { 'build/requirements/base.md': unmet(0) + F(1), 'process/ledger/base.json': entry('base', { requirements: 'build/requirements/base.md' }) });
  assert.ok(!status(busy, { role: 'bob', offline: true, log: quiet }).next.some((x) => x.file === 'build/requirements/base.md'));
});

test('report tranche: found work in the record is counted, per module and with no module', () => {
  const root = makeRepo({ ...FILES, 'process/config.json': { modules_file: 'build/modules.json' }, [NO_MODULE]: `# n\n\n${F(1)}`, 'process/found/reader.md': `# r\n\n${F(1)}- **F2** met\n` });
  const md = trancheReport(root, loadConfig(root), { now: '2026-11-04T12:00:00Z', io: { merged: () => null } });
  assert.match(md, /## Found work\n/);
  assert.match(md, /Found marks 6; unmet 5;/);
  assert.match(md, /\| reader \| 2 \| F1 \|/);
  assert.match(md, /\| \(no module\) \| 1 \| F1 \|/);
  assert.match(md, /\| f4 \| 1 \| F1 \|/);
});

// Copy, 6 Nov: BOB previewed found op-capabilities (no --write), cut its branch as step 1 printed,
// and the --write run numbered the mark F2; PR 664 renumbered it by hand.
test('found: a preview\'s branch, cut as step 1 prints it with nothing written, is the same mark, local or pushed: the --write run keeps F1', () => {
  const root = repo();
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  const preview = found(root, 'q2', 'one', { log: quiet });
  assert.equal(preview.mark, 'F1');
  git(['switch', '-q', '-c', preview.branch, 'tranche'], { cwd: root });
  assert.equal(found(root, 'q2', 'one', { log: quiet }).mark, 'F1', 'the local branch holds nothing written');
  git(['push', '-q', 'origin', preview.branch], { cwd: root });
  const w = found(root, 'q2', 'one', { write: true, log: quiet });
  assert.deepEqual([w.mark, w.branch], ['F1', preview.branch], 'pushed with nothing written: still the same mark');
  assert.match(readFileSync(join(root, 'build/requirements/q2.md'), 'utf8'), /\*\*F1\*\* \*\(not yet met: [^)]*\)\* one/);
  // Once committed there, it is written: another finding is F2.
  git(['commit', '-qam', 'found: q2 F1'], { cwd: root });
  git(['push', '-q', 'origin', preview.branch], { cwd: root });
  git(['switch', '-q', 'tranche'], { cwd: root });
  assert.equal(found(root, 'q2', 'two', { log: quiet }).mark, 'F2');
});
