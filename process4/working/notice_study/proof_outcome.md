# The proof of the notice method: outcome

15 Nov 2026. For Bob and for the main Process4 session. Written by Claude (the study session). Nothing here is in force.

Four words are kept apart. *Measured*: counted by a script. *Estimated*: worked out from measured figures. *Judged*: somebody's reading; it says whose. *Unproven*: never run.

## Where it is

The proof session's report is `notice-proof/PROOF_RESULT.md` on branch `notice-proof` of `neobobkrause/process3-probes`, at commit `10ad3d98a41e651a132be73f5c0390642cc891e2`. Its rules, results and every change are beside it in `notice-proof/`. It ran from 01:00 to 14:43 UTC on 15 Nov 2026, and its session record shows about $99 spent.

## What it did

It built the tool and a made-up product of eleven modules holding every route between modules that the study found. It then ran 150 changes: 29 planned, 12 attacks of its own, and 109 written blind. "Blind" means by a fresh helper that had seen no results, attacking the newest design. It built seven designs of the rules, each answering the failures of the round before, and described an eighth without building it. It stopped on Bob's words of 15 Nov: "Stop, write it up. It's usable, even if there's an occasional extra unnecessary notice sent out. It's 2 orders of magnitude better than the old method."

## Its main findings, and what I checked

| Finding (the proof session's) | Checked by the study session against its committed data |
| --- | --- |
| On design 7, all 133 changes written before that design were told exactly as the rules say | Agrees: the history file shows 0 holes and every answer matching the rules on those 133 |
| Holes found by each blind round, designs 1 to 7: 5, 8, 15, 6, 7, 10, 8; no downward trend | Agrees: 59 holes in 109 blind changes |
| Over all 150 changes, design 7 sent 182 notices, 111 of them for nothing; telling every declaring module would have sent 474, 376 for nothing | Agrees with its comparison file |
| 28 users that needed a change went untold on design 7 | Agrees with my own recount from its tables |
| "All 40" untold users that needed a change or broke had a failing test | My recount from the same tables finds 50, not 40; I could not reconcile the definitions. In all 50 the user's own tests failed, so the conclusion holds |
| In the blind rounds, 66 of 70 untold users had a failing test | Not checked |

## Design 8, which it recommends

It is not built and not run. It keeps design 7's 28 rules on who is told, drops design 7's 23 new refusals, and adds three rules:

- **Rule 52.** "Accepts more", the one difference that tells nobody, is accepted only when TypeScript's own type checker confirms it. The proof session records that Bob chose this fix in that session on 15 Nov. I have not seen his words there.
- **Rule 54.** No version of the tool is accepted while any recorded change is answered worse than before. The recorded changes are the tool's own tests.
- **Rule 53.** After every provider change, the tests of every module that uses it, directly or through another module, run before the change merges, and a failure stops the merge. This is the proof session's recommendation. Nothing it records shows Bob approved it.

## My assessment

This is my judgment, the study session's.

1. **The proof answered the question.** On the changes it can see (names, fields, kinds, operations called by name) the method decides rightly. It cannot be made complete, because a user can depend on things no written interface records. What it misses has, in every case recounted, shown up as a failing test of the user.
2. **Rule 53 as written would cost more than the old method on the real product.** On today's module list a module has on average 79 users directly or through another (measured). Over the 178 recorded changes rule 53 would have run about 14,500 module test runs (estimated from the module list), against Process3's 2,707 notifications. One user's tests took about three minutes here (measured, one module). That is the reverse of Bob's goal. It is also a new gate on every merge, where Bob has said no new tests, gates or checks.
3. **Without rule 53 the misses are caught later, not never.** They are caught when the user's own job next runs its module tests, or in the internal or external walk. That is what Bob accepted on 15 Nov in calling the method "usable".
4. **"Two orders of magnitude" is still not measured.** The proof's mix of changes was chosen to attack the tool, so its 2.6 times fewer notices is no guide. The real record is the guide. There, 74 of 2,707 notifications were needed (judged), and 64 of 178 changes would have sent nothing even with no comments added (measured). The proof session and I agree on the next step that measures it: comment a cluster of real, heavily used modules and replay their recorded changes with the tool.

## What is Bob's to decide

1. **Rule 53, the test run before each merge.** I recommend no, for the cost in point 2 above.
2. **The 23 refusals of design 7.** Each is listed, one line each, in the proof's report under "Every rule added beyond the brief's nine points". I recommend none, beyond the two Bob already approved. They answer attacks written to defeat the tool, and they refused honest code in every blind round.
3. **Whether to run the replay on real modules** before the method goes into Process4's definition.

Design 8's other rules on who is told, and rule 54, are technical. I would take them as the proof session recommends.
