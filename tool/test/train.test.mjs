// merge train (train.mjs, option F): a serial loop over merge() under the merger's lease. Against a
// local bare origin, a fake gate (red on any tree holding "BROKEN") and a fake GitHub whose merge
// refuses a base that moved, as GitHub does.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { readRows } from '../lib/metrics.mjs';
import { fetchState, jsonl, readState, writeState } from '../lib/state.mjs';
import { LEASE, LEASE_FILE, MERGER_FILE, TRAIN_FILE, TRAIN_NO_REVIEW, procAlive, procOf, takeLease, train, trainNote, trainSummary } from '../lib/train.mjs';
import { spawn } from 'node:child_process';
import { loadConfig } from '../lib/util.mjs';
import { Fail, git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const S = 'session_merger1';
const quiet = () => {};
const done = JSON.stringify({ row: 'attempt', event: 'complete', at: new Date(Date.now() - 5 * 60000).toISOString(), attempt: 1 }) + '\n';

// Jobs (id -> files their branch commits); each a PR numbered in order.
function setup(jobs, base = {}) {
  const ids = Object.keys(jobs);
  const root = makeRepo({
    ...base,
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

function github(root, ids, { pending = false, own = () => null, unread = () => false } = {}) {
  const sh = (args) => git(args, { cwd: root, allowFail: true });
  const tipOf = (ref) => sh(['ls-remote', 'origin', `refs/heads/${ref}`]).stdout.split('\t')[0];
  const receipts = new Map(ids.map((id) => [id, tipOf(`job/${id}`)]));
  const state = new Map(ids.map((id, i) => [i + 1, { id, open: true, merged: false }]));
  const seen = new Set();
  const calls = { merged: [], gates: [] };
  const pr = (n) => {
    const s = state.get(Number(n));
    return { number: Number(n), state: s.open ? 'open' : 'closed', merged: s.merged, merge_commit_sha: s.merge || null, draft: !!s.draft, mergeable: true, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: `job/${s.id}`, sha: tipOf(`job/${s.id}`), repo: { full_name: 'o/r' } } };
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
    // Every gate run on a commit (the provider hold's read): null when unreadable, as github.mjs.
    checkRuns: (slug, sha, name) => { if (unread(sha)) return null; const g = io.checkRun(slug, sha, name); return g ? [g] : []; },
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

test('merge train: in a shallow clone it fetches the tranche\'s history past main only, never unshallows, and mends a head\'s merge base from GitHub\'s compare (copy, 5 Nov 18:08: --unshallow took ~400 s of 458)', () => {
  const { root: src, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } });
  // The tranche moves on past main, and beta is cut from that commit (a head the history past main holds).
  git(['checkout', '-q', 'tranche'], { cwd: src });
  for (let i = 0; i < 3; i += 1) commit(src, { [`t${i}.txt`]: String(i) });
  git(['checkout', '-q', 'job/beta'], { cwd: src });
  git(['merge', '-q', '--no-edit', 'tranche'], { cwd: src });
  git(['push', '-q', 'origin', 'tranche', 'job/beta'], { cwd: src });
  git(['checkout', '-q', 'main'], { cwd: src });
  const bare = git(['remote', 'get-url', 'origin'], { cwd: src }).trim();
  const root = join(mkdtempSync(join(tmpdir(), 'p3-shallow-')), 'c');
  git(['clone', '-q', '--depth', '1', '--no-single-branch', '--branch', 'main', `file://${bare}`, root], { cwd: src });
  for (const [k, v] of [['user.email', 'noreply@github.com'], ['user.name', 'Test'], ['commit.gpgsign', 'false']]) git(['config', k, v], { cwd: root });
  assert.equal(git(['rev-parse', '--is-shallow-repository'], { cwd: root }).trim(), 'true');
  const lines = [];
  const g = github(root, ids);
  const asked = [];
  // GitHub's compare, as origin answers it.
  const count = (a, b) => Number(git(['rev-list', '--count', a, `^${b}`], { cwd: bare }));
  g.io.compare = (slug, base, head) => { asked.push(head); return { ahead_by: count(head, base), behind_by: count(base, head), merge_base_commit: { sha: git(['merge-base', base, head], { cwd: bare }) } }; };
  // The fetches git ran (this repository is so small a deepening reaches its root, so the clone's
  // shallow mark alone says nothing).
  const trace = join(mkdtempSync(join(tmpdir(), 'p3-trace-')), 't.log');
  process.env.GIT_TRACE = trace;
  try { run(root, g, { log: (l) => lines.push(l) }); } finally { delete process.env.GIT_TRACE; }
  const fetches = readFileSync(trace, 'utf8').split('\n').filter((l) => /built-in: git fetch/.test(l));
  assert.ok(lines.some((l) => /^merge train: this clone is shallow; tranche's history past main fetched in \d+ ms$/.test(l)), lines.join('\n'));
  assert.ok(fetches.some((l) => /--shallow-exclude=main origin \+refs\/heads\/tranche:/.test(l)));
  assert.ok(!fetches.some((l) => /--unshallow|--depth[= ]\d/.test(l)), fetches.join('\n'));
  assert.deepEqual(g.calls.merged, [1]);
  // Every commit the tranche has past main is here; each job head's merge base reads locally.
  assert.equal(Number(git(['rev-list', '--count', 'origin/tranche', '^origin/main'], { cwd: root })), count('tranche', 'main'));
  for (const id of ids) assert.equal(git(['merge-base', 'origin/tranche', `origin/job/${id}`], { cwd: root, allowFail: true }).code, 0, id);
  // alpha, cut from main, was deepened to its base by the compare; beta's base was in the history past main.
  assert.ok(asked.includes('job/alpha') && !asked.includes('job/beta'), asked.join(','));
  // A full clone is left as it is and says nothing about it.
  const more = [];
  run(src, github(src, ids), { log: (l) => more.push(l) });
  assert.ok(!more.some((l) => /shallow/.test(l)));
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
      for (const [k, v] of [['user.email', 'other@example.com'], ['user.name', 'Other'], ['commit.gpgsign', 'false']]) git(['config', k, v], { cwd: wt });
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
  assert.throws(() => trainNote(root, 1, { slug: 'o/r', io: g.io, session: 'session_job1', reviewed: 'self-reviewed', rounds: 1, reviewMinutes: 1, findings: 0, actedOn: 0, log: quiet }), /a review note is BOB's to record/);
  // One written by hand on the state branch counts for nothing either.
  writeState(root, 'process-state', 'forged', (d) => { mkdirSync(join(d, 'metrics'), { recursive: true }); writeFileSync(join(d, 'metrics/train-notes.jsonl'), JSON.stringify({ at: new Date().toISOString(), row: 'note', by: 'session_job1', pr: 1, sha: g.tipOf('job/delta'), reviewed: 'self', rounds: 1, review_minutes: 1, findings: 0, findings_acted: 0 }) + '\n'); });
  assert.equal(run(root, g).rows.length, 0, 'a note not by BOB does not even re-admit the head');
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

test('merge train: under its disk budget it stops before a merge starts, and records the disk free and used apart', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } });
  const g = github(root, ids);
  const r = run(root, g);
  assert.ok(Number.isFinite(r.rows[0].disk_used_mb), 'disk used per merge in the row');
  assert.ok(r.rows[0].disk_free_mb >= 512, 'the free space before the merge in the row, measured');
  assert.equal(r.rows[0].disk_mb, undefined, 'no ambiguous disk column');
  assert.equal(git(['worktree', 'list'], { cwd: root }).split('\n').length, 1, 'no worktree left after the merge');
  const before = g.tipOf('job/beta');
  assert.throws(() => run(root, g, { diskFree: () => 100 }), /STOP: 100 MB free, under the merger's disk budget of 512 MB; nothing was started for PR 2/);
  assert.deepEqual(g.calls.merged, [1]);
  assert.equal(g.tipOf('job/beta'), before, 'nothing pushed');
  // The lease is given back on that stop: a new train starts at once.
  run(root, g);
  assert.deepEqual(g.calls.merged, [1, 2]);
});

test('merge train: a second train in the same session is refused while the first holds the lease', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } });
  const g = github(root, ids);
  takeLease(root, loadConfig(root), S, 'tok-first', { take: true });
  assert.throws(() => run(root, g), /held by session_merger1 \(another train in this session, process \d+, still running\)/);
  assert.deepEqual(g.calls.merged, []);
});

// Coordinator, 5 Nov 07:18-07:27: a killed train's own session waited out its lease (9 min).
test('merge train: a train of the same session retakes the lease of its own train that no longer runs; a live one is still refused', async () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } });
  const g = github(root, ids);
  const cfg = loadConfig(root);
  const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore' });
  await new Promise((r) => child.once('spawn', r));
  const proc = procOf(child.pid);
  assert.ok(proc?.boot && proc.started, 'this machine shows its processes');
  takeLease(root, cfg, S, 'tok-killed', { take: true, proc });
  assert.throws(() => run(root, g), new RegExp(`held by session_merger1 \\(another train in this session, process ${child.pid}, still running\\)`));
  assert.deepEqual(g.calls.merged, []);
  // Another session's live lease is never judged by its process.
  assert.equal(procAlive({ ...proc, started: 'x' }), false, 'a reused pid is another process');
  assert.equal(procAlive({ ...proc, boot: 'another-machine' }), false, 'another boot: that machine is gone');
  assert.equal(procAlive({ pid: child.pid }), null, 'a lease naming no process: unknown');
  child.kill('SIGKILL');
  await new Promise((r) => child.once('exit', r));
  assert.equal(procAlive(proc), false);
  const out = [];
  assert.equal(run(root, g, { log: (l) => out.push(l) }).rows[0].result, 'merged');
  assert.ok(out.some((l) => /lease held by session_merger1 \(taken over from this session's train that is no longer running\)/.test(l)), out.join('\n'));
  assert.equal(stateRows(root, MERGER_FILE).filter((x) => x.row === 'takeover' && x.dead?.pid === child.pid).length, 1);
  // A lease of another session, its process gone, still waits for its time.
  writeState(root, 'process-state', 'other', (d) => writeFileSync(join(d, LEASE_FILE), JSON.stringify({ session: 'session_other', token: 't', proc, at: new Date().toISOString(), expires: new Date(Date.now() + 6e5).toISOString() })));
  assert.throws(() => takeLease(root, cfg, S, 'tok-new', { take: true }), /held by session_other until/);
});

// Coordinator, 5 Nov 07:56:37: the MERGER's lease lapsed while its train was alive, gating
// mail-door; the train renewed only at its printed lines, and a silent stretch outran the lease.
test('merge train: the lease is renewed under a silent stretch of work, at the train\'s commands, not only at its lines', (t) => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } });
  const g = github(root, ids);
  const was = LEASE.renew;
  LEASE.renew = 1 / 60; // one second
  t.after(() => { LEASE.renew = was; });
  const lease = () => { git(['fetch', '-q', 'origin', '+refs/heads/process-state:refs/remotes/origin/process-state'], { cwd: root }); return JSON.parse(git(['show', 'refs/remotes/origin/process-state:merger/lease.json'], { cwd: root })); };
  const land = g.io.mergePR;
  let seen = null;
  g.io.mergePR = (...a) => {
    // A stretch printing nothing (the queue's order, a notice's triage), longer than the renewal.
    const from = Date.now();
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2500);
    git(['rev-parse', 'HEAD'], { cwd: root }); // the work's own commands
    seen = { from, at: Date.parse(lease().at) };
    return land(...a);
  };
  assert.equal(run(root, g).rows[0].result, 'merged');
  assert.ok(seen.at > seen.from, `renewed inside the silent stretch (lease at ${new Date(seen.at).toISOString()}, stretch from ${new Date(seen.from).toISOString()})`);
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
      for (const [k, v] of [['user.email', 'other@example.com'], ['user.name', 'Other'], ['commit.gpgsign', 'false']]) git(['config', k, v], { cwd: wt });
      commit(wt, { 'CLAUDE.md': '## Standing approvals from Bob\n\nwithdrawn\n' });
      git(['push', '-q', 'origin', 'tranche'], { cwd: wt });
    }
    return check(slug, sha, name);
  };
  // A GitHub that would merge onto a moved base: the train itself must see the change.
  const merge = g.io.mergePR;
  g.io.mergePR = (slug, n, sha, o) => { git(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche'], { cwd: root }); return merge(slug, n, git(['commit-tree', `${sha}^{tree}`, '-p', 'refs/remotes/origin/tranche', '-p', sha, '-m', 'x'], { cwd: root }), o); };
  assert.throws(() => run(root, g), /approvals on tranche changed since the train started/);
  assert.deepEqual(g.calls.merged, []);
});

