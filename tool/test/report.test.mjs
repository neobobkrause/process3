import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commit, entry, makeRepo } from './helpers.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { BOT, GATE, block } from '../lib/github.mjs';
import { deepen, span, trancheReport } from '../lib/report.mjs';

const LAYERS = '| Layer | Modules |\n|---|---|\n| 1 | `a`, `b` |\n| 2 | c |\n';
const req = (...ids) => `# x\n\n${ids.map(([id, met]) => `- **${id}**${met ? '' : ' *(not yet met: x)*'} text`).join('\n')}\n`;
const jl = (...rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
const NOW = '2099-01-01T00:00:00.000Z';
const at = (h) => new Date(Date.UTC(2026, 10, 1, h)).toISOString();

function fixture() {
  const root = makeRepo({
    'build/layers.md': LAYERS,
    'build/requirements/a.md': req(['R1'], ['R2']),
    'build/requirements/b.md': req(['R1'], ['R2', true]),
    'build/requirements/c.md': req(['R1']),
    'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md' }),
    'process/ledger/b.json': entry('b', { requirements: 'build/requirements/b.md' }),
  });
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: root });
  process.env.GIT_COMMITTER_DATE = '2026-11-01T10:00:00+02:00'; // the tranche opens at 08:00Z
  commit(root, { 'src/a/x.js': 'x\n', 'build/requirements/a.md': req(['R1', true], ['R2']) }, 'code');
  commit(root, {
    'process/metrics/a.jsonl': jl(
      { at: at(1), module: 'a', row: 'attempt', event: 'start', attempt: 1 },
      { at: at(3), module: 'a', row: 'merge', pr: 11 },
    ),
    'process/metrics/a.bob.jsonl': jl({ at: at(2), module: 'a', row: 'attempt', event: 'measured', role: 'job', session: 's_a', cost_usd: 4 }),
    'process/metrics/b.jsonl': jl({ at: at(1), module: 'b', row: 'attempt', event: 'start', attempt: 1 }),
    'process/metrics/bob.bob.jsonl': jl({ at: at(4), module: 'bob', row: 'attempt', event: 'measured', role: 'bob', session: 's_bob', cost_usd: 2 }),
    'process/metrics/refusals.bob.jsonl': jl(
      { at: at(2), module: null, row: 'refusal', id: '1', session: 's_a', act: 'push', depth: 1 },
      { at: at(2), module: null, row: 'refusal', id: '2', session: 's_a', act: 'push', depth: 1 },
      { at: at(2), module: null, row: 'refusal', id: '3', session: 's_x', act: 'merge', depth: 1 },
    ),
  }, 'record');
  delete process.env.GIT_COMMITTER_DATE;
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  return root;
}

const gateComment = (runs) => ({ user: { login: BOT }, created_at: 'x', updated_at: 'x', body: block(GATE, { runs }) });

