// JOB-3, SHM-4: job start --take-in, and the tranche carry listing (setup check, status).
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { toTakeIn } from '../lib/carry.mjs';
import { jobStart } from '../lib/job.mjs';
import { setupCheck } from '../lib/setup.mjs';
import { status } from '../lib/status.mjs';
import { git, repoSlug } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const ready = () => ({ ok: true, missing: [] });

// A product converting mid-tranche: alpha's entry on the tranche, earlier work on feature/a made
// before the tranche moved on, pushed to origin.
function converting(files = { 'src/alpha/x.mjs': 'export const x = 1;\n', 'test/alpha/x.test.mjs': '// t\n' }) {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), 'process/ledger/beta.json': entry('beta'), 'req/alpha.md': '# alpha\n', 'README.md': '# p\n' });
  git(['checkout', '-q', '-b', 'feature/a'], { cwd: root });
  for (const [f, t] of Object.entries(files)) commit(root, { [f]: t }, `earlier work on ${f}`);
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'src/beta/b.mjs': 'export const b = 1;\n' }, 'the tranche moves on');
  git(['checkout', '-q', 'main'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'origin.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche', 'feature/a'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  return root;
}

function fakeGitHub(root, prs = {}) {
  const slug = repoSlug(root);
  const s = { opened: [], comments: [], edits: [], drafts: [] };
  return {
    s,
    slug,
    open: (sl, p) => { const pr = { number: 20, html_url: 'pr20', draft: true, ...p }; s.opened.push(pr); return pr; },
    find: (sl, head) => Object.values(prs).find((p) => p.head.ref === head) || null,
    gh: {
      getPR: (sl, n) => prs[n] || null,
      prsFromBranch: (sl, b) => Object.values(prs).filter((p) => p.head?.ref === b),
      baseEverChanged: () => false,
      editPR: (sl, n, f) => { s.edits.push({ n, ...f }); return { ...prs[n], ...f, base: { ref: f.base } }; },
      toDraft: (sl, pr) => { s.drafts.push(pr.number); return { ...pr, draft: true }; },
      addComment: (sl, n, body) => { s.comments.push({ n, body }); return { id: 1 }; },
    },
  };
}

const remote = (root, ref) => git(['ls-remote', 'origin', `refs/heads/${ref}`], { cwd: root }).split('\t')[0];

test('take-in inside the module\'s paths: job/<id> at the work\'s tip, one merge commit with the start, a new draft PR, the earlier PR left open', () => {
  const root = converting();
  const featureTip = remote(root, 'feature/a');
  const f = fakeGitHub(root, { 5: { number: 5, state: 'open', head: { ref: 'feature/a', repo: { full_name: 'x' } }, base: { ref: 'main' } } });
  const r = jobStart(root, 'alpha', { coordinator: 's', takeIn: 'feature/a', setup: ready, open: f.open, find: f.find, gh: f.gh, log: quiet });
  const tip = remote(root, 'job/alpha');
  assert.ok(tip, 'job/alpha pushed');
  const parents = git(['log', '-1', '--format=%P', tip], { cwd: root }).split(' ');
  assert.deepEqual(parents, [featureTip, remote(root, 'tranche')], 'a merge commit of the work and the tranche, never a rebase');
  assert.equal(git(['rev-list', '--count', `${remote(root, 'tranche')}..${tip}`], { cwd: root }), '3', 'the two earlier commits kept, plus the start');
  assert.equal(JSON.parse(git(['show', `${tip}:process/ledger/alpha.json`], { cwd: root })).status.state, 'WORKING');
  const row = JSON.parse(git(['show', `${tip}:process/metrics/alpha.jsonl`], { cwd: root }).trim());
  assert.deepEqual([row.event, row.take_in.branch, row.take_in.pr, row.take_in.commits, row.take_in.tip], ['start', 'feature/a', 5, 2, featureTip]);
  assert.match(r.start, /Earlier work taken in: pull request #5 \(branch `feature\/a`\), 2 commit\(s\) made before Process3/);
  assert.equal(remote(root, 'feature/a'), featureTip, 'the earlier branch is not rewritten');
  assert.deepEqual(f.s.opened.map((p) => [p.head, p.base, p.draft]), [['job/alpha', 'tranche', true]]);
  assert.deepEqual(f.s.comments.map((c) => c.n), [5]);
  assert.match(f.s.comments[0].body, /left open as it is/);
  assert.equal(r.subscribe.pullNumber, 20);
  assert.equal(git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root }), 'main');
});

