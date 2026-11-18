Length: 126 lines. Last section: "11. Never measured, and not found".

# Background, part 5: roles and sessions

This part gives the reasons and the evidence behind design part 4. It states no rule.

## 1. Where the roles come from

Process3 had one architecture session for each product, which planned, started jobs, merged, and was also the owner's front door. The owner, to the Codex session of 16 and 17 Nov (`owner_words/bob_words_16_17nov_codex_development.md`, an assistant's selection of extracts): "ARCH used to be the front door, and it continues to play a very important role."

How long such sessions lasted in Process3 (`working/audit2_corruption.md`, line 387, from `evidence/roles_root_coordinator.md`; measured):

- The architecture session: 21 sessions from 3 to 9 Nov, one start and 20 handovers.
- The coordinator: about 26 sessions in six days.
- ROOT: 11 sessions from 3 to 8 Nov, living from 46 minutes to about 48 hours. "every change to the owner's approvals forced one".

These figures are why the design treats the standing roles as lasting while their sessions are replaced. That a role lasts while its sessions are refreshed often is marked as a reading (design part 4, section 5).

**The tool and ARCH.** That whatever has one right answer is done by the tool, and that ARCH's session keeps what needs judgment, is from the review session of 18 Nov (`working/design_state_18nov.md`, section 8, in Claude's words). The earlier form of this background said the tool "starts the next job". It does not. The design marks as "Claude decided" that the tool chooses the next job and writes its starting instructions, and that ARCH's session makes the start, "because only a session can start a session" (design part 4, section 1). What the tool does in full is in design part 6, section 5. How much of ARCH's work is passing things on has never been measured; the design leaves it to the first tranche.

**ARCH's own record of decisions.** The earlier form said, with no mark, that ARCH records each decision in the product's repository. The design marks that second record as "Claude decided" (design part 5, section 5).

## 2. Workers

The owner's words on workers:

- 14 Nov, as a working rule (`owner_words/bob_words_14nov_b.md`): "Keep your context under 70%. Do the heavy reading with workers."
- 17 Nov (`owner_words/bob_words_17nov_codex_context.md`): process4 defines "the use of highly targeted and structured subagents to do research and complete tasks for the benefit of parents without clogging the parents' context window". And: "the charters of subagents often focuses on reading large document sets, but these workers are also sometimes tasked with making material decisions based on information they gather."
- 16 and 17 Nov: "FYI, process4 has no need for subagents to stay alive once their initial scope of work is completed."

That no worker reviews another session's work: the fourth draft's ninth proposal was headed "A helper never reviews"; he answered "agreed" (`owner_words/bob_words_14nov_c.md`). One measured cost of review in Process3: a session ran four review rounds over two hours and 26 dollars before he asked (2 Nov; `evidence/foundations_tranche_9nov.md`, line 207).

**A worker cannot start workers.** The design's Claude Code table says this was seen once (design part 7, section 1). The source is the first reading measurement of 18 Nov: among its 148 worker runs, one worker "was asked to start readers and could not", and its list of departures from the plan says "A worker cannot start workers. This was tried once." (`working/reading_measurements/RESULTS.md`, sections 1 and 7). One try, on one model. It is why a walking session, and any worker, is given no workers of its own.

## 3. Model and effort

The design quotes a note of the owner's on passing model and effort to each started session (design part 4, section 2). The words are: "always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand". They are not in `process4/owner_words/`. They reach the design through the sixth draft (`definition/process4_definition_v6.md`, line 233: "Your ledger note says"), and the audits of Process3 mark them as his own words on a ledger line of 31 Oct (`evidence/process4_disposition.md`, line 234; `evidence/audit_B.md`, line 71). On Claude Code the passing-on is read in the starting tool's own description and has not been measured (design part 7, section 1). On Codex it is not known.

## 4. Depth

**Three levels.** Process3's table of measured platform behaviours had sessions "created only from depth 0 to 2, so depth never passes 3", restated on 3 Nov, when jobs ran and merged at depth 3 (`evidence/foundations_tranche_9nov.md`, line 192).

**A takeover adds a level.** The earlier form of this background said sessions are at most three levels deep, flatly. An audit of the sixth draft found that on Process3's record "Both watcher takeovers left ROOT a level deeper" (`working/audit2_corruption.md`, line 467). The design now says three levels under a ROOT the owner started, and that each takeover by the watcher adds one (design part 4, sections 2 and 6).

**The harness's limit.** The design's Claude Code table says "One session reported a limit of eight (seen once)" (design part 7, section 1). This writer searched the working and evidence folders and found no record of that report: no file names the session, the date or the words. The figure stands in the design alone, and is unknown beyond it.

