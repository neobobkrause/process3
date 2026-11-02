import assert from 'node:assert/strict';
import { test } from 'node:test';
import { approvalsBlock, recordCheck, recordSince } from '../lib/record.mjs';
import { DEFAULTS, git, loadConfig as loadCfg } from '../lib/util.mjs';
import { commit, makeRepo } from './helpers.mjs';

const H = '## Standing approvals from Bob';
const claude = (words) => `${H}\n\n${words}\n\n## Other\n\nmore\n`;
const cfg = { ...DEFAULTS, max_file_bytes: 100, transient: ['tmp/'] };
const web = () => ({ committer: { login: 'web-flow' }, author: { login: 'neobobkrause' }, commit: { verification: { verified: true } } });
const session = () => ({ committer: { login: 'neobobkrause' }, author: { login: 'neobobkrause' }, commit: { verification: { verified: false } } });

test('the approvals block runs from its heading to the next heading', () => {
  assert.equal(approvalsBlock(claude('may push'), H), `${H}\n\nmay push`);
  assert.equal(approvalsBlock('# nothing here\n', H), '');
});

test('a file over the limit and a transient path are found per commit', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'big.bin': 'y'.repeat(101), 'tmp/state.json': '{}' });
  const { commits, findings } = recordCheck(root, cfg, { base, lookup: session });
  assert.equal(commits, 1);
  assert.deepEqual(findings.map((f) => f.check).sort(), ['path', 'size']);
});

test('the approvals block may change only by the owner through the website', () => {
  const root = makeRepo({ 'CLAUDE.md': claude('may push') });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'CLAUDE.md': claude('may push and merge to main') });
  assert.match(recordCheck(root, cfg, { base, lookup: session }).findings[0].message, /not neobobkrause's own commit/);
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: web }).findings, []);
});

test('edits outside the approvals block pass without a lookup', () => {
  const root = makeRepo({ 'CLAUDE.md': claude('may push') });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'CLAUDE.md': claude('may push').replace('more', 'other words') });
  const never = () => { throw new Error('looked up'); };
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: never }).findings, []);
});

test('removing the block is a change too', () => {
  const root = makeRepo({ 'CLAUDE.md': claude('may push') });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'CLAUDE.md': '# gone\n' });
  assert.equal(recordCheck(root, cfg, { base, lookup: session }).findings[0].check, 'approvals');
});

// Findings from the review of PR 1.
import { main } from '../p3.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../lib/ledger.mjs';
import { entry, write } from './helpers.mjs';

test('the config is read from the base, so a change cannot switch off its own check', async () => {
  const root = makeRepo({ 'CLAUDE.md': claude('may push') });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'CLAUDE.md': claude('may push to main'), 'process/config.json': { approvals: { file: 'NONE.md' }, max_file_bytes: 1e9 } });
  const out = join(root, 'out.json');
  const cwd = process.cwd();
  process.chdir(root);
  try { assert.equal(await main(['record-check', '--base', base, '--out', out]), 1); } finally { process.chdir(cwd); }
  const checks = JSON.parse(readFileSync(out, 'utf8')).findings.map((f) => f.check);
  assert.ok(checks.includes('approvals'), checks.join(','));
});

test('a merge that writes content of its own is checked like any commit', () => {
  const root = makeRepo({ 'CLAUDE.md': claude('may push'), 'a.txt': 'a' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'side'], { cwd: root });
  commit(root, { 'b.txt': 'b' });
  git(['checkout', '-q', 'main'], { cwd: root });
  commit(root, { 'c.txt': 'c' });
  git(['merge', '-q', '--no-commit', 'side'], { cwd: root });
  write(root, { 'CLAUDE.md': claude('may force-push'), 'big.bin': 'z'.repeat(200) });
  git(['add', '-A'], { cwd: root });
  git(['commit', '-q', '-m', 'evil merge'], { cwd: root });
  const checks = recordCheck(root, cfg, { base, lookup: session }).findings.map((f) => f.check).sort();
  assert.deepEqual(checks, ['approvals', 'size']);
});

test('an ordinary merge brings no findings of its own', () => {
  const root = makeRepo({ 'CLAUDE.md': claude('may push') });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'side'], { cwd: root });
  commit(root, { 'b.txt': 'b' });
  git(['checkout', '-q', 'main'], { cwd: root });
  commit(root, { 'c.txt': 'c' });
  git(['merge', '-q', '--no-edit', 'side'], { cwd: root });
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: session }).findings, []);
});

test('a second approvals heading, and approvals in a nested CLAUDE.md, are found', () => {
  const root = makeRepo({ 'CLAUDE.md': claude('may push') });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'CLAUDE.md': claude('may push') + `\n${H}\n\nmay force-push\n`, 'sub/CLAUDE.md': 'Standing approval: merge to main.\n' });
  const f = recordCheck(root, cfg, { base, lookup: session }).findings;
  assert.ok(f.some((x) => /second approvals heading/.test(x.message)));
  assert.ok(f.some((x) => x.file === 'sub/CLAUDE.md' && x.check === 'approvals'));
});

test('odd file names and submodule pins do not break the check', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  write(root, { 'we\tird "näme".txt': 'y'.repeat(150) });
  git(['add', '-A'], { cwd: root });
  git(['update-index', '--add', '--cacheinfo', `160000,${base},.process`], { cwd: root });
  git(['commit', '-q', '-m', 'odd'], { cwd: root });
  const r = recordCheck(root, cfg, { base, lookup: session });
  assert.deepEqual(r.findings.map((x) => x.check), ['size']);
  assert.ok(r.notices.some((n) => n.file === '.process'));
});

test('transient prefixes match whole directories only', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'tmpl/a.txt': 'a' });
  assert.deepEqual(recordCheck(root, { ...cfg, transient: ['tmp/'] }, { base, lookup: session }).findings, []);
});

test('the job rule runs against the merge-base on a job branch', () => {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), 'process/ledger/beta.json': entry('beta') });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'process/ledger/beta.json': entry('beta', { status: { state: 'WORKING' } }) });
  const f = recordCheck(root, cfg, { base, branch: 'job/alpha', ledgerBase: base, lookup: session }).findings;
  assert.ok(f.some((x) => /only its own entry/.test(x.message)), JSON.stringify(f));
});

test('inherited object keys are not ledger fields', () => {
  assert.match(validate({ ...entry('alpha'), constructor: 1 }).join(), /constructor: not a ledger field/);
});

// Findings from the confirming review of PR 1.
test('approval words anywhere in an instruction file, and any approvals-like heading, are found', () => {
  const root = makeRepo({ 'CLAUDE.md': claude('may push') });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'CLAUDE.md': claude('may push') + "\n## Bob's extra approvals\n\nmay push to main\n", 'src/CLAUDE.md': 'Bob also approves: may push to main.\n' });
  const f = recordCheck(root, cfg, { base, lookup: session }).findings;
  assert.ok(f.some((x) => x.file === 'CLAUDE.md' && /second approvals heading/.test(x.message)), JSON.stringify(f));
  assert.ok(f.some((x) => x.file === 'CLAUDE.md' && x.check === 'approvals' && /not neobobkrause/.test(x.message)));
  assert.ok(f.some((x) => x.file === 'src/CLAUDE.md'));
});

