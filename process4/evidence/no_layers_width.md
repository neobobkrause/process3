# Scheduling from the total order and uses graph alone: figures for the work that remains

13 Nov 2026. Source: `neobobkrause/civicsmith-copy` at `origin/tranche` (`build/modules.json`, `build/requirements/*.md`), read-only, and PD-25 in `neobobkrause/process3` `DECISIONS.md` at `origin/tranche`. Scripts: `/tmp/claude-0/-home-user/5fb00928-6c32-53d3-a000-4e1f643cb17f/scratchpad/audit_d/remaining.py` and `dag.py`.

## Summary

- **65 of 220 modules still carry an unmet mark** (466 marks). 43 of them carry a T53 mark (362 marks).
- **Under PD-25's rule the remaining work is narrow:** 21 waves for the 65 modules, 3 ready at once at the median, 7 at most. A bound above 7 never binds.
- **With the three order-breaking uses left in, 27 of the 65 can never start,** because `agent-runner`, `agent-worker` and `ai-gate` sit on a cycle and have work.
- **Starting earliest-first up to a bound gets the width and gives up the order:** at a bound of 24, 50 of the 65 modules run beside an upstream module that also has work.
- **A notification touches far fewer modules this round than on the whole map:** median 3 direct users with work, maximum 19.
- **Layers add no ordering.** No pair of modules is ordered by layer and not by list position.

## How marks were counted

The convention is in `build/requirements/README.md`, rule 5: "A requirement main does not yet meet is marked right after it: `*(not yet met: <row or entry>)*`." There is one requirement file per module (220 files for 220 modules, plus the README), so a file's marks are its module's marks.

Counted with `git grep -c -E '\*\(not yet met:'` over `build/requirements` at `origin/tranche`, README excluded.

| Count | Marks | Modules |
| --- | --- | --- |
| Every unmet mark | 466 | 65 |
| T53 marks only (`*(not yet met: T53`) | 362 | 43 |
| Older tranche marks (T52 32, T50 6, T49 3, T47 2, N345 2) | 45 | |
| Other entries (base-red 16, coordinator and BOB rulings, lanes, walk, job references) | 59 | |
| Marks placed on an `R` id | 152 | |
| Marks placed on an `F` (found) id | 57 | |

- The product-side analysis gave 357 T53 marks and 51 found marks. This count gives 362 and 57. The five and six extra were not reconciled; 338 T53 marks are the bare `*(not yet met: T53)*` and 24 carry trailing text such as "waits on ...".
- `origin/layer/14` has the same 362 T53 marks and four fewer marks overall (462).
- A mark is not the same as startable work. Some marks say they wait on a decision or on another module. PD-25 also counts "an owed reopen or an outstanding reschedule" as work and "BLOCKED" as settled; neither can be read from the tree. The figures below treat every module with a mark as having work.

**Distribution of marks per module.**

| | All unmet marks (65 modules) | T53 only (43 modules) |
| --- | --- | --- |
| Median, mean, maximum | 2, 7.2, 57 | 3, 8.4, 57 |
| Modules with 1 mark | 21 | 11 |
| 2 to 4 | 23 | 16 |
| 5 to 9 | 5 | 3 |
| 10 to 19 | 9 | 7 |
| 20 or more | 7 | 6 |

**By layer (modules with work, marks), all unmet marks.** Layer 1: 3, 3. Layer 2: 4, 7. Layer 3: 2, 3. Layer 4: 2, 3. Layer 5: 4, 9. Layer 6: 10, 66. Layer 7: 1, 1. Layer 8: 5, 16. Layer 9: 0, 0. Layer 10: 2, 2. Layer 11: 32, 356. Three quarters of the marks are in layer 11.

**Largest.** `screens-document` 57, `agent-worker` 41, `screens-settings` 32, `journey-check` 31, `screens-investigate` 27, `screens-intake` 25, `screens-intake-rounds` 21, `control-plane` 17, `screens-publish` 15, `store-request` 15, `interface-shell-t53` 14, `screens-ai` 14.

