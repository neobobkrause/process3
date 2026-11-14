# Process4: disposition of the 288 Process3 requirement rows under the owner's decisions of 13 Nov 2026

One row for every requirement the three audits drew from the Keep and Drop Ledger, the Foundations and the Ledger map. Each row carries one disposition under decisions D1 to D11. Nothing here is a design, and no requirement is added.

## How to read this

- **Rows.** The row list and ids are those of audits A, B and C, in their order: 151 Ledger lines and 137 Foundations requirements. Audit C's cross-reference X-1 is uncounted there and here; it is the same sentence as F-HUM-12.
- **Requirement.** One line in the documents' terms. Under D10 the architecture role is written ARCH and the person is written "the owner"; text inside quotation marks is unchanged.
- **Kind.** PURPOSE is what the owner wants to be true; MECHANISM is one way of getting it. The audits' labels are kept, shortened. Audit C gave no kind to the Dropped, To-measure and Open-tension rows; those are assigned here.
- **Dispositions.** KEEP; KEEP PURPOSE, MECHANISM OPEN; ENDED BY DECISION; CANDIDATE TO END ON EVIDENCE; CONFLICT FOR THE OWNER.
- **Order of tests applied to a row.** (1) A decision ends or reverses it in words that can be quoted: ENDED. (2) A real conflict the decisions do not resolve: CONFLICT (for a check, only where evidence does not already make it a candidate). (3) Its purpose stands but a decision or evidence rules out or moots the Process3 mechanism: KEEP PURPOSE, MECHANISM OPEN. (4) It is a mechanism, no decision ends it, and the post-mortem shows it did not earn its place: CANDIDATE. (5) Otherwise KEEP.
- **Rows with one ended clause.** Where a row is kept and only a subordinate clause is ended (most often the word "layer"), the row stays KEEP and the note names the clause. All such clauses are gathered after section 2.
- **Checks.** A row that is itself a blocking check or review and is not one of D6's three tests is CONFLICT (group CHK) unless D6 names it or evidence makes it a candidate. A measurement or alarm that stops nothing keeps its own disposition. Section 5 lists all of them with both readings.
- **One reading was needed for D1.** D1 is read as limiting the owner's operational acts (commands, file edits, clicks in a system). His words, answers and decisions are not counted as such acts, because D2 speaks of "user input" and D10 of "words the owner himself wrote". If he means D1 to cover his answers too, F-HUM-15, F-HUM-16, REQ-5, REQ-7, PLN-5 and MSG-2 become conflicts.
- **Evidence.** Figures are quoted from the post-mortem files named. Those re-read for this table: change_sample, product_side, causal_forensics, verify_numbers, no_layers_width, DECISIONS.md. The one bob_naming figure was checked by line search; the one redteam_feasibility figure is taken from audit C and marked so. No figure was re-derived from the repositories.

The decisions, short: D1 no commands or source edits by the owner, only occasional GitHub or Cloudflare permission and rule settings. D2 unattended. D3 total order, one job per module, earlier first, interface changes notify users. D4 parallel jobs, a user-changeable bound, default 8 slots, actively filled. D5 no layers; strict order. D6 exactly three tests. D7 a failure-free round ends a tranche; optional deploy-and-external-walk after it. D8 the process runs under Claude; the owner is not a merge gate for process changes. D9 no interruption by refusals, stopping short, handoff scanning, utterances becoming rules, or piled-up caution. D10 the role is ARCH; only words the owner wrote are his word. D11 other requirements may change on evidence.

## The table


### Ledger PLT

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 1 | PLT-1 (kept) | One dated table of measured platform constraints, each with its evidence and workaround; nothing depends on a behaviour that is not a row. | MECHANISM (purpose: stand only on measured behaviour) | **KEEP** | No evidence against it (audit A). A record of measurements; listed in section 5. |
| 2 | PLT-2 (modified against the suggestion) | Depend only on acts the committed approvals cover and that were measured to pass; archiving sessions and switching off or deleting tasks are housekeeping, never needed for correctness. | PURPOSE | **KEEP** | D9 names permission refusals first among the interruptions. The modifying note was written in by the coordinator as the owner's chat word (D10; see the provenance note after section 4). |
| 3 | PLT-3 (kept) | Hard permission rules live in allow and deny lists, which run before the classifier; the classifier is never the policy. | MECHANISM | **KEEP** | Replaced in the Ledger by GAP-6 on 3 Nov; the deny-list half stands (F-PLAT-5). Measured 1 Nov: an allow rule does not take session and task acts out of the classifier. |
| 4 | PLT-4 (kept) | No step runs longer than the in-session background limit of about thirty minutes; anything longer is a CI workflow. | MECHANISM (platform fact) | **KEEP** | Bears on the walks of D6(iii) and D7: the two late deploy-and-walk runs took 60 and 64 minutes (product_side §6, CI time). |
| 5 | PLT-5 (modified against the suggestion) | No session starts its own successor; depth stays at most 3. | PURPOSE | **KEEP** | Platform fact: sessions are created only from depth 0 to 2. The modifying note was written in by the coordinator as the owner's chat word (D10; provenance note). |
| 6 | PLT-6 (kept) | A scheduled task is never required for correctness; a wake is a convenience and the record is read at every wake regardless. | PURPOSE | **KEEP** | D2 and D4 ("slots are actively filled") lean the same way: ready work does not wait on a timer. |
| 7 | PLT-7 (kept) | A session works on one repository, the product's; the process is a read-only clone at a pinned commit. | MECHANISM | **KEEP** | Platform fact behind it: a session reads the deny list only when it holds one repository. The cost of moving the pin is at MNT-5. |
| 8 | PLT-8 (kept) | GitHub acts a session cannot take run on GitHub's runner, by workflows with the owner's tokens as secrets. | MECHANISM | **KEEP** | Under D1 the owner's part is a GitHub setting (the secrets). |
| 9 | PLT-9 (kept) | Every credential is gathered once and checked at every tranche open; a missing grant stops a tranche from opening, never a step midway. | PURPOSE (mechanism: a check at tranche open) | **CONFLICT FOR THE OWNER** | Conflict CHK: the tranche-open check is a blocking check that is not one of D6's three tests. The purpose (no step fails midway for a missing grant) stands either way. The evidence against a grant check concerns its every-job-start form only (F-SET-3). |
| 10 | PLT-10 (kept) | A session's platform status is never read as its work state; the record is. | PURPOSE | **KEEP** |  |

### Ledger ENF

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 11 | ENF-1 (modified) | At most a handful of command hooks, each for a zero-exception rule, each with a legitimate blocked exit; none that hold a turn or judge text. | MECHANISM (restraint) | **KEEP** | D9 leans the same way. Today there are none. |
| 12 | ENF-2 (kept) | No model judge sits between a session's message and the owner. | PURPOSE | **KEEP** |  |
| 13 | ENF-3 (kept) | Nothing holds a turn; when the owner says stop, the session stops in that turn. | PURPOSE | **KEEP** | The owner's own P19 note keeps this beside "never idles": the mechanism for urgency is "never anything that holds a turn". |
| 14 | ENF-6 (modified) | No /goal and no model judging the transcript; a job that stops early is caught by status and the sweep. | MECHANISM | **KEEP** | D9 ("Claude stopping short of work it could do") bears on it: status and the sweep detect, they do not continue the work. Note recorded by the coordinator from the owner's "Yes, as recommended" (D10; provenance note). |
| 15 | ENF-7 (kept) | Every gate or hard rule offers the model a legitimate exit, "blocked", recorded and visible to ARCH. | PURPOSE | **KEEP** | Used 165 times in the week; in 72 the job said the work was done and "job complete" refused (product_side §6d). That is evidence about the gates, not against the exit. |

### Ledger REC

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 16 | REC-1 (modified) | Keep the durable and transient split, but move coordination traffic to pull-request bodies, comments and issues, or to a separate bookkeeping repository. | MECHANISM | **KEEP PURPOSE, MECHANISM OPEN** | Evidence against the home Process3 built (an orphan state branch): 12,881 commits, 70% of all commits from 3 to 9 Nov (product_side §3). The line itself names the alternatives; the definition must say which holds transient state. |
| 17 | REC-2 (kept) | One writer per file. | MECHANISM | **KEEP** | Held as a nudge (ledger_map). |
| 18 | REC-3 (kept) | One status command reads the whole state a role needs from git and prints it with sizes; a successor of any role starts from it alone. | MECHANISM (purpose: any session can be replaced from the record) | **KEEP** | Leans with D9 (no handoff scanning): a successor starts from status alone. |
| 19 | REC-4 (kept) | Record writes by the architecture session never cost a job a gate run or a completion. | PURPOSE | **KEEP** | Missed in Process3: 294 of 789 gate runs were started by record changes (product_side §4). That is evidence the purpose was not met, not evidence against it. |
| 20 | REC-5 (kept) | A remote act is recorded as done only from the tool call's result, never from its request. | PURPOSE | **KEEP** |  |
| 21 | REC-6 (kept) | An address is read from git at the moment of sending, and an address change is on the branch before it is announced. | MECHANISM | **KEEP** | Stands as long as addresses and messages remain. |
| 22 | REC-7 (kept) | The record of a halted build is complete: a fresh session's status tells everything open, idle, merged, unmerged and owed, with no transcript. | PURPOSE | **KEEP** |  |
| 23 | REC-8 (modified) | Keep a reading audit that judges reading by what a session can cite from the end of a document, and shrink documents so the question rarely arises; the start command prints the reading set with sizes. | MECHANISM | **CANDIDATE TO END ON EVIDENCE** | Evidence: the audit was never built in nine days (ledger_map: REC-8 "no audit", Gap, later gate), and the one reading restraint that held was a byte cap (causal_forensics, headline). The reading rule itself is P20, kept. Also an audit outside D6's three (section 5). |
| 24 | REC-9 (kept) | The build ledger is a schema-constrained JSON file with one mutable field per entry, not free-form markdown. | MECHANISM | **CANDIDATE TO END ON EVIDENCE** | Owner's note: "Try this, but measure the experience with an open mind as to whether it's work or not." Evidence: 105 of 508 landings changed nothing but process/ledger and process/metrics (product_side §2); the census built on the ledger was loosened after 7.3 hours (change_sample PR 204). The measure the Foundations set for it (corruption, bypass) is in no post-mortem file. |
| 25 | REC-10 (kept) | A CI check fails any commit that adds a file over a set size or under a transient path; a scheduled prune removes finished transients. | MECHANISM (purpose: P23) | **CANDIDATE TO END ON EVIDENCE** | Evidence: 947 findings on its first run (5 min 23 s) and false-positive repairs in seven later merges (change_sample PR 1); 495 runs in eight and a half hours, 403 on branches where "nothing reads it" (change_sample removal 116). The purpose is P23, kept. |
| 26 | REC-11 (kept) | Decisions go to short decision records the moment they are made, each in its own file, never as a line in a long plan. | MECHANISM (purpose: a decision has a visible home a requirement can cite) | **KEEP PURPOSE, MECHANISM OPEN** | D9 ("every user utterance being turned into a new rule until the rules overflow") bears on the mechanism. Evidence: DECISIONS.md went from nothing to 49 KB and 31 headings in four days, in one file (verify_numbers §7, §8). D10: a record is the owner's only if he wrote the words (23 of the 26 PD records are headed "coordinator"). |

