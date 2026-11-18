# Ideas in Bob's own words that are not yet in the design, 18 Nov 2026

Length: 112 lines. Last section: "What was read".

Written by a Claude worker. It lists practices and ideas found in Bob's typed words that the design-state file of 18 Nov does not hold, and that the sixth draft does not hold where the design-state file is silent. It lists no history and no differences between older and newer words. None of the twelve adds a test, check, gate, review or stop. Nothing here is a decision. Best first.

Quotes are exact, with his spelling. "Mine:" marks an interpretation by this worker. One caution: the file `bob_words_16_17nov_codex_development.md` holds extracts that an assistant chose from a longer conversation, so its quotes are exact but not complete.

## 1. Step around a weakness before it bites, and name the sign that it is near

- **The idea.** State as a founding principle that Process4 avoids the situations where a known weakness of AI sessions does harm, and does not rely on repairing the harm afterwards. For each weakness the design steps around, say which sign shows it is near and what the session then does.
- **Bob's words.** "I find that the most effective means of mitigation is to avoid situations when the shortcomings become a factor. But a fundamental requirement of this approach is to identify (or sense), either at runtime or when coding, when the shortcoming is about to come into play." (`bob_words_17nov_compaction_avoidance.md`)
- **Why consider it.** The design already works this way for reading and for refresh, but never says so. Said once, it gives PROCESS a plain yardstick for any proposed change. It also shows a gap. Mine: refresh "at a stated fill level" works only where a session can read its own fill level and trust it. Where a harness does not give that reading, a stand-in that can be counted is needed, such as how much the session has read so far.
- **Where it fits.** The background document, as a principle. Sessions and roles (refresh). The table for each harness (what carries "fill level").

## 2. A short page that ranks a product's governing documents

- **The idea.** One short page for each product lists its kinds of governing text in order of rank and says that a lower one never overrides a higher one. Mine: the order is the one in his own list, mission, principles, standards, requirements, design decisions; and a session that finds two in conflict follows the higher and tells ARCH.
- **Bob's words.** "I'm open to the addition of a canon authority map. The model must not mistake a local implementation decision for permission to violate a higher-level principle." (`bob_words_17nov_codex_context.md`) And: "abide by the mission, principals, standards, requirements, and design decisions documented in the canon" (`bob_words_16_17nov_codex_development.md`)
- **Why consider it.** A job reads its module's requirements and ARCH's decisions. Those are the nearest and most detailed texts, so with no rank stated they win by default. A ranking page is short enough for every role to read in full.
- **Where it fits.** Documents (a page in the product's folder; mine: a like page for the process's own texts). Work and requirements. Lanes.

## 3. A stop that nothing called for is a process fault, and its cause is corrected

- **The idea.** When a session stops with work left to do and nothing that only Bob can clear, the cause is found and corrected so that it does not happen again. Waking the session is not the whole answer.
- **Bob's words.** "Why have you stopped? (That's a real question.)" And: "Can you correct the conditions that caused you to stop so that it doesn't happen going forward?" (`bob_words_16_17nov_codex_development.md`)
- **Why consider it.** The sixth draft has ROOT's hourly alarm wake or replace a stopped session. That repairs each stop and leaves its cause in place. Stops made to report progress or to ask leave to go on are what unattended work can least afford. Mine: the cause is most often a line in a role's principles, so one correction ends that kind of stop for every later session.
- **Where it fits.** Sessions and roles. The existing route for a process fault, from ARCH to the coordinator to PROCESS. It uses that route and adds nothing new.

## 4. Acts of Bob's that fall due on a known date are asked for ahead of time

- **The idea.** Where an act of Bob's has a known date, such as renewing a sign-in or a token, it appears on his standing page before the date, with the steps. The process goes on cleanly when he does it.
- **Bob's words.** "It might be reasonable to ask me to be involved in refreshing the token before the 30 day expiration date. But the Codex version of process4 must recognize and cleanly support that act." (`bob_words_16_17nov_codex_development.md`)
- **Why consider it.** A lapsed credential stops everything and only Bob can clear it. If the date is known, a full stop and a restart through ROOT become one small planned act. The design lists his acts but none with a date. Mine: the process's tool holds the dates.
- **Where it fits.** How Bob's words become decisions (the standing page and the phone notification). The list of Bob's acts. The table for each harness (what expires, and when).

