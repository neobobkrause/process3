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
  - There is no job or lane cap of GitHub pacing: `pacing.jobs` and `pacing.lanes` are retired (PD-6, 7 Nov), accepted and ignored.
  - `job start` and `lane start` refuse a new session while GitHub is paused, the tool is stopped, the hour's content-creating requests are at target, or the primary limit is.
- **`p3 github budget`** shows the use against each published limit as a percentage, per window, with the pause and each session's calls.
- **Kept from the first pass:**
  - polls wait a fixed 30 s (PD-6, 7 Nov: the back-off to 5 min is retired);
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

## R17b: the whole account in the ledger (coordinator's rulings, 6 Nov)

- **Sessions' own writes are counted.**
  - `p3 github push <remote> <refspec>` is the only way a session pushes: it waits its turn and is logged and shared. It refuses a force or a delete.
  - Before each GitHub-connector write (a PR created, edited or marked ready, a comment, a review), the session runs `p3 github note --content <n>`, which reserves n content-creating requests at 5 points each and waits or refuses like a gh call.
  - Connector reads stay on GitHub's primary count, which sees them.
  - Where it is said: the lane START (push and note), the job START and rulebook (push only: a job's pull request writes are the tool's own gh calls), BOB's, ROOT's, the watcher's and the review worker's rulebooks, the pin-move and tranche steps, `found`'s steps, and job sync's hint.
  - ROOT's and BOB's STARTs are at their one-screen cap, so for those roles the line is in the rulebook each reads at start. ROOT and the watcher push nothing by hand: their acts are tool commands, which the tool paces.
- **One ledger per account.** It is the product's state branch (neobobkrause/civicsmith-copy process-state, `github/`). A clone finds it in its config's `pacing.ledger`, else in the pinned process3's `pacing.json`, else in its own `pacing.json`. So process3's clones and every product (process3-probes among them) share it once their pin holds this change, and before that the probe keeps its own. The ledger is read fresh before every content-creating call and every push.
- **Retired by PD-6 (7 Nov): the push ceiling below is no longer a brake.** Pushes are counted and shown in `github budget`; only GitHub's published limits and its own refusals brake (pace.mjs).
- **The push ceiling, PD-3 in DECISIONS.md.**
  - `pacing.pushes_per_hour` is 120, account-wide, applied like a window. It covers every push the tool makes (gated in `git()`) and `p3 github push`.
  - State-branch pushes are held like any push (coordinator's ruling on PR 206: they were most of 6 Nov's volume). Only the ledger's pause, stop and resume writes pass while the account is paused, stopped or at the ceiling. A command whose state push would wait past 15 min keeps its writes under `refs/p3/unpushed/` for `state replay`, and says so. The usage share is gated but never waits.
  - `github budget` shows the hour's pushes against the ceiling, and `job start` and `lane start` wait while it is full.

### R17b's cold review, fixed

- **`github push` could force or delete through the clone's git config.** A bare remote pushes what `remote.<r>.mirror` or `remote.<r>.push` say. Fixed: an explicit refspec is required; no wildcard, no empty destination, never main; a remote with either setting is refused; the flags take no value.
- **The pin-move and tranche steps still said `git push` and made connector writes with no note.** Fixed: they use `github push` and `github note`.
- **The share's own push was never shared.** Fixed: the mark is the last row shared, taken before the write.
- **process3-probes kept a ledger of its own.** Fixed: the pinned process3's `pacing.json` names the account's ledger.
- **A session's use from its other clone was skipped.** Fixed: shared rows carry their clone, and only this clone's own are skipped.
- **The remote ledger retried any refusal at once.** Fixed: only a moved tip is retried, after 2, 4 and 8 s; any other refusal fails at once.

Left as they are:
- a gated push made while the state lock is held can wait inside it, up to 15 min;
- every gated push reads the ledger fresh;
- sessions with no session id share one use file (conservative).

## Risk: GitHub hides every pull request the suspended civicsmith account opened (R17c, item H)

BOB is reopening job pull requests on the same head branches. The tool code below reads an old pull request by number, or through its comments. Each place can now find nothing, or the wrong one:

