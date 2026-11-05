// The merge train's window (merge_train_window > 1; window.mjs, notes/train-spec-plan.md, C'),
// through train() against a local bare origin and a fake GitHub: spec pairs built on the chain,
// a red at position 1 refused and those behind rebuilt on R(0), lands on their spec, and nothing
// ever force-pushed or deleted. A window of 1 is the serial train: no spec pull request at all.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { fetchState, jsonl, readState } from '../lib/state.mjs';
import { SPEC_REBUILDS, TRAIN_FILE, WINDOW_FILE, buildResult, train, trainLines, trainSummary } from '../lib/train.mjs';
import { Fail, git } from '../lib/util.mjs';
import { mergePlain } from '../lib/merge.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const S = 'session_merger1';
const done = JSON.stringify({ row: 'attempt', event: 'complete', at: new Date(Date.now() - 5 * 60000).toISOString(), attempt: 1 }) + '\n';

function setup(jobs, k) {
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
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'other.txt': 'the tranche moved on' });
  git(['push', '-q', 'origin', 'tranche', 'main', ...ids.map((id) => `job/${id}`)], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, ids };
}

// Job PRs 1..n; spec PRs from 101. A gate is red on any tree whose src holds BROKEN, except a job's
// own head (its gate passed). Every ref update is logged, to show none was a rewrite.
function github(root, ids) {
  const sh = (args) => git(args, { cwd: root, allowFail: true });
  const runOf = (sha) => 1000 + parseInt(sha.slice(0, 6), 16);
  const tipOf = (ref) => sh(['ls-remote', 'origin', `refs/heads/${ref}`]).stdout.split('\t')[0];
  const heads = new Map(ids.map((id) => [id, tipOf(`job/${id}`)]));
  const jobs = new Map(ids.map((id, i) => [i + 1, { id, open: true, merged: false }]));
  const specs = new Map();
  const calls = { merged: [], created: [], closed: [] };
  const job = (n) => {
    const s = jobs.get(n);
    return { number: n, state: s.open ? 'open' : 'closed', merged: s.merged, merge_commit_sha: s.merge || null, draft: false, mergeable: true, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: `job/${s.id}`, sha: tipOf(`job/${s.id}`), repo: { full_name: 'o/r' } } };
  };
  const spec = (n) => { const s = specs.get(n); return { number: n, state: s.open ? 'open' : 'closed', draft: true, base: { ref: s.base }, head: { ref: s.head, sha: tipOf(s.head), repo: { full_name: 'o/r' } } }; };
  const io = {
    openPRs: () => [...jobs.keys()].filter((n) => jobs.get(n).open).map(job),
    getPR: (slug, n) => (specs.has(Number(n)) ? spec(Number(n)) : job(Number(n))),
    createPR: (slug, { head, base, draft }) => {
      assert.equal(draft, true, 'a spec pull request is a draft');
      const n = 101 + specs.size;
      specs.set(n, { head, base, open: true, sha: tipOf(head) });
      calls.created.push({ n, head, base });
      return { number: n };
    },
    editPR: (slug, n, f) => { assert.deepEqual(f, { state: 'closed' }); specs.get(Number(n)).open = false; calls.closed.push(Number(n)); return { number: Number(n) }; },
    comments: (slug, n) => {
      // A spec PR: its gate's row, judged as the job (trigger code) unless calls.unjudged says not.
      if (specs.has(Number(n))) {
        const sha = specs.get(Number(n)).sha;
        const g = io.checkRun(slug, sha);
        return [{ id: 3, body: block(GATE, { runs: [{ sha, ok: g.conclusion === 'success', trigger: calls.unjudged ? 'draft' : 'code', run_id: runOf(sha) }] }), user: { login: BOT } }];
      }
      const s = jobs.get(Number(n));
      const head = tipOf(`job/${s.id}`);
      return [
        { id: 1, body: block(RECEIPT, { module: s.id, attempt: 1, sha: heads.get(s.id) }), user: { login: 'civicsmith' } },
        { id: 2, body: block(GATE, { runs: [{ sha: heads.get(s.id), ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }, { sha: head, ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }] }), user: { login: BOT } },
      ];
    },
    verify: () => true,
    checkRuns: (slug, sha, name) => [io.checkRun(slug, sha, name)],
    checkRun: (slug, sha) => {
      const red = ![...heads.values()].includes(sha) && sh(['grep', '-q', 'BROKEN', sha, '--', 'src']).code === 0;
      const t = new Date(Date.now() - 60000).toISOString();
      // A check run's id is not its Actions run's id: the run id is in its links, as on GitHub.
      return { id: 1, status: 'completed', conclusion: red ? 'failure' : 'success', html_url: `https://github.com/o/r/actions/runs/${runOf(sha)}/job/9`, details_url: `https://github.com/o/r/actions/runs/${runOf(sha)}/job/9`, started_at: t, completed_at: t };
    },
    // hold: the spec gates stay in progress (a job's own gate is still read green).
    checkRunMany: (slug, pairs) => pairs.map(([sha, name]) => (calls.hold && [...specs.values()].some((x) => x.sha === sha) ? { status: 'in_progress' } : name === 'post' ? { status: 'completed', started_at: new Date().toISOString() } : io.checkRun(slug, sha, name))),
    mergePR: (slug, n, sha) => {
      sh(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche']);
      if (sh(['merge-base', '--is-ancestor', 'refs/remotes/origin/tranche', sha]).code !== 0) throw new Fail('gh api -X PUT failed: Base branch was modified. Review and try the merge again.');
      const c = git(['commit-tree', `${sha}^{tree}`, '-p', 'refs/remotes/origin/tranche', '-p', sha, '-m', `Merge job PR ${n}`], { cwd: root });
      git(['push', '-q', 'origin', `${c}:refs/heads/tranche`], { cwd: root });
      Object.assign(jobs.get(Number(n)), { open: false, merged: true, merge: c });
      calls.merged.push(Number(n));
      return { merged: true, sha: c };
    },
  };
  return { io, calls, specs, tipOf };
}
const stateRows = (root, f) => { fetchState(root, 'process-state', { fresh: true }); return jsonl(readState(root, 'process-state', f)); };
const refs = (root) => new Map(git(['ls-remote', 'origin', 'refs/heads/train/*'], { cwd: root }).split('\n').filter(Boolean).map((l) => l.split('\t').reverse()));
const run = (root, g, rounds, lines = []) => train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, idleEvery: 1, rounds, log: (l) => lines.push(l) });