## 5. Process4 develops itself: PROCESS with lanes of its own, and one session for one hard question

- **The idea.** PROCESS may have lanes of its own for standing subjects: context, permissions, messages between sessions. A hard open question gets a session of its own with a written brief and a bounded task, and that session ends with a written result once the result is usable. The remaining design work moves into these constructs as soon as it can.
- **Bob's words.** "prioritize trying to get process4 development to the point that its constructs can be used for its further development" and "continue as PROCESS, with lanes, as needed" (`bob_words_17nov_fresh_context_and_process_self_development.md`). "Maybe we should create a separate session that focuses only on this issue so that we can explore the challenge in as much detail as necessary" (`bob_words_14nov_c.md`). "Stop, write it up. It's usable, even if there's an occasional extra unnecessary notice sent out." (`bob_words_14nov_notice_session.md`)
- **Why consider it.** The design gives PROCESS one session. Every process subject held in one session fills it quickly. The study of notices already worked this way and reached a usable result. Mine: using its own constructs early is also the cheapest trial of them.
- **Where it fits.** Sessions and roles. The design does not say who starts a lane of PROCESS. Mine: PROCESS does, as ARCH starts a product's design lanes. Also the steps proposed, on trial, in force.

## 6. Workers: a narrow brief, a short answer, and sometimes a decision

- **The idea.** State workers as the standing way a long-lived role keeps heavy reading out of its own context: a narrow brief, a short answer in a set shape, and the worker ends when its work is done. A brief may also hand the worker a decision to make, which it reports with its grounds.
- **Bob's words.** "the use of highly targeted and structured subagents to do research and complete tasks for the benefit of parents without clogging the parents' context window" and "these workers are also sometimes tasked with making material decisions based on information they gather" (`bob_words_17nov_codex_context.md`). "FYI, process4 has no need for subagents to stay alive once their initial scope of work is completed." (`bob_words_16_17nov_codex_development.md`)
- **Why consider it.** The sixth draft names workers only for bulk work and parallel sub-tasks. Their part in protecting the parent's context belongs with reading in full: the worker reads in full what the parent cannot hold. A decision handed to the worker spares the parent from reading the sources again to decide. Mine: a worker's answer is kept under the same measured maximum as any other text read in full. `HANDOFF.md` records the same lesson in Claude's words, not Bob's: workers write files and return short summaries.
- **Where it fits.** Sessions and roles (workers). Reading in full.

## 7. No assurances: every session that speaks to Bob says what is proven and what is not

- **The idea.** A rule for the coordinator, PROCESS, ARCH and lanes: never assure Bob that something will work. Each claim put to him says whether it has been measured.
- **Bob's words.** "Do not assure me that something will work. Say what is proven and what is not." (`bob_words_14nov_b.md`)
- **Why consider it.** Bob decides from what he is told. A recommendation that hides what is unproven takes the decision from him. The rule costs nothing. Mine: he gave it to the design session; carrying it into the running process is my reading. It would apply to the reasons given with a recommendation and to the account after each round.
- **Where it fits.** How Bob's words become decisions (the form of a question; the account after a round). Each role's principles.

## 8. Set the maximums and the fill level by useful, correct work, not by window size

- **The idea.** Choose each harness's maximums and its fill level by one yardstick: after a session has read what it must, is there room to do a worthwhile piece of correct work and hand over, all before the fill level?
- **Bob's words.** "What they require is sufficient token to perform enough useful - and correct! - work to justify the investment of time and tokens" (`bob_words_17nov_compaction_avoidance.md`)
- **Why consider it.** The Codex maximums are still owed, and this says what they are for. What a session reads at its start is overhead. Mine: the reading at the start, one piece of work and the handover should together fit under the fill level, with room to finish the handover. If they do not, the role's texts are too long or the piece of work is too large, and that is the thing to change.
- **Where it fits.** Reading in full (the maximums). Sessions and roles (the fill level). The owed Codex values.

## 9. A message wakes the session it is sent to

