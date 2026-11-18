Length: 110 lines. Last section: "4. What could not be checked".

# Fresh check of the design, the build texts and the starting texts, after the final check

Written by Claude (a fresh reader) on 18 Nov 2026. One reading, of the texts as they now stand on branch `claude/process4-design-handoff-7w8nh8`. Nothing was edited but this file. Paths below are short: "design" is `process4/definition/process4_definition_v7/`, "build" is `process4/definition/process4_build_v1/`, "texts" is `build/starting_texts/`.

## 1. What was read, with line counts

Every "Length: N lines. Last section: ..." line below was compared with `wc -l` and the file's last heading. All 25 are true.

| File | Lines | Bytes |
|---|---|---|
| design `00-index.md` | 93 | 10,680 |
| design `01-purpose-owner-and-decisions.md` | 79 | 8,300 |
| design `02-modules-jobs-tests-and-the-notice.md` | 109 | 15,260 |
| design `03-tranche-rounds-walks-and-release.md` | 74 | 8,790 |
| design `04-roles-and-sessions.md` | 158 | 19,360 |
| design `05-reading-and-documents.md` | 61 | 5,647 |
| design `06-rules-permissions-and-changing-the-process.md` | 72 | 9,068 |
| design `07-harness-claude-code.md` | 70 | 6,189 |
| design `08-harness-codex.md` | 50 | 4,111 |
| design `09-hosting-cloudflare.md` | 28 | 2,340 |
| design `10-open-and-unproven.md` | 108 | 10,525 |
| The design, all eleven | 902 | 100,270 |
| build `01-the-tool-and-the-required-run.md` | 138 | 23,964 |
| build `02-the-forms.md` | 283 | 22,918 |
| build `03-the-walks.md` | 198 | 20,072 |
| build `04-the-trial.md` | 141 | 13,083 |
| build `05-the-records-and-following.md` | 186 | 14,838 |
| texts `00-index.md` | 80 | 9,634 |
| texts `arch.md` | 27 | 3,843 |
| texts `coordinator.md` | 29 | 3,679 |
| texts `job.md` | 26 | 3,374 |
| texts `lane.md` | 26 | 3,240 |
| texts `process.md` | 30 | 3,886 |
| texts `root.md` | 35 | 3,950 |
| texts `walking-session.md` | 28 | 3,577 |
| texts `watcher.md` | 27 | 2,689 |

Every role text is under 4,096 bytes and plain ASCII. As filled in by the index's own made-up fill, `arch.md` comes to 4,060, as the index says. Also read, to avoid repeating settled findings: `build_texts_after_final_check.md` from line 56, and searches of `design_and_build_final_check.md`.

## 2. Findings

Ordered with the most serious first.

1. **A development release that waits for the owner's approval.**
   - build `04-the-trial.md:114`: "His approval, typed in ARCH's own session, is accepted by the permission checker for publishing a release named as the trial's. It is made with `--development`, so it is a pre-release".
   - design `03-tranche-rounds-walks-and-release.md:60`: "a development release, made only for development, is made and published in one act as a pre-release and needs no approval; his approval is for public releases." build `01-the-tool-and-the-required-run.md:66`: "With `--development` it makes a development release: a pre-release with its tag"; line 67, `release publish <version> --approval`, has no `--development`.
   - The design supports build text 1: a release made with `--development` is already published and needs no approval, so stage 6, item 4 has nothing left for the typed approval to publish. The earlier report recorded this as not ruled (`build_texts_after_final_check.md:107`); the texts still disagree.

2. **The index's sizes of the design are no longer true.** The design was amended after they were measured.
   - texts `00-index.md:38`: "03 8,610; 04 19,268; ... 10 10,452. All eleven: 99,925."
   - As the files stand: part 03 is 8,790 bytes, part 04 is 19,360, part 10 is 10,525, and all eleven are 100,270.
   - So every figure in the "Combined bytes" column (`00-index.md:44` to `:51`) is too low, by 92 to 345 bytes. As they stand: ROOT and the watcher 74,082; the coordinator 98,132; ARCH 120,544; PROCESS 115,108; a lane 68,034, the UX lane 88,106; a job 132,332; a walking session 63,099 internal and 65,439 external. Every set is still under 175,000. The files rule.

3. **The design's line count in build text 1.**
   - build `01-the-tool-and-the-required-run.md:5`: "all eleven parts read in full, 901 lines".
   - The eleven parts' own length lines, and `wc -l`, sum to 902. The files rule.

4. **A lane writes a record and is not told to read build text 5.**
   - texts `00-index.md:55`: "Each role that writes a record of the shared state reads build text 5, where the records' forms are."
   - texts `lane.md:15`: "`p4 state write` for your handover record", while `lane.md:9` names no build text but `build/03-the-walks.md` for the UX lane, and `00-index.md:49` gives a lane's build texts as "03, for the UX lane only".
   - The design does not say which build texts a role reads (part 0, section 5 leaves it to the starting text). The index's sentence and the lane's text cannot both stand.

