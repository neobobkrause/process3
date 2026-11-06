# GitHub limit conformance (R17, 6 Nov)

The civicsmith account was suspended at 19:19Z on 6 Nov, most likely for automated bulk activity: GitHub's Acceptable Use Policies, section 4, and the API terms' "excessively frequent requests".

Bob, 6 Nov ~21:10Z: "If github publishes limits, then we should introduce process3 tooling that conforms to those limits. But rather than limiting usage to a small fraction of github's stated limits, I'd suggest that the tooling limit usage to 80% or 90% of github's published limits. That feels like the proper balance."

So the tool conforms to GitHub's published limits at a target share of each. Every setting is under `"pacing"` in process/config.json (Foundations P27).

## Measured on 6 Nov (the copy's state branch, one commit per push)

- 1,387 state-branch pushes from 00:00 to 19:19Z.
- The busiest hours were 00–03Z, at 143–173 pushes an hour, while the merge train ran. The train's lease writes alone made 143 pushes.
- In the layer flow, after the train was retired, the rate was about 70 an hour (17–18Z).
- The largest kinds of write: idle check 106, message delivered 98, starts owed 81, message to BOB 59, live job sessions 49.
- Not measured: the tool logged no gh calls, and the job branches' pushes could not be read once GitHub refused access. Both are logged now.

## GitHub's published limits, held as data

`pacing.github_limits`, read 6 Nov 2026 from https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api:

| Limit | Published | At the 85% target |
|---|---|---|
| Primary, per user token | 5,000 requests an hour | 4,250 |
| GITHUB_TOKEN in Actions, per repository | 1,000 requests an hour | (the workflows' own; shown, not metered) |
| Concurrent requests | 100 | (each session calls one at a time) |
| REST points (read 1, write 5) | 900 a minute | 765 |
| Content-creating requests | 80 a minute, 500 an hour | 68, 425 |
| CPU time | 90 s per 60 s | (GitHub's side; not measurable here) |

A config that restates a limit must name its source and the date it was read. `pacing.target` is 0.85 by default, and only 0.8 to 0.9 is accepted.

## How the tool conforms

- **One account-wide budget.**
  - The primary limit is GitHub's own count: the `rate_limit` endpoint, which GitHub says does not count against it, read at most once a minute per clone. It covers every session on the token.
  - The secondary windows (points a minute, content a minute, content an hour) are counted per call. Each session's use is shared on the state branch (`github/use/<session>.jsonl`), appended with the command's one push, or every `share_s` (300 s) while it calls GitHub. The other sessions' rows plus this clone's own log are the account's use.
  - Another session's use can be up to one command or 5 min late. The 10–20% margin covers it; the primary limit does not depend on it.
- **Each call reserves against the windows.** It waits when it would take a window past the target. A wait over 15 minutes is refused with the time to run again, never slept through. The per-clone spacing (`gh_interval_ms`, 1000) is only a floor against bursts.
- **GitHub's refusals are obeyed.**
  - On a rate-limit 403 or 429, the tool writes `github/pause.json` at once. Every session reads it before its next call (at most 30 s old) and waits out the pause, never retrying inside it.
  - The pause lasts until Retry-After, else x-ratelimit-reset, else, for the primary limit, rate_limit's reset, else one minute, as GitHub's docs say.
  - A second refusal within an hour stops the tool. Every call is then refused with "tell the coordinator", until the coordinator runs `p3 github resume --by <session>`.
- **Session caps are derived.**
  - There is no fixed job or lane cap: `pacing.jobs` and `pacing.lanes` are optional hard caps, off by default.
  - `job start` and `lane start` refuse a new session while GitHub is paused, the tool is stopped, the hour's content-creating requests are at target, or the primary limit is.
- **`p3 github budget`** shows the use against each published limit as a percentage, per window, with the pause and each session's calls.
- **Kept from the first pass:**
  - polls back off from 30 s to 5 min, never tighter;
  - state writes are coalesced into one push per command;
  - the job START says to push once per turn.

## Actions: proposals (not changed here; workflow files go through the merge tool under Bob's R1 limits)

1. **The copy's `process-gate.yml`** runs on `synchronize` for draft pull requests too, so every job push to a draft PR runs the gate. Proposal: add `if: github.event.pull_request.draft == false` to the gate's jobs. `ready_for_review` already starts the run that the merge tool reads; job complete marks the PR ready.
   - The job merge path already accepts only a `success` gate.
   - A plain merge leaves required checks to GitHub's ruleset, which counts a skipped job as passing. So before this lands, `merge --plain` must refuse a draft pull request, or read the gate's conclusion as the job path does.
   - No job is renamed and no permission is widened.
2. **process3's `ci.yml`** runs on `opened, synchronize, reopened, edited`. Proposal: drop `edited`, which re-runs the whole suite when only a title or body changes. Also add the same draft condition with `ready_for_review` in its types.
3. **process3's `record.yml`** runs on every push to every branch, the state branch included. Proposal: `branches-ignore: [process-state]`, since state rows are not product records.
4. **Branch cleanup** (the copy's `process-branch-prune.yml`) already runs once a day (`47 10 * * *`), not hourly; nothing to change. The hourly job is ROOT's sweep, which pushes one state commit per run now.

## The first pass's cold review, fixed

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
- **The test overrides could switch pacing off in a session.** Fixed: `P3_GH_INTERVAL_MS` and `P3_GITHUB_LOG` are read under the test runner only, and `gh_interval_ms` has a floor of 1000.

Left as they are:
- the burst stamp is not locked, so two processes in one clone can call gh in the same second (the account-wide windows still hold);
- the last config read sets the pacing in force;
- state-push retries still wait 2–16 s, which is bounded.

## The conformance revision's cold review, fixed

- **A burst of refusals across sessions would stop the tool.** Fixed: the stop is decided inside the state write, against the record as it stands. A refusal while a pause still runs lengthens that pause. Only a refusal after a pause has ended, within an hour of it, stops the tool.
- **A pause the state branch could not take was obeyed by nobody.** Fixed: the refused clone writes its own record first and obeys it.
- **Usage from long or unbatched commands was shared late or never.** Fixed: any gh call shares the clone's use once it is `share_s` old (never inside a state write), and a wait flushes the command's state writes first.
- **Waking from a wait reused the old reading.** Fixed: every check runs again after each wait, on a fresh read. After four waits the call is refused.
- **`--paginate` counted as one request.** Fixed: the further pages are logged from what came back (per_page, or `--slurp`'s page count).
- **`rate_limit` reads were uncounted, and repeated on failure.** Fixed: each read is logged, and a failed read is remembered for the minute.
- **The GraphQL budget was unchecked.** Fixed: gh's pr and issue commands and `api graphql` check GraphQL's own primary budget.
- **merge's transient retry loop treated the budget's own refusals as transient.** Fixed: they surface at once.
- **A gate run in Actions could pause the account.** Fixed: it uses the local store only, since its GITHUB_TOKEN has a limit of its own.
- **A refusal was read from stdout too.** Fixed: stderr only.

Open:
- Sessions working on process3 itself, and on process3-probes, have no product state branch, so they do not share use or see the account's pause. GitHub's own primary count still covers them, each clone obeys its own refusals, and their volume is small. Giving them the copy's store, or a state branch of their own, is the coordinator's choice: process3's record workflow runs on every push.
- Another session's use reaches this one up to 5 min late.
- The concurrent-request and CPU limits are not metered.
