// The review-trigger day-1 study on the copy (4 Nov 19:35 to 5 Nov 19:00; 80 job merges, 7 triggered):
// (1) a security trigger fired on a one-line comment (PR 364); (2) every merge row read review_usd
// "unmeasured"; (3) PR 364's head moved after its review and it sat 13.5 h with nothing said;
// (4) PR 173's row, prepared under an older pin, carried no triggers key.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOT, GATE, RECEIPT, block } from '../lib/github.mjs';
import { merge, reviewCostOf } from '../lib/merge.mjs';
import { jsCode, reviewTriggers, triggerSummary } from '../lib/triggers.mjs';
import { carriedNote, sameChange } from '../lib/train.mjs';
import { stuckLine, trainStuck } from '../lib/stuck.mjs';
import { idleCapacity, markInTrain } from '../lib/sweep.mjs';
import { readySelection } from '../lib/ready.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, honestBranch, makeRepo } from './helpers.mjs';

const quiet = () => {};
const SIGNIN = [
  '// Sign-in for the agent worker.',
  'export function signIn(user) {',
  '  /* the session is short-lived */',
  '  const ttl = 3600; // seconds',
  '  return { user, ttl };',
  '}',
  '',
].join('\n');
const CFG = { review_triggers: { security_paths: ['agent-worker/src/**', 'src/alpha/acts.mjs', 'src/alpha/rules.txt'] } };
const START = '2026-11-05T08:00:00Z';

// A product whose tranche holds module alpha and a security file; the job branch changes them as
// `job` says. rows: the job's metrics rows at its head (a start and a complete by default).
function setup(job, { rows = null } = {}) {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('alpha', { paths: ['src/alpha/', 'agent-worker/src/'] }),
    'process/config.json': CFG,
    'src/alpha/a.mjs': 'export const f = () => 45;\n',
    'src/alpha/acts.mjs': 'export const ACTS = ["a", "b"];\n',
    'src/alpha/rules.txt': 'allow a\n# allow b\n',
    'agent-worker/src/signin.mjs': SIGNIN,
    'test/alpha/a.test.mjs': "test('a', () => { assert.equal(f(), 45); });\n",
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  job(root);
  const r = rows || [{ row: 'attempt', event: 'start', attempt: 1, at: START }, { row: 'attempt', event: 'complete', attempt: 1, at: new Date().toISOString() }];
  const head = commit(root, { 'process/metrics/alpha.jsonl': r.map((x) => JSON.stringify(x)).join('\n') + '\n' });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'other.txt': 'tranche moved on' });
  git(['push', '-q', 'origin', 'tranche', 'job/alpha', 'main'], { cwd: root });
  git(['checkout', '-q', 'main'], { cwd: root });
  return { root, head };
}
function io(head) {
  return {
    getPR: () => ({ state: 'open', draft: false, user: { login: 'civicsmith' }, base: { ref: 'tranche' }, head: { ref: 'job/alpha', sha: head } }),
    comments: () => [
      { id: 1, body: block(RECEIPT, { module: 'alpha', attempt: 1, sha: head }), user: { login: 'civicsmith' } },
      { id: 2, body: block(GATE, { runs: [{ sha: head, ok: true, receipt: 'agrees', receipt_attempt: 1, run_id: 11 }] }), user: { login: BOT } },
    ],
    checkRun: () => ({ status: 'completed', conclusion: 'success', html_url: 'run' }),
    verify: (slug, r) => r.run_id === 11,
    ...honestBranch([5, 6, 7, 173, 364]),
    mergePR: () => ({ merged: true, sha: 'm'.repeat(40) }),
  };
}
const originRows = (root) => {
  const tip = git(['ls-remote', 'origin', 'refs/heads/job/alpha'], { cwd: root }).split('\t')[0];
  return git(['show', `${tip}:process/metrics/alpha.jsonl`], { cwd: root }).split('\n').filter(Boolean).map((l) => JSON.parse(l));
};
const trig = (root) => reviewTriggers(root, { base: 'origin/tranche', head: 'origin/job/alpha', entry: entry('alpha'), cfg: CFG });
const reviewed = { reviewed: 'fresh reviewer: no findings', rounds: 1, reviewMinutes: '9', findings: '0', actedOn: '0' };

