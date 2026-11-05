// merge train (train.mjs, option F): a serial loop over merge() under the merger's lease. Against a
// local bare origin, a fake gate (red on any tree holding "BROKEN") and a fake GitHub whose merge
// refuses a base that moved, as GitHub does.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { readRows } from '../lib/metrics.mjs';
import { fetchState, jsonl, readState, writeState } from '../lib/state.mjs';
import { LEASE_FILE, MERGER_FILE, TRAIN_FILE, TRAIN_NO_REVIEW, takeLease, train, trainNote, trainSummary } from '../lib/train.mjs';
import { loadConfig } from '../lib/util.mjs';
import { Fail, git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const S = 'session_merger1';
const quiet = () => {};
const done = JSON.stringify({ row: 'attempt', event: 'complete', at: new Date(Date.now() - 5 * 60000).toISOString(), attempt: 1 }) + '\n';

// Jobs (id -> files their branch commits); each a PR numbered in order.
function setup(jobs) {
  const ids = Object.keys(jobs);
  const root = makeRepo({
    ...Object.fromEntries(ids.map((id) => [`process/ledger/${id}.json`, entry(id)])),
    ...Object.fromEntries(ids.map((id) => [`test/${id}/a.test.mjs`, "import assert from 'node:assert';\nassert.equal(1, 1);\n"])),
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  for (const id of ids) {
    git(['checkout', '-q', '-b', `job/${id}`, 'tranche'], { cwd: root });
    commit(root, { [`process/metrics/${id}.jsonl`]: done, ...jobs[id] });
  }
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'other.txt': 'the tranche moved on' });
  git(['push', '-q', 'origin', 'tranche', 'main', ...ids.map((id) => `job/${id}`)], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, ids };
}

function github(root, ids, { pending = false, own = () => null } = {}) {
  const sh = (args) => git(args, { cwd: root, allowFail: true });
  const tipOf = (ref) => sh(['ls-remote', 'origin', `refs/heads/${ref}`]).stdout.split('\t')[0];
  const receipts = new Map(ids.map((id) => [id, tipOf(`job/${id}`)]));
  const state = new Map(ids.map((id, i) => [i + 1, { id, open: true, merged: false }]));
  const seen = new Set();
  const calls = { merged: [], gates: [] };
  const pr = (n) => {
    const s = state.get(Number(n));
    return { number: Number(n), state: s.open ? 'open' : 'closed', merged: s.merged, merge_commit_sha: s.merge || null, draft: false, mergeable: true, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: `job/${s.id}`, sha: tipOf(`job/${s.id}`), repo: { full_name: 'o/r' } } };
  };
  const io = {
    openPRs: () => [...state.keys()].filter((n) => state.get(n).open).map(pr),
    getPR: (slug, n) => pr(n),
    comments: (slug, n) => {
      const s = state.get(Number(n));
      const head = tipOf(`job/${s.id}`);
      return [
        { id: 1, body: block(RECEIPT, { module: s.id, attempt: 1, sha: receipts.get(s.id) }), user: { login: 'civicsmith' } },
        { id: 2, body: block(GATE, { runs: [{ sha: receipts.get(s.id), ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }, { sha: head, ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }] }), user: { login: BOT } },
      ];
    },
    verify: () => true,
    checkRun: (slug, sha) => {
      calls.gates.push(sha);
      // The first read of a merged result is in progress (the train prepares the next then).
      if (pending && ![...receipts.values()].includes(sha) && !seen.has(sha)) { seen.add(sha); return { status: 'in_progress', started_at: new Date().toISOString() }; }
      // Red only on a merged result: a job's own head passed its gate (the receipt agreed).
      const set = own(sha);
      if (set) return set;
      const red = ![...receipts.values()].includes(sha) && sh(['grep', '-q', 'BROKEN', sha, '--', 'src']).code === 0;
      return { id: 1, status: 'completed', conclusion: red ? 'failure' : 'success', html_url: `https://ci/${sha.slice(0, 7)}`, completed_at: new Date().toISOString() };
    },
    mergePR: (slug, n, sha) => {
      sh(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche']);
      if (sh(['merge-base', '--is-ancestor', 'refs/remotes/origin/tranche', sha]).code !== 0) throw new Fail('gh api -X PUT failed: Base branch was modified. Review and try the merge again.');
      const c = git(['commit-tree', `${sha}^{tree}`, '-p', 'refs/remotes/origin/tranche', '-p', sha, '-m', `Merge job PR ${n}`], { cwd: root });
      git(['push', '-q', 'origin', `${c}:refs/heads/tranche`], { cwd: root });
      Object.assign(state.get(Number(n)), { open: false, merged: true, merge: c });
      calls.merged.push(Number(n));
      return { merged: true, sha: c };
    },
  };
  return { io, calls, state, tipOf };
}
const run = (root, g, o = {}) => train(root, { once: true, session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, log: quiet, ...o });
const stateRows = (root, f) => { fetchState(root, 'process-state', { fresh: true }); return jsonl(readState(root, 'process-state', f)); };
const messages = (root) => { fetchState(root, 'process-state', { fresh: true }); return jsonl(readState(root, 'process-state', 'messages/merger.jsonl')); };

test('merge train merges the oldest green job PR through merge: its re-gate, one merge row, its row, and BOB told', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } });
  const g = github(root, ids);
  const r = run(root, g);
  assert.deepEqual(g.calls.merged, [1]);
  assert.equal(r.rows[0].result, 'merged');
  assert.equal(r.rows[0].queue, 2);
  const head = g.tipOf('job/alpha');
  assert.ok(g.calls.gates.includes(head), 'the merged result was gated');
  git(['checkout', '-q', '--detach', head], { cwd: root });
  const rows = readRows(root, 'alpha');
  assert.equal(rows.filter((x) => x.row === 'merge').length, 1);
  assert.equal(rows.at(-1).review, TRAIN_NO_REVIEW);
  git(['checkout', '-q', 'main'], { cwd: root });
  assert.equal(stateRows(root, TRAIN_FILE)[0].pr, 1);
  assert.match(messages(root)[0].text, /^merged PR 1 \(job alpha\): .*job start --ready/);
  // The second run takes the next; main never moved.
  run(root, g);
  assert.deepEqual(g.calls.merged, [1, 2]);
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/main'], { cwd: root }).split('\t')[0], git(['rev-parse', 'main'], { cwd: root }));
  const s = trainSummary(stateRows(root, TRAIN_FILE));
  assert.equal(s.merged, 2);
  assert.equal(s.baselines.length, 2);
});

