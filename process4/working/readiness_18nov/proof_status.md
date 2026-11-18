# Process4 readiness, 18 Nov 2026: what the design depends on, and whether each thing is proven

Length: 252 lines. Last section: "6. Audit findings the design has not answered".

Written by a worker session for the session judging whether the Process4 design is ready to be built from. It reports only what was read. It does not judge the owner's decisions and proposes nothing.

## 0. What was read, and how to read this

Read in full, and cited by these short names:

| Short name | File | Lines |
| --- | --- | --- |
| D6 | `process4/definition/process4_definition_v6.md` | 597 |
| DS | `process4/working/design_state_18nov.md` (it rules where the two differ) | 143 |
| F09 | `process4/working/foundations_updated/09-permissions-and-platform.md` | 100 |
| F10 | `process4/working/foundations_updated/10-proven-unproven-and-owed.md` | 85 |
| A2 | `process4/working/audit2_feasibility.md` | 390 |
| AN | `process4/working/audit2_notes.md` | 150 |
| CX | `process4/working/codex_shortcomings_to_fill.md` | 54 |

"D6 414" means line 414 of that file.

Unread: every record these seven files cite. That is Process3's log and decision record, `permissions_inventory.md`, `roles_root_coordinator.md`, `k_evidence.md`, `product_side.md`, the working Foundations in `process4/evidence/`, Bob's typed words in `process4/owner_words/`, `reading_measurements/RESULTS.md`, `harness_separation/`, the proof session's data on the notice, and the Codex trial in `process3-probes`. So every "measured" below is a measurement as one of the seven files states it. None was checked against its source.

The four statuses, as used here:

- **PROVEN:** one of the files says it was measured or seen working. Where the file gives no date, the entry says so. Nearly all of it was measured in Process3, under Claude Code, with Process3's tool. Process4 itself has never run (F10 14).
- **RULED:** Bob chose to rely on it, and nothing read shows it working or failing.
- **UNPROVEN:** nothing read shows it working. Where Bob ruled who does a thing, but the thing needs an ability of a platform, a harness or the tool that nobody has measured, the status is UNPROVEN and the ruling is noted.
- **SHOWN TO FAIL:** a file says the same thing failed, and the design still depends on it. Where what failed was a nearby thing and the design has since changed the means, the entry is under UNPROVEN or RULED and the failure is given as the nearest record.

Counts: 17 PROVEN, 10 RULED, 4 SHOWN TO FAIL, 40 UNPROVEN. 71 in all.

## 1. PROVEN (17)

Each of these is proven for Process3 or for the proof named. Where Process4's own use of it is not proven, the entry says which entry in section 4 holds that part.

**P1. A session starts another session, with starting instructions that name its acts.** Depends: D6 188, D6 248, D6 414. Evidence: A2 307 calls a start by commit id with instructions naming the acts "measured form"; A2 303 has ROOT starting ARCH and the coordinator in Process3 with a role prompt; A2 31 has a start by commit id landing on a fresh copy, 1 of 1, in a passage dated 3 Nov. No other date is given. If it fails: D6 464 makes confirming that the started session exists part of the act of starting.

**P2. A session on the product's repository starts a session on the process's repository.** Depends: D6 393 to 395, DS 85. Evidence: A2 140 and A2 366: from 5 Nov 23:54 UTC a ROOT holding the product's repository started each new coordinator on the process's repository; the count is not given. AN 144 repeats it. Limit: it ran under Process3's approvals and a prompt that named the act. D6 518 and F10 44 still list the same step as unproven for PROCESS; what PROCESS can then do there is U29. If it fails: not named.

**P3. An alarm set by a session fires into that session when it is idle and resumes it.** This is ROOT's hourly wake. Depends: D6 188, D6 374. Evidence: F09 71 (measured); A2 303 and A2 367: the ROOT that Bob started on 8 Nov had an alarm that fired until at least 13 Nov; D6 374 counts 94 notifications from it by 13 Nov. D6 512 still lists it as to be tried. If it fails: the watcher (U13).

**P4. A session loads Bob's committed approvals when it starts, and with them acts on what he approved.** Depends: D6 406. Evidence: F09 30, about 450 acts with no refusal; F09 32, 10 of 10 with the approvals and 0 of 10 without; F09 34, loaded only at the start (measured). All in Process3, "as recorded in the working Foundations" (unread); no dates. A2 165 adds that with job-like starting texts the approvals made "NO DIFFERENCE" to the checker and act through the session's own model. Whether sessions started Process4's way load them is U3. If it fails: not named.

