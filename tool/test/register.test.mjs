// Triage registers (register.mjs, AUD-8, AUD-9): an entry brings options with context first and is
// printed nowhere; once its short-term response is chosen, the response and its end condition are
// printed verbatim into the starting prompt of each role it names, and leave it on close; a
// long-term entry is printed nowhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SEED_ENTRY, makeRepo, processRegisterFixture } from './helpers.mjs';
import { recordStart, startRole } from '../lib/roles.mjs';
import { startText } from '../lib/job.mjs';
import { laneStart } from '../lib/lane.mjs';
import { PROCESS_ROOT, STANDING_CAP, parseRegister, processRegister, standingBlock, standingFor, triageAdd, triageChoose, triageClose, triageList } from '../lib/register.mjs';
import { git, loadConfig } from '../lib/util.mjs';

processRegisterFixture([SEED_ENTRY]);
const quiet = () => {};
const R = 'session_01rootrootroot';
const CFG = { tranche: 'tranche', lanes: [{ name: 'triage', dir: 'triage', kind: 'triage' }] };
const SHORT = {
  kind: 'short-term',
  problem: 'Gate runs queue behind product builds.',
  evidence: 'copy, 5 Nov: 6 gate runs waited over 20 minutes.',
  option: ['Run at most two product builds at once; process3 gate runs go first.', 'Keep one queue.'],
  context: ['Gate runs stop waiting; product builds take longer.', 'Today\'s order; gate runs keep waiting.'],
};
const CHOICE = {
  response: 'Run at most two product builds at once; process3 gate runs go first.',
  'chosen-by': 'Bob, 6 Nov: "the first"',
  end: 'for 2 hours no gate run waits over 5 minutes.',
  affects: 'bob,coordinator',
};
// An entry added and chosen, as the lane does it.
const addChosen = (root, add = SHORT, choice = CHOICE, opts = { log: quiet }) => {
  const e = triageAdd(root, loadConfig(root), add, opts);
  return triageChoose(root, loadConfig(root), e.id, choice, opts);
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
  const address = { root: { session: R } };
  return {
    bob: startRole(root, 'bob', { slug: 'o/p', address, log: quiet }).prompt,
    root: startRole(root, 'root', { slug: 'o/p', address: {}, log: quiet }).prompt,
  };
};

