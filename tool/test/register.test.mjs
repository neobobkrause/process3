// Triage registers (register.mjs; Bob, 5 Nov): an open short-term entry is printed verbatim into
// the initial prompt of each role it names and leaves it on close; a long-term entry is printed
// nowhere; who decided is kept exactly, Bob's words quoted as his only when they are.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SEED_ENTRY, makeRepo, processRegisterFixture } from './helpers.mjs';
import { recordStart, startRole } from '../lib/roles.mjs';
import { startText } from '../lib/job.mjs';
import { laneStart } from '../lib/lane.mjs';
import { PROCESS_ROOT, STANDING_CAP, STANDING_HEAD, parseRegister, processRegister, standingBlock, standingFor, triageAdd, triageClose, triageList } from '../lib/register.mjs';
import { git, loadConfig } from '../lib/util.mjs';

processRegisterFixture([SEED_ENTRY]);
const quiet = () => {};
const R = 'session_01rootrootroot';
const M = 'session_01mergermerger';
const CFG = { tranche: 'tranche', lanes: [{ name: 'triage', dir: 'triage', kind: 'triage' }] };
const SHORT = {
  kind: 'short-term',
  problem: 'Gate runs queue behind product builds.',
  evidence: 'copy, 5 Nov: 6 gate runs waited over 20 minutes.',
  interim: 'Run at most two product builds at once; process3 gate runs go first.',
  'decided-by': 'the coordinator',
  end: 'for 2 hours no gate run waits over 5 minutes.',
  affects: 'bob,merger',
};

function product() {
  const root = makeRepo({ 'README.md': 'x', 'process/config.json': CFG, 'triage/README.md': 'the product triage lane\n' });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', '-b', 'lane/triage', 'tranche'], { cwd: root });
  return root;
}
// The lane's pull request, landed: its branch merged into the tranche on origin.
function land(root) {
  git(['push', '-q', 'origin', 'lane/triage:tranche'], { cwd: root });
}
const prompts = (root) => {
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'merger', M, { log: quiet });
  const address = { root: { session: R }, merger: { session: M } };
  return {
    bob: startRole(root, 'bob', { slug: 'o/p', address, log: quiet }).prompt,
    merger: startRole(root, 'merger', { slug: 'o/p', address, replace: M, log: quiet }).prompt,
    root: startRole(root, 'root', { slug: 'o/p', address: {}, log: quiet }).prompt,
  };
};

