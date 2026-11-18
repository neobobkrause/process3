# Measuring the maximums: a proposal

Length: 103 lines. Last section: "9. Order, cost and what the result is". This is the second file. The first, `process3_limits_18nov.md`, lists Process3's limits and says which blanks they leave open.

Written by a Claude worker on 18 Nov 2026. Everything here is proposed. Nothing has been run. Every cost is my estimate.

## 1. What these measurements are

They are research into how well a session reads. They are run once, by a research session, on the process's own documents. They are not tests, checks or gates on any product. No job, round, merge or release waits on them, and Process4 does not repeat them. The reading audit that the design leaves out stays out.

Three things are not known, and one is ruled but untested:

1. The size at which one real text stops being read in full.
2. The size at which a set of real texts stops being read in full.
3. Whether a starting text larger than Process3's 4,096 bytes is still kept to.
4. Whether reading and rule-keeping are worse at a fill of 40 percent or more than at a low fill. Bob has ruled 40 percent.

## 2. What makes them credible

The Codex study and Process3's record show what was missing. Each point below answers one gap.

- **Real dense text.** The Codex set was almost all one repeated sentence. Real text is at hand in this repository: Process3's Foundations (69,452 bytes), Bob's ledger decisions (143,605), the tool's guide (134,219), the decision records (49,077), the sixth draft (93,937), the coordinator's log (540,867), more than twenty evidence files of 22,000 to 137,000 bytes, and 1.7 MB of the tool's code.
- **Sizes rise until reading fails.** The Codex study stopped at sizes that worked. Here each ladder goes on until a size fails or the window is full. A maximum is reported as the largest size that passed, with the first size that failed beside it.
- **Many fresh sessions.** Ten at each size. Ten passes in ten still allow a true failure rate of up to about 26 percent. So the size chosen as the maximum is run thirty times, which brings that bound to about 10 percent. Both bounds are plain arithmetic on the counts.
- **Questions with one home.** Each answer sits in exactly one place in the text, checked by search. The texts are private to this repository, so no answer can be known beforehand. Three sessions answer with no text at all; they should score near nothing. The smallest size must pass; if it does not, the questions are at fault.
- **Questions come after the reading.** The session reads first. The questions arrive in a second message and are answered without tools. The session's record shows whether a tool was used.
- **Two scores for each run.** Coverage: do the reads, counted from what each read returned and not from what it asked for, cover every line? Recall: are the answers right, sorted by where the fact sits, in the first tenth, the middle or the last tenth? Process3's own rule for judging a full reading was "what it can cite from the end of a document". The last tenth is that test.
- **Two ways of asking.** "Told": the session is told to read the text whole and that questions follow. This shows what it can do. "Untold": the session gets a small real task that needs the whole text, with the text listed under "Reading set (read each file whole)" as Process3's START did, and no word of questions. This shows what it does by habit, and it is the one that matches the design's sentence "keeping below the maximum reliably results in one".
- **The harness is recorded.** For each run: the model, the window, the fill after reading, and what each read returned.

## 3. First: what one read returns on Claude Code

- **What is run.** One session reads real files of 10, 25, 50, 100, 200 and 400 KB, and files of 500, 2,000 and 4,000 lines, one read each. For each it reports the last line it received. The researcher compares that with the file.
- **Runs.** Three sessions.
- **Result.** For each size: arrived whole, cut with a notice, cut with no notice, or refused.
- **Shows.** The largest text that arrives in one read on Claude Code. This is the counterpart of the 24,000 bytes found on Codex. The only figure now in hand is the tool's own text, "Reads up to 2000 lines by default", which is documented and bounds lines, not bytes.
- **Does not show.** Anything about how well the text is then read.

## 4. A single text read in full

- **Texts.** Real documents cut at a section's end to 12, 24, 48, 70, 100 and 140 KB. If none fails, 280 and 540 KB.
- **Questions.** Twelve for each text: four from the first tenth, four from the middle, four from the last tenth.
- **Runs.** Untold: ten sessions at each of the six sizes, sixty in all. Told: five sessions at 24, 70 and 140 KB, fifteen in all. Three with no text. Twenty more at the size chosen as the maximum. About one hundred short sessions.
- **A run passes** when its reads cover the whole text and at least eleven answers are right, all four from the last tenth among them.
- **A size passes** when ten runs of ten pass. It fails when any run skips part of the text or misses the end.
- **Cost.** These are short sessions of a few turns. I estimate $0.50 to $2 each, so $50 to $200. For scale, Process3's job sessions, which were far longer, had a median cost of $2.35 (the coordinator's log, line 192).
- **Shows.** The size at which sessions of this model, on this harness, begin to skip or lose part of one real text, by habit and when told.
- **Does not show.** Other models. Text of another kind, such as code. Codex.

## 5. A set of texts read together