**The 65 modules, in the total order, with marks.** runtime-limits 1, bundler 1, file-scanner 1, jurisdictions-c 3, ai-catalogue 2, ai-accounts 1, credentials 1, file-safety 2, mail-door 1, member-upload 2, reading-pipeline 1, events 1, local-facts 1, bias 1, registers 6, inquiry 2, citation 2, contradiction 4, run-rules 1, agent-model 2, ai-use 1, ai-runs 2, agent-runner 7, agent-worker 41, ai-gate 4, investigation 1, case-grammar 2, public-read 2, ratification 2, case-disclosures 8, case-inputs 2, following 1, scheduler 1, op-grades 3, affordances 1, machinery-producers 1, queue-producers 2, notice-producers 3, queue 1, surface-declarations 7, admission 2, signin-door 2, store-jobs 1, store-request 15, interface-shell-t53 14, screens-settings 32, screens-ai 14, screens-intake 25, screens-intake-rounds 21, screens-daily 10, screens-inquiry 14, screens-document 57, screens-document-beta 13, screens-investigate 27, screens-publish 15, screens-public 2, screens-action 3, screens-plan 1, control-plane 17, plane 11, installer-steps 5, installer 2, installer-places 3, stewards 1, journey-check 31.

## The rule used

PD-25 (Bob, 9 Nov): "A module is ready when it has an unmet mark, an owed reopen or an outstanding reschedule, has no open job, and every module upstream of it in the uses graph is settled (no open job, no unmet mark, no outstanding reschedule; BLOCKED counts as settled)."

"Upstream" is taken as transitive: every module reachable through uses, including through modules that have no work. Each job is one time unit. The three order-breaking uses are `hypotheses` → `steps`, `agent-runner` → `ai-gate` and `agent-drafts` → `agent-worker`. The last two close a cycle through `agent-runner`, `agent-drafts`, `agent-worker` and `ai-gate`. PD-25 itself allows for mutual use: "Modules that use each other land in map order".

## 2. Waves under PD-25, modules with work only

| | Modules with work | Never start | Waves | Ready at once: median, mean, max | Waves of width 1 | Wave sizes |
| --- | --- | --- | --- | --- | --- | --- |
| All marks, (a) three uses kept | 65 | **27** | 16 for the 38 that start | 2, 2.4, 4 | 3 | 3, 2, 2, 4, 4, 2, 2, 3, 2, 3, 1, 2, 3, 3, 1, 1 |
| All marks, (b) three uses removed | 65 | 0 | **21** | **3, 3.1, 7** | 2 | 3, 2, 2, 4, 4, 2, 3, 3, 2, 4, 2, 3, 4, 5, 2, 2, 1, 6, 7, 3, 1 |
| T53 only, (a) kept | 43 | **23** | 10 for the 20 that start | 2, 2.0, 4 | 4 | 2, 4, 3, 2, 2, 1, 3, 1, 1, 1 |
| T53 only, (b) removed | 43 | 0 | **13** | **3, 3.3, 7** | 1 | 2, 4, 3, 3, 2, 2, 4, 3, 2, 7, 7, 3, 1 |

- **Why 27 never start in (a).** `agent-runner`, `agent-worker` and `ai-gate` each have unmet marks and each is upstream of itself through the cycle, so none is ever settled. The other 24 are downstream of them: `op-grades`, `affordances`, `queue`, `surface-declarations`, `admission`, `signin-door`, `store-request`, `interface-shell-t53`, all thirteen `screens-*` modules, `control-plane`, `plane` and `journey-check`. Those 27 hold 390 of the 466 marks.
- **With a bound, in (b).** All marks: 22 rounds at a bound of 6, 21 at 12 or 24. T53 only: 14 rounds at 6, 13 at 12 or 24. A bound of 12 or more changes nothing.
- **Why it stays narrow.** A module with work has a median of 25 upstream modules that also have work (maximum 52). Only 3 of the 65 have none.
- **Against the whole map.** The earlier figure was 65 waves for 220 modules at a mean of 3.4. The remaining work is a third as long and no wider.

