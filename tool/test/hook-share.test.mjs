// C52 (9 Nov): a content-creating connector call the hook logged reaches the shared ledger without a
// later p3 command. PR 290's opening (builder C51, hook loaded) stayed in its clone's log, and
// `github audit` called it unexplained until that session ran `github budget` by hand.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { githubAudit } from '../lib/ghaudit.mjs';
import { hookRun, hookShare, hookShareLater, HOOK_SHARE_S, kickShare } from '../lib/ghhook.mjs';
import { stateShare, USE_DIR } from '../lib/ghshare.mjs';
import { commonDir, noteShare, PACING_DEFAULTS, useShared } from '../lib/pace.mjs';
import { git } from '../lib/util.mjs';
import { makeRepo } from './helpers.mjs';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), '..', 'hook.mjs');
const P = { ...PACING_DEFAULTS, gh_interval_ms: 0 };
const URL = 'https://github.com/o/p.git';

function logTo(t) {
  const f = join(mkdtempSync(join(tmpdir(), 'p3-hookshare-')), 'log.jsonl');
  writeFileSync(f, '');
  const was = process.env.P3_GITHUB_LOG;
  process.env.P3_GITHUB_LOG = f;
  t.after(() => { useShared(null); if (was === undefined) delete process.env.P3_GITHUB_LOG; else process.env.P3_GITHUB_LOG = was; });
  return f;
}
const row = (f, r) => writeFileSync(f, JSON.stringify({ at: new Date().toISOString(), session: 'cse_x', ...r }) + '\n', { flag: 'a' });
// A share that counts its calls; throws when told to.
const fakeShare = (fail) => { const calls = []; return { calls, read: () => ({ pause: null, use: [] }), pause: () => null, shareContent: () => { calls.push(1); if (fail) throw new Error(`${fail}\nsecond line`); return 1; } }; };

test('hookShare: a connector write starts one detached share; nothing unshared, nothing; the hook itself never shares', (t) => {
  const f = logTo(t);
  const root = makeRepo({ 'README.md': 'x\n' });
  const later = [];
  const sh = fakeShare();
  // Only reads unshared: nothing started.
  row(f, { kind: 'gh', points: 1, connector: true });
  assert.equal(hookShare(root, sh, { later: () => later.push(1) }), false);
  assert.deepEqual([sh.calls.length, later.length], [0, 0]);
  // A write: a later share started; the hook shares nothing itself, old last share or not.
  row(f, { kind: 'gh', points: 5, content: 1, connector: true });
  hookShare(root, sh, { later: () => later.push(1) });
  noteShare(root, 0, Date.now() - 3600e3);
  hookShare(root, sh, { later: () => later.push(1) });
  assert.deepEqual([sh.calls.length, later.length], [0, 2]);
  // Its rows shared since: nothing started.
  noteShare(root, Date.now() + 1000, Date.now());
  hookShare(root, sh, { later: () => later.push(1) });
  assert.equal(later.length, 2);
});

test('a share that cannot start is one line on stderr and never the call\'s failure; a read and a workflow start none', (t) => {
  const f = logTo(t);
  const root = makeRepo({ 'README.md': 'x\n' });
  row(f, { kind: 'gh', points: 5, content: 1, connector: true });
  // As a session runs it (CI sets GITHUB_ACTIONS, under which nothing is started): set below.
  const was = process.env.GITHUB_ACTIONS;
  delete process.env.GITHUB_ACTIONS;
  t.after(() => { if (was === undefined) delete process.env.GITHUB_ACTIONS; else process.env.GITHUB_ACTIONS = was; });
  const errs = [];
  const opts = { p: P, rateLimit: () => undefined };
  assert.equal(hookRun({ tool_name: 'mcp__github__create_pull_request', tool_input: { owner: 'o', repo: 'p' } }, root, { share: fakeShare(), later: () => { throw new Error('EACCES: the marker\nmore'); }, err: (m) => errs.push(m), opts }), 0);
  assert.deepEqual(errs, ['github: the share of this connector call\'s row not started (EACCES: the marker); the next connector write or p3 command in this clone shares it']);
  // A read: none started.
  const later = [];
  assert.equal(hookRun({ tool_name: 'mcp__github__pull_request_read', tool_input: {} }, root, { share: fakeShare(), later: () => later.push(1), kick: () => false, err: (m) => errs.push(m) }), 0);
  assert.deepEqual([later.length, errs.length], [0, 1]);
  // In a workflow: none started.
  process.env.GITHUB_ACTIONS = 'true';
  hookRun({ tool_name: 'mcp__github__create_pull_request', tool_input: {} }, root, { share: fakeShare(), later: () => later.push(1), err: (m) => errs.push(m), opts });
  assert.equal(later.length, 0);
});

