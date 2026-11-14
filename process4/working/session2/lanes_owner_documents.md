# Lanes, as the owner's own documents state them

Worker report, 14 Nov 2026, second main session. Reading and reporting only. Nothing was designed, committed, pushed or changed.

## For the owner, in plain words

**What your documents say a lane is.** A lane is a standing area of design responsibility. It has its own folder of knowledge in the product's repository and is worked by one session (one running Claude conversation) at a time. A lane delivers designs, never product code.

Oldest first:

- 31 Oct, your note in your ledger: a lane is "a knowledge directory and design responsibility plus an on-demand worker", long-lived "only where measured worthwhile".
- Your Foundations: "You identify the need for a lane" and the architecture session (then called BOB, now ARCH) opens it; "the UX lane is always there"; jobs and lanes reach a lane only through that session, which "keeps the final say".
- Your standing approvals in the product's repository: design lanes "own their lane folders", the screens-and-journeys folder included; "each lane runs as one session at a time"; they "decide design and wording"; their design documents are claude.ai pages; a change inside a lane's own folder merges without a test run.
- 5 and 6 Nov, as sessions recorded you (not your typing): a lane is not a read-only helper; a lane must first be "fully qualified" as "the load-bearing source of truth in their area", by research kept in the repository; three lanes for Civicsmith (user experience, investigation design, publication design); and two "triage" lanes, for the process and for the product, that study each problem and bring you options.
- 14 Nov, typed: process changes happen only in "a separate process lane call PROCESS that I interact with"; the first session you start (ROOT) starts it.

**What is proven.** Each quotation was checked against the document it comes from. Your three live documents are unchanged from the copies kept here; only the ledger mentions lanes. Nothing about lanes in Process4 has run.

**What is wrong today.** Your lane requirements of 5 and 6 Nov are in none of the 288 requirement lines Process4 is checked against: that list was made from an earlier copy of your Foundations. The fifth draft gives lanes four sentences and says ARCH defines lanes, where your Foundations say you identify the need. It leaves out one session per lane, qualification, the always-present UX lane and the triage lanes.

**Yours to decide** (your documents disagree or are silent):

1. Who starts a lane: your documents say only the architecture session; on 14 Nov you had ROOT start PROCESS.
2. Whether PROCESS replaces the two triage lanes.
3. Whether you talk with design lanes directly, as on 5 Nov, or only through the coordinator (your front-door session).
4. Which lanes Process4 begins with, and whether a new lane needs your word.
5. Where the screens and journeys the walks are measured against live: claude.ai pages (5 Nov) or the product's folder (14 Nov).
6. Whether a lane session takes a job slot.

**Technical, for Claude to decide and report:** how a lane session is started, handed over and recorded; where its research is kept; how its changes merge.

---

## 1. What was read, and how (codes allowed from here on)

Claim marks: (V) verified by me today against the primary source named; (A) an earlier report says so, not re-checked; (J) judgement.

Short names used below:

| Short | What | How read |
| --- | --- | --- |
| OW-b, OW-c | `process4/owner_words/bob_words_14nov_b.md`, `..._c.md` | Read in full |
| P3-CLAUDE | `/home/user/process3/CLAUDE.md` (3 lines; identical to `origin/main:CLAUDE.md`, checked with `cmp`) | Read in full |
| F-ev | `process4/evidence/foundations.md` (292 lines) | Lines 1-100 read; whole file searched |
| LL | `process4/evidence/ledger_lines.md` (1703 lines) | Searched; read around every hit |
| APX | `process4/definition/process4_definition_appendix_v5.md` | Lines 1-118 read; lane rows read |
| V5 | `process4/definition/process4_definition_v5.md` | Lines 75-193, 253-313, 358-376 read; whole file searched |
| P3T:path | Process repository, branch `origin/tranche`, tip `38b0f3f` (9 Nov). `git -C /home/user/process3 show origin/tranche:<path>` | Searched for "lane"; hits read |
| CLOG | Process repository, `origin/start/coordinator-4nov:notes/coordinator-findings-3-4nov.md` (the coordinator's log, a session's record) | Searched for Bob's quoted words on lanes |
| COPY-T:path | Product repository, branch `tranche`, tip `e7ec72e093014e59abcd736b9f8724bd57698b81` (9 Nov). Fetched read-only at depth 1 (`git fetch --depth=1 origin tranche`). `git -C /home/user/neobobkrause/civicsmith-copy show e7ec72e0...:<path>` | CLAUDE.md, process/config.json, DECISIONS.md (BD-2 to BD-5, BD-13), ux-substrate/README.md, build/plan/beta/LANES.md (head) read |
| COPY-M | Product repository `main` (`0dea5a6`), the local clone | CLAUDE.md read; docs searched |

**The three live documents (Artifact tool, action "read"; never web-fetched).**

- Keep and Drop Ledger: read. Page version `1794615258`, the same version `working/live_docs.md:12` records. Its store (159 answers) was read with the store tool and compared field by field with `working/ledger_store/decisions/`: 0 differences in 159 (V, script comparison). The lane text in the page matches LL (V). **No difference from the local copy.**
- Assessment: read through the Docs connector. Revision 52, the same as `live_docs.md:11`. A search for "lane" returns 0 hits (V). The local `working/assessment_doc.txt` also has 0 (V). **No difference; it does not mention lanes.**
- Field report: read through the Docs connector. Revision 1066, the same as `live_docs.md:13`. Search for "lane": 0 hits (V). **No difference; it does not mention lanes.**

