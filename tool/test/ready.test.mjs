import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRepo, entry, openPassed } from './helpers.mjs';
import { archivable, readyCount, startable, startReady } from '../lib/ready.mjs';
import { writeFileSync } from 'node:fs';
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

test('job start --ready: starts every ready job up to job_cap less the job sessions; a refused start does not stop the rest', () => {
  const root = makeRepo({ 'process/config.json': JSON.stringify({ job_cap: 5 }) });
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
  assert.match(out[0], /^ready: 4 startable \(jobs 2, job cap 5\); starting 3, 1 wait for the cap: d$/);
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
  const next = nextWork(root, { requirements_dir: 'build/requirements', layers_file: 'none.md', job_cap: 24, requirements_cap: 1e6 }, rows, null, { log: (m) => out.push(m), state: null });
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

test('job start --ready: when the cap holds a ready job back, it names the idle sessions of COMPLETE or merged jobs BOB can archive', () => {
  const root = makeRepo({ 'process/config.json': JSON.stringify({ live_cap: 2 }) });
  const next = ['a', 'b'].map((id) => ({ file: `r/${id}.md`, count: 1, module: id, entry_state: 'OPEN' }));
  const rows = [
    { id: 'm', tranche: 'COMPLETE', pr: 'merged' },
    { id: 'k', tranche: 'WORKING', branch: 'COMPLETE', pr: '#7 ready' },
    { id: 'w', tranche: 'WORKING', branch: 'WORKING', pr: '#8 draft' },
    { id: 'gone', tranche: 'COMPLETE', pr: 'merged' },
    // Reopened: COMPLETE on the tranche, WORKING on its branch, its draft open; never named.
    { id: 'r', tranche: 'COMPLETE', branch: 'WORKING', pr: '#9 draft' },
  ];
  const listed = [
    { id: 'session_m', title: 'job m', session_status: 'SESSION_STATUS_IDLE' },
    { id: 'session_k', title: 'job k', session_status: 'SESSION_STATUS_RUNNING', status_bucket: 'review_ready' }, // idle by its bucket alone,
    { id: 'session_w', title: 'job w', session_status: 'SESSION_STATUS_IDLE' },
    { id: 'session_g', title: 'job gone', session_status: 'SESSION_STATUS_ARCHIVED' },
    { id: 'session_r', title: 'job r', session_status: 'SESSION_STATUS_IDLE' },
  ];
  assert.deepEqual(archivable(rows, listed).sessions, [
    { session: 'session_m', job: 'm', why: 'merged' },
    { session: 'session_k', job: 'k', why: 'COMPLETE, PR #7 ready' },
  ]);
  const file = join(mkdtempSync(join(tmpdir(), 'p3-sessions-')), 's.json');
  writeFileSync(file, JSON.stringify({ ccr: { data: listed } }));
  const out = [];
  const r = startReady(root, { live: 1, sessions: file, remote: new Set(), log: (m) => out.push(m), read: () => ({ next, rows }), start: (_, id) => ({ launch: { title: `job ${id}` } }) });
  assert.deepEqual(r.waiting, ['b']);
  assert.match(out.join('\n'), /the cap holds 1 back; archive these idle sessions of COMPLETE or merged jobs to free slots, then run this again: session_m \(job m, merged\); session_k \(job k, COMPLETE, PR #7 ready\)/);
  // Without --sessions: the jobs whose sessions to look for.
  const out2 = [];
  startReady(root, { live: 1, remote: new Set(), log: (m) => out2.push(m), read: () => ({ next, rows }), start: (_, id) => ({ launch: { title: `job ${id}` } }) });
  assert.match(out2.join('\n'), /the cap holds 1 back; these jobs are COMPLETE or merged, so their sessions, when idle, can be archived to free slots: job k \(COMPLETE, PR #7 ready\); job m \(merged\); job gone \(merged\)\. Save list_sessions as JSON and pass --sessions <file>/);
  // No cap hit: no archive line.
  const out3 = [];
  startReady(root, { live: 0, remote: new Set(), log: (m) => out3.push(m), read: () => ({ next, rows }), start: (_, id) => ({ launch: { title: `job ${id}` } }) });
  assert.doesNotMatch(out3.join('\n'), /the cap holds/);
  // readyCount: the startable jobs status lists, for the wake's lead.
  assert.equal(readyCount(root, { read: (_, o) => { assert.equal(o.offline, true); return { next }; } }), 2);
});

// The copy, 4 Nov: publication and case-authoring, entries merged 11:44:06, layer 8 with the open
// layer 4 and providers with unmet marks, were neither layer work, ready by uses nor notice work:
// listed nowhere, so job start --ready at the merges of 11:52 to 12:05 never started them.
test('status --role bob: an OPEN entry BOB wrote outside the open layer, its uses not done, is startable; the offline count sees it', () => {
  const root = makeRepo({
    'build/layers.md': '| Layer | Modules |\n|---|---|\n| 1 | `base` |\n| 2 | `prov` |\n| 3 | `pub`, `later` |\n',
    'process/modules.json': JSON.stringify({ modules: [{ id: 'base', paths: ['src/base/'], uses: [] }, { id: 'prov', paths: ['src/prov/'], uses: [] }, { id: 'pub', paths: ['src/pub/'], uses: ['prov'] }, { id: 'later', paths: ['src/later/'], uses: ['prov'] }] }),
    'process/config.json': JSON.stringify({ modules_file: 'process/modules.json', live_cap: 24 }),
    'build/requirements/base.md': unmet(1),
    'build/requirements/prov.md': unmet(2),
    'build/requirements/pub.md': unmet(3),
    'build/requirements/later.md': unmet(1),
    'process/ledger/pub.json': entry('pub', { requirements: 'build/requirements/pub.md' }),
  });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', 'https://github.com/o/r'], { cwd: root });
  git(['config', `url.${bare}.insteadOf`, 'https://github.com/o/r'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  openPassed(root);
  const out = [];
  const r = status(root, { role: 'bob', log: (m) => out.push(m), io: { openPRs: () => [], prFiles: () => [], checkRun: () => null, compare: () => null } });
  // pub is listed (its entry is BOB's choice); later, with no entry, is not.
  assert.deepEqual(r.next.filter((x) => x.module).map((x) => [x.module, x.entry_state]), [['pub', 'OPEN']]);
  assert.match(out.join('\n'), /entered, never started \(BOB wrote the entry; ready whatever its layer or uses\): all 1 listed\n- build\/requirements\/pub\.md: 3 \(layer 3\); entry OPEN, never started/);
  assert.deepEqual(startable(r.next).go, [{ id: 'pub', file: 'build/requirements/pub.md' }]);
  // The wake's offline count: the one ls-remote marks it unstarted (it counted 0 before).
  assert.equal(readyCount(root), 1);
  // An entered module with no unmet mark has nothing for a job: not listed.
  writeFileSync(join(root, 'build/requirements/pub.md'), '# pub\n');
  git(['commit', '-qam', 'pub met'], { cwd: root });
  git(['push', '-q', 'origin', 'HEAD:tranche'], { cwd: root });
  assert.equal(readyCount(root), 0);
  writeFileSync(join(root, 'build/requirements/pub.md'), unmet(3));
  git(['commit', '-qam', 'pub reopened'], { cwd: root });
  git(['push', '-q', 'origin', 'HEAD:tranche'], { cwd: root });
  assert.equal(readyCount(root), 1);
  // Its job branch on origin: neither started again nor counted.
  git(['branch', 'job/pub'], { cwd: root });
  git(['push', '-q', 'origin', 'job/pub'], { cwd: root });
  assert.equal(readyCount(root), 0);
});

// The job cap (Bob, 4 Nov): only job sessions count, against job_cap, default 20.
test('job cap: on the live shape (4 roles, 1 build, 18 jobs), 2 jobs start with job_cap 20; live_cap is read as job_cap with a line; default 20', () => {
  const s = (id, title) => ({ id, title, session_status: 'SESSION_STATUS_RUNNING' });
  const listed = [s('session_ROOT', 'ROOT'), s('session_BOB', 'BOB'), s('session_W', 'watcher'), s('session_C', 'coordinator'), s('session_b', 'build job-cap'),
    ...Array.from({ length: 18 }, (_, i) => s(`session_j${i}`, i % 2 ? `job m${i}` : `job m${i} (restart)`)), { ...s('session_old', 'job old'), session_status: 'SESSION_STATUS_ARCHIVED' }];
  const file = join(mkdtempSync(join(tmpdir(), 'p3-sessions-')), 's.json');
  writeFileSync(file, JSON.stringify({ ccr: { data: listed } }));
  const next = ['a', 'b', 'c', 'd'].map((id) => ({ file: `r/${id}.md`, count: 1, module: id, entry_state: 'OPEN' }));
  const go = (config) => {
    const root = makeRepo(config ? { 'process/config.json': JSON.stringify(config) } : { 'README.md': 'x' });
    const out = [];
    const calls = [];
    const r = startReady(root, { sessions: file, remote: new Set(), log: (m) => out.push(m), read: () => ({ next, rows: [] }), start: (_, id) => { calls.push(id); return {}; } });
    return { r, out, calls };
  };
  const a = go({ job_cap: 20 });
  assert.deepEqual(a.calls, ['a', 'b'], '20 less the 18 jobs: two starts; roles and the build not counted');
  assert.match(a.out[0], /^ready: 4 startable \(jobs 18, job cap 20\); starting 2, 2 wait for the cap: c, d$/);
  const b = go({ live_cap: 24 });
  assert.deepEqual(b.calls, ['a', 'b', 'c', 'd'], 'live_cap 24 is read as job_cap 24');
  assert.match(b.out.join('\n'), /process\/config\.json: live_cap 24 is read as job_cap \(the cap counts job sessions only\); rename it job_cap/);
  assert.match(b.out.join('\n'), /job cap 24\)/);
  const c = go(null);
  assert.deepEqual(c.calls, ['a', 'b'], 'neither key: default 20');
  assert.doesNotMatch(c.out.join('\n'), /live_cap/);
  assert.throws(() => startReady(makeRepo({ 'README.md': 'x' }), { read: () => ({ next }) }), /--live <n>.*or --sessions <file>/);
});