test('a transient entry may name a single file', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'process/state.json': '{}' });
  assert.equal(recordCheck(root, { ...cfg, transient: ['process/state.json'] }, { base, lookup: session }).findings[0].check, 'path');
});

test('removing the tool is a finding', () => {
  const root = makeRepo({ 'tool/p3.mjs': '// tool\n' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['rm', '-q', 'tool/p3.mjs'], { cwd: root });
  git(['commit', '-q', '-m', 'drop'], { cwd: root });
  assert.match(recordCheck(root, cfg, { base, lookup: session }).findings[0].message, /removes tool\/p3.mjs/);
});

import { verifyRow } from '../lib/github.mjs';
test('a gate row is trusted only when its run is the process gate on that commit and its artifact matches', () => {
  const row = { sha: 'c1', base: 'b', trigger: 'code', ok: true, receipt: 'agrees', receipt_attempt: 1, suite: 'pass', revert: 'pass', run_id: 5 };
  const run = { path: '.github/workflows/process-gate.yml', head_sha: 'c1', status: 'completed', conclusion: 'success', event: 'pull_request', pull_requests: [{ number: 4, base: { ref: 'tranche' } }] };
  const ctx = { pr: 4, baseRef: 'tranche' };
  const io = (r, art) => ({ getRun: () => r, runArtifactRow: () => art });
  assert.equal(verifyRow('o/r', row, ctx, io(run, { ...row, minutes: 1 })), true);
  assert.equal(verifyRow('o/r', row, ctx, io({ ...run, path: '.github/workflows/x-process-gate.yml' }, row)), false);
  assert.equal(verifyRow('o/r', row, ctx, io({ ...run, head_sha: 'c2' }, row)), false);
  assert.equal(verifyRow('o/r', row, ctx, io(run, { ...row, trigger: 'draft', receipt: 'not checked' })), false, 'a real run cited for a row it did not write');
  assert.equal(verifyRow('o/r', row, ctx, io({ ...run, pull_requests: [{ number: 8, base: { ref: 'mine' } }] }, row)), false, 'a second PR on the same commit');
  assert.equal(verifyRow('o/r', row, ctx, io({ ...run, pull_requests: [...run.pull_requests, { number: 8, base: { ref: 'mine' } }] }, row)), false, 'a run that also lists a PR into another branch');
  assert.equal(verifyRow('o/r', { ...row, run_id: null }, ctx, io(run, row)), false);
});

// record_since (Bob's decision, 2 Nov 2026): old history before the process is not judged.
// A lookup that says only the listed commits are the owner's website commits.
const webFor = (...shas) => (args) => (shas.some((x) => args[1].endsWith(`/commits/${x}`)) ? web() : session());
const dated = (root, files, msg, date) => {
  const env = { GIT_COMMITTER_DATE: date, GIT_AUTHOR_DATE: date };
  write(root, files);
  git(['add', '-A'], { cwd: root });
  git(['commit', '-q', '-m', msg], { cwd: root, env: { ...process.env, ...env } });
  return git(['rev-parse', 'HEAD'], { cwd: root });
};

function oldThenProcess() {
  const root = makeRepo({ 'README.md': 'x' });
  const main = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'old/big.bin': 'y'.repeat(101) }, 'old work');
  const old = commit(root, { 'old/big2.bin': 'z'.repeat(101) }, 'more old work');
  const setup = commit(root, { 'process/config.json': { max_file_bytes: 100 }, '.process': 'pin' }, 'setup');
  const named = commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: old } }, 'Bob names record_since');
  return { root, main, old, setup, named };
}

test('record_since leaves out the commits before the process arrived', () => {
  const { root, main, named } = oldThenProcess();
  commit(root, { 'new/big.bin': 'n'.repeat(101) }, 'new work');
  const s = recordSince(root, { base: main });
  assert.equal(s.from, 'head'); // main has no config yet
  const { commits, findings } = recordCheck(root, cfg, { base: main, since: s.since, lookup: webFor(named) });
  assert.equal(commits, 3); // setup, naming it, new work
  assert.deepEqual(findings.map((f) => f.file), ['new/big.bin']);
  assert.equal(recordCheck(root, cfg, { base: main, lookup: webFor(named) }).commits, 5); // without it
});

test('only the owner\'s website commit may set record_since', () => {
  const { root, main } = oldThenProcess();
  const s = recordSince(root, { base: main });
  const f = recordCheck(root, cfg, { base: main, since: s.since, lookup: session }).findings;
  assert.equal(f.length, 1);
  assert.match(f[0].message, /changes the approvals or record_since but is not neobobkrause's own commit/);
});

test('record_since cannot reach past a commit that brought the process', () => {
  const { root, main } = oldThenProcess();
  const late = commit(root, { 'new/big.bin': 'n'.repeat(101) }, 'new work');
  commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: late } }, 'hide new work');
  const s = recordSince(root, { base: main });
  assert.equal(s.since, null);
  assert.match(s.finding.message, /not before .*a commit that adds the process config/);
});

test('record_since naming the setup commit itself is refused', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const main = git(['rev-parse', 'HEAD'], { cwd: root });
  const setup = commit(root, { 'process/config.json': { max_file_bytes: 100 } }, 'setup');
  commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: setup } }, 'name it');
  assert.equal(recordSince(root, { base: main }).since, null);
});

test('once the base has a config, record_since is ignored, even one the base names', () => {
  const { root, named } = oldThenProcess();
  // review attack 1: a head forked before the setup carries L (an approvals edit) and its own config adder F
  const pre = git(['rev-parse', `${named}~2`], { cwd: root });
  git(['checkout', '-q', '-b', 'attack', pre], { cwd: root });
  const L = commit(root, { 'CLAUDE.md': claude('may merge to main') }, 'L');
  commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: L } }, 'F');
  const s = recordSince(root, { base: named });
  assert.deepEqual(s, { since: null });
  const f = recordCheck(root, cfg, { base: named, since: s.since, lookup: session }).findings;
  assert.ok(f.some((x) => x.file === 'CLAUDE.md' && x.check === 'approvals'));
});

