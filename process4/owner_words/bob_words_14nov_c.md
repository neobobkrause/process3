# Bob's own typed words, 14 Nov 2026, third message of the day to the main session (verbatim, complete)

It answers the fourth draft of the definition (process4_definition_v4.md). "M1" and so on refer to the numbered items of that draft's section M (not yet settled); "O1" and so on to the numbered proposals of its section O.

---

Process4 does have 3 tests, but calling the notification of a user module that a provider has changed isn't a test, it's simply a notification. The 3 tests are

* module tests
* internal walk
* external walk


As far as The line between correcting and adding: The 3 tests provide an appropriate opportunity to identify and debug as necessary every flaw and to test everything that needs to work in a released product. There is no need to any any more tests. PERIOD!

Explain why using the current criteria 5 of the 241 changes that AI workers judged real would have been missed. What was different in those 5 modules?

If every user is told when the implementation of a module changes but the interface doesn't, then every change will continue to cause every user of that module to be rebuilt and tested. That's very (very!) inefficient and unnecessary. There must be a practical means of identifying when a change doesn't require user modules to be updated. Maybe we should create a separate session that focuses only on this issue so that we can explore the challenge in as much detail as necessary to find a means of being more efficient during the build process.

The process3 repo is public because the development process that we're evolving is open-source software that's still in development. You have my approval to add any and all information related to the process4 update to the repo.

Many of the questions asked in section M of v4 are technical and highly detailed. You're better qualified than I am to answer many of these questions.

Here are some hints on some of the questions...
M1: ROOT
M2: There are communication channels between module jobs and ARCH, and between ARCH and the coordinator. ARCH can ask ROOT to start PROCESS if it isn't already running, and the coordinator can talk to PROCESS.
M3: the processes
M7: sessions
M10: ROOT starts with the product repo, which contains the needed approvals in CLAUDE.md and settings.json
M11: I think it has to check tests too
M12: Can the mechanical edit do a single merge of all affected modules?
M14: same as in process3

O1: We need to study this further
O2: A job for module A isn't allowed to change module B. The only other way of editing a module is when a mechanical edit (like a word table change) makes the change.
O3: needs to be studied further.
O4: internal and external walks a separate tests.
O5: agreed
O6: agreed
O7: are you certain that the watcher isn't needed?
O8: across the account
O9: agreed
O10: agreed
O11: agreed
O12: agreed
O13: three tests and no others


# Fourth message, 14 Nov 2026 (verbatim, complete)

screens and journeys are kept in docs/development/ux-substrate/ in the product repo
