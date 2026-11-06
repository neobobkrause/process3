// Defect sweep, 4 Nov (notes/defect-sweep-4nov.md), items 2, 3, 4, 5, 7 and 10: a job's branch
// behind the tranche or BOB's push, its .process pin, and the generated files its suite builds.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseBlock } from '../lib/github.mjs';
import { jobBlock, jobComplete, jobStart, jobSync, jobTest, pinAt } from '../lib/job.mjs';
import { readEntry } from '../lib/ledger.mjs';
import { send } from '../lib/state.mjs';
import { git, run } from '../lib/util.mjs';
import { commit, entry, makeRepo, write } from './helpers.mjs';

// The tool's own `git submodule update` reads a file:// process clone in these tests.
process.env.GIT_CONFIG_COUNT = '1';
process.env.GIT_CONFIG_KEY_0 = 'protocol.file.allow';
process.env.GIT_CONFIG_VALUE_0 = 'always';

const quiet = () => {};
const ready = () => ({ ok: true, missing: [] });
const passing = "import test from 'node:test'; test('ok', () => {});\n";
const clean = (root) => git(['status', '--porcelain', '--untracked-files=no'], { cwd: root });
const head = (root, ref = 'HEAD') => git(['rev-parse', ref], { cwd: root });
const bareOrigin = (root, ...refs) => {
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'origin.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', ...refs], { cwd: root });
  return bare;
};

function fakeGitHub() {
  const state = { comments: [], ready: 0, isDraft: true };
  return {
    state,
    open: (slug, p) => ({ number: 9, html_url: 'pr', draft: true, ...p }),
    find: () => null,
    gh: {
      findPR: () => ({ number: 9, draft: state.isDraft, user: { login: 'civicsmith' } }),
      toDraft: () => { state.isDraft = true; return { draft: true }; },
      comments: () => state.comments,
      addComment: (s, n, body) => { state.comments.push({ body, html_url: `c${state.comments.length}`, user: { login: 'civicsmith' } }); return { html_url: 'c' }; },
      markReady: () => { state.ready++; state.isDraft = false; },
    },
  };
}

// A product whose tranche pins a process clone at P1, with job alpha started from it (local, no
// origin) and .process filled at the branch's pin. movePin: the tranche moves the pin to P2.
function pinned() {
  const tool = makeRepo({ 'tool/x.mjs': 'export const v = 1;\n' });
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha'),
    'req/alpha.md': '# alpha\n\nR1 does a thing.\n',
    'test/alpha/a.test.mjs': passing,
  });
  git(['submodule', 'add', '-q', tool, '.process'], { cwd: root });
  git(['commit', '-q', '-m', 'pin P1'], { cwd: root });
  git(['branch', 'tranche'], { cwd: root });
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  git(['submodule', 'update', '-q', '--init'], { cwd: root });
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' }, 'work');
  const p1 = pinAt(root, 'HEAD');
  const movePin = () => {
    const p2 = commit(tool, { 'tool/x.mjs': 'export const v = 2;\n' }, 'P2');
    git(['checkout', '-q', 'tranche'], { cwd: root });
    git(['fetch', '-q', 'origin'], { cwd: join(root, '.process') });
    git(['checkout', '-q', p2], { cwd: join(root, '.process') });
    git(['add', '.process'], { cwd: root });
    git(['commit', '-q', '-m', 'pin move to P2'], { cwd: root });
    git(['checkout', '-q', 'job/alpha'], { cwd: root });
    git(['submodule', 'update', '-q'], { cwd: root });
    return p2;
  };
  return { root, tool, p1, movePin, toolRoot: join(root, '.process') };
}

test('#2: after a merge of the tranche that moved the pin, job complete names the submodule update, not "commit your work"', () => {
  const { root, p1, movePin, toolRoot } = pinned();
  const p2 = movePin();
  git(['merge', '-q', '--no-edit', 'tranche'], { cwd: root });
  assert.equal(pinAt(root, 'HEAD'), p2);
  assert.equal(head(toolRoot), p1, 'git moved the gitlink, not the checkout');
  assert.match(clean(root), /\.process/);
  assert.throws(() => jobComplete(root, 'alpha', { push: false, toolRoot, log: quiet }), /this branch pins process [0-9a-f]{10} and \.process runs [0-9a-f]{10}, an older tool: run `git submodule update \.process`, then job complete again; nothing was run/);
  assert.equal(readEntry(root, 'alpha').status.state, 'WORKING');
  git(['submodule', 'update', '-q', '.process'], { cwd: root });
  assert.equal(jobComplete(root, 'alpha', { push: false, toolRoot, log: quiet }).ok, true);
  assert.equal(pinAt(root, 'HEAD'), p2, 'the pin stays the tranche\'s');
});

