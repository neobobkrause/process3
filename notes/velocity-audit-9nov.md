# Velocity audit, 9 Nov 2026 (coordinator session_018BhceeXRALDRSHRWf5FYNw)

Asked by Bob, 9 Nov: "We need an audit to understand why velocity has virtually stopped during the last 2 days" and "extra checks and reviews have silently been piling up and being added without my approval".
Two read-only audits on process3 data (the findings log L<n>, git history, DECISIONS.md). The copy-side numbers from BOB are still to come.

## Throughput
- Copy job lands: 5 Nov ~96 (+59 plain), 6 Nov ~68, 7 Nov ~75, 8 Nov ~55 (many no-code retests), 9 Nov to 13:53 **3**.
- 8 Nov 00:00 to 9 Nov 13:53 (37.9 h): ~16.5 h with no product job able to move, for process reasons.
- 9 Nov: process3 merged 16 PRs; the product landed 3.
- Layers: L13 5.4 h for 3 jobs; L14 open 4.4 h+ with 1 land (now deadlocked by PD-19, being removed by C55).

## Growth
- tool/lib: 2,576 lines (3 Nov) -> 23,826 (9 Nov). All of tool/: 6.5k -> 55k. Test files 8 -> 117. Suite 6m43s.
- Refusal/throw sites (proxy): 272 (4 Nov) -> 1,108.
- C2-C54 (7-9 Nov): ~38 fix defects or slowness that earlier process changes made (11 of them in the GitHub pacing/ledger subsystem, whose brake was retired a day after it was built); ~11 add new capability.

## Lost hours by cause (8-9 Nov, ~16.5 h)
1. Serial layers, each with a fixed cost, carrying tiny layers: ~45%.
2. Pin churn: 17 pin moves in 38 h (87 in 6 days), each forcing a layer sync; 14-49 min each: ~20%.
3. New process features breaking the product run (C32, C33, C36, C44, C51/PD-19): ~20%.
4. Notice triage on any source change: ~10% and rising (C54 in progress).
5. Session refreshes and coordinator-id bookkeeping (25 coordinator takeovers in 6 days): ~5%.

## Safeguard inventory: 35 rows since 2 Nov
- Bob's quoted words: 7. Called Bob's but unquoted: 5. Build Plan: 3. **Coordinator only: 19.** Builder initiative: 1.
- 4 coordinator-only rows cite no measured failure, against Bob's 5 Nov rule ("We only add additional checks when we can confirm from factual study and data that a check is really needed"): cold review of every PR, the coordinator's local suite rerun, PD-17, the hourly audit cadence.
- Coordinator practices imposed on builders: cold subagent review of every PR (the Plan asks it only for gate, ledger, merge and permissions code); fix every finding with tests (contradicts GAP-3); PD-17 rehearsal; full suite run locally and again by the coordinator.

## Cuts that are the coordinator's (made now, reversible on Bob's word)
- K1: Cold review only for gate, merge, record and approvals code; what-ifs logged, not fixed (GAP-3).
- K2: No coordinator local suite rerun; CI is the check.
- K3: PD-17 rehearsals switched off.
- K4: PD-13 (run the hook by hand) removed.
- K5: Hourly AUDIT/BUDGET becomes a daily row.
- K6: PD-19 land order removed (C55, PD-19b).
- K7: Notice on any source change settled at the merge (C54, PD-20).
- K8: Pin policy: after today's catch-up pins (112e38d5, then C54+C55), the copy's pin moves at most once a day, at a layer boundary, unless BOB is blocked by a process defect.
- K9 (code, next): setup check once per pin, and settings admit warns instead of refusing.

## For Bob to decide (Bob's or Bob-attributed safeguards, or structural)
- B1: One round layer for all flawed modules in rounds 2+, landing in dependency order (largest gain, ~45%).
- B2: Revert check skipped for test-only and record-only diffs (unblocks bundler F3).
- B3: Receipt-agreement gate becomes a metric, not a red (0 catches).
- B4: CI on one Node version for PRs (two today).
- B5: GitHub ledger/pacing subsystem cut to counting plus backoff on GitHub's own 403/429/5xx.
- B6: Close the review-trigger trial (keep the `test` trigger).

## Copy-side data (BOB bob-353, read-only subagent, 14:15-14:20Z)
- Lands by day, 4-9 Nov: serial job PRs 135/92/34/0/1/0; layer lands 0/0/31/126/74/3. Pin moves 45/18/7/10/12/6 (98 in all); syncs 0/0/2/30/10/3.
- Layers, open to merged (h): L7 1.5, L8 4.6, L9 8.9 (6.3 of it idle on pending triage), L10 12.5 (9.2 dormant; last land to merge 11.2), L11 14.1 (28 deferred), L12 13.6, L13 5.6 (2.85 on sync and pin).
- Gates: 43.6 h in total. Code gates median 4.7 min; base-red gates median 24.8, max 81. The layer-sync full gate (1094) took 55 min. 3.6 gate runs per land.
- Fresh attempt median 12 min (4 Nov) rising to 42-65 min (9 Nov).
- BLOCKED reasons, 4-8 Nov (129): ruling awaited 33; needs another module's change 29; provider not built 23; requirements over cap 20; tool or process refusal 18.
- Notices: users cleared at the merge 146/143/65 on 4-6 Nov, then **0 from 7 Nov**. DEFECT: the layer land path never runs triageAtMerge, so every user went to a worker. The fix is in C56. Notice to recorded median: 0.2 h (4-6 Nov), 52.4 h (7 Nov), 18.3 h (8 Nov), 7.0 h (9 Nov).
- reader-container:1088 raised no notice although its land changed a provides test (a gap, fail-open; noted, not built).

## Layer study (read-only, 14:58Z, tranche a7c0c980)
- No test suite runs at layer level (INT-4, Bob 5 Nov). The layer-level checks are bookkeeping: open census, sync/syncOwed, merge preconditions, carriedSync, tickLanded, layerChecks (install, build, entry checks, regenerate; already run in every job gate), verifyOwner, and layerCover (evidence that each file is covered by a verified green land).
- Each one moves to job start or the land, is already done per job, or goes. The cross-module backstop moves to the tranche-into-main gate, which already re-runs a user's suite whose provider changed after it was gated.
- Plan, "direct" flow (merge_strategy: direct): every job is based on the tranche; a module is startable when it has unmet marks and every upstream module is settled (total order + uses graph); a job lands on the tranche once its gate is green and its providers have landed; a land reschedules open users and notifies COMPLETE ones; a round = all flawed modules at once; the walk starts when the round's modules have landed. About +430/-240 to switch; about -1,500 later, retiring the layer machinery. Uses cycles: land in map order, and the later land reschedules the earlier.
- Risks: combined state is tested at tranche-into-main rather than at layer close (as today, there is no combined re-test inside a layer); wider reschedules; migrate only after layer 14 merges.
- Decision (coordinator, at Bob's 9 Nov direction): build it as C59; switch the copy after layer 14 merges.