test('a back-dated side branch cannot pose as the commit that brought the process', () => {
  // review attack 2: L (an approvals edit) then F (adds a config, back-dated) on a side branch
  // merged into a head that holds the real setup; git log's date order would print F last.
  const { root, main, setup } = oldThenProcess();
  const pre = git(['rev-parse', `${setup}^`], { cwd: root });
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'side', pre], { cwd: root });
  const L = commit(root, { 'CLAUDE.md': claude('may merge to main') }, 'L');
  dated(root, { 'other/config-seed.txt': 'x', 'process/config.json': { max_file_bytes: 100 } }, 'F', '2025-01-01T00:00:00Z');
  git(['checkout', '-q', head], { cwd: root });
  git(['merge', '-q', '--no-edit', '-X', 'ours', 'side'], { cwd: root });
  commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: L } }, 'name L');
  const s = recordSince(root, { base: main });
  assert.equal(s.since, null);
  assert.match(s.finding.message, /not before/);
});

test('record_since naming no commit here is a finding', () => {
  const { root, main } = oldThenProcess();
  commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: 'f'.repeat(40) } }, 'bad');
  assert.match(recordSince(root, { base: main }).finding.message, /no such commit/);
});

// Who may set record_since (Bob's word on question 16, 2 Nov 2026): anyone, when it names the
// base or an ancestor of it; otherwise only the owner's website commit, as before.
function oldOnBase() {
  const root = makeRepo({ 'README.md': 'x' });
  const first = git(['rev-parse', 'HEAD'], { cwd: root });
  const base = commit(root, { 'old/big.bin': 'y'.repeat(101) }, 'old work, already on the base');
  git(['checkout', '-q', '-b', 'onboard'], { cwd: root });
  return { root, first, base };
}

test('must hold 1: a session may set record_since to the base when the base has no config', () => {
  const { root, base } = oldOnBase();
  commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: base }, '.process': 'pin' }, 'onboard');
  const s = recordSince(root, { base });
  assert.equal(s.since, base);
  const r = recordCheck(root, cfg, { base, since: s.since, lookup: session });
  assert.equal(r.commits, 1);
  assert.deepEqual(r.findings, []);
});

test('a session may set record_since to an ancestor of the base, in a later commit too', () => {
  const { root, first, base } = oldOnBase();
  commit(root, { 'process/config.json': { max_file_bytes: 100 }, '.process': 'pin' }, 'onboard');
  commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: first } }, 'name it');
  assert.deepEqual(recordCheck(root, cfg, { base, since: recordSince(root, { base }).since, lookup: session }).findings, []);
});

test('must hold 2: record_since naming a commit the head brings still needs the owner', () => {
  const { root, base } = oldOnBase();
  const brought = commit(root, { 'more/big.bin': 'z'.repeat(101) }, 'old work the head brings');
  commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: brought }, '.process': 'pin' }, 'onboard');
  const s = recordSince(root, { base });
  assert.equal(s.since, brought);
  const f = recordCheck(root, cfg, { base, since: s.since, lookup: session }).findings;
  assert.equal(f.length, 1);
  assert.match(f[0].message, /changes the approvals or record_since but is not neobobkrause's own commit/);
});

test('record_since on the base by a ref or a short id, or with no base, still needs the owner', () => {
  for (const v of ['main', 'HEAD~1']) {
    const { root, base } = oldOnBase();
    commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: v } }, 'onboard');
    assert.equal(recordCheck(root, cfg, { base, lookup: session }).findings[0]?.file, 'process/config.json', v);
  }
  const { root, base } = oldOnBase();
  commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: base.slice(0, 12) } }, 'onboard');
  assert.equal(recordCheck(root, cfg, { base, lookup: session }).findings[0]?.file, 'process/config.json');
  const r2 = makeRepo({ 'README.md': 'x' });
  const b2 = git(['rev-parse', 'HEAD'], { cwd: r2 });
  commit(r2, { 'process/config.json': { max_file_bytes: 100, record_since: b2 } }, 'onboard');
  assert.equal(recordCheck(r2, cfg, { lookup: session }).findings[0]?.file, 'process/config.json');
});

test('must hold 3: the copy\'s record_since, on its tranche but not on main, set by the owner\'s website commit, passes', () => {
  // civicsmith-copy: main has no config; the tranche holds old work and then the process.
  const { root, main, old, named } = oldThenProcess();
  assert.notEqual(git(['merge-base', '--is-ancestor', old, main], { cwd: root, allowFail: true }).code, 0);
  const s = recordSince(root, { base: main });
  assert.equal(s.since, old);
  assert.deepEqual(recordCheck(root, cfg, { base: main, since: s.since, lookup: webFor(named) }).findings, []);
});

test('record_since a session set on the tranche\'s base needs the owner once the range\'s base does not hold it', () => {
  // Onboarding into a tranche that is ahead of main: fine into the tranche, but the tranche into
  // main would hide the tranche's own commits, so there the owner's commit is needed.
  const root = makeRepo({ 'README.md': 'x' });
  const main = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: root });
  const t = commit(root, { 'old/big.bin': 'y'.repeat(101) }, 'tranche work before the process');
  const onboard = commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: t } }, 'onboard');
  assert.deepEqual(recordCheck(root, cfg, { base: t, since: recordSince(root, { base: t }).since, lookup: session }).findings, []);
  const f = recordCheck(root, cfg, { base: main, since: recordSince(root, { base: main }).since, lookup: session }).findings;
  assert.deepEqual(f.map((x) => x.file), ['process/config.json']);
  assert.match(f[0].message, new RegExp(`commit ${onboard.slice(0, 10)} changes the approvals or record_since`));
});

test('must hold 5: a session changing the approvals key fails, even beside a record_since on the base', () => {
  const { root, base } = oldOnBase();
  commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: base, approvals: { owner: 'someone', file: 'CLAUDE.md', heading: H } } }, 'onboard');
  const f = recordCheck(root, { ...cfg, max_file_bytes: 1000 }, { base, since: base, lookup: session }).findings;
  assert.deepEqual(f.map((x) => [x.check, x.file]), [['approvals', 'process/config.json']]);
  const { root: r2, base: b2 } = oldOnBase();
  commit(r2, { 'process/config.json': { max_file_bytes: 100, record_since: b2 } }, 'onboard');
  commit(r2, { 'process/config.json': { max_file_bytes: 100, record_since: b2, approvals: { owner: 'someone' } } }, 'then the approvals');
  const f2 = recordCheck(r2, { ...cfg, max_file_bytes: 1000 }, { base: b2, since: b2, lookup: session }).findings;
  assert.deepEqual(f2.map((x) => [x.check, x.file]), [['approvals', 'process/config.json']]);
});

test('a merge that itself writes record_since on the base passes; one naming a commit the head brings does not', () => {
  for (const onBaseCase of [true, false]) {
    const { root, base } = oldOnBase();
    const brought = commit(root, { 'a.txt': 'a' }, 'head work');
    git(['checkout', '-q', '-b', 'side', base], { cwd: root });
    commit(root, { 'b.txt': 'b' }, 'side work');
    git(['checkout', '-q', 'onboard'], { cwd: root });
    git(['merge', '-q', '--no-ff', '--no-commit', 'side'], { cwd: root });
    write(root, { 'process/config.json': { max_file_bytes: 100, record_since: onBaseCase ? base : brought } });
    git(['add', '-A'], { cwd: root });
    git(['commit', '-q', '-m', 'merge, writing the config'], { cwd: root });
    const f = recordCheck(root, cfg, { base, lookup: session }).findings;
    assert.deepEqual(f.map((x) => x.file), onBaseCase ? [] : ['process/config.json'], String(onBaseCase));
  }
});

