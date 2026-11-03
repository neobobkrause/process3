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
  const r = merge(root, 3, { slug: 'o/r', io: f.io, reviewed: 'fresh worker, no gaps', rounds: 2, log: () => {} });
  assert.equal(r.merged, true);
  const tip = git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0];
  assert.equal(f.calls.merged, tip, 'merges the tip the gate passed');
  assert.equal(git(['merge-base', '--is-ancestor', 'origin/tranche', tip], { cwd: root, allowFail: true }).code, 0, 'up to the tranche');
  git(['checkout', '-q', tip], { cwd: root });
  assert.equal(readRows(root, 'alpha').at(-1).row, 'merge');
  assert.equal(readRows(root, 'alpha').at(-1).review_rounds, 2, 'the merge row records its review rounds');
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
function plainIO(r, { base = 'tranche', head = r.head, rules = { checks: [{ context: 'gate', app: ACTIONS_APP }], strict: false }, runs = [run()], paths = {}, events = {}, headRepo = 'o/r', after, repo = { released: () => false, shim: () => null, descends: () => false }, open = [] } = {}) {
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
      openFrom: () => open,
      repoOwner: () => 'neobobkrause',
      me: () => 'civicsmith',
      namedChecks: () => true,
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
  const out = mergePlain(r.root, 4, { ...q, io: f.io, reviewed: 'fresh reader, no gaps', rounds: 1 });
  assert.equal(out.merged, true);
  assert.equal(f.calls.merged.sha, r.sha);
  assert.equal(f.calls.merged.title, 'Merge PR 4: bob/pin into tranche');
  assert.equal(f.calls.merged.message, 'Reviewed: fresh reader, no gaps\nReview rounds: 1');
  assert.equal(refs(r.root), before, 'no branch moved, here or on origin: no merge row, no push');
  assert.equal(git(['worktree', 'list'], { cwd: r.root }).split('\n').length, 1);
});

test('merge --plain works in process3 itself, with no config and no ledger', () => {
  const r = plainRepo({ config: false, ledger: false, files: { 'tool/p3.mjs': '// changed\n' } });
  const f = plainIO(r, { rules: { checks: [{ context: 'ci', app: ACTIONS_APP }, { context: 'record', app: ACTIONS_APP }], strict: false } });
  assert.equal(mergePlain(r.root, 4, { ...q, io: f.io, noReview: 'a test' }).merged, true);
  assert.equal(f.calls.merged.message, 'No review: a test\nReview rounds: 0');
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

// Third confirming review of PR 14.
// process3 with two released commits on its tranche and one unreleased.
function process3Line() {
  const p = makeRepo({ 'shims/process-gate.yml': 'on: pull_request\n' });
  const v1 = git(['rev-parse', 'HEAD'], { cwd: p });
  const v2 = commit(p, { 'README.md': 'v2' });
  git(['branch', 'tranche'], { cwd: p });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-proc-')), 'p.git');
  git(['init', '-q', '--bare', bare], { cwd: p });
  git(['remote', 'add', 'origin', bare], { cwd: p });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: p });
  git(['checkout', '-q', '-b', 'side'], { cwd: p });
  const side = commit(p, { 'README.md': 'unreleased' });
  return { dir: p, v1, v2, side };
}
// A product whose tranche pins `from`, and a plain PR whose head pins `to` (null: removes it).
function pinPR(from, to, extra = {}) {
  const r = plainRepo({ files: { 'pin.txt': 'x' } });
  git(['checkout', '-q', 'tranche'], { cwd: r.root });
  if (from) git(['update-index', '--add', '--cacheinfo', `160000,${from},.process`], { cwd: r.root });
  git(['commit', '-q', '--allow-empty', '-m', 'the tranche pin'], { cwd: r.root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: r.root });
  git(['checkout', '-q', '-b', 'bob/move'], { cwd: r.root });
  if (to) git(['update-index', '--add', '--cacheinfo', `160000,${to},.process`], { cwd: r.root });
  else git(['rm', '-q', '--cached', '.process'], { cwd: r.root });
  for (const [f, t] of Object.entries(extra)) { write(r.root, { [f]: t }); git(['add', f], { cwd: r.root }); }
  git(['commit', '-q', '--allow-empty', '-m', 'move the pin'], { cwd: r.root });
  git(['push', '-q', 'origin', 'bob/move'], { cwd: r.root });
  const sha = git(['rev-parse', 'HEAD'], { cwd: r.root });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  return { root: r.root, sha, head: 'bob/move' };
}

test('a plain pin move goes forward to a released process3 commit only', () => {
  const p = process3Line();
  const go = (from, to, extra) => { const r = pinPR(from, to, extra); return () => mergePlain(r.root, 4, { ...q, noReview: 'a pin move', io: plainIO(r, { repo: processRepo(p.dir) }).io }); };
  assert.equal(go(p.v1, p.v2)().merged, true, 'forward, released');
  assert.equal(go(null, p.v1)().merged, true, 'a first pin, released');
  assert.throws(go(p.v1, p.side), /is not a commit on process3's tranche or main/);
  assert.throws(go(p.v2, p.v1), /does not descend from the base's pin .*no downgrade/);
  assert.throws(go(p.v1, null), /removes the process pin; that needs the owner's word/);
  assert.throws(go(p.v1, p.v1, { 'process/config.json': JSON.stringify({ process_repo: 'https://example.com/other' }) }), /changes process_repo in process\/config.json; that needs the owner's word/);
});

test('a rule that names no app is held to GitHub Actions', () => {
  const r = plainRepo();
  const rules = { checks: [{ context: 'gate', app: null }], strict: false };
  const other = run({ app: { id: 999 } });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { rules, runs: [other] }).io }), /gate: no run from app 15368/);
  assert.equal(mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { rules }).io }).merged, true);
});