## 3. The looser rule: earliest-first up to a bound N

Modules with work are taken in list order, N at a time, without waiting for upstream modules with work. With equal job durations that is batches of N. A module is exposed when a module upstream of it that also has work is in its own batch, so an interface change can land under it.

**All unmet marks, 65 modules.**

| N | Batches | Run beside a transitive upstream module with work | Of those, beside a direct one |
| --- | --- | --- | --- |
| 6 | 11 | 40 (62%) | 32 |
| 12 | 6 | 43 (66%) | 37 |
| 24 | 3 | 50 (77%) | 43 |

**T53 marks only, 43 modules.**

| N | Batches | Run beside a transitive upstream module with work | Of those, beside a direct one |
| --- | --- | --- | --- |
| 6 | 8 | 24 (56%) | 19 |
| 12 | 4 | 32 (74%) | 25 |
| 24 | 2 | 35 (81%) | 31 |

- These are with the three order-breaking uses removed. With them kept, the all-marks counts are the same, and two modules also run a batch ahead of a module they depend on: `agent-runner` uses `ai-gate` directly, and `agent-worker` reaches it through the cycle.
- The loose rule cuts 21 waves to 3 batches at N = 24, and puts three quarters of the modules beside something they depend on.

## 4. Users that also have work

What a notification from one module with work would touch in this round.

| | Direct users with work: median, mean, max | Transitive users with work: median, mean, max | Same modules, users in the whole map: direct median and max; transitive median and max |
| --- | --- | --- | --- |
| All marks (65) | 3, 4.3, 19 (`runtime-limits`) | 24, 23.9, 60 (`ai-catalogue`) | 6 and 58; 40 and 190 |
| T53 only (43) | 2, 2.6, 15 (`runtime-limits`) | 8, 13.6, 41 (`runtime-limits`) | 4 and 58; 11 and 190 |

- 12 of the 65 modules have no direct user with work, and 10 have no user with work at all.
- Whole-map figures for all 220 modules were 8 direct at the median and 213 at most. The modules with work are mostly late in the order, so they have fewer users than the map's foundations do.
- Under PD-25's rule every one of these users starts after its provider is settled, so the notice reaches a job that has not started. Under the loose rule the exposed counts in section 3 are the jobs it reaches mid-flight.

## 5. What the layer construct adds to scheduling

On this map the layers add no ordering that the list does not already give. The list order never steps down a layer, so every pair of modules in different layers is ordered the same way by list position: 0 of 20,473 cross-layer pairs are ordered by layer and not by position. No use points to a higher layer, which also follows from the order. What a layer adds to scheduling is a barrier: under "one layer at a time" a module waits for every module of the layers below, used or not. 4,907 of those 20,473 pairs (24%) have no uses path at all, and a module has a median of 18 lower-layer modules (158 at most) that it does not use even transitively. Among the 65 modules with work, 267 of 1,511 cross-layer pairs are barrier-only. The barrier costs width: with layers kept and order held inside each layer, the remaining work takes 32 waves; without layers, 21. Starting a whole layer at once takes 10 rounds (3, 4, 2, 2, 4, 10, 1, 5, 2 and 32 modules) and breaks the order inside each. What the layers do carry is not scheduling: each has a stated contract in `layers.md` (layer 1, for example, has "No access to the record"), and they are where the owner decided which modules carry product capability. That is a rule about where a module may be placed in the order, not about when its job runs. PD-25 already recorded the same conclusion in the owner's words: "Because modules are in a total order, perhaps holding jobs in upper layers until an earlier layer closes isn't necessary."

## Limits

