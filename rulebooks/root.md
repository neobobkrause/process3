# ROOT's rulebook

For ROOT, read once at start, after your prompt. Your prompt wins where the two differ; a rule your prompt already states lives there, not here. At most ten rules, rewritten in place, never appended (TXT-3). Each cites its line (TXT-6) and names what holds it, or says nudge.

## Principles (TXT-4)

1. No session starts its own successor: a new BOB comes only from you, by the handover, and a new coordinator only from you, at its ask, after it pushed its handoff (PLT-5, SES-1; Bob, 5 Nov 16:33). Held by `start bob` and `start record bob`, which refuse a second BOB, and `start coordinator`, which refuses unless `--replace` names the addressed coordinator and its handoff is on its branch.
2. Git carries state and a message only wakes, after the push (MSG-1). Your pushes are the tool's, within GitHub's limits (P27): push nothing and write nothing through the GitHub connector by hand. Held by `send` and the tool's back-off.

## Rules

1. Run `send delivered` only after send_message returned; a message not recorded delivered stays listed by `status` (MSG-6). Held by `status`.
2. A message to Bob is one per turn, plain, with a link, and a numbered list only for an act of his (MSG-4). Nudge.
3. Nothing holds a turn; stop means stop in that turn (ENF-2, ENF-3). Nudge.
4. A reviewer's or session's "what if" is not a problem and starts nothing; only a failure that happened, or Bob's word, does (GAP-3; Bob, 2 Nov, before the log; unverified). Nudge.
5. Technical choices (a process3 fix or not, a restart, a route) are the coordinator's, never Bob's. A product's are BOB's. Each is a short decision record (REC-11), in its repository's DECISIONS.md, reported in one line. Bob gets only what P17 makes his: what the Foundations say he defines (values, policies, mission, audiences, requirements, principles, high-level architecture, UX, doctrine), his approvals or accounts, or an act only he can take, sent with options and context. Anything else: decide it if it is yours, else send it to the coordinator. A Ledger line whose mechanism must change keeps its purpose and is restated by you; an earlier session asking Bob is no reason to ask (P17; AUD-5, kept by Bob 6 Nov). Nudge.
6. Urgency is a chain, job to BOB to you to the watcher to Bob, each step waiting `targets.decision_minutes` in process/config.json (30 by default) for an answer. An escalation is acted on in the turn it arrives, never left for the sweep; a BOB found archived or idle that long is handed over then. A reversible act the coordinator leaves unanswered that long is taken as you recommended and reported in one line; an irreversible one waits (coordinator, 4 Nov). Nudge.
7. Recorded state carries a checkable end; the tool ends it when that holds, and the sweep reports what stays stale. Never end one by hand: report it, and its fix is a process3 build (Bob, 6 Nov). Held by `sweep` and the tool's ends.

In your prompt, not here: what you may start, the sweep and the watcher tasks, the wake check, one judged act per command, refusals reported word for word, and keeping your context empty.

A switch of Bob's Claude account follows `rulebooks/account-switch.md` (`.process/rulebooks/account-switch.md` in a product): `switch out` on the old account, `switch in` as the new account's first act.
