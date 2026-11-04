// Build Plan Phase 3: tranche open (the grants check) and tranche close.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { status } from '../lib/status.mjs';
import { checkOpen, OPEN_FILE, recordOpen, TRANCHE_CLOSED_FILE, trancheClose, trancheOpen } from '../lib/tranche.mjs';
import { REFUSALS_FILE } from '../lib/metrics.mjs';
import { git } from '../lib/util.mjs';
import { commit, entry, makeRepo, openPassed } from './helpers.mjs';

const quiet = () => {};
const unmet = (n) => Array.from({ length: n }, (_, i) => `- **R${i + 1}** *(not yet met: x)* text`).join('\n') + '\n- **R99** met\n';
const slug = 'o/p';

test('status --role bob: no job work until the open passes; a refused needed act stops it; a refused archive is reported only', () => {
  const files = { 'build/requirements/m.md': unmet(1) };
  const pending = makeRepo(files);
  const out = [];
  const r = status(pending, { role: 'bob', offline: true, log: (m) => out.push(m) });
  assert.deepEqual(r.next, []);
  assert.equal(r.open.state, 'pending');
  assert.match(out.join('\n'), /^tranche open: 0 of 12 acts recorded; no job starts until it passes/m);
  assert.doesNotMatch(out.join('\n'), /next work/);

  const stopped = makeRepo(files);
  openPassed(stopped, { outcome: { 'pr-merge|2': 'refused' } });
  const s = [];
  assert.deepEqual(status(stopped, { role: 'bob', offline: true, log: (m) => s.push(m) }).next, []);
  assert.match(s.join('\n'), /tranche open: STOPPED: pr-merge at depth 2 refused \(probe\); bring it to Bob/);

  const reported = makeRepo(files);
  openPassed(reported, { outcome: { 'session-archive|1': 'refused', 'task-delete|1': 'declined' } });
  const p = status(reported, { role: 'bob', offline: true, log: quiet });
  assert.equal(p.open.state, 'open');
  assert.equal(p.open.reported.length, 2);
  assert.deepEqual(p.next.map((x) => x.file), ['build/requirements/m.md']);
  // Another tranche's rows do not count.
  const other = makeRepo(files);
  openPassed(other, { tranche: 'older' });
  assert.equal(status(other, { role: 'bob', offline: true, log: quiet }).open.state, 'pending');
});

function withOrigin(files) {
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  return { root, bare };
}