- Equal job durations are assumed throughout. Real jobs varied (26 to 36 minutes median from start to merge on good days).
- Marks were counted by pattern, not by reading each requirement. The T53 total differs from the product-side analysis by five.
- Owed reopens, outstanding reschedules and BLOCKED jobs were not read; the state branch and job branches were not consulted.
- The map changed 40 times in the week of Process3. These figures hold for the tranche tip only.

# Follow-up: the cycle, and a rule based on public marks

Added 13 Nov 2026. Same source and rules. Script for part B: `/tmp/claude-0/-home-user/5fb00928-6c32-53d3-a000-4e1f643cb17f/scratchpad/audit_d/public_rule.py`.

- **The cycle is two declared uses, both added on 4 Nov (PST) to satisfy the imports check.** Each was merged with "No review" as a map-only change.
- **392 of the 466 unmet marks are in the Public part.** 44 of the 65 modules have a public mark; 21 do not.
- **The public-marks rule takes the remaining work from 21 waves to 12** and from 3.1 to about 5 slots in use out of 8. It fills all 8 slots in 2 of 13 rounds.
- **Neither rule fills 8 slots.** Filling them means the loose rule of section 3.

## A. The cycle

Positions are 1-based places in the total order. All six modules are in layer 6.

| Module | Position | Paths |
| --- | --- | --- |
| hypotheses | 96 | `bio-plane/src/hypotheses/` |
| steps | 97 | `bio-plane/src/steps/` |
| agent-runner | 115 | `agent-runner/` |
| agent-drafts | 116 | three files inside `agent-worker/src/`: `draft.mjs`, `action-drafts.mjs`, `untested.mjs` |
| agent-worker | 117 | `agent-worker/` |
| ai-gate | 118 | `ai-gate/src/` |

**Every declared use among the four.**

| Edge | Direction | What is behind it |
| --- | --- | --- |
| agent-runner (115) uses ai-gate (118) | **Later** | `agent-runner/src/run.mjs` lines 7 to 10 import seventeen names from `ai-gate/src/index.mjs` |
| agent-drafts (116) uses agent-worker (117) | **Later** | `agent-worker/src/draft.mjs` line 42 imports from `./ask.mjs` and line 46 from `./signin.mjs`, both agent-worker's files |
| agent-worker (117) uses agent-drafts (116) | Earlier | `agent-worker/src/index.mjs` line 155 imports `handleDraft` from `./draft.mjs`; `ask.mjs` line 47 imports `untestedOf`, `UNTESTED_BAD` from `./untested.mjs` |
| agent-worker (117) uses agent-runner (115) | Earlier | No source import. A cross-script Durable Object binding, `RUNNER`, to agent-runner's class `AgentRunner` (`agent-worker/src/remote.mjs`) |
| ai-gate (118) uses agent-worker (117) | Earlier | `ai-gate/src/run.mjs` line 16 imports `PLANE_OPS` from `agent-worker/src/ops.mjs`; line 17 imports `admitRead`, `readTool` from `agent-worker/src/ask.mjs` |

There are two loops. agent-drafts and agent-worker use each other. agent-runner uses ai-gate, which uses agent-worker, which uses agent-runner. Together all four reach each other.

**The two later-pointing edges.**

1. **agent-runner takes the gate's whole toolkit from ai-gate.** The names are `checkDeclared`, `selectItems`, `verifyChallenge`, `meter`, `scanForSecrets`, `buildManifest`, `sealPayload`, `signBundle`, `PUBLIC_BANK`, `hasPrivate`, `itemById`, `planRun`, `scoreAnswerFree`, `suiteVersions`, `runPublicLine`, `encodeBundle`, `PARTS`. In plain words: the runner's gate run picks the test items, checks the issuer's challenge, meters the run, scans for secrets, and seals and signs the bundle, all with ai-gate's functions. Its tests also import `openSealed`, `parseBundle`, `verifyBundle` and `sha256Hex`.
   - Introduced by PR 401, `bob/agentrunner-uses`, merged 5 Nov 03:50Z (4 Nov 19:50 PST), commit `75c7705dfd`. Subject of the change: "modules: agent-runner uses ai-gate and ai-catalogue (its run.mjs imports them; coordinator ruling 3, ai-gate in its own directory)". Merge note: "No review: plain modules ... (imports gate on PR 394)".
   - It did not close a loop on that day, because PR 375 (`bob/aw-drop-runner`) had removed "agent-worker uses agent-runner" 77 minutes earlier. PR 612, `bob/agent-worker-uses-runner`, restored that use on 6 Nov 02:07Z, commit `0df62bf17b`: "agent-worker uses agent-runner (its F2 test imports agent-runner/test/helpers.mjs per the coordinator's 5 Nov 20:18 F2 ruling); unblocks PR 569". That closed the three-module loop. No such test import is in `agent-worker/test` at the tip.
