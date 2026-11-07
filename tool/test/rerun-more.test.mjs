// Recovery after a governor refusal, the rest of the multi-step commands (R17d, item 3; Bob, 6 Nov:
// when an operation is delayed and then dropped, does the code that dropped it know why and
// recover?). merge --plain, layer publish, layer sync, pin move, tranche open and tranche close.
// For each, a governor refusal is injected at each GitHub step in turn: a gh call through the io
// stand-ins, and a push through the governed git, refused as a stopped account refuses it. A rerun
// of the same command then completes with no duplicate merge, comment, pull request, branch, row
// or state write, and nothing lost. A command that only prints a session's steps prints the same
// steps again. rerun.test.mjs holds the job merge and job sync.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { flowRows, layerOpen, layerPublish, layerSync } from '../lib/layerflow.mjs';
import { mergePlain, processRepo } from '../lib/merge.mjs';
import { REFUSALS_FILE } from '../lib/metrics.mjs';
import { useShared } from '../lib/pace.mjs';
import { pinMove } from '../lib/pin.mjs';
import { WAKES_FILE, fetchState, heldWrites, stateReplay } from '../lib/state.mjs';
import { OPEN_FILE, TRANCHE_CLOSED_FILE, recordOpen, trancheClose, trancheOpen } from '../lib/tranche.mjs';
import { Fail, git } from '../lib/util.mjs';
import { commit, entry, makeRepo, write } from './helpers.mjs';

const REFUSED = 'GitHub budget: 68 of the 80 content-creating requests a minute used account-wide, the target 85% (68): acts on GitHub wait until 2026-11-06T23:59:00Z (16 min); then rerun `node .process/tool/p3.mjs <the command>`';
// Every push refused, as a stopped account refuses them.
const stopped = { read: () => ({ pause: { at: '2026-11-06T23:00:00Z', until: '2026-11-06T23:01:00Z', why: 'secondary rate limit', stopped: true }, use: [] }), pause: () => null };
const quiet = () => {};
const SB = 'process-state';
const refusal = /GitHub budget/;

// The io stand-ins with the governor's refusal thrown at call `refuseAt` (1-based), once; the
// count runs on across the rerun, as GitHub's state does. Nested objects of stand-ins too.
function refusing(io, refuseAt = 0) {
  const s = { calls: 0, refused: false };
  const wrap = (v) => {
    if (typeof v === 'function') return (...a) => { s.calls++; if (s.calls === refuseAt && !s.refused) { s.refused = true; throw new Fail(REFUSED); } return v(...a); };
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).some((f) => typeof f === 'function') && !v.released) return Object.fromEntries(Object.entries(v).map(([k, f]) => [k, wrap(f)]));
    return v;
  };
  return { s, io: wrap(io) };
}
// Runs f; the refusal's message, or null when it completed.
const attempt = async (f) => { try { await f(); return null; } catch (e) { return e.message; } };
const bareOrigin = (root) => {
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  return bare;
};
const onOrigin = (bare, path) => { const r = git(['show', `${SB}:${path}`], { cwd: bare, allowFail: true }); return r.code === 0 ? r.stdout.split('\n').filter(Boolean) : []; };

// ---- merge --plain --------------------------------------------------------------------------

function plainRepo(files = { 'pin.txt': 'moved' }) {
  const root = makeRepo({ 'README.md': 'x', '.github/workflows/process-gate.yml': 'on: pull_request\n', 'process/config.json': {}, 'process/ledger/alpha.json': entry('alpha') });
  git(['branch', 'tranche'], { cwd: root });
  const bare = bareOrigin(root);
  git(['checkout', '-q', '-b', 'bob/pin', 'tranche'], { cwd: root });
  const sha = commit(root, files);
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche', 'bob/pin'], { cwd: root });
  return { root, bare, sha, head: 'bob/pin' };
}
// GitHub as merge --plain sees it, with state: the merge closes the pull request.
function plainGitHub(r, repo = { released: () => false, shim: () => null, descends: () => false }) {
  const s = { merges: 0 };
  const pr = () => ({ state: s.merges ? 'closed' : 'open', merged: !!s.merges, draft: false, base: { ref: 'tranche', repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: r.head, sha: r.sha, repo: { full_name: 'o/r' } } });
  return {
    s,
    io: {
      getPR: pr,
      requiredChecks: () => ({ checks: [{ context: 'gate' }] }),
      checkRuns: () => [{ id: 1, status: 'completed', conclusion: 'success', started_at: '2026-11-02T10:00:00Z' }],
      repo,
      mergePR: () => { s.merges++; return { merged: true, sha: 'm'.repeat(40) }; },
    },
  };
}
const plainOpts = { slug: 'o/r', noReview: 'a test', log: quiet };

