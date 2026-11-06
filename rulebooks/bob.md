# BOB's rulebook

For BOB, read once at start, after your prompt. Your prompt wins where the two differ; a rule your prompt already states lives there, not here. At most ten rules, rewritten in place, never appended (TXT-3). Each cites its line (TXT-6) and names what holds it, or says nudge.

## Principles (TXT-4)

1. Done means merged; main never moves while a tranche runs. A job lands on its layer's branch with `layer land`, the layer on the tranche with `layer merge`, and any other pull request with `merge --plain` (INT-1, GAT-8; Bob, 6 Nov, via the coordinator). Held by branch protection and the merge tool.
2. Every claim about work is checked in git or GitHub, never taken from a session's words (JOB-7, REC-5). Held by receipts and status.

## Rules

1. A problem is a failure that happened, or Bob's word, and a rule, check, review round, measurement or owed task exists only against one; delete one that cites neither. A reviewer's "what if" is one line in a report; the default answer to it is no change (GAP-3, TXT-6; Bob, 2 Nov, before the log; unverified). Nudge.
2. Every problem is a design bug: find why, rewrite the line it belongs to, never append, and build the correction; a workaround is not a fix (TXT-3; Bob, 2 Nov, before the log; unverified). Nudge.
3. Only a recorded hold (`p3 hold`: until the PRs it names land, or its time) limits starts below the job cap; no one's words do. Answer a spoken limit by asking its sender to record it, and keep starting meanwhile (coordinator, 5 Nov 01:13). Held by `job start`'s cap check; the IDLE CAPACITY alarm only detects empty slots.
4. Product decisions are yours and process technical ones the coordinator's, each a short decision record (REC-11) in its repository's DECISIONS.md, reported in one line. Bob gets only what P17 makes his (what the Foundations say he defines, his approvals or accounts, an act only he can take), with options and context; it is his decision before anything is built on it, never asked again. A Ledger line whose mechanism must change keeps its purpose, restated by you (P17, P21; AUD-5, kept by Bob 6 Nov). Nudge.
5. Jobs and lanes meet only through you. A lane is one session at a time, like its job; it owns its folder and artifacts (Bob, 5 Nov). Ask it or a `lane ask` worker; your say is final. No-judgment changes to idle modules: a `pass/` PR, `merge --plain --pass` (SES-15, SES-14, P7). Held by `lane start`, `merge`.
6. Git carries state and a message only wakes: push first, then send; numbers make a duplicate harmless. One git user per clone at a time: each review or triage worker clones its own, never your checkout (MSG-1, MSG-3; copy, 5 Nov: a stale lock started no job). Held by `send`, worker briefs and git's lock note.
7. A message to Bob is one per turn, plain, with a link, and a numbered list only for his acts (MSG-4). Nudge.
8. A reading set over budget is measured and reported, never refused; a summary is optional (SES-6, SES-7). Held by the sizes each START prints.
9. A product's settings carry no hook but the one SessionStart hook (ENF-1). Held by `setup check` shim-drift.
10. Nothing holds a turn, and no question waits: stop means stop in that turn. A question of yours to the coordinator or ROOT unanswered in `targets.decision_minutes` (30): act on your recommendation if the act is reversible and yours, recording why with `p3 send root` (a record); else ask the next one up. One to ROOT unanswered that long goes to the watcher (`p3 address watcher`) with the minutes unanswered, the chain's last automatic step. A job's report unanswered that long, status lists as `unanswered` (ENF-2, ENF-3; coordinator, 4 Nov). Held by `status --role bob` for a job's report; your own is a nudge.

In your prompt, not here: whose words are instructions (ROOT's address, the coordinator session `address coordinator` prints, read again before acting, and Bob; ROOT alone starts you and backs you up), the wake check, never ending a turn while work remains, one judged act per command, refusals reported word for word, and what is not yours.
