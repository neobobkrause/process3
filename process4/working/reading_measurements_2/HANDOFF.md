# Second reading measurement: handoff

Length: see the end. Last section: "9. What is not proven yet". Written by the first research session (Claude) on 18 Nov 2026 for its successor. Bob's brief is `BRIEF.md` beside this file; read it whole first, then this, then the protocol.

## 1. Where everything is

| What | Where |
|---|---|
| Bob's brief, copied exactly | `process3`, branch `claude/affectionate-maxwell-guukya`, `process4/working/reading_measurements_2/BRIEF.md` |
| Protocol and departures | `process3-probes`, branch `claude/reading2-study`, `reading2_study/PROTOCOL.md`, `DEPARTURES.md` |
| What a reader sees: the texts | `process3-probes`, branch `claude/reading2-ground`, `reading2/<trial>/` |
| The same with a 200,000-token window | `process3-probes`, branch `claude/reading2-ground-200k` (same texts, one added `env` line in `.claude/settings.json`). Merge `claude/reading2-ground` into it before any small-window run. Never force-push. |
| Keys, starting texts, second messages, scripts | `process3`, this folder: `keys/`, `start/`, `followup/`, `alloc/`, `scripts/` |
| Reduced records and scores | to be committed to `process3-probes`, branch `claude/reading2-study`, `reading2_study/records/` and `reading2_study/RESULTS.md` |

Nothing that scores or keys a trial may ever be put on a `process3-probes` branch that a reader is checked out on.

## 2. Setting up a fresh session

1. Attach `neobobkrause/process3-probes` with push access (`add_repo`), clone it to `/home/user/process3-probes`, check out `claude/reading2-ground` there, and add worktrees for the other two branches (`/home/user/probes-study`, `/home/user/probes-200k`).
2. Rebuild the corpus (it is not committed; it is 11 MB of copies): `python3 scripts/fetch_corpus.py /home/user/process3 corpus_manifest.tsv /home/user/r2/corpus`. It checks every file's sha1. The branch tips it was taken from are in `corpus_refs.txt`.
3. `scripts/build.py` writes texts into `/home/user/process3-probes/reading2/` and keys into this folder. It is seeded: a trial already listed in `alloc/` is never rebuilt.
4. Records: a worker that runs a batch leaves what it fetched in this session's own project folder (`~/.claude/projects/<folder>/<session id>/subagents/*.jsonl` and `tool-results/*`). `scripts/score.py collect <that folder> /home/user/r2/records` reduces them; `score.py score /home/user/r2/records scores.json` scores them. Commit the reduced records before the turn ends: the container is not kept.

## 3. What was found about the harness (machinery checks; no figure drawn)

- All four models start as sessions here and each reports a 1,000,000-token window: `claude-fable-5-2`, `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`. A fresh session holds about 83,000 tokens before reading anything.
- `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` in the readers' branch's settings file gives a 200,000-token window (automatic compaction at 144,000). Checked once on Fable. There a fresh session is already at about 41 percent.
- A plain read returns at most 25,000 tokens. A 94,000-byte prose file came back as lines 1 to 431 of 598, and the reader asked for the rest.
- `list_events` with kinds `user` and `assistant` returns a session's whole record. Each read's result carries `tool_use_result.file` with `startLine`, `numLines`, `totalLines`. `totalLines` is the file's line count plus one.
- A large `list_events` result is not put in the caller's window; it is saved under `tool-results/` and the caller gets its path. So a cheap worker can fetch records of any size.
- `get_session` gives a session's window, tokens held, served model, and its tokens and list-price cost.
- Any session's record has `rate_limit_event` entries (ask for that kind) giving the week's use: `unifiedWindows.seven_day.utilization`. It was 0.26 at 19:33 UTC on 18 Nov. The week resets at 1795464000 (23 Nov, about 20:00 UTC). Use beyond the allowance is switched off for the organisation.
- A worker cannot start workers. A session can.