test('record-pr\'s shape: the base is the tranche tip by name, moved on and not in the head', () => {
  const root = makeRepo({ 'README.md': 'x' });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: root });
  const t = commit(root, { 'old/big.bin': 'y'.repeat(101) }, 'old work');
  git(['checkout', '-q', '-b', 'build/onboard'], { cwd: root });
  commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: t } }, 'onboard');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const moved = commit(root, { 'other.txt': 'moved' }, 'tranche moves');
  git(['checkout', '-q', 'build/onboard'], { cwd: root });
  assert.deepEqual(recordCheck(root, cfg, { base: 'tranche', since: recordSince(root, { base: 'tranche' }).since, lookup: session }).findings, []);
  // A record_since on the moved tip, which the head does not hold, is refused by recordSince.
  commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: moved } }, 'name the moved tip');
  assert.equal(recordSince(root, { base: 'tranche' }).since, null);
});

test('the push check finds the base from the tranche, so onboarding pushed to a branch passes', async () => {
  const root = makeRepo({ 'README.md': 'x' });
  git(['checkout', '-q', '-b', 'tranche'], { cwd: root });
  const t = commit(root, { 'old/big.bin': 'y'.repeat(101) }, 'old work');
  git(['checkout', '-q', '-b', 'build/onboard'], { cwd: root });
  commit(root, { 'process/config.json': { max_file_bytes: 100, record_since: t }, '.process': 'pin' }, 'onboard');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'other.txt': 'the tranche moved on' }, 'tranche moves');
  const out = join(root, 'out.json');
  const cwd = process.cwd();
  process.chdir(root);
  try { assert.equal(await main(['record-check', '--head', 'build/onboard', '--onto', 'tranche', '--out', out]), 0); } finally { process.chdir(cwd); }
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')).findings, []);
});

test('a config that is not a JSON object is refused with a clear error', () => {
  const root = makeRepo({ 'process/config.json': 'null\n' });
  assert.throws(() => recordSince(root, { base: undefined }), /is not a JSON object/);
});

// The settings under .claude/ are the owner's (Bob's standing rule: sessions never change
// permission settings): a finding unless the owner's own website commit, as the approvals.
const settings = (deny) => JSON.stringify({ permissions: { deny } }) + '\n'; // small: the test limit is 100 bytes

test('the owner\'s website commit may change .claude/settings.json', () => {
  const root = makeRepo({ '.claude/settings.json': settings(['Bash(git push -f *)']) });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const sha = commit(root, { '.claude/settings.json': settings(['Bash(git push -f *)', 'Bash(gh pr merge *)']) });
  const r = recordCheck(root, cfg, { base, lookup: webFor(sha) });
  assert.deepEqual(r.findings, []);
  assert.ok(!r.notices.some((n) => n.file === '.claude/settings.json'), 'a finding or nothing, not a notice');
});

test('a session\'s commit changing .claude/settings.json, or removing it, is a finding', () => {
  const root = makeRepo({ '.claude/settings.json': settings(['Bash(git push -f *)']) });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { '.claude/settings.json': settings([]) });
  const f = recordCheck(root, cfg, { base, lookup: session }).findings;
  assert.equal(f.length, 1);
  assert.equal(f[0].check, 'settings');
  assert.match(f[0].message, /changes \.claude\/settings\.json, which is the owner's setting, but is not neobobkrause's own commit through GitHub's website/);
  const next = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['rm', '-q', '.claude/settings.json'], { cwd: root });
  git(['commit', '-q', '-m', 'drop'], { cwd: root });
  assert.deepEqual(recordCheck(root, cfg, { base: next, lookup: session }).findings.map((x) => [x.check, x.file]), [['settings', '.claude/settings.json']]);
});

test('a hooks file under .claude/ is the owner\'s too; an instruction file there is not', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { '.claude/hooks/session-start.sh': 'exit 0\n', '.claude/rules/style.md': 'Write plain words.\n' });
  const f = recordCheck(root, cfg, { base, lookup: session }).findings;
  assert.deepEqual(f.map((x) => [x.check, x.file]), [['settings', '.claude/hooks/session-start.sh']]);
});

test('a merge carrying the owner\'s settings commit unchanged is not a finding', () => {
  const root = makeRepo({ '.claude/settings.json': settings(['Bash(git push -f *)']), 'a.txt': 'a' });
  git(['checkout', '-q', '-b', 'side'], { cwd: root });
  const owner = commit(root, { '.claude/settings.json': settings(['Bash(git push -f *)', 'Bash(gh pr merge *)']) }, 'Bob, on the website');
  git(['checkout', '-q', 'main'], { cwd: root });
  const base = commit(root, { 'b.txt': 'b' });
  git(['merge', '-q', '--no-edit', 'side'], { cwd: root });
  // Only the owner's commit is judged for the file; the session's merge introduces nothing.
  const r = recordCheck(root, cfg, { base, lookup: webFor(owner) });
  assert.equal(r.commits, 2);
  assert.deepEqual(r.findings, []);
  // The same merge writing its own settings is judged as the session's.
  git(['reset', '-q', '--hard', base], { cwd: root });
  git(['merge', '-q', '--no-commit', 'side'], { cwd: root });
  write(root, { '.claude/settings.json': settings([]) });
  git(['add', '-A'], { cwd: root });
  git(['commit', '-q', '-m', 'merge that rewrites the settings'], { cwd: root });
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: webFor(owner) }).findings.map((x) => x.check), ['settings']);
});

// Confirming review of PR 16: hand-made merges cannot roll guarded files back, and the owner's
// files are found by path segment, in any case, at any depth.
import { symlinkSync } from 'node:fs';

// A merge made by hand, with the given tree and parents (git refuses to merge an ancestor).
const handMerge = (root, tree, parents, msg = 'merge') => {
  const sha = git(['commit-tree', tree, ...parents.flatMap((p) => ['-p', p]), '-m', msg], { cwd: root });
  git(['reset', '-q', '--hard', sha], { cwd: root });
  return sha;
};