test('#2: send is not refused for a .process checkout that differs from the branch\'s pin', () => {
  const { root, movePin } = pinned();
  bareOrigin(root, 'job/alpha', 'tranche');
  git(['branch', '-q', '--set-upstream-to', 'origin/job/alpha'], { cwd: root });
  const p2 = movePin();
  git(['checkout', '-q', p2], { cwd: join(root, '.process') });
  assert.match(clean(root), /\.process/);
  const said = [];
  assert.equal(send(root, 'process-state', { from: 'job-alpha', to: 'bob', text: 'job alpha BLOCKED: run status', log: (l) => said.push(l) }).n, 1);
  assert.match(said[0], /^MSG job-alpha-1 to bob/);
  // Any other tracked change still stops it.
  write(root, { 'src/alpha/index.mjs': 'export const x = 2;\n' });
  assert.throws(() => send(root, 'process-state', { from: 'job-alpha', to: 'bob', text: 'x', log: quiet }), /uncommitted changes/);
});

test('#4: job complete and test refuse at the start, naming job sync, when the tranche runs a newer process; job sync brings it in', () => {
  const { root, p1, movePin, toolRoot } = pinned();
  const p2 = movePin();
  const before = head(root);
  assert.throws(() => jobComplete(root, 'alpha', { push: false, toolRoot, log: quiet }), new RegExp(`the tranche runs process ${p2.slice(0, 10)} and this branch ${p1.slice(0, 10)}: run \`node \\.process/tool/p3\\.mjs job sync alpha\`, then job complete again; nothing was run`));
  assert.throws(() => jobTest(root, 'alpha', { toolRoot, log: quiet }), /the tranche runs process .*job sync alpha`, then `node \.process\/tool\/p3\.mjs test alpha` again/);
  assert.equal(head(root), before, 'nothing committed');
  assert.equal(readEntry(root, 'alpha').status.state, 'WORKING');
  const said = [];
  const s = jobSync(root, 'alpha', { push: false, log: (l) => said.push(l) });
  assert.deepEqual(s.merged, ['tranche']);
  assert.equal(git(['rev-list', '--parents', '-1', 'HEAD'], { cwd: root }).split(' ').length, 3, 'a merge commit');
  assert.equal(head(toolRoot), p2, '.process updated to the merged pin');
  assert.equal(clean(root), '');
  assert.match(said.join('\n'), /next: `git push origin job\/alpha`/);
  assert.equal(jobTest(root, 'alpha', { toolRoot, log: quiet }).ok, true);
  assert.equal(jobComplete(root, 'alpha', { push: false, toolRoot, log: quiet }).ok, true);
  // A tool newer than both pins stands (copy PR 40: a COMPLETE job amends with a newer tool).
  const { root: r2, tool, toolRoot: t2 } = pinned();
  const p3 = commit(tool, { 'tool/x.mjs': 'export const v = 3;\n' }, 'P3');
  git(['fetch', '-q', 'origin'], { cwd: t2 });
  git(['checkout', '-q', p3], { cwd: t2 });
  assert.equal(jobTest(r2, 'alpha', { toolRoot: t2, log: quiet }).ok, true);
});

// origin: the tranche and job/alpha (a start commit and work), then the tranche moves on by
// merges of other work. The clone is depth 1, as a session's is.
function shallowJob() {
  const src = makeRepo({
    'process/ledger/alpha.json': entry('alpha'),
    'req/alpha.md': '# alpha\n',
    'test/alpha/a.test.mjs': passing,
  });
  git(['branch', 'tranche'], { cwd: src });
  const bare = bareOrigin(src, 'main', 'tranche');
  jobStart(src, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: src });
  commit(src, { 'src/alpha/a.mjs': '1\n' }, 'one');
  commit(src, { 'src/alpha/a.mjs': '2\n' }, 'two');
  git(['push', '-q', 'origin', 'job/alpha'], { cwd: src });
  git(['checkout', '-q', 'tranche'], { cwd: src });
  for (let i = 0; i < 4; i++) commit(src, { [`src/other/${i}.mjs`]: `${i}\n` }, `other ${i}`);
  git(['push', '-q', 'origin', 'tranche'], { cwd: src });
  const count = (range) => Number(git(['rev-list', '--count', range], { cwd: src }));
  const compare = (slug, base, h) => ({ ahead_by: count(`${base}..${h}`), behind_by: count(`${h}..${base}`), merge_base_commit: { sha: git(['merge-base', base, h], { cwd: src }) } });
  const clone = (branch) => {
    const c = join(mkdtempSync(join(tmpdir(), 'p3-shallow-')), 'c');
    git(['clone', '-q', '--depth', '1', '--branch', branch, `file://${bare}`, c], { cwd: src });
    git(['config', 'user.email', 'job@example.com'], { cwd: c });
    git(['config', 'user.name', 'Job'], { cwd: c });
    return c;
  };
  return { src, compare, clone };
}

test('#3: in a depth-1 clone the tranche cannot be merged by hand; job sync deepens from compare and merges it', () => {
  const { src, compare, clone } = shallowJob();
  const c = clone('job/alpha');
  git(['fetch', '-q', '--depth', '1', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche'], { cwd: c });
  const hand = git(['merge', '--no-edit', 'origin/tranche'], { cwd: c, allowFail: true });
  assert.notEqual(hand.code, 0);
  assert.match(hand.stderr, /unrelated histories/);
  const asked = [];
  const s = jobSync(c, 'alpha', { compare: (...a) => { asked.push(a.slice(1)); return compare(...a); }, log: quiet });
  assert.deepEqual(asked, [['tranche', 'job/alpha']]);
  assert.deepEqual(s.merged, ['tranche']);
  const parents = git(['rev-list', '--parents', '-1', 'HEAD'], { cwd: c }).split(' ');
  assert.deepEqual(parents.slice(1), [head(src, 'job/alpha'), head(src, 'tranche')], 'a merge commit of the branch and the tranche');
  assert.equal(git(['diff', '--name-only', 'HEAD^1', 'HEAD'], { cwd: c }).split('\n').sort().join(' '), 'src/other/0.mjs src/other/1.mjs src/other/2.mjs src/other/3.mjs', 'only the tranche\'s work comes in');
  assert.equal(git(['merge-base', '--is-ancestor', 'origin/tranche', 'HEAD'], { cwd: c, allowFail: true }).code, 0);
  // Run again: nothing to merge.
  assert.deepEqual(jobSync(c, 'alpha', { compare, log: quiet }).merged, []);
});

test('#3: a replacement session at the tranche tip: job sync checks out job/<id> from origin and brings the tranche in', () => {
  const { src, compare, clone } = shallowJob();
  const c = clone('tranche');
  const s = jobSync(c, 'alpha', { compare, log: quiet });
  assert.equal(git(['symbolic-ref', '--short', 'HEAD'], { cwd: c }), 'job/alpha');
  assert.equal(head(c, 'HEAD^1'), head(c, 'refs/remotes/origin/job/alpha'), 'from origin\'s job/alpha, which send and job complete read');
  assert.deepEqual(s.merged, ['tranche']);
  assert.equal(head(c, 'HEAD^1'), head(src, 'job/alpha'));
  // A local job/<id> that is not checked out is refused, as job complete refuses it.
  git(['checkout', '-q', '--detach'], { cwd: c });
  assert.throws(() => jobSync(c, 'alpha', { compare, log: quiet }), /run this on branch job\/alpha/);
});

test('#3: a conflict is left for the job to resolve, naming its files and the next step', () => {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), 'req/alpha.md': '# alpha\n', 'test/alpha/a.test.mjs': passing, 'src/alpha/a.mjs': '0\n' });
  git(['branch', 'tranche'], { cwd: root });
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'src/alpha/a.mjs': 'tranche\n' });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/a.mjs': 'job\n' });
  assert.throws(() => jobSync(root, 'alpha', { push: false, log: quiet }), /(^|: )tranche does not merge cleanly: src\/alpha\/a\.mjs\. The merge is left in progress: resolve those files, `git add` them and `git commit --no-edit`, then run `node \.process\/tool\/p3\.mjs job sync alpha` again/);
  write(root, { 'src/alpha/a.mjs': 'both\n' });
  git(['add', 'src/alpha/a.mjs'], { cwd: root });
  git(['commit', '-q', '--no-edit'], { cwd: root });
  assert.deepEqual(jobSync(root, 'alpha', { push: false, log: quiet }).merged, []);
});

