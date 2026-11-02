import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { merge } from '../lib/merge.mjs';
import { readRows } from '../lib/metrics.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

function setup() {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha') });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const head = commit(root, { 'src/alpha/a.mjs': 'x', 'process/metrics/alpha.jsonl': JSON.stringify({ row: 'attempt', event: 'complete', at: new Date().toISOString() }) + '\n' });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'other.txt': 'tranche moved on' });
  git(['push', '-q', 'origin', 'tranche', 'job/alpha', 'main'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, head };
}

function io(head, { gateGreen = true, receipt = 'agrees' } = {}) {
  const calls = { merged: null };
  return {
    calls,
    io: {
      getPR: () => ({ state: 'open', draft: false, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: 'job/alpha', sha: head } }),
      comments: () => [
        { id: 1, body: block(RECEIPT, { module: 'alpha', attempt: 1, sha: head }), user: { login: 'civicsmith' } },
        { id: 2, body: block(GATE, { runs: [{ sha: head, ok: true, receipt, receipt_attempt: 1, run_id: 11 }] }), user: { login: BOT } },
        { id: 3, body: block(GATE, { runs: [{ sha: head, ok: true, receipt: 'present', receipt_attempt: 1 }] }), user: { login: BOT } },
      ],
      checkRun: () => ({ status: 'completed', conclusion: gateGreen ? 'success' : 'failure', html_url: 'run' }),
      verify: (slug, r) => r.run_id === 11,
      mergePR: (slug, n, sha) => { calls.merged = sha; return { merged: true, sha: 'm'.repeat(40) }; },
    },
  };
}

test('merge brings the branch up to the tranche, writes the merge row, and merges that tip', () => {
  const { root, head } = setup();
  const f = io(head);
  const r = merge(root, 3, { slug: 'o/r', io: f.io, reviewed: 'fresh worker, no gaps', log: () => {} });
  assert.equal(r.merged, true);
  const tip = git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0];
  assert.equal(f.calls.merged, tip, 'merges the tip the gate passed');
  assert.equal(git(['merge-base', '--is-ancestor', 'origin/tranche', tip], { cwd: root, allowFail: true }).code, 0, 'up to the tranche');
  git(['checkout', '-q', tip], { cwd: root });
  assert.equal(readRows(root, 'alpha').at(-1).row, 'merge');
  git(['checkout', '-q', 'main'], { cwd: root });
  assert.equal(git(['worktree', 'list'], { cwd: root }).split('\n').length, 1, 'no worktree left');
});

