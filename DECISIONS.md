# Process3 decision records

Process technical decisions are the coordinator's; each is written here as a short decision record (REC-11) and reported to Bob in one line (AUD-5, kept by Bob 6 Nov). A product's decisions are BOB's and go in that product's own DECISIONS.md. Bob's own rulings are not recorded here: they live in the line they refine (REQ-7).

Each record, newest last, rewritten in place when superseded, never appended to:

```
## PD-<n>: <title> (coordinator, <date>)
Context: the measured failure or Bob's dated words it answers.
Decision: what was chosen, and the options weighed.
Consequences: what it costs, what it removes, and the Ledger line it restates, if any.
```

## PD-1: Roles, layer branch and technical authority in the Foundations (coordinator, 6 Nov)
Context: applying Bob's 6 Nov Keep and Drop answers (SLB-8 "BOB starts jobs and lanes, not ROOT"; SLB-11; AUD-5) to the Foundations, the Ledger map and the Ledger doc left three conflicts (coordinator's log, 6 Nov 01:0x).
Decision: (1) ROOT runs at depth 0 from Bob's app and starts BOB, the watcher and the coordinator; BOB starts jobs and lanes; PLT-5's "whoever starts ROOT starts the watcher" is read as ROOT starting it. (2) Under the layer branch no MERGER runs; its code goes if the trial keeps the branch (SLB-11); layer 6 still runs on the train. (3) AUD-5 replaces "BOB decides everything technical": BOB decides the product's technical matters, the coordinator the process's.
Consequences: restates PLT-5, the roles table and P17; the MERGER's removal waits on the layer-branch trial's result. The Build Plan was not readable on this account, so its rows were not checked.

## PD-2: The watcher's takeover is a bridge (coordinator, 6 Nov)
Context: the Foundations' heartbeat paragraph ("watcher started beside ROOT rather than by it") conflicted with ROOT now starting the watcher (PD-1; coordinator's log, 6 Nov 01:1x).
Decision: the watcher takes over as ROOT only when `watch` says so (watcher.md principle 1); that is a standby taking the role and starts no new session. A takeover moves ROOT one level down, so it is a bridge: Bob restarts ROOT from his app at depth 0 at his next opportunity, and the new ROOT starts a fresh watcher.
Consequences: the heartbeat paragraph is rewritten; SES-1's "nothing creates its own successor" holds; depth grows by one only until Bob's restart.

## PD-3: An account-wide push ceiling of the process's own (coordinator, 6 Nov)
Context: the civicsmith account was suspended on 6 Nov at 19:19Z, most likely for automated bulk activity. GitHub publishes no limit on git pushes, and push volume is the likely cause: the copy's state branch alone took 1,387 pushes in 19 hours, 173 in the busiest hour, about 70 an hour in the layer flow. Bob's P27 (6 Nov) holds the tool to 80–90% of GitHub's published limits; pushes have none to hold to.
Decision: a ceiling of the process's own, `pacing.pushes_per_hour`, default 120. That is 85% of a 140-an-hour own limit, about twice the layer flow's measured rate. It is counted account-wide in the GitHub ledger and applied like a window: a push waits for room, and a refusal says why. Every push goes through the tool: its own, state-branch pushes included (they were most of 6 Nov's volume), and sessions' through `p3 github push`. Only the ledger's own pause, stop and resume writes pass while the account is paused, stopped or at the ceiling. A command whose state push would wait past 15 minutes keeps its writes under `refs/p3/unpushed/` and names `state replay`; it never drops them. The usage share is gated but never waits: it is tried again later. Options weighed: no ceiling (GitHub sets none, but the suspension came anyway); a fixed per-session spacing (does not add up across sessions).
Consequences: the layer flow can be throttled at busy hours, and `p3 github budget` shows how near. The ceiling is revisited from the budget's data. It restates no Ledger line; it serves P27.

## PD-4: A module missing from the layer map is flagged, not a stop (coordinator, 7 Nov)
Context: R16's census found COMPLETE modules missing from the copy's build/layers.md; its first form refused `layer open` for any layer holding one, which would stop the copy's layers 2, 4 and 11 until the map is fixed (builder ef1pxNY's cold review, 7 Nov).
Decision: the gap is a finding the census and `layer open` print, naming the modules; it stops nothing. Options weighed: refuse (protects against a module silently left out of a layer's order, but a COMPLETE module has no job to order, and the stop costs a layer's start on a map edit); flag (the map is fixed by the product's own PR, BOB's).
Consequences: layer 11 can open on time; BOB fixes build/layers.md from the finding. Serves Bob's 7 Nov words that too much caution destroys productivity.

## PD-5: The governor is the only push brake; no hand-held windows (coordinator, 7 Nov)
Context: at 04:51Z the account read 121/120 pushes, and BOB deferred `layer merge 10` and the found-mark PRs 756/757 by hand for ~20 min. At 05:17Z the readings were pushes 89/120 (74%), primary 6%, content 6%, no pause. Bob asked whether this was velocity lost to baseless caution (7 Nov).
Decision: no session defers pushes by hand on top of PD-3. The governor refuses a push over the ceiling and keeps held state writes replayable, so a refusal costs one rerun. A session stops only on a governor refusal, a GitHub rate-limit or abuse response, or an unexplained refusal.
Consequences: lands and merges are not queued behind manual windows. Bob's 6 Nov "BE CAREFUL" is served by the governor's ceiling, not by sessions' guesses. Each new caution must name what it protects and what it costs.
