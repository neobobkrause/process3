# Notes on the fourth draft of the Process4 definition

14 Nov 2026. Written with `/home/user/handoff/process4_definition_v4.md` (62,593 bytes; the third draft is 62,655). Only these two files were written. No repository was changed and no session started. One read-only listing of file names was made in `/home/user/repos/civicsmith-copy` (section 4, item 6).

Section letters changed. v3 A, B, C, D, E, F stay A to F. New G "How the process is changed". v3 G (Permissions) = H; v3 H = I; v3 I = J; v3 J = K; v3 K = L. New M "What is not yet settled". v3 L = N. New O "Proposed changes to things you defined". v3 M's remainder = P.

## 1. Where Bob's typed words of 14 Nov conflict with a recorded decision or a kept requirement line, and how each is written

| # | His words today | What they conflict with | How the draft writes it |
| --- | --- | --- | --- |
| 1 | A tranche ends only when an external walk of a development deployment completes without flaws | Record line 6 ("A round that completes with no failures ends the tranche. An optional multi-session deploy-and-external-walk runs after that") and line 5 (third test is the internal walk alone) | His words followed. Stated in B ("Which recorded lines these change") and D ("What follows for the record"). The walk is written as the third test in two forms; that reading is proposal 4 |
| 2 | "A release can (optionally) be started after a tranche completes" | His words of 8 Nov (DECISIONS.md line 92): the installer and website update happen inside the tranche "and that ends the tranche"; and the 8 Nov ruling (DECISIONS.md line 108) that the installer is built once the internal walk is clean | J lists "updating the installer and website as part of ending a tranche" as ended under his words of today. D says Claude reads today's words as placing installer and website in the release. P asks him to confirm whether the installer is still built inside the tranche. Not resolved by me |
| 3 | External walk confirms "all journeys" | His words of 9 Nov (DECISIONS.md lines 123, 125): the first external walks run with no AI account; installer and site wait for "a release walk with AI on" | D "The journeys that use AI": Claude's reading is that the tranche cannot end until those journeys are walked; listed in P to confirm. Whether a release still has a walk of its own (the 9 Nov "release walk") is not said by his words today; the draft keeps the 9 Nov quotation and does not decide it |
| 4 | "development deployment" | 8 Nov words speak of "the release deployment" being walked inside the tranche | The draft uses his word of today. The 8 Nov sentence is quoted only as support for the order (internal walk first, then deployment) |
| 5 | Flaws from the external walk go to the next round | Third draft's consequence (findings wait for the next tranche) and its conflict with the Foundations ("nothing found waits for the next tranche") | Conflict removed; the Foundations line and his words now agree |
| 6 | Process changes only at PROCESS, with him choosing | Record line 2 ("waits for you only when it is completely blocked") and line 1 (only acts are settings changes) | G "What follows", first point, says both lines change. Table of his acts in C has a PROCESS row |
| 7 | Same | Record line 20 ("a process fix ... may only correct or remove what is broken") | Kept as standing. His words also allow the requirements to change "with my explicit approval", so line 20 can now be set aside only by him; G says a case with no corrective fix comes to him with options, one of them a change to the requirements |
| 8 | Same ("Though process changes are often technical ... for me to explore and ultimately choose") | His own first message of 14 Nov: "Decide technical matters yourself and tell me what you decided" | Not written as a conflict. The draft simply follows the later paragraph for process changes. Flag: he may want the boundary stated |
| 9 | Same | The 13 Nov withdrawal of "process changes only by Bob's merge" (assessment document, marked withdrawn as contradicting his requirements) | Not mentioned in the draft. His words today do not say he merges anything; they say he chooses and approves |
| 10 | "The transition ... only with my prior approval"; several changes "considered together as a group" | Foundations (a fault that stops nothing waits for the next tranche; one fixed version per tranche moved by a recorded act) and his words of 9 Nov in DECISIONS.md line 172 ("should happen as needed, but also ganged up when possible") | The third draft's choice between those two is removed. I: "one fixed version for each tranche, moved only with your prior approval". K item 7 rewritten to rest on PROCESS |
| 11 | PROCESS is "a separate process lane ... that I interact with" | Record line 17 ("The coordinator session is the front door") | Coordinator is written as "your front door for the product"; PROCESS is a second session he talks to. Not put to him as a conflict |
| 12 | Same | Kept ledger line "Only explicitly marked words of yours become decisions" | How his approval at PROCESS is recorded is listed as not yet settled (M item 4) |
| 13 | "When you change something I defined you need to describe the PROPOSED change" | Third draft's "Claude decided" entries that changed record lines or kept ledger lines | Section O; see section 2 below |
| 14 | "Yes, a job writes its own tests" | None found. The third draft's unanswered risk is reworded as a responsibility he has accepted, with the measured facts kept (N) |
| 15 | "process3-probes" | None. DECISIONS.md line 129 already names it as Process3's rehearsal repository |
| 16 | "You can create a subtree in the process3 repo for the container being used to update to process4." | My instructions did not mention this sentence. It bears on where the Process4 work is kept and possibly on "which repository PROCESS holds" | Quoted in B with Claude's reading (leave to keep the working files for the move in a folder of the Process3 repository) and "Say if you meant something else"; listed in P. I am not sure of the reading |