test('(1) a security file changed only in comments or whitespace does not fire (copy PR 364); a hunk with code in it still fires', () => {
  // PR 364: one line comment changed.
  const one = setup((r) => commit(r, { 'agent-worker/src/signin.mjs': SIGNIN.replace('// seconds', '// seconds, one hour') }));
  const t1 = trig(one.root);
  assert.deepEqual([t1.fired, t1.security, t1.comments_only], [[], [], ['agent-worker/src/signin.mjs']]);
  // Block comments, a new comment line, re-indenting and blank lines: still no code.
  const block_ = setup((r) => commit(r, { 'agent-worker/src/signin.mjs': SIGNIN.replace('/* the session is short-lived */', '/*\n   * the session is short-lived:\n   * one hour\n   */').replace('  return', '\n    // why: the cap\n      return') }));
  assert.deepEqual(trig(block_.root).fired, []);
  // A hunk that mixes a comment and code fires, and carries its hunk to the review brief.
  const mixed = setup((r) => commit(r, { 'agent-worker/src/signin.mjs': SIGNIN.replace('  const ttl = 3600; // seconds', '  const ttl = 36000; // seconds, ten hours') }));
  const t2 = trig(mixed.root);
  assert.deepEqual([t2.fired, t2.security, t2.comments_only], [['security'], ['agent-worker/src/signin.mjs'], undefined]);
  assert.match(t2.hunks, /^\+  const ttl = 36000; \/\/ seconds, ten hours$/m);
  // Code commented out is a code change; a string that looks like a comment is code.
  const out = setup((r) => commit(r, { 'agent-worker/src/signin.mjs': SIGNIN.replace('  const ttl = 3600;', '  // const ttl = 3600;\n  const ttl = 1;') }));
  assert.deepEqual(trig(out.root).fired, ['security']);
  const str = setup((r) => commit(r, { 'src/alpha/acts.mjs': 'export const ACTS = ["a", "b", "// c"];\n' }));
  assert.deepEqual(trig(str.root).fired, ['security']);
  // Joining two lines is a code change in JS (automatic semicolons).
  const join_ = setup((r) => commit(r, { 'agent-worker/src/signin.mjs': SIGNIN.replace('  return { user, ttl };', '  return {\n user, ttl };') }));
  assert.deepEqual(trig(join_.root).fired, ['security']);
  // Another language is not read: a '#' line in a text file fires as before.
  const txt = setup((r) => commit(r, { 'src/alpha/rules.txt': 'allow a\n# allow b, never\n' }));
  assert.deepEqual(trig(txt.root).fired, ['security']);
  // Mixed files: the comment-only one is left out, the other fires alone.
  const both = setup((r) => commit(r, { 'agent-worker/src/signin.mjs': SIGNIN.replace('// seconds', '// s'), 'src/alpha/acts.mjs': 'export const ACTS = ["a"];\n' }));
  const t3 = trig(both.root);
  assert.deepEqual([t3.fired, t3.security, t3.comments_only], [['security'], ['src/alpha/acts.mjs'], ['agent-worker/src/signin.mjs']]);
  assert.doesNotMatch(t3.hunks, /signin/);
  // And merge takes --no-review for the comment-only change.
  assert.equal(merge(one.root, 364, { slug: 'o/r', io: io(one.head), noReview: 'a comment', log: quiet }).merged, true);
  assert.deepEqual(originRows(one.root).filter((r) => r.row === 'merge')[0].triggers, []);
});

test('(1) the comment stripper: strings, templates and regular expressions kept; anything it cannot read safely is null (fires)', () => {
  assert.equal(jsCode('a(); // x\nb();'), 'a();\nb();');
  assert.equal(jsCode('a();\n/* x\n y */b();'), 'a();\nb();');
  assert.equal(jsCode('f(1, /* inline */ 2)'), 'f(1, 2)');
  assert.equal(jsCode('x = "//no"; y = \'/*no*/\''), 'x = "//no"; y = \'/*no*/\'');
  assert.equal(jsCode('x = `a ${ {b: 1}.b } // kept`; // gone'), 'x = `a ${ {b: 1}.b } // kept`;');
  assert.equal(jsCode('x = `${`in${1}`}`; // q'), 'x = `${`in${1}`}`;');
  assert.equal(jsCode('x = /\\/\\*/.test(s);'), 'x = /\\/\\*/.test(s);', 'no comment opener: kept as is');
  assert.equal(jsCode('x = a / b; // c'), null, 'a comment after a bare slash could be inside a regular expression');
  assert.equal(jsCode('x = /a\\/\\//; y = 1;'), null);
  assert.equal(jsCode('s = "unclosed'), null);
  assert.equal(jsCode('/* unclosed'), null);
  assert.equal(jsCode('x = `open'), null);
});

