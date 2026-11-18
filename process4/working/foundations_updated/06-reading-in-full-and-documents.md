Length: 129 lines. Last section: "10. Never measured, and not found".

# Background, part 6: reading in full, the four values, and the documents

This part gives the reasons and the evidence behind design part 5. It states no rule.

## 1. Why reading in full is a design matter

The owner's words, to the Codex session of 16 and 17 Nov (`owner_words/bob_words_16_17nov_codex_development.md`, an assistant's selection of extracts):

> In Claude, if a set of documents were too large to be held in its context, Claude would silently scan documents rather than read them in full. If it's context window exceeded 75% it would "garbage collect". These acts would result in significant infidelity to the canon, with the process not following the development principals and the resulting workflow produced not meeting requirements.

And on 17 Nov (`owner_words/bob_words_17nov_codex_context.md`): "My Claude experience confirms that incomplete reading (scanning) to be a very significant danger that must be mitigated." And: "What I found in Claude, and is probably the case in ChatGPT, is that there's no reliable means of controlling the conditions that degrade context fidelity. As such, process4 defines specific limits on things like session handoff document sizes, session refresh requirements that rigorously eleminate the need for compaction, limits on the size and complexity of process4's principals of operation".

These are his experience and his approach. They are not measurements. What has been measured follows.

## 2. What Process3 had: limits that were ruled, none measured

A worker read Process3's limits on 18 Nov (`working/process3_limits_18nov.md`). Its short answer: "Process3 set many limits. All of them were ruled. None was measured as a point where reading fails."

- Process3's rule that a session acts only on what it has read in full was "in words only". The check on it was planned, to judge "whether a session read whole by what it can cite from the end of a document", and was never built (section 7).
- A hook that refused a read stopping short of a document was dropped by the owner on 31 Oct: "It refused reads the process itself had ordered" (section 7, from his ledger).
- The one reading failure with a size beside it: "one worker given 108 modules judged only part of them" (section 4). The size in bytes was not recorded.
- Where a size limit was enforced on a starting text, it held; where none existed, text grew. Role prompts "stayed at 4,032 to 4,197 bytes from 4 to 9 Nov", while the tool's guide, which had no limit, grew from 7,955 to 134,219 bytes (section 5; `evidence/verify_numbers.md`, lines 190 to 208).

The earlier form of this background said the values would be settled first from Process3's limits. That was done, and the worker's finding was that they settle only the starting text, as a ruling that held, and do not settle the other three (section 8).

## 3. What was measured on Codex

One experiment, run once, on 17 Nov, by a Codex research session using its own helpers, on a made-up set of ten small documents and one long one of 173,124 bytes, of which 1,800 lines were near-identical filler (`working/harness_separation/03_codex_maximums_figures.md`, section 2). The study's own words: "One fixture, one run", and "Capacity saturation was not attempted". What it saw:

| Observation | Figure | Standing |
|---|---|---|
| A long text asked for in one command came back with its start and end and without its middle, and the command reported success | 43,281 tokens in; the middle rule lost, at output limits of 1,000 and 4,000 tokens | Measured |
| The largest single read recorded as arriving whole | 24,380 bytes; thirteen reads of 23,998 to 24,380 bytes, none cut | Measured; the byte counts are the worker's |
| The largest set one helper read before answering | 177,102 bytes in 11 files; 16 of 16 right | Measured; 173,124 of the bytes were the filler |
| A second helper reloading the sources | 175,633 bytes; 15 of 16 by exact match | Measured |
| The same helper answering from a short, misleading handover alone | 2 of 16 | Measured |
| The instruction files a session loads at its start | One budget of 32 KiB by default, shared by all of them; bytes past it are cut off | Documented, not run; the limit on the hosted surface was not measured |
| A hosted session's fill level, its window, or a sign of compaction | None shown to the session | Measured as absent |
| Automatic compaction | At 90 percent of the window | Documented |

The earlier form of this background said in four places that a Codex matter was not yet known when the record did hold something: depth (four levels, measured second-hand), archiving (not available to a hosted session, measured as absent), where the shared state lives (a file on the host in the one trial), and the instruction-file limit (the 32 KiB default above). The earlier form also said that how one session starts a separate session on Codex was not yet known; a session listed on its own, started by another session, could not be made from a hosted session (measured as blocked; `working/harness_separation/01_neutral_terms.md`). Each is now a row of design part 8, section 1, with how it is known. How model and effort are passed on there is still not known. What is still not known on Codex is listed there and in `working/codex_shortcomings_to_fill.md`. That list was made on the owner's instruction, as the file quotes it (a session's record): "Where there are shortcoming in the Codex spec, just note those shortcomings so that my work using the OpenAI account can fill those in."

## 4. Why the Codex figures are used on both harnesses

