// Plain pull requests in the merge train's window (build plain-in-window). Measured on the copy,
// 5 Nov 19:47: with three job positions gating, two plain pull requests landed ahead of the window,
// each moving the tranche, and all three specs were closed ("tranche moved"): nothing of the
// window landed. A queued plain pull request now takes the next free position in the chain, ahead
// of any job for that position, and lands in chain order; the positions ahead of it stand.
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

// Jobs (id -> files) are PRs 1..k; plain pull requests (ref -> files), cut from the tranche before
// it moved on, follow.
function setup(jobs, plains, k) {
  const ids = Object.keys(jobs);
  const root = makeRepo({
    'process/config.json': JSON.stringify({ merge_train_window: k }),
    ...Object.fromEntries(ids.map((id) => [`process/ledger/${id}.json`, entry(id)])),
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
      return { id: 1, status: 'completed', conclusion: 'success', html_url: `https://github.com/o/r/actions/runs/${runOf(sha)}/job/9`, details_url: `https://github.com/o/r/actions/runs/${runOf(sha)}/job/9`, started_at: t, completed_at: t };
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
const tranched = (r) => /tranche moved/.test(r.cause || '');

test('a plain PR queued while three job positions gate takes position 3, leaves positions 0-2 standing, and lands in chain order', () => {
  const { root, ids, plains } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' }, gamma: { 'src/gamma/a.mjs': 'c' } }, { 'bob/found': { 'notes/found.md': 'a found mark' } }, 4);
  const g = github(root, ids, plains);
  g.calls.hold = true;
  const lines = [];
  const seen = {};
  // Pass 1 builds the three jobs at positions 0-2; the plain PR is queued in pass 2 and taken at
  // pass 3, the gates still running; at pass 4 the gates end.
  run(root, g, 10, {
    2: () => { seen.built = g.calls.created.map((x) => x.head); queue(root, g, 4, 'bob/found'); },
    4: () => { seen.merged = [...g.calls.merged]; seen.closed = [...g.calls.closed]; seen.created = g.calls.created.length; seen.taken = stateRows(root, TRAIN_FILE).some((r) => r.row === 'plain' && r.pr === 4 && r.result === 'taken'); g.calls.hold = false; },
  }, lines);
  assert.deepEqual(seen.built, ['train/head/1-1', 'train/head/2-1', 'train/head/3-1'], lines.join('\n'));
  assert.ok(lines.some((l) => /window: PR 4 \(plain\) at position 3: \w+ on \w+; it lands in chain order/.test(l)), lines.join('\n'));
  assert.deepEqual(seen.merged, [], 'nothing jumps the window');
  assert.deepEqual(seen.closed, [], 'positions 0-2 stand');
  assert.equal(seen.created, 3, 'a plain position opens no spec pull request');
  assert.equal(seen.taken, false, 'taken at its land, at position 0: its caller\'s clock covers its own gate, not the lands ahead');
  // The jobs land on their specs, then the plain PR; no spec is closed by a move of the tranche.
  assert.deepEqual(g.calls.merged, [1, 2, 3, 4], lines.join('\n'));
  const merged = stateRows(root, TRAIN_FILE).filter((r) => r.result === 'merged');
  assert.deepEqual(merged.map((r) => [r.pr, r.row === 'plain' ? 'plain' : r.spec_fast]), [[1, true], [2, true], [3, true], [4, 'plain']]);
  const win = stateRows(root, WINDOW_FILE);
  assert.deepEqual(win.filter((r) => r.event === 'build').map((r) => `${r.pr}-${r.seq}`), ['1-1', '2-1', '3-1'], 'never rebuilt');
  assert.ok(!win.some(tranched), JSON.stringify(win));
  const tip = g.tipOf('tranche');
  assert.equal(git(['show', `${tip}:notes/found.md`], { cwd: root }).trim(), 'a found mark');
  assert.equal(git(['show', `${tip}:src/gamma/a.mjs`], { cwd: root }).trim(), 'c');
});

test('a plain PR takes a free position before a ready job; the job behind builds on its result, and lands on its spec once the plain PR lands', () => {
  const { root, ids, plains } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } }, { 'bob/found': { 'notes/found.md': 'x' } }, 2);
  const g = github(root, ids, plains);
  queue(root, g, 3, 'bob/found');
  g.calls.hold = true;
  const lines = [];
  const seen = {};
  run(root, g, 8, { 2: () => { seen.created = g.calls.created.map((x) => x.head); seen.merged = [...g.calls.merged]; g.calls.hold = false; } }, lines);
  // Pass 1: position 0 is the plain PR's (no spec), position 1 alpha's, built on its result; beta waits.
  assert.ok(lines.some((l) => /window: PR 3 \(plain\) at position 0/.test(l)), lines.join('\n'));
  assert.deepEqual(seen.created, ['train/head/1-1'], 'beta waits: the window is full');
  assert.deepEqual(seen.merged, []);
  const build = stateRows(root, WINDOW_FILE).find((r) => r.event === 'build' && r.pr === 1 && r.seq === 1);
  assert.equal(build.position, 1);
  assert.equal(git(['show', `${build.head}:notes/found.md`], { cwd: root }).trim(), 'x', 'alpha\'s spec holds the plain PR ahead of it');
  // The plain PR lands first, alpha's spec stands and alpha lands on it, then beta.
  assert.deepEqual(g.calls.merged, [3, 1, 2], lines.join('\n'));
  assert.ok(lines.some((l) => /window: PR 3 \(plain\) landed at \w+ as its predicted result, records aside: 1 position\(s\) behind stand/.test(l)), lines.join('\n'));
  const jobs = stateRows(root, TRAIN_FILE).filter((r) => r.row === 'merge' && r.result === 'merged');
  assert.deepEqual(jobs.map((r) => [r.pr, r.spec_fast, r.spec_pr]), [[1, true, 101], [2, true, 102]]);
  const win = stateRows(root, WINDOW_FILE);
  assert.ok(!win.some((r) => r.event === 'close'), JSON.stringify(win));
});

