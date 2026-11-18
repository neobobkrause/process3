# The Codex maximums: every figure found

Length: 96 lines. Last section: "7. Where the repository's files disagree".

Written by a Claude worker on 18 Nov 2026 for the session continuing the Process4 design. These are a worker's findings, not Bob's words. What to put in the design's four blanks is in the next file, `04_codex_maximums_recommendation.md`.

## 1. The four labels

- **Measured**: an experiment was run on Codex and this was observed.
- **Documented**: stated by the harness's documentation or its public source code. Nobody ran it here.
- **Proposed**: someone's recommendation.
- **Unknown**: no file gives it.

One more is used for Bob: **Bob's word**. It is a ruling, not a measurement.

All paths are inside `process4/`. "Study" is `working/codex-context-study-20261117/REPORT.md`. "Evidence" is the folder `working/codex-context-study-20261117/evidence/`.

## 2. What was measured, and on what

One experiment was run, once, on 17 Nov 2026, by a Codex research session using native helpers. It used a made-up set of ten small documents and one long one. The long one is 173,124 bytes and 1,804 lines. Three of its lines are binding rules, at lines 2, 903 and 1,804. The other 1,800 lines are near-identical filler (study, line 51).

Three limits on what this experiment can show. They are the study's own words or follow from them.

- "One fixture, one run." (study, line 63)
- No reading was pushed until it failed. "Capacity saturation was not attempted" (study, line 123). So the experiment found sizes that worked. It did not find a maximum.
- The long document is filler. Reading 173 KB of one repeated sentence is not the same load as reading 173 KB of rules. That second point is my interpretation.

"Tokens" below are the tool's own count of its output. The study says they are "not billed inference token counts" (evidence `full-read-notes.md`, line 7).

## 3. Figures about one read, and one text

| Figure | What it measures | Label | Source |
| --- | --- | --- | --- |
| 43,281 tokens in, 4,106 characters out | The long document read in one command with the output limit set to 1,000 tokens. The command reported success. The start and the end arrived. The rule at line 903 did not. | Measured | evidence `truncation-1000.json`, lines 2 to 9; study, line 61 |
| 43,281 tokens in, 16,106 characters out | The same with the limit set to 4,000 tokens. Again the middle rule was lost. | Measured | evidence `truncation-4000.json`, lines 2 to 9; study, line 62 |
| 108,779 tokens | An early broad tool output in the study. It "was truncated". | Measured | study, line 106 |
| 200 lines a call; 43,282 tokens over nine calls | The long document read whole in nine calls of 200 lines (the last 204). "All outputs returned without truncation." By my count on the file, each call was 19,146 to 19,580 bytes. | Measured (byte count mine) | evidence `full-read-notes.md`, lines 5 and 7 |
| 24,000 bytes a call, "about 6,001" tokens each | The long document read whole in eight calls by byte range. "No read output reported truncation." | Measured | evidence `reload-notes.md`, line 7 |
| 250 lines a call; 6,438, 6,438, 6,437, 6,438, 6,438, 6,540 tokens | Lines 301 to 1,804 read in six calls. "Each call requested 7500 output tokens." "No output truncation markers appeared." By my count the calls were 23,998 to 24,380 bytes. The last, 254 lines and 24,380 bytes, is the largest single read that any file records as arriving whole. | Measured (byte count mine) | evidence `targeted-notes.md`, line 20 |
| 173,124 bytes, 1,804 lines | The largest single text read whole, in pieces, with all three of its rules then answered correctly. | Measured | evidence `full-read-notes.md`, lines 24 and 27; evidence `scores.json`, lines 3 and 4 |
| 93,937 bytes, 597 lines, eight pieces of 75 lines | The sixth draft, read by a Codex helper. "No truncation in those reads." What the helper took from it was not scored. | Measured as delivered, not as understood | evidence `process4-source-notes.md`, line 3 |
| 69,452 bytes, 306 lines | Process3's Foundations, "read in contiguous portions" by the study. Not scored. | Measured as delivered, not as understood | study, line 29 |
| The largest output one command can return on hosted Codex | The two limits above were set by the experimenter. "They do not determine the maximum hosted tool-output limit." | Unknown | study, line 62 |

## 4. Figures about a set of texts read together

| Figure | What it measures | Label | Source |
| --- | --- | --- | --- |
| 177,102 bytes, 1,915 lines, 11 files | Everything one fresh helper read before answering. It got 16 of 16 right. This is the largest set any file records. | Measured | evidence `full-read-notes.md`, line 27; evidence `scores.json`, lines 3 and 4 |
| 44,637 tokens | The tool's count for that helper's content reads (43,282 for the long document, 1,355 for the rest). | Measured | study, line 82; evidence `full-read-notes.md`, line 7 |
| 175,633 bytes, 9 files, "about 43,917" tokens | A second helper's reload of the sources. 15 of 16 by exact match, 16 of 16 after the study's own later ruling on one answer. | Measured | evidence `reload-notes.md`, line 7; evidence `scores.json`, lines 207, 208 and 307 |
| 2 of 16 | The same helper answering from a short, misleading handoff alone, before reloading. | Measured | evidence `scores.json`, lines 105 and 106 |
| 3,288 bytes | A packet written by one helper for another. A fresh helper given the packet and the questions (4,605 bytes in all) got 16 of 16. The packet was written to a limit of 4,000 bytes that the experimenter set. | Measured as enough for this task; the 4,000 is proposed | evidence `targeted-notes.md`, line 17; evidence `packet-consumer-notes.md`, line 1; evidence `protocol.json`, line 9 |
| 3,946,338 bytes | The 42 documents of the Civicsmith canon, by GitHub's file sizes. Not read. | Measured (a file-size total) | study, line 39 |
| The size at which a set stops being read in full | Never looked for. | Unknown | study, lines 86 and 123 |

