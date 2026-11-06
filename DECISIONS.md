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
