// ROOT refreshes the coordinator (Bob, 5 Nov 16:33: "Yes, make the process3 changes so that ROOT
// refreshes the coordinator"): no session starts its own successor, so a refresh no longer nests
// one level deeper. Each held rule below has its test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_ENTRY, commit, makeRepo, processRegisterFixture } from './helpers.mjs';
import { coordinatorOf, coordinatorPrompt, readAddress, recordStart, rootPrompt, startCoordinator, startRole } from '../lib/roles.mjs';
import { withCoordinator } from '../lib/state.mjs';
import { STANDING_HEAD, promptBody } from '../lib/register.mjs';

processRegisterFixture([SEED_ENTRY]);
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
  assert.ok(Buffer.byteLength(promptBody(prompt)) <= 2048, 'short');
  assert.ok(prompt.includes(STANDING_HEAD), 'the fixture entry names the coordinator');
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
  recordStart(root, 'coordinator', C2, { log: quiet, session: R });
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
  recordStart(root, 'coordinator', C2, { log: quiet, session: R });
  const a = readAddress(root);
  assert.equal(a.coordinator.session, C2);
  assert.equal(a.coordinator.prompt, undefined, 'no prompt refresh for the coordinator');
  assert.equal(coordinatorOf(cfg, a), C2);
  // status, the sweep and the idle check resolve the config this way, from the fetched state branch.
  assert.equal(withCoordinator(root, cfg).coordinator, C2);
  assert.equal(cfg.coordinator, C1, 'the config object itself is untouched');
  // A role's id is not a coordinator.
  assert.throws(() => recordStart(root, 'coordinator', R, { log: quiet, session: R }), /is addressed as root/);
  assert.throws(() => recordStart(root, 'coordinator', 'nope', { log: quiet, session: R }), /not a session id/);
});

test('start record coordinator is ROOT\'s act, or the coordinator\'s own once the tranche\'s config names it', () => {
  const root = withOrigin();
  recordStart(root, 'root', R, { log: quiet });
  // A job (any other session) cannot make itself the coordinator.
  assert.throws(() => recordStart(root, 'coordinator', 'session_job1', { log: quiet, session: 'session_job1' }), /start record coordinator is ROOT's act \(session_root1\), or the coordinator's own once process\/config\.json on the tranche names it; not session_job1's/);
  assert.throws(() => recordStart(root, 'coordinator', C2, { log: quiet, session: C2 }), /ROOT's act/, 'the config names C1, not C2');
  assert.equal(readAddress(root).coordinator, undefined, 'nothing written');
  // The config on the tranche names C2 (a gated merge): C2 may record itself.
  commit(root, { 'process/config.json': { tranche: 'tranche', coordinator: C2 } }, 'coordinator C2');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  recordStart(root, 'coordinator', C2, { log: quiet, session: C2 });
  assert.equal(readAddress(root).coordinator.session, C2);
  assert.throws(() => recordStart(root, 'coordinator', 'session_coord3', { log: quiet, session: C2 }), /ROOT's act/, 'the coordinator records only itself');
});

test('an unreadable coordinator address is none: the config\'s, and every other address still reads', () => {
  const root = withOrigin();
  recordStart(root, 'root', R, { log: quiet });
  const other = join(mkdtempSync(join(tmpdir(), 'p3-clone-')), 'c');
  git(['clone', '-q', '-b', 'process-state', git(['remote', 'get-url', 'origin'], { cwd: root }), other], { cwd: root });
  for (const [k, v] of [['user.email', 't@t'], ['user.name', 'T']]) git(['config', k, v], { cwd: other });
  commit(other, { 'addresses/coordinator.json': '{ not json' }, 'bad');
  git(['push', '-q', 'origin', 'process-state'], { cwd: other });
  const a = readAddress(root);
  assert.equal(a.root.session, R);
  assert.equal(a.coordinator, undefined);
  assert.equal(coordinatorOf(loadConfig(root), a), C1);
  assert.equal(withCoordinator(root, loadConfig(root)).coordinator, C1);
});

test('p3 address coordinator prints the address, else the config\'s, marked', async () => {
  const run = async (root) => {
    const out = [];
    const [l, cwd] = [console.log, process.cwd()];
    console.log = (...x) => out.push(x.join(' '));
    try { process.chdir(root); return { code: await main(['address', 'coordinator']), out: out.join('\n') }; } finally { process.chdir(cwd); console.log = l; }
  };
  const root = withOrigin();
  // The tranche's tip config, not the working tree's (a session on an old checkout).
  writeFileSync(join(root, 'process/config.json'), JSON.stringify({ tranche: 'tranche', coordinator: 'session_stale' }));
  let r = await run(root);
  assert.equal(r.code, 0);
  assert.match(r.out, /^session_coord1 \(from process\/config\.json on the tranche\)/m);
  git(['checkout', '-q', '--', 'process/config.json'], { cwd: root });
  recordStart(root, 'root', R, { log: quiet });
  recordStart(root, 'coordinator', C2, { log: quiet, session: R });
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
  assert.match(c, /ROOT records you as the coordinator address \(`start record coordinator`\)/);
  assert.match(c, /On each other product you hold \(the probe\), set your id as `coordinator` in its process\/config\.json by a plain pull request/);
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

test('switch in: a stale coordinator address is repointed by the new coordinator itself, once the config names it', () => {
  const m = { addresses: {}, tasks: [], jobs: [], messages: [] };
  const A = 'c'.repeat(64);
  const stale = { coordinator: { session: C1 } };
  const lines = (by, cfg, addresses) => restartActs(m, { by, cfg: { tranche: 'tranche', ...cfg }, approvals: A, addresses });
  const a = (L) => L.find((l) => l.startsWith('(a)'));
  // Config not yet the new one: the config PR, then the record, by the coordinator itself (ROOT would read its ask as data).
  assert.match(a(lines(C2, { coordinator: C1 }, stale)), /set "coordinator": "session_coord2"[^\n]*Then `node \.process\/tool\/p3\.mjs start record coordinator session_coord2`, yourself: the coordinator address names session_coord1/);
  // Config already names it: only the record.
  assert.match(a(lines(C2, { coordinator: C2 }, stale)), /^\(a\) The coordinator id: session_coord2 is `coordinator` in process\/config\.json on tranche; then `node \.process\/tool\/p3\.mjs start record coordinator session_coord2`, yourself/);
  // The address names it: nothing to do, whatever the config says.
  assert.match(a(lines(C1, { coordinator: 'session_old' }, stale)), /session_coord1 is already the coordinator/);
  // No address: as before.
  assert.ok(!lines(C2, { coordinator: C1 }, {}).some((l) => l.includes('start record coordinator')));
  assert.ok(!lines(C2, { coordinator: C1 }, {}).some((l) => /^\s+- .*start record coordinator/.test(l)), 'nothing sent to ROOT for it');
});
