# The owner's requirements dated after the early Foundations, and whether the 288 lines hold them

Worker report, 14-15 Nov 2026, second main session. Reading and reporting only. Nothing was designed, committed, pushed or changed. Written early, on the main session's instruction, after a usage-limit stop; section 7 says what is finished and what is not.

## For the owner, in plain words

**What was checked.** Process4 is measured against 288 of your requirements, taken from your Keep and Drop page (the page where you marked each proposed rule keep, change or drop) and from your Foundations (the document describing how the process works). That list was made from a copy of your Foundations as it stood from 31 Oct to 4 Nov, and from the first Keep and Drop page only. A later copy of your Foundations, last changed on 9 Nov, exists in the process's repository. I compared the two copies line by line.

**What is new in the later copy.** About forty requirements written after 4 Nov, all dated 6 to 9 Nov:

- Twenty answers you gave on 6 Nov on a second Keep and Drop page: eleven about a new way of merging work (one shared branch per layer of modules) and nine from an audit (for example, two "triage lanes", one for the process and one for the product, that study each problem and bring you options).
- Five rules you gave on 6 Nov in chat about design lanes (standing areas of design responsibility): a lane must first research its area fully before it answers anything; it keeps that research in its own folder; and the first product gets an investigation lane and a publication lane beside the user-experience lane.
- Four principles you gave on 6 Nov in chat, each quoting you: records end themselves when their condition holds; the process foresees refusals before they happen; the move to another Claude account is rehearsed beforehand; GitHub's published limits are used up to 80 to 90 percent.
- Your words of 7 to 9 Nov on rounds and walks (a walk ends a round; the order in which a tranche ends), and on removing the job's written receipt.

**What is proven.** The two copies were compared word by word; every quotation below was checked against the file it comes from. The second Keep and Drop page itself could not be found: your live Keep and Drop page today holds only the first 159 lines. Your answers to the second page are known only from sessions' records. Only one answer is quoted word for word ("BOB starts jobs and lanes, not ROOT"); the rest are summaries such as "keep" or "modify, the notes restating the proposals". What each of those twenty lines said, in the page's own words, cannot be recovered.

**Where they stand.** None of the roughly forty is among the 288. Some are carried anyway, or were later replaced by your own words (the receipt removal; the 9 Nov word that the layer-sync rule was "far too broad"). The shared-branch-per-layer lines fall away because the fifth draft drops layers. Not stated anywhere in the fifth draft: lane qualification and research, the investigation and publication lanes, the two triage lanes, temporary measures kept out of rulebooks, records that end themselves, foreseeing refusals, rehearsing the account move, and your 6 Nov definition of what counts as a change to a module's interface. That last one matters to the separate study of notifications.

**In conflict with your words of 14 Nov:** your 8 Nov words put the installer and website update inside the tranche; on 14 Nov you put them outside. The 6 Nov exemption for the undo check of tests falls with "three tests and no others". The 6 Nov rule that process fixes may land while a product's tranche runs sits against your 14 Nov rule that a product moves to a changed process only with your prior approval.

**Yours to decide:** whether each of these later requirements still stands for Process4. By your rule, anything you defined changes only by a proposal you answer. **Technical:** how each kept one is held.

**The "proposed changes" pages.** Both say every proposal was accepted by your 6 Nov answers. That is a session's record; no words of yours accepting them are quoted beyond the one sentence above.

---

## 1. Sources and how read (codes allowed from here)

Marks: (V) verified by me against the primary source; (A) an earlier report says so, not re-checked; (J) judgement.

| Short | What | How read |
| --- | --- | --- |
| F-E | `process4/evidence/foundations.md` (292 lines; header "Oct 31, 2026") | Word-level diff against F-L, all of it (V) |
| F-L | `process4/evidence/foundations_tranche_9nov.md` (306 lines) | Identical to `git show origin/tranche:governing/foundations.md` (V, `cmp`). Header line 1: snapshot of the claude.ai Foundations, exported 2026-11-07T05:45Z |
| F-7 | `git show 3155223:governing/foundations.md` (the 7 Nov snapshot commit) | Searched for codes (V) |
| LM | `origin/tranche:governing/ledger-map.md` | Read in full (V) |
| FPC, LPC | `origin/tranche:governing/foundations-proposed-changes.md`, `.../ledger-map-proposed-changes.md` | Read in full (V) |
| CLOG | `origin/start/coordinator-4nov:notes/coordinator-findings-3-4nov.md` | Searched; lines 719-748, 909-937, 1281-1286 read (V) |
| P3D | `origin/tranche:DECISIONS.md`, `triage/README.md`, rulebooks | Searched for SLB/AUD (V) |
| V5, APX | `definition/process4_definition_v5.md`, `..._appendix_v5.md` | Searched by keyword only (V for hits and zero-hit counts); not read in full |
| TSV | `evidence/process4_disposition.tsv` (288 rows) | Ids extracted (V) |