test('merge train: a transient failure waits, growing, without a hot loop; the fifth goes to BOB', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } });
  const g = github(root, ids);
  const verify = g.io.verify;
  g.io.verify = (slug, r) => { if (r.sha === g.tipOf('job/alpha')) throw new Fail('gh api failed: HTTP 502'); return verify(slug, r); };
  const r = train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, log: quiet, idleEvery: 1, rounds: 3, pipeline: false });
  assert.deepEqual(r.rows.map((x) => [x.pr, x.result]), [[1, 'retry'], [2, 'merged']], 'PR 1 waits; PR 2 is not starved');
  assert.equal(messages(root).filter((x) => /PR 1/.test(x.text)).length, 0);
});

// Provider first (order.mjs): beta uses alpha; alpha's job adds an export beta's job imports.
const usesBase = {
  'process/config.json': { modules_file: 'build/modules.json' },
  'build/modules.json': { modules: [{ id: 'alpha', paths: ['src/alpha/'], tests: ['test/alpha/'], uses: [] }, { id: 'beta', paths: ['src/beta/'], tests: ['test/beta/'], uses: ['alpha'] }] },
  'src/alpha/index.mjs': 'export const a = 1;\n',
};
const usesJobs = { beta: { 'src/beta/a.mjs': "import { b } from '../alpha/index.mjs';\nexport const c = b;\n" }, alpha: { 'src/alpha/index.mjs': 'export const a = 1;\nexport const b = 2;\n' } };

