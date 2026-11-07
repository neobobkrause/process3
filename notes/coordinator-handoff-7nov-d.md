# Coordinator handoff, 7 Nov 2026 ~16:52Z (session_018Bhcefb8RbwzBi1TvvFVgT)

Previous: notes/coordinator-handoff-7nov-c-switch.md (the cancelled account switch). Log: notes/coordinator-findings-3-4nov.md, entries to 16:10Z.

## Situation
- ACCOUNT SWITCH CANCELLED (Bob, 7 Nov: "The account switch didn't work... So start everything back up here in this account."). `switch in` was never run; addresses stand. Tasks re-enabled: sweep, watcher, coordinator hourly (trig_012Umw7Ey83qEgKDxVXTKNwZ, :51, PD-6 wording), Phase 1/2 survival reads (trig_01S6Uz77Um5Fs9KKkbRLsANK, trig_01Xr6hruLoNajPFrX5CAxwBq). REBIND these three to the successor and delete mine.
- civicsmith hidden-content test (Bob asked): anonymous github.com reads 404 issue 84 and PR 128 of neobobkrause/neoprocess (civicsmith-made), while 82 and 130 read fine. GitHub hides the suspended civicsmith account's work from everyone (C6). Only Bob's support ticket fixes it.
- Copy: layer 10 MERGED 16:10Z. Layer 11 open with about 20 jobs (slots 20, Bob 7 Nov); merged so far: ai-issuer 774, op-capabilities 752. interface-shell-t53 is blocked, so BOB is reopening interface-shell for a hook (BOB's ruling). Layer 11 is the copy's LAST layer: its `layer merge` closes the first round and, under C23, runs the internal walk plus the dev deploy and walk inline (tell BOB to run it in the background; already told).
- PIN IN FLIGHT: ba589a16 (R17g, C21, C22, C23) to copy (session_018BhcedLRq2Mqsd29atNML2) and probes (session_018BhcedGcte1oXAgzB28iKP). Archive both when they report. BOB then runs `layer sync 11`.
- process3 merged today since 05:00Z: 229 C16, 230 C17, 231 PD-5/PD-6, 232 append-only, 233 governing/ docs, 234 C19, 235 C20, 236 C18, 237 R17g, 238 C21, 239 C23, 240 C22. Probes: 242 exemption (Bob: probes exempt from the internal walk).
- Documents in git: process3 governing/ (Foundations, Ledger map, as of 7 Nov 05:45Z); copy docs/development/*-research/claude-ai/ (Q9 paper, BD-14 requirements, Q9.1 walkthrough). The claude.ai documents stay the working copies.

## Bob's decisions today (all relayed to BOB and recorded there)
Q9 → BD-14 (Q9.1: fallback "rules-out marks only", UX check Q9.1 only; walkthrough WCzdua7ccBB95KbtwGvatt awaits his B-vs-fallback call; the IV-9 bar is owed). Funding → BD-15 (optional; institutions plus large gifts; commissioned allowed and disclosed; AI credits not counted; BD-6 IFCN line yes). Job slots 20. Internal walk required, tool-started, round close only; probes exempt.
Still owed by Bob: Q7 (who amends the canon; INV:85 and the grade-C doctrine conflict ride it), Q8, Q9.1 B vs fallback after the walkthrough, the IV-9 number, the GitHub support ticket for civicsmith.

## Coordinator decisions today
PD-5 (no hand-held push windows), PD-6 (only GitHub's published limits or refusals brake), both in DECISIONS.md. Rulings: A8 routed to module found marks (no new lane); PF-6 as a found mark on case-inputs (C22 now allows a new module); the C18 third review round recorded.

## Builders
- ef7TXuV (session_018Bhcef7TXuVjVZ4eN1SCzE): C24 next (mark parser: an unmet mark on a requirement's Control sub-line is not attributed to it; record-core R92).
- ef1pxNY (session_018Bhcef1pxNYJCcaejqj138): C23 done. C18 watch confirmed (BOB about 30 calls in the 3 min after the pin, vs about 360 before). Free for the next item. The Foundations sentence for C23 is in PR 239's body: apply it to the claude.ai Foundations (RVZ8szbF1UHHSETkcGrKw8) or ask BOB.

## Merge practice
From /home/user/p3-base: merge the PR head with the current tranche locally, run `HOME=$(mktemp -d) GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 node --test 'tool/test/*.test.mjs'`, then `node tool/p3.mjs merge <n> --plain --rounds <r> --reviewed "..."` (more than 2 rounds needs --decision). Pin: `node tool/p3.mjs pin move <slug> --report <me> --why "..." --pin <sha>`, then create_session with the JSON it prints.
