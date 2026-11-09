// C46 (Bob, 9 Nov: "Let's fix as many of them as we can", the causes of slow progress): round next
// opens a round, and carries it on, with one command. On 8-9 Nov BOB opened round 2 by hand, a turn
// a step (each found, status, layer open, layer jobs, each job start), and one step hid a cycle (C44).
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { walkRound } from '../lib/deploy.mjs';
import { layerArg } from '../p3.mjs';
import { flowRows, writeRows } from '../lib/layerflow.mjs';
import { owedReopens } from '../lib/rounds.mjs';
import { oneLine, parseFindings, roundNext, walkEntries, withFile } from '../lib/roundnext.mjs';
import { fetchState, writeState } from '../lib/state.mjs';
import { Fail, git, loadConfig } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const SB = 'process-state';
const req = (id) => `# ${id}\n\n## Public\n\n### Provides\n\n- ${id}()\n\n**R1** a\n**R2** b\n**R3** c\n`;
const LAYERS = '| layer | name | modules |\n| --- | --- | --- |\n| 1 | One | a, b |\n| 2 | Two | c |\n| 3 | Three | d |\n';
const at = (min) => new Date(Date.UTC(2026, 10, 9, 12, min)).toISOString();

// Three map layers, every module COMPLETE with no unmet mark (round 1 behind); d's test pins the ids
// of its requirement file (its findings are owed reopens, C44); b's does not (found marks).
function product() {
  const files = { 'process/config.json': { merge_strategy: 'layer' }, 'build/layers.md': LAYERS };
  for (const id of ['a', 'b', 'c', 'd']) {
    files[`process/ledger/${id}.json`] = entry(id, { status: { state: 'COMPLETE' } });
    files[`req/${id}.md`] = req(id);
    files[`src/${id}/index.mjs`] = `export const ${id} = 1;\n`;
    files[`test/${id}/t.test.mjs`] = "import test from 'node:test'; test('ok', () => {});\n";
  }
  files['test/d/ids.test.mjs'] = 'const IDS = ["R1", "R2", "R3"]; // the ids of req/d.md\n';
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'origin.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  // The tranche past main: a walk at a commit on main is an earlier tranche's.
  commit(root, { 'notes.md': 'the tranche\n' }, 'the tranche');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  return root;
}
const push = (root, files, msg = 'x') => { git(['checkout', '-q', 'tranche'], { cwd: root }); git(['merge', '-q', '--ff-only', 'origin/tranche'], { cwd: root }); commit(root, files, msg); git(['push', '-q', 'origin', 'tranche'], { cwd: root }); git(['fetch', '-q', 'origin'], { cwd: root }); };

// A round walk's row and its stored report, as walk round writes them (deploy.mjs walkRound).
let walks = 0;
function walked(root, { failures = [], min, live = null, row = 'round-walk' }) {
  const slug = `internal-w${++walks}`;
  const commitSha = git(['rev-parse', 'origin/tranche'], { cwd: root });
  const stored = `walks/round/${slug}/report.json`;
  const inner = { steps: 10, steps_ok: 10 - failures.length, failures: failures.length, ok: !failures.length, exit: failures.length ? 1 : 0, reports: [{ from: 'out/report.json', stored }] };
  const r = row === 'round-walk'
    ? { row, tranche: 'tranche', slug, commit: commitSha, ok: true, stopped: null, internal_walk: inner, at: at(min) }
    : { row, tranche: 'tranche', slug, commit: commitSha, ok: !live, stopped: live ? 'walk' : null, walk: { failures: live || 0, reports: [{ from: 'out/live.json', stored: `walks/round/${slug}/live.json` }] }, internal_walk: inner, at: at(min) };
  writeState(root, SB, 'walk row', (w) => {
    mkdirSync(join(w, 'deploys'), { recursive: true });
    appendFileSync(join(w, 'deploys', 'dev.jsonl'), JSON.stringify(r) + '\n');
    mkdirSync(join(w, 'walks', 'round', slug), { recursive: true });
    writeFileSync(join(w, stored), JSON.stringify({ steps: [], failures }));
    if (live) writeFileSync(join(w, 'walks', 'round', slug, 'live.json'), JSON.stringify({ steps: [], failures: Array.from({ length: live }, () => ({ module: 'a', kind: 'live', message: 'the live arm' })) }));
  });
  fetchState(root, SB, { fresh: true });
  return r;
}
const merged = (root, n, min) => { writeRows(root, SB, `merged ${n}`, [[`layerflow/${n}/merged.json`, { row: 'merged', layer: n, commit: 'f'.repeat(40), at: at(min) }]]); fetchState(root, SB, { fresh: true }); };

