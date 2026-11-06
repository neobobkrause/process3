// BOB's acts first (measured 6 Nov: 8 job PRs sat ready with a red last gate for 2-6 hours unseen,
// copy 569, 570, 493, 549 and 597, printed under idle: around line 288 of about 700 with no act
// named; extraction 432 COMPLETE with its pull request a draft for 20 h). Display only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { commit, entry, makeRepo } from './helpers.mjs';
import { git } from '../lib/util.mjs';
import { actOf, status } from '../lib/status.mjs';

const old = new Date(Date.now() - 4.5 * 36e5).toISOString();
// Jobs on origin, each COMPLETE or WORKING on its branch; their pull requests and gates.
function product(jobs) {
  const root = makeRepo(Object.fromEntries(Object.keys(jobs).map((id) => [`process/ledger/${id}.json`, entry(id, { status: { state: 'OPEN' } })])));
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  for (const [id, j] of Object.entries(jobs)) {
    git(['checkout', '-q', '-b', `job/${id}`, 'origin/tranche'], { cwd: root });
    commit(root, { [`process/ledger/${id}.json`]: entry(id, { status: { state: j.state } }), [`src/${id}/a.js`]: '1' });
    git(['update-ref', `refs/remotes/origin/job/${id}`, 'HEAD'], { cwd: root });
    git(['checkout', '-q', 'main'], { cwd: root });
  }
  const prs = Object.entries(jobs).map(([id, j], i) => ({ number: 560 + i, head: { ref: `job/${id}`, sha: id }, draft: !!j.draft, updated_at: old }));
  const io = { openPRs: () => prs, checkRun: (slug, sha) => (jobs[sha].gate ? { status: 'completed', conclusion: jobs[sha].gate } : null), compare: () => null, prFiles: () => [] };
  return { root, io };
}
function run(p) {
  const env = process.env.GITHUB_REPOSITORY;
  process.env.GITHUB_REPOSITORY = 'o/r';
  try { const out = []; status(p.root, { role: 'bob', log: (m) => out.push(m), io: p.io }); return out; } finally { if (env === undefined) delete process.env.GITHUB_REPOSITORY; else process.env.GITHUB_REPOSITORY = env; }
}
const section = (out) => { const i = out.indexOf('red gates: act now:'); const j = out.findIndex((l, k) => k > i && !l.startsWith('- ')); return i < 0 ? [] : out.slice(i + 1, j < 0 ? undefined : j); };

test('a ready or COMPLETE job PR whose last gate is red is in BOB\'s first section with its restart, not under idle', () => {
  const out = run(product({ 'agent-worker': { state: 'COMPLETE', gate: 'failure' }, plane: { state: 'WORKING', gate: 'failure', draft: false }, quiet: { state: 'WORKING', gate: 'failure', draft: true } }));
  const s = section(out);
  assert.equal(s.length, 2, out.join('\n'));
  assert.match(s[0], /^- agent-worker: COMPLETE; PR #560 ready, last activity 4\.5h ago; gate failure; BOB's act: gate failure: restart it with the finding: node \.process\/tool\/p3\.mjs job start agent-worker --restart "<the gate's finding>"$/);
  assert.match(s[1], /^- plane: WORKING; PR #561 ready.*job start plane --restart/);
  // A WORKING draft's red gate is the job's own work in progress: no act of BOB's.
  assert.doesNotMatch(s.join('\n'), /quiet/);
  assert.doesNotMatch(out.slice(out.indexOf('idle:')).join('\n'), /agent-worker/);
  assert.ok(out.indexOf('red gates: act now:') < out.findIndex((l) => /^(blocked|owed|idle|open):$/.test(l)) || !out.some((l) => /^(blocked|owed|idle|open):$/.test(l)));
});

test('a cancelled last gate names the re-gate as BOB\'s act', () => {
  const s = section(run(product({ ocr: { state: 'COMPLETE', gate: 'cancelled' } })));
  assert.match(s[0], /^- ocr: COMPLETE; PR #560 ready.*; gate cancelled; BOB's act: gate cancelled: re-gate it: re-run its gate run, or give it a new event \(edit the pull request\)$/);
});

test('a COMPLETE job whose pull request is still a draft is an act too (extraction 432)', () => {
  const s = section(run(product({ extraction: { state: 'COMPLETE', draft: true } })));
  assert.match(s[0], /^- extraction: COMPLETE; PR #560 draft.*BOB's act: COMPLETE, its pull request still a draft: restart it so its job complete marks it ready/);
  assert.equal(actOf({ id: 'x', pr: '#1 draft', branch: 'WORKING', ready: false }), null);
});

test('the top lines name the count of acts before any hold or list; none is 0', () => {
  const out = run(product({ a: { state: 'COMPLETE', gate: 'failure' }, b: { state: 'COMPLETE', draft: true }, c: { state: 'COMPLETE', gate: 'success' } }));
  assert.equal(out[0], 'acts now: 2 (a, b): see red gates: act now');
  assert.equal(run(product({ c: { state: 'COMPLETE', gate: 'success' } }))[0], 'acts now: 0');
});
