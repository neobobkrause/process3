// setup check (setup audit, 2 Nov): stubbed GitHub responses, as the product's were read on 2 Nov.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { jobStart } from '../lib/job.mjs';
import { CONFIRMED, READERS, loadConditions, setupCheck } from '../lib/setup.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};
const DENY = [
  'Bash(git push --force *)', 'Bash(git push -f *)', 'Bash(git push --force-with-lease *)', 'Bash(git push origin --delete *)',
  'Bash(gh api *contents/*)', 'mcp__github__create_or_update_file', 'mcp__github__push_files', 'mcp__github__delete_file',
  'mcp__github__merge_pull_request', 'Bash(gh pr merge *)', 'Bash(gh api *pulls/*/merge*)',
];
const rules = (id = 2) => [
  { type: 'deletion', ruleset_id: 1 }, { type: 'non_fast_forward', ruleset_id: 1 },
  { type: 'pull_request', parameters: { allowed_merge_methods: ['merge'], required_approving_review_count: 0, require_code_owner_review: false }, ruleset_id: id },
  { type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'gate', integration_id: 15368 }] }, ruleset_id: id },
];

// A product whose setup is complete; each test breaks one thing.
function world() {
  const w = {
    user: { login: 'civicsmith' },
    repo: { permissions: { admin: false, push: true }, allow_merge_commit: true, allow_auto_merge: false, delete_branch_on_merge: false },
    list: [{ id: 1 }, { id: 2 }],
    sets: {
      1: { id: 1, name: 'every-branch', target: 'branch', enforcement: 'active', current_user_can_bypass: 'never', conditions: { ref_name: { include: ['~ALL'], exclude: [] } }, rules: [{ type: 'deletion' }, { type: 'non_fast_forward' }] },
      2: { id: 2, name: 'process3', target: 'branch', enforcement: 'active', current_user_can_bypass: 'never', conditions: { ref_name: { include: ['refs/heads/main', 'refs/heads/tranche'], exclude: [] } }, rules: [] },
    },
    branches: { main: rules(), tranche: rules() },
    artifacts: { artifacts: [{ created_at: '2026-11-02T14:34:28Z', expires_at: '2027-01-31T14:33:29Z' }, { created_at: '2026-11-01T10:00:00Z', expires_at: '2026-11-02T10:00:00Z' }] },
    branchInfo: { main: { protected: true, protection: { enabled: false } }, tranche: { protected: true, protection: { enabled: false } } },
    protection: {},
    commit: { committer: { login: 'web-flow' }, author: { login: 'neobobkrause' }, commit: { verification: { verified: true } } },
    lastChange: 'abc1234567890',
    onTranche: { ok: true, why: 'build/x descends from the tip of tranche' },
    cf: {},
    cfAsked: [],
    files: { 'CLAUDE.md': '# Product\n\n## Standing approvals from Bob\n\nThe owner\'s words.\n', '.claude/settings.json': JSON.stringify({ permissions: { deny: DENY } }), 'process/config.json': JSON.stringify({ tranche: 'tranche', coordinator: 'session_bob', environment: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'], cloudflare_account: 'acc123' }) },
    env: { CLOUDFLARE_API_TOKEN: 'tok-SECRET-value', CLOUDFLARE_ACCOUNT_ID: 'acc123' },
    asked: [],
  };
  w.io = {
    api: (p) => {
      w.asked.push(p);
      let m;
      if (p === 'user') return w.user;
      if (p === 'repos/o/r') return w.repo;
      if (p.startsWith('repos/o/r/rulesets?')) return w.list;
      if ((m = p.match(/^repos\/o\/r\/rulesets\/(\d+)\?/))) return w.sets[m[1]] || null;
      if ((m = p.match(/^repos\/o\/r\/rules\/branches\/(.+)$/))) return w.branches[decodeURIComponent(m[1])] ?? null;
      if (p.startsWith('repos/o/r/actions/artifacts?name=gate-row')) return w.artifacts;
      if ((m = p.match(/^repos\/o\/r\/branches\/([^/]+)\/protection$/))) return w.protection[decodeURIComponent(m[1])] ?? null;
      if ((m = p.match(/^repos\/o\/r\/branches\/([^/]+)$/))) return w.branchInfo[decodeURIComponent(m[1])] ?? null;
      if (/^repos\/[^/]+\/[^/]+\/commits\/[0-9a-f]+$/.test(p)) return w.commit;
      throw new Error(`unexpected read ${p}`);
    },
    file: (f) => w.files[f] ?? null,
    branchExists: () => true,
    lastChange: () => w.lastChange,
    onTranche: () => w.onTranche,
    cf: (path) => { w.cfAsked.push(path); const k = Object.keys(w.cf).find((x) => path.includes(x)); return k ? w.cf[k] : { status: 200, success: true }; },
  };
  Object.defineProperty(w.io, 'env', { get: () => w.env, enumerable: true });
  return w;
}
const root = () => makeRepo({ 'README.md': 'x' });
const check = (w) => setupCheck(root(), { slug: 'o/r', io: w.io, log: quiet });
const state = (r, id) => r.results.find((x) => x.id === id);

test('every condition is listed with what, why, value, who and how it is read, and every read one has a reader', () => {
  const cs = loadConditions();
  for (const c of cs) for (const k of ['id', 'what', 'why', 'value', 'who', 'read']) assert.ok(c[k] !== undefined && c[k] !== '', `${c.id}: ${k}`);
  assert.deepEqual(cs.filter((c) => c.read !== CONFIRMED).map((c) => c.id).sort(), [...READERS].sort());
  assert.deepEqual(cs.filter((c) => c.read === CONFIRMED).map((c) => c.id), ['ruleset-bypass', 'actions-settings', 'secrets', 'collaborators', 'environments']);
});

test('a complete setup is all set, and the four unreadable conditions are confirmed, never read', () => {
  const w = world();
  const out = [];
  const r = setupCheck(root(), { slug: 'o/r', io: w.io, log: (m) => out.push(m) });
  assert.equal(r.ok, true, out.join('\n'));
  assert.deepEqual(r.results.filter((x) => x.state === 'set').map((x) => x.id).sort(), [...READERS].sort());
  assert.match(state(r, 'artifact-retention').detail, /kept 90 days/);
  assert.ok(!w.asked.some((p) => /actions\/permissions|secrets|collaborators|environments/.test(p)), w.asked.join(', '));
  assert.match(out.join('\n'), /- confirmed: secrets: confirmed once on the onboarding page/);
});

test('the account must push and not be an admin', () => {
  const w = world();
  w.repo.permissions.admin = true;
  const r = check(w);
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ['account']);
  assert.match(state(r, 'account').detail, /civicsmith: push true, admin true/);
  const w2 = world();
  w2.user = null;
  assert.match(state(check(w2), 'account').detail, /could not read the account/);
});

test('the every-branch ruleset needs ~ALL, nothing excluded, deletion and force-push, and no bypass', () => {
  for (const [what, change] of [
    ['not ~ALL', (s) => { s.conditions.ref_name.include = ['refs/heads/main']; }],
    ['an exclusion', (s) => { s.conditions.ref_name.exclude = ['refs/heads/x']; }],
    ['no force-push rule', (s) => { s.rules = [{ type: 'deletion' }]; }],
    ['evaluate only', (s) => { s.enforcement = 'evaluate'; }],
    ['a bypass', (s) => { s.current_user_can_bypass = 'always'; }],
  ]) {
    const w = world();
    change(w.sets[1]);
    assert.deepEqual(check(w).missing, ['ruleset-all-branches'], what);
  }
  const w = world();
  w.list = null;
  assert.match(state(check(w), 'ruleset-all-branches').detail, /could not read the rulesets/);
});

test('main and the tranche need a pull request, merge commits only, and the required check from Actions', () => {
  const cases = [
    [(w) => { w.branches.main = rules().filter((r) => r.type !== 'pull_request'); }, /main: no pull request rule/],
    [(w) => { w.branches.tranche[2].parameters.allowed_merge_methods = ['merge', 'squash']; }, /tranche: merge methods are not merge only/],
    [(w) => { w.branches.tranche[3].parameters.required_status_checks = [{ context: 'ci', integration_id: 15368 }]; }, /tranche: check gate is not required/],
    [(w) => { w.branches.main[3].parameters.required_status_checks = [{ context: 'gate' }]; }, /main: check gate is not tied to GitHub Actions/],
    [(w) => { w.sets[2].current_user_can_bypass = 'pull_requests_only'; }, /can bypass ruleset "process3"/],
    [(w) => { delete w.branches.tranche; }, /tranche: could not read its rules/],
    [(w) => { w.branches.main[2].parameters.required_approving_review_count = 1; }, /main: a pull request rule requires 1 approving review\(s\), not 0/],
    [(w) => { w.branches.tranche[2].parameters.require_code_owner_review = true; }, /tranche: a pull request rule requires a code owner's review/],
    [(w) => { w.branches.main.push({ type: 'pull_request', parameters: { allowed_merge_methods: ['squash'], required_approving_review_count: 0 }, ruleset_id: 2 }); }, /main: merge methods are not merge only/],
    [(w) => { w.branches.tranche[2].parameters.required_reviewers = [{ reviewer: { id: 1, type: 'Team' } }]; }, /tranche: a pull request rule names required reviewers/],
  ];
  for (const [change, why] of cases) {
    const w = world();
    change(w);
    const r = check(w);
    assert.deepEqual(r.missing, ['ruleset-main-tranche']);
    assert.match(state(r, 'ruleset-main-tranche').detail, why);
  }
  // The required check is the one config names.
  const w = world();
  w.files['process/config.json'] = JSON.stringify({ coordinator: 's', required_check: 'ci' });
  assert.match(state(check(w), 'ruleset-main-tranche').detail, /check ci is not required/);
});

test('merge settings: merge commits on, auto-merge off, no branch deleted on merge', () => {
  const w = world();
  w.repo.allow_auto_merge = true;
  w.repo.delete_branch_on_merge = true;
  const r = check(w);
  assert.deepEqual(r.missing, ['merge-settings']);
  assert.match(state(r, 'merge-settings').detail, /allow_auto_merge is true, not false; delete_branch_on_merge is true, not false/);
});

test('the deny list must hold the safety, file-write and merge-route rules, and not the rule that blocks every push', () => {
  // No settings-file rule is required: the record check holds the settings file (build 5).
  assert.equal(check(world()).ok, true);
  const w = world();
  w.files['.claude/settings.json'] = JSON.stringify({ permissions: { deny: [...DENY.filter((d) => !/merge/.test(d)), 'Bash(git push origin :*)'] } });
  const d = state(check(w), 'deny-list');
  assert.equal(d.state, 'missing');
  for (const m of ['lacks mcp__github__merge_pull_request', 'lacks Bash(gh pr merge *)', 'lacks Bash(gh api *pulls/*/merge*)', 'holds Bash(git push origin :*), which blocks a session\'s push of its own branch']) assert.ok(d.detail.includes(m), `${m} in ${d.detail}`);
  const w2 = world();
  delete w2.files['.claude/settings.json'];
  assert.match(state(check(w2), 'deny-list').detail, /no .claude\/settings.json on tranche/);
});

test('artifact retention: under 90 days is missing, and no artifact yet is unmeasured, not missing', () => {
  const w = world();
  w.artifacts.artifacts = [{ created_at: '2026-11-02T00:00:00Z', expires_at: '2026-12-02T00:00:00Z' }];
  assert.match(state(check(w), 'artifact-retention').detail, /kept 30 days/);
  assert.deepEqual(check(w).missing, ['artifact-retention']);
  const none = world();
  none.artifacts = { total_count: 0, artifacts: [] };
  const r = check(none);
  assert.equal(r.ok, true);
  assert.equal(state(r, 'artifact-retention').state, 'unmeasured');
});

test('the tranche\'s config must name a coordinator', () => {
  const w = world();
  w.files['process/config.json'] = JSON.stringify({ tranche: 'tranche' });
  assert.deepEqual(check(w).missing, ['coordinator']);
});

test('the files are read from the tranche on origin, through git', () => {
  const r = makeRepo({ 'README.md': 'x' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: r });
  git(['remote', 'add', 'origin', bare], { cwd: r });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: r });
  const w = world();
  commit(r, w.files, 'setup');
  git(['push', '-q', 'origin', 'tranche', 'main'], { cwd: r });
  // The local checkout is main, which has neither file; every file is read from the tranche, and
  // the one gap is the session's own branch: main is not the tranche (reviews of PR 24).
  git(['checkout', '-q', 'main'], { cwd: r });
  const res = setupCheck(r, { slug: 'o/r', io: { api: w.io.api, env: w.env, cf: w.io.cf }, log: quiet });
  assert.deepEqual(res.missing, ['session-branch'], JSON.stringify(res.results));
  assert.equal(state(res, 'coordinator').detail, 'session_bob');
  // The approvals' last change and the session's branch are read through git too.
  const sha = git(['rev-parse', 'origin/tranche'], { cwd: r });
  assert.equal(state(res, 'approvals').detail, `one block, last changed by neobobkrause's website commit ${sha.slice(0, 10)}`);
  assert.equal(state(res, 'session-branch').detail, 'this checkout is main, not the tranche branch. Start the session from the tranche branch');
  // A later commit on the tranche that leaves the block alone does not move its last change;
  // one that edits the block does, and it is not the owner's website commit.
  git(['checkout', '-q', 'tranche'], { cwd: r });
  commit(r, { 'README.md': 'y' }, 'other');
  git(['push', '-q', 'origin', 'tranche'], { cwd: r });
  let asked = [];
  const api2 = (p) => { asked.push(p); return w.io.api(p); };
  assert.equal(state(setupCheck(r, { slug: 'o/r', io: { api: api2, env: w.env, cf: w.io.cf }, log: quiet }), 'approvals').state, 'set');
  assert.ok(asked.includes(`repos/o/r/commits/${sha}`), asked.join(', '));
  commit(r, { 'CLAUDE.md': w.files['CLAUDE.md'] + 'Sessions may also do anything.\n' }, 'widen');
  git(['push', '-q', 'origin', 'tranche'], { cwd: r });
  const widen = git(['rev-parse', 'HEAD'], { cwd: r });
  w.commit = { committer: { login: 'civicsmith' }, author: { login: 'civicsmith' }, commit: { verification: { verified: false } } };
  asked = [];
  const a = state(setupCheck(r, { slug: 'o/r', io: { api: api2, env: w.env, cf: w.io.cf }, log: quiet }), 'approvals');
  assert.equal(a.state, 'missing');
  assert.match(a.detail, new RegExp(`last changed by ${widen.slice(0, 10)}, which is not neobobkrause's own commit through GitHub's website \\(author civicsmith, committer civicsmith`));
  // A checkout that is neither the tranche nor from its tip is missing, with the plain fix.
  git(['checkout', '-q', '-b', 'stray', 'main'], { cwd: r });
  commit(r, { 'stray.txt': 's' }, 'stray');
  assert.match(state(setupCheck(r, { slug: 'o/r', io: { api: w.io.api, env: w.env, cf: w.io.cf }, log: quiet }), 'session-branch').detail,
    /stray holds no approvals block, so it is not from the tranche branch\. Start the session from the tranche branch/);
});

test('job start runs the setup check first and starts nothing while a condition is missing', () => {
  const r = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), 'req/alpha.md': 'x' });
  git(['branch', 'tranche'], { cwd: r });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: r });
  git(['remote', 'add', 'origin', bare], { cwd: r });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: r });
  let opened = 0;
  const open = () => { opened++; return { number: 9, html_url: 'pr' }; };
  assert.throws(() => jobStart(r, 'alpha', { coordinator: 's', open, find: () => null, setup: () => ({ ok: false, missing: ['deny-list', 'account'] }), log: quiet }),
    /setup is not complete \(deny-list, account\); nothing was started/);
  assert.equal(opened, 0);
  assert.equal(git(['branch', '--list', 'job/alpha'], { cwd: r }), '');
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: r }), '');
  const seen = [];
  jobStart(r, 'alpha', { coordinator: 's', open, find: () => null, setup: (root, o) => { seen.push(o.slug); return { ok: true, missing: [] }; }, log: quiet });
  assert.equal(opened, 1);
  assert.equal(seen.length, 1);
});

