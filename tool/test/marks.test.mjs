import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { overCap, requirementMarks, unmetIds } from '../lib/util.mjs';
import { isDebt } from '../lib/status.mjs';
import { markedIds } from '../lib/job.mjs';
import './helpers.mjs'; // no machine git config (C2)

// The one mark parser (util's requirementMarks), on the copy's real lines (build/requirements,
// copy tranche, 4 Nov). Status, layer close, the report, the cap and job complete all use it.
// A requirement line starts with `**R<id>**`; it is unmet when it holds `*(not yet met`
// anywhere on that line (the coordinator's ruling under P17, 4 Nov).
const copy = [
  // local-facts R23 and R25: a parenthetical, with one nested, between the id and the mark.
  '- **R23** (T53; N1257; DEC-404; DEC-151 (2); row 15; amends R10, R12) *(not yet met: T53; per C3)* **A team writes its facts.** `layerEntryDraft({section})` drafts.',
  '- **R25** (T53; N1257; DEC-404; amends R1, R2) *(not yet met: T53; per D2)* **A correction stays the team\'s.**',
  // Backticks and a cross-module id inside the parenthetical.
  '- **R52** (T53; K5571 (2); `public-read` R52) *(not yet met: T53)* text.',
  // The plain shape.
  '- **R36** *(not yet met: T40)* does x.',
  // acquisition R127: the mark at the line's end, after the bold title (333 such lines on the copy).
  '- **R127** (T53; N1259; K4403 (2)) **A piece is read in bounded slices and resumes after a stop.** Control: an uninterrupted run answers no `resume`. *(not yet met: T53)*',
  // Indented, and a numbered list.
  '  - **R7.1** (T40) **Nested.** *(not yet met: T41)*',
  '1. **R8** **Numbered.** *(not yet met: T42)*',
  // A mark on the requirement's wrapped continuation line is its own (C24).
  '- **R10** (T53)\n  (T53; N824, R136: for each entry it reaches, R38 also registers the row) *(not yet met: T53)*',
];
const unmet = ['R23', 'R25', 'R52', 'R36', 'R127', 'R7.1', 'R8', 'R10'];
const prose = [
  // Met: no mark on the line.
  '- **R24** (T53; N1257; DEC-404; amends R10) **Today\'s member-drafted rules are the team\'s layer.** Test: a rule.',
  // A status line that mentions the words, not starting with an id.
  '**Status** · In force. Last changed T46 (T46-9: R15 new); marked not yet met (T46).',
  // The words in prose after an id, not in the mark's italic form.
  '- **R9** (T40) is not yet met by anything; see R8.',
  // An id that is not first on its line, with the mark after it.
  'See **R11** *(not yet met: T40)* in the plan.',
  // The copy's own README rule line.
  '5. **An id is written exactly `**Rn**`**, first on its line. A requirement main does not yet meet is marked right after it: `*(not yet met: <row or entry>)*`.',
];

test('marks: a requirement line holding "*(not yet met" anywhere is unmet, in every reader', () => {
  const text = copy.join('\n');
  assert.deepEqual(unmetIds(text), unmet);
  assert.deepEqual(markedIds(text), unmet);
  assert.match(overCap({ requirements_cap: 1e9, requirements_cap_marks: 3 }, 'req/x.md', text), /8 unmet marks over 3/);
  // CRLF line ends read the same.
  assert.deepEqual(unmetIds(copy.join('\r\n')), unmet);
  // A lone \r ends a line too: R1 holds no mark.
  assert.deepEqual(unmetIds('- **R1** x\r- **R2** *(not yet met: T1)*'), ['R2']);
});

test('marks: prose that only mentions "not yet met" is not a mark', () => {
  for (const l of prose) assert.deepEqual(unmetIds(l), [], l);
  const both = requirementMarks([...copy, ...prose].join('\n'));
  assert.deepEqual(both.unmet, unmet);
  assert.deepEqual(both.all, [...unmet, 'R24', 'R9']);
});

test('marks: a long line without the mark is read in linear time', () => {
  const long = `- **R1** ${'(x) **y** '.repeat(50000)}`;
  const t = Date.now();
  assert.deepEqual(unmetIds(Array(20).fill(long).join('\n')), []);
  assert.ok(Date.now() - t < 2000);
});

// C24 (the coordinator, 7 Nov): BOB's record-core, layer 11. R92's mark sits on its indented
// `Control:` line, under numbered sub-items and a `Test:` line; the parser gave it to no
// requirement, so \`layer publish --test R92\` was refused and the job cited the test under
// --not-verified. R92's shape as the copy's tranche holds it (build/requirements/record-core.md),
// its long sentences cut.
const R92 = [
  '- **R91** (T53) **Before.** Test: x. Control: y.',
  '- **R92** (T53; N1257; K5458; C10; amends R25, R26) **A setting as of an instant.** `getSettingAt(name, at)` answers the value the setting `name` held at `at`.',
  '  1. **`at` is an instant, not a day.** It is a string of `record-grammar`\'s `ISO_TS_RE` form.',
  '  2. **Which row.** A whole-second `at` is read as the last millisecond of that second.',
  '  7. **Cost.** Writes: none. **Load per team (PLATFORM):** no new row per team.',
  '  Test: (a) `jurisdiction_profiles` set to `["a"]` answers `["a"]`; (h) 200 rows finish within the 2 s bar.',
  '  Control: `getSetting` and `getSetting(name, {strict: true})` answer exactly as R25, R83 and R84 state, and a call writes no row. *(not yet met: T53; PLATFORM)*',
  '',
  '**transact(fn) → fn\'s result**',
  '- **R32** Runs `fn` as one transaction over the whole store: when `fn` throws or returns a refusal',
  '  (`ok:false`), every row written inside it is rolled back.',
].join('\n');

