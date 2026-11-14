# Process4: definition, fourth draft

14 Nov 2026. For Bob, the owner. Written by Claude.

**How to read this.** Plain words, no reference codes. Nothing here is in force. Section B lists your decisions: the words you typed today, then the session's record of 13 and 14 Nov. Section G says how the process is changed, section M what is not yet settled, section N what is not proven, and section O every change Claude proposes to something you defined, for your yes or no. Four words are kept apart. *Measured*: counted in Process3's record or on today's code. *Estimated*: worked out from measured figures. *Judged*: an opinion, Claude's or an AI worker's. *Unproven*: never run.

**Whose decision each thing is.** A thing is called yours only if it is in section B (the record is cited as "line 6" and so on), is an answer stored in your ledger, or is quoted from you with its source. Your typed words outrank the session's record wherever they differ. "Claude decided" marks a technical matter you did not define; you can overrule any. Where Claude wants to change something you did define, the body keeps your definition and the change is a proposal in section O.

**What changed since the third draft.** You read it and typed a reply; this draft follows that reply. A tranche now ends only when an external walk of a development deployment completes without flaws. The third draft ended a tranche earlier and said that a tranche failing when deployed could reach the main branch; that is gone. Writing its own tests is each job's responsibility. The process is changed only in a separate lane called PROCESS, where you choose; the third draft's fix session and its question to you about a setting are removed. The trial repository is process3-probes. Wherever Claude had changed something you defined, your definition is put back and the change is a proposal in section O. What you asked Claude to explain is explained in sections E, G and M.

## A. What Process4 is for

Process4 is the way AI sessions build a software product for you in a GitHub repository, and can do so with nobody watching. Its one output is product behaviour that meets its requirements, merged to the main branch quickly and cheaply, and still there later. Following your words of 14 Nov, a tranche reaches the main branch only after its modules' tests, an internal walk, and an external walk of a development deployment. No walk of either kind finished without flaws in Process3 (measured), so that ending is unproven (section D). You define the product: its purpose, audiences, requirements, principles and broad design. The AI decides everything technical and tells you in plain words what it decided.

**Words used here**

- **Session:** one running AI conversation in Claude Code's cloud.
- **Pull request:** a proposed change to a repository, which GitHub can test and then merge. A draft pull request is one not yet offered for merging.
- **Module:** one part of the product, with its own code files, tests and requirements file. The product is one ordered list of modules, and a module may use only modules before it. Today's list of 220 does not fully fit this: seven modules with work hold no code, four are new and have no files, and about 50 code files belong to no module (measured). ARCH edits the list until it fits.
- **Job:** one session's work on one module, delivered as one pull request.
- **Slot:** room for one job to run. Eight by default.
- **Tranche:** one batch of product work, built on its own branch, reaching the main branch only as a whole.
- **Round:** one pass within a tranche: jobs, then the internal walk, then, if that finds no flaws, a deployment and the external walk.
- **Internal walk:** in your words, it "uses the UX Screens document to confirm that the workflow matches the definition". It is made on the product as built, without deploying it.
- **External walk:** in your words, it "follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results". It is made on a development deployment: the product put on a development site in its own Cloudflare account, reaching no one else.

## B. Your decisions

### Your own typed words of 14 Nov

From your second message of today, exactly as typed. The working rules of your first message are quoted where used.

- On the trial repository: "The throwaway repo that you need already exists: process3-probes."
- On the tranche: "A tranche ends after a successful external walk of a development deployment. So a deployment is a step in a tranche. But if flaws are found during an external walk those flaws are added to the next round, not the next tranche. So a tranche only ends when an external walk (of a development deployment) completes without flaws. A release can (optionally) be started after a tranche completes. So a release is always fully tested and walked successfully."
- On tests: "Yes, a job writes its own tests. That's an important responsibility. It's also a challenge because tests must be complete yet fast and efficient."
- On the walks: "An internal walk uses the UX Screens document to confirm that the workflow matches the definition. The external walk follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results."
- On changes to what you defined: "When you change something I defined you need to describe the PROPOSED change in words I understand so that I know what you're proposing and whether to approve the change or not."
- On Process3: "Process3 never finished a tranche because it kept adding test after test so that it stopped making progress before it could finish."
- On changing the process: the paragraph that begins "Lets be clear about how the process is changed (and how it's not changed)", quoted in full in section G.
- "You can create a subtree in the process3 repo for the container being used to update to process4." Claude reads this as leave to keep the working files for the move to Process4 in a folder of the Process3 repository. Say if you meant something else.

**Which recorded lines these change.** Your words on the tranche and the walks change lines 5 and 6 (section D). They also change your words of 8 Nov as Process3's decision record has them, where updating the installer and the website "ends the tranche": a release now follows a tranche and is optional. Your words on changing the process change lines 1 and 2 and put line 20 in your hands (section G). The others change no recorded line.

### The session's record of 13 and 14 Nov

These reached this document through a session's written record, not through text you typed. On 14 Nov you referred to them in your own words as "my decisions of 13-14 Nov". Each line quotes the record exactly. Correct any that is recorded wrongly.

*13 Nov*

1. "You enter no commands and edit no source files. Your only actions, very occasionally, are changes to GitHub or Cloudflare settings: permissions and rules."
2. "The process runs unattended. It waits for you only when it is completely blocked, with no further work possible until you act."
3. "A product is a total order of modules. A module's services can be used only by modules that follow it. Each module is updated and tested by a single job, and earlier modules' jobs run before later ones. When a job changes a module's interface, every user of that module is notified, so those modules' jobs are updated as needed and tested."
4. "The build plan is designed around jobs running in parallel, bounded by a number you can change."
5. "Process4 has three tests and no others." They are: "Each job's own module tests, which include a check that the module's declared uses match its imports"; "Notification of every user module when a job changes an interface"; "A multi-session internal walk at the end of each round."
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

