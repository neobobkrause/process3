# Audit D: the Process4 proposal against the four central requirements

13 Nov 2026. Audited: `process4_doc.md` (all 551 lines, every table row). Read in full: `foundations.md`, `ledger_map.md`, `product_side.md`, `redteam_feasibility.md`. Read by line id: `ledger_lines.md` (ARC-1, ARC-2, GAT-3, P1 to P23, PLN-1 to PLN-3, JOB-1 to JOB-6, JOB-9, INT-4, SES-1, SES-8, SES-15 to SES-17, PLT-2, PLT-6 to PLT-10, REQ-4, REQ-5, GAP-1 to GAP-12). Read by search: `change_sample.md`, `causal_forensics.md`, `levers_github_cloudflare_product.md`, `field_report.md`. Read from the product repository, read-only: `build/modules.json`, `build/layers.md`, `process/config.json`, `CLAUDE.md` at `origin/tranche` (identical module map at `origin/layer/14`), and `build/modules.json` at `origin/main`.

Classification words: MET, PARTLY, NOT ADDRESSED, CONTRADICTED. A clause is graded on the proposal's operative items (G, C, M, F, P, N, "Start smaller than this", "What reaches you", "Known limits", run 0, run 1, the seven tests), not on its admission table.

## 0. Findings in brief

1. **The proposal's body was not rewritten to the four requirements.** A section was put in front of it ("The requirements everything must serve") that restates them and admits shortfalls. It says the recommendations "fall short of three" and then lists four rows. Each row gives a "direction of the correction" in one sentence. No numbered item, no run 0 step, no test, no line of "What reaches you" and no grade in the R1 to R25 table was changed to match. The six conditions still open with "The process changes only by your merge"; "Known limits" still says "Your merge is the last wall"; "What reaches you" still says "Your standing acts are five".
2. **Of 18 testable clauses, the proposal's items meet 2, partly meet 6, do not address 1 and contradict 9.**
3. **Requirement 1 is contradicted on every clause.** The proposal asks 36 distinct acts of the owner. 8 are changes to GitHub or Cloudflare settings about permissions or rules. 3 are borderline. 25 are something else: merging, reviewing, writing, creating a task, starting or commissioning sessions, editing a file, setting Claude's cloud environment, reading reports. Of the 15 recurring acts, 2 are allowed.
4. **Requirement 2 is contradicted in the form the proposal recommends starting with.** "Start smaller than this" gives up overnight running and has no wake at all. There are 22 situations in which product work stops or waits; in 12 of them it waits for the owner although it is not completely blocked, and 16 end only when he acts.
5. **Requirement 3 is contradicted on order and on notification.** P3 starts a layer's jobs together. N7 deletes notices "with no replacement". Nothing in the proposal holds the total order itself: the check it keeps compares imports with declared uses and does not look at position.
6. **The module map at the tranche tip already breaks the total order in three places,** all introduced during Process3: `hypotheses` uses `steps`, `agent-runner` uses `ai-gate`, and `agent-drafts` and `agent-worker` use each other. `origin/main` has none. No evidence file and no line of the proposal mentions this.
7. **Requirements 3 and 4 pull against each other on this product as it is mapped.** If a module's job may start only when the jobs of all modules it uses have merged, the 220 modules form 65 waves, the median number ready at once is 3, the maximum is 12, and a bound of 12 or more never binds. The owner's default of 20 could not be used.
8. **Requirement 4's bound is a sentence.** C12 puts "24" in ARCH's pinned text. Changing it is a merged process change. It counts live sessions, not jobs. Nothing enforces it.

## 1. Requirement 1: the owner's acts

> The user doesn't enter commands nor edit source files. The only actions he will very occasionally take are changes to GitHub or Cloudflare settings related to permissions or rules.

### 1a. Clauses

| Id | Clause | Test |
| --- | --- | --- |
| 1a | He enters no commands | No act of his is typing a command, a script or an instruction to be executed |
| 1b | He edits no source files | No act of his changes the content of a file in a repository, by any route including GitHub's website |
| 1c | His only actions are changes to GitHub or Cloudflare settings related to permissions or rules | Every act asked of him is on a GitHub or Cloudflare settings page and concerns who may do what, or a rule |
| 1d | Very occasionally | The count of his acts per run is near zero and is not periodic |

### 1b. How the Foundations and Ledger meant it to be met

- P17 (modified 3 Nov): "Bob does not edit files or enter commands; when an act only he can take is needed, BOB names it and walks him through it." Suggested and kept with: "during onboarding the platform forces a few GitHub steps of yours; keep those as few as possible, each walked through." Ledger map: held by "Walk-through; every role", status "Design". No mechanism.
- Foundations, "The human and the AI": "Your time is the scarcest resource." "Approving a merge is such an act only when you ask for it: by default a job, layer or tranche merges on a green gate without you, while a public release waits for your approval (GAP-7)". "You do not edit files or enter commands; the few steps of yours the platform forces at onboarding are kept as few as possible and each is walked through (P17)."
- GAP-10: "a green gate merges without Bob, who approves a particular merge only when he asks to."
- REQ-5: "A change to what a provided service means goes to you only by the DES 1 test; every other change is BOB's, recorded once."
- PLT-8: "GitHub acts a session cannot take run on GitHub's runner by workflows with your tokens as secrets."
- PLT-9: "Every credential is gathered once before a product's first tranche". Its own "Against": "each addition is an act of yours."
- Setup: "set by the developer through the fewest steps, each with its reason and tested to work the first time".

The Foundations already carried exceptions that the restated requirement does not allow:

- **A file edit.** "They live only where your own hand puts them: committed by you to each repository's CLAUDE.md." "a check fails any change to the approvals block not made by you through GitHub's website."
- **Starting sessions.** Roles table: ROOT "Started by: You". "If the watcher's session declines, replacing ROOT stays yours".
- **Writing answers.** "Questions that are yours are asked in one place, the walk-through, numbered, with a column for your word".
- **An approval click.** GAP-7: "A public release or promotion to installed sites waits for Bob's approval through the protected GitHub environment".

### 1c. What Process3 did

| Clause | Process3 actual | Source |
| --- | --- | --- |
| 1a | The owner started the first sessions. Tasks were switched off by hand at the 3 Nov halt. | Ledger map PLN-5 |
| 1b | 16 owner patches to the product's `CLAUDE.md` in nine days (641 to 8,664 bytes). 14 owner approvals edits in the process repository. Owner patch 13 (7 Nov) also edited `.claude/settings.json`: a deny on every `git push` and `gh` command and a hook before every Bash call. | product_side 6a; process4_doc line 52 |
| 1c | His acts were mostly words, not settings: decisions on 159 Ledger lines (151 as suggested), at least 36 walk-through questions, 14 of 32 check removals driven by his words, account switches on 5 and 7 Nov. | process4_doc; change_sample; product_side 9 |
| 1d | "Process3 drew objections, approvals and audits from you on every one of its nine days." A coordinator chain carried a question as "Bob's, asked, no answer" for about nine hours on 5 Nov. "Every approvals edit in Process3 halted the process, and the last one ended it." | process4_doc lines 195, 475; causal_forensics 3D |

### 1d. What the proposal says, clause by clause