5. **Who merges the building session's pull requests once the tool can merge.**
   - build `04-the-trial.md:28`: "Until the tool can merge, the owner merges each of that session's pull requests himself"; the same at `04-the-trial.md:127` and build `01-the-tool-and-the-required-run.md:128`.
   - design `04-roles-and-sessions.md:156`: "the owner merges each one himself. After the first build only PROCESS changes the tool." build `01-the-tool-and-the-required-run.md:65`: "In the process's repository pull requests go into `main`, and only PROCESS runs `merge`, on the owner's word."
   - The design gives the owner's merging no end before the first build is done, and build text 1, line 65 leaves the building session no `merge` in that repository. The design supports "the owner merges each one", without "until the tool can merge".

6. **What the trial asks of the owner.**
   - design `10-open-and-unproven.md:70`: "What it asks of the owner, stage by stage, is in the build text `04-the-trial.md`, section 4: session starts, two edits to his approvals, one stop, three short marked instructions, one typed approval of a trial release, and for the account switch his acts in a second account."
   - build `04-the-trial.md:127`, `:129`, `:132`, `:133`: "merge each of its pull requests, until the tool can merge"; "act 10, once the run has reported"; "Give a session the repository that holds the notice's proof"; "Enter the development copies' hosts among the cloud environment's allowed hosts; connect an AI account, only if a journey that uses AI is tried".
   - The design's list was brought up to date for the edits and the approval, and still leaves these four out. The design rules; recorded before at `build_texts_after_final_check.md:126`.

7. **The process repository's folders.**
   - build `01-the-tool-and-the-required-run.md:27`: "The process's repository has five folders: `tool/` ... `shims/` ... `starting_texts/` ... `design/` ... and `build/`".
   - design `06-rules-permissions-and-changing-the-process.md:65`: "PROCESS runs as one session at a time, keeps its own folder in the process's repository"; texts `process.md:13` names "your own folder" among what PROCESS writes.
   - The design supports a sixth folder, PROCESS's own.

8. **Act 10 before act 9.**
   - build `04-the-trial.md:21`: "Act 9, starting ROOT, comes at stage 2 ... Act 10 comes at stage 1."
   - design `07-harness-claude-code.md:70`: "Not known: whether act 10 can be done before act 9."
   - Build text 4 states the order as plain fact and marks nothing; its stage 1, item 1 (`04-the-trial.md:53`) tries a different doubt, whether the run can be required before it has first run. The design has the order as not known.

9. **Who makes the shared state in the trial's stage 1.**
   - build `04-the-trial.md:50`: "That one session then plays ARCH: it makes the shared state (`state write --create`)".
   - build `05-the-records-and-following.md:14`: "`state write --create`, run by ROOT"; build `01-the-tool-and-the-required-run.md:76`: "(ROOT in a product, PROCESS in the process's repository)".
   - Stage 1 has no ROOT. The two build texts name different sessions for the one command. The design gives the roles and wakes records to ROOT (`04-roles-and-sessions.md:72`, `:74`), which supports build texts 1 and 5.

10. **The checker's table leaves out two writes to the shared state.**
    - build `01-the-tool-and-the-required-run.md:47`, `:50`, `:51`: `open` is "Opening a draft pull request ... may also write a comment on it"; "`notify`, `state write`, `next-job`, `walk write` | Rewriting a comment on an issue"; `walk open` is "Opening an issue in the product's repository".
    - build `05-the-records-and-following.md:80`: "`open --module` copies a module's entries into its job block and takes them out of this record" (the waiting-work record). build `01-the-tool-and-the-required-run.md:78`: `walk open` "writes its number in the round record".
    - Both commands also rewrite a comment on the shared state's issue, and the table says of neither that it does. The design does not decide between them.

11. **"A told job" with a walk flaw.**
    - texts `00-index.md:75`: "How a told job hands back a walk flaw that needs no change"; texts `job.md:23` puts "A walk flaw that needs no change here goes back to ARCH" on the told job's numbered line.
    - design `02-modules-jobs-tests-and-the-notice.md:76`: "a job is a told job only when notices are its module's only work." build `05-the-records-and-following.md:133`: "With other work as well it is `ordinary`".
    - A job whose module has a walk flaw is an ordinary job. The design supports build text 5.

## 3. Count

Eleven findings. None is a false "Length" line, a starting text over 4,096 bytes, or a cross-reference to a wrong part, section or item: every one of those that I could follow pointed where it said. No starting text names a command that build text 1, section 4 lacks.

## 4. What could not be checked

- The notice proof's repository and its forms, which the build texts say they could not open either.
- The files outside the three folders that the texts cite for evidence (`permissions_inventory.md`, `owner_acts_and_approvals.md`, `notified_job_tests.md`, the earlier tool in `tool/` and `shims/`). Of `shared_state_carrier.md` I checked only that its section 7 exists, as build text 4, line 5 cites it.
- The index's "single rules" counts and its "24 items" of a first list: the counts are one reader's by a stated method, and the first list is not among the files read.
- The filled sizes of `job.md` (3,667) and `walking-session.md` (3,805): I recomputed only `arch.md`.
- The earlier reports were read in part only, so a finding above may repeat one I did not see settled; findings 1 and 6 are marked where I know they were recorded.