test('a plain merge is refused while another open pull request has the same head', () => {
  const r = plainRepo();
  const f = plainIO(r, { open: [{ number: 4 }, { number: 9 }] });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /bob\/pin is also the head of #9/);
  assert.equal(f.calls.merged, null);
  assert.equal(mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { open: [{ number: 4 }] }).io }).merged, true);
  const unread = plainIO(r, { open: null });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: unread.io }), /could not read the open pull requests/);
});

// Build 22 (2 Nov): process_repo the tool already holds the owner's word for.
import { PROCESS3, processRepoSetAt } from '../lib/merge.mjs';
import { readFileSync } from 'node:fs';
const P3 = 'https://github.com/neobobkrause/process3';
// GitHub says every commit is the owner's website commit.
const everyOwner = () => ({ author: { login: 'neobobkrause' }, committer: { login: 'web-flow' }, commit: { verification: { verified: true } } });
const cfgWith = (process_repo) => JSON.stringify(process_repo === null ? { record_since: null } : { process_repo, record_since: null });
// Onboarding's config: it also sets approvals.owner to the repository's owner (review follow-ups, 2 Nov).
const onboardWith = (process_repo) => JSON.stringify({ process_repo, record_since: null, approvals: { owner: 'neobobkrause' } });
// A product whose main has no process config and whose tranche took process_repo at one commit
// (`how`: 'merge', a merge of a pull request as probe PR 51 did; 'direct', a commit on the
// tranche), then a later config commit that leaves process_repo alone.
function trancheToMain({ how = 'merge', value = P3, mainConfig } = {}) {
  const root = makeRepo({ 'README.md': 'x', '.github/workflows/process-gate.yml': 'on: pull_request\n', ...(mainConfig ? { 'process/config.json': mainConfig } : {}) });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  let setAt;
  if (how === 'merge') {
    git(['checkout', '-q', '-b', 'bob/config'], { cwd: root });
    commit(root, { 'process/config.json': cfgWith(value) }, 'config');
    git(['checkout', '-q', 'tranche'], { cwd: root });
    commit(root, { 'other.txt': 'the tranche moved on' });
    git(['merge', '-q', '--no-ff', '-m', 'Merge pull request #51', 'bob/config'], { cwd: root });
    setAt = git(['rev-parse', 'HEAD'], { cwd: root });
  } else setAt = commit(root, { 'process/config.json': cfgWith(value) }, 'config');
  commit(root, { 'process/config.json': JSON.stringify({ process_repo: value, record_since: null, tranche: 'tranche' }) }, 'later config');
  const sha = commit(root, { 'pin.txt': 'x' });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, sha, head: 'tranche', setAt };
}
// GitHub's view of a commit: the owner's website commit only at `owned`.
const ghCommit = (owned, { author = 'neobobkrause' } = {}) => (args) => {
  const sha = args[1].split('/').pop();
  return sha === owned
    ? { author: { login: author }, committer: { login: 'web-flow' }, commit: { verification: { verified: true } } }
    : { author: { login: 'civicsmith' }, committer: { login: 'civicsmith' }, commit: { verification: { verified: false } } };
};
const intoMain = (r, lookup, asked = []) => {
  const f = plainIO(r, { base: 'main' });
  f.io.lookup = (args, o) => { asked.push(args[1].split('/').pop()); return lookup(args, o); };
  return f;
};

test('the tranche into main may carry process_repo set by the owner\'s website merge (probe PR 51)', () => {
  const r = trancheToMain();
  assert.equal(processRepoSetAt(r.root, r.sha), r.setAt, 'the merge commit, not the pull request\'s own commit or the later one');
  const asked = [];
  const f = intoMain(r, ghCommit(r.setAt), asked);
  assert.equal(mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }).merged, true);
  assert.deepEqual(asked, [r.setAt]);
  assert.equal(f.calls.merged.title, 'Merge PR 4: tranche into main');
});

test('the tranche into main may carry process_repo set by the owner\'s direct website commit', () => {
  const r = trancheToMain({ how: 'direct' });
  assert.equal(mergePlain(r.root, 4, { ...q, noReview: 'x', io: intoMain(r, ghCommit(r.setAt)).io }).merged, true);
});

test('the tranche into main is refused when process_repo came from a commit that is not the owner\'s website commit', () => {
  const msg = /changes process_repo in process\/config\.json; that needs the owner's word: bring it to Bob/;
  for (const how of ['merge', 'direct']) {
    const r = trancheToMain({ how });
    const f = intoMain(r, ghCommit('none'));
    assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), msg);
    assert.equal(f.calls.merged, null);
    // web-flow and verified, but another author; or the owner's website commit elsewhere only.
    assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: intoMain(r, ghCommit(r.setAt, { author: 'civicsmith' })).io }), msg);
    assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: intoMain(r, ghCommit(r.sha)).io }), msg);
  }
  // GitHub cannot be read: refused.
  const r = trancheToMain();
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: intoMain(r, () => null).io }), msg);
});

test('main\'s own value changed by a non-owner commit is refused, and only the tranche carries the exception into main', () => {
  const msg = /changes process_repo in process\/config\.json; that needs the owner's word/;
  // Main already names another process; the tranche's value came from a non-owner commit.
  const r = trancheToMain({ mainConfig: cfgWith('https://example.com/other') });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: intoMain(r, ghCommit('none')).io }), msg);
  // The same history as a pull request into the tranche from a working branch: no owner exception there.
  const w = trancheToMain({ how: 'direct' });
  git(['checkout', '-q', '-b', 'bob/w', 'main'], { cwd: w.root });
  git(['checkout', '-q', 'tranche', '--', 'process/config.json'], { cwd: w.root });
  git(['commit', '-q', '-m', 'carry'], { cwd: w.root });
  git(['push', '-q', 'origin', 'bob/w'], { cwd: w.root });
  const sha = git(['rev-parse', 'HEAD'], { cwd: w.root });
  git(['checkout', '-q', 'main'], { cwd: w.root });
  // Into the tranche, an owner website commit in the branch's history grants nothing.
  git(['push', '-q', 'origin', `${w.sha}:refs/heads/tranche`, '--force'], { cwd: w.root });
  const into = plainIO({ root: w.root, sha, head: 'bob/w' });
  into.io.lookup = everyOwner;
  assert.throws(() => mergePlain(w.root, 4, { ...q, noReview: 'x', io: into.io }), msg);
  // Into main from a branch that is not the tranche is refused before any of this.
  const f = plainIO({ root: w.root, sha, head: 'bob/w' }, { base: 'main' });
  f.io.lookup = everyOwner;
  assert.throws(() => mergePlain(w.root, 4, { ...q, noReview: 'x', io: f.io }), /only the tranche tranche merges into main/);
});

