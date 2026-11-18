Length: 81 lines. Last section: "9. Never measured".

# Background, part 2: the tests

This part gives the reasons and the evidence behind the design's rules on testing, which are in design part 2, section 6. It states no rule.

## 1. Why the tests are closed

The owner closed the list himself, three times in two days.

- His working rule of 14 Nov (`owner_words/bob_words_14nov_b.md`): "Do not add tests, gates, reviews or checks. Process4 has three tests, ever."
- The same day, answering the fourth draft (`owner_words/bob_words_14nov_c.md`): "The 3 tests provide an appropriate opportunity to identify and debug as necessary every flaw and to test everything that needs to work in a released product. There is no need to any any more tests. PERIOD!"
- On 15 Nov, when a proof session recommended a further test run (`owner_words/bob_words_15nov_main.md`): "I don't care if the proof session recommends. We are clear about which tests will be run. There will be no additional tests added to the process than the 3 already identified."

His reason is his account of Process3, quoted in part 1 of this background: it "kept adding test after test". The measured growth is in part 1, section 1.

**Which three.** The list changed once. The session's record of 13 Nov, as the fourth draft quotes it (`definition/process4_definition_v4.md`, line 54), had three tests of which one was "Notification of every user module when a job changes an interface", and no external walk among them. The owner corrected it on 14 Nov: "Process4 does have 3 tests, but calling the notification of a user module that a provider has changed isn't a test, it's simply a notification." He named the three as module tests, the internal walk and the external walk. To the fourth draft's proposal headed "The walk as one test in two forms" he answered: "internal and external walks a separate tests."

**The install and the update.** That an install and an update are each confirmed before a release came later. His words of 14 Nov, answering three readings in the fifth draft, were: "installer and website are outside the tranche" and "installer and site updates wait for a clean development release walk". The present wording (an install and an update each run and confirmed, neither walked) is from the review session of 18 Nov, as `working/design_state_18nov.md`, section 6, records it in Claude's words. No file of his typed words holds it.

## 2. What was set aside, and what it would have cost

**A test of every user before a provider's change merges.** The proof session of 15 Nov recommended it. The study session worked out the cost on Process3's record (`working/notice_study/proof_outcome.md`, assessment, point 2): a module has on average 79 users, directly or through another (measured); over the 178 recorded changes the rule would have run about 14,500 module test runs (estimated), against the 2,707 notifications Process3 sent; one user's tests took about three minutes (measured, one module). The owner's answer is the third quotation above.

**The full regression.** The session's record of 13 Nov, as the fourth draft quotes it (line 55): "No other test is necessary, ever. The internal walk replaces the full regression." This is a session's record, not his typed words. The design carries it as "no full regression, on request or otherwise" (design part 2, section 6).

**Process3's other checks that could stop work.** The fourth draft's thirteenth proposal was headed "Checks ended because there are three tests"; he answered "three tests and no others" (`owner_words/bob_words_14nov_c.md`). What those checks had cost is in part 8 of this background, section 7.

## 3. Why a job writes its own tests

The owner, 14 Nov (`owner_words/bob_words_14nov_b.md`): "Yes, a job writes its own tests. That's an important responsibility. It's also a challenge because tests must be complete yet fast and efficient."

His standard for how they are written was typed to the notice study session on 14 Nov (`owner_words/bob_words_14nov_notice_session.md`, his fourth message): "The tests are supposed to confirm bounds, confirm the accuracy of results under valid conditions, and confirm the recognition of an error when out of bounds. Tests should not fail because they expect a specific valid response but receive a different though still valid response."

What prompted it: the session had reported that, on its reading of the record, ten user modules broke after a provider changed only the content of an answer. He took that as a sign of badly written tests, not as a reason to tell more users.

The design says that nothing measures whether a job's tests meet this standard (design part 2, section 6), and lists it among the risks with no trial (design part 10, section 6). That is the state of the evidence too: no record read for this background measures the quality of tests a job wrote for itself.

## 4. The check of declared uses

The design includes, inside module tests, a check that a module's declared uses match what it imports, reading its tests as well as its source (design part 2, section 6). Two sources stand behind it.

