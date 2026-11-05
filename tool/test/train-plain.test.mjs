// Plain pull requests through the merge train (build train-plain, notes/train-plain-options.md,
// option A). Against a local bare origin and a fake GitHub whose merge refuses a head that does not
// hold the tranche as it is, as the copy's ruleset does: a plain merge from another session went
// stale on every land of the train (copy PR 338, PR 465).
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { fetchState, jsonl, readState, writeState } from '../lib/state.mjs';
import { PLAIN_FILE, TRAIN_FILE, plainHead, plainViaTrain, releaseLease, takeLease, train } from '../lib/train.mjs';
import { mergePlain } from '../lib/merge.mjs';
import { wakeLine } from '../lib/job.mjs';
import { Fail, git, loadConfig } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const S = 'session_merger1';
const OTHER = 'session_othertrain';
const quiet = () => {};
const done = JSON.stringify({ row: 'attempt', event: 'complete', at: new Date(Date.now() - 5 * 60000).toISOString(), attempt: 1 }) + '\n';

// Jobs (id -> files) are PRs 1..k; plain pull requests (ref -> files), cut from the tranche before
// it moved on, follow.
function setup(jobs, plains = {}) {
  const ids = Object.keys(jobs);
  const root = makeRepo({
    'README.md': 'x',
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
  const queued = {};
  for (const [ref, files] of Object.entries(plains)) {
    git(['checkout', '-q', '-b', ref, 'tranche'], { cwd: root });
    queued[ref] = commit(root, files);
  }
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'other.txt': 'the tranche moved on' });
  git(['push', '-q', 'origin', 'tranche', 'main', ...ids.map((id) => `job/${id}`), ...Object.keys(plains)], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, ids, plains: Object.keys(plains), queued };
}

function github(root, ids, plains, { aged = false } = {}) {
  const sh = (args) => git(args, { cwd: root, allowFail: true });
  const tipOf = (ref) => sh(['ls-remote', 'origin', `refs/heads/${ref}`]).stdout.split('\t')[0];
  const receipts = new Map(ids.map((id) => [id, tipOf(`job/${id}`)]));
  const state = new Map([...ids.map((id) => ({ ref: `job/${id}`, id })), ...plains.map((ref) => ({ ref }))].map((s, i) => [i + 1, { ...s, open: true, merged: false }]));
  const calls = { merged: [] };
  const pr = (n) => {
    const s = state.get(Number(n));
    return { number: Number(n), state: s.open ? 'open' : 'closed', merged: s.merged, merge_commit_sha: s.merge || null, draft: false, mergeable: true, user: { login: 'civicsmith' }, base: { ref: 'tranche', repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: s.ref, sha: tipOf(s.ref), repo: { full_name: 'o/r' } } };
  };
  const gate = (sha) => ({ id: 1, status: 'completed', conclusion: 'success', html_url: `https://ci/${sha.slice(0, 7)}`, started_at: new Date().toISOString(), completed_at: aged && [...receipts.values()].includes(sha) ? new Date(Date.now() - 120 * 60000).toISOString() : new Date().toISOString() });
  const io = {
    openPRs: () => [...state.keys()].filter((n) => state.get(n).open).map(pr),
    getPR: (slug, n) => pr(n),
    comments: (slug, n) => {
      const s = state.get(Number(n));
      if (!s.id) return [];
      return [
        { id: 1, body: block(RECEIPT, { module: s.id, attempt: 1, sha: receipts.get(s.id) }), user: { login: 'civicsmith' } },
        { id: 2, body: block(GATE, { runs: [{ sha: receipts.get(s.id), ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }, { sha: tipOf(s.ref), ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }] }), user: { login: BOT } },
      ];
    },
    verify: () => true,
    requiredChecks: () => ({ checks: [{ context: 'gate' }] }),
    repo: { released: () => false, shim: () => null, descends: () => false },
    checkRuns: (slug, sha) => [gate(sha)],
    checkRun: (slug, sha) => gate(sha),
    // GitHub's ruleset: a head that does not hold the tranche as it is cannot merge.
    mergePR: (slug, n, sha) => {
      sh(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche']);
      if (sh(['merge-base', '--is-ancestor', 'refs/remotes/origin/tranche', sha]).code !== 0) throw new Fail('gh api -X PUT failed: Base branch was modified. Review and try the merge again.');
      const c = git(['commit-tree', `${sha}^{tree}`, '-p', 'refs/remotes/origin/tranche', '-p', sha, '-m', `Merge PR ${n}`], { cwd: root });
      git(['push', '-q', 'origin', `${c}:refs/heads/tranche`], { cwd: root });
      Object.assign(state.get(Number(n)), { open: false, merged: true, merge: c });
      calls.merged.push(Number(n));
      return { merged: true, sha: c };
    },
  };
  return { io, calls, state, tipOf };
}
const runTrain = (root, g, o = {}) => train(root, { once: true, session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, log: quiet, ...o });
const rows = (root, f) => { fetchState(root, 'process-state', { fresh: true }); return jsonl(readState(root, 'process-state', f)); };
const messages = (root) => rows(root, 'messages/merger.jsonl');
// Another session's train holds a live lease while the caller queues; the pause hands over to ours.
const otherTrain = (root) => { takeLease(root, loadConfig(root), OTHER, 'tok', { take: true, proc: null }); return () => releaseLease(root, loadConfig(root), OTHER, 'tok'); };

test('under a live lease a plain PR is queued, taken before an aged job, brought up to the tranche, and landed through mergePlain; the caller prints the merged line', () => {
  const { root, ids, plains, queued } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } }, { 'bob/found': { 'notes/found.md': 'a found mark' } });
  const g = github(root, ids, plains, { aged: true });
  const stopOther = otherTrain(root);
  const lines = [];
  let pauses = 0;
  const r = plainViaTrain(root, 2, { slug: 'o/r', io: g.io, noReview: 'a found mark', log: (l) => lines.push(l), minutes: 5, pause: () => { if (pauses++ === 0) { stopOther(); runTrain(root, g); } } });
  assert.equal(r.merged, true);
  assert.deepEqual(g.calls.merged, [2], 'the plain PR went first; the aged job waits for the next round');
  assert.ok(lines.some((l) => /PR 2 is queued for it at \w+, before any job pull request/.test(l)));
  assert.ok(lines.some((l) => new RegExp(`^merged pull request 2 at ${r.sha} \\(`).test(l)), 'the same merged line as mergePlain prints');
  // The head that landed is the queued head with the tranche merged in by the train, nothing else.
  const landed = rows(root, TRAIN_FILE).find((x) => x.row === 'plain' && x.result !== 'taken');
  assert.equal(landed.result, 'merged');
  assert.equal(landed.head, queued['bob/found']);
  assert.equal(git(['rev-parse', `${landed.landed}^1`], { cwd: root }).trim(), queued['bob/found']);
  assert.equal(git(['log', '-1', '--format=%B', r.sha], { cwd: root }).trim().split('\n')[0], 'Merge PR 2');
  assert.equal(rows(root, PLAIN_FILE)[0].no_review, 'a found mark');
  // The next round takes the job.
  runTrain(root, g);
  assert.deepEqual(g.calls.merged, [2, 1]);
});

