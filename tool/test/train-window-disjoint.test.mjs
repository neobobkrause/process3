// The merge train's window kept over a tranche move that shares no file with it (build
// window-keep-disjoint; Bob, 5 Nov). Measured on the copy: specs 561-563 for PRs 364, 470 and 472
// gated in parallel on fecf37707e, 563 green in 3.64 min; plain PRs 557 (two generated words files
// deleted, two .gitignore lines) and 564 (a bundle row, a .gitignore line) landed and moved the
// tranche to 85f411fd03; all three left the window ("tranche moved") and were rebuilt, though
// neither plain PR touched a file the window changed.
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { fetchState, jsonl, readState, writeState } from '../lib/state.mjs';
import { PLAIN_FILE, TRAIN_FILE, WINDOW_FILE, train } from '../lib/train.mjs';
import { Fail, git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const S = 'session_merger1';
const done = JSON.stringify({ row: 'attempt', event: 'complete', at: new Date(Date.now() - 5 * 60000).toISOString(), attempt: 1 }) + '\n';

// As in train-plain-window.test.mjs.
// Jobs (id -> files) are PRs 1..k; plain pull requests (ref -> files), cut from the tranche before
// it moved on, follow.
function setup(jobs, plains, k, base = {}, own = {}) {
  const ids = Object.keys(jobs);
  const root = makeRepo({
    ...base,
    'process/config.json': JSON.stringify({ merge_train_window: k }),
    ...Object.fromEntries(ids.map((id) => [`process/ledger/${id}.json`, entry(id, own[id] || {})])),
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  for (const id of ids) {
    git(['checkout', '-q', '-b', `job/${id}`, 'tranche'], { cwd: root });
    commit(root, { [`process/metrics/${id}.jsonl`]: done, ...jobs[id] });
  }
  for (const [ref, files] of Object.entries(plains)) {
    git(['checkout', '-q', '-b', ref, 'tranche'], { cwd: root });
    commit(root, files);
  }
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'other.txt': 'the tranche moved on' });
  git(['push', '-q', 'origin', 'tranche', 'main', ...ids.map((id) => `job/${id}`), ...Object.keys(plains)], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, ids, plains: Object.keys(plains) };
}

// The window's fake GitHub (train-window.test.mjs) with plain pull requests too, and the reads
// mergePlain makes. calls.hold: the spec gates stay in progress; calls.held: these spec PRs' only.
function github(root, ids, plains) {
  const sh = (args) => git(args, { cwd: root, allowFail: true });
  const runOf = (sha) => 1000 + parseInt(sha.slice(0, 6), 16);
  const tipOf = (ref) => sh(['ls-remote', 'origin', `refs/heads/${ref}`]).stdout.split('\t')[0];
  const heads = new Map(ids.map((id) => [id, tipOf(`job/${id}`)]));
  const prs = new Map([...ids.map((id) => ({ id, ref: `job/${id}` })), ...plains.map((ref) => ({ ref }))].map((s, i) => [i + 1, { ...s, open: true, merged: false }]));
  const specs = new Map();
  const calls = { merged: [], created: [], closed: [], hold: false };
  const pr = (n) => {
    const s = prs.get(n);
    return { number: n, state: s.open ? 'open' : 'closed', merged: s.merged, merge_commit_sha: s.merge || null, draft: false, mergeable: true, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: s.ref, sha: tipOf(s.ref), repo: { full_name: 'o/r' } } };
  };
  const spec = (n) => { const s = specs.get(n); return { number: n, state: s.open ? 'open' : 'closed', draft: true, base: { ref: s.base }, head: { ref: s.head, sha: tipOf(s.head), repo: { full_name: 'o/r' } } }; };
  const io = {
    openPRs: () => [...prs.keys()].filter((n) => prs.get(n).open).map(pr),
    getPR: (slug, n) => (specs.has(Number(n)) ? spec(Number(n)) : pr(Number(n))),
    createPR: (slug, { head, base, draft }) => {
      assert.equal(draft, true);
      const n = 101 + specs.size;
      specs.set(n, { head, base, open: true, sha: tipOf(head) });
      calls.created.push({ n, head, base });
      return { number: n };
    },
    editPR: (slug, n, f) => { assert.deepEqual(f, { state: 'closed' }); specs.get(Number(n)).open = false; calls.closed.push(Number(n)); return { number: Number(n) }; },
    comments: (slug, n) => {
      if (specs.has(Number(n))) {
        const sha = specs.get(Number(n)).sha;
        const g = io.checkRun(slug, sha);
        return [{ id: 3, body: block(GATE, { runs: [{ sha, ok: g.conclusion === 'success', trigger: 'code', run_id: runOf(sha) }] }), user: { login: BOT } }];
      }
      const s = prs.get(Number(n));
      if (!s.id) return [];
      const head = tipOf(s.ref);
      return [
        { id: 1, body: block(RECEIPT, { module: s.id, attempt: 1, sha: heads.get(s.id) }), user: { login: 'civicsmith' } },
        { id: 2, body: block(GATE, { runs: [{ sha: heads.get(s.id), ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }, { sha: head, ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }] }), user: { login: BOT } },
      ];
    },
    verify: () => true,
    gateBound: () => null,
    prsFromBranch: (slug, b) => [...[...prs.keys()].map(pr), ...[...specs.keys()].map(spec)].filter((p) => p.head.ref === b),
    baseEverChanged: () => false,
    requiredChecks: () => ({ checks: [{ context: 'gate' }] }),
    repo: { released: () => false, shim: () => null, descends: () => false },
    checkRuns: (slug, sha, name) => [io.checkRun(slug, sha, name)],
    checkRun: (slug, sha) => {
      const t = new Date(Date.now() - 60000).toISOString();
      // Each job's suite, as its gate runs it: red when its own module file says BROKEN in the tree.
      const id = [...specs.values()].find((x) => x.sha === sha)?.head.match(/^train\/head\/(\d+)-/)?.[1];
      const own = id ? prs.get(Number(id))?.id : null;
      const broken = own && sh(['show', `${sha}:src/${own}/a.mjs`]).stdout?.includes('BROKEN');
      return { id: 1, status: 'completed', conclusion: broken ? 'failure' : 'success', html_url: `https://github.com/o/r/actions/runs/${runOf(sha)}/job/9`, details_url: `https://github.com/o/r/actions/runs/${runOf(sha)}/job/9`, started_at: t, completed_at: t };
    },
    checkRunMany: (slug, pairs) => pairs.map(([sha, name]) => ([...specs.entries()].some(([n, x]) => x.sha === sha && (calls.hold || calls.held?.has(n))) ? { status: 'in_progress' } : name === 'post' ? { status: 'completed', started_at: new Date().toISOString() } : io.checkRun(slug, sha, name))),
    // GitHub's ruleset: a head that does not hold the tranche as it is cannot merge.
    mergePR: (slug, n, sha) => {
      sh(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche']);
      if (sh(['merge-base', '--is-ancestor', 'refs/remotes/origin/tranche', sha]).code !== 0) throw new Fail('gh api -X PUT failed: Base branch was modified. Review and try the merge again.');
      const c = git(['commit-tree', `${sha}^{tree}`, '-p', 'refs/remotes/origin/tranche', '-p', sha, '-m', `Merge PR ${n}`], { cwd: root });
      git(['push', '-q', 'origin', `${c}:refs/heads/tranche`], { cwd: root });
      Object.assign(prs.get(Number(n)), { open: false, merged: true, merge: c });
      calls.merged.push(Number(n));
      return { merged: true, sha: c };
    },
  };
  return { io, calls, specs, tipOf };
}
const stateRows = (root, f) => { fetchState(root, 'process-state', { fresh: true }); return jsonl(readState(root, 'process-state', f)); };
// One train for the whole test (a plain position is not restored by a restarted train: those behind
// it are rebuilt): at[i] runs as pass i+1 reads its queue, before the window acts.
const run = (root, g, rounds, at = {}, lines = []) => {
  let pass = 0;
  return train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, idleEvery: 1, rounds, log: (l) => lines.push(l), onQueue: () => at[++pass]?.() });
};