test('window of 3: specs on the chain; a red at position 1 is not refused behind PR 1 but judged again at the head, then refused; the one behind kept, then rebuilt without it; lands on their spec; no ref rewritten or deleted', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'BROKEN' }, gamma: { 'src/gamma/a.mjs': 'c' } }, 3);
  const g = github(root, ids);
  const seen = new Map(); // every train/* ref, with the first sha it held
  const watch = () => { for (const [r, sha] of refs(root)) { if (!seen.has(r)) seen.set(r, sha); else assert.equal(sha, seen.get(r), `${r} was rewritten`); } };
  const lines = [];
  // Pass 1 builds the window (three specs on the chain); pass 2 reads the red at position 1 and
  // lands position 0; later passes rebuild gamma on the new tip and land it.
  run(root, g, 1, lines);
  watch();
  assert.equal(g.calls.created.length, 3, lines.join('\n'));
  const [a, b, c] = g.calls.created;
  assert.deepEqual([a.head, b.head, c.head], ['train/head/1-1', 'train/head/2-1', 'train/head/3-1']);
  // Every spec PR is into the tranche itself; no spec base branch exists. The chain is in the heads:
  // R(0) is built on the tranche tip, each next on the one ahead (its first parent's history).
  assert.deepEqual([a.base, b.base, c.base], ['tranche', 'tranche', 'tranche']);
  assert.ok(![...seen.keys()].some((r) => r.startsWith('refs/heads/train/spec/')));
  const anc = (x, y) => git(['merge-base', '--is-ancestor', x, y], { cwd: root, allowFail: true }).code === 0;
  assert.ok(anc(g.tipOf('tranche'), seen.get('refs/heads/train/head/1-1')));
  assert.ok(anc(seen.get('refs/heads/train/head/1-1'), seen.get('refs/heads/train/head/2-1')));
  assert.ok(anc(seen.get('refs/heads/train/head/2-1'), seen.get('refs/heads/train/head/3-1')));
  const rows = stateRows(root, WINDOW_FILE).filter((r) => r.event === 'build');
  assert.equal(rows[0].base, g.tipOf('tranche'));
  assert.equal(rows[1].base, seen.get('refs/heads/train/head/1-1'));
  assert.deepEqual(g.calls.merged, [], 'nothing lands in the build pass');
  run(root, g, 6, lines);
  watch();
  assert.deepEqual(g.calls.merged, [1, 3], lines.join('\n'));
  // beta refused (its spec red); gamma rebuilt until its tree no longer holds beta (3-3).
  const train = stateRows(root, TRAIN_FILE);
  assert.ok(train.some((r) => r.pr === 2 && r.result === 'refused' && /gate on the merged result is failure/.test(r.why)));
  const merged = train.filter((r) => r.result === 'merged');
  assert.deepEqual(merged.map((r) => [r.pr, r.spec_fast]), [[1, true], [3, true]], 'both landed on their spec');
  const win = stateRows(root, WINDOW_FILE);
  // Red behind PR 1 (not landed yet): closed, not refused; judged again at the head of the window.
  assert.ok(win.some((r) => r.event === 'close' && r.pr === 2 && r.seq === 1 && /red behind PR 1: judged again at the head/.test(r.cause)), JSON.stringify(win));
  assert.ok(win.some((r) => r.event === 'build' && r.pr === 2 && r.seq === 2 && r.position === 0));
  assert.equal(train.filter((r) => r.pr === 2 && r.result === 'refused').length, 1, 'refused once, at the head');
  assert.ok(!win.some((r) => r.event === 'build' && r.pr === 2 && r.seq === 3), 'never rebuilt after its refusal');
  // gamma shares no file with beta: kept behind it each time beta left, its red (beta's breakage in
  // its tested tree) never refused but rebuilt without it (coordinator, 5 Nov).
  assert.ok([1, 2].every((seq) => win.some((r) => r.event === 'close' && r.pr === 3 && r.seq === seq && /red on a tree holding a change ahead that left the window/.test(r.cause))), JSON.stringify(win));
  assert.ok(!train.some((r) => r.pr === 3 && r.result === 'refused'), 'gamma never refused for beta');
  assert.deepEqual(win.filter((r) => r.event === 'land').map((r) => r.pr), [1, 3]);
  // Every spec pull request is closed by the end; every spec branch is still there.
  assert.deepEqual([...g.specs.values()].filter((s) => s.open), []);
  for (const r of seen.keys()) assert.ok(refs(root).has(r), `${r} was deleted`);
  // The report counts the window's lands.
  const s = trainSummary(train);
  assert.deepEqual(s.spec_lands, { fast: 2, fallback: 0 });
  assert.ok(trainLines(s).some((l) => /Window lands: 2 on their spec gate, 0 by the full re-gate/.test(l)));
  // Each land's tranche tree is the spec's tested tree, records aside.
  const landed = g.tipOf('tranche');
  const tested = refs(root).get('refs/heads/train/head/3-3');
  const off = git(['diff', '--name-only', tested, landed], { cwd: root }).split('\n').filter((f) => f && !f.startsWith('process/metrics/'));
  assert.deepEqual(off, []);
});

