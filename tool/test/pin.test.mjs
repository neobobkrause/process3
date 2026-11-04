// pin move (measured 3-4 Nov: a process3 fix reached the product only after a separate pin-move
// session): the short session's create_session call, from the product's tranche at clone depth 1,
// fetching the pin without --depth, setup check --at HEAD, and merge --plain.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRepo } from './helpers.mjs';
import { pinMove } from '../lib/pin.mjs';
import { git } from '../lib/util.mjs';

const quiet = () => {};
const PIN = 'a'.repeat(40);
const REPORT = 'session_01RAN5eniJPZwnDgHRYfWFQb';

test('pin move prints one short session: product tranche, depth 1, pin fetched without --depth, setup check --at HEAD, merge --plain', () => {
  const out = [];
  const { call, prompt } = pinMove(makeRepo({ 'README.md': 'x' }), 'neobobkrause/civicsmith-copy', { pin: PIN, report: REPORT, why: 'BOB wakes on events', log: (m) => out.push(m) });
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

test('pin move defaults the pin to process3\'s tranche tip; refuses a bad slug, report or pin', () => {
  const root = makeRepo({ 'README.md': 'x' });
  git(['update-ref', 'refs/remotes/origin/tranche', 'HEAD'], { cwd: root });
  git(['remote', 'add', 'origin', root], { cwd: root });
  git(['branch', 'tranche'], { cwd: root });
  const tip = git(['rev-parse', 'HEAD'], { cwd: root });
  assert.equal(pinMove(root, 'o/r', { report: REPORT, why: 'w', log: quiet }).pin, tip);
  assert.throws(() => pinMove(root, 'nope', { pin: PIN, report: REPORT, why: 'w', log: quiet }), /owner\/repo/);
  assert.throws(() => pinMove(root, 'o/r', { pin: PIN, why: 'w', log: quiet }), /--report <session id>/);
  assert.throws(() => pinMove(root, 'o/r', { pin: PIN, report: REPORT, log: quiet }), /--why/);
  assert.throws(() => pinMove(root, 'o/r', { pin: 'abc', report: REPORT, why: 'w', log: quiet }), /--pin/);
});
