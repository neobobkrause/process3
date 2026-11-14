# Verification of the Process3 forensic review against the git record

Verifier pass, 13 Nov 2026. Record: `/home/user/neobobkrause/process3` (read-only; nothing pushed, no ref changed).
Review under test: `/tmp/claude-0/-home-user/5fb00928-6c32-53d3-a000-4e1f643cb17f/scratchpad/work/review.txt`.
GitHub API not used. Everything below is from git objects only. Times are UTC unless marked PT (the merge commits carry -08:00).

Verdict scale: confirmed / roughly right / wrong / cannot be checked from git.

## 0. Method and scripts

All scripts are in `/tmp/claude-0/-home-user/5fb00928-6c32-53d3-a000-4e1f643cb17f/scratchpad/v/`:

| Script | What it does | Output |
| --- | --- | --- |
| `series.py` | For each of the 296 first-parent commits of `origin/tranche`: lines in `tool/lib/**` + `tool/p3.mjs` (code), `tool/test/**` minus fixtures (tests), fixtures, "refus" counts, `test(`/`it(` counts | `series.json` |
| `series2.py` | Same commits: `fail(` call sites, `throw`, setup conditions, PD/BD headings, P-numbers, line/byte size of prompt, rulebook and governing files | `series2.json` |
| `numstat.py` | `git log --first-parent -m --numstat --no-renames` per merge, split by area | `numstat.json` |
| `prlist.py` | One record per merged PR: deltas plus the PR's own non-merge commit subjects/bodies (`git log --no-merges <merge>^1..<merge>^2`) | `prs.json`, `prlist.txt` |
| `classify.py` | My hand labels for a 118-PR systematic sample and the tally | stdout |
| `phrases.py` | `git grep -i -c -E <phrase> <commit>` at every first-parent commit, printing each change in which files hold the phrase | `phrases.txt` |
| `blame_deleted.py` | Age of the lines a commit deletes (`git diff -U0` then `git blame --line-porcelain <parent>`) | stdout |

Plain git commands that reproduce the headline figures without the scripts:

```sh
cd /home/user/neobobkrause/process3
git rev-list --all --count                      # 2459
git rev-list --count origin/tranche             # 1269 ; origin/main 40
git log --first-parent --format='%s' origin/tranche \
  | grep -c -E 'Merge PR [0-9]+|Merge pull request #[0-9]+|\(#[0-9]+\)$'     # 294
# merges per day, UTC and Pacific
TZ=UTC git log --first-parent --date=format-local:'%Y-%m-%d' --format='%cd %s' origin/tranche \
  | grep -E 'Merge PR [0-9]+|Merge pull request #[0-9]+|\(#[0-9]+\)$' | cut -d' ' -f1 | sort | uniq -c
TZ=America/Los_Angeles git log --first-parent --date=format-local:'%Y-%m-%d' --format='%cd %s' origin/tranche | (same pipe)
# size and string counts at a commit C  (237c02a = PR 37, 0819c83 = PR 293 peak, cd2254a = end of 8 Nov, 38b0f3f = tip)
git grep -c '' C -- tool/lib tool/p3.mjs | awk -F: '{s+=$NF} END{print s}'          # tool code lines
git grep -c '' C -- 'tool/test/*.mjs'   | awk -F: '{s+=$NF} END{print s}'          # test lines (fixtures excluded)
git grep -o -i 'refus' C -- tool/lib tool/p3.mjs | wc -l                            # "refus*" strings
git grep -o -i -w -E 'refuse|refusal' C -- tool/lib tool/p3.mjs | wc -l             # the two exact words only
git grep -E '^\s*(test|it)\(' C -- tool/test | wc -l                                # tests
git grep -o -E '(^|[^A-Za-z0-9_.])fail\(' C -- tool/lib tool/p3.mjs | wc -l         # fail() call sites
# gross written / deleted, PR granularity
git log --first-parent -m --numstat --no-renames --format='@@%H' origin/tranche -- tool
# a merge's own figures
git diff --shortstat <merge>^1 <merge>            ;  git diff --shortstat <merge>^1 <merge> -- tool
```

