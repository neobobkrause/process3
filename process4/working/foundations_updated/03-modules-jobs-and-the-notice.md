# Process4 Foundations, part 3: Modules, jobs and the notice

Length: 86 lines. Last section: "What the notice cannot do".

## Modules

A product is one ordered list of modules. A module may use only modules that come before it in the list. Every file has one owner module. The modules are not grouped into layers.

A use that points to a later module is an error in the design of those modules. It is fixed by reshaping them, not by allowing the use.

ARCH edits the list until every file has one owner and every use points backward.

Writer's reading: the single order is what makes the rest simple. It is always plain which module is the provider and which is the user, so news of a change travels one way only.

## Requirements

Each module has a requirements file, with a public part and a private part, under permanent numbers.

ARCH writes and rewords the requirement text. ARCH touches no code and no tests. The module's job marks a requirement met, in its own pull request.

A rewording that changes what the product does comes to Bob first. A rewording that only says the same thing more clearly is made, and Bob is told in the account after the round. Writer's reading: the dividing line is the one from part 1. What the product does is Bob's, and how it is said and built is the AI's.

A requirements file is kept under the measured maximum size (part 6). ARCH applies this as a rule. When a file nears the maximum, ARCH splits the module into two real modules. Nothing refuses a job or a merge on size.

## Jobs and slots

The plan of work is built around jobs running side by side, up to a number Bob can change. The number is eight by default, counted across the account. Bob changes it by telling the coordinator.

A module has work when a requirement in its file is marked not yet met, or when a walk flaw or a notice has been placed against it. Its job is ready when the module has work and no job open. A ready job does not wait for the modules it uses.

Ready jobs take free slots earliest in the order first. Only Bob's marked instruction puts a module ahead. Who takes a free slot has one right answer, so the process's tool decides it.

A job works in a draft pull request and writes only its own module's files, its tests among them. Bob's rule is that a job for one module is not allowed to change another (`process4/owner_words/bob_words_14nov_c.md`). The rule is held by the job's instructions. Bob's judgment of what he saw under Claude Code is that jobs kept to their own modules, and that stronger enforcement by role is useful but not essential (`bob_words_16_17nov_codex_development.md`).

A flaw a job finds in another module goes to ARCH, which passes it to that module's job. A job stopped by another module's flaw reports it, records that it is blocked, pushes its work and stops. Its slot is freed.

When a job completes, it marks its pull request ready and its module tests run. When they pass, ARCH merges the pull request into the tranche branch with the process's tool. There is no review and no act of Bob's. The slot is refilled in the same turn. Measured in Process3: with no event to prompt it, the directing session once noticed a finished job after 194 minutes.

Done means merged. A job never merges, starts a session, deploys or changes the process.

A job that has failed two corrections is replaced by a fresh session. The fresh session's first task is to understand why the corrections were made, so that it can foresee the ones still needed. A job session that dies is replaced by one that carries on from the same branch and pull request.

## A change across many modules

Some changes touch many modules in the same trivial way and need no judgment. Bob's example is a change to a word table. Such a change is a mechanical edit. It is the only way a module's files change other than by that module's own job (`bob_words_14nov_c.md`).

Claude decided how: a helper in ARCH's session makes the edit as one change covering every affected module. It is merged once, at a time when no job is open. A module where the change needs judgment gets its own job.

This is unproven. It is rehearsed in the trial.

## The notice to user modules

When a job changes a provider, the users of what changed are told. The notice exists to save work.

Bob's motivation is in `bob_words_14nov_c.md`. If every user were told on every change, every change would cause every user to be rebuilt and tested again. He calls that very inefficient and unnecessary.

His view of what matters is in `bob_words_14nov_notice_session.md`. A change to what a provider answers does not by itself call for its users to be tested again. What matters is the interface: what the provider accepts and hands back, and the bounds of the valid values. If those stay the same, users are left alone.

The conclusions, as the design holds them:

- A module's interface is stated in its code together with structured comments. The comments say how the interface is to be used and what its bounds are.
- A build tool writes out the module's interface, from code and comments together, before and after a job's change. The notice is sent only when the two listings differ.
- Only the users of the entry that changed are told.
- For what a provider accepts, users are told only when the new interface cannot stand in for the old: something was removed, renamed, newly required or newly refused. Accepting more tells no one.
- For what a provider hands back, any change to an entry tells that entry's users.
- A change to the words that state a bound is a change to the interface.
- A module with no comments gets them as the first step of its next job, before anything else changes. They describe the module as it stands. That step sends no notice.
- A notified job checks only the changed parts, and runs only the tests that relate to them.
- When a notice is sent, and to whom, has one right answer. The process's tool decides it.

How a notified job picks the tests that relate to a changed entry is owed (part 10). Two smaller matters are also open: who is told when the product's list of modules itself changes, and what becomes of a module that says it uses another while none of its code does.

## What the notice cannot do

After the study of this question, Bob's conclusion is that there is no reliable way to tell a change to an interface from a change to something else. His words are in `bob_words_15nov_main.md`.

So the notice is a way of saving work. It is not a guarantee. It will sometimes tell a user that needed no change. It will sometimes miss a user that did.

Nothing new catches a missed user. The user's own module tests catch it the next time that user's job runs for any reason. Or a walk meets the break, which is then a flaw and becomes work for that module in the next round. No test of users runs before a provider's change merges.

What is known about the method:

- Measured, in a proof on eleven made-up modules and 150 changes chosen to attack the method: it decides as its rules say, and it sent 2.6 times fewer notices than telling every user. Every miss that was recounted showed up as a failing test of the user.
- Judged, by AI workers reading Process3's record: about 74 of 2,707 notices sent there were needed.
- Unproven: how many notices the method saves on a real product.
- Unproven: any of it as part of a running process.