test('merge --plain: refused at each GitHub step in turn, then rerun: one merge; the merge\'s own refusal is said as the refusal, not as an unread reply', async (t) => {
  t.after(() => useShared(null));
  const clean = plainRepo();
  const c = refusing(plainGitHub(clean).io);
  assert.equal(mergePlain(clean.root, 4, { ...plainOpts, io: c.io }).merged, true);
  const steps = c.s.calls;
  assert.ok(steps >= 5, `${steps} GitHub steps`);
  for (let k = 1; k <= steps; k++) {
    const r = plainRepo();
    const g = plainGitHub(r);
    const f = refusing(g.io, k);
    const logs = [];
    const first = await attempt(() => mergePlain(r.root, 4, { ...plainOpts, io: f.io, log: (l) => logs.push(l) }));
    assert.match(String(first), /GitHub budget: .*then rerun/, `step ${k}: the run stops on the refusal and names the rerun`);
    assert.equal(g.s.merges, 0, `step ${k}: nothing merged`);
    assert.doesNotMatch(logs.join('\n'), /could not be read/, `step ${k}: a refusal is not an unread reply`);
    assert.equal(mergePlain(r.root, 4, { ...plainOpts, io: f.io }).merged, true, `step ${k}: the rerun merges`);
    assert.equal(g.s.merges, 1, `step ${k}: one merge`);
  }
});

// process3 at a pin, and a pin move to it with the process's own shim.
function pinMoveRepo() {
  const shim = 'name: process-gate\non: pull_request\n';
  const p = makeRepo({ 'shims/process-gate.yml': shim, 'README.md': 'process3' });
  git(['branch', 'tranche'], { cwd: p });
  bareOrigin(p);
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: p });
  const pin = git(['rev-parse', 'HEAD'], { cwd: p });
  const r = plainRepo();
  git(['checkout', '-q', r.head], { cwd: r.root });
  git(['update-index', '--add', '--cacheinfo', `160000,${pin},.process`], { cwd: r.root });
  write(r.root, { '.github/workflows/process-gate.yml': shim });
  git(['add', '.github/workflows/process-gate.yml'], { cwd: r.root });
  git(['commit', '-q', '-m', 'move the pin and the shim'], { cwd: r.root });
  git(['push', '-q', 'origin', r.head], { cwd: r.root });
  git(['checkout', '-q', 'main'], { cwd: r.root });
  return { ...r, sha: git(['rev-parse', `refs/heads/${r.head}`], { cwd: r.root }), proc: p };
}

test('merge --plain of a pin move: the wake\'s state write refused by a stopped account; the merge stands, the wake is printed once and its record kept, replayed once; a rerun merges nothing again', (t) => {
  t.after(() => useShared(null));
  const r = pinMoveRepo();
  const g = plainGitHub(r, processRepo(r.proc));
  const logs = [];
  useShared(stopped);
  const out = mergePlain(r.root, 4, { ...plainOpts, noReview: 'a pin move', as: 'pin', io: g.io, log: (l) => logs.push(l) });
  useShared(null);
  assert.equal(out.merged, true);
  assert.equal(g.s.merges, 1);
  assert.equal(logs.filter((l) => /^next act: wake BOB/.test(l)).length, 1, 'the wake printed once');
  assert.equal(heldWrites(r.root).length, 1, 'its record kept in this clone, not lost');
  assert.equal(onOrigin(r.bare, WAKES_FILE).length, 0);
  assert.throws(() => mergePlain(r.root, 4, { ...plainOpts, noReview: 'a pin move', as: 'pin', io: g.io, log: quiet }), /pull request 4 is closed/);
  assert.equal(g.s.merges, 1, 'no second merge');
  stateReplay(r.root, SB, [], { log: quiet });
  assert.deepEqual(onOrigin(r.bare, WAKES_FILE).map((l) => JSON.parse(l).row), ['wake', 'printed'], 'recorded once: a later session does not print it again');
  assert.equal(heldWrites(r.root).length, 0);
});