Definitions used throughout: **tool code** = `tool/lib/**` + `tool/p3.mjs`, raw line count (`wc -l` equivalent, blank lines and comments included). **Tests** = `tool/test/**` excluding `tool/test/fixtures/**`. This is the review's own definition ("tool/lib and p3.mjs") and reproduces its baseline exactly, so the comparison is like for like.

## 1. Pull requests and merges per day

| Claim | Measured | Verdict |
| --- | --- | --- |
| 2,459 commits | `git rev-list --all --count` = 2,459 | confirmed |
| "302 pull requests", "rewrote its own tool 302 times" | Highest PR number is 302. **294** are merged on `origin/tranche` first-parent (the 296 first-parent commits are 2 direct commits on 1 Nov + 294 PR merges). #8 and #21 merged to `main` only. #199 merged into another build branch and reached tranche inside PR 191. #104, #158, #178, #271, #297 never merged (158 "stopped on Bob's word", 271 closed, 297 "waits for Bob", per the coordinator log). Of the 294, **252** changed tool code; 42 did not (14 are the owner's own `neobobkrause-patch-*` approvals/settings edits, 24 are decision-record, governing, rulebook, setup or workflow text, 4 change tests only). | roughly right: 302 is PRs opened, not merges, and not all are tool changes |
| 61 merges on 3 Nov | UTC: 30. Pacific (-08:00): **61**. | confirmed only in Pacific time |
| 75 merges on 4 Nov "(UTC)" | UTC: **75**. Pacific: 49. | confirmed in UTC |
| 16 by early afternoon 9 Nov (to 14:20Z) | 16 merges with commit time <= 14:20Z (the 17th is at 14:23Z). Whole UTC day: 25. | confirmed |

Per day (PR merges on tranche first-parent):

| Day | UTC | Pacific |
| --- | --- | --- |
| 1 Nov | 3 | 7 |
| 2 Nov | 22 | 28 |
| 3 Nov | 30 | 61 |
| 4 Nov | 75 | 49 |
| 5 Nov | 46 | 34 |
| 6 Nov | 25 | 47 |
| 7 Nov | 40 | 23 |
| 8 Nov | 28 | 31 |
| 9 Nov | 25 | 14 |
| total | 294 | 294 |

**The review's day table mixes time zones.** Its "3 Nov: 61" is a Pacific day and its "4 Nov: 75 (UTC)" is a UTC day; the two windows overlap by 8 hours (4 Nov 00:00Z to 08:00Z, which is 3 Nov 16:00 to 24:00 PT), and **41 merges are counted in both figures**, so the two cannot be added or read as consecutive days. In one consistent zone the peak day is 75 (UTC, 4 Nov) or 61 (Pacific, 3 Nov), never both.

## 2. Tool size

| Claim | Measured | Verdict |
| --- | --- | --- |
| Baseline at PR 37 (2 Nov evening PT): 3,120 lines, 213 tests, 18 setup conditions | PR 37 = `237c02a`, 3 Nov 02:21Z (2 Nov 18:21 PT): 3,120 code lines, 3,679 test lines, 213 `test(` calls, 18 entries in `setup/conditions.json` | confirmed exactly |
| Peak 23,900 on 9 Nov | Peak is **24,897** at PR 293 (`0819c83`, 9 Nov 14:23Z), with 30,986 test lines. No commit on the series reads 23,900 (nearest: 23,798 at PR 286, 23,696 at PR 284). | roughly right, understated by about 1,000 lines (4%) |
| "about sevenfold" | 24,897 / 3,120 = 8.0x at peak; 23,429 / 3,120 = 7.5x at the tip | roughly right |

Series at the last merge of each UTC day (`series.json`, `series2.json`):

