# Coordinator handoff, 5 Nov 2026 23:55 UTC (session_018BhceevG6A8yj9fzc24C89)

Bob asked for this refresh. Read notes/coordinator-findings-3-4nov.md (last entries) for the log.

## Where things stand
- Copy (civicsmith-copy): pin process3 82cefb9 (176, 177, 180), merge_train_window 1 on Bob's order. Layer 6 is closing. BOB's estimate is about 02:00-02:30Z: ai-gate 411 and ai-runs 485 (behind ai-catalogue 484) are queued; agent-runner 394 was red and is restarted for R12 only. Before layer close: close citation 379 and contradiction 380 unmerged (branches kept), and merge plain PR 606 (untrack newgroup.bundled.mjs). After layer close, product work PAUSES: BOB does not open layer 7 until the coordinator says.
- Bob's direction: the Shared Layer Branch (note https://claude.ai/artifact/FPZfRWFpp7frS2g6zqVuDV). His rulings: no test at layer close, only the layer's checks (INT-4); a rescheduled job halts its run and restarts; BOB starts jobs, not ROOT; the interface signal is exports + Provides text + tests of Provides requirements.
- Build: process3 draft PR 183 (build/layer-branch, session_018BhcecugKLxZHVRfKX4bo7), behind "merge_strategy": "layer". Do NOT merge it until layer 6 has closed and product work has paused (Bob). Merge only after its cold review reports, not on green ci alone. Then pin move, then layer 7 opens as the trial.
- Copy pin PR 600 (process3 7ea32cc: 179 + 182): held as a draft, never merge. 179 departs from GAT-8 (audit 2) and is superseded by the layer branch.
- Process3 open PRs: 178 (ci headroom, paused), 181 (triage lanes, original design, do not merge), 158 (owner asks, old draft), 183 (above).
- Audits: audit 1 https://claude.ai/artifact/RGdq9TSXkNAyJW6yJ8SPvN; audit 2 https://claude.ai/artifact/5pCjJikb3NxTZCjjdxJEYF (session_018Bhced5SCACwF5S3dkLLft).
- Governing documents, recomposed on this account (Bob keeps them as live artifacts until 1.0): Foundations https://claude.ai/artifact/RVZ8szbF1UHHSETkcGrKw8, Ledger map https://claude.ai/artifact/8yMEUaEdwxSXcA8fcZYFnh, Keep and Drop Ledger doc https://claude.ai/artifact/QBTv69M6CZEv6TYUFpJYc9, each with a "Proposed changes (awaiting Bob)" tab. The Build Plan text was never supplied.
- Bob's interactive Keep and Drop page with 20 new questions (SLB-1..11, AUD-1..9): https://claude.ai/artifact/GrYHFREXvm77n9Go5JEhDv, db collection "decisions" (owner writes). When Bob has answered, read them with ArtifactData list, then update the Foundations, the Ledger map and the Build Plan to match, citing his answers.

## Open for Bob
- His answers on the Keep and Drop page.
- Assistant sign-in: a requirements conflict (agent-runner T53 retires /signin and /conversation; sign-in must work at deploy). Deferred by Bob until merging is settled.

## Owed process problems, waiting on the triage design or Bob's answers (build nothing yet)
- Ledger-sync defect (job sync takes the tranche's OPEN over the branch's WORKING; 3 times). Interim: BOB does not edit a live job's ledger entry; a job may restore WORKING itself with a reason.
- job complete runs suites in-session; a suite over 30 min is killed (PLT-4; AUD-7).
- process3 ci is near its 10-minute cap (9m39s).

## Lessons
- Wait for an announced review before merging, not only for ci (179 merged without its fix; 182 followed).
- Never credit Bob with a decision that was ours; no rulings to BOB as messages.
