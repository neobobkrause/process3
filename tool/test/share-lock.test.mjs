// C53 (coordinator, 9 Nov): C52's detached share of a connector write's rows ran git in the clone
// while a p3 command there fetched; in a shallow clone two git processes collide on its shallow file
// ("shallow file has changed since we read it"; CI met it on git 2.56). Each p3 command marks
// itself a foreground command of its clone; the detached share runs no git while one is live or
// when it cannot tell, defers, and the next p3 command's end share carries the rows. A command
// never waits on the share.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { hookShareLater, NO_AUTO_GC } from '../lib/ghhook.mjs';
import { USE_DIR } from '../lib/ghshare.mjs';
import { commonDir, useShared } from '../lib/pace.mjs';
import { FOREGROUND_DIR, SHARE_DEFERRED, foregroundIn, git, markForeground } from '../lib/util.mjs';
import { main, shareAtEnd } from '../p3.mjs';
import { makeRepo } from './helpers.mjs';

const TOOL = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = join(TOOL, 'hook.mjs');
const P3 = join(TOOL, 'p3.mjs');
const fgDir = (root) => join(commonDir(root), FOREGROUND_DIR);
const marks = (root) => (existsSync(fgDir(root)) ? readdirSync(fgDir(root)) : []);

test('foregroundIn: none, a live mark, a stale one removed, and unknown whenever it cannot tell', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  assert.equal(foregroundIn(root), 'none');
  // This process, marked: present; unmarked: none.
  const unmark = markForeground(root);
  assert.equal(foregroundIn(root), 'present');
  unmark();
  assert.equal(foregroundIn(root), 'none');
  assert.deepEqual(marks(root), []);
  // A killed command's mark (its process gone on this host): stale, removed, not counted.
  markForeground(root, { pid: 999999 });
  assert.equal(foregroundIn(root, { alive: () => false }), 'none');
  assert.deepEqual(marks(root), []);
  // Its life unknown, or another host's: unknown (fail closed).
  const u1 = markForeground(root, { pid: 4242 });
  assert.equal(foregroundIn(root, { alive: () => null }), 'unknown');
  u1();
  const u2 = markForeground(root, { host: 'elsewhere' });
  assert.equal(foregroundIn(root), 'unknown');
  u2();
  // Half written (a command starting now): unknown; left over long since: removed.
  mkdirSync(fgDir(root), { recursive: true });
  const half = join(fgDir(root), 'half.json');
  writeFileSync(half, '{"pid":');
  assert.equal(foregroundIn(root), 'unknown');
  utimesSync(half, new Date(Date.now() - 3600e3), new Date(Date.now() - 3600e3));
  assert.equal(foregroundIn(root), 'none');
  assert.equal(existsSync(half), false);
  // The marks directory unreadable (a file in its place): unknown.
  writeFileSync(join(commonDir(root), FOREGROUND_DIR + '-x'), '');
  const blocked = makeRepo({ 'README.md': 'x\n' });
  writeFileSync(fgDir(blocked), 'not a directory');
  assert.equal(foregroundIn(blocked), 'unknown');
});

test('the detached share defers while a foreground command runs or cannot be told: no git, no retry, the rows left for the next command', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  for (const fg of ['present', 'unknown']) {
    const calls = [];
    const again = [];
    const ok = hookShareLater(root, { sleep: () => {}, share: () => ({ shareContent: () => calls.push(1) }), again: () => again.push(1), foreground: () => fg, mark: undefined });
    assert.equal(ok, false);
    assert.deepEqual([calls.length, again.length], [0, 0], `${fg}: no share, nothing started again`);
    assert.match(readFileSync(join(commonDir(root), SHARE_DEFERRED), 'utf8'), new RegExp(` ${fg}\\n$`));
    assert.equal(existsSync(join(commonDir(root), 'p3-gh-share.err')), false, 'a deferral is no failure');
  }
  // A reader that throws is unknown too.
  const calls = [];
  hookShareLater(root, { sleep: () => {}, share: () => ({ shareContent: () => calls.push(1) }), again: () => {}, foreground: () => { throw new Error('unreadable'); } });
  assert.equal(calls.length, 0);
});