The owner's ruling, as `working/harness_separation/04_codex_maximums_recommendation.md`, section 1, quotes it (a worker's record of 18 Nov; no file of his typed words holds it, and the design state, section 3, gives the same ruling in Claude's words): "Use the Codex maximum, as they're based on real measurements, and Codex context windows are in affect more constrained than they are in Claude Code."

The same worker said first what the figures are: "The repository holds no measured maximum for any of the four." Each is the largest size shown to work, and "the true maximum is somewhere above it, unknown".

On the windows: the documented Codex windows are 272,000 and 500,000 tokens for the same model, and neither was observed on a hosted session (`working/harness_separation/03_codex_maximums_figures.md`, sections 6 and 7). The owner first asked for models "having context windows of 1m tokens or more" (`owner_words/bob_words_17nov_codex_context.md`), and then replaced that (`owner_words/bob_words_17nov_compaction_avoidance.md`): "process4 sessions don't require 1m tokens. What they require is sufficient token to perform enough useful - and correct! - work to justify the investment of time and tokens, all while protecting development from damage caused by things like document scanning, compaction, and other context management shortcomings." That sentence is the source of the design's one yardstick for the maximums and the fill level (design part 5, section 1). Which Codex model the process is to use is open with him (design part 10, section 1, item 11).

## 5. The first measurement on Claude Code, and why it is not relied on

Run on 18 Nov on the owner's word, as the results file quotes it, "Run the three measurements." (`working/reading_measurements/RESULTS.md`). One harness version, one model, a window of 1,000,000 tokens, 148 worker runs.

**What one read returns.**

- A plain read returns a file whole up to 25,000 tokens; the limit is in tokens, not bytes or lines. The largest file a plain read returned whole was 49,480 bytes. A file of 99,890 bytes (41,638 tokens) came back cut, and the notice of the cut arrived apart from the read's result.
- A file over 256 KB was refused, with no lines returned.
- The text used was unusually dense, about 2.4 bytes to a token, so the byte figures are low for ordinary prose. That last point is the measuring session's reasoning, not a measurement.

**A single text.** Every size up to 140 KB was taken in one read and passed (10 of 10 at 12, 48, 70 and 140 KB; 2 of 2 at 24 and 100 KB). At 280 KB every reader paged through the text and all 30 passed. At 540 KB one of three readers, after a refused read, stopped reading and searched for the answers; it received 88 of 1,297 lines and answered 12 of 12.

**A set of texts.** Sets of 89,108, 165,358, 244,921 and 407,862 bytes passed (5, 5, 5 and 15 runs). At 709,246 bytes in 45 files, two of five readers read 5 and 9 files whole and searched the rest, with nothing refused or cut first.

**What it could not show.** The results file itself says the runs at one size "are not independent trials", and that "Recall cannot show a skipped reading when the reader has tools: the three runs that skipped all scored full marks."

**The owner's judgment.** He judged it too weak to rely on. That judgment reaches this background through three session records (`working/design_state_18nov.md`, line 43; `working/handoff_18nov_measurements_session.md`, line 33; `working/reading_measurements/RERUN_PROMPT.md`), not through typed words on file. His instruction for a second, as the last of those quotes it: "Produce an initial prompt for a different session that will rerun these measurement tests to produce load-bearingly accurate results that can we can rely on for process4-based development." That file lists thirteen reasons the first cannot be relied on, among them: one source text; readers that were workers of one session and not sessions; one model and one window; a task that invited searching; no test of whether a rule that was read was then kept; sizes and numbers of files that rose together; and nothing run on Codex.

**The second measurement** is briefed in that file and has not been started (`working/handoff_18nov_measurements_session.md`, line 33).

## 6. The four values, and where each comes from

The design gives four provisional figures (design part 5, section 2). The earlier form of this background said the values were not yet settled, and called them blanks. They are no longer blanks; they are provisional.

**Whose word makes them stand.** As `working/design_state_18nov.md`, line 43, quotes the owner on 18 Nov, after the first measurement: "let's use these current values for now so that we move forward with the next task". There is no file dated 18 Nov in `process4/owner_words/`; a check of every quotation in the seventh draft found these words nowhere but the design state (`working/readiness_18nov/draft7_quotations_checked.md`, line 45). That "these current values" means the four figures below is a reading he has not confirmed, and is the first item open with him (design part 10, section 1).

