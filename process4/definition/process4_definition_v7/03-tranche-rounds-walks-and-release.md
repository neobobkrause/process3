# Part 3. The tranche, rounds, walks, and release

Length: 75 lines. Last section: "8. Support beyond the process".

## 1. Opening a tranche

- Before a tranche opens, ARCH proposes in a few plain lines what it is for and which journeys are expected to complete at its end, naming any journey left out and why. The owner approves or changes it. **From a session's record:** the design state, line 55.
- The tranche is built on the tranche branch. The main branch never moves while a tranche runs (**from a session's record:** the Foundations, `foundations_tranche_9nov.md`, line 57). **Claude decided:** there is one lasting tranche branch. After a tranche merges into the main branch, the next tranche goes on from the same branch.
- A product's tranche runs on one fixed version of the process from open to close (part 6). **From a session's record:** the Foundations (`foundations_tranche_9nov.md`, lines 48 and 67).
- While a tranche runs, ARCH prepares what the next round or tranche needs. **From a session's record:** the ledger, as the sixth draft cites it (its line 194).

## 2. A round

1. **Jobs.** Every module that has work gets its job (part 2).
2. **The internal walk.** When the round's jobs are done, walking sessions walk the product as built against the Screens document, in the areas ARCH names.
3. **Deployment and the external walk.** Only when the internal walk lists no flaw is the product deployed to the development site. Walking sessions then follow the journeys there, in the areas ARCH names.
4. Each flaw becomes work for a named module in the next round. **Owner:** "if flaws are found during an external walk those flaws are added to the next round, not the next tranche" (`bob_words_14nov_b.md`).

**Claude decided** the order: jobs, then the internal walk, and deployment only after an internal walk with no flaws.

## 3. The walks

- Every round's walks are partial, the first round included. ARCH names the areas a round's updates affect before each walk. A partial walk is without flaws when it lists no flaw in the areas it was given. **From a session's record:** the design state, line 56.
- **Claude decided** what an area is. For the internal walk, a screen or a named group of screens in the Screens document. For the external walk, a journey. ARCH works out a round's areas from the modules the round changed and the notices it sent.
- **A flaw is one of three things:** the workflow as built does not match the Screens document; a journey cannot be completed; a journey completes with a wrong result. Anything else a walker notes goes to ARCH as an observation and does not hold the tranche. **From a session's record:** the design state, line 58.
- Where ARCH judges the document wrong and the product right, the UX lane corrects the document. **From a session's record:** the design state, line 58.
- Where it is in doubt how a change will affect the product, and inspecting or testing the code cannot settle it, the walks exercise the running workflow concerned; if it does what is expected, there is no problem. **Reading:** this adds no test; it is part of what ARCH names for a round's walks. It is not stated as a habit in any role's principles.
- **A full external walk is opt-in.** By default it is not made. If the owner asks the coordinator for one before a round's partial walks come clean, it is made, and the tranche ends only if it is clean. A full walk is without flaws when it lists no flaw and leaves out no step that the walk before it made. **From a session's record:** the design state, line 57.
- There is no walk outside a tranche. The only walk made on the owner's word is the opt-in full external walk. There are no triage lanes. **From a session's record:** the design state, line 63.

**The walks' documents.**

- The Screens document and the journeys are pages kept in the product repository's folder named in the process config (**from a session's record:** the design state, line 59). **Reading:** the UX lane owns them (part 4, section 3).
- During a tranche they change only to correct an error a walk has shown, and each such change is named in the account after the round. **From a session's record:** the design state, line 59.

**Who makes a walk.**

