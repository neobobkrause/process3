# Process3's limits on size, length and context fill

Length: 86 lines. Last section: "9. What was read, and what could not be done". Section 8 says whether the figures settle the four blanks. The measurements proposed for what they do not settle are in a second file, `process3_limits_18nov_measurements.md`.

Written by a Claude worker on 18 Nov 2026. These are a worker's findings, not Bob's words. The Codex figures are in `harness_separation/03_codex_maximums_figures.md` and are not repeated here.

## 1. The short answer

Process3 set many limits. All of them were ruled. None was measured as a point where reading fails. Process3 planned to check reading and never built the check, so it holds no measurement of how well any text of any size was read. Its limits settle the third blank fairly well, inform the fourth, and do not settle the first two.

## 2. Labels and sources

Four words are kept apart. **Measured**: an experiment or a count produced it. **Documented**: a platform's documentation states it. **Ruled**: Bob or Process3's rules set it. **Proposed**: someone recommended it. "Builders" means the sessions that wrote Process3's tool.

- **T** is branch `origin/tranche` of the process3 repository, the last state of Process3 (9 Nov).
- **Log** is the coordinator's log, `notes/coordinator-findings-3-4nov.md` on branch `origin/start/coordinator-4nov`.
- **Ledger** is `process4/evidence/ledger_lines.md`, Bob's Keep and Drop decisions. **Evidence** is the folder `process4/evidence/`.

## 3. Limits on a single text

- **70,000 bytes: a module's requirements file.** Ruled, and called provisional. The figure came from a measured count of file sizes, not from any test of reading: "3 Nov: 109 files, median 32,829, 90th percentile 71,128, max 137,301"; "the real number is set at the gate" (T `tool/lib/util.mjs`, lines 370 to 375). The 75th percentile was 45,974 and the 95th 89,897 (T `README.md`, line 36). At first the tool refused to start a job over it (branch `origin/build/requirements-cap`, `tool/lib/job.mjs`, line 193: "nothing was started"). Later it printed "split or consolidate before its job" and started anyway. The record says it failed as a refusal: "start size-cap refusal (32/32 overridden)" (Log, line 681). It cost 30 split files and 64 commits, and "Total requirement bytes did not change" (Evidence `product_side.md`, line 162). The real number was never set: "cap unchanged until it's set from measurement before the second tranche" (Log, line 1136).
- **A byte cap at 4 percent of the window: a module's requirements file, in the process before Process3.** Ruled, enforced by refusal. It failed: "the 29 Oct page set a hard cap that refused 127 of 127 modules" (Ledger, line 453); "A byte cap set at 4 percent of the window refused every module" (Ledger, line 947). The byte figure is not in the repository.
- **40 lines, 4,096 bytes and 5 notes: BOB's handoff.** Ruled: Bob kept "at most one screen, a pointer set not a narrative" (Ledger, line 908). The tool enforced it (T `tool/lib/state.mjs`, line 21). It refused too much at first: "a 140-line status refused every handoff, at any note length" (same file, line 538), so it was changed to trim. The coordinator's own handoffs were written by hand with no limit and ran from 3,957 to 8,906 bytes.
- **4 KB: "a handoff, a START, a charter and a worker's brief are each at most 4 KB"**, in the process before Process3 (T `notes/lane-charters.md`, line 166). Ruled. The Ledger's argument for it: "Civicos handoffs became massive and were skimmed; neoProcess's 4 KB handoffs worked" (line 914). No count is given.
- **2,048 bytes: the block of temporary measures printed after a role's prompt.** Ruled by the builders. The tool only reports an overrun, "so it is read, not skimmed" (T `tool/lib/register.mjs`, lines 31 to 38 and 165). No record that it was reached.
- **1,048,576 bytes: any one file committed** (T `tool/lib/util.mjs`, line 348). A limit on the repository, not on reading.

## 4. Limits on a set of texts read together

- **250,000 bytes or 25 modules: the code one helper is given to judge.** Ruled by the coordinator after one observed failure: "one worker given 108 modules judged only part of them" (T `tool/lib/util.mjs`, lines 377 to 381). The tool split a larger list among helpers and refused nothing. How many bytes the failing helper was given is not recorded. This is the only reading failure with a size beside it that I found, and the size is a count of modules.
- **Reading budgets as shares of the window.** Ruled, kept by Bob on 31 Oct: "Budgets are fractions of the model's window in one table, never bytes in code; an overrun is measured and reported, never refused" (T `governing/foundations.md`, line 186). My finding from searching the tool's settings: no such table was written. The one share in the settings is the refresh level in section 6.
- **"A module fits in one reading: one session can read in full its code, its requirements and those of the services it uses"** (same file, line 178). Ruled, in words only. No number.
- **The reading set is printed with its sizes at each start.** BOB's was `CLAUDE.md` and its handoff (T `tool/lib/util.mjs`, line 356). A job's was a table headed "Reading set (read each file whole)" (T `tool/lib/job.mjs`, line 154). The sizes recorded for each job are in the product's repository, which this checkout does not hold.
- **Measured sizes, for scale.** At the end the product had 221 requirement files of 8.04 MB in all (Evidence `product_side.md`, table before line 162). That is about 36,000 bytes a file by my arithmetic.

