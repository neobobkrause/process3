import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRepo, entry, openPassed } from './helpers.mjs';
import { startable, startReady } from '../lib/ready.mjs';
import { nextWork } from '../lib/status.mjs';
import { fail, git } from '../lib/util.mjs';
import { status } from '../lib/status.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const quiet = () => {};
const unmet = (n) => Array.from({ length: n }, (_, i) => `- **R${i + 1}** *(not yet met: x)* text`).join('\n') + '\n';

test('startable: an OPEN entry never started, a COMPLETE one with a notice or found marks; named otherwise', () => {
  const next = [
    { file: 'r/a.md', count: 2, module: 'a', entry_state: 'OPEN' },
    { file: 'r/b.md', count: 1, module: 'b', entry_state: 'OPEN' },
    { file: 'r/c.md', count: 1 },
    { file: 'r/d.md', count: 1, module: 'd', entry_state: 'OPEN', over: 'split or consolidate before its job: r/d.md' },
    { file: 'r/e.md', count: 0, module: 'e', entry_state: 'COMPLETE', notices: ['p:9'] },
    { file: 'r/f.md', count: 1, module: 'f', entry_state: 'COMPLETE', found: ['F1', 'F2'] },
    { file: 'r/g.md', count: 1, module: 'g', entry_state: 'COMPLETE' },
    { triage: 'p:9' },
  ];
  const { go, skip } = startable(next, { onOrigin: (id) => ['b', 'e', 'f', 'g'].includes(id) });
  assert.deepEqual(go, [{ id: 'a', file: 'r/a.md' }, { id: 'e', file: 'r/e.md' }, { id: 'f', file: 'r/f.md', reopen: 'meet the found marks F1, F2' }]);
  assert.deepEqual(skip.map((s) => s.id || s.file), ['b', 'r/c.md', 'g']);
  assert.match(skip[1].why, /no ledger entry/);
});

test('job start --ready: starts every ready job up to live_cap less the live sessions; a refused start does not stop the rest', () => {
  const root = makeRepo({ 'process/config.json': JSON.stringify({ live_cap: 5 }) });
  const next = ['a', 'b', 'c', 'd'].map((id) => ({ file: `r/${id}.md`, count: 1, module: id, entry_state: 'OPEN' }));
  const calls = [];
  const out = [];
  const r = startReady(root, {
    live: 2, remote: new Set(), log: (m) => out.push(m),
    read: (_, o) => { assert.equal(o.role, 'bob'); assert.equal(o.live, 2); return { next }; },
    start: (_, id, o) => { calls.push([id, o.coordinator]); if (id === 'b') fail('the setup is not complete'); return { launch: { title: `job ${id}` } }; },
    coordinator: 'session_x',
  });
  assert.deepEqual(calls, [['a', 'session_x'], ['b', 'session_x'], ['c', 'session_x']], 'cap 5 less 2 live: three starts');
  assert.deepEqual(r.started.map((x) => x.id), ['a', 'c']);
  assert.deepEqual(r.failed, [{ id: 'b', why: 'the setup is not complete' }]);
  assert.deepEqual(r.waiting, ['d']);
  assert.equal(r.ok, false);
  assert.match(out[0], /^ready: 4 startable \(live 2, cap 5\); starting 3, 1 wait for the cap: d$/);
  assert.match(out.at(-1), /^next acts: create_session with each launch printed above \(a, c\)/);
  assert.throws(() => startReady(root, { read: () => ({ next }) }), /--live <n>/);
  assert.throws(() => startReady(root, { live: 'x', read: () => ({ next }) }), /--live <n>/);
});

test('job start --ready: a job whose branch is already on origin is never launched twice', () => {
  const root = makeRepo({ 'process/config.json': JSON.stringify({ live_cap: 5 }) });
  const next = [{ file: 'r/a.md', count: 1, module: 'a', entry_state: 'OPEN' }];
  const calls = [];
  const out = [];
  const r = startReady(root, { live: 0, remote: new Set(['a']), log: (m) => out.push(m), read: () => ({ next }), start: (_, id) => calls.push(id) });
  assert.deepEqual(calls, []);
  assert.equal(r.ok, true);
  assert.match(out.join('\n'), /not started: a: job\/a is on origin/);
  assert.match(out.at(-1), /^nothing started/);
});

