# Coordinator handoff, 8 Nov 2026 ~18:55Z (session_018BhcedbUiTG6UuAPgNfkA9)

Previous: notes/coordinator-handoff-8nov-c.md. Log: notes/coordinator-findings-3-4nov.md, entries 12:52Z to 18:55Z 8 Nov.

## Why now
Bob committed new approvals blocks A, B and C in all three repositories at ~18:00Z (copy 5371d2da, probes 9dfed29d, process3 5d5adf47; drafts in notes/draft-approvals-split-8nov.md). Sessions load approvals only at start. My session also held three repositories, which BD-R2 rules out. START THE SUCCESSOR WITH process3 ONLY.

## Addresses
ROOT session_018BhcefMKiLuojtdyeh1nzG. BOB session_018BhcegCnnPxsYfe31RVw9N (on the old approvals: ROOT's start check / handover replaces it). Watcher session_018BhcegBeapVuoF7cgLpEeR.
My tasks, bound to me (rebind to yourself, then delete mine): hourly trig_0113AcnEKfENELB7wb65xEwh (:51), Phase 1 survival trig_013Zwbn1Mrdm6oG4vC34xexK (16 Nov 17:00Z), Phase 2 survival trig_013GhdrwCMZmXKjyuCftNdE5 (18 Nov 17:00Z).
Probes' process/config.json coordinator: me (probes PR 259). Under C42's new prompt rule, change it through a probes-rooted session, not your own.

## Bob's decisions today (DECISIONS.md on process3 tranche)
- BD-R1 (PR 268): walks end rounds. Each round re-runs the plan's layers over the flawed modules. Repeat until a clean internal walk, then the release deployment and its clean walk, then the installer update, then the site update, both on Bob's approval. Layer 12 finishes as is ("Finish, then switch").
- Bob, in session: flaws found in a module cannot imply flaws in lower layers (total order), so one upward pass per round suffices.
- BD-R2 (PR 270): process3 is product-neutral; each repository's approvals cover it alone; one repository per session; the coordinator stays Bob's front door and acts on a product only through a product-rooted session (BOB, or a short session as pin moves do).
- Biosmoke: biosmokeN is development-testing only. Under the copy's new block, releases are installed there and walked, and deleted with their data after testing.
Mine: PD-15 (PR 266, a test-only land after an earlier source land is at most additive). Rulings: C39 design (1a, 2a, 3, and 4b's shape: `deploy release` installs the signed artifact; a gap where no path exists); C40 pacing (own-repo writes, listed reads); C41 (process/ root; modules file stays, product reads it; build/jobs may move; build/plan and requirements-notes move only with a job updating the tests that read them).

## Merged today
C37 (265), C38 (267), C39 (269), C41/C42 (273). Copy and probes are pinned at c52faf45 (C39). C41/C42 are NOT pinned yet: I held the pin to ride with C40.

## Open acts for you
1. C40, process3 PR 274: ready at head 127548a7 (1221/1221, hashed deny list in, pacing done). Review, merge, then pin the copy and the probes (C40 + C41/C42 together) and archive builder session_018BhcednSXAr6eXZMjaDi8a.
2. The deletion session session_018Bhcee7cS425xNtXkGFaF5 (copy-rooted) is deleting p3dev-l1, -l3 and -t1 under the new grant (Bob: "Delete them now"). It reports to me; read its result with list_events and archive it. p3dev-l11 stays until its findings are analysed.
3. Release walk on biosmokeN: once the copy pin carries C39, a builder wires `deploy release <version>` to install the cut, signed release into biosmokeN and walk it. Evidence: the installer is newgroup/ (wrangler deploy; the build embeds the signed release checked against RELEASE.json); the site is site/ (worker civicsmith-site, custom domains civicsmith.org and www.civicsmith.org, INSTALLER_ADDRESS points at newgroup's workers.dev). Cloudflare shows only wrangler deploys from Bob's account, last 27 Oct. The token was verified 8 Nov: R2, a Worker with a DO migration, R2 and browser bindings, cron, workers.dev and delete all ok; D1 and KV are refused (unused).
4. Tranche-end workflows: installer-update and site-update in the copy, behind the protected `release` environment (Bob: "Process, on my approval"). Proposed to Bob as round-2 found marks. Ask him for the go, the scoped Cloudflare deploy token in that environment (his to add), and whether the site is civicsmith.org or civicsmith.dev (Cloudflare shows only .org).
5. Layer 12: plane 1066 and journey-check 999 were left at 18:01Z. When both land: layer merge 12, then the round-close run, then the findings as found marks (DEC-340 covers 518 -> 96 at journey-check's local walk), then round 2 under C39.
6. Hourly check as before. The 18:53Z audit showed a process3 push gap of 5 (likely C40's split ledger; re-audit with both ledgers after C40 merges). For copy state, read with git from a clone, or ask BOB; never act on a product from your own session.

## Merge practice
As 8nov-c: a process3 worktree at the tranche; merge the head onto the tranche and run the suite (HOME=$(mktemp -d) GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 node --test 'tool/test/*.test.mjs'); mark ready; `node tool/p3.mjs merge <n> --plain --rounds 1 --reviewed "..."` (timeout 1200 s). Pins: `pin move neobobkrause/<repo> --report <me> --why ... --pin <sha>`, then create_session with its JSON, then archive each when it reports.
