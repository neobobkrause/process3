# Brief for a session on one question: when must a module's users be updated?

Written 14 Nov 2026 as the starting text for a separate session that continues this study with Bob, the owner. It stands on its own; the full study is `/home/user/work/notice_study/study.md`.

## How to talk to Bob (his standing rules)

- **Plain words.** No reference codes, no shorthand, no rule letters. Say "the rule that tells a module only when something it names has changed", not "g1". Module names are fine. Explain any technical word the first time, in a sentence.
- **Only his own typed words count as his.** Quote them exactly, with the date. Anything a session wrote down for him is the session's record, not his words. Never say "you decided" for something he did not type.
- **No assurances.** Do not say a thing works, is safe, or will hold unless it was measured, and then say what was measured and on what.
- **Keep four things apart, every time:** *measured* (counted by a script), *estimated* (worked out from a sample), *judged* (somebody's reading; say whose), *unproven* (never run).
- **No new tests, checks, gates or reviews.** Process4 has exactly three tests: each job's own module tests, the internal walk, the external walk. The notice to a user module is a notification, not a test. No session reviews another's work. A remedy may be: a sharper statement of what a module's interface is; a rule the provider's job follows when it writes requirements and tests; a mechanical rule for who is told, worked out from the change itself; a way for the told module to dispose of a notice cheaply; a change to how modules publish what others rely on.
- **When you propose changing something he defined,** describe the proposed change in words he understands and wait for his yes or no. His words of 14 Nov: "When you change something I defined you need to describe the PROPOSED change in words I understand so that I know what you're proposing and whether to approve the change or not."
- He enters no commands and edits no files. Bring him questions that are his (what the product and the process should be), not technical ones. Put a question once, with the options and what each costs.

## The question, in his words

Typed 14 Nov 2026:

> "If every user is told when the implementation of a module changes but the interface doesn't, then every change will continue to cause every user of that module to be rebuilt and tested. That's very (very!) inefficient and unnecessary. There must be a practical means of identifying when a change doesn't require user modules to be updated. Maybe we should create a separate session that focuses only on this issue so that we can explore the challenge in as much detail as necessary to find a means of being more efficient during the build process."

> "Explain why using the current criteria 5 of the 241 changes that AI workers judged real would have been missed. What was different in those 5 modules?"

Background he has set (the session's record of 13 Nov, which he has referred to as his decisions): the product is about 220 modules in one order; a module may use only modules before it; each module is built and tested by one job; "When a job changes a module's interface, every user of that module is notified, so those modules' jobs are updated as needed and tested"; "Recognising that an interface changed must be proved rigorous and correct."

## What exists to measure against

Process3, the earlier process, left a record in `/home/user/repos/civicsmith-copy` (branch `origin/process-state`, folder `notices/`): 178 changes to a module, 2,707 notifications to modules that use it, and 2,342 written verdicts by AI workers, 241 "affected" and 2,101 "not affected". Each verdict gives a one-sentence reason with a file and line. An earlier replay of this record is in `/home/user/work/replay/` (`results.md`).

**Read-only.** Never commit, push, fetch into or check out in `/home/user/repos/*`. Start no cloud sessions for this work.

## What has been measured so far

**1. "Affected" did not mean "had to be updated."** For each of the 241, the study looked at what the user module's own job did afterwards. (Counts of merges and files are measured. The sorting into three kinds is judged, by one reader, from the verdict's reason, the job's own written words and the changes it made.)

| | Of the 241 |
| --- | --- |
| The user was wrong or failing until it changed ("broken") | 40 (26 in its code, 14 only in its existing tests) |
| The user changed its code to take up something new; nothing was wrong without it ("adopted") | 34 |
| The user's job changed no code for it; often it added one test saying so | 140 |
| No follow-up ever ran (the process stopped); the reason reads as nothing to change | 26 |
| Cannot tell | 1 |

So of 2,707 notifications, 40 (1.5%) found a module that needed updating and 34 (1.3%) one that chose to adopt something. The 40 are in 23 of the 178 changes. 17 of the 40 come from two changes that retired old names.

**2. What breaks users is removal.** 22 of 27 cases where a name, an operation or a field was removed or renamed broke the user. Every other kind of change (a changed answer under the same name, a changed table, a new capability, a changed way of calling) broke its user at most one time in eight. (Judged kinds.)

**3. The five that the present wording would have missed.** The present wording says the interface changed when one of four things changed: an exported name, a numbered public requirement, a test whose title names a requirement number, or a published file that is not code. In five changes none of those changed and a user was still judged affected. In all five the provider changed what its callers see, inside a function or a list, without changing anything that carries a name or a number.

| Change | What happened | What the user had to do |
| --- | --- | --- |
| agent-drafts, pull request 570, user agent-worker | Drafts stopped saying which "runner" to use. The behaviour was written down only in the other module's file | Add a guard to its code (done in a job already open) |
| agent-steps, 185, user agent-worker | A usage record lost two fields and gained two. The public requirement already described the new shape and was marked "not yet met"; the mark was left as it was | Change one line of code (in a job already open) |
| agent-steps, 497, user agent-worker | A new refusal is added to a list the user hands on. Written in no requirement | Nothing; it added one test saying so |
| ai-accounts, 316, user store-assembly | A fix: a name is now recorded as "member:ann", not "ann". Recorded as a found flaw, not as a public requirement | Respell three lines of its own tests |
| member-roster, 286, user membership | A generated list of all modules gained one, because the product's module list did | Nothing; it added one test saying so |

Three were real breaks, two were not. Four of the five involve modules that had been split apart for file size or had code moved between them that week.

**4. Why the 2,101 were not affected** (estimated from 120 drawn at random, seed 20261114): in about 39% (range 30 to 48%) the user had no code that uses the provider at all, only a line in the module list; in about 53% it used the provider but not the part that changed; the rest were small groups. Measured on all 2,707: in 510 (19%) nothing of the user imports the provider; in 685 (25%) only its tests do.

**5. Most users had work of their own anyway.** 1,735 of the 2,707 notifications went to a module that already had an unmet requirement or an open job; 33 of the 40 broken users were among them. 972 went to a module with no other work. (Measured. That week nearly everything had work; an ordinary week may differ.)

## The candidate rules and how each scored

Each rule was worked out for all 2,707 notified pairs from the code as it stood at each change. "Broken reached" uses the judged sorting above.

| Rule, in words | Notifications it would send (of 2,707) | Broken users reached (of 40) | Adopters reached (of 34) |
| --- | --- | --- | --- |
| Process3 as it ran: tell every declared user | 2,707 | 40 | 34 |
| Tell every declared user whenever the provider's code changed | 2,385 | 40 | 32 |
| Tell only users that import a name which was removed or is now called differently | 26 | 1 | 2 |
| The same, widened to methods the user calls | 124 | 12 | 9 |
| Add users whose own requirements or tests mention, by number, a public requirement of the provider that changed | 186 | 22 | 22 |
| Add users that import a test helper the change touched | 241 | 24 | 22 |
| Tell everyone, but only when a public requirement, or a test named for one, changed | 2,213 | 37 | 33 |
| Tell everyone, but only when a public requirement's wording changed or it was removed | 420 | 21 | 8 |
| **Tell a user only when something it names changed**: a name or method it uses, a table it imports, a test helper it imports, a requirement it mentions by number, or a word of the provider's that it writes out and the provider has dropped | **460** | **35** | **29** |
| The same, leaving out "a requirement it mentions became met" | 387 | 30 | 17 |
| The same as the bold rule, plus users whose own unmet requirement names the provider | 737 | 37 | 31 |
| Tell users whose own existing tests fail against the provider's change | could not be worked out by reading | | |

What the bold rule misses: five broken users. In three, what broke was a test of the user's own. Three of the five had work of their own at the time. Two (`signin-door`, `store-assembly`) had none and were found only because everyone was told.

What the rules need from jobs to be dependable (rules for writing, not checks): a module's requirement file says, by number, which of each provider's public requirements it relies on; a provider changes a public requirement's wording or its "not yet met" mark in the same change as the behaviour; a fix that changes what callers see is written on the public requirement and not only as a found flaw; a test's title names its requirement number in one standard form; a name is retired by removing it, never by leaving it with a new meaning.

## Two candidate definitions to put to him

1. **"Something this module holds was taken away or changed."** A user must be updated when its own files name something the change removed, renamed, called differently, changed the contents of, or reworded. A requirement that only became met is not a change; a user waiting for it has its own "not yet met" line, and that line makes its job run. On the record: 387 notifications; reaches 30 of the 40 broken. Unproven as a working process.
2. **"Anything this module names changed,"** including a requirement it mentions becoming met. On the record: 460 notifications; reaches 35 of the 40. Unproven as a working process.

Neither has been run. Both rest on a sorting that one reader made.

## Open questions

**For Bob's judgment (his to answer, in his words):**

1. Which matters to him: that no module is ever left wrong without being told, or that almost none is, at a sixth of the cost? On the record the cheapest rule that reached all 40 broken users sent 2,385 of 2,707.
2. When a provider's answer changes and a user simply hands it on, with no change to the user's own code, does he want that user told? That was most of the 241.
3. When a provider finishes something a user was waiting for, is the user's own "not yet met" line enough to bring its job, or does he want a notice as well?
4. A module that already has work gets a job anyway, and that job's module tests run against the provider as merged. Is that enough for such a module, so that a notice starts a job only for a module with no other work?
5. May a module's own existing tests be run because a module it uses changed, when the module has no job of its own? Two readings were written down and not decided. One: these are module tests, run for an informed reason, as his record says users' jobs "are updated as needed and tested". The other: it is a run his three tests do not list, and done everywhere it is the full regression the internal walk replaces. Only he can say.
6. Is he willing to have every job write, in its requirement file, the numbers of the provider requirements it relies on? The better rules depend on it.
7. The product's module list is itself something modules depend on (seven of them run things in its order). Who is told when ARCH edits it?
8. 510 notifications went to a module with a declared use and no import. Should a declared use have to say what it rests on?

**For more measurement (a session can do these without him):**

1. Run each user's existing tests against each of the 178 provider changes, to learn what "the user's own tests fail" would have caught. Large: up to 2,707 runs; one suite takes six minutes.
2. Have a second reader sort the 241 without seeing the first sorting, and compare.
3. Re-examine a sample of the 2,101 "not affected" for users that were in fact broken. The replay found three such users among modules never told.
4. Measure how completely modules mention the requirement numbers they rely on today.
5. Try the rules on the 365 notified pairs that were never judged and the 167 declared pairs never told.
6. Count false alarms of the "word the provider dropped" rule on code outside this record.

## Where everything is

- The study: `/home/user/work/notice_study/study.md`. Scripts beside it, run with `python3 -I <script>`; the order is at the end of the study. `signals.py` takes about five minutes.
- One row per affected verdict, with its sorting, its follow-up and which rules reach it: `/home/user/work/notice_study/data/classified241.tsv`.
- The reader's sorting of the 241: `judged241.txt`. Of the 120 sampled: `judged_sample.txt`. Rule scores: `data/rules.json`.
- The earlier replay: `/home/user/work/replay/results.md`, with its scripts and data, which this study's scripts read.
- Background: `/home/user/handoff/interface_and_cycle.md` (what a module's interface is in practice), `/home/user/handoff/no_layers_width.md`, `/home/user/handoff/process4_definition_v4.md` sections D and E.
- The record: `/home/user/repos/civicsmith-copy`, branch `origin/process-state` at `c4c252913b`, folder `notices/`; the code at `origin/tranche` `e7ec72e093`.
