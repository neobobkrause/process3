# Process3 defect sweep, tranche d45822c (4 Nov 2026)

Read-only. Checked out `origin/tranche` (d45822c, PR 85) detached in /home/user/process3. Nothing edited, committed or pushed. Experiments ran in scratchpad/sweep/ only: a GraphQL probe (read-only), a `gh run download` trace, git repros of the submodule and shallow-merge cases, and a read-only depth-1 clone of civicsmith-copy's tranche and job branches.

Live state used for ranking (copy, read just now): the tranche pin is d45822c. There are 37 job branches with ledger entries:
- 8 BLOCKED, with pins from 8bee1db to d45822c. Most are blocked on suites that other modules broke on the tranche, so unblocking them means merging the tranche.
- 6 COMPLETE on their branch and awaiting merge: site, signatures, ai-use, ai-runs, instance-setup, wizard-scripts.
- 1 WORKING: registers, at 35e41b2.

Ranked by how soon a live job hits each finding.

---

## 1. job complete's new attempt calls GraphQL to make the PR a draft again (403, permanent)
- **Where:** github.mjs:50-55 (`toDraft`: `gh api graphql … convertPullRequestToDraft`), called from job.mjs:735 (`finish`, `again && !pr.draft`) and job.mjs:445 (`--take-in` of a ready PR).
- **Class:** 1, a call sessions cannot make. **Severity:** blocks jobs.
- **Scenario:** A COMPLETE job's gate goes red (the PR 79 path). The job pushes a fix and reruns `job complete`. That commits the new COMPLETE locally, then `toDraft` gets HTTP 403 ("GitHub GraphQL is not available from Claude Code sessions"; verified just now) before the push. Every rerun takes the resume path (job.mjs:634-636, `again: !!row.receipt.after`) and hits the same 403. The job can never push or post its receipt. Any of the 6 COMPLETE-awaiting-merge jobs with a red gate hits this on its next fix.
- **REST route:** `POST repos/{owner}/{repo}/pulls/{n}/ccr/convert_to_draft`. The 403 message itself names it, next to `ccr/ready_for_review`.
- **Smallest fix:** make `toDraft` mirror `markReady` (github.mjs:128-140). Try `['api','-X','POST',`repos/${slug}/pulls/${n}/ccr/convert_to_draft`]` first, then the GraphQL mutation, then re-read with `getPR` and require `draft`.
- No other GraphQL calls exist in tool/lib. `markReady` already uses the CCR route. `gh run download` (github.mjs:105) is REST: traced with GH_DEBUG, it makes only `GET …/actions/runs/{id}/artifacts`. Every other call is `gh api repos/...`. Ruleset reads (github.mjs:150), compare, check-runs, comments and PR edits are all REST.

## 2. After merging a tranche that moved the pin, `.process` stays at the old pin: job complete and send refuse, and the obvious fix downgrades the pin
- **Where:** job.mjs:617 (the clean check ignores submodules only when the entry is already COMPLETE), state.mjs:138 (`unpushed` in `send`), job.mjs:20-21 (the tool runs from the `.process` checkout), job.mjs:101 (the START never says to update the submodule after a merge).
- **Class:** 4, stale pins. **Severity:** blocks jobs.
- **Scenario (reproduced in exp1):** the job was started at P1. It runs `git merge origin/tranche`, and the tranche's `.process` is P2. Git moves the gitlink but not the submodule checkout, so `git status --porcelain --untracked-files=no` prints ` M .process`. Then:
  - `job complete` fails with "commit your work first: tracked files have changes".
  - `send` fails with "this checkout has uncommitted changes". So after `block` (which commits only the entry) the job cannot even wake BOB.
  - If the job does `git commit -am`, the gitlink goes back to P1 (reproduced). The gate then reports an ownership finding for `.process` (gate.mjs:75).
  - Even with a clean tree, every command still runs P1's tool.