Lines 16 and 22 differ on ROOT's repository; this definition follows the later.

## C. Who does what

**You, the owner.** You define the project and answer the questions that are yours. Your acts:

| Your act | How often |
| --- | --- |
| Change a permission or rule setting in GitHub or Cloudflare | Very occasionally |
| At PROCESS: choose among the options offered for a process change, and approve a product's move to the changed process | Whenever a change is proposed |
| Start the first session, ROOT | At each start or restart of development; after each edit to your approvals; and if ROOT dies |
| Tell the coordinator things | Whenever you choose |
| Approve a public release | Once per public release |
| Connect an AI account to the deployment | Before an external walk of the journeys that use AI |
| Commit your standing approvals to CLAUDE.md, and the deny list to settings.json, on GitHub's website, in the product's repository and in the process's (section H) | At the start, then only when the wording must change |
| Connect Claude to GitHub, and enter the deploy token and other secret values into Claude's cloud environment, from a page the process writes | At the start of a product and at an account switch |

Line 1 allows you only the first row. The second is in your own words of today. The next three are in the record (lines 16, 17 and 18). The last three rest on no words of yours that make them your acts: proposal 12.

**ROOT** is the first session. You start it on the product's repository with a plain prompt (lines 16 and 22). The start must land on your newest approvals, not on the old ones the main branch holds; how is not yet settled. ROOT starts ARCH and the coordinator. Once an hour an alarm wakes it as a safety net, as in Process3, to wake or replace a session that has stopped. ROOT decides nothing about the product and builds nothing. Your ledger note says: "The watcher is started beside ROOT by whoever starts ROOT." The watcher takes over if ROOT dies. Claude proposes to drop it (proposal 7).

**The coordinator** is your front door for the product (line 17). ROOT starts it, on the product's repository. A line you kept in your ledger says: "Only explicitly marked words of yours become decisions". So only words you mark as a decision or an instruction are passed on, exactly as written and dated, and followed. A question from you is answered in words, never by building anything. The coordinator tells you what ARCH decided, one plain line each, and puts a question that is yours to you once, with options and a recommendation. Holding or approving one merge, putting a module first and changing the slot number on your word are in your documents and are untried. It decides nothing about the product and brings you no technical question.

**ARCH** is the architecture session, one per product. The record of 14 Nov calls it ARCH; your older ledger notes call it "BOB". ROOT starts it. It starts jobs, merges them, and passes notices between modules. It edits the module list until every file has one owner module. It starts the walking sessions, deploys to the development site, and turns each flaw into work for a named module. It decides every technical matter of the product, writes each decision in the product's decision file, and settles a design before anything is built on it. While a tranche runs it prepares what the next round or tranche needs (your ledger). It never edits your approvals, changes the process, or publishes a release without you.

**A job** is a session ARCH starts to do one module's work. It decides how to meet that module's requirements, and it writes that module's tests. In your words of 14 Nov: "Yes, a job writes its own tests. That's an important responsibility." It writes only its own module's files (line 14), and never merges, starts a session, deploys or changes the process.

**A worker** is a helper that ARCH or a job starts inside its own session. A line you kept in your ledger gives its uses: "noisy bulk work such as a full test run, a read-only reviewer, and genuinely independent parallel sub-tasks". Claude proposes that a helper never reviews (proposal 9).

**A design lane** is, in your ledger note, "a knowledge directory and design responsibility". ARCH defines lanes and starts a helper or session for one when a design is needed. It delivers designs, never product code. User experience is always present. A lane's pull request merges with no test; that clause is in your approvals.

**PROCESS** is the lane where the process is changed: a session you talk to (section G). **Walking sessions** are started by ARCH for each walk.

**Model and effort.** Every session passes your suggestion on to each session it starts. Your ledger note says: "always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand". The platform allows only one permissions mode here, Auto.

**Shared state** (*Claude decided*). What belongs to one job stays in that job's pull request. What every session needs lives in one place on GitHub that needs no merge to write: which sessions hold the standing roles; the slot number; a stop; your instructions quoted exactly; notices and walk flaws for modules with no open job; and the time ROOT last woke. Its form is not yet settled. Sessions name roles, not session addresses, so that a replaced ARCH can be obeyed. ARCH was replaced 21 times in six and a half days in Process3 (measured).

Sessions are at most three levels deep, and none starts its own replacement.

## D. How work flows

**The life of one module's job**

1. **The module has work.** A requirement in its file is marked "not yet met", or a walk flaw or a notice has been placed against it.
2. **Its job is ready:** the module has work and no job already open. It does not wait for the modules it uses (line 8).
3. **It takes a slot.** Ready jobs take free slots "earliest in the order first" (line 8). Line 3 also says "earlier modules' jobs run before later ones"; how Claude proposes to read the two together is proposal 6. Only your marked instruction puts a module ahead.
4. **ARCH starts the job session,** with instructions naming every act the job may take.
5. **The job works** in a draft pull request, writing only its own module's files, its tests among them. A flaw it finds in another module goes to ARCH, which passes it to that module's job.
6. **The job completes.** It pushes and marks the pull request ready. The tests run on GitHub's machines. The job fixes its own failures and sends ARCH one message when the tests pass.
7. **ARCH merges it** into the tranche branch with the process's tool, the only way a session can merge (line 23). There is no review and no act of yours.
8. **The slot is refilled** in the same turn (line 9). If the job changed its module's interface, every user of that module is given a notice (line 3; section E).

**When a module's work is finished** (*Claude decided*). When its job merges, or when its notified job tells ARCH that nothing needs changing. That message makes no file and no merge.

**A job stopped by another module's flaw** reports the flaw to ARCH, records that it is blocked, pushes and stops. Its slot is freed. When the other module merges, the notice makes this module's job ready again.

