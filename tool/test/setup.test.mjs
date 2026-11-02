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
  'Edit(.claude/settings.json)', 'Bash(gh api *contents/*)', 'mcp__github__create_or_update_file', 'mcp__github__push_files', 'mcp__github__delete_file',
  'mcp__github__merge_pull_request', 'Bash(gh pr merge *)', 'Bash(gh api *pulls/*/merge*)',
];
const rules = (id = 2) => [
  { type: 'deletion', ruleset_id: 1 }, { type: 'non_fast_forward', ruleset_id: 1 },
  { type: 'pull_request', parameters: { allowed_merge_methods: ['merge'] }, ruleset_id: id },
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
    files: { '.claude/settings.json': JSON.stringify({ permissions: { deny: DENY } }), 'process/config.json': JSON.stringify({ tranche: 'tranche', coordinator: 'session_bob' }) },
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
      throw new Error(`unexpected read ${p}`);
    },
    file: (f) => w.files[f] ?? null,
  };
  return w;
}
const root = () => makeRepo({ 'README.md': 'x' });
const check = (w) => setupCheck(root(), { slug: 'o/r', io: w.io, log: quiet });
const state = (r, id) => r.results.find((x) => x.id === id);

test('every condition is listed with what, why, value, who and how it is read, and every read one has a reader', () => {
  const cs = loadConditions();
  for (const c of cs) for (const k of ['id', 'what', 'why', 'value', 'who', 'read']) assert.ok(c[k] !== undefined && c[k] !== '', `${c.id}: ${k}`);
  assert.deepEqual(cs.filter((c) => c.read !== CONFIRMED).map((c) => c.id).sort(), [...READERS].sort());
  assert.deepEqual(cs.filter((c) => c.read === CONFIRMED).map((c) => c.id), ['actions-settings', 'secrets', 'collaborators', 'environments']);
});

test('a complete setup is all set, and the four unreadable conditions are confirmed, never read', () => {
  const w = world();
  const out = [];
  const r = setupCheck(root(), { slug: 'o/r', io: w.io, log: (m) => out.push(m) });
  assert.equal(r.ok, true, out.join('\n'));
  assert.deepEqual(r.results.filter((x) => x.state === 'set').map((x) => x.id), READERS);
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
  const w = world();
  w.files['.claude/settings.json'] = JSON.stringify({ permissions: { deny: [...DENY.filter((d) => !/merge|Edit/.test(d)), 'Bash(git push origin :*)'] } });
  const d = state(check(w), 'deny-list');
  assert.equal(d.state, 'missing');
  for (const m of ['lacks mcp__github__merge_pull_request', 'lacks Bash(gh pr merge *)', 'lacks Bash(gh api *pulls/*/merge*)', 'lacks a rule for the settings file', 'holds Bash(git push origin :*), which blocks every push']) assert.ok(d.detail.includes(m), `${m} in ${d.detail}`);
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
  git(['push', '-q', 'origin', 'tranche'], { cwd: r });
  // The local checkout is main, which has neither file.
  git(['checkout', '-q', 'main'], { cwd: r });
  const res = setupCheck(r, { slug: 'o/r', io: { api: w.io.api }, log: quiet });
  assert.equal(res.ok, true, JSON.stringify(res.results));
  assert.equal(state(res, 'coordinator').detail, 'session_bob');
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

// The developer's steps (Bob, 2 Nov): setup/DEVELOPER.md holds only the owner's acts.
import { readFileSync } from 'node:fs';
import { CONDITIONS } from '../lib/setup.mjs';
function developerSteps(text) {
  return text.split(/^## /m).slice(1).filter((s) => /^Step \d+\./.test(s)).map((s) => ({
    title: s.split('\n')[0],
    parts: ['Why:', 'Clicks:', 'How BOB confirms:', 'Sets:'].filter((p) => new RegExp(`^${p}`, 'm').test(s)),
    sets: [...(s.match(/^Sets:(.*)$/m)?.[1] || '').matchAll(/`([^`]+)`/g)].map((m) => m[1]),
  }));
}

test('every condition the developer sets has a step, and every step names only conditions in the list', () => {
  const text = readFileSync(join(CONDITIONS, '..', 'DEVELOPER.md'), 'utf8');
  const steps = developerSteps(text);
  assert.ok(steps.length > 0);
  for (const s of steps) assert.deepEqual(s.parts, ['Why:', 'Clicks:', 'How BOB confirms:', 'Sets:'], s.title);
  const ids = loadConditions().map((c) => c.id);
  const named = steps.flatMap((s) => s.sets);
  assert.deepEqual(named.filter((id) => !ids.includes(id)), [], 'a step names a condition not in the list');
  const developer = loadConditions().filter((c) => /^the developer\b/.test(c.who)).map((c) => c.id);
  assert.ok(developer.length >= 9);
  assert.deepEqual(developer.filter((id) => !named.includes(id)), [], 'a developer condition with no step');
  assert.ok(!/\u2014/.test(text), 'no em-dashes');
});

test('the step check fails on a missing step and on an unknown condition', () => {
  const steps = developerSteps('## Step 1. A\n\nWhy: x\n\nClicks: y\n\nHow BOB confirms: z\n\nSets: `account`, `no-such-id`.\n');
  assert.deepEqual(steps[0].sets, ['account', 'no-such-id']);
  const ids = loadConditions().map((c) => c.id);
  assert.deepEqual(steps[0].sets.filter((id) => !ids.includes(id)), ['no-such-id']);
  const developer = loadConditions().filter((c) => /^the developer\b/.test(c.who)).map((c) => c.id);
  assert.ok(developer.filter((id) => !steps[0].sets.includes(id)).includes('deny-list'));
});
