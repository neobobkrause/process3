Length: 334 lines. Last section: "6. Third pass".

# The build texts reconciled with the design and with each other

Written by Claude (an editing session with no earlier knowledge of the work) on 18 Nov 2026. Read in full first: the design's eleven parts (892 lines), the three build texts (134, 289 and 198 lines) and the nine files of `starting_texts/` (83, 34, 35, 34, 35, 35, 42, 33 and 31 lines). Edited: only files in `process4/definition/process4_build_v1/`. The design was not edited. Nothing was committed or pushed. Nothing here has run.

## 1. Sizes after the edit

| File | Lines | Bytes | Rules |
|---|---|---|---|
| `01-the-tool-and-the-required-run.md` | 139 | 23,958 | |
| `02-the-forms.md` | 303 | 23,604 | |
| `03-the-walks.md` | 200 | 19,836 | |
| `starting_texts/00-index.md` | 76 | 9,652 | |
| `starting_texts/root.md` | 35 | 3,959 | 10 |
| `starting_texts/watcher.md` | 26 | 2,607 | 9 |
| `starting_texts/coordinator.md` | 29 | 3,599 | 10 |
| `starting_texts/arch.md` | 27 | 4,062 | 10 |
| `starting_texts/process.md` | 29 | 3,439 | 10 |
| `starting_texts/lane.md` | 26 | 3,268 | 8 |
| `starting_texts/job.md` | 27 | 3,347 | 10 |
| `starting_texts/walking-session.md` | 28 | 3,565 | 10 |

How the rules were counted: every numbered line under "Rules". The fill-level line and the "Never:" line are now numbered lines there and are counted. The lines above "Rules" (what the session is, who directs it, what it reads, the acts it may take) are not counted. Each text's last section is now "Rules", and its header says so. Rules were brought to ten by joining related rules into one numbered line and by pointing to the design or a build text; a numbered line therefore often holds several sentences.

## 2. Each change, by file

**`01-the-tool-and-the-required-run.md` (18)**

1. Opening: a note that it is reconciled with part 4, section 11 and build texts 2 and 3.
2. Section 1, "New": the walk issue added.
3. Section 2: the starting texts are beside the tool in `starting_texts/`, and the tool fills in a job's and a walking session's (part 4, section 11).
4. Section 2: the config "holds two lines" became the address and commit id beside the version's name, as build text 2 has it.
5. Section 2: the first command is named "the fetch line", and ROOT's is in the owner's plain prompt.
6. Section 2, what the tool reads: a module's "id" became its "name"; the test command moved from the module list to the config; the share of slots, the walk commands and the most external walkers added; "forms not fixed here" became a pointer to build text 2.
7. Section 3, table: rows for `walk write`, `walk open`, `walk close`, and `run scope`, `walk areas`, `walk text`, `walk read` as reading only.
8. Section 4, opening: "and none beyond" became a statement that commands 19 to 22 are not in the design's list.
9. `push --blocked` now takes the blocking module, which build text 2's record held and the tool needs to make the job ready again.
10. `open --module <id>` became `<name>`; the job block is stated as one comment only the tool writes and reads, its fields in build text 2.
11. `open`: the "Decided here" that ARCH's session runs `branch` and `open` became a reference to part 4, section 11, which now rules it.
12. `next-job`: a slot "of the product's share"; it prints the job text of `starting_texts/` filled in.
13. `failed-runs`: "at two failures" became "at two failed corrections, the third failed run" (part 4, section 10).
14. `state write`: says it is how ARCH's session writes waiting work and a walk's areas and outcomes.
15. Commands 19 to 22 added: `walk open`, `walk close`, `walk write`, `walk read`, `walk areas`, `walk text`.
16. "The run's entry": the design's list now names the run on GitHub's machines; only the told job's call in its session is outside it.
17. Section 7: the walk commands added to piece 3 of the build order.
18. Section 9 rewritten: item 1 narrowed; the walk commands added; the two writers of the job block added; "who opens a job's pull request" and "the forms" struck as answered; the order of `next-job` and `open` added. Header 134 to 139 lines.