## 5. Figures about a role's starting text and instruction files

No experiment measured a starting text on Codex. "No native instruction injection boundary test was available." (study, line 66)

| Figure | What it measures | Label | Source |
| --- | --- | --- | --- |
| 32 KiB (32,768 bytes) | The default budget for project instruction files (AGENTS.md). It is one budget shared by every such file from the repository's root down to the working folder. Bytes past it are cut off. "A large parent can exhaust it before a child." | Documented | study, lines 66 and 102; evidence `instruction-source-notes.md`, lines 5 and 6 |
| 10,000 estimated tokens | A separate ceiling for instructions given to a thread by its host. Text over it is "rejected when oversized". | Documented (public source) | study, line 104; evidence `instruction-source-notes.md`, line 10 |
| 2% of the model's context, at most 10,000 tokens | The budget for the list of skills. | Documented | study, line 106 |
| 8,192 bytes | The limit on any one text held in a role's record, in the Codex trial's own code. It is a storage limit the trial's author chose. "These are local storage limits, not model windows or handoff budgets." | Documented (the trial's source) | study, line 154; evidence `bootstrap-context-source-notes.md`, line 7 |
| 6,091 bytes, 60 lines | The file holding the trial's instructions for every role together. | Documented (the trial's source) | evidence `bootstrap-context-source-notes.md`, line 3 |
| 512 KiB | The ceiling on the trial's whole local state file. | Documented (the trial's source) | study, line 154 |
| The cap on instructions on the hosted surface | "instruction import cap on this surface" is in the study's list of what "must remain unknown". | Unknown | study, line 218 |

For comparison, the sixth draft's own figures for Claude Code: "One short rulebook per role, at most ten rules. The product's CLAUDE.md stays under thirty lines." (line 434). It names a "size limit on each role's starting text" and gives no number (lines 299 and 478).

## 6. Figures about the context window and the fill level

No experiment measured a window, a fill level or a compaction on Codex. "No current-context meter exposed to the acting agent." (study, line 136)

| Figure | What it measures | Label | Source |
| --- | --- | --- | --- |
| 40% | Bob: "This research confirms process4's policy of refreshing sessions when the context window exceeds 40% or more." | Bob's word, 17 Nov | `owner_words/bob_words_17nov_compaction_avoidance.md`, line 11 |
| 30% then 40% | Prepare a handoff at or below 30% of the window, refresh at or before 40%. | Proposed | `working/codex-context-avoidance-experiment-20261117.md`, line 46; study, line 196 (for ARCH) |
| 40% then 50% | The same pair for jobs and lanes. | Proposed | study, line 197 |
| 45% then 55% | The same pair for ROOT. | Proposed | study, line 198 |
| 272,000 tokens; 258,400 usable; 244,800 | The window in the public Codex catalog for four GPT-6 models; 95% of it usable; automatic compaction at 90% of it. "Public source catalog values and arithmetic, not measured capacities". | Documented (public source) | study, lines 112 to 117 |
| 500,000 tokens; 475,000 usable; 450,000 | The default the official documentation gives for GPT-6.1 Sol in Codex, and the public catalog's window for GPT-6.1 Terra; and the same two sums. | Documented | study, lines 115 and 119; `working/codex-gpt6-context-window-investigation-20261117.md`, lines 11 and 23 |
| 872,000 tokens; 828,400 usable; 784,800 | The most a request can raise the window to in that catalog, and the same two sums. | Documented (public source) | window investigation, lines 21 to 24 |
| 1,050,000 tokens | The model's window through the paid programming interface. Not the Codex figure. | Documented | window investigation, lines 11 and 41 |
| 258,400; 475,000; 828,400 | Windows that other people reported seeing in the Codex command-line client. One report has the same session fall from 475,000 to 258,400 between turns. "Third-party issue reports", not reproduced here. | Documented (reports by others) | window investigation, lines 28 to 35 |
| The window, the fill and any compaction of a hosted Codex session | "Exact current native context capacity and usage" is unknown. | Unknown | study, lines 136 and 218; window investigation, line 46 |

## 7. Where the repository's files disagree

1. **The default window for GPT-6.1 Sol.** The pinned public catalog says 272,000. The official documentation says 500,000. The study shows both and says "A material disagreement must remain visible" (study, line 119). Neither was observed on a hosted session.
2. **Whether one million tokens is required.** The study (lines 15, 121, 206, 214), the window investigation (line 50), the pricing note (lines 3 and 27), the register (line 16) and the research handoff (line 21) all carry a requirement of one million tokens or more. Bob's statement in `owner_words/bob_words_17nov_compaction_avoidance.md`, line 9, is "process4 sessions don't require 1m tokens". The folder's `README.md`, line 21, says that statement replaces the requirement. My reading: Bob's statement rules, and those five files are out of date on this one point.
3. **The fill level.** 40% in Bob's words quoted above. 50% in `owner_words/bob_words_16_17nov_codex_development.md`, line 65, where Bob describes Claude Code sessions: "we would start looking to refresh them at 50%". 40%, 50% and 55% by role in the study's proposal. 70% in `HANDOFF.md`, line 14, which is Bob's limit for the design session itself and which the study says "is not a target to fill toward" (line 198). My reading: the statement in the compaction file is the later one, so 40% stands.
4. **One answer's score.** The reload scored 15 of 16 by exact match and 16 of 16 after the study ruled one differently worded answer correct. Both are in evidence `scores.json` (lines 207 and 307).
5. **Small token differences.** The long document is 43,281 tokens in one read and 43,282 over nine reads; the two full readings total 44,637 and "about 43,917". These come from how the reads were cut, not from a disagreement.
