# Appendix, second draft: recount and findings

14 Nov 2026. Worker's notes for the coordinator. Written with `/home/user/handoff/process4_definition_appendix_v2.md`; nothing else was changed.

Read for this: the first-draft main text and appendix, `process4_disposition.md` and `.tsv` (all 288 rows with notes), the Ledger texts of the lines in question, `live_docs.md`, `k_evidence.md`, the assessment document's decision passages, and the six notes in the saved copy of the Ledger store.

"Main" below means `process4_definition_main.md`, first draft, as the brief named it. Section K points are numbered as that draft numbers them (K1 to K7), and v2 does the same.

**One thing to settle before v2 ships.** `process4_definition_v2.md` was being edited while I worked (file time 01:28 UTC). As I saw it, its section K lists the seven points as closed points 1 to 8, because it splits K1 in two, and it gives the fourteen technical points as decided by Claude. v2 of the appendix follows the first draft's numbering, as briefed, and says so in its "Place" paragraph with the mapping: K1 there is points 1 and 2 of the second draft, and K2 to K7 are its points 3 to 8. If the appendix should carry the second draft's numbers, the rows to renumber are those listed in section 4 below. My brief did not list the technical points as decided, so v2 says only that they are "Claude's".

## 1. The recount

Counted by script from the rows of v2. Each row has one "Now" value.

| Category | "Now" values counted in it | Lines |
| --- | --- | --- |
| A. Kept as written | "Kept" 184; "Kept by Claude's decision, 14 Nov" 2 | 186 |
| B. Kept with the way of doing it changed | "Purpose kept; how it is done: see place" | 46 |
| C. Ended by Bob's decisions | "Ended by Bob's decision" | 15 |
| D. Ended by Claude's decision | "Ended by Claude's decision, 14 Nov" | 11 |
| E. Ended in part | "Kept; one clause ended or changed" 23; "Kept by Claude's decision, 14 Nov; one clause ended" 1; "Ended in part by Claude's decision, 14 Nov" 3 | 27 |
| F. Open, Bob's to decide | "Open: Bob's to decide" | 3 |
| Total | 186 + 46 + 15 + 11 + 27 + 3 | 288 |

**C, ended by Bob's decisions (15):** ARC-4, GAT-7, P11 (the full regression and whole-product checks); P10, INT-4, OT-2 (layers); JOB-13, TM-10 (deliberate-fault sampling); INT-2, INT-7 (review); F-PLAT-3 (default of 24); F-PROP-3, JOB-12, GAT-8, GAT-4 (the three checks).

**D, ended by Claude's decision (11):** F-SET-3, REQ-6, TM-6, JOB-10, REC-10, REC-9, TM-2, TXT-6, TXT-2, F-REQ-9, REC-8.

**E, ended in part (27):**

- By Claude's decision (4): JOB-7 (receipt half), SES-6 and F-REQ-12 (for the process's own texts), F-SET-8b (kept; its confirming check gone).
- The first draft's 23 rows with one clause ended or changed, all unchanged in status: ARC-1, PLN-3, F-HUM-2, F-HUM-6, F-HUM-10, F-HUM-12, F-REQ-1, F-REQ-4, GAT-2, INT-3, SES-15, SES-18, F-ROLES-1, F-ROLES-5, F-JOB-6, F-JOB-10, F-PLAT-4, P4, GAP-1, GAP-10, F-SET-2, TM-9, OT-1. In 21 the clause is ended or changed by one of Bob's decisions. In F-ROLES-5 and OT-1 nothing is ended: one clause (the daily standby) is technical point 4, which is Claude's. I left them in this group because no decision moves them.

**F, open (3):** MNT-1, MSG-5, MNT-5.

**Judgment calls that move a count by one.** Each is flagged in v2.

