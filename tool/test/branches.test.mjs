// branches prune (lib/branches.mjs): the approval gate, every keep rule and both delete rules,
// against a real origin (a bare repository) and a fake GitHub for pull requests and activity.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { APPROVAL, MARKER, PRUNE_FILE, approves, githubIO, prune } from '../lib/branches.mjs';
import { Fail, git } from '../lib/util.mjs';
import { makeRepo } from './helpers.mjs';

const SLUG = 'o/r';
const OLD = '2026-01-01T00:00:00Z';
const old = { GIT_COMMITTER_DATE: OLD, GIT_AUTHOR_DATE: OLD };
const HEADING = '## Standing approvals from Bob';
const approvalsWith = (extra = '') => `${HEADING}\n\nSessions may never delete a branch.${extra}\n\n## Process3\n\nthe process lines\n`;
const APPROVED = approvalsWith(`\n\n${APPROVAL}`);

// A product with origin as a bare repository: main and the tranche at one old commit, and a full
// clone of it to run in. branches: name -> { from: <origin branch>, commit: true|false, recent }.
function product({ claude = APPROVED, config = { tranche: 'tranche' } } = {}) {
  const work = makeRepo();
  commitAt(work, { 'CLAUDE.md': claude, 'process/config.json': JSON.stringify(config) }, 'initial', old);
  const origin = mkdtempSync(join(tmpdir(), 'p3-origin-'));
  git(['init', '-q', '--bare', '-b', 'main', origin]);
  git(['remote', 'add', 'origin', origin], { cwd: work });
  git(['push', '-q', 'origin', 'HEAD:refs/heads/main', 'HEAD:refs/heads/tranche'], { cwd: work });
  return { work, origin };
}
const write2 = (root, p, t) => { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), t); };
// A commit with the given dates (old: months ago; {}: now).
function commitAt(root, files, msg, env) {
  for (const [p, t] of Object.entries(files)) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), t);
  }
  git(['add', '-A'], { cwd: root });
  git(['commit', '-q', '-m', msg], { cwd: root, env });
  return git(['rev-parse', 'HEAD'], { cwd: root });
}

