// PD-19 (coordinator, 9 Nov): a module whose change a job in the open layer needs (a registry or
// assembly module) joins that open layer as the job's companion: `layer join <companion>
// --companion-of <job> --layer <n> --why "<what it needs>"`. It lands in the same layer; the job
// lands only after it. Each refusal, the land order, and (PD-17) the path rehearsed end to end.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { jobStart } from '../lib/job.mjs';
import { hold } from '../lib/hold.mjs';
import { flowFile } from '../lib/layerbase.mjs';
import { flowRows, layerJobs, layerJoin, layerLand, layerLines, layerMerge, layerOpen, layerStatus, syncOwed, writeRows } from '../lib/layerflow.mjs';
import { fetchState, readState } from '../lib/state.mjs';
import { configOf, git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const SB = 'process-state';
const req = (id, mark = '') => `# ${id} — requirements\n\n## Public\n\n### Purpose\n\n${id} does things.\n\n### Provides\n\n- ${id}() returns a thing\n\n## Private\n\n### Uses\n\nnothing\n\n**R1** a requirement${mark}\n`;
const modules = { modules: [{ id: 'a', uses: [] }, { id: 'b', uses: [] }, { id: 'c', uses: [] }, { id: 'd', uses: ['a'] }, { id: 'e', uses: [] }, { id: 'f', uses: [] }] };
// a (a registry), b, c in layer 1, behind (COMPLETE); d and e in layer 2, OPEN with work.
const layers = '# The layers\n\n| layer | name | modules |\n| --- | --- | --- |\n| 1 | One | a, b, c |\n| 2 | Two | d, e |\n| 3 | Three | f |\n';
const cfgOf = () => configOf({ merge_strategy: 'layer', modules_file: 'build/modules.json' });

function product() {
  const files = { 'process/config.json': { merge_strategy: 'layer', modules_file: 'build/modules.json' }, 'build/layers.md': layers, 'build/modules.json': modules };
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) {
    const later = ['d', 'e', 'f'].includes(id);
    files[`process/ledger/${id}.json`] = entry(id, { layer: id === 'f' ? 3 : later ? 2 : 1, status: { state: later ? 'OPEN' : 'COMPLETE' } });
    files[`req/${id}.md`] = req(id, later ? ' *(not yet met: T1)*' : '');
    files[`test/${id}/t.test.mjs`] = "import test from 'node:test'; test('ok', () => {});\n";
  }
  files['src/a/index.mjs'] = 'export const ops = [\'x\'];\n';
  for (const id of ['b', 'c', 'e', 'f']) files[`src/${id}/index.mjs`] = `export const ${id} = 1;\n`;
  files['src/d/index.mjs'] = "import { ops } from '../a/index.mjs';\nexport const d = () => ops;\n";
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
function ghMerge(bare, base, head, title) {
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'w', `origin/${base}`], { cwd: d });
  git(['fetch', '-q', 'origin', head], { cwd: d });
  git(['merge', '-q', '--no-ff', '-m', title, head], { cwd: d });
  git(['push', '-q', 'origin', `w:${base}`], { cwd: d });
  return { sha: git(['rev-parse', 'HEAD'], { cwd: d }), merged: true };
}
function jobWork(bare, id, files, { from = 'origin/layer/2', merge = null } = {}) {
  const d = clone(bare);
  git(['checkout', '-q', '-B', `job/${id}`, from], { cwd: d });
  if (merge) git(['merge', '-q', '--no-edit', merge], { cwd: d });
  const h = commit(d, files, `work on ${id}`);
  git(['push', '-q', '-f', 'origin', `job/${id}`], { cwd: d });
  return h;
}
const prOf = (n, id, head) => ({ number: n, state: 'open', draft: false, base: { ref: 'layer/2' }, head: { ref: `job/${id}`, sha: head } });
const landIO = (bare, prs) => ({ slug: 'o/p', getPR: (s, k) => prs[k], checkRun: () => ({ status: 'completed', conclusion: 'success' }), comments: () => [], openPRs: () => [], merge: (s, k, sha, title) => ghMerge(bare, prs[k].base.ref, sha, title), retest: () => { throw new Error('no retest here'); } });
const openIO = { slug: 'o/p', openPRs: () => [], comments: () => [] };
// No job branches on origin, GitHub read: the companion has no open job.
const joinIO = (over = {}) => ({ slug: 'o/p', originJobs: () => new Set(), prsFromBranch: () => [], ...over });
const WHY = 'd declares the op aikeyreference in a\'s own family';

function opened() {
  const p = product();
  layerOpen(p.root, 2, { io: openIO, log: quiet });
  return p;
}

