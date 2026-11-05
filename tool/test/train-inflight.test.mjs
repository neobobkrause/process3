// The in-flight hold (build train-inflight, item 8; the coordinator's ruling, 5 Nov): copy PR 290's
// merged result 3660ddc was gating 38 min when one read of the pull request got GitHub HTTP 503;
// the train backed 290 off, landed plain PRs 505 and 506 (the tranche moved), and 290 needed a new
// merged result and another 40-minute gate. Against a local bare origin and a fake GitHub.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { fetchState, jsonl, readState, writeState } from '../lib/state.mjs';
import { TRAIN_FILE, train } from '../lib/train.mjs';
import { INFLIGHT_FILE, openHold } from '../lib/inflight.mjs';
import { merge, waitForChecks, waitForGate } from '../lib/merge.mjs';
import { Fail, git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const S = 'session_merger1';
const SB = 'process-state';
const quiet = () => {};
const QUICK = { first: 1, most: 1 };
const done = JSON.stringify({ row: 'attempt', event: 'complete', at: new Date(Date.now() - 5 * 60000).toISOString(), attempt: 1 }) + '\n';
const E503 = 'gh api repos/o/r/pulls/1 failed: HTTP 503: Service Unavailable (https://api.github.com/repos/o/r/pulls/1)';

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

// gating(sha): how many more reads a merged result's gate stays in progress (default 0).
function github(root, ids) {
  const sh = (args) => git(args, { cwd: root, allowFail: true });
  const tipOf = (ref) => sh(['ls-remote', 'origin', `refs/heads/${ref}`]).stdout.split('\t')[0];
  const receipts = new Map(ids.map((id) => [id, tipOf(`job/${id}`)]));
  const state = new Map(ids.map((id, i) => [i + 1, { id, open: true, merged: false }]));
  const reads = new Map();
  const calls = { merged: [], landed: [] };
  const ctl = { gateReads: 3, failPR: null }; // failPR(n): a Fail to throw from getPR, or null
  const pr = (n) => {
    const s = state.get(Number(n));
    return { number: Number(n), state: s.open ? 'open' : 'closed', merged: s.merged, merge_commit_sha: s.merge || null, draft: false, mergeable: true, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: `job/${s.id}`, sha: tipOf(`job/${s.id}`), repo: { full_name: 'o/r' } } };
  };
  const merged = (sha) => ![...receipts.values()].includes(sha);
  const io = {
    openPRs: () => [...state.keys()].filter((n) => state.get(n).open).map(pr),
    getPR: (slug, n) => { const f = ctl.failPR?.(Number(n)); if (f) throw f; return pr(n); },
    comments: (slug, n) => {
      const s = state.get(Number(n));
      const head = tipOf(`job/${s.id}`);
      return [
        { id: 1, body: block(RECEIPT, { module: s.id, attempt: 1, sha: receipts.get(s.id) }), user: { login: 'civicsmith' } },
        { id: 2, body: block(GATE, { runs: [{ sha: receipts.get(s.id), ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }, { sha: head, ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }] }), user: { login: BOT } },
      ];
    },
    verify: () => true,
    checkRuns: (slug, sha, name) => { const g = io.checkRun(slug, sha, name); return g ? [g] : []; },
    // A merged result's gate is in progress for its first ctl.gateReads reads, then green.
    checkRun: (slug, sha) => {
      const k = (reads.get(sha) || 0) + 1;
      reads.set(sha, k);
      if (merged(sha) && k <= ctl.gateReads) return { id: 7, status: 'in_progress', started_at: new Date().toISOString(), html_url: `https://ci/${sha.slice(0, 7)}` };
      return { id: 1, status: 'completed', conclusion: 'success', html_url: `https://ci/${sha.slice(0, 7)}`, started_at: new Date().toISOString(), completed_at: new Date().toISOString() };
    },
    mergePR: (slug, n, sha) => {
      sh(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche']);
      if (sh(['merge-base', '--is-ancestor', 'refs/remotes/origin/tranche', sha]).code !== 0) throw new Fail('gh api -X PUT failed: Base branch was modified. Review and try the merge again.');
      const c = git(['commit-tree', `${sha}^{tree}`, '-p', 'refs/remotes/origin/tranche', '-p', sha, '-m', `Merge job PR ${n}`], { cwd: root });
      git(['push', '-q', 'origin', `${c}:refs/heads/tranche`], { cwd: root });
      Object.assign(state.get(Number(n)), { open: false, merged: true, merge: c });
      calls.merged.push(Number(n));
      calls.landed.push(sha);
      return { merged: true, sha: c };
    },
  };
  return { io, calls, state, tipOf, ctl, receipts, merged };
}
const run = (root, g, o = {}) => train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, idleEvery: 0, transient: QUICK, pipeline: false, log: quiet, ...o });
const rows = (root, f) => { fetchState(root, SB, { fresh: true }); return jsonl(readState(root, SB, f)); };
// getPR fails once, as `msg`, while alpha's merged result is gating (after the merge pushed it).
const failOnceWhileGating = (g, msg) => { let thrown = false; g.ctl.failPR = (n) => (n === 1 && !thrown && g.merged(g.tipOf('job/alpha')) ? (thrown = true, new Fail(msg)) : null); };

