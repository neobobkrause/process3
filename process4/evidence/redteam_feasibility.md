# Process4 draft: feasibility review

13 Nov 2026. Reviewed: `recommendations_draft.md` against `foundations.md`, `levers_github_cloudflare_product.md`, `product_side.md`, `canon_analysis.md` section 5, the two repositories (read-only), and current GitHub documentation.

**Verdict.** The shape is sound and most of it stands on features that exist. It would not run as written. Five mechanical faults would stop the first job or the first hour (findings 1 to 5), two planning gaps would stop a 220-module build (6, 7), and five gaps would mislead the owner or leave him as the only recovery path (8 to 12). Every correction below is a setting, a sentence, a deletion or a count. None adds a tool.

Evidence labels:

- **[measured]** recorded in `foundations.md` by Process3.
- **[repo]** read today from `civicsmith-copy` or `process3` at `origin/tranche` (and `origin/main` where said).
- **[doc]** vendor documentation, URL given.
- **[tool]** the Claude Code cloud tool definitions visible in this session today (`create_session`, `create_trigger`, `subscribe_pr_activity`, `archive_session`).
- **[unverified]** nobody has measured it.

---

## A. The six walks

Each row names the actor, the credential and the platform feature. "F n" points to a finding in section B.

### A1. One job, start to next module

| Step | Actor, credential | Feature | Holds? |
| --- | --- | --- | --- |
| BOB wakes | Scheduled task bound to BOB's session | `create_trigger` default mode fires into the creating session [tool]; resumed 3 of 3 [measured] | Yes. BOB must create the task itself in its first turn; the draft does not say who does (F10) |
| Status | BOB, session GitHub credential through the proxy | `gh pr list`, files at the integration tip | Only if "plan" and "merged" are defined (F7) and BOB's checkout is at the tip |
| START and session creation | BOB, `create_session` | Judged act, passed every time tried [measured] | Breaks: with no `source_revision` the session starts from the default branch, `main`, the 1 Nov baseline (F1) |
| Session setup | Job | The product's SessionStart hook installs Node 26 and dependencies [repo] | Breaks: C5 says "no hooks at all" (F1) |
| Branch, draft PR | Job, session account | `git push`, `gh pr create`; allowed by default | Yes |
| Tests in session | Job | Local run; background limit about 30 minutes [measured] | Heavy modules (40 minutes) need CI |
| Ready, auto-merge on | Job | `gh pr merge --auto --merge` | Three faults (F3) |
| Required check | GitHub Actions, read-only `GITHUB_TOKEN` | Reusable workflow at a pinned SHA | Pending for ever on a PR that changes no module unless said otherwise (F4); capacity (F5) |
| Merge | GitHub, after all required checks pass [doc] | Auto-merge | Yes. Which identity the merge carries, and so whether it fires the `push` run, is [unverified]; S2 tests it |
| Post-merge run | Actions | `push` on the integration branch | Undefined scope; cannot see cross-module breaks (F6) |
| BOB learns of the merge | — | PR subscription | Does not exist as drafted: one subscriber per PR, and the job holds it (F2) |
| Next module started | BOB | Next hourly wake | Yes, up to 60 minutes later; enough for the measured throughput (F2) |

### A2. A red check

GitHub sends the result to the PR's one subscriber, the job (C3) [tool]. The job fixes and pushes; auto-merge stays on because a writer pushed [doc]. Holds, subject to S3. If the job session is dead or paused (three refusals in a row [measured]), nothing in the draft replaces it: BOB's standing prompt does not name the act, and a replacement cannot receive the PR's events until the dead session ends or is archived [tool] (F10).

### A3. Layer close with deploy-and-walk

"Layer closed" is not defined without the ledger (F7). `workflow_dispatch` and `schedule` run only for workflow files on the default branch [doc]; `main` has no Process4 file and the draft never moves it (F1). The product's own `deploy-test.yml` records the same trap [repo]. The walk took 60 and 64 minutes [repo: product_side 6]; a fresh development copy needs a token that can create Workers [repo: levers 8.6]. BOB's dispatch is a judged act; a `schedule` plus `push`-triggered run with a queueing concurrency group needs no session act at all. How failures become work is not said (F7).