// ---- layer publish and layer sync -------------------------------------------------------------

const modules = { modules: [{ id: 'a', uses: [] }, { id: 'b', uses: ['a'] }, { id: 'c', uses: [] }] };
const layers = '# The layers\n\n| layer | name | modules |\n| --- | --- | --- |\n| 1 | One | a, b, c |\n';
const req = (id) => `# ${id} — requirements\n\n## Public\n\n### Purpose\n\n${id} does things.\n\n### Provides\n\n- ${id}() returns a thing\n\n## Private\n\n### Uses\n\nnothing\n\n**R1** a requirement\n`;
// A layer-flow product on the tranche with a bare origin (layerflow.test.mjs product, trimmed).
function product({ done = false } = {}) {
  const files = { 'process/config.json': { merge_strategy: 'layer', modules_file: 'build/modules.json' }, 'build/layers.md': layers, 'build/modules.json': modules };
  for (const id of ['a', 'b', 'c']) {
    files[`process/ledger/${id}.json`] = entry(id, { layer: 1, ...(done ? { status: { state: 'COMPLETE' } } : {}) });
    files[`req/${id}.md`] = req(id);
    files[`test/${id}/t.test.mjs`] = "import test from 'node:test'; test('ok', () => {});\n";
    files[`src/${id}/index.mjs`] = `export const ${id} = 1;\n`;
  }
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const bare = bareOrigin(root);
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  return { root, bare };
}
function clone(bare) {
  const d = join(mkdtempSync(join(tmpdir(), 'p3-clone-')), 'c');
  git(['clone', '-q', bare, d], { cwd: tmpdir() });
  for (const [k, v] of [['user.email', 'noreply@github.com'], ['user.name', 'Test'], ['commit.gpgsign', 'false']]) git(['config', k, v], { cwd: d });
  return d;
}
function ghMerge(bare, base, head, title) {
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'w', `origin/${base}`], { cwd: d });
  git(['fetch', '-q', 'origin', head], { cwd: d });
  git(['merge', '-q', '--no-ff', '-m', title, head], { cwd: d });
  git(['push', '-q', 'origin', `w:${base}`], { cwd: d });
  return { sha: git(['rev-parse', 'HEAD'], { cwd: d }), merged: true };
}
const openIO = { slug: 'o/p', openPRs: () => [], comments: () => [] };
const runRows = (root) => { fetchState(root, SB, { fresh: true }); return flowRows(root, SB, 1).runs; };

// layer publish's own GitHub acts: its job sync (a stand-in here; job sync's own refusals are
// rerun.test.mjs's) and the run row's state write. Its job complete is job-sync.test.mjs's.
async function publishing() {
  const { root, bare } = product();
  layerOpen(root, 1, { io: openIO, log: quiet });
  const d = clone(bare);
  git(['checkout', '-q', '-B', 'job/c', 'origin/layer/1'], { cwd: d });
  commit(d, { 'src/c/index.mjs': 'export const c = 2;\n' }, 'work on c');
  git(['push', '-q', 'origin', 'job/c'], { cwd: d });
  git(['fetch', '-q', 'origin'], { cwd: root });
  git(['checkout', '-q', '-B', 'job/c', 'origin/job/c'], { cwd: root });
  return { root, bare };
}

