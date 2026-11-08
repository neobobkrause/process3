import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRepo, entry, openPassed, setJobCap } from './helpers.mjs';
import { capCheck } from '../lib/cap.mjs';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { nextWork } from '../lib/status.mjs';
import { fail, git, jobCap } from '../lib/util.mjs';
import { status } from '../lib/status.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const quiet = () => {};
const unmet = (n) => Array.from({ length: n }, (_, i) => `- **R${i + 1}** *(not yet met: x)* text`).join('\n') + '\n';

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
  const next = nextWork(root, { requirements_dir: 'build/requirements', layers_file: 'none.md', requirements_cap: 1e6 }, rows, null, { log: (m) => out.push(m), state: null });
  assert.deepEqual(next.map((x) => [x.file, x.module, x.entry_state]), [['build/requirements/a.md', 'a', 'OPEN']]);
  assert.match(out.join('\n'), /build\/requirements\/a\.md: 2; entry OPEN, never started: node \.process\/tool\/p3\.mjs layer jobs <n> lists its start/);
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

// The copy, 4 Nov: publication and case-authoring, entries merged 11:44:06, layer 8 with the open
// layer 4 and providers with unmet marks, were neither layer work, ready by uses nor notice work:
// listed nowhere, so job start --ready at the merges of 11:52 to 12:05 never started them.
test('status --role bob: an OPEN entry BOB wrote in a later layer than the open one is owed to its layer, not listed as work', () => {
  const root = makeRepo({
    'build/layers.md': '| Layer | Modules |\n|---|---|\n| 1 | `base` |\n| 2 | `prov` |\n| 3 | `pub`, `later` |\n',
    'process/modules.json': JSON.stringify({ modules: [{ id: 'base', paths: ['src/base/'], uses: [] }, { id: 'prov', paths: ['src/prov/'], uses: [] }, { id: 'pub', paths: ['src/pub/'], uses: ['prov'] }, { id: 'later', paths: ['src/later/'], uses: ['prov'] }] }),
    'process/config.json': JSON.stringify({ modules_file: 'process/modules.json' }),
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
  assert.deepEqual(r.next.filter((x) => x.module).map((x) => [x.module, x.entry_state, x.owed_layer]), [['pub', 'OPEN', 3]]);
  // The layer flow starts it from layer 3's list once it opens (the coordinator's ruling, 6 Nov).
  assert.match(out.join('\n'), /owed to their own layers [^\n]*:\n(- [^\n]*\n)*- build\/requirements\/pub\.md: 3 \(layer 3\): owed to layer 3/);
  assert.doesNotMatch(out.join('\n'), /entered, never started/);
});

// The job cap (Bob, 4 Nov): the account's job sessions only, every product, against P3_JOB_CAP, default 20.
test('job cap: on the live shape (4 roles, 1 build, 18 jobs of two products), the cap counts the 18 jobs against the default 20; P3_JOB_CAP read; a product live_cap ignored', (t) => {
  const s = (id, title) => ({ id, title, session_status: 'SESSION_STATUS_RUNNING' });
  // Two products' jobs (list_sessions is account-scoped): both count.
  const listed = [s('session_ROOT', 'ROOT'), s('session_BOB', 'BOB'), s('session_W', 'watcher'), s('session_C', 'coordinator'), s('session_b', 'build job-cap'),
    ...Array.from({ length: 10 }, (_, i) => s(`session_p${i}`, `job copy-m${i}`)), ...Array.from({ length: 8 }, (_, i) => s(`session_q${i}`, i % 2 ? `job probe-m${i}` : `job probe-m${i} (restart)`)),
    { ...s('session_old', 'job old'), session_status: 'SESSION_STATUS_ARCHIVED' }];
  const file = join(mkdtempSync(join(tmpdir(), 'p3-sessions-')), 's.json');
  writeFileSync(file, JSON.stringify({ ccr: { data: listed } }));
  const go = (cap, config) => {
    setJobCap(t, cap);
    const root = makeRepo(config ? { 'process/config.json': JSON.stringify(config) } : { 'README.md': 'x' });
    return capCheck(root, { sessions: file });
  };
  assert.deepEqual(go(undefined), { n: 18, working: 18, free: [], resumed: [], cap: 20, held: 0 }, 'unset: 20; the 18 jobs counted, roles and the build not');
  assert.throws(() => go(18), /the job cap is full: 18 job sessions working of the cap 18 \(18 live\); nothing was started/);
  assert.equal(go(21, { live_cap: 24 }).cap, 21, 'P3_JOB_CAP 21 read; the product live_cap 24 ignored');
  for (const bad of ['0', '-3', 'many', '2.5', '1e1']) {
    setJobCap(t, bad);
    assert.throws(() => jobCap({}), new RegExp(`P3_JOB_CAP="${bad.replace('.', '\\.')}"`));
  }
  setJobCap(t, 12);
  assert.deepEqual([jobCap({}).cap, jobCap({}).line], [12, 'job cap 12 (P3_JOB_CAP)']);
  setJobCap(t, undefined);
  assert.deepEqual([jobCap({}).cap, jobCap({}).line], [20, 'job cap 20 (default)']);
  assert.throws(() => capCheck(makeRepo({ 'README.md': 'x' }), {}), /job start <id> --sessions <file>/);
});

// One source of truth: no file of the tool but util.mjs reads the cap, its variable, or the old key, or writes the default.
test('job cap: jobCap is the only place the cap is read', () => {
  const dir = new URL('../lib/', import.meta.url);
  const files = [...readdirSync(dir).filter((f) => f.endsWith('.mjs') && f !== 'util.mjs').map((f) => `lib/${f}`), 'p3.mjs'];
  for (const f of files) {
    const text = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    for (const bad of [/\blive_cap\b/, /P3_JOB_CAP/, /\.job_cap\b/, /\bjob_cap\s*[:=]\s*\d/, /\bcap\w*\s*[:=]\s*\d/i, /[?|]{2}\s*\d+\b[^\n]*cap|cap[^\n]*[?|]{2}\s*\d/i, /default 20/]) assert.doesNotMatch(text, bad, `${f} reads the cap itself (${bad}); call jobCap in util.mjs`);
    // The old count's wording: the cap counts job sessions, never every role's (review: BOB's prompt said so).
    assert.doesNotMatch(text, /live sessions[^.]*every role/, `${f} tells a role to count every session for the cap`);
  }
  assert.doesNotMatch(readFileSync(new URL('../../README.md', import.meta.url), 'utf8'), /live sessions[^.]*every role|live_cap. \(default/);
});
