// p3 github audit (R17c; Bob, 6 Nov: does all GitHub traffic go through the pacing and get tracked?).
// GitHub's own evidence (stubbed gh) against the ledger (this clone's log here).
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { auditRepos, githubAudit } from '../lib/ghaudit.mjs';
import { pushRepo, slugOf, useShared } from '../lib/pace.mjs';
import { git } from '../lib/util.mjs';
import { makeRepo } from './helpers.mjs';

const NOW = Date.parse('2026-11-06T23:30:00Z');
const at = (min) => new Date(NOW - min * 60e3).toISOString();
const P3R = 'neobobkrause/process3';
const COPY = 'neobobkrause/civicsmith-copy';
const ME = 'believeinoakland';

// The ledger: this clone's log, written as the tool writes it.
function ledger(t, rows) {
  const f = join(mkdtempSync(join(tmpdir(), 'p3-audit-')), 'log.jsonl');
  writeFileSync(f, rows.map((r) => JSON.stringify({ session: 'cse_me', ...r })).join('\n') + '\n');
  const was = process.env.P3_GITHUB_LOG;
  process.env.P3_GITHUB_LOG = f;
  useShared(null);
  t.after(() => { if (was === undefined) delete process.env.P3_GITHUB_LOG; else process.env.P3_GITHUB_LOG = was; });
}
const run = (branch, sha, min, { actor = ME, msg = 'x' } = {}) => ({ head_branch: branch, head_sha: sha.padEnd(40, '0'), created_at: at(min), actor: { login: actor }, head_commit: { message: msg } });
const ev = (type, min, { actor = ME, action, pr } = {}) => ({ type, created_at: at(min), actor: { login: actor }, payload: { ...(action ? { action } : {}), ...(pr ? { pull_request: { number: pr } } : {}) } });
// A stubbed gh: each path's answer.
function gh(answers) {
  const seen = [];
  return { seen, io: { gh: (args) => { seen.push(args.join(' ')); const p = args[1]; for (const [re, v] of answers) if (re.test(p)) return typeof v === 'function' ? v(p) : v; return null; } } };
}
const RL = { resources: { core: { limit: 5000, remaining: 4846, reset: Math.floor((NOW + 1800e3) / 1000) }, graphql: { limit: 5000, remaining: 4990, reset: 0 } } };