// GitHub, stood in: the open pull requests, a create that records one, and the merge tool's plain
// merge as a fast-forward of the tranche to the pull request's branch.
function gh(root, { failMerge = 0, failCreate = 0, conflicted = new Set() } = {}) {
  const prs = [];
  const made = [];
  const closed = [];
  let n = 100;
  let fails = failMerge;
  let createFails = failCreate;
  const io = {
    slug: 'o/p',
    comments: () => [],
    openPRs: () => prs.map((p) => ({ number: p.number, head: { ref: p.head } })),
    getPR: (slug, num) => ({ number: num, mergeable: !conflicted.has(num) }),
    closePR: (slug, num) => { const p = prs.find((x) => x.number === num); prs.splice(prs.indexOf(p), 1); closed.push(num); },
    createPR: (slug, pr) => { if (createFails > 0) { createFails--; throw new Fail('GitHub did not return a pull request'); } const p = { number: ++n, ...pr }; prs.push(p); made.push(p); return { number: p.number }; },
    mergePlain: (r, num, opts) => {
      assert.match(opts.noReview, /found marks only, no code/);
      if (fails > 0) { fails--; throw new Fail('the gate did not finish in time'); }
      const p = prs.find((x) => x.number === num);
      git(['fetch', '-q', 'origin', `+refs/heads/${p.head}:refs/remotes/origin/${p.head}`], { cwd: root });
      git(['push', '-q', 'origin', `refs/remotes/origin/${p.head}:refs/heads/tranche`], { cwd: root });
      git(['fetch', '-q', 'origin'], { cwd: root });
      prs.splice(prs.indexOf(p), 1);
      return { ok: true };
    },
  };
  return { io, prs, made, closed, conflicted };
}
const run = (root, io, opts = {}) => { const out = []; const r = roundNext(root, { io, log: (l) => out.push(String(l)), ...opts }); return { ...r, text: out.join('\n') }; };
const reqAt = (root, id) => git(['show', `origin/tranche:req/${id}.md`], { cwd: root });

// The walk's findings: b (map layer 1) two failures of one flaw and one of another; d (map layer 3,
// its ids pinned) three of one flaw.
const FLAWS = [
  { module: 'b', kind: 'layout', journey: 'j1', message: 'the b button overlaps the footer' },
  { module: 'b', kind: 'layout', journey: 'j2', message: 'the b button overlaps the footer on narrow screens' },
  { module: 'b', kind: 'http-500', detail: 'GET /b returned 500' },
  { module: 'd', kind: 'step', message: 'the d form loses its draft' },
  { module: 'd', kind: 'step', message: 'the d form loses its draft' },
  { module: 'd', kind: 'step', message: 'the d form loses its draft' },
];

test('round next: the findings grouped one entry per distinct flaw, with covers; BOB\'s file over them', () => {
  const e = walkEntries(FLAWS);
  assert.deepEqual(e, [
    { module: 'b', text: 'the b button overlaps the footer', covers: 2 },
    { module: 'b', text: 'http-500: GET /b returned 500', covers: 1 },
    { module: 'd', text: 'the d form loses its draft', covers: 3 },
  ]);
  assert.deepEqual(walkEntries([null, { kind: 'x', message: 'a **R1** b\nnot yet met' }]), [{ module: null, text: 'a walk failure', covers: 1 }, { module: null, text: 'a R1 b not met', covers: 1 }]);
  const lines = parseFindings('# b, as Bob reads it\nb: the footer is laid over the b button\n\nc: c is slow, covers 4\n');
  assert.deepEqual(lines.map((l) => [l.module, l.text, l.covers]), [['b', 'the footer is laid over the b button', null], ['c', 'c is slow', 4]]);
  // b's two entries (3 failures) are one line, which takes all 3; d keeps the walk's; c is added.
  assert.deepEqual(withFile(e, lines).map((x) => [x.module, x.text, x.covers]), [['d', 'the d form loses its draft', 3], ['b', 'the footer is laid over the b button', 3], ['c', 'c is slow', 4]]);
  // One module's flaws of the same words are one finding (found keys them alike); words cut clean.
  assert.deepEqual(walkEntries([{ module: 'b', kind: 'k1', message: 'timeout' }, { module: 'b', kind: 'k2', message: 'timeout' }]), [{ module: 'b', text: 'timeout', covers: 2 }]);
  assert.equal(oneLine(`${'x'.repeat(199)} y`), 'x'.repeat(199));
  assert.equal(oneLine('not  yet\u00a0met'), 'not met');
  assert.throws(() => parseFindings('b the text\n'), /--findings line 1: `<module>: <text>`/);
  assert.throws(() => parseFindings('b: a **F2** mark\n'), /must not hold a mark of its own/);
});