test('onboarding: a pull request into the tranche may set process_repo to process3\'s own address only', () => {
  const msg = /changes process_repo in process\/config\.json; that needs the owner's word: bring it to Bob/;
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  const go = (opts, repo = own) => { const r = plainRepo(opts); const f = plainIO(r, { repo }); f.io.lookup = everyOwner; return { r, f, run: () => mergePlain(r.root, 4, { ...q, noReview: 'onboarding', io: f.io }) }; };
  // No process config on the base; the head sets process3's address: allowed.
  assert.equal(go({ config: false, ledger: false, files: { 'process/config.json': onboardWith(P3) } }).run().merged, true);
  // Any other address: refused, even with an owner commit at hand.
  for (const other of ['https://github.com/someone/process3', 'https://github.com/neobobkrause/process3.git', 'https://example.com/other', '']) {
    const t = go({ config: false, ledger: false, files: { 'process/config.json': onboardWith(other) } });
    assert.throws(t.run, msg, other);
    assert.equal(t.f.calls.merged, null);
  }
  // The tool cannot tell its own address: refused.
  assert.throws(go({ config: false, ledger: false, files: { 'process/config.json': onboardWith(P3) } }, { ...own, address: () => null }).run, msg);
  // The base already has a config (no process_repo yet): not onboarding, refused.
  assert.throws(go({ files: { 'process/config.json': cfgWith(P3) } }).run, msg);
  // A change from one non-null value to another: refused, to process3's address or any other.
  const from = (value, to) => { const r = makeRepoWith(cfgWith(value), cfgWith(to)); const f = plainIO(r, { repo: own }); f.io.lookup = everyOwner; return () => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }); };
  assert.throws(from('https://example.com/other', P3), msg);
  assert.throws(from(P3, 'https://example.com/other'), msg);
  // Removing it: refused.
  assert.throws(from(P3, null), msg);
});
// A product whose tranche's config is `base`, and a pull request into the tranche that makes it `head`.
function makeRepoWith(base, head) {
  const root = makeRepo({ 'README.md': 'x', '.github/workflows/process-gate.yml': 'on: pull_request\n', 'process/config.json': base });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'bob/pin', 'tranche'], { cwd: root });
  const sha = commit(root, { 'process/config.json': head });
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche', 'bob/pin'], { cwd: root });
  return { root, sha, head: 'bob/pin' };
}

test('process3\'s own address is the one the shims fall back to', () => {
  assert.equal(PROCESS3, P3);
  assert.equal(processRepo(makeRepo({ 'a.txt': 'x' })).address(), P3, 'whatever the clone\'s origin');
  for (const f of ['shims/process-gate.yml', 'shims/process-record.yml']) {
    const text = readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
    const named = [...text.matchAll(/\.process_repo \/\/ "([^"]+)"/g)].map((m) => m[1]);
    assert.ok(named.length, f);
    for (const n of named) assert.equal(n, PROCESS3, f);
  }
});

test('an unreadable process config grants no exception', () => {
  const msg = /changes process_repo in process\/config\.json; that needs the owner's word/;
  // The head's config is not JSON: into the tranche at onboarding, refused.
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  const r = plainRepo({ config: false, ledger: false, files: { 'process/config.json': '{ "process_repo": ' } });
  const f = plainIO(r, { repo: own });
  f.io.lookup = everyOwner;
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), msg);
  // Main's config is not JSON: the owner and the tranche's name cannot be read, so the tranche into main is refused.
  const m = trancheToMain({ how: 'direct', mainConfig: '{ not json' });
  git(['checkout', '-q', 'tranche'], { cwd: m.root }); // the local checkout's own config is readable
  assert.throws(() => mergePlain(m.root, 4, { ...q, noReview: 'x', io: intoMain(m, everyOwner).io }), /process\/config\.json on main cannot be read/);
});

test('the owner\'s commit is looked up in the pull request\'s repository', () => {
  const r = trancheToMain();
  const asked = [];
  const f = intoMain(r, (args) => { asked.push(args[1]); return ghCommit(r.setAt)(args); });
  mergePlain(r.root, 4, { ...q, slug: 'o/r', noReview: 'x', io: f.io });
  assert.deepEqual(asked, [`repos/o/r/commits/${r.setAt}`]);
});

test('the owner is read from main\'s config, not from the tranche\'s', () => {
  const msg = /changes process_repo in process\/config\.json; that needs the owner's word/;
  // The tranche's config names another owner, whose website commit set process_repo.
  const r = trancheToMain({ how: 'direct', value: P3 });
  git(['checkout', '-q', 'tranche'], { cwd: r.root });
  commit(r.root, { 'process/config.json': JSON.stringify({ process_repo: 'https://example.com/other', approvals: { owner: 'civicsmith' } }) }, 'another owner');
  r.setAt = git(['rev-parse', 'HEAD'], { cwd: r.root });
  r.sha = r.setAt;
  git(['push', '-q', 'origin', 'tranche'], { cwd: r.root });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: intoMain(r, ghCommit(r.setAt, { author: 'civicsmith' })).io }), msg);
  // Main's config names the owner: that owner's website commit is the one that counts.
  const m = trancheToMain({ how: 'direct', mainConfig: JSON.stringify({ approvals: { owner: 'civicsmith' } }) });
  assert.equal(mergePlain(m.root, 4, { ...q, noReview: 'x', io: intoMain(m, ghCommit(m.setAt, { author: 'civicsmith' })).io }).merged, true);
  assert.throws(() => mergePlain(m.root, 4, { ...q, noReview: 'x', io: intoMain(m, ghCommit(m.setAt)).io }), msg);
});