### Ledger ARC

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 27 | ARC-1 (kept) | Modules sit in one total order, each in one layer, lower first; uses are declared and matched by imports; a violation fails the gate. | PURPOSE (mechanism: a check) | **KEEP** | D3 restates the order; D6(i) puts the uses-match-imports check inside each job's module tests. The clause "each in one layer" is ended by D5. Facts for the definition: the check was never in the tool's gate (ledger_map Gap), and the map today has three later-pointing uses and one cycle, so 27 of the 65 modules with work can never be ready under D5 until they are repaired (no_layers_width §2). |
| 28 | ARC-2 (kept) | Each file has one owner module; a job writes only its module's paths and tests and the strike of its own marks. | PURPOSE (mechanism: a check) | **CONFLICT FOR THE OWNER** | Conflict CHK: the ownership check in the gate and the merge is a blocking check outside D6's three. The purpose stands (D3: "Each module is updated and tested by a single job"). No evidence against the check: one false refusal, repaired on 3 Nov (change_sample PR 46, cited by audit A). |
| 29 | ARC-3 (kept) | A test asserts on a text's key, never on its words; every user-facing sentence lives once in the word table. | PURPOSE | **KEEP** | Owner's word of 30 Oct. A standard for how tests are written; its gate check was never built (ledger_map Gap). Section 5. |
| 30 | ARC-4 (modified against the suggestion) | Architecture, ownership, format and coverage checks run only against the job's module in its gate, layer checks when a layer closes, and over the whole product before a release or on the owner's word. | MECHANISM (timing; the owner's own note) | **ENDED BY DECISION** | D5: "The layer construct is dropped". D6: "No regression or deploy-and-walk between layers" and "The full regression is ended; the internal walk replaces it". The module-scope clause survives only as far as those checks count as part of test (i) (section 5). Evidence that the timing did not serve: no deployment for 80 hours while 308 landings went in, and the next walk found 1,691 failures (product_side, summary 3). |
| 31 | ARC-5 (kept) | Every check and gate finding names module, file and line in one machine-readable result that status reads; a red is never searched for in a log. | MECHANISM | **KEEP** | Not fully delivered in Process3: "the gate rows carry no reason field" (product_side, "What could not be established"). |

### Ledger REQ

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 32 | REQ-1 (kept) | Each module's requirements file has a public part and a private part, every statement under a permanent id. | MECHANISM (purpose: users see what they may depend on; ids can be cited) | **KEEP** | The public part is what defines a module's interface for D3. |
| 33 | REQ-2 (kept) | A requirement states behaviour at the interface, never an implementation; an ambiguity is removed by rewriting the text. | PURPOSE | **KEEP** |  |
| 34 | REQ-3 (kept) | A figure at a scale beyond the suite is a measurement with its own plan id, never a test line; a review never counts an untaken measurement as a gap. | MECHANISM | **KEEP** | By the line's own words a measurement, not a test; listed in section 5. |
| 35 | REQ-4 (kept) | A not-yet-met mark is struck only by the job that meets it, in its own commit. | MECHANISM | **KEEP** | Evidence is against the heavier Process3 form only: a named test demanded for every struck mark was removed after 5.8 days (change_sample PR 40). |
| 36 | REQ-5 (kept) | A change to what a provided service means goes to the owner only where it changes what the product does for its users and the canon is silent; every other change is ARCH's, recorded once. | PURPOSE | **KEEP** | D3 adds that every interface change notifies the users. Under D2 only the work that depends on the owner's answer waits. |
| 37 | REQ-6 (modified) | A size cap on a module's requirements triggers a split or consolidation before any job starts, with the number measured on the real product; never a refusal at a job's start. | MECHANISM | **CANDIDATE TO END ON EVIDENCE** | Evidence: the cap was built as a refusal of "job complete" at 70,000 bytes and was overridden 32 times of 32 with no catch; it drove 30 split requirement files, 64 commits and 47 block texts, and total requirement bytes did not change (product_side §6b, §6d). The purpose is P6, kept. |
| 38 | REQ-7 (kept) | Only explicitly marked words of the owner's become decisions; a ruling lives only until the requirement it refines is rewritten to absorb it, then it is deleted. | PURPOSE | **KEEP** | D9 and D10 restate it. |

### Ledger PLN

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 39 | PLN-1 (kept) | Work is structured as layers within rounds within tranches; nothing else about a product's size or shape is assumed. | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | D5 ends the layer term: "The layer construct is dropped". Rounds and tranches stand and are redefined by D6(iii) and D7. The definition must state the structure that remains. |
| 40 | PLN-2 (kept) | A plan is written from the work that remains; an entry is deferred only for one of three named reasons. | PURPOSE | **KEEP** |  |
| 41 | PLN-3 (kept) | Work found while a round runs is placed at once: in the running job, else a later START, else the completion round. | PURPOSE | **KEEP** | The clause "a later layer's START" loses its layer (D5). The route earned its place: 183 found marks raised, 132 met (product_side §5). |
| 42 | PLN-4 (kept) | The completion round has its own file, distinct from the next tranche's list. | MECHANISM | **KEEP PURPOSE, MECHANISM OPEN** | Made moot or changed by D5 and D7: in Process3 the completion round was what followed the plan's last layer (DECISIONS.md PD-12); under D7 rounds repeat until one completes without failures. The definition must say whether a separate completion file remains. |
| 43 | PLN-5 (kept) | Pause and resume are first class: the owner's word is recorded once in the plan's status line; every session reads it at its next status and takes no new step. | PURPOSE (mechanism: a status line) | **KEEP PURPOSE, MECHANISM OPEN** | Evidence against the mechanism: "the 3 Nov halt switched tasks off by hand" (ledger_map, PLN-5), and process activity ran for 2 h 20 min after the 9 Nov stop (product_side §8). D1: stopping must not need a command or a hand-switched task from him. |
| 44 | PLN-6 (kept) | A tranche's report states elapsed time, work finished, deferrals with reasons, work left, cost, and the share of cost that was process overhead. | PURPOSE | **KEEP** | D7 fixes when a tranche ends. Cost was often unobtainable (product_side, "What could not be established"); SES-9 says to name it unmeasured. A report; section 5. |
| 45 | PLN-7 (kept) | Two products may run tranches at once on one account; nothing in the process names a product. | PURPOSE | **KEEP** | The owner restated it on 8 Nov (DECISIONS.md BD-R2). D4 does not say whether the 8 slots are per product or per account; the definition must. |

### Foundations: What this process is for

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 46 | F-FOR-1 | The process exists to meet the standards the owner sets in two roles, product manager and software engineer. | PURPOSE | **KEEP** |  |
| 47 | F-FOR-2 | The owner's audience attributes are carried in the canon and each module's requirements, cited by id. | MECHANISM | **KEEP** |  |
| 48 | F-FOR-3 | Lanes for design areas the owner identifies; the UX lane is always there. | MECHANISM (purpose: the owner's UX and design standards have a keeper) | **KEEP** | No decision ends lanes and there is no evidence against them (see SES-14). |
| 49 | F-FOR-4 | The owner's engineering standards are carried by the module order and layers, the checks, the gate, measurements at scale (REQ-3), and the cost metrics. | MECHANISM | **KEEP PURPOSE, MECHANISM OPEN** | Three carriers are changed by decision or evidence: layers (D5), the checks and the gate (D6: three tests), and the cost metrics (JOB-10's evidence). The definition must name what carries scalability, performance and cost. |
| 50 | F-FOR-5 | Put correct, working product behaviour that meets its requirements onto main, quickly and cheaply, so that it survives (P1). | PURPOSE | **KEEP** |  |
| 51 | F-FOR-6 | Nothing else is output: a rule, record, check or test has value only as far as it serves that. | PURPOSE | **KEEP** | D9 restates it. |

### Foundations: The human and the AI

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 52 | F-HUM-1 | The owner defines the project; ARCH does everything else and decides everything technical and detailed (P17). | PURPOSE | **KEEP** | D1 and D8 restate it. What bounds ARCH's own changes to the process is the conflict at F-HUM-12. |
| 53 | F-HUM-2 | ARCH keeps the record, manages the development environment, takes the owner's input and reports to him in plain words as done. | PURPOSE | **KEEP** |  |
| 54 | F-HUM-3 | In the middle ground both offer opinions, options and recommendations; neither is dogmatic. | PURPOSE | **KEEP** | D11 is in the same spirit. |
| 55 | F-HUM-4 | The owner's time is the scarcest resource; he sees rendered pages, with options and a recommendation, only for what is his. | PURPOSE | **KEEP** |  |
| 56 | F-HUM-5 | An act only the owner can take is named and walked through in plain steps. | PURPOSE | **KEEP** | D1 narrows such acts to GitHub or Cloudflare permission and rule settings. |
| 57 | F-HUM-6 | By default a job, layer or tranche merges on a green gate without the owner; a public release waits for him; he may ask for his approval before a particular merge. | PURPOSE | **KEEP** | "Layer" is ended by D5. The public-release clause is the conflict at GAP-7. His approval of a particular merge is a gate only at his own request (section 5). |
| 58 | F-HUM-7 | The owner does not edit files or enter commands; the few steps the platform forces at onboarding are kept as few as possible. | PURPOSE | **KEEP** | D1 restates and tightens it: settings in GitHub or Cloudflare only, "very occasionally". |
| 59 | F-HUM-8 | When ARCH is unsure whether a question is the owner's, it decides by this section and says how it read it. | PURPOSE | **KEEP** |  |
| 60 | F-HUM-9 | When a mechanism cannot be built or a better one is measured, ARCH restates the line with its purpose unchanged and reports it in one line; only a change to what a line asks for comes to the owner (his word, 4 Nov). | PURPOSE | **KEEP** | D8 agrees: he is not a gate for changes of mechanism. This table uses the same split. |
| 61 | F-HUM-10 | A tranche can run from open to close with no one watching: every stop is a named blocker, ARCH starts other work meanwhile, and only a blocker only the owner can clear reaches him (GAP-1). | PURPOSE | **KEEP** | D2 restates "can run" as how the process runs. |
| 62 | F-HUM-11 | Caution is a cost, paid only against a measured failure or the owner's word; a reviewer's "what if" is one line in a report. | PURPOSE | **KEEP** | D9 restates it. |
| 63 | F-HUM-12 | Every problem is an architecture bug: ARCH finds why, corrects the design by rewriting the line it belongs to, and builds the correction; a workaround for the moment is not a fix (owner's direction, 2 Nov; repeated 7 Nov). | PURPOSE (as the owner worded it) | **CONFLICT FOR THE OWNER** | Conflict AUTH: D8 ("when a flaw in the process is found it must be fixed") and D9 (no piling on of tests, reviews, gates and checks) pull against each other on this line, given the record: 46 of 121 check-adding merges (38%) answered a failure of the process's own earlier machinery, and 47% of sampled additions were removed or loosened after a median 28 hours (change_sample, summary and §2). Audit C's uncounted cross-reference X-1 is this same sentence. |
| 64 | F-HUM-13 | The default answer to a finding with nothing measured behind it is no change; a rule, check, review round or measurement exists only against a measured failure or the owner's word (GAP-3). | PURPOSE (mechanism: a citation rule) | **KEEP PURPOSE, MECHANISM OPEN** | D9 restates the purpose and D6 caps the tests. Evidence against the citation mechanism: its audit was never built and "every rise cited" (causal_forensics §7); 44% of sampled additions guarded something never observed (change_sample, summary). |
| 65 | F-HUM-14 | When in doubt, run the product and let it show what matters. | PURPOSE | **KEEP** | D6(iii), the internal walk, is of this kind; the checks that held up were the ones that ran the product (change_sample §5). |
| 66 | F-HUM-15 | A question that is the owner's becomes his decision, and a design, before anything is built on it (P21). | PURPOSE | **KEEP** | Under D2 only the work that depends on the answer waits. |
| 67 | F-HUM-16 | Questions that are the owner's are asked in one place, numbered, with a column for his word; a decided question is never asked again. | PURPOSE | **KEEP** | D10: the column holds only words he wrote. |
| 68 | F-HUM-17 | A word the owner gives in chat is written into the walk-through by ARCH. | MECHANISM | **KEEP PURPOSE, MECHANISM OPEN** | D10: "only words the owner himself wrote count as his word", so a session's transcription cannot be what makes a word his. Evidence: of 218 attributions to him, 64 were his traceable words and 48 were a session's own decision written as his (bob_naming, table total; 47 of the 48 by the coordinator). |

### Foundations: The shape in one paragraph

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 69 | F-SHAPE-1 | Git and GitHub carry all state; messages only wake; each job's coordination is in its pull request. | PURPOSE | **KEEP** |  |
| 70 | F-SHAPE-2 | One architecture session per product plans from the build state and routes; job sessions each build one module as one draft pull request, every ready module of the open layer at once; in-session workers do bulk reading, review and sub-tasks. | MECHANISM | **KEEP PURPOSE, MECHANISM OPEN** | "Open layer" is ended by D5, which gives the readiness rule; D4 gives the bound (8 job slots, actively filled); D10 renames the architecture session. "One module, one job" is D3. |
| 71 | F-SHAPE-3 | Nothing the model says is evidence: a job's claim is a receipt, the gate is CI, the revert check proves tests real, and branch protection is the last word. | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | The purpose stands. Two of its named mechanisms are in question: the receipt (JOB-7, removed on the owner's word on 9 Nov) and the revert check (JOB-12, conflict CHK). |
| 72 | F-SHAPE-4 | Rules are few, each cites a failure, and each names the tool that enforces it or is labelled a nudge. | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | D9 restates "few". Evidence against citation as the brake: every growth was cited (causal_forensics §7), and check-adding stayed at 41% of merges before and after the owner's 5 Nov instruction (change_sample, summary). |
| 73 | F-SHAPE-5 | The process is measured by its false-done rate and its cost per surviving pull request; these are the standing judge of every other line. | MECHANISM (two metrics) for a PURPOSE (an honest judge) | **KEEP PURPOSE, MECHANISM OPEN** | Evidence: 218 of 220 jobs read COMPLETE and 98.8% of landed lines survived while 147 of 157 live walk steps failed (product_side, summary 2 and 3), so both metrics would have read healthy on a product that did not work. D7 makes a failure-free round the test of a tranche. The definition must say what judges, and the owner should see any change to his judge. |
| 74 | F-SHAPE-6 | The process is re-tested one component at a time at each model release. | MECHANISM | **KEEP** | A trial of the process, not of the product (section 5). Leans with D9. |

### Foundations: The properties

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 75 | F-PROP-0 | Each property names what holds it; one held only by text is a nudge and is marked so; the record exposes a violated nudge at the next status. | PURPOSE | **KEEP** | Evidence about nudges as holders: restraint was a nudge read once while checks were code that refused on every call (causal_forensics, headline 3). |
| 76 | F-PROP-2 | Done means merged; main never moves while a tranche runs. | PURPOSE | **KEEP** |  |
| 77 | F-PROP-3 | A job's tests must fail when its change is reverted. | PURPOSE | **CONFLICT FOR THE OWNER** | Conflict CHK: this property is held by the revert check (JOB-12). |
| 78 | F-PROP-8 | Work is never lost or left waiting: no session ends a turn while work it can do remains, and everything is pushed before any turn ends. | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | D9 ("Claude stopping short of work it could do") and D4 ("slots are actively filled") restate the purpose. Evidence against the mechanisms built for it: the idle alarm misfired for 2 h 22 min and the idle check before every command cost 1,564 git processes (change_sample PRs 139, 140). The Foundations hold it as a nudge. |
| 79 | F-PROP-12 | The process is pinned per tranche and changed only by a recorded act. | PURPOSE | **KEEP** | D8: the recorded act is not the owner's merge. The cost of frequent pin moves is at MNT-5. |

### Foundations: The record

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 80 | F-REC-1 | The process and the product are separate; the process lives in its own repository (P2). | PURPOSE | **KEEP** |  |
| 81 | F-REC-2 | The product's build state lives at the paths the product's config names, is written only through the process, and is what tells ARCH what to do. | MECHANISM | **KEEP** |  |
| 82 | F-REC-3 | Sessions are kept short, because cost grows with context times turns; ARCH refreshes at a threshold. | PURPOSE | **KEEP** | How a refresh happens without handoff scanning (D9) is open at SES-2 and SES-3. |
| 83 | F-REC-4 | The handoff is a pointer set on one screen, written by the tool, never by hand. | MECHANISM | **KEEP PURPOSE, MECHANISM OPEN** | D9 lists "handoff scanning" among the interruptions; the definition must say how a successor starts. The line as written was not what ran: 26 hand-written handoff notes became the rulebook (causal_forensics, headline 4 and §3). |
| 84 | F-REC-5 | No branch is deleted or force-pushed; the owner's approvals and rulesets forbid both. | PURPOSE (the owner's prohibition) | **KEEP** | Rulesets are the kind of setting D1 leaves to him. |
| 85 | F-REC-6 | A session acts only on what it has read in full or measured; every claim names its source; anything unread or unmeasured is unknown; a cause is named, and a fix written, only once evidence shows it (P20). | PURPOSE | **KEEP** |  |