**A change across many modules.** A change that touches many modules in the same trivial way, needing no judgment, is made in one pass by a helper inside ARCH's session, when no job is open; a module where it needs judgment gets its own job (your documents). *Claude decided* the moment: between a round's last merge and its internal walk. Line 19 adds that some such changes need no rerun of module tests. How one would merge without its tests is not yet settled; the permission checker refused such a merge once, on 9 Nov (measured).

**A round, step by step**

1. **Jobs.** Every module that has work gets its job.
2. **The internal walk.** When every module that had work is finished, ARCH starts several sessions that walk the product as built against the UX Screens document. Each flaw becomes work for a named module in the next round.
3. **Deployment and the external walk.** Only when the internal walk finds no flaws does ARCH deploy the product to the development site. Walking sessions then follow the UX journeys there. Each flaw becomes work for a named module in the next round, "not the next tranche" (your words).
4. **The tranche ends** only when an external walk completes without flaws.

*Claude decided* the order: jobs, then the internal walk, and deployment only after an internal walk with no flaws. Process3's decision record quotes you on 8 Nov to the same effect: "This successive set of rounds continues until an internal walk doesn't find flaws, the release deployment happens, and the walk of the release also doesn't identify flaws."

**What follows for the record.** The record of 13 Nov lists exactly three tests with the internal walk as the third, and calls the external walk optional (lines 5 and 6). Your words of today make the external walk the end of every tranche. So this document writes the walk as the third test in two forms, internal then external. That reading is Claude's, and yours to confirm (proposal 4).

**The journeys that use AI.** Your words of today say "all journeys". Some journeys use AI and need an AI account connected to the deployment. Process3's decision record quotes you on 9 Nov: "The first run or two of the external system will run without without an AI account connected". So Claude reads your words of today to mean that the tranche cannot end until those journeys too are walked without flaws.

**What is not proven about the walks.** No walk of either kind finished without flaws in Process3 (measured). Its stored reports marked steps "ok" while listing failures: on 8 Nov the internal walk had all 238 steps marked ok with 63 failures listed, and the external walk of the same build passed 20 of 175 (measured). What "without flaws" should mean is proposal 10. Walking by several sessions never ran; one script did the walk. The two late deploy-and-walk runs took 60 and 64 minutes (measured), longer than the 30 minutes or so a session can run one step, so a long walk has to run on GitHub's machines. Process3's decision record quotes you on 8 Nov: "be careful that there aren't too many external walkers to cause the Cloudflare system to exceed limits of the account".

**Nothing bounds the number of rounds.** You give the reason no tranche finished in your own words: "Process3 never finished a tranche because it kept adding test after test so that it stopped making progress before it could finish." So the risk that a tranche does not come clean is unmeasured for a process that does not grow. Process3 does not show it either way. Only your word ends a tranche that will not come clean, with the flaws named.

**When the tranche ends,** ARCH merges the tranche branch into the main branch as a whole, by pull request. The main branch never moves while a tranche runs. None of the three tests runs on that pull request. This merge never happened in Process3: its main branch has not moved since 1 Nov (measured).

**A release.** In your words of 14 Nov: "A release can (optionally) be started after a tranche completes. So a release is always fully tested and walked successfully." The process prepares it and waits for your approval (line 18). Process3's decision record quotes two earlier rulings of yours on the order. 8 Nov: "build the installer only when the internal walk completes without the need for another round, and build the site update only once the external walks complete without the need for another round." 9 Nov: "the installer update and site update wait until a release walk with AI on is also clean." Claude reads your words of today as placing the installer and the website update in the release, after the tranche. No release of any kind was cut in Process3 (measured). A development deployment does not use the installer, so no walk shows that the installer can place a release into an empty account. The release path is unproven.

## E. The three tests

Process4 has exactly three tests (line 5; in your own words of 14 Nov, "Process4 has three tests, ever"). A test runs only when there is a fully informed reason to run it (line 19).

1. **Module tests.** As you defined: "Each job's own module tests, which include a check that the module's declared uses match its imports". The job writes them; that is its responsibility, and they "must be complete yet fast and efficient" (your words). They run on GitHub's machines when the job marks its pull request ready. *A failure* goes back to the job. A rule for the job, from your Foundations: "every requirement is tested at the module's interface and proven met".
2. **The notice.** As you defined: "When a job changes a module's interface, every user of that module is notified, so those modules' jobs are updated as needed and tested." *A failure* is fixed by the user module's job.
3. **The walk, in two forms.** Internal, at the end of a round's jobs or on your word to the coordinator at any time. External, on a development deployment, after an internal walk with no flaws. *A flaw* from either becomes work for a named module in the next round.

**What counts as adding a test** (*Claude decided*). A module's tests and a walk's steps are product work, written by jobs. Each exists only to prove a product requirement, which it names. Adding one is not adding a test to the process. A test or step that serves the process (records, formats, bookkeeping) is not allowed. This is a rule in text. Process3 had 211 such test files (measured).

### The notice in detail

**The interface.** Your Foundations say: the services listed in the public part of a module's requirements file. Measured on today's code, other modules rely on four parts: the names a module exports; its public requirements, each under a permanent number; its tests, which name the requirement they prove; and a few published files that are not code.

**What the notice says, and what a notified job does** (line 10). "A change to a provider's interface says which parts of the interface changed. A user module's job checks the implications of those parts and no others, and updates and runs only the tests that relate to them." If the user module has a job open, that job gets the notice. If not, the notice is work and its job becomes ready. Two things stand in the way of line 10 as written. On Process3's record the named parts did not always lead to the effect, and nothing exists today that can pick "the tests that relate". Proposal 3 is Claude's answer.

