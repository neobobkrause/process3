# Process4: definition, third draft

14 Nov 2026. For Bob, the owner. Written by Claude.

**How to read this.** Plain words, no reference codes. Nothing here is in force. Section B lists your decisions as recorded, section K what has not been built, section L what is not proven, section M the question that is yours. Four words are kept apart. *Measured*: counted in Process3's record or on today's code. *Estimated*: worked out from measured figures. *Judged*: an opinion, Claude's or an AI worker's. *Unproven*: never run.

**Whose decision each thing is.** A thing is called yours only if it is a decision listed in section B (cited as "line 6" and so on), an answer stored in your ledger, or words quoted from you with their source. Everything else is "Claude decided": a technical decision reported to you, which you can overrule.

**What changed since the second draft.** Claude set two AI workers to attack the second draft and two to check it against your documents. Both attacks found that the second draft would not have run as written. It relied on a tool that does not exist, on a way of starting that stopped the first session in Process3, and on a tranche ending that Process3 never once reached. A new section K says what does not exist yet. Claude put the question about the wall wrongly: it was the proposal withdrawn on 13 Nov again, with its cost understated and an assurance attached. It is replaced (section M). Three decisions of Claude's were additions that none of your documents ask for, and they are withdrawn: running the external walk by rule after every tranche, walking a release on a copy installed with the real installer, and a walk-step line in the tranche report. Several sentences wrote Claude's reading as your decision; they are corrected. The counts of your requirement lines were wrong and are redone. A replay of Process3's recorded changes has finished; it corrects four statements about notices (section E).

## A. What Process4 is for

Process4 is the way AI sessions build a software product for you in a GitHub repository, and can do so with nobody watching. Its one output is product behaviour that meets its requirements, merged to the main branch quickly and cheaply, and still there later. One caveat belongs here. Under the record of 13 Nov, what reaches the main branch has passed its modules' tests and a walk of the product as built. It has not been walked as deployed, and must not be called working on that evidence (section D). You define the product: its purpose, audiences, requirements, principles and broad design. The AI decides everything technical and tells you in plain words what it decided. Process3 failed because its sessions kept adding checks, reviews and record-keeping to the process itself until product work stopped. Of your 288 requirement lines, 163 are kept as written and 44 with the way of doing them changed (section H).

**Words used here**

- **Session:** one running AI conversation in Claude Code's cloud.
- **Pull request:** a proposed change to a repository, which GitHub can test and then merge. A draft pull request is one not yet offered for merging.
- **Module:** one part of the product, with its own code files, tests and requirements file. The product is one ordered list of modules, and a module may use only modules before it. Today's list of 220 does not fully fit this (measured): seven modules with work hold requirements and tests but no code, four are new and have no files, and about 50 code files belong to no module. ARCH edits the list until it fits (section C).
- **Job:** one session's work on one module, delivered as one pull request.
- **Slot:** room for one job to run. Eight by default.
- **Tranche:** one batch of product work, built on its own branch, reaching the main branch only as a whole.
- **Round:** one pass within a tranche. Every module that has work gets its job, then the product is walked.
- **Walk:** a scripted journey through the product as a user would make it, with checks at each step.

## B. Your decisions as recorded

These reached this document through a session's written record of 13 and 14 Nov, not through text you typed. On 14 Nov you referred to them in your own words as "my decisions of 13-14 Nov". Each line quotes the record exactly. Correct any that is recorded wrongly.

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

Lines 16 and 22 differ on ROOT's repository; this definition follows the later. Where it carries out a line in a different way (lines 3, 5, 6 and 10), it says so at the place.

## C. Who does what

**You, the owner.** You define the project and answer the questions that are yours. You enter no commands and edit no source files. Technical questions are not brought to you. Your acts:

| Your act | How often |
| --- | --- |
| Change a permission or rule setting in GitHub or Cloudflare | Very occasionally |
| Commit your standing approvals to CLAUDE.md, and the deny list to settings.json, on GitHub's website, in the product's repository and in the process's (section G). In Process3 each commit was an edit, a pull request, a wait for the test run and a merge click | At the start, then only when the wording must change |
| Connect Claude to GitHub, and enter the deploy token and other secret values into Claude's cloud environment, from a page the process writes | At the start of a product and at an account switch. In Process3: three times in nine days (measured) |
| Start the first session, ROOT | At each start or restart of development; after each edit to your approvals (section G); and if ROOT dies |
| Tell the coordinator things | Whenever you choose |
| Connect an AI account to the deployment | Before an external walk of the journeys that use AI |
| Approve a public release | Once per public release |

Only the first row is a settings change, which is all that line 1 allows you. The other rows are stated here for you to accept or strike. No way has been measured for a session to do the third row. Your instruction of 14 Nov stands: "Only words I wrote count as my word."

**ROOT** is the first session. You start it on the product's repository with a plain prompt (line 16). The start must land on your newest approvals, not on the old ones the main branch holds; how is a build decision, and unproven. ROOT starts ARCH and the coordinator. Once an hour an alarm wakes it as a safety net, as in Process3, to wake or replace a session that has stopped. ROOT decides nothing about the product and builds nothing. *Claude decided:* ROOT has no standby session. This departs from your ledger note, which has a watcher started beside ROOT. Both recorded takeovers in Process3 left no standby and left ROOT one level down (measured). If ROOT dies the safety net is gone; ARCH and the jobs are meant to carry on, since events wake them. The coordinator tells you when the shared state shows ROOT has not woken, and you restart ROOT.

**The coordinator** is your front door: the session you talk to. ROOT starts it, on the product's repository. A line you kept in your ledger says: "Only explicitly marked words of yours become decisions". So only words you mark as a decision or an instruction are passed on, exactly as written and with the date, and followed. The rest is conversation. A question from you is answered in words, never by building anything. The coordinator tells you what ARCH decided, one plain line each. A question that is yours is put to you once, with options and a recommendation. Holding a merge, putting a module first and changing the slot number on your word are in your documents and are untried. The coordinator decides nothing about the product and never brings you a technical question.

