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
import { bashVerdict, hookDecision, hookRun } from '../lib/ghhook.mjs';
import { kickRefresh, LEDGER_CACHE, peekShare, refreshDone, remoteStore, stateShare } from '../lib/ghshare.mjs';
import { git } from '../lib/util.mjs';
import { commonDir, PACING_DEFAULTS, useShared } from '../lib/pace.mjs';
import { makeRepo } from './helpers.mjs';

const P = { ...PACING_DEFAULTS, gh_interval_ms: 0 };
const P3 = join(dirname(fileURLToPath(import.meta.url)), '..', 'p3.mjs');
const HOOK = join(dirname(fileURLToPath(import.meta.url)), '..', 'hook.mjs');
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
    ['gh', 5, 1, true, 'neobobkrause/process3'],
    ['push', null, null, true, 'neobobkrause/process3'],
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
  // The refusal names the tool's path in this clone (R17d): process3's own, or a product's pinned one.
  assert.match(bashVerdict('git push origin x'), /`node tool\/p3\.mjs github push <remote> <refspec>`/);
  assert.match(bashVerdict('git push origin x', 0, 'node .process/tool/p3.mjs'), /`node \.process\/tool\/p3\.mjs github push <remote> <refspec>`/);
  assert.doesNotMatch(bashVerdict('git push origin x'), /\.process/);
  // Read as the shell reads it (cold review of R17c): no way around it, and no false block.
  for (const c of ['(git push)', '(cd x && git push)', '/usr/bin/git push', '\\git push', '"git" push', 'bash -c "git push"', "sh -c 'git push origin x'", 'xargs git push', 'time git push', 'nohup git push', 'timeout 60 git push', 'env -i git push', '! git push', 'if true; then git push; fi', 'for x in a; do git push; done', 'sleep 1 & git push', 'git --git-dir x push', 'echo $(git push)', 'echo `git push`', 'git -c alias.p=push p', '/usr/bin/gh api x', 'node tool/p3.mjs x $(gh api y)', 'git -C dir push', 'eval git push']) assert.ok(bashVerdict(c), c);
  for (const c of ['git commit -m "note; git push later"', 'git commit -F - <<EOF\ngh pr create\ngit push\nEOF', 'echo hi # ; git push', 'git push --dry-run origin x', 'git log --grep push']) assert.equal(bashVerdict(c), null, c);
});

test('the hook never waits past its cap: longer, it refuses and says to retry the tool call', (t) => {
  logTo(t);
  const root = makeRepo({ 'README.md': 'x\n' });
  useShared({ read: () => ({ pause: { at: new Date().toISOString(), until: new Date(Date.now() + 300e3).toISOString(), why: 'secondary rate limit' }, use: [] }), pause: () => null });
  const d = hookDecision({ tool_name: 'mcp__github__pull_request_read', tool_input: {} }, root, { p: P, sleep: () => assert.fail('no sleep past the cap') });
  assert.match(d.block, /acts on GitHub wait until .*then retry the tool call \(retry it\)/);
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
  // The hook's own entry (R17d), which the settings call: the same answers.
  const entry = (input) => spawnSync(process.execPath, [HOOK], { cwd: root, input: input === '' ? '' : JSON.stringify(input), encoding: 'utf8', env: { ...process.env, P3_GITHUB_LOG: '0' } });
  assert.equal(entry({ tool_name: 'Bash', tool_input: { command: 'node tool/p3.mjs status' } }).status, 0);
  const no2 = entry({ tool_name: 'Bash', tool_input: { command: 'gh pr list' } });
  assert.equal(no2.status, 2);
  assert.match(no2.stderr, /GitHub pacing \(P27\): a raw gh command/);
  assert.equal(entry({ tool_name: 'mcp__github__pull_request_read', tool_input: {} }).status, 0);
  assert.equal(entry('').status, 2);
});