## 4. The design in one page (the protocol rules; this is a reminder)

- A trial is one text (or set, or starting text) with its own placed passages: three rules (early, middle, end), one rule changed later, three to six count sentences. Values never repeat between trials.
- First message: starting text with the reading set and the task (a small Python script from a bank of eight, plus a handover note). Second message, sent when the first turn ends: print the files with one stated command, then answer from memory, with no tool, the count question and the fact questions.
- A run passes when it was read whole (from the record), all four rules are kept, the work is correct, and the count is right. Facts are a second score.
- A text passes when all its runs pass. A size passes when no run was read in part or searched and at most one text in ten fails.
- Run ids are `<trial>-<arm letter><repeat>`: `m` main, `s` small window, `o` Opus, `n` Sonnet, `h` Haiku. The session's title is the run id; `score.py` relies on that.

## 5. What is built

- 210 trials: the single-text ladder (seven sizes from 12,000 to 768,000 bytes, ten each), the set ladder (four totals by two shapes, ten each), the starting-text ladder (six sizes from 4,096 to 131,072 bytes, ten each). Their index numbers are 0 to 9 in each `alloc/` file.
- Nine more trials for the machinery check only (index 90 and up, and set index 28). They are never used for a result.
- `scripts/tasks.py` (work bank and hidden cases), `build.py`, `makebatch.py`, `RUNNER.md` (steps for the worker that starts and collects a batch), `score.py`, `fetch_corpus.py`.

## 6. What is not built yet, in the order to do it

1. **Fact questions.** None are written. For each trial of the single-text and set ladders: one worker writes them, a second that did not write them checks them (protocol section 11.2). For a single text: six, two each from the first tenth, the middle band and the last tenth. For a set: eight, two from each of four files (first, two middle, last). The writer should be handed only those parts; the checker gets the same parts and may search the whole text for each answer. Each question is `{"id": "Q2".., "zone", "question", "answer", "accept": [strings a right answer must contain]}`; ids run Q2 to Q7 (Q1 is the count). Put them in the key's `facts` list and run `makebatch.py` again to rewrite the second message. Use Sonnet workers for this; give each a narrow brief and have it report the line counts it read.
2. **The two checks of each trial** (protocol 11.3 and 11.4): once with the text handed over in parts of at most 200 lines, once with no text. Workers on Fable. Not counted in results.
3. **Token counts** of every text, as the read tool counts them. A read of a file over 25,000 tokens is refused with the file's token count in the message; for a smaller file, read a copy repeated enough times to pass 25,000 and divide. Have a cheap worker do the reads and take the counts from its record.
4. **The fill-level trials** (protocol 15.4): no builder exists. Each needs a 4,096-byte starting text with rules, a 24,000-byte reading text with different kinds of rule, a list of filler files sized to the level, a second message with the work, and a third with the printing and the questions. Decide the filler sizes from measured bytes to a token.
5. **The worker arm**: a host session is told to start one worker with the trial's starting text as its brief, then pass on the second message. Not yet tried. Check that the host's record carries the worker's calls (events with `parent_tool_use_id`); `score.py` marks such calls `worker: true` but has not been run on one.
6. **The Codex folder** (protocol section 16): texts, starting texts, second messages and one page of steps in one folder; keys in a separate folder that is not handed to the readers.
7. **The results file.**

## 7. Cost and the allowance

- The estimate in the protocol's section 17 is about 2,800 runs and about $4,600 at list price for everything. That is very likely more than what is left of this week's allowance. See section 8 for what was put to Bob.
- The rule in force: read the week's use before each batch; start no batch that would take it past the ceiling. The ceiling is 50 percent of the week until Bob says otherwise.

## 8. Put to Bob and not yet answered

(Filled in below when this handoff was finished.)

## 9. What is not proven yet

Nothing. No measuring run has been made. The machinery check's sessions prove only that runs can be started, followed up, collected and scored.
