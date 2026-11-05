// Four measured defects from the copy, 5 Nov: starts lost to a moving tranche, a bare `merge train`
// that took the lease, `found --write` on a module whose test pins its ids, and the flow section's
// count of jobs started then blocked within 15 minutes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commit, entry, makeRepo, setJobCap } from './helpers.mjs';
import { batchSetup, startReady } from '../lib/ready.mjs';
import { found } from '../lib/found.mjs';
import { startCheck } from '../lib/start.mjs';
import { flowFigures, quickBlocks } from '../lib/metrics.mjs';
import { LEASE_FILE, train } from '../lib/train.mjs';
import { fetchState, readState } from '../lib/state.mjs';
import { Fail, fail, git, loadConfig } from '../lib/util.mjs';

const quiet = () => {};
const APPROVALS = '# P\n\n## Standing approvals from Bob\n\nSessions may push.\n';

// BOB's checkout at the tranche tip, an origin, and a second clone that moves the tranche.
function product(ids) {
  const root = makeRepo({ 'CLAUDE.md': APPROVALS, ...Object.fromEntries(ids.flatMap((id) => [[`process/ledger/${id}.json`, entry(id, { requirements: `r/${id}.md` })], [`r/${id}.md`, '- **R1** *(not yet met: x)* a\n']])) });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', '--detach', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const other = join(mkdtempSync(join(tmpdir(), 'p3-clone-')), 'c');
  git(['clone', '-q', '-b', 'tranche', bare, other], { cwd: tmpdir() });
  for (const [k, v] of [['user.email', 'o@example.com'], ['user.name', 'O'], ['commit.gpgsign', 'false']]) git(['config', k, v], { cwd: other });
  const move = (files) => { commit(other, files, 'a merge into the tranche'); git(['push', '-q', 'origin', 'tranche'], { cwd: other }); };
  return { root, move };
}

// A start as jobStart begins one: the setup it is given, refused as setupOrStop refuses.
const starter = (calls, between) => (r, id, o) => {
  const s = o.setup(r, {});
  if (!s.ok) fail(`the setup is not complete (${s.missing.join(', ')})`);
  calls.push(id);
  between(id);
  return { launch: { title: `job ${id}` } };
};
const base = () => ({ ok: true, missing: [], results: [{ id: 'session-branch', state: 'set' }] });

test('job start --ready: the tranche moving between starts voids none; a module whose own facts moved, or changed approvals, are refused', (t) => {
  setJobCap(t, 10);
  const { root, move } = product(['a', 'b', 'c', 'd']);
  const next = ['a', 'b', 'c', 'd'].map((id) => ({ file: `r/${id}.md`, count: 1, module: id, entry_state: 'OPEN' }));
  let checks = 0;
  const setup = batchSetup(root, loadConfig(root), { setup: () => { checks += 1; return base(); } });
  const calls = [];
  // After a: an unrelated merge; after b: one that changes c's requirement file; after c... c is not started.
  const between = (id) => (id === 'a' ? move({ 'src/x.txt': 'other work' }) : id === 'b' ? move({ 'r/c.md': '- **R1** *(not yet met: x)* a\n- **R2** *(not yet met: y)* b\n' }) : null);
  const out = [];
  const r = startReady(root, { live: 0, remote: new Set(), read: () => ({ next }), start: starter(calls, between), setup, log: (l) => out.push(l) });
  assert.deepEqual(calls, ['a', 'b', 'd'], 'the moved tranche voided no start; c, whose own file changed, waits');
  assert.equal(checks, 1, 'the setup check runs once for the batch');
  assert.equal(startCheck(root, { branch: 'tranche', log: quiet }).sameHead, false, 'the per-start session-branch check (before this fix) would have refused b and d');
  assert.deepEqual(r.failed.map((f) => f.id), ['c']);
  assert.match(out.join('\n'), /not started: c: its entry or requirement file changed on the tranche since this run read it; run job start --ready again/);
  // Changed approvals stop the next start.
  move({ 'CLAUDE.md': APPROVALS.replace('may push', 'may push anywhere') });
  const s = setup(root, {});
  assert.equal(s.ok, false);
  assert.deepEqual(s.missing, ['session-branch']);
  assert.match(s.results[0].detail, /the approvals changed/);
  // A checkout off the tranche is still refused.
  commit(root, { 'mine.txt': 'a commit of its own' });
  move({ 'CLAUDE.md': APPROVALS });
  assert.equal(batchSetup(root, loadConfig(root), { setup: base })(root, {}).ok, false);
});

