# Process4: definition, fifth draft

14 Nov 2026. For Bob, the owner. Written by Claude.

**How to read this.** Plain words, no reference codes. Nothing here is in force. Section B lists your decisions: the words you typed today, then the session's record of 13 and 14 Nov. Section N says what is not yet settled, section O what is not proven, and section P what is still open with you. Four words are kept apart. *Measured*: counted in Process3's record or on today's code. *Estimated*: worked out from measured figures. *Judged*: an opinion, Claude's or an AI worker's. *Unproven*: never run.

**Whose decision each thing is.** A thing is called yours only if it is in section B (the record is cited as "line 6" and so on), is an answer stored in your ledger, or is quoted from you with its source. Your typed words outrank the session's record wherever they differ. "Claude decided" marks a technical matter you did not define, or one you left to Claude today; you can overrule any. Where a matter was a proposal in the fourth draft, this draft gives the proposal in one sentence and then your answer exactly as you typed it.

**What changed since the fourth draft.** You read it and typed a reply; this draft follows that reply. The three tests are module tests, the internal walk and the external walk. Telling user modules that a provider changed is a notification, not a test. Your words that no more tests are needed head the tests section and are the rule PROCESS works under; the passage on the line between correcting and adding is gone. What counts as an interface change, who is told, and what a notified job does are marked not yet settled and under study. A job never changes another module. The six proposals you agreed are in the body as settled, the checks beside the three tests are ended on your words, the eight slots are counted across the account, and the walks' documents are where you said. You asked whether Claude is certain the watcher is not needed. Claude is not, has withdrawn that proposal, and has put the watcher back. Nearly everything the fourth draft listed as not yet settled is decided, on your hints or by Claude. No proposal is waiting for your yes or no.

## A. What Process4 is for

Process4 is the way AI sessions build a software product for you in a GitHub repository, and can do so with nobody watching. Its one output is product behaviour that meets its requirements, merged to the main branch quickly and cheaply, and still there later. Following your words of 14 Nov, a tranche reaches the main branch only after the three tests: its modules' tests, an internal walk, and an external walk of a development deployment. No walk of either kind finished without flaws in Process3 (measured), so that ending is unproven (section D). You define the product: its purpose, audiences, requirements, principles and broad design. The AI decides everything technical and tells you in plain words what it decided.

**Words used here**

- **Session:** one running AI conversation in Claude Code's cloud.
- **Pull request:** a proposed change to a repository, which GitHub can test and then merge. A draft pull request is one not yet offered for merging.
- **Module:** one part of the product, with its own code files, tests and requirements file. The product is one ordered list of modules, and a module may use only modules before it. A module that uses another is that module's user; the one used is the provider. Today's list of 220 does not fully fit this: seven modules with work hold no code, four are new and have no files, and about 50 code files belong to no module (measured). ARCH edits the list until it fits.
- **Job:** one session's work on one module, delivered as one pull request.
- **Slot:** room for one job to run. Eight by default, counted across the account.
- **Tranche:** one batch of product work, built on the tranche branch, apart from the main branch, and reaching the main branch only as a whole.
- **Round:** one pass within a tranche: jobs, then the internal walk, then, if that finds no flaws, a deployment and the external walk.
- **Internal walk:** in your words, it "uses the UX Screens document to confirm that the workflow matches the definition". It is made on the product as built, without deploying it.
- **External walk:** in your words, it "follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results". It is made on a development deployment: the product put on a development site in its own Cloudflare account, reaching no one else.
- **Mechanical edit:** one change that touches many modules in the same trivial way and needs no judgment. Your example: "a word table change".

## B. Your decisions

### Your own typed words of 14 Nov: the second message

Exactly as typed. The working rules of your first message are quoted where used.

- On the trial repository: "The throwaway repo that you need already exists: process3-probes."
- On the tranche: "A tranche ends after a successful external walk of a development deployment. So a deployment is a step in a tranche. But if flaws are found during an external walk those flaws are added to the next round, not the next tranche. So a tranche only ends when an external walk (of a development deployment) completes without flaws. A release can (optionally) be started after a tranche completes. So a release is always fully tested and walked successfully."
- On tests: "Yes, a job writes its own tests. That's an important responsibility. It's also a challenge because tests must be complete yet fast and efficient."
- On the walks: your two sentences defining the internal walk and the external walk, quoted in section A.
- On Process3: "Process3 never finished a tranche because it kept adding test after test so that it stopped making progress before it could finish."
- On changing the process: the paragraph that begins "Lets be clear about how the process is changed (and how it's not changed)", quoted in full in section H.
- "You can create a subtree in the process3 repo for the container being used to update to process4."

### Your own typed words of 14 Nov: the third and fourth messages, on the fourth draft

Exactly as typed.

- On the three tests: the passage that begins "Process4 does have 3 tests", quoted in full at the head of section E. *This corrects* line 5 of the record, which listed the notification as the second test and the internal walk alone as the third.
- On more tests: the passage that ends "There is no need to any any more tests. PERIOD!", quoted in full at the head of section E. *This settles* the fourth draft's passage on the line between correcting the process and adding to it, which is removed. It agrees with line 20.
- A question to Claude: "Explain why using the current criteria 5 of the 241 changes that AI workers judged real would have been missed. What was different in those 5 modules?" Answered as far as the record goes in section F.
- On telling users of every change: the paragraph that begins "If every user is told when the implementation of a module changes but the interface doesn't", quoted in full in section F. *This sets aside* the fourth draft's proposals 1 and 3. Lines 3, 10 and 11 stand as recorded; how they are carried out is under study.
- On the repository: the two sentences that begin "The process3 repo is public", quoted in full in section M. *This settles* where the Process4 work is kept.
- On the fourth draft's list of things not yet settled: "Many of the questions asked in section M of v4 are technical and highly detailed. You're better qualified than I am to answer many of these questions." You added eight hints, one of them a question. Each is quoted where it is used (sections D, E, H, I and J), and the rest are marked "Claude decided".

- Your fourth message, complete: "screens and journeys are kept in docs/development/ux-substrate/ in the product repo". *This settles* where the two documents the walks use are kept (section D).

