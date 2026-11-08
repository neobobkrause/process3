// p3 github audit (R17c; Bob, 6 Nov: does all GitHub traffic go through the pacing and get tracked?).
// GitHub's own evidence (stubbed gh) against the ledger (this clone's log here).
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { auditRepos, githubAudit } from '../lib/ghaudit.mjs';
import { ghAfter, ghRepo, PACING_DEFAULTS, pushRepo, pushTurn, slugOf, useShared } from '../lib/pace.mjs';
import { git } from '../lib/util.mjs';
import { makeRepo } from './helpers.mjs';

const NOW = Date.parse('2026-11-06T23:30:00Z');
const at = (min) => new Date(NOW - min * 60e3).toISOString();
const P3R = 'neobobkrause/process3';
const COPY = 'neobobkrause/acmewidget-copy';
const ME = 'acmewidget-robot';
// share_s pinned at 300 s: the windows below are the audit's at that setting (the default is 900 s since R17e).
const P = { ...PACING_DEFAULTS, gh_interval_ms: 0, share_s: 300 };

// The ledger: this clone's log, written as the tool writes it.
function ledger(t, rows) {
  const f = join(mkdtempSync(join(tmpdir(), 'p3-audit-')), 'log.jsonl');
  writeFileSync(f, rows.map((r) => JSON.stringify({ session: 'cse_me', ...r })).join('\n') + '\n');
  const was = process.env.P3_GITHUB_LOG;
  process.env.P3_GITHUB_LOG = f;
  useShared(null);
  t.after(() => { if (was === undefined) delete process.env.P3_GITHUB_LOG; else process.env.P3_GITHUB_LOG = was; });
  return f;
}
const run = (branch, sha, min, { actor = ME, msg = 'x' } = {}) => ({ head_branch: branch, head_sha: sha.padEnd(40, '0'), created_at: at(min), actor: { login: actor }, head_commit: { message: msg } });
const ev = (type, min, { actor = ME, payload = {} } = {}) => ({ type, created_at: at(min), actor: { login: actor }, payload });
function gh(answers) {
  const seen = [];
  return { seen, io: { gh: (args) => { seen.push(args.join(' ')); const p = args[1]; for (const [re, v] of answers) if (re.test(p)) return typeof v === 'function' ? v(p) : v; return null; } } };
}
const RL = { resources: { core: { limit: 5000, remaining: 4846, reset: Math.floor((NOW + 1800e3) / 1000) }, graphql: { limit: 5000, remaining: 4990, reset: 0 } } };