**Jobs that start from a notice and find nothing to change.** You asked what Claude meant. An example: module A's job merges a change to A's interface. Twelve modules declare a use of A. Each of the twelve with no job open gets a job, whose first task is to read the notice and decide whether its own module must change. If eleven decide that nothing must, eleven sessions were started and closed for no change to the product. The estimate comes from a simulation, not from a run. It took the real list of 220 modules and their declared uses, assumed that all jobs take equal time, and sent a notice at every merge. The 65 modules with real work led to about 177 jobs, about 100 of which started only because a module they use changed, and then found nothing to do (estimated, not measured). Process3's own record: of 2,342 notifications judged, 241 were judged affected and 2,101 not (measured; the verdicts are AI workers' judgments). Under your definition a notice goes only when the interface changed, so there would be fewer; how many fewer was not worked out. Process3's remedy was a helper that judged each notice first; Process4 has no such step. No remedy within your rules was found.

**Why 122 pairs of modules have a dependence that is not declared.** They are not loops, and the record does not show laziness. Process3's check compared a module's declared uses with what its source code imports, and found none undeclared there (measured: 0 of 3,029 import statements). The check never looked at tests. The job rules told jobs to use a provider's published test fixtures and helpers, that is, ready-made test data and tools kept among the provider's tests. So a job's tests could use them, declare nothing, and pass. An example from the record: the tests of the module called monitoring imported a fixture from the tests of the module called following, which monitoring did not declare. A script that searches today's code finds 122 pairs where one module's tests import from a module it does not declare (measured by that search). 36 of them point to a module later in the order (three more such uses are declared), which line 13 calls a design error "to be fixed by refactoring them", that is, reshaping the code without changing what it does. The other 86 point to an earlier module and are corrected by declaring the use in the module list, an edit ARCH makes. A module that depends on another without declaring it is never sent a notice. No effect on such a module was shown, and none was ever judged.

**"71% of job merges change the interface."** How it was measured: a script compared each of 504 job merges with the commit before it and looked for a change in any of the four parts. 360 changed at least one. It is that high because nearly every job edits a test whose title carries a requirement's number, and that alone counts, under the third part. An example: a job adds one test for requirement 53 and changes nothing else; no other module can be affected, yet the script counts an interface change. Under a strict reading (an exported name removed or the way it is called changed, or a public requirement changed) it is 167 of 504, about a third. How far to trust it: the script matches patterns in the text and is not a full reading of the code. So the figure mostly shows that the four-part definition of an interface is too wide. It is weak evidence about how often interfaces really change.

**Still not proved:** that recognising an interface change is rigorous and correct (line 11). A replay of Process3's 178 recorded changes tried "one of the four parts changed" against the 241 effects that Process3's AI workers judged real: it reaches 236 (measured, on this record only). Counting exported names and public requirements alone, it reaches 175. Proposal 1 is Claude's answer. 532 declared pairs were never judged.

## F. When something goes wrong

**A job fails its tests.** The job fixes its module and the tests run again. After two failed corrections ARCH replaces the session with a fresh one. Your ledger note gives its first task: "the restarted session should recognize that corrections were made and try to understand why to anticipate all other needed corrections so it doesn't continue to fail."

**A session dies or fills up.** For a job, ARCH starts a new session that continues from the same branch and pull request. For ARCH or the coordinator, ROOT starts a successor, which begins from the shared state and GitHub. Replacing ARCH while jobs are open is unproven.

**The process itself has a fault.** No session building a product fixes it, works round it or adds anything. The fault is reported, and any change is made only at PROCESS, with you (section G).

**The process is completely blocked.** You get one plain message with a numbered list of what is yours to do. An example from Process3: GitHub suspended the account the sessions work under. In every other case the stop is recorded as a named blocker and other work goes on; one that only you can clear is told to you at once.

**A stop on your word.** You tell the coordinator, which tells ARCH, which interrupts each job. The stop is a line in the shared state naming the account. ROOT reads it at every wake, so that the hourly alarm does not undo it. After your stop of 9 Nov the alarm went on firing and had sent 94 notifications by 13 Nov (measured). Unproven.

## G. How the process is changed

Your words of 14 Nov, in full:

"Lets be clear about how the process is changed (and how it's not changed). Process changes only happen in a separate process lane call PROCESS that I interact with. Though process changes are often technical and detailed, the PROCESS session will explain the nature of the problem and suggestion options for fixing it for me to explore and ultimately choose. Because updates require my involvement and I might be away from my computer for extended periods, there could end up being more than one change being proposed in the PROCESS session at a time. When that happens, the set of changes are considered together as a group that could potentially have interactions and implications between. The process after a proposed change is made must continue to meet the process4 requirements (or the requirements changed with my explicit approval). The transition from the process a product is being built using to the updated process will be done only with my prior approval, with PROCESS proposing the best and least disruptive means of making the update."

**What this means, in plain words.**

- There is a separate lane called PROCESS: a session you talk to. A process change happens only there.
- PROCESS explains the problem and offers options. You choose.
- When several changes are waiting for you, they are considered together as one group, because one may bear on another.
- The process after a change must still meet the Process4 requirements, unless you explicitly approve a change to the requirements.
- A product moves from the process it is being built with to the changed one only with your prior approval. PROCESS proposes the least disruptive way.

**What follows.**

- **Two recorded lines change.** Line 2 has the process wait for you "only when it is completely blocked". Line 1 has you take no acts but settings changes. Now a process fault that stops work waits for you at PROCESS, and choosing and approving there are acts of yours. In Process3 one question that sessions carried as yours waited about nine hours (measured).
- **No session building a product may change the process,** add a test, check, gate or review to it, or adopt a changed process.
- **Line 20 still stands:** a change "must not add a new test, gate, review or stop". Now every proposed change is put to you before it is made.

**Two rules for PROCESS.** The field report quotes them as your written instructions: "caution is a cost, paid only against a measured failure or your word" and "the default answer to a finding with nothing measured behind it is no change". So "no change" is always among the options, and a fault that stops no work may be answered with it.

