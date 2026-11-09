# The direct flow

PD-25 (Bob, 9 Nov 2026): "Because modules are in a total order, perhaps holding jobs in upper layers until an earlier layer closes isn't necessary", and "All jobs of a layer should open at once up to the maximum slot cap." A product's `process/config.json` says `"merge_strategy": "direct"`. No layer branch opens. Every job is cut from the tranche, and its draft PR goes into the tranche. Its rows are on the state branch under `layerflow/direct-<tranche>/`, one file per event: start, run, test, land, reschedule, gate, retest.

The steps, with who runs each (`p3` is `node .process/tool/p3.mjs`):

1. BOB: `p3 status --role bob`, or `p3 direct jobs`. Both list the ready jobs. A module is ready when it has an unmet mark (a found mark too), an owed reopen or an outstanding reschedule, has no open job, and every module upstream of it in the uses graph is settled: no open job, no unmet mark, no outstanding reschedule. A BLOCKED module counts as settled. BOB starts every ready job at once, up to the slot cap, with each `job start <id> --sessions <file>` line. An additive change's `p3 layer retest <id>` takes no slot. `job start` refuses on this module's census gaps, with the fix.
2. The job: works and pushes on its own branch. When its suite passes, it runs `p3 layer publish <id>` with job complete's flags. Publish brings the branch up to the tranche tip and refuses any file outside the module. It runs the module's fast checks and marks the PR ready, and CI's gate runs the module's whole suite. A reschedule for the module halts the run, and publish starts again on the new tranche tip.
3. BOB (the merge tool): `p3 layer land <pr>` once the gate on the PR's tip is green. It refuses when a module it uses is not settled, or when the head does not hold one of their interface-changing lands. At the land, the provider's interface is compared before and after (its exports, its Public / Provides text, a changed test naming a Provides id). A change reschedules every open user, which is a module with a job open or with work not yet landed. BOB delivers the message the land prints to each user whose job is open, with send_message priority now. The change also leaves a provider notice for the other users, which the land triages at once by rule (PD-20). `merge <pr>` refuses a job PR under this flow.
4. The round: every flawed module is ready at once. Once every module is settled, the round's walk is owed (the round-close run). Its findings, recorded by `p3 round next --apply`, make their modules ready for the next round.

Modules that use each other land in map order (the layer map's order, if there is one): the later one waits for the earlier one, and its land reschedules the earlier one.

At the tranche into main, a module whose last change was a land with a verified green gate run of its whole suite is not run again, unless a module it uses changed after that land.

The layer flow (`"merge_strategy": "layer"`, the layer commands and `layerflow/<n>/`) stays in the tool until the copy's open layer 14 merges; DECISIONS.md PD-25 and git history describe it.