**Codex.** Four levels, because the chat the owner opens sits above ROOT; measured second-hand on a fixture (`working/harness_separation/01_neutral_terms.md`, row "Depth of sessions").

## 5. The watcher and its takeover

**Why there is a watcher.** Process3 had one. The fourth draft proposed dropping it (its seventh proposal is headed "No watcher beside ROOT"). The owner answered (`owner_words/bob_words_14nov_c.md`): "are you certain that the watcher isn't needed?" A later draft withdrew it: "Claude withdraws the proposal, and the watcher stays as your documents have it" (quoted in `working/audit2_corruption.md`, line 382). On 18 Nov, as the design state records (`working/design_state_18nov.md`, section 8): "The watcher is kept, and ROOT starts it. Its takeover is designed and rehearsed in the trial."

His own experience points the other way and is on record, to the Codex session (`owner_words/bob_words_16_17nov_codex_development.md`): "Under Claude Code (CC) running process4, if ROOT was archived or deleted it's features would die with it. That has never been a problem because ROOT never just died on its own."

**What Process3's watcher did** (`working/audit2_corruption.md`, line 387; `working/audit2_feasibility.md`, lines 193 to 195; measured from `evidence/roles_root_coordinator.md`): it kept 10 records and took over twice. It woke once a day by its own alarm. Each takeover put ROOT one level down and left no watcher behind. Process3's own decision called a takeover "a bridge: Bob restarts ROOT from his app at depth 0 at his next opportunity". The audit's reasoning: with a daily wake a dead ROOT is found up to a day late.

**Why a standby session and not a timer alone.** In Process3 a fresh session started by a scheduled task could not start sessions, 0 of 3 (`working/design_work_18nov/owner_acts_and_approvals.md`, section 3, act 9, from `evidence/permissions_inventory.md`).

**The takeover as the design has it.** The earlier form of this background called the design owed. It is now in design part 4, section 6, marked "Claude decided" and unproven in every part. What this writer could trace of its grounds:

- That the new ROOT sits one level deeper is the measured behaviour above, and the limit on depth is why the owner is asked to start a fresh ROOT in time.
- That the watcher wakes hourly, in place of Process3's daily wake, answers the audit's point about a day's delay.
- Why two missed wakes, and why half an hour after ROOT: no working file gives the grounds. A check of the seventh draft listed the watcher's wake interval, and how missed wakes are told, among points still loose (`working/readiness_18nov/draft7_final_check.md`, line 118).

## 6. Lanes

The owner's words:

- 14 Nov (`owner_words/bob_words_14nov_c.md`): "Lanes are an important element of the development process, though they haven't been fill into the process4 design."
- 16 and 17 Nov: "interacting with lanes is crucial, as this is where architecture and design decisions are made."
- 6 Nov, for Process3, as his Foundations quote him (`evidence/foundations_tranche_9nov.md`, line 93; a session's record): "The important thing to remember when setting up lanes is the insure that a lane is fully qualified to fulfill their role as the load-bearing source of truth in their area", and "The first time a lane is defined and run, it should start by using workers to fully research canon documents, existing code, and best practices related to their specialty area".

The lane rules were written out for Process4 in `definition/process4_lanes.md`. On 18 Nov he ruled on three points, as the design state records (section 8): ARCH starts a product's lanes; a lane decides design in its area while ARCH decides whether, when and whether it can be built; and he works with a lane through its design pages. The earlier form of this background stated seven further lane rules with no mark. The design places every one of them under a reading: "the owner has not confirmed each rule one by one" (design part 4, section 3). They are not his rulings.

One of the seven concerned a change that touches only a lane's own folder. The earlier form said it "merges without a test run". The design says it needs no module tests, that the required run still reports and passes at once, and that this too is a reading (design part 2, section 9). The reason, as the sixth draft records it from 5 Nov (line 214; a session's record): "the modules that use what the lane produces have already passed their own tests, and design documents do not need testing."

Whether a lane's session is better kept running or started when a question arrives has not been measured; the design leaves it to the first tranche (design part 10, section 5).

## 7. Refreshing a session

Why sessions are refreshed on purpose is in part 6 of this background, with the history of the fill level. Three corrections belong here.

- The earlier form said the fill level "has no settled value yet". The design gives a provisional 40 percent (design part 5, section 2).
- The earlier form said that what carries the fill level on Codex is not yet known. A hosted Codex session was measured to show no fill level (`working/harness_separation/01_neutral_terms.md`, row "Context-fill measurement"). The design marks as "Claude decided" that there the refresh comes only at a natural pause (design part 5, section 2).
- Replacing ARCH while jobs are open is unproven (design part 4, section 5). Process3 did it 20 times by its own means; nothing shows it under Process4's.