**The line between correcting and adding.** You asked what Claude meant by saying it cannot always be drawn. Line 20 lets a fix "correct or remove what is broken". Sometimes nothing is broken: something is missing. An example from Process3 (measured): a finished job went unnoticed for 194 minutes. No part had failed. The process had nothing that noticed, and what was then built was holds and alarms, which are additions. Under your words of today such a case comes to you at PROCESS with options, one of them a change to the requirements, which only you can approve.

**Not yet settled** (Claude to decide and report; section M): who starts PROCESS and when; how a session building a product reports a process fault to it; which repository it holds; and how your approval is recorded so that only your own words count.

## H. Permissions

Permission management is Process3's, preserved (line 12).

**Auto mode and the checker.** Every session runs in Auto mode: it acts without asking a person, and an automatic permission checker run by the platform judges each risky act and may refuse it.

**Your standing approvals** are a block of text in your own words in CLAUDE.md, saying what sessions may do without asking you and what they may never do. You commit it yourself on GitHub's website. No session writes, edits or relays it. Consent merely quoted in a session's starting text was declined 11 times out of 11 (recorded in your Foundations; no evidence file was found). A session loads the approvals only when it starts.

**After you edit your approvals.** As in Process3, a long-lived session compares the approvals it loaded with the newest, and on a difference does nothing. Each of your five edits in Process3 stopped every long-lived session, and after the last the product never restarted (measured). So an edit to your approvals is one act together with restarting ROOT.

**The deny list** in settings.json takes commands away from every session outright: every direct push, every GitHub command, the ordinary merge commands, overwriting a branch's history, deleting branches, and writing files through GitHub's web interface. So the process's tool is each session's only door to GitHub.

**GitHub's own rules** are your settings. Sessions act as a second GitHub account that can push and merge but cannot change settings. No branch can be deleted or overwritten. The tranche branch takes a change only by pull request with its tests passing.

**How a session must be started** for both to take effect: with one repository only, because a session that holds more loads no deny list; from the newest commit of the tranche branch, never from the main branch, which still holds your approvals of 1 Nov; in Auto mode; and with starting instructions that name every act it may take. ROOT, started by your plain prompt, does not meet the last condition. Whether that works is unproven.

**Working rules that exist because of the checker.** One judged act per command. A refused act is never reworded or handed to another session. Three refusals in a row stop a session, which is replaced.

**Wording changes only you can make.** Your approvals still say "Process3", "BOB" and "layer close", and carry a dead clause on a reviewer's exemption. In settings.json the rule that allows pushing names the Process3 tool by its file path and must match Process4's tool, or no session can push; and two retired hooks (commands run before every command of every session) are still there.

**Proven and not proven.** About 700 merges with no review went through Process3's tool with no recorded refusal. Process4's tool is unmeasured.

## I. What is kept from Process3

**The count.** Of your 288 requirement lines: 163 are kept as written; 44 are kept with the way of doing them changed; 11 end under the decisions recorded as yours; 22 are ended by Claude; 40 end in part; 6 are not yet settled; and 2 waited on the third draft's question, which your words on PROCESS now answer. These were counted for the third draft and not recounted.

**A check that could stop work stays only if this document names it.** Named: the three tests and the start-up comparison of your approvals. Reading "three tests, ever" as ending the others is Claude's; each is a line you kept in your ledger, so each is yours to overrule (proposal 13). They are: the check of your credentials when a tranche opens; the check of the process version at a session's start; the check that the process files a product holds have not drifted; the guard on your approvals block inside Process3's record check; the format and coverage checks beside a module's tests; the re-run of checks when a tranche closes; and the check that no built file is committed. With the guard gone, nothing in git stops a session's pull request from changing your approvals; what remains is the permission checker. *Claude decided* who builds and commits built files: the module's own job, in its own pull request.

**Your ledger is unchanged.** It still shows "keep" or "modify" for every line this definition ends. Your ledger is yours to change.

**Kept, by theme.** Git and GitHub hold all state, with one writer per file. A session acts only on what it has read in full or measured. One total order of modules, one owner module per file, and requirements in a public and a private part under permanent numbers. The process stands only on measured platform behaviour. One short rulebook per role, at most ten rules. The product's CLAUDE.md stays under thirty lines. The process has its own repository and one fixed version for each tranche, moved only with your prior approval. GitHub's published limits are kept to; Process3's decision record quotes you on 9 Nov: "don't do it beyond just making sure that we don't exceed published limits". The eight things you dropped in your ledger stay dropped.

**The tranche report.** One report, produced once, at the tranche's end, only from what git and GitHub already hold: time, work done and left, anything deferred and why, cost where it can be read ("unmeasured" otherwise), the overhead share, ARCH's idle time while work was ready, and your minutes. No number is a target. Nothing reads the report to decide anything.

## J. What ends, and why

**Under your decisions**

- **Layers** (three lines). Lines 7 and 24.
- **The full regression and whole-product checks before a release** (three lines). Line 6. This also ends the option, in your own ledger words of 31 Oct, to have whole-product checks run "when I ask for one". What remains: your word to the coordinator runs the internal walk at any time.
- **Deliberate-fault sampling of tests on payment and data paths** (two lines). The record of 13 Nov lists it as ended by line 5. It was never built.
- **Review by a fresh reviewer** (two lines). Line 21.
- **A default of 24 live sessions** (one line). Line 9. Your documents give four numbers: 24 in the Foundations (1 Nov); "as many as 8 jobs at a time", which Process3's log quotes you saying on 6 Nov; 20 in Process3's decision record of 7 Nov; and 8 in the record of 13 Nov, which this definition follows.
- **Updating the installer and website as part of ending a tranche** (your words of 8 Nov). Your words of 14 Nov place a release after the tranche.
- **A session writing down its own summary of what you said as yours.** Your words of 14 Nov: "Never record your decision or your summary as mine."
- **Parts of kept lines:** the word "layer" wherever it appears; tests run "at layer close" or "nightly"; the "one full test run" after a change across many modules.

**By Claude's decision.** These are changes to lines you kept in your ledger, listed for you to overrule.