- **Smallest fix:**
  - Add `--ignore-submodules=all` to the clean checks at job.mjs:617 and state.mjs:138. The gate already catches a committed pin change.
  - In jobComplete and jobTest, compare `git ls-tree HEAD .process` with `toolPin()`. If they differ, stop with "run `git submodule update .process`, then run job complete again".
  - Add that line to the START's commands, for after any merge of the tranche.

## 3. A shallow job clone cannot merge the tranche at all
- **Where:** merge.mjs:130 ("the job must bring itself up to date", with no steps), job.mjs:100 (restart fetches `--depth 1`), util.mjs:47 (`fetchBranch` fetches the tranche `--depth 1`). The START (job.mjs:97-106) gives no sync step.
- **Class:** 3, shallow clones. **Severity:** blocks jobs.
- **Scenario (reproduced in exp2):** the job clone is depth 1, and so is origin/tranche, fetched by job complete or by hand. `git merge origin/tranche` fails with "refusing to merge unrelated histories", and `git merge-base` exits 1. Two cases need the merge:
  - BOB's merge refused at merge.mjs:130 because of a conflict.
  - A BLOCKED job whose fix is on the tranche, which is most of today's 8.

  The job must improvise a deepen. `--allow-unrelated-histories` would make a bogus root merge, with add/add conflicts everywhere.
- **Smallest fix:** a `p3 job sync <id>` command, or a START line, that does four things:
  1. Reads GitHub compare, like `shallowBase` at job.mjs:579.
  2. Fetches the branch at `--depth=ahead_by+1` and the tranche at `--depth=behind_by+1`, as take-in already does at job.mjs:369-373.
  3. Runs `git merge --no-edit origin/<tranche>`.
  4. Runs `git submodule update .process`.

  That one command also closes #2 and #4.

## 4. Job branches run their start-time tool, which lacks today's fixes
- **Where:** job.mjs:101 and :100-101 (start and restart fill the branch's own pin), job.mjs:655 (`recordCheck` runs from the job's pin), job.mjs:664 (the generated build exists only in pins from 35e41b2 on).
- **Class:** 4. **Severity:** blocks jobs (false refusals). The gate passes, because it uses the tranche's pin.
- **Scenarios, with today's pins:**
  - agent-worker and store-assembly (d022320), ai-catalogue (ee3b2cb), question-explorer (e44b5a0) and runtime-limits (8bee1db) all predate PR 80. Their `job complete` and `p3 test` do not build the untracked rows.mjs or bundles, so the suite fails where those are imported (41 of 113 tests on the copy). The gate on the same commit builds them and passes.
  - Every pin before 038f91b (PR 83) misjudges a range that merged the tranche in a shallow clone. That is all of the above plus registers (35e41b2). It produces false record findings against the base or root commits.
  - `job start --restart` keeps the branch's pin, so a replacement session repeats the failures.
- **Smallest fix:** at the top of jobComplete and jobTest, read `git ls-tree origin/<tranche> .process`. If it differs from `toolPin()` and is not an ancestor of it, fail before any work: "the tranche runs process <x>, this branch <y>: run `p3 job sync <id>` (#3), then run again". The restart START should run the sync before step 3.

## 5. BOB's merge pushes to job/<id>, and the job's next push is rejected forever
- **Where:** merge.mjs:124-141 (BOB's worktree merges the tranche and appends a merge row on job/<id>, then pushes), job.mjs:734-737 (the job's push, with no fetch or merge of origin/job/<id>), job.mjs:632 (the COMPLETE commit is taken as `git log -1 -- metricsFile`).
- **Class:** 6, two writers. **Severity:** blocks jobs and gives wrong receipts.
- **Scenario:** BOB's merge pushes the merged-in tranche and the merge row. The gate on the merged result goes red, which is common because other modules break suites. BOB sends the job back.
  - The job's local branch lacks BOB's two commits, so `git push` is rejected non-fast-forward and `job complete` says "run job complete again" forever.
  - If the job pulls, job.mjs:632 now takes BOB's merge-row commit as the COMPLETE commit. With no new commit, `at === HEAD` re-posts the old receipt for a commit it never checked. With new commits, `again.after` names BOB's commit. Either way it then reaches #1.
