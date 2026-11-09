// setup check at the copy's scale (C50; Bob, 9 Nov: "Let's fix as many of them as we can"). In the
// copy (about 1100 pull requests, 220 modules, a large state branch) `setup check --at HEAD` took
// about 15 minutes, twice a pin move: thousands of git spawns, one per state row, ledger entry,
// approvals commit and module, and a fetch per commit of the approvals history. These tests bound
// the git spawns (not the wall time, which a loaded runner moves) on a fixture at that scale, so a
// read per module, per commit or per row cannot creep back, and rehearse a pin move's two checks
// end to end through the CLI (PD-17).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { setupCheck } from '../lib/setup.mjs';
import { beforeAct, idleCheck } from '../lib/sweep.mjs';
import { ownerBlock } from '../lib/record.mjs';
import { SPAWNS, git, loadConfig } from '../lib/util.mjs';
import { commit, makeRepo } from './helpers.mjs';
import { fakeGh, scaleFixture, stubGitHub } from './scale-fixture.mjs';

const TOOL = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// Every git and gh the tool starts while fn runs, by command.
function counted(fn) {
  const before = { ...SPAWNS.counts };
  let fetch = 0;
  const was = SPAWNS.trace;
  SPAWNS.trace = (cmd, args) => { if (cmd === 'git' && args.includes('fetch')) fetch++; };
  let out;
  try { out = fn(); } finally { SPAWNS.trace = was; }
  const n = (k) => (SPAWNS.counts[k] || 0) - (before[k] || 0);
  return { out, git: n('git'), gh: n('gh'), fetch };
}
const fetches = (log) => (existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter((l) => / fetch /.test(` ${l} `)).length : 0);

// The fixture's pin session: its clone, on a pin-move branch.
function pinSession() {
  const fx = scaleFixture();
  git(['remote', 'set-url', 'origin', `file://${fx.origin}`], { cwd: fx.work });
  git(['checkout', '-q', '-b', 'p3/pin-move'], { cwd: fx.work });
  return fx;
}

test('setup check --at HEAD at the copy\'s scale: its findings, in a bounded number of git spawns', () => {
  const fx = pinSession();
  const gh = stubGitHub(fx);
  const lines = [];
  const io = { api: gh.api, cf: () => ({ status: 200, success: true }), env: { CLOUDFLARE_API_TOKEN: 'x' } };
  const run = () => counted(() => setupCheck(fx.work, { slug: 'o/r', at: 'HEAD', io, log: (l) => lines.push(String(l)) }));
  const first = run();
  // The findings: the approvals' setter found through the shallow clone, the census's gaps.
  assert.match(lines.find((l) => l.includes(': approvals:')), /^- set: approvals: one block, the one neobobkrause's website commit [0-9a-f]{10} set$/);
  assert.equal(first.out.census, fx.noEntry.length);
  assert.ok(lines.includes(`census: ${fx.noEntry.length} gap(s) at ${first.out.at.slice(0, 10)} (no-entry); status --role bob lists the open layer's with their fixes`), lines.join('\n'));
  assert.deepEqual(first.out.missing, ['deny-list']);
  // Measured on this fixture (C50): 661 git spawns before, 102 of them fetches (the approvals'
  // commits one by one, each a round trip to GitHub in a pin session); 124 after, 10 fetches (the
  // approvals history in chunks of 8). The bound leaves room for a few reads, never one per module
  // (60), per approvals commit (50) or per row.
  assert.ok(first.git <= 160, `setup check: ${first.git} git spawns`);
  assert.ok(first.fetch <= 16, `setup check: ${first.fetch} fetches`);
  // The second check of a pin move reads the same.
  lines.length = 0;
  const second = run();
  assert.equal(second.out.census, first.out.census);
  assert.ok(second.git <= 160, `second setup check: ${second.git} git spawns`);
});

test('the idle check BOB\'s commands run first reads the state branch\'s layer rows in a bounded number of git spawns', () => {
  const fx = pinSession();
  const cfg = loadConfig(fx.work);
  const bin = fakeGh(fx, 'o/r');
  const was = { PATH: process.env.PATH, GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY };
  process.env.PATH = `${bin}:${process.env.PATH}`;
  process.env.GITHUB_REPOSITORY = 'o/r';
  try {
    const said = [];
    const r = counted(() => idleCheck(fx.work, cfg, { by: 'setup check', from: 'bob', log: (l) => said.push(l) }));
    // The open layer's view was read (no "unread"), and judged.
    assert.equal(r.out.unread, undefined, JSON.stringify(r.out));
    assert.equal(r.out.live, 4);
    assert.equal(r.out.idle_capacity?.layer, fx.open);
    // Measured on this fixture (C50): 1564 git spawns before (a git show per layer row, two per
    // requirement file, one per ledger entry); about 300 to 400 after with git 2.43, 502 on CI's git
    // 2.56, most of them a shallow clone's ancestry asks and their settling.
    assert.ok(r.git <= 700, `idle check: ${r.git} git spawns`);
  } finally {
    process.env.PATH = was.PATH;
    if (was.GITHUB_REPOSITORY === undefined) delete process.env.GITHUB_REPOSITORY; else process.env.GITHUB_REPOSITORY = was.GITHUB_REPOSITORY;
  }
});

// PD-17: a pin move's two setup checks, end to end: the CLI as a pin session runs it, from the
// product's .process, with the idle check before it and the GitHub ledger after it, git counted.
test('rehearsal: a pin move\'s two `setup check --at HEAD` runs at the copy\'s scale', () => {
  const fx = pinSession();
  // .process as a product's is: a clone holding the pin commit (never a link: git 2.56 refuses a
  // fetch while a submodule path is a symbolic link), with this checkout's tool files laid over it so
  // the code under test is what runs.
  const proc = join(fx.work, '.process');
  rmSync(proc, { recursive: true, force: true });
  git(['clone', '-q', '--shared', '--no-checkout', TOOL, proc], { cwd: fx.work });
  git(['checkout', '-q', '--detach', fx.pin], { cwd: proc });
  for (const d of ['tool', 'shims', 'setup']) cpSync(join(TOOL, d), join(proc, d), { recursive: true });
  const bin = fakeGh(fx, 'o/r');
  const log = join(fx.dir, 'git.log');
  // A git that logs its arguments, then runs the real one.
  const real = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim();
  writeFileSync(join(bin, 'git'), `#!/bin/sh\nprintf '%s\\n' "$*" >> '${log}'\nexec '${real}' "$@"\n`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_REPOSITORY: 'o/r', P3_GH_INTERVAL_MS: '0' };
  // As a session runs it: the idle check before, the ledger share after (neither runs under the test
  // runner or in GitHub Actions, where CI runs this test).
  delete env.NODE_TEST_CONTEXT;
  delete env.GITHUB_ACTIONS;
  const runs = [];
  for (let k = 0; k < 2; k++) {
    writeFileSync(log, '');
    const r = spawnSync('node', ['.process/tool/p3.mjs', 'setup', 'check', '--at', 'HEAD'], { cwd: fx.work, encoding: 'utf8', env, timeout: 300e3 });
    const spawns = readFileSync(log, 'utf8').split('\n').filter(Boolean).length;
    runs.push({ code: r.status, out: r.stdout + r.stderr, spawns, fetches: fetches(log) });
    appendFileSync(join(fx.dir, 'runs.log'), `${k}: ${spawns} git, ${fetches(log)} fetches\n`);
  }
  for (const [k, r] of runs.entries()) {
    // Exit 1: the fixture's deny list lacks rules (a missing condition), as the in-process test reads.
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /- missing: deny-list:/);
    assert.match(r.out, /- set: approvals: one block/);
    assert.match(r.out, /census: \d+ gap\(s\) at [0-9a-f]{10} \(no-entry\)/);
    // Measured (C50): the first check 2172 git spawns before (BOB's idle check ran before it, the pin
    // session taken for BOB), 135 after; the second 459 before, 112 after; 10 and 2 fetches after.
    assert.ok(r.spawns <= 250, `check ${k + 1}: ${r.spawns} git spawns`);
    assert.ok(r.fetches <= 30, `check ${k + 1}: ${r.fetches} fetches`);
  }
  // A pin session's setup check runs no idle check, though the sweep's live count is 20 minutes old
  // and a layer is open (coordinator on C50: the idle check is BOB's alone).
  for (const r of runs) assert.doesNotMatch(r.out, /IDLE CAPACITY|idle check not run/);
});

