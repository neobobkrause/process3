# Notes for the register of counter-arguments (process4_counterarguments.md)

14 Nov 2026. Recording worker. Only two files were written: `/home/user/handoff/process4_counterarguments.md` and this one. No repository was touched and no session was started.

Abbreviations: **C** = attack_corruption.md, **F** = attack_feasibility.md, **Fnd** = audit_foundations.md, **L** = audit_ledger.md (L A1..A7 = its additions table, section 4; L slip 1..4 = its section 7), **memo §n** = decisions_memo_d3.md section n, **memo §0** = its opening rule. "AppC" = appendix C of the corruption report. "sd" = the "Smaller silent drops" list at the end of audit_foundations.md.

## 1. How findings were turned into entries

- One entry per finding, 87 entries in all.
- Merged where two or more findings make the same argument (sources below).
- Split where one finding carries two arguments that the memo answers in different ways: C4 (entries 5 and 13), F9 (15 and 34), F11 (53 and 68), Fnd10 (14 and 48), Fnd12 (18 and 76), Fnd19 (64, 66, 79, 80), L2 (18 and 70), L13 (48 and 59), L14 (20 and 76), L16 (33 and 49).
- Lettered sub-findings (C11 a to f, C12 a to d, F16 a to j) are treated as separate findings.
- An entry with several kinds of answer sits in the hardest group that applies to any part of it; each part of the answer carries its own label inside the entry.
- The ledger audit is described in the task as 21 findings; the file has 23 numbered findings. All 23 are covered.
- Evidence label added: "Read in the documents" for the audit findings, whose evidence is a quotation from Bob's documents or a record, not a count. It is explained in the register's "How to read".
- Where a reviewer gave no "how bad" grade, the grade is mine and the entry says so (21, 22, 23, 44, 45, 61, 69). Grades for 9, 10, 79, 81 are my reading of a reviewer's "real" or of no grade.
- Order inside each group follows the scale stops the first hour / stops a tranche / silently spoils / costs time / misleads / minor, using the reviewer's words. Entry 3 (F16c) is high in group 1 because the reviewer wrote "stops Bob's first commit if missed", though the reviewer listed it among "smaller gaps".

## 2. Mapping: entry -> source finding(s) -> memo section

