# When must a module's users be told? Result of the study session

15 Nov 2026. For Bob, the owner, and for the main Process4 session. Written by Claude. Plain words, no reference codes. Nothing here is in force.

Four words are kept apart. *Measured*: counted by a script. *Estimated*: worked out from a sample. *Judged*: somebody's reading; it says whose. *Unproven*: never run.

A *provider* is a module that changed. A *user* is a module that uses it. The *tool* is TypeScript's reader, a free and widely used program that reads plain JavaScript together with its structured comments and can write out a file's interface as a listing. It does not change how the product runs.

## The answer in short

A user module is told only when the provider's interface changed in a way that user could notice. The interface is written down in structured comments in the provider's own code. A build tool writes the interface out before and after every change and compares the two. If they are the same, nobody is told.

On Process3's record this would have sent no notice for three of the eight recorded changes to the heaviest provider, 77 notifications that the record shows nobody needed (measured, one module). It has never been run as a process.

## A. What Bob settled

His typed words, exactly. The complete record of his messages is `process4/owner_words/bob_words_14nov_notice_session.md`.

| # | Date | His words | What it settles |
| --- | --- | --- | --- |
| 1 | 14 Nov | "a provider's answer to a user changing (content) doesn't necessitate the user being retested. What matters is when the interface to the provider (metadata) changes." | Content changes tell no one |
| 2 | 14 Nov | "The interface to a provider is it's domain. The bounds of valid values passed to and received from a provider are it's range. So what I'm saying is that any change to either a provider's domain or range necessitates that its users be retested. But if both domain and range stay the same, then no retesting of users is needed." | What an interface change is |
| 3 | 14 Nov | "The tests are supposed to confirm bounds, confirm the accuracy of results under valid conditions, and confirm the recognition of an error when out of bounds. Tests should not fail because they expect a specific valid response but receive a different though still valid response." | A rule for how every job writes its module tests |
| 4 | 14 Nov | "even in loosely typed languages the formal interface can be augmented with structured comments that the language runtime doesn't see but that clarifies how the interface is to be used, and used by our build tools to determine whether the domain or range has changed so that user modules need to be updated." | The means |
| 5 | 14 Nov | "The comments and tool can also inform module tests to ensure that boundaries are properly checked." | Each stated bound gives the job tests to write |
| 6 | 14 Nov | "which event sends the notice: B" | The notice is sent when the tool's listing of the interface differs before and after the change, not when a comment's text was edited |
| 7 | 14 Nov | "the tool may refuse a disagreeing comment" | Inside a job's own module tests, a comment that disagrees with its code stops the merge |
| 8 | 14 Nov | "Who is told: ideally only the users of the entry that changed." | Who is told |
| 9 | 14 Nov | "The first time a job for a module without comments starts the first thing it does is add the structured comments." | How modules come to have comments |
| 10 | 14 Nov | "Agreed: The comments go in as a step of their own, before the job changes anything else, and they describe the module as it stands." | The first job's comments step sends no notice and gives the "before" listing |
| 11 | 14 Nov | "If those words are changing, then there must be a reason why. It must be that that interface is changing, right?" | A change to the words of a bound is an interface change |
| 12 | 14 Nov | "I agree with your recommendation" | For what a provider accepts: users are told only when the new interface cannot stand in for the old (something removed, renamed, newly required or newly refused); accepting more tells no one. For what a provider hands back: any change to an entry tells that entry's users |
| 13 | 15 Nov | "As recommended." | Inside a module's own module tests, and on that module only, the tool also refuses code that disagrees with a provider's stated interface |

## B. What Claude decided

Technical matters. Bob can overrule any. On the first he wrote, on 14 Nov, "You tell me."