// Coordinator on C50, 9 Nov: "The idle check is BOB's alone." beforeAct runs it only when the
// command's sender is BOB, known by --as or by this session's address; a pin move's commands never.
test('the idle check before a command runs for BOB\'s commands only: never a pin move\'s, never an unknown sender\'s', () => {
  const fx = pinSession();
  const cfg = loadConfig(fx.work);
  const bin = fakeGh(fx, 'o/r');
  const was = { PATH: process.env.PATH, GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY, S: process.env.CLAUDE_CODE_REMOTE_SESSION_ID };
  process.env.PATH = `${bin}:${process.env.PATH}`;
  process.env.GITHUB_REPOSITORY = 'o/r';
  const as = (session) => { if (session) process.env.CLAUDE_CODE_REMOTE_SESSION_ID = session; else delete process.env.CLAUDE_CODE_REMOTE_SESSION_ID; };
  const before = (name, a = {}) => beforeAct(fx.work, cfg, name, { _: [], ...a }, { env: {}, log: () => {}, err: (m) => assert.fail(m) });
  try {
    // Skipped, each before any read of the open layer: no session id (the sender unknown), a
    // session no role is addressed to, a pin move's commands even from BOB's session, --as pin.
    as(null);
    assert.equal(before('merge'), null);
    as('session_someone_else');
    assert.equal(before('merge'), null);
    as('session_bob');
    assert.equal(before('setup check'), null);
    assert.equal(before('pin check'), null);
    assert.equal(before('merge', { as: 'pin' }), null);
    // BOB's own command (its session's address, or --as bob): the check runs and judges the layer.
    const row = before('merge');
    assert.equal(row?.row, 'check');
    assert.equal(row.idle_capacity?.layer, fx.open);
  } finally {
    process.env.PATH = was.PATH;
    if (was.GITHUB_REPOSITORY === undefined) delete process.env.GITHUB_REPOSITORY; else process.env.GITHUB_REPOSITORY = was.GITHUB_REPOSITORY;
    as(was.S);
  }
});

// A block set by the root commit (C50: a root commit's empty %P read as a parent '', whose "file" was
// the index's copy, the tip's block, so the root was never taken as its setter).
test('the approvals block set by the root commit is found as set by it', () => {
  const r = makeRepo({ 'CLAUDE.md': '## Standing approvals from Bob\n\nThe owner\'s words.\n' });
  const first = git(['rev-parse', 'HEAD'], { cwd: r });
  commit(r, { 'README.md': 'x' }, 'later');
  const asked = [];
  const top = ownerBlock(r, ['HEAD'], 'CLAUDE.md', '## Standing approvals from Bob', (sha) => { asked.push(sha); return { ok: true }; });
  assert.equal(top?.sha, first);
  assert.deepEqual(asked, [first]);
});