| End of UTC day | Tool code lines | Test lines | Fixture lines | `test(` calls | `.test.mjs` files | "refus*" strings | `fail(` sites |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Nov | 1,332 | 709 | 0 | 49 | 5 | 5 | 49 |
| 2 Nov | 2,739 | 3,792 | 0 | 230 | 8 | 17 | 100 |
| PR 37 (3 Nov 02:21Z) | 3,120 | 3,679 | 0 | 213 | 14 | 62 | 141 |
| 3 Nov | 5,175 | 5,760 | 0 | 302 | 23 | 107 | 243 |
| 4 Nov | 11,037 | 15,202 | 272 | 708 | 57 | 187 | 408 |
| 5 Nov | 16,887 | 23,294 | 272 | 1,016 | 83 | 337 | 568 |
| 6 Nov | 19,085 | 22,598 | 1,044 | 1,009 | 86 | 371 | 678 |
| 7 Nov | 21,670 | 26,526 | 1,044 | 1,157 | 103 | 480 | 710 |
| 8 Nov | 22,854 | 28,174 | 1,044 | 1,216 | 109 | 507 | 755 |
| 9 Nov peak (14:23Z, PR 293) | 24,897 | 30,986 | 1,044 | 1,298 | - | 519 | 814 |
| 9 Nov tip (18:13Z, PR 302) | 23,429 | 28,882 | 1,044 | 1,223 | 112 | 464 | **818** |

The tool began 9 Nov at 22,854 code lines and ended it at 23,429: the audit day, cuts included, was net **+575** code lines.

## 3. "refuse / refusal" strings: 62 -> 507

Measured: case-insensitive substring `refus` in tool code = **62** at PR 37 and **507** at the end of 8 Nov (PRs 269 to 280). Verdict: **confirmed**, with three qualifications.

- 507 is neither the peak nor the end. Peak 519 (9 Nov 13:51Z to 14:23Z); tip 464.
- The count is of every `refus*` token (refused 174+12, refusal 88, refuses 80+3, refusals 28+6, refusing 10 at the tip), most of them in comments and message text. The two exact words "refuse"/"refusal" go 17 -> 123 -> 101.
- It is a weak proxy. The tool stops a command through `fail(msg)` (`tool/lib/util.mjs:33`). `fail(` call sites go **141 (PR 37) -> 755 (end 8 Nov) -> 818 at the tip**, and 818 is the all-time high: the 9 Nov cuts removed 58 "refus" strings but the count of stop sites finished the day higher than it began (755 -> 818).

## 4. Gross written against deleted

`numstat.py`, per-PR first-parent diffs summed over all 294 merges:

| Area | Added | Deleted | Net (= tip size) |
| --- | --- | --- | --- |
| Tool code | 35,873 | 12,444 | 23,429 |
| Tests | 40,643 | 11,761 | 28,882 |
| Code + tests | **76,516** | **24,205** | 52,311 |
| All of `tool/` (with fixtures) | 77,686 | 24,318 | 53,368 |

Review: about 78,000 written, about 24,000 deleted. Verdict: **confirmed** at PR granularity. At commit granularity (`git log --no-merges --numstat origin/tranche -- tool/lib tool/p3.mjs tool/test`) 85,977 lines were added, so about 9,500 more lines were written and rewritten inside PRs before merging.

Only **8 of 294** merges reduced `tool/` in net lines; **10** reduced tool code; **10** reduced `fail(` sites; 132 increased `fail(` sites.

## 5. The named deletions

| Review | PR / commit | Whole-repo merge diff | Net | Verdict |
| --- | --- | --- | --- | --- |
| Early cut, -1,364 | PR 32 `b33f1e6`, 3 Nov 01:41Z ("Build J: cut the tool back") | +339 / -1,703 | **-1,364** | confirmed (the figure is net) |
| 5 Nov removal, -1,273 | PR 177 `dce01e3`, 5 Nov 20:57Z | +369 / **-1,273** | -904 (tool code -278) | confirmed as gross deletions; net is -904 |
| Merge train, -9,252 | PR 191 `d18ef1b`, 6 Nov 19:11Z (commit `5dddedc`: +478 / -9,253) | +1,311 / **-9,252** | -7,941 (tool code -3,018) | confirmed as gross deletions; net is -7,941 |
| Usage ledger, -3,523 | PR 295 `b115b83`, 9 Nov 14:51Z | +288 / -3,811 | **-3,523** (tool code -1,589) | confirmed (the figure is net) |

