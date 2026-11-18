Length: 118 lines. Last section: "8. Files read".

# How a notified job picks its tests, and how the run on GitHub is held to them

Written by Claude (a design worker) on 18 Nov 2026. **Status: proposed. Nothing here is built and nothing here has run.** It answers the open line in part 2, section 7 of the seventh draft, and open design item 1 of part 10.

Marks as in the design: **Claude decided**, **Reading**, **Unproven**. Words: a *notified job* is the job of a module whose only work is a notice. A *use* is a place in the user module's own files that names a changed entry of the provider. A test file *reaches* a piece of code when following its imports and calls leads to that code.

## 1. What is fixed and not reopened

- The owner's ruling: "A notified job checks only the changed parts and runs only the tests that relate to them."
- Testing is closed. This proposal adds no test, check, gate, review or stop. It changes only which of a module's existing test files one existing run runs.
- GitHub lets a change into the tranche branch only by pull request with one named required test run passing (part 6, section 3). That run must report on every pull request (part 2, section 9).

## 2. Facts found

**The tool and the product's language.**

- The tool that writes the interface listing is TypeScript's reader, reading plain JavaScript with its structured comments; version 5.6.3 was used (`notice_study/result.md`). On the product's record it read all 1,181 source files of 190 modules and failed on none (measured).
- The method was proven on eleven made-up modules and 150 changes (`notice_study/proof_outcome.md`). The proof's own report is in another repository this session could not open. It is **unread** here; everything said of it below is as the study session reported it.
- The reader's complaints name a file and a line in the user's source and in its tests. Replaying one real change, it gave lines in five user modules, two of them in test files (`data/users_after_change.json`; measured, one change). It pointed at 5 of 11 broken users and at none of 18 unbroken ones.
- "The tool can say whether it follows a user fully" is listed as untested in the study's result. Whether the proof built it: unread.

**How module tests were laid out and run in the process before this one.**

- One workflow with one job gave the one required run, on every pull request, on GitHub's merge of the pull request into its base (`shims/process-gate.yml`). The tool that judged was the base branch's version, not the pull request's.
- Each module's entry named its test folders and its test command. A module's tests were that command run over a list of test files; the function that ran them already took a list of files, the default being all of them (`tool/lib/suite.mjs`). The default runner was Node's own, which takes test files as arguments.
- That run already chose its scope by rule: nothing when only records changed, the job's own module otherwise (`tool/lib/gate.mjs`).
- The product keeps a module's source under one folder and its tests under another, one folder per module. Some modules' source is one file of about two thousand lines (file names and line numbers in the replay data).

**What told jobs did, on that record** (`notice_study/study.md`; old notices, judged by one reader). Of 215 answers to a notice that mattered, 138 changed a source file of the user, 74 changed only tests, 3 only records. So most notified jobs that open a pull request at all will have changed their own module's code.

## 3. The design in one paragraph

The tool already finds, to decide whom to tell, where the user's files use each changed entry. It writes those places into the notice. The related tests are the user's test files that reach one of those places, or reach something the job itself then changed, plus any test file the job changed. The one required run on GitHub works out that list for itself, from the notice and the pull request, runs only those files with the module's ordinary test command, and passes when they pass. The job supplies nothing to the run and cannot widen or narrow it.

## 4. Decisions

**Decision 1. The notice carries the uses.** **Claude decided.**

- When the tool sends a notice it writes, for each changed entry, the files and lines in the user's source and tests that use it. It writes this into the notified job's own pull request when it opens the draft, since what belongs to one job stays in that job's pull request (part 4, section 4).
- Gives: "the changed parts" is a list the job can read, not a judgment. Costs: nothing new to work out; the tool needed the same facts to decide whom to tell (part 2, section 7, decision 1).
- A second notice to a job already open adds its uses to the same list.

**Decision 2. Related means reached, and the tool does the following.** **Claude decided.**

- A test file is related when (a) it holds a use itself; or (b) following its imports and calls leads to the function that holds a use; or (c) the same leads to a function the job changed in this pull request; or (d) the job added or changed that test file.
- The tool follows with the same reader that writes the listing. No list of "which test covers what" is kept by hand, as with decision 1 of part 2.
- Tests are chosen by file, not by single test inside a file. Gives: the module's ordinary command over fewer files, which the runner already does. Costs: a file with one related test runs whole.

**Decision 3. What the tool cannot follow counts as reached, one step wider each time.** **Claude decided,** applying part 2's decision 2 inward.

- Where the tool cannot follow a call to a function (it is passed as a value, kept in a table, or called by a name with no comment tying it), every test file that imports that function's file counts as reaching it.
- Where the tool cannot follow a test file's imports, that test file is related.
- A user the tool could not follow fully at the notice counts as using everything. Every test of that module is then related, and the whole module's tests run.
- Gives: the list errs toward running a test, never toward leaving one out for want of following. Costs: where a module is one large file, or its tests all go in through one front file and the tool loses the thread, the list is the whole module and the saving is nothing. How often that happens is **unmeasured**.

**Decision 4. The one required run chooses among three scopes.** **Claude decided.**