test('merge train: run bare it prints its usage and takes no lease, whatever the container\'s session id', (t) => {
  const root = makeRepo({ 'README.md': 'x' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  const was = process.env.CLAUDE_CODE_REMOTE_SESSION_ID;
  process.env.CLAUDE_CODE_REMOTE_SESSION_ID = 'cse_bob1';
  t.after(() => { if (was === undefined) delete process.env.CLAUDE_CODE_REMOTE_SESSION_ID; else process.env.CLAUDE_CODE_REMOTE_SESSION_ID = was; });
  assert.throws(() => train(root, { slug: 'o/r', log: quiet }), (e) => e instanceof Fail && /^usage: merge train --session <id>/.test(e.message) && /nothing was started/.test(e.message));
  const sb = loadConfig(root).state_branch;
  assert.equal(fetchState(root, sb) ? readState(root, sb, LEASE_FILE) : null, null, 'no lease written');
});

test('found: a module whose test pins its requirement ids is refused with the reopen route; one whose tests only name ids in titles is not', () => {
  const req = 'build/requirements/m.md';
  const ids = '- **R1** a\n- **R2** b\n- **R3** c\n- **R4** *(not yet met: x)* d\n';
  const pin = `const IDS = ["R1", "R2", "R3", "R4"]; // read from ${req}\n`;
  const titles = `// ${req}\ntest("R1 R2 R3 the three", () => {});\ntest("R4: d", () => {});\n`;
  const root = makeRepo({
    [req]: ids, 'build/requirements/n.md': ids.replace(/m\.md/g, 'n.md'),
    'process/ledger/m.json': entry('m', { requirements: req, tests: ['test/m/'] }),
    'process/ledger/n.json': entry('n', { requirements: 'build/requirements/n.md', tests: ['test/n/'] }),
    'test/m/requirements-ids.test.mjs': pin, 'test/n/n.test.mjs': titles.replace(req, 'build/requirements/n.md'),
  });
  assert.throws(() => found(root, 'm', 'the walk found x', { write: true, offline: true, log: quiet }),
    /test\/m\/requirements-ids\.test\.mjs pins the ids of build\/requirements\/m\.md.*nothing was written\. The route: `node \.process\/tool\/p3\.mjs job start m --reopen "the walk found x"`, the job adding its own F mark and admitting it in that test/);
  assert.equal(readFileSync(join(root, req), 'utf8'), ids, 'nothing written');
  assert.equal(found(root, 'n', 'the walk found y', { write: true, offline: true, log: quiet }).mark, 'F1');
});

test('flow: started then blocked within 15 min, its count and share by module, from the job branches', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const at = (m) => new Date(Date.parse('2026-11-05T10:00:00Z') + m * 60000).toISOString();
  const c = (msg, m) => { git(['commit', '-q', '--allow-empty', '-m', msg], { cwd: root, env: { ...process.env, GIT_COMMITTER_DATE: at(m), GIT_AUTHOR_DATE: at(m) } }); };
  git(['checkout', '-q', '-b', 'job/a'], { cwd: root });
  c('job start a (attempt 1)', 0); c('block a: its provider p is not merged', 6); c('job start a (attempt 2)', 60); c('block a: still waiting', 90);
  git(['checkout', '-q', '-b', 'job/b', 'main'], { cwd: root });
  c('job start b (attempt 1)', 0); c('work', 5); c('block b: a question', 20);
  const refs = new Map([['a', 'job/a'], ['b', 'job/b'], ['z', null]]);
  refs.branches = (m) => (m === 'z' ? [] : [`refs/heads/job/${m}`]);
  const q = quickBlocks(root, refs, { from: at(-1), to: at(120) });
  assert.deepEqual(q, { minutes: 15, starts: 3, blocked: 1, share: 0.33, by_module: [{ module: 'a', starts: 2, blocked: 1 }] });
  assert.equal(quickBlocks(root, refs, { from: at(30), to: at(120) }).blocked, 0, 'only starts in the window');
  assert.equal(quickBlocks(root, undefined, {}), null);
  assert.deepEqual(flowFigures({ quick: q, from: at(0), to: at(1) }).started_then_blocked, q);
  assert.equal(flowFigures({ from: at(0), to: at(1) }).started_then_blocked, 'unmeasured');
});

test('job start --ready: the live count is read fresh at the pass\'s start; a stale --sessions file is refused, and sessions archived since count as archived', (t) => {
  setJobCap(t, 12);
  const root = makeRepo({ 'README.md': 'x' });
  const file = join(mkdtempSync(join(tmpdir(), 'p3-sessions-')), 's.json');
  // 12 job sessions live as listed; BOB archived three of them since (copy, 5 Nov 03:40: 12 counted, 9 live).
  writeFileSync(file, JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ id: `session_j${i}`, title: `job m${i}`, session_status: 'idle' }))));
  const next = ['a', 'b', 'c', 'd'].map((id) => ({ file: `r/${id}.md`, count: 1, module: id, entry_state: 'OPEN' }));
  const calls = [];
  const go = (o) => startReady(root, { sessions: file, remote: new Set(), read: () => ({ next, rows: [] }), start: (_, id) => { calls.push(id); return {}; }, log: quiet, setup: base, fetch: () => {}, ...o });
  assert.equal(go({}).started.length, 0, 'the file\'s 12 fill the cap of 12');
  assert.deepEqual(go({ archived: ['session_j0', 'session_j1', 'session_j2'] }).started.map((x) => x.id), ['a', 'b', 'c'], 'counted 9: three slots');
  const old = (Date.now() - 11 * 60000) / 1000;
  utimesSync(file, old, old);
  assert.throws(() => go({}), /saved over 10 min ago: save list_sessions again now/);
});
