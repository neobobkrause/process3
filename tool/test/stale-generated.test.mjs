// A committed generated file left stale (coordinator, 6 Nov: modules.json gained 7 rows and
// member-roster's order.mjs was never regenerated; the gate passed and the tranche held 9 failures).
// A pull request that is not a job's has the rows regenerated even when it touches no module; a file
// the regenerate changes is a finding, unless the base was stale the same way (a notice, as base-red).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gate } from '../lib/gate.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const W = "require('fs').writeFileSync('src/alpha/order.mjs', 'export const order = ' + JSON.stringify(require('./build/modules.json').modules.map((m) => m.id)) + ';\\n')";
const MOD = (ids) => ({ modules: ids.map((id) => ({ id, paths: [`src/${id}/`], tests: [`test/${id}/`], uses: [] })), not_product: [] });
const order = (ids) => `export const order = ${JSON.stringify(ids)};\n`;
const io = { comments: () => [], getPR: () => ({ user: { login: 'u' }, draft: false }), addComment: () => ({}), verify: () => false };

// The tranche with modules (ids) and order.mjs as committed (written); a plain branch with files.
function run(ids, written, files) {
  const root = makeRepo({
    'process/config.json': { modules_file: 'build/modules.json', generated: [{ paths: ['src/alpha/order.mjs'], regenerate: ['node', '-e', W], verify: ['node', '-e', '0'] }] },
    'build/modules.json': MOD(ids),
    ...Object.fromEntries(ids.map((id) => [`process/ledger/${id}.json`, entry(id, { status: { state: 'COMPLETE' } })])),
    'src/alpha/order.mjs': order(written),
    'test/alpha/a.test.mjs': "import test from 'node:test'; test('ok', () => {});\n",
    'docs/notes.md': 'notes\n',
  });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'plain/x'], { cwd: root });
  const head = commit(root, files);
  const lines = [];
  const r = gate(root, { base, head, branch: 'plain/x', pr: 5, slug: 'o/r', io, log: (l) => lines.push(l) });
  return { ...r, lines, gen: r.findings.filter((f) => f.check === 'generated') };
}

test('a plain pull request that adds a modules row and leaves order.mjs stale is refused, naming the file and its regenerate', () => {
  const r = run(['alpha'], ['alpha'], { 'build/modules.json': MOD(['alpha', 'beta']), 'process/ledger/beta.json': entry('beta', { status: { state: 'COMPLETE' } }) });
  assert.equal(r.gen.length, 1, JSON.stringify(r.findings));
  assert.match(r.gen[0].message, /^src\/alpha\/order\.mjs is stale at this commit: run node -e .* and commit it in this PR$/);
  assert.equal(r.run.stale_base, undefined);
  // With the file regenerated in it, it is not stale; a module's generated file changed beside another
  // file is still the refresh rule's finding (refreshCheck), unchanged here.
  const ok = run(['alpha'], ['alpha'], { 'build/modules.json': MOD(['alpha', 'beta']), 'process/ledger/beta.json': entry('beta', { status: { state: 'COMPLETE' } }), 'src/alpha/order.mjs': order(['alpha', 'beta']) });
  assert.ok(!ok.gen.some((f) => / is stale at this commit/.test(f.message)), JSON.stringify(ok.gen));
  assert.ok(ok.gen.some((f) => /a refresh changes only generated files/.test(f.message)));
});

test('stale on the base the same way: a notice, owed by a plain refresh, never this pull request\'s finding; made staler by it: refused', () => {
  // The tranche already holds a stale order.mjs; the pull request touches only a note.
  const inherited = run(['alpha', 'beta'], ['alpha'], { 'docs/notes.md': 'more notes\n' });
  assert.deepEqual(inherited.gen, []);
  assert.deepEqual(inherited.run.stale_base, ['src/alpha/order.mjs']);
  assert.ok(inherited.lines.some((l) => /^notice: src\/alpha\/order\.mjs is stale on the base \S+ too: owed by a plain refresh, not this pull request's$/.test(l)), inherited.lines.join('\n'));
  // Stale at the base, and this pull request changes what the generator writes: its own finding.
  const worse = run(['alpha', 'beta'], ['alpha'], { 'build/modules.json': MOD(['alpha', 'beta', 'gamma']), 'process/ledger/gamma.json': entry('gamma', { status: { state: 'COMPLETE' } }) });
  assert.equal(worse.gen.length, 1, JSON.stringify(worse.findings));
  assert.equal(worse.run.stale_base, undefined);
});
