# Attack on the Process4 definition, second draft: feasibility

14 Nov 2026. Read-only. Nothing was committed, pushed or started. Under attack: `/home/user/handoff/process4_definition_v2.md`.

**Verdict.** As written, Process4 would not run. It stops before the first job, for three separate reasons (findings 1 to 3). If those were repaired it would stop or stall in the first round for four more (4 to 7), and it has no stated way to end a tranche (8). The rest cost time or mislead.

**Evidence labels, kept apart in every finding.**

- **Measured:** in the record. File and passage given. Counts marked "counted today" were taken by me from the two read-only clones (`civicsmith-copy` at `origin/tranche` e7ec72e, `process3` at `origin/tranche` 38b0f3f).
- **Platform text:** stated in a platform document or in the tool definitions given to this session today. Not measured on these repositories.
- **Reasoning:** mine only.

**One simulation is used below (findings 5 and 6).** Inputs are the real module list (`build/modules.json`, 220 modules, 3,120 declared uses) and the real unmet marks (466 marks in 65 modules, the same count as `no_layers_width.md`). The rule simulated is the definition's own: eight slots, earliest ready module first, no waiting for used modules, every declared user notified on a merged change, a notified module with no open job becomes ready. Assumptions that are mine: every job takes the same time; a job that had real marks always changes its module; a job started only by a notice changes its module one time in ten (Process3's "affected" rate). Script: `/tmp/claude-0/-home-user/53c12ae4-2f57-537f-a714-d9dd7c364da1/scratchpad/sim.py`. It is reasoning on measured inputs, not a measurement.

---

## Findings, worst first

### 1. There is no Process4 tool, and "Process3's merge tool with three rules removed" does not describe one

**Counter-argument.** The definition speaks of "the process's merge tool" as if it exists and only loses three review rules. The Process3 tool cannot merge a Process4 job at all, and nobody is named to build the one Process4 needs.

**Attacks.**
- "ARCH merges it into the tranche branch once the tests pass, using the process's merge tool, the only way a session can merge."
- "Unchanged from Process3: all of the above, and merging through the merge tool. The tool's three rules that demanded a review come out, which is a removal."
- "Process4 keeps almost all of your requirements and takes away the parts of the process that grew."