// The read path (R17d; coordinator: under 300 ms p95, no ledger fetch on a read, the pause and stop
// cached and refreshed by ls-remote, fetched only when the ledger moved).
const cacheAt = (root, c) => writeFileSync(join(commonDir(root), LEDGER_CACHE), JSON.stringify(c));
test('a connector read uses the cached pause and stop, any age, and never fetches; a stale or missing cache starts one background refresh', (t) => {
  logTo(t);
  const root = makeRepo({ 'README.md': 'x\n' });
  const kicks = [];
  const kick = () => kicks.push(1);
  const errs = [];
  const run = (op) => hookRun({ tool_name: `mcp__github__${op}`, tool_input: {} }, root, { kick, err: (m) => errs.push(m), opts: { sleep: () => assert.fail('a read never waits on the floor') } });
  // No cache: the read passes at once, and a refresh is started.
  assert.equal(run('pull_request_read'), 0);
  assert.equal(kicks.length, 1);
  // A fresh cache: nothing started; its stop refuses the read (a stop is cached too).
  cacheAt(root, { at: Date.now(), pause: { at: '2026-11-06T23:00:00Z', until: '2026-11-06T23:01:00Z', why: 'secondary rate limit', stopped: true }, use: [], ledger: 'own', tip: 'a' });
  assert.equal(run('list_pull_requests'), 2);
  assert.match(errs.pop(), /every GitHub call is stopped/);
  assert.equal(kicks.length, 1);
  // A stale cache still answers (here a pause past its wait cap: refused), and starts a refresh.
  cacheAt(root, { at: Date.now() - 600e3, pause: { at: new Date().toISOString(), until: new Date(Date.now() + 600e3).toISOString(), why: 'secondary rate limit' }, use: [], ledger: 'own', tip: 'a' });
  assert.equal(run('get_file_contents'), 2);
  assert.match(errs.pop(), /GitHub rate-limited this account/);
  assert.equal(kicks.length, 2);
  // Never a fetch on the read path: peekShare reads only the cache.
  assert.deepEqual(peekShare(root, { kick: () => {} }).read().pause.why, 'secondary rate limit');
  // A write reads the ledger through its share (the share given): its stop refuses though the cache has none.
  cacheAt(root, { at: Date.now(), pause: null, use: [], ledger: 'own', tip: 'a' });
  let reads = 0;
  assert.equal(hookRun({ tool_name: 'mcp__github__add_issue_comment', tool_input: {} }, root, { kick, err: (m) => errs.push(m), share: { read: () => { reads++; return { pause: { at: '2026-11-06T23:00:00Z', until: '2026-11-06T23:01:00Z', why: 'x', stopped: true }, use: [] }; }, pause: () => null } }), 2);
  assert.ok(reads >= 1, 'the write read the ledger');
  assert.equal(kicks.length, 2);
});

test('the background refresh: the ledger unmoved, the cache is renewed without a fetch; moved, it is fetched and read again', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  const ledger = join(mkdtempSync(join(tmpdir(), 'p3-ledger-')), 'l.git');
  git(['init', '-q', '--bare', ledger], { cwd: root });
  const put = (pause) => {
    const w = makeRepo({ 'github/pause.json': JSON.stringify(pause) });
    git(['push', '-q', '-f', ledger, 'HEAD:refs/heads/process-state'], { cwd: w });
  };
  put({ at: '2026-11-07T00:00:00Z', until: '2026-11-07T00:01:00Z', why: 'first' });
  let t = Date.parse('2026-11-07T00:00:00Z');
  const sh = stateShare(root, null, { url: ledger, now: () => t });
  assert.equal(sh.refresh(), 'fetched');
  const c1 = JSON.parse(readFileSync(join(commonDir(root), LEDGER_CACHE), 'utf8'));
  assert.equal(c1.pause.why, 'first');
  assert.equal(c1.tip, git(['ls-remote', ledger, 'refs/heads/process-state'], { cwd: root }).split('\t')[0]);
  t += 60e3;
  const fetches = git(['rev-parse', 'refs/p3/ledger/state'], { cwd: root });
  assert.equal(sh.refresh(), 'unmoved');
  assert.equal(JSON.parse(readFileSync(join(commonDir(root), LEDGER_CACHE), 'utf8')).at, t, 'renewed');
  assert.equal(git(['rev-parse', 'refs/p3/ledger/state'], { cwd: root }), fetches);
  put({ at: '2026-11-07T00:00:30Z', until: '2026-11-07T00:02:00Z', why: 'second', stopped: true });
  assert.equal(sh.refresh(), 'fetched');
  const c3 = JSON.parse(readFileSync(join(commonDir(root), LEDGER_CACHE), 'utf8'));
  assert.equal(c3.pause.why, 'second');
  assert.equal(c3.pause.stopped, true);
  assert.equal(remoteStore(root, ledger).tip(), c3.tip);
});