**`02-the-forms.md` (12)**

1. Opening: a note that it is reconciled.
2. Section 2, table: "a job's record lines, comments" became "a job's record, one comment, the job block".
3. Section 3: a line that the test command is in the config, and a line that a module is identified everywhere by its `name`.
4. Section 7, example: `process.repository`, `tranche_branch`, `node`, `lock_files`, `test_command` and `walk` (two commands and the most external walkers) added.
5. Section 7: one line for each new field; `slots.share` cites part 2, section 5.
6. Section 7: `test_command` marked "Decided here" as one command for the product (see section 3, item 7 below).
7. Section 8, title: "a job's record lines" became "a job's record".
8. Section 8: each recorded decision of the owner is one pull request the coordinator opens and merges (part 4, section 11).
9. Section 8: each decision of ARCH's is one pull request ARCH opens and merges.
10. Section 8: the three plain-line comments were replaced by build text 1's one job block, with its JSON fields and a table of which command and session writes each.
11. Section 8: the line "Related tests run in this session: <n> files, passed" was removed; the design says "No test runs, because nothing changed."
12. Section 9: item 7, "Agreement with build text 1 ... not reconciled", struck. Header 289 to 303 lines.

**`03-the-walks.md` (15)**

1. Opening: a note that it is reconciled and where the commands are.
2. Section 2, step 1: the tool's listing named `walk areas`.
3. Section 2, step 6: the round record written with `state write`.
4. Section 4, step 1: the starting instructions are filled in by the tool (`walk text`) and name the walk issue.
5. Section 4: a paragraph added from part 4, section 11: a walking session starts no workers, and what it does at the fill level.
6. Section 4: "the process config gains two lines" became "holds two commands", with build text 2's field; "two more entries than the design's list" corrected, since part 0 now names them.
7. Section 5: the figure named `walk.most_external_walkers`.
8. Section 6: opening the issue named `walk open`.
9. Section 6: a walking session's comment named `walk write`.
10. Section 6: "this adds a place the design's rule on messages did not list" corrected; part 4, section 8 now names the walk's issue.
11. Section 6: ARCH's reading named `walk read`.
12. Section 6: the waiting-work write named `state write`, and the job's reading `walk read`.
13. Section 6: closing named `walk close`.
14. Section 7: the tool's acts named by command; a line that the walk commands are not in the design's list; "never reads a flaw's words" became "never judges", since `walk read` prints them.
15. Header 198 to 200 lines.

**`starting_texts/root.md` (8)**

1. Part A: the blank for where ROOT's text is kept became the fetch of the process's copy and `starting_texts/root.md` (part 4, section 11).
2. `p4` defined; acts name `state read`, `state write --create` and `state write`.
3. "Set your hourly scheduled wake" became "make your own"; the watcher makes its own.
4. Rule 1: reads the roles record to tell a restart, and archives first on one.
5. Rule 4: a stopped session is woken by message, and replaced at the next wake, or by ARCH where ARCH started it.
6. Rule 7: ROOT sends the one plain message where the coordinator is what has stopped.
7. Rules joined: restart into rule 1; archiving into the refresh rule; refusals and process fault into one.
8. Fill level and "Never" became rules 9 and 10; the natural pause defined; reading list shortened to part numbers. 42 to 35 lines.

**`starting_texts/watcher.md` (4)**

1. Fetch line and `p4` added; acts name `state read` and `state write`.
2. Rule 5 names `starting_texts/root.md`, part B.
3. Refusals and process fault joined into one rule.
4. Fill level and "Never" became rules 8 and 9. 31 to 26 lines.

**`starting_texts/coordinator.md` (8)**