- **Smallest fix:**
  - In `finish`, fetch origin/job/<id>. If it has commits HEAD lacks, `git merge --no-edit` them before pushing (a merge, never a rebase), or fail and name that step.
  - Find the COMPLETE commit by its message, using `git log -1 --format=%H --grep='^job complete <id> ' -- <metrics>`, not by the last touch of the metrics file.

## 6. `merge` waits 30 minutes on a gate run that can never come
- **Where:** merge.mjs:24-33 (`waitForGate` waits past `cancelled` and never re-reads the PR head), merge.mjs:143, p3.mjs:242 (30 min by default). The gate job's own cap is 45 min (process-gate.yml:25), and its concurrency group cancels in progress.
- **Class:** 5, waits that never end. **Severity:** blocks merges, wastes BOB's time and can livelock.
- **Scenarios:**
  - (a) BOB pushes the merge-row tip T. The job (or a retry) pushes T2. The concurrency group cancels the run on T, so T's newest run stays `cancelled` and BOB waits the full 30 min for nothing.
  - (b) A large module's gate takes longer than 30 min (install of 10 lock files, the generated build, suite, revert run and regenerate). `merge` fails while the run is still in progress. A rerun merges the moved tranche again, pushes another merge row and waits again. If the tranche moves faster than the gate runs, the merge never lands.
- **Smallest fix:**
  - In `waitForGate`, read `getPR` each round and fail at once if `head.sha !== tip` ("job/<id> moved; run merge again").
  - Raise the default to at least the gate's `timeout-minutes` plus the queue (60 min). Keep waiting while the run is `in_progress`.

## 7. `p3 test` and `job complete` rebuild committed bundles, which dirties the tree and then blocks complete and send
- **Where:** job.mjs:789-796 → checks.mjs:123-139. `buildGenerated` runs a row's `regenerate` whenever any of its paths is untracked. The copy's bundle row always has untracked paths, and its `bundles.mjs` rebuilds every stale bundle, including the committed ocr-worker, agent-runner, sheet-worker, file-scanner and reader-container `.bundled.mjs`. That collides with job.mjs:617 and state.mjs:138.
- **Class:** 2, generated files. **Severity:** blocks jobs (conditional).
- **Scenario:** a job changes a shared source that a committed bundle reads (for example bio-plane/src/pdfstructure.mjs, which feeds pdf-worker and ocr-worker). `p3 test` rewrites ocr-worker/dist/ocr-worker.bundled.mjs, a tracked file.
  - The next `job complete` fails with "commit your work first", and the wake's `send` fails with "uncommitted changes".
  - Committing the file is a gate finding: "a job does not commit it" (checks.mjs:74).
- **Smallest fix:** after the suite in jobTest and jobComplete, restore the rows' committed paths with `git checkout HEAD -- <committedPaths>`. Or exclude `generated` paths from both clean checks.