test('tranche open: prints BOB\'s acts and the probe\'s call; --record writes each outcome; --check says open, pending or stopped', () => {
  const { root, bare } = withOrigin({ 'README.md': 'x\n' });
  git(['push', '-q', 'origin', 'tranche:refs/heads/p3/grants-tranche-1'], { cwd: root });
  const out = [];
  const o = trancheOpen(root, { slug, log: (m) => out.push(m) });
  const text = out.join('\n');
  assert.equal(o.n, 2);
  assert.equal(o.base, 'p3/grants-tranche-2');
  assert.match(text, /^tranche open: 0 of 12 acts recorded/m);
  assert.match(text, /push: `git push -u origin p3\/grants-tranche-2-bob`; then node \.process\/tool\/p3\.mjs tranche open --record "push\|1\|<ok, refused or declined>"/);
  assert.match(text, /pr-merge: `node \.process\/tool\/p3\.mjs merge <that pull request> --plain --no-review/);
  assert.match(text, /task-delete: delete_trigger/);
  assert.equal(o.call.clone_depth, 1);
  assert.equal(o.call.source_revision, git(['rev-parse', 'tranche'], { cwd: root }));
  assert.match(o.call.prompt, /push: `git push -u origin p3\/grants-tranche-2-probe`/);
  assert.match(o.call.prompt, /"<act>\|2\|<ok, refused or declined>"/);

  assert.throws(() => recordOpen(root, ['push|1|ok'], { log: quiet }), /--session/);
  assert.throws(() => recordOpen(root, ['fly|1|ok'], { session: 'b', log: quiet }), /the act one of/);
  assert.throws(() => recordOpen(root, ['push|1|maybe'], { session: 'b', log: quiet }), /<ok, refused or declined>/);
  const acts = ['push', 'pr-open', 'pr-comment', 'pr-merge', 'session-start', 'session-archive', 'task-create', 'task-delete'];
  const first = [];
  recordOpen(root, acts.map((a) => `${a}|1|ok`), { session: 'bob', log: (m) => first.push(m) });
  assert.doesNotMatch(first.join('\n'), /wake BOB/, 'not yet passed: no wake');
  const pend = [];
  assert.equal(checkOpen(root, { log: (m) => pend.push(m) }).state, 'pending');
  assert.doesNotMatch(pend.join('\n'), /wake BOB/);
  recordOpen(root, ['push|2|ok', 'pr-open|2|ok', 'pr-comment|2|ok'], { session: 'probe', log: quiet });
  recordOpen(root, ['pr-merge|2|refused'], { session: 'probe', log: quiet });
  const c = [];
  assert.equal(checkOpen(root, { log: (m) => c.push(m) }).state, 'stopped');
  assert.match(c.join('\n'), /STOPPED: pr-merge at depth 2 refused \(probe\)/);
  // The refusal is also metrics refusal's row, so it counts toward REFRESH.
  const ref = JSON.parse(readFileSync(join(root, REFUSALS_FILE), 'utf8').trim());
  assert.deepEqual([ref.session, ref.act, ref.depth], ['probe', 'tranche open: pr-merge', 2]);
  assert.equal(git(['show', `process-state:${OPEN_FILE}`], { cwd: bare }).split('\n').length, 12);
  // Stopped, open prints no acts.
  assert.deepEqual(trancheOpen(root, { slug, log: quiet }).steps, []);
  assert.throws(() => recordOpen(root, ['pr-merge|2|ok'], { session: 'probe2', log: quiet }), /pr-merge at depth 2 stopped this open; an ok after it needs --bob/);
  const pass = [];
  recordOpen(root, ['pr-merge|2|ok'], { session: 'probe2', bob: 'grant fixed, take it again', log: (m) => pass.push(m) });
  // The record that passes the open lets jobs start: its last line wakes BOB, as --check's does.
  const wake = `next act: wake BOB with \`node .process/tool/p3.mjs send bob "tranche open passed: run status" --from <role>\`, delivered with send_message to the address it prints`;
  assert.equal(pass.at(-1), wake);
  const ok = [];
  assert.equal(checkOpen(root, { log: (m) => ok.push(m) }).state, 'open');
  assert.equal(ok.at(-1), wake);
});

const LAYERS = '| layer | what | modules |\n|---|---|---|\n| 1 | first | a |\n';
const io = { compare: () => null, status: { openPRs: () => [], checkRun: () => null, compare: () => null } };

test('tranche close: refused while a layer is open; the acts merge main in only when it is not in the tranche; --record once on main', () => {
  const open = withOrigin({ 'build/layers.md': LAYERS, 'build/requirements/a.md': unmet(1), 'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md' }) });
  assert.throws(() => trancheClose(open.root, { slug, io, log: quiet }), /layers not closed: 1/);

  const files = { 'build/layers.md': LAYERS, 'build/requirements/a.md': unmet(0), 'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md', status: { state: 'COMPLETE' } }) };
  const { root, bare } = withOrigin(files);
  const out = [];
  trancheClose(root, { slug, io, log: (m) => out.push(m) });
  assert.match(out.join('\n'), /is already in tranche: no merge of main into it/);
  assert.doesNotMatch(out.join('\n'), /"head":"main"/);
  assert.match(out.join('\n'), /create_pull_request \{"owner":"o","repo":"p","head":"tranche","base":"main"/);
  assert.match(out.join('\n'), /tranche close --record/);

  // main moved: its merge into the tranche comes first.
  git(['checkout', '-q', 'main'], { cwd: root });
  commit(root, { 'NOTE.md': 'owner edit\n' });
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  commit(root, { 'WORK.md': 'tranche work\n' });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  const two = [];
  const r = trancheClose(root, { slug, io, log: (m) => two.push(m) });
  assert.match(r.steps[0], /"head":"main","base":"tranche"/);
  assert.match(r.steps[1], /merge <that pull request> --plain --no-review "main into the tranche/);

  // --record: refused until the tranche is on main, then one row; not twice.
  assert.throws(() => trancheClose(root, { slug, io, record: true, log: quiet }), /not on main yet/);
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['merge', '-q', '--no-edit', 'tranche'], { cwd: root });
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  const rec = [];
  const done = trancheClose(root, { slug, io, record: true, report: true, log: (m) => rec.push(m) });
  const row = JSON.parse(git(['show', `process-state:${TRANCHE_CLOSED_FILE}`], { cwd: bare }));
  assert.equal(row.commit, git(['rev-parse', 'tranche'], { cwd: bare }));
  assert.equal(row.main, git(['rev-parse', 'main'], { cwd: bare }));
  assert.equal(done.row.tranche, 'tranche');
  assert.match(rec.join('\n'), /next: node \.process\/tool\/p3\.mjs report tranche/);
  assert.throws(() => trancheClose(root, { slug, io, record: true, log: quiet }), /already recorded/);
  // The plan says close: no layer check.
  commit(open.root, { 'process/config.json': { plan: 'close' } });
  git(['push', '-q', 'origin', 'HEAD:tranche'], { cwd: open.root });
  assert.ok(trancheClose(open.root, { slug, io, log: quiet }).steps.length >= 3);
});

test('a close starts a new open: grant rows before the tranche\'s last close do not count', () => {
  const { root } = withOrigin({ 'README.md': 'x\n' });
  const acts = ['push', 'pr-open', 'pr-comment', 'pr-merge', 'session-start', 'session-archive', 'task-create', 'task-delete'];
  recordOpen(root, [...acts.map((a) => `${a}|1|ok`)], { session: 'bob', log: quiet });
  recordOpen(root, acts.slice(0, 4).map((a) => `${a}|2|ok`), { session: 'probe', log: quiet });
  assert.equal(checkOpen(root, { log: quiet }).state, 'open');
  trancheClose(root, { slug, io, record: true, log: quiet });
  assert.equal(checkOpen(root, { log: quiet }).state, 'pending');
});

test('BOB at depth 2: status reads its depth from the rows; --record refuses an act the check does not count', () => {
  const { root } = withOrigin({ 'README.md': 'x\n' });
  const acts = ['push', 'pr-open', 'pr-comment', 'pr-merge', 'session-start', 'session-archive', 'task-create', 'task-delete'];
  recordOpen(root, acts.map((a) => `${a}|2|ok`), { session: 'bob', log: quiet });
  assert.throws(() => recordOpen(root, ['session-start|3|ok'], { session: 'probe', log: quiet }), /not an act of this check .*session-start at depth 3; nothing recorded/);
  assert.throws(() => recordOpen(root, ['push|4|refused'], { session: 'probe', log: quiet }), /push at depth 4/);
  assert.throws(() => existsSync(join(root, REFUSALS_FILE)) || (() => { throw new Error('none'); })(), /none/);
  recordOpen(root, acts.slice(0, 4).map((a) => `${a}|3|ok`), { session: 'probe', log: quiet });
  const s = status(root, { role: 'bob', offline: true, log: quiet });
  assert.equal(s.open.state, 'open');
  assert.equal(s.open.depth, 2);
});