test('onboarding is refused when the tranche gained a process config after the branch point', () => {
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  const r = plainRepo({ config: false, ledger: false, files: { 'process/config.json': cfgWith(P3) } });
  git(['checkout', '-q', 'tranche'], { cwd: r.root });
  commit(r.root, { 'process/config.json': JSON.stringify({ record_since: null }) }, 'a config on the tranche');
  git(['push', '-q', 'origin', 'tranche'], { cwd: r.root });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  const f = plainIO(r, { repo: own });
  f.io.lookup = everyOwner;
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /changes process_repo in process\/config\.json; that needs the owner's word/);
  assert.equal(f.calls.merged, null);
});

test('the tranche\'s name for onboarding: the base\'s, or the head\'s config naming exactly that base', () => {
  const msg = /changes process_repo in process\/config\.json; that needs the owner's word/;
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  // A pull request into a working branch whose head config names another branch as the tranche:
  // not onboarding, whatever the working tree says.
  const r = plainRepo({ config: false, ledger: false, files: { 'process/config.json': JSON.stringify({ process_repo: P3, tranche: 'tranche', approvals: { owner: 'neobobkrause' } }) } });
  git(['push', '-q', 'origin', 'tranche:refs/heads/bob/plan'], { cwd: r.root });
  write(r.root, { 'process/config.json': JSON.stringify({ tranche: 'bob/plan' }) }); // the working tree too
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { base: 'bob/plan', repo: own }).io }), msg);
});

test('onboarding a tranche of another name: the head names its base, and the tranche then goes into main', () => {
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  const cfgDev = (extra = {}) => JSON.stringify({ process_repo: P3, tranche: 'dev', approvals: { owner: 'neobobkrause' }, ...extra });
  const r = plainRepo({ config: false, ledger: false, files: { 'process/config.json': cfgDev() } });
  git(['push', '-q', 'origin', 'tranche:refs/heads/dev'], { cwd: r.root });
  // Onboarding into "dev": every onboarding rule holds there, approvals.owner included.
  const f = plainIO(r, { base: 'dev', repo: own });
  assert.equal(mergePlain(r.root, 4, { ...q, noReview: 'onboarding', io: f.io }).merged, true);
  const noOwner = plainRepo({ config: false, ledger: false, files: { 'process/config.json': JSON.stringify({ process_repo: P3, tranche: 'dev' }) } });
  git(['push', '-q', 'origin', 'tranche:refs/heads/dev'], { cwd: noOwner.root });
  assert.throws(() => mergePlain(noOwner.root, 4, { ...q, noReview: 'x', io: plainIO(noOwner, { base: 'dev', repo: own }).io }), /onboarding sets approvals\.owner/);
  // "dev" is the tranche, so it must require checks.
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: plainIO(r, { base: 'dev', repo: own, rules: { checks: [], strict: false } }).io }), /dev requires no checks/);
  // Then "dev" into main while main has no config: its own config names it the tranche.
  git(['checkout', '-q', '-b', 'dev', 'origin/dev'], { cwd: r.root });
  git(['merge', '-q', '--no-ff', '-m', 'Merge PR 4', r.sha], { cwd: r.root });
  const tip = git(['rev-parse', 'HEAD'], { cwd: r.root });
  git(['push', '-q', 'origin', 'dev'], { cwd: r.root });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  const m = plainIO({ root: r.root, sha: tip, head: 'dev' }, { base: 'main', repo: own });
  m.io.lookup = ghCommit('none');
  assert.equal(mergePlain(r.root, 5, { ...q, noReview: 'x', io: m.io }).merged, true);
  // Another branch into main is still refused.
  assert.throws(() => mergePlain(r.root, 5, { ...q, noReview: 'x', io: plainIO({ root: r.root, sha: tip, head: 'bob/w' }, { base: 'main', repo: own }).io }), /only the tranche tranche merges into main, not bob\/w/);
});

test('the tranche into main takes the tranche\'s name from main\'s config', () => {
  // Main's config names another branch as the tranche: the owner exception does not apply to this one.
  const r = trancheToMain({ how: 'direct', mainConfig: JSON.stringify({ tranche: 'bob/plan' }) });
  git(['checkout', '-q', 'tranche'], { cwd: r.root }); // the local checkout says the tranche is "tranche"
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: intoMain(r, ghCommit(r.setAt)).io }), /only the tranche bob\/plan merges into main, not tranche/);
});

