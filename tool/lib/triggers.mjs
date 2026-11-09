// The review trigger (coordinator's log, 4 Nov 19:05, recorded as Bob's decision, not quoted). An
// audit of 10 job pull requests on the copy found judgement errors no test catches: PR 253
// loosened a requirement-pinning test to pass its own wrong change, PR 174 deleted panel.test.mjs
// while panel.mjs stayed live. The trigger is computed from the job's diff against its merge base
// alone; a job pull request that fires it merges only --reviewed (merge.mjs), and every merge row
// records what fired and what the review found. The security-path trigger was cut (PD-21: no
// paths configured since 5 Nov, useful 0 of 4 times), with the trial's measures.
//
// test (sharpened by the coordinator, 4 Nov 19:16, from the first 6 hand reviews): a test file of the
//   module (under its entry's tests, with its suite's suffix) deleted; or, in one that existed at
//   the base, a skip added (SKIP: test|it|describe.skip|todo|only( added), or a hunk that removes an
//   assertion line (ASSERT) and adds none. A hunk that replaces assertions with others does not fire.
//   ASSERT, the fixed forms: assert(...), assert.<x>(...), expect(...), and t.<x>(...) for the
//   node:test and tap methods listed.
import { git, underPath } from './util.mjs';

export const ASSERT = /\b(?:assert|expect)(?:\.\w+)*\s*\(|\bt\.(?:assert|equal|notEqual|strictEqual|deepEqual|deepStrictEqual|same|notSame|ok|notOk|true|false|match|throws|doesNotThrow|rejects|is|not|truthy|falsy)\s*\(/;
export const SKIP = /\b(?:test|it|describe)\.(?:skip|todo|only)\s*\(/;
export const ASSERT_RULE = 'assertion lines are those matching assert(, assert.<x>(, expect(, or t.<assert|equal|notEqual|strictEqual|deepEqual|deepStrictEqual|same|notSame|ok|notOk|true|false|match|throws|doesNotThrow|rejects|is|not|truthy|falsy>(, comments aside; a test file existing at the base fires on a hunk that removes an assertion line and adds none, or on an added test.skip, test.todo, .only or it.skip';
// The hunks a review brief carries, at most this many lines; past it the brief names the command.
export const HUNK_LINES = 400;

const isTest = (entry, f) => (entry?.tests || []).some((t) => underPath(f, String(t).replace(/^\.\//, ''))) && f.endsWith(entry?.suite?.test_suffix || '.test.mjs');
const isComment = (l) => /^\s*(?:\/\/|\/?\*)/.test(l);

// One file's -U0 diff, per hunk: removed and added assertion lines, and skips added.
// Returns { removed, added, skips, bare: hunks that remove an assertion and add none }.
export function assertCounts(diff) {
  const c = { removed: 0, added: 0, skips: 0, bare: 0 };
  let h = null;
  const end = () => { if (h && h.removed && !h.added) c.bare++; };
  for (const l of String(diff).split('\n')) {
    if (l.startsWith('---') || l.startsWith('+++')) continue;
    if (l.startsWith('@@')) { end(); h = { removed: 0, added: 0 }; continue; }
    if (l[0] !== '-' && l[0] !== '+') continue;
    const body = l.slice(1);
    if (isComment(body)) continue;
    if (l[0] === '+' && SKIP.test(body)) c.skips++;
    if (!ASSERT.test(body)) continue;
    h ||= { removed: 0, added: 0 };
    if (l[0] === '-') { c.removed++; h.removed++; } else { c.added++; h.added++; }
  }
  end();
  return c;
}

// The triggers a job's change fires: { fired: ['test'?], deleted: [test files],
// loosened: [{ file, removed, added }], why, hunks (the diff text that fired them, for the review
// brief) }. base and head are revisions in root.
export function reviewTriggers(root, { base, head, entry }) {
  // -z, as every diff in the tool: git quotes a path with non-ASCII bytes otherwise (review of PR 125).
  const z = git(['diff', '--no-renames', '--name-status', '-z', base, head], { cwd: root }).split('\0');
  const status = [];
  for (let i = 0; i + 1 < z.length; i += 2) if (z[i]) status.push({ s: z[i][0], f: z[i + 1] });
  const deleted = status.filter((x) => x.s === 'D' && isTest(entry, x.f)).map((x) => x.f);
  const loosened = [];
  const diffs = {};
  for (const x of status.filter((y) => y.s === 'M' && isTest(entry, y.f))) {
    const d = git(['diff', '--no-renames', '-U0', base, head, '--', x.f], { cwd: root });
    const c = assertCounts(d);
    if (c.bare || c.skips) { loosened.push({ file: x.f, ...c }); diffs[x.f] = d; }
  }
  const fired = deleted.length || loosened.length ? ['test'] : [];
  const why = [
    ...(deleted.length ? [`test files deleted: ${deleted.slice(0, 5).join(', ')}`] : []),
    ...loosened.slice(0, 5).map((l) => `${l.file}: ${[l.bare ? `${l.bare} hunk${l.bare > 1 ? 's' : ''} removing assertions and adding none` : '', l.skips ? `${l.skips} skip${l.skips > 1 ? 's' : ''} added` : ''].filter(Boolean).join(', ')}`),
  ].join('; ');
  const parts = [];
  if (deleted.length) parts.push(git(['diff', '--no-renames', '-U0', base, head, '--', ...deleted], { cwd: root }));
  for (const l of loosened) parts.push(diffs[l.file]);
  const all = parts.join('\n').split('\n');
  const hunks = all.length > HUNK_LINES ? [...all.slice(0, HUNK_LINES), `... ${all.length - HUNK_LINES} more lines: git diff ${String(base).slice(0, 10)} ${head} -- ${[...deleted, ...loosened.map((l) => l.file)].join(' ')}`].join('\n') : all.join('\n');
  return { fired, deleted, loosened, why, hunks };
}
