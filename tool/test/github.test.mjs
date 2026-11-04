import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markReady, toDraft } from '../lib/github.mjs';

const ok = { code: 0, stdout: '', stderr: '' };
const no = (msg) => ({ code: 1, stdout: '', stderr: msg });

test('markReady uses the proxy route first and stops there when it works', () => {
  const calls = [];
  const pr = markReady('o/r', 3, { call: (a) => { calls.push(a.join(' ')); return ok; }, read: () => ({ draft: false }) });
  assert.equal(pr.draft, false);
  assert.deepEqual(calls, ['api -X POST repos/o/r/pulls/3/ccr/ready_for_review']);
});

test('markReady falls back to gh pr ready outside a session', () => {
  const calls = [];
  const pr = markReady('o/r', 3, { call: (a) => { calls.push(a[0]); return a[0] === 'api' ? no('HTTP 404') : ok; }, read: () => ({ number: 3, draft: false }) });
  assert.deepEqual(calls, ['api', 'pr']);
  assert.equal(pr.number, 3);
});

test('markReady fails, naming both routes, when neither works', () => {
  assert.throws(() => markReady('o/r', 3, { call: () => no('HTTP 403: GraphQL is not available'), read: () => { throw new Error('read before failing'); } }),
    /could not mark pull request 3 ready: gh api -X POST: HTTP 403.*; gh pr ready 3: HTTP 403/);
});

test('markReady fails when the pull request is still a draft afterwards', () => {
  assert.throws(() => markReady('o/r', 3, { call: () => ok, read: () => ({ draft: true }) }), /still a draft/);
});

// Copy, 4 Nov: site's attempt 2 stopped on toDraft's GraphQL call, which sessions cannot reach.
test('toDraft uses the proxy REST route first and never GraphQL when it works', () => {
  const calls = [];
  const pr = toDraft('o/r', { number: 3, node_id: 'N' }, { call: (a) => { calls.push(a.join(' ')); return ok; }, read: () => ({ number: 3, draft: true }) });
  assert.equal(pr.draft, true);
  assert.deepEqual(calls, ['api -X POST repos/o/r/pulls/3/ccr/convert_to_draft']);
});

test('toDraft falls back to the GraphQL mutation outside a session', () => {
  const calls = [];
  toDraft('o/r', { number: 3, node_id: 'N' }, { call: (a) => { calls.push(a[1] === 'graphql' ? 'graphql' : 'rest'); return a[1] === 'graphql' ? ok : no('HTTP 404'); }, read: () => ({ draft: true }) });
  assert.deepEqual(calls, ['rest', 'graphql']);
});

test('toDraft fails, naming both routes, when neither works, and when still not a draft', () => {
  assert.throws(() => toDraft('o/r', { number: 3 }, { call: () => no('HTTP 403: nope'), read: () => { throw new Error('read before failing'); } }),
    /could not make pull request 3 a draft: gh api -X POST: HTTP 403.*; gh api graphql -f: HTTP 403/);
  assert.throws(() => toDraft('o/r', { number: 3 }, { call: () => ok, read: () => ({ draft: false }) }), /still not a draft/);
});
