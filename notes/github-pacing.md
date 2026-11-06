# GitHub pacing (R17, 6 Nov)

The civicsmith account was suspended at 19:19Z on 6 Nov. The likely cause is automated bulk activity: GitHub's Acceptable Use Policies, section 4, and the API terms' "excessively frequent requests". This change paces what the tool does on GitHub. Every limit is configurable under `"pacing"` in process/config.json.

## Measured on 6 Nov (the copy's state branch, one commit per push)

- 1,387 state-branch pushes from 00:00 to 19:19Z.
- The busiest hours were 00–03Z, at 143–173 pushes an hour, while the merge train ran. The train's lease writes alone made 143 pushes.
- In the layer flow, after the train was retired, the rate was about 70 an hour (17–18Z).
- The largest kinds of write: merger lease 143, starts owed 81, idle check 106, message delivered 98, message to BOB 59, live job sessions 49.
- Not measured: the tool logged no gh calls, and the job branches' pushes could not be read once GitHub refused access. `p3 github budget` now logs both.
- Sessions at once: 8 live jobs, 3 lanes, BOB, ROOT, the watcher and the coordinator. Each job pushed at least once a turn.

## What the tool now enforces

| Limit | Default | Where |
|---|---|---|
| Job sessions at once | `pacing.jobs` 4 (the job cap is the lower of this and P3_JOB_CAP) | `job start`, BOB's start list, the sweep; status's flow line shows `queued <n>` |
| Lane sessions at once | `pacing.lanes` 1 (a `--replace` adds none) | `lane start` refuses past it, naming the live lanes |
| gh calls | one per `pacing.gh_interval_ms` 2000 ms per clone (at most 1,800 an hour) | every gh call the tool makes waits its turn |
| Polls on GitHub | from `pacing.poll_first_s` 30 s, doubling to `pacing.poll_most_s` 300 s; never under 30 s | merge's gate, checks and mergeable waits; transient read retries (30 s to 5 min); layer publish's check of the layer branch during a run |
| State-branch pushes | one per command | writes are coalesced and pushed at the command's end, before any wait, and before publish's run |
| Job pushes | once per turn, at its end (JOB-9 in the job START) | the tool's own pushes were already one per complete or publish round |
| Budget | `p3 github budget [--hours 1]` | gh calls, pushes and Actions dispatches per session, from this clone's log (`<git dir>/p3-github.jsonl`) |

With 4 jobs and 1 lane, the state pushes fall to about one per command run, and job pushes to one per session turn.

Raise the caps only once the budget shows room. Moving the copy's 8 live jobs and 3 lanes under the new caps happens by attrition: nothing running is stopped. Starts are refused until the counts fall below 4 jobs and 1 lane, or the copy's config raises them.

## Actions: proposals (not changed here; workflow files go through the merge tool under Bob's R1 limits)

1. **The copy's `process-gate.yml`** runs on `synchronize` for draft pull requests too, so every job push to a draft PR runs the gate. Proposal: add `if: github.event.pull_request.draft == false` to the gate's jobs. `ready_for_review` already starts the run that the merge tool reads; job complete marks the PR ready.
   - The job merge path already accepts only a `success` gate.
   - A plain merge leaves required checks to GitHub's ruleset, which counts a skipped job as passing. So before this lands, `merge --plain` must refuse a draft pull request, or read the gate's conclusion as the job path does.
   - No job is renamed and no permission is widened.
2. **process3's `ci.yml`** runs on `opened, synchronize, reopened, edited`. Proposal: drop `edited`, which re-runs the whole suite when only a title or body changes. Also add the same draft condition with `ready_for_review` in its types.
3. **process3's `record.yml`** runs on every push to every branch, the state branch included. Proposal: `branches-ignore: [process-state]`, since state rows are not product records.
4. **Branch cleanup** (the copy's `process-branch-prune.yml`) already runs once a day (`47 10 * * *`), not hourly; nothing to change. The hourly job is ROOT's sweep, which pushes one state commit per run now.

## Cold review (one pass), fixed

- **Concurrent p3 processes in one clone could drop each other's coalesced writes.** Fixed: the flush always reads origin's tip under the state lock and makes every pending change again on it; a later write does the same when the clone's ref moved.
- **A killed command lost its unflushed writes.** Fixed:
  - each pending write is kept at once under `refs/p3/pending/<pid>/`;
  - SIGTERM, SIGHUP and SIGINT flush before exiting;
  - the next command in the clone moves a dead process's kept writes to `refs/p3/unpushed/` and names `state replay`;
  - `state replay` pushes each write before dropping its kept ref.
- **A refused flush could keep other writers' commits for replay.** Fixed: it keeps only its own pending refs.
- **Commands that hand out a session acted on a write before it was pushed.** Fixed: `job start`, `lane start`, `start`, `handover` and `state replay` push at once.
- **`layer publish` still polled every 30 s or faster.** Fixed: unset, it backs off; `--every` takes 30 s or more.
- **The lane cap could be passed by two starts at once.** Fixed: it is checked again inside the write.
- **The pacing test overrides could switch pacing off in a session.** Fixed: `P3_GH_INTERVAL_MS` and `P3_GITHUB_LOG` are read under the test runner only, and `gh_interval_ms` has a floor of 1000.

Left as they are:
- the gh stamp is not locked, so two processes in one clone can call gh in the same second;
- the last config read sets the pacing in force;
- state-push retries still wait 2–16 s, which is bounded.