The review quotes two of these net and two gross, without saying so. On a like-for-like net basis the four are -1,364, -904, -7,941, -3,523.

"6,858 of them had been written in the previous 27 hours" (merge train): `blame_deleted.py` on PR 191's merge diff finds 4,286 of 9,252 deleted lines committed within 27 h, 6,839 within 36 h, 8,729 within 48 h; on commit `5dddedc` alone, 5,758 within 27 h and 6,349 within 30 h (median age 25.5 h). Verdict: **roughly right**; the figure matches a 30 to 36 hour window, not 27.

A fifth cut the review folds into "the receipt ... cut": PR 296 `daf6cc3`, 9 Nov 15:27Z, +440 / -1,343, net -903 (tool code -393).

What happened after each cut (code lines, `series.json`):

| Cut | Tool code before -> after | Pre-cut size regained |
| --- | --- | --- |
| PR 32 | 3,431 -> 2,897 | 20.3 h later (PR 43) |
| PR 177 | 16,992 -> 16,714 | 9.0 h later (PR 183) |
| PR 191 | 21,101 -> 18,083 | 20.6 h later (PR 236) |
| PR 295 + 296 | 24,870 -> 23,030 | not regained by the tip; +399 in the 2 h 45 min after PR 296; `fail(` sites regained in 37 minutes (PR 299) |

## 6. Kinds of change

I read the merge subject and every commit subject of all 294 merged PRs (`prlist.txt`), and hand-labelled a systematic sample of **118** (every PR number divisible by 3, plus every number = 1 mod 15; spread 2/8/12/30/19/11/16/11/9 over 1 to 9 Nov). Labels overlap, as the review's do. `classify.py` holds every label.

| Kind | My sample (n=118) | Scaled to 294 | Review (of 302) | Verdict |
| --- | --- | --- | --- | --- |
| Fix to earlier process code | 56 (47%) | ~140 | 131 (43%) | roughly right |
| New check, gate, refusal or hold | 33 (28%) by subject; 48 (41%) counting PRs that add 5+ `fail(` sites | ~82 to ~120 | 123 (41%) | roughly right. Independent measure: 132 of 294 merges (45%) raised the `fail(` count |
| New capability or flow | 35 (30%) | ~87 | 90 (30%) | roughly right |
| Text or decision record only | 16 (14%) | ~40 | 45 (15%) | roughly right. Measured directly: 42 merges change no tool code |
| Loosened or removed | 20 (17%) | ~50 | 92 (30%) | looks high. Only 10 merges cut tool code and only 10 cut `fail(` sites; of my 20 "loosened" labels, 17 loosened a behaviour without reducing code |
| New bookkeeping | 10 (8%) | ~25 | 97 (32%) | cannot be checked from subjects; rows and measures are mostly in diffs, which I did not tag |

Fixes are the largest single kind in my sample and 44 of the 56 fix PRs add no new check or capability by subject. By period the fix share is 5 of 22 (1 to 3 Nov), 28 of 49 (4 to 5 Nov), 14 of 27 (6 to 7 Nov), 9 of 20 (8 to 9 Nov). The review's central proportion (more changes repair the process's own earlier code than add capability) holds.

Supporting figure for the review's "review rounds supplied roughly 10 to 35% of the lines": of 705 non-merge commits touching tool code or tests, 278 have a review-fix subject (review / fix pass / findings) and they carry 20,406 of 85,977 added lines, **24%** (by day 11% to 51%). Roughly right.

## 7. Restraining text in files sessions were told to load