1. F-SET-8b is counted in E, not A. Main item I 12 says "keep the route. Let the check go with item 2", and the line's second half is that check. If it is counted as kept as written: A 187, E 26.
2. Open is MNT-1, MSG-5 and MNT-5. MNT-1 is who builds and merges changes to the process. MSG-5 is the answer to a flaw report coming back "by main of the process repository". MNT-5 is the recorded act that moves the version a tranche uses; if sessions lose write access, that act may be Bob's too (enforcement_levers, lever 2). MNT-7, JOB-4, P3 and F-PROP-12 stand under either answer and only wait on it; they keep their status and carry a flag. If MNT-5 is counted as way-changed instead: B 47, F 2.
3. SES-12 and F-MNT-4 moved from A to B, beside F-SHAPE-5, F-MNT-7 and F-MNT-5, which were B already. I read K4 as keeping the purpose (the process is judged by something measured) and replacing the two numbers with the walk result. F-MNT-4 also counts by two checks Bob ended. If the lines that define the numbers are instead counted as ended by Claude's decision (SES-12, F-MNT-4, F-MNT-5): B 43, D 14.
4. F-ROLES-4 moved from open to B. No decision names it. Main has replacing ROOT at technical point 4, not among Bob's points. If it is kept open: B 45, F 4.
5. ARC-2 is in B (rule kept, the way of holding it changed). Its text has no clause about a check, so it could be counted A: A 187, B 45.

## 2. Against the first draft's figures

| First draft | Now | Difference, line by line |
| --- | --- | --- |
| 198 kept as written by the audit | 176 of those 198 are kept as written | 20 had a clause ended or changed by Bob's decisions already in the first draft (ARC-1, PLN-3, F-HUM-2, F-HUM-6, F-HUM-10, F-REQ-1, GAT-2, INT-3, SES-15, SES-18, F-ROLES-1, F-ROLES-5, F-JOB-6, F-JOB-10, F-PLAT-4, P4, GAP-1, GAP-10, F-SET-2, TM-9), so "198 as written" was 178 then. 2 more now: SES-12 and F-MNT-4 (K4). 198 - 20 - 2 = 176 |
| 208 standing (185 kept + 23 with a clause changed) | 210 on the same footing (184 + 2 + 23 + 1) | - 2: SES-12, F-MNT-4 to B. + 1: F-SET-4 from open (K2, a fact). + 3: F-MNT-1, F-GATE-4, F-SET-8b kept from section I by Claude's decision. 208 - 2 + 1 + 3 = 210. Counting the 3 lines ended only in part as well gives 213 |
| 45 keeping their purpose | 46 | + ARC-2 and F-ROLES-4 from open. + SES-12 and F-MNT-4 from kept. - MSG-5, MNT-1 and MNT-5 to open. 45 + 4 - 3 = 46 |
| 15 ended (main, section H) | 15 by Bob, the same 15 lines; 11 more by Claude; 3 ended in part by Claude | The first draft's appendix table showed 11 because the four lines of the three checks were still listed as open. The 11 and 3 are section I, items 1 to 10 |
| 17 lines in section I | 0 waiting | 11 ended, 3 ended in part, 3 kept (one of them with its check clause gone). 11 + 3 + 3 = 17 |
| 7 open points for the owner (appendix) | 3 open, all new | F-PROP-3, JOB-12, GAT-4, GAT-8 ended by Bob. ARC-2 to B (K1). F-SET-4 kept (K2). F-ROLES-4 to B (technical point 4). MNT-1, MSG-5 and MNT-5 newly open on the write-access question |

Check by the first draft's own five rows: 208 + 45 + 11 + 17 + 7 = 288. Now: 210 + 46 + 15 + (11 + 3) + 3 = 288.

## 3. Section I: lines each item covers

