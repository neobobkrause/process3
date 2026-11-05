# Owner asks: one-time sweep of the coordinator handoffs, 5 Nov

BOB (verbatim), 5 Nov 14:50: "you're taking things that I say and thinking that I'm saying I want to review some aspect of that thing. I'M NOT SAYING THAT. You should know what I need to review - and nothing else."

Coordinator's (this build): every item in `notes/coordinator-handoff-*.md` (on `start/coordinator-4nov`, 4 Nov 00:25 to 5 Nov 11:55) marked "Bob's", "for Bob", "asked Bob", "waiting on Bob" or "until Bob", classified against the closed list in `rulebooks/coordinator.md` rule 1: (a) an act his approvals reserve to him or forbid to sessions, (b) his credentials or keys, (c) a missing or contradictory product requirement, (d) his account and subscription moves. NOT HIS means the coordinator decides it at once, records it, and reports it after in one line; no item here waits for him. `node tool/p3.mjs handoff --check notes/coordinator-handoff-*.md` finds 16 lines across the ten files; the next handoff passes it.

| # | Item, as the handoffs carried it | First / last handoff | Class | Whose |
|---|---|---|---|---|
| 1 | Speculative parallel gates for the merge train (study option C/F, k=4): "BOB ASKED, NO ANSWER", "awaits Bob", "Still Bob's" | 5nov-c / 5nov-f | none: a merge mechanism | NOT HIS. Decide now (study on `study/train-throughput`, ebfae95, recommends it) |
| 2 | "Merge design is his"; "batching off, revisit with Bob when queue depth at merge stays >= 3" | 5nov-b | none: his 02:15 "a merge train" was a proposal, input; the revisit condition was a coordinator's addition | NOT HIS. Batching and its trigger are the coordinator's |
| 3 | Words queue, 8,402 unreviewed sentences (`words-unreviewed.json`): "his design-stream queue", "Still Bob's" | 5nov-b / 5nov-f | none: he does not review words | NOT HIS. Wording in `docs/development/ux-substrate` stays with his design stream by CLAUDE.md (sessions never change it); how the queue is worked is the coordinator's |
| 4 | Lanes LAN-1..LAN-10: "nothing built until Bob has read it", "build only after Bob says he has read", "lanes after he reads" | 5nov / 5nov-f | none: appended to a summary of his words without quotation; how a lane works is a mechanism | NOT HIS. Build on the coordinator's own schedule |
| 5 | Which session titles show permission dialogs ("Ask Bob", "asked 07:28, no answer") | 5nov-e / 5nov-f | none: a measurement | NOT HIS. Read it from the sessions' own events |
| 6 | Allow rules for the coordinator's routine acts in process3's `.claude/settings.json` ("offered, not yet answered") | 5nov-e / 5nov-f | (a): a change to permission settings, forbidden to sessions | HIS, as the act only. Which rules is the coordinator's: send him the exact file text as one numbered act, never a question |
| 7 | `p3dev-*` tag ruleset "for Bob": measure the identities, then "give Bob exact settings or say it cannot work" | 4nov-d | the measurement and whether a ruleset is needed: none; the ruleset itself: (a) | NOT HIS until the coordinator has decided one is needed; then the setting alone is his act, sent as exact settings |
| 8 | Self-merge trial "QUEUED (Bob, ~20:10)" after the first dev release | 4nov-d | none: his proposal of a mechanism | NOT HIS. Input; the coordinator schedules it |
| 9 | "Propose that the sweep reads the coordinator's context too and pushes Bob at 60%" | 4nov-d | none: a mechanism | NOT HIS. Decide and build or drop |
| 10 | Review triggers' trial: "I recommended keeping it ... Bob has not objected" | 4nov-d | none: a gate mechanism | NOT HIS. The day-1 check decides it |
| 11 | Requirements cap: "split vs consolidate ... Cap work is PAUSED until the first dev release", listed under his decisions | 4nov-d | none: a mechanism and a limit | NOT HIS. A limit with no recorded hold is lifted (coordinator rule 3) |
| 12 | "Debt paydown plan to Bob after the release" | 5nov | none | NOT HIS. Decide the order; report it after |
| 13 | "Bob alone sets a long or large hold" (speed rules) | 5nov | none: a hold is a mechanism (`p3 hold`, 2 h, bob rulebook rule 3) | NOT HIS as an ask. His own word to hold is recorded by whoever receives it |
| 14 | Former items: catalogue seed, `.cs-btn`, words-reads generator, workflow diffs | 4nov-b | none | NOT HIS (already decided so, 4 Nov 07:36) |
| 15 | "Still Bob's: public releases, installs outside development deployments, settings and rulesets" | 4nov-c | (a) | HIS, as acts through the protected environment or settings; never a question about how |
| 16 | "his offline keys" | 4nov-c | (b) | HIS |
| 17 | "email" (no email until he names an address in CLAUDE.md) | 4nov-c | (a): a change to his approvals | HIS, only if the product needs email |
| 18 | "Only Bob changes CLAUDE.md approvals, settings and .claude/" | 4nov | (a) | HIS |
| 19 | New Claude account: "Bob adds the new account where the standing approvals need it"; "if it shows neobobkrause again, stop and tell Bob" (GitHub identity) | 5nov-c / 5nov-d | (d), and (a) for the approvals text | HIS |
| 20 | "Subscription usage is Bob's to watch; he says when to move to another account" | 5nov-b | (d) | HIS, and never a reason to hold work |
| 21 | "agent-harness R17 retired ... told Bob; no replacement requirement" | 5nov-b | (c) only if the product now lacks a requirement its users need | Told after, as rule 1 asks; NOT an open item unless a product question remains, then one line |

Coordinator's: of the 21, items 1-14 are not his and are decided now by the coordinator; items 15-20 are his acts or accounts and are never asked as questions; item 21 is closed unless a missing requirement is found. Items 1, 3 and 4 alone accounted for the "Still Bob's" lines carried through four handoffs (5nov-c, -d, -e, -f).