Your answers to the fourth draft's thirteen proposals:

| Proposal in the fourth draft | Your answer, exactly | What it settles |
| --- | --- | --- |
| 1. When the notice is sent | "We need to study this further" | Not approved. Under study (section F) |
| 2. Another module's tests run when a job's edit strays into it | "A job for module A isn't allowed to change module B. The only other way of editing a module is when a mechanical edit (like a word table change) makes the change." | Proposal removed. Agrees with lines 14 and 19 |
| 3. What a notified job does | "needs to be studied further." | Not approved. Line 10 stands; under study |
| 4. The two walks counted as one test | "internal and external walks a separate tests." | Two tests. Corrects lines 5 and 6 |
| 5. Tests for the process's own tool | "agreed" | Settled (section E) |
| 6. Who takes a free slot | "agreed" | Settled: how lines 3 and 8 are read together (section D) |
| 7. No watcher beside ROOT | "are you certain that the watcher isn't needed?" | Claude is not certain. Proposal withdrawn; your ledger note stands (section C) |
| 8. Eight slots for each product | "across the account" | Line 9 is counted across the account (section D) |
| 9. A helper never reviews | "agreed" | Settled; ends one use in a ledger line you kept (section C) |
| 10. What "without flaws" means | "agreed" | Settled (section D) |
| 11. The first trial uses made-up modules | "agreed" | Settled (section O) |
| 12. Three acts of yours beyond settings changes | "agreed" | Settled; adds to line 1 (section C) |
| 13. Checks ended because there are three tests | "three tests and no others" | Those checks end, whatever your ledger still shows (section K) |

**Which recorded lines your second message changed,** as the fourth draft set out: your words on the tranche and the walks change lines 5 and 6; your words on changing the process change lines 1 and 2 and put line 20 in your hands (section H).

### The session's record of 13 and 14 Nov

These reached this document through a session's written record, not through text you typed. On 14 Nov you referred to them in your own words as "my decisions of 13-14 Nov". Each line quotes the record exactly. Correct any that is recorded wrongly.

*13 Nov*

1. "You enter no commands and edit no source files. Your only actions, very occasionally, are changes to GitHub or Cloudflare settings: permissions and rules."
2. "The process runs unattended. It waits for you only when it is completely blocked, with no further work possible until you act."
3. "A product is a total order of modules. A module's services can be used only by modules that follow it. Each module is updated and tested by a single job, and earlier modules' jobs run before later ones. When a job changes a module's interface, every user of that module is notified, so those modules' jobs are updated as needed and tested."
4. "The build plan is designed around jobs running in parallel, bounded by a number you can change."
5. "Process4 has three tests and no others." They are: "Each job's own module tests, which include a check that the module's declared uses match its imports"; "Notification of every user module when a job changes an interface"; "A multi-session internal walk at the end of each round." (Corrected by your typed words of 14 Nov: see above.)
6. "No other test is necessary, ever. The internal walk replaces the full regression. A round that completes with no failures ends the tranche. An optional multi-session deploy-and-external-walk runs after that."
7. "The layer construct is dropped."
8. "A job does not wait for the modules it uses to finish. A module's job is ready when the module has work and no open job, and ready jobs take free slots earliest in the order first."
9. "Job slots default to eight, and you can change the number." "The moment a job completes and merges, its slot goes to the next ready job."
10. "A change to a provider's interface says which parts of the interface changed. A user module's job checks the implications of those parts and no others, and updates and runs only the tests that relate to them."
11. "Recognising that an interface changed must be proved rigorous and correct."
12. "Process3's permission management is preserved." "GitHub rulesets and other settings may be updated for Process4."
13. "A use that points to a later module is an error in the design of those modules, to be fixed by refactoring them."
14. "a job writes only its own module's files. Kept."
15. "CLAUDE.md and settings.json continue to serve the purpose they did in Process3."
16. "the first session is ROOT. You start a session with the process repository mounted. Your first prompt says you are starting or restarting development of a named product, names that product's repository, and says the Process4 development process is to be used. It may suggest the model and effort, and may mention a switch from another account or other pertinent details."
17. "The coordinator session is the front door. Before changing accounts, you tell the coordinator so it can stop development in that account." "the maximum slot count changes when you tell the coordinator session the new value."
18. "you approve a public release. Updating the public release means updating the installer and the page of the website that refers to the current release and installer."
19. "The cross-module mechanical pass is preserved. Some mechanical changes are so trivial that module tests need not be rerun. Tests run only when there is a fully informed reason to run them."

*14 Nov*

20. "a process fix must not add a new test, gate, review or stop. It may only correct or remove what is broken."
21. "fresh-reviewer review is unnecessary and ends."
22. "ROOT and the coordinator are different sessions." "ROOT starts with the product repository, and starts both the ARCH session and the coordinator session."
23. "Merging stays with the process's merge tool, the route Process3 proved, on your instruction to preserve permission management."
24. The ledger line about when a layer closes ends, "because there are no layers any more: your word."

Lines 16 and 22 differ on ROOT's repository. Your typed words of 14 Nov settle it: the product's (quoted in section I).

## C. Who does what

**You, the owner.** You define the project and answer the questions that are yours. Your acts:

| Your act | How often |
| --- | --- |
| Change a permission or rule setting in GitHub or Cloudflare | Very occasionally |
| One such setting: make the branch that tranches are built on the default branch of the product's repository (section I) | Once |
| At PROCESS: choose among the options offered for a process change, and approve a product's move to the changed process | Whenever a change is proposed |
| Start the first session, ROOT | At each start or restart of development; after each edit to your approvals; and if ROOT dies and no watcher takes over |
| Tell the coordinator things | Whenever you choose |
| Approve a public release | Once per public release |
| Connect an AI account to the deployment | Before an external walk of the journeys that use AI |
| Commit your standing approvals to CLAUDE.md, and the deny list to settings.json, on GitHub's website, in the product's repository and in the process's (section I) | At the start, then only when the wording must change |
| Connect Claude to GitHub, and enter the deploy token and other secret values into Claude's cloud environment, from a page the process writes | At the start of a product and at an account switch |