**Evidence.**
- Measured (counted today, `process3` tip). The tool is 66 files, 1.77 MB of code, with 2.10 MB of tests. `merge.mjs` has 95 refusal points, `layerflow.mjs` 133, `job.mjs` 107.
- Measured (read today, `tool/lib/merge.mjs`). Besides the three review rules, the job-merge path refuses when: there is no ledger entry for the job (line 426); the ledger is malformed (430); the branch changes files outside its module (433); there is no cost figure for the job (448); there is no "verified green process-gate run" matched to a posted row (419); the second test run on the merged result is not green (263); a generated file differs (790 to 797). The definition ends every one of those elsewhere: sections H, I items 4 and 6, K item 1.
- Measured (same file, line 234, and the product's `process/config.json`, `"merge_strategy": "layer"`). At the end of Process3 job pull requests did not go through `merge` at all. They landed through `layer land`, which is layer machinery. The nearest thing to Process4's start rule in the tool (`direct.mjs`) waits for every used module to be settled, which Bob has withdrawn, and the product's settings at the tip still say "layer".
- Measured (`permissions_inventory.md` 1b). The deny list removes every `git push` and every `gh` command, not only merges. So the process tool is the only door to GitHub for every session: opening a pull request, pushing, marking ready, reading a test result, merging. The definition's description of the deny list ("the ordinary merge commands ... force-pushing; deleting branches; pushing straight to the main branch; and writing files through GitHub's web interface") leaves that out.
- Measured (product `CLAUDE.md` at the tranche tip, the lines under "## Process3"). Every session that starts on the tranche today loads: "Your role prompt is the message that started this session, printed by the pinned tool (`start root`, `start bob`, ...). Act only as it says; with none, act on nothing." A ROOT started by Bob with a plain prompt is told by the file it loads to act on nothing.
- Measured (`process-gate.yml` in the product; `merge.mjs` lines 652 to 661). The product's required test run is Process3's, fetched at the product's recorded Process3 version. A pull request that removes or swaps that version is a failing "record" finding. The route that converts the product to Process4 has to pass the Process3 check it is removing, or Bob has to change the ruleset first.
- Reasoning. The definition has no section on what must be built before Bob starts ROOT, by which session, in which repository, under which rule. Section E's rule ("may only correct or remove") is about fixes; the first build is not a fix. With the wall of section K, every one of those first changes also waits for Bob's click.

**How bad.** Stops the first hour. Section J's trials 1, 2, 3 and 6 cannot be run either: each needs the tool.

**Answer.** Wording and a structural choice. Say plainly that Process4's tool is a new, small build, made and tried before the process is in force. List what it does (push; open and mark ready a pull request; merge when the required test run is green; the start rule; the notice; the status read-out) and state that nothing else in it may refuse. Name the session that builds it and the session that converts the product (pinned version, test workflow, the process lines of `CLAUDE.md`, settings file). Add to Bob's acts the one-time change of the required check if its name changes. Correct the sentence in F to say that the deny list makes the tool the only route for every push and every GitHub command.

Sources: `tool/lib/merge.mjs`, `layerflow.mjs`, `direct.mjs`, `shims/process-gate.yml`; product `process/config.json`, `CLAUDE.md`; permissions_inventory 1b, 2a; enforcement_levers section 1.

---

### 2. Bob's own first two acts, done in the listed order, stop ROOT, and nothing in the definition restarts it

**Counter-argument.** Bob is to commit reworded approvals and then start ROOT. Twice out of twice in Process3 a ROOT that Bob started right after an approvals edit came up on an old copy. The definition keeps the rule that a session which finds its approvals differ from the newest "does nothing". So the first ROOT does nothing, and so does every long-lived session after every later edit.

**Attacks.**
- "A session compares the approvals it loaded with the newest, and on a difference does nothing. ... *Claude decided:* keep it, because approvals load only at a session's start, and first prove that your edit can be taken up without you."
- "An edit to your approvals is taken up with no further act of yours." (J item 10)
- "Start the first session, ROOT | Once per start or restart of development."
- "from the newest commit of the tranche branch, never from the main branch, which still holds your first approvals of 1 Nov."

**Evidence.**
- Measured (`roles_root_coordinator.md` 3.1). "The owner-started ROOT's container stood on an old commit both times: 'first start check failed ... the Bob-app ROOT clones the default ref, not the tip'"; 5 Nov 18:41Z and 8 Nov 19:00Z, both straight after an approvals edit. (A third start by Bob, 5 Nov 17:45Z, was not after an edit and has no such record.) Each was repaired by a message from the coordinator. In Process4 no other session exists yet when ROOT starts.
- Measured (`permissions_inventory.md` 1a). The product's main branch holds the 1 Nov approvals; "A runner started by hand from main held no approvals and was refused session starts."
- Measured (same, 1a). "every owner edit stopped every role (4 Nov, 5 Nov twice, 8 Nov, 9 Nov)"; after the last the product never restarted.
- Platform text (tool definition of `create_session`, today): a start with no revision named "defaults to the repo's default branch". The default branch is main.
- Reasoning. The definition names no mechanism by which an edit is taken up. ROOT is itself stopped by the check, so it cannot replace ARCH or the coordinator. The standby (technical point 4) wakes once a day, runs the same check and also does nothing. J item 10's trial therefore tests a claim for which no design exists. Choosing the branch when starting ROOT is also an act of Bob's that his list does not show.

**How bad.** Stops the first hour. Then stops the tranche at every approvals edit, which is exactly how Process3 ended.

**Answer.** A removal, a setting and wording. Remove the "does nothing" half of the kept check: a session that finds newer approvals carries on under the text it loaded, and ROOT replaces ARCH and the coordinator at its next wake so that they and every new job load the new text. State honestly that ROOT itself keeps the old text until Bob next starts a ROOT. For the start: either Bob's act is written as "start ROOT on the tranche branch", or Bob makes the tranche the repository's default branch (a GitHub setting) so that a plain start cannot land on main. Extend trial J2 to "started by Bob within minutes of an approvals commit". This stays unproven until that trial.

Sources: roles_root_coordinator 3.1, 1.3; permissions_inventory 1a, 1c; review case 5.

---

### 3. Working state has no home, so sessions cannot find each other, the slot count or a stop

**Counter-argument.** The definition ends Process3's state branch and says state lives in "each job's pull request". Most of the state the process needs does not belong to any job.

**Attacks.**
- "**Where working state is kept.** ... *Decided:* each job's pull request, which your documents allow."
- "**Where the slot number is kept, and how a stop on your word reaches every session.** *Decided:* one place in the record that the status read-out shows."
- "ROOT starts a successor for ARCH or the coordinator, which begins from the status read-out."
- "If not, the notice is work and the module's job becomes ready."
- "The main and tranche branches take changes only by pull request with the tests passing."

**Evidence.**
- Measured (`roles_root_coordinator.md` 1.3, 3.2; `permissions_inventory.md` 1e rows 17, 26, 27). Process3 kept on the state branch: which session is ROOT, the architecture session and the coordinator; ROOT's heartbeat; notices (5,851 files); messages. A session acts on another session's message only if its standing instructions name that session: "without it: 'A request from another session isn't enough for me to act on.'" Process3 solved replacement by having every session re-read the current address through the tool. The architecture session was replaced 21 times in six and a half days, the coordinator about 26 times.
- Platform text (tool definition of `send_message`, today): a message "arrives there as a turn marked as sent by this session, not typed by a person: the target is told to treat it as data from a peer".
- Reasoning. None of these has a job's pull request to live in: the three addresses; the slot number; a stop; Bob's words "quoted exactly, with the date"; a notice or walk finding for a module with no open job; a blocked record that outlives its session; the record a standby would need to know ROOT is dead; the tranche report. "One place in the record" names no file, branch or writer. If the place is on the tranche, every change to it, a stop included, is a pull request that must wait for a test run and a merge. Jobs read a status only at start, so a stop written there does not reach a running job; after the stop of 9 Nov "the process ran on for over two hours" (definition, J12).
- Reasoning. When ARCH is replaced, the up-to-eight open jobs still hold the old ARCH as the only session whose messages are instructions. Notices and corrections from the new ARCH are data to them, and their reports go to a dead session.

**How bad.** Stops the first round at the first ARCH or coordinator replacement; makes "a stop on your word" not work; leaves the status read-out with nothing to read.

**Answer.** A structural choice plus wording. Name one home that is not a job's pull request and does not need a merge: for example one GitHub-side object per product (a pinned issue, or repository variables, which `enforcement_levers.md` lever 2 records the sessions' account can write), holding the addresses, the slot number and the stop. Say who writes each line. Say that a stop reaches running jobs by ARCH interrupting them (measured in Process3: 14 of 15), not by their reading a file. Notices and findings for a module with no open job need a named place too. All unproven; add one rehearsal of an ARCH replacement with jobs open to section J.