test('a plain PR that does not land leaves; the job behind, sharing no file with it, stands, and lands by the full re-gate when the plain PR touched its module', () => {
  const { root, ids, plains } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } }, { 'bob/sneak': { 'src/alpha/b.mjs': 'module code' } }, 2);
  const g = github(root, ids, plains);
  queue(root, g, 2, 'bob/sneak');
  const lines = [];
  // Pass 1: the plain PR at 0, alpha at 1 on its result. Pass 2: the plain PR is refused (module
  // files go through a job); alpha shares no file with it and stands (coordinator, 5 Nov). Its land
  // is its tested tree minus src/alpha/b.mjs, a file of its own module, which no position ahead
  // changes: never taken as dropped, so the full re-gate (offSpec's own()).
  run(root, g, 5, {}, lines);
  assert.ok(stateRows(root, TRAIN_FILE).some((r) => r.row === 'plain' && r.pr === 2 && r.result === 'refused'), lines.join('\n'));
  const win = stateRows(root, WINDOW_FILE);
  assert.ok(!win.some((r) => r.event === 'close' && r.pr === 1), JSON.stringify(win));
  assert.deepEqual(g.calls.merged, [1], lines.join('\n'));
  const fb = win.find((r) => r.event === 'fallback' && r.pr === 1 && r.seq === 1);
  assert.ok(fb && /outside the records: src\/alpha\/b\.mjs/.test(fb.cause), JSON.stringify(win));
  assert.equal(git(['show', `${g.tipOf('tranche')}:src/alpha/b.mjs`], { cwd: root, allowFail: true }).code, 128, 'the refused plain PR\'s file never landed');
});

test('a plain PR that cannot be built onto the chain lets no job past it: the window drains to it, and on the tip it is refused as before', () => {
  const { root, ids, plains } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' }, gamma: { 'src/gamma/a.mjs': 'c' } }, { 'bob/clash': { 'src/alpha/a.mjs': 'z' } }, 2);
  const g = github(root, ids, plains);
  g.calls.hold = true;
  const lines = [];
  // Pass 1: alpha and beta gate. The plain PR is queued in pass 2; at pass 3 alpha's gate ends and
  // it lands; at pass 4 the plain PR does not build onto beta's result (it clashes with alpha), and
  // gamma is not admitted past it; at pass 5 beta's gate ends.
  run(root, g, 12, {
    2: () => queue(root, g, 4, 'bob/clash'),
    3: () => { g.calls.hold = false; g.calls.held = new Set([102]); },
    5: () => { g.calls.held = null; },
  }, lines);
  assert.ok(lines.some((l) => /window: PR 4 not built onto \w+ this pass: bob\/clash conflicts with/.test(l)), lines.join('\n'));
  const plain = stateRows(root, TRAIN_FILE).find((r) => r.row === 'plain' && r.pr === 4 && r.result === 'refused');
  assert.match(plain?.why || '', /bob\/clash conflicts with tranche/, lines.join('\n'));
  // gamma never passed it: built once, at position 0 on the tranche, after the plain PR's refusal.
  const gamma = stateRows(root, WINDOW_FILE).filter((r) => r.event === 'build' && r.pr === 3);
  assert.deepEqual(gamma.map((r) => r.position), [0], JSON.stringify(gamma));
  assert.deepEqual(g.calls.merged, [1, 2, 3], lines.join('\n'));
});