test('a hand-made merge that takes settings, the approvals or a kept file from an old commit is judged as its own change', () => {
  const root = makeRepo({ '.claude/settings.json': settings(['old']), 'CLAUDE.md': claude('may push') });
  const old = git(['rev-parse', 'HEAD'], { cwd: root });
  const oldTree = git(['rev-parse', 'HEAD^{tree}'], { cwd: root });
  const base = commit(root, { '.claude/settings.json': settings(['Bash(git push -f *)']), 'CLAUDE.md': claude('may push, never force'), 'tool/p3.mjs': '// tool\n' }, 'the owner, on the website');
  handMerge(root, oldTree, [base, old], 'merge an old commit');
  const f = recordCheck(root, cfg, { base, lookup: session }).findings.map((x) => `${x.check} ${x.file}`).sort();
  assert.deepEqual(f, ['approvals CLAUDE.md', 'path tool/p3.mjs', 'settings .claude/settings.json']);
});

test('a merge carrying an in-range owner commit still passes, and an ordinary merge of other files too', () => {
  const root = makeRepo({ '.claude/agents/a.md': 'agent\n', 'a.txt': 'a' });
  git(['checkout', '-q', '-b', 'side'], { cwd: root });
  const owner = commit(root, { '.claude/agents/a.md': 'agent, changed by the owner\n' }, 'the owner, on the website');
  git(['checkout', '-q', 'main'], { cwd: root });
  const base = commit(root, { 'b.txt': 'b' });
  git(['merge', '-q', '--no-edit', 'side'], { cwd: root });
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: webFor(owner) }).findings, []);
});

test('everything in a .claude directory but rules is the owner\'s: agents, skills, commands, a link, a pin, any case, any depth, and .mcp.json', () => {
  const cases = [
    [{ '.claude/agents/reviewer.md': 'x\n' }, '.claude/agents/reviewer.md'],
    [{ '.claude/skills/deploy/SKILL.md': 'x\n' }, '.claude/skills/deploy/SKILL.md'],
    [{ '.claude/commands/go.md': 'x\n' }, '.claude/commands/go.md'],
    [{ '.Claude/settings.json': '{}\n' }, '.Claude/settings.json'],
    [{ 'sub/.claude/settings.local.json': '{}\n' }, 'sub/.claude/settings.local.json'],
    [{ '.mcp.json': '{}\n' }, '.mcp.json'],
    [{ 'pkg/.MCP.json': '{}\n' }, 'pkg/.MCP.json'],
  ];
  for (const [files, file] of cases) {
    const root = makeRepo({ 'README.md': 'x' });
    const base = git(['rev-parse', 'HEAD'], { cwd: root });
    const sha = commit(root, files);
    assert.deepEqual(recordCheck(root, cfg, { base, lookup: session }).findings.map((x) => [x.check, x.file]), [['settings', file]], file);
    assert.deepEqual(recordCheck(root, cfg, { base, lookup: webFor(sha) }).findings, [], `${file}: the owner's website commit passes`);
  }
  // Rules files stay instruction files, in any case of the directory.
  const root = makeRepo({ 'README.md': 'x' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { '.claude/rules/style.md': 'Plain words.\n', '.Claude/rules/deep/more.md': 'Short lines.\n', 'sub/CLAUDE.md': 'Notes.\n' });
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: session }).findings, []);
});

test('.claude itself as a link or a pin is the owner\'s', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  symlinkSync('elsewhere', join(root, '.claude'));
  git(['add', '.claude'], { cwd: root });
  git(['commit', '-q', '-m', 'link'], { cwd: root });
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: session }).findings.map((x) => [x.check, x.file]), [['settings', '.claude']]);
  const pin = makeRepo({ 'README.md': 'x' });
  const b2 = git(['rev-parse', 'HEAD'], { cwd: pin });
  git(['update-index', '--add', '--cacheinfo', `160000,${b2},.claude`], { cwd: pin });
  git(['commit', '-q', '-m', 'pin'], { cwd: pin });
  assert.deepEqual(recordCheck(pin, cfg, { base: b2, lookup: session }).findings.map((x) => [x.check, x.file]), [['settings', '.claude']]);
});

test('a mode-only change to an owner file is a change, in a commit and in a merge', () => {
  const root = makeRepo({ '.claude/hooks/start.sh': 'exit 0\n', 'a.txt': 'a' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['update-index', '--chmod=+x', '.claude/hooks/start.sh'], { cwd: root });
  git(['commit', '-q', '-m', 'make it run'], { cwd: root });
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: session }).findings.map((x) => [x.check, x.file]), [['settings', '.claude/hooks/start.sh']]);
  // A hand-made merge whose tree differs from both parents only in the mode.
  const r2 = makeRepo({ '.claude/hooks/start.sh': 'exit 0\n', 'a.txt': 'a' });
  const b2 = git(['rev-parse', 'HEAD'], { cwd: r2 });
  git(['checkout', '-q', '-b', 'side'], { cwd: r2 });
  const side = commit(r2, { 'c.txt': 'c' });
  git(['checkout', '-q', 'main'], { cwd: r2 });
  const first = commit(r2, { 'b.txt': 'b' });
  git(['merge', '-q', '--no-commit', 'side'], { cwd: r2 });
  git(['update-index', '--chmod=+x', '.claude/hooks/start.sh'], { cwd: r2 });
  const tree = git(['write-tree'], { cwd: r2 });
  handMerge(r2, tree, [first, side]);
  assert.deepEqual(recordCheck(r2, cfg, { base: b2, lookup: session }).findings.map((x) => [x.check, x.file]), [['settings', '.claude/hooks/start.sh']]);
});

// Third confirming review of PR 16.
function oldBranch() {
  const root = makeRepo({ '.claude/settings.json': settings(['old']), 'CLAUDE.md': claude('may push') });
  const old = git(['rev-parse', 'HEAD'], { cwd: root });
  const base = commit(root, { '.claude/settings.json': settings(['Bash(git push -f *)']), 'CLAUDE.md': claude('may push, never force') }, 'the owner, on the website');
  git(['checkout', '-q', '-b', 'stale', old], { cwd: root });
  commit(root, { 'work.txt': 'work' }, 'work on a branch cut from an old commit');
  return { root, base };
}

test('a merge whose first parent is the old side cannot keep the old settings or approvals', () => {
  const { root, base } = oldBranch();
  git(['merge', '-q', '-s', 'ours', '--no-edit', 'main'], { cwd: root });
  const f = recordCheck(root, cfg, { base, lookup: session }).findings.map((x) => `${x.check} ${x.file}`).sort();
  assert.deepEqual(f, ['approvals CLAUDE.md', 'settings .claude/settings.json']);
});

test('an ordinary merge that brings the old branch up to the base passes', () => {
  const { root, base } = oldBranch();
  git(['merge', '-q', '--no-edit', 'main'], { cwd: root });
  // The merge carries the newest block the owner set through the website (review follow-ups,
  // 2 Nov): GitHub says so of the base's commit.
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: webFor(base) }).findings, []);
});

test('CLAUDE.md is an instruction file outside .claude or directly in it, and the owner\'s deeper inside', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  commit(root, { 'docs/CLAUDE.md': 'Notes.\n', '.claude/CLAUDE.md': 'Notes.\n', '.claude/agents/CLAUDE.md': 'Notes.\n', 'sub/.claude/skills/x/CLAUDE.local.md': 'Notes.\n' });
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: session }).findings.map((x) => [x.check, x.file]).sort(),
    [['settings', '.claude/agents/CLAUDE.md'], ['settings', 'sub/.claude/skills/x/CLAUDE.local.md']]);
});

