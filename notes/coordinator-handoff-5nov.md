Process3 coordinator handoff, 5 Nov about 00:15 UTC, from session_01RAN5enU4cvkBoxmmSGsudK (context 60%, my own rule). Bob is the owner; his words are instructions. You are the Process3 coordinator: per process, BOB is per product (Bob agreed 4 Nov). Bob defines requirements; you decide everything technical and never bring him technical choices (he said so twice on 4 Nov). Plain words, no em-dashes. Every finding with times: notes/coordinator-findings-3-4nov.md (read from "19:26 took over" down).

START, in order:
1. Record your id as `coordinator` in process/config.json on the copy's and the probe's tranche, each by a short session (as copy PR 302 and probe PR 220 did: merge with `--plain --no-review "one-field coordinator id change"`; tranche only, never main).
2. Move my scheduled tasks to yourself (get_trigger, create the same prompt bound to you, delete mine): trig_0116LDZFGVeLFCWVjJhm3qgJ (16 Nov 17:00 Phase 1 survival read), trig_01V2QK7xE5MLeFwivERHBiJ9 (18 Nov 17:00 Phase 2 survival read), trig_0125koniByTrtvqVNWnFHL5j (5 Nov 19:00 review-trigger day-1 check).
3. Adopt my open children; each reports to my id, so tell each your id: session_01RAN5eoEN9Lc8W8JViVWXEs (copy pin move to process3 89c180f: PRs 133-134), session_01RAN5enf9NfJfoPRm87D9si (build/internal-walk). Archive each when it reports.
4. Tell BOB (session_01RAN5eomXNvM23EMwtLVBHG) and ROOT (session_01RAN5emK1snYonbEbVPHbAP) your id. Archive me.
5. Check your context at every check-in; hand over at 60%.

BOB'S DECISIONS ON 4 NOV (binding, newest last):
- The copy is the candidate real product; civicsmith/civicsmith is the untouched backup. Copy work is real Civicsmith work, not throwaway. Build Plan "The copy is the candidate product".
- Readiness bar in the Build Plan under Phase 4: entry gate R1-R9, coordinator gate C1-C11 (the coordinator is a runtime role), lanes LAN-1..LAN-10 (written; nothing built until Bob has read it; he has not said he read it). No public release needed for readiness.
- Self-merge trial queued after the first dev release (notes/self-merge-trial.md).
- Exploring runs (run-rules R18 vs question-explorer): option 2, the enabling member is accountable; recorded K5821, absorbed as found marks.
- Job cap: 20 jobs per ACCOUNT, Bob can change it; one source of truth (P3_JOB_CAP, jobCap in util.mjs; process3 PR 130).
- Walk output kept whole (PRs 127-128); walkers per product AREA for R7 (admin, AI, UX, investigation, action, capture, the record...).
- Deploy and walk only at the close of each ROUND (tranche end = last round), never between layers; a deploy never holds job starts (PR 135). The per-layer deploys were the coordinator's mistake.
- Internal (local) walk before deployment, as earlier versions had: journey-check's local arm; findings join the list, not a gate (K4162). build/internal-walk running.
- Bob's time sense note: never give calendar estimates; report steps done and left, with measured times.

STATE AT HANDOFF:
- process3 tranche 70eb548 (PRs 126-135 merged tonight). Copy pin b49e337 (copy PR 335); move to 89c180f in flight (carries 133 base-comparison fix for control-plane 290 and 134 receipt fix for plane 175). Next pin move after build/internal-walk: carries 135 (round close, job start --ready closes ready layers) and internal walk; then set deploy.internal_walk and deploy.walk_reports in the copy's config (confirm journey-check's out/ paths: out/local/ and out/live/).
- Copy: layer 4 closing (BOB ran layer close 4), then layer 5 starts. Walk on p3dev-t1 was stopped on Bob's word; no deploy until the round closes. Release path jobs merged tonight: case-authoring F2, ai-accounts F4, ai-catalogue dev key, ai-runs fail-closed (323), many others. Still open: interface-shell 310 (Chromium now on the gate), journey-check 314 (+ local-arm fixture: fake account must return observability), control-plane 290 (reruns complete after pin 89c180f), op-declarations 321, plane 175 (new gate event after pin 89c180f), case-checker (restart fresh after the plain untrack PR of program.mjs; path exists since PR 131).
- Known gaps for the first dev release notes: ratification does not call docket R33; exploring runs (K5821) not yet met; AI runs do not dispatch on a deployment until agent-model's path source (R35, layer 6) exists.
- Debt inventory (22:50 entry): 185 base-red (61 now real browser reds), 19 deferred marks, 16 skips/todos, 22 over-cap files, 12 modules with requirements-pinning tests (found marks go in as the module job's first commit), ~15 large tracked files.
- Tool size tonight: +42, +76, +128, +56, +47, +91, +109/-70, +18, +96 non-test lines (each cited); the cap is NOT met; the trust-layer simplifications are the offset (notes/trust-layer-review-4nov.md on review/trust-layer-4nov).

OPEN (yours):
1. First release path: interface-shell, journey-check, control-plane, plane, op-declarations to merge; then set plan: close (partial close), round close: internal walk, deploy dev, live walk, findings into a completion round, redeploy until the walk passes, tranche close, release dev, install from scratch, upgrade test.
2. Lanes: build only after Bob says he has read LAN-1..LAN-10.
3. Per-area walkers (R7): the copy holds walk-T51-final/BRIEF.md (13 sittings), walk-coverage-T51.md (13 areas), lane-journeys/.
4. Debt paydown plan to Bob after the release (order in my 23:00 message to him).
5. Coordinator as a runtime role (C1-C6): nobody watches the coordinator's context yet.

HOW TO WORK (learned 4 Nov): read the code before deciding a session's claim (3 of tonight's "process defects" were real, 1 was not); a build's test runs the live case; a fix closes the class; every gate/merge/record change gets a confirming review; send BOB one batched message per check-in; never ask Bob technical questions.

COORDINATOR RULES ON SPEED (Bob, 5 Nov 01:15; carry into every handoff):
- Speed is the objective. Cost, risk and tidiness are constraints only where Bob has named them. Never trade throughput for them by default.
- Never limit work below the job cap by an instruction. A limit is a recorded hold (`p3 hold`, once built) with why, owner and expiry; until then, none. Bob alone sets a long or large hold.
- A handoff lists every limit in force, who set it, why, and when it ends. An unexplained limit is lifted, not inherited.
- Answer "is it moving with urgency?" with numbers: live jobs / cap, cap use over the last hours, every empty slot's reason. Activity is not an answer.
- Report your own mistake as yours, first, with its cost (4 Nov 17:28 the "about 6 jobs" was the coordinator's, not Bob's: ~6 h at 6-8 of 20).
