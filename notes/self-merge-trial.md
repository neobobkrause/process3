# Self-merge trial (queued 4 Nov, Bob's word)

Bob, 4 Nov ~20:10 UTC: "queue the trial for after the first dev release".
Start condition: the copy's first dev release is cut (`release dev` run on the tranche green) and its from-scratch install and upgrade test are done. Not before; it must not disturb the release path.

## Change under trial (copy only, one day)
- Untriggered job PR (no review trigger fires): the job runs the merge tool on its own PR once its gate is green. No BOB.
- Triggered PR: the merge tool asks a fresh reviewer session; PASS lets the tool merge; CONCERNS go to BOB.
- BOB keeps: exceptions, red gates a job cannot fix, notices needing judgement, deploy, walk, close, release.
- BOB gets a short merge digest, not a wake per merge.

## Before it starts (process3 build)
1. State-branch contention: pushes already need 3-4 of 5 tries; fix or measure first (parallel merges add rows).
2. Job cost back-fill: BOB records `--job-cost-usd` at merge today; the sweep must fill it after the job's turn ends.
3. Self-merge path and fresh-reviewer launch: estimate 50-150 non-test lines; offset from the trust-review simplifications; trust review reads the new path (a possibly hostile job calls merge on its own PR) before it goes live.
4. Test runs the live case end to end on the copy.

## Measures (baseline from the day before the trial)
- green-to-merge median and worst (baseline 10.5 min median)
- BOB context burn per hour and handovers per day
- state-branch push tries per write
- reverts and post-merge defects (survival read)
- job cost coverage (share of jobs with a cost row)

## Stop rules
- more than one merged PR needing a revert or a found defect a glance would have caught
- any state-branch push hitting the 5-try limit

## Decision after the day
Keep, adjust or drop, reported to Bob with the figures.
