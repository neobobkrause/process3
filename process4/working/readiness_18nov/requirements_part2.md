# Bob's requirements of 16 and 17 Nov, checked against the Process4 design (part 2)

Length: 221 lines. Last section: "Not MET, most serious first".

Written by Claude on 18 Nov 2026, as a worker for the session judging whether the design is ready to be built from. It reports only what was read. Nothing here judges whether a requirement is wise, and nothing here proposes a test, check, gate, review or stop.

## What was read

All read in full:

- The sixth draft: `process4/definition/process4_definition_v6.md`, 597 lines.
- The design state, which rules: `process4/working/design_state_18nov.md`, 143 lines.
- The shortcomings list: `process4/working/codex_shortcomings_to_fill.md`, 54 lines.
- Five files of Bob's words in `process4/owner_words/`, named below by a short name:
  - "development file": `bob_words_16_17nov_codex_development.md`, 89 lines.
  - "context file": `bob_words_17nov_codex_context.md`, 31 lines.
  - "compaction file": `bob_words_17nov_compaction_avoidance.md`, 23 lines.
  - "fresh-context file": `bob_words_17nov_fresh_context_and_process_self_development.md`, 20 lines.
  - "membership file": `bob_words_17nov_project_membership.md`, 19 lines.

Unread: every other file, among them the folders `process4/working/harness_separation/` and `process4/working/reading_measurements/`, the Codex register, and the other four files in `process4/owner_words/`. Only the quoted blocks in the five files are taken as Bob's words. The headings and the readings around them are the Codex assistant's and are not counted.

## How the verdicts were given

- These five files are Bob speaking about Process4 on Codex. Where the design states a rule for every harness, and the shortcomings list says the means of carrying that same rule on Codex is not known, the verdict is PARTLY, and the entry says so.
- Where the design states the rule and no shortcoming is named against it, the verdict is MET, even though sections M and O of the sixth draft say nothing is built and little is proven. This file checks the design, not what is built.
- The values of the maximums and the fill level are provisional on Bob's own word of 18 Nov (design state line 43). A requirement that limits be set is counted MET where a provisional value stands, and the entry says it is provisional.

## Every requirement that stands

Forty requirements. Each has Bob's words, where they are, the verdict, and the design's line.

### Running with nobody watching, and what comes to Bob

1. "I'm looking for you to run your assessment end-to-end without stopping to give me progress reports and ask whether you should continue." Development file, line 9. Said of the Codex assessment; read here as a requirement on Process4's sessions.
   **MET.** Design state line 110 ("Development work continues as long as there is work that can still be done productively, efficiently and safely"); line 61 (the account after each round: "Nothing waits on it"); sixth draft line 372.

2. "If there are technical decisions to be made, then the sessions you create in support of the process4 process should take responsibility for analyzing the reported conditions, giving proper consideration for the assessment's objectives (study the resources that you have available as needed), and make an informed decision about how to proceed." Development file, line 9.
   **MET.** Sixth draft line 13 ("The AI decides everything technical and tells you in plain words what it decided") and line 194 (ARCH decides every technical matter); design state line 11.

3. "Only bring problems to me when they're the proper level of issues that I need to be involved with." Development file, line 9.
   **MET.** Sixth draft line 192 (the coordinator "brings you no technical question") and line 372; design state lines 50 and 51.

4. "Can you correct the conditions that caused you to stop so that it doesn't happen going forward?" Development file, line 15, after "Why have you stopped? (That's a real question.)" at line 13. A question in Bob's words; read here as: a stop that nothing called for is corrected at its cause.
   **MET.** Design state line 126 ("A stop that nothing called for is a process fault"; the session is woken or replaced, and the case may be studied and reported to PROCESS).

### Cost

5. "It was my understanding that the VM would be one running in OpenAI's infrastructure and the cost of which would be covered as part of my ChatGPT subscription." and "Are you in fact designing something that will require additional costs outside of the subscription?" Development file, line 21. Worded as an understanding and a question.
   **MET.** Design state line 129 ("A harness runs AI sessions only on what Bob's subscription covers. Anything that would cost more comes to him first").

### Sign-in and grants on Codex

