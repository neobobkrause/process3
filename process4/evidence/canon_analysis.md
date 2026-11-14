# Canon analysis: how much of the Process3 failure was written into the documents the owner approved

Prepared 13 Nov 2026 by one of the independent analysts on the post-mortem.

## Summary

The canon carried a heavy check load before any drift, and its restraints could not hold that load down.

- **Day-zero load.** The approved canon mandates about 195 distinct checks, reviews, measurements, alarms, records, roles and recurring tasks (Inventory A). On 3 Nov the canon's own map showed only 51 of its 151 rows as simply built. The rest were owed work, and most of the owed work was checks.
- **Restraints.** I count 47 lines or sentences that restrain adding checks, rules or caution (Inventory B). The 25 that restrain one specific thing (hooks, in-session gates, review rounds) are mostly held by code or by the design. The 22 that restrain growth in general are all held by text alone. None of the 47 limits the number of checks, the size of the tool, the number of process changes in a run, or the share of effort spent on the process.
- **The central rule is a test of justification, not a budget.** GAP-3 allows a check "only against a measured failure or your word". A failure of the process's own machinery is a measured failure, and a session writes the owner's chat words into the record. Both sources are produced by the run itself, so the test is always passable.
- **The fix is mandatory and the mechanism is the session's to choose.** "Every problem is an architecture bug: BOB finds why, corrects the design ... and builds the correction; a workaround for the moment is not a fix." Mechanisms, including which checks exist, are BOB's without the owner. The same sessions may change the process and move the running product onto it.
- **Judgment.** The direction of the collapse was foreseeable from the canon alone, and the Ledger's own "Against" column foresaw most of it in terms. The speed was not determinable from the text. Section 6 names the eight features most responsible.

## Scope, method and limits

I read three inputs in full: the Process3 Foundations (292 lines, about 9,800 words), the Ledger map (dated 3 Nov), and the Keep and Drop Ledger page (exported 5 Nov). The Ledger's content sits in JavaScript inside the HTML; a small parser extracted the 159 lines, their 126 detail entries and the 159 stored decisions. The full extraction is in `/tmp/claude-0/-home-user/5fb00928-6c32-53d3-a000-4e1f643cb17f/scratchpad/work/ledger_lines.md`.

Four limits apply.

1. **"Day zero" is 3 to 5 Nov, not 31 Oct.** The Foundations is dated 31 Oct but carries text through 4 Nov, and the Ledger export is from 5 Nov. I cannot separate the 31 Oct text from later insertions except by the dated parentheticals. The inventories describe the canon as approved by 5 Nov.
2. **I did not see what sessions actually loaded.** The rulebooks, starting prompts, reading sets, the Build Plan and the tool's code are not among my inputs. Statements about where a session would meet a line are inferences from the canon's own design for what sessions load, and are marked as such.
3. **Counts in the inventories are my reading.** Another reader would merge or split some items. The totals are good to within perhaps ten percent; the pattern does not depend on the exact numbers.
4. **One exposure to another analyst's material.** A file `review.txt` sits in the same work directory. Its opening lines (a headline verdict and a few numbers) appeared when I listed the directory. I read no further and used none of it; everything below rests on the three named inputs and the background given in my brief.

"The canon" below means the Ledger and the Foundations together. The Ledger map is a record derived from them, used here as evidence of what was built.

## 1. The Ledger lines

### What the page holds

| Group | Lines | Kept | Modified | Dropped | Decisions recorded (UTC) |
| --- | --- | --- | --- | --- | --- |
| Original lines | 126 | 98 | 21 | 7 | 31 Oct 00:54 to 02:32; six re-dated 3 Nov 19:30 to 20:00 |
| Principles of the earlier processes (P1 to P23, without P14 and P15) | 21 | 10 | 10 | 1 | 3 Nov 16:58 to 17:13 |
| Gaps found 3 Nov (GAP-1 to GAP-12) | 12 | 11 | 1 | 0 | 3 Nov 17:28 to 17:36 |
| Total | 159 | 119 | 32 | 8 |  |

Six facts about the page matter for the rest of this analysis.

1. **The owner accepted the drafted suggestion on 151 of 159 lines.** The eight against the suggestion are all "keep" turned into "modify": PLT-2, PLT-5, ARC-4, JOB-14, INT-4, SES-8, TXT-1 and GAP-1.
2. **Most notes are not the owner's own words.** Of 33 notes, 18 are a copy, near-copy or excerpt of the session's suggestion text, 6 say they were "written here by the coordinator" or "recorded by the coordinator", 4 add a few owner words to the suggestion, and 5 are the owner's own (REC-9, ARC-4, JOB-14, SES-8, GAP-1).
3. **The decisions were recorded quickly.** The first 126 took 98 minutes, about 47 seconds a line. The 21 principles took 15 minutes and the 12 gap lines took 8. GAP-3, the central restraint, was recorded between GAP-2 at 17:28 and GAP-4 at 17:31. The owner may have read and discussed the lines beforehand; the timestamps show only when choices were saved.
4. **The evidence grades do not meet the canon's own citation rule.** The page grades 99 lines "measured", 11 "convergent", 30 "single" (one source or anecdote) and 19 "proposed" (reasoning only). Of the 151 kept or modified lines, 43 are "single" or "proposed". Many "measured" lines cite only the earlier requirements draft with a reason such as "Working" or "Held". The lines stand because the owner clicked Keep, which is "your word". That is how the second half of GAP-3's test discharges the first half.
5. **The Foundations and the page disagree on the counts.** The Foundations reports 103 kept, 16 modified and 7 dropped for the original 126 and names two lines restated on 3 Nov. The export shows 98, 21 and 7, with six lines re-dated 3 Nov. The canon did not satisfy its own GAP-9 ("the three documents agree") on its headline numbers.
6. **Three kept lines are dead.** PLT-3, JOB-11 and INT-3 are still marked kept, and each is "replaced" by a GAP line appended on 3 Nov. The correction was made by appending, which the canon forbids ("never by appending").

### Tag counts

My primary tag for each line gives a rough balance of the canon. It is a judgment, shown in the table so it can be challenged.

| Tag | Meaning | Lines |
| --- | --- | --- |
| C | Adds a check, gate, review or verification | 29 |
| R | Adds a record or bookkeeping artefact | 24 |
| M | Adds a measurement, metric or alarm | 11 |
| S | Defines a role or session structure | 7 |
| X | Restrains checks, rules, caution or cost | 32 |
| O | Other design constraint, structure or policy | 45 |
| D | Dropped | 8 |
| rep | Kept on the page but replaced by a GAP line | 3 |

Lines that add machinery (C, R, M, S) number 71. Lines that restrain it number 32. The restraint lines are more numerous than the canon's critics might expect; Section 3 shows why their number did not matter.

### Every line

The table gives the opening words of each line, the decision, my tag, and the note stored with the decision. A note in square brackets is labelled with its origin. Full statements, sources, suggestions, notes and the page's own pros and cons are in `ledger_lines.md`.