test('the tranche into main may carry process3\'s own address that the tool merged at onboarding', () => {
  const msg = /changes process_repo in process\/config\.json; that needs the owner's word: bring it to Bob/;
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  // Onboarding: a pull request into the tranche sets process3's address, and the tool merges it.
  const r = plainRepo({ config: false, ledger: false, files: { 'process/config.json': onboardWith(P3) } });
  const f = plainIO(r, { repo: own });
  f.io.lookup = ghCommit('none');
  assert.equal(mergePlain(r.root, 4, { ...q, noReview: 'onboarding', io: f.io }).merged, true);
  // GitHub makes the merge as civicsmith, not through the owner's website.
  git(['checkout', '-q', 'tranche'], { cwd: r.root });
  git(['merge', '-q', '--no-ff', '-m', 'Merge PR 4: bob/pin into tranche', r.sha], { cwd: r.root });
  const tip = git(['rev-parse', 'HEAD'], { cwd: r.root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: r.root });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  const t = { root: r.root, sha: tip, head: 'tranche' };
  const m = plainIO(t, { base: 'main', repo: own });
  m.io.lookup = ghCommit('none');
  assert.equal(mergePlain(r.root, 5, { ...q, noReview: 'x', io: m.io }).merged, true);
  assert.equal(m.calls.merged.sha, tip);
  // Without process3's own address to compare with: refused.
  assert.throws(() => mergePlain(r.root, 5, { ...q, noReview: 'x', io: plainIO(t, { base: 'main', repo: { ...own, address: () => null } }).io }), msg);
  // The exception is the tranche's into main only: another branch into main is refused before it.
  git(['push', '-q', 'origin', `${tip}:refs/heads/bob/w`], { cwd: r.root });
  assert.throws(() => mergePlain(r.root, 5, { ...q, noReview: 'x', io: plainIO({ ...t, head: 'bob/w' }, { base: 'main', repo: own }).io }), /only the tranche tranche merges into main/);
});

test('the tranche into main is refused for any other address, or when main has a process config', () => {
  const msg = /changes process_repo in process\/config\.json; that needs the owner's word: bring it to Bob/;
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  const go = (opts) => { const r = trancheToMain(opts); const f = plainIO(r, { base: 'main', repo: own }); f.io.lookup = ghCommit('none'); return { f, run: () => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }) }; };
  // Main has no config, but the tranche's value is not exactly process3's address.
  for (const other of ['https://github.com/someone/process3', 'https://github.com/neobobkrause/process3.git', 'https://example.com/other', '']) {
    const t = go({ value: other });
    assert.throws(t.run, msg, other);
    assert.equal(t.f.calls.merged, null);
  }
  // Main already has a config naming another process: a change from one value to another.
  assert.throws(go({ value: P3, mainConfig: cfgWith('https://example.com/other') }).run, msg);
  // Main has a config with no process_repo: not onboarding.
  assert.throws(go({ value: P3, mainConfig: cfgWith(null) }).run, msg);
  // Main gained a config after the tranche branched: main's tip counts too.
  const r = trancheToMain({ value: P3 });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  commit(r.root, { 'process/config.json': cfgWith(null) }, 'a config on main');
  git(['push', '-q', 'origin', 'main'], { cwd: r.root });
  const f = plainIO(r, { base: 'main', repo: own });
  f.io.lookup = ghCommit('none');
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), msg);
});

test('the module-file exemption takes the tranche\'s name from the base\'s config', () => {
  // A pull request from bob/plan into the tranche that changes module files, in a checkout whose
  // working-tree config says bob/plan is the tranche.
  const r = plainRepo({ head: 'bob/plan', files: { 'src/alpha/index.mjs': 'export const x = 1;\n' } });
  write(r.root, { 'process/config.json': JSON.stringify({ tranche: 'bob/plan' }) });
  const f = plainIO(r);
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /changes module files, which go through a job: src\/alpha\/index.mjs \(alpha\)/);
  assert.equal(f.calls.merged, null);
});

test('the tranche must require checks by the base\'s config, not the working tree\'s', () => {
  // The working-tree config names another branch as the tranche; the base's says it is "tranche".
  const r = plainRepo();
  write(r.root, { 'process/config.json': JSON.stringify({ tranche: 'bob/plan' }) });
  const f = plainIO(r, { rules: { checks: [], strict: false } });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /tranche requires no checks/);
  assert.equal(f.calls.merged, null);
  // An unreadable base config grants no exception either: checks are required.
  const u = plainRepo({ files: { 'pin.txt': 'moved' } });
  git(['checkout', '-q', 'tranche'], { cwd: u.root });
  commit(u.root, { 'process/config.json': '{ not json' }, 'broken');
  git(['push', '-q', 'origin', 'tranche'], { cwd: u.root });
  git(['checkout', '-q', 'main'], { cwd: u.root });
  assert.throws(() => mergePlain(u.root, 4, { ...q, noReview: 'x', io: plainIO(u, { rules: { checks: [], strict: false } }).io }), /tranche requires no checks/);
});

test('main deleting its config after the tranche branched does not make it onboarding', () => {
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  // The merge base holds main's config naming another process; main's tip has none.
  const r = trancheToMain({ value: P3, mainConfig: cfgWith('https://example.com/other') });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  git(['rm', '-q', 'process/config.json'], { cwd: r.root });
  git(['commit', '-q', '-m', 'main drops its config'], { cwd: r.root });
  git(['push', '-q', 'origin', 'main'], { cwd: r.root });
  const f = plainIO(r, { base: 'main', repo: own });
  f.io.lookup = ghCommit('none');
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /changes process_repo in process\/config\.json; that needs the owner's word/);
  assert.equal(f.calls.merged, null);
});

test('an unreadable base config grants no module-file exemption', () => {
  // The base's config is not JSON; the head (named as the working tree's tranche) changes module files.
  const r = plainRepo({ head: 'bob/plan', files: { 'src/alpha/index.mjs': 'export const x = 1;\n' } });
  git(['checkout', '-q', 'tranche'], { cwd: r.root });
  commit(r.root, { 'process/config.json': '{ not json' }, 'broken');
  git(['push', '-q', 'origin', 'tranche'], { cwd: r.root });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  write(r.root, { 'process/config.json': JSON.stringify({ tranche: 'bob/plan' }) });
  const f = plainIO(r);
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /changes module files, which go through a job: src\/alpha\/index.mjs \(alpha\)/);
  assert.equal(f.calls.merged, null);
});