- **The idea.** Say plainly that a message from one session to another wakes the receiver at once. No session depends on a timed wake to learn that a message has come.
- **Bob's words.** "Confirm that the communications between sessions will be reactive - meaning a message sent to a session immediately wakes up that session to handle the incoming message." (`bob_words_16_17nov_codex_development.md`)
- **Why consider it.** The sixth draft has ROOT's hourly alarm as a safety net, but does not say how an ordinary message arrives. Refilling a slot in the same turn, and reaching Bob quickly, both depend on it. The harnesses differ here, so the table for each should name what carries it.
- **Where it fits.** Sessions and roles. The table for each harness.

## 10. The process's messages and bookkeeping do not pile up in a repository

- **The idea.** What sessions say to each other, and the process's running records, never build up as files or commits in a repository.
- **Bob's words.** "An earlier version of my development process tool used github for process communication and bookkeep, which bloated the repo and added 1,000's of files that are useless but can't be deleted cleanly." (`bob_words_16_17nov_codex_development.md`)
- **Why consider it.** What the shared state holds is still owed. This gives it a limit before it is built. Mine: the shared state is a small fixed set of records, each rewritten in place; messages travel by the harness's own messaging and are not stored as files; and anything the process writes into a product's repository can later be removed cleanly.
- **Where it fits.** Sessions and roles (the shared state, among the technical matters Claude settles).

## 11. Bob can see at a glance what is running

- **The idea.** Bob can see each open job's progress and status without speaking to it. A product's ROOT, ARCH, coordinator, lanes and jobs are grouped under that product, and workers are left out. Finished sessions are archived, not deleted.
- **Bob's words.** "I rarely interact with jobs, but seeing their progress and status is important." And: "sessions that are no longer active are archived so that they don't clog up the session list. There's no downside to archiving sessions because they can be found, reviewed, and even unarchived." (both `bob_words_16_17nov_codex_development.md`). "Only jobs, lanes, ARCH, ROOT, and the process coordinator sessions should be kept in the project." (`bob_words_17nov_project_membership.md`)
- **Why consider it.** The standing page shows what waits for Bob, not what is running. Mine: the process's tool already knows who holds each slot, so a status view costs little. Archiving answers part of the owed question of who closes a finished session, and keeps its record open to review.
- **Where it fits.** How Bob's words become decisions (beside the standing page). Sessions and roles. The table for each harness (grouping and archiving differ).

## 12. Two standing rules for the harness tables

- **The idea.** A harness runs sessions only on hosting that Bob's subscription covers, and anything that would cost more comes to him first. Support for one harness is added beside the other's and never over it.
- **Bob's words.** "Are you in fact designing something that will require additional costs outside of the subscription?" And: "Confirm that changes being added to the process3 repo in support of a Codex-based development process are NOT overwriting the Claude Code support, correct?" (`bob_words_16_17nov_codex_development.md`)
- **Why consider it.** Both rule out design choices early, which is cheaper than finding out late. Mine: both of his sentences are questions, and reading them as standing rules is my interpretation. Keeping each harness's own files apart also lets PROCESS change one harness without retrying the other.
- **Where it fits.** Documents (the table for each harness). What holds a rule.

## What was read

Every line of each file below was read, from the first to the last.

| File | Lines |
| --- | --- |
| `working/design_state_18nov.md` | 106 |
| `owner_words/bob_words_14nov_b.md` | 37 |
| `owner_words/bob_words_14nov_c.md` | 72 |
| `owner_words/bob_words_14nov_notice_session.md` | 114 |
| `owner_words/bob_words_15nov_main.md` | 17 |
| `owner_words/bob_words_16_17nov_codex_development.md` | 89 |
| `owner_words/bob_words_17nov_codex_context.md` | 31 |
| `owner_words/bob_words_17nov_compaction_avoidance.md` | 23 |
| `owner_words/bob_words_17nov_fresh_context_and_process_self_development.md` | 20 |
| `owner_words/bob_words_17nov_project_membership.md` | 19 |
| `HANDOFF.md` | 115 |
| `README.md` | 25 |

The sixth draft (597 lines) was searched and read in part, only to check whether an idea was already in the design. It was not read whole.
