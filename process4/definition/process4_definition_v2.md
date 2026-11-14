# Process4: definition, second draft

14 Nov 2026. For Bob, the owner. Written by Claude.

**How to read this.** The main body uses plain words and no reference codes. It states what you have decided and what your requirement documents already say. Anything unproven is listed in section J. One question is still yours, in section K. The appendix shows where each of your 288 requirement lines went.

**Whose decision each thing is.** "You decided" means a decision of yours. "Claude decided" means a technical decision Claude made on the evidence and is reporting to you; you can overrule any of them. Nothing Claude decided is written here as yours. One caution: your decisions of 13 and 14 Nov reached this document through a session's written record of them, not through text you typed. If any is recorded wrongly, say so.

**What changed since the first draft.** The thirteen earlier requirements of section I, and six of the seven questions of section K, were technical, and Claude has decided them. Two of your powers that the first draft proposed to end now stay. Three facts were corrected. One new question, the hardest, is put to you in section K.

## A. What Process4 is for

Process4 is the way AI sessions build a software product for you in a GitHub repository while nobody watches. Its one output is correct, working product behaviour that meets its requirements, merged to the main branch quickly and cheaply, and still there later. You define the product: its purpose, audiences, requirements, principles and broad design. The AI decides everything technical and tells you in plain words what it did. Process3 failed because its sessions kept adding checks, reviews and record-keeping to the process itself until product work stopped. Process4 keeps almost all of your requirements and takes away the parts of the process that grew.

**Words used here**

- **Session:** one running AI conversation in Claude Code's cloud.
- **Module:** one part of the product, with its own files, tests and requirements file. The product is one ordered list of modules, and a module may use only modules before it.
- **Job:** one session's work on one module, delivered as one pull request.
- **Slot:** room for one job to run. Eight by default.
- **Tranche:** one batch of product work, built on its own branch, reaching the main branch only as a whole.
- **Round:** one pass within a tranche. Every module that has work gets its job, then the product is walked.
- **Walk:** a scripted journey through the product as a user would make it, with checks at each step.

## B. Who does what

**You, the owner.** You define the project and answer the questions that are yours. You enter no commands and edit no source files. Technical questions are not brought to you. Your acts:

| Your act | How often |
| --- | --- |
| Change a permission or rule setting in GitHub or Cloudflare | Very occasionally |
| Commit your standing approvals to the product's CLAUDE.md, and the deny list to its settings.json, on GitHub's website, as in Process3 (section F) | At the start of Process4, then only when the wording must change |
| Connect Claude to GitHub, and enter the deploy token and other secret values into Claude's cloud environment, following a page the process writes | At the start of a product and at an account switch. In Process3: three times in nine days |
| Start the first session, ROOT | Once per start or restart of development |
| Tell the coordinator things in conversation | Whenever you choose |
| Approve a public release | Once per public release |

There are no others, unless you choose the wall in section K. The set-up row is new on this list: the platform gives no session a way to do either act, so it is a fact and not a choice. Only words you wrote yourself count as your word. A session never records its own decision, or its summary of what you said, as yours.

**ROOT** is the first session. You start it on the product's repository. Your first prompt says you are starting or restarting development of a named product with Process4 and names its repository. It may suggest a model and effort, and mention an account switch or other pertinent details. ROOT starts ARCH and the coordinator. Once an hour an alarm wakes it as a safety net, exactly as in Process3, to wake or replace a session that has stopped. ROOT decides nothing and builds nothing.

**The coordinator** is your front door: the session you talk to. ROOT starts it. You tell it when accounts are about to change, so it can stop development in the old account, and you tell it a new slot count. It passes your words on exactly as written, with the date, and they are followed. That includes "hold that merge for me", "do that module first" and "skip the external walk". Nothing special is built for any of these; your word is enough. It decides nothing about the product and never brings you a technical question.

**ARCH** is the architecture session, one per product. It is never called "BOB", so it cannot be confused with you. ROOT starts it. It starts jobs, merges them, passes notices between modules, and decides every technical matter of the product. It does not choose which job starts next; a fixed rule does (section C). It never edits your approvals or publishes a release without you.

