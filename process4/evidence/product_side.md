# Process3 post-mortem: what the product repository shows

Source: `neobobkrause/civicsmith-copy` (blobless clone; all blobs for 30 Oct – 9 Nov fetched, so every figure below is measured, not sampled), cross-checked against `neobobkrause/process3` (`origin/tranche`). Times are UTC. "Day" is the committer date in UTC.

Scripts and intermediate data are in `/tmp/claude-0/-home-user/5fb00928-6c32-53d3-a000-4e1f643cb17f/scratchpad/`:
`parse.py` (all 18,389 commits with first-parent numstat), `daily.py` (commit buckets), `landings.py` (landing classes), `queue.py` (waits), `survive.py` (line survival), `marks.py` (requirement marks), `size.py` (code size at a commit), `cat.awk` (path categories).

## Summary

1. **The review's landing counts are right.** 135 landings on 4 Nov, 92 on 5 Nov, 7 on 9 Nov (3 by 14:20Z). The git record gives 65 / 128 / 74 for 6 / 7 / 8 Nov. But 105 of the 508 landings changed nothing except process records, and those are concentrated on 6–8 Nov (22, 44, 34).
2. **The product was materially advanced, and what landed stayed landed.** 218 of the 220 planned jobs are marked COMPLETE; all 11 planned layers closed by 8 Nov 06:15Z; hand-written source grew by a net 23,090 lines and tests by 43,882; 98.8% of landed source lines and 98.4% of landed test lines are still present at the last layer tip. The week's waste was in waiting, re-syncing and re-testing, not in product code being rewritten.
3. **It never passed its own walk.** All 12 development deployments recorded 4–8 Nov ended `ok: false`. No deployment was made for 80 hours (4 Nov 23:14Z → 8 Nov 07:20Z) while 308 landings went in. The first walk after that found 1,691 failures; the last one (8 Nov 23:50Z) still failed 147 of 157 live steps.
4. **Commits are 89% bookkeeping.** Of 18,295 commits on 3–9 Nov, 70% are on the process state branch and a further 19% are records, pins and sync merges on code branches. 767 commits (4.2%) are non-merge commits that touch product source or tests.
5. **The stop left the work one merge short.** Layer 14 had every one of its items landed by 16:35Z on 9 Nov and was never merged into the tranche. The last recorded activity in the product repository is a process pin move at 18:15–19:05Z.

## 1. Orientation

| Ref | What it is | Size |
|---|---|---|
| `origin/main` | Product mainline before Process3. Last commit 1 Nov 22:24Z ("Add standing approvals from Bob to CLAUDE.md"). Not touched during the week. | 68,685 commits from 24 Jul |
| `origin/tranche` | Process3's integration branch for tranche T53. Base for this analysis is `4250e8860a` (30 Oct, "plan: PAUSED by Bob while the process's health is assessed"); Process3 was set up on it by `8a80914dae` at 1 Nov 23:14Z. Tip `e7ec72e093`, 9 Nov 18:59Z. | 837 first-parent commits since 30 Oct |
| `origin/layer/7` … `layer/14` | Per-layer integration branches, used from 6 Nov. Layers 1–6 landed straight on the tranche (4–5 Nov via the merge train). Layers 12–14 are "completion rounds" after the 11 planned layers. `layer/14` is 48 commits ahead of the tranche and unmerged. | 8 branches |
| `origin/process-state` | Orphan state branch: messages, heartbeats, layer flow rows, notices, usage ledger, deploy and walk reports. First commit 3 Nov 02:07Z, last 9 Nov 19:05:44Z. | 12,881 commits |
| `origin/job/*` | One branch per job attempt. 330 refs; 27 with November tips are not merged into `layer/14`. | |
| `origin/bob/*` | The product coordinator's (BOB's) own pull requests: ledger entries, requirement splits, pins before 3 Nov, rulings. | 248 refs |
| `origin/p3/pin-*` | One branch per process pin move from 3 Nov. | ~110 refs |
| `origin/layer-sync/*`, `layer-pin/*`, `train/head/*` | Tranche-into-layer syncs (48), in-place layer pin applies (3, 9 Nov only), merge-train heads (29, 5 Nov). | |
| `origin/found/*`, `lane/*` | Found-mark pull requests (43) and design lanes (33). | |