test('merge train: a user PR is held while its provider PR that changes what it imports is open, and goes once the provider merges', () => {
  const { root, ids } = setup(usesJobs, usesBase);
  const g = github(root, ids); // PR 1 beta (the user, first by number), PR 2 alpha (the provider)
  const lines = [];
  const r = run(root, g, { log: (l) => lines.push(l) });
  assert.deepEqual(g.calls.merged, [2], 'the provider first, though the user is older');
  assert.ok(lines.some((l) => /^PR 1 \(beta\) held: it imports alpha, whose open PR 2 changes its exports/.test(l)), lines.join('\n'));
  assert.deepEqual(r.rows[0].held, [{ pr: 1, module: 'beta', providers: [{ module: 'alpha', pr: 2 }] }]);
  assert.equal(r.rows[0].holds, 1, 'the provider holds one user');
  assert.deepEqual(stateRows(root, TRAIN_FILE)[0].held, r.rows[0].held, 'the hold in the train row');
  run(root, g);
  assert.deepEqual(g.calls.merged, [2, 1], 'the user goes once its provider merged');
});

test('merge train: a draft provider holds its user; a red provider holds nothing', () => {
  const { root, ids } = setup(usesJobs, usesBase);
  const g = github(root, ids);
  g.state.get(2).draft = true;
  const r = run(root, g);
  assert.deepEqual(g.calls.merged, [], 'the user waits for its draft provider');
  assert.equal(r.rows.length, 0);
  // The provider goes red on its head: the user is not held for it any more.
  const alpha = g.tipOf('job/alpha');
  const red = github(root, ids, { own: (sha) => (sha === alpha ? { id: 9, status: 'completed', conclusion: 'failure', completed_at: new Date().toISOString() } : null) });
  red.state.get(2).draft = true;
  run(root, red);
  assert.deepEqual(red.calls.merged, [1]);
});

