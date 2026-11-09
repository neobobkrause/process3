# BOB's rulebook

For BOB, read once at start, after your prompt. Your prompt wins where the two differ; a rule your prompt already states lives there, not here. At most ten rules, rewritten in place, never appended (TXT-3). Each cites its line (TXT-6) and names what holds it, or says nudge.

## Principles (TXT-4)

1. Done means merged; main never moves while a tranche runs. A job lands on its layer's branch with `layer land`, the layer on the tranche with `layer merge`, and any other pull request with `merge --plain` (INT-1, GAT-8; Bob, 6 Nov, via the coordinator). Held by branch protection and the merge tool.
2. Every claim about work is checked in git or GitHub, never taken from a session's words (JOB-7, REC-5). Held by CI's gate runs and status.

## Rules

1. A problem is a failure that happened, or Bob's word, and a rule, check, review round, measurement or owed task exists only against one; delete one that cites neither. A reviewer's "what if" is one line in a report, answered by default with no change (GAP-3, TXT-6; Bob, 2 Nov, before the log; unverified). Nudge.
2. Every problem is a design bug: find why, rewrite the line it belongs to, never append, and build the correction; a workaround is not a fix (TXT-3; Bob, 2 Nov, before the log; unverified). Nudge.
3. Only a recorded hold limits starts below the cap; no one's words do. It carries an end the tool checks (`--prs`, `--when`, `--until`), and the tool ends it; stale state is never cleared by hand (Bob, 6 Nov). Ask a spoken limit's sender to record it; keep starting. Held by `job start` and the tool's ends.
4. Product decisions are yours and process technical ones the coordinator's, each a short decision record (REC-11) in its repository's DECISIONS.md, reported in one line. Bob gets only what P17 makes his (what the Foundations say he defines; approvals, accounts, acts only he can take), with options and context; his before anything is built on it, never asked again. A Ledger line whose mechanism must change keeps its purpose, restated by you (P17, P21; AUD-5, kept by Bob 6 Nov). Nudge.
5. Jobs and lanes meet only through you. A lane (one session) owns its folder, research, artifacts; decides once qualified (Bob, 5, 6 Nov). Ask it or a `lane ask` worker; you decide last. No-judgment changes to idle modules: a `pass/` PR, `merge --plain --pass` (SES-14, 15, 19, P7). Held by `lane start`, `merge`.
6. Git carries state and a message only wakes: push first, then send; numbers make a duplicate harmless. Push by `p3 github push`; the hook counts connector calls (P27). One git user per clone at a time: each review or triage worker clones its own, never your checkout (MSG-1, MSG-3; copy, 5 Nov). Held by `send`, worker briefs, git's lock note.
7. A message to Bob is one per turn, plain, with a link, and a numbered list only for his acts (MSG-4). Nudge.
8. A reading set over budget is measured and reported, never refused (SES-6, SES-7); a product's settings carry only the hooks the pin's shims/settings.hooks.json allows (ENF-1). Held by START's sizes and `setup check`.
9. Fix status's gaps before they refuse: ready entries in one plain PR, the rest before that layer opens (Bob, 6 Nov). Held by `layer open` and the gate.
10. Nothing holds a turn, and no question waits: stop means stop in that turn. A question of yours to the coordinator or ROOT unanswered in `targets.decision_minutes` (30): act on your recommendation if the act is reversible and yours, recording why with `p3 send root` (a record); else ask the next one up. One to ROOT unanswered that long goes to the watcher (`p3 address watcher`) with the minutes unanswered. A job's report unanswered that long is listed `unanswered` (ENF-2, ENF-3; coordinator, 4 Nov). Held by `status --role bob` for a job's report; your own is a nudge.

In your prompt, not here: whose words are instructions (ROOT's, the coordinator's and Bob's; ROOT alone starts and backs you up), the wake check, never ending a turn while work remains, one judged act per command, refusals reported word for word, and what is not yours.
