// Copy, 4 Nov: merge left its scratch tree (about 690 MB) on every run; 110 of them filled BOB's
// disk. Every scratch directory in tool/lib comes from withTemp, removed on every way out, with
// any worktree under it removed and pruned; a killed run's leftovers go at the next withTemp.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { once } from 'node:events';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { merge } from '../lib/merge.mjs';
import { writeState } from '../lib/state.mjs';
import { TEMP_OWNER, TEMP_STALE_HOURS, git, sweepTemp, withTemp } from '../lib/util.mjs';
import { commit, entry, honestBranch, makeRepo } from './helpers.mjs';

const LIB = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib');

// Each case with a TMPDIR of its own, so what is left in it is the case's alone.
function scratch(fn) {
  const was = process.env.TMPDIR;
  const t = mkdtempSync(join(tmpdir(), 'p3-tmpdir-'));
  process.env.TMPDIR = t;
  try { return fn(t); } finally { if (was === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = was; }
}
const left = (t, prefix) => readdirSync(t).filter((n) => n.startsWith(prefix));
// The test's own repositories also live in TMPDIR.
const scratchOnly = (t) => readdirSync(t).filter((n) => !/^p3-(test|origin)-/.test(n)).sort();
const worktrees = (root) => {
  const d = join(root, '.git', 'worktrees');
  return { listed: git(['worktree', 'list', '--porcelain'], { cwd: root }).split('\n').filter((l) => l.startsWith('worktree ')).length, entries: existsSync(d) ? readdirSync(d) : [] };
};

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
const io = (head, mergePR) => ({
  getPR: () => ({ state: 'open', draft: false, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: 'job/alpha', sha: head } }),
  comments: () => [
    { id: 1, body: block(RECEIPT, { module: 'alpha', attempt: 1, sha: head }), user: { login: 'civicsmith' } },
    { id: 2, body: block(GATE, { runs: [{ sha: head, ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }] }), user: { login: BOT } },
  ],
  checkRun: () => ({ status: 'completed', conclusion: 'success', html_url: 'run' }),
  verify: (slug, r) => r.run_id === 11,
  gateBound: () => null, // the merged result's gate is the process gate's run (merge.mjs gateRunWhy)
  ...honestBranch([3]),
  mergePR,
});
const opts = (head, mergePR) => ({ slug: 'o/r', io: io(head, mergePR), reviewed: 'fresh worker', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: () => {}, wait: 0 });

for (const [name, mergePR, expect] of [
  ['succeeds', () => ({ merged: true, sha: 'm'.repeat(40) }), null],
  ['is refused', () => ({ merged: false, message: 'not mergeable' }), /GitHub did not merge/],
  ['throws mid-way', () => { throw new Error('boom mid-merge'); }, /boom mid-merge/],
]) {
  test(`a merge that ${name} leaves no p3-merge-* directory and no worktree entry`, () => scratch((t) => {
    const { root, head } = setup();
    const go = () => merge(root, 3, opts(head, mergePR));
    if (expect) assert.throws(go, expect); else assert.equal(go().merged, true);
    assert.deepEqual(left(t, 'p3-merge-'), []);
    assert.deepEqual(worktrees(root), { listed: 1, entries: [] });
  }));
}