test('merge train: a provider whose PR does not change its exports, or that its user does not import, holds nothing', () => {
  // alpha's job changes only a body; beta imports alpha.
  const same = setup({ beta: usesJobs.beta, alpha: { 'src/alpha/index.mjs': 'export const a = 1 + 0;\n' } }, usesBase);
  const g1 = github(same.root, same.ids);
  run(same.root, g1);
  assert.deepEqual(g1.calls.merged, [1]);
  // alpha adds an export; beta's change imports nothing of alpha.
  const apart = setup({ beta: { 'src/beta/a.mjs': 'export const c = 3;\n' }, alpha: usesJobs.alpha }, usesBase);
  const g2 = github(apart.root, apart.ids);
  run(apart.root, g2);
  assert.deepEqual(g2.calls.merged, [1]);
});

// Review round 1 (5 Nov): a provider that cannot land on its head holds nothing, and the hold is
// read again when the tranche moves.
test('merge train: a provider whose gate was cancelled, or that the train refused, holds nothing', () => {
  const { root, ids } = setup(usesJobs, usesBase);
  const alpha = () => git(['rev-parse', 'job/alpha'], { cwd: root }).trim();
  const g = github(root, ids, { own: (sha) => (sha === alpha() ? { id: 9, status: 'completed', conclusion: 'cancelled', completed_at: new Date().toISOString() } : null) });
  run(root, g);
  assert.deepEqual(g.calls.merged, [1], 'the user lands; its provider is not landing on this head');
  // A provider the train refused (a file outside its module) waits for a new head: its user goes.
  const two = setup({ ...usesJobs, alpha: { ...usesJobs.alpha, 'src/beta/x.mjs': 'not mine' } }, usesBase);
  const g2 = github(two.root, two.ids);
  const r = run(two.root, g2);
  assert.deepEqual(r.rows.map((x) => [x.pr, x.result]), [[2, 'refused']]);
  run(two.root, g2);
  assert.deepEqual(g2.calls.merged, [1], 'the user is not held behind a refused provider');
});