test('merge refuses a job that changed files outside its module', () => {
  const { root } = setup();
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  const head = commit(root, { '.github/workflows/process-gate.yml': 'jobs: {}' });
  git(['push', '-q', 'origin', 'job/alpha'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  assert.throws(() => merge(root, 3, { slug: 'o/r', io: io(head).io, noReview: 'x', log: () => {} }), /outside its module: .github\/workflows/);
});

test('merge refuses without a review decision, a green gate, or a checked receipt', () => {
  const { root, head } = setup();
  const q = { slug: 'o/r', log: () => {} };
  assert.throws(() => merge(root, 3, { ...q, io: io(head).io }), /--reviewed/);
  assert.throws(() => merge(root, 3, { ...q, io: io(head, { gateGreen: false }).io, noReview: 'x' }), /not green/);
  assert.throws(() => merge(root, 3, { ...q, io: io(head, { receipt: 'none' }).io, noReview: 'x' }), /checked receipt attempt 1/);
  const other = io(head).io;
  other.verify = () => false;
  assert.throws(() => merge(root, 3, { ...q, io: other, noReview: 'x' }), /process-gate run/);
});

test('merge takes the job\'s paths from the tranche, so a job cannot widen its own entry', () => {
  const { root } = setup();
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  const head = commit(root, {
    'process/ledger/alpha.json': entry('alpha', { paths: ['src/alpha/', '.github/'] }),
    '.github/workflows/process-gate.yml': 'jobs: {}',
  });
  git(['push', '-q', 'origin', 'job/alpha'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  assert.throws(() => merge(root, 3, { slug: 'o/r', io: io(head).io, noReview: 'x', log: () => {} }), /ledger: .*only the status field|outside its module/);
});

// merge --plain (Bob, 2 Nov: the tool is the one merge route; review of PR 14).
import { ACTIONS_APP, checkRuns, requiredChecks, workflowPath } from '../lib/github.mjs';
import { mergePlain } from '../lib/merge.mjs';

// A repository with the tranche and a head branch on origin; process3 itself has no config
// and no ledger.
function plainRepo({ config = true, ledger = true, head = 'bob/pin', files = { 'pin.txt': 'moved' } } = {}) {
  const root = makeRepo({
    'README.md': 'x', '.github/workflows/process-gate.yml': 'on: pull_request\n',
    ...(config ? { 'process/config.json': {} } : {}), ...(ledger ? { 'process/ledger/alpha.json': entry('alpha') } : {}),
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', ...(head === 'tranche' ? [] : ['-b']), head, ...(head === 'tranche' ? [] : ['tranche'])], { cwd: root });
  const sha = commit(root, files);
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['push', '-q', 'origin', ...new Set(['main', 'tranche', head])], { cwd: root });
  return { root, sha, head };
}

const run = (over = {}) => ({ id: 1, app: { id: ACTIONS_APP }, status: 'completed', conclusion: 'success', started_at: '2026-11-02T10:00:00Z', check_suite: { id: 7 }, ...over });
function plainIO(r, { base = 'tranche', head = r.head, rules = { checks: [{ context: 'gate', app: ACTIONS_APP }], strict: false }, runs = [run()], paths = {}, headRepo = 'o/r', after } = {}) {
  const calls = { merged: null, reads: 0 };
  const pr = () => ({ state: 'open', draft: false, base: { ref: base, repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: head, sha: r.sha, repo: headRepo === null ? null : { full_name: headRepo } } });
  return {
    calls,
    io: {
      getPR: () => { calls.reads++; return calls.reads > 1 && after ? after(pr()) : pr(); },
      requiredChecks: () => rules,
      checkRuns: () => runs,
      workflowPath: (slug, x) => paths[x.check_suite?.id] || '.github/workflows/process-gate.yml',
      mergePR: (slug, n, sha, o) => { calls.merged = { sha, ...o }; return { merged: true, sha: 'm'.repeat(40) }; },
    },
  };
}
const q = { slug: 'o/r', log: () => {} };
const refs = (root) => git(['for-each-ref', '--format=%(refname) %(objectname)'], { cwd: root }) + git(['ls-remote', 'origin'], { cwd: root });

test('merge --plain merges a pin move pinned to its head, with the review in the message, and pushes nothing', () => {
  const r = plainRepo();
  const f = plainIO(r);
  git(['fetch', '-q', 'origin'], { cwd: r.root });
  const before = refs(r.root);
  const out = mergePlain(r.root, 4, { ...q, io: f.io, reviewed: 'fresh reader, no gaps' });
  assert.equal(out.merged, true);
  assert.equal(f.calls.merged.sha, r.sha);
  assert.equal(f.calls.merged.title, 'Merge PR 4: bob/pin into tranche');
  assert.equal(f.calls.merged.message, 'Reviewed: fresh reader, no gaps');
  assert.equal(refs(r.root), before, 'no branch moved, here or on origin: no merge row, no push');
  assert.equal(git(['worktree', 'list'], { cwd: r.root }).split('\n').length, 1);
});

test('merge --plain works in process3 itself, with no config and no ledger', () => {
  const r = plainRepo({ config: false, ledger: false, files: { 'tool/p3.mjs': '// changed\n' } });
  const f = plainIO(r, { rules: { checks: [{ context: 'ci', app: ACTIONS_APP }, { context: 'record', app: ACTIONS_APP }], strict: false } });
  assert.equal(mergePlain(r.root, 4, { ...q, io: f.io, noReview: 'a test' }).merged, true);
  assert.equal(f.calls.merged.message, 'No review: a test');
});

test('the newest qualifying check run decides', () => {
  const r = plainRepo();
  const older = run({ id: 1, conclusion: 'success', started_at: '2026-11-02T10:00:00Z' });
  const newer = run({ id: 2, conclusion: 'failure', started_at: '2026-11-02T11:00:00Z' });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { runs: [newer, older] }).io }), /gate: failure/);
  const fixed = run({ id: 3, conclusion: 'success', started_at: '2026-11-02T12:00:00Z' });
  assert.equal(mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { runs: [fixed, newer, older] }).io }).merged, true);
  // checkRuns asks for every run, and puts the newest first.
  const asked = [];
  const sorted = checkRuns('o/r', 's', 'gate', { read: (a) => { asked.push(a[1]); return { check_runs: [older, fixed, newer] }; } });
  assert.deepEqual(sorted.map((x) => x.id), [3, 2, 1]);
  assert.match(asked[0], /check-runs\?check_name=gate&filter=all/);
});

test('a commit status cannot stand in for a check run', () => {
  const r = plainRepo();
  // Only check runs are read; a status named gate, however green, is never asked for.
  const f = plainIO(r, { runs: [] });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /gate: no check run/);
  assert.equal(f.calls.merged, null);
});

test('a check run from another app than the rule names does not count', () => {
  const r = plainRepo();
  const other = run({ id: 2, app: { id: 999 }, conclusion: 'success', started_at: '2026-11-02T12:00:00Z' });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { runs: [other] }).io }), /gate: no run from app 15368/);
  const red = run({ id: 1, conclusion: 'failure' });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { runs: [other, red] }).io }), /gate: failure/, 'the newer foreign run does not hide the real one');
});