1. Which parts of a provider a user uses is worked out by the tool from the user's code and comments. No list is kept by hand.
2. A user the tool cannot follow fully counts as using everything of that provider. It is told whenever that provider's listing changes.
3. A bound that a kind of value cannot express is written on its own marked line in the comment, so the tool can tell a bound from the explanation around it.
4. Comments reach inside a module: the code that checks or builds what crosses the interface says, in a comment, which kind it checks or builds.
5. Calls by name are made followable in three steps: each provider publishes one table of its operations with what each is handed and hands back; the tables are gathered into one list; each shared piece that carries a call by name gets one comment tying the name to that list.
6. The tool is TypeScript's reader, reading plain JavaScript. Both listings of a comparison are made at the same moment with the same version of the tool.

## C. The method, from start to finish

1. **A job starts on a module.** If the module has no interface comments, the job's first step adds them, describing the module as it stands and changing no running code. That step sends no notice. The listing after it is the "before".
2. **The job does its work.** It keeps the comments true. Its module tests include: the tool refusing a comment that disagrees with the module's code; the tool refusing code that disagrees with a provider's stated interface; and, for each stated bound, tests of a valid value at the bound, the right result, and a refusal outside it.
3. **At the merge the build tool writes out the module's interface and compares it with the "before".**
4. **If the two are the same, nobody is told.**
5. **If they differ,** then for each entry that changed: if it only accepts more, nobody is told; otherwise the users of that entry are told, together with every user the tool cannot follow fully.
6. **The notice names the entries that changed.** For a user the tool follows, the tool's complaints against the new interface show the lines.

## D. What was measured

All on Process3's record in `neobobkrause/civicsmith-copy`, read-only. Scripts and data are beside this file.

**The groundwork** (`study.md`). 178 changes, 2,707 notifications (measured). 40 found a user that had to change (judged, one reader).

**Bob's line on the record** (`judged40_domain_range.txt`; judged, by the study session alone). 36 of the 40 are a change of domain or range. All 26 cases where the user's code was wrong are among them. The other four broke only a test of the user's: two set the stage to suit the provider's inner workings, one wrote out one particular valid answer, one checked a built copy.

**The tool on the code as it stands, no comments added** (`iface_writeout.py`; measured).

| Of the 178 changes | Changes | Notifications Process3 sent |
| --- | --- | --- |
| Listing identical | 64 | 1,054 |
| Listing only gained something | 36 | 564 |
| Listing lost or altered something | 78 | 1,089 |

It read all 1,181 source files of 190 modules and failed on none. It describes 6,252 of 6,431 things handed to functions as "anything".

**The size of the commenting job** (`iface_surface.py`; measured by pattern counts, rough, an upper limit). 480 source files are imported by another module; they hold about 4,300 functions and methods taking about 5,700 things. The 20 providers that caused 61% of the notifications hold 65 of those files.

**Writing the comments for one module** (`trial_ai_runs/`). A helper that knew only the module's code, tests and requirements wrote the comments for ai-runs, the provider that caused the most notifications. About 27 minutes; about 1,500 comment lines; "anything" in the listing fell from 511 to 20; only comments changed (measured). By its own estimate about four fifths of the kinds and bounds came straight from the module's code; it found eleven places where code and requirements disagree and about ten kinds it could not determine without other modules' comments.

**Replaying the eight recorded changes to ai-runs against those comments, nobody updating them** (`replay_comments.py`; measured, against judged verdicts).

| Pull request | Process3 told | The record | The tool |
| --- | --- | --- | --- |
| 96 | 29 | 11 broken | 28 disagreements; 3 commented entries no longer match |
| 213 | 29 | none needed a change | Nothing; listing identical |
| 323 | 29 | none needed a change | A new method only |
| 348 | 29 | 1 adopted something new | An existing entry accepts one more optional thing |
| 391 | 30 | 1 adopted, 2 needed no change | A published list gained three names |
| 485 | 30 | none needed a change | Nothing; listing identical |
| 1004 | 23 | none affected | An answer gained a field |
| 1073 | 18 | none affected | Nothing; listing identical |