**P5. The list of forbidden commands takes commands away outright, and is loaded only by a session that holds one repository.** Depends: D6 410, D6 414. Evidence: F09 40 and F09 46 (both measured, Process3, no date). Limit: D6 422 says the one rule that allows pushing names Process3's tool and must be changed by Bob, "or no session can push". If it fails: not named.

**P6. Merges with no review, made by the process's merge tool, pass the permission checker.** Proven for Process3's tool only. Depends: D6 251. Evidence: D6 424, F09 22 and A2 368: about 700 such merges with no recorded refusal. No dates. Process4's tool is U5.

**P7. Three refusals in a row stop a session.** Depends: D6 420. Evidence: F09 60 (measured, no date). F09 56 says the checker "passed and refused the same act minutes apart" (measured). If it fails: not relevant; this is itself the stop. The stopped session "is replaced" (D6 420); who notices is U12.

**P8. GitHub's rule holds the tranche branch: a change enters only by pull request with its required check passing.** Depends: D6 412, D6 251. Evidence: A2 45, the rule requires the check named `gate` with an empty bypass list (measured); A2 46, Bob's own approvals commit of 9 Nov went in as pull request 1115 after the check; D6 260, the one attempt by a session to merge without a required run, on 9 Nov, was refused by the permission checker. If it fails: not named.

**P9. Module tests run on GitHub's machines on a job's pull request.** Depends: D6 250, D6 291. Evidence: D6 470, 1,187 test runs in Process3. A2 155 adds that 113 of them failed on 3 to 5 Nov and 74% of those passed again with no change. Process4's own test run is not built (U31). If a run fails: the job fixes its module (D6 366).

**P10. A dead job is restarted on the same branch and pull request.** Depends: D6 368. Evidence: A2 369, "built and used" in Process3. No date or count. If it fails: not named.

**P11. Each session fetches a read-only copy of the process at the version the product names.** Depends: D6 418. Evidence: D6 418, "Process3 ran that way"; A2 58, the pinned copy arrived empty and every session's first command fetched it. No date. Who may move the version is R2. If it fails: not named.

**P12. A deploy token held as a setting of the cloud environment can be used to deploy.** Depends: D6 481, F09 50. Evidence: both call it "the only route measured to work". No date, and neither says where it was measured. Limit: who can read the token is owed (DS 142); A2 143 says, from platform text that was not tried, that a new session inherits its starter's environment. If it fails: not named.

**P13. One session per lane, held by a record written before the start; and each question to a lane written in the shared record.** Depends: D6 224, D6 226. Evidence: the same lines: "Process3 built this and it ran", five lane starts and five questions. No date. If it fails: not named.

**P14. A helper works inside a session and ends with its task.** Depends: DS 116, D6 198. Evidence: D6 273 and D6 416 report what a worker read and checked on 14 Nov. If it fails: not named. Codex: whether a child can start a helper of its own is not known (CX 20).

**P15. A running session can be interrupted by another.** Depends: D6 374. Evidence: A2 315, "interrupts (measured 14 of 15)". No date. One of fifteen did not work. If it fails: not named. Codex: not known (CX 29).

**P16. A session can send Bob a notification.** Depends: DS 51, D6 372; F09 98 names it "a push notification from a session". Evidence: D6 374, 94 notifications sent by ROOT's alarm between 9 and 13 Nov (measured). Limit: no file read says that a notification arrived on his phone. Codex: not known (CX 30). If it fails: the standing page (DS 51), which is U32.

**P17. The notice's method decides as its rules say.** Depends: D6 332 to 350. Evidence: D6 360 and F10 24: the proof session, on eleven made-up modules and 150 changes, checked against its data by the study session; every miss recounted showed up as a failing test of the user. The lines give no date. Limit: D6 362, "Not proven: any of it as part of a running process." That part is U17.

## 2. RULED (10)

**R1. The permission checker alone protects Bob's approvals and the list of forbidden commands.** Depends: DS 91, F09 16, D6 454 ("nothing in git stops a session's pull request from changing your approvals; what remains is the permission checker"). Evidence: none read of the checker refusing such a change. Nearest record: A2 205, a session writing relayed words of Bob's into a file other sessions load was refused, "[Instruction Poisoning]"; one event, no date. If it fails: not named.

