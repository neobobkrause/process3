// The direct flow (PD-25, direct.mjs): one end-to-end test of start, land and reschedule on a local
// product with a bare origin.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { jobStart } from '../lib/job.mjs';
import { directKey, jobCfg } from '../lib/layerbase.mjs';
import { directView, usesGraph } from '../lib/direct.mjs';
import { flowRows, layerLand } from '../lib/layerflow.mjs';
import { fetchState } from '../lib/state.mjs';
import { configOf, git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const SB = 'process-state';
const req = (id, met = false) => `# ${id} — requirements\n\n## Public\n\n### Provides\n\n- ${id}() returns a thing\n\n## Private\n\n**R1** a requirement${met ? '' : ' *(not yet met: T1)*'}\n`;

// a; b and d use a; c alone. d is COMPLETE with nothing owed; the rest are OPEN with an unmet mark.
function product() {
  const files = {
    'process/config.json': { merge_strategy: 'direct', modules_file: 'build/modules.json' },
    'build/layers.md': '# The layers\n\n| layer | name | modules |\n| --- | --- | --- |\n| 1 | One | a, b, c |\n| 2 | Two | d |\n',
    'build/modules.json': { modules: [{ id: 'a', uses: [] }, { id: 'b', uses: ['a'] }, { id: 'c', uses: [] }, { id: 'd', uses: ['a'] }] },
  };
  for (const id of ['a', 'b', 'c', 'd']) {
    files[`process/ledger/${id}.json`] = entry(id, id === 'd' ? { status: { state: 'COMPLETE' } } : {});
    files[`req/${id}.md`] = req(id, id === 'd');
    files[`test/${id}/t.test.mjs`] = "import test from 'node:test'; test('ok', () => {});\n";
  }
  files['src/a/index.mjs'] = 'export function a(x) { return x; }\n';
  files['src/b/index.mjs'] = "import { a } from '../a/index.mjs';\nexport const b = () => a(1);\n";
  files['src/c/index.mjs'] = 'export const c = 1;\n';
  files['src/d/index.mjs'] = "import { a } from '../a/index.mjs';\nexport const d = () => a(2);\n";
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'origin.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  return { root, bare };
}
function clone(bare) {
  const d = join(mkdtempSync(join(tmpdir(), 'p3-clone-')), 'c');
  git(['clone', '-q', bare, d], { cwd: tmpdir() });
  for (const [k, v] of [['user.email', 'noreply@github.com'], ['user.name', 'Test'], ['commit.gpgsign', 'false']]) git(['config', k, v], { cwd: d });
  return d;
}
// GitHub's merge of head into base, titled as given; { sha, merged }.
function ghMerge(bare, base, head, title) {
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'w', `origin/${base}`], { cwd: d });
  git(['fetch', '-q', 'origin', head], { cwd: d });
  git(['merge', '-q', '--no-ff', '-m', title, head], { cwd: d });
  git(['push', '-q', 'origin', `w:${base}`], { cwd: d });
  return { sha: git(['rev-parse', 'HEAD'], { cwd: d }), merged: true };
}
// A job's work on job/<id>, cut from the tranche, pushed; its head.
function jobWork(bare, id, files) {
  const d = clone(bare);
  git(['checkout', '-q', '-B', `job/${id}`, 'origin/tranche'], { cwd: d });
  const h = commit(d, files, `work on ${id}`);
  git(['push', '-q', '-f', 'origin', `job/${id}`], { cwd: d });
  return h;
}
const prOf = (n, id, head) => ({ number: n, state: 'open', draft: false, base: { ref: 'tranche' }, head: { ref: `job/${id}`, sha: head } });

test('usesGraph: upstream through the uses, a cycle in map order', () => {
  const g = usesGraph(['a', 'b', 'c'], new Map([['a', ['b']], ['b', ['a']], ['c', ['b']]]), ['a', 'b', 'c']);
  assert.deepEqual(g.upstream.get('a'), []);
  assert.deepEqual(g.upstream.get('b'), ['a']);
  assert.deepEqual([...g.upstream.get('c')].sort(), ['a', 'b']);
  assert.deepEqual(g.earlierPeers.get('b'), ['a']);
  assert.deepEqual(g.order, ['a', 'b', 'c']);
});

