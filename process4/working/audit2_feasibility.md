# Second audit of the Process4 definition, fifth draft: feasibility

14 Nov 2026. Read-only. Nothing was committed, pushed, fetched or started. Audited: `/home/user/handoff/process4_definition_v5.md`.

**Verdict.** As written, the fifth draft would still not run. It has answers, in a sentence each, to most of what the first round found, and it is honest that none of them has run. But walked through as each session would live it, it stops in four places before the first job merges, and in at least five more before a tranche could end. Two of the stops are new and rest on things I measured today:

- The answer chosen for ROOT's start (make the tranche branch the default branch) is aimed at a fault that did not happen. The record's own commit shows the ROOT that Bob started came up on an old copy of the tranche branch, not on the main branch. The default-branch setting does not touch that.
- The folder Bob named for the walks' documents says of itself that the design documents are not in it. What it holds is machine data, and 135 of the 679 screen acts in it are marked as not built yet.

The rest is a design that names actors for most steps and leaves five steps with none: writing new work into a module, moving a product to a changed process, deploying, preparing a release, and archiving finished sessions.

**Evidence labels, kept apart.**

- **Measured:** in Process3's record, with the passage; or "counted today", taken by me from the read-only clones (`civicsmith-copy` at `origin/tranche` e7ec72e; `process3` at `origin/tranche` 38b0f3f and the checked-out branch `process4`; `process3-probes`).
- **Platform text:** a platform document, or the tool definitions this audit session was given today. Not tried on Bob's repositories.
- **Reasoning:** mine only.

"The register" is `/home/user/handoff/process4_counterarguments.md` (87 entries). "First round" is `/home/user/work/attack_feasibility.md`.

---

## Findings, worst first

### 1. The fix for ROOT's start is aimed at the wrong fault

1. **The fault.** The draft says a ROOT that Bob started came up on the main branch, and answers that by making the tranche branch the default. The record shows something else: Bob's ROOT came up on an hour-old copy of the tranche branch itself, missing the approvals he had committed sixteen minutes earlier. Changing the default branch does not cure an old copy.
2. **Sentences.** Section I: "The fault to avoid, measured in Process3: a ROOT you started plainly came up on the main branch, which held old approvals, both times it was tried. *Claude decided:* the branch a tranche is built on keeps one fixed name, and you make it the default branch of the product's repository ... Then your commits on GitHub's website and a plain start both land on it." Section C: "Start the first session, ROOT | ... after each edit to your approvals". Section I: "a long-lived session compares the approvals it loaded with the newest, and on a difference does nothing."
3. **Rests on.**
   - Measured (`roles_root_coordinator.md` 3.1): "The owner-started ROOT's container stood on an old commit both times: 'first start check failed (container on 18935dc7, older than the tip) ... the Bob-app ROOT clones the default ref, not the tip' (LOG L667); again on 8 Nov (L1190)." Step 3 of the same passage: Bob "opens a new session on the product repository, picks branch `tranche`, pastes the prompt." So neither start was plain, and he had chosen the tranche branch.
   - Counted today in `civicsmith-copy`: commit 18935dc7 is "Merge job PR 458", made on 5 Nov at 17:32:56 UTC. It is in the history of the tranche branch and is not in the history of main (main still stands at the 1 Nov commit 0dea5a6). Bob's approvals edit (pull request 550) merged into the tranche at 18:25:29 UTC. ROOT was started at 18:41. So ROOT stood seven merges behind the tip and behind his approvals. 18935dc7 was the tip at 17:45, when Bob had started the ROOT before it. Limit of this check: only the 5 Nov commit id is in what I read; for 8 Nov the record says "again" and gives no id.
   - Measured (`permissions_inventory.md` 1c): "measured 3 Nov, a branch name landed on a stale local copy of it in the saved container"; a start by commit id landed fresh, 1 of 1.
   - Reasoning: Bob's approvals commit is by construction the newest commit, so it is exactly what an old copy lacks; and the draft makes "start ROOT" the act that follows every approvals edit. With the comparison kept, such a ROOT "does nothing", and no other session exists to put it right. That is how Process3 ended (measured: five edits, five full stops, no restart after the last).
4. **How bad.** Stops the first hour, and again at every approvals edit.
5. **Status.** RAISED BEFORE AND NOW ANSWERED (register 26, first-round finding 2), by a decision of Claude's. The answer does not meet it: it rests on a misreading of the measured fault. The trial the draft lists first would show this, so the trial can settle it.
6. **Best answer.** A correction, a removal and a structural choice. Correct the sentence about the main branch. Let ROOT act on Bob's own typed prompt whatever copy it stands on (2 Nov: 0 of 21 refusals when his consent was typed in the acting session; stated in his Foundations, with no evidence file), and drop the comparison for ROOT alone. ROOT then finds the newest commit and starts ARCH and the coordinator by commit id, the one way measured to land fresh. Whether approvals read by a session after it started count as loaded is unmeasured; that is a one-off trial. The default-branch setting may still be worth having for Bob's website commits, but it is not the cure.
7. **Whose.** Claude's to decide; needs a trial.

### 2. Nothing says in what order the two repositories are converted, or by whom, and Bob's first commit cannot merge until that is built

1. **The fault.** Before any Process4 session can act, the product's repository must stop telling sessions to "act on nothing", must allow the new tool to push, and must have a test run that answers on a change touching no module. Each of those changes has to get past the Process3 machinery it replaces, and the draft names neither the order nor the session that does it. Bob's own approvals commit is one of the changes that cannot merge until it is done.
2. **Sentences.** Section M: "The product's repository is not converted ... So a ROOT you start with a plain prompt is told to do nothing. The test run must also report on pull requests that change no module, such as your approvals commit, or that commit cannot merge." "Builder: Claude, before anything is in force." Section I: "In settings.json the rule that allows pushing names the Process3 tool by its file path and must match Process4's tool, or no session can push". Section I: "The tranche branch takes a change only by pull request with its tests passing."
3. **Rests on.**
   - Counted today, product `CLAUDE.md` at the tranche tip: "Act only as it says; with none, act on nothing." Product `.claude/settings.json`: deny `Bash(git push *)`, `Bash(gh *)`; allow only `Bash(node .process/tool/p3.mjs github push *)`; two retired hooks still present.
   - Measured (first-round finding 1; `process-gate.yml`): the product's required test run is Process3's, fetched at the product's recorded Process3 version, and a pull request that swaps that version fails it.
   - Measured (`permissions_inventory.md` 1f): the rule on the tranche requires the check named `gate`, with an empty bypass list. A change to the check's name is a change to Bob's rule.
   - Measured (product history): Bob's own approvals commit of 9 Nov was pull request 1115, merged by him after the check.
   - Reasoning: three files are involved that only Bob may commit (his approvals, the deny list) or that the old check guards (the process version). Change the push rule first and no session can push the rest. Change the version first and the old check fails it. The same is true of `process3-probes`, whose tranche branch is a Process3 copy too (finding 17).