test('without a train, merge --plain is mergePlain as before: nothing queued, and a stale head is refused as GitHub refuses it', () => {
  const { root, ids, plains } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } }, { 'bob/found': { 'notes/found.md': 'x' } });
  const g = github(root, ids, plains);
  assert.throws(() => plainViaTrain(root, 2, { slug: 'o/r', io: g.io, noReview: 'x', log: quiet, wait: 0, every: 0 }), /base moved/);
  assert.equal(rows(root, PLAIN_FILE).length, 0);
  assert.deepEqual(g.calls.merged, []);
});

test('a queued plain PR the train refuses fails the caller with the reason, and BOB is told', () => {
  const { root, ids, plains } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } }, { 'bob/sneak': { 'src/alpha/b.mjs': 'module code' } });
  const g = github(root, ids, plains);
  const stopOther = otherTrain(root);
  assert.throws(() => plainViaTrain(root, 2, { slug: 'o/r', io: g.io, noReview: 'x', log: quiet, minutes: 5, pause: () => { stopOther(); runTrain(root, g); } }), /the merge train did not merge pull request 2: .*changes module files/);
  assert.deepEqual(g.calls.merged, []);
  assert.match(messages(root).at(-1).text, /^PR 2 \(plain, queued.*\) was not merged by the train: .*changes module files/);
  // Ended: the next round takes the job, not the refused plain PR again.
  runTrain(root, g);
  assert.deepEqual(g.calls.merged, [1]);
});