1. Fetch line and `p4` added; acts name the commands.
2. It now opens and merges its own record's pull requests, one for each decision (part 4, section 11); "Never: merge" narrowed to match.
3. Rule 5: the standing page shows what PROCESS and ROOT pass it; the coordinator sends the one plain message when the process is completely blocked.
4. Rule 6: a request for a full external walk goes in the standing notes with a message, as the other three do; the stop joined into this rule.
5. Rule 7: the account also names flaws set aside with ARCH's reason, areas not walked and modules blocked (build text 3; part 2, section 4).
6. Process fault joined with refusals.
7. "Remove a standing note" as a separate act dropped; it is a `state write`.
8. Fill level and "Never" became rules 9 and 10. 35 to 29 lines.

**`starting_texts/arch.md` (10)**

1. Fetch line and `p4` added; acts name every command ARCH uses, the walk commands among them.
2. "Who directs you": the coordinator's message carrying the owner's marked words is an instruction; the rest reaches ARCH by the standing notes and a message.
3. Reading set: build text 3 added; the process config, the procedures added to what it writes.
4. Rule 1: ARCH opens and merges what it writes, one pull request for each decision; the requirement-text rule joined in.
5. Rule 2: `next-job`, `branch`, `open`, then start; `merge`, `notify`; replacing a session at the fill level or after failed runs.
6. Rule 3 shortened to a pointer to part 2, section 8.
7. Rules 4 and 5: the walk as build text 3 has it: areas, the walk issue, the three outcomes for a flaw, the round record, closing the issue; loops by pointer to part 4, section 10.
8. Tranche and release joined into rule 6; lanes and what the coordinator needs into rule 7.
9. "You do not start your own replacement" moved into "Never".
10. Fill level and "Never" became rules 9 and 10. 34 to 27 lines.

**`starting_texts/process.md` (6)**

1. `p4` defined; acts name the commands.
2. It writes the build texts and the starting texts (part 4, section 11), and reads a build text in full before changing it.
3. Rule 7: only PROCESS changes the tool and the starting texts; the size and ten-rule limit with the "never" lines counted; where it cannot be kept, to the owner (part 5, section 3).
4. Rule 8: what waits for the owner goes to the coordinator for his page.
5. Rules joined: options with grouping; research with approval; tool tests with harness files.
6. Fill level and "Never" became rules 9 and 10. 35 to 29 lines.

**`starting_texts/lane.md` (5)**

1. Fetch line and `p4` added; acts name the commands.
2. It opens and merges its own folder's pull requests (see section 3, item 5 below); "Never: merge" narrowed to match.
3. The UX lane reads build text 3 and keeps the documents as one page for each group of screens and each journey.
4. Ten rules joined into six.
5. Fill level and "Never" became rules 7 and 8. 35 to 26 lines.

**`starting_texts/job.md` (9)**

1. Fetch line and `p4` added; ARCH made the branch and the pull request.
2. Acts name `push`, `push --blocked`, `ready`, `results`, `close --nothing-to-change`, `listing`, `check`, `run scope --pr`; "write a record in the pull request" dropped, since the tool has no such act.
3. It may run its module's tests on its own machine (part 4, section 11).
4. It may change `uses` in its entry and writes walk steps (build texts 2 and 3); reading set gains build texts 2 and 3 and the module's entry.
5. Rule 4: tests and steps both name their requirement.
6. Rule 7: `run scope --pr` names a told job's tests; a walk flaw that needs no change goes back to ARCH.
7. Fill level: push, one message to ARCH, stop (part 4, section 11), in place of "write in the pull request what a successor needs". It shares rule 9 with refusals and the process fault.
8. "Never commit built files" moved into "Never".
9. "Never" became rule 10. 34 to 27 lines.

**`starting_texts/walking-session.md` (8)**

1. Opening blanks are those the tool fills: number, tranche, round, areas, walk issue, folder, the two commands, the copy.
2. Reading set gains build text 3; each area's page, not the whole document.
3. Acts follow build text 3: build and serve locally with the stand-in; the first-use door and its own sign-in; steps in the background and by hand; `walk write`, `walk read`.
4. Rules 2, 4, 5 and 6 are build text 3's: measured against the page; the forms and twenty flaws; a step that uses AI; a hosting limit is not a flaw; one area one command; one message after the last write.
5. "Each step exists only to prove a requirement" dropped as a rule for the walker, who writes no step; "Never" now forbids changing steps.
6. Fill level: finish the comment, one message, stop.
7. Refusals and process fault joined.
8. Fill level and "Never" became rules 9 and 10. 33 to 28 lines.

