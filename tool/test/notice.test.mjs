// The provider-change route: a provider with two users, a notice at the provider's merge, the
// users' START, receipt and status, and the notice answered at the user's merge.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
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
import { noticeTriage, parseTriage, recordTriage } from '../lib/triage.mjs';
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
  assert.match(start, /`p:7`: `p` changed R1, R2, R4 \(PR 7\)/);
  assert.match(start, /confirm or adapt this module's code/);
  assert.match(start, /confirm or adapt this module's code, with a test of its own for the change/);
  assert.match(start, /`--test notice:p:7=\.\.\.`/);
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

// The copy, 4 Nov: one struck requirement listed 56 notice-only jobs. Until triage records, a
// notice is one line, BOB's act, and none of its modules is next work.
function completeAll(root) {
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, Object.fromEntries(['p', 'u1', 'u2', 'other'].map((id) => [`process/ledger/${id}.json`, entry(id, { status: { state: 'COMPLETE' } })])));
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
}

test('status --role bob lists an untriaged notice once, as triage owed, and no notice-only job', () => {
  const root = product();
  completeAll(root);
  openPassed(root);
  onState(root, { [noticeFile('p:7')]: JSON.stringify(NOTICE) + '\n' });
  const out = [];
  const r = status(root, { role: 'bob', offline: true, log: (m) => out.push(m) });
  const text = out.join('\n');
  assert.match(text, /- triage owed: p:7 \(2 modules\): .*notice triage p:7/);
  assert.doesNotMatch(text, /- u[12]: provider notice/);
  assert.doesNotMatch(text, /req\/u[12].md/);
  assert.deepEqual(r.next.map((x) => x.file || x.triage), ['req/p.md', 'p:7']);
});

// The notice on origin's state branch, as merge records it, so triage --record can write beside it.
function noticed(root) {
  onState(root, { [noticeFile('p:7')]: JSON.stringify(NOTICE) + '\n' });
  git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
}

test('notice triage --record: not affected answers the notice; affected is notice work apart from layer work; a module not judged still owes triage', () => {
  const root = product();
  completeAll(root);
  openPassed(root);
  noticed(root);
  const three = { ...NOTICE, key: 'p:8', pr: 8, users: ['u1', 'u2', 'other'] };
  onState(root, { [noticeFile('p:8')]: JSON.stringify(three) + '\n' });
  git(['push', '-q', '-f', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
  const dir = mkdtempSync(join(tmpdir(), 'p3-triage-'));
  const file = join(dir, 'answer.txt');
  writeFileSync(file, 'Here is my answer.\n- `u1`: not affected: src/u1/a.mjs:3 calls p.sign only, never p.check\nu2: affected: src/u2/b.mjs:12 reads the token age\n');
  const out = [];
  const rec = recordTriage(root, 'p:7', { file, worker: 'agent-1', cost: '41k tokens', as: 'coordinator', log: (m) => out.push(m) });
  assert.deepEqual(rec.rows.map((x) => [x.row, x.user, x.verdict ?? x.by]), [['triage', 'u1', 'not affected'], ['answered', 'u1', 'triage'], ['triage', 'u2', 'affected']]);
  assert.equal(rec.rows[0].worker, 'agent-1');
  assert.equal(rec.rows[0].cost, '41k tokens');
  assert.match(out.join('\n'), /1 not affected \(answered\), 1 affected \(next work\)/);
  // The verdicts change BOB's next work: the last line wakes BOB (a rerun that adds nothing does not).
  assert.equal(out.at(-1), 'next act: wake BOB with `node .process/tool/p3.mjs send bob "notice triage p:7 recorded: run status" --from coordinator`, delivered with send_message to the address it prints');
  const rerun = [];
  assert.equal(recordTriage(root, 'p:7', { file, worker: 'agent-1', cost: '1', log: (m) => rerun.push(m) }).rows.length, 0, 'a rerun adds nothing');
  assert.doesNotMatch(rerun.join('\n'), /wake BOB/);
  // p:8: the worker judged u1 only; u2 and other still owe triage.
  writeFileSync(file, 'u1: affected: src/u1/a.mjs:3 checks the token\nother: not affected\n');
  const part = [];
  const r8 = recordTriage(root, 'p:8', { file, worker: 'agent-2', cost: '9k tokens', log: (m) => part.push(m) });
  assert.deepEqual(r8.left, ['u2', 'other']);
  assert.match(part.join('\n'), /not recorded: other: not affected cites no file:line/);
  const cfg = loadConfig(root);
  fetchState(root, cfg.state_branch, { fresh: true });
  assert.deepEqual(notices(root, cfg.state_branch).map((n) => [n.key, n.open]), [['p:7', ['u2']], ['p:8', ['u1', 'u2', 'other']]]);
  const lines = [];
  const s = status(root, { role: 'bob', offline: true, live: 0, log: (m) => lines.push(m) });
  const text = lines.join('\n');
  assert.match(text, /- triage owed: p:8 \(2 modules\)/);
  assert.match(text, /- u2: provider notice: p R1, R2, R4 \(PR 7\); affected: src\/u2\/b.mjs:12/);
  assert.match(text, /notice work \(triage judged these affected; not layer work.*\n- req\/u1.md: 0; provider notice p:8\n- req\/u2.md: 0; provider notice p:7$/m);
  assert.doesNotMatch(text, /next work, layer|next work \(.*\n- req\/u/);
  assert.deepEqual(s.next.map((x) => x.file || x.triage), ['req/p.md', 'req/u1.md', 'req/u2.md', 'p:8']);
});

test('notice triage prints BOB\'s act and the worker\'s brief: the changed text before and after, each untriaged user\'s paths and sizes; it writes nothing', () => {
  const root = product();
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'src/u1/a.mjs': 'export const a = 1;\n', 'src/u2/b.mjs': 'b\n', 'src/u2/c.mjs': 'cc\n' });
  git(['checkout', '-q', '-b', 'job/p'], { cwd: root });
  commit(root, { 'req/p.md': REQ.replace('*(not yet met: x)* ', '').replace('checks a token', 'checks a token and its age') });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '--no-edit', 'job/p'], { cwd: root });
  const m = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  noticed(root);
  const before = git(['rev-parse', 'refs/remotes/origin/process-state'], { cwd: root });
  const out = [];
  const r = noticeTriage(root, 'p:7', { log: (x) => out.push(x), io: { slug: 'o/r', getPR: () => ({ merged: true, merge_commit_sha: m }) } });
  const text = out.join('\n');
  assert.match(text, /^BOB's act: start one read-only worker, a subagent .*notice triage p:7 --record <file> --worker <its id> --cost <its cost>/);
  assert.match(text, /- R1\n  before: - \*\*R1\*\* \*\(not yet met: x\)\* signs a token\n  after:  - \*\*R1\*\* signs a token/);
  assert.match(text, /- R2\n  before: - \*\*R2\*\* checks a token\n  after:  - \*\*R2\*\* checks a token and its age/);
  assert.match(text, /- R4\n  before: \(none\)\n  after:  \(none\)/);
  assert.match(text, /<module>: not affected: <file>:<line>/);
  assert.match(text, /- u1: src\/u1\/ \(1 files, 20 bytes\)\n- u2: src\/u2\/ \(2 files, 5 bytes\)$/);
  assert.deepEqual(r.owed, ['u1', 'u2']);
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/process-state'], { cwd: root }).split('\t')[0], before, 'nothing written');
});

test('parseTriage: one verdict per module, evidence citing a file:line, other lines ignored; two verdicts for one module refused', () => {
  const { lines, bad } = parseTriage('intro\nu1: not affected: src/u1/a.mjs:3 no use\n* u2 : affected — lib/x.js:9 uses it\nu3: not affected, I think\n');
  assert.deepEqual([...lines].map(([u, v]) => [u, v.verdict, v.evidence]), [['u1', 'not affected', 'src/u1/a.mjs:3 no use'], ['u2', 'affected', 'lib/x.js:9 uses it']]);
  assert.deepEqual(bad, ['u3: not affected cites no file:line']);
  assert.throws(() => parseTriage('u1: affected: a.js:1 x\nu1: not affected: a.js:2 y\n'), /both affected and not affected/);
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

test('status --role bob fetches job/<id> of a COMPLETE user with an unanswered notice: a start pushed with no pull request yet clears its listing', () => {
  const root = product();
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, Object.fromEntries(['p', 'u1', 'u2', 'other'].map((id) => [`process/ledger/${id}.json`, entry(id, { status: { state: 'COMPLETE' } })])));
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  // u1's auto-reopened start, pushed to origin only: no remote-tracking ref here, no pull request.
  git(['checkout', '-q', '-b', 'job/u1', 'tranche'], { cwd: root });
  commit(root, { 'process/metrics/u1.jsonl': JSON.stringify({ event: 'start', notices: ['p:7'] }) + '\n' });
  git(['push', '-q', 'origin', 'job/u1'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['update-ref', '-d', 'refs/remotes/origin/job/u1'], { cwd: root });
  openPassed(root);
  onState(root, { [noticeFile('p:7')]: JSON.stringify(NOTICE) + '\n' });
  git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
  const io = { openPRs: () => [], checkRun: () => null, compare: () => null };
  const out = [];
  const r = status(root, { role: 'bob', io, log: (m) => out.push(m) });
  assert.equal(git(['rev-parse', '-q', '--verify', 'refs/remotes/origin/job/u1'], { cwd: root, allowFail: true }).code, 0, 'job/u1 fetched');
  assert.deepEqual(Object.keys(r.notices), ['u2']);
  assert.doesNotMatch(out.join('\n'), /- u1: provider notice/);
});

test('recordAtMerge answers only notices the state branch holds for the user: a key the job wrote into its start row writes nothing, outside notices/ or in it', () => {
  const root = product();
  const cfg = loadConfig(root);
  const { row, ...notice } = NOTICE;
  recordAtMerge(root, cfg, { notice, user: 'p', pr: 7 });
  const out = mkdtempSync(join(tmpdir(), 'p3-escape-'));
  const evil = `a/${'../'.repeat(12)}${out.slice(1)}/x`;
  const r = recordAtMerge(root, cfg, { answers: [evil, 'p:8', 'other:7', 'p:7'], user: 'u1', pr: 9 });
  assert.deepEqual(r.rows.map((x) => [x.row, x.key]), [['answered', 'p:7']]);
  assert.equal(existsSync(join(out, 'x.json')), false, 'nothing written outside the state worktree');
  assert.equal(recordAtMerge(root, cfg, { answers: ['p:7'], user: 'other', pr: 10 }).rows.length, 0, 'not a user of the notice');
  fetchState(root, cfg.state_branch, { fresh: true });
  assert.deepEqual(git(['ls-tree', '-r', '--name-only', `refs/remotes/origin/${cfg.state_branch}`], { cwd: root }).split('\n').filter((f) => f.startsWith('notices/')), ['notices/answered/u1-p-7.json', 'notices/p-7.json']);
});

test('a merged attempt whose start row named the notice but whose answer was not written still owes it, with the rerun named; an open attempt does not', () => {
  const root = product();
  onState(root, { [noticeFile('p:7')]: JSON.stringify(NOTICE) + '\n' });
  for (const u of ['u1', 'u2']) {
    git(['checkout', '-q', '-b', `job/${u}`, 'tranche'], { cwd: root });
    commit(root, { [`process/metrics/${u}.jsonl`]: JSON.stringify({ event: 'start', notices: ['p:7'] }) + '\n' });
    git(['update-ref', `refs/remotes/origin/job/${u}`, 'HEAD'], { cwd: root });
  }
  git(['checkout', '-q', 'main'], { cwd: root });
  const cfg = loadConfig(root);
  const out = [];
  const rows = [{ id: 'u1', tranche: 'COMPLETE', branch: 'COMPLETE', ahead: 0, pr: 'merged' }, { id: 'u2', tranche: 'COMPLETE', branch: 'WORKING', ahead: 1 }];
  assert.deepEqual(Object.keys(owedNotices(root, cfg, rows, (m) => out.push(m))), ['u1']);
  assert.match(out.join('\n'), /- u1: provider notice: p R1, R2, R4 \(PR 7\); its merged job named it, answer not recorded: run merge/);
});