test('a head moved by anything but the train\'s clean merge of the tranche is refused: the review was of the queued head', () => {
  const { root, ids, plains, queued } = setup({}, { 'bob/found': { 'notes/found.md': 'x' } });
  const g = github(root, ids, plains);
  const stopOther = otherTrain(root);
  const pause = () => {
    stopOther();
    git(['checkout', '-q', 'bob/found'], { cwd: root });
    commit(root, { 'notes/found.md': 'changed after the review' });
    git(['push', '-q', 'origin', 'bob/found'], { cwd: root });
    git(['checkout', '-q', 'main'], { cwd: root });
    runTrain(root, g);
  };
  assert.throws(() => plainViaTrain(root, 1, { slug: 'o/r', io: g.io, noReview: 'x', log: quiet, minutes: 5, pause }), /not the head queued \(\w+\) with only the tranche merged in/);
  assert.deepEqual(g.calls.merged, []);
  // plainHead itself: a clean tranche merge on the queued head passes; an edited merge does not.
  const cfg = loadConfig(root);
  git(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche'], { cwd: root });
  const tree = git(['merge-tree', '--write-tree', queued['bob/found'], 'refs/remotes/origin/tranche'], { cwd: root }).trim().split('\n')[0];
  const clean = git(['commit-tree', tree, '-p', queued['bob/found'], '-p', 'refs/remotes/origin/tranche', '-m', 'm'], { cwd: root }).trim();
  assert.equal(plainHead(root, cfg, queued['bob/found'], clean), true);
  const other = git(['commit-tree', `${git(['rev-parse', 'main'], { cwd: root }).trim()}^{tree}`, '-p', queued['bob/found'], '-p', 'refs/remotes/origin/tranche', '-m', 'm'], { cwd: root }).trim();
  assert.equal(plainHead(root, cfg, queued['bob/found'], other), false);
});

test('the caller keeps its contract: a pin move\'s wake is printed as mergePlain prints it', () => {
  const { root, ids, plains } = setup({}, { 'pin/move': { 'notes/pin.md': 'x' } });
  const g = github(root, ids, plains);
  const stopOther = otherTrain(root);
  const lines = [];
  const what = 'pin moved to abc: run your wake steps (start check --wake prints a changed prompt), then status';
  const pause = () => {
    const id = rows(root, PLAIN_FILE)[0].id;
    writeState(root, 'process-state', 'test: a landed pin move', (wt) => { mkdirSync(join(wt, 'metrics'), { recursive: true }); appendFileSync(join(wt, TRAIN_FILE), JSON.stringify({ at: new Date().toISOString(), row: 'plain', queue: id, pr: 1, result: 'merged', sha: 'f'.repeat(40), merged_at: 'now', wake: 'w', what }) + '\n'); });
    stopOther();
  };
  const r = plainViaTrain(root, 1, { slug: 'o/r', io: g.io, noReview: 'a pin move', as: 'pin', log: (l) => lines.push(l), minutes: 5, pause });
  assert.equal(r.merged, true);
  assert.equal(r.what, what);
  assert.ok(lines.includes(wakeLine(what, 'pin')));
});

test('the caller withdraws on its time limit, and the train never lands a withdrawn PR; a train that stops hands the merge back to the caller', () => {
  const { root, ids, plains } = setup({}, { 'bob/found': { 'notes/found.md': 'x' }, 'bob/two': { 'notes/two.md': 'y' } });
  const g = github(root, ids, plains);
  const stopOther = otherTrain(root);
  assert.throws(() => plainViaTrain(root, 1, { slug: 'o/r', io: g.io, noReview: 'x', log: quiet, minutes: 0, queueMinutes: 0, pause: () => {} }), /did not land pull request 1 before its queue time ran out; it is withdrawn/);
  stopOther();
  runTrain(root, g);
  assert.deepEqual(g.calls.merged, [], 'withdrawn: not landed');
  // The lease goes while the caller waits and no train took it: merged here, as mergePlain does,
  // once the head holds the tranche.
  git(['fetch', '-q', 'origin', 'bob/two:bob/two', '+refs/heads/tranche:refs/remotes/origin/tranche'], { cwd: root });
  git(['checkout', '-q', 'bob/two'], { cwd: root });
  git(['merge', '-q', '--no-edit', 'refs/remotes/origin/tranche'], { cwd: root });
  git(['push', '-q', 'origin', 'bob/two'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const stop2 = otherTrain(root);
  const lines = [];
  const r = plainViaTrain(root, 2, { slug: 'o/r', io: g.io, noReview: 'x', log: (l) => lines.push(l), minutes: 5, wait: 0, every: 0, pause: stop2 });
  assert.equal(r.merged, true);
  assert.deepEqual(g.calls.merged, [2]);
  assert.ok(lines.some((l) => /no longer holds the tranche; PR 2 is withdrawn from its queue and merged here/.test(l)));
  assert.ok(rows(root, PLAIN_FILE).some((x) => x.row === 'withdraw' && x.pr === 2));
});

test('mergePlain refuses a head other than the one the train chose', () => {
  const { root, ids, plains } = setup({}, { 'bob/found': { 'notes/found.md': 'x' } });
  const g = github(root, ids, plains);
  assert.throws(() => mergePlain(root, 1, { slug: 'o/r', io: g.io, noReview: 'x', log: quiet, head: 'a'.repeat(40) }), /the head the train chose; nothing was merged/);
});

test('the train never pushes to a branch that is not a plain one of this repository: such a pull request is merged by mergePlain as before, never queued', () => {
  const { root, ids, plains } = setup({}, { 'bob/found': { 'notes/found.md': 'x' } });
  const g = github(root, ids, plains);
  g.state.get(1).ref = 'main'; // a pull request from main into the tranche
  const before = g.tipOf('main');
  const stopOther = otherTrain(root);
  assert.throws(() => plainViaTrain(root, 1, { slug: 'o/r', io: g.io, noReview: 'x', log: quiet, wait: 0, every: 0, pause: () => assert.fail('never queued') }));
  assert.equal(rows(root, PLAIN_FILE).length, 0);
  assert.equal(g.tipOf('main'), before);
  stopOther();
  // A row queued for it anyway (written by hand) is refused by the train, nothing pushed.
  writeState(root, 'process-state', 'test: a queued main', (wt) => { mkdirSync(join(wt, 'merger'), { recursive: true }); appendFileSync(join(wt, PLAIN_FILE), JSON.stringify({ at: new Date().toISOString(), row: 'queue', id: 'x1', pr: 1, head: before, as: 'bob', no_review: 'x', rounds: 0, take_by: new Date(Date.now() + 60000).toISOString() }) + '\n'); });
  runTrain(root, g);
  assert.equal(g.tipOf('main'), before);
  assert.match(rows(root, TRAIN_FILE).find((x) => x.row === 'plain' && x.result === 'refused').why, /is not a plain branch of o\/r the train may bring up to date/);
});

test('a queued row waits past --minutes while a job holds the train; --minutes count from the take', () => {
  const { root, ids, plains } = setup({}, { 'bob/found': { 'notes/found.md': 'x' } });
  const g = github(root, ids, plains);
  const stopOther = otherTrain(root);
  let pauses = 0;
  // --minutes 0: before the take the row still has one job gate wait; the train takes it on the third read.
  const r = plainViaTrain(root, 1, { slug: 'o/r', io: g.io, noReview: 'x', log: quiet, minutes: 0, pause: () => { if (++pauses === 3) { stopOther(); runTrain(root, g); } } });
  assert.equal(r.merged, true);
  assert.equal(pauses, 3);
});

test('a row whose caller died (no withdrawal) ends at its take_by: the train does not land it', () => {
  const { root, ids, plains, queued } = setup({}, { 'bob/found': { 'notes/found.md': 'x' } });
  const g = github(root, ids, plains);
  writeState(root, 'process-state', 'test: an abandoned row', (wt) => { mkdirSync(join(wt, 'merger'), { recursive: true }); appendFileSync(join(wt, PLAIN_FILE), JSON.stringify({ at: new Date(Date.now() - 200 * 60000).toISOString(), row: 'queue', id: 'dead', pr: 1, head: queued['bob/found'], as: 'bob', no_review: 'x', rounds: 0, take_by: new Date(Date.now() - 60000).toISOString() }) + '\n'); });
  runTrain(root, g);
  assert.deepEqual(g.calls.merged, []);
});

test('a caller that stops on an error withdraws its row', () => {
  const { root, ids, plains } = setup({}, { 'bob/found': { 'notes/found.md': 'x' } });
  const g = github(root, ids, plains);
  const stopOther = otherTrain(root);
  assert.throws(() => plainViaTrain(root, 1, { slug: 'o/r', io: g.io, noReview: 'x', log: quiet, pause: () => { throw new Fail('interrupted'); } }), /interrupted/);
  stopOther();
  assert.ok(rows(root, PLAIN_FILE).some((x) => x.row === 'withdraw' && /the caller stopped: interrupted/.test(x.why)));
  runTrain(root, g);
  assert.deepEqual(g.calls.merged, []);
});

test('a moved base is tried again with a backoff, not refused', () => {
  const { root, ids, plains } = setup({}, { 'bob/found': { 'notes/found.md': 'x' } });
  const g = github(root, ids, plains);
  const merge = g.io.mergePR;
  let n = 0;
  g.io.mergePR = (...a) => { if (n++ < 3) throw new Fail('gh api -X PUT failed: Base branch was modified. Review and try the merge again.'); return merge(...a); };
  const stopOther = otherTrain(root);
  const lines = [];
  assert.throws(() => plainViaTrain(root, 1, { slug: 'o/r', io: g.io, noReview: 'x', log: quiet, minutes: 5, pause: () => { if (lines.length) throw new Fail('stop'); stopOther(); runTrain(root, g, { log: (l) => lines.push(l) }); otherTrain(root); } }), /stop/);
  const r = rows(root, TRAIN_FILE).filter((x) => x.row === 'plain' && x.result !== 'taken');
  assert.equal(r[0].result, 'retry');
  assert.ok(lines.some((l) => /PR 1 \(plain\) is tried again in 1 min/.test(l)));
});