Searched at every first-parent commit (`phrases.py`): "caution is a cost", "measured failure", "GAP-3", "no change".

| When (UTC) | PR | What changed |
| --- | --- | --- |
| 3 Nov 01:31 | 30 | `tool/lib/roles.mjs` gains the `PRIORITIES` line: "Caution is a cost, paid only against a measured failure or Bob's word. Build and do the smallest thing the work needs." It is the first paragraph of every tool-printed **ROOT, BOB and watcher** prompt. Never removed. |
| 3 Nov 01:38 | 33 | `tool/lib/review.mjs` (the reviewer's brief for a product pull request) gains the same sentence plus 'A "what if" is one line in your report, never code or owed work', and the "note: <one line, no change>" verdict form. Never removed. |
| 4 Nov 00:06 | 58 | Rulebooks created. `rulebooks/job.md` rule: "Caution is a cost ... (GAP-3 ...). Nudge."; `bob.md`: 'A reviewer\'s "what if" is ... answered by default with no change (GAP-3, TXT-6 ...). Nudge.'; `root.md` and `worker.md` cite GAP-3. All still present at the tip. |
| 5 Nov 01:45 | 139 | `bob.md` loses one "measured failure"/GAP-3 mention in a reword; the "no change" rule stays. |
| 7 Nov 05:51 | 233 | `governing/foundations.md` and `ledger-map.md` first enter the repository ("snapshot ... from claude.ai"). Before this the Foundations, the only full statement of GAP-3, was not in git at all. |
| 9 Nov tip | - | Present in: `roles.mjs` (1), `review.mjs` (1), `rulebooks/job.md`, `bob.md`, `root.md`, `worker.md`, `governing/foundations.md` (4), `ledger-map.md` (1). |

Never present, at any commit: `CLAUDE.md` (the only file every process3 session loads; it holds standing approvals and nothing else), `README.md` (the tool manual, 8 KB -> 134 KB), `shims/CLAUDE.process.md`, `rulebooks/watcher.md`, `rulebooks/layer-branch.md`, `rulebooks/account-switch.md`, and the **coordinator's prompt** (`coordinatorPrompt` in `roles.mjs`, added by PR 162 on 5 Nov 17:01Z: it points at CLAUDE.md and the handoff note and carries no priorities line).

On the coordinator's branch (`origin/start/coordinator-4nov`): 0 of 26 handoff notes cite GAP-3, "caution is a cost" or "measured failure"; 4 of 26 mention caution at all (4 Nov x2 quoting "Stop being overly cautious", 7 Nov x2). In the 1,302-line coordinator log, 3 lines cite any of the three phrases.

Verdict on the review's claim that the rule "was not where the decisions were made": **confirmed**, with one correction. The review's "Why" section says the sentence "lived in the Foundations and, as a nudge, in the product session's rulebook". It was also the opening line of every ROOT, BOB and watcher prompt from 3 Nov to the end, and in the reviewer's brief. So the product-side roles had it in front of them at every start for the whole week; the coordinator and the builders, who made the process changes, had it in nothing the repository told them to load. There is no builder prompt or rulebook in the repository at all, and no coordinator rulebook was ever merged (a draft exists on `origin/build/owner-asks`, PR 158, 5 Nov 15:06Z, "stopped on Bob's word 15:27"; that draft does not contain the sentence either).

"No change" as an option: the phrase appears as a default answer only for a reviewer's "what if" (`bob.md`, `review.mjs`). `DECISIONS.md` has 1 occurrence in 184 lines. I did not read the design notes, so the claim "none listed no change as an option" is not checked here beyond that.

File sizes, lines / bytes, at the last merge of each UTC day (lines are long, so bytes are the better measure):

| File | 2 Nov | 4 Nov | 6 Nov | 9 Nov |
| --- | --- | --- | --- | --- |
| `CLAUDE.md` (approvals) | 3 / 4,668 | 13 / 6,489 | 15 / 6,937 | 11 / 2,818 |
| `README.md` (manual) | 47 / 7,955 | 145 / 89,805 | 171 / 116,270 | 200 / 134,219 |
| `tool/lib/roles.mjs` (role prompts) | absent (218 / 17,864 on 3 Nov) | 333 / 25,708 | 413 / 33,960 | 429 / 35,229 |
| `tool/lib/review.mjs` (review brief) | absent (91 / 6,192 on 3 Nov) | 138 / 10,375 | 139 / 10,613 | 130 / 9,823 |
| `rulebooks/bob.md` | absent | 23 / 3,439 | 23 / 4,061 | 23 / 4,039 |
| `rulebooks/job.md` | absent | 19 / 1,619 | 19 / 1,985 | 19 / 2,005 |
| `rulebooks/root.md` | absent | 19 / 2,389 | 22 / 3,307 | 22 / 3,307 |
| `rulebooks/watcher.md` | absent | 16 / 1,899 | 16 / 2,113 | 16 / 2,114 |
| `rulebooks/worker.md` | absent | 16 / 1,065 | 16 / 1,207 | 16 / 1,204 |
| `rulebooks/merger.md` | absent | absent (19 / 2,346 on 5 Nov only) | removed | absent |
| `rulebooks/account-switch.md` | absent | absent (24 / 3,059 on 5 Nov) | 24 / 2,963 | 68 / 8,375 |
| `rulebooks/layer-branch.md` | absent | absent | 19 / 6,561 | 16 / 3,082 |
| `shims/CLAUDE.process.md` | absent | 6 / 878 | 6 / 1,019 | 6 / 1,019 |
| `governing/foundations.md` | not in git | not in git | not in git (306 / 68,019 on 7 Nov) | 306 / 69,452 |
| `DECISIONS.md` | absent | absent | 27 / 3,969 | 184 / 49,077 |

The role rulebooks held their "at most ten rules" cap all week and barely grew. Growth in instructing text went to the README (17x), the role-prompt generator (2x) and, from 6 Nov, the decision record (0 -> 49 KB in four days).

## 8. End state at the tip (`38b0f3f`, 9 Nov 18:13Z)

| Item | Measured | How |
| --- | --- | --- |
| Tool code | 23,429 lines in 66 files (`tool/lib` 65 + `p3.mjs`) | `git grep -c ''` |
| Stop sites | **818** `fail(` call sites (PR 37: 141); 73 `throw`; 82 `findings.push(`/`finding(` sites | `git grep -o` |
| "refus*" strings | 464 in tool code (678 more in tests); 32 literal "refused:" messages | `git grep -o -i` |
| Setup conditions | **22** entries in `setup/conditions.json` (14 at PR 15, 18 at PR 24, 20 at PR 56, 21 at PR 202, 22 at PR 239) | JSON parse |
| Tests | **112** `.test.mjs` files (129 files under `tool/test` with fixtures and helpers), **1,223** `test(` calls, 28,882 lines | `git ls-tree`, `git grep` |
| Decision records | **31** headings in `DECISIONS.md`: PD-1 to PD-25 plus PD-19b (26: 23 attributed in their own heading to the coordinator, 3 to Bob, namely PD-21, 22 and 25), BD-R1 to BD-R5 (5, all Bob's). By heading date: 3 on 6 Nov, 5 on 7 Nov, 12 on 8 Nov, 11 on 9 Nov. The file did not exist before 6 Nov. | `grep -E '^##+ (PD|BD)-'` |
| Principles | Foundations table rows P24, P25, P26, P27 exist, each marked "(Bob's, 6 Nov 2026)". P-numbers cited anywhere in the file: 25 distinct, P1 to P27 with no P14 or P15. In git only from 7 Nov 05:51Z (PR 233). | `git show`, regex |

Review's "P24 to P27 added" and "PD-17 is still in the decision record": **confirmed**. The 18 -> 22 setup conditions: review gives only the 18; **confirmed**.

## 9. Material points the review misses or gets wrong

1. **The cuts did not hold, and the review does not say so.** Each of the first three large cuts was regrown to its pre-cut code size in 9 to 21 hours (table in section 5). On 9 Nov, in the 3 h 22 min after the usage-ledger cut merged, six more PRs merged (one the second cut, one the owner's settings edit), including a new merge design (PR 299, "direct flow", PD-25: +386 code lines, +22 `fail(` sites, 16:04Z). The tip has the highest `fail(` count of the week (818) and 575 more code lines than the day began with. The review's own headline metric ("refuse" strings) falls on 9 Nov and so hides this.

2. **One of Bob's four 9 Nov cuts never landed.** `DECISIONS.md` PD-21 cut 2 records "process3's own CI runs the tool tests once, on Node 22" and lists "one CI run instead of two" as a consequence. The change was split out as PR 297 (`origin/build/c57-ci`, last commit 9 Nov 15:49Z) because the merge tool holds workflow changes for Bob's word, and it was never merged. `.github/workflows/ci.yml` at the tip still runs the whole suite twice (Node 22 and Node 26). The decision record states an outcome the repository does not have.

3. **Day counts mix time zones** (section 1): 61 is a Pacific day, 75 a UTC day, and they overlap.

4. **"302 times" overstates.** 294 merges; 252 touched tool code; 14 of the merges are the owner's own approvals and settings edits through GitHub's web editor (`neobobkrause-patch-*`), and 5 PRs never merged.

5. **Deletion figures are on mixed bases** (section 5): the two largest-sounding ones (-9,252 and -1,273) are gross; net they are -7,941 and -904.

6. **The peak is understated** (24,897, not 23,900), a small error against the review's own argument.

7. **The 5 Nov "subtractive audit" was nearly cancelled within ten hours.** PR 177 cut 278 tool-code lines at 20:57Z; PR 185 ("audit-restores", 6 Nov 06:45Z, 9 h 48 min later) added 222 back. The review reports the restore but not that it returned 80% of the code. In the 18 hours after the audits the tool grew by 1,480 to 2,410 code lines depending on the window's start (review: 1,740; roughly right).

8. **Where the sentence was** (section 7): in every ROOT/BOB/watcher prompt and the review brief all week, which the review's "Why" section omits; absent from `CLAUDE.md`, the coordinator's prompt and all 26 coordinator handoffs, which supports the review's conclusion more strongly than the review's own wording does.

9. **Same-day reversals inside the record that the review does not list**: PR 106 (4 Nov 12:15Z) removed the `--cost-usd` requirement PR 105 had added 45 minutes earlier; PR 118 reverted PR 112 after 2 h 9 min (the review has this one); on 9 Nov 13:58:32Z, 24 seconds after the coordinator's note "Bob's audit ask; safeguard freeze" (13:58:08Z), PR 293 gained a commit "Revert the cold review's added safeguards (coordinator: none beyond the three rules)", i.e. a builder had already written review-driven safeguards into a PR whose purpose was to lighten triage.

10. **The record after the last merge.** `origin/tranche` stops at 9 Nov 18:13Z. The coordinator branch carries hourly notes to 23:52Z and ends 10 Nov 00:51Z with "hourly paused while waiting on Bob". `origin/process-state` (process3's own state branch) is 157 commits, 156 of them "github: N minute(s) of use" rows from 8 Nov 18:32Z to 9 Nov 15:48Z, an hour after the ledger was deleted from the tool. `origin/main` has not moved since 2 Nov 18:08Z (confirmed, as the review says).

## Claims I could not check from this repository

Product landings per day (135 -> 3), the 98 version moves (the coordinator log's highest pin label is pin-91, which is consistent), the 25 coordinator sessions (26 handoff notes exist on the coordinator branch, which is consistent), everything from session transcripts, all timing of the owner's words, the catch counts in "What the checks caught", and the per-PR trigger tags (failure / owner's words / plan row).
