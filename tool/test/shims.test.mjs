// Build product-shims (TXT-1, SHM-1, SHM-5): the process lines a product's CLAUDE.md carries, the
// drift check of its shims and hooks against the pin, and the setup script start check runs.
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { approvalsBlock } from '../lib/record.mjs';
import { MAX_LINES, pinOf, setupCheck } from '../lib/setup.mjs';
import { runSetupScript, setupMarker, startCheck } from '../lib/start.mjs';
import { git } from '../lib/util.mjs';
import { commit, makeRepo } from './helpers.mjs';

const quiet = () => {};
const SHIMS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'shims');
const raw = (f) => readFileSync(join(SHIMS, f), 'utf8');
const strip = (t) => t.replace(/\n$/, '');
const PIN = { sha: 'p'.repeat(40), file: (f) => (f.startsWith('shims/') && existsSync(join(SHIMS, f.slice(6))) ? strip(raw(f.slice(6))) : null), list: () => readdirSync(SHIMS) };
const LINES = raw('CLAUDE.process.md').replaceAll('{tranche}', 'tranche');
const HOOKS = JSON.parse(raw('settings.hooks.json')).hooks;
const APPROVALS = '## Standing approvals from Bob\n\nThe owner\'s words.\n';
const FETCH = 'git fetch origin tranche --depth 1 && git checkout --detach FETCH_HEAD && git submodule update --init .process';

// Only the two shim conditions are judged; the rest of the setup is another test's.
function files(over = {}) {
  return {
    'CLAUDE.md': `${APPROVALS}\n${LINES}`,
    '.claude/settings.json': JSON.stringify({ permissions: { deny: [] }, hooks: HOOKS }),
    '.github/workflows/process-gate.yml': PIN.file('shims/process-gate.yml'),
    '.github/workflows/process-record.yml': PIN.file('shims/process-record.yml'),
    'process/config.json': JSON.stringify({ tranche: 'tranche' }),
    ...over,
  };
}
const only = (ids) => ({ conditions: ids.map((id) => ({ id, read: 'x' })) });
const judge = (f, pin = PIN) => {
  const r = setupCheck(makeRepo({ 'README.md': 'x' }), { slug: 'o/r', io: { api: () => null, env: {}, file: (p) => f[p] ?? null, pin }, ...only(['process-lines', 'shim-drift']), log: quiet });
  return Object.fromEntries(r.results.map((x) => [x.id, x]));
};

test('the shim: the pin, the one fetch command, where the role prompt comes from, under its own heading', () => {
  const lines = raw('CLAUDE.process.md').trimEnd().split('\n');
  assert.equal(lines[0], '## Process3');
  assert.ok(lines.some((l) => l.includes('`git ls-tree HEAD .process`')));
  assert.ok(lines.some((l) => l.includes('`git fetch origin {tranche} --depth 1 && git checkout --detach FETCH_HEAD && git submodule update --init .process`')));
  assert.ok(lines.some((l) => /role prompt/.test(l)));
  // A product's whole CLAUDE.md: the approvals, then these lines, which end the approvals block.
  const md = `${APPROVALS}\n${LINES}`;
  assert.equal(approvalsBlock(md, '## Standing approvals from Bob'), APPROVALS.trim());
  assert.ok(md.includes(FETCH));
  assert.ok(lines.length < MAX_LINES);
});

test('process-lines: set with the lines exactly; each gap names the plain pull request BOB makes', () => {
  assert.equal(judge(files())['process-lines'].state, 'set');
  assert.match(judge(files())['process-lines'].detail, /the process lines of the pin pppppppppp, \d+ lines besides the approvals/);
  for (const [what, md] of [
    ['only the approvals (the product today)', APPROVALS],
    ['a line altered', `${APPROVALS}\n${LINES.replace('--depth 1', '--depth 2')}`],
    ['the tranche left as {tranche}', `${APPROVALS}\n${raw('CLAUDE.process.md')}`],
    ['inside the approvals block, under no heading of its own', `${APPROVALS}\n${LINES.replace('## Process3\n', '')}`],
  ]) {
    const r = judge(files({ 'CLAUDE.md': md }))['process-lines'];
    assert.equal(r.state, 'missing', what);
    assert.match(r.detail, /lacks the process lines of the pin pppppppppp exactly: BOB opens a plain pull request into tranche that puts the lines of \.process\/shims\/CLAUDE\.process\.md \(with \{tranche\} as tranche\) in CLAUDE\.md below the approvals block, and changes nothing in the approvals block$/, what);
  }
  // The lines may sit above the approvals too, and other lines may surround them.
  assert.equal(judge(files({ 'CLAUDE.md': `# Product\n\n${LINES}\n${APPROVALS}` }))['process-lines'].state, 'set');
});