test('options first, printed nowhere; a chosen short-term response reaches BOB, not ROOT, and leaves them on close', () => {
  const root = product();
  const out = [];
  writeFileSync(join(root, 'other.txt'), 'staged, not the register\n');
  git(['add', 'other.txt'], { cwd: root });
  const e = triageAdd(root, loadConfig(root), SHORT, { log: (l) => out.push(l) });
  assert.equal(e.id, 'T1');
  assert.equal(e.response, undefined);
  assert.deepEqual(e.options.map((o) => o.context), SHORT.context);
  assert.match(out[0], /triage T1 added to triage\/register\.json on lane\/triage; push it and land it by pull request into tranche, then bring its options with their context to Bob, through BOB/);
  assert.equal(git(['log', '-1', '--format=%s'], { cwd: root }), 'triage T1: short-term entry added, 2 options');
  assert.deepEqual(git(['show', '--name-only', '--format=', 'HEAD'], { cwd: root }).trim().split('\n'), ['triage/register.json']);
  assert.throws(() => triageAdd(root, loadConfig(root), { ...SHORT, context: 'one' }, { log: quiet }), /each --option takes its own --context/);
  assert.throws(() => triageAdd(root, loadConfig(root), { kind: 'short-term', problem: 'p', evidence: 'e' }, { log: quiet }), /options lists each option with its context/);
  land(root);
  let p = prompts(root);
  for (const role of ['bob', 'root']) assert.ok(!p[role].includes('Run at most two'), `${role}: no response is chosen yet`);
  assert.throws(() => triageChoose(root, loadConfig(root), 'T1', { ...CHOICE, end: '' }, { log: quiet }), /needs end_condition/);
  assert.throws(() => triageChoose(root, loadConfig(root), 'T1', { ...CHOICE, 'chosen-by': '' }, { log: quiet }), /needs chosen_by/);
  const c = triageChoose(root, loadConfig(root), 'T1', CHOICE, { log: quiet });
  assert.equal(c.state, 'response chosen');
  assert.throws(() => triageChoose(root, loadConfig(root), 'T1', CHOICE, { log: quiet }), /already has its chosen response/);
  land(root);
  p = prompts(root);
  for (const role of ['bob']) {
    assert.ok(p[role].includes(`- product T1. Response chosen ${c.chosen_at}: ${CHOICE.response}`), role);
    assert.ok(p[role].includes(`  Ends when: ${CHOICE.end}`), role);
    assert.ok(!p[role].includes('Keep one queue') && !p[role].includes(SHORT.context[0]), `${role}: options are not printed`);
  }
  assert.ok(!p.root.includes(CHOICE.response));
  assert.throws(() => triageClose(root, loadConfig(root), 'T1', { log: quiet }), /--how/);
  triageClose(root, loadConfig(root), 'T1', { how: 'measured 5 Nov 14:00 to 16:00: no gate run waited over 5 minutes', log: quiet });
  const closed = readFileSync(join(root, 'triage/closed.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual([closed.length, closed[0].id, closed[0].state, closed[0].how_met, closed[0].response], [1, 'T1', 'closed', 'measured 5 Nov 14:00 to 16:00: no gate run waited over 5 minutes', CHOICE.response]);
  land(root);
  p = prompts(root);
  for (const role of ['bob']) assert.ok(!p[role].includes(CHOICE.response), role);
  // The next id never reuses a closed one's.
  assert.equal(triageAdd(root, loadConfig(root), SHORT, { log: quiet }).id, 'T2');
});

test('a long-term entry is printed into no prompt; the register lands by pull request, never a commit on the tranche', () => {
  const root = product();
  const long = { kind: 'long-term', problem: 'Merges serialize on one runner.', evidence: 'copy, 5 Nov.', option: 'A second runner.', context: 'Doubles runner cost.', 'judged-against': 'Foundations: merges never wait behind BOB\'s work.' };
  addChosen(root, long, { response: 'A second runner.', 'chosen-by': 'Bob, 6 Nov: "yes"' });
  assert.throws(() => triageAdd(root, loadConfig(root), { ...long, 'judged-against': undefined }, { log: quiet }), /judged_against/);
  land(root);
  const p = prompts(root);
  for (const role of ['bob', 'root']) assert.ok(!p[role].includes('Merges serialize'), role);
  const out = [];
  triageList(root, loadConfig(root), { log: (l) => out.push(l) });
  assert.match(out.join('\n'), /1 open[\s\S]*"judged_against": "Foundations: merges never wait behind BOB's work\."/);
  git(['checkout', '-q', 'tranche'], { cwd: root });
  assert.throws(() => triageAdd(root, loadConfig(root), SHORT, { log: quiet }), /never by a commit on tranche/);
});

test('only a chosen short-term response is printed, with its end condition; the register\'s shape is checked', () => {
  const base = { id: 'T1', kind: 'short-term', problem: 'p', evidence: 'e', options: [{ option: 'Merge process3 first.', context: 'c' }], owner: 'o', state: 's' };
  const reg = (e) => ({ repo: 'product', register: parseRegister(JSON.stringify({ open: [e] })) });
  const chosenE = { ...base, response: 'Merge process3 first.', chosen_by: 'Bob, 6 Nov: "yes"', chosen_at: '2026-11-06', end_condition: 'done', affects: ['bob'] };
  assert.equal(standingBlock([reg(base)], 'bob'), '', 'awaiting a choice');
  assert.match(standingBlock([reg(chosenE)], 'bob'), /- product T1\. Response chosen 2026-11-06: Merge process3 first\.\n {2}Problem: p\n {2}Ends when: done/);
  assert.equal(standingBlock([reg(chosenE)], 'root'), '', 'a role the entry does not name');
  const bad = (e) => () => parseRegister(JSON.stringify({ open: [e] }));
  assert.throws(bad({ ...base, options: [{ option: 'x' }] }), /options lists each option with its context/);
  assert.throws(bad({ ...chosenE, end_condition: undefined }), /needs end_condition/);
  assert.throws(bad({ ...chosenE, chosen_at: undefined }), /needs chosen_at/);
  assert.throws(bad({ ...chosenE, affects: ['watcher'] }), /affects lists roles/);
  assert.throws(bad({ ...chosenE, chosen_by: 'the coordinator, 6 Nov' }), /chosen_by quotes the dated words/);
  assert.throws(() => parseRegister(JSON.stringify({ open: [base, base] })), /entry T1 appears twice/);
});

test('the process register\'s seed P1, while awaiting a choice, brings options with context and is printed into no prompt', () => {
  const live = processRegister(PROCESS_ROOT);
  assert.equal(PROCESS_ROOT, join(import.meta.dirname, '..', '..'));
  const p1 = live.register.open.find((e) => e.id === 'P1');
  if (!p1 || p1.response !== undefined) return; // chosen or closed by the process-triage lane
  assert.ok(p1.options.length >= 2);
  for (const role of ['bob', 'root', 'coordinator', 'job']) assert.equal(standingBlock([live], role), '', role);
});

test('over the cap, every entry is still printed and the block and the commands say so', () => {
  const root = product();
  const big = { ...CHOICE, response: 'x'.repeat(700) };
  const out = [];
  for (let i = 0; i < 3; i++) addChosen(root, SHORT, big, { log: (l) => out.push(l) });
  assert.match(out.join('\n'), new RegExp(`over the cap: the standing block of bob, coordinator is over ${STANDING_CAP} bytes`));
  land(root);
  const p = prompts(root);
  assert.equal(p.bob.split('x'.repeat(700)).length - 1, 3);
  assert.match(p.bob, new RegExp(`over its cap of ${STANDING_CAP}: tell the triage lanes`));
});

test('a job START carries the entries naming job briefs; an unreadable register stops no start', () => {
  const block = standingBlock([{ repo: 'product', register: { open: [{ id: 'T1', kind: 'short-term', problem: 'p', evidence: 'e', options: [{ option: 'Run test twice.', context: 'c' }], response: 'Run test twice.', chosen_by: 'Bob, 6 Nov: "yes"', chosen_at: '2026-11-06', end_condition: 'c', affects: ['job'], owner: 'o', state: 's' }] } }], 'job');
  const t = startText({ entry: { id: 'a', title: 'A', requirements: 'req/a.md', paths: ['src/a/'], tests: ['test/a/'] }, slug: 'o/p', branch: 'job/a', tranche: 'tranche', coordinator: R, attempt: 1, reading: { files: [], bytes: 0 }, standing: block });
  assert.ok(t.indexOf('  Ends when: c') < t.indexOf('## Acts you may take'), 'before the acts and their limits');
  assert.ok(t.includes('Response chosen 2026-11-06: Run test twice.'));
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
  assert.match(r.prompt, /BOB `[^`]+` started you/);
  assert.match(r.prompt, /Bring the options to Bob, through BOB by send_message; you choose no response yourself/);
  assert.match(r.prompt, /never as rulebook lines \(AUD-9, TXT-3\)/);
  assert.doesNotMatch(r.prompt, /\.process\/tool\/p3\.mjs triage/);
  const p = laneStart(root, 'triage', { log: quiet, replace: undefined });
  assert.match(p.prompt, /a Process3 problem goes to the process's triage lane, process-triage/);
  const { laneAsk } = await import('../lib/lane.mjs');
  assert.throws(() => laneAsk(root, 'triage', 'why?', { log: quiet }), /is a triage lane/);
  const { lanes } = await import('../lib/lane.mjs');
  assert.throws(() => lanes({ lanes: [{ name: 'a', dir: 'a', kind: 'triage' }, { name: 'b', dir: 'b', kind: 'odd' }] }), /kind is "design" or "triage"/);
});
