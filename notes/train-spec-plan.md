# Speculative gates in the merge train (option C): build plan

5 Nov 2026, build/train-spec from tranche 74c3679. Design: notes/train-throughput-study.md §3 C on
study/train-throughput, as the coordinator restated it (points 1-5). This page maps each point to
code, lists where the code shows the design cannot run as worded, and says how it is tested.

## Where the code shows a flaw (deviation, put to the coordinator before it is built)

The design says process-gate "runs unchanged" on a draft PR from the job's branch into
`train/spec-<i>`, and that spec branches are reused per position. Four things in the code stop that:

1. **A draft PR's gate runs no suite, and a spec PR has no receipt.** gate.mjs reads the PR's draft
   state live (line 86) and a draft gets trigger `draft`: no suite, no revert, no receipt (line 151).
   Made ready instead, the receipt is read only from that PR's own comments by its opener (line 94):
   a spec PR has none, so the gate is red ("ready but has no receipt", line 269). The gate needs a
   spec mode either way.
2. **A second PR from `job/<id>` breaks three checks that guard against exactly that.**
   - verifyRow (github.mjs 158-161) refuses a run whose listed PRs include one into a base other than
     the tranche ("not a second PR on the same commit into a branch that carries a workflow of its
     own"). While the spec PR is open, the job PR's own rows can stop verifying, and the spec PR's
     rows never verify against the tranche.
   - branchBound (gate.mjs 433-440): any PR ever opened from `job/<id>` into another base removes the
     tranche cover for that job's merge, for good (PRs cannot be deleted). Every speculated module's
     suite would run again in the tranche into main, which is what the cover exists to avoid (cap).
   - Check runs attach to the head commit, shared by both PRs: `checkRun(head, 'gate')` (ready,
     jobChecks, waitForGate, the ruleset's required check) returns whichever ran last. A red spec
     run shows red on the job PR's head.
3. **Reusing `train/spec-<i>` needs a force-push.** Rebuilding position i on a new base is a
   non-fast-forward update. Making each rebuild a descendant of the old tip instead keeps old ahead
   heads reachable; when a job later sits behind a spec that once held its own older head, the merge
   base of the job and the spec becomes that head and GitHub's test merge drops part of the job's
   change (a false red, sent back to the job).
4. **The land as worded loses the tranche cover and the merge row.** GitHub's merge of the job's head
   into a tranche that is not its ancestor is a new merge computed at land time, not checked bytes;
   jobMerge (gate.mjs 450-451) covers only a merge whose head was brought up to the tranche and holds
   the merge row (merge.mjs 204), which today's merge() pushes onto the job branch before its gate.

## The deviation proposed (C', same strength: every land is the tree a green gate tested)

- **Spec pair per build, fresh names, never reused or deleted:** base `train/spec/<pr>-<seq>` at
  R(i-1), head `train/head/<pr>-<seq>` at R(i), where R(i) is the predicted merged result of window
  position i: the job's head merged onto R(i-1) (R(-1) = the tranche tip), plus its merge row. The
  spec PR (draft, into the spec base) shares no branch and no commit with the job PR, so verifyRow,
  branchBound and check runs are untouched. Its gate tests exactly R(i).
- **gate.mjs spec mode** (base ref `train/spec/*`, read from the live PR, so no workflow change): the
  job is the open job PR the branch name gives, whose head is in R(i); it is judged as that job (its
  entry, ownership, imports, revert and suite) and its receipt read from the job PR. Draft does not
  skip the suite in spec mode. The row records the tree it tested.
- **Land, exact bytes:** once every PR ahead landed, merge() builds the job's merged result L on the
  real tranche as today; only if L's tree equals R(i)'s tree, records aside (the rule
  record-since-green already applies), it pushes L to the job branch. The job PR's gate on L takes a
  new fast path, `spec-tested`: a verified green spec row tested this tree; no suite (about 1 min).
  Then mergePR as today: the merge is trivial (tranche is L's ancestor), so the bytes that land are
  L's, equal to the bytes tested. jobMerge follows a `spec-tested` row to its spec row, so the
  tranche cover holds. Trees not equal: today's path (full re-gate of L), said in the row.
- Spec branches accumulate (two per window entry, more on rebuilds); a prune needs Bob.

Cost against the design: a serial ~1-2 min confirm gate per land (the study's simulation assumed
1 min overhead), and a gate.mjs change that takes effect only when the copy's pin moves to it.
Throughput ceiling about 20-25 PRs/h, above today's 12-15 arrivals.

## Point by point (as C')

| point | code |
|---|---|
| 1 window k | `merge_train_window` in config DEFAULTS (4); window.mjs: the pure window (admit in order.mjs's order, plain rows and release-path first, topological prefix for provider holds); train.mjs builds R(i) and the spec pair per position |
| 2 tree land | merge.mjs `specLand`: L built as today, `tree(L) == tree(R(i))` records aside, else today's re-gate; gate.mjs `spec-tested` fast path; jobMerge follows it |
| 3 red at i | window.mjs `onRed(i)`: i back to its job as today (refuse); every spec behind closed (PR closed, cause named) and rebuilt on the new R chain; plain and release-path keep priority; the in-flight hold covers the head of the window while its confirm gate runs |
| 4 branches | fresh `train/spec/<pr>-<seq>` / `train/head/<pr>-<seq>`, pushed fast-forward only (new refs), never deleted; spec PRs closed, not deleted; no workflow change, no permission, no trigger |
| 5 causes | every window row (`metrics/train-window.jsonl` on the state branch) names its cause: admit, build, spec PR opened, closed (red ahead, base moved, head moved, withdrawn), landed; a restarted train rebuilds the window from the open spec PRs and those rows |

## Failure cases

- Red at position i: i refused to its job; specs i+1.. closed, rebuilt on R(i-1).
- Job pushes a new head mid-window: its spec closed; it re-enters at the back; specs behind rebuilt.
- Tranche moves by anything but the window (a plain PR, a hand merge): whole window closed, rebuilt.
- Spec gate green but L's tree differs (GitHub's merge base differs): today's full re-gate; row says so.
- Confirm gate red or cancelled: hold ends with its cause; window behind rebuilt.
- Train killed: on restart, open spec PRs with their rows rebuild the window; ones whose base no
  longer matches are closed with that cause.
- Runner cap: k parallel spec gates plus one confirm; k = 4 keeps the peak about 15 of 20.

## Tests

Unit tests on window.mjs (admission order, priority, provider prefix, red at i, head moved, restart
from rows); a simulated window of 4 with one red at position 1 through train() with stubbed GitHub
(fails without the build: no window, serial); merge `specLand` tree equal and not equal; gate spec
mode and `spec-tested` fast path (receipt from the job PR; draft not skipping; a tree not tested is
not fast); jobMerge cover through a `spec-tested` row. Full suite, cold review, confirming review on
the merge path.

## Ruling and interfaces (coordinator, 5 Nov: go C')

Conditions: (1) `spec-tested` fires only on exact tree equality of L and R(i) excluding record paths,
and only for a spec row that verifies (its run, base ref `train/spec/*`, head `train/head/<pr>-<seq>`,
its tested tree); anything else is the full re-gate. (2) Spec mode judges exactly as the job's own
gate would; a job red in its own gate is red in spec mode (tested). (3) The window admits only PRs
whose own job-PR gate is green (ready() already gives only those). (4) Every spec build, close and
fallback writes a row with its cause; the train report counts fast-path lands against fallbacks.
`merge_train_window` defaults to 1: today's serial train, unchanged.

The parts and the contracts between them:

- **Names.** `SPEC_REF = /^train\/(spec|head)\/(\d+)-(\d+)$/`: base `train/spec/<jobPR>-<seq>`, head
  `train/head/<jobPR>-<seq>`, the same `<jobPR>-<seq>` on both. Exported from gate.mjs as
  `specRefs(baseRef, headRef) -> { pr, seq } | null`.
- **Gate spec mode** (gate.mjs): when the live PR's base ref and the event's head ref form a spec
  pair, the run is judged as job PR `<jobPR>` (its head must be an ancestor of the spec head; the PR
  open, into the tranche, from a job branch of this repository): branch, draft and receipt (and its
  opener) are the job PR's; no record fast paths. Every row carries `tree` (the checkout's
  `HEAD^{tree}`); a spec row carries `spec: { pr: <jobPR>, seq: <seq> }`.
- **Fast path** (gate.mjs): on a job PR whose head commit's message has the trailer
  `Spec-Tested: <specPR>`, the gate reads spec PR `<specPR>` (base and head a spec pair for this PR),
  takes its newest row that verifies (verifyRow with `{ pr: specPR, baseRef: <its base ref> }`), is
  green, trigger `code`, `spec.pr` this PR, whose `tree` is its own head's tree, and whose receipt
  agrees for the job's current receipt attempt; when the files between that row's `sha` and this
  head are all record paths, the row is `trigger: 'spec-tested'`, suite and receipt carried over,
  `spec_pr`, `spec_run`, `spec_sha` named; no suite runs. Anything else: the trigger it would have
  had. jobMerge's cover follows a `spec-tested` row to its spec row.
- **merge.mjs**: `mergedResult(root, cfg, { n, id, branch, head, onto, ...row opts }) -> { sha, tree }`
  builds, in a temporary worktree, the job's head merged onto `onto` plus its merge row (as merge()
  builds its merged result today), and never pushes. `merge(root, n, { ..., spec: { pr, sha } })`:
  once L is built, if the files between `spec.sha` and L are all record paths, L's head commit gets
  the trailer and the result says `spec: { fast: true }`; else `spec: { fast: false, why }` and the
  merge goes on as today (full re-gate).
- **Window** (window.mjs, pure; train.mjs drives it): rows in `metrics/train-window.jsonl` on the
  state branch, `{ at, row: 'spec', session, event, pr, seq, position, spec_pr, base, head, cause }`,
  event one of build, close, land, fallback.

## Built (5 Nov, evening, after Bob's word at ~16:40)

- **Flag:** `merge_train_window` in process/config.json, default 1: the serial train, untouched (the
  loop takes the window's pass only past 1; a test shows a window of 1 makes no spec ref or PR).
- **train.mjs** drives window.mjs: `windowPass` (reconcile with the tranche tip and the jobs' heads
  from ready()'s one read of the open PRs; read the spec gates and their post jobs; a red at i whose
  ahead are all green is refused to BOB as a red merged result and every spec behind is closed;
  a cancelled spec gate is closed and rebuilt, not refused; position 0, green, lands through
  merge() with its spec; then admit and build), `specDone` (land / fallback / refused rows; a
  fallback land closes those behind, whose chain no longer holds), `restoreWindow` (restart).
- **Position 0 that is its own merged result** (its head already holds the tranche tip and its
  merge row): no spec PR, since its spec head would be the job PR's own commit and share its check
  runs; it lands on its own gate, as the serial train lands it.
- **Branches:** every spec head is pushed as a new ref; a name taken on the remote (ls-remote,
  `train/spec/*` and `train/head/*`) or in a row is never used again, so no push is ever a rewrite. Spec PRs are
  closed, never deleted; branches are never deleted. There is no non-deletion route to clean them
  (auto-delete on merge is a repository setting, and spec PRs never merge): they accumulate, one
  per build; a prune needs Bob.
- **Pin:** the gate and job post run at the base's pin, so on the copy the spec path works only
  once the copy's `.process` pin carries this code; before that, a window over 1 must stay off.

## The spec run's judge (confirming review, finding A; closed by the coordinator's ruling, 17:20)

Found: a spec run executes the pin (`.process`) and gate workflow of its base. With bases on
`train/spec/*`, branches any writer can create or move, the run's code and so its whole row
(`base`, `tree`, `ok`, `spec`, `receipt`) could be forged by whoever pushed a spec pair; `verifyRow`
ties a row to the run's head sha, workflow path and base ref name, never to the base sha it ran on.

Ruled and built: **every spec pull request is into the tranche itself**, from `train/head/<pr>-<seq>`
at R(i), which is built on the tranche tip (R(0)) or on the R ahead of it. No spec base branch
exists. The run's base is a tranche tip, so its pin, config and gate code are the tranche's, under
the same ruleset and the same `verifyRow` binding (base ref = the tranche) that job PRs rest on;
GitHub's merge checkout of R(i) into that tip is R(i)'s tree. What changes with it:

- **Gate, spec mode:** `changed` and its merge-base are the job PR's own head's (the spec head also
  holds the jobs ahead); ledger, start row, imports and generated checks read the job's head, as
  its own gate does; the suite runs on the checkout; revert and base-red run against the run's base,
  the tranche tip.
- **Fast path and cover:** the spec run's base must be the land's base or behind it on the tranche,
  with the same judge (`.process`, `process/config.json`, `.github/workflows/process-gate.yml`); a
  base-red suite stands only on the land's very base (a test failing at an older tip may have been
  fixed by a job ahead and broken again by this one).
- **Never merged:** spec PRs stay drafts (GitHub merges no draft); `merge` refuses a non-job branch
  and `merge --plain` refuses `train/head/*` by name.
- **Noise:** up to k draft PRs into the tranche; status, sweep and the train select job branches
  only. Any product workflow on `pull_request` into the tranche also runs for each spec PR: a trial
  pre-check on the copy.

## Second confirming review of the tranche-based spec (247c63f), and what was done

- **Binding (HIGH, fixed):** GitHub lists only *open* pull requests on a run, so a second PR from a
  spec head into a branch with another gate workflow, since closed, or a retarget of the spec PR,
  could make a forged run verify. The fast path and the cover now require `branchBound` on the
  spec head always: every PR ever opened from it is the spec PR, into the tranche, never retargeted.
  The same listing gap stands under job PRs' record-since-green and merge reads today; that is
  outside this build and is said to the coordinator.
- **Draft (MEDIUM, fixed):** a spec PR made ready is red in spec mode, so its green gate never
  stands as the required check for content judged only as job n's change.
- **Liveness (fixed):** a spec gate that never reports is closed past the hold's cap and rebuilt as a
  red that did not judge the job (then refused after SPEC_REBUILDS).
- **Entry (fixed):** spec mode reads the job's ledger entries at the job's own head.
- **Residual (records):** records are `process/`, so R(i) and L may differ in other modules' ledger
  entries and in any file under `process/`. A product test that reads `process/` could pass on R(i)
  and not on L. This is the same rule record-since-green already stands on; a check that no suite
  reads `process/` would close it.

## Final confirming review (0df703d), and what was done

- **H1 (HIGH, fixed):** GitHub lists a run's open PRs by head sha *or* branch, so a run of another
  branch at the spec head's commit (a writer's `foo` into a branch with another gate workflow,
  since closed) listed the spec PR and verified. `verifyRow` now takes `branch`: the run must be
  on that branch of this repository whatever PRs are listed; the fast path and the cover pass the
  spec head's branch, open or closed.
- **L1 (fixed):** `branchBound` is read after the row is picked and verified, so any PR whose run
  made the row existed by that read.
- **L2 (residual):** a spec PR a writer marks ready keeps its earlier green `gate` check for the
  seconds until the `ready_for_review` run reports; only a hand merge by a person in that window
  could use it. Closing it needs a ruleset change (Bob's).
- The same head-sha listing gap stands under today's job PR paths (record-since-green, merge's
  row read): said to the coordinator as its own build.