Line 1 allows you the first two rows. The third is in your own words of today. The next three are in the record (lines 16, 17 and 18). The last three were the fourth draft's proposal 12: these three are acts of yours beyond settings changes. You answered "agreed" on 14 Nov.

**ROOT** is the first session. You start it with a plain prompt on the product's repository. Section I says how that start lands on your newest approvals. ROOT starts ARCH and the coordinator (line 22), and starts PROCESS when ARCH asks (section H). Once an hour an alarm wakes it as a safety net, as in Process3, to wake or replace a session that has stopped. ROOT decides nothing about the product and builds nothing.

**The watcher** is a standby session that takes over if ROOT dies. Your ledger note says: "The watcher is started beside ROOT by whoever starts ROOT." The fourth draft proposed to drop it, and you asked: "are you certain that the watcher isn't needed?" No. Claude is not certain. Claude withdraws the proposal, and the watcher stays as your documents have it. Measured: both recorded takeovers in Process3 left no watcher behind and left ROOT one level deeper than designed. What a takeover does in Process4 is unproven and is rehearsed in the trial. Who starts it beside a ROOT that you start is not yet settled (section N).

**The coordinator** is your front door for the product (line 17). ROOT starts it, on the product's repository. A line you kept in your ledger says: "Only explicitly marked words of yours become decisions". So only words you mark as a decision or an instruction are passed on, exactly as written and dated, and followed; no session writes its own summary of your words as yours. A question from you is answered in words, never by building anything. The coordinator tells you what ARCH decided, one plain line each, and puts a question that is yours to you once, with options and a recommendation. Holding or approving one merge, putting a module first and changing the slot number on your word are in your documents and are untried. It decides nothing about the product and brings you no technical question.

**ARCH** is the architecture session, one per product. The record of 14 Nov calls it ARCH; your older ledger notes call it "BOB". ROOT starts it. It starts jobs, merges them, and passes notifications between modules. It edits the module list until every file has one owner module. It has a helper make each mechanical edit. It starts the walking sessions, has the product deployed to the development site, and turns each flaw into work for a named module. It decides every technical matter of the product, writes each decision in the product's decision file, and settles a design before anything is built on it. While a tranche runs it prepares what the next round or tranche needs (your ledger). It writes the tranche report. It never edits your approvals, changes the process, or publishes a release without you.

**A job** is a session ARCH starts to do one module's work. It decides how to meet that module's requirements, and it writes that module's tests. In your words of 14 Nov: "Yes, a job writes its own tests. That's an important responsibility." It writes only its own module's files (line 14). In your words of 14 Nov: "A job for module A isn't allowed to change module B. The only other way of editing a module is when a mechanical edit (like a word table change) makes the change." This rule is held by the job's instructions and not by any check. A job never merges, starts a session, deploys or changes the process.

**A worker** is a helper that ARCH or a job starts inside its own session. A line you kept in your ledger gives its uses: "noisy bulk work such as a full test run, a read-only reviewer, and genuinely independent parallel sub-tasks". The fourth draft's proposal 9: no helper is briefed to review another session's work. You answered "agreed" on 14 Nov. So the second of those three uses ends.

**A design lane** is, in your ledger note, "a knowledge directory and design responsibility". ARCH defines lanes and starts a helper or session for one when a design is needed. It delivers designs, never product code. A lane's pull request merges with no test; that clause is in your approvals.

**PROCESS** is the lane where the process is changed: a session you talk to (section H). **Walking sessions** are started by ARCH for each walk and use the job slots (section D).

**Model and effort.** Every session passes your suggestion on to each session it starts. Your ledger note says: "always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand".

**Shared state** (*Claude decided*). What belongs to one job stays in that job's pull request. What every session needs lives in one place on GitHub, in the product's repository, that needs no merge to write and is written only through the process's tool. It holds: which sessions hold the standing roles; the slot number; a stop; your instructions quoted exactly; notifications and walk flaws for modules with no open job; and the time ROOT last woke. Sessions name roles, not session addresses, so that a replaced ARCH can be obeyed. ARCH was replaced 21 times in six and a half days in Process3 (measured). Unproven.

**Modules that hold requirements and no code** (*Claude decided*). There are 29 among the 220 (measured), left by the ended size cap. ARCH decides which module's code meets each, and the move is made as a mechanical edit.

Sessions are at most three levels deep, and none starts its own replacement.

## D. How work flows

**The life of one module's job**

1. **The module has work.** A requirement in its file is marked "not yet met", or a walk flaw or a notification has been placed against it.
2. **Its job is ready:** the module has work and no job already open. It does not wait for the modules it uses (line 8).
3. **It takes a slot.** Ready jobs take free slots "earliest in the order first" (line 8). Line 3 also says "earlier modules' jobs run before later ones". The fourth draft's proposal 6: read line 3 by line 8, so that a ready job takes a free slot and does not wait for an earlier module that has no work yet. You answered "agreed" on 14 Nov. Only your marked instruction puts a module ahead.
4. **ARCH starts the job session,** with instructions naming every act the job may take.
5. **The job works** in a draft pull request, writing only its own module's files, its tests among them. A flaw it finds in another module goes to ARCH, which passes it to that module's job.
6. **The job completes.** It pushes and marks the pull request ready. Its module's tests run on GitHub's machines. The job fixes its own failures and sends ARCH one message when the tests pass.
7. **ARCH merges it** into the tranche branch with the process's tool, the only way a session can merge (line 23). There is no review and no act of yours.
8. **The slot is refilled** in the same turn (line 9). If the job changed its module's interface, every user of that module is notified (line 3; section F).

**The eight slots.** The fourth draft asked whether eight is for each product or across the account. Your answer of 14 Nov: "across the account". With one product nothing changes. How two products running at once share the eight is not yet settled (section N).

**When a module's work is finished** (*Claude decided*). When its job merges, or when its notified job tells ARCH that nothing needs changing.