// A branch on origin: at the tranche tip (ahead 0), or with one commit of its own, old or just made.
function branch(p, name, { ahead = false, recent = false, atTip = false } = {}) {
  git(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche'], { cwd: p.work });
  git(['checkout', '-q', '--detach', 'refs/remotes/origin/tranche'], { cwd: p.work });
  if (ahead) commitAt(p.work, { [`f/${name}.txt`]: name }, name, recent ? {} : old);
  const sha = git(['rev-parse', 'HEAD'], { cwd: p.work });
  git(['push', '-q', 'origin', `HEAD:refs/heads/${name}`], { cwd: p.work });
  // The tranche moves on (an old commit), so a branch cut at its tip is now behind it, not at it.
  if (!ahead && !atTip) {
    git(['checkout', '-q', '--detach', sha], { cwd: p.work });
    commitAt(p.work, { [`t/${name}.txt`]: name }, `tranche after ${name}`, old);
    git(['push', '-q', 'origin', 'HEAD:refs/heads/tranche'], { cwd: p.work });
  }
  return sha;
}
function clone(p) {
  const dir = mkdtempSync(join(tmpdir(), 'p3-clone-'));
  git(['clone', '-q', p.origin, dir]);
  git(['config', 'user.email', 'bot@example.com'], { cwd: dir });
  git(['config', 'user.name', 'bot'], { cwd: dir });
  return dir;
}
const heads = (p) => git(['for-each-ref', '--format=%(refname:strip=2)', 'refs/heads/'], { cwd: p.origin }).split('\n').filter(Boolean).sort();
const rows = (p) => {
  const r = git(['show', `process-state:${PRUNE_FILE}`], { cwd: p.origin, allowFail: true });
  return r.code === 0 ? r.stdout.split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
};
const pr = (number, ref, state, { base = 'tranche', repo = SLUG } = {}) => ({ number, state, head: { ref, repo: { full_name: repo } }, base: { ref: base } });
const fake = ({ pulls = [], activity = [], def = 'main', openPulls } = {}) => ({ defaultBranch: () => def, pulls: () => pulls, activity: () => activity, openPulls: openPulls || (() => pulls.filter((x) => x.state === 'open')) });
// The runner's environment of the product's shim, scheduled on the default branch.
const shimEnv = (def = 'main') => ({ GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'schedule', GITHUB_REF: `refs/heads/${def}`, GITHUB_WORKFLOW_REF: `${SLUG}/.github/workflows/process-branch-prune.yml@refs/heads/${def}` });
const quiet = () => {};
const runIt = (p, opts = {}) => {
  const lines = [];
  const def = opts.def || 'main';
  const r = prune(clone(p), { slug: SLUG, io: fake(opts), log: (l) => lines.push(l), ref: `refs/heads/${def}`, env: shimEnv(def), ...opts.extra });
  return { ...r, lines };
};

test('approves: Bob\'s whole sentence, marker phrase included; whitespace and curly apostrophes forgiven, nothing else', () => {
  assert.equal(MARKER, 'the process\'s scheduled branch cleanup workflow');
  assert.ok(APPROVAL.includes(MARKER));
  assert.equal(approves(APPROVED), true);
  assert.equal(approves(`x ${MARKER} y`), false); // the phrase alone is not the sentence
  assert.equal(approves(APPROVAL.replaceAll('\'', '’').replace(/ /g, '\n  ')), true);
  assert.equal(approves(APPROVAL.replace('scheduled branch cleanup', 'branch cleanup')), false);
  assert.equal(approves(APPROVAL.replace('process\'s', 'processes')), false);
  assert.equal(approves(MARKER.toUpperCase()), false);
  assert.equal(approves(''), false);
});

test('without the approval sentence in the approvals block: a notice, nothing deleted, nothing written', () => {
  for (const claude of [approvalsWith(), `${approvalsWith()}\n## Elsewhere\n\n${APPROVAL}\n`, approvalsWith(`\n\n${APPROVAL.replace('scheduled branch', 'scheduled  branch-')}`)]) {
    const p = product({ claude });
    branch(p, 'job/old-1');
    const r = runIt(p);
    assert.equal(r.ok, true);
    assert.equal(r.approved, false);
    assert.match(r.lines.join('\n'), /::notice::branches prune: the approvals block \(CLAUDE\.md, "## Standing approvals from Bob"\) on main at [0-9a-f]{10} does not carry the branch cleanup approval \("the process's scheduled branch cleanup workflow"\); nothing was deleted/);
    assert.deepEqual(heads(p), ['job/old-1', 'main', 'tranche']);
    assert.deepEqual(rows(p), []);
  }
});

test('the approval is read from the default branch, not the tranche or the checkout', () => {
  const p = product({ claude: approvalsWith() });
  // The tranche carries the sentence; the default branch does not: no approval.
  git(['checkout', '-q', '--detach', 'main'], { cwd: p.work });
  commitAt(p.work, { 'CLAUDE.md': APPROVED }, 'sentence on the tranche only', old);
  git(['push', '-q', 'origin', 'HEAD:refs/heads/tranche'], { cwd: p.work });
  branch(p, 'job/old-1');
  assert.equal(runIt(p).approved, false);
  assert.ok(heads(p).includes('job/old-1'));
});

test('approved: deletes in-tranche branches and closed train heads; keeps every protected, open, recent and ahead branch', () => {
  const p = product({ config: { tranche: 'tranche', state_branch: 'p3-state' } });
  const sha = {};
  for (const n of ['job/old-1', 'job/old-2', 'job/open-head', 'job/open-base', 'job/activity', 'process-state', 'p3-state']) sha[n] = branch(p, n);
  sha['job/ahead'] = branch(p, 'job/ahead', { ahead: true });
  sha['job/recent-tip'] = branch(p, 'job/recent-tip', { ahead: true, recent: true });
  sha['train/head/41-1'] = branch(p, 'train/head/41-1', { ahead: true }); // its PR closed, never merged
  sha['train/head/42-1'] = branch(p, 'train/head/42-1', { ahead: true }); // its PR open
  sha['train/head/43-1'] = branch(p, 'train/head/43-1', { ahead: true }); // no PR at all
  sha['train/head/44-1'] = branch(p, 'train/head/44-1', { ahead: true }); // only a fork's PR of that name, closed
  sha['train/head/45-1'] = branch(p, 'train/head/45-1', { ahead: true, recent: true }); // closed, but a commit just now
  const pulls = [
    pr(1, 'job/open-head', 'open'), pr(2, 'feature', 'open', { base: 'job/open-base' }),
    pr(41, 'train/head/41-1', 'closed'), pr(42, 'train/head/42-1', 'open'), pr(44, 'train/head/44-1', 'closed', { repo: 'fork/r' }), pr(45, 'train/head/45-1', 'closed'),
    pr(9, 'job/old-2', 'closed'),
  ];
  const activity = [
    { ref: 'refs/heads/job/activity', timestamp: new Date(Date.now() - 30 * 60000).toISOString(), activity_type: 'branch_creation' },
    { ref: 'refs/heads/job/old-1', timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), activity_type: 'push' },
  ];
  const r = runIt(p, { pulls, activity, extra: { run: 777, ref: 'refs/heads/main' } });
  assert.equal(r.ok, true);
  assert.equal(r.approved, true);
  assert.deepEqual(r.deleted.map((d) => `${d.name}:${d.why}`).sort(), ['job/old-1:in-tranche', 'job/old-2:in-tranche', 'train/head/41-1:train-head-closed']);
  assert.deepEqual(heads(p), ['job/activity', 'job/ahead', 'job/open-base', 'job/open-head', 'job/recent-tip', 'main', 'p3-state', 'process-state',
    'train/head/42-1', 'train/head/43-1', 'train/head/44-1', 'train/head/45-1', 'tranche']);
  assert.deepEqual(r.kept, { protected: 4, 'open-pr': 3, recent: 3, ahead: 3 });
  // One row, on the config's state branch, naming every deleted branch with its tip.
  const [row] = git(['show', `p3-state:${PRUNE_FILE}`], { cwd: p.origin }).split('\n').filter(Boolean).map((l) => JSON.parse(l));
  assert.equal(row.row, 'prune');
  assert.equal(row.run, '777');
  assert.equal(row.tranche, 'tranche');
  assert.deepEqual(row.kept, r.kept);
  assert.deepEqual(row.deleted.find((d) => d.name === 'train/head/41-1'), { name: 'train/head/41-1', sha: sha['train/head/41-1'], why: 'train-head-closed' });
  assert.deepEqual(row.failed, []);
  // A second run deletes nothing more and writes a second row.
  const again = runIt(p, { pulls, activity });
  assert.deepEqual(again.deleted, []);
  assert.equal(git(['show', `p3-state:${PRUNE_FILE}`], { cwd: p.origin }).split('\n').filter(Boolean).length, 2);
});

