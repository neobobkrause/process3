// status --role bob (build ci-budget, R2; Bob: "go R2"): a module whose gate suite took over 70%
// of suite_timeout_minutes, by the newest gate row on this tranche's pull requests, is one line
// among the acts, naming the module and the figure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commit, makeRepo, onState } from './helpers.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { BOT, GATE, block } from '../lib/github.mjs';
import { SUITE_BUDGET, suiteBudget } from '../lib/status.mjs';

const jl = (...rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
const at = (h) => new Date(Date.UTC(2026, 10, 6, h)).toISOString();
const row = (h, over) => ({ at: at(h), ok: true, trigger: 'code', suite: 'pass', ...over });

function repo(config = {}) {
  const root = makeRepo({ 'README.md': 'x\n', 'process/config.json': config });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: root });
  commit(root, { 'process/metrics/m.jsonl': jl(
    { at: at(0), module: 'old', row: 'merge', pr: 9 },
    { at: at(5), module: 'plane', row: 'merge', pr: 11 },
    { at: at(6), module: 'lib', row: 'merge', pr: 12 },
  ) }, 'record');
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  onState(root, { 'metrics/tranche-open.jsonl': jl({ row: 'grant', tranche: 'tranche', at: at(1), act: 'push', depth: 1, outcome: 'ok' }) });
  return root;
}
const reader = (runs) => (pr) => [{ user: { login: BOT }, body: block(GATE, { runs: runs[pr] || [] }) }];

test('suite budget: a module over 70% of suite_timeout_minutes is named with its figure; under it, or before the opening, is not', () => {
  assert.equal(SUITE_BUDGET, 0.7);
  const root = repo({ suite_timeout_minutes: 20 });
  const runs = {
    9: [row(0, { suite_by_module: { old: 19 * 60 } })], // merged before the tranche opened
    11: [row(2, { suite_by_module: { plane: 19 * 60 } }), row(4, { suite_by_module: { plane: 15 * 60, lib: 60 } })], // newest: 15 of 20
    12: [row(3, { scope: ['lib'], suite_seconds: 13 * 60 })], // a row from before suite_by_module: 13 of 20, 65%
    40: [row(7, { suite: 'fail', suite_by_module: { cli: 16.5 * 60 } })], // an open job PR, red
    41: [row(7, { suite: 'skipped', suite_by_module: { web: 19 * 60 } })], // no suite ran
  };
  const rows = [{ id: 'cli', pr: '#40' }, { id: 'web', pr: '#41' }, { id: 'done', pr: 'merged' }];
  const got = suiteBudget(root, loadConfig(root), { tranche: 'origin/tranche', comments: reader(runs), rows });
  assert.deepEqual(got, [
    `suite budget: cli's gate suite took 16.5 min, 83% of suite_timeout_minutes 20 (over 70%; PR 40, gate row ${at(7)}): speed or split its suite before it times out`,
    `suite budget: plane's gate suite took 15 min, 75% of suite_timeout_minutes 20 (over 70%; PR 11, gate row ${at(4)}): speed or split its suite before it times out`,
  ]);
  // A row's whole-run seconds count for a module only when it ran that module alone.
  runs[12] = [row(3, { scope: ['lib', 'plane'], suite_seconds: 19 * 60 })];
  assert.equal(suiteBudget(root, loadConfig(root), { tranche: 'origin/tranche', comments: reader(runs), rows }).some((l) => l.includes('lib\'s')), false);
  runs[12] = [row(3, { scope: ['lib'], suite_seconds: 14.5 * 60 })];
  assert.match(suiteBudget(root, loadConfig(root), { tranche: 'origin/tranche', comments: reader(runs), rows }).find((l) => l.includes('lib\'s')), /lib's gate suite took 14\.5 min, 73% of suite_timeout_minutes 20/);
  // The default limit is 20; a smaller one names smaller suites.
  const tight = repo({ suite_timeout_minutes: 10 });
  assert.equal(suiteBudget(tight, loadConfig(tight), { tranche: 'origin/tranche', comments: reader({ 12: [row(3, { suite_by_module: { lib: 7.5 * 60 } })] }), rows: [] })[0].startsWith('suite budget: lib\'s gate suite took 7.5 min, 75% of suite_timeout_minutes 10'), true);
  // Unread: null, so status says so instead of guessing.
  assert.equal(suiteBudget(root, loadConfig(root), { tranche: 'origin/tranche', comments: () => { throw new Error('unread'); }, rows }), null);
  assert.equal(suiteBudget(root, loadConfig(root), { tranche: 'origin/tranche', comments: () => null, rows }), null);
});