test('only the tranche by main\'s config merges into main, whatever the working tree says', () => {
  const r = plainRepo({ head: 'bob/w' });
  write(r.root, { 'process/config.json': JSON.stringify({ tranche: 'bob/w' }) });
  const f = plainIO(r, { base: 'main' });
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /only the tranche tranche merges into main, not bob\/w/);
  assert.equal(f.calls.merged, null);
  // Main's config cannot be read: nothing merges into main.
  const u = plainRepo({ head: 'tranche' });
  git(['checkout', '-q', 'main'], { cwd: u.root });
  commit(u.root, { 'process/config.json': '{ not json' }, 'broken');
  git(['push', '-q', 'origin', 'main'], { cwd: u.root });
  git(['checkout', '-q', 'tranche'], { cwd: u.root }); // the local checkout's own config is readable
  assert.throws(() => mergePlain(u.root, 4, { ...q, noReview: 'x', io: plainIO(u, { base: 'main' }).io }), /process\/config\.json on main cannot be read/);
});

// Review follow-ups, 2 Nov: the config's "tranche" field takes process_repo's owner's-word rule.
import { pinChange } from '../lib/merge.mjs';
import { recordCheck } from '../lib/record.mjs';
import { DEFAULTS as D, loadConfig } from '../lib/util.mjs';

test('a pull request into the tranche may not rename the tranche; naming its default is no change', () => {
  const msg = /changes tranche in process\/config\.json; that needs the owner's word: bring it to Bob/;
  const into = (base, head) => { const r = makeRepoWith(base, head); const f = plainIO(r); f.io.lookup = everyOwner; return { f, run: () => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }) }; };
  for (const [from, to] of [[{}, { tranche: 'bob/plan' }], [{ tranche: 'tranche' }, { tranche: 'other' }]]) {
    const t = into(JSON.stringify(from), JSON.stringify(to));
    assert.throws(t.run, msg, JSON.stringify(to));
    assert.equal(t.f.calls.merged, null);
  }
  // The default named outright, or dropped again: the tranche is still "tranche".
  assert.equal(into('{}', JSON.stringify({ tranche: 'tranche' })).run().merged, true);
  assert.equal(into(JSON.stringify({ tranche: 'tranche' }), '{}').run().merged, true);
  // An unreadable head config grants nothing.
  assert.throws(into('{}', '{ "tranche": ').run, /changes (process_repo|tranche) in process\/config\.json/);
});

test('onboarding may name only the branch it onboards as the tranche', () => {
  const msg = /changes tranche in process\/config\.json; that needs the owner's word: bring it to Bob/;
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  const go = (tranche) => {
    const r = plainRepo({ config: false, ledger: false, files: { 'process/config.json': JSON.stringify({ process_repo: P3, tranche, approvals: { owner: 'neobobkrause' } }) } });
    const f = plainIO(r, { repo: own });
    return { f, run: () => mergePlain(r.root, 4, { ...q, noReview: 'onboarding', io: f.io }) };
  };
  // The pull request goes into "tranche": naming it is no change.
  assert.equal(go('tranche').run().merged, true);
  // Any other name would move the module-file and required-checks guards to a branch nobody
  // onboarded (reviews of PR 26): refused.
  for (const bad of ['dev', 'main', 'job/x', '', ' tranche', 7]) {
    const t = go(bad);
    assert.throws(t.run, msg, String(bad));
    assert.equal(t.f.calls.merged, null);
  }
  // The tranche into main while main has no config: only the tranche's own name is carried.
  for (const [name, ok] of [['tranche', true], ['dev', false]]) {
    const r = trancheToMain({ how: 'direct' });
    git(['checkout', '-q', 'tranche'], { cwd: r.root });
    r.sha = commit(r.root, { 'process/config.json': JSON.stringify({ process_repo: P3, tranche: name }) }, 'name');
    git(['push', '-q', 'origin', 'tranche'], { cwd: r.root });
    git(['checkout', '-q', 'main'], { cwd: r.root });
    const m = plainIO(r, { base: 'main', repo: own });
    m.io.lookup = ghCommit('none');
    if (ok) assert.equal(mergePlain(r.root, 4, { ...q, noReview: 'x', io: m.io }).merged, true, name);
    else assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: m.io }), msg, name);
  }
});

test('the tranche into main may carry a tranche name the owner\'s website commit set, or one onboarding set while main had no config', () => {
  const msg = /changes tranche in process\/config\.json; that needs the owner's word: bring it to Bob/;
  // Main has a config naming the default tranche; the tranche's config renames it.
  const renamed = () => {
    const r = trancheToMain({ how: 'direct', mainConfig: JSON.stringify({ process_repo: P3 }) });
    git(['checkout', '-q', 'tranche'], { cwd: r.root });
    r.setAt = commit(r.root, { 'process/config.json': JSON.stringify({ process_repo: P3, tranche: 'tranche-2' }) }, 'rename');
    r.sha = r.setAt;
    git(['push', '-q', 'origin', 'tranche'], { cwd: r.root });
    git(['checkout', '-q', 'main'], { cwd: r.root });
    return r;
  };
  const a = renamed();
  assert.equal(mergePlain(a.root, 4, { ...q, noReview: 'x', io: intoMain(a, ghCommit(a.setAt)).io }).merged, true);
  const b = renamed();
  const f = intoMain(b, ghCommit('none'));
  assert.throws(() => mergePlain(b.root, 4, { ...q, noReview: 'x', io: f.io }), msg);
  assert.equal(f.calls.merged, null);
  // Main has no config at all: the name onboarding set is carried, whoever merged it.
  const c = trancheToMain({ how: 'direct' });
  git(['checkout', '-q', 'tranche'], { cwd: c.root });
  c.sha = commit(c.root, { 'process/config.json': JSON.stringify({ process_repo: P3, tranche: 'tranche' }) }, 'name');
  git(['push', '-q', 'origin', 'tranche'], { cwd: c.root });
  git(['checkout', '-q', 'main'], { cwd: c.root });
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  const m = plainIO(c, { base: 'main', repo: own });
  m.io.lookup = ghCommit('none');
  assert.equal(mergePlain(c.root, 4, { ...q, noReview: 'x', io: m.io }).merged, true);
});

