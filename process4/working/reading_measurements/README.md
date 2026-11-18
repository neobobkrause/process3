# Reading measurements: materials

Length: 45 lines. Last section: "What is not done".

Prepared by Claude on 18 Nov 2026. Bob's word: "Run the three measurements." Nothing has been run and nothing has been spent. The plan is `../process3_limits_18nov_measurements.md`, sections 3 to 5.

These are research into how well a session reads. They are not tests, checks or gates on any product.

## The source text

Process3's coordinator log: 1,303 lines, 540,867 bytes, real dense prose with a median line of about 400 bytes. It is on another branch, so it is not copied here:

    git show origin/start/coordinator-4nov:notes/coordinator-findings-3-4nov.md > src/log.md

## Layout the scripts expect

A working folder outside the repository holding `src/log.md`, `texts/`, `keys/` and `scripts/` (these two files).

- `python3 scripts/cut.py`, run from that folder, writes `texts/sNNN/text.md` for 12, 24, 48, 70, 100, 140, 280 and 540 KB, cutting at a line's end, and writes `keys/info.json` with each cut's size, line count and three zones by line number: first tenth, middle (40 to 60 percent) and last tenth.
- `python3 scripts/verify.py NNN` checks a question set `keys/kNNN.json` and, if it passes, writes `texts/sNNN/questions.md` and `texts/sNNN/task.md` for the readers.

## A question set

`keys/kNNN.json` is a list of exactly twelve items, four in each zone:

    {"id": "q01", "zone": "first|middle|last", "question": "...", "answer": "...",
     "accept": ["string a right answer must contain", "..."], "evidence": "exact quote from the text"}

The evidence must occur exactly once in the text and lie in the stated zone. At least one accept string must appear in the evidence, and none may appear in the question.

## How the runs were to be made

- Each reader is a fresh worker with no other context.
- Habit arm: the prompt lists the text under "Reading set (read each file whole)" and points to `task.md`. It says nothing of questions.
- Told arm: the prompt says to read the text whole first, then open `questions.md`, then answer without opening the text again or using any tool.
- Two scores for each run. Coverage: from the worker's own record, do its reads cover every line? Recall: are the answers right, sorted by zone? A told run that opens the questions early, or uses a tool on the text afterwards, is set aside and counted.
- Three workers answer with no text at all. They should score near nothing.
- Sizes rise until one fails. Ten runs at each size; thirty at the size chosen as the maximum.

## What is not done

- No question set has been written.
- No reader has been run. A small pilot (two sizes, both arms, two runs each) should come first, to prove that coverage can be counted from a worker's record.
- The set measurement (section 5 of the plan) has no materials yet.
- The folder for Bob's Codex session (the same texts, questions, key and steps) has not been made.
