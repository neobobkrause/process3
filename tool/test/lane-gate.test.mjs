// Lanes' file changes are not tested the way a job's are (Bob, 5 Nov): a pull request changing only
// one lane's folder (and records) takes the gate's records-only path; lane-folder paths count as
// records when the gate asks whether a job's head changed since its green run, and in the tranche's
// cover; a change to any other file is judged as today.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gate as gateRun, gateComment, trancheCover } from '../lib/gate.mjs';
import { BOT, GATE, RECEIPT, block, parseBlock } from '../lib/github.mjs';
import { git, isRecordOrLane, laneDirs, laneOfPath, laneOnly, loadConfig } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const gate = (root, o) => { const r = gateRun(root, o); if (o.pr) o.io.addComment(o.slug, o.pr, gateComment(r.run)); return r; };
const quiet = () => {};
const realTest = "import test from 'node:test'; import a from 'node:assert'; import { x } from '../../src/alpha/index.mjs';\ntest('x is 2', () => a.equal(x, 2));\n";
const LANES = [{ name: 'ux', dir: 'design/ux', module: 'ux-design' }, { name: 'ai', dir: 'design/ai' }];

function setup({ cfg = {}, alpha = {} } = {}) {
  const root = makeRepo({
    'process/config.json': { lanes: LANES, ...cfg },
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'WORKING' }, ...alpha }),
    'src/alpha/index.mjs': 'export const x = 1;\n',
    'test/alpha/old.test.mjs': "import test from 'node:test'; test('nothing', () => {});\n",
    'design/ux/words.json': '{}\n', 'design/ai/notes.md': 'a\n',
  });
  git(['branch', 'tranche'], { cwd: root });
  return { root, base: git(['rev-parse', 'HEAD'], { cwd: root }) };
}
function fakeIO(receipt) {
  const state = { comments: receipt ? [{ id: 1, body: block(RECEIPT, receipt), user: { login: 'civicsmith' } }] : [], genuine: new Set() };
  const key = (r) => `${r.at}|${r.sha}|${r.trigger}`;
  return { state, io: {
    comments: () => state.comments, getPR: () => ({ user: { login: 'civicsmith' } }),
    addComment: (s, n, body) => { state.comments.push({ id: state.comments.length + 1, body, user: { login: BOT } }); for (const r of parseBlock(body, GATE)?.runs || []) state.genuine.add(key(r)); return {}; },
    verify: (s, r) => state.genuine.has(key(r)),
  } };
}
const onBranch = (s, branch, files) => { git(['checkout', '-q', '-b', branch], { cwd: s.root }); return commit(s.root, files); };
const run = (s, head, branch, io = fakeIO()) => gate(s.root, { base: s.base, head, branch, pr: 7, slug: 'o/r', io: io.io, log: quiet });

test('a pull request inside one lane\'s folder takes the records-only path: no suite, no install, no build', () => {
  const s = setup();
  const head = onBranch(s, 'lane/ux', { 'design/ux/words.json': '{"a":1}\n', 'design/ux/gen.mjs': 'x\n' });
  const r = run(s, head, 'lane/ux');
  assert.deepEqual([r.run.trigger, r.run.suite, r.run.lane, r.findings.length], ['record', 'skipped', 'ux', 0]);
  assert.equal(r.run.scope, undefined);
});

