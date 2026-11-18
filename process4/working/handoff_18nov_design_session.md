# Handoff from the design session of 18 Nov 2026

Length: 62 lines. Last section: "Practical notes".

Written by Claude for the session that takes over. It is the latest handoff. Where it differs from `handoff_18nov_review_session.md` or `handoff_18nov_measurements_session.md`, this one rules. Read it whole, then the seventh draft whole.

## Bob's direction for this work

- "The focus of this session is on getting the process4 design to the point that we can build and test it."
- The limits tests are being rerun in a separate session. Do not raise the four size values with him again; they stay provisional in the draft.
- The "But" that ended his earlier message was a typo. Nothing is owed on it.
- He does not want to be told what will be done. Do the work, then say what was done. Do not stop while work remains.

## Where things are

Branch `claude/process4-design-handoff-7w8nh8`. Everything is pushed.

- **The design:** `process4/definition/process4_definition_v7/`, eleven parts. It rules. Its part 10 lists what waits for Bob, what design work is left, and what is unproven.
- **The build texts:** `process4/definition/process4_build_v1/`. `01-the-tool-and-the-required-run.md`, `02-the-forms.md`, `03-the-walks.md`, and `starting_texts/` (eight role texts and an index). Written by workers on 18 Nov. Nothing in them has run.
- **Design work behind the decisions:** `process4/working/design_work_18nov/` (the shared state's carrier, a told job's tests, the owner's acts and a proposal for his approvals' wording).
- **Checks made today:** `process4/working/readiness_18nov/`: `draft7_recheck_design_state.md`, `draft7_recheck_corrections_and_consistency.md`, `draft7_unmarked_lines_traced.md`, `draft7_quotations_checked.md`, `draft7_final_check.md`, `background_checked_against_draft7.md`, and `build_texts_reconciled.md` once the reconciling worker reports.
- **The design state** (`design_state_18nov.md`) is no longer the fullest statement. The seventh draft carries every rule of it and many decisions made since. Where they differ the draft is later.

## What this session did

1. Had the corrected draft checked twice more, then a third time by a fresh reader, and corrected everything found: marks, lost rules, contradictions between parts, quotation sources.
2. Settled, as Claude's decisions marked in the draft: what carries the shared state (one issue, one comment for each record, one writing session for each); how a told job's related tests are picked and run; the order of the owner's acts to start a product; how two products share slots; what a module-list change tells; where each loop ends; how a release approval reaches the publishing session; grouping sessions on Claude Code; and about twenty smaller running rules (part 4, section 11).
3. Had the four build texts written.

## In progress when this was written

A worker is reconciling the build texts with each other and with the design, editing only inside `process4_build_v1/`. Its report goes to `readiness_18nov/build_texts_reconciled.md`. If that file is missing, the reconciling was not finished: have it done again from the brief's rulings, which are: the design rules; a job's record on its pull request takes build text 1's form; a module is known by its name; the process config takes every field texts 1 and 3 read; every rule in a starting text counts toward ten, the "never" lines included.

## Next, in order

1. Read the reconciling report. Settle each conflict it could not, in the design, and report each to Bob in one plain line.
2. Read build texts 1 and 2 and the starting texts in full. This session read only build text 3 itself.
3. Have one fresh worker check the design and the build texts together for what a building session still could not act on.
4. Rewrite the background document, `process4/working/foundations_updated/`, as background only. `background_checked_against_draft7.md` lists 8 contradictions, 43 out-of-date statements and about 252 passages that repeat the design.
5. The plan for the trial: what is built first and tried first in the trial repository. Build text 1's build order and build text 3's section 8 are the start.
6. The product's conversion plan and its written procedures. Both need the product's repository, which this session did not have.

## Waiting for Bob

Part 10, section 1 of the draft is the list. One was put to him in full and not yet answered: how a tranche ends (three options; recommended: clean partial walks end it, and in the last round ARCH adds every journey named for the tranche that no earlier round walked clean). Put the rest one at a time, in full, when he is ready for them. The largest are: the wording of his approvals and forbidden commands for Process4 (a proposal is in `design_work_18nov/owner_acts_and_approvals.md`; no session can run under Process4 until he commits his own); the three readings on a told job's tests; and the five matters on the walks.

## What is not proven

Process4 has not run and its tool is not built. Part 10, section 3 of the draft is the list. Added today: a session that holds one repository fetching the tool's read-only copy; that GitHub holds a record as a comment as the design needs (size, no notification on a rewrite, no limit on rewrites); the tool following from a use to the tests that reach it inside a module.

## Practical notes

- Push only to this branch. A stop hook asks for every change, a worker's files included, to be committed and pushed before a turn ends.
- An attempt to attach `neobobkrause/process3-probes` for reading was refused by the permission checker and was not retried. The proof of the notice's method is there. Bob would have to add it to a session.
- Workers that write a file while another commit is made get their half-written file swept into that commit. It is harmless; commit again when they finish.
- After any edit to a part of the draft, make its "Length" line true again.
- The fill level in force is 40 percent. This session was below it when this was written.
