// AUD-1 (JOB-12), AUD-2 (JOB-7, SES-12): the reviewed revert exemption, and every red run
// counted toward the false-done rate. Fast: no suite runs here.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOT, GATE, REVERT_EXEMPT, block, parseBlock } from '../lib/github.mjs';
import { EXEMPT_MARK, revertExempt } from '../lib/job.mjs';
import { flowFigures, refuted, refutes, report } from '../lib/metrics.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const quiet = () => {};

test('a red suite or revert check refutes its COMPLETE claim (SES-12)', () => {
  assert.equal(refutes({ attempt: 1, suite: 'fail' }, 1), true);
  assert.equal(refutes({ attempt: 1, suite: 'pass', revert: 'fail' }, 1), true);
  assert.equal(refutes({ attempt: 1, suite: 'pass', revert: 'pass' }, 1), false);
  assert.equal(refutes({ attempt: 2, suite: 'fail' }, 1), false, 'another attempt\'s run');
  // A revert failure a reviewer then exempted on the same attempt refutes nothing; a red suite still does.
  const fail = (sha) => ({ sha, attempt: 1, suite: 'pass', revert: 'fail' });
  const exempt = (sha, reviewed = sha) => ({ sha, attempt: 1, suite: 'pass', revert: 'exempt', revert_exempt: { sha: reviewed } });
  assert.equal(refuted([fail('c1'), exempt('c1')], 1), false);
  // Only an exemption after it, of the same commit: not one before it, nor of later code.
  assert.equal(refuted([exempt('c1'), fail('c1')], 1), true);
  assert.equal(refuted([fail('c1'), exempt('c2')], 1), true);
  assert.equal(refuted([{ attempt: 1, suite: 'fail', revert: 'skipped' }, exempt('c1')], 1), true);
  assert.equal(refuted([{ attempt: 1, suite: 'pass', revert: 'fail' }], 1), true);
  const at = (h) => new Date(Date.parse('2026-11-06T00:00:00Z') + h * 36e5).toISOString();
  const rows = [{ row: 'attempt', event: 'complete', attempt: 1, pr: 2, at: at(1) }, { row: 'attempt', event: 'complete', attempt: 1, pr: 3, at: at(2) }];
  const gates = (pr) => (pr === 2 ? [{ attempt: 1, suite: 'fail', revert: 'pass' }] : [{ attempt: 1, suite: 'pass' }]);
  assert.equal(flowFigures({ rows, gates, from: at(0), to: at(3) }).false_done_share, 0.5);
  // report's false_done_rate reads the same rule.
  const root = makeRepo({ 'process/metrics/alpha.jsonl': rows.map((r) => JSON.stringify(r)).join('\n') + '\n' });
  const r = report(root, 'o/r', 'HEAD', { read: { comments: (s, n) => [{ id: 1, body: block(GATE, { runs: gates(n) }), user: { login: BOT } }], getPR: () => null } });
  assert.deepEqual([r.complete_claims, r.refuted, r.false_done_rate], [2, 1, 0.5]);
});

function jobRepo() {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), 'src/alpha/index.mjs': 'export const x = 1;\n' });
  git(['checkout', '-q', '-b', 'job/alpha'], { cwd: root });
  const head = commit(root, { 'process/metrics/alpha.jsonl': '{"row":"attempt","event":"complete","attempt":1,"session":"session_job"}\n' });
  const state = { comments: [], edits: [] };
  const io = {
    slug: 'o/r',
    getPR: () => ({ number: 5, state: 'open', body: 'START', head: { ref: 'job/alpha', sha: head } }),
    addComment: (s, n, body) => { state.comments.push(body); return { id: 77, html_url: 'https://x/77' }; },
    editPR: (s, n, f) => { state.edits.push(f); },
  };
  return { root, head, state, io };
}

test('revert exempt posts a reviewer\'s exemption on the head and edits the body so the gate runs again; the job\'s own session is refused', () => {
  const j = jobRepo();
  assert.throws(() => revertExempt(j.root, 5, { why: 'refactor', io: j.io, log: quiet }), /needs --reviewer/);
  assert.throws(() => revertExempt(j.root, 5, { reviewer: 'session_rev', io: j.io, log: quiet }), /needs --why/);
  assert.throws(() => revertExempt(j.root, 5, { why: 'refactor', reviewer: 'cse_job', io: j.io, log: quiet }), /session_job is alpha's own job session: a job never exempts itself/);
  assert.equal(j.state.comments.length, 0);
  const r = revertExempt(j.root, 5, { why: 'a pure rename', reviewer: 'session_rev', io: j.io, log: quiet });
  assert.deepEqual([r.data.module, r.data.sha, r.data.reviewer, r.data.why], ['alpha', j.head, 'session_rev', 'a pure rename']);
  assert.deepEqual(parseBlock(j.state.comments[0], REVERT_EXEMPT).sha, j.head);
  assert.equal(j.state.edits.length, 1);
  assert.match(j.state.edits[0].body, new RegExp(`^START\\n\\n<!-- ${EXEMPT_MARK} 77 --> Gate re-run for the revert exemption https://x/77\\.$`));
});