- Walking sessions make both walks, and they walk the product being developed, whatever product that is. ARCH's session makes the development deployment. **From a session's record:** the design state, line 60. **Claude decided:** ARCH starts them.
- **Claude decided:** a walk is shared among walking sessions by area, with at most as many walking sessions as there are slots. Each walking session's single run, and each step of a deployment, is kept within the time a session can run one thing.
- How a walk is made (its steps, its record, a flaw's form, and how ARCH turns a flaw into work) is in the build text `03-the-walks.md`.
- **Unproven:** that a session's browser can reach the development site; that a walk shared among sessions works; that a deployment can be made from a session in steps that fit; how many external walkers the hosting account can bear. No walk of either kind has ever been made by a session.

## 4. After each round

The coordinator gives the owner a short account: jobs done, flaws found, flaws carried over, observations set aside, changes to the walks' documents, rewordings made, and cost where it can be read. Nothing waits on it. **From a session's record:** the design state, line 61.

## 5. How a tranche ends

- **Reading:** a tranche ends when a round's partial walks, internal and external, both come clean; or, where the owner asked for a full external walk, when that walk is clean.
- **Open (the owner):** what shows that the journeys named for the tranche do complete at its end, when a round's walks cover only the areas that round changed. **Reading:** in the round that would end the tranche, ARCH adds to the external walk's areas every journey named for the tranche that no earlier round of the tranche walked clean.
- **Claude decided:** when the tranche ends, ARCH merges the tranche branch into the main branch as a whole, by pull request. None of the tests runs on that pull request.
- **Owner:** "So a tranche only ends when an external walk (of a development deployment) completes without flaws." (`bob_words_14nov_b.md`). A tranche that does not come clean goes on in rounds, or is dropped on his word. It is never merged into the main branch with flaws. (A session's summary of 18 Nov, the design state line 62, had let him merge it with its flaws named; his typed words rule, and that is withdrawn, 19 Nov.)
- **Claude decided:** one report is written at the tranche's end, by ARCH, and it lists the UX lane's changes. It is written only from what git and GitHub already hold: time, work done and left, anything deferred and why, cost where it can be read and "unmeasured" otherwise, the overhead share, ARCH's idle time while work was ready, the owner's minutes, and every change the UX lane made during the tranche to the two documents the walks are measured against. No number is a target. Nothing reads the report to decide anything.

## 6. Release

- Any tranche that has ended can be released, on the owner's approval, once an install and an update have each been run and confirmed successful. Neither is walked. **From a session's record:** the design state, line 68.
- **Reading:** the install and the update run on a development account; "successful" means the installer or updater finishes without error and the site it produced starts; on a failure no release is offered and the fault becomes work in the next tranche.
- ARCH prepares the release and waits for the owner's approval (**from a session's record:** the Foundations, as the sixth draft cites them, its line 194). No session publishes a release without it. **Owner:** sessions may never "publish a public release or promote a release to installed sites without my approval" (his approvals, Process3's `CLAUDE.md`). **Claude decided:** a development release, made only for development, is made and published in one act as a pre-release and needs no approval; his approval is for public releases.
- **Open (the owner):** who carries out the act of publishing once he has approved. **Reading:** ARCH publishes the release in the product's repository; promoting it to installed sites is the owner's, by the written procedure (section 8).
- **Claude decided** how his approval reaches the publishing session, if ARCH publishes: ARCH prepares the release unpublished and the coordinator puts it on his standing page. He types his approval in ARCH's own session, as a marked decision naming that release. ARCH publishes in that turn and passes his words to the coordinator for the record. Approval relayed through another session is not used, because the permission checker has declined consent that was only quoted. **Unproven:** that the checker accepts an approval typed this way.
- With each release the process writes what changed, what the update does to stored data, and how to go back (**from a session's record:** the design state, line 124). **Claude decided:** these notes, the written procedures of section 8 and each tranche report are kept in the product repository's process folder, named in the process config, and change as the process's named files do (part 2, section 9).
- **Unproven:** the whole release path. No release of any kind has been made by sessions.

## 7. An urgent fix

- An urgent fix is a tranche whose content is that fix alone. **From a session's record:** the design state, line 70.
- **Open (the owner):** what happens to a tranche that is open when an urgent fix is needed, since the main branch does not move while a tranche runs. **Reading:** the open tranche is paused on the owner's word; the fix is built as its own tranche from the main branch and merged; the paused tranche then takes the main branch in and goes on.

## 8. Support beyond the process

**From a session's record:** the design state, line 124, for this section.

- For each product the process keeps a short written procedure for each of three things: promoting a release to installed sites; rolling one back; and handling a problem reported from an installed site.
- The owner, or whoever runs the product, carries the procedures out. No session holds a production key.