test('direct flow: ready jobs start at once on the tranche; a land into the tranche reschedules open users, notices COMPLETE ones, and frees the users to start', async () => {
  const { root, bare } = product();
  const cfg = configOf({ merge_strategy: 'direct', modules_file: 'build/modules.json' });
  const key = directKey('tranche');
  // The job's base is the tranche; its rows go under the tranche's key.
  assert.deepEqual(jobCfg(root, cfg, 'a', { push: false }).layer, { n: key, tranche: 'tranche', direct: true });
  assert.equal(jobCfg(root, cfg, 'a', { push: false }).tranche, 'tranche');
  // Ready: a and c at once; b waits on a (upstream, not settled); d is COMPLETE.
  const io = { slug: 'o/p', openPRs: () => [], comments: () => [] };
  let v = directView(root, cfg, { slug: 'o/p', io });
  assert.equal(v.kind, 'open');
  assert.deepEqual(v.startable.map((x) => x.id), ['a', 'c']);
  assert.deepEqual(v.states.find((s) => s.id === 'b').waits, ['a']);
  // job start: cut from the tranche, no layer to open.
  jobStart(root, 'a', { coordinator: 's', push: false, log: quiet });
  assert.equal(git(['merge-base', '--is-ancestor', 'tranche', 'job/a'], { cwd: root, allowFail: true }).code, 0);
  git(['checkout', '-q', 'tranche'], { cwd: root });

  // a's work: a new interface, its mark met, COMPLETE. b's draft PR is open too.
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': 'export function a(x, y) { return x + y; }\nexport const a2 = 1;\n', 'req/a.md': req('a', true), 'process/ledger/a.json': entry('a', { status: { state: 'COMPLETE' } }) });
  const hb = jobWork(bare, 'b', { 'src/b/index.mjs': "import { a } from '../a/index.mjs';\nexport const b = () => a(5);\n" });
  const prs = { 1: prOf(1, 'a', ha), 2: prOf(2, 'b', hb) };
  let triaged = null;
  const landIO = {
    slug: 'o/p', getPR: (s, k) => prs[k], checkRun: () => ({ status: 'completed', conclusion: 'success' }), comments: () => [],
    openPRs: () => Object.values(prs).filter((p) => p.state === 'open'),
    merge: (s, k, sha, title) => { prs[k].state = 'closed'; return ghMerge(bare, 'tranche', sha, title); },
    triage: (r, c, notice) => { triaged = notice; return { rows: [] }; },
  };
  // b lands only once a, which it uses, is settled.
  await assert.rejects(layerLand(root, 2, { io: landIO, log: quiet }), /refused: b uses a \(published\), not settled/);
  const lines = [];
  const r = await layerLand(root, 1, { io: landIO, log: (l) => lines.push(String(l)) });
  assert.equal(r.land.interface.changed, true);
  assert.deepEqual(r.land.users_rescheduled, ['b']);
  assert.deepEqual(r.land.users_noticed, ['d']);
  assert.deepEqual(triaged.users, ['d'], 'the notice is triaged at the land (PD-20)');
  assert.ok(lines.some((l) => /BOB delivers to job b's session \(PR 2\), with send_message priority now: .*Halt any test run now/.test(l)), lines.join('\n'));
  fetchState(root, SB, { fresh: true });
  const rows = flowRows(root, SB, key);
  assert.equal(rows.lands.length, 1);
  assert.equal(git(['log', '-1', '--format=%s', 'origin/tranche'], { cwd: root }), 'Merge layer PR 1');
  assert.deepEqual(rows.reschedules.map((x) => [x.user, x.provider, x.provider_land]), [['b', 'a', r.land.merge]]);
  // b's run started before a's land: it never counts.
  await assert.rejects(layerLand(root, 2, { io: landIO, log: quiet }), /started before a's interface change/);
  // a is settled: b (rescheduled, its PR open) is no longer waiting; with its PR closed it is ready.
  prs[2].state = 'closed';
  v = directView(root, cfg, { slug: 'o/p', io });
  assert.deepEqual(v.states.find((s) => s.id === 'b').waits, []);
  assert.equal(v.states.find((s) => s.id === 'b').state, 'rescheduled');
  assert.deepEqual(v.startable.map((x) => x.id), ['b', 'c']);
});
