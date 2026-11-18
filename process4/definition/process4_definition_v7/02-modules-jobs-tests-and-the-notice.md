# Part 2. Modules, jobs, module tests, and the notice

Length: 108 lines. Last section: "9. Changes that are not a job's".

## 1. Modules and their order

- The product is one ordered list of modules. A module may use only modules before it. A use of a later module is a design error, corrected by reshaping the code without changing what it does.
- Every code file has exactly one owner module. ARCH edits the module list until this is so.
- **Claude decided:** every file in the product's repository belongs to exactly one of these: a module; a lane's folder; or the process's own named files (the standing approvals, the forbidden commands, the process config, the module list, the product's two decision records and its ranking page). A file that fits none is given to a module by ARCH before any job touches it.
- A module that holds requirements and no code is a list error. **Claude decided:** ARCH decides which module's code meets each such requirement, and the move is made as a mechanical edit.

## 2. Requirements

- Each module has one requirements file. Each requirement has a permanent number and is marked met or not yet met.
- ARCH writes and rewords the requirement text, and touches no code and no tests, other than by the mechanical edit (section 9). The module's job marks a requirement met in its own pull request.
- A rewording that changes what the product does comes to the owner first. One that only says the same thing more clearly is made, and told to him in the account after the round.
- A requirements file is kept under the single-text maximum (part 5) as a rule ARCH applies. When a file nears it, ARCH splits the module into two real modules. Nothing refuses a job or a merge for size.

## 3. The life of one module's job

1. **The module has work.** A requirement in its file is marked not yet met, or a walk flaw, a notice, or a flaw reported by another module's job has been placed against it.
2. **Its job is ready:** the module has work and no job already open. It does not wait for the modules it uses.
3. **It takes a slot.** Ready jobs take free slots, earliest in the module order first. Only the owner's marked instruction puts a module ahead. The tool decides who takes a free slot.
4. **The job session is started,** with instructions naming every act the job may take.
5. **The job works** in a draft pull request, writing only its own module's files, its tests among them. A flaw it finds in another module goes to ARCH, which places it against that module.
6. **The job completes.** It pushes and marks the pull request ready. Its module's tests run on GitHub's machines. The job fixes its own failures and sends ARCH one message when the tests pass.
7. **ARCH merges it** into the tranche branch with the tool, the only way a session can merge. There is no review and no act of the owner's.
8. **The slot is refilled** in the same turn, and the notice is sent if the module's interface listing changed (section 7).

- A job decides how to meet its module's requirements and writes that module's tests. In the owner's words: "Yes, a job writes its own tests. That's an important responsibility."
- A job writes only its own module's files. In the owner's words: "A job for module A isn't allowed to change module B. The only other way of editing a module is when a mechanical edit (like a word table change) makes the change." This is held by the job's instructions and by no check.
- A job never merges, starts a session, deploys or changes the process.
- A job stopped by another module's flaw reports the flaw to ARCH, records that it is blocked, pushes and stops. Its slot is freed. When the other module merges, the job is made ready again.
- **Claude decided:** a job's module tests run on its pull request as GitHub would merge it into the tranche branch at that moment. A later merge by another module does not run them again. A break caused that way is found by that module's next job or by a walk.

## 4. When a module's work is finished, and when a round's jobs are done

The tool decides both, because each has one right answer. **Claude decided** the rules:

- A module's work is finished when its job's pull request has merged.
- A module whose only work was a notice is also finished when its job records in its own pull request that nothing needs changing, and closes it unmerged.
- A module with a walk flaw against it is finished only by a merge. If its job finds that nothing in the module needs changing, the flaw goes back to ARCH, which places it against another module or, where the walks' document is wrong, gives it to the UX lane.
- A round's jobs are done when every module that had work when the round opened, or was given work during it, is finished, or is recorded blocked on a matter that no open job of the round can clear. A blocked module's work carries into the next round and is named in the account after the round.

## 5. Slots

- Eight by default, counted across the account. The owner can change the number by a marked instruction.
- The standing roles and workers use no slot. **Claude decided:** lane sessions use none either, and walking sessions use the slots, since a walk is made when no job is open.
- **Claude decided:** when two products run at once, each product's process config names its share of the slots, and the shares add up to the account's number. The default is an equal split. The owner changes a share by a marked instruction. A product does not borrow another's unused share, because no record is shared between two products. **Unproven:** two products have never run at once.

## 6. Module tests

- The tests of Process4 are module tests, the internal walk and the external walk. Before a release, an install and an update are each confirmed to have succeeded. Nothing more: no further test phases, gates or reviews, and no full regression, on request or otherwise. Every other check the process before this one had that could stop work has ended.
- A test runs only when there is a fully informed reason to run it.
- Module tests run for the job's own module only, on GitHub's machines, when the job marks its pull request ready. A failure goes back to the job.
- They give appropriate coverage of the code, demonstrate correct results, show that error conditions are properly identified and communicated, and check bounds. A test does not fail because it got a different but still valid response. They "must be complete yet fast and efficient". This is a duty of the job, held by its instructions; nothing measures it.
- The structured comments and the tool can also inform module tests, so that boundaries are properly checked.
- Every requirement is tested at the module's interface.
- Module tests include, in the words of the record of 13 Nov, "a check that the module's declared uses match its imports". The check reads the module's test files as well as its source: "I think it has to check tests too".
- The owner approved two refusals, and **Claude decided** that no other is taken. Inside a module's own tests the tool may refuse a structured comment that disagrees with the module's code, and may refuse the module's code where it disagrees with a provider's stated interface. These are parts of module tests, not further tests. Only these two refusals stand; no other is built into module tests.
- **Claude decided:** a module's tests and a walk's steps are product work. Each exists only to prove a product requirement, which it names. A test or step that serves the process is not allowed. This is a rule in text.
- Module tests run in two parts, so that product code under test holds no access token.
- Built files are never committed. They are built at each walk, deployment and release.

