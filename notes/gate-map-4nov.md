# Gate map: Phase 2 gate and Phase 3, against what Process3 measures (4 Nov 2026, about 01:20 UTC)

Sources: Build Plan doc cccf8cb8 (rev 223, exported to build-plan.md beside this file), notes/coordinator-findings-3-4nov.md (to 01:06), notes/coordinator-handoff-4nov.md, process3 README command table, process3 git at 7f50bdd (local origin/tranche; PR 65 is not in this local ref).

Owner key: coord = the coordinator; BOB = the copy's BOB; build = a process3 build or a copy job; Bob = needs his categories, approvals or accounts, or an act only he can take.

## Phase 2 gate

| id | requires (Plan's words, short) | status | evidence | act owed, whose |
|---|---|---|---|---|
| P2-G1 | "Every ready module of layer 1 started at once" | met and measured | 22:18 all five layer-1 jobs started within 4 s | none; coord writes it |
| P2-G2 | "...and merged on green without Bob" | met with one deferral | copy PRs 36, 37, 39, 40 merged; PR 40 needed PR 64 (amended receipt) and gate re-run green 00:52-01:05; runtime-limits BLOCKED on unrecorded M-R7, PR 38 closed unmerged, deferred at layer close 249b62e (R47); jurisdictions 5 marks deferred. ROOT took PR 40's A/B to Bob (P17 breach); coord answered, Bob took no act | coord writes it as 4 of 5 merged, 1 deferred with its reason; BOB records whether a deferral meets "merged" (technical, not Bob's); M-R7 measure owed by a job |
| P2-G3 | "the first job with zero refusals" | owed | no finding records the layer-1 refusal count | coord or BOB reads metrics/refusals rows and the measured rows for the first job |
| P2-G4 | "BOB's idle time while work was ready no longer than one sweep interval per occurrence" | owed (measure built, not read) | PR 47 metrics: `metrics report` bob_idle_by_day from sweep rows. One known occurrence: 23:21 pin move woke no one, BOB idle until the sweep, woken by hand; fixed by PR 59 (merge --plain prints wake BOB). ROOT's sweep deleted 00:05, so no sweep rows until the watcher takes over | coord runs `metrics report`, lists each occurrence; names 00:05 to takeover unmeasured by design (the fault) |
| P2-G5a | "one handover" | met and measured | handover observed five times, 3 Nov | coord writes it |
| P2-G5b | "one silent-BOB replacement ... re-observed after [PR 38's fix] with none lost" | not started | planned: after the new ROOT's first wake of BOB, interrupt BOB; sweep should hand over 2 h later. Five BOB-to-ROOT messages not recorded delivered, "to read before the gate" | coord injects the fault, reads the handover row and `send` undelivered list |
| P2-G6 | "one stopped job replaced from its branch ... by an injected fault and observed in the record" | in flight | first try 22:31 (interrupt, jurisdictions) recovered by BOB's message, not replacement; PR 45 (sweep sees pushed-then-stopped). Second: 01:06 mail-door session archived, branch job/mail-door, draft PR 55, nothing pushed; flag due ~03:06 | BOB restarts with `job start mail-door --restart`; coord reads the start row and restart |
| P2-G7 | "one ROOT replacement by the watcher, ... by an injected fault" | in flight | 00:05 ROOT's sweep trig_01DTWrTNrfiSWcG7Z3JkvP6x deleted (last fired 23:59:30); watcher task to be fired by hand 04:10 (trig_017dnQE5uPvGqPnRQLnQ8PEX) | coord fires 04:10; reads: took over, `start record root`, new sweep task, push to Bob |
| P2-G8 | "one development deploy and walk with its findings entered" | in flight | p3dev-l1 dry run every step "p3dev guard: passed" (names -p3dev-l1, images by digest); real deploy running 01:05; walk next. Run from copy PR 47's branch worktree, not `deploy dev` (copy has no deploy block), so no deploys/dev.jsonl row | BOB finishes deploy and walk, enters findings as found-work entries; coord records the run since the tool row will not exist |
| P2-G9 | "the Phase 1 metrics and the overhead share recorded for every job" (reading set, tokens, gate minutes, denials, per attempt) | owed | PR 47 overhead share per job and layer; README: ROOT has no way to record its own cost and gate runs have no cost, both print unmeasured; BOB loses cost if it ends without a row | coord runs `metrics report`; checks a measured row exists for each of the five jobs; names ROOT and gate cost unmeasured |
| P2-G10 | "ROOT's lifetime estimated from its context per sweep" | not started (nothing measures it) | sweep row holds bob_acts, bob_quiet_h, heartbeat; no ROOT context | coord reads ROOT's context share from its session record at each of several sweeps, or a build adds it to the sweep row |
| P2-G11 | "The next layer opens with Phase 3's layer close, once layer 1's checks pass (INT-4)" | met for the close; next layer not opening | PR 48; layer 1 closed at 249b62e 00:52-01:05. Status then listed only mail-door (layer 3, by plain PR 54) and no layer-2 work: "check why at the gate". Tranche open record: "passed or not shown: check" | coord: find why no layer-2 work; read metrics/tranche-open.jsonl for the 12 acts |
| P2-G12 | "Size: ... sizes against rule 8" | owed | rule 8 baseline 2,914 lines / 12 commands; 3,120 / 20 at 237c02a; 4,543 at fba322a; 5,752 lines (tool/p3.mjs + tool/lib) at 7f50bdd; README command table has 38 rows; BOB reading set 5,973 bytes at 237c02a; ROOT prompt 4,248 > 4,096 trimmed by PR 61 | coord reads lines, commands and always-loaded text per role at the gate tip; cites each rise to a Phase 2/3 row |
| P2-P | Proves, measured at the gate: live count held at the cap; BOB's starting reading set; routing share of BOB's context; refusals by role and act | owed; routing share not measured | live_cap in sweep (24); reading set in status; refusals in `report tranche`; nothing measures routing share | coord reads each; routing share named unmeasured or read from BOB's session record |
| R5 | rule 5: one review and one fix pass; "a second review only for the gate, the record check, the approvals check or the merge tool" | mostly held; two to check | second review held on PR 54 (PR 57 found path traversal), 64, 65. PR 46 changed gate.mjs: one review, a bug fixed, no confirming review. PR 44 changed record.mjs: one review, verdict merge. PR 59 changed merge.mjs: no confirming review, "only its printed next act" | coord records at the gate whether PR 46 and 44 owed a confirming review; if so, run one now |
| R9 | rule 9: the ask-Bob test | fixed in text; one breach | ROOT took a technical A/B to Bob 00:05 (its pin b226aed lacked the rule); rulebooks/root.md rule 5 and bob.md rule 4 now hold the test (PR 61) | coord checks ROOT's and BOB's pins carry it (copy pin 7f50bdd does) |