test('merge train: one train runs; an expired lease is taken over, and a row says so', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } });
  const g = github(root, ids);
  const lease = (session, minutes) => writeState(root, 'process-state', 'lease', (d) => { mkdirSync(join(d, 'merger'), { recursive: true }); writeFileSync(join(d, LEASE_FILE), JSON.stringify({ session, at: new Date().toISOString(), expires: new Date(Date.now() + minutes * 60000).toISOString() })); });
  lease('session_other', 10);
  assert.throws(() => run(root, g), /held by session_other .*one train runs/);
  assert.deepEqual(g.calls.merged, []);
  lease('session_other', -1);
  assert.equal(run(root, g).rows[0].result, 'merged');
  assert.equal(stateRows(root, MERGER_FILE).filter((x) => x.row === 'takeover' && x.from === 'session_other').length, 1);
});

test('merge train: a lost lease stops before GitHub is asked to merge', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } });
  const g = github(root, ids);
  const check = g.io.checkRun;
  // While the merged result is gated, another session's live lease appears.
  g.io.checkRun = (slug, sha) => {
    if (sha !== g.tipOf('job/alpha') || g.calls.gates.length === 0) return check(slug, sha);
    writeState(root, 'process-state', 'stolen', (d) => writeFileSync(join(d, LEASE_FILE), JSON.stringify({ session: 'session_other', at: new Date().toISOString(), expires: new Date(Date.now() + 6e5).toISOString() })));
    return check(slug, sha);
  };
  assert.throws(() => run(root, g), /lease is session_other's.*nothing is landed/);
  assert.deepEqual(g.calls.merged, []);
});

test('merge train: killed mid-merge, run again it merges once with one merge row', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } });
  const g = github(root, ids);
  assert.throws(() => run(root, g, { io: { ...g.io, mergePR: () => { throw new Error('killed'); } } }), /killed/);
  run(root, g);
  assert.deepEqual(g.calls.merged, [1]);
  git(['checkout', '-q', '--detach', g.tipOf('job/alpha')], { cwd: root });
  assert.equal(readRows(root, 'alpha').filter((x) => x.row === 'merge').length, 1);
  git(['checkout', '-q', 'main'], { cwd: root });
});