## 2. Proposals listed in section O, with source

| # | Proposal | What he defined (source) | Where the change came from |
| --- | --- | --- | --- |
| 1 | When the notice is sent | Record line 3 / line 5 (live_docs.md lines 33, 38) | v3 section E trigger of test two; v3_notes departure 3; replay/results.md lines 143 to 157 |
| 2 | Test one also runs another module's tests when a change touches its files | Record line 5 (live_docs.md line 37) | v3 section E trigger of test one; v3_notes departure 3; decisions_memo_d3.md section 6 |
| 3 | What a notified job does | Record line 10 (live_docs.md line 52) | v3 section E "What a notified job does"; v3_notes departure 2; replay/results.md lines 198 to 230 |
| 4 | The walk as one test in two forms | "Process4 has three tests, ever" (first message); record line 5; his words of today on the tranche | My task, point 1 |
| 5 | Tests for the process's own tool | Record lines 5 and 6 | v3 section E "The process's own tests"; decisions_memo_d3.md section 2. The 41,777 lines: enforcement_levers.md table row 4 |
| 6 | Who takes a free slot | Record lines 3 and 8 (live_docs.md lines 33, 47) | v3 section D step 3; v3_notes section 3 item 4 |
| 7 | No watcher beside ROOT | Ledger note of 14 Nov (live_docs.md line 105) | v3 section C; decisions_memo_d3.md section 7 |
| 8 | Eight slots for each product | Record line 9; the 13 Nov question with no recorded answer (live_docs.md lines 85, 185) | v3 section M, earlier open point 7 |
| 9 | A helper never reviews | Kept ledger line (ledger_lines.md line 1073) | v3 section C "A worker"; v3 said it "stretches line 21". Figures: change_sample.md line 33 |
| 10 | What "without flaws" means | His words of today | v3 section D "A round with no failures (Claude decided the meaning)" |
| 11 | The first trial uses made-up modules | Ledger note (live_docs.md line 123) | v3 section L head, "Claude decided the combined trial run ... stands as that slice" |
| 12 | Three acts of his beyond settings changes | Record line 1 | v3 section C table ("stated here for you to accept or strike"). I added the AI-account row to this group: his 9 Nov words are "we'll configure an AI", which do not make it his act alone |
| 13 | Checks ended because there are three tests | Record lines 5 and 6; ledger still shows each kept | v3 sections E ("Three consequences"), H (seven checks), I (three checks beside module tests), M (earlier open points 1 and 2) |

Not made into four-part proposals, and why:

- The ten ended and three kept items of v3 section J (now K): kept where they are with the head sentence the task asked for.
- "By Claude's decision" in J (three checks, first health number, three measurements): the same head sentence added. The three checks are also in proposal 13.
- The name ARCH in place of "BOB": the record of 14 Nov itself says "the ARCH session" (line 22), so I dropped "Claude decided" and say which document uses which name.
- ROOT's repository (lines 16 and 22 differ): a conflict between two records, not a change by Claude. Kept as one sentence in B and listed in P.
- Left as "Claude decided" because he did not define them: the order inside a round (the task says so); when a module's work is finished; the shared state; the moment of a change across many modules; who builds and commits built files; what counts as adding a test; folding modules that hold requirements and no code.

A weakness to know about. For proposal 13 the body is not put back to his ledger's state: sections E and I still treat those checks as ended, on his words "three tests and no others", and say that this reading is Claude's and his to overrule. Putting every one of those checks back into the body would contradict the three-tests decision he typed. If the main session wants the stricter form, sections I and J need the checks listed as standing until he answers.

## 3. Things I could not do, or did only in part