**R2. Bob's reworded approvals, and the words of the design, keep process changes at PROCESS and keep the product's process version from moving without his approval.** Depends: DS 90, D6 387, D6 194. Evidence: nothing shows the reworded approvals holding or failing. Nearest record: D6 531, sessions made 270 of 296 process changes themselves and moved the version 116 times in nine days, and Bob's words "in Process3 text alone did not hold"; D6 552, his approvals in the process's repository then let sessions merge there without a person; A2 60, the version sits in a file any session can change. If it fails: not named. DS 133: the tool guards against mistakes and not against a session set on defeating it.

**R3. A job writes only its own module's files, held by its instructions and no check.** Depends: D6 196, F09 18. Evidence: F09 18, Bob's judgment that this is enough, from seeing jobs keep to their modules under Claude Code (his words are in a file unread); D6 454, the only firings of Process3's own-files check were three false alarms. That check has ended (D6 449). If it fails: not named.

**R4. A job's module tests are complete and right, held by the job's instructions; nothing measures it.** Depends: DS 17, D6 291. Evidence: none. D6 532: about nineteen requirements in twenty (estimated) are looked at only by the job's own tests. If it fails: a walk meets the fault, for what a walk covers (D6 534).

**R5. A user module that the notice misses is caught later by its own module tests or by a walk.** Depends: D6 317, on Bob's words of 15 Nov (D6 129 to 131). Evidence: in the proof every miss showed as a failing test of the user (D6 360); nothing from a running process. D6 534: a module's tests run only on its own job, so such a failure "can sit unseen until a walk meets it". If it fails: not named.

**R6. A text kept under the provisional maximums is read in full, and a role refreshed at 40 percent full has room left to work and hand over.** Depends: DS 38 to 43, DS 120. Evidence: DS 39, the figures are sizes shown to work, and none is a size at which reading was shown to fail; DS 43, Bob judged the first measurement too weak to rely on and set the values "for now"; CX 37, sizes shown to work once, on filler text, and nothing measured for a role's starting text or the fill level. A second measurement is owed (DS 138). The results file is unread. If it fails: DS 40, principles that cannot be kept short come to Bob.

**R7. The Screens document and the journeys are pages in the product repository's folder, and the walks are measured against them.** Depends: DS 59, D6 265 to 266. Evidence: D6 273, as a worker read it on 14 Nov, the building branch had no Journeys page and an old copy of the Screens page, and three journey lists that do not agree. Which list counts is owed (DS 143). If it fails: not named.

**R8. Built files are never committed, and are built at each walk, deployment and release.** Depends: DS 71. Evidence: none read of a build made at a walk. If it fails: not named.

**R9. A session saves its work to the repository before its turn ends, and a stop on Bob's word takes effect in the turn in which a session receives it.** Depends: DS 134. Held by instructions. Evidence: none read. If it fails: not named.

**R10. Eight slots are counted across the account.** Depends: D6 254. With one product nothing changes. How two products share the eight is not settled (D6 498, F10 85). Evidence: none for two products. If it fails: not named.

## 3. SHOWN TO FAIL (4)

**S1. A switch of account loses no work.** Depends: DS 84 ("A switch of account adds only Bob's own acts in the new account"), D6 184. Evidence: D6 519, "It failed on 5 Nov and was cancelled on 7 Nov"; A2 242, on 5 Nov the new account had no GitHub connection, then pushed as Bob himself, every job start was refused, 13 job sessions were stranded, and old sessions could not be messaged or archived from the new account; on 7 Nov the switch was cancelled after about 9.5 hours. If it fails: DS 84 names the one way back, Bob starts ROOT and ROOT rebuilds everything from the shared state and the repository. That way back is itself unproven (U6, U7).

**S2. Rules held by text alone, among them the rules against growth, are kept by sessions.** Depends: D6 297, D6 535 ("Most rules in this document are held by text alone"), F09 18. Evidence: D6 535, "rules held by words drifted (measured)" while the one rule with a hard limit held; D6 297, 211 test files that served the process; D6 476, checks added in 41% of Process3's merges; D6 477, a guide with no limit grew from 8 KB to 134 KB. Bob's judgment that instructions are enough for ordinary work is at F09 18. If it fails: not named; D6 535 lists it among "risks with no trial".

