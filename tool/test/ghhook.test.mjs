// p3 github hook (R17c; Bob, 6 Nov: all GitHub traffic monitored and limited, enforced, not by rule):
// the PreToolUse hook counts every connector call against the budget and refuses raw pushes, gh and
// curl to GitHub; exit 2 blocks the call.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { bashVerdict, hookDecision } from '../lib/ghhook.mjs';
import { PACING_DEFAULTS, useShared } from '../lib/pace.mjs';
import { makeRepo } from './helpers.mjs';

const P = { ...PACING_DEFAULTS, gh_interval_ms: 0 };
const P3 = join(dirname(fileURLToPath(import.meta.url)), '..', 'p3.mjs');
function logTo(t) {
  const f = join(mkdtempSync(join(tmpdir(), 'p3-hook-')), 'log.jsonl');
  writeFileSync(f, '');
  const was = process.env.P3_GITHUB_LOG;
  process.env.P3_GITHUB_LOG = f;
  t.after(() => { useShared(null); if (was === undefined) delete process.env.P3_GITHUB_LOG; else process.env.P3_GITHUB_LOG = was; });
  return () => readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

test('a connector read passes and is counted; a write is a content-creating request; one that moves a ref is also a push', (t) => {
  const rows = logTo(t);
  const root = makeRepo({ 'README.md': 'x\n' });
  useShared(null);
  assert.deepEqual(hookDecision({ tool_name: 'mcp__github__pull_request_read', tool_input: { owner: 'NeoBobKrause', repo: 'process3', pullNumber: 1 } }, root, { p: P }), { ok: true, counted: 'read' });
  assert.deepEqual(hookDecision({ tool_name: 'mcp__github__add_issue_comment', tool_input: { owner: 'neobobkrause', repo: 'process3' } }, root, { p: P }), { ok: true, counted: 'write' });
  hookDecision({ tool_name: 'mcp__github__merge_pull_request', tool_input: { owner: 'neobobkrause', repo: 'process3' } }, root, { p: P });
  assert.deepEqual(rows().map((r) => [r.kind, r.points ?? null, r.content ?? null, r.connector, r.repo]), [
    ['gh', 1, null, true, 'neobobkrause/process3'],
    ['gh', 5, 1, true, 'neobobkrause/process3'],
    ['push', null, null, true, 'neobobkrause/process3'],
    ['gh', 5, 1, true, 'neobobkrause/process3'],
  ]);
  for (const op of ['create_pull_request', 'update_pull_request', 'pull_request_review_write', 'add_comment_to_pending_review', 'add_reply_to_pull_request_comment', 'create_branch', 'issue_write', 'update_pull_request_branch']) {
    assert.equal(hookDecision({ tool_name: `mcp__github__${op}`, tool_input: {} }, root, { p: P }).counted, 'write', op);
  }
  for (const op of ['list_pull_requests', 'get_file_contents', 'pull_request_read', 'actions_list', 'get_job_logs']) assert.equal(hookDecision({ tool_name: `mcp__github__${op}`, tool_input: {} }, root, { p: P }).counted, 'read', op);
});

test('a paused or stopped account refuses the connector call (the hook exits 2); other tools pass', (t) => {
  logTo(t);
  const root = makeRepo({ 'README.md': 'x\n' });
  useShared({ read: () => ({ pause: { at: '2026-11-06T23:00:00Z', until: '2099-01-01T00:00:00Z', why: 'secondary rate limit' }, use: [] }), pause: () => null });
  const d = hookDecision({ tool_name: 'mcp__github__add_issue_comment', tool_input: {} }, root, { p: P });
  assert.match(d.block, /^GitHub budget: GitHub rate-limited this account \(secondary rate limit\)/);
  useShared({ read: () => ({ pause: { at: '2026-11-06T23:00:00Z', until: '2026-11-06T23:01:00Z', why: 'x', stopped: true }, use: [] }), pause: () => null });
  assert.match(hookDecision({ tool_name: 'mcp__github__pull_request_read', tool_input: {} }, root, { p: P }).block, /every GitHub call is stopped/);
  assert.deepEqual(hookDecision({ tool_name: 'Read', tool_input: { file_path: '/x' } }, root, { p: P }), { ok: true });
});

test('Bash: a raw git push, gh, or curl to GitHub is refused; the tool\'s own commands pass', () => {
  for (const c of ['git push origin job/x', 'git -c user.name=x push -u origin b', 'cd /x && git push', 'FOO=1 git push origin HEAD', 'gh pr create --title x', 'gh api repos/o/r', 'echo $(gh api user)', 'curl -s https://api.github.com/repos/o/r', 'wget https://github.com/o/r/archive/x.zip']) assert.ok(bashVerdict(c), c);
  for (const c of ['node .process/tool/p3.mjs github push origin job/x', 'node tool/p3.mjs github push origin build/x --set-upstream', 'cd /home/user/process3 && node tool/p3.mjs job sync alpha', 'git status', 'git fetch origin tranche', 'git commit -m "push the gh button"', 'npm test', 'curl -s https://registry.npmjs.org/x', 'node --test tool/test/*.test.mjs']) assert.equal(bashVerdict(c), null, c);
  assert.match(bashVerdict('git push origin x'), /node \.process\/tool\/p3\.mjs github push <remote> <refspec>/);
});

test('the hook command: exit 0 to allow, exit 2 with the reason on stderr to block', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  const hook = (input) => spawnSync(process.execPath, [P3, 'github', 'hook'], { cwd: root, input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, P3_GITHUB_LOG: '0' } });
  const ok = hook({ tool_name: 'Bash', tool_input: { command: 'node tool/p3.mjs status' } });
  assert.equal(ok.status, 0, ok.stderr);
  const no = hook({ tool_name: 'Bash', tool_input: { command: 'git push origin main' } });
  assert.equal(no.status, 2);
  assert.match(no.stderr, /GitHub pacing \(P27\): a raw git push goes around GitHub pacing/);
  const read = hook({ tool_name: 'mcp__github__pull_request_read', tool_input: {} });
  assert.equal(read.status, 0, read.stderr);
  const none = spawnSync(process.execPath, [P3, 'github', 'hook'], { cwd: root, input: '', encoding: 'utf8' });
  assert.equal(none.status, 2);
});