History of F-L on `origin/tranche` (V, `git log`): `3155223` 7 Nov 05:42 snapshot; `e64b95e` 7 Nov 16:55 internal walk; `46762b4` 8 Nov 16:13 rounds (BD-R1); `4766b06` 8 Nov 18:10 product-neutral wording (BD-R2); `6c76fbf` 9 Nov 00:02 round-close run; `b0c3783` 9 Nov 15:02 receipt removed. All authored "Claude". F-7 already holds every SLB, AUD (1,2,4-9), SES-19..23 and P24..27 code (V), so those were written into the live Foundations on 6 Nov (CLOG:739 "Docs agent applied Bob's 6 Nov answers ..."; CLOG:927 "Foundations rev 47"; CLOG:1008 "P27 confirmed in the Foundations doc, rev 52") (A for the revision numbers).

Codes in F-L not in F-E (V): AUD-1, 4-9; P24-P27; PD-21; R13, R15-R17 (build items); SES-19..23; SLB-1..12. None is an id in TSV (V, `comm`). AUD-2 and AUD-3 are not in F-L: AUD-2 was in F-7 and removed on 9 Nov (V, `b0c3783` diff); AUD-3 is only in LM:130.

## 2. Every addition or change, F-E against F-L

"Reword" = same requirement, different words. "New" = adds or changes a requirement. Line numbers are F-L's.

