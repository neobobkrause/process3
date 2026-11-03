import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { MESSAGE, hook, judge } from '../../shims/hooks/one-act.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'shims', 'hooks', 'one-act.mjs');
const P3 = 'node .process/tool/p3.mjs';

const refused = [
  // joined by each separator
  'git add -A && git push origin build/x',
  'git push origin build/x && echo done',
  'git push -u origin x || true',
  'git commit -m x; git push',
  'git push origin x | tee log',
  'git push origin x |& tee log',
  'git push origin x & echo next',
  'git commit -m x\ngit push',
  'echo a\n\ngit push',
  // each act
  'cd repo && gh pr view 3',
  'gh api repos/a/b | jq .',
  `cd x && ${P3} merge 12 --plain --reviewed "ok"`,
  `${P3} job start alpha --coordinator s; echo`,
  `${P3} job complete alpha && echo`,
  'npm test && wrangler deploy',
  'wrangler delete --name p3dev-x; echo',
  'echo s | wrangler secret put KEY',
  'wrangler r2 bucket create p3dev-b && ls',
  'wrangler containers list && ls',
  'npx wrangler deploy && echo',
  'npx -y wrangler@3 deploy && echo',
  'pnpm exec wrangler deploy; echo',
  'wrangler versions deploy && echo',
  // prefixes and paths
  'FOO=1 git push && echo',
  'env -u X git push; echo',
  '/usr/bin/git -C ../repo push && echo',
  'git -c user.name=x push origin x && echo',
  'timeout 60 gh pr list; echo',
  // nested in another command
  'echo $(gh pr view 3)',
  'x=$(gh api user)',
  'echo "$(git push)"',
  'echo `gh pr list`',
  'echo hi; (git push)',
  '(git push; echo)',
  'bash -c "git add . && git push"',
  'sh -c \'gh pr list; echo\'',
  'eval "git push; echo"',
  'diff <(gh api a) b',
  // quoting does not hide a real separator
  'git commit -m "a; b" && git push',
  "git commit -m 'it''s' && git push",
  // review of PR 28: here-documents inside $(...), ANSI-C quotes, runner options, redirects
  `git commit -m "$(cat <<'EOF'\nDon't stop\nEOF\n)" && git push`,
  `git add -A && gh pr create --body "$(cat <<'EOF'\nIt's done\nEOF\n)"`,
  "echo $'it\\'s' && git push",
  'npx wrangler --env dev deploy && ls',
  'npx wrangler --config w.toml deploy && ls',
  'pnpm exec wrangler -e dev deploy; ls',
  'git push>log; ls',
  'gh pr list>out && ls',
  'bash -c "echo hi > f; git push"',
  // a line the hook cannot read, naming an act, with something it could be joined to
  'git push "unclosed && ls',
];

const allowed = [
  'git push',
  'git push -u origin build/session-safety',
  'git push origin HEAD:refs/heads/x 2>&1',
  'git push origin x &>/dev/null',
  'git push origin x &',
  'git push origin x;',
  'git push origin x\n',
  `${P3} merge 12 --plain --reviewed "two reviews; one fix pass && re-review | ok"`,
  `${P3} job start alpha --coordinator s`,
  `${P3} status && ${P3} test alpha`,
  'gh pr view 3 --json title',
  "gh pr create --title 'a && b' --body \"one; two | three\"",
  'gh pr create --body "line one\nline two; git push"',
  'gh pr create --body-file - <<\'EOF\'\nbody; git push && x\n| more\nEOF',
  'wrangler deploy --name p3dev-x',
  'wrangler tail p3dev-x | grep error',
  'wrangler whoami; echo',
  'git status && git log --oneline | head',
  'git fetch origin tranche && git rev-parse HEAD',
  'git commit -m "push it" && echo pushed',
  'echo "git push && gh"',
  "echo 'git push; gh pr list'",
  'grep -n "git push" README.md | head',
  'git push \\\n  origin x',
  '# git push && echo\nls',
  'npm test 2>&1 | tail -5',
  '(git push)',
  'bash -c "git push origin x"',
  'echo $((1 + 2)) && ls',
  'cat <<EOF > f\ngh pr list; git push\nEOF',
  'FOO=1 git push origin x',
  '',
  'ls -la',
  `git commit -m "$(cat <<'EOF'\nDon't stop; git push\nEOF\n)"`,
  `gh pr create --title t --body "$(cat <<'EOF'\nIt's done && more\nEOF\n)"`,
  '(git push) 2>&1',
  '(git push origin x)>log',
  'git push>log',
  'gh pr create --body "a > b; c"',
  "echo $'it\\'s' && ls",
  'npx wrangler --env dev tail && ls',
  'echo "unclosed && ls',
];

test('one-act: refuses an outward act joined to anything else', () => {
  for (const c of refused) assert.ok(judge(c), `should refuse: ${JSON.stringify(c)}`);
});

test('one-act: lets an act alone, and everything without an act, through', () => {
  for (const c of allowed) assert.equal(judge(c), null, `should allow: ${JSON.stringify(c)}`);
});

test('one-act: hook input; other tools and unreadable input pass', () => {
  assert.equal(hook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git push && ls' } })), 2);
  assert.equal(hook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git push' } })), 0);
  assert.equal(hook(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'x' } })), 0);
  assert.equal(hook('not json'), 0);
  assert.equal(hook(JSON.stringify({ tool_name: 'Bash', tool_input: {} })), 0);
  // A line the hook cannot read is left to the shell unless it names an act.
  assert.equal(hook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'echo "unclosed && ls' } })), 0);
  assert.equal(hook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git push "unclosed && ls' } })), 2);
});

test('one-act: the script exits 2 with its one line on stderr, else 0 and silent', () => {
  const run = (command) => spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }), encoding: 'utf8' });
  const no = run('git add -A && git push');
  assert.equal(no.status, 2);
  assert.equal(no.stderr, `${MESSAGE}\n`);
  assert.equal(no.stdout, '');
  const yes = run('git push origin x');
  assert.equal(yes.status, 0);
  assert.equal(yes.stderr, '');
  assert.equal(yes.stdout, '');
});