**A job** is a session ARCH starts to do one module's work. It decides how to meet that module's requirements. It writes only its own module's files, and never merges, starts a session or deploys.

**A worker** is a helper that ARCH or a job starts inside its own session, for bulk reading or side-by-side sub-tasks. It returns its result and ends. It decides nothing and never reviews another session's work.

Sessions are at most three levels deep, and none starts its own replacement. Git and GitHub hold all state. Sessions are woken by events, such as a job finishing or merging; the hourly alarm is only the safety net.

## C. How work flows

**The life of one module's job**

1. **The module has work.** A requirement in its file is marked "not yet met", or a walk finding or a notice has been placed against it. A notice says that a module it uses has changed.
2. **Its job is ready:** the module has work and no job already open. It does not wait for the modules it uses to finish.
3. **It takes a slot.** When a slot is free, the ready module earliest in the order takes it. The rule is fixed and gives the same answer every time. ARCH carries it out and has no discretion over it. Only your own word, passed on exactly by the coordinator, puts a module ahead.
4. **ARCH starts the job session,** with instructions naming every act the job may take.
5. **The job works** in a draft pull request, writing only its own module's files. A flaw it finds in another module goes to ARCH, which passes it to that module's open job or records it as that module's work.
6. **The job completes.** It pushes and marks the pull request ready. Its module tests run on GitHub's machines, not in the session.
7. **ARCH merges it** into the tranche branch once the tests pass, using the process's merge tool, the only way a session can merge. There is no review and no act of yours. Done means merged.
8. **The slot is refilled.** The merge wakes ARCH at once and the slot goes to the next ready job. If the change altered the module's interface (what other modules rely on), every module that uses it is notified.

An example: all eight slots are full and the module at place 40 merges. Modules 12 and 57 are ready. Module 12 starts, even though a module it uses still has a job open.

**A change across many modules.** A change that touches many modules in the same trivial way, needing no judgment, can be made in one pass. Some such changes are so trivial that module tests need not be rerun.

**End of a round.** When every module that had work has merged, several sessions walk the product. Each finding becomes work for a named module, and the next round begins.

**End of a tranche.** A round that completes with no failures ends the tranche. The tranche branch merges into the main branch as a whole; the main branch never moves while a tranche runs. A deploy-and-external-walk then follows: the product is deployed to a development site in its own Cloudflare account, reaching no one else, and several sessions walk it there. You made this walk optional. Claude decided how the option works: a fixed rule runs it after every tranche, no session chooses, and you skip it by telling the coordinator. It does not hold the tranche back. What it finds is the first work of the next tranche. The reason for running it by default: on 8 Nov the internal walk had every one of its 238 steps passing (with 63 failures of a kind already known), and the external walk of the same build passed 20 of 175. Each external walk took about an hour.

**A public release.** It must have passed an external walk, as your documents say. Claude decided that this walk is run on a copy installed with the real installer, since a development deployment does not use the installer. The process prepares the release and shows you what it carries. It waits for your approval, given in a protected area of GitHub that names you as required reviewer and holds the production keys. Updating the public release means updating the installer and the page of the website that refers to the current release and installer. Other work goes on meanwhile.

## D. The three tests

Process4 has exactly three tests, and no others, ever. A test runs only when there is a fully informed reason to run it.

1. **The job's own module tests.** *Trigger:* a job's pull request changes its module's files or tests. *Runs:* that module's tests, never another module's, including a check that the uses the module declares match what its code imports. *A failure* goes back to the job. A failure already on the tranche branch before the job began is named, and is not the job's to fix.
2. **The interface notice.** *Trigger:* a merged job changed its module's interface. *Runs:* every module that uses it is notified; each one's job updates its module as needed and tests it. *A failure* is fixed by that module's job.
3. **The internal walk.** *Trigger:* the end of a round. *Runs:* several sessions walk the product as built, without deploying it. *A failure* becomes work for a named module in the next round. No failures ends the tranche.

There is no full regression; the internal walk replaces it. There are no layers, so nothing runs between layers.

Two consequences, both decided by Claude. The rule that a job writes only its own module's files has no check behind it; it stands in the job's instructions. And there is no separate install test or upgrade test before a release. One module already has an upgrade test among its own tests, which you kept on 8 Nov, and it stays there as part of test one. This matters because a walk starts from a fresh copy and cannot see an upgrade breaking a user's existing data.