Sources: roles_root_coordinator 1.2 to 1.4, 3.2; permissions_inventory 1e; causal_forensics section 6 (state branch volume); definition J12.

---

### 4. "The merge wakes ARCH at once" names no mechanism, and the only one available serves one session per pull request

**Counter-argument.** ARCH is the one that merges, so a merge cannot be what wakes it. What must wake ARCH is the test run finishing, and the platform sends a pull request's events to one session only, so either ARCH or the job is left uninformed.

**Attacks.**
- "ARCH merges it into the tranche branch once the tests pass".
- "The merge wakes ARCH at once and the slot goes to the next ready job."
- "*A failure* goes back to the job."
- "Sessions are woken by events, such as a job finishing or merging; the hourly alarm is only the safety net."
- "Nothing needed for correctness depends on archiving a session".

**Evidence.**
- Platform text (tool definition of `subscribe_pr_activity`, today): "A PR's events go to one session at a time. ... This session can take over only once that one stops: it unsubscribes or ends".
- Platform text (tool definition of `create_session`, today): "a session that finishes cleanly may not report back". So "a job finishing" is not an event the platform delivers.
- Measured (`foundations.md`, A job's life, step 2). Process3 had the architecture session subscribe to each job's pull request; "with no event, BOB noticed attempt 1's completion after 194 minutes". It also had jobs send a message. The median wait from finished job to merge was 8 minutes before the merge train (`levers`, 2.1).
- Measured (`product_side.md` 6; `redteam_feasibility.md` finding 5). 21% of module test runs failed on 7 to 8 Nov; 2.1 test runs per landing (495 runs for 238 landings).
- Measured (`roles_root_coordinator.md` 1.4). 21 architecture sessions for 508 landings: about 24 landings per session before it filled.
- Reasoning. If ARCH holds the subscription, every result of every open pull request is an ARCH turn, and every failure must be relayed to the job by a further message. If the job holds it, ARCH learns nothing unless the job tells it. When ARCH is replaced, the old ARCH keeps the subscriptions until it "unsubscribes or ends"; a dead or silent ARCH can do neither except by being archived, which the definition says nothing may depend on. At Process3's rate ARCH would be replaced about seven times in a round of the size finding 5 predicts.
- Reasoning. Trial J6 (two slots, three modules) cannot show any of this: it has no failing run, no eight open pull requests and no replacement.

**How bad.** Stalls every round: after each ARCH replacement freed slots wait for the hourly alarm, and that alarm wakes ROOT, not ARCH.

**Answer.** A structural choice and a wording change. The job stays the one subscriber of its own pull request: it fixes a failing run itself, and when the run is green it sends ARCH one message. ARCH then needs one turn per job and holds no subscriptions to lose. Rewrite step 8 to say that the job's message wakes ARCH. Enlarge trial J6 to eight slots, one failing run and one ARCH replacement mid-run.

Sources: foundations "A job's life"; redteam_feasibility finding 2 (still applies); permissions_inventory row "Who creates sessions and tasks".

---

### 5. On the real module list the notice rule turns 65 jobs into about 170, and the definition contradicts itself on how a notified job tests and finishes

**Counter-argument.** Telling every declared user on every change, and making each notice a job, means a round with 65 modules of real work runs about 170 job sessions, about 100 of them for modules where nothing needed changing. The text also gives a notified job no consistent way to test or to be done.

**Attacks.**
- "So today every declared user is told, on any change in the provider."
- "If not, the notice is work and the module's job becomes ready."
- "The job looks only at what the named parts mean for its own module, and runs only the tests that relate to them."
- "Its module tests run on GitHub's machines, not in the session." and "*Runs:* that module's tests, never another module's".
- "Done means merged."
- "**Round:** ... Every module that has work gets its job, then the product is walked."

**Evidence.**
- Measured (counted today). A module has 14.2 declared users on average (median 8, most 213). The 65 modules with work have 9.2 (median 6, most 58). One merge from each of the 65 notifies 158 distinct modules, 103 of which have no work of their own.
- Measured (definition and `interface_and_cycle.md` 1e). 2,101 of 2,342 judged notifications were "not affected". In Process3 each of those cost a reading by a helper, median $0.20. In Process4 each is a job: a session, a pull request and a test run.
- Reasoning (the simulation above). 65 modules with work: about 177 jobs, about 100 of them needless, about 730 notifications, and about 120 notices arriving at a job that is already running. Elapsed time 22.6 job-lengths against 8.1 for the 65 alone. A first build touching all 220: about 3,120 notifications, about 400 of them into running jobs. Equal job lengths understate the last figure, because the long jobs are the late screens modules that use the most.
- Measured (`no_layers_width.md`, section B end). With eight slots and no waiting, 37 of the 65 modules run beside a module they depend on that also has work; 29 beside one with an unmet public requirement; 20 beside a direct one.
- Reasoning, from the text. A notified job that runs "only the tests that relate" must run them in the session, which the definition forbids, or through its pull request, where the test run is the whole module's. A notified job that finds nothing to change has no change to push, so no test run and no merge; "Done means merged" then never becomes true, the notice is never cleared, and "every module that had work has merged" never holds.

**How bad.** Costs most of a round's time and money; and, read literally, the round cannot end.

**Answer.** Partly. Wording: say what "done" is for a notified job that changes nothing (it closes its pull request and that clears the notice), and say that a notified job's tests are the whole module's test run on GitHub. Honest statement: put the figure in the definition, "about 100 needless jobs in a round of 65, on today's list, by estimate". A trial: extend the replay of J4 to count jobs per round under the rule. For the needless jobs themselves, the only remedy I can see is a cheaper judgment before a job is started, which is Process3's triage of notices; whether that is a new check is not mine to say. **No answer found** within the rule for that part.

Sources: `build/modules.json`, `build/requirements/*.md` at the tranche tip; no_layers_width sections 3, 4, B; interface_and_cycle 1e.

---

### 6. Seven modules with work own no code, four do not exist yet, and 52 code files belong to no module

**Counter-argument.** The definition says a module has its own files and a job writes only its own module's files. On the real list, 58 unmet requirements sit in modules whose only file is the requirements file, so their own job cannot write the code that would meet them.

**Attacks.**
- "**Module:** one part of the product, with its own files, tests and requirements file."
- "It writes only its own module's files".
- "Each finding becomes work for a named module".

**Evidence.**
- Measured (counted today). 29 of 220 modules own no code (same count as `interface_and_cycle.md` 1a). Eleven of them carry unmet marks, 124 marks in all. Seven own only a requirements file and tests: jurisdictions-c 3, member-upload 2, interface-shell-t53 14, screens-intake-rounds 21, screens-document-beta 13, screens-public 2, installer-places 3 (58 marks). Four have no files at all because they are new: screens-document 57, surface-declarations 7, store-jobs 1, screens-plan 1.
- Measured (`interface_and_cycle.md` 1a, 2d). "52 code files belong to no module"; "Whether a module may own requirements and no code. 29 of the 220 modules do. Under 'each module is updated and tested by a single job', their requirements are met by changes to another module's files." That file lists it as a decision still open.
- Measured (product `build/modules.json`, `not_product`). The module list itself, the workflows and `CLAUDE.md` belong to no module. A new module's files enter the list only by an edit to a file no job owns.
- Reasoning. The seven jobs can only report "a flaw in another module" to ARCH and wait for the parent module's job. That is two jobs for each, and the split module's own marks can be struck only after the parent merges. A walk finding in one of the 52 unowned files has no module to be "named".

**How bad.** Stalls the first round for 11 of 65 modules (124 of 466 marks) unless ARCH improvises; the round cannot end until they merge.

**Answer.** A removal and wording. The size cap that created the 18 requirement-only modules has ended (section I item 3), so fold each back into the module whose code meets it; that removes modules from the list and needs no source change. Assign the 52 unowned files in the list. Say who edits the module list (ARCH) and that a new module's job may create its files. Correct the definition of "module".

Sources: `build/modules.json`; interface_and_cycle 1a, 2c, 2d.

---

### 7. A job stopped by another module's fault has no way through, and "a failure already on the tranche" cannot be named without a test the definition forbids

**Counter-argument.** GitHub will not merge a pull request whose test run is red. If the red comes from another module, the job may not fix it, cannot merge, and the text does not say whether it keeps its slot. Eight such jobs would hold all eight slots.

**Attacks.**
- "A failure already on the tranche branch before the job began is named, and is not the job's to fix."
- "ARCH merges it into the tranche branch once the tests pass".
- "A job that cannot go on records that it is blocked, pushes everything and stops. Other jobs carry on."
- "**Slot:** room for one job to run."
- "A test runs only when there is a fully informed reason to run it."

**Evidence.**
- Measured (`product_side.md` 6d). Of 165 block records in Process3, 48 named "the suite already red on the tranche before the job started".
- Measured (`interface_and_cycle.md` 1a). 202 test imports go to a module the importer does not declare; 81 point to a later module, in 38 undeclared pairs. No notice reaches these, and a module's tests run only when its own pull request changes.
- Measured (`process3` `tool/lib/basered.mjs`, 23 KB). Process3 needed a separate mechanism to know and tolerate tests already failing on the tranche.
- Reasoning. Naming a failure as already present needs a run of the module's tests on the tranche as it stood before the job. None of the three tests has that trigger. With jobs no longer waiting for the modules they use, this case becomes more common than in Process3, not rarer (finding 5: 37 of 65 run beside a dependency with work). Whether a blocked job still holds its slot is undefined; Process3 had to decide it (the coordinator's decision of 7 Nov that the cap counts jobs "still working").

