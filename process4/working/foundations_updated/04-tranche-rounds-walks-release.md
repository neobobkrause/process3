# Process4 Foundations, part 4: Tranche, rounds, walks and release

Length: 97 lines. Last section: "Release".

## The tranche

A tranche is one batch of product work. It is built on the tranche branch, apart from the main branch. It reaches the main branch only as a whole, by one pull request. The main branch never moves while a tranche runs.

Before a tranche opens, ARCH proposes in a few plain lines what it is for and which journeys are expected to complete at its end. ARCH names any journey left out, and why. Bob approves or changes the proposal.

Claude's reasoning in the design: a tranche with a named purpose brings its walks sooner, and a journey named as left out is neither counted as a flaw nor hidden.

## A round

A tranche is worked in rounds. A round has three steps.

1. Jobs. Every module that has work gets its job.
2. The internal walk, made when the round's jobs are done.
3. A development deployment and the external walk. These happen only when the internal walk finds no flaws.

Claude decided this order. Whether a round's jobs are done has one right answer, so the process's tool decides it.

A flaw found by either walk becomes work for a named module in the next round, not the next tranche. Bob's words on this are in `process4/owner_words/bob_words_14nov_b.md`. The tranche ends when a round's external walk comes clean.

ARCH's session makes the development deployment. Walking sessions make both walks, and they walk whatever product is being developed. Claude decided that walking sessions use the job slots, because a walk happens when no job is open, and that a walk is shared out among them.

How a development deployment is made, and on what, depends on where the product is hosted. The design gives that in a table for each hosting provider (part 6). How many walkers the product's hosting account can bear is unproven, and is measured in the trial.

Claude Code: a session can run one thing for about 30 minutes (measured). Process3's two late runs of a deployment and walk took 60 and 64 minutes (measured). So one walk has to be shared among several sessions. A shared walk has never run and is unproven.

Codex: whether a like limit applies there is not known. See `process4/working/codex_shortcomings_to_fill.md`.

While a tranche runs, ARCH prepares what the next round or the next tranche needs.

## Partial walks

Every round's walks are partial, the first round's included. Before each walk, ARCH names the areas that the round's updates affect. A partial walk is without flaws when it lists no flaw in the areas it was given.

A full external walk is something Bob opts into. By default it is not made. If Bob asks the coordinator for one before a round's partial walks come clean, it is made, and the tranche then ends only if that full walk is clean. A full walk is without flaws when it lists no flaw and leaves out no step that the walk before it made.

Writer's reading: partial walks apply to the walks the rule that a test runs only when there is a fully informed reason to run it. The areas a round changed are the informed reason.

Sometimes it is in doubt how a change will affect the product, and inspecting or testing the code cannot settle it. Then the walks exercise the running workflow concerned. If it does what is expected, there is no problem. Claude's reading, not yet confirmed by Bob: this adds no test. It is part of what ARCH names for a round's walks. It is not stated as a habit in any role's principles.

There is no walk outside a tranche.

## What counts as a flaw

A flaw is one of three things.

- The workflow as built does not match the Screens document.
- A journey cannot be completed.
- A journey completes with a wrong result.

Anything else a walker notes goes to ARCH as an observation. An observation does not hold the tranche. ARCH turns each flaw into work for a named module.

Sometimes ARCH judges that the document is wrong and the product is right. Then the UX lane corrects the document.

There are no separate lanes for sorting problems. A flaw already has its route: it becomes work in the next round.

## The walks' documents

The Screens document and the journeys are pages kept in the product repository's folder. The UX lane keeps them.

During a tranche they change only to correct an error that a walk has shown. Each such change is named in the account after the round.

Claude's reasoning in the design: kept as pages in the repository, every change to what a walk is measured against is on record.

## The account after each round

After each round the coordinator gives Bob a short account. It lists the jobs done, the flaws found, the flaws carried over, the observations set aside, the changes to the walks' documents, the rewordings made, and the cost where it can be read. Nothing waits on it.

At the end of a tranche ARCH writes one report, only from what git and GitHub already hold. It gives time, work done and left, and cost where it can be read, marked "unmeasured" where it cannot. No number in it is a target. Nothing reads it to decide anything.

## A tranche that does not come clean

A tranche that does not come clean goes on in rounds until Bob says. He then chooses between two endings. It is merged with its flaws named, and no release is made from it. Or it is dropped.

Whether a tranche can end by a clean walk is unproven. Measured in Process3: no walk of either kind finished without flaws, and no tranche was merged into the main branch. Bob's reason for that is that Process3 kept adding tests. So for a process that does not grow, the chance that a tranche fails to come clean is unmeasured. Only the first real tranche can show it.

## Release

Any tranche that has ended can be released, on Bob's approval. First an install and an update are each run and confirmed successful. Neither is walked.

What installs and what updates a product depends on where it is hosted. The design gives that in the same table for each hosting provider (part 6).

The motivation is in `bob_words_14nov_b.md`: a release may follow a completed tranche, so a release always rests on work that was tested and walked.

Claude's reading, not yet confirmed by Bob: the install and the update run on a development account. "Successful" means the installer or updater finishes without error and the site it produced starts. On a failure no release is offered, and the fault becomes work in the next tranche.

An urgent fix is a tranche whose content is that fix alone.

Built files are never committed. They are built at each walk, each deployment and each release.

ARCH prepares a release and waits for Bob's approval. Measured: no release of any kind was made in Process3. So the release path is unproven.

Promoting a release to installed sites, rolling one back, and support belong to the product's own procedures and to Bob. The process supports them with short written procedures, kept for each product (part 1). With each release it writes what changed, what the update does to stored data, and how to go back. Bob, or whoever runs the product, carries the procedures out.
