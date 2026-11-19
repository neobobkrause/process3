Length: 273 lines. Last section: "78. The program that reads the product's code is a setting".

## Part 2. Modules, jobs, module tests, and the notice (continued)

### 49. A freed slot is refilled at once
- **Where:** Part 2, section 3, step 8.
- **The design says:** "**The slot is refilled** in the same turn (**from a session's record:** the record of 13 Nov, line 9), and the notice is sent if the module's interface listing changed (section 7)."
- **In practice:** As soon as one building session finishes, the next waiting one starts.
- **Where it came from:** A session's record: the 13-14 Nov record, line 9. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 50. "A job writes only its own module" is held by instructions only
- **Where:** Part 2, section 3, the point after step 8 on a job's own files.
- **The design says:** "**Claude decided:** this is held by the job's instructions and by no check."
- **In practice:** Nothing physically stops a building session touching another part; it is simply told not to.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "I see role-specific permission enforcement as important and useful, but not essential." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 51. What a job never does
- **Where:** Part 2, section 3, points after step 8.
- **The design says:** "**Claude decided:** a job never merges, starts a session, deploys or changes the process."
- **In practice:** A building session only builds; merging, starting others, putting the product on the development site and process changes are for other roles.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 52. A job blocked by another module's flaw
- **Where:** Part 2, section 3, points after step 8.
- **The design says:** "**Claude decided:** a job stopped by another module's flaw reports the flaw to ARCH, records that it is blocked, pushes and stops. Its slot is freed. When the other module merges, the job is made ready again."
- **In practice:** A session held up by a fault in another part says so, saves, and steps aside until that part is fixed.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 53. A later merge does not re-run a module's tests
- **Where:** Part 2, section 3, last point.
- **The design says:** "**Claude decided:** a job's module tests run on its pull request as GitHub would merge it into the tranche branch at that moment. A later merge by another module does not run them again. A break caused that way is found by that module's next job or by a walk."
- **In practice:** A part's tests are run once, when its own work is done; if another part's later change breaks it, that is found later.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 54. When a module's work is finished, and a round's jobs are done
- **Where:** Part 2, section 4, all four points.
- **The design says:** "The tool decides both, because each has one right answer. **Claude decided** the rules:" "A module's work is finished when its job's pull request has merged." "A module whose only work was a notice is also finished when its job records in its own pull request that nothing needs changing, and closes it unmerged." "A module with a walk flaw against it is finished only by a merge. ..." "A round's jobs are done when every module that had work when the round opened, or was given work during it, is finished, or is recorded blocked on a matter that no open job of the round can clear. A blocked module's work carries into the next round and is named in the account after the round."
- **In practice:** These rules say when the building in a round is over so the walks can begin.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 55. Eight slots by default, and how they are counted
- **Where:** Part 2, section 5, first point.
- **The design says:** "Eight by default, and the owner can change the number by a marked instruction (**from a session's record:** the record of 13 Nov, lines 9 and 17). ... **Claude decided** the count: a product's slots in use are its open jobs that are not recorded blocked, and its live walking sessions."
- **In practice:** At most eight building or walking sessions run at once on your account unless you say otherwise.
- **Where it came from:** A session's record (the 13-14 Nov record, lines 9 and 17), not your typed words; the way of counting is Claude's own choice.
- **Your nearest words:** "O8: across the account" (`bob_words_14nov_c.md`)
- **Against your words:** Goes beyond them: you gave the counting across the account, not the number eight.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 56. Which sessions use a slot
- **Where:** Part 2, section 5, second point; also part 4, section 3.
- **The design says:** "**Claude decided:** the standing roles and workers use no slot, lane sessions use none either, and walking sessions use the slots, since a walk is made when no job is open."
- **In practice:** Only building and walking sessions count against the eight.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 57. Two products sharing the slots
- **Where:** Part 2, section 5, last point.
- **The design says:** "**Claude decided:** when two products run at once, each product's process config names its share of the slots, and the shares add up to the account's number. The default is an equal split. The owner changes a share by a marked instruction. A product does not borrow another's unused share, because no record is shared between two products."
- **In practice:** With two products, the eight are split between them, evenly unless you say otherwise.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "O8: across the account" (`bob_words_14nov_c.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 58. An install and an update confirmed before a release, beside the three tests
- **Where:** Part 2, section 6, first point; also part 3, section 6.
- **The design says:** "**From a session's record:** the design state, lines 16 and 18, for the rest of this line. Before a release, an install and an update are each confirmed to have succeeded. Nothing more: no further test phases, gates or reviews, and no full regression, on request or otherwise. Every other check the process before this one had that could stop work has ended."
- **In practice:** Besides your three tests, a fresh install and an update are tried and confirmed before any release is offered; no other test or check exists, not even on request.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, lines 16 and 18. Not your typed words.
- **Your nearest words:** "O13: three tests and no others" (`bob_words_14nov_c.md`); "There will be no additional tests added to the process than the 3 already identified." (`bob_words_15nov_main.md`)
- **Against your words:** Differs in part: the install and update confirmation stands beside your three tests.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 59. A test runs only for a fully informed reason
- **Where:** Part 2, section 6, second point.
- **The design says:** "A test runs only when there is a fully informed reason to run it. **From a session's record:** the record of 13 Nov, line 19."
- **In practice:** Tests are not run just in case.
- **Where it came from:** A session's record: the 13-14 Nov record, line 19. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 60. Module tests run only for the job's own module
- **Where:** Part 2, section 6, third point.
- **The design says:** "**Claude decided:** module tests run for the job's own module only, on GitHub's machines, when the job marks its pull request ready. A failure goes back to the job."
- **In practice:** Only the part being built is tested when its session says it is done.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 61. Test coverage is a job's duty that nothing measures
- **Where:** Part 2, section 6, fourth point.
- **The design says:** "They give appropriate coverage of the code ... The coverage, and that this is a duty of the job, held by its instructions, which nothing measures: **from a session's record:** the design state, line 17."
- **In practice:** Each building session is told to test its part thoroughly, but nothing checks how thoroughly.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 17. Not your typed words. (The rest of the point is yours.)
- **Your nearest words:** "It's also a challenge because tests must be complete yet fast and efficient." (`bob_words_14nov_b.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 62. Every requirement tested at the module's edge
- **Where:** Part 2, section 6, sixth point.
- **The design says:** "Every requirement is tested at the module's interface. **From a session's record:** the Foundations, as the sixth draft quotes them (its line 291)."
- **In practice:** Each requirement is tested by what the part accepts and hands back, not by its insides.
- **Where it came from:** A session's record: the Foundations, as the sixth draft quotes them. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 63. The check that a module's stated uses match its code
- **Where:** Part 2, section 6, seventh point.
- **The design says:** "Module tests include a check that the module's declared uses match its imports. **From a session's record:** the record of 13 Nov, line 5: "a check that the module's declared uses match its imports"."
- **In practice:** A part's tests confirm that the parts it says it uses are the ones its code really uses.
- **Where it came from:** A session's record: the 13-14 Nov record, line 5. Not your typed words. (That it reads the test files too is yours.)
- **Your nearest words:** "M11: I think it has to check tests too" (`bob_words_14nov_c.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 64. Only the two refusals you approved
- **Where:** Part 2, section 6, eighth point.
- **The design says:** "**Claude decided** that no other is taken. ... Only these two refusals stand; no other is built into module tests."
- **In practice:** Of the many refusals tried when the notice was proven, only the two you approved are kept.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "the tool may refuse a disagreeing comment" and "As recommended." (`bob_words_14nov_notice_session.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 65. Tests and walk steps serve the product only
- **Where:** Part 2, section 6, ninth point.
- **The design says:** "**Claude decided:** a module's tests and a walk's steps are product work. Each exists only to prove a product requirement, which it names. A test or step that serves the process is not allowed. This is a rule in text."
- **In practice:** No test is written to watch over the process itself.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "Do not add tests, gates, reviews or checks." (`bob_words_14nov_b.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 66. Module tests run in two parts
- **Where:** Part 2, section 6, tenth point.
- **The design says:** "**Claude decided:** module tests run in two parts, so that product code under test holds no access token."
- **In practice:** The product's code is tested without being handed any key to GitHub.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 67. Built files are never committed
- **Where:** Part 2, section 6, last point.
- **The design says:** "Built files are never committed. They are built at each walk, deployment and release. **From a session's record:** the design state, line 71."
- **In practice:** Only the source is kept; the runnable product is produced fresh when it is needed.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 71. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 68. A notice for a module whose job is open waits
- **Where:** Part 2, section 7, "A module whose job is already open".
- **The design says:** "**A module whose job is already open. Claude decided:** the notice waits in the waiting-work record until that job's pull request merges or closes. The module then has work again, and its next job is the told job. Nothing is passed to the open job."
- **In practice:** A session already at work on a part is not interrupted with news of another part's change; the news waits for the next session.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 69. Adding the first comments sends no notice
- **Where:** Part 2, section 7, "A module with no comments yet".
- **The design says:** "**Claude decided:** that step sends no notice."
- **In practice:** Describing an existing part for the first time does not alert the parts that use it.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "Agreed: The comments go in as a step of their own, before the job changes anything else, and they describe the module as it stands." (`bob_words_14nov_notice_session.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 70. A told job checks only the changed parts
- **Where:** Part 2, section 7, "What a told job does".
- **The design says:** "It checks only the changed parts and runs only the tests that relate to them. **From a session's record:** the record of 13 Nov, line 10."
- **In practice:** A part that is told of a change in a part it uses looks only at what changed, and runs only the tests that touch it.
- **Where it came from:** A session's record: the 13-14 Nov record, line 10. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 71. Which tests relate, chosen by the tool, and three points for you
- **Where:** Part 2, section 7, "Which tests relate" and the "Reading" point.
- **The design says:** "**Which tests relate. Claude decided:** the tool picks them, not the job. ... They are chosen by whole test file." "**Reading:** three points here bear on what the owner's rule means, and are his to confirm (part 10): that a told job's own edits count among "the changed parts"; that tests are chosen by whole file; and that where the tool cannot follow a told module's code, that module's whole tests run, since the tool cannot say which relate."
- **In practice:** The program, not the session, picks which tests to run after a notice, and when it cannot tell, all of that part's tests run.
- **Where it came from:** Claude's own choice, and a reading of the 13-14 Nov record by Claude.
- **Your nearest words:** "Why is this mine? - may a user’s use of a provider be worked out by the tool from the user’s code and comments, with no separate list kept by hand? You tell me." (`bob_words_14nov_notice_session.md`)
- **Against your words:** Goes beyond them; these are technical points of the kind you left to the AI.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 72. When a job is a told job
- **Where:** Part 2, section 7, the point after "Which tests relate".
- **The design says:** "**Claude decided:** a job is a told job only when notices are its module's only work. A module with other work as well has an ordinary job, which reads the notice's uses and whose whole module's tests run."
- **In practice:** A part with other work too is built and tested in full as usual.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 73. One required test run whose scope the tool sets
- **Where:** Part 2, section 7, "The run on GitHub".
- **The design says:** "**The run on GitHub. Claude decided:** there is one required run with one name. The tool, at the tranche branch's version, sets its scope: nothing, the related tests, or the whole module. It works the list out itself, so the job supplies nothing."
- **In practice:** One automatic test run on GitHub serves every case; the program decides how much it tests.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 74. A told job that finds nothing to change
- **Where:** Part 2, section 7, the point after "The run on GitHub".
- **The design says:** "**Claude decided:** a told job that finds nothing to change records that in its pull request and closes it unmerged. No test runs, because nothing changed."
- **In practice:** If a notice turns out to need no change, the session says so and closes without testing.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 75. When the module list changes
- **Where:** Part 2, section 7, "When the module list changes".
- **The design says:** "**When the module list changes. Claude decided:** a change to the list sends no notice of itself. Where it moves code between modules or splits a module, the tool makes the interface listings of the modules touched before and after, and the users of any entry whose listing differs are told as for any other change. Where only a provider's name changes for its users, their code is changed by a mechanical edit."
- **In practice:** Rearranging parts tells only the users whose connection actually changed.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 76. A stated use that no code makes
- **Where:** Part 2, section 7, "A declared use that no code makes".
- **The design says:** "**A declared use that no code makes. Claude decided:** the tool cannot follow it, so by decision 2 below it is told whenever that provider's listing changes at all. ... The check of declared uses in the module's own tests finds it at the module's next job, which removes the declaration."
- **In practice:** A part that claims to use another but does not is told of every change until its next session removes the claim.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 77. Seven rules for the program that finds a change
- **Where:** Part 2, section 7, numbered list 1 to 7.
- **The design says:** "**Claude decided,** for the tool that finds the change:" "1. Which parts of a provider a user uses is worked out by the tool from the user's code and comments. No list is kept by hand." "2. A user the tool cannot follow fully counts as using everything of that provider ..." "3. A bound that a kind of value cannot express is written on its own marked line in the comment. ..." "4. Code that checks or builds what crosses a module's interface says, in a comment, which kind it checks or builds." "5. Calls made by name are made followable ..." "6. Both listings of a comparison are made at the same moment with the same version of the tool." "7. "Accepts more" counts only when the language's own type checker confirms it."
- **In practice:** These are the program's working rules for telling which parts must hear of a change; where it is unsure, it tells more parts rather than fewer.
- **Where it came from:** Claude's own choice (rule 3 has your words beside it).
- **Your nearest words:** "Why is this mine? ... You tell me." and "How do we make the calls by name made followable?" (`bob_words_14nov_notice_session.md`)
- **Against your words:** Agrees: you left these to the AI.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 78. The program that reads the product's code is a setting
- **Where:** Part 2, section 7, last point.
- **The design says:** "**Claude decided:** which language reader the tool uses is a fact of the product, named in its process config."
- **In practice:** Each product names, in its settings file, the program used to read its code.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "I need your assessment of TypeScript’s reader tool." (`bob_words_14nov_notice_session.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.
