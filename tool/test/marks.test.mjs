import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UNMET, overCap, requirementMarks, unmetIds } from '../lib/util.mjs';
import { markedIds } from '../lib/job.mjs';

// The one mark parser (util's requirementMarks), on the copy's real lines (build/requirements,
// copy tranche, 4 Nov). Status, layer close, the report, the cap and job complete all use it.
const copy = [
  // local-facts R23 and R25: a parenthetical, with one nested, between the id and the mark.
  '- **R23** (T53; N1257; DEC-404; DEC-151 (2); row 15; amends R10, R12) *(not yet met: T53; per C3)* **A team writes its facts.** `layerEntryDraft({section})` drafts.',
  '- **R25** (T53; N1257; DEC-404; amends R1, R2) *(not yet met: T53; per D2)* **A correction stays the team\'s.**',
  // Backticks and a cross-module id inside the parenthetical.
  '- **R52** (T53; K5571 (2); `public-read` R52) *(not yet met: T53)* text.',
  // The plain shape, as before.
  '- **R36** *(not yet met: T40)* does x.',
];
const prose = [
  // Met: no mark after the parenthetical, the title in bold.
  '- **R24** (T53; N1257; DEC-404; amends R10) **Today\'s member-drafted rules are the team\'s layer.** Test: a rule.',
  // A status line that mentions the words.
  '**Status** · In force. Last changed T46 (T46-9: R15 new); marked not yet met (T46).',
  // Bold prose, then the words later in the line: not the mark the copy's rule (build/requirements/README.md, item 5) places right after the id.
  '- **R127** (T53; N1259; K4403 (2)) **A piece is read in bounds.** Control: none. *(not yet met: T53)*',
  // Words in prose after an id, not in the mark's italic parenthesis.
  '- **R9** (T40) is not yet met by anything; see R8.',
  // A parenthetical on the next line is not the mark's.
  '- **R10** (T53)\n*(not yet met: T53)*',
];

test('marks: a parenthetical between the id and "(not yet met" is counted, in every reader', () => {
  const text = copy.join('\n');
  assert.deepEqual(unmetIds(text), ['R23', 'R25', 'R52', 'R36']);
  assert.deepEqual(markedIds(text), ['R23', 'R25', 'R52', 'R36']);
  assert.deepEqual([...text.matchAll(UNMET)].map((m) => m[1]), ['R23', 'R25', 'R52', 'R36']);
  assert.equal(text.match(UNMET).length, 4);
  assert.match(overCap({ requirements_cap: 1e9, requirements_cap_marks: 3 }, 'req/x.md', text), /4 unmet marks over 3/);
});

test('marks: prose that only mentions "not yet met" is not a mark', () => {
  for (const l of prose) assert.deepEqual(unmetIds(l), [], l);
  const both = requirementMarks([...copy, ...prose].join('\n'));
  assert.deepEqual(both.unmet, ['R23', 'R25', 'R52', 'R36']);
  assert.deepEqual(both.all, ['R23', 'R25', 'R52', 'R36', 'R24', 'R127', 'R9', 'R10']);
});