The process pin is the `.process` git submodule (gitlink in the tree, `.gitmodules` → `https://github.com/neobobkrause/process3`). All 116 pinned commits are on process3's `origin/tranche`. Product-side process configuration lives in `process/config.json`, job records in `process/ledger/*.json` (220 entries) and `process/metrics/*.jsonl`.

One correction to the review's framing: this was not a new or toy product. `main` carries 68,685 commits; at the base the product had about 457,000 lines of source and 684,000 lines of tests across 4,847 files, and 191 requirement files holding 8,838 requirement ids. The first job landings are on 2 Nov (job PRs 3 and 9, 02:39Z and 03:19Z), not 3 Nov 22:18Z.

## 2. Landings per day

A landing is a merge titled `Merge job PR N` (into the tranche, to 5 Nov) or `Merge layer PR N` (into a layer branch, from 6 Nov). 508 in total. Each is classed by what its diff against the first parent touched.

| Day | Landings | Source changed | Tests only | Requirements or docs only | Records only | Distinct jobs | First-time jobs | Marks struck (net) |
|---|---|---|---|---|---|---|---|---|
| 2 Nov | 2 | 1 | 1 | 0 | 0 | 1 | 1 | 1 |
| 3 Nov | 5 | 3 | 1 | 1 | 0 | 5 | 5 | 8 |
| 4 Nov | 135 | 83 | 48 | 1 | 3 | 84 | 83 | 221 |
| 5 Nov | 92 | 48 | 37 | 6 | 1 | 74 | 32 | 253 |
| 6 Nov | 65 | 26 | 15 | 2 | 22 | 48 | 14 | 101 |
| 7 Nov | 128 | 45 | 24 | 15 | 44 | 69 | 34 | 164 |
| 8 Nov | 74 | 23 | 14 | 3 | 34 | 34 | 0 | 11 |
| 9 Nov | 7 | 6 | 0 | 0 | 1 | 6 | 1 | 7 |
| Total | 508 | 235 | 140 | 28 | 105 | 170 | | 766 |

- Review's figures: 135, 92, 126, 75, "about 6" for 4, 5, 7, 8, 9 Nov. Confirmed to within two.
- "Records only" means the merge changed only `process/ledger` and `process/metrics` (typically +3 −1 lines). These are the re-test landings the review mentions. They are 34% of landings on 6–8 Nov and essentially absent on 4–5 Nov.
- Counting only landings that changed source or tests: 131, 85, 41, 69, 37, 6. The fall from 4 Nov to 8 Nov is 72%, not the 45% the raw counts show.
- 170 distinct jobs landed; 57 landed once, 113 more than once. `op-declarations`, `affordances` and `store-assembly` landed 14 times each. Of 338 repeat landings, 92 were records-only and 96 tests-only.
- Lines landed (first-parent diffs of landings): source +29,320 −7,202; tests +60,950 −8,913; requirements +1,906 −2,944.
- In the window the review took from the BOB transcript (8 Nov 11:51Z → 9 Nov 16:48Z) git shows 50 landings: 27 that changed source or tests and 23 records-only. The review has 20 and 27. Same total within three; the split depends on whether a tests-only landing counts as product work.

## 3. Commit composition per day

All commits reachable from any ref, deduplicated, by committer day.