**`starting_texts/00-index.md` (7)**

1. Opening: reconciled note.
2. Section 1: how the rules are counted; table with new bytes, rules and last section.
3. Section 1: least room is `arch.md`, 34 bytes; which texts carry the fetch line.
4. Section 2: the design's part sizes as they now are (96,123 in all) and every combined figure recomputed.
5. Section 2: a build-texts column, and why four reading sets gained build texts.
6. Section 3: two lines adjusted for "Never" being a numbered rule.
7. Section 4: 24 items became 13: fourteen struck, eight narrowed, two unchanged, three new. Header 83 to 76 lines.

## 3. Where a build text needs what the design does not hold, or differs from it, and the rulings did not settle it

1. **The walk commands are not in the design's list of what the tool does.** Design, part 6, section 5: "It does only this: make a branch; push; open a pull request, mark it ready, and close it; merge; ..." with no act on an issue other than the shared state. Build text 3, section 7: "It opens and closes the walk issue ..., writes a walking session's comment ..., prints the issue". Build text 3, section 2: "The tool (`walk areas`) lists the round's changed modules". I added commands 19 to 22 to build text 1, marked there as outside the list. The design does hold two neighbours: part 4, section 8, "for a walk in that walk's own issue", and part 4, section 11, "The tool fills in a job's and a walking session's."
2. **A told job running the scope in its own session.** Design, part 6, section 5: "on GitHub's machines, set the scope of the required run and run the tests chosen". Build text 1, section 4: "A told job also calls `run scope --pr <n>` in its session to learn its related tests". Kept, and listed in build text 1, section 9.
3. **The job's record has two writing sessions.** Design, part 4, section 4: "GitHub keeps no guard against two writes to one comment at the same moment: one is lost, silently. So every record has exactly one writing session." Build text 1, by the ruling: one job block, written by ARCH's session (`open`, `notify`) and by the job's (`push --blocked`, `close --nothing-to-change`). The design's sentence is about the shared state's records, so this is not a plain contradiction, but the reason it gives applies. Also the design's list has no act for writing the record; it rides on `push` and `close`.
4. **A walking session at the fill level.** Design, part 4, section 11: "A job or walking session that reaches the fill level pushes, tells ARCH in one message, and stops. ARCH replaces it from the same branch." Build text 3, section 6: "nothing is a file or a commit", and a walking session has no branch of its own. Build text 3 and the walking text have it finish its comment, tell ARCH and stop, with ARCH giving the areas that remain to a fresh session.
5. **Who merges a lane's folder.** Design, part 4, section 11: "The role that writes one opens it and merges it by the tool: ARCH for requirement text, the module list and its decision record; the coordinator for the owner's decision record; PROCESS in the process's repository". A lane is not named. The first draft of `lane.md` said "Never: ... Merge or deploy." I took the opening sentence and let a lane merge its own folder's pull requests. This is a reading.
6. **Config fields beyond the design's list.** Design, part 0, section 6: the process config holds "the process version it runs on, the default slot number, its lanes, its hosting provider and development account, the folder of the walks' documents, the commands that build, serve and walk the product on one machine, the most external walkers, and the language reader the tool uses." By the ruling build text 2 now also holds the process repository's address and commit, the tranche branch, the Node version, the lock files, and (already there) the process folder and the share of slots, which part 2, section 5 names.
7. **The test command.** Build text 1 read "each module's ... test command" from the module list. Build text 2 said an entry is "a JSON object with exactly four fields", none a command. No ruling covers it. I put one `test_command` in the config, marked "Decided here" in build text 2, and changed build text 1 to read it there.
8. **When the tool tells ARCH of failed runs.** Design, part 4, section 10: "After two failed corrections it tells ARCH". Build text 1 said "At two failures". I changed it to "two failed corrections, the third failed run", reading a correction as following a first failure. If the owner means two failed runs, the earlier wording was right.
9. **Build texts in a session's reading.** Design, part 4, section 11: "This design is kept there too, and a session reads it from its read-only copy." It does not say the build texts are in the copy or that any session reads them, yet part 3, section 3 sends a walk's making to build text 3, and the forms a job must write are only in build texts 2 and 3. I added build text 3 to ARCH's, the walking session's and the UX lane's reading, and build texts 2 and 3 to a job's (43,440 bytes more for every job). This is a cost someone should choose.
10. **A filled text can pass 4,096 bytes.** Design, part 5, section 2: "A role's starting text | 4,096 bytes". `arch.md` is 4,062 with its fetch line and product name still blank. Whether the limit is on the text or on the text as filled is not said.
11. **`next-job` and `open`.** Build text 1: `next-job` "prints the module and its starting instructions ... the pull request"; and "ARCH's session runs `branch` and `open` for a job before starting its session". The text is written before the pull request exists. Listed in build text 1, section 9; not chosen.