test('marks: a mark on any sub-line of a requirement (Control, Test, a numbered item, a wrapped line) is its own: record-core R92', () => {
  assert.deepEqual(unmetIds(R92), ['R92']);
  assert.deepEqual(markedIds(R92), ['R92']);
  assert.deepEqual(requirementMarks(R92).all, ['R91', 'R92', 'R32']);
  // Struck on the Control line: no mark left (what layer publish --test R92 reads as struck).
  assert.deepEqual(unmetIds(R92.replace(' *(not yet met: T53; PLATFORM)*', '')), []);
  // Each sub-line shape carries it.
  for (const sub of ['  Test: x. *(not yet met: T1)*', '  1. **A.** y *(not yet met: T1)*', '\t(wrapped) *(not yet met: T1)*', '    deeper still *(not yet met: T1)*']) {
    assert.deepEqual(unmetIds(`- **R5** **Title.** x\n  Control: z.\n${sub}`), ['R5'], sub);
  }
  // An unindented line, or the next requirement, ends a requirement's sub-lines.
  assert.deepEqual(unmetIds('- **R5** x\nControl: z. *(not yet met: T1)*'), []);
  assert.deepEqual(unmetIds('- **R5** x\n  - **R6** y\n  Control: z. *(not yet met: T1)*'), ['R6']);
  assert.deepEqual(unmetIds('- **R5** x\r\n  Control: z. *(not yet met: T1)*'), ['R5']);
  // A heading's sub-lines are no requirement's.
  assert.deepEqual(unmetIds('**Status**\n  marked *(not yet met: T1)*'), []);
});

test('isDebt: an unmet requirement is debt only when every mark it holds, sub-lines included, is base-red', () => {
  assert.equal(isDebt('- **F1** *(not yet met: base-red T1)* x'), true);
  assert.equal(isDebt('- **F1** *(not yet met: base-red T1)* x\n  Control: y. *(not yet met: T2)*'), false);
  assert.equal(isDebt('- **R1** x\n  Control: y. *(not yet met: base-red T2)*'), true);
  assert.equal(isDebt('- **R1** x'), false);
});

// Cold review of C24: a loose list item's next paragraph, after a blank line, is the requirement's
// too (the copy's journey-check R13 and installer R48, each with its only mark there).
test('marks: a requirement\'s indented paragraph after a blank line is its own (journey-check R13, installer R48)', () => {
  const R13 = [
    '- **R13** (T49; N1099, N1100; DEC-241, DEC-245; amends R6) R6\'s comparison covers two things:',
    '  - design journey 29 ("From installing to a first conclusion", DEC-245), step by step;',
    '  - `/app/more` at 390 px, against `more` (DEC-241).',
    '',
    '  Every step of R9 and R10 is screenshotted (R2). Test: the pairs are made. *(not yet met: T49)*',
    '',
    '- **R14** (T49) next.',
    '',
    'Prose after the list, unindented. *(not yet met: T1)*',
  ].join('\n');
  assert.deepEqual(unmetIds(R13), ['R13']);
  assert.deepEqual(unmetIds(R13.replace(/\n/g, '\r\n')), ['R13'], 'CRLF');
  // An unindented line still ends it, blank lines or not.
  assert.deepEqual(unmetIds('- **R5** x\n\n\nControl: z. *(not yet met: T1)*'), []);
  // An indented note under a met requirement is that requirement's, whatever id it names (the rule).
  assert.deepEqual(unmetIds('- **R10** met\n  Note: R11 stays *(not yet met: T5)*'), ['R10']);
});

// Cold review of C24: the readers beside the parser read a requirement as it does.
test('marks: a found line put between a requirement and its marked sub-line is refused as a plain found-mark change', async () => {
  const { foundOnly } = await import('../lib/found.mjs');
  const base = '- **R92** thing\n  Control: y. *(not yet met: T1)*\n';
  const mid = '- **R92** thing\n- **F1** *(not yet met: walk x)* found\n  Control: y. *(not yet met: T1)*\n';
  const diff = '@@ -1,0 +2 @@\n+- **F1** *(not yet met: walk x)* found';
  assert.deepEqual(unmetIds(mid), ['F1'], 'the F line takes R92\'s sub-line');
  assert.match(foundOnly(diff, base, mid).why, /leaves R92 met/);
  const end = `${base}- **F1** *(not yet met: walk x)* found\n`;
  assert.deepEqual(foundOnly('@@ -2,0 +3 @@\n+- **F1** *(not yet met: walk x)* found', base, end), { ok: true, added: ['F1'] });
});

test('marks: a mark struck or retired on a sub-line is a change of that requirement (provider notices, splits)', async () => {
  const { changedIds, retiredIds } = await import('../lib/notice.mjs');
  const before = '- **R91** a\n- **R92** thing\n  Control: y. *(not yet met: T1)*\n';
  assert.deepEqual(changedIds(before, before.replace(' *(not yet met: T1)*', '')), ['R92']);
  assert.deepEqual(retiredIds(before, before.replace('*(not yet met: T1)*', '*(retired: to x R1)*'), ['R92']), ['R92']);
  // An id written mid-line (the copy's ooxml) is still read.
  assert.deepEqual(changedIds('- `f()` — **R1** a\n', '- `f()` — **R1** b\n'), ['R1']);
});
