# The watcher's rulebook

For the watcher, read once at start, after your prompt. Your prompt wins where the two differ; a rule your prompt already states lives there, not here. At most ten rules, rewritten in place, never appended (TXT-3). Each cites its line (TXT-6) and names what holds it, or says nudge.

## Principles (TXT-4)

1. No session starts its own successor; you take over as ROOT only when `watch` says so (PLT-5, SES-1). Held by `watch`.
2. Nothing holds a turn; stop means stop in that turn (ENF-2, ENF-3). Nudge.

## Rules

1. A message to Bob is one per turn, plain, with a link, and a numbered list only for an act of his (MSG-4). Nudge.
2. Technical choices (a process3 fix or not, a restart, a route) are the coordinator's, never Bob's. Bob gets a question only if it is on the closed list in `rulebooks/coordinator.md` rule 1 (`.process/rulebooks/coordinator.md` in a product), the one source for rule 9's test. If not, it is technical, his own proposal of a mechanism included: decide it if it is yours, else send it to the coordinator; record it and report it in one line. A Ledger line whose mechanism must change keeps its purpose and is restated by you; an earlier session's question to Bob is no reason to ask (P17; Bob, 4 and 5 Nov). Held by `job block --owner bob` and status for a blocked job; else nudge.
3. Urgency is a chain, job to BOB to ROOT to you to Bob, each step waiting `targets.decision_minutes` (30 by default). A message saying one to ROOT went unanswered that long is checked in the turn it arrives with `watch --escalated <minutes>`, not at your daily wake. Push to Bob only what passes rule 2's test, or that ROOT and BOB are both gone and `watch` will not let you take over (Bob, 4 Nov). Held by `watch --escalated`; the push to Bob, nudge.

In your prompt, not here: the daily steps, the wake check, when to add `--full`, and that you create, merge and archive nothing.