| Day | All commits | State branch | of which usage ledger | Records, pins, sync merges on code branches | Landing merges | Other (requirements, docs, config, other PR merges) | Product-code commits | of which touch source |
|---|---|---|---|---|---|---|---|---|
| 3 Nov | 171 | 90 | 0 | 52 | 5 | 14 | 10 | 6 |
| 4 Nov | 2,890 | 1,314 | 0 | 1,023 | 135 | 162 | 256 | 129 |
| 5 Nov | 4,012 | 2,620 | 0 | 887 | 92 | 162 | 251 | 100 |
| 6 Nov | 2,021 | 1,522 | 61 | 275 | 65 | 120 | 39 | 21 |
| 7 Nov | 4,941 | 3,731 | 1,625 | 762 | 128 | 181 | 139 | 66 |
| 8 Nov | 3,265 | 2,717 | 1,094 | 351 | 74 | 64 | 59 | 38 |
| 9 Nov | 995 | 887 | 370 | 68 | 7 | 20 | 13 | 7 |
| 3–9 Nov | 18,295 | 12,881 (70%) | 3,150 | 3,418 (19%) | 506 | 723 | 767 (4.2%) | 367 (2.0%) |

Share of the day's commits that are product-code commits: 5.8%, 8.9%, 6.3%, 1.9%, 2.8%, 1.8%, 1.3%. State branch share: 53%, 45%, 65%, 75%, 76%, 83%, 89%.

"Product-code commits" are non-merge commits touching product source, scripts or tests. Of the 767, 386 are tests-only. By subject, 69 are notice confirmations with no code change, 20 are re-tests, 42 are reverts or restores, and 169 answer a found mark or completion-round item.

**Usage ledger.** `github: N minute(s) of use` commits: 3,150, from 6 Nov 22:46Z to 9 Nov 15:54Z. Over that life they are 42.5% of state-branch commits (3,150 of 7,416). They pass half in one six-hour window only (7 Nov 00–06Z, 52%). The review's "over half" overstates it; "about two fifths, for 65 hours" is what the record shows. Of the 2,713 pushes the ledger itself counted, 1,936 (71%) were pushes to the state branch, 706 to product branches and 71 to process3. It was mostly measuring the process's own record-keeping.

Other state-branch traffic: 3,293 message commits, 1,738 heartbeat, idle-check and session-list commits, and 4,700 others (layer flow rows, merge-train rows, starts-owed rows, notices).

## 4. Pin moves

Changes to `.process` on the tranche's first-parent line: **116** from 1 to 9 Nov, all distinct, all forward along process3's tranche.

| Day | Pin moves | Median gap between moves | Process commits adopted | Median lag, process merge → product pin |
|---|---|---|---|---|
| 1–2 Nov | 6 | 167 min | 22 | 4–8 min |
| 3 Nov | 8 | 25 min | 24 | 3 min |
| 4 Nov | 45 | 21 min | 80 | 6 min |
| 5 Nov | 18 | 66 min | 45 | 8 min |
| 6 Nov | 7 | 119 min | 27 | 6 min |
| 7 Nov | 10 | 54 min | 38 | 8 min |
| 8 Nov | 12 | 73 min | 28 | 15 min |
| 9 Nov | 10 | 137 min | 27 | 21 min |

4–9 Nov is 102 moves; the review's 98 matches the count of `process: pin <sha>` commits exactly (earlier moves used other titles). The lag column is the sharper fact: a change merged in the process repository was running on the product a median 3 to 21 minutes later, every day. There was no soak.

What each move dragged along:

- **Sync merges.** 1,339 sync merges in the week (1,130 `Bring job/X up to …`, 94 layer-sync commits, the rest train and pin branches) against 508 landings. 592 of them (44%) carried a pin change. 80 carried nothing but the pin, or the pin plus records and config.
- **Layer syncs.** 48 tranche-into-layer syncs from 6 Nov. 47 of 48 brought no product code at all; 27 brought a pin; the other 21 brought a ledger entry, a decision record, a design-lane file or a requirement wording. On 7 Nov there were 22 layer syncs between 17:02Z and 22:33Z, none with product code. Each one obliges every open job in the layer to sync again.
- **Gate runs.** The state branch has gate rows for the layer era only (6–9 Nov): 789 gate runs for 238 layer landings, 3.6 per landing (maximum 16). By trigger: 290 code, 294 record, 205 draft. So 63% of gate runs were not started by a code change.
- **In-place pin applies** (`layer-pin/14-*`, 9 Nov 15:50Z onward) replaced the full sync for a pin-only change. Three were used before the stop.

