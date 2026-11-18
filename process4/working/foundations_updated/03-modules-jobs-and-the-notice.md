Length: 108 lines. Last section: "9. Never measured, and not found".

# Background, part 3: modules, jobs and the notice

This part gives the reasons and the evidence behind design part 2, sections 1 to 5 and 7 to 9. It states no rule.

## 1. One ordered list of modules

The order comes from the session's record of 13 Nov, as the fourth draft quotes it (`definition/process4_definition_v4.md`, line 52; a session's record, not the owner's typed words): "A product is a total order of modules. A module's services can be used only by modules that follow it. Each module is updated and tested by a single job, and earlier modules' jobs run before later ones."

Two things in that record were later changed.

- "earlier modules' jobs run before later ones" gave way, in the same record (line 57), to "A job does not wait for the modules it uses to finish. A module's job is ready when the module has work and no open job, and ready jobs take free slots earliest in the order first."
- Process3 grouped modules into layers that opened and closed together. The record of 13 Nov (line 56): "The layer construct is dropped."

**Which files have an owner.** The earlier form of this background said every file has one owner module. The design says that of code files, and marks as "Claude decided" that every file in the repository belongs to a module, a lane's folder, or the process's own named files (design part 2, section 1). So some files have no owner module. The earlier sentence is corrected.

## 2. Requirements files, and why nothing is refused for size

The design keeps a module's requirements file under the single-text maximum as a rule ARCH applies, and has nothing refuse a job or a merge for size (design part 2, section 2). Process3 and the process before it tried refusal, and it failed both times (`working/process3_limits_18nov.md`, section 3):

- Before Process3, a cap set at 4 percent of the context window "refused 127 of 127 modules".
- Process3 ruled 70,000 bytes, from a count of how large the files were and not from any test of reading. As a refusal it was overridden 32 times out of 32. It cost 30 split files and 64 commits, and "Total requirement bytes did not change".

One consequence is not measured. Process3's median requirements file was 32,829 bytes on 3 Nov. The design's provisional maximum for a single text is 24,000 bytes (design part 5, section 2). The worker who gathered these figures judged that more than half of such files would be over it (the same file, section 8). Nobody has counted how many of a real product's files are.

The earlier form of this background spoke of a requirements file's "public part" and "private part". Those words belong to the older Foundations. The design has neither, and they are withdrawn.

## 3. Jobs and slots

What the owner said, and where:

- That a job is one module's work and may not touch another: "A job for module A isn't allowed to change module B." (`owner_words/bob_words_14nov_c.md`).
- That this needs no physical enforcement for ordinary work: "Jobs are only supposed to modify their module and tests - but as far as I could tell, they are well behaved under CC. They never tried to modify another module. I see role-specific permission enforcement as important and useful, but not essential." (`owner_words/bob_words_16_17nov_codex_development.md`; "CC" is his short form for Claude Code). This is his observation. No count of jobs that strayed in Process3 was found.
- That slots are counted across the account. The fourth draft proposed eight slots for each product; he answered "across the account" (`owner_words/bob_words_14nov_c.md`). The default of eight is from the session's record of 13 Nov (fourth draft, line 58): "Job slots default to eight, and you can change the number."
- That who takes a free slot is settled by rule: he answered "agreed" to the fourth draft's sixth proposal, headed "Who takes a free slot".

How he changes the number. The earlier form of this background said he tells the coordinator. The design says he changes it by a marked instruction (design part 2, section 5); what a marked instruction is, is in part 7 of this background.

Why a slot is refilled in the same turn: the 194 minutes of part 1, section 4.

What Process3 measured about running many sessions: at about 50 live sessions the account stopped starting new ones while the starting call still reported success (measured 1 Nov, one event; `evidence/foundations.md`, line 179). Process3 then kept at most 24 live. How many the account bears now is listed as not proven (design part 7, section 3).

Several points about a job's life were open or shorter in the earlier form of this background. They are now in the design, each marked "Claude decided": where a flaw found in another module goes and how the blocked job comes back (design part 2, section 3); when a module's work is finished and when a round's jobs are done (section 4); which copy of the code a job's tests run against (section 3). One recorded fact bears on the last: in Process3 the one required test run was made on GitHub's merge of the pull request into its base, judged by the base branch's version of the tool (`working/design_work_18nov/notified_job_tests.md`, section 2).

