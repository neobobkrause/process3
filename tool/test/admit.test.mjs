// Every command a START, an act line or a rulebook tells a session to run is admitted by the
// product's .claude/settings.json (C3, the coordinator, 7 Nov): the push check told a session to run
// `git commit --amend --no-edit`, which the copy's settings deny.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import './helpers.mjs';
import { PROMPTS_IN_AUTO, admitCheck, admitTools, deniedBy, ruleMatches, toldCommands, toldIn, toldTools, toolRuleMatches, toolsIn, toolStops } from '../lib/admit.mjs';
import { admitLines } from '../lib/setup.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// The copy's deny list (civicsmith-copy .claude/settings.json at 5f03000d, 7 Nov).
const COPY = { permissions: { deny: ['mcp__github__merge_pull_request', 'Bash(gh pr merge *)', 'Bash(gh api *pulls/*/merge*)', 'Bash(git push --force *)', 'Bash(git push -f *)', 'Bash(git push --force-with-lease *)', 'Bash(git push --mirror *)', 'Bash(git push origin --delete *)', 'Bash(git push origin HEAD:main)', 'Bash(git push origin main)', 'Bash(git push -u origin main)', 'Bash(git reset --hard *)', 'Bash(git clean -fd *)', 'Bash(git clean -fdx *)', 'Bash(git stash drop *)', 'Bash(git rebase *)', 'Bash(git commit --amend *)', 'Bash(git tag *)', 'Bash(git branch -D *)', 'Bash(gh api *contents/*)', 'Bash(gh api *git/blobs*)', 'Bash(gh api *git/trees*)', 'Bash(gh api *git/commits*)', 'Bash(gh api *git/refs*)', 'Bash(curl *api.github.com*)', 'mcp__github__create_or_update_file', 'mcp__github__push_files', 'mcp__github__delete_file'] } };

test('permission rules: * any text, a trailing " *" also the bare command, :* a prefix; a told line is judged part by part', () => {
  assert.equal(ruleMatches('Bash(git commit --amend *)', 'git commit --amend --no-edit'), true);
  assert.equal(ruleMatches('Bash(git commit --amend *)', 'git commit --amend'), true);
  assert.equal(ruleMatches('Bash(git commit --amend *)', 'git commit -m x'), false);
  assert.equal(ruleMatches('Bash(gh api *contents/*)', 'gh api repos/o/r/contents/x'), true);
  assert.equal(ruleMatches('Bash(npm run:*)', 'npm run build'), true);
  assert.equal(ruleMatches('mcp__github__push_files', 'git push'), false);
  assert.deepEqual(deniedBy('git fetch origin x && git reset --hard FETCH_HEAD', COPY), { part: 'git reset --hard FETCH_HEAD', rule: 'Bash(git reset --hard *)' });
});

test('told commands are the spans a session reads: a printed string\'s, a rulebook\'s; never a comment\'s nor an error text', () => {
  const src = "// Bob denies `gh pr merge` to sessions.\nfail(`run \\`git commit --amend --no-edit\\`, then \\`git push origin ${b}\\``);\nfail(`git ${a} failed: x`);\n";
  assert.deepEqual(toldIn(src, 'x.mjs').map((t) => t.cmd), ['git commit --amend --no-edit', 'git push origin X']);
  assert.deepEqual(toldIn('Run `git fetch origin` then `p3 status`.\n', 'r.md').map((t) => t.cmd), ['git fetch origin']);
});

test('no command the process tells a session to run is denied by the copy\'s settings or by process3\'s own', () => {
  const told = toldCommands(ROOT);
  assert.ok(told.length > 30, `${told.length} told`);
  assert.deepEqual(admitCheck(COPY, told), []);
  assert.deepEqual(admitCheck(JSON.parse(readFileSync(join(ROOT, '.claude/settings.json'), 'utf8')), told), []);
});

