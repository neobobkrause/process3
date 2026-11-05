// What goes to Bob, and how a handoff carries the process (rulebooks/coordinator.md rules 1 to 3;
// Bob, 5 Nov). Measured: a merge-train fix carried ~9 h as "Bob's,
// asked, no answer"; handoffs copied "STILL BOB'S" lists and mixed his words with paraphrase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOB_LIST, MAX_ACTS, NOT_BOBS, askFindings, bobClass, coordinatorPage, handoffCheck } from '../lib/asks.mjs';
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
test('askFindings: the handoffs\' Bob lists, restated words and rules are refused; facts, citations by time and named items pass', () => {
  const bad = {
    routed: [
      "- Still Bob's: train study option C (speculative parallel gates, asked, no answer); words queue; lanes after LAN-1..10; allow rules (above).",
      "- Design study for Bob: notes/train-throughput-study.md on study/train-throughput (ebfae95). BOB ASKED, NO ANSWER: may the train gate up to 4 PRs in parallel?",
      'STILL BOB\'S',
      '- Lanes: written; nothing built until Bob has read it.',
      '- Option F chosen: batching off, revisit with Bob when queue depth at merge stays >= 3.',
      '- Ask Bob which session titles show dialogs.',
      '- m1: BLOCKED; ruling owed by Bob: merge design',
    ],
    // His words carried as quotes (Bob, 5 Nov: the game of telegraph; no gospel according to Bob).
    restated: [
      "BOB'S WORDS ON 5 NOV (binding, newest last):",
      'BOB (verbatim), 5 Nov 14:50: "You should know what I need to review - and nothing else."',
      'FOR BOB: none. Bob, ~07:35 4 Nov: "These are technical details."',
      'Process3 STOPPED, 5 Nov 05:44 UTC, on Bob\'s word: "stop all work"',
      'Stopped on Bob\'s word "Close everything".',
      '- Merge design is his. Bob said "a merge train"',
    ],
    rules: ['HOW TO WORK (learned 4 Nov): read the code first', 'COORDINATOR RULES ON SPEED (Bob, 5 Nov 01:15; carry into every handoff):', '- Never --restart onto a PR in the train.', '- Do not take product questions; BOB decides them.'],
  };
  const why = { routed: /^decide it: not Bob's \(coordinator rule 1\)/, restated: /^his words are not carried as quotes: fold the point into the rulebook principle/, rules: /^a handoff carries no rules/ };
  for (const [k, lines] of Object.entries(bad)) for (const l of lines) {
    const f = askFindings(l);
    assert.equal(f.length, 1, l);
    assert.match(f[0].why, why[k], l);
  }
  const good = [
    'Coordinator: the merge design is mine; speculative gates k=4 decided 15:10 (Bob, 5 Nov).',
    "- Still Bob's, rule 1 (b): sign the public release with his offline key.",
    'Tell BOB session_x your id; Bob adds the new account to the approvals.',
    '| 1 | Parallel gates: "BOB ASKED, NO ANSWER", "Still Bob\'s", "awaits Bob" | none | NOT HIS |',
    '- m1: BLOCKED; blocked 45 min; ruling owed by Bob: (c) which audience the export serves',
    'Report for Bob: merged PR 157, train green',
    'NOTES FOR BOB',
    '- control-plane 290: gate re-run at 15:02, green expected 15:40',
  ];
  assert.deepEqual(askFindings(good.join('\n')), []);
});

test('handoff --check: each finding as file:line, exit 1; a clean file exit 0', () => {
  const files = { 'h.md': "START\n- Still Bob's: the words queue\nBOB (verbatim): \"stop\"", 'ok.md': 'in flight: PR 290 regate (Bob, 5 Nov)\n' };
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

// The coordinator's handoff, generated from the record (coordinator rule 3; Bob, 5 Nov).
test('handoff --role coordinator: a page from list_sessions and list_triggers plus checked acts; no rules, none of his words', () => {
  const files = {
    's.json': JSON.stringify({ data: [{ id: 'session_a', title: 'BOB', session_status: 'running' }, { id: 'session_b', title: 'job x', session_status: 'archived' }, { id: 'session_c', title: 'MERGER', session_status: 'idle', status_bucket: 'blocked' }] }),
    't.json': JSON.stringify({ triggers: [{ id: 'trig_1', name: 'hourly flow', cron_expression: '51 * * * *', next_run_at: '2026-11-05T15:51:00Z', enabled: true }, { id: 'trig_2', name: 'old', enabled: false }] }),
  };
  const read = (f) => files[f];
  const page = coordinatorPage({ from: 'session_me', tranche: 'abc1234 Merge PR 158', sessions: 's.json', tasks: 't.json', acts: ['PR 290 regate, green expected 15:40'], at: '2026-11-05T15:30:00Z', read });
  assert.match(page, /^# Coordinator handoff, 2026-11-05T15:30:00Z, from session_me\n/);
  assert.match(page, /Rules: rulebooks\/coordinator\.md first, then the role rulebooks; what Bob has said lives there, cited by date\./);
  assert.match(page, /open sessions \(2\):\n- session_a BOB: running\n- session_c MERGER: idle, blocked\n/);
  assert.match(page, /scheduled tasks \(1\):\n- trig_1 hourly flow: cron 51 \* \* \* \*, next 2026-11-05T15:51:00Z\n/);
  assert.match(page, /in flight \(1\):\n- PR 290 regate, green expected 15:40\n$/);
  // The page passes its own check.
  assert.deepEqual(askFindings(page), []);
  for (const act of ["words queue: still Bob's", '- Never merge without a confirming review', 'Bob, 14:50: "nothing else"'])
    assert.throws(() => coordinatorPage({ acts: [act], read }), /an act is refused/, act);
  assert.throws(() => coordinatorPage({ acts: Array(MAX_ACTS + 1).fill('x'), read }), /at most 10/);
  assert.throws(() => coordinatorPage({ sessions: 't.json', read }), /--sessions t\.json: no list/);
  assert.match(coordinatorPage({ read }), /open sessions: not given/);
});