// Copy, 4 Nov: BOB's merge brought the tranche into job/alpha and appended its merge row; the
// gate on the result went red and BOB sent the job back.
function bobMerged() {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), 'req/alpha.md': '# alpha\n', 'test/alpha/a.test.mjs': passing });
  git(['branch', 'tranche'], { cwd: root });
  const bare = bareOrigin(root, 'main', 'tranche');
  const f = fakeGitHub();
  jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  assert.equal(jobComplete(root, 'alpha', { gh: f.gh, log: quiet }).ok, true);
  const complete = head(root);
  // BOB, in a clone of its own: the tranche moves, merged into job/alpha, then the merge row.
  const bob = join(mkdtempSync(join(tmpdir(), 'p3-bob-')), 'b');
  git(['clone', '-q', `file://${bare}`, bob], { cwd: root });
  git(['config', 'user.email', 'bob@example.com'], { cwd: bob });
  git(['config', 'user.name', 'BOB'], { cwd: bob });
  git(['checkout', '-q', 'tranche'], { cwd: bob });
  commit(bob, { 'src/other/o.mjs': '1\n' }, 'other work');
  git(['push', '-q', 'origin', 'tranche'], { cwd: bob });
  git(['checkout', '-q', 'job/alpha'], { cwd: bob });
  git(['merge', '-q', '--no-ff', '--no-edit', 'origin/tranche', '-m', 'Bring job/alpha up to tranche'], { cwd: bob });
  const m = join(bob, 'process/metrics/alpha.jsonl');
  write(bob, { 'process/metrics/alpha.jsonl': readFileSync(m, 'utf8') + JSON.stringify({ row: 'merge', pr: 9 }) + '\n' });
  git(['commit', '-q', '-am', 'merge row for alpha (PR 9)'], { cwd: bob });
  git(['push', '-q', 'origin', 'job/alpha'], { cwd: bob });
  return { root, f, complete, bobTip: head(bob) };
}