test('process-lines: under thirty lines without the approvals block, however long the block is', () => {
  const long = `${APPROVALS}${'More of the owner\'s words.\n'.repeat(60)}`;
  assert.equal(judge(files({ 'CLAUDE.md': `${long}\n${LINES}` }))['process-lines'].state, 'set');
  // The blank line after the block counts: it is not the block's.
  const pad = MAX_LINES - 1 - LINES.trimEnd().split('\n').length;
  const over = judge(files({ 'CLAUDE.md': `${APPROVALS}\n${LINES}${'x\n'.repeat(pad)}` }))['process-lines'];
  assert.equal(over.state, 'missing');
  assert.match(over.detail, new RegExp(`is ${MAX_LINES} lines without the approvals block, not under ${MAX_LINES}: BOB opens a plain pull request into tranche that moves what else it holds to another file`));
  assert.equal(judge(files({ 'CLAUDE.md': `${APPROVALS}\n${LINES}${'x\n'.repeat(pad - 1)}` }))['process-lines'].state, 'set');
});

test('no pin is missing; a pin older than the shim is not configured', () => {
  const r = judge(files(), null);
  assert.equal(r['process-lines'].detail, 'no .process pin on tranche');
  assert.equal(r['shim-drift'].detail, 'no .process pin on tranche');
  const old = { ...PIN, file: (f) => (f === 'shims/CLAUDE.process.md' ? null : PIN.file(f)) };
  assert.equal(judge(files(), old)['process-lines'].state, 'not configured');
});

test('shim-drift: workflows equal the pin\'s shims and only allowed hooks; each gap names its fix', () => {
  const ok = judge(files())['shim-drift'];
  assert.equal(ok.state, 'set', ok.detail);
  assert.match(ok.detail, /process-gate\.yml, process-record\.yml equal the pin pppppppppp's shims; 1 hook\(s\), each allowed/);
  const drift = judge(files({ '.github/workflows/process-gate.yml': PIN.file('shims/process-gate.yml') + '\n# local' }))['shim-drift'];
  assert.equal(drift.state, 'missing');
  assert.match(drift.detail, /^\.github\/workflows\/process-gate\.yml differs from the pin's shim: BOB opens a plain pull request into tranche that copies \.process\/shims\/process-gate\.yml to it$/);
  const f = files();
  delete f['.github/workflows/process-record.yml'];
  assert.match(judge(f)['shim-drift'].detail, /process-record\.yml is absent: BOB opens a plain pull request/);
  // Any other hook fails, and the allowed one moved to another event or matcher does too.
  for (const hooks of [
    { ...HOOKS, PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] }] },
    { Stop: HOOKS.SessionStart },
    { SessionStart: [{ matcher: 'x', hooks: HOOKS.SessionStart[0].hooks }] },
  ]) {
    const r = judge(files({ '.claude/settings.json': JSON.stringify({ hooks }) }))['shim-drift'];
    assert.equal(r.state, 'missing', JSON.stringify(hooks));
    assert.match(r.detail, /hook the pin does not allow .*: the file is the owner's, so Bob removes it through GitHub's website/);
  }
  // No hooks at all is allowed; a settings file that is not JSON is not.
  assert.equal(judge(files({ '.claude/settings.json': '{}' }))['shim-drift'].state, 'set');
  assert.match(judge(files({ '.claude/settings.json': '{' }))['shim-drift'].detail, /not JSON/);
});

test('pinOf: the tranche\'s .process pin, read from the process clone, fetched by its id when absent', () => {
  // The process repository, with its shims at one commit, and a clone of it that lacks that commit.
  const proc = makeRepo({ 'shims/process-gate.yml': 'gate\n', 'shims/CLAUDE.process.md': '## Process3\n' });
  const sha = git(['rev-parse', 'HEAD'], { cwd: proc });
  git(['config', 'uploadpack.allowReachableSHA1InWant', 'true'], { cwd: proc });
  const tool = join(mkdtempSync(join(tmpdir(), 'p3-tool-')), 't');
  git(['init', '-q', tool], { cwd: tmpdir() });
  git(['remote', 'add', 'origin', `file://${proc}`], { cwd: tool });
  // The product: its tranche pins that commit.
  const prod = makeRepo({ 'README.md': 'x' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: prod });
  git(['remote', 'add', 'origin', bare], { cwd: prod });
  git(['update-index', '--add', '--cacheinfo', `160000,${sha},.process`], { cwd: prod });
  git(['commit', '-q', '-m', 'pin'], { cwd: prod });
  git(['push', '-q', 'origin', 'main:tranche'], { cwd: prod });
  git(['fetch', '-q', 'origin'], { cwd: prod });
  const pin = pinOf(prod, 'tranche', tool);
  assert.equal(pin.sha, sha);
  assert.equal(pin.file('shims/process-gate.yml'), 'gate');
  assert.equal(pin.file('shims/none.yml'), null);
  assert.deepEqual(pin.list('shims'), ['CLAUDE.process.md', 'process-gate.yml']);
  // A tranche with no pin.
  const bare2 = makeRepo({ 'README.md': 'x' });
  git(['remote', 'add', 'origin', bare], { cwd: bare2 });
  git(['push', '-q', 'origin', 'main:other'], { cwd: bare2 });
  git(['fetch', '-q', 'origin'], { cwd: bare2 });
  assert.equal(pinOf(bare2, 'other', tool), null);
});

