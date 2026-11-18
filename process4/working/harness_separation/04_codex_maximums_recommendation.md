# The Codex maximums: what to put in the four blanks

Length: 87 lines. Last section: "7. What is not known".

Written by a Claude worker on 18 Nov 2026. Everything here is the worker's recommendation, not Bob's word and not a measurement, except where a figure is marked measured. The figures and their sources are in `03_codex_maximums_figures.md`. Read that file first.

## 1. The ruling being followed

Bob: "Use the Codex maximum, as they're based on real measurements, and Codex context windows are in affect more constrained than they are in Claude Code."

The design-state file leaves four values owed: the maximum size of a single text a session must read in full; the maximum size of a set of texts read together; the maximum size of a role's starting text; and the fill level at which a long-lived role is refreshed.

## 2. What must be said first

The repository holds no measured maximum for any of the four.

- For the first two blanks it holds measured sizes that worked, on one made-up set of documents, in one run. No size was raised until reading failed. So each figure is "the largest size shown to work", and the true maximum is somewhere above it, unknown.
- For the third blank it holds documented figures only. Nothing was measured.
- For the fourth blank it holds Bob's own word and some proposals. Nothing was measured, and a hosted Codex session shows no fill level at all.

Using a "largest size shown to work" as the maximum is safe in one direction: it cannot be too large by the evidence in hand. It may be smaller than it needs to be.

## 3. Blank one: a single text read in full

**Recommended: 24,000 bytes.** Measured.

Why this figure. It is the largest single read that the files record as arriving whole on Codex: thirteen reads of 23,998 to 24,380 bytes, each "about 6,001" to 6,540 tokens by the tool's count, none cut short (evidence `reload-notes.md`, line 7; evidence `targeted-notes.md`, line 20). A text of this size reaches the session in one read, so no part of it can be skipped between reads. That is the condition under which the design's sentence holds: "keeping below the maximum reliably results in one."

What it is not.

- It is not a limit Codex imposes. The limit Codex imposes on one command's output on the hosted surface is unknown (study, line 62).
- In the six reads of 250 lines the helper asked for an output limit of 7,500 tokens. What limit applies when none is asked for is not recorded.
- The same experiment showed the failure this blank guards against: a 43,281-token text asked for in one command came back with its start and end and without its middle, and the command reported success (evidence `truncation-1000.json` and `truncation-4000.json`).
- The bytes were filler, about 4 bytes to a token. Dense text may count differently. That is my estimate, from 24,000 bytes giving about 6,001 tokens.

The other measured figure, and why I do not recommend it. A text of 173,124 bytes was read whole in pieces and all three of its rules were found (evidence `full-read-notes.md`, line 27). It could be offered as the maximum for a single text. I do not recommend it, for two reasons. It was 1,800 lines of one repeated sentence, so it says little about a long text of real rules. And reading in pieces is exactly where a part gets skipped: in the same experiment one helper, told to read the whole text, at first replaced most of it with a program's summary and had to be corrected (study, line 78).

Two consequences, stated plainly. Both are my reading.

- The design-state file keeps a module's requirements file under this maximum and has ARCH split a module that nears it. So this figure also sets how large one module's requirements can grow. I did not count how many of today's requirements files are over 24,000 bytes.
- The design document is "what sessions follow", so it is a text read in full. The sixth draft is 93,937 bytes. At 24,000 bytes the design document would be several texts, each under 24,000 bytes, read as a set under blank two.

## 4. Blank two: a set of texts read together

**Recommended: 175,000 bytes.** Measured at 177,102 bytes; the rounding down is mine.

Why this figure. It is the largest amount one Codex helper read before answering, and it answered 16 of 16 (evidence `full-read-notes.md`, line 27; evidence `scores.json`, lines 3 and 4). A second helper reloaded 175,633 bytes and answered 16 of 16 after one answer was ruled on, 15 of 16 by exact match (evidence `reload-notes.md`, line 7). The tool counted 44,637 tokens for the first.