test('window of 1 (the default) is the serial train: no spec branch, no spec pull request', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } }, 1);
  const g = github(root, ids);
  run(root, g, 2);
  assert.deepEqual(g.calls.merged, [1, 2]);
  assert.equal(g.calls.created.length, 0);
  assert.equal(refs(root).size, 0);
  assert.ok(stateRows(root, TRAIN_FILE).every((r) => r.spec_fast === undefined));
});

test('a tranche moved by anything but the window, in a file position 0 changes, closes every spec, and the window rebuilds on the new tip', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } }, 2);
  const g = github(root, ids);
  g.calls.hold = true; // nothing lands: only the move acts
  let passes = 0;
  let tip = null;
  // One train: pass 1 builds; after pass 2's read a hand merge moves the tranche; pass 3 sees it.
  const onQueue = () => {
    if (++passes !== 2) return;
    git(['fetch', '-q', 'origin', 'tranche'], { cwd: root });
    git(['checkout', '-q', '--detach', 'FETCH_HEAD'], { cwd: root });
    commit(root, { 'src/alpha/a.mjs': 'a' }); // a file position 0 changes (the same change: no conflict)
    git(['push', '-q', 'origin', 'HEAD:refs/heads/tranche'], { cwd: root });
    git(['checkout', '-q', 'main'], { cwd: root });
    tip = g.tipOf('tranche');
  };
  train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, idleEvery: 1, rounds: 3, log: () => {}, onQueue });
  const win = stateRows(root, WINDOW_FILE);
  const closes = win.filter((r) => r.event === 'close');
  assert.deepEqual(closes.map((r) => r.pr).sort(), [1, 2]);
  assert.ok(closes.every((r) => r.cause === `tranche moved to ${tip.slice(0, 10)}`), JSON.stringify(closes));
  assert.deepEqual(g.calls.closed.sort(), [101, 102]);
  // Rebuilt on the new tip, with fresh names.
  assert.deepEqual(g.calls.created.slice(2).map((x) => x.head), ['train/head/1-2', 'train/head/2-2']);
  assert.ok(git(['merge-base', '--is-ancestor', tip, refs(root).get('refs/heads/train/head/1-2')], { cwd: root, allowFail: true }).code === 0, 'rebuilt on the new tip');
  assert.equal(stateRows(root, WINDOW_FILE).find((r) => r.event === 'build' && r.pr === 1 && r.seq === 2).base, tip);
  assert.ok(win.some((r) => r.event === 'build' && r.pr === 1 && r.seq === 2 && /rebuilt after: tranche moved/.test(r.cause)));
  assert.deepEqual(g.calls.merged, []);
});