test('audit: every push and write GitHub shows is in the ledger: a merge the tool made, the state branch, a review with its inline comments, the owner\'s own acts left out', (t) => {
  const root = makeRepo({ 'README.md': 'x\n' });
  ledger(t, [
    ...Array.from({ length: 114 }, (_, i) => ({ at: at(25 - i * 0.1), kind: 'gh', points: 1 })),
    { at: at(24), kind: 'gh', points: 1, graphql: true },
    { at: at(24), kind: 'gh', points: 1, free: true },
    { at: at(20), kind: 'gh', points: 5, content: true, repo: P3R },
    { at: at(19), kind: 'gh', points: 5, content: 1, note: true, repo: COPY },
    { at: at(15), kind: 'gh', points: 5, content: 1, repo: P3R },
    { at: at(18), kind: 'push', repo: P3R, what: 'origin HEAD:refs/heads/build/a' },
    { at: at(16), kind: 'push', repo: P3R, via: 'merge' },
    { at: at(17), kind: 'push', repo: COPY, state: true },
  ]);
  const { io, seen } = gh([
    [/^rate_limit$/, RL],
    [new RegExp(`^repos/${P3R}/actions/runs`), { workflow_runs: [run('build/a', 'aaa', 18), run('tranche', 'mmm', 16), run('main', 'own', 12, { actor: 'neobobkrause' }), run('build/late', 'lll', 2)] }],
    [new RegExp(`^repos/${COPY}/actions/runs`), { workflow_runs: [] }],
    [new RegExp(`^repos/${COPY}/commits`), [{ sha: 's1', commit: { committer: { date: at(17) } } }, { sha: 's2', commit: { committer: { date: at(17) } } }]],
    [new RegExp(`^repos/${P3R}/events`), [
      ev('PullRequestEvent', 20, { payload: { action: 'opened', pull_request: { number: 207 } } }),
      ev('PullRequestEvent', 20, { payload: { action: 'labeled', pull_request: { number: 207 } } }),
      ev('PullRequestReviewEvent', 15, { payload: { review: { id: 77 } } }),
      ev('PullRequestReviewCommentEvent', 15, { payload: { comment: { pull_request_review_id: 77 } } }),
      ev('PullRequestReviewCommentEvent', 15, { payload: { comment: { pull_request_review_id: 77 } } }),
      ev('CreateEvent', 18),
      ev('IssueCommentEvent', 10, { actor: 'github-actions[bot]' }),
      ev('IssueCommentEvent', 9, { actor: 'neobobkrause' }),
      ev('IssueCommentEvent', 2), // in the last minutes: not yet shared by every session, left out
    ]],
    [new RegExp(`^repos/${COPY}/events`), [ev('IssueCommentEvent', 19, { payload: { action: 'created' } })]],
  ]);
  const out = [];
  const r = githubAudit(root, { repos: [COPY, P3R], product: COPY, now: NOW, io, log: (l) => out.push(l), p: P });
  const text = out.join('\n');
  assert.equal(r.ok, true, text);
  assert.match(text, /^github audit 2026-11-06T22:30:00Z to 2026-11-06T23:24:00Z \(the last 6 min left out: not yet shared by every session\), every login but bots and each repository's owner/);
  assert.match(text, /- calls, primary: GitHub 154 of 5000 used since 2026-11-06T23:00:00Z vs ledger 117 REST call\(s\): 37 outside the tool/);
  assert.match(text, /- calls, GraphQL: GitHub 10 of 5000 used vs ledger 1/);
  assert.match(text, /- pushes, neobobkrause\/process3: GitHub 2 \(push-triggered runs, one per branch and commit: build\/a, tranche\) vs ledger 2$/m);
  assert.match(text, /- pushes, neobobkrause\/acmewidget-copy process-state: 2 commit\(s\) in the window \(pushes ≤ commits: one coalesced push carries several\) vs ledger 1 state push\(es\)$/m);
  assert.match(text, /- writes, neobobkrause\/process3: GitHub 2 \(pull requests, comments, reviews\) vs ledger 2$/m);
  assert.match(text, /- writes, neobobkrause\/acmewidget-copy: GitHub 1 \(pull requests, comments, reviews\) vs ledger 1$/m);
  assert.match(text, /audit: every push and write GitHub shows is in the ledger/);
  // Repository-scoped endpoints only, beside rate_limit: no users/* path, not even /user.
  assert.ok(seen.every((s) => /^api (rate_limit|repos\/)/.test(s)), seen.join('\n'));
  assert.throws(() => githubAudit(root, { since: at(150), repos: [], now: NOW, io, log: () => {}, p: P }), /the ledger keeps 2 hours/);
  assert.throws(() => githubAudit(root, { since: 'yesterday', repos: [], now: NOW, io, log: () => {}, p: P }), /--since <iso time>/);
});

test('audit: a push and a write GitHub shows that the ledger lacks are unexplained and named, exit 1; pushes logged with no repository cover a gap', (t) => {
  const root = makeRepo({ 'README.md': 'x\n' });
  ledger(t, [{ at: at(30), kind: 'push', repo: P3R }]);
  const answers = [
    [/^rate_limit$/, RL],
    [new RegExp(`^repos/${P3R}/actions/runs`), { workflow_runs: [
      run('build/a', 'aaa', 30),
      // A raw push, its commit carrying the session's trailer; a second workflow on it counts once.
      run('notes/raw', 'bbb', 12, { msg: 'notes\n\nClaude-Session: https://claude.ai/code/session_018BhcedK5yPyjY6UfMKmxzM' }),
      run('notes/raw', 'bbb', 12),
    ] }],
    [new RegExp(`^repos/${P3R}/events`), [ev('IssueCommentEvent', 8, { payload: { action: 'created', issue: { number: 205 } } })]],
  ];
  const out = [];
  const r = githubAudit(root, { repos: [P3R], login: ME, now: NOW, io: gh(answers).io, log: (l) => out.push(l), p: P });
  const text = out.join('\n');
  assert.equal(r.ok, false);
  assert.match(text, /- pushes, neobobkrause\/process3: GitHub 2 .* vs ledger 1: 1 GitHub shows that the ledger lacks/);
  assert.match(text, /- UNEXPLAINED pushes: 1: notes\/raw@bbb0000 by acmewidget-robot \(session_018BhcedK5yPyjY6UfMKmxzM\)/);
  assert.match(text, /- UNEXPLAINED writes: neobobkrause\/process3 IssueComment created #205 by acmewidget-robot/);
  assert.match(text, /audit: an unexplained push or write gap/);
  // Pushes and writes logged before they named a repository: the gaps are theirs.
  ledger(t, [{ at: at(30), kind: 'push', repo: P3R }, { at: at(12), kind: 'push' }, { at: at(8), kind: 'gh', points: 5, content: true }]);
  const out2 = [];
  assert.equal(githubAudit(root, { repos: [P3R], login: ME, now: NOW, io: gh(answers).io, log: (l) => out2.push(l), p: P }).ok, true, out2.join('\n'));
  assert.match(out2.join('\n'), /vs ledger 1, 1 covered by pushes logged with no repository/);
  // A state branch with commits and no state push in the ledger: at least one push it lacks.
  ledger(t, []);
  const out3 = [];
  const r3 = githubAudit(root, { repos: [COPY], product: COPY, login: ME, now: NOW, p: P, log: (l) => out3.push(l), io: gh([[new RegExp(`^repos/${COPY}/commits`), [{ sha: 'abcdef1', commit: { committer: { date: at(20) }, message: 'x' } }]]]).io });
  assert.equal(r3.ok, false);
  assert.match(out3.join('\n'), /process-state: 1 commit\(s\) .* vs ledger 0 state push\(es\): at least 1 the ledger lacks/);
});

test('each push and write names its repository in the ledger; a merge the tool makes is logged as a push; the audit\'s default repositories', (t) => {
  const f = ledger(t, []);
  writeFileSync(f, '');
  const root = makeRepo({ 'README.md': 'x\n' });
  git(['remote', 'add', 'origin', 'https://github.com/neobobkrause/acmewidget-copy.git'], { cwd: root });
  assert.equal(pushRepo(['push', '-q', 'origin', 'HEAD:refs/heads/x'], root), COPY);
  assert.equal(pushRepo(['push', '-o', 'ci.skip', 'origin', 'HEAD:refs/heads/x'], root), COPY, 'an option\'s value is not the remote');
  assert.equal(pushRepo(['push', 'https://github.com/NeoBobKrause/Process3.git', 'HEAD:refs/heads/x'], root), P3R, 'lower case');
  assert.equal(pushRepo(['push', '../process3', 'HEAD'], root), null, 'a local path is no repository');
  assert.equal(slugOf('git@github.com:neobobkrause/process3.git'), P3R);
  assert.equal(ghRepo(['api', '-X', 'PUT', 'repos/neobobkrause/process3/pulls/9/merge'], root), P3R);
  assert.equal(ghRepo(['pr', 'comment', '9', '--repo', 'neobobkrause/process3'], root), P3R);
  assert.equal(ghRepo(['pr', 'view', '9'], root), COPY, 'else the clone\'s origin');
  pushTurn(['push', '-q', 'origin', 'HEAD:refs/heads/process-state'], root, { p: P });
  ghAfter(['api', '-X', 'PUT', 'repos/neobobkrause/process3/pulls/9/merge'], { code: 0, stdout: '{}' }, root);
  const rows = readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(rows.map((r) => [r.kind, r.repo, r.state || r.via || null]), [['push', COPY, true], ['push', P3R, 'merge']]);
  assert.deepEqual(auditRepos({ slug: COPY, cfg: { process_repo: 'https://github.com/neobobkrause/process3' } }), [COPY, P3R]);
  assert.deepEqual(auditRepos({ slug: P3R, cfg: null, processOrigin: 'https://github.com/neobobkrause/process3' }), [P3R]);
});

// C34 (the coordinator, 8 Nov): builder sessions rooted at /home/user, and the coordinator on an old
// branch, loaded no hook, and their connector writes (PR opens 239-256, ready marks) went
// unledgered: the audit named a bare gap. It names the session behind each unexplained write, by
// the claude.ai link its body carries: a session whose hook counted no connector call had it not
// loaded; one whose hook counted others missed this one.
test('audit (C34): an unexplained write names its session, and says the hook was not loaded where the ledger holds none of that session\'s connector calls', (t) => {
  const root = makeRepo({ 'README.md': 'x\n' });
  // session_HOOKED's hook counted one connector call; session_BARE's none.
  ledger(t, [{ at: at(25), kind: 'gh', points: 1, connector: true, remote: 'session_HOOKED' }]);
  const footer = (s) => `body\n\nhttps://claude.ai/code/${s}`;
  const answers = [
    [/^rate_limit$/, RL],
    [new RegExp(`^repos/${P3R}/actions/runs`), { workflow_runs: [] }],
    [new RegExp(`^repos/${P3R}/events`), [
      ev('PullRequestEvent', 20, { payload: { action: 'opened', pull_request: { number: 256, body: footer('session_BARE') } } }),
      ev('IssueCommentEvent', 15, { payload: { action: 'created', issue: { number: 250 }, comment: { body: footer('session_HOOKED') } } }),
      ev('IssueCommentEvent', 14, { payload: { action: 'created', issue: { number: 251 }, comment: { body: 'no link' } } }),
    ]],
  ];
  const out = [];
  const r = githubAudit(root, { repos: [P3R], login: ME, now: NOW, io: gh(answers).io, log: (l) => out.push(l), p: P });
  const text = out.join('\n');
  assert.equal(r.ok, false);
  assert.match(text, /PullRequest opened #256 by acmewidget-robot \(hook not loaded in session session_BARE\? the ledger holds no connector call of it \(a hook pinned before C34 records none either\)\)/);
  assert.match(text, /IssueComment created #250 by acmewidget-robot \(session session_HOOKED: the ledger holds connector calls of its hook\)/);
  assert.match(text, /IssueComment created #251 by acmewidget-robot \(session unknown: its own text names none\)/);
});

// Cold review of C34: only the act's own text names its session; a PR's description only for its opening.
test('audit (C34): a review, a linkless comment or a ready mark is never pinned on the pull request author\'s session; a trimmed opened payload reads the PR', async () => {
  const { writeSession } = await import('../lib/ghaudit.mjs');
  const link = (s) => `x https://claude.ai/code/${s}`;
  const pr = { number: 9, body: link('session_AUTHOR') };
  assert.equal(writeSession({ type: 'PullRequestReviewEvent', payload: { pull_request: pr, review: { body: link('session_REVIEWER') } } }), 'session_REVIEWER');
  assert.equal(writeSession({ type: 'PullRequestReviewEvent', payload: { pull_request: pr, review: { body: 'LGTM' } } }), null);
  assert.equal(writeSession({ type: 'IssueCommentEvent', payload: { issue: pr, comment: { body: 'merged' } } }), null);
  assert.equal(writeSession({ type: 'PullRequestReviewCommentEvent', payload: { pull_request: pr, comment: { body: link('session_C') } } }), 'session_C');
  assert.equal(writeSession({ type: 'PullRequestEvent', payload: { action: 'ready_for_review', pull_request: pr } }), null);
  assert.equal(writeSession({ type: 'PullRequestEvent', payload: { action: 'opened', pull_request: pr } }), 'session_AUTHOR');
  assert.equal(writeSession({ type: 'PullRequestEvent', payload: { action: 'opened', pull_request: { number: 9 } } }, { prBody: link('session_READ') }), 'session_READ', 'a trimmed payload: the PR read');
  assert.equal(writeSession({ type: 'PullRequestEvent', payload: { action: 'opened', pull_request: { number: 9, body: 'Claude-Session: https://claude.ai/code/session_TRAILER' } } }), 'session_TRAILER');
});
