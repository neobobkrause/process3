import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commit, makeRepo } from './helpers.mjs';
import { HANDOVER_FILE, handoverBegin, handoverConfirm, readAddress, recordStart, startRole } from '../lib/roles.mjs';
import { git } from '../lib/util.mjs';
import { address } from '../lib/state.mjs';

const quiet = () => {};
const R = 'session_root1';
const B1 = 'session_bob1';
const B2 = 'session_bob2';

function withOrigin() {
  const root = makeRepo({ 'README.md': 'x', 'process/config.json': { tranche: 'tranche' } });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  return root;
}
const stateFile = (root, f) => git(['show', `origin/process-state:${f}`], { cwd: root });

test('start record writes the address on the state branch, never touching the checkout', () => {
  const root = withOrigin();
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  assert.deepEqual(readAddress(root), {});
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B1, { log: quiet });
  const a = readAddress(root);
  assert.equal(a.root.session, R);
  assert.equal(a.bob.session, B1);
  assert.match(a.bob.at, /^\d{4}-\d\d-\d\dT/);
  assert.equal(address(root, 'process-state', 'bob'), B1, 'send reads the same file');
  assert.equal(git(['rev-parse', 'HEAD'], { cwd: root }), head);
  assert.equal(git(['status', '--porcelain'], { cwd: root }), '');
  assert.throws(() => recordStart(root, 'bob', B2, { log: quiet }), /handover confirm/);
  assert.throws(() => recordStart(root, 'job', B2, { log: quiet }), /name a role/);
  assert.throws(() => recordStart(root, 'root', 'not-an-id', { log: quiet }), /not a session id/);
});

test('another writer\'s commit on the state branch is kept', () => {
  const root = withOrigin();
  recordStart(root, 'root', R, { log: quiet });
  // Another writer adds a file between our fetch and our push: simulate by pushing from a clone.
  const other = join(mkdtempSync(join(tmpdir(), 'p3-clone-')), 'c');
  git(['clone', '-q', '-b', 'process-state', git(['remote', 'get-url', 'origin'], { cwd: root }), other], { cwd: root });
  for (const [k, v] of [['user.email', 't@t'], ['user.name', 'T']]) git(['config', k, v], { cwd: other });
  const theirs = commit(other, { 'heartbeat.txt': 'x' });
  git(['push', '-q', 'origin', 'process-state'], { cwd: other });
  recordStart(root, 'bob', B1, { log: quiet });
  assert.equal(git(['merge-base', '--is-ancestor', theirs, 'origin/process-state'], { cwd: root, allowFail: true }).code, 0);
});

test('start prints prompts and the create_session call; start bob refuses while a BOB is addressed', () => {
  const root = withOrigin();
  const r = startRole(root, 'root', { slug: 'o/p', address: {}, log: quiet });
  assert.match(r.prompt, /^# ROOT\n\nPriorities first/);
  for (const act of ['start bob', 'handover begin', 'handover confirm', 'interrupt', 'archive', 'sweep', 'step 0', 'heartbeat', 'push notification']) assert.ok(r.prompt.includes(act), act);
  assert.doesNotMatch(r.prompt, /—/);
  assert.throws(() => startRole(root, 'bob', { slug: 'o/p', address: {}, log: quiet }), /no ROOT is addressed/);
  const b = startRole(root, 'bob', { slug: 'o/p', address: { root: { session: R } }, log: quiet });
  assert.ok(b.prompt.includes(R));
  assert.deepEqual([b.call.source_url, b.call.source_revision, b.call.prompt], ['https://github.com/o/p', git(['rev-parse', 'origin/tranche'], { cwd: root }), b.prompt]);
  assert.ok(Buffer.byteLength(b.prompt) < 4096, 'one screen');
  assert.throws(() => startRole(root, 'bob', { slug: 'o/p', address: { root: { session: R }, bob: { session: B1 } }, log: quiet }), /handover begin/);
});

test('handover: begin prints the new BOB\'s prompt; confirm repoints and records the row', () => {
  const root = withOrigin();
  assert.throws(() => handoverConfirm(root, B2, { log: quiet }), /no BOB is addressed/);
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'bob', B1, { log: quiet });
  const h = handoverBegin(root, { slug: 'o/p', log: quiet });
  assert.equal(h.old, B1);
  assert.match(h.prompt, /handoff/);
  assert.ok(h.prompt.includes(`You replace BOB \`${B1}\``));
  assert.throws(() => handoverConfirm(root, B1, { log: quiet }), /already the addressed BOB/);
  handoverConfirm(root, B2, { log: quiet });
  assert.equal(readAddress(root).bob.session, B2);
  assert.equal(readAddress(root).root.session, R);
  const row = JSON.parse(stateFile(root, HANDOVER_FILE));
  assert.deepEqual([row.row, row.old, row.new], ['handover', B1, B2]);
});