- `tool/lib/job.mjs:369-373` (job start --reopen, an abandoned attempt): `prsFromBranch(state=all)` finds the branch's last merged PR and the closed one after it. With civicsmith's PRs hidden, no earlier merge is seen, so an attempt whose merge was hidden can be named "abandoned" and given a fresh branch it does not need.
- `tool/lib/job.mjs:578` (job start --take-in #N): `getPR(N)` of a hidden PR fails as "not open". Take in by branch name instead.
- `tool/lib/layerflow.mjs:800-810` (layer retest): the last receipt is read from the newest merged PR from the branch, through its comments. A receipt posted on a hidden PR is gone, and the retest refuses ("no receipt ... a job re-tests it").
- `tool/lib/merge.mjs` and `tool/lib/gate.mjs:92` (a job merge, the gate): the receipt and gate blocks are read from the open PR's comments. A reopened PR on the same head has none until the job runs `job complete` again, which posts the receipt on the new PR. The gate then reads it.
- `tool/lib/lead.mjs:281` (lead times): gate runs are read from the comments of the PR named in the COMPLETE row. On a hidden PR they read as unmeasured.
- `tool/lib/carry.mjs:16-28` (take-in carry): the files of `take_in.pr` from the job rows. A hidden PR gives none, so the carry check sees no files.
- `tool/lib/branches.mjs:84` (branch prune): `pulls?state=all` decides "open-pr" and "train-head-closed". Hidden PRs are simply absent, so a branch whose only PR is hidden is judged by its commits alone (it is kept if ahead or recent).
- `tool/lib/measures.mjs:53-68` (survival): it uses the state rows' PR numbers and merge commits, not GitHub, so it is unaffected.

## R17c: enforced, not by rule (coordinator's items A to H, 6 Nov)

- **A. `p3 github hook`** is a PreToolUse hook. It counts every GitHub-connector call in the ledger: a read costs 1 point, a write is one content-creating request at 5 points, and a write that moves a ref is also a push. It waits or refuses exactly like a gh call, and exits 2 to block. It refuses a raw `git push`, any `gh`, and curl or wget to github.com. The ledger read is cached on disk for 30 s across the clone's processes, so a connector read fetches nothing. The settings that call it are Bob's, in notes/r17c-settings.md.
- **B.** git fetch, clone and ls-remote are counted (kind fetch) and shown in `github budget`. There is no ceiling.
- **D.** `github audit` shows the hook's connector count beside GitHub's primary count.
- **E.** Jobs push only through `job sync`, `layer publish` and `job complete`, as the job START, acts and rulebook say. `p3 github push` stays for BOB, lanes, builders and the coordinator.
- **F. Recovery after a refusal.**
  - Every refusal names the limit, when it frees and the exact command to rerun (`rerunLine`), and says the work before it stands.
  - A refused push reaches a caller that handles failures as a failed push, so the caller names its own rerun (job sync: "run job sync again").
  - `status` and ROOT's sweep print state writes held in `refs/p3/unpushed/` as an act: `state replay`.
  - Rerun-safety is proven by tests that inject a refusal at each GitHub step in turn, then rerun:
    - `merge` of a job (every gh step, and the merge-row push): one merge, one merge row;
    - `job sync`: the push on the rerun, the merge kept;
    - `job complete` (every gh step, and its push): one receipt for the head, ready.
  - Not yet covered by such tests: `merge --plain` (it shares the merge core), `layer publish`, `layer sync`, and the pin-move and tranche steps. Those are printed steps a session runs one at a time; each step's rerun is the step itself.
- **G.** Job sync pushes the branch itself through the governed git (a fast-forward only, rerun-safe). No printed `git push` instruction remains in the tool.

## R17e: one count for every clone; bookkeeping never the dominant traffic (C9, C10; 7 Nov)

**C10, why clones disagreed.** `cloneId` was `${hostname()}:${git common dir}`. Every cloud container
is hostname `vm` with the same paths, so every session's copy clone had one id, and `usage` skipped
the ledger rows carrying its own id ("they are in my log"). Each copy clone so dropped every other
copy-clone session's use. Measured 00:50Z on one ledger tip: process3 clone 124 pushes/h, copy clone
8. The governor in copy clones saw about its own pushes only: the ceiling overshot (C9's 128/120).

**Fix.**
- `usage` counts every ledger row, and from this clone's log only the rows no share in the read
  carried (the clone's share history, `p3-gh-shared-to`: `{ last, at }` per share; a share riding
  a coalesced push records its time when that push is made). No exclusion by name.
- `cloneId` gains a random id kept in the git directory (labels only).
- Pushes of the ledger branch are counted from its history: each push stamps its last commit
  `P3-Push: <session>` (state.mjs flush and writes through `pushRetry`; the remote ledger's writes).
  Unmarked commits made within 10 s before a marked one are its push's; other unmarked commits
  (before the mark, or a pin without it) count one push per second of commit time. The rows' own
  count of those pushes is not used; this clone's own since the read come from its log.
- After the fix, both clones at 01:2xZ: 184 pushes/h (103 process-state, from history), 40
  content/h, equal. Calls/h differ by each clone's unshared rows (shown, not gated).

**C9, shares.** Last hour before the fix (ledger history): 170 process-state commits, 86 of them
usage shares; about 99 pushes (distinct commit seconds), 25 of them share-only (a push that carried
nothing but a share; 9 sessions, at most 6 each). Now:
- a share rides the command's own state push (at its end; at most once a minute during it, a commit,
  no push);
- alone, at most every 15 min (`SHARE_ALONE_S`, or `pacing.share_s` if longer; its default now 900),
  and only when it holds what others must count: a content-creating call, or a push other than a
  state branch's (those are counted from the branch itself);
- bound: 12 to 4 share-only pushes an hour per session; read-only sessions (watchers' polls) none.

**Class-level prevention.** The process's own bookkeeping (usage shares, ledger records) never makes
a push of its own when a push is coming anyway, and a count that can be read from GitHub-side
history (a branch's commits) is read there, not reconstructed from shares.