test('layer publish: its sync refused, or its run row\'s push refused by a stopped account, then rerun: published, one run row on origin per run, the refused one kept', async (t) => {
  t.after(() => useShared(null));
  for (const at of ['sync', 'row']) {
    const { root } = await publishing();
    let runs = 0;
    const g = refusing({ sync: async () => ({ ok: true }) }, at === 'sync' ? 1 : 0);
    const complete = () => { runs++; if (at === 'row' && runs === 1) useShared(stopped); return { done: Promise.resolve({ code: 0 }), kill() {} }; };
    const first = await attempt(() => layerPublish(root, 'c', { sync: g.io.sync, complete, log: quiet }));
    useShared(null);
    assert.match(String(first), refusal, `${at}: the run stops on the refusal`);
    assert.equal(runs, at === 'sync' ? 0 : 1, `${at}: ${at === 'sync' ? 'nothing ran' : 'the run ran'}`);
    assert.deepEqual(runRows(root), [], `${at}: no row on origin yet`);
    assert.equal(heldWrites(root).length, at === 'row' ? 1 : 0, `${at}: the refused row is kept, not lost`);
    const r = await layerPublish(root, 'c', { sync: g.io.sync, complete, log: quiet });
    assert.equal(r.ok, true, `${at}: the rerun publishes`);
    assert.deepEqual(runRows(root).map((x) => x.result), ['pass'], `${at}: one run row for the rerun's run`);
    if (at === 'row') {
      // The kept row is the first run's own (another file): replayed, each run has its one row.
      stateReplay(root, SB, [], { log: quiet });
      assert.deepEqual(runRows(root).map((x) => x.result), ['pass', 'pass']);
      assert.equal(runs, 2);
    }
  }
});

const setPin = (dir, sha, msg) => { mkdirSync(join(dir, '.process'), { recursive: true }); git(['update-index', '--add', '--cacheinfo', `160000,${sha},.process`], { cwd: dir }); git(['commit', '-q', '-m', msg], { cwd: dir }); return git(['rev-parse', 'HEAD'], { cwd: dir }); };
// A layer open, then a pin move on the tranche: layer sync owed.
function syncOwed() {
  const { root, bare } = product({ done: true });
  setPin(root, git(['rev-parse', 'HEAD'], { cwd: root }), 'pin 1');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  layerOpen(root, 1, { io: openIO, log: quiet });
  setPin(root, git(['rev-parse', 'HEAD'], { cwd: root }), 'pin 2');
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  return { root, bare };
}
// GitHub as layer sync sees it, with state: pull requests made, and merged by GitHub's merge.
function syncGitHub(bare, { stopAfterMerge = false } = {}) {
  const s = { prs: [], merges: 0 };
  const tipOf = (b) => git(['ls-remote', bare, `refs/heads/${b}`], { cwd: tmpdir() }).split('\t')[0];
  return {
    s,
    io: {
      slug: 'o/p',
      findPR: () => null,
      openPRs: (slug, base) => s.prs.filter((p) => p.state === 'open' && p.base.ref === base),
      prsFromBranch: (slug, b) => s.prs.filter((p) => p.head.ref === b),
      createPR: (slug, p) => { const pr = { number: 91 + s.prs.length, state: 'open', draft: p.draft, base: { ref: p.base }, head: { ref: p.head, sha: tipOf(p.head) } }; s.prs.push(pr); return pr; },
      waitForGate: () => ({ status: 'completed', conclusion: 'success' }),
      merge: (slug, k, sha, title) => {
        s.merges++;
        const r = ghMerge(bare, 'layer/1', sha, title);
        s.prs.find((p) => p.number === k).state = 'closed';
        if (stopAfterMerge) useShared(stopped);
        return r;
      },
    },
  };
}
const syncBranches = (bare) => git(['ls-remote', '--heads', bare, 'refs/heads/layer-sync/*'], { cwd: tmpdir() }).split('\n').filter(Boolean);
const syncRows = (root) => { fetchState(root, SB, { fresh: true }); return flowRows(root, SB, 1).syncs; };