**ARCH** is the architecture session, one per product. *Claude decided* it is never called "BOB", so that it cannot be confused with you. ROOT starts it. It starts jobs, merges them, and passes notices between modules. It edits the module list: it folds a module that holds requirements and no code back into the module whose code meets them (the size cap that split them has ended), and gives the unowned files an owner. It starts the walking sessions and turns each finding into work for a named module. It decides every technical matter of the product, writes each decision in the product's decision file, and settles a design before anything is built on it. While a tranche runs it prepares what the next round or tranche needs, so that it opens the moment this one closes (your ledger). It does not choose which job starts next; a fixed rule does. It never edits your approvals or publishes a release without you.

**A job** is a session ARCH starts to do one module's work. It decides how to meet that module's requirements. It writes only its own module's files, and never merges, starts a session or deploys.

**A worker** is a helper that ARCH or a job starts inside its own session, for bulk reading or side-by-side sub-tasks. *Claude decided* that it never reviews another session's work. That stretches line 21: your ledger still lists a read-only reviewer as a use for helpers.

**A design lane** is, in your ledger note, "a knowledge directory and design responsibility". ARCH defines lanes and starts a helper or session for one when a design is needed. It delivers designs, never product code. User experience is always present. A lane's pull request merges with no test, because none of the three applies. *Claude decided* that this stays; the clause is in your approvals.

**Walking sessions** are started by ARCH at a round's end. **A process-fix session** is started by ARCH for one fault in the process, on the process's repository (section F).

**Model and effort.** Every session passes your suggestion on to each session it starts. Your ledger note says: "always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand". The platform allows only one permissions mode here, Auto, which overrides the last clause.

**Shared state** (*Claude decided*). What belongs to one job stays in that job's pull request. What every session needs lives in one place on GitHub that needs no merge to write, written through the tool: which sessions hold the three standing roles; the slot number; a stop; your instructions quoted exactly; notices and walk findings for modules with no open job; and the time ROOT last woke. Its exact form is a build decision, and unproven. Sessions name roles, not session addresses: a job answers to "ARCH as named in the shared state", so that a replaced ARCH can be obeyed. ARCH was replaced 21 times in six and a half days in Process3 (measured).

Sessions are at most three levels deep, and none starts its own replacement. Git and GitHub hold all state.

## D. How work flows

**The life of one module's job**

1. **The module has work.** A requirement in its file is marked "not yet met", or a walk finding or a notice has been placed against it.
2. **Its job is ready:** the module has work and no job already open. It does not wait for the modules it uses.
3. **It takes a slot.** When a slot is free, the ready module earliest in the order takes it. The rule is fixed, and ARCH has no discretion over it. It is meant to give the same answer every time; that is unproven. Line 3 says "earlier modules' jobs run before later ones". Claude reads it by line 8: a later module does not wait for an earlier one that has no work yet. Say if that reading is wrong. Only your marked instruction puts a module ahead.
4. **ARCH starts the job session,** with instructions naming every act the job may take.
5. **The job works** in a draft pull request, writing only its own module's files. A flaw it finds in another module goes to ARCH, which passes it to that module's open job or records it as that module's work. A job may run its own module's tests in its session before pushing. That is its own practice, not a gate.
6. **The job completes.** It pushes and marks the pull request ready. The tests run on GitHub's machines. The job listens for the result on its own pull request, fixes its own failures, and sends ARCH one message when the tests pass.
7. **ARCH merges it** into the tranche branch with the process's tool, the only way a session can merge. There is no review and no act of yours.
8. **The slot is refilled.** ARCH gives the slot to the next ready job in the same turn. Every module that declares a use of the merged module is given a notice (section E).

**When a module's work is finished** (*Claude decided*). When its job merges, or when its notified job reports that nothing needs changing. That report is the job's closing message to ARCH. It makes no file and no merge.

**A job stopped by another module's flaw** reports the flaw to ARCH, records that it is blocked, pushes and stops. Its slot is freed. When the other module merges, the notice makes this module's job ready again.

**A change across many modules.** A change that touches many modules in the same trivial way, needing no judgment, is made in one pass by a helper inside ARCH's session, when no job is open. A module where it needs judgment gets its own job. Both clauses are in your documents. *Claude decided* the moment: between a round's last merge and its walk. It sends notices as any merge does. Line 19 adds that some such changes need no rerun of module tests. How one would merge without its tests is unproven: on 9 Nov the permission checker refused an act that let a pull request through without its check (measured, once).