**Not read.** The live Foundations page (https://claude.ai/artifact/RVZ8szbF1UHHSETkcGrKw8; I read its git snapshot, P3T:governing/foundations.md), the second Keep and Drop page answered 6 Nov (lines SLB-1 to SLB-12, AUD-1 to AUD-9; known here only through sessions' records), and the Process3 Build Plan (a claude.ai page said to hold lane lines LAN-1 to LAN-10; in no repository I could find). None of the three is in `process4/evidence/`.

## 2. Three findings that change the starting point

1. **The evidence copy of the Foundations predates his lane requirements.** F-ev has 6 lines that mention lanes. The snapshot on the process repository's tranche branch (header: "Snapshot of the claude.ai document ... exported 2026-11-07T05:45Z"; later commits to 9 Nov) has 10, including a whole paragraph "Lane qualification (SES-19 to SES-23; your word, 6 Nov)" that quotes him five times, and a sentence on two triage lanes (AUD-8) (V: `git grep -c -i '\blanes\?\b' origin/tranche -- governing/foundations.md` = 10; F-ev = 6). SES-19 to SES-23, AUD-8, AUD-9, SLB-8 and P26 are not in `process4_disposition.tsv` and not in APX (V: `grep -rIl 'SES-19\|AUD-8' process4` finds only `evidence/change_sample.md:120`, which records lane qualification as "Kept. Present" in Process3).
2. **His standing approvals contain a paragraph on design lanes, but only on the product's tranche branch.** COPY-T:CLAUDE.md line 11 (V, text read). P3-CLAUDE and COPY-M:CLAUDE.md have no sentence on lanes (V). The header of COPY-T:CLAUDE.md:3 says "widened on 5 Nov 2026 for design lanes". That Bob committed it himself through GitHub's website is (A): CLOG:597 ("copy commit 7c7e7c9a (15:47:14Z) by Bob through GitHub's website") and `evidence/permissions_inventory.md:30` ("last set by the owner 9 Nov"). I could not check the commit's author (the clone is depth 1 and the GitHub tool is not allowed on that repository). CLOG:591 says "Amendment text given to Bob", so the wording was drafted by a session and committed by him (A).
3. **Process3 already had a lane whose job matches his words on PROCESS.** P3T:governing/foundations.md:44 and P3T:triage/README.md:3: "The process-triage lane ... studies each identified Process3 problem and brings Bob options with their context before a response is chosen (AUD-8)." His words of 14 Nov: "the PROCESS session will explain the nature of the problem and suggestion options for fixing it for me to explore and ultimately choose" (OW-b:25). The match is (J); that he kept AUD-8 on 6 Nov is a session's record (CLOG:733).

## 3. What his documents say a lane is, from the statements only

Numbers in brackets refer to the statements in the last section.

**Kinds and names.**
- Design-area lanes. Ledger statement: "Design-area lanes (UX, AI, DB, performance)" [L1]. Foundations: "lanes for design areas you identify" [F1]; "the UX lane is always there" [F4].
- For Civicsmith: ux, investigation, publication [C3, R6, R7]. The session's record quotes him: "an investigation design lane and a publication design lane. Perhaps that's an appropriate partition to continue to use" [R6] and "Yes, publication design is the ACTIONS-DESIGN area" [R8].
- Triage lanes: "A process triage lane and a product triage lane" [G2].
- PROCESS: "a separate process lane call PROCESS" [O1].
- No lane named DESIGN or PRODUCT in capitals exists in any document searched (V: `grep -w 'PRODUCT\|DESIGN'` over owner words, F-ev, LL, DECISIONS, review, live_docs, assessment: 0 hits). Earlier process versions used capital names (UX-DESIGN, INVESTIGATION-DESIGN, ACTIONS-DESIGN, AI-DESIGN, JOURNEYS, PERFORMANCE, PROCESS-REDESIGN, PROCESS-REPAIR, PLANNING, PLATFORM, FILES, CAPABILITIES, TESTS-SWEEP): P3T:notes/lane-charters.md and COPY-T:build/plan/beta/LANES.md, both sessions' texts.

**What a lane owns.**
- "a knowledge directory and design responsibility" [L2]; "A lane carries a design responsibility and a directory of design knowledge in the repository" [F4].
- "A lane has one area of focus, reads it whole and delivers designs, never product code" [L4].
- Its folder: "Design lanes, run under BOB, own their lane folders, the design stream (docs/development/ux-substrate) included" [A1]. "Within the product's principles they decide design and wording there." [A1]
- Its research area: "a lane-specific area of the product repo" [R5].
- Its design documents, which are not in the repository: "Their design documents are claude.ai artifacts, not repository files." [A1]
- A branch: his documents are silent. (Process3 used `lane/<name>` branches; that is the other worker's subject.)
- A module: his words are silent. The product's config ties the ux lane to a module, `"module": "ux-design"`; the other two name none [C3, C4].

**Lane and session.**
- "each lane runs as one session at a time" [A1]; "there should only be ONE session per lane at a time" [R2].
- Earlier and different: "a lane is a knowledge directory and design responsibility plus an on-demand worker BOB starts ...; a long-lived lane only where measured worthwhile" [L2]; "Whether a given lane runs as a long-lived session or as a worker started with its directory is BOB's call, judged by cost" [F4]; to be measured [F6].
- Later: "I'm not sure we should say that a lane is a read-only helper. For example, it writes and updates design documents" [R3].

**Lane and job, module, round, tranche.**
- Job: "jobs and lanes reach a lane only through BOB" [L4]; "Requests between jobs and lanes pass through BOB ... Spokes never see each other" [F3].
- Design before building: "a question that is Bob's becomes his decision and a design before anything is built" [L4].
- Tests: "A pull request that changes only files in its own lane's folder lands through the merge tool without a test suite run" [A1]; "I don't believe that lanes' file changes need to be tested the way jobs do" [R4].
- Round and tranche: silent, except "the large files a lane's generators build are built at layer close, deploy and release, never committed" [A1] (layers end in Process4) and the measurement "Tranche close" [F6].

**Who starts and who ends a lane.**
- Start: "BOB is the only creator of jobs and lanes" [F2]; "You identify the need for a lane and BOB opens it" [F4]; roles table "Lane | BOB, when you identify the need; some stay open, UX always" [F5]; 6 Nov answer as a session recorded it: "BOB starts jobs and lanes, not ROOT" [R9]. Against: ledger statement "BOB defines lanes without Bob's approval" [L4]; and for PROCESS, "M1: ROOT" [O3].
- End: silent in his words. "some stay open for extended periods; the UX lane is always there" [F4]; "A long-lived lane refreshes under BOB's management so depth stays consistent" [F5, L2].

**How lanes talk to each other, to ARCH, the coordinator, ROOT and him.**
- Through the architecture session only [F3, L4, L3].
- "Lanes work because BOB knows how to delegate: it recognises a design question, passes it to the lane with enough context to decide, waits for the lane's decision, and keeps the final say." [F4]
- To him: "design documents that lanes create/update/interact with me using are CC artifacts" [R5b]. The ux lane's boundary with him, recorded as his "agreed" [C5].
- PROCESS: "that I interact with" [O1]; "ARCH can ask ROOT to start PROCESS if it isn't already running, and the coordinator can talk to PROCESS" [O3].
- ROOT and lanes otherwise, the coordinator and design lanes, the watcher and lanes: silent.

**What a design lane is and produces.** Designs, never product code [L4]. For ux: "the design stream (docs/development/ux-substrate)" [A1]; "it writes and updates design documents (like the UX Design doc). The UX design lane can create the word table" [R3]. His typed words of 14 Nov connect that folder to the two walks: "screens and journeys are kept in docs/development/ux-substrate/ in the product repo" [O5]; "An internal walk uses the UX Screens document ... The external walk follows the UX journeys" [O4]. The folder's own README (a session's text): "This folder holds only what the product's build and checks read (Bob, 5 Nov 2026). The design documents are claude.ai artifacts, kept by the ux lane"; it lists "Journeys" and "Screens" as claude.ai links [C6].

**Qualification.** "a lane is fully qualified to fulfill their role as the load-bearing source of truth in their area"; first run "should start by using workers to fully research canon documents, existing code, and best practices"; research "recording in a lane-specific area of the product repo for subsequent sessions to draw from and evolve" [R6]. All three are a session's quotation of him.

**PROCESS in his words.** [O1] in full, [O2], [O3]. A lane; he interacts with it; it explains the problem and offers options; several proposals may be open at once and are considered together; the changed process must still meet the Process4 requirements; a product moves to a changed process only with his prior approval; ROOT starts it; ARCH can ask ROOT to start it; the coordinator can talk to it; it holds "the processes".

**Limits.**
- One session per lane at a time [A1, R2].
- Depth: "depth stays at most 3 (coordinator, ROOT, BOB, job)" [L5]; the ledger's source line for it is "lane reached depth 4 in a day" [L5].
- Eight slots: "O8: across the account" [O6], said of job slots. Nothing in his documents says whether a lane session takes a slot.
- How many lanes at once: silent.

### Gaps and contradictions (both sides quoted)

| # | Subject | One side | Other side |
| --- | --- | --- | --- |
| G1 | Who starts a lane | "BOB is the only creator of jobs and lanes" (F-ev:67); "BOB starts jobs and lanes, not ROOT" (CLOG:733, session's record of his 6 Nov answer) | "Process changes only happen in a separate process lane call PROCESS" (OW-b:25) with "M1: ROOT" (OW-c:25). APX:268 flags this |
| G2 | Who decides that a lane exists | "You identify the need for a lane and BOB opens it" (F-ev:81) | "BOB defines lanes without Bob's approval" (LL:1584, the ledger statement; his note LL:1588 keeps the line "for questions that are Bob's by P17 only" and says "Lanes stay as SES-14 (modify) and SES-15 settled them", which settles neither) |
| G3 | Standing session or helper started on demand | "plus an on-demand worker BOB starts ...; a long-lived lane only where measured worthwhile" (LL:1033); "whether any lane runs as a long-lived session is measured" (F-ev:81) | "I'm not sure we should say that a lane is a read-only helper ... it writes and updates design documents" (CLOG:647); "each lane runs as one session at a time" (COPY-T:CLAUDE.md:11). The measurement was never taken (APX:395 keeps it; `process4_disposition.tsv:279` "Not measured") |
| G4 | Where screens and journeys live | "Their design documents are claude.ai artifacts, not repository files." (COPY-T:CLAUDE.md:11) | "screens and journeys are kept in docs/development/ux-substrate/ in the product repo" (OW-c:51) |
| G5 | Lane changes and the three tests | "lands through the merge tool without a test suite run" (COPY-T:CLAUDE.md:11) | The walks are measured against documents the ux lane owns and changes (OW-b:9, OW-c:51). His words do not say whether a lane change to those documents between walks is allowed. `working/audit2_corruption.md:463` (A): "The ux lane made 61 of 63 commits to the folder the walks are measured against" |
| G6 | Who he talks to | "interact with me" (CLOG:651); "that I interact with" (OW-b:25) | "The coordinator session is the front door." (V5:97, the session's record of 13 Nov) |
| G7 | Triage lanes and PROCESS | "A process triage lane and a product triage lane study each identified problem and bring you options with context before a response is chosen" (P3T:governing/foundations.md:44) | "Process changes only happen in a separate process lane call PROCESS" (OW-b:25). Nothing says whether PROCESS is the process triage lane renamed, or whether a product triage lane remains |
| G8 | Folder owner: lane or module | "own their lane folders" (COPY-T:CLAUDE.md:11) | "a job writes only its own module's files. Kept." (V5:94, session's record); the config gives the ux lane a module, `ux-design` (COPY-T:process/config.json:28-32) |
| G9 | Built files | "the large files a lane's generators build are built at layer close, deploy and release, never committed" (COPY-T:CLAUDE.md:11) | "The layer construct is dropped." (V5:87, session's record). V5:305 has Claude decide that the module's own job builds and commits built files (raised at `working/audit2_requirements.md:83`) |
| G10 | Slots | "O8: across the account" (OW-c:41) | Silent on lanes, on PROCESS, on the coordinator and on the watcher |
| G11 | Ending a lane | "some stay open for extended periods; the UX lane is always there" (F-ev:81) | Silent on who ends one and when |

## 4. What the fifth draft says about lanes

All (V), line numbers of `process4_definition_v5.md`.

- 141: "**A design lane** is, in your ledger note, "a knowledge directory and design responsibility". ARCH defines lanes and starts a helper or session for one when a design is needed. It delivers designs, never product code. A lane's pull request merges with no test; that clause is in your approvals."
- 143: "**PROCESS** is the lane where the process is changed: a session you talk to (section H)."
- 119: his act "At PROCESS: choose among the options offered for a process change, and approve a product's move to the changed process".
- 129: ROOT "starts PROCESS when ARCH asks (section H)".
- 257: his words on PROCESS, quoted in full. 259-275: the rule PROCESS works under; who starts it ("ROOT"); how a fault reaches it; which repository ("the processes"); "None of this has run."
- 362: "No Process4 role texts exist, and no PROCESS lane."
- 135: ARCH "settles a design before anything is built on it" (no lane named).
- 151: "Sessions are at most three levels deep, and none starts its own replacement." (lanes not placed).

**Omitted** (statement number, then what is missing):

- [F4, F1] "You identify the need for a lane"; "the UX lane is always there". APX:165 and APX:257 already note the second.
- [L4, F3] Jobs and lanes reach a lane only through the architecture session; that session keeps the final say.
- [L4] "reads it whole".
- [A1, R2] One session per lane at a time.
- [A1] Lanes own their folders; they decide design and wording "Within the product's principles"; design documents are claude.ai pages.
- [R6] Qualification, the research area, research before any answer.
- [R6, R8, C3] The three Civicsmith lanes.
- [G2] The triage lanes.
- [F6] The decision by measurement between a standing session and a helper (APX:395 marks TM-5 "Kept as written" at "C (a design lane)"; line 141 says "a helper or session" and names no measurement) (J).
- Whether lanes take slots, who ends a lane, how a lane hands over, on which repository and branch it starts, whether Bob talks to it.

**Contradicted or changed.**

- 141 "ARCH defines lanes" against F-ev:81 "You identify the need for a lane and BOB opens it". APX:165 records it as "way changed. Nobody named". (It agrees with the ledger statement LL:1584; see G2.)
- 141 "A lane's pull request merges with no test" is wider than the approvals, which limit it to "A pull request that changes only files in its own lane's folder" (COPY-T:CLAUDE.md:11).
- 141 "that clause is in your approvals": true only of the product's tranche branch. It is not in the process repository's CLAUDE.md nor on the product's main (V).
- 129 and 270, ROOT starts PROCESS, against F-ev:67. This follows his typed hint; APX:268 lists it.
- 305, built files committed by the module's job, against the approvals' "never committed" (G9).
- 185 "Which exact files each walk reads is Claude's to settle in the build" while the approvals give that folder to the ux lane (G4, G5).

## 5. Questions that only Bob can answer, and points for Claude

**Bob's** (his documents contradict each other or are silent on something that is his to define):

1. G1. Does only ARCH start lanes, with PROCESS the one exception that ROOT starts; or do his 14 Nov words change who starts lanes generally?
2. G7. Is PROCESS the process triage lane under a new name, and does a product triage lane remain?
3. G6. Does he work directly with design lanes (as his 5 Nov words describe), or only through the coordinator?
4. G2 with [R6]. Which lanes does Process4 start with for Civicsmith (ux, investigation, publication), and does a new lane need his word or may ARCH define one?
5. G4 and G5. Which governs for the documents the walks are measured against: claude.ai pages kept by the ux lane, or files in the folder; and may the lane change them while a tranche runs.
6. G10. Does a lane session (and PROCESS) count against the eight slots.

His lane statements of 5 and 6 Nov ([R2] to [R9], [G2], [A1]) are his by sessions' records and by his approvals. By the handoff's lesson 2 they change only by a proposal he answers; whether each still stands in Process4 is his.

**Claude's to decide and report:** how a lane session is started (repository, branch, starting text); how one session per lane is held; how a lane hands over and how depth is kept; where the research area is; how asks and answers between ARCH and a lane are recorded; how a lane's folder-only change merges; the file-against-module ownership of a lane's folder (G8); what replaces "layer close" in the built-files clause (G9), put to him as a proposal because the clause is in his approvals; how the 6 Nov measurement in [F6] is settled.

## 6. Wrong or stale in the handoff, the audits and the rules

- `worker_rules.md` rule 3 and HANDOFF line 51 place his standing approvals in `/home/user/process3/CLAUDE.md`. That file has no sentence on lanes. The lanes paragraph is in the product repository's CLAUDE.md on its `tranche` branch (V).
- HANDOFF line 51: "Lanes are barely present in the fifth draft." Confirmed: lines 141 and 143, plus section H for PROCESS (V).
- `evidence/foundations.md` is the 31 Oct to 4 Nov text. A later snapshot with his 6 Nov lane requirements exists at `origin/tranche:governing/foundations.md` in the process repository and is not in the evidence folder (V). The 288-line disposition therefore has no line for lane qualification, the three lanes, the triage lanes or "BOB starts jobs and lanes, not ROOT".
- `evidence/ledger_lines.md` covers the first Keep and Drop page only (159 lines, exported 5 Nov). A second page answered 6 Nov (SLB and AUD lines) is known here only through sessions' records (CLOG:733; P3T:governing).
- APX:257 marks SES-14 "Kept as written", audit code "a", while its own note says "The UX lane is always there" is not stated; and the fifth draft's "a helper or session" keeps the 31 Oct form without his 5 Nov words (J).
- `working/audit_ledger.md:168-173` (finding 13) and `working/audit2_requirements.md:215` raised lanes before; both worked from the same early Foundations and so missed the 5 and 6 Nov statements (V for the absence; J for the cause).
- `evidence/bob_naming.md` is not a naming document of Bob's. It is a session's study of the Bob/BOB name collision and has no statement on lanes (V: 0 hits). Its caution applies here: `bob_naming.md:102` says ledger-map lines marked "(Bob, 6 Nov)" carry "one sentence of his each, with principle wording and mechanism by the coordinator".

## Every statement, verbatim

Ordered by source. "Standing" is the line's place in the appendix to the fifth draft (APX).

### A. His typed words, 14 Nov (owner_words)

| # | Quote | File:line | Standing in APX |
| --- | --- | --- | --- |
| O1 | "Process changes only happen in a separate process lane call PROCESS that I interact with. Though process changes are often technical and detailed, the PROCESS session will explain the nature of the problem and suggestion options for fixing it for me to explore and ultimately choose. Because updates require my involvement and I might be away from my computer for extended periods, there could end up being more than one change being proposed in the PROCESS session at a time. When that happens, the set of changes are considered together as a group that could potentially have interactions and implications between. The process after a proposed change is made must continue to meet the process4 requirements (or the requirements changed with my explicit approval). The transition from the process a product is being built using to the updated process will be done only with my prior approval, with PROCESS proposing the best and least disruptive means of making the update." | OW-b:25 | Stated (V5:257). Decider for F-HUM-12 (APX:180), F-PROP-12 (APX:196), MNT-1 (APX:312), MNT-5 (APX:315), MSG-5 (APX:266); in conflict with MNT-3 (APX:313, code g) and F-ROLES-1 (APX:268) |
| O2 | "Lanes are an important element of the development process, though they haven't been fill into the process4 design." | OW-c:70 | Later than the appendix; not in it |
| O3 | "M1: ROOT" / "M2: There are communication channels between module jobs and ARCH, and between ARCH and the coordinator. ARCH can ask ROOT to start PROCESS if it isn't already running, and the coordinator can talk to PROCESS." / "M3: the processes" (M1: who starts PROCESS; M2: how a fault reaches it; M3: which repository it holds, per `process4_definition_v4.md` section M) | OW-c:25, 26, 27 | Stated (V5:270-272). APX:268 ends F-ROLES-1 in part on it |
| O4 | "An internal walk uses the UX Screens document to confirm that the workflow matches the definition. The external walk follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results." | OW-b:9 | Stated (V5:24-25). Names no lane |
| O5 | "screens and journeys are kept in docs/development/ux-substrate/ in the product repo" | OW-c:51 | Stated (V5:185). Names no lane |
| O6 | "O8: across the account" (the eight job slots) | OW-c:41 | Stated (V5:166); PLN-7 way changed (APX:162) |
| O7 | "O7: are you certain that the watcher isn't needed?" | OW-c:40 | Stated (V5:131); PLT-5 kept (APX:122). Names no lane |

P3-CLAUDE line 3 (his standing approvals in the process repository): no sentence on lanes (V).

### B. His Foundations, evidence copy (F-ev). A session-drafted document he adopted; "you" is Bob

| # | Quote | File:line | Standing in APX |
| --- | --- | --- | --- |
| F1 | "Product manager \| Audiences and their requirements, use cases, priorities, journeys, perspectives, resources and styles \| The canon and each module's requirements, cited by id; lanes for design areas you identify" | F-ev:23 | F-FOR-3, row 48: "Kept; way changed. Nobody named", code bN (APX:165) |
| F2 | "ROOT is the only creator of BOB, and the scheduled tasks only wake ROOT and watch its heartbeat; BOB is the only creator of jobs and lanes; nothing creates its own successor." | F-ev:67 | F-ROLES-1, row 151: "Ended in part", code cT (APX:268) |
| F3 | "**BOB routes, and explains to you (SES-15).** Requests between jobs and lanes pass through BOB, which routes them; it does not translate every exchange. Spokes never see each other. When BOB needs a decision from you, it describes and explains that decision with enough context, in words you understand, with options and a recommendation. The cost of routing in BOB's context is one of the first-tranche measurements." | F-ev:79 | SES-15, row 141: "Ended in part. Record of 13-14 Nov, line 17; Claude decided", code cR (APX:258); the measurement TM-4 "Ended. Claude decided", cC (APX:394) |
| F4 | "**Lanes (SES-14).** Lanes are ad hoc. You identify the need for a lane and BOB opens it; some stay open for extended periods; the UX lane is always there, as a directory and a design responsibility; whether any lane runs as a long-lived session is measured (SES-14). A lane carries a design responsibility and a directory of design knowledge in the repository. Lanes work because BOB knows how to delegate: it recognises a design question, passes it to the lane with enough context to decide, waits for the lane's decision, and keeps the final say. Whether a given lane runs as a long-lived session or as a worker started with its directory is BOB's call, judged by cost; a long-lived lane refreshes under BOB's management so depth stays consistent." | F-ev:81 | No row of its own. Carried by F-FOR-3 (APX:165) and SES-14 (APX:257, "Kept as written", code a, note: "The UX lane is always there" is not stated). "ad hoc", "some stay open", "keeps the final say" are stated nowhere in V5 (V) |
| F5 | "\| Lane \| BOB, when you identify the need; some stay open, UX always (SES-14) \| Inherits BOB's; tool-restricted \| A long-lived lane refreshes under BOB's management so depth stays consistent \|" | F-ev:74 | No row of its own; stated nowhere in V5 (V) |
| F6 | "\| Which lanes run as long-lived sessions and which as workers with the lane's directory (SES-14) \| Tokens per lane question; quality of answers as judged by you \| Tranche close \|" | F-ev:275 | TM-5, row 278: "Kept as written", code a (APX:395) |
| F7 | "BOB stays the hub between spokes, routing every request and translating only where needed (SES-15)" | F-ev:11 | As F3 |
| F8 | "A question that is yours becomes your decision, and a design, before anything is built on it (P21)." | F-ev:38 | P21, row 227: "Kept as written", code a (APX:344); V5:135 |

### C. His Foundations, later snapshot (P3T:governing/foundations.md, exported 7 Nov, edited by sessions to 9 Nov). A session's record of him; none of it is in the 288 lines or in APX

| # | Quote | File:line | Whose |
| --- | --- | --- | --- |
| G1 | "\| No session starts its own successor; ROOT (depth 0, Bob's app) starts BOB, the watcher and the coordinator; BOB starts jobs and lanes; depth at most 3 (coordinator, 6 Nov) \| Creation only by you, ROOT, BOB (jobs and lanes; Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-8) or a scheduled task \| PLT-5, SES-1 \|" | :60 | Session's text citing his answer |
| G2 | "A process triage lane and a product triage lane study each identified problem and bring you options with context before a response is chosen; a chosen short-term response reaches later sessions in their starting prompt, with the condition that ends it (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-8)." | :44 | Session's text; his answer was "keep" to a session-drafted line (CLOG:733: "AUD-1..9 all keep") |
| G3 | "**Lane qualification (SES-19 to SES-23; your word, 6 Nov).** A lane is the load-bearing source of truth in its area, and is qualified for that before it decides anything (SES-19; "The important thing to remember when setting up lanes is the insure that a lane is fully qualified to fulfill their role as the load-bearing source of truth in their area", your words, 6 Nov). The first time a lane is defined and run, it starts by using workers to research fully the canon documents, the existing code and the best practices of its specialty area, and answers no ask until that research has landed (SES-20; "So The first time a lane is defined and run, it should start by using workers to fully research canon documents, existing code, and best practices related to their specialty area"). A lane-specific research area in the product repository records that research and the ongoing research after it; it counts as the lane's own folder, is never what the build reads, and every later session of the lane reads it first, draws from it and evolves it (SES-21; "This initial and ongoing research should be recording in a lane-specific area of the product repo for subsequent sessions to draw from and evolve"). Research continues as the lane works: a question its research area does not answer is researched and recorded there, and a `lane ask` worker reads the research area first too (SES-22). Lanes are cut by design area; for the first product, the earlier process versions' investigation design and publication design lanes, beside UX (SES-23; "The lane charters used in earlier process versions included an investigation design lane and a publication design lane. Perhaps that's an appropriate partition to continue to use"). These lane startup and operating requirements are part of the Process3 canon ("These requirements related to lane startup and ongoing operations should be part of the process3 canon of requirements", your words, 6 Nov)." | :93 | Session's text with five quotations of him. The sentences outside the quotation marks ("answers no ask until", "is never what the build reads") are the session's |
| G4 | "Temporary measures live in the triage register with their end condition, never as rulebook lines (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-9)." | :182 | Session's text citing his answer |
| G5 | Lines 29, 77, 84, 89, 91, 288 repeat F1, F2 (with "BOB, one per product, is the only creator of jobs and lanes, and starts every job from the tool's list of startable jobs"), F5, F3, F4 and F6 | :29, 77, 84, 89, 91, 288 | As section B |

### D. His Keep and Drop Ledger (LL; identical in the live page and store today)

| # | Quote | File:line | His mark | Standing in APX |
| --- | --- | --- | --- | --- |
| L1 | SES-14 statement: "Design-area lanes (UX, AI, DB, performance) as long-lived sessions with their own refresh lifecycle." | LL:1029 | modified, 2026-10-31 02:18 UTC | Row 140: "Kept as written", code a (APX:257) |
| L2 | SES-14 note: "Suggest: a lane is a knowledge directory and design responsibility plus an on-demand worker BOB starts with that directory as its reading set; a long-lived lane only where measured worthwhile. The lifecycle of a lane includes refreshes that BOB manages to keep the session depth consistant." | LL:1033 | His note. LL labels it "suggestion plus owner words"; `working/live_docs.md:120` (A): he added "and design responsibility" and the last sentence | As L1. V5:141 quotes six words of it |
| L3 | SES-15 statement: "BOB is the hub: every request and answer passes through it and it translates both ways." Note now in the store: "BOB routes every request between spokes and translates only where a requester cannot use the answer as given; toward Bob it always explains each decision of his with context, options and a recommendation. Routing share measured after the first layer. " | LL:1040, 1044; store read today | modified, 3 Nov; note saved again 14 Nov 00:17 UTC. The wording is the coordinator's of 3 Nov with its label removed (`live_docs.md:99-107`, A) | Row 141: "Ended in part", code cR (APX:258) |
| L4 | P21 statement: "Design and lanes: a question that is Bob's becomes his decision and a design before anything is built. A lane has one area of focus, reads it whole and delivers designs, never product code; jobs and lanes reach a lane only through BOB; BOB defines lanes without Bob's approval." Note: "Keep for questions that are Bob's by P17 only. Lanes stay as SES-14 (modify) and SES-15 settled them." | LL:1584, 1588 | modified, 2026-11-03 17:08 UTC. Note is a near-copy of the suggestion ("yours" changed to "Bob's", `live_docs.md:128`, A) | Row 227: "Kept as written", code a (APX:344) |
| L5 | PLT-5 source: "Requirements PLT-6 (lane reached depth 4 in a day); civicos ROOT; research: every self-spawning hub failed." Note: "... depth stays at most 3 (coordinator, ROOT, BOB, job), as ran on 3 Nov when the explore and review jobs merged at depth 3. The watcher is started beside ROOT by whoever starts ROOT." | LL:57, 60 | modified, 3 Nov; the note is the coordinator's writing of his chat word (LL:60) | Row 5: "Kept as written", code a (APX:122) |
| L6 | TXT-7 page explanation: "Every text the process produces, to you, to a job, to a lane, names who it is for and speaks plainly: no jargon, no flourish, enough context to understand." | LL:1158 | kept, 31 Oct (the explanation is the page's text, not his) | Row 194: "Kept; stated nowhere in the main text", code f (APX:311) |
| L7 | SES-14 and SES-15 page explanations, for and against (the page's text): "Under civicos and neoProcess, design areas such as UX, AI or database each had a long-lived lane session answering questions through BOB, with its own refresh cycle." / "The 29 Oct page made BOB the hub for every request between jobs and lanes, translating each question into the lane's terms and each answer back." | LL:1034-1036, 1045 | The page's text | Not lines |
| L8 | Ledger map: "\| SES-14 \| Lanes \| UX lane \| Phase 3 \|"; "\| P21 \| Bob's questions become designs; lanes \| Walk-through; UX lane \| Built (practice); Phase 3 \|" | `evidence/ledger_map.md:156, 231` | Session's map | Not lines |

Disposition table: `process4_disposition.tsv:49` (F-FOR-3, KEEP, "No decision ends lanes and there is no evidence against them"), `:141` (SES-14, KEEP, "No evidence that lanes failed; a lane's own build check caught a product defect (change_sample PR 203)"), `:152` (F-ROLES-1, KEEP), `:228` (P21, KEEP), `:279` (TM-5, KEEP, "Not measured"). The same rows are at `process4_disposition.md:103, 240, 261, 372, 453`. All sessions' text.

### E. His standing approvals in the product repository (COPY-T:CLAUDE.md). Not in the 288 lines; not in APX

| # | Quote | File:line | Whose |
| --- | --- | --- | --- |
| A1 | "Design lanes, run under BOB, own their lane folders, the design stream (docs/development/ux-substrate) included, and each lane runs as one session at a time. Within the product’s principles they decide design and wording there. Their design documents are claude.ai artifacts, not repository files. A pull request that changes only files in its own lane's folder lands through the merge tool without a test suite run, and the large files a lane's generators build are built at layer close, deploy and release, never committed." | COPY-T:CLAUDE.md:11 | His committed approvals (text V; that he committed it, and that a session drafted the wording, A: CLOG:591, 597; `permissions_inventory.md:30`). V5:141 cites one clause |
| A2 | "widened on 5 Nov 2026 for design lanes and a scheduled branch cleanup" | COPY-T:CLAUDE.md:3 | As A1 |
| A3 | "No session starts its own successor: ROOT starts a new BOB (the handover) and a new coordinator ... A successor takes over its predecessor's unarchived children: it answers or archives each." | COPY-T:CLAUDE.md:22 | Process lines copied in by a session (`permissions_inventory.md:55`, A); not approvals |

An earlier wording of A1 is quoted in the tool's README: "and their changes land through the gated merge train like any job's" (P3T:README.md:71). The 9 Nov text replaced it with "without a test suite run" (V for both texts; the order is J).

### F. Sessions' records of his words on lanes (CLOG, the coordinator's log). Not in the 288 lines; not in APX

| # | Quote | File:line, date | Whose |
| --- | --- | --- | --- |
| R1 | "23:25 BOB'S WORD (Bob): lanes are product-driven and evolve. Lanes written into the Build Plan (rev 239): LAN-1..LAN-10 (product-owned definitions, onboarding proposal, aspect partition with overlap/orphan check, recorded charter changes carrying knowledge/questions/lines, on-demand worker writing only its folder, ready design to unmet marks to jobs, Bob's questions one page then absorbed, routing via BOB, externally owned folder read-only by gate, long-lived only by measurement) and first Civicsmith lanes (AI design, journeys, performance, files and reading, UX read-only). Nothing built until Bob has read it." | CLOG:281, 4 Nov | Session's summary, no quotation marks. CLOG:574 says of it: "mixes his words (lanes product-driven and evolve) with "Nothing built until Bob has read it", unquoted, probably the coordinator's" |
| R2 | "17:33 BOB'S WORDS: "If you look at the lane design I think you'll find that it says there should only be ONE session per lane at a time. Again, we should look at the rational being used to justify multiple sessions and fix the process3 lane design so that a lane is kept to one session at a time."" | CLOG:646, 5 Nov | Session quoting him |
| R3 | "17:36 BOB'S WORDS: "I'm not sure we should say that a lane is a read-only helper. For example, it writes and updates design documents (like the UX Design doc). The UX design lane can create the word table - because that big file is an input to the release but doesn't go into the repo. The definition for lanes might need to be updated to reflect and encompass those realities - and not just those specific to the UX lane, but lanes generally."" | CLOG:647, 5 Nov | Session quoting him |
| R4 | "17:45 BOB'S WORDS: "the modules that use the word table have already passed their suites - they don't need to be retested. And the lane-specific documents, like the UX Design doc, doesn't need to be tested. So again, I don't believe that lanes' file changes need to be tested the way jobs do."" | CLOG:648, 5 Nov | Session quoting him |
| R5b | "17:50 BOB'S WORDS: "It's worth noting design documents that lanes create/update/interact with me using are CC artifacts. So they don't need to be checked in."" | CLOG:651, 5 Nov | Session quoting him |
| R6 | "15:45 BOB'S WORDS (lanes): keep the earlier partition (investigation design and publication design lanes). A lane must be fully qualified as the load-bearing source of truth in its area. On first run it researches canon, existing code and best practice with workers, and records it in a lane-specific area of the product repo that later sessions read and evolve. These requirements go into the Process3 canon." (The quoted sentences are in G3.) | CLOG:909, 6 Nov | Session's summary; quotations in G3 |
| R7 | "22:20 BOB'S WORD (Bob): the copy may become the real product ... First: lanes not yet exercised (UX design, AI design, files, performance...); inventory debt, pay it off, use lanes as in real development." | CLOG:267, 4 Nov | Session's summary, no quotation marks |
| R8 | "17:05 BOB'S WORD: "Yes, publication design is the ACTIONS-DESIGN area"." | CLOG:937, 6 Nov | Session quoting him |
| R9 | "00:31 BOB'S KEEP AND DROP ANSWERS (page db, 00:27-00:30Z; uploaded after the page fix): ... SLB-8 modify: "BOB starts jobs and lanes, not ROOT"; AUD-1..9 all keep." | CLOG:733, 6 Nov | Session's record of his page answers |
| R10 | "Bob 20:4x: no pile of rulings; triage lanes per repo hold problems with their end conditions (build/triage-lanes ...)" | CLOG:703, 5 Nov | Session's summary, no quotation marks |
| R11 | "18:06 BOB'S ANSWERS: ux Q1 'agreed' (Bob keeps direction, audiences and principles; the lane decides design and wording)." | CLOG:955, 6 Nov | Session's record; his word is "agreed" |

### G. Process3's decision record (`process4/evidence/DECISIONS.md`). The coordinator's records; each item marked

| # | Quote | File:line | Verbatim Bob, or session |
| --- | --- | --- | --- |
| D1 | "Context: applying Bob's 6 Nov Keep and Drop answers (SLB-8 "BOB starts jobs and lanes, not ROOT"; SLB-11; AUD-5) to the Foundations, the Ledger map and the Ledger doc left three conflicts" | :15 (PD-1) | Session's record; the seven quoted words are given as his page answer |
| D2 | "Decision: (1) ROOT runs at depth 0 from Bob's app and starts BOB, the watcher and the coordinator; BOB starts jobs and lanes; PLT-5's "whoever starts ROOT starts the watcher" is read as ROOT starting it." | :16 (PD-1) | The coordinator's decision |
| D3 | "IV-9 left the numbers to him; the lane recommended contrary recall at least 0.8 ... On 7 Nov Bob said: "I think that IV-9 is a technical decision that should be decided based on existing decisions and UX considerations."" | :50 (PD-8) | Session's record; one sentence quotes him, about a lane's recommendation, not about lanes |
| D4 | "ai-gate's F3 mark and IV-9's text are reworded by BOB and the investigation lane." | :52 (PD-8) | Session's text |
| D5 | "So the tool reads GitHub's own count ... only before a GitHub-heavy act (a job or lane start)" | :168 (PD-22) | Session's text. The Bob quotation in that record is about GitHub usage, not lanes |

None of D1 to D5 is among the 288 lines. PD-1 is the ground the session's record line 22 rests on (V5:105).

### H. The product repository's own documents

| # | Quote | File:line | Whose |
| --- | --- | --- | --- |
| C3 | `"lanes": [ {"name": "ux", "dir": "docs/development/ux-substrate/", "module": "ux-design"}, {"name": "investigation", "dir": "docs/development/investigation-design/"}, {"name": "publication", "dir": "docs/development/publication-design/"} ]` | COPY-T:process/config.json:27-41 | The process config, written by sessions |
| C4 | "BD-2: Two design lanes beside ux, investigation and publication (BOB, 6 Nov) Context: Bob, 6 Nov, through the coordinator: lanes keep the earlier partition, with investigation design and publication design beside ux. Each must qualify as the load-bearing source of truth in its area before it decides anything ... Bob, ~17:05Z: "Yes, publication design is the ACTIONS-DESIGN area"." and "Neither new lane names a `module`" | COPY-T:DECISIONS.md:25-26, 33 | The architecture session's record |
| C5 | "BD-4: Where Bob's UX ends and the ux lane's begins (BOB, 6 Nov, on Bob's word) ... Bob, 6 Nov ~18:05Z, through the coordinator: "agreed". Decision: Bob keeps the product's UX direction, its audiences and its principles. Beneath them, the ux lane decides design and wording: screens, flows, words, layout and visual language. ... A decision that would change a direction, an audience or a principle goes to Bob as "decision: Bob's", with options and the lane's recommendation." | COPY-T:DECISIONS.md:51-53 | Session's record; his word is "agreed" |
| C5b | "BD-3: Screens and words stay with ux; the other lanes design behaviour ... ux owns every screen and every word." "BD-13: The border between the investigation and publication lanes ... Requests across the border go through BOB." | COPY-T:DECISIONS.md:45-47, 112-122 | The architecture session's decisions |
| C6 | "This folder holds only what the product's build and checks read (Bob, 5 Nov 2026). The design documents are claude.ai artifacts, kept by the ux lane and recorded with `p3 lane artifact ux`." with a table giving "Journeys" and "Screens" as claude.ai links | COPY-T:docs/development/ux-substrate/README.md:3, 15-25 | Session's text citing him |
| C7 | "# The beta's design lanes **Status** · In force, Bob's (K5417, K5418, 2026-10-27): "let's get all of this designed, then integrated into a comprehensive build plan, and THEN start building it". Written by BOB #320." Rules for every lane: own branch and folder; "You decide nothing that is Bob's"; "Never message another lane directly; UX-DESIGN is reached only through BOB." | COPY-T:build/plan/beta/LANES.md:1-15 | Pre-Process3 session's text (27 Oct) quoting him once |
| C8 | "**The five standing lanes**, each a long-lived session in its own worktree, never archived for idleness" (BOB, SCHEDULER, CONDUCT, DIST, FLEET) | COPY-M:docs/development/ORCHESTRATION.md:10-20 | September process, session's text. An older meaning of "lane": every standing role |
| C9 | COPY-M:CLAUDE.md (3 lines, 1 Nov approvals): no sentence on lanes | COPY-M:CLAUDE.md | His first approvals |

### I. Sessions' own texts in the evidence folder (not his word)

| # | Quote | File:line |
| --- | --- | --- |
| S1 | "Two further kinds ran that the Foundations do not list: **short sessions** ... and **lanes** (ux, investigation, publication, triage), started by BOB." | `evidence/roles_root_coordinator.md:34` |
| S2 | "Two side channels: lanes showed him claude.ai artifacts (LOG L651, his words: "design documents that lanes create/update/interact with me using are CC artifacts"), and decision pages." | `evidence/roles_root_coordinator.md:208` |
| S3 | "So ROOT 0; coordinator, BOB, watcher 1; jobs, lanes, builders, short sessions 2." | `evidence/roles_root_coordinator.md:182` |
| S4 | "The Foundations name ROOT, BOB, jobs, lanes and workers. The coordinator appears nowhere in the original design." | `evidence/review.txt:317` |
| S5 | "5. Jobs and lanes meet only through you. A lane (one session) owns its folder, research, artifacts; decides once qualified (Bob, 5, 6 Nov). Ask it or a `lane ask` worker; you decide last." | P3T:rulebooks/bob.md:16 |
| S6 | "The process-triage lane's folder ... BOB starts the lane. It studies each identified Process3 problem and brings Bob options with their context before a response is chosen (AUD-8). Product problems go to the product's own triage lane." | P3T:triage/README.md:3 |
| S7 | "No earlier charter, lane, branch or ruling names a "publication design" lane. The lane that sat beside INVESTIGATION-DESIGN was **ACTIONS-DESIGN** ..." and, of the earliest rule for design lanes (K592, 30 Sep), Bob's words as that note quotes them: "make sure that this session only does design; you manage action development as you do all other development, in tranches with layers" | P3T:notes/lane-charters.md:10, 16 |

`evidence/no_layers_width.md:25` counts "lanes" among other ledger entries and says nothing about what a lane is. `working/assessment_doc.txt`: no mention (V).