Could not establish from git: the wall-clock cost of each re-gate before 6 Nov, and the 55-minute full-gate runs the review cites. GitHub Actions run data is not in the repository.

## 5. What product work got done

**Jobs and layers.** `process/ledger` holds 220 jobs across 11 planned layers. At both the tranche tip and the `layer/14` tip: 218 COMPLETE, 2 OPEN (`runtime-limits`, waiting on an unrecorded measure; `ai-accounts-lists`). Layer close times from the state branch:

| Layer | Closed | Deferred modules |
|---|---|---|
| 1, 3, 2 | 4 Nov 01:02Z, 02:13Z, 05:31Z | 2, 0, 1 |
| 4, 5 | 5 Nov 00:08Z, 00:44Z | 1, 3 |
| 6 | 6 Nov 05:53Z | 8 |
| 7, 8 | 6 Nov 14:01Z, 18:41Z | 0, 2 |
| 9, 10 | 7 Nov 03:39Z, 16:10Z | 0, 1 |
| 11 | 8 Nov 06:15Z | 28 |
| 12 (completion round 1) | 8 Nov 22:41Z | 9 |
| 13 | 9 Nov 08:44Z | 1 |
| 14 (completion round 2 of 2) | never | |

Layer 6 took 29 hours (the merge-train day). Layer 11 closed with 28 modules carrying deferred marks.

**Requirement marks.** `*(not yet met: T53…)*` marks in `build/requirements`: 899 at the base, 357 at the end. 542 struck, 60% of the tranche's marks. By layer tip: 525 (layer 7), 515, 502, 490, 359 (layer 11), then 357, 357, 357. Almost nothing was struck after layer 11 closed; layers 12–14 worked on found marks instead. 183 `F` (found) marks were added during the week and 132 of them were met.

**Code.** Base → `layer/14` tip, hand-written code files only:

| | Files changed | Added | Deleted | Net |
|---|---|---|---|---|
| Product source | 378 | 30,074 | 6,984 | +23,090 |
| Product tests | 1,041 | 51,981 | 8,099 | +43,882 |

Raw totals are misleading in both directions: 86,347 lines of generated data left the tree (`rows.mjs`, `words-unreviewed.json`, bundles, untracked on 4–5 Nov) and one 8,543-line data file was added. Test files went from 3,766 to 4,248.

**Rework.** For every landing, each non-trivial added line was checked for presence in the same file at the `layer/14` tip. Source: 24,608 of 24,897 survive (98.8%). Tests: 44,843 of 45,552 (98.4%). No day is below 97%. Only 4 commits in the week are titled `Revert …`, all in design-lane docs or records. On the 27 unmerged November job branches there are about 830 non-trivial lines that are not at the tip (largest: `case-checker-3` 239, `plane-2` 144, `op-declarations` 121, `store-assembly` 100); the other 3,800 lines on those branches reached the tip by a later attempt.

So landed product code was not being torn up and rewritten. What was redone was the landing itself: 3.1 job starts and 3.0 landings per job, 2.2 sync merges per landing.

**Was it meaningfully advanced?** By the module-level record, yes: about 5% more source and 6% more tests on a large product, 60% of the tranche's marks met in six working days, nearly all of it on 4–7 Nov. By the end-to-end record, not yet: see section 9, point 2.

## 6. The check-adding tendency inside the product repository

It is here too, in four forms.

**a. Process surfaces in the product tree grew.**

