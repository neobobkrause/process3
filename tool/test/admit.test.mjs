// Every command a START, an act line or a rulebook tells a session to run is admitted by the
// product's .claude/settings.json (C3, the coordinator, 7 Nov): the push check told a session to run
// `git commit --amend --no-edit`, which the copy's settings deny.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import './helpers.mjs';
import { admitCheck, deniedBy, ruleMatches, toldCommands, toldIn } from '../lib/admit.mjs';
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
  const bad = admitLines({ file: (f) => (f === '.claude/settings.json' ? JSON.stringify(COPY) : null) }, { log: (l) => lines.push(l), told: [{ file: 'tool/lib/pushcheck.mjs', line: 47, cmd: 'git commit --amend --no-edit' }] });
  assert.equal(bad.length, 1);
  assert.match(lines[0], /^warning: tool\/lib\/pushcheck\.mjs:47 tells a session to run `git commit --amend --no-edit`, which \.claude\/settings\.json denies \(Bash\(git commit --amend \*\)\)/);
  assert.deepEqual(admitLines({ file: () => null }, { log: () => {} }), [], 'no settings file: nothing read');
});

test('a told command behind cd, an assignment, a subshell or sh -c, and a span in a plain-quoted string, are all read and judged (cold review)', () => {
  assert.deepEqual(deniedBy('(cd x && git push origin main)', COPY)?.rule, 'Bash(git push origin main)');
  assert.deepEqual(deniedBy('GIT_DIR=x git rebase main', COPY)?.rule, 'Bash(git rebase *)');
  assert.deepEqual(deniedBy("sh -c 'git tag v1'", COPY)?.rule, 'Bash(git tag *)');
  assert.deepEqual(toldIn("x('run `git submodule update .process` first');\n", 'a.mjs').map((t) => t.cmd), ['git submodule update .process']);
  assert.deepEqual(toldIn('fail(`do \\`cd x && git rebase main\\``);\n', 'a.mjs').map((t) => t.cmd), ['cd x && git rebase main']);
});
