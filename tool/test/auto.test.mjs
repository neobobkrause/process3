// The starter (Bob, 5 Nov: "Why do you have to order BOB to start jobs?"): the MERGER's second
// background loop makes every ready start with no session's judgment; status measures the minutes
// from starts owed to started.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commit, makeRepo, setJobCap } from './helpers.mjs';
import { AUTO, AUTO_FILE, STARTS_FILE, owe, owes, readAuto, startsOwedLine } from '../lib/hold.mjs';
import { EXIT, actsBlock, autoDone, autoLoop, autoStart, due, reconcile, startsMeasure, starterLines } from '../lib/auto.mjs';
import { startReady } from '../lib/ready.mjs';
import { bobPrompt, mergerPrompt } from '../lib/roles.mjs';
import { jsonl, readState, writeState } from '../lib/state.mjs';
import { git } from '../lib/util.mjs';

const quiet = () => {};
const SB = 'process-state';
const M = 'session_merger1';
const ago = (min) => new Date(Date.now() - min * 6e4).toISOString().replace(/\.\d+Z$/, 'Z');
const H = 'a'.repeat(64);

function withOrigin(files = {}) {
  const root = makeRepo({ 'README.md': 'x', 'process/config.json': { tranche: 'tranche', coordinator: 'session_coord1' }, ...files });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  return root;
}
const tmpFile = () => join(mkdtempSync(join(tmpdir(), 'p3-sessions-')), 's.json');
// The loop's injected parts: the MERGER answers the ask at once with these sessions.
const fakes = (listed, ready, extra = {}) => {
  const sent = [];
  return {
    sent,
    opts: {
      session: M, anyClone: true, rounds: 1, idleEvery: 0, pin: () => 'none', sessionsFile: tmpFile(),
      waitFor: (f) => { writeFileSync(f, JSON.stringify(listed)); return true; },
      ready, open: () => ({ state: 'open' }), send: (_, __, m) => { sent.push(m); return { n: 1 }; }, ...extra,
    },
  };
};

test('due: starts owed, a live hold expired since the last pass, or no pass for AUTO.every; never within AUTO.gap', () => {
  const t = Date.now();
  assert.match(due({ owed: { since: ago(2) }, auto: null, t }), /^starts owed since/);
  assert.equal(due({ owed: null, auto: { at: ago(1) }, t }), null);
  assert.equal(due({ owed: { since: ago(2) }, auto: { at: ago(1) }, t }), null, 'within the gap after a pass');
  assert.match(due({ owed: { since: ago(2) }, auto: { at: ago(AUTO.gap + 1) }, t }), /^starts owed/);
  assert.equal(due({ owed: null, auto: { at: ago(AUTO.gap + 1) }, t }), null);
  assert.match(due({ owed: null, auto: { at: ago(AUTO.gap + 2) }, holds: [{ id: 'hold-1', scope: 'slots:3', until: ago(1), ended: null }], t }), /^hold-1 \(slots:3\) expired$/);
  assert.equal(due({ owed: null, auto: { at: ago(AUTO.gap + 2) }, holds: [{ id: 'hold-1', scope: 'slots:3', until: ago(1), ended: { id: 'hold-1' } }], t }), null, 'an ended hold was owed at its end');
  assert.match(due({ owed: null, auto: { at: ago(AUTO.every + 1) }, t }), /^no pass for \d+ min$/);
  assert.equal(due({ owed: null, auto: null, t }), 'the first pass');
  assert.equal(due({ owed: { since: ago(2) }, auto: null, t, quietUntil: t + 1000 }), null);
});

test('reconcile: a pending launch is created when a session titled "job <id>" is listed, made after the launch', () => {
  const pending = [{ id: 'a', at: ago(5), owed_since: ago(9) }, { id: 'b', at: ago(5) }];
  const listed = [
    { id: 'session_old', title: 'job b', created_at: ago(60) }, // an earlier attempt's
    { id: 'session_a1', title: 'job a', created_at: ago(4) },
  ];
  const r = reconcile(pending, listed);
  assert.deepEqual(r.created.map((x) => [x.id, x.session]), [['a', 'session_a1']]);
  assert.deepEqual(r.still.map((x) => x.id), ['b']);
});

