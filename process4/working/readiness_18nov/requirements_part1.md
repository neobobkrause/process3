# Bob's requirements of Process4 in his typed words of 14 and 15 Nov, checked against the design (part 1)

Length: 119 lines. Last section: "5. Requirements that are not MET, most serious first".

Written by Claude, a worker session, on 18 Nov 2026. It reports only what was read.

## 1. What was read, and what was not

Read in full:

- `process4/definition/process4_definition_v6.md`, 597 lines. Called "definition" below.
- `process4/working/design_state_18nov.md`, 143 lines. Called "state" below. Where the two differ, the state rules.
- `process4/owner_words/bob_words_14nov_b.md`, 37 lines. Called "14nov_b".
- `process4/owner_words/bob_words_14nov_c.md`, 72 lines. Called "14nov_c".
- `process4/owner_words/bob_words_14nov_notice_session.md`, 114 lines. Called "notice_session".
- `process4/owner_words/bob_words_15nov_main.md`, 17 lines. Called "15nov_main".

Unread, and so unknown to this report:

- Bob's typed words of 18 Nov. The folder `process4/owner_words/` lists no file dated 18 Nov. The state gives his rulings of that day in Claude's words, with one exact quotation (state line 43). Wherever this report says a ruling of 18 Nov replaces earlier words, it rests on the state's account alone.
- The other five files in `process4/owner_words/` (16 and 17 Nov).
- The fourth draft of the definition. Bob's short answers marked "M1", "O5" and so on answer that draft. What each answered is taken from the definition's own account (definition lines 51 to 71, 393 to 395, 436).
- Bob's ledger, his Foundations, and every other file under `process4/working/`.

How to read the table. Each row is one requirement in Bob's exact words, typing errors included. "Amended" in a note means a later statement of his changed part of the requirement; the verdict is given on what still stands. Line numbers are those of the files as read today.

## 2. Requirements that stand