test('with no foreground command the detached share runs, its git with no automatic gc or maintenance', (t) => {
  const root = makeRepo({ 'README.md': 'x\n' });
  const was = Object.fromEntries(Object.keys(NO_AUTO_GC).map((k) => [k, process.env[k]]));
  t.after(() => { for (const [k, v] of Object.entries(was)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } });
  let env = null;
  const ok = hookShareLater(root, { sleep: () => {}, share: () => ({ shareContent: () => { env = { ...process.env }; } }), again: () => {}, foreground: () => 'none' });
  assert.equal(ok, true);
  for (const [k, v] of Object.entries(NO_AUTO_GC)) assert.equal(env?.[k], v);
  // What git reads from it.
  const r = spawnSync('git', ['config', '--get', 'gc.auto'], { cwd: root, env: { ...process.env, ...NO_AUTO_GC }, encoding: 'utf8' });
  assert.equal(r.stdout.trim(), '0');
});

test('a command\'s end share carries the rows a deferred share left, and removes the mark once none is unshared', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  const f = join(commonDir(root), SHARE_DEFERRED);
  const ledger = (content) => { const asked = []; return { asked, shareNow: (o) => asked.push(o), unshared: () => ({ rows: content, pushes: 0, content }) }; };
  // No deferral: the end share as before, content not forced.
  let l = ledger(0);
  shareAtEnd(l, 0, { root });
  assert.deepEqual(l.asked, [{ pending: 0 }]);
  // Deferred: content forced; the mark kept while content stays unshared, removed when none does.
  writeFileSync(f, 'x present\n');
  l = ledger(1);
  shareAtEnd(l, 2, { root });
  assert.deepEqual(l.asked, [{ pending: 2, content: true }]);
  assert.equal(existsSync(f), true);
  l = ledger(0);
  shareAtEnd(l, 0, { root });
  assert.deepEqual(l.asked, [{ pending: 0, content: true }]);
  assert.equal(existsSync(f), false);
});

test('a p3 command marks itself for its run and leaves no mark behind', async (t) => {
  const root = makeRepo({ 'README.md': 'x\n' });
  const cwd = process.cwd();
  process.chdir(root);
  t.after(() => process.chdir(cwd));
  const log = console.log;
  console.log = () => {};
  try { await main(['size']); } finally { console.log = log; }
  assert.deepEqual(marks(root), []);
  assert.equal(foregroundIn(root), 'none');
});

