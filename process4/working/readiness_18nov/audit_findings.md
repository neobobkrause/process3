# Which findings of the second audit still stand against the design, 18 Nov 2026

Length: 163 lines. Last section: "6. What still stands, most serious first".

Written by a worker session for the readiness review. Read in full: the sixth draft (597 lines), the design state of 18 Nov (143), the audit's common brief (44), the requirements audit (331) and the corruption audit (610). Nothing else was read. The ledger, the Foundations, the appendix that lists lines one by one, any Civicsmith conversion plan and any trial result are unread.

## 0. How to read this

- "state 59" is line 59 of `process4/working/design_state_18nov.md`. "draft 273" is line 273 of `process4/definition/process4_definition_v6.md`. Where the two differ the state rules (state 9).
- The audits were made on the fifth draft. The common brief holds the auditors' task and no findings.
- Counting. The two audits number 29 findings (17 and 12). A finding whose parts get different verdicts is split, which gives 59 entries (sections 1 and 3). The audits' tables say much of the same again, row by row: 142 rows (sections 2 and 4). Every row has a verdict; rows with the same verdict and reason are grouped. Section 5 counts them. Section 6 merges the repeats.
- "Owed" means the state's last section (lines 136 to 143) lists it as not yet done.
- Two rulings are used throughout for SET ASIDE BY THE OWNER. State 18: "Every other check Process3 had that could stop work has ended." State 133: "The tool guards against mistakes, and not against a session that sets out to defeat it."

## 1. Requirements audit: its 17 numbered findings (24 entries)

1. **The ledger and Foundations say the opposite for 75 lines, and nothing says which governs.** ANSWERED. State 27: the design document "is what sessions follow". State 28: the Foundations become the background document and the ledger "was a worksheet and is retired".
2. **Fifty-three kept lines are stated nowhere.** ANSWERED. With the ledger retired (state 28), a line the design does not state is not a requirement. Of the dozen the audit named, these are now stated: refreshing long-lived roles (state 80), the process owning nothing on installed sites (state 108), "when in doubt, run the product" (state 131), saving before sending (state 128). The list of the 53 is unread, so the rest were not checked one by one.
3. **The walks' documents are said to be in a folder that does not hold them.** ANSWERED. Draft 273 withdraws "Checked by Claude" and says what the folder holds. State 59: both documents "are pages kept in the product repository's folder". Which journey list counts is owed for the conversion plan (state 143).
4. **Jobs commit built files, against a kept line.** ANSWERED. State 71: "Built files are never committed. They are built at each walk, deployment and release." This overrules draft 430.
5. **A new session cannot learn the state: the tool has no act that prints it.** STILL STANDS. State 80 and 84 say a successor starts "only from the shared state and the repository", but what the shared state holds is owed (state 142), and the tool's list of acts (draft 486) still has no reading of state.
6. **Thirty-three lines ended by Claude without a proposal.** ANSWERED. Draft 459 and 587 to 595 turned them into proposals; state 96 and 97 give Bob's answer ("Left out of Process4"), state 82 keeps one measurement, state 41 changes the size cap to a rule ARCH applies, state 34 says when Process4 is in force.
7. **"Three tests and no others" used three ways.** ANSWERED. State 19 ends the start-up comparison; state 20 keeps the tool's own tests as Bob's ruling; state 97 replaces the two duties at each model version with one question to Bob.
8. **The approvals are protected only by the permission checker.** SET ASIDE BY THE OWNER. State 91: "His approvals and the list of forbidden commands are protected by the permission checker alone." State 90: "Nothing enforced by GitHub is added."
9. **Older lines assume sessions repair the process themselves.** ANSWERED. State 48: a change to Process4 "is made through PROCESS". State 76 settles rewording: one that changes what the product does "comes to Bob first".
10. **"Development release" is never defined, and Bob's last message used the word.** ANSWERED. State 68 replaces the phrase: an ended tranche can be released "once an install and an update have each been run and confirmed successful. Neither is walked." State 69 (where they run, what "successful" means) is marked a reading Bob has not confirmed.
11. **Folding requirement-only modules into others is called a mechanical edit.** ANSWERED. State 75: "ARCH writes and rewords the requirement text in a module's file, and touches no code and no tests." State 76 brings a change in what the product does to Bob first. Draft 237 still says "as a mechanical edit"; the state rules.
12. **The alarm for lack of progress cannot notice lack of progress.** STILL STANDS. Draft 464 still says "the alarm for lack of progress is ROOT's hourly wake", and draft 188 says that wake is for a session "that has stopped". "Loops with no end" is owed (state 142). State 119 lets Bob see each job's progress; nothing in a session acts on it.
13. **A note written by a session is quoted as Bob's.** ANSWERED. Draft 190 says who wrote it. State 83: "The watcher is kept, and ROOT starts it."
14. **Four short answers written as longer statements.** ANSWERED. Draft 448, 271, 295 and 532 mark each as Claude's reading; state 16 to 18 and state 60 are now Bob's rulings on two of them.
15. **Two endings filed under Bob's decisions on a session's sentence.** ANSWERED. Draft 445 and 446 say whose sentence it is. State 18: "There is no full regression, on request or otherwise."
16. **Out-of-date sentences; the fifth message missing.** ANSWERED. Draft 75 to 85 hold the fifth message; draft 456 cites it.
17. Smaller things, eight parts:
   - a. **The list for a completion round.** NO LONGER APPLIES. It was a ledger line; the ledger is retired (state 28).
   - b. **How work starts again after a stop.** ANSWERED. State 84: "one way back: Bob starts ROOT, and ROOT rebuilds everything from the shared state and the repository." State 132: each standing note says what ends it.
   - c. **Decisions "each in its own file".** NO LONGER APPLIES. A ledger line (state 28). State 30 sets how the process's decisions are recorded.
   - d. **"ARCH defines lanes".** ANSWERED. Draft 200 and 204: "You identify the need for a lane, and ARCH opens it. The UX lane is always there." State 85.
   - e. **Who hears a job's test result is no longer marked as Claude's decision.** NO LONGER APPLIES. It was measured against ledger lines (state 28); state 29 has the design document carry no history.
   - f. **"Nothing the model says is evidence" against a job's own word.** SET ASIDE BY THE OWNER. Meeting it needs a check. State 17: "This is a duty of the job, held by its instructions; nothing measures it."
   - g. **Where the publishing keys live.** ANSWERED. State 108: "production keys are never in the sessions' environment."
   - h. **A paste slip in the ledger's store.** NO LONGER APPLIES (state 28).

