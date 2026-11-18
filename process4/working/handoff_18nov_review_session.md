# Handoff from the review session of 18 Nov 2026

Length: 63 lines. Last section: "Practical notes".

Written by Claude for the session that takes over. Bob asked for this session to be refreshed when its context reached 64 percent. Read this file whole, then `design_state_18nov.md` whole, before doing anything else.

## What this session did

It reviewed the sixth draft of the Process4 definition with Bob, decision by decision, on an interactive page. Every decision on that page is now decided. It then cloned this repository, had workers bring the Foundations up to date, separate Claude Code from Codex, find ideas in Bob's typed words, and find Process3's limits.

## Where things are

All on branch `process4`, under `process4/working/` unless said otherwise.

- `design_state_18nov.md`: the design as it now stands, by subject, with no history. It rules. Unconfirmed interpretations are marked "Reading:".
- `foundations_updated/`: eleven parts, the background document. Written and audited by workers. This session never read it itself.
- `harness_separation/`: neutral terms with the Claude Code and Codex construct for each, the rules only one harness can keep, and the Codex size figures.
- `codex_shortcomings_to_fill.md`: what the design needs that nothing here shows for Codex. Bob fills these from his OpenAI account.
- `owner_words_ideas_18nov.md`: ideas found in Bob's typed words.
- `process3_limits_18nov.md` and `process3_limits_18nov_measurements.md`: Process3's limits, and the plan for measuring reading.
- `reading_measurements/`: scripts and notes for those measurements.
- The sixth draft is `process4/definition/process4_definition_v6.md`. Bob's typed words are in `process4/owner_words/`.
- The review page: https://claude.ai/artifact/Q5iEtYeaFMWmdxgLef2DDH . Bob's answers are stored in its database, collection `decisions`. The page was published from this session's temporary files, which are gone; to change it, read it first and republish with its link.

## How Bob works, learned in this session

- His latest statement is the ruling. Never set his older words against his newer ones, and do not present old statements as conflicts.
- Testing is closed: module tests, the internal walk, the external walk, and a confirmation that an install and an update succeed before a release. Offer no option that adds a test, check, gate, review or stop.
- A decision put to him needs enough context to decide: a title, the question, a real explanation, options each with its own identity and what it gives and costs, and a recommendation with reasons. Short yes-or-no rows were sent back three times for more explanation.
- Plain words, no reference codes. Quote his words exactly, typing errors included. Mark your own interpretations as yours.
- Do not assure him that something will work. Say what is proven and what is not.
- Do not stop while work remains that can be done productively, efficiently and safely.
- Use workers for heavy reading. Give each a narrow brief and the design state file, and have it report line counts read.

## Open with Bob

- The role's starting text and the fill level. Proposed: 4,096 bytes and at most ten rules; 40 percent. He asked what the two blanks were and was told. He has not yet said yes.
- The single-text and set maximums wait for the measurements.
- Readings he has not confirmed are marked "Reading:" in the design state. The newest: the ranking page puts mission highest and design decisions lowest; while Process4 is on trial every uncalled-for stop goes to PROCESS; a role such as ARCH lasts while its sessions are refreshed often.

## In progress: the reading measurements

Bob's word: "Run the three measurements." They are sections 3 to 5 of the measurements plan: what one read returns on Claude Code; the single-text maximum; the set maximum. About 180 short worker runs.

Done: the source text chosen and cut to eight sizes; the script that checks a question set. Not done: everything else. Nothing has been run and nothing spent. `reading_measurements/README.md` says exactly where it stands and what the next step is. Start with the small pilot it describes.

Two facts already seen in this session, each once: reading a 94 KB file in one read returned 431 of its 597 lines with a notice that more remained, at a limit of 25,000 tokens; and the read tool's own text says it reads up to 2,000 lines by default.

## After the measurements

1. Fill the design's four named blanks.
2. Write the design document from the design state and the sixth draft, in parts that each fit under the single-text maximum. It names no product and no hosting provider, uses harness-neutral terms with a table for each harness, and carries no history.
3. Read and check `foundations_updated/` against it.
4. Write the Civicsmith conversion plan. It needs Bob's answer on which journey list counts.
5. The owed items at the end of the design state.

## Practical notes

- This checkout can push to `process4`. Use `git -c push.negotiate=true push -u origin process4`. Never force-push.
- A stop hook asks for every change to be committed and pushed before a turn ends.
- The `gh` command-line tool's token is invalid in this environment. Plain git works.
- Every branch tip is fetched in a second, read-only checkout at `/home/user/neobobkrause/process3`, if that machine still exists. Otherwise fetch what is needed with `git fetch --depth 1 origin BRANCH`.
- Process3's `CLAUDE.md` at the repository root holds Bob's standing approvals. They were written for Process3 and still apply to sessions working here.
