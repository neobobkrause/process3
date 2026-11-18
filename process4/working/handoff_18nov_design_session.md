# Handoff from the design session of 18 Nov 2026

Length: 65 lines. Last section: "Practical notes".

Written by Claude for the session that takes over. It is the latest handoff. Where it differs from `handoff_18nov_review_session.md` or `handoff_18nov_measurements_session.md`, this one rules. Read it whole, then the seventh draft whole.

## Bob's direction for this work

- "The focus of this session is on getting the process4 design to the point that we can build and test it."
- The limits tests are being rerun in a separate session. Do not raise the four size values with him again; they stay provisional in the draft.
- The "But" that ended his earlier message was a typo. Nothing is owed on it.
- He does not want to be told what will be done. Do the work, then say what was done. Do not stop while work remains.

## The first thing owed to Bob

His words, at the refresh: "now we need to walk through the work that remains. Let's refresh before taking that one." So the successor's first act with him, after its reading, is to walk him through the work that remains: in plain words, in an order he can follow, saying for each piece what it is, whose it is (his, or a session's), what it waits on, and what is proven and what is not. The sources are the design's part 10 (all six sections), build text 4 (sections 2 to 5), and "Next, in order" below. Do not start with a question to him; start with the walk-through. He asked for the refresh at 35 percent fill, his own reading of this session.

He also asked to download the seventh draft. A single file of the eleven parts joined in order was sent to him. It is not in the repository. If the draft changes and he asks again, join the parts afresh and send the file.

## Where things are

Branch `claude/process4-design-handoff-7w8nh8`. Everything is pushed.

- **The design:** `process4/definition/process4_definition_v7/`, eleven parts. It rules. Its part 10 lists what waits for Bob, what design work is left, and what is unproven.
- **The build texts:** `process4/definition/process4_build_v1/`. `01-the-tool-and-the-required-run.md`, `02-the-forms.md`, `03-the-walks.md`, `04-the-trial.md`, `05-the-records-and-following.md`, and `starting_texts/` (eight role texts and an index). Written by workers on 18 Nov. Nothing in them has run.
- **Design work behind the decisions:** `process4/working/design_work_18nov/` (the shared state's carrier, a told job's tests, the owner's acts and a proposal for his approvals' wording).
- **Checks made today:** `process4/working/readiness_18nov/`: `draft7_recheck_design_state.md`, `draft7_recheck_corrections_and_consistency.md`, `draft7_unmarked_lines_traced.md`, `draft7_quotations_checked.md`, `draft7_final_check.md`, `background_checked_against_draft7.md`, `build_texts_reconciled.md`, `background_rewritten.md`, `design_and_build_final_check.md` and `build_texts_after_final_check.md`.
- **The design state** (`design_state_18nov.md`) is no longer the fullest statement. The seventh draft carries every rule of it and many decisions made since. Where they differ the draft is later.

## What this session did

1. Had the corrected draft checked twice more, then a third time by a fresh reader, and corrected everything found: marks, lost rules, contradictions between parts, quotation sources.
2. Settled, as Claude's decisions marked in the draft: what carries the shared state (one issue, one comment for each record, one writing session for each); how a told job's related tests are picked and run; the order of the owner's acts to start a product; how two products share slots; what a module-list change tells; where each loop ends; how a release approval reaches the publishing session; grouping sessions on Claude Code; and about twenty smaller running rules (part 4, section 11).
3. Had the four build texts written.

## Done since, on the same day

- The build texts were reconciled with each other and the design in three passes (`readiness_18nov/build_texts_reconciled.md`). This session read build texts 1, 2 and 3 and the texts for ROOT, ARCH and a job in full; the other five starting texts it did not read.
- Build text 4, `04-the-trial.md`, gives the order of building and trying. Stage 0 tries whether a program can reach GitHub from a session at all; the design changes if it cannot.
- The background document was rewritten as background only (`readiness_18nov/background_rewritten.md`): eleven parts, 144,989 bytes. This session has not read the rewrite.

## Next, in order

1. The last check of the design and build texts together was made (`readiness_18nov/design_and_build_final_check.md`) and its findings applied (`readiness_18nov/build_texts_after_final_check.md`). A fifth build text, `05-the-records-and-following.md`, came out of it. The texts as they now stand have not been checked again, and this session has not read build texts 4 (as rewritten) and 5. Read them, then have one fresh check made.
2. Small things the last pass left: the build texts still say two matters are "not ruled" that the design has since ruled (how the building session pushes before the tool exists: part 4, section 11; that a development release needs no approval: part 3, section 6). The lane's starting text is in no stage of the trial; put it at the walks' stage. The working file `design_work_18nov/shared_state_carrier.md` puts PROCESS's handover in the product's issue; the design and build text 5 put it in the process's repository, and they rule.
3. Put the matters in the design's part 10, section 1 to Bob, one at a time and in full.
4. Nothing can be built until Bob has done what build text 4, section 2 lists. Do not start building the tool without his word.
5. Owed design work: the steps of an account switch; what is read to show archived sessions free the account's room; the product's conversion plan and written procedures, which need the product's repository.

## Waiting for Bob

Part 10, section 1 of the draft is the list. One was put to him in full and not yet answered: how a tranche ends (three options; recommended: clean partial walks end it, and in the last round ARCH adds every journey named for the tranche that no earlier round walked clean). Put the rest one at a time, in full, when he is ready for them. The largest are: the wording of his approvals and forbidden commands for Process4 (a proposal is in `design_work_18nov/owner_acts_and_approvals.md`; no session can run under Process4 until he commits his own); the three readings on a told job's tests; and the five matters on the walks.

## What is not proven

Process4 has not run and its tool is not built. Part 10, section 3 of the draft is the list. Added today: a session that holds one repository fetching the tool's read-only copy; that GitHub holds a record as a comment as the design needs (size, no notification on a rewrite, no limit on rewrites); the tool following from a use to the tests that reach it inside a module.

## Practical notes

- Push only to this branch. A stop hook asks for every change, a worker's files included, to be committed and pushed before a turn ends.
- An attempt to attach `neobobkrause/process3-probes` for reading was refused by the permission checker and was not retried. The proof of the notice's method is there. Bob would have to add it to a session.
- Workers that write a file while another commit is made get their half-written file swept into that commit. It is harmless; commit again when they finish.
- After any edit to a part of the draft, make its "Length" line true again.
- The fill level in force is 40 percent. This session was refreshed at 35 percent, on Bob's word.
- The background document is `process4/working/foundations_updated/`, eleven parts, rewritten on 18 Nov. It is not required reading before the walk-through.