- The words "a check that the module's declared uses match its imports" come from the session's record of 13 Nov, which the fourth draft introduces this way (line 46): "These reached this document through a session's written record, not through text you typed." The sixth draft repeats them as "The record of 13 Nov" (`definition/process4_definition_v6.md`, line 291). They are not among the owner's typed words.
- That the check reads tests too is his. The fourth draft's eleventh unsettled point asked "Whether the uses check reads tests as well as source". His answer (`owner_words/bob_words_14nov_c.md`): "I think it has to check tests too".

The evidence for wanting the check: on Process3's record, 510 notifications (19 percent) went to a user none of whose files imports the provider (`working/notice_study/study.md`, line 264). On 14 Nov he also asked about a session's count of modules that depend on each other through tests without declaring it: "Why are there so many cyclic references in the tests - just laziness? How do these errors get corrected?" (`owner_words/bob_words_14nov_b.md`). The count he quotes, 122 pairs, is the session's; this writer did not find the file that holds it.

## 5. The two refusals the owner approved

The design lets the tool refuse two things inside a module's own tests, and marks as "Claude decided" that no other refusal is taken (design part 2, section 6). His words for each are in `owner_words/bob_words_14nov_notice_session.md`. The notes in italics there are the session's account of what each message answered, not his words.

- **A structured comment that disagrees with its own module's code.** The session asked, in his seventh and eighth messages, "whether the build tool may refuse a comment that disagrees with its code, inside a job's own module tests". He first asked for the session's own view ("You know what we're trying to achieve. What do you think on both of these questions?"), and then answered: "the tool may refuse a disagreeing comment".
- **A module's code that disagrees with a provider's stated interface.** The session asked, on 15 Nov by its clock, whether the tool may also refuse this "inside that module's own module tests and on that module only", and recommended yes. His fourteenth message: "As recommended."

Why no others. The proof session's seventh design of the tool added 23 new refusals. The study session recommended none of them beyond the owner's two: "They answer attacks written to defeat the tool, and they refused honest code in every blind round" (`working/notice_study/proof_outcome.md`, under what is the owner's to decide). No words of his on the 23 were found. The design's line is Claude's decision.

## 6. Structured comments and bounds

The owner's sixth message to the notice study session: "The comments and tool can also inform module tests to ensure that boundaries are properly checked."

His word is "can also inform". The earlier form of this background said the comments tell a job which bounds its tests "must cover". That was stronger than his words and than the design (design part 2, section 6), and it is withdrawn.

## 7. Tests exist to prove product requirements

The design marks as "Claude decided" that a module's tests and a walk's steps are product work, each proving a requirement it names, and that this is a rule in text (design part 2, section 6). It is not the owner's ruling. The grounds are the figures of part 1, section 2: 105 of 508 merges changed only the process's records, and most failed test runs went green with no change to the job's code.

## 8. The mechanical edit, and the tool's own tests

**The mechanical edit.** The owner's words on it are a rule and a question (`owner_words/bob_words_14nov_c.md`). The rule: "The only other way of editing a module is when a mechanical edit (like a word table change) makes the change." The question, answering the fourth draft's point on how a change across many modules merges without a rerun of module tests: "Can the mechanical edit do a single merge of all affected modules?"

That question has not been answered by anything that ran. The earlier form of this background said a mechanical edit can be a change so trivial that module tests need not run again. The design does not say so. It marks as unproven which test run GitHub requires on that one change (design part 2, section 9), and the trial tries it both ways, with the touched modules' tests run and with none (design part 10, section 4, item 9). How the edit is made, and when, the design marks "Claude decided".

**The tool's own tests.** The fourth draft's fifth proposal was headed "Tests for the process's own tool". He answered "agreed". The proof session's rule that no version of the tool is accepted while any recorded change is answered worse than before is the origin of the design's line that the changes recorded in the proof become tests of the tool (design part 6, section 5, marked "Claude decided"; the proof's rule is in `working/notice_study/proof_outcome.md`).

## 9. Never measured

- Whether three tests are enough to find the flaws of a real product. The owner's judgment is that they are. No tranche has run under them.
- Whether tests a job writes for its own work are complete.
- What the check of declared uses, and the two refusals, cost or catch on a real product. The tool is not built (design part 6, section 5).
- Which test run a mechanical edit needs.
- The text of the fourth draft's proposals was read only at their headings and at lines 44 to 60 and 299 to 318; the owner's one-word answers are matched to them by number.