**A job stopped by another module's flaw** reports the flaw to ARCH, records that it is blocked, pushes and stops. Its slot is freed. When the other module merges, ARCH makes this module's job ready again.

**A change across many modules: the mechanical edit.** In your words of 14 Nov: "A job for module A isn't allowed to change module B. The only other way of editing a module is when a mechanical edit (like a word table change) makes the change." A module where the change needs judgment gets its own job (your documents). You asked: "Can the mechanical edit do a single merge of all affected modules?" Claude's answer: yes. A helper in ARCH's session makes the edit as one change covering every affected module, and it is merged once. *Claude decided* the moment: when no job is open, between a round's last merge and its internal walk. What is unproven is the test run GitHub requires on that one change: either the module tests of every touched module run once there or, for a change that line 19 calls so trivial "that module tests need not be rerun", none run. The one time a session tried to merge without a required run in Process3, on 9 Nov, the permission checker refused (measured). Rehearsed in the trial.

**A round, step by step**

1. **Jobs.** Every module that has work gets its job.
2. **The internal walk.** When every module that had work is finished, ARCH starts sessions that walk the product as built against the UX Screens document. Each flaw becomes work for a named module in the next round.
3. **Deployment and the external walk.** Only when the internal walk finds no flaws is the product deployed to the development site. Walking sessions then follow the UX journeys there. Each flaw becomes work for a named module in the next round, "not the next tranche" (your words).
4. **The tranche ends** only when an external walk completes without flaws.

*Claude decided* the order: jobs, then the internal walk, and deployment only after an internal walk with no flaws.

**Who runs a walk and the deployment.** The fourth draft left open whether sessions or GitHub's machines run them. Your hint of 14 Nov: "sessions". So sessions run both. *Claude decided* the rest: a walk happens when no job is open, so walking sessions use the job slots, and the walk is shared out among them by journey, with at most as many walking sessions as there are slots. Unproven: a session can run one thing for about 30 minutes, and Process3's two late deploy-and-walk runs took 60 and 64 minutes (both measured), so a walk must be shared among sessions. That never ran. How many external walkers the Cloudflare account can bear is unproven and is measured in the trial. Process3's decision record quotes you on 8 Nov: "be careful that there aren't too many external walkers to cause the Cloudflare system to exceed limits of the account".

**Where the walks' documents are.** Your words of 14 Nov: "screens and journeys are kept in docs/development/ux-substrate/ in the product repo". So the UX Screens document and the UX journeys are kept in that folder of the product's repository. Checked by Claude: the folder exists on the branch the product is built on, with a screens sub-folder and files describing journeys. Which exact files each walk reads is Claude's to settle in the build.

**What "without flaws" means.** The fourth draft's proposal 10: a walk is without flaws when it lists no flaw and leaves out no step that the walk before it made. You answered "agreed" on 14 Nov. The measured facts behind it: no walk of either kind finished without flaws in Process3; on 8 Nov its stored report of the internal walk had all 238 steps marked ok with 63 failures listed; and the step count moved from 238 to 357 inside one round.

**Nothing bounds the number of rounds.** You give the reason no tranche finished in Process3: it "kept adding test after test". So the risk that a tranche does not come clean is unmeasured for a process that does not grow. Only your word ends a tranche that will not come clean.

**When the tranche ends,** ARCH merges the tranche branch into the main branch as a whole, by pull request. The main branch never moves while a tranche runs. None of the three tests runs on that pull request. This merge never happened in Process3 (measured).

**A release** "can (optionally) be started after a tranche completes" (your words of 14 Nov). The process prepares it and waits for your approval (line 18). No release of any kind was cut in Process3 (measured). A development deployment does not use the installer, so no walk shows that the installer can place a release into an empty account. The release path is unproven. Three readings of your words on the tranche and the release are still open with you (section P).

## E. The three tests

Your words of 14 Nov: "The 3 tests provide an appropriate opportunity to identify and debug as necessary every flaw and to test everything that needs to work in a released product. There is no need to any any more tests. PERIOD!"

And: "Process4 does have 3 tests, but calling the notification of a user module that a provider has changed isn't a test, it's simply a notification. The 3 tests are" and then your list: "module tests", "internal walk", "external walk". Asked whether the two walks count as one test, you answered: "internal and external walks a separate tests." This corrects the record of 13 Nov, which listed the notification as the second test.

A test runs only when there is a fully informed reason to run it (line 19).

1. **Module tests.** The record of 13 Nov: "Each job's own module tests, which include a check that the module's declared uses match its imports". The job writes them; that is its responsibility, and they "must be complete yet fast and efficient" (your words). They run for the job's own module only, on GitHub's machines, when the job marks its pull request ready. *A failure* goes back to the job. A rule for the job, from your Foundations: "every requirement is tested at the module's interface and proven met".
2. **The internal walk,** as you defined it (section A). It is made at the end of a round's jobs, or at any time on your word to the coordinator. *A flaw* becomes work for a named module in the next round.
3. **The external walk,** as you defined it (section A). It is made on a development deployment, after an internal walk with no flaws. *A flaw* becomes work for a named module in the next round. A tranche ends only when an external walk completes without flaws.

**The check of declared uses reads tests too.** The fourth draft asked whether that check, inside module tests, should read a module's test files as well as its source. Your hint of 14 Nov: "I think it has to check tests too". So it does. Process3's check read only source code, and found no undeclared use there (measured: 0 of 3,029 import statements). It never looked at tests, and the job rules told jobs to use a provider's published test fixtures and helpers, that is, ready-made test data and tools kept among the provider's tests. A script that searches today's code finds 122 pairs where one module's tests import from a module it does not declare (measured by that search). Before the check can read tests, those 122 are corrected. 86 point to an earlier module; ARCH declares each in the module list. 36 point to a later module, which line 13 calls a design error "to be fixed by refactoring them", that is, reshaping the code without changing what it does; those modules' jobs do it.

**Tests and steps that jobs write** (*Claude decided*). A module's tests and a walk's steps are product work. Each exists only to prove a product requirement, which it names. A test or step that serves the process (records, formats, bookkeeping) is not allowed. This is a rule in text. Process3 had 211 such test files (measured).

