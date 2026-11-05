# Merge train robustness: options (build/train-robust, 5 Nov)

Three defects on the copy (neobobkrause/civicsmith-copy) on 5 Nov. Read from tool/lib/train.mjs,
merge.mjs (mergePlain), state.mjs (fetchState, writeState, send, outcome), util.mjs (pushRetry),
p3.mjs (main's "starts owed" write), and the copy's process-state history (metrics/train.jsonl,
merger/plain.jsonl, messages/merger.jsonl, the commit log 12:10-12:40).

## What the copy's state branch shows

- 12:18:24 the train takes PR 499 (queue row 9851d2b5, an older row of the same caller's pin move;
  the caller was waiting on row 70643fc9). mergePlain lands it on GitHub (4f18d846) about 12:20.
- 12:21:13 `message from pin to bob`: a `p3 send` run in the train's clone. 12:21:23 the train's
  lease is released: the train stopped. There is no `merged` row for that land.
- 12:21:30 the caller sees no live lease, withdraws 70643fc9 ("the train stopped"), reads the pull
  request, finds it merged and prints `merged pull request 499 at ... (by the train)`: that path
  prints no wake. Exit 0; then p3.mjs main writes `starts owed: merge 499` (12:21:42), and that
  write's push is what printed "process-state moved on origin; fetching and trying again (2 of 5),
  (3 of 5)". The retries are noise after the fact, not the cause.
- 12:22:52 a restarted train takes 9851d2b5 again, finds 499 merged and writes
  `result: merged, elsewhere: true` with no `what` and no `wake`.
- 12:34:50 the train takes PR 502. 12:36:26-12:36:50 the merger runs `send` / `send delivered` in
  the same clone (merger-35, merger-36). mergePlain's beforeLand (leaseHeld -> fetchState fresh)
  fails `cannot lock ref 'refs/remotes/origin/process-state': is at ae959b78 but expected
  645e94ca`. That message matches nothing in PLAIN_AGAIN, so the row is `refused`, sent to BOB,
  and the caller's merge exits 1.

## 1. Lock clash: a transient ref-lock failure refuses a plain row

Cause. Every state-branch read and write fetches `+refs/heads/process-state:refs/remotes/origin/
process-state` into the clone (fetchState; pushRetry's fetch, which runs in a worktree of the same
clone and so updates the same ref). Two git processes updating one ref at once: the loser fails
with "cannot lock ref ... is at X but expected Y" (or "unable to update local ref"). fetchState
turns any such failure into a Fail (`cannot read origin's process-state`). In plainOne that Fail is
not in PLAIN_AGAIN, so a transient clash is a refusal: the queue row ends, BOB is told, the caller
exits 1. In mergeOne `lasting()` decides; and any Fail from writeState *after* a land (the train's
row write) is outside the try, so it propagates and stops the train (this lost 499's row, item 2).

Option 1A: retry the clash where it happens. fetchState, and pushRetry's fetch, retry a ref-lock
failure (`cannot lock ref|unable to update local ref|but expected`) up to 4 times with a jittered
wait (0.5, 1, 2, 4 s) before failing. The train classes a remaining one as transient: the plain
row gets a `retry` row (tried again in 1 min, the caller keeps waiting), a job gets its backoff.
- Cost: about 25 lines, 40 of tests (a fake git that fails the first fetch with the lock text).
- Covers any concurrent git in the clone, including a hand-run `git fetch` or `git pull` (their
  default refspec updates the same remote ref), which no lock of the tool's can cover.
- Fails when: contention lasts past ~8 s of tries (not seen: a fetch takes 1-3 s); then the train
  still retries the row a minute later rather than refusing it.

Option 1B: a per-clone lock around the tool's state-branch ref updates (see 3A), no retry.
- Cost: about 50 lines, 50 of tests.
- Fails when: anything outside the tool touches the ref (a session's `git fetch`/`git pull` in the
  train's clone), or a lock holder hangs; the clash then refuses the row exactly as today.

Recommendation: 1A. It is the smaller change and the only one that covers git outside the tool;
3A then removes the tool's own collisions so the retries are rarely needed.

## 2. Missing wake: a pin land whose train row was lost wakes no one

Cause. The wake for a pin move is computed only inside mergePlain (pin at the head vs at the merge
base) and travels to the caller only in the train's `merged` row (`what`). Three paths land or find
the pull request merged without that row, and each prints no wake and records none:
(a) the caller's fallback after a withdrawal: `getPR(...).merged` -> "merged ... (by the train)";
(b) plainOne's `elsewhere` branch, which a restarted train writes when it finds the PR merged
(the 12:22:52 row);
(c) the train stopping after the land but before its row is written (any Fail from writeState or
send after mergePlain returns propagates out of plainOne/mergeOne and the train ends; 499's row was
lost this way).
The retries the caller printed are main's `starts owed` write, after the merge; they did not cause
the miss.

Option 2A: derive the wake from git wherever a merge is seen without it. One function,
`pinWakeOf(root, cfg, mergeSha, as)`: fetch the tranche, compare the pin at the merge commit with
the pin at its first parent; when it moved into the tranche and `as` is not bob, return `what` and
the wake. The caller's fallback (a) and plainOne's `elsewhere` row (b) use it, so the caller prints
the wake line and the train's row records `what` and `wake`. If the merge commit cannot be read,
the caller prints the wake anyway, marked "pin not read" (an extra wake costs BOB one status; a
missing one stalls the tranche).
- Cost: about 35 lines, 50 of tests (the fallback path and the elsewhere row, each with a pin move
  and without one).
- Fails when: the land was not a merge commit (the tool merges with merge_method merge only, and
  the ruleset allows only that, so the first parent is the tranche before the land); a pull
  request merged by hand another way would be judged against its first parent, still the tranche.

Option 2B: the train never loses a record after a land. After mergePlain/merge returns, the row
write and BOB's message are each tried with the 1A retry and, if still not written, kept in
ctx.pending and written at the top of the next pass; a record failure after a land never stops the
train. The caller then always gets the `merged` row with `what`.
- Cost: about 40 lines, 50 of tests.
- Fails when: the train is killed or its session ends between land and row (the row never comes);
  the caller still needs 2A for that, and for rows an older train already wrote without `what`.

Recommendation: both, 2A first. 2A is the caller's guarantee whatever the train did; 2B's small
part (a failed post-land record retried at the next pass and never stopping the train) keeps the
measures row and the merger's "merged PR" message, which 2A cannot. No local journal file: a row
lost to a killed train is covered by 2A's wake and the next train's `elsewhere` row.

## 3. send in the train's clone races the train

Cause. `send`, `send delivered|failed` (and `handoff`, `merge train beat`, any writer) each run
writeState in whatever clone they are run in. The MERGER's session runs the train in the background
in its clone and runs `p3 send` there between passes, so two processes fetch and push the state
branch through the same `refs/remotes/origin/process-state` at once (item 1's clash). Nothing in
the tool serialises processes sharing a clone; pushRetry only handles another *writer on origin*.

Option 3A: a per-clone state lock. Every state-branch fetch and write in the tool (fetchState and
writeState with its push) takes an exclusive lock file in the clone's common git dir
(`<git-common-dir>/p3-state.lock`, created O_EXCL, holding pid, host and time), held only for that
one fetch or write (seconds), never across a train pass or a gate wait. Another process waits for
it (jittered, up to 90 s, then fails as today with the holder named). A lock whose pid is gone on
this host, or older than 5 min, is broken and taken. The train, send and every other writer share
it, so they take turns instead of colliding.
- Cost: about 50 lines, 60 of tests (two processes in one clone; a stale lock from a dead pid).
- Fails when: a holder hangs inside a git call for minutes (waiters fail after 90 s, as a clash
  would today); git outside the tool (covered by 1A's retry).

Option 3B: send refuses in a clone whose train runs. send and send delivered|failed read the lease;
when its proc is a live process on this host, they refuse: "the merge train runs in this clone; run
send from another clone of the product".
- Cost: about 20 lines, 30 of tests.
- Fails when: the train is not the only other writer (handoff, beat, another send); and the MERGER,
  whose every exception goes to BOB through send, needs a second full clone (a worktree shares the
  refs, so it does not help). It moves the race onto the operator.

Recommendation: 3A. With 1A as its backstop, a send in the train's clone simply waits seconds for
the train's fetch to finish; nothing is refused and the MERGER's workflow does not change.

## Summary of the recommendation

1A (retry ref-lock clashes; the train treats them as transient) + 2A (wake derived from git on
every merged-without-row path, recorded in the elsewhere row) + 2B's small part (post-land record
failure retried next pass, never stopping the train) + 3A (per-clone state lock). About 150 lines
and 200 of tests, in state.mjs, util.mjs, train.mjs and merge.mjs (pinWakeOf beside mergePlain's
own pin check, which then uses it).

## Ruling (coordinator, 5 Nov 12:42) and items 4 and 5

Ruled: 1A + 2A + 2B's small part + 3A, as recommended. Conditions: the lock is never held across a
gate wait or a network call other than the state fetch or push itself; a stale lock from a dead
pid is broken, a live one waited on up to 90 s then reported, never skipped; the wake printed and
recorded once, deduplicated by merge commit (`merger/wakes.jsonl`: one `wake` row, the record, and
one `printed` row per merge commit; the train records, its caller prints, the train's own log
carries no wake line, so the MERGER no longer sends one too, as it did for 499 at 12:21:13).

4. In-train jobs in the idle alarm. The copy's alarm (merger-35, 12:36) came from the idle check
that runs before commands, which reads status offline: a reopened module (its entry COMPLETE on
the tranche, commits on its branch) reads as "its attempt is open" with no pull request known,
and each took an empty slot's reason. The idle check now reads GitHub's open pull requests once
and, for those modules only, each head's gate (sweep.mjs markInTrain): one ready with a green gate
is named "in the train (PR n)", apart from the empty slots' reasons
(`in the train, not startable: <id> PR <n>, ...`). GitHub unread leaves the lines as before.

5. Cap and alarm count working sessions. With a listing (`--sessions`, the sweep's), a job's
latest session that is idle, unarchived, with its pull request ready and its gate green
(status.mjs parkedSessions) is not counted against the cap: status, job start --ready and the sweep
subtract them and print `<k> job sessions parked in the train ... not counted against the cap:
<id> PR <n>`; the sweep and ready rows record the working count as `live` and `parked`, so the
idle check between sweeps judges on working sessions too. With `--live <n>` alone, n is taken as
given (no listing says which sessions are parked). The sweep's "over the job cap" owed line still
counts every job session.

6. The release path's cost (coordinator, 5 Nov: 13.8 s of a warm pass on the copy). The train
recomputed the release set whenever the tranche moved or the open job set changed. It is now
cached (train.mjs releaseSet) by the inputs releaseModules reads: the tranche's tree, the
closed-layer rows on the state branch, origin's main, the config, the tool's commit, and the open
jobs on COMPLETE or BLOCKED entries (an open job on any other entry changes no input: layerState
counts it open already). In memory and in the clone (`.git/p3-train-release.json`), so an
unchanged tranche costs three ref reads and a restarted train at the same tip reads no file.
The test compares cached and uncached sets for every open set of the fixture.

7. Modules with no ledger entry after the open layer (coordinator, 5 Nov: 14 on the copy, skipped
silently). nextWork names each module of a layer after the open one whose requirement file has
unmet marks and that has no ledger entry, `- <id> (layer <n>): no ledger entry: cannot start;
<k> unmet marks`, and returns them apart (noEntry), never as work; the idle-capacity line adds
`no ledger entry, cannot start: <id> (<k> unmet), ...`.

## Review rounds

Round 1 (cold): five findings, all fixed, each with a test: the stale-lock break could restore a
released lock (now broken under a `.break` file; a lock naming this process that it does not hold
is stale); a state failure at the top of a pass stopped the train (now the next pass); the sweep
never marked in-train modules (markInTrain there too); the sweep's over-cap line counted parked
sessions (overCapOwed); a late row could be written twice (deduplicated).

Round 2 (confirming): (a) to (e) confirmed fixed (the lock race run with 6 processes, 180 counted
updates, none lost); release cache key complete; no deadlock in the re-entrant path. Two low
findings: markInTrain ignored a flagged row (fixed, tested); a lock left by another host is never
broken (kept: the ruling has an unknown holder waited on and reported, and the report names the
file to remove).

## 8. A transient GitHub error under an in-flight gate (copy PR 290, 5 Nov 12:48-13:15): options

Cause, as read in tool/lib. merge() (merge.mjs) pushes the merged result to the job branch and
waits on its gate in waitForGate, which reads the pull request (`pr()`, io.getPR) and the gate
(`read`, io.checkRun) each round. Neither read is guarded: one GitHub 503 (or a timeout, or a rate
limit) is a Fail out of merge(). mergeOne (train.mjs) classes it with `lasting()`: not lasting, so
a `retry` row and ctx.backoff for `<pr>@<head as listed>`; the merge is over. At the next pass
ready() lists 290 at its new head (the merged result), whose gate is still running, so it is not
green and is skipped; and loop() takes queued plain rows before any job (`plain.length ?
plainOne : mergeOne`), so 505 and 506 landed, the tranche moved, and 290's merged result went
stale (its green gate would now gate a stale result: merge() would bring the tranche in again and
gate afresh). waitForChecks (mergePlain's wait) has the same unguarded reads.

What else can move the tranche under an in-flight gate. Within the train: only plain rows and the
next job, and the loop is serial, so only after merge() returned or threw. Outside it: `merge
--plain` with no live lease (the train killed or stopped mid-gate: its lease lapses or is
released), BOB's `merge <pr>` of a job by hand, and anything on GitHub itself (its UI). A train
restart mid-gate has the same hole as the 503: the new train does not know a gate was in flight.

Option 8A: transient reads inside the waits are retried. waitForGate and waitForChecks catch a
Fail from their pull-request or check read that is transient (HTTP 5xx, 429 / rate limit,
timeout, connection reset, the proxy's gateway errors: one TRANSIENT pattern beside util.mjs
SERVER_ERROR) and read again with a growing wait (15 s, 30 s, 60 s, then every 2 min), counted
against the same deadline; only the deadline, a lasting error or the gate's own end ends the wait.
- Cost: about 25 lines, 40 of tests (a fake read that throws 503 twice mid-gate: the same gate
  lands, nothing else does).
- Fails when: GitHub is down past the gate's whole wait (the merge fails as today, and 8B holds
  the tranche); a non-transient error during the wait (a real refusal) still ends it.

Option 8B: an in-flight hold that outlives the merge call. When merge() has pushed a merged result
(or found one), the train records `inflight` {pr, tip, at} on the state branch (TRAIN_FILE, one
row) before it waits, and an end row when the gate ends (landed, red, PR closed or its head moved
by anything else, or the gate past its cap). While an inflight row is open, each pass goes back
into merge() for that PR first, which waits on the running gate at that tip (merge() already does
this for a head holding its own merge row: jobChecks' rowTip wait), before any plain row or other
job; plain rows wait (their callers keep renewing; their take_by counts from the take, so nothing
expires for the wait). A restarted train reads the open row and does the same.
- Cost: about 60 lines, 70 of tests (a 503 that still escapes, and a train restart mid-gate: in
  both, 505 waits and 290 lands on the same merged result).
- Fails when: the train is stopped for good mid-gate (nothing lands, as wanted; the row ends when
  the next train finds the gate ended); a merge from outside the train (no-lease `merge --plain`,
  BOB by hand, GitHub's UI) is not held by a train row. A small addition closes the first two:
  mergePlain and merge() into the tranche refuse while another PR's inflight row is open and its
  gate still running (about 10 lines; the refusal names the PR and the gate run).

Recommendation: 8A + 8B, with the small addition. 8A removes the cause seen (the 503 never ends the
wait); 8B makes "nothing lands under an in-flight gate" hold across any other failure and a
restart, which 8A alone cannot; the addition covers the tool's own merges outside the train.
GitHub's UI stays outside the tool, and merge()'s land check ("moved past the merged result the
gate checked") still catches it as today.

## 8. Ruling (coordinator, 5 Nov 13:27) and what was built (build/train-inflight)

Ruled: 8A + 8B + the addition, in a PR of its own after PR 156. Conditions, and how each is met:
- A hold never blocks past the gate's own cap: each `inflight` row carries `until` = now + max(90,
  suite_timeout_minutes) + 15 min (the queue allowance); a pass that finds an unended row past its
  until ends it ("its gate's cap passed"), whichever train wrote it; refuseUnderHold reads only
  holds within their until.
- The end row names its cause: landed; refused: <why> (a red gate among them); merged (elsewhere);
  pull request closed; head moved to <sha>; tranche moved; its gate's cap passed; or the merge's
  own failure when it leaves nothing to wait on (HOLD_ENDS).
- Re-entry never re-pushes: the train calls merge() with noPush; a head that already holds this
  PR's merge row on the current tip waits on its gate (jobChecks' rowTip wait), and anything that
  would push a new merged result fails instead ("would need a new one"), which ends the hold.
- A restarted train that finds an open hold on a tip the tranche has moved past ends it ("tranche
  moved") and does not wait.
Code: tool/lib/inflight.mjs (rows, open, start, end, refuseUnderHold), merge.mjs (TRANSIENT,
guarded reads in waitForGate and waitForChecks, onGate, noPush, refusals in merge and mergePlain
outside the train), train.mjs (hold, unhold, heldPass, the loop's hold-first pass).

Item 8 review round 1 (cold): fixed, each tested: a held gate ending red kept the hold to its cap
(now ended "gate <conclusion>"); a held PR made a draft or retargeted kept it (now ended
"withdrawn: made a draft" / "retargeted to <base>"); a restarted clone lacking the held tip ended
the hold as "tranche moved" and landed the next job (the tip is now fetched, and an unreadable tip
keeps the hold); the outside refusal let a merge through once the held gate was green but not yet
landed (now only a red or cancelled gate frees it); TRANSIENT gained "context deadline exceeded"
and "connection refused". Kept: the hold's until (105 min with the 90-minute cap) can end before a
late-starting gate's run does; that only frees merges outside the train (the train stays serial),
and the ruling bounds a hold by the gate's cap. Kept: the first return to a held PR is not backed
off (the loop's idle pause stands between passes; backing it off only delays the held gate).

Item 8 review round 2 (confirming): (a) to (e) confirmed fixed; both kept items judged acceptable.
Two low findings, fixed: a held PR that landed outside the train (no end row) kept merges outside
it refused until until (refuseUnderHold now reads the held PR: merged, closed or off its tip holds
nothing; tested); a held PR handed to BOB after its retries kept the hold (now ended "handed to BOB
after 5 tries: ...").