### A4. BOB dies

Detection is the daily workflow, so up to 24 hours plus N (F10). The owner starts a new BOB; the old bound task keeps firing into the old session [measured], so two BOBs can start the same module (F10).

### A5. The owner pauses

No mechanism. The next hourly wake tells BOB to "start a job for every ready module", against the owner's word (F9).

### A6. A public release

The `production` environment with the owner as reviewer exists as a feature and already exists in the product as `release` [repo]. Missing: how the integration branch reaches `main`, who cuts a release now that `p3 release` is deleted, and the removal of the release signing seed from the sessions' cloud environment (F11).

---

## B. Findings, ranked

### 1. Sessions would start from the wrong tree, with no setup, and the scheduled workflows have nowhere to live

**Evidence.**
- `create_session.source_revision` "defaults to the repo's default branch" [tool]. The default branch is `main`; its last commit is 1 Nov and the integration branch is 7,339 commits ahead [repo]. A job started without a revision builds on the pre-Process3 tree, with that tree's deny list and approvals. Foundations: "a session reads the deny list only when it holds one repository and starts from a branch that carries it"; a start by branch name "landed on an old copy" on 2 and 3 Nov, a start by commit landed fresh [measured]. The draft says nothing about where sessions start.
- C5 says "no hooks at all". The product's `.claude/hooks/session-start.sh` (on `main` since September) installs Node 26, deepens the shallow clone and runs `npm ci`; the container otherwise has Node 22 and no `node_modules` [repo]. Process3 dropped hook-based setup because hooks "vanished after a resume" and one "installed 7 of 10" [measured]; its replacement, the tool's test command, is deleted by N1. Nothing is left.
- G8's watchdog and F1's daily walk are `schedule` workflows; F1's layer-close walk is `workflow_dispatch`. Both run only from the default branch [doc: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows]. `main` carries four workflows and none of these [repo].

**Correction.** Three sentences. (a) C4: the START renderer prints the exact `create_session` arguments, with `source_revision` set to the integration tip's commit. (b) C5: "no PreToolUse or Stop hooks"; the START's first command is the product's setup script (the body of today's hook). (c) P1: run 0 also puts the watchdog, walk and release workflow files on `main` by an owner commit; each checks out the integration branch. Alternative with no file move: make the integration branch the default branch for the run; CODEOWNERS already guards `.github/**` there.

### 2. BOB and the job cannot both subscribe to a pull request, and BOB should not want to

**Evidence.** "A PR's events go to one session at a time ... this session will not receive events" when another holds them [tool: `subscribe_pr_activity`]. C3 gives the subscription to the job. C2(a), "woken by pull-request events it subscribes to", then delivers nothing. Process3 measured what follows when BOB has no event: 194 minutes to notice a completion [measured].

If instead BOB held the subscriptions: 135 landings a day × (2.1 CI results per landing [repo: 495 code and draft gate runs for 238 landings] + a merge) is over 400 events a day, about one every 3.5 minutes, each a turn that re-reads BOB's whole context. Whether every event is its own turn is [unverified].

**Correction: delete C2(a).** BOB is woken by its hourly task and by the owner, nothing else. Arithmetic: at most 24 live sessions [measured] × 24 wakes = 576 starts a day, against 135 landings on the best day. BOB then takes about 24 turns a day instead of 400, which is also the answer to context growth, compaction and the 20-refusal total. The cost is a freed slot waiting 30 minutes on average. The daily report prints "ready items that waited over 60 minutes for a start". Only if that count is high does the job's last act become one message to BOB.

Not available as alternatives on the measured facts: a fresh BOB per wake, and a scheduled or event-fired task that starts jobs; a task's fresh session "cannot start sessions or send messages, 0 of 3" [measured]. Current documentation says each task run starts a new session, which the 3 of 3 bound-resume measurement contradicts, so S4 must re-measure both before run 1.