// SHM-5: the product's setup script.
function product(config) {
  const root = makeRepo({ 'CLAUDE.md': APPROVALS, 'process/config.json': JSON.stringify({ tranche: 'tranche', ...config }) });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  return root;
}
const script = (body) => {
  const f = join(mkdtempSync(join(tmpdir(), 'p3-setup-')), 'setup.sh');
  writeFileSync(f, `#!/bin/sh\n${body}\n`);
  chmodSync(f, 0o755);
  return f;
};

test('setup script: none by default; start check runs it once per container, and only with setup', () => {
  const none = product({});
  assert.deepEqual(runSetupScript(none, { log: quiet }), { ok: true, ran: false });
  const count = join(mkdtempSync(join(tmpdir(), 'p3-count-')), 'n');
  const s = script(`echo run >> "${count}"; echo "in $(pwd)"`);
  const root = product({ setup_script: ['sh', s] });
  // The setup check's own start check (setup false) runs nothing.
  assert.equal(startCheck(root, { branch: 'tranche', log: quiet }).ok, true);
  assert.equal(existsSync(count), false);
  const out = [];
  const r = startCheck(root, { branch: 'tranche', setup: true, log: (m) => out.push(m) });
  assert.equal(r.ok, true);
  assert.equal(r.setup.ran, true);
  assert.ok(out.some((l) => /^setup script: ok/.test(l)), out.join('\n'));
  assert.equal(out.at(-1), 'start check: ok');
  assert.equal(readFileSync(count, 'utf8'), 'run\n');
  // The marker lives under .git, not in the tree.
  assert.ok(setupMarker(root).includes(`${join('.git', 'p3-setup-done')}`));
  assert.equal(git(['status', '--porcelain'], { cwd: root }), '');
  const again = [];
  assert.equal(startCheck(root, { branch: 'tranche', setup: true, log: (m) => again.push(m) }).setup.ran, false);
  assert.ok(again.includes('setup script: already run in this container'));
  assert.equal(readFileSync(count, 'utf8'), 'run\n');
});

test('setup script: a failure stops start check with its last lines and writes no marker; a timeout says so', () => {
  const s = script('i=1; while [ $i -le 30 ]; do echo "line $i"; i=$((i+1)); done; echo boom >&2; exit 3');
  const root = product({ setup_script: ['sh', s] });
  const out = [];
  const r = startCheck(root, { branch: 'tranche', setup: true, log: (m) => out.push(m) });
  assert.equal(r.ok, false);
  const text = out.join('\n');
  assert.match(text, /setup script: FAILED \(exit 3\); its last lines:/);
  assert.match(text, /line 30\nboom/);
  assert.doesNotMatch(text, /line 10\n/);
  assert.match(out.at(-1), /^start check: FAILED \(the setup script failed\): act on nothing/);
  assert.equal(existsSync(setupMarker(root)), false);
  // A timeout, through the runner the tool uses.
  const slow = product({ setup_script: ['x'], setup_timeout_minutes: 0.001 });
  const t = runSetupScript(slow, { log: quiet, exec: (cmd, args, o) => { assert.equal(o.timeout, 60); return { code: 1, stdout: 'started', stderr: 'Error: spawnSync x ETIMEDOUT', seconds: 0 }; } });
  // And the real runner's timeout, end to end.
  const real = runSetupScript(product({ setup_script: ['sh', script('sleep 5')], setup_timeout_minutes: 0.005 }), { log: quiet });
  assert.deepEqual(real, { ok: false, ran: true, timedOut: true });
  assert.deepEqual(t, { ok: false, ran: true, timedOut: true });
  const tout = [];
  runSetupScript(slow, { log: (m) => tout.push(m), exec: () => ({ code: 1, stdout: '', stderr: 'Error: spawnSync x ETIMEDOUT', seconds: 0 }) });
  assert.match(tout.join('\n'), /timed out after 0\.001 minutes/);
  // A script that fails on its own and prints ETIMEDOUT (a network error) is its exit, not a timeout.
  const own = runSetupScript(slow, { log: quiet, exec: () => ({ code: 1, stdout: '', stderr: 'npm ERR! ETIMEDOUT\n', seconds: 0 }) });
  assert.equal(own.timedOut, false);
});

test('setup script: a stale start runs nothing; a bad setup_script is refused', () => {
  const count = join(mkdtempSync(join(tmpdir(), 'p3-count-')), 'n');
  const root = product({ setup_script: ['sh', script(`echo run >> "${count}"`)] });
  commit(root, { 'local.txt': 'x' });
  assert.equal(startCheck(root, { branch: 'tranche', setup: true, log: quiet }).ok, false);
  assert.equal(existsSync(count), false);
  for (const bad of ['sh setup.sh', [], [''], [1]]) assert.throws(() => runSetupScript(product({ setup_script: bad }), { log: quiet }), /setup_script is not a command/);
  assert.throws(() => runSetupScript(product({ setup_script: ['true'], setup_timeout_minutes: 0 }), { log: quiet }), /setup_timeout_minutes/);
});
