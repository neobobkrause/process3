// PD-20 (coordinator, 9 Nov, at Bob's ask: "Triaging used to be pretty instantaneous... how do we
// get it back to a lightweight process"): provider-notice triage decided at the merge, with no
// worker, wherever a deterministic rule answers it. A notice that changed no requirement id clears
// every user when its exports were read unchanged or only added to; with names removed or changed,
// only a user importing one (or importing in a way that cannot be read as names) stays owed.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { merge } from '../lib/merge.mjs';
import { noticeFile, notices } from '../lib/notice.mjs';
import { fetchState, readState } from '../lib/state.mjs';
import { noticeSlots, status } from '../lib/status.mjs';
import { importedNames, importsNamesClear, interfaceRule, noticeTriage, triageAtMerge, triageRows } from '../lib/triage.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { commit, entry, makeRepo, onState, openPassed } from './helpers.mjs';

const quiet = () => {};
const USERS = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7'];
const P_SRC = 'export function sign(x) { return x; }\nexport function verify(x) { return !!x; }\nexport default sign;\n';
// Each user reaches p differently: by a moved name, by an unmoved one (multi-line, renamed), by a
// namespace, not at all, by default, through p's test fixture (outside p's export read), by require.
const USER_FILES = {
  'src/u1/a.mjs': "import { sign } from '../p/index.mjs';\nexport const a = sign;\n",
  'src/u2/a.mjs': "// u2\nimport {\n  verify as v,\n} from '../p/index.mjs';\nexport const b = v;\n",
  'src/u3/a.mjs': "import * as p from '../p/index.mjs';\nexport const c = p.verify;\n",
  'src/u4/a.mjs': 'export const nothing = 1;\n',
  'src/u5/a.mjs': "import sign from '../p/index.mjs';\nexport const e = sign;\n",
  'src/u6/a.mjs': "import { verify } from '../p/index.mjs';\nexport const f = verify;\n",
  'test/u6/a.test.mjs': "import { fx } from '../../test/p/fixture.mjs';\nexport const g = fx;\n",
  'src/u7/a.mjs': "const p = require('../p/index.mjs');\nmodule.exports = p;\n",
};

function product(users = USERS, extra = {}) {
  const ids = ['p', ...users];
  const root = makeRepo({
    'process/config.json': { modules_file: 'process/modules.json', requirements_dir: 'req' },
    'process/modules.json': { modules: ids.map((id) => ({ id, paths: [`src/${id}/`], tests: [`test/${id}/`], ...(id === 'p' ? {} : { uses: ['p'] }) })) },
    ...Object.fromEntries(ids.flatMap((id) => [
      [`process/ledger/${id}.json`, entry(id)],
      [`req/${id}.md`, `# ${id}\n\n- **R1** met\n`],
    ])),
    'src/p/index.mjs': P_SRC,
    'test/p/fixture.mjs': 'export const fx = 1;\n',
    ...Object.fromEntries(Object.entries(USER_FILES).filter(([f]) => users.includes(f.split('/')[1]))),
    ...extra,
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'tranche', 'main'], { cwd: root });
  return root;
}