test('a job whose head moves leaves the window; those ahead stand, and those behind that share no file with it', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' }, gamma: { 'src/gamma/a.mjs': 'c' } }, 3);
  const g = github(root, ids);
  // Gates never finish here: nothing lands, so only the head move acts.
  g.calls.hold = true;
  run(root, g, 1);
  assert.equal(g.calls.created.length, 3);
  git(['checkout', '-q', '--detach', g.tipOf('job/beta')], { cwd: root });
  commit(root, { 'src/beta/a.mjs': 'b2' });
  git(['push', '-q', 'origin', 'HEAD:refs/heads/job/beta'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  run(root, g, 1);
  const closes = stateRows(root, WINDOW_FILE).filter((r) => r.event === 'close');
  // gamma behind shares no file with beta: it stands (coordinator, 5 Nov); a shared file closes it
  // too (train-window-disjoint.test.mjs).
  assert.deepEqual(closes.map((r) => [r.pr, r.cause]), [[2, `PR 2 head moved to ${g.tipOf('job/beta').slice(0, 10)}`]]);
  assert.deepEqual(g.calls.closed.sort(), [102]);
  assert.ok(!g.calls.closed.includes(101), 'alpha, ahead, stands');
});

test('a restarted train takes its window back from its rows and the open spec pull requests', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } }, 2);
  const g = github(root, ids);
  g.calls.hold = true;
  run(root, g, 1);
  assert.equal(g.calls.created.length, 2);
  // A new train: nothing rebuilt, nothing closed; then both land on their spec.
  g.calls.hold = false;
  const lines = [];
  run(root, g, 3, lines);
  assert.ok(lines.some((l) => /window: restarted with 2 position\(s\) \(PR 1, 2\)/.test(l)), lines.join('\n'));
  assert.equal(g.calls.created.length, 2, 'no spec rebuilt');
  assert.deepEqual(g.calls.merged, [1, 2]);
  assert.deepEqual(stateRows(root, TRAIN_FILE).map((r) => r.spec_fast), [true, true]);
});

test('a land whose tree is not the spec\'s tested tree takes the full re-gate (no trailer), and closes the specs behind it', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } }, 2);
  const g = github(root, ids);
  // alpha's spec tests a tree with one more code file than its land will have.
  const build = (r, ctx, c, onto) => {
    const res = buildResult(r, ctx, c, onto);
    if (c.n !== 1) return res;
    const tree = git(['rev-parse', `${res.sha}^{tree}`], { cwd: r });
    const blob = git(['hash-object', '-w', '--stdin'], { cwd: r, input: 'not in the land' });
    const idx = join(mkdtempSync(join(tmpdir(), 'p3-idx-')), 'i');
    const env = { ...process.env, GIT_INDEX_FILE: idx };
    git(['read-tree', tree], { cwd: r, env });
    git(['update-index', '--add', '--cacheinfo', `100644,${blob},src/alpha/extra.mjs`], { cwd: r, env });
    const t2 = git(['write-tree'], { cwd: r, env });
    const sha = git(['commit-tree', t2, '-p', res.sha, '-m', 'drift'], { cwd: r });
    return { sha, tree: t2 };
  };
  const lines = [];
  train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, idleEvery: 1, rounds: 4, log: (l) => lines.push(l), build });
  const merged = stateRows(root, TRAIN_FILE).filter((r) => r.result === 'merged');
  assert.deepEqual(merged.map((r) => [r.pr, r.spec_fast]), [[1, false], [2, true]], lines.join('\n'));
  assert.match(merged[0].spec_why, /outside the records: src\/alpha\/extra\.mjs/);
  const landed = git(['log', '-1', '--format=%B', g.tipOf('job/alpha')], { cwd: root });
  assert.doesNotMatch(landed, /Spec-Tested/, 'no trailer on a fallback land');
  const win = stateRows(root, WINDOW_FILE);
  assert.ok(win.some((r) => r.event === 'fallback' && r.pr === 1 && r.landed));
  assert.ok(win.some((r) => r.event === 'close' && r.pr === 2 && r.seq === 1 && /PR 1 landed by its full re-gate/.test(r.cause)), JSON.stringify(win));
  assert.ok(win.some((r) => r.event === 'build' && r.pr === 2 && r.seq === 2));
});

