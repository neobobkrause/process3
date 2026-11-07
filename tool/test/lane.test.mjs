// SES-14 lanes (lane ask) and PLN-4's completion round (status --role bob, tranche close).
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseCompletion } from '../lib/completion.mjs';
import { LANES_FILE, laneAsk, openAsks } from '../lib/lane.mjs';
import { status } from '../lib/status.mjs';
import { trancheClose } from '../lib/tranche.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { commit, entry, makeRepo, openPassed } from './helpers.mjs';

const quiet = () => {};
const slug = 'o/p';
const io = { compare: () => null, status: { openPRs: () => [], checkRun: () => null, compare: () => null, prFiles: () => [] } };

function withOrigin(files) {
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  return { root, bare };
}

test('lane ask: refused until the lane names its directory; the brief carries the directory, the context, the output and the boundaries', () => {
  const none = makeRepo({ 'README.md': 'x\n' });
  assert.deepEqual(loadConfig(none).lanes, [{ name: 'ux', dir: null }]);
  assert.throws(() => laneAsk(none, 'ux', 'which?', { log: quiet }), /lane ux names no directory/);
  assert.throws(() => laneAsk(none, 'ai', 'which?', { log: quiet }), /no lane "ai".*the lanes are ux/);

  const { root, bare } = withOrigin({
    'process/config.json': { lanes: [{ name: 'ux', dir: 'design/ux/' }] },
    'design/ux/README.md': 'principles\n', 'design/ux/screens/a.md': 'screen a\n', 'build/q.md': 'context\n',
    'design/ux-research/index.md': 'index\n', 'design/ux-research/qualification-2026-11-06.md': 'record\n',
  });
  assert.throws(() => laneAsk(root, 'ux', 'which?', { context: 'build/nope.md', log: quiet }), /--context build\/nope\.md: no such file/);
  const out = [];
  const r = laneAsk(root, 'ux', 'Where does  sign-in go?', { context: ['build/q.md'], log: (m) => out.push(m) });
  const text = out.join('\n');
  assert.match(text, /recorded open on process-state:lanes\/asks\.jsonl/);
  assert.match(text, /BOB's act: start one read-only worker \(a subagent; no long-lived session\)/);
  assert.match(text, /lane ask ux 'Where does sign-in go\?' --record '<the decision/);
  assert.match(r.brief, /The lane's directory `design\/ux\/`: 2 files, 20 bytes/);
  assert.match(r.brief, /- `build\/q\.md` 8/);
  assert.match(r.brief, /- decision: <one line>\n- why: .*\n- what changes in `design\/ux\/`/);
  assert.match(r.brief, /Read only: .* BOB keeps the final say; you approve and merge nothing/);
  assert.match(r.brief, /\.process\/rulebooks\/worker\.md/);
  const cfg = loadConfig(root);
  assert.equal(openAsks(root, cfg).length, 1);
  // Asked again while open: no second row.
  assert.equal(laneAsk(root, 'ux', 'Where does sign-in go?', { log: quiet }).already, true);
  assert.equal(git(['show', `process-state:${LANES_FILE}`], { cwd: bare }).split('\n').length, 1);

  // status --role bob lists it until the decision is recorded.
  openPassed(root);
  const s = [];
  status(root, { role: 'bob', offline: true, log: (m) => s.push(m) });
  assert.match(s.join('\n'), /open lane questions .*\n- ux: "Where does sign-in go\?", asked/);

  assert.throws(() => laneAsk(root, 'ux', 'Where is sign-in?', { record: 'top bar', worker: 'a1', log: quiet }), /no open ux question reads "Where is sign-in\?"; nothing recorded\. Open: "Where does sign-in go\?"/);
  assert.throws(() => laneAsk(root, 'ux', 'Where does sign-in go?', { record: 'top bar', log: quiet }), /--record needs --worker/);
  assert.throws(() => laneAsk(root, 'ux', 'Where does sign-in go?', { record: 'top bar', worker: 'a1', cost: 'lots', log: quiet }), /--cost-usd/);
  const d = laneAsk(root, 'ux', 'Where does sign-in go?', { record: 'the top bar', worker: 'agent-1', cost: '0.42', log: quiet });
  assert.deepEqual([d.row.lane, d.row.decision, d.row.worker, d.row.cost_usd], ['ux', 'the top bar', 'agent-1', 0.42]);
  assert.equal(openAsks(root, cfg).length, 0);
  const s2 = [];
  status(root, { role: 'bob', offline: true, log: (m) => s2.push(m) });
  assert.doesNotMatch(s2.join('\n'), /open lane questions/);
  // Asked again after its decision: open again.
  laneAsk(root, 'ux', 'Where does sign-in go?', { log: quiet });
  assert.equal(openAsks(root, cfg).length, 1);
});

test('the completion file: open, done and deferred items; module or whole product', () => {
  const items = parseCompletion([
    '# Completion round', '',
    '- [ ] C-1 · signatures · the catalogue keys',
    '- [x] C-2 · mail-reader · R6 tested whole',
    '- [ ] C-3 | whole product | the release walk',
    '- [ ] C-4 · runtime-limits · grade_read lowered; deferred: waits on the ranged-grading report',
    '- a plain line', '- [ ] C-5 - onboarding - copy',
  ].join('\n'));
  assert.deepEqual(items.map((x) => [x.id, x.target, x.whole, x.done, x.deferred]), [
    ['C-1', 'signatures', false, false, null],
    ['C-2', 'mail-reader', false, true, null],
    ['C-3', 'whole product', true, false, null],
    ['C-4', 'runtime-limits', false, false, 'waits on the ranged-grading report'],
    ['line 8', null, false, false, null],
  ]);
  assert.equal(items.at(-1).malformed, true);
});

const LAYERS = '| Layer | Modules |\n|---|---|\n| 1 | a |\n';
const ROUND = '- [ ] C-1 · a · its last fix\n- [ ] C-2 · whole product · the release walk\n- [ ] C-3 · b · later; deferred: Bob, 4 Nov\n';

test('completion round: status lists open items once every layer is closed; tranche close refuses until each is done or deferred', () => {
  const base = { 'build/layers.md': LAYERS, 'build/requirements/a.md': 'all met\n', 'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md', status: { state: 'COMPLETE' } }) };
  // Without the key: unchanged.
  const plain = withOrigin(base);
  openPassed(plain.root);
  const p = [];
  assert.deepEqual(status(plain.root, { role: 'bob', offline: true, log: (m) => p.push(m) }).next, []);
  assert.doesNotMatch(p.join('\n'), /completion round/);
  assert.ok(trancheClose(plain.root, { slug, io, log: quiet }).ok);

  const { root } = withOrigin({ ...base, 'process/config.json': { completion_file: 'build/plan/round.md' }, 'build/plan/round.md': ROUND });
  openPassed(root);
  const out = [];
  const s = status(root, { role: 'bob', offline: true, log: (m) => out.push(m) });
  const text = out.join('\n');
  assert.match(text, /next work, the completion round \(build\/plan\/round\.md, 2 open/);
  assert.match(text, /- C-1 · a: node \.process\/tool\/p3\.mjs job start a --live <n> · its last fix/);
  assert.match(text, /- C-2 · whole product: BOB's act · the release walk/);
  assert.doesNotMatch(text, /C-3/);
  assert.deepEqual(s.next.map((x) => x.item), ['C-1', 'C-2']);
  assert.throws(() => trancheClose(root, { slug, io, log: quiet }), /completion round not done: C-1 \(a\), C-2 \(whole product\) open in build\/plan\/round\.md/);

  // A layer still open: no completion work listed.
  const early = withOrigin({ ...base, 'build/requirements/a.md': '- **R1** *(not yet met: x)* t\n', 'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md' }), 'process/config.json': { completion_file: 'build/plan/round.md' }, 'build/plan/round.md': ROUND });
  openPassed(early.root);
  const e = [];
  status(early.root, { role: 'bob', offline: true, log: (m) => e.push(m) });
  assert.doesNotMatch(e.join('\n'), /completion round/);

  // Each done or deferred: the close goes on.
  commit(root, { 'build/plan/round.md': '- [x] C-1 · a · done\n- [ ] C-2 · whole product · walk; deferred: next tranche (Bob)\n- [ ] C-3 · b · later; deferred: Bob, 4 Nov\n' });
  git(['push', '-q', 'origin', 'HEAD:tranche'], { cwd: root });
  const done = [];
  status(root, { role: 'bob', offline: true, log: (m) => done.push(m) });
  assert.match(done.join('\n'), /completion round: every item of build\/plan\/round\.md done or deferred/);
  assert.ok(trancheClose(root, { slug, io, log: quiet }).ok);

  // An unticked line off the form: open, never dropped.
  commit(root, { 'build/plan/round.md': '- [x] C-1 · a · done\n- [ ] C-5 - onboarding copy\n' });
  git(['push', '-q', 'origin', 'HEAD:tranche'], { cwd: root });
  const bad = [];
  status(root, { role: 'bob', offline: true, log: (m) => bad.push(m) });
  assert.match(bad.join('\n'), /- build\/plan\/round\.md:2: not an item line .*; fix it: - \[ \] C-5 - onboarding copy/);
  assert.throws(() => trancheClose(root, { slug, io, log: quiet }), /completion round not done: line 2 \(not an item line\)/);

  // The key set, the file missing from the tranche: refused.
  commit(root, { 'process/config.json': { completion_file: 'build/plan/gone.md' } });
  git(['push', '-q', 'origin', 'HEAD:tranche'], { cwd: root });
  assert.throws(() => trancheClose(root, { slug, io, log: quiet }), /completion_file build\/plan\/gone\.md is not on origin\/tranche/);
});
