# Coordinator handoff, 9 Nov 2026 ~16:55Z (session_018BhceeXRALDRSHRWf5FYNw)

Previous: notes/coordinator-handoff-9nov-b.md. Log: notes/coordinator-findings-3-4nov.md (12:57Z on). Audit: notes/velocity-audit-9nov.md (read it first: Bob's rulings and the K/B items).

## Addresses
ROOT session_018Bhceg3m4o8qXzgi9JC4Ux (STOPS at its next wake: Bob changed the copy's approvals block ~16:45Z; Bob starts a new ROOT with the `start root` call BOB is printing for him). BOB session_018BhceeL7ktcpogArqPTSPB. Watcher session_018BhcefG1j3sNc5UxYXrgdK (stops too).
My tasks (rebind to yourself, then delete mine): hourly trig_014pGSG9SpN1hGVg2dvzW2De (:51), Phase 1 survival trig_01ULgj1VsSoBeUxf8cKvhQkf (16 Nov), Phase 2 trig_01LnNEeqEfWF6o6uN7ceowri (18 Nov), token expiry trig_012Hj2UeFnUG2CHbLQGfCgow (25 Oct 2027).
Live child: builder C61 session_018BhcecEW7KcWKVQ9jm6dS1 (PR 302). Builder C57 session_018BhcecdeeJCyGwdn8kd8ZX is watching PR 297 for Bob; archive it after 297 merges.

## Bob's direction today (quoted in the log, 14:00Z-16:30Z)
Velocity has stopped; subtraction first; no blind reruns; no safeguards without data; pin moves light, as needed, ganged; all ready jobs open at once; total module order, no layer holds; revert check per AUD-1 with a reviewed exemption (grant now in the copy's approvals); receipt removed entirely; GitHub usage limited only to published limits.

## Merged in process3 today (since 12:57Z)
C50 289, C53 292, C54 293 (PD-20 light triage), C55 294 (PD-19b), C58 295 (PD-22, -3,523 lines), C57 296 (PD-21, receipt removed, -903), C56 298 (PD-23 in-place layer pin, layer-land triage fix, PD-24), C60 300 (retired hook is a warning), C59 299 (PD-25 the direct flow). Copy pinned at 58f96824 (PR 1110, pin-91); layer/14 pinned in place.

## Open acts for you
1. PR 302 (C61: the layer gate needs no cover for paths equal to the base) is green on ci, but `record` (record-pr, pull_request_target) fails with startup_failure: a GitHub brownout of pull_request_target on public repos, until 18:00:00Z 9 Nov. Bob was asked to explicitly allow pull_request_target in process3's Actions event policy (GitHub will make the block default later). After it is allowed or after 18:00Z: edit the PR body to re-trigger record-pr, then `node tool/p3.mjs merge 302 --plain --rounds 1 --reviewed "..."`, then pin move the copy to the new tranche tip (the `pin move` prompt from the tool; add "for every open layer the choice is apply").
2. Then BOB: re-land credentials (PR 1113, attempt 4), layer merge 14, a config PR with merge_strategy "direct" + coordinator id, round next --apply under direct, start every ready job (`direct jobs`). Tell Bob when jobs run.
3. PR 297 (ci.yml: one Node, edit reuse, docs-only skip, duplicate record step removed): Bob merges it (merge tool refuses workflow changes). It needs record too: after the brownout.
4. ROOT restart: when BOB sends the `start root` call, give it to Bob verbatim with steps (new session in civicsmith-copy, branch tranche, paste as first message). The new ROOT re-records BOB and the coordinator.
5. Bundler F3: once ROOT is back, a reviewer session (not BOB, not the job) records `p3 revert exempt` under the new grant.
6. After direct runs: retire the layer machinery (C59's PR body lists it, about -1,500); decision records one file per record (stops DECISIONS.md conflicts); blocked-reason study (rulings awaited 33 and requirements cap 20 were the top BLOCKED reasons, 4-8 Nov).
7. Bob checked rulesets (process3, copy): his changes were not the cause of the record failure.

## Practice now
Builders: subtraction; locally only the tests they touch; CI runs the suite; no cold review or rehearsal; never force. Merge: read the diff, `merge <n> --plain --rounds 1 --reviewed "..."` in a tranche worktree; no local rerun of the suite. Pin moves: whenever a merge is useful to the copy, ganged; choose apply for open layers unless a change alters how a layer is judged.