## 2. Requirements audit: its tables (46 rows)

**Additions (13 rows).**
- ANSWERED, 10 rows. 2, restart of ROOT after each approvals edit: state 19 marks it as Claude's decision from Bob's ruling. 4, "only your word ends a tranche": withdrawn at draft 277, then ruled by Bob at state 62. 5, the shared state: declared at draft 235 and state 118 (its contents are finding 5 above). 6, tests name a requirement: declared at draft 297. 8, walks shared by journey: declared at draft 271; state 56 has ARCH name areas. 9, approval recorded at PROCESS: state 47 and 48. 10, the fault's route: state 92. 11, who corrects the 122 undeclared uses: marked at draft 295. 12, twenty merges in the trial: declared at draft 510. 13, the process4 folder: marked at draft 485; state 101.
- NO LONGER APPLIES, 2 rows. 1, the default branch: withdrawn (draft 416). 3, an internal walk at any time on Bob's word: "is removed" (state 63).
- STILL STANDS, 1 row. 7, a module's work is finished when its notified job says nothing needs changing: draft 256 unchanged; "when a round's jobs are done" is owed (state 142).

**Conflicts with Bob's typed words (14 rows).**
- ANSWERED, 12 rows. 1, 2, 3, 5: state 48, 76, 96, 97 and 16 to 20. 4, what work does while Bob is away: state 110 ("continues as long as there is work that can still be done") and draft 372. 6: state 75. 7: state 62. 8 and 9, the release: state 68, and state 10 (his latest statement replaces earlier ones). 10, sessions run the walks: state 60 (never run; see section 6). 12, who starts lanes: state 85. 13: state 59.
- STILL STANDS, 2 rows. 11, eight slots "across the account" while the number sits in one product: put off at draft 498. 14, who writes the rest of the product's CLAUDE.md, and Bob's acts in committing his approvals: owed as "a worked proposal on branches and where Bob's approvals live" (state 141).

