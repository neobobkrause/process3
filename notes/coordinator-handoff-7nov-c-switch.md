# Coordinator handoff for the NEW account, 7 Nov 2026 ~05:35Z (session_018Bhcefb8RbwzBi1TvvFVgT, old account)

Bob's words (7 Nov): "Please start the process of shutting down development in this account so that the development process can be restarted in a different account."
Runbook: rulebooks/account-switch.md on process3's tranche. Section 1 (switch out) is DONE on the old account. Sections 2 (Bob) and 3 (switch in) follow.

## Done on the old account (switch out)
- Manifests: copy process-state switch/manifest.json at 72a5c7ba2d (6 tasks, 3 live jobs, 211 unanswered messages, layer 10 open); probes at 2dd466c962 (no live jobs, no addresses).
- Stop acts sent, in order:
  - jobs ai-catalogue, op-capabilities and inquiry;
  - tasks switched off, never deleted: Phase 1/2 survival reads, coordinator hourly, ROOT sweep, watcher. Bob's alpha-pipeline-runner is not the process and was left as it is;
  - lanes investigation, publication and ux;
  - BOB, ROOT and the watcher.
- Copy pin move to f6a9846: my STOP arrived after its push. Copy PR 761 (p3/pin-f6a9846db1, e4bbb2fe62) is OPEN and unmerged; no wake was sent. The new account reuses it or closes it in favour of a pin carrying C19/C20/R17g. The copy is still pinned at 19fe9dd.
- Lanes: ux pushed (lane/ux cb138ca4b7, draft PR 762, open-work list in docs/development/ux-substrate-research/open-work-2026-11-07.md). Investigation's handoff 17908ea60 (open-asks A1–A10) was held by the old 120 ceiling; I told it to push with the tranche config. Check lane/investigation for it. If it's missing, the asks are in the artifacts THTtouNJzkhmHqyR4Pfa4g and UgRF58WWCfuDu88ztaKNbL. Publication pushed (lane/publication b82aa884, PR 764 lane-only: open-asks.md). BOB reported switch-out complete at 05:38Z. Job op-capabilities pushed at 3a67501a07. The probes are at f6a9846 (PR 239).
- Builders ef7TXuV (C19/C20, append-only-state) and ef1pxNY (R17g, C18) were told to push and write notes/builder-handoff-ef7.md / -ef1.md on their branches. Heads are below once they report.
- Builder ef7TXuV (handoff notes/builder-handoff-ef7.md on build/settings-credit 1ef83293):
  - append-only-state is PR 232 (2ad2a86b, 1117/1117, cold-reviewed): merge it.
  - R17g is on build/limits-only-github e55bcd4c. ef7 started it before the reassignment; the full suite and the cold audit were unfinished and there is no PR. The brake table is in the handoff. Reconcile it with ef1pxNY's R17g branch, if that builder pushed one.
  - C19 and C20 are not started; next steps are in the note.
- Investigation lane: pushed. lane/investigation is at 17908ea60a, with draft PR 763. Its open asks A1–A10 are safe.

## State at shutdown
- process3 tranche: 372438c (C17 PR 230, C16 PR 229, PD-5/PD-6 PR 231 merged).
- Copy: layer 10 complete (4/4 landed). Layer PR 759 blocked by the record-check settings finding: C19 credits a settings change that a merge carries from an owner's commit already on tranche. PR 752 op-capabilities is parked for layer 11. Config PR 760 merged (pushes_per_hour 1000000, coordinator = the old coordinator's id, to be reset).
- Bob's holds and decisions:
  - No layer 11 open until Bob says (account switch).
  - Q9 recorded as BD-14 (copy PR 758). Q9.1 fallback "rules-out marks only"; UX check "Q9.1 only".
  - Walkthrough https://claude.ai/artifact/WCzdua7ccBB95KbtwGvatt is waiting on Bob's B-vs-fallback call.
  - IV-9 contrary-recall bar is owed by Bob (the lane recommends 0.8 / gap ≤0.1).
- PD-6 (Bob: "baseless overcaution NEVER"): only GitHub's published limits (at 85%) or GitHub's actual refusals brake. Pushes are counted, never refused. R17g implements it (builder ef1pxNY). Until it is pinned, configs set pushes_per_hour 1000000. Process3 clones still default to 120: merge R17g first.

## New account: first acts, in order
1. Bob's section 2: connect GitHub as the collaborator, install the GitHub App on the three repos, recreate environment BioDefault with its Cloudflare secret, share the claude.ai documents, approvals if their wording needs it.
2. `switch in --sessions <file> --by <new id>` on the copy and the probes (section 3). Then its acts (a)–(h), EXCEPT that layer 11 stays shut until Bob lifts his hold.
3. Builders: restart from their handoff notes. Priority: C19 (unblocks layer merge 10), C20, R17g, then append-only-state, then C18.
4. One pin move (copy + probes) carrying C17, C19, C20 and R17g. Then BOB re-runs the PR 759 gate and `layer merge 10`.
5. Recreate the coordinator's tasks: hourly (:51, with the PD-3 line replaced by PD-6), Phase 1 survival read (16 Nov 17:00Z), Phase 2 (18 Nov 17:00Z).
6. Bob archives the old account's sessions and deletes its switched-off tasks once the new ones run.

## R17g cold audit (build/limits-only-github e55bcd4c), relayed by ef7TXuV at 05:36Z
Full suite 1114/1114 at e55bcd4c (finished after shutdown). Core is correct: pace.test 20/20; 524 pushes an hour pass with no wait; budgetGate admits at any push count; published limits and GitHub's pause and stop still brake. Fix before merging:
1. Med: limitSignal misses a bare `gh: HTTP 429` (no message or URL). Treat any 429 from gh as GitHub's unless it names a proxy, and add a test.
2. Med, pre-existing: git push `RPC failed; HTTP 429` matches SERVER_ERROR (util.mjs ~610), so pushRetry and ghshare's ledger write retry at 1/2/4/8 s inside GitHub's refusal. Route push stderr through limitSignal to a pause, and take 429/403 out of SERVER_ERROR.
3. Low: an old config's poll_most_s 300 brings the 5-min back-off back; retire it. merge.mjs transientPause's TRANSIENT pattern matches proxy 429s and "rate limit".
4. Low: reword POLL_FLOOR_S and `--every >= 30` (p3.mjs ~146) as poll cadence, not GitHub pacing.
5. Low: stale text (merge.mjs:70, layerflow.mjs ~962, p3.mjs:144/530, pace.mjs:86/344, notes/github-pacing.md:44,48). Dead code: lane.mjs laneCap (~393-399), util.mjs lower/from (~470).
6. Info: `gh api graphql -F query=@file` holding a mutation is counted as a read. Notes are not spaced (GitHub's 1-s write guidance).