test('#5: after BOB\'s merge pushed to job/<id>, job complete names job sync before any work, not a rejected push', () => {
  const { root, f } = bobMerged();
  commit(root, { 'test/alpha/c.test.mjs': passing }, 'the fix for the red gate');
  const before = head(root);
  assert.throws(() => jobComplete(root, 'alpha', { gh: f.gh, log: quiet }), /origin's job\/alpha has commits this checkout lacks \(BOB's merge of the tranche, or a push from elsewhere\): run `node \.process\/tool\/p3\.mjs job sync alpha`, then job complete again; nothing was run/);
  assert.equal(head(root), before, 'nothing committed');
  assert.equal(f.state.comments.length, 1);
});

test('#5: synced with BOB\'s push, the new attempt is checked and its receipt names the COMPLETE commit, not BOB\'s merge row', () => {
  for (const fix of [false, true]) {
    const { root, f, complete, bobTip } = bobMerged();
    if (fix) commit(root, { 'test/alpha/c.test.mjs': passing }, 'the fix for the red gate');
    const s = jobSync(root, 'alpha', { log: quiet });
    assert.deepEqual(s.merged, ['origin/job/alpha'], `fix ${fix}`);
    if (!fix) assert.equal(head(root), bobTip, 'a fast-forward when the job added nothing');
    const r = jobComplete(root, 'alpha', { gh: f.gh, log: quiet });
    assert.equal(r.ok, true, `fix ${fix}`);
    assert.equal(r.receipt.attempt, 2, 'a new attempt: BOB\'s commits were never checked');
    assert.equal(r.receipt.after, complete, 'after the COMPLETE commit, found by its message');
    assert.equal(git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0], head(root), 'the push landed');
    const posted = parseBlock(f.state.comments.at(-1).body, 'p3:receipt');
    assert.equal(posted.sha, head(root));
    assert.equal(posted.commands.find((c) => c.suite), undefined, 'no suite in the session: CI runs it on the merged result (AUD-7)');
  }
});

// A product whose generated row builds an untracked file and also rewrites a committed bundle,
// as the copy's bundles.mjs does; two lock files, one of them another member's.
function generated() {
  const lock = JSON.stringify({ lockfileVersion: 3, packages: { '': {}, 'node_modules/x': { version: '1.0.0' } } });
  const root = makeRepo({
    'process/config.json': {
      lockfiles: ['src/alpha/package-lock.json', 'member/package-lock.json'],
      generated: [{ paths: ['gen/rows.mjs', 'member/dist/m.bundled.mjs'], regenerate: ['node', 'build.mjs'], verify: ['node', '-e', '0'] }],
    },
    'process/ledger/alpha.json': entry('alpha'),
    'req/alpha.md': '# alpha\n',
    'test/alpha/a.test.mjs': passing,
    'src/alpha/package-lock.json': lock,
    'member/package-lock.json': lock,
    'member/dist/m.bundled.mjs': 'committed\n',
    'build.mjs': "import { mkdirSync, writeFileSync } from 'node:fs'; mkdirSync('gen', { recursive: true }); writeFileSync('gen/rows.mjs', 'export {};\\n'); writeFileSync('member/dist/m.bundled.mjs', 'rebuilt ' + Date.now() + '\\n');\n",
    '.gitignore': 'gen/\nnode_modules/\n',
  });
  git(['branch', 'tranche'], { cwd: root });
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  commit(root, { 'src/alpha/index.mjs': 'export const x = 1;\n' });
  // npm ci stands in: it records where it ran; the build runs for real.
  const calls = [];
  const exec = (cmd, args, o) => {
    calls.push(cmd === 'npm' ? `npm ci ${o.cwd.slice(root.length + 1)}` : `${cmd} ${args.join(' ')}`);
    return cmd === 'npm' ? { code: 0, stdout: '', stderr: '' } : run(cmd, args, o);
  };
  return { root, calls, exec };
}