test('a workflow the head added cannot pose as the required check', () => {
  const r = plainRepo({ files: { '.github/workflows/fake.yml': 'jobs: { gate: {} }\n' } });
  const fake = run({ id: 2, check_suite: { id: 8 }, conclusion: 'success', started_at: '2026-11-02T12:00:00Z' });
  const real = run({ id: 1, check_suite: { id: 7 }, conclusion: 'failure' });
  const paths = { 8: '.github/workflows/fake.yml', 7: '.github/workflows/process-gate.yml' };
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { runs: [fake], paths }).io }), /its workflow .github\/workflows\/fake.yml is not on the base/);
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { runs: [fake, real], paths }).io }), /gate: failure/);
  // workflowPath reads the run's check suite.
  assert.equal(workflowPath('o/r', fake, { read: (a) => (a[1].includes('check_suite_id=8') ? { workflow_runs: [{ path: '.github/workflows/fake.yml@refs/pull/4/merge' }] } : null) }), '.github/workflows/fake.yml');
});

test('main and the tranche must require checks; a working branch need not', () => {
  const r = plainRepo();
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { rules: { checks: [], strict: false } }).io }), /tranche requires no checks/);
  const w = plainRepo({ head: 'bob/plan-fix' });
  git(['push', '-q', 'origin', 'tranche:refs/heads/bob/plan'], { cwd: w.root });
  assert.equal(mergePlain(w.root, 5, { ...q, noReview: 'x', io: plainIO(w, { base: 'bob/plan', rules: { checks: [], strict: false } }).io }).merged, true);
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { rules: null }).io }), /could not read the checks tranche requires/);
});

test('job branches are refused in any case, and a plain merge may not touch module files', () => {
  const r = plainRepo({ head: 'Job/Alpha' });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r).io }), /a job's \(Job\/Alpha\)/);
  const m = plainRepo({ files: { 'src/alpha/index.mjs': 'export const x = 1;\n', 'pin.txt': 'moved' } });
  const f = plainIO(m);
  assert.throws(() => mergePlain(m.root, 4, { ...q, noReview: 'x', io: f.io }), /changes module files, which go through a job: src\/alpha\/index.mjs \(alpha\)/);
  assert.equal(f.calls.merged, null);
  // The tranche into main carries the jobs' merged work, and passes.
  const t = plainRepo({ head: 'tranche', files: { 'src/alpha/index.mjs': 'export const x = 1;\n' } });
  assert.equal(mergePlain(t.root, 6, { ...q, noReview: 'x', io: plainIO(t, { base: 'main' }).io }).merged, true);
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { base: 'main', head: 'bob/pin' }).io }), /only the tranche tranche merges into main/);
});

test('with the strict policy on, the head must contain the base tip', () => {
  const r = plainRepo();
  git(['checkout', '-q', 'tranche'], { cwd: r.root });
  commit(r.root, { 'other.txt': 'the tranche moved on' });
  git(['push', '-q', 'origin', 'tranche'], { cwd: r.root });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  const strict = { checks: [{ context: 'gate', app: ACTIONS_APP }], strict: true };
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { rules: strict }).io }), /does not contain tranche's tip/);
  assert.equal(mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r).io }).merged, true, 'not strict: allowed');
});

test('a head from a deleted or other repository, a retargeted base, and a missing review are refused', () => {
  const r = plainRepo();
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { headRepo: null }).io }), /a repository that no longer exists/);
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { headRepo: 'x/r' }).io }), /comes from x\/r/);
  const f = plainIO(r, { after: (p) => ({ ...p, base: { ...p.base, ref: 'main' } }) });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /retargeted to main/);
  assert.equal(f.calls.merged, null);
  assert.throws(() => mergePlain(r.root, 4, { ...q, io: plainIO(r).io }), /--reviewed/);
});

test('requiredChecks keeps each rule\'s app and the strict policy', () => {
  const rules = [
    { type: 'deletion' },
    { type: 'required_status_checks', parameters: { strict_required_status_checks_policy: true, required_status_checks: [{ context: 'ci', integration_id: 15368 }, { context: 'record' }] } },
    { type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'ci', integration_id: 15368 }] } },
  ];
  const asked = [];
  assert.deepEqual(requiredChecks('o/r', 'bob/plan', { read: (a) => { asked.push(a[1]); return rules; } }),
    { checks: [{ context: 'ci', app: 15368 }, { context: 'record', app: null }], strict: true });
  assert.deepEqual(asked, ['repos/o/r/rules/branches/bob/plan?per_page=100']);
  assert.equal(requiredChecks('o/r', 'x', { read: () => null }), null);
});

test('the job route points any other pull request to --plain', () => {
  const { root } = setup();
  const f = io('h'.repeat(40));
  f.io.getPR = () => ({ state: 'open', draft: false, base: { ref: 'tranche' }, head: { ref: 'bob/pin', sha: 'h'.repeat(40) } });
  assert.throws(() => merge(root, 3, { slug: 'o/r', io: f.io, noReview: 'x', log: () => {} }), /merges with --plain/);
});