// PD-17: rehearsed with the real processes in a --depth 1 clone, as a session runs them. A foreground
// command fetches the clone's history --depth=1 again and again (the shallow file rewritten each
// time) while the hook's real detached share (tool/hook.mjs --share) comes due. The share defers and
// runs no git; the foreground never fails; the next real p3 command carries the rows to the ledger.
test('rehearsal: the detached share and a foreground command in one shallow clone at the same time', (t) => {
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', '-b', 'main', bare], { cwd: tmpdir() });
  const seed = makeRepo({ 'README.md': 'x\n' });
  for (let k = 0; k < 20; k++) { writeFileSync(join(seed, 'f.txt'), `${k}\n`); git(['add', 'f.txt'], { cwd: seed }); git(['commit', '-qm', `c${k}`], { cwd: seed }); }
  git(['push', '-q', bare, 'main'], { cwd: seed });
  const root = join(mkdtempSync(join(tmpdir(), 'p3-shallow-')), 'clone');
  git(['clone', '-q', '--depth', '1', `file://${bare}`, root], { cwd: tmpdir() });
  for (const [k, v] of [['user.email', 'noreply@github.com'], ['user.name', 'Session'], ['commit.gpgsign', 'false']]) git(['config', k, v], { cwd: root });
  assert.equal(git(['rev-parse', '--is-shallow-repository'], { cwd: root }), 'true');
  const env = { ...process.env, CLAUDE_CODE_SESSION_ID: 'cse_c53', HOME: mkdtempSync(join(tmpdir(), 'p3-home-')), P3_HOOK_SHARE_S: '1', PATH: `${mkdtempSync(join(tmpdir(), 'p3-bin-'))}:${process.env.PATH}` };
  for (const k of ['NODE_TEST_CONTEXT', 'GITHUB_ACTIONS', 'P3_GITHUB_LOG']) delete env[k];
  writeFileSync(join(env.PATH.split(':')[0], 'gh'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  t.after(() => useShared(null));
  // A connector write the hook logged and no share carried.
  writeFileSync(join(commonDir(root), 'p3-github.jsonl'), JSON.stringify({ at: new Date().toISOString(), kind: 'gh', session: 'cse_c53', what: 'mcp__github__create_pull_request', points: 5, content: 1, connector: true, repo: 'o/p' }) + '\n');
  const content = () => (git(['show', `process-state:${USE_DIR}/cse_c53.jsonl`], { cwd: bare, allowFail: true }).stdout || '').split('\n').filter(Boolean).reduce((n, l) => n + Object.values(JSON.parse(l).content_by || {}).reduce((a, b) => a + b, 0), 0);
  // The foreground command: marked as p3 marks itself, fetching --depth=1 until told to stop.
  const stop = join(commonDir(root), 'c53-stop');
  const fgScript = `
    import { markForeground, git } from ${JSON.stringify(join(TOOL, 'lib', 'util.mjs'))};
    import { existsSync, writeFileSync } from 'node:fs';
    const unmark = markForeground(process.cwd());
    writeFileSync(process.argv[1] + '.ready', '');
    let n = 0; const bad = [];
    while (!existsSync(process.argv[1])) {
      const r = git(['fetch', '-q', '--depth=1', 'origin', '+refs/heads/main:refs/remotes/origin/main'], { cwd: process.cwd(), allowFail: true });
      n++; if (r.code !== 0) bad.push(r.stderr.trim());
    }
    unmark();
    writeFileSync(process.argv[1] + '.out', JSON.stringify({ n, bad }));`;
  // Its result in a file: this test waits synchronously, so no stream of the child is read meanwhile.
  const fg = spawn(process.execPath, ['--input-type=module', '-e', fgScript, stop], { cwd: root, env, stdio: 'ignore' });
  const until = Date.now() + 30e3;
  while (!existsSync(`${stop}.ready`) && Date.now() < until) spawnSync('sleep', ['0.1']);
  assert.ok(existsSync(`${stop}.ready`), 'the foreground command started');
  // The detached share comes due while it runs: it defers, and runs no git (its trace is empty).
  const trace = join(commonDir(root), 'c53-share-trace');
  const sh = spawnSync(process.execPath, [HOOK, '--share'], { cwd: root, env: { ...env, GIT_TRACE: trace }, encoding: 'utf8', timeout: 60e3 });
  assert.equal(sh.status, 0, sh.stderr);
  assert.match(readFileSync(join(commonDir(root), SHARE_DEFERRED), 'utf8'), / present\n$/);
  const gitRuns = existsSync(trace) ? readFileSync(trace, 'utf8').split('\n').filter((l) => /trace: (built-in|exec|run_command): git /.test(l) && !/rev-parse --(show-toplevel|git-common-dir)/.test(l)) : [];
  assert.match(readFileSync(trace, 'utf8'), /rev-parse --show-toplevel/, 'traced: its root lookup is there');
  assert.deepEqual(gitRuns, [], 'the deferred share ran no git but its root lookups');
  assert.equal(content(), 0, 'not shared while the foreground command runs');
  // The foreground command ends: every fetch it made succeeded.
  writeFileSync(stop, '');
  const t0 = Date.now();
  while (!existsSync(`${stop}.out`) && Date.now() - t0 < 30e3) spawnSync('sleep', ['0.1']);
  const res = JSON.parse(readFileSync(`${stop}.out`, 'utf8'));
  void fg;
  assert.ok(res.n > 0);
  assert.deepEqual(res.bad, [], 'no foreground fetch refused');
  // The next p3 command (a real one) carries the rows at its end and clears the deferral.
  const next = spawnSync(process.execPath, [P3, 'github', 'budget'], { cwd: root, env, encoding: 'utf8', timeout: 120e3 });
  assert.doesNotMatch(next.stderr, /not shared/, next.stderr);
  assert.equal(content(), 1, 'the deferred row reached the ledger');
  assert.equal(existsSync(join(commonDir(root), SHARE_DEFERRED)), false);
  assert.deepEqual(marks(root), []);
  // With no foreground command, the detached share shares at once.
  writeFileSync(join(commonDir(root), 'p3-github.jsonl'), JSON.stringify({ at: new Date(Date.now() + 1000).toISOString(), kind: 'gh', session: 'cse_c53', what: 'mcp__github__update_pull_request', points: 5, content: 1, connector: true, repo: 'o/p' }) + '\n', { flag: 'a' });
  spawnSync('sleep', ['1.2']);
  const sh2 = spawnSync(process.execPath, [HOOK, '--share'], { cwd: root, env, encoding: 'utf8', timeout: 60e3 });
  assert.equal(sh2.status, 0, sh2.stderr);
  assert.equal(content(), 2);
  assert.equal(existsSync(join(commonDir(root), SHARE_DEFERRED)), false);
});
