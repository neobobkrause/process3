// The provider-change route: a provider with two users, a notice at the provider's merge, the
// users' START, receipt and status, and the notice answered at the user's merge.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { jobComplete, jobStart } from '../lib/job.mjs';
import { merge } from '../lib/merge.mjs';
import { readRows } from '../lib/metrics.mjs';
import { changedIds, noticeFile, notices, providerNotice, recordAtMerge, unanswered } from '../lib/notice.mjs';
import { fetchState, readState } from '../lib/state.mjs';
import { owedNotices, status } from '../lib/status.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { commit, entry, makeRepo, onState, openPassed } from './helpers.mjs';

const quiet = () => {};
const passing = (name) => `import test from 'node:test'; test('${name}', () => {});\n`;
const REQ = '# p\n\n- **R1** *(not yet met: x)* signs a token\n- **R2** checks a token\n- **R3** keeps a log\n';
const MODULES = { modules: [
  { id: 'p', paths: ['src/p/'] },
  { id: 'u1', paths: ['src/u1/'], uses: ['p'] },
  { id: 'u2', paths: ['src/u2/'], uses: ['p'] },
  { id: 'other', paths: ['src/other/'] },
] };

// A provider p and its users u1 and u2 (and a module that uses nothing), with an origin.
function product() {
  const root = makeRepo({
    'process/config.json': { modules_file: 'process/modules.json', requirements_dir: 'req' },
    'process/modules.json': MODULES,
    ...Object.fromEntries(['p', 'u1', 'u2', 'other'].flatMap((id) => [
      [`process/ledger/${id}.json`, entry(id)],
      [`req/${id}.md`, id === 'p' ? REQ : `# ${id}\n\n- **R1** met\n`],
      [`test/${id}/a.test.mjs`, passing(`${id} ok`)],
    ])),
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'tranche', 'main'], { cwd: root });
  return root;
}
const NOTICE = { row: 'notice', key: 'p:7', provider: 'p', ids: ['R1', 'R2', 'R4'], pr: 7, users: ['u1', 'u2'] };

test('changedIds: struck, reworded, added and removed requirements; an unchanged one is not', () => {
  const after = '# p\n\n- **R1** signs a token\n- **R2** checks a token and its age\n- **R4** rotates keys\n';
  assert.deepEqual(changedIds(REQ, after), ['R1', 'R2', 'R3', 'R4']);
  assert.deepEqual(changedIds(REQ, REQ), []);
});

test('a provider notice names the changed ids and the modules whose uses name the provider', () => {
  const root = product();
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const head = commit(root, { 'req/p.md': REQ.replace('*(not yet met: x)* ', '').replace('checks a token', 'checks a token and its age') });
  const cfg = loadConfig(root);
  assert.deepEqual(providerNotice(root, cfg, { provider: 'p', requirements: 'req/p.md', base, head, pr: 7 }),
    { key: 'p:7', provider: 'p', ids: ['R1', 'R2'], pr: 7, users: ['u1', 'u2'] });
  assert.equal(providerNotice(root, cfg, { provider: 'u1', requirements: 'req/u1.md', base, head, pr: 8 }), null, 'no change, no notice');
  const other = commit(root, { 'req/other.md': '# other\n\n- **R1** met, reworded\n' });
  assert.equal(providerNotice(root, cfg, { provider: 'other', requirements: 'req/other.md', base: head, head: other, pr: 9 }), null, 'a change no module uses leaves no notice');
});

test('recordAtMerge writes the notice once and an answer per user; the other user still owes it', () => {
  const root = product();
  const cfg = loadConfig(root);
  const { row, ...notice } = NOTICE;
  assert.equal(recordAtMerge(root, cfg, { notice, user: 'p', pr: 7 }).rows.length, 1);
  assert.equal(recordAtMerge(root, cfg, { notice, user: 'p', pr: 7 }).rows.length, 0, 'a rerun adds nothing');
  assert.equal(recordAtMerge(root, cfg, { answers: ['p:7'], user: 'u1', pr: 9 }).rows.length, 1);
  fetchState(root, cfg.state_branch, { fresh: true });
  assert.deepEqual(notices(root, cfg.state_branch).map((n) => n.open), [['u2']]);
  assert.deepEqual(unanswered(root, cfg.state_branch, 'u1'), []);
  assert.equal(unanswered(root, cfg.state_branch, 'u2')[0].key, 'p:7');
});

