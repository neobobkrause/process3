# Plain merges beside the merge train: options (build/train-plain, 5 Nov)

## The problem (copy, 5 Nov 08:00-08:34)

The train (tool/lib/train.mjs) is the one steady writer to the tranche: it lands job pull requests
one after another, each re-gated on the job merged with the tranche as it is. Every other pull
request into the tranche (BOB's plain ones: found marks, ledger entries, an untracked generated
file; and pin moves, `merge --plain --as pin`) goes through `merge <pr> --plain` from another
session (merge.mjs mergePlain). Such a merge needs its required checks green on a head that has
the current tranche. The train moves the tranche every few minutes (green to merged median 8.7
min in the simulation, 11 in the merge rows), so a plain head brought up to date goes stale
again before its own gate ends, and the plain merge fails: PR 338 twice; the ledger PR 465 held
7 job starts behind it. Nothing pauses the train; this morning the coordinator stopped it by hand
for a 15-minute window.

notes/merge-train-trial.md, named in the brief, is not on the tranche or any branch fetched here;
the train's own header and notes/train-throughput-study.md's order were read instead, with
train.mjs, merge.mjs (merge, mergePlain, mergeRetry, waitForChecks), order.mjs and
tool/test/train*.test.mjs, merge*.test.mjs.

Measures used below: P, a plain pull request's gate on an up-to-date head; J, a job's re-gate (the
train's land interval while it has a queue). A plain change touches records only, so its gate
often runs no suite (trigger record-since-green), but a ledger entry or a pin move runs one: P can
be as long as J.

## A. The train takes plain pull requests and pin moves into its queue, ahead of jobs

How it works. `merge <pr> --plain ...` into the tranche, while a live train lease is held, does not
merge: it checks what it can check now (the plain rules: not a job branch, mergeable, the module
files, the pin, the workflows) and records a queue row on the state branch (`merge train plain`):
the pull request, its head, the review flags as given (BOB's, as a review note is), and `--as`.
The train reads the rows each round. A queued plain pull request goes before every job (the oldest
row first). The train brings the tranche into it (a merge commit pushed to its branch, only when
the merge is clean; a conflict goes to BOB), waits for the required checks on that head, and
lands it through mergePlain itself, its checks all run again on the merged head, with the review
record from the row in the merge commit's message, and the pin wake for `--as pin` from mergePlain
as now. The row's head must be the head's first parent chain down through the train's own clean
merges of tranche commits, so the change reviewed is the change landed. One train row per try, as
for jobs.

Throughput. The train lands nothing while the plain gate runs: one P per plain pull request, the
same as any job in front of it. It keeps preparing the next job while the plain gate runs (the
prepare step is unchanged), so the next job lands within seconds after. No idle wait for a second
session, no 15-minute window, no retries.

Gate strength. Unchanged: mergePlain runs every check it runs today, on the head that lands, and
GitHub's ruleset still judges the required checks. New: the train pushes a merge of the tranche
onto a non-job branch (it does so on job branches today). The review covers the queued head; the
first-parent check holds that nothing but clean tranche merges were added on top.

Code. About 150 lines in train.mjs and merge.mjs (the queue row, its read and order, the sync and
its first-parent check, the land through mergePlain) and 120 of tests.

## B. A short train yield: `merge train yield --minutes <n> --for <pr>`

How it works. The plain merge's session writes a yield row (bounded, at most 30 min; ends at once
when that pull request is merged or closed). The train, before it starts each merge, reads the
rows; under a live yield it starts nothing new and writes an ack row once its merge in flight has
landed or failed. The plain session waits for the ack, brings its pull request up to date, waits
for its gate and runs `merge --plain` as today.

Throughput. The train is idle for the in-flight land's wait plus one P, and the time the plain
session takes to see the ack, sync and start (that session may be mid-turn: minutes more). A yield
that lapses before the plain gate ends leaves the same race as today.

Gate strength. Unchanged: mergePlain itself is not touched.

Code. About 70 lines (the yield and ack rows, the train's check, the wait in the plain session)
and 80 of tests. Two sessions must take turns through the state branch: each step can be missed.

## C. Plain merges retry against the moving tip (no train change)

How it works. mergePlain, when GitHub refuses because the head is behind the tranche, updates the
branch (the tranche merged in), waits for the required checks again and retries, up to a bound.

Throughput. No cost to the train. But each try loses whenever the train lands during P: with the
train landing every J and P near J (ledger entries, pins), most tries fail; the job queue is longest
exactly when plain pull requests are most needed (465 held 7 starts). It does not end the race; it
repeats it.

Gate strength. Unchanged, as long as every retry re-checks (mergePlain does).

Code. About 40 lines and 50 of tests; it spends a gate run per try.

## Recommendation: A

A is the only option that ends the race instead of shortening the odds: one writer to the tranche,
with plain pull requests in its queue, first. It costs the train what B costs (one plain gate) but
needs no hand-off between sessions, and the train keeps preparing the next job meanwhile. Gate
strength is the same as today, because the land still goes through mergePlain on the head that
lands. B is smaller but adds a two-session handshake that can lapse; C is smallest but loses most
when it matters most.

Without a live train lease, `merge --plain` merges as today, so nothing changes when no train runs.

## Chosen and built: A (coordinator, 5 Nov 08:36)

The coordinator chose A (Bob's option F, serial per-PR merges by the MERGER, applied to plain pull
requests), with two conditions, both built and tested (tool/test/train-plain.test.mjs):

1. Callers keep today's contract. `merge <pr> --plain ...` into the tranche under a live lease
   (train.mjs plainViaTrain) checks the review flags, queues a row (merger/plain.jsonl) and waits up
   to --minutes for the train's row: it prints the same `merged pull request <n> at <sha>` line, the
   same pin wake (`next act: wake BOB ...`), and exits 0; a refusal throws with the train's reason
   (exit 1, as a mergePlain refusal). Past --minutes it withdraws the row (the train checks again
   just before the land and never lands a withdrawn one) and fails; a train that stops while it
   waits hands the merge back: the row is withdrawn and mergePlain runs here, as before.
2. Never starved: the train takes every queued plain pull request before any job, oldest first,
   whatever the job order says (release path, aged); one in backoff (GitHub slow, a moved base:
   1, 2, 4, 8 min, the fifth try to BOB) lets jobs go meanwhile.

The caller checks only the review flags before queueing; every other plain rule is mergePlain's,
run by the train on the head that lands, so a refusal comes back as the train's row. The train's
rows for plain merges are `row: 'plain'` in metrics/train.jsonl (the trial's merge measures are
unchanged). mergePlain gained `head` (refuses any other head) and `beforeLand` (the lease and the
withdrawal, checked before each GitHub merge call), and returns the pin wake's `what`.