6. "Yes, Codex process4 should be prepared to handle if OpenAI invalidates the renewable authorization, I revoke it, or all valid refresh credentials are lost." Development file, line 27.
   **PARTLY.** Design state line 84 gives one way back after any full stop (Bob starts ROOT, which rebuilds from the shared state and the repository). Missing: no line names these three conditions or says what Process4 on Codex does when one happens. The shortcomings list, lines 41 and 42, says it is not known where a secret is kept on Codex or which account a Codex session acts as.

7. "But these must be exceptional conditions that don't occur as part of my Codex account UX." Development file, line 27.
   **PARTLY.** Design state line 127 ("A full stop happens only if the token is not replaced in time") covers a token running out. Missing: nothing on an authorization that is invalidated, revoked or lost, so nothing says these stay exceptional.

8. "It might be reasonable to ask me to be involved in refreshing the token before the 30 day expiration date. But the Codex version of process4 must recognize and cleanly support that act." Development file, line 29.
   **PARTLY.** Design state line 127 states the rule for every harness (each act of Bob's with a known date is on his standing page before the date, with the steps; a token is renewed before it expires). For Codex it is met only by naming a shortcoming: the shortcomings list, line 53, puts the 30-day sign-in renewal under things "the design does not yet use", and line 30 says it is not known how Bob is notified when he is away.

9. "study in-depth the grants the Codex-based development would need, and propose how to put the proper grants in place for Codex's use. Experience in Claude tells me that it's very important that you get this right. So don't guess or assume. Your work here should be load-bearing." Development file, line 33. With it, line 31: "Does Codex have similar support for the situations were up against here and others that are certain to be discovered? Explain."
   **PARTLY, and only by naming shortcomings.** The shortcomings list, lines 11 to 13, says it is not known what carries Bob's approvals, the list of forbidden commands, or the stand-in for the permission checker on Codex; line 14 says of the grants study and proposal: "No result is in this repository." The sixth draft's section I (lines 400 to 424) is written for Claude Code only.

### What a job may change

10. "Jobs are only supposed to modify their module and tests" Development file, line 41.
    **MET.** Sixth draft line 196 ("It writes only its own module's files"; "held by the job's instructions and not by any check").

### Messages between sessions

11. "Confirm that the communications between sessions will be reactive - meaning a message sent to a session immediately wakes up that session to handle the incoming message." Development file, line 47.
    **PARTLY.** Design state line 128 states the rule ("A message wakes its receiver at once") and says a harness not shown to do so is noted as a shortcoming. For Codex it is met only by naming shortcomings: the shortcomings list, lines 26 to 29 (whether a plain message wakes an idle child; how one chat reaches another chat's children; whether a scheduled wake reaches a child; how a running child is interrupted).

12. "I think that Codex needs to be careful about using github as a communications channel." Development file, line 49.
    **PARTLY.** Design state line 118 states the rule (what sessions say to each other and the running records "never build up as files or commits in a repository"; the shared state is a small fixed set of records rewritten in place). Missing for Codex: the shortcomings list, line 43, says where the shared state lives is not settled, and cites these words of Bob's against the sixth draft keeping it on GitHub (sixth draft line 235).

### Bob's access to sessions

13. "Yes, the coordinator is the front door." Development file, line 51.
    **MET.** Design state line 49; sixth draft line 192.

14. "But interacting with lanes is crucial, as this is where architecture and design decisions are made." Development file, line 51.
    **PARTLY.** Design state line 49 states the rule (he may watch and sometimes speak to ARCH and to lanes; a marked message given to a lane is followed; he works with a lane through its design pages). For Codex it is met only by naming shortcomings: the shortcomings list, line 18 (whether a role can be a session of its own that Bob can open) and line 19 (how "Bob speaks to ARCH, lanes and PROCESS" is carried).

15. "I rarely interact with jobs, but seeing their progress and status is important." Development file, line 51.
    **PARTLY.** Design state line 119 states the rule ("Bob can see each open job's progress and status without speaking to it"). Missing: no line read says by what means he sees it; and for Codex the shortcomings list, line 18, says it is not known whether a role can be a session Bob can open.

16. "I of course need to interact with PROCESS when issues arise." Development file, line 51.
    **PARTLY.** Design state line 49 ("with PROCESS directly") and sixth draft line 218 state the rule. For Codex it is met only by naming a shortcoming: the shortcomings list, line 19.

17. "Just to name it - all of these sessions may need to stay active beyond the completion of their initial scope of work. So these are truly and fully interactive sessions." Development file, line 53. Narrowed by Bob at line 57 (entry 18), and by his ruling of 18 Nov at design state line 127, where sessions are short-lived and a role lasts.
    **PARTLY.** Roles last and are refreshed (design state lines 80, 81 and 127), and Bob may speak to ARCH, lanes and PROCESS (line 49). Missing: no line says a job's session stays open to him after its work is merged; design state line 119 has a finished session archived. For Codex, the shortcomings list, lines 18 and 19. Whether "all of these sessions" takes in jobs cannot be told from his words.

18. "FYI, process4 has no need for subagents to stay alive once their initial scope of work is completed." Development file, line 57.
    **MET.** Design state line 116 ("the worker ends when its work is done").

### Grouping and archiving

19. "Again, I see no need for subagents to be members of a project. Only jobs, lanes, ARCH, ROOT, and the process coordinator sessions should be kept in the project." Membership file, line 7.
    **PARTLY.** Design state line 119 states the rule in the same terms ("A product's ROOT, ARCH, coordinator, lanes and jobs are grouped under that product; workers are left out"). For Codex it is met only by naming a shortcoming: the shortcomings list, line 54, puts grouping sessions in a project under things the design does not yet use, "not verified".

20. "Under Claude, sessions that are no longer active are archived so that they don't clog up the session list. There's no downside to archiving sessions because they can be found, reviewed, and even unarchived." Development file, line 67, followed by his question whether Codex has the same.
    **PARTLY.** Design state line 119 states the rule ("A finished session is archived, not deleted"; the session that started it archives it). For Codex it is met only by naming a shortcoming: the shortcomings list, line 44 (documented, but the trial's tools had no way to do it).

### Keeping to the canon, and reading in full

21. "It's essential that the resulting workflow give proper consideration and abide by the mission, principals, standards, requirements, and design decisions documented in the canon." Development file, line 73.
    **MET.** Design state line 125 (one short page for each product that ranks mission, principles, standards, requirements and design decisions; a lower one never overrides a higher one), with the reading-in-full rule at line 38.

22. "The model must not mistake a local implementation decision for permission to violate a higher-level principle." Context file, line 13.
    **MET.** Design state line 125 ("A lower one never overrides a higher one. A session that finds two in conflict follows the higher and tells ARCH").

23. "My Claude experience confirms that incomplete reading (scanning) to be a very significant danger that must be mitigated." Context file, line 9.
    **MET.** Design state line 38 (every text read in full, and every set read together, is kept below a measured maximum) and line 42. The values are provisional (line 43).

24. "So it's essential that Codex-based process4 utilize these process4 constructs." Context file, line 9. The constructs are those of entries 25 to 29.
    **PARTLY.** The constructs are stated for every harness (design state lines 38, 40, 80 and 116). For Codex they are met only by naming shortcomings: the shortcomings list, line 20 (whether a job that is a child can start a helper), line 34 (no reading of how full a context is, so a refresh at a fill level cannot be triggered), line 36 (the limit on instruction files) and line 37 (no measured maximums that can be relied on).

25. "strict limits on the size of handoff documents" Development file, line 77. Also "process4 defines specific limits on things like session handoff document sizes", context file, line 11.
    **PARTLY.** Design state line 38 limits every text a session must read in full, and line 43 gives a single text 24,000 bytes, provisionally. Missing: neither design file names a handoff document or gives one a limit. Design state line 80 has a successor start "only from the shared state and the repository", and line 120 speaks of "a handover" with no size.

26. "session refresh requirements that rigorously eleminate the need for compaction" Context file, line 11. Also "session refreshes", development file, line 77.
    **PARTLY.** Design state line 80 (a long-lived role is refreshed on purpose, at a natural pause or at a stated fill level, whichever comes first) and line 43 (40 percent, provisional). Missing: no line read says how a session learns how full it is; for Codex the shortcomings list, line 34, says a refresh at a fill level "cannot be triggered". Design state line 126, Bob's ruling of 18 Nov, still speaks of "a stop caused by a compaction".

27. "limits on the size and complexity of process4's principals of operation" Context file, line 11.
    **MET.** Design state line 40 (each role's principles concise, sufficient and clear, short enough to be read in full) and line 43 (a role's starting text 4,096 bytes and at most ten rules, provisional); sixth draft line 434 ("One short rulebook per role, at most ten rules").

28. "limits on the scale of canon elements" Development file, line 77.
    **MET.** Design state line 38, line 41 (a module's requirements file is kept under the maximum; ARCH splits a module that nears it) and line 43 (provisional values).

29. "the copious spawning of worker sub-sessions with targeted goals that it could produce for the benefit of its parent" Development file, line 77. Also "the use of highly targeted and structured subagents to do research and complete tasks for the benefit of parents without clogging the parents' context window", context file, line 11.
    **MET.** Design state line 116 (workers are the standing way a long-lived role keeps heavy reading out of its own context: a narrow brief, a short answer in a set shape); sixth draft line 198. The Codex gap for a job's helper is counted under entry 24.

30. "these workers are also sometimes tasked with making material decisions based on information they gather." Context file, line 15.
    **MET.** Design state line 116 ("A brief may hand the worker a decision to make, which it reports with its grounds").

31. "I agree with your recommendation of using options A and C, along with other tactics already inherent in the process4 design like its session refresh strategy and others." Context file, line 15.
    **CANNOT TELL.** None of the files read says what options A and C were. The recommendation is in a conversation that is not in these files.

32. "process4 should be designed and always run in GPT-6 or later models" Context file, line 7; the sentence goes on "having context windows of 1m tokens or more", which Bob later replaced (see "Replaced by Bob's later words").
    **CANNOT TELL.** His later words withdraw the 1m tokens and do not speak of the model. If "GPT-6 or later" still stands, no line of the design names a model for Codex: sixth draft line 233 says only a model and effort "sufficient for quality", and the shortcomings list, lines 21 and 35, says it is not known how a model is passed on or what window a hosted session has.

33. "We need to thoroughly understand ChatGPT and Codex context management operates." and "With that understanding, the Codex version of process4 will work optimize Runtime strengths and overcome it's shortcomings." Development file, line 79. Also "We need to investigate and fully consider the Codex environment as unique from that of Claude and develop a load-bearing understanding and strategy for it.", context file, line 19.
    **PARTLY, and only by naming shortcomings.** Design state line 39 says the Codex maximums are used and "The values are not yet settled". The shortcomings list, lines 34 to 37, says the fill reading, the real window, the instruction-file limit and the measured maximums are all not known.

### Stepping around a weakness before it does harm

34. "the most effective means of mitigation is to avoid situations when the shortcomings become a factor. But a fundamental requirement of this approach is to identify (or sense), either at runtime or when coding, when the shortcoming is about to come into play." Compaction file, line 7.
    **PARTLY.** Design state line 114 states the principle and says "For each such weakness the design names the sign that it is near and what the session then does". Missing: neither design file holds that list of weaknesses, each with its sign and the session's act. The one sign named is a stated fill level (design state line 80), and on Codex that sign cannot be read (shortcomings list, line 34).

35. "If a Codex-based process4 is even a possibility requires that we be able to avoid compaction entirely, because any work that happens after an unrecognized compaction could cause (silent) damage that difficult/impossible to recover from." Compaction file, line 7. Also "we need to be realistic about the risks of continuing to rely on compacted sessions, whether this one or any other.", fresh-context file, line 7.
    **PARTLY, and only by naming a shortcoming.** The rule is the refresh at design state line 80. For Codex the shortcomings list, line 34, says there is no reading of how full a hosted session's context is and no signal that it has compacted, so "a refresh at a stated fill level cannot be triggered, and only 'at a natural pause in its work' can operate". Nothing read shows compaction can be avoided entirely on Codex, or recognised when it happens.

36. "What they require is sufficient token to perform enough useful - and correct! - work to justify the investment of time and tokens, all while protecting development from damage caused by things like document scanning, compaction, and other context management shortcomings." Compaction file, line 9.
    **PARTLY.** Design state line 120 states the yardstick (after a session has read what it must, there is room for a worthwhile piece of correct work and a handover before the fill level). Missing: the values chosen by it are provisional, Bob judged the first measurement too weak to rely on (line 43), and a second is owed (line 138); for Codex the real window was not observed (shortcomings list, line 35).

37. "This research confirms process4's policy of refreshing sessions when the context window exceeds 40% or more." Compaction file, line 11.
    **PARTLY.** Design state line 43 has the fill level at 40 percent, provisionally, and line 80 has the refresh at a stated fill level. For Codex the shortcomings list, line 34, says that refresh cannot be triggered.

38. "What we need to do rigorously while we're exploring a Codex-based process4 version is identify those conditions and limits that will provide the assurances we need to productive work at a reasonable investment of time and tokens." Compaction file, line 11.
    **PARTLY.** Design state lines 39 and 43 hold provisional limits, and line 138 lists a reliable second measurement as owed. The shortcomings list, line 37, says the repository holds sizes shown to work once on filler text, no size at which reading failed, and nothing measured for a role's starting text or for the fill level.

### Process4 developing itself

39. "I also suggest that we prioritize trying to get process4 development to the point that its constructs can be used for its further development." and "the infrastructure we in place for your work to continue as PROCESS, with lanes, as needed, used for continuing work related to context management, permissions management, inter-session communication and coordination, etc." Fresh-context file, line 9.
    **MET.** Design state line 115 ("Process4 develops itself. PROCESS may have lanes of its own for standing subjects, as needed"). The word "prioritize" is about the order of the work, which the design does not set; it is not judged here.

### Claude Code and Codex side by side

40. "Confirm that changes being added to the process3 repo in support of a Codex-based development process are NOT overwriting the Claude Code support, correct?" Development file, line 85.
    **MET.** Design state line 130 ("Each harness's own files are kept apart in the process's repository, and a change for one harness never alters the other's").

## Replaced by Bob's later words

Not counted against the design.

- "having context windows of 1m tokens or more" (context file, line 7). Replaced by "In that light, process4 sessions don't require 1m tokens." (compaction file, line 9).
- "For process4 sessions running under Claude Code, we would start looking to refresh them at 50%." (development file, line 65). Replaced by "refreshing sessions when the context window exceeds 40% or more" (compaction file, line 11) and by the 40 percent of design state line 43.
- "Would it make sense for process4 sessions working on the same development product (like civicsmith) would all be in the same project?" (development file, line 63). A question; replaced by his clarification in the membership file, line 7 (entry 19), which leaves workers out.
- Replaced in part: "all of these sessions may need to stay active" (development file, line 53) no longer reaches workers, by line 57 of the same file. What stands of it is entry 17.

## Bob's words in these files that are not requirements of Process4

Listed so that nothing is passed over in silence.

- Development file, line 11 ("So why are you stopping to tell me you don't yet have that plan formulated...") and line 35 ("Now you need to build according to this plan and test and evolve it until it meets all requirements. Go."): instructions to the Codex session about its own work. The plan is not in the files read.
- Development file, line 39 ("ROOT never just died on its own"): a statement of what happened under Claude Code.
- Development file, line 41 ("I see role-specific permission enforcement as important and useful, but not essential."): says such enforcement is not essential. The design holds the job rule by instructions and no check (sixth draft line 196).
- Development file, line 49, second sentence: the reason for entry 12.
- Development file, line 51 ("ARCH used to be the front door, and it continues to play a very important role."): a statement. Design state line 49 lets him speak to ARCH.
- Development file, line 75: what Bob saw Claude do with documents too large for its context.
- Development file, line 87: asks the Codex session to save what it learned in the repository.
- Context file, line 17, compaction file, line 13, and fresh-context file, line 9, first two sentences: agreement that experiments be run in a fresh, separate session. Work to be done, not a rule of Process4. Design state line 115 carries the general form (a hard open question gets a session of its own with a written brief and a bounded task).

## Counts

40 requirements stand. MET: 17. PARTLY: 21. NOT MET: 0. CONTRADICTED: 0. CANNOT TELL: 2. Of the 21 PARTLY, 19 rest wholly or in part on a shortcoming named for Codex (all but entries 7 and 25).

## Not MET, most serious first

1. **Avoiding compaction entirely on Codex** (entry 35; compaction file, line 7). PARTLY, only by naming a shortcoming. Bob makes this the condition for a Codex-based Process4 being "even a possibility". The shortcomings list, line 34, says a refresh at a fill level cannot be triggered on Codex and no signal shows a compaction has happened.
2. **The grants for Codex, studied and proposed, not guessed** (entry 9; development file, line 33). PARTLY, only by naming shortcomings. What carries Bob's approvals, the forbidden commands and the stand-in for the permission checker on Codex is not known, and no study or proposal is in the repository (shortcomings list, lines 11 to 14).
3. **Sensing when a weakness is about to come into play** (entry 34; compaction file, line 7). PARTLY. Bob calls it "a fundamental requirement of this approach". Design state line 114 says the design names, for each weakness, the sign and what the session then does; neither design file holds that list, for either harness.
4. **Bob's interaction with lanes and with PROCESS on Codex** (entries 14 and 16; development file, line 51). PARTLY. Bob calls interacting with lanes "crucial". The rule is at design state line 49; how it is carried when every role is a child inside one chat is not known (shortcomings list, lines 18 and 19).
5. **Messages that wake the receiver at once** (entry 11; development file, line 47). PARTLY. The rule is at design state line 128; for Codex, waking, reaching another chat's children, scheduled wakes and interrupting are all not known (shortcomings list, lines 26 to 29).
6. **Codex-based Process4 uses Process4's context constructs** (entry 24; context file, line 9). PARTLY. Bob calls it "essential". Four shortcomings stand against it (shortcomings list, lines 20, 34, 36 and 37).
7. **Refresh that removes the need for compaction, at 40 percent** (entries 26 and 37; context file, line 11; compaction file, line 11). PARTLY. No line read says how a session learns how full it is; on Codex it cannot (shortcomings list, line 34).
8. **A thorough, Codex-own understanding of context management, and the conditions and limits that give assurance** (entries 33 and 38; development file, line 79; context file, line 19; compaction file, line 11). PARTLY, entry 33 only by naming shortcomings. The values are provisional and the reliable measurement is owed (design state lines 39, 43 and 138; shortcomings list, lines 34 to 37).
9. **Enough tokens for useful and correct work** (entry 36; compaction file, line 9). PARTLY. The yardstick is stated (design state line 120); the values chosen by it rest on a measurement Bob judged too weak, and the Codex window was not observed.
10. **Loss of the Codex authorization: handled, and kept exceptional** (entries 6 and 7; development file, line 27). PARTLY. One way back after a full stop is stated (design state line 84); the three conditions Bob names are not.
11. **The 30-day token renewal cleanly supported on Codex** (entry 8; development file, line 29). PARTLY. The rule for dated acts of Bob's is stated (design state line 127); the shortcomings list, line 53, says the design does not yet use the Codex renewal.
12. **Seeing each job's progress and status** (entry 15; development file, line 51). PARTLY. The rule is stated (design state line 119); the means is not.
13. **Sessions that stay active and interactive beyond their first piece of work** (entry 17; development file, line 53). PARTLY. Roles last; nothing says a job's session stays open to Bob after its merge.
14. **Limits on the size of handoff documents** (entry 25; development file, line 77; context file, line 11). PARTLY. The general maximum is stated; no handoff document is named or sized.
15. **Only jobs, lanes, ARCH, ROOT and the coordinator kept in the project** (entry 19; membership file, line 7). PARTLY. The rule is stated in his terms (design state line 119); on Codex grouping is not verified and not yet used (shortcomings list, line 54).
16. **Finished sessions archived** (entry 20; development file, line 67). PARTLY. The rule is stated (design state line 119); on Codex the trial had no way to do it (shortcomings list, line 44).
17. **Care about GitHub as a communications channel** (entry 12; development file, line 49). PARTLY. The rule is stated (design state line 118); where the shared state lives on Codex is not settled (shortcomings list, line 43).
18. **"GPT-6 or later"** (entry 32; context file, line 7). CANNOT TELL whether it still stands after Bob withdrew the 1m tokens. If it does, the design names no model.
19. **"options A and C"** (entry 31; context file, line 15). CANNOT TELL. What they were is in none of the files read.
