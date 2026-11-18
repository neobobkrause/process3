# Process4 Foundations, part 5: Roles and sessions

Length: 77 lines. Last section: "The way back after a full stop".

## The standing roles

| Role | Started by | What it does | What it does not do |
| --- | --- | --- | --- |
| ROOT | Bob, with a plain prompt on the product's repository | Starts ARCH, the coordinator, the watcher and PROCESS. An hourly alarm wakes it as a safety net, to wake or replace a session that has stopped | Decides nothing about the product and builds nothing |
| The watcher | ROOT | Stands by, and takes over if ROOT dies | Its takeover is not yet designed |
| The coordinator | ROOT | Is Bob's front door for a product. Records his marked words. Tells him what ARCH decided, one plain line each. Puts his questions to him. Gives him the account after each round | Decides nothing about the product. Brings Bob no technical question |
| ARCH | ROOT | One for each product, and long-lived. Directs the work: starts and merges jobs, writes requirement text, names the areas for each walk, makes the development deployment, turns flaws into work, starts the product's design lanes, prepares a release. Decides every technical matter of the product and records each decision in the product's repository | Touches no code and no tests. Never edits Bob's approvals, changes the process, or releases without him |
| PROCESS | ROOT | Is the only place the process is changed (part 8). Works in the process's own repository. Bob works with it directly | Builds no product |

ROOT and the coordinator are different sessions. Bob may watch ARCH and the lanes, and sometimes speak to them. His reasons are in `process4/owner_words/bob_words_16_17nov_codex_development.md`: the lanes are where design decisions are made, he seldom speaks to jobs but wants to see their progress, and he needs PROCESS when a process matter arises.

What the watcher does when it takes over is designed and rehearsed in the trial. That design is owed, and the takeover is unproven.

## What ARCH keeps and what the tool does

Whatever has one right answer is done by the process's tool: who takes a free slot, when a notice is sent and to whom, and whether a round's jobs are done. ARCH's session keeps what needs judgment. The tool is small: it pushes, opens a pull request and marks it ready, merges, starts the next job, sends notices and writes the shared state.

Writer's reading: this keeps ARCH's context for the work only it can do. Measured in Process3: the architecture role ran as 21 sessions in six and a half days. The share of ARCH's work that is passing things on is measured on the first tranche.

## Jobs, helpers and walking sessions

A **job** is a session ARCH starts to do one module's work (part 3). It decides how to meet that module's requirements.

A **helper** is a worker that ARCH or a job starts inside its own session. It does noisy bulk work and truly independent side tasks, and it ends when its task is done. Helpers are how a session reads a large set of documents without filling its own context. A helper may also be asked to decide something from what it gathers. Bob's words on both points are in `bob_words_17nov_codex_context.md`. No helper is briefed to review another session's work.

**Walking sessions** make both walks (part 4). ARCH starts them.

Every session passes Bob's suggested model and effort on to each session it starts. The standard is a model and effort sufficient for quality.

Sessions are at most three levels deep, and none starts its own replacement. Claude Code: the limit on depth is a measured behaviour of that harness.

## Design lanes

A lane is a standing design responsibility for one area of a product. Bob calls lanes an important element of the process (`bob_words_14nov_c.md`, sixth message).

- A lane owns a folder of design knowledge in the product's repository. It delivers designs, never product code.
- Bob identifies the need for a lane, and ARCH starts it. The UX lane is always there. It keeps the Screens document and the journeys.
- A lane is the source of truth in its area, so it is qualified before it decides anything. The first time it runs, it uses helpers to research the product's founding documents, the existing code and the best practice of its area. It answers no question until that research is recorded in its folder. Every later session of the lane reads the research first and adds to it. Bob's words on this, of 6 Nov, are quoted in `process4/evidence/foundations_tranche_9nov.md`.
- A lane decides design in its area. ARCH decides whether and when a design is built, and whether it can be built as given. A design ARCH cannot build goes back to the lane.
- Bob keeps the product's direction, audiences and principles. A decision that would change one of those comes to him, with options and the lane's recommendation.
- Questions reach a lane through ARCH. A job never talks to a lane, and lanes do not talk to each other. Bob works with a lane through its design pages.
- A lane runs as one session at a time. Whether that session is kept running or is started when a question arrives is ARCH's call, judged by cost.
- A change that touches only files in the lane's own folder merges without a test run. The reason recorded from Bob is that the modules using a lane's designs have their own tests, and design documents need no testing.

Claude decided that a lane session uses none of the job slots.

## How sessions are kept sound

Bob's finding, from his work with Claude, is that nothing reliably controls the conditions that degrade what a session holds in its context. Work done after a compaction that went unnoticed can do silent damage that is hard or impossible to undo. His approach is to avoid the situation, not to recover from it. These words are in `bob_words_17nov_compaction_avoidance.md`, `bob_words_17nov_codex_context.md` and `bob_words_17nov_fresh_context_and_process_self_development.md`.

The conclusions:

- Each long-lived role is refreshed on purpose. This happens at a natural pause in its work or at a stated fill level of its context, whichever comes first.
- The role asks its parent to refresh it. No session starts its own replacement.
- The successor starts only from the shared state and the repository. It takes nothing from the old session's memory.
- Texts are kept small enough to be read in full (part 6), and helpers do the heavy reading.

## Shared state

Git and GitHub hold all state, with one writer for each file. Nothing that matters lives only in a session.

What belongs to one job stays in that job's pull request. What every session needs lives in one place on GitHub, in the product's repository. It needs no merge to write, and it is written only through the process's tool. Claude decided this.

Sessions name roles, not particular sessions. So a job obeys ARCH even after ARCH has been replaced.

Exactly what the shared state holds is owed (part 10). The shared state is unproven.

## The way back after a full stop

After any full stop there is one way back. Bob starts ROOT, and ROOT rebuilds everything from the shared state and the repository. A switch to another account adds only Bob's own acts in the new account. Before a switch, Bob tells the coordinator, so that it can stop development in the old account.

Bob stops work by telling the coordinator. The stop is recorded in the shared state, and ROOT reads it at every wake, so the hourly alarm does not undo it. Measured in Process3: after a stop, the alarm went on firing and had sent 94 notifications four days later. Measured in Process3: one account switch failed and one was cancelled. Both the stop and the switch are unproven in Process4.
