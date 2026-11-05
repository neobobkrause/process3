// merge train (train.mjs): a batch of ready pull requests, gated once, landed by GitHub's merge of
// its train pull request; a red batch bisected by halves. Against a local bare origin, a fake gate
// and a fake GitHub that marks a pull request merged once its head is on the tranche.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { readRows } from '../lib/metrics.mjs';
import { jsonl, readState, fetchState } from '../lib/state.mjs';
import { TRAIN_FILE, train, trainSummary } from '../lib/train.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const IDS = ['alpha', 'beta', 'gamma'];
const done = (n) => JSON.stringify({ row: 'attempt', event: 'complete', at: new Date(Date.now() - n * 60000).toISOString(), attempt: 1 }) + '\n';

function setup() {
  const root = makeRepo(Object.fromEntries(IDS.map((id) => [`process/ledger/${id}.json`, entry(id)])));
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  const heads = {};
  for (const id of IDS) {
    git(['checkout', '-q', '-b', `job/${id}`, 'tranche'], { cwd: root });
    heads[id] = commit(root, { [`src/${id}/a.mjs`]: `${id}${id === 'beta' ? ' BROKEN' : ''}`, [`process/metrics/${id}.jsonl`]: done(5) });
  }
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'other.txt': 'the tranche moved on' });
  git(['push', '-q', 'origin', 'tranche', 'main', ...IDS.map((id) => `job/${id}`)], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, heads };
}