test('audit: every push and write GitHub shows is in the ledger; the calls gap is named as outside the tool', (t) => {
  const root = makeRepo({ 'README.md': 'x\n' });
  ledger(t, [
    ...Array.from({ length: 114 }, (_, i) => ({ at: at(25 - i * 0.1), kind: 'gh', points: 1 })),
    { at: at(20), kind: 'gh', points: 5, content: true },
    { at: at(19), kind: 'gh', points: 5, content: 1, note: true },
    { at: at(18), kind: 'push', repo: P3R, what: 'origin HEAD:refs/heads/build/a' },
    { at: at(17), kind: 'push', repo: COPY, what: 'origin HEAD:refs/heads/process-state' },
  ]);
  const { io, seen } = gh([
    [/^rate_limit$/, RL],
    [/^user$/, { login: ME }],
    [new RegExp(`^repos/${P3R}/actions/runs`), { workflow_runs: [run('build/a', 'aaa', 18)] }],
    [new RegExp(`^repos/${COPY}/actions/runs`), { workflow_runs: [] }],
    [new RegExp(`^repos/${COPY}/commits`), [{ commit: { committer: { date: at(17) } } }, { commit: { committer: { date: at(17) } } }]],
    [new RegExp(`^repos/${P3R}/events`), [ev('PullRequestEvent', 20, { action: 'opened', pr: 207 }), ev('CreateEvent', 18), ev('IssueCommentEvent', 10, { actor: 'github-actions[bot]' }), ev('IssueCommentEvent', 9, { actor: 'neobobkrause' })]],
    [new RegExp(`^repos/${COPY}/events`), [ev('IssueCommentEvent', 19, { action: 'created' })]],
  ]);
  const out = [];
  const r = githubAudit(root, { repos: [COPY, P3R], product: COPY, now: NOW, io, log: (l) => out.push(l) });
  const text = out.join('\n');
  assert.equal(r.ok, true, text);
  assert.match(text, /- calls, primary: GitHub 154 of 5000 used since 2026-11-06T23:00:00Z vs ledger 116: 38 outside the tool \(connector reads, raw gh or curl\)/);
  assert.match(text, /- calls, GraphQL: GitHub 10 of 5000 used/);
  assert.match(text, /- pushes, neobobkrause\/process3: GitHub 1 \(push-triggered runs, one per branch and commit: build\/a\) vs ledger 1$/m);
  assert.match(text, /- pushes, neobobkrause\/civicsmith-copy process-state: 2 commit\(s\) in the window, an upper bound/);
  assert.match(text, /- writes: GitHub 2 \(pull requests, comments, reviews by believeinoakland\) vs ledger 2 content-creating; GitHub's events can lag/);
  assert.match(text, /- refs created: 1 \(CreateEvent/);
  assert.match(text, /audit: every push and write GitHub shows is in the ledger/);
  // Repository-scoped endpoints only, beside rate_limit and the account's own login.
  assert.ok(seen.every((s) => /^api (rate_limit|user|repos\/)/.test(s)), seen.join('\n'));
  assert.ok(seen.some((s) => /actions\/runs\?event=push&created=>=2026-11-06T22:30:00Z&per_page=100&page=1/.test(s)));
});

test('audit: a push and a write GitHub shows that the ledger lacks are unexplained and named, exit 1; older unattributed pushes cover a push gap', (t) => {
  const root = makeRepo({ 'README.md': 'x\n' });
  ledger(t, [{ at: at(30), kind: 'push', repo: P3R }]);
  const answers = [
    [/^rate_limit$/, RL],
    [new RegExp(`^repos/${P3R}/actions/runs`), { workflow_runs: [
      run('build/a', 'aaa', 30),
      // A raw push by this login, its commit carrying the session's trailer; another workflow on the same push counts once.
      run('notes/raw', 'bbb', 12, { msg: 'notes\n\nClaude-Session: https://claude.ai/code/session_018BhcedK5yPyjY6UfMKmxzM' }),
      run('notes/raw', 'bbb', 12),
      // Another person's push is not the account's.
      run('main', 'ccc', 5, { actor: 'neobobkrause' }),
    ] }],
    [new RegExp(`^repos/${P3R}/events`), [ev('IssueCommentEvent', 8, { action: 'created', pr: 205 })]],
  ];
  const out = [];
  const r = githubAudit(root, { repos: [P3R], login: ME, now: NOW, io: gh(answers).io, log: (l) => out.push(l) });
  const text = out.join('\n');
  assert.equal(r.ok, false);
  assert.match(text, /- pushes, neobobkrause\/process3: GitHub 2 .* vs ledger 1: 1 GitHub shows that the ledger lacks/);
  assert.match(text, /- UNEXPLAINED pushes: 1 \(1 GitHub shows the ledger lacks\): notes\/raw@bbb0000 by believeinoakland \(session_018BhcedK5yPyjY6UfMKmxzM\)/);
  assert.match(text, /- UNEXPLAINED writes: neobobkrause\/process3 IssueComment created #205/);
  assert.match(text, /audit: an unexplained push or write gap/);
  // Pushes logged before R17c (no repository): the gap is theirs, not unexplained.
  ledger(t, [{ at: at(30), kind: 'push', repo: P3R }, { at: at(12), kind: 'push' }, { at: at(8), kind: 'gh', points: 5, content: true }]);
  const out2 = [];
  const r2 = githubAudit(root, { repos: [P3R], login: ME, now: NOW, io: gh(answers).io, log: (l) => out2.push(l) });
  assert.equal(r2.ok, true, out2.join('\n'));
  assert.match(out2.join('\n'), /- pushes: the 1 GitHub shows beyond the named ledger are covered by 1 ledger push\(es\) logged before pushes named their repository/);
  assert.throws(() => githubAudit(root, { since: 'yesterday', repos: [], login: ME, now: NOW, io: gh([]).io, log: () => {} }), /--since <iso time>/);
});

test('each push names its repository in the ledger; the audit\'s default repositories', () => {
  const root = makeRepo({ 'README.md': 'x\n' });
  git(['remote', 'add', 'origin', 'https://github.com/neobobkrause/civicsmith-copy.git'], { cwd: root });
  assert.equal(pushRepo(['push', '-q', 'origin', 'HEAD:refs/heads/x'], root), COPY);
  assert.equal(pushRepo(['push', 'https://github.com/neobobkrause/process3.git', 'HEAD:refs/heads/x'], root), P3R);
  assert.equal(pushRepo(['push', 'nowhere', 'HEAD'], root), null);
  assert.equal(slugOf('git@github.com:neobobkrause/process3.git'), P3R);
  assert.deepEqual(auditRepos({ slug: COPY, cfg: { process_repo: 'https://github.com/neobobkrause/process3' } }), [COPY, P3R]);
  assert.deepEqual(auditRepos({ slug: P3R, cfg: null, processOrigin: 'https://github.com/neobobkrause/process3' }), [P3R]);
});