// Cold review of build/branch-bound: a reused PR from job/<id> into another base, or one whose base
// already changed, leaves the branch's runs bound to no job PR (github.mjs unbound), so merge
// would refuse the job for good. Take-in refuses it before anything is written.
test('take-in refuses to reuse a pull request from job/<id> into another base, or one already retargeted, writing nothing', () => {
  for (const [base, changed, re] of [['main', false, /#6 cannot become alpha's job pull request: job\/alpha also had pull request\(s\) 6 into another base/], ['tranche', true, /the base of pull request\(s\) 6 from job\/alpha was changed/]]) {
    const root = converting();
    git(['push', '-q', 'origin', 'refs/remotes/origin/feature/a:refs/heads/job/alpha'], { cwd: root });
    const slug = repoSlug(root);
    const f = fakeGitHub(root, { 6: { number: 6, state: 'open', draft: false, html_url: 'pr6', node_id: 'N6', head: { ref: 'job/alpha', repo: { full_name: slug } }, base: { ref: base } } });
    f.gh.baseEverChanged = () => changed;
    const before = git(['ls-remote', 'origin'], { cwd: root });
    assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', takeIn: '6', setup: ready, open: f.open, find: f.find, gh: f.gh, log: quiet }), re);
    assert.equal(git(['ls-remote', 'origin'], { cwd: root }), before, 'nothing pushed');
    assert.equal(f.s.edits.length + f.s.opened.length, 0);
  }
});

test('take-in by number reuses a pull request from job/<id>: moved to the tranche and made a draft, no new PR', () => {
  const root = converting();
  git(['push', '-q', 'origin', 'refs/remotes/origin/feature/a:refs/heads/job/alpha'], { cwd: root });
  const slug = repoSlug(root);
  const f = fakeGitHub(root, { 6: { number: 6, state: 'open', draft: false, html_url: 'pr6', node_id: 'N6', head: { ref: 'job/alpha', repo: { full_name: slug } }, base: { ref: 'tranche' } } });
  const r = jobStart(root, 'alpha', { coordinator: 's', takeIn: '6', setup: ready, open: f.open, find: f.find, gh: f.gh, log: quiet });
  assert.equal(f.s.opened.length, 0, 'no new pull request');
  assert.equal(f.s.edits[0].base, 'tranche');
  assert.match(f.s.edits[0].body, /Earlier work taken in: pull request #6 \(branch `job\/alpha`\)/);
  assert.deepEqual(f.s.drafts, [6]);
  assert.equal(r.pr.draft, true);
  assert.equal(git(['log', '-1', '--format=%P', remote(root, 'job/alpha')], { cwd: root }).split(' ').length, 2);
});

test('take-in is refused, with the files named and nothing written, when the work changes files outside the module', () => {
  const root = converting({ 'src/alpha/x.mjs': '1\n', 'src/beta/y.mjs': '2\n', 'README.md': '# q\n' });
  const f = fakeGitHub(root);
  const before = git(['ls-remote', 'origin'], { cwd: root });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', takeIn: 'feature/a', setup: ready, open: f.open, find: f.find, gh: f.gh, log: quiet }),
    /refused, nothing written: feature\/a changes 2 file\(s\) outside module alpha's paths .*: README.md, src\/beta\/y.mjs\. BOB splits the work, or takes in only what fits/);
  assert.equal(git(['ls-remote', 'origin'], { cwd: root }), before, 'nothing pushed');
  assert.equal(git(['branch', '--list', 'job/alpha'], { cwd: root }), '', 'no local branch left');
  assert.equal(f.s.opened.length + f.s.comments.length, 0);
});

const prsBefore = () => [
  { number: 5, head: { ref: 'feature/a' }, updated_at: new Date().toISOString() },
  { number: 7, head: { ref: 'fix/mixed' }, draft: true, updated_at: new Date().toISOString() },
  { number: 8, head: { ref: 'job/beta' }, updated_at: new Date().toISOString() },
];
const files = (s, n) => ({ 5: ['src/alpha/x.mjs', 'test/alpha/x.test.mjs'], 7: ['src/alpha/x.mjs', 'src/beta/y.mjs'] }[n]);

test('carry: setup check lists the open PRs into the tranche no entry owns, each with its module or "no single module"', () => {
  const root = converting();
  const lines = [];
  const r = setupCheck(root, { slug: 'o/r', conditions: [], io: { api: () => null, openPRs: (s, base) => (base === 'tranche' ? prsBefore() : []), prFiles: files }, log: (l) => lines.push(l) });
  assert.equal(r.ok, true, 'informational: it stops no start');
  assert.deepEqual(r.carry.list.map((t) => [t.number, t.module]), [[5, 'alpha'], [7, 'no single module']], 'job/beta is owned by its entry');
  const t = lines.join('\n');
  assert.match(t, /to take in \(open pull requests into tranche no ledger entry owns\):\n- #5 feature\/a: module alpha; `node .process\/tool\/p3.mjs job start alpha --live <n> --take-in 5`, or leave it as a plain pull request\n- #7 fix\/mixed draft: no single module/);
});

test('carry: into main while no tranche exists yet', () => {
  const root = converting();
  git(['update-ref', '-d', 'refs/remotes/origin/tranche'], { cwd: root });
  git(['push', '-q', 'origin', ':tranche'], { cwd: root });
  const asked = [];
  const r = setupCheck(root, { slug: 'o/r', conditions: [], io: { api: () => null, openPRs: (s, base) => { asked.push(base); return prsBefore(); }, prFiles: files }, log: quiet });
  assert.deepEqual(asked, ['main']);
  assert.equal(r.carry.base, 'main');
  assert.deepEqual(r.carry.list.map((t) => t.number), [5, 7]);
});

test('carry: status --role bob lists each under "to take in" until a job takes it in, then no more', () => {
  const root = converting();
  const see = (prs) => { const lines = []; status(root, { role: 'bob', log: (l) => lines.push(l), io: { openPRs: () => prs, prFiles: files, checkRun: () => null } }); return lines.join('\n'); };
  const t0 = see(prsBefore());
  assert.match(t0, /to take in:\n- #5 feature\/a: module alpha; `node .process\/tool\/p3.mjs job start alpha --live <n> --take-in 5`, or leave it as a plain pull request, last activity 0h ago\n- #7 fix\/mixed draft: no single module/);
  const f = fakeGitHub(root, { 5: { number: 5, state: 'open', head: { ref: 'feature/a' } } });
  const r = jobStart(root, 'alpha', { coordinator: 's', takeIn: 'feature/a', setup: ready, open: f.open, find: f.find, gh: f.gh, log: quiet });
  const after = [...prsBefore(), { number: 20, head: { ref: 'job/alpha', sha: 'z' }, draft: true, body: r.start, updated_at: new Date().toISOString() }];
  const t1 = see(after);
  assert.doesNotMatch(t1, /#5 feature\/a: module alpha/, 'taken in: no longer to take in');
  assert.match(t1, /to take in:\n- #7 fix\/mixed/);
  assert.match(t1, /other pull requests:\n- #5 feature\/a/, 'left open, listed as other until BOB closes it');
  // Once the job's PR is gone (merged), its start row on its branch still names #5.
  assert.deepEqual(toTakeIn(root, { slug: 'o/r', ref: 'origin/tranche', prs: prsBefore(), files }).map((t) => t.number), [7]);
});

test('take-in is refused on a job already started on its branch, whatever the tranche reads (review of PR 55)', () => {
  const root = converting();
  const f = fakeGitHub(root, { 5: { number: 5, state: 'open', head: { ref: 'feature/a' } } });
  jobStart(root, 'alpha', { coordinator: 's', takeIn: 'feature/a', setup: ready, open: f.open, find: f.find, gh: f.gh, log: quiet });
  const before = git(['ls-remote', 'origin'], { cwd: root });
  assert.throws(() => jobStart(root, 'alpha', { coordinator: 's', takeIn: 'job/alpha', setup: ready, open: f.open, find: f.find, gh: f.gh, log: quiet }), /job\/alpha already holds a started job alpha \(WORKING\); .*--restart/);
  assert.equal(git(['ls-remote', 'origin'], { cwd: root }), before, 'nothing pushed');
  assert.equal(f.s.opened.length, 1, 'no second pull request');
});
