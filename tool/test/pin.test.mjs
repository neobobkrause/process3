// pin move (measured 3-4 Nov: a process3 fix reached the product only after a separate pin-move
// session): the short session's create_session call, from the product's tranche at clone depth 1,
// fetching the pin without --depth, setup check --at HEAD, and merge --plain.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRepo } from './helpers.mjs';
import { pinCheck, pinMove } from '../lib/pin.mjs';
import { git } from '../lib/util.mjs';

const quiet = () => {};
// The process repo (pinMove's processRoot; the tool's own by default): its origin's tranche holds
// PIN; UNRELEASED is a local build commit on no released branch, TAG an annotated tag's object id.
const ORIGIN = makeRepo({ 'README.md': 'process' });
git(['branch', '-M', 'tranche'], { cwd: ORIGIN });
git(['branch', 'main'], { cwd: ORIGIN });
const PROC = makeRepo({ 'README.md': 'x' });
git(['remote', 'add', 'origin', ORIGIN], { cwd: PROC });
git(['fetch', '-q', 'origin'], { cwd: PROC });
const PIN = git(['rev-parse', 'origin/tranche'], { cwd: PROC });
const UNRELEASED = git(['rev-parse', 'HEAD'], { cwd: PROC });
git(['tag', '-a', '-m', 'v', 'v1', PIN], { cwd: PROC });
const TAG = git(['rev-parse', 'v1'], { cwd: PROC });
const REPORT = 'session_01RAN5eniJPZwnDgHRYfWFQb';
// The product's open pull requests, and the acts --supersedes takes, recorded.
const pinIO = (prs = []) => {
  const acts = [];
  return { acts, io: { list: () => prs, comment: (slug, n, body) => acts.push(['comment', slug, n, body]), close: (slug, n) => acts.push(['close', slug, n]) } };
};
const none = pinIO().io;

