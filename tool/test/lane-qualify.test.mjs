// Lane qualification (SES-14; Bob, 6 Nov): "a lane is fully qualified to fulfill their role as the
// load-bearing source of truth in their area. So the first time a lane is defined and run, it
// should start by using workers to fully research canon documents, existing code, and best
// practices related to their specialty area. This initial and ongoing research should be recording
// in a lane-specific area of the product repo for subsequent sessions to draw from and evolve."
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { startText } from '../lib/job.mjs';
import { LANES_FILE, laneAsk, laneEnd, laneForStart, laneStart, lanes, qualification } from '../lib/lane.mjs';
import { git, laneDirs, laneOfPath, laneOnly, loadConfig } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const S1 = 'session_q1';
function withOrigin(files) {
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  return { root, bare };
}
const asksOn = (bare) => git(['show', `process-state:${LANES_FILE}`], { cwd: bare, allowFail: true }).stdout;

test('a lane\'s research area: the sibling <dir>-research by default, or its "research"; never inside or around dir, a generated path, or a governed folder; none for a triage lane', () => {
  assert.equal(lanes({ lanes: [{ name: 'ux', dir: 'docs/ux-substrate/' }] })[0].research, 'docs/ux-substrate-research');
  assert.equal(lanes({ lanes: [{ name: 'ux', dir: 'docs/ux', research: './docs/lanes/ux-research/' }] })[0].research, 'docs/lanes/ux-research');
  for (const research of ['docs/ux/research', 'docs', 'process/ux', '.github/r', '../r', '.']) assert.throws(() => lanes({ lanes: [{ name: 'ux', dir: 'docs/ux', research }] }), /cannot be its research area/, research);
  assert.throws(() => lanes({ lanes: [{ name: 'ux', dir: 'docs/ux', research: '' }] }), /research is a folder in the product/);
  assert.throws(() => lanes({ generated: [{ paths: ['docs/ux-research/big.json'] }], lanes: [{ name: 'ux', dir: 'docs/ux' }] }), /holds the generated path docs\/ux-research\/big\.json: research is never what the build reads/);
  assert.throws(() => lanes({ lanes: [{ name: 't', dir: 'triage', kind: 'triage', research: 'r' }] }), /triage lane: its register is its record/);
  assert.equal(lanes({ lanes: [{ name: 't', dir: 'triage', kind: 'triage' }] })[0].research, null);
  assert.equal(laneDirs({ lanes: [{ name: 't', dir: 'triage', kind: 'triage' }] })[0].research, null);
  // Review: only a folder named research or *-research; never a source folder or a root build file.
  for (const research of ['src', 'package.json', 'docs/researcher']) assert.throws(() => lanes({ lanes: [{ name: 'ux', dir: 'docs/ux', research }] }), /cannot be its research area/, research);
  assert.equal(lanes({ lanes: [{ name: 'ux', dir: 'docs/ux', research: 'notes/research' }] })[0].research, 'notes/research');
  assert.throws(() => lanes({ lanes: [{ name: 'ux', research: 'docs/ux-research' }] }), /sets research but no dir/);
  // Nor another lane's folders, either way round.
  assert.throws(() => lanes({ lanes: [{ name: 'a', dir: 'ui' }, { name: 'b', dir: 'ui-research' }] }), /overlaps another lane's dir or research/);
  assert.throws(() => lanes({ lanes: [{ name: 'a', dir: 'docs', research: 'other-research' }, { name: 'b', dir: 'other-research/x' }] }), /overlaps another lane's/);
  // The gate (laneDirs alone, from the base config) drops what lanes() refuses, never widens.
  assert.deepEqual(laneDirs({ lanes: [{ name: 'a', dir: 'ui' }, { name: 'b', dir: 'ui-research' }] }).map((x) => x.research), [null, 'ui-research-research']);
  assert.equal(laneDirs({ lanes: [{ name: 'a', dir: 'ui', research: 'src' }] })[0].research, null);
  assert.equal(laneDirs({ lanes: [{ name: 'a', dir: 'ui', kind: 'Triage' }] })[0].research, null);
  assert.equal(laneDirs({ lanes: [{ name: 'a', dir: 'ui', research: ['src'] }] })[0].research, null);
});

test('the gate counts the research area as the lane\'s own folder: a pull request changing only it (and the lane\'s dir) takes the lane-only path', () => {
  const cfg = { records: [], lanes: [{ name: 'ux', dir: 'design/ux', module: 'ux' }, { name: 'ai', dir: 'design/ai', research: 'notes/ai-research' }] };
  assert.equal(laneOfPath(cfg, 'design/ux-research/index.md'), 'ux');
  assert.equal(laneOfPath(cfg, 'notes/ai-research/qualification-2026-11-06.md'), 'ai');
  assert.equal(laneOfPath(cfg, 'design/ai-research/x.md'), null);
  assert.equal(laneOnly(cfg, ['design/ux/a.md', 'design/ux-research/index.md']), 'ux');
  assert.equal(laneOnly(cfg, ['design/ux-research/index.md', 'notes/ai-research/index.md']), null);
  // A research file another module's paths name is that module's, judged as today.
  assert.equal(laneOfPath(cfg, 'design/ux-research/x.md', [entry('other', { paths: ['design/ux-research/'] })]), null);
  assert.equal(laneOfPath(cfg, 'design/ux-research/.github/x.yml'), null);
  // A triage lane's sibling is no lane path; nor is one under an invalid dir; overlapping lanes stay two.
  assert.equal(laneOfPath({ records: [], lanes: [{ name: 't', dir: 'triage', kind: 'triage' }] }, 'triage-research/x.md'), null);
  assert.equal(laneOfPath({ records: [], lanes: [{ name: 'p', dir: 'process/ux' }] }, 'process/ux-research/x.md'), null);
  const two = { records: [], lanes: [{ name: 'a', dir: 'ui' }, { name: 'b', dir: 'ui-research' }] };
  assert.equal(laneOfPath(two, 'ui-research/x.md'), 'b');
  assert.equal(laneOnly(two, ['ui/a.md', 'ui-research/x.md']), null);
});

test('qualification: index and records must be files; an unreadable research area reads as not qualified; a folder already there that is not research is refused', async () => {
  const { mkdirSync, symlinkSync } = await import('node:fs');
  const { root } = withOrigin({ 'process/config.json': { lanes: [{ name: 'ux', dir: 'design/ux' }] }, 'design/ux/a.md': 'a\n', 'design/ux-research/x/keep.md': 'k\n' });
  const l = lanes(loadConfig(root))[0];
  mkdirSync(join(root, 'design/ux-research/index.md'));
  mkdirSync(join(root, 'design/ux-research/qualification-2026-11-06.md'));
  const q = qualification(root, l);
  assert.deepEqual([q.index, q.records.length, q.qualified], [false, 0, false]);
  assert.throws(() => laneStart(root, 'ux', { slug: 'o/p', log: quiet }), /research folder design\/ux-research\/ already holds \d+ file\(s\), and neither index\.md nor a qualification record: it is not the lane's research/);
  symlinkSync(join(root, 'nowhere'), join(root, 'design/ux-research/broken'));
  assert.equal(qualification(root, l).qualified, false);
  });

test('lane start on a lane with no qualification record prints the QUALIFICATION brief; once its index and dated record are in, the research area leads the START', () => {
  const { root } = withOrigin({ 'process/config.json': { lanes: [{ name: 'ux', dir: 'design/ux' }] }, 'design/ux/README.md': 'x\n' });
  const out = [];
  const r = laneStart(root, 'ux', { slug: 'o/p', log: (m) => out.push(m) });
  assert.equal(r.qualified, false);
  assert.match(r.prompt, /## QUALIFICATION: your first work \(Bob, 6 Nov\)/);
  assert.match(r.prompt, /This lane has not qualified \(design\/ux-research\/ is missing or empty\)\. A lane is the load-bearing source of truth in its area, so it is qualified for that before it decides anything/);
  assert.match(r.prompt, /Use workers \(subagents/);
  assert.match(r.prompt, /1\. The canon: the Process3 Foundations .*the product's principles and its docs, and the requirement files of the modules your area serves/);
  assert.match(r.prompt, /2\. The existing code in your area: `design\/ux\/` whole/);
  assert.match(r.prompt, /3\. Best practice in your specialty/);
  assert.match(r.prompt, /`index\.md` .*`qualification-<YYYY-MM-DD>\.md`, the dated record/);
  assert.match(r.prompt, /one pull request that changes only `design\/ux-research\/`: the lane-only path, no suite run/);
  assert.match(out.join('\n'), /lane ux has not qualified .*the START above is its QUALIFICATION brief; lane ask refuses its questions until the qualification pull request is in tranche/);
  assert.ok(Buffer.byteLength(r.prompt) <= 6144, `${Buffer.byteLength(r.prompt)} bytes`);
  laneEnd(root, 'ux', { session: 'pending', why: 'test', log: quiet });

  // An index alone is not a qualification.
  commit(root, { 'design/ux-research/index.md': 'index\n' });
  assert.match(laneStart(root, 'ux', { slug: 'o/p', log: quiet }).prompt, /not qualified \(design\/ux-research\/ holds no qualification-<YYYY-MM-DD>\.md\)/);
  laneEnd(root, 'ux', { session: 'pending', why: 'test', log: quiet });
  // A record without its index neither.
  const noIndex = withOrigin({ 'process/config.json': { lanes: [{ name: 'ux', dir: 'design/ux' }] }, 'design/ux/README.md': 'x\n', 'design/ux-research/qualification-2026-11-06.md': 'r\n' });
  assert.match(laneStart(noIndex.root, 'ux', { slug: 'o/p', log: quiet }).prompt, /not qualified \(design\/ux-research\/index\.md is missing\)/);

  commit(root, { 'design/ux-research/qualification-2026-11-06.md': 'record\n', 'design/ux-research/canon.md': 'canon\n' });
  const q = laneStart(root, 'ux', { slug: 'o/p', log: quiet });
  assert.equal(q.qualified, true);
  assert.doesNotMatch(q.prompt, /QUALIFICATION/);
  assert.match(q.prompt, /## Your research area: read it first\n`design\/ux-research\/` \(3 files, \d+ bytes; qualified 2026-11-06\) is the lane's ground truth/);
  assert.match(q.prompt, /Keep it current as you work/);
  assert.ok(q.prompt.indexOf('Your research area') < q.prompt.indexOf('Your design documents'));
  assert.deepEqual(qualification(root, lanes(loadConfig(root))[0]).records, ['2026-11-06']);
});

test('lane ask refuses an unqualified lane, recording nothing, and says where its qualification stands; a qualified lane\'s brief reads its research area first', () => {
  const { root, bare } = withOrigin({ 'process/config.json': { lanes: [{ name: 'ux', dir: 'design/ux' }] }, 'design/ux/README.md': 'x\n' });
  assert.throws(() => laneAsk(root, 'ux', 'which words?', { log: quiet }), /lane ux has not qualified \(design\/ux-research\/ is missing or empty\): it answers no ask until its qualification lands; start it with .* lane start ux, which qualifies it first; nothing recorded/);
  laneStart(root, 'ux', { slug: 'o/p', log: quiet });
  laneStart(root, 'ux', { record: S1, log: quiet });
  assert.throws(() => laneAsk(root, 'ux', 'which words?', { log: quiet }), /its session session_q1 is qualifying: ask again once its qualification pull request is in tranche and this checkout has it; nothing recorded/);
  assert.equal(asksOn(bare).trim(), '');
  commit(root, { 'design/ux-research/index.md': 'index\n', 'design/ux-research/qualification-2026-11-06.md': 'record\n' });
  laneEnd(root, 'ux', { session: S1, why: 'qualified', log: quiet });
  const r = laneAsk(root, 'ux', 'which words?', { log: quiet });
  assert.match(r.brief, /First, the lane's research area `design\/ux-research\/`: 2 files, 13 bytes, qualified 2026-11-06\. Read its `index\.md`/);
  assert.ok(r.brief.indexOf('research area') < r.brief.indexOf("The lane's directory"));
  assert.match(r.brief, /- research: <what the lane's research area lacks for this question/);
  assert.match(r.brief, /## Reading set \(\d+ bytes\)/);
});

test('a triage lane and the process\'s triage lane need no qualification', () => {
  const { root } = withOrigin({ 'process/config.json': { lanes: [{ name: 'triage', dir: 'triage', kind: 'triage' }] }, 'triage/register.json': '[]\n' });
  const r = laneStart(root, 'triage', { slug: 'o/p', log: quiet });
  assert.equal(r.qualified, null);
  assert.doesNotMatch(r.prompt, /QUALIFICATION|research area/);
  assert.equal(existsSync(join(root, 'triage-research')), false);
});

test('a lane module\'s job START: the research area first, or qualify first', () => {
  const { root } = withOrigin({ 'process/config.json': { lanes: [{ name: 'ux', dir: 'design/ux', module: 'ux-design' }] }, 'design/ux/a.md': 'a\n' });
  const base = { entry: entry('ux-design'), slug: 'o/p', branch: 'job/ux-design', tranche: 'tranche', coordinator: 'session_bob', bob: true, attempt: 1, reading: { files: [], bytes: 0 } };
  const un = laneForStart(root, loadConfig(root), 'ux-design');
  assert.equal(un.research.qualified, false);
  assert.match(startText({ ...base, lane: un }), /The lane has not qualified: `design\/ux-research\/` holds no index\.md and qualification record\. Before you decide any design there, qualify it \(Bob, 6 Nov\)/);
  commit(root, { 'design/ux-research/index.md': 'i\n', 'design/ux-research/qualification-2026-11-06.md': 'r\n' });
  assert.match(startText({ ...base, lane: laneForStart(root, loadConfig(root), 'ux-design') }), /The lane's research area `design\/ux-research\/` is its ground truth: read its index\.md before you decide design there/);
});

// Coordinator, 6 Nov: lane start refused a new lane, "lane investigation's directory
// docs/development/investigation-design/ is not in this checkout", and BOB seeded READMEs by hand
// (copy 668, 669). The seeding step is printed and the lane starts.
test('lane start on a lane whose folder is not in the product yet prints its seeding step (README and an empty research index) and starts; its START opens with it', () => {
  const { root } = withOrigin({ 'process/config.json': { lanes: [{ name: 'investigation', dir: 'docs/development/investigation-design', module: 'investigation' }] }, 'README.md': 'x\n' });
  const out = [];
  const r = laneStart(root, 'investigation', { slug: 'o/p', log: (m) => out.push(m) });
  assert.deepEqual(r.seed.map((f) => f.file), ['docs/development/investigation-design/README.md', 'docs/development/investigation-design-research/index.md']);
  assert.match(r.seed[0].text, /^# Lane investigation\n\n- Lane: investigation\n- Area: `docs\/development\/investigation-design\/`, the marks of ledger module `investigation`\n- Decision: </);
  assert.equal(r.seed[1].text, '');
  assert.match(out[0], /^Lane investigation's directory docs\/development\/investigation-design\/ is not in tranche yet\. Seed it first: a lane-only pull request into tranche .*adding:\n- docs\/development\/investigation-design\/README\.md:\n    # Lane investigation[\s\S]*\n- docs\/development\/investigation-design-research\/index\.md \(empty\)$/);
  assert.match(r.prompt, /^Lane investigation's directory docs\/development\/investigation-design\/ is not in tranche yet\. Seed it first/);
  assert.ok(r.call, 'the lane starts');
});
