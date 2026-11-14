# Notes for /home/user/handoff/process4_audit2.md (recording worker, 14 Nov 2026)

Sources: F = /home/user/work/audit2_feasibility.md ("the run audit", 22 findings); C = /home/user/work/audit2_corruption.md ("the drift audit", 12 findings + appendices A, B, C); R = /home/user/work/audit2_requirements.md ("the requirements audit", 17 findings + sections 3 to 7); Reg n = entry n of /home/user/handoff/process4_counterarguments.md. Draft = /home/user/handoff/process4_definition_v5.md. Bob's words checked against /home/user/work/bob_words_14nov_b.md and bob_words_14nov_c.md. No repository was touched; only /home/user/handoff/DECISIONS.md, foundations.md, ledger_lines.md, review.txt and permissions_inventory.md were grepped to verify quotations.

Size: the document is about 39.7 KB, over the 30 KB aim. Section 3 (14 questions, each with exact dated quotations and options) is about 19 KB. Three rewrites did not bring it lower without dropping required items.

## 1. Mapping: section 1 (short version)

| Item | Source |
| --- | --- |
| "better, not ready; stops in four places ... five more" | F verdict |
| Closed since first round | C verdict (four bullets) |
| Best founded: life of a job; about 700 merges | F walk-through "A job"; F "Probed and not found broken" |
| 1 End of a tranche | F5, F6, F10; C1, C3; R3 |
| 2 PROCESS rule held by words | C2 |
| 3 First hour | F1, F2, F3 |
| 4 Five steps with nobody named | F verdict (last paragraph); F7, F9, F6, F16, F12 |
| 5 Release | C5; F16; R10 |
| 6 288 lines | R section 1 counts; R1, R2, R6 |
| 7 51 text rules, six held | C appendix A |

## 2. Mapping: section 2 (map)

Each row = the three MAP tables (F MAP, C MAP, R section 7). States are copied from them; nothing averaged. R has no row for "the account of the 288 lines" in F or C; F and C have no such row.

| Row | F MAP | C MAP | R map |
| --- | --- | --- | --- |
| Roles and sessions | Stated but unproven | Stated but unproven | Stated but unproven |
| Life of a job | Stated but unproven; thin at the edges | Stated but unproven | Solid |
| Rounds, walks, tranche end | Contradictory and thin | Thin, and contradictory in one place | Stated but unproven |
| Release | Missing | Contradictory | Thin |
| Notification | Missing by decision | Missing by design | Missing, by his decision |
| PROCESS | Thin | Thin | Contradictory |
| Permissions and starting | Contradictory | Stated but unproven | Stated but unproven |
| State and waking | Thin | Thin | Contradictory |
| Recovery | Thin | Stated but unproven | Thin |
| Reports | Solid enough | Thin | Solid |
| Unbuilt | Stated, and understated | Solid as a statement | Stated but unproven |
| Unproven | Stated, with a weak trial plan | Solid as a statement, thin as a plan | Solid as a list |
| Line-by-line account | (none) | (none) | Contradictory |

"Five kinds of long-lived session; the four Process3 had were replaced every few hours": C10 (PROCESS is new, so only four have a record).

## 3. Mapping: section 3 (questions that are Bob's)