1. **Length.** The first full draft was 70.3 KB. To get under the third draft's length I cut, beyond the passages the task called moot: the paragraph "What Process3 did, corrected" (167 untold pairs); the three hard cases of correcting against adding down to one; the cost-of-zero example; the upgrade-test narrowing quotation ("the last 2 or 3 versions"); the Foundations quotation on a public release; the "(default: 20)" clause; the 218 of 220 and 28 of 279 figures in J; the detail of the three declared uses of a later module (v3 M technical point 2); "Your eight earlier open points" as a list (their content is in proposals 8, 12, 13 and in C); "Notes in your ledger" down to one sentence on the paste slip; trial items 17 and 18 (moot) and the wording of most others; evidence clauses in several K items; the Permissions section's working rules to three. Nothing the task told me to keep was dropped, but these are losses.
2. **Counts of requirement lines** (section I) were not recounted. The draft says so. Putting his definitions back moves a few lines between "kept as written" and "kept with the way changed".
3. **Point 6(c), "which counts under the fourth part".** In the draft's own list of the four parts (names, public requirements, tests, published files) tests are the third, and replay/results.md line 170 has the same order. The draft says "the third part".
4. **Point 6(c), "most of them only because the job edited a test".** results.md line 118 says the 71% arises "because nearly every job adds or edits a test whose title bears a requirement id"; it does not count how many of the 360 changed only a test. 360 less 167 is 193, which also includes added names and changed values. The draft says "It is that high because nearly every job edits a test ... and that alone counts", and does not say "most".
5. **Point 6(b), the example.** The pair monitoring and following is from results.md line 89, read at one recorded change's own commit. I did not check that the pair is still undeclared today, so the draft says "An example from the record ... imported ... did not declare". The 122 are pairs where a module's tests import from a module it does not declare (results.md line 74); the scan does not say that every one is a fixture or helper. The source for the job rule is interface_and_cycle.md line 64. "The record does not show laziness" is my wording of the task's "not loops"; it is a judgment.
6. **The UX Screens document and the UX journeys.** I used his names and did not find files with those names in the product clone (file names only, branch origin/tranche: there are screens-* job files and a journey-check job, no file called UX Screens). M item 7 lists how walkers read them as not yet settled.
7. **Point 6(a).** The task's wording (equal job times, 65 modules, about 177 jobs, about 100) is from attack_feasibility.md lines 125 to 140. That simulation sent a notice on every change. The draft adds one sentence that under his own definition (a notice only when the interface changed) there would be fewer, by an amount not worked out. That sentence is mine.
8. **The simulation's 59% to 71% shares** (attack_corruption.md) are no longer in the draft, to avoid a second "71%" beside the one he asked about.
9. **Nothing physical stops a product session changing the process.** Written as a risk with no trial (N), with his own sentence from the first message. I did not write in the lever from enforcement_levers.md (the sessions' account holding no write access to the process's repository), because PROCESS itself would work under that account and the task did not ask for a mechanism. The main session may want it under "not yet settled".
10. **One trial re-added from v3** (group 3, item 22): "one comparison from git, once, when the tranche ends", reworded as whether the process stayed as he approved it. It is in v3; say if it should go.
11. **Proposal 5** says the tool's tests "cannot stop a product job". That is the proposal's own term, not a measured fact.

## 4. New or changed figures, with source and kind

| Figure | Where | Source | Kind |
| --- | --- | --- | --- |
| 270 of 296 process changes made by sessions | N | enforcement_levers.md line 31 | measured |
| 116 version moves in nine days | N | as v3 | measured |
| 0 of 3,029 import statements undeclared in source | E | replay/results.md line 74 | measured |
| 122 pairs; 36 to a later module; 86 to an earlier one | E | results.md line 74; 86 is 122 less 36 | measured by a pattern search |
| 504 merges; 360; 167, "about a third" | E | results.md lines 97 to 101, 118 | measured by script |
| 236 of 241 (four parts); 175 (names and public requirements only) | E, N, O1 | results.md lines 146, 148 | measured on this record |
| 169; 64, 1, 2; 5 | O3 | results.md lines 209 to 223 | 169 and 5 measured; the rest one reader's judgment |
| 65 modules, about 177 jobs, about 100 | E, N | attack_feasibility.md line 138 | estimated |
| 2,342; 241; 2,101 | E | results.md line 36 | measured; verdicts are judgments |
| 285 of 776 commits were review fixes | O9 | change_sample.md line 33 | measured |
| 41,777 test lines in nine days | O5 | enforcement_levers.md table row 4 | measured |
| 8 KB to 134 KB | O5, K8 | as v3 | measured |
| 238 to 357 steps inside one round; 63 failures with every step ok | D, O10 | attack_corruption.md lines 49 to 57 | measured |
| about nine hours | G | attack_corruption.md line 165 | measured |
| both takeovers left no watcher, new ROOT one level deeper | O7 | roles_root_coordinator.md lines 134, 244 | measured |

## 5. Re-read against his standing rules: what I found and fixed

- Plain words: "signature" became "the way it is called"; "pattern scan" became "a script that searches today's code"; "fixture" is explained at first use; "refactoring" (his recorded word) is explained once; "registration" removed; no ids or codes (searched).
- Only his words count as his: every passage in the typed-words list and the PROCESS paragraph was checked by script as an exact substring of bob_words_14nov_b.md. A heading that put "All journeys." in quotation marks with a capital was changed, since his text has "all journeys". "By your words of 14 Nov, what reaches the main branch has passed ..." was a paraphrase put as his; now "Following your words of 14 Nov ...". The period inside the quotation of line 5's first test was moved outside.
- No assurance: "Now it is you who sees every proposed change" became "Now every proposed change is put to you"; the AI-journeys reading is marked as Claude's reading.
- Proven and unproven apart: kind added to figures that lacked one; the 122 is marked as measured by a search; the example pair is marked as from the record.
- No tests, gates, reviews or checks added: none added by this draft. Proposals 2, 5 and 10 each widen or add a condition; each was a "Claude decided" in v3 and is now put to him, and proposals 2 and 10 say in their own text that they widen or add.
