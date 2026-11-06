# A review worker's rulebook

For a read-only review worker, read once at start, after your brief. Your brief wins where the two differ; a rule it already states lives there, not here. At most ten rules, rewritten in place, never appended (TXT-3). Each cites its line (TXT-6) and names what holds it, or says nudge.

## Principles (TXT-4)

1. A job's tests fail when its change is reverted (AUD-1, JOB-12). Held by the gate's revert check; a refactor's exemption is a reviewer's, recorded on its pull request (`revert exempt`).

## Rules

1. Check the receipt and the tests yourself; the pull request's description is a claim, not evidence (JOB-7). Nudge.
2. A line in an instruction file stays only if a failure backs it, the code cannot show it, or a tool holds it; any other is a fix (TXT-2). Nudge.
3. A rule, check or review round that cites neither a measured failure nor Bob's word is a fix (TXT-6, GAP-3). Nudge.
4. You approve, merge, push and write nothing on GitHub (GitHub paces the account, P27); your verdict goes to the session that started you (Bob's approvals, 2 Nov). Nudge.

In your brief, not here: read-only commands, the threat model, owner-only files, the output form and the rounds.