4. **How bad.** Stops the first hour, and stops the trial before it.
5. **Status.** RAISED BEFORE AND STILL OPEN: register 3 ("NO ANSWER FOUND") and the unanswered part of register 25 ("converting the product must either pass the Process3 check it is removing, or needs you to change a GitHub rule first"). The fifth draft restates the problem in M and does not answer it.
6. **Best answer.** A written order, with settings. One page listing each step, who does it and which rule is in force at that step: Bob lifts the required check on the trial or tranche branch (a setting), the conversion goes in as one change that Bob merges, Bob commits his two files, Bob puts the required check back under its new name. Say plainly that this is a sitting of Bob's of more than one act, in each repository.
7. **Whose.** Needs the build; the count of Bob's acts is his to accept.

### 3. A session holds one repository, and the draft does not say how the process's tool and role texts reach it

1. **The fault.** Every session must hold the product's repository alone, yet every session must use the process's tool and read its role text, which live in the process's repository. The draft never says how they arrive. A ROOT started by a plain prompt has the further problem that nothing tells it what a ROOT does.
2. **Sentences.** Section I: "with one repository only, because a session that holds more loads no deny list". Section I: "So the process's tool is each session's only door to GitHub." Section J: "The process has its own repository and one fixed version for each tranche, moved only with your prior approval." Section C: "You start it with a plain prompt on the product's repository." Section I: "ROOT, started by your plain prompt, does not meet the last condition. Whether that works is unproven." Section J: "The product's CLAUDE.md stays under thirty lines."
3. **Rests on.**
   - Measured (`permissions_inventory.md` 1c): Process3 carried the process as a pinned copy inside the product; "A clone pinned as a git submodule arrives **empty**", so every session's first command fetched it.
   - Measured (same, 1e rows 19 and 23): an act a session's starting text did not name was declined by the session itself 6 of 6; merges asked on consent quoted in the starting text were declined 11 of 11. The only measured working ROOTs had a 4 KB role prompt pasted in.
   - Measured (`enforcement_levers.md`): the recorded version sits in a file of the product that any session can change; sessions moved it 116 times in nine days.
   - Searched today: the fifth draft does not contain the words "pin", "pinned" or "submodule".
   - Reasoning: the route by which the tool arrives decides three other things the draft treats as settled: what "one fixed version for each tranche" is physically; who can move it (finding 9); and what a plainly started ROOT reads to learn its acts.
4. **How bad.** Stops the first hour (no tool, no role), and decides whether the rule "moved only with your prior approval" is held by anything.
5. **Status.** NEW as a whole. Part was in register 25 (no tool) and is answered there only by "Claude builds these".
6. **Best answer.** A structural choice, stated in the definition: the product carries one line naming the process version; the tool and texts are fetched from the public process repository at that version as each session's first act; the product's CLAUDE.md carries one short passage, below Bob's approvals, saying what a session does when Bob's prompt says he is starting development. Mark it unproven and put it first in the trial.
7. **Whose.** Claude's to decide; needs the build and the trial.

### 4. Step 8 of every job cannot be carried out until the notification is settled, and neither can the tool

1. **The fault.** When a job merges, someone must decide whether its module's interface changed and whom to tell. The draft says, rightly, that this is not settled. But the same draft lists "send notifications" among the six things the tool does and puts no notification in any trial. So the tool cannot be finished, and the first real job cannot complete its last step.
2. **Sentences.** Section D step 8: "If the job changed its module's interface, every user of that module is notified". Section F: "Until you decide, this definition says no more on these three things than your recorded lines do. The form of the notification is written after the study." Section M: "a new small tool that does only this: push; open a pull request and mark it ready; merge; start the next job; send notifications; and write the shared state."
3. **Rests on.** Measured (section F's own figures): 71% of job merges change one of the four parts; 2,101 of 2,342 judged notifications needed nothing; nothing exists that can pick "the tests that relate". Reasoning: record line 3 does not say who judges that an interface changed (the job, ARCH or the tool), and a session cannot act on a rule with no actor.
4. **How bad.** Stops the first job's completion on the real product. Does not stop the trial on made-up modules if notifications are left out of it, which then leaves step 8 untried.
5. **Status.** RAISED BEFORE AND STILL OPEN (register 7, first-round finding 5). Bob's words of 14 Nov set aside both proposals and started a study; the draft says so honestly.
6. **Best answer.** An honest statement in sections M and O: the process cannot start on the real product until the study is decided, and the trial as listed does not exercise the notification. I do not re-derive the study.
7. **Whose.** Bob's to decide (it is his definition of a module's interface and of who is told); the study brings the proposal.

### 5. The named folder does not hold the two documents, and nothing says how much of them a tranche's walk must cover

1. **The fault.** The draft says the screens document and the journeys are in the folder Bob named, "checked by Claude". The folder's own first page says the design documents are kept elsewhere, as pages on claude.ai, and that the folder holds only what the product's build reads. What is there describes 679 screen acts, 135 of them marked as not built yet. A walk against all of it cannot come clean until the whole product is built; a walk against part of it needs someone to say which part, and no one is named.
2. **Sentences.** Section D: "So the UX Screens document and the UX journeys are kept in that folder of the product's repository. Checked by Claude: the folder exists on the branch the product is built on, with a screens sub-folder and files describing journeys. Which exact files each walk reads is Claude's to settle in the build." Section D: "a walk is without flaws when it lists no flaw and leaves out no step that the walk before it made." Section D step 4: "The tranche ends only when an external walk completes without flaws." Measured against Bob's words of 14 Nov: "An internal walk uses the UX Screens document to confirm that the workflow matches the definition" and "screens and journeys are kept in docs/development/ux-substrate/ in the product repo".
3. **Rests on.**
   - Counted today, `docs/development/ux-substrate/README.md` at the tranche tip: "This folder holds only what the product's build and checks read (Bob, 5 Nov 2026). The design documents are claude.ai artifacts, kept by the ux lane ... Their earlier repository copies ... are in git history, before the commit that removed them." Its table lists "Journeys" and "Screens" as claude.ai links.
   - Counted today, Bob's own approvals in the product's CLAUDE.md: "Their design documents are claude.ai artifacts, not repository files."
   - Counted today: the folder has 90 files. The nearest things to the two documents are `screens/registry.json` (91 screens, 679 acts: 462 declared, 82 by function, 135 "owed"), `screens/mock-journeys.js` (32 journey entries with steps and with steps marked for the AI path only), and `layouts.html` (a 1.5 MB built mock). They are data for programs, not a document a session reads.
   - Counted today: the module list gives the folder to a module, `ux-design`, and also lists `docs/` as belonging to no module. Bob's approvals give the same folder to the design lanes, whose changes merge with no test.
   - Reasoning: three things follow that the draft does not settle. Which is "the UX Screens document": the page on claude.ai, which a cloud session may or may not be able to open and which moved accounts on 6 Nov, or the registry file. Who changes it when a walk shows the document is wrong: a lane, or the job of the module that owns the folder. And what a tranche's walk covers when the document describes more than the tranche builds.