**Attribution (19 rows).**
- ANSWERED, 10 rows. 1 (draft 190), 2 (draft 448), 3 (draft 532), 4 (draft 273), 5 (draft 271), 6 (draft 295), 7 (draft 446), 8 (draft 445), 12 (state 19), 18 (draft 456).
- NO LONGER APPLIES, 5 rows. 13: the row is withdrawn (draft 186). 14 and 19: the ledger is retired (state 28). 15: the quotation is gone (draft 202). 17: the heading is gone (section F rewritten).
- STILL STANDS, 4 rows, wording only. 9: draft 47 still says Bob's sentence on tests "settles" the whole passage on correcting and adding. 10: draft 382 still heads his sentence "The rule PROCESS works under". 11: draft 389 still cites "the field report". 16: draft 37 still says two sentences are quoted in section A, which quotes half of each.

The audit's table of deciders and its map restate the findings above and are not counted.

## 3. Corruption audit: its 12 numbered findings (35 entries)

1. The end of a tranche is one session's reading, against documents sessions rewrite.
   - a. **The walks' documents are kept and changed by sessions, outside the folder.** ANSWERED. State 59: pages in the product repository's folder; "During a tranche they change only to correct an error a walk has shown, and each such change is named in the account after the round." State 58: where the document is wrong, "the UX lane corrects the document".
   - b. **"Without flaws" is weak: it looks one walk back, and a note is not a flaw.** ANSWERED. Bob redefined it. State 56: a partial walk is clean "when it lists no flaw in the areas it was given". State 58 says what a flaw is. State 55: journeys left out are named beforehand and approved.
   - c. **Nothing but text stops a session loosening a step or merging before the walk is clean.** SET ASIDE BY THE OWNER. It needs a gate or a deliberate act. State 18 and state 133, quoted in section 0.
2. The rule that only PROCESS changes the process is held by text.
   - a. **The process repository's approvals let a session merge a process change.** ANSWERED. State 90: "Bob rewords his approvals in the process's repository to say a process change is merged only on his word given at PROCESS." Decided, not done: the approvals text this session was started with does not yet say it.
   - b. **Nothing physical holds the rule or the product's fixed process version.** SET ASIDE BY THE OWNER. State 90: "Nothing enforced by GitHub is added."
3. A tranche may never end, for reasons other than tests growing.
   - a. **Rounds have no bound; a tranche that will not come clean is undefined.** ANSWERED. State 62: it "goes on in rounds until Bob says", and he then merges it "with its flaws named, with no release from it", or drops it. State 61 tells him after each round.
   - b. **Nothing sets a tranche's content; old flaws and journeys that need the installer hold it open.** ANSWERED. State 55: ARCH proposes what the tranche is for and which journeys complete, "naming any journey left out and why"; Bob approves. State 56: walks cover only the areas a round changed.
   - c. **The walks as now defined have never run.** STILL STANDS. State 60 rules that walking sessions make both walks. Draft 548: "Whether a session's browser can reach the development site is unmeasured." Sharing a walk among sessions is on the trial list (draft 516) and no result of that trial was read.
   - d. **A walk step that fails for no reason in the product.** ANSWERED. State 58: only three things are a flaw; "Anything else a walker notes goes to ARCH as an observation and does not hold the tranche." State 126 covers a session that stops.
   - e. **Several walkers on one site change each other's data.** STILL STANDS. Draft 271 and 516 name only how many walkers the hosting account bears; nothing says how walkers keep apart on one site.
