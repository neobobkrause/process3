# Reading measurements: results

Length: 108 lines. Last section: "7. Not done".

Run by Claude on 18 Nov 2026, on Bob's word "Run the three measurements." The plan is `../process3_limits_18nov_measurements.md`. Its sections 3 and 4 are done and reported here. Its section 5, the set of texts, is not done.

These are research into how well a session reads. They are not tests, checks or gates on any product.

## 1. What was run, and on what

- Harness: Claude Code 2.1.327. Model: `claude-fable-5-2`. Window: 1,000,000 tokens.
- Each reader was a fresh worker started by one research session. A fresh worker holds about 61,000 to 66,000 tokens before it reads anything.
- 108 worker runs in all: 93 scored readers (8 of them the pilot), 8 that measured what one read returns, 6 that wrote question sets, and 1 that was asked to start readers and could not.
- Text: Process3's coordinator log, real dense prose, cut from its start to each size. The read tool counted 99,890 bytes of it as 41,638 tokens, so about 2.4 bytes to a token. Ordinary prose has more bytes to a token, so the byte figures below are low for ordinary prose. That last sentence is my reasoning, not a measurement.
- Every figure below is measured, on Claude Code, on this model, on this one text, unless marked otherwise.
- Each run's record is in `results/runs/`, with every call it made, the lines each call returned, and its raw answers.

## 2. What one read returns

A plain read, giving only the file. Three workers, the same result in all three.

| File | Result |
|---|---|
| 9,943 bytes | arrived whole |
| 24,945 bytes | arrived whole |
| 49,480 bytes | arrived whole |
| 99,890 bytes (41,638 tokens) | cut: lines 1 to 114 of 223 |
| 199,924 bytes (83,039 tokens) | cut: lines 1 to 107 of 420 |
| 399,774 bytes | refused, no lines: "exceeds maximum allowed size (256KB)" |
| 500 lines (34,750 bytes) | arrived whole |
| 2,000 lines (135,578 bytes, 65,275 tokens) | cut: lines 1 to 651 |
| 4,000 lines (298,095 bytes) | refused, no lines, same message |

- The limit on a plain read is 25,000 tokens, stated by the tool. It is a limit in tokens, not bytes or lines. The tool's "2,000 lines" never came into play; the token limit came first each time.
- A cut is told to the reader, but in a separate note after the read's result, not inside it. The note names the next lines to ask for.
- The read tool has an option to read a large file anyway. With it, in a read made alone: 179,532 and 219,158 bytes (92,148 tokens) arrived whole; 249,731 bytes (105,089 tokens) and 261,835 bytes were cut at line 111, with the note "allow_large had room for 94108 tokens this turn". Reads made in the same turn share that room: five made together got 179,532 bytes whole and the other four cut.
- Not explained: in the 540 KB runs, some reads of a stated range with that option were refused at 26,000 to 35,000 tokens, while others of 45,000 to 66,000 tokens were returned.

## 3. A single text read in full

A run passes when its reads cover every line and at least eleven of twelve answers are right, all four from the last tenth among them.

Habit arm: the text is listed under "Reading set (read each file whole)" with a task; nothing is said of questions.

| Size | Bytes | Runs | Passed | Reads of the text in a run | Tokens held at the end (median) |
|---|---|---|---|---|---|
| 12 KB | 11,858 | 10 | 10 | 1 | 68,551 |
| 24 KB | 23,518 | 2 | 2 | 1 | 75,543 |
| 48 KB | 47,981 | 10 | 10 | 1 | 83,779 |
| 70 KB | 69,946 | 10 | 10 | 1 | 97,760 |
| 100 KB | 99,890 | 2 | 2 | 1 | 105,352 |
| 140 KB | 139,719 | 10 | 10 | 1 | 126,915 |
| 280 KB | 279,854 | 30 | 30 | 4 to 10 | 187,298 |
| 540 KB | 539,985 | 3 | 2 | 8 where read whole | 304,699 |

Told arm: the reader is told to read the text whole, then open the questions, then answer with no tool.

| Size | Runs | Passed |
|---|---|---|
| 24 KB | 2 | 2 |
| 100 KB | 2 | 2 |
| 140 KB | 3 | 3 |
| 280 KB | 3 | 3 |
| 540 KB | 3 | 3 |

No text at all: 3 runs, each 0 of 12 right. All three answered "unknown" twelve times.

What happened at each step:

- **Up to 140 KB** every reader took the text in one read and received every line. From 70 KB up, every reader used the large-file option on its first read, unprompted.
- **At 280 KB** no reader got the text in one read. Each paged through it, in 4 to 10 reads. In 11 of the 30 runs a read was refused on the way (up to 2 refusals in a run) and the reader asked again for fewer lines. All 30 received every line.
- **At 540 KB** two of three readers paged through all 1,297 lines in 8 reads, with 3 and 4 refusals on the way. The third had one read refused, then stopped reading and searched the text for the answers. It received 88 of 1,297 lines and answered 12 of 12.
- **Recall never failed.** Every run that had a text answered 12 of 12, at every size, the skipping run included. In the told arm the readers answered from memory, with no tool, after up to 540 KB.
- No reader that had a text opened any file but its own text and task.

## 4. The figures for the blank

- Largest size that passed: **280 KB, 30 of 30.**
- First size that failed: **540 KB, 1 of 3**, by skipping, after a refused read.
- Largest size read in **one** read, measured: **140 KB, 10 of 10.** With the large-file option one read returned up to 219,158 bytes and did not return 249,731.
- Largest size a plain read returned whole: **49,480 bytes.** The limit is 25,000 tokens.
- The Codex figure the design now holds is 24,000 bytes. Every size at or under it passed here.

## 5. What this shows and does not show

- It shows where this model, on this harness, with this window, stopped taking a real text in one read (above 140 KB) and where a reader first skipped (540 KB).
- The runs at one size are not independent trials. They share one text, one question set and one model, and many gave answers identical to the letter. "30 of 30" allows a true failure rate of up to about 10 percent only if the runs were independent. They were not, so the real bound is wider, and I cannot say by how much.
- Recall cannot show a skipped reading when the reader has tools: the run that skipped scored 12 of 12. Only the count of lines received showed it.
- It does not show: other models; a smaller window (the large-file allowance was reported as 94,108 tokens in a 1,000,000-token window, and what it is in a smaller one is unknown); text of another kind, such as code; Codex; how well a session works afterwards with that much loaded.
- The one skip came after a refused read. Whether refusals cause skips is a guess from one run.

## 6. Departures from the plan

- Workers of one session were used, not separate sessions. A worker's record is on disk and gives the same counts.
- Sizes 24 KB and 100 KB have 2 habit runs each (the pilot), not 10. The sizes on each side of them passed 10 of 10.
- The told arm ran at 24, 100, 140, 280 and 540 KB with 2 or 3 runs each, not 5 runs at 24, 70 and 140 KB.
- 540 KB was stopped at 3 habit runs once one had failed.
- The extra twenty runs went to 280 KB, the largest size that passed.
- Six question sets were written by workers and checked by `verify.py` and `onehome.py`. Three answers that the log states twice, in two forms, accept either form.
- Starting separate command-line sessions was tried once and not used: such a session ran on another model by default, and how it is billed could not be read. One check of the environment for that was refused by the permission checker and was not retried.
- A worker cannot start workers. This was tried once.

## 7. Not done

- The set measurement, section 5 of the plan. No materials exist for it.
- The folder for Bob's Codex session: the same texts, questions, key and steps.
- A reading at a smaller window.
- A run that isolates the 2,000-line default of a plain read.