test('pin move prints one short session: product tranche, depth 1, pin fetched without --depth, setup check --at HEAD, merge --plain', () => {
  const out = [];
  const { call, prompt } = pinMove(makeRepo({ 'README.md': 'x' }), 'neobobkrause/civicsmith-copy', { pin: PIN, processRoot: PROC, report: REPORT, why: 'BOB wakes on events', io: none, log: (m) => out.push(m) });
  assert.deepEqual([call.source_url, call.source_revision, call.clone_depth], ['https://github.com/neobobkrause/civicsmith-copy', 'tranche', 1]);
  assert.equal(call.prompt, prompt);
  assert.ok(prompt.includes(`\`git -C .process fetch origin ${PIN}\` (no --depth`));
  assert.doesNotMatch(prompt.split('\n').find((l) => l.includes('-C .process fetch')), /--depth \d/);
  assert.ok(prompt.includes('`node .process/tool/p3.mjs setup check --at HEAD`'));
  assert.match(prompt, /`node \.process\/tool\/p3\.mjs merge <that pull request> --plain --as pin --no-review "/);
  assert.match(prompt, /"base":"tranche"/);
  assert.ok(prompt.includes(REPORT));
  // Review of PR 72: each gap by its kind; the approvals block and the owner's settings untouched.
  assert.ok(prompt.includes('copy `.process/shims/<f>` to `.github/workflows/<f>`'));
  assert.ok(prompt.includes('replace the old process lines below the approvals block with those of `.process/shims/CLAUDE.process.md` ({tranche} as tranche), changing nothing in the approvals block'));
  assert.match(prompt, /A gap in `\.claude\/settings\.json` \(the owner's file\), or any other gap: send it to `session_/);
  assert.match(out.at(-1), /^next act: start the pin move with create_session:\n\{/);
});

// Copy, 4 Nov: with no --pin it took the product's own tranche tip, and a positional sha was ignored.
test('pin move needs --pin, a commit of the process repo; refuses a positional sha, a bad slug, report or pin', () => {
  const root = makeRepo({ 'README.md': 'x' });
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  const own = git(['rev-parse', 'HEAD'], { cwd: root });
  assert.throws(() => pinMove(root, 'o/r', { processRoot: PROC, report: REPORT, why: 'w', io: none, log: quiet }), (e) => e.message === 'pin move needs --pin <a process3 commit, 40 hex>');
  assert.throws(() => pinMove(root, 'o/r', { pin: PIN, rest: [PIN.slice(0, 10)], processRoot: PROC, report: REPORT, why: 'w', io: none, log: quiet }), new RegExp(`give the commit as --pin ${PIN.slice(0, 10)}`));
  assert.throws(() => pinMove(root, 'o/r', { rest: ['extra'], processRoot: PROC, report: REPORT, why: 'w', io: none, log: quiet }), /takes only the slug; not "extra"/);
  assert.throws(() => pinMove(root, 'o/r', { pin: own, processRoot: PROC, report: REPORT, why: 'w', io: none, log: quiet }), new RegExp(`--pin ${own} is not a commit on process3's tranche or main`));
  for (const pin of [UNRELEASED, TAG]) {
    const f = pinIO([PR(106, 'p3/pin-0123456789')]);
    assert.throws(() => pinMove(root, 'o/r', { pin, supersedes: '106', processRoot: PROC, report: REPORT, why: 'w', io: f.io, log: quiet }), /is not a commit on process3's tranche or main/);
    assert.deepEqual(f.acts, [], 'refused before --supersedes closes anything');
  }
  assert.equal(pinMove(root, 'o/r', { pin: PIN, processRoot: PROC, report: REPORT, why: 'w', io: none, log: quiet }).pin, PIN);
  assert.throws(() => pinMove(root, 'nope', { pin: PIN, processRoot: PROC, report: REPORT, why: 'w', io: none, log: quiet }), /owner\/repo/);
  assert.throws(() => pinMove(root, 'o/r', { pin: PIN, why: 'w', io: none, log: quiet }), /--report <session id>/);
  assert.throws(() => pinMove(root, 'o/r', { pin: PIN, processRoot: PROC, report: REPORT, io: none, log: quiet }), /--why/);
  assert.throws(() => pinMove(root, 'o/r', { pin: 'abc', processRoot: PROC, report: REPORT, why: 'w', io: none, log: quiet }), /--pin/);
});

// Measured 4 Nov on the copy: two pin moves ran at once twice in 20 minutes; PR 108, cut before
// PR 106 merged, conflicted on the .process gitlink.
const PR = (number, ref) => ({ number, head: { ref } });
test('pin move refuses while a pin move is open on the product, naming it; other pull requests do not count', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const f = pinIO([PR(7, 'bob/plan'), PR(106, 'p3/pin-0123456789')]);
  assert.throws(() => pinMove(root, 'o/r', { pin: PIN, processRoot: PROC, report: REPORT, why: 'w', io: f.io, log: quiet }), (e) => e.message === 'a pin move is open: PR 106 (p3/pin-0123456789); wait for it or close it');
  assert.deepEqual(f.acts, [], 'nothing written');
  assert.equal(pinMove(root, 'o/r', { pin: PIN, processRoot: PROC, report: REPORT, why: 'w', io: pinIO([PR(7, 'bob/plan')]).io, log: quiet }).pin, PIN);
  // The session's own check, right before it pushes.
  assert.throws(() => pinCheck('o/r', { io: f.io, log: quiet }), (e) => e.message === 'a pin move is open: PR 106 (p3/pin-0123456789); wait for it or close it');
  const logs = [];
  pinCheck('o/r', { io: none, log: (m) => logs.push(m) });
  assert.deepEqual(logs, ['no pin move is open on o/r']);
});

test('pin move --supersedes <pr> closes that open pin move with a comment, keeps its branch, and goes on', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const f = pinIO([PR(106, 'p3/pin-0123456789')]);
  const out = [];
  const r = pinMove(root, 'o/r', { pin: PIN, processRoot: PROC, report: REPORT, why: 'w', supersedes: '106', io: f.io, log: (m) => out.push(m) });
  assert.equal(r.pin, PIN);
  assert.deepEqual(f.acts.map((a) => a.slice(0, 3)), [['comment', 'o/r', 106], ['close', 'o/r', 106]], 'a comment, then the close; no branch deleted');
  assert.match(f.acts[0][3], new RegExp(`Superseded by a newer pin move, to process3 ${PIN}.*the branch p3/pin-0123456789 is kept`));
  assert.match(out[0], /closed pull request 106 \(p3\/pin-0123456789\) as superseded; its branch is kept/);
  // Only an open pin move can be superseded, and only when no other stays open.
  for (const [prs, n, msg] of [
    [[PR(106, 'p3/pin-0123456789')], '7', /--supersedes 7: pull request 7 is not an open pin move on o\/r \(open: PR 106/],
    [[PR(7, 'bob/plan')], '7', /pull request 7 is not an open pin move/],
    [[PR(106, 'p3/pin-0123456789'), PR(108, 'p3/pin-abcdef0123')], '106', /a pin move is open: PR 108 \(p3\/pin-abcdef0123\)/],
    [[PR(106, `p3/pin-${PIN.slice(0, 10)}`)], '106', new RegExp(`already moves the pin to ${PIN.slice(0, 10)}`)],
    [[PR(106, 'p3/pin-0123456789')], 'x', /--supersedes <the open pin move's pull request number>/],
    [[PR(1, 'p3/pin-0123456789')], true, /--supersedes <the open pin move's pull request number>/],
  ]) {
    const g = pinIO(prs);
    assert.throws(() => pinMove(root, 'o/r', { pin: PIN, processRoot: PROC, report: REPORT, why: 'w', supersedes: n, io: g.io, log: quiet }), msg);
    assert.deepEqual(g.acts, [], 'nothing closed');
  }
});

test('the pin-move session checks for an open pin move right before it pushes, and branches from the tranche tip it fetches then', () => {
  const { prompt } = pinMove(makeRepo({ 'README.md': 'x' }), 'o/r', { pin: PIN, processRoot: PROC, report: REPORT, why: 'w', io: none, log: quiet });
  const lines = prompt.split('\n');
  const at = (re) => lines.findIndex((l) => re.test(l));
  const push = at(/git push -u origin p3\/pin-/);
  const check = at(/p3\.mjs pin check o\/r`/);
  const branch = at(new RegExp(`git checkout -q -b p3/pin-${PIN.slice(0, 10)} FETCH_HEAD`));
  assert.ok(check > 0 && branch > 0 && push > 0);
  assert.ok(branch < check && check === push - 1, 'the check is the step before the push; the branch is cut after the work, from a fresh fetch');
  assert.ok(lines[branch].includes(`git fetch origin tranche --depth 1\`, then \`git checkout -q -b p3/pin-${PIN.slice(0, 10)} FETCH_HEAD\`, then \`git cherry-pick refs/p3/pin-base..p3-pin-work\``), lines[branch]);
  assert.ok(at(/setup check --at HEAD` again/) > branch, 'setup check runs again on the fresh base');
  assert.match(lines[0 + at(/^1\. /)], /git checkout -q -b p3-pin-work FETCH_HEAD/);
});

// 5 Nov: from a process3-only session the product's pull requests cannot be listed, and pin move
// refused; the session it prints runs pin check before it pushes, which guards it.
test('pin move from a session that cannot list the product\'s pull requests prints the call with a note that the session\'s own pin check guards it', () => {
  const root = makeRepo({ 'README.md': 'x' });
  const out = [];
  const r = pinMove(root, 'o/r', { pin: PIN, processRoot: PROC, report: REPORT, why: 'w', io: { list: () => null }, log: (m) => out.push(m) });
  assert.equal(r.pin, PIN);
  assert.match(out[0], /^note: could not list o\/r's open pull requests, so whether a pin move is open is unknown from here; the pin-move session's own `.*pin check o\/r` \(step 8, before it pushes\) guards it$/);
  assert.match(r.prompt, /^8\. `.*pin check o\/r`/m);
  assert.match(out.at(-1), /^next act: start the pin move with create_session:/);
  // --supersedes must find the one it closes: unread, it still refuses; and pin check, the guard, refuses.
  assert.throws(() => pinMove(root, 'o/r', { pin: PIN, processRoot: PROC, report: REPORT, why: 'w', supersedes: '106', io: { list: () => null, comment: () => assert.fail('commented'), close: () => assert.fail('closed') }, log: quiet }), /could not list o\/r's open pull requests/);
  assert.throws(() => pinCheck('o/r', { io: { list: () => null }, log: quiet }), /could not list o\/r's open pull requests/);
});