4. **What sessions do while a process fault waits for Bob.** ANSWERED. State 110: work continues where it can. Draft 372: the stop is "recorded as a named blocker and other work goes on". State 107, Bob's own: "A workaround is not a fix." State 92: the fault's description is "written once by the session that met it and passed on unchanged". State 126: in the trial every such stop is reported to PROCESS. Two smaller points are met only by inference: that the hourly wake leaves a blocked session alone, and who judges that a fault is the process's.
5. **A release can carry the installer, an upgrade and the AI journeys unwalked.** SET ASIDE BY THE OWNER. State 68: "once an install and an update have each been run and confirmed successful. Neither is walked." State 16: "Nothing more: no further test phases, gates or reviews." The install and the update are now each run before a release.
6. Growth can move to the product's repository.
   - a. **212 test files written for Process3's bookkeeping are in the product.** STILL STANDS. The design names no product (state 26), so this belongs to the Civicsmith conversion plan, which is unread; the state's owed list for that plan (state 143) does not name it.
   - b. **Tests and walk steps are unlimited in number.** ANSWERED. Walks are held to Bob's documents and to named areas (state 56, 58, 59). For module tests, state 17 gives the standard and says "nothing measures it".
   - c. **A job can change the product's workflow files; rules typed into another session's start; extra caution.** SET ASIDE BY THE OWNER. Each needs a check or a setting. State 18 and state 133.
7. A job's tests judge its own work.
   - a. **Built files committed by jobs.** ANSWERED (state 71).
   - b. **Nineteen requirements in twenty are judged only by the job; a test can pass either way.** SET ASIDE BY THE OWNER. State 17: "This is a duty of the job, held by its instructions; nothing measures it."
   - c. **One module's merge breaks another's tests unseen; failing tests travel to main.** SET ASIDE BY THE OWNER. Draft 131: "There will be no additional tests added to the process than the 3 already identified." State 18.
   - d. **Changes in several modules that can only pass together have no route.** STILL STANDS. The design has one job per module, no job touching another module, and each job's tests passing before it merges (draft 196, 250, 251). Nothing covers this case. Near it and owed (state 142): "who decides an interface between two modules" and "which copy a job's tests run against".
8. **PROCESS can grow the process through the options it writes, and records Bob's approval itself.** ANSWERED. State 47: a marked message "is copied exactly, with its date". State 30: his dated words "are kept and never edited", and a rewritten entry "is shown to Bob once before it stands". State 50 fixes the form of a question. State 126: any change "is explained to Bob, who decides". Bob's own merge as the approval is set aside by state 90. That an option says what it adds is not in the question's form.
9. Nine things changed under "Claude decided" without a proposal. All ANSWERED:
   - a. Tests and steps unlimited: state 17, 56, 58.
   - b. Built files: state 71.
   - c. The start-up comparison kept: state 19, "is not kept as a check".
   - d. Two duties and the first health number ended: state 96 and 97.
   - e. Requirement moves as a mechanical edit: state 75.
   - f. "Works round" not being Bob's words: state 107 is his.
   - g. The reading of "development release walk": state 68.
   - h. The watcher kept on a question: state 83 is his ruling.
   - i. "Same as in process3" for GitHub's limits: state 142 says the answer is in the working Foundations (unread). Why the account was suspended on 6 Nov is still owed there.
10. Long-lived sessions, each replaced often.
   - a. **Briefing notes, the start-up comparison, unmarked instructions, an unbounded shared state.** ANSWERED. State 80: a successor "starts only from the shared state and the repository". State 19 ends the comparison. State 47 fixes the mark. State 118: "a small fixed set of records, each rewritten in place". State 132: each standing note says what ends it.
   - b. **What a watcher's takeover does.** STILL STANDS. Owed: "The design of the watcher's takeover" (state 140). State 83 says it is designed and rehearsed in the trial.
   - c. **Each edit to Bob's approvals stops every long-lived session.** STILL STANDS. State 19: an edit "goes with a restart of ROOT". What that does to a running round is owed (state 142). Draft 422 lists edits the first tranche needs.
   - d. **What the next ARCH needs is not in the shared state's list.** STILL STANDS. Same as requirements finding 5: owed (state 142).