### Interface changes

**What counts as a module's interface.** Your documents say: the services listed in the public part of its requirements file. Measured on today's code, other modules rely on four things: the names a module exports; its public requirements, each under a permanent number; its own tests, which name the requirement they prove; and a few published files that are not code, such as a deployment setting.

**How a change is recognised today.** Process3's rule was coarse: any merged change to a module's source notified every module that declares a use of it. Of 2,342 notifications that were judged, 241 were truly affected and 2,101 (90%) were not. That rule is the only one that missed none. Two narrower rules for who is told were replayed on the same record: only users that import a changed name, or only users that cite a changed requirement. Alone or together they missed more than half of the 241. So today every declared user is told, on any change in the provider.

**What the notice says.** It names the parts that changed: exported names, before and after; public requirements changed, added, retired or newly met; and requirements whose tests changed. If no part can be named, it says so. That happened in 65 of Process3's 178 notices.

**What a notified job does.** If the notified module has a job open, that job gets the notice. If not, the notice is work and the module's job becomes ready. The job looks only at what the named parts mean for its own module, and runs only the tests that relate to them.

**Measured, and still to be proved.** Measured: telling every declared user misses none on Process3's record, which is the judgment of AI workers, not ground truth. Not proved: that recognising an interface change is rigorous and correct, as you require. A fault either runs users' jobs needlessly or leaves a module not updated. Two holes are known. A module that depends on another without declaring it is never told; 38 such pairs exist in tests today. And "only the tests that relate" cannot yet be picked mechanically, so the notified job must judge. Naming the changed parts can safely narrow what a notified job reads and tests. It cannot yet safely narrow who is told.

## E. When something goes wrong

**A job fails its tests.** The job fixes its module and the tests run again. After two failed corrections ARCH replaces the session with a fresh one, whose brief says what was corrected and why. A job that cannot go on records that it is blocked, pushes everything and stops. Other jobs carry on.

**A job's session dies.** ARCH starts a new session that continues from the same branch and pull request. The hourly alarm catches a dead session that no event reported.

**A module is found to use a later module.** That is a design error in those modules, fixed by refactoring them in their own jobs. Today's module list has three such uses. Process3's check compared what a module declared with what it imported, never with the order.

**The process itself has a fault.** Claude fixes it. Whether a session may also merge its own fix, or the fix waits for your click, is the open question in section K. The fix may only correct or remove what is broken. It must never add a new test, gate (a check that must pass before work goes on), review or stop. An example from Process3: two jobs recorded a cost of zero, so a report read wrong. The fix made then was additive: the command that completes a job was made to refuse without a cost figure. Jobs could not read that figure, so every job completion was blocked, and the refusal came out 45 minutes later. A corrective fix writes "unmeasured" where the figure cannot be read, as your documents already ask. It adds nothing and can stop nothing.

A fault that blocks work pauses the product until the process is fixed; the same jobs then continue. A fault that blocks nothing waits for the next tranche.

**The process is completely blocked.** Only then does it wait for you: when no further work is possible until you act. You get one plain message with a numbered list of what is yours to do. An example from Process3: GitHub suspended the account the sessions work under, and only you could write to GitHub. In every other case the stop is recorded as a named blocker and other work goes on.

## F. Permissions

Permission management is Process3's, preserved. It was reached by long trial.

**Auto mode and the checker.** Every session runs in Auto mode, the only mode the platform allows here. The session acts without asking a person, and an automatic permission checker run by the platform judges each risky act and may refuse it.

**Your standing approvals** are a block of text in your own words in the product's CLAUDE.md. It says what sessions may do without asking you and what they may never do. You commit it yourself on GitHub's website. No session writes, edits or relays it, because the checker refuses that. It is the one channel that reaches sessions you did not start: consent merely quoted in a session's starting text was declined 11 times out of 11. A session loads the approvals only when it starts.

**The deny list** is a list in the product's settings.json of commands taken away from every session outright: the ordinary merge commands, so that a merge can happen only through the merge tool; force-pushing; deleting branches; pushing straight to the main branch; and writing files through GitHub's web interface.