test('companion join: a module behind the open layer joins it as a job\'s companion; the rows record it; layer status and layer jobs show it', () => {
  const { root } = opened();
  const out = [];
  assert.deepEqual(layerJoin(root, 'a', { companionOf: 'd', layer: 2, why: WHY, io: joinIO(), log: (l) => out.push(l) }), { ok: true, layer: 2, recorded: true, companion: true });
  assert.match(out[0], /^a joins layer 2 as d's companion \(PD-19\): d declares .*; it starts from .*layer jobs 2, and d lands only after it$/);
  fetchState(root, SB, { fresh: true });
  const j = JSON.parse(readState(root, SB, flowFile(2, 'join', 'a')));
  assert.deepEqual([j.row, j.module, j.from, j.companion_of, j.why], ['join', 'a', 1, 'd', WHY]);
  const c = JSON.parse(readState(root, SB, flowFile(2, 'companion', 'a-d')));
  assert.deepEqual([c.row, c.layer, c.module, c.job, c.why], ['companion', 2, 'a', 'd', WHY]);
  const lines = [];
  const st = layerStatus(root, 2, { io: openIO, log: (l) => lines.push(l) });
  const a = st.states.find((s) => s.id === 'a');
  const d = st.states.find((s) => s.id === 'd');
  assert.equal(a.state, 'not started');
  assert.match(a.why, /^joined as companion of d \(PD-19\): d declares/);
  assert.deepEqual(d.companions, ['a']);
  assert.match(d.why, /lands after its companion a \(PD-19\)/);
  assert.ok(lines.some((l) => /^companion: a \(not started\) joined for d \(d declares .*\) \(PD-19\); d lands only after it$/.test(l)), lines.join('\n'));
  assert.equal(st.ready, false, 'the merge waits for the companion');
  const jl = [];
  const jobs = layerJobs(root, 2, { io: openIO, log: (l) => jl.push(l) });
  // a is COMPLETE: its start reopens it with the companion's words, naming the job and the why.
  assert.equal(jobs.startable.find((x) => x.id === 'a').cmd, `node .process/tool/p3.mjs job start a --sessions <file> --reopen ${JSON.stringify(`companion of d (PD-19): ${WHY}`)}`);
  assert.deepEqual(jobs.startable.find((x) => x.id === 'd').after, ['a']);
  assert.ok(jl.some((l) => l.startsWith('companion: a ')));
  // status --role bob's layer lines show it too.
  assert.ok(layerLines(root, cfgOf(), { io: openIO }).some((l) => /^- companion: a /.test(l)));
  // Recorded once.
  assert.equal(layerJoin(root, 'a', { companionOf: 'd', layer: 2, why: 'again', io: joinIO(), log: quiet }).recorded, false);
});

test('companion join: one companion serves two jobs of the layer before it starts; its words name both', () => {
  const { root } = opened();
  layerJoin(root, 'a', { companionOf: 'd', layer: 2, why: 'op x', io: joinIO(), log: quiet });
  assert.equal(layerJoin(root, 'a', { companionOf: 'e', layer: 2, why: 'op y', io: joinIO(), log: quiet }).recorded, true);
  const jobs = layerJobs(root, 2, { io: openIO, log: quiet });
  assert.match(jobs.startable.find((x) => x.id === 'a').cmd, /--reopen "companion of d, e \(PD-19\): d needs op x; e needs op y"/);
});

test('companion join refusals: layer not open; job not in the layer; the job itself; a member already; an open job; held; BLOCKED; a later layer\'s module; GitHub unread; nothing is recorded', () => {
  const { root } = opened();
  const go = (id, o = {}) => () => layerJoin(root, id, { companionOf: 'd', layer: 2, why: WHY, io: joinIO(), log: quiet, ...o });
  assert.throws(go('a', { layer: 1 }), /layer 1 is not open: a companion joins only the open layer .*nothing recorded/);
  assert.throws(go('a', { layer: 3 }), /layer 3 is not open/);
  assert.throws(go('a', { companionOf: 'b' }), /b is not a job of layer 2 \(its modules: d, e\)/);
  assert.throws(go('d'), /d cannot be its own companion/);
  assert.throws(go('e'), /e is a module of layer 2 already \(its own\)/);
  assert.throws(go('zz'), /zz has no ledger entry/);
  assert.throws(go('a', { layer: undefined }), /name the open layer/);
  assert.throws(go('a', { why: ' ' }), /--why/);
  assert.throws(() => layerJoin(root, 'a', { layer: 2, why: WHY, log: quiet }), /--layer goes with --companion-of/);
  // An open job anywhere: an open pull request from its job branch.
  assert.throws(go('a', { io: joinIO({ originJobs: () => new Set(['job/a']), prsFromBranch: () => [{ number: 7, state: 'open', base: { ref: 'tranche' } }] }) }), /a has an open job: pull request #7 from job\/a into tranche/);
  assert.throws(go('a', { io: joinIO({ originJobs: () => new Set(['job/a']), prsFromBranch: () => null }) }), /GitHub unreadable/);
  assert.throws(go('a', { io: joinIO({ originJobs: () => null }) }), /origin's job branches could not be read/);
  // Held: a module hold on it, or a hold on the layer.
  hold(root, 'module:a', { why: 'Bob holds a', by: 'session_x', until: '1h', log: quiet });
  assert.throws(go('a'), /a is held \(.*module:a: Bob holds a\)/);
  const r = hold(root, 'module:a', { end: readHoldId(root), by: 'session_x', log: quiet });
  assert.ok(r.ended);
  // BLOCKED (deferred) on the layer branch or the tranche.
  commit(root, { 'process/ledger/b.json': entry('b', { layer: 1, status: { state: 'BLOCKED', reason: 'waits on Bob' } }) });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  assert.throws(go('b'), /b is BLOCKED \(waits on Bob\)/);
  assert.throws(go('f'), /f's own layer 3 is after layer 2: its work is planned there/);
  fetchState(root, SB, { fresh: true });
  assert.equal(flowRows(root, SB, 2).companions.length, 0, 'nothing recorded by any refusal');
});
const readHoldId = (root) => { fetchState(root, SB, { fresh: true }); return JSON.parse(readState(root, SB, 'holds/holds.jsonl').trim().split('\n').at(-1)).id; };

test('companion join refusals: a companion already started in the layer takes no new job; a job waiting on a companion is none; a companion has none', () => {
  const { root } = opened();
  layerJoin(root, 'a', { companionOf: 'd', layer: 2, why: WHY, io: joinIO(), log: quiet });
  assert.throws(() => layerJoin(root, 'd', { companionOf: 'e', layer: 2, why: 'x', io: joinIO(), log: quiet }), /d waits on its own companion\(s\) in layer 2: it cannot be one/);
  assert.throws(() => layerJoin(root, 'c', { companionOf: 'a', layer: 2, why: 'x', io: joinIO(), log: quiet }), /a is a companion in layer 2 itself/);
  // a's job starts: no second job joins it as a companion.
  writeStart(root, 'a');
  assert.throws(() => layerJoin(root, 'a', { companionOf: 'e', layer: 2, why: 'op y', io: joinIO(), log: quiet }), /a's job started in layer 2 already: e's need is not in its brief/);
});
const writeStart = (root, id) => writeRows(root, SB, `layer 2: ${id} started`, [[flowFile(2, 'start', `${id}-1-1`), { row: 'start', layer: 2, module: id, attempt: 1, branch: `job/${id}`, at: new Date().toISOString() }]]);

test('land order (PD-19): the job lands only after its companion, and only on a head holding the companion\'s land', async () => {
  const { root, bare } = opened();
  layerJoin(root, 'a', { companionOf: 'd', layer: 2, why: WHY, io: joinIO(), log: quiet });
  const hd = jobWork(bare, 'd', { 'src/d/index.mjs': "import { ops } from '../a/index.mjs';\nexport const d = () => [...ops, 'aikeyreference'];\n" });
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': "export const ops = ['x', 'aikeyreference'];\n" });
  const prs = { 1: prOf(1, 'd', hd), 2: prOf(2, 'a', ha) };
  await assert.rejects(layerLand(root, 1, { io: landIO(bare, prs), log: quiet }), /refused: d lands only after its companion in layer 2 \(PD-19\): a has not landed; nothing was merged/);
  git(['fetch', '-q', 'origin'], { cwd: root });
  assert.equal(git(['merge-base', '--is-ancestor', hd, 'origin/layer/2'], { cwd: root, allowFail: true }).code, 1, 'nothing merged');
  await layerLand(root, 2, { io: landIO(bare, prs), log: quiet });
  // d's head does not hold a's land: refused, naming the publish that brings it in.
  await assert.rejects(layerLand(root, 1, { io: landIO(bare, prs), log: quiet }), /a's land [0-9a-f]+ is not in [0-9a-f]+: node \.process\/tool\/p3\.mjs layer publish d again brings it in/);
  const hd2 = jobWork(bare, 'd', { 'src/d/more.mjs': 'export const more = 1;\n' }, { from: 'origin/job/d', merge: 'origin/layer/2' });
  prs[3] = prOf(3, 'd', hd2);
  assert.equal((await layerLand(root, 3, { io: landIO(bare, prs), log: quiet })).ok, true);
});

// PD-17: the path rehearsed end to end, as BOB runs it: a layer open with a job; the job needs a
// companion; the companion joins; both start (each brief names the pairing); the companion lands;
// the job lands; the layer merges. syncOwed and the layer cover hold as for any member.
test('rehearsal (PD-17): open, companion join, both start, companion lands, job lands, layer merge', async () => {
  const { root, bare } = opened();
  // The job is listed; its need is found: a's op family.
  assert.deepEqual(layerJobs(root, 2, { io: openIO, log: quiet }).startable.map((x) => x.id).sort(), ['d', 'e']);
  layerJoin(root, 'a', { companionOf: 'd', layer: 2, why: WHY, io: joinIO(), log: quiet });
  const list = layerJobs(root, 2, { io: openIO, log: quiet }).startable;
  assert.deepEqual(list.map((x) => x.id).sort(), ['a', 'd', 'e']);
  // Both start (push off: the local layer branch is the base); each brief names the pairing.
  git(['branch', '-f', 'layer/2', 'origin/layer/2'], { cwd: root });
  const briefs = {};
  for (const id of ['a', 'd']) {
    const out = [];
    jobStart(root, id, { coordinator: 's', push: false, ...(id === 'a' ? { reopen: `companion of d (PD-19): ${WHY}` } : {}), log: (l) => out.push(l) });
    briefs[id] = out.join('\n');
    git(['checkout', '-q', 'tranche'], { cwd: root });
  }
  assert.match(briefs.a, /## Companion \(PD-19\)\n\nYou are a companion job: `d` in this layer needs this module changed: d declares .*Change only what d needs, nothing beyond it; d lands only after your land\./);
  assert.match(briefs.a, /What it must do: companion of d \(PD-19\)/);
  assert.match(briefs.d, /Your land waits on your companion in this layer \(PD-19\): `a` \(d declares/);
  assert.match(git(['show', 'job/a:process/metrics/a.jsonl'], { cwd: root, allowFail: true }).stdout + git(['log', '-1', '-p', 'job/a'], { cwd: root }), /"companion_of":\[\{"job":"d"/, 'the ledger\'s start row records it');
  // The work, published from the layer branch.
  const hd = jobWork(bare, 'd', { 'src/d/index.mjs': "import { ops } from '../a/index.mjs';\nexport const d = () => [...ops, 'aikeyreference'];\n" });
  const ha = jobWork(bare, 'a', { 'src/a/index.mjs': "export const ops = ['x', 'aikeyreference'];\n" });
  const he = jobWork(bare, 'e', { 'src/e/index.mjs': 'export const e = 2;\n' });
  const prs = { 1: prOf(1, 'd', hd), 2: prOf(2, 'a', ha), 3: prOf(3, 'e', he) };
  await assert.rejects(layerLand(root, 1, { io: landIO(bare, prs), log: quiet }), /d lands only after its companion/);
  await layerLand(root, 3, { io: landIO(bare, prs), log: quiet });
  await layerLand(root, 2, { io: landIO(bare, prs), log: quiet });
  const mio = (extra = {}) => ({ slug: 'o/p', openPRs: () => [], findPR: () => null, createPR: (s, p) => ({ number: 50, ...p, base: { ref: p.base } }), checkRun: () => ({ status: 'completed', conclusion: 'success' }), merge: (s, k, sha, title) => ghMerge(bare, 'tranche', sha, title), roundClose: () => ({ ran: false, owed: null }), ...extra });
  await assert.rejects(layerMerge(root, 2, { io: mio(), wait: false, log: quiet }), /d is (not started|rescheduled)/, 'the merge waits for the job');
  const hd2 = jobWork(bare, 'd', { 'src/d/more.mjs': 'export const more = 1;\n' }, { from: 'origin/job/d', merge: 'origin/layer/2' });
  prs[4] = prOf(4, 'd', hd2);
  await layerLand(root, 4, { io: landIO(bare, prs), log: quiet });
  const st = layerStatus(root, 2, { io: openIO, log: quiet });
  assert.deepEqual(st.states.map((s) => [s.id, s.state]).sort(), [['a', 'complete'], ['d', 'complete'], ['e', 'complete']]);
  assert.equal(st.ready, true);
  assert.equal(syncOwed(root, cfgOf(), 2), null, 'syncOwed holds: no pin move, nothing owed');
  const m = await layerMerge(root, 2, { io: mio(), wait: false, log: quiet });
  assert.equal(m.ok, true);
  git(['fetch', '-q', 'origin'], { cwd: root });
  for (const h of [ha, hd2]) assert.equal(git(['merge-base', '--is-ancestor', h, 'origin/tranche'], { cwd: root, allowFail: true }).code, 0);
});