test('setup check names a told command the product\'s settings deny, with where it is told and the rule', () => {
  const lines = [];
  const bad = admitLines({ file: (f) => (f === '.claude/settings.json' ? JSON.stringify(COPY) : null) }, { log: (l) => lines.push(l), told: [{ file: 'tool/lib/pushcheck.mjs', line: 47, cmd: 'git commit --amend --no-edit' }], tools: [] });
  assert.equal(bad.length, 1);
  assert.match(lines[0], /^warning: tool\/lib\/pushcheck\.mjs:47 tells a session to run `git commit --amend --no-edit`, which \.claude\/settings\.json denies \(Bash\(git commit --amend \*\)\)/);
  assert.deepEqual(admitLines({ file: () => null }, { log: () => {}, tools: [] }), [], 'no settings file: nothing read');
});

test('a told command behind cd, an assignment, a subshell or sh -c, and a span in a plain-quoted string, are all read and judged (cold review)', () => {
  assert.deepEqual(deniedBy('(cd x && git push origin main)', COPY)?.rule, 'Bash(git push origin main)');
  assert.deepEqual(deniedBy('GIT_DIR=x git rebase main', COPY)?.rule, 'Bash(git rebase *)');
  assert.deepEqual(deniedBy("sh -c 'git tag v1'", COPY)?.rule, 'Bash(git tag *)');
  assert.deepEqual(toldIn("x('run `git submodule update .process` first');\n", 'a.mjs').map((t) => t.cmd), ['git submodule update .process']);
  assert.deepEqual(toldIn('fail(`do \\`cd x && git rebase main\\``);\n', 'a.mjs').map((t) => t.cmd), ['cd x && git rebase main']);
});

// The deny lists Bob applies with R17c (notes/r17c-settings.md, 7 Nov): every raw `git push` and every
// `gh` is refused; the tool's own push is allowed. The coordinator, 7 Nov: no told command may need
// either. The docs (README.md, setup/*.md) are read too: a span there addressed to a session is a
// told command; those that only name a command (said to a person, or what a workflow or the tool
// runs itself) are listed below with why, so a new one is judged here.
const R17C_ADD = ['Bash(git push)', 'Bash(git push *)', 'Bash(gh *)'];
const R17C = {
  copy: { permissions: { deny: [...COPY.permissions.deny, ...R17C_ADD], allow: ['Bash(node .process/tool/p3.mjs github push *)', 'Artifact'] } },
  process3: { permissions: { deny: ['mcp__github__merge_pull_request', 'Bash(gh pr merge *)', 'Bash(gh api *pulls/*/merge*)', 'Bash(git push --force *)', 'Bash(git push -f *)', 'Bash(git push --force-with-lease *)', 'Bash(git push origin --delete *)', 'Bash(git push origin main)', 'Bash(git push origin HEAD:main)', 'Bash(gh api *contents/*)', 'Bash(gh api *git/blobs*)', 'Bash(gh api *git/trees*)', 'Bash(gh api *git/commits*)', 'Bash(gh api *git/refs*)', 'Bash(curl *api.github.com*)', 'mcp__github__create_or_update_file', 'mcp__github__push_files', 'mcp__github__delete_file', ...R17C_ADD], allow: ['Bash(node tool/p3.mjs github push *)'] } },
  probes: { permissions: { deny: ['Bash(git push --force *)', 'Bash(git push -f *)', 'Bash(git push --force-with-lease *)', 'Bash(git push origin --delete *)', 'mcp__github__create_or_update_file', 'mcp__github__push_files', 'mcp__github__delete_file', 'Bash(gh api *contents/*)', 'mcp__github__merge_pull_request', 'Bash(gh pr merge *)', 'Bash(gh api *pulls/*/merge*)', ...R17C_ADD], allow: ['Bash(node .process/tool/p3.mjs github push *)', 'Artifact'] } },
};
const NAMED = {
  'README.md gh pr ready': 'what job complete runs itself, outside a session',
  'README.md git push --force-with-lease=<ref>:<sha> origin :<ref>': 'what the branch cleanup workflow runs',
  'README.md git push': 'what the hook refuses',
  'setup/DEVELOPER.md git push': 'said to the developer: a push does not count',
};
const docs = () => ['README.md', ...readdirSync(join(ROOT, 'setup')).filter((f) => f.endsWith('.md')).map((f) => `setup/${f}`)]
  .flatMap((f) => toldIn(readFileSync(join(ROOT, f), 'utf8'), f));