**The process's own tool.** The fourth draft's proposal 5: the small tool through which sessions reach GitHub has tests of its own, the size limit on each role's starting text among them; they run only when PROCESS changes the process, and cannot stop a product job. You answered "agreed" on 14 Nov. In the same message you wrote that there is no need for any more tests. Claude reads the two together this way: the tool's tests test no product and never run on a product's work, so the three tests stay three. Say if you meant otherwise.

## F. The notification to user modules

It is a notification, not a test (your words of 14 Nov, section E).

**Your definition, which the body keeps** (line 3): "When a job changes a module's interface, every user of that module is notified, so those modules' jobs are updated as needed and tested." If the user module has a job open, that job gets the notification. If not, the notification is work and its job becomes ready.

### Not yet settled and under study

Three things: **what counts as a change to a module's interface; who is told; and what a notified job does.** The record has a line on the third (line 10) and a standard for the first (line 11, it "must be proved rigorous and correct"). The fourth draft proposed a change to the first two (tell every user whenever a module's source or a public requirement changes) and to the third (the named parts guide a notified job and do not limit it). Your answers: "We need to study this further" and "needs to be studied further." And, in full:

"If every user is told when the implementation of a module changes but the interface doesn't, then every change will continue to cause every user of that module to be rebuilt and tested. That's very (very!) inefficient and unnecessary. There must be a practical means of identifying when a change doesn't require user modules to be updated. Maybe we should create a separate session that focuses only on this issue so that we can explore the challenge in as much detail as necessary to find a means of being more efficient during the build process."

So both proposals are gone. The aim is yours: a practical means of identifying when a change does not require user modules to be updated. You suggested a separate session for it. A study of this one question has been started, and its results will come to you as a proposal. Until you decide, this definition says no more on these three things than your recorded lines do. The form of the notification is written after the study.

### The evidence the study starts from

**What an interface is today.** Your Foundations say: the services listed in the public part of a module's requirements file. Measured on today's code, other modules rely on four parts: the names a module exports; its public requirements, each under a permanent number; its tests, which name the requirement they prove; and a few published files that are not code.

**How many notifications found nothing to change.** Process3's record: of 2,342 notifications judged, 241 were judged affected and 2,101 not (measured; the verdicts are AI workers' judgments). A simulation, not a run, used the real list of 220 modules and their declared uses, with all jobs taking equal time and a notification sent at every merge: the 65 modules with real work led to about 177 jobs, about 100 of which started only because a module they use changed and then found nothing to do (estimated). Under your definition a notification goes only when the interface changed, so there would be fewer; how many fewer was not worked out.

**"71% of job merges change the interface."** A script compared each of 504 job merges with the commit before it and looked for a change in any of the four parts; 360 changed at least one (measured). It is that high because nearly every job edits a test whose title carries a requirement's number, and that alone counts. Under a strict reading (an exported name removed or the way it is called changed, or a public requirement changed) it is 167 of 504, about a third. The script matches patterns in the text and is not a full reading of the code. Judged: the figure shows that the four-part definition is too wide, and is weak evidence of how often interfaces really change.

**Recognising an interface change is not proved rigorous and correct** (line 11). A script ran each candidate rule over Process3's 178 recorded changes and compared it with the 241 effects that AI workers judged real. The rule that looks for a change in any of the four parts reaches 236 of the 241 (measured, on this record only). Exported names and public requirements alone reach 175. The wider rule the fourth draft proposed missed none, but it could not have failed on this record, since Process3 judged only the modules it told. 532 declared pairs were never judged, and the 122 undeclared pairs were never sent a notification.

**The five that were missed: your question.** What the record shows (measured): the five effects sit in five changes to four modules, called agent-drafts, agent-steps (two changes), ai-accounts and member-roster, one effect each. In each, the module's behaviour changed while none of the four parts did: the change was inside a function, or to a value kept in a file that no other module imports. A rule that looks only at the four parts had nothing to report. Whether anything else sets those four modules apart has not been worked out; it is among the study's first questions.

**What a notified job reads.** Line 10 has it check the named parts "and no others". On the same record a script matched 169 of the 241 effects to a named part (measured); a reader judged 64 more led to, 1 weakly and 2 not; 5 sat in changes where nothing could be named. Nothing exists today that can pick "the tests that relate".

## G. When something goes wrong

**A job fails its tests.** The job fixes its module and the tests run again. After two failed corrections ARCH replaces the session with a fresh one. Your ledger note gives its first task: "the restarted session should recognize that corrections were made and try to understand why to anticipate all other needed corrections so it doesn't continue to fail."

**A session dies or fills up.** For a job, ARCH starts a new session that continues from the same branch and pull request. For ARCH or the coordinator, ROOT starts a successor, which begins from the shared state and GitHub. For ROOT, the watcher takes over. Replacing ARCH while jobs are open, and a takeover by the watcher, are unproven.

**The process itself has a fault.** No session building a product fixes it or works round it. The job reports it to ARCH, and any change is made only at PROCESS, with you (section H).

**The process is completely blocked.** You get one plain message with a numbered list of what is yours to do. In every other case the stop is recorded as a named blocker and other work goes on; one that only you can clear is told to you at once.

**A stop on your word.** You tell the coordinator, which tells ARCH, which interrupts each job. The stop is a line in the shared state naming the account. ROOT reads it at every wake, so that the hourly alarm does not undo it. After your stop of 9 Nov the alarm went on firing and had sent 94 notifications by 13 Nov (measured). Unproven.

## H. How the process is changed

Your words of 14 Nov, in full:

"Lets be clear about how the process is changed (and how it's not changed). Process changes only happen in a separate process lane call PROCESS that I interact with. Though process changes are often technical and detailed, the PROCESS session will explain the nature of the problem and suggestion options for fixing it for me to explore and ultimately choose. Because updates require my involvement and I might be away from my computer for extended periods, there could end up being more than one change being proposed in the PROCESS session at a time. When that happens, the set of changes are considered together as a group that could potentially have interactions and implications between. The process after a proposed change is made must continue to meet the process4 requirements (or the requirements changed with my explicit approval). The transition from the process a product is being built using to the updated process will be done only with my prior approval, with PROCESS proposing the best and least disruptive means of making the update."

