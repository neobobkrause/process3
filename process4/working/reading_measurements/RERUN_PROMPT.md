# Starting prompt for the second measurement session

Length: 82 lines. Last section: "What comes back".

Written by Claude on 18 Nov 2026 at Bob's word: "Produce an initial prompt for a different session that will rerun these measurement tests to produce load-bearingly accurate results that can we can rely on for process4-based development." Everything below the line is the prompt. The session needs two repositories: `neobobkrause/process3` to read, and `neobobkrause/process3-probes` as its test ground.

---

You are a research session. Your one job is to measure, to a standard the Process4 design can rest on, how much text a session reads in full. A first measurement was run on 18 Nov 2026 and its owner, Bob, judged it too weak to rely on. You are running the second. Its results will set figures that every Process4 session works under, so a wrong figure does harm for as long as Process4 is used.

## Read first, each file whole, and report each one's line count

In `neobobkrause/process3`, branch `claude/process4-design-handoff-7w8nh8`, under `process4/working/`:

1. `design_state_18nov.md`. Sections 3 and 13 say what the figures are for.
2. `process3_limits_18nov_measurements.md`. The plan the first measurement followed.
3. `reading_measurements/RESULTS.md` and `reading_measurements/README.md`. What the first measurement found and how it was run.
4. `harness_separation/03_codex_maximums_figures.md` and `04_codex_maximums_recommendation.md`. The Codex figures.

## What the figures are

The design keeps every text a session must read in full, and every set of texts read together, below a measured maximum. Four figures are needed: the largest single text; the largest set; the largest starting text for a role; the fill level at which a long-lived role is refreshed. The design's yardstick for all of them, in the design state's words: "after a session has read what it must, there is room for a worthwhile piece of correct work and a handover before the fill level."

## Why the first measurement cannot be relied on

Do not repeat any of these.

1. **The trials were not independent.** Each size had one text and one question set, run many times. The runs came out nearly identical, so thirty runs said little more than one.
2. **One source.** Every single text was the start of one log, so the sizes were nested and shared their first lines.
3. **The readers were workers of one session, not sessions.** No session of the kind Process4 uses was measured.
4. **One model, one window.** Everything ran on one model with a 1,000,000-token window. The read tool's allowance for large files was seen to depend on the room left in the window. Nothing is known for a smaller window.
5. **The task invited searching.** Readers were asked for twelve facts. Three readers searched instead of reading and still scored full marks. So the answers could not show whether a text was read.
6. **Nothing measured what a reading is for.** No run tested whether a rule or requirement that was read was then kept in the work that followed.
7. **Too few runs where it failed.** Three runs at the size where a single text first failed, five where a set first failed, and no size in between.
8. **Size and number of files rose together** in the sets, so their effects cannot be told apart.
9. **Figures were in bytes** of one unusually dense text. The limits found were in tokens.
10. **Question sets were written by workers and checked only by script.** Three had to be patched for facts stated twice.
11. **The answer keys sat where a reader could find them.** A control reader went looking in the repository.
12. **The plan was changed as the runs went on**, and the pass rules were not fixed in writing first.
13. **Nothing was run on Codex.**

## What a result must have to be relied on