test('reconcile: a session with no created_at is never the launch\'s; a restart\'s session (BOB\'s) clears it', () => {
  const pending = [{ id: 'a', at: ago(5) }, { id: 'b', at: ago(5), printed_at: ago(30) }, { id: 'c', at: ago(5) }];
  const listed = [
    { id: 'session_a0', title: 'job a', updated_at: ago(1) },
    { id: 'session_b1', title: 'job b', created_at: ago(20) }, // after its first print, before the reprint
    { id: 'session_c2', title: 'job c (restart)', created_at: ago(2) },
  ];
  const r = reconcile(pending, listed);
  assert.deepEqual(r.created.map((x) => [x.id, x.session]), [['b', 'session_b1'], ['c', 'session_c2']]);
  assert.deepEqual(r.still.map((x) => x.id), ['a']);
});

test('the starter: an auto done during the wait for list_sessions stands; the pass records no second created row for it', (t) => {
  setJobCap(t, 20);
  const root = withOrigin();
  writeState(root, SB, 'auto', (dir) => {
    mkdirSync(join(dir, 'flow'), { recursive: true });
    writeFileSync(join(dir, AUTO_FILE), JSON.stringify({ session: M, at: ago(AUTO.every + 1), pass: 1, pending: [{ id: 'a', at: ago(AUTO.every + 2), pass: 1, owed_since: ago(15), launch: { title: 'job a' } }] }));
  });
  const { opts } = fakes([], () => ({ started: [], archive: [], failed: [], waiting: [] }));
  const listed = [{ id: 'session_a1', title: 'job a', created_at: ago(1) }];
  const out = [];
  // The MERGER records a's session while the pass waits; the pass's list shows it too.
  autoLoop(root, { ...opts, waitFor: (f) => { autoDone(root, 1, ['a=session_a1'], { log: quiet }); writeFileSync(f, JSON.stringify(listed)); return true; }, log: (l) => out.push(l) });
  const rows = jsonl(readState(root, SB, STARTS_FILE));
  assert.equal(rows.filter((x) => x.row === 'created').length, 1);
  assert.deepEqual(readAuto(root, SB).pending, []);
  assert.doesNotMatch(out.join('\n'), /create_session for job a/);
});

test('the starter: quiet on purpose (a paused plan) it beats, so status still reads it running', (t) => {
  setJobCap(t, 20);
  const root = withOrigin({ 'process/config.json': { tranche: 'tranche', coordinator: 'session_coord1', plan: 'pause' } });
  writeState(root, SB, 'owed', (dir) => owe(dir, 'merge 1'));
  const out = [];
  autoLoop(root, { ...fakes([], () => assert.fail('no pass while paused')).opts, log: (l) => out.push(l) });
  assert.match(out.join('\n'), /plan pause: the starter starts nothing/);
  const a = readAuto(root, SB);
  assert.equal(a.session, M);
  assert.equal(a.quiet, 'plan pause');
  assert.match(starterLines(a, [], null)[0], /^starter: running \(session_merger1, no pass yet; quiet: plan pause\)/);
});

test('actsBlock: archives first, then each launch, then the done line; no judgment asked', () => {
  const L = actsBlock({ pass: 4, why: 'starts owed since x', archive: [{ session: 'session_m', job: 'm' }], launches: [{ id: 'a', launch: { title: 'job a' } }], again: [{ id: 'z', at: 'T', launch: { title: 'job z' } }], doneCmd: 'p3 auto done' });
  assert.match(L[0], /^AUTO-START pass 4 \(starts owed since x\): make these calls now, in order, each its own call; none needs a judgment$/);
  assert.equal(L[1], '1. archive_session session_m (job m: merged; its idle session holds a slot)');
  assert.match(L[2], /^2\. create_session for job z \(printed at T, and no session titled "job z" was in the list just saved: make it now\):$/);
  assert.match(L[4], /^3\. create_session for job a:$/);
  assert.equal(L.at(-1), 'then: p3 auto done 4 --created z=<its new session id> --created a=<its new session id>');
});