- **Three checks that ran beside a module's tests** (four lines): that a job's new tests fail when its change is undone; a second run of the module tests on the merged result; and that built files match their sources. The record of 13 Nov lists them as ended by line 5, in the session's own sentence. No words of yours confirm it (proposal 13).
- **The first of your two health numbers,** which your Foundations call "the standing judge of every other line". The first, false "done" claims caught by independent re-verification, can no longer be produced: the re-verification it counts ended with lines 5 and 21. The second, the cost of each pull request that survives, stays as a reported number where cost can be read. Neither was ever produced in Process3.
- **Three measurements your ledger asked for,** ended unmeasured: an architecture session that keeps no memory between wakes (it cannot run, because a session started by an alarm could not start sessions: 0 of 3, measured); trimming the principles each role loads by the line-by-line test (section K, item 8); and the share of ARCH's work that is passing things on.

## K. Earlier requirements Claude has ended or kept on the evidence

These too are changes to lines you kept in your ledger, listed for you to overrule. No decision of yours ends them. Thirteen items cover seventeen lines.

1. **The job's written receipt** of the commands it ran. It caught nothing in 1,187 test runs (measured), and Process3's decision record quotes you on 9 Nov: "get rid of it completely". *Ended.* A job still reports flaws it finds in other modules.
2. **The set-up check before every job start.** It refused every job start after you applied new settings (measured). *Ended,* on your instruction quoted in a decision record of 9 Nov: "Is this needed at all? If so, it must be done efficiently. If not, then cut it."
3. **The size cap on a module's requirements file.** Built as a refusal, it was overridden 32 times out of 32 (from the earlier review; not re-measured), and one split put a loop into the module order. *Ended.*
4. **Recording each job attempt's reading list and cost.** Made compulsory, the cost figure blocked every job completion for 45 minutes (measured). *Ended* as a duty on jobs, and the cost alarm in your ledger with it.
5. **The check that fails a commit adding an oversized file or a file in a temporary folder.** The record check it was part of gave 947 findings on its first run (measured). *Ended.*
6. **The job record as a strictly formatted data file.** You wrote in your ledger: "Try this, but measure the experience with an open mind as to whether it's work or not." The measurement was never taken. 105 of 508 merges changed nothing but these records (measured). *Ended,* on cost.
7. **Every rule must cite a measured failure or your decision.** Checks were added in 41% of Process3's merges both before and after 5 Nov, each with a citation (measured). *Ended.* Every process change now comes to you at PROCESS, whatever it cites.
8. **A line-by-line test of instruction files in place of a size limit.** It was only advice; the guide with no limit grew from 8 KB to 134 KB (measured). *Ended.*
9. **"Nothing is ever refused for size", for the process's own texts.** *Ended* for those texts only, if you approve proposal 5.
10. **The reading audit.** Never built. *Ended.* The rule stays: act only on what you have read in full.
11. **The start-up comparison of your approvals.** Claude reads line 12 as covering it. *Kept,* with its cost stated in section H.
12. **Deploy tokens held as settings of the Claude cloud environment.** The only route measured to work. *Kept.*
13. **Running module tests in two parts, so that product code under test holds no access token.** *Kept,* as part of the permission management you preserved.

## L. What does not exist yet

- **No Process4 tool exists.** Process3's merge tool refuses for many reasons that end here. Process4 needs a new small tool that does only this: push; open a pull request and mark it ready; merge; start the next job; send notices; and write the shared state. Its size will be stated once it is built.
- **No Process4 role texts exist, and no PROCESS lane.**
- **The product's repository is not converted.** Its CLAUDE.md on the tranche branch today tells a session whose prompt was not printed by Process3's tool: "Act only as it says; with none, act on nothing." So a ROOT you start with a plain prompt is told to do nothing. The test run must also report on pull requests that change no module, such as your approvals commit, or that commit cannot merge.
- **Nothing is built for:** the shared state; a start by you that lands on the newest approvals; a walk shared among several sessions; deployment as a step in a round; the release path; the stop on your word; a change across many modules; or a way to report a process fault to PROCESS.

Builder: Claude, before anything is in force.

## M. What is not yet settled

You asked what Claude meant by things left "to be settled when built". This is the whole list. For each, Claude has not yet decided how it will be done. None is a question for you; Claude will decide each and report it.

1. **Who starts PROCESS, and when.** Nothing yet says whether you start it, or ROOT does.
2. **How a process fault reaches PROCESS.** No route is named by which a session building a product reports one.
3. **Which repository PROCESS holds.** Claude expects the process's own; not decided.
4. **How your approval at PROCESS is recorded,** so that only your own words count and no session's summary stands in for them.
5. **Needless notice jobs.** No way within your rules has been found to avoid starting a job that will find nothing to change (section E).
6. **The number of walking sessions** for each kind of walk, and how external walkers stay inside the Cloudflare account's limits.
7. **How a walk runs:** in sessions or on GitHub's machines, how the deployment step is run, and how walkers read the UX Screens document and the UX journeys.
8. **The shared state:** where on GitHub it is kept and how it is written.
9. **The notice:** how the changed parts are worked out and how the notice is written.
10. **ROOT's start:** how a session you start with a plain prompt lands on your newest approvals.
11. **Whether the uses check reads tests as well as source.** If it does not, a new undeclared use through tests cannot be seen.
12. **How a change across many modules merges without a rerun of module tests** (line 19).
13. **Who writes the tranche report.**
14. **How GitHub's published limits are kept to.**
15. **Four things your Foundations ask for that this draft has not placed:** counting refused acts each tranche; removing parts of the process one at a time at each model release, to see whether they are still needed; the hourly alarm catching lack of progress, not only silence; and checking that every new session has started.

## N. What is not yet proven

Your Foundations say: "Nothing here is in force until it has run on a real tranche with the two health metrics measured." The first of the two can no longer be produced (section J). Each trial below could break its claim; none can prove it. Proof is the first real tranche.