| # | Entry (short) | Source finding(s) | Memo |
| --- | --- | --- | --- |
| 1 | Tranche may never end; sessions write the walk | C1 (also C AppC "Technical 11"; C AppD row on redteam_corruption 6) | §3 (definition of a clean round; unbounded rounds; second horn unanswered) |
| 2 | Correct-or-remove; line cannot be drawn | C3, C AppB (ten causes) | §4 (E; I 7; distinction; hard cases to J) |
| 3 | Required test run on changes that touch no module | F16c | silent, except §3 for tranche into main |
| 4 | Failing product reaches main | C2, C AppC "K 2" | §3 (declare, three consequences, reword A; release path unproven); §0 for the "no answer found" part |
| 5 | Growth moves elsewhere | C4 ("with the wall", first limb; its "no answer found") | §4 (residue listed; process-serving tests forbidden in text) |
| 6 | Job writes its own tests; 19 in 20 | C6 | §6 (J statement; restore P7 rule; replacement for "not the job's to fix"); §0 for the red suite that travels |
| 7 | Notices: needless jobs; nothing to merge | C5, F5, C AppC "Technical 1", F missing-from-J item 9 | §5 |
| 8 | ARCH is one long session | C12b | silent on drift; §7 "sessions name roles" on replacement |
| 9 | Record hidden by a second suspension | C AppC "I 6" | silent |
| 10 | "Once" not defined | C AppC "Technical 3" | silent; §4 K question 1 bears on it |
| 11 | Who counts failed corrections | F16f | silent |
| 12 | "Nothing on a live site" | L slip 4 | silent |
| 13 | The wall dilemma -> question 1 | C4 (both counter-arguments, other limbs), C AppD rows on redteam_corruption 1 and 5 | §4 (new K question 1) |
| 14 | Module-order repair hides Bob's questions | F12, Fnd10 (second half), L21 | §4 last bullet |
| 15 | Standby for ROOT | Fnd6, F9 (standby part), L9, F missing-from-J item 4 | §7 "Standby for ROOT" |
| 16 | Installer-copy walk; release path | Fnd3, L A1, F missing-from-J item 10 | §3 second bullet |
| 17 | Wall question was the withdrawn proposal | Fnd1, L A5 | §4 first bullet and K question 1, first point |
| 18 | "You confirmed" three checks | L2b, Fnd12 (first item) | §1 second bullet |
| 19 | External walk by fixed rule | C11b, L A2 | §3 first bullet |
| 20 | Judging numbers | Fnd5, C11a, L14a, C AppC "K 5" | §8 second bullet |
| 21 | "Safely"; trigger; "truly affected" | Fnd9, L slip 3 | §5 |
| 22 | "Your word is enough" | Fnd8 | §7 "Coordinator and Bob's words" |
| 23 | Walk-step line in the report | L A3 (also raised inside C9, C11a, Fnd5, L11) | §8 first bullet |
| 24 | Per-round comparison as a "trial" | Fnd17, L A6 | §9 "J9" |
| 25 | No Process4 tool | F1, L slip 1 | §7 "What does not exist yet" |
| 26 | First two acts stop ROOT | F2 (and F trials J2, J10) | §7 "Approvals edits" |
| 27 | State has no home; roles not addresses | F3, F16j, F missing-from-J items 2 and 3 | §7 "State home"; "Sessions name roles" |
| 28 | The stop that ended Process3 is kept | C10, C AppC "I 11" | §7 "Approvals edits" |
| 29 | Tranche end in practice; merge into main | F8, F missing-from-J item 1; L1 row P12 | §3 "Tranche into main"; "Unbounded rounds" |
| 30 | Waking ARCH | F4 (and F trial J6) | §7 "Waking" |
| 31 | Job stopped by another module's fault | F7, C6 (deadlock part) | §6 second bullet |
| 32 | Modules with no code; unowned files | F6 | §7 "Modules" |
| 33 | Process fault: who reports, who fixes | F10, L16 (MSG-5, MNT-7 part) | §7 "Process faults"; §0 for "never fixed in place" |
| 34 | Hourly alarm undoes a stop | F9 (alarm part) | §7 "Stop on Bob's word" |
| 35 | Walks never ran that way; where they run | F14, L22, F missing-from-J item 6, F trial J11 | §3 "Walk actors"; §9 "J11" |
| 36 | Uses check inside test one | F16i | §6 last bullet |
| 37 | Checks among the lines that "stand" | L1, L section 0, Fnd sd (text-keys check) | §2 |
| 38 | Own-files check ended | C7, C11e, C AppC "K 1" | §6 first bullet |
| 39 | 8 Nov words overturned | Fnd2 | §3 third bullet |
| 40 | Rules held by words; the one cap | C8, C AppA, C AppC "I 8, 9" | §2 (process's own tests; size limit); §0 for the rest |
| 41 | Reported number becomes a target | C9 | §8 first bullet; §7 coordinator |
| 42 | Slot number | Fnd7 | §7 "Slots" |
| 43 | Seven standing duties | Fnd15 | §2 (general rule only); §6 for P7 |
| 44 | Process-fix session is new | L A4 | §7 "Process faults", "Section B additions"; §0 for declaring that it replaces MNT-1 |
| 45 | "Earlier modules' jobs" read as tie-break | Fnd14 | §1 second bullet |
| 46 | ROOT's repository, two records | Fnd13, F16a | §1 third bullet; §7 "Approvals edits"; §0 for the plain prompt |
| 47 | Whole-product check "when I ask" | L12 | §2 fourth bullet |
| 48 | Second question in half a sentence (lane merge) | Fnd10 (first half), L13 (second half) | §7 "Section B additions" |
| 49 | Cost reporting; cost alarm | C AppC "I 4", L16 (GAP-2 part) | §8 first bullet; §8 "Cost alarm" |
| 50 | Three measurements Bob asked for | L10 | §8 "Measurements he asked for" |
| 51 | Two-part test run | C11c, F16h, C AppC "I 13" | §8 last bullet |
| 52 | Tranche report has no author | F16g | §8 first bullet (content only) |
| 53 | Cross-module pass: conditions and moment | Fnd16, L8, F11 (first half) | §7 "Change across many modules" |
| 54 | Nothing prepares the next round | L3, Fnd sd (first item) | §7 "Section B additions" |
| 55 | Bob's brake sentences | Fnd4 | §4 second bullet |
| 56 | No requirement goes untested | L4, Fnd15 (sixth item) | §6 third bullet |
| 57 | Only marked words are followed | L5, C12c | §7 "Coordinator and Bob's words" |
| 58 | Blocker reaches Bob; CAN RUN | L6 | §7 "A:" and "E:" line; "Section B additions" |
| 59 | Design lanes defined nowhere | L13 (first half), F16b | §7 "Section B additions" |
| 60 | Fresh session after two corrections | L7 | §7 "JOB-14" |
| 61 | Four kinds of session not listed; who tells Bob | Fnd11 | §7 "Section B additions", "Process faults"; §4 (new K form) |
| 62 | Tranche report lost three things | L11, Fnd5 (report part) | §8 first bullet |
| 63 | Where decisions are kept | L17 | §7 "Section B additions"; §1 first bullet |
| 64 | Model and effort | F15, L15, Fnd19 (first item), F missing-from-J item 8 | §7 "Model and effort" |
| 65 | Shadow slice became small trials | L18, Fnd sd (fifth item), L section 3 (MNT-12) | §8 "J header" |
| 66 | How many walk; Cloudflare caution | Fnd19 (second item) | silent; §0 (restoration) |
| 67 | About 50 live sessions | F13, F missing-from-J item 5 | §7 "Live sessions" |
| 68 | Skipping tests on a trivial change | C12a, F11 (second half), C AppC "Technical 7" | §7 "Change across many modules" (conditional keep) |
| 69 | Which document governs | L20 | §1 last bullet |
| 70 | Attribution, systemic | L2 (2a, 2c, 2d, 2e, 2f) | §1 |
| 71 | Ten things missing from the unproven list | F "Section J: what is missing", claims 1 to 10 | §9 last bullet and the sections named per item |
| 72 | The notice trial cannot fail | F "Section J", trial J4 | §9 "J4" |
| 73 | Numbers | Fnd20 | §9 first three bullets |
| 74 | Plain words | Fnd21, L slip 2 | §9 "Plain words"; §3 (the 63 failures); §4 (numbering); §0 for two items |
| 75 | List of Bob's acts | Fnd22 | §9 "Under the table"; §3, §7 for added acts |
| 76 | Six smaller attribution faults | L14b to L14g, Fnd12 (second and third items) | §1 fourth bullet |
| 77 | Citation rule as a trail | C11d, C AppC "I 7" | silent on the trail; §0; consistent with §1 |
| 78 | Decisions by default | C11f, C AppC "I 2", "I 3", "I 5" | silent; §0 |
| 79 | Fix timing against words of 9 Nov | Fnd19 (third item) | silent; §0 |
| 80 | Per-line test still in a note | Fnd19 (fourth item), L19 | silent; §0; §1 last bullet |
| 81 | Refused for size | Fnd18 | §2 last bullet |
| 82 | Twenty measurements | L23 | silent; §0 |
| 83 | Starting size | C12d | §7 "What does not exist yet" |
| 84 | Commit is several steps | F16d | silent; §0 |
| 85 | Two retired hooks | F16e | §7 "What does not exist yet" |
| 86 | Two small reports | L A7 | silent; §0 does not settle it |
| 87 | Two kept lines never stated | Fnd sd (second and third items) | silent; §0 |

Final section, "What the first trial showed": from the coordinator's message during this task and `/home/user/work/replay/results.md` (sections "Results that contradict", J4 a to d, J5 a to d). Figures checked against that file: 241 of 241 (J4 a, and wording F or G in J4 c(3)); 236 of 241 for "one of the four parts changed" (wording B); 2 not led (J5 b, judged form); 167 never notified, 66 by no route (J4 a); 122 undeclared test-import pairs, 36 to a later module, 0 in non-test source (J4 c(1)); 360 of 504 = 71% (J4 c(2)); 17 against 65 (J5 a).

## 3. Things in the reports not given an entry of their own, and why

- **C verdict ("would not run to its one output")**: its three sentences are C1, C5 and C6; entries 1, 7, 31.
- **C AppA** (36 rules held by words): support for entry 40. **C AppB** (ten causes): support for entry 2; its row 7 (the fix session's "done" is its fix merged) is answered by memo §4 and is stated in entry 2; its row 6 (the fixing roles carried no restraint text) is answered by "the fix session's rulebook carries these sentences", also in entry 2.
- **C AppC rows with weight "None"** (I 1, I 10, I 12, K 7): the reviewer found nothing against them. Rows I 2, I 3, I 5 are folded into entry 78 as examples of losses not stated. Row K 2 is in entries 4 and 16.
- **C AppD** (earlier attacks re-checked): each row points to a finding already entered.
- **C "What I did not establish"** and **F "Things I probed and did not find broken"**: not counter-arguments. One of the second list bears on entry 9: the feasibility reviewer thought the likeliest cause of the suspension goes away with the state store, and called that "hope, not proof".
- **F trials J2, J6, J10, J11**: carried in entries 26, 30, 26 and 35.
- **L section 3** (the eight dropped lines): none comes back; the one echo (MNT-12) is in entry 65. Its remark on P16 (the wall gave Bob the say over every process change) falls with the wall question as written.
- **L section 5 and 6** (tables): evidence for L2 and for every line-by-line class; no separate argument.
- **Fnd "What I could not check"**, **L "Limits"**: not counter-arguments.
- No finding was left unplaced.

## 4. Places where the memo's answer does not meet the counter-argument

Each of these is also marked "Not answered" in the register entry.

1. **Entry 1 (C1).** The memo defines a clean round and says rounds are unbounded. It does not take the reviewer's one-off measurement (walk one unchanged build three times), without which nobody knows whether a clean round is reachable under the new, stricter definition. Under that definition no Process3 round was clean, so the stricter definition makes the "never ends" horn worse, not better. Tranche size is not addressed.
2. **Entry 3 (F16c).** Memo silent for Bob's own approvals commit and ARCH's module-list edits; severity as the reviewer states it is a first-hour stop.
3. **Entry 4 (C2).** The reviewer said the two decisions (three tests; a tranche ends on a clean deployed walk) conflict and "only he can pick". The memo declares the conflict and picks the later record. It is not put to Bob as a question.
4. **Entry 13 (C4).** The memo still recommends an untested mechanism while saying the rate of blocking faults is unknown, which is the reviewer's objection to the old wall. The reviewer's rehearsal before Bob answers is not taken; the reviewer's third option (protect only what can stop a merge) is not put. The fixed-version form still makes the product wait for Bob at every mid-tranche blocking fault, which is the "waits for a man who is asleep" argument restated as a cost. Also: the memo's phrase "one question waited nine hours for you" rests on a case that the corruption report (appendix A row 24) describes as "a question that was not his"; the register words it as "a question that sessions carried as yours".
5. **Entry 14 and 32 (F12, F6).** Internal tension in the memo: §4 says do not decide "modules with requirements and no code", list it as a product question for Bob; §7 has ARCH fold requirement-only modules back and correct the definition of "module". The second acts on the first.
6. **Entry 20 (Fnd5, C11a).** Both reviewers said ending the judge is Bob's ("a purpose, not a way"; "put it back in section K as his question"). The memo rewords it as a consequence of the recorded decisions and does not ask him.
7. **Entry 26 (F2).** The memo's answer is "build decision, proven in J2". The reviewer's point was that no mechanism exists; none is named. Twice out of twice it failed in Process3, and at the first start there is no other session to repair it.
8. **Entry 28 (C10).** The stop is kept. The answer is a stated cost (every approvals edit stops every long-lived session; Bob restarts ROOT) plus a trial. In Process3 the product never restarted after the last edit; nothing in the memo shows a restart of ROOT is enough.
9. **Entry 31 (F7, C6).** The removed sentence ("a failure already on the tranche branch ... is named") has a source in the Foundations according to the ledger audit (its list of things "not counted as additions, because a source exists"). The memo removes it without saying that it departs from a Foundations line.
10. **Entry 37 (L1) and 43 (Fnd15).** The memo ends "the guard on the approvals block inside the old record check". permissions_inventory (quoted in L1) says that without the record check nothing in git stops a session's pull request changing the approvals or the deny list. Fnd15 asked the draft to say where "permission management is preserved" and "three tests" pull against each other; the memo does not. Five of Fnd15's seven duties are not named at all (refusal counts and trial at tranche open; component removal at model release; sweep catching lack of progress; every new session checked to have started; GitHub's published limits, which rest on Bob's quoted words of 6 and 9 Nov). Under §2's rule they end by silence, which is what the finding objected to.
11. **Entry 38 (C7).** The reviewer said two things were Bob's: whether "Kept" meant the check, and whether test one may run another module's tests ("is his to allow"). The memo decides both as Claude's and only notes the record. The second half of the argument (the other module's owner is never told; two writers on one file) is not met.
12. **Entry 40 (C8).** Answer covers the one cap. For the 36 rules held by words the memo is silent; the reviewer's "delete what cannot be held" is not taken.
13. **Entry 48 (Fnd10, L13).** The second draft said the lane clause was "yours to keep or drop". The memo has Claude decide it stays. Both reviewers asked for it to be put to Bob with reasons and a recommendation.
14. **Entry 63 (L17).** Bob's line says each decision in its own file, never a long file. The memo says "the product's decision file" (one file), the form the audit's evidence shows growing to 49 KB in four days.
15. **Entry 65 (L18).** The memo says "the combined trial run is that slice". Nothing says the combined run is made on a representative slice of the real product; the reason the toy line was dropped is that toy flaws and product flaws were disjoint.
16. **Entry 68 (C12a, F11).** The memo's condition was met (the sentence is in the 13 Nov record, assessment_doc.txt line 94), so the sentence is kept and attributed. How a change that skips the required test would merge, and whether the checker passes it, is left open; the corruption reviewer's point (a way round the only gate, on a session's judgment) stands.
17. **Entry 69 (L20).** The memo's sentence does not say that the definition governs; a session could still cite the unchanged Ledger.
18. **Entry 70 (L2).** The auditor asked for "a session's record has you deciding" everywhere until Bob writes it himself. The memo keeps "you decided" for list items, resting on Bob's phrase "my decisions of 13-14 Nov".
19. **Entry 72 (F trial J4).** The memo says J4 "can break but not prove". The reviewer said it cannot fail at all on the question of who is told. The replay's own report agrees with the reviewer ("'241 of 241' cannot fail on this record"). Only the trigger half could break, and two narrower wordings did.
20. **Entry 78 (C11f).** Memo silent. The reviewer's "fewer items" cannot be met: the memo adds Claude-decided items. The memo's authority is Bob's typed "Decide technical matters yourself and tell me what you decided", which the register quotes.
21. **Entries 8, 9, 10, 11, 12, 52, 86** are memo-silent with no usable correction from the reviewer (or, for 8, a remedy the opening rule does not let through).
22. **Entry 7 against the replay.** The memo's estimate of needless jobs assumed Process3's rule; the replay adds that under "any of the four parts" 71% of job merges count as interface changes, and that Process3 did not tell every declared user (167 pairs). The memo's trigger ("source or requirements file") is close to the replay's wording F, which reaches 241; the definition's old wording ("interface changed") reaches 236. The memo was written before the replay finished.

## 5. Figures corrected against the replay, as instructed

- "65 of 178 notices could name no part": appears only in entry 21, where it is given as the reviewer's quoted figure with the re-derived 17 beside it.
- "38 undeclared pairs" and "202 imports": entries 36 and 73 give the reviewer's figure with the replay's (198 statements, 122 pairs in all, 36 to a later module). Entry 31 no longer quotes them.
- "52 code files belong to no module" (entry 32): the replay counts 49; both are given.
- The feasibility report's statement that Process3 "notified every declared user" (its J4 note) is contradicted by the replay (167 pairs not told). The register does not repeat it.

## 6. Other things noticed

- The memo's instruction on the 8 and 9 Nov rulings was conditional ("if audit_foundations.md finding 3 quotes them"). It does quote both, so entry 16 records them as restored.
- The memo says of the second health number "stays as a reported number where cost can be read" and of the rule "the first half of that now cannot be met as written". The register reads "first half" as the first of the two numbers.
- Nothing in the register is written as a decision of Bob's. Where the memo says "your decisions", the register says "the record has you ..." or "decisions recorded as yours".