test('(2) the review cost is read onto the merge row from the --role review rows since the attempt started, a named session, or the session record', () => {
  const s = setup((r) => commit(r, { 'src/alpha/acts.mjs': 'export const ACTS = ["a"];\n' }));
  mkdirSync(join(s.root, 'process/metrics'), { recursive: true });
  const bob = (rows) => writeFileSync(join(s.root, 'process/metrics/alpha.bob.jsonl'), rows.map((x) => JSON.stringify({ row: 'attempt', event: 'measured', module: 'alpha', ...x })).join('\n') + '\n');
  // An earlier attempt's review, a job row and a BOB row are not this review's.
  bob([
    { at: '2026-11-04T08:00:00Z', role: 'review', session: 'session_old', cost_usd: 9 },
    { at: '2026-11-05T09:00:00Z', role: 'review', session: 'session_r1', cost_usd: 0.61 },
    { at: '2026-11-05T09:30:00Z', role: 'review', session: 'session_r2', cost_usd: 0.23 },
    { at: '2026-11-05T09:40:00Z', role: 'bob', session: 'session_bob', cost_usd: 5 },
    { at: '2026-11-05T09:45:00Z', role: 'review', session: 'session_r3', cost_usd: 'unmeasured' },
  ]);
  const cfg = { tranche: 'tranche' };
  assert.deepEqual(reviewCostOf(s.root, cfg, 'alpha', { since: START }), { usd: 0.84, from: '2 --role review rows (session_r1, session_r2)' });
  assert.deepEqual(reviewCostOf(s.root, cfg, 'alpha', { sessions: 'cse_r2' }), { usd: 0.23, from: '1 --role review row (session_r2)' });
  assert.equal(reviewCostOf(s.root, cfg, 'alpha', { sessions: ['session_none'] }).usd, 'unmeasured');
  assert.match(reviewCostOf(s.root, cfg, 'alpha', {}).why, /attempt's start was not read and no --review-session/);
  const rec = join(mkdtempSync(join(tmpdir(), 'p3-rec-')), 'r.json');
  writeFileSync(rec, JSON.stringify({ id: 'session_r9', external_metadata: { usage: { cost_usd: 1.25 } } }));
  assert.deepEqual(reviewCostOf(s.root, cfg, 'alpha', { record: rec }), { usd: 1.25, from: 'review session record session_r9' });
  assert.throws(() => reviewCostOf(s.root, cfg, 'alpha', { record: rec, sessions: 'session_x' }), /no session session_x in it/);
  // End to end: merge --reviewed with no --review-cost-usd records 0.84 and where it came from.
  const out = [];
  assert.equal(merge(s.root, 5, { slug: 'o/r', io: io(s.head), ...reviewed, log: (l) => out.push(l) }).merged, true);
  const row = originRows(s.root).find((r) => r.row === 'merge');
  assert.deepEqual([row.triggers, row.review_usd, row.review_usd_from], [['security'], 0.84, '2 --role review rows (session_r1, session_r2)']);
  assert.ok(out.some((l) => l === 'review cost: 0.84 USD, from 2 --role review rows (session_r1, session_r2)'), out.join('\n'));
  // An explicit --review-cost-usd stands; none to be read leaves it unmeasured, with why on the row.
  const u = setup((r) => commit(r, { 'src/alpha/acts.mjs': 'export const ACTS = ["a"];\n' }));
  merge(u.root, 6, { slug: 'o/r', io: io(u.head), ...reviewed, log: quiet });
  const ur = originRows(u.root).find((r) => r.row === 'merge');
  assert.equal(ur.review_usd, 'unmeasured');
  assert.match(ur.review_usd_why, /no `metrics add alpha --role review` row priced since the attempt started \(2026-11-05T08:00:00Z\)/);
  assert.throws(() => merge(u.root, 6, { slug: 'o/r', io: io(u.head), noReview: 'x', reviewSession: 'session_r1', log: quiet }), /drop --review-session/);
});

test('(3) a review carries to a moved head when the job\'s change is the same; otherwise the reason is kept', () => {
  const s = setup((r) => commit(r, { 'agent-worker/src/signin.mjs': SIGNIN.replace('3600', '1800') }));
  const cfg = { tranche: 'tranche', records: ['process/'] };
  const reviewedAt = s.head;
  // The tranche moved; the job brought it in and wrote a row: the same change.
  git(['checkout', '-q', 'job/alpha'], { cwd: s.root });
  git(['merge', '-q', '--no-edit', 'tranche'], { cwd: s.root });
  const synced = commit(s.root, { 'process/metrics/alpha.jsonl': '{"row":"attempt","event":"complete","attempt":1}\n' });
  // A further code change: another change.
  const fixed = commit(s.root, { 'agent-worker/src/signin.mjs': SIGNIN.replace('3600', '900') });
  git(['checkout', '-q', 'main'], { cwd: s.root });
  git(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche'], { cwd: s.root });
  assert.deepEqual(sameChange(s.root, cfg, reviewedAt, synced), { same: true });
  assert.deepEqual(sameChange(s.root, cfg, reviewedAt, fixed), { same: false, why: 'the job\'s change itself differs' });
  assert.equal(sameChange(s.root, cfg, reviewedAt, 'f'.repeat(40)).unread, true);
  const bob = 'session_bob';
  const notes = [{ row: 'note', at: '2026-11-05T05:00:00Z', by: bob, pr: 364, sha: reviewedAt, reviewed: 'fresh reviewer: 1 fix', rounds: 2, review_minutes: 20, findings: 1, findings_acted: 1 }];
  const c = carriedNote(s.root, cfg, notes, 364, synced, bob);
  assert.deepEqual([c.review.carried_from, c.review.reviewed], [reviewedAt, 'fresh reviewer: 1 fix']);
  const m = carriedNote(s.root, cfg, notes, 364, fixed, bob);
  assert.deepEqual([m.review, m.moved], [null, { from: reviewedAt, why: 'the job\'s change itself differs' }]);
  // Only BOB's --reviewed notes carry: another session's, or a --no-review note, does not.
  assert.equal(carriedNote(s.root, cfg, notes.map((x) => ({ ...x, by: 'session_x' })), 364, synced, bob).review, null);
  assert.equal(carriedNote(s.root, cfg, notes.map((x) => ({ ...x, reviewed: null, no_review: 'x' })), 364, synced, bob).review, null);
  // The note for the head itself wins.
  const own = [...notes, { row: 'note', at: '2026-11-05T06:00:00Z', by: bob, pr: 364, sha: synced, reviewed: 'second review' }];
  assert.equal(carriedNote(s.root, cfg, own, 364, synced, bob).review.reviewed, 'second review');
});

test('(3) a head refused in the train and not reviewed since is stuck: status\'s line, the idle alarm\'s reason and the sweep\'s owed act name it', () => {
  const t = Date.parse('2026-11-05T19:00:00Z');
  const rows = [
    { at: '2026-11-05T05:20:00Z', row: 'merge', pr: 364, head: 'd3af394aaaa', result: 'refused', why: 'pull request 364 fires the review trigger security (security paths changed: agent-worker/src/signin.mjs): --no-review is refused' },
    { at: '2026-11-05T05:00:00Z', row: 'merge', pr: 365, head: 'old', result: 'refused', why: 'conflicts with tranche' },
    { at: '2026-11-05T06:00:00Z', row: 'merge', pr: 366, head: 'h366', result: 'refused', why: 'pull request 366 fires the review trigger test' },
  ];
  const notes = [
    { row: 'note', at: '2026-11-05T05:00:00Z', by: 'session_bob', pr: 364, sha: '7cac421bbbb', reviewed: 'r' },
    { row: 'note', at: '2026-11-05T07:00:00Z', by: 'session_bob', pr: 366, sha: 'h366', reviewed: 'r' },
  ];
  const prs = [364, 365, 366].map((n) => ({ number: n, head: { sha: n === 364 ? 'd3af394aaaa' : n === 365 ? 'new' : 'h366' } }));
  const stuck = trainStuck(rows, notes, prs, 'session_bob', t);
  assert.deepEqual([...stuck.keys()], [364], '365 moved since its refusal; 366 was reviewed since');
  assert.deepEqual(stuck.get(364), { pr: 364, head: 'd3af394aaaa', since: '2026-11-05T05:20:00Z', hours: 13.7, why: rows[0].why, reviewed_at: '7cac421bbbb' });
  const line = stuckLine(stuck.get(364), 'agent-worker');
  assert.match(line, /^STUCK in the train: PR 364 \(job agent-worker\) since 2026-11-05T05:20:00Z \(13\.7h\): pull request 364 fires the review trigger security .*; BOB's review is of 7cac421bbb, not this head .*; review the head d3af394aaa \(p3 review brief 364\), then p3 merge train note 364 --reviewed \.\.\.$/);
  // The idle alarm names it with its reason, apart from the train that moves.
  const next = [
    { file: 'r/a.md', count: 1, module: 'agent-worker', entry_state: 'COMPLETE', attempt_open: true },
    { file: 'r/c.md', count: 1, module: 'c', entry_state: 'COMPLETE', attempt_open: true },
  ];
  const gh = { slug: 'o/r', openPRs: () => [{ number: 364, draft: false, head: { ref: 'job/agent-worker', sha: 'd3af394aaaa' }, base: { ref: 'tranche' } }, { number: 9, draft: false, head: { ref: 'job/c', sha: 'c1' }, base: { ref: 'tranche' } }], checkRun: () => ({ conclusion: 'success', status: 'completed' }), stuck: () => stuck };
  assert.equal(markInTrain(null, { tranche: 'tranche' }, next, [{ id: 'agent-worker' }, { id: 'c' }], { io: gh }), 2);
  assert.equal(next[0].train_stuck, line.replace('(13.7h)', `(${stuck.get(364).hours}h)`));
  assert.deepEqual(readySelection(next, {}).skip.map((x) => [x.id, !!x.stuck]), [['agent-worker', true], ['c', false]]);
  const ic = idleCapacity({ live: 2, cap: 10, holds: [], work: next, layers: new Map(), freed: t - 60 * 6e4, t });
  assert.ok(ic.reasons.includes(next[0].train_stuck), ic.reasons.join('\n'));
  assert.ok(ic.reasons.includes('in the train, not startable: c PR 9'));
  assert.deepEqual(ic.in_train, [{ id: 'agent-worker', pr: 364, stuck: true }, { id: 'c', pr: 9 }]);
});

test('(4) a merge row prepared under an older pin, with no triggers, gets them judged at the land and recorded beside it; the report reads them', () => {
  const old = { row: 'merge', pr: 173, reviewed: true, review: 'r', review_rounds: 1, at: new Date().toISOString() };
  const base = [{ row: 'attempt', event: 'start', attempt: 1, at: START }, { row: 'attempt', event: 'complete', attempt: 1, at: new Date().toISOString() }];
  const s = setup((r) => commit(r, { 'src/alpha/acts.mjs': 'export const ACTS = ["a"];\n' }), { rows: [...base, old] });
  const out = [];
  assert.equal(merge(s.root, 173, { slug: 'o/r', io: io(s.head), ...reviewed, reviewCostUsd: '0.5', log: (l) => out.push(l) }).merged, true);
  const rows = originRows(s.root);
  assert.equal(rows.filter((r) => r.row === 'merge').length, 1, 'still one merge row');
  const t = rows.find((r) => r.row === 'triggers');
  assert.deepEqual([t.pr, t.triggers], [173, ['security']]);
  assert.match(t.why, /prepared under an older pin \(tool unknown\) that recorded no triggers; judged at the land/);
  assert.ok(out.some((l) => /PR 173's merge row recorded no triggers \(prepared under an older pin\): \["security"\] judged at the land/.test(l)), out.join('\n'));
  assert.match(triggerSummary(rows.filter((r) => r.row === 'merge'), rows).line, /^review triggers: 1 job PRs merged; triggered 1 of 1 \(100%\): security 1/);
  // A row prepared with the triggers the land judges writes nothing more; one with others is corrected.
  const same = setup((r) => commit(r, { 'src/alpha/acts.mjs': 'export const ACTS = ["a"];\n' }), { rows: [...base, { ...old, triggers: ['security'] }] });
  merge(same.root, 173, { slug: 'o/r', io: io(same.head), ...reviewed, log: quiet });
  assert.equal(originRows(same.root).filter((r) => r.row === 'triggers').length, 0);
  const differ = setup((r) => commit(r, { 'src/alpha/acts.mjs': 'export const ACTS = ["a"];\n' }), { rows: [...base, { ...old, triggers: [], tool: 'abc' }] });
  merge(differ.root, 173, { slug: 'o/r', io: io(differ.head), ...reviewed, log: quiet });
  assert.match(originRows(differ.root).find((r) => r.row === 'triggers').why, /recorded none when prepared \(tool abc\); judged again at the land/);
  // A fresh merge row names the tool that wrote it.
  const fresh = setup((r) => commit(r, { 'src/alpha/a.mjs': 'export const f = () => 46;\n' }));
  merge(fresh.root, 7, { slug: 'o/r', io: io(fresh.head), noReview: 'a constant', log: quiet });
  assert.match(originRows(fresh.root).find((r) => r.row === 'merge').tool, /^[0-9a-f]{40}$|^unknown$/);
});