// 8A
test('the gate waits read again after a transient GitHub error (5xx, rate limit, timeout); any other error ends them as before', () => {
  for (const wait of [waitForGate, waitForChecks]) {
    let n = 0;
    const read = (slug, sha) => {
      n++;
      if (n <= 2) throw new Fail(E503);
      const r = { status: 'completed', conclusion: 'success' };
      return wait === waitForChecks ? [r] : r;
    };
    const lines = [];
    const out = wait === waitForChecks ? waitForChecks('o/r', 'a'.repeat(40), ['gate'], { read, every: 1, transient: QUICK, log: (l) => lines.push(l) }) : waitForGate('o/r', 'a'.repeat(40), { read, every: 1, transient: QUICK, log: (l) => lines.push(l) });
    assert.ok(out, wait.name);
    assert.equal(lines.filter((l) => /^GitHub read failed .*HTTP 503.*transient: read again/.test(l)).length, 2, wait.name);
    for (const msg of ['gh api x failed: API rate limit exceeded for installation', 'gh api x failed: Post "https://api.github.com": net/http: TLS handshake timeout', 'read ECONNRESET']) {
      let k = 0;
      const r2 = () => { if (k++ === 0) throw new Fail(msg); return wait === waitForChecks ? [{ status: 'completed', conclusion: 'success' }] : { status: 'completed', conclusion: 'success' }; };
      assert.ok(wait === waitForChecks ? waitForChecks('o/r', 'a'.repeat(40), ['gate'], { read: r2, every: 1, transient: QUICK, log: quiet }) : waitForGate('o/r', 'a'.repeat(40), { read: r2, every: 1, transient: QUICK, log: quiet }), msg);
    }
    assert.throws(() => (wait === waitForChecks ? waitForChecks('o/r', 'a'.repeat(40), ['gate'], { read: () => { throw new Fail('gh api x failed: HTTP 404: Not Found'); }, every: 1, transient: QUICK, log: quiet }) : waitForGate('o/r', 'a'.repeat(40), { read: () => { throw new Fail('gh api x failed: HTTP 404: Not Found'); }, every: 1, transient: QUICK, log: quiet })), /404/);
  }
});

test('a 503 while a merged result gates: the train keeps waiting on that same gate and lands it first; the next job waits', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } });
  const g = github(root, ids);
  failOnceWhileGating(g, E503);
  const lines = [];
  run(root, g, { rounds: 2, log: (l) => lines.push(l) });
  assert.deepEqual(g.calls.merged, [1, 2]);
  assert.ok(lines.some((l) => /GitHub read failed .*HTTP 503.*still waiting on the same run/.test(l)));
  assert.equal(rows(root, TRAIN_FILE).filter((x) => x.row === 'merge' && x.pr === 1).map((x) => x.result).join(), 'merged', 'no retry row for alpha');
  const h = rows(root, INFLIGHT_FILE);
  assert.deepEqual(h.filter((x) => x.pr === 1).map((x) => [x.row, x.cause || null]), [['inflight', null], ['end', 'landed']]);
});