test('the R17c deny lists (no raw git push, no gh) refuse no command the process tells a session to run', () => {
  const told = toldCommands(ROOT);
  for (const [repo, s] of Object.entries(R17C)) {
    assert.deepEqual(admitCheck(s, told), [], repo);
    assert.equal(deniedBy('node tool/p3.mjs github push origin b', s), null, `${repo}: the tool's push is no git push`);
    const named = admitCheck(s, docs()).map((x) => `${x.file} ${x.cmd}`);
    assert.deepEqual(named.filter((k) => !NAMED[k]), [], `${repo}: a doc tells a session a command these settings refuse`);
  }
});

// C15 (the coordinator, 7 Nov): an investigation lane waited from ~00:31Z on "permission: Artifact",
// which asks a person even in auto mode; lanes are told their design documents are claude.ai
// artifacts. Every tool the process tells a session to use is read, and judged against each
// product's settings: denied, or asking a person in auto mode with no allow rule, fails.
test('told tools: what the process\'s text says maps to the tool; a comment tells none', () => {
  assert.deepEqual(toolsIn("log(`keep them as claude.ai artifacts, then send_message BOB`);\n// a comment naming create_session\n", 'x.mjs').map((t) => t.tool), ['Artifact', 'mcp__claude-code-remote__send_message']);
  assert.deepEqual(toolsIn("Dispatch through the GitHub connector's `actions_run_trigger`.\n", 'r.md').map((t) => t.tool), ['mcp__github__actions_run_trigger']);
  const told = toldTools(ROOT);
  assert.ok(told.some((t) => t.tool === 'Artifact' && t.file === 'tool/lib/lane.mjs'), 'the lane\'s documents');
  assert.ok(!told.some((t) => t.file === 'tool/lib/admit.mjs'), 'the reader names tools, it tells none');
});

test('a told tool stops when denied, or when it asks in auto mode and no allow rule admits it', () => {
  assert.equal(toolRuleMatches('mcp__github', 'mcp__github__actions_run_trigger'), true);
  assert.equal(toolRuleMatches('mcp__github__*', 'mcp__github__actions_run_trigger'), true);
  assert.equal(toolRuleMatches('mcp__git', 'mcp__github__x'), false);
  assert.equal(toolRuleMatches('Bash(git push *)', 'Artifact'), false);
  assert.deepEqual(toolStops('mcp__github__merge_pull_request', COPY), { why: 'denied', rule: 'mcp__github__merge_pull_request' });
  assert.deepEqual(toolStops('Artifact', COPY), { why: 'prompts', evidence: PROMPTS_IN_AUTO.Artifact });
  assert.equal(toolStops('Artifact', { permissions: { allow: ['Artifact'] } }), null);
  assert.equal(toolStops('Artifact', { permissions: { allow: ['Artifact'], deny: ['Artifact'] } }).why, 'denied', 'deny wins');
  assert.equal(toolStops('mcp__claude-code-remote__send_message', COPY), null, 'runs unasked in auto mode');
});

test('every tool the process tells a session to use runs unattended under the R17c settings; today\'s copy settings leave only the lanes\' Artifact to a prompt', () => {
  const told = toldTools(ROOT);
  for (const repo of ['copy', 'probes']) assert.deepEqual(admitTools(R17C[repo], told), [], repo);
  // Until Bob applies them (register C15, fix 1): exactly the lanes' Artifact, nothing else. Brittle on
  // purpose: once the copy allows Artifact, COPY above is updated and this assertion dropped.
  const now = admitTools(COPY, told);
  assert.deepEqual([...new Set(now.map((x) => `${x.tool}: ${x.why}`))], ['Artifact: prompts']);
  assert.ok(now.every((x) => x.file === 'tool/lib/lane.mjs'), JSON.stringify(now));
  // setup check says so, naming the line and the allow rule to add.
  const lines = [];
  const bad = admitLines({ file: (f) => (f === '.claude/settings.json' ? JSON.stringify(COPY) : null) }, { log: (l) => lines.push(l), told: [], tools: told });
  assert.equal(bad.length, now.length);
  assert.ok(lines.some((l) => /^warning: tool\/lib\/lane\.mjs:\d+ tells a session to use the Artifact tool, which asks a person even in auto mode .* Bob adds "Artifact" to its permissions\.allow$/.test(l)), lines.join('\n'));
});