| Clause | Result | The proposal's words |
| --- | --- | --- |
| 1a no commands | CONTRADICTED | C2: "ARCH is woken once an hour by a scheduled task that you create. Its prompt is one line". Start smaller 4: "one ARCH session that you start". C7: "Installing Node and dependencies moves ... to the cloud environment's setup script". Run 0 step 2: "A commissioned session builds the Process4 kit". N4: "when you commission it". |
| 1b no file edits | CONTRADICTED | G3: "Your approvals text in `CLAUDE.md` is rewritten by you to name this act." Run 0 step 5: "rewrite your approvals to name the new merge act". G2: "with you as bypass so you can merge your own edits". Run 1: "Your own repairs to the gate are counted separately and are expected in a first run." Known limits: "exceeding a budget means changing its number on purpose. You can still do that." |
| 1c only GitHub or Cloudflare permission and rule settings | CONTRADICTED | "What reaches you": "Your standing acts are five: merge a process change, answer a question, stop or resume, approve a public release, and, only in the fallback form, replace ARCH at a layer close." None of the five is wholly a permission or rule setting. R3 grades itself "Weakened": "You gain acts: creating the hourly task once, merging process changes, two clicks to stop. Each is a click or a comment". |
| 1d very occasionally | CONTRADICTED | Division table: "One daily number to read. Questions that are yours, batched." "What it costs you": "a retrospective between runs needs perhaps an hour of your attention. I cannot put a firm number on it". Start smaller: "You would look in once or twice a day." C3 fallback: "replaced by you at each layer close". |

Items that touch requirement 1: G1, G2, G3, G5, G6, G8, G9, G10, G11, G12; C2, C3, C7, C8, C10, C11, C12; M1, M3, M4, M5, M6; F1, F2, F3; P1, P5; N2, N4, N5, N6, N8; Start smaller 1 to 5; the six conditions 1 and 4; the division table; "What it costs you"; "What reaches you"; Known limits ("A defect in a frozen part waits for you", "Your merge is the last wall"); R2, R3, R4, R7, R20; tests 2, 3 and 7; run 0 steps 1 to 5; run 1 ("Your acts are counted: merges, answers, stops").

The admission table names three acts that are not settings changes: "merger of every process change (G1, N2, N4), the creator of the hourly task (C2) and the answerer in an issue (M5)". The count below is 25.

### 1e. Every act the proposal asks of the owner

A = a change to GitHub or Cloudflare settings related to permissions or rules. B = borderline: an act of his on GitHub or Cloudflare that is not a permission or rule setting. N = something else.

**At setup (run 0 and before run 1).**

| # | Act | Item | How often | Class | Why |
| --- | --- | --- | --- | --- | --- |
| 1 | Write to GitHub Support about the 6 Nov suspension | G12; run 0 step 1 | Once | N | Writing a message |
| 2 | Process repository public; sessions' account not a collaborator | G1 | Once | A | Collaborator setting |
| 3 | Ruleset on main and the integration branch: code-owner review for his paths, himself as bypass | G2; Start smaller 1; test 2 | Once | A | Ruleset |
| 4 | Auto-merge allowed; required check `gate` | G3, G4 | Once | A | Repository rule |
| 5 | Close rule: required regression and walk on the integration-to-main pull request | G11 | Once | A | Ruleset |
| 6 | GitHub environments `production` (himself as required reviewer, production keys) and `dev` (development Cloudflare token) | G10 | Once | A | Environment protection and secrets |
| 7 | Remove the eleven secrets from the sessions' cloud environment | G10 | Once | N | A Claude setting, not GitHub or Cloudflare |
| 8 | Create a separate Cloudflare account for development | F3; test 7 | Once | B | Cloudflare, but creating an account |
| 9 | Create the scoped development Cloudflare token | F3, G10 | Once | A | Cloudflare token permissions |
| 10 | Rewrite the approvals text in `CLAUDE.md` in his own hand | G3; run 0 step 5; test 3; C11 | Once, then at every change to what sessions may do (Process3: 16 + 14 edits in nine days) | N | A file edit |
| 11 | Create the hourly scheduled task and type its prompt | C2; run 0 step 5; N8 | Once; again at each ARCH replacement in the fallback | N | A Claude task; typed instruction |
| 12 | Enter the cloud environment's setup script (Node, dependencies) | C7; N8 | Once; again when the toolchain changes | N | Entering commands, in a Claude setting |
| 13 | Set the cloud environment variable that switches auto memory off | C8 | Once | N | A Claude setting |
| 14 | Commission the session that builds the Process4 kit in a fork | Run 0 step 2; N6 | Once | N | Starting a session with an instruction |
| 15 | Have the gate replayed against 20 to 30 merged pull requests and set the runner-minute budget from it | Run 0 step 3; G5; N6 | Once | N | Commissioning; deciding a number held in a file |
| 16 | Merge the kit as the first process version | G1, N2, N6 | Once | N | Merging |
| 17 | Merge the clean-up pull request on the product, which also puts the workflow files on main | P1; run 0 step 4; G8 ("Workflow file you merge") | Once | N | Merging |
| 18 | Run or commission the seven one-hour tests, and do his side of tests 2, 3 and 7 | "Before run 1" | Once; again at each model release (M6) | N | Commissioning; trying merges |
| 19 | Start the ARCH session | Start smaller 4 | Once in the small start; recurring whenever that session is exhausted | N | Starting a session |
| 20 | Decide whether type-checking and lint are added | P5 | Once | N | A decision delivered in words |
| 21 | Conditional: move both repositories to a free GitHub organization | G6 | Once, if more than 5% of merges break the integration branch | B | Account and ownership, not a permission or rule |

**Recurring.**

| # | Act | Item | How often | Class | Why |
| --- | --- | --- | --- | --- | --- |
| 22 | Merge each process change | G1; N2; N4; six conditions 1; "What reaches you" | At least once per run; mid-run "at any moment" for a blocking defect; "expected in a first run" | N | Merging. Process3 merged 294 process changes in nine days |
| 23 | Review and merge every pull request that touches his paths in the product: `.github/**`, `.claude/**`, `CLAUDE.md`, `CODEOWNERS`, the process pin, the walker's step definitions, the reviewer's brief | G2, F2, C7, C10 | Each process version, each walker-step change, each settings or workflow change | N | Reviewing and merging |
| 24 | Switch GitHub's interaction limit on at the start of a run and off for the retrospective's fork pull request | G1 | Twice per run | A | Moderation setting |
| 25 | Stop and resume, part one: lock and unlock the integration branch | G9 | On demand | A | Ruleset lock |
| 26 | Stop and resume, part two: switch the hourly task off and on | G9 | On demand | N | A Claude task toggle |
| 27 | Answer questions in the pinned issue "in your own words" | M5; "What reaches you"; N5 | Unbounded, "batched" | N | Writing a comment |
| 28 | Put any word he wants to outlast a run in writing as a commit, review or comment | M4 | Whenever he wants a remark to hold | N | Writing; a commit is a file edit |
| 29 | Read the daily report (nine numbers) and watch the six signs of failure | Daily report; "Signs that it is going wrong"; division table | Daily | N | Reading |
| 30 | Respond to the watchdog's failure email | G8 ("GitHub emails you. It repairs nothing.") | At every stall | N | The response act is not defined; in practice starting or replacing ARCH |
| 31 | Commission a retrospective | N4 | Per run | N | Starting a session |
| 32 | Read the retrospective (up to three priced changes plus "change nothing"), choose, and decide each repair | N4, N5; "What it costs you" | Per run, "perhaps an hour" | N | Reading and deciding |
| 33 | Change a budget number before a change may exceed it | M1, N1, G5; Known limits | Occasional | N | A file edit through a merge |
| 34 | Approve a public release in `production` | G10, G11 | Per public release | B | An approval click, not a setting. His own rule (GAP-7) |
| 35 | Fallback form only: replace ARCH at each layer close and switch the old task off "in the same step" | C3; "What reaches you" | Per layer close (Process3: 13 closes in 5.3 days) | N | Starting a session; task acts |
| 36 | Small start only: "look in once or twice a day" | Start smaller | Once or twice a day | N | Attendance |

**Counts.**

