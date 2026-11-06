# Coordinator handoff, 6 Nov 2026 22:05 UTC (session_018BhcecWcETw22rxhPvoZ53)

Full log: notes/coordinator-findings-3-4nov.md, entries from 15:40. Bob's words are quoted there ("BOB'S WORDS", "BOB'S DECISION").

## Situation right now
- GITHUB: the account civicsmith was SUSPENDED at 19:19Z. Bob sent GitHub support a request; no reply yet. At about 22:00Z Bob added **believeinoakland** (his original individual account) as a Write collaborator on the copy, process3 and process3-probes, and pointed Claude's GitHub connection at it. Verified: gh api user = believeinoakland; push=true, admin=false on all three; my notes pushed. I advised Bob that a personal account doing machine work is a terms-limit and evasion risk, and suggested he tell support in his ticket that he's temporarily on believeinoakland, paced to GitHub's limits. His call.
- RESTART ORDER (everyone holds until told; ONE push at a time; no polling under 30 s; stop on any 403/429):
  1. R17 GitHub pacing (builder session_018Bhcef1pxNYJCcaejqj138, build/github-pacing FINAL 67bea87, 1000/1000; review: 3 high + 6 medium fixed; known limit: process3/probe sessions do not share the account budget, ruled acceptable for now, revisit as own process-state after record.yml branches-ignore): got GO at 22:05 to push, PR, ci; I merge it (merge --plain --rounds 1 --reviewed ...). Then a COPY PIN MOVE 5 carrying R17 (short session as for pins 2-4; a session prompt template is in this conversation's pattern: checkout tranche, move .process, setup check --at HEAD, plain PR, merge --plain --no-review, report). Then BOB runs `layer sync 9` (SLB-12).
  2. BOB (session_018Bhceff4p3dNtYx3XNk4CX): finish layer sync 9 (PR 708, job-branch step), then push 697 filing-templates, 698 actions, 699 action-holds (don't land 699 on its old tip), then bob/generated-row-member-roster-order fdea4aa808 and bob/regen-member-roster-order 8bf6f2f9f2, then lanes. 700/701 had nothing unpushed. Then land layer 9 in order and `layer merge 9`.
  3. Builder session_018Bhcef7TXuVjVZ4eN1SCzE, one PR at a time: build/r8-classifier ec0ef34 (export reader regex literals; new test file additive unless it names a Provides req whose source changed; then RE-RUN the classifier on layer 8's 7 breaking verdicts and copy 696, and report flips), build/stale-generated 9dda2f9 (stale committed generated file is a gate finding, base-stale a notice, layer merge refuses; plain PRs regenerate; ruling (A) refresh may sit beside modules/layers/config/records; CHECK the copy's generators are deterministic before merge), build/layer-prestart 6f2daa3 (R14 1b next-layer early start). Then rest of R14 (fill list, utilization target, ETA from R9 times).
  4. Builder ef1pxNY after R17: build/switch-ready f4d7ec8 (R16 account-switch readiness; rename civicsmith→"the process's GitHub account" in docs/canary first).
  5. Re-enable scheduled tasks once R17 is pinned: ROOT sweep trig_01HBGHt8e2s7qwtHsNoiphgs and my hourly trig_017zoER3MZgcwCCaPXex3Y4C (both switched off at 19:18). Tell ROOT (session_018BhceduipEp2mmEFHN9Diu) access is back; it skips sweeps until told.
- Backups: all unpushed work is in git bundles in each session's /tmp (verified). My notes bundle is also in Bob's Drive folder process3-suspension-backup-2026-11-06 (id 1bD59vB-JvUswx8Xehih7k211YcnDiGV6). Other sessions correctly declined Drive (not in their approvals).
- Account weekly usage reads "allowed_warning" (resets 7 Nov 11:00Z). Bob watches it and will say when to prepare an account move (R16 is the runbook).

## Layer state
- Layer 8 merged 18:41:41Z (copy 691), 4.64 h. Layer 9 opened ~18:47 (13 modules; jobs 696-701; 696 action-records landed c06702976d). Copy pin is process3 d18ef1b (pin 4, PR 707). Census clean.
- R8 classifier bug (fixed locally, see above) caused needless reschedules of actions/action-holds and 6 later-layer notices: BOB starts no extra jobs from those notices until the fix is pinned.

## Process3 merged today by me
192, 190, 193, 197, 194, 198, 195, 196, 200, 201, 202, 203, 204, 191 (incl. 199). Tranche d18ef1b.

## Bob's decisions today (product, recorded by BOB as BD-n in the copy)
F1 → publication lane designed same-sitting NS_DOCKET filing; scheduled editions signed at scheduling (no format change); provenance per sentence in signed bio-case-document/11; call 1 = C (member declares + signer affirms), per-sentence AI detail is an overlay available but not visible by default; call 2 = A (keep split). BD-6 trust and transparency principle (follow EU direction voluntarily); BD-7 AI disclosure at first exposure; BD-8 review standard: no contact address — a "How Civicsmith uses AI" page + responses via the docket (BD-11); BD-12 the name is "Civicsmith". Lanes: investigation, publication (= ACTIONS-DESIGN area), ux; all must qualify (SES-19..23).

## Process rulings and canon added today (Bob's words where noted)
SLB-12 layer sync after any pin move while a layer is open (Bob); P24 self-expiring records (Bob); P25 anticipate refusals / census (Bob); P26 account switch rehearsed (Bob); P27 conform to GitHub's published limits at 80-90%, obey rate-limit signals (Bob); capacity fill / early starts objective (Bob, R14); lane qualification SES-19..23 (Bob).

## Lessons
- Estimates: my hand ETAs ran short then long; use the tool ETA (R14) when built; log and score every estimate.
- A pin move does not reach an open layer branch (gate runs the base's tool): layer sync.
- Volume: 1,387 state pushes in 19 h plus PRs/polling on one account is what likely got civicsmith suspended. Stay paced.

## Open for Bob
- GitHub support reply (civicsmith).
- Whether to tell support about the temporary believeinoakland use (recommended).