What it is not.

- It is not a found limit. Nothing larger was tried.
- 173,124 of the 177,102 bytes were the filler document. The texts that carried the other thirteen answers came to under 4,000 bytes. So this figure is weak evidence for a set of dense texts of the same size. That judgment is mine.

How it sits beside the fill level. This is my arithmetic, on documented windows, not a measurement. The smallest documented usable window is 258,400 tokens. 44,637 tokens is about 17% of it. A session that reads a full set therefore starts its work well under 40%, with the tool's token count standing in for the model's, which the study says it may not match.

## 5. Blank three: a role's starting text

**No measured figure exists.** If a figure must stand in the blank now, I recommend **8,192 bytes**, labelled as documented and not measured.

Why this figure. It is the only figure in the repository that the Codex trial itself applies to a text handed to a role (study, line 154). It is the smallest of the Codex figures that bear on starting text, so it sits inside the other two: the 32,768-byte default for instruction files and the 10,000-estimated-token ceiling for instructions given to a thread. It is also well inside blank one, so a starting text arrives in one read. The trial's instructions for all roles together are 6,091 bytes (evidence `bootstrap-context-source-notes.md`, line 3), so the trial's own role texts fit.

What it is not. It is a storage limit a trial's author chose. Nobody measured whether a role reads 8,192 bytes of principles in full, or fails to at some larger size.

A second number the design may need, which is not one of the four blanks. On Codex, the instruction files a session loads at its start share one budget, documented as 32,768 bytes by default, and bytes past it are cut off without notice (study, line 102). The cap on the hosted surface is unknown (study, line 218). On Claude Code the sixth draft keeps the product's CLAUDE.md "under thirty lines". My reading: a role's starting text and the instruction files loaded at start are two different things on Codex, each with its own ceiling, and the design's table for Codex should say so.

## 6. Blank four: the fill level for refreshing a long-lived role

**Recommended: 40%.** Bob's word, not a measurement.

Why this figure. Bob, 17 Nov: "This research confirms process4's policy of refreshing sessions when the context window exceeds 40% or more." It is his latest statement on the level, and the lowest figure anyone gives for the refresh itself. The study proposes 40% for ARCH, 50% for jobs and lanes and 55% for ROOT, and says of all of them: "None is an empirically established Codex fidelity boundary" (study, line 192). I recommend one level, 40%, for every long-lived role, because Bob's sentence names one and because the higher two are proposals resting on older Claude Code rules.

What cannot be done with it on Codex today. A hosted Codex session shows no fill level, no window size and no sign that compaction happened (study, line 136). So on Codex the rule "at a stated fill level" has nothing to read. Only the other half of the design's rule, "at a natural pause in its work", can operate there. The study says the same: with the meter absent, "Do not fabricate a percentage" (line 199).

Two more facts that bear on the percentage.

- The percentage needs a denominator. The documented windows are 272,000 and 500,000 tokens, with automatic compaction at 244,800 and 450,000. Others report the window of one session changing between turns. 40% of the smaller usable window is 103,360 tokens; of the larger, 190,000. That arithmetic is mine.
- Documented automatic compaction comes at 90% of the window, so 40% leaves a wide margin on either documented window. Whether a hosted session's window is one of those two is unknown.

## 7. What is not known

1. The largest output one read can return on hosted Codex, and the limit that applies when none is asked for.
2. Any size at which a single text, or a set, stops being read in full. Only sizes that worked are known.
3. How a set of dense, real governing texts of 175,000 bytes is read. The measured set was almost all filler.
4. Any measured size for a role's starting text, and the real cap on instruction files on the hosted surface.
5. The window of a hosted Codex session, its fill at any moment, and whether or when it compacted.
6. Whether the tool's token counts match what the model counts.
7. Any of these figures on Claude Code. Bob's ruling makes the Codex figures the ones used, so none was looked for.