## 8. Notice triage, withdraw and the merge rerun take a merge base from a depth-50 fetch
- **Where:** triage.mjs:64-67 (`changes`), notice.mjs:180-184 (`withdrawNotice`), merge.mjs:193-196 (`noticesOnly`). Each is `fetch --depth=50 origin <m>` followed by `git merge-base m^1 m^2` with no `allowFail`.
- **Class:** 3. **Severity:** blocks triage, and with it every notice-only job; also blocks withdraw and notice recording on a merge rerun.
- **Scenario:** in a shallow BOB clone not yet deepened (a fresh BOB after a handover, whose first act is `notice triage`), the provider job's merge base lies more than 49 commits back on either side. The tranche moved 50 merges during a long job, or the job has more than 49 commits since its last tranche merge. `git merge-base` exits 1 and the command dies with "git merge-base … failed".
- **Smallest fix:** take the base from GitHub with `compare(slug, m+'^1', m+'^2').merge_base_commit.sha` (the PR's base and head SHAs also work), then `git fetch --depth=1 origin <mb>`. Only trees at mb and m^2 are read.

## 9. The review brief tells the reviewer to run the module's own suite, without the generated files
- **Where:** review.mjs:30 ("run the test suite … or the module's own suite", and "write only in a scratch directory outside the checkout").
- **Class:** 2. **Severity:** wrong findings, which spend review rounds against MAX_ROUNDS=2 (merge.mjs:56), so the merge then needs `--decision`.
- **Scenario:** the reviewer runs `node --test` on the module's tests in a product checkout. The untracked rows.mjs and bundles are missing (41 of 113 tests on the copy), and the reviewer reports a "fix" that the gate does not see.
- **Smallest fix:** for a job PR in a product, name `node .process/tool/p3.mjs test <id>` as the suite command (it installs and builds untracked generated paths only). List `generated` paths as "built, not committed".

## 10. deploy dev, job complete and job test build generated files without installing the lock files the build needs
- **Where:**
  - deploy.mjs:121-123: `buildGenerated` with no install. The gate (gate.mjs:106), release run (release.mjs:176) and layer close (layer.mjs:46) install every lock file first.
  - job.mjs:780-781 and suite.mjs:58-64: only the module's own lock files are installed before the build of every row.
- **Class:** 2. **Severity:** blocks deploys and completes (conditional).
- **Scenario:** `bundles.mjs` runs `npm run build` in each stale member, and members need their own deps (reader-container needs `@cloudflare/containers`). The copy's session hook installs 7 packages but skips reader-container, site and journey-check. A stale reader-container bundle stops deploy dev at `build` before the dry run, whose own `npm ci` comes too late. It also fails job complete for a bio-plane module while the gate passes.
- **Smallest fix:** run `install(root, cfg.lockfiles, { onlyStale: true })` before `buildGenerated` in deployDev, jobComplete and jobTest.

## 11. Prompt refresh can hand BOB's address back to the old BOB
- **Where:** roles.mjs:298-312 (`promptRefresh` decides the role from a read, then the `writeState` callback writes `me` into addresses/<role>.json without checking again). The same pattern is in `recordStart`, roles.mjs:207-219.
- **Class:** 6. **Severity:** wrong routing: job reports and wakes go to a BOB that is handing over.
- **Scenario:** the old BOB's `start check --wake` reads addresses/bob.json (bob=old). ROOT's `handover confirm` pushes bob=new. The old BOB's `writeState` fetches fresh, so there is no conflict, rewrites bob=old and pushes as a fast-forward.
- **Smallest fix:** inside the callback, re-read `addresses/<role>.json` in the worktree and throw unless `session === me`. For `recordStart`, unless it is the expected prior value.

## 12. Concurrent appends to one state file conflict, and pushRetry gives up
- **Where:** util.mjs:219-235 (`pushRetry` merges `origin/<sb>` and aborts on any conflict). Writers append to one file per role, or one per kind: messages/<from>.jsonl (state.mjs:155, 173), metrics/restart.jsonl, releases/dev.jsonl, deploys/dev.jsonl, layers/closed.jsonl, metrics/sweep.jsonl and lanes.
- **Class:** 6. **Severity:** a refused act (rerun works). It can block when the refused write is a `send` whose message is then never delivered or recorded.
- **Scenario (reproduced in exp3):** two appends at the end of the same jsonl give a `UU` conflict. Cases: BOB issuing `send … --from bob` and `send delivered n --from bob` as parallel tool calls, old and new BOB both writing messages/bob.jsonl during a handover, or two `--from pin` sessions. The second fails with "moved on origin and does not merge cleanly; nothing was pushed".
- **Smallest fix:** on a rejected push, rebuild the worktree from the fresh tip and re-run `change(wt)` (which also renumbers `n`) instead of merging. Or commit `*.jsonl merge=union` in the state branch's `.gitattributes`.

## 13. The tranche→main merge waits 20 minutes on a gate capped at 45 that runs every module's suite
- **Where:** gate.mjs:103,120 (a non-job PR's scope is every module whose files it changes, run serially in one job), process-gate.yml:25 (`timeout-minutes: 45`), merge.mjs:329-338 and p3.mjs:241 (20 min by default), tranche.mjs:205-207 (the close steps).
- **Class:** 5. **Severity:** blocks tranche close, later.
- **Scenario:** `Close tranche` changes all 38+ modules. One gate job runs every suite, each up to `suite_timeout_minutes` (20). `merge --plain` gives up at 20 min, and the gate is cancelled at 45. If main's ruleset requires `gate`, the tranche never merges.
- **Smallest fix:** for a PR whose head is the tranche, have the gate trust the per-job gates (trigger `record` when every changed file arrived through a merged job PR), or split suites into a matrix. Default `--minutes` to at least the gate's timeout.

## 14. Lower (wrong figures or cosmetic)
- **Release checks claim freshness without testing it** (release.mjs:180-184, class 2, wrong figures). `release run checks` builds generated rows first. `bundles.mjs` also rebuilds stale *committed* bundles, so the copy's checks "setup-words fresh" and "bundles fresh" (`--check`) always pass, and the release body claims fresh bundles the commit does not have. Fix: after `buildGenerated`, run `git status --porcelain` on the committed generated paths, and record a failing result naming each one the build changed.
- **survival() reports missing history as "reverted"** (metrics.mjs:90-92, class 3, wrong figures). It treats any `merge-base --is-ancestor` failure as "reverted", including exit 128 for a missing object when `deepen()` failed in a shallow clone. Fix: exit 1 means not on the branch; any other exit is `unmeasured`.
- **p3 size counts tracked files only** (size.mjs:81-82, class 2, cosmetic). `tracked_files`/`tracked_bytes` leave out the built-not-committed files (about 43 MB on the copy since they were untracked), so later ranges are not comparable with earlier ones. Fix: add a `generated_untracked_paths` figure, or say "tracked" in the range rule.
- **Two `found` runs can share a mark number** (found.mjs:139-145, class 6, cosmetic). Two runs for one module before the first branch is pushed, without `--write`, both get the same F<n> and the same branch name. Fix: always count the local `found/<key>-f*` branches as well as the remote ones.
- **Full fetches without `--depth` in shallow sessions** (class 3 cost, not misjudgement). start.mjs:34 (every `start check`, every wake), state.mjs:141 (every job `send` after BOB pushed to the job's branch), merge.mjs:105/359/367 and the `git fetch origin <tranche>` that roles.mjs:98 prints. The first one can pull the whole history (util.mjs's own measurement: 90 s). Fix: `...depth(root)` there, as fetchBranch does, except merge, which needs the history.
- **`record-check` and `ledger check` without `--base` in a shallow clone** (p3.mjs:380, 393, 398, class 3). They give "no base" or a git failure from `merge-base`. Only people run them by hand. Fix: use compare's `merge_base_commit`, as `shallowBase` does.
- **Two pin moves can both pass `pin check`** (pin.mjs:35-37, class 6, safe). The window is between step 8 and the push and PR in steps 9 and 10. The second PR conflicts on the gitlink and `waitMergeable` refuses it at once. No fix needed beyond what PR 85 did.

## Checked and found sound
- markReady (CCR route).
- `shallowBase` (PR 83) and take-in deepening.
- aheadBy, onMainOf, closedRows and tranche `onBranch` (compare first).
- entryHistory and blocks (cut-aware), the report `deepen()`, survivalReport (shallow means unmeasured), and processRepo's `--unshallow`.
- gate (full-history Actions checkout), layer close (installs all lock files, builds generated), release run (install, then build).
- waitMergeable and waitForChecks (bounded), mergeRetry, the notice and triage writes (one file per row), sweep and heartbeat (single writer).
