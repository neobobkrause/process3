// GitHub's limits, kept by reading GitHub's own count (PD-22): /rate_limit before a GitHub-heavy act
// and after a refused or 5xx gh call; a back-off at 85% of a limit until its reset, or for Retry-After.
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import './helpers.mjs';
import { backoff, budgetGate, githubBudget, limitSignal, pacingProblem } from '../lib/pace.mjs';
import { ghRun } from '../lib/util.mjs';

const T = Date.parse('2026-11-09T12:00:00Z');
const bucket = (used, limit = 5000, reset = T + 600e3) => ({ limit, remaining: limit - used, reset });
const rl = (core, graphql = bucket(0)) => () => ({ core, graphql });

test('limitSignal: GitHub\'s refusals, not a proxy\'s or a plain 403', () => {
  assert.equal(limitSignal('gh: You have exceeded a secondary rate limit (HTTP 403)\nretry-after: 42').retryAfter, 42);
  assert.equal(limitSignal('gh: API rate limit exceeded for user (HTTP 403)').kind, 'primary');
  assert.ok(limitSignal('error: RPC failed; HTTP 429 curl 22 The requested URL returned error: 429'));
  assert.equal(limitSignal('HTTP 429: too many concurrent transfers (proxy)'), null);
  assert.equal(limitSignal('gh: Resource not accessible by integration (HTTP 403)'), null);
});

test('budgetGate: a start held only while a primary bucket is at 85% of its limit, until its reset', () => {
  assert.equal(budgetGate('.', { read: rl(bucket(4249)), now: T }), null);
  assert.match(budgetGate('.', { read: rl(bucket(4250)), now: T }), /4250 of GitHub's REST primary limit of 5000 .* 85%/);
  assert.match(budgetGate('.', { read: rl(bucket(0), bucket(4300)), now: T }), /GraphQL/);
  assert.equal(budgetGate('.', { read: rl(bucket(5000, 5000, T - 1)), now: T }), null, 'reset passed');
  assert.equal(budgetGate('.', { read: () => null, now: T }), null, 'unread: no hold');
});

test('backoff: Retry-After first; a bucket at the target waits for its reset; a refusal with neither, a minute; a 5xx with room, none', () => {
  const unread = () => { throw new Error('not read'); };
  assert.deepEqual(backoff('secondary rate limit (HTTP 403)\nRetry-After: 30', '.', { read: unread, now: T }), { until: T + 30e3, why: "GitHub's secondary rate limit, Retry-After 30 s", retry: true });
  assert.equal(backoff('secondary rate limit (HTTP 403)', '.', { read: rl(bucket(4500)), now: T }).until, T + 600e3);
  assert.equal(backoff('secondary rate limit (HTTP 403)', '.', { read: rl(bucket(10)), now: T }).until, T + 60e3);
  assert.equal(backoff('gh: Server Error (HTTP 502)', '.', { read: rl(bucket(10)), now: T }), null);
  const five = backoff('gh: Server Error (HTTP 502)', '.', { read: rl(bucket(4900)), now: T });
  assert.equal(five.retry, false, 'a 5xx may have acted: never made again');
  assert.equal(backoff('not found (HTTP 404)', '.', { read: unread, now: T }), null);
});

test('ghRun: a refusal waited out and the call made again; a long one, or a 5xx at the target, refused naming when to rerun', () => {
  const dir = mkdtempSync(join(tmpdir(), 'p3-gh-'));
  const count = join(dir, 'n');
  writeFileSync(count, '0');
  // A stand-in gh: refused (Retry-After 2) on the first call, answers on the second.
  writeFileSync(join(dir, 'gh'), `#!/bin/sh\nn=$(cat ${count}); echo $((n+1)) > ${count}\nif [ "$n" = 0 ]; then echo "secondary rate limit (HTTP 403)" >&2; echo "retry-after: 2" >&2; exit 1; fi\necho '{"ok":true}'\n`);
  chmodSync(join(dir, 'gh'), 0o755);
  const PATH = process.env.PATH;
  process.env.PATH = `${dir}:${PATH}`;
  try {
    const slept = [];
    const r = ghRun(['api', 'x'], {}, { read: () => null, now: () => T, sleep: (ms) => slept.push(ms), log: () => {} });
    assert.equal(r.code, 0);
    assert.deepEqual(slept, [2000]);
    assert.equal(readFileSync(count, 'utf8').trim(), '2');
    writeFileSync(join(dir, 'gh'), '#!/bin/sh\necho "gh: Server Error (HTTP 503)" >&2; exit 1\n');
    assert.throws(() => ghRun(['api', 'x'], {}, { read: rl(bucket(4900)), now: () => T, sleep: () => assert.fail('no wait'), log: () => {} }), /REST primary limit .* run this again after 2026-11-09T12:10:00Z/);
    assert.equal(ghRun(['api', 'x'], {}, { read: rl(bucket(1)), now: () => T, log: () => {} }).code, 1, 'a 5xx with room: the failed call, as before');
    writeFileSync(join(dir, 'gh'), '#!/bin/sh\necho "secondary rate limit (HTTP 403)" >&2; echo "retry-after: 3600" >&2; exit 1\n');
    assert.throws(() => ghRun(['api', 'x'], {}, { read: () => null, now: () => T, sleep: () => assert.fail('no wait'), log: () => {} }), /Retry-After 3600 s; run this again after 2026-11-09T13:00:00Z/);
  } finally { process.env.PATH = PATH; }
});

test('github budget: one read of /rate_limit; pacing keeps target and poll_first_s, ignores the retired keys', () => {
  const lines = [];
  githubBudget('.', { read: rl(bucket(600)), log: (l) => lines.push(l), now: T });
  assert.match(lines.join('\n'), /REST primary, an hour: 600\/5000 \(12%\)[\s\S]*under the target/);
  assert.equal(pacingProblem({ target: 0.85, ledger: 'o/r', github_limits: {}, share_s: 900 }), null);
  assert.match(pacingProblem({ target: 0.95 }), /between 0.8 and 0.9/);
  assert.match(pacingProblem({ nope: 1 }), /not a pacing key/);
});
