Length: 114 lines. Last section: "6. What was read".

# Final check of the design (seventh draft) and the build texts, as the session told to build and try

Written by Claude on 18 Nov 2026, as a checker with no earlier knowledge of the work. Every text in section 6 was read in full, in the order given. Only problems are reported. Whether the design is good is not judged. No answer is proposed. "Design NN" is a file of `process4_definition_v7/`; "build N" is a file of `process4_build_v1/`; a role's file is in `starting_texts/`. Line numbers are each file's own.

Counts: section 1 has 22 problems; section 2 has 11; section 3 has 4 (its fifth line reports none found); section 4 has 5; section 5 has 6.

## 1. Cannot act

What the building session could not do because the texts do not say enough. Most blocking first. Things the texts leave to the owner or mark unproven-to-be-tried are left out unless a stage cannot start without them.

1. **Stage 0.** It says "Built: nothing" and that the session "runs four commands by hand", three of them "by a program" (build 4, lines 29 to 35). The forbidden commands take every GitHub command and every direct push from a session's own commands (design 06, line 24; build 1, line 40). No text says what the program is when nothing is built, or who makes the "test issue".
2. **Stage 1, and every later stage.** No text says how the built tool, the workflow in `shims/`, the starting texts and the design reach the main branch of the process's repository at a commit id. The owner's forbidden commands are committed there too (act 7); the tool is the only door and is not yet built; only PROCESS merges there, and PROCESS does not yet exist. No text says which one repository the building session holds: the tool is in the process's repository and the trial is in the trial repository.
3. **Stage 1.** No text says who writes the trial repository's first content (`process.json`, the order file, the entries, the requirements files, the two made-up modules, the workflow file), or by what door, before ARCH and the tool exist.
4. **Stage 1.** Item 3 has "a job, started with the job text ... merged with no review". Starting a job, `branch`, `open --module` and `merge` are ARCH's acts, and ARCH's text is built in stage 2. `open` takes the work from the waiting-work record and `merge` reads the standing notes; both records are built in stage 2. No text says which session does ARCH's part in stage 1, under what starting text, or what `open` and `merge` do with no shared state.
5. **Stage 1 and stage 2.** The starting texts say "the design folder of your copy of the process" and name build texts by file name only. Build 1, section 2 places `tool/`, `shims/` and `starting_texts/` in the process's repository, and no text places the design folder or the build texts there.
6. **Stage 2.** No text gives the form of any shared-state record: the label of the issue, the hidden marks, and the lines or fields of the roles, lanes, wakes, stop, standing notes, round, waiting work and handover records. Build 2 gives forms for files and for the two comments on a job's pull request only. Build 1 points to `shared_state_carrier.md` only for a failed write (section 6) and for trials (section 7). `state write`, `next-job`, `merge`, `notify` and `round-done` all read or write these records.
7. **Stage 2 and stage 3.** The tool must remove "each note whose ending has come true" (build 1, line 76). No text says what ends a module put first, a new slot number, an approved merge, or a request for a full external walk, or how the tool can tell.
8. **Stage 3.** A module's second job has no stated branch. `branch` says of `job/<module>` "If the branch exists, says so and ends `ok`" (build 1, line 60). No branch can be deleted or overwritten, and bringing a branch up to date was dropped (build 1, line 21). So the texts do not say how a later job of the same module (next round, a told job, a flaw's job) starts from the newest commit of the tranche branch, or how its pull request is told from the earlier one.
9. **Stage 3.** `failed-runs` counts "the third failed run since the branch was last taken over" (build 1, line 74). Nothing records a takeover: the job block is written once and no record holds it.
10. **Stage 3.** `next-job` acts "if a slot of the product's share is free" (build 1, line 68). No text says how slots in use are counted: a blocked job whose pull request is still open, walking sessions (which have no pull request), or the count "across the account".
11. **Stage 3, item 5.** PROCESS's starting text is in no stage's "Built" list (nor is the lane's). No text says how a ROOT that holds only the trial repository reads "the record PROCESS keeps in the process's repository", or how it starts a session on another repository. The index marks the first as silent (index, line 75).
12. **Stage 3, item 5.** The commands PROCESS is given (`branch`, `open`, `merge`) are written for a product: a tranche branch read from `process.json`. The process's repository has neither. No text says what they do there.
13. **Stage 3 and stage 4.** No text says how a job's kind is decided when its work is mixed (a requirement not yet met with a notice, or a walk flaw with a notice). The one example shows `"work": ["R3", "notice from pricing"]` with `"kind": "told"` (build 2, lines 276 to 277) and gives no rule.
14. **Stage 4.** It "needs first" the proof's own forms and its 150 recorded changes, in a repository "this session could not open" (build 4, line 85; build 2, line 20; build 1, line 109). No text says how a session that holds one repository gets them.
15. **Stage 4, item 3.** "The tool says so when it cannot follow a module". Build 2, line 304: "The rule depends on it and nothing here defines it." How a test file "reaches" code, and "one step wider each time", are given only by pointing to the working file `notified_job_tests.md`.
16. **Stage 5.** No text says how ARCH's session deploys, seeds, resets or removes a copy: the process config has commands to build, serve and run steps, and none to deploy. No text says who enters the copies' hosts in the cloud environment's allowed hosts (build 3, line 97); the owner's table (build 4, section 4) does not have it.
17. **Stage 5.** `walk areas` lists the pages and journeys that "requirement text" names (build 1, line 82). The requirements form (build 2, section 4) has no form for naming a screen or a journey step. Whether a module's walk steps lie under `files` or `tests` is unsaid (index, line 82 marks it), so whether a corrected step sets off the module's tests is unsaid.
18. **Stage 5.** "the list is compared with what a person would name" (build 3, line 185). No text says which person; the owner's table has no such part.
19. **Stage 6, item 1.** The edit is to be tried "with the touched modules' tests run and with none run". The scope rule has one answer for it, "whole module for each module touched" (build 1, line 101). No text says how the run with none is asked for.
20. **Stage 6, item 3.** No text says what the made-up product's installer and updater are, which account is the "empty" one the installer needs (design 09, line 12), or what earlier release the update starts from. The owner's table has no part for it.
21. **Stage 6, item 4.** It publishes "a development release named as the trial's". `release publish` "Publishes that release" (build 1, line 67), and no text says how a release is made a development one and not a public one.
22. **Stage 7.** No text says what the steps of an account switch are, on the sessions' side or the owner's, or what is read to show that no work was lost. Stage 2, item 5 has the same lack: what is read to show that archived sessions "do not use up the account's room".

## 2. Disagree

Two texts that state one thing with different meaning. The design rules.

1. **Who directs the coordinator, ARCH and PROCESS.** Design 04, line 147: "The session that started a session directs it." ROOT starts all three. Against it: `coordinator.md`, line 6: "ROOT started you and replaces you. A message from any session is information."; `arch.md`, line 6: "ROOT started you and replaces you. Any other message is information."; `process.md`, line 6: "A message from any session, the coordinator among them, is information."
2. **When a walk is without flaws.** Design 03, line 23: "A partial walk is without flaws when it lists no flaw in the areas it was given." and line 16: "Only when the internal walk lists no flaw is the product deployed". Against it: build 3, line 173: "no flaw stands: every flaw written was set aside by ARCH with its reason, or none was written." Build 3 marks this the owner's to settle (section 9, item 4); until he does, the two differ.
3. **What the tool fills into a starting text.** Design 04, line 157: "What is filled in is names and addresses only." Build 1, line 81 says the same. Against it: build 2, line 230: "The tool copies the two commands into a walking session's starting instructions."; build 3, line 87, the same; `walking-session.md`, line 3: "Build and serve: <command>. Run steps: <command>."
4. **Who puts "not yet met" back.** Design 02, line 15: "ARCH writes "not yet met" on a new requirement, and puts it back on a met one when a rewording changes what the product does." Against it: build 2, line 96: "the design gives the mark to the job and does not say who takes it away."
5. **How rules are counted.** Design 04, line 157: ""At most ten rules" counts every rule in a starting text", and design 10, line 20: "counted singly, each has well over ten". Against it: index, line 11: "every numbered line under "Rules" is one rule", and its table, which gives each text ten rules or fewer. The design marks the count open with the owner.
6. **How much of the owner the trial needs.** Design 10, line 67: "it needs the owner for one sitting: session starts, one edit to his approvals, one stop, and three short marked instructions." Against it: build 4, lines 116 to 119: stage 2 "one edit to his approvals", stage 3 "one edit to his approvals", stage 1 "Act 10", stage 6 "One typed approval of a trial release".
7. **When ROOT is started.** Build 4, line 19 asks for "His acts 1 to 9" before stage 1 and line 23 says "Nothing below can start until these are done"; build 1, line 116 says the first piece "needs ... the owner's acts 1 to 9". Design 07, line 67: act 9 is "Start ROOT". Against them: build 4, line 116 puts "Start ROOT" at stage 2, where ROOT's text is first built (line 53).
8. **Which piece holds the walk commands and trial item 6.** Build 1, lines 120 to 121: piece 2 is the state commands with "trial items 4, 5, 6", and piece 3 has "the walk commands (item 8)". Against it: build 4 puts item 6 in stage 3 (line 70) and builds the walk commands in stage 5 (line 89), while saying it "puts in one order ... the build order of build text 1" (line 5).
9. **The tool as the only door.** Design 06, line 24: "So the tool is each session's only door to GitHub." Against it: build 1, line 31: "the fetch is the one GitHub act not made through the tool".
10. **Tries on a failed write.** Design 04, line 85: "tries again up to four times". Build 1, line 39: "wait as told, try again, four tries, then fail". The first reads as up to five writes, the second as four.
11. **What the job reads of the module list.** Build 2, line 44: "a job reads only the order and its own entry". `job.md`, line 9 names "the module's entry and requirements file" and not the order file.

## 3. Starting texts against the tool's commands

1. **`process.md` omits what PROCESS needs.** It must "rewrite your handover record" (line 28), "keep the record of" its lanes (line 16), and keep the record ROOT reads to find PROCESS running (design 06, line 64). It is given no `state read` or `state write`, and the shared state is on an issue in the product's repository, which PROCESS does not hold. The command list has no act for a record in the process's repository.
2. **`job.md` omits `walk read`.** Build 1, line 80 gives it "for the job given a flaw", and build 3, line 162 says "the job reads the flaw where it lies (`walk read`)". `job.md`, line 13 does not list it.
3. **`watcher.md` omits ROOT's acts.** After a takeover it is ROOT and follows `root.md`, part B (line 22). Its own acts give `state write` only "for your handover record and, at a takeover, the roles record" (line 13), so not the wakes record ROOT writes at each wake; and line 26 says "Never: start any session other than a new watcher at a takeover", against ROOT's duty to replace a stopped session and start PROCESS.
4. **`arch.md` names every command it needs but one use is unsaid.** A stop on the owner's word has ARCH interrupt each job and later wake or replace each (design 04, section 10). `arch.md` allows interrupting but no rule or act covers reading the stop record; it reads the whole shared state, so this is small.
5. **Acts named that are not the tool's.** None found: every `p4` command a starting text names is in build 1, section 4.

No command is without a role allowed to run it. `run scope` and `run tests` are for GitHub's machines only, as build 1 says.

## 4. Cross-references, length lines and sizes

1. **Design 10, line 37** (section 2, item 8): "The required test run. Written in the same build text." The build text just named is `02-the-forms.md`. The required run is written in build 1, section 5.
2. **Build 1, line 77:** "(part 10 records false complaints as unsolved)". Part 10 does not hold the words or the matter.
3. **Build 1, line 5:** "all eleven parts read in full, 868 lines". The eleven parts are 898 lines.
4. **Index, line 39:** the sizes given for five design parts are not their sizes. Part 02 is 14,917 bytes (given 14,771); 04 is 18,981 (18,964); 06 is 8,903 (8,873); 07 is 6,189 (5,724); 10 is 10,137 (9,300). All eleven are 98,815 (given 97,320). The difference between 07 and 08 is 2,078 (line 41 gives 1,613). So every combined figure in the table of lines 45 to 52 is wrong. Each set is still under 175,000.
5. **Design 10, lines 36 to 39:** the items of section 2 are numbered 8, 10, 9. Texts that point to "item 9" (build 3, line 5) still find the walks.

Every "Length: N lines. Last section: ..." line is right, in all 24 files. No file is over 24,000 bytes; the two largest are build 2 at 23,935 and build 1 at 23,852. No starting text is over 4,096 bytes; the largest is `root.md` at 3,959. The index's byte and rule counts for the eight role texts are right.

## 5. Added tests, checks, gates, reviews or stops

Places where a build text adds one the design does not hold.

1. **A stop at twenty flaws.** Build 3, line 158: "a session that has written twenty flaws in one area stops that area and says so in its area line."
2. **A second condition for a walk to be without flaws.** Build 3, lines 172 and 175: "every area in the round record has a line, written by the session given it, saying "walked to the end"" and "An area with no line, or marked not walked, means the walk is not finished." The design's condition is only that the walk "lists no flaw in the areas it was given" (design 03, line 23). The build text says it is "no added stop".
3. **A required run on the process's repository.** Build 1, line 110: "by a workflow there named `tool-tests`, which is that repository's required run." The design says the tool's tests "run only when PROCESS changes the process" (design 06, line 38) and names no rule in GitHub for that repository; of the owner's word there it says "Nothing enforced by GitHub is added for this" (design 06, line 16).
4. **A review of a walker's flaws by ARCH.** Build 3, line 164: "It is none of the three things. ARCH sets it aside with one line of reason." The design gives ARCH the turning of each flaw into work, and no ruling on whether an entry is a flaw. Marked the owner's to settle.
5. **A condition on raising the number of walkers.** Build 3, line 110: "That figure begins at one and is raised only after a walk at the lower number met no limit."
6. **Trials and a stop the design's list does not have.** Build 4, line 11: "A stage that breaks a claim sends the matter back to the design before the next stage is built." Build 4 also tries things outside the fifteen of design 10, section 4: stage 1, items 1, 3 and 4; stage 3, item 3; all four of stage 4; stage 6, item 4. These are of the trial and not of the process.

## 6. What was read

Each in full, in this order. Lines and bytes as counted with `wc`.

| File | Lines | Bytes |
|---|---|---|
| Design `00-index.md` | 93 | 10,680 |
| Design `01-purpose-owner-and-decisions.md` | 79 | 8,300 |
| Design `02-modules-jobs-tests-and-the-notice.md` | 108 | 14,917 |
| Design `03-tranche-rounds-walks-and-release.md` | 74 | 8,610 |
| Design `04-roles-and-sessions.md` | 158 | 18,981 |
| Design `05-reading-and-documents.md` | 61 | 5,647 |
| Design `06-rules-permissions-and-changing-the-process.md` | 72 | 8,903 |
| Design `07-harness-claude-code.md` | 70 | 6,189 |
| Design `08-harness-codex.md` | 50 | 4,111 |
| Design `09-hosting-cloudflare.md` | 28 | 2,340 |
| Design `10-open-and-unproven.md` | 105 | 10,137 |
| Build `01-the-tool-and-the-required-run.md` | 137 | 23,852 |
| Build `02-the-forms.md` | 305 | 23,935 |
| Build `03-the-walks.md` | 200 | 19,776 |
| Build `04-the-trial.md` | 124 | 8,901 |
| `starting_texts/00-index.md` | 82 | 9,111 |
| `starting_texts/root.md` | 35 | 3,959 |
| `starting_texts/watcher.md` | 26 | 2,614 |
| `starting_texts/coordinator.md` | 29 | 3,606 |
| `starting_texts/arch.md` | 27 | 3,661 |
| `starting_texts/lane.md` | 26 | 3,275 |
| `starting_texts/process.md` | 29 | 3,439 |
| `starting_texts/job.md` | 26 | 3,267 |
| `starting_texts/walking-session.md` | 28 | 3,568 |

Also opened, only to check that a cross-reference points at something: `shared_state_carrier.md` (sections 5 to 7) and `notified_job_tests.md` (its decisions), and that each other file a text names exists. All exist. The carrier file names the issue's label and the comments' keys but gives each record only as "plain words in a fixed order of lines", so problem 6 of section 1 stands even with it.
