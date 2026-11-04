// Take-in scope of the record check (copy PR 86, 4 Nov): the earlier work a take-in brings,
// before its start commit, is left out; the start commit and everything after it are judged.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { jobStart } from '../lib/job.mjs';
import { recordCheck, takenIn } from '../lib/record.mjs';
import { DEFAULTS, git } from '../lib/util.mjs';
import { main } from '../p3.mjs';
import { commit, entry, makeRepo, write } from './helpers.mjs';

const H = '## Standing approvals from Bob';
const claude = (words) => `${H}\n\n${words}\n\n## Other\n\nmore\n`;
const cfg = { ...DEFAULTS };
const session = () => ({ committer: { login: 'neobobkrause' }, author: { login: 'neobobkrause' }, commit: { verification: { verified: false } } });
const quiet = () => {};
const sha = (root, rev = 'HEAD') => git(['rev-parse', rev], { cwd: root });

// The tranche holds the process; earlier work on feature/a, made outside it, removed .process
// and changed the approvals, then put both back, so its net change is the module's alone.
function product() {
  const root = makeRepo({ '.process': 'tool\n', 'CLAUDE.md': claude('may push'), 'process/ledger/alpha.json': entry('alpha'), 'req/alpha.md': '# alpha\n' });
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', '-b', 'feature/a'], { cwd: root });
  rmSync(join(root, '.process'));
  commit(root, { 'CLAUDE.md': claude('may force-push') }, 'old repo: no .process, other approvals');
  commit(root, { '.process': 'tool\n', 'CLAUDE.md': claude('may push'), 'src/alpha/x.mjs': 'export const x = 1;\n' }, 'old repo: the work');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'src/beta/b.mjs': 'export const b = 1;\n' }, 'the tranche moves on');
  return root;
}

