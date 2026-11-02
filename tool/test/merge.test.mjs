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
      getPR: () => ({ state: 'open', draft: false, base: { ref: 'tranche' }, head: { ref: 'job/alpha', sha: head } }),
      comments: () => [
        { id: 1, body: block(RECEIPT, { module: 'alpha', attempt: 1, sha: head }), user: { login: 'neobobkrause' } },
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

// merge --plain (Bob, 2 Nov: the tool is the one merge route).
import { existsSync } from 'node:fs';
import { checkState, requiredChecks } from '../lib/github.mjs';
import { mergePlain } from '../lib/merge.mjs';

function plainIO({ base = 'tranche', head = 'bob/pin', required = ['gate'], states = { gate: 'success' }, draft = false, fork = null } = {}) {
  const calls = { merged: null, read: [] };
  return {
    calls,
    io: {
      getPR: () => ({ state: 'open', draft, base: { ref: base, repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: head, sha: 'h'.repeat(40), repo: { full_name: fork || 'o/r' } } }),
      requiredChecks: (slug, b) => { calls.read.push(b); return required; },
      checkState: (slug, sha, name) => states[name] || 'missing',
      mergePR: (slug, n, sha, o) => { calls.merged = { sha, ...o }; return { merged: true, sha: 'm'.repeat(40) }; },
    },
  };
}

test('merge --plain merges a non-job PR with its required checks green, pinned to the head, and records nothing', () => {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha') });
  const before = git(['rev-parse', 'HEAD'], { cwd: root });
  const f = plainIO({ required: ['gate', 'record'], states: { gate: 'success', record: 'success' } });
  const r = mergePlain(root, 4, { slug: 'o/r', io: f.io, noReview: 'a pin move', log: () => {} });
  assert.equal(r.merged, true);
  assert.deepEqual(f.calls.read, ['tranche'], 'the required checks are the base\'s');
  assert.equal(f.calls.merged.sha, 'h'.repeat(40));
  assert.match(f.calls.merged.title, /Merge PR 4: bob\/pin into tranche/);
  assert.match(f.calls.merged.message, /No review: a pin move/);
  assert.equal(git(['rev-parse', 'HEAD'], { cwd: root }), before);
  assert.equal(git(['status', '--porcelain'], { cwd: root }), '');
  assert.equal(existsSync(join(root, 'process/metrics')), false, 'no merge row');
  // The tranche into main, and a working branch, are also routes.
  assert.equal(mergePlain(root, 5, { slug: 'o/r', io: plainIO({ base: 'main', head: 'tranche' }).io, reviewed: 'fresh reader', log: () => {} }).merged, true);
  assert.equal(mergePlain(root, 6, { slug: 'o/r', io: plainIO({ base: 'bob/plan', head: 'bob/plan-fix', required: [] }).io, reviewed: 'x', log: () => {} }).merged, true);
});

test('merge --plain refuses without a review decision, a red or missing required check, or an unreadable rule set', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const q = { slug: 'o/r', log: () => {} };
  assert.throws(() => mergePlain(root, 4, { ...q, io: plainIO().io }), /--reviewed/);
  assert.throws(() => mergePlain(root, 4, { ...q, noReview: 'x', io: plainIO({ required: ['gate', 'ci'], states: { gate: 'success', ci: 'failure' } }).io }), /not every required check is green .*: ci failure/);
  assert.throws(() => mergePlain(root, 4, { ...q, noReview: 'x', io: plainIO({ states: { gate: 'in_progress' } }).io }), /gate in_progress/);
  assert.throws(() => mergePlain(root, 4, { ...q, noReview: 'x', io: plainIO({ states: {} }).io }), /gate missing/);
  assert.throws(() => mergePlain(root, 4, { ...q, noReview: 'x', io: plainIO({ required: null }).io }), /could not read the checks tranche requires/);
});

test('merge --plain refuses a job\'s PR, a head other than the tranche into main, a job base, a fork, and a draft', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const q = { slug: 'o/r', noReview: 'x', log: () => {} };
  const never = (o) => { const f = plainIO(o); f.io.mergePR = () => { throw new Error('merged'); }; return f.io; };
  assert.throws(() => mergePlain(root, 4, { ...q, io: never({ head: 'job/alpha' }) }), /a job's \(job\/alpha\); merge it without --plain/);
  assert.throws(() => mergePlain(root, 4, { ...q, io: never({ base: 'main', head: 'bob/pin' }) }), /only the tranche tranche merges into main, not bob\/pin/);
  assert.throws(() => mergePlain(root, 4, { ...q, io: never({ base: 'job/alpha' }) }), /a job's branch/);
  assert.throws(() => mergePlain(root, 4, { ...q, io: never({ fork: 'x/r' }) }), /comes from x\/r/);
  assert.throws(() => mergePlain(root, 4, { ...q, io: never({ draft: true }) }), /is a draft/);
});

test('the job route points any other pull request to --plain', () => {
  const { root } = setup();
  const f = io('h'.repeat(40));
  f.io.getPR = () => ({ state: 'open', draft: false, base: { ref: 'tranche' }, head: { ref: 'bob/pin', sha: 'h'.repeat(40) } });
  assert.throws(() => merge(root, 3, { slug: 'o/r', io: f.io, noReview: 'x', log: () => {} }), /merges with --plain/);
});

test('checkState reads the newest check run, else a commit status; requiredChecks reads rulesets', () => {
  assert.equal(checkState('o/r', 's', 'gate', { read: () => ({ status: 'completed', conclusion: 'success' }) }), 'success');
  assert.equal(checkState('o/r', 's', 'gate', { read: () => ({ status: 'queued' }) }), 'queued');
  assert.equal(checkState('o/r', 's', 'ci', { read: () => null, statuses: () => ({ statuses: [{ context: 'ci', state: 'pending' }] }) }), 'pending');
  assert.equal(checkState('o/r', 's', 'ci', { read: () => null, statuses: () => null }), 'missing');
  const asked = [];
  const rules = [
    { type: 'deletion' }, { type: 'pull_request', parameters: { allowed_merge_methods: ['merge'] } },
    { type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'ci' }, { context: 'record' }] } },
    { type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'ci' }] } },
  ];
  assert.deepEqual(requiredChecks('o/r', 'bob/plan', { read: (a) => { asked.push(a[1]); return rules; } }), ['ci', 'record']);
  assert.deepEqual(asked, ['repos/o/r/rules/branches/bob/plan?per_page=100']);
  assert.deepEqual(requiredChecks('o/r', 'x', { read: () => [{ type: 'deletion' }] }), []);
  assert.equal(requiredChecks('o/r', 'x', { read: () => null }), null);
});