## 4. Two products at once

The design marks as "Claude decided" that each product's process config names its share of the slots, and that a product does not borrow another's unused share "because no record is shared between two products" (design part 2, section 5). That one clause is the whole of the grounds this writer found. No working file sets out alternatives. The design state lists the matter only as settled by Claude on 18 Nov (`working/design_state_18nov.md`, section 15). The design marks it unproven: two products have never run at once.

## 5. The notice to user modules: how it came about

**The old method and its cost.** In Process3 every user of a changed module was told. On that record 2,707 notifications were sent, and AI workers judged about 74 of them needed (`working/notice_study/proof_outcome.md`, assessment, point 4; a judgment, not a count).

**The owner's reaction,** 14 Nov (`owner_words/bob_words_14nov_c.md`): "If every user is told when the implementation of a module changes but the interface doesn't, then every change will continue to cause every user of that module to be rebuilt and tested. That's very (very!) inefficient and unnecessary. There must be a practical means of identifying when a change doesn't require user modules to be updated." He proposed a separate session for the one question, and opened it that day.

**What he ruled in that session** (`owner_words/bob_words_14nov_notice_session.md`; the message numbers are that file's):

- What counts (message 3): "The interface to a provider is it's domain. The bounds of valid values passed to and received from a provider are it's range. So what I'm saying is that any change to either a provider's domain or range necessitates that its users be retested. But if both domain and range stay the same, then no retesting of users is needed."
- Where the interface is stated (message 4): "even in loosely typed languages the formal interface can be augmented with structured comments that the language runtime doesn't see but that clarifies how the interface is to be used, and used by our build tools to determine whether the domain or range has changed".
- Which event sends the notice (message 8). The session offered "A. A job edited a comment" or "B. The listing after the change differs from the listing before". He answered: "which event sends the notice: B".
- Who is told (message 9): "ideally only the users of the entry that changed. But in order to do so, a user module must state which parts of a provider it uses. Is that a reasonable thing to support?"
- A module with no comments yet (message 9): "The first time a job for a module without comments starts the first thing it does is add the structured comments." And (message 10): "Agreed: The comments go in as a step of their own, before the job changes anything else, and they describe the module as it stands."
- Accepting more, handing back something new (message 11): the session recommended telling users of what a provider accepts only when the new interface cannot stand in for the old, and telling users of what it hands back on any change. He answered: "I agree with your recommendation".

**What he handed to the AI.** Asked whether the tool may work out a user's uses from its code, with no list kept by hand, he answered (message 10): "Why is this mine? - may a user’s use of a provider be worked out by the tool from the user’s code and comments, with no separate list kept by hand? You tell me." That is why the seven numbered points on how the tool finds a change are marked "Claude decided" in the design (design part 2, section 7).

One of the seven was unmarked in the earlier form of this background: that a change to the words stating a bound is a change to the interface. The design holds it as Claude's decision, with the owner's words quoted in support (message 9): "If those words are changing, then there must be a reason why. It must be that that interface is changing, right?" His words end in a question; they are not a ruling.

**"Only the users of the entry that changed."** The earlier form of this background stated this flatly. His word is "ideally". Under the design the tool decides who is told, and a user the tool cannot follow fully counts as using everything of that provider, so users of other entries can be told (design part 2, section 7).

## 6. What was tried, and what it showed

**The reader.** In the study, what wrote out a module's interface was TypeScript's reader, version 5.6.3, reading plain JavaScript with its structured comments. On the product's record it read all 1,181 source files of 190 modules and failed on none (measured). Replaying one real change, it pointed at 5 of 11 broken user modules and at none of 18 unbroken ones. These figures are as `working/design_work_18nov/notified_job_tests.md`, section 2, gives them from `working/notice_study/result.md`, which this writer did not read. The session told the owner the largest reason for the misses was operations called by name; he asked (message 13): "How do we make the calls by name made followable?" The fifth of Claude's seven decisions answers that. The earlier form of this background called what writes the listing "a build tool"; in the design it is a job of the process's one tool (design part 6, section 5).

**The proof,** 15 Nov (`working/notice_study/proof_outcome.md`). A proof session built the tool and a made-up product of eleven modules, and ran 150 changes: 29 planned, 12 attacks of its own, and 109 written blind by fresh helpers attacking the newest design. It built seven designs of the rules. What the study session checked against the proof's stored data:

- On the seventh design, all 133 changes written before that design were told exactly as the rules say.
- The blind rounds went on finding holes: 5, 8, 15, 6, 7, 10 and 8 for designs one to seven, 59 in 109 blind changes, with no downward trend.
- Over all 150 changes the seventh design sent 182 notices, 111 of them for nothing. Telling every declaring module would have sent 474, 376 for nothing. That is the "2.6 times fewer".
- 28 users that needed a change went untold. The proof session said all 40 untold users that needed a change or broke had a failing test; the study session's recount found 50, could not reconcile the two definitions, and found that in all 50 the user's own tests failed.

The proof's own report is in another repository and was not read for this background.

**The owner stopped it** (message 16): "Stop, write it up. It's usable, even if there's an occasional extra unnecessary notice sent out. It's 2 orders of magnitude better than the old method." The study session noted that his two orders of magnitude are still not measured: "The proof's mix of changes was chosen to attack the tool, so its 2.6 times fewer notices is no guide."

**His conclusion,** 15 Nov (`owner_words/bob_words_15nov_main.md`): "After much research it seems pretty clear that there is no means to reliably tell the difference when there's a change in a module between when that change changed the interface or changed something other than the interface." The main session then set out three choices: tell every user on every change; use the study's method as a filter, accepting that it sometimes tells too many and sometimes misses one, which a later test or walk then catches; or tell nobody. He answered: "Okay, I'll follow your recommendation: 2". That is why the design calls the notice a way of saving work and not a guarantee.

## 7. How a told job's tests are picked

The rule, as the session's record of 13 Nov has it (fourth draft, line 59; not the owner's typed words): a user module's job "checks the implications of those parts and no others, and updates and runs only the tests that relate to them". How the related tests are picked was owed when the earlier form of this background was written. The design now states it, marked "Claude decided" (design part 2, section 7). The grounds are in `working/design_work_18nov/notified_job_tests.md`:

