// The record check on job complete's new-attempt path (copy, 4 Nov, pin d022320, process3 PR
// 81): a job that completed, then merged the tranche (a merge commit), runs job complete again.
// The tranche had merged a plain ledger PR (a merge commit, not the owner's) and later took
// pin moves that change the config's approvals and .claude/settings.json. In a depth-1 clone
// shallowBase deepened only the job branch: the base's own history stayed cut, so commits on the
// tranche below the cut (the old base, the ledger PR's merge) fell into base..HEAD and were judged
// again, against the base (whose config and settings the pin moves had changed) or as a root
// commit (the cut one), each named for a change it never made. A commit already on the tranche
// is not judged again; in a shallow clone the history is deepened until the range is GitHub's.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordCheck } from '../lib/record.mjs';
import { shallowBase } from '../lib/job.mjs';
import { main } from '../p3.mjs';
import { DEFAULTS, fetchBranch, git } from '../lib/util.mjs';
import { commit, makeRepo } from './helpers.mjs';

const H = '## Standing approvals from Bob';
const cfg = { ...DEFAULTS, max_file_bytes: 100000, transient: [] };
// Every commit here is a session's (civicsmith through the web-flow look-alike is not the owner).
const notOwner = () => ({ committer: { login: 'web-flow' }, author: { login: 'civicsmith' }, commit: { verification: { verified: true } } });

// pins: the tranche commits between the job's first base and the pin move. owned: the job's own
// commit changes .claude/settings.json too (it must still be found, named for that commit).
function fixture({ pins = 4, owned = false } = {}) {
  const src = makeRepo({
    'CLAUDE.md': `${H}\n\nmay push\n`,
    '.claude/settings.json': '{"a":1}\n',
    'process/config.json': { approvals: { owner: 'neobobkrause' } },
    'notes/x.txt': 'x\n',
  });
  git(['config', 'user.email', 'session@example.com'], { cwd: src });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'origin.git');
  git(['init', '-q', '--bare', bare], { cwd: src });
  git(['remote', 'add', 'origin', bare], { cwd: src });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: src });
  // BOB's plain ledger PR, merged by a merge commit: the job's first base.
  git(['checkout', '-q', '-b', 'ledger'], { cwd: src });
  commit(src, { 'notes/x.txt': 'y\n' }, 'ledger');
  git(['checkout', '-q', 'tranche'], { cwd: src });
  commit(src, { 'notes/z.txt': 'z\n' }, 'tranche moves');
  git(['merge', '-q', '--no-ff', '-m', 'Merge PR 73', 'ledger'], { cwd: src });
  const pr73 = git(['rev-parse', 'HEAD'], { cwd: src });
  // The job, started there, completes (attempt 1).
  git(['checkout', '-q', '-b', 'job/site'], { cwd: src });
  commit(src, { 'src/site/a.js': '1\n' }, 'work');
  commit(src, { 'notes/site.txt': 'COMPLETE\n' }, 'job complete site (attempt 1)');
  // The tranche: commits, then a pin move that changes the approvals key and the owner's settings.
  git(['checkout', '-q', 'tranche'], { cwd: src });
  for (let i = 0; i < pins; i++) commit(src, { [`notes/p${i}.txt`]: `${i}\n` }, `pin ${i}`);
  commit(src, { 'process/config.json': { approvals: { owner: 'neobobkrause', heading: H } }, '.claude/settings.json': '{"a":2}\n' }, 'pin move');
  const tip = git(['rev-parse', 'HEAD'], { cwd: src });
  git(['push', '-q', 'origin', 'tranche', 'main'], { cwd: src });
  // The job merges the tranche in (a merge commit) and pushes a fix: the new attempt.
  git(['checkout', '-q', 'job/site'], { cwd: src });
  git(['merge', '-q', '--no-ff', '-m', 'Merge tranche into job/site', 'tranche'], { cwd: src });
  const fix = commit(src, { 'src/site/a.js': '2\n', ...(owned ? { '.claude/settings.json': '{"a":3}\n' } : {}) }, 'fix');
  git(['push', '-q', 'origin', 'job/site'], { cwd: src });
  return { bare, tip, pr73, fix };
}

const cloneOf = (bare, depth) => {
  const c = join(mkdtempSync(join(tmpdir(), 'p3-clone-')), 'c');
  git(['clone', '-q', ...(depth ? ['--depth', String(depth)] : []), '--branch', 'job/site', `file://${bare}`, c], { cwd: tmpdir() });
  return c;
};

// GitHub's compare of tranche...job/site, read from origin itself.
const compareFrom = (bare) => (slug, base, head) => ({
  merge_base_commit: { sha: git(['merge-base', base, head], { cwd: bare }) },
  ahead_by: Number(git(['rev-list', '--count', `${base}..${head}`], { cwd: bare })),
  behind_by: Number(git(['rev-list', '--count', `${head}..${base}`], { cwd: bare })),
});

// As job complete reads it in a shallow clone: the tranche fetched at depth 1, then shallowBase.
function shallowRange(bare, read = compareFrom(bare)) {
  const c = cloneOf(bare, 1);
  fetchBranch(c, 'tranche');
  return { c, base: shallowBase(c, 'o/r', 'tranche', 'job/site', read) };
}

const JOB_OWN = 4; // work, attempt 1's complete, the tranche merge, the fix