// Review follow-ups, 2 Nov: a change to the approvals block is accepted only when it leaves the
// newest block the owner set through the website among the commits it merges, or is itself a
// new website commit of the owner's.
// The tranche and main, as local branches here (origin/main and origin/tranche in CI).
const T = ['main', 'tranche'];
function closeOfTranche() {
  const root = makeRepo({ 'README.md': 'x' });
  const o1 = dated(root, { 'CLAUDE.md': claude('may push') }, 'the owner sets the approvals on main', '2026-11-01T10:00:00Z');
  git(['checkout', '-q', '-b', 'tranche'], { cwd: root });
  const o2 = dated(root, { 'CLAUDE.md': claude('may push and release') }, 'the owner widens them on the tranche', '2026-11-02T10:00:00Z');
  git(['checkout', '-q', 'main'], { cwd: root });
  const m = dated(root, { 'm.txt': 'main moves' }, 'main moves on', '2026-11-02T11:00:00Z');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  return { root, o1, o2, main: m };
}
const mergeMainWith = (root, words) => {
  git(['merge', '-q', '--no-ff', '--no-commit', 'main'], { cwd: root, allowFail: true });
  if (words) write(root, { 'CLAUDE.md': claude(words) });
  git(['add', '-A'], { cwd: root });
  git(['commit', '-q', '-m', 'merge main into the tranche'], { cwd: root });
  return git(['rev-parse', 'HEAD'], { cwd: root });
};

test('a merge of main into the tranche that puts back main\'s older approvals is refused', () => {
  const { root, o1, o2, main: m } = closeOfTranche();
  const merged = mergeMainWith(root, 'may push');
  // The tranche into main: main's block is the base's, and still the merge is refused.
  const f = recordCheck(root, cfg, { base: m, lookup: webFor(o1, o2), trusted: T }).findings;
  assert.deepEqual(f.map((x) => [x.check, x.file]), [['approvals', 'CLAUDE.md']]);
  assert.equal(f[0].message, `commit ${merged.slice(0, 10)} puts back an older approvals block; only the newest block neobobkrause set through GitHub's website (commit ${o2.slice(0, 10)}) may be carried, or a new website commit of neobobkrause's`);
  // The push of that merge to the tranche, judged against the tranche's old tip: refused too.
  assert.deepEqual(recordCheck(root, cfg, { base: o2, lookup: webFor(o1, o2), trusted: T }).findings.map((x) => x.check), ['approvals']);
});

test('a merge of main into the tranche that carries the newest owner-set approvals passes', () => {
  const { root, o1, o2, main: m } = closeOfTranche();
  mergeMainWith(root, null);
  assert.equal(approvalsBlock(git(['show', 'HEAD:CLAUDE.md'], { cwd: root }), H), approvalsBlock(claude('may push and release'), H));
  assert.deepEqual(recordCheck(root, cfg, { base: m, lookup: webFor(o1, o2), trusted: T }).findings, []);
  assert.deepEqual(recordCheck(root, cfg, { base: o2, lookup: webFor(o1, o2), trusted: T }).findings, []);
});

test('a new website commit of the owner\'s may set any block, an older one included', () => {
  const { root, o1, o2, main: m } = closeOfTranche();
  const merged = mergeMainWith(root, 'may push');
  // The owner's own website merge (or edit) is a new owner commit: accepted.
  assert.deepEqual(recordCheck(root, cfg, { base: m, lookup: webFor(o1, o2, merged), trusted: T }).findings, []);
  // So is a later website commit on the tranche that sets the older words again; the same
  // commit by anyone else is refused.
  const t = closeOfTranche();
  const again = dated(t.root, { 'CLAUDE.md': claude('may push') }, 'the owner restores them', '2026-11-02T12:00:00Z');
  assert.deepEqual(recordCheck(t.root, cfg, { base: t.o2, lookup: webFor(t.o1, t.o2, again), trusted: T }).findings, []);
  assert.match(recordCheck(t.root, cfg, { base: t.o2, lookup: webFor(t.o1, t.o2), trusted: T }).findings[0].message, new RegExp(`commit ${again.slice(0, 10)} puts back an older approvals block`));
});

test('a non-owner commit that sets the block back to the newest owner-set one passes; any other block does not', () => {
  const { root, o1, o2 } = closeOfTranche();
  const bad = commit(root, { 'CLAUDE.md': claude('may force-push') }, 'a session widens them');
  commit(root, { 'CLAUDE.md': claude('may push and release') }, 'a session puts the owner\'s words back');
  const f = recordCheck(root, cfg, { base: o2, lookup: webFor(o1, o2), trusted: T }).findings;
  assert.deepEqual(f.map((x) => x.message.slice(0, 17)), [`commit ${bad.slice(0, 10)}`]);
  assert.match(f[0].message, /is not neobobkrause's own commit through GitHub's website .*and its block is not the newest one neobobkrause set there/);
});

