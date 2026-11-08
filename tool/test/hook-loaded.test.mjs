// C34 (the coordinator, 8 Nov): a session whose project root has no settings naming tool/hook.mjs
// (a container rooted at /home/user, a checkout of an old branch) loads no GitHub hook, and its
// connector calls go unledgered. Each hook run Claude Code makes leaves a stamp for its session;
// `start check` (a Bash call the hook sees, when loaded) says so when there is none, with PD-13's
// by-hand line; the ledger's rows carry the claude.ai session for the audit.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { hookLoadedLine, hookRun, hookSeen, stampHook } from '../lib/ghhook.mjs';
import { logEvent, readLog, usage, useShared } from '../lib/pace.mjs';
import { makeRepo } from './helpers.mjs';

const dir = (t) => { const d = mkdtempSync(join(tmpdir(), 'p3-hook-seen-')); const was = process.env.P3_HOOK_SEEN_DIR; process.env.P3_HOOK_SEEN_DIR = d; t.after(() => { if (was === undefined) delete process.env.P3_HOOK_SEEN_DIR; else process.env.P3_HOOK_SEEN_DIR = was; }); return d; };

test('hook loaded (C34): a session with no hook run is told, with PD-13\'s line; a run Claude Code made marks it loaded; a by-hand pipe does not', (t) => {
  dir(t);
  assert.equal(hookSeen(null), null, 'no session id: unknown, nothing said');
  assert.equal(hookLoadedLine(null), null);
  assert.equal(hookSeen('sess-1'), false);
  assert.match(hookLoadedLine('sess-1'), /^GitHub pacing hook: NOT LOADED in this session .* \(PD-13\): before each GitHub connector call, pipe its JSON to the hook .*node tool\/hook\.mjs`, and do not make the call if it exits 2\.$/);
  // PD-13's by-hand pipe carries no session_id: no stamp.
  stampHook({ tool_name: 'mcp__github__create_pull_request', tool_input: {} });
  assert.equal(hookSeen('sess-1'), false);
  // Claude Code's run names the session: loaded from then on.
  const root = makeRepo({ 'README.md': 'x\n' });
  assert.equal(hookRun({ session_id: 'sess-1', hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } }, root, { err: () => {} }), 0);
  assert.equal(hookSeen('sess-1'), true);
  assert.equal(hookLoadedLine('sess-1'), null);
  assert.equal(hookSeen('sess-2'), false, 'another session: its own stamp');
  // The hook process's own CLAUDE_CODE_SESSION_ID is stamped beside the input's (forms that may differ).
  const was = process.env.CLAUDE_CODE_SESSION_ID;
  process.env.CLAUDE_CODE_SESSION_ID = 'env-form';
  t.after(() => { if (was === undefined) delete process.env.CLAUDE_CODE_SESSION_ID; else process.env.CLAUDE_CODE_SESSION_ID = was; });
  stampHook({ session_id: 'input-form' });
  assert.deepEqual([hookSeen('input-form'), hookSeen('env-form')], [true, true]);
});

test('hook loaded (C34): start check prints the line in a session the hook never saw, and not in one it did', (t) => {
  const d = dir(t);
  const p3 = join(dirname(fileURLToPath(import.meta.url)), '..', 'p3.mjs');
  const root = makeRepo({ 'README.md': 'x\n' });
  const env = { ...process.env, P3_HOOK_SEEN_DIR: d, CLAUDE_CODE_SESSION_ID: 'sess-cli', NODE_TEST_CONTEXT: undefined };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync('node', [p3, 'start', 'check', '--wake'], { cwd: root, env, encoding: 'utf8' });
  assert.match(r.stdout, /GitHub pacing hook: NOT LOADED in this session/, r.stdout + r.stderr);
  stampHook({ session_id: 'sess-cli' });
  const r2 = spawnSync('node', [p3, 'start', 'check', '--wake'], { cwd: root, env, encoding: 'utf8' });
  assert.ok(!/NOT LOADED/.test(r2.stdout), r2.stdout);
});

test('hook loaded (C34): ledger rows carry the claude.ai session; the usage names the sessions whose hook counted a connector call', (t) => {
  const f = join(mkdtempSync(join(tmpdir(), 'p3-log-')), 'log.jsonl');
  const was = [process.env.P3_GITHUB_LOG, process.env.CLAUDE_CODE_REMOTE_SESSION_ID];
  process.env.P3_GITHUB_LOG = f;
  process.env.CLAUDE_CODE_REMOTE_SESSION_ID = 'cse_ABC';
  t.after(() => { for (const [k, v] of [['P3_GITHUB_LOG', was[0]], ['CLAUDE_CODE_REMOTE_SESSION_ID', was[1]]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } });
  useShared(null);
  const root = makeRepo({ 'README.md': 'x\n' });
  logEvent('gh', 'connector create_pull_request', root, { points: 5, content: 1, connector: true });
  assert.equal(readLog(root).at(-1).remote, 'session_ABC');
  assert.deepEqual([...usage(root, { t: Date.now() + 1000, seconds: 60 }).connector_sessions], ['session_ABC']);
  assert.ok(readFileSync(f, 'utf8').includes('"remote":"session_ABC"'));
});