// A fake GitHub: job PRs 1..3, train PRs from 100; the gate fails any commit holding "BROKEN".
function github(root, heads) {
  const prs = new Map(IDS.map((id, i) => [i + 1, { number: i + 1, state: 'open', draft: false, mergeable: true, user: { login: 'civicsmith' }, base: { ref: 'tranche', repo: { default_branch: 'main' } }, head: { ref: `job/${id}`, sha: heads[id], repo: { full_name: 'o/r' } } }]));
  const sh = (args) => git(args, { cwd: root, allowFail: true });
  const onTranche = (sha) => { sh(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche']); return sh(['merge-base', '--is-ancestor', sha, 'refs/remotes/origin/tranche']).code === 0; };
  const calls = { gates: [], merged: [] };
  let next = 100;
  const io = {
    openPRs: () => [...prs.values()].filter((p) => p.state === 'open' && !onTranche(p.head.sha)),
    getPR: (slug, n) => { const p = prs.get(Number(n)); return p.number < 100 && onTranche(p.head.sha) ? { ...p, state: 'closed', merged: true } : p; },
    comments: (slug, n) => {
      const p = prs.get(Number(n));
      return [
        { id: 1, body: block(RECEIPT, { module: p.head.ref.slice(4), attempt: 1, sha: p.head.sha }), user: { login: 'civicsmith' } },
        { id: 2, body: block(GATE, { runs: [{ sha: p.head.sha, ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }] }), user: { login: BOT } },
      ];
    },
    verify: () => true,
    checkRun: (slug, sha) => {
      const own = [...prs.values()].some((p) => p.number < 100 && p.head.sha === sha);
      const broken = !own && sh(['grep', '-q', 'BROKEN', sha, '--', 'src']).code === 0;
      if (!own) calls.gates.push(sha);
      return { status: 'completed', conclusion: broken ? 'failure' : 'success', html_url: `https://ci/${sha.slice(0, 7)}`, started_at: new Date(Date.now() - 6e5).toISOString(), completed_at: new Date().toISOString() };
    },
    createPR: (slug, { head, base }) => {
      const sha = sh(['ls-remote', 'origin', `refs/heads/${head}`]).stdout.split('\t')[0];
      const p = { number: next++, state: 'open', base: { ref: base }, head: { ref: head, sha, repo: { full_name: 'o/r' } } };
      prs.set(p.number, p);
      return p;
    },
    editPR: (slug, n, f) => Object.assign(prs.get(n), f),
    // GitHub's merge of the train PR: a merge commit, tranche first, the batch's tree.
    mergePR: (slug, n, sha, { title }) => {
      sh(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche']);
      const c = git(['commit-tree', `${sha}^{tree}`, '-p', 'refs/remotes/origin/tranche', '-p', sha, '-m', title], { cwd: root });
      git(['push', '-q', 'origin', `${c}:refs/heads/tranche`], { cwd: root });
      prs.get(n).state = 'closed';
      calls.merged.push(n);
      return { merged: true, sha: c };
    },
  };
  return { io, calls, prs };
}

test('merge train: a 3-member batch with one culprit is bisected, the two good PRs land and the culprit is reported', () => {
  const { root, heads } = setup();
  const g = github(root, heads);
  const said = [];
  const r = train(root, { once: true, slug: 'o/r', io: g.io, plainIO: {}, every: 1, wait: 0, log: (l) => said.push(l) });
  const row = r.rows[0];
  // Full batch red; [1, 2] red; [1] green and landed; [2] red: culprit; [3] green and landed.
  assert.deepEqual(row.gates.map((x) => [x.prs, x.conclusion]), [[[1, 2, 3], 'failure'], [[1, 2], 'failure'], [[1], 'success'], [[2], 'failure'], [[3], 'success']]);
  assert.deepEqual(row.merged.map((x) => x.pr), [1, 3]);
  assert.deepEqual(row.culprits.map((x) => x.pr), [2]);
  assert.equal(row.result, 'partial');
  assert.equal(row.bisection_gates, 4);
  assert.ok(said.some((l) => /^TELL job beta: PR 2 at \w+ fails the gate merged with tranche .*https:\/\/ci\//.test(l)), said.join('\n'));
  // Each member is its own merge commit on the tranche, with its merge row; the culprit is not there.
  git(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche'], { cwd: root });
  const subjects = git(['log', '--format=%s', 'refs/remotes/origin/tranche'], { cwd: root }).split('\n');
  assert.ok(subjects.includes('Merge job PR 1') && subjects.includes('Merge job PR 3') && !subjects.includes('Merge job PR 2'));
  assert.equal(subjects.filter((s) => /^Merge train PR \d+$/.test(s)).length, 2, 'each landed half by its train PR');
  git(['checkout', '-q', '--detach', 'refs/remotes/origin/tranche'], { cwd: root });
  assert.equal(readRows(root, 'alpha').at(-1).row, 'merge');
  assert.equal(readRows(root, 'alpha').at(-1).review, 'merge train: no review recorded, and no review trigger fired');
  assert.equal(readRows(root, 'beta').length, 0, 'the culprit wrote nothing on the tranche');
  git(['checkout', '-q', 'main'], { cwd: root });
  // Never main; the merges were only of train PRs; GitHub shows the members merged.
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/main'], { cwd: root }).split('\t')[0], git(['rev-parse', 'main'], { cwd: root }));
  assert.ok(g.calls.merged.every((n) => n >= 100));
  assert.deepEqual(row.merged.map((x) => x.github), ['merged', 'merged']);
  // The row on the state branch, and the summary beside the baseline.
  fetchState(root, 'process-state', { fresh: true });
  const rows = jsonl(readState(root, 'process-state', TRAIN_FILE));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].push_tries, 1);
  const s = trainSummary(rows);
  assert.equal(s.merged_prs, 2);
  assert.equal(s.gate_runs, 5);
  assert.equal(s.culprits, 1);
  assert.deepEqual(s.baseline, { median: 11, worst: 85 });
  // The next run takes nothing: the culprit waits for a new head.
  const again = train(root, { once: true, slug: 'o/r', io: g.io, plainIO: {}, every: 1, wait: 0, log: () => {} });
  assert.equal(again.rows.length, 0);
});

test('merge train: a member that moved while the batch was gated is not landed', () => {
  const { root, heads } = setup();
  const g = github(root, heads);
  const check = g.io.checkRun;
  g.io.checkRun = (slug, sha) => {
    const r = check(slug, sha);
    if (!Object.values(heads).includes(sha)) g.prs.get(1).head = { ...g.prs.get(1).head, sha: 'f'.repeat(40) };
    return r;
  };
  g.prs.get(2).state = 'closed'; // the culprit out of play
  const r = train(root, { once: true, slug: 'o/r', io: g.io, plainIO: {}, every: 1, wait: 0, log: () => {} });
  assert.equal(r.rows[0].merged.length, 0);
  assert.ok(r.rows[0].waiting.some((w) => /member PR 1 changed/.test(w.why)));
  assert.deepEqual(g.calls.merged, []);
});

test('merge train refuses a second train beside the merger', () => {
  const { root, heads } = setup();
  const g = github(root, heads);
  assert.throws(() => train(root, { once: true, slug: 'o/r', io: g.io, merger: 'session_a', session: 'session_b', log: () => {} }), /one train runs/);
});
