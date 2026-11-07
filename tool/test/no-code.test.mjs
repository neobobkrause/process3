// C22 (the coordinator, 7 Nov): a brand-new module with no code could not enter the copy. BOB's
// funding-register (BD-15 PF-6): its gate ran the suite over folders that did not exist yet
// ("the funding-register suite failed (exit 1): {total:0}"), and the pull request that adds its
// modules row (which regenerates order.mjs) could not also carry its requirements file.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { refreshOthers } from '../lib/checks.mjs';
import { addedEntries, gate, noCodeYet } from '../lib/gate.mjs';
import { RECEIPT, BOT, block } from '../lib/github.mjs';
import { DEFAULTS, git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const io = (receipt) => {
  const comments = receipt ? [{ id: 1, body: block(RECEIPT, receipt), user: { login: 'civicsmith' } }] : [];
  return { comments: () => comments, getPR: () => ({ user: { login: 'civicsmith' } }), addComment: (s, n, body) => { comments.push({ id: comments.length + 1, body, user: { login: BOT } }); return {}; }, verify: () => true };
};
const receipt = (sha) => ({ kind: 'receipt', module: 'fund', attempt: 1, sha, commands: [{ cmd: 'node --test', exit: 0, suite: true }], exempt: { revert: 'no code yet' } });

test('a module with no code yet: its suite is skipped with the reason recorded, until its first commit adds code', () => {
  const root = makeRepo({ 'process/ledger/fund.json': entry('fund', { status: { state: 'WORKING' } }), 'req/fund.md': '# fund\n\n- **R1** one\n' });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/fund'], { cwd: root });
  // Its first commit names its uses (the ledger entry only): no requirements-only run, so the suite would run.
  const head = commit(root, { 'process/ledger/fund.json': entry('fund', { status: { state: 'WORKING' }, uses: [] }) });
  const lines = [];
  const r = gate(root, { base, head, branch: 'job/fund', pr: 5, slug: 'o/r', io: io(receipt(head)), log: (l) => lines.push(String(l)) });
  assert.deepEqual(r.findings.filter((f) => f.check === 'suite'), [], JSON.stringify(r.findings));
  assert.equal(r.run.no_code?.[0]?.module, 'fund', JSON.stringify({ run: r.run, findings: r.findings, lines }).slice(0, 3000));
  assert.match(r.run.no_code[0].why, /no file under its paths or tests yet \(src\/fund\/, test\/fund\/\)/);
  assert.ok(lines.some((l) => /the fund suite: no file under its paths/.test(l)), lines.join('\n'));
  // Once code is there, a suite with no test is refused as before.
  const head2 = commit(root, { 'src/fund/index.mjs': 'export const x = 1;\n' });
  const r2 = gate(root, { base, head: head2, branch: 'job/fund', pr: 5, slug: 'o/r', io: io(receipt(head2)), log: () => {} });
  assert.ok(r2.findings.some((f) => f.check === 'suite'), JSON.stringify(r2.findings));
  assert.equal(r2.run.no_code, undefined);
});

test('noCodeYet: no tracked or on-disk file under any path or test; empty lists count as none', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  assert.equal(noCodeYet(root, entry('a')), true);
  assert.equal(noCodeYet(root, entry('a', { paths: [], tests: [] })), true);
  commit(root, { 'test/a/x.test.mjs': '\n' });
  assert.equal(noCodeYet(root, entry('a')), false);
});

test('beside a refresh: the requirements file of a module the change adds, and no other module\'s', () => {
  const cfg = { ...DEFAULTS, modules_file: 'process/modules.json', layers_file: 'process/layers.md', requirements_dir: 'build/requirements' };
  const rows = [{ paths: ['src/order.mjs'], regenerate: ['node', 'gen.mjs'], verify: ['node', 'gen.mjs', '--check'] }];
  const before = [entry('old', { requirements: 'build/requirements/old.md' })];
  const after = [...before, entry('fund', { requirements: 'build/requirements/fund.md' })];
  const changed = ['src/order.mjs', 'process/modules.json', 'process/ledger/fund.json', 'build/requirements/fund.md'];
  assert.deepEqual(addedEntries(before, after).map((e) => e.id), ['fund']);
  assert.deepEqual(refreshOthers(cfg, rows, changed, before, [], { added: addedEntries(before, after) }), []);
  assert.deepEqual(refreshOthers(cfg, rows, changed, before, []), ['build/requirements/fund.md'], 'not an added module: refused as before');
  // An existing module's requirements file, or a file a row names, is still refused.
  assert.deepEqual(refreshOthers(cfg, rows, [...changed, 'build/requirements/old.md'], before, [], { added: addedEntries(before, after) }), ['build/requirements/old.md']);
  const named = [{ ...rows[0], regenerate: ['node', 'gen.mjs', 'build/requirements/fund.md'] }];
  assert.deepEqual(refreshOthers(cfg, named, changed, before, [], { added: addedEntries(before, after) }), ['build/requirements/fund.md']);
  // The default requirements path when the entry names none.
  const bare = { ...entry('fund'), requirements: undefined };
  assert.deepEqual(refreshOthers(cfg, rows, changed, before, [], { added: [bare] }), []);
});
