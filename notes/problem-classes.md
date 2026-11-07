# Problem classes (coordinator's register)

Bob, 7 Nov ~00:10Z: "when you find these problems ... you not just fix that problem but also try to determine the cause of the problem and fix that so that the set of problem types tend toward zero."

Rule (coordinator's, from 7 Nov): every finding records its root cause; every fix brief names the class-level prevention, not only the instance fix. Reviewed at each hourly check; the goal is that no class recurs and the list stops growing.

| # | Class | Seen | Root cause | Class fix | Status |
|---|---|---|---|---|---|
| C1 | Committed generated file left stale | copy order.mjs 213 vs 220 (6 Nov) | the gate regenerated only when a module's files changed; a modules.json-only PR skipped it | regenerate on every non-job PR; stale = finding; layer merge refuses (process3 PR 209) | fix in review |
| C2 | Test passes locally, fails in CI | PR 205 pace.test (6 Nov) | tests relied on the machine's global git identity | builders test with GIT_CONFIG_GLOBAL=/dev/null; TODO: the test helper isolates git config itself so no test can depend on it | partial |
| C3 | Session told to run a command its own permission check refuses | job 697 `p3 github push` (6 Nov); then sticky "Auto-Mode Bypass" | instructions named a command not admitted by the session's settings/classifier | jobs push only through tool commands (R17c E); TODO: a check that every command a START/rulebook names is allowed by the repo's settings | partial |
| C4 | GitHub traffic outside the governor | coordinator's raw notes pushes; pre-R17b pushes; connector calls | rules without enforcement | PreToolUse hook + denies (R17c, PR 208); Bob applies settings; audit hourly | settings pending |
| C5 | State write lost to a race (refs/p3/unpushed) | pin 6, pin 7, job 697-2, BOB github push (6-7 Nov) | concurrent writers on process-state; losing writer parks instead of re-applying | builder ef7TXuV: losing writer re-applies; replay re-applies on current tip | in work |
| C6 | Work stranded by an account's suspension (hidden PRs) | all civicsmith PRs (6 Nov) | every PR and identity tied to one GitHub account | R16 account-switch readiness; reopen route documented | queued (R16) |
| C7 | Over-broad stop rule halting work on a transient error | 502 stop (6 Nov 23:50) | rule written for safety without cost check | stop only on limit/abuse/repeated 5xx; caution test: what does it protect, what does it cost | fixed (rule) |
| C8 | Shallow clone hides history a command needs | layer sync merge parents (6 Nov) | commands assumed full history in 50-deep cloud clones | read parents from the merge object (R17d); builder ef7TXuV: unshallow where history is read, narrowed per review | partial |
| C9 | Bookkeeping as dominant GitHub traffic | 86 share commits / 25 share-only pushes in an hour (7 Nov 00:50) | each session shared its usage by its own push | shares ride the command's own push; alone ≤ every 15 min (R17e, PR 211) | fix in review |
| C10 | Clone identity collision | copy clones read 8 pushes/h vs true 124 (7 Nov 00:50) | cloneId = hostname + path; every container is `vm` with the same path | random per-clone id; pushes counted from ledger-branch history (R17e, PR 211) | fix in review |
| C11 | Test-only provider change without layer clear | builder ef7TXuV item (6 Nov) | a test-only change to a provider module still demands the layer's full re-run | test-only change + `layer clear` (builder queue) | queued |
| C12 | Fetch volume far above content traffic | 429 fetches vs 37 content in an hour (7 Nov) | the ledger was fetched fresh before every call and push | one ledger read per clone per 30 s; ls-remote before fetch (R17e, PR 211) | fix in review |
| C13 | Tool reads of a landed PR GitHub hides | copy layer PR 735 gate: pulls/696 404 (7 Nov) | a landed PR's facts held only by the PR API | land row + gate-run artifact as the record (PR 212); other landed-PR readers follow | fix in review |
| C14 | Test reads the wall clock twice | rerun-more.test.mjs:339 on PR 211 (7 Nov) | a test compared two runs whose output embeds now() | injectable clock in tranche open (52a7563); TODO: lint for tests comparing outputs that embed now() | partial |
