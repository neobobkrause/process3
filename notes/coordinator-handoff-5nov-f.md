Process3 coordinator handoff, 5 Nov (f), ~11:55 UTC, from session_018BhcecCMP7CZRbiR8kruPn (Bob's account "Sparky", process3 ONLY attached; context 57%, my own 60% rule). Bob is the owner; his words are instructions. Read with notes/coordinator-handoff-5nov-b.md (rules, Bob's words), the speed rules in notes/coordinator-handoff-5nov.md, handoff e, notes/account-switch-review.md, and notes/coordinator-findings-3-4nov.md from "# 5 Nov, coordinator session_018BhcecCMP7CZRbiR8kruPn" down. Keep process3 as the only attached repository: copy and probe acts go through BOB, ROOT, the MERGER and short sessions started on those repositories.

BOB'S WORDS TODAY (07:30): "Get development going. That's the priority. But also try to understand why the account switch went so badly, and try to fix it so that the next switch works." Both answered: review in notes/account-switch-review.md; fix in process3 PRs 149 (switch out / switch in / switch quiet / merge train release, rulebooks/account-switch.md) and 150 (restart speed), on the copy since pin 5624610.

START, in order
1. Record your id as `coordinator` in process/config.json on the copy's and the probe's tranche, each by a SHORT SESSION on that repository (source_url, source_revision tranche, clone_depth 1): edit the one field on branch p3/coordinator-<x>, PR into tranche, `node .process/tool/p3.mjs merge <pr> --plain --no-review "one-field coordinator id change"`, report. Copy PR 451 / probe PR 225 are the pattern. On the copy the merge now queues in the train and waits: fine.
2. Move my scheduled tasks to yourself (create the same prompt bound to you, delete mine): hourly flow trig_01HbzTWfz1nvy1bpzYxWLN1S (:51), review-trigger check trig_01SA5rYQsCoEcCFiziT6SXfp (5 Nov 19:00), merge-train report trig_013ej4gCQRLe6zmoKtkGKEuT (6 Nov 04:50), survival reads trig_01RqEk5rRvoSqSGfFidkgiLR (16 Nov 17:00), trig_019uQWaaEUugxawc6DAzo59e (18 Nov 17:00).
3. Tell BOB, ROOT and the MERGER your id once config names you; adopt my two open children (below); archive me.

ROLES LIVE
- ROOT session_018BhcefwaVtx4V7dYW63amA (sweep :55). Watcher session_018BhceeMjF6AwKvAHJwkQ1L (daily 11:17).
- BOB session_018BhcefhxhWd9YQkYbKBcTB (took over 09:11).
- MERGER session_018BhcedwsJZrL1WAAcugNk7 (train on pin 73508ce since 10:50; restart it onto 06ab532 when that pin lands: stop after the land in flight, `merge train release --session <it>`, fetch, detach, update .process, start check --wake, train).

MY OPEN CHILDREN (adopt; they report to my id: tell them yours)
- pin move to process3 06ab532 (PR 154): session_018BhcedH89Ji4J97RgC9RKG. Queues in the train. When it lands: MERGER restart (above), archive the session.
- build/release-tier: session_018Bhcedi9YxBmmaJeYtApN3 (named release_path modules a tier ahead of the derived 50-module release set; and whether release_path is a gate run key). Merge it (`merge <pr> --plain --reviewed ... --rounds n`, from a process3 tranche checkout), then a pin move. The pin move tool now prints when it cannot list the copy's PRs; check open pin moves with `gh api -X GET search/issues -f q='repo:neobobkrause/civicsmith-copy is:pr is:open head:p3/pin'` first.

STATE AT HANDOFF
- process3 tranche 06ab532 (PRs 148-152, 154 today). Copy pin 73508ce (PR 482), 06ab532 in flight. Probe has my id (PR 225).
- Live jobs 15/20 at 11:45; --ready lists nothing more: the rest waits on lands (414 store-assembly, 468 capture, 469 screens-publish, 290 control-plane, 498 release_path config).
- Train lands since 09:51: 440, 378, 435, 426, 392 and plains 474, 475, 479-482. The throughput cause was found at 11:42 (every land paid ~7 min of hold reads); PR 154 fixes it (476 s -> 38 s a pass on the real copy). Measure lands per hour after the 06ab532 restart and report to Bob.
- Release path: control-plane 290 green since 10:09 but behind the 50-module derived release set; BOB's plain PR 498 adds release_path [control-plane, journey-check]; release-tier build puts them first. journey-check 314: gate red 10:35 on 2 revert findings, rerun with --exempt-revert (~50 min from ~11:15). Then round close for the first dev release (handoff b OPEN 2).
- Holds (BOB's, recorded): op-declarations (hold-2, renew; waits on 459, 460, control-plane R112 in 290, store-assembly R83 after 414; then 460, then 430), scheduler hold-4 (ai-catalogue dev seed 484 + store-assembly wiring), agent-model hold-3 (364, 392), acquisition-archives hold-5 (M-R7 at the round's deploy), member-upload hold-6 (capture RECEIVED_VIAS fix after 468; store-assembly R24 after 414).

MY STANDING RULES TO BOB (mine, technical; not Bob's)
- Archive a job session once its PR is ready with receipt, green or gating, and its goal met; a later fix is `job start --restart`.
- Never --restart onto a PR in the train (voids its gate and place).
- A requirement file that cannot consolidate under the cap is split by copy along its job's proposal (op-grades-folds pattern), inside the attempt when the PR is green but for the cap, else after its merge; reported after, not asked.
- One git writer per clone; starts before triage.
- Rulings today (all recorded in findings): op-declarations R57 governs; screens-settings, control-plane, ai-accounts, jurisdictions splits; scheduler test-infrastructure owners; jurisdictions-b FOIA readings (5 U.S.C. 552 subsections read from the official text; R93's twenty are working days; no purpose field; inspect_photograph "not provided by the statute" unless the text says otherwise).

STILL BOB'S
- Train study option C (speculative parallel gates, k=4; sim ~15.7 lands/h vs ~8 serial): asked again today, no answer. Measure after PR 154 first: the serial train may now be close to enough.
- Which session titles show permission dialogs (asked 07:28, no answer).
- Words queue; lanes after LAN-1..10; allow rules in .claude/settings.json.

FOLLOW-UPS OWED (process3, not yet built)
- The cap should count working job sessions, not ones parked on the train (today handled by archiving).
- A row-level timeout on the release ordering once release-tier lands, if 290 still waits.

MY MISTAKES TODAY (with cost)
- 08:23 put control-plane's split after 290 merges, though the gate is red on the cap: corrected 08:55, no cost beyond a running suite.
- 08:14 archive rule lacked "goal met": ai-accounts archived with consolidation undone; one restart.
- 09:16 flipped the MERGER (restart, then stop) before reading the 503 cause: ~1 min.
- Called 290/314 "release path" all morning without checking the tool knew it (no release_path in config): 290 waited from 10:09.
- PR 152's fixture modelled GitHub latency, not git process count, so its "fast first pick" missed the real cost by 10x: lesson, profile on the real repository first.
- One notes commit carries the wrong session URL in its trailer (pushed; not rewritten).