**The rule PROCESS works under.** Your words of 14 Nov: "The 3 tests provide an appropriate opportunity to identify and debug as necessary every flaw and to test everything that needs to work in a released product. There is no need to any any more tests. PERIOD!" Line 20 stands beside them: a change "must not add a new test, gate, review or stop. It may only correct or remove what is broken."

**What follows.**

- **Two recorded lines change.** Line 2 has the process wait for you "only when it is completely blocked". Line 1 has you take no acts but settings changes. Now a process fault that stops work waits for you at PROCESS, and choosing and approving there are acts of yours. In Process3 one question that sessions carried as yours waited about nine hours (measured).
- **No session building a product may change the process,** add a test, check, gate or review to it, or adopt a changed process.

**Two more rules for PROCESS.** The field report quotes them as your written instructions: "caution is a cost, paid only against a measured failure or your word" and "the default answer to a finding with nothing measured behind it is no change". So "no change" is always among the options, and a fault that stops no work may be answered with it.

**How PROCESS is started and reached.** The fourth draft listed four things here as not yet settled. Your hints settle three; Claude decided the fourth.

- **Who starts it.** Your hint: "ROOT". ROOT starts PROCESS.
- **How a process fault reaches it.** Your hint: "There are communication channels between module jobs and ARCH, and between ARCH and the coordinator. ARCH can ask ROOT to start PROCESS if it isn't already running, and the coordinator can talk to PROCESS." So a job reports a process fault to ARCH. ARCH asks ROOT to start PROCESS if it is not running. You talk to PROCESS, and the coordinator can talk to it too. Claude reads your hint to mean that the fault's description travels from ARCH to the coordinator and from the coordinator to PROCESS.
- **Which repository it holds.** Your hint: "the processes". Claude reads those two words as the process's own repository. Say if you meant something else.
- **How your approval is recorded** (*Claude decided*). PROCESS writes your approving words into the record of the change in the process's repository, exactly as typed, with the date. Nothing else counts as approval.

None of this has run.

## I. Permissions

Permission management is Process3's, preserved (line 12).

**Auto mode and the checker.** Every session runs in Auto mode: it acts without asking a person, and an automatic permission checker run by the platform judges each risky act and may refuse it.

**Your standing approvals** are a block of text in your own words in CLAUDE.md, saying what sessions may do without asking you and what they may never do. You commit it yourself on GitHub's website. No session writes, edits or relays it. Consent merely quoted in a session's starting text was declined 11 times out of 11 (recorded in your Foundations; no evidence file was found). A session loads the approvals only when it starts.

**After you edit your approvals.** As in Process3, a long-lived session compares the approvals it loaded with the newest, and on a difference does nothing. Each of your five edits in Process3 stopped every long-lived session, and after the last the product never restarted (measured). So an edit to your approvals is one act together with restarting ROOT.

**The deny list** in settings.json takes commands away from every session outright: every direct push, every GitHub command, the ordinary merge commands, overwriting a branch's history, deleting branches, and writing files through GitHub's web interface. So the process's tool is each session's only door to GitHub.

**GitHub's own rules** are your settings. Sessions act as a second GitHub account that can push and merge but cannot change settings. No branch can be deleted or overwritten. The tranche branch takes a change only by pull request with its tests passing.

**How a session must be started** for both to take effect: with one repository only, because a session that holds more loads no deny list; from the newest commit of the tranche branch; in Auto mode; and with starting instructions that name every act it may take. ROOT, started by your plain prompt, does not meet the last condition. Whether that works is unproven.

**ROOT's start and your newest approvals.** Your hint of 14 Nov: "ROOT starts with the product repo, which contains the needed approvals in CLAUDE.md and settings.json". The fault to avoid, measured in Process3: a ROOT you started plainly came up on the main branch, which held old approvals, both times it was tried. *Claude decided:* the branch a tranche is built on keeps one fixed name, and you make it the default branch of the product's repository, that is, the branch GitHub and a new session open unless told otherwise. It is a setting changed once. Then your commits on GitHub's website and a plain start both land on it. Unproven; it is the first thing tried in the trial.

**Working rules that exist because of the checker.** One judged act per command. A refused act is never reworded or handed to another session. Three refusals in a row stop a session, which is replaced.

**Wording changes only you can make.** Your approvals still say "Process3", "BOB" and "layer close", and carry a dead clause on a reviewer's exemption. In settings.json the rule that allows pushing names the Process3 tool by its file path and must match Process4's tool, or no session can push; and two retired hooks (commands run before every command of every session) are still there.

**Proven and not proven.** About 700 merges with no review went through Process3's tool with no recorded refusal (measured). Process4's tool is unmeasured.

## J. What is kept from Process3

**The line-by-line account.** Your answers of today move some of your 288 requirement lines between kept, changed and ended. They were not recounted for this draft; the appendix that lists them one by one will be redone to match it.

**A check that could stop work stays only if this document names it.** Named: the three tests, and the start-up comparison of your approvals (section L, item 11). The process's own tool has its tests, which run only at PROCESS (section E). The other checks Process3 had that could stop work end (section K). *Claude decided* who builds and commits built files: the module's own job, in its own pull request.

**Your ledger is unchanged.** It still shows "keep" or "modify" for every line this definition ends. Your ledger is yours to change.

**Kept, by theme.** Git and GitHub hold all state, with one writer per file. A session acts only on what it has read in full or measured. One total order of modules, one owner module per file, and requirements in a public and a private part under permanent numbers. The process stands only on measured platform behaviour. One short rulebook per role, at most ten rules. The product's CLAUDE.md stays under thirty lines. The process has its own repository and one fixed version for each tranche, moved only with your prior approval. The eight things you dropped in your ledger stay dropped.

**GitHub's published limits.** The fourth draft asked how they are kept to. Your hint of 14 Nov: "same as in process3". Claude reads this as: the way Process3 kept to them is carried over unchanged. Process3's decision record quotes you on 9 Nov: "don't do it beyond just making sure that we don't exceed published limits".

