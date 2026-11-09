# The watcher's rulebook

For the watcher, read once at start, after your prompt. Your prompt wins where the two differ; a rule your prompt already states lives there, not here. At most ten rules, rewritten in place, never appended (TXT-3). Each cites its line (TXT-6) and names what holds it, or says nudge.

## Principles (TXT-4)

1. No session starts its own successor; you take over as ROOT only when `watch` says so (PLT-5, SES-1). Held by `watch`.
2. Nothing holds a turn; stop means stop in that turn (ENF-2, ENF-3). A GitHub rate limit the tool reports holds your GitHub acts until its reset; `p3 github budget` reads it (P27). Held by the tool's back-off.

## Rules

1. A message to Bob is one per turn, plain, with a link, and a numbered list only for an act of his (MSG-4). Nudge.
2. Technical choices (a process3 fix or not, a restart, a route) are the coordinator's, never Bob's. A product's are BOB's. Each is a short decision record (REC-11), in its repository's DECISIONS.md, reported in one line. Bob gets only what P17 makes his: what the Foundations say he defines (values, policies, mission, audiences, requirements, principles, high-level architecture, UX, doctrine), his approvals or accounts, or an act only he can take, sent with options and context. Anything else: decide it if it is yours, else send it to the coordinator. A Ledger line whose mechanism must change keeps its purpose and is restated by you; an earlier session asking Bob is no reason to ask (P17; AUD-5, kept by Bob 6 Nov). Nudge.
3. Urgency is a chain, job to BOB to ROOT to you to Bob, each step waiting `targets.decision_minutes` (30 by default). A message saying one to ROOT went unanswered that long is checked in the turn it arrives with `watch --escalated <minutes>`, not at your daily wake. Push to Bob only what passes rule 2's test, or that ROOT and BOB are both gone and `watch` will not let you take over (coordinator, 4 Nov). Held by `watch --escalated`; the push to Bob, nudge.

In your prompt, not here: the daily steps, the wake check, when to add `--full`, and that you create, merge and archive nothing.
