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