test('the starter: starts owed make a pass that asks for list_sessions, runs --ready\'s pass, and prints its calls; auto done and the next list measure owed to started', (t) => {
  setJobCap(t, 20);
  const root = withOrigin();
  writeState(root, SB, 'owed', (dir) => owe(dir, 'merge 41'));
  const since = JSON.parse(readState(root, SB, 'flow/owed.json')).since;
  const calls = [];
  const ready = (_, o) => { calls.push(o); return { started: [{ id: 'a', launch: { title: 'job a', prompt: 'START' }, subscribe: { owner: 'o', repo: 'r', pullNumber: 7 } }, { id: 'b', launch: { title: 'job b' }, subscribe: { pullNumber: 8 } }], archive: [{ session: 'session_m', job: 'm', why: 'merged' }], failed: [], waiting: ['c'] }; };
  const { opts, sent } = fakes([{ id: 'session_x', title: 'job m', session_status: 'SESSION_STATUS_IDLE' }], ready);
  const out = [];
  const r = autoLoop(root, { ...opts, log: (l) => out.push(l) });
  assert.equal(r.exit, 0);
  const text = out.join('\n');
  assert.match(text, new RegExp(`AUTO SESSIONS ${opts.sessionsFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: starts owed since ${since}\\. Now call list_sessions with limit 100 once and save its result to .* exactly as returned, has_more included; this pass waits 10 min for it, and the calls of an earlier AUTO-START block come first`));
  // --ready's own pass, in auto mode, with the owed time and the saved list.
  assert.equal(calls.length, 1);
  assert.equal(calls[0].auto, true);
  assert.equal(calls[0].owedSince, since);
  assert.equal(calls[0].sessions, opts.sessionsFile);
  assert.match(text, /AUTO-START pass 1 \(starts owed since .*\): make these calls now/);
  assert.match(text, /1\. archive_session session_m \(job m: merged/);
  assert.match(text, /2\. create_session for job a:\n\{\n  "title": "job a"/);
  assert.match(text, /then: node \.process\/tool\/p3\.mjs auto done 1 --created a=<its new session id> --created b=<its new session id>/);
  // BOB is told the pull requests to subscribe to; the MERGER never subscribes.
  assert.equal(sent.length, 1);
  assert.deepEqual([sent[0].from, sent[0].to], ['merger', 'bob']);
  assert.match(sent[0].text, /job a \(PR 7\), job b \(PR 8\): subscribe_pr_activity to each pull request/);
  const a = readAuto(root, SB);
  assert.equal(a.session, M);
  assert.equal(a.pass, 1);
  assert.deepEqual(a.pending.map((p) => [p.id, p.pr, p.owed_since]), [['a', 7, since], ['b', 8, since]]);
  const rows = jsonl(readState(root, SB, STARTS_FILE));
  assert.deepEqual(rows.map((x) => [x.row, x.pass, x.owed_since, x.started, x.archive, x.waiting]), [['pass', 1, since, ['a', 'b'], ['session_m'], ['c']]]);
  // Starts owed now name the starter, not BOB's command.
  assert.match(startsOwedLine({ since, acts: [{ act: 'merge 41' }] }, a), /the MERGER's starter \(session_merger1\) makes them$/);
  assert.match(startsOwedLine({ since, acts: [{ act: 'merge 41' }] }, null), /run job start --ready$/);
  // The MERGER records the session it made for a; b is seen at the next pass's list.
  const d = autoDone(root, 1, ['a=session_a1', 'zz=session_z'], { log: quiet });
  assert.deepEqual(d.done.map((x) => x.id), ['a']);
  assert.deepEqual(d.unknown, ['zz']);
  assert.deepEqual(readAuto(root, SB).pending.map((p) => p.id), ['b']);
  const was = { ...AUTO };
  t.after(() => Object.assign(AUTO, was));
  Object.assign(AUTO, { gap: 0, every: 0 });
  const two = fakes([{ id: 'session_b1', title: 'job b', created_at: new Date().toISOString() }], () => ({ started: [], archive: [], failed: [], waiting: [] }));
  const out2 = [];
  autoLoop(root, { ...two.opts, log: (l) => out2.push(l) });
  assert.match(out2.join('\n'), /job b: its session session_b1 was created \([\d.]+ min after its starts were owed\)/);
  assert.match(out2.join('\n'), /AUTO-START pass 2 \(starts owed since .*\): no call to make; nothing startable/);
  assert.deepEqual(readAuto(root, SB).pending, []);
  const all = jsonl(readState(root, SB, STARTS_FILE));
  assert.deepEqual(all.filter((x) => x.row === 'created').map((x) => [x.id, x.session, typeof x.min]), [['a', 'session_a1', 'number'], ['b', 'session_b1', 'number']]);
  // status's figure: minutes from starts owed to started.
  const m = startsMeasure(all);
  assert.equal(m.n, 2);
  const line = starterLines(readAuto(root, SB), all, null)[0];
  assert.match(line, /^starter: running \(session_merger1, last pass 2 at .*\): it makes every ready start; BOB starts none, subscribes to the pull requests its messages name and keeps the judgments \(entries, holds, blocked, over-cap, reopens\); owed to started: median [\d.]+ min, p90 [\d.]+ min, last [\d.]+ min \(2 starts in 24 h\)$/);
  assert.match(starterLines({ session: M, at: ago(AUTO.live + 1) }, [], { since: ago(20) })[0], /^starter: NOT RUNNING \(last pass .*\): BOB runs node \.process\/tool\/p3\.mjs job start --ready \(deliver what it prints\) and tells ROOT the starter is down; owed to started: no start measured in 24 h; starts owed now for 20 min$/);
});

test('the starter: a launch not seen created within AUTO.reprint is printed again; an unanswered ask passes nothing and waits AUTO.gap', (t) => {
  setJobCap(t, 20);
  const root = withOrigin();
  writeState(root, SB, 'auto', (dir) => {
    const f = join(dir, AUTO_FILE);
    mkdirSync(join(dir, 'flow'), { recursive: true });
    writeFileSync(f, JSON.stringify({ session: M, at: ago(AUTO.every + 1), pass: 3, pending: [{ id: 'q', at: ago(AUTO.reprint + 1), pass: 3, launch: { title: 'job q' } }] }));
  });
  const { opts } = fakes([], () => ({ started: [], archive: [], failed: [], waiting: [] }));
  const out = [];
  autoLoop(root, { ...opts, log: (l) => out.push(l) });
  assert.match(out.join('\n'), /AUTO-START pass 4 \(no pass for \d+ min\)[^\n]*\n1\. create_session for job q \(printed at .* make it now\):/);
  assert.match(out.join('\n'), /then: .* auto done 4 --created q=<its new session id>/);
  const a = readAuto(root, SB);
  assert.equal(a.pending[0].pass, 4);
  // Unanswered: nothing written, the next ask after the gap.
  const before = readState(root, SB, STARTS_FILE);
  const quietOut = [];
  writeState(root, SB, 'owed', (dir) => owe(dir, 'job complete x'));
  const was = { ...AUTO };
  t.after(() => Object.assign(AUTO, was));
  AUTO.gap = 0;
  autoLoop(root, { ...opts, waitFor: () => false, log: (l) => quietOut.push(l) });
  assert.match(quietOut.join('\n'), /AUTO SESSIONS: nothing saved to .* within \d+ min; asked again in 0 min/);
  assert.equal(readState(root, SB, STARTS_FILE), before);
});

test('the starter: the pin moved ends the loop with EXIT.pin (the launcher re-anchors); a closed tranche open or a paused plan passes nothing', (t) => {
  setJobCap(t, 20);
  const root = withOrigin();
  const sha = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['update-index', '--add', '--cacheinfo', `160000,${sha},.process`], { cwd: root });
  git(['commit', '-q', '-m', 'pin'], { cwd: root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  writeState(root, SB, 'owed', (dir) => owe(dir, 'merge 1'));
  const out = [];
  const r = autoLoop(root, { ...fakes([], () => assert.fail('no pass at a moved pin')).opts, pin: () => 'f'.repeat(40), log: (l) => out.push(l) });
  assert.equal(r.exit, EXIT.pin);
  assert.match(out.join('\n'), /the pin moved to [0-9a-f]{10}: the starter re-anchors its clone and runs again/);
  const same = autoLoop(root, { ...fakes([], () => ({ started: [], archive: [], failed: [], waiting: [] })).opts, pin: () => sha, open: () => ({ state: 'pending' }), log: (l) => out.push(l) });
  assert.equal(same.exit, 0);
  assert.match(out.join('\n'), /tranche open: pending; the starter starts nothing until it passes/);
  // Only in the starter's own clone, unless told otherwise (tests).
  assert.throws(() => autoLoop(root, { session: M, rounds: 1 }), /runs only in the starter's own clone/);
  assert.throws(() => autoLoop(root, { session: 'merger', anyClone: true }), /usage: auto start/);
});

test('auto start: only the addressed MERGER; its clone prepared and the loop run again when the pin moves; stops on changed approvals', () => {
  const root = withOrigin();
  assert.throws(() => autoStart(root, { session: M, address: { merger: { session: 'session_other' } } }), /the starter is the addressed MERGER's \(session_other\), not session_merger1's/);
  const codes = [EXIT.pin, EXIT.approvals];
  const runs = [];
  const preps = [];
  const out = [];
  const code = autoStart(root, { session: M, approvals: H, address: { merger: { session: M } }, prep: (r, dir) => preps.push(dir), run: (bin, args) => { runs.push(args.slice(1)); return { status: codes.shift() }; }, proc: { pid: 1 }, alive: () => false, log: (l) => out.push(l) });
  assert.equal(code, EXIT.approvals);
  assert.equal(preps.length, 2);
  assert.match(preps[0], /-starter$/);
  assert.deepEqual(runs[0], ['auto', 'start', '--session', M, '--here', '--approvals', H]);
  // A second starter from the same clone while the first runs: refused; the lock goes with the first.
  const lock = join(root, '.git', 'p3-starter.lock');
  writeFileSync(lock, JSON.stringify({ pid: 99, boot: 'b', started: '1' }));
  assert.throws(() => autoStart(root, { session: M, address: { merger: { session: M } }, prep: () => {}, run: () => assert.fail('no second'), alive: () => true }), /a starter already runs from this clone \(pid 99\): never a second/);
  const gone = autoStart(root, { session: M, address: { merger: { session: M } }, prep: () => {}, run: () => ({ status: 0 }), proc: { pid: 1 }, alive: () => false, log: quiet });
  assert.equal(gone, 0);
  assert.match(out.join('\n'), /the starter runs again at the new pin\nthe starter stopped: the approvals changed; tell ROOT, word for word/);
});

test('job start --ready in auto mode: the idle sessions of merged jobs, as many as the cap needs, archived first; COMPLETE ones kept', (t) => {
  setJobCap(t, 5);
  const root = makeRepo({ 'README.md': 'x' });
  const next = ['a', 'b', 'c'].map((id) => ({ file: `r/${id}.md`, count: 1, module: id, entry_state: 'OPEN' }));
  const rows = [
    { id: 'm', tranche: 'COMPLETE', pr: 'merged' },
    { id: 'n', tranche: 'COMPLETE', pr: 'merged' },
    { id: 'o', tranche: 'COMPLETE', pr: 'merged' },
    { id: 'k', tranche: 'WORKING', branch: 'COMPLETE', pr: '#7 ready' },
  ];
  const listed = [
    { id: 'session_m', title: 'job m', session_status: 'SESSION_STATUS_IDLE' },
    { id: 'session_n', title: 'job n', session_status: 'SESSION_STATUS_IDLE' },
    { id: 'session_o', title: 'job o', session_status: 'SESSION_STATUS_RUNNING' }, // working: kept
    { id: 'session_k', title: 'job k', session_status: 'SESSION_STATUS_IDLE' },
  ];
  const file = tmpFile();
  writeFileSync(file, JSON.stringify(listed));
  const out = [];
  // 4 live of 5: 1 free, 3 ready: 2 more needed, and the two idle merged sessions give them.
  const r = startReady(root, { auto: true, sessions: file, remote: new Set(), log: (l) => out.push(l), read: () => ({ next, rows }), start: (_, id) => ({ launch: { title: `job ${id}` } }) });
  assert.deepEqual(r.archive.map((x) => x.session), ['session_m', 'session_n']);
  assert.deepEqual(r.started.map((x) => x.id), ['a', 'b', 'c']);
  assert.match(out.join('\n'), /2 idle sessions of merged jobs archived first, freeing their slots: session_m \(job m\), session_n \(job n\)/);
  assert.doesNotMatch(out.join('\n'), /next acts: create_session/);
  // The cap still holding work back: never advice to archive COMPLETE jobs' sessions in the starter's narrative.
  const out2 = [];
  const tight = tmpFile();
  writeFileSync(tight, JSON.stringify([...listed, { id: 'session_z', title: 'job z', session_status: 'SESSION_STATUS_RUNNING' }, { id: 'session_y', title: 'job y', session_status: 'SESSION_STATUS_RUNNING' }]));
  const r2 = startReady(root, { auto: true, sessions: tight, remote: new Set(), log: (l) => out2.push(l), read: () => ({ next, rows }), start: (_, id) => ({ launch: { title: `job ${id}` } }) });
  assert.deepEqual(r2.archive.map((x) => x.session), ['session_m', 'session_n']);
  assert.deepEqual(r2.waiting, ['b', 'c']);
  assert.match(out2.join('\n'), /the cap holds 2 back after the archives above; no idle session of a merged job is left to archive/);
  assert.doesNotMatch(out2.join('\n'), /session_k/);
  // Not in auto mode: nothing archived, the cap holds two back as before.
  const plain = startReady(root, { sessions: file, remote: new Set(), log: quiet, read: () => ({ next, rows }), start: (_, id) => ({ launch: { title: `job ${id}` } }) });
  assert.deepEqual(plain.archive, []);
  assert.deepEqual(plain.waiting, ['b', 'c']);
});

test('starts owed: a hold ended owes them; the prompts give the MERGER the starter and BOB its line', () => {
  assert.equal(owes('hold', { _: [], end: 'hold-3' }), 'hold ended hold-3');
  assert.equal(owes('hold', { _: ['slots:2'] }), null);
  const mp = mergerPrompt({ slug: 'o/p', rootId: 'session_root1', approvals: H });
  assert.match(mp, new RegExp(`4a\\. Run \`node \\.process/tool/p3\\.mjs auto start --session <your session id> --approvals ${H}\` in the background too`));
  assert.match(mp, /stop the train and the starter, send ROOT one message/);
  assert.match(mp, /on `AUTO-START`, its calls in order, then its `auto done` line with the new ids/);
  assert.match(mp, /never a second of either/);
  const bp = bobPrompt({ slug: 'o/p', rootId: 'session_root1', approvals: H, merger: true });
  assert.match(bp, /`node \.process\/tool\/p3\.mjs job start --ready --live <n>` when status's `starter:` line says NOT RUNNING, then take up what status shows/);
  assert.doesNotMatch(bobPrompt({ slug: 'o/p', rootId: 'session_root1', approvals: H }), /starter/);
});