| Item | At setup (1 Nov) | End | Note |
|---|---|---|---|
| `.github/workflows/process-gate.yml` | 77 lines | 273 | every change arrived through a pin PR |
| All workflow files | 446 lines, 6 files | 1,021 lines, 8 files | |
| `process/config.json` | 24 lines | 421 | 79 → 372 on 4 Nov alone |
| `.claude/settings.json` | 35 lines | 75 | see below |
| `CLAUDE.md` | 641 bytes | 8,664 bytes | 16 owner patches |
| `DECISIONS.md` | absent | 174 lines | BD-1 to BD-18, from 6 Nov |
| Requirement files | 191 | 221 | bytes unchanged (8.04 MB) |
| `docs/requirements-notes/` | absent | 58 files | text moved out of requirement files |

`CLAUDE.md` is the exception to the pattern: it is the owner's standing-approvals text, and every one of the 16 patches widens or clarifies a permission. Its growth records sessions meeting a permission wall and the owner removing it, not sessions adding checks.

`settings.json` gained, on 7 Nov 04:39Z (owner patch 13, during the GitHub suspension response): a deny on every `git push` and every `gh` command, an allow for `p3 github push` only, and a `PreToolUse` hook that runs a process script before **every Bash call** in every product session (300-second timeout). The push ceiling this served was retired hours later; the hook and denies were still in the tree at the end, and `process/config.json` ends with `"pushes_per_hour": 1000000`. The limit was neutralised by raising it, not removed.

**b. A requirements size cap turned into product work.** The process refused `job complete` when a requirement file exceeded 70,000 bytes. Product side: 30 new requirement files whose names show the split (`jurisdictions-b`, `jurisdictions-c`, `op-grades-folds`, `interface-shell-t53`, `control-plane-door-pages`, …), 58 notes files, 46 of the 220 ledger jobs mentioning a split or the cap, 64 commits citing it (40 on 4 Nov), and at least one source module physically split to follow its requirements (`reading-pipeline/index.mjs` −2,142, `reader-contract/index.mjs` +2,164). Total requirement bytes did not change. The review lists this check as overridden 32 times of 32 with no catch; the product record shows what it cost before it was overridden.

**c. Tests written for the process, not the product.** Two families now live permanently in the product's suite:

- 187 new `notice-*.test.mjs` / `notices.test.mjs` files, 9,321 lines. Each pins a "provider notice confirmed, no code change" answer.
- 24 `requirements-ids.test.mjs` files, 2,089 lines. Each tests a requirements Markdown file (ids, order, marks, a SHA-256 of kept lines) against a start commit.

Together 11,410 lines, 26% of the week's net test growth.

The gate's revert check (a new test must fail with the change reverted) also shaped tests. 27 tests-only commits cite it in their titles ("fail on assertions, not at load, with the change reverted"). On 9 Nov it cut the other way: `bundler: drop the repairs of four stale tests (BOB bob-337): they pass with the change reverted`. Real test repairs were removed from a pull request because the check could not accept them.

**d. Notices, triage and blocks.** When a landing changed a module's interface, every dependant got a notice. 178 notices fanned out to 2,707 module-notifications (1,341 on 4 Nov). Of 2,342 triage verdicts, 2,101 (90%) were "not affected". 441 were answered by a job landing. Jobs wrote 165 `block` commits, median 1,389 characters each, to hand a stuck job to BOB; 72 on 4 Nov and 50 on 5 Nov. In 72 of them the job states the work is done and pushed and `job complete` refuses. Counting by keyword in the block text (a block often names several): the suite already red on the tranche before the job started (48), the size cap (47), a record, ledger or paths check (69), the revert check (61), a cost figure the session could not obtain (9).

**CI time.** Not in git as such. What the state branch has: per-module suites are fast (median 1.9–2.5 minutes, 403 runs, 21% failing on 7–8 Nov). Gate runs 6–9 Nov: 789, median 1.1 minutes, 2,665 gate-minutes in total, longest 81 minutes. The two late deploy-and-walk runs took 60 and 64 minutes.

## 7. Queueing: job completion to merge

For each landing, the wait is the merge time minus the last `job complete <job>` commit in the merged range. A second column uses the first `job complete` in the range, which includes time lost to re-completion.