## Phase 3

| id | requires (Plan's words, short) | status | evidence | act owed, whose |
|---|---|---|---|---|
| P3-M1 | PLT-8: "a pull request or push made by a workflow starts the gate, with the workflow's own token and with Bob's" | partly measured | GITHUB_TOKEN push starts no workflow (run 41733911709); workflow PR creation blocked by repo setting; Bob's token not run (P3_PROBE_OWNER_TOKEN not set; session pushes start workflows, run 41735339482) | BOB records "Bob's token not needed" with the reason (rule 2), or keeps it and it becomes Bob's (token) |
| P3-M2 | PLT-8: "a ruleset change by a workflow with Bob's token" | not started | no finding; sessions may never change repository settings | BOB decides: drop with reason (no public release, no ruleset need) or it is Bob's (his token, his settings) |
| P3-M3 | PLT-8: "a scheduled workflow firing on time" | owed (unmeasured) | cron runs on the default branch only, hour-start delays per docs | build: a schedule on the probe's main can land only through the probe's tranche PR to main; or BOB names it unneeded (nothing in the release path is scheduled) |
| P3-M4 | PLT-8: "the longest job a runner allows, against the full regression" | met and measured | 6 h limit vs longest gate job 270 s; copy regression.yml 120 min | coord writes it |
| P3-M5 | PLT-8: "signing with a test key held as a secret and cutting a draft release" | met and measured | 4b PASS, Ed25519, secret masked, draft, run 41735339840; draft has no tag until publish, so the shim pushes the tag (PR 52) | coord writes it |
| P3-B1 | backlog: "an organization-owned product names its approver by the owner's own onboarding commit (process3 PR 26)" | not started | README Known limits: org-owned onboarding held only by GitHub's walls | build at Phase 3 open, or BOB defers it to the backlog with reason (Civicsmith is person-owned) |
| P3-B2 | backlog: "a one-time click-through of the developer's steps' external labels at the next real onboarding (PR 24)" | not started | none | Bob, at Civicsmith's onboarding |
| P3-1 | "Layer start and layer close: ... the next layer starts at once" | built; close measured once; next start not seen | PR 48; layer 1 closed 249b62e; no layer-2 work listed | coord/BOB find why; observe layer 2 start right after a close |
| P3-2 | "Tranche open with the grants check, the pin, and the open check ... tranche close by one PR to main after main is merged into the tranche" | built; open in flight, close not started | PR 50 (12 acts at BOB and probe depth, metrics/tranche-open.jsonl); copy's tranche had no open record, BOB told to run it | coord reads the 12 rows; close at the slice's end, BOB |
| P3-3 | "The completion round's own file" | built, not exercised | PR 63; copy's completion file "in the old format" | BOB (copy plain PR) converts the file and sets completion_file |
| P3-4 | release cut, full regression and whole-product checks as workflows, release note fields; install-from-scratch and upgrade tests as release-tier fixtures; dev releases each round; public release only through a production environment with Bob as reviewer | built on process3; blocked on the copy | PR 52 (release dev + shim), PR 60 (one archive), PR 62 (note fields). Copy: no release block, no assemble script (bundles.mjs rebuilds in place across 8 dist dirs; agent-worker, bio-plane stale; CONTAINER_IMAGE_STALE; duplicate worker.json); install-from-scratch has no live fixture; upgrade test migrate-released.test.mjs local only; public release dropped (Bob, 3 Nov) | build (copy jobs): assemble script, install-from-scratch fixture, upgrade test in the release checks; BOB adds the release block and the shim; coord writes Bob's dev-only word |
| P3-5 | "The tranche report with elapsed time, work, deferrals, cost and overhead share" | built, not run on a closed tranche | PR 49; depth-1 gap fixed in PR 51 (a7800e6, --shallow-exclude=main) | BOB runs `report tranche` after close |
| P3-6 | provider-change route; "if none arises the route is named not exercised, never staged" | built, not exercised | PR 54, PR 57 (path traversal and hidden notice fixed) | BOB: slice reaches a layer-6 user; name it not exercised if no change arises |
| P3-7 | requirements cap: "a provisional number is set at Phase 3's open ..., and the real number at the gate" | built; provisional set | PR 53: 70,000 bytes = p90 of 109 copy files; 11 files over | BOB splits or consolidates the 11 before their jobs; coord sets the real number at the gate |
| P3-8 | "Take-in and tranche carry for a product converting mid-tranche" | built, live use pending | PR 55; setup check lists carry; plan: PR 47 taken in as a bundler job | BOB runs `job start <bundler> --take-in 47` |
| P3-9 | "One lane, UX, opened at Phase 3's open ... consulted by BOB with context" | built, not exercised | PR 63; copy lane dir docs/development/ux-substrate/ set in copy PR 53 | BOB, at the first design question: `lane ask ux` |
| P3-10 | "Onboarding's size measurement against the certified ranges" | built; ranges empty | PR 62: `p3 size`, ranges.json empty, "no certified range yet"; it fills at the first certified release | BOB decides what fills ranges while every release is development only; coord writes it |
| P3-11 | "The prune workflow for the transient branch, built only if a transient branch still exists" | not started | none; grants branches "kept, never deleted" | BOB checks whether a transient branch exists at the open; a prune would delete branches, which the approvals forbid |
| P3-G1 | "The slice tranche merged to main" | not started | `tranche close` built (PR 50) | BOB, after every layer of the slice closes |
| P3-G2 | "a release cut" | not started | see P3-4 | build (copy assemble), then BOB `release dev` |
| P3-G3 | "the tranche report delivered with every metric filled or named unmeasured" | not started | PR 49, 51 | BOB runs it; coord delivers it |
| P3-G4 | "every flaw the slice found fixed and its run repeated from the step that found it (MNT-9)" | in flight (practised) | PR 40: PR 64 fix, gate re-run, merged; copy PR 53: PR 65 fix, same command re-run, merged | coord keeps the list of flaws and their repeated steps for the gate |
| P3-G5 | "The 14-day survival of the Phase 1 and Phase 2 pull requests is read, so the first cost per surviving pull request is a number" | not started; Phase 2 part unscheduled | Phase 1 read 16 Nov (trig_013TMPWVjD618iuitub2tVQh); Phase 2 PRs (3-4 Nov) reach 14 days 17-18 Nov, no task; no command computes cost per surviving PR | coord: schedule the Phase 2 read; compute cost per surviving PR by hand or a build adds it |
| P3-G6 | "Size: five to eight build jobs, then the slice, roughly six to ten product jobs" | over | process3 PRs 47 to 65 for Phase 3 builds, about 19 PRs against 5 to 8 | coord cites the overrun at the gate (rule 8) |
| P3-A1 | "One BOB wake runs as a fresh stateless session and its tokens are counted against a handover row, so SES-16 is decided on a number" | not started (nothing measures it) | handover rows in metrics/handover.jsonl; no stateless-wake procedure | coord runs one stateless BOB wake and counts its tokens from the session record |
| P3-A2 | "The shims carry the product's CLAUDE.md lines under the per-line test, with the pin and the fetch command beside your approvals, and run the product's setup script at a session's first command" | built, measured on the copy | PR 56 (setup check process-lines, shim-drift; start check runs setup_script once); copy pin moves 51, 53 passed setup check | coord confirms the per-line test exists or names it a nudge |
| P3-P | Proves: "a public release waits for your approval and runs only after it"; overhead vs 30 Oct hand counts (sessions per job, gate runs per merged job, record-only commits) | first conflicts with practice; second built | Bob 3 Nov: development only; `report tranche` prints the three counts | coord rewrites the first; BOB reads the second from the report |

## Gaps: criteria nothing yet measures

1. P2-G10, ROOT's lifetime from its context per sweep: no command records ROOT's context; the sweep row does not carry it.
2. P2-P, the routing share of BOB's context: no command or row measures it.
3. P2-G9, the overhead share is partial by design: ROOT's own cost and gate-run cost print unmeasured.
4. P2-G3, the first job's zero refusals: measurable (refusal rows), but no finding reads it.
5. P2-G4, BOB's idle time: the measure is built and unread, and the 00:05 to takeover window has no sweep rows.
6. P2-G8, the deploy and walk run from PR 47's branch, outside `deploy dev`, so it leaves no deploys/dev.jsonl row.
7. P3-A1 (SES-16), the stateless BOB wake: no procedure and no token count.
8. P3-G5, cost per surviving PR: no command computes it, and nothing is scheduled to read Phase 2's PRs at 14 days.
9. P3-M2 and P3-M3 (ruleset change, cron): nothing measured.
10. P3-4, install-from-scratch has no fixture, and the upgrade test runs locally, not in CI. The copy has no assemble script, so no release can be cut.
11. P3-6 and P3-9 (provider route, UX lane): built but not exercised.
12. P3-1, "the next layer starts at once": not seen; status listed no layer-2 work after layer 1 closed.

## The plan against current practice

1. Public release. Phase 3's release row and Proves require a public release through a production environment with Bob as reviewer, and that it "waits for your approval". Bob said on 3 Nov that everything released is development only, and no public path is built or tested.
2. Certified ranges. P3-10 measures against certified ranges. ranges.json fills only at a certified release, and under development only none exists.
3. Rulebooks. The text row (line 316) lists "Rulebooks: platform, record, jobs, gate, integration, sessions, messages, maintenance". PR 58 made them per role (bob, root, watcher, job, worker), each named by its role prompt.
4. The skill. The text rows "Product CLAUDE.md ... pin, fetch command, skill" (line 324) and "The one skill | What each role loads at start, by role" (line 325) conflict with PR 58. A skill cannot load by role without a hook (ENF-1), so there is no skill. CLAUDE.process.md carries the pin, the fetch command, and where the role prompt comes from.
5. Stopped-job fault. The plan says the session "is interrupted and left stopped". Practice moved to archiving: the environment's stop hook pushed WIP, and BOB's message rescued the interrupted job.
6. Silent-ROOT fault. The plan says the sweep is switched off "more than four hours before the watcher's daily wake" (11:17 UTC). Practice fires the watcher's task by hand at 04:10. Detection is unchanged, but its timing is set by hand. The sweep task was deleted, not switched off.
7. Phase 2 gate, "every ready module ... merged". In practice runtime-limits was deferred BLOCKED and its PR closed unmerged, which the tool counts as a valid layer close.
8. The Phase 3 build count was "five to eight build jobs". About 19 merged.
9. PLT-8 asks for runs "with Bob's" token and a ruleset change. The approvals forbid sessions from changing repository settings, and the owner token was found unneeded.
10. The prune workflow (P3-11) would delete branches. Sessions may never delete a branch, and grants branches are kept by design.
11. Workflow files on the copy. Copy PR 47's merge was refused because "workflow edit needs Bob". Adding the dev-release shim, which P3-4 needs, is also a workflow file and may meet the same refusal. The README says a plain PR may add it byte for byte; this is not yet measured on the copy.
12. Deploy route. Rule "Deploy and walk" says BOB deploys "the tranche". The gate's deploy runs from a worktree of an unmerged branch (PR 47) merged with the tip, outside the tool's clean-tip check.
13. Rule 5. PR 46 (gate.mjs) merged after one review whose bug fix had no confirming review. PR 44 (record.mjs) had one review. Practice in the handoff is a confirming review for every gate, record or merge change.

## Build Plan lines the coordinator owes at the gate

1. The Phase 2 gate's results, one line per criterion P2-G1 to G12, with measured figures, the deferral of runtime-limits, and each fault's record.
2. Bob's 3 Nov word that every release is development only: rewrite Phase 3's release row and its Proves line on public release; say what "certified ranges" means now.
3. The text row on rulebooks (line 316): per role, named by each role prompt.
4. Also owed from the findings:
    - The Product CLAUDE.md row (line 324) and "The one skill" row (line 325): no skill (ENF-1), CLAUDE.process.md contents.
    - PLT-8 results into Phase 3's open paragraph: 1a/b, 4, 5 measured; Bob's token not needed; ruleset and cron unmeasured or dropped with reason.
    - Rule 8's size line: 5,752 lines and the command count at the gate tip, with each rise cited.
    - The Phase 2 table's "State" cells: PRs 44 to 65 (sweep stall PR 45, metrics PR 47, restart, deploy act PR 59, pin-move wake), and the stale-start setup line measured 1 of 1, which goes to Bob as a proposed step.
    - The fault-injection paragraph: archive in place of interrupt, the watcher fired by hand.
    - Phase 3's size: the build count overran, with its reason.
    - Phase 3 rows' states: PR numbers for layer close 48, tranche report 49 and 51, tranche open and close 50, dev release 52 and 60, cap 53 (70,000 provisional), provider route 54 and 57, take-in 55, shims 56, lanes and completion 63, size ranges 62.
    - Rule 5's practice, if BOB rules that PR 44 and 46 owed a confirming review.