## 8. The shared state

**What Process3 used, and what went wrong** (`working/design_work_18nov/shared_state_carrier.md`, section 2, from the evidence files it names). Process3 kept its shared state on a branch of the product's repository, written by ordinary commits. In seven days that branch took 12,881 commits and 8,937 files. On 6 Nov it took 1,387 pushes in 19 hours. A record of GitHub use, added to pace that use, was itself 3,150 commits. Writers collided, and the code that wrote records grew to 692 lines. The branch could not be cleaned, because sessions may not delete or overwrite a branch.

**The owner's words,** to the Codex session: "An earlier version of my development process tool used github for process communication and bookkeep, which bloated the repo and added 1,000's of files that are useless but can't be deleted cleanly."

**The carrier chosen.** The earlier form of this background said that exactly what the shared state holds was owed. The design now lists eight records with one writer each, carried as one GitHub issue with a comment for each record, rewritten in place; all of it is marked "Claude decided" and unproven (design part 4, section 4). The worker's file gives why:

- An edit to a comment is one request with no commit, branch or merge; all records come back in one listing call; the volume is a small fraction of GitHub's published limits.
- GitHub has no guard against two writes to one comment at the same moment: the last write wins and the earlier is lost silently. The worker proposed that the tool read back after writing. The design took the other course the worker named: every record has exactly one writing session, and a job writes none.
- Alternatives set aside: all records in one issue body (every write rewrites the whole); one issue for each record (held in reserve); repository variables (held in reserve); a git reference moved without history (the only GitHub object with a true guard, but rewriting it means overwriting history); a gist (belongs to an account, not the repository); labels (too small); a Projects field; a file on the tranche branch (a commit and a merge for each write); a service on the hosting provider (a second tool).

**What is not verified.** By the worker's own labels: the size a comment can hold (65,536 characters is from memory), that an edit notifies no one, whether edits count toward GitHub's limits on creating content, and any limit on the number of edits to one comment. Nothing has run. Process3 holds no measured fact about issue comments at all.

**Codex.** The earlier form said where the shared state lives on Codex is not yet known. In the one Codex trial it was a file on the host, not on GitHub (documented in the trial's own source; `working/harness_separation/01_neutral_terms.md`).

## 9. Messages

The owner, to the Codex session: "Confirm that the communications between sessions will be reactive - meaning a message sent to a session immediately wakes up that session to handle the incoming message." Process3's Foundations had: "Git and GitHub carry all state; messages only wake" (`evidence/foundations_tranche_9nov.md`, line 48).

On Codex a follow-up task to a child in the same chat wakes it (measured); across two chats it fails (measured); whether a plain message wakes an idle child is not known (`working/codex_shortcomings_to_fill.md`).

## 10. A stop, an edit to the approvals, and a switch of account

**A stop, and the hourly wake.** After Process3 was stopped on 9 Nov, ROOT's hourly task went on firing, and by 13 Nov had sent the owner 94 push notifications (`evidence/roles_root_coordinator.md`, line 110, quoting `evidence/review.txt`).

**An edit to the approvals.** In Process3 each of the owner's five edits stopped every long-lived session, and after the last the product never restarted (`working/trial_plan_facts.md`, line 299). What an edit does to a running round was owed in the earlier form of this background. It is now in design part 4, section 7, marked "Claude decided", and listed as unproven (design part 10, section 3).

**A switch of account.** On 5 Nov a switch stranded 13 job sessions, and 94 minutes passed with no job running; "Old sessions cannot be messaged or archived from the new account". On 7 Nov a second switch was cancelled after about 9.5 hours (`working/trial_plan_facts.md`, line 357; `working/k_evidence.md`, lines 133 and 136). The owner's words that day, as the coordinator's log quotes them through `working/k_evidence.md`: "The account switch didn't work... So start everything back up here in this account." The design lists a switch that loses no work as unproven.

**Loops that would not end.** Owed in the earlier form; now in design part 4, section 10, each end marked "Claude decided". No working file with the grounds was found.

## 11. Never measured, and not found

- The watcher's takeover under Process4, and the grounds for "two missed wakes".
- Any record of the reported depth limit of eight.
- The shared state in any form; every GitHub behaviour it leans on that is labelled from memory.
- Whether a successor that starts only from the shared state and the repository can carry a role on.
- The share of ARCH's work that is passing things on.
- The owner's typed words for his rulings of 18 Nov on lanes, the tool and the watcher.