test('layer sync: refused at each GitHub step in turn (each gh call, its branch\'s push, its row\'s push), then rerun: one branch, one pull request, one merge, one sync row', async (t) => {
  t.after(() => useShared(null));
  const clean = syncOwed();
  const c = syncGitHub(clean.bare);
  const cr = refusing(c.io);
  assert.equal((await layerSync(clean.root, 1, { io: cr.io, log: quiet })).synced, true);
  const steps = cr.s.calls;
  assert.ok(steps >= 5, `${steps} GitHub steps`);
  // 1..steps: each gh call; then the branch's push, then the row's push, refused by a stopped account.
  for (let k = 1; k <= steps + 2; k++) {
    const { root, bare } = syncOwed();
    const g = syncGitHub(bare, { stopAfterMerge: k === steps + 2 });
    const f = refusing(g.io, k <= steps ? k : 0);
    if (k === steps + 1) useShared(stopped);
    const first = await attempt(() => layerSync(root, 1, { io: f.io, log: quiet }));
    useShared(null);
    assert.match(String(first), refusal, `step ${k}: the run stops on the refusal`);
    const r = await layerSync(root, 1, { io: f.io, log: quiet });
    assert.equal(r.ok, true, `step ${k}: the rerun completes`);
    assert.equal(syncBranches(bare).length, 1, `step ${k}: one sync branch, not a second for a pull request never opened: ${syncBranches(bare).join(', ')}`);
    assert.equal(g.s.prs.length, 1, `step ${k}: one pull request`);
    assert.equal(g.s.merges, 1, `step ${k}: one merge`);
    assert.equal(syncRows(root).length, 1, `step ${k}: one sync row`);
    git(['fetch', '-q', 'origin'], { cwd: root });
    assert.equal(git(['merge-base', '--is-ancestor', 'origin/tranche', 'origin/layer/1'], { cwd: root, allowFail: true }).code, 0, `step ${k}: the layer holds the tranche`);
  }
});

// ---- pin move ---------------------------------------------------------------------------------

// The process repo pinMove reads releases from (pin.test.mjs's), and the product's GitHub with
// one open pin move, PR 106, that --supersedes closes.
const ORIGIN = makeRepo({ 'README.md': 'process' });
git(['branch', '-M', 'tranche'], { cwd: ORIGIN });
const PROC = makeRepo({ 'README.md': 'x' });
git(['remote', 'add', 'origin', ORIGIN], { cwd: PROC });
git(['fetch', '-q', 'origin'], { cwd: PROC });
const PIN = git(['rev-parse', 'origin/tranche'], { cwd: PROC });
const REPORT = 'session_01RAN5eniJPZwnDgHRYfWFQb';
function pinGitHub() {
  const s = { prs: [{ number: 106, state: 'open', head: { ref: 'p3/pin-0123456789' } }], comments: { 106: [] } };
  return {
    s,
    io: {
      list: () => s.prs.filter((p) => p.state === 'open'),
      comments: (slug, n) => s.comments[n],
      comment: (slug, n, body) => { s.comments[n].push({ id: s.comments[n].length + 1, body }); return { id: 1 }; },
      close: (slug, n) => { s.prs.find((p) => p.number === n).state = 'closed'; return { number: n }; },
    },
  };
}

test('pin move --supersedes: refused at each GitHub step in turn, then rerun: one comment, the old move closed, the same session printed', async () => {
  const opts = { pin: PIN, supersedes: '106', processRoot: PROC, report: REPORT, why: 'BOB wakes on events', log: quiet };
  const root = makeRepo({ 'README.md': 'x' });
  const c = refusing(pinGitHub().io);
  const clean = pinMove(root, 'o/r', { ...opts, io: c.io });
  const steps = c.s.calls;
  assert.equal(steps, 4, 'list, comments, comment, close');
  for (let k = 1; k <= steps; k++) {
    const g = pinGitHub();
    const f = refusing(g.io, k);
    const first = await attempt(() => pinMove(root, 'o/r', { ...opts, io: f.io }));
    assert.match(String(first), refusal, `step ${k}`);
    const r = pinMove(root, 'o/r', { ...opts, io: f.io });
    assert.equal(g.s.comments[106].length, 1, `step ${k}: one comment, not one per run`);
    assert.equal(g.s.prs[0].state, 'closed', `step ${k}: closed`);
    assert.deepEqual(r.call, clean.call, `step ${k}: the same session printed`);
  }
});

// ---- tranche open and tranche close ---------------------------------------------------------

function withOrigin(files) {
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  const bare = bareOrigin(root);
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  return { root, bare };
}
const refs = (bare) => git(['for-each-ref', '--format=%(refname) %(objectname)'], { cwd: bare });
// One clock for runs that are compared: a printed step reads it (run_once_at, a day on).
const T0 = Date.parse('2026-11-07T00:00:00Z');
const ACTS = ['push', 'pr-open', 'pr-comment', 'pr-merge', 'session-start', 'session-archive', 'task-create', 'task-delete'];