test('#7: p3 test and job complete put back the committed generated files the build rewrote', () => {
  const { root, exec } = generated();
  const said = [];
  assert.equal(jobTest(root, 'alpha', { exec, log: (l) => said.push(l) }).ok, true);
  assert.match(said.join('\n'), /restored the committed generated paths the build rewrote: member\/dist\/m\.bundled\.mjs/);
  assert.equal(clean(root), '', 'the tree is clean for job complete and send');
  assert.equal(readFileSync(join(root, 'member/dist/m.bundled.mjs'), 'utf8'), 'committed\n');
  assert.equal(readFileSync(join(root, 'gen/rows.mjs'), 'utf8'), 'export {};\n', 'the built-not-committed file stays');
  const r = jobComplete(root, 'alpha', { push: false, exec, log: quiet });
  assert.equal(r.ok, true);
  assert.equal(clean(root), '');
  assert.deepEqual(git(['show', '--name-only', '--format=', 'HEAD'], { cwd: root }).split('\n').sort(), ['process/ledger/alpha.json', 'process/metrics/alpha.jsonl'], 'the COMPLETE commit holds no generated file');
});

test('#10: every stale lock file is installed before the generated build, in p3 test and job complete', () => {
  for (const which of ['test', 'complete']) {
    const { root, calls, exec } = generated();
    const r = which === 'test' ? jobTest(root, 'alpha', { exec, log: quiet }) : jobComplete(root, 'alpha', { push: false, exec, log: quiet });
    assert.equal(r.ok, true, which);
    const build = calls.indexOf('node build.mjs');
    assert.ok(build > 0, which);
    assert.ok(calls.indexOf('npm ci member') >= 0 && calls.indexOf('npm ci member') < build, `${which}: the other member's lock file, installed before the build: ${calls.join('; ')}`);
    assert.equal(calls.filter((c) => c.startsWith('npm ci')).length, 2, `${which}: each lock file once`);
    if (which === 'complete') assert.ok(r.receipt.commands.some((c) => c.cmd === 'npm ci (member/package-lock.json)' && c.exit === 0));
  }
});

test('#7: a generated build that fails part way still puts back the committed paths it rewrote', () => {
  const { root, exec } = generated();
  write(root, { 'build.mjs': "import { writeFileSync } from 'node:fs'; writeFileSync('member/dist/m.bundled.mjs', 'half\\n'); process.exit(3);\n" });
  git(['commit', '-q', '-am', 'a build that fails'], { cwd: root });
  assert.equal(jobTest(root, 'alpha', { exec, log: quiet }).ok, false);
  assert.equal(clean(root), '');
});

test('#5: block after BOB\'s push names job sync, not "run block again" forever', () => {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), 'req/alpha.md': '# alpha\n', 'test/alpha/a.test.mjs': passing });
  git(['branch', 'tranche'], { cwd: root });
  const bare = bareOrigin(root, 'main', 'tranche');
  const f = fakeGitHub();
  jobStart(root, 'alpha', { coordinator: 's', setup: ready, open: f.open, find: f.find, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  const other = join(mkdtempSync(join(tmpdir(), 'p3-bob-')), 'b');
  git(['clone', '-q', '--branch', 'job/alpha', `file://${bare}`, other], { cwd: root });
  git(['config', 'user.email', 'bob@example.com'], { cwd: other });
  git(['config', 'user.name', 'BOB'], { cwd: other });
  commit(other, { 'src/other/o.mjs': '1\n' }, 'pushed from elsewhere');
  git(['push', '-q', 'origin', 'job/alpha'], { cwd: other });
  assert.throws(() => jobBlock(root, 'alpha', { reason: 'waiting', log: quiet }), /origin's job\/alpha has commits this checkout lacks: run `node \.process\/tool\/p3\.mjs job sync alpha`, then block again/);
});
