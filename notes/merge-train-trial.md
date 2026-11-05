# Merge train trial (Bob's design and word, 5 Nov ~02:20 UTC; design revised 02:35 after the design study)

Bob, 5 Nov: "Yes, begin the trial of the merge train when we're ready. But be sure to measure so that we understand the tradeoffs and balance being struck." Replaces the self-merge trial (notes/self-merge-trial.md): jobs do not merge their own PRs; one actor runs the train.

## Design (revised 02:35)
GitHub's merge queue is not offered on these user-owned repos (Bob checked the ruleset editor, 02:33). The design study found most of the gain is removing pickup (sim: automatic one-at-a-time 7.0/20.5 vs actual 8.7/33.7 median/p90 min; batches 5.2/13.5) and that batch gates would be weaker than today's per-PR job re-gate. So the trial runs: automatic serial per-PR merges on green, next PR prepared during the current gate, in a dedicated MERGER session; batching stays off and is reconsidered with Bob when measured queue depth at merge time stays at 3 or more. The original batch design follows for reference.

### Original batch design (not built)
- No per-PR merge queue. While batch N's gate runs, batch N+1 is assembled from every job PR that is green on its own receipt, ready, and compatible: merges cleanly with the tranche and with the batch's other members (git merge-tree), review-triggered PRs only after their review passed.
- One gate per batch, on the tranche plus all members. Each member is still its own merge commit in order, with its own merge row, cost row and receipt check, so records and reverts stay per PR.
- On failure: bisect (halves, gated), merge the passing part, send the culprit back to its job with the failing run.
- The next batch is formed when the current one's gate is near its end (median duration known; the tool polls every 15 s), then the train continues. Batches size themselves: small when greens trickle in, large in bursts or behind long gates.
- Run by its own session, a MERGER role (not BOB), so merges never wait behind BOB's other work and BOB's handovers never stop the train; ROOT starts and replaces it as it does BOB. BOB handles only what the merger hands it. Non-job PRs (pin moves, config, ledger, found) join the train as members.

## Measures (baseline: 4-5 Nov, measured 01:50 and by measure/merge-train-sim)
- green -> merged per PR: median, worst (baseline median 11.0 min, worst 85)
- PR-minutes waiting after green; idle job sessions waiting on merge (01:54: 11 of 19)
- gate runs and gate-minutes per merged PR; cancelled runs per PR
- batch size distribution; batches failed; bisection gates; culprits and how often a good PR was delayed by a bad one (minutes)
- conflicts caught at batch time vs after merge; reverts; post-merge defects (survival read)
- velocity, efficiency, quality as the velocity audit defines them, before vs during
- state-branch push tries per write (batch merges add rows at once)

## Stop rules
- more than one merged PR needing a revert, or a post-merge defect the per-PR path would have caught
- any state-branch push hitting its try limit
- median green -> merged worse than the baseline over 3 hours

## Decision after one day on the copy
Keep, adjust or drop, reported to Bob with the figures and the balance struck.
