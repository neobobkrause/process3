// The first close (bootstrap; coordinator, 4 Nov): the tranche into a default branch that holds no
// Process3 (the copy's main at 0dea5a6e: no .process, no config, no process workflows).
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { isBootstrap, mergePlain } from '../lib/merge.mjs';
import { DEFAULTS, git } from '../lib/util.mjs';
import { commit, makeRepo, write } from './helpers.mjs';

const PIN = 'a'.repeat(40);
const SIDE = 'b'.repeat(40);
const SHIM = 'name: process-gate\non: pull_request\n';
const OWNER = DEFAULTS.approvals.owner;

// process3 as the tool's clone holds it: PIN released, SIDE not; the gate shim at any pin.
function processRepo(root) {
  const shim = git(['hash-object', '-w', '--stdin'], { cwd: root, input: SHIM });
  return { released: (p) => p === PIN, shim: (p, name) => (name === 'process-gate.yml' ? shim : null), descends: () => true };
}

// A product whose main has no Process3 and whose tranche gains it. `config`: the tranche's
// config; set at its own commit, `setAt`, which the lookup may call the owner's website commit.
// `pin`: the tranche's pin (null: none). `workflows`: files the tranche writes under .github/workflows.
// `mainFiles`: main's own files beyond the README and a product workflow.
function product({ config = { tranche: 'tranche' }, branch = 'tranche', pin = PIN, workflows = { 'process-gate.yml': SHIM }, mainFiles = {} } = {}) {
  const root = makeRepo({ 'README.md': 'x', '.github/workflows/regression.yml': 'on: push\n', ...mainFiles });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', branch], { cwd: root });
  const setAt = config === null ? null : commit(root, { 'process/config.json': config }, 'Process3 setup on the tranche');
  commit(root, { 'later.txt': 'the tranche moves on' });
  write(root, { 'job.txt': 'merged work', ...Object.fromEntries(Object.entries(workflows).map(([f, t]) => [`.github/workflows/${f}`, t])) });
  git(['add', '-A'], { cwd: root });
  if (pin) git(['update-index', '--add', '--cacheinfo', `160000,${pin},.process`], { cwd: root });
  git(['commit', '-q', '-m', 'the pin and the shims'], { cwd: root });
  const sha = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['push', '-q', 'origin', 'main', branch], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, sha, head: branch, setAt };
}

// GitHub's view of a commit: the owner's website commit only at `owned`.
const ghCommit = (owned) => (args) => (args[1].split('/').pop() === owned
  ? { author: { login: OWNER }, committer: { login: 'web-flow' }, commit: { verification: { verified: true } } }
  : { author: { login: 'civicsmith' }, committer: { login: 'civicsmith' }, commit: { verification: { verified: false } } });

const ok = (over = {}) => ({ status: 'completed', conclusion: 'success', started_at: '2026-11-04T06:00:00Z', ...over });
function io(r, { owned = r.setAt, rules = { checks: [{ context: 'gate' }] }, runs = { gate: [ok()] }, head = r.head } = {}) {
  const calls = { merged: null, asked: [] };
  const pr = () => ({ state: 'open', draft: false, mergeable: true, base: { ref: 'main', repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: head, sha: r.sha, repo: { full_name: 'o/r' } } });
  return {
    calls,
    io: {
      getPR: pr,
      requiredChecks: () => rules,
      checkRuns: (slug, sha, name) => runs[name] || [],
      repo: processRepo(r.root),
      lookup: (args) => { calls.asked.push(args[1].split('/').pop()); return ghCommit(owned)(args); },
      mergePR: (slug, n, sha, o) => { calls.merged = { sha, ...o }; return { merged: true, sha: 'm'.repeat(40) }; },
    },
  };
}
const q = { slug: 'o/r', noReview: 'a test', log: () => {} };
const close = (r, o) => { const f = io(r, o); return { f, go: () => mergePlain(r.root, 7, { ...q, io: f.io }) }; };