| Day | Landings | Last complete → merge: median / p75 / p90 (min) | First complete → merge: median / p90 | Job start → merge: median |
|---|---|---|---|---|
| 3 Nov | 5 | 18 / 18 / 20 | 18 / 20 | 26 |
| 4 Nov | 135 | 13 / 21 / 52 | 17 / 99 | 36 |
| 5 Nov | 92 | 348 / 623 / 670 | 385 / 841 | 459 |
| 6 Nov | 65 | 12 / 249 / 469 | 34 / 855 | 109 |
| 7 Nov | 128 | 6 / 9 / 12 | 8 / 24 | 26 |
| 8 Nov | 74 | 10 / 15 / 29 | 12 / 100 | 39 |
| 9 Nov | 7 | 37 / 111 / 112 | 73 / 112 | 133 |

- Review: 8 minutes on 4 Nov, 289 on 5 Nov. Git gives 13 and 348. Same shape, somewhat worse.
- By half-day the train's effect is sharper: 5 Nov before 12:00Z median 61 minutes, after 12:00Z 623 minutes; 6 Nov before 12:00Z 231 minutes, after 12:00Z (layer branches) 5 minutes.
- The layer design fixed the queue. On 7 and 8 Nov a finished job merged in 6 to 10 minutes. The loss on those days was elsewhere: nothing to land (9.3 hours with no commit of any kind from 7 Nov 05:51Z; gaps between code-carrying landings of 11.4, 8.7, 7.6 and 6.3 hours), and landings that carried no code.
- 9 Nov has seven landings, so its medians are weak. Two of them (`ai-accounts`, `credentials`) took 351 minutes from start to merge for 63 and 28 lines of source, across a deadlock on a companion-order rule (`block op-declarations: PD-19 order deadlock`, 13:47Z).
- Limit: this measures only jobs that eventually merged, and uses commit times on the job branch. It cannot see a job that was finished in a session but not yet committed.

## 8. The final stop

Sequence on 9 Nov from the product record:

| Time (UTC) | Event |
|---|---|
| 15:28–15:29 | `ai-accounts` (PR 1098) and `credentials` (PR 1099) land on layer 14 |
| 15:53 | `op-declarations` (PR 1104) lands, their companion |
| 15:50, 16:13 | Two more pin moves (PRs 1108, 1110), each applied to layer 14 in place |
| 16:20–16:35 | `credentials` restarted (attempt 4), passes, lands again as PR 1113, records only. **Last product landing: 16:35:22Z** |
| 16:38, 16:45:44 | Owner's patch 16 to `CLAUDE.md` ("reviewed revert exemptions") committed and merged to the tranche as PR 1115 |
| 16:47:52 | Last message commit on the state branch, BOB to ROOT |
| 18:15–18:59 | Pin move to process `38b0f3f07f` (process PR 302, a layer-pin fix), merged to the tranche as PR 1116 |
| 19:00–19:05:44 | The same pin applied to layer 14 (PR 1117); `layer 14: pin apply` is the last commit anywhere |

State left behind:

