// Take-in scope of the record check (copy PR 86, 4 Nov): the earlier work a take-in brings,
// before its start commit, is left out; the start commit and everything after it are judged.
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
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
  assert.ok(r.findings.some((f) => f.check === 'record' && /take-in tip .* writes process\/metrics\/alpha\.jsonl/.test(f.message)), JSON.stringify(r.findings));
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
    assert.equal(await main(['record-check', '--base', base, '--head', 'HEAD', '--branch', 'feature/other', '--out', out]), 1, 'only the job\'s own branch reads its start row');
  } finally { process.chdir(cwd); console.log = log; }
  assert.ok(logged.some((l) => /checked 1 commit\(s\) after .*leaving out the earlier work taken in at/.test(l)), logged.join('\n'));
});