## 4. Still silent

The thirteen items of `starting_texts/00-index.md`, section 4, in short:

1. Whether a text ROOT reads after its start counts with the permission checker as its starting instructions.
2. The design folder's name inside a session's copy, and whether the build texts are there.
3. How ROOT finds PROCESS's record while holding only the product's repository.
4. Who merges a pull request on a lane's folder (item 5 above).
5. How a told job hands back a walk flaw that needs no change, and what becomes of its pull request.
6. A walking session at the fill level (item 4 above).
7. How the pull request's number reaches a job's starting text (item 11 above).
8. To which product's coordinator PROCESS passes what is the owner's to see.
9. A lane's acts on its design pages, and how the owner's marked message typed there reaches the coordinator.
10. Tagging and titling started sessions, known for Claude Code only.
11. Which copy of the tool PROCESS runs in the process's own repository.
12. Whether the lines above "Rules" in a starting text count toward ten.
13. Where a module's walk steps lie in its entry, and whether a changed step sets off the module's tests.

Also still as the build texts left them, and not touched: build text 1, section 9, items 4, 5, 7, 8 and 9; build text 2, section 9, items 1 to 6; build text 3, section 9, the five matters that are the owner's.

## 5. Second pass

Made after the design settled the eleven matters of section 3. Re-read first: part 4, section 11; part 6, section 5; part 0, section 5. Sections 1 to 4 above stand as the record of the first pass; the sizes and the unsettled list below replace theirs.

**`01-the-tool-and-the-required-run.md` (12; 139 lines, 23,941 bytes)**