test('a bootstrap close passes with a config the owner set through GitHub\'s website', () => {
  // The config names another approvals file and its own process: each took its value at the owner's commit.
  const r = product({ config: { tranche: 'tranche', process_repo: 'https://github.com/neobobkrause/process3', approvals: { file: 'AGENTS.md' } } });
  assert.equal(isBootstrap(r.root, 'origin/main'), true);
  const logs = [];
  const f = io(r);
  const out = mergePlain(r.root, 7, { ...q, io: f.io, log: (m) => logs.push(m) });
  assert.equal(out.merged, true);
  assert.equal(f.calls.merged.sha, r.sha);
  assert.equal(f.calls.merged.title, 'Merge PR 7: tranche into main');
  assert.ok(f.calls.asked.includes(r.setAt), 'the owner\'s commit was asked about');
  assert.match(logs.join('\n'), /main has no Process3: the first close, of the tranche tranche its own config names/);
  // A config that keeps every anchored key at its default asks GitHub nothing.
  const d = product();
  const g = io(d, { owned: 'none' });
  assert.equal(mergePlain(d.root, 7, { ...q, io: g.io }).merged, true);
  assert.deepEqual(g.calls.asked, []);
});

test('a bootstrap close is refused with a forged config: tranche, approvals or process_repo not the owner\'s', () => {
  // A session names its own branch the tranche and opens it into main.
  const t = product({ config: { tranche: 'bob/evil' }, branch: 'bob/evil' });
  assert.throws(close(t, { owned: 'none' }).go, /changes tranche in process\/config\.json; that needs the owner's word/);
  // The same, set by the owner on the website, passes: the head is the tranche its config names.
  assert.equal(close(t).go().merged, true);
  // Another owner, or another approvals file, set by a session.
  for (const approvals of [{ owner: 'civicsmith' }, { file: 'AGENTS.md' }, { heading: '## Anything goes' }]) {
    const a = product({ config: { tranche: 'tranche', approvals } });
    const c = close(a, { owned: 'none' });
    assert.throws(c.go, /changes approvals in process\/config\.json; that needs the owner's word/, JSON.stringify(approvals));
    assert.equal(c.f.calls.merged, null);
    // web-flow, but the head's own named owner is not the one that counts: the tool's default is.
    const named = close(a, { owned: 'none' });
    named.f.io.lookup = () => ({ author: { login: approvals.owner || 'civicsmith' }, committer: { login: 'web-flow' }, commit: { verification: { verified: true } } });
    if (approvals.owner) assert.throws(named.go, /changes approvals/);
  }
  const p = product({ config: { tranche: 'tranche', process_repo: 'https://example.com/other' } });
  assert.throws(close(p, { owned: 'none' }).go, /changes process_repo in process\/config\.json/);
  // GitHub cannot be read: refused.
  const u = close(product({ config: { tranche: 'tranche', approvals: { owner: 'civicsmith' } } }));
  u.f.io.lookup = () => null;
  assert.throws(u.go, /changes approvals/);
  // An unreadable config, or none: refused.
  assert.throws(close(product({ config: '{ "tranche": ' })).go, /the head's process\/config\.json cannot be read/);
  assert.throws(close(product({ config: null })).go, /main has no Process3, and the head has no process\/config\.json/);
});

test('a bootstrap close is refused from a head that is not the tranche its config names', () => {
  // The config says "tranche"; the pull request comes from another branch carrying it.
  const r = product({ branch: 'bob/plan' });
  assert.throws(close(r).go, /only the tranche tranche merges into main, not bob\/plan/);
  // The config names bob/plan (the owner's word), but the pull request is from "tranche".
  const s = product({ config: { tranche: 'bob/plan' } });
  assert.throws(close(s).go, /only the tranche bob\/plan merges into main, not tranche/);
});

test('a bootstrap close is refused with an unreleased pin, or none', () => {
  assert.throws(close(product({ pin: SIDE })).go, /the process pin bbbbbbbbbb is not a commit on process3's tranche or main/);
  assert.throws(close(product({ pin: null })).go, /main has no Process3, and the head has no process pin/);
});

test('a bootstrap close is refused with a workflow change that is not the pin\'s own shim', () => {
  // The copy, 4 Nov: container-images.yml and regression.yml changed on the tranche by sessions.
  const r = product({ workflows: { 'process-gate.yml': SHIM, 'regression.yml': 'on: push\njobs: {}\n' } });
  assert.throws(close(r).go, /regression\.yml is not the process's own shim at aaaaaaaaaa.*owner's word/);
  const s = product({ workflows: { 'process-gate.yml': SHIM + '# edited\n' } });
  assert.throws(close(s).go, /process-gate\.yml is not the process's own shim/);
});

test('a bootstrap close needs the gate required by main and green on the head', () => {
  const r = product();
  assert.throws(close(r, { rules: { checks: [{ context: 'ci' }] }, runs: { ci: [ok()] } }).go, /main has no Process3, so its first close needs the gate.*its required checks: ci success/);
  const red = close(r, { runs: { gate: [ok({ conclusion: 'failure' })] } });
  assert.throws(red.go, /needs the gate.*gate failure/);
  assert.equal(red.f.calls.merged, null);
  assert.throws(close(r, { rules: { checks: [] } }).go, /main requires no checks/);
});

test('a base with Process3 is not a bootstrap: a normal close is unchanged', () => {
  // Main holds a config: its tranche's name and owner are main's, and GitHub's ruleset judges the checks.
  const r = product({ config: { tranche: 'tranche', node: '22' }, mainFiles: { 'process/config.json': { tranche: 'tranche' } } });
  assert.equal(isBootstrap(r.root, 'origin/main'), false);
  assert.equal(close(r, { rules: { checks: [{ context: 'ci' }] }, runs: { ci: [ok({ conclusion: 'failure' })] } }).go().merged, true, 'the ruleset, not the tool, judges a normal close\'s checks');
  // A head with no pin, into a main with a config and no pin: as before, no pin is no change.
  assert.equal(close(product({ config: { tranche: 'tranche', node: '22' }, pin: null, workflows: {}, mainFiles: { 'process/config.json': { tranche: 'tranche' } } })).go().merged, true);
  // A normal close anchors the approvals too (review of PR 96): main's owner's website commit, or refused.
  const a = product({ config: { tranche: 'tranche', approvals: { file: 'AGENTS.md' } }, mainFiles: { 'process/config.json': { tranche: 'tranche' } } });
  assert.throws(close(a, { owned: 'none' }).go, /changes approvals in process\/config\.json/);
  assert.equal(close(a).go().merged, true);
});

test('a main that had a config and deleted it is a normal close by its last config, not a bootstrap', () => {
  // Main's last config names bob/plan the tranche; a later commit deleted the config.
  const r = product({ mainFiles: { 'process/config.json': { tranche: 'bob/plan' } } });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  git(['rm', '-q', 'process/config.json'], { cwd: r.root });
  git(['commit', '-q', '-m', 'drop the config'], { cwd: r.root });
  git(['push', '-q', 'origin', 'main'], { cwd: r.root });
  assert.equal(isBootstrap(r.root, 'origin/main'), false);
  assert.throws(close(r).go, /only the tranche bob\/plan merges into main, not tranche/);
});

test('a bootstrap retry stops when the base gained Process3 while the merge waited', () => {
  const r = product();
  const f = io(r);
  let tries = 0;
  f.io.mergePR = () => {
    tries++;
    // Someone else's close lands first: main now holds a config.
    git(['checkout', '-q', 'main'], { cwd: r.root });
    commit(r.root, { 'process/config.json': { tranche: 'tranche' } }, 'Process3 lands on main');
    git(['push', '-q', 'origin', 'main'], { cwd: r.root });
    return { merged: false, message: 'Base branch was modified. Review and try the merge again.' };
  };
  assert.throws(() => mergePlain(r.root, 7, { ...q, io: f.io, wait: 0 }), /main gained Process3 while pull request 7 was checked as its first close/);
  assert.equal(tries, 1);
});