**GitHub's own rules** are your settings. Sessions act as a second GitHub account that can push and merge but cannot change settings. No branch can be deleted or force-pushed. The main and tranche branches take changes only by pull request with the tests passing.

**How a session must be started** for both to take effect: with one repository only, because a session that holds more loads no deny list; from the newest commit of the tranche branch, never from the main branch, which still holds your first approvals of 1 Nov; in Auto mode; and with starting instructions that name every act it may take.

**Working rules that exist because of the checker**

- One judged act per command, never chained with another.
- A refused act is never reworded or handed to another session. It is recorded and raised.
- Two kinds of "no" are kept apart: the checker refusing, and the session itself declining because its instructions did not name the act. Only the second may be tried again, once, in a new session whose instructions name it.
- Three refusals in a row stop a session. It is replaced, not resumed.
- Nothing needed for correctness depends on archiving a session or switching off an alarm, which the checker judges case by case.

**Unchanged from Process3:** all of the above, and merging through the merge tool. The tool's three rules that demanded a review come out, which is a removal.

**Wording changes only you can make.** In the approvals: "Process3" appears three times; "BOB" and "layer close" appear in the paragraph on design lanes (your standing design areas, such as user experience); the clause on a reviewer's exemption is dead; and one clause lets a design lane's pull request merge with no tests run, which is yours to keep or drop. In settings.json: the rule that allows pushing names the Process3 tool by its file path. It must match Process4's tool, or no session can push.

**Proven and not proven.** About 700 merges with no review went through the merge tool from 3 to 9 Nov with no recorded refusal. But the counted trial, no refusals in about 450 acts, was of merges that carried a review verdict. It must be measured again (section J).

## G. What is kept from Process3

Of your 288 requirement lines, the audit kept 198 as written. Your decisions of 13–14 Nov settle ten more as kept, so 208 stand. Another 45 keep their purpose, with the way of doing it set by your decisions or still open. By theme:

- **Purpose.** You define; the AI decides the technical and reports it as done.
- **The record.** Git and GitHub hold all state. One writer per file. A session acts only on what it has read in full or measured, and starts from a status read-out, not from notes.
- **Modules and requirements.** One total order. One owner module per file. Requirements in a public and a private part under permanent numbers, stating behaviour.
- **A job's life.** One module, one branch, one draft pull request. Done means merged.
- **Platform and permissions.** Section F. The process stands only on measured platform behaviour.
- **Texts.** One short rulebook per role, at most ten rules, rewritten in place.
- **Sessions.** Kept short. Design lanes, with user experience always there.
- **Maintaining the process.** Its own repository. One fixed version per tranche, changed only by a recorded act.
- **Reports.** A tranche report: time, work done, cost, overhead, and the minutes it took of yours. Claude decided that it also carries the walk result at the end of each round: steps passing out of steps in all, with any steps added or removed since the last round shown beside it, because sessions write the steps and in Process3 the count moved. These are reported, never enforced.
- **Releases.** The process owns what can be proven in git and on GitHub's machines, and nothing on a live site.
- **The eight things you already dropped stay dropped.**

## H. What ends, and why

Fifteen lines end by your decisions; they are listed here. The lines Claude has ended on the evidence are in sections I and K.

- **Layers** (three lines): one layer at a time, a layer closing when its checks pass, the next starting only then. *Why:* you decided there are no layers. On your module list they added no ordering the list does not already give.
- **The full regression and whole-product checks before a release** (three lines, two of which also asked for layer checks). *Why:* the internal walk replaces them. In Process3, 218 of 220 jobs were complete with passing tests while the walk of the deployed product failed 147 of 157 steps and the internal walk of the same build failed 70 of 357.
- **Deliberate-fault sampling of tests on payment and data paths** (two lines: the requirement and its measurement). *Why:* three tests and no others, ever. It was never built.
- **Review by a fresh reviewer** (two lines). *Why:* your decision. In the process's own builds each review pass bred more checks; on the product only 28 of 279 job merges were reviewed.
- **Three checks that ran alongside a module's tests** (three lines): that a job's new tests fail when its change is undone; a second run of the module tests on the merged result before merging; and that built files match their sources. *Why:* on 13 Nov you confirmed these end with "three tests and no others, ever".
- **The line about when a layer closes** also ends. A session's record of 14 Nov gives the reason as your word, that there are no layers any more.
- **A default of 24 live sessions, which ARCH could change** (one line). *Why:* eight job slots, and only you change the number. In Process3 sessions set it themselves several times.

