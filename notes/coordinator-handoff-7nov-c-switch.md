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
- Copy pin move to f6a9846 (session_018BhcegjKaqPTi4C3QLgA4d) stopped before pushing (Cloudflare 429 read as a missing token: C20). The copy is still pinned at 19fe9dd. The probes are at f6a9846 (PR 239).
- Builders ef7TXuV (C19/C20, append-only-state) and ef1pxNY (R17g, C18) were told to push and write notes/builder-handoff-ef7.md / -ef1.md on their branches. Heads are below once they report.

## State at shutdown
- process3 tranche: 7f4426b (C17 PR 230 f6a9846 and C16 PR 229 merged). Open PR 231 (PD-5, PD-6 decision records; CI was running). Merge it.
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