test('tranche open: no GitHub act of its own (it prints the same steps, with the account stopped and again); --record\'s push refused, then rerun: one row per act, one refusal row', (t) => {
  t.after(() => useShared(null));
  const { root, bare } = withOrigin({ 'README.md': 'x\n' });
  const before = refs(bare);
  const a = trancheOpen(root, { slug: 'o/p', log: quiet, now: () => T0 });
  useShared(stopped);
  const b = trancheOpen(root, { slug: 'o/p', log: quiet, now: () => T0 });
  assert.deepEqual([b.n, b.steps, b.call], [a.n, a.steps, a.call], 'the same steps, the same throwaway branch');
  assert.equal(refs(bare), before, 'nothing pushed');
  // --record: its state write refused; nothing written, nothing counted; the rerun writes each once.
  const recs = [...ACTS.map((x) => `${x}|1|${x === 'session-archive' ? 'refused' : 'ok'}`)];
  assert.throws(() => recordOpen(root, recs, { session: 'bob', log: quiet }), /GitHub budget: .*every GitHub call is stopped/s);
  useShared(null);
  assert.equal(onOrigin(bare, OPEN_FILE).length, 0);
  const refusals = () => { try { return readFileSync(join(root, REFUSALS_FILE), 'utf8').split('\n').filter(Boolean).length; } catch { return 0; } };
  assert.equal(refusals(), 0, 'the refusal row waits for the push');
  recordOpen(root, recs, { session: 'bob', log: quiet });
  assert.equal(onOrigin(bare, OPEN_FILE).length, ACTS.length, 'one row per act');
  assert.equal(refusals(), 1, 'one refusal row');
  assert.equal(heldWrites(root).length, 1, 'the refused write is kept (state replay); the rerun wrote the rows');
});

const LAYERS = '| layer | what | modules |\n|---|---|---|\n| 1 | first | a |\n';
const closeFiles = { 'build/layers.md': LAYERS, 'build/requirements/a.md': '- **R99** met\n', 'process/ledger/a.json': entry('a', { requirements: 'build/requirements/a.md', status: { state: 'COMPLETE' } }) };
const closeIO = () => ({ compare: () => null, status: { openPRs: () => [], checkRun: () => null, compare: () => null } });

test('tranche close: refused at each GitHub read in turn, then rerun: the same steps; --record refused at its read and at its push, then rerun: one close row', async (t) => {
  t.after(() => useShared(null));
  const { root, bare } = withOrigin(closeFiles);
  // main moved: the steps merge it into the tranche first.
  git(['checkout', '-q', 'main'], { cwd: root });
  commit(root, { 'NOTE.md': 'owner edit\n' });
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const c = refusing(closeIO());
  const clean = trancheClose(root, { slug: 'o/p', io: c.io, log: quiet });
  const steps = c.s.calls;
  assert.ok(steps >= 1, `${steps} GitHub reads`);
  for (let k = 1; k <= steps; k++) {
    const f = refusing(closeIO(), k);
    const first = await attempt(() => trancheClose(root, { slug: 'o/p', io: f.io, log: quiet }));
    if (first) assert.match(first, refusal, `step ${k}`);
    assert.deepEqual(trancheClose(root, { slug: 'o/p', io: f.io, log: quiet }).steps, clean.steps, `step ${k}: the same steps`);
  }
  // The tranche on main; --record refused at its compare, then at its push; each rerun once.
  git(['checkout', '-q', 'main'], { cwd: root });
  git(['merge', '-q', '--no-edit', 'tranche'], { cwd: root });
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  const f = refusing(closeIO(), 1);
  assert.match(String(await attempt(() => trancheClose(root, { slug: 'o/p', io: f.io, record: true, log: quiet }))), refusal);
  useShared(stopped);
  assert.throws(() => trancheClose(root, { slug: 'o/p', io: f.io, record: true, log: quiet }), /GitHub budget: .*every GitHub call is stopped/s);
  useShared(null);
  assert.equal(onOrigin(bare, TRANCHE_CLOSED_FILE).length, 0);
  assert.equal(trancheClose(root, { slug: 'o/p', io: f.io, record: true, log: quiet }).ok, true);
  assert.equal(onOrigin(bare, TRANCHE_CLOSED_FILE).length, 1, 'one close row');
  assert.throws(() => trancheClose(root, { slug: 'o/p', io: f.io, record: true, log: quiet }), /already recorded/);
});