test('job start <user> puts the notice in the START and its start row; job complete needs its test, which the receipt names', () => {
  const root = product();
  onState(root, { [noticeFile('p:7')]: JSON.stringify(NOTICE) + '\n' });
  const { start } = jobStart(root, 'u1', { coordinator: 's', push: false, log: quiet });
  assert.match(start, /## Provider notices/);
  assert.match(start, /`p:7`: provider `p` changed R1, R2, R4 \(PR 7\)/);
  assert.match(start, /confirm or adapt this module's code/);
  assert.match(start, /add or update this module's own test that exercises it/);
  assert.match(start, /--test notice:p:7="<test file>::<test name>"/);
  git(['checkout', '-q', 'job/u1'], { cwd: root });
  assert.deepEqual(readRows(root, 'u1')[0].notices, ['p:7']);
  commit(root, { 'test/u1/p.test.mjs': passing('u1 reads the token age p now checks') });
  assert.throws(() => jobComplete(root, 'u1', { push: false, log: quiet }), /provider notice p:7 has no --test; add --test notice:p:7=/);
  assert.throws(() => jobComplete(root, 'u1', { push: false, tests: ['notice:p:8=test/u1/p.test.mjs::x'], log: quiet }), /named no provider notice p:8/);
  assert.throws(() => jobComplete(root, 'u1', { push: false, tests: ['notice:p:7=test/u1/p.test.mjs::missing name'], log: quiet }), /does not contain "missing name"/);
  const r = jobComplete(root, 'u1', { push: false, tests: ['notice:p:7=test/u1/p.test.mjs::u1 reads the token age p now checks'], log: quiet });
  assert.equal(r.ok, true);
  assert.deepEqual(r.receipt.tests, [{ notice: 'p:7', file: 'test/u1/p.test.mjs', name: 'u1 reads the token age p now checks' }]);
});

test('job start on a COMPLETE user with a notice reopens it to answer the notice', () => {
  const root = product();
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'process/ledger/u2.json': entry('u2', { status: { state: 'COMPLETE' } }) });
  git(['checkout', '-q', 'main'], { cwd: root });
  onState(root, { [noticeFile('p:7')]: JSON.stringify(NOTICE) + '\n' });
  const { start } = jobStart(root, 'u2', { coordinator: 's', push: false, log: quiet });
  assert.match(start, /reopens the module after an earlier attempt merged\. What it must do: answer the provider notice p:7/);
});

test('status --role bob lists each user\'s notice and counts the user as next work with no unmet marks', () => {
  const root = product();
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, Object.fromEntries(['p', 'u1', 'u2', 'other'].map((id) => [`process/ledger/${id}.json`, entry(id, { status: { state: 'COMPLETE' } })])));
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  openPassed(root);
  onState(root, { [noticeFile('p:7')]: JSON.stringify(NOTICE) + '\n' });
  const out = [];
  const r = status(root, { role: 'bob', offline: true, log: (m) => out.push(m) });
  const text = out.join('\n');
  assert.match(text, /- u1: provider notice: p R1, R2, R4 \(PR 7\)/);
  assert.match(text, /- u2: provider notice: p R1, R2, R4 \(PR 7\)/);
  assert.deepEqual(r.next.map((x) => [x.file, x.count, x.notices]), [['req/u1.md', 0, ['p:7']], ['req/u2.md', 0, ['p:7']], ['req/p.md', 1, undefined]]);
  assert.match(text, /- req\/u1.md: 0; provider notice p:7/);
});