// Review follow-ups, 2 Nov: onboarding sets approvals.owner to the repository's owner.
test('onboarding sets approvals.owner to the repository\'s owner as GitHub has it', () => {
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  const go = (approvals, owner = 'alice') => {
    const r = plainRepo({ config: false, ledger: false, files: { 'process/config.json': JSON.stringify({ process_repo: P3, ...(approvals ? { approvals } : {}) }) } });
    const f = plainIO(r, { repo: own });
    f.io.repoOwner = (slug) => { f.asked = slug; return owner; };
    return { f, run: () => mergePlain(r.root, 4, { ...q, noReview: 'onboarding', io: f.io }) };
  };
  const ok = go({ owner: 'alice' });
  assert.equal(ok.run().merged, true);
  assert.equal(ok.f.asked, 'o/r', 'read from the pull request\'s repository');
  assert.throws(go(null).run, /onboarding sets approvals\.owner in process\/config\.json to the repository's owner, alice, as GitHub has it; the pull request does not set it/);
  assert.throws(go({ owner: 'neobobkrause' }).run, /to the repository's owner, alice, as GitHub has it; the pull request sets "neobobkrause"/);
  assert.throws(go({ owner: 'alice' }, null).run, /to the repository's owner, and the repository's owner could not be read from GitHub/);
  // An organization owns the repository: the default owner holds, as before, and onboarding
  // writes that (reviews of PR 26).
  const org = { login: 'neobobkrause', organization: 'acme' };
  assert.equal(go({ owner: 'neobobkrause' }, org).run().merged, true);
  assert.throws(go({ owner: 'acme' }, org).run, /to the default owner, neobobkrause, since the organization acme owns the repository; the pull request sets "acme"/);
  // Not onboarding (the base has a config): nothing asked of approvals.owner here.
  const r = makeRepoWith(JSON.stringify({}), JSON.stringify({ record_since: null }));
  const f = plainIO(r);
  f.io.repoOwner = () => { throw new Error('asked'); };
  assert.equal(mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }).merged, true);
});

test('while main has no config, the tranche into main judges by the repository\'s owner', () => {
  const r = trancheToMain({ how: 'direct', value: 'https://example.com/fork' });
  const f = intoMain(r, ghCommit(r.setAt, { author: 'alice' }));
  f.io.repoOwner = () => 'alice';
  assert.equal(mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }).merged, true);
  const g = intoMain(r, ghCommit(r.setAt, { author: 'alice' }));
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: g.io }), /changes process_repo/);
});

// Review follow-ups, 2 Nov: pinChange lets the tranche carry its config into main as it is;
// the record check is what stops a carried config from changing approvals.owner.
test('the tranche into main carrying a changed approvals.owner passes pinChange, and the record check refuses it', () => {
  const r = trancheToMain({ how: 'direct', mainConfig: JSON.stringify({ process_repo: P3 }) });
  const mainTip = git(['rev-parse', 'main'], { cwd: r.root });
  git(['checkout', '-q', 'tranche'], { cwd: r.root });
  const change = commit(r.root, { 'process/config.json': JSON.stringify({ process_repo: P3, approvals: { owner: 'civicsmith' } }) }, 'a session names another owner');
  git(['push', '-q', 'origin', 'tranche'], { cwd: r.root });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  const mb = git(['merge-base', mainTip, change], { cwd: r.root });
  assert.doesNotThrow(() => pinChange(r.root, mb, change, { released: () => false, descends: () => false }, { intoMain: true, baseRef: 'origin/main', ownerCommit: () => ({ ok: false }) }));
  const cfgMain = loadConfig(r.root, mainTip);
  assert.equal(cfgMain.approvals.owner, D.approvals.owner);
  const f = recordCheck(r.root, { ...cfgMain, max_file_bytes: 1e6 }, { base: mainTip, head: change, lookup: ghCommit('none') }).findings;
  assert.deepEqual(f.map((x) => [x.check, x.file]), [['approvals', 'process/config.json']]);
  assert.match(f[0].message, new RegExp(`commit ${change.slice(0, 10)} changes the approvals or record_since but is not neobobkrause's own commit`));
  // The owner's own website commit may change it.
  assert.deepEqual(recordCheck(r.root, { ...cfgMain, max_file_bytes: 1e6 }, { base: mainTip, head: change, lookup: ghCommit(change) }).findings, []);
});

// Second re-review of PR 26.
test('onboarding is refused when the repository belongs to the account the sessions act as', () => {
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  const r = plainRepo({ config: false, ledger: false, files: { 'process/config.json': JSON.stringify({ process_repo: P3, approvals: { owner: 'civicsmith' } }) } });
  const f = plainIO(r, { repo: own });
  f.io.repoOwner = () => 'civicsmith';
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /the repository's owner, civicsmith, is the account the sessions act as, so it cannot hold the approvals; approvals\.owner needs Bob's word/);
  assert.equal(f.calls.merged, null);
});

test('while main has no config, a self-named branch goes into main only when its own rules require checks', () => {
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  // A session's branch from main, naming itself the tranche, with module code.
  const r = plainRepo({ config: false, ledger: false, head: 'bob/self', files: { 'process/config.json': JSON.stringify({ process_repo: P3, tranche: 'bob/self' }), 'src/alpha/x.mjs': 'x' } });
  const f = plainIO(r, { base: 'main', repo: own });
  f.io.namedChecks = () => false;
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /bob\/self names itself the tranche, but no ruleset requiring checks names it; only the tranche the owner's ruleset holds merges into main/);
  assert.equal(f.calls.merged, null);
});