**S3. On Codex, a role is a session of its own that another session starts and Bob can open.** Depends: DS 33, DS 83 to 85, D6 239. Evidence: CX 18, as tried on 17 Nov every role was a child inside one chat, and "starting a separately listed session from a hosted session was blocked". CX 7 says no line in that file is a finding that Codex cannot do it. The trial's evidence is unread (CX 48). If it fails: DS 32, the shortcoming is noted and left for Bob's work on the OpenAI account.

**S4. On Codex, one chat reaches the children of another chat.** Depends: DS 128, DS 49. Evidence: CX 27, "A second chat could not." Evidence unread (CX 48). If it fails: DS 32 and DS 128, noted as a shortcoming.

## 4. UNPROVEN (40)

### Starting, and Bob's approvals

**U1. A ROOT that Bob starts with a plain prompt knows it is ROOT and acts.** Depends: D6 188, DS 84. Evidence: D6 414, its starting instructions do not name its acts and "Whether that works is unproven"; F10 50 the same; A2 59, an act that a starting text did not name was declined 6 of 6, and the only measured working ROOTs had a 4 KB role prompt pasted in; D6 488, the product's CLAUDE.md today tells such a session to "act on nothing". If it fails: not named.

**U2. ROOT fetches the newest copy of its branch, and approvals that arrive after it started count as loaded.** Depends: D6 416, D6 179. Evidence: D6 416, on 5 Nov and 8 Nov the cloud handed ROOT a saved copy about an hour old, without the newest approvals; ROOT stopped, another session sent it a message, and it fetched and carried on; "Unproven: why the cloud handed out an old copy, whether it still does, and whether approvals that arrive after a session has started count the same". F09 36 the same. A2 31: on 3 Nov a start by branch name also landed on a stale copy. If it fails: ROOT stops if it cannot fetch (D6 416); nothing is named if the fetched approvals do not count.

**U3. Sessions started Process4's way load Bob's approvals and the list of forbidden commands; and after an edit to his approvals, a restart of ROOT brings the work back.** Depends: D6 408, DS 19, DS 84. Evidence: D6 520 and F10 46 list the loading as unproven; D6 408, each of Bob's five edits in Process3 stopped every long-lived session, "and after the last the product never restarted" (measured). What an edit does to a running round is owed (DS 142, F09 34). If it fails: not named.

### The tool and the shared state

**U4. Process4's tool.** It is to push, open a pull request and mark it ready, merge, start the next job, send notices, write the shared state (D6 486), decide who takes a free slot, when a notice is sent and to whom, and whether a round's jobs are done (DS 82), and remove standing notes when their end comes true (DS 132). It is each session's only door to GitHub (D6 410). Evidence: D6 486, "No Process4 tool exists." If it fails: not named.

**U5. Merges made by Process4's tool pass the permission checker, and go on passing at a real rate.** Depends: D6 251. Evidence: D6 424, "Process4's tool is unmeasured"; D6 510 and F10 36 list it for the trial; D6 525 and F09 64, twenty clean merges bound the refusal rate only below about 14% (estimated), and only the first real tranche can show the rest. If it fails: a refused act is never retried elsewhere (DS 109) and three refusals stop the session (D6 420). Nothing is named for merges refused in general.

**U6. The shared state: one place that needs no merge to write, written only through the tool, a small fixed set of records rewritten in place.** Depends: D6 235, DS 118, DS 132. Evidence: D6 235, "Unproven"; D6 489, nothing is built; what it holds is owed (DS 142, F10 79); A2 203 to 205, the place and its writers are not named. CX 43: the Codex trial keeps it in a local file, the sixth draft on GitHub. If it fails: not named.

**U7. A long-lived role is refreshed on purpose, and its successor starts only from the shared state and the repository; the same after a full stop.** Depends: DS 80, DS 84, D6 368. Evidence: F10 48, never run; D6 368, replacing ARCH while jobs are open is unproven. Process3's ARCH ran as 21 sessions in six and a half days (D6 235, measured), by Process3's means. If it fails: not named.