test('round next: a walk with flaws in two map layers opens the lower first and prints its job starts; the higher opens from the same command once it merges', () => {
  const root = product();
  const row = walked(root, { failures: FLAWS, min: 10 });
  const src = `internal walk ${row.slug} ${row.commit.slice(0, 10)}`;
  const { io, made } = gh(root);
  // The dry run: the findings by module, their routes, the layer that opens; nothing written.
  const before = git(['rev-parse', 'origin/tranche'], { cwd: root });
  const d = run(root, io);
  assert.equal(d.state, 'dry');
  assert.match(d.text, /round 1 ended at the internal walk internal-w\d+ \w{10}: 6 finding\(s\), 0 recorded \(dry run: `round next --apply` does it\)/);
  assert.match(d.text, /b \(layer 1\):\n {4}- to record, found mark in req\/b\.md: the b button overlaps the footer \(covers 2\)\n {6}node \.process\/tool\/p3\.mjs found b "the b button overlaps the footer" --from "internal walk internal-w\d+ \w{10}" --covers 2\n {4}- to record, found mark in req\/b\.md: http-500: GET \/b returned 500/);
  assert.match(d.text, /d \(layer 3\):\n {4}- to record, owed reopen \(test\/d\/ids\.test\.mjs pins its ids\): the d form loses its draft \(covers 3\)/);
  assert.match(d.text, /then: tranche tranche · round 2 · layer 1 \(internal layer 4\) opens for b, the lowest layer with a flawed module/);
  assert.equal(git(['rev-parse', 'origin/tranche'], { cwd: root }), before);
  assert.equal(owedReopens(root, loadConfig(root)).length, 0);
  assert.equal(made.length, 0);
  // --apply: d's owed reopen on the state branch, b's two marks in one plain pull request merged,
  // layer 4 (round 2, map layer 1) opened for b, and b's job start printed.
  const a = run(root, io, { apply: true });
  assert.equal(a.state, 'opened');
  assert.equal(a.layer, 4);
  assert.equal(made.length, 1);
  assert.match(made[0].head, /^found\/round-2-internal-w\d+$/);
  assert.match(reqAt(root, 'b'), /- \*\*F1\*\* \*\(not yet met: internal walk internal-w\d+ \w{10}, covers 2\)\* the b button overlaps the footer\n- \*\*F2\*\* \*\(not yet met: internal walk internal-w\d+ \w{10}\)\* http-500: GET \/b returned 500$/);
  assert.deepEqual(owedReopens(root, loadConfig(root)).map((x) => [x.module, x.finding, x.source]), [['d', 'the d form loses its draft', `${src}, covers 3`]]);
  assert.deepEqual(flowRows(root, SB, 4).open.round.mods, ['b']);
  assert.deepEqual(a.startable.map((x) => x.cmd), [`node .process/tool/p3.mjs job start b --sessions <file> --reopen "F1: the b button overlaps the footer (${src}, covers 2); F2: http-500: GET /b returned 500 (${src})"`]);
  assert.match(a.text, /\n {2}node \.process\/tool\/p3\.mjs job start b --sessions <file> --reopen "F1: the b button overlaps the footer/, 'the job start printed');
  assert.doesNotMatch(a.text, /job start d\b/, 'd waits for its own layer');
  assert.match(a.text, /next: BOB starts each job above \(create_session for its session, then the `job start` command\)/);
  // Named as Bob reads it (9 Nov): tranche · round 2 · layer 1, the internal number in parentheses.
  assert.match(a.text, /tranche tranche · round 2 · layer 1 \(internal layer 4\): 1 module\(s\)/);
  assert.equal(layerArg({ _: [], round: '2', layer: '1' }, root), 4);
  assert.equal(layerArg({ _: [], round: '2', 'plan-layer': '1' }, root), 4);
  assert.equal(layerArg({ _: ['4'] }, root), '4');
  assert.throws(() => layerArg({ _: [], round: '2', 'plan-layer': '2' }, root), /no layer is tranche tranche · round 2 · layer 2/);
  assert.throws(() => layerArg({ _: ['4'], round: '2', 'plan-layer': '1' }, root), /name the layer once/);
  // Again, while the layer is open: its jobs, nothing recorded twice.
  const again = run(root, io, { apply: true });
  assert.deepEqual([again.state, again.layer], ['layer', 4]);
  assert.equal(made.length, 1);
  // b's job meets its marks; layer 4 merges: round 2's next layer is d's (map layer 3), from the same command.
  push(root, { 'req/b.md': `${req('b')}- **F1** met\n- **F2** met\n` }, 'b met');
  merged(root, 4, 30);
  // The round's next layer, not yet open, by its round and layer (--layer, or --plan-layer).
  assert.equal(layerArg({ _: [], round: '2', 'plan-layer': '3' }, root), 5);
  const nxt = run(root, io, { apply: true });
  assert.deepEqual([nxt.state, nxt.layer, nxt.round], ['opened', 5, 2]);
  assert.deepEqual(flowRows(root, SB, 5).open.round.mods, ['d']);
  assert.match(nxt.startable[0].cmd, /^node \.process\/tool\/p3\.mjs job start d --sessions <file> --reopen "O1: the d form loses its draft \(internal walk internal-w\d+ \w{10}, covers 3; owed reopen: add it as your own F mark and admit it in test\/d\/ids\.test\.mjs\)"$/);
});

test('round next: run again after a partial run, it goes on where it stopped', () => {
  const root = product();
  walked(root, { failures: FLAWS, min: 10 });
  const { io, made, prs } = gh(root, { failMerge: 1 });
  // The merge of the marks' pull request fails: the owed reopen is recorded, the pull request open.
  assert.throws(() => run(root, io, { apply: true }), /the gate did not finish in time/);
  assert.equal(owedReopens(root, loadConfig(root)).length, 1);
  assert.equal(prs.length, 1);
  assert.equal(flowRows(root, SB, 4).open, null);
  // The dry run sees both: the reopen recorded, the marks in the open pull request.
  const d = run(root, io);
  assert.match(d.text, /- recorded, owed reopen/);
  assert.match(d.text, /- in an open pull request, found mark in req\/b\.md: the b button overlaps the footer/);
  // Again: no second pull request, no second owe; the open one is merged and the layer opens.
  const a = run(root, io, { apply: true });
  assert.equal(made.length, 1);
  assert.equal(prs.length, 0);
  assert.equal(owedReopens(root, loadConfig(root)).length, 1);
  assert.deepEqual([a.state, a.layer], ['opened', 4]);
  assert.equal((reqAt(root, 'b').match(/\*\*F\d\*\*/g) || []).length, 2, 'each mark once');
});

test('round next: the marks pushed and their pull request not opened: a re-run opens it from that branch, pushing no second one', () => {
  const root = product();
  walked(root, { failures: FLAWS.slice(0, 3), min: 10 });
  const { io, made } = gh(root, { failCreate: 1 });
  assert.throws(() => run(root, io, { apply: true }), /GitHub did not return a pull request/);
  const heads = () => git(['ls-remote', '--heads', 'origin', 'refs/heads/found/*'], { cwd: root }).split('\n').filter(Boolean).length;
  assert.equal(heads(), 1);
  const a = run(root, io, { apply: true });
  assert.deepEqual([a.state, a.layer], ['opened', 4]);
  assert.equal(heads(), 1, 'no second branch');
  assert.equal(made.length, 1);
  assert.match(a.text, /was pushed by an earlier run with no pull request: pull request \d+ opened from it/);
  assert.equal((reqAt(root, 'b').match(/\*\*F\d\*\*/g) || []).length, 2, 'each mark once');
});

test('round next: a conflicted marks pull request is closed and the marks cut again; a printed found act\'s number is skipped; findings recorded under other words wait on BOB', () => {
  const root = product();
  const row = walked(root, { failures: FLAWS.slice(0, 3), min: 10 });
  // BOB's own `found b ...` act, its branch pushed with F1 and not yet merged: round next numbers past it.
  git(['push', '-q', 'origin', 'origin/tranche:refs/heads/found/b-f1'], { cwd: root });
  git(['checkout', '-q', '-b', 'fb', 'origin/tranche'], { cwd: root });
  commit(root, { 'req/b.md': `${req('b')}- **F1** *(not yet met: review)* other\n` }, 'found b F1');
  git(['push', '-q', '-f', 'origin', 'fb:refs/heads/found/b-f1'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const { io, prs, closed, conflicted, made } = gh(root, { failMerge: 1 });
  assert.throws(() => run(root, io, { apply: true }), /the gate did not finish/);
  assert.match(git(['show', `origin/${made[0].head}:req/b.md`], { cwd: root }), /\*\*F2\*\*[^\n]*the b button[^\n]*\n- \*\*F3\*\*/);
  // The tranche moves under it: GitHub finds it conflicted; the re-run closes it and cuts the marks again.
  conflicted.add(prs[0].number);
  const a = run(root, io, { apply: true });
  assert.deepEqual(closed, [made[0].number]);
  assert.equal(made.length, 2);
  assert.match(made[1].head, /^found\/round-2-internal-w\d+-2$/);
  assert.deepEqual([a.state, a.layer], ['opened', 4]);
  // A walk whose findings are part recorded by hand, in other words: nothing is recorded again.
  const root2 = product();
  const r2 = walked(root2, { failures: FLAWS.slice(0, 3), min: 10 });
  push(root2, { 'req/b.md': `${req('b')}- **F1** *(not yet met: internal walk ${r2.slug} ${r2.commit.slice(0, 10)})* b's footer, as BOB put it\n` });
  const g2 = gh(root2);
  const d = run(root2, g2.io);
  assert.match(d.text, /1 finding\(s\) of this walk are recorded under other words[^\n]*the 2 not yet recorded/);
  assert.throws(() => run(root2, g2.io, { apply: true }), /recorded under other words[^\n]*; nothing was recorded/);
  assert.equal(g2.made.length, 0);
  void row;
});

test('round next: PD-16, a deploy dev run whose internal walk found flaws sets its live arm aside; findings no module owns wait on BOB\'s file', () => {
  const root = product();
  walked(root, { row: 'dev-deploy', failures: [{ module: 'c', kind: 'step', message: 'c 404s' }, { kind: 'step', message: 'somewhere' }], live: 7, min: 10 });
  const { io, made } = gh(root);
  const d = run(root, io);
  assert.match(d.text, /2 finding\(s\), 0 recorded; the live arm's 7 set aside: its internal walk found flaws, so they hold no round \(PD-16\)/);
  assert.doesNotMatch(d.text, /- to record[^\n]*the live arm/);
  assert.match(d.text, /\(no module\):\n {4}- to record, no module: somewhere/);
  assert.match(d.text, /1 finding\(s\) name no known module \(somewhere\): give their modules in a file of `<module>: <text>` lines/);
  assert.throws(() => run(root, io, { apply: true }), /name no known module[^\n]*; nothing was recorded/);
  assert.equal(made.length, 0);
  // BOB's file places it; the round opens at c's map layer.
  const f = join(mkdtempSync(join(tmpdir(), 'p3-findings-')), 'f.txt');
  writeFileSync(f, 'b: the b page is somewhere it should not be\n');
  const a = run(root, io, { apply: true, findingsFile: f });
  assert.deepEqual([a.state, a.layer], ['opened', 4]);
  assert.deepEqual(flowRows(root, SB, 4).open.round.mods, ['b'], 'b (map layer 1) first; a, the live arm\'s module, not flawed');
  assert.match(reqAt(root, 'c'), /\*\*F1\*\* \*\(not yet met: internal walk internal-w\d+ \w{10}\)\* c 404s$/);
  assert.match(reqAt(root, 'b'), /\*\*R3\*\* c\n- \*\*F1\*\* \*\(not yet met: internal walk internal-w\d+ \w{10}\)\* the b page is somewhere it should not be$/);
  assert.equal(reqAt(root, 'a'), req('a').trimEnd(), 'the live arm\'s findings recorded nowhere');
});

test('round next: a clean walk opens no round and prints the release path', () => {
  const root = product();
  push(root, { 'process/config.json': { merge_strategy: 'layer', release: { checks: [['true']], assemble: ['true'], out: 'out/rel' } } }, 'releases cut');
  walked(root, { failures: [], min: 10 });
  const r = run(root, gh(root).io, { apply: true });
  assert.equal(r.state, 'clean');
  assert.match(r.text, /the walk internal-w\d+ \w{10} is clean: no round opens; the release path is next \(round 1's internal walk internal-w\d+ \w{10} is clean, and no release is cut since\): node \.process\/tool\/p3\.mjs release dev, from a clean checkout of the tranche tip/);
  assert.equal(flowRows(root, SB, 4).open, null);
  // Under plan close no round opens: round next says so, whatever the walk found.
  push(root, { 'process/config.json': { merge_strategy: 'layer', plan: 'close' } }, 'plan close');
  assert.throws(() => run(root, gh(root).io), /the plan is close on tranche: the current round is the last, and no round opens/);
});

// The rehearsal: the round loop end to end on a fixture product, the round's walks the real `walk
// round` (an internal walk whose report names a flaw in b and in d until each is fixed), so a cycle
// like C44's (found, job start and layer open each waiting on another) is caught here, not in the product.
const node = (code) => ['node', '-e', code];
const GUARD = 'p3dev guard: passed';
const WALKER = node(`const fs = require('fs'); fs.mkdirSync('out', { recursive: true }); const f = [];
if (!fs.existsSync('fixed-b')) f.push({ module: 'b', kind: 'layout', message: 'the b button overlaps the footer' }, { module: 'b', kind: 'layout', message: 'the b button overlaps the footer' });
if (!fs.existsSync('fixed-d')) f.push({ module: 'd', kind: 'step', message: 'the d form loses its draft' });
fs.writeFileSync('out/report.json', JSON.stringify({ steps: [{ ok: !f.length }], failures: f })); process.exit(f.length ? 1 : 0);`);
test('round next rehearsal: round close walk with flaws, round next, jobs, layer merge, the next layer, the round\'s walk clean, the release path', () => {
  const root = product();
  push(root, { 'process/config.json': { merge_strategy: 'layer', deploy: { slug_prefix: 'p3dev-', dry_run: [node(`console.log(${JSON.stringify(GUARD)})`)], deploy: [node('1')], walk: [node('1')], guard_line: GUARD, internal_walk: { run: WALKER, reports: ['out/report.json'] } } }, 'out/.gitignore': '*\n' }, 'the internal walk');
  const { io } = gh(root);
  const walkIO = { compare: () => null, status: { openPRs: () => [], checkRun: () => null, compare: () => null } };
  const tip = () => { git(['checkout', '-q', 'tranche'], { cwd: root }); git(['merge', '-q', '--ff-only', 'origin/tranche'], { cwd: root }); };
  const walk = () => { tip(); const out = []; const r = walkRound(root, { io: walkIO, repo: 'o/p', log: (l) => out.push(String(l)) }); return { ...r, text: out.join('\n') }; };
  const now = () => new Date().toISOString();
  const mergedNow = (n) => { writeRows(root, SB, `merged ${n}`, [[`layerflow/${n}/merged.json`, { row: 'merged', layer: n, commit: 'f'.repeat(40), at: now() }]]); fetchState(root, SB, { fresh: true }); };
  // Round 1 closed: its walk finds flaws in b (map layer 1) and d (map layer 3, pinned); it names round next.
  const w1 = walk();
  assert.equal(w1.ok, false);
  assert.match(w1.text, /the one next act: `node \.process\/tool\/p3\.mjs round next`/);
  const o4 = run(root, io, { apply: true });
  assert.deepEqual([o4.state, o4.layer, o4.startable.map((x) => x.id)], ['opened', 4, ['b']]);
  assert.match(o4.startable[0].cmd, /--reopen "F1: the b button overlaps the footer \(internal walk internal-l3 \w{10}, covers 2\)"/);
  // b's job: its mark met and its fix; layer 4 merges; the same command opens d's layer.
  push(root, { 'req/b.md': `${req('b')}- **F1** met\n`, 'fixed-b': 'x\n' }, 'b fixed');
  mergedNow(4);
  const o5 = run(root, io, { apply: true });
  assert.deepEqual([o5.state, o5.layer, o5.startable.map((x) => x.id)], ['opened', 5, ['d']]);
  assert.match(o5.startable[0].cmd, /--reopen "O1: the d form loses its draft \(internal walk internal-l3 \w{10}; owed reopen/);
  // d's job takes its owed reopen as its own F mark, met; layer 5 merges: the round's walk is owed.
  push(root, { 'req/d.md': `${req('d')}- **F1** met\n`, 'fixed-d': 'x\n' }, 'd fixed');
  mergedNow(5);
  const w = run(root, io, { apply: true });
  assert.equal(w.state, 'walk');
  assert.match(w.text, /every layer of round 2 has merged: its walk ends it, the round-close run/);
  // Round 2's walk is clean: no round 3; the release path.
  const w2 = walk();
  assert.equal(w2.ok, true);
  const c = run(root, io, { apply: true });
  assert.equal(c.state, 'clean');
  assert.match(c.text, /no round opens; the release path follows/);
  assert.equal(flowRows(root, SB, 6).open, null);
});