**End of a round.** When every module that had work is finished, ARCH starts several sessions that walk the product, shared out by journey, and turns each finding into work for a named module. The next round begins. Walking by several sessions never ran in Process3; one script started by the tool did the walk. Where a walk runs is a build decision: the two late deploy-and-walk runs took 60 and 64 minutes (measured), and a session can run one step for about 30 minutes (Process3's table of platform behaviour), so a long walk has to run on GitHub's machines. Process3's decision record quotes you on 8 Nov: "be careful that there aren't too many external walkers to cause the Cloudflare system to exceed limits of the account". The number of walkers is not yet settled.

**A round with no failures** (*Claude decided* the meaning). The walk's list of failures is empty, and no step that was walked in the previous round is left unwalked. Process3's stored reports marked steps "ok" while listing failures: on 5 and 8 Nov every step was marked ok while 63 failures were listed (measured). Under this meaning those rounds were not clean.

**End of a tranche.** By line 6, a round with no failures ends the tranche. ARCH opens and merges the pull request that carries the tranche branch into the main branch as a whole. The main branch never moves while a tranche runs. None of the three tests runs on that pull request, so the main branch requires only whatever GitHub setting you have set. This merge never happened in Process3: its main branch has not moved since 1 Nov (measured).

**This conflicts with your words of 8 Nov.** Process3's decision record quotes you: "This successive set of rounds continues until an internal walk doesn't find flaws, the release deployment happens, and the walk of the release also doesn't identify flaws. When the release walk is clean, the installer is updated for that release, then the civicsmith.dev website is updated to refer to the new install, and that ends the tranche." Line 6 ends the tranche at a clean internal round and makes the deployed walk optional and later. This definition follows the later. Three things follow. The main branch can receive a tranche that fails when deployed: on 8 Nov the internal walk had all 238 steps marked ok, and the external walk of the same build passed 20 of 175 (measured). What the external walk finds waits for the next tranche, where your Foundations say "nothing found waits for the next tranche". And what is on the main branch cannot be called working. If the record of 13 Nov is wrong on this, say so.

**No bound on rounds.** No round in Process3 was ever clean (measured), and nothing bounds the number of rounds. Only your word ends a tranche that will not come clean, with the failures named.

**The external walk.** The product is deployed to a development site in its own Cloudflare account, reaching no one else, and walked there. Line 6 calls it optional. *Claude's reading:* it runs when you tell the coordinator, and before every public release. It runs after the tranche has ended, holds nothing back, and its findings are work for the next tranche. It is not one of the three tests.

**A public release.** Your Foundations say: "A public release is a development release the walkers have passed". The process prepares it and waits for your approval, given in a protected area of GitHub that names you as required reviewer and holds the production keys. Process3's decision record quotes two rulings of yours on the order. 8 Nov: "build the installer only when the internal walk completes without the need for another round, and build the site update only once the external walks complete without the need for another round." 9 Nov: "The first run or two of the external system will run without without an AI account connected", and "the installer update and site update wait until a release walk with AI on is also clean." Connecting that AI account is an act of yours. No release of any kind was cut in Process3 (measured). A development deployment does not use the installer, so no walk shows that the installer can place a release into an empty account. The whole release path is unproven.

## E. The three tests

Process4 has exactly three tests (line 5; in your own words of 14 Nov, "Process4 has three tests, ever"). A test runs only when there is a fully informed reason to run it (line 19).

1. **Module tests.** *Trigger (Claude decided):* a pull request changes a module's files. *Runs:* the tests of every module whose files it changes, on GitHub's machines. Line 5 says "each job's own module tests"; the wider trigger means an edit that strays into another module's files is at least run against that module's tests. It includes the check that the uses a module declares match what it imports. *A failure* goes back to the job. A rule for the job, with nothing checking it, from your Foundations: "every requirement is tested at the module's interface and proven met".
2. **The notice.** *Trigger (Claude decided):* any merge into the tranche branch, by a job or not, that changes a file under a module's source or changes one of its public requirements. *Runs:* every module that declares a use of it is told; each one's job reads the notice and decides. *A failure* is fixed by that module's job.
3. **The internal walk.** *Trigger:* the end of a round, or your word to the coordinator at any time. *Runs:* several sessions walk the product as built, without deploying it. *A failure* becomes work for a named module in the next round.

There is no full regression; the internal walk replaces it (line 6). There are no layers.

**What counts as adding a test** (*Claude decided*). A module's tests and the walk's steps are product work. Each exists only to prove a product requirement, which it names. Adding one to prove a requirement is not adding a test to the process. A test or step that serves the process (records, formats, bookkeeping) is not allowed. This is a rule in text. Process3 had 211 such test files (measured).

**The process's own tests** (*Claude's reading of "three tests"; overrule it if you read your words otherwise*). The process's own tool has tests of its own. They run only when the process itself is changed, are not among the three, and can never stop product work. The size limit on each role's starting text is one of them and stays. It was the one limit that held in Process3.

**Three consequences** (*Claude decided*).

- The rule that a job writes only its own module's files has no check behind it. Line 14 says "Kept" of the rule and does not say whether the check was meant. In Process3, 0 of 2,540 job commits changed another module's source or tests (measured), with the check in place, so the record cannot show what held the rule.
- The uses check has two possible scopes; which it has is a build decision. If it reads tests, it fails on day one: 198 import lines in tests go to a module the importer does not declare (measured). If it does not, it cannot see them. ARCH repairs them by declaring them in the module list.
- There is no separate install test or upgrade test before a release. One module has an upgrade test among its own tests; Process3's decision record of 8 Nov quotes you narrowing it to "the last 2 or 3 versions". It stays in test one. A walk starts from a fresh copy and cannot see an upgrade breaking a user's existing data.

### The notice in detail

**The interface.** Your Foundations say: the services listed in the public part of a module's requirements file. Measured on today's code, other modules rely on four parts: the names a module exports; its public requirements, each under a permanent number; its tests, which name the requirement they prove; and a few published files that are not code.

**Why the trigger is wider than line 3's "changes a module's interface".** A replay of Process3's 178 recorded changes tried each wording against the 241 effects that Process3's AI workers judged real (measured, on this record only). "One of the four parts changed" reaches 236. "A source file changed" reaches 239. The trigger of test two reaches all 241. Process3 gave no notice for merges that were not jobs; 45 of those changed a named part.

**What Process3 did, corrected.** The second draft said Process3 told every declared user. It did not. 167 declared pairs were sent no notice: 101 were told by another route and never judged, and 66 by no route (measured). Three of the 66 call the very function whose change was judged to affect 14 others; from that, the worker who ran the replay infers three real effects outside the 241. Process4's rule would have reached them.

**What the notice says.** It names the parts that changed. If none can be named, it says so. Process3 recorded that for 65 of 178 notices. Read again at each change's own commit it is 17, or 11 if a value that changed while its name stayed the same is also detected (measured).