## 7. The notice to user modules

- It is a notice, not a test. Its purpose is to save work: users are told when a provider's interface changes, and not when only its insides change.
- It is a way of saving work, not a guarantee. It will sometimes tell a user that needed no change and sometimes miss one that did. A missed user is caught by that user's own module tests the next time its job runs, or by a walk. No test of users runs before a provider's change merges.
- **What counts as a change.** In the owner's words: "any change to either a provider's domain or range necessitates that its users be retested. But if both domain and range stay the same, then no retesting of users is needed." For what a provider accepts, users are told only when the new interface cannot stand in for the old: something removed, renamed, newly required or newly refused. Accepting more tells no one. For what a provider hands back, any change to an entry tells that entry's users.
- **How it is found.** The tool writes out the module's interface, from its code and its structured comments together, before and after the job's change. The notice is sent only when the two listings differ. A comment edited with no change to the listing sends nothing.
- **Who is told.** In the owner's words, "ideally only the users of the entry that changed". The tool sends the notice and decides to whom.
- **A module whose job is already open. Claude decided:** the notice waits in the waiting-work record until that job's pull request merges or closes. The module then has work again, and its next job is the told job. Nothing is passed to the open job.
- **A module with no comments yet.** The first thing its job does is add the structured comments, as a step of their own, describing the module as it stands. That step sends no notice.
- **What a told job does.** It checks only the changed parts and runs only the tests that relate to them.
- **Which tests relate. Claude decided:** the tool picks them, not the job. The notice carries the places in the told module's files that name the changed entry. The related tests are the module's test files that hold such a place, or reach code that holds one, or reach code the told job itself changed, together with any test file the job changed. They are chosen by whole test file.
- **The run on GitHub. Claude decided:** there is one required run with one name. The tool, at the tranche branch's version, sets its scope: nothing, the related tests, or the whole module. It works the list out itself, so the job supplies nothing. An ordinary job runs the whole module; a told job runs the related tests.
- A told job that finds nothing to change records that in its pull request and closes it unmerged. No test runs, because nothing changed.
- **Reading:** three points here bear on what the owner's rule means, and are his to confirm (part 10): that a told job's own edits count among "the changed parts"; that tests are chosen by whole file; and that where the tool cannot follow a told module's code, that module's whole tests run, since the tool cannot say which relate.
- **Unproven:** that the tool can follow from a use to the tests that reach it inside a module, and can tell when it has lost the thread. The method was proven only between modules. The saving is unmeasured. The grounds are in `process4/working/design_work_18nov/notified_job_tests.md`.
- **When the module list changes. Claude decided:** a change to the list sends no notice of itself. Where it moves code between modules or splits a module, the tool makes the interface listings of the modules touched before and after, and the users of any entry whose listing differs are told as for any other change. Where only a provider's name changes for its users, their code is changed by a mechanical edit.
- **A declared use that no code makes. Claude decided:** it receives no notice, because the tool works out uses from code (decision 1 below). The check of declared uses in the module's own tests finds it at the module's next job, which removes the declaration.

**Claude decided,** for the tool that finds the change:

1. Which parts of a provider a user uses is worked out by the tool from the user's code and comments. No list is kept by hand.
2. A user the tool cannot follow fully counts as using everything of that provider.
3. A bound that a kind of value cannot express is written on its own marked line in the comment. A change to those words is a change to the interface. In the owner's words: "If those words are changing, then there must be a reason why. It must be that that interface is changing, right?"
4. Code that checks or builds what crosses a module's interface says, in a comment, which kind it checks or builds.
5. Calls made by name are made followable: each provider publishes one table of its operations, the tables are gathered into one list, and each shared piece that carries a call by name has one comment tying the name to that list.
6. Both listings of a comparison are made at the same moment with the same version of the tool.
7. "Accepts more" counts only when the language's own type checker confirms it.

**Claude decided:** which language reader the tool uses is a fact of the product, named in its process config.

## 8. Who decides an interface, and changes that must land together

**Claude decided:**

- ARCH decides the interface between two modules. A provider's job may propose a change; where users are affected ARCH decides it before it is built.
- There is no merge of several modules together other than the mechanical edit. Where modules must change together, ARCH orders the work so that each merge passes on its own: the provider first accepts the new form beside the old, the users move, and the provider then drops the old form.
- Where that cannot be done, the boundary between those modules is an architecture bug. ARCH corrects the module list or the interface, and does not work round it.

## 9. Changes that are not a job's

- **The mechanical edit.** **Claude decided:** a worker in ARCH's session makes it as one change covering every affected module, and it is merged once; and the moment: when no job is open, between a round's last merge and its internal walk. A module where the change needs judgment gets its own job. **Unproven:** which test run GitHub requires on that one change.
- **A lane's folder.** A change that touches only files in a lane's own folder needs no module tests. Design documents do not need testing. **Reading:** the owner has not confirmed this.
- **Requirement text, the module list, and the process's named files.** **Claude decided:** these change no code and no tests, so their pull requests merge through the tool with no module tests run. The required test run reports on every pull request. It passes at once when no module's code or tests changed, and on the tranche's own pull request into the main branch, where none of the tests runs (part 3, section 5).
- **The owner's approvals and forbidden commands** are committed by the owner alone (part 6).