test('main is kept by name even when it is not the default branch; the default branch is kept too', () => {
  const p = product();
  branch(p, 'trunk');
  branch(p, 'job/old-1');
  const r = runIt(p, { def: 'trunk', extra: { ref: 'refs/heads/trunk' } });
  assert.deepEqual(r.deleted.map((d) => d.name), ['job/old-1']);
  assert.deepEqual(heads(p), ['main', 'process-state', 'tranche', 'trunk']);
});

test('--dry-run: lists what the rules would delete, approved or not, and deletes and writes nothing', () => {
  for (const claude of [APPROVED, approvalsWith()]) {
    const p = product({ claude });
    branch(p, 'job/old-1');
    const r = runIt(p, { extra: { dryRun: true, ref: 'refs/heads/some-branch' } });
    assert.equal(r.ok, true);
    assert.deepEqual(r.candidates.map((c) => c.name), ['job/old-1']);
    assert.match(r.lines.join('\n'), /would delete job\/old-1 at [0-9a-f]{10} \(in-tranche\)/);
    assert.deepEqual(heads(p), ['job/old-1', 'main', 'tranche']);
    assert.deepEqual(rows(p), []);
  }
});

test('refused, nothing deleted: a run on another ref, a shallow clone, or any GitHub read that fails', () => {
  const p = product();
  branch(p, 'job/old-1');
  assert.throws(() => runIt(p, { extra: { ref: 'refs/heads/job/old-1' } }), (e) => e instanceof Fail && /deletes only from a run on main or tranche, not refs\/heads\/job\/old-1/.test(e.message));
  const unread = (over) => assert.throws(() => prune(clone(p), { slug: SLUG, io: { ...fake(), ...over }, ref: 'refs/heads/main', env: shimEnv(), log: quiet }), (e) => e instanceof Fail && /nothing was deleted/.test(e.message));
  unread({ defaultBranch: () => null });
  unread({ pulls: () => null });
  unread({ activity: () => null });
  const shallow = mkdtempSync(join(tmpdir(), 'p3-shallow-'));
  git(['clone', '-q', '--depth', '1', `file://${p.origin}`, shallow]);
  assert.throws(() => prune(shallow, { slug: SLUG, io: fake(), ref: 'refs/heads/main', env: shimEnv(), log: quiet }), (e) => e instanceof Fail && /needs a full clone/.test(e.message));
  // No tranche on origin.
  const q = product({ config: { tranche: 'tranche-2' } });
  assert.throws(() => runIt(q), (e) => e instanceof Fail && /origin has no tranche-2/.test(e.message));
  assert.deepEqual(heads(p), ['job/old-1', 'main', 'tranche']);
});

