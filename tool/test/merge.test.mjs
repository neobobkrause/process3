import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { merge } from '../lib/merge.mjs';
import { readRows } from '../lib/metrics.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo, write } from './helpers.mjs';

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
import { ACTIONS_APP, checkRuns, requiredChecks, workflowRun } from '../lib/github.mjs';
import { mergePlain, processRepo } from '../lib/merge.mjs';

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
function plainIO(r, { base = 'tranche', head = r.head, rules = { checks: [{ context: 'gate', app: ACTIONS_APP }], strict: false }, runs = [run()], paths = {}, events = {}, headRepo = 'o/r', after, repo = { released: () => false, shim: () => null } } = {}) {
  const calls = { merged: null, reads: 0 };
  const pr = () => ({ state: 'open', draft: false, base: { ref: base, repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: head, sha: r.sha, repo: headRepo === null ? null : { full_name: headRepo } } });
  return {
    calls,
    io: {
      getPR: () => { calls.reads++; return calls.reads > 1 && after ? after(pr()) : pr(); },
      requiredChecks: () => rules,
      checkRuns: () => runs,
      workflowRun: (slug, x) => ({ path: paths[x.check_suite?.id] || '.github/workflows/process-gate.yml', event: events[x.check_suite?.id] || 'pull_request' }),
      repo,
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
  // The real readers over one stub of GitHub that holds a green commit status named gate and no
  // check run: a fallback to statuses through any of them would merge.
  const asked = [];
  const api = (args) => {
    const p = args[1];
    asked.push(p);
    if (p.includes('/check-runs')) return { check_runs: [] };
    if (/\/status(es)?\b/.test(p)) return { state: 'success', statuses: [{ context: 'gate', state: 'success' }] };
    if (p.includes('/rules/branches/')) return [{ type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'gate', integration_id: ACTIONS_APP }] } }];
    return null;
  };
  const f = plainIO(r);
  Object.assign(f.io, {
    requiredChecks: (slug, b) => requiredChecks(slug, b, { read: api }),
    checkRuns: (slug, sha, name) => checkRuns(slug, sha, name, { read: api }),
    workflowRun: (slug, x) => workflowRun(slug, x, { read: api }),
  });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /gate: no check run/);
  assert.equal(f.calls.merged, null);
  assert.ok(asked.some((p) => p.includes('/check-runs')));
});

test('a check run from another app than the rule names does not count', () => {
  const r = plainRepo();
  const other = run({ id: 2, app: { id: 999 }, conclusion: 'success', started_at: '2026-11-02T12:00:00Z' });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { runs: [other] }).io }), /gate: no run from app 15368/);
  const red = run({ id: 1, conclusion: 'failure' });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { runs: [other, red] }).io }), /gate: failure/, 'the newer foreign run does not hide the real one');
});

test('a pull request that edits or adds a workflow is refused: that needs the owner\'s word', () => {
  for (const files of [{ '.github/workflows/process-gate.yml': 'on: pull_request\njobs: { gate: { steps: [] } }\n' }, { '.github/workflows/fake.yml': 'jobs: { gate: {} }\n' }]) {
    const r = plainRepo({ files });
    const f = plainIO(r, { repo: { released: () => true, shim: () => 'f'.repeat(40) } });
    assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /changes \.github\/workflows\/\S+\.yml: .*needs the owner's word: bring it to Bob/);
    assert.equal(f.calls.merged, null);
  }
  // In process3 itself there is no pin, so any workflow change is refused.
  const p = plainRepo({ config: false, ledger: false, files: { '.github/workflows/ci.yml': 'x\n' } });
  assert.throws(() => mergePlain(p.root, 4, { ...q, noReview: 'x', io: plainIO(p).io }), /no process pin to compare it with.*owner's word/);
});

test('a run from a workflow whose file the head changed does not count; one from the base\'s copy does', () => {
  // A second workflow names a job gate. The head changes nothing under .github, so it is the
  // base's copy; a run whose file differs at the head (here: one absent from the base) does not.
  const r = plainRepo();
  const ghost = run({ id: 2, check_suite: { id: 8 }, conclusion: 'success', started_at: '2026-11-02T12:00:00Z' });
  const real = run({ id: 1, check_suite: { id: 7 }, conclusion: 'failure' });
  const paths = { 8: '.github/workflows/not-on-base.yml', 7: '.github/workflows/process-gate.yml' };
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { runs: [ghost], paths }).io }), /its workflow .github\/workflows\/not-on-base.yml is the pull request's own copy/);
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { runs: [ghost, real], paths }).io }), /gate: failure/);
  // A pull_request_target run is the base's own copy, and counts.
  assert.equal(mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { runs: [ghost], paths, events: { 8: 'pull_request_target' } }).io }).merged, true);
  assert.equal(workflowRun('o/r', ghost, { read: (a) => (a[1].includes('check_suite_id=8') ? { workflow_runs: [{ path: '.github/workflows/x.yml@refs/heads/main', event: 'pull_request_target' }] } : null) }).event, 'pull_request_target');
});