test('a spec gate red that did not judge the job (the job PR moved or was unread while it ran) is closed and rebuilt, not refused', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'BROKEN' } }, 2);
  const g = github(root, ids);
  g.calls.unjudged = true;
  run(root, g, 3); // pass 2 closes beta's spec and lands alpha; pass 3 rebuilds beta
  const win = stateRows(root, WINDOW_FILE);
  assert.ok(win.some((r) => r.event === 'close' && r.pr === 2 && /spec gate red, not the job's: its run did not judge the job \(draft\)/.test(r.cause)), JSON.stringify(win));
  assert.ok(!stateRows(root, TRAIN_FILE).some((r) => r.pr === 2 && r.result === 'refused'), 'beta is not refused');
  assert.ok(win.some((r) => r.event === 'build' && r.pr === 2 && r.seq === 2), 'rebuilt');
});

test('a spec gate that ends red without judging the job, again and again, is refused after SPEC_REBUILDS tries, as the serial train refuses such a gate', () => {
  const { root, ids } = setup({ beta: { 'src/beta/a.mjs': 'BROKEN' } }, 2);
  const g = github(root, ids);
  g.calls.unjudged = true;
  run(root, g, 10);
  const builds = stateRows(root, WINDOW_FILE).filter((r) => r.event === 'build' && r.pr === 1);
  assert.equal(builds.length, SPEC_REBUILDS + 1, 'built once, rebuilt SPEC_REBUILDS times');
  const refused = stateRows(root, TRAIN_FILE).filter((r) => r.pr === 1 && r.result === 'refused');
  assert.equal(refused.length, 1);
  assert.match(refused[0].why, new RegExp(`gate on the merged result is failure with no judgment of the job \\(its run did not judge the job \\(draft\\), after ${SPEC_REBUILDS} rebuilds\\)`));
});

test('a spec pull request whose close fails is closed at the next pass, and its row written then', () => {
  const { root, ids } = setup({ alpha: { 'src/alpha/a.mjs': 'a' }, beta: { 'src/beta/a.mjs': 'b' } }, 2);
  const g = github(root, ids);
  g.calls.hold = true;
  const edit = g.io.editPR;
  let fails = 1;
  g.io.editPR = (...a) => { if (fails-- > 0) throw new Fail('gh api -X PATCH failed: HTTP 502'); return edit(...a); };
  let passes = 0;
  const onQueue = () => {
    if (++passes !== 2) return;
    git(['fetch', '-q', 'origin', 'tranche'], { cwd: root });
    git(['checkout', '-q', '--detach', 'FETCH_HEAD'], { cwd: root });
    commit(root, { 'src/alpha/a.mjs': 'x' }); // a file position 0 changes: every spec closes
    git(['push', '-q', 'origin', 'HEAD:refs/heads/tranche'], { cwd: root });
    git(['checkout', '-q', 'main'], { cwd: root });
  };
  train(root, { session: S, slug: 'o/r', io: g.io, every: 1, wait: 0, idleEvery: 1, rounds: 4, log: () => {}, onQueue });
  assert.ok(!g.specs.get(101).open && !g.specs.get(102).open, 'both closed in the end');
  const closes = stateRows(root, WINDOW_FILE).filter((r) => r.event === 'close' && r.seq === 1);
  assert.deepEqual(closes.map((r) => r.pr).sort(), [1, 2], 'one row each, once closed');
});

test('merge --plain refuses a train spec pull request, even one made ready: only the job PR lands', () => {
  const { root } = setup({ alpha: { 'src/alpha/a.mjs': 'a' } }, 2);
  const pr = { number: 101, state: 'open', draft: false, base: { ref: 'tranche' }, head: { ref: 'train/head/1-1', sha: 'a'.repeat(40), repo: { full_name: 'o/r' } }, user: { login: 'civicsmith' } };
  assert.throws(() => mergePlain(root, 101, { slug: 'o/r', noReview: 'a probe', log: () => {}, io: { getPR: () => pr, mergePR: () => { throw new Error('merged'); } } }), /is the merge train's spec \(train\/head\/1-1\): it is never merged/);
});