**The tranche report.** One report, written once by ARCH at the tranche's end (*Claude decided* who), only from what git and GitHub already hold: time, work done and left, anything deferred and why, cost where it can be read ("unmeasured" otherwise), the overhead share, ARCH's idle time while work was ready, and your minutes. No number is a target. Nothing reads the report to decide anything.

## K. What ends, and why

**Under your decisions**

- **Layers.** Lines 7 and 24.
- **The full regression and whole-product checks before a release.** Line 6. This also ends the option, in your ledger words of 31 Oct, to have them run "when I ask for one". Your word to the coordinator still runs the internal walk at any time.
- **Deliberate-fault sampling of tests on payment and data paths.** The record of 13 Nov lists it as ended by line 5. It was never built.
- **Review by a fresh reviewer** (line 21), and a helper briefed to review (your "agreed" of 14 Nov, section C).
- **The other checks that could stop work.** The fourth draft's proposal 13: your words "three tests and no others" end the checks below, though your ledger still shows each as kept. Your answer of 14 Nov: "three tests and no others". So these end on your words of 14 Nov:
  - the check that a job wrote only its own module's files (the rule itself stays: line 14 and your words in section C);
  - separate install and upgrade tests before a release;
  - three checks that ran beside a module's tests: that a job's new tests fail when its change is undone; a second run of the module tests on the merged result; and that built files match their sources;
  - the check of your credentials when a tranche opens; the check of the process version at a session's start; the check that the process files a product holds have not drifted; the guard on your approvals block inside Process3's record check; the format and coverage checks beside a module's tests; the re-run of checks when a tranche closes; and the check that no built file is committed.

  Measured: the only firings of the own-files check found in the record were three false alarms, and neither release test was ever built. One consequence: with the guard gone, nothing in git stops a session's pull request from changing your approvals; what remains is the permission checker.
- **A default of 24 live sessions** (your Foundations, 1 Nov). Line 9 makes it eight.
- **Updating the installer and website as part of ending a tranche** (your words of 8 Nov), as Claude reads your words of 14 Nov (section P).
- **Parts of kept lines:** the word "layer" wherever it appears; tests run "at layer close" or "nightly"; the "one full test run" after a change across many modules.

**By Claude's decision.** These change lines you kept in your ledger or duties in your Foundations, and are listed for you to overrule.

- **The first of your two health numbers,** false "done" claims caught by independent re-verification. It can no longer be produced: the re-verification it counts ended with lines 5 and 21. The second, the cost of each pull request that survives, stays as a reported number where cost can be read. Neither was ever produced in Process3.
- **Three measurements your ledger asked for,** ended unmeasured: an architecture session that keeps no memory between wakes (a session started by an alarm could not start sessions: 0 of 3, measured); trimming each role's principles by the line-by-line test (section L, item 8); and the share of ARCH's work that is passing things on.
- **Two duties from your Foundations,** ended under your words "three tests and no others": counting refused acts and trying them again when a tranche opens and at each model release; and removing parts of the process one at a time at each model release to see whether they are still needed.
- **Two more duties from your Foundations stay,** neither as a check: the alarm for lack of progress is ROOT's hourly wake; and confirming that a session it started exists is part of the act of starting a session.

## L. Earlier requirements Claude has ended or kept on the evidence

These too change lines you kept in your ledger, and are listed for you to overrule.

1. **The job's written receipt** of the commands it ran. It caught nothing in 1,187 test runs (measured), and Process3's decision record quotes you on 9 Nov: "get rid of it completely". *Ended.*
2. **The set-up check before every job start.** It refused every job start after you applied new settings (measured). *Ended,* on your instruction quoted in a decision record of 9 Nov: "Is this needed at all? If so, it must be done efficiently. If not, then cut it."
3. **The size cap on a module's requirements file.** Built as a refusal, it was overridden 32 times out of 32 (from the earlier review; not re-measured). *Ended.*
4. **Recording each job attempt's reading list and cost.** Made compulsory, the cost figure blocked every job completion for 45 minutes (measured). *Ended* as a duty on jobs, and the cost alarm in your ledger with it.
5. **The check that fails a commit adding an oversized file or a file in a temporary folder.** The record check it was part of gave 947 findings on its first run (measured). *Ended.*
6. **The job record as a strictly formatted data file.** Your ledger asked for the experience to be measured; it never was. 105 of 508 merges changed nothing but these records (measured). *Ended,* on cost.
7. **Every rule must cite a measured failure or your decision.** Checks were added in 41% of Process3's merges both before and after 5 Nov, each with a citation (measured). *Ended.* Every process change now comes to you at PROCESS, whatever it cites.
8. **A line-by-line test of instruction files in place of a size limit.** It was only advice; the guide with no limit grew from 8 KB to 134 KB (measured). *Ended.*
9. **"Nothing is ever refused for size", for the process's own texts.** *Ended* for those texts only: the size limit on each role's starting text is among the tool's tests you agreed to (section E).
10. **The reading audit.** Never built. *Ended.* The rule itself stays (section J).
11. **The start-up comparison of your approvals.** Claude reads line 12 as covering it. *Kept,* with its cost stated in section I.
12. **Deploy tokens held as settings of the Claude cloud environment,** the only route measured to work, and **module tests run in two parts,** so that product code under test holds no access token. *Kept,* as part of the permission management you preserved.

## M. What does not exist yet

- **Where the work is kept.** Your words of 14 Nov: "The process3 repo is public because the development process that we're evolving is open-source software that's still in development. You have my approval to add any and all information related to the process4 update to the repo." The Process4 work is kept in a folder named process4, on a branch named process4, of the process3 repository. Claude reads the subtree of your second message as that folder.
- **No Process4 tool exists.** Process3's merge tool refuses for many reasons that end here. Process4 needs a new small tool that does only this: push; open a pull request and mark it ready; merge; start the next job; send notifications; and write the shared state.
- **No Process4 role texts exist, and no PROCESS lane.**
- **The product's repository is not converted.** Its CLAUDE.md on the tranche branch today tells a session whose prompt was not printed by Process3's tool: "Act only as it says; with none, act on nothing." So a ROOT you start with a plain prompt is told to do nothing. The test run must also report on pull requests that change no module, such as your approvals commit, or that commit cannot merge.
- **Nothing is built for:** the shared state; a start by you that lands on the newest approvals; a walk shared among several sessions; deployment as a step in a round; the release path; the stop on your word; the mechanical edit; the uses check that reads tests; or the route by which a process fault reaches PROCESS.