function mergeJob(root, n, files) {
  git(['checkout', '-q', '-B', 'job/p', 'tranche'], { cwd: root });
  const head = commit(root, { ...files, 'process/metrics/p.jsonl': JSON.stringify({ row: 'attempt', event: 'complete', at: new Date().toISOString() }) + '\n' });
  git(['push', '-q', '-f', 'origin', 'job/p'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const io = {
    getPR: () => ({ state: 'open', draft: false, user: { login: 'c' }, base: { ref: 'tranche' }, head: { ref: 'job/p', sha: head } }),
    comments: () => [
      { id: 1, body: block(RECEIPT, { module: 'p', attempt: 1, sha: head }), user: { login: 'c' } },
      { id: 2, body: block(GATE, { runs: [{ sha: head, ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }] }), user: { login: BOT } },
    ],
    checkRun: () => ({ status: 'completed', conclusion: 'success' }),
    verify: () => true,
    mergePR: () => ({ merged: true, sha: 'm'.repeat(40) }),
  };
  const out = [];
  const r = merge(root, n, { slug: 'o/r', io, reviewed: 'fresh', rounds: 1, reviewMinutes: 5, findings: 0, actedOn: 0, log: (m) => out.push(m) });
  return { r, out: out.join('\n') };
}
const triaged = (root, key) => {
  const cfg = loadConfig(root);
  fetchState(root, cfg.state_branch, { fresh: true });
  return new Map([...triageRows(root, cfg.state_branch)].filter(([k]) => k.startsWith(`${key}\0`)).map(([k, v]) => [k.split('\0')[1], v]));
};
const owedTriage = (root, key) => {
  const cfg = loadConfig(root);
  fetchState(root, cfg.state_branch, { fresh: true });
  return noticeSlots(root, cfg, []).slots.filter((s) => s.key === key && s.kind === 'triage').map((s) => s.user);
};

test('importedNames reads the names each import statement takes; default, namespace, export *, import() and require() are unreadable as names', () => {
  const text = [
    "import { a, b as c, type T } from './x.mjs';", // 1
    "import type { U } from './x.mjs';", // 2
    "import {\n  d,\n  e as f,\n} from './y.mjs';", // 3
    "import './side.mjs';", // 7
    "import def from './x.mjs';", // 8
    "import def2, { g } from './z.mjs';", // 9
    "import * as ns from './x.mjs';", // 10
    "export { h, i as j } from './x.mjs';", // 11
    "export * from './w.mjs';", // 12
    "const m = await import('./x.mjs');", // 13
    "const r = require('./x.mjs');", // 14
    "import { default as k } from './k.mjs';", // 15
    "import { a2 } from './two.mjs'; import { b2 } from './two.mjs';", // 16
    "import { a3 } from './three.mjs'; import * as t3 from './three.mjs';", // 17
  ].join('\n');
  const n = importedNames(text);
  const at = (line, spec) => n.get(`${line}\0${spec}`);
  assert.deepEqual(at(1, './x.mjs'), { names: ['a', 'b', 'T'] });
  assert.deepEqual(at(2, './x.mjs'), { names: ['U'] });
  assert.deepEqual(at(3, './y.mjs'), { names: ['d', 'e'] });
  assert.deepEqual(at(7, './side.mjs'), { names: [] });
  assert.deepEqual(at(8, './x.mjs'), { names: null, why: 'a default import' });
  assert.deepEqual(at(9, './z.mjs'), { names: null, why: 'a default import' });
  assert.deepEqual(at(10, './x.mjs'), { names: null, why: 'a namespace import' });
  assert.deepEqual(at(11, './x.mjs'), { names: ['h', 'i'] });
  assert.deepEqual(at(12, './w.mjs'), { names: null, why: 'an export * of it' });
  assert.deepEqual(at(13, './x.mjs'), { names: null, why: 'a dynamic import()' });
  assert.deepEqual(at(14, './x.mjs'), { names: null, why: 'a require()' });
  assert.deepEqual(at(15, './k.mjs'), { names: null, why: 'import default by name' });
  assert.deepEqual(at(16, './two.mjs'), { names: ['a2', 'b2'] });
  assert.equal(at(17, './three.mjs').names, null, 'a namespace beside names on one line is unreadable');
});

test('interfaceRule: none, added or names only with no requirement id changed and the exports read over a recorded range; anything else is null', () => {
  const read = { base: 'a'.repeat(40), head: 'b'.repeat(40), files: ['src/p/index.mjs'] };
  const n = { key: 'p:1', provider: 'p', pr: 1, ids: [], users: ['u1'], source: 1, exports_read: read };
  assert.deepEqual(interfaceRule(n), { rule: 'none', range: 'aaaaaaaaaa..bbbbbbbbbb' });
  assert.match(interfaceRule({ ...n, exports_read: { ...read, files: [] } }).why, /its export read found no entry file/);
  assert.equal(interfaceRule({ ...n, exports: { removed: [], added: ['z'], changed: [] } }).rule, 'added');
  assert.deepEqual(interfaceRule({ ...n, exports: { removed: ['x'], added: [], changed: [{ name: 'y', before: '(a)', after: '(a, b)' }] } }).names, ['x', 'y']);
  assert.match(interfaceRule({ ...n, ids: ['R2'] }).why, /requirement id\(s\) changed \(R2\)/);
  assert.match(interfaceRule({ ...n, exports_unread: 'boom' }).why, /its exports could not be read \(boom\)/);
  assert.match(interfaceRule({ ...n, exports_read: undefined }).why, /no read of its exports is recorded/);
  assert.match(interfaceRule({ ...n, exports_read: { base: 'a', head: 'b' } }).why, /no read of its exports is recorded/);
  assert.match(interfaceRule({ ...n, exports: { removed: 'x' } }).why, /export changes are unreadable/);
  assert.match(interfaceRule({ ...n, ids: undefined }).why, /requirement ids are unread/);
});

test('importsNamesClear: clears only reads of unmoved names from files the export read covered; fails closed otherwise', () => {
  const f = (text, specs) => [{ file: 'src/u/a.mjs', text, specs }];
  const s = (spec, line = 1, to = 'src/p/index.mjs') => ({ spec, line, to });
  const files = ['src/p/index.mjs'];
  const ok = importsNamesClear(f("import { verify } from '../p/index.mjs';\n", [s('../p/index.mjs')]), ['sign'], files, 'p');
  assert.deepEqual(ok, { clear: true, evidence: ["src/u/a.mjs:1 import { verify } from '../p/index.mjs';"] });
  assert.match(importsNamesClear(f("import { sign } from '../p/index.mjs';\n", [s('../p/index.mjs')]), ['sign'], files, 'p').why, /src\/u\/a\.mjs:1 imports sign, removed or changed/);
  assert.match(importsNamesClear(f("import * as p from '../p/index.mjs';\n", [s('../p/index.mjs')]), ['sign'], files, 'p').why, /is a namespace import of p/);
  assert.match(importsNamesClear(f("import { verify } from '../p/other.mjs';\n", [s('../p/other.mjs', 1, 'src/p/other.mjs')]), ['sign'], files, 'p').why, /imports src\/p\/other\.mjs, a file of p its export read did not cover/);
  assert.match(importsNamesClear(f("import { verify } from '../p/gone';\n", [s('../p/gone', 1, null)]), ['sign'], files, 'p').why, /imports '\.\.\/p\/gone', which names no file of p/);
  // A specifier the parser cannot place at the line checks.mjs gave: unread, owed.
  assert.match(importsNamesClear(f("import { verify } from '../p/index.mjs';\n", [s('../p/index.mjs', 2)]), ['sign'], files, 'p').why, /by a statement that could not be read/);
  assert.match(importsNamesClear(f("import { verify } from '../p/index.mjs';\n", [s('../p/index.mjs')]), ['Accounts.keySet'], files, 'p').why, /class member\(s\) moved \(Accounts\.keySet\)/);
});

test('rule 1: a merge whose provider changed no requirement id and no export clears every user at the merge, importers too; status owes nothing (PD-17 rehearsal)', () => {
  const root = product();
  openPassed(root);
  const { r, out } = mergeJob(root, 9, { 'src/p/index.mjs': P_SRC.replace('return !!x;', 'return Boolean(x);') });
  const [n] = r.notices.rows;
  assert.deepEqual([n.key, n.ids, n.users, n.exports], ['p:9', [], USERS, undefined]);
  assert.ok(n.exports_read?.base && n.exports_read?.head, 'the export read is recorded on the notice');
  assert.deepEqual(n.exports_read.files, ['src/p/index.mjs']);
  assert.deepEqual(r.triage.owed, []);
  assert.match(out, /notice triage p:9 at the merge: 7 of 7 not affected \(7 by no interface change\), answered: u1, u2, u3, u4, u5, u6, u7$/m);
  const t = triaged(root, 'p:9');
  assert.deepEqual([...t.keys()].sort(), USERS);
  for (const row of t.values()) {
    assert.equal(row.verdict, 'not affected');
    assert.equal(row.worker, 'merge: no interface change');
    assert.equal(row.cost, '0');
    assert.match(row.evidence, /^PR 9: no requirement id changed; exports read unchanged at [0-9a-f]{10}\.\.[0-9a-f]{10}$/);
  }
  const cfg = loadConfig(root);
  // Every user answered, as recordTriage answers a not affected: the notice is closed for all.
  assert.deepEqual(notices(root, cfg.state_branch)[0].open, []);
  assert.ok(readState(root, cfg.state_branch, 'notices/answered/u3-p-9.json'));
  assert.deepEqual(owedTriage(root, 'p:9'), []);
  const lines = [];
  status(root, { role: 'bob', offline: true, log: (m) => lines.push(m) });
  assert.doesNotMatch(lines.join('\n'), /triage owed/);
  const left = [];
  assert.deepEqual(noticeTriage(root, 'p:9', { log: (m) => left.push(m) }).owed, []);
  assert.match(left.join('\n'), /provider notice p:9: no module owes triage/);
});

test('rule 2: an export only added clears every user at the merge', () => {
  const root = product();
  const { r, out } = mergeJob(root, 10, { 'src/p/index.mjs': P_SRC + 'export function rotate() { return 1; }\n' });
  assert.deepEqual(r.notices.rows[0].exports, { removed: [], added: ['rotate'], changed: [] });
  assert.deepEqual(r.triage.owed, []);
  assert.match(out, /notice triage p:10 at the merge: 7 of 7 not affected \(7 by no interface change\)/);
  assert.match(triaged(root, 'p:10').get('u1').evidence, /^PR 10: no requirement id changed; exports read at [0-9a-f]{10}\.\.[0-9a-f]{10} only added \(rotate\), none removed or changed$/);
});

test('rule 3: with a name changed, only importers of it, or of what cannot be read as names, stay owed; the brief says why each was left (PD-17 rehearsal)', () => {
  const root = product();
  openPassed(root);
  const { r, out } = mergeJob(root, 11, { 'src/p/index.mjs': P_SRC.replace('sign(x)', 'sign(x, key)') });
  assert.deepEqual(r.notices.rows[0].exports, { removed: [], added: [], changed: [{ name: 'sign', before: 'function(x)', after: 'function(x, key)' }] });
  assert.deepEqual(r.triage.owed, ['u1', 'u3', 'u5', 'u6', 'u7']);
  assert.match(out, /notice triage p:11 at the merge: 2 of 7 not affected \(1 by imports check, 1 by imported names unchanged\), answered: u2, u4; 5 owe a worker's judgment/);
  assert.match(out, /- u1: not cleared: src\/u1\/a\.mjs:1 imports sign, removed or changed/);
  assert.match(out, /- u3: not cleared: src\/u3\/a\.mjs:1 is a namespace import of p/);
  assert.match(out, /- u5: not cleared: src\/u5\/a\.mjs:1 is a default import of p/);
  assert.match(out, /- u6: not cleared: test\/u6\/a\.test\.mjs:1 imports test\/p\/fixture\.mjs, a file of p its export read did not cover/);
  assert.match(out, /- u7: not cleared: src\/u7\/a\.mjs:1 is a require\(\) of p/);
  const t = triaged(root, 'p:11');
  assert.equal(t.get('u2').worker, 'merge: imported names unchanged');
  assert.match(t.get('u2').evidence, /^PR 11: no requirement id changed; its imports of p at [0-9a-f]{10} name none of the export\(s\) removed or changed at [0-9a-f]{10}\.\.[0-9a-f]{10} \(sign\): src\/u2\/a\.mjs:2 import \{$/);
  assert.equal(t.get('u4').worker, 'merge: imports check');
  assert.deepEqual(owedTriage(root, 'p:11'), ['u1', 'u3', 'u5', 'u6', 'u7']);
  const lines = [];
  status(root, { role: 'bob', offline: true, log: (m) => lines.push(m) });
  assert.match(lines.join('\n'), /- triage owed: p:11 \(5 modules\)/);
  // BOB's brief holds only the five, each with why the rule left it.
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '--no-edit', 'job/p'], { cwd: root });
  const tip = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const tr = noticeTriage(root, 'p:11', { log: quiet, io: { slug: 'o/r', getPR: () => ({ merged: true, merge_commit_sha: tip }) } });
  assert.deepEqual(tr.owed, ['u1', 'u3', 'u5', 'u6', 'u7']);
  assert.doesNotMatch(tr.brief, /- u2:|- u4:/);
  assert.match(tr.brief, /- u1: src\/u1\/; src\/u1\/a\.mjs:1; not cleared by rule: src\/u1\/a\.mjs:1 imports sign, removed or changed/);
});

test('fail closed at the merge: a requirement id changed, exports unread, or no export read recorded leaves every importer owed; the imports check still clears non-importers', () => {
  const root = product();
  const cfg = loadConfig(root);
  const ref = 'refs/remotes/origin/tranche';
  const read = { base: git(['rev-parse', ref], { cwd: root }), head: git(['rev-parse', ref], { cwd: root }), files: ['src/p/index.mjs'] };
  const base = { provider: 'p', users: USERS, source: 1 };
  const cases = [
    [{ ...base, key: 'p:21', pr: 21, ids: ['R1'], exports_read: read }, /requirement id\(s\) changed \(R1\)/],
    [{ ...base, key: 'p:22', pr: 22, ids: [], exports_unread: 'surface: parse failed' }, /its exports could not be read/],
    [{ ...base, key: 'p:23', pr: 23, ids: [] }, /no read of its exports is recorded/],
  ];
  for (const [notice, why] of cases) {
    const out = [];
    const r = triageAtMerge(root, cfg, notice, { ref, log: (m) => out.push(m) });
    assert.deepEqual(r.owed, ['u1', 'u2', 'u3', 'u5', 'u6', 'u7'], notice.key);
    assert.deepEqual(r.rows.filter((x) => x.row === 'triage').map((x) => [x.user, x.worker]), [['u4', 'merge: imports check']]);
    assert.match(out.join('\n'), new RegExp(`notice triage ${notice.key} at the merge: 1 of 7 not affected \\(1 by imports check\\)`));
    assert.match(out.join('\n'), new RegExp(`- the interface rule \\(PD-20\\) does not apply: ${why.source}`));
  }
  // A class member moved: no importer is cleared by names (any instance reaches it).
  const out = [];
  const r = triageAtMerge(root, cfg, { ...base, key: 'p:24', pr: 24, ids: [], exports_read: read, exports: { removed: ['Signer.rotate'], added: [], changed: [] } }, { ref, log: (m) => out.push(m) });
  assert.deepEqual(r.owed, ['u1', 'u2', 'u3', 'u5', 'u6', 'u7']);
  assert.match(out.join('\n'), /- u2: not cleared: src\/u2\/a\.mjs imports p, and class member\(s\) moved \(Signer\.rotate\)/);
});

test('notice triage applies the rule to a notice recorded before it, reading the exports over its merged range; only the rest is briefed', () => {
  const root = product();
  // p's merged PR 30: an internal change, merged into the tranche.
  git(['checkout', '-q', '-b', 'job/p', 'tranche'], { cwd: root });
  commit(root, { 'src/p/index.mjs': P_SRC.replace('return !!x;', 'return Boolean(x);') });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '--no-edit', 'job/p'], { cwd: root });
  const m = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  // Recorded as notices were before PD-20: no export read on it, every user owed.
  onState(root, { [noticeFile('p:30')]: JSON.stringify({ row: 'notice', key: 'p:30', provider: 'p', ids: [], pr: 30, users: USERS, source: 1 }) + '\n' });
  git(['push', '-q', 'origin', 'refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
  assert.deepEqual(owedTriage(root, 'p:30'), USERS);
  const out = [];
  const r = noticeTriage(root, 'p:30', { log: (x) => out.push(x), io: { slug: 'o/r', getPR: () => ({ merged: true, merge_commit_sha: m }) } });
  assert.deepEqual(r.owed, []);
  assert.match(out.join('\n'), /^notice triage p:30 by rule \(PD-20\): 7 of 7 not affected \(7 by no interface change\), 7 recorded/m);
  assert.equal(triaged(root, 'p:30').get('u5').worker, 'notice triage: no interface change');
  assert.deepEqual(owedTriage(root, 'p:30'), []);
  // A notice whose requirement ids changed is left to the workers: nothing written, all briefed.
  onState(root, { [noticeFile('p:31')]: JSON.stringify({ row: 'notice', key: 'p:31', provider: 'p', ids: ['R1'], pr: 31, users: USERS, source: 1 }) + '\n' });
  git(['push', '-q', 'origin', '+refs/remotes/origin/process-state:refs/heads/process-state'], { cwd: root });
  const r2 = noticeTriage(root, 'p:31', { log: quiet, io: { slug: 'o/r', getPR: () => ({ merged: true, merge_commit_sha: m }) } });
  assert.deepEqual(r2.owed, USERS);
  assert.ok(r2.brief);
});

test('TypeScript export forms the surface does not read leave the notice\'s exports unread, so no interface rule clears its importers', () => {
  const root = product(['u1'], { 'src/p/index.mjs': P_SRC + 'export interface Account { id: string }\n' });
  const { r, out } = mergeJob(root, 40, { 'src/p/index.mjs': P_SRC });
  const [n] = r.notices.rows;
  assert.match(n.exports_unread, /TypeScript export forms the surface does not read in src\/p\/index\.mjs/);
  assert.equal(n.exports_read, undefined);
  assert.deepEqual(r.triage.owed, ['u1']);
  assert.match(out, /- the interface rule \(PD-20\) does not apply: its exports could not be read \(TypeScript export forms/);
});