// A plain pull request queued for the train, as merge <pr> --plain queues it under a live lease.
function queue(root, g, n, ref) {
  const head = g.tipOf(ref);
  const row = { at: new Date().toISOString(), row: 'queue', id: `q${n}`, pr: n, head, ref, by: null, reviewed: null, no_review: 'a note', rounds: 0, decision: null, as: 'bob', take_by: new Date(Date.now() + 60 * 60000).toISOString(), renews: false };
  writeState(root, 'process-state', `test: PR ${n} queued (plain)`, (wt) => { mkdirSync(join(wt, 'merger'), { recursive: true }); appendFileSync(join(wt, PLAIN_FILE), JSON.stringify(row) + '\n'); });
}
// The tranche moved by a land outside the window (a plain PR, a hand merge): `files` committed on
// its tip and pushed. Returns the new tip.
function move(root, g, files, msg = 'Merge plain PR 9') {
  git(['fetch', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', '--detach', 'FETCH_HEAD'], { cwd: root });
  commit(root, files, msg);
  git(['push', '-q', 'origin', 'HEAD:refs/heads/tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return g.tipOf('tranche');
}
const jobs3 = { alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' }, gamma: { 'src/gamma/a.mjs': 'c' } };
// Three positions gate (pass 1); after pass 2's read the tranche moves by `files`; at pass 3 the gates end.
function moved(files) {
  const { root, ids } = setup(jobs3, {}, 3);
  const g = github(root, ids, []);
  g.calls.hold = true;
  const lines = [];
  const seen = {};
  train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, idleEvery: 1, rounds: 12, log: (l) => lines.push(l), onQueue: () => {
    seen.pass = (seen.pass || 0) + 1;
    if (seen.pass === 2) { seen.built = g.calls.created.map((x) => x.head); seen.tip = move(root, g, files); }
    if (seen.pass === 3) g.calls.hold = false;
  } });
  return { root, g, lines, seen, merged: stateRows(root, TRAIN_FILE).filter((r) => r.row === 'merge' && r.result === 'merged'), win: stateRows(root, WINDOW_FILE) };
}

test('(a) a plain land of a .gitignore and a file outside every position keeps all three; they land in order on the spec-tested path, and each merge row names the move', () => {
  const { root, g, lines, seen, merged, win } = moved({ '.gitignore': 'words/\n', 'notes/words.md': 'a generated words file\n' });
  assert.deepEqual(seen.built, ['train/head/1-1', 'train/head/2-1', 'train/head/3-1'], lines.join('\n'));
  assert.ok(lines.some((l) => l === `window: the tranche moved to ${seen.tip.slice(0, 10)} in 2 file(s), records aside, none of which the window changes: 3 position(s) stand`), lines.join('\n'));
  assert.deepEqual(g.calls.closed.filter((n) => [101, 102, 103].includes(n) && !win.some((r) => r.event === 'closed' && r.spec_pr === n)), [], 'no spec closed but by its land');
  assert.ok(!win.some((r) => r.event === 'close'), JSON.stringify(win.filter((r) => r.event === 'close')));
  assert.deepEqual(win.filter((r) => r.event === 'build').map((r) => `${r.pr}-${r.seq}`), ['1-1', '2-1', '3-1'], 'never rebuilt');
  assert.deepEqual(win.filter((r) => r.event === 'land').map((r) => r.pr), [1, 2, 3]);
  assert.deepEqual(g.calls.merged, [1, 2, 3], lines.join('\n'));
  assert.deepEqual(merged.map((r) => [r.pr, r.spec_fast]), [[1, true], [2, true], [3, true]], lines.join('\n'));
  // Each land carried the move (from the tranche the window was built on, to the tip it merged onto).
  for (const r of merged) {
    assert.deepEqual(r.spec_move?.files, ['.gitignore', 'notes/words.md'], JSON.stringify(r));
    assert.ok(r.spec_move.commits.includes(seen.tip), JSON.stringify(r.spec_move));
  }
  assert.equal(merged[0].spec_move.to, seen.tip);
  const tip = g.tipOf('tranche');
  for (const [f, v] of [['.gitignore', 'words/'], ['notes/words.md', 'a generated words file'], ['src/alpha/a.mjs', 'a'], ['src/gamma/a.mjs', 'c']]) assert.equal(git(['show', `${tip}:${f}`], { cwd: root }).trim(), v);
  // Each landed head carries the trailer of its own spec.
  assert.match(git(['log', '-1', '--format=%B', g.tipOf('job/beta')], { cwd: root }), /Spec-Tested: 102/);
});

test('(b) a move in a file position 1 changes keeps position 0, rebuilds from position 1 on once it has landed, and all land on their specs', () => {
  // The same change as beta's own (no conflict), so beta rebuilds and lands.
  const { lines, seen, merged, win, g } = moved({ 'src/beta/a.mjs': 'b' });
  const closes = win.filter((r) => r.event === 'close');
  assert.deepEqual(closes.map((r) => `${r.pr}-${r.seq}`), ['2-1', '3-1'], lines.join('\n'));
  assert.ok(closes.every((r) => r.cause === `tranche moved to ${seen.tip.slice(0, 10)}, in a file PR 2 changes`), JSON.stringify(closes));
  assert.ok(lines.some((l) => l === `window: the tranche moved to ${seen.tip.slice(0, 10)} in 1 file(s), records aside, none of which PR 1 change: 1 position(s) stand`), lines.join('\n'));
  // Rebuilt only once alpha (kept over the move) has landed: on a tranche that holds the move.
  const lands = win.filter((r) => r.event === 'land');
  const rebuilt = win.filter((r) => r.event === 'build' && r.seq === 2);
  assert.deepEqual(rebuilt.map((r) => r.pr), [2, 3], JSON.stringify(win));
  assert.equal(rebuilt[0].base, lands.find((r) => r.pr === 1).landed, 'beta rebuilt on alpha\'s land');
  assert.deepEqual(g.calls.merged, [1, 2, 3], lines.join('\n'));
  assert.deepEqual(merged.map((r) => [r.pr, r.spec_fast]), [[1, true], [2, true], [3, true]], lines.join('\n'));
  assert.deepEqual(merged[0].spec_move?.files, ['src/beta/a.mjs'], 'alpha landed over the move');
  assert.equal(merged[1].spec_move, undefined, 'beta was rebuilt on a tranche holding it');
});

test('(c) a records-only move keeps every position: no file outside the records moved', () => {
  const { lines, seen, merged, win, g } = moved({ 'process/notes/state.md': 'a record\n' });
  assert.ok(lines.some((l) => l === `window: the tranche moved to ${seen.tip.slice(0, 10)} in 0 file(s), records aside, none of which the window changes: 3 position(s) stand`), lines.join('\n'));
  assert.ok(!win.some((r) => r.event === 'close'), JSON.stringify(win));
  assert.deepEqual(g.calls.merged, [1, 2, 3], lines.join('\n'));
  assert.deepEqual(merged.map((r) => [r.pr, r.spec_fast, r.spec_move]), [[1, true, undefined], [2, true, undefined], [3, true, undefined]]);
});

test('a plain position landed over a disjoint move is its predicted result plus the move: the job behind it stands and lands on its spec', () => {
  const { root, ids, plains } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } }, { 'bob/found': { 'notes/found.md': 'x' } }, 2);
  const g = github(root, ids, plains);
  queue(root, g, 2, 'bob/found');
  g.calls.hold = true;
  const lines = [];
  let tip = null;
  // Pass 1: the plain PR at 0, alpha at 1 on its result; after pass 2's read the tranche moves.
  run(root, g, 8, { 2: () => { tip = move(root, g, { '.gitignore': 'bundle/\n' }); g.calls.hold = false; } }, lines);
  assert.ok(lines.some((l) => l === `window: the tranche moved to ${tip.slice(0, 10)} in 1 file(s), records aside, none of which the window changes: 2 position(s) stand`), lines.join('\n'));
  assert.ok(lines.some((l) => /window: PR 2 \(plain\) landed at \w+ as its predicted result, records aside: 1 position\(s\) behind stand/.test(l)), lines.join('\n'));
  assert.deepEqual(g.calls.merged, [2, 1], lines.join('\n'));
  const job = stateRows(root, TRAIN_FILE).filter((r) => r.row === 'merge' && r.result === 'merged');
  assert.deepEqual(job.map((r) => [r.pr, r.spec_fast, r.spec_move?.files]), [[1, true, ['.gitignore']]], lines.join('\n'));
  assert.ok(!stateRows(root, WINDOW_FILE).some((r) => r.event === 'close'));
});

