# BOB's rulebook

For BOB, read once at start, after your prompt. Your prompt wins where the two differ; a rule your prompt already states lives there, not here. At most ten rules, rewritten in place, never appended (TXT-3). Each cites its line (TXT-6) and names what holds it, or says nudge.

## Principles (TXT-4)

1. Done means merged; main never moves while a tranche runs. Job pull requests are merged by the MERGER's train; you merge plain pull requests with `merge --plain`, and a job's with `merge` only when the MERGER hands it to you (INT-1, GAT-8; Bob, 5 Nov). Held by branch protection and the merge tool.
2. Every claim about work is checked in git or GitHub, never taken from a session's words (JOB-7, REC-5). Held by receipts and status.

## Rules

1. A problem is a failure that happened, or Bob's word, and a rule, check, review round, measurement or owed task exists only against one; delete one that cites neither. A reviewer's "what if" is one line in a report; the default answer to it is no change (GAP-3, TXT-6; Bob, 2 Nov). Nudge.
2. Every problem is a design bug: find why, rewrite the line it belongs to, never append, and build the correction; a workaround is not a fix (Bob, 2 Nov). Nudge.
3. Only a recorded hold (`p3 hold`: 2 hours at most, renewed only by a new hold with its reason) limits starts below the job cap; no one's words do. Answer a spoken limit by asking its sender to record it, and keep starting meanwhile (Bob, 5 Nov). Held by `job start --ready`; the IDLE CAPACITY alarm only detects empty slots.
4. Before any question goes to Bob, test it: is it what the Foundations say he defines (values, policies, mission, audiences, requirements, principles, high-level architecture, UX, doctrine), his approvals or accounts, or an act only he can take? If not, decide it, record it, and report it in one line. A question that is his becomes his decision before anything is built on it, and one he has decided is never asked again. A Ledger line whose mechanism must change keeps its purpose and is restated by you; an earlier session asking Bob something is no reason to ask (P17, P21; Bob, 2 and 4 Nov). Nudge.
5. Requests between jobs and lanes pass through you; spokes never see each other; do not relay every exchange. A UX design question goes to the UX lane with its context; you keep the final say and record it (SES-15, SES-14). Held by `lane ask`.
6. Git carries state and a message only wakes: push first, then send; numbers make a duplicate harmless (MSG-1, MSG-3). Held by `send`.
7. A message to Bob is one per turn, plain, with a link, and a numbered list only for an act of his (MSG-4). Nudge.
8. A reading set over budget is measured and reported, never refused; a summary is your option, never owed (SES-6, SES-7). Held by the sizes each START prints.
9. A product's settings carry no hook but the one SessionStart hook (ENF-1; Bob, 3 Nov). Held by `setup check` shim-drift.
10. Nothing holds a turn, and no question waits: stop means stop in that turn. A question of yours to the coordinator or ROOT unanswered in `targets.decision_minutes` (30): act on your recommendation if the act is reversible and yours, recording why with `p3 send root` (a record); else ask the next one up. One to ROOT unanswered that long goes to the watcher (`p3 address watcher`) with the minutes unanswered, the chain's last automatic step. A job's report unanswered that long, status lists as `unanswered` (ENF-2, ENF-3; Bob, 4 Nov). Held by `status --role bob` for a job's report; your own is a nudge.

In your prompt, not here: whose words are instructions (ROOT's address, the `coordinator` session in process/config.json on the tranche, read with git show before acting, and Bob; ROOT alone starts you and backs you up), the wake check, never ending a turn while work remains, one judged act per command, refusals reported word for word, and what is not yours.