test('the detached share: a failure is tried once more, then one line for the next connector write; another starts only for a write logged since it began', (t) => {
  const f = logTo(t);
  const root = makeRepo({ 'README.md': 'x\n' });
  const marker = join(commonDir(root), 'p3-gh-sharing');
  const run = (share, tries = 0) => { const again = []; writeFileSync(marker, 'm'); const ok = hookShareLater(root, { sleep: () => {}, mark: 'm', tries, share: () => share, again: (r, o) => again.push(o?.tries ?? 0) }); assert.equal(existsSync(marker), false, 'the marker let go'); return { ok, again }; };
  row(f, { kind: 'gh', points: 5, content: 1, connector: true });
  // Fails: one retry, no line yet; fails again: kept, said by the next connector write, no retry.
  assert.deepEqual(run(fakeShare('GitHub budget: paused')), { ok: false, again: [1] });
  assert.equal(existsSync(join(commonDir(root), 'p3-gh-share.err')), false);
  assert.deepEqual(run(fakeShare('GitHub budget: paused'), 1), { ok: false, again: [] });
  const errs = [];
  hookShare(root, null, { err: (m) => errs.push(m) });
  assert.deepEqual(errs, ['github: a connector write\'s row not shared (GitHub budget: paused); the next connector write or p3 command in this clone shares it']);
  // Shares, and a write logged while it ran is still unshared: one more started.
  const during = { ...fakeShare(), shareContent: () => { noteShare(root, Date.now(), Date.now()); row(f, { kind: 'gh', points: 5, content: 1, connector: true, at: new Date(Date.now() + 5).toISOString() }); return 1; } };
  assert.deepEqual(run(during), { ok: true, again: [0] });
  // Shares, nothing newer: none; one that shared nothing (another took the rows): none for older rows.
  noteShare(root, Date.now() + 1000, Date.now());
  assert.deepEqual(run(fakeShare()), { ok: true, again: [] });
  assert.deepEqual(run({ ...fakeShare(), shareContent: () => 0 }), { ok: true, again: [] });
});

test('one detached share at a time per clone; a killed one\'s marker is taken over', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  const entry = join(mkdtempSync(join(tmpdir(), 'p3-noop-')), 'noop.mjs');
  writeFileSync(entry, '');
  assert.equal(kickShare(root, { entry }), true);
  assert.equal(kickShare(root, { entry }), false, 'a second while the first holds the marker');
  assert.equal(kickShare(root, { entry, now: () => Date.now() + 5 * HOOK_SHARE_S * 1000 }), true, 'a marker of a killed share is taken over');
});

// PD-17: rehearsed end to end, as Claude Code runs the hook: a create and an update, no p3 command
// after; the ledger holds both, and an audit from another clone is clean.
test('end to end: the hook logs a create_pull_request and an update_pull_request; the ledger holds both; the audit is clean', (t) => {
  const mk = () => {
    const root = makeRepo({ 'README.md': 'x\n' });
    git(['config', `url.${bare}.insteadOf`, URL], { cwd: root });
    git(['remote', 'add', 'origin', URL], { cwd: root });
    return root;
  };
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: tmpdir() });
  const root = mk();
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  const env = { ...process.env, CLAUDE_CODE_SESSION_ID: 'cse_c52e2e', HOME: mkdtempSync(join(tmpdir(), 'p3-home-')), P3_HOOK_SHARE_S: '2', P3_HOOK_SEEN_DIR: mkdtempSync(join(tmpdir(), 'p3-seen-')), PATH: `${mkdtempSync(join(tmpdir(), 'p3-nogh-'))}:${process.env.PATH}` };
  // As a session runs it: not under the test runner, nor in a workflow (which shares nothing).
  for (const k of ['NODE_TEST_CONTEXT', 'GITHUB_ACTIONS', 'P3_GITHUB_LOG']) delete env[k];
  // No gh: GitHub's primary count is not asked of the network here.
  writeFileSync(join(env.PATH.split(':')[0], 'gh'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const hook = (op) => {
    const r = spawnSync(process.execPath, [HOOK], { cwd: root, env, encoding: 'utf8', input: JSON.stringify({ session_id: 'cse_c52e2e', tool_name: `mcp__github__${op}`, tool_input: { owner: 'o', repo: 'p', pullNumber: 1 } }) });
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stderr, /not shared/, r.stderr);
  };
  const content = () => (git(['show', `process-state:${USE_DIR}/cse_c52e2e.jsonl`], { cwd: bare, allowFail: true }).stdout || '').split('\n').filter(Boolean).reduce((n, l) => n + (JSON.parse(l).content_by?.['o/p'] || 0), 0);
  hook('create_pull_request');
  assert.equal(content(), 1, 'the create, shared by its own hook run');
  hook('update_pull_request');
  hook('pull_request_read');
  // The update's share waits HOOK_SHARE_S after the first, in the background; no p3 command runs.
  const until = Date.now() + 30e3;
  while (content() < 2 && Date.now() < until) spawnSync('sleep', ['0.5']);
  assert.equal(content(), 2, 'the update, shared by the later share');
  while (existsSync(join(commonDir(root), 'p3-gh-sharing')) && Date.now() < until) spawnSync('sleep', ['0.2']);
  // The audit, from another clone of the same repository (it reads only the shared ledger).
  const other = mk();
  const was = process.env.P3_GITHUB_LOG;
  process.env.P3_GITHUB_LOG = join(mkdtempSync(join(tmpdir(), 'p3-otherlog-')), 'log.jsonl');
  t.after(() => { useShared(null); if (was === undefined) delete process.env.P3_GITHUB_LOG; else process.env.P3_GITHUB_LOG = was; });
  const sh = stateShare(other, null);
  useShared(sh);
  const at = new Date().toISOString();
  const events = [
    { type: 'PullRequestEvent', created_at: at, actor: { login: 'robot' }, payload: { action: 'opened', pull_request: { number: 1, body: 'x' } } },
    { type: 'PullRequestEvent', created_at: at, actor: { login: 'robot' }, payload: { action: 'edited', pull_request: { number: 1 } } },
  ];
  const io = { gh: (args) => (/^repos\/o\/p\/events/.test(args[1]) ? events : /actions\/runs/.test(args[1]) ? { workflow_runs: [] } : null) };
  const lines = [];
  const r = githubAudit(other, { repos: ['o/p'], now: Date.now() + 30 * 60e3, io, log: (l) => lines.push(l), p: P });
  assert.ok(r.ok, lines.join('\n'));
  assert.ok(lines.some((l) => /writes, o\/p: GitHub 2 .* vs ledger 2$/.test(l)), lines.join('\n'));
});