// Copy, 5 Nov 20:43, window 8: PR 468 red at position 0, and all 7 behind it left ("red ahead: PR
// 468"), 572 and 574 among them, green and sharing no file with it (coordinator).
test('a red at position 0: those behind sharing no file with it keep their green specs and land on them minus its change; one sharing a file rebuilds', () => {
  const shared = (a, g) => `${a}\nb\nc\nd\ne\nf\n${g}\n`;
  const { root, ids } = setup({
    alpha: { 'src/alpha/a.mjs': 'BROKEN', 'src/shared/s.mjs': shared('A', 'g') },
    beta: { 'src/beta/a.mjs': 'b', 'src/shared/s.mjs': shared('a', 'G') },
    gamma: { 'src/gamma/a.mjs': 'c' },
    delta: { 'src/delta/a.mjs': 'd' },
  }, {}, 4, { 'src/shared/s.mjs': shared('a', 'g') }, { alpha: { paths: ['src/alpha/', 'src/shared/'] }, beta: { paths: ['src/beta/', 'src/shared/'] } });
  const g = github(root, ids, []);
  const lines = [];
  train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, idleEvery: 1, rounds: 10, log: (l) => lines.push(l) });
  const win = stateRows(root, WINDOW_FILE);
  const train_ = stateRows(root, TRAIN_FILE);
  assert.ok(train_.some((r) => r.pr === 1 && r.result === 'refused'), lines.join('\n'));
  // beta shares src/shared/s.mjs (a path both modules own) with alpha: closed and rebuilt; gamma and delta stand on their first specs.
  const closes = win.filter((r) => r.event === 'close' && r.pr !== 1);
  assert.deepEqual(closes.map((r) => [r.pr, r.seq, r.cause]), [[2, 1, 'red ahead: PR 1']], JSON.stringify(win));
  assert.deepEqual(win.filter((r) => r.event === 'build').map((r) => `${r.pr}-${r.seq}`), ['1-1', '2-1', '3-1', '4-1', '2-2'], JSON.stringify(win));
  assert.deepEqual(g.calls.merged, [3, 4, 2], lines.join('\n'));
  const merged = train_.filter((r) => r.row === 'merge' && r.result === 'merged');
  assert.deepEqual(merged.map((r) => [r.pr, r.spec_fast]), [[3, true], [4, true], [2, true]], lines.join('\n'));
  // gamma's land was its tested tree minus alpha's and beta's changes (both left), named on its row.
  assert.deepEqual(merged[0].spec_move?.dropped?.sort(), ['src/alpha/a.mjs', 'src/beta/a.mjs', 'src/shared/s.mjs'], JSON.stringify(merged[0]));
  const tip = g.tipOf('tranche');
  assert.equal(git(['show', `${tip}:src/shared/s.mjs`], { cwd: root }), shared('a', 'G').trimEnd(), 'alpha\'s change never landed');
  assert.equal(git(['show', `${tip}:src/alpha/a.mjs`], { cwd: root, allowFail: true }).code, 128);
});

