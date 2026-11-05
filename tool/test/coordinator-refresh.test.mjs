// ROOT refreshes the coordinator (Bob, 5 Nov 16:33: "Yes, make the process3 changes so that ROOT
// refreshes the coordinator"): no session starts its own successor, so a refresh no longer nests
// one level deeper. Each held rule below has its test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRepo } from './helpers.mjs';
import { coordinatorOf, coordinatorPrompt, readAddress, recordStart, rootPrompt, startCoordinator, startRole } from '../lib/roles.mjs';
import { withCoordinator } from '../lib/state.mjs';
import { restartActs } from '../lib/switch.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { main } from '../p3.mjs';

const quiet = () => {};
const TOOL = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = 'session_root1';
const C1 = 'session_coord1';
const C2 = 'session_coord2';
const BRANCH = 'start/coordinator-4nov';
const NOTE = 'notes/coordinator-handoff-5nov-h.md';
const there = () => true;

function withOrigin(cfg = { tranche: 'tranche', coordinator: C1 }) {
  const root = makeRepo({ 'README.md': 'x', 'process/config.json': cfg });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  return root;
}
const start = (root, o = {}) => startCoordinator(root, { slug: 'o/copy', processSlug: 'o/process3', address: readAddress(root), replace: C1, branch: BRANCH, handoff: NOTE, onBranch: there, log: quiet, ...o });

test('start coordinator prints one create_session call: process3 alone, from the coordinator\'s branch, a short prompt at the handoff', () => {
  const root = withOrigin();
  recordStart(root, 'root', R, { log: quiet });
  const out = [];
  const { prompt, call } = start(root, { log: (...l) => out.push(l.join(' ')) });
  assert.deepEqual(Object.keys(call).sort(), ['prompt', 'source_revision', 'source_url', 'title']);
  assert.equal(call.source_url, 'https://github.com/o/process3', 'process3 attached only, not the product');
  assert.equal(call.source_revision, BRANCH);
  assert.equal(call.prompt, prompt);
  assert.ok(prompt.includes(`git show origin/${BRANCH}:${NOTE}`), 'it points at the handoff');
  assert.ok(prompt.includes('Bob\'s own words are instructions'));
  assert.ok(prompt.includes(`replacing session \`${C1}\``));
  assert.ok(prompt.includes('Never call create_session for your successor'));
  assert.ok(Buffer.byteLength(prompt) <= 2048, 'short');
  const text = out.join('\n');
  assert.match(text, /\(\d+ bytes\)/, 'the prompt\'s size is printed');
  assert.equal(text.split('create_session with').length - 1, 1, 'one create_session call');
  assert.match(text, /start record coordinator <the new session id>/);
  assert.match(text, new RegExp(`archive ${C1}`));
  // startRole routes the role name to it, as p3 start coordinator does.
  assert.equal(startRole(root, 'coordinator', { slug: 'o/copy', replace: C1, branch: BRANCH, handoff: NOTE, onBranch: there, log: quiet, address: readAddress(root) }).call.source_url.startsWith('https://github.com/'), true);
});