test('full clone: only the job\'s own commits are judged after it merges the tranche', () => {
  const { bare, tip } = fixture();
  const c = cloneOf(bare, 0);
  const base = git(['merge-base', 'HEAD', 'origin/tranche'], { cwd: c });
  assert.equal(base, tip);
  const r = recordCheck(c, cfg, { base, lookup: notOwner });
  assert.deepEqual(r.findings, []);
  assert.equal(r.commits, JOB_OWN);
});

for (const pins of [0, 4, 40]) {
  test(`depth-1 clone (${pins} tranche commits before the pin move): no tranche commit is judged again`, () => {
    const { bare, tip, pr73 } = fixture({ pins });
    const { c, base } = shallowRange(bare);
    assert.equal(base, tip);
    const r = recordCheck(c, cfg, { base, lookup: notOwner });
    assert.deepEqual(r.findings.map((f) => f.message), [], `nothing named, least of all the ledger PR's merge ${pr73.slice(0, 10)}`);
    assert.equal(r.commits, JOB_OWN, 'the same commits as the full clone judges');
    // The range is exactly the commits GitHub counts ahead.
    assert.equal(Number(git(['rev-list', '--count', 'HEAD', `^${base}`], { cwd: c })), compareFrom(bare)(null, 'tranche', 'job/site').ahead_by);
  });
}

test('the owner-website rule still holds for the job\'s own commits, in both clones, named for that commit', () => {
  const { bare, fix } = fixture({ owned: true });
  const full = cloneOf(bare, 0);
  const fr = recordCheck(full, cfg, { base: git(['merge-base', 'HEAD', 'origin/tranche'], { cwd: full }), lookup: notOwner });
  const { c, base } = shallowRange(bare);
  const sr = recordCheck(c, cfg, { base, lookup: notOwner });
  for (const r of [fr, sr]) {
    assert.equal(r.findings.length, 1);
    assert.match(r.findings[0].message, new RegExp(`^commit ${fix.slice(0, 10)} changes \\.claude/settings\\.json`));
  }
});

test('the gate\'s record-check (full clone, as CI runs it) agrees with job complete', async () => {
  for (const owned of [false, true]) {
    const { bare, tip } = fixture({ owned });
    const full = cloneOf(bare, 0);
    const out = join(mkdtempSync(join(tmpdir(), 'p3-out-')), 'f.json');
    const cwd = process.cwd();
    process.chdir(full);
    let code;
    try { code = await main(['record-check', '--base', tip, '--head', 'origin/job/site', '--branch', 'job/site', '--out', out]); } finally { process.chdir(cwd); }
    const gate = JSON.parse(readFileSync(out, 'utf8'));
    const { c, base } = shallowRange(bare);
    const job = recordCheck(c, cfg, { base, branch: 'job/site', lookup: notOwner });
    // The gate asks GitHub about the commit; offline it cannot read it, so it is a finding there
    // too whenever a commit is judged: compare which files and commits each names.
    const named = (fs) => fs.map((f) => `${f.file} ${f.message.slice(0, 17)}`).sort();
    assert.equal(code, owned ? 1 : 0);
    assert.deepEqual(named(gate.findings || gate), named(job.findings));
  }
});

test('a shallow clone that cannot be deepened says so; it never judges a cut commit as new', () => {
  const { bare } = fixture();
  // GitHub claims fewer commits ahead than the history holds: no deepening can match it.
  const wrong = (slug, b, h) => ({ ...compareFrom(bare)(slug, b, h), ahead_by: 1 });
  assert.throws(() => shallowRange(bare, wrong), /could not read the job's range|run job complete again/);
});

test('a shallow clone: the record check fetches the whole history first (--unshallow), and then judges only the job\'s own commits', () => {
  const { bare, tip } = fixture();
  const c = cloneOf(bare, 1);
  fetchBranch(c, 'tranche');
  git(['fetch', '-q', '--depth=3', 'origin', '+refs/heads/job/site:refs/remotes/origin/job/site'], { cwd: c });
  assert.equal(git(['rev-parse', '--is-shallow-repository'], { cwd: c }), 'true');
  const r = recordCheck(c, cfg, { base: tip, head: 'origin/job/site', lookup: notOwner });
  assert.equal(git(['rev-parse', '--is-shallow-repository'], { cwd: c }), 'false');
  assert.deepEqual(r.findings, []);
  assert.equal(r.commits, JOB_OWN);
});

// Copy, 6 Nov: in a depth-1 job clone a sync merge that took the tranche's approvals cleanly was
// named "changes the approvals but is not neobobkrause's own commit". A clone that stays shallow
// is refused in plain words with the command; nothing is judged, so no such change is named.
test('a shallow clone that cannot be unshallowed is refused, naming the shallow clone and the command; no approvals change is reported', () => {
  const { bare, tip } = fixture();
  const c = cloneOf(bare, 1);
  fetchBranch(c, 'tranche');
  git(['fetch', '-q', '--depth=3', 'origin', '+refs/heads/job/site:refs/remotes/origin/job/site'], { cwd: c });
  git(['remote', 'set-url', 'origin', 'file:///nonexistent/origin.git'], { cwd: c });
  assert.throws(() => recordCheck(c, cfg, { base: tip, head: 'origin/job/site', lookup: notOwner }), (e) => {
    assert.match(e.message, /this clone is shallow .*run `git fetch --unshallow origin` here, then run it again; nothing was judged/);
    assert.doesNotMatch(e.message, /changes the approvals/);
    return true;
  });
});