// process3 at a pin: a repository with the shim on its tranche, behind an origin.
function process3(shimText) {
  const p = makeRepo({ 'shims/process-gate.yml': shimText, 'README.md': 'process3' });
  git(['branch', 'tranche'], { cwd: p });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-proc-')), 'p.git');
  git(['init', '-q', '--bare', bare], { cwd: p });
  git(['remote', 'add', 'origin', bare], { cwd: p });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: p });
  const pin = git(['rev-parse', 'HEAD'], { cwd: p });
  git(['checkout', '-q', '-b', 'side'], { cwd: p });
  const unreleased = commit(p, { 'shims/process-gate.yml': shimText + '# side\n' });
  return { dir: p, pin, unreleased };
}
function pinMove(pin, workflow) {
  const r = plainRepo({ files: { 'pin.txt': 'moved' } });
  git(['checkout', '-q', r.head], { cwd: r.root });
  git(['update-index', '--add', '--cacheinfo', `160000,${pin},.process`], { cwd: r.root });
  write(r.root, { '.github/workflows/process-gate.yml': workflow });
  git(['add', '.github/workflows/process-gate.yml'], { cwd: r.root });
  git(['commit', '-q', '-m', 'move the pin and the shim'], { cwd: r.root });
  git(['push', '-q', 'origin', r.head], { cwd: r.root });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  return { ...r, sha: git(['rev-parse', `refs/heads/${r.head}`], { cwd: r.root }) };
}

test('a workflow changed to the process\'s own shim at a released pin is allowed, and its runs count', () => {
  const shim = 'name: process-gate\non: pull_request\n';
  const p = process3(shim);
  const r = pinMove(p.pin, shim);
  const f = plainIO(r, { repo: processRepo(p.dir) });
  assert.equal(mergePlain(r.root, 4, { ...q, noReview: 'a pin move', io: f.io }).merged, true);
  // Not the shim byte for byte, or a pin that is not on process3's tranche or main: refused.
  const off = pinMove(p.pin, shim + ' ');
  assert.throws(() => mergePlain(off.root, 4, { ...q, noReview: 'x', io: plainIO(off, { repo: processRepo(p.dir) }).io }), /is not the process's own shim at/);
  const side = pinMove(p.unreleased, shim + '# side\n');
  assert.throws(() => mergePlain(side.root, 4, { ...q, noReview: 'x', io: plainIO(side, { repo: processRepo(p.dir) }).io }), /is not a commit on process3's tranche or main/);
});

test('the head moving between the two reads refuses', () => {
  const r = plainRepo();
  const f = plainIO(r, { after: (p) => ({ ...p, head: { ...p.head, sha: 'e'.repeat(40) } }) });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /moved while it was checked/);
  assert.equal(f.calls.merged, null);
});

test('a rename lists the path it removes: out of a module, or into a job\'s own', () => {
  const r = plainRepo({ files: { 'pin.txt': 'moved' } });
  git(['checkout', '-q', 'tranche'], { cwd: r.root });
  commit(r.root, { 'src/alpha/index.mjs': 'export const x = 1;\n'.repeat(20) });
  git(['push', '-q', 'origin', 'tranche'], { cwd: r.root });
  git(['checkout', '-q', '-b', 'bob/move'], { cwd: r.root });
  git(['mv', 'src/alpha/index.mjs', 'index-moved.mjs'], { cwd: r.root });
  git(['commit', '-q', '-m', 'move it out'], { cwd: r.root });
  git(['push', '-q', 'origin', 'bob/move'], { cwd: r.root });
  const sha = git(['rev-parse', 'HEAD'], { cwd: r.root });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO({ ...r, sha, head: 'bob/move' }).io }), /changes module files.*src\/alpha\/index.mjs \(alpha\)/);
  // The job route: a job that moves a file from outside its module into it.
  const j = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), 'docs/guide.md': 'a guide line\n'.repeat(30) });
  git(['branch', 'tranche'], { cwd: j });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: j });
  git(['remote', 'add', 'origin', bare], { cwd: j });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: j });
  git(['mv', 'docs/guide.md', 'guide.md'], { cwd: j });
  write(j, { 'src/alpha/.keep': '' });
  git(['add', 'src/alpha/.keep'], { cwd: j });
  git(['mv', 'guide.md', 'src/alpha/guide.md'], { cwd: j });
  git(['commit', '-q', '-m', 'take the guide'], { cwd: j });
  const head = git(['rev-parse', 'HEAD'], { cwd: j });
  git(['push', '-q', 'origin', 'tranche', 'job/alpha', 'main'], { cwd: j });
  git(['checkout', '-q', 'main'], { cwd: j });
  assert.throws(() => merge(j, 3, { slug: 'o/r', io: io(head).io, noReview: 'x', log: () => {} }), /outside its module: docs\/guide.md/);
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