test('a lane pull request touching any file outside its folder is judged as today, the module\'s suite run', () => {
  const s = setup();
  const head = onBranch(s, 'lane/ux', { 'design/ux/words.json': '{"a":2}\n', 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const r = run(s, head, 'lane/ux');
  assert.equal(r.run.trigger, 'code');
  assert.deepEqual(r.run.scope, ['alpha']);
  assert.equal(r.run.lane, undefined);
  // Two lanes' folders in one pull request: no one lane's, so not the lane path either.
  const t = setup();
  const h2 = onBranch(t, 'lane/ux', { 'design/ux/words.json': '{"b":1}\n', 'design/ai/notes.md': 'b\n' });
  const r2 = run(t, h2, 'lane/ux');
  assert.equal(r2.run.trigger, 'code');
  assert.equal(r2.run.lane, undefined);
});

test('a lane folder file another module owns is that module\'s: its change runs that module\'s suite', () => {
  const s = setup({ alpha: { paths: ['src/alpha/', 'design/ux/alpha-words.json'] } });
  const head = onBranch(s, 'lane/ux', { 'design/ux/alpha-words.json': '{}\n' });
  const r = run(s, head, 'lane/ux');
  assert.equal(r.run.trigger, 'code');
  assert.deepEqual(r.run.scope, ['alpha']);
});

test('a lane commits no generated output; a job\'s or the tranche\'s pull request never takes the lane path', () => {
  const s = setup({ cfg: { generated: [{ paths: ['design/ux/out/'], regenerate: ['node', 'gen.mjs'], verify: ['node', 'gen.mjs', '--check'] }] } });
  const head = onBranch(s, 'lane/ux', { 'design/ux/out/table.json': '{}\n' });
  const r = run(s, head, 'lane/ux');
  assert.ok(r.findings.some((f) => f.check === 'generated' && /lane ux does not commit it: it is built at layer close, deploy and release/.test(f.message)));
  // A job changing only a lane's folder is a job's change: ownership as today, no lane path.
  const j = setup();
  const h2 = onBranch(j, 'job/alpha', { 'design/ux/words.json': '{"c":1}\n' });
  const r2 = run(j, h2, 'job/alpha');
  assert.equal(r2.run.lane, undefined);
  assert.ok(r2.findings.some((f) => f.check === 'ownership'));
});

test('a lane\'s land after a job\'s green run is a record for the job: record-since-green; any other change is not', () => {
  const s = setup();
  const h1 = onBranch(s, 'job/alpha', { 'src/alpha/index.mjs': 'export const x = 2;\n', 'test/alpha/x.test.mjs': realTest });
  const io = fakeIO({ kind: 'receipt', module: 'alpha', attempt: 1, sha: h1, commands: [{ cmd: 'node --test', exit: 0, suite: true }], exempt: {} });
  assert.equal(run(s, h1, 'job/alpha', io).run.trigger, 'code');
  // The tranche brought in a lane's land: lane folder files only.
  const h2 = commit(s.root, { 'design/ux/words.json': '{"d":1}\n', 'design/ai/notes.md': 'd\n' });
  const r2 = run(s, h2, 'job/alpha', io);
  assert.deepEqual([r2.run.trigger, r2.run.after], ['record-since-green', h1]);
  // A non-lane file since the green run: the suite again.
  const h3 = commit(s.root, { 'src/beta/b.mjs': 'b\n' });
  assert.equal(run(s, h3, 'job/alpha', io).run.trigger, 'code');
});

test('the tranche\'s cover asks no suite for a lane\'s folder; the predicates hold only for real lane folders', () => {
  const cfg = { records: ['process/metrics/'], lanes: [...LANES, { name: 'root', dir: '.' }, { name: 'proc', dir: 'process/x' }, { name: 'up', dir: '../x' }] };
  assert.deepEqual(laneDirs(cfg).map((l) => l.name), ['ux', 'ai']);
  const ux = entry('ux-design', { paths: ['design/ux/'] });
  const alpha = entry('alpha', { paths: ['src/alpha/', 'design/ux/a.json'] });
  assert.equal(laneOfPath(cfg, 'design/ux/w.json', [ux, alpha]), 'ux');
  assert.equal(laneOfPath(cfg, 'design/ux/a.json', [ux, alpha]), null);
  assert.equal(laneOfPath(cfg, 'design/uxx/w.json', []), null);
  assert.equal(laneOnly(cfg, ['design/ux/w.json', 'process/metrics/m.jsonl'], [ux]), 'ux');
  assert.equal(laneOnly(cfg, ['process/metrics/m.jsonl'], []), null);
  assert.equal(laneOnly(cfg, ['design/ux/w.json', 'design/ai/n.md'], []), null);
  assert.equal(laneOnly(cfg, ['design/ux/w.json', 'src/x.mjs'], []), null);
  assert.equal(isRecordOrLane(cfg, 'process/config.json', []), false);
  const s = setup();
  const c = trancheCover(s.root, { ...loadConfig(s.root), lanes: LANES }, { head: s.base, mb: s.base, changed: ['design/ux/words.json'], entries: [ux], slug: null, io: {} });
  assert.deepEqual(c.uncovered, []);
});