test('each delete is leased to the tip judged: a branch pushed to after the judgement is kept, and the row says so', () => {
  const p = product();
  branch(p, 'job/old-1');
  branch(p, 'job/old-2');
  const moved = (root, args) => {
    // Someone pushes to job/old-2 between the judgement and the delete.
    git(['checkout', '-q', '--detach', 'refs/remotes/origin/job/old-2'], { cwd: p.work });
    commitAt(p.work, { 'late.txt': 'late' }, 'late', {});
    git(['push', '-q', 'origin', 'HEAD:refs/heads/job/old-2'], { cwd: p.work });
    return git(['push', '--porcelain', ...args], { cwd: root, allowFail: true });
  };
  const r = runIt(p, { extra: { push: moved } });
  assert.deepEqual(r.deleted.map((d) => d.name), ['job/old-1']);
  assert.deepEqual(r.failed, ['job/old-2']);
  assert.equal(r.ok, true);
  assert.deepEqual(heads(p), ['job/old-2', 'main', 'process-state', 'tranche']);
  assert.deepEqual(rows(p)[0].failed, ['job/old-2']);
});

test('a push that deletes none of its candidates is a red run, its row written', () => {
  const p = product();
  branch(p, 'job/old-1');
  const r = runIt(p, { extra: { push: () => ({ code: 1, stdout: '', stderr: 'remote: Permission denied' }) } });
  assert.equal(r.ok, false);
  assert.deepEqual(rows(p)[0].failed, ['job/old-1']);
  assert.ok(heads(p).includes('job/old-1'));
});

test('the shim: daily and on dispatch, contents: write and pull-requests: read only, actions pinned by full commit, runs branches prune', () => {
  const shim = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'shims', 'process-branch-prune.yml'), 'utf8');
  assert.match(shim, /^on:\n {2}schedule:\n {4}# [^\n]*\n {4}- cron: '\d+ \d+ \* \* \*'\n {2}workflow_dispatch:/m);
  assert.match(shim, /^permissions: \{\}$/m);
  const perms = [...shim.matchAll(/^ {4}permissions:\n((?: {6}\S[^\n]*\n)+)/gm)].map((m) => m[1]);
  assert.deepEqual(perms, ['      contents: write\n      pull-requests: read\n']);
  const uses = [...shim.matchAll(/uses: (\S+)/g)].map((m) => m[1]);
  assert.ok(uses.length >= 2);
  for (const u of uses) assert.match(u, /@[0-9a-f]{40}$/, u);
  assert.doesNotMatch(shim, /pull_request_target/);
  // On the default branch, or dispatched on the tranche the default branch's config names; else skipped.
  assert.match(shim, /if \[ "\$GITHUB_REF" = "refs\/heads\/\$DEFAULT" \]; then on=\$DEFAULT\n\s+elif \[ "\$GITHUB_EVENT_NAME" = workflow_dispatch \] && \[ "\$GITHUB_REF" = "refs\/heads\/\$tranche" \]; then on=\$tranche\n\s+else [^\n]*skip=1/);
  assert.match(shim, /pin=\$\(git rev-parse -q --verify "\$base:\.process"\)/);
  assert.doesNotMatch(shim, /HEAD:/);
  assert.match(shim, /p3\.mjs" branches prune --ref "\$GITHUB_REF" --run "\$GITHUB_RUN_ID" \$DRY_RUN$/m);
});