4. **How bad.** Stops a tranche from ending; and misleads Bob, because "checked by Claude" reads as if the documents were found.
5. **Status.** NEW. It touches register 1 (a tranche may never end; no answer found) and register 39.
6. **Best answer.** A correction and two questions. Correct "checked by Claude" to say what is and is not in the folder. Two of Bob's own statements differ here (his words of 5 Nov as the folder and his approvals carry them, and his fourth message of 14 Nov); I report the difference and do not choose. Put to him: which is the document, and what part of it a tranche's walk must cover.
7. **Whose.** Bob's to decide: where his design documents live and what a tranche contains are product definition, not technique.

### 6. A walk run by several sessions sharing journeys was never run, needs product work nobody is named to order, and may rest on a wrong limit

1. **The fault.** The product's walker is one program that walks its journeys in order, each building on what the one before left. Sharing it among sessions by journey needs changes to that program, which is itself a module of the product. In Process3 the walks of a deployed site ran on GitHub's machines, never from a session. And the reason given for sharing, that a session can run one thing for only about thirty minutes, does not match the tool text I was given today.
2. **Sentences.** Section D: "So sessions run both. *Claude decided* the rest: a walk happens when no job is open, so walking sessions use the job slots, and the walk is shared out among them by journey ... Unproven: a session can run one thing for about 30 minutes, and Process3's two late deploy-and-walk runs took 60 and 64 minutes (both measured), so a walk must be shared among sessions. That never ran." Section C: ARCH "has the product deployed to the development site". Section E.2: the internal walk "is made at the end of a round's jobs, or at any time on your word to the coordinator".
3. **Rests on.**
   - Counted today: the walker is the module `journey-check`, 218th of 220 in the order. Its entry point (`run.mjs`) has two arms. The local arm "walks journey 28 from the installer through the hand-over into the copy and on, then journey 3, then sweeps the registry's screens"; later journeys are passed the project and question made by earlier ones. I found no option to run one journey alone.
   - Measured (`DECISIONS.md` PD-16, 8 Nov): "Product walker changes needed for parallel walks go to BOB as a job". Measured (process3 README, `walk`): Process3 ran more walkers at once inside one run, by a count handed to the walker, not by more sessions.
   - Measured (register 35's answer; `k_evidence.md` line 279): "the two runs took 60 and 64 minutes ... so they ran on GitHub's machines." The walker starts its browser to go round any proxy; a cloud session reaches the internet through one (this session's own environment notes say so). Whether a session's browser can reach the development site at all is unmeasured.
   - Platform text (the Bash tool definition given to this session today): a background command's limit is "default 1800000, max 7200000" milliseconds, that is, thirty minutes unless asked, up to two hours. Not tried by me. Bob's kept ledger line PLT-4 says: "No step runs longer than the in-session background limit; anything that can is a CI workflow." His hint of 14 Nov says "sessions". The draft follows the hint and does not show him the kept line.
   - Reasoning: "has the product deployed" names no session. A walk "at any time on your word" cannot also be a walk that "happens when no job is open". The draft's own notes say "by journey" may need to be "by screen" for the internal walk.
4. **How bad.** Stops the end of the first round: there is no way to run either walk as described.
5. **Status.** RAISED BEFORE AND STILL OPEN (register 35, register 66, first-round finding 14). Marked unproven and put in the trial; but the trial uses made-up modules, which have no walker, no screens and nothing to deploy (finding 17). The points on the limit, on the walker being one program, and on reach from a session are NEW.
6. **Best answer.** A one-off trial, then probably a removal. On the real product, one session runs the existing walker once in the background with the two-hour limit. If it finishes, remove "shared among sessions by journey" and keep one walking session using the walker's own count of walkers, which is the form Process3 built. Name the session that deploys. Say which gives way when Bob asks for a walk while jobs are open.
7. **Whose.** Needs a trial; then Claude's to decide. The kept ledger line against the hint is Bob's.

### 7. New work has no door into a module, and a job that needs something from another module has only the door marked "flaw"

1. **The fault.** A module's requirements file is part of the module, and only the module's own job or a mechanical edit may change a module. So nobody is allowed to write a new requirement into a module, or mark one "not yet met". The same gap meets a job in its first hour: if it needs a service an earlier module does not offer, or needs to use a module it has not declared, the draft gives it only the route for reporting a flaw.
2. **Sentences.** Section A: "Module: one part of the product, with its own code files, tests and requirements file." Section D step 1: "The module has work. A requirement in its file is marked 'not yet met', or a walk flaw or a notification has been placed against it." Section C: "A job for module A isn't allowed to change module B. The only other way of editing a module is when a mechanical edit ... makes the change." Section D step 5: "A flaw it finds in another module goes to ARCH, which passes it to that module's job." Section E.1: module tests "include a check that the module's declared uses match its imports". Section D: "A job stopped by another module's flaw reports the flaw to ARCH, records that it is blocked, pushes and stops."
3. **Rests on.**
   - Measured (`foundations.md`, "Where the work is"): in Process3 the build state, "each module's requirements with their not-yet-met marks", was "written only through the process", and the architecture session wrote requirements (counted today: ten of its branches named `bob/T53-req-...` on the product).
   - Counted today: declared uses live in the module list (`build/modules.json`, 3,120 uses), which belongs to no module and which the draft gives to ARCH. A job that adds one import of an undeclared earlier module fails its own module tests and cannot fix that itself.
   - Reasoning: a missing service is not a flaw in the provider. For it to become the provider's work, a requirement must be written into the provider's file. The draft names no one. For a new use, ARCH must change the list in a change of its own (which needs the required test run to answer on a change touching no module, finding 2), and the job's tests must then run again; none of that is a step in section D. Step 1's list of what counts as work also leaves out the flaw a job reports.
4. **How bad.** Stops a tranche: the first requirement that crosses a module boundary has no route. Costs time on every new use between modules.
5. **Status.** NEW. (Register 54 restored "prepares what the next round or tranche needs", which names the duty and not the door.)
6. **Best answer.** Wording, with one reading put to Bob. Say that ARCH writes requirements and their marks, and that this is not "editing a module" in the sense of his rule; or say that it is and that requirements reach a module only through its own job, with ARCH's text handed to the job. Add two steps to the job's life: asking ARCH for a use to be declared, and asking for a service from a provider.
7. **Whose.** Bob's to decide whether his rule covers the requirements file (it is his rule and his word "module"); the steps are Claude's.

### 8. The mechanical edit has one allowed moment, and the jobs that need it can stop that moment from coming

1. **The fault.** A mechanical edit may be made only after a round's last merge. A job that cannot finish without such an edit stops as blocked, with its pull request still open. A round's jobs are over only when every module with work is finished. So the round never reaches the moment the edit waits for. The same holds on day one: the repair of the module list must come before the first jobs, and the stated moment is after them.
2. **Sentences.** Section D: "*Claude decided* the moment: when no job is open, between a round's last merge and its internal walk." Section D round step 2: "When every module that had work is finished". Section D: "A job stopped by another module's flaw ... records that it is blocked, pushes and stops. Its slot is freed." Section C: "Modules that hold requirements and no code ... ARCH decides which module's code meets each, and the move is made as a mechanical edit." Section A: "seven modules with work hold no code".
3. **Rests on.**
   - Counted today: 11 of the 220 modules have no paths at all in the list. First-round count: seven modules with work own only a requirements file; 58 unmet marks sit in them.
   - Measured (first-round finding 11; `merge.mjs`): Process3's rule was "a pass runs while no job holds its modules", a narrower condition than "no job is open".
   - Measured (`permissions_inventory.md` row 35): the one attempt to let a change through without its required run was refused, "[CI Bypass]". Measured (`process-gate.yml` comment): a change touching every module "would run every suite past the gate's cap"; two suites take 40 to 42 minutes.
   - Reasoning: folding 29 modules back moves requirement numbers that tests cite, across perhaps sixty modules; that is one very large change whose test run is either every touched module's or none, and the draft leaves which to the trial. Who judges that an edit is trivial enough for none is not said.
4. **How bad.** Stops a round as worded; stops the first round for the seven modules.
5. **Status.** RAISED BEFORE (register 53, 68, 32; first-round findings 6 and 11). The moment and the single merge are NOW ANSWERED by Claude's decision and Bob's question; the answer does not meet the blocked-job case or the day-one case, which are NEW.
6. **Best answer.** A change of wording to the condition: a mechanical edit is made when no job has an open pull request on any module it touches, at any time, and before the first job of a tranche where the list needs it. Keep the test-run question as an honest unproven item.
7. **Whose.** Claude's to decide; the test-run part needs the trial.

### 9. PROCESS in motion: several links exist only as a sentence, and one link has no actor at all

1. **The fault.** Follow one process fault met at night. The job tells ARCH. ARCH asks ROOT. ROOT starts PROCESS on the process's repository. Then the draft runs out. It does not say which branch PROCESS starts on or what approvals it loads there; who tells Bob that PROCESS is waiting for him; who merges the change PROCESS writes; who replaces PROCESS when it fills up with a week of conversation; or, above all, who moves the product to the changed process once Bob approves. PROCESS cannot: it holds the other repository. No product session may: the draft forbids it.
2. **Sentences.** Section H: "So a job reports a process fault to ARCH. ARCH asks ROOT to start PROCESS if it is not running. You talk to PROCESS, and the coordinator can talk to it too." "Which repository it holds ... the process's own repository." "No session building a product may change the process, add a test, check, gate or review to it, or adopt a changed process." "None of this has run." Section C table: "Commit your standing approvals ... in the product's repository and in the process's (section I)". Section G: "For ARCH or the coordinator, ROOT starts a successor". Bob's words: "The transition ... will be done only with my prior approval, with PROCESS proposing the best and least disruptive means of making the update."
3. **Rests on.**
   - Measured, and in the draft's favour (`roles_root_coordinator.md` 3.2): from 5 Nov 23:54 UTC a ROOT holding the product's repository started each new coordinator on the process's repository. So a session starting a session on another repository did run in Process3, for each coordinator from then on (the record does not give the count), under Process3's approvals and with a role prompt that named the act. The draft's notes say this was not established; it is.
   - Measured, against (`permissions_inventory.md` row 34): pushes from sessions started across repositories into the probes repository were refused 2 of 2 on 8 Nov, after approvals were split by repository.
   - Counted today, in the working copy of the process repository: the branch `process4` is cut from main. It carries the approvals of 1 and 2 Nov, which speak of "Process3", and it has no `.claude/settings.json` at all, so no deny list. The repository's default branch is main. Section I, which the acts table cites, says nothing about the process's repository.
   - Platform text (`create_session`, today): a new session inherits the caller's cloud environment. So PROCESS would hold the product's deploy tokens.
   - Measured (section H): one question carried as Bob's waited about nine hours. Measured (`roles` 1.1): coordinators, the nearest thing to PROCESS, lasted four to eight hours each.
   - Reasoning: if the fault is in the tool's push or merge, every slot is idle until Bob wakes, reads, chooses, approves the change and then approves the move. That is his rule and I do not attack it. What is missing is everything a session would need in order to act on each link.
4. **How bad.** Stops a tranche at the first process fault that blocks work, for as long as Bob is away plus however long the missing links take to invent.
5. **Status.** RAISED BEFORE (register 33, 44; first-round finding 10). NOW ANSWERED in part by Bob's hints of 14 Nov (who starts it, the channel, the repository). Those answers are his and are enough to name the links. The missing actor for the move, the branch and approvals, the telling of Bob, the merge and the replacement of PROCESS are NEW.
6. **Best answer.** Wording and settings, no new step. Name: the branch PROCESS starts on and that Bob's approvals and a deny list are committed there; the session that sends Bob the one message; that PROCESS merges its own change with the tool once the tool's tests pass; that pending proposals live in the process repository so that a replaced PROCESS can read them; and one actor for the move, for example a short session started on the product's repository for that single change, after his approval is recorded. State that the move restarts every product session, if it does.
7. **Whose.** Claude's to decide, except who may carry out the move, which reads Bob's sentence "No session building a product ..." and is his to confirm.

### 10. At the size of the real product, the first walk comes after about 177 jobs, and nothing suggests the tranche can then end

1. **The fault.** On the real list a first round is about 177 jobs before any walk is made. In Process3, with more sessions, 508 merges took six and a half days. The first internal walk then has to find nothing at all before the product is deployed, and the deployed walk has to find nothing at all before the tranche ends. Neither ever happened.
2. **Sentences.** Section D: "Nothing bounds the number of rounds ... Only your word ends a tranche that will not come clean." Section F: "the 65 modules with real work led to about 177 jobs ... (estimated)". Section O: "Whether a tranche can end."
3. **Rests on.** Measured (`product_side.md`): all 12 development deployments of 4 to 8 Nov ended "ok: false"; after 80 hours without a deployment the first walk found 1,691 failures; the last walk failed 147 of 157 live steps. Measured (draft, section D): on 8 Nov the internal walk had all 238 steps marked ok with 63 failures listed. Measured (register 1): 113 of 1,187 test runs failed on 3 to 5 Nov and 74% of those passed again with no change. Reasoning: the order (deploy only after a clean internal walk) follows Bob's words of 8 Nov, so it is not Claude's to remove; its cost is that what only a deployed walk can see is found last.
4. **How bad.** Stops a tranche, without limit.
5. **Status.** RAISED BEFORE AND STILL OPEN (register 1, "NO ANSWER FOUND"). The draft states it honestly.
6. **Best answer.** No answer found that makes the tranche end. Two honest additions: say how long the first round is estimated to take before its first walk; and say that the size of a tranche is Bob's to set, since a smaller tranche is the only lever in his hands that is not a new check.
7. **Whose.** Bob's to decide (what a tranche contains); only the first real tranche can show.

### 11. Every edit to Bob's approvals replaces every session, and the draft is of two minds about when the comparison is made

1. **The fault.** After Bob edits his approvals, every long-lived session does nothing. A new ROOT must then replace ARCH, the coordinator, the watcher, PROCESS and up to eight jobs: thirteen new sessions, thirteen dead ones left on the account. One passage calls the comparison a start-up act, another has long-lived sessions making it later.
2. **Sentences.** Section I: "a long-lived session compares the approvals it loaded with the newest, and on a difference does nothing ... So an edit to your approvals is one act together with restarting ROOT." Section J: "Named: the three tests, and the start-up comparison of your approvals".
3. **Rests on.** Measured (section I): five edits, five full stops, no restart after the last. Measured (`permissions_inventory.md` row 18): with job-like starting texts the approvals made "NO DIFFERENCE" to the checker; they act through the session's own model. Reasoning: a comparison made only at start-up cannot stop a long-lived session; one made at every wake is a standing check that stops work. The draft needs to say which it keeps.
4. **How bad.** Stops a tranche for as long as the restart takes, each time; with finding 1, it can end the product as it did on 9 Nov.
5. **Status.** RAISED BEFORE AND STILL OPEN (register 28: "the stop itself is kept, so the counter-argument stands, now as a stated cost").
6. **Best answer.** A removal already offered in the first round and not taken: sessions carry on under the text they loaded, and only sessions started after the edit load the new text. If it is kept, say when the comparison is made.
7. **Whose.** Claude's to decide under record line 12; Bob can overrule.

### 12. Finished sessions pile up, nobody is named to archive them, and new starts fail silently at about fifty

1. **The fault.** A round of about 177 jobs leaves about 177 finished sessions. If idle sessions count toward the account's limit of about fifty, starts fail while reporting success after the first forty or so. The draft does not say who archives a finished session.
2. **Sentences.** Section O: "Finished sessions do not use up the account's room. Process3 saw new starts fail silently at about 50 live sessions (one event)." Searched today: the word "archive" does not occur in the fifth draft.
3. **Rests on.** Measured (`permissions_inventory.md` row 14): about 50, one event. Measured (`roles` 1.3): "21 finished job sessions archived by ROOT's cap sweep"; Process3's rule was "Whoever starts a session archives it". Measured (rows 5 and 6): archiving passed 2 of 5 and 1 of 4 before the approvals; "15 of 15" after has no evidence file.
4. **How bad.** Silently stops a round.
5. **Status.** RAISED BEFORE AND STILL OPEN (register 67; first-round finding 13). Now listed for trial; the trial needs about fifty live sessions on Bob's account, which its stated cost does not count.
6. **Best answer.** Wording: name who archives (the session that started it, as in Process3). Keep the trial.
7. **Whose.** Claude's to decide; needs a trial.

### 13. ARCH carries every start, merge and notification alone, and nobody is named to notice a job that died after its tests passed

1. **The fault.** ARCH does everything between jobs. It was replaced 21 times in six and a half days when it did less. A job that dies between a passing test and its message leaves a slot held; the hourly alarm wakes ROOT, not ARCH, and no rule says how ROOT tells a stopped session from a waiting one.
2. **Sentences.** Section C: "It starts jobs, merges them, and passes notifications between modules ..." Section C: "Once an hour an alarm wakes it as a safety net ... to wake or replace a session that has stopped." Section G: "After two failed corrections ARCH replaces the session".
3. **Rests on.** Measured: 21 architecture sessions for 508 merges, about 24 each. Measured (`foundations.md`): "with no event, BOB noticed attempt 1's completion after 194 minutes". Platform text (`subscribe_pr_activity`): "A PR's events go to one session at a time." In Process3 the architecture session held that subscription; a job listening to its own test result is the platform's design but has no run in the record. Reasoning: at about 177 jobs a round, ARCH is replaced about seven times a round with jobs open, which the draft lists as unproven.
4. **How bad.** Costs hours per stall; with eight slots, a few stalls idle the round.
5. **Status.** RAISED BEFORE AND STILL OPEN: register 8 ("NO ANSWER FOUND"), register 11 (who counts failed corrections), the unanswered part of register 34 (the rule for "has stopped"). Register 30 (waking) is ANSWERED well enough to build from.
6. **Best answer.** Wording: at each hourly wake ROOT wakes ARCH, and ARCH reads the open pull requests; state the rule for "stopped" in one line (for example: its tests passed and no message came by the next wake). Replacing ARCH at each round's end, offered in the first round, is a structural choice still open.
7. **Whose.** Claude's to decide; replacement with jobs open needs the trial.

### 14. The watcher is back, and with it two sentences that cannot both hold

1. **The fault.** The draft says no session starts its own replacement and sessions are at most three levels deep. It also keeps a watcher which, on the record, ROOT started, and whose takeover put ROOT one level down and left no watcher behind. If Bob starts the watcher instead, that is an act missing from his list. If ROOT dies with no watcher, nobody is named to notice.
2. **Sentences.** Section C: "Sessions are at most three levels deep, and none starts its own replacement." Section C: "both recorded takeovers in Process3 left no watcher behind and left ROOT one level deeper than designed." Section N.4: "Who starts the watcher." Acts table: "Start the first session, ROOT | ... and if ROOT dies and no watcher takes over".
3. **Rests on.** Measured (`roles` 1.6, 3.3): two takeovers; the watcher woke once a day by its own alarm; Process3's own decision called a takeover "a bridge: Bob restarts ROOT from his app at depth 0 at his next opportunity". Reasoning: with a daily wake a dead ROOT is found up to a day late, and for that day nothing replaces a dead ARCH or starts PROCESS.
4. **How bad.** Stops a tranche for up to a day; costs Bob an unlisted act either way.
5. **Status.** RAISED BEFORE (first-round finding 9; register 15, answered then by removing the watcher). Reopened by Bob's question of 14 Nov, which the draft answers honestly. STILL OPEN, and the two sentences now contradict.
6. **Best answer.** Wording: either the sentence about replacements and depth gets its exception written in, or the watcher is described as what the record says it was, a bridge until Bob next starts ROOT. Say who tells Bob that ROOT is dead.
7. **Whose.** Bob's to decide (it is his note and possibly his act); the wording is Claude's.

### 15. The shared state is still one sentence

1. **The fault.** The draft says shared state lives in "one place on GitHub" that needs no merge. It does not say what the place is, who writes each part, or how it squares with the kept rule of one writer per file. If the place is made of things written by the sessions' GitHub account, a second suspension of that account could hide it.
2. **Sentences.** Section C: "What every session needs lives in one place on GitHub, in the product's repository, that needs no merge to write and is written only through the process's tool." Section J: "Git and GitHub hold all state, with one writer per file."
3. **Rests on.** Measured (`notes/github-pacing.md` in process3): the suspended account had made 1,387 pushes to the state branch in 19 hours; the cause of the suspension was never learned. Measured (`permissions_inventory.md` row 20): a session writing relayed words of Bob's into a file other sessions load was refused, "[Instruction Poisoning]"; the shared state is to hold "your instructions quoted exactly". Reasoning: ROOT, ARCH, the coordinator and blocked jobs all write there.
4. **How bad.** Stops the first round at the first replacement of ARCH if it does not work; the suspension case could lose the record.
5. **Status.** RAISED BEFORE (register 27, register 9). NOW ANSWERED by Claude's decision in a sentence; not enough to build from. Register 9 STILL OPEN ("NO ANSWER FOUND").
6. **Best answer.** A structural choice written down: name the place (a branch written rarely holds through a suspension better than comments do, because commits stay), list its few entries and the one role that writes each. Honest statement: writing Bob's quoted words there may be refused, and is unproven.
7. **Whose.** Claude's to decide; needs the trial.

### 16. The release has no actor, two of its workflows do not exist, and sessions are forbidden to touch what it must update

1. **The fault.** "The process prepares it" names no session. The record says the product has no workflow for updating the installer or the website page. Bob's approvals forbid sessions to change the installer and the website. The tool, as listed, cannot start a workflow. And the merge of the tranche into main, 7,339 commits, has never been made on this product.
2. **Sentences.** Section D: "The process prepares it and waits for your approval (line 18) ... The release path is unproven." Section D: "ARCH merges the tranche branch into the main branch as a whole, by pull request ... None of the three tests runs on that pull request." Section P.1: "When the journeys that use AI are walked is not said". Section M: the tool "does only this ...".
3. **Rests on.**
   - Measured (`DECISIONS.md` BD-R3, Bob, 8 Nov): "The product has no workflow for either yet"; "The scoped deploy token is Bob's to add to that environment". Same record: Bob, 8 Nov, "Yes, the installer update and site update wait until a release walk with AI on is also clean." So the record does say when the AI journeys must have been walked; section P says it is not said.
   - Counted today: Bob's approvals: sessions "may not change ... the worker civicsmith-site and its website ..., the installer worker newgroup". `release-sign.yml` exists and waits for Bob in a protected environment; it is started by hand on a branch named for the release. The newest release tag on the product is v0.71.0 of 21 Sep, before Process3.
   - Measured (`permissions_inventory.md` 2a): the tranche merged into main 13 times on the probes repository on 2 Nov; never on the product. So a rehearsal on probes repeats what was done and says nothing about the product's merge.
   - Reasoning: workflow files belong to no module, so under the job rule no job may write the two missing workflows unless ARCH gives those files an owner module.
4. **How bad.** Stops the first release; does not stop a tranche.
5. **Status.** RAISED BEFORE (register 29; first-round finding 8). The merge to main is ANSWERED well enough (ARCH; no test runs; unproven). The release itself is listed as unbuilt and unproven; its missing actor and missing workflows are NEW.
6. **Best answer.** Wording and settings: name ARCH as the one that prepares a release; give the workflow files an owner module; add the protected-environment token to Bob's acts; quote Bob's 8 Nov sentence beside his 14 Nov answers and ask whether it still stands. The two are his own words and I do not choose.
7. **Whose.** Needs the build; the AI-walk question is Bob's.

### 17. The trial costs Bob more than the draft says, and several of its items cannot be settled on made-up modules

1. **The fault.** The trial repository is itself a Process3 copy that tells sessions to act on nothing, and the last pushes sessions made there were refused. Before any trial, it needs the same conversion as the product, with Bob's own commits. Several listed items need things made-up modules do not have: a walker, screens, a deployable product, a release, a second account.
2. **Sentences.** Section O: "Judged cost to you: one sitting of about half an hour, one settings change, two session starts, one edit to your approvals and one 'stop'. Each claim gets one rehearsal unless a number is given." And the list under it.
3. **Rests on.**
   - Counted today, `process3-probes`: default branch main; its tranche branch has a pinned Process3, the "act on nothing" line, the Process3 required check, and the allow rule naming the Process3 tool.
   - Measured (`permissions_inventory.md` row 34): pushes by sessions in that repository were "Refused 2 of 2" on 8 Nov, "judged dangerous", no reason recorded.
   - Reasoning, item by item. *Walk shared by journey; deployment and external walk; Cloudflare bearing the walkers; a release prepared:* made-up modules have nothing to walk, deploy or release, so these cannot be tried there at all. *Account switch:* needs a second Claude account with its GitHub connection and cloud environment, which are acts of Bob's not in the cost line. *Watcher takeover:* needs a dead ROOT and the watcher's next wake. *The alarm does not undo a stop:* needs at least an hour's wait. *Finished sessions and the limit:* needs about fifty sessions. *Tranche into main:* already done 13 times on this very repository. *Mechanical edit with every touched module's tests:* cannot show the real size (60 modules, 40-minute suites). *Twenty merges:* the draft itself says they bound the refusal rate only below about 14%. *The slot rule gives the same answer every time:* true of any script; it settles nothing about sessions.
4. **How bad.** Costs Bob time; misleads him on what the trial will have shown.
5. **Status.** Partly RAISED BEFORE (register 65, 71, 72). The probes facts and the item-by-item reading are NEW.
6. **Best answer.** Split the trial list in two, honestly: what the made-up modules can show (start, approvals, merges, slots, state, stop, PROCESS start), and what only the real product's copy can show (walks, deployment, release, the merge to main, the big mechanical edit). Restate Bob's cost with the conversion commits counted.
7. **Whose.** Claude's to decide; the cost is Bob's to accept.

### 18. An account switch and a suspended GitHub account are named but not described

1. **The fault.** The body has no passage on switching accounts: only a row in Bob's acts and a line in the trial list. For a suspended sessions' account there is one line under risks. Both happened in Process3 and both stopped everything.
2. **Sentences.** Acts table: "At the start of a product and at an account switch". Section O: "An account switch loses no work. It failed on 5 Nov and was cancelled on 7 Nov." "Why GitHub suspended the sessions' account on 6 Nov was never learned." Section G: "The stop is a line in the shared state naming the account."
3. **Rests on.** Measured (`roles` 3.4): on 5 Nov the new account first had no GitHub connection, then pushed as Bob himself, and "every job start refused"; "13 job sessions were stranded"; old sessions "cannot be messaged or archived from the new account". On 7 Nov the switch was cancelled after "about 9.5 h". Reasoning: after a switch every role named in the shared state points to a session the new account cannot reach.
4. **How bad.** Stops a tranche for hours; costs Bob time.
5. **Status.** RAISED BEFORE (first-round finding 9; register 9, 34). STILL OPEN: thin.
6. **Best answer.** A short passage: what Bob does, what the new ROOT does first (replace every role named in the shared state and restart each open job from its branch). Honest statement that it has failed twice.
7. **Whose.** Claude's to decide; needs a trial that costs Bob a second account.

### 19. The tool "does only this", and the draft asks more of it

1. **The fault.** Six things are listed for the tool. Elsewhere the draft needs it to do at least six more.
2. **Sentences.** Section M: "does only this: push; open a pull request and mark it ready; merge; start the next job; send notifications; and write the shared state." Section I: "the process's tool is each session's only door to GitHub." Section J: GitHub's limits are kept "the way Process3 kept to them ... carried over unchanged".
3. **Rests on.** Counted today: the deny list removes every `gh` command. Measured (`notes/github-pacing.md`, PD-22): at its end Process3 kept to GitHub's limits by having the tool read GitHub's own figure "before a job or lane start" and back off at 85% until the limit reset. Reasoning: the draft also needs the tool, or something, to close a pull request (a notified job that changes nothing), read a failed run's output for the job, start a workflow (the release), deploy, record a blocked job, and hold back starts at GitHub's limit. The last is a wait built into the tool and is not among the things section J names as able to stop work.
4. **How bad.** Minor now; costs time in the build, and "does only this" will not be true on the day it is built.
5. **Status.** NEW (register 25 answered "a new small tool" with the same short list).
6. **Best answer.** Wording: list what the tool must do from the body, once, and say which of those can make work wait.
7. **Whose.** Claude's to decide; needs the build.

### 20. Switching the uses check to read tests is a change to the process in the middle of the first tranche

1. **The fault.** The check cannot read tests until 122 pairs are corrected. 36 of them are corrected by jobs, during a tranche. So the check changes while the tranche runs, which the draft says happens only at PROCESS with Bob's approval; or the first tranche runs without what Bob's hint asked for.
2. **Sentences.** Section E: "Before the check can read tests, those 122 are corrected ... 36 point to a later module ... those modules' jobs do it." Section J: "one fixed version for each tranche, moved only with your prior approval."
3. **Rests on.** Measured by the draft's own search (122, 86, 36). Reasoning: each of the 36 moves something between two modules, so it is two jobs that must merge in an order, with the second blocked until the first lands.
4. **How bad.** Costs time; a small mislead on when his hint takes effect.
5. **Status.** RAISED BEFORE (register 36), NOW ANSWERED by Bob's hint. The order of switching on is NEW.
6. **Best answer.** An honest sentence: the check reads tests from the second tranche, or from a move Bob approves at PROCESS once the 36 are done.
7. **Whose.** Claude's to decide.

### 21. Process3's own sessions and hourly alarm may still be alive on the account

1. **The fault.** Process3's ROOT was never stopped; its alarm had sent 94 notifications by 13 Nov. Nothing in Bob's acts or the process's start deals with what Process3 left running on the same account and the same repository.
2. **Sentences.** Section G: "After your stop of 9 Nov the alarm went on firing and had sent 94 notifications by 13 Nov (measured)." Section D: eight slots "counted across the account".
3. **Rests on.** Measured (`review.txt`, as quoted in `roles` 1.3). Not determined (`trial_plan_facts.md` section 6): "Whether Process3's sessions and its hourly task are still alive on his account." Reasoning: they count toward the limit of about fifty, they still notify Bob, and they hold Process3 instructions for the repository Process4 is about to convert.
4. **How bad.** Minor; costs Bob confusion on day one.
5. **Status.** NEW in the definition.
6. **Best answer.** One line in the start: before the first ROOT, the old alarm is deleted and the old sessions archived, by a session under his existing approvals or by Bob in his app.
7. **Whose.** Claude's to decide.

### 22. Places where the text contradicts itself or has gone stale

Each is wording. None stops anything alone; together they mislead.

| # | What | Sentences | Status |
| --- | --- | --- | --- |
| a | Section D says three readings on the tranche and release "are still open with you (section P)". Section P says "You answered each". Section K still says "as Claude reads your words of 14 Nov". | D, K, P | NEW |
| b | Section B lists Bob's second, third and fourth messages. His fifth, with the three answers, appears only in P. The body and the list of his words disagree on what he has said. | B, P | NEW |
| c | The acts table sends the reader to section I for committing approvals "in the process's" repository. Section I says nothing about that repository. | C, I | NEW |
| d | "ARCH edits the list until every file has one owner module." The module list itself, CLAUDE.md, the settings file, the decision file and the workflows can have none, or jobs could edit them. | C, J | NEW |
| e | The internal walk is made "at any time on your word", and "a walk happens when no job is open". | E.2, D | NEW |
| f | Step 1 lists three kinds of work (an unmet requirement, a walk flaw, a notification). Step 5 creates a fourth: a flaw a job reports. | D | NEW |
| g | "Without flaws" means leaving out "no step that the walk before it made". A tranche "can end without an AI enabled run". After one walk with AI on, every later walk without it leaves steps out. | D, P.1 | NEW |
| h | "When a module's work is finished: ... when its notified job tells ARCH that nothing needs changing." That job's pull request stays open; nothing closes it, and "ready" is defined as "no job already open". | D | Register 7, part still open |
| i | Section N: "Thirteen are now decided in the body". At least four of those are decided only as "Claude's to settle in the build": the form of the shared state, which files each walk reads, how a plain start learns its role, and the mechanical edit's test run. | N, C, D, I | NEW |
| j | The comparison of approvals is "start-up" in J and L, and something a long-lived session does in I (finding 11). | I, J, L | NEW |
| k | "Sessions are at most three levels deep, and none starts its own replacement", beside the watcher (finding 14). | C | Register 15 reopened |
| l | "Model and effort. Every session passes your suggestion on." Platform text: effort is "not inherited" and is to be set "only when the person or your standing instructions ask". Unproven and not in the list of unproven things. | C | Register 64, still unproven |

---

## The walk-through, in order, with where it stops

**Before any session.** Bob changes the default branch, commits his approvals and the deny list in two repositories, connects GitHub as the sessions' account and fills the cloud environment. Stops: his commits cannot merge until the conversion is built and ordered (finding 2); the process repository's branch and approvals are not specified (finding 9); Process3's leftovers are untouched (finding 21).

**ROOT.** Bob types a plain prompt. Stops: ROOT stands on an old copy (finding 1); nothing tells it what ROOT does, and the tool is not in its repository (finding 3). If it gets through: it starts ARCH and the coordinator (measured in Process3 with a role prompt), sets its hourly alarm (measured, including on a ROOT Bob started: the 8 Nov ROOT's alarm went on firing and had sent 94 notifications by 13 Nov), and writes the roles into a shared state that is not yet designed (finding 15). Who starts the watcher is open (finding 14).

**ARCH's first hour.** It must repair the module list for 29 modules, four new ones, about 50 unowned files and 86 undeclared uses before the first job is right. Stops: the mechanical edit's moment is after the jobs (finding 8); every list change needs a test run that answers on a change touching no module (finding 2).

**A job.** ARCH starts it by commit id with instructions naming its acts (measured form). It works, pushes through the tool, marks ready, hears its own test result, messages ARCH. ARCH merges and refills. This part is the best-founded in the draft: about 700 unreviewed merges went through Process3's tool without a recorded refusal. Stops: step 8, the notification (finding 4); a needed use or service in another module (finding 7); a job that dies after its tests pass (finding 13); after about forty jobs, the session limit (finding 12).

**The eight slots across the account.** With one product nothing changes, as the draft says. For two products the count sits in one product's repository and the other product's sessions cannot see it. Process3 kept an account-wide cap as a setting of the cloud environment, which Bob sets and every new session reads (`permissions_inventory.md` 1f). That is a structural answer available for the draft's open item 3; it would move the act from "tell the coordinator" to a setting, which is Bob's to choose.

**End of the round's jobs.** Stops: blocked jobs keep the round open (finding 8). **Internal walk.** Stops: no document to walk against as described, no stated scope (finding 5); no way to share the walker among sessions (finding 6). **Deployment.** No session named; tokens are in the cloud environment, which is the measured route. **External walk.** Never run from a session (finding 6). **Flaws to modules.** ARCH is named; a flaw in a file with no owner still has no module until the list is repaired.

**Tranche end and release.** Findings 10 and 16.

**A process fault at night.** Finding 9. **Recovery.** A dead job: answered and was built in Process3. A dead ARCH or coordinator: ROOT replaces it; unproven with jobs open. A dead ROOT: finding 14. A dead PROCESS: not in the draft (finding 9). Account switch and suspension: finding 18. A stop on Bob's word: answered in a sentence, depends on the shared state (finding 15) and on interrupts (measured 14 of 15).

---

## The first round's findings the fifth draft says are answered

| First-round finding | The fifth draft's answer | Enough to build from? |
| --- | --- | --- |
| No Process4 tool | Section M lists six things it does; "Builder: Claude" | A list, not a design. The list is short of what the body asks (finding 19); how the tool reaches a session is unsaid (finding 3); the conversion order is unsaid (finding 2) |
| Working state has no home | "one place on GitHub ... that needs no merge to write" | Only a sentence (finding 15) |
| Waking: who hears the test result | The job hears it and sends ARCH one message | Yes. The platform supports it; no run in the record. The dead-job case is open (finding 13) |
| Default branch, so that approvals are the newest | Bob makes the tranche branch the default | No. It answers a fault that did not happen (finding 1) |
| Modules with no files | ARCH decides; the move is a mechanical edit | Half. The edit's moment and test run do not fit day one (finding 8) |
| Undeclared uses | The check reads tests; 86 declared by ARCH, 36 refactored by jobs | Yes for what is done; the order of switching on is unsaid (finding 20), and how a job gets a new use declared is unsaid (finding 7) |
| A blocked job | Reports, records, pushes, stops, frees its slot | Yes for a flaw. Not for a needed service or a needed mechanical edit (findings 7, 8) |
| How a tranche ends; the merge to main | ARCH merges; no test runs there | Yes, unproven. The rehearsal on probes repeats what was done there (finding 16) |
| A process fault has no one | Bob's hints: ROOT starts PROCESS; job to ARCH to coordinator to PROCESS | The links are named; five things a session needs are not (finding 9) |
| The hourly alarm undoes a stop | A stop line ROOT reads at each wake | Yes in a sentence; rests on the shared state |

---

## Sections M, N and O

**Relied on by the draft and missing from all three.**

1. How the tool and role texts reach a session that holds one repository (finding 3).
2. The order of converting each repository, and that the trial repository needs it too (findings 2, 17).
3. Who writes requirements into a module, and how a job gets a use declared (finding 7).
4. Who moves a product to a changed process; PROCESS's branch, approvals and replacement (finding 9).
5. That the walker is a module of the product and must be changed before a walk can be shared (finding 6).
6. That a session's browser can reach the development site (finding 6).
7. Who deploys; who prepares a release; the two missing release workflows (findings 6, 16).
8. Who archives finished sessions (finding 12).
9. The account switch as a procedure (finding 18).
10. What is in the walks' folder, and what part of the documents a tranche's walk covers (finding 5).
11. That effort reaches each session (finding 22, row l).
12. Process3's leftovers on the account (finding 21).

**Trials that cannot settle their claim.** See finding 17. In short: nothing about walks, deployment, Cloudflare's limits or the release can be tried on made-up modules; the merge to main on the probes repository was already done 13 times; the slot rule's sameness is true of any script; twenty merges bound little; the internal-walk trial can only break its claim (the draft says so).

**The smallest set that must exist before any trial can run.**

- Decisions, each a paragraph: where the shared state is and who writes each entry; how the tool reaches a session; what a plainly started ROOT reads; who starts the watcher or that the trial runs without one; the branch PROCESS starts on.
- Built: the tool for push, open, ready, merge and state; role texts for ROOT, ARCH, the coordinator and a job; a required test run that answers on every pull request including one that touches no module; three to ten made-up modules with a list and tests.
- Bob's acts, in a written order: lift and restore the required check on the trial branch; merge the conversion; commit his approvals and deny list there in Process4's words; make that branch the default; start ROOT.
- Not needed for the first trial, and so not tried by it: the notification, the walks, deployment, the release, PROCESS beyond its start.

---

## Probed and not found broken

- **A session starting a session on another repository.** Done in Process3 from 5 Nov: a product-rooted ROOT started each coordinator on the process's repository. The draft's notes say this was not established. It is better founded than the draft claims, though only under Process3's approvals and a prompt naming the act.
- **The hourly alarm on a ROOT Bob started.** The 8 Nov ROOT was started by Bob and its alarm fired until at least 13 Nov. The draft lists this as to be tried; the record already has it.
- **Merges with no review.** About 700 through Process3's tool, no recorded refusal. The new tool is unmeasured, as the draft says.
- **A dead job.** Restart on the same branch and pull request was built and used.
- **GitHub's machines for eight jobs at once.** Nothing found against it.
- **Depth.** ROOT, ARCH, job is three levels; PROCESS and the coordinator sit at the second. Only a watcher's takeover goes deeper, and jobs ran at that depth on 3 Nov.

---

## MAP

| Area | Rating | Why, in one line |
| --- | --- | --- |
| Roles and sessions | Stated but unproven | Every standing role is named and most duties have an actor; the watcher contradicts a sentence beside it, and PROCESS has no replacement. |
| Flow of a job | Stated but unproven; thin at the edges | Start, test, message, merge and refill are clear and close to what ran; step 8, a needed use or service elsewhere, and a job that dies after passing are not. |
| Rounds, walks and tranche end | Contradictory and thin | The folder does not hold the documents as described; no way exists to run either walk as written; blocked jobs keep a round open; nothing suggests a walk can come clean. |
| Release | Missing | No actor, two workflows that do not exist, sessions forbidden to touch what it updates; honestly marked unbuilt. |
| Notification | Missing by decision | Under study on Bob's word; the draft says so; the process cannot start on the real product until it is settled. |
| PROCESS and process change | Thin | Bob's rule is clear and his hints name the first three links; branch, approvals, telling Bob, the merge, replacement and the actor for the move are absent. |
| Permissions and starting | Contradictory | The preserved parts are the best measured in the design; the one new decision, the default branch, answers a fault the record does not show, and the conversion has no order. |
| State and waking | Thin | Waking is answered. The shared state is a sentence, with no named place or writers. |
| Recovery | Thin | Job, ARCH and coordinator have an answer; ROOT, PROCESS, the account switch and a suspended GitHub account do not; nobody archives. |
| Reports | Solid enough | One report, one author, from what git holds, nothing reads it to decide; cost may be unreadable, as stated. |
| What is unbuilt | Stated, and understated | Section M is honest about the tool, texts, conversion and nine other things; twelve more are missing from it, and the tool's list is short of the body. |
| What is unproven | Stated, with a weak trial plan | Section O is candid; but the trial repository needs converting first, its cost to Bob is understated, and a third of its items cannot be tried on made-up modules. |
