// C41 (Bob, 8 Nov; coordinator's answer to the design note, 8 Nov): a product keeps its
// process-only content under process/, the directory that holds config.json. Paths the tool reads
// resolve through config with today's defaults, so an unmoved product reads as before; layout move
// prints the plan, and with --apply moves the paths and rewrites their keys in one commit.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { layoutHint, layoutMove, layoutPlan, planLines, rewriteConfig } from '../lib/layout.mjs';
import { CONFIG_FILE, DEFAULTS, FOUND_DIR, LEDGER_DIR, METRICS_DIR, git, loadConfig, parseJSON } from '../lib/util.mjs';
import { LEDGER_DIR as LEDGER_RE } from '../lib/ledger.mjs';
import { METRICS_DIR as METRICS_RE } from '../lib/metrics.mjs';
import { FOUND_DIR as FOUND_RE } from '../lib/found.mjs';
import { situationFile } from '../lib/census.mjs';
import { commit, makeRepo } from './helpers.mjs';

const CFG = '{\n  "tranche": "tranche",\n  "modules_file": "build/modules.json",\n  "lanes": [{ "name": "ux", "dir": "docs/ux" }]\n}\n';
const product = (cfgText = CFG, more = {}) => {
  const root = makeRepo({
    [CONFIG_FILE]: cfgText,
    'process/ledger/A.json': '{}\n',
    'build/layers.md': '# Layers\n\n1. A\n',
    'build/situations/job.md': '# Job situation\n',
    'build/modules.json': '{"modules":[]}\n',
    'build/requirements/A.md': '# A\n',
    'build/plan/plan.md': 'plan\n',
    'docs/ux/a.md': 'ux\n',
    ...more,
  });
  git(['checkout', '-q', '-b', 'build/layout'], { cwd: root });
  return root;
};

test('layout (C41): the process subtree is process/, and the record paths are spelled once', () => {
  assert.equal(CONFIG_FILE, 'process/config.json');
  assert.equal(LEDGER_DIR, 'process/ledger');
  assert.equal(METRICS_DIR, 'process/metrics');
  assert.equal(FOUND_DIR, 'process/found');
  assert.equal(LEDGER_RE, LEDGER_DIR);
  assert.equal(METRICS_RE, METRICS_DIR);
  assert.equal(FOUND_RE, FOUND_DIR);
  // Today's defaults: an unmoved product reads as before.
  assert.equal(DEFAULTS.layers_file, 'build/layers.md');
  assert.equal(DEFAULTS.situations_dir, 'build/situations');
  assert.equal(DEFAULTS.requirements_dir, 'build/requirements');
});

test('layout move (C41): the plan moves only what the tool reads as process-only; --also adds more; nothing written', () => {
  const root = product();
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  const plan = layoutPlan(root);
  assert.deepEqual(plan.moves.map((m) => [m.from, m.to, m.key]), [['build/layers.md', 'process/layers.md', 'layers_file'], ['build/situations', 'process/situations', 'situations_dir']]);
  const lines = [];
  const r = layoutMove(root, { log: (l) => lines.push(l) });
  assert.equal(r.applied, false);
  assert.deepEqual(lines, [
    'move build/layers.md -> process/layers.md (process/config.json layers_file)',
    'move build/situations -> process/situations (process/config.json situations_dir)',
    'then, on a branch from tranche: layout move --apply; open its pull request into tranche and land it with the merge tool',
  ]);
  assert.equal(git(['rev-parse', 'HEAD'], { cwd: root }), head);
  assert.equal(git(['status', '--porcelain'], { cwd: root }), '');
  // --also: a plain folder, and a config-named file whose key moves with it (with the gate's note).
  const also = layoutPlan(root, { also: ['build/plan/', './build/modules.json', 'build/nothing'] });
  assert.deepEqual(also.moves.slice(2).map((m) => [m.from, m.to, m.key]), [['build/plan', 'process/plan', null], ['build/modules.json', 'process/modules.json', 'modules_file']]);
  assert.match(also.moves[3].note, /the gate reads build\/modules\.json as a record: a pull request changing only it runs no suite/);
  assert.deepEqual(also.skipped, [{ from: 'build/nothing', why: 'not in this checkout' }]);
});