test('merge train: a tranche that moves during the re-gate is never landed stale', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } });
  const g = github(root, ids);
  const check = g.io.checkRun;
  let moved = false;
  g.io.checkRun = (slug, sha) => {
    if (!moved && sha === g.tipOf('job/alpha') && g.calls.gates.length > 1) {
      moved = true;
      const wt = mkdtempSync(join(tmpdir(), 'p3-other-'));
      git(['clone', '-q', '--branch', 'tranche', git(['remote', 'get-url', 'origin'], { cwd: root }), wt], { cwd: root });
      commit(wt, { 'late.txt': 'another merge landed' });
      git(['push', '-q', 'origin', 'tranche'], { cwd: wt });
    }
    return check(slug, sha);
  };
  const r = run(root, g);
  assert.equal(r.rows[0].result, 'retry', 'tried again on the tranche as it is, not handed to BOB');
  assert.match(r.rows[0].why, /moved past the merged result the gate checked/);
  assert.equal(messages(root).length, 0);
  assert.deepEqual(g.calls.merged, []);
});

test('merge train refuses hostile job PRs exactly as merge does, and hands each to BOB once', () => {
  const { root, ids } = setup({
    alpha: { 'src/alpha/a.mjs': 'a', 'src/beta/x.mjs': 'not mine' },
    beta: { 'src/beta/a.mjs': 'b', '.github/workflows/process-gate.yml': 'jobs: {}' },
    gamma: { 'src/gamma/a.mjs': 'c', 'process/ledger/gamma.json': JSON.stringify(entry('gamma', { paths: ['src/'] }), null, 2) + '\n' },
    delta: { 'src/delta/a.mjs': 'd', 'test/delta/a.test.mjs': "import assert from 'node:assert';\n" },
  });
  const g = github(root, ids);
  const r = train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, log: quiet, once: true });
  for (let k = 0; k < 3; k++) r.rows.push(...train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, log: quiet, once: true }).rows);
  assert.deepEqual(g.calls.merged, []);
  const why = Object.fromEntries(r.rows.map((x) => [x.pr, x.why]));
  assert.match(why[1], /changes files outside its module: src\/beta\/x\.mjs/);
  assert.match(why[2], /changes files outside its module: \.github\/workflows\/process-gate\.yml/);
  assert.match(why[3], /ledger: .*only the status field|outside its module/);
  assert.match(why[4], /fires the review trigger.*--no-review is refused/);
  const m = messages(root);
  assert.equal(m.filter((x) => /PR 4 .*fires a review trigger and has no review recorded/.test(x.text)).length, 1);
});

test('merge train: a triggered PR lands only with a --reviewed note for its head', () => {
  const { root, ids } = setup({ delta: { 'src/delta/a.mjs': 'd', 'test/delta/a.test.mjs': "import assert from 'node:assert';\n" } });
  const g = github(root, ids);
  assert.equal(run(root, g).rows[0].result, 'refused');
  assert.equal(run(root, g).rows.length, 0, 'not tried again at the same head, even by a new train');
  // A review note by anyone but the addressed BOB does not count; a cost note never overrides one.
  writeState(root, 'process-state', 'bob', (d) => { mkdirSync(join(d, 'addresses'), { recursive: true }); writeFileSync(join(d, 'addresses/bob.json'), JSON.stringify({ session: 'session_bob1' })); });
  trainNote(root, 1, { slug: 'o/r', io: g.io, session: 'session_job1', reviewed: 'self-reviewed', rounds: 1, reviewMinutes: 1, findings: 0, actedOn: 0, log: quiet });
  assert.equal(run(root, g).rows[0].result, 'refused', 'a job\'s own review note is not BOB\'s');
  trainNote(root, 1, { slug: 'o/r', io: g.io, session: 'session_bob1', reviewed: 'fresh worker: the assertion moved to b.test.mjs', rounds: 1, reviewMinutes: 6, findings: 1, actedOn: 1, log: quiet });
  trainNote(root, 1, { slug: 'o/r', io: g.io, session: 'session_merger1', jobCostUsd: 2.5, jobSession: 'session_job1', log: quiet });
  assert.throws(() => trainNote(root, 1, { slug: 'o/r', io: g.io, session: 'session_merger1', log: quiet }), /its review .*its job cost/);
  // A note for that head, newer than the refusal, lets it be tried again.
  const r = run(root, g);
  assert.equal(r.rows[0].result, 'merged');
  git(['checkout', '-q', '--detach', g.tipOf('job/delta')], { cwd: root });
  assert.equal(readRows(root, 'delta').at(-1).reviewed, true);
  assert.equal(readRows(root, 'delta').filter((x) => x.event === 'measured').pop().session_usd, 2.5, 'the cost note went in the cost row');
  git(['checkout', '-q', 'main'], { cwd: root });
});