11. **A tranche that does not end reports nothing.** ANSWERED. State 61: "After each round the coordinator gives Bob a short account."
12. **The two guards on Bob's approvals are treated in opposite ways.** SET ASIDE BY THE OWNER. Both are now ended (state 19; draft 452), and state 91 leaves the approvals "protected by the permission checker alone".

## 4. Corruption audit: its tables (96 rows)

**Appendix A, rules held only by text (51 rows).** Each row says a rule has only words behind it.
- SET ASIDE BY THE OWNER, 36 rows: 2 to 11, 13, 14, 16 to 18, 20 to 22, 25, 27 to 29, 32, 34 to 37, 39, 40, 42, 43, 45 to 47, 49, 50. Putting something physical behind any of them is a check, a gate or a guard against a session that means to break the rule. State 18 and state 133, quoted in section 0; for 28, state 17 ("nothing measures it"); for 5, 36, 40 and 47, state 90 and 91; for 45, state 19 ("is not a refusal among the tool's tests").
- ANSWERED, 11 rows. 1: the mark is fixed (state 47). 12: state 118. 15 and 19: the tool decides who takes a free slot (state 82). 23 and 24: state 56 to 58. 30: state 20. 33: state 51. 38: state 47 and 30. 44: state 38. 48: state 142.
- NO LONGER APPLIES, 2 rows. 26: the sentence is withdrawn (draft 277). 41: the comparison is gone (state 19).
- STILL STANDS, 2 rows. 31: nobody is named to count a job's two failed corrections, and ARCH hears from a job only when its tests pass (draft 366, 250). 51: a walk shared among sessions has never run (same as 3c).

**Appendix B, the ten causes of growth (10 rows).**
- ANSWERED, 7 rows. 1 (state 107; draft 389), 4 (state 19, 83), 5 (draft 164, 198), 6 (state 40, 80), 7 and 10 (state 61 gives Bob each round's work and cost), 8 (state 47, 30).
- SET ASIDE BY THE OWNER, 2 rows. 2 and 3: a label rule and no limit on code. A limit is a check (state 18).
- STILL STANDS, 1 row. 9: an approvals edit still restarts everything (same as 10c).

**Appendix C, the case against each of Claude's decisions (26 rows, numbered here in the table's order).**
- ANSWERED, 16 rows. 1 shared state (state 118). 2 requirement moves (state 75). 5 order of a round (draft 269; the audit itself rates it low). 7 tests and steps (as 6b). 8 the tool's tests (state 20). 9 the fault's route (state 92). 10 "the processes" (state 85). 11 approval recorded (state 47, 30). 13 built files (state 71). 14 GitHub's limits (state 142). 15 the report (state 61, 64). 16 the health number and duties (state 96, 97). 18 six smaller endings (state 96). 22 the start-up comparison (state 19). 25 the release walk (state 68). 26 the folder (state 101).
- SET ASIDE BY THE OWNER, 2 rows. 19 cost recording and 20 the citation rule: both are in state 96, "Left out of Process4".
- NO LONGER APPLIES, 2 rows. 12 the default branch (withdrawn, draft 416). 21 refusal for size (state 19).
- STILL STANDS, 6 rows. 3 a module finished on its job's word (owed, state 142). 4 the mechanical edit's one merge, with all the touched modules' tests or none (unproven: draft 260, 517). 6 walking sessions (as 3c and 3e). 17 the hourly wake as the alarm for lack of progress (as requirements finding 12). 23 every session holds the deploy token ("who can read the deploy token" is owed, state 142). 24 two products and eight slots (draft 498).

**What the three tests do not see (9 rows).**
- SET ASIDE BY THE OWNER, 5 rows. An upgrade breaking stored data and the assistant not working: state 68 ("Neither is walked"); draft 81 ("A tranche can end without an AI enabled run"). One module's merge breaking another, a test that passes either way, a requirement no walk touches: state 17 and 18.
- ANSWERED, 3 rows. The installer: state 68. A state the walk cannot reach: state 58 makes "a journey cannot be completed" a flaw. A stale built file: state 71.
- STILL STANDS, 1 row. Changes that only work together (same as 7d).

