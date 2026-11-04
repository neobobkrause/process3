// status --role bob (Bob, 4 Nov): every test tolerated as base-red on the tranche, with its module
// and its age since the first gate row that tolerated it, oldest first. Report only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commit, makeRepo, onState } from './helpers.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { BOT, GATE, block } from '../lib/github.mjs';
import { baseRedAges } from '../lib/status.mjs';

const jl = (...rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
const at = (h) => new Date(Date.UTC(2026, 10, 1, h)).toISOString();
const red = (module, ...tests) => ({ module, base: 'b0', tests });
const row = (h, over) => ({ at: at(h), ok: true, trigger: 'code', ...over });

test('base-red ages: once per test, from its first tolerating row on any merged PR, oldest first; merges before the opening left out', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: root });
  commit(root, { 'process/metrics/m.jsonl': jl(
    { at: at(0), module: 'old', row: 'merge', pr: 9 },
    { at: at(5), module: 'plane', row: 'merge', pr: 11 },
    { at: at(8), module: 'lib', row: 'merge', pr: 12 },
  ) }, 'record');
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  onState(root, { 'metrics/tranche-open.jsonl': jl({ row: 'grant', tranche: 'tranche', at: at(1), act: 'push', depth: 1, outcome: 'ok' }) });
  const runs = {
    9: [row(0, { base_red: [red('old', 'o::x')] })],
    11: [row(2, { ok: false, base_red: [red('plane', 'p::a')] }), row(4, { base_red: [red('plane', 'p::a', 'p::b')] })],
    12: [row(3, { smoke: { result: 'base-red', base_red: [red('plane', 'p::a')] } }), row(7, { base_red: [red('lib', 'l::c')], smoke: { base_red: [red('plane', 'p::a')] } })],
  };
  const comments = (pr) => [{ user: { login: BOT }, body: block(GATE, { runs: runs[pr] }) }];
  const got = baseRedAges(root, loadConfig(root), { tranche: 'origin/tranche', comments, haveState: true });
  assert.deepEqual(got.map((o) => [o.module, o.test, o.pr, o.since]), [
    ['plane', 'p::a', 11, at(2)],
    ['plane', 'p::b', 11, at(4)],
    ['lib', 'l::c', 12, at(7)],
  ]);
  assert.equal(baseRedAges(root, loadConfig(root), { tranche: 'origin/tranche', comments: () => { throw new Error('unread'); }, haveState: true }), null);
  assert.equal(baseRedAges(root, loadConfig(root), { tranche: 'origin/tranche', comments, haveState: false }), null, 'the state branch unread: unread');
  runs[11][0].base_red = [red('other', 'p::a')];
  assert.equal(baseRedAges(root, loadConfig(root), { tranche: 'origin/tranche', comments, haveState: true })[0].since, at(3), 'another module\'s test of the same name is not its age');
});

test('base-red ages: none before the tranche opens', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  onState(root, { 'metrics/other.jsonl': '' });
  assert.deepEqual(baseRedAges(root, loadConfig(root), { tranche: 'origin/tranche', comments: () => [], haveState: true }), []);
});