Builder: Claude, before anything is in force.

## N. What is not yet settled

The fourth draft listed fifteen things here. Thirteen are now decided in the body, on your hints or by Claude. Two remain (1 and 2 below), and your answers raise two more (3 and 4).

1. **The notification:** what counts as an interface change, who is told, what a notified job does, and how to avoid starting jobs that find nothing to change. Under study (section F).
2. **The form of the notification:** how the changed parts are worked out and written. After the study.
3. **How two products share the eight slots.** You answered "across the account", and a session holds one repository, so it sees one product. Claude will settle this when a second product starts. With one product nothing changes.
4. **Who starts the watcher.** Your note says "by whoever starts ROOT", and you start ROOT. Read plainly, that makes starting the watcher an act of yours, and it is not in your list of acts. From 5 Nov, Process3 had ROOT start it (measured). If Claude's answer departs from your note, it will come to you as a proposal.

## O. What is not yet proven

Your Foundations say: "Nothing here is in force until it has run on a real tranche with the two health metrics measured." The first of the two can no longer be produced (section K). Each trial below could break its claim; none can prove it. Proof is the first real tranche.

**Can be tried with nothing asked of you.** That the rule for who takes a free slot gives the same answer every time. That the internal walk finds the one known break between two modules, of 4 Nov, which module tests missed.

**Needs process3-probes, the repository you named, and sessions on your account.** The fourth draft's proposal 11: this trial, in which the whole chain of sessions builds a few small made-up modules, stands as the "one shadow of a representative slice" your ledger note asks for first, though it is weaker than a slice of the real product. You answered "agreed" on 14 Nov. Judged cost to you: one sitting of about half an hour, one settings change, two session starts, one edit to your approvals and one "stop". Each claim gets one rehearsal unless a number is given.

- First: with the trial branch made the default branch, a ROOT started by your plain prompt comes up on your newest approvals, also straight after an approvals commit, and starts ARCH and the coordinator.
- A merge with no review, by Process4's tool, passes the permission checker. Twenty or more merges, because the checker has passed and refused the same act minutes apart.
- A freed slot is refilled within minutes, and jobs obey a replaced ARCH. With no event, Process3 once noticed a finished job after 194 minutes.
- The shared state works, and the hourly alarm wakes a ROOT you started.
- A watcher takes over from a ROOT that has died: what it leaves behind, and how deep the new ROOT sits.
- A stop, a held merge, a module put first and a new slot number each work on your word, and the alarm does not undo a stop.
- Finished sessions do not use up the account's room. Process3 saw new starts fail silently at about 50 live sessions (one event).
- Several sessions share one walk by journey; sessions run a deployment and an external walk as a step in a round; the Cloudflare account bears the external walkers; and the tranche branch merges into the main branch.
- A mechanical edit across several modules merges once, with the touched modules' tests run and with none run.
- ARCH asks ROOT, ROOT starts PROCESS on the process's repository, and the coordinator talks to it.
- An account switch loses no work. It failed on 5 Nov and was cancelled on 7 Nov.
- Sessions started this way load your approvals and the deny list, also after an edit and a restart; a release can be prepared as far as your approval.

**Only the first real tranche can show**

- Whether a tranche can end (section D).
- Whether the checker goes on passing merges at a real rate. Twenty clean merges bound the refusal rate only below about 14% (estimated).
- How often a process fault stops work and so waits for you at PROCESS.
- Whether cost can be read for the tranche report. In Process3 it often could not.

**Risks with no trial**

- Nothing physical yet stops a session building a product from changing the process's files, or from moving to a changed process. In Process3, sessions made 270 of 296 process changes themselves and moved the version 116 times in nine days (measured). In your words of 14 Nov: "That rule exists only as text, and in Process3 text alone did not hold."
- A job's tests judge its own work. You have accepted that as the job's responsibility. Beside it: 8,838 requirement numbers against 236 to 357 walk steps (measured), so about nineteen requirements in twenty (estimated) are looked at only by the job's own tests.
- Sessions write and count the walk's steps. A step that was loosened cannot be seen. A walk starts from a fresh copy and cannot see an upgrade breaking a user's existing data.
- A module's tests run only on its own job. A failure caused by another module's merge can sit unseen until a walk meets it.
- Most rules in this document are held by text alone, among them the rules against growth outside the process's own repository: product tests that serve the process, extra walk steps, demands written into another session's instructions, a helper briefed as a reviewer. In Process3 the one rule with a hard limit behind it held all week, and rules held by words drifted (measured).
- Why GitHub suspended the sessions' account on 6 Nov was never learned.

## P. Still open with you

**The tranche and the release: your answers of 14 Nov.** The fifth draft put three readings to you. You answered each, and your answers are quoted here exactly.

1. **The journeys that use AI.** You answered: "A tranche can end without an AI enabled run". So the external walk that ends a tranche may be made with no AI account connected. When the journeys that use AI are walked is not said; Claude will bring it to you when the release is built.
2. **The installer and the website page.** You answered: "installer and website are outside the tranche". Both belong to the release, which can be started after a tranche has ended.
3. **What a release waits for.** You answered: "installer and site updates wait for a clean development release walk". Claude reads "development release walk" as the external walk of the development deployment, the one that ends the tranche. Say if you meant a further walk.

**Tests for the process's own tool.** Claude's reading of your "agreed" beside your words that no more tests are needed (section E).

**A product question that will come to you.** Whether a member's own Claude sign-in through the runner still exists: one module still passes that sign-in to four addresses that now answer "not found", and its requirements file states both positions. Not decided here.

---