**What a notified job does** (*Claude decided*). If the module has a job open, that job gets the notice. If not, the notice is work and the module's job becomes ready. The named parts are a guide, never a limit on what the job reads. If the job changes its module, the module's whole tests run as test one. If nothing needs changing, it runs nothing and tells ARCH. This departs from line 10, which has the job check "those parts and no others" and run "only the tests that relate to them". The replay broke the first half. Of the 241, 169 were matched to a named part by script (measured). 67 needed a reader, who judged 64 led, 1 weakly led and 2 not led; that is one worker's judgment, and the worker knew the answer. The 2 were a changed test helper and a new database table. 5 sat in changes where nothing could be named. The second half cannot be done today: nothing can pick the tests that relate, and a replay cannot measure it.

**The price.** Estimated, from a simulation on the real module list (reasoning on measured inputs, not a measurement): for 65 modules with real work, about 177 jobs, about 100 of them finding nothing to change; in a first round 59% to 71% of job starts come from a notice alone. Measured beside it: read as the four parts, 71% of Process3's job merges (360 of 504) change the interface, because nearly every job edits a test whose title carries a requirement's number. Claude infers that most merges will send notices; the share under the chosen trigger was not counted. No remedy within your rules was found for the needless jobs. Process3's remedy was a helper that judged each notice first, at a median of 20 cents (measured); that is a judgment step. Not yet settled.