| # | F-L line | Kind | Text added or changed (quoted exactly) | Code(s) | Owner verbatim in quotation marks? | Date |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1, 5, 7 | Header | Snapshot note; "Recomposed 5 Nov 2026 from Bob's export of his original; unchanged."; "Proposed changes awaiting Bob are kept apart, on their own tab" | none | No | 5-7 Nov |
| 2 | 19, 131, 222, 251, 259 ("[product's]"), 295 | Reword | "Civicsmith" -> "the first product"; "The civicos" -> "An earlier product's"; "(civicsmith)" -> "(the process's GitHub account)"; "Civicsmith is a release" -> "A product is a release" | BD-R2 (commit 4766b06) | No | 8 Nov |
| 3 | 38 | New | "decides the product's technical matters, while the coordinator decides the process's, each written as a decision record (REC-11) and reported (AUD-5; coordinator, 6 Nov)" (replaces "decides everything technical and detailed") | AUD-5, REC-11 | No; "coordinator, 6 Nov" (CLOG:739 ruling 3) | 6 Nov |
| 4 | 44 | New | "A process triage lane and a product triage lane study each identified problem and bring you options with context before a response is chosen; a chosen short-term response reaches later sessions in their starting prompt, with the condition that ends it (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-8)." | AUD-8 | No; his answer "keep" (CLOG:733) | 6 Nov |
| 5 | 48 | New | "build one module's work in the open layer and publish it green onto the layer's shared branch, every ready module of the open layer at once, and the layer merges into the tranche once every job is complete and the layer's checks pass (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-1, SLB-2)"; "measured by its false-done rate and its cost per surviving job (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-9)"; removed "a job's claim is a receipt," | SLB-1, SLB-2, SLB-9; PD-21 | No | 6 Nov; removal 9 Nov |
| 6 | 56 | New (removal) | "Receipts in PR comments; CI re-runs them;" -> "CI's gate runs on the pull request;" | JOB-7, PD-21 | No | 9 Nov |
| 7 | 57 | New | "Done means merged, at the layer: a module is done at its last green publish with no reschedule outstanding, a layer when it is merged into the tranche, a tranche when it is merged into main by one pull request" ... "the tool publishes only green tips and merges a layer only when every job is complete and the layer's checks pass" ... "Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-5" | SLB-5, INT-1 | No | 6 Nov |
| 8 | 58 | New | "a refactor whose tests rightly pass both before and after the change takes a reviewed exemption, recorded on its pull request (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-1)" | AUD-1, JOB-12 | No | 6 Nov |
| 9 | 60 | New | "ROOT (depth 0, Bob's app) starts BOB, the watcher and the coordinator; BOB starts jobs and lanes; depth at most 3 (coordinator, 6 Nov)" ... "Creation only by you, ROOT, BOB (jobs and lanes; Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-8) or a scheduled task" | SLB-8, PLT-5, SES-1 | No in F-L; CLOG:733 quotes his note "BOB starts jobs and lanes, not ROOT" | 6 Nov |
| 10 | 68 | New | P24 row: "Recorded state carries a checkable end condition; the tool ends it when the condition holds; stale state is found and cleared by the process, not by hand. Bob: "Go with option 2, fix it in the tool, not just for this case, but fix process3 to anticipate and address these kinds of situations."" | P24 | Yes (quoted) | 6 Nov |
| 11 | 69 | New | P25 row: "The process anticipates refusals and inconsistencies and reports them ahead of the act. Bob: "It seems to me that we keep hitting items when checks are refusing modules with no ledger entry. Can we anticipate those conditions arising so that we can handle them either preemptively or more efficiently when they're identified?"" | P25 | Yes | 6 Nov |
| 12 | 70 | New | P26 row: "The account switch is rehearsed and preflighted before it's needed. Bob: "... the last account switch didn't go well at all. So I wonder if there's a way to anticipate or test for issues related to account switching now so that we're ready when the time comes."" (full quotation at F-L:70) | P26 | Yes | 6 Nov |
| 13 | 71 | New | P27 row: "Process3 conforms to GitHub's published limits, using up to 80–90% of them, and obeys GitHub's rate-limit responses. Bob: "If github publishes limits, then we should introduce process3 tooling that conforms to those limits. But rather than limiting usage to a small fraction of github's stated limits, I'd suggest that the tooling limit usage to 80% or 90% of github's published limits. That feels like the proper balance."" | P27 | Yes | 6 Nov |
| 14 | 77 | New | "BOB, one per product, is the only creator of jobs and lanes, and starts every job from the tool's list of startable jobs; under the layer branch no MERGER runs and nothing else starts jobs; its code is removed if the trial keeps the layer branch (SLB-11; coordinator, 6 Nov); nothing creates its own successor (SES-1; Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-8)." | SLB-8, SLB-11 | No | 6 Nov |
| 15 | 83 | New | Job row: "BOB, from the tool's list of startable jobs (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-8)" | SLB-8 | No | 6 Nov |
| 16 | 93 | New | Whole paragraph "**Lane qualification (SES-19 to SES-23; your word, 6 Nov).**" (text at F-L:93), with five quotations: "The important thing to remember when setting up lanes is the insure that a lane is fully qualified to fulfill their role as the load-bearing source of truth in their area"; "So The first time a lane is defined and run, it should start by using workers to fully research canon documents, existing code, and best practices related to their specialty area"; "This initial and ongoing research should be recording in a lane-specific area of the product repo for subsequent sessions to draw from and evolve"; "The lane charters used in earlier process versions included an investigation design lane and a publication design lane. Perhaps that's an appropriate partition to continue to use"; "These requirements related to lane startup and ongoing operations should be part of the process3 canon of requirements". Session's own words outside the quotations: "answers no ask until that research has landed", "is never what the build reads", all of SES-22 | SES-19..23 | Yes, five quotations (SES-22 has none) | 6 Nov |
| 17 | 100 | New | Watcher started by: "ROOT, as has run since 18:49 on 5 Nov; PLT-5's "whoever starts ROOT starts the watcher" is read as ROOT starting it (coordinator, 6 Nov)" | PLT-5 | No; the coordinator's reading (P3D DECISIONS.md:16, PD-1) | 6 Nov |
| 18 | 114 | New | "the watcher, which ROOT starts, takes over as ROOT only when watch says ROOT is full or silent ...; that is a standby taking the role, and it starts no new session. But it moves ROOT one level down, so a takeover is a bridge only: you restart ROOT from your app at depth 0 at your next opportunity, as on 5 Nov 18:44, and the new ROOT starts a fresh watcher (coordinator, 6 Nov; ...)" | PLT-5 | No | 6 Nov |
| 19 | 137 | New | "A job is one module's work in the open layer, from START to its last green publish with no reschedule outstanding ...; it may publish more than once, because a provider's interface change can reschedule it (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-2)." | SLB-2 | No | 6 Nov |
| 20 | 137 | New | "A walk, internal or of a release, ends the current round; a new round of the same tranche runs the plan's layers again, in order, starting jobs only for the modules its findings named and skipping layers that hold none, and rounds repeat until an internal walk is clean (PLN-4; your words, 8 Nov 2026, BD-R1: "Once a walk completes, that ends the current round, and a new round (of the same tranche) is started to work (layer by layer) to fix to those modules that have been identified as having flaws")." Also "The completion round's file retires once the copy's layer 12, its last use, merges ("Finish, then switch", 8 Nov 2026)." | PLN-4, BD-R1 | Yes (two quotations) | 8 Nov |
| 21 | 141 | New | "on its own branch, cut from the layer branch (layer/\<n>); each green publish is a small pull request into the layer branch with the START as its body, and its report is a comment (JOB-1; Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-2)." | SLB-2, JOB-1 | No | 6 Nov |
| 22 | 142 | Reword (follows #20) | "enters it as a found mark against that module for the round's later layer or the next round" | PLN-3 | No | 8 Nov |
| 23 | 144 | New | "never a full test suite in the session; the suite runs in CI (JOB-5; Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-7)"; "CI's own run of the job's tests is the evidence; there is no receipt (Bob, 9 Nov: "get rid of it completely"; PD-21)." | AUD-7, JOB-5, PD-21 | Yes for 9 Nov ("get rid of it completely"; CLOG:1286 confirms as his answer to "B3") | 6 Nov; 9 Nov |
| 24 | 147 | New | Step 9 rewritten: "A publish is gated against the layer branch as it stands and merges into the layer branch on its own green gate, with no re-gate on the merged result; once every job of the layer is complete and the layer's checks pass, module tests do not run again and the tool merges the layer branch into the tranche as one pull request (GAT-8; Bob's answer, ..., SLB-4, SLB-7)" ... "A module is done at its last green publish with no reschedule outstanding, and a layer when it is merged into the tranche (INT-1; ..., SLB-5)." | SLB-4, SLB-5, SLB-7 | No | 6 Nov |
| 25 | 148 | New | Step 10: "Every pin move made while a layer is open is followed by layer sync \<n> for that layer before any job in it lands ... (Bob, 6 Nov 2026, SLB-12)." | SLB-12 | No in F-L; CLOG:921 quotes his word "Yes, add that rule to the canon" | 6 Nov; superseded 9 Nov (row 30 below) |
| 26 | 154, 158-162 | New | "once per publish pull request tip ... (GAT-1; ..., SLB-3)"; table "Every publish pull request tip"; "Gate on each publish, no re-gate on the merged result; the layer merges once every job is complete and the layer's checks pass" (SLB-4); "Layer checks only; module tests do not run again" (SLB-7) | SLB-3, SLB-4, SLB-7 | No | 6 Nov |
| 27 | 166 | New | "A provider's interface change reaches its users at once, not through the provider's gate: a change to its exports, its Public / Provides text, or a test of one of its Provides requirements reschedules every user in the open layer; a running job halts its test run and restarts against the new version, and a run started before the provider's newest publish never counts; users in higher layers get an unmet requirement (GAT-3; Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-6)." | SLB-6, GAT-3 | No. FPC:71 says applied "in Bob's wording" and that the proposal's "An implementation-only change notifies no one" "is not in Bob's answer and was not applied" (session's record) | 6 Nov |
| 28 | 180 | New | "Your words are cited only where you said them, quoted with their date, and a decision someone else made names its maker (..., AUD-4). Process technical decisions are the coordinator's and product decisions are BOB's, each written as a short decision record (REC-11) and reported; only what P17 makes yours comes to you, with options and context (..., AUD-5)." | AUD-4, AUD-5 | No | 6 Nov |
| 29 | 182 | New | "Temporary measures live in the triage register with their end condition, never as rulebook lines (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-9)." | AUD-9 | No | 6 Nov |
| 30 | 236 | New | "during Process3's own first build, process fixes may land while a product's tranche runs, each recorded against the Ledger line it serves (GAP-9), and from the first certified release MNT-6 holds as written (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-6)." | AUD-6, MNT-6 | No | 6 Nov |
| 31 | 246-247 | New | "False-done rate, counted per job (one module's work in one layer): the share of COMPLETE claims refuted by independent re-verification, a red suite or revert check in the gate's run of that attempt (SLB-9; PD-21)." "Cost per surviving job: tokens or dollars per job (one module's work in one layer) whose work is still in place after a two-week revert window (..., SLB-9)." | SLB-9, SES-12 | No | 6 Nov; 9 Nov |
| 32 | 259 | New | "a walk's findings, which end the round; they enter as ledger entries against the modules they name, ... and the next round fixes those modules layer by layer. The internal walk is required, and the act that closes a round starts it itself, never between layers (your word, 7 Nov: "Required, tool-started", at "Round close only"). It is the round's last step: ... (your words, 8 Nov 2026: "the internal walk would be the last step of a round, but the live walk would only run once a round completed without any flaws identified in the internal walk"). The tranche ends in one order (your words, 8 Nov 2026, BD-R1): "This successive set of rounds continues until an internal walk doesn't find flaws, the release deployment happens, and the walk of the release also doesn't identify flaws. When the release walk is clean, the installer is updated for that release, then the [product's] website is updated to refer to the new install, and that ends the tranche." The process prepares those two updates and runs them only through the protected GitHub environment that names you as required reviewer ("Process, on my approval", 8 Nov 2026); tranche close refuses until a clean internal walk, then a clean release walk, are recorded, then names the installer update and the site update, in that order." | PLN-3, BD-R1 | Yes (four quotations; "[product's]" replaced "civicsmith.dev" on 8 Nov, commit 4766b06, so the quotation was edited) | 7-8 Nov |
| 33 | 261 | Reword | "becomes the next round's entries" (was "a round's entries") | P22 | No | 8 Nov |
| 34 | 295 | New | To-measure row: "The Shared Layer Branch, trialled on the first product's layer 7 after layer 6 closes and product work pauses for the process update (..., SLB-1, SLB-10)" with its measures, stop rule and "if kept, the merge train, the MERGER, the parallel window, provider holds, the in-flight hold, the plain queue and the fixes built for them are removed (..., SLB-11)" | SLB-1, SLB-10, SLB-11 | No | 6 Nov |
| 35 | 304 | New | "restated by Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-7: INT-4 reads that a layer closes when every job is complete and the layer's checks pass; module tests do not run again at close; whole-product checks run before a release; the next layer starts at once." | SLB-7, INT-4 | No | 6 Nov |

All (V) from the diff (scratch script, word-level `difflib` over stripped lines) and from the per-commit word diffs. Rows 2, 22, 33 are rewording; row 1 is a header; the rest add or change requirements.

## 3. The second Keep and Drop page, reconstructed

**Existence and date (V).** CLOG:725 (5-6 Nov, ~23:58): "Keep and Drop page: 159 earlier answers seeded; SLB-1..11 and AUD-1..9 undecided." CLOG:730 (00:17, 6 Nov): "Bob's 20 new answers were saved only in his browser ...; republished the page (v2) so it uploads them at next open". CLOG:733 (00:31): "BOB'S KEEP AND DROP ANSWERS (page db, 00:27-00:30Z ...): SLB-1, SLB-10, SLB-11 keep; SLB-2..7 and SLB-9 modify, the notes restating the proposals; SLB-8 modify: "BOB starts jobs and lanes, not ROOT"; AUD-1..9 all keep." So it was not a second artifact but new lines (20) added to the same page, then answered 00:27-00:30Z on 6 Nov (A for "same page": CLOG:730 says "republished the page (v2)").

**The live page today (V).** Read with the Artifact tool, version `1794615258-774c`. It contains 0 occurrences of SLB-, AUD-, SES-19..23 or P24..27, no link to any other claude.ai page (its only external URL is a font stylesheet), and an HTML comment saying it is the 5 Nov export of artifact `A8552Pq3eBXWHrKZzGoDBc` with "Bob's 159 answers (SEED)". The 20 lines were therefore overwritten when the page was later republished from the 5 Nov export (J). I read `A8552Pq3eBXWHrKZzGoDBc` once (it is named by his page); the tool reported it as a public page from outside the organisation and its summary found no SLB or AUD lines. I treated it as data only and followed nothing further.

**What the page's own statements said: not recoverable.** No copy of the 20 lines' statement text, suggestion, explanation, or his notes (except SLB-8's) exists in any repository branch I searched (V: `git grep 'AUD-[0-9]|SLB-[0-9]'` over all 309 remote branches; hits are only tool code, rulebooks, governing files, DECISIONS.md, notes and process4 files). The proposals the SLB lines carried are in FPC and LPC (the "Proposed row/text" columns), which say the same proposals "stand on the ... Process3 Keep and Drop Ledger" (FPC:5, LPC:5), so FPC/LPC are the nearest text to the SLB statements (J).

| Line | Statement, best available (whose) | His answer | Answer verbatim or summarised |
| --- | --- | --- | --- |
| SLB-1 | Adopt the Shared Layer Branch: one branch per open layer; a job publishes onto it only when its own tests pass; a provider's interface change reschedules its users; the layer merges into the tranche once every job is complete and the layer's checks pass (LM:273, session) | keep | Summarised (CLOG:733) |
| SLB-2 | A job is one module's work in one layer, published green onto the layer branch by pull request (LPC:11, FPC:23) | modify, note "restating the proposal" | Summarised; note text not recorded. Applied form at F-L:137, 141 |
| SLB-3 | Gate in CI once per publish into the layer branch (LPC:12, FPC:35) | modify | Summarised; applied as "once per publish pull request tip", FPC:27 calls this "Bob's wording" |
| SLB-4 | No re-gate on the merged result; the layer merges when every job has passed (LPC:13, FPC:51) | modify | Summarised; FPC:39 "in Bob's wording" |
| SLB-5 | Done means merged: a module by its green publish, a layer by one PR into the tranche (LPC:14, FPC:67) | modify | Summarised; applied with "last green publish and no reschedule outstanding" (LPC:14) |
| SLB-6 | A provider's interface change reschedules its users at its publish; a running user halts and restarts; higher layers get an unmet requirement; proposal also had "An implementation-only change notifies no one" (LPC:15, FPC:79) | modify | Summarised; FPC:71: applied "in Bob's wording (exports, Public / Provides text, or a test of a Provides requirement; a run started before the provider's newest publish never counts)"; the implementation-only sentence "is not in Bob's answer" |
| SLB-7 | Layer closes when every job has completed and passed and the layer's checks pass; module tests do not run again at close (LPC:17, FPC:109); his 5 Nov relayed word: "INT-4: layer checks run at layer close, but not module tests." (FPC:111) | modify | Summarised; applied "with the next layer starting at once" (LPC:17) |
| SLB-8 | The tool lists startable jobs and BOB starts them; no other session creates jobs; no MERGER (LPC:18, FPC:125); his 5 Nov relayed word "BOB starts jobs, not ROOT" (FPC:131) | modify, note "BOB starts jobs and lanes, not ROOT" | Verbatim (CLOG:733; DECISIONS.md:15) |
| SLB-9 | False-done and cost per surviving job (one module in one layer) (LPC:16, FPC:93) | modify | Summarised |
| SLB-10 | Trial on the first product's layer 7 after layer 6 closes; measures and stop rule "as on the Keep and Drop page" (LM:274) | keep | Summarised |
| SLB-11 | If the trial keeps the layer branch, remove the merge train, MERGER, parallel window, provider holds, in-flight hold, plain queue and their fixes (LM:275) | keep | Summarised |
| AUD-1 | Revert check restored, with a reviewed exemption for a refactor whose tests rightly pass before and after (F-L:58; CLOG:733 "AUD-1 revert gate restored with refactor exemption") | keep | Summarised ("AUD-1..9 all keep") |
| AUD-2 | A job's receipt is compared with CI's own run; false-done counts every disagreement; a receipt never exempts itself (F-7:144, 246) | keep | Summarised. Superseded by his 9 Nov "get rid of it completely" (CLOG:1286) |
| AUD-3 | GAT-6: a green tip skips the re-gate only when the tranche moved by record paths; the wider skips go with the merge train (LM:130) | keep | Summarised |
| AUD-4 | Bob is cited only where he said it, quoted with its date; other decisions name their maker (F-L:180; LM:182) | keep | Summarised |
| AUD-5 | Process technical decisions are the coordinator's, product decisions BOB's, each a decision record, reported; only what P17 makes Bob's comes to him (F-L:180; LM:66) | keep | Summarised |
| AUD-6 | During Process3's first build process fixes may land mid-tranche, recorded against their Ledger line, until the first certified release (F-L:236; LM:204) | keep | Summarised |
| AUD-7 | No full test suite in the job session; the suite runs in CI (F-L:144; LM:110) | keep | Summarised |
| AUD-8 | Process and product triage lanes bring Bob options with context before a response is chosen; a chosen short-term response reaches later sessions' starting prompts with its end condition (F-L:44; LM:162) | keep | Summarised |
| AUD-9 | Temporary measures live in the triage register with their end condition, never as rulebook lines (F-L:182; LM:179) | keep | Summarised |

The AUD lines came from "audit 2" against the Foundations and Ledger map (CLOG:719, 711 area: "audit 2 running against the Foundations and the Ledger map"); the audit file was not found (not searched further). SES-19..23, SES-22, SLB-12 and P24..P27 were not on the page: SES-19..23 are from chat (CLOG:909, 6 Nov 15:45); SLB-12 from chat (CLOG:921, "Yes, add that rule to the canon"); P24..P27 are quoted chat words in F-L:68-71. The handoff's grouping of "SES-19 to SES-23, P26" with the second page is therefore wrong in form: they were chat words written into the Foundations by sessions, not page lines (V for absence from CLOG:725/733; J for the conclusion).

## 4. Each later requirement against the 288, the fifth draft and his 14 Nov words

Classes: (a) among the 288 under another code; (b) not among the 288 but stated in V5; (c) in neither; (d) contradicted by V5 or by his 14 Nov typed words, or superseded by his own later words. V5/APX evidence is keyword search only (counts in §1); a class marked "prov." rests on that search and was not confirmed by reading V5 in full.

| # | Requirement | Class | Evidence |
| --- | --- | --- | --- |
| 1 | SLB-1, SLB-2, SLB-3, SLB-4, SLB-5, SLB-7, SLB-10, SLB-11 (shared layer branch, publish per job, layer merge, layer trial, removal of the merge train) | (d) | V5 drops layers: "The layer construct is dropped." (V5:87, as quoted by `lanes_owner_documents.md:133`, A). "layer branch" 0 hits in V5 (V). Underlying lines JOB-1, GAT-1, GAT-8, INT-1, INT-4 are among the 288 (V, TSV ids) in their 31 Oct form |
| 2 | SLB-6, the definition of an interface change ("a change to its exports, its Public / Provides text, or a test of one of its Provides requirements"), immediate rescheduling, halt and restart | (c) prov.; touches (d) | GAT-3 is in the 288 in its 31 Oct form (V). "reschedul" 0 hits in V5 (V). His 14 Nov: "There must be a practical means of identifying when a change doesn't require user modules to be updated" (bob_words_14nov_c.md:18) and he objected to the draft's change of trigger (bob_words_14nov_b.md:15). Relevant to the notification study (J) |
| 3 | SLB-8, "BOB starts jobs and lanes, not ROOT" | (a)/(b) for jobs and lanes; (d) for PROCESS | F-ROLES-1 and SES-1 among the 288 (V). V5:135 "ARCH ... starts jobs" (V). His 14 Nov "M1: ROOT" starts PROCESS (bob_words_14nov_c.md:25) |
| 4 | SLB-9, metrics counted per job | (d) | SES-12, F-MNT-4/5 among the 288; APX:255 "Ended in part. Claude decided"; APX:375 "Ended. Claude decided" (V) |
| 5 | SLB-12, layer sync after every pin move | (d) superseded by his own word | Bob 9 Nov: "SLB-12 sounds far too broad. An open layer may need to keep the old process version ..." (P3D DECISIONS.md:172; CLOG:1283 as session's quotation) |
| 6 | AUD-1, reviewed exemption from the revert check | (d) | Revert check ended by his answer to proposal 13, "O13: three tests and no others" (bob_words_14nov_c.md:46); APX:194, 227 "Ended. Bob's typed answer to proposal 13" (V) |
| 7 | AUD-2, receipt compared with CI | (d) superseded by his own word | "get rid of it completely" (9 Nov; CLOG:1286); V5:345 "*Ended.*" (V) |
| 8 | AUD-3, GAT-6 skip rule | (a) | GAT-6 among the 288 (V); its merge-train part falls with the merge train (J) |
| 9 | AUD-4, cite him only where he said it, quoted and dated | (b) in substance | His 14 Nov typed rule: "Only words I wrote count as my word. Never record your decision or your summary as mine." (bob_words_14nov_b.md:32). TXT-6 among the 288 (V). Not checked whether V5 states the rule as a process rule (prov.) |
| 10 | AUD-5, technical decisions the coordinator's (process) and BOB's (product), each a decision record, reported | (b) prov. | V5:135 ARCH "decides every technical matter of the product, writes each decision in the product's decision file" (V). Coordinator half not checked. His 14 Nov: "Decide technical matters yourself and tell me what you decided." (b:31) |
| 11 | AUD-6, process fixes may land during a product's tranche (first build) | (d) | His 14 Nov: "The transition from the process a product is being built using to the updated process will be done only with my prior approval" (bob_words_14nov_b.md:25). MNT-6 among the 288 (V) |
| 12 | AUD-7, no full suite in the job session; suite in CI | (a) | JOB-5 and PLT-4 among the 288 (V). V5 wording not checked |
| 13 | AUD-8, process triage lane and product triage lane | (c), and open against PROCESS | "triage" 0 hits in V5 and APX (V). His 14 Nov PROCESS words (b:25) cover the process half in part (J; `lanes_owner_documents.md` G7) |
| 14 | AUD-9, temporary measures in the triage register, never rulebook lines | (c) | "temporary measure" 0 hits in V5 (V) |
| 15 | SES-19, lane qualified as source of truth before deciding | (c) | "qualif" only V5:51, unrelated (V) |
| 16 | SES-20, first run researches canon, code, best practice | (c) | 0 hits (V) |
| 17 | SES-21, lane research area in the product repo | (c) | "research area\|lane-specific" 0 hits (V) |
| 18 | SES-22, research continues; ask workers read it first (session's text, no quotation) | (c) | 0 hits (V) |
| 19 | SES-23, investigation and publication design lanes beside UX | (c) | "investigation" 0 hits in V5 (V) |
| 20 | Lane rules "part of the canon" (6 Nov quotation) | (c) | as above |
| 21 | P24, recorded state ends itself by a checkable condition | (c) | "end condition" 0 hits (V) |
| 22 | P25, anticipate refusals and inconsistencies | (c) | "anticipat\|preflight" only V5:243, a different quotation (V) |
| 23 | P26, account switch rehearsed and preflighted | (c) in part | GAP-8 among the 288, "Kept as written" (APX:354, V); V5:395 "An account switch loses no work." (V). Rehearsal and preflight not stated (prov.) |
| 24 | P27, GitHub limits at 80-90% | (b) | V5:311: hint "same as in process3", and his 9 Nov "don't do it beyond just making sure that we don't exceed published limits" (V) |
| 25 | Watcher started by ROOT; takeover is a bridge, he restarts ROOT (coordinator, 6 Nov) | Not his word (coordinator's reading); (a) | PLT-5 among the 288 (V); his 14 Nov keeps the watcher ("O7", V5:131 per lanes report, A) |
| 26 | 7 Nov: internal walk "Required, tool-started", "Round close only" | (b) prov. | V5 has the internal walk as one of three tests (his 14 Nov typed words). Who starts it not checked |
| 27 | 8 Nov BD-R1: a walk ends a round; next round fixes only flagged modules | (b) in substance | His 14 Nov: "if flaws are found during an external walk those flaws are added to the next round, not the next tranche" (b:5) |
| 28 | 8 Nov: live walk only after a clean internal walk | (c) prov. | Not checked in V5 |
| 29 | 8 Nov: tranche ends with clean release walk, then installer update, then website update, "and that ends the tranche" | (d) | His 14 Nov: "installer and website are outside the tranche" and "installer and site updates wait for a clean development release walk" (bob_words_14nov_c.md:57-58) |
| 30 | 8 Nov: installer and site run only on his approval ("Process, on my approval") | (c) prov. | Not checked in V5 |
| 31 | 8 Nov "Finish, then switch" (completion round file retires after layer 12) | Process3-specific; moot (J) | |
| 32 | 9 Nov: no receipt ("get rid of it completely") | (b) | V5:345 (V) |
| 33 | 8 Nov BD-R2 product-neutral wording | Rewording; PLN-7 among the 288 (V) | |

## 5. Counts and groups

Counting each code or dated owner statement once (rows 1-33 of §4, with row 1 counting eight lines and row 20, 25, 31, 33 excluded as not requirements of his or Process3-specific): 8 (row 1) + 26 others = **about 38 later requirements**, of which **(a) 3** (AUD-3, AUD-7, SLB-8's jobs-and-lanes half), **(b) 6** (AUD-4, AUD-5, P27, 7 Nov internal walk, BD-R1 rounds, 9 Nov receipt; several provisional), **(c) 13** (SLB-6, AUD-8, AUD-9, SES-19..23, P24, P25, P26 in part, live walk after clean internal walk, installer/site on approval), **(d) 15** (SLB-1..5, 7, 10, 11, SLB-9, SLB-12, AUD-1, AUD-2, AUD-6, 8 Nov tranche-end order, PROCESS start in SLB-8). The counts are approximate because the V5 check was by keyword (J).

**(c) by subject, plain words.**
- Design lanes: a lane researches its area fully before it decides anything, keeps that research in its own folder, keeps researching; the first product has investigation and publication lanes beside the user-experience lane.
- Handling problems: a process triage lane and a product triage lane bring options; temporary measures live in a register with the condition that ends them, never in rulebooks.
- Self-maintenance: recorded state ends itself; the process foresees refusals; the move to a new Claude account is rehearsed beforehand.
- Notifications: his 6 Nov answer naming what counts as an interface change (exports, the public text, or a test of what the module provides).
- Release steps: the live walk only after a clean internal walk; installer and website run only on his approval.

**(d) by subject, plain words.**
- The shared branch per layer and everything tied to it (gone with layers in the fifth draft).
- Counting false "done" claims per job, and the undo check's exemption (ended by Claude's decision, and by "three tests and no others").
- The receipt, and the layer-sync rule (replaced by his own later words, 9 Nov).
- Process fixes landing during a product's tranche (against "only with my prior approval", 14 Nov).
- Installer and website inside the tranche (against "outside the tranche", 14 Nov).
- Who starts PROCESS (ROOT, 14 Nov) against "BOB starts jobs and lanes, not ROOT" (6 Nov).

## 6. Were the proposed changes answered by him?

- FPC:5 and LPC:5 (V): "Status, 6 Nov: every proposal below was accepted by Bob's answer on the Keep and Drop page (6 Nov 2026, SLB-1 to SLB-11) ... where his answer or note differs from the proposed row, his answer was applied". This is a session's record.
- His 6 Nov page answers are recorded only as CLOG:733's summary; only SLB-8's note is quoted. His two 5 Nov relayed words are quoted verbatim in FPC:111, FPC:131, LPC:22 ("INT-4: layer checks run at layer close, but not module tests."; "BOB starts jobs, not ROOT"), relayed by the coordinator, not typed into a file I could read.
- The proposals' "Source" (FPC:7, LPC:7) is "the design note Shared Layer Branch ..., Bob's design of 5 Nov" (https://claude.ai/artifact/FPZfRWFpp7frS2g6zqVuDV); not read.
- No proposal in either file is marked rejected or open. Whether he saw the proposed text itself, rather than the page lines, is not shown by the record (J).

## 7. Finished and not finished

Finished (V): the full comparison of the two Foundations copies (§2); reading of the ledger map and both proposed-changes files; the coordinator log's record of the second page; the live Keep and Drop page (no second page, no link).

Not finished:
- The fifth draft was checked by keyword only, not read; classes marked "prov." need a reading of V5 sections D-K. Rows 26, 28, 30 in particular.
- The audit file behind AUD-1..9 ("audit 2", 5 Nov) and the Shared Layer Branch design note were not looked for or read.
- The appendix was searched only for a few terms.

## 8. Wrong or stale in the brief, handoff or earlier reports

- The brief and `lanes_owner_documents.md:59` treat SES-19..23 and P26 as second-page lines. They were chat words of 6 Nov written in by sessions (CLOG:909; F-L:70), not page lines (V for their absence from CLOG:725 and 733).
- The second page was not a separate page but 20 lines added to the same Keep and Drop page and later lost when the page was republished from its 5 Nov export (CLOG:730; the live page's comment) (A/J).
- F-L's 8 Nov quotation "[product's] website" is an edited quotation: the 8 Nov commit replaced "civicsmith.dev" inside his quoted words (V, `4766b06` diff).
- AUD-2 appears in F-7 but not in F-L; a reader of F-L alone would miss that he kept it on 6 Nov and removed it on 9 Nov (V).