### Foundations: Requirements, rules and text

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 86 | F-REQ-1 | The owner decides only the layers and modules that carry product capability; the rest is ARCH's. | PURPOSE | **KEEP** | "Layers" is ended by D5. The product's layer contracts are placement rules, not scheduling (no_layers_width §5); D5 does not say whether they remain as text. |
| 87 | F-REQ-2 | Each module's file states the services it provides, the services it uses by module, its invariants and the product requirements it satisfies; it may suggest but never require an implementation; it is concise because it is read whole (P5). | PURPOSE | **KEEP** | The provided-services part is what an interface change is measured against (D3). |
| 88 | F-REQ-3 | A module fits in one reading: one session can read in full its code, its requirements and those of the services it uses (P6). | PURPOSE | **KEEP** |  |
| 89 | F-REQ-4 | A change needing no judgment across many modules is one mechanical pass by a worker while no job runs, with one full test run in CI; where judgment is needed, the module gets its own job (P7). | MECHANISM | **ENDED BY DECISION** | D3: "Each module is updated and tested by a single job". D6: "The full regression is ended; the internal walk replaces it". The pass never had a procedure (ledger_map: P7 gap). The owner kept this clause on 3 Nov ("Keep the mechanical pass, shorter"), so he should see that D3 and D6 end it. |
| 90 | F-REQ-5 | One rulebook per role, at most ten rules on one screen, rewritten in place and never appended; when the owner raises a problem a rule is rewritten and no ruling is added (TXT-3). | MECHANISM | **KEEP** | D9 restates the purpose. The ten-rule cap held all week (verify_numbers §7). |
| 91 | F-REQ-6 | Each role's starting prompt names its own text in the pinned process, so a role loads only its rules (TXT-5). | MECHANISM | **KEEP** |  |
| 92 | F-REQ-7 | The principles are trimmed so each role loads only the few that govern its stage (TXT-4). | MECHANISM | **KEEP** | On trial at the owner's word ("I'm skeptical, but let's try"); not measured. Section 5. |
| 93 | F-REQ-8 | The product's CLAUDE.md is under thirty lines, written by ARCH line by line, and changes without the owner's approval (his word, 1 Nov). | PURPOSE (the owner's word about his time) | **KEEP** | D8 agrees. The approvals block inside the file is the conflict at GAP-6. Fact: the file ended at 22 lines and 8,664 bytes, all growth from 16 owner patches (product_side §6a). |
| 94 | F-REQ-9 | Every line in any instruction file is failure-backed, non-inferable from the code, or tool-enforced; lines are deleted on review (TXT-2). | MECHANISM | **CANDIDATE TO END ON EVIDENCE** | As TXT-2. |
| 95 | F-REQ-10 | Every text names its audience and speaks plainly (TXT-7). | PURPOSE | **KEEP** |  |
| 96 | F-REQ-11 | Each role's reading set is fixed and printed with sizes (SES-5). | MECHANISM | **KEEP** | A printed measure that blocks nothing (section 5). |
| 97 | F-REQ-12 | Nothing is ever refused for size: budgets are fractions of the model's window in one table, never bytes in code; an overrun is measured and reported, never refused (SES-6). | MECHANISM | **CANDIDATE TO END ON EVIDENCE** | As SES-6: a candidate for the process's own instruction texts only. |
| 98 | F-REQ-13 | A summary is an option ARCH may take, never a requirement (SES-7). | MECHANISM | **KEEP** |  |

### Ledger JOB

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 99 | JOB-1 (kept) | A job is a draft pull request from `job/<module>` to the tranche branch; its body is its START, its report is a comment, its merge is its completion. | MECHANISM | **KEEP** | Fits D3 and D4 (a slot frees when the job "completes and is merged"). |
| 100 | JOB-2 (kept) | A START names only acts the tool supports, each as the command the job runs. | MECHANISM | **KEEP** |  |
| 101 | JOB-3 (kept) | A module's earlier unmerged work is taken in by a tool command on the job's own branch. | MECHANISM (purpose: no work lost, no hand-copied diffs) | **KEEP** | The need is real now: 27 unmerged November job branches (product_side §1, §5). |
| 102 | JOB-4 (kept) | A job is never restarted for a process reason; a blocking flaw holds it at its next command, the fix lands, and the same job continues. | PURPOSE (mechanism: hold, fix, continue) | **KEEP PURPOSE, MECHANISM OPEN** | The purpose stands and D8 agrees that the flaw is fixed. Evidence against the mechanism as it ran: 116 pin moves reaching the product a median 3 to 21 minutes after merging, 1,339 sync merges against 508 landings, and 3.1 job starts per job (product_side §4, §5). |
| 103 | JOB-5 (kept) | A job's completion runs locally only checks that take seconds; the gate is CI. It pushes, posts its report, marks the pull request ready and sets COMPLETE. | MECHANISM | **KEEP** | The receipt part of the report is at JOB-7. The seconds-long local checks are in section 5. |
| 104 | JOB-6 (kept) | An unmerged job whose session is gone is restartable by one command that keeps its branch and pull request. | PURPOSE | **KEEP** |  |
| 105 | JOB-7 (modified) | A job's report carries Met, Evidence as a machine-readable receipt, and what it found elsewhere; a flaw in another module goes to ARCH as a report. | MECHANISM (receipt) and PURPOSE (what a job finds elsewhere reaches ARCH) | **CANDIDATE TO END ON EVIDENCE** | The candidate is the receipt only. Evidence: no catch in 1,187 gate runs, about 20 follow-up merges, and the owner's "get rid of it completely" on 9 Nov (change_sample Case 3; DECISIONS.md PD-21). He decided it for Process3; he must confirm it for Process4. The found-elsewhere half stands (F-JOB-6). |
| 106 | JOB-8 (kept) | A job never commits a generated artifact. | PURPOSE | **KEEP** | No check was built for it (ledger_map Gap). |
| 107 | JOB-9 (kept) | A job ends a turn only COMPLETE or on a named wait with everything pushed. | PURPOSE (held as a nudge) | **KEEP** | D9 ("Claude stopping short of work it could do") restates the purpose; nothing enforces it but the rule and the record. |
| 108 | JOB-10 (kept) | A job's reading set is recorded at its start and its tokens at its end, per attempt, so restarts are never counted as jobs. | MECHANISM (measurement) | **CANDIDATE TO END ON EVIDENCE** | Evidence: a required cost figure "blocked every job complete" and was removed 45 minutes later (change_sample PRs 105, 106); sessions "frequently could not obtain a cost figure" (product_side, "What could not be established"). |
| 109 | JOB-11 (kept) | Each job runs in its own checkout; its cost per attempt is an alarm the sweep reads, not a cap. | MECHANISM | **KEEP PURPOSE, MECHANISM OPEN** | Replaced in the Ledger by GAP-2; disposition as GAP-2. |
| 110 | JOB-12 (kept) | A revert check in CI: with the production change reverted, the job's new tests must fail. | PURPOSE (tests are real; mechanism: a check in CI) | **CONFLICT FOR THE OWNER** | Conflict CHK: a check that is not one of D6's three, unless it counts as part of each job's own module tests. Evidence both ways: it is named in 61 block texts, and on 9 Nov real test repairs were dropped because it could not accept them (product_side §6c, §6d); a commit restoring it cites the owner's keep-or-drop answer of 6 Nov (change_sample PR 185), and the false-done count rests on it. |
| 111 | JOB-13 (modified) | Mutation sampling on critical paths, nightly, after the first tranche, payment and data paths only. | MECHANISM | **ENDED BY DECISION** | D6: "exactly three tests and no others, ever". Never built (ledger_map). |
| 112 | JOB-14 (modified against the suggestion) | One module or one feature per session; after two failed corrections, a fresh session whose brief says what was corrected and why. | PURPOSE (the owner's note) | **KEEP** | The owner's own words. |

### Ledger GAT

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 113 | GAT-1 (kept) | The gate runs in CI, once per pull request tip, and never in a session. | PURPOSE | **KEEP** | The gate is where test (i) runs. Owner's word of 30 Oct. |
| 114 | GAT-2 (kept) | The gate runs the module's own suite, its layer's tests if any, and the checks scoped to the module; it never runs another module's suite. | PURPOSE (the owner's ruling) | **KEEP** | D6(i) restates it. The clause "its layer's tests if any" is ended by D5 and D6. The module-scoped checks other than uses-match-imports are in section 5. Evidence for "never another module's suite": users' suites in the provider's gate cost +7.6 minutes at the median, caught 0 of 20, and were reverted after 2.2 hours (change_sample PR 112). |
| 115 | GAT-3 (kept) | A change to a provided service reaches its users through the architecture session's requirement notice and each user module's own job. | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | The purpose is D3 and D6(ii). Evidence against the mechanism as built: 178 notices became 2,707 notifications, 90% of 2,342 verdicts were "not affected", and 187 notice test files (9,321 lines) were written (product_side §6c, §6d). The purpose earned its place: 241 verdicts were "affected" (product_side §6d, §9.3). |
| 116 | GAT-4 (kept) | The gate regenerates every listed artifact and verifies only those the regeneration changed. | MECHANISM | **CONFLICT FOR THE OWNER** | Conflict CHK: a gate check outside D6's three unless it counts inside test (i). Not built as written (ledger_map Gap); the later form (verify built generated rows, DECISIONS.md PD-9) answered a product defect and held up (change_sample PR 251). |
| 117 | GAT-5 (kept) | The gate installs every lock file the product has, where it sits, and runs the product's Node version. | MECHANISM | **KEEP** | Gate set-up, not a test. Platform fact behind it: the setup hook installed 7 of 10. |
| 118 | GAT-6 (kept) | The gate is triggered only by changes under the module's paths, tests, check inputs and generated inputs; a green tip behind the tranche only by record paths merges as it stands. | PURPOSE (mechanism: a path trigger) | **KEEP PURPOSE, MECHANISM OPEN** | The purpose (no needless gate runs) stands. Evidence that the mechanism did not deliver it: 63% of 789 gate runs were not started by a code change (product_side §4). |
| 119 | GAT-7 (kept) | The full product regression runs only at a release or on the owner's word, as its own workflow with its own time budget. | MECHANISM (a restraint the owner chose) | **ENDED BY DECISION** | D6: "The full regression is ended; the internal walk replaces it". |
| 120 | GAT-8 (kept) | The gate runs again on the merged result before the tool merges, and the tool merges only a green, current tip. | PURPOSE (mechanism: a second gate run) | **CONFLICT FOR THE OWNER** | Conflict CHK: a second run on the merged result is not named among D6's three, and D4 wants a slot freed as soon as a job "completes and is merged". Evidence is mixed: the median wait to merge was 348 minutes on 5 Nov with the merge train and 13 minutes on 4 Nov without it (product_side §7). |

### Ledger INT

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 121 | INT-1 (kept) | Done means merged: a job by its pull request into the tranche branch, a tranche by one pull request into main; main never moves while a tranche runs. | PURPOSE | **KEEP** | D7 fixes when a tranche ends. |
| 122 | INT-2 (kept) | ARCH decides per merge, from listed reasons and cost, whether a fresh reviewer runs; the reviewer never saw the job and reports gaps against requirements with file and line. | PURPOSE (mechanism: ARCH's judgment) | **CONFLICT FOR THE OWNER** | Conflict CHK: a review is not one of D6's three tests, and D9 names reviews among the over-caution. The evidence on review (365 review rounds; 37% of commits were review fixes; change_sample §1) is from the process's own builds, not from product jobs. |
| 123 | INT-3 (kept) | Review findings are diagnosis, never the merge gate; a green gate merges without the owner, who approves a particular merge only when he asks to. | PURPOSE | **KEEP** | Replaced in the Ledger by GAP-10; same disposition. |
| 124 | INT-4 (modified against the suggestion) | A layer closes when every pull request is merged and the layer's checks pass; whole-product checks run before a release or when the owner asks; the next layer starts at once. | PURPOSE | **ENDED BY DECISION** | D5: "The layer construct is dropped". D6: "No regression or deploy-and-walk between layers". Its note was written in by the coordinator as the owner's word of 1 Nov (D10; provenance note). |
| 125 | INT-5 (kept) | Nothing in a merge or close depends on archiving a session; retirement of a job is a record line. | MECHANISM (restraint) | **KEEP** |  |
| 126 | INT-7 (kept) | A review reports everything it finds in one pass, every gap with file and line, so a job never fails review repeatedly; the second run only confirms. | PURPOSE (the owner's own addition, 31 Oct) | **CONFLICT FOR THE OWNER** | Conflict CHK, with INT-2: this line limits review and stands if review stays; if D6 and D9 end review it is moot. |

### Ledger SES

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 127 | SES-1 (modified) | Roles: ROOT as a depth-0 starter; one architecture session per product; jobs; workers. ROOT's creation of sessions moves to a scheduled task that creates a fresh session on each firing where possible. | MECHANISM | **KEEP PURPOSE, MECHANISM OPEN** | D10 renames the architecture session. The note's mechanism rests on a platform behaviour measured failing: a task's fresh session cannot start sessions or send messages, 0 of 3 (2 Nov); open tension 1 settled that ROOT stays a session. Who starts ROOT is the conflict at OT-1. |
| 128 | SES-2 (kept) | The two-phase handover: ROOT creates the new architecture session and repoints the address; nothing in flight is lost; the archive is housekeeping. | MECHANISM (purpose: the architecture session is refreshed without the owner) | **KEEP PURPOSE, MECHANISM OPEN** | D9 lists "handoff scanning"; the definition must say how a refresh happens. The evidence (26 hand-written notes that became the rulebook, causal_forensics §3) concerns hand-written notes, not this tool-run handover. |
| 129 | SES-3 (kept) | A refresh handoff is written by the tool from git, never by hand, at most one screen, a pointer set, not a narrative. | MECHANISM | **KEEP PURPOSE, MECHANISM OPEN** | As F-REC-4: D9, and the line as written was not what ran. |
| 130 | SES-4 (kept) | The refresh threshold is read by status and printed as REFRESH; it is text, not a hook. | MECHANISM | **KEEP** | An alarm that blocks nothing (section 5). |
| 131 | SES-5 (kept) | Each role's reading set is fixed in advance and printed with sizes at its start. | MECHANISM | **KEEP** | A printed measure that blocks nothing (section 5). |
| 132 | SES-6 (kept) | Budgets are fractions of the model's context window, in one table, never bytes fixed in code; an overrun is measured and reported, never refused. | MECHANISM (a restraint; the owner's word of 30 Oct) | **CANDIDATE TO END ON EVIDENCE** | A candidate for the process's own instruction texts only. Evidence: the one hard cap (4,096 bytes on role prompts) held at 4,032 to 4,197 bytes from 4 to 9 Nov, while uncapped texts grew (README 7,955 to 134,219 bytes; tool/lib 1,431 to 23,429 lines) (causal_forensics §1.1 and headline). Evidence the other way for product files: the 70,000-byte requirements cap was overridden 32 of 32 with no catch (product_side §6b). D9 (rules must not overflow) bears on it. |
| 133 | SES-7 (kept) | A summary is an option ARCH may take, never required by the tool. | MECHANISM (restraint) | **KEEP** |  |
| 134 | SES-8 (modified against the suggestion) | Models, effort and permission mode come from one table, picked by the start command: "always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand". | PURPOSE (the owner's policy) | **KEEP** | The owner's own words. Platform fact: every role runs in Auto, because no locked-down session can exist on the account (1 Nov). |
| 135 | SES-9 (kept) | A session's usage is read by an allowed route; where none exists it is named unmeasured, never estimated. | PURPOSE | **KEEP** | A measurement rule that blocks nothing (section 5). |
| 136 | SES-10 (kept) | Workers run in the background, read exactly what their brief names, and return machine-readable receipts. | MECHANISM | **KEEP** |  |
| 137 | SES-11 (kept) | The process measures its own overhead per tranche: commits by purpose, sessions per job, gate runs per merged job, restarts, tokens by role. | PURPOSE | **KEEP** | A measurement that blocks nothing (section 5). The counts git can give showed the waste (3.1 job starts and 3.0 landings per job, product_side §5); tokens by role share JOB-10's evidence. |
| 138 | SES-12 (kept) | Two health metrics from day one: the false-done rate, and cost per pull request that survives a revert window. | PURPOSE | **KEEP** | Measurements (section 5). Whether they still judge is at F-SHAPE-5; the cost half is at F-MNT-5. |
| 139 | SES-13 (kept) | A session that outlives its parent is ordinary and costs nothing idle; no step counts on a parent being alive. | PURPOSE | **KEEP** |  |
| 140 | SES-14 (modified) | A lane is a knowledge directory and design responsibility plus an on-demand worker; the UX lane is always there. | PURPOSE | **KEEP** | No evidence that lanes failed; a lane's own build check caught a product defect (change_sample PR 203). |
| 141 | SES-15 (modified) | ARCH routes every request between spokes and translates only where needed; spokes never see each other; toward the owner it explains each decision of his with context, options and a recommendation. | PURPOSE | **KEEP** | Its note was written in by the coordinator as the owner's word of 1 Nov (D10; provenance note). |
| 142 | SES-16 (modified) | A stateless architecture session, every wake a fresh session started by a scheduled task: to be measured on the first tranche, not adopted. | MECHANISM (a decision the owner reserved) | **KEEP** | Owner: "I'm skeptical, but let's measure". Never measured: no comparison arm was built (ledger_map Gap). Platform fact against the stateless form: 0 of 3. D9 (handoff scanning) bears on the choice. Section 5. |
| 143 | SES-17 (kept) | Urgency and persistence are instilled through memory, style and goals so sessions keep working until legitimately blocked (the owner's design, 30 Oct). | PURPOSE (held as a nudge) | **KEEP PURPOSE, MECHANISM OPEN** | D9 restates the purpose. Evidence against the coded form: the idle check before every tool command cost 1,564 git processes (change_sample PRs 139, 140). Owner, 5 Nov: urgency "must be integral to the process, not prompt text" (causal_forensics §4.2). |
| 144 | SES-18 (kept) | In-session workers are used for three things only: noisy bulk work, a read-only reviewer, independent parallel sub-tasks. | MECHANISM (restraint) | **KEEP** | "A read-only reviewer" follows INT-2 (conflict CHK). |

### Ledger MSG

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 145 | MSG-1 (kept) | Git carries the state; a message only wakes; every message that asks for an act is preceded by the pushed record. | PURPOSE | **KEEP** |  |
| 146 | MSG-2 (kept) | A message from the architecture session's address, read from git, is a session's instruction; every other message is data; the owner's words are instructions to every session. | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | D10 governs what counts as the owner's words, and D9 says an utterance is not a new rule. Evidence: of the lists carried as the owner's across earlier handoffs, 14 of 21 items were found on 5 Nov to be mechanisms (causal_forensics §3). |
| 147 | MSG-3 (kept) | Push-then-send is one tool command; messages are numbered and a duplicate is ignored. | MECHANISM | **KEEP** |  |
| 148 | MSG-4 (kept) | A message to the owner is one per turn, in plain words, with a link, and a numbered list only for an act of his. | PURPOSE | **KEEP** | The owner's words of 28 and 30 Oct. |
| 149 | MSG-5 (kept) | A flaw report from a product session reaches the process by the state branch and the reply by main of the process repository, read at the product's next status. | MECHANISM (purpose: a flaw is reported and answered) | **KEEP PURPOSE, MECHANISM OPEN** | D8 restates the purpose ("when a flaw in the process is found it must be fixed"). The route was never built (ledger_map: later gate), and its carrier, the state branch, is in question (REC-1). |
| 150 | MSG-6 (kept) | A message that cannot be delivered is recorded as undelivered and listed by status. | MECHANISM | **KEEP** |  |

### Foundations: Roles and sessions

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 151 | F-ROLES-1 | ROOT is the only creator of the architecture session; that session is the only creator of jobs and lanes; nothing creates its own successor; depth never exceeds 3. | PURPOSE (with a mechanism) | **KEEP** | D10 renames the architecture session. The platform facts are in section 6. |
| 152 | F-ROLES-2 | The record, git and GitHub, is the only thing any role trusts. | PURPOSE | **KEEP** |  |
| 153 | F-ROLES-3 | Every role runs in Auto, and its starting prompt or START lists every act it may take. | MECHANISM | **KEEP** | Platform fact: no locked-down session can exist on the account (1 Nov). |
| 154 | F-ROLES-4 | A full or silent ROOT is replaced by the watcher, and by the owner only if the watcher declines; the architecture session is replaced by ROOT. The top of the tree is renewed without the owner. | PURPOSE | **CONFLICT FOR THE OWNER** | Conflict TOP: the fallback "by you if the watcher declines" is an owner act that is not a GitHub or Cloudflare setting (D1). |
| 155 | F-ROLES-5 | The two scheduled tasks are created once and never edited; neither is required for correctness; each bounds how long a silent failure goes unnoticed. | PURPOSE | **KEEP** | Platform fact: editing a task is what the classifier refused. Watchdogs (section 5). |
| 156 | F-ROLES-6 | The hourly sweep runs status, wakes the architecture session when acts are listed while it is idle or when a session is stalled or blocked, starts a successor for one at REFRESH or silent for two hours, and writes a heartbeat. | MECHANISM | **KEEP** | A watchdog that blocks nothing (section 5). It is how a session stopped by three refusals is caught without a person (D2). Its cost on record: 1,738 heartbeat, idle-check and session-list commits (product_side §3). |
| 157 | F-ROLES-7 | Two coordinators never both act: the address in git decides, and a replaced ROOT's old task finds another address and ends its turn. | PURPOSE | **KEEP** |  |

### Foundations: A job's life

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 158 | F-JOB-1 | ARCH takes its work from the record without being asked: every module of the open layer with unmet marks and no open job gets a START, as many at once as the live-session limit allows; the owner's word adds or reorders work. | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | The purpose stands. The readiness rule is replaced by D5 ("a module's job is ready when the module has work, has no open job, and every module it uses (directly or indirectly) is settled") and the bound by D4 (8 job slots). The owner's words of 9 Nov already pointed there (DECISIONS.md PD-25). Fact for the definition: under that rule 3 modules are ready at once at the median and 7 at most for the 65 modules with work, so a bound of 8 never binds (no_layers_width §2). |
| 159 | F-JOB-2 | A module has at most one job at a time, and the job applies every plan entry for its module. | PURPOSE | **KEEP** | D3 restates it. |
| 160 | F-JOB-3 | ARCH never idles while work remains and never ends a turn waiting on the owner while anything can be done. | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | As P19. |
| 161 | F-JOB-4 | While a tranche runs ARCH prepares the next round or tranche, so the next opens the moment this one closes. | PURPOSE | **KEEP** | As P18. |
| 162 | F-JOB-5 | ARCH subscribes to the job's pull request so its completion, a red gate or a comment reaches it as an event; no role waits on ROOT or a scheduled task for work the record allows (GAP-5). | PURPOSE (against a measured failure) | **KEEP** | D4 needs it ("As soon as a job completes and is merged, its slot is used by the next job"). Measured 2 Nov: with no event, a completion was noticed after 194 minutes. |
| 163 | F-JOB-6 | A flaw or improvement in another module goes to ARCH as a report in that module's terms; ARCH confirms it and sends it to that module's running job, starts that job, or places it in a later START or the completion round; nothing found waits for the next tranche. | PURPOSE | **KEEP** | The clause "if its layer is open" is replaced by D5's readiness rule. The route earned its place: 183 found marks raised and 132 met (product_side §5, §9.3). |
| 164 | F-JOB-7 | A job that cannot proceed sets the blocked state and ends the turn with everything pushed; a turn ends only COMPLETE or on a named wait. | PURPOSE | **KEEP** |  |
| 165 | F-JOB-8 | A red is fixed by the job; a red the tranche already had is named, not owned. | PURPOSE | **KEEP** | 48 block texts named a suite already red on the tranche before the job started (product_side §6d). |
| 166 | F-JOB-9 | Jobs never merge: the plain merge routes are denied to every session; a refused merge is retried a bounded number of times, never forced. | MECHANISM | **KEEP** |  |
| 167 | F-JOB-10 | A module whose post-merge review finds gaps may be reopened for a second attempt (the owner's 1A). | MECHANISM | **KEEP** | Reopening stands. "Post-merge review" follows INT-2 (conflict CHK). |

### Foundations: The gate and review

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 168 | F-GATE-1 | The tool's test command installs the module's lock files in a job session, so a job's suite never depends on the session's setup hook. | PURPOSE (against a measurement) | **KEEP** | Measured 2 Nov: the hook installed 7 of 10. |
| 169 | F-GATE-2 | Every requirement is tested at the module's interface and proven met; none goes untested (P7). | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | As P7. |
| 170 | F-GATE-3 | Module and layer coverage should be more complete than the earlier processes produced; fuller fixtures run by tier: per pull request, at layer close, nightly or at release. | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | Coverage of a module's own tests stands inside test (i). The tiers at layer close, nightly and at release are ruled out by D5 and D6 ("exactly three tests and no others, ever"; "No regression or deploy-and-walk between layers"). |
| 171 | F-GATE-4 | The gate runs as two jobs: product code with no token, so no test can read one; a failed fetch fails the check (the owner's 3A). | MECHANISM (purpose: no test can read a token) | **CANDIDATE TO END ON EVIDENCE** | Evidence: added on a reviewer's hypothetical; the failure it guards was observed "never" (change_sample PR 13). The evidence is weak: the split was kept and cost little. What token product code in the gate can read needs a statement either way. |

### Foundations: Platform, permissions and messages

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 172 | F-PLAT-1 | The process depends only on acts the committed approvals cover and that were measured to pass; archiving sessions and switching off or deleting tasks are housekeeping, counted and reported, never needed for correctness. | PURPOSE | **KEEP** | PLT-2 as restated. D9 leans the same way. |
| 173 | F-PLAT-2 | The process stands only on platform behaviour that has been measured. | PURPOSE | **KEEP** | Section 6 lists the measured behaviours. |
| 174 | F-PLAT-3 | The process keeps at most 24 live sessions by default and ARCH fills that room with jobs for the ready work; ARCH may raise or lower the number from what it measures, and records each change. | PURPOSE (the owner's word, 1 Nov) | **CONFLICT FOR THE OWNER** | Conflict BOUND. D4 ends two clauses ("bounded by a user-changeable number. The default is 8 job slots"): the default of 24 and ARCH's power to change it. Left open between D4 and D1: the owner changes a number, and D1 limits his acts to GitHub or Cloudflare settings "related to permissions or rules"; a number is neither. The platform ceiling (about 50 live sessions) stays a fact, and it counts sessions, not job slots. |
| 175 | F-PLAT-4 | The live count stays within the bound, and every new session is checked to have started. | PURPOSE (against a measurement) | **KEEP** | The "24" follows F-PLAT-3. Platform fact: at about 50 live sessions the create call still reports success (1 Nov). A verification that blocks nothing (section 5). |
| 176 | F-PLAT-5 | Hard rules live in deny lists in the repository's settings file. | MECHANISM | **KEEP** | Measured 1 Nov: a denied tool is removed from the session outright. The settings file is a shim regenerated on GitHub's runner (SHM-1, SHM-2), not an owner edit. |
| 177 | F-PLAT-6 | A session stopped by three refusals in a row is caught by status and the sweep; the tool counts each session's refusals and status prints REFRESH at 10. | PURPOSE (against a measurement) | **KEEP** | This is how D2 holds against the measured pause (section 6). A count and an alarm (section 5). |
| 178 | F-PLAT-7 | A session stopped by refusals is replaced by its parent (a job from its branch and pull request, the architecture session by handover, ROOT by the watcher); the refused acts are recorded and raised to the owner, and the replacement's START does not name them. | PURPOSE | **KEEP** | Replacement without a person serves D2. "Raised to the owner" meets D1 at the conflict at GAP-6: his remedy for a refusal has been an approvals edit. |
| 179 | F-PLAT-8 | The owner's standing approvals are the one policy at every depth, in his own words, committed by him to each repository's CLAUDE.md; no session writes, edits or relays them; a check fails any change not made by him; the start check confirms each session loaded the tip's. | PURPOSE (with mechanisms) | **CONFLICT FOR THE OWNER** | Conflict APPR (as GAP-6). |
| 180 | F-PLAT-9 | Every refusal of an approved act is recorded with the act, depth and channel and counted per tranche; the approvals are tried at each tranche's open and re-tested at each model release. | MECHANISM (measurement) | **KEEP** | The refusal count is the measure of D9's first interruption. The tranche-open trial found 0 refusals in about 450 acts (Foundations, "To measure"), and GAP-11 says measure once by default. Section 5. |
| 181 | F-PLAT-10 | An act the judge refused is never reworded or rerouted to another session; it is recorded and raised. A model's own decline for a missing instruction gets one new session whose START names the act, then comes to the owner. | PURPOSE | **CONFLICT FOR THE OWNER** | Conflict APPR: the line sends a refused act to the owner, D9 says refusals must not interrupt, and D1 leaves him no act but a GitHub or Cloudflare setting. |
| 182 | F-PLAT-11 | Outward acts (sessions, tasks, merges) belong to ARCH and ROOT; STARTs name every act a job needs. | MECHANISM | **KEEP** | Measured 1 Nov: jobs declined unforeseen outward acts. |
| 183 | F-PLAT-12 | Every START carries the session's authority, and who its coordinator is, through the address file in git. | PURPOSE | **KEEP** |  |
| 184 | F-PLAT-13 | The gate runs on every pull request, and records reach a protected branch only through a pull request. | PURPOSE | **KEEP** | The gate is where test (i) runs. |
| 185 | F-PLAT-14 | The sweep catches lack of progress, not only silence: status reads each attempt's elapsed time and cost against its role's median, as an alarm, not a cap; review rounds are bounded by INT-7 and repeats by JOB-14. | PURPOSE (against a measured failure) | **KEEP PURPOSE, MECHANISM OPEN** | The purpose stands (measured failure: four review rounds, two hours and $26 on 2 Nov). Evidence against the cost reading: sessions frequently could not obtain a cost figure (product_side, limits; change_sample PRs 105, 106). The review-round limit was overridden all 17 times it applied (change_sample PR 29, process builds). An alarm (section 5). |
| 186 | F-PLAT-15 | One act per command: a judged act is never chained with another command; a nudge in every START and in the tool's guidance. | MECHANISM (against a measurement) | **KEEP** | Measured 2 Nov: the only judge refusal in rounds 2 to 4 fell on a chained merge. |
| 187 | F-PLAT-16 | At most a handful of command hooks; no model judge between a session and the owner; nothing holds a turn; no /goal. | PURPOSE | **KEEP** | Restates ENF-1, ENF-2, ENF-3 and ENF-6. |

### Ledger TXT

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 188 | TXT-1 (modified against the suggestion) | The product's CLAUDE.md is under thirty lines, hand-written, naming the pinned process commit and the command that fetches it; ARCH writes and keeps it line by line with no approval needed and each change listed in the tranche report; the approvals block stays the owner's own. | MECHANISM (thirty lines; who writes) and PURPOSE (changes do not need him) | **KEEP** | D8 agrees on "no approval needed". The approvals-block clause is the conflict at GAP-6. Its note was written in by the coordinator as the owner's word of 1 Nov (D10; provenance note). Fact: the file ended at 22 lines and 8,664 bytes, all growth from 16 owner patches (product_side §6a). |
| 189 | TXT-2 (kept) | Every line in an instruction file is failure-backed, non-inferable from the code, or tool-enforceable; failing lines are deleted ("The per-line test replaces a byte cap"). | MECHANISM | **CANDIDATE TO END ON EVIDENCE** | Evidence: the test was held only as a nudge (ledger_map), while the one byte cap that existed (role prompts, 4,096) held at 4,032 to 4,197 bytes for five days and the uncapped README grew from 7,955 to 134,219 bytes (causal_forensics §1.1). |
| 190 | TXT-3 (kept) | One rulebook per area, at most ten rules on one screen, rewritten in place, never appended; when the owner raises a problem, a rule is rewritten and no ruling is added. | MECHANISM | **KEEP** | D9 restates the purpose. The ten-rule cap held all week; growth went to the uncapped texts (verify_numbers §7). |
| 191 | TXT-4 (modified) | Apply the per-line test to the principles, so most roles load two or three; tried and measured. | MECHANISM (on trial) | **KEEP** | Owner: "I'm skeptical, but let's try". Not measured. Section 5. |
| 192 | TXT-5 (kept) | Each role's starting prompt names its own rulebook in the pinned process; product rules load by path. | MECHANISM | **KEEP** | Restated by the architecture session on 4 Nov with its purpose unchanged (ledger_map). |
| 193 | TXT-6 (kept) | Every rule cites the measured failure or the owner's decision that justified it; a rule with neither is removed. | MECHANISM (purpose: rules do not accrete) | **CANDIDATE TO END ON EVIDENCE** | Evidence: the citation audit was never built and every growth was cited ("Tool 4,543+ lines; every rise cited", causal_forensics §7); check-adding stayed at 41% of merges before and after the owner's 5 Nov instruction (change_sample, summary); a check he had removed was restored by a session citing Ledger lines (change_sample PR 185). The purpose is GAP-3, kept. |
| 194 | TXT-7 (kept) | Every text names its audience and speaks plainly. | PURPOSE | **KEEP** |  |

### Ledger MNT

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 195 | MNT-1 (modified) | The process is a product under itself, as the thin process: its own ledger, requirements, jobs on branches with tests and review, and tranches; the version in use is frozen while a tranche runs. | MECHANISM (purpose: no unreviewed reactive fixes; frozen in use) | **KEEP PURPOSE, MECHANISM OPEN** | D8 governs who fixes the process and removes the owner as gate; D6 and D9 bear on "tests and review". Never built (ledger_map: Phase 4): the roles that changed the process had no role, START or rulebook in the tool (causal_forensics §1.4), and 296 merges went into the process in nine days (change_sample §1). |
| 196 | MNT-3 (kept) | A tranche of the process is built with the last released version of the process. | MECHANISM | **KEEP** | Never built (ledger_map: Phase 4); no evidence either way. |
| 197 | MNT-4 (kept) | A tranche runs on one pinned process version, named in the plan; every session verifies the pin once at start and says so. | MECHANISM (purpose: the process does not change under a run) | **KEEP** | The start verification is a check (section 5); its approvals part is at F-MNT-1. |
| 198 | MNT-5 (kept) | A fix for a blocking flaw is adopted by a running tranche once, as an explicit recorded act that moves the pin; no job restarts. | PURPOSE (mechanism: the pin move) | **KEEP PURPOSE, MECHANISM OPEN** | D8 restates the purpose (the flaw is fixed, and not through the owner's merge). Evidence against the mechanism as it ran: 116 pin moves in nine days, adopted a median 3 to 21 minutes after merging, about 35 minutes of product cost each (product_side §4; change_sample removal 287). Owner, 9 Nov: "Pin moves should be lightweight fixes that improve velocity, not ruin it" (change_sample removal 298). |
| 199 | MNT-6 (kept) | A fix for a non-blocking flaw waits for the next process release and the product's next tranche. | PURPOSE | **KEEP** | D8 says a flaw must be fixed, not when; D9 leans with this line. It was not held in Process3 (116 pin moves). |
| 200 | MNT-7 (kept) | A flaw report is filed from any session by one command, listed at each status, answered by main; never fixed in place. | MECHANISM (purpose: flaws are reported and answered, not patched where found) | **KEEP** | D8 restates the purpose. Never built (ledger_map: later gate); its route is at MSG-5. |
| 201 | MNT-8 (modified) | Certification is a long-term goal that indicates readiness for general use (the owner's words): a shadow of one representative slice, then the live first tranche as the certification, with the overhead and health metrics measured. | PURPOSE (mechanism: a slice, then the live tranche) | **KEEP** | A trial of the process, not a test of the product (section 5). |
| 202 | MNT-9 (kept) | Flaws found in the shadow are fixed before release and the run repeats from the step that found them. | MECHANISM | **KEEP** | Never built as a gate (ledger_map Gap). The Ledger's own caution: "Can loop if flaws keep appearing; needs a stop rule". Section 5. |
| 203 | MNT-10 (kept) | Each release names the platform rows and product sizes it was certified against, so a larger product is told at onboarding. | PURPOSE | **KEEP** | Never built; no evidence against it. |
| 204 | MNT-11 (kept) | On each model release, remove one component at a time and see what breaks. | MECHANISM (purpose: the process shrinks) | **KEEP** | Leans with D9. A trial of the process (section 5). |

### Ledger SHM

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 205 | SHM-1 (kept) | A product receives the short CLAUDE.md, one skill, a settings file with the permission list, the gate workflow and the prune workflow; nothing else, and a check fails on drift. | MECHANISM | **KEEP PURPOSE, MECHANISM OPEN** | The purpose of the list (a short fixed set, nothing else) stands. Evidence against the drift check and against "nothing else" holding: a predecessor "refused every change that was not a shim byte for byte" (change_sample PR 192); the setup check read a retired hook as drift (change_sample removal 295); the product's process files grew anyway (gate workflow 77 to 273 lines, config 24 to 421; product_side §6a). The prune workflow follows REC-10. |
| 206 | SHM-2 (kept) | Shims are regenerated on GitHub's runner with the owner's token and merged by pull request; no session attaches a second repository. | MECHANISM | **KEEP** | D8: the owner is not the merge gate for these. |
| 207 | SHM-3 (kept) | Onboarding writes the build state's skeleton, the grant list and the first plan, and measures the product against the certified sizes. | MECHANISM (purpose: a product can be brought in, with the owner's part bounded) | **KEEP** | Under D1 the owner's part is settings only (see the conflict at F-SET-4). The size measurement is in section 5. |
| 208 | SHM-4 (kept) | A product mid-tranche at conversion carries it by one command ("Needed for Civicsmith now"). | MECHANISM | **KEEP** | Needed again: layer 14 landed but unmerged, and 27 unmerged job branches (product_side, summary 5 and §1). The command is a session's, not the owner's (D1). |
| 209 | SHM-5 (kept) | A product's session setup is the product's own script, run by the session's first command, not by a hook. | MECHANISM | **KEEP** | Not run in Process3 (ledger_map Gap). |

### Ledger principles

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 210 | P1 (modified) | The process exists to put correct, working product behaviour that meets every defined requirement onto main; the owner's addition: quickly and cheaply, behaviour that survives, his time only where it is his. | PURPOSE | **KEEP** |  |
| 211 | P2 (modified) | Process and product are separate; the build state at the product's own paths tells ARCH what to do. | PURPOSE | **KEEP** |  |
| 212 | P3 (modified) | Development under the process is development of the product, not of the process; a serious enough flaw pauses the product, the process is fixed separately, and the product resumes on the fixed version (the owner's words). | PURPOSE | **KEEP** | D8 says who fixes it, and that the pause does not wait on his merge. |
| 213 | P4 (kept) | One total order; each module in one layer; a module uses only earlier modules; declared use is checked against imports; the owner decides only the layers and modules that carry product capability. | PURPOSE | **KEEP** | D3 and D6(i) restate it. The layer clauses are ended by D5. Facts as at ARC-1. |
| 214 | P5 (kept) | Module requirements in four parts; they may suggest, never require, an implementation; concise because read whole; ARCH carries a change to every user of a service. | PURPOSE | **KEEP** | The last clause is D3 and D6(ii); its mechanism is open at GAT-3. |
| 215 | P6 (kept) | A module fits in one reading. | PURPOSE | **KEEP** |  |
| 216 | P7 (modified) | Only module jobs change module code; every requirement is tested at the interface and proven met, none untested (owner: "Keep no requirement goes untested, which was lost"); a mechanical pass for no-judgment changes. | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | The purpose stands inside test (i). Evidence against the mechanism tried: a named test per struck mark was loosened at 22 hours and removed with the receipt on 9 Nov (change_sample PR 40). The mechanical-pass clause is ended by D3 and D6 (see F-REQ-4). |
| 217 | P8 (kept) | At most one job per module at a time; the job applies every plan entry for its module and deals with what it finds there. | PURPOSE | **KEEP** | D3 restates it. |
| 218 | P9 (kept) | A flaw in another module goes to ARCH as a report in that module's terms; ARCH confirms it, sends it to that module's running job, starts that job, or places it in a later START or round. | PURPOSE | **KEEP** | "Starts that job" now follows D5's readiness rule. |
| 219 | P10 (modified) | One layer at a time, lowest first, all the module jobs of a layer run concurrently; nothing found waits for the next tranche; the next layer starts when the layer is complete. | PURPOSE | **ENDED BY DECISION** | D5: "The layer construct is dropped. Strict order". D3: "jobs of earlier modules run before those later in the order". The clause "nothing found waits for the next tranche" survives at PLN-3 and F-JOB-6. Concurrency itself is kept by D4. The owner's words of 9 Nov pointed the same way (DECISIONS.md PD-25). Fact: 182 of 220 modules depend on a module in their own layer (audit D). |
| 220 | P11 (kept) | Module tests per module, small layer tests at layer completion, and the full regression only at release or on the owner's word. | MECHANISM (the owner chose it) | **ENDED BY DECISION** | D6: "exactly three tests and no others, ever" and "The full regression is ended; the internal walk replaces it". D5 for the layer tests. Module tests per module survive as test (i). Evidence: 218 jobs complete with green suites beside 147 of 157 live steps failing (product_side, summary 2 and 3). |
| 221 | P12 (kept) | Done means merged; main never changes while a tranche runs; the close merges main into the tranche and re-runs the checks. | PURPOSE | **KEEP** | D7 fixes when a tranche ends. "Re-runs the checks" at the close is not one of D6's three (section 5). |
| 222 | P13 (modified) | Sessions are kept short; state lives in the build state; ARCH refreshes at a threshold. | PURPOSE | **KEEP** | How a refresh happens is open at SES-2 and SES-3 (D9). |
| 223 | P17 (modified) | The owner defines the project; ARCH does everything else, decides every technical matter and reports it in plain words as done; his time is the scarcest resource; he does not edit files or enter commands. Owner: "Keep it whole after onboarding". | PURPOSE | **KEEP** | D1 and D8 restate it. |
| 224 | P18 (kept) | While a tranche runs, ARCH prepares what the next round or tranche needs so it opens the moment this one closes. | PURPOSE | **KEEP** | The record supports the purpose: gaps of 11.4, 8.7, 7.6 and 6.3 hours between code-carrying landings on 7 and 8 Nov (product_side §7). The map warns against one mechanism, a listed set of preparation acts with Stop guards. |
| 225 | P19 (modified) | ARCH never idles while work remains; the work never stops for the owner, and no session ends a turn waiting on him while anything can be done. Owner: the mechanism is the tool naming the next act and the sweep's wake, never anything that holds a turn, "and it must be shown efficient and effective". | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | D2, D4 ("slots are actively filled") and D9 restate the purpose. Evidence against the mechanisms built: the idle alarm misfired for 2 h 22 min and the idle check before every command cost 1,564 git processes (change_sample PRs 139, 140). Owner, 5 Nov: urgency "must be integral to the process, not prompt text" (causal_forensics §4.2). |
| 226 | P20 (modified) | A session acts only on what it has read in full or measured; every claim names its source; a cause is named only once evidence shows it. | PURPOSE | **KEEP** | Its audit is REC-8, a candidate. |
| 227 | P21 (modified) | A question that is the owner's (by P17 only) becomes his decision and a design before anything is built; a lane has one area of focus and delivers designs, reached through ARCH; lanes stay as SES-14 settled them. | PURPOSE | **KEEP** | Under D2 only the work that depends on the answer waits. |
| 228 | P22 (kept) | A release is cut from the open tranche, proven by the full regression, deployed and walked; what a walk finds becomes a round's entries; what it produces is kept only until analysed. | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | D6 ends "proven by the full regression" ("The full regression is ended; the internal walk replaces it"). D7 places the deploy-and-external-walk after a failure-free round, as optional. |
| 229 | P23 (kept) | The repository holds only what a session must read or a merge must carry. | PURPOSE | **KEEP** | Its check is REC-10, a candidate. |

### Ledger GAP

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 230 | GAP-1 (modified against the suggestion) | A tranche can run from open to close with no one watching: every stop is a named blocker in the record, ARCH starts other work meanwhile, and only a blocker that only the owner can clear reaches him (the owner's own words). | PURPOSE | **KEEP** | D2 restates "can run" as "runs". |
| 231 | GAP-2 (kept) | Each job in its own checkout; its cost per attempt is an alarm the sweep reads, not a cap. | MECHANISM (purpose: lack of progress is caught) | **KEEP PURPOSE, MECHANISM OPEN** | The own checkout stands. Evidence against the cost alarm, as JOB-10: cost figures were frequently unobtainable (product_side, limits; change_sample PRs 105, 106). An alarm (section 5). |
| 232 | GAP-3 (kept) | A rule, check, review round, measurement run or owed task exists only against a measured failure or the owner's word; a finding with neither is one line in a report and changes nothing. | PURPOSE (mechanism: citation) | **KEEP PURPOSE, MECHANISM OPEN** | As F-HUM-13. |
| 233 | GAP-4 (kept) | Status names each role's next acts from git alone, so a fresh architecture session given only status takes the right next act. | MECHANISM (for a purpose) | **KEEP** | Leans with D9 (no handoff scanning). |
| 234 | GAP-5 (kept) | No role waits on ROOT or a scheduled task for work the record allows: a job's report or a merge wakes ARCH at once, and a scheduled wake only catches a session that stopped. | PURPOSE | **KEEP** | D4 needs it. Measured 2 Nov: 194 minutes late with no event. |
| 235 | GAP-6 (kept) | The owner's standing approvals in each repository's CLAUDE.md are the one policy for every act at every depth; the start check confirms each session loaded the tip's; the deny list holds only hard prohibitions. | PURPOSE (one policy, in his hand); MECHANISM (the start check) | **CONFLICT FOR THE OWNER** | Conflict APPR: the approvals reach sessions only as a file the owner commits by his own hand, which D1 excludes ("does not enter commands or edit source files"); the platform facts that force that channel are measured (quoted consent declined 11 of 11; the judge refuses a session writing them). D9 lists permission refusals first. Evidence on the start check is at F-MNT-1. |
| 236 | GAP-7 (kept) | A public release or promotion to installed sites waits for the owner's approval through the protected GitHub environment; development releases are drafts and need none. | PURPOSE | **CONFLICT FOR THE OWNER** | Conflict REL: approving a release is an owner act that is not a settings change (D1) and a wait on him (D2). D7 speaks only of the optional deploy-and-external-walk. |
| 237 | GAP-8 (kept) | On one plain request the process stops development under one Claude account and writes a tested page of steps to restart under another. | PURPOSE | **CONFLICT FOR THE OWNER** | Conflict TOP: the page's steps are the owner's and are on the Claude side (the cloud environment, Claude's GitHub connection), not GitHub or Cloudflare settings (D1). The need was real: the merging identity changed on 7 Nov with a 9.3-hour silence (product_side §7, §9). The evidence is against the size of the mechanism only (causal_forensics §4.2). |
| 238 | GAP-9 (kept) | The Ledger, the Foundations and the Build Plan agree: each section and row cites the Ledger lines it serves, and no build starts on a line any of them contradicts. | PURPOSE (mechanism: citations) | **KEEP PURPOSE, MECHANISM OPEN** | The purpose stands; D11 and this table serve it. Evidence against citation as the mechanism: a session restored a check the owner had removed, citing Ledger lines (change_sample PR 185). D1 to D11 now override conflicting lines, so "contradicts" has to be read against them. |
| 239 | GAP-10 (kept) | Review findings go to the job as diagnosis; review is never the merge gate; a green gate merges without the owner, who approves a particular merge only when he asks to. | PURPOSE | **KEEP** | Fits D2. Whether review itself remains is the conflict at INT-2. |
| 240 | GAP-11 (kept) | A platform behaviour is measured once by default, more only when the first result is ambiguous or a failure recurs. | PURPOSE (bounds measurement) | **KEEP** | Leans with D9. Section 5. |
| 241 | GAP-12 (kept) | The tranche report states ARCH's idle time while work was ready and the minutes of the owner's it took. | MECHANISM (purpose: urgency and his time are measurable) | **KEEP** | The only stated measures of D1 and D2. A measurement (section 5). |

### Foundations: How this was decided

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 242 | F-HOW-1 | Nothing here is in force until it has run on a real tranche with the two health metrics measured. | PURPOSE | **KEEP** | Whether the two metrics still judge is at F-SHAPE-5. Section 5. |
| 243 | F-HOW-2 | A build plan is derived from the document and reviewed, assessed and evolved; implementation starts only when the result will work for projects large and small, for Civicsmith and the products after it. | PURPOSE | **KEEP** |  |

### Foundations: Setup

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 244 | F-SET-1 | Every account, setting and branch rule is listed, checked before each job starts, and set by the developer through the fewest steps, each with its reason and tested to work the first time. | PURPOSE (the owner's word, 2 Nov) | **KEEP PURPOSE, MECHANISM OPEN** | The purpose stands and fits D1. Evidence against "checked before each job starts" is at F-SET-3; the owner cut it to once per pin on 9 Nov (DECISIONS.md PD-21). |
| 245 | F-SET-2 | The setup list names each condition: what it is, why, its value and who sets it; it is reviewed like code. | MECHANISM | **KEEP** | "Reviewed like code" follows INT-2 (section 5). |
| 246 | F-SET-3 | The setup check reads every condition at onboarding and before every job start; a missing one stops the start; it only reads. | MECHANISM (purpose: no job meets a missing setting as a refusal) | **CANDIDATE TO END ON EVIDENCE** | Evidence: it refused every job start on the copy after the owner applied new settings; read a Cloudflare 429 as "missing" and stopped a pin move; grew to about 15 minutes, twice per pin move; lived 7.0 days and was cut to once per pin on the owner's word on 9 Nov (change_sample PR 15; removal 296). |
| 247 | F-SET-4 | One document, the developer's steps, lists only the acts the developer must take, each with why; each product gets one onboarding page; ARCH does every other part of onboarding. | PURPOSE | **CONFLICT FOR THE OWNER** | Conflict TOP: the listed acts include the cloud environment, which is set on the Claude side and is not a GitHub or Cloudflare setting (D1). The secrets, Actions settings and collaborators it lists are GitHub settings. |
| 248 | F-SET-5 | Sessions act on GitHub as a collaborator that can push and merge but cannot change settings; the owner acts as the owner. | MECHANISM | **KEEP** | Fits D1: settings are his. |
| 249 | F-SET-6 | GitHub holds: every branch refuses deletion and force-push; main and the tranche take changes only by pull request, merge commits only, with the gate and record required. The deny list holds the rest, including the plain merge routes. | MECHANISM | **KEEP** | These are the rule settings D1 leaves to the owner. The required "record" check follows REC-10 (section 5). |
| 250 | F-SET-7 | A session reads the deny list only when it holds one repository and starts from a branch that carries it; every session starts from the tranche. | MECHANISM | **KEEP** | A platform fact (section 6). |
| 251 | F-SET-8a | The process deploys so walkers can run, so a project runs unattended only if it can deploy. | PURPOSE (the owner's word, 2 Nov) | **KEEP PURPOSE, MECHANISM OPEN** | Changed by D6 (the round's walk is internal) and D7 (the deploy-and-external-walk is optional and follows a tranche): unattended running no longer rests on deploying. The definition must say what deploying is needed for. |
| 252 | F-SET-8b | Deploy tokens are added to the cloud environment as environment variables; the setup check confirms each by name. | MECHANISM | **CANDIDATE TO END ON EVIDENCE** | Evidence: the token check read a Cloudflare 429 as "missing" and stopped a pin move (change_sample removal 235). Audit C also cites a Cloudflare token and signing seeds sitting beside product code in the session environment (redteam_feasibility, finding 11; not re-read here). D1: the cloud environment is a Claude-side setting. Platform fact the other way: environment variables were the one route both the deploy tools and the setup check were measured to read (2 Nov). |
| 253 | F-SET-8c | Deploying, releasing and acting on a live site are ARCH's acts, not a job's. | PURPOSE | **KEEP** |  |
| 254 | F-SET-9 | The checks hold against mistakes and outsiders' fork pull requests; a deliberate attack is held by GitHub's walls and the owner's approval for production; a finding that needs a deliberate attack is a known limit, not code. | PURPOSE | **KEEP** | D9 leans the same way. Five of seven kept trust rules guarded something never observed (change_sample §5). |

### Foundations: Maintenance, certification, metrics

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 255 | F-MNT-1 | Every session starts at the tranche's tip by commit and first verifies the pin, HEAD and the approvals block; on a mismatch it acts on nothing; a change to approvals is taken up by replacing long-lived sessions. | MECHANISM | **CANDIDATE TO END ON EVIDENCE** | The candidate is the fail-closed approvals part. Evidence, with its limit: the owner's own commit was read as a forbidden settings change 15 times (change_sample §5, PR 234); his last approvals edit merged at 16:45Z on 9 Nov and no product landing followed, but "Git cannot show why that edit stopped the sessions" (product_side §8). Starting by commit rests on a platform fact (section 6). |
| 256 | F-MNT-2 | Re-test at each model release and each Claude Code version change; the approval test reruns too. | MECHANISM | **KEEP** | Reported refusal rates moved several-fold between versions (Foundations). A trial of the process (section 5). |
| 257 | F-MNT-3 | Per tranche: commits by purpose, sessions per job, gate runs per merged job, restarts, tokens by role; the tranche report states elapsed time, work done, deferrals, cost, the overhead share, ARCH's idle time and the owner's minutes. | MECHANISM (purpose: the process is honest about its cost) | **KEEP** | As SES-11, PLN-6 and GAP-12. Measurements (section 5). |
| 258 | F-MNT-4 | False-done rate: the share of COMPLETE claims refuted by the gate's re-run and revert check, from the first tranche. | PURPOSE | **KEEP** | It earned its place: 20 false "complete" claims refuted by the suite in one day (change_sample §5). It counts on the gate's re-run and the revert check, both in conflict CHK. A measurement (section 5). |
| 259 | F-MNT-5 | Cost per surviving pull request: tokens or dollars per pull request still in place after a two-week revert window. | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | Survival is readable from git (98.8%, product_side §5). Evidence against the cost half: sessions "frequently could not obtain a cost figure" (product_side, limits; change_sample PRs 105, 106). The definition must say how cost is held or named unmeasured (SES-9). |
| 260 | F-MNT-6 | Usage is read by an allowed route or named unmeasured. | MECHANISM | **KEEP** |  |
| 261 | F-MNT-7 | The process is judged by two numbers; they are the standing judge of every other line. | PURPOSE | **KEEP PURPOSE, MECHANISM OPEN** | As F-SHAPE-5. |
| 262 | F-STOP-1 | The process owns what can be proven in git and CI and nothing on a live site; rollout and operations are the owner's, through the protected environment. | PURPOSE | **KEEP** | His approval there is the conflict at GAP-7. |
| 263 | F-STOP-2 | Release packaging is the Release workflow (installer artifact, update manifest, signing, draft releases); a development release stops as a draft; install-from-scratch and upgrade tests run as release-tier fixtures first. | MECHANISM (purpose: a release can be cut without him until publication) | **KEEP PURPOSE, MECHANISM OPEN** | Packaging stands. The release-tier install and upgrade tests are tests outside D6's three ("no others, ever"); the definition must say what becomes of them (section 5). The owner's 8 and 9 Nov decisions on these workflows are DECISIONS.md BD-R1, BD-R3 and BD-R5. |
| 264 | F-STOP-3 | Coming back: the walk's findings after a deployment enter the next round as entries. | PURPOSE | **KEEP** | Fits D6(iii) and D7. |
| 265 | F-REL-1 | A development release is cut and deployed by the process in each round, without the owner, to the product's own site, reaching no one else, on his standing approval. | PURPOSE (mechanism: cadence and place) | **KEEP PURPOSE, MECHANISM OPEN** | "Without the owner" stands. The cadence is replaced by D7 ("A round that completes without any failures ends a tranche, after which an optional multi-session deploy-and-external-walk runs") and D6 (the round's walk is internal). His words of 8 Nov already said so (DECISIONS.md PD-16). Evidence: all 12 development deployments failed and none ran for 80 hours (product_side, summary 3). |
| 266 | F-REL-2 | A public release is a development release the walkers have passed, published only with the owner's approval; the production environment holds the publishing job and the keys, never the sessions' cloud environment. | PURPOSE | **CONFLICT FOR THE OWNER** | Conflict REL (as GAP-7). |

### Foundations: Dropped, and why

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 267 | F-DROP-1 | Dropped: the hook refusing partial reads (ENF-4). | MECHANISM (dropped; must not return) | **KEEP** | Platform fact: hooks vanished after a resume. Its named replacement, the citation audit, is REC-8, a candidate. |
| 268 | F-DROP-2 | Dropped: the Stop hook enforcing the refresh threshold (ENF-5). | MECHANISM (dropped; must not return) | **KEEP** |  |
| 269 | F-DROP-3 | Dropped: the mandated test-first red step (INT-6). | MECHANISM (dropped; must not return) | **KEEP** | Its named replacement includes the revert check (JOB-12, conflict CHK). |
| 270 | F-DROP-4 | Dropped: the twelve-module process architecture (MNT-2). | MECHANISM (dropped; must not return) | **KEEP** |  |
| 271 | F-DROP-5 | Dropped: in force the day written, certified on a toy (MNT-12). | MECHANISM (dropped; must not return) | **KEEP** |  |
| 272 | F-DROP-6 | Dropped: the repository doorbell and mailboxes (MSG-7). | MECHANISM (dropped; must not return) | **KEEP** |  |
| 273 | F-DROP-7 | Dropped: the git-synced multi-writer tracker (REC-12). | MECHANISM (dropped; must not return) | **KEEP** | Its named replacement, the JSON ledger, is REC-9, a candidate. |
| 274 | F-DROP-8 | Dropped: every rule names the principle it serves (P16). | MECHANISM (dropped; must not return) | **KEEP** | Its named replacement, citation of a failure, is TXT-6, a candidate. |

### Foundations: To measure

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 275 | TM-1 | Decide stateless against long-lived architecture session by tokens per wake (SES-16). | MECHANISM (a measurement to decide by) | **KEEP** | Never measured; as SES-16. Section 5. |
| 276 | TM-2 | Decide the JSON ledger on whether sessions corrupt or bypass it (REC-9). | MECHANISM (a measurement to decide by) | **CANDIDATE TO END ON EVIDENCE** | As REC-9; the measure set here appears in no post-mortem file. |
| 277 | TM-4 | Measure the architecture session's routing share of its context (SES-15). | MECHANISM (a measurement to decide by) | **KEEP** | Not measured. Section 5. |
| 278 | TM-5 | Decide which lanes run as long-lived sessions and which as workers (SES-14). | MECHANISM (a measurement to decide by) | **KEEP** | Not measured. Section 5. |
| 279 | TM-6 | Set the requirements cap number from reading-set sizes and job outcomes by module size (REQ-6). | MECHANISM (a measurement to decide by) | **CANDIDATE TO END ON EVIDENCE** | As REQ-6. |
| 280 | TM-7 | Decide the home for transient state on repository growth, writer conflicts and status latency (REC-1). | MECHANISM (a measurement to decide by) | **KEEP PURPOSE, MECHANISM OPEN** | As REC-1: the number is in (12,881 state-branch commits, 70% of all). |
| 281 | TM-8 | Permission mode per role: settled 1 Nov, every role runs in Auto; denials per role are counted in the metrics (SES-8). | MECHANISM (a measurement to decide by) | **KEEP** | The count measures D9's first interruption. Section 5. |
| 282 | TM-9 | Merging without a person: settled at 0 refusals in about 450 acts in the confirming round. | MECHANISM (a measurement to decide by) | **KEEP** | A settled measurement (section 6). |
| 283 | TM-10 | Mutation sampling on payment and data paths, decided by mutation score after the first tranche (JOB-13). | MECHANISM (a measurement to decide by) | **ENDED BY DECISION** | D6: "exactly three tests and no others, ever". |
| 284 | TM-11 | Decide the model and effort table by tokens per merged pull request (SES-8). | MECHANISM (a measurement to decide by) | **KEEP** | Not measured; token figures share JOB-10's evidence. Section 5. |

### Foundations: Open tensions

| # | Id | Requirement | Kind | Disposition | Note |
| --- | --- | --- | --- | --- | --- |
| 285 | OT-1 | ROOT stays a session and, with the sweep and the watcher, creates and refreshes the architecture session; the owner starts ROOT, and replaces it only if the watcher declines. | MECHANISM | **CONFLICT FOR THE OWNER** | Conflict TOP: starting or replacing ROOT is an owner act that is not a GitHub or Cloudflare setting (D1); the platform creates sessions only from a person, ROOT or a task, and a task's fresh session could not start sessions (0 of 3). Cost of the mechanism on record: 1,738 heartbeat, idle-check and session-list commits (product_side §3). |
| 286 | OT-2 | A layer closes when every pull request is merged and the layer's checks pass; whole-product checks run before a release. | MECHANISM | **ENDED BY DECISION** | D5: "The layer construct is dropped". D6: "No regression or deploy-and-walk between layers" and "The full regression is ended". As INT-4. |
| 287 | OT-3 | The settings file carries only hooks ENF-1 allows; the drift check fails on any other; today there are none. | MECHANISM | **KEEP** | The drift check follows SHM-1 (section 5). |
| 288 | OT-4 | ARCH routes between spokes and does not translate every exchange; it explains toward the owner with context, in words he understands. | PURPOSE | **KEEP** | As SES-15. |

## 1. Counts by disposition

| Disposition | Rows | Ledger | Foundations |
| --- | --- | --- | --- |
| KEEP | 198 | 102 | 96 |
| KEEP PURPOSE, MECHANISM OPEN | 45 | 24 | 21 |
| ENDED BY DECISION | 9 | 6 | 3 |
| CANDIDATE TO END ON EVIDENCE | 17 | 9 | 8 |
| CONFLICT FOR THE OWNER | 19 | 10 | 9 |
| Total | 288 | 151 | 137 |

## 2. Lines ended by the decisions of 13 Nov, by decision

9 rows are ended outright. A row ended by two decisions appears under both.

**D3** ("Each module is updated and tested by a single job"; "jobs of earlier modules run before those later in the order")

- **P10**: One layer at a time, lowest first, all the module jobs of a layer run concurrently; nothing found waits for the next tranche; the next layer starts when the layer is complete.
- **F-REQ-4**: A change needing no judgment across many modules is one mechanical pass by a worker while no job runs, with one full test run in CI; where judgment is needed, the module gets its own job (P7).

**D5** ("The layer construct is dropped. Strict order")

- **ARC-4**: Architecture, ownership, format and coverage checks run only against the job's module in its gate, layer checks when a layer closes, and over the whole product before a release or on the owner's word.
- **INT-4**: A layer closes when every pull request is merged and the layer's checks pass; whole-product checks run before a release or when the owner asks; the next layer starts at once.
- **OT-2**: A layer closes when every pull request is merged and the layer's checks pass; whole-product checks run before a release.
- **P10**: One layer at a time, lowest first, all the module jobs of a layer run concurrently; nothing found waits for the next tranche; the next layer starts when the layer is complete.
- **P11**: Module tests per module, small layer tests at layer completion, and the full regression only at release or on the owner's word.

**D6** ("exactly three tests and no others, ever"; "The full regression is ended; the internal walk replaces it"; "No regression or deploy-and-walk between layers")

- **ARC-4**: Architecture, ownership, format and coverage checks run only against the job's module in its gate, layer checks when a layer closes, and over the whole product before a release or on the owner's word.
- **GAT-7**: The full product regression runs only at a release or on the owner's word, as its own workflow with its own time budget.
- **INT-4**: A layer closes when every pull request is merged and the layer's checks pass; whole-product checks run before a release or when the owner asks; the next layer starts at once.
- **OT-2**: A layer closes when every pull request is merged and the layer's checks pass; whole-product checks run before a release.
- **P11**: Module tests per module, small layer tests at layer completion, and the full regression only at release or on the owner's word.
- **JOB-13**: Mutation sampling on critical paths, nightly, after the first tranche, payment and data paths only.
- **TM-10**: Mutation sampling on payment and data paths, decided by mutation score after the first tranche (JOB-13).
- **F-REQ-4**: A change needing no judgment across many modules is one mechanical pass by a worker while no job runs, with one full test run in CI; where judgment is needed, the module gets its own job (P7).

No row is ended outright by D1, D2, D4, D7, D8, D9, D10 or D11. Their effect falls on clauses of rows that are otherwise kept, on mechanisms left open, and on the conflicts of section 4.

### Clauses ended or changed inside rows that carry another disposition

These are also the owner's own kept words, so they are listed here for him to see with the rest.

- **D1.** Restated and tightened, not ended: "the few steps of yours the platform forces at onboarding" (F-HUM-7, P17) become settings in GitHub or Cloudflare only. The owner acts D1 does not obviously remove are in section 4 (APPR, TOP, BOUND, REL).
- **D2.** "A tranche CAN RUN ... with no one watching" (GAP-1, F-HUM-10; his own wording against the suggestion) becomes "runs unattended".
- **D4.** The default of 24 live sessions and "BOB may raise or lower that number" (F-PLAT-3); "24 or fewer" (F-PLAT-4); "as many at once as the live-session limit allows" (F-JOB-1).
- **D5.** "each in one layer" (ARC-1, P4); "the layers ... that carry product capability" (P4, F-REQ-1); "layers within rounds" (PLN-1); "a later layer's START" and "if its layer is open" (PLN-3, F-JOB-6); "every ready module of the open layer" (F-SHAPE-2, F-JOB-1); "its layer's tests if any" (GAT-2); "a job, layer or tranche merges" (F-HUM-6); "the module order and layers" (F-FOR-4); fixtures "at layer close" (F-GATE-3); the completion round as what follows the last layer (PLN-4).
- **D6.** "proven by the full regression" (P22); the mechanical pass's "one full test run" (P7); the nightly and release fixture tiers (F-GATE-3); and, if he reads them as tests, the release-tier install and upgrade tests (F-STOP-2).
- **D7.** A development release "in each round" (F-REL-1); "a project runs unattended only if it can deploy" (F-SET-8a); the deploy-and-walk of P22 moves to after a failure-free round and becomes optional.
- **D8.** Nothing ended; restated: F-HUM-9, TXT-1, F-REQ-8, MNT-5, SHM-2 (none waits on the owner's merge).
- **D10.** The name BOB in every row that uses it; "a word you give in chat is written there by BOB" (F-HUM-17); "your words are instructions to every session" is bounded to words he wrote (MSG-2).

## 3. Candidates to end on evidence, strongest first

17 rows in 13 groups. Nothing in D1 to D11 ends these; the owner must confirm each.

| Rank | Rows | Mechanism | Evidence |
| --- | --- | --- | --- |
| 1 | JOB-7 | The receipt | No catch in 1,187 gate runs on 207 job pull requests; about 20 follow-up merges; removed, restored by a session citing Ledger lines, and removed for good on the owner's "get rid of it completely" of 9 Nov (change_sample Case 3 and PRs 3b, 185; DECISIONS.md PD-21). He has decided it for Process3; the found-elsewhere half of the line stays. |
| 2 | F-SET-3 | The setup check before every job start | Refused every job start on the copy after the owner applied new settings; read a Cloudflare 429 as "missing" and stopped a pin move; grew to about 15 minutes, twice per pin move; life 7.0 days; cut to once per pin on the owner's word, 9 Nov (change_sample PR 15, removal 296; DECISIONS.md PD-21 cut 4). |
| 3 | REQ-6, TM-6 | The requirements size cap | Built as a refusal at 70,000 bytes; overridden 32 times of 32 with no catch; 30 split requirement files, 58 notes files, 64 commits and 47 block texts; total requirement bytes unchanged (product_side §6a, §6b, §6d). |
| 4 | JOB-10 | Reading set and tokens recorded per attempt | A required cost figure "blocked every job complete" and was removed 45 minutes later (change_sample PRs 105, 106, Case 2); sessions "frequently could not obtain a cost figure" (product_side, "What could not be established"); 9 block texts name it (product_side §6d). |
| 5 | REC-10 | The size and transient-path check in CI | 947 findings on its first run in 5 min 23 s; false-positive repairs in seven later merges (change_sample PR 1); 495 runs in eight and a half hours, 403 on branches where "nothing reads it" (change_sample removal 116); 69 block texts name a record, ledger or paths check (product_side §6d). |
| 6 | REC-9, TM-2 | The JSON ledger with one mutable field | 105 of 508 landings changed nothing but process/ledger and process/metrics (product_side §2); the census built on it would have refused a layer open falsely and was loosened after 7.3 hours (change_sample PR 204). The owner's own note asked for an open mind. The measure the Foundations set (corruption, bypass) is in no post-mortem file, so this rests on cost, not on that measure. |
| 7 | TXT-6 | Every rule cites a measured failure or the owner's decision | The citation audit was never built and every growth was cited ("Tool 4,543+ lines; every rise cited", causal_forensics §7); 41% of merges added a check both before and after the owner's 5 Nov instruction (change_sample, summary); a removed check was restored citing Ledger lines (change_sample PR 185). |
| 8 | TXT-2, F-REQ-9 | The per-line test in place of a byte cap | Held as a nudge only (ledger_map). The one byte cap that existed (4,096 on role prompts) held at 4,032 to 4,197 bytes from 4 to 9 Nov, while the uncapped README grew from 7,955 to 134,219 bytes (causal_forensics §1.1). |
| 9 | SES-6, F-REQ-12 | "Nothing is ever refused for size", for the process's own instruction texts only | Same figures as TXT-2, with tool/lib growing from 1,431 to 23,429 lines (causal_forensics, headline). Evidence the other way for product files: the 70,000-byte cap was overridden 32 of 32 with no catch (product_side §6b). The owner's own word of 30 Oct. |
| 10 | REC-8 | The reading audit | Never built in nine days (ledger_map: REC-8 "no audit", Gap, later gate). Evidence of absence, not of failure. |
| 11 | F-MNT-1 | The start check on the approvals block ("acts on nothing" on a mismatch) | The owner's own commit was read as a forbidden settings change 15 times (change_sample §5, PR 234). His last approvals edit merged at 16:45Z on 9 Nov and no product landing followed; "Git cannot show why that edit stopped the sessions" (product_side §8). |
| 12 | F-SET-8b | Deploy tokens as environment variables, confirmed by the setup check | The token check read a Cloudflare 429 as "missing" and stopped a pin move (change_sample removal 235). Audit C adds a token and signing seeds beside product code in the session environment (redteam_feasibility finding 11, not re-read here). Against ending it: this was the one route measured to work (2 Nov). |
| 13 | F-GATE-4 | The gate as two jobs | Added on a reviewer's hypothetical; the failure it guards was observed "never"; kept, cheap and inert (change_sample PR 13 and §5). Weakest: no cost on record. |

## 4. Conflicts for the owner, most consequential first

19 rows raise 6 conflicts.

**1. The approvals channel** (group APPR; rows F-PLAT-8, F-PLAT-10, GAP-6)

- Question: Sessions that other sessions start act only on approvals the owner has committed to CLAUDE.md by his own hand (measured: quoted consent declined 11 of 11; a session writing or relaying them is refused), and the documents send every refused act back to him: does that file stay his to edit, or does D1 hold without exception?
- Option A: the approvals in CLAUDE.md remain a file the owner commits himself, as a stated exception to D1. Option B: D1 holds without exception, he edits no file, and the definition must find another way for approvals to reach sessions, which the measurements so far do not show to work.
- Also touches TXT-1, F-REQ-8, F-PLAT-7 and F-MNT-1. D9 lists permission refusals first; the file grew from 641 to 8,664 bytes through 16 owner patches in Process3 (product_side §6a).

**2. What D8 lets Claude build when it fixes the process** (group AUTH; rows F-HUM-12)

- Question: D8 says a flaw in the process must be fixed, by Claude and without the owner as gate, and D9 says the process must not pile on tests, reviews, gates and checks, while in Process3 38% of check-adding merges answered the process's own earlier machinery: does "every problem is an architecture bug ... a workaround for the moment is not a fix" stand as written?
- Option A: it stands in full, so every failure gets a correction that is built. Option B: D9 limits it, so a correction may not add a test, review, gate or check, and some failures are left with a workaround or one line in a report.
- Related rows, kept or with the mechanism open: F-HUM-1, F-HUM-9, P3, P17, MNT-1, MNT-5, MNT-6, TXT-1. He repeated the direction on 7 Nov ("so that the set of problem types tend toward zero", causal_forensics §4.2, as quoted by audit C).

**3. Checks and reviews outside the three tests** (group CHK; rows PLT-9, ARC-2, F-PROP-3, JOB-12, GAT-4, GAT-8, INT-2, INT-7)

- Question: Does "exactly three tests and no others, ever" (D6), with D9, end the kept checks and reviews that are not one of the three (the revert check, the second gate run on the merged result, the ownership check, the artifact check, the grant check at tranche open, and review by a fresh reviewer), or are those something other than a "test" in his sense?
- Option A: they end; only the three tests remain. Option B: they are not tests in his sense and stay, each to be confirmed singly.
- Section 5 lists each with both readings, together with the other checks, audits, measurements and alarms that carry a different disposition.

**4. Acts on the Claude side** (group TOP; rows F-ROLES-4, GAP-8, F-SET-4, OT-1)

- Question: The documents give the owner acts that are on the Claude side and are not GitHub or Cloudflare settings (starting ROOT and replacing it if the watcher declines, setting up the cloud environment at onboarding, and moving to another Claude account): are these named exceptions to D1, or must none of them be his?
- Option A: they are listed as the acts the platform forces, outside D1's two kinds of setting. Option B: D1 holds as worded, and the definition must show each done without him or say it cannot be done.
- Platform facts behind it: sessions are created only by a person, ROOT or a task; a task's fresh session could not start sessions (0 of 3, 2 Nov). SES-1 and F-SET-8b carry the same point.

**5. How the owner changes the number of job slots** (group BOUND; rows F-PLAT-3)

- Question: D4 makes the bound "a user-changeable number" and D1 limits the owner's acts to GitHub or Cloudflare settings "related to permissions or rules": by what act does he change the number?
- Option A: by a setting in GitHub or Cloudflare, accepted although it is neither a permission nor a rule. Option B: by saying so, with a session recording it, in which case D10 governs how his word is recorded.
- D4 already ends the default of 24 and ARCH's power to change it. In Process3 the number was 24, then 6, then 4, then 20, set by sessions (audit D, clause 4b).

**6. The owner's approval of a public release** (group REL; rows GAP-7, F-REL-2)

- Question: A public release waits for the owner's approval in the protected GitHub environment, which is an owner act that is not a settings change (D1) and a wait on him (D2): does that approval stay?
- Option A: it stays, as the one approval outside D1 and D2. Option B: it ends, and publication is governed by settings he has made in advance.
- D7 speaks only of the optional deploy-and-external-walk. Related rows kept: F-HUM-6, F-STOP-1, F-SET-9.

### Not conflicts, but the definition must respect them

- **Provenance under D10.** Six Ledger rows are "modified" by a note the coordinator wrote in as the owner's word: PLT-2, PLT-5, ENF-6, INT-4, SES-15 and TXT-1. Under D10 such a note is his word only if he wrote it. The Foundations repeat five of them as "your word" (all but INT-4). The rows are dispositioned on their content; he may want to confirm the wording.
- **The map and strict order (D3, D5).** The module map today has three uses that point later in the order and one cycle. With them left in, 27 of the 65 modules with work can never be ready under D5 (no_layers_width §2). Repairing them is technical work, not an owner question.
- **Width under strict order (D4, D5).** For the 65 modules with work, D5's rule gives 21 waves once the three later-pointing uses are removed, with 3 modules ready at once at the median and 7 at most, so the default of 8 slots never binds (no_layers_width, summary and §2). The two decisions do not contradict each other; the slots can only be filled as far as ready work exists.
- **Two products, one bound (PLN-7, D4).** D4 does not say whether the 8 slots are per product or per account.

## 5. Reviews, audits, gates, checks, measurements and alarms that are not one of the three tests

121 rows. For each, both readings are given and neither is chosen. "Reading 1" is that D6 or D9 ends it; "Reading 2" is that it is something other than a test in the owner's sense. The last column is the disposition the row carries in the table on its other grounds. A row is listed when it is such a thing or names one as what holds it. The uses-match-imports check (ARC-1, P4) is inside test (i) by D6's own words and is not listed; the gate itself (GAT-1, F-PLAT-13) is where test (i) runs.

### A. Named by D5, D6 or D7 themselves (listed for completeness; no second reading)

| Rows | What it is | Can it stop work? | Reading 1: D6 or D9 ends it | Reading 2: not a test | In the table |
| --- | --- | --- | --- | --- | --- |
| GAT-7, P11, ARC-4, P22, F-REQ-4 | The full product regression (at release, on the owner's word, before a release, or after a mechanical pass) | Yes | D6 names it: "The full regression is ended; the internal walk replaces it". | None: the decision names it. | GAT-7 ended; P11 ended; ARC-4 ended; P22 purpose kept, mechanism open; F-REQ-4 ended |
| INT-4, OT-2, ARC-4, P11, GAT-2, F-GATE-3 | Layer checks and layer tests at a layer's close | Yes | D5 and D6 name it: "The layer construct is dropped"; "No regression or deploy-and-walk between layers". | None: the decisions name it. | INT-4 ended; OT-2 ended; ARC-4 ended; P11 ended; GAT-2 keep; F-GATE-3 purpose kept, mechanism open |
| JOB-13, TM-10 | Mutation sampling, nightly, on payment and data paths | No (never built) | D6: "exactly three tests and no others, ever". | None offered: by its own description it is a test regime. | JOB-13 ended; TM-10 ended |
| F-REL-1, P22, F-SET-8a, F-STOP-3 | Development deploy and external walk | It closed rounds in Process3 | D7 names it: it runs after a failure-free round, and is optional. D6: none between layers. | None: the decision names it. | F-REL-1 purpose kept, mechanism open; P22 purpose kept, mechanism open; F-SET-8a purpose kept, mechanism open; F-STOP-3 keep |

### B. Checks in or beside the gate

| Rows | What it is | Can it stop work? | Reading 1: D6 or D9 ends it | Reading 2: not a test | In the table |
| --- | --- | --- | --- | --- | --- |
| JOB-12, F-PROP-3, F-SHAPE-3 | The revert check: a job's new tests must fail with its change reverted | Yes: a red finding holds the merge | A fourth test; it ends. Nothing then shows a job's new tests are not inert, and the false-done count (F-MNT-4) loses half its definition. | Part of test (i): it runs the job's own module tests once more, against the reverted change. | JOB-12 conflict; F-PROP-3 conflict; F-SHAPE-3 purpose kept, mechanism open |
| GAT-8, P12, F-MNT-4 | A second gate run on the merged result before merging, and the re-run of checks when a tranche closes into main | Yes | A repeat beyond test (i); it ends. A job merges on the run at its own tip, and combined breakage is left to the round's internal walk. | The same test (i), run on the state that will actually merge; not another test. | GAT-8 conflict; P12 keep; F-MNT-4 keep |
| GAT-4 | Regenerate listed artifacts in the gate and verify those that changed | Yes | A gate check outside the three; it ends. | A build step inside test (i) for the module that owns the artifact. | GAT-4 conflict |
| ARC-2, REQ-4 | The ownership check: a job changes only its module's files and strikes only its own marks | Yes: it refuses the merge | A check outside the three; it ends, and single ownership rests on the rule alone. | Not a test of the product: it holds what D3 asks ("Each module is updated and tested by a single job"). | ARC-2 conflict; REQ-4 keep |
| ARC-4, GAT-2 | Format and coverage checks scoped to the job's module (uses-match-imports is inside D6(i) by name) | Yes | Only the uses-match-imports check is named by D6(i); the others end. | Module-scoped checks are part of "each job's own module tests". | ARC-4 ended; GAT-2 keep |
| ARC-3 | Tests assert on text keys, never words (its check was never built) | No | No check is built for it. | A standard for how module tests are written, inside test (i). | ARC-3 keep |
| JOB-5 | Checks that take seconds, run locally when a job completes | They can refuse completion | Checks outside the three; they end. | Preconditions of the completion command, not tests. | JOB-5 keep |
| P7, F-GATE-2 | Proof that every requirement is tested at the interface | The Process3 form refused completion | No check beyond test (i) shows each requirement has a test. | A property of test (i) itself (what a module's tests must cover), not a separate check. | P7 purpose kept, mechanism open; F-GATE-2 purpose kept, mechanism open |
| F-GATE-3, F-STOP-2 | Fuller fixtures by tier (nightly, at release) and the release-tier install-from-scratch and upgrade tests | A release | Tests outside the three; they end ("no others, ever"). | The same module tests run less often, and tests of release packaging that D6, which speaks of rounds, does not address. | F-GATE-3 purpose kept, mechanism open; F-STOP-2 purpose kept, mechanism open |
| F-GATE-4 | The gate as two jobs, so product code holds no token; a failed fetch fails the check | Yes | A guard added on a hypothetical; it ends (D9). | Not a test: an arrangement of where test (i) runs. | F-GATE-4 candidate |
| REQ-3, F-FOR-4 | Measurements at a scale beyond the suite, as plan items | No | A test by another name; it ends. | The line says "never a test line": a planned measurement. | REQ-3 keep; F-FOR-4 purpose kept, mechanism open |

### C. Reviews, audits and approvals

| Rows | What it is | Can it stop work? | Reading 1: D6 or D9 ends it | Reading 2: not a test | In the table |
| --- | --- | --- | --- | --- | --- |
| INT-2, INT-7, F-JOB-10, SES-18, F-PLAT-14, F-SET-2 | Review by a fresh reviewer, at ARCH's judgment per merge; one complete pass, one confirming run | No by the lines' own words (findings are diagnosis, never the merge gate) | D9 names reviews, and a review is not one of the three tests; it ends. | A review is not a test and never gates (GAP-10); it stays as diagnosis. | INT-2 conflict; INT-7 conflict; F-JOB-10 keep; SES-18 keep; F-PLAT-14 purpose kept, mechanism open; F-SET-2 keep |
| GAP-10, INT-3, F-HUM-6 | The owner's approval before a particular merge, when he asks for it | That merge, at his request | A gate; it ends, and under D2 nothing waits for him. | His own option, used only when he asks; not part of the process's tests. | GAP-10 keep; INT-3 keep; F-HUM-6 keep |
| GAP-7, F-REL-2, F-STOP-1 | The owner's approval of a public release in the protected GitHub environment | Publication | A gate and an owner act that is not a setting; it ends (D1, D2). | Not a test: the owner's decision to publish. (Conflict REL.) | GAP-7 conflict; F-REL-2 conflict; F-STOP-1 keep |
| REC-8, P20 | The reading audit (never built) | No | An audit; it ends. | A sampled audit that files a report and stops nothing. | REC-8 candidate; P20 keep |
| TXT-6, GAP-3, F-HUM-13, F-SHAPE-4 | The audit of citations: every rule and check cites a failure or the owner's word | No | An audit; it ends. | A restraint on checks, not a check on the work. | TXT-6 candidate; GAP-3 purpose kept, mechanism open; F-HUM-13 purpose kept, mechanism open; F-SHAPE-4 purpose kept, mechanism open |
| TXT-2, F-REQ-9 | The per-line test on instruction files; lines deleted on review | No | A review of text; it ends. | A rule for writing instruction text, not a test. | TXT-2 candidate; F-REQ-9 candidate |
| GAP-9 | The three documents agree; no build starts on a line any contradicts | A build start | A gate before building; it ends. | A property of the documents, not a test. | GAP-9 purpose kept, mechanism open |
| F-HOW-1, MNT-8, MNT-9, MNT-10 | Certification: nothing is in force until run on a real tranche; shadow slice, then the live tranche; releases name what they were certified at | It gates the process being called ready, not product work | A gate on the process; it ends. | A trial of the process; D6 counts tests of the product. | F-HOW-1 keep; MNT-8 keep; MNT-9 keep; MNT-10 keep |
| MNT-11, F-SHAPE-6, F-MNT-2 | Re-test at each model release: remove a component and see what breaks; rerun the approval test | No | Extra tests; they end. | Trials of the process and the platform at a model release, not tests in the build. | MNT-11 keep; F-SHAPE-6 keep; F-MNT-2 keep |

### D. Checks on the process's own conditions

| Rows | What it is | Can it stop work? | Reading 1: D6 or D9 ends it | Reading 2: not a test | In the table |
| --- | --- | --- | --- | --- | --- |
| PLT-9 | Grants checked at every tranche open | A tranche from opening | A check outside the three; it ends, and a missing grant is met when a step needs it. | A precondition read once before a tranche, not a test of the product. | PLT-9 conflict |
| F-SET-1, F-SET-3, F-SET-8b | The setup check before every job start, including deploy tokens by name | A job start | A check outside the three; it ends. | A read-only precondition; the owner already cut it to once per pin (9 Nov). | F-SET-1 purpose kept, mechanism open; F-SET-3 candidate; F-SET-8b candidate |
| MNT-4, F-MNT-1 | Each session verifies the pin, HEAD and the approvals block at start; on a mismatch it acts on nothing | That session | A check outside the three; it ends. | A session's own start-up verification, not a test of the product. | MNT-4 keep; F-MNT-1 candidate |
| GAP-6, F-PLAT-8 | The start check that the approvals loaded, and the check that fails any approvals change not made by the owner | Yes | Checks outside the three; they end. | Guards on the owner's policy text, not tests. (Conflict APPR.) | GAP-6 conflict; F-PLAT-8 conflict |
| SHM-1, OT-3 | The drift check on what a product receives | Yes | A check outside the three; it ends. | A guard on process files in the product, not a test. | SHM-1 purpose kept, mechanism open; OT-3 keep |
| REC-9, TM-2 | The schema check on the JSON ledger | Yes | A check outside the three; it ends. | A check on a record, not on the product. | REC-9 candidate; TM-2 candidate |
| REC-10, P23, F-SET-6 | The size and transient-path check (the required "record" check) | Yes | A check outside the three; it ends. | A check on the repository's contents, not a test. | REC-10 candidate; P23 keep; F-SET-6 keep |
| REQ-6, TM-6 | The requirements size cap | As built, it refused "job complete" | A gate; it ends. | As the line is written it triggers a split before any job starts and never refuses. | REQ-6 candidate; TM-6 candidate |
| F-PLAT-4 | Every new session is checked to have started | No | A check; it ends, and a silent failure to start (about 50 live sessions) goes unseen. | Confirmation of a platform call's result (REC-5), not a test. | F-PLAT-4 keep |
| F-PLAT-9, TM-8, TM-9 | The approvals trial at each tranche open; refusals counted per tranche and per role | The trial precedes the first job | A trial and a count; they end. | A platform measurement (0 refusals in about 450 acts) and the only count of D9's first interruption. | F-PLAT-9 keep; TM-8 keep; TM-9 keep |
| SHM-3 | Onboarding measures the product against the certified sizes | No | D9 counts measurements with the piled-up checks: it ends and the number is no longer taken. | It reports and stops nothing, so it is not a test in D6's sense; D9 bars piling on, not measuring. | SHM-3 keep |
| ENF-1 | Command hooks (a handful at most; none today) | A hook refuses a tool call | Hooks are checks; none is added. | The line is itself a restraint on hooks. | ENF-1 keep |

### E. Measurements, reports and alarms

| Rows | What it is | Can it stop work? | Reading 1: D6 or D9 ends it | Reading 2: not a test | In the table |
| --- | --- | --- | --- | --- | --- |
| PLT-1, GAP-11, F-PLAT-2 | The dated table of measured platform behaviour; measure once by default | No | D9 counts measurements with the piled-up checks: it ends and the number is no longer taken. | A record of facts the design stands on; it stops nothing. | PLT-1 keep; GAP-11 keep; F-PLAT-2 keep |
| PLN-6, GAP-12, F-MNT-3, SES-11 | The tranche report and the overhead measures, including ARCH's idle time and the owner's minutes | No | D9 counts measurements with the piled-up checks: it ends and the number is no longer taken. | It reports and stops nothing, so it is not a test in D6's sense; D9 bars piling on, not measuring. GAP-12 is the only stated measure of D1 and D2. | PLN-6 keep; GAP-12 keep; F-MNT-3 keep; SES-11 keep |
| SES-12, F-MNT-4, F-MNT-5, F-MNT-7, F-SHAPE-5 | The two health metrics: false-done rate, cost per surviving pull request | No | D9 counts measurements with the piled-up checks: it ends and the number is no longer taken. | It reports and stops nothing, so it is not a test in D6's sense; D9 bars piling on, not measuring. | SES-12 keep; F-MNT-4 keep; F-MNT-5 purpose kept, mechanism open; F-MNT-7 purpose kept, mechanism open; F-SHAPE-5 purpose kept, mechanism open |
| SES-9, F-MNT-6 | Usage is read by an allowed route or named unmeasured | No | D9 counts measurements with the piled-up checks: it ends and the number is no longer taken. | It reports and stops nothing, so it is not a test in D6's sense; D9 bars piling on, not measuring. | SES-9 keep; F-MNT-6 keep |
| JOB-10 | Reading set and tokens recorded per attempt | As built once, a required cost figure blocked every job complete | D9 counts measurements with the piled-up checks: it ends and the number is no longer taken. | It reports and stops nothing, so it is not a test in D6's sense; D9 bars piling on, not measuring. | JOB-10 candidate |
| JOB-11, GAP-2, F-PLAT-14 | Cost and elapsed time per attempt as an alarm for lack of progress | No: an alarm, not a cap | An alarm among the piled-up checks; it ends. | It reports and stops nothing. | JOB-11 purpose kept, mechanism open; GAP-2 purpose kept, mechanism open; F-PLAT-14 purpose kept, mechanism open |
| SES-4, F-PLAT-6 | REFRESH printed at the context threshold and at 10 refusals; refusals counted per session | No | An alarm; it ends, and a session nearing the 20-refusal hand-off is not flagged. | It reports and stops nothing; it is how a refusal pause is seen without a person. | SES-4 keep; F-PLAT-6 keep |
| F-ROLES-5, F-ROLES-6, ENF-6 | The hourly sweep and the daily watcher | No | Watchdogs among the piled-up checks; they end. | They catch a stopped session and stop nothing; "neither is required for correctness". | F-ROLES-5 keep; F-ROLES-6 keep; ENF-6 keep |
| F-PROP-0, F-PROP-8, JOB-9, SES-17, P19, F-JOB-3 | Status exposing a violated nudge: WORKING with nothing pushed, or work ready while ARCH is idle (the idle alarm) | The coded form ran before every command | An alarm; it ends. | A line of status that stops nothing; the purpose is D9's own. | F-PROP-0 keep; F-PROP-8 purpose kept, mechanism open; JOB-9 keep; SES-17 purpose kept, mechanism open; P19 purpose kept, mechanism open; F-JOB-3 purpose kept, mechanism open |
| SES-5, F-REQ-11, SES-6, F-REQ-12 | Reading sets printed with sizes; an overrun measured and reported, never refused | No | D9 counts measurements with the piled-up checks: it ends and the number is no longer taken. | It reports and stops nothing, so it is not a test in D6's sense; D9 bars piling on, not measuring. | SES-5 keep; F-REQ-11 keep; SES-6 candidate; F-REQ-12 candidate |
| SES-16, TM-1, TM-4, TM-5, TM-7, TM-11, TXT-4, F-REQ-7 | The first-tranche measurements still open (stateless ARCH, routing share, lanes, transient-state home, model and effort table, trimmed principles) | No | D9 counts measurements with the piled-up checks: it ends and the number is no longer taken. Each question is then settled without its number. | Each is a number to decide a line by ("not on argument"); none stops work. | SES-16 keep; TM-1 keep; TM-4 keep; TM-5 keep; TM-7 purpose kept, mechanism open; TM-11 keep; TXT-4 keep; F-REQ-7 keep |

## 6. Measured platform behaviour recorded in the Foundations

39 facts. "Not stated" means the Foundations give no count. Two entries are from documentation, not measurement, and are marked. Any definition of Process4 has to stand on these or re-measure them.

| # | Behaviour | Date | Count | Where in the Foundations |
| --- | --- | --- | --- | --- |
| 1 | The classifier refused archive, timer edits and interrupts at random before the owner's approvals were committed, and passed each after | Rows as of 31 Oct, updated 2 Nov | 15 of 15 after | Platform table (PLT-2) |
| 2 | The in-session background limit is about thirty minutes; anything longer is CI | Rows as of 31 Oct | not stated | Platform table (PLT-4) |
| 3 | Sessions are created only from depth 0 to 2, so depth never passes 3; jobs ran and merged at depth 3 | Restated 3 Nov | not stated | Platform table (PLT-5) |
| 4 | One repository per session; a session reads the deny list only when it holds one repository and starts from a branch that carries it | Rows as of 31 Oct | not stated | Platform table (PLT-7); Setup |
| 5 | Privileged GitHub acts run on GitHub's runner with the owner's tokens | Rows as of 31 Oct | not stated | Platform table (PLT-8) |
| 6 | At about 50 live sessions the account stops starting new ones, while the create call still reports success | 1 Nov | not stated | Platform table |
| 7 | A denied tool is removed from the session outright | 1 Nov | not stated | Permissions |
| 8 | An allow rule does not take session and scheduled-task acts out of the classifier: archiving a session and creating, switching off or deleting a task were judged case by case whether allow-listed or not | 1 Nov | not stated | Permissions |
| 9 | No locked-down (dontAsk) session can exist on the account: the app offers only Auto, Accept edits and Plan, and an Auto parent cannot create a dontAsk child | 1 Nov | not stated | Permissions |
| 10 | After three refusals in a row a session stops and waits for a person | 1 Nov | not stated | Permissions |
| 11 | Auto mode hands a session to a person after 20 refusals in it | Anthropic's docs (not measured) | n/a | Permissions |
| 12 | A fresh coordinator reached 2 refusals in its first minutes | 3 Nov | 2 | Permissions |
| 13 | A session paused by the classifier waits for a person's approval; the docs do not say an interrupt or a message resumes it | Docs read 3 Nov (not measured) | n/a | Running unattended, condition 3 |
| 14 | A scheduled task's fresh session runs in Auto, with no parent | 1 Nov | not stated | Permissions; Scheduled tasks |
| 15 | A task fires into an idle ROOT and resumes it as one turn, about a minute late | 1 Nov | not stated | Scheduled tasks |
| 16 | Creating a task is always judged, and passed every time it was tried; editing a task is what the classifier refused | 1 Nov | "every time it was tried" | Scheduled tasks |
| 17 | Firing a task by hand starts a new session instead of waking ROOT | not dated | not stated | Scheduled tasks |
| 18 | A task bound to a standing session resumes it | 2 Nov | 3 of 3 | Scheduled tasks (watcher row) |
| 19 | A task's fresh session cannot start sessions or send messages | 2 Nov | 0 of 3 | Scheduled tasks (watcher row) |
| 20 | The judge refuses a session writing, editing or relaying the owner's approvals (Instruction Poisoning) | 1 Nov | not stated | Your standing approvals |
| 21 | The owner's committed CLAUDE.md was enough for the judge without a routine-work environment description | 1 Nov | not stated | Your standing approvals |
| 22 | Jobs took in-repository work from their coordinator's messages, and declined unforeseen outward acts | 1 Nov | not stated | Your standing approvals |
| 23 | Consent quoted in a session's starting text does not count: in sessions another session started, the model declined every merge asked of it | 2 Nov | 11 of 11 declined | Your approvals cover every act |
| 24 | With the owner's consent typed in the acting session, the judge refused no merge | 2 Nov | 0 of 21 refused | Your approvals cover every act |
| 25 | With no consent, merges were refused | 2 Nov | 2 of 3 refused | To measure |
| 26 | With the committed approvals a session acted on its coordinator's unforeseen ask; without them it did not | not dated in the sentence | 10 of 10 with; 0 of 10 without | Running unattended, condition 1 |
| 27 | Merging without a person on the committed approvals, in the confirming round | Settled (confirming round; date not stated) | 0 refusals in about 450 acts | To measure |
| 28 | A judged act chained with another command gives the judge one blob: the only judge refusal in rounds 2 to 4 fell on a chained merge | 2 Nov | 1 refusal | One act per command |
| 29 | With no event, the architecture session noticed a job's completion late | 2 Nov | 194 minutes, 1 case | A job's life, step 2 |
| 30 | No route sets turn or budget caps for a cloud session | 1 Nov | not stated | A job's life, step 2 |
| 31 | Each attempt's elapsed time and cost are readable from the session record | 2 Nov | not stated | Running unattended, condition 6 |
| 32 | A looping session pushes: one ran four review rounds over two hours and $26 before the owner asked | 2 Nov | 1 case | Running unattended, condition 6 |
| 33 | The session setup hook did not install every lock file | 2 Nov | 7 of 10 installed | The gate and review |
| 34 | A merge refused because its base moved, or a state-branch push rejected, is fetched and retried | Met 2 Nov | not stated | A job's life, step 9 |
| 35 | Environment variables in the cloud environment are the one route both the deploy tools and the setup check were measured to read | 2 Nov | not stated | Deploy tokens |
| 36 | A session started by branch name landed on an old copy; a start by commit landed fresh | 2 and 3 Nov; process3 PR 36 | 1 of 1 by commit | Versions |
| 37 | Approvals load only at a session's start | not dated | not stated | Versions |
| 38 | Reported refusal rates moved several-fold between Claude Code versions | reported, not dated | not stated | Re-test per model |
| 39 | Hooks vanished after a resume | not dated | not stated | Dropped, and why (ENF-4) |

The Foundations draw these consequences from them, which the decisions leave standing: every role runs in Auto; hard rules live in deny lists; nothing needed for correctness depends on archiving a session or on switching off or deleting a task; no session starts its own successor; a scheduled task is never required for correctness; every new session is checked to have started; a session stopped by refusals is replaced, not resumed; the owner's committed CLAUDE.md is the one channel that reaches sessions he does not start.