- **Sets.** Built from real files, each piece under the single-text maximum just found. Sizes: 100, 175, 250, 400 and 700 KB. If none fails, 1 MB.
- **Questions.** Twenty for each set, spread over the files. Four come from the last file read and four from the middle of the set. Two need two files together, for example two files that give different figures for one thing, with the question of which is the later.
- **Runs.** Untold: ten sessions at each of the five sizes. Twenty more at the size chosen. About seventy sessions.
- **A second, smaller arm.** The same set at two sizes is read by a helper inside a session, five runs each. Process4 reads large sets through helpers. A helper's reads do not show in its parent's record, so only recall is scored there.
- **Pass and fail.** As for a single text, with every file covered.
- **The window.** The fill after reading is recorded. If the sessions' window is 200,000 tokens, the largest sets will not fit. That is a finding to record, not a fault in the method.
- **Cost.** More is loaded in each run. I estimate $2 to $6 a run at the large sizes, so $150 to $300.
- **Shows.** The size at which a set stops being read in full by one session.
- **Does not show.** How well a session works afterwards with that much loaded.

## 6. A role's starting text

Process3's 4,096 bytes and ten rules were ruled, and they held. This measurement is needed only if Bob wants to know whether a larger starting text is safe. The design already brings to him the case where a role's principles cannot be kept short.

- **Texts.** Starting texts of 4, 8, 16 and 32 KB made from Process3's real rulebooks and prompts. Six marker rules are placed at the start, the middle and the end. A marker rule is one whose keeping shows in what the session does: a set form for the first line of every report, a file to write before the first commit, a word never to use in a commit message.
- **Task.** A scripted task of about fifteen minutes in an empty practice repository. It gives each marker rule an occasion.
- **Two ways of giving the text.** As the session's first message, and as a file it is told to read once. Process3 used both.
- **Runs.** Five sessions for each size and each way. Forty sessions.
- **A size passes** when all six marker rules are kept in every run.
- **Cost.** I estimate $1 to $3 each, so $40 to $120.
- **Shows.** Whether rules in a text of that size are kept just after the start, and whether a rule's place in the text matters.
- **Does not show.** Whether rules are still kept hours later. Whether a rule that was not kept was unread, or read and not followed.

## 7. The fill level

Bob has ruled 40 percent. A measurement cannot prove a level right. It can show whether reading and rule-keeping are plainly worse at 40, 50 or 60 percent than at 20.

- **What is run.** Six sessions. Each starts with an 8 KB starting text holding marker rules and a 24 KB text of facts. It then does real work that fills its window: reading Process3's tool code one file at a time and writing a short account of each.
- **Probes.** At 20, 30, 40, 50 and 60 percent, read with get_session, the session gets six new questions on the two starting texts, none asked before, and one small task that gives two marker rules an occasion. It stops at 60, short of compaction.
- **Score.** Recall and rules kept at each level, set against the 20 percent level. With six sessions only a large fall will show.
- **Cost.** This is the costly one. Process3's record has one figure: a session at 73 percent had cost $97.99 (the coordinator's log, line 716). I estimate $30 to $80 a session, so $200 to $500.
- **Shows.** Whether there is a plain fall below 60 percent, and about where.
- **Does not show.** Small falls. What compaction does. Sessions that run for days. A window of another size, unless both are run.

I would run this last, and only on Bob's word.

## 8. Codex

None of this can be run on Codex from here. Codex needs Bob's OpenAI account.

- The texts, the questions, the answer key and the steps are written as one folder and one page of steps. Bob's Codex research session can then run the same thing unchanged, and the two harnesses can be set side by side.
- Until that is done, the Codex figures stay what they are: sizes that worked, on a set that was almost all filler.
- A hosted Codex session shows no fill level. So the measurement in section 7 cannot be run there as written.
- Bob's ruling is that the Codex maximums are used. My reading: if a figure measured on Claude Code came out smaller than the Codex one, that would be put to him. It is not decided here.

## 9. Order, cost and what the result is

- **Who runs it.** One research session on Claude Code, started on Bob's word. It builds the texts and questions and checks each answer has one home. It starts the reader sessions, each in a folder that holds only the texts. It reads their records, scores them, and writes the result with every raw answer kept.
- **Order.** Section 3, then 4, then 5. Sections 6 and 7 only if Bob asks for them.
- **Size.** Sections 3 to 5 are about 180 short sessions. I estimate $200 to $500 in all, and one to two days if about twenty sessions run at once, as Process3 ran them. Section 6 adds forty sessions. Section 7 adds six long ones.
- **What comes back.** For each blank: the largest size that passed, how many runs passed, the first size that failed and how it failed, and the harness facts. Each figure is labelled measured, on Claude Code, on real text.
- **What does not come back.** A guarantee. The design says so already: "Nothing can ensure a full reading". And no figure for Codex.