test('next work: an OPEN entry status found never started is listed with its module; one with a job is not', () => {
  const root = makeRepo({
    'build/requirements/a.md': unmet(2),
    'build/requirements/b.md': unmet(1),
    'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md' }),
    'process/ledger/b.json': entry('b', { requirements: 'build/requirements/b.md' }),
  });
  openPassed(root);
  const rows = [{ id: 'a', tranche: 'OPEN', req: 'build/requirements/a.md', unstarted: true }, { id: 'b', tranche: 'OPEN', req: 'build/requirements/b.md', branch: 'WORKING' }];
  const out = [];
  const next = nextWork(root, { requirements_dir: 'build/requirements', layers_file: 'none.md', live_cap: 24, requirements_cap: 1e6 }, rows, null, { log: (m) => out.push(m), state: null });
  assert.deepEqual(next.map((x) => [x.file, x.module, x.entry_state]), [['build/requirements/a.md', 'a', 'OPEN']]);
  assert.match(out.join('\n'), /build\/requirements\/a\.md: 2; entry OPEN, never started: node \.process\/tool\/p3\.mjs job start --ready/);
});

test('status --role bob, origin read: an OPEN entry with no job branch on origin and no pull request is marked never started', () => {
  const root = makeRepo({
    'build/requirements/a.md': unmet(2),
    'build/requirements/b.md': unmet(1),
    'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md' }),
    'process/ledger/b.json': entry('b', { requirements: 'build/requirements/b.md' }),
  });
  git(['branch', 'tranche'], { cwd: root });
  git(['branch', 'job/b'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', 'https://github.com/o/r'], { cwd: root });
  git(['config', `url.${bare}.insteadOf`, 'https://github.com/o/r'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche', 'job/b'], { cwd: root });
  openPassed(root);
  const see = (prs) => status(root, { role: 'bob', log: quiet, io: { openPRs: () => prs, prFiles: () => [], checkRun: () => null, compare: () => null } });
  const r = see([]);
  assert.deepEqual(r.rows.filter((x) => x.unstarted).map((x) => x.id), ['a']);
  assert.deepEqual(r.next.map((x) => [x.module, x.entry_state]), [['a', 'OPEN']]);
  // GitHub unread: nothing is marked, so nothing is started on a guess.
  assert.deepEqual(see(null).rows.filter((x) => x.unstarted), []);
});

test('job start --ready, review of PR 100: an open attempt is not restarted, a module listed twice starts once, a failed start shows no launch, a resumed start with its PR open is not counted', () => {
  const root = makeRepo({ 'process/config.json': JSON.stringify({ live_cap: 9 }) });
  const next = [
    { file: 'r/x.md', count: 0, module: 'x', entry_state: 'COMPLETE', notices: ['p:2'], attempt_open: true },
    { file: 'r/a.md', count: 1, module: 'a', entry_state: 'OPEN' },
    { file: 'r/a2.md', count: 1, module: 'a', entry_state: 'OPEN' },
    { file: 'r/b.md', count: 1, module: 'b', entry_state: 'OPEN' },
    { file: 'r/c.md', count: 1, module: 'c', entry_state: 'OPEN' },
  ];
  const calls = [];
  const out = [];
  const r = startReady(root, {
    live: 0, remote: new Set(), log: (m) => out.push(m), read: () => ({ next }),
    start: (_, id, o) => {
      calls.push(id);
      o.log('start the job session with create_session:\n{}');
      if (id === 'b') throw new SyntaxError('Unexpected token');
      if (id === 'c') return { resumed: true, pr: { number: 4 }, created: false };
      return { launch: {} };
    },
  });
  assert.deepEqual(calls, ['a', 'b', 'c']);
  assert.deepEqual(r.started.map((x) => x.id), ['a']);
  assert.deepEqual(r.failed.map((x) => x.id), ['b', 'c']);
  assert.equal(out.filter((l) => l.startsWith('start the job session')).length, 1, 'only the started job\'s launch is shown');
  assert.match(out.join('\n'), /not started: x: its attempt is open/);
  assert.match(out.join('\n'), /not started: b: Unexpected token \(an unexpected error; the other starts went on\)/);
  assert.match(out.join('\n'), /not started: c: its pull request was already open/);
});