test('deletes only in the product\'s shim on the default branch: a local run, another event or another workflow is refused', () => {
  const p = product();
  branch(p, 'job/old-1');
  const refused = (extra, re) => assert.throws(() => runIt(p, { extra }), (e) => e instanceof Fail && re.test(e.message) && /nothing was deleted/.test(e.message));
  refused({ ref: undefined }, /not a run with no --ref/);
  refused({ env: {} }, /it is not a GitHub Actions run/);
  refused({ env: { ...shimEnv(), GITHUB_EVENT_NAME: 'push' } }, /its event is push/);
  refused({ env: { ...shimEnv(), GITHUB_REF: 'refs/heads/job/old-1' } }, /it runs on refs\/heads\/job\/old-1/);
  refused({ env: { ...shimEnv(), GITHUB_WORKFLOW_REF: `${SLUG}/.github/workflows/other.yml@refs/heads/main` } }, /its workflow is/);
  assert.ok(heads(p).includes('job/old-1'));
  // A dry run lists from anywhere.
  assert.deepEqual(runIt(p, { extra: { ref: undefined, env: {}, dryRun: true } }).candidates.map((c) => c.name), ['job/old-1']);
});

test('the marker phrase alone is no approval: a withdrawal or narrower grant naming it deletes nothing', () => {
  for (const extra of [`\n\nI withdraw the approval for ${MARKER}.`, `\n\nOne exception: ${MARKER} may delete closed train heads only.`]) {
    const p = product({ claude: approvalsWith(extra) });
    branch(p, 'job/old-1');
    assert.equal(runIt(p).approved, false);
    assert.ok(heads(p).includes('job/old-1'));
  }
});

test('kept as recent: a branch at the tranche tip, and one whose activity entry has no readable time', () => {
  const p = product();
  branch(p, 'job/odd-time');
  branch(p, 'job/just-cut', { atTip: true });
  const r = runIt(p, { activity: [{ ref: 'refs/heads/job/odd-time', timestamp: 'not a time', activity_type: 'push' }] });
  assert.deepEqual(r.deleted, []);
  assert.equal(r.kept.recent, 2);
});

test('a pull request opened after the judgement keeps its branch; an unreadable re-read deletes nothing more', () => {
  const p = product();
  branch(p, 'job/old-1');
  branch(p, 'job/old-2');
  const r = runIt(p, { openPulls: () => [pr(5, 'x', 'open', { base: 'job/old-2' })] });
  assert.deepEqual(r.deleted.map((d) => d.name), ['job/old-1']);
  assert.deepEqual(r.failed, ['job/old-2']);
  const q = product();
  branch(q, 'job/old-1');
  const n = runIt(q, { openPulls: () => null });
  assert.deepEqual(n.deleted, []);
  assert.ok(heads(q).includes('job/old-1'));
});

test('githubIO: the paginated reads flattened, and null for a failed or odd read', () => {
  const calls = [];
  const io = githubIO((args) => { calls.push(args.join(' ')); return args.includes('--slurp') ? [[{ n: 1 }], [{ n: 2 }]] : { default_branch: 'main' }; });
  assert.equal(io.defaultBranch(SLUG), 'main');
  assert.deepEqual(io.pulls(SLUG), [{ n: 1 }, { n: 2 }]);
  assert.deepEqual(io.openPulls(SLUG), [{ n: 1 }, { n: 2 }]);
  assert.deepEqual(io.activity(SLUG), [{ n: 1 }, { n: 2 }]);
  assert.deepEqual(calls, ['api repos/o/r', 'api --paginate --slurp repos/o/r/pulls?state=all&per_page=100', 'api --paginate --slurp repos/o/r/pulls?state=open&per_page=100', 'api --paginate --slurp repos/o/r/activity?time_period=day&per_page=100']);
  const bad = githubIO(() => null);
  assert.equal(bad.defaultBranch(SLUG), null);
  assert.equal(bad.pulls(SLUG), null);
  assert.equal(githubIO(() => [{ not: 'pages' }]).activity(SLUG), null);
});


