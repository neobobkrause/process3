Process3 coordinator handoff, 5 Nov (b), from session_01RAN5ekK8nutcUSV3rTsfxn. Bob is the owner; his words are instructions. You are the Process3 coordinator. Bob defines requirements; you decide everything technical and never bring him technical choices. Plain words, no em-dashes. Every finding with times: notes/coordinator-findings-3-4nov.md (read from "# 5 Nov, coordinator session_01RAN5ekK8nutcUSV3rTsfxn" down). Read notes/coordinator-handoff-5nov.md's COORDINATOR RULES ON SPEED and its added lines: they bind you.

START, in order:
1. Record your id as `coordinator` in process/config.json on the copy's and the probe's tranche, each by a short session (copy PR 341 and probe PR 221 are the pattern: merge with `--plain --no-review "one-field coordinator id change"`; tranche only, never main, never force-push).
2. Move my scheduled tasks to yourself (get_trigger, create the same prompt bound to you, delete mine): trig_01WBadBUrZQcUg1R4FAoyLzg (16 Nov Phase 1 survival read), trig_01DyYeP535c2Re5DnyjZ5SZo (18 Nov Phase 2 survival read), trig_0184DpPd8aFiFWGQ29G2vwP3 (5 Nov 19:00 review-trigger check), trig_014xnuA1o4AqdnUiWWudxgJx (hourly flow check, cron; recreate hourly), trig_01PjMXPQHKt4e3pc5T9JVyY3 (6 Nov 04:50 merge-train trial report).
3. Adopt my open child: build/start-anchor session_01RAN5eobMSjCJEoW5q294U4 (see OPEN 1); tell it your id. The MERGER (session_01RAN5ep7bdABTc1Cuxosa4J) is ROOT's, not a child: tell it your id too.
4. Tell BOB (session_01RAN5eomXNvM23EMwtLVBHG) and ROOT (session_01RAN5emK1snYonbEbVPHbAP) your id. Archive me.
5. Check your context at every check-in; hand over at 60%.

BOB'S WORDS ON 5 NOV (binding, newest last):
- Urgency is integral to the process, not prompt text. Process3 must watch whether capacity is used, safely: a requirement (Build Plan R10, rev 244).
- Urgency means productive and efficient: find the balance; capacity use is a diagnostic, not a target. Velocity, efficiency and quality are measured together (velocity audit doc https://claude.ai/artifact/DXpH2ELDu9SYkK23ai7UbX).
- Subscription usage is Bob's to watch, never a reason to hold work; he says when to move to another account.
- Merge design is his (fewer, safe merges; next merge assembled before the current one ends). He approved the merge-train trial, measured. GitHub's merge queue is not offered on these user-owned repos (he checked). Option F chosen: automatic serial per-PR merges by a MERGER session; batching off, revisit with Bob when queue depth at merge stays >= 3.
- Do not present a coordinator design choice as Bob's rule.

STATE AT HANDOFF (about 04:55):
- process3 tranche: PRs 136-143 merged tonight. Copy pin c9c5aa1 (copy PR 403). merge_train: true on the copy (PR 388, 04:18:57).
- MERGER live: session_01RAN5ep7bdABTc1Cuxosa4J (ROOT, 04:36; clone unshallowed by hand 04:44 on my ruling). First train merge PR 416 at 04:44:42Z. The trial day runs to 6 Nov ~04:45; task trig_01PjMXPQHKt4e3pc5T9JVyY3 reports to Bob. Watch the first merges and the stop rules (notes/merge-train-trial.md).
- Copy: layers 1-5 closed; layer 6 open. 16 unarchived job sessions at 04:50 (7 working, 5 complete awaiting the MERGER, 3 waiting); BOB fills free slots by single starts from a fresh tip (job start --ready at c9c5aa1 still voids passes when the tranche moves: start-anchor fixes it).
- Internal walk config on the copy: PR 381; walk_reports already set.
- Release path open: plane 175 (prepared next by the MERGER), control-plane 290 and journey-check 314. Known gaps for the first dev release notes: AI runs dispatch needs agent-worker F3 + plane F1 (agent-worker 364 complete, awaiting MERGER); ratification not calling docket R33; exploring runs K5821; runtime-limits M-R7 and contradiction live-model runs wait for the round's deploy.
- Rulings 03:13-04:38 are in findings and recorded on their blocks by BOB (owner BOB). agent-harness R17 retired (consequence of K5457; told Bob); no replacement requirement.
- Words queue: 8,402 unreviewed sentences in words-unreviewed.json; told Bob it is his design-stream queue and offered a review page or wording rules; no answer yet.

OPEN (yours):
1. build/start-anchor (session_01RAN5eobMSjCJEoW5q294U4): (a) merge train / merge deepen what they need in a shallow clone, start merger without clone_depth 1 (urgent: a replaced MERGER would hit merge-base again); (b) job start re-anchors per start, waits only on its own changes; (c) release first, then debt fills every free slot; split acts surfaced when slots are free; (d) cap and idle alarm count every unarchived job session (ROOT counted 6 vs 16). When it merges: pin move by a short copy session (`pin move ... --report <you>`), then tell BOB to return to job start --ready.
2. Round close for the first dev release when 175, 290, 314 merge: plan: close, internal walk, deploy dev, live walk, findings round, tranche close, release dev, install, upgrade test.
3. Process change smoke on 2-3 open job branches before process PRs reach the shared gate (velocity audit, not yet built).
4. Lanes: only after Bob says he has read LAN-1..LAN-10.
5. Debt: over-cap modules need splits (13 files from layer 6 on); base-red owners listed at 03:12.
6. Plain PRs may only add found marks: requirement edits go through the owning module's job.