Parts of kept lines end too: the word "layer" wherever it appears; tests run "at layer close" or "nightly"; the "one full test run" after a change across many modules; a development release "in each round"; reviewing as a use for workers; the name "BOB"; and a session writing down "a word you give in chat" as yours. One reading is corrected: a job does not wait until every module it uses is settled.

## I. Earlier requirements Claude has ended or kept on the evidence

Your own decisions end none of these. The first draft put them to you for a yes or no. They are ways of doing something, not purposes, so they were Claude's to decide, and Claude has. Every purpose behind them stays. Thirteen items cover seventeen lines. You can overrule any of them.

1. **The job's written receipt.** Each job posted the commands it ran and their results, and the test run compared them with its own. It caught nothing in 1,187 test runs, and Process3's decision record quotes you on 9 Nov: "get rid of it completely". *Claude decided:* end it. Keep the other half of that line: a job reports flaws it finds in other modules.
2. **The set-up check before every job start.** It read every setting and stopped the start if one was missing. It refused every job start after you applied new settings, and took a "too many requests" reply from Cloudflare for a missing token. *Claude decided:* end the every-job form, as you began to on 9 Nov. Keep the list of settings.
3. **The size cap on a module's requirements file** (two lines: the cap and the measurement to set it). A file over the cap was to be split, never refused. It was built as a refusal and overridden 32 times out of 32, and one split put a loop into the module order. *Claude decided:* end the cap. Keep its purpose: a module fits in one reading.
4. **Recording each job attempt's reading list and cost.** Made compulsory, the cost figure blocked every job completion and came out 45 minutes later. Sessions often could not read a cost at all. *Claude decided:* end it as a duty on jobs. Report cost where it can be read.
5. **The check that fails any commit adding an oversized file or a file in a temporary folder.** Its first run gave 947 findings, and seven later changes repaired false alarms. *Claude decided:* end the check. Keep its purpose: a lean repository.
6. **The job record as a strictly formatted data file** (two lines: the file and its measurement). You asked for it to be tried with an open mind. 105 of 508 merges changed nothing but these records. The measurement you asked for was never taken, so this rests on cost. *Claude decided:* end it.
7. **Every rule must cite a measured failure or your decision.** Every addition in Process3 carried a citation, and checks were added in 41% of merges both before and after you told sessions to stop. *Claude decided:* end the citation rule. The rule on process fixes (section E) now does its work.
8. **A line-by-line test of instruction files in place of a size limit** (two lines). It was only advice. The one hard size limit, on each role's starting text, held all week, while the guide with no limit grew from 8 KB to 134 KB. *Claude decided:* end it.
9. **"Nothing is ever refused for size", for the process's own instruction texts** (two lines). Same evidence as item 8; for product files the evidence runs the other way (item 3). *Claude decided:* end it for the process's own texts only.
10. **The reading audit.** It was to sample whether a session had read a document to its end. It was never built. *Claude decided:* end it. The rule itself, act only on what you have read in full, stays.
11. **The start-up check on your approvals.** A session compares the approvals it loaded with the newest, and on a difference does nothing. Each of your five edits stopped every long-lived session, and after the last, on 9 Nov, the product never restarted. Your decision to preserve permission management covers it. *Claude decided:* keep it, because approvals load only at a session's start, and first prove that your edit can be taken up without you (section J).
12. **Deploy tokens held as settings of the Claude cloud environment,** confirmed by the set-up check. The check once stopped the process on the Cloudflare reply in item 2, but this is the only route measured to work. *Claude decided:* keep the route. Let the check go with item 2.
13. **Running module tests in two parts, so that product code under test holds no access token.** It was added on a reviewer's "what if", and the failure it guards against was never seen. It costs little. *Claude decided:* keep it.

## J. What is not yet proven

By your own rule, nothing here is in force until it has run on a real tranche. Each item is a claim, then the smallest trial that would prove or break it.