**Already tried: the replay of Process3's 178 recorded changes.** It broke two claims as stated: that a notice sent when one of the four parts changed misses no effect (236 of 241 reached), and that a notified job can read only the named parts without missing an effect (2 of 241 not led, 5 where nothing could be named). Whether a job could test less cannot be measured by a replay.

**Can be tried with nothing asked of you.** That the rule for who takes a free slot gives the same answer every time. That the internal walk finds the one known break between two modules, of 4 Nov, which module tests missed.

**Needs process3-probes, the repository you named, and sessions on your account.** Judged cost to you: one sitting of about half an hour, two session starts, one edit to your approvals and one "stop". Each claim gets one rehearsal unless a number is given.

- A merge with no review, by Process4's tool, passes the permission checker. Twenty or more merges, because the checker has passed and refused the same act minutes apart.
- ROOT, started by your plain prompt, starts ARCH and the coordinator on your newest approvals, also straight after an approvals commit. In Process3 such a start came up on an old copy, twice out of twice.
- A freed slot is refilled within minutes, and jobs obey a replaced ARCH. With no event, Process3 once noticed a finished job after 194 minutes.
- The shared state works, and the hourly alarm wakes a ROOT you started.
- A stop, a held merge, a module put first and a new slot number each work on your word, and the alarm does not undo a stop.
- Finished sessions do not use up the account's room. Process3 saw new starts fail silently at about 50 live sessions (one event); a round may need about 170 jobs (estimated).
- Several sessions can share one walk; a deployment and an external walk can run as a step in a round; and the tranche branch merges into the main branch.
- An account switch loses no work. It failed on 5 Nov and was cancelled on 7 Nov.
- Sessions started this way load your approvals and the deny list; after an edit to your approvals and a restart, the whole chain runs on the new approvals; a change across many modules merges; a release can be prepared as far as your approval.

**Only the first real tranche can show**

- Whether a tranche can end. No walk of either kind finished without flaws in Process3, and you give the reason: it "kept adding test after test". For a process that does not grow, the risk is unmeasured, not shown.
- Whether the checker goes on passing merges at a real rate. Twenty clean merges bound the refusal rate only below about 14% (estimated).
- How often a process fault stops work and so waits for you at PROCESS.
- Whether the process stayed as you approved it: one comparison from git, once, when the tranche ends.
- Whether cost can be read for the tranche report. In Process3 it often could not.

**Risks with no trial**

- Nothing physical yet stops a session building a product from changing the process's files, or from moving to a changed process. In Process3, sessions made 270 of 296 process changes themselves and moved the version 116 times in nine days (measured). In your words of 14 Nov: "That rule exists only as text, and in Process3 text alone did not hold." There is no measured evidence that the permission checker enforces a bare "never".
- What was growth outside the process's own repository stays a rule in text: product tests that serve the process, extra walk steps, demands written into another session's instructions, a helper briefed as a reviewer.
- A job's tests judge its own work. You have accepted that as the job's responsibility. The measured facts beside it: 8,838 requirement numbers against 236 to 357 walk steps, so about nineteen requirements in twenty (estimated) are looked at only by the job's own tests; and half of the week's twenty recorded false "done" findings were tests that pass either way.
- Sessions write and count the walk's steps. A step that was loosened cannot be seen. A walk starts from a fresh copy and cannot see an upgrade breaking a user's existing data.
- A module's tests run only on its own job. A failure caused by another module's merge can sit unseen until a walk meets it. An edit that strays into another module's files is seen by no check, and nothing tells that module's job.
- Needless notice jobs: about 100 in a round of 65 (estimated).
- Most rules in this document are held by text alone. In Process3 the one rule with a hard limit behind it held all week, and rules held by words drifted (measured).
- Why GitHub suspended the sessions' account on 6 Nov was never learned.

## O. Proposed changes to things you defined

Nothing here is in the definition until you approve it. Until then the body follows your definition.

**1. When the notice is sent.**
*You defined:* "When a job changes a module's interface, every user of that module is notified".
*Claude proposes:* tell every module that declares a use whenever any merge, by a job or not, changes a file under a module's source or one of its public requirements. Example: a job changes how module A works out a total, inside one function; no name or requirement changes. Under your definition nobody is told. Under the proposal every module that declares a use of A is told.
*Why:* on Process3's record, deciding "the interface changed" from the four parts would have missed 5 of the 241 effects that AI workers judged real; this wording missed none (measured). It could not have failed on that record, since Process3 judged only modules it told. The price is more notices and more needless jobs (estimated).
*If you say no:* your rule is used, with the four parts, and its misses are accepted.

**2. Testing an edit that strays.**
*You defined:* "Each job's own module tests".
*Claude proposes:* when a job's pull request also changes a file of another module, that module's tests run too. Example: a job on module A edits a file of module B; B's tests run on that pull request. No new kind of test is added; an existing one runs more often.
*Why:* judged. With the own-files check ended (proposal 13), nothing else looks at such an edit. In Process3, with that check in place, 0 of 2,540 job commits strayed (measured).
*If you say no:* a strayed edit goes untested until a walk meets it.

**3. What a notified job does.**
*You defined:* it "checks the implications of those parts and no others, and updates and runs only the tests that relate to them."
*Claude proposes:* the named parts guide the job and do not limit what it reads. If it changes its module, all that module's tests run. If nothing needs changing, it runs nothing and tells ARCH. Example: a notice names two parts, but the real effect is a changed test fixture that no part names; a job held to the two parts never looks there.
*Why:* a script matched 169 of the 241 effects to a named part (measured); a reader judged 64 more led, 1 weakly and 2 not; 5 sat in changes where nothing could be named. And nothing exists that can pick "the tests that relate".
*If you say no:* jobs read only the named parts, such misses are accepted, and a way to pick the related tests must be built; it is unproven.