| | A allowed | B borderline | N not allowed | Total |
| --- | --- | --- | --- | --- |
| Setup (1 to 21) | 6 | 2 | 13 | 21 |
| Recurring (22 to 36) | 2 | 1 | 12 | 15 |
| All | 8 | 3 | 25 | 36 |

Optional acts the proposal offers and that are not counted: asking for the reviewer (C10 "or when you ask"), asking to approve a tranche close (G11 "unless you ask"). One act the proposal leaves undefined and that is not counted: how the owner gives purpose, audiences, requirements, architecture and UX "as before". M4 says a remark in chat "lapses at the end of the run unless you put it in writing", so the only durable channel the proposal gives him is writing on GitHub.

## 2. Requirement 2: unattended

> The process runs unattended. It doesn't block waiting for user input unless it is completely blocked with no further work possible without additional user action.

### 2a. Clauses

| Id | Clause | Test |
| --- | --- | --- |
| 2a | The process runs unattended | From start to completion, including overnight, no person is needed for it to continue |
| 2b | It does not block while further work is possible | When any work can be done, some work is being done; no built-in idle wait |
| 2c | It waits for user input only when completely blocked | Every wait for the owner is a state in which no work at all is possible without him. By requirement 1 the act that ends the wait is a settings change |

### 2b. How the Foundations and Ledger meant it to be met