1. **A written protocol first.** Before any run, write the protocol into the test ground: the questions to be answered, the arms, the sizes, the number of trials, the pass rule for a run and for a size, and how each figure will be drawn from the results. Commit it. Then follow it. Record every departure with its reason. Do not change a pass rule after seeing results.
2. **Independent trials.** A trial is a different text with its own questions, not a repeat. At each size use at least ten different texts, drawn from different real documents and of the kinds Process4 sessions must read: requirement files, role principles, design text, code, logs. Repeat each a few times, and report variation between texts apart from variation between repeats.
3. **Real sessions as readers.** The main arm uses separate sessions started the way Process4 starts a job: a starting text that lists a reading set, and a task. Run a second arm with workers inside a session, since Process4 uses workers for heavy reading. Report the two apart.
4. **Every window and model Process4 will use.** Find out which models and windows are available to sessions here and run each. If only one can be run, say so plainly and label every figure with it.
5. **Tasks that searching cannot answer.** Use tasks that need the whole text: a rule placed early, in the middle and at the end, whose keeping shows in what the session then does; a later passage that changes what an earlier one requires; a count or a comparison across the text; a question with no word in common with its answer's passage. Keep fact questions only as a second score.
6. **The work after the reading.** For each figure put forward, show that a session that has read that much then does a small real task correctly and keeps the rules it read. This is the design's yardstick.
7. **Coverage from the record, never from the reader's word.** Count the lines each read returned. Mark each run as read whole, read in part, or searched, and record what came just before any skip: a refusal, a cut, or nothing.
8. **Size apart from number of files.** For sets, cross total size with number of files: the same total as a few large files and as many small ones.
9. **Rising steps until failure, then fine steps.** Go up until a size fails. Then run sizes between the last pass and the first fail. Put the most trials at the size put forward as the maximum and at the next size up.
10. **Counts that carry the claim.** State for each figure how many independent trials passed and failed, and what failure rate that leaves room for, with the arithmetic. If the trials are not independent, do not use that arithmetic.
11. **Tokens and bytes.** Report every size in tokens as the harness counts them and in bytes, and give the bytes to a token for each kind of text.
12. **Questions that are sound.** Have each question set checked by a second worker that did not write it: one home for each fact, not guessable, not findable by a single search. Run each set once with the text handed over in small parts, to show it can be answered, and once with no text, to show it cannot be guessed.
13. **Keys out of reach.** Keep answer keys and scoring code where no reader can see them: not in the test ground and not in any folder a reader starts in. Check every reader's record for any file opened outside its reading set, and set such a run aside.
14. **Raw records kept.** Keep each run's calls, what each returned in lines, and its raw output, so every figure can be recounted by someone else.

## Scope

- Measure all four figures: the single text, the set, a role's starting text, and the fill level. The first measurement left the last two unmeasured.
- For the starting text: sizes from 4,096 bytes up, with rules placed at the start, middle and end, kept or not kept in a scripted task.
- For the fill level: compare rule-keeping and correctness at 20, 30, 40, 50 and 60 percent of the window. Stop short of compaction. This is the costly one; estimate it before starting.
- Codex cannot be run from here. Prepare one folder with the same texts, tasks, keys and steps, and one page of steps, so that Bob's Codex session can run the same thing unchanged. Keep its keys apart from the readers' files there too.

## The test ground

Use `neobobkrause/process3-probes` for everything a reader sees and for the protocol and results. Work on a branch of your own. Take real texts from `neobobkrause/process3` (`process4/evidence/`, `process4/definition/`, the tool's code, the coordinator's log on branch `start/coordinator-4nov`) and copy what you need into the test ground. The first measurement's scripts are in `reading_measurements/` and may be reused where they fit; its way of counting lines received from a record worked.

## How to work

- These are research. They are not tests, checks or gates on any product, and nothing in Process4 waits on them or repeats them.
- Run only on what Bob's subscription covers. Before the runs, write down how many sessions and roughly how many tokens the protocol needs. If that looks like more than the subscription covers, put it to Bob before starting.
- Use workers for heavy reading and for writing question sets. Give each a narrow brief and have it report the line counts it read.
- Commit and push before each turn ends. Refresh yourself, with a written handoff, before your window is 40 percent full.
- Plain words, no reference codes. Quote Bob's words exactly. Mark your own interpretations as yours.
- Do not assure Bob that anything will work. For every figure say what is proven, on what, and what is not.
- Do not stop while work remains that can be done productively, efficiently and safely. Put to Bob only what only he can answer, and in one form: a title, the question, an explanation, options each with what it gives and costs, and your recommendation with reasons.

## What comes back

One results file in the test ground. For each of the four figures: the largest size that passed and the first that failed, on which harness, model and window; how many independent trials stand behind each; how it failed; what is not proven. Then your recommendation for each figure, with reasons, for Bob to decide. Beside it, the protocol, the departures from it, and the raw records.
