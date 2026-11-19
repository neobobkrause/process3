Length: 241 lines. Last section: "104. A release needs your approval and a confirmed install and update, not a walk".

## Part 2. Modules, jobs, module tests, and the notice (continued)

### 79. Who decides how two modules connect, and changes that must land together
- **Where:** Part 2, section 8, all three points.
- **The design says:** "**Claude decided:**" "ARCH decides the interface between two modules. A provider's job may propose a change; where users are affected ARCH decides it before it is built." "There is no merge of several modules together other than the mechanical edit. Where modules must change together, ARCH orders the work so that each merge passes on its own ..." "Where that cannot be done, the boundary between those modules is an architecture bug. ARCH corrects the module list or the interface, and does not work round it."
- **In practice:** ARCH settles how parts connect and orders changes so each can be added on its own; if that is impossible, the split between those parts is redesigned.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "M12: Can the mechanical edit do a single merge of all affected modules?" (`bob_words_14nov_c.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 80. How and when the mechanical edit is made
- **Where:** Part 2, section 9, first point.
- **The design says:** "**The mechanical edit.** **Claude decided:** a worker in ARCH's session makes it as one change covering every affected module, and it is merged once; and the moment: when no job is open, between a round's last merge and its internal walk. A module where the change needs judgment gets its own job."
- **In practice:** A trivial change across many parts is made once by ARCH's helper, at a quiet moment in the round.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "M12: Can the mechanical edit do a single merge of all affected modules?" (`bob_words_14nov_c.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 81. A lane's folder needs no module tests
- **Where:** Part 2, section 9, second point.
- **The design says:** "**A lane's folder.** A change that touches only files in a lane's own folder needs no module tests. Design documents do not need testing. **Reading:** the owner has not confirmed this."
- **In practice:** Design documents a lane writes are added without testing.
- **Where it came from:** A reading by Claude, not confirmed by you.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 82. Requirement text, the module list and the process's own files merge untested
- **Where:** Part 2, section 9, third point.
- **The design says:** "**Claude decided:** these change no code and no tests, so their pull requests merge through the tool with no module tests run. The required test run reports on every pull request. It passes at once when no module's code or tests changed, and on the tranche's own pull request into the main branch, where none of the tests runs (part 3, section 5)."
- **In practice:** Changes that touch no code go in without testing.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

## Part 3. The tranche, rounds, walks, and release

(ARCH's proposal for each tranche, part 3, section 1, first point, is under part 1 above.)

### 83. The main branch never moves during a tranche, and one lasting tranche branch
- **Where:** Part 3, section 1, second point.
- **The design says:** "The tranche is built on the tranche branch. The main branch never moves while a tranche runs (**from a session's record:** the Foundations, `foundations_tranche_9nov.md`, line 57). **Claude decided:** there is one lasting tranche branch. After a tranche merges into the main branch, the next tranche goes on from the same branch."
- **In practice:** The finished copy of the product changes only when a whole batch is done; batch work always happens in the same working copy.
- **Where it came from:** A session's record (the Foundations, line 57), not your typed words; the one lasting branch is Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 84. One fixed version of the process for each tranche
- **Where:** Part 3, section 1, third point; also part 6, section 5.
- **The design says:** "A product's tranche runs on one fixed version of the process from open to close (part 6). **From a session's record:** the Foundations (`foundations_tranche_9nov.md`, lines 48 and 67)." Part 6, section 5: "A product names one fixed version of the process in its process config, and a tranche runs on that one version from open to close. Each session fetches a read-only copy of it. **From a session's record:** the Foundations ... and the ledger, as the sixth draft quotes it (its line 418)."
- **In practice:** A process change never reaches a product in the middle of a batch.
- **Where it came from:** Sessions' records: the Foundations and the ledger lines. Not your typed words.
- **Your nearest words:** "The transition from the process a product is being built using to the updated process will be done only with my prior approval, with PROCESS proposing the best and least disruptive means of making the update." (`bob_words_14nov_b.md`)
- **Against your words:** Agrees, and goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 85. ARCH prepares the next round while a tranche runs
- **Where:** Part 3, section 1, last point.
- **The design says:** "While a tranche runs, ARCH prepares what the next round or tranche needs. **From a session's record:** the ledger, as the sixth draft cites it (its line 194)."
- **In practice:** ARCH works ahead so the next round can start at once.
- **Where it came from:** A session's record: the ledger lines, as the sixth draft cites them. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 86. The order of a round
- **Where:** Part 3, section 2, steps 1 to 3 and the line after them.
- **The design says:** "**Claude decided** the order: jobs, then the internal walk, and deployment only after an internal walk with no flaws."
- **In practice:** Each round builds first, then checks the screens, and only if the screens are right puts the product on the development site for the journeys walk.
- **Where it came from:** Claude's own choice (the design marks it so).
- **Your nearest words:** "the live walk would only run once a round completed without any flaws identified in the internal walk" (your words of 8 Nov, quoted in the Foundations, `foundations_tranche_9nov.md`, line 259); "O4: internal and external walks a separate tests." (`bob_words_14nov_c.md`)
- **Against your words:** Agrees with your 8 Nov words.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 87. Every round's walks cover only what changed
- **Where:** Part 3, section 3, first point.
- **The design says:** "Every round's walks are partial, the first round included. ARCH names the areas a round's updates affect before each walk. A partial walk is without flaws when it lists no flaw in the areas it was given. **From a session's record:** the design state, line 56."
- **In practice:** A walk checks only the screens and journeys that round's work touched, not all of them.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 56. Not your typed words.
- **Your nearest words:** "The external walk follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results." (`bob_words_14nov_b.md`)
- **Against your words:** Differs: you said "all journeys".
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 88. What an area of a walk is
- **Where:** Part 3, section 3, second point.
- **The design says:** "**Claude decided** what an area is. For the internal walk, a screen or a named group of screens in the Screens document. For the external walk, a journey. ARCH works out a round's areas from the modules the round changed and the notices it sent."
- **In practice:** ARCH picks which screens and journeys to walk from what the round changed.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 89. A flaw is one of three things
- **Where:** Part 3, section 3, third point.
- **The design says:** "**A flaw is one of three things:** the workflow as built does not match the Screens document; a journey cannot be completed; a journey completes with a wrong result. Anything else a walker notes goes to ARCH as an observation and does not hold the tranche. **From a session's record:** the design state, line 58."
- **In practice:** Only these three findings hold up a batch; anything else a walker notices is passed on but does not.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 58. Not your typed words.
- **Your nearest words:** "An internal walk uses the UX Screens document to confirm that the workflow matches the definition. The external walk follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results." (`bob_words_14nov_b.md`)
- **Against your words:** Agrees, and goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 90. When the document is wrong, the UX lane corrects it
- **Where:** Part 3, section 3, fourth point.
- **The design says:** "Where ARCH judges the document wrong and the product right, the UX lane corrects the document. **From a session's record:** the design state, line 58."
- **In practice:** If a walk shows the screens or journeys document is what is wrong, the document is fixed instead of the product.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 58. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 91. Doubtful changes are tried in the walks
- **Where:** Part 3, section 3, fifth point.
- **The design says:** "Where it is in doubt how a change will affect the product, and inspecting or testing the code cannot settle it, the walks exercise the running workflow concerned; if it does what is expected, there is no problem. **Reading:** this adds no test; it is part of what ARCH names for a round's walks. It is not stated as a habit in any role's principles."
- **In practice:** When nobody can tell from the code what a change will do, ARCH includes that part in the round's walk.
- **Where it came from:** A reading by Claude, not confirmed by you.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 92. A full walk of all journeys only if you ask
- **Where:** Part 3, section 3, sixth point.
- **The design says:** "**A full external walk is opt-in.** By default it is not made. If the owner asks the coordinator for one before a round's partial walks come clean, it is made, and the tranche ends only if it is clean. A full walk is without flaws when it lists no flaw and leaves out no step that the walk before it made. **From a session's record:** the design state, line 57."
- **In practice:** Unless you ask, no walk ever goes through every journey before a batch ends.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 57. Not your typed words.
- **Your nearest words:** "So a tranche only ends when an external walk (of a development deployment) completes without flaws." and "So a release is always fully tested and walked successfully." (`bob_words_14nov_b.md`)
- **Against your words:** Differs: by default nothing walks all journeys.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 93. No walk outside a tranche, and no sorting lanes
- **Where:** Part 3, section 3, seventh point.
- **The design says:** "There is no walk outside a tranche. The only walk made on the owner's word is the opt-in full external walk. There are no triage lanes. **From a session's record:** the design state, line 63."
- **In practice:** Walks happen only inside a batch; there is no separate team sorting walk findings.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 63. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 94. Where the screens and journeys are kept, and who owns them
- **Where:** Part 3, section 3, "The walks' documents", first point.
- **The design says:** "The Screens document and the journeys are pages kept in the product repository's folder named in the process config (**from a session's record:** the design state, line 59). **Reading:** the UX lane owns them (part 4, section 3)."
- **In practice:** The two documents live in a folder the product's settings name, and the UX lane looks after them.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 59), not your typed words; the ownership is a reading by Claude.
- **Your nearest words:** "screens and journeys are kept in docs/development/ux-substrate/ in the product repo" (`bob_words_14nov_c.md`)
- **Against your words:** Differs slightly: you named the folder; the design leaves it to a setting.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 95. The screens and journeys change during a tranche only to correct an error
- **Where:** Part 3, section 3, "The walks' documents", second point.
- **The design says:** "During a tranche they change only to correct an error a walk has shown, and each such change is named in the account after the round. **From a session's record:** the design state, line 59."
- **In practice:** The yardstick the walks use is not moved mid-batch except to fix a mistake a walk found, and you are told of each fix.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 59. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 96. Who walks and who deploys
- **Where:** Part 3, section 3, "Who makes a walk", first point.
- **The design says:** "Walking sessions make both walks, and they walk the product being developed, whatever product that is. ARCH's session makes the development deployment. **From a session's record:** the design state, line 60. **Claude decided:** ARCH starts them."
- **In practice:** Separate walking sessions do both walks; ARCH puts the product on the development site and starts the walkers.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 60), not your typed words; that ARCH starts them is Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 97. A walk is shared among walkers by area
- **Where:** Part 3, section 3, "Who makes a walk", second point.
- **The design says:** "**Claude decided:** a walk is shared among walking sessions by area, with at most as many walking sessions as there are slots. Each walking session's single run, and each step of a deployment, is kept within the time a session can run one thing."
- **In practice:** Several walkers split one walk between them, never more than the slots allow.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found in your typed words. Process3's decision record quotes you, 8 Nov: "be careful that there aren't too many external walkers to cause the Cloudflare system to exceed limits of the account".
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 98. A short account after each round
- **Where:** Part 3, section 4.
- **The design says:** "The coordinator gives the owner a short account: jobs done, flaws found, flaws carried over, observations set aside, changes to the walks' documents, rewordings made, and cost where it can be read. Nothing waits on it. **From a session's record:** the design state, line 61."
- **In practice:** After each round you get a brief report; nothing waits for you to read it.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 61. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 99. A tranche ends when a round's partial walks come clean
- **Where:** Part 3, section 5, first point.
- **The design says:** "**Reading:** a tranche ends when a round's partial walks, internal and external, both come clean; or, where the owner asked for a full external walk, when that walk is clean."
- **In practice:** A batch is finished once the walks of the last round's changed areas find nothing.
- **Where it came from:** A reading by Claude, not confirmed by you.
- **Your nearest words:** "So a tranche only ends when an external walk (of a development deployment) completes without flaws." (`bob_words_14nov_b.md`)
- **Against your words:** Differs: the walk that ends a batch covers only changed areas.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 100. What shows the tranche's journeys complete
- **Where:** Part 3, section 5, second point.
- **The design says:** "**Open (the owner):** what shows that the journeys named for the tranche do complete at its end, when a round's walks cover only the areas that round changed. **Reading:** in the round that would end the tranche, ARCH adds to the external walk's areas every journey named for the tranche that no earlier round of the tranche walked clean."
- **In practice:** In the last round, ARCH would also walk any journey promised for the batch that has not yet been walked without fault.
- **Where it came from:** A reading by Claude, not confirmed by you. Marked open for you.
- **Your nearest words:** "The external walk follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results." (`bob_words_14nov_b.md`)
- **Against your words:** Goes beyond them, and falls short of "all journeys".
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 101. The finished tranche merges into main with no tests run
- **Where:** Part 3, section 5, third point.
- **The design says:** "**Claude decided:** when the tranche ends, ARCH merges the tranche branch into the main branch as a whole, by pull request. None of the tests runs on that pull request."
- **In practice:** The whole batch is added to the finished copy in one step, without running tests again.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** Your standing approvals (Process3's `CLAUDE.md`): sessions may "merge the tranche's pull request into main once its required checks pass".
- **Against your words:** Agrees in part.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 102. A tranche that never comes clean: merged with its flaws, or dropped
- **Where:** Part 3, section 5, fourth and fifth points.
- **The design says:** "**Open (the owner):** a tranche that does not come clean goes on in rounds until the owner says. He then chooses between merging it with its flaws named, with no release from it, and dropping it (**from a session's record:** the design state, line 62)." "**Reading:** a tranche merged with its flaws named has not ended in the sense of section 6. Its flaws become work in the next tranche, and a release can be made once a later tranche ends clean."
- **In practice:** If a batch keeps finding faults, you may have it added to the finished copy with its faults listed (no release from it), or throw it away.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 62), not your typed words; the second point is a reading by Claude. Marked open for you.
- **Your nearest words:** "So a tranche only ends when an external walk (of a development deployment) completes without flaws." (`bob_words_14nov_b.md`)
- **Against your words:** Differs: your words have no merge with flaws.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 103. The tranche report
- **Where:** Part 3, section 5, last point; also part 4, section 1 (ARCH's duties).
- **The design says:** "**Claude decided:** one report is written at the tranche's end, by ARCH, and it lists the UX lane's changes. It is written only from what git and GitHub already hold: time, work done and left, anything deferred and why, cost where it can be read and "unmeasured" otherwise, the overhead share, ARCH's idle time while work was ready, the owner's minutes, and every change the UX lane made during the tranche to the two documents the walks are measured against. No number is a target. Nothing reads the report to decide anything."
- **In practice:** At the end of each batch you get one report built from records already kept.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 104. A release needs your approval and a confirmed install and update, not a walk
- **Where:** Part 3, section 6, first point.
- **The design says:** "Any tranche that has ended can be released, on the owner's approval, once an install and an update have each been run and confirmed successful. Neither is walked. **From a session's record:** the design state, line 68."
- **In practice:** A finished batch can become a release once you approve and a fresh install and an update have each worked; the installed result is not walked.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 68. Not your typed words.
- **Your nearest words:** "A release can (optionally) be started after a tranche completes. So a release is always fully tested and walked successfully." (`bob_words_14nov_b.md`); "3. installer and site updates wait for a clean development release walk" (`bob_words_14nov_c.md`)
- **Against your words:** Differs: you spoke of a clean development release walk.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.