test('a short-term entry is printed verbatim into the BOB and MERGER prompts, not ROOT\'s, and leaves them on close', () => {
  const root = product();
  const out = [];
  writeFileSync(join(root, 'other.txt'), 'staged, not the register\n');
  git(['add', 'other.txt'], { cwd: root });
  const e = triageAdd(root, loadConfig(root), SHORT, { log: (l) => out.push(l) });
  assert.equal(e.id, 'T1');
  assert.match(out[0], /triage T1 added to triage\/register\.json on lane\/triage; push it and land it by pull request into tranche/);
  assert.equal(git(['log', '-1', '--format=%s'], { cwd: root }), 'triage T1: short-term entry added');
  assert.deepEqual(git(['show', '--name-only', '--format=', 'HEAD'], { cwd: root }).trim().split('\n'), ['triage/register.json']);
  land(root);
  let p = prompts(root);
  for (const role of ['bob', 'merger']) {
    assert.ok(p[role].includes(`- product T1. Decided by the coordinator, ${e.decided_at} (that ruling, not Bob's words): ${SHORT.interim}`), role);
    assert.ok(p[role].includes(`  Ends when: ${SHORT.end}`), role);
  }
  assert.ok(!p.root.includes(SHORT.interim));
  assert.throws(() => triageClose(root, loadConfig(root), 'T1', { log: quiet }), /--how/);
  triageClose(root, loadConfig(root), 'T1', { how: 'measured 5 Nov 14:00 to 16:00: no gate run waited over 5 minutes', log: quiet });
  const closed = readFileSync(join(root, 'triage/closed.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual([closed.length, closed[0].id, closed[0].state, closed[0].how_met, closed[0].interim], [1, 'T1', 'closed', 'measured 5 Nov 14:00 to 16:00: no gate run waited over 5 minutes', SHORT.interim]);
  land(root);
  p = prompts(root);
  for (const role of ['bob', 'merger']) assert.ok(!p[role].includes(SHORT.interim), role);
  // The next id never reuses a closed one's.
  assert.equal(triageAdd(root, loadConfig(root), SHORT, { log: quiet }).id, 'T2');
});

test('a long-term entry is printed into no prompt; the register lands by pull request, never a commit on the tranche', () => {
  const root = product();
  triageAdd(root, loadConfig(root), { kind: 'long-term', problem: 'Merges serialize on one runner.', evidence: 'copy, 5 Nov.', 'judged-against': 'Foundations: merges never wait behind BOB\'s work.' }, { log: quiet });
  assert.throws(() => triageAdd(root, loadConfig(root), { kind: 'long-term', problem: 'x', evidence: 'y' }, { log: quiet }), /judged_against/);
  land(root);
  const p = prompts(root);
  for (const role of ['bob', 'merger', 'root']) assert.ok(!p[role].includes('Merges serialize'), role);
  const out = [];
  triageList(root, loadConfig(root), { log: (l) => out.push(l) });
  assert.match(out.join('\n'), /1 open[\s\S]*"judged_against": "Foundations: merges never wait behind BOB's work\."/);
  git(['checkout', '-q', 'tranche'], { cwd: root });
  assert.throws(() => triageAdd(root, loadConfig(root), SHORT, { log: quiet }), /never by a commit on tranche/);
});

test('attribution is kept exactly: Bob\'s words quoted as Bob\'s only when Bob decided', () => {
  const reg = (by) => ({ repo: 'product', register: parseRegister(JSON.stringify({ open: [{ id: 'T1', kind: 'short-term', problem: 'p', evidence: 'Bob, 5 Nov: "Merge process3 first."', interim: 'Merge process3 first.', decided_by: by, decided_at: '2026-11-05', end_condition: 'done', affects: ['bob'], owner: 'o', state: 's' }] })) });
  assert.match(standingBlock([reg('Bob')], 'bob'), /- product T1\. Decided by Bob, 2026-11-05, in Bob's own words: "Merge process3 first\."/);
  const c = standingBlock([reg('the coordinator')], 'bob');
  assert.match(c, /Decided by the coordinator, 2026-11-05 \(that ruling, not Bob's words\): Merge process3 first\./);
  assert.doesNotMatch(c, /Bob's own words|Bob decided/);
  assert.equal(standingBlock([reg('Bob')], 'root'), '', 'a role the entry does not name');
  // Bob's words need Bob's words in the evidence; the decider is spelled exactly.
  const raw = (by, evidence) => JSON.stringify({ open: [{ id: 'T1', kind: 'short-term', problem: 'p', evidence, interim: 'Merge process3 first.', decided_by: by, decided_at: '2026-11-05', end_condition: 'done', affects: ['bob'], owner: 'o', state: 's' }] });
  assert.throws(() => parseRegister(raw('Bob', 'the coordinator said so')), /quoted word for word in its evidence/);
  for (const by of ['bob', 'Bob Krause', 'coordinator', 'merger']) assert.throws(() => parseRegister(raw(by, 'e')), /decided_by is one of/, by);
  assert.match(standingBlock([{ repo: 'product', register: parseRegister(raw('lane ux', 'e')) }], 'bob'), /Decided by lane ux, 2026-11-05 \(that ruling, not Bob's words\)/);
  assert.throws(() => parseRegister(JSON.stringify({ open: [{ id: 'T1', kind: 'short-term', problem: 'p', evidence: 'e', interim: 'i', decided_at: 'd', end_condition: 'c', affects: ['bob'], owner: 'o', state: 's' }] })), /needs decided_by/);
  assert.throws(() => parseRegister(JSON.stringify({ open: [{ id: 'T1', kind: 'short-term', problem: 'p', evidence: 'e', interim: 'i', decided_by: 'Bob', decided_at: 'd', end_condition: 'c', affects: ['watcher'], owner: 'o', state: 's' }] })), /affects lists roles/);
});

test('the process register\'s seed, while open: the coordinator\'s ruling on process3 fixes before product job merges, in BOB, MERGER, coordinator and no other', () => {
  const live = processRegister(PROCESS_ROOT);
  assert.equal(PROCESS_ROOT, join(import.meta.dirname, '..', '..'));
  const p1 = live.register.open.find((e) => e.id === 'P1');
  if (!p1) return; // closed by the process-triage lane: its row is in triage/closed.jsonl
  assert.equal(p1.kind, 'short-term');
  assert.equal(p1.decided_by, 'the coordinator');
  assert.equal(p1.interim, 'process3 fixes that raise merge throughput or unblock jobs go ahead of product job pull requests. Their pin move takes the copy train\'s next place, batched into one pin move per batch; other process3 fixes ride the next batch.');
  assert.equal(p1.end_condition, 'on the copy, for 2 consecutive hours, no window position is discarded or re-gated except for a file conflict or a real test failure, and green-to-merged is under 10 minutes at the median.');
  assert.deepEqual(p1.affects, ['bob', 'merger', 'coordinator']);
  for (const role of ['bob', 'merger', 'coordinator']) assert.ok(standingBlock([live], role).includes(`(that ruling, not Bob's words): ${p1.interim}`), role);
  for (const role of ['root', 'job']) assert.ok(!standingBlock([live], role).includes(p1.interim), role);
});

test('over the cap, every entry is still printed and the block and the commands say so', () => {
  const root = product();
  const big = { ...SHORT, interim: 'x'.repeat(700) };
  const out = [];
  for (let i = 0; i < 3; i++) triageAdd(root, loadConfig(root), big, { log: (l) => out.push(l) });
  assert.match(out.join('\n'), new RegExp(`over the cap: the standing block of bob, merger is over ${STANDING_CAP} bytes`));
  land(root);
  const p = prompts(root);
  assert.equal(p.bob.split('x'.repeat(700)).length - 1, 3);
  assert.match(p.bob, new RegExp(`over its cap of ${STANDING_CAP}: tell the triage lanes`));
});

test('a job START carries the entries naming job briefs; an unreadable register stops no start', () => {
  const block = standingBlock([{ repo: 'product', register: { open: [{ id: 'T1', kind: 'short-term', problem: 'p', evidence: 'e', interim: 'Run test twice.', decided_by: 'BOB', decided_at: '2026-11-05', end_condition: 'c', affects: ['job'], owner: 'o', state: 's' }] } }], 'job');
  const t = startText({ entry: { id: 'a', title: 'A', requirements: 'req/a.md', paths: ['src/a/'], tests: ['test/a/'] }, slug: 'o/p', branch: 'job/a', tranche: 'tranche', coordinator: R, attempt: 1, reading: { files: [], bytes: 0 }, standing: block });
  assert.ok(t.indexOf('  Ends when: c') < t.indexOf('## Acts you may take'), 'before the acts and their limits');
  assert.ok(t.includes('Decided by BOB, 2026-11-05 (that ruling, not Bob\'s words): Run test twice.'));
  const bad = makeRepo({ 'process/config.json': CFG, 'triage/register.json': '{"open": [{"id": "T1"}]}' });
  const b = standingFor(bad, loadConfig(bad), 'bob');
  assert.match(b, /A triage register could not be read \(triage\/register\.json, entry T1: no problem\)/);
  assert.ok(b.includes('process P1.'), 'the process register still prints');
});

test('the process\'s triage lane starts from process3, with its register named; a triage lane takes no lane ask', async () => {
  const root = product();
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const r = laneStart(root, 'process-triage', { log: quiet });
  assert.match(r.call.source_url, /process3/);
  assert.equal(r.call.source_revision, 'tranche');
  assert.match(r.prompt, /Your register: `triage\/register\.json`/);
  assert.match(r.prompt, /a product problem goes to that product's triage lane/);
  assert.match(r.prompt, /`node tool\/p3\.mjs triage list`/);
  assert.doesNotMatch(r.prompt, /\.process\/tool\/p3\.mjs triage/);
  const p = laneStart(root, 'triage', { log: quiet, replace: undefined });
  assert.match(p.prompt, /a Process3 problem goes to the process's triage lane, process-triage/);
  const { laneAsk } = await import('../lib/lane.mjs');
  assert.throws(() => laneAsk(root, 'triage', 'why?', { log: quiet }), /is a triage lane/);
  const { lanes } = await import('../lib/lane.mjs');
  assert.throws(() => lanes({ lanes: [{ name: 'a', dir: 'a', kind: 'triage' }, { name: 'b', dir: 'b', kind: 'odd' }] }), /kind is "design" or "triage"/);
});