**4. The walk as one test in two forms.**
*You defined:* "Process4 has three tests, ever"; the record's third test is the internal walk; and today, "a tranche only ends when an external walk (of a development deployment) completes without flaws."
*Claude proposes:* count the two walks as one test in two forms, so that the number stays three. Example: the internal walk finds no flaws, then the product is deployed and walked externally: one test, both forms.
*Why:* judged. Counted apart, the external walk would be a fourth test.
*If you say no:* tell Claude how to count it. The flow does not change.

**5. Tests for the process's own tool.**
*You defined:* "Process4 has three tests and no others." "No other test is necessary, ever."
*Claude proposes:* the small tool through which sessions reach GitHub has tests of its own, the size limit on each role's starting text among them. They run only when PROCESS changes the process, and cannot stop a product job. Example: PROCESS changes how the tool picks the next job; the tool's tests run on that change before any product moves to it.
*Why:* the one hard size limit held all week in Process3 while a guide with no limit grew from 8 KB to 134 KB (measured). Against it: Process3's tool tests grew by 41,777 lines in nine days (measured).
*If you say no:* the tool has no tests and no size limit, and a mistake in it is first seen in product work.

**6. Who takes a free slot.**
*You defined:* "earlier modules' jobs run before later ones" (line 3) and "ready jobs take free slots earliest in the order first" (line 8).
*Claude proposes:* read the first by the second. Example: module 40 has no work yet, module 90 is ready, a slot is free: 90 starts and does not wait for 40.
*Why:* judged. Line 8 also says "A job does not wait for the modules it uses to finish".
*If you say no:* a job starts only when every earlier module with work has finished, and fewer jobs run side by side.

**7. No watcher beside ROOT.**
*You defined:* "The watcher is started beside ROOT by whoever starts ROOT."
*Claude proposes:* drop it. Example: ROOT dies in the night. ARCH and the jobs are meant to carry on, since events wake them. The hourly safety net is gone until the coordinator tells you and you restart ROOT.
*Why:* both recorded takeovers in Process3 left no watcher behind, and left the new ROOT one level deeper in the chain of sessions (measured).
*If you say no:* the watcher stays, and who starts it beside a ROOT that you start must be settled.

**8. Eight slots for each product.**
*You defined:* "Job slots default to eight, and you can change the number." Whether eight is for each product or across the account was asked on 13 Nov; no answer is recorded.
*Claude proposes:* eight for each product. Example: two products at once may run sixteen jobs; you tell each product's coordinator its number.
*Why:* judged. With one product the two readings are the same.
*If you say no:* eight across the account, and how products share them must be settled.

**9. A helper never reviews.**
*You defined:* a kept ledger line lists "a read-only reviewer" among a helper's uses.
*Claude proposes:* no helper is briefed to review another session's work. Example: ARCH may send a helper to read forty files and report what they hold, not to judge a job's pull request.
*Why:* line 21 ends review by a fresh reviewer. In Process3's tool, 285 of 776 commits were fixes made in answer to a review (measured).
*If you say no:* helpers may review, read-only, as the ledger line says.

**10. What "without flaws" means.**
*You defined:* a tranche ends when an external walk "completes without flaws."
*Claude proposes:* a walk is without flaws when it lists no flaw and leaves out no step that the walk before it made. This adds a condition to your words. Example: one walk makes 200 steps; the next makes 180 and lists nothing; it does not count.
*Why:* Process3's stored reports marked every step ok while listing 63 failures, and the step count moved from 238 to 357 inside one round (measured).
*If you say no:* it means only that no flaw is listed.

**11. The first trial uses made-up modules.**
*You defined:* your ledger note asks first for "one shadow of a representative slice".
*Claude proposes:* the trial in process3-probes (section N) stands as that slice. Example: the whole chain of sessions builds a few small made-up modules there. That is weaker than your note asks.
*Why:* judged. A slice of the real product needs the product's repository converted first.
*If you say no:* the first trial waits for the conversion and runs on real modules.

**12. Three acts of yours beyond settings changes.**
*You defined:* "Your only actions, very occasionally, are changes to GitHub or Cloudflare settings".
*Claude proposes:* the last three rows of the table in section C. Example: at the start of a product you paste your approvals into CLAUDE.md on GitHub's website and commit.
*Why:* only your own commit carries your approvals (section H). No way has been measured for a session to connect Claude to GitHub or enter secrets. On the AI account, Process3's decision record quotes you on 9 Nov: "we'll configure an AI".
*If you say no:* nobody can do them, and Process4 cannot start as defined here.

**13. Checks ended because there are three tests.**
*You defined:* "three tests and no others"; yet your ledger still shows each of these checks as kept.
*Claude proposes:* your words end them: the check that a job wrote only its own module's files (the rule stays, line 14); separate install and upgrade tests before a release; the three checks beside a module's tests (section J); and the seven checks in section I. Example: no check refuses a job's pull request for changing another module's file.
*Why:* your words. The only firings of the own-files check found in the record were three false alarms, and neither release test was ever built.
*If you say no to any:* that check stays, named here beside the three tests as a thing that can stop work.

## P. Other points

**Records to confirm or correct.** ROOT's repository (section B). Whether a tranche may end before the journeys that use AI are walked (section D). Whether the installer is built inside the tranche, as your ruling of 8 Nov had it, or in the release (section D). Your sentence about a subtree (section B).

**A product question that will come to you.** Whether a member's own Claude sign-in through the runner still exists: one module still passes that sign-in to four addresses that now answer "not found", and its requirements file states both positions. Not decided here.

**A slip in your ledger.** The note on when a layer closes now holds the same text as the note on session depth, which looks like a paste slip.

**Another technical point, decided by Claude.** Modules that hold requirements and no code (29 of the 220, measured) came from the ended size cap, and ARCH folds them back into the module whose code meets them; overrule this if you see it as a product matter.

---
