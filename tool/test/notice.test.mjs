// The provider-change route: a provider with two users, a notice at the provider's merge, the
// users' START, receipt and status, and the notice answered at the user's merge.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { jobComplete, jobStart } from '../lib/job.mjs';
import { merge, triageLast } from '../lib/merge.mjs';
import { readRows } from '../lib/metrics.mjs';
import { changedIds, noticeFile, noticeLine, notices, providerChange, providerNotice, recordAtMerge, unanswered, withdrawNotice } from '../lib/notice.mjs';
import { fetchState, readState } from '../lib/state.mjs';
import { owedNotices, status } from '../lib/status.mjs';
import { importFree, noticeTriage, parseTriage, recordTriage, shares, sizes, triageAtMerge } from '../lib/triage.mjs';
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
  const head = commit(root, { 'src/p/a.mjs': 'export const sign = 2;\n', 'req/p.md': REQ.replace('*(not yet met: x)* ', '').replace('checks a token', 'checks a token and its age') });
  const cfg = loadConfig(root);
  assert.deepEqual(providerNotice(root, cfg, { provider: 'p', requirements: 'req/p.md', base, head, pr: 7 }),
    { key: 'p:7', provider: 'p', ids: ['R1', 'R2'], pr: 7, users: ['u1', 'u2'], source: 1 });
  assert.equal(providerNotice(root, cfg, { provider: 'u1', requirements: 'req/u1.md', base, head, pr: 8 }), null, 'no change, no notice');
  const other = commit(root, { 'req/other.md': '# other\n\n- **R1** met, reworded\n' });
  assert.equal(providerNotice(root, cfg, { provider: 'other', requirements: 'req/other.md', base: head, head: other, pr: 9 }), null, 'a change no module uses leaves no notice');
});