test('dispatched on the tranche: the tranche\'s approvals and config judge; a schedule there, another workflow ref or a config naming another tranche is refused', () => {
  const tEnv = (over = {}) => ({ ...shimEnv(), GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/tranche', GITHUB_WORKFLOW_REF: `${SLUG}/.github/workflows/process-branch-prune.yml@refs/heads/tranche`, ...over });
  // Bob's sentence on the tranche only (main moves at a round close).
  const p = product({ claude: approvalsWith() });
  git(['checkout', '-q', '--detach', 'main'], { cwd: p.work });
  commitAt(p.work, { 'CLAUDE.md': APPROVED }, 'the sentence on the tranche', old);
  git(['push', '-q', 'origin', 'HEAD:refs/heads/tranche'], { cwd: p.work });
  branch(p, 'job/old-1');
  const on = (env) => runIt(p, { extra: { ref: 'refs/heads/tranche', env } });
  assert.throws(() => on(tEnv({ GITHUB_EVENT_NAME: 'schedule' })), (e) => e instanceof Fail && /dispatched on tranche, and its event is schedule, not workflow_dispatch/.test(e.message));
  assert.throws(() => on(tEnv({ GITHUB_WORKFLOW_REF: `${SLUG}/.github/workflows/process-branch-prune.yml@refs/heads/main` })), (e) => e instanceof Fail && /its workflow is/.test(e.message));
  assert.throws(() => on(tEnv({ GITHUB_REF: 'refs/heads/main' })), (e) => e instanceof Fail && /it runs on refs\/heads\/main, not refs\/heads\/tranche/.test(e.message));
  assert.ok(heads(p).includes('job/old-1'));
  // The same branch's run on main is not approved: main lacks the sentence.
  assert.equal(runIt(p).approved, false);
  const r = on(tEnv());
  assert.equal(r.approved, true);
  assert.deepEqual(r.deleted.map((d) => d.name), ['job/old-1']);
  assert.equal(rows(p)[0].on, 'tranche');
  // The tranche's config naming another tranche than main's: refused.
  const q = product();
  git(['checkout', '-q', '--detach', 'main'], { cwd: q.work });
  commitAt(q.work, { 'process/config.json': JSON.stringify({ tranche: 'other' }) }, 'renamed', old);
  git(['push', '-q', 'origin', 'HEAD:refs/heads/tranche'], { cwd: q.work });
  assert.throws(() => runIt(q, { extra: { ref: 'refs/heads/tranche', env: tEnv() } }), (e) => e instanceof Fail && /tranche's config names the tranche other, main's names tranche/.test(e.message));
});

test('the sentence must stand as its own paragraph: quoted in a withdrawal, in an HTML comment or in a code fence it approves nothing', () => {
  assert.equal(approves(`${HEADING}\n\n${APPROVAL}\n`), true);
  assert.equal(approves(`${HEADING}\n\nWithdrawn on 6 Nov, no longer in force: "${APPROVAL}"\n`), false);
  assert.equal(approves(`${HEADING}\n\n<!-- proposed, not yet given:\n\n${APPROVAL}\n\n-->\n`), false);
  assert.equal(approves(`${HEADING}\n\n\`\`\`\n${APPROVAL}\n\`\`\`\n`), false);
  assert.equal(approves(`${HEADING}\n\n${APPROVAL} Until 7 Nov only.\n`), false);
});

test('a tranche run whose config names another state branch than the default branch\'s is refused', () => {
  const p = product({ config: { tranche: 'tranche', state_branch: 'st' } });
  git(['checkout', '-q', '--detach', 'main'], { cwd: p.work });
  commitAt(p.work, { 'process/config.json': JSON.stringify({ tranche: 'tranche' }) }, 'drops state_branch', old);
  git(['push', '-q', 'origin', 'HEAD:refs/heads/tranche'], { cwd: p.work });
  branch(p, 'st');
  const env = { ...shimEnv(), GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/tranche', GITHUB_WORKFLOW_REF: `${SLUG}/.github/workflows/process-branch-prune.yml@refs/heads/tranche` };
  assert.throws(() => runIt(p, { extra: { ref: 'refs/heads/tranche', env } }), (e) => e instanceof Fail && /names the state branch process-state, main's names st/.test(e.message));
  assert.ok(heads(p).includes('st'));
});

test('the shim\'s pin step, run: a schedule on the default branch runs (the default branch read from GitHub, not the event); other refs skip; a bad process_repo stops', () => {
  const shim = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'shims', 'process-branch-prune.yml'), 'utf8');
  assert.doesNotMatch(shim, /github\.event\.repository\.default_branch/);
  const m = shim.match(/ {6}- name: the process pin\n[\s\S]*? {8}run: \|\n((?: {10}.*\n)+)/);
  const script = m[1].split('\n').map((l) => l.slice(10)).join('\n');
  const dir = mkdtempSync(join(tmpdir(), 'p3-shim-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'gh'), '#!/bin/sh\necho main\n', { mode: 0o755 });
  writeFileSync(join(dir, 'step.sh'), script);
  const p = product();
  const proc = makeRepo();
  commitAt(proc, { 'tool/p3.mjs': '' }, 'process', old);
  const procSha = git(['rev-parse', 'HEAD'], { cwd: proc });
  // main and the tranche pin the process commit, and name a process_repo on github.com that the
  // fake clone below serves from the local repository.
  git(['checkout', '-q', '--detach', 'main'], { cwd: p.work });
  git(['update-index', '--add', '--cacheinfo', `160000,${procSha},.process`], { cwd: p.work });
  write2(p.work, 'process/config.json', JSON.stringify({ tranche: 'tranche', process_repo: 'https://github.com/o/process3' }));
  git(['add', 'process/config.json'], { cwd: p.work });
  git(['commit', '-q', '-m', 'pin'], { cwd: p.work, env: old });
  git(['push', '-q', 'origin', 'HEAD:refs/heads/main', 'HEAD:refs/heads/tranche'], { cwd: p.work });
  const c = clone(p);
  const out = join(dir, 'out');
  const runStep = (event, ref) => {
    writeFileSync(out, '');
    return spawnSync('bash', ['-e', join(dir, 'step.sh')], { cwd: c, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_OUTPUT: out, GITHUB_EVENT_NAME: event, GITHUB_REF: ref, GITHUB_REPOSITORY: SLUG, RUNNER_TEMP: dir, GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'url.' + proc + '.insteadOf', GIT_CONFIG_VALUE_0: 'https://github.com/o/process3' } });
  };
  const r = runStep('schedule', 'refs/heads/main');
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(readFileSync(out, 'utf8'), /^node=22$/m);
  assert.doesNotMatch(readFileSync(out, 'utf8'), /skip=1/);
  for (const [event, ref] of [['schedule', 'refs/heads/tranche'], ['workflow_dispatch', 'refs/heads/other']]) {
    const s = runStep(event, ref);
    assert.equal(s.status, 0);
    assert.match(readFileSync(out, 'utf8'), /skip=1/, `${event} ${ref}`);
  }
  // A process_repo off github.com stops the run.
  git(['checkout', '-q', '--detach', 'refs/remotes/origin/main'], { cwd: p.work });
  write2(p.work, 'process/config.json', JSON.stringify({ tranche: 'tranche', process_repo: '--upload-pack=touch /tmp/x' }));
  git(['add', 'process/config.json'], { cwd: p.work });
  git(['commit', '-qm', 'bad repo'], { cwd: p.work, env: old });
  git(['push', '-q', 'origin', 'HEAD:refs/heads/main'], { cwd: p.work });
  git(['fetch', '-q', 'origin'], { cwd: c });
  rmSync(join(dir, 'process3'), { recursive: true, force: true });
  const bad = runStep('schedule', 'refs/heads/main');
  assert.notEqual(bad.status, 0, bad.stdout + bad.stderr + readFileSync(out, "utf8"));
  assert.match(bad.stdout, /process_repo is not a github\.com repository/);
});