The audit's own map and its list of what it did not establish are not counted.

## 5. Counts

| | Answered | Set aside by the owner | Still stands | No longer applies | Total |
| --- | --- | --- | --- | --- | --- |
| Requirements audit, numbered findings | 16 | 2 | 2 | 4 | 24 |
| Corruption audit, numbered findings | 21 | 7 | 7 | 0 | 35 |
| Both, numbered findings | 37 | 9 | 9 | 4 | 59 |
| Requirements audit, table rows | 32 | 0 | 7 | 7 | 46 |
| Corruption audit, table rows | 37 | 45 | 10 | 4 | 96 |
| Both, table rows | 69 | 45 | 17 | 11 | 142 |
| Everything | 106 | 54 | 26 | 15 | 201 |

The 26 entries that still stand are 14 separate matters, because the tables repeat the numbered findings.

## 6. What still stands, most serious first

Each names where the audits raise it, what the design says now, and what could go wrong in a real tranche.

1. **Changes in several modules that can only pass together.** Corruption finding 7; three-tests table. Draft 196, 250, 251; nothing covers it. Two or three modules whose changes pass only as a set could each stay failing with none able to merge, so the round does not finish.
2. **The walks as now defined have never run.** Corruption finding 3; appendix A row 51; appendix C row 6. State 60; draft 548 and 516. If a walking session cannot reach the development site or the shared walk does not hold together, no walk completes and the tranche cannot end.
3. **An edit to Bob's approvals while a round runs.** Corruption finding 10; appendix B row 9. State 19; owed at state 142. An edit made mid-round restarts ROOT with jobs open, and what happens to those jobs and their slots is not defined.
4. **What a successor session reads to find its place.** Requirements finding 5; corruption finding 10. State 80, 84, 118; owed at state 142; draft 486. A replaced ARCH could start mid-round without knowing which jobs are open or blocked and which flaws are placed, and start work twice or leave it undone.
5. **The watcher's takeover.** Corruption finding 10. State 83; owed at state 140. If ROOT dies in a tranche, the takeover could leave no watcher and nothing waking stopped sessions until Bob starts ROOT again.
6. **When a module's work, and so a round's jobs, count as done.** Requirements addition 7; appendix C row 3. Draft 256; state 82; owed at state 142. A module with a walk flaw against it could be counted finished on its job's word that nothing needs changing, and the round moves to its walks with the flaw still there.
7. **A session that is busy and getting nowhere.** Requirements finding 12; appendix A row 31; appendix C row 17. Draft 464, 188, 366; state 119; owed at state 142 ("loops with no end"). A job could fail and correct without end, holding one of the eight slots, and the round waits on it.
8. **The mechanical edit's one merge.** Appendix C row 4. Draft 260 and 517, unproven. The one change across many modules might not be able to merge under the required test run, and the round stops between its last job and its walk.
9. **Branches, where Bob's approvals live, and who writes the rest of the product's CLAUDE.md.** Requirements conflict 14. Owed at state 141; draft 488 and 422. The first hour could stop because a text only Bob can change, or one nobody is named to write, still tells sessions the old thing.
10. **Who can read the deploy token.** Appendix C row 23. Draft 481; owed at state 142. A job session that holds the token could, by mistake, deploy over or reset the development site while a walk is being made on it.
11. **The 212 Process3 test files in the product.** Corruption finding 6. State 26 sends it to the conversion plan (unread). Each module's job would meet tests that prove nothing about the product and spend its time on them or on removing them.
12. **Several walkers on one site.** Corruption finding 3. Draft 271, 516. Two walking sessions could change the same stored data, and a journey is reported as a flaw, or as complete, for a reason that is not in the product.
13. **Eight slots across the account with two products.** Requirements conflict 11; appendix C row 24. Draft 498, put off until a second product starts. With two products running, more than eight jobs could run at once because each product counts only its own.
14. **Four sentences of wording.** Requirements attribution rows 9, 10, 11, 16. Draft 47, 382, 389, 37. Nothing goes wrong in a tranche; a reader could take a heading or a summary of Claude's as Bob's words.
