# Reading measurements: materials and where they stand

Length: 61 lines. Last section: "What is not done, and the next step".

Kept by Claude. Bob's word: "Run the three measurements." The plan is `../process3_limits_18nov_measurements.md`, sections 3 to 5. Sections 3 and 4 are done; the results are in `RESULTS.md`. Section 5 is not started.

These are research into how well a session reads. They are not tests, checks or gates on any product.

## The source text

Process3's coordinator log: 1,303 lines, 540,867 bytes, real dense prose. It is on another branch, so it is not copied here:

    git show origin/start/coordinator-4nov:notes/coordinator-findings-3-4nov.md > src/log.md

## Layout the scripts expect

A working folder outside the repository holding `src/log.md`, `texts/`, `keys/`, `prompts/` and `scripts/` (the `.py` files here). Copy `keys/` from here into it. A second folder outside the repository, `readers/`, holds one folder per reader run.

- `cut.py`, run from the working folder, writes `texts/sNNN/text.md` for 12, 24, 48, 70, 100, 140, 280 and 540 KB and `keys/info.json` with each cut's zones.
- `verify.py NNN` checks `keys/kNNN.json` and writes `questions.md` and `task.md` beside the text.
- `onehome.py NNN` shows the lines on which each accepted answer occurs, to judge that a fact has one home.
- `gen.py WORK READERS SERIES SIZE ARM FIRST LAST` makes the reader folders and the exact prompt for each run. Arms: `h` habit, `t` told, `n` no text.
- `score.py WORK RECORDS OUT` scores every reader found in a folder of worker records.
- `oneread.py READERS RECORDS` reports what each single read returned.

## A question set

`keys/kNNN.json` is a list of exactly twelve items, four in each zone (first tenth, middle, last tenth):

    {"id": "q01", "zone": "first|middle|last", "question": "...", "answer": "...",
     "accept": ["string a right answer must contain", "..."], "evidence": "exact quote from the text"}

The evidence must occur exactly once in the text and lie in the stated zone. At least one accept string must appear in the evidence, and none may appear in the question.

## How a run is made

- Each reader is a fresh worker of the research session, given the prompt from `gen.py` word for word. Examples of the three prompts are in `prompts/`.
- A worker's record is a file on the session's own machine: `~/.claude/projects/<project>/<session>/subagents/agent-<id>.jsonl`. It holds every call the worker made and what each returned. `score.py` reads these. They are large and are not committed; `results/runs/` holds what was taken from each.
- A cut read is told to the reader in a separate note in the record, of type `read_truncation_notice`. `score.py` counts these.
- Coverage is counted from what each call returned: a line counts as received when its whole content appears in some result.
- A told run that opens the questions early, or uses a tool afterwards, is set aside and counted. None was.

## What was learned about running them

- A worker cannot start workers, so the research session starts every reader itself. Each reader costs the research session about 1,000 tokens of its own context. Ten started in one message and run in the foreground cost least.
- Runs at one size come out nearly identical. Ten repeats of one text and one question set add little. Different texts and question sets at a size would add more.
- A worker with no text went looking for one, in the readers' folder and in this folder of the repository. Keep keys out of any place a reader might look, and check each record for calls outside the reader's own files. `score.py` marks them `other`.
- Starting a separate session from the command line works, but it ran on another model by default and its billing could not be read. It was not used.

## What is not done, and the next step

- **Next: the set measurement, section 5 of the plan.** It has no materials. It needs sets built from real files, each piece under the single-text figure Bob chooses from `RESULTS.md` section 4; twenty questions for each set, four from the last file read, four from the middle of the set, two that need two files together; then the runs.
- The folder for Bob's Codex session: the same texts, questions, key and steps.
- A reading at a smaller window. The large-file allowance seen here was for a 1,000,000-token window.
- Sizes 24 KB and 100 KB have two habit runs each.