| Q | Subject | Sources | "Auditor's suggestion" taken from |
| --- | --- | --- | --- |
| 1 | What the walks are measured against; may sessions change it; meaning of "without flaws" | F5; C1; R3; R conflict 13 | C1 best answer (restore files; wording for "without flaws") |
| 2 | Tranche size; a tranche that will not come clean | F10; C3; R addition 4, R conflict 7; Reg 1 | none (F10 says size is the only lever; no size recommended) |
| 3 | Setting behind the PROCESS rule; who moves the product | C2; C8 (his merge as approval); F9 (who carries out the move); Reg 2, 5, 13, 17 | C2 best answer |
| 4 | What a product session does while a process fault waits | C4; C9 row f; R conflict 4 | none (C4 puts both; I gave no recommendation) |
| 5 | How new work enters a module | F7 | none (F7 gives two readings) |
| 6 | Which governs | R1; Reg 69 | R1 best answer (two alternatives) |
| 7 | A further walk for a release | C5; R10; F16; C3 (journeys that begin at the installer); R conflicts 8, 9 | none; C5 says "Do not choose" |
| 8 | What "no more tests" bounds | C6; C9 row a | none for the question; (C6's removal of the 212 files is in section 4) |
| 9 | Protection of approvals; the stop at each edit | C12; R8; F11; C9 row c; R7 (part); Reg 28, 37, 43 | F11 and C9c/C10 (remove the comparison); C12/R8 (the GitHub setting, with its caveat) |
| 10 | Built files | R4; C7; C9 row b | C7 best answer |
| 11 | Lines ended without proposals, in six groups | R6 (33 lines; grouping per its best answer); R7 (group 3, and the three uses of "three tests and no others"); R9 (group 5); R11 and C9 row e (group 6); C9 row d (groups 1, 3); R conflict 2 (the three statements); Reg 78, 20, 50, 14, 32 | R11 best answer (group 6) |
| 12 | The watcher | F14; C10; C9 row h; R13; Reg 15 | none; C10 says give the facts and let him choose |
| 13 | Who runs the walks (his hint against a kept Ledger line) | F6; R conflict 10 | F6 best answer |
| 14a | Eight slots as a cloud-environment setting | F walk-through ("The eight slots across the account"); R conflict 11 | (structural option stated by F) |
| 14b | Marking instructions; how PROCESS puts options | C10; C8 | C10, C8 best answers |
| 14c | "Nothing the model says is evidence" | R17 | none |
| 14d | Cost of trial and conversion | F2 item 7; F17 item 7 | none |
| closing line | Notification | F4 | none |

Ledger/Foundations quotations verified by grep: "A job never commits a generated artifact." (ledger_lines.md 635); "No step runs longer than the in-session background limit; anything that can is a CI workflow." (ledger_lines.md 45); "The classifier is defence in depth, never the policy." (ledger_lines.md 34); "Nothing the model says is evidence" (foundations.md 42); "Nothing here is in force until it has run on a real tranche with the two health metrics measured." (as quoted in the draft section O and R6); "A process flaw found mid-tranche gets one line in a log and a workaround." (review.txt 377); the 9 Nov sentence (DECISIONS.md 125, under BD-R5 "(Bob, 9 Nov)", "Bob, the same day").

Attribution cautions I applied:
- The 9 Nov sentence is given "as Process3's decision record quotes you", not as typed words.
- "Process3's permission management is preserved." is given as the session's record of 13 Nov.
- The approvals sentence "Their design documents are claude.ai artifacts, not repository files." is given as text he committed, with "the audits give no date, and do not show who drafted the sentence". F5 calls it "Bob's own approvals"; C4 cites the post-mortem that "Most of those edits [to his approvals] were drafted by the coordinator". The date of that sentence was not in any audit report.
- The folder note "(Bob, 5 Nov 2026)" is a session-written page citing him; R3 says "quoting you on 5 Nov". I did not quote it as his.
- Group 6 of question 11 (the 29 modules): R11 says Bob's for the product side, Claude's for the route; C9 row e and C appendix C say Bob's. Put to him.
- R5 (status command): Claude's if restored, Bob's only if ten lines end. Placed in section 4 with that condition.
- C9 row i (GitHub limits) is Claude's to correct; placed in section 4, not in question 11.

## 4. Mapping: section 4 (Claude's work)

Wrong or stale statements:
| Item | Source |
| --- | --- |
| ROOT's start aimed at the wrong fault | F1 |
| "Checked by Claude" false | F5; R3 (draft's own notes: written on another session's word); R attribution 4 |
| Four short answers written longer | R14 (a to d); R attribution 2, 3, 5, 6 |
| Coordinator's note quoted as "your ledger note" | R13 |
| Two endings on a session's sentence | R15 |
| Out of date; fifth message missing | R16; F22 rows a, b |
| "Works round it" not his | C4; C9 row f |
| Record does hold the AI sentence | F16; C5 |
| "Same as in process3" not looked up | C9 row i; F19 |
| 21 sessions, 20 replacements | C10 |
| Two things already in the record | F9; F "Probed and not found broken" |
| Sentences that cannot both hold | F22 rows d, e, f, g, i, j; F11 |
| Mechanical edit's moment | F8 |
| Notified job that changes nothing | F22 row h; C appendix C |
| Alarm for lack of progress | R12; C4 |
| Four unmarked additions | R section 3, additions 3, 4, 11, 13 |
| 53 kept lines stated nowhere | R2 |
| Ten smaller attribution faults | R section 5, items 9 to 17 and 19 (5 to 8 and 18 are counted under the items above) |
| Seven smaller things, no decider named | R17 (eight bullets; the F-SHAPE-3 bullet went to question 14) |

Named in a sentence only: shared facts F15, C10, R addition 5; tool and role texts F3; conversion order F2; PROCESS after start F9, F22 row c, C8; who deploys/prepares F6, F16; tool's list F19, R5; archiving F12; dead job after passing F13; account switch F18; needed use or service F7, changes that only pass together C7; waiting sessions C4, resume R17, development release R10; round-end telling C11; effort F22 row l; uses check F20; Process3 leftovers F21.

Missing from the lists: F "Relied on by the draft and missing from all three" (12 items); C MAP rows "What is unbuilt" and "What is unproven", C1 (honest statement), C6 (212 files); R map rows "What is unbuilt", "What is unproven".

Not carried into the document as separate items (judged too small, or covered by another item): F22 row k (covered by question 12); C appendix B (ten causes: counts only); C appendix C rows on the default branch being public-facing, deploy token in every session, cost reporting; R additions 1, 2, 9, 10, 12 (declared additions); R17 PLN-4.

## 5. Mapping: sections 5 and 6

Section 5: "Before any trial can run" = F "The smallest set that must exist before any trial can run", F17. Trials: 1 = F6; 2 = C3 (a), (b); 3 = F1; 4 = C2, C12, R8; 5 = F17, C4 (count the stops); 6 = F12, F14, F17, F18; 7 = F16, F17, F8. First real tranche = draft section O, F10.

Section 6 (no answer found): 1 = F10, Reg 1; 2 = C1; 3 = C3; 4 = C6; 5 = C7; 6 = C8; 7 = C12. Closing line = draft section O, F15, Reg 9 (F15 offers a partial structural answer; C gives none).
Not listed as "no answer found" although the first round did: Reg 3 (F2 now gives a written order with settings), Reg 8 (F13 and C10 give wording and a structural choice), Reg 11 (F13 wording).

## 6. Section 7 counts: how made

Register entries named by any of the three audits (56): 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 14, 15, 16, 17, 18, 20, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 43, 44, 47, 49, 50, 51, 52, 53, 54, 59, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 76, 77, 78, 87. Not named (31): 10, 12, 19, 21 to 24, 40, 41, 42, 45, 46, 48, 55 to 58, 60, 61, 62, 73, 74, 75, 79 to 86.

My classification, from the auditors' status lines:
- Answered (6): 29 (F16: merge to main answered well enough, unproven), 30 (F13), 33 (C4, F9: route), 36 (F20), 39 (R10, C verdict), 52 (C11).
- Answered in part, or answer found not to meet it (16): 4 (C verdict answered; C5 release path open), 16 (R10 answered by his three answers; C5 still open), 25 (F2, F3, F19), 26 (F1: answer rests on a misreading), 27 (F15: a sentence only), 31 (F table: yes for a flaw only; C7 lists it still open), 34 (F13, F table), 37 (R8: answer does not meet the kept line; C12 answered in part), 44 (F9), 53 (F8), 54 (F7), 59 (R17), 63 (R17), 65, 71, 72 (F17 "partly raised before").
- Still open (31): 1, 2, 3, 5, 6, 7, 8, 9, 11, 13, 14, 17, 18, 20, 28, 32, 35, 38, 43, 47, 50, 64, 66, 67, 68, 69, 70, 76, 77, 78, 87.
- Reopened (1): 15.
- Named with no verdict (2): 49, 51 (C appendix C only).
Judgment calls: 6 is "still open, answered in part" in C7, counted still open; 31 could be counted still open (C7); 4 and 16 are rated differently by different auditors. A different reader could move three or four entries between "in part" and "still open".

Findings this round (51 = 22 + 12 + 17):
- Wholly new (14): F3, F5, F7, F19, F21, F22; C4, C8, C11; R3, R9, R12, R14, R16.
- Raised before with new parts (18): F6, F8, F9, F16, F17, F20; C1, C2, C3, C5, C6, C7, C9, C10; R7, R10, R13, R17.
- Raised before, nothing new (19): F1, F2, F4, F10, F11, F12, F13, F14, F15, F18; C12; R1, R2, R4, R5, R6, R8, R11, R15. (R4 and R5 were raised in the third-draft appendix, not in the register.)
Overlaps between reports (same matter): F5/C1/R3; F10/C3; F16/C5/R10; F11/C9c/R7; F14/C10/R13; R4/C7; R11/C9e; R8/C12; R6/C9; F9/C2/C4/C8. Separate matters not counted.

## 7. Places where two audit reports contradict each other on a fact

1. **Number of journeys in the folder's journey script.** F5: "32 journey entries"; C1, C3, C5: "32 journeys" / "32 numbered journeys". R3: "one script listing 29 journeys" / "29 scripted journeys". I did not re-count (no repository touched). The document gives no number.
2. **Where the owner-started ROOT came up.** F1 (counted today): on an old commit of the tranche branch, a commit not in the main branch's history; "neither start was plain, and he had chosen the tranche branch". C appendix A row 42: "ROOT came up on the main branch both times" (this repeats the draft's sentence). The document follows F1, which gives the commit and times, and says so as measured for 5 Nov only.
3. **Date of the sentence "Yes, the installer update and site update wait until a release walk with AI on is also clean."** F16: "Bob, 8 Nov" (cited under BD-R3). C5 and R10: 9 Nov (BD-R5). DECISIONS.md line 121 to 125 has it under "BD-R5 ... (Bob, 9 Nov)", "Bob, the same day". The document uses 9 Nov.
4. **How many times ARCH was replaced.** F13 and R2: "replaced 21 times" (as the draft). C10: 21 sessions, "one start and 20 handovers (the draft's 'replaced 21 times' is one too many)". The document reports C10's correction.
5. **How Process3 kept to GitHub's limits at its end.** F19: the tool read GitHub's own figure before a job or lane start and backed off at 85%. C9 row i: "Process3's way was built, found useless ... and removed on 9 Nov (PD-22)". DECISIONS.md PD-22: the per-call ledger machinery was removed and a single read of GitHub's own count with the 85% back-off was kept. So F19 describes what remained and C9i what was removed. The document says only that Claude did not look up what the way was.
6. **Whether Claude was right to withdraw the watcher proposal.** R section 6: decider right ("Yes"). C9 row h: it treated his question as an instruction. A judgment, not a count; both given in question 12.
7. **Completeness of the "not built" list.** C MAP: "complete and plain", two things missing. R map: "complete except for the status command". F: "twelve more are missing". Given as a disagreement in the map.
8. **Count of Process3 bookkeeping test files.** The draft: 211 (measured). C6: 212 counted today (189 + 23). Not a clash between audits; the document uses C6's 212 and says where it is from.
9. **Cross-repository session starts.** F9: established in Process3 from 5 Nov (ROOT on the product started coordinators on the process's repository), "better founded than the draft claims". R conflict 12 and C2 treat it only as listed for trial. Not a contradiction of fact; F9's point is in section 4.

## 8. Things I could not settle

- The date and first author of the approvals sentence about design documents.
- Whether "68 of 147" (C3) should be called 46% or "about 68": the document gives the count.
- The number of separate matters behind the 51 findings.