function takeIn() {
  const root = product();
  const tip = sha(root, 'feature/a');
  jobStart(root, 'alpha', { coordinator: 's', takeIn: 'feature/a', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  return { root, tip, base: sha(root, 'tranche'), start: sha(root) };
}

const check = (root, base) => {
  const t = takenIn(root, { base, id: 'alpha' });
  const r = recordCheck(root, cfg, { base, lookup: session, takenIn: t.tips });
  return { ...r, tips: t.tips, findings: [...r.findings, ...t.findings] };
};

test('a take-in whose earlier history removes .process and changes the approvals passes, its start commit judged', () => {
  const { root, tip, base, start } = takeIn();
  assert.deepEqual(git(['log', '-1', '--format=%P', start], { cwd: root }).split(' '), [tip, base]);
  // Without the take-in scope, the earlier work's commits are found (the copy's 70 findings).
  const all = recordCheck(root, cfg, { base, lookup: session });
  assert.ok(all.findings.some((f) => /removes \.process/.test(f.message)), JSON.stringify(all.findings));
  assert.ok(all.findings.some((f) => f.check === 'approvals'));
  const r = check(root, base);
  assert.deepEqual(r.tips, [tip]);
  assert.deepEqual(r.findings, []);
  assert.equal(r.commits, 1, 'the take-in start commit alone is judged');
});

test('the take-in start commit itself is judged: one that changes the approvals is found', () => {
  const { root, tip, base } = takeIn();
  // The start amended (as a tampered start would be) to change the approvals as well.
  write(root, { 'CLAUDE.md': claude('may merge to main') });
  git(['add', '-A'], { cwd: root });
  git(['commit', '-q', '--amend', '--no-edit'], { cwd: root });
  const r = check(root, base);
  assert.deepEqual(r.tips, [tip]);
  assert.ok(r.findings.some((f) => f.check === 'approvals' && f.message.includes(sha(root).slice(0, 10))), JSON.stringify(r.findings));
});

test('a later commit on the job that changes the approvals is still found', () => {
  const { root, base } = takeIn();
  const c = commit(root, { 'CLAUDE.md': claude('may push and merge to main') }, 'later');
  const r = check(root, base);
  assert.equal(r.commits, 2);
  assert.ok(r.findings.some((f) => f.check === 'approvals' && f.message.includes(c.slice(0, 10))), JSON.stringify(r.findings));
});

test('a commit after the take-in that removes .process is still found', () => {
  const { root, base } = takeIn();
  rmSync(join(root, '.process'));
  const c = commit(root, {}, 'later: remove .process');
  const r = check(root, base);
  assert.ok(r.findings.some((f) => f.check === 'path' && f.message === `commit ${c.slice(0, 10)} removes .process, which the checks stand on`), JSON.stringify(r.findings));
});

test('a job not started by a take-in is unchanged: every commit after the base is judged', () => {
  const root = product();
  const base = sha(root, 'tranche');
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  rmSync(join(root, '.process'));
  commit(root, { 'CLAUDE.md': claude('may force-push') }, 'no .process, other approvals');
  const t = takenIn(root, { base, id: 'alpha' });
  assert.deepEqual(t, { tips: [], findings: [] });
  const before = recordCheck(root, cfg, { base, lookup: session });
  const after = recordCheck(root, cfg, { base, lookup: session, takenIn: t.tips });
  assert.deepEqual(after, before);
  assert.ok(after.findings.some((f) => /removes \.process/.test(f.message)));
  assert.ok(after.findings.some((f) => f.check === 'approvals'));
});

test('a take-in row the job writes after its start cannot hide its own commits', () => {
  const root = product();
  const base = sha(root, 'tranche');
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  const x = commit(root, { 'CLAUDE.md': claude('may force-push') }, 'the change to hide');
  // A forged start row naming x as a take-in tip, its commit's first parent x.
  const file = 'process/metrics/alpha.jsonl';
  const rows = readFileSync(join(root, file), 'utf8');
  write(root, { [file]: rows + JSON.stringify({ event: 'start', module: 'alpha', take_in: { branch: 'x', pr: null, commits: 1, tip: x } }) + '\n' });
  commit(root, {}, 'forged row');
  const r = check(root, base);
  assert.deepEqual(r.tips, []);
  assert.ok(r.findings.some((f) => f.check === 'record' && /take-in tip .* writes under process\/metrics/.test(f.message)), JSON.stringify(r.findings));
  assert.ok(r.findings.some((f) => f.check === 'approvals' && f.message.includes(x.slice(0, 10))));
  // Even with the earlier start row removed, the row's first parent must have added no start.
  write(root, { [file]: JSON.stringify({ event: 'start', module: 'alpha', take_in: { branch: 'x', pr: null, commits: 1, tip: 'f'.repeat(40) } }) + '\n' });
  commit(root, {}, 'a tip that is no commit');
  assert.ok(check(root, base).findings.some((f) => /take-in tip ffffffffff .*no such commit/.test(f.message)));
});

test('record-check on job/<id> leaves out the earlier work a take-in brought', async () => {
  const { root, base } = takeIn();
  const out = join(root, '..', `${root.split('/').pop()}-out.json`);
  const cwd = process.cwd();
  const logged = [];
  const log = console.log;
  console.log = (...a) => logged.push(a.join(' '));
  process.chdir(root);
  try {
    assert.equal(await main(['record-check', '--base', base, '--head', 'HEAD', '--branch', 'job/alpha', '--out', out]), 0);
    assert.equal(await main(['record-check', '--base', base, '--head', 'HEAD', '--branch', 'job/beta', '--out', out]), 1, 'another job\'s branch reads only its own rows');
  } finally { process.chdir(cwd); console.log = log; }
  assert.ok(logged.some((l) => /checked 1 commit\(s\) after .*leaving out the earlier work taken in at/.test(l)), logged.join('\n'));
});

// Review 1 of PR 86: the merge tool merges a job with its history, so the tranche's own checks
// (on each push, and its pull request into main) meet the earlier work again.
function merged() {
  const t = takeIn();
  const { root } = t;
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '-m', 'Merge PR: job/alpha into tranche', 'job/alpha'], { cwd: root });
  return { ...t, main: sha(root, 'main') };
}

test('on the tranche, against main, the earlier work a merged take-in brought is still left out', async () => {
  const { root, tip, main: base } = merged();
  const t = takenIn(root, { base });
  assert.deepEqual(t, { tips: [tip], findings: [] });
  assert.deepEqual(recordCheck(root, cfg, { base, lookup: session, takenIn: t.tips }).findings, []);
  assert.ok(recordCheck(root, cfg, { base, lookup: session }).findings.length, 'without it, the earlier work is found');
  const out = join(root, '..', `${root.split('/').pop()}-tr.json`);
  const cwd = process.cwd();
  const log = console.log;
  console.log = () => {};
  process.chdir(root);
  try { assert.equal(await main(['record-check', '--base', base, '--head', 'HEAD', '--branch', 'tranche', '--out', out]), 0); } finally { process.chdir(cwd); console.log = log; }
});

