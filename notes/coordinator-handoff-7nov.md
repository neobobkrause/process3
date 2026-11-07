# Coordinator handoff, 7 Nov 2026 ~01:30 UTC (session_018BhcedK5yPyjY6UfMKmxzM)

Full log: notes/coordinator-findings-3-4nov.md (entries from 22:20 on 6 Nov). Problem-class register: notes/problem-classes.md (Bob, 7 Nov: find root causes so problem types tend to zero; every fix brief states root cause and class prevention). Bob's words are quoted there with times.

## Situation
- GitHub identity: believeinoakland (civicsmith suspended 6 Nov 19:19Z; Bob's support ticket open; Bob sent a short follow-up ~23:50Z). Every PR civicsmith opened is HIDDEN (404) and still holds its head branch: reopen work on <module>-2 via `job start --reopen`; tool reads of landed hidden PRs break (C13).
- BOB'S WORDS that bound this: 'BE CAREFUL. I don't want to lose access to this account too.' AND 'we need to constantly watch that we're not being overly cautious. Too much caution destroys protectivity.' Test every caution: what does it protect, what does it cost.
- Bob decided 8 job slots (copy pacing.jobs 8, pushes_per_hour 120 = PD-3, share_s 900). Recommendation given: keep 8, re-measure an hour after R17e is pinned.
- Bob waits for R17d+ pinned before applying the hook settings: send him the three complete files from notes/r17c-settings.md (process3 tranche) once R17e is pinned on the copy AND probes; then live-test (raw git push blocked, connector call counted) and run `p3 github audit`.

## In flight (in order)
1. process3 PR 211 R17e (C9 shares ride pushes, C10 one budget for every clone — copy clones were blind: same clone id 'vm', C12 cheap ledger reads). Subscribed. Merge with `merge 211 --plain --rounds 1 --reviewed ...` from a tranche worktree (/home/user/p3-base) when ci is green.
2. Builder ef7TXuV (session_018Bhcef7TXuVjVZ4eN1SCzE): C13 gate fix (landed-PR 404 falls back to merge commit/state rows) — URGENT, blocks `layer merge 9` (copy layer PR 735 gate red on pulls/696 404). Told to push at once; open its PR, merge.
3. Then ONE pin move (copy + probes; `node tool/p3.mjs pin move ... --pin <tranche>` prints the session prompt; create_session with it) carrying R17d (1cbf056), R17e, C13. Probe pin to 46cf3f5 failed earlier (our ceiling); redo with this one.
4. BOB re-runs 735's gate; layer merge 9; layer open 10 and start its 3 jobs (monitoring, following, link-sweep; scheduler complete). Layer 11 (~60 modules) after R17e pinned and budget readable.
5. Builder ef7TXuV queue after C13, each its own PR via `node tool/p3.mjs github push`, I open PRs: C5 state-race (a6654bcb), C2 test git isolation (e85b1e66), C3 settings-admit (948d8d12), C11 test-only change + `layer clear` (bdd83b45), C8 unshallow, then R14 1b layer-prestart.
6. Builder ef1pxNY (session_018Bhcef1pxNYJCcaejqj138): after R17e, R16 switch-ready (held branch build/switch-ready).
- Push ceiling: TRUE rate was ~184/h at 01:0x (above the 6 Nov peak ~173). Keep PD-3 at 120; let the window drain after R17e pins. Read the budget only from a process3 clone until R17e is pinned (copy clones undercount).

## Rules in force
- Jobs push only through their tool commands (layer publish, job sync, job complete); never retry a push a session's own permission check refused — restart.
- GitHub 5xx: wait 60 s, rerun once; stop only on repeated 5xx, rate-limit/abuse 403/429, or governor pause/stop.
- My notes: keep running notes in the scratchpad and commit + push once an hour via `node /home/user/p3-base/tool/p3.mjs github push origin start/coordinator-4nov` (the stop hook forces a push of any commit).
- Scheduled tasks: ROOT sweep trig_01HBGHt8e2s7qwtHsNoiphgs (enabled); my hourly trig_01BfrkZggFs5bCj8mdeJyo5Z (bound to this session: rebind to the successor).

## Layer state
- Layer 9: 13/13 complete; merge blocked only by C13. Layer 10: 4 modules. Lanes ux/publication told to push nothing until R17e; investigation lane idle/blocked since 17:44 6 Nov (unexamined).
- process3 merged this session: 205 R17, 206 R17b, 207 R8, 208 R17c, 209 stale-generated, 210 R17d. Copy pins: 709 (471e3cf), 710 (de5ea3a), 721 (a8a6252), 728 (46cf3f5).

## Open for Bob
- GitHub support reply.
- Settings files once R17e is pinned.
- Slot re-measure an hour after R17e is pinned.
