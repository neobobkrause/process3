# Coordinator handoff, 8 Nov 2026 ~12:50Z (session_018BhceevT1GvjFc4kfGk5jt)

Previous: notes/coordinator-handoff-8nov-b.md. Log: notes/coordinator-findings-3-4nov.md, entries 08:47Z to 12:36Z 8 Nov.

## Addresses
ROOT session_018BhcefMKiLuojtdyeh1nzG. BOB (new, since 11:51Z) session_018BhcegCnnPxsYfe31RVw9N. Watcher session_018BhcegBeapVuoF7cgLpEeR. Builders: ef7 session_018Bhcef7TXuVjVZ4eN1SCzE (free after C36), ef1 session_018Bhcef1pxNYJCcaejqj138 (on C37). Lanes as 8nov-b.
My scheduled tasks, bound to me (rebind to yourself, then delete mine): hourly trig_012GSdM8BGaux88ZqnFpdSCb (:51); Phase 1 survival trig_01KzwTRZ3HtPS9xn2R4TupLF (16 Nov 17:00Z); Phase 2 survival trig_01748Nw6C2X5vtCRFkhAgvP2 (18 Nov 17:00Z). Probes' process/config.json coordinator is me (probes PR 255): set it to yourself by a plain PR, merged with the merge tool --plain --rounds 1 from the probes clone.

## State
Pins: copy and probes at process3 fb22f30d (C36 and PR 263). Copy layer 12 (the completion round, opened 09:04Z; stop ~2026-11-09 12:40Z) synced to fb22f30d (copy PR 1036).
Round 2 items: the 9 at open plus CR2-11..32. Deferred: CR2-15 (REQ-6 split of screens-daily, before its next job; cap stays 70000 until set before the second tranche), the DEC-504 words per module (next round), inquiry F3/IV-1 (next round). CR2-28 (the group slug) was dropped as a false positive; CR2-28 was then reused for membership (a just-joined admin's role is inconsistent; one authority per K5563; canon silent -> Bob, REQ-5).
Landed in layer 12 (about): interface-assets, leg-earning, inquiry (1028, CR2-20), ai-runs, hypotheses (1005), screens-daily, case-authoring (1026), affordances (1020), 1024, 1027. In flight at handoff: 1021 op-declarations (revert exemption recorded by me, comment on the PR), 1033 plane, 1019 screens-inquiry, 1008 interface-shell (land loop), 1030 membership (sync first), 1025 hypotheses CR2-19 (publish after 1020), 1029 interface-assets CR2-21, journey-check 999 (re-measure after 1008; then CR2-27 to interface-shell with CR2-22 in one fresh `job start`), provenance 1002, copy PR 1032 (the hypotheses->steps uses edge, CR2-29/30/31/32 in the completion file; gate pending, then BOB joins and starts CR2-30/31/32).

## Open acts for you
- C37, process3 PR 265 (ef1: a job branch older than its module's newest layer land reads stale, not BLOCKED). I reviewed it: suite 1188/1188 merged onto the tranche. Merge once ef1's cold review is clear (`merge 265 --plain --rounds 1 --reviewed ...`), then pin copy and probes (`pin move ... --pin <40-hex>`, create_session from its JSON, archive each on its report).
- After each copy pin: tell BOB `layer sync 12` (SLB-12) before further lands.
- Hourly: the idle capacity line. BOB left startable jobs unstarted twice today (18 min, 45 min); nudge at once with the list.
- BD-1 question: if BOB finds BD-1's text reserves uses edges, put it to Bob with the quote; otherwise the edge is BOB's (my ruling 11:28Z).

## Decisions of mine today (DECISIONS.md on process3 tranche)
PD-13 (run the GitHub hook by hand where it didn't load, PR 257), PD-14 (an item added to an open completion round joins it, PR 259; plus later items for a module already in it, PR 262). Tool changes merged: C34 (hook-loaded check, PR 258), C35 (completion join, 260), C35b (more items, 261), 263 (item ids in status), C36 (ledger base after merging the layer, 264).

## Merge practice
As 8nov-b. Connector calls: pipe their JSON to `node tool/hook.mjs` from /home/user/p3-tranche first (PD-13): my session's hook did not load.