| Item | Lines | In five words | Now |
| --- | --- | --- | --- |
| 1 | JOB-7 | Job's written receipt of commands | Ended in part (receipt half), Claude |
| 2 | F-SET-3 | Set-up check before every start | Ended, Claude |
| 3 | REQ-6, TM-6 | Size cap on requirements file | Ended, Claude |
| 4 | JOB-10 | Reading list and cost recorded | Ended, Claude |
| 5 | REC-10 | Oversized and temporary file check | Ended, Claude |
| 6 | REC-9, TM-2 | Job record as strict data | Ended, Claude |
| 7 | TXT-6 | Every rule cites a failure | Ended, Claude |
| 8 | TXT-2, F-REQ-9 | Line-by-line test of instructions | Ended, Claude |
| 9 | SES-6, F-REQ-12 | Nothing ever refused for size | Ended in part (process's own texts), Claude |
| 10 | REC-8 | Audit of reading to end | Ended, Claude |
| 11 | F-MNT-1 | Start-up check on Bob's approvals | Kept, Claude |
| 12 | F-SET-8b | Deploy tokens in cloud environment | Kept, Claude; confirming check gone |
| 13 | F-GATE-4 | Module tests in two parts | Kept, Claude |

1 + 1 + 2 + 1 + 1 + 2 + 1 + 2 + 2 + 1 + 1 + 1 + 1 = 17. Main's "thirteen items cover seventeen lines" is right.

Other lines these items touch without being counted in the 17. Their status is unchanged; their flags say what moved: F-SHAPE-3 (item 1), F-SET-1 (2), JOB-11, GAP-2, F-PLAT-14, F-MNT-5, SES-9 (4), P23, SHM-1, F-SET-6 (5), F-HUM-13, F-SHAPE-4, GAP-3 (7), TXT-4, TXT-1 (8), F-PLAT-8, GAP-6 (11).

## 4. Section K: lines each decision covers

| Point (second draft's number) | Lines | In five words | What v2 records |
| --- | --- | --- | --- |
| K1, first check (1) | ARC-2 (and REQ-4, flag only) | Own-files check at merge | Check ended by Claude; the rule stays in the job's instructions. ARC-2 from open to B |
| K1, second (2) | F-STOP-2, F-GATE-3 | Install and upgrade release tests | Ended as separate tests by Claude. Both stay B |
| K2 (3) | F-SET-4, GAP-8, SHM-3, F-HUM-7 | Claude-side set-up acts, Bob's | A fact, not a decision. F-SET-4 from open to kept |
| K3 (4) | F-HUM-6, INT-3, GAP-10 | Bob may approve a merge | Kept by Claude; no mechanism; his word to the coordinator |
| K4 (5) | F-SHAPE-5, F-MNT-7, SES-12, F-MNT-4, F-MNT-5 | Two health numbers as judge | Retired as the judge by Claude. SES-12 and F-MNT-4 from kept to B |
| K5 (6) | P22, F-REL-1, F-REL-2, F-SET-8a, F-STOP-3 | External walk after each tranche | Runs by rule, by Claude; status of the five unchanged |
| K6 (7) | PLN-7 | Eight slots for each product | Claude; stays kept |
| K7 (8) | F-JOB-1 | Bob's word reorders work | Kept by Claude; stays B |
| Open | MNT-1, MSG-5, MNT-5 (flags on MNT-7, JOB-4, P3, F-PROP-12) | Write access to process repository | Open, Bob's |

## 5. ARC-3 and JOB-8

Both rows are byte for byte as the first draft had them. They are flagged in v2's opening notes, not in their rows.

The claim that they end is in the assessment document (`assessment_doc.txt`, line 26): "Kept Ledger lines this decision ends: ... artifact regeneration (GAT-4, JOB-8), tests asserting on text keys as a separate check (ARC-3) ...". That document was typed by one session (live_docs, section 0). The sentence is the session's reading of the 13 Nov decision, not Bob's words.

**ARC-3.** Ledger text: "A test asserts on a text's key, never on its words; every user-facing sentence lives once in the word table." Source: Bob's word of 30 Oct. It asks two things: how tests are written (they check which key was used), and where text lives (once, in the word table). It is not a test and names no check. A check for it was listed and never built (ledger_map: "Not in the tool's gate", Gap; canon_analysis A5). The assessment document itself says only that it ends "as a separate check". Keeping the line as a rule is consistent with "exactly three tests, and no others, ever": it governs what test one's module tests look like. Building the separate check would not be consistent. Nothing needs to end, because nothing was built.

**JOB-8.** Ledger text: "A job never commits a generated artifact." The Ledger page explains it: "The gate regenerates what it needs and the layer close commits them once." It is a rule for jobs, not a test. Three points:

- A check for it was built on 3 Nov ("no committed generated artifacts", one of four checks added to the test run; change_sample PR 39). The ledger map of the same day still called it a gap. Under "exactly three tests" that check is in the same position as the three Bob ended. Nobody has ruled on it by name. Section H does not list it.
- The rule leaned on two things that Bob's decisions end: the rebuild-and-compare check (GAT-4) and the layer close that committed built files (INT-4, OT-2). With both gone, nothing says who builds and commits those files. Audit B already noted this ("it must say who commits generated files").
- In Process3 built files were in fact committed, and the architecture session refreshed them (change_sample PRs 95, 209, 251; DECISIONS.md PD-9).

So keeping JOB-8 as a rule is consistent with the three tests, and keeping its check is not. The line cannot stand as written without a new answer to who builds and commits built files. That answer is a technical point missing from section K.

## 6. Inconsistencies between the appendix rows and main sections G, H, I, K

Found beyond what the task listed. Each is flagged in v2 where a row carries it.

1. **Section H, the count of fifteen.** The total is right: fifteen distinct lines. The parts are not. "Three checks (three lines)" are four lines (F-PROP-3 and JOB-12 are both the first check). "The line about when a layer closes also ends" is INT-4, which is already one of the three layer lines (P10, INT-4, OT-2). The two slips cancel.
2. **Section G, "the audit kept 198 as written".** In the first draft's own appendix 20 of those 198 had a clause ended or changed, so 178 were as written. Now 176.
3. **Section K numbering.** The first draft's appendix used K1 to K9. Main has K1 to K7. The appendix's K4 (replacing ROOT, the standby) is not one of Bob's points in main; it is technical point 4. Its K5 to K8 are main's K4 to K7. Its K9 is main's unnumbered "Settled on 14 Nov" line. Its count table called F-ROLES-4 an open point for the owner under "K4", which in main is the judge of the process. Corrected in v2.
4. **Who decided the hourly alarm.** The first draft's rows F-ROLES-5 and F-ROLES-6 said "kept by decision 14", which is one of Bob's. The assessment document says of the hourly wake-up: "That is a technical choice, made by Claude and reported here, not a question for you." Corrected in v2. I could not read the text of decision 14, so the coordinator should confirm.
5. **K1 says two checks are unruled. The rows keep more.** Checks or re-runs that are not among the three tests, sit in kept rows, and are named by no decision: P12 ("re-runs the checks" at the tranche's close; the first draft filed it under K1, which does not list it), GAT-2 ("the checks scoped to the module" other than uses-match-imports), JOB-5 (seconds-long local checks at completion), SHM-1 and OT-3 (the drift check), MNT-4 (the pin verified at every session start), F-SET-6 (the required "record" check, which is REC-10's and so ended with item I 5), JOB-8's check (section 5 above). PLT-9's check at tranche open is kept under decision 13 as the first draft read it; main section F does not mention that check, and it can stop a tranche from opening.
6. **Lines that lean on something a 14 Nov decision ended, still marked kept.** TXT-4 applies the per-line test (ended, I 8). F-HOW-1 and MNT-8 require "the two health metrics" (retired as judge, K4). F-SET-6 as above. Status left; flagged.
7. **OT-4 and SES-15.** They say the same thing toward the owner. SES-15 is marked "one clause changed" by decision 14 (the coordinator is the front door). OT-4 is plain "kept".
8. **The six notes.** Main section K says Bob "rewrote in your own hand the five notes". The store shows six. The wording left in each is the coordinator's with the attribution cut. The store has no author field. INT-4's note is a copy of PLT-5's and the line still reads "modify", though the appendix and section H have it ended. The rewritten notes also keep Process3 terms that main ends: "BOB", "the watcher", "status and the sweep", "the per-line test" (live_docs, part C).
9. **Review clauses.** Decision 12's effect is marked on eight lines. REQ-3 ("a review never counts an untaken measurement as a gap"), F-HUM-11 ("a reviewer's what-if") and F-PLAT-7 ("ROOT by the watcher") carry similar dead or unsettled clauses with no mark. Minor; not changed.
10. **REC-10's prune and GAT-8's second clause.** Item I 5 names the check; REC-10 also asks for a scheduled prune. Section H names the second run; GAT-8 also says the tool merges only a passing, current tip. v2 ends both lines whole, as the decisions were given to me, and flags the prune.

Main-text points outside G to K that the same decisions now contradict, noted in passing: section B's list of Bob's acts says "There are no others" (K2 adds the Claude-side set-up acts as accepted facts); section C calls the external walk "optional" (K5 makes it run by rule); section K's seven points are all answered and one new point is open. The second draft in progress already carries these three changes. It still says "the audit kept 198 as written ... so 208 stand. Another 45" in section G and "three checks (three lines)" in section H.

## 7. What v2 changed, in numbers

- 288 rows, same order, same first four columns. 198 rows are identical to the first draft. 90 differ.
- 40 rows changed their "Now" value. 11 of those are only the relabel of "Ended" as "Ended by Bob's decision". The other 29: 17 section I lines, 4 lines of the three checks, ARC-2, F-SET-4, F-ROLES-4, SES-12, F-MNT-4, MSG-5, MNT-1, MNT-5.
- 50 rows changed only their place or flag.
- Every row decided by Claude says "Claude's decision, 14 Nov". No row gives a 14 Nov decision of Claude's as Bob's.

# Third draft

14 Nov 2026. Worker's notes. Written with `/home/user/handoff/process4_definition_appendix_v3.md`. One other file was changed: two count sentences in `/home/user/handoff/process4_definition_v3.md` (section 4 below). No repository was touched.

Read for this: the third draft of the main text in full; `decisions_memo_d3.md` and `v3_notes.md` in full; the second-draft appendix and the recount above; all 288 rows of `process4_disposition.tsv`; `audit_ledger.md` sections 0, 1, finding 1 and section 6; `audit_foundations.md` findings 5 to 22 and the smaller silent drops; `live_docs.md` part A (the record of 13 and 14 Nov, and the ledger store). Section letters below are the third draft's.

## 1. The recount

Counted by script from the rows of the third-draft appendix. Each row has one status.

| Category | Lines |
| --- | --- |
| A. Kept as written | 163 |
| B. Kept, with the way changed | 44 |
| C. Ended, by the record of 13-14 Nov | 11 |
| D. Ended, by Claude | 22 |
| E. Ended in part | 40 (by the record 13; by Claude 22; by both 5) |
| F. Not yet settled | 6 |
| G. Open on Bob's question | 2 |
| Total | 163 + 44 + 11 + 22 + (13 + 22 + 5) + 6 + 2 = 288 |

**C, ended by the record (11):** ARC-4, GAT-7, P11 (full regression and whole-product checks, line 6); P10, INT-4, OT-2 (layers, lines 7 and 24); JOB-13, TM-10 (deliberate-fault sampling, line 5 as the record lists it); INT-2, INT-7 (review, line 21); F-PLAT-3 (default of 24, line 9). 3 + 3 + 2 + 2 + 1 = 11, which is what section I of the main text lists.

**D, ended by Claude (22):** the three checks, F-PROP-3, JOB-12, GAT-8, GAT-4 (4); section J items 1 to 10, F-SET-3, REQ-6, TM-6, JOB-10, REC-10, REC-9, TM-2, TXT-6, TXT-2, F-REQ-9, REC-8 (11); the three measurements ended unmeasured, SES-16, TM-1, TXT-4, F-REQ-7, TM-4 (5); the first health number, F-MNT-4 (1); the completion round's own file, PLN-4 (1). 4 + 11 + 5 + 1 + 1 = 22.

**E, ended in part (40):**

- By the record (13): ARC-1, F-HUM-6, F-REQ-1, P4 (line 7); F-REQ-4 (lines 6 and 19); F-HUM-2, OT-4 (line 17); F-ROLES-1 (line 22); INT-3, F-JOB-10, GAP-10, F-SET-2, TM-9 (line 21).
- By Claude (22): PLT-9, MNT-4, F-MNT-1, OT-3, F-PLAT-8, F-SET-6, P12 (checks ended in section H); PLT-5, F-ROLES-4, F-ROLES-5, F-PLAT-7, OT-1 (the standby); F-SHAPE-5, SES-12, F-MNT-7, F-HOW-1 (the first health number); JOB-7, SES-6, F-REQ-12, F-SET-8b, TXT-1 (section J items 1, 9, 12 and 8); SES-18 (reviewing as a use for helpers).
- By both (5): PLN-3, F-JOB-6 (layer, line 7; completion round, Claude); F-HUM-12 (line 20; "no duty to build for every fault", Claude); GAT-2 (layer's tests, line 7; format and coverage checks and the wider trigger, Claude); SES-15 (front door, line 17; the measurement in its note, Claude).

**F, not yet settled (6):** F-SHAPE-6, MNT-11 (removing parts one at a time at each model release); F-MNT-2 (re-test at each model release); F-PLAT-9 (counting refusals; trying approved acts at tranche open); F-PLAT-14 (the alarm catching lack of progress); F-PLAT-4 (checking every new session has started).

**G, open (2):** F-PROP-12, MNT-5.

## 2. Each difference from the second-draft recount (186 + 46 + 15 + 11 + 27 + 3)

51 rows changed category. By category:

| Category | Second draft | Out | In | Third draft |
| --- | --- | --- | --- | --- |
| A. Kept as written | 186 | 30 | 7 | 163 |
| B. Way changed | 46 | 12 | 10 | 44 |
| C. Ended by the record | 15 | 4 | 0 | 11 |
| D. Ended by Claude | 11 | 0 | 11 | 22 |
| E. Ended in part | 27 | 3 | 16 | 40 |
| F. Not yet settled | 0 | 0 | 6 | 6 |
| G. Open | 3 | 2 | 1 | 2 |
| Total | 288 | 51 | 51 | 288 |

Move by move, with the reason:

- **C to D (4): F-PROP-3, JOB-12, GAT-4, GAT-8.** The three checks. Section I: "No words of yours confirm it, and your ledger still shows all three as kept. So this is a consequence Claude draws from 'three tests'."
- **A to E (12).** Checks section H ends by Claude's decision: PLT-9 (credentials at tranche open), MNT-4 and F-MNT-1 (process version at a session's start), OT-3 (drift), F-PLAT-8 and F-SET-6 (the guard on the approvals block; the required record check), P12 (re-run at tranche close). The standby: PLT-5 (its ledger note), F-PLAT-7 ("ROOT by the watcher"). TXT-1 (the per-line test in its ledger note, J 8). F-HOW-1 (the first health number cannot be produced). OT-4 (the coordinator is the front door, line 17; the second draft flagged it and left it).
- **A to B (8).** JOB-8 (its check ends; rule stays as text). REC-6, F-PLAT-12, F-ROLES-7 (roles named in the shared state, not an address in git). F-JOB-5 (the job, not ARCH, listens to its own pull request). F-PLAT-13 (tests run only where a pull request changes a module's files). MNT-8 (the combined trial run stands as the shadow slice). F-STOP-3 (external-walk findings go to the next tranche).
- **A to D (5): SES-16, TM-1, TXT-4, F-REQ-7, TM-4.** Section I, "three measurements your ledger asked for, ended unmeasured".
- **A to F (4): F-SHAPE-6, MNT-11, F-MNT-2, F-PLAT-9.** Section I, "not yet settled".
- **A to G (1): F-PROP-12.** See judgment call 1.
- **B to A (5): F-HUM-13, GAP-3** (the two sentences are quoted in section F); **F-GATE-2, P7** (every requirement tested and proven met, restored as a rule); **F-MNT-5** (the second health number "stays as a reported number").
- **B to E (4): F-SHAPE-5, SES-12, F-MNT-7** (first health number cannot be produced; second stays); **F-ROLES-4** (the standby dropped, so "renewed without the owner" ends for ROOT).
- **B to D (2): F-MNT-4** (the first health number itself); **PLN-4** ("No separate list for a completion round").
- **B to F (1): F-PLAT-14.**
- **E to A (2): F-HUM-10, GAP-1.** "Can run" is restored (section A).
- **E to F (1): F-PLAT-4.**
- **G to B (2): MSG-5, MNT-1.** The write-access question is gone; Claude decided that faults are reported to ARCH and ARCH starts a fix session.

Check: A 186 - 12 - 8 - 5 - 4 - 1 + 5 + 2 = 163. B 46 - 5 - 4 - 2 - 1 + 8 + 2 = 44. C 15 - 4 = 11. D 11 + 4 + 5 + 2 = 22. E 27 - 2 - 1 + 12 + 4 = 40. F 0 + 4 + 1 + 1 = 6. G 3 - 2 + 1 = 2.

Decider changed with no change of category: F-SHAPE-3 (the undo check, now Claude's reading), SES-18 (reviewing as a use for helpers, now Claude, "stretches line 21"), F-ROLES-5 and OT-1 (the standby clause, now dropped by Claude), F-HUM-6, INT-3, GAP-10 and F-JOB-1 (given as Claude's in the second draft; the main text has them staying from Bob's ledger and Foundations), F-HUM-12, PLN-3, F-JOB-6, GAT-2, SES-15 (a second decider added). Note changed only: P22, F-REL-1, F-SET-8a, F-STOP-2 (the external walk by rule, and the installer walk, withdrawn).

## 3. Judgment calls that move a count

1. **Open is F-PROP-12 and MNT-5.** I counted as open only the two rows that name the act which moves the process version. Both stand in words under either answer; what waits is whose act it is. If F-PROP-12 is counted kept as written, as the second draft had it and as section H's theme list reads: A 164, G 1. The drafting worker's notes guessed 1. Six more rows carry "Waits on Bob's question" and keep their status: JOB-4, MSG-5, MNT-1, MNT-4, MNT-7, P3.
2. **ARC-4 is counted in C**, as section I counts it, though Claude ends two of its clauses (format and coverage; ownership). If it is counted as ended by both: C 10, and a new cell of 1.
3. **PLT-5 and TXT-1 are in E** for a clause of their ledger notes, not of the printed line. If counted on the printed line only: A 165, E 38.
4. **The boundary between B and E.** A row that was B in the second draft stays B when one more clause in it ends (JOB-11 and GAP-2: the cost alarm; SHM-1: the drift check; F-SHAPE-3; F-GATE-3; F-SET-1). Counted by clause instead, those six would move: B 38, E 46.
5. **JOB-8 is in B**, like ARC-2: the rule stays, its check ends. If a line that names no check is counted as written when its check ends (as REQ-4, P23, GAP-6 are): A 164, B 43.
6. **Kept though the main text is silent on the mechanism:** REC-3 and the other status-command rows; PLN-2 (no written plan is named); SES-8 (the table is not mentioned); F-JOB-8 (how a red from another module is handled is Claude's). Each has a note. Counted as way changed, each moves one from A to B.
7. **F-REQ-7 is in D** with TXT-4. If its trimming is read as carried by "one short rulebook per role": A 164, D 21.
8. **Not yet settled is six rows.** F-ROLES-6, F-PLAT-6 and TM-8 touch the same four things in one clause and stay kept, with a note.

## 4. Against the counts stated in the main text, and the edit made

The main text gave the second-draft figures in two sentences and said they would fall. They differ from the recount, so both were edited. Nothing else in the main text was touched.

Section H, "The count". Before:

> Of your 288 requirement lines: 186 are kept as written; 46 are kept with the way of doing them changed; 15 end under the decisions recorded as yours; 11 are ended by Claude; 27 end in part, 4 of them by Claude; and 3 wait on the question in section M. These were counted on the appendix as it stood for the second draft. Four of the 15 are the three checks this draft counts as Claude's consequence (section I), and this draft ends further checks inside kept lines (below). So the first and third figures will fall when the appendix is redone.

After:

> Of your 288 requirement lines: 163 are kept as written; 44 are kept with the way of doing them changed; 11 end under the decisions recorded as yours; 22 are ended by Claude; 40 end in part, 13 of them under the decisions recorded as yours, 22 by Claude and 5 by both; 6 are not yet settled (section I); and 2 wait on the question in section M. These were counted on the appendix as redone for this draft.

Section A, last sentence. Before: "Of your 288 requirement lines, 186 are kept as written and 46 with the way of doing them changed (section H)." After: "Of your 288 requirement lines, 163 are kept as written and 44 with the way of doing them changed (section H)." This sentence is outside section H. It repeats the two figures, and leaving it would have made the main text state two different counts.

Other counts in the main text agree with the rows and were left: section I's "three lines", "three lines", "two lines", "two lines", "one line" (11) and "four lines"; section J's "thirteen items cover seventeen lines".

## 5. Rows where the main text is silent on a kept check that could stop work, or does not agree with a row

Listed, not resolved. The same list is in the appendix's opening notes.

Does not agree:

1. JOB-8. Section H says the rule that a job commits no built file stays as text, then that the module's own job builds and commits built files in its own pull request.
2. JOB-13, TM-10. Filed under decisions recorded as Bob's on the same sentence of the session's that, for the three checks, the main text calls Claude's consequence. That sentence also lists ARC-3 and JOB-8, which the main text keeps as rules.
3. F-ROLES-3. Kept; section G says ROOT, started by a plain prompt (line 16), does not meet it. Unproven.
4. OT-3. "Today there are none" against two retired hooks still in settings.json (sections G and K).
5. P1, F-FOR-5. "Working product behaviour onto main" against sections A and D: what is on main cannot be called working. Declared in the main text.
6. F-HUM-6. A tranche "merges on a green gate"; none of the three tests runs on the tranche's pull request (section D).
7. GAP-9. "No build starts on a line any of them contradicts"; section H says the ledger and the definition differ on every ended line, and does not say whether the build may start.
8. MNT-3, MNT-9, MNT-10. They assume tranches, releases and a certification of the process itself; the main text has one fix session for each fault and no process releases.
9. The status command: REC-3, REC-7, ARC-5, GAP-4, SES-4, MSG-6, MNT-7, F-PROP-0, F-PLAT-6, F-ROLES-6 are kept and rely on it. Section K's tool "does only" six things; a status print is not one. Neither kept nor ended.
10. F-REQ-4. Line 19 (some mechanical changes need no rerun of tests) against section G (a change reaches the tranche branch only with the tests of the changed modules passing). Marked unproven in the main text.

Silent on a kept check that could stop work:

11. F-MNT-1. The check of HEAD at a session's start. The pin check ends, the approvals comparison stays, HEAD is not named.
12. GAT-8. "The tool merges only a green, current tip." The second test run ends; whether the tool refuses a tip that is behind the tranche branch is not said.
13. ENF-1, F-PLAT-16. Command hooks, each of which can refuse a command. None is named as staying, and the main text does not say there are none.
14. F-GATE-4. "A failed fetch fails the check." J 13 keeps the two-part run and does not name this clause.
15. F-REQ-5, TXT-3 (ten rules) and F-REQ-8, TXT-1 (thirty lines). Whether these limits refuse anything is not said; J 9 says only that "Process3's existing limits on role texts refuse".

## 6. What the third-draft appendix changed, in numbers

- 288 rows, same order, same first four columns as the second draft. The "Now" column uses seven statuses; the decider is in it wherever a row is ended or its way changed.
- 51 rows changed category. 2 changed decider only. 4 keep their status with a changed note because a decision of Claude's was withdrawn. All 57 say CHANGED.
- 24 rows have the place "H, by the count only": the main text states them nowhere.
- No row gives a decision of Claude's, or a session's reading, as Bob's. Decisions in the record are cited by their line number in section B. Where the record's own sentence is the only source (JOB-13, TM-10), the row says so.

Not checked: I did not re-read the Foundations or DECISIONS.md against each quotation in the main text, and I did not open the ledger store files; line texts are from the disposition table.
