Process3 coordinator handoff, 4 Nov, about 14:50 UTC, from session_01RAN5enDCAZZfNxRd85MZ9T (context 59%; Bob asked for a refresh). Bob is the owner; his words are instructions. You are the Process3 coordinator. Bob defines and you decide everything technical (P17). Bring Bob only the acts only he can take (rule 9). Plain words, no em-dashes.

BOB'S WORDS TODAY (binding):
- about 07:35: "These are technical details, and I've already give sufficient approvals for you to do them yourself."
- 08:35: "Stop being overly cautious and focus more on urgency."
- about 14:50: he agreed the 4-step plan below. "Continue to drive the copy through close and release now. But let's also run a design review of the trust layer, aimed at simplifying it, not adding to it."
- Standing approvals: Bob rewrote them in all three repos' CLAUDE.md through his own website commits: process3 tranche 59dc518, copy tranche 9fb1b38, probe tranche 41976d5. They now allow development releases (pre-releases marked development), container-images and pushes of the product's images, product workflow changes through gated merges, development signing secrets, and design-stream generated files. Still Bob's: public releases, installs outside development deployments, settings and rulesets, his offline keys, email. Bob's list is EMPTY.

START, in order:
1. Record your id as `coordinator` in process/config.json on the copy's tranche and the probe's tranche, each through a short session, as copy PR 147 and probe PR 217 did. The probe merge waits for its gate to finish. Target the tranche only, never main: a prompt allowing "else main" was refused.
2. Move my two scheduled tasks to yourself: create the same prompt bound to you, then delete mine. They are trig_01Szv7wpso7xiWG9TcP6qn27 (16 Nov 17:00 Phase 1 survival read) and trig_01VSivqYVuzK28YPj1FZq6DG (18 Nov 17:00 Phase 2 survival read).
3. Tell BOB, ROOT and the open build (below) your id. Then archive me.

THE PLAN (Bob agreed, 4 Nov about 14:50):
1. Drive the copy through its first tranche close to main, then a development deploy, a development release (`release dev`, draft or pre-release marked development) and an install from scratch. Defects found there come first. This is the main unknown: none of it has ever run.
2. A design review of the trust layer (gate.mjs, merge.mjs, record.mjs, anchor.mjs, workflows.mjs and the shims), aimed at SIMPLIFYING, not adding: fewer exceptions, one trusted-base rule, allowlists of shapes instead of parsers. Start it as a read-only review session that writes its findings to notes/. A build follows only for clear wins. Measured case for it: the tool grew from 5,750 to 10,166 lines (non-test .mjs) between 7f50bdd and the tranche tip, across 42 process3 PRs. The approvals, workflow and generated rules each needed 4-5 review rounds, each finding a new bypass.
3. Cap the tool's size: no net growth without a cited reason, and remove what the review shows is dead (rule 8).
4. Write today's measured results into the Build Plan's gates (doc cccf8cb8; notes/gate-map-4nov.md holds the map, as of 01:20), and record where the plan and practice differ.

STATE AT HANDOFF:
- process3 tranche f9e82ad holds PRs 92-108. Copy pin f9e82ad (copy PR 254, 14:19). No pin move is open.
- Open process3 build: session_01RAN5eoHMyBHdqpZXE5Karw ("old notices"). membership:77 and credentials:74 hold 136 of 201 open notice slots, and `notice triage` cannot read them ("no provider notice on process-state"). The build makes them triageable or migrated, withdrawn notices closed, and report counts agree with triage. It reports to my id: tell it yours.
- Copy roles, under the new approvals hash ae592a58...:
  - ROOT session_01RAN5emK1snYonbEbVPHbAP, sweep trig_01CvCFiaqFxxDJJ6jxh4VVCJ, fires at :14 hourly.
  - watcher session_01RAN5eo6oiiRJ2fcevsUgoN, daily trig_0112LZi3YvbYtEDcRq7BJ7rS.
  - BOB session_01RAN5eomXNvM23EMwtLVBHG.
- In flight on the copy:
  - ratification PR 247: job sync to the new pin, then a code gate run and merge.
  - wizard-scripts reopened, PR 255, to restore scanmirror and officeconfirm.
  - 16 workers triaging strength:176, ai-accounts:188, case-grammar:202 and ai-catalogue:194.
  - affordances and wizard-scripts were reopened for found work: use `--reopen`, since a found mark on a module with a pinned-id test goes red.
- Urgency, measured at about 14:20:
  - ready-to-start median 2.0 min, worst 25.2 (09:35, before the fixes), n=69;
  - green to merge median 10.5 min;
  - notices answered at the merge in 18-24 s, and by BOB's workers in 2-3 min;
  - job costs recorded at the merge (`merge --job-cost-usd`), $1-$5 per job.
- First tranche close prerequisites, all built (PRs 92, 94, 96, 97, 98, 101): bootstrap route (the copy's main has no Process3); workflow diffs judged by shapes S1-S3; base-red tolerance excluded at tranche-into-main. Still needed: every layer closed and the notice backlog cleared. The close does not fire container-images; it runs on a dist/cut-* push or by hand. The first dist/cut-* push will publish reader-container, which the new approvals allow.
- Release prerequisites, unmeasured on the copy: an assemble script (the copy had none at 01:20), an install-from-scratch fixture, and an upgrade test in CI.

HOW TO WORK (learned today):
- Builds: one fresh review and one fix pass. At most 2 rounds for the gate, record or merge. Past 3 rounds, narrow the scope.
- Pin moves: one at a time, through a short copy session that runs `pin move ... --report <your id>` and starts the printed session. Include `setup check --at HEAD` first.
- Re-measure with a short read-only copy session (`metrics report`, `report tranche`), and schedule a check-in with send_later so you are woken.
- GitHub returns intermittent 5xx; retry pushes with backoff.
- Do not take product questions; BOB decides them. Step in only when Process3 is at fault.

Detail of every measured finding, with times: notes/coordinator-findings-3-4nov.md.