- **Layer 14 is complete but unmerged.** Its four items (ai-catalogue F4 and F5, ai-accounts F6, credentials F1) all landed. `layer/14` is 48 commits and 623 source and test lines ahead of the tranche. The step that was next, by the completion-round plan, was layer merge, then deploy, walk and development release. None happened.
- **No job was mid-flight in git.** The only job branch with a 9 Nov tip that is unmerged is `job/file-scanner`, holding a `block` (the item is another module's).
- **Completion round 2:** 28 of 33 items ticked, 5 deferred to a next round.
- **Ledger:** 218 COMPLETE, 2 OPEN. **Marks:** 357 T53 marks and 51 found marks still unmet.
- The patch merged at 16:45Z changed `CLAUDE.md` on the tranche only. It is not on `layer/14`. Git cannot show why that edit stopped the sessions; that rests on the transcripts.
- The review says nothing moved after 16:45Z. Nothing carrying product work did. But a session was still able to move the process pin on the product twice over the next 2 h 20 min. The last thing done to the product was a process change.

## 9. What contradicts, complicates or sharpens the review

**1. Sharpens: the product record supports the central claim more strongly than the review's own numbers.** Product-code commits are 4.2% of commits; 89% are state or bookkeeping. 47 of 48 layer syncs carried no product code. 63% of gate runs were started by something other than code. 21% of all landings and a third of 6–8 Nov landings changed only process records. Process changes reached the live product a median 3–21 minutes after merging.

**2. Complicates: module-level gating did not produce a working product, and the one check that tests the product was barely run.** The state branch records 12 development deployments. All 12 are `ok: false`; 10 stopped at the walk. Ten are on 4 Nov; then none for 80 hours, during which 308 landings went in (204 with source or test changes). The layer-11 live walk (8 Nov 07:20Z): 175 steps, 1,691 failures. After completion round 1 (8 Nov 23:50Z): 157 steps, 178 failures, and 147 of the 157 steps still failing; the internal walk went from 63 failures in 238 steps to 96 in 357 as it was given more to check. So the failure count fell 89% in one round, which shows the walk's findings were real and fixable, while 218 "COMPLETE" jobs and green module suites coexisted with a product that failed nearly every live screen. The review credits the walks as the largest defect finder. The product record adds that the process spent the week multiplying cheap checks on records while running its one decisive check twice in the last five days.

**3. Complicates: the checks did catch real things, and red gates were rarely about tests.** In the layer era 70 of 789 gate runs were red. Only 5 had a failing suite and 2 were base-red; 43 were red with the suite passing, and 20 were red drafts. That is consistent with the review's finding that red gates seldom reflected a product defect. On the other side: 183 found marks were raised during the week, each naming a specific cross-module defect or gap, and 132 are no longer marked unmet; completion round 2 lists 33 concrete items, several straight from the live walk (an undefined CSS class, a missing door on Home for administrators, a catalogue address that would 404); 241 notice triage verdicts were "affected", and some led to real dependant fixes (for example `capture-requests` reading a field `ai-runs` had renamed). The useful catches came from one module's job reading another's interface, and from the walk. The record-keeping checks produced the blocks in section 6d.

**4. Complicates: the worst day for queueing was the best day for requirements.** 5 Nov has the 348-minute median wait and also the most marks struck (253, against 221 on 4 Nov). Work was being finished at full rate and then waiting. Throughput by marks collapsed only after layer 11: 11 marks on 8 Nov, 7 on 9 Nov.

**5. Corrects details.**
- The usage ledger was about 42% of state commits over its life, not over half.
- 116 pin moves in nine days, 102 in the six days from 4 Nov (review: 98).
- 9 Nov had 7 landings (review: about 6); 3 by 14:20Z is exact.
- The product was not new; the tranche worked a 220-job plan on a 1.1-million-line codebase, and job landings began on 2 Nov.
- The review says the account switch was "attempted and abandoned". Every landing through 6 Nov was merged by the identity `Civicsmith <csgithub@civicsmith.dev>`; every landing from 7 Nov by `believeinoakland <biogithub@neologic.com>`. Some switch of the merging identity did hold. The 9.3-hour silence from 7 Nov 05:51Z matches the review's 9.5 hours.
- Process activity on the product continued for 2 h 20 min after the 16:45Z stop.

## What could not be established

- GitHub Actions run durations and outcomes outside the state branch's gate rows (none before 6 Nov; the merge-train day is visible only as queue rows).
- Pull-request state at the stop (open, draft, closed). Only branches are visible.
- Why the 16:45Z `CLAUDE.md` merge stopped the sessions.
- Why a gate was red when its suite passed: the gate rows carry no reason field.
- Whether the 830 stranded lines on unmerged job branches were superseded deliberately or lost.
- Token or dollar cost. `process/metrics` has rows but sessions frequently could not obtain a cost figure, and I did not analyse them.