test('report tranche: every section from the record, and unmeasured where the record lacks it', () => {
  const root = fixture();
  const cfg = loadConfig(root);
  const tip = git(['rev-parse', 'origin/tranche'], { cwd: root });
  const base = git(['rev-parse', 'origin/main'], { cwd: root });
  const state = {
    'metrics/sweep.jsonl': jl({ at: at(5), row: 'sweep', bob_acts: true, bob_quiet_h: 1.5 }, { at: at(6), row: 'sweep' }),
    'addresses/bob.json': JSON.stringify({ session: 's_bob' }),
    'layers/closed.jsonl': jl(
      { row: 'closed', layer: 1, tranche: 'tranche', commit: tip, at: at(7), deferred: { a: ['R2'] } },
      { row: 'closed', layer: 2, tranche: 'tranche', commit: base, at: at(7), deferred: {} },
      { row: 'closed', layer: 2, tranche: 'other', commit: tip, at: at(7), deferred: {} },
    ),
  };
  const md = trancheReport(root, cfg, {
    slug: 'o/r', now: NOW, stateRead: true,
    io: { state: (p) => state[p] ?? null, merged: () => [{ number: 10, merged_at: '2026-11-01T07:30:00Z' }, { number: 11, merged_at: '2026-11-01T09:30:00Z' }, { number: 12, merged_at: '2999-01-02T00:00:00Z' }], comments: () => [gateComment([{ suite: 'pass' }, { suite: 'pass' }])] },
  });
  assert.match(md, /^# Tranche report: tranche/);
  assert.match(md, /still open; measured to now/);
  assert.match(md, /- elapsed: [\d.]+ h/);
  assert.match(md, /Pull requests merged into tranche: 2 \(1 job merges recorded/, 'times compared as instants, not as strings with different offsets');
  assert.ok(md.includes(`### Layer 1 (closed 2026-11-01T07:00:00.000Z at ${tip.slice(0, 10)})`), "this tranche's close, at a commit main lacked");
  assert.match(md, /\| a \| OPEN \| #11 \| 1 \(R1\) \|/);
  assert.match(md, /### Layer 2 \(not closed\)/);
  assert.match(md, /\| a \| layer 1 close \| 1 \| R2 \|/, 'a closed layer\'s deferrals come from its row');
  assert.match(md, /\| c \| tip \| 1 \| R1 \|/);
  assert.doesNotMatch(md, /\| b \| layer 1 close/, 'b deferred nothing at the close');
  // Overhead is metrics report's: a's job $4, BOB's $2 split over a and b (both active), b's job unmeasured.
  assert.match(md, /\| a \| 1 \| \$4\.00 \| unmeasured \| \$1\.00 \| unmeasured \| unmeasured \| \$1\.00 \| 20% \|/);
  assert.match(md, /\| b \| 1 \| unmeasured \|.*\| unmeasured \| reviews, root, gate \|/);
  assert.match(md, /- total cost: \$6\.00/);
  assert.match(md, /\| job \| push \| 2 \|/);
  assert.match(md, /\| unmeasured \| merge \| 1 \|/, 'a session no record names has its role unmeasured');
  assert.match(md, /\| 2026-11-01 \| 1 \| 1\.5 \| 1 \|/);
  assert.match(md, /- sessions per job: unmeasured \(1 of 2 jobs measured: 1\)/);
  assert.match(md, /- gate runs per merged job: 2 \(2 runs over 1 merges\)/);
  assert.match(md, /- record-only commits: 1 of 2 commits in the tranche/);
});

test('report tranche: no state branch, no GitHub, a merged span, no main', () => {
  const root = fixture();
  const cfg = loadConfig(root);
  const md = trancheReport(root, cfg, { now: NOW, io: { merged: () => null, comments: () => { throw new Error('no'); } } });
  assert.match(md, /Pull requests merged into tranche: unmeasured \(GitHub not read\); job merges recorded: 1/);
  assert.match(md, /### Layer 1 \(closed: unmeasured, state branch not read\)/);
  assert.match(md, /\| a \| tip \| 1 \| R2 \|/);
  assert.match(md, /## BOB idle occurrences[\s\S]*?\nunmeasured\n/);
  assert.match(md, /- gate runs per merged job: unmeasured/);
  // Merged into main: closed at the merge commit, opened at the tranche's first commit.
  const first = git(['rev-list', '--reverse', 'origin/main..origin/tranche'], { cwd: root }).split('\n')[0];
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['merge', '-q', '--no-ff', '-m', 'tranche into main', 'tranche'], { cwd: root });
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: root });
  const s = span(root, 'origin/tranche', 'origin/main');
  assert.equal(s.open, git(['log', '-1', '--format=%cI', first], { cwd: root }));
  assert.equal(s.close, git(['log', '-1', '--format=%cI', 'HEAD'], { cwd: root }));
  assert.equal(s.base, git(['rev-parse', 'HEAD^1'], { cwd: root }));
  assert.match(trancheReport(root, cfg, { now: NOW, io: { merged: () => null } }), /closed \(merged into main\)/);
  // No main to compare with: the opening is unmeasured, and so are marks met and record-only commits.
  git(['update-ref', '-d', 'refs/remotes/origin/main'], { cwd: root });
  const bare = trancheReport(root, cfg, { now: NOW, io: { merged: () => null } });
  assert.match(bare, /- opened: unmeasured/);
  assert.match(bare, /- elapsed: unmeasured/);
  assert.match(bare, /\| a \| OPEN \| #11 \| unmeasured \|/);
  assert.match(bare, /- record-only commits: unmeasured/);
});

test('report tranche: a BOB session counts its last cost once in the total', () => {
  const root = fixture();
  commit(root, { 'process/metrics/bob.bob.jsonl': jl(
    { at: at(4), module: 'bob', row: 'attempt', event: 'measured', role: 'bob', session: 's_bob', cost_usd: 2 },
    { at: at(8), module: 'bob', row: 'attempt', event: 'measured', role: 'bob', session: 's_bob', cost_usd: 5 },
  ) }, 'bob again');
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  assert.match(trancheReport(root, loadConfig(root), { now: NOW, io: { merged: () => null } }), /- total cost: \$9\.00/);
});

test('report tranche: in a shallow clone the span is unmeasured, and a close is placed by GitHub\'s compare', () => {
  const src = fixture();
  const root = makeRepo();
  git(['fetch', '-q', '--depth', '1', `file://${src}`, '+refs/heads/tranche:refs/remotes/origin/tranche'], { cwd: root });
  git(['checkout', '-q', 'origin/tranche'], { cwd: root });
  const cfg = loadConfig(root);
  const state = { 'layers/closed.jsonl': jl({ row: 'closed', layer: 1, tranche: 'tranche', commit: 'f'.repeat(40), at: at(7), deferred: { a: ['R2'] } }) };
  const run = (compare) => trancheReport(root, cfg, { now: NOW, stateRead: true, io: { state: (p) => state[p] ?? null, merged: () => null, compare } });
  const md = run(() => ({ ahead_by: 1 }));
  assert.match(md, /- opened: unmeasured/);
  assert.match(md, /- record-only commits: unmeasured/);
  assert.match(md, /### Layer 1 \(closed 2026-11-01T07:00:00.000Z at ffffffffff\)/);
  assert.match(md, /\| a \| layer 1 close \| 1 \| R2 \|/);
  assert.match(run(() => ({ ahead_by: 0 })), /### Layer 1 \(not closed\)/, 'a close on main is an earlier tranche\'s');
  const unread = run(() => null);
  assert.match(unread, /### Layer 1 \(closed: unmeasured, its close row's commit cannot be placed here\)/);
  assert.match(unread, /\| a \| tip \(layer 1 close unmeasured\) \| 1 \| R2 \|/);
});

test('report tranche: in a depth-1 clone, deepen fetches the tranche\'s own commits and its base, so the figures are measured', () => {
  const src = fixture();
  const root = makeRepo();
  git(['remote', 'add', 'origin', `file://${src}`], { cwd: root });
  git(['fetch', '-q', '--depth', '1', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche', '+refs/heads/main:refs/remotes/origin/main'], { cwd: root });
  git(['checkout', '-q', 'origin/tranche'], { cwd: root });
  const cfg = loadConfig(root);
  const run = () => trancheReport(root, cfg, { now: NOW, io: { merged: () => null } });
  assert.match(run(), /- opened: unmeasured/, 'depth 1 alone holds no opening');
  deepen(root, 'tranche');
  assert.equal(git(['rev-parse', '--is-shallow-repository'], { cwd: root }), 'true', 'still shallow: main\'s history not fetched');
  const md = run();
  assert.match(md, /- opened: 2026-11-01T10:00:00\+02:00/);
  assert.match(md, /- elapsed: [\d.]+ h/);
  assert.match(md, /\| a \| OPEN \| #11 \| 1 \(R1\) \|/);
  assert.match(md, /- record-only commits: 1 of 2 commits in the tranche/);
  assert.equal(span(root, 'origin/tranche', 'origin/main').base, git(['rev-parse', 'main'], { cwd: src }));
  // A cut whose parent is not main's (a failed deepen, the tip's parent fetched alone) is unmeasured.
  const cut = makeRepo();
  git(['remote', 'add', 'origin', `file://${src}`], { cwd: cut });
  git(['fetch', '-q', '--depth', '1', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche', '+refs/heads/main:refs/remotes/origin/main'], { cwd: cut });
  git(['fetch', '-q', '--depth', '1', 'origin', git(['rev-parse', 'tranche^'], { cwd: src })], { cwd: cut });
  assert.deepEqual(span(cut, 'origin/tranche', 'origin/main'), { open: 'unmeasured', close: null, base: null });
});

// main merged into the tranche (tranche close makes such a merge) and main moved since: a plain
// --shallow-exclude=main cuts at the merge and drops the tranche's commits before it, and the
// base, main before the first commit, cannot be shown on main from main's cut history.
function mergedMain() {
  const src = fixture();
  git(['checkout', '-q', 'main'], { cwd: src });
  commit(src, { 'src/h/1.js': '1\n' }, 'h1');
  const h2 = commit(src, { 'src/h/2.js': '2\n' }, 'h2');
  git(['checkout', '-q', 'tranche'], { cwd: src });
  git(['merge', '-q', '--no-ff', '-m', 'main into tranche', 'main'], { cwd: src });
  commit(src, { 'process/metrics/c.jsonl': jl({ at: at(5), module: 'c', row: 'attempt', event: 'start', attempt: 1 }) }, 'record again');
  git(['checkout', '-q', 'main'], { cwd: src });
  commit(src, { 'src/h/3.js': '3\n' }, 'h3');
  git(['checkout', '-q', 'tranche'], { cwd: src });
  return { src, h2 };
}

function cloneOf(src, shallow) {
  const root = makeRepo();
  git(['remote', 'add', 'origin', `file://${src}`], { cwd: root });
  git(['fetch', '-q', ...(shallow ? ['--depth', '1'] : []), 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche', '+refs/heads/main:refs/remotes/origin/main'], { cwd: root });
  git(['checkout', '-q', 'origin/tranche'], { cwd: root });
  return root;
}

test('report tranche: in a depth-1 clone of a tranche that main was merged into, deepen measures what a full clone does', () => {
  const { src, h2 } = mergedMain();
  const full = cloneOf(src, false);
  const root = cloneOf(src, true);
  const cfg = loadConfig(root);
  const run = (r, deepened) => trancheReport(r, cfg, { now: NOW, deepened, io: { merged: () => null } });
  const want = run(full, deepen(full, "tranche"));
  assert.match(want, /- opened: 2026-11-01T10:00:00\+02:00/);
  assert.match(want, /\| a \| OPEN \| #11 \| 1 \(R1\) \|/);
  assert.match(want, /- record-only commits: 2 of 3 commits in the tranche/, 'the commits merged in from main are main\'s');
  const before = run(root, null);
  assert.match(before, /- opened: unmeasured/);
  assert.match(before, /- record-only commits: unmeasured/);
  const deep = deepen(root, 'tranche');
  assert.equal(deep.base, git(['rev-parse', 'main~3'], { cwd: src }), 'main before the tranche\'s first commit');
  assert.deepEqual(deep.onMain, [h2], 'the merge\'s parent on main');
  assert.equal(run(root, deep), want);
  // The minimum: main's history behind its tip and the merged-in commit is not fetched.
  assert.notEqual(git(['cat-file', '-e', `${h2}^^{commit}`], { cwd: root, allowFail: true }).code, 0, 'h1 not fetched');
  assert.equal(git(['rev-parse', '--is-shallow-repository'], { cwd: root }), 'true');
});

test('report tranche: in a depth-1 clone where main moved since the tranche opened, the base deepen fetched is vouched for', () => {
  const src = fixture();
  git(['checkout', '-q', 'main'], { cwd: src });
  commit(src, { 'src/h/1.js': '1\n' }, 'h1');
  git(['checkout', '-q', 'tranche'], { cwd: src });
  const root = cloneOf(src, true);
  const cfg = loadConfig(root);
  const deep = deepen(root, 'tranche');
  assert.deepEqual(deep, { base: git(['rev-parse', 'main^'], { cwd: src }), onMain: [] });
  assert.deepEqual(span(root, 'origin/tranche', 'origin/main'), { open: 'unmeasured', close: null, base: null }, 'cut history alone cannot place the base on main');
  const md = trancheReport(root, cfg, { now: NOW, deepened: deep, io: { merged: () => null } });
  assert.match(md, /- opened: 2026-11-01T10:00:00\+02:00/);
  assert.match(md, /\| a \| OPEN \| #11 \| 1 \(R1\) \|/);
  assert.match(md, /- record-only commits: 1 of 2 commits in the tranche/);
});