**U8. A session's fill level can be read.** Depends: DS 80 ("at a stated fill level"), DS 43, DS 120. Evidence: no file read says that a Claude Code session can read how full it is. Codex: CX 34, no reading is known, and without one a refresh at a fill level cannot be triggered. The fill level is one of the blanks owed (F10 65). If it fails: DS 80 also names "a natural pause in its work, whichever comes first".

**U9. Jobs obey an ARCH that has been replaced, and a freed slot is refilled in the same turn.** Depends: D6 235, D6 252. Evidence: D6 511 and F10 37 list both for the trial; D6 511, with no event Process3 once noticed a finished job after 194 minutes. If it fails: ROOT's hourly wake (U12).

**U10. A message wakes its receiver at once.** Depends: DS 128, D6 250, D6 258. Evidence: no file read gives a time between a message and the receiver acting. D6 416 shows a message to a stopped ROOT being acted on, on 5 Nov and 8 Nov. Codex: whether a plain message wakes an idle child is not known (CX 26). If it fails: DS 128, it is noted as a shortcoming of that harness.

**U11. A job hears its own test result and then sends ARCH one message.** Depends: D6 250. Evidence: A2 185 and A2 325: it is the platform's design, a pull request's events go to one session at a time, and there is "no run in the record"; in Process3 the architecture session held that subscription. If it fails: not named for a job that dies between its tests passing and its message (A2 183).

**U12. ROOT, woken each hour, finds a session that has stopped and wakes or replaces it.** Depends: D6 188, D6 464, DS 126. Evidence: A2 183 to 187, no rule says how ROOT tells a stopped session from a waiting one. No file read shows ROOT doing it. If it fails: not named.

**U13. The watcher takes over from a ROOT that has died.** Depends: D6 368, DS 83. Evidence: D6 190, both takeovers recorded in Process3 left no watcher behind and left ROOT one level deeper than designed, and "What a takeover does in Process4 is unproven"; A2 195, the watcher woke once a day; the design of the takeover is owed (DS 140, F10 67). If it fails: D6 179, Bob starts ROOT again "if ROOT dies and no watcher takes over". Who tells him is not named.

**U14. A stop on Bob's word holds and the hourly alarm does not undo it; a held merge, a module put first and a new slot number each work on his word.** Depends: D6 374, D6 192. Evidence: D6 374, "Unproven", and after his stop of 9 Nov the alarm went on firing; D6 192, "untried"; D6 514 and F10 40. If it fails: not named.

**U15. Finished sessions, archived by the session that started them, do not use up the account's room.** Depends: DS 119, F09 73. Evidence: D6 515, new starts failed silently at about 50 live sessions (one event); A2 175, archiving passed 2 of 5 and 1 of 4 before the approvals, and "15 of 15" after has no evidence file. Whether an archived session frees room is not stated. Codex: the trial's tools had no way to archive (CX 44). If it fails: D6 464 only, confirming that a started session exists.

**U16. A model and an effort level are passed to each session a session starts.** Depends: D6 233. Evidence: A2 295, platform text says effort is not inherited; not tried, and not in D6's list of unproven things. Codex: not known (CX 21). If it fails: not named.

### The notice

**U17. The notice as part of a running process.** A build tool lists a module's interface before and after a change, a job's first step adds the structured comments, and only the users of a changed entry are told. Depends: D6 252, D6 332 to 336. Evidence: D6 362, not proven as part of a running process; the tool is not built (D6 486). The trial list at D6 509 to 520 has no notice in it. If it fails: R5.

**U18. A notified job picks the tests that relate to the changed entry, and runs only those.** Depends: DS 21. Evidence: the design for it is owed (DS 139, F10 66); A2 72, nothing exists that can pick them. If it fails: not named.

**U19. The check of declared uses reads tests too.** Depends: D6 295. Evidence: D6 489, not built; D6 295, 122 pairs must be corrected first, and Process3's check read source only (0 of 3,029 found). If it fails: not named.

### Edits, walks, deployment and the end of a tranche

**U20. A mechanical edit across many modules merges once.** Depends: D6 260. Evidence: D6 260, the required test run on that one change is unproven; A2 128, a change touching every module "would run every suite past the gate's cap"; D6 517 and F10 43. If it fails: not named.

**U21. Walking sessions make the internal walk on the product as built, without deploying it, and find the flaws.** Depends: D6 265, DS 60. Evidence: D6 548, GitHub's machines running the walks "is the only form that has ever run"; D6 275, on 8 Nov the stored report had all 238 steps marked ok with 63 failures listed; D6 505 leaves "finds the one known break" to be tried. If it fails: not named.