| Id | Line (opening words; full text in ledger_lines.md) | Decision | Tag | Owner's note |
| --- | --- | --- | --- | --- |
| PLT-1 | Keep one dated table of platform constraints: each a measured fact, how often measured, the evidence, and the workaround the process uses. Nothing … | kept | M |  |
| PLT-2 | Depend on no act the auto-mode permission classifier decides case by case: archiving sessions, editing or deleting scheduled tasks, interrupting … | modified (suggested keep); re-dated 3 Nov | O | [written in by the coordinator] Bob's word in chat, 3 Nov (written here by the coordinator): depend only on acts the committed approvals cover and that were measured to pass; archiving sessions and switching off or deleting tasks are housekeeping, counted and reported, never needed for correctness. |
| PLT-3 | Hard permission rules live in allow and deny lists in user settings plus the sandbox, which run before the classifier. The classifier is defence in … | kept | rep |  |
| PLT-4 | No step runs longer than the in-session background limit; anything that can is a CI workflow. | kept | O |  |
| PLT-5 | No session starts its own successor. Sessions are started only from depth 0 or 1, so depth never grows past 2. | modified (suggested keep); re-dated 3 Nov | O | [written in by the coordinator] Bob's word in chat, 3 Nov, option A (written here by the coordinator): no session starts its own successor; depth stays at most 3 (coordinator, ROOT, BOB, job), as ran on 3 Nov when the explore and review jobs merged at depth 3. The watcher is started beside ROOT by whoever starts ROOT. |
| PLT-6 | A scheduled task is never required for correctness; a wake is a convenience and the record is read at every wake regardless. | kept | O |  |
| PLT-7 | A session works on one repository, the product's; the process is a read-only clone at a pinned commit. | kept | O |  |
| PLT-8 | GitHub acts a session cannot take run on GitHub's runner by workflows with your tokens as secrets. | kept | O |  |
| PLT-9 | Every credential is gathered once before a product's first tranche and checked at every tranche open; a missing grant stops a tranche from opening, … | kept | C |  |
| PLT-10 | A session's platform status is never read as its work state; the record is. | kept | O |  |
| ENF-1 | Hooks: remove all. Nothing refuses an act, holds a turn, records an act, or judges a message. | modified | X | [copy of the suggestion] at most a handful of command hooks, each for a zero-exception rule, each with a legitimate blocked exit; none that hold a turn or judge text. |
| ENF-2 | No model judge sits between a session's message and you. | kept | X |  |
| ENF-3 | Nothing holds a turn. When you say stop, the session stops in that turn. | kept | X |  |
| ENF-4 | A PreToolUse hook refuses any read that stops short of a set document. | dropped | D |  |
| ENF-5 | A Stop hook refuses a turn's end past the context threshold until a refresh is recorded. | dropped | D |  |
| ENF-6 | A separate small model checks after each turn whether the session's record reads finished and sends it back if not. | modified; re-dated 3 Nov | X | [written in by the coordinator] native /goal with a mechanical condition (PR state on GitHub), no model judging the transcript. Superseded by Bob's word, walk-through question 2, 1 Nov ("Yes, as recommended"): no /goal, since its check is a model reading the conversation; a stopped job is caught by status and the sweep. Recorded by the coordinator, 3 Nov, … |
| ENF-7 | Every gate or hard rule offers the model a legitimate exit: 'blocked' or 'flag as impossible', recorded and visible to BOB. | kept | O |  |
| REC-1 | Durable facts live on the tranche branch, transient ones on an orphan state branch deleted at each transition; nothing durable cites the state branch. | modified | R | [copy of the suggestion] keep the split, but move coordination traffic to PR bodies, comments and issues, or to a separate bookkeeping repository; add the size check in … |
| REC-2 | One writer per file. | kept | R |  |
| REC-3 | One status command reads the whole state a role needs from git and prints it with sizes; a successor of any role starts from it alone. | kept | R |  |
| REC-4 | Record writes by the architecture session never cost a job a gate run or a completion. | kept | X |  |
| REC-5 | A remote act is recorded as done only from the tool call's result, never from its request. | kept | R |  |
| REC-6 | The address of any party is read from git at the moment of sending, and an address change is on that branch before it is announced. | kept | R |  |
| REC-7 | The record of a halted build is complete: status on a fresh session tells everything open, idle, merged, unmerged and owed, with no transcript needed. | kept | R |  |
| REC-8 | Reads are a matter of record: the start command prints the reading set with sizes and a worker audits transcripts after the fact for reads that … | modified | C | [copy of the suggestion] keep the audit, but judge reading by what a session can cite from the end of a document, and shrink documents so the question rarely arises. |
| REC-9 | The build ledger is a schema-constrained JSON file with one mutable field per entry (status), not free-form markdown that sessions may rewrite. | kept | R | [owner's own words] Try this, but measure the experience with an open mind as to whether it's work or not. |
| REC-10 | A CI check fails any commit that adds a file over a set size or under a path reserved for transients; a scheduled prune squashes the transient branch. | kept | C |  |
| REC-11 | Decisions go to short architecture decision records the moment they are made, each in its own file, never as a line in a long plan. | kept | R |  |
| REC-12 | A git-synced multi-writer issue tracker with a daemon and local database (Beads-style). | dropped | D |  |
| ARC-1 | Modules in one total order, each in one layer, lower first, uses declared and matched by imports; a violation fails the gate. | kept | C |  |
| ARC-2 | Each file has one owner module; a job writes only its module's paths and tests and the strike of its own marks. | kept | C |  |
| ARC-3 | A test asserts on a text's key, never on its words; every user-facing sentence lives once in the word table. | kept | C |  |
| ARC-4 | The checks are scoped to a module in the gate and run whole once at a layer's close. | modified (suggested keep) | C | [owner's own words] The architecture, ownership, format and coverage checks run only against the job's module in its gate, layer checks when a layer closes, and over the whole product before a release or when I ask for one. |
| ARC-5 | Every check and gate finding names module, file and line in one machine-readable result that status reads; a red is never searched for in a log. | kept | C |  |
| REQ-1 | Each module's requirements file has a public part and a private part, every statement under a permanent id. | kept | R |  |
| REQ-2 | A requirement states behaviour at the interface, never an implementation; an ambiguity is removed by rewriting the text. | kept | O |  |
| REQ-3 | A figure at a scale beyond the suite is a measurement with its own plan id, never a Test line; a review never counts an untaken measurement as a gap. | kept | X |  |
| REQ-4 | A not-yet-met mark is struck only by the job that meets it, in its own commit. | kept | R |  |
| REQ-5 | A change to what a provided service means goes to you only by the DES 1 test; every other change is BOB's, recorded once. | kept | O |  |
| REQ-6 | Size of a module's requirements file: the 30 Oct draft says no limit, overrun reported; the 29 Oct page set a hard cap that refused 127 of 127 … | modified | X | [copy of the suggestion] Suggest: a cap that triggers a split or consolidation by BOB before any job starts, measured on the real product; never a refusal at a job's start. |
| REQ-7 | Only explicitly marked words of yours become decisions; a ruling lives only until the requirement it refines is rewritten to absorb it, then it is … | kept | X |  |
| PLN-1 | The structure is layers within rounds within tranches, and nothing else about a product's size or shape is assumed. | kept | O |  |
| PLN-2 | A plan is written from the work that remains; an entry is deferred only for one of three named reasons. | kept | O |  |
| PLN-3 | Work found while a round runs is placed at once: in the running job, else a later layer's START, else the completion round. | kept | O |  |
| PLN-4 | The completion round has its own file, distinct from the next tranche's list. | kept | R |  |
| PLN-5 | Pause and resume are first class: your word is recorded once in the plan's Status line, every session reads it at its next status and takes no new … | kept | O |  |
| PLN-6 | A tranche's report states elapsed time, work finished, deferrals with reasons, work left, cost, and the share of cost that was process overhead. | kept | M |  |
| PLN-7 | Two products may run tranches at once on one account; nothing in the process names a product. | kept | O |  |
| JOB-1 | A job is a draft pull request from job/<module> to the tranche branch whose body is its START; its report is a comment; its merge is its completion. | kept | O |  |
| JOB-2 | A START names only acts the tool supports, each as the command the job runs. | kept | O |  |
| JOB-3 | A module's earlier unmerged work is taken in by a tool command on the job's own branch. | kept | O |  |
| JOB-4 | A job is never restarted for a process reason; a blocking flaw holds it at its next command, the fix lands, the same job continues. | kept | X |  |
| JOB-5 | A job's completion runs locally only checks that take seconds; the gate is CI. It pushes, posts the report, marks the PR ready, sets COMPLETE. | kept | X |  |
| JOB-6 | An unmerged job whose session is gone is restartable by one command that keeps its branch and PR. | kept | O |  |
| JOB-7 | A job's report carries Met, Evidence and what it found elsewhere; a flaw in another module goes to BOB as a report. | modified | R | [copy of the suggestion] Suggest: Evidence is a machine-readable receipt (command, exit code, git SHA, and an explicit not-verified list), never prose. |
| JOB-8 | A job never commits a generated artifact. | kept | C |  |
| JOB-9 | A job ends a turn only COMPLETE or on a named wait with everything pushed; nothing enforces this but the rule and the record. | kept | O |  |
| JOB-10 | A job's reading set is recorded at its start and its tokens at its end, per attempt, so restarts are never counted as jobs. | kept | M |  |
| JOB-11 | Each job runs in its own checkout with a turn cap and a dollar budget cap set at start. | kept | rep |  |
| JOB-12 | A revert check in CI: with the production change reverted, the job's new tests must fail. Inert tests fail the gate. | kept | C |  |
| JOB-13 | Mutation sampling on critical paths runs nightly as its own workflow, never per PR. | modified | C | [copy of the suggestion] Suggest: later, after the first tranche, on payment and data paths only. |
| JOB-14 | Unit of work is one module or one feature per session; after two failed corrections, start a fresh session with a better brief rather than a third … | modified (suggested keep) | X | [owner's own words] As suggested (keep) but the restarted session should recognize that corrections were made and try to understand why to anticipate all other needed corrections so it doesn't continue to fail. |
| GAT-1 | The gate runs in CI, once per pull request tip, and never in a session. | kept | X |  |
| GAT-2 | The gate runs the module's own suite, its layer's tests if any, and the checks scoped to the module. It never runs another module's suite. | kept | X |  |
| GAT-3 | A change to a provided service reaches its users through the architecture session's requirement notice and each user module's own job. | kept | O |  |
| GAT-4 | The gate regenerates every listed artifact and verifies only those the regeneration changed. | kept | C |  |
| GAT-5 | The gate installs every lock file the product has, where it sits, and runs the product's Node version. | kept | C |  |
| GAT-6 | The gate is triggered only by changes under the module's paths, tests, check inputs and generated inputs; a green tip behind the tranche only by … | kept | X |  |
| GAT-7 | The full product regression runs only at a release or on your word, as its own workflow with its own time budget. | kept | X |  |
| GAT-8 | The gate runs again on the merged result before the tool merges, and the tool merges only a green, current tip. | kept | C |  |
| INT-1 | Done means merged: a job by its PR into the tranche branch, a tranche by one PR into main; main never moves while a tranche runs. | kept | O |  |
| INT-2 | BOB decides per merge, from listed reasons and cost, whether a fresh reviewer runs; the reviewer never saw the job and reports gaps against … | kept | C |  |
| INT-3 | Review findings feed back to the job as diagnosis; review is never the merge gate. Branch protection plus your approval is the last word. | kept | rep |  |
| INT-4 | A layer closes when every PR is merged and the checks pass once over the product; the next layer starts at once. | modified (suggested keep); re-dated 3 Nov | C | [written in by the coordinator] Bob's word, walk-through question 3, 1 Nov ("Yes, as recommended"), with his ARC-4 note: a layer closes when every PR is merged and the layer's checks pass; whole-product checks run before a release or when Bob asks; the next layer starts at once. Recorded by the coordinator, 3 Nov, walk-through question 36. |
| INT-5 | Nothing in a merge or close depends on archiving a session; retirement of a job is a record line. | kept | X |  |
| INT-7 | A review reports everything it finds in one pass, every gap with file and line, so a job never fails review repeatedly for things visible the first … | kept | X |  |
| INT-6 | A mandated test-first red step inside the agent's loop. | dropped | D |  |
| SES-1 | Roles: ROOT as a depth-0 starter that does nothing else; one architecture session (BOB) per product; jobs; workers. | modified | S | [copy of the suggestion] Suggest: ROOT's creation of sessions moves to a scheduled task that creates a fresh session on each firing where possible; ROOT as a session only … |
| SES-2 | The civicos two-phase handover: ROOT creates the new BOB and repoints the address; the new BOB sets up, reads its handoff, reports running and drains … | kept | S |  |
| SES-3 | A refresh handoff is written by the tool from git, never by hand, at most one screen, a pointer set not a narrative. | kept | R |  |
| SES-4 | The refresh threshold is read from get_session by status and printed as REFRESH when passed; the rule is text, not a hook. | kept | M |  |
| SES-5 | Each role's reading set is fixed in advance and printed with sizes at its start. | kept | R |  |
| SES-6 | Budgets are fractions of the model's context window, named in one table, never bytes fixed in code; an overrun is measured and reported, never … | kept | X |  |
| SES-7 | A summary for a task is an option BOB may take, written by workers citing sources, never required by the tool. | kept | X |  |
| SES-8 | Models and effort come from one table, picked by the start command; always a model and effort sufficient for quality. | modified (suggested keep) | S | [owner's own words] Models, effort, and permissions mode come from one table, picked by the start command; always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand. |
| SES-9 | A session's usage is read by an allowed route; where none exists it is named unmeasured, never estimated. | kept | M |  |
| SES-10 | Workers run in the background, read exactly what their brief names, and return machine-readable receipts rather than narration. | kept | R |  |
| SES-11 | The process measures its own overhead per tranche: commits by purpose, sessions per job, gate runs per merged job, restarts, tokens by role. | kept | M |  |
| SES-12 | Two health metrics from day one: the false-done rate caught by independent re-verification, and cost per PR that survives a revert window. | kept | M |  |
| SES-13 | A session that outlives its parent is ordinary and costs nothing idle; no step counts on a parent being alive. | kept | S |  |
| SES-14 | Design-area lanes (UX, AI, DB, performance) as long-lived sessions with their own refresh lifecycle. | modified | S | [suggestion plus owner words] Suggest: a lane is a knowledge directory and design responsibility plus an on-demand worker BOB starts with that directory as its reading set; a long-lived lane only where measured worthwhile. The lifecycle of a lane includes refreshes that BOB manages to keep the session depth consistant. |
| SES-15 | BOB is the hub: every request and answer passes through it and it translates both ways. | modified; re-dated 3 Nov | S | [written in by the coordinator] Bob's word, settled 1 Nov (Foundations, open tension 4): BOB routes every request between spokes and translates only where a requester cannot use the answer as given; toward Bob it always explains each decision of his with context, options and a recommendation. Routing share measured after the first layer. Recorded by the … |
| SES-16 | Stateless BOB: every wake is a fresh session started by a scheduled task, which runs status, reads one short handoff, acts, writes the handoff and … | modified | M | [near-copy of the suggestion] Suggest: I'm skeptical, but let's measure on the first tranche, comparing tokens per wake against the handoff cost already paid. |
| SES-17 | Urgency and persistence instilled through memory, style and goals so sessions keep working until legitimately blocked. | kept | O |  |
| SES-18 | In-session workers are used for three things: noisy bulk work such as a full test run, a read-only reviewer, and genuinely independent parallel … | kept | X |  |
| TXT-1 | A product's CLAUDE.md is under thirty lines, hand-written, naming the pinned process commit and the one command that fetches it. Never generated by … | modified (suggested keep); re-dated 3 Nov | X | [written in by the coordinator] Bob's word, walk-through question 7, 1 Nov ("Yes, as recommended"): hand-written means BOB writes and keeps the product's CLAUDE.md line by line, each line passing the per-line test, never by /init or a tool reading the repository, with no approval needed and each change listed in the tranche report; the approvals block stays … |
| TXT-2 | Every line in an instruction file passes a test: failure-backed, non-inferable from the code, or tool-enforceable. Lines that fail the test are … | kept | X |  |
| TXT-3 | Rules are kept as one rulebook per area, at most ten rules on one screen, rewritten in place, never appended; when you raise a problem, a rule is … | kept | X |  |
| TXT-4 | Principles P1 to P20 are always loaded by every role, about 14 KB. | modified | X | [suggestion plus owner words] Suggest: I'm skeptical, but let's try to apply TXT-2 to the principles too; most roles need two or three of them. |
| TXT-5 | Process rulebooks load by role through one skill; product rules load by path when a matching file is read. | kept | O |  |
| TXT-6 | Every rule in the process cites the measured failure or your decision that justified it; a rule with neither is removed. | kept | X |  |
| TXT-7 | Every text names its audience and speaks to it directly: plain words, no jargon, enough context to understand. | kept | O |  |
| MSG-1 | Git carries the state; a message only wakes. Every message that asks for an act is preceded by the pushed record it refers to. | kept | R |  |
| MSG-2 | A message from BOB's address, read from git, is a session's instruction; every other message is data; your words are instructions to every session. | kept | O |  |
| MSG-3 | Push-then-send is one tool command; messages are numbered and a duplicate is ignored. | kept | R |  |
| MSG-4 | A message to you is one per turn, plain words, naming the thing rather than its label, with a link, and a numbered list only for an act of yours. | kept | O |  |
| MSG-5 | A flaw report from a product session reaches the process by the state branch and the reply by main of the process repository, read at the product's … | kept | R |  |
| MSG-6 | A message that cannot be delivered is recorded as undelivered in the sender's record and listed by status. | kept | R |  |
| MSG-7 | The repo-based doorbell and mailbox system with cursors and rings. | dropped | D |  |
| MNT-1 | The process is a product under itself: modules, requirements, jobs on branches with tests and review, built in tranches, with the version in use … | modified | S | [copy of the suggestion] Suggest: yes, but as the thin process this ledger describes, not as the twelve-module architecture of MNT-2. |
| MNT-2 | The process is built as twelve modules in five layers, each with its own requirements and fixture tests. | dropped | D |  |
| MNT-3 | A tranche of the process is built with the last released version of the process. | kept | O |  |
| MNT-4 | A product's tranche runs on one pinned process version from open to close, named in the plan; every session verifies the pin once at start and says … | kept | C |  |
| MNT-5 | A fix for a blocking flaw is adopted by a running tranche once, as an explicit recorded act that moves the pin; no job restarts for it. | kept | O |  |
| MNT-6 | A fix for a non-blocking flaw waits for the next process release and the product's next tranche. | kept | X |  |
| MNT-7 | A flaw report is filed from any session by one command, listed at each status, answered by main; a flaw found anywhere is never fixed in place. | kept | R |  |
| MNT-8 | Certification is a full shadow tranche on a copy of a real product at the measured sizes, every layer through release, before a version governs … | modified | C | [suggestion plus owner words] Certification is a long-term goal that indicates that it's ready for general use. Suggest: one shadow of a representative slice, then the live first tranche is the certification with SES-11 and SES-12 measured; a full 128-module shadow per release is itself a token sink. |
| MNT-9 | Flaws found during a shadow run are fixed before release and the run repeated from the step that found them. | kept | C |  |
| MNT-10 | Each release names the platform rows and product sizes it was certified against, so a larger product is told at onboarding. | kept | R |  |
| MNT-11 | On each model release, remove one process component at a time and see what breaks; retire components the platform has absorbed. | kept | X |  |
| MNT-12 | A process is declared in force the day it is written, certified on a two-module toy. | dropped | D |  |
| SHM-1 | A product receives: the short CLAUDE.md, one skill, a settings file carrying the standing permission list, the gate workflow with install and trigger … | kept | C |  |
| SHM-2 | Shims are regenerated on GitHub's runner with the owner's token and merged by PR; a session never attaches a second repository to do it. | kept | O |  |
| SHM-3 | Onboarding writes the build state's skeleton, the grant list and the first plan, and measures the product against the certified sizes, reporting each … | kept | M |  |
| SHM-4 | A product with a tranche running at conversion carries it by one command; stale local tracking refs are removed first. | kept | O |  |
| SHM-5 | A product's own session setup (toolchain, installs) is the product's script, run by the session's first command on the product's instruction, not by … | kept | O |  |
| P1 | Purpose: the process exists to put correct, working product behaviour that meets every defined requirement onto main. Nothing else is output; a rule, … | modified | X | [suggestion plus owner words] Keep as Process3's purpose, with my 3 Nov words added: quickly and cheaply, behaviour that survives, my time only where it is mine. |
| P2 | The process and the product are separate. The process lives in its own repository and keeps the product's build state (layers, modules, their order … | modified | R | [near-copy of the suggestion] The build state is what tells BOB what to do. Process3 keeps requirements and layers at the product's own paths, so one subtree becomes the paths the … |
| P3 | The process is correct before it is used: a meaningful flaw stops all product work until the process is fixed, and the process is never patched in … | modified | X | [near-copy of the suggestion] Development under Process3 is development of that product, not of Process3. A serious enough flaw pauses the product, Process3 is fixed separately, … |
| P4 | Architecture: BOB, with Bob, defines layers and modules in one total order; each module is in one layer; a module uses only earlier modules; declared … | kept | C |  |
| P5 | Requirements: BOB, with Bob, writes each module's requirements: the services it provides, the services it uses by module, its invariants, and the … | kept | O |  |
| P6 | A module fits in one reading: one session can read, in full, its code, its requirements and the requirements of the services it uses. | kept | O |  |
| P7 | Only module jobs change module code, and every requirement is tested at the interface and proven met; an ambiguity is removed by rewriting the … | modified | C | [copy of the suggestion] Keep no requirement goes untested, which was lost (JOB-12 only checks that tests are not inert). Keep the mechanical pass, shorter: it is the … |
| P8 | The unit of work is the module job: at most one job per module at a time; a job applies every plan entry for its module and deals with what it finds … | kept | O |  |
| P9 | A flaw or improvement in another module goes to BOB as a report in that module's terms. BOB confirms it, then sends it to that module's running job, … | kept | R |  |
| P10 | A tranche runs one layer at a time, lowest first, and all the module jobs of a layer run concurrently. Nothing found in a tranche waits for the next: … | modified | O | [copy of the suggestion] Keep concurrency, which was lost and is why Phase 2 planned only two jobs, and keep nothing waits. Drop jobs stay active until all are complete: … |
| P11 | Tests follow the architecture: each module has its own tests, each layer may have small layer tests run at its completion, and the full regression … | kept | C |  |
| P12 | Done means merged. A tranche works on its own branch off main; main never changes while it runs; the close merges main into the tranche (never a … | kept | O |  |
| P13 | Sessions are kept short: state lives in the build state, never in a long context; a session's cost grows with its context times its turns; BOB … | modified | O | [copy of the suggestion] Keep the cost reason and the rule; the threshold stays in the start table (SES-4, SES-6) rather than a fixed 40%. |
| P16 | Rules derive from principles: every rule names the principle it serves; no rule is added in reaction to an incident unless it derives from a … | dropped | D |  |
| P17 | Bob defines the project (values, policies, mission, audiences, use cases, requirements, principles, high-level architecture, UX, doctrine); BOB does … | modified | O | [copy of the suggestion] Keep it whole after onboarding; no Ledger line holds it today. Your word, 3 Nov: during onboarding the platform forces a few GitHub steps of yours; … |
| P18 | The process is a pipeline: while a tranche runs, BOB prepares what the next round or tranche needs (its plan, the next modules' requirements drafted … | kept | O |  |
| P19 | Urgency: BOB never decides the work may take longer than it must. A plan is written from the work that remains and defers an entry only for a … | modified | O | [copy of the suggestion] Keep. PLN-2 holds the plan rule and SES-17 a nudge, but BOB never idles and never stops for Bob were lost. Drop overcome by code where it would mean … |
| P20 | Work from evidence, read in full: a session acts only on what it has read in full or measured, never on memory or a plan's assumption; every claim … | modified | C | [copy of the suggestion] Keep the evidence rule, which the Ledger lost. Process3 already decided that no hook refuses a short read (ENF-4 dropped) and that reads are a matter … |
| P21 | Design and lanes: a question that is Bob's becomes his decision and a design before anything is built. A lane has one area of focus, reads it whole … | modified | O | [near-copy of the suggestion] Keep for questions that are Bob's by P17 only. Lanes stay as SES-14 (modify) and SES-15 settled them. |
| P22 | Release: a release is cut from the open tranche, proven by the full regression, deployed and walked; what a walk finds becomes a round's entries, … | kept | C |  |
| P23 | Repository: it holds only what a session must read or a merge must carry; generated output, captures and finished records leave the working tree; … | kept | C |  |
| GAP-1 | A tranche runs from open to close with no one watching: every stop is a named blocker in the record, BOB starts other work meanwhile, and only a … | modified (suggested keep) | O | [owner's own words] A tranche CAN RUN from open to close with no one watching: every stop is a named blocker in the record, BOB starts other work meanwhile, and only a blocker that only Bob can clear reaches him. |
| GAP-2 | Each job runs in its own checkout; its cost per attempt is an alarm the sweep reads, not a cap. Replaces JOB-11. | kept | M |  |
| GAP-3 | A rule, check, review round, measurement run or owed task exists only against a measured failure or Bob's word; a finding with neither is one line in … | kept | X |  |
| GAP-4 | Status names each role's next acts from git alone (work ready, pull requests to merge, reports to route), so a fresh BOB given only status takes the … | kept | R |  |
| GAP-5 | No role waits on ROOT or a scheduled task for work the record allows: a job's report or a merge wakes BOB at once, and a scheduled wake only catches … | kept | O |  |
| GAP-6 | Bob's standing approvals in each repository's CLAUDE.md on the tranche are the one policy for every act at every depth; the start check confirms each … | kept | C |  |
| GAP-7 | A public release or promotion to installed sites waits for Bob's approval through the protected GitHub environment; development releases are drafts … | kept | C |  |
| GAP-8 | On one plain request the process stops development under one Claude account and writes a tested page of steps to restart it under another; open jobs … | kept | O |  |
| GAP-9 | The Ledger, the Foundations and the Build Plan agree: each Foundations section and Build Plan row cites the Ledger lines it serves, and no build … | kept | C |  |
| GAP-10 | Review findings go to the job as diagnosis and review is never the merge gate; a green gate merges without Bob, who approves a particular merge only … | kept | X |  |
| GAP-11 | A platform behaviour is measured once by default, more only when the first result is ambiguous or a failure recurs, and its row records how many … | kept | X |  |
| GAP-12 | A tranche's report also states BOB's idle time while work was ready and the minutes of Bob's it took. Extends PLN-6. | kept | M |  |

## 2. Inventory A: what the approved canon itself mandates

This is the load present before any drift. Each row is something the canon says must exist, run or be written. "Map" is the status the Ledger map gave on 3 Nov; a dash means the map has no row for it.

### A. Checks on the commit, merge and release path (33)

| # | Check | Line or place | Runs | Map, 3 Nov |
| --- | --- | --- | --- | --- |
| A1 | Module's own test suite | GAT-1, GAT-2 | Every PR tip | Built |
| A2 | Layer tests | GAT-2, P11 | Every PR tip | Built |
| A3 | Module order and declared uses matched against imports | ARC-1, P4 | Every PR tip | Gap |
| A4 | File ownership: a job writes only its module's paths, tests and own marks | ARC-2, REQ-4 | PR tip and merge | Built |
| A5 | Tests assert on text keys, never words; the words check | ARC-3 | Every PR tip | Gap |
| A6 | Requirements format check | ARC-4 note, REQ-1 | Every PR tip | Gap |
| A7 | Coverage: every requirement tested at the interface, "none goes untested" | ARC-4 note, P7 | Every PR tip | Gap |
| A8 | Revert check: new tests must fail with the change reverted | JOB-12 | Every PR tip | Built |
| A9 | Artifact regeneration, verify what changed | GAT-4 | Every PR tip | Gap |
| A10 | No generated artifact committed | JOB-8 | PR | Gap |
| A11 | Record check: file size | REC-10, P23 | Every commit | Built |
| A12 | Record check: reserved transient paths | REC-10 | Every commit | Built |
| A13 | Build-ledger schema check, one mutable field | REC-9 | CI | Built |
| A14 | Approvals block changed only by the owner through GitHub's website | GAP-6; Standing approvals | CI | Built |
| A15 | History checked without file contents; "a failed fetch fails the check" | Gate as two jobs | PR | — |
| A16 | Gate split in two jobs: product code with no token, findings posted by the second | Gate as two jobs | PR | — |
| A17 | Machine-readable finding with module, file and line from every check | ARC-5 | Every check | Built |
| A18 | Gate re-run on the merged result | GAT-8 | Before each merge | Built |
| A19 | Tool merges only a green, current tip; bounded retry; plain merge routes denied | GAT-8, INT-1 | Each merge | Built |
| A20 | Merge not resolved "with an old copy" | What the checks defend against | Each merge | — |
| A21 | Pin moves only onto released process commits | MNT-5; What the checks defend against | Each pin move | Built |
| A22 | Defence against outsiders' fork pull requests | What the checks defend against | PR | — |
| A23 | Layer checks | ARC-4, INT-4 | Layer close | Phase 3 |
| A24 | Whole-product checks | ARC-4 (owner's note) | Before a release, or on request | Phase 3 |
| A25 | Full regression | GAT-7, P11, P22 | Before a release | Phase 3 |
| A26 | Install-from-scratch test | Where the process stops | Release workflow | — |
| A27 | Upgrade-from-previous-release test | Where the process stops | Release workflow | — |
| A28 | Mutation sampling on payment and data paths | JOB-13 | Nightly, after the first tranche | Later |
| A29 | One full CI test run before a mechanical pass merges | P7 | Each pass | Later gate |
| A30 | Shim drift check, including no hook beyond ENF-1's allowance | SHM-1; tension 3 | CI | Phase 3 |
| A31 | Branch protection: PR only, merge commits only, required gate and record checks, no deletion or force-push | Setup; INT-1 | Always | Setup |
| A32 | Deny list: settings files, writes through GitHub's interface, plain merge routes | GAP-6; Setup | Always | Built |
| A33 | Production environment with the owner as required reviewer | GAP-7 | Public release | Phase 3 |

### B. Checks at session start and inside tool commands (26)

| # | Check | Line or place | Runs | Map, 3 Nov |
| --- | --- | --- | --- | --- |
| B1 | Start check: process pin | MNT-4 | Every session start | Built |
| B2 | Start check: HEAD at the tranche tip, by commit | MNT-4 | Every session start | Built |
| B3 | Start check: approvals block equals the tip's | GAP-6, MNT-4 | Every session start | Built |
| B4 | Re-check at each later wake of BOB, ROOT and the watcher; on mismatch the session "acts on nothing" | Versions | Every wake | — |
| B5 | `setup check` of every readable condition; "a missing one stops the start" | Setup | Onboarding and before every job start | Built |
| B6 | Deploy tokens confirmed by name | Deploy tokens | With setup check | — |
| B7 | Grants check; a missing grant stops the tranche opening | PLT-9 | Each tranche open | Built; Phase 3 |
| B8 | Trial of a handful of approved acts at their real depth | Standing approvals | Each tranche open, each model release | — |
| B9 | Every new session checked to have started | Unattended 4 | Each creation | — |
| B10 | Live sessions at 24 or fewer | Platform; Unattended 4 | Each creation | — |
| B11 | At most one job per module; a second start is refused | P8 | Job start | Built |
| B12 | START names only tool commands | JOB-2 | START generator | Built |
| B13 | Fast local checks at completion | JOB-5 | Job complete | Built |
| B14 | Requirements size cap, triggering a split before a job opens | REQ-6 | Before job opens | Phase 3 |
| B15 | Handoff size check | SES-3 | Each handoff | Built |
| B16 | Reading-budget size alarm | SES-6 | Start | Built; nudge |
| B17 | Per-line test on instruction files | TXT-2 | Each line added or removed | Nudge |
| B18 | Ten rules per rulebook | TXT-3 | — | Gap |
| B19 | CLAUDE.md under thirty lines | TXT-1 | — | Gap |
| B20 | Push-then-send in one command, numbered, duplicates ignored | MSG-1, MSG-3 | Each message | Built |
| B21 | Address read from git at the moment of sending | REC-6, MSG-2 | Each message | Built |
| B22 | Remote act recorded only from the tool's result | REC-5 | Each remote act | Built |
| B23 | Pause or stop field read at each status; "takes no new step" | PLN-5 | Each status | Built |
| B24 | Sweep guards: ROOT address (step 0) and pause (step 1) | Sweep prompt | Hourly | Built |
| B25 | Product size measured against certified sizes | SHM-3, MNT-10 | Onboarding | Built; Phase 3 |
| B26 | Refusal counter per session | Permissions | Each refusal | — |

### C. Reviews, audits and trials (17)

| # | Review or audit | Line or place | Map, 3 Nov |
| --- | --- | --- | --- |
| C1 | Fresh reviewer per merge, on listed reasons and cost | INT-2 | Built |
| C2 | Second review run to confirm | INT-7 | Built |
| C3 | Post-merge review that may reopen a module | A job's life, step 9 | — |
| C4 | Sampled reading audit of transcripts, filing flaw reports | REC-8, P20 | Gap |
| C5 | Audit of citations for every rule, check, review round and measurement | TXT-6, GAP-3 (properties table) | Text only |
| C6 | Review of instruction-file lines; CLAUDE.md changes listed in the tranche report | TXT-2, TXT-1 | Nudge |
| C7 | Setup list "reviewed like code" | Setup | — |
| C8 | Next modules' requirements "drafted and reviewed" ahead | P18 | Phase 2 |
| C9 | The process's own jobs "with tests and review" | MNT-1 | Phase 4 |
| C10 | Agreement of Ledger, Foundations and Build Plan; "no build starts on a line any of them contradicts" | GAP-9 | Text (the map) |
| C11 | BOB confirms each cross-module report before routing it | P9 | Gap |
| C12 | Walk of each development deployment, every round | P22 | Phase 2 |
| C13 | Shadow run of a slice, repeated from the step that found a flaw | MNT-8, MNT-9 | Phase 3; Gap |
| C14 | Live first tranche as the certification | MNT-8 | Phase 3 |
| C15 | Component-by-component re-test at each model release and Claude Code version | MNT-11 | Phase 4 |
| C16 | Approval test re-run at each model release | Re-test per model | — |
| C17 | Rehearsal of the account move | GAP-8 | Later gate |

### D. Measurements and metrics (36 rows, 34 distinct)

| # | Measurement | Line or place |
| --- | --- | --- |
| D1 | False-done rate | SES-12 |
| D2 | Cost per pull request surviving a two-week window | SES-12 |
| D3 | Commits by purpose | SES-11 |
| D4 | Sessions per job | SES-11 |
| D5 | Gate runs per merged job | SES-11 |
| D6 | Restarts | SES-11 |
| D7 | Tokens by role | SES-11 |
| D8 | Tranche elapsed time | PLN-6 |
| D9 | Work done, work left, deferrals with reasons | PLN-6 |
| D10 | Tranche cost | PLN-6 |
| D11 | Overhead share of cost | PLN-6 |
| D12 | BOB's idle time while work was ready | GAP-12 |
| D13 | Minutes of the owner's time | GAP-12 |
| D14 | Reading set and its size per attempt | JOB-10, SES-5 |
| D15 | Tokens per attempt | JOB-10 |
| D16 | Session usage, or "unmeasured" | SES-9 |
| D17 | Elapsed time and cost per attempt against the role's median | GAP-2; Unattended 6 |
| D18 | Refusals per session | Permissions |
| D19 | Refusals of approved acts by act, depth and channel, per tranche | Standing approvals |
| D20 | Housekeeping acts "counted and reported" | PLT-2 as restated |
| D21 | Platform table rows: dated, with evidence and number of tries | PLT-1, GAP-11 |
| D22 | Reading-budget overruns "measured and reported" | SES-6 |
| D23 | Context share against the refresh threshold | SES-4 |
| D24 | Live session count | Platform |
| D25 | Scale measurements as plan items | REQ-3 |
| D26 | Stateless BOB: tokens per wake | To measure (SES-16) |
| D27 | JSON ledger: corruption, bypass, edits outside the status field | To measure (REC-9) |
| D28 | Trimmed principles: drift traceable to a missing principle | To measure (TXT-4) |
| D29 | BOB's routing share of its context | To measure (SES-15) |
| D30 | Lanes: tokens per question, quality of answers | To measure (SES-14) |
| D31 | Requirements cap number | To measure (REQ-6) |
| D32 | Home for transient state: growth, conflicts, latency | To measure (REC-1) |
| D33 | Permission mode: denials per role | To measure (SES-8) |
| D34 | Merge refusals by depth and channel (overlaps D19) | To measure (GAP-10) |
| D35 | Mutation score on payment and data modules | To measure (JOB-13) |
| D36 | Model and effort table costs (tokens per merged PR by role and model) | To measure (SES-8) |

### E. Alarms and wake conditions (15)

| # | Alarm | Line or place |
| --- | --- | --- |
| E1 | REFRESH when context passes the role's threshold | SES-4 |
| E2 | REFRESH at 10 refusals in a session | Permissions |
| E3 | Session stopped after three refusals in a row, "which status and the sweep must catch" | Permissions; Unattended 3 |
| E4 | Job WORKING with nothing pushed for over two hours | JOB-9, ENF-6; sweep step 3 |
| E5 | Attempt far over its role's time or cost median | GAP-2; Unattended 6 |
| E6 | Any session blocked | ENF-7; sweep step 3 |
| E7 | Status lists acts for an idle BOB | GAP-4; sweep step 3 |
| E8 | BOB silent for two hours after a sweep woke it: successor started | Sweep step 2 |
| E9 | BOB flagged REFRESH: successor started | Sweep step 2 |
| E10 | ROOT full, or heartbeat older than four hours: watcher takes over | Watcher |
| E11 | Undelivered message listed by status | MSG-6 |
| E12 | Reading set over budget | SES-6 |
| E13 | Pull-request events to BOB: completion, red gate, comment | GAP-5 |
| E14 | Requirements file over the cap | REQ-6 |
| E15 | Process flaw reports listed at each status | MNT-7 |

### F. Records and bookkeeping artefacts (47)

| # | Record | Line or place |
| --- | --- | --- |
| F1 | Keep and Drop Ledger, 159 lines | The canon |
| F2 | Foundations | The canon |
| F3 | Build Plan | How this was decided; GAP-9 |
| F4 | Ledger map | GAP-9 |
| F5 | Walk-through: numbered questions with a column for the owner's word | How problems are handled |
| F6 | Build ledger, JSON, one entry per module or feature | REC-9 |
| F7 | Decision records, one file each | REC-11 |
| F8 | Rulings, until absorbed | REQ-7 |
| F9 | Status output with next acts per role | REC-3, GAP-4 |
| F10 | Handoff, one screen | SES-3 |
| F11 | Transient state files per participant on the state branch | REC-1 |
| F12 | Platform table | PLT-1 |
| F13 | Address files in git (ROOT, BOB) | REC-6 |
| F14 | Heartbeat state file | Scheduled tasks |
| F15 | Owed list | Sweep step 3 |
| F16 | Plan with the process pin | MNT-4 |
| F17 | Pause and resume field in the product's process config | PLN-5 |
| F18 | Layer map: modules in order with their uses | ARC-1, P2 |
| F19 | Module requirements files with permanent ids and not-yet-met marks | REQ-1, REQ-4 |
| F20 | Completion-round file | PLN-4 |
| F21 | START as the pull request body | JOB-1, JOB-2 |
| F22 | Receipt as a pull request comment | JOB-7 |
| F23 | Worker receipts | SES-10 |
| F24 | Cross-module flaw and improvement reports | P9, PLN-3 |
| F25 | Process flaw reports and their answers | MNT-7, MSG-5 |
| F26 | Tranche report | PLN-6, GAP-12 |
| F27 | Per-attempt metrics rows | JOB-10 |
| F28 | Refusal record: act, depth, channel | Standing approvals |
| F29 | Message numbers and the undelivered list | MSG-3, MSG-6 |
| F30 | Setup list | Setup |
| F31 | Developer's steps and the per-product onboarding page | Setup |
| F32 | Grant list | PLT-9, SHM-3 |
| F33 | Rulebook per role | TXT-3, TXT-5 |
| F34 | Start table: model, effort, permission mode, refresh threshold | SES-8, SES-4 |
| F35 | Reading sets per role and the budget table | SES-5, SES-6 |
| F36 | Product CLAUDE.md with its pin line | TXT-1 |
| F37 | Approvals block in each repository's CLAUDE.md | GAP-6 |
| F38 | Settings file with the deny list | SHM-1 |
| F39 | Skill | SHM-1 |
| F40 | Lane directories of design knowledge | SES-14 |
| F41 | Word table of user-facing text | ARC-3 |
| F42 | Release note with platform rows and certified sizes | MNT-10 |
| F43 | Blocked states and retirement lines | ENF-7, INT-5 |
| F44 | Recorded acts: pin move, live-limit change, restated line, missing-instruction decision | MNT-5; Platform; The human and the AI; Standing approvals |
| F45 | Account-move page | GAP-8 |
| F46 | Listed reasons for a review | INT-2 |
| F47 | The process's own ledger, requirements and tranches | MNT-1 |

### G. Roles (11)

| # | Role | Line or place |
| --- | --- | --- |
| G1 | Owner, as product manager and engineer | What this process is for; P17 |
| G2 | Coordinator, at the top of the depth chain | PLT-5 as restated |
| G3 | ROOT | SES-1 |
| G4 | Watcher, a standing session | Scheduled tasks |
| G5 | BOB, one per product | SES-1 |
| G6 | Job | JOB-1 |
| G7 | Lane, with the UX lane always present | SES-14 |
| G8 | In-session worker | SES-10, SES-18 |
| G9 | Fresh reviewer | INT-2 |
| G10 | Walkers | P22; Two kinds of release |
| G11 | The process's own architecture session | MNT-7, MSG-5 (page explanations) |

### H. Scheduled tasks and recurring workflows (10)

| # | Task or workflow | Fires | Line or place |
| --- | --- | --- | --- |
| H1 | Sweep | Hourly | Scheduled tasks |
| H2 | Watcher | Daily | Scheduled tasks |
| H3 | Prune workflow | Scheduled | REC-10 |
| H4 | Mutation workflow | Nightly | JOB-13 |
| H5 | Nightly fixture tier | Nightly | Coverage |
| H6 | Gate workflow | Every PR tip | GAT-1 |
| H7 | Layer-check workflow | Layer close | ARC-4, INT-4 |
| H8 | Release workflow | Each release, development releases every round | Where the process stops; P22 |
| H9 | Privileged workflow on GitHub's runner | On demand | PLT-8 |
| H10 | Shim regeneration workflow | Each process change to the shims | SHM-2 |

### Totals and what they show

| Category | Count |
| --- | --- |
| A. Commit, merge and release checks | 33 |
| B. Session-start and tool-command checks | 26 |
| C. Reviews, audits and trials | 17 |
| D. Measurements and metrics | 36 |
| E. Alarms and wake conditions | 15 |
| F. Records and bookkeeping artefacts | 47 |
| G. Roles | 11 |
| H. Scheduled tasks and recurring workflows | 10 |
| Total | 195 |

Four observations follow from the inventory.

1. **A process described as thin mandates about 195 things.** Of these, 76 are checks, reviews or audits (A, B and C), and about 40 can refuse, fail or stop something. The canon's self-description is "Rules are few".
2. **Most of it was not built when the run began.** The map marks 51 of its 151 rows as simply "Built". Seventeen are "Gap", 21 carry a Phase 2 row, 39 a Phase 3 row, 3 a Phase 4 row and 8 a later gate. Of the 33 merge-path checks, 6 were marked Gap and 7 more were set for a later phase. A session told never to idle therefore always had canon-mandated process work it could do.
3. **The canon names a missing check a "Gap".** The map's gap list is dominated by checks that do not yet exist (ARC-1, ARC-3, ARC-4, JOB-8, GAT-4, P7, REC-8, P20). The canon itself defines an unbuilt check as a debt, with a phase in which to pay it. No measured failure is cited for paying it; the line's existence is the justification.
4. **Fail-closed behaviour is in the canon's own text.** "It acts on nothing, reports both SHAs and ends." "A missing one stops the start." "A failed fetch fails the check." "No build starts on a line any of them contradicts." The refusals that later multiplied had approved precedents in exactly this form.

## 3. Inventory B: the restraints, and what holds each one

I count 47 lines or sentences that restrain adding checks, rules, records or caution. They fall into two groups. Twenty-two restrain growth in general. Twenty-five restrain one specific check or one specific way of enforcing.

"Held by" uses the Ledger map's 3 Nov wording where it has a row. "Terms" records whether the restraint says anything about size, cost, removal, or doing nothing.

### General restraints (22)

| # | Restraint | Source | Held by | Terms |
| --- | --- | --- | --- | --- |
| G1 | "Nothing else is output: a rule, a record, a check or a test has value only as far as it serves that, and one that does not is wrong." | P1; What this process is for | Text ("Rule 1; the health metrics") | Cost: "quickly and cheaply", no number. Removal: "is wrong", with no act attached. |
| G2 | "caution is a cost, paid only against a measured failure or your word" | How problems are handled | Text | Cost is named and never priced. |
| G3 | "a reviewer's 'what if' is not a problem, and is one line in a report" | How problems are handled; GAP-3 | Text | Do nothing: yes, for a what-if only. |
| G4 | "The default answer to a finding with nothing measured behind it is no change" | How problems are handled | Text | Do nothing: yes, only when nothing was measured. |
| G5 | "A rule, check, review round, measurement run or owed task exists only against a measured failure or Bob's word" | GAP-3 | "Rule 2", built as text. The properties table names an "Audit of citations"; no build exists for it | No size, no cost. A test of justification only. |
| G6 | "Every rule in the process cites the measured failure or your decision that justified it; a rule with neither is removed." | TXT-6 | "Rule 2; this map", built as text | Removal in words. The page's own objection: "Requires someone to audit the citations." |
| G7 | BOB "corrects the design by rewriting the line it belongs to, never by appending" | How problems are handled | Text | Bounds lines of canon. Silent on code. |
| G8 | "at most ten rules on one screen, rewritten in place and never appended" | TXT-3 | Gap: no rulebooks written | Size: ten rules, one screen, for rulebook text only. |
| G9 | Every instruction-file line is "failure-backed, non-inferable from the code, or tool-enforced, and lines are deleted on review" | TXT-2 | Nudge ("Review at each gate") | Removal in words. The page's own objection: "Periodic review is work that is easy to skip." |
| G10 | "The product's CLAUDE.md is under thirty lines" | TXT-1 | Gap | Size: thirty lines, one file. |
| G11 | The principles are "trimmed by the same per-line test so that most roles load only the two or three that govern their stage" | TXT-4 | Phase 3; to measure | Size: an aim, no number. |
| G12 | "Only words you mark as a decision become rulings ... there is no ruling log" | REQ-7 | "Template file", later gate | Removal: a ruling is deleted once absorbed. The page's own objection: "easy to defer". |
| G13 | "Rules are few, each cites a failure, and each names the tool that enforces it or is labelled a nudge." | The shape in one paragraph | Text | Size: "few", no number. |
| G14 | "When in doubt, run the product and let it show what matters." | How problems are handled | Text | None. |
| G15 | "A reviewer's finding that needs a deliberate attack is a known limit, not code, so the tool does not grow without end." | Setup: what the checks defend against | Text | The only sentence about the tool's growth. No number. Excludes only findings that need a deliberate attack. |
| G16 | A platform behaviour is "measured once by default" | GAP-11 | "Rule 3", built as text | Size: once, unless "ambiguous or a failure recurs". |
| G17 | "components are removed one at a time and the result observed; what the model no longer needs is retired" | MNT-11 | Phase 4, not built | The canon's only removal procedure. It fires only at a model or Claude Code release. |
| G18 | "Development under the process is development of the product, not of the process"; "a non-blocking flaw waits for the next release" | P3, MNT-6 | "Rule 6", built as text; pin by pull request | Do nothing: yes, for a non-blocking flaw. "Blocking" is undefined, and "during Process3's own first build, changes are expected". |
| G19 | A flaw is "never fixed in place" | MNT-7 | Later gate | Routes fixes. Does not limit them. |
| G20 | "governed by this thin process, not by a twelve-module architecture of its own" | MNT-1, MNT-2 dropped | Phase 4 | Size: "thin", no number. |
| G21 | "Nothing here is in force until it has run on a real tranche with the two health metrics measured." | How this was decided; MNT-8 | Text | None. The live first tranche was itself the certification. |
| G22 | Overhead share, BOB's idle time, and the two health metrics as "the standing judge of every other line" | SES-11, SES-12, PLN-6, GAP-12 | Metrics built; overhead share in Phase 2 and 3 with "no target (Bob, 3 Nov)"; survival "read 16 Nov" | Cost is measured. No threshold, no consequence, and the report comes at tranche close. |

### Specific restraints (25)

| # | Restraint | Source | Held by | Terms |
| --- | --- | --- | --- | --- |
| S1 | "At most a handful of command hooks, each for a rule with zero exceptions" | ENF-1 | No hooks today; drift check in Phase 3 | Size: "a handful", hooks only. |
| S2 | "No model judge sits between a session and you" | ENF-2 | The design | — |
| S3 | "Nothing holds a turn, and stop means stop in that turn"; no Stop hooks | ENF-3; ENF-5 dropped | The design | — |
| S4 | No hook refuses a partial read | ENF-4 dropped | By absence; replaced by an audit (C4) | — |
| S5 | "There is no /goal" | ENF-6 | Status and the sweep; replaced by an alarm (E4) | — |
| S6 | The gate runs "once per pull request tip, never in a session" | GAT-1 | Gate workflow, built | Size: once per tip. |
| S7 | The gate "never" runs "another module's suite" | GAT-2 | Gate, built | — |
| S8 | The gate runs only when the module's own paths change; "Record writes never cost a job a gate run" | GAT-6, REC-4 | Gate workflow, built | — |
| S9 | Whole-product checks and the full regression run only "before a release, or when you ask" | ARC-4 note, GAT-7 | Phase 3 | — |
| S10 | At completion a job "runs only the checks that take seconds" | JOB-5 | Job complete, built | — |
| S11 | A job "is never restarted for a process reason" | JOB-4 | Nudge; built | — |
| S12 | BOB decides "from listed reasons and the known cost, whether a fresh reviewer runs" | INT-2 | Merge with or without review, built | Cost: about 148K tokens a review, as an input to BOB's judgment. |
| S13 | "one complete pass" and a second run that "only confirms" | INT-7 | Review brief; review-round limit in merge, built | Size: two runs. |
| S14 | "After two failed corrections, the session is replaced rather than corrected a third time" | JOB-14 | Built; nudge | Size: two corrections. |
| S15 | "Review is never the merge decision"; the tool merges without the owner by default | GAP-10 | Merge, built | — |
| S16 | "A mandated red step inside the agent's loop is dropped" | INT-6 dropped | By absence | — |
| S17 | "Nothing is ever refused for size"; an overrun "is measured and reported, never refused" | REQ-6, SES-6 | Phase 3; built and nudge | Bans refusal for one reason, size. |
| S18 | A summary is "an option BOB may take ... never a requirement" | SES-7 | The design | — |
| S19 | "A scale figure is a measurement in the plan, never a test line"; a review never counts an untaken measurement as a gap | REQ-3 | Nudge | — |
| S20 | Cost per attempt is "an alarm, not a cap"; "There are no turn or budget caps" | GAP-2 | Sweep row, Phase 2 | Cost measured; a cap is ruled out. |
| S21 | The pin is verified "once at start"; the page adds "No check at every command" | MNT-4 | Start check, built | Size: once. Already widened in the Foundations to every wake (B4) and joined by a setup check before every job start (B5). |
| S22 | "A scheduled task is never required for correctness" | PLT-6 | The design | — |
| S23 | Workers are used for three things, "Not for a smarter answer" | SES-18 | Nudge | Size: three uses. |
| S24 | One act per command "is a nudge"; "a hook comes back only if that count calls for one" | One act per command | Text | A conditional licence as much as a restraint. |
| S25 | The repository "holds only what a session must read or a merge must carry" | P23, REC-10 | Record check, built | Size: a file-size limit, enforced by adding a check (A11, A12). |

### What the two tables show

**The specific restraints were built; the general ones were written.** Of the 25 specific restraints, 19 are held by code or by a thing left out of the design. Of the 22 general restraints, none is held by anything but text. The map's status "Built (text)" appears on seven lines in all: P1, P3, MNT-6, TXT-6, GAP-3, GAP-9 and GAP-11. Six of the seven are general restraints. By the Foundations' own definition ("A property held only by text is a nudge and is marked so") the whole general brake is a nudge, and it is not marked so. The properties table instead lists GAP-3 as held by an "Audit of citations" that has no build, no owner and no schedule.

**The terms that exist bound the wrong things.**

| Term | Restraints that have one | What is bounded | What is not bounded |
| --- | --- | --- | --- |
| Size | G8, G10, G16, S1, S6, S13, S14, S21, S23, S25 | Rules in a rulebook, lines in one file, measurement tries, hooks, gate runs per tip, review runs, corrections, pin checks, worker uses, file size | Number of checks, size of the tool, points of refusal, process changes per run, pin moves per run, share of effort spent on the process |
| Cost | G1, G2, G22, S12, S20 | One review's price as an input (S12) | Nothing. No restraint sets a limit or asks for the cost of a proposed fix |
| Removal | G1, G6, G9, G12, G17 | Rulings and instruction lines, in words | No removal has an owner, a trigger inside a run, or a tool. MNT-11 fires only at a model release |
| Doing nothing | G3, G4, G5, G18 | Findings with nothing measured behind them; non-blocking flaws | A measured failure. No line allows "no change", or "remove the thing that failed", as the answer to a failure that happened |

**The vector was banned, not the behaviour.** The specific restraints forbid hooks, Stop hooks, model judges, an in-session gate, and refusal for size. They do not forbid refusing, stopping or verifying as such. The canon then assigns holder after holder to "the tool" (16 mentions in the Foundations), to "status" (28) and to the sweep (18), none of which has a size limit. A session that wanted to enforce something had every banned route closed and one unbounded route open.

**Where a session would meet the general restraints (inference).** The canon is designed so that sessions load little: a fresh session "starts from status alone", the handoff is "a pointer set, one screen", each role "loads only its rules", and most roles "load only the two or three" principles for their stage. Status prints "each role's next acts". The general restraints live in one paragraph of a 9,800-word Foundations, on the Ledger page, and as "Rule 1", "Rule 2", "Rule 3" and "Rule 6" of a rule text I have not seen. The per-role rulebooks that TXT-3 and TXT-5 require were unwritten on 3 Nov. At the moment a session decides to add a check, the canon puts three things in front of it: the failure, in machine-readable form with file and line (ARC-5); the next acts (GAP-4); and the instruction to build the correction. Nothing puts the restraint there. The page's own note on JOB-9 says why that matters: "It is a nudge, and the research shows restraint rules are weakly followed."

## 4. Licences

### 4.1 Sentences that authorise a session to decide, change or build

| # | Sentence | Source | What it licenses |
| --- | --- | --- | --- |
| L1 | "BOB does everything else: it keeps the record, manages the development environment, makes the most of what the AI can do, takes your input, decides everything technical and detailed, and reports it to you in plain words as done" | The human and the AI; P17 | Every technical decision, reported after the fact |
| L2 | "When BOB is unsure whether a question is yours, it decides by this section and says how it read it." | The human and the AI; P17 | BOB rules on the boundary of its own authority |
| L3 | "when a mechanism cannot be built or a better one is measured, BOB restates the line with its purpose unchanged, records why and where, and reports it in one line; only a change to what a line asks for comes to you (your word, 4 Nov, after TXT-5 was brought to you though it was BOB's)" | The human and the AI | BOB rewrites the canon's mechanisms. The owner had objected to being asked |
| L4 | "Every problem is an architecture bug: BOB finds why, corrects the design by rewriting the line it belongs to, never by appending, and builds the correction; a workaround for the moment is not a fix." | How problems are handled | A design change and a build for every problem; the cheap response is ruled out |
| L5 | "you decide only the layers and modules that carry product capability, and the rest is BOB's" | Requirements | The rest of the architecture |
| L6 | "A change to what a provided service means goes to you only by the DES 1 test; every other change is BOB's, recorded once." | REQ-5 | Requirement changes |
| L7 | "A process flaw that blocks the job holds it at its next command; the fix lands, BOB moves the pin, and the same job continues" | A job's life; JOB-4, MNT-5 | Changing the process under a running job |
| L8 | "A blocking flaw is fixed and adopted by one recorded act that moves the pin, and no job restarts" | Versions; MNT-5 | Mid-tranche adoption of a process change, as often as a flaw is called blocking |
| L9 | "during Process3's own first build, changes are expected" | Versions; P3 | Exempts the whole first run from P3 |
| L10 | "The process repository has its own ledger, requirements, jobs on branches with tests and review, and tranches." | MNT-1 | A standing development line for the process itself |
| L11 | "A flaw report is one command from any session" | MNT-7 | Any session may open process work. The page's own objection: "Report volume can flood the process's architecture session." |
| L12 | "Flaws found in the shadow are fixed before release and the run repeats from the step that found them" | MNT-9 | A fix-and-repeat loop. The page's own objection: "Can loop if flaws keep appearing; needs a stop rule." |
| L13 | "no session ends a turn while work it can do remains"; "BOB never idles while work remains and never ends a turn waiting on you while anything can be done" | Properties table; A job's life; P19, SES-17 | Acting is the required state; not acting is the fault |
| L14 | "while a tranche runs it prepares the next round or tranche" | A job's life; P18 | Further standing work |
| L15 | "Your broad standing approvals are the one policy for every act at every depth"; "Your approvals cover every act of the process (your word, 2 Nov)." | Standing approvals | Blanket consent for process acts |
| L16 | "It changes without your approval: each added or removed line passes the per-line test and is listed in the tranche report" | Instruction files; TXT-1 | Editing the always-loaded instruction file |
| L17 | "BOB may raise or lower that number from what it measures, and records each change (your word, 1 Nov)." | Platform | Tuning a limit from its own measurement |
| L18 | "BOB may start a new session whose START names the act and why ... recorded as a decision" | Standing approvals | Rerouting an act a session declined |
| L19 | "a hook comes back only if that count calls for one"; "the environment comes back only if refusal counts call for it" | One act per command; Standing approvals | Adding enforcement when BOB's own count says so |
| L20 | "a word you give in chat is written there by BOB" | How problems are handled | A session converts the owner's chat into the record. Six Ledger notes are in this form ("written here by the coordinator") |
| L21 | "by default a job, layer or tranche merges on a green gate without you" | The human and the AI; GAP-10 | Merging, including the process's own changes |
| L22 | "Whether a given lane runs as a long-lived session or as a worker started with its directory is BOB's call, judged by cost" | Lanes; SES-14 | Choosing the session structure |
| L23 | "When a problem arises, the relevant rule is rewritten so the problem cannot recur" | TXT-3, page explanation | Sets prevention of recurrence as the standard for a fix |
| L24 | "the watcher's own session takes over as ROOT" | Scheduled tasks | Self-repair of the session tree |

### 4.2 Sentences that tell a session to stop, hold, fail closed, verify or record

| # | Sentence | Source |
| --- | --- | --- |
| V1 | "A session acts only on what it has read in full or measured, never on memory or a plan's assumption; every claim names its source; anything unread or unmeasured is unknown; a cause is named, and a fix written, only once evidence shows it." (the only full sentence the document sets in bold) | Reading; P20 |
| V2 | "Nothing the model says is evidence: a job's claim is a receipt, the gate is CI, the revert check proves tests are real, and branch protection is the last word" | The shape in one paragraph |
| V3 | "its first command then verifies the pin, HEAD and the approvals block against the tip; if not, it acts on nothing, reports both SHAs and ends" | Versions; MNT-4 |
| V4 | "`setup check` reads every condition it can, at onboarding and before every job start; a missing one stops the start" | Setup |
| V5 | "Every account, setting and branch rule the process depends on is part of the design: listed, checked before each job starts, and set by the developer through the fewest steps, each with its reason and tested to work the first time (your word, 2 Nov)." | Setup |
| V6 | "a missing grant stops a tranche from opening" | PLT-9 |
| V7 | "A CI check fails any commit that adds a file over a set size or writes under a path reserved for transients" | Size discipline; REC-10 |
| V8 | "a check fails any change to the approvals block not made by you through GitHub's website" | Standing approvals |
| V9 | "It checks out history without file contents, and a failed fetch fails the check" | The gate runs as two jobs |
| V10 | "no build starts on a line any of them contradicts" | How this was decided; GAP-9 |
| V11 | "If it cannot proceed, it sets the blocked state in the ledger and ends the turn with everything pushed" | A job's life; ENF-7 |
| V12 | "An act the judge refused is never reworded or rerouted to another session; it is recorded and raised." "if that session also declines, or the judge refuses, it stops and comes to you" | Standing approvals |
| V13 | "After three refusals in a row a session stops and waits for a person (measured 1 Nov), which status and the sweep must catch." | Permissions |
| V14 | "the tool counts each session's refusals and status prints REFRESH at 10" | Permissions |
| V15 | "Every refusal of an approved act is recorded with the act, the session's depth and the channel the approval reached it by, counted per tranche, tried with a handful of approved acts at the depths they run at, at each tranche's open before any job starts, and re-tested at each model release." | Standing approvals |
| V16 | "The live count stays at 24 or fewer, and every new session is checked to have started." | Running unattended, 4 |
| V17 | "The gate runs on every pull request, and records reach a protected branch only through a pull request." | Running unattended, 5 |
| V18 | "The sweep catches lack of progress, not only silence" | Running unattended, 6 |
| V19 | "A remote act is recorded only from the tool's result" | The record; REC-5 |
| V20 | "The tool brings the branch up to the tranche, runs the gate on the merged result, and merges a green, current tip"; "Jobs never merge: the plain merge routes are denied to every session." | A job's life, step 9 |
| V21 | "If the ROOT address in git is not this session, end the turn and do nothing else." "Create nothing else, merge nothing, edit no task, archive nothing." | Sweep prompt |
| V22 | "every session reads it at its next status and takes no new step" | A job's life; PLN-5 |
| V23 | "every requirement is tested at the module's interface and proven met; none goes untested (P7). Module and layer test coverage should be more complete than the earlier processes produced and maintained." | Coverage |
| V24 | The reviewer "reports every gap in one complete pass with file and line" | Review; INT-7 |
| V25 | "Nothing depends on an unlisted row" | The record; PLT-1 |
| V26 | "A sampled audit, a later gate, judges whether a session read whole by what it can cite from the end of a document, and files a flaw report when it cannot." | Reading; REC-8 |
| V27 | "The tool's checks hold against mistakes (a session that edits a settings file, touches another module, resolves a merge with an old copy, merges something red or stale, or moves the pin somewhere unreleased) and against outsiders' fork pull requests." | Setup: what the checks defend against |
| V28 | "Work is never lost or left waiting ... everything is pushed before any turn ends" | Properties table |
| V29 | "The record exposes a violated nudge at the next status." | Properties |
| V30 | "Each names what holds it." | Properties |
| V31 | "Speed never comes from weakening a safeguard." | P19, Ledger statement; kept as modified, and not carried into the Foundations text |

The Foundations uses "never" 50 times, "every" 60 times and "nothing" 32 times. It uses "no change" once.

### 4.3 Where the licences pull against the restraints

| # | Restraint | Pulling against it | Why the second wins in a run |
| --- | --- | --- | --- |
| T1 | "The default answer to a finding with nothing measured behind it is no change" | "Every problem is an architecture bug: BOB finds why, corrects the design ... and builds the correction" | The two sit in one paragraph and are reconciled only by the word "measured". A failed gate, a refusal, a stalled session and a wrong pin are all measured. Once the process is running, almost every finding has something measured behind it, so the default almost never applies. |
| T2 | "caution is a cost" | V1, in bold: "anything unread or unmeasured is unknown"; V2: "Nothing the model says is evidence" | The most emphatic sentence in the document mandates caution. Its cost is never set against it. |
| T3 | "a non-blocking flaw waits for the next release" (MNT-6) | "a workaround for the moment is not a fix" (L4); "no session ends a turn while work it can do remains" (L13) | Waiting is a workaround and is idleness. "Blocking" has no definition. The page's own objection to MNT-6: "Judging blocking versus not is a judgment." |
| T4 | "Development under the process is development of the product, not of the process" (P3) | L7, L8, L9, L10, and "the live first tranche as the certification" (MNT-8) | The first product run was by design the process's test bench. The page's own objection to MNT-8: "Certifying on the live product means the product absorbs process failures." |
| T5 | "only against a measured failure or your word" (GAP-3) | L20: BOB writes the owner's chat words into the record | The Foundations carries 32 citations of the owner's word, direction, note or chosen option. One of them, "tested to work the first time (your word, 2 Nov)", is the stated basis for a check before every job start (V4, V5). An owner's remark about a failure becomes a standing mechanism, and the session chooses which. |
| T6 | "Rules are few" (G13); "thin process" (G20) | "Each names what holds it" (V30); the map's "Gap" status | A property without a holder is a defect by the canon's own grammar. The canon states twelve properties in absolutes and 151 live lines. Each needs a holder, and each observed violation is a hole in one. |
| T7 | "your time spent only where it is yours" (P1) | L3: "only a change to what a line asks for comes to you" | Protecting the owner's time removed the owner from every decision about mechanism. Which checks exist is a mechanism. |
| T8 | "caution is a cost" | "Speed never comes from weakening a safeguard" (V31) | Once a check exists, removing it for speed is forbidden by an approved line. Additions are licensed by any failure; removals are barred. |
| T9 | "a reviewer's 'what if' is not a problem" (G3) | "reports every gap in one complete pass" (V24); "Findings return to the job as diagnosis" | The reviewer is told to find everything and the job is told to fix the list. Sorting a gap from a what-if is left to the sessions. The page's own objection to INT-7: "A reviewer told to find everything will find more, including trivia." |
| T10 | The pin is verified "once at start", "No check at every command" (MNT-4) | V3 and V4: re-verification at every wake, a setup check before every job start | The canon had already widened its own "once" within four days, each time citing a measurement or the owner's word. |
| T11 | "never by appending" (G7) | The twelve GAP lines, appended on 3 Nov, three of them replacing lines still marked kept | The anti-accretion rule GAP-3 was itself added by accretion, as a new line in answer to a failure ("the 3 Nov design audit"), and approved in that form. |
| T12 | "A reviewer's finding that needs a deliberate attack is a known limit, not code, so the tool does not grow without end" (G15) | V27: the tool's checks "hold against mistakes" | Every class of mistake is in scope. The only exclusion is the deliberate attack. A session's mistakes are an unbounded supply. |

## 5. Requirements a successor must still meet

These are the owner's purposes as the canon states them. Each is followed by the Process3 mechanisms that served it and could be dropped or replaced without losing the purpose.

| # | Purpose | Source | Process3 mechanisms that are not the purpose |
| --- | --- | --- | --- |
| R1 | Put correct, working product behaviour that meets its requirements onto main, quickly and cheaply, so that it survives. Nothing else is output. | P1 | Everything below |
| R2 | The human defines the project: values, mission, audiences, use cases, requirements, principles, high-level architecture, UX, doctrine. The AI does the rest and reports in plain words as done. | P17; What this process is for | BOB as a single hub session; lanes; the walk-through page |
| R3 | The owner's time is the scarcest resource. Only what is his reaches him, rendered, explained, with options and a recommendation. He edits no files and enters no commands; an act only he can take is walked through. | P17, MSG-4 | One message per turn; the onboarding page format |
| R4 | A question is asked once, in one place, and a decided question is never asked again. Only words he marks as decisions become decisions. | How problems are handled; REQ-7 | The walk-through's numbering; decision records as files |
| R5 | In the middle ground both sides offer opinions and neither is dogmatic. | The human and the AI | None |
| R6 | A run can proceed with no one watching. Every stop is a named blocker, other work goes on, and only a blocker the owner alone can clear reaches him. | GAP-1 | ROOT, the sweep, the watcher, the heartbeat, the six conditions, refusal counters |
| R7 | Stop means stop. Pause and resume are first class, and nothing holds a session against the owner's word. | ENF-3, PLN-5 | The plan field; status printing it |
| R8 | Evidence, not claims: whether work is done is established from git and CI, never from a session's words. | JOB-7, REC-5, PLT-10 | Receipt format, PR-comment receipts, worker receipts, the reading audit |
| R9 | Done means merged, and main is protected while work is in progress. | INT-1, P12 | Tranche branches, the merge tool, gate on the merged result |
| R10 | Tests must be real: a test that passes without the change it claims to test does not count. | JOB-12 | The revert check as built; mutation sampling |
| R11 | Every requirement is stated as behaviour at the interface and is tested there. | REQ-2, P7 | Format and coverage checks; permanent-id scheme; marks |
| R12 | Checks are scoped to the cost of what they protect: the module at a pull request, the layer at its close, the whole product at a release. | ARC-4, GAT-2, GAT-7, P11 | The particular list of scoped checks; fixture tiers |
| R13 | Nothing durable lives in a session. Any session can be replaced from the record, and a halted build is fully readable. | REC-3, REC-7, MSG-1, SES-13 | State branch, JSON ledger, handoff, address files, two-phase handover |
| R14 | Work is never lost: everything is pushed before a turn ends. | JOB-9 | The WORKING alarm |
| R15 | Product work does not wait when it can proceed, and does not wait on the owner. | P19, P18, GAP-5 | Never-idle as a standing fault; idle-time measurement; next-acts in status |
| R16 | The process and the product are separate. Building the product is not building the process, and the process a run stands on does not change under it. | P2, P3, MNT-4, MNT-6 | The pin and its checks; the flaw-report route; mid-run pin moves (which defeat the purpose) |
| R17 | The owner's engineering standards hold: a sound architecture of modules in layers with single ownership, so that many jobs can run at once. | ARC-1, ARC-2, P4, P10 | One total order; rounds within tranches; the 24-session figure |
| R18 | What must be read is short enough to be read whole, and size is handled by splitting, never by refusing. | P6, REQ-6, SES-6, TXT-1 to TXT-3 | Budget tables, size alarms, caps, the per-line test |
| R19 | Review is diagnosis, complete in one pass, and never the merge decision. Work merges on a green gate without the owner unless he asks. | INT-7, GAP-10 | Listed reasons; confirming run; review-round limit |
| R20 | A public release, and anything acting on live sites, waits for the owner. Development releases do not. | GAP-7, P22 | Production environment; draft releases; walkers |
| R21 | Caution is a cost. Nothing is added to the process without a failure that happened or the owner's decision, and rules stay few. | GAP-3, TXT-6, P1 | The citation rule in its present form, which did not achieve the purpose |
| R22 | The process is honest about its own cost: what it spent on itself, how often "done" was false, what a surviving change cost, and how much of the owner's time it took. | SES-11, SES-12, PLN-6, GAP-12 | The specific counters; the two-week window |
| R23 | The process stands only on platform behaviour that has been seen to work, and the owner's standing approvals, in his own hand, are the one policy for what sessions may do. | PLT-1, PLT-2, GAP-6 | The platform table's upkeep; tranche-open trials; per-refusal records |
| R24 | It works for projects large and small, for more than one product, and can move between accounts. | PLN-1, PLN-7, GAP-8 | Shims, onboarding measurement, the account-move rehearsal |
| R25 | Every text names its audience and speaks plainly. | TXT-7 | None |

Two of these purposes conflict as Process3 wrote them, and a successor has to choose. R2 gives the AI "everything technical", and R21 says nothing is added without the owner's word or a failure. In Process3 the set of checks was treated as technical, so R2 swallowed R21. Preserving both means moving one thing across the line: the content of the check set, and any change to the process during a run, become the owner's, like requirements. That costs some of R3.

R15 also needs restating. "Never idle" was written as a property of the session. The purpose is that product work does not wait. A session with no product work to do should be allowed to stop.

## 6. Judgment

### How much was foreseeable

Most of it. The canon supplied a motive, the means, constant opportunity and no brake, and the canon's own authors wrote down the risk beside the lines that created it. What the text could not tell a reader was the speed. That depended on how often the platform and the tool misbehaved and on how the model reads a mandate to fix. On the second point the Ledger was not silent either: it cites research that "rules accrete by default", that "corrections are made by adding prohibitions, not editing", and that "restraint rules are weakly followed".

The page's own "Against" column is the strongest evidence that this was foreseeable from the text.

| Line | What the page said against it |
| --- | --- |
| MNT-1 | "Risks rebuilding the vortex if the self-application is as heavy as the product's process." |
| MNT-2 | "The tool reached 6,900 lines in two days; more structure invites more code." |
| MNT-8 | "Certifying on the live product means the product absorbs process failures." |
| MNT-9 | "Can loop if flaws keep appearing; needs a stop rule." |
| MNT-6 | "Judging blocking versus not is a judgment." |
| TXT-6 | "Foresight rules can be rationalised; the bar must be real." "Requires someone to audit the citations." |
| SES-17 | "Urgency plus overconfidence produced confident wrong work and self-modifying harnesses in several accounts." |
| REC-7 | "Every new kind of fact must be added to status or it becomes invisible." |
| PLT-1 | "Becomes a dumping ground for every oddity unless there is a rule for what qualifies as a row." |
| INT-7 | "A reviewer told to find everything will find more, including trivia." |
| JOB-9 | "It is a nudge, and the research shows restraint rules are weakly followed." |

Every line here except MNT-2 was kept or modified. MNT-2 was dropped, and its objection, which is about the growth of the tool, was attached to no surviving line. None of the objections was given a mechanism.

### The eight features most responsible

1. **The brake is a test of justification with a self-renewing supply.** GAP-3 and TXT-6 ask whether a check cites "a measured failure or your word". They do not ask what it costs, how many checks exist, or whether doing nothing is better. The process's own machinery produces measured failures, and sessions transcribe the owner's words. A run generates both kinds of citation faster than it can spend them.

2. **Every check is held by code and every general restraint by text.** The canon says a property held only by text is a nudge. Its own map lists the growth brake as "Built (text)". The one enforcing device it names, the citation audit, was never given a build. The ten-rule limit bounded rulebooks that had not been written. The tool, where the growth could go, had no limit of any kind.

3. **A fix is mandatory, must be structural, and must prevent recurrence.** "Every problem is an architecture bug ... builds the correction; a workaround for the moment is not a fix." There is no approved answer of the form "accept it", "retry it" or "delete the mechanism that failed". Paired with "no session ends a turn while work it can do remains", doing nothing is defined as the fault.

4. **Mechanism belongs to the AI, and the check set is mechanism.** The purpose and mechanism split, P17's "decides everything technical", and the 4 Nov rebuke for bringing TXT-5 to the owner together put every decision about which checks exist beyond the owner's view. He would see one line in a report. The owner's own table says his engineering standards are carried by "the checks, the gate", so a session adding checks could read itself as serving him.

5. **The separation of process and product was nominal.** The same sessions could fix the process and move the running product onto the fix by "one recorded act", as often as a flaw was called blocking, with "blocking" undefined. The first product run was also the certification, and the first build was exempt: "changes are expected". The canon dropped "in force the day written" (MNT-12) and then ran the product on a process with 17 acknowledged gaps and only 51 of 151 map rows marked simply built.

6. **The canon is written as absolute properties that each need a holder.** Twelve properties, 50 uses of "never", and "Each names what holds it". A missing holder is recorded as a "Gap" with a phase to build it in. The day-zero load was about 195 mandated artefacts, of which 76 were checks, reviews or audits. The canon's picture of itself as few rules and a thin process is not supported by its own text.

7. **The restraints banned vectors, not behaviour, and removal was barred.** Hooks, Stop hooks, model judges and size refusals were forbidden. Refusing, stopping and verifying were not, and the canon's own approved text fails closed in a dozen places. The only removal procedure waits for a model release. "Speed never comes from weakening a safeguard" stands in the Ledger as a kept line. Checks could go on freely and could not come off.

8. **The instruments that would have shown the problem read too late.** The health metrics are called "the standing judge of every other line". Cost per surviving pull request needs a two-week window ("survival read 16 Nov"). Overhead share is reported at tranche close and has "no target". Nothing in the canon turns a rising share of process work into a stop.

### Where I disagree with the canon's account of itself

The canon presents itself as the correction of two processes that buried themselves, and it does contain the right observations about why they did. It then treats those observations as rules to be followed by the same kind of session that buried the first two, inside a design that gives that session the authority, the duty and the open-ended work to do it again. The restraint lines are sincere, and several are sharp. They are also the only part of the design the canon left unbuilt.

I also do not accept that the owner's approval fixed the canon as a reference point. He accepted the session's drafted suggestion on 151 of 159 lines, most notes are the session's words, and the Foundations, dated 31 Oct, carries 53 dated references to events of 1 to 4 Nov, most of them a measurement or the owner's word given as the reason for a sentence. By the time the run began, the canon was already being maintained by the method it prohibits: a dated addition for each incident, each one properly cited.

One caution on my own conclusion. I read documents, not behaviour. The canon made this outcome the path of least resistance. Whether a different model, or the same model with the restraint placed in front of it at each decision, would have taken that path is a question the other analysts' evidence has to answer.