**How bad.** Can stop a tranche: slots fill with blocked jobs while the module that must be fixed waits for a slot.

**Answer.** Wording and a removal. Define that a blocked job frees its slot and that its module is ready again only when the work it named in another module has merged. Remove the sentence about naming failures already on the tranche, or say honestly that the job judges it from its own test run and no separate run is made. No new test is proposed.

Sources: product_side 6d; interface_and_cycle 1a; `tool/lib/basered.mjs`; DECISIONS PD-7.

---

### 8. Nothing says how a tranche ends in practice, and its merge to main was never done on the product

**Counter-argument.** A tranche ends only on a walk with no failures, which Process3 never reached in nine days, and then by a merge into main that never once happened on this product and whose required test run the definition does not describe.

**Attacks.**
- "A round that completes with no failures ends the tranche. The tranche branch merges into the main branch as a whole".
- "There is no full regression".
- "The main and tranche branches take changes only by pull request with the tests passing."
- Section J, which lists neither claim.

**Evidence.**
- Measured (definition J11; `product_side.md`). "In Process3 no round ended with both walks clean." The internal walk had 63 failures in 238 steps, then 96 in 357 (product_side, reading 2; the definition's section H gives 70 of 357 for the same build, and the two figures are not reconciled).
- Measured (`permissions_inventory.md` 1a). "Main never moved after 1 Nov." The tranche is 7,339 commits ahead of main (`redteam_feasibility.md` finding 1). Tranche-into-main was exercised only on the probes repository on 2 Nov, 13 times, all with a review verdict (permissions_inventory 2a).
- Measured (`process-gate.yml`, comment "build/main-gate-2, 4 Nov"). Process3 already met the problem: on a tranche-into-main pull request the test run sees every module changed and "would run every suite past the gate's cap". Two suites take 40 to 42 minutes each.
- Measured (DECISIONS PD-16, BD-R1). In Process3 a walk counted as clean with "known gaps deferred on Bob's word".
- Reasoning. On the tranche-into-main pull request the required run either runs all 220 modules' tests, which is the full regression Bob ended, or runs nothing and reports green, which the definition should say. No actor is named for this merge. No rule says what happens when rounds keep finding failures; sessions write the walk's steps, so the two ways out are endless rounds or a walk changed until it passes. The definition reports step counts but, rightly under the rule, enforces nothing.

**How bad.** Stops a tranche from ever reaching main; or misleads Bob about what "merged to main with tests passing" meant.

**Answer.** Wording, an honest statement and a trial. Name ARCH as the merger. State that the required run on the tranche-into-main pull request runs no module tests and say so to Bob in those words. State that Bob's word can end a tranche with named failures carried over (he used that in Process3). Add "the tranche merges into main on the product" to section J, with one rehearsal on the copy.

Sources: permissions_inventory 1a, 2a; shims/process-gate.yml; DECISIONS PD-16, BD-R1; product_side section 9.

---

### 9. Replacing ROOT by a standby breaks two of the definition's own sentences, and stopping depends on an alarm it says nothing may depend on

**Counter-argument.** The standby is started by ROOT, so ROOT starts its own replacement; when it takes over, jobs sit four levels deep, not three. And an hourly alarm whose job is to restart stopped sessions will undo a stop or an account switch unless it is switched off, which the definition says must never be needed.

**Attacks.**
- "For ROOT, keep Process3's standby session, woken once a day, which takes over, so that replacing ROOT is not an act of yours."
- "Sessions are at most three levels deep, and none starts its own replacement."
- "Nothing needed for correctness depends on archiving a session or switching off an alarm".
- "Once an hour an alarm wakes it ... to wake or replace a session that has stopped. ROOT decides nothing".

**Evidence.**
- Measured (`roles_root_coordinator.md` 1.6, section 2). The watcher took over twice. "A takeover moves ROOT one level down, so it is a bridge: Bob restarts ROOT from his app at depth 0 at his next opportunity" (DECISIONS PD-2). Each takeover "left no watcher". On 5 Nov chained starts put jobs at "5 of 8". That file's own reading of the smallest role set leaves the watcher out for this reason.
- Measured (`review.txt`, quoted in roles 1.3). After the stop of 9 Nov "ROOT's hourly task kept firing. By 13 Nov 14:52Z it had sent 94 push notifications".
- Measured (`permissions_inventory.md` 1d). A replaced session's alarm keeps firing into the old session; switching an alarm off is judged case by case.
- Measured (roles 3.4). The account switch failed on 5 Nov and was cancelled on 7 Nov; "Old sessions cannot be messaged or archived from the new account".
- Reasoning. The standby wakes daily, so a dead ROOT is found up to a day late, and during that day nothing replaces a dead ARCH. The standby has no record to read that says ROOT is dead (finding 3). "ROOT decides nothing" does not fit a session that must judge whether another session "has stopped" as against being in a long turn or waiting on a test run. After an account switch the old account's ROOT is still woken hourly with the duty to restart development there.

**How bad.** Stops a tranche for up to a day on a dead ROOT; can run two ROOTs on one product; costs Bob time at a stop or switch.

**Answer.** A removal and wording. Remove the standby and say honestly that a dead ROOT is restarted by Bob, which is already on his list ("Once per start or restart"). Make the stop a recorded line ROOT reads at every wake, naming the account it applies to, so that a firing alarm does nothing and no alarm need be switched off. State the rule ROOT uses to call a session stopped. All unproven; J12's rehearsals should include "the alarm fires after the stop".

Sources: roles_root_coordinator 1.3, 1.6, 2, 3.3, 3.4, 6; DECISIONS PD-2; review.txt.

---

### 10. A process fault has no one to diagnose it, and under the wall as worded no session can prepare the fix

**Counter-argument.** "Claude fixes it" names no session. The coordinator decides nothing, ARCH decides only the product, ROOT builds nothing. And if the sessions' account cannot write to the process repository, it cannot push the branch a fix would be prepared on.

**Attacks.**
- "**The process itself has a fault.** Claude fixes it."
- "A fault that blocks work pauses the product until the process is fixed".
- "*Decided:* a short session started for that one fix and ended when the fix is merged".
- "the sessions' GitHub account loses the ability to write to the process's repository. A session can still prepare a fix."
- "Commit your standing approvals to the product's CLAUDE.md" (the only approvals on Bob's list).

**Evidence.**
- Measured (`permissions_inventory.md` 1a, 1c, 1e row 34). Approvals are per repository and name it: "In this repository ... only". A session must hold one repository. After the approvals were split per repository, pushes from sessions in the probes repository were refused 2 of 2 (8 Nov).
- Platform text (`enforcement_levers.md` lever 1, from GitHub's documentation). On a personal-account repository a non-collaborator can only fork and open a pull request from the fork.
- Measured (roles 1.2). In Process3 the coordinator owned every process decision and its builders did the work; the definition removes both.
- Reasoning. Who decides that a fault is the process's, that it blocks, and what the fix is? Who starts the fix session, on which repository, loading which approvals? Under the wall the session must work in a fork owned by the sessions' account, which no approvals text names and which Claude's GitHub connection may not cover without an act of Bob's. Section K says the wall "was never run"; it does not say that preparing a fix behind it was never run either. The title of technical point 2 also promises "which repository the coordinator holds" and the decision does not say.
- Reasoning. The process's own code is outside the three tests. Whether it has tests of its own is not stated. A wrong fix to the only push-and-merge route blocks every session, and Bob's click "cannot judge the code".

**How bad.** Stops a tranche at the first blocking process fault, and waits for Bob without telling him why.

**Answer.** Wording and a setting. Name ARCH as the session that declares a process fault and starts the fix session. Put on Bob's list one more approvals block, in the process repository. Build the wall as a GitHub rule on the process's main branch that only Bob can update, leaving the sessions' account able to push side branches and open pull requests; that is a setting, and it is the form in which "a session can still prepare a fix" is true. Say that the coordinator holds the product repository. State honestly whether the process's own code has tests. Rehearse one fix through the wall before the first tranche (a trial).

Sources: permissions_inventory 1a, 1c, 1e, Part 3; enforcement_levers levers 1, 2; roles_root_coordinator 1.2, 1.9.

---

### 11. A change across many modules has no moment to happen, and skipping its tests is an act the checker has refused once

**Counter-argument.** The fixed rule refills every slot at once and ARCH has no discretion to hold starts, so there is never a moment with no job open. A pass over many modules then collides with every open job. And a merge that skips the required tests is the kind of act the permission checker refused on 9 Nov.

**Attacks.**
- "A change that touches many modules in the same trivial way, needing no judgment, can be made in one pass. Some such changes are so trivial that module tests need not be rerun."
- "ARCH carries it out and has no discretion over it."
- "It writes only its own module's files" and "One writer per file."
- "*Decided:* ARCH, which reports it." (technical point 7)

**Evidence.**
- Measured (`merge.mjs` line 949). Process3's own rule for such a pass: "a pass runs while no job holds its modules".
- Measured (`permissions_inventory.md` 1d, 1e row 35). The checker refused an act that let a pull request through without its check: "`p3 revert exempt` ... Refused, `[CI Bypass]`" (9 Nov).
- Measured (definition J12). "The first never had a procedure."
- Reasoning. GitHub requires the test run to be green on every pull request into the tranche. For a pass that "need not be rerun", something a session controls must tell the run to report green without running. That is a switch on the required check, in session hands. Whether ARCH's merge of such a pull request passes the checker is unmeasured. No actor is named for making the pass.

**How bad.** Stops that change, or breaks open jobs' branches; could trip three refusals in a row for ARCH.

**Answer.** A structural choice. Such a pass is made only between the last merge of a round and its walk, when by definition no job is open. Say that its pull request still gets the ordinary required run on GitHub unless a trial (in J12's rehearsal) shows the checker passes the skipped form.

Sources: merge.mjs; permissions_inventory 1d, 1e; definition J12.

---

### 12. Technical point 8 is still partly Bob's, and section E describes the same repair differently

**Counter-argument.** The end of the size cap removes one of the two things that made the repair Bob's. The other is still open: whether a member's own sign-in through the runner still exists. And the repair is three different things, not all of them "in their own jobs".

**Attacks.**
- "*Decided:* correct the module list where the code already runs one way, and turn one registration between two modules around. Nothing a user sees changes."
- "That is a design error in those modules, fixed by refactoring them in their own jobs."

**Evidence.**
- Measured (`interface_and_cycle.md`, summary and 2d). "Three things need the owner. The requirement size cap that caused the split; whether a member's own Claude sign-in through the runner still exists; and, for hypotheses and steps, whether one refusal may change places with another."
- Checked today against the definition. (a) The cap: ended by section I item 3, so giving the three draft files back to agent-worker no longer meets a cap. That dependence is gone. What remains of it is the choice between one module with two requirement files and a module that owns requirements and no code (2d item 2), which finding 6 shows is not small. (b) The sign-in relay: still open. After the repair agent-worker's configuration still binds the runner, which would now sit after it, and its `/signin` route relays to four runner routes that answer 404 (2b, "One stale route"). The requirements file states both positions. Whether that feature exists is a product question. (c) The refusal order: the definition chose turning the registration around, which changes nothing a member sees, so that one no longer needs Bob.
- Measured (2c). Turning the registration around edits two modules' source, one line in a third (store-assembly) and four test files across three modules. Correcting the list edits `build/modules.json`, which no module owns, and a generated file owned by a fourth module (member-roster), whose match with its source the definition no longer checks (section H).
- Reasoning. Under the new start rule the three uses no longer block any start (they did only under the withdrawn waiting rule: "27 of the 65 can never start"), so this is not a first-hour stop. The 38 undeclared pairs are untouched by it.

**How bad.** Misleads Bob (one product question is silently left open, and section K says only one question is his); minor for running.

**Answer.** Wording. Point 8 should say: the list correction is ARCH's edit, not a job's; the registration change is three modules' jobs in sequence; the sign-in relay is put to Bob as a product question, or agent-worker's dependence on the runner is declared and accepted as a known later use. Align section E's sentence.

Sources: interface_and_cycle Part 2 (2b, 2c, 2d); no_layers_width section 2 and follow-up A.

---

### 13. "Nothing depends on archiving" meets a measured ceiling of about 50 live sessions

**Counter-argument.** A round of about 170 jobs leaves finished sessions behind. At about 50 live sessions the account stops starting new ones while still reporting success. If finished sessions count, slots look full and nothing is running.

**Attacks.**
- "Nothing needed for correctness depends on archiving a session or switching off an alarm, which the checker judges case by case."

**Evidence.**
- Measured (`permissions_inventory.md` 1c, 1e row 14; one event, 1 Nov). "At about 50 live sessions the account stops starting sessions while `create_session` still reports success."
- Measured (roles 1.3). Process3 relied on archiving in practice: "21 finished job sessions archived by ROOT's cap sweep".
- Measured (permissions_inventory 1e rows 5, 6). Archive passed 2 of 5 and 1 of 4 before the approvals; "15 of 15" after has no evidence file.
- Not measured: whether a finished, idle session counts toward the ceiling (`redteam_feasibility.md` finding 10 marks it unverified).

**How bad.** Silently stalls a round, found only by the hourly alarm, whose replacement starts fail the same silent way.

**Answer.** An honest statement and a trial. Either archiving finished jobs is needed, and the sentence is corrected to say so, or it is shown that idle sessions do not count. One measurement before the process is in force settles it. Missing from section J.

Sources: permissions_inventory 1c, 1d, 1e; roles_root_coordinator 1.3.

---

### 14. The walks as described were never run that way, and no one is named to turn a finding into a module's work

**Counter-argument.** Process3 ran the internal walk as one script started by the tool in one session. "Several sessions ... by journey" is new and absent from section J. The step that names a module for each finding has no actor.

**Attacks.**
- "several sessions walk the product as built, without deploying it."
- "**How many sessions walk, and how the walk is shared out.** *Decided:* by journey."
- "Each finding becomes work for a named module".
- "The internal walk finds what a full regression would. ... *Trial:* put back the one known break between two modules".

**Evidence.**
- Measured (`process3` README, `walk internal`, `walk round`; `deploy.mjs` line 446). One tool-started run of the product's own walker, default time limit 30 minutes; findings were entered by the architecture session with a command naming the module, "or ... when it names no module".
- Measured (DECISIONS PD-16). "Product walker changes needed for parallel walks go to BOB as a job": the walker's ability to be shared out was still work to do on 8 Nov.
- Measured (`foundations.md`, platform table). "the in-session background limit is about thirty minutes, so anything longer is CI". The two late external walks took 60 and 64 minutes (product_side 6).
- Measured (definition). On 8 Nov the internal walk passed every step while the external walk of the same build passed 20 of 175.
- Reasoning. One reinserted break can show the walk misses it. It cannot show the walk "finds what a full regression would"; no full regression was run in Process3 to compare with. The trial can break the claim and cannot support it, which the definition admits for item 8 but not for item 11. Where a walking session runs an hour-long walk against the 30-minute limit is not said; I did not establish where Process3 ran it.

**How bad.** Stalls the end of the first round; misleads Bob about what trial 11 can show.

**Answer.** Wording and a trial. Name ARCH as the one that assigns each finding to a module. Add "several sessions share one walk by journey" to section J with one rehearsal. Reword J11 to say the trial can only break the claim.

Sources: process3 README and deploy.mjs; DECISIONS PD-11, PD-16; foundations platform table.

---

### 15. Bob's suggested model and effort do not reach the jobs

**Counter-argument.** ROOT does not start jobs; ARCH does. Effort is not inherited.

**Attacks.**
- "**Model and effort for each session.** *Decided:* ROOT passes your suggestion to every session it starts."

**Evidence.**
- Platform text (tool definition of `create_session`, today): "Effort level for the new session; not inherited from this session"; model "Defaults to the calling session's model".
- Measured (`permissions_inventory.md` 1c). "Effort per role. Not set anywhere in the tool"; the start table's effort column "never built".

**How bad.** Misleads Bob: he suggests an effort and jobs run on the default.

**Answer.** Wording: every session passes the suggestion on to each session it starts. Unproven; one line in trial J2 (read the job's reported effort).

Sources: permissions_inventory 1c, "What was surprising" item 6.

---

### 16. Smaller gaps and contradictions in the text

Each is wording unless said otherwise.

| # | Gap | Sentences | Evidence | How bad |
| --- | --- | --- | --- | --- |
| a | Bob's answer on ROOT's repository is recorded two ways. 13 Nov: "You start a session with the process repository mounted." 14 Nov: "ROOT starts with the product repository". The definition uses the second and does not show Bob the first. | "You start it on the product's repository." | Measured: `assessment_doc.txt` lines 91 and 99 | Misleads Bob. Answer: show him both and ask which is his. |
| b | Design lanes are kept but are not in the list of roles: who starts them, whether they take a slot, whether Bob talks to them. | "Design lanes, with user experience always there." against section B's six roles and "Kept short." | Measured: roles 1.1 ("lanes ... started by BOB"); approvals lanes paragraph | Costs time |
| c | The required test run must report on pull requests that change no module: Bob's own approvals commits (PR 1115 was his, merged by him after the check), ARCH's edits to the module list, the tranche into main. | "*Trigger:* a job's pull request changes its module's files or tests." | Measured: product history, PR 1115. Platform text: a required check that never reports blocks for ever (redteam_feasibility finding 4, GitHub documentation) | Stops Bob's first commit if missed |
| d | Bob's commit to `CLAUDE.md` is an edit, a pull request, a wait for the test run and a merge click, not one act. | "Commit your standing approvals ... on GitHub's website" | Measured: PR 1115 | Misleads Bob slightly |
| e | Two retired hooks still run before every shell command of every session in the product. Only Bob can delete them. Not on his list. | "Wording changes only you can make." | Measured: product `.claude/settings.json`; permissions_inventory 1b | Minor |
| f | "Two failed corrections" then replacement: who counts, and where, is not said. | "After two failed corrections ARCH replaces the session" | Reasoning | Minor |
| g | The tranche report has no author. Cost "where it can be read" was often unreadable. | "A tranche report: time, work done, cost, overhead" | Measured: definition I4 | Minor |
| h | Keeping the test run in two parts keeps a second part whose Process3 purpose was to post the row the merge tool checked, which has ended. | "*Claude decided:* keep it." | Measured: `process-gate.yml` job `post` | Minor |
| i | Test one includes "a check that the uses the module declares match what its code imports". If "code" includes tests, 202 imports fail on day one and 81 of them become later-pointing uses. If not, the 38 pairs stay invisible. | Section D, test 1 | Measured: interface_and_cycle 1a | Stops jobs in up to 63 modules, or leaves the hole; say which |
| j | Bob's relayed words are "followed". Followed by ARCH only while its instructions name the current coordinator session (finding 3). | "It passes your words on exactly as written, with the date, and they are followed." | Measured: permissions_inventory rows 26, 27. Platform text: `send_message` | Costs Bob time |

---

## Section J: what is missing, and which trials cannot settle their claim

**Claims the definition relies on that are not listed as unproven.**

1. The tranche merges into main on the product (finding 8).
2. ARCH can be replaced mid-tranche without losing the open jobs (findings 3, 4).
3. Working state held in job pull requests, and a status read-out computed from them, works (finding 3). Never run; Process3 used the state branch.
4. A standby can replace ROOT within the three-level rule (finding 9). The record says it cannot.
5. Finished sessions do not use up the account's live-session ceiling (finding 13).
6. Several sessions can share one walk by journey (finding 14).
7. A fix can be prepared and merged behind the wall (finding 10).
8. Bob's model and effort reach every session (finding 15).
9. The number of jobs a round takes under "tell every declared user" (finding 5). J4 and J5 test whether notices miss anything, not what they cost.
10. A public release walked "on a copy installed with the real installer". I found no run of it in what I read; the definition does not list it.

**Trials that cannot settle their claim.**

- **J4.** "require that all 241 real effects are reached". The 241 were found only among modules Process3 notified, and Process3 notified every declared user (`notice.mjs`, `usersOf`). Any rule that tells every declared user reaches all 241 by construction. The trial cannot fail, so it proves nothing about misses. The misses are outside the record: the 38 undeclared pairs and the dependences with no import. Listing them does not measure them.
- **J6.** Two slots and three modules, no failing run, no replacement: too small to show the waking problem of finding 4.
- **J10.** Tests a claim for which the definition gives no mechanism (finding 2).
- **J11.** One reinserted break can break the claim and cannot support it (finding 14).
- **J2.** Does not include the case that matters on day one: a ROOT started by Bob straight after an approvals commit (finding 2).

---

## Things I probed and did not find broken

- **Concurrent test runs on GitHub.** Eight slots at two machine-jobs per run is 16, inside the 20 a free account allows (levers 3.2, GitHub documentation as recorded there). The account's plan is not stated anywhere I read. No stop found.
- **Pull requests by the sessions' account triggering the tests.** Same repository, collaborator with write: this ran all week in Process3.
- **A dead job session.** Replacement on the same branch and pull request was built and used in Process3 (`job start --restart`). The definition says enough for this one.
- **The hourly alarm waking ROOT itself.** Measured eight of eight, and today's tool definition of `create_trigger` says the default "fires into THIS SESSION, resuming the same conversation each time". J7 is right to re-measure; I found nothing against it.
- **GitHub suspending the account again.** The likeliest cause recorded, 1,387 pushes to the state branch in 19 hours, goes away with the state branch. The cause was never established (review.txt), so this is hope, not proof. The definition's handling (one message to Bob) is enough.
