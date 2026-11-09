# Coordinator handoff, 9 Nov 2026 ~12:00Z (session_018BhcedB32x3Rg65eC65L5W)

Previous: notes/coordinator-handoff-9nov.md. Log: notes/coordinator-findings-3-4nov.md, entries 03:58Z to now.

## Addresses
ROOT session_018Bhceg3m4o8qXzgi9JC4Ux. BOB session_018BhceeL7ktcpogArqPTSPB (since 10:53Z; read `address bob` if in doubt). Watcher session_018BhcefG1j3sNc5UxYXrgdK (daily 11:17Z).
My tasks, bound to me (rebind to yourself, then delete mine): hourly trig_01JaK77oGVMEYytoV49s5ork (:51), Phase 1 survival trig_01RatE817khZ28EC29KYxo9v (16 Nov 17:00Z), Phase 2 survival trig_019Rv9MByyZFhEGHHR8EhZ3N (18 Nov 17:00Z), Cloudflare token expiry trig_01X8e2hueJ8WS5B4jt1ZHgE5 (25 Oct 2027).

## Merged in process3 today (all reviewed by me, suite green, merge tool)
PD-17 (283: rehearse new process paths in process3 first), C47 (284: every tool push reaches the ledger), PD-18 (285) + C48 (286: notice withdraw for PRs that do not exist), C45b (287: light gate classes record-only / pin-only; the first C45 was lost when ROOT's sweep archived its unpushed session), C49 (288: a layer sync carrying only the pin is pin-only; closed C45b's accidental pin-only for non-job PRs into a layer), C51 (290: PD-19 companion join `layer join <m> --companion-of <job> --layer <n> --why`; PD-19 in DECISIONS.md), C52 (291: the hook shares connector writes' rows).
Copy pins today: b2868be2 (1091), f84714ec (1093), 33afe79c (1096), and c50ce587 (C51+C52) RUNNING now in session_018BhceckZ8UWo9wHZpQLxsN (started 11:53Z).

## Measured
Record-class gate 0.89 min (copy PR 1101) vs 33.9 min before. Pin gates 4-7 min (class full in this product: agent-worker's control test names .process; fail-closed as built). A layer sync on the pin-only gate: minutes. A pin move still ~45 min, ~30 of it the setup checks (BOB's idle check runs inside them): C50 fixes that.

## Product state (round 2)
Layer 1 (internal 13) merged 08:44Z (bundler F2, reader-container F1 landed; file-scanner deferred; bundler F3 deferred to Bob). Layer 2 (internal 14) open ~09:30Z: ai-catalogue 1097 landed; ai-accounts 1098 and credentials 1099 BLOCKED until their PD-19 companion op-declarations lands (store-assembly routing for ai-catalogue is now a normal later-layer join, since 1097 landed). 19 notices triaged; wizard-scripts, answer-envelope, monitoring, provenance and membership users ride later layers. 16 wizard-scripts tests reported red at layer/14 (not yet verified on the tip; may hold layer merge 14): BOB's handoff carries it.

## Open acts for you
1. Pin move c50ce587: when it reports, archive it, tell BOB (layer sync 14; companion joins: all of op-declarations' pairings before its job starts; then the starts).
2. C50 (PR 289, builder session_018Bhcec7RTxXm4cBZ1QzewB): I asked for (1) the idle check only for BOB (pin commands not BOB by default; unknown sender skips), (3) the fileLog root-commit trailing-space fix. Review, merge, then pin move it ONLY in a window BOB names (ask first; never hold job starts for a pin move: lesson of 08:44-09:30Z).
3. Bob's call owed: bundler F3 (a test-only found mark cannot pass the gate's revert check; `revert exempt` was refused by auto mode as CI Bypass). Options put to Bob: a gate rule for test-only found marks (my recommendation), an exemption Bob grants himself, or leave deferred. Re-ask once if unanswered.
4. Follow-ups noted, not started: C51's own-layer check compares a map layer with the internal layer number (over-strict in a round 1); the round runs plan layers one at a time (~5 h a layer, so 11 layers ~2+ days a round): measure and propose concurrency of independent layers; a job that declares new ops always needs an op-declarations companion: job start could name it up front.
5. Plane gate time (Bob's ask): report when plane F1 lands (its round layer is plan layer 11).

## Practice
Merge: worktree at the tranche, merge the head, run the suite (HOME=$(mktemp -d) GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 node --test 'tool/test/*.test.mjs'), then `node tool/p3.mjs merge <n> --plain --rounds 1 --reviewed "..."` in the background. Pins: `node tool/p3.mjs pin move neobobkrause/civicsmith-copy --report <you> --why ... --pin <sha>`, create_session with its prompt, archive when it reports. Ask BOB before a pin move while a layer is open. Builders: tell them to push early and draft-PR after the first green commit. Push notes only with the tool's `github push`.