// 8B
test('an error that still ends the merge under a gate in flight: the hold keeps every other land off the tranche, and the same merged result lands', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } });
  const g = github(root, ids);
  g.ctl.gateReads = 6;
  failOnceWhileGating(g, 'could not read pull request 1 (an unexpected answer)');
  const lines = [];
  run(root, g, { rounds: 3, log: (l) => lines.push(l) });
  assert.deepEqual(g.calls.merged, [1, 2], 'beta waited for alpha\'s gate');
  const held = rows(root, INFLIGHT_FILE).filter((x) => x.pr === 1);
  assert.equal(held[0].row, 'inflight');
  assert.equal(g.calls.landed[0], held[0].tip, 'the merged result that gated is the one landed: nothing re-pushed');
  assert.deepEqual(held.map((x) => x.cause || x.row), ['inflight', 'landed']);
  const alpha = rows(root, TRAIN_FILE).filter((x) => x.row === 'merge' && x.pr === 1).map((x) => x.result);
  assert.deepEqual(alpha, ['retry', 'merged']);
});

test('a restarted train: an open hold is taken back (the same merged result, nothing re-pushed); one past its cap, or under a tranche that moved, is ended with its cause', () => {
  for (const kind of ['resume', 'cap', 'moved']) {
    const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } });
    const g = github(root, ids);
    g.ctl.gateReads = 50;
    failOnceWhileGating(g, 'could not read pull request 1 (an unexpected answer)');
    run(root, g, { rounds: 1 }); // the first train: alpha's merged result pushed and held; then the train dies
    const tip = g.tipOf('job/alpha');
    assert.ok(openHold(rows(root, INFLIGHT_FILE)), kind);
    g.ctl.gateReads = 0;
    if (kind === 'cap') writeState(root, SB, 'test: an old hold', (wt) => { const f = join(wt, INFLIGHT_FILE); const old = jsonl(readState(root, SB, INFLIGHT_FILE)).map((r) => ({ ...r, until: new Date(Date.now() - 60000).toISOString() })); mkdirSync(join(wt, 'merger'), { recursive: true }); writeFileSync(f, old.map((r) => JSON.stringify(r)).join('\n') + '\n'); });
    if (kind === 'moved') { git(['fetch', '-q', 'origin', 'tranche:tranche'], { cwd: root }); git(['checkout', '-q', 'tranche'], { cwd: root }); commit(root, { 'by-hand.txt': 'merged on GitHub' }); git(['push', '-q', 'origin', 'tranche'], { cwd: root }); git(['checkout', '-q', 'main'], { cwd: root }); }
    run(root, g, { rounds: 3 });
    const ends = rows(root, INFLIGHT_FILE).filter((x) => x.row === 'end' && x.pr === 1).map((x) => x.cause);
    if (kind === 'resume') {
      assert.deepEqual(ends, ['landed']);
      assert.equal(g.calls.landed[0], tip, 'taken back on the same merged result');
      assert.deepEqual(g.calls.merged, [1, 2]);
    } else {
      assert.match(ends[0], kind === 'cap' ? /^its gate's cap passed/ : /^tranche moved$/);
    }
  }
});