- GAP-1 (the owner's own words, 3 Nov): "A tranche CAN RUN from open to close with no one watching: every stop is a named blocker in the record, BOB starts other work meanwhile, and only a blocker that only Bob can clear reaches him." Ledger map: held by "Phase 2's gate". Not a mechanism.
- P19: "BOB never idles while work remains; the work never stops for Bob, and no session ends a turn waiting on him while anything can be done." Held by "status, sweep wake, BOB's prompt".
- GAP-5: "No role waits on ROOT or a scheduled task for work the record allows: a job's report or a merge wakes BOB at once, and a scheduled wake only catches a session that stopped." Source: "measured 2 Nov: with no event, BOB noticed a completion 194 minutes late."
- GAP-4: "Status names each role's next acts from git alone ... so a fresh BOB given only status takes the right next act."
- P18: "while a tranche runs, BOB prepares what the next round or tranche needs ... so it opens the moment this one closes".
- INT-4: "the next layer starts at once."
- JOB-9: "A job ends a turn only COMPLETE or on a named wait with everything pushed; nothing enforces this but the rule and the record." SES-17: urgency "as a labelled nudge".
- PLT-2 as restated: "depend only on acts the committed approvals cover and that were measured to pass". PLT-9: "a missing grant stops a tranche from opening, never a step midway." GAP-6: approvals in `CLAUDE.md` "are the one policy for every act at every depth". GAP-10: "a green gate merges without Bob".
- "Running unattended: six conditions": authority in every START; nothing depends on a refused act; "The sweep runs on its schedule and catches a session stopped by three refusals in a row"; live count at 24 or fewer; the gate on every pull request; "The sweep catches lack of progress, not only silence".

### 2c. What Process3 did

| Clause | Process3 actual | Source |
| --- | --- | --- |
| 2a | It ran round the clock from 4 to 9 Nov: 135, 92, 65, 128, 74 and 7 landings a day. It also stopped for the owner: the last approvals edit (9 Nov 16:45Z) ended it. | product_side 2, 8 |
| 2b | 9.3 hours with no commit of any kind from 7 Nov 05:51Z. Gaps between code-carrying landings of 11.4, 8.7, 7.6 and 6.3 hours. Median wait from complete to merge 348 minutes on 5 Nov (90th percentile 670). 165 `block` commits; in 72 the job says the work is done and pushed and `job complete` refuses. No deployment for 80 hours while 308 landings went in. | product_side 6d, 7, 9 |
| 2c | Waits for the owner while work was possible: about nine hours on the merge-train design across four coordinators ("it was a technical decision within his design and should have been built at 05:31"); a session that "waited seven hours for a 'go' it said it did not need"; a lane session stuck on a permission prompt from about 00:31Z (process PR 219). Measured platform fact: "After three refusals in a row a session stops and waits for a person". | causal_forensics 3D; process4_doc line 118; change_sample row 219; Foundations |

### 2d. What the proposal says, clause by clause

| Clause | Result | The proposal's words |
| --- | --- | --- |
| 2a runs unattended | CONTRADICTED in the recommended start and in the fallback; conditional in the preferred form | Start smaller: "This gives up one thing at first: running unattended overnight. You would look in once or twice a day ... I recommend the small start". C3: "Process3 measured that a task's fresh session could not start other sessions; that is re-tested first. Fallback: one ARCH session resumed by the task ... replaced by you at each layer close". R6: "Met in the preferred form; weakened in the fallback". The only form Process3 measured working is the fallback. |
| 2b no block while work is possible | PARTLY | Met for a single job's process problem: working agreement 3, "work around it, add one line to the process log, and carry on"; N3, "ARCH works on something else". Not met for idle time: R15, "Up to an hour can pass between a layer closing and the next starting"; "'Never idle' is no longer a fault of the session"; working agreement 7, "stopping with nothing to do is correct". C4: "ARCH does not subscribe", which drops GAP-5. |
| 2c waits for the owner only when completely blocked | CONTRADICTED | Six conditions 1: "The process changes only by your merge." "What it costs you": "A real process defect now waits for you". G2: "requires your review for those paths". N4: "A retrospective between runs, when you commission it." M5: "Questions for you live in one pinned issue". G8: "GitHub emails you. It repairs nothing." Run 1: "If a wall is found missing, the run stops". |

Items that touch requirement 2: G3, G6, G8, G9, G11; C2, C3, C4, C6, C11, C12; M5; F1; N2, N3, N4; Start smaller; R6, R15; working agreement 3 and 7; Known limits; tests 1, 3, 4, 5; run 1 ("No stall goes unnoticed"). The run 1 test asks that a stall be noticed, not that it be recovered.

### 2f. Every situation in which work stops or waits

"Owner, not complete" = the process waits for the owner although other work is possible, or the act that ends the wait is not a settings change. "Idle" = work is possible, no owner is involved, and nothing is being done.

| # | Situation | Item | Kind | Worst-case wait |
| --- | --- | --- | --- | --- |
| 1 | Small start: no scheduled task, no watchdog; ARCH's turn ends and nothing wakes it | Start smaller 4 | Owner, not complete | Until he looks in: 12 to 24 hours each time |
| 2 | Fallback ARCH: each layer close waits for him to replace ARCH and switch the old task off | C3 | Owner, not complete | Unbounded, at every layer close |
| 3 | Hourly wake: a freed slot, a closed layer, a red integration branch or a walk failure waits for ARCH's next wake | C2, C4, R15 | Idle | 60 minutes at each step. On a 65-link chain under strict order that is 65 hours of wake latency alone |
| 4 | ARCH dead, paused by refusals, or its task not firing | G8, C3 | Owner, not complete | The watchdog's "set number of hours", plus 30 minutes, plus his response. "It repairs nothing." |
| 5 | A job dead or paused by three refusals | C4, C6 | Idle | "Open too long" (no number given) plus up to 60 minutes. The replacement cannot receive the pull request's events until the dead session is archived, which is a judged act |
| 6 | A defect in the gate or any frozen part that blocks every merge | Six conditions 1; Known limits | Completely blocked, but the unblocking act is a merge | Unbounded. Jobs in flight keep working on branches; nothing lands; no later layer starts |
| 7 | A needed change to his product paths: the pin, a workflow, `.claude/settings.json`, the reviewer brief | G2, C7, C10 | Owner, not complete | Unbounded; other work continues |
| 8 | A walker step that is itself wrong or missing | F2, G11 | Owner, not complete | Unbounded. The tranche cannot close: G11 requires "a passing walk" and the steps are his |
| 9 | An act the approvals text does not cover is refused by Auto mode | G3, C11; test 3 | Owner, not complete | Unbounded. No session may write the approvals (Foundations); an edit "takes effect in sessions started after it" |
| 10 | A question that is his | M5 | Owner, not complete | Unbounded. The proposal does not say work proceeds on ARCH's recommendation meanwhile |
| 11 | End of a run: product work stops until he commissions the retrospective, reads it, merges and resumes | N2, N4 | Owner, not complete | Unbounded, at every run boundary |
| 12 | Run 0: Layer 14 is "one merge short" and waits for five run 0 steps and seven tests | Run 0; "Before run 1" | Owner, not complete | Days; 13 of the 21 setup acts are not settings |
| 13 | Run 1 stop rule | Run 1: "If a wall is found missing, the run stops" | Owner, not complete | Until the next run |
| 14 | Idle or finished sessions fill the account's live limit and new starts fail silently at about 50 | C12; test 5 | Idle | Until the watchdog fires. Archiving is a judged act that Process3 ruled "never needed for correctness" |
| 15 | A cross-module break waits for the scheduled regression, then for ARCH | G6 | Idle | The schedule's interval (not stated) plus 60 minutes |
| 16 | Deploy-and-walk at layer close "when ARCH dispatches it" | F1 | Idle | 60 minutes, or 24 hours if the dispatch is refused and only the daily schedule runs |
| 17 | Runner queue: 24 landings an hour at 50 runner-minutes is exactly 20 runners | G5 | Idle | Grows with every landing above the budget |
| 18 | The interaction limit is left on and the retrospective's fork pull request cannot be opened | G1, N4 | Owner, not complete | Until he toggles it. The act is a setting |
| 19 | A process fix exceeds a line or byte budget | M1, N1; Known limits | Owner, not complete | Until he changes the number, which is a file edit |
| 20 | The sessions' GitHub account is suspended again | Known limits | Completely blocked | Unbounded; only he can write to Support |
| 21 | A public release | G10, G11 | Completely blocked for the release only | Until he approves. His own rule (GAP-7) |
| 22 | His stop | G9 | By design | Until he resumes |

**Counts.** 22 situations. 12 wait for the owner although not completely blocked (1, 2, 4, 7, 8, 9, 10, 11, 12, 13, 18, 19). 6 are idle waits with no owner involved (3, 5, 14, 15, 16, 17). 4 are complete blocks or his own act (6, 20, 21, 22), and in one of those (6) the act that ends the block is a merge, which requirement 1 excludes. 16 of the 22 (the 12 and the 4) end only when the owner acts, so the proposal sets no bound on them; the 6 idle waits are bounded by a schedule.

## 3. Requirement 3: total order, single job, notification

> A product consists of a total order of modules, where the services of a module can only be used by modules that follow it. Each module is updated and tested by a single job, with the jobs of earlier modules run before those later in the order. If a job changes a module's interface, all users of that module are notified so that the jobs for those user modules are updated as necessary and tested.

### 3a. Clauses

| Id | Clause | Test |
| --- | --- | --- |
| 3a | The product is a total order of modules | One ordered list; every module has one position |
| 3b | A module's services are used only by modules that follow it | No declared or actual use points to a module at the same or a later position |
| 3c | Each module has a single job | At most one job per module; nothing else changes the module |
| 3d | That job both updates and tests the module | The job that changes the module's code also writes and runs its tests |
| 3e | Jobs of earlier modules run before those of later modules | No module's job runs ahead of the job of an earlier module |
| 3f | A job that changes a module's interface causes all users of the module to be notified | Every module that declares a use of the changed module receives the notice; none is missed |
| 3g | The users' jobs are updated as necessary | Each notified module's job takes the change in, where it is affected |
| 3h | The users' jobs are tested | Each notified module is tested against the changed interface |

### 3b. How the Foundations and Ledger meant it to be met

| Clause | Line | Words | Held by (Ledger map) |
| --- | --- | --- | --- |
| 3a, 3b | ARC-1 | "Modules in one total order, each in one layer, lower first, uses declared and matched by imports; a violation fails the gate." | "Not in the tool's gate": **Gap** on 3 Nov |
| 3a, 3b | P4 | "one total order; each module is in one layer; a module uses only earlier modules; declared use is checked against imports and a violation fails the build." | "As ARC-1": **Gap** |
| 3c | P8 | "at most one job per module at a time; a job applies every plan entry for its module and deals with what it finds in its own module within the job whenever it can." | "job start refuses a second": Built |
| 3c | ARC-2 | "Each file has one owner module; a job writes only its module's paths and tests and the strike of its own marks." For: "Makes parallel jobs safe from overwriting each other." | "gate and merge": Built |
| 3d | P7 | "Only module jobs change module code, and every requirement is tested at the interface and proven met" | "Revert check only": **Gap** |
| 3d | REQ-4 | "A not-yet-met mark is struck only by the job that meets it, in its own commit." | ARC-2's ownership: Built |
| 3e | P10 (modified) | "A tranche runs one layer at a time, lowest first, and all the module jobs of a layer run concurrently ... The next layer starts when every job of the layer is complete." | "status next work; layer close": Phase 2, Phase 3 |
| 3e | INT-4 | "a layer closes when every PR is merged and the layer's checks pass ... the next layer starts at once." | Phase 3 |
| 3e | Foundations, A job's life 1 | "each module of the open layer (INT-4), the lowest layer in the product's layer map not yet closed (P10) ... as many at once as the live-session limit allows" | |
| 3f, 3g, 3h | GAT-3 | "A change to a provided service reaches its users through the architecture session's requirement notice and each user module's own job." Against: "BOB must not miss a user." | "Provider-change route": Phase 3 |
| 3f | P5 | "BOB carries a change to every user of a service." | Nudge |
| 3h | Foundations, the gate | "never another module's suite (GAT-2)"; "A change to a provided service reaches its users through BOB's requirement notice and each user module's own job, not through the provider's gate (GAT-3)." | |
| 3f | REQ-5 | A meaning change "goes to you only by the DES 1 test; every other change is BOB's" | Nudge |

The Foundations did not hold clause 3e as the restated requirement words it. P10 orders layers, not modules: within a layer every job runs at once. The total order allows a module to use an earlier module of its own layer, so P10 runs users beside or ahead of their providers. P10's own note says how that was to be repaired: "a later service change reaches its users by GAT-3."

### 3c. What Process3 did

| Clause | Process3 actual | Source |
| --- | --- | --- |
| 3a | 220 modules in one ordered list in 11 layers (39, 10, 12, 9, 21, 27, 3, 20, 13, 4, 62). `layers.md`: "The modules, in their total order, are in `modules.json`." The map changed 40 times in the week. | `build/modules.json`; process4_doc P4 |
| 3b | 3,120 declared uses. None points to a higher layer. **Three point to a later position in the same layer**: `hypotheses` → `steps`, `agent-runner` → `ai-gate`, `agent-drafts` → `agent-worker` (and `agent-worker` also uses `agent-drafts`, a cycle). With those three edges kept, 44 of the 220 modules sit on or behind a cycle. `origin/main` (178 modules, 2,689 uses) has no such edge, so all three arrived during Process3; `agent-drafts` was split from `agent-worker` on 4 Nov. The imports check does not look at position. | Computed today from `origin/tranche` and `origin/main` |
| 3c | 220 ledger jobs for 220 modules; a second job for a module was refused. But a job was not single in practice: 3.1 job starts and 3.0 landings per job; 170 distinct jobs landed 508 times, 113 more than once; three modules landed 14 times each; 330 job branches. Outside module jobs: 248 `bob/*` pull requests, 43 found-mark pull requests, 33 lanes. | product_side 1, 2, 5 |
| 3d | Jobs wrote their own tests: +43,882 net test lines against +23,090 source. 11,410 of the test lines served the process (187 notice tests, 24 requirement-id tests). Module suites ran in 1.9 to 2.5 minutes median. | product_side 5, 6c |
| 3e | Layers ran roughly lowest first with every job of a layer at once. Not strictly: layer 3 closed (4 Nov 02:13Z) before layer 2 (05:31Z). Layers closed with modules deferred: 2, 0, 1, 1, 3, 8, 0, 2, 0, 1, 28 for layers 1 to 11, 46 in all, so later layers started while earlier modules' work was open. Within a layer there was no order across 721 in-layer uses. A "companion land order" rule deadlocked on 9 Nov: 351 minutes for 63 and 28 lines. | product_side 5, 7 |
| 3f | 178 notices fanned out to 2,707 module-notifications, 15.2 per notice; 1,341 on 4 Nov alone. The first notice "listed 56 modules as next work". "Widely imported providers ... raise notices with 100 or more importing users per bug-fix pull request". | product_side 6d; change_sample rows 54, 68, 82 |
| 3g | 2,342 triage verdicts; 2,101 (90%) "not affected"; 241 "affected"; 441 answered by a job landing; 69 commits were notice confirmations with no code change. Some real fixes followed, for example `capture-requests` reading a field `ai-runs` had renamed. The mechanism took thirteen process changes (PR 54 and twelve follow-ups) and the owner asked on 9 Nov "how do we get it back to a lightweight process". | product_side 6d, 9; change_sample |
| 3h | Running users' suites in the provider's gate (process PR 112) cost "+7.6 min median and +28.6 worst per job gate, and of 20 refuted job claims today none came from another module's failure"; reverted in 2.2 hours. The notice test in the receipt "answered nothing and the revert check found it inert"; dropped at 19 hours. One real miss on 4 Nov: a job "merged green on its own suite and broke another module; nobody saw it until the first development deploy served 500s". | change_sample rows 40, 54, 118, and section on PR 112 |

The proposal says "Process3's version took a median of 52 hours to record a notice by 9 Nov, against 0.2 at the start". That figure is in none of the evidence files given to this audit.

### 3d. What the proposal says, clause by clause

| Clause | Result | The proposal's words, and what is missing |
| --- | --- | --- |
| 3a total order | PARTLY | The requirement is restated. R17: "Met ... The imports check stays in the gate." P4: "The module map and round plan are ARCH's files, not guarded." Nothing in any item holds the order: no check that a declared use points to an earlier module. |
| 3b used only by later modules | PARTLY | G4 keeps "imports match declared uses". That compares code with the map. It passes the three edges that break the order today. |
| 3c one job per module | PARTLY | C4: "A job is one module or item, one branch, one draft pull request." Run 1's work is items, not modules. "At most one job per module" is said nowhere; the refusal that held it goes with the tool (N1: "It cannot refuse, hold or write"). The ownership check (ARC-2) is not among G4's checks: "imports match declared uses, generated files are current, built rows verify. Nothing else." G6: "A red result is a fix job for ARCH", which does not say that the broken module's own job fixes it. |
| 3d that job updates and tests | MET, weakened | G4: the gate "runs the changed module's tests, the revert check". R11 grades itself "Weakened": "Nothing proves each struck mark has a test". |
| 3e earlier before later | CONTRADICTED | P3: "A layer's jobs start together. 182 of 220 modules depend on a module in their own layer; starting in strict dependency order would cost about four days." Held by "ARCH's pinned text". Order between layers is implied (R15, F1 "at each layer close") and stated in no item; "ready" is not defined. G3 merges in arrival order. N7 deletes "forced layer re-sync, companion land order". |
| 3f notify all users | CONTRADICTED | N7: "Deleted with no replacement: ... notice triage as a mechanism". "Ledger lines that end": "provider notices as a route (GAT-3)". Working agreement 4: "If it is elsewhere, tell ARCH in one line." |
| 3g users' jobs updated | NOT ADDRESSED | No item opens or updates a user module's job on an interface change. Nothing says how an interface change is recognised. |
| 3h users' jobs tested | PARTLY | G6: "Cross-module breaks are found after merging, on the integration branch. The existing full regression runs there on a schedule." G11: the full regression at close. This tests every module some hours later. It finds only breaks an existing test exercises, it is not tied to the change or to its users, and it does not test a user "updated as necessary". |

Items that touch requirement 3: G3, G4, G6, G11; C4, C5, C6; F2; P3, P4; N1, N7; R10, R11, R12, R17; "Ledger lines that end"; working agreement 4; Known limits ("Requirement files are edited by jobs"). None of the seven tests and none of the five run 1 measures tests order or notification. Run 1's goal, "Merge Layer 14, then one round to raise the walk", is completion items and exercises neither.

The admission table says: "Keep the order and the notification. Derive the users of a changed interface from the module map and open their jobs." That is a direction. P3 and N7 stand unchanged below it.

### 3g. What the actual module map permits

Method: `build/modules.json` at `origin/tranche`, list order taken as the total order, the three forward edges set aside as violations. Each job is taken as one time unit. These are properties of the map, not measurements of a run. A tranche in which fewer modules have work would be wider. T53 gave all 220 modules a job, so the full figures apply to it.

**If a module's job may start only when the jobs of every module it uses have merged.**

| Measure | Value |
| --- | --- |
| Longest chain of uses | 65 modules |
| Waves | 65 |
| Modules ready at once | Median 3, mean 3.4, maximum 12 |
| Wave sizes in order | 3, 7, 7, 10, 12, 9, 6, 4, 2, 2, 1, 4, 5, 2, 2, 2, 4, 3, 2, 3, 4, 4, 6, 4, 2, 3, 3, 2, 3, 6, 6, 5, 2, 3, 4, 1, 1, 1, 1, 2, 1, 1, 1, 2, 2, 1, 2, 2, 2, 4, 5, 2, 4, 2, 5, 1, 2, 1, 1, 1, 1, 9, 8, 3, 4 |
| Waves with exactly one module ready | 14 of 65 |
| Waves with two or fewer | 32 of 65 |
| Modules with no uses at all (the first wave) | 3 |
| With the three order-breaking edges kept as real dependencies | 44 modules can never start |

**The same rule under a bound on concurrent jobs.**

| Bound | Rounds to finish | Average jobs running | Rounds in which the bound binds |
| --- | --- | --- | --- |
| 1 | 220 | 1.0 | 220 |
| 2 | 110 | 2.0 | 110 |
| 3 | 85 | 2.6 | 62 |
| 4 | 77 | 2.9 | 35 |
| 6 | 71 | 3.1 | 12 |
| 8 | 68 | 3.2 | 4 |
| 12 | 65 | 3.4 | 1 |
| 20 or 24 | 65 | 3.4 | 0 |

A bound of 12 or more changes nothing. The owner's default of 20 and the proposal's 24 would never be reached.

**The proposal's "a layer's jobs start together".**

| Measure | Value |
| --- | --- |
| Rounds | 11, one per layer |
| Jobs wanted at once per layer | 39, 10, 12, 9, 21, 27, 3, 20, 13, 4, 62 |
| Layers that exceed a bound of 24 | 3 (layers 1, 6 and 11) |
| Uses that cross within a layer | 721 of 3,120 (23%) |
| Modules whose job starts beside or before a module they use | 182 of 220 (83%) |
| In-layer chain depth per layer | 8, 4, 7, 4, 11, 11, 2, 12, 8, 3, 16; sum 86 |
| Modules per layer with no in-layer use, which could start at layer open under the strict rule | 1, 4, 4, 6, 2, 3, 2, 2, 2, 1, 11 |

Three differences from the requirement.

1. **Order.** The requirement orders jobs by module. P3 orders them by layer only. 182 modules run ahead of or beside something they use.
2. **Notification.** Under the requirement's order, every user of a module comes later, so its job has not yet run in this pass when the provider's interface changes. Under P3 a user may already be running or merged, so an interface change means rework. Process3 ran P3's form and had 338 repeat landings and 2,707 notifications. P3 keeps that form and N7 removes the notification that repaired it.
3. **The cost the proposal cites.** P3's "about four days" is 65 links times about 90 minutes: some 30 minutes of job and up to 60 minutes waiting for the proposal's own hourly wake (C2). 65 hours of the 97 are the wake. For comparison, Process3 took 4 days 5 hours from its first layer close to its eleventh, with every layer's jobs started together.

**What the notification clause costs on this map.**

| Users of a module | Median | Mean | 90th percentile | Maximum |
| --- | --- | --- | --- | --- |
| Direct (modules that declare a use of it) | 8 | 14.2 | 31 | 213 (`setup-words`) |
| Transitive (users, their users, and so on) | 70.5 | 79.0 | 162 | 217 (`setup-words`) |

27 modules have no users. Among the 193 that have any, the medians are 10 direct and 82 transitive. 28 modules have 24 or more direct users, so one interface change in any of them notifies more modules than the proposal's bound allows jobs. The most-used providers: `setup-words` 213 direct, `test-support` 153, `record-grammar` 132, `record-core` 116, `membership` 116. Process3's measured mean of 15.2 notifications per notice matches the direct mean of 14.2, so Process3 notified direct users.

## 4. Requirement 4: parallel jobs under a bound the owner changes

> The build plan is designed around parallel jobs running, with the concurrent job count bounded by a user-changeable number.

### 4a. Clauses

| Id | Clause | Test |
| --- | --- | --- |
| 4a | The build plan is designed around parallel jobs | The plan states which jobs run at once and is laid out for that |
| 4b | The concurrent job count is bounded by a number | A number of jobs, and the count does not pass it |
| 4c | The number is user-changeable | The owner changes it, and by requirement 1 he does so with a setting |

### 4b. How the Foundations and Ledger meant it to be met

- P10: "all the module jobs of a layer run concurrently". Its note: "Keep concurrency, which was lost and is why Phase 2 planned only two jobs".
- A job's life 1: "as many at once as the live-session limit allows".
- Platform section: "at about 50 live sessions the account stops starting new ones, while the create call still reports success. So the process keeps at most 24 live sessions by default, and BOB fills that room with jobs for the ready work; BOB may raise or lower that number from what it measures, and records each change (your word, 1 Nov)."
- Unattended condition 4: "The live count stays at 24 or fewer, and every new session is checked to have started."
- ARC-2: "Makes parallel jobs safe from overwriting each other."

In the Foundations the number was BOB's to change, and it counted live sessions. The restated requirement makes it the user's and makes it a count of jobs. The owner's field report gives his default as 20.

### 4c. What Process3 did

| Clause | Process3 actual | Source |
| --- | --- | --- |
| 4a | Parallel in fact: 84 distinct jobs landed on 4 Nov; 24 landings in the peak hour (7 Nov 18:00Z). On 5 Nov the merge train made landing serial: median 348 minutes from complete to merge. | product_side 2, 7; redteam 5 |
| 4b | The number moved at least four times: 24 by default; "about 6 job sessions" on 4 Nov, followed for about six hours; "session caps (jobs 4, lanes 1)" after the suspension (process PR 205, life 2.7 days); `"pacing": {"jobs": 20}` in `process/config.json` at the end. Above about 50 the platform fails silently. | causal_forensics 3C; change_sample row 205; `process/config.json` |
| 4c | The owner never set it by a setting. Sessions set it, in a config file and in handoff notes. Once a session's own number was recorded as his: "the coordinator's number recorded as Bob's agreement". | causal_forensics 3C, 4.1 |

### 4d. What the proposal says, clause by clause

| Clause | Result | The proposal's words |
| --- | --- | --- |
| 4a designed around parallel jobs | MET, by breaking 3e | P3: "A layer's jobs start together." C2: "room for about 576 job starts a day against a peak of 135 landings". G5 sizes the gate for 24 landings an hour. The width comes from running users beside their providers. |
| 4b bounded count | PARTLY | C12: "Live sessions stay at or below 24, and ARCH archives a job's session when its pull request merges." Held by "ARCH's pinned text; count on the daily report". It counts live sessions, which includes ARCH and may include idle sessions (test 5 does not yet know). It is a sentence ARCH is asked to follow. Known limits: "a job is not physically prevented from starting a session." N7 deletes the "six-job limit". |
| 4c user-changeable | CONTRADICTED | The number 24 is written into ARCH's pinned text. Changing it means a pull request from a fork to the process repository, merged by the owner, inside a 4,096-byte cap, and N2 allows "One process version per run". The proposal's number is not the owner's default. |

Items that touch requirement 4: C2, C12, P3, G5, G7, N2, N7, the daily report ("live sessions"), test 5, Known limits.

### 4h. Where the bound lives, who can change it, and whether that is a setting

| Question | Answer |
| --- | --- |
| Where it lives | In the ARCH text in the process repository (C12), pinned into the product at one commit per run |
| What it bounds | Live sessions, not concurrent jobs |
| What enforces it | Nothing. ARCH reads a sentence; the daily report prints a count the next day |
| Who can change it | The owner only, by merging a process change that a session drafted in a fork |
| When | Between runs, or mid-run as a counted process version |
| Is that a settings change | No. It is a merge of a file change |
| The admission table's correction | "The bound is a repository variable in GitHub's settings, which is a setting you change". No item carries it. A repository variable is a GitHub setting, but it is not a permission or a rule. Whether the sessions' collaborator account could change a repository variable itself was not tested in any evidence file, and GitHub's API documentation is worth checking on that point before it is relied on |
| Other bounds the owner does not hold | About 50 live sessions on the account, failing silently (measured 1 Nov). 20 concurrent Actions runners on the Free plan, which the proposal's gate budget exactly fills at 24 landings an hour (G5) |

## 5. The five interruptions

### 5.1 Permissions

| | |
| --- | --- |
| Items | Six conditions 3 ("Refusals come from GitHub. The tool that remains reads and prints."); N1; working agreement 2 ("You may do these without asking: the listed acts for your role"); G3 (approvals rewritten to name auto-merge); C7 (deny lists); C11 (approvals fingerprint removed); G10 (secrets out of sessions); N7 (deletes "tranche-open grant trials", "settings rollback refusal"); tests 1, 3, 5, 6 |
| Physical | Deleting the tool's 818 stop sites. Deny lists, which remove a tool from a session (measured 1 Nov). GitHub rulesets |
| Text only | The list of acts needing no permission. The approvals in `CLAUDE.md`, which are text the classifier reads (0 refusals in about 450 acts in Process3) and which only the owner's hand may write |
| Left unaddressed | A session paused by three refusals "waits for a person" (measured); the proposal removed the sweep and watcher that caught it and added only ARCH's hourly look at jobs. The 20-refusal hand-off in Auto mode. New dependence on judged acts that the Foundations ruled out: archiving (C12, C6), task switching (G9, C3), workflow dispatch (F1), a task's fresh session starting sessions (measured 0 of 3). PLT-9's check that a missing grant stops a tranche at its open is deleted, so a missing grant is met mid-run. Every missing approval is an owner file edit. G2 adds a new refusal: any job that needs to touch a walker step or a workflow now stops at the owner. The claim "Of 508 landings in Process3, none touched these paths" sits beside the feasibility review's finding that the walker is "a module that jobs edit" and that its step count moved from 238 to 357 in one round; the two were not reconciled |

### 5.2 Claude laziness: stopping short of work it could do

| | |
| --- | --- |
| Items | The proposal answers a different question. "Lazy: not in effort ... The laziness is in diagnosis." Working agreement 3 and 7; R15 ("'Never idle' is no longer a fault of the session"); C2 (hourly wake); C6 (stuck work is ARCH's hourly work); G8 (watchdog); N1 (status prints what is ready); C9 (jobs at medium effort) |
| Physical | The hourly task and the 30-minute watchdog are platform schedules. Both detect; neither makes a session continue |
| Text only | Working agreement 7: "Push before you stop. When you are done or blocked, say so and stop; stopping with nothing to do is correct." |
| Left unaddressed | A job that ends its turn with work unpushed is "invisible to status" (R14, graded Weakened). A job that stops mid-work waits for "open too long" plus up to an hour. ARCH starting some ready jobs and ending its turn has no check until the next hour. GAP-5's event wake, P18's preparing of the next round, and P19's "BOB never idles while work remains" are dropped. Nothing separates "nothing to do" from "stopped short" except the next hourly read of status. In the small start there is no wake at all. N7 deletes the idle alarm with no replacement |

### 5.3 Handoff scanning

| | |
| --- | --- |
| Items | "What is fundamentally different" 2 ("There are no handoff notes, no long-lived coordinator and no carried memory"); C1; C3 (fresh session per wake); C8 (auto memory off); M1 (4,096-byte caps); M2 (one charter page); G7 (state from branches and pull requests); N1; N7 |
| Physical | Deleting the roles that wrote handoffs. Byte caps "held by a required test" in the process repository |
| Text only | "Each ARCH wake starts from the pinned text and the repository's state" |
| Left unaddressed | The preferred form rests on a platform behaviour Process3 measured failing, 0 of 3. In the fallback, ARCH is one resumed session whose context grows until the owner replaces it. Two new places a fresh ARCH must read have no cap and never shrink: the questions issue (M5: "the answer is on the page") and the process log (N3). START bodies can grow ("Visible, not walled"). The byte cap is a required check in the process repository, but the product's `CLAUDE.md` lives in the product repository, whose gate runs "Nothing else"; that file is 8,664 bytes of owner approvals today, the cap is 4,096, and run 0 asks him to add to it. The cost of a fresh ARCH re-reading everything each hour was never measured (SES-16: "No comparison arm") |

### 5.4 Every utterance becoming a rule until the rules overflow

| | |
| --- | --- |
| Items | M4 ("Your word is what your GitHub account wrote"; a chat remark "lapses at the end of the run"); working agreement 6 ("A question from Bob is a question"); G1, G2 (sessions cannot write the process); M1, M2; N4 (at most three changes, net zero); the rename to ARCH; "What is fundamentally different" 4 |
| Physical | Sessions cannot merge into the process (collaborator setting). Byte caps. GitHub authorship as the record of who said what |
| Text only | Working agreement 6. "Sessions quote it with a link and never paraphrase it as yours" |
| Left unaddressed | M4 makes the owner write on GitHub for any word to last, which requirement 1 excludes. The questions issue is a rulebook by another name: every answer stands for ever, nothing expires, nothing caps it, and ARCH must read all of it not to ask twice. Rule text can still grow where sessions write freely: the round plan and module map (P4: "not guarded"), requirement files ("not walled"), START bodies, and the product's existing `build/rulings.md`, `build/rulings-active.md` and `DECISIONS.md`, which P1 does not clear. The cap bounds size and does not say who removes; removal is the owner's choice at a retrospective. The admission table's correction, "Claude may change the process only inside fixed limits ... To add, it must remove", is by the proposal's own word "unproven" and rests on "one case" |

### 5.5 Over-caution piling up tests, reviews, gates and checks

| | |
| --- | --- |
| Items | G1, G2 (sessions cannot add checks to the process); G4 (gate is tests, the revert check and three narrow checks); G5 (50 runner-minutes per landing); six conditions 2 and 5; M1; N1 (status "cannot refuse", 500 lines); N2; N4; N5 ("Whatever misfired is removed by default"); N7; C9; C10 (review on a trigger, five findings); working agreement 5; the signs table |
| Physical | The collaborator wall. The code-owner ruleset, if test 2 passes. Line and byte budgets held by required tests in the process repository |
| A number only | G5 is "Number on the daily report" and stops nothing. Test lines against source lines is a line on the report |
| Text only | Working agreement 5. C10's "at most five findings". C9's effort levels |
| Left unaddressed | The outlet the proposal itself names first: checks moving into the product's own tests (Process3: 43,882 test lines against 23,090 source, 11,410 of them serving the process). Nothing bounds it; the owner is to notice a ratio. The revert check stays, although 61 block texts named it and it once removed real test repairs. "Sessions will still hesitate, over-ask and over-test inside their own work" (Known limits). N5 removes a misfiring check only at the retrospective; during a run it keeps blocking until the owner merges. The proposal adds gates of its own around the run: seven tests, a replay, code-owner review, a regression and walk required at close, nine daily numbers, six signs, a retrospective. The pile moves from the tool to the run's edges and to the owner. The retrospective is still a channel that brings up to three changes every run |

## 6. Summary

### (i) Clause by requirement, Process3 and Process4

| Clause | Required | Process3 actual | Process4 proposal |
| --- | --- | --- | --- |
| 1a | Owner enters no commands | Started sessions; switched tasks off by hand | **CONTRADICTED.** Creates the hourly task, starts ARCH, commissions sessions, enters a setup script |
| 1b | Owner edits no source files | 16 + 14 approvals edits; one settings-file edit | **CONTRADICTED.** Rewrites approvals in `CLAUDE.md`; "your own edits"; budget numbers |
| 1c | Only GitHub or Cloudflare permission and rule settings | Mostly words: 159 Ledger decisions, 36 or more questions | **CONTRADICTED.** 8 of 36 acts allowed; 3 borderline; 25 not |
| 1d | Very occasionally | Every one of nine days | **CONTRADICTED.** Daily report; an hour per run; per layer close in the fallback; twice a day in the small start |
| 2a | Runs unattended | Ran round the clock; ended by an approvals edit | **CONTRADICTED** in the recommended start and the fallback; the preferred form rests on a behaviour measured failing 0 of 3 |
| 2b | No block while work is possible | 9.3 hours silent; 348-minute median merge wait on 5 Nov | **PARTLY.** Workaround-and-carry-on for a job; up to an hour idle at every step; "never idle" dropped |
| 2c | Waits for the owner only when completely blocked | About nine hours and seven hours waiting on him needlessly | **CONTRADICTED.** 12 of 22 waits are for the owner while work is possible; 16 end only when he acts |
| 3a | One total order | 220 modules in one list | **PARTLY.** Restated; nothing holds it; the map is unguarded |
| 3b | Services used only by later modules | 3 of 3,120 uses point later; one cycle; all new in Process3 | **PARTLY.** The kept check compares imports with the map, not positions |
| 3c | One job per module | One at a time enforced; 3.0 landings per job | **PARTLY.** "One module or item"; exclusivity and the ownership check are gone |
| 3d | That job updates and tests | Yes; 26% of new test lines served the process | **MET**, weakened (R11) |
| 3e | Earlier modules' jobs before later | By layer only; 46 deferrals; layer 3 closed before 2 | **CONTRADICTED.** P3: "A layer's jobs start together"; 182 of 220 modules run beside something they use |
| 3f | Interface change notifies all users | 178 notices, 2,707 notifications, 15.2 each | **CONTRADICTED.** N7: "Deleted with no replacement" |
| 3g | Users' jobs updated as necessary | 90% "not affected"; 241 affected; 441 answered | **NOT ADDRESSED** |
| 3h | Users' jobs tested | Users' suites in the provider gate: +7.6 minutes, 0 of 20 catches, reverted | **PARTLY.** A scheduled whole-product regression, not tied to the change |
| 4a | Plan designed around parallel jobs | 84 jobs landed in a day; 24 landings in an hour | **MET**, by breaking 3e |
| 4b | Concurrent jobs bounded by a number | 24, then 6, then 4, then 20; set by sessions | **PARTLY.** "24" live sessions, as a sentence; nothing enforces it |
| 4c | The owner changes the number | Never by him; once a session's number was recorded as his | **CONTRADICTED.** Fixed in pinned text; changed by a merge |

Totals: MET 2 (3d, 4a). PARTLY 6 (2b, 3a, 3b, 3c, 3h, 4b). NOT ADDRESSED 1 (3g). CONTRADICTED 9 (1a, 1b, 1c, 1d, 2a, 2c, 3e, 3f, 4c).

### (ii) Proposal items that must change, most serious first

Each line says what would have to be true. No mechanism is proposed.

1. **G1, N2, N4, six conditions 1, "What is fundamentally different" 1, Known limits ("Your merge is the last wall"), "What reaches you".** No change to the process, at setup, during a run or between runs, needs the owner to merge, review, commission or read anything; whatever keeps the process from growing holds without him.
2. **N7 (notices), "Ledger lines that end" (GAT-3), G6.** When a merged job changes a module's interface, every module that declares a use of it has its job opened or updated and is tested against the change, and the cost per change stays small.
3. **P3, and R17's grade of "Met".** No module's job runs ahead of the jobs of the earlier modules it uses, and the plan states the parallel width that leaves.
4. **"Start smaller than this" (item 4 and its closing paragraph) and C3's fallback.** The form the process runs in from its first run needs no person between start and completion, overnight included, and no form needs the owner at a layer close.
5. **C2, C3, C4, C6, G8.** When ARCH or a job stops short, pauses on refusals or dies, the process recovers by itself; ready work does not wait a built-in hour; and starting or replacing ARCH is not an owner act, or is named as the one act the platform forces.
6. **G2, F2, C7, C10.** Nothing in the product's routine flow (the pin, walker steps, settings, workflows) waits for the owner's review.
7. **G3, run 0 step 5, C11.** Sessions' needed acts are authorised without the owner editing a file, or the approvals edit is declared the single platform-forced exception, made once and not at every change.
8. **C12.** The bound counts concurrent jobs, starts at the owner's number, is changed by him with a setting, takes effect in a running process without a merge, is not changeable by a session, and is enforced by something other than ARCH reading a sentence.
9. **M4, M5.** A question never stops work that can proceed, and the owner's word does not have to be written by him on GitHub to count, or that channel is explicitly exempted from requirement 1.
10. **N2, N4, N5, M6.** Product work does not stop at the end of a run to wait for a retrospective he commissions.
11. **Run 0 steps 1 to 5, the seven tests, C7, C8, G9, G10, G12, N8.** Every setup act of the owner is a GitHub or Cloudflare setting, or is listed as an exception with the measured platform fact that forces it.
12. **G8, the daily report, "Signs that it is going wrong".** Failure is found and answered without the owner reading a report or an email.
13. **C4, G4.** At most one job exists per module at a time and a job changes only its own module, held by more than a sentence.
14. **G4, P4.** A declared use of a module at the same or a later position is rejected; the three in the map today are repaired.
15. **M1, M2, M5, N3.** Everything ARCH must read at a wake is bounded, the two issues included, and the cap on the product's `CLAUDE.md` is one the file can meet.
16. **Run 1 and its five measures.** The first run's stated test exercises the four requirements: owner acts that are not settings counted against zero, an unattended span that includes a night, an interface change reaching its users, and the bound changed while the run is live.
17. **R3, R6, R15, R17 in the R1 to R25 table, and the count "meets 19, weakens 6".** The grades match the clauses above.

### (iii) Where the requirements pull against each other or against a measured platform fact

1. **Order (3e) against parallel jobs (4), on this map.** Under "a module's job starts when the jobs of all modules it uses have merged", a median of 3 and at most 12 modules are ready at once over 65 waves, and a bound of 20 never binds. The width Process3 had (up to 62 at once) came from running 182 modules beside something they use. The owner's own kept principle P10 says "all the module jobs of a layer run concurrently". Both cannot hold on the present map. The choice is his: the literal order with a narrow build; order by layer with notification doing the repair; or a different map. Read as "module k waits for module k minus 1", the requirement allows no parallel jobs at all.
2. **Order (3e) and notification (3f to 3h) fit each other; layer-at-once and cheap notification do not.** Under the literal order every user's job comes after its provider's, so a notice reaches a job that has not started. Under layer-at-once a notice reaches jobs already running or merged. Process3 measured that second case: 2,707 notifications, 90% "not affected", 338 repeat landings.
3. **Notification to "all users" against velocity.** A median of 8 direct users and a maximum of 213 per interface change; 28 modules have more direct users than 24 jobs. When users' suites ran with the provider's change, Process3 measured +7.6 minutes median with 0 catches in 20.
4. **Requirement 1 against the approvals channel.** Measured 2 Nov: consent quoted in a starting prompt was declined 11 of 11 times; "your committed CLAUDE.md is the one channel that reaches sessions you do not start"; "No session writes, edits or relays them, because the judge refuses that". So on the platform as measured, sessions that other sessions start act only on a file the owner edited himself.
5. **Requirement 1 against starting anything.** "Creation only by you, ROOT or a scheduled task." A scheduled task's fresh session "cannot start sessions or send messages, 0 of 3". Someone has to start the first session and create the first task, and the cloud environment's variables, secrets and setup script are set in Claude. None of these is a GitHub or Cloudflare setting. The requirement as worded has no place for Claude-side settings.
6. **Requirement 2 against the refusal pause.** "After three refusals in a row a session stops and waits for a person"; Auto mode also hands a session to a person after 20 refusals. Process3 replaced such sessions with a sweep and a watcher; the proposal deleted both. Recovery without a person needs acts (archive, task switching) that the classifier judges case by case and that the Foundations ruled "never needed for correctness".
7. **Requirement 1, requirement 2 and "sessions cannot change the process" form a triangle.** The proposal's one physical defence against the Process3 loop is the owner's merge. Remove the merge (requirement 1) and either sessions can change the process again, or a process defect cannot be fixed with no one watching (requirement 2). The proposal's stated way out, hard limits in place of the merge, is by its own words "unproven" and rests on "one case". The owner should decide which corner gives.
8. **"No handoffs" against the platform.** A long-lived ARCH accumulates context and must be refreshed, which brings back handoffs or an owner replacement. A fresh ARCH per wake needs a task's fresh session to start sessions, measured 0 of 3. Only one subscriber may hold a pull request's events, so ARCH cannot be woken by them while jobs are.
9. **Requirement 4's "user-changeable" against requirement 1's "permissions or rules".** A number is neither. A GitHub repository variable is a setting he can change without a command or a file edit, but it is outside the two kinds of setting requirement 1 names. Above his number sit two ceilings he does not set: about 50 live sessions, failing silently, and 20 concurrent runners on the Free plan.
10. **Requirement 2 against two of his own rules.** A public release waits for his approval (GAP-7), and stop is his. Both are owner waits by design, and the release approval is a click, not a setting.
11. **Requirement 3c against the work of run 1.** "Each module is updated and tested by a single job", while the next work on the product is completion items and walk fixes that cross modules, and the proposal's job is "one module or item".
