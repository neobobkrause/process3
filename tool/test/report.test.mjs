import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commit, entry, makeRepo } from './helpers.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { BOT, GATE, block } from '../lib/github.mjs';
import { span, trancheReport } from '../lib/report.mjs';

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
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  return root;
}

const gateComment = (runs) => ({ user: { login: BOT }, created_at: 'x', updated_at: 'x', body: block(GATE, { runs }) });

test('report tranche: every section from the record, and unmeasured where the record lacks it', () => {
  const root = fixture();
  const cfg = loadConfig(root);
  const state = {
    'metrics/sweep.jsonl': jl({ at: at(5), row: 'sweep', bob_acts: true, bob_quiet_h: 1.5 }, { at: at(6), row: 'sweep' }),
    'addresses/bob.json': JSON.stringify({ session: 's_bob' }),
    'layers/closed.jsonl': jl({ row: 'closed', layer: 1, commit: 'abcdef1234567', at: at(7), deferred: { a: ['R2'] } }),
  };
  const md = trancheReport(root, cfg, {
    slug: 'o/r', now: NOW, stateRead: true,
    io: { state: (p) => state[p] ?? null, merged: () => [{ number: 11, merged_at: '2999-01-01T00:00:00Z' }, { number: 12, merged_at: '2999-01-02T00:00:00Z' }], comments: () => [gateComment([{ suite: 'pass' }, { suite: 'pass' }])] },
  });
  assert.match(md, /^# Tranche report: tranche/);
  assert.match(md, /still open; measured to now/);
  assert.match(md, /- elapsed: [\d.]+ h/);
  assert.match(md, /Pull requests merged into tranche: 2 \(1 job merges recorded/);
  assert.match(md, /### Layer 1 \(closed 2026-11-01T07:00:00.000Z at abcdef1234\)/);
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

test('report tranche: no state branch, no GitHub, a shallow or merged span', () => {
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