1. **A merge with no review passes the permission checker.** Proven only for merges that carried a review verdict, plus two counted without and about 700 in use. *Trial:* twenty or more merges by ARCH, started the real way at its real level, each as its own command. Count the checker's refusals and the session's own declines apart.
2. **ROOT, started by you with a plain prompt, can start ARCH and the coordinator.** In Process3 a tool printed ROOT's long prompt, and a ROOT you started twice came up on an old copy of the branch. *Trial:* one run through. ROOT starts both; ARCH pushes, opens a pull request and starts a job; the job pushes and opens its own.
3. **Sessions started this way load your approvals and the deny list.** *Trial:* one probe each. A denied command is absent; an approved act the instructions did not name is carried out.
4. **Interface changes are recognised with no misses.** *Trial:* replay Process3's 178 recorded changes, each read at its own commit, and require that all 241 real effects are reached. Separately, list every dependence that is not declared, since no notice reaches it.
5. **Naming the changed parts lets a notified job read and test less without missing an effect.** *Trial:* on the same replay, check that the named parts lead to each of the 241.
6. **The fixed rule fills a slot the moment a job merges, and gives the same answer every time.** With no event, Process3 once noticed a finished job after 194 minutes. *Trial:* two slots, three modules with work. Time the third job's start from the first merge. Run the rule twice on the same record.
7. **The hourly alarm wakes ROOT itself.** Measured in Process3, eight times out of eight. Later platform notes suggest an alarm may start a new session, and such a session could not start others. *Trial:* one firing.
8. **A process fix cannot add a test, gate, review or stop.** Today nothing physically prevents it. Sessions can change the process's repository and merge their own changes; GitHub's rules protect settings and branches, not this. It is a rule in text only, and in Process3 text alone did not hold. There is also no measured evidence that the platform's permission checker enforces a "never" written in your approvals: in the counted trials your approvals changed what sessions chose to do, not what the checker refused. *Trial:* give the fixing session ten Process3 faults whose recorded fixes were additive, and read what it produces. This can break the claim. It cannot prove it. Section K puts the one physical stop that was found to you.
9. **The process is the same at round N as at round 1.** What holds it is one fixed version per tranche, which Process3 moved 116 times in nine days. *Trial:* at each round's end in the first tranche, compare the process's files with round 1. Any difference other than a recorded corrective fix breaks the claim.
10. **An edit to your approvals is taken up with no further act of yours.** In Process3 each edit needed you to start a new ROOT. *Trial:* one edit during a trial run.
11. **The internal walk finds what a full regression would.** In Process3 no round ended with both walks clean. Once, on 8 Nov, the internal walk had every step passing while the external walk of the same build passed 20 of 175; the internal walk was then changed to run the same page checks. *Trial:* put back the one known break between two modules, of 4 Nov, which module tests missed, and see whether the walk finds it.
12. **A change across many modules, an account switch, and a stop on your word each work.** The first never had a procedure. The switch failed on 5 Nov and was cancelled on 7 Nov. After your stop of 9 Nov the process ran on for over two hours. *Trial:* one rehearsal of each.

## K. Open points

### The one question that is yours

**Do sessions keep the power to change the process itself?**

*What it is.* In Process3, sessions made 270 of the 296 changes merged into the process's own repository, and 121 of those added a check. The process's rule against adding checks is text. The one physical stop that was found, and that earlier reviewers could not break, is a wall: the sessions' GitHub account loses the ability to write to the process's repository. A session can still prepare a fix. It reaches the process only when you press the merge button for it on GitHub's website.

*Why it matters to you.* With the wall, every process fix costs you one click, and a process fault that blocks work waits for you. Your requirements exclude such an act today, so only you can allow it. Without the wall, you spend no time, and the growth that ended Process3 is held back by text alone.

*What the wall does not stop, under either answer.* A session being over-cautious in its own work. A session writing extra demands into another session's starting instructions. A helper briefed as a reviewer. Tests that serve the process placed among a module's own tests, or extra steps added to the walk. These remain rules in text.

*What is proven.* That an account with no write access cannot merge is GitHub's own rule; it was never run in Process3. Two further parts are untested: keeping the version of the process that a product uses where only you can move it, and running the module tests from a place a job's pull request cannot alter. How often a small Process4 would need a blocking fix is unknown. Process3's rate, 296 changes in nine days, was mostly the growth itself.