// approvals.owner (review follow-ups, 2 Nov): while the base has no config, the owner is the
// repository's as GitHub has it, and onboarding may set approvals.owner to that owner only.
test('while the base has no config, the owner judged by is the repository\'s owner from GitHub', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const sha = commit(root, { 'CLAUDE.md': claude('may push') }, 'alice sets the approvals on the website');
  const alice = (args) => (args[1].endsWith(`/commits/${sha}`) ? { ...web(), author: { login: 'alice' } } : session());
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: alice, repoOwner: () => 'alice' }).findings, []);
  // Without the repository's owner, the default owner is judged by, and alice's commit is not his.
  assert.match(recordCheck(root, cfg, { base, lookup: alice }).findings[0].message, /not neobobkrause's own commit/);
  // The owner cannot be read from GitHub: refused, plainly.
  assert.match(recordCheck(root, cfg, { base, lookup: alice, repoOwner: () => null }).findings[0].message, /not the repository owner's own commit through GitHub's website \(the repository's owner could not be read from GitHub\)/);
});

test('onboarding may set approvals.owner to the repository\'s owner only; afterwards only the owner\'s website commit changes it', () => {
  const onboard = (owner) => {
    const { root, base } = oldOnBase();
    commit(root, { 'process/config.json': { max_file_bytes: 1000, approvals: { owner } } }, 'onboard');
    return { root, base };
  };
  const big = { ...cfg, max_file_bytes: 1000 };
  const a = onboard('alice');
  assert.deepEqual(recordCheck(a.root, big, { base: a.base, lookup: session, repoOwner: () => 'alice' }).findings, []);
  // Another owner, or GitHub unreadable: refused.
  const b = onboard('mallory');
  assert.deepEqual(recordCheck(b.root, big, { base: b.base, lookup: session, repoOwner: () => 'alice' }).findings.map((x) => [x.check, x.file]), [['approvals', 'process/config.json']]);
  assert.equal(recordCheck(b.root, big, { base: b.base, lookup: session, repoOwner: () => null }).findings.length, 1);
  // Onboarding sets the owner, and nothing else under approvals: the rest still needs the owner.
  const { root: r3, base: b3 } = oldOnBase();
  commit(r3, { 'process/config.json': { max_file_bytes: 1000, approvals: { owner: 'alice', file: 'OTHER.md' } } }, 'onboard');
  assert.equal(recordCheck(r3, big, { base: b3, lookup: session, repoOwner: () => 'alice' }).findings.length, 1);
  // Once the base has the config, changing approvals.owner needs that owner's website commit.
  const base2 = git(['rev-parse', 'HEAD'], { cwd: a.root });
  const change = commit(a.root, { 'process/config.json': { max_file_bytes: 1000, approvals: { owner: 'mallory' } } }, 'a new owner');
  const f = recordCheck(a.root, loadCfg(a.root, base2), { base: base2, lookup: session, repoOwner: () => 'mallory' }).findings;
  assert.deepEqual(f.map((x) => [x.check, x.file]), [['approvals', 'process/config.json']]);
  assert.match(f[0].message, /not alice's own commit/);
  const aliceWeb = (args) => (args[1].endsWith(`/commits/${change}`) ? { ...web(), author: { login: 'alice' } } : session());
  assert.deepEqual(recordCheck(a.root, loadCfg(a.root, base2), { base: base2, lookup: aliceWeb, repoOwner: () => 'mallory' }).findings, []);
});

// Reviews of PR 26.
test('the owner\'s website merge of a pull request sets the block it takes, so carrying it later passes', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const o1 = dated(root, { 'CLAUDE.md': claude('may push') }, 'the owner', '2026-11-01T10:00:00Z');
  git(['checkout', '-q', '-b', 'tranche'], { cwd: root });
  git(['checkout', '-q', '-b', 'patch'], { cwd: root });
  dated(root, { 'CLAUDE.md': claude('may push and release') }, 'proposed words', '2026-11-01T11:00:00Z');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  dated(root, { 't.txt': 't' }, 'tranche work', '2026-11-01T12:00:00Z');
  git(['merge', '-q', '--no-ff', '-m', 'Merge pull request #9 from patch', 'patch'], { cwd: root, env: { ...process.env, GIT_COMMITTER_DATE: '2026-11-01T13:00:00Z' } });
  const ownerMerge = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  const m = dated(root, { 'm.txt': 'm' }, 'main moves', '2026-11-02T10:00:00Z');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '-m', 'bring main in', 'main'], { cwd: root });
  // The push of that later merge to the tranche, judged from the owner's merge on.
  assert.deepEqual(recordCheck(root, cfg, { base: ownerMerge, lookup: webFor(o1, ownerMerge), trusted: T }).findings, []);
});

test('a newer setter that GitHub cannot read is never passed over for an older one', () => {
  const { root, o1, o2, main: m } = closeOfTranche();
  mergeMainWith(root, 'may push');
  const unread = (args) => (args[1].endsWith(`/commits/${o2}`) ? null : webFor(o1)(args));
  const merged = git(['rev-parse', 'HEAD'], { cwd: root });
  const f = recordCheck(root, cfg, { base: m, lookup: unread, trusted: T }).findings;
  // The unread commit is in the range too, and cannot be shown to be the owner's.
  assert.deepEqual(f.map((x) => x.message.slice(0, 17)).sort(), [`commit ${merged.slice(0, 10)}`, `commit ${o2.slice(0, 10)}`].sort());
  assert.match(f.find((x) => x.message.startsWith(`commit ${merged.slice(0, 10)}`)).message, new RegExp(`commit ${o2.slice(0, 10)} could not be read from GitHub, so the newest block neobobkrause set through GitHub's website cannot be told`));
});

test('the owner\'s change on a side branch passes with the merge that brings it up to the tranche', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const o1 = dated(root, { 'CLAUDE.md': claude('may push') }, 'the owner', '2026-11-01T10:00:00Z');
  git(['checkout', '-q', '-b', 'tranche'], { cwd: root });
  git(['checkout', '-q', '-b', 'neobobkrause-patch-1'], { cwd: root });
  const p = dated(root, { 'CLAUDE.md': claude('may push and release') }, 'the owner, "Create a new branch" on the website', '2026-11-02T10:00:00Z');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const t = dated(root, { 't.txt': 't' }, 'the tranche moves', '2026-11-02T11:00:00Z');
  git(['checkout', '-q', 'neobobkrause-patch-1'], { cwd: root });
  git(['merge', '-q', '--no-ff', '-m', 'Update branch', 'tranche'], { cwd: root });
  assert.deepEqual(recordCheck(root, cfg, { base: t, lookup: webFor(o1, p), trusted: T }).findings, []);
});

test('an owner draft older than the newest block on the base is refused, carried by a merge or built on', () => {
  const stale = () => {
    const root = makeRepo({ 'README.md': 'x' });
    const o1 = dated(root, { 'CLAUDE.md': claude('may push') }, 'the owner', '2026-11-01T10:00:00Z');
    git(['checkout', '-q', '-b', 'owner-patch-1'], { cwd: root });
    const draft = dated(root, { 'CLAUDE.md': claude('may force-push') }, 'an owner draft, its pull request closed', '2026-11-01T11:00:00Z');
    git(['checkout', '-q', '-b', 'tranche', 'main'], { cwd: root });
    const o2 = dated(root, { 'CLAUDE.md': claude('may push and release') }, 'the owner, later, on the tranche', '2026-11-02T10:00:00Z');
    return { root, o1, draft, o2 };
  };
  // A job branch that merges the draft in.
  const a = stale();
  git(['checkout', '-q', '-b', 'job/x', 'tranche'], { cwd: a.root });
  dated(a.root, { 'src.txt': 's' }, 'job work', '2026-11-02T11:00:00Z');
  git(['merge', '-q', '--no-ff', '--no-commit', 'owner-patch-1'], { cwd: a.root, allowFail: true });
  write(a.root, { 'CLAUDE.md': claude('may force-push') });
  git(['add', '-A'], { cwd: a.root });
  git(['commit', '-q', '-m', 'take the draft'], { cwd: a.root });
  const fa = recordCheck(a.root, cfg, { base: a.o2, lookup: webFor(a.o1, a.draft, a.o2), trusted: T }).findings;
  assert.ok(fa.length >= 1 && fa.every((x) => x.check === 'approvals'), JSON.stringify(fa));
  assert.ok(fa.some((x) => x.message.includes(`commit ${a.draft.slice(0, 10)} is neobobkrause's website commit, but older than the newest block neobobkrause set on the base (commit ${a.o2.slice(0, 10)}); an older draft is not carried`)), JSON.stringify(fa));
  // A job branch built on the draft (rebased onto it), into the tranche.
  const b = stale();
  git(['checkout', '-q', '-b', 'job/y', 'owner-patch-1'], { cwd: b.root });
  dated(b.root, { 'src.txt': 's' }, 'job work on the draft', '2026-11-02T11:00:00Z');
  const fb = recordCheck(b.root, cfg, { base: b.o2, lookup: webFor(b.o1, b.draft, b.o2), trusted: T }).findings;
  assert.deepEqual(fb.map((x) => x.message.slice(0, 17)), [`commit ${b.draft.slice(0, 10)}`]);
});