test('a state write, done or failed inside its change, leaves no p3-state-* directory and no worktree entry', () => scratch((t) => {
  const root = makeRepo({ 'README.md': 'x' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  writeState(root, 'process-state', 'a row', (wt) => writeFileSync(join(wt, 'a.txt'), 'a'));
  assert.throws(() => writeState(root, 'process-state', 'no row', () => { throw new Error('change failed'); }), /change failed/);
  assert.deepEqual(left(t, 'p3-state-'), []);
  assert.deepEqual(worktrees(root), { listed: 1, entries: [] });
}));

test('withTemp removes its directory on return and on throw, worktree and its entry with it', () => scratch((t) => {
  const root = makeRepo({ 'README.md': 'x' });
  let seen;
  assert.throws(() => withTemp('p3-layer-', (d) => {
    seen = d;
    git(['worktree', 'add', '-q', '--detach', join(d, 'w'), 'HEAD'], { cwd: root });
    throw new Error('mid-way');
  }, { root }), /mid-way/);
  assert.equal(existsSync(seen), false);
  assert.deepEqual(worktrees(root), { listed: 1, entries: [] });
  assert.equal(withTemp('p3-row-', (d) => (writeFileSync(join(d, 'f'), 'x'), 7)), 7);
  assert.deepEqual(scratchOnly(t), []);
  assert.throws(() => withTemp('p3-other-', () => {}), /not a scratch prefix/);
}));

test('the next withTemp removes a killed run\'s leftovers: a gone owner, or an older tool\'s over the stale age; a live one stays', () => scratch((t) => {
  const root = makeRepo({ 'README.md': 'x' });
  const mk = (n, owner, hoursOld = 0) => {
    const d = join(t, n);
    mkdirSync(d);
    if (owner !== null) writeFileSync(join(d, TEMP_OWNER), String(owner));
    if (hoursOld) { const at = (Date.now() - hoursOld * 3600000) / 1000; utimesSync(d, at, at); }
    return d;
  };
  const dead = mk('p3-merge-dead', 2 ** 22 + 12345); // over Linux's pid_max default: no such process
  git(['worktree', 'add', '-q', '--detach', join(dead, 'job'), 'HEAD'], { cwd: root });
  mk('p3-merge-old', null, TEMP_STALE_HOURS + 1);
  mk('p3-state-new', null);
  mk('p3-state-live', process.pid);
  mk('p3-deploy-x-keep', null, 100); // a step-log directory: evidence, never swept
  withTemp('p3-row-', () => {}, { root });
  assert.deepEqual(scratchOnly(t), ['p3-deploy-x-keep', 'p3-state-live', 'p3-state-new']);
  assert.deepEqual(worktrees(root), { listed: 1, entries: [] }, 'the killed run\'s worktree entry is pruned');
  assert.deepEqual(sweepTemp(root), []);
}));

test('every mkdtempSync in tool/lib is withTemp\'s, but the deploy and release step logs, kept as evidence', () => {
  const sites = [];
  for (const f of readdirSync(LIB).filter((n) => n.endsWith('.mjs'))) {
    readFileSync(join(LIB, f), 'utf8').split('\n').forEach((l, i) => { if (/mkdtempSync\(/.test(l)) sites.push(`${f}: ${l.trim()}`); });
  }
  const allowed = [/^util\.mjs: const dir = mkdtempSync\(join\(tmpdir\(\), prefix\)\);$/, /^deploy\.mjs: .*p3-deploy-/, /^release\.mjs: .*p3-release-/];
  assert.deepEqual(sites.filter((s) => !allowed.some((r) => r.test(s))), []);
  assert.equal(sites.length, 4, 'the deploy\'s, the internal walk\'s, the release\'s and withTemp\'s');
});

test('a scratch directory under a symlinked TMPDIR has its worktree removed by git, not only pruned', () => {
  const real = mkdtempSync(join(tmpdir(), 'p3-real-'));
  const link = join(mkdtempSync(join(tmpdir(), 'p3-link-')), 'tmp');
  symlinkSync(real, link);
  const root = makeRepo({ 'README.md': 'x' });
  const was = process.env.TMPDIR;
  process.env.TMPDIR = link;
  const said = [];
  try {
    withTemp('p3-layer-', (d) => {
      git(['worktree', 'add', '-q', '--detach', join(d, 'w'), 'HEAD'], { cwd: root });
      // Locked: prune alone would keep its entry; only git worktree remove --force --force clears it.
      git(['worktree', 'lock', join(d, 'w')], { cwd: root });
      said.push(worktrees(root).listed);
    }, { root });
  } finally { if (was === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = was; }
  assert.deepEqual(said, [2]);
  assert.deepEqual(readdirSync(real), []);
  assert.deepEqual(worktrees(root), { listed: 1, entries: [] });
});

test('a scratch directory owned by another live process is kept; once it exits, the next withTemp removes it', async () => {
  const t = mkdtempSync(join(tmpdir(), 'p3-tmpdir-'));
  const was = process.env.TMPDIR;
  const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore' });
  try {
    process.env.TMPDIR = t;
    const d = join(t, 'p3-merge-other');
    mkdirSync(d);
    writeFileSync(join(d, TEMP_OWNER), String(child.pid));
    withTemp('p3-row-', () => {});
    assert.equal(existsSync(d), true, 'a live owner keeps it');
    const gone = once(child, 'exit');
    child.kill('SIGKILL');
    await gone;
    withTemp('p3-row-', () => {});
    assert.equal(existsSync(d), false, 'a gone owner\'s directory is swept');
  } finally { child.kill('SIGKILL'); if (was === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = was; }
});

test('process.exit inside withTemp, and nested withTemp, leave nothing behind', () => scratch((t) => {
  const util = new URL('../lib/util.mjs', import.meta.url).href;
  const root = makeRepo({ 'README.md': 'x' });
  const code = `import { git, withTemp } from ${JSON.stringify(util)};
    withTemp('p3-merge-', (a) => withTemp('p3-state-', (b) => {
      git(['worktree', 'add', '-q', '--detach', b + '/s', 'HEAD'], { cwd: ${JSON.stringify(root)} });
      process.exit(3);
    }, { root: ${JSON.stringify(root)} }), { root: ${JSON.stringify(root)} });`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, TMPDIR: t }, encoding: 'utf8' });
  assert.equal(r.status, 3, r.stderr);
  assert.deepEqual(scratchOnly(t), []);
  assert.deepEqual(worktrees(root), { listed: 1, entries: [] });
  assert.equal(withTemp('p3-merge-', () => withTemp('p3-state-', () => scratchOnly(t).length)), 2, 'nested: the outer is not swept by the inner');
  assert.deepEqual(scratchOnly(t), []);
}));