test('merge train: when the tranche moves, the hold is read again on the new tip', () => {
  const { root, ids } = setup(usesJobs, usesBase);
  const g = github(root, ids);
  g.state.get(2).draft = true;
  const open = g.io.openPRs;
  let calls = 0;
  g.io.openPRs = (...a) => {
    const out = open(...a);
    if (++calls === 1) {
      // After the first read: the tranche moves src/alpha/ out of alpha (alpha now owns src/alphax/).
      const wt = mkdtempSync(join(tmpdir(), 'p3-other-'));
      git(['clone', '-q', '--branch', 'tranche', git(['remote', 'get-url', 'origin'], { cwd: root }), wt], { cwd: root });
      for (const [k, v] of [['user.email', 'other@example.com'], ['user.name', 'Other'], ['commit.gpgsign', 'false']]) git(['config', k, v], { cwd: wt });
      commit(wt, { 'build/modules.json': JSON.stringify({ modules: [{ id: 'alpha', paths: ['src/alphax/'], tests: ['test/alpha/'], uses: [] }, { id: 'beta', paths: ['src/beta/'], tests: ['test/beta/'], uses: ['alpha'] }] }, null, 2) + '\n' });
      git(['push', '-q', 'origin', 'tranche'], { cwd: wt });
    }
    return out;
  };
  const lines = [];
  train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, log: (l) => lines.push(l), idleEvery: 1, rounds: 2, pipeline: false });
  assert.ok(lines.some((l) => /^PR 1 \(beta\) held/.test(l)), 'held on the first tip');
  assert.deepEqual(g.calls.merged, [1], 'on the new tip beta imports nothing alpha owns: not held');
});

// Review round 2 (5 Nov): an unreadable gate read on the provider holds nothing, and says so once.
test('merge train: a provider whose gate is unreadable holds nothing, and the train says so once', () => {
  const { root, ids } = setup(usesJobs, usesBase);
  const alpha = () => git(['rev-parse', 'job/alpha'], { cwd: root }).trim();
  const g = github(root, ids, { unread: (sha) => sha === alpha() });
  g.state.get(2).draft = true;
  const lines = [];
  train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, log: (l) => lines.push(l), once: true });
  assert.deepEqual(g.calls.merged, [1], 'the user lands');
  assert.equal(lines.filter((l) => /^PR 1 \(beta\) is not held for provider alpha \(PR 2\): .*gate .*unread/.test(l)).length, 1, lines.join('\n'));
});