// A commit GitHub did not commit (a local commit or merge) is never a website commit, so GitHub
// is not asked about it.
test('the approvals history asks GitHub only about commits GitHub committed', () => {
  const { root, o1, o2, main: m } = closeOfTranche();
  git(['config', 'user.email', 'session@example.com'], { cwd: root });
  for (let i = 0; i < 30; i++) commit(root, { 'CLAUDE.md': claude('may push and release') + `\nnote ${i}\n` }, `local edit ${i}`);
  mergeMainWith(root, null);
  const asked = [];
  const look = (args) => { asked.push(args[1].split('/').pop()); return webFor(o1, o2)(args); };
  assert.deepEqual(recordCheck(root, cfg, { base: m, lookup: look, trusted: T }).findings, []);
  assert.deepEqual([...new Set(asked)].sort(), [o1, o2].sort());
});

test('the owner removing the block counts: putting it back afterwards is refused, in any approvals file', () => {
  const file = 'docs/APPROVALS.md';
  const c2 = { ...cfg, approvals: { ...cfg.approvals, file } };
  const root = makeRepo({ 'README.md': 'x' });
  const o1 = dated(root, { [file]: claude('may push') }, 'the owner sets them', '2026-11-01T10:00:00Z');
  const o2 = dated(root, { [file]: '# none\n' }, 'the owner revokes them', '2026-11-02T10:00:00Z');
  const back = dated(root, { [file]: claude('may push') }, 'a session puts them back', '2026-11-02T11:00:00Z');
  const f = recordCheck(root, c2, { base: o2, lookup: webFor(o1, o2), trusted: ['main'] }).findings;
  assert.deepEqual(f.map((x) => [x.check, x.file]), [['approvals', file]]);
  assert.match(f[0].message, new RegExp(`commit ${back.slice(0, 10)} puts back an older approvals block`));
});

test('a repository an organization owns is judged by the default owner, as before', async () => {
  const { ownerOfRepo } = await import('../lib/record.mjs');
  const root = makeRepo({ 'README.md': 'x' });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const sha = commit(root, { 'CLAUDE.md': claude('may push') }, 'approvals');
  const org = () => ownerOfRepo({ owner: { login: 'acme', type: 'Organization' } });
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: webFor(sha), repoOwner: org }).findings, []);
  // An unreadable answer still refuses, plainly.
  assert.match(recordCheck(root, cfg, { base, lookup: webFor(sha), repoOwner: () => null }).findings[0].message, /could not be read from GitHub/);
});

test('ownerOfRepo: a user\'s login; an organization keeps the default owner; an unreadable answer gives none, with why', async () => {
  const { ownerOfRepo } = await import('../lib/record.mjs');
  assert.deepEqual(ownerOfRepo({ owner: { login: 'alice', type: 'User' } }), { login: 'alice' });
  assert.deepEqual(ownerOfRepo({ owner: { login: 'acme', type: 'Organization' } }), { login: 'neobobkrause', organization: 'acme' });
  assert.equal(ownerOfRepo(null).login, null);
  assert.match(ownerOfRepo(null).why, /could not be read from GitHub/);
});

test('the approvals history is read once per run, however many merges change the block', () => {
  const { root, o1, o2, main: m } = closeOfTranche();
  for (let i = 0; i < 30; i++) {
    git(['checkout', '-q', '-b', `job/j${i}`, 'main'], { cwd: root });
    commit(root, { [`j${i}.txt`]: 'j' }, `job ${i}`);
    git(['checkout', '-q', 'tranche'], { cwd: root });
    git(['merge', '-q', '--no-ff', '-m', `merge job ${i}`, `job/j${i}`], { cwd: root });
  }
  const asked = [];
  const look = (args) => { asked.push(args[1].split('/').pop()); return webFor(o1, o2)(args); };
  assert.deepEqual(recordCheck(root, cfg, { base: m, lookup: look, trusted: T }).findings, []);
  // Each commit is asked about at most once, and the 30 merges that carry the newest block are
  // not asked about at all (reviews of PR 26).
  assert.equal(new Set(asked).size, asked.length);
  assert.ok(asked.length <= 3, `${asked.length} lookups`);
});

// Reviews of PR 26: products check out with filter blob:none; the approvals history reads blob
// ids from the trees and fetches the blobs in one request, with the same result.
test('the approvals history in a partial clone gives the full clone\'s result, fetching blobs once', async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { root, o1, o2, main: m } = closeOfTranche();
  for (let i = 0; i < 20; i++) commit(root, { 'CLAUDE.md': claude('may push and release') + `\nnote ${i}\n` }, `edit ${i}`);
  const merged = mergeMainWith(root, 'may push');
  git(['config', 'uploadpack.allowFilter', 'true'], { cwd: root });
  git(['config', 'uploadpack.allowAnySHA1InWant', 'true'], { cwd: root });
  const dir = mkdtempSync(join(tmpdir(), 'p3-partial-'));
  const pc = join(dir, 'c');
  git(['clone', '-q', '--filter=blob:none', '--no-checkout', `file://${root}`, pc], { cwd: dir });
  git(['fetch', '-q', 'origin', '+refs/heads/*:refs/remotes/origin/*'], { cwd: pc });
  const trace = join(dir, 'trace');
  const want = recordCheck(root, cfg, { base: m, lookup: webFor(o1, o2), trusted: T }).findings.map((x) => x.message);
  process.env.GIT_TRACE2_EVENT = trace;
  let got;
  try { got = recordCheck(pc, cfg, { base: m, head: merged, lookup: webFor(o1, o2), trusted: ['origin/main', 'origin/tranche'] }).findings.map((x) => x.message); } finally { delete process.env.GIT_TRACE2_EVENT; }
  assert.deepEqual(got, want);
  assert.equal(want.length, 1);
  // Each fetch from the promisor ends in one index-pack: a lazy fetch per blob would give about
  // 25 here; the history's bulk fetch and prefetch's for the range give a few.
  const { readFileSync: rf } = await import('node:fs');
  const packs = rf(trace, 'utf8').split('\n').filter((l) => l.includes('"event":"start"') && l.includes('"index-pack"')).length;
  assert.ok(packs <= 4, `${packs} fetches`);
});