## 5. Limits on a role's starting text

- **4,096 bytes, "one screen": each role's starting prompt, and a job's START.** Ruled; a test of the tool failed when one was over (T `tool/test/prompt-caps.test.mjs`, lines 1 to 4, 20 and 51). "Measured 4 Nov: ROOT's prompt was 4248 bytes, over the cap". The record says it held: role prompts "stayed at 4,032 to 4,197 bytes from 4 to 9 Nov", while the guide with no limit grew from 7,955 to 134,219 bytes (Evidence `causal_forensics.md`, line 29; `verify_numbers.md`, lines 190 to 208).
- **At most 10 rules, at most 3 principles and at most 4,096 bytes: each role's rulebook.** Ruled: Bob kept "at most ten rules on one screen, rewritten in place, never appended" (Ledger, line 1109). A test enforced all three (T `tool/test/rulebooks.test.mjs`, lines 20 to 27). It held. At the end, by my count: BOB 4,039 bytes and 10 rules, ROOT 3,307 and 7, job 2,005 and 6, watcher 2,114 and 3, review helper 1,204 and 4. Two rulebooks outside the test grew: one reached 8,375 bytes.
- **Under 30 lines, not counting Bob's approvals: the product's CLAUDE.md.** Ruled by Bob (Ledger, lines 1085 to 1094). The tool's set-up check reported an overrun (T `tool/lib/setup.mjs`, lines 33 and 319). The file ended at 22 lines and 8,664 bytes, nearly all approvals (Evidence `audit_C.md`, line 24). A count of lines did not bound its bytes.
- **About 14 KB: all twenty principles, loaded by every role in the process before Process3** (Ledger, line 1120). Bob changed it to the two or three a role needs: "I'm skeptical, but let's try". No result of that trial was found.
- **My arithmetic.** A Process3 role read at its start at most a prompt of 4,096 bytes, a block of 2,048 and a rulebook of 4,096: 10,240 bytes in three pieces, and CLAUDE.md.

## 6. Limits on context fill and refresh

- **60 percent: the fill at which the tool printed REFRESH for BOB**, also read for ROOT at each hourly check (T `tool/lib/util.mjs`, lines 354 and 355; `tool/lib/status.mjs`, line 756). Ruled by the builders. The tool printed it and held nothing. No experiment stands behind 60.
- **40 percent: the level in the process before Process3.** "BOB refreshes past a set share of its window (40% then)"; changed on 3 Nov to "the threshold stays in the start table ... rather than a fixed 40%" (Ledger, lines 1536 to 1538). Ruled. The reason given is cost, not reading: "a session's cost grows with its context times its turns".
- **Half the window: the earlier design lanes.** "The lane hands over when its context passes half its window" (T `notes/lane-charters.md`, line 157). Ruled.
- **Where sessions were in fact refreshed.** Each is one reading in the Log, a measured observation. The coordinator handed over at 55 to 60 percent (lines 1235 and 1295). "BOB at 65% context: handover asked of ROOT" (line 494). A merging session was replaced at "73% context, $97.99" (line 716). ROOT was told "to hand over now (83% context)" (line 1086). Before Process3, "a BOB once ran to two thirds of its window" (Ledger, line 926). So a printed level was passed by 5 to 23 points.
- **The window and compaction.** "538k of 1M (54%) ... auto-compaction at 784k" (Log, line 243). It is one session's statement, and it does not say whether it was observed or read from documentation. Bob's own words: "If it's context window exceeded 75% it would 'garbage collect'" (`process4/owner_words/bob_words_16_17nov_codex_development.md`, line 75).
- **A hook that held a turn open past the level.** Dropped by Bob on 31 Oct: "Held sessions against you" (Ledger, lines 167 to 176).
- **10 refusals: a second reason to refresh.** The tool printed REFRESH for a session at 10 permission refusals, because auto mode hands a session to a person at 20 (T `tool/lib/metrics.mjs`, line 41; T `governing/foundations.md`, line 194). The 20 is documented.
- **On Claude Code the fill can be read.** Process3 read it with get_session on the session itself (T `README.md`, line 63). A hosted Codex session shows none.