- **A fact from Process3's record.** Of 215 answers to a notice that mattered, 138 changed a source file of the user, 74 changed only tests and 3 only records (old notices, judged by one reader). So most told jobs that open a pull request will have changed their own module's code. That is why the design counts a told job's own edits among "the changed parts", which it marks as a reading for the owner to confirm.
- **Choices set aside.** The job picking its own tests (the scope of the run would be in the hands of the session it judges). The whole module's tests on every told job (the ruling does not allow it). Each test marked by hand (a hand-kept list, which would drift). Following by file only (with source files of about two thousand lines it would choose nearly every test). A separate required run for notices (GitHub's rule names one run, and the settings are the owner's).
- **What is not proven.** The reader was shown to follow between modules. Nothing read shows it following inside one module from a use to the tests that reach it, or saying when it has lost the thread. No count was made of how many of a real module's test files reach a given use, so the saving is unmeasured.

Two smaller matters were also open before: what happens when the module list itself changes, and a declared use that no code makes. Both are now in design part 2, section 7, marked "Claude decided". The design state lists them as settled by Claude on 18 Nov (`working/design_state_18nov.md`, section 15). No working file with their grounds was found. The 510 notifications of part 2, section 4, of this background show that declared uses with no import behind them were common in Process3.

## 8. Who decides an interface, and changes that must land together

Design part 2, section 8, is marked "Claude decided" throughout. This writer found no working file that sets out its grounds or alternatives. What Process3's record adds is only that its answer, layers that merged together, was dropped on 13 Nov (section 1).

## 9. Never measured, and not found

- How many notices the method saves on a real product. The study session's proposed measurement, adding comments to a cluster of real, heavily used modules and replaying their recorded changes, was not run (`working/notice_study/proof_outcome.md`).
- The notice as part of a running process.
- What adding structured comments to every module costs. The owner foresaw the difficulty (message 6): "adding comments that describe the range of an interface requires a level of understanding that isn't readily apparent without careful and rigorous analysis."
- The grounds for the rule on two products, beyond the design's own clause.
- The forms used when the method was proven. The design says they are in a repository this work could not open (design part 10, section 2, item 6).
