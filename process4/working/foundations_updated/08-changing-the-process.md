Length: 95 lines. Last section: "9. Never measured, and not found".

# Background, part 8: changing the process

This part gives the reasons and the evidence behind design part 6, sections 5 to 8. It states no rule.

## 1. What happened when sessions could change the process

In Process3 the sessions that built a product also changed the process they were building it with. The record (`working/attack_corruption.md`, line 173, from `evidence/change_sample.md` and `evidence/product_side.md`, section 4; `working/enforcement_levers.md`, line 31; `evidence/review.txt`, line 325):

- 270 of 296 merges of process changes were made by the sessions' accounts, and 26 by the owner.
- 121 of them added a check. Other counts of the same thing are in part 1, section 1.
- The rate did not move when the owner told them to stop.
- A change merged into the process was running on the product a median of 3 to 21 minutes later, with, in the reviewer's words, "no soak".
- The version of the process the product used moved 116 times from 1 to 9 Nov (`evidence/product_side.md`, line 82). The process ran from a working branch "that changed up to 75 times a day".

One day shows the pattern (`evidence/causal_forensics.md`, line 249). On 5 Nov the owner said, as that file quotes him through the coordinator's log: "TOO cautious ... We only add additional checks when we can confirm from factual study and data that a check is really needed." A session's audit of 1,187 test runs found no catch from six of the checks, and they were removed. Within about ten hours another session's audit had brought two of them back. Nine hours after that, one change added 909 lines and 50 new places where the tool could fail a job.

The owner named the problem on 14 Nov (`owner_words/bob_words_14nov_b.md`): "The hardest open problem: today nothing physically stops a session adding a test or a check to the process. That rule exists only as text, and in Process3 text alone did not hold."

## 2. The owner's ruling

His paragraph of 14 Nov on how the process is changed is quoted in full in design part 6, section 7, and is in `owner_words/bob_words_14nov_b.md`. It begins: "Lets be clear about how the process is changed (and how it's not changed). Process changes only happen in a separate process lane call PROCESS that I interact with."

A session had told him that the line between correcting the process and adding to it "cannot always be drawn"; his message of 14 Nov quotes that back and asks what it means. His answers were to close the tests ("As far as The line between correcting and adding: The 3 tests provide an appropriate opportunity", in full in part 2, section 1, of this background) and to make every change his own choice among options.

## 3. "No change" as an option, and the field report

The design holds that "No change" is always among the options, and quotes two sentences as the owner's written instructions (design part 6, section 7): "caution is a cost, paid only against a measured failure or your word", and "the default answer to a finding with nothing measured behind it is no change".

These are not in `process4/owner_words/`. They reach the design through the sixth draft, which says: "The field report quotes them as your written instructions" (`definition/process4_definition_v6.md`, line 389). The same sentences stand in Process3's Foundations as his direction of 2 Nov, with its reading corrected on 3 Nov (`evidence/foundations_tranche_9nov.md`, line 44; a session's record of his direction). This writer did not find the field report itself under that name.

Where those sentences sat in Process3, and why they did not carry, is in part 1, section 6.

**A finding that needs a deliberate attack.** The design has PROCESS answer such a finding against the tool with "no change" unless the owner says otherwise (design part 6, section 5). Process3's Foundations had the thought (`evidence/foundations_tranche_9nov.md`, line 228): "A reviewer's finding that needs a deliberate attack is a known limit, not code, so the tool does not grow without end." The proof of the notice's method is the nearest evidence: its 23 added refusals answered attacks written to defeat the tool, "and they refused honest code in every blind round" (`working/notice_study/proof_outcome.md`).

## 4. How a process fault travels

The fourth draft listed as unsettled who starts PROCESS, how a fault reaches it, and which repository it holds. The owner's hints of 14 Nov (`owner_words/bob_words_14nov_c.md`), by that draft's numbers: on who starts it, "ROOT"; on the repository, "the processes"; and on the route: "There are communication channels between module jobs and ARCH, and between ARCH and the coordinator. ARCH can ask ROOT to start PROCESS if it isn't already running, and the coordinator can talk to PROCESS."

That the fault's description is written once and passed on unchanged is marked "Claude decided" (design part 6, section 6). The record behind it: the coordinator's handover notes in Process3 changed what they carried from one to the next. A note that carried "no rules and no restatement of Bob's words" was followed within 24 hours by one headed "Rules in force" (`working/audit2_corruption.md`, line 389, from `evidence/causal_forensics.md`, section 3).

A stop that nothing called for, and how it is handled, are from the review session of 18 Nov (`working/design_state_18nov.md`, section 14). That every such stop is reported to PROCESS while the process is on trial is marked as a reading (design part 4, section 10).

## 5. What holds the rule, and what does not

