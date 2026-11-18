# Second reading measurement: handoff

Length: about 90 lines. Last section: "9. What is not proven yet". Written by the first research session (Claude) on 18 Nov 2026 for its successor. Bob's brief is `BRIEF.md` beside this file; read it whole first, then this, then the protocol.

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
- A message sent with `send_message` reaches a running session as a notice from another session, which it reads with a tool call named `ReadNotifications`. It is not shown to it as an instruction. In the machinery check two of nine readers declined to act on it. So the first message now announces the follow-up (see the departures file). `score.py` takes the first `ReadNotifications` call as the moment the second message arrived.
- A reader may read through the shell (`cat`) and may write its files through the shell. Coverage for shell reads is matched by line content against what the command returned to the reader.
- Cost at list price of one Fable run, from the nine check runs: $1.14 to $1.85 for texts up to 96,000 bytes. About $1.15 of that is fixed. The nine cost $13.04.
- The week's use went from 26 to 30 percent between 19:33 and 19:58 UTC while this study spent roughly $55 to $60 at list price (this session, its workers, 15 small sessions). A second gauge, `seven_day_overage_included`, went from 52 to 61 percent. What the second gauge measures is not known. Whether other sessions of Bob's were also spending in those minutes is not known.
- The runner worker (Haiku, steps in `scripts/RUNNER.md`) started nine sessions, sent nine follow-ups and collected nine records in about 13 minutes, using 205,000 tokens of its own. Its plain `sleep` was refused; it waited with background sleeps. The starting texts it passed on were not yet compared byte for byte with the files, because the files were rewritten afterwards; do that comparison on the first real batch before trusting a Haiku runner, above all for the long starting texts.

## 4. The design in one page (the protocol rules; this is a reminder)

- A trial is one text (or set, or starting text) with its own placed passages: three rules (early, middle, end), one rule changed later, three to six count sentences. Values never repeat between trials.
- First message: starting text with the reading set and the task (a small Python script from a bank of eight, plus a handover note). Second message, sent when the first turn ends: print the files with one stated command, then answer from memory, with no tool, the count question and the fact questions.
- A run passes when it was read whole (from the record), all four rules are kept, the work is correct, and the count is right. Facts are a second score.
- A text passes when all its runs pass. A size passes when no run was read in part or searched and at most one text in ten fails.
- Run ids are `<trial>-<arm letter><repeat>`: `m` main, `s` small window, `o` Opus, `n` Sonnet, `h` Haiku. The session's title is the run id; `score.py` relies on that.

## 5. What is built

- 210 trials: the single-text ladder (seven sizes from 12,000 to 768,000 bytes, ten each), the set ladder (four totals by two shapes, ten each), the starting-text ladder (six sizes from 4,096 to 131,072 bytes, ten each). Their index numbers are 0 to 9 in each `alloc/` file.
- Nine more trials for the machinery check only (index 90 and up, and set index 28). They are never used for a result. Their runs are scored in `reading2_study/records/machinery/` on the study branch: all nine were read whole; the five whose files were printed kept all four rules, had correct work and answered the count.
- After the check the task wording changed (departures file, entry 1). All starting texts were rewritten with `build.py restart`, and the starting-text ladder was rebuilt, so its trial ids are new.
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

- Revised estimate for the whole protocol: about 3,000 runs and about $5,300 at list price. By the one calibration in hand, a whole week's allowance is worth very roughly $1,400 at list price by the first gauge and less by the second. So the protocol is several weeks of allowance.
- **No measuring run may start until Bob has answered the question in section 8.** Until then spend as little as possible. Do not start the fact-question workers or the checks either: which trials are needed depends on his answer.
- The rule once runs start: read the week's use (both gauges) from a session's record before each batch; start no batch that would take either past the ceiling Bob sets.

## 8. Put to Bob on 18 Nov, about 20:15 UTC, and not yet answered

Title: how much this measurement may spend, and how much of it to run. The options put to him:

1. Everything in the protocol, with paid extra use switched on and a cap of about $5,500.
2. The core only, with paid extra use and a cap of about $3,000.
3. The core only, inside the subscription, paced under a share of each week that he names.
4. The smallest slice: the single-text and starting-text figures only, inside the subscription.

"The core" is: the main arm only (separate sessions, Fable 5.2, 1,000,000-token window); all four figures; ten texts a size run once on the rising and fine steps; thirty texts, run twice, at the size put forward and the next size up; ten sessions at each fill level; every trial checked both ways before use. Left out of the core: the small-window arm, the Opus, Sonnet and Haiku arms, the worker arm, and the second run of each text on the rising steps. My recommendation was option 3 at 40 percent of each week.

He was also asked whether Process4 will run sessions on any model other than Fable 5.2, or with a small window. If not, those arms need never run.

When he answers: write his words exactly at the top of `DEPARTURES.md` with the date, record any change of scope there as a departure with its reason, and go on from section 6.

## 9. What is not proven yet

Nothing. No measuring run has been made. The machinery check's sessions prove only that runs can be started, followed up, collected and scored.
