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

test('hookShare: a connector write shares at once when the last share is old, else starts one later share; nothing unshared, nothing', (t) => {
  const f = logTo(t);
  const root = makeRepo({ 'README.md': 'x\n' });
  const later = [];
  // Only reads unshared: no share, no later share.
  row(f, { kind: 'gh', points: 1, connector: true });
  const sh = fakeShare();
  assert.equal(hookShare(root, sh, { later: () => later.push(1) }), 0);
  assert.deepEqual([sh.calls.length, later.length], [0, 0]);
  // A write, no share yet: shared at once.
  row(f, { kind: 'gh', points: 5, content: 1, connector: true });
  assert.equal(hookShare(root, sh, { later: () => later.push(1) }), 1);
  assert.deepEqual([sh.calls.length, later.length], [1, 0]);
  // A share within HOOK_SHARE_S: one later share, no push now.
  noteShare(root, 0, Date.now());
  assert.equal(hookShare(root, sh, { later: () => later.push(1) }), 0);
  assert.deepEqual([sh.calls.length, later.length], [1, 1]);
  // Past it: at once again.
  assert.equal(hookShare(root, sh, { later: () => later.push(1), now: () => Date.now() + HOOK_SHARE_S * 1000 }), 1);
});

test('a failing share is one line on stderr and never the call\'s failure; a read never shares', (t) => {
  const f = logTo(t);
  const root = makeRepo({ 'README.md': 'x\n' });
  row(f, { kind: 'gh', points: 5, content: 1, connector: true });
  const errs = [];
  const bad = fakeShare('GitHub budget: paused');
  assert.equal(hookRun({ tool_name: 'mcp__github__create_pull_request', tool_input: { owner: 'o', repo: 'p' } }, root, { share: bad, err: (m) => errs.push(m), opts: { p: P, rateLimit: () => undefined } }), 0);
  assert.equal(bad.calls.length, 1);
  assert.deepEqual(errs, ['github: this connector call\'s row not shared (GitHub budget: paused); the next connector write or p3 command in this clone shares it']);
  // A later share that throws: kept, one line, said by the next connector write.
  writeFileSync(join(commonDir(root), 'p3-gh-sharing'), 'm');
  assert.equal(hookShareLater(root, { sleep: () => {}, mark: 'm', again: () => assert.fail('no retry after a failure') }), false);
  assert.equal(existsSync(join(commonDir(root), 'p3-gh-sharing')), false, 'the marker let go');
  const ok = fakeShare();
  noteShare(root, 0, Date.now());
  hookRun({ tool_name: 'mcp__github__add_issue_comment', tool_input: {} }, root, { share: ok, later: () => true, err: (m) => errs.push(m), opts: { p: P, rateLimit: () => undefined } });
  assert.equal(errs.length, 2);
  assert.match(errs[1], /^github: a connector write's row not shared \(.*\); the next connector write or p3 command in this clone shares it$/);
  // A read: neither a share nor a later one.
  const r = fakeShare();
  const later = [];
  assert.equal(hookRun({ tool_name: 'mcp__github__pull_request_read', tool_input: {} }, root, { share: r, later: () => later.push(1), kick: () => false, err: (m) => errs.push(m) }), 0);
  assert.deepEqual([r.calls.length, later.length, errs.length], [0, 0, 2]);
  // In a workflow: nothing shared.
  const was = process.env.GITHUB_ACTIONS;
  process.env.GITHUB_ACTIONS = 'true';
  t.after(() => { if (was === undefined) delete process.env.GITHUB_ACTIONS; else process.env.GITHUB_ACTIONS = was; });
  const w = fakeShare();
  hookRun({ tool_name: 'mcp__github__create_pull_request', tool_input: {} }, root, { share: w, later: () => later.push(1), err: (m) => errs.push(m), opts: { p: P, rateLimit: () => undefined } });
  assert.deepEqual([w.calls.length, later.length], [0, 0]);
});

test('one later share at a time per clone', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  const entry = join(mkdtempSync(join(tmpdir(), 'p3-noop-')), 'noop.mjs');
  writeFileSync(entry, '');
  assert.equal(kickShare(root, { entry }), true);
  assert.equal(kickShare(root, { entry }), false, 'a second while the first holds the marker');
  assert.equal(kickShare(root, { entry, now: () => Date.now() + 3 * HOOK_SHARE_S * 1000 }), true, 'a marker of a killed share is taken over');
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
