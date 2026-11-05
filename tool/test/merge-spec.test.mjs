// The merge train's speculated land (C', notes/train-spec-plan.md): mergedResult builds R(i) and
// never pushes; merge with a spec marks L for the gate's spec-tested path only when L's tree is
// the one the spec gate tested, records aside.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { SPEC_TRAILER, merge, mergedResult } from '../lib/merge.mjs';
import { readRows } from '../lib/metrics.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const said = (into) => (m) => into.push(m);
const REVIEW = { reviewed: 'fresh worker, no gaps', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0 };

function setup(extra = {}) {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), ...extra });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const head = commit(root, { 'src/alpha/a.mjs': 'x', 'process/metrics/alpha.jsonl': JSON.stringify({ row: 'attempt', event: 'complete', at: new Date().toISOString() }) + '\n' });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const tranche = commit(root, { 'other.txt': 'tranche moved on' });
  git(['push', '-q', 'origin', 'tranche', 'job/alpha', 'main'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, head, tranche };
}

function io(head) {
  const calls = { merged: null };
  return {
    calls,
    io: {
      getPR: () => ({ state: 'open', draft: false, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: 'job/alpha', sha: head } }),
      comments: () => [
        { id: 1, body: block(RECEIPT, { module: 'alpha', attempt: 1, sha: head }), user: { login: 'civicsmith' } },
        { id: 2, body: block(GATE, { runs: [{ sha: head, ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }] }), user: { login: BOT } },
      ],
      checkRun: () => ({ status: 'completed', conclusion: 'success', html_url: 'run' }),
      verify: (slug, r) => r.run_id === 11,
      mergePR: (slug, n, sha) => { calls.merged = sha; return { merged: true, sha: 'm'.repeat(40) }; },
    },
  };
}