test('layout move (C41): the requirements, the platform\'s fixed places and a lane\'s folder never move', () => {
  const root = product();
  for (const [p, why] of [
    ['build/requirements', /holds the requirements \(requirements_dir build\/requirements\), the product's own content/],
    ['build/requirements/A.md', /holds the requirements/],
    ['build', /holds the requirements/],
    ['.claude', /read by the platform from a fixed place/],
    ['.github/workflows', /fixed place/],
    ['CLAUDE.md', /fixed place/],
    ['.process', /fixed place/],
    ['docs/ux', /overlaps the lane folder docs\/ux\//],
    ['../elsewhere', /is not a path inside the repository/],
    ['/etc', /is not a path inside the repository/],
  ]) assert.throws(() => layoutPlan(root, { also: [p] }), why, p);
  // Already home: skipped, not refused.
  assert.deepEqual(layoutPlan(root, { also: ['process/ledger'] }).skipped, [{ from: 'process/ledger', why: 'already under process/' }]);
});

test('layout move --apply (C41): one commit; the files moved; only the moved keys rewritten; the tool reads the new paths', () => {
  const root = product();
  const lines = [];
  const r = layoutMove(root, { apply: true, also: ['build/plan'], log: (l) => lines.push(l) });
  assert.equal(r.applied, true);
  assert.equal(git(['rev-list', '--count', 'HEAD'], { cwd: root }), '2', 'one commit');
  assert.match(git(['log', '-1', '--format=%B'], { cwd: root }), /^layout move: process-only paths into process\/ \(C41\)\n\nbuild\/layers\.md -> process\/layers\.md\nbuild\/situations -> process\/situations\nbuild\/plan -> process\/plan/);
  for (const f of ['process/layers.md', 'process/situations/job.md', 'process/plan/plan.md']) assert.ok(existsSync(join(root, f)), f);
  for (const f of ['build/layers.md', 'build/situations', 'build/plan']) assert.ok(!existsSync(join(root, f)), f);
  assert.ok(existsSync(join(root, 'build/requirements/A.md')), 'requirements stay');
  const text = readFileSync(join(root, CONFIG_FILE), 'utf8');
  assert.equal(text, '{\n  "tranche": "tranche",\n  "modules_file": "build/modules.json",\n  "lanes": [{ "name": "ux", "dir": "docs/ux" }],\n  "layers_file": "process/layers.md",\n  "situations_dir": "process/situations"\n}\n');
  const cfg = loadConfig(root);
  assert.equal(cfg.layers_file, 'process/layers.md');
  assert.equal(cfg.situations_dir, 'process/situations');
  assert.match(lines.at(-1), /^committed [0-9a-f]{40} on build\/layout: push it, open its pull request into tranche/);
  // A second run: nothing left to move.
  const again = [];
  assert.equal(layoutMove(root, { apply: true, log: (l) => again.push(l) }).applied, false);
  assert.match(again[0], /^nothing to move/);
  assert.equal(layoutHint(root, cfg), null);
});

test('layout move --apply (C41): refused on the tranche, on a detached HEAD and on a dirty checkout; nothing changed', () => {
  const root = product();
  git(['checkout', '-q', '-b', 'tranche'], { cwd: root });
  assert.throws(() => layoutMove(root, { apply: true, log: () => {} }), /runs on a working branch from tranche, not tranche/);
  git(['checkout', '-q', '--detach'], { cwd: root });
  assert.throws(() => layoutMove(root, { apply: true, log: () => {} }), /not a detached HEAD/);
  git(['checkout', '-q', 'build/layout'], { cwd: root });
  commit(root, { 'x.txt': 'x\n' });
  git(['rm', '-q', '--cached', 'x.txt'], { cwd: root });
  assert.throws(() => layoutMove(root, { apply: true, log: () => {} }), /needs a clean checkout/);
  assert.ok(existsSync(join(root, 'build/layers.md')));
});

test('layout (C41): a key already set is rewritten in place; the rest of the config is kept byte for byte', () => {
  const text = '{\n  "layers_file": "build/layers.md",   "x": [1, 2],\n  "y": "build/layers.md"\n}\n';
  const out = rewriteConfig(text, [{ from: 'build/layers.md', to: 'process/layers.md', key: 'layers_file' }, { from: 'build/plan', to: 'process/plan', key: null }]);
  assert.equal(out, '{\n  "layers_file": "process/layers.md",   "x": [1, 2],\n  "y": "build/layers.md"\n}\n');
  assert.deepEqual(rewriteConfig('{}\n', [{ to: 'process/situations', key: 'situations_dir' }]), '{\n  "situations_dir": "process/situations"\n}\n');
  assert.deepEqual(parseJSON(rewriteConfig('{"a":1}', [{ to: 'process/layers.md', key: 'layers_file' }])), { a: 1, layers_file: 'process/layers.md' });
});

test('status hint (C41): BOB is told of process-only paths outside process/, never refused', () => {
  const root = product();
  assert.equal(layoutHint(root, loadConfig(root)), 'layout: 2 process-only path(s) outside process/ (build/layers.md, build/situations): `layout move` prints the plan');
  // An unreadable plan is no hint and no failure.
  assert.equal(layoutHint(root, { ...loadConfig(root), layers_file: '.claude/x' }), null);
});

test('census (C41): the job situation is read from situations_dir, at its default or where the product moved it', () => {
  const root = product(CFG, { 'process/situations/job.md': '# moved\n' });
  const cfg = loadConfig(root);
  assert.equal(situationFile(root, cfg, 'HEAD'), 'build/situations/job.md');
  assert.equal(situationFile(root, { ...cfg, situations_dir: 'process/situations/' }, 'HEAD'), 'process/situations/job.md');
  assert.equal(situationFile(root, { ...cfg, situations_dir: 'process/nowhere' }, 'HEAD'), null);
});

test('layout move (C41): an --also path a tracked file outside process/ names is refused, with the files; its own files and process/ do not count', () => {
  // BOB's read of the product (coordinator, 8 Nov): product tests read build/plan/ and docs/requirements-notes/.
  const root = product(CFG, {
    'build/plan/beta/limits.md': 'see build/plan/beta/limits.md\n',
    'test/op-grades.test.mjs': "read('build/plan/beta/limits.md')\n",
    'docs/requirements-notes/ids.md': 'ids\n',
    'test/requirements-ids.test.mjs': "read('docs/requirements-notes/ids.md')\n",
    'process/notes.md': 'build/jobs is moving\n',
    'build/jobs/j1.md': 'job notes; build/jobs\n',
  });
  assert.throws(() => layoutPlan(root, { also: ['build/plan/'] }), /^Error: layout move: build\/plan is named by 1 tracked file\(s\) outside process\/, which would break: test\/op-grades\.test\.mjs; move it with a change that updates them \(as round work\), not by --also$/);
  assert.throws(() => layoutMove(root, { apply: true, also: ['build/jobs', 'docs/requirements-notes'], log: () => {} }), /docs\/requirements-notes is named by 1 tracked file\(s\) outside process\/, which would break: test\/requirements-ids\.test\.mjs/);
  assert.ok(existsSync(join(root, 'build/layers.md')), 'a refusal moves nothing');
  assert.equal(git(['status', '--porcelain'], { cwd: root }), '');
  // Named only inside itself and under process/: it moves.
  assert.deepEqual(layoutPlan(root, { also: ['build/jobs'] }).moves.map((m) => m.from), ['build/layers.md', 'build/situations', 'build/jobs']);
});