**U22. A walk can be made of named areas only, and shared among several sessions.** Depends: DS 56, D6 271. Evidence: F10 48, partial walks have never run; D6 271, a shared walk "never ran"; A2 98, the product's walker walks its journeys in order, each building on the one before, with no option found to run one alone (counted 14 Nov). If it fails: not named.

**U23. ARCH's session makes a development deployment as a step in a round.** Depends: D6 266, DS 60. Evidence: D6 516 and F10 42 list it as unproven; D6 271, a session can run one thing for about 30 minutes and Process3's two late deploy-and-walk runs took 60 and 64 minutes, on GitHub's machines (A2 100); A2 155, "all 12 development deployments of 4 to 8 Nov ended 'ok: false'" (what read does not say whether the deploying or the walking failed). No file read says how a development deployment is reset. If it fails: not named.

**U24. A session's browser can reach the development site, so that walking sessions can make the external walk.** Depends: DS 60, D6 266. Evidence: D6 548, "unmeasured"; A2 100, a cloud session reaches the internet through a proxy. If it fails: not named.

**U25. The hosting account bears the external walkers.** Depends: D6 271. Evidence: D6 271, "unproven and is measured in the trial"; D6 516. If it fails: not named.

**U26. A walk ends without flaws, so a tranche ends.** Depends: D6 267, DS 56. Evidence: D6 13 and D6 275, no walk of either kind finished without flaws in Process3 (measured); A2 155, the last walk failed 147 of 157 live steps; D6 277, the risk is unmeasured for a process that does not grow; F10 54, only the first real tranche can show it. Nearest record: it failed every time, under Process3's full walks. If it fails: DS 62, the tranche goes on in rounds until Bob says, and he then merges it with its flaws named, with no release from it, or drops it.

**U27. The tranche branch merges into the main branch as a whole, with none of the three tests run.** Depends: D6 279. Evidence: D6 279, never done on the product; A2 218, done 13 times on the trial repository on 2 Nov. If it fails: not named.

**U28. An install and an update are each run and confirmed before a release, and ARCH prepares the release.** Depends: DS 16, DS 68 to 69, D6 281. Evidence: D6 281, no release of any kind was cut in Process3 and the release path is unproven; F10 48; A2 216, the product has no workflow for updating the installer or the website. DS 69 is marked a reading Bob has not confirmed. If it fails: DS 69, no release is offered and the fault becomes work in the next tranche.

### PROCESS, lanes and conversion

**U29. A process fault reaches PROCESS; PROCESS, started by ROOT on the process's repository, changes the process there; and ARCH moves the product to it after Bob approves.** Depends: D6 394 to 396, DS 85, DS 92, D6 194. Evidence: D6 398, "None of this has run"; D6 489, the route is not built. Nearest record: A2 141, pushes from sessions started across repositories into the trial repository were refused 2 of 2 on 8 Nov; A2 142, as counted on 14 Nov the process4 branch of the process's repository had no list of forbidden commands. If it fails: not named.

**U30. A lane's session is replaced by a fresh one that starts from the lane's research; and a change to a lane's folder alone merges with no test run.** Depends: D6 225, D6 206, D6 214. Evidence: D6 225, the replacing was built and "never once ran"; for the merge, D6 488 says the test run must still report on a pull request that changes no module, and that run is not built. If it fails: not named.

**U31. Both repositories are converted, Bob's own commits can merge, and Process4's test run reports on a pull request that changes no module.** Depends: D6 183, D6 488, D6 422. Evidence: D6 488, the product is not converted; D6 556, Bob's acts have not been listed for him; DS 141, the worked proposal on branches and where his approvals live is owed; A2 43 to 47, each change must pass the Process3 machinery it replaces. If it fails: not named.

### Bob's view, records and accounts

**U32. One standing page shows everything waiting for Bob and his dated acts; he can see each open job's status without speaking to it; a product's sessions are grouped under it.** Depends: DS 51, DS 119, DS 127. Evidence: none read. No file says what carries the page or the grouping on Claude Code. Codex: grouping is "not verified" (CX 54). If it fails: not named.