- The required run stays one run with one name. On each pull request the tool, at the tranche branch's version, picks: *none*, when no module's code or tests changed (already in part 2, section 9); *related*, when the pull request is a notified job's; *whole module*, for every other job.
- For *related* it reads the uses from the pull request, works out the list on GitHub's merge of the pull request into the tranche branch, runs the module's test command over those files, and reports pass or fail under the same name. Its summary lists the files run and the files left out.
- If the list is empty, the run passes at once and its summary says that no test reaches the changed parts. Nothing fails for an empty list; a refusal there would be a new stop.
- Gives: GitHub's rule is met with no second run and no change to the owner's settings. The scope is decided by the tool on the tranche branch, so a job cannot trim its own run. Costs: the choice of scope is a rule in the tool; as part 6 says, the tool guards against mistakes, not against a session set on defeating it.
- The two refusals the owner approved (a comment against its code; code against a provider's stated interface) are parts of module tests. **Claude decided:** on a *related* run they are made on the files in the list and on the files holding the uses, and nowhere else.

**Decision 5. A notified job that changes its own code stays a notified job.** **Reading**, for the owner (section 6, item 1).

- Its own edits, made in answer to the notice, count among "the changed parts". Rule (c) of decision 2 brings in the tests that reach them. It does not become an ordinary job and the whole module's tests do not run.
- Grounds: a notified job opens a pull request only when it changed something, and on the record about two in three such answers changed source. If any edit of its own code made the job ordinary, the ruling would almost never apply to a run on GitHub.
- Costs: a fault the job's edit causes in a part of the module that the tool does not see as reached is not run. It is caught as part 2 already says a miss is caught: by the module's next ordinary job, or by a walk.
- A module that has other work as well (a requirement not yet met, a walk flaw) has an ordinary job. The notice is one more thing that job reads, and the whole module's tests run.

**Decision 6. When nothing needs changing.** **Claude decided.**

- The job reads each use named in the notice against the provider's new listing. It asks the tool for the related list and runs those test files in its own session.
- If they pass and its reading finds nothing to change, it records through the tool that nothing needs changing. The module is finished (part 2, section 4). No pull request is offered and nothing runs on GitHub.
- If a related test fails, or its reading finds a fault, it makes the change and offers the pull request; decisions 4 and 5 then apply.
- The tool's own silence is not enough to stop reading: on the one replay it was silent on 6 of 11 broken users.
- Gives: no run on GitHub for a notice that needed nothing, which is the saving the notice exists for. Costs: "nothing needs changing" rests on the job's own reading and its own run, with no second look. That is already so for every job (part 10, section 6).

## 5. Choices set aside

- **The job picks its own related tests and tells the run.** The simplest to build. Set aside: the scope of the required run would be in the hands of the session it judges.
- **The whole module's tests on every notified job's pull request.** Needs nothing new. Set aside: the ruling does not allow it.
- **Each test marked by hand with the entries it relates to.** Set aside: a list kept by hand, which part 2's decision 1 refused, and it would drift.
- **Following by file only** (a test file is related when its imports reach the file holding a use). Simpler and surer than following calls. Set aside as the first choice, kept as the fallback in decision 3: with source files of two thousand lines it would choose nearly every test.
- **A separate required run for each module or for notices.** Set aside: GitHub's rule names one run, and the settings are the owner's.

## 6. For the owner, because each changes what his ruling means

1. **The job's own edits count among "the changed parts"** (decision 5). His words speak of the provider's changed parts. This reading stretches them to what the job changed in answer. The other answers are: the edit goes untested on GitHub, or the whole module runs.
2. **A user the tool cannot follow runs its whole module's tests** (decision 3). The seventh draft said of this that the ruling "does not allow for" it. The reading here is that for such a user everything relates. The other answer is to run nothing for that user, which leaves its change untested.
3. **Related tests are chosen by file.** A file runs whole though one test in it relates. This is a small widening of "only the tests that relate".

Not for the owner, for ARCH: whether a module the tool keeps failing to follow is given work to make it followable. Decision 5 of part 2 already asks that calls by name be made followable.

## 7. Proven and not proven

**Proven, in the process before this one or in the study:**

- One required run on every pull request, choosing its scope by rule, judged by the base branch's tool (it ran there on every pull request).
- A module's test command run over a chosen list of files (the code exists; whether it was ever used with a shorter list on GitHub is unread).
- The reader naming the user's files and lines against a changed interface, in source and in tests (one real change; made-up modules in the proof, as reported).

**Unproven:**

- All of this as a process. The tool is not built.
- The reader following from a use to the test files that reach it, inside a module, at the level of functions. The proof was about following between modules. Nothing read shows following inside one.
- That the tool can say when it has lost the thread, which decision 3 depends on. Listed as untested in the study.
- How much is saved. No count was made of how many of a real module's test files reach a given use. The product's code was not on this machine. One count on a few real modules (for each recorded notice: files chosen against files in the module) would measure it, and needs no session started.
- That a job's session can run the product's tests itself, on both harnesses, for decision 6.
- Where the tool finds the notice's uses on the pull request, and that a job cannot alter them there.

**For the trial.** The made-up modules should include: a user whose tests divide cleanly; a user whose tests all enter through one file; a user the tool cannot follow; a notified job that changes its code; one that changes nothing; and a notified job whose related list is empty.

## 8. Files read

In full: seventh draft parts 0, 2 and 10; `process4/definition/process4_notice.md`; `process4/working/notice_study/result.md` and `proof_outcome.md`; `process4/working/design_state_18nov.md` sections 0 to 13; `shims/process-gate.yml`; `tool/lib/suite.mjs`. In part: seventh draft parts 4 and 6; `tool/lib/gate.mjs` (first 120 lines); `notice_study/study.md` (searched); `data/users_after_change.json`; `.github/workflows/ci.yml`. Unread: the proof's own report and data (`notice-proof/` in the probes repository), and the product's code.