2. **agent-drafts takes the worker's read controls and sign-in trace from agent-worker.** The names are `admitRead`, `readTool` and `ASK_DECLARED` from `ask.mjs`, and `doorTrace` from `signin.mjs`. In plain words: the drafting code uses the worker's check on which reads are allowed, its read tool, its declared limits on an ask, and the headers that trace a member's sign-in.
   - agent-drafts was split out of agent-worker by PR 113, `bob/split-agent-drafts`, on 4 Nov 04:04Z. The map's status line says it was split "by copy (no from) for size", which is the requirements size cap. From that moment agent-worker used agent-drafts.
   - The reverse use was added by PR 371, `bob/agentdrafts-uses`, merged 5 Nov 01:46Z (4 Nov 17:46 PST), commit `93c817d1a7`. Subject: "modules: agent-drafts uses agent-worker (its files import their agent-worker siblings; the imports check reads this file)". Merge note: "No review: modules file only". This was the first later-pointing edge in the map.

**hypotheses (96) uses steps (97).** Later-pointing, and not a loop: steps declares no use of hypotheses. There is no source import. `bio-plane/src/hypotheses/index.mjs` is handed a steps instance (`deps.steps` or `bindSteps`), with the comment "`steps` handed in, never imported", and calls its `registerRivalSource` and `stepsOfRival`. In plain words: hypotheses registers itself with steps so that a step can be opened from a rival explanation and the rival can list what its steps produced. One test, `bio-plane/test/m/hypotheses/rivals-legs.test.mjs` line 9, imports `stepsOf` from steps. Introduced by PR 1032, `bob/hypotheses-uses-steps`, merged 8 Nov 12:36Z, commit `e1bac7eda3`: "BOB: completion round 2 gains hypotheses uses steps (steps R31)". "No review".

**What the history shows about the check.**

- Both loop-making edges were declared because the imports check demanded that the map match the code. Nothing compared the new use with the modules' positions.
- The map had four later-pointing uses for three hours on 5 Nov (after PR 474, `bob/cap-splits-1`). PR 503, `bob/modules-layer-order-2`, brought it back to two. So order was repaired by hand once, and these two were left.
- The first Process3 snapshot of the map (3 Nov) had none.