1. Section 4, opening: the mark that the walk commands are outside the design's list removed.
2. `open --module`: the job block is written once, by ARCH's session only; `open` now prints the job's starting instructions with the pull request filled in; the order `next-job`, `branch`, `open`, start stated.
3. `next-job`: prints the module, its work and its kind, and no longer the starting instructions.
4. `push --blocked`: writes into the job's own record, not the job block.
5. `close --nothing-to-change`: the job's record defined as a second comment, mark `<!-- process4-job-record -->`, written only by the job's session.
6. `notify`: no longer adds uses to an open job's block; writes waiting work and prints which told module has a job open.
7. `walk text` and `walk areas` split into commands 22 and 23; `walk areas` said plainly to be a listing ARCH reads, the naming being ARCH's judgment.
8. Command 24 added, `related <pr>`: lists a told job's related tests and runs nothing; it replaces the told job's `run scope --pr`.
9. "The run's entry": `run scope` and `run tests` are on GitHub's machines only.
10. Section 3, table: `related` among the reading commands; a note that `open`, `close` and `push` may write a comment.
11. Section 7: piece 5 names `related`.
12. Section 9: four items struck as settled (the told job's listing, the walk commands, the comment act, the order of `next-job` and `open`); two added (items 1 and 2 below).

**`02-the-forms.md` (3; 304 lines, 23,692 bytes)**

1. Section 2, table: "a job's kind and its record, two comments", with the writer of each.
2. Section 8: the one block split in two: the job block (module, kind, uses) written once by ARCH's session, and the job's record (`blocked` or `nothing_to_change`) written only by the job's session.
3. Section 8: the "Decided here" cost changed from "two sessions write the one comment" to "a notice that arrives while the job is open cannot be added to its block".

**`03-the-walks.md` (4; 200 lines, 19,738 bytes)**

1. Section 4: at the fill level a walking session writes its last lines in the walk issue, tells ARCH and stops; ARCH gives the areas not yet walked to a fresh session; no commit and no branch.
2. Section 2, step 1: `walk areas` called a listing ARCH reads.
3. Section 7: "not in the design's list" became "acts of the design's list".
4. Opening: the reconciling note shortened.

**`starting_texts/arch.md` (6; 27 lines, 3,661 bytes; 4,063 filled; 10 rules)**

1. Rule 2: `next-job` chooses, ARCH runs `branch` and `open`, then starts the session with the text `open` prints.
2. Rules 4 and 5: the walk and its flaws by pointer to build text 3; unwalked areas go to a fresh walking session; notices and reported flaws placed in waiting work.
3. Rules 3, 6 and 7 and "Who directs you" shortened; "No review" dropped from rule 2, since "Never" forbids adding one.
4. The acts' command list shortened in form, every command kept.
5. The `p4` line no longer repeats the commit id, in every text that carries the fetch line.
6. Trimmed from 4,062 to 3,661 bytes so that it passes as filled.

**`starting_texts/job.md` (6; 26 lines, 3,304 bytes; 4,028 filled; 10 rules)**

1. Opening: ARCH made the branch and pull request and wrote the job's kind there.
2. Acts: `related` in place of `run scope --pr`; the commands listed once after `p4`.
3. Rule 7: `related` only lists; a told job that changes nothing runs no test.
4. Rule 8: `--blocked` and `--nothing-to-change` write the job's own record.
5. Rule 3: the duties of tests by pointer to part 2, section 6.
6. "<module>" used once, in the opening, to shorten the filled text.

**`starting_texts/walking-session.md` (3; 28 lines, 3,512 bytes; 4,000 filled; 10 rules)**

1. Rule 9: at the fill level, last lines in the walk issue, tell ARCH which areas are not yet walked, stop; no commit and no branch.
2. Rule 3: the three kinds of flaw by pointer to part 3, section 3, joined with the forms.
3. Rule 4 is now the comment and the one message, moved out of rule 6.

**`watcher.md`, `coordinator.md`, `lane.md` (1 each; 2,614, 3,606 and 3,275 bytes)**: the `p4` line only. `root.md` (3,959) and `process.md` (3,439) unchanged. `lane.md` already had a lane merge its own folder's pull requests.

**`starting_texts/00-index.md` (5; 84 lines, 9,609 bytes)**

1. Section 1: the limit is on the text as filled; new bytes.
2. Section 1: a table of the three texts as filled, with what they were filled with.
3. Section 2: the design's part sizes as they now are (96,802 in all), the build texts' sizes, and every combined figure recomputed.
4. Section 2: the reason for build texts in reading sets now cites part 0, section 5.
5. Section 4: 13 items became 11: four struck (the design folder and build texts in the copy; a lane's merges; a walking session at the fill level; the pull request's number), two added.

**The fill used for the check.** A product name of 40 characters; a fetch line of 383 bytes (`git clone` of a full address, checkout, `npm ci`, `chmod`, the 40-character commit id four times). For the job: a 13-character module, 166 bytes of work, a told job with six uses. For the walking session: an external walk of four journeys.

**Still unsettled**

1. **`walk areas` and `walk text` are not named one by one in the design's list** (part 6, section 5). `walk text` rests on part 4, section 11, "The tool fills in a job's and a walking session's." `walk areas` reads modules' step headers and requirement text, which is none of "open and close a walk's issue, and write and read what is in it"; build text 1 calls it a listing ARCH reads.
2. **A notice to a module whose job is already open.** The design: ARCH's session "writes there, once, the job's kind and the uses its notice carries." Build text 1's `notify` formerly added later uses to the open job's block. Now it writes them to waiting work and prints the module; how they reach the open job is not chosen. The design's waiting-work record is for "modules with no open job".
3. **A filled text over the limit.** `arch.md` passes by 33 bytes with the fill above. A job told of many more uses, or a longer fetch line, would pass 4,096 bytes; the design says the tool refuses nothing for size and does not say what then happens.
4. The eleven items of `starting_texts/00-index.md`, section 4, of which 4 and 11 are items 2 and 3 here.

## 6. Third pass

Made after three last rulings. Re-read first: part 6, section 5; part 2, section 7; part 4, section 11. The sizes here replace those of sections 1 and 5.

**`01-the-tool-and-the-required-run.md` (7; 137 lines, 23,852 bytes)**

1. `walk areas`: now "lists the modules a round changed and the areas they name, for ARCH to choose from", citing part 6, section 5; the "listing ARCH reads, no choice of the tool's" wording removed.
2. `walk text`: fills names and addresses only; a walking session's areas stay in the round record.
3. `notify`: a notice to a module whose job is open waits in waiting work until that pull request merges or closes; the next job is the told job; nothing is passed to the open job.
4. `open --module`: the job's text is filled with the fetch line, module, branch and pull request only; the job block also holds the work placed.
5. `open` on a branch whose pull request is already open also prints the job block, which is how a job reads its work, kind and uses.
6. The fetch line names the commit id once, as a shell variable.
7. Section 9: items 1 and 2 struck as settled; five remain.

**`02-the-forms.md` (3; 305 lines, 23,935 bytes)**

1. Section 8: the job block gains `work`, the work placed.
2. Section 8: a line that the job's starting text carries none of the block and names the pull request.
3. Section 8: the "Decided here" cost now says a notice to an open job waits for the module's next job.

**`03-the-walks.md` (3; 200 lines, 19,776 bytes)**

1. Section 2, step 1: "a listing ARCH reads" removed from `walk areas`.
2. Section 4, step 1: the starting instructions name the walk, the walk issue and the commands; the areas stay in the round record.
3. Section 6: a flaw's number, module and link are carried by the job block, not the job's starting instructions.

**`starting_texts/job.md` (2; 26 lines, 3,267 bytes; 3,550 filled; 10 rules)**

1. Opening: the work and the uses are no longer filled in; the job block on the pull request holds them, and `p4 open` prints it.
2. Acts: `open` added, to print the pull request and job block.

**`starting_texts/walking-session.md` (3; 28 lines, 3,568 bytes; 3,788 filled; 10 rules)**

1. Opening: the areas are no longer filled in; the round record gives them by the session's number.
2. Acts: `p4 state read` added.
3. Rule 1: "the areas named above" became "the areas given you".

**`starting_texts/arch.md`**: unchanged, 3,661 bytes; 3,878 filled with the shorter fetch line.

**`starting_texts/00-index.md` (5; 82 lines)**

1. Section 1: the job and walking-session rows say what is filled in and what stays in the pull request or round record.
2. Section 1: the filled table redone with a fetch line of 198 bytes: 3,878, 3,550 and 3,788.
3. Section 2: the design's part sizes as they now are (97,320 in all), the build texts' sizes and every combined figure recomputed.
4. Section 4: the notice to an open job and the over-long filled text struck; nine items remain.
5. Opening: "reconciled three times".

**Still unsettled**

1. A job reads its job block by running `open` on its own branch. That is my choice of an existing command; the design's list has "write a job's kind and record on its pull request" and no act named for reading it.
2. The job block now holds the work placed, where part 4, section 11 says ARCH's session writes there "the job's kind and the uses its notice carries". The ruling that the work "stays in the pull request" is what put it there.
3. The nine items of `starting_texts/00-index.md`, section 4.