// The copy, 4 Nov: membership PR 77 notified 108 users and credentials PR 74 39 for changes only to
// tests and requirement marks. The copy's entries list the requirements file among their paths.
test('a job that changed only tests, requirements text, docs or records leaves no notice, and says why; one that changed a source file does', () => {
  const root = product();
  const e = entry('p', { paths: ['src/p/', 'req/p.md'] });
  const cfg = loadConfig(root);
  const base = commit(root, { 'process/ledger/p.json': e, 'src/p/a.mjs': 'export const sign = 1;\n' });
  const struck = REQ.replace('*(not yet met: x)* ', '');
  const tests = commit(root, { 'test/p/b.test.mjs': passing('p signs'), 'req/p.md': struck, 'src/p/README.md': '# p\n', 'src/p/docs/x.txt': 'x\n', 'process/metrics/p.jsonl': '{}\n' });
  const r = providerChange(root, cfg, { provider: 'p', requirements: 'req/p.md', base, head: tests, pr: 77 });
  assert.equal(r.notice, null);
  assert.match(r.why, /^PR 77 changed R1 but no file of p's source \(src\/p\/\): only tests, requirements text, docs or records, which cannot change a user's behaviour; no notice for its 2 user\(s\)$/);
  const src = commit(root, { 'src/p/a.mjs': 'export const sign = 2;\n' });
  assert.deepEqual(providerChange(root, cfg, { provider: 'p', requirements: 'req/p.md', base, head: src, pr: 78, entry: e }).notice,
    { key: 'p:78', provider: 'p', ids: ['R1'], pr: 78, users: ['u1', 'u2'], source: 1 });
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

test('job start <user> puts the notice in the START and its start row; a notice-only job with no code change completes records-only, asking no test', () => {
  const root = product();
  onState(root, { [noticeFile('p:7')]: JSON.stringify(NOTICE) + '\n' });
  const { start } = jobStart(root, 'u1', { coordinator: 's', push: false, log: quiet });
  assert.match(start, /## Provider notices/);
  assert.match(start, /`p:7`: `p` changed R1, R2, R4 \(PR 7\)/);
  assert.match(start, /confirm or adapt this module's code; the merge records the answer/);
  assert.doesNotMatch(start, /--test notice:/);
  git(['checkout', '-q', 'job/u1'], { cwd: root });
  assert.deepEqual(readRows(root, 'u1')[0].notices, ['p:7']);
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const r = jobComplete(root, 'u1', { push: false, log: quiet });
  assert.equal(r.ok, true);
  assert.deepEqual(r.receipt.tests, []);
  assert.ok(git(['diff', '--name-only', base, 'HEAD'], { cwd: root }).split('\n').every((f) => f.startsWith('process/')), 'records only');
  // A job started when the START asked for one: its --test notice: is accepted and ignored.
  git(['reset', '-q', '--hard', base], { cwd: root });
  assert.deepEqual(jobComplete(root, 'u1', { push: false, tests: ['notice:p:7=test/u1/p.test.mjs::x'], log: quiet }).receipt.tests, []);
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

test('notice triage --record: not affected answers the notice; affected is notice work apart from layer work; nothing is recorded until every module has a line', () => {
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
  // p:8: the worker judged u1 only (its line for other cites nothing): nothing is recorded, and
  // every module still owes triage.
  writeFileSync(file, 'u1: affected: src/u1/a.mjs:3 checks the token\nother: not affected\n');
  const part = [];
  const tip = git(['ls-remote', 'origin', 'refs/heads/process-state'], { cwd: root }).split('\t')[0];
  assert.throws(() => recordTriage(root, 'p:8', { file, worker: 'agent-2', cost: '9k tokens', log: (m) => part.push(m) }),
    /^Error: refused: notice triage p:8 records only when every module has a line; 2 of 3 not judged: u2, other\. Run a worker for them, then record every file again, nothing was written$/);
  assert.match(part.join('\n'), /not recorded: other: not affected cites no file:line/);
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/process-state'], { cwd: root }).split('\t')[0], tip, 'nothing written');
  const cfg = loadConfig(root);
  fetchState(root, cfg.state_branch, { fresh: true });
  assert.deepEqual(notices(root, cfg.state_branch).map((n) => [n.key, n.open]), [['p:7', ['u2']], ['p:8', ['u1', 'u2', 'other']]]);
  const lines = [];
  const s = status(root, { role: 'bob', offline: true, live: 0, log: (m) => lines.push(m) });
  const text = lines.join('\n');
  assert.match(text, /- triage owed: p:8 \(3 modules\)/);
  assert.match(text, /- u2: provider notice: p R1, R2, R4 \(PR 7\); affected: src\/u2\/b.mjs:12/);
  assert.deepEqual(s.next.map((x) => x.file || x.triage), ['req/p.md', 'req/u2.md', 'p:8']);
  // Two workers' files, recorded together once every module has a line, each row with its worker.
  const second = join(dir, 'second.txt');
  writeFileSync(second, 'u2: not affected: src/u2/b.mjs:1 reads no token\nother: not affected: src/other/a.mjs:1 never imports p\n');
  assert.throws(() => recordTriage(root, 'p:8', { file: [file, second], worker: ['agent-2'], cost: ['9k', '8k'], log: quiet }), /one --worker and one --cost per --record/);
  const r8 = recordTriage(root, 'p:8', { file: [file, second], worker: ['agent-2', 'agent-3'], cost: ['9k', '8k'], log: quiet });
  assert.deepEqual(r8.rows.filter((x) => x.row === 'triage').map((x) => [x.user, x.verdict, x.worker, x.cost]),
    [['u1', 'affected', 'agent-2', '9k'], ['u2', 'not affected', 'agent-3', '8k'], ['other', 'not affected', 'agent-3', '8k']]);
  const after = [];
  const s2 = status(root, { role: 'bob', offline: true, live: 0, log: (m) => after.push(m) });
  const text2 = after.join('\n');
  assert.doesNotMatch(text2, /triage owed/);
  assert.match(text2, /notice work \(triage judged these affected; not layer work.*\n- req\/u1.md: 0; provider notice p:8\n- req\/u2.md: 0; provider notice p:7$/m);
  assert.doesNotMatch(text2, /next work, layer|next work \(.*\n- req\/u/);
  assert.deepEqual(s2.next.map((x) => x.file || x.triage), ['req/p.md', 'req/u1.md', 'req/u2.md']);
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
  assert.match(text, /- u1: src\/u1\/; no file imports p\n- u2: src\/u2\/; no file imports p$/);
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
  const r = merge(root, 7, { slug: 'o/r', io: p, reviewed: 'fresh', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: quiet });
  assert.deepEqual(r.notices.rows.map((x) => [x.row, x.key, x.ids, x.users]), [['notice', 'p:7', ['R1'], ['u1', 'u2']]]);
  // Triage at the merge: neither user has a file importing p, so both are answered not affected.
  assert.deepEqual(r.triage.rows.filter((x) => x.row === 'triage').map((x) => [x.user, x.verdict]), [['u1', 'not affected'], ['u2', 'not affected']]);
  assert.deepEqual(r.triage.owed, []);
  assert.equal(r.triage.next, null);
  assert.match(r.triage.rows[0].evidence, /^process\/modules\.json:\d+ u1 \(src\/u1\/\) holds no file that imports p/);
  // u1's job, which named the notice, merges after: its answer is already on the state branch.
  const start = JSON.stringify({ event: 'start', notices: ['p:7'] }) + '\n';
  const u = mergeFixture(root, 'u1', { 'test/u1/p.test.mjs': passing('x'), 'process/metrics/u1.jsonl': start + done });
  const r2 = merge(root, 9, { slug: 'o/r', io: u, reviewed: 'fresh', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: quiet });
  assert.deepEqual(r2.notices.rows, []);
  const sb = loadConfig(root).state_branch;
  fetchState(root, sb, { fresh: true });
  assert.equal(JSON.parse(readState(root, sb, 'notices/answered/u1-p-7.json')).by, 'triage');
  assert.deepEqual(notices(root, sb)[0].open, []);
});

test('merge run again on a merged job pull request records only its provider notices, once', () => {
  const root = product();
  git(['checkout', '-q', '-b', 'job/p', 'tranche'], { cwd: root });
  const head = commit(root, { 'src/p/a.mjs': 'x', 'req/p.md': REQ.replace('*(not yet met: x)* ', '') });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '--no-edit', 'job/p'], { cwd: root });
  const m = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const io = { getPR: () => ({ state: 'closed', merged: true, merge_commit_sha: m, head: { ref: 'job/p', sha: head }, base: { ref: 'tranche' } }) };
  const r = merge(root, 7, { slug: 'o/r', io, reviewed: 'fresh', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: quiet });
  assert.deepEqual(r.notices.rows.map((x) => [x.row, x.key, x.users]), [['notice', 'p:7', ['u1', 'u2']]]);
  assert.deepEqual(merge(root, 7, { slug: 'o/r', io, reviewed: 'fresh', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: quiet }).notices.rows, [], 'a second run adds nothing');
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

test('merge of a provider job that changed only tests and requirement marks records no notice and prints why', () => {
  const root = product();
  const done = JSON.stringify({ row: 'attempt', event: 'complete', at: new Date().toISOString() }) + '\n';
  const p = mergeFixture(root, 'p', { 'test/p/b.test.mjs': passing('p signs'), 'req/p.md': REQ.replace('*(not yet met: x)* ', ''), 'process/metrics/p.jsonl': done });
  const out = [];
  const r = merge(root, 77, { slug: 'o/r', io: p, reviewed: 'fresh', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: (m) => out.push(m) });
  assert.equal(r.merged, true);
  assert.deepEqual(r.notices.rows, []);
  assert.match(out.join('\n'), /no provider notice: PR 77 changed R1 but no file of p's source \(src\/p\/\): only tests, requirements text, docs or records/);
  const sb = loadConfig(root).state_branch;
  fetchState(root, sb, { fresh: true });
  assert.deepEqual(notices(root, sb), []);
});

// A job pull request merged into the tranche by a merge commit, as GitHub merges it.
function mergedJob(root, files) {
  git(['checkout', '-q', '-B', 'job/p', 'tranche'], { cwd: root });
  commit(root, files);
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '--no-edit', 'job/p'], { cwd: root });
  const m = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return m;
}

test('notice withdraw: a notice whose PR changed no provider source is withdrawn and status drops it; one whose PR changed source is refused', () => {
  const root = product();
  completeAll(root);
  openPassed(root);
  const m74 = mergedJob(root, { 'test/p/b.test.mjs': passing('p signs'), 'req/p.md': REQ.replace('*(not yet met: x)* ', '') });
  const m75 = mergedJob(root, { 'src/p/a.mjs': 'export const sign = 2;\n' });
  const row = (pr) => JSON.stringify({ ...NOTICE, key: `p:${pr}`, pr }) + '\n';
  onState(root, { [noticeFile('p:74')]: row(74), [noticeFile('p:75')]: row(75) });
  git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
  const cfg = loadConfig(root);
  const getPR = (slug, n) => ({ merged: true, merge_commit_sha: { 74: m74, 75: m75 }[n] });
  assert.throws(() => withdrawNotice(root, cfg, 'p:75', { getPR, slug: 'o/r', log: quiet }),
    /^Error: refused: pull request 75 changed 1 file\(s\) of p's source \(src\/p\/a\.mjs\); provider notice p:75 stands$/);
  const out = [];
  const w = withdrawNotice(root, cfg, 'p:74', { getPR, slug: 'o/r', as: 'bob', log: (m) => out.push(m) });
  assert.equal(w.merge_commit, m74);
  assert.match(out.join('\n'), /provider notice p:74 withdrawn: PR 74 changed no file of p's source \(src\/p\/\); 2 unanswered user\(s\) no longer owe it/);
  fetchState(root, cfg.state_branch, { fresh: true });
  assert.deepEqual(notices(root, cfg.state_branch).map((n) => n.key), ['p:75']);
  assert.throws(() => withdrawNotice(root, cfg, 'p:74', { getPR, slug: 'o/r', log: quiet }), /provider notice p:74 is already withdrawn/);
  const lines = [];
  status(root, { role: 'bob', offline: true, live: 0, log: (m) => lines.push(m) });
  assert.doesNotMatch(lines.join('\n'), /p:74/);
  assert.match(lines.join('\n'), /- triage owed: p:75 \(2 modules\)/);
});

test('shares: a share closes at the module or byte cap; a module over the byte cap is a share of its own', () => {
  const m = (id, bytes) => ({ id, bytes });
  assert.deepEqual(shares([m('a', 100), m('b', 100), m('c', 300), m('d', 10)], { bytes: 250, modules: 25 }).map((s) => s.map((x) => x.id)), [['a', 'b'], ['c'], ['d']]);
  assert.deepEqual(shares([m('a', 1), m('b', 1), m('c', 1)], { bytes: 250, modules: 2 }).map((s) => s.map((x) => x.id)), [['a', 'b'], ['c']]);
});

// The copy, 4 Nov: membership PR 77 named 108 users; one worker judged only part of the list.
test('notice triage splits a 108-module list into parallel briefs and records only when every module is judged', () => {
  const users = Array.from({ length: 108 }, (_, i) => `u${String(i + 1).padStart(3, '0')}`);
  const root = makeRepo({
    'process/config.json': { modules_file: 'process/modules.json', requirements_dir: 'req' },
    'process/modules.json': { modules: [{ id: 'p', paths: ['src/p/'] }, ...users.map((u) => ({ id: u, paths: [`src/${u}/`], uses: ['p'] }))] },
    'process/ledger/p.json': entry('p'),
    'req/p.md': REQ,
    ...Object.fromEntries(users.map((u) => [`src/${u}/a.mjs`, `export const ${u} = 1;\n`])),
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'tranche', 'main'], { cwd: root });
  const m = mergedJob(root, { 'src/p/a.mjs': 'x', 'req/p.md': REQ.replace('*(not yet met: x)* ', '') });
  onState(root, { [noticeFile('p:77')]: JSON.stringify({ ...NOTICE, key: 'p:77', pr: 77, ids: ['R1'], users }) + '\n' });
  git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
  const out = [];
  const r = noticeTriage(root, 'p:77', { log: (x) => out.push(x), io: { slug: 'o/r', getPR: () => ({ merged: true, merge_commit_sha: m }) } });
  const text = out.join('\n');
  assert.deepEqual(r.shares.map((s) => s.length), [25, 25, 25, 25, 8]);
  assert.deepEqual(r.shares.flat(), users, 'every module in exactly one share');
  assert.equal(r.briefs.length, 5);
  assert.match(text, /^BOB's acts: 108 modules, over one worker's share .*start 5 read-only workers in parallel.*notice triage p:77 --record <file 1> --worker <id 1> --cost <cost 1> .* --record <file 5> --worker <id 5> --cost <cost 5>$/m);
  for (let k = 1; k <= 5; k++) {
    assert.match(text, new RegExp(`^- worker ${k} of 5: brief ${k} \\(${k < 5 ? 25 : 8} modules, \\d+ bytes\\)$`, 'm'));
    assert.match(r.briefs[k - 1], new RegExp(`^Read-only triage of provider notice p:77, share ${k} of 5\\.`));
  }
  assert.match(r.briefs[4], /Modules \(8; paths; the files that import p, with their import lines\):\n- u101: src\/u101\//);
  assert.doesNotMatch(r.briefs[4], /- u100:/);
  // Each worker answers its share; four of five files leave 8 modules unjudged: nothing written.
  const dir = mkdtempSync(join(tmpdir(), 'p3-triage-'));
  const files = r.shares.map((s, i) => {
    const f = join(dir, `w${i + 1}.txt`);
    writeFileSync(f, s.map((u) => `${u}: not affected: src/${u}/a.mjs:1 never imports p`).join('\n') + '\n');
    return f;
  });
  const ids = files.map((_, i) => `agent-${i + 1}`);
  const costs = files.map(() => '30k tokens');
  const tip = git(['ls-remote', 'origin', 'refs/heads/process-state'], { cwd: root }).split('\t')[0];
  assert.throws(() => recordTriage(root, 'p:77', { file: files.slice(0, 4), worker: ids.slice(0, 4), cost: costs.slice(0, 4), log: quiet }),
    /refused: notice triage p:77 records only when every module has a line; 8 of 108 not judged: u101, u102/);
  assert.equal(git(['ls-remote', 'origin', 'refs/heads/process-state'], { cwd: root }).split('\t')[0], tip, 'nothing written');
  const rec = recordTriage(root, 'p:77', { file: files, worker: ids, cost: costs, log: quiet });
  assert.equal(rec.rows.filter((x) => x.row === 'triage').length, 108);
  assert.equal(rec.rows.find((x) => x.user === 'u108').worker, 'agent-5');
  const cfg = loadConfig(root);
  fetchState(root, cfg.state_branch, { fresh: true });
  assert.deepEqual(notices(root, cfg.state_branch)[0].open, []);
});

// The copy, 4 Nov: ai-accounts' T53 rewrite removed seven of its service's methods and changed
// accountUsesOf's argument with no requirement mark changed; four users broke unwarned.
const P_INDEX = `import { Layer } from './layer.mjs';
export class Accounts extends Layer {
  accountFor(id) { return id; }
  keySet({ key = null } = {}) { return key; }
  _row() {}
}
export function accountsOf(ctx) { return new Accounts(ctx); }
`;
function withProvider(root) {
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, {
    'src/p/index.mjs': P_INDEX,
    'src/p/layer.mjs': 'export class Layer {\n  groupKeyState(group) { return group; }\n}\n',
    'src/p/README.md': '# p\n',
    'src/u1/a.mjs': "import { accountsOf } from '../p/index.mjs';\nexport const a = accountsOf;\n",
  });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
}
const doneRow = () => JSON.stringify({ row: 'attempt', event: 'complete', at: new Date().toISOString() }) + '\n';

test('merge of a provider job that changed its exports with no requirement change records a notice naming them; the START and the triage brief show them', () => {
  const root = product();
  withProvider(root);
  const changed = P_INDEX.replace('  keySet({ key = null } = {}) { return key; }\n', '').replace('accountFor(id)', 'accountFor(id, { scope })');
  const io = mergeFixture(root, 'p', {
    'src/p/index.mjs': changed,
    'src/p/layer.mjs': 'export class Layer {\n  groupKeySwitches(group) { return group; }\n}\n',
    'process/metrics/p.jsonl': doneRow(),
  });
  const out = [];
  const r = merge(root, 50, { slug: 'o/r', io, reviewed: 'fresh', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: (m) => out.push(m) });
  const [n] = r.notices.rows;
  assert.deepEqual([n.key, n.ids, n.users, n.source], ['p:50', [], ['u1', 'u2'], 2]);
  assert.deepEqual(n.exports, {
    removed: ['Accounts.groupKeyState', 'Accounts.keySet'],
    added: ['Accounts.groupKeySwitches'],
    changed: [{ name: 'Accounts.accountFor', before: '(id)', after: '(id, { scope })' }],
  });
  assert.match(out.join('\n'), /provider notice: p its source, no requirement text; exports removed Accounts\.groupKeyState, Accounts\.keySet; changed Accounts\.accountFor; added Accounts\.groupKeySwitches \(PR 50\) recorded for u1, u2/);
  const { start } = jobStart(root, 'u1', { coordinator: 's', push: false, log: quiet });
  assert.match(start, /`p:50`: `p` changed its source, no requirement text; exports removed Accounts\.groupKeyState, Accounts\.keySet; changed Accounts\.accountFor; added Accounts\.groupKeySwitches \(PR 50\)/);
  git(['checkout', '-q', 'main'], { cwd: root });
  // The triage brief, read from the merged pull request.
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '--no-edit', 'job/p'], { cwd: root });
  const m = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const brief = noticeTriage(root, 'p:50', { log: quiet, io: { slug: 'o/r', getPR: () => ({ merged: true, merge_commit_sha: m }) } }).brief;
  assert.match(brief, /changed its source in PR 50, with no requirement text changed/);
  assert.match(brief, /- removed: Accounts\.groupKeyState, Accounts\.keySet\n- changed: Accounts\.accountFor \(id\) -> \(id, \{ scope \}\)\n- added: Accounts\.groupKeySwitches/);
  assert.match(brief, /decide whether the module uses the changed behaviour or any export removed or changed/);
  // Each user with only its files that import the provider, and their import lines.
  // u2, importing nothing of p, was answered at the merge; only u1 is left for the worker.
  assert.match(out.join('\n'), /notice triage p:50 at the merge: 1 of 2 not affected \(no file imports p\), answered: u2; 1 owe a worker's judgment, recorded owed on process-state: u1\n- u1: not cleared: src\/u1\/a\.mjs imports p/);
  // The owed triage comes first after the merge line, then the ready jobs' start; the triage
  // outcome is the last line.
  const at = out.findIndex((l) => /^merged pull request 50/.test(l));
  assert.match(out[at + 1], /^first: node \.process\/tool\/p3\.mjs notice triage p:50 \(provider notice p:50; 1 user module owes a worker's judgment: u1/);
  assert.match(out[at + 2], /^then: node \.process\/tool\/p3\.mjs status --role bob, then each `job start`/);
  assert.match(out.at(-1), /^notice triage at the merge: 1 owe a worker's judgment; next act: node \.process\/tool\/p3\.mjs notice triage p:50/);
  assert.match(brief, /- u1: src\/u1\/; src\/u1\/a\.mjs:1$/);
});

// The copy, 4 Nov: case-catalogue:224's users case-checker and ratification both import it; the
// merge cleared neither, wrote no row, and BOB's worker triaged it 9.6 min later.
test('a merge whose every notice user imports the provider records each owed at its merge and prints its triage as the first act', () => {
  const root = product();
  withProvider(root);
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'src/u2/a.mjs': "import { accountsOf } from '../p/index.mjs';\nexport const b = accountsOf;\n" });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const io = mergeFixture(root, 'p', { 'src/p/index.mjs': P_INDEX.replace('return id;', 'return String(id);'), 'process/metrics/p.jsonl': doneRow() });
  const out = [];
  const r = merge(root, 224, { slug: 'o/r', io, reviewed: 'fresh', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: (m) => out.push(m) });
  assert.deepEqual(r.notices.rows.map((x) => [x.key, x.users]), [['p:224', ['u1', 'u2']]]);
  assert.deepEqual(r.triage.owed, ['u1', 'u2']);
  // One owed row per user, written at the merge, none a verdict.
  assert.deepEqual(r.triage.rows.map((x) => [x.row, x.user, x.key, x.by]), [['owed', 'u1', 'p:224', 'merge'], ['owed', 'u2', 'p:224', 'merge']]);
  const cfg = loadConfig(root);
  fetchState(root, cfg.state_branch, { fresh: true });
  const row = JSON.parse(readState(root, cfg.state_branch, 'notices/triage/owed/u2-p-224.json'));
  assert.equal(row.next, 'node .process/tool/p3.mjs notice triage p:224');
  assert.match(row.why, /src\/u2\/a\.mjs imports p/);
  assert.match(git(['log', '-1', '--format=%s', `refs/remotes/origin/${cfg.state_branch}`], { cwd: root }), /^notice triage p:224 at its merge: 2 owe a worker's judgment \(u1, u2\)$/);
  // Owed is not judged: the notice still has both open, and a worker's record still takes both.
  assert.deepEqual(notices(root, cfg.state_branch)[0].open, ['u1', 'u2']);
  assert.match(out.join('\n'), /notice triage p:224 at the merge: 0 of 2 not affected \(no file imports p\), none answered; 2 owe a worker's judgment, recorded owed on process-state: u1, u2/);
  const at = out.findIndex((l) => /^merged pull request 224/.test(l));
  assert.match(out[at + 1], /^first: node \.process\/tool\/p3\.mjs notice triage p:224 \(provider notice p:224; 2 user modules owe a worker's judgment: u1, u2/);
  assert.match(out[at + 2], /^then: node \.process\/tool\/p3\.mjs status --role bob/);
  assert.match(out.at(-1), /^notice triage at the merge: 2 owe a worker's judgment; next act: node \.process\/tool\/p3\.mjs notice triage p:224/);
  // merge run again after it landed: its triage, still owed, is the first act there too.
  const again = [];
  git(['fetch', '-q', 'origin', 'job/p:job/p-merged'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '--no-edit', 'job/p-merged'], { cwd: root });
  const m = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  merge(root, 224, { slug: 'o/r', io: { ...io, getPR: () => ({ state: 'closed', merged: true, merge_commit_sha: m, user: { login: 'c' }, base: { ref: 'tranche' }, head: { ref: 'job/p', sha: m } }), compare: () => null }, reviewed: 'fresh', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: (x) => again.push(x) });
  assert.ok(again.some((l) => /^first: node \.process\/tool\/p3\.mjs notice triage p:224 /.test(l)), again.join('\n'));
  const dir = mkdtempSync(join(tmpdir(), 'p3-triage-'));
  const f = join(dir, 'w.txt');
  writeFileSync(f, 'u1: affected: src/u1/a.mjs:1 imports accountsOf\nu2: affected: src/u2/a.mjs:1 imports accountsOf\n');
  const rec = recordTriage(root, 'p:224', { file: [f], worker: ['agent-1'], cost: ['0.2'], log: quiet });
  assert.deepEqual(rec.rows.filter((x) => x.row === 'triage').map((x) => [x.user, x.verdict]), [['u1', 'affected'], ['u2', 'affected']]);
});

test('a merge that leaves no triage owed prints the ready jobs\' start first, as before', () => {
  const root = product();
  const io = mergeFixture(root, 'p', { 'src/p/a.mjs': 'x', 'req/p.md': REQ.replace('*(not yet met: x)* ', ''), 'process/metrics/p.jsonl': doneRow() });
  const out = [];
  merge(root, 7, { slug: 'o/r', io, reviewed: 'fresh', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: (m) => out.push(m) });
  const at = out.findIndex((l) => /^merged pull request 7/.test(l));
  assert.match(out[at + 1], /^first: node \.process\/tool\/p3\.mjs status --role bob, then each `job start`/);
  assert.ok(!out.some((l) => /^then: /.test(l)));
});

test('a source change with no export change still records a notice, with no exports named; a test-only change with no requirement change records none', () => {
  const root = product();
  withProvider(root);
  const io = mergeFixture(root, 'p', { 'src/p/index.mjs': P_INDEX.replace('return id;', 'return String(id);'), 'process/metrics/p.jsonl': doneRow() });
  const r = merge(root, 51, { slug: 'o/r', io, reviewed: 'fresh', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: quiet });
  assert.deepEqual(r.notices.rows.map((x) => [x.key, x.ids, x.source, x.exports]), [['p:51', [], 1, undefined]]);
  assert.equal(noticeLine(r.notices.rows[0]), 'provider notice: p its source, no requirement text (PR 51)');
  const root2 = product();
  withProvider(root2);
  const io2 = mergeFixture(root2, 'p', { 'test/p/b.test.mjs': passing('p b'), 'src/p/README.md': '# p, read me\n', 'process/metrics/p.jsonl': doneRow() });
  const out = [];
  const r2 = merge(root2, 52, { slug: 'o/r', io: io2, reviewed: 'fresh', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: (x) => out.push(x) });
  assert.deepEqual(r2.notices.rows, []);
  assert.match(out.join('\n'), /provider notices for PR 52: nothing to record/);
  // Never silent: a merge that leaves no notice says no triage ran, and why.
  assert.match(out.join('\n'), /notice triage at the merge: none to run \(the merge left no provider notice\)/);
});

// Round 2 of PR 79, asked by the coordinator 4 Nov: a job STARTed before BOB withdrew its notice
// is left out of its resumed or replacement START.
function startedThenWithdrawn() {
  const root = product();
  onState(root, { [noticeFile('p:7')]: JSON.stringify(NOTICE) + '\n' });
  git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
  const gh = { open: (slug, p) => ({ number: 9, html_url: 'pr', draft: true, ...p }), find: () => null, setup: () => ({ ok: true, missing: [] }) };
  const { start } = jobStart(root, 'u1', { coordinator: 's', ...gh, log: quiet });
  assert.match(start, /`p:7`/);
  git(['fetch', '-q', 'origin', '+refs/heads/process-state:refs/remotes/origin/process-state'], { cwd: root });
  onState(root, { 'notices/withdrawn/p-7.json': JSON.stringify({ row: 'withdrawn', key: 'p:7' }) + '\n' });
  git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
  return { root, gh };
}

test('the resumed and the replacement START leave out a notice withdrawn since the start', () => {
  const { root, gh } = startedThenWithdrawn();
  const resumed = jobStart(root, 'u1', { coordinator: 's', ...gh, find: () => ({ number: 9 }), log: quiet }).start;
  assert.doesNotMatch(resumed, /p:7|## Provider notices/);
  const pr = { number: 9, html_url: 'https://x/pull/9', user: { login: 'job' } };
  const replaced = jobStart(root, 'u1', { coordinator: 's', restart: 'its session stopped', find: () => pr, notes: () => [], log: quiet }).start;
  assert.match(replaced, /replacement session/);
  assert.doesNotMatch(replaced, /p:7|## Provider notices/);
});

// Coordinator, 4 Nov: instance-setup's split retired 28 ids and notified 17 modules.
test('a split\'s retired ids notify no user; a reworded id in the same pull request still does, and merge says what it left out', () => {
  const root = product();
  const split = REQ.replace('*(not yet met: x)* signs a token', '*(retired: moved to q R1)* signs a token').replace('- **R3** keeps a log', '- **R3** *(retired: moved to q R2)*').replace('checks a token', 'checks a token and its age');
  const done = JSON.stringify({ row: 'attempt', event: 'complete', at: new Date().toISOString() }) + '\n';
  const p = mergeFixture(root, 'p', { 'src/p/a.mjs': 'x', 'req/p.md': split, 'process/metrics/p.jsonl': done });
  const out = [];
  const r = merge(root, 7, { slug: 'o/r', io: p, reviewed: 'fresh', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: (m) => out.push(m) });
  assert.deepEqual(r.notices.rows.map((x) => [x.key, x.ids]), [['p:7', ['R2']]]);
  assert.match(out.join('\n'), /provider notice p:7: left out 2 retired id\(s\), which change no behaviour: R1, R3/);
  // Only retirements, and no source change: no notice, and it says why.
  const cfg = loadConfig(root);
  git(['checkout', '-q', '-B', 'retire', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const head = commit(root, { 'req/p.md': REQ.replace('*(not yet met: x)* signs a token', '*(retired: moved to q R1)*') });
  const only = providerChange(root, cfg, { provider: 'p', requirements: 'req/p.md', base, head, pr: 8 });
  assert.equal(only.notice, null);
  assert.match(only.why, /PR 8 only retired requirements \(R1\), which change no behaviour/);
  // A source change still notifies, with the retired ids left out.
  const src = commit(root, { 'src/p/a.mjs': 'y' });
  const withSrc = providerChange(root, cfg, { provider: 'p', requirements: 'req/p.md', base, head: src, pr: 9 });
  assert.deepEqual([withSrc.notice.ids, withSrc.notice.source], [[], 1]);
  git(['checkout', '-q', 'main'], { cwd: root });
});

// Coordinator, 4 Nov: membership:77, untriaged, held 90+ modules out of next work.
test('an untriaged notice holds no module: a module that uses a notice\'s user opens by uses; a notice triage judged affected still holds it', () => {
  const ids = ['p', 'u1', 'u2', 'w'];
  const root = makeRepo({
    'process/config.json': { modules_file: 'process/modules.json', requirements_dir: 'req' },
    'process/modules.json': { modules: [{ id: 'p', paths: ['src/p/'] }, { id: 'u1', paths: ['src/u1/'], uses: ['p'] }, { id: 'u2', paths: ['src/u2/'], uses: ['p'] }, { id: 'w', paths: ['src/w/'], uses: ['u2'] }] },
    'build/layers.md': '| layer | modules |\n|---|---|\n| 1 | p, u2 |\n| 2 | u1 |\n| 3 | w |\n',
    ...Object.fromEntries(ids.flatMap((id) => [
      ...(id === 'u1' || id === 'w' ? [] : [[`process/ledger/${id}.json`, entry(id, { status: { state: 'COMPLETE' } })]]),
      [`req/${id}.md`, id === 'u1' || id === 'w' ? `# ${id}\n\n- **R1** *(not yet met: x)* do\n` : `# ${id}\n\n- **R1** met\n`],
    ])),
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'tranche', 'main'], { cwd: root });
  openPassed(root);
  onState(root, { [noticeFile('p:7')]: JSON.stringify({ ...NOTICE, users: ['u1', 'u2'] }) + '\n' });
  const next = () => status(root, { role: 'bob', offline: true, log: quiet }).next.map((x) => x.file || x.triage);
  // u1 (its own unmet marks, the notice's user) and w (layer 3, uses u2, the notice's other user).
  assert.deepEqual(next(), ['req/u1.md', 'req/w.md', 'p:7']);
  // Triage judges u2 affected: u2 is notice work, and w waits for it.
  onState(root, { 'notices/triage/u2-p-7.json': JSON.stringify({ row: 'triage', key: 'p:7', user: 'u2', verdict: 'affected', evidence: 'src/u2/a.mjs:1 calls sign', worker: 'a', cost: '1' }) + '\n' });
  assert.deepEqual(next(), ['req/u1.md', 'req/u2.md', 'p:7']);
});

test('the triage brief carries each user\'s files that import the provider, not its code: 90 users of 40 KB each are 4 briefs', () => {
  const users = Array.from({ length: 90 }, (_, i) => `u${String(i + 1).padStart(2, '0')}`);
  const big = `// ${'x'.repeat(40000)}\nexport const big = 1;\n`;
  const root = makeRepo({
    'process/config.json': { modules_file: 'process/modules.json', requirements_dir: 'req' },
    'process/modules.json': { modules: [{ id: 'p', paths: ['src/p/'] }, ...users.map((u) => ({ id: u, paths: [`src/${u}/`], uses: ['p'] }))] },
    'process/ledger/p.json': entry('p'),
    'req/p.md': REQ,
    'src/p/index.mjs': 'export const sign = 1;\n',
    ...Object.fromEntries(users.flatMap((u, i) => [
      [`src/${u}/big.mjs`, big],
      // Every other user imports p; the rest only mention it.
      [`src/${u}/use.mjs`, i % 2 ? `// p is not used here\nexport const ${u} = 1;\n` : `export const ${u} = 1;\nimport { sign } from '../p/index.mjs';\n`],
    ])),
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'tranche', 'main'], { cwd: root });
  const m = mergedJob(root, { 'src/p/index.mjs': 'export const sign = 2;\n', 'req/p.md': REQ.replace('*(not yet met: x)* ', '') });
  onState(root, { [noticeFile('p:77')]: JSON.stringify({ ...NOTICE, key: 'p:77', pr: 77, ids: ['R1'], users }) + '\n' });
  git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
  const r = noticeTriage(root, 'p:77', { log: quiet, io: { slug: 'o/r', getPR: () => ({ merged: true, merge_commit_sha: m }) } });
  assert.ok(r.briefs.length <= 4, `${r.briefs.length} briefs`);
  assert.deepEqual(r.shares.flat(), users, 'every module in exactly one share');
  assert.match(r.briefs[0], /^- u01: src\/u01\/; src\/u01\/use\.mjs:2$/m);
  assert.match(r.briefs[0], /^- u02: src\/u02\/; no file imports p$/m);
  assert.doesNotMatch(r.briefs.join('\n'), /big\.mjs/);
});

test('triage at the merge clears only provable non-importers (confirming review of PR 100): an import the brief\'s grep misses, an open attempt, a provider with no entry', () => {
  const mods = { modules: [
    { id: 'money', paths: ['src/lib/money.ts'] },
    { id: 'a', paths: ['src/a/'], uses: ['money'] },
    { id: 'b', paths: ['src/b/'], uses: ['money'] },
    { id: 'c', paths: ['src/c/'], uses: ['money'] },
    { id: 'd', paths: ['src/d/'], uses: ['money'] },
  ] };
  const root = makeRepo({
    'process/config.json': { modules_file: 'process/modules.json', requirements_dir: 'req' },
    'process/modules.json': mods,
    'src/lib/money.ts': 'export const x = 1;\n',
    'src/a/i.ts': "import { x } from '../lib/money';\n", // no "money.ts" in the text
    'src/b/i.ts': "import { y } from './own';\n",
    'src/c/i.ts': 'export const z = 1;\n',
    'src/d/i.ts': 'export const w = 1;\n',
  });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  const sha = git(['rev-parse', 'HEAD'], { cwd: root });
  // d's job is open: its branch on origin holds a commit the tip lacks.
  git(['checkout', '-q', '-b', 'job/d'], { cwd: root });
  commit(root, { 'src/d/i.ts': "import { x } from '../lib/money';\n" });
  git(['push', '-q', 'origin', 'job/d', 'main'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const cfg = loadConfig(root);
  assert.deepEqual(importFree(root, cfg, ['a', 'b', 'c', 'd'], sha, 'money').map((m) => [m.id, m.line > 0]), [['b', true], ['c', true]]);
  // A provider the modules file lacks: nothing is cleared.
  assert.deepEqual(importFree(root, cfg, ['b', 'c'], sha, 'nope'), []);
});

test('triage at the merge is never silent (copy, 4 Nov: question-explorer:199 left no row and no line BOB read): each user left owed is named with why; every early return prints', () => {
  const mods = { modules: [
    { id: 'money', paths: ['src/lib/money.ts'] },
    { id: 'a', paths: ['src/a/'] },
    { id: 'c', paths: ['src/c/'] },
    { id: 'd', paths: ['src/d/'] },
    { id: 'e', paths: ['src/e/'] },
    { id: 'f', paths: ['src/f/'] },
    { id: 'n', paths: [] },
  ] };
  const root = makeRepo({
    'process/config.json': { modules_file: 'process/modules.json', requirements_dir: 'req' },
    'process/modules.json': mods,
    'src/lib/money.ts': 'export const x = 1;\n',
    'src/a/i.ts': "import { x } from '../lib/money';\n",
    'src/c/i.ts': 'export const z = 1;\n',
    'src/d/i.ts': 'export const w = 1;\n',
    'src/e/i.ts': 'export const v = 1;\n',
    'src/f/i.ts': 'export const u = 1;\n',
  });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  const sha = git(['rev-parse', 'HEAD'], { cwd: root });
  // f's open attempt gives f a new path and imports the provider there (review of PR 104).
  git(['checkout', '-q', '-b', 'job/f'], { cwd: root });
  commit(root, { 'process/modules.json': { modules: mods.modules.map((m) => (m.id === 'f' ? { ...m, paths: ['src/f/', 'src/f2/'] } : m)) }, 'src/f2/i.ts': "import { x } from '../lib/money';\n" });
  git(['checkout', '-q', 'main'], { cwd: root });
  // d's open attempt changes its paths; e's (a BLOCKED job, as plane on the copy) changes none of them.
  git(['checkout', '-q', '-b', 'job/d'], { cwd: root });
  commit(root, { 'src/d/i.ts': "import { x } from '../lib/money';\n" });
  git(['checkout', '-q', '-b', 'job/e', 'main'], { cwd: root });
  commit(root, { 'notes/e.md': 'blocked\n' });
  git(['push', '-q', 'origin', 'job/d', 'job/e', 'job/f', 'main'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  // BOB's clone is shallow and holds no job branch: their tips are fetched, not taken as unsettled.
  const shallow = join(mkdtempSync(join(tmpdir(), 'p3-shallow-')), 'c');
  git(['clone', '-q', '--depth', '1', '--branch', 'main', `file://${bare}`, shallow], { cwd: root });
  const cfg = loadConfig(shallow);
  const whys = new Map();
  assert.deepEqual(importFree(shallow, cfg, ['a', 'c', 'd', 'e', 'f', 'n', 'zz'], sha, 'money', whys).map((m) => m.id), ['c', 'e']);
  assert.deepEqual(Object.fromEntries(whys), {
    a: 'src/a/i.ts imports money',
    d: `job/d on origin changes its paths or its files under them from ${sha.slice(0, 10)}, or its tip could not be fetched (an open attempt may add the import)`,
    f: `job/f on origin changes its paths or its files under them from ${sha.slice(0, 10)}, or its tip could not be fetched (an open attempt may add the import)`,
    n: 'no paths in process/modules.json',
    zz: 'no entry in process/modules.json',
  });
  const w2 = new Map();
  assert.deepEqual(importFree(shallow, cfg, ['c'], sha, 'nope', w2), []);
  assert.equal(w2.get('c'), 'the provider nope has no paths in process/modules.json');
  // A notice with no users prints why nothing ran.
  const out = [];
  assert.deepEqual(triageAtMerge(shallow, cfg, { key: 'money:1', provider: 'money', users: [] }, { ref: sha, log: (l) => out.push(l) }).rows, []);
  assert.match(out.join('\n'), /^notice triage money:1 at the merge: nothing to triage \(the notice names no user module\)$/);
  // The merge's last line: a failure names the act; an owed triage names it; none owed says so.
  assert.equal(triageLast({ error: 'the push of process-state failed: Internal Server Error\nmore', next: 'node .process/tool/p3.mjs notice triage money:1' }), 'notice triage at the merge FAILED (the push of process-state failed: Internal Server Error); next act: node .process/tool/p3.mjs notice triage money:1');
  assert.equal(triageLast({ rows: [{}, {}], owed: [] }), 'notice triage at the merge: 2 row(s) written, none owed');
  assert.equal(triageLast({ rows: [], owed: [], why: 'all triaged' }), 'notice triage at the merge: all triaged, none owed');
});

// C11 b (the coordinator, 7 Nov): affordances' backing.test.mjs and t46.test.mjs and screens-action's
// real.mjs import bio-plane/test/m/filings/fixture.mjs; the brief listed only users' source imports, and
// triage at the merge read only users' paths, so a user importing only the provider's test fixture
// was cleared "not affected".
test('a user whose tests import the provider\'s test fixture is listed in the brief with that file, and never cleared at the merge', () => {
  const root = makeRepo({
    'process/config.json': { modules_file: 'process/modules.json', requirements_dir: 'req' },
    'process/modules.json': { modules: [
      { id: 'filings', paths: ['src/filings/'], tests: ['test/m/filings/'] },
      { id: 'aff', paths: ['src/aff/'], tests: ['test/m/aff/'], uses: ['filings'] },
      { id: 'quiet', paths: ['src/quiet/'], tests: ['test/m/quiet/'], uses: ['filings'] },
    ] },
    'src/filings/index.mjs': 'export const f = 1;\n',
    'test/m/filings/fixture.mjs': 'export const rows = [];\n',
    'src/aff/i.mjs': 'export const a = 1;\n',
    'test/m/aff/backing.test.mjs': "import test from 'node:test';\nimport { rows } from '../filings/fixture.mjs';\ntest('x', () => rows);\n",
    'src/quiet/i.mjs': 'export const q = 1;\n',
    'test/m/quiet/q.test.mjs': "import test from 'node:test';\ntest('q', () => {});\n",
  });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  const sha = git(['rev-parse', 'HEAD'], { cwd: root });
  const cfg = loadConfig(root);
  const whys = new Map();
  assert.deepEqual(importFree(root, cfg, ['aff', 'quiet'], sha, 'filings', whys).map((m) => m.id), ['quiet']);
  assert.match(whys.get('aff'), /test\/m\/aff\/backing\.test\.mjs imports filings/);
  const s = sizes(root, cfg, ['aff', 'quiet'], sha, 'filings');
  assert.deepEqual(s.map((m) => [m.id, m.imports.map((x) => `${x.file}:${x.lines.join(',')}`)]), [['aff', ['test/m/aff/backing.test.mjs:2']], ['quiet', []]]);
});