### 3. `gh pr merge --auto` fails three ways as drafted

**Evidence.**
- The deny rule "`gh pr merge` without `--auto`" cannot be written. Bash deny rules are prefix and glob patterns with no negation; `Bash(gh pr merge *)`, today's rule [repo], removes `--auto` too, and deny beats allow. Bash patterns are documented as not a security boundary.
- The standing approvals still say sessions merge "through the process's merge tool", push "to the process's state branch", and may deploy in the product's Cloudflare account [repo: `CLAUDE.md`]. Auto mode blocks "merging a pull request no human approved" by default, and the only channel measured to change that for sessions another session started is the owner's committed text (11 of 11 declined on quoted consent; 0 refusals in about 450 acts after) [measured]. The text names a tool that no longer exists. `autoMode.environment` is not read from project files, so the repository cannot describe the arrangement to the classifier.
- "The option to enable auto-merge is shown only on pull requests that cannot be merged immediately" [doc: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request]. On an already-green PR the same command is a direct merge by the session.
- No session may write the approvals; the classifier refuses it [measured]. P1's "one pull request prepared by a commissioned session" therefore cannot carry them.

**Correction.** Delete the deny rule: GitHub refuses a plain merge of a PR whose check is not green, and a plain merge of a green one is what auto-merge would do. Add one owner act to run 0: rewrite the approvals block in his own hand for Process4 (enable auto-merge on its own pull request; no Cloudflare deploy; no state branch). M1's "CLAUDE.md ≤ 30 lines" does not bind (the file is 22 lines and 8,664 bytes [repo]); state the cap in bytes or drop it, since CODEOWNERS already makes the file the owner's. S2 runs in a job that BOB started, not one the owner started. Named fallback if S2 is refused: an owner-owned workflow enables auto-merge on `ready_for_review`; merges made with `GITHUB_TOKEN` start no `push` run [doc: https://docs.github.com/en/actions/concepts/security/github_token], so the post-merge run would then move to a schedule.

### 4. The required check must report on every pull request, including those that change no module

**Evidence.** G4: "it runs the changed module's tests". A required check whose workflow is skipped by a path filter stays pending and blocks for ever; a job skipped by `if:` reports success; a job that `needs` a failed job is skipped and may not block [doc: https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks]. Pull requests with no module in them are routine: 28 requirement-or-docs landings in the week, every plan and requirement-split PR by BOB, and the owner's own `CLAUDE.md` PRs [repo: product_side 2]. Under auto-merge a pending check is silent: nothing fails, nothing merges.

**Correction.** One sentence in G4: "No `paths` filter on the workflow; a planning job lists the changed modules; one always-running job named `gate` is the required check and passes when every listed suite passed or none was listed." Add to S1: a PR that touches only `build/requirements/x.md` merges; the check name produced through the reusable workflow is the name the ruleset requires. State as a known limit: a re-run tests the original merge commit, so a PR that went green hours ago merges on old evidence; auto-merge keeps that window to one gate run.

### 5. The gate as sketched needs 52 concurrent runners in a measured peak hour; the account has 20. The 10-minute budget stands on a baseline that the record contradicts

**Evidence and arithmetic.**
- Concurrency: 20 jobs on Free, 40 on Pro [doc: levers 3.2].
- Runs per landing without record triggers: 495 / 238 = 2.1 [repo]. The draft adds one `push` run: 3.1.
- Levers' shape: 1 planning job + 4 shards of 10 minutes + 1 aggregator, about 42 runner-minutes a run. Per landing: 3.1 × 42 = 130.
- Day average at 135 landings: 17,550 runner-minutes, 12.2 of 20 runners busy all day.
- Peak hour: 24 landings (7 Nov 18:00Z; 19, 24 and 20 in three of four hours) [repo]. 24 × 130 = 3,120 runner-minutes in an hour that supplies 1,200. The queue grows by 1.6 hours per peak hour. "Median ready-to-merged under 30 minutes" fails exactly when work is flowing.
- Merge rate is not the limit: 24 an hour is 0.4 a minute against GitHub's guidance of 1; the worst minute had 4 merges and 28 minutes had two or more [repo], with no refusal.
- G5's "today 40–65 as one job" is the review's "median attempt". The gate rows give a median of 1.1 minutes over 789 runs (63% not started by code) and module suites of 1.9 to 2.5 minutes; 40 to 42 minutes is `plane` and `control-plane` only [repo: product_side 6; `process-gate.yml` comment]. Sharding a two-minute suite four ways multiplies the fixed install cost of ten lock files by four.

**Correction.** Restate G5 as two numbers: median wall time ≤ 10 minutes, and **≤ 50 runner-minutes per landing** (24 × 50 = 1,200, the measured peak on 20 runners). Reach it by configuration: the gate runs on ready PRs only; `cancel-in-progress` per PR; shards only for suites the planning job knows are heavy; the `push` run in one concurrency group so it tests the newest tip, not every merge. S5 first measures the code-triggered median and 90th percentile from Actions history; it is a day of product CI work, not an hour. If the count still exceeds 20, Pro is the cheapest fix.

### 6. Nothing in the draft sees a cross-module break, and "ready" ignores that 182 of 220 modules depend on a module in their own layer

**Evidence.** In `build/modules.json`, 721 of 3,120 `uses` edges are within a layer; 182 modules have at least one; the longest chain is 65 modules overall and 16 inside layer 11; in-layer chain depths sum to 86 [repo]. The PR gate runs only the changed module's suite, and so would a `push` run of the same scope. The 2.1% the draft cites (3 conflicts in 146 merges) is that same narrow scope re-run on a newer base. A provider change that breaks a dependant already merged is caught by neither. Process3's catcher was notices (178 notices, 2,707 notifications, 90% "not affected"); N7 deletes them "with no replacement". What remains is the walk, plus `regression.yml`, which exists, is manual only, and is never mentioned [repo].

Waiting for every used module to merge is not the answer: 65 links × (about 30 minutes of job + up to 60 minutes for the hourly wake) is roughly four days of pure latency.

**Correction.** Two sentences. N1: "ready = an open item in the lowest layer that still has open items, with no open pull request; items in a layer start together" (what Process3 measured at 135 landings a day). F1: "`regression.yml` runs on a schedule on the integration branch (every six hours) and at each layer close; each red suite becomes one item for its module." Count cross-module reds per layer; only if the count is high, start a layer in waves by in-layer depth. Defer contract tests and type-checking as P4 already does.

### 7. "Plan minus merged minus open" has no data model, and the work of run 1 is items, not modules

**Evidence.** 170 distinct jobs landed 508 times, 113 of them more than once [repo: product_side 2]; "merged" is not a state a module has. Run 1 is completion-round and walk-fix work, whose unit is an item with dependencies on other items ("re-pass of CR2-9 once CR2-16/17/18 land") [repo: `build/plan/completion-round-2.md`]. The draft names no file for the plan, no key that joins a plan line to a pull request, and no place where a walk failure becomes work. N1 also forbids the tool to write, so something else must.

**Correction (the minimum; no new record).**
- `build/modules.json`, as it is: `id`, `layer`, `paths`, `tests`, `uses`. Read by the gate's planning job and by `status`.
- One round file per round, written by BOB in a planning PR before the round opens and not edited by jobs: one line per item, `id · module · what · after: ids`. Jobs do not tick it; 24 PRs editing adjacent lines of one file would bring back the sync merges (1,339 against 508 landings [repo]).
- State is derived, never written: open = an open PR whose head branch is `job/<item id>`; done = a merged PR with that head; blocked = a label; layer closed = no undone item in it.
- Requirement marks stay in each module's own file and are struck in the job's own PR (about 600 marks in 171 files today [repo]); a walk or regression failure enters as a line in the next round file.

`status` is then a join of two files and two `gh pr list` calls, about 150 lines; 500 is ample. This also answers "where can sessions update product-technical planning": in ordinary PRs to those product files, which is why finding 8 takes the layer map out of the guarded set.

### 8. CODEOWNERS as drafted locks the owner out of his own approvals and puts him in the path of routine planning

**Evidence.**
- With code-owner review required, a PR that touches an owned path "must be approved by that code owner" [doc: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets]. A PR author cannot approve his own PR (long-standing GitHub behaviour, not re-read today), so the sole code owner's own `CLAUDE.md` PR can never satisfy the rule. Rulesets bind the admin unless he is on the bypass list, and the setting Process3 asked for is "every ruleset's bypass list is empty" [repo: `setup/conditions.json`]. The owner committed to `CLAUDE.md` at least 9 times in 8 days (product_side counts 16 owner patches) [repo].
- G2 guards "the plan's layer map". Sessions changed `build/modules.json` in 41 commits on 4 to 8 Nov, 17 on each of 4 and 5 Nov, mostly `uses` edges the gate's import finding demanded and module splits [repo]. Each would now wait for the owner, against "owner minutes per day under 15" and against the canon's "you decide only the layers and modules that carry product capability".
- An approval survives later pushes unless stale approvals are dismissed; with auto-merge on, a later push to a guarded file would merge on the earlier approval.
- Behaviour of code-owner review at zero required approvals, a bot's inability to satisfy it, and whether a submodule gitlink path can be owned are [unverified]; S1 is the right spike. A CODEOWNERS line with a syntax error is skipped silently.

**Correction.** In G2: bypass list = repository admin; "dismiss stale approvals" on; guard `.github/**`, `.claude/**`, `CLAUDE.md` and the pin only, not `modules.json` (the daily report prints its diff-stat instead). Run S1 once on the real repository as well as a scratch one. Known limit, one line: settings reload during a session and `Edit` deny rules do not cover Bash, so a session can alter its own deny list in its own checkout; the wall is that the change cannot merge.

### 9. Pause and stop do not exist, and the standing prompt overrides the owner every hour

**Evidence.** Process3 held pause as a field every session read at its next status (PLN-5). The draft has "the owner can end a run at any time" and no mechanism. C2 makes the hourly prompt BOB's whole instruction: "Start a job for every ready module". An owner's "pause" said in chat is gone at the next compaction and contradicted at the next wake. This is R7, and it is not met.

**Correction.** One GitHub object and two prompt lines. A `paused` label on the pinned process-log issue (one click for the owner, or BOB sets it on his word). `status` prints PAUSED first. BOB's prompt begins "If status says paused, start nothing and stop." Hard stop: BOB interrupts and archives job sessions (15 of 15 after approvals [measured]).

### 10. BOB is a single point of failure with a daily alarm, and replacing BOB can produce two

**Evidence.**
- G8 runs "once a day" and fails "if ready work has not moved in N hours": worst-case detection is 24 hours plus N. It also cannot tell a dead BOB from an empty queue unless it computes "ready", which only `status` knows.
- A paused session waits for a person: three refusals in a row, or 20 in total [measured, doc]. Nothing in the draft counts refusals (C9 says "count them" with no counter).
- A replaced session's bound task "keeps firing into the old session" [measured]. The draft deleted the address-in-git guard that stopped two ROOTs acting. Deleting or switching off a task is judged case by case, and Process3 ruled that nothing may depend on it [measured], so it cannot be BOB's job.
- "At about 50 live sessions the account stops starting new ones, while the create call still reports success" [measured]. A run makes over 100 sessions a day. The draft gives the live limit no number, never checks that a started job appeared, and never archives a finished one. Whether idle finished sessions count toward the limit is [unverified].
- BOB's standing prompt omits acts the walks need: replace a stalled job (archiving the dead session first, or its PR events stay with it [tool]); archive merged jobs; move its checkout to the tip so new approvals load.

**Correction.** G8 gets two schedules in the same file: every 30 minutes it runs the pinned `status` and fails if a ready item has had no PR for two hours or a ready PR has not moved; daily it reports. The charter's "start a new BOB" step for the owner has two clicks before the prompt: delete the old task and archive the old BOB. BOB's prompt gains four short lines: fetch the tip; archive sessions whose PR is merged or closed; start to at most 24 live; a job with no PR after 15 minutes or a stalled PR is archived and replaced once. Replace BOB at every run boundary as a matter of course. S4 counts refusals over a simulated day. This weakens R6 honestly: the owner is the only recovery for BOB, and the count decides whether ROOT returns.

### 11. Missing altogether: the road to `main`, the release, the secrets, and the owner's setup list

**Evidence.** R1 is "onto main". The draft protects `main` and never merges into it; Process3 ended with `main` untouched since 1 Nov [repo]. `p3 release` and `process-dev-release.yml` cut development releases; both go with the tool, and no replacement is named. The sessions' cloud environment holds eleven variables today, among them `CLOUDFLARE_API_TOKEN`, `BIO_RELEASE_SEED` and `BIO_RATIFY_SEED` [repo: `process/config.json`]; G6 asserts "no session ever holds a deploy token" and lists no act that makes it true. Auto-merge is off and bypass lists are empty by Process3's own setup list [repo]; the success test says "if any wall is found missing, the run stops", but no list says what the walls are.

**Must exist before run 1** (all are settings, owner acts or sentences):
1. One owner page: every setting with its value and link (rulesets and bypass, CODEOWNERS, auto-merge on, delete head branches on, Actions permissions, the two GitHub environments, the cloud environment's variables and `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, the session account).
2. Secrets moved: the eleven variables out of the cloud environment; signing seeds only in the owner-reviewed environment; development Cloudflare token only in `dev`.
3. The owner's rewritten approvals (finding 3).
4. Workflow files on `main` and the session start rule (finding 1).
5. The round file and item naming (finding 7); the product's setup command named in START.
6. The run's close rule, one sentence: "a run closes with one integration-to-main pull request; required: the regression and a passed development walk (`Require deployments to succeed`); the owner merges it."
7. Pause (finding 9) and the BOB replacement steps (finding 10).

**Can wait for a count or a first need:** release cutting and a tag ruleset (before the first public release, not run 1); cost measurement beyond "unmeasured" (but say who reads it); a second product and the account-wide session limit; Worker Previews; type-check and lint; the merge queue; a contract for onboarding a new product (run 1 is the same product).

### 12. The success test rewards the wrong thing, and the decisive number is one sessions can move

**Evidence.**
- "Landings per day at or above 4 Nov's level": 4 Nov was 135 landings of first-time layer work. Run 1 is one layer merge and walk-fix rounds of some tens of items (round 2 had 33 [repo]). There is no comparable work, and landings were the number Process3 inflated: 105 of 508 changed only records and jobs landed 3.0 times each [repo: product_side].
- "Walk steps passing rises every day": the walker, `journey-check`, is a module that jobs edit (CR2-2), and its step count moved from 238 to 357 inside one round [repo: product_side 9]. A job told to make the walk pass can change the walk. The draft's own P5 warns of this tendency and guards only gate time.
- "Median ready-to-merged under 30 minutes": Process3's good days were 6 to 13 minutes and its bad day had a 90th percentile of 670 [repo]; a median hides the failure.
- R22's two health numbers (false-done rate, cost per surviving change) have no successor in the test.

**Correction.** Replace the landings line with "items merged once; re-landings counted separately" and "no ready item waited over 60 minutes for a start". State the walk as passing/total, with the total and "steps removed or loosened since run start" printed beside it; decide on that count whether the step list needs the owner. Add a 90th percentile under 60 minutes. Add "hours the integration branch was red" and "cost per merged item, or the word unmeasured".

**Spikes.** S1, S2, S3, S6 and S7 are right. S4 and S5 need the changes in findings 2, 5 and 10. Missing:
- **S8.** One subscriber per PR: the job receives a red check and the merge; a replacement receives events only after the first session is archived; how many turns one CI run produces.
- **S9.** `create_session` with a commit as `source_revision`, model and effort set by BOB: the child loads that commit's deny list and `CLAUDE.md`. Whether finished idle sessions count toward the live limit.
- **S10.** Re-measure whether a task's fresh session can start a session, push and open a PR. If it can, a stateless BOB per wake replaces the long-lived one, and S4's compaction question disappears.
- **S1 additions:** a no-module PR merges; the owner's own guarded-path PR merges by bypass; the gitlink path is owned.

---

## C. R1 to R25

| # | Verdict | One line |
| --- | --- | --- |
| R1 | Weakened | Work reaches the integration branch; the draft never says how or when it reaches `main` (F11). |
| R2 | Met differently | The check set and the process move to the owner; the rest stays BOB's once `modules.json` leaves the guarded set (F8). |
| R3 | Weakened | New owner acts: merge process PRs, approve guarded paths, restart BOB, hold the settings page. No route for a question that is his, rendered with options. |
| R4 | Weakened | M4 covers "only merged words are rules"; nothing holds "asked once, never asked again", and O5 lets a ruling expire and return. |
| R5 | Met | M3.6 and O2 keep a question a question. |
| R6 | Weakened | Blockers are labels and work goes on, but BOB's death or pause waits for the owner, found by a daily alarm (F10). |
| R7 | Not met | No pause; the hourly prompt restarts work against the owner's word (F9). |
| R8 | Met differently | Check runs and merges are the evidence; receipts go. Stronger than before. |
| R9 | Met | Merged is done; `main` is walled. The integration branch may be red briefly, by design. |
| R10 | Weakened | The revert check becomes a nightly sample; the "weakened tests" flag that calls the reviewer is defined nowhere in the gate (G4 forbids it). |
| R11 | Weakened | Not addressed: who keeps requirement files and marks, now that format checks and the ledger go (F7 supplies the minimum). |
| R12 | Weakened | Module at the PR, yes. Layer close is the walk only; the whole-product regression is not mentioned (F6). |
| R13 | Met differently | PRs, issues and product files carry state. One gap: which session is BOB, and its task, is recorded nowhere (F10). |
| R14 | Weakened | "Push before you stop" is not in the working agreement; an unpushed draft is invisible to the watchdog. |
| R15 | Met differently | A session may stop; a freed slot can wait up to an hour (F2), counted. |
| R16 | Met | Stronger: sessions cannot write the process, and the pin moves only between runs. |
| R17 | Weakened | Layers and single ownership rest on a sentence; the imports check that enforced `uses` is deleted, and "ready" ignores in-layer dependencies (F6). |
| R18 | Met | Caps and split-at-planning. The `CLAUDE.md` cap is in the wrong unit (F3). |
| R19 | Met | One pass, five findings, never the merge decision. |
| R20 | Weakened | The production wall is right; development and public release cutting have no mechanism after the tool goes, and signing seeds sit in the session environment (F11). |
| R21 | Met | Stronger: removal is the default, changes only between runs. |
| R22 | Weakened | Daily numbers exist; false-done rate and cost per surviving change are dropped, cost may read "unmeasured", owner minutes are self-reported (F12). |
| R23 | Met differently, conditional | Holds only if the spikes run; today it stands on four unmeasured behaviours (F2, F3, F8, F10) and on approvals text written for Process3. |
| R24 | Weakened | No onboarding page, no setup list, nothing for a second product sharing the account's session limit (F11). Account moves get easier. |
| R25 | Met | M2. |

Not met: R7. Weakened: R1, R3, R4, R6, R10, R11, R12, R14, R17, R20, R22, R24. Seven of those thirteen close with the sentences in section B (R1, R7, R11, R12, R14, R17 in part, R20 in part); R3, R4, R6, R10, R22 and R24 are real trades the draft should state as trades.