*Claude's recommendation.* Take the wall for the first tranche. Each fix comes to you with one plain sentence saying what it corrects or removes, and the size of the process before and after. Your click cannot judge the code and is not claimed to. What it does is make silent growth impossible and every change visible to you. After the first tranche the number of clicks is known, and you can open the wall if it was too many.

### Your seven earlier open points, now closed

The first draft put these to you. Six were technical and Claude decided them. Two of them touch powers of yours, which stay.

1. **The check that a job wrote only its own module's files.** *Claude decided:* it ends; the rule stays in the job's instructions. Of 2,540 job commits in Process3, none changed another module's source or tests, and the check's three known firings were all false alarms. The record cannot say whether the check or the instructions kept jobs in their own module. No GitHub setting can hold the rule on a public repository.
2. **The install test and the upgrade test before a release.** *Claude decided:* both end as separate tests (section D). Neither was ever built as a release test.
3. **Set-up acts on the Claude side.** Not a decision. The platform requires them of you, and they are now on your list (section B).
4. **Approving one particular merge.** It stays, as your documents say. Nothing is built for it: you tell the coordinator. It was never used in Process3.
5. **The judge of the process.** *Claude decided:* the two numbers, the share of false "done" claims and the cost of each surviving pull request, are retired. Neither was ever produced in Process3, neither runs the product, and the first was defined by checks you have ended. The tranche report carries the walk result instead (section G).
6. **The external walk.** *Claude decided:* a fixed rule runs it after every tranche; you can skip it by word; its findings are the first work of the next tranche (section C).
7. **Eight slots.** *Claude decided:* for each product. A session holds one repository, so nothing can count jobs across two products without a new mechanism. Two products never ran at once in Process3. When you run two, you tell each coordinator its number.
8. **Reordering.** Your word still adds and reorders work, as your documents say. Nothing is built for it: you tell the coordinator (section C).

**Notes in your ledger.** On 14 Nov six notes in the ledger's store changed; each now reads as the earlier session-written text with the sentence that attributed it to you removed. The store does not record who made a change. One of the six, on the line about when a layer closes, now holds the same text as the note on session depth, which looks like a paste slip. This document does not rely on it.

### Technical points, decided by Claude

Points 2 and 3 depend on your answer about the wall and will be restated when you have given it.

1. **Where working state is kept.** Process3's separate branch for it made 70% of all commits. *Decided:* each job's pull request, which your documents allow.
2. **Which session makes a process fix, and which repository the coordinator holds.** *Decided:* a short session started for that one fix and ended when the fix is merged, by itself or by you according to your answer.
3. **How a process fix reaches a tranche in progress.** *Decided:* your kept rule: only a fix for a blocking fault, once.
4. **How ARCH, the coordinator and ROOT itself are replaced when a long session fills up or falls silent.** *Decided:* ROOT starts a successor for ARCH or the coordinator, which begins from the status read-out. For ROOT, keep Process3's standby session, woken once a day, which takes over, so that replacing ROOT is not an act of yours.
5. **How the coordinator hands on your words.** *Decided:* quoted exactly, with the date.
6. **Where the slot number is kept, and how a stop on your word reaches every session.** *Decided:* one place in the record that the status read-out shows.
7. **Who judges a change across many modules trivial enough to skip tests.** *Decided:* ARCH, which reports it.
8. **How the three order-breaking uses are repaired.** *Decided:* correct the module list where the code already runs one way, and turn one registration between two modules around. Nothing a user sees changes.
9. **The exact definition of an interface and the form of a notice.** *Decided:* the four measured parts in section D.
10. **What carries your standards for scale, speed and cost** now that layers are gone. *Decided:* planned measurements at scale, which your documents keep.
11. **Whether a separate list for a "completion round" remains.** *Decided:* none. Rounds simply repeat.
12. **Model and effort for each session.** *Decided:* ROOT passes your suggestion to every session it starts.
13. **How many sessions walk, and how the walk is shared out.** *Decided:* by journey.
14. **Which process files a product receives.** *Decided:* the short fixed set your documents list.

---