// Cold review, finding 1: the window measures a move from its start (after a land, that land), the
// land from the spec's base; a move in a file only a landed position changed is a tranche move on
// both (offSpec reads the tranche's line between them), so beta stays and lands on its spec.
test('after a land, a move in a file only the landed position changed keeps the one behind, which lands on its spec', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } }, {}, 2);
  const g = github(root, ids, []);
  g.calls.held = new Set([102]); // beta's spec gates on; alpha lands
  const lines = [];
  let tip = null;
  run(root, g, 8, {
    3: () => { tip = move(root, g, { 'src/alpha/a.mjs': 'alpha, changed again by a hand merge' }); },
    4: () => { g.calls.held = null; },
  }, lines);
  assert.ok(tip, lines.join('\n'));
  assert.ok(lines.some((l) => l === `window: the tranche moved to ${tip.slice(0, 10)} in 1 file(s), records aside, none of which the window changes: 1 position(s) stand`), lines.join('\n'));
  assert.deepEqual(g.calls.merged, [1, 2], lines.join('\n'));
  const merged = stateRows(root, TRAIN_FILE).filter((r) => r.row === 'merge' && r.result === 'merged');
  assert.deepEqual(merged.map((r) => [r.pr, r.spec_fast]), [[1, true], [2, true]], lines.join('\n'));
  assert.deepEqual([merged[1].spec_move?.files, merged[1].spec_move?.dropped], [['src/alpha/a.mjs'], []]);
  assert.ok(!stateRows(root, WINDOW_FILE).some((r) => r.event === 'close' || r.event === 'fallback'));
});