| Value | Figure | Where it comes from | What is not known |
|---|---|---|---|
| The largest single text | 24,000 bytes | The largest single read recorded whole on Codex (section 3). On Claude Code every size at or under it passed in the first measurement | Any size at which reading fails. On Codex nothing larger was tried in one read |
| The largest set | 175,000 bytes | The Codex set of 177,102 bytes, rounded down by the worker. On Claude Code the set of 165,358 bytes passed 5 of 5 | How a set of dense, real texts of that size is read on Codex: the measured set was almost all filler |
| A role's starting text | 4,096 bytes, and at most ten rules | Process3's ruling, held there by a test of its tool for the whole week (section 2). The owner's ledger kept "at most ten rules on one screen, rewritten in place, never appended" (`working/process3_limits_18nov.md`, section 5, from `evidence/ledger_lines.md`, line 1109). The design marks the figure as proposed by Claude | Whether a role reads that much in full, or fails at some larger size. A worker reading the Codex record had recommended 8,192 bytes, a storage limit from the Codex trial's own code; that too was unmeasured. What "at most ten rules" counts is open with the owner: the design records that the eight drafted starting texts keep to ten numbered rules only by joining several on one line (design part 10, section 1, item 10) |
| The fill level for a refresh | 40 percent | The owner, 17 Nov (`owner_words/bob_words_17nov_compaction_avoidance.md`): "This research confirms process4's policy of refreshing sessions when the context window exceeds 40% or more." | Not measured on either harness. On Codex no fill level can be read |

**The history of the fill level.** It has had five values (`working/process3_limits_18nov.md`, section 6; `working/harness_separation/03_codex_maximums_figures.md`, section 7):

- 40 percent in the process before Process3. The reason given was cost, not reading.
- 60 percent in Process3, set by the sessions that built its tool. "No experiment stands behind 60."
- 70 percent, the owner's limit for the design session itself (14 Nov): "Keep your context under 70%."
- 50 percent, the owner describing Claude Code to the Codex session: "we would start looking to refresh them at 50%".
- 40 percent, his words of 17 Nov above. It is his latest statement, so it stands.

Where Process3's sessions were in fact refreshed: at 55 to 60, 65, 73 and 83 percent, each one reading in the coordinator's log. So a printed level was passed by 5 to 23 points. The worker's conclusion, which is the worker's: a level of 40 leaves room for that overshoot, and a level of 60 left little.

**What 24,000 bytes means for requirements files** is in part 3, section 2, of this background.

## 7. The length line at the top of each text

The design marks as "Claude decided" that each governing text says at its top how long it is and what its last section is (design part 5, section 1). It is the nearest thing kept from Process3's unbuilt reading check, which was to judge a reading by what the reader can cite from the end. It measures nothing by itself: the first measurement showed that a reader with tools can cite the end of a text it did not read.

## 8. The two documents, and the retired ledger

The owner's ruling of 18 Nov, as the design state records it (`working/design_state_18nov.md`, section 2, in Claude's words): "Two documents. A design document that defines the Process4 design, and a background document that gives the background and context." And: "Bob's Foundations, brought up to date with the design, become the background document. Bob's ledger was a worksheet and is retired."

**What the ledger was.** Process3 was drawn from a "Keep and Drop Ledger": 126 lines decided on 31 Oct 2026, of which 103 were kept, 16 modified and 7 dropped, and further lines on 3 Nov (`evidence/foundations_tranche_9nov.md`, line 13). A copy of its lines is `evidence/ledger_lines.md`. Several figures and two quotations in this background reach it only through that ledger; each place says so. The ledger rules nothing now.

**Why the design carries no history and no product.** From the same section of the design state. The owner's related words are the working rule "Talk to me in plain words. No codes, no shorthand, no references to things I have not seen. I have not read your working files." (`owner_words/bob_words_14nov_b.md`).

**Why the work may be written into a public repository.** 14 Nov (`owner_words/bob_words_14nov_c.md`): "The process3 repo is public because the development process that we're evolving is open-source software that's still in development. You have my approval to add any and all information related to the process4 update to the repo."

## 9. The ranking page, the two harnesses, and the hosting table

**The ranking page.** The owner, 17 Nov (`owner_words/bob_words_17nov_codex_context.md`): "I'm open to the addition of a canon authority map. The model must not mistake a local implementation decision for permission to violate a higher-level principle." And to the Codex session, that the work must "abide by the mission, principals, standards, requirements, and design decisions documented in the canon". The page itself is from the review session of 18 Nov (`working/design_state_18nov.md`, section 14). That mission is highest and design decisions lowest is marked as a reading (design part 5, section 6).

**Two harnesses kept apart.** 17 Nov: "We need to investigate and fully consider the Codex environment as unique from that of Claude and develop a load-bearing understanding and strategy for it." And to the Codex session: "Confirm that changes being added to the process3 repo in support of a Codex-based development process are NOT overwriting the Claude Code support, correct?"

**Hosting stated in neutral terms,** with a table for each provider: from the review session of 18 Nov (`working/design_state_18nov.md`, section 2). No typed words on file.

**The records of decisions.** From the same section. Why his exact words are kept apart from every session's wording is in part 7 of this background.

## 10. Never measured, and not found

- A size at which reading fails, for a single text or a set, on either harness, to a standard the owner accepts.
- Whether a rule that was read is then kept in the work that follows.
- Any reading on Codex of dense, real texts at the provisional sizes.
- A role's starting text, at any size.
- The fill level, on either harness; and the window of a hosted Codex session.
- The owner's typed words of 18 Nov: on the two documents, on using the Codex maximums, on "these current values", and on the first measurement.
