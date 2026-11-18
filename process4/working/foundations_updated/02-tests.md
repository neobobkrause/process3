# Process4 Foundations, part 2: The tests

Length: 65 lines. Last section: "The process's own tool".

## The tests, and why nothing is added to them

The tests are the module tests, the internal walk and the external walk. Before a release, an install and an update are each confirmed to have succeeded. That is all. This is Bob's ruling and it is closed.

The motivation is Bob's own account of Process3. He found that it never finished a tranche because it kept adding tests until progress stopped. His words are in `process4/owner_words/bob_words_14nov_b.md`. His conclusion is that these tests give a proper chance to find and debug every flaw, and to test everything that must work in a released product. Those words are in `bob_words_14nov_c.md`, and he repeats the point in `bob_words_15nov_main.md`.

Process3's record agrees with him. Measured: checks were added in 41% of Process3's merges. Measured: no tranche finished, and no walk of either kind finished without flaws.

Three conclusions follow.

- A change to the process may correct or remove what is broken. It may not add a test, a gate, a review or a stop.
- A test runs only when there is a fully informed reason to run it.
- A job's pull request merges when its module tests pass. No session reviews another session's work, and no helper is briefed to do so. There is no full regression. None of the other checks that Process3 used to stop work is part of Process4.

## Module tests

A job writes its own module's tests. Bob calls this an important responsibility and a hard one, because the tests must be complete and also fast and efficient (`bob_words_14nov_b.md`).

Bob's rule for how they are written is in `bob_words_14nov_notice_session.md`. The tests give appropriate coverage of the code. They demonstrate correct results. They show that error conditions are properly identified and communicated. They check bounds. A test does not fail because it got a different but still valid response.

This is a duty of the job, held by the job's instructions. Nothing measures it.

Every requirement is tested at the module's interface. Each test exists only to prove a product requirement, which it names. No test serves the process itself, such as its records or its bookkeeping. Claude decided this last rule; it is held by text.

Module tests run for the job's own module only. They run on GitHub's machines when the job marks its pull request ready. A failure goes back to the job, which fixes its own module.

Three things are parts of module tests.

- A comparison of the module's declared uses with what its code and its tests import.
- The process's tool may refuse a structured comment that disagrees with its own module's code.
- The process's tool may refuse a module's code that disagrees with a provider's stated interface. This applies inside that module's own tests, and to that module only.

The structured comments that state an interface's bounds also tell the job which bounds its tests must cover (part 3).

Some changes are so trivial that module tests need not run again. A mechanical edit can be one of them (part 3).

## The two walks

Bob defines both walks in `bob_words_14nov_b.md`.

The internal walk uses the Screens document to confirm that the workflow as built matches its definition. It is made on the product as built, without deploying it.

The external walk follows the journeys to confirm that they can be completed and give proper results. It is made on a development deployment, which reaches no one else.

They are two separate tests (`bob_words_14nov_c.md`). Walking sessions make both. Each step of a walk exists only to prove a product requirement.

How the walks fit into a round, which parts are walked, and what counts as a flaw are in part 4.

## What is not a test

The notice to user modules is not a test. Bob says so in `bob_words_14nov_c.md`. It is a way of saving work (part 3).

The confirmation before a release is not a walk. An install and an update are each run and confirmed to have succeeded. Neither is walked (part 4).

The account Bob gets after each round, and the report at the end of a tranche, decide nothing. Nothing waits on them.

## The process's own tool

The process's tool has tests of its own. They test no product. They run only when PROCESS changes the process. They never run on a product's work.

Bob agreed to this in `bob_words_14nov_c.md`. The changes recorded when the notice's method was proved become some of these tests. Claude decided that.