**How much the tool catches by itself** (`trial_ai_runs/interface_changes_log_pr96.txt`; the helper's counts). A second helper played the provider's job after pull request 96. It recorded 73 interface changes; 22 could break a user. The tool had complained about 5 of the 22. Fourteen were found only by reading the code, three only from tests. For 14 of the 17 a test confirmed the bound. One of the misses was tested further: with one comment line on the inner code that checks the record, the tool complained about it (measured, one case).

**Which users the tool points at** (`users_after_change.py`; measured, against judged verdicts). A third helper, not knowing the change, added comments to the 22 user modules with code, saying what each was handed. After pull request 96 the tool pointed at 5 of the 11 broken users, was silent on 6, and pointed at none of the 18 that were not broken. The six misses: operations called by name (2), a message between two separately running parts (1), a disagreement already standing (1), a test passing a caller's values straight on (1), tests writing rows straight into the provider's table (1). One of the by-name misses was tested further: with a nine-line comment on the test's own request helper, the tool flagged the two lines (measured, one case).

## E. What is not proven, and what a load-bearing approach still needs

Unproven: all of it as a working process. Every measurement above is a single module or a single case on a past record, and three helpers' work was checked only as far as "nothing but comments changed".

| What is needed | Why | Where it stands |
| --- | --- | --- |
| Comments reach the code inside a module that checks or builds what crosses its interface | Without it the tool caught 5 of 22 breaking changes | Tested on one case |
| Calls by name made followable | It is the main route between modules | Tested on one case |
| Two separately running parts share one written kind for each message between them | The tool cannot read across a connection | Untested |
| A module starts with no standing disagreement with its providers | A new complaint hid behind an old one | Settled by Bob's word of 15 Nov; not yet applied |
| The tool can say whether it follows a user fully | The rule "not followed means uses everything" depends on it | Untested |
| The refusal fires only on real disagreements, not on "I cannot tell" | Eight false complaints in one module | Not solved |
| Bounds written as kinds wherever possible, and one test named for each bound that remains | A change of meaning under an unchanged name is invisible to the tool | Bob's rule; not yet applied |
| Existing tests brought to Bob's rule on tests | Some write a provider's rows or spell out its answers | Not started |
| A real run on a few modules through several changes | It is the only proof | Not started |

## F. For the main session

1. **The definition's section on the notification** can now say what counts as an interface change, which event sends the notice and who is told, in Bob's words (section A), with section B marked "Claude decided".
2. **The record's line 10** ("A user module's job checks the implications of those parts and no others, and updates and runs only the tests that relate to them") was not studied here. What a told job does is still open.
3. **The first trial on the throwaway repository** with made-up modules is the place to prove this. The made-up modules should include: a provider reached by a call by name; a provider reached across a connection; a bound the tool cannot see; a change that only accepts more; a change that hands back something new; and a user the tool cannot follow.
4. **Two questions from the groundwork were not reached:** who is told when the product's module list itself changes, and what becomes of a declared use that no code backs (510 of the 2,707 notifications).

## G. Files

| File | What it is |
| --- | --- |
| `process4/owner_words/bob_words_14nov_notice_session.md` | Every message Bob typed to this session, exactly |
| `session_brief.md`, `study.md` | The starting brief and the groundwork |
| `judged40_domain_range.txt` | The 40 broken cases sorted by Bob's line |
| `iface_writeout.py`, `data/iface_writeout.json` | The tool over the 178 changes, no comments |
| `iface_surface.py`, `data/iface_surface.json` | The size of the commenting job |
| `trial_ai_runs/blocks/` | The comments written for ai-runs |
| `replay_comments.py`, `data/replay_comments.json` | The eight changes replayed |
| `trial_ai_runs/interface_changes_log_pr96.txt`, `trial_ai_runs/provider_comments_after_pr96.diff` | The provider's job after pull request 96 |
| `trial_ai_runs/users_comments.diff`, `users_after_change.py`, `data/users_after_change.json` | The 22 users |

Scripts run with `python3 -I <script> <path to the tool> <a scratch folder>` against a clone of the product at `/home/user/repos/civicsmith-copy`, and need TypeScript installed (version 5.6.3 was used).