**Still not proved:** that recognising an interface change is rigorous and correct (line 11). The 241 lie inside the set that was told, by construction, so the replay could have broken the rule and cannot prove it. 532 declared pairs were never judged, against 2,342 that were, 2,101 of them judged not affected. The verdicts are AI workers' judgments. A module that depends on another without declaring it is never told. Measured on today's code: no such dependence by import in product code (3,029 import lines); 122 undeclared pairs by imports in tests, 36 of them to a later module (the second draft's "38"); 240 pairs in all if file names and database tables written in code are counted (a rough text search, with some noise). No effect on an undeclared user was shown, and none was ever judged. That claim stays open.

## F. When something goes wrong

**A job fails its tests.** The job fixes its module and the tests run again. After two failed corrections ARCH replaces the session with a fresh one. Your ledger note gives its first task: "the restarted session should recognize that corrections were made and try to understand why to anticipate all other needed corrections so it doesn't continue to fail." A job that cannot go on records that it is blocked, pushes everything and stops; its slot is freed.

**A session dies or fills up.** For a job, ARCH starts a new session that continues from the same branch and pull request. For ARCH or the coordinator, ROOT starts a successor, which begins from the shared state and GitHub, not from notes. The hourly alarm catches a dead session that no event reported. Replacing ARCH while jobs are open is unproven.

**A module is found to use a later module.** That is a design error in those modules, fixed by refactoring them, that is, reshaping their code without changing what it does (line 13). Today three declared uses point to a later module, and 39 pairs do so through imports in tests (measured).

**The process itself has a fault.** A session that finds one reports it to ARCH and does not fix it where it stands. ARCH starts a fix session. Line 20 limits the fix: it may only correct or remove what is broken, and must not add a test, a gate (a check that must pass before work goes on), a review or a stop. *Claude decided* to remove the cause as well as the effect, by restoring two sentences from your Foundations, which the field report quotes as your written instructions: "caution is a cost, paid only against a measured failure or your word" and "the default answer to a finding with nothing measured behind it is no change". So a process fault that stops no work may be answered with "no change". Nobody has a duty to build something for every fault. Only a fault that stops work must be fixed. A fix session's work is done when the stopped job runs again, not when its change merges. The fix session's rulebook carries these sentences. They are rules in text; nothing enforces them.

An example from Process3: a report read wrong because two jobs recorded a cost of zero. The fix made completing a job refuse without a cost figure, and blocked every job for 45 minutes (measured). A corrective fix writes "unmeasured". "No change" was also a right answer.

The line between correcting and adding cannot always be drawn. Three Process3 cases (measured) had no purely corrective fix in sight. Two merges that each passed alone left the tranche branch failing; the answer then was a second test run, which has ended. The internal walk could not see 1,690 page faults that showed only when deployed; the fix added checks to the walk. A finished job went unnoticed for 194 minutes; nothing existed to correct, and what was built was holds and alarms. A real hole in a small process may have no corrective fix. This is unanswered.

A fault that stops work pauses the product until the process is fixed; the same jobs then continue. A fault that stops nothing waits for the next tranche (your Foundations). Process3's decision record quotes you on 9 Nov that moves of the process version "should happen as needed, but also ganged up when possible". Claude follows the Foundations here, because Process3 moved the version 116 times in nine days (measured). Say if your words of 9 Nov should govern.

**The process is completely blocked.** Only then does it wait for you (line 2). You get one plain message with a numbered list of what is yours to do. An example from Process3: GitHub suspended the account the sessions work under. In every other case the stop is recorded as a named blocker and other work goes on. A blocker that only you can clear is told to you at once, with options and a recommendation, while other work goes on.

**A stop on your word.** You tell the coordinator, which tells ARCH, which interrupts each job. The stop is a line in the shared state naming the account. ROOT reads it at every wake, so that the hourly alarm does not undo it. After your stop of 9 Nov the alarm went on firing and had sent 94 notifications by 13 Nov (measured). Unproven.

## G. Permissions

Permission management is Process3's, preserved (line 12).

**Auto mode and the checker.** Every session runs in Auto mode: it acts without asking a person, and an automatic permission checker run by the platform judges each risky act and may refuse it.

**Your standing approvals** are a block of text in your own words in CLAUDE.md. It says what sessions may do without asking you and what they may never do. You commit it yourself on GitHub's website, in the product's repository and in the process's. No session writes, edits or relays it. Consent merely quoted in a session's starting text was declined 11 times out of 11 (recorded in your Foundations; no evidence file was found). A session loads the approvals only when it starts.

**After you edit your approvals.** As in Process3, a long-lived session compares the approvals it loaded with the newest, and on a difference does nothing. The known cost: each of your five edits in Process3 stopped every long-lived session, and after the last the product never restarted (measured). So an edit to your approvals is one act together with restarting ROOT.

**The deny list** is a list in settings.json of commands taken away from every session outright: every direct push, every GitHub command, the ordinary merge commands, pushing with force (overwriting a branch's history), deleting branches, and writing files through GitHub's web interface. So the process's tool is each session's only door to GitHub.

**GitHub's own rules** are your settings. Sessions act as a second GitHub account that can push and merge but cannot change settings. No branch can be deleted or overwritten. The tranche branch takes a change only by pull request, with the tests of the changed modules passing. The main branch takes the tranche only by pull request; none of the three tests runs there.

**How a session must be started** for both to take effect: with one repository only, because a session that holds more loads no deny list; from the newest commit of the tranche branch, never from the main branch, which still holds your approvals of 1 Nov; in Auto mode; and with starting instructions that name every act it may take. ROOT, started by your plain prompt, does not meet the last condition. Whether that works is unproven.

**Working rules that exist because of the checker**

- One judged act per command, never chained with another.
- A refused act is never reworded or handed to another session. It is recorded and raised.
- Two kinds of "no" are kept apart: the checker refusing, and the session itself declining because its instructions did not name the act. Only the second may be tried again, once, in a new session whose instructions name it.
- Three refusals in a row stop a session. It is replaced, not resumed.
- Nothing needed for correctness is meant to depend on archiving a session or switching off an alarm. One limit bears on this and is unmeasured (section L, item 14).

**Wording changes only you can make.** In the approvals: "Process3" appears three times; "BOB" and "layer close" appear in the paragraph on design lanes (design areas you point out and ARCH sets up, such as user experience); and the clause on a reviewer's exemption is dead. In settings.json: the rule that allows pushing names the Process3 tool by its file path and must match Process4's tool, or no session can push; and two retired hooks (commands run before every command of every session) are still there, and only you can delete them.

**Proven and not proven.** About 700 merges with no review went through Process3's tool with no recorded refusal. The counted trial, no refusals in about 450 acts (same source), was of merges that carried a review verdict. Process4's tool is unmeasured (section L, item 5).

## H. What is kept from Process3

**The count.** Of your 288 requirement lines: 163 are kept as written; 44 are kept with the way of doing them changed; 11 end under the decisions recorded as yours; 22 are ended by Claude; 40 end in part, 13 of them under the decisions recorded as yours, 22 by Claude and 5 by both; 6 are not yet settled (section I); and 2 wait on the question in section M. These were counted on the appendix as redone for this draft.

**A check that could stop work stays only if this document names it.** Named: the three tests, the start-up comparison of your approvals, and the process's own tests. *Claude decided,* as following from "three tests, ever", that these end: the check of your credentials when a tranche opens; the check of the process version at a session's start; the check that the process files a product holds have not drifted; the guard on your approvals block inside Process3's record check; the format and coverage checks beside a module's tests; the re-run of checks when a tranche closes; and the check that no built file is committed. With the guard gone, nothing in git stops a session's pull request from changing your approvals; what remains is the permission checker. The rule that a job commits no built file stays as text, but nothing now names who builds and commits built files. *Claude decided:* the module's own job does, in its own pull request. The rule that a test checks a text's key and not its words stays as a rule for writing tests; it has no check.

**Your ledger is unchanged.** It still shows "keep" or "modify" for every line this definition ends. Where the two differ, this definition says which decision it follows. Your ledger is yours to change.

By theme:

- **The record.** Git and GitHub hold all state. One writer per file. A session acts only on what it has read in full or measured, and starts from the shared state and GitHub, not from notes.
- **Modules and requirements.** One total order. One owner module per file. Requirements in a public and a private part under permanent numbers, stating behaviour.
- **A job's life.** One module, one branch, one draft pull request.
- **Platform.** The process stands only on measured platform behaviour.
- **Texts.** One short rulebook per role, at most ten rules, rewritten in place. The product's CLAUDE.md stays under thirty lines, written by ARCH line by line.
- **Sessions.** Kept short. Design lanes.
- **Maintaining the process.** Its own repository. One fixed version for each tranche, moved only by a recorded act.
- **GitHub's limits.** Process3's decision record quotes you: "80% or 90% of github's published limits" (6 Nov) and "don't do it beyond just making sure that we don't exceed published limits" (9 Nov). Kept. How is not yet settled.
- **Reports.** One tranche report, produced once, at the tranche's end, only from what git and GitHub already hold: time, work done, work left, anything deferred and why, cost where it can be read ("unmeasured" otherwise), the overhead share, the time ARCH stood idle while work was ready, and the minutes it took of yours. No number is a target. Nothing reads the report to decide anything. Who writes it is not yet settled.
- **Releases.** Your Foundations: the process owns what can be proven in git and on GitHub's machines, "and nothing that happens on a live site".
- **The eight things you dropped in your ledger stay dropped.**

## I. What ends, and why

**Under decisions recorded as yours**

- **Layers** (three lines, one of them the line about when a layer closes). Lines 7 and 24.
- **The full regression and whole-product checks before a release** (three lines). Line 6. In Process3, 218 of 220 jobs were complete with passing tests while the walk of the deployed product failed 147 of 157 steps, and the internal walk of the same build had 70 of 357 steps not ok, with 96 failures listed (measured). This also ends the option, in your own ledger words of 31 Oct, to have whole-product checks run "when I ask for one". What remains: your word to the coordinator runs the internal walk at any time.
- **Deliberate-fault sampling of tests on payment and data paths** (two lines). The record of 13 Nov lists it as ended by line 5. It was never built.
- **Review by a fresh reviewer** (two lines). Line 21. On the product only 28 of 279 job merges were reviewed (measured).
- **A default of 24 live sessions, which ARCH could change** (one line). Line 9. Your documents give four numbers: 24 in the Foundations (1 Nov); "as many as 8 jobs at a time", which Process3's log quotes you saying on 6 Nov; 20, which Process3's decision record has you setting on 7 Nov and which "(default: 20)" in the field report draft repeats; and 8 in the record of 13 Nov. This definition follows eight.
- **Your words of 8 Nov on when a tranche ends,** replaced by line 6 (section D). Updating the installer and website is no longer part of ending a tranche.
- **Parts of kept lines:** the word "layer" wherever it appears; tests run "at layer close" or "nightly"; the "one full test run" after a change across many modules; a development release "in each round".

**By Claude's decision**

- **Three checks that ran beside a module's tests** (four lines): that a job's new tests fail when its change is undone; a second run of the module tests on the merged result; and that built files match their sources. The record of 13 Nov lists them as ended by line 5, in the session's own sentence. No words of yours confirm it, and your ledger still shows all three as kept. So this is a consequence Claude draws from "three tests".
- **Parts of kept lines:** reviewing as a use for helpers; the name "BOB"; a session writing down its own summary of what you said as yours; and the standby session for ROOT.
- **The first of your two health numbers.** Your Foundations call the two "the standing judge of every other line". The first, false "done" claims caught by independent re-verification, can no longer be produced: the re-verification it counts ended with lines 5 and 21. The second, the cost of each pull request that survives, stays as a reported number where cost can be read. Neither was ever produced in Process3.
- **Three measurements your ledger asked for,** ended unmeasured. An architecture session that keeps no memory between wakes, against one that hands over: it cannot run, because a session started by an alarm could not start sessions (0 of 3, measured). Trimming the principles each role loads by the line-by-line test: that test ends (section J, item 8). The share of ARCH's work that is passing things on: never taken.

**Not yet settled.** Your Foundations also ask for four things this draft has not placed, and Claude has not decided whether each stays: counting refused acts each tranche, and trying a handful of approved acts when a tranche opens and at each model release; removing parts of the process one at a time at each model release, to see whether they are still needed; the hourly alarm catching lack of progress, not only silence; and checking that every new session has started.

## J. Earlier requirements Claude has ended or kept on the evidence

No decision of yours ends these. They are ways of doing something, so Claude decided them. Thirteen items cover seventeen lines. You can overrule any.

1. **The job's written receipt** of the commands it ran. It caught nothing in 1,187 test runs (measured), and Process3's decision record quotes you on 9 Nov: "get rid of it completely". *Ended.* The other half of that line stays: a job reports flaws it finds in other modules.
2. **The set-up check before every job start.** It refused every job start after you applied new settings, and took a "too many requests" reply from Cloudflare for a missing token (measured). *Ended,* as a decision record of 9 Nov began to, on your instruction quoted there: "Is this needed at all? If so, it must be done efficiently. If not, then cut it." The list of settings stays.
3. **The size cap on a module's requirements file** (two lines). Built as a refusal, it was overridden 32 times out of 32 (from the earlier review; not re-measured), and one split put a loop into the module order. *Ended.* Its purpose stays: a module fits in one reading.
4. **Recording each job attempt's reading list and cost.** Made compulsory, the cost figure blocked every job completion for 45 minutes (measured). *Ended* as a duty on jobs, and the cost alarm in your ledger with it. Cost is reported where it can be read.
5. **The check that fails a commit adding an oversized file or a file in a temporary folder.** The record check it was part of gave 947 findings on its first run, and seven later changes repaired false alarms (measured, for that whole check). *Ended.* Its purpose stays: a lean repository.
6. **The job record as a strictly formatted data file** (two lines). You wrote in your ledger: "Try this, but measure the experience with an open mind as to whether it's work or not." The measurement was never taken. 105 of 508 merges changed nothing but these records (measured). *Ended,* on cost.
7. **Every rule must cite a measured failure or your decision.** Every addition in Process3 carried a citation, and checks were added in 41% of merges both before and after 5 Nov (measured), when Process3's record quotes you: "We only add additional checks when we can confirm from factual study and data". *Ended.* Line 20 covers tests, gates, reviews and stops only. New records, rules, alarms and duties are held back only by your two sentences in section F, in text.
8. **A line-by-line test of instruction files in place of a size limit** (two lines, and a clause in a third: the ledger note on who writes the product's CLAUDE.md, saved again on 14 Nov, still asks for it). It was only advice. The one hard size limit held all week, while the guide with no limit grew from 8 KB to 134 KB (measured). *Ended.*
9. **"Nothing is ever refused for size", for the process's own texts** (two lines). *Ended* for those texts only. Only Process3's existing limits on role texts refuse. Nothing new refuses.
10. **The reading audit.** Never built. *Ended.* The rule, act only on what you have read in full, stays.
11. **The start-up comparison of your approvals.** Claude reads line 12 as covering it. *Kept* as Process3 ran it, with its cost stated in section G.
12. **Deploy tokens held as settings of the Claude cloud environment.** The only route measured to work. *Kept.* Its confirming check goes with item 2.
13. **Running module tests in two parts, so that product code under test holds no access token.** The failure it guards against was never seen. *Kept,* because removing it changes how tokens reach test code, which is part of the permission management you preserved.

## K. What does not exist yet

- **No Process4 tool exists.** Process3's merge tool with its three review rules removed is not it. That tool also refuses on a missing record entry, a missing cost figure, files outside the module, a missing receipt, a second test run and built files, all of which end here. Process4 needs a new small tool that does only this: push; open a pull request and mark it ready; merge; start the next job by the fixed rule; send notices; and write the shared state. Its size will be stated once it is built.
- **No Process4 role texts exist.**
- **The product's repository is not converted.** Its CLAUDE.md on the tranche branch today tells a session whose prompt was not printed by Process3's tool: "Act only as it says; with none, act on nothing." So a ROOT you start with a plain prompt is told to do nothing. Two retired hooks still run there (section G). Its required test run is Process3's. If that run's name changes, changing the GitHub rule that requires it is one settings change of yours. The test run must also report on pull requests that change no module: your approvals commit, ARCH's edit of the module list, the tranche into the main branch. If that is missed, your first commit cannot merge.
- **Nothing is built for:** the shared state; a start by you that lands on the newest approvals; a walk shared among several sessions; the release path; the stop on your word; a change across many modules; or the fixed-version setting of section M.

Builder: Claude, in the build step, before anything is in force.

## L. What is not yet proven

Your Foundations say: "Nothing here is in force until it has run on a real tranche with the two health metrics measured." The first of the two can no longer be produced (section I), so that half cannot be met as written. Each trial below could break its claim. None can prove it; proof is the first real tranche. Your ledger asks first for "one shadow of a representative slice". *Claude decided* the combined trial run of group 2 stands as that slice. It uses small made-up modules, not part of the real product, so it is weaker than your note asks.

**Already tried: the replay of Process3's 178 recorded changes**

1. *Claim:* telling every declared user, on the trigger of test two, misses no effect. *Result:* not broken on this record, all 241 reached (measured); not proven, for the reasons in section E.
2. *Claim:* naming the changed parts lets a notified job read less without missing an effect. *Result:* broken as stated: 2 of 241 not led, 5 where nothing could be named. "Test less" cannot be measured by a replay.

**Group 1. Can be tried with nothing asked of you**

3. *Claim:* the fixed rule gives the same answer every time. *Trial:* once it is written, run it twice on one record, and again with the record in another order.
4. *Claim:* the internal walk finds what a full regression would. *Trial:* put back the one known break between two modules, of 4 Nov, which module tests missed, and see whether the walk finds it. Can break only. It may need one session that only reads.

**Group 2. Needs a throwaway repository and sessions on your account.** Judged cost to you: one sitting of about half an hour, two session starts, one edit to your approvals and one "stop".

5. *Claim:* a merge with no review, by Process4's tool, passes the permission checker. *Trial:* twenty or more merges by an ARCH that a ROOT of yours started, each as its own command, counting the checker's refusals and the session's own declines apart. Twenty, not one, because the checker has passed and refused the same act minutes apart.
6. *Claim:* ROOT, started by your plain prompt, starts ARCH and the coordinator on your newest approvals, and your suggested effort reaches a job. *Trial:* one run through, with a second start straight after an approvals commit. In Process3 a ROOT you started straight after an edit came up on an old copy, twice out of twice.
7. *Claim:* sessions started this way load your approvals and the deny list. *Trial:* one try each: a denied command is refused by rule; an approved act the instructions did not name is carried out.
8. *Claim:* a freed slot is refilled within minutes, and jobs obey a replaced ARCH. *Trial:* eight slots, one failing job, one replacement of ARCH with jobs open. With no event, Process3 once noticed a finished job after 194 minutes.
9. *Claim:* shared state in one place on GitHub, written with no merge, works. *Trial:* the same run.
10. *Claim:* the hourly alarm wakes ROOT itself. Measured in Process3 five times out of five; three more firings were the standby's. *Trial:* one firing on a ROOT you started.
11. *Claim:* after an edit to your approvals and a restart, the whole chain runs on the new approvals. *Trial:* one edit and restart during the run.
12. *Claim:* a stop, a held merge, a module put first and a new slot number each work on your word, and the alarm does not undo a stop. *Trial:* one rehearsal of each.
13. *Claim:* a change across many modules can be made between a round's last merge and its walk, and merges. *Trial:* one rehearsal, including whether the checker passes a merge whose tests were skipped.
14. *Claim:* finished sessions do not use up the account's room. Process3 saw new starts fail silently at about 50 live sessions (one event); a round may need about 170 jobs (estimated). *Trial:* one measurement of whether finished sessions count.
15. *Claim:* the tranche branch merges into the main branch. *Trial:* one rehearsal.
16. *Claim:* several sessions can share one walk by journey, and a long walk can run on GitHub's machines. *Trial:* one rehearsal.
17. *Claim:* a process fix adds nothing. *Trial:* give a fix session ten Process3 faults whose recorded fixes were additive, and read what it produces. Can break only: it shows day one, and Process3's restraint lasted hours after each reminder.
18. *Claim:* the fixed-version setting of section M can be built so that only you can move it. *Trial:* build it in the throwaway repository and try to move it as a session.
19. *Claim:* a release can be prepared as far as your approval. *Trial:* one rehearsal, stopping before anything is published.
20. *Claim:* an account switch loses no work. It failed on 5 Nov and was cancelled on 7 Nov. *Trial:* one rehearsal on a second account, when a real switch is near.

**Group 3. Only the first real tranche can show it**

21. Whether a clean round can be reached. No round in Process3 was clean.
22. Whether the process is the same at the end of a tranche as at its start: one comparison from git, once, when the first tranche ends.
23. Whether the checker goes on passing merges at a real rate. Twenty clean merges bound the refusal rate only below about 14% (estimated).
24. How often a small Process4 meets a process fault that stops work. Unknown today.
25. Whether cost can be read for the tranche report. In Process3 it often could not.

**Group 4. Unanswered risks, with no trial**

26. Nothing bounds the number of rounds. Only your word ends a tranche that will not come clean.
27. Sessions write and count the walk's steps. A step that was loosened cannot be seen.
28. The main branch can receive a tranche that fails when deployed, and a real install into an empty account has never been shown.
29. A job writes the tests that judge its own work. About nineteen requirements in twenty (estimated) have no other look than the walk: 8,838 requirement numbers against 236 to 357 walk steps (measured). Half of the week's twenty recorded false "done" findings were tests that pass either way.
30. A module's tests run only when its own files change. A failure caused by another module's merge can sit unseen and travel to the main branch.
31. An edit that strays into another module is tested, but nothing tells that module's job.
32. The line between correcting and adding cannot always be drawn, and a real hole may have no corrective fix.
33. Nothing physical stops additions outside the process's own repository (listed in section M). There is no measured evidence that the permission checker enforces a bare "never".
34. Needless notice jobs: about 100 in a round of 65 (estimated), with no remedy found within your rules.
35. Most rules in this document are held by text alone. In Process3 the one rule with a hard limit behind it held all week, and rules held by words drifted (measured).
36. Why GitHub suspended the sessions' account on 6 Nov was never learned.

## M. Questions

### The question that is yours

**Is the version of the process that a product uses fixed for a whole tranche by a setting only you can change?**

*What it is.* Your requirements as they stand are that Claude decides and fixes the process, that you take no act on it, and that it runs unattended. Within them, nothing physical stops a session adding to the process. In Process3, 121 of the 296 changes merged into the process's repository added a check (measured). Every physical stop that was found needs an act of yours each time the process changes. The fullest form, you merging every process change, was the centre of the proposal withdrawn on 13 Nov, because it contradicts your requirements. It is not proposed again. One narrower form remains, which asks for no judgment and no merge from you. Sessions go on deciding and making every process fix. But the version of the process that a product uses is fixed for a whole tranche by a setting only you can change. Your documents already require one fixed version for each tranche, moved only by a recorded act. In Process3 sessions moved it 116 times in nine days (measured).

*Why it matters to you.* The cost to you is one settings change at the start of each tranche, and one more whenever a process fault stops work in mid-tranche. Until you make it, the product waits for you. In Process3 one question that sessions carried as yours waited about nine hours (measured). What it does not do: it does not stop additions gathering between tranches, which you would adopt whole when you move the setting. And it stops nothing outside the process's own repository: a session being over-cautious in its own work; demands written into another session's starting instructions or messages; a helper briefed as a reviewer; tests or walk steps that serve the process, placed among the product's; helper commands in the product that jobs are told to run; and text a session drafts for you to commit. It is untested. How the setting is built is Claude's to work out and to prove in a trial before it is relied on. How often a small Process4 meets a process fault that stops work is unknown.

*The alternative.* No act of yours. The rule stays text. This time it is placed in your own committed approvals in the process's repository, where Process3 never put it, with the causes removed as far as section F does. There is no measured evidence that the permission checker enforces a bare "never". The trial in section L (item 17) can break this. It cannot prove it.

*Claude's recommendation.* Take the fixed version for the first tranche. It is the cheapest way to learn how often the process really needs to change: every change is counted by your own act. This is a recommendation on an unproven mechanism, not an assurance.

### Records to confirm or correct

Not new questions. Each is a place where two records of your words differ, or where Claude chose a reading: when a tranche ends (section D); ROOT's repository (section B); who takes a free slot (section D, step 3); the number eight (section I); and four readings in section E (the wider triggers of tests one and two, what a notified job does, and the process's own tests).

### Your eight earlier open points

1. **The check that a job wrote only its own module's files.** *Claude decided:* it ends; the rule stays in the job's instructions (section E). The only firings found in the record were three false alarms; a full count could not be made. No GitHub setting can restrict which files a push changes on a public repository (GitHub's documents, as a worker read them).
2. **The install test and the upgrade test before a release.** *Claude decided:* both end as separate tests. Neither was ever built as a release test.
3. **Set-up acts on the Claude side.** Not a decision. They are on your list (section C).
4. **Approving one particular merge.** It stays: your ledger keeps it. You tell the coordinator, marked as an instruction. Never used in Process3; untried.
5. **The judge of the process.** Section I.
6. **The external walk.** Section D: when you say, and before a public release.
7. **Eight slots.** Process3 counted across the account. With one product running, the two readings are the same. *Claude's judgment* for two products: you tell each coordinator its own number. This touches a point put to you on 13 Nov that has no recorded answer.
8. **Reordering.** Your Foundations say your word adds and reorders work. Untried.

### Product questions that will come to you when Civicsmith's remaining work is walked

Claude's study of the module order found one that is yours. It is not decided here. Whether a member's own Claude sign-in through the runner still exists: one module still passes that sign-in to four addresses in another module that now answer "not found", and its requirements file states both positions.

The same study also called a second point yours: whether a module may hold requirements and no code, as 29 of the 220 do (measured). Claude decided it is technical. Those modules came from splitting requirements files under the size cap, which has ended, so ARCH folds them back (section C). Overrule this if you see it differently.

### Notes in your ledger

On 14 Nov six notes in the ledger's store changed: each now reads as the earlier session-written text with the sentence that attributed it to you removed. The store does not record who made a change. One of the six, on when a layer closes, now holds the same text as the note on session depth, which looks like a paste slip. This document does not rely on it.

### Other technical points, decided by Claude

1. **How a process fix reaches a tranche in progress.** Only a fix for a fault that stops work. Under the fixed version above, by your settings change.
2. **The three declared uses of a later module.** ARCH corrects the module list where the code already runs one way. One registration, by which one module adds itself to another's list, is turned around; that spans three modules' jobs. Whether a user sees a change is not measured: the module order is built into the product, and the study says moving a module that registers something can change what a member sees.
3. **Your standards for scale, speed and cost** now that layers are gone: planned measurements at scale, which your ledger keeps.
4. **No separate list for a "completion round".** Rounds repeat.
5. **Which process files a product receives.** The short fixed set your documents list.
6. **Not yet settled:** the needless notice jobs; the number of walkers; who writes the tranche report; the exact form of the shared state and of the notice.

---