test('on the tranche, a take-in tip whose history holds another job\'s work not yet on main leaves nothing out', () => {
  const root = product();
  // beta, a job merged into the tranche, then taken in with alpha's earlier work on top.
  write(root, { 'process/ledger/beta.json': entry('beta') });
  commit(root, {}, 'beta entry');
  jobStart(root, 'beta', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/beta'], { cwd: root });
  const hide = commit(root, { 'CLAUDE.md': claude('may force-push to main') }, 'beta changes the approvals');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '-m', 'beta into tranche', 'job/beta'], { cwd: root });
  git(['checkout', '-q', 'feature/a'], { cwd: root });
  git(['merge', '-q', '--no-ff', '-m', 'old work merges the tranche', 'tranche'], { cwd: root });
  commit(root, { 'src/alpha/y.mjs': 'export const y = 1;\n' }, 'more work');
  const tip = sha(root);
  git(['checkout', '-q', 'tranche'], { cwd: root });
  jobStart(root, 'alpha', { coordinator: 's', takeIn: 'feature/a', push: false, log: quiet });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '-m', 'alpha into tranche', 'job/alpha'], { cwd: root });
  const base = sha(root, 'main');
  const t = takenIn(root, { base });
  assert.deepEqual(t.tips, []);
  assert.ok(t.findings.some((f) => f.message.includes(tip.slice(0, 10)) && /writes under process\/metrics/.test(f.message)), JSON.stringify(t.findings));
  assert.ok(recordCheck(root, cfg, { base, lookup: session, takenIn: t.tips }).findings.some((f) => f.check === 'approvals' && f.message.includes(hide.slice(0, 10))));
});

// Copy, 4 Nov (bundler attempt 5, registers): a later attempt's range carries attempt 1's take-in
// row, its take-in commit far under the base. In the session's shallow clone the base's history is
// cut above that commit, so the tip read as new and its adder as missing from the range. A row the
// base already holds was judged where it landed; it leaves nothing out and gives no finding.
function attempt2({ deep = 12 } = {}) {
  const t = merged();
  const { root } = t;
  // The tranche moves on well past the take-in; the next attempt starts job/alpha on it again
  // (as bundler's attempt 5 did) and works.
  for (let i = 0; i < deep; i++) commit(root, { [`src/beta/n${i}.mjs`]: `export const n = ${i};\n` }, `tranche ${i}`);
  const base = sha(root, 'tranche');
  git(['checkout', '-q', '-B', 'job/alpha', 'tranche'], { cwd: root });
  commit(root, { 'process/metrics/alpha.jsonl': readFileSync(join(root, 'process/metrics/alpha.jsonl'), 'utf8') + JSON.stringify({ event: 'start', module: 'alpha', attempt: 2 }) + '\n' }, 'job start alpha (attempt 2)');
  commit(root, { 'src/alpha/z.mjs': 'export const z = 2;\n' }, 'attempt 2');
  return { ...t, base };
}