**U33. Bob's marked words are copied exactly, with the date, into the record and the shared state.** Depends: DS 47, DS 49, D6 192, D6 235. Evidence: none read of it working. Nearest record: A2 205, the checker refused a session writing his relayed words into a file other sessions load. If it fails: not named.

**U34. The sessions' GitHub account stays usable, and the process keeps to GitHub's published limits.** Depends: D6 436, F09 80. Evidence: F09 80 and AN 140, Process3 at its end read GitHub's own count and backed off at 85%; D6 536, the account was suspended on 6 Nov and the reason was never learned; A2 205, it had made 1,387 pushes to the state branch in 19 hours. The reason is owed (DS 142). Process4's tool is not built. If it fails: not named.

**U35. The cost of a job, a round or a tranche can be read.** Depends: DS 61, D6 438. Evidence: D6 527 and F10 57, in Process3 it often could not. If it fails: named; the report says "unmeasured" (D6 438).

**U36. A renewed token, once in place, reaches the fresh sessions that start after it.** Depends: DS 127. Evidence: none read. If it fails: DS 127, a full stop, then the one way back.

**U37. Sessions can act in the trial repository.** Depends: D6 507, DS 138. Evidence: A2 230 to 231, as counted on 14 Nov it was a Process3 copy that tells sessions to act on nothing, and pushes by sessions there were refused 2 of 2 on 8 Nov. Its state since is unread. If it fails: not named.

### Codex

**U38. What carries Bob's approvals, the list of forbidden commands and the permission checker on Codex.** Depends: DS 33, DS 91, F09 16. Evidence: CX 11 to 14, none is known, and the grants study Bob asked for has no result in the repository. If it fails: DS 32, noted and left for Bob's work.

**U39. On Codex: a scheduled wake reaches a child; a running child is interrupted; Bob is notified when he is away.** Depends: D6 188, D6 374, DS 51. Evidence: CX 28 to 30, not known. If it fails: DS 32.

**U40. On Codex: where a secret is kept and who reads it; which GitHub account a session acts as; the window and the limit on instruction files; and limits on run time, live sessions and starts from a scheduled wake.** Depends: F09 44, F09 50, DS 39, F09 70 to 76. Evidence: CX 22, CX 35 to 36, CX 41 to 42, not known; the two documented windows, 272,000 and 500,000 tokens, were neither observed. If it fails: DS 32.

## 5. The eight unproven or failed things the design leans on most

1. U4: Process4's tool is not built, and it is every session's only door to GitHub.
2. U6 with U7: the shared state is not designed or built, and every replacement, restart and stop starts from it.
3. U1 with U2: a ROOT that Bob starts with a plain prompt acting as ROOT on his newest approvals.
4. U5: merges by Process4's tool passing the permission checker at a real rate.
5. U21 with U24: walks made by sessions, the external one through a session's browser, which has never run.
6. U26: a walk ending without flaws, which never happened in Process3.
7. U23: a development deployment made from ARCH's session inside a round.
8. S2: rules held by text alone, which drifted in Process3 and still hold most of the design.

## 6. Audit findings the design has not answered

The audit (A2) was of the fifth draft. Each of its 22 findings was checked against D6 as amended by DS. Result: 10 not answered, 9 answered in part, 3 answered. "Answered" here means the design now says what is to happen; it does not mean proven.

### Not answered (10)

