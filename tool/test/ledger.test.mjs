import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkLedger, validate, writeStatus } from '../lib/ledger.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo, write } from './helpers.mjs';

test('a complete entry passes the schema', () => {
  assert.deepEqual(validate(entry('alpha')), []);
});

test('the schema names missing fields, bad states and unknown fields', () => {
  const e = entry('alpha', { status: { state: 'DONE' }, extra: 1 });
  delete e.paths;
  const errs = validate(e).join('\n');
  assert.match(errs, /paths: required/);
  assert.match(errs, /status.state: must be one of/);
  assert.match(errs, /extra: not a ledger field/);
});

test('file name must match id, and BLOCKED needs a reason', () => {
  const root = makeRepo({
    'process/ledger/alpha.json': entry('beta'),
    'process/ledger/gamma.json': entry('gamma', { status: { state: 'BLOCKED' } }),
  });
  const msgs = checkLedger(root).map((f) => `${f.file} ${f.message}`).join('\n');
  assert.match(msgs, /alpha.json id beta does not match/);
  assert.match(msgs, /gamma.json BLOCKED needs a reason/);
});

test('a job may change only the status of its own entry', () => {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha'), 'process/ledger/beta.json': entry('beta') });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });

  writeStatus(root, 'alpha', { state: 'COMPLETE' });
  assert.deepEqual(checkLedger(root, { base, branch: 'job/alpha' }), []);

  write(root, { 'process/ledger/alpha.json': entry('alpha', { paths: ['src/'], status: { state: 'COMPLETE' } }) });
  assert.match(checkLedger(root, { base, branch: 'job/alpha' })[0].message, /only the status field/);

  write(root, { 'process/ledger/alpha.json': entry('alpha'), 'process/ledger/beta.json': entry('beta', { status: { state: 'WORKING' } }) });
  assert.match(checkLedger(root, { base, branch: 'job/alpha' })[0].message, /only its own entry/);

  write(root, { 'process/ledger/beta.json': entry('beta'), 'process/ledger/delta.json': entry('delta') });
  assert.match(checkLedger(root, { base, branch: 'job/alpha' })[0].message, /may not add/);

  // Off a job branch, BOB may add entries: only the schema applies.
  assert.deepEqual(checkLedger(root, { base, branch: 'bob/plan' }), []);
});

test('the ledger can be read at a git ref', () => {
  const root = makeRepo({ 'process/ledger/alpha.json': entry('alpha') });
  const sha = commit(root, { 'process/ledger/alpha.json': '{ not json' });
  assert.match(checkLedger(root, { ref: sha })[0].message, /not JSON/);
  assert.deepEqual(checkLedger(root, { ref: `${sha}~1` }), []);
});