// The addition, and the cold review's findings
test('outside the train, merge into the tranche is refused while another PR\'s merged result is held, gating or green and not yet landed; a red gate frees it', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } });
  const g = github(root, ids);
  g.ctl.gateReads = 50;
  failOnceWhileGating(g, 'could not read pull request 1 (an unexpected answer)');
  run(root, g, { rounds: 1 });
  assert.throws(() => merge(root, 2, { slug: 'o/r', io: g.io, noReview: 'x', every: 1, wait: 0, log: quiet }), /pull request 1's merged result \w+ is gating on tranche .*held by the merge train.*nothing was merged/);
  g.ctl.gateReads = 0; // green, not yet landed by the train: still held
  assert.throws(() => merge(root, 2, { slug: 'o/r', io: g.io, noReview: 'x', every: 1, wait: 0, log: quiet }), /is green and not yet landed on tranche/);
  assert.deepEqual(g.calls.merged, []);
  const tip = g.tipOf('job/alpha');
  const check = g.io.checkRun;
  g.io.checkRun = (slug, sha, name) => (sha === tip ? { id: 9, status: 'completed', conclusion: 'failure', html_url: 'https://ci/red' } : check(slug, sha, name));
  assert.equal(merge(root, 2, { slug: 'o/r', io: g.io, noReview: 'x', every: 1, wait: 0, log: quiet }).merged, true, 'a red held gate frees the tranche');
});

test('review: a held gate that ends red, a held PR made a draft or retargeted, each ends the hold with its cause; the next job lands', () => {
  for (const kind of ['red', 'draft', 'retarget']) {
    const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } });
    const g = github(root, ids);
    g.ctl.gateReads = 50;
    failOnceWhileGating(g, 'could not read pull request 1 (an unexpected answer)');
    run(root, g, { rounds: 1 });
    const tip = g.tipOf('job/alpha');
    const check = g.io.checkRun;
    const get = g.io.getPR;
    g.ctl.failPR = null;
    if (kind === 'red') g.io.checkRun = (slug, sha, name) => (sha === tip ? { id: 9, status: 'completed', conclusion: 'failure', html_url: 'https://ci/red' } : check(slug, sha, name));
    else g.io.getPR = (slug, n) => { const p = get(slug, n); return Number(n) === 1 ? (kind === 'draft' ? { ...p, draft: true } : { ...p, base: { ref: 'elsewhere' } }) : p; };
    g.ctl.gateReads = 0;
    run(root, g, { rounds: 2 });
    const end = rows(root, INFLIGHT_FILE).find((x) => x.row === 'end' && x.pr === 1);
    assert.match(end.cause, kind === 'red' ? /^gate failure: https:\/\/ci\/red$/ : kind === 'draft' ? /^withdrawn: made a draft$/ : /^retargeted to elsewhere$/, kind);
    assert.ok(g.calls.merged.includes(2), `${kind}: beta lands once the hold ends`);
  }
});

test('review: a restarted train whose clone lacks the held tip fetches it, and does not end the hold as "tranche moved"', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } });
  const g = github(root, ids);
  g.ctl.gateReads = 50;
  failOnceWhileGating(g, 'could not read pull request 1 (an unexpected answer)');
  run(root, g, { rounds: 1 });
  const tip = g.tipOf('job/alpha');
  // A fresh clone of origin with only the tranche and main: alpha's merged result is not in it.
  const bare = git(['remote', 'get-url', 'origin'], { cwd: root });
  const fresh = join(mkdtempSync(join(tmpdir(), 'p3-fresh-')), 'c');
  git(['clone', '-q', '--no-local', '--single-branch', '-b', 'main', bare, fresh], { cwd: root });
  for (const k of ['user.email', 'user.name']) git(['config', k, git(['config', k], { cwd: root })], { cwd: fresh });
  git(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche'], { cwd: fresh });
  assert.notEqual(git(['cat-file', '-e', `${tip}^{commit}`], { cwd: fresh, allowFail: true }).code, 0, 'the tip is not in the fresh clone');
  g.ctl.gateReads = 0;
  run(fresh, g, { rounds: 3 });
  const ends = rows(fresh, INFLIGHT_FILE).filter((x) => x.row === 'end' && x.pr === 1).map((x) => x.cause);
  assert.deepEqual(ends, ['landed']);
  assert.equal(g.calls.landed[0], tip, 'the held merged result, not a new one');
  assert.equal(g.calls.merged[0], 1, 'nothing landed before it');
});