test('namedRequiredChecks: a ruleset naming the branch counts; ~ALL, a pattern, an inactive one or an unreadable answer does not', async () => {
  const { namedRequiredChecks } = await import('../lib/github.mjs');
  const rules = [{ type: 'required_status_checks', ruleset_id: 5, parameters: { required_status_checks: [{ context: 'gate' }] } }];
  const reader = (include, enforcement = 'active') => (args) => (args[1].includes('/rules/branches/') ? rules : { enforcement, conditions: { ref_name: { include } } });
  assert.equal(namedRequiredChecks('o/r', 'dev', { read: reader(['refs/heads/dev']) }), true);
  assert.equal(namedRequiredChecks('o/r', 'dev', { read: reader(['~ALL']) }), false);
  assert.equal(namedRequiredChecks('o/r', 'dev', { read: reader(['refs/heads/d*']) }), false);
  assert.equal(namedRequiredChecks('o/r', 'dev', { read: reader(['refs/heads/dev'], 'evaluate') }), false);
  assert.equal(namedRequiredChecks('o/r', 'dev', { read: () => null }), false);
});

test('onboarding refuses when the account the sessions act as cannot be read, and reads it only at onboarding', () => {
  const own = { released: () => false, shim: () => null, descends: () => false, address: () => P3 };
  const r = plainRepo({ config: false, ledger: false, files: { 'process/config.json': JSON.stringify({ process_repo: P3, approvals: { owner: 'neobobkrause' } }) } });
  const f = plainIO(r, { repo: own });
  f.io.me = () => null;
  assert.throws(() => mergePlain(r.root, 4, { ...q, noReview: 'x', io: f.io }), /the account the sessions act as.*could not be read from GitHub \(gh api user\)/);
  // A plain merge into a tranche that already has a config does not ask.
  const m = makeRepoWith(JSON.stringify({}), JSON.stringify({ record_since: null }));
  const g = plainIO(m);
  g.io.me = () => { throw new Error('asked'); };
  assert.equal(mergePlain(m.root, 4, { ...q, noReview: 'x', io: g.io }).merged, true);
});

// Build I (3 Nov): the review-round limit, held by merge.
import { MAX_ROUNDS, reviewRounds } from '../lib/merge.mjs';

test('review rounds: stated and recorded; a third round needs a recorded decision', () => {
  assert.equal(MAX_ROUNDS, 2);
  assert.deepEqual(reviewRounds({ reviewed: 'x', rounds: '1' }), { rounds: 1, decision: null });
  assert.deepEqual(reviewRounds({ reviewed: 'x', rounds: 2 }), { rounds: 2, decision: null });
  assert.deepEqual(reviewRounds({ noReview: 'a pin move' }), { rounds: 0, decision: null });
  assert.throws(() => reviewRounds({ reviewed: 'x' }), /say how many review rounds ran: --rounds <n>/);
  assert.throws(() => reviewRounds({ reviewed: 'x', rounds: true }), /--rounds <n>/);
  assert.throws(() => reviewRounds({ reviewed: 'x', rounds: '0' }), /1 or more/);
  assert.throws(() => reviewRounds({ reviewed: 'x', rounds: '1.5' }), /whole number/);
  assert.throws(() => reviewRounds({ reviewed: 'x', rounds: 3 }), /3 review rounds: the limit is 2 .*--decision/);
  assert.throws(() => reviewRounds({ reviewed: 'x', rounds: 3, decision: true }), /--decision needs the recorded decision/);
  assert.throws(() => reviewRounds({ reviewed: 'x', rounds: 3, decision: '  ' }), /--decision needs the recorded decision/);
  assert.deepEqual(reviewRounds({ reviewed: 'x', rounds: 3, decision: "Bob's word, 3 Nov" }), { rounds: 3, decision: "Bob's word, 3 Nov" });
  assert.throws(() => reviewRounds({ noReview: 'x', rounds: 2 }), /--no-review has no review rounds/);
  assert.throws(() => reviewRounds({ reviewed: true, rounds: 1 }), /--reviewed needs what the reviews found/);
  assert.throws(() => reviewRounds({ rounds: 1 }), /--reviewed/);
  // Review fixes: both flags, or a repeated flag, are refused.
  assert.throws(() => reviewRounds({ reviewed: 'x', noReview: 'y' }), /say one: --reviewed .* or --no-review .*, not both/);
  assert.throws(() => reviewRounds({ reviewed: 'x', rounds: 3, decision: ['a', 'b'] }), /once each/);
  assert.throws(() => reviewRounds({ reviewed: 'x', rounds: ['1', '2'] }), /once each/);
});

test('merge and merge --plain refuse a third round without a decision, and record it with one', () => {
  const { root, head } = setup();
  assert.throws(() => merge(root, 3, { slug: 'o/r', io: io(head).io, reviewed: 'x', rounds: 3, log: () => {} }), /limit is 2/);
  const f = io(head);
  assert.equal(merge(root, 3, { slug: 'o/r', io: f.io, reviewed: 'x', rounds: 3, decision: "Bob's word", log: () => {} }).merged, true);
  const tip = git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0];
  git(['checkout', '-q', tip], { cwd: root });
  const row = readRows(root, 'alpha').at(-1);
  assert.equal(row.review_rounds, 3);
  assert.equal(row.decision, "Bob's word");
  git(['checkout', '-q', 'main'], { cwd: root });
  const r = plainRepo();
  assert.throws(() => mergePlain(r.root, 4, { ...q, io: plainIO(r).io, reviewed: 'x', rounds: 4 }), /limit is 2/);
  const g = plainIO(r);
  assert.equal(mergePlain(r.root, 4, { ...q, io: g.io, reviewed: 'x', rounds: 3, decision: "Bob's word" }).merged, true);
  assert.equal(g.calls.merged.message, "Reviewed: x\nReview rounds: 3\nDecision: Bob's word");
});