// A clone cut a few commits under the head, as shallowBase leaves one: the range is whole, the
// base's own history is not, and the take-in tip is here through another fetch.
function shallow(src, branch, tip, depth = 4) {
  const clone = join(mkdtempSync(join(tmpdir(), 'p3-shallow-')), 'c');
  git(['init', '-q', clone], { cwd: src });
  git(['config', 'uploadpack.allowAnySHA1InWant', 'true'], { cwd: src });
  git(['remote', 'add', 'origin', `file://${src}`], { cwd: clone });
  git(['fetch', '-q', `--depth=${depth}`, 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { cwd: clone });
  git(['update-ref', 'HEAD', `refs/remotes/origin/${branch}`], { cwd: clone });
  if (tip) git(['fetch', '-q', '--depth=1', 'origin', tip], { cwd: clone });
  return clone;
}

test('an attempt-2 range carrying attempt 1\'s take-in row passes, in a full clone and a shallow one', () => {
  const { root, tip, base } = attempt2();
  assert.deepEqual(check(root, base).findings, []);
  const clone = shallow(root, 'job/alpha', tip);
  assert.ok(git(['rev-list', '--count', tip, `^${base}`], { cwd: clone }) !== '0', 'the cut base does not hold the tip here');
  const r = check(clone, base);
  assert.deepEqual(r.findings, [], JSON.stringify(r.findings));
  assert.deepEqual(r.tips, []);
  assert.equal(r.commits, 2, 'the attempt\'s start and work are judged');
  // Its tip missing from the clone altogether is no finding either: the row was judged on the base.
  assert.deepEqual(check(shallow(root, 'job/alpha', null), base).findings, []);
});

test('a later commit of an attempt-2 range is still judged in a shallow clone', () => {
  const { root, tip, base } = attempt2();
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  const c = commit(root, { 'CLAUDE.md': claude('may force-push') }, 'attempt 2 changes the approvals');
  const r = check(shallow(root, 'job/alpha', tip), base);
  assert.ok(r.findings.some((f) => f.check === 'approvals' && f.message.includes(c.slice(0, 10))), JSON.stringify(r.findings));
});

test('a tranche merge bringing another job\'s take-in row gives no finding on that job, whatever rows it reads', () => {
  const { root, tip, base: tr } = attempt2();
  git(['checkout', '-q', 'tranche'], { cwd: root });
  write(root, { 'process/ledger/beta.json': entry('beta') });
  commit(root, {}, 'beta entry');
  jobStart(root, 'beta', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/beta'], { cwd: root });
  commit(root, { 'src/beta/w.mjs': 'export const w = 1;\n' }, 'beta works');
  const base = git(['merge-base', 'job/beta', 'tranche'], { cwd: root });
  assert.notEqual(base, tr);
  for (const at of [root, shallow(root, 'job/beta', tip)]) {
    for (const id of ['beta', undefined]) {
      const t = takenIn(at, { base, id });
      assert.deepEqual(t, { tips: [], findings: [] }, `${id}: ${JSON.stringify(t)}`);
      assert.deepEqual(recordCheck(at, cfg, { base, lookup: session, takenIn: t.tips }).findings, []);
    }
  }
});

test('a row the base holds cannot hide commits the range brings: a side branch merged later is judged', () => {
  const root = product();
  // A side branch, made before the base, that changes the approvals; the base holds a forged row
  // naming its tip, with no take-in behind it.
  git(['checkout', '-q', '-b', 'side', 'tranche'], { cwd: root });
  const x = commit(root, { 'CLAUDE.md': claude('may force-push') }, 'side changes the approvals');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  write(root, { 'process/ledger/alpha.json': entry('alpha') });
  jobStart(root, 'alpha', { coordinator: 's', push: false, log: quiet });
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  const file = 'process/metrics/alpha.jsonl';
  write(root, { [file]: readFileSync(join(root, file), 'utf8') + JSON.stringify({ event: 'start', module: 'alpha', take_in: { branch: 'side', pr: null, commits: 1, tip: x } }) + '\n' });
  commit(root, {}, 'forged row');
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['merge', '-q', '--no-ff', '-m', 'alpha into tranche', 'job/alpha'], { cwd: root });
  const base = sha(root, 'tranche');
  git(['checkout', '-q', 'job/alpha'], { cwd: root });
  git(['merge', '-q', '--no-ff', '-m', 'Bring job/alpha up to tranche', 'tranche'], { cwd: root });
  // The range merges the side branch, with the tranche as its first parent.
  git(['merge', '-q', '--no-ff', '-m', 'merge side', 'side'], { cwd: root });
  for (const at of [root, shallow(root, 'job/alpha', null, 6)]) {
    const r = check(at, base);
    assert.deepEqual(r.tips, []);
    assert.ok(r.findings.some((f) => f.check === 'record' && f.message.includes(x.slice(0, 10)) && /no commit in the range has it as its first parent/.test(f.message)), JSON.stringify(r.findings));
    assert.ok(r.findings.some((f) => f.check === 'approvals' && f.message.includes(x.slice(0, 10))), JSON.stringify(r.findings));
  }
});