Method: `git log -S` was not cheap on this clone (it fetched each historical blob and set off git's automatic repacking), so it was stopped. The dates come from reading `build/modules.json` at each of the 40 first-parent commits that changed it from 3 to 8 Nov.

## B. Public and private marks

**How the files separate the parts.** Every one of the 65 files has a `## Public` heading (with `### Purpose` and `### Provides`), and 60 have a `## Private` heading (with `### Uses`, `### Invariants`, and often `### Satisfies` and `### Suggestions`). 18 also have `## Open for Bob`, and a few have other trailing sections. A mark was assigned to the `##` section it sits under. This split is reliable: it is by heading, not by judgment.

| Section | Unmet marks |
| --- | --- |
| Public | 392 (352 under `### Provides`) |
| Private | 50 (31 under Suggestions, 16 under Invariants) |
| Open for Bob | 16 |
| Other trailing sections ("Decided by BOB", "Old ids", "Later requirements") | 8 |
| Total | 466 |

| Modules | Count |
| --- | --- |
| With work | 65 |
| With at least one unmet Public mark | 44 |
| With no unmet Public mark | 21 |
| Of those 21, with Private marks only | 11 |
| Of those 21, with marks in "Open for Bob" or another trailing section | 10 |
| With both Public and Private marks | 9 |

The 21 with no public mark: bundler, file-scanner, ai-catalogue, ai-accounts, credentials, member-upload, events, inquiry, run-rules, ai-gate, investigation, case-grammar, public-read, ratification, case-inputs, scheduler, machinery-producers, queue, admission, signin-door, store-request. They hold 47 marks; store-request has 15 of them.

**Readiness under the public-marks rule.** A module with work is ready when no module upstream of it, transitively, has an unmet Public mark and is unfinished. The three order-breaking uses are removed. Jobs are of equal length.

| | Strict (PD-25) | Public-marks rule | Public rule, counting "Open for Bob" and other trailing marks as public |
| --- | --- | --- | --- |
| Waves | 21 | **12** | 15 |
| Wave sizes | 3, 2, 2, 4, 4, 2, 3, 3, 2, 4, 2, 3, 4, 5, 2, 2, 1, 6, 7, 3, 1 | 5, 6, 6, 6, 4, 5, 6, 4, 11, 8, 3, 1 | 5, 6, 5, 2, 5, 2, 4, 4, 4, 5, 3, 9, 7, 3, 1 |
| Ready at once: median, mean, max | 3, 3.1, 7 | **5.5, 5.4, 11** | 4, 4.3, 9 |
| Upstream modules holding a module back: median, max | 25, 52 | 12, 32 | 17, 41 |

With the three uses kept, 27 modules still never start under any of the three rules, because agent-runner and agent-worker have public marks.

**Eight slots with continuous refill.** With equal job lengths, every job ends at the same moment, so refilling a slot the moment a job ends is the same as running in rounds. Staggering only appears when job lengths differ; a second row gives that case.

| 8 slots | Strict (PD-25) | Public-marks rule |
| --- | --- | --- |
| Elapsed, job-units, equal lengths | **21** | **13** (12 if the longest chain is started first) |
| Average slots in use | **3.1 of 8** | **5.0 of 8** (5.4) |
| Share of time all 8 are full | 0% | 15%: 2 of 13 rounds |
| At a bound of 6: elapsed, average | 22, 3.0 | 13, 5.0 |
| At a bound of 12 or more: elapsed, average | 21, 3.1 | 12, 5.4 |
| Job length taken as the module's mark count (466 mark-units in all; 58 would be perfect packing): elapsed, average in use | 188, 2.5 | 162, 2.9 |

- The public-marks rule shortens the remaining work by about 40% in job-units and uses about five slots. It does not use eight.
- When job length follows the number of marks, the gain is much smaller (188 to 162), because the long jobs sit on one chain: the screens modules in layer 11 hold 356 of the 466 marks, nearly all of them public, and they depend on each other.
- The rule helps where a module's remaining work is private. Only 21 modules are like that, and they are the small ones.

**What filling 8 slots would cost.** Under the loose rule of section 3 with N = 8 (9 batches), 37 of the 65 modules run beside an upstream module that has work. 29 run beside an upstream module that has an unmet Public mark, and 20 of those beside a direct one. Those 29 are the jobs under which, by the candidate rule's own premise, an interface can change.

**One thing the premise does not settle.** A public mark says a published requirement is not yet met. The requirement's text is already there for users to read, so meeting it changes behaviour and not necessarily the stated interface. How often meeting a public mark also changes the text its users rely on was not measured here.

## Limits of the follow-up

- Equal job lengths, as before. The mark-count row is a sensitivity run, not a forecast.
- "Open for Bob" marks were kept out of the public count in the main column; the third column shows the effect of counting them in.
- The pickaxe search that was stopped fetched some historical objects into the clone and triggered git's automatic repacking. No working-tree or sparse setting was changed.