| No. | Bob's words, exactly | Source | Verdict | The design's line, and note |
| --- | --- | --- | --- | --- |
| 1 | "The throwaway repo that you need already exists: process3-probes." | 14nov_b line 3 | MET | definition 507; state 138. |
| 2 | "A tranche ends after a successful external walk of a development deployment. So a deployment is a step in a tranche." | 14nov_b line 5 | MET | definition 23 and 266; state 60. |
| 3 | "But if flaws are found during an external walk those flaws are added to the next round, not the next tranche." | 14nov_b line 5 | MET | definition 266. |
| 4 | "So a tranche only ends when an external walk (of a development deployment) completes without flaws." | 14nov_b line 5 | MET | definition 267 and 293; state 57. Amended on 18 Nov as the state records it: a round's walks are partial by default (state 56 and 57), and Bob may end a tranche that has not come clean by merging it with its flaws named or dropping it (state 62). |
| 5 | "A release can (optionally) be started after a tranche completes." | 14nov_b line 5 | MET | definition 281; state 68. |
| 6 | "So a release is always fully tested and walked successfully." | 14nov_b line 5 | MET | state 62 (no release from a tranche merged with flaws) and state 68. Amended on 18 Nov as the state records it: the full external walk is made only if Bob asks (state 57), and the install and the update before a release are confirmed, not walked (state 68). The word "fully" no longer stands. |
| 7 | "Yes, a job writes its own tests. That's an important responsibility." | 14nov_b line 7 | MET | definition 196 and 291. |
| 8 | "It's also a challenge because tests must be complete yet fast and efficient." | 14nov_b line 7 | MET | definition 291. State 17 gives the 18 Nov wording, "appropriate coverage", and says the duty is held by the job's instructions. "Fast and efficient" appears only in the definition's line. |
| 9 | "An internal walk uses the UX Screens document to confirm that the workflow matches the definition." | 14nov_b line 9 | MET | definition 24 and 265; state 58. |
| 10 | "The external walk follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results." | 14nov_b line 9 | MET | definition 25 and 266; state 58. Amended on 18 Nov as the state records it: the journeys expected to complete are named and approved before each tranche (state 55) and each round's walk is partial (state 56), so "all journeys" holds only for the full walk Bob may ask for (state 57). |
| 11 | "When you change something I defined you need to describe the PROPOSED change in words I understand so that I know what you're proposing and whether to approve the change or not." | 14nov_b line 15 | MET | state 50 (the one form of a question), state 76 (a rewording that changes what the product does comes to him first), state 30 (a rewritten entry is shown to him before it stands); definition 210 and 218. Met kind by kind; no single line states it for everything he defined. |
| 12 | "Process changes only happen in a separate process lane call PROCESS that I interact with." | 14nov_b line 25 | MET | definition 218 and 387; state 48 and 49. What holds it is his approvals, reworded by him (state 90); nothing enforced by GitHub is added. |
| 13 | "Though process changes are often technical and detailed, the PROCESS session will explain the nature of the problem and suggestion options for fixing it for me to explore and ultimately choose." | 14nov_b line 25 | MET | definition 218; state 50 and 126. |
| 14 | "there could end up being more than one change being proposed in the PROCESS session at a time. When that happens, the set of changes are considered together as a group that could potentially have interactions and implications between." | 14nov_b line 25 | MET | definition 218 ("Several proposals open at once are considered together"). |
| 15 | "The process after a proposed change is made must continue to meet the process4 requirements (or the requirements changed with my explicit approval)." | 14nov_b line 25 | MET | definition 380, where his paragraph is given in full as the rule; state 27 says which document is "the Process4 requirements". No other line restates it. |
| 16 | "The transition from the process a product is being built using to the updated process will be done only with my prior approval, with PROCESS proposing the best and least disruptive means of making the update." | 14nov_b line 25 | MET | definition 194, 218 and 387. |
| 17 | "Talk to me in plain words. No codes, no shorthand, no references to things I have not seen. I have not read your working files." And: "You're talking as I know everything you know and have been following every session has said in detail. I have not. If there things I need to know, please walk me through them in an organized fashion using words and providing context so that I understand what's being said." | 14nov_b line 30; 15nov_main line 17 | PARTLY | Plain words are required for technical decisions told to him (definition 13 and 192), for the message when the process is blocked (definition 372) and for a question put to him, which carries an explanation of the issue (state 50). State 11 says "Plain words. No reference codes" as a rule for reading that brief. Missing: no line says that everything a Process4 session tells him is free of codes, shorthand and references to things he has not seen, or that it gives the context he needs. |
| 18 | "Decide technical matters yourself and tell me what you decided. Bring me only what is mine to decide, with what it is, why it matters to me, and your recommendation." | 14nov_b line 31 | MET | definition 13 and 192; state 50. |
| 19 | "Only words I wrote count as my word. Never record your decision or your summary as mine." | 14nov_b line 32 | MET | definition 192; state 47 and 30. Note: the state itself gives his rulings of 18 Nov in Claude's words; his typed words of that day are unread. |
| 20 | "Do not assure me that something will work. Say what is proven and what is not." | 14nov_b line 33 | MET | state 117. |
| 21 | "Do not add tests, gates, reviews or checks." | 14nov_b line 34 | PARTLY | The rule is stated: state 16 ("no further test phases, gates or reviews") and state 18 (every other check Process3 had that could stop work has ended). Missing: definition 224, the third item under "Claude decided", keeps a record that "refuses a second start" of a lane session, built in Process3. It is not among the checks the definition says stay (definition 430), and state 18 does not name it. The two files differ here and neither settles it by name. Also, state 133 says "The tool guards against mistakes" and neither file lists those guards. Whether a refusal of a second lane start is a check in Bob's sense is this worker's judgment. |
| 22 | "Process4 does have 3 tests, but calling the notification of a user module that a provider has changed isn't a test, it's simply a notification. The 3 tests are * module tests * internal walk * external walk" | 14nov_c lines 7 to 11 | MET | definition 287 and 307; state 16. |
| 23 | "Process4 has three tests, ever." And: "There is no need to any any more tests. PERIOD!" And: "O13: three tests and no others". And: "We are clear about which tests will be run. There will be no additional tests added to the process than the 3 already identified." | 14nov_b line 34; 14nov_c lines 14 and 46; 15nov_main line 13 | MET | state 16 and 18; definition 317 (no test of users before a provider's change merges). Amended on 18 Nov as the state records it: before a release an install and an update are each confirmed to have succeeded (state 16 and 68). |
| 24 | "Keep your context under 70%. Do the heavy reading with workers." | 14nov_b line 35 | MET | state 116 (workers do the heavy reading) and state 80 (a role is refreshed at a stated fill level). Said to the drafting session as a working rule. The figure is amended: state 43 gives 40 percent as a provisional value, on a reading by Claude of his words of 18 Nov that the state marks as not yet confirmed. |
| 25 | "There must be a practical means of identifying when a change doesn't require user modules to be updated." | 14nov_c line 18 | MET | definition 332 to 338. Amended by his words of 15 Nov (row 59): the means is a filter, not exact. The definition says none of it has run (definition 362). |
| 26 | "M1: ROOT" (who starts PROCESS) | 14nov_c line 25 | MET | definition 393; state 85. |
| 27 | "M2: There are communication channels between module jobs and ARCH, and between ARCH and the coordinator. ARCH can ask ROOT to start PROCESS if it isn't already running, and the coordinator can talk to PROCESS." | 14nov_c line 26 | MET | definition 394; state 92. |
| 28 | "M3: the processes" (which repository PROCESS holds) | 14nov_c line 27 | MET | definition 395; state 85. |
| 29 | "M7: sessions" (who runs a walk and the deployment) | 14nov_c line 28 | MET | definition 271; state 60. |
| 30 | "M10: ROOT starts with the product repo, which contains the needed approvals in CLAUDE.md and settings.json" | 14nov_c line 29 | MET | definition 188 and 416, and 183 for where he commits them. Note: state 141 lists as owed "a worked proposal on branches and where Bob's approvals live". |
| 31 | "M11: I think it has to check tests too" (the check of declared uses) | 14nov_c line 30 | MET | definition 295. |
| 32 | "M14: same as in process3" (keeping to GitHub's published limits) | 14nov_c line 32 | MET | definition 436; state 142 says how Process3 did it, citing the working Foundations, which are unread. |
| 33 | "O2: A job for module A isn't allowed to change module B. The only other way of editing a module is when a mechanical edit (like a word table change) makes the change." | 14nov_c line 35 | MET | definition 196 and 260. Amended on 18 Nov as the state records it: ARCH writes and rewords the requirement text in a module's file, and touches no code and no tests (state 75). |
| 34 | "O4: internal and external walks a separate tests." | 14nov_c line 37 | MET | definition 287; state 16. |
| 35 | "O5: agreed" (the process's own tool has tests of its own; as the definition gives the proposal, "the size limit on each role's starting text among them") | 14nov_c line 38 | PARTLY | The tool's own tests are kept and run only when PROCESS changes the process (definition 299; state 20). Missing: state 19 takes the size limit on a role's starting text out of those tests, and that line is marked "Claude decided, from that ruling", not Bob's word. Whether his ruling of 18 Nov reaches this part of what he agreed is unread. |
| 36 | "O6: agreed" (who takes a free slot) | 14nov_c line 39 | MET | definition 247; state 82. |
| 37 | "O8: across the account" (the eight slots) | 14nov_c line 41 | PARTLY | Stated at definition 21 and 254. Missing: how the eight are counted and shared when two products run at once is not settled (definition 498); the state does not speak to it. With one product nothing is missing. |
| 38 | "O9: agreed" (no helper is briefed to review another session's work) | 14nov_c line 42 | MET | definition 198. |
| 39 | "O10: agreed" (a walk is without flaws when it lists no flaw and leaves out no step that the walk before it made) | 14nov_c line 43 | MET | definition 275; state 57, which keeps this for full walks. Amended on 18 Nov as the state records it: a partial walk is without flaws when it lists no flaw in the areas it was given (state 56). |
| 40 | "O11: agreed" (the first trial uses made-up modules) | 14nov_c line 44 | MET | definition 507. |
| 41 | "O12: agreed" (three acts of his beyond settings changes) | 14nov_c line 45 | MET | definition 182 to 186. |
| 42 | "screens and journeys are kept in docs/development/ux-substrate/ in the product repo" | 14nov_c line 51 | MET | definition 216 and 273; state 59. Which journey list counts is owed (state 143). |
| 43 | "1. A tranche can end without an AI enabled run" | 14nov_c line 56 | MET | definition 81, in the list of his decisions. That line points to section D, and section D (definition 241 to 281) does not say it. |
| 44 | "2. installer and website are outside the tranche" | 14nov_c line 57 | MET | definition 82 and 456. |
| 45 | "Lanes are an important element of the development process, though they haven't been fill into the process4 design." | 14nov_c line 70 | MET | definition 200 to 229; state 85, 86, 49 and 63. The definition calls its lanes text a proposal waiting for his answers (definition 200); the state answers who starts lanes, how he works with them, and that there are no triage lanes. |
| 46 | "a provider's answer to a user changing (content) doesn't necessitate the user being retested. What matters is when the interface to the provider (metadata) changes." | notice_session line 22 | MET | definition 323 and 332. |
| 47 | "The interface to a provider is it's domain. The bounds of valid values passed to and received from a provider are it's range. So what I'm saying is that any change to either a provider's domain or range necessitates that its users be retested. But if both domain and range stay the same, then no retesting of users is needed." | notice_session line 28 | PARTLY | Users of a changed entry are told (definition 324, 332 and 334), and a told job checks only the changed parts and runs only the tests that relate to them (state 21). Missing: how a told job picks those tests is listed as owed (state 139), and the definition still calls what a told job does "not studied" (definition 354). Amended by his later words: accepting more tells no one (row 57), and the notice may miss a user (row 59). |
| 48 | "The tests are supposed to confirm bounds, confirm the accuracy of results under valid conditions, and confirm the recognition of an error when out of bounds. Tests should not fail because they expect a specific valid response but receive a different though still valid response." | notice_session line 32 | MET | definition 291; state 17. |
| 49 | "even in loosely typed languages the formal interface can be augmented with structured comments that the language runtime doesn't see but that clarifies how the interface is to be used, and used by our build tools to determine whether the domain or range has changed so that user modules need to be updated." | notice_session line 34 | MET | definition 330 and 332. |
| 50 | "The comments and tool can also inform module tests to ensure that boundaries are properly checked." | notice_session line 42 | MET | definition 291; state 17 ("check bounds"). |
| 51 | "which event sends the notice: B" | notice_session line 56 | MET | definition 332; state 82. |
| 52 | "the tool may refuse a disagreeing comment" | notice_session line 58 | MET | definition 338. |
| 53 | "Who is told: ideally only the users of the entry that changed." | notice_session line 64 | MET | definition 334, 342 and 343. Two side cases of who is told are still open (definition 355 and 356; state 142). |
| 54 | "in order for this to work every module needs to be edited to add structured comments." And: "What rule applies to a module that has no comments yet: The first time a job for a module without comments starts the first thing it does is add the structured comments." | notice_session lines 46 and 66 | MET | definition 336. |
| 55 | "The one fixed form for bounds written in words: If those words are changing, then there must be a reason why. It must be that that interface is changing, right?" | notice_session line 68 | MET | definition 113 and 325. |
| 56 | "Agreed: The comments go in as a step of their own, before the job changes anything else, and they describe the module as it stands." | notice_session line 76 | MET | definition 336. |
| 57 | "I agree with your recommendation" (for what a provider accepts, users are told only when the new interface cannot stand in for the old; for what it hands back, any change tells that entry's users) | notice_session line 82 | MET | definition 326 and 348. |
| 58 | "As recommended." (the tool may also refuse a module's code that disagrees with a provider's stated interface, inside that module's own tests) | notice_session line 100 | MET | definition 338. |
| 59 | "After much research it seems pretty clear that there is no means to reliably tell the difference when there's a change in a module between when that change changed the interface or changed something other than the interface." And: "Okay, I'll follow your recommendation: 2". And: "Stop, write it up. It's usable, even if there's an occasional extra unnecessary notice sent out." | 15nov_main lines 5 and 11; notice_session line 114 | MET | definition 315 and 317; state 21. |

Count: 59 requirements stand. MET 54. PARTLY 5. NOT MET 0. CONTRADICTED 0. CANNOT TELL 0.

## 3. Earlier words of his that later words replaced (not counted against the design)

- "O1: We need to study this further" (14nov_c line 34). Replaced by his answers to the study session and his choice of 15 Nov (rows 46 to 59).
- "O3: needs to be studied further." (14nov_c line 36). Replaced on 18 Nov as the state records it: a notified job checks only the changed parts and runs only the tests that relate to them (state 21).
- "3. installer and site updates wait for a clean development release walk" (14nov_c line 58). Replaced on 18 Nov as the state records it: there is no walk outside a tranche (state 63), and a release waits for an install and an update each confirmed successful, neither walked (state 68).
- "The act of changing those comments would result in the provider's users being notified that there was an interface change" (notice_session line 38). Replaced by "which event sends the notice: B" (notice_session line 56).
- "while still ensuring that user modules are still notified when an interface changes" (notice_session line 44). Replaced by his words of 15 Nov (row 59): the notice is not exact.
- "But in order to do so, a user module must state which parts of a provider it uses." (notice_session line 64). Replaced by "You tell me." (notice_session line 74); Claude decided the tool works it out (definition 342).

Parts of standing requirements replaced are named in the notes of rows 4, 6, 10, 23, 24, 33, 39 and 47.

## 4. Words read and not counted as requirements

- Questions he put to a session: 14nov_b lines 11, 13, 17, 19 and 23; 14nov_c line 16; 14nov_c line 31 ("M12: Can the mechanical edit do a single merge of all affected modules?", answered yes at definition 260); 14nov_c line 40 ("O7: are you certain that the watcher isn't needed?"; the watcher is kept, state 83); notice_session lines 38, 50, 86, 92 and 94.
- Statements of fact or of a problem: 14nov_b line 21 (why Process3 never finished a tranche); 14nov_b line 37 ("today nothing physically stops a session adding a test or a check to the process"; the state records his choice of 18 Nov at line 90); 14nov_c line 22.
- Permissions he gave: 14nov_b line 27 (the subtree); 14nov_c line 20 (adding the Process4 work to the public repository; definition 485, state 101).
- Tasks for one session: 14nov_c lines 61, 63, 68 and 72; notice_session lines 9 to 16 and 108.

## 5. Requirements that are not MET, most serious first

All five are PARTLY. None is NOT MET, CONTRADICTED or CANNOT TELL.

1. Users retested when a provider's interface changes (row 47; notice_session line 28: "any change to either a provider's domain or range necessitates that its users be retested"). Users are told, and the state says a told job runs only the tests that relate to the changed parts (state 21). How a told job picks those tests is owed (state 139), and the definition calls what a told job does "not studied" (definition 354).
2. No added tests, gates, reviews or checks (row 21; 14nov_b line 34: "Do not add tests, gates, reviews or checks."). The rule is stated (state 16 and 18). Definition 224, third item, still keeps a Process3-built record that refuses a second start of a lane session; it is marked "Claude decided", is not among the checks the definition says stay (definition 430), and is not named by the state. State 133 speaks of the tool's guards and neither file lists them.
3. The tool's own tests as he agreed them (row 35; 14nov_c line 38: "O5: agreed"). The tests are kept (state 20). The size limit on a role's starting text, which the definition gives as part of what he agreed (definition 299), is taken out by a line marked "Claude decided" (state 19). His words of 18 Nov are unread, so whether he changed this himself is unknown.
4. How sessions speak to him (row 17; 14nov_b line 30 and 15nov_main line 17). Plain words are required for decisions, for the blocked message and for questions (definition 13, 192 and 372; state 50). No line requires it of everything a session tells him, or says that he is given the context and no codes, shorthand or references to things he has not seen.
5. Eight slots across the account (row 37; 14nov_c line 41: "O8: across the account"). Stated (definition 21 and 254). How the eight are counted when two products run at once is not settled (definition 498). It matters only when a second product starts.