// The developer's steps (Bob, 2 Nov): setup/DEVELOPER.md holds only the owner's acts, checked
// against the list by the real checker.
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { DEVELOPER, bashRuleMatches, checkDeveloperSteps, cloudflareRead, lastApprovalsChange, sessionOnTranche } from '../lib/setup.mjs';

test('DEVELOPER.md: every step complete, every developer condition covered, only theirs named, the deny lines the list\'s', () => {
  assert.deepEqual(checkDeveloperSteps(readFileSync(DEVELOPER, 'utf8')), []);
});

test('the step checker fails on a missing step, an unknown or non-developer condition, drifted deny lines, and an em-dash', () => {
  const text = readFileSync(DEVELOPER, 'utf8');
  const step = (sets, extra = '') => `## Step 99. X\n\nWhy: x\n\nClicks: y${extra}\n\nHow BOB confirms: z\n\nSets: ${sets}.\n`;
  assert.ok(checkDeveloperSteps(text + step('`no-such-id`')).some((p) => /names no-such-id, which is not in the list/.test(p)));
  assert.ok(checkDeveloperSteps(text + step('`coordinator`')).some((p) => /names coordinator, which is not the developer's/.test(p)));
  assert.ok(checkDeveloperSteps(text.replace('Sets: `deny-list`.', 'Sets: none.')).includes('deny-list is the developer\'s and has no step'));
  assert.ok(checkDeveloperSteps(text.replace('"Bash(gh pr merge *)",\n', '')).includes('the deny lines on the page differ from the deny-list condition'));
  assert.ok(checkDeveloperSteps(text.replace('Why: every other step', 'Why: — every other step')).includes('an em-dash'));
  assert.ok(checkDeveloperSteps(text.replace(/^How BOB confirms: `p3 setup check` shows `merge-settings` set\.$/m, '')).some((p) => /Step 5\. .*lacks How BOB confirms/.test(p)));
  assert.doesNotMatch(text, /civicsmith/i, 'the page names no product or account');
});

// Deploy tokens are a standard condition (Bob, 2 Nov): present by name, the account matching.
test('environment: every listed variable is present, and only names are ever printed', () => {
  const w = world();
  const out = [];
  const r = setupCheck(root(), { slug: 'o/r', io: w.io, log: (m) => out.push(m) });
  assert.equal(state(r, 'environment').state, 'set');
  assert.match(state(r, 'environment').detail, /present: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID/);
  delete w.env.CLOUDFLARE_API_TOKEN;
  const r2 = setupCheck(root(), { slug: 'o/r', io: w.io, log: (m) => out.push(m) });
  assert.deepEqual(r2.missing, ['environment', 'deploy-token']);
  assert.match(state(r2, 'environment').detail, /not in this session's environment: CLOUDFLARE_API_TOKEN$/);
  assert.doesNotMatch(out.join('\n'), /tok-|SECRET|value|\b16\b/, 'no value, prefix or length');
  // No list in the config: not configured, which does not stop a start.
  const n = world();
  n.files['process/config.json'] = JSON.stringify({ coordinator: 's' });
  const r3 = check(n);
  assert.equal(r3.ok, true);
  assert.equal(state(r3, 'environment').state, 'not configured');
  assert.equal(state(r3, 'deploy-account').state, 'not configured');
});

test('deploy-account: CLOUDFLARE_ACCOUNT_ID must be the configured account, reported as yes or no', () => {
  const w = world();
  assert.equal(state(check(w), 'deploy-account').detail, 'CLOUDFLARE_ACCOUNT_ID matches acc123: yes');
  w.env.CLOUDFLARE_ACCOUNT_ID = 'other-account-999';
  const out = [];
  const r = setupCheck(root(), { slug: 'o/r', io: w.io, log: (m) => out.push(m) });
  assert.ok(r.missing.includes('deploy-account'));
  assert.equal(state(r, 'deploy-account').detail, 'CLOUDFLARE_ACCOUNT_ID matches acc123: no');
  assert.doesNotMatch(out.join('\n'), /other-account-999/, 'only the configured account is printed');
  delete w.env.CLOUDFLARE_ACCOUNT_ID;
  assert.match(state(check(w), 'deploy-account').detail, /CLOUDFLARE_ACCOUNT_ID is not in this session's environment \(configured: acc123\)/);
});

// Confirming review of PR 15.
test('the bypass check fails closed: a ruleset without current_user_can_bypass does not count', () => {
  const w = world();
  delete w.sets[1].current_user_can_bypass;
  delete w.sets[2].current_user_can_bypass;
  const r = check(w);
  assert.deepEqual(r.missing.sort(), ['ruleset-all-branches', 'ruleset-main-tranche']);
  assert.match(state(r, 'ruleset-main-tranche').detail, /can bypass ruleset "process3"/);
});

test('any deny rule that would block the START\'s push is found, matched as Claude Code matches it', () => {
  for (const rule of ['Bash(git push origin :*)', 'Bash(git push *)', 'Bash(git push:*)', 'Bash(git *)', 'Bash(git push -u origin *)', 'Bash']) {
    const w = world();
    w.files['.claude/settings.json'] = JSON.stringify({ permissions: { deny: [...DENY, rule] } });
    assert.match(state(check(w), 'deny-list').detail, new RegExp(`holds ${rule.replace(/[()*]/g, '\\$&')}, which blocks`), rule);
  }
  assert.equal(bashRuleMatches('Bash(git push origin --delete *)', 'git push origin job/x'), false);
  assert.equal(bashRuleMatches('Bash(git push -f *)', 'git push -u origin job/x'), false);
  assert.equal(bashRuleMatches('Bash(git push origin main)', 'git push origin job/x'), false);
  assert.equal(bashRuleMatches('Bash(git push origin :*)', 'git push -u origin job/x'), false, 'a prefix match only');
  assert.equal(bashRuleMatches('Bash(ls *)', 'ls'), true, 'a trailing " *" matches the bare command');
});

test('job start names the config as the coordinator\'s home', () => {
  const r = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), 'req/alpha.md': 'x' });
  git(['branch', 'tranche'], { cwd: r });
  assert.throws(() => jobStart(r, 'alpha', { push: false, log: quiet }), /no coordinator: name it in process\/config.json on the tranche, as p3 setup check requires \(--coordinator <session id> overrides it for one start\)/);
});

// Onboarding steps, 2 Nov: classic protection, the approvals, the session's branch, the deploy token.
test('classic branch protection on main or the tranche is reported missing, to remove; rulesets alone are set', () => {
  assert.equal(state(check(world()), 'classic-protection').state, 'set');
  const w = world();
  w.branchInfo.main.protection.enabled = true;
  let r = check(w);
  assert.deepEqual(r.missing, ['classic-protection']);
  assert.equal(state(r, 'classic-protection').detail, 'main: a classic branch protection rule, to remove');
  const w2 = world();
  w2.protection.tranche = { url: 'https://api.github.com/repos/o/r/branches/tranche/protection' };
  assert.match(state(check(w2), 'classic-protection').detail, /^tranche: a classic branch protection rule, to remove$/);
  const w3 = world();
  delete w3.branchInfo.tranche.protection;
  assert.match(state(check(w3), 'classic-protection').detail, /tranche: protected, and whether by a classic rule could not be read/);
  const w4 = world();
  delete w4.branchInfo.tranche;
  assert.match(state(check(w4), 'classic-protection').detail, /tranche: could not read the branch/);
  // A tranche not pushed yet is unmeasured; one that exists but cannot be read is missing.
  const w6 = world();
  delete w6.branchInfo.tranche;
  w6.io.branchExists = (b) => b !== 'tranche';
  assert.deepEqual(state(check(w6), 'classic-protection'), { id: 'classic-protection', what: state(check(w6), 'classic-protection').what, state: 'unmeasured', detail: 'tranche not pushed yet' });
  const w5 = world();
  w5.branchInfo.main = { protected: false };
  w5.branchInfo.tranche = { protected: false };
  assert.equal(state(check(w5), 'classic-protection').state, 'set');
});

test('approvals: one block on the tranche, last changed by the owner\'s website commit', () => {
  const ok = check(world());
  assert.match(state(ok, 'approvals').detail, /one block, last changed by neobobkrause's website commit abc1234567/);
  for (const [change, why] of [
    [(w) => { delete w.files['CLAUDE.md']; }, /no CLAUDE.md on tranche/],
    [(w) => { w.files['CLAUDE.md'] = '# Product\n'; }, /has no "## Standing approvals from Bob" block/],
    [(w) => { w.files['CLAUDE.md'] += '\n## More approvals\n\nx\n'; }, /has 2 approvals headings; only one block may exist/],
    [(w) => { w.lastChange = null; }, /could not find the commit/],
    [(w) => { w.commit.committer.login = 'civicsmith'; }, /not neobobkrause's own commit through GitHub's website \(author neobobkrause, committer civicsmith/],
    [(w) => { w.commit.author.login = 'civicsmith'; }, /author civicsmith/],
  ]) {
    const w = world();
    change(w);
    const r = check(w);
    assert.deepEqual(r.missing, ['approvals']);
    assert.match(state(r, 'approvals').detail, why);
  }
  // The heading and owner come from the tranche's config.
  const w = world();
  w.files['process/config.json'] = JSON.stringify({ ...JSON.parse(w.files['process/config.json']), approvals: { heading: '## Owner rules', owner: 'someone' } });
  w.files['CLAUDE.md'] = '## Owner rules\n\nx\n';
  assert.match(state(check(w), 'approvals').detail, /not someone's own commit/);
});

test('session-branch: a session not started from the tranche is missing, and job start says to start from the tranche', () => {
  const w = world();
  w.onTranche = { ok: false, why: 'main is neither tranche nor a branch from its tip' };
  const r = check(w);
  assert.deepEqual(r.missing, ['session-branch']);
  assert.equal(state(r, 'session-branch').detail, 'main is neither tranche nor a branch from its tip. Start the session from the tranche branch');
  const repo = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), 'req/alpha.md': 'x' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: repo });
  git(['remote', 'add', 'origin', bare], { cwd: repo });
  const detail = 'main holds no approvals block, so it is not from the tranche branch. Start the session from the tranche branch';
  assert.throws(() => jobStart(repo, 'alpha', { coordinator: 's', open: () => null, find: () => null, setup: () => ({ ok: false, missing: ['session-branch', 'account'], results: [{ id: 'session-branch', detail }] }), log: quiet }),
    /this session's checkout is not one job start accepts: sessions act on the standing approvals of the tranche branch; nothing was started\. main holds no approvals block, so it is not from the tranche branch\. Start the session from the tranche branch \(also missing: account\)$/);
});

test('deploy-token: one harmless read per scope, each reported present or missing, the token never printed', () => {
  const w = world();
  const out = [];
  let r = setupCheck(root(), { slug: 'o/r', io: w.io, log: (m) => out.push(m) });
  assert.equal(state(r, 'deploy-token').detail, 'Workers Scripts: present; Workers R2 Storage: present; Containers: present; Workers KV Storage: present');
  assert.deepEqual(w.cfAsked, ['accounts/acc123/workers/scripts', 'accounts/acc123/r2/buckets', 'accounts/acc123/containers/applications', 'accounts/acc123/storage/kv/namespaces']);
  w.cf = { 'storage/kv': { status: 403, success: false }, containers: { status: 200, success: false } };
  r = setupCheck(root(), { slug: 'o/r', io: w.io, log: (m) => out.push(m) });
  assert.deepEqual(r.missing, ['deploy-token']);
  assert.equal(state(r, 'deploy-token').detail, 'Workers Scripts: present; Workers R2 Storage: present; Containers: missing (200); Workers KV Storage: missing (403)');
  assert.doesNotMatch(out.join('\n'), /tok-|SECRET/, 'the token is never printed');
  delete w.env.CLOUDFLARE_API_TOKEN;
  assert.equal(state(check(w), 'deploy-token').detail, "CLOUDFLARE_API_TOKEN is not in this session's environment");
  const n = world();
  n.files['process/config.json'] = JSON.stringify({ coordinator: 's' });
  assert.equal(state(check(n), 'deploy-token').state, 'not configured');
  for (const [acct, envList] of [[null, null], ['', []], ['   ', null]]) {
    n.files['process/config.json'] = JSON.stringify({ coordinator: 's', cloudflare_account: acct, environment: envList });
    const rn = check(n);
    assert.equal(rn.ok, true, JSON.stringify(rn.missing));
    for (const id of ['deploy-token', 'deploy-account', 'environment']) assert.equal(state(rn, id).state, 'not configured', `${id} with ${JSON.stringify(acct)}`);
  }
  n.files['process/config.json'] = JSON.stringify({ coordinator: 's', cloudflare_account: false });
  const rf = check(n);
  for (const id of ['deploy-token', 'deploy-account']) assert.equal(state(rf, id).detail, 'process/config.json cloudflare_account is not an account ID', id);
  assert.equal(n.cfAsked.length, 0);
});

test('the step checker: a step naming no condition says why; website commits set base to the tranche; the settings file is whole JSON; the step count is stated', () => {
  const text = readFileSync(DEVELOPER, 'utf8');
  assert.match(text, /^There are 11 steps\b/m);
  assert.ok(checkDeveloperSteps(text.replace(/^Sets: none, because .*$/m, 'Sets: none.')).some((p) => /^Step 1\. .*names no condition and does not say why/.test(p)));
  assert.ok(checkDeveloperSteps(text.replace(/^Sets: none, because .*$/m, 'Sets: none')).some((p) => /^Step 1\. .*names no condition and does not say why/.test(p)));
  const noBase = text.split('set **base** to the tranche, not `main`').join('set the base');
  assert.ok(checkDeveloperSteps(noBase).some((p) => /^Step 9\. .*does not say to set base to the tranche/.test(p)));
  assert.ok(checkDeveloperSteps(noBase).some((p) => /^Step 10\. .*does not say to set base to the tranche/.test(p)));
  assert.ok(checkDeveloperSteps(text.replace('```json\n   {', '```json\n')).includes('the deny step does not show the whole .claude/settings.json as valid JSON'));
  assert.ok(checkDeveloperSteps(text.replace('There are 11 steps', 'There are 10 steps')).includes('the page says 10 steps, and has 11'));
  assert.ok(checkDeveloperSteps(text.replace('## Step 6.', '## Step 16.')).some((p) => /out of order, expected Step 6/.test(p)));
  // The page itself: the approvals before the deny list, both before the last ruleset; the
  // private window; required approvals 0; the deploy token's four scopes.
  const at = (s) => text.indexOf(s);
  assert.ok(at('## Step 9. The standing approvals') < at('## Step 10. The deny list') && at('## Step 10.') < at('## Step 11. A ruleset on main'));
  assert.match(text, /## Step 3\. In a private window/);
  assert.match(text, /Leave \*\*Required approvals\*\* at `0`/);
  assert.match(text, /make sure \*\*Restrict deletions\*\* and \*\*Block force pushes\*\* are ticked/);
  for (const p of ['**Workers Scripts**: **Edit**', '**Workers R2 Storage**: **Edit**', '**Containers**: **Edit**', '**Workers KV Storage**: **Read**']) assert.ok(text.includes(p), p);
  assert.match(text, /BOB's setup puts nothing under `\.claude\/`/);
  assert.match(text, /BOB's setup puts nothing in the approvals block/);
});

// Reviews of PR 24: the approvals' last change by ancestry, a shallow clone, the session's
// branch, the Cloudflare read itself, and the step checker's "none" lines.
const HEAD_ = '## Standing approvals from Bob';
const claude = (words) => `# P\n\n${HEAD_}\n\n${words}\n`;
function originRepo() {
  const r = makeRepo({ 'README.md': 'x' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: r });
  git(['remote', 'add', 'origin', bare], { cwd: r });
  return { r, bare };
}
const tip = (r, ref = 'HEAD') => git(['rev-parse', ref], { cwd: r });

test('lastApprovalsChange follows ancestry, not dates: a merge that keeps a side commit\'s block names that commit', () => {
  for (const keep of ['side', 'owner']) {
    const { r } = originRepo();
    git(['checkout', '-q', '-b', 'tranche'], { cwd: r });
    commit(r, { 'CLAUDE.md': claude('A') }, 'owner first');
    git(['checkout', '-q', '-b', 'job/x'], { cwd: r });
    commit(r, { 'CLAUDE.md': claude('EVIL') }, 'session widens');
    const n = tip(r);
    git(['checkout', '-q', 'tranche'], { cwd: r });
    commit(r, { 'CLAUDE.md': claude('B') }, 'owner second');
    const w = tip(r);
    git(['merge', '-q', '--no-ff', '--no-commit', 'job/x'], { cwd: r, allowFail: true });
    commit(r, { 'CLAUDE.md': claude(keep === 'side' ? 'EVIL' : 'B') }, 'merge');
    git(['push', '-q', 'origin', 'tranche'], { cwd: r });
    assert.equal(lastApprovalsChange(r, 'tranche', 'CLAUDE.md', HEAD_), keep === 'side' ? n : w, keep);
  }
  // A merge whose block is neither parent's is itself the change; no block at the tip is null.
  const { r } = originRepo();
  git(['checkout', '-q', '-b', 'tranche'], { cwd: r });
  commit(r, { 'CLAUDE.md': '# P\n' }, 'no block');
  git(['push', '-q', 'origin', 'tranche'], { cwd: r });
  assert.equal(lastApprovalsChange(r, 'tranche', 'CLAUDE.md', HEAD_), null);
});

test('lastApprovalsChange deepens a shallow clone, and reports the edge rather than a wrong commit when it cannot', () => {
  const { r, bare } = originRepo();
  git(['checkout', '-q', '-b', 'tranche'], { cwd: r });
  commit(r, { 'CLAUDE.md': claude('A') }, 'owner');
  const owner = tip(r);
  for (let i = 0; i < 3; i++) commit(r, { 'CLAUDE.md': `${claude('A')}\n## Notes\n\nn${i}\n` }, `notes ${i}`);
  git(['push', '-q', 'origin', 'tranche'], { cwd: r });
  const dir = mkdtempSync(join(tmpdir(), 'p3-shallow-'));
  const c = join(dir, 'c');
  git(['clone', '-q', '--depth', '1', '--branch', 'tranche', `file://${bare}`, c], { cwd: dir });
  assert.equal(lastApprovalsChange(c, 'tranche', 'CLAUDE.md', HEAD_), owner);
  const c2 = join(dir, 'c2');
  git(['clone', '-q', '--depth', '1', '--branch', 'tranche', `file://${bare}`, c2], { cwd: dir });
  git(['remote', 'set-url', 'origin', join(dir, 'nowhere.git')], { cwd: c2 });
  assert.deepEqual(lastApprovalsChange(c2, 'tranche', 'CLAUDE.md', HEAD_), { shallow: tip(c2, 'origin/tranche') });
  const w = world();
  w.lastChange = { shallow: 'abcdef1234567' };
  assert.match(state(check(w), 'approvals').detail, /is shallow at abcdef1234 and could not be deepened/);
});

test('sessionOnTranche: the tip or a branch from it is set; main, a stray branch, or stale approvals are not', () => {
  const { r } = originRepo();
  git(['push', '-q', 'origin', 'main'], { cwd: r });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: r });
  commit(r, { 'CLAUDE.md': claude('A') }, 'owner');
  git(['push', '-q', 'origin', 'tranche'], { cwd: r });
  const on = () => sessionOnTranche(r, 'tranche');
  const why = () => on().why;
  assert.deepEqual(on(), { ok: true, why: 'tranche descends from the tip of tranche' });
  git(['checkout', '-q', '--detach', 'tranche'], { cwd: r });
  assert.match(on().why, /^this checkout \(detached at [0-9a-f]+\) descends from the tip of tranche$/);
  // A build branch cut from the tranche, with its own commits, after the tranche moved on.
  git(['checkout', '-q', '-b', 'build/x', 'tranche'], { cwd: r });
  commit(r, { 'b.txt': 'b' }, 'build');
  git(['checkout', '-q', 'tranche'], { cwd: r });
  commit(r, { 't.txt': 't' }, 'tranche moves');
  git(['push', '-q', 'origin', 'tranche'], { cwd: r });
  git(['checkout', '-q', 'build/x'], { cwd: r });
  assert.deepEqual(on(), { ok: true, why: 'build/x is from tranche\'s history and holds its current approvals' });
  // The tranche's approvals changed since: the old checkout does not hold them.
  git(['checkout', '-q', 'tranche'], { cwd: r });
  commit(r, { 'CLAUDE.md': claude('B') }, 'owner again');
  git(['push', '-q', 'origin', 'tranche'], { cwd: r });
  git(['checkout', '-q', 'build/x'], { cwd: r });
  assert.deepEqual(on(), { ok: false, why: 'build/x holds older approvals than origin/tranche', fix: 'Bring it up to date with tranche (git pull origin tranche), or start the session from the tranche branch' });
  git(['checkout', '-q', 'main'], { cwd: r });
  assert.equal(why(), 'this checkout is main, not the tranche branch');
  git(['checkout', '-q', '-b', 'from-main'], { cwd: r });
  assert.equal(why(), 'this checkout (from-main) is on main, not the tranche branch');
  commit(r, { 'f.txt': 'f' }, 'work off main');
  assert.equal(why(), 'from-main holds no approvals block, so it is not from the tranche branch');
  git(['checkout', '-q', 'main'], { cwd: r });
  assert.deepEqual(sessionOnTranche(r, 'no-such'), { ok: false, why: 'origin/no-such is not here', fix: 'Start the session from the no-such branch' });
  // After the tranche merges into main (a merge commit) and moves on: a branch cut before the
  // merge, and a local tranche behind origin, are still the tranche; main is not.
  git(['checkout', '-q', 'tranche'], { cwd: r });
  git(['checkout', '-q', '-b', 'build/y'], { cwd: r });
  commit(r, { 'y.txt': 'y' }, 'build y');
  git(['checkout', '-q', 'main'], { cwd: r });
  git(['merge', '-q', '--no-ff', '-m', 'tranche into main', 'tranche'], { cwd: r });
  git(['push', '-q', 'origin', 'main'], { cwd: r });
  // Right after the release merge, before the tranche moves on: main, detached at main, or a
  // branch at main's tip under any name, is refused (third re-review).
  assert.equal(why(), 'this checkout is main, not the tranche branch');
  git(['checkout', '-q', '--detach', 'main'], { cwd: r });
  assert.match(why(), /^this checkout \(detached at [0-9a-f]+\) is on main, not the tranche branch$/);
  git(['checkout', '-q', '-b', 'claude/runner', 'main'], { cwd: r });
  assert.equal(why(), 'this checkout (claude/runner) is on main, not the tranche branch');
  commit(r, { 'r.txt': 'r' }, 'runner work');
  assert.match(why(), /^claude\/runner holds main's commit [0-9a-f]{10}, which tranche does not, so it is not from the tranche branch$/);
  git(['checkout', '-q', 'main'], { cwd: r });
  git(['checkout', '-q', 'tranche'], { cwd: r });
  const behind = tip(r);
  commit(r, { 'z.txt': 'z' }, 'tranche moves on');
  git(['push', '-q', 'origin', 'tranche'], { cwd: r });
  git(['checkout', '-q', '-b', 'off-main', 'main'], { cwd: r });
  assert.equal(why(), 'this checkout (off-main) is on main, not the tranche branch');
  commit(r, { 'o.txt': 'o' }, 'work off main');
  assert.match(why(), /^off-main holds main's commit [0-9a-f]{10}, which tranche does not, so it is not from the tranche branch$/);
  git(['checkout', '-q', 'build/y'], { cwd: r });
  assert.deepEqual(on(), { ok: true, why: 'build/y is from tranche\'s history and holds its current approvals' });
  git(['checkout', '-q', '-B', 'tranche', behind], { cwd: r });
  assert.deepEqual(on(), { ok: true, why: 'tranche is from tranche\'s history and holds its current approvals' });
  // main merged back into the tranche: main is still not the tranche, checked out or detached.
  git(['checkout', '-q', '-B', 'tranche', 'origin/tranche'], { cwd: r });
  git(['merge', '-q', '--no-ff', '-m', 'main back into tranche', 'main'], { cwd: r });
  commit(r, { 'w.txt': 'w' }, 'tranche moves on again');
  git(['push', '-q', 'origin', 'tranche'], { cwd: r });
  git(['checkout', '-q', 'main'], { cwd: r });
  assert.deepEqual(on(), { ok: false, why: 'this checkout is main, not the tranche branch', fix: 'Start the session from the tranche branch' });
  git(['checkout', '-q', '--detach', 'main'], { cwd: r });
  assert.match(why(), /^this checkout \(detached at [0-9a-f]+\) is on main, not the tranche branch$/);
  // An orphan branch carrying the same approvals text shares no history with the tranche.
  git(['checkout', '-q', '--orphan', 'loose'], { cwd: r });
  git(['rm', '-rq', '--cached', '.'], { cwd: r });
  commit(r, { 'CLAUDE.md': claude('B') }, 'copy');
  assert.equal(why(), 'loose shares no history with tranche');
});

test('cloudflareRead gives curl the token on stdin, never in its arguments, and reads status and success', () => {
  const dir = mkdtempSync(join(tmpdir(), 'p3-curl-'));
  const fake = join(dir, 'curl');
  writeFileSync(fake, `#!/bin/sh\nprintf '%s\\n' "$@" > "${dir}/argv"\ncat > "${dir}/stdin"\nprintf '%s\\n%s' "$FAKE_BODY" "$FAKE_STATUS"\n`);
  chmodSync(fake, 0o755);
  const saved = { PATH: process.env.PATH, FAKE_BODY: process.env.FAKE_BODY, FAKE_STATUS: process.env.FAKE_STATUS };
  try {
    process.env.PATH = `${dir}:${saved.PATH}`;
    const env = { CLOUDFLARE_API_TOKEN: 'tok-SECRET-value' };
    for (const [body, status, want] of [['{"success":true,"result":[]}', '200', { status: 200, success: true }], ['[]', '200', { status: 200, success: true }], ['{"success":false}', '403', { status: 403, success: false }], ['not json', '502', { status: 502, success: false }]]) {
      process.env.FAKE_BODY = body;
      process.env.FAKE_STATUS = status;
      assert.deepEqual(cloudflareRead('accounts/acc/r2/buckets', env), want, body);
    }
    const argv = readFileSync(join(dir, 'argv'), 'utf8');
    assert.doesNotMatch(argv, /SECRET/);
    assert.match(argv, /https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/acc\/r2\/buckets/);
    assert.equal(readFileSync(join(dir, 'stdin'), 'utf8'), 'Authorization: Bearer tok-SECRET-value\n');
  } finally {
    for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});

test('the step checker: a "none" line names nothing even with a backticked id, needs a real reason, and each website commit its base note', () => {
  const text = readFileSync(DEVELOPER, 'utf8');
  const s1 = /^Sets: none, because .*$/m;
  assert.ok(checkDeveloperSteps(text.replace(s1, 'Sets: none of it.')).some((p) => /^Step 1\. .*names no condition and does not say why/.test(p)));
  assert.ok(checkDeveloperSteps(text.replace(s1, 'Sets: none `account`.')).some((p) => /^Step 1\. .*names no condition and does not say why/.test(p)));
  const p = checkDeveloperSteps(text.replace('Sets: `deny-list`.', 'Sets: none, because the record check holds `deny-list` anyway.'));
  assert.ok(p.includes('deny-list is the developer\'s and has no step'), p.join('; '));
  const two = text.replace('3. Click **Commit changes...**, choose **Commit directly to the `<tranche>` branch**', '3. Click **Commit changes...** once more. Then click **Commit changes...**, choose **Commit directly to the `<tranche>` branch**');
  assert.ok(checkDeveloperSteps(two).some((q) => /^Step 10\. .*does not say to set base/.test(q)));
  assert.ok(checkDeveloperSteps(text.replace('Why: every other step', 'Why: \u2013 every other step')).includes('an em-dash'));
});

test('job start names the tranche the setup check read', () => {
  const repo = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), 'req/alpha.md': 'x' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: repo });
  git(['remote', 'add', 'origin', bare], { cwd: repo });
  assert.throws(() => jobStart(repo, 'alpha', { coordinator: 's', open: () => null, find: () => null, setup: () => ({ ok: false, missing: ['session-branch'], tranche: 'next' }), log: quiet }),
    /this session's checkout is not one job start accepts: sessions act on the standing approvals of the next branch; nothing was started\. this checkout is not the next branch\. Start the session from the next branch$/);
});

test('when the tranche\'s config names another tranche, every reader reads that tranche and its own approvals settings', () => {
  const { r } = originRepo();
  git(['push', '-q', 'origin', 'main'], { cwd: r });
  git(['checkout', '-q', '-b', 't1'], { cwd: r });
  commit(r, { 'process/config.json': JSON.stringify({ tranche: 't2', coordinator: 'old' }) }, 't1');
  git(['push', '-q', 'origin', 't1'], { cwd: r });
  git(['checkout', '-q', '-b', 't2'], { cwd: r });
  commit(r, { 'process/config.json': JSON.stringify({ tranche: 't2', coordinator: 'new', approvals: { heading: '## Owner rules', owner: 'someone' } }), 'CLAUDE.md': '## Owner rules\n\nx\n' }, 't2');
  git(['push', '-q', 'origin', 't2'], { cwd: r });
  git(['checkout', '-q', 'main'], { cwd: r });
  commit(r, { 'process/config.json': JSON.stringify({ tranche: 't1' }) }, 'local config');
  const w = world();
  const res = setupCheck(r, { slug: 'o/r', io: { api: w.io.api, env: w.env, cf: w.io.cf, branchExists: () => true }, log: quiet });
  assert.equal(state(res, 'coordinator').detail, 'new');
  assert.match(state(res, 'approvals').detail, /last changed by [0-9a-f]{10}, which is not someone's own commit/);
  assert.equal(res.tranche, 't2');
});

test('end to end: job start on a checkout of main, with the real setup check reading git, stops with the plain message', () => {
  const { r } = originRepo();
  commit(r, { 'process/ledger/alpha.json': entry('alpha'), 'req/alpha.md': 'x' }, 'ledger');
  git(['push', '-q', 'origin', 'main'], { cwd: r });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: r });
  const w = world();
  commit(r, w.files, 'setup');
  git(['push', '-q', 'origin', 'tranche'], { cwd: r });
  git(['checkout', '-q', 'main'], { cwd: r });
  const setup = (root, o) => setupCheck(root, { ...o, slug: 'o/r', io: { api: w.io.api, env: w.env, cf: w.io.cf, branchExists: () => true } });
  assert.throws(() => jobStart(r, 'alpha', { coordinator: 's', open: () => null, find: () => null, setup, log: quiet }),
    /this session's checkout is not one job start accepts: sessions act on the standing approvals of the tranche branch; nothing was started\. this checkout is main, not the tranche branch\. Start the session from the tranche branch$/);
});

test('a second tranche with no config of its own keeps the first tranche\'s settings, and the coordinator still reports its config missing', () => {
  const { r } = originRepo();
  git(['push', '-q', 'origin', 'main'], { cwd: r });
  git(['checkout', '-q', '-b', 't1'], { cwd: r });
  commit(r, { 'process/config.json': JSON.stringify({ tranche: 't2', coordinator: 'old', cloudflare_account: 'acc123' }) }, 't1');
  git(['push', '-q', 'origin', 't1'], { cwd: r });
  git(['checkout', '-q', '-b', 't2', 'main'], { cwd: r });
  commit(r, { 'README.md': 'two' }, 't2');
  git(['push', '-q', 'origin', 't2'], { cwd: r });
  git(['checkout', '-q', 'main'], { cwd: r });
  commit(r, { 'process/config.json': JSON.stringify({ tranche: 't1' }) }, 'local config');
  const w = world();
  const res = setupCheck(r, { slug: 'o/r', io: { api: w.io.api, env: w.env, cf: w.io.cf, branchExists: () => true }, log: quiet });
  assert.equal(res.tranche, 't2');
  assert.equal(state(res, 'deploy-account').state, 'set');
  assert.equal(state(res, 'coordinator').detail, 'no process/config.json on t2');
});