- **Finding 2 (A2 38). The order of converting the two repositories, and who does each step.** D6 488 restates the problem. D6 556 says the list of Bob's acts will be brought to him. DS 141 lists the worked proposal as owed.
- **Finding 6 (A2 93). How a walk is actually run from sessions.** DS 60 names who walks and who deploys, and DS 63 removes the walk "at any time". Still open: the walker is one program that cannot run one journey alone, nobody is named to have it changed, a session's reach to the development site is unmeasured (D6 548), and the 30-minute limit is set against platform text of up to two hours (A2 101).
- **Finding 8 (A2 121). The mechanical edit's one moment, and blocked jobs keeping a round open.** D6 260 is unchanged. DS 142 lists "when a round's jobs are done" as owed.
- **Finding 13 (A2 181). Who notices a job that died after its tests passed, and how a stopped session is told from a waiting one.** DS 82 moves some of ARCH's work to the tool, and DS 126 says a stopped session is woken or replaced. Neither says who finds it or by what sign.
- **Finding 14 (A2 191). The watcher.** DS 83 settles that ROOT starts it. The takeover, its fit with "at most three levels deep, and none starts its own replacement" (D6 239), and who tells Bob that ROOT is dead are owed (DS 140).
- **Finding 15 (A2 201). The shared state.** DS 118 adds that it is a small fixed set of records rewritten in place. The place, the entries and the writer of each are owed (DS 142).
- **Finding 17 (A2 225). The trial's cost to Bob, and the items that made-up modules cannot settle.** D6 507 to 520 and F10 29 to 46 keep the same cost and the same list. The trial repository's own conversion is not mentioned.
- **Finding 19 (A2 248). The tool's list is shorter than what the design asks of it.** D6 486 is unchanged, and DS 82 and DS 132 add to what it must do. Nothing is said about closing a pull request, reading a failed run, starting a workflow, or waiting at GitHub's limit.
- **Finding 20 (A2 258). The uses check starts reading tests in the middle of the first tranche.** D6 295 is unchanged. DS is silent.
- **Finding 21 (A2 268). Process3's own sessions and hourly alarm may still be alive on the account.** Neither file deals with it.

### Answered in part (9)

- **Finding 3 (A2 53).** D6 418 now says how the process reaches a session. Still open: what tells a ROOT started by a plain prompt what a ROOT does (D6 414, D6 488).
- **Finding 4 (A2 68).** D6 section F and DS 21 settle when the notice is sent, who is told and what a told job does. Still open: how a told job picks its tests (DS 139), two smaller parts (DS 142), and the trial list has no notice in it.
- **Finding 5 (A2 78).** D6 273 corrects the claim, DS 59 puts the pages in the folder, and DS 55 to 58 say what a walk covers and who corrects the document. Still open: which journey list counts (DS 143), and the pages were not in the building branch as read on 14 Nov.
- **Finding 7 (A2 108).** DS 75: ARCH writes requirement text into a module's file. Still open: the step by which a job gets a new use declared, and D6 245 still lists three kinds of work where D6 249 makes a fourth.
- **Finding 9 (A2 135).** D6 194 names ARCH for the move, DS 85 and DS 92 name the route, DS 51 tells Bob, and DS 80 covers replacing PROCESS. Still open: the branch PROCESS starts on and the approvals and forbidden commands it loads there (DS 141), who merges its change, and that it would hold the product's deploy token (DS 142).
- **Finding 11 (A2 161).** DS 19 ends the comparison, so the draft is no longer of two minds. Still open: an edit still goes with a restart of everything, and what it does to a running round is owed (DS 142).
- **Finding 16 (A2 211).** D6 194 and D6 281 name ARCH; DS 68 says an install and an update are run and neither is walked; DS 108 and DS 124 put promotion with Bob. Still open: what runs the install and the update and where (DS 69 is an unconfirmed reading), and the two workflows the audit found missing.
- **Finding 18 (A2 238).** DS 84 gives the account switch one sentence. Still open: a suspended GitHub account; why it happened is owed (DS 142).
- **Finding 22 (A2 278).** Rows a, b, e, g and j are answered (D6 75 to 85, D6 281, DS 19, DS 57, DS 63). Still open: row c, section I says nothing of the process's repository though D6 183 sends the reader there; row d, files no module owns (DS 142); row f, the fourth kind of work; row h, nothing closes the pull request of a notified job that changes nothing (D6 256); row k, with finding 14; row l, effort passed on (D6 233).

### Answered (3)

- **Finding 1 (A2 24).** D6 416 corrects the account and has ROOT fetch first; DS 19 ends the comparison. What it rests on is U2.
- **Finding 10 (A2 151).** DS 55, DS 56 and DS 62: Bob approves what a tranche is for, walks are partial, and he decides the fate of a tranche that will not come clean.
- **Finding 12 (A2 171).** DS 119: the session that started a session archives it. What it rests on is U15.

### The five most serious of those not answered

1. Finding 2: no order for converting the repositories; the audit says it stops the first hour and the trial before it.
2. Finding 6: no way is shown to run either walk from sessions; it stops the end of the first round.
3. Finding 15: the shared state has no place or writers; every restart depends on it.
4. Finding 8: the mechanical edit's one moment can be kept from coming by the jobs that wait for it.
5. Finding 13: nobody is named to notice a job that died after its tests passed.