test('merge train: the next PR is prepared while a re-gate runs, and merges on the right base when that one fails', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a BROKEN' }, beta: { 'src/beta/a.mjs': 'b' } });
  const g = github(root, ids, { pending: true });
  const said = [];
  const r = train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, log: (l) => said.push(l), once: true, pipeline: true });
  assert.equal(r.rows[0].result, 'refused');
  assert.ok(said.some((l) => /^prepared PR 2 while PR 1's gate runs/.test(l)), said.join('\n'));
  const r2 = train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, log: quiet, once: true });
  assert.equal(r2.rows[0].pr, 2);
  assert.equal(r2.rows[0].result, 'merged');
  git(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche'], { cwd: root });
  assert.notEqual(git(['grep', '-q', 'BROKEN', 'refs/remotes/origin/tranche', '--', 'src'], { cwd: root, allowFail: true }).code, 0, 'the failed PR is not in the base');
  assert.ok(messages(root).some((x) => /PR 1 \(job alpha\): its merged result is red/.test(x.text)));
});

test('merge train: under its disk budget it stops before a merge starts, and records the disk each merge used', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } });
  const g = github(root, ids);
  const r = run(root, g);
  assert.ok(Number.isFinite(r.rows[0].disk_mb), 'disk used per merge in the row');
  assert.equal(git(['worktree', 'list'], { cwd: root }).split('\n').length, 1, 'no worktree left after the merge');
  const before = g.tipOf('job/beta');
  assert.throws(() => run(root, g, { diskFree: () => 100 }), /STOP: 100 MB free, under the merger's disk budget of 512 MB; nothing was started for PR 2/);
  assert.deepEqual(g.calls.merged, [1]);
  assert.equal(g.tipOf('job/beta'), before, 'nothing pushed');
});

test('merge train: a second train in the same session is refused while the first holds the lease', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } });
  const g = github(root, ids);
  takeLease(root, loadConfig(root), S, 'tok-first', { take: true });
  assert.throws(() => run(root, g), /held by session_merger1 \(another train in this session\)/);
  assert.deepEqual(g.calls.merged, []);
});

test('merge train: a green gate whose row is not posted yet waits, and is not refused', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } });
  let posted = false;
  const g = github(root, ids);
  const check = g.io.checkRun;
  g.io.checkRun = (slug, sha, name) => (name === 'post' && !posted ? { status: 'in_progress' } : check(slug, sha, name));
  assert.equal(run(root, g).rows.length, 0);
  posted = true;
  assert.equal(run(root, g).rows[0].result, 'merged');
});

test('merge train: a transient refusal is tried again, unannounced; a gate re-run on the same head is read again', () => {
  const { root, ids } = setup({ release: { 'src/release/a.mjs': 'r' } });
  let verdict = 'failure';
  const g = github(root, ids, { own: (sha) => (sha === g0() ? { id: verdict === 'failure' ? 7 : 8, status: 'completed', conclusion: verdict, completed_at: new Date().toISOString() } : null) });
  const g0 = () => g.tipOf('job/release');
  const head = g0();
  // Red own gate: not ready, read again each round.
  assert.equal(run(root, g).rows.length, 0);
  verdict = 'success';
  // GitHub failing mid-check: a retry, never handed to BOB, and the job/release branch name stops nothing.
  const verify = g.io.verify;
  g.io.verify = () => { throw new Fail('gh api repos/o/r/actions/runs/11 failed: HTTP 502'); };
  const r = run(root, g);
  assert.equal(r.rows[0].result, 'retry');
  assert.equal(messages(root).length, 0);
  g.io.verify = verify;
  assert.equal(g0(), head);
  assert.equal(run(root, g).rows[0].result, 'merged');
});

test('merge train: changed approvals on the tranche stop the train before it lands', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } });
  const g = github(root, ids);
  const check = g.io.checkRun;
  let changed = false;
  g.io.checkRun = (slug, sha, name) => {
    if (!changed && sha === g.tipOf('job/alpha') && g.calls.gates.length > 2) {
      changed = true;
      const wt = mkdtempSync(join(tmpdir(), 'p3-other-'));
      git(['clone', '-q', '--branch', 'tranche', git(['remote', 'get-url', 'origin'], { cwd: root }), wt], { cwd: root });
      commit(wt, { 'CLAUDE.md': '## Standing approvals from Bob\n\nwithdrawn\n' });
      git(['push', '-q', 'origin', 'tranche'], { cwd: wt });
    }
    return check(slug, sha, name);
  };
  assert.throws(() => run(root, g), /approvals on tranche changed since the train started/);
  assert.deepEqual(g.calls.merged, []);
});
