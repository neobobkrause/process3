# Builder handoff (session_018Bhcef1pxNYJCcaejqj138), 7 Nov ~05:50Z

Development is shutting down on this account (Bob, 7 Nov, relayed by the coordinator session_018Bhcefb8RbwzBi1TvvFVgT). This file lists every item this builder held: its branch, head, state and next step. All work is pushed: nothing lives only in this session's container.

| Item | Branch | Head | State | Next step |
| --- | --- | --- | --- | --- |
| R17g: no brake on a number GitHub does not publish (PD-6, PR 231 branch p3/pd-5) | build/github-no-overcaution | this commit (from tranche 372438c2) | **not started**: only this handoff | Do it as the coordinator's 05:27Z brief says (below) |
| C18: read commands make no push of their own; per-clone caches | build/read-no-push | 08105d31 | built; full suite 1112/1112; cold review was running at shutdown (findings not read); no PR | Read a fresh cold review of 08105d31, fix what is real, merge the tranche, suite, push, open the PR |
| C16: census flags modules with no ledger entry | build/census-entries | ae30b5aa | pushed; suite 1110/1110; reviewed; PR not confirmed opened | Check for its PR; open it if none |
| C15: sweep names sessions waiting on a permission prompt | build/sweep-permission | 0be0b850 | pushed; suite 1060/1060; reviewed; tranche moved since (merge before landing) | Check its PR; merge the tranche in |
| Item 5 (PR 227), C12 part 2 (PR 224), leftovers (PR 211/213/…) | — | — | merged | — |

## R17g brief (coordinator, 05:27Z, Bob: "make sure that this baseless overcaution NEVER happens")

A brake acts only on (a) a limit GitHub publishes (GITHUB_LIMITS at pacing.target) or (b) a refusal GitHub actually returns (secondary rate limit, 403/429 with retry-after, abuse). Everything else is counted and reported, never waited on or refused.

1. reserve() (tool/lib/pace.mjs): drop the pushes window; pushes are logged and shared, never waited on. Remove pushes_per_hour from PACING_DEFAULTS and pacingProblem (accept and ignore it in old configs: the copy and probes set 1000000). github budget prints the push count with "GitHub publishes no limit".
2. budgetGate(): remove the push refusal of new sessions.
3. Audit every brake and wait in tool/lib and the commands (pace, ghshare, ghhook, util, gates, sweep, start/job/lane/layer), every role's START and the shims: anything that holds, defers, spaces or refuses on a non-published number, or tells a session to hold by hand. Cite the published basis or remove it. gh_interval_ms must space only mutative calls (GitHub's 1-s guidance), never reads (today reserve() applies it to every call, the hook's read path excepted). "stopped" must trip only on GitHub rate-limit or abuse refusals (pace.mjs limitSignal / ghAfter), never on 5xx or the session proxy's 403s.
4. Tests: 500 pushes in an hour pass with no wait; budgetGate admits a start at any push count; the real GitHub-limit brakes still hold.
5. PR body: a table of each brake, its basis, and the action taken.

## C18 plan (as sent to the coordinator)

Measured on BOB's command mix in a copy clone with pushes disabled: status --role bob made 360 GitHub requests in 398 s (261 issues/<n>/comments, one per PR merged since the tranche opened, re-read every call by base-red ages and the suite budget; about 60 compares); layer jobs 10 made 1 API call and 12 fetches in 76 s. BOB's 26 state pushes in 03:50–04:55Z: 10 were bookkeeping alone (4 idle-check rows, 4 starts owed after a merge had flushed, 2 paid after an unbatched job start).

1. Merged PRs' comments kept per clone for hours (their gate rows do not change), open ones 30 s.
2. Bookkeeping writes (idle-check rows, starts owed, paid, usage shares) never push alone: they ride the command's real write, else wait in the clone (git dir p3-deferred-<sb>.jsonl) and ride the next real write; the clone's status reads them meanwhile (readStateWith).
3. Read-path branch fetches get the 30-s cross-process window (fetchBranch within).

Result on 08105d31 (same clone): status --role bob warm 21 requests (from 357), 144 s (from 399), no push attempted.

Open questions for C18's reviewer: a clone that never makes a real state write never delivers its waiting records (job sessions write rows, so likely fine); readStateWith runs a temp worktree per read when records wait.

## What an account switch mid-push would lose

Nothing of this builder's: every branch above is on origin. Clone-local only, by design: the GitHub caches (p3-gh-cache/), the read stamps, and in a clone running C18, waiting bookkeeping records (p3-deferred-*). Those records (idle-check rows, starts owed, usage shares) would be lost with the container. They are bookkeeping, not work.

## C18 cold review of 08105d31 (arrived after the handoff): do not merge until fixed

Six real bugs, three risks. Its tests pass (46/46), but none covers a refused flush or two processes at once.

1. **A record pushed twice when a write is kept for replay** (state.mjs `writeStateNow`, park path): `books()` puts the waiting records in the kept commit, and `fail()` runs before `dropDeferred`, so they stay in the file too; replay and the next real write both push them (shares counted double; owed listed twice; the share never settled).
2. **Two processes push the same waiting record** (`flushState`): `waiting` is read before `withStateLock`.
3. **A waiting record lost** (`flushState`): `dropDeferred` runs outside the lock; a concurrent append is overwritten. Fix 2 and 3 together: read `waiting` and drop it under the lock that pushes.
4. **Batched `bookkeep` moves the state ref without the lock** (calls `writeStateLocal` directly; `writeState` wraps it in `withStateLock`).
5. **Idle-check alarms from every session** (sweep.mjs `idleCheck`): the LOST dedup across sessions is gone, so each clone can raise IDLE CAPACITY and message the coordinator every 5 min. Needs a cross-session dedup (e.g. print only when no fresh row on the branch and none waiting locally, plus a cheap shared marker), or keep the check row a real write.
6. **Usage shares stop reaching other clones** (ghshare.mjs `shareUsage`): a mostly-reading clone never shares, so the account budget undercounts. Keep the share-alone rule (a push at most every 15 min, only with content or non-state pushes) instead of deferring it.

Risks: (7) the bookkeeping-only flush restores `entry.base`, which can be older than a later fresh fetch; (8) status's job "ahead" count can be 5 min stale (cache keyed by branch name); (9) the waiting file shrinks only on a real write, and `readStateWith` re-applies it on each read.

Checked fine: fetchBranch return shapes; a refused batched flush keeps records only in the file; JSON-line removal; late check rows skipped; readOpenLayer non-fresh is used only by sweep and the idle check; the comment cache key holds the slug.