test('start coordinator refuses a second coordinator: --replace must name the one addressed (else the config\'s)', () => {
  const root = withOrigin();
  recordStart(root, 'root', R, { log: quiet });
  assert.throws(() => start(root, { replace: undefined }), /needs --replace <the coordinator's id> \(session_coord1\)/);
  assert.throws(() => start(root, { replace: true }), /needs --replace/);
  assert.throws(() => start(root, { replace: C2 }), /--replace names the coordinator, session_coord1; not session_coord2: one coordinator at a time/);
  // Once ROOT recorded C2, C1 is no longer the one to replace.
  recordStart(root, 'coordinator', C2, { log: quiet });
  assert.throws(() => start(root), /--replace names the coordinator, session_coord2; not session_coord1/);
  assert.equal(start(root, { replace: C2 }).call.source_revision, BRANCH);
  // No coordinator anywhere: nothing to refresh.
  const bare = withOrigin({ tranche: 'tranche' });
  recordStart(bare, 'root', R, { log: quiet });
  assert.throws(() => start(bare), /--replace names the coordinator, none/);
});

test('start coordinator refuses without the handoff pushed on the branch, a bad branch or path, or no ROOT', () => {
  const root = withOrigin();
  assert.throws(() => start(root), /no ROOT is addressed/);
  recordStart(root, 'root', R, { log: quiet });
  const seen = [];
  assert.throws(() => start(root, { onBranch: (b, p) => { seen.push([b, p]); return false; } }), /no notes\/coordinator-handoff-5nov-h\.md on o\/process3's start\/coordinator-4nov: the coordinator pushes its handoff before it asks/);
  assert.deepEqual(seen, [[BRANCH, NOTE]]);
  for (const branch of [undefined, true, '', '-x', 'a..b', 'a b']) assert.throws(() => start(root, { branch }), /--branch/);
  for (const handoff of [undefined, true, '', '/etc/passwd', '../x.md', 'notes/../../x.md']) assert.throws(() => start(root, { handoff }), /--handoff/);
});

test('start record coordinator writes the address; every reader takes it over the config at once', () => {
  const root = withOrigin();
  recordStart(root, 'root', R, { log: quiet });
  const cfg = loadConfig(root);
  assert.equal(coordinatorOf(cfg, readAddress(root)), C1, 'no address yet: the config\'s');
  recordStart(root, 'coordinator', C2, { log: quiet });
  const a = readAddress(root);
  assert.equal(a.coordinator.session, C2);
  assert.equal(a.coordinator.prompt, undefined, 'no prompt refresh for the coordinator');
  assert.equal(coordinatorOf(cfg, a), C2);
  // status, the sweep and the idle check resolve the config this way, from the fetched state branch.
  assert.equal(withCoordinator(root, cfg).coordinator, C2);
  assert.equal(cfg.coordinator, C1, 'the config object itself is untouched');
  // A role's id is not a coordinator.
  assert.throws(() => recordStart(root, 'coordinator', R, { log: quiet }), /is addressed as root/);
  assert.throws(() => recordStart(root, 'coordinator', 'nope', { log: quiet }), /not a session id/);
});

test('p3 address coordinator prints the address, else the config\'s, marked', async () => {
  const run = async (root) => {
    const out = [];
    const [l, cwd] = [console.log, process.cwd()];
    console.log = (...x) => out.push(x.join(' '));
    try { process.chdir(root); return { code: await main(['address', 'coordinator']), out: out.join('\n') }; } finally { process.chdir(cwd); console.log = l; }
  };
  const root = withOrigin();
  let r = await run(root);
  assert.equal(r.code, 0);
  assert.match(r.out, /session_coord1 \(from process\/config\.json\)/);
  recordStart(root, 'coordinator', C2, { log: quiet });
  r = await run(root);
  assert.match(r.out, /^session_coord2 \(since \d{4}-/m);
});

test('the roles read the coordinator by address; ROOT may start and archive a coordinator, only at its ask', () => {
  const p = rootPrompt({ slug: 'o/p', approvals: 'c'.repeat(64) });
  assert.match(p, /the coordinator session the tool's `address coordinator` prints/);
  assert.match(p, /at the coordinator's ask, its `start coordinator` command and the steps it prints/);
  assert.ok(Buffer.byteLength(p) <= 4096, 'one screen');
  assert.match(p, /create no session or task but those above and the MERGER the sweep prints/);
  assert.match(p, /archive only an old BOB or coordinator and what sweep prints/);
  assert.match(p, /send a technical question \(a fix, a restart, a route\) to the coordinator with send_message/);
  const c = coordinatorPrompt({ slug: 'o/copy', processSlug: 'o/process3', rootId: R, old: C1, branch: BRANCH, handoff: NOTE });
  assert.match(c, /send ROOT one message asking for your refresh: `start coordinator --replace <your id> --branch start\/coordinator-4nov --handoff <its path>`/);
});

test('the rule lives where the coordinator and ROOT read it: README guidance, the CLAUDE.md shim, root.md principle 1', () => {
  const readme = readFileSync(join(TOOL, 'README.md'), 'utf8');
  const guide = readme.slice(readme.indexOf('## Coordinator guidance'), readme.indexOf('## The job cap'));
  assert.match(guide, /Never start your own successor[^\n]*send ROOT one message asking for your refresh with `start coordinator --replace <your id>/);
  const shim = readFileSync(join(TOOL, 'shims', 'CLAUDE.process.md'), 'utf8');
  assert.match(shim, /No session starts its own successor: ROOT starts a new BOB \(the handover\) and a new coordinator \(`start coordinator`/);
  const rb = readFileSync(join(TOOL, 'rulebooks', 'root.md'), 'utf8');
  const p1 = rb.split('\n').find((l) => l.startsWith('1. No session starts its own successor'));
  assert.match(p1, /a new coordinator only from you, at its ask/);
  assert.match(p1, /Held by `start bob` and `start record bob`[^.]*, and `start coordinator`/);
  // Ten-rule cap: principles and rules together.
  assert.ok(rb.split('\n').filter((l) => /^\d+\. /.test(l)).length <= 10);
});

test('switch in repoints a stale coordinator address to the new account\'s coordinator', () => {
  const m = { addresses: {}, tasks: [], jobs: [], messages: [] };
  const cfg = { tranche: 'tranche', coordinator: 'session_new' };
  const stale = restartActs(m, { by: 'session_new', cfg, approvals: 'c'.repeat(64), addresses: { coordinator: { session: C1 } } });
  assert.ok(stale.some((l) => l.includes('`node .process/tool/p3.mjs start record coordinator session_new`: the coordinator address names session_coord1')));
  const same = restartActs(m, { by: C1, cfg, approvals: 'c'.repeat(64), addresses: { coordinator: { session: C1 } } });
  assert.ok(!same.some((l) => l.includes('start record coordinator')));
});