test('a user whose open job names the notice is no longer listed; one whose job does not still is', () => {
  const root = product();
  onState(root, { [noticeFile('p:7')]: JSON.stringify(NOTICE) + '\n' });
  git(['checkout', '-q', '-b', 'job/u1', 'tranche'], { cwd: root });
  commit(root, { 'process/metrics/u1.jsonl': JSON.stringify({ event: 'start', notices: ['p:7'] }) + '\n' });
  git(['update-ref', 'refs/remotes/origin/job/u1', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'job/u2', 'tranche'], { cwd: root });
  commit(root, { 'process/metrics/u2.jsonl': JSON.stringify({ event: 'start' }) + '\n' });
  git(['update-ref', 'refs/remotes/origin/job/u2', 'HEAD'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const cfg = loadConfig(root);
  const rows = [{ id: 'u1', tranche: 'WORKING', branch: 'WORKING' }, { id: 'u2', tranche: 'WORKING', branch: 'WORKING' }];
  assert.deepEqual(Object.keys(owedNotices(root, cfg, rows, quiet)), ['u2']);
});

// merge: the provider's job leaves the notice; the user's job answers the one its START named.
function mergeFixture(root, id, files) {
  git(['checkout', '-q', '-b', `job/${id}`, 'tranche'], { cwd: root });
  const head = commit(root, files);
  git(['push', '-q', 'origin', `job/${id}`], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const io = {
    getPR: () => ({ state: 'open', draft: false, user: { login: 'c' }, base: { ref: 'tranche' }, head: { ref: `job/${id}`, sha: head } }),
    comments: () => [
      { id: 1, body: block(RECEIPT, { module: id, attempt: 1, sha: head }), user: { login: 'c' } },
      { id: 2, body: block(GATE, { runs: [{ sha: head, ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }] }), user: { login: BOT } },
    ],
    checkRun: () => ({ status: 'completed', conclusion: 'success' }),
    verify: () => true,
    mergePR: () => ({ merged: true, sha: 'm'.repeat(40) }),
  };
  return io;
}

test('merge of the provider\'s job records the notice; merge of a user\'s job answers it', () => {
  const root = product();
  const done = JSON.stringify({ row: 'attempt', event: 'complete', at: new Date().toISOString() }) + '\n';
  const p = mergeFixture(root, 'p', { 'src/p/a.mjs': 'x', 'req/p.md': REQ.replace('*(not yet met: x)* ', ''), 'process/metrics/p.jsonl': done });
  const r = merge(root, 7, { slug: 'o/r', io: p, reviewed: 'fresh', rounds: 1, log: quiet });
  assert.deepEqual(r.notices.rows.map((x) => [x.row, x.key, x.ids, x.users]), [['notice', 'p:7', ['R1'], ['u1', 'u2']]]);
  const start = JSON.stringify({ event: 'start', notices: ['p:7'] }) + '\n';
  const u = mergeFixture(root, 'u1', { 'test/u1/p.test.mjs': passing('x'), 'process/metrics/u1.jsonl': start + done });
  const r2 = merge(root, 9, { slug: 'o/r', io: u, reviewed: 'fresh', rounds: 1, log: quiet });
  assert.deepEqual(r2.notices.rows.map((x) => [x.row, x.key, x.user]), [['answered', 'p:7', 'u1']]);
  const sb = loadConfig(root).state_branch;
  fetchState(root, sb, { fresh: true });
  assert.equal(JSON.parse(readState(root, sb, 'notices/answered/u1-p-7.json')).key, 'p:7');
  assert.deepEqual(notices(root, sb)[0].open, ['u2']);
});

test('merge run again on a merged job pull request records only its provider notices, once', () => {
  const root = product();
  git(['checkout', '-q', '-b', 'job/p', 'tranche'], { cwd: root });
  const head = commit(root, { 'req/p.md': REQ.replace('*(not yet met: x)* ', '') });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '--no-edit', 'job/p'], { cwd: root });
  const m = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const io = { getPR: () => ({ state: 'closed', merged: true, merge_commit_sha: m, head: { ref: 'job/p', sha: head }, base: { ref: 'tranche' } }) };
  const r = merge(root, 7, { slug: 'o/r', io, reviewed: 'fresh', rounds: 1, log: quiet });
  assert.deepEqual(r.notices.rows.map((x) => [x.row, x.key, x.users]), [['notice', 'p:7', ['u1', 'u2']]]);
  assert.deepEqual(merge(root, 7, { slug: 'o/r', io, reviewed: 'fresh', rounds: 1, log: quiet }).notices.rows, [], 'a second run adds nothing');
});
