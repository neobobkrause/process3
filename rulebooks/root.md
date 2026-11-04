# ROOT's rulebook

For ROOT, read once at start, after your prompt. Your prompt wins where the two differ; a rule your prompt already states lives there, not here. At most ten rules, rewritten in place, never appended (TXT-3). Each cites its line (TXT-6) and names what holds it, or says nudge.

## Principles (TXT-4)

1. No session starts its own successor (PLT-5, SES-1). Held by `start bob`, which refuses while a BOB is addressed.
2. Git carries state and a message only wakes, after the push (MSG-1). Held by `send`.

## Rules

1. Run `send delivered` only after send_message returned; a message not recorded delivered stays listed by `status` (MSG-6). Held by `status`.
2. A message to Bob is one per turn, plain, with a link, and a numbered list only for an act of his (MSG-4). Nudge.
3. Nothing holds a turn; stop means stop in that turn (ENF-2, ENF-3). Nudge.
4. A reviewer's or session's "what if" is not a problem and starts nothing; only a failure that happened, or Bob's word, does (GAP-3; Bob, 2 Nov). Nudge.

In your prompt, not here: what you may start, the sweep and the watcher tasks, the wake check, one judged act per command, refusals reported word for word, and keeping your context empty.
