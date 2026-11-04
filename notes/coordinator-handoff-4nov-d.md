Process3 coordinator handoff, 4 Nov, about 19:30 UTC, from session_01RAN5eoLoqw2E3pPRs8poFv (context 55%; handing over at a natural break, per my own 60% rule, after Bob asked who watches the coordinator's context). Bob is the owner; his words are instructions. You are the Process3 coordinator. Bob defines and you decide everything technical. Bring Bob only the acts only he can take. Plain words, no em-dashes. Every measured finding with times: notes/coordinator-findings-3-4nov.md (read from "14:47 took over" down).

START, in order:
1. Record your id as `coordinator` in process/config.json on the copy's tranche and the probe's tranche, each through a short session (as copy PR 258 and probe PR 219 did at 14:49). Target the tranche only, never main.
2. Move my three scheduled tasks to yourself (create the same prompt bound to you with create_trigger or send_later, then delete mine; read each with get_trigger first): trig_01GiFw3tuB2XerznAuehFoZX (16 Nov 17:00 Phase 1 survival read), trig_01R8S18TfkuSXsjrsbNwbyXB (18 Nov 17:00 Phase 2 survival read), trig_018Wf6AKEanuzgr7u5MPjMe5 (5 Nov 19:00 review-trigger day-1 cost check).
3. Adopt my one open child: session_01RAN5eosbknEoNoECoDwkTw (copy pin move to process3 b8e5502, PR 125, then the review_triggers config PR). It reports to my id; read its result with get_session / list_events, archive it when done.
4. Tell BOB (session_01RAN5eomXNvM23EMwtLVBHG) and ROOT (session_01RAN5emK1snYonbEbVPHbAP) your id. Then archive me.
5. Check your own context at every check-in; hand over at 60% (nobody else watches the coordinator yet; see OPEN 6).

BOB'S DECISIONS TODAY (binding, in order):
- ~14:50 plan: (1) drive the copy through first tranche close, dev deploy, dev release, install from scratch; defects there first. (2) design review of the trust layer, aimed at SIMPLIFYING. (3) cap the tool's size. (4) write results into the Build Plan's gates (doc cccf8cb8-a719-4f73-96f2-9ab0e2aaa897; notes/gate-map-4nov.md).
- Created GitHub environment p3dev-release on the copy, deployment branch rule `tranche` (his word, 15:20; sessions cannot read environment settings; verify by the first release run's publish job and one negative test after).
- Threat model (b): hostile session too, held by GitHub's walls first; the tool holds only where no wall exists. README.md:129 to be rewritten to say so.
- Running users' suites in a job gate is a drag with little benefit (his history): reverted (PR 118). Use a product smoke list instead (PR 120, live).
- Cap: split vs consolidate on evidence, balanced, measured (no bias to splitting). Cap work is PAUSED until the first dev release.
- Reviews (~19:05): product job PRs reviewed before merge on two triggers, security-list changes and deleted or loosened tests; measure for 1-2 days, not a week; review the decision sooner if early cost is significant.
- Agreed (16:55): copy work narrowed to the release path only, about 6 job sessions; a partial first close (`plan: close` in the tranche's config) once conditions hold.

STATE AT HANDOFF:
- process3 tranche b8e5502 (PRs 109-125 merged today). Copy pin a331a17 (copy PR 300); move to b8e5502 in flight (above).
- Tool size: non-test .mjs grew about +250 lines today plus PR 125 (about +200 non-test), each growth cited to a measured defect or Bob's decision. The cap is NOT met. The offset is the trust review's simplifications (notes/trust-layer-review-4nov.md on branch review/trust-layer-4nov, 0fc4373): about 1,100 lines, groups A done (0, 3), B next (5, 6, 9, 10), C after milestones (1 after first close; 2, 11 after first dev release), D on inputs (7 now unblocked by threat model b; 4 needs a ruleset measured on the probe first), E hold (8). Report the net line figure daily.
- First close and release conditions (BOB 17:31): (a) REAUTH fix merged: DONE (copy PR 289); (b) known gap to list in release notes: ratification does not yet call docket R33's signed edition entry; (c) p3dev-t1 serves pages and the walk passes: needs screens-daily 281 and screens-inquiry 173 merged (together they clear the smoke t46-app), then redeploy. Then: `plan: close` partial close into main, deploy, `release dev` by dispatch on the tranche (never push a p3dev-release branch), install from scratch, upgrade test.
- Audit (17:19, 63% of sampled requirements met and tested): product defects routed to BOB; 1 (REAUTH) and 5 (case-checker, via the new --fresh-branch restart on job/case-checker-2) in hand; 2 control-plane, 3 screens-settings, then 4, 6, 7.
- M-R7 is BOB's measurement (not Bob's), queued after the redeploy serves.
- Review triggers: backtest 28 of 116 merges (24%), catches PRs 253, 174, 95. First live data: 6 hand reviews, 0.9-2.3 min each, one real catch (plane 175's control test could not fail). Early-warning lines: >15% of PRs, median +10 min to merge, most reviews with nothing acted on. 24% is over the first line; I recommended keeping it for the trial because the per-review cost is small; Bob has not objected. Judge on live numbers at the day-1 check.
- ROOT sweeps hourly at :14 with `--sessions` (live 20, leftovers 0 at 18:20). Watch: ROOT's state-branch pushes needed 3-4 of 5 tries.

OPEN (mine to drive):
1. The first close and release as above; then the trust-review simplifications to bring the tool size down.
2. Gate browser policy (receipts mismatch on Chromium-measured tests; jobs rerun without a browser).
3. `p3dev-*` tag ruleset for Bob: first measure which identity creates the release tag and which identity sessions push as, from the first release run; then give Bob exact settings or say it cannot work.
4. Fresh restarts write no restart.jsonl row (lead figures miss that stop).
5. Build Plan gates (plan step 4) not yet updated with today's results.
8. QUEUED after the first dev release: Process3 (b): the gate accepts removing a generated file that .gitignore lists (copy PR 306 refused 20:47; tracked program.mjs is 6.9 MB and stale, R13/R32 base-red); then BOB untracks it and case-checker restarts on a fresh branch with only its test change.
7. QUEUED (Bob, ~20:10): self-merge trial after the first dev release; design, prerequisites, measures and stop rules in notes/self-merge-trial.md.
6. Nobody watches the coordinator's context: propose that the sweep reads the coordinator's context too and pushes Bob at 60%.

HOW TO WORK (learned today):
- Builds: one fresh review, one fix pass; a build's test must run the live case that motivated it, end to end, with real data shapes (two builds today shipped tests on invented shapes: sweep fields, fresh-branch with a COMPLETE module).
- Before re-adding a mechanism, check the process's history (users' suites in the gate had been tried and dropped).
- Design check before review rounds: code that reads session-controlled text to decide trust goes back for redesign; fixes close the class, not the instance.
- Pin moves one at a time via a short copy session: setup check, then `pin move neobobkrause/civicsmith-copy --pin <full sha> --why "..." --report <your id>`, start the printed session.
- Builds must poll checks in their own turn; never end a turn to wait, never re-push to retrigger.
- Archive every session you start once it reports. Only the owning session can change its own scheduled task's prompt.
- GitHub Actions had an outage 15:50-16:49; exclude it from urgency measures.