test('one background refresh at a time per clone; a marker a minute old (a refresh killed) is taken over', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  const entry = join(mkdtempSync(join(tmpdir(), 'p3-noop-')), 'noop.mjs');
  writeFileSync(entry, '');
  let t = 1e12;
  assert.equal(kickRefresh(root, { now: () => t, entry }), true);
  assert.equal(kickRefresh(root, { now: () => t + 5e3, entry }), false);
  t += 61e3;
  assert.equal(kickRefresh(root, { now: () => t, entry }), true);
  // The refresh taken over clears no successor's marker; its own it clears.
  refreshDone(root, String(t - 61e3));
  assert.equal(kickRefresh(root, { now: () => t + 1e3, entry }), false);
  refreshDone(root, String(t));
  assert.equal(kickRefresh(root, { now: () => t + 1e3, entry }), true);
  refreshDone(root);
});

test('the read path takes no cache of another ledger (a config changed); the background refresh, run as the hook runs it, fills this ledger\'s cache', () => {
  const ledger = join(mkdtempSync(join(tmpdir(), 'p3-ledger-')), 'l.git');
  const URL = 'https://github.com/o/ledger.git';
  const seed = makeRepo({ 'github/pause.json': JSON.stringify({ at: '2026-11-07T00:00:00Z', until: '2099-01-01T00:00:00Z', why: 'from the ledger' }) });
  git(['init', '-q', '--bare', ledger], { cwd: seed });
  git(['push', '-q', ledger, 'HEAD:refs/heads/process-state'], { cwd: seed });
  // A clone that names the ledger, reached by its GitHub name.
  const root = makeRepo({ 'process/config.json': JSON.stringify({ pacing: { ledger: 'o/ledger' } }) });
  git(['config', `url.${ledger}.insteadOf`, URL], { cwd: root });
  // A cache of another ledger, fresh, with a stop: not this clone's, so not obeyed.
  cacheAt(root, { at: Date.now(), pause: { at: '2026-11-07T00:00:00Z', until: '2026-11-07T00:01:00Z', why: 'elsewhere', stopped: true }, use: [], ledger: 'https://github.com/o/other.git', tip: 'a' });
  const kicks = [];
  assert.equal(hookRun({ tool_name: 'mcp__github__pull_request_read', tool_input: {} }, root, { kick: () => kicks.push(1), err: () => {} }), 0);
  assert.equal(kicks.length, 1, 'no cache of this ledger: a refresh is started');
  // The refresh, as kickRefresh starts it: its own process, its marker cleared at the end.
  const mark = String(Date.now());
  writeFileSync(join(commonDir(root), 'p3-gh-refreshing'), mark);
  const r = spawnSync(process.execPath, [HOOK, '--refresh'], { cwd: root, encoding: 'utf8', env: { ...process.env, P3_REFRESH_MARK: mark, P3_GITHUB_LOG: '0' } });
  assert.equal(r.status, 0, r.stderr);
  const c = JSON.parse(readFileSync(join(commonDir(root), LEDGER_CACHE), 'utf8'));
  assert.deepEqual([c.ledger, c.pause.why, !!c.tip], [URL, 'from the ledger', true]);
  assert.throws(() => readFileSync(join(commonDir(root), 'p3-gh-refreshing'), 'utf8'), /ENOENT/, 'the marker is cleared');
  // Now the read obeys this ledger's pause (here past the hook's wait cap: refused).
  const errs = [];
  assert.equal(hookRun({ tool_name: 'mcp__github__pull_request_read', tool_input: {} }, root, { kick: () => kicks.push(1), err: (m) => errs.push(m) }), 2);
  assert.match(errs.pop(), /GitHub rate-limited this account \(from the ledger\)/);
});
