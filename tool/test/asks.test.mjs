// What goes to Bob (rulebooks/coordinator.md rules 1 and 2; Bob, 5 Nov 14:50: "You should know
// what I need to review - and nothing else."). Measured: a merge-train fix carried ~9 h as "Bob's,
// asked, no answer"; handoffs copied "STILL BOB'S" lists and mixed his words with paraphrase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOB_LIST, NOT_BOBS, askFindings, bobClass, handoffCheck } from '../lib/asks.mjs';
import { handoff } from '../lib/state.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('bobClass: a reason opening (a)-(d) with words after it, or "rule 1 (x)" in prose; nothing else', () => {
  assert.deepEqual(['(a) publish v1 publicly', '(b) sign with his offline key', '(c) R4 contradicts R7', '(d) move to another account', 'still his, rule 1 (b): his key'].map(bobClass), ['a', 'b', 'c', 'd', 'b']);
  for (const s of ['(c)', '(c)  ', '(e) a lane', 'requirement R2: which fees apply?', 'merge design is his', 'c) x', '', undefined]) assert.equal(bobClass(s), null, String(s));
});

test('the closed list in the tool is the one in coordinator rule 1, and the refusal names the rule', () => {
  const rule1 = readFileSync(join(repo, 'rulebooks', 'coordinator.md'), 'utf8').split('\n').find((l) => l.startsWith('1. Only these go to Bob, a closed list'));
  assert.ok(rule1, 'coordinator rule 1 is the closed list');
  for (const k of Object.keys(BOB_LIST)) assert.ok(rule1.includes(`(${k}) `), `rule 1 lacks (${k})`);
  assert.ok(!rule1.includes('(e) '));
  assert.ok(rule1.includes(NOT_BOBS));
});

// The lines are the 4-5 Nov handoffs' own (notes/coordinator-handoff-*.md on start/coordinator-4nov).
test('askFindings: the handoffs\' Bob lists and mixed word headings are refused; verbatim lines and named items pass', () => {
  const bad = [
    "- Still Bob's: train study option C (speculative parallel gates, asked, no answer); words queue; lanes after LAN-1..10; allow rules (above).",
    "- Design study for Bob: notes/train-throughput-study.md on study/train-throughput (ebfae95). BOB ASKED, NO ANSWER: may the train gate up to 4 PRs in parallel?",
    'STILL BOB\'S',
    "BOB'S WORDS ON 5 NOV (binding, newest last):",
    '- Lanes: written; nothing built until Bob has read it.',
    '- Option F chosen: batching off, revisit with Bob when queue depth at merge stays >= 3.',
    '- Ask Bob which session titles show dialogs.',
    'BOB (verbatim), 02:15: "a merge train", so merge design is his',
  ];
  for (const l of bad) assert.equal(askFindings(l).length, 1, l);
  const good = [
    'BOB (verbatim), 5 Nov 14:50: "You should know what I need to review - and nothing else."',
    'BOB (verbatim)',
    '- 02:15: "a merge train"',
    '- about 07:35 4 Nov: "These are technical details, and I\'ve already given sufficient approvals."',
    '',
    'Coordinator: the merge design is mine; speculative gates k=4 decided 15:10.',
    "- Still Bob's, rule 1 (b): sign the public release with his offline key.",
    'Tell BOB session_x your id; never ask Bob technical questions.',
    'Stopped on Bob\'s word "Close everything".',
    '| 1 | Parallel gates: "BOB ASKED, NO ANSWER", "Still Bob\'s" | none | NOT HIS |',
  ];
  assert.deepEqual(askFindings(good.join('\n')), []);
  // Under the heading, a list line that is not his quoted words is refused.
  assert.equal(askFindings('BOB (verbatim):\n- he wants a merge train').length, 1);
  // Review 1: a line under the heading without "- " (a --note), and paraphrase between two quotes.
  assert.equal(askFindings('BOB (verbatim):\nhe wants the train kept').length, 1);
  assert.equal(askFindings('- 14:50: "keep it" and he wants the train gone "ok"').length, 0, 'not under the heading: an ordinary line');
  assert.equal(askFindings('BOB (verbatim), 14:50: "keep it" and he wants the train gone "ok"').length, 1);
  assert.deepEqual(askFindings('BOB (verbatim), 14:50: "keep it" ... "ok"\nBOB (verbatim):\n"a"\nCoordinator\'s: so the train stays.\nSTATE:\n- x'), []);
  // Review 1: status's own line for an item on the list passes; a report line "for Bob" and a heading for the BOB role pass.
  assert.deepEqual(askFindings('- m1: BLOCKED; blocked 45 min; ruling owed by Bob: (c) which audience the export serves\nReport for Bob: merged PR 157, train green\nNOTES FOR BOB'), []);
  assert.equal(askFindings('- m1: BLOCKED; ruling owed by Bob: merge design').length, 1);
  assert.match(askFindings("- Still Bob's: words queue")[0].why, /^decide it: not Bob's \(coordinator rule 1\)/);
});

test('handoff --check: each finding as file:line, exit 1; a clean file exit 0', () => {
  const files = { 'h.md': "START\n- Still Bob's: the words queue\nBOB (verbatim): \"stop\"", 'ok.md': 'BOB (verbatim): "stop"\n' };
  const out = [];
  assert.equal(handoffCheck(['h.md'], { read: (f) => files[f], log: (l) => out.push(l) }), 1);
  assert.match(out[0], /^h\.md:2: decide it: not Bob's \(coordinator rule 1\)/);
  assert.equal(handoffCheck(['ok.md'], { read: (f) => files[f], log: () => {} }), 0);
  assert.throws(() => handoffCheck([]), /needs a file/);
  // Review 1: every named file is read (the command passes --check's value and the rest).
  const seen = [];
  handoffCheck(['ok.md', 'h.md'], { read: (f) => { seen.push(f); return files[f]; }, log: () => {} });
  assert.deepEqual(seen, ['ok.md', 'h.md']);
});

test('BOB\'s handoff refuses a note routing an item to Bob off the list, before it writes anything', () => {
  // Refused before any git: the root does not exist.
  assert.throws(() => handoff('/nonexistent', 'process-state', { tranche: 'tranche', lines: [], notes: ["words queue: still Bob's"], log: () => {} }), /a note is refused: .*decide it: not Bob's \(coordinator rule 1\)/);
});