// R(i) for the job on `onto`, as the train builds it.
const predict = (root, head, onto) => mergedResult(root, loadConfig(root), {
  n: 3, id: 'alpha', branch: 'job/alpha', head, onto, reviewed: REVIEW.reviewed, rounds: { rounds: 1, decision: null },
  measures: { review_minutes: 5, review_usd: 'unmeasured', findings: 0, findings_acted: 0 }, triggers: [], attempt: 1, log: quiet,
});
const remote = (root) => git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0];
const message = (root, c) => git(['log', '-1', '--format=%B', c], { cwd: root }).trimEnd();
// A commit on top of the tranche, never pushed: the R(i-1) the window put ahead of this job.
// Shaped as train.mjs buildPlain builds a step: the merge of the tranche into the change's head.
function ahead(root, tranche, files) {
  git(['checkout', '-q', '--detach', tranche], { cwd: root });
  const side = commit(root, files, 'ahead in the window');
  git(['checkout', '-q', 'main'], { cwd: root });
  return git(['commit-tree', `${side}^{tree}`, '-p', side, '-p', tranche, '-m', 'Bring it up to the tranche (merge train window)'], { cwd: root });
}
// The tranche moved on by `files` (pushed): a change ahead that landed otherwise than predicted.
function landed(root, tranche, files) {
  git(['checkout', '-q', '--detach', tranche], { cwd: root });
  const c = commit(root, files, 'landed otherwise');
  git(['push', '-q', 'origin', 'HEAD:refs/heads/tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return c;
}

test('mergedResult builds the job merged onto the given commit with its merge row, in a worktree of its own, and pushes nothing', () => {
  const { root, head, tranche } = setup();
  const r = predict(root, head, tranche);
  assert.match(r.sha, /^[0-9a-f]{40}$/);
  assert.equal(git(['rev-parse', `${r.sha}^{tree}`], { cwd: root }), r.tree);
  assert.equal(git(['merge-base', '--is-ancestor', tranche, r.sha], { cwd: root, allowFail: true }).code, 0, 'onto merged in');
  assert.equal(git(['merge-base', '--is-ancestor', head, r.sha], { cwd: root, allowFail: true }).code, 0, 'on the job head');
  assert.equal(git(['show', `${r.sha}:other.txt`], { cwd: root }), 'tranche moved on');
  assert.equal(git(['show', `${r.sha}:src/alpha/a.mjs`], { cwd: root }), 'x');
  git(['checkout', '-q', r.sha], { cwd: root });
  const last = readRows(root, 'alpha').at(-1);
  git(['checkout', '-q', 'main'], { cwd: root });
  assert.equal(last.row, 'merge');
  assert.equal(last.pr, 3);
  assert.equal(last.review_rounds, 1);
  assert.equal(remote(root), head, 'the job branch on origin is untouched');
  assert.doesNotMatch(git(['ls-remote', 'origin'], { cwd: root }), new RegExp(r.sha), 'R(i) is on no remote ref');
  assert.equal(git(['worktree', 'list'], { cwd: root }).split('\n').length, 1, 'no worktree left');
  // The same bytes merge() would build for L on that tranche: one code path (records aside).
  const f = io(head);
  merge(root, 3, { slug: 'o/r', io: f.io, ...REVIEW, log: quiet });
  assert.deepEqual(git(['diff', '--name-only', r.sha, f.calls.merged], { cwd: root }).split('\n').filter(Boolean).filter((x) => !x.startsWith('process/')), []);
});

test('mergedResult on a commit the job conflicts with fails, the merge aborted, nothing left', () => {
  const { root, head, tranche } = setup();
  const onto = ahead(root, tranche, { 'src/alpha/a.mjs': 'y' });
  assert.throws(() => predict(root, head, onto), /job\/alpha conflicts with/);
  assert.equal(git(['worktree', 'list'], { cwd: root }).split('\n').length, 1);
  assert.equal(remote(root), head);
});

test('merge with a spec whose tree is L\'s pushes L with the Spec-Tested trailer, same tree and parents, and lands those bytes', () => {
  const { root, head, tranche } = setup();
  const R = predict(root, head, tranche);
  const f = io(head);
  const lines = [];
  const r = merge(root, 3, { slug: 'o/r', io: f.io, ...REVIEW, spec: { pr: 901, sha: R.sha }, log: said(lines) });
  assert.deepEqual(r.spec, { fast: true, pr: 901 });
  const tip = remote(root);
  assert.equal(r.tip, tip);
  assert.equal(f.calls.merged, tip, 'the merged bytes are the pushed, marked tip');
  assert.match(message(root, tip), new RegExp(`\\n\\n${SPEC_TRAILER}: 901$`), 'the trailer the gate\'s fast path reads');
  assert.match(message(root, tip), /^merge row for alpha \(PR 3\)/);
  assert.deepEqual(git(['diff', '--name-only', R.sha, tip], { cwd: root }).split('\n').filter(Boolean).filter((x) => !x.startsWith('process/')), [], 'the tree tested, records aside');
  // Its parent is the bring-up merge: the trailer rewrote the message only.
  const parent = git(['rev-parse', `${tip}^`], { cwd: root });
  assert.equal(git(['rev-list', '--parents', '-n', '1', parent], { cwd: root }).split(' ').length, 3, 'the --no-ff merge with the tranche');
  assert.ok(lines.some((l) => /spec-tested path/.test(l)));
});

test('merge with a spec that differs only in records is still the tree tested', () => {
  const { root, head, tranche } = setup();
  const R = predict(root, head, ahead(root, tranche, { 'process/notes/x.md': 'a record the window ahead wrote' }));
  const f = io(head);
  const r = merge(root, 3, { slug: 'o/r', io: f.io, ...REVIEW, spec: { pr: 902, sha: R.sha }, log: quiet });
  assert.deepEqual(r.spec, { fast: true, pr: 902 });
  assert.match(message(root, remote(root)), /Spec-Tested: 902$/);
});

// A lane's land in the window ahead (lane.mjs; Bob, 5 Nov): lane folders count as records here.
test('merge with a spec that differs only in a lane\'s folder is still the tree tested; a file of no lane is not', () => {
  const lanes = { 'process/config.json': { lanes: [{ name: 'ux', dir: 'design/ux' }] }, 'design/ux/w.json': '{}\n' };
  const { root, head, tranche } = setup(lanes);
  const R = predict(root, head, ahead(root, tranche, { 'design/ux/w.json': '{"a":1}\n' }));
  const r = merge(root, 3, { slug: 'o/r', io: io(head).io, ...REVIEW, spec: { pr: 905, sha: R.sha }, log: quiet });
  assert.deepEqual(r.spec, { fast: true, pr: 905 });
  const t = setup(lanes);
  const R2 = predict(t.root, t.head, ahead(t.root, t.tranche, { 'design/uxx/w.json': '{}\n' }));
  landed(t.root, t.tranche, { 'design/uxx/w.json': '{"b":2}\n' });
  const r2 = merge(t.root, 3, { slug: 'o/r', io: io(t.head).io, ...REVIEW, spec: { pr: 906, sha: R2.sha }, log: quiet });
  assert.equal(r2.spec.fast, false);
  assert.match(r2.spec.why, /outside the records: design\/uxx\/w\.json/);
});

test('merge with a spec whose tree differs outside the records (a change ahead landed otherwise) pushes L unmarked, says why, and goes on to the full gate', () => {
  const { root, head, tranche } = setup();
  const R = predict(root, head, ahead(root, tranche, { 'src/beta/b.mjs': 'a module ahead, predicted' }));
  landed(root, tranche, { 'src/beta/b.mjs': 'landed otherwise than predicted' });
  const f = io(head);
  const r = merge(root, 3, { slug: 'o/r', io: f.io, ...REVIEW, spec: { pr: 903, sha: R.sha }, log: quiet });
  assert.equal(r.merged, true);
  assert.equal(r.spec.fast, false);
  assert.match(r.spec.why, /outside the records: src\/beta\/b\.mjs/);
  const tip = remote(root);
  assert.equal(f.calls.merged, tip);
  assert.doesNotMatch(message(root, tip), /Spec-Tested/);
  // An unreadable spec commit is the full gate too.
  const s2 = setup();
  const r2 = merge(s2.root, 3, { slug: 'o/r', io: io(s2.head).io, ...REVIEW, spec: { pr: 904, sha: 'f'.repeat(40) }, log: quiet });
  assert.equal(r2.spec.fast, false);
  assert.match(r2.spec.why, /not readable here/);
  assert.doesNotMatch(message(s2.root, remote(s2.root)), /Spec-Tested/);
});

// A change ahead in the window that left it (red, closed, refused; coordinator, 5 Nov): the land is
// the tested tree minus that change, which shares no file with the job.
test('merge with a spec whose change ahead never landed is the tested tree minus it: marked, and the change named as dropped', () => {
  const { root, head, tranche } = setup();
  const R = predict(root, head, ahead(root, tranche, { 'src/beta/b.mjs': 'a module ahead that left the window' }));
  const r = merge(root, 3, { slug: 'o/r', io: io(head).io, ...REVIEW, spec: { pr: 907, sha: R.sha }, log: quiet });
  assert.equal(r.spec.fast, true);
  assert.deepEqual([r.spec.move.files, r.spec.move.dropped, r.spec.move.commits], [['src/beta/b.mjs'], ['src/beta/b.mjs'], []]);
  assert.match(message(root, remote(root)), /Spec-Tested: 907$/);
  // Not a step of the chain (a commit on the tranche's line, no merge): never taken as dropped.
  const t = setup();
  git(['checkout', '-q', '--detach', t.tranche], { cwd: t.root });
  const loose = commit(t.root, { 'data/flag.json': '{"on":true}\n' }, 'a change the window never built as a step');
  git(['checkout', '-q', 'main'], { cwd: t.root });
  const r2 = merge(t.root, 3, { slug: 'o/r', io: io(t.head).io, ...REVIEW, spec: { pr: 908, sha: predict(t.root, t.head, loose).sha }, log: quiet });
  assert.equal(r2.spec.fast, false);
  assert.match(r2.spec.why, /outside the records: data\/flag\.json/);
});

test('merge with a spec run again on its own marked tip pushes nothing and stays fast; another spec\'s is "nothing pushed"', () => {
  const { root, head, tranche } = setup();
  const R = predict(root, head, tranche);
  // The first run's push, then its land failed: the job branch holds the marked merged result.
  assert.throws(() => merge(root, 3, { slug: 'o/r', io: { ...io(head).io, mergePR: () => ({ merged: false, message: 'no' }) }, ...REVIEW, spec: { pr: 905, sha: R.sha }, log: quiet }), /did not merge/);
  const tip = remote(root);
  assert.match(message(root, tip), /Spec-Tested: 905$/);
  const again = io(tip);
  const r = merge(root, 3, { slug: 'o/r', io: again.io, ...REVIEW, spec: { pr: 905, sha: R.sha }, log: quiet });
  assert.deepEqual(r.spec, { fast: true, pr: 905 });
  assert.equal(remote(root), tip, 'nothing new pushed');
  assert.equal(again.calls.merged, tip);
  const other = io(tip);
  const r2 = merge(root, 3, { slug: 'o/r', io: other.io, ...REVIEW, spec: { pr: 906, sha: R.sha }, log: quiet });
  assert.deepEqual(r2.spec, { fast: false, why: 'nothing pushed' });
  assert.equal(remote(root), tip, 'no push invented for the trailer');
});

test('merge without a spec returns no spec and marks nothing', () => {
  const { root, head } = setup();
  const r = merge(root, 3, { slug: 'o/r', io: io(head).io, ...REVIEW, log: quiet });
  assert.equal('spec' in r, false);
  assert.doesNotMatch(message(root, remote(root)), /Spec-Tested/);
});