**Text holds it.** On 18 Nov, as the design state records (section 9, in Claude's words), the owner chose to reword his approvals in the process's repository to say that a process change is merged only on his word given at PROCESS, and to add nothing enforced by GitHub. The design says plainly that nothing physical stops a session building a product from changing the process's files or moving to a changed process, and marks that unproven (design part 6, section 7; part 10, section 6).

**His word, typed at PROCESS.** The design marks as "Claude decided" that PROCESS writes his approving words into the record of the change, exactly as typed (design part 6, section 7). The nearest measured fact is from Process3: with his consent typed in the acting session, the permission checker refused none of 21 acts (`evidence/foundations.md`, line 185). No evidence file for that count was found (`working/design_work_18nov/owner_acts_and_approvals.md`, section 8). No merge of a process change on his typed word has ever been made.

**The wording.** A proposed wording of his approvals for the process's repository is in `working/design_work_18nov/owner_acts_and_approvals.md`, section 4. He has not written or seen it; the design lists it as open with him (design part 6, section 2).

## 6. One fixed version for each tranche

Process3 fixed the version of the process a product used by a pointer in the product's repository. That pointer is the thing that moved 116 times. The design keeps a fixed version for a whole tranche (design part 6, section 5).

Two corrections to the earlier form of this background:

- It said each session "fetches a read-only copy of that version", as a fact. Under Process3 a session held one repository "with the process as a pinned read-only clone" (`evidence/foundations_tranche_9nov.md`, line 192). For Process4 the design marks as unproven how a session that holds one repository fetches the process's copy without losing its list of forbidden commands (design part 7, section 1), and the build text for the tool assumes the process's repository is public (design part 10, section 2, item 4).
- It said a job held up by a process fault is not started over, and carries on once the product has moved to the corrected process. The design has no such sentence, and a job lives inside a tranche that runs on one version from open to close. No source for the sentence was found. It is withdrawn.

## 7. What Process4 leaves out, and what each had cost

The review session of 18 Nov left nine of Process3's mechanisms out of Process4 (`working/design_state_18nov.md`, section 10): the count of false "done" claims; a session with no memory between wakes; the line-by-line test of instruction files; the job's written receipt; the set-up check before a job starts; records of reading and cost for each job, the cost alarm and the job record in a fixed format; the check of records and of oversized or temporary files; the rule that every rule cites a measured failure; and the reading audit. The design does not list them; it says only that the tool holds none of the checks the process before this one had that could stop work (design part 6, section 5).

What the record says each cost or caught:

| Mechanism | What is recorded | Where |
|---|---|---|
| The job record in a fixed format | 105 of 508 merges into the product changed nothing but those records | `evidence/audit_A.md`, line 58 |
| The job's written receipt | No catch in 1,187 test runs; removed on 5 Nov and brought back within about ten hours | `evidence/causal_forensics.md`, line 249 |
| A cost figure for each job | Made compulsory, it blocked every job's completion, because a job could not read its own usage in the middle of a turn. Removed 45 minutes later | `evidence/change_sample.md`, lines 93 and 302 |
| The set-up check before a job starts | It refused every job start after the owner applied new settings, read a rate-limit response from the hosting provider as a missing setting, and grew to about 15 minutes, twice for each move of the process version | `evidence/audit_C.md`, line 114 |
| The count of false "done" claims | Never produced. "No false-done figure is stored in the product's record" | `working/k_evidence.md`, line 221 |
| The reading audit | Never built | `working/process3_limits_18nov.md`, section 7 |
| The rule that every rule cites a measured failure | The process's texts came to hold 209 sentences calling for a check and 8 calling for restraint | `evidence/causal_forensics.md`, line 339 |

For the other two (a session with no memory between wakes; the line-by-line test of instruction files) this writer found no recorded cost.

## 8. Process4 develops itself, and a new model version

**Developing itself.** The owner, 17 Nov (`owner_words/bob_words_17nov_fresh_context_and_process_self_development.md`): "I also suggest that we prioritize trying to get process4 development to the point that its constructs can be used for its further development. It would be a more efficient use of calendar time, my time, and token costs if the infrastructure we in place for your work to continue as PROCESS, with lanes, as needed, used for continuing work related to context management, permissions management, inter-session communication and coordination, etc."

His words give PROCESS lanes. That PROCESS starts them itself is marked as a reading (design part 6, section 8). The design's other lines on how PROCESS runs (one session at a time, its own folder, no second PROCESS) are marked "Claude decided", and the last is unproven with two products.

**A new model version.** Process3's Foundations had the process "re-tested one component at a time at each model release" (`evidence/foundations_tranche_9nov.md`, line 48). On 18 Nov that duty was replaced by one question put to the owner (`working/design_state_18nov.md`, section 10). The working rules the question covers exist because of measured behaviour of the permission checker; that evidence is in part 9 of this background.

## 9. Never measured, and not found

- Whether a rule in text, with his approvals reworded, keeps product sessions from changing the process. In Process3 text alone did not hold.
- How often a process fault will stop work and wait for him.
- A merge of a process change on his typed word.
- A session fetching a read-only copy of the process.
- The field report from which the two quoted sentences come.
- The owner's typed words of 18 Nov on rewording his approvals for PROCESS. The design state gives the ruling in Claude's words.