## 7. Rules about reading whole, and about one read

- "A session acts only on what it has read in full or measured" (T `governing/foundations.md`, line 133). Ruled, in words only.
- The check on it was never built. It was to judge "whether a session read whole by what it can cite from the end of a document" (same line). The map of what was built says "Start prints the reading set; no audit" and "Reading audit not built" (T `governing/ledger-map.md`, lines 63 and 241).
- A hook that refused a read stopping short of a document was dropped by Bob on 31 Oct: "It refused reads the process itself had ordered" (Ledger, lines 156 to 165).
- "Text is kept short by splitting and consolidating ... Nothing is ever refused for size" (T `governing/foundations.md`, line 176). Ruled.
- **How much one read may return.** Process3 set no limit and recorded none. For Claude Code the one figure in hand is the text of this worker's own Read tool: "Reads up to 2000 lines by default". That is documented, not measured. It bounds lines, not bytes, and Process3's lines are long: its Foundations are 306 lines and 69,452 bytes.

## 8. Do these figures settle the four blanks?

1. **A single text read in full: not settled.** Process3's 70,000 bytes was ruled from how large files were. It was overridden every time and never replaced by a measured number. Value I would use: 24,000 bytes, the Codex figure, labelled measured as a size that worked, not as a limit. Process3 adds a warning, and this is my reading: its median requirements file was 32,829 bytes, so at 24,000 more than half of such files would be over, and its record shows what splitting by a byte figure cost.
2. **A set of texts read together: not settled.** The one Process3 figure is 250,000 bytes or 25 modules for a helper, ruled after one failure whose size in bytes was not recorded. Value I would use: 175,000 bytes, the Codex figure, labelled measured as a size that worked, on a set that was almost all filler. It is under Process3's 250,000, so the two do not conflict.
3. **A role's starting text: settled as a ruling, and the ruling held.** Value I would use: 4,096 bytes for a role's principles or rulebook, and at most ten rules. Labelled ruled, and held by a test for the whole week. It was not measured as the size where reading fails. A prompt and a rulebook of 4,096 bytes each make 8,192 bytes, which is the documented Codex figure, so the value fits both harnesses. That sum is my arithmetic.
4. **The fill level: not settled by Process3. Bob's ruling stands.** Process3 ran at 60 percent and the process before it at 40. Both were ruled, and the reason given was cost. Value: 40 percent, labelled ruled (Bob, 17 Nov). Process3 adds one observation, and the conclusion from it is mine: sessions passed a printed level by 5 to 23 points, and compaction was put at about 75 to 78 percent, so a level of 40 leaves room for that overshoot and a level of 60 left little.

So the first, second and fourth blanks hold no measured threshold. How each could be measured is in the second file.

## 9. What was read, and what could not be done

**Read whole.** `design_state_18nov.md` and files 03 and 04 in `harness_separation/`. On T: `tool/lib/cap.mjs`, `tool/lib/size.mjs`, `tool/test/prompt-caps.test.mjs`, `tool/test/rulebooks.test.mjs`, `rulebooks/job.md`, `rulebooks/worker.md`, `shims/CLAUDE.process.md`, `ranges.json`, `.claude/settings.json`.

**Read by whole section.** T `governing/foundations.md`: the sections on roles and sessions, the record, requirements rules and text, what to measure, and open tensions (lines 73 to 134, 174 to 187, 278 to 306). The Ledger: each entry cited above, in full. Evidence `product_side.md` section 6 and `verify_numbers.md` section 7.

**Searched only.** T `README.md` (134 KB; three rows read in full), `DECISIONS.md`, the rest of `tool/lib/`, `setup/conditions.json`, `notes/`, the other rulebooks; the Log (540 KB; the lines cited were read in full); the audits in Evidence; `process4/owner_words/`. Across all 310 branches I searched only for the values of the limits above. Each value is the same on every branch that has it.

**Could not do.**

- The checkout holds one commit for each branch. I could not follow a limit's history from commits, and relied on branch tips and on the audits in Evidence.
- The product's repository is not here. So the reading sizes and costs recorded for each job, and the product's own settings, were not read.
- Two sources are pages outside the repository: the 29 Oct page of the earlier process, and Process3's Build Plan with its table "Text to write, with caps". The earlier byte cap and that table were not read.
- Process3's state branch in this repository holds only rows of GitHub use.
- I ran no measurement.
